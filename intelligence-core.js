(() => {
  'use strict';

  const VERSION = '4.0.0';
  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN_VERSION = 'v3-clean';
  const TZ = 'America/Bahia';
  const HORIZON_DAYS = 7;
  const QUESTION_MINUTES = 3;
  const REVIEW_MINUTES = 4;
  const TARGET_EVIDENCE = 10;
  const MAX_SUBJECTS_PER_DAY = 2;

  const CYCLE = [
    ['Língua Portuguesa', 'História do Brasil'],
    ['Geografia do Brasil', 'Matemática'],
    ['Atualidades', 'Informática'],
    ['Direito Constitucional', 'Direitos Humanos'],
    ['Direito Administrativo', 'Direito Penal'],
    ['Igualdade Racial e de Gênero', 'Direito Penal Militar']
  ];

  let db = null;
  let user = null;
  let running = false;
  let lastCycleSnapshot = null;

  const $ = s => document.querySelector(s);
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function dateKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
  }

  function fromKey(key) {
    const [y,m,d] = String(key).split('-').map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 15, 0, 0));
  }

  function addDays(date, amount) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
  }

  function isoWeekday(date) {
    const n = date.getUTCDay();
    return n === 0 ? 7 : n;
  }

  function planMinutes(item) {
    return Number(item.duration_minutes || 0) || (item.task_type === 'review' ? REVIEW_MINUTES : Math.max(QUESTION_MINUTES, Number(item.question_target || 1) * QUESTION_MINUTES));
  }

  function forgettingRisk(state) {
    if (!state) return 0;
    const anchor = Date.parse(state.review_anchor_at || state.last_attempt_at || '');
    const intervalHours = Math.max(1, Number(state.review_interval_hours || 24));
    let risk = 0;
    if (Number.isFinite(anchor)) {
      const elapsedHours = Math.max(0, Date.now() - anchor) / 3600000;
      const retention = Math.pow(0.5, elapsedHours / intervalHours);
      risk = Math.round((1 - retention) * 100);
    }
    if (state.last_is_correct === false && Number(state.last_confidence || 0) >= 5) risk = Math.max(risk, 95);
    else if (state.last_is_correct === false) risk = Math.max(risk, 80);
    else if (state.last_is_correct === true && Number(state.last_confidence || 0) <= 2) risk = Math.max(risk, 70);
    if (state.next_review_at && Date.parse(state.next_review_at) <= Date.now()) risk = Math.max(risk, 90);
    return clamp(risk, 0, 100);
  }

  async function getContext() {
    if (!window.supabase?.createClient) return null;
    if (!db) db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    const { data:{ session } } = await db.auth.getSession();
    user = session?.user || null;
    return user ? { db, user, session } : null;
  }

  function studyDates(startKey, prefs) {
    const allowed = new Set((prefs?.study_days || [1,2,3,4,5,6]).map(Number));
    const start = fromKey(startKey);
    const out = [];
    for (let i = 0; i < HORIZON_DAYS; i += 1) {
      const d = addDays(start, i);
      if (allowed.has(isoWeekday(d))) out.push(dateKey(d));
    }
    return out;
  }

  function countStudySteps(anchorKey, targetKey, prefs) {
    if (targetKey <= anchorKey) return 0;
    const allowed = new Set((prefs?.study_days || [1,2,3,4,5,6]).map(Number));
    let steps = 0;
    let d = addDays(fromKey(anchorKey), 1);
    const target = fromKey(targetKey).getTime();
    while (d.getTime() <= target) {
      if (allowed.has(isoWeekday(d))) steps += 1;
      d = addDays(d, 1);
    }
    return steps;
  }

  function cycleForDate(cycleState, targetKey, prefs) {
    const basePosition = clamp(Number(cycleState?.cycle_position || 0), 0, CYCLE.length - 1);
    const baseNumber = Math.max(1, Number(cycleState?.cycle_number || 1));
    const anchor = cycleState?.anchor_date || dateKey();
    const steps = countStudySteps(anchor, targetKey, prefs);
    const raw = basePosition + steps;
    const position = ((raw % CYCLE.length) + CYCLE.length) % CYCLE.length;
    const cycleNumber = baseNumber + Math.floor(raw / CYCLE.length);
    return { position, cycleNumber, pair: CYCLE[position] };
  }

  async function ensureCycleState(today) {
    const current = await db.from('study_cycle_state').select('*').eq('user_id', user.id).maybeSingle();
    if (current.error) throw current.error;
    if (current.data) return current.data;
    const created = await db.from('study_cycle_state').insert({ user_id:user.id, cycle_position:0, cycle_number:1, anchor_date:today }).select('*').single();
    if (created.error) throw created.error;
    return created.data;
  }

  async function loadModel() {
    const today = dateKey();
    const end = dateKey(addDays(fromKey(today), HORIZON_DAYS - 1));
    const [prefsR, subjectsR, topicsR, masteryR, questionsR, statesR, reviewsR, planR, attemptsR, externalR] = await Promise.all([
      db.from('study_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active', true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active', true).order('position'),
      db.from('topic_mastery').select('topic_id,mastery_score,confidence_score,attempts_count,correct_count,last_attempt_at,next_review_at,trend').eq('user_id', user.id),
      db.from('questions').select('id,topic_id,subject_id').not('explanation','is',null).limit(5000),
      db.from('user_question_state').select('question_id,seen_count,last_is_correct,last_confidence,last_attempt_at,next_review_at,review_stage,review_interval_hours,review_anchor_at,status').eq('user_id', user.id).limit(5000),
      db.from('reviews').select('id,topic_id,question_id,due_at,status,review_stage,trigger_reason').eq('user_id', user.id).eq('status','pending').limit(2000),
      db.from('study_plan_items').select('*').eq('user_id', user.id).gte('scheduled_for', today).lte('scheduled_for', end).order('scheduled_for').order('sort_order').limit(1000),
      db.from('question_attempts').select('id,question_id,topic_id,answered_at').eq('user_id', user.id).gte('answered_at', `${today}T00:00:00-03:00`).order('answered_at'),
      db.from('external_practice_batches').select('id,topic_id,total_questions,practiced_at').eq('user_id', user.id).gte('practiced_at', `${today}T00:00:00-03:00`).order('practiced_at')
    ]);
    for (const r of [prefsR, subjectsR, topicsR, masteryR, questionsR, statesR, reviewsR, planR, attemptsR, externalR]) if (r.error) throw r.error;
    const cycleState = await ensureCycleState(today);
    return {
      today,
      end,
      prefs: prefsR.data || { daily_minutes:60, study_days:[1,2,3,4,5,6] },
      subjects: subjectsR.data || [],
      topics: topicsR.data || [],
      mastery: masteryR.data || [],
      questions: questionsR.data || [],
      states: statesR.data || [],
      reviews: reviewsR.data || [],
      plan: planR.data || [],
      attempts: attemptsR.data || [],
      external: externalR.data || [],
      cycleState
    };
  }

  function buildIndexes(model) {
    const subjectByName = new Map(model.subjects.map(s => [s.name, s]));
    const topicById = new Map(model.topics.map(t => [t.id, t]));
    const masteryByTopic = new Map(model.mastery.map(m => [m.topic_id, m]));
    const questionById = new Map(model.questions.map(q => [q.id, q]));
    const statesByQuestion = new Map(model.states.map(s => [s.question_id, s]));
    const statesByTopic = new Map();
    const unseenByTopic = new Map();
    const availableByTopic = new Map();

    for (const q of model.questions) {
      if (!q.topic_id) continue;
      availableByTopic.set(q.topic_id, (availableByTopic.get(q.topic_id) || 0) + 1);
      const st = statesByQuestion.get(q.id);
      if (!st || !Number(st.seen_count || 0)) unseenByTopic.set(q.topic_id, (unseenByTopic.get(q.topic_id) || 0) + 1);
      if (st) {
        if (!statesByTopic.has(q.topic_id)) statesByTopic.set(q.topic_id, []);
        statesByTopic.get(q.topic_id).push(st);
      }
    }

    const dueByTopic = new Map();
    for (const r of model.reviews) if (r.topic_id && Date.parse(r.due_at) <= Date.now()) dueByTopic.set(r.topic_id, (dueByTopic.get(r.topic_id) || 0) + 1);

    const topicScore = topic => {
      const m = masteryByTopic.get(topic.id) || {};
      const attempts = Number(m.attempts_count || 0);
      const accuracy = Number(m.mastery_score || 0);
      const need = Math.max(0, TARGET_EVIDENCE - attempts);
      const risk = (statesByTopic.get(topic.id) || []).reduce((mx, st) => Math.max(mx, forgettingRisk(st)), 0);
      const due = dueByTopic.get(topic.id) || 0;
      const unseen = unseenByTopic.get(topic.id) || 0;
      return due * 30 + risk + need * 8 + (attempts ? (100 - accuracy) : 35) + Math.min(20, unseen);
    };

    const bestTopic = subjectId => model.topics
      .filter(t => t.subject_id === subjectId && (availableByTopic.get(t.id) || 0) > 0)
      .sort((a,b) => topicScore(b) - topicScore(a) || Number(a.position || 0) - Number(b.position || 0))[0] || null;

    return { subjectByName, topicById, masteryByTopic, questionById, statesByQuestion, statesByTopic, unseenByTopic, availableByTopic, dueByTopic, topicScore, bestTopic };
  }

  function reviewTargetDay(review, model, idx, effectivePairs, dates) {
    const q = idx.questionById.get(review.question_id);
    const topic = idx.topicById.get(review.topic_id || q?.topic_id);
    const subjectId = topic?.subject_id || q?.subject_id;
    if (!subjectId) return null;
    const state = idx.statesByQuestion.get(review.question_id);
    const risk = forgettingRisk(state);
    let due = dateKey(new Date(review.due_at));
    if (due < model.today) due = model.today;

    const regular = dates.find(day => day >= due && effectivePairs.get(day)?.has(subjectId));
    if (regular && risk < 95) return { day:regular, subjectId, risk, urgent:risk >= 85 };

    if (risk >= 95 || dateKey(new Date(review.due_at)) <= model.today) {
      const emergency = dates.find(day => day >= model.today);
      return emergency ? { day:emergency, subjectId, risk, urgent:true, interrupt:true } : null;
    }

    const later = dates.find(day => effectivePairs.get(day)?.has(subjectId));
    return later ? { day:later, subjectId, risk, urgent:risk >= 85 } : null;
  }

  async function scheduleCycle(model) {
    const idx = buildIndexes(model);
    const dates = studyDates(model.today, model.prefs);
    if (!dates.length) return { changed:false, dates:[], idx, effectivePairs:new Map() };

    const effectivePairs = new Map();
    const cycleMeta = new Map();
    for (const day of dates) {
      const c = cycleForDate(model.cycleState, day, model.prefs);
      const ids = c.pair.map(name => idx.subjectByName.get(name)?.id).filter(Boolean).slice(0, MAX_SUBJECTS_PER_DAY);
      effectivePairs.set(day, new Set(ids));
      cycleMeta.set(day, c);
    }

    const reviewPlacements = [];
    for (const review of model.reviews) {
      if (!review.question_id) continue;
      const placement = reviewTargetDay(review, model, idx, effectivePairs, dates);
      if (!placement) continue;
      if (placement.interrupt && !effectivePairs.get(placement.day).has(placement.subjectId)) {
        const set = effectivePairs.get(placement.day);
        const keep = [...set][0];
        set.clear();
        if (keep) set.add(keep);
        set.add(placement.subjectId);
      }
      reviewPlacements.push({ review, ...placement });
    }

    let changed = false;

    for (const p of reviewPlacements) {
      const existing = model.plan.find(x => x.task_type === 'review' && x.question_id === p.review.question_id && x.status !== 'skipped');
      const priority = p.risk >= 95 ? 100 : p.risk >= 85 ? 96 : p.risk >= 65 ? 90 : 82;
      const source = p.risk >= 85 ? 'revisao_preditiva_urgente' : p.risk >= 65 ? 'revisao_preditiva' : 'revisao_programada';
      if (existing) {
        if (existing.scheduled_for !== p.day || Number(existing.priority || 0) < priority || existing.source_reason !== source || existing.plan_version !== PLAN_VERSION) {
          const upd = await db.from('study_plan_items').update({ scheduled_for:p.day, priority, source_reason:source, plan_version:PLAN_VERSION }).eq('id', existing.id).eq('user_id', user.id);
          if (upd.error) throw upd.error;
          changed = true;
        }
      } else {
        const ins = await db.from('study_plan_items').insert({
          user_id:user.id, topic_id:p.review.topic_id, question_id:p.review.question_id, scheduled_for:p.day,
          task_type:'review', question_target:1, duration_minutes:REVIEW_MINUTES, priority,
          status:'pending', source_reason:source, plan_version:PLAN_VERSION, sort_order:10, progress_count:0
        });
        if (ins.error) throw ins.error;
        changed = true;
      }
    }

    const oldFillers = model.plan.filter(p => p.status === 'pending' && p.task_type === 'questions' && (String(p.source_reason || '').startsWith('cycle_v4_') || p.source_reason === 'cap_fill_qconcursos'));
    if (oldFillers.length) {
      const ids = oldFillers.map(p => p.id);
      const del = await db.from('study_plan_items').delete().eq('user_id', user.id).in('id', ids);
      if (del.error) throw del.error;
      changed = true;
    }

    const refreshed = await db.from('study_plan_items').select('*').eq('user_id', user.id).gte('scheduled_for', model.today).lte('scheduled_for', model.end).neq('status','skipped').order('scheduled_for').order('sort_order');
    if (refreshed.error) throw refreshed.error;
    const activePlan = refreshed.data || [];
    const hard = Math.max(20, Number(model.prefs?.daily_minutes || 60));

    for (const day of dates) {
      const pair = [...(effectivePairs.get(day) || [])].slice(0, MAX_SUBJECTS_PER_DAY);
      if (!pair.length) continue;
      const existing = activePlan.filter(p => p.scheduled_for === day && ['pending','in_progress','completed'].includes(p.status));
      let remaining = Math.max(0, hard - existing.reduce((s,p) => s + planMinutes(p), 0));
      if (remaining < QUESTION_MINUTES) continue;

      const candidates = pair.map(subjectId => ({ subjectId, topic:idx.bestTopic(subjectId) })).filter(x => x.topic);
      for (let i = 0; i < candidates.length && remaining >= QUESTION_MINUTES; i += 1) {
        const { subjectId, topic } = candidates[i];
        const alreadySubject = existing.some(p => idx.topicById.get(p.topic_id)?.subject_id === subjectId && p.task_type === 'questions');
        if (alreadySubject) continue;
        const slots = candidates.length - i;
        const share = Math.max(QUESTION_MINUTES, Math.floor(remaining / slots));
        let target = Math.min(10, Math.max(1, Math.floor(share / QUESTION_MINUTES)));
        const mastery = idx.masteryByTopic.get(topic.id) || {};
        const need = Math.max(0, TARGET_EVIDENCE - Number(mastery.attempts_count || 0));
        if (need) target = Math.min(target, need);
        const unseen = idx.unseenByTopic.get(topic.id) || 0;
        const bankTarget = Math.min(target, unseen);

        if (bankTarget > 0 && remaining >= QUESTION_MINUTES) {
          const duration = Math.min(remaining, bankTarget * QUESTION_MINUTES);
          const count = Math.max(1, Math.floor(duration / QUESTION_MINUTES));
          const ins = await db.from('study_plan_items').insert({
            user_id:user.id, topic_id:topic.id, scheduled_for:day, task_type:'questions', question_target:count,
            duration_minutes:count * QUESTION_MINUTES, priority:72, status:'pending', source_reason:'cycle_v4_bank',
            plan_version:PLAN_VERSION, sort_order:500 + i * 20, progress_count:0
          });
          if (ins.error) throw ins.error;
          remaining -= count * QUESTION_MINUTES;
          changed = true;
          target -= count;
        }

        if (target > 0 && remaining >= QUESTION_MINUTES) {
          const count = Math.min(target, Math.max(1, Math.floor(remaining / QUESTION_MINUTES)));
          const ins = await db.from('study_plan_items').insert({
            user_id:user.id, topic_id:topic.id, scheduled_for:day, task_type:'questions', question_target:count,
            duration_minutes:count * QUESTION_MINUTES, priority:68, status:'pending', source_reason:'cycle_v4_qconcursos',
            plan_version:PLAN_VERSION, sort_order:510 + i * 20, progress_count:0
          });
          if (ins.error) throw ins.error;
          remaining -= count * QUESTION_MINUTES;
          changed = true;
        }
      }
    }

    lastCycleSnapshot = { model, idx, effectivePairs, cycleMeta, dates };
    return { changed, idx, effectivePairs, cycleMeta, dates };
  }

  async function reconcileToday(model) {
    const todayItems = model.plan.filter(p => p.scheduled_for === model.today && p.plan_version === PLAN_VERSION && p.task_type === 'questions' && ['pending','in_progress'].includes(p.status));
    if (!todayItems.length) return false;
    let changed = false;
    const internalByTopic = new Map();
    const seen = new Set();
    for (const a of model.attempts) {
      if (!a.topic_id || !a.question_id) continue;
      const key = `${a.topic_id}|${a.question_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      internalByTopic.set(a.topic_id, (internalByTopic.get(a.topic_id) || 0) + 1);
    }
    const externalByTopic = new Map();
    for (const b of model.external) if (b.topic_id) externalByTopic.set(b.topic_id, (externalByTopic.get(b.topic_id) || 0) + Number(b.total_questions || 0));

    for (const item of todayItems) {
      const source = String(item.source_reason || '');
      const actual = source.includes('qconcursos') ? (externalByTopic.get(item.topic_id) || 0) : (internalByTopic.get(item.topic_id) || 0);
      const target = Math.max(1, Number(item.question_target || 1));
      const progress = Math.min(target, Math.max(Number(item.progress_count || 0), actual));
      const status = progress >= target ? 'completed' : progress > 0 ? 'in_progress' : 'pending';
      if (progress !== Number(item.progress_count || 0) || status !== item.status) {
        const upd = await db.from('study_plan_items').update({ progress_count:progress, status, completed_at:status === 'completed' ? new Date().toISOString() : null }).eq('id', item.id).eq('user_id', user.id);
        if (upd.error) throw upd.error;
        changed = true;
      }
    }
    return changed;
  }

  function injectStyles() {
    if ($('#mentorIntelligenceV4Css')) return;
    const style = document.createElement('style');
    style.id = 'mentorIntelligenceV4Css';
    style.textContent = `
      .mentor-cycle-strip{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px;margin:12px 0 18px;border-radius:14px;background:#111;color:#fff;border-left:5px solid #f2c500;box-shadow:0 8px 24px rgba(0,0,0,.08)}
      .mentor-cycle-strip strong{display:block;font-size:14px}.mentor-cycle-strip span{font-size:12px;opacity:.78}.mentor-cycle-pair{font-weight:800;text-align:right}
      .mentor-v4-alerts{display:grid;gap:10px;margin:14px 0}.mentor-v4-alert{padding:14px 16px;border-radius:12px;border:1px solid #ddd;background:#fff}.mentor-v4-alert[data-severity="critical"]{border-left:5px solid #b91c1c;background:#fff5f5}.mentor-v4-alert[data-severity="high"]{border-left:5px solid #d97706;background:#fff9ed}.mentor-v4-alert[data-severity="medium"]{border-left:5px solid #2563eb;background:#f5f8ff}.mentor-v4-alert strong{display:block;margin-bottom:5px}.mentor-v4-alert span{font-size:13px;color:#555}.mentor-dashboard-alert{margin-top:12px;padding:11px 13px;border-radius:10px;background:#fff4cf;border:1px solid #e4c65b;font-size:13px;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function renderCycle(snapshot) {
    if (!snapshot?.dates?.length) return;
    const today = dateKey();
    const day = snapshot.dates.includes(today) ? today : snapshot.dates[0];
    const meta = snapshot.cycleMeta.get(day);
    if (!meta) return;
    const pairNames = [...snapshot.effectivePairs.get(day)].map(id => snapshot.model.subjects.find(s => s.id === id)?.name).filter(Boolean);
    const html = `<div><strong>Ciclo ${meta.cycleNumber} • Dia ${meta.position + 1} de ${CYCLE.length}</strong><span>${day === today ? 'Ciclo de hoje' : 'Próximo dia de estudo'}</span></div><div class="mentor-cycle-pair">${esc(pairNames.join(' + '))}</div>`;
    let host = $('#mentorCycleDaily');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mentorCycleDaily';
      host.className = 'mentor-cycle-strip';
      const page = $('[data-page-view="daily"]');
      const header = page?.querySelector('.page-header');
      header?.insertAdjacentElement('afterend', host);
    }
    if (host) host.innerHTML = html;

    let dash = $('#mentorCycleDashboard');
    if (!dash) {
      dash = document.createElement('div');
      dash.id = 'mentorCycleDashboard';
      dash.className = 'mentor-cycle-strip';
      $('.welcome-panel')?.insertAdjacentElement('afterend', dash);
    }
    if (dash) dash.innerHTML = html;
  }

  async function renderMentorAlerts(session) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/mentor-analyze`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}`, apikey:SUPABASE_KEY },
      body:JSON.stringify({ intent:'today', persist:false })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Mentora indisponível');
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];

    let host = $('#mentorV4Alerts');
    if (!host) {
      host = document.createElement('section');
      host.id = 'mentorV4Alerts';
      host.className = 'panel';
      host.innerHTML = '<div class="panel-heading"><div><small>ALERTAS AUTOMÁTICOS</small><h2>O que a Mentora detectou</h2></div></div><div class="mentor-v4-alerts" id="mentorV4AlertList"></div>';
      const report = $('[data-page-view="mentor"] .mentor-report');
      report?.insertAdjacentElement('afterend', host);
    }
    const list = $('#mentorV4AlertList');
    if (list) list.innerHTML = alerts.length ? alerts.slice(0,5).map(a => `<article class="mentor-v4-alert" data-severity="${esc(a.severity || 'medium')}"><strong>${esc(a.message)}</strong><span>${esc(a.action)}</span></article>`).join('') : '<div class="empty-state">Nenhum alerta crítico agora. Siga o ciclo.</div>';

    let dash = $('#mentorDashboardAlertV4');
    const top = alerts[0];
    if (!dash && top) {
      dash = document.createElement('div');
      dash.id = 'mentorDashboardAlertV4';
      dash.className = 'mentor-dashboard-alert';
      $('#dashboardMentorNext')?.insertAdjacentElement('afterend', dash);
    }
    if (dash) {
      if (top) { dash.hidden = false; dash.textContent = `${top.message} ${top.action}`; }
      else dash.hidden = true;
    }
  }

  async function run({ allowReload = true } = {}) {
    if (running) return;
    running = true;
    try {
      const ctx = await getContext();
      if (!ctx) return;
      injectStyles();
      let model = await loadModel();
      const cycleResult = await scheduleCycle(model);
      model = await loadModel();
      const reconciled = await reconcileToday(model);
      renderCycle({ ...cycleResult, model });
      await renderMentorAlerts(ctx.session);

      const changed = cycleResult.changed || reconciled;
      const reloadKey = `mentor-v4-reload-${dateKey()}`;
      if (changed && allowReload && sessionStorage.getItem(reloadKey) !== '1') {
        sessionStorage.setItem(reloadKey, '1');
        setTimeout(() => location.reload(), 250);
      } else if (!changed) {
        sessionStorage.removeItem(reloadKey);
      }
    } catch (error) {
      console.error('Mentor Intelligence V4:', error);
    } finally {
      running = false;
    }
  }

  async function boot() {
    await new Promise(resolve => setTimeout(resolve, 1400));
    await run();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run({ allowReload:false }); });
    window.addEventListener('focus', () => run({ allowReload:false }));
  }

  window.MentorIntelligence = Object.freeze({ version:VERSION, run, forgettingRisk, cycle:CYCLE });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
