(() => {
  'use strict';

  const VERSION='4.5.0';
  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN='v3-clean',TZ='America/Bahia',HORIZON=7;
  const MAX_SUBJECTS=2,MIN_DAILY_QUESTIONS=30,BASE_PER_SUBJECT=20,MEDIUM_PER_SUBJECT=30,CRITICAL_PER_SUBJECT=40;
  const MAX_REVIEW_QUESTIONS=5,TARGET_EVIDENCE=10,SUBJECT_SAMPLE_MIN=8,PACE_OVERHEAD_SEC=35,PACE_MIN_SEC=50,PACE_MAX_SEC=300;
  const SOURCE_PREFIX='pace_v45_';
  const OLD_PREFIXES=['volume_v44_','focus_v43_','cycle_v4_','cycle_v41_','cycle_v42_'];
  const CYCLE=[
    ['Língua Portuguesa','História do Brasil'],
    ['Geografia do Brasil','Matemática'],
    ['Atualidades','Informática'],
    ['Direito Constitucional','Direitos Humanos'],
    ['Direito Administrativo','Direito Penal'],
    ['Igualdade Racial e de Gênero','Direito Penal Militar']
  ];

  let db=null,user=null,busy=false,lastModel=null,lastIdx=null,lastMeta=null;
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const fromKey=k=>{const [y,m,d]=String(k).split('-').map(Number);return new Date(Date.UTC(y,m-1,d,15));};
  const addDays=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;};
  const isoWeekday=d=>{const n=d.getUTCDay();return n===0?7:n;};
  const avg=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
  const median=a=>{if(!a.length)return 0;const x=[...a].sort((m,n)=>m-n),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2;};
  const fmtSec=s=>{s=Math.max(0,Math.round(Number(s||0)));return s<60?`${s}s`:`${Math.floor(s/60)}m${String(s%60).padStart(2,'0')}s`;};

  function forgettingRisk(st){
    if(!st)return 0;
    const anchor=Date.parse(st.review_anchor_at||st.last_attempt_at||'');
    const interval=Math.max(1,Number(st.review_interval_hours||24));
    let risk=0;
    if(Number.isFinite(anchor)){
      const elapsed=Math.max(0,Date.now()-anchor)/3600000;
      risk=Math.round((1-Math.pow(.5,elapsed/interval))*100);
    }
    if(st.last_is_correct===false&&Number(st.last_confidence||0)>=5)risk=Math.max(risk,98);
    else if(st.last_is_correct===false)risk=Math.max(risk,82);
    else if(st.last_is_correct===true&&Number(st.last_confidence||0)<=2)risk=Math.max(risk,72);
    if(st.next_review_at&&Date.parse(st.next_review_at)<=Date.now())risk=Math.max(risk,90);
    return clamp(risk,0,100);
  }

  async function context(){
    if(!window.supabase?.createClient)return null;
    if(!db)db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await db.auth.getSession();
    user=session?.user||null;
    return user?{session}:null;
  }

  function studyDates(today,prefs){
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number)),out=[];
    for(let i=0;i<HORIZON;i++){const d=addDays(fromKey(today),i);if(allowed.has(isoWeekday(d)))out.push(dateKey(d));}
    return out;
  }
  function countStudySteps(anchor,target,prefs){
    if(target<=anchor)return 0;
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number));let count=0,d=addDays(fromKey(anchor),1),end=fromKey(target).getTime();
    while(d.getTime()<=end){if(allowed.has(isoWeekday(d)))count++;d=addDays(d,1);}return count;
  }
  function cycleAt(cs,day,prefs){
    const base=clamp(Number(cs.cycle_position||0),0,CYCLE.length-1),raw=base+countStudySteps(cs.anchor_date,day,prefs);
    return{position:raw%CYCLE.length,cycleNumber:Number(cs.cycle_number||1)+Math.floor(raw/CYCLE.length),pair:CYCLE[raw%CYCLE.length]};
  }
  async function ensureCycle(today){
    const r=await db.from('study_cycle_state').select('*').eq('user_id',user.id).maybeSingle();if(r.error)throw r.error;if(r.data)return r.data;
    const c=await db.from('study_cycle_state').insert({user_id:user.id,cycle_position:0,cycle_number:1,anchor_date:today}).select('*').single();if(c.error)throw c.error;return c.data;
  }

  async function loadModel(){
    const today=dateKey(),end=dateKey(addDays(fromKey(today),HORIZON-1));
    const [prefsR,subjectsR,topicsR,masteryR,questionsR,statesR,reviewsR,planR,attemptsR,externalR,sessionsR]=await Promise.all([
      db.from('study_preferences').select('*').eq('user_id',user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count,correct_count,trend,last_attempt_at,confidence_score').eq('user_id',user.id),
      db.from('questions').select('id,topic_id,subject_id').not('explanation','is',null).limit(5000),
      db.from('user_question_state').select('question_id,seen_count,last_is_correct,last_confidence,last_attempt_at,next_review_at,review_interval_hours,review_anchor_at').eq('user_id',user.id).limit(5000),
      db.from('reviews').select('id,topic_id,question_id,due_at,status,trigger_reason').eq('user_id',user.id).eq('status','pending').limit(3000),
      db.from('study_plan_items').select('*').eq('user_id',user.id).gte('scheduled_for',today).lte('scheduled_for',end).order('scheduled_for').order('sort_order'),
      db.from('question_attempts').select('question_id,subject_id,topic_id,is_correct,response_time_seconds,confidence,error_type,answered_at,source_kind').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(1200),
      db.from('external_practice_batches').select('subject_id,topic_id,total_questions,correct_count,confidence,duration_minutes,practiced_at,source_kind').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(500),
      db.from('study_sessions').select('subject_id,topic_id,started_at,ended_at,duration_minutes,questions_answered,correct_answers').eq('user_id',user.id).order('started_at',{ascending:false}).limit(500)
    ]);
    for(const r of [prefsR,subjectsR,topicsR,masteryR,questionsR,statesR,reviewsR,planR,attemptsR,externalR,sessionsR])if(r.error)throw r.error;
    return{today,end,prefs:prefsR.data||{daily_minutes:60,study_days:[1,2,3,4,5,6]},subjects:subjectsR.data||[],topics:topicsR.data||[],mastery:masteryR.data||[],questions:questionsR.data||[],states:statesR.data||[],reviews:reviewsR.data||[],plan:planR.data||[],attempts:attemptsR.data||[],external:externalR.data||[],sessions:sessionsR.data||[],cycle:await ensureCycle(today)};
  }

  function paceModel(m){
    const cutoff=Date.now()-120*86400000;
    const validAttempt=a=>Number(a.response_time_seconds)>=10&&Number(a.response_time_seconds)<=600&&Date.parse(a.answered_at)>=cutoff;
    const recent=m.attempts.filter(validAttempt);
    const globalVals=recent.slice(0,300).map(a=>Number(a.response_time_seconds));
    const globalMedian=median(globalVals)||60,globalAvg=avg(globalVals)||globalMedian;
    const globalEffective=clamp(globalMedian+PACE_OVERHEAD_SEC,PACE_MIN_SEC,PACE_MAX_SEC);
    const bySubject=new Map();
    for(const s of m.subjects){
      const vals=recent.filter(a=>a.subject_id===s.id).slice(0,80).map(a=>Number(a.response_time_seconds));
      const ext=m.external.filter(b=>b.subject_id===s.id&&Number(b.total_questions)>0&&Number(b.duration_minutes)>0).slice(0,10).map(b=>Number(b.duration_minutes)*60/Number(b.total_questions)).filter(x=>x>=10&&x<=600);
      const rawMedian=median(vals),rawAvg=avg(vals),samples=vals.length;
      let responseSec=samples>=SUBJECT_SAMPLE_MIN?rawMedian:globalMedian;
      if(ext.length){const extMedian=median(ext);responseSec=samples>=SUBJECT_SAMPLE_MIN?responseSec*.8+extMedian*.2:responseSec*.65+extMedian*.35;}
      const effectiveSec=clamp(responseSec+PACE_OVERHEAD_SEC,PACE_MIN_SEC,PACE_MAX_SEC);
      bySubject.set(s.id,{subject_id:s.id,subject:s.name,samples,external_samples:ext.length,response_median_sec:rawMedian||null,response_avg_sec:rawAvg||null,used_response_sec:Math.round(responseSec),effective_sec:Math.round(effectiveSec),source:samples>=SUBJECT_SAMPLE_MIN?'subject':'global_fallback'});
    }
    return{samples:globalVals.length,response_median_sec:Math.round(globalMedian),response_avg_sec:Math.round(globalAvg),effective_sec:Math.round(globalEffective),bySubject};
  }

  function indexes(m){
    const subjectByName=new Map(m.subjects.map(s=>[s.name,s])),topicById=new Map(m.topics.map(t=>[t.id,t]));
    const masteryByTopic=new Map(m.mastery.map(x=>[x.topic_id,x])),qById=new Map(m.questions.map(q=>[q.id,q])),stateByQ=new Map(m.states.map(s=>[s.question_id,s]));
    const available=new Map(),unseen=new Map(),statesByTopic=new Map(),reviewsByTopic=new Map(),pace=paceModel(m);
    for(const q of m.questions){
      if(!q.topic_id)continue;available.set(q.topic_id,(available.get(q.topic_id)||0)+1);
      const st=stateByQ.get(q.id);if(!st||!Number(st.seen_count||0))unseen.set(q.topic_id,(unseen.get(q.topic_id)||0)+1);
      if(st){if(!statesByTopic.has(q.topic_id))statesByTopic.set(q.topic_id,[]);statesByTopic.get(q.topic_id).push(st);}
    }
    for(const r of m.reviews){const topicId=r.topic_id||qById.get(r.question_id)?.topic_id;if(!topicId)continue;if(!reviewsByTopic.has(topicId))reviewsByTopic.set(topicId,[]);reviewsByTopic.get(topicId).push(r);}
    const dueReviews=(topicId,day)=>(reviewsByTopic.get(topicId)||[]).filter(r=>dateKey(new Date(r.due_at))<=day).sort((a,b)=>forgettingRisk(stateByQ.get(b.question_id))-forgettingRisk(stateByQ.get(a.question_id))||Date.parse(a.due_at)-Date.parse(b.due_at));
    const maxRisk=topicId=>(statesByTopic.get(topicId)||[]).reduce((mx,st)=>Math.max(mx,forgettingRisk(st)),0);
    const topicScore=(topic,day)=>{
      const master=masteryByTopic.get(topic.id)||{},evidence=Number(master.attempts_count||0),accuracy=Number(master.mastery_score||0),due=dueReviews(topic.id,day),risk=maxRisk(topic.id);
      const weak=evidence>=TARGET_EVIDENCE?Math.max(0,80-accuracy)*2:Math.max(0,TARGET_EVIDENCE-evidence)*7;
      return due.length*60+risk+weak+(master.trend==='down'?30:0)+Math.min(15,unseen.get(topic.id)||0);
    };
    const focusTopic=(subjectId,day)=>m.topics.filter(t=>t.subject_id===subjectId).sort((a,b)=>topicScore(b,day)-topicScore(a,day)||Number(a.position||0)-Number(b.position||0))[0]||null;
    const desiredQuota=(topic,day,single=false)=>{
      const master=masteryByTopic.get(topic.id)||{},evidence=Number(master.attempts_count||0),accuracy=Number(master.mastery_score||0),due=dueReviews(topic.id,day).length,risk=maxRisk(topic.id);
      let quota=BASE_PER_SUBJECT;
      if(risk>=95||due>=4||(evidence>=TARGET_EVIDENCE&&accuracy<55))quota=CRITICAL_PER_SUBJECT;
      else if(risk>=80||due>=2||master.trend==='down'||(evidence>=TARGET_EVIDENCE&&accuracy<75))quota=MEDIUM_PER_SUBJECT;
      if(single)quota=Math.max(MIN_DAILY_QUESTIONS,quota);
      return quota;
    };
    const paceSec=subjectId=>pace.bySubject.get(subjectId)?.effective_sec||pace.effective_sec;
    return{subjectByName,topicById,masteryByTopic,stateByQ,available,unseen,reviewsByTopic,dueReviews,maxRisk,focusTopic,desiredQuota,pace,paceSec,topicScore};
  }

  function isGenerated(p){const s=String(p.source_reason||'');return s.startsWith(SOURCE_PREFIX)||OLD_PREFIXES.some(x=>s.startsWith(x))||s==='cap_fill_qconcursos'||s.startsWith('revisao_');}
  async function cleanupOldPending(m){
    const old=m.plan.filter(p=>p.status==='pending'&&isGenerated(p)&&!String(p.source_reason||'').startsWith(SOURCE_PREFIX));
    if(!old.length)return false;const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',old.map(x=>x.id));if(del.error)throw del.error;return true;
  }

  function allocateDay(subjectRows,dailyMinutes,idx){
    const n=subjectRows.length;if(!n)return{rows:[],estimatedMinutes:0,totalQuestions:0,overBudget:false,minRequiredMinutes:0};
    const budgetSec=Math.max(20,Number(dailyMinutes||60))*60;
    const rows=subjectRows.map(x=>({...x,paceSec:idx.paceSec(x.subject.id),quota:n===1?MIN_DAILY_QUESTIONS:Math.floor(MIN_DAILY_QUESTIONS/n)}));
    if(n===2&&rows[0].quota+rows[1].quota<MIN_DAILY_QUESTIONS)rows[0].quota++;
    const sec=()=>rows.reduce((s,r)=>s+r.quota*r.paceSec,0);
    const minRequiredSec=sec();
    const urgency=r=>idx.topicScore(r.topic,r.day);
    let changed=true;
    while(changed){
      changed=false;
      const candidates=rows.filter(r=>r.quota<Math.min(BASE_PER_SUBJECT,r.desired)).sort((a,b)=>urgency(b)-urgency(a));
      for(const r of candidates){if(sec()+r.paceSec<=budgetSec){r.quota++;changed=true;}}
    }
    changed=true;
    while(changed){
      changed=false;
      const candidates=rows.filter(r=>r.quota<r.desired).sort((a,b)=>urgency(b)-urgency(a));
      for(const r of candidates){if(sec()+r.paceSec<=budgetSec){r.quota++;changed=true;break;}}
    }
    const estimatedSec=sec();
    return{rows,estimatedMinutes:Math.ceil(estimatedSec/60),totalQuestions:rows.reduce((s,r)=>s+r.quota,0),overBudget:estimatedSec>budgetSec,minRequiredMinutes:Math.ceil(minRequiredSec/60),budgetMinutes:Number(dailyMinutes||60)};
  }

  function desiredPlan(m,idx,dates){
    const desired=[],meta=new Map(),dailyMinutes=Math.max(20,Number(m.prefs.daily_minutes||60));
    for(const day of dates){
      const cycle=cycleAt(m.cycle,day,m.prefs),subjects=cycle.pair.map(name=>idx.subjectByName.get(name)).filter(Boolean).slice(0,MAX_SUBJECTS),single=subjects.length===1;
      const focusRows=[];
      subjects.forEach(subject=>{
        const sameSubject=p=>idx.topicById.get(p.topic_id)?.subject_id===subject.id;
        const locked=m.plan.find(p=>p.scheduled_for===day&&isGenerated(p)&&['pending','in_progress','completed'].includes(p.status)&&sameSubject(p));
        const topic=locked?idx.topicById.get(locked.topic_id):idx.focusTopic(subject.id,day);if(!topic)return;
        focusRows.push({subject,topic,day,desired:idx.desiredQuota(topic,day,single)});
      });
      const allocation=allocateDay(focusRows,dailyMinutes,idx);meta.set(day,{cycle,subjects,allocation});
      allocation.rows.forEach((row,slot)=>{
        const {topic,quota}=row,due=idx.dueReviews(topic.id,day),paceSec=row.paceSec;
        const completedRows=m.plan.filter(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.status==='completed'&&isGenerated(p));
        const completedCount=completedRows.reduce((s,p)=>s+Math.max(1,Number(p.question_target||1)),0);
        const remaining=Math.max(0,quota-completedCount);
        if(!remaining)return;
        const existingReview=m.plan.find(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.task_type==='review'&&['pending','in_progress'].includes(p.status)&&String(p.source_reason||'').startsWith(SOURCE_PREFIX));
        const existingQuestions=m.plan.find(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.task_type==='questions'&&['pending','in_progress'].includes(p.status)&&String(p.source_reason||'').startsWith(SOURCE_PREFIX));
        const reviewTarget=existingReview?Math.min(remaining,Math.max(1,Number(existingReview.question_target||1))):Math.min(MAX_REVIEW_QUESTIONS,due.length,remaining);
        const questionTarget=existingQuestions?Math.max(1,Number(existingQuestions.question_target||1)):Math.max(0,remaining-reviewTarget);
        if(reviewTarget){
          const first=due[0]||{question_id:existingReview?.question_id},risk=forgettingRisk(idx.stateByQ.get(first.question_id));
          desired.push({key:`${day}|review|${topic.id}`,scheduled_for:day,topic_id:topic.id,question_id:first.question_id||existingReview?.question_id,task_type:'review',question_target:reviewTarget,duration_minutes:Math.ceil(reviewTarget*paceSec/60),priority:risk>=95?100:risk>=85?96:90,status:'pending',source_reason:`${SOURCE_PREFIX}review`,plan_version:PLAN,sort_order:slot*100+10,progress_count:0});
        }
        if(questionTarget){
          const useBank=(idx.unseen.get(topic.id)||0)>=questionTarget;
          desired.push({key:`${day}|questions|${topic.id}`,scheduled_for:day,topic_id:topic.id,question_id:null,task_type:'questions',question_target:questionTarget,duration_minutes:Math.ceil(questionTarget*paceSec/60),priority:80,status:'pending',source_reason:useBank?`${SOURCE_PREFIX}bank`:`${SOURCE_PREFIX}qconcursos`,plan_version:PLAN,sort_order:slot*100+20,progress_count:0});
        }
      });
    }
    return{desired,meta};
  }

  async function reconcile(m,desired){
    const existing=m.plan.filter(p=>String(p.source_reason||'').startsWith(SOURCE_PREFIX)&&['pending','in_progress'].includes(p.status)),desiredMap=new Map(desired.map(d=>[d.key,d])),byKey=new Map();
    for(const p of existing){const key=`${p.scheduled_for}|${p.task_type}|${p.topic_id}`;if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(p);}let changed=false;
    for(const [key,rows] of byKey){
      const want=desiredMap.get(key);if(!want){const removable=rows.filter(r=>r.status==='pending');if(removable.length){const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',removable.map(r=>r.id));if(del.error)throw del.error;changed=true;}continue;}
      const keep=rows[0],extras=rows.slice(1).filter(r=>r.status==='pending');if(extras.length){const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',extras.map(r=>r.id));if(del.error)throw del.error;changed=true;}
      if(keep.status==='pending'){
        const patch={question_id:want.question_id,question_target:want.question_target,duration_minutes:want.duration_minutes,priority:want.priority,source_reason:want.source_reason,plan_version:PLAN,sort_order:want.sort_order};
        if(Object.entries(patch).some(([k,v])=>String(keep[k]??'')!==String(v??''))){const u=await db.from('study_plan_items').update(patch).eq('id',keep.id).eq('user_id',user.id);if(u.error)throw u.error;changed=true;}
      }
      desiredMap.delete(key);
    }
    for(const want of desiredMap.values()){const row={...want,user_id:user.id};delete row.key;const ins=await db.from('study_plan_items').insert(row);if(ins.error)throw ins.error;changed=true;}
    return changed;
  }

  function injectStyles(){
    if($('#mentorV45Css'))return;const style=document.createElement('style');style.id='mentorV45Css';style.textContent=`
      .mentor-cycle-strip{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px;margin:12px 0 18px;border-radius:14px;background:#111;color:#fff;border-left:5px solid #f2c500;box-shadow:0 8px 24px rgba(0,0,0,.08)}
      .mentor-cycle-strip strong{display:block;font-size:14px}.mentor-cycle-strip span{font-size:12px;opacity:.8}.mentor-cycle-pair{font-weight:800;text-align:right}
      .pace-panel-v45{margin-top:16px;padding:16px;border-radius:14px;background:#fff7d6;border:1px solid #e6c959}.pace-grid-v45{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.pace-stat-v45{background:#fff;padding:12px;border-radius:10px}.pace-stat-v45 strong{display:block;font-size:18px}.pace-stat-v45 span{font-size:12px;color:#666}.pace-warning-v45{margin-top:10px;font-weight:700;color:#8a4b00}
      .mentor-export-v45{margin-top:18px}.mentor-export-v45 .actions{display:flex;gap:10px;flex-wrap:wrap}.mentor-export-v45 p{margin:8px 0 14px}
      @media(max-width:700px){.pace-grid-v45{grid-template-columns:1fr}.mentor-cycle-strip{align-items:flex-start;flex-direction:column}.mentor-cycle-pair{text-align:left}}
    `;document.head.appendChild(style);
  }

  function renderPacePanel(m,idx){
    const host=$('#schedulePreferences');if(!host)return;
    let node=$('#mentorPacePanelV45');if(!node){node=document.createElement('div');node.id='mentorPacePanelV45';node.className='pace-panel-v45';host.appendChild(node);}
    const daily=Math.max(20,Number($('#prefDailyMinutes')?.value||m.prefs.daily_minutes||60)),p=idx.pace;
    const capacity=Math.max(1,Math.floor(daily*60/p.effective_sec)),need30=Math.ceil(MIN_DAILY_QUESTIONS*p.effective_sec/60),need40=Math.ceil(40*p.effective_sec/60);
    node.innerHTML=`<strong>Ritmo aprendido pela Mentora</strong><div class="pace-grid-v45"><div class="pace-stat-v45"><strong>${esc(fmtSec(p.response_median_sec))}</strong><span>mediana real de resposta • ${p.samples} amostras</span></div><div class="pace-stat-v45"><strong>${esc(fmtSec(p.effective_sec))}</strong><span>tempo usado no planejamento (resposta + correção)</span></div><div class="pace-stat-v45"><strong>~${capacity}</strong><span>questões que cabem em ${daily} min pelo ritmo global</span></div></div><div class="pace-warning-v45">Meta mínima de 30: ~${need30} min • 40 questões: ~${need40} min. O plano usa o ritmo de cada matéria quando houver amostra suficiente.</div>`;
    const input=$('#prefDailyMinutes');if(input&&!input.dataset.paceBound){input.addEventListener('input',()=>renderPacePanel(m,idx));input.dataset.paceBound='1';}
  }

  function renderFocus(meta,m,idx){
    const entry=meta.get(m.today)||meta.values().next().value;if(!entry)return;
    const a=entry.allocation,pair=(a.rows||[]).map(r=>r.subject.name).join(' + '),details=(a.rows||[]).map(r=>`${r.subject.name}: ${r.topic.syllabus_code||''} ${r.topic.title} • ${r.quota} questões • ~${fmtSec(r.paceSec)}/q`).join(' • ');
    const warning=a.overBudget?` Para manter o mínimo de ${MIN_DAILY_QUESTIONS}, a previsão é ~${a.estimatedMinutes} min, acima dos ${a.budgetMinutes} min configurados.`:'';
    const html=`<div><strong>Ciclo ${entry.cycle.cycleNumber} • Dia ${entry.cycle.position+1} de ${CYCLE.length}</strong><span>${a.totalQuestions} questões previstas • ~${a.estimatedMinutes} min${warning}</span></div><div class="mentor-cycle-pair">${esc(pair)}</div>`;
    for(const page of ['daily','dashboard']){const id=page==='daily'?'mentorCycleDaily':'mentorCycleDashboard';let host=$('#'+id);if(!host){host=document.createElement('div');host.id=id;host.className='mentor-cycle-strip';const target=page==='daily'?document.querySelector('[data-page-view="daily"] .page-header'):document.querySelector('.welcome-panel');target?.insertAdjacentElement('afterend',host);}if(host)host.innerHTML=html;}
    let rule=$('#focusRuleV45');if(!rule){rule=document.createElement('div');rule.id='focusRuleV45';rule.className='pace-panel-v45';document.querySelector('[data-page-view="daily"] .page-header')?.insertAdjacentElement('afterend',rule);}if(rule)rule.innerHTML=`<strong>Foco e ritmo de hoje</strong><div>${esc(details)}</div>${warning?`<div class="pace-warning-v45">${esc(warning.trim())}</div>`:''}`;
  }

  function injectExportPanel(){
    const mentor=document.querySelector('[data-page-view="mentor"]');if(!mentor||$('#mentorExportPanelV45'))return;
    const panel=document.createElement('section');panel.id='mentorExportPanelV45';panel.className='panel mentor-export-v45';panel.innerHTML=`<div class="panel-heading"><div><small>RELATÓRIO</small><h2>Relatório para análise avançada</h2></div><span class="pill">JSON</span></div><p class="muted">Baixe um retrato do seu estudo sem e-mail, senha ou identificador da conta. Depois você pode enviar o arquivo no ChatGPT para uma análise mais profunda.</p><div class="actions"><button class="primary-button" id="mentorExportReportV45">Baixar relatório da Mentora</button></div>`;
    const report=mentor.querySelector('.mentor-report');report?.insertAdjacentElement('afterend',panel);
    $('#mentorExportReportV45')?.addEventListener('click',()=>exportReport().catch(err=>{console.error(err);alert('Não foi possível gerar o relatório.');}));
  }

  function subjectSummary(m,idx,s){
    const topics=m.topics.filter(t=>t.subject_id===s.id),master=topics.map(t=>idx.masteryByTopic.get(t.id)||{}),evidence=master.reduce((a,x)=>a+Number(x.attempts_count||0),0),correct=master.reduce((a,x)=>a+Number(x.correct_count||0),0);
    const attempts=m.attempts.filter(a=>a.subject_id===s.id),highWrong=attempts.filter(a=>!a.is_correct&&Number(a.confidence)>=5).length,lowCorrect=attempts.filter(a=>a.is_correct&&Number(a.confidence)<=2).length,p=idx.pace.bySubject.get(s.id);
    return{subject:s.name,evidence,accuracy:evidence?Math.round(correct/evidence*100):null,pending_reviews:m.reviews.filter(r=>r.topic_id&&idx.topicById.get(r.topic_id)?.subject_id===s.id).length,high_confidence_errors:highWrong,low_confidence_correct:lowCorrect,pace:p};
  }

  async function exportReport(){
    if(!await context())throw new Error('Sessão indisponível');
    const m=lastModel||await loadModel(),idx=lastIdx||indexes(m),now=new Date().toISOString();
    const report={
      schema:'mentor-ia-study-report-v1',generated_at:now,app_version:VERSION,
      privacy_note:'Relatório sem e-mail, senha ou identificador de usuário.',
      preferences:{daily_minutes:Number(m.prefs.daily_minutes||60),study_days:m.prefs.study_days||[],review_ratio:m.prefs.review_ratio??null,buffer_percent:m.prefs.buffer_percent??null,timezone:m.prefs.timezone||TZ},
      goals:{minimum_daily_questions:MIN_DAILY_QUESTIONS,usual_questions_per_subject:`${BASE_PER_SUBJECT}-${CRITICAL_PER_SUBJECT}`,max_subjects_per_day:MAX_SUBJECTS},
      cycle:{cycle_number:m.cycle.cycle_number,cycle_position:m.cycle.cycle_position,anchor_date:m.cycle.anchor_date,structure:CYCLE},
      pace:{global:{samples:idx.pace.samples,response_median_sec:idx.pace.response_median_sec,response_avg_sec:idx.pace.response_avg_sec,effective_planning_sec:idx.pace.effective_sec},subjects:[...idx.pace.bySubject.values()]},
      subjects:m.subjects.map(s=>subjectSummary(m,idx,s)),
      topics:m.topics.map(t=>{const x=idx.masteryByTopic.get(t.id)||{};return{subject:m.subjects.find(s=>s.id===t.subject_id)?.name||'',code:t.syllabus_code||'',title:t.title,evidence:Number(x.attempts_count||0),correct:Number(x.correct_count||0),accuracy:Number(x.mastery_score||0),sample_confidence:Number(x.confidence_score||0),trend:x.trend||'stable',last_attempt_at:x.last_attempt_at||null,pending_reviews:(idx.reviewsByTopic.get(t.id)||[]).length,available_internal_questions:idx.available.get(t.id)||0};}),
      plan:m.plan.map(p=>{const t=idx.topicById.get(p.topic_id),s=t?m.subjects.find(x=>x.id===t.subject_id):null;return{date:p.scheduled_for,subject:s?.name||'',topic_code:t?.syllabus_code||'',topic:t?.title||'',task_type:p.task_type,target:Number(p.question_target||0),progress:Number(p.progress_count||0),minutes:Number(p.duration_minutes||0),status:p.status,reason:p.source_reason||''};}),
      recent_attempts:m.attempts.slice(0,300).map(a=>{const t=idx.topicById.get(a.topic_id),s=t?m.subjects.find(x=>x.id===t.subject_id):null;return{answered_at:a.answered_at,subject:s?.name||'',topic_code:t?.syllabus_code||'',topic:t?.title||'',correct:!!a.is_correct,confidence:Number(a.confidence||0),response_time_seconds:Number(a.response_time_seconds||0),error_type:a.error_type||null,source_kind:a.source_kind||null};}),
      external_practice:m.external.slice(0,150).map(b=>{const t=idx.topicById.get(b.topic_id),s=t?m.subjects.find(x=>x.id===t.subject_id):null;return{practiced_at:b.practiced_at,subject:s?.name||'',topic_code:t?.syllabus_code||'',topic:t?.title||'',questions:Number(b.total_questions||0),correct:Number(b.correct_count||0),confidence:Number(b.confidence||0),duration_minutes:Number(b.duration_minutes||0),source_kind:b.source_kind||null};}),
      study_sessions:m.sessions.slice(0,150).map(ses=>{const t=idx.topicById.get(ses.topic_id),s=t?m.subjects.find(x=>x.id===t.subject_id):null;return{started_at:ses.started_at,subject:s?.name||'',topic_code:t?.syllabus_code||'',topic:t?.title||'',duration_minutes:Number(ses.duration_minutes||0),questions_answered:Number(ses.questions_answered||0),correct_answers:Number(ses.correct_answers||0)};})
    };
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=`relatorio-mentor-ia-${dateKey()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500);
  }

  async function run({reload=true}={}){
    if(busy)return;busy=true;
    try{
      if(!await context())return;injectStyles();injectExportPanel();
      let m=await loadModel(),idx=indexes(m),dates=studyDates(m.today,m.prefs),cleaned=await cleanupOldPending(m);if(cleaned){m=await loadModel();idx=indexes(m);}
      const {desired,meta}=desiredPlan(m,idx,dates),changed=await reconcile(m,desired);lastModel=m;lastIdx=idx;lastMeta=meta;renderPacePanel(m,idx);renderFocus(meta,m,idx);
      const key=`mentor-v45-${m.today}`;if((cleaned||changed)&&reload&&sessionStorage.getItem(key)!=='1'){sessionStorage.setItem(key,'1');setTimeout(()=>location.reload(),250);}else if(!cleaned&&!changed){sessionStorage.removeItem(key);}
    }catch(error){console.error('Mentor V4.5:',error);}finally{busy=false;}
  }

  window.MentorIntelligence=Object.freeze({version:VERSION,run,forgettingRisk,cycle:CYCLE,exportReport});
})();