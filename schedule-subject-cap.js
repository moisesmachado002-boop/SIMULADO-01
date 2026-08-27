(() => {
  'use strict';

  const VERSION = '1.0.0';
  const MAX_SUBJECTS_PER_DAY = 2;
  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN_VERSION = 'p6-v1';
  const HORIZON_DAYS = 7;
  let busy = false;
  let fallbackDb = null;
  let timer = null;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function dateKey(date = new Date(), timeZone = 'America/Bahia') {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year:'numeric', month:'2-digit', day:'2-digit'
    }).format(date);
  }

  function fromKey(key) {
    const [y,m,d] = String(key).split('-').map(Number);
    return new Date(Date.UTC(y,(m||1)-1,d||1,15,0,0));
  }

  function addDays(date, amount) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
  }

  function isoWeekday(date) {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  async function getDb() {
    if (window.mentorCloud?.client) return window.mentorCloud.client;
    if (fallbackDb) return fallbackDb;
    if (!window.supabase?.createClient) return null;
    fallbackDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return fallbackDb;
  }

  function subjectIdForItem(item, topicMap) {
    return topicMap.get(item.topic_id)?.subject_id || null;
  }

  function buildStudyDates(today, prefs) {
    const allowed = new Set((prefs.study_days || [1,2,3,4,5,6]).map(Number));
    const start = fromKey(today);
    const dates = [];
    for (let offset=0; offset<HORIZON_DAYS; offset+=1) {
      const date = addDays(start, offset);
      if (allowed.has(isoWeekday(date))) dates.push(dateKey(date, prefs.timezone || 'America/Bahia'));
    }
    return dates;
  }

  function priorityValue(item) {
    const typeBoost = item.task_type === 'review' ? 1000 : item.task_type === 'questions' ? 200 : 0;
    return typeBoost + Number(item.priority || 0);
  }

  async function normalize(options = {}) {
    if (busy) return { ok:true, changed:0, skipped:'busy' };
    busy = true;
    try {
      const db = options.db || await getDb();
      if (!db) return { ok:false, changed:0, reason:'no_db' };
      const sessionResult = await db.auth.getSession();
      const user = options.user || sessionResult.data?.session?.user || null;
      if (!user) return { ok:false, changed:0, reason:'no_user' };

      const prefR = await db.from('study_preferences').select('*').eq('user_id',user.id).maybeSingle();
      if (prefR.error) throw prefR.error;
      const prefs = prefR.data || { daily_minutes:60, study_days:[1,2,3,4,5,6], timezone:'America/Bahia' };
      const today = dateKey(new Date(), prefs.timezone || 'America/Bahia');
      const end = dateKey(addDays(fromKey(today), HORIZON_DAYS - 1), prefs.timezone || 'America/Bahia');

      const [itemsR,topicsR] = await Promise.all([
        db.from('study_plan_items').select('*')
          .eq('user_id',user.id).eq('plan_version',PLAN_VERSION)
          .gte('scheduled_for',today).lte('scheduled_for',end)
          .in('status',['pending','in_progress','completed'])
          .order('scheduled_for').order('sort_order'),
        db.from('topics').select('id,subject_id').eq('active',true)
      ]);
      if (itemsR.error) throw itemsR.error;
      if (topicsR.error) throw topicsR.error;

      const items = itemsR.data || [];
      if (!items.length) return { ok:true, changed:0 };
      const topicMap = new Map((topicsR.data || []).map(row => [row.id,row]));
      const studyDates = buildStudyDates(today,prefs);
      if (!studyDates.length) return { ok:true, changed:0 };

      const dayInfo = new Map(studyDates.map(day => [day,{ subjects:new Set(), minutes:0, items:[] }]));
      const hardMinutes = Math.max(20,Number(prefs.daily_minutes || 60));

      // Tarefa concluída ou já iniciada não é mexida; ela conta para o limite do dia.
      items.filter(item => item.status !== 'pending').forEach(item => {
        const info = dayInfo.get(item.scheduled_for);
        if (!info) return;
        const subjectId = subjectIdForItem(item,topicMap);
        if (subjectId) info.subjects.add(subjectId);
        info.minutes += Number(item.duration_minutes || 0);
        info.items.push(item.id);
      });

      const pending = items.filter(item => item.status === 'pending').sort((a,b) => {
        const dateCmp = String(a.scheduled_for).localeCompare(String(b.scheduled_for));
        if (dateCmp) return dateCmp;
        const priorityCmp = priorityValue(b) - priorityValue(a);
        if (priorityCmp) return priorityCmp;
        return Number(a.sort_order || 0) - Number(b.sort_order || 0);
      });

      const assignments = [];
      const overflow = [];

      for (const item of pending) {
        const subjectId = subjectIdForItem(item,topicMap);
        const earliest = String(item.scheduled_for || today) < today ? today : String(item.scheduled_for || today);
        const duration = Math.max(1,Number(item.duration_minutes || 0));
        let chosen = null;

        for (const day of studyDates) {
          if (day < earliest) continue;
          const info = dayInfo.get(day);
          const subjectAllowed = !subjectId || info.subjects.has(subjectId) || info.subjects.size < MAX_SUBJECTS_PER_DAY;
          const timeAllowed = info.minutes + duration <= hardMinutes;
          if (!subjectAllowed || !timeAllowed) continue;
          chosen = day;
          break;
        }

        if (!chosen) {
          // Tenta qualquer dia útil da janela antes de deixar a tarefa fora da missão.
          for (const day of studyDates) {
            const info = dayInfo.get(day);
            const subjectAllowed = !subjectId || info.subjects.has(subjectId) || info.subjects.size < MAX_SUBJECTS_PER_DAY;
            const timeAllowed = info.minutes + duration <= hardMinutes;
            if (!subjectAllowed || !timeAllowed) continue;
            chosen = day;
            break;
          }
        }

        if (!chosen) {
          overflow.push(item);
          continue;
        }

        const info = dayInfo.get(chosen);
        if (subjectId) info.subjects.add(subjectId);
        info.minutes += duration;
        info.items.push(item.id);
        assignments.push({ item, chosen });
      }

      const updates = [];
      const byDay = new Map();
      for (const assignment of assignments) {
        if (!byDay.has(assignment.chosen)) byDay.set(assignment.chosen,[]);
        byDay.get(assignment.chosen).push(assignment);
      }

      for (const [day,rows] of byDay) {
        rows.sort((a,b)=>priorityValue(b.item)-priorityValue(a.item)||Number(a.item.sort_order||0)-Number(b.item.sort_order||0));
        rows.forEach((row,index)=>updates.push({
          id:row.item.id,
          oldDate:row.item.scheduled_for,
          newDate:day,
          sortOrder:(index+1)*10,
          displacedFrom:row.item.displaced_from || (row.item.scheduled_for !== day ? row.item.scheduled_for : null)
        }));
      }

      let changed = 0;
      for (const row of updates) {
        if (row.oldDate === row.newDate && Number(row.sortOrder) === Number(pending.find(x=>x.id===row.id)?.sort_order||0)) continue;
        const patch = { scheduled_for:row.newDate, sort_order:row.sortOrder };
        if (row.displacedFrom) patch.displaced_from = row.displacedFrom;
        const result = await db.from('study_plan_items').update(patch).eq('id',row.id).eq('user_id',user.id);
        if (result.error) throw result.error;
        changed += 1;
      }

      // Se a janela inteira já estiver ocupada por 2 matérias/dia, a tarefa fica fora da missão,
      // mas a revisão real continua no histórico e volta a ser considerada pelo motor depois.
      for (const item of overflow) {
        const result = await db.from('study_plan_items').update({status:'skipped'}).eq('id',item.id).eq('user_id',user.id).eq('status','pending');
        if (result.error) throw result.error;
        changed += 1;
      }

      if (changed) {
        const detail = { subjectCapApplied:true, maxSubjectsPerDay:MAX_SUBJECTS_PER_DAY, changed, overflow:overflow.length };
        window.dispatchEvent(new CustomEvent('mentor:subject-cap-applied',{detail}));
        if (window.MentorScheduleEngine?.getPlan && options.notify !== false) {
          try {
            const plan = await window.MentorScheduleEngine.getPlan();
            window.dispatchEvent(new CustomEvent('mentor:plan-updated',{detail:{...plan,subjectCapApplied:true}}));
          } catch {}
        }
      }
      return { ok:true, changed, overflow:overflow.length };
    } finally {
      busy = false;
    }
  }

  function scheduleNormalize(delay=180) {
    clearTimeout(timer);
    timer = setTimeout(()=>normalize().catch(error=>console.warn('Limite de 2 matérias não aplicado:',error)),delay);
  }

  window.addEventListener('mentor:plan-updated',event=>{
    if (event.detail?.subjectCapApplied) return;
    scheduleNormalize();
  });
  window.addEventListener('mentor:attempt-saved',()=>scheduleNormalize(350));
  window.addEventListener('mentor:review-scheduled',()=>scheduleNormalize(350));

  window.MentorSubjectCap = Object.freeze({
    version:VERSION,
    maxSubjectsPerDay:MAX_SUBJECTS_PER_DAY,
    normalize,
    scheduleNormalize
  });

  setTimeout(()=>scheduleNormalize(0),650);
})();
