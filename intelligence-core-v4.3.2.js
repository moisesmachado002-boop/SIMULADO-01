(() => {
  'use strict';

  const VERSION='4.3.2';
  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN='v3-clean',TZ='America/Bahia',HORIZON=7,QMIN=3,MAX_SUBJECTS=2,TARGET=10;
  const SOURCE_PREFIX='focus_v43_';
  const CYCLE=[
    ['Língua Portuguesa','História do Brasil'],
    ['Geografia do Brasil','Matemática'],
    ['Atualidades','Informática'],
    ['Direito Constitucional','Direitos Humanos'],
    ['Direito Administrativo','Direito Penal'],
    ['Igualdade Racial e de Gênero','Direito Penal Militar']
  ];

  let db=null,user=null,busy=false;
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const fromKey=k=>{const [y,m,d]=String(k).split('-').map(Number);return new Date(Date.UTC(y,m-1,d,15));};
  const addDays=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;};
  const isoWeekday=d=>{const n=d.getUTCDay();return n===0?7:n;};

  function forgettingRisk(st){
    if(!st)return 0;
    const anchor=Date.parse(st.review_anchor_at||st.last_attempt_at||'');
    const interval=Math.max(1,Number(st.review_interval_hours||24));
    let risk=0;
    if(Number.isFinite(anchor)){
      const elapsed=Math.max(0,Date.now()-anchor)/3600000;
      risk=Math.round((1-Math.pow(.5,elapsed/interval))*100);
    }
    if(st.last_is_correct===false&&Number(st.last_confidence||0)>=5)risk=Math.max(risk,95);
    else if(st.last_is_correct===false)risk=Math.max(risk,80);
    else if(st.last_is_correct===true&&Number(st.last_confidence||0)<=2)risk=Math.max(risk,70);
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
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number));
    let count=0,d=addDays(fromKey(anchor),1),end=fromKey(target).getTime();
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
    const [prefsR,subjectsR,topicsR,masteryR,questionsR,statesR,reviewsR,planR]=await Promise.all([
      db.from('study_preferences').select('*').eq('user_id',user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count,trend,last_attempt_at').eq('user_id',user.id),
      db.from('questions').select('id,topic_id,subject_id').not('explanation','is',null).limit(5000),
      db.from('user_question_state').select('question_id,seen_count,last_is_correct,last_confidence,last_attempt_at,next_review_at,review_interval_hours,review_anchor_at').eq('user_id',user.id).limit(5000),
      db.from('reviews').select('id,topic_id,question_id,due_at,status,trigger_reason').eq('user_id',user.id).eq('status','pending').limit(3000),
      db.from('study_plan_items').select('*').eq('user_id',user.id).gte('scheduled_for',today).lte('scheduled_for',end).order('scheduled_for').order('sort_order')
    ]);
    for(const r of [prefsR,subjectsR,topicsR,masteryR,questionsR,statesR,reviewsR,planR])if(r.error)throw r.error;
    return{today,end,prefs:prefsR.data||{daily_minutes:60,study_days:[1,2,3,4,5,6]},subjects:subjectsR.data||[],topics:topicsR.data||[],mastery:masteryR.data||[],questions:questionsR.data||[],states:statesR.data||[],reviews:reviewsR.data||[],plan:planR.data||[],cycle:await ensureCycle(today)};
  }

  function indexes(m){
    const subjectByName=new Map(m.subjects.map(s=>[s.name,s])),topicById=new Map(m.topics.map(t=>[t.id,t]));
    const masteryByTopic=new Map(m.mastery.map(x=>[x.topic_id,x])),qById=new Map(m.questions.map(q=>[q.id,q])),stateByQ=new Map(m.states.map(s=>[s.question_id,s]));
    const available=new Map(),unseen=new Map(),statesByTopic=new Map(),reviewsByTopic=new Map();
    for(const q of m.questions){if(!q.topic_id)continue;available.set(q.topic_id,(available.get(q.topic_id)||0)+1);const st=stateByQ.get(q.id);if(!st||!Number(st.seen_count||0))unseen.set(q.topic_id,(unseen.get(q.topic_id)||0)+1);if(st){if(!statesByTopic.has(q.topic_id))statesByTopic.set(q.topic_id,[]);statesByTopic.get(q.topic_id).push(st);}}
    for(const r of m.reviews){const topicId=r.topic_id||qById.get(r.question_id)?.topic_id;if(!topicId)continue;if(!reviewsByTopic.has(topicId))reviewsByTopic.set(topicId,[]);reviewsByTopic.get(topicId).push(r);}
    const dueReviews=(topicId,day)=>(reviewsByTopic.get(topicId)||[]).filter(r=>dateKey(new Date(r.due_at))<=day).sort((a,b)=>forgettingRisk(stateByQ.get(b.question_id))-forgettingRisk(stateByQ.get(a.question_id))||Date.parse(a.due_at)-Date.parse(b.due_at));
    const topicScore=(topic,day)=>{const master=masteryByTopic.get(topic.id)||{},evidence=Number(master.attempts_count||0),accuracy=Number(master.mastery_score||0),due=dueReviews(topic.id,day),risk=(statesByTopic.get(topic.id)||[]).reduce((mx,st)=>Math.max(mx,forgettingRisk(st)),0),weak=evidence>=TARGET?Math.max(0,80-accuracy)*2:Math.max(0,TARGET-evidence)*7;return due.length*55+risk+weak+(master.trend==='down'?25:0)+Math.min(15,unseen.get(topic.id)||0);};
    const focusTopic=(subjectId,day)=>m.topics.filter(t=>t.subject_id===subjectId).sort((a,b)=>topicScore(b,day)-topicScore(a,day)||Number(a.position||0)-Number(b.position||0))[0]||null;
    return{subjectByName,topicById,masteryByTopic,stateByQ,available,unseen,reviewsByTopic,dueReviews,topicScore,focusTopic};
  }

  async function cleanupLegacyPending(m){
    const old=m.plan.filter(p=>p.status==='pending'&&((p.task_type==='review'&&String(p.source_reason||'').startsWith('revisao_'))||(p.task_type==='questions'&&(p.source_reason==='cap_fill_qconcursos'||String(p.source_reason||'').startsWith('cycle_v4_')||String(p.source_reason||'').startsWith('cycle_v41_')||String(p.source_reason||'').startsWith('cycle_v42_')))));
    if(!old.length)return false;const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',old.map(x=>x.id));if(del.error)throw del.error;return true;
  }

  function desiredPlan(m,idx,dates){
    const desired=[],meta=new Map(),daily=Math.max(20,Number(m.prefs.daily_minutes||60)),perSubject=Math.max(10,Math.floor(daily/MAX_SUBJECTS));
    for(const day of dates){
      const cycle=cycleAt(m.cycle,day,m.prefs),subjects=cycle.pair.map(name=>idx.subjectByName.get(name)).filter(Boolean).slice(0,MAX_SUBJECTS);meta.set(day,{cycle,subjects});
      subjects.forEach((subject,slot)=>{
        const sameSubject=p=>idx.topicById.get(p.topic_id)?.subject_id===subject.id;
        const locked=m.plan.find(p=>p.scheduled_for===day&&String(p.source_reason||'').startsWith(SOURCE_PREFIX)&&['pending','in_progress','completed'].includes(p.status)&&sameSubject(p));
        const topic=locked?idx.topicById.get(locked.topic_id):idx.focusTopic(subject.id,day);if(!topic)return;
        const due=idx.dueReviews(topic.id,day),completedReview=m.plan.some(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.task_type==='review'&&p.status==='completed'&&String(p.source_reason||'').startsWith(SOURCE_PREFIX)),completedQuestions=m.plan.some(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.task_type==='questions'&&p.status==='completed'&&String(p.source_reason||'').startsWith(SOURCE_PREFIX));
        const existingReview=m.plan.find(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.task_type==='review'&&['pending','in_progress'].includes(p.status)&&String(p.source_reason||'').startsWith(SOURCE_PREFIX));
        const reviewTarget=completedReview?0:existingReview?Math.max(1,Number(existingReview.question_target||1)):Math.min(3,due.length);
        const reviewMinutes=reviewTarget*QMIN,questionMinutes=Math.max(QMIN,perSubject-reviewMinutes),questionTarget=Math.max(4,Math.floor(questionMinutes/QMIN));
        if(reviewTarget){const first=due[0]||{question_id:existingReview?.question_id},risk=forgettingRisk(idx.stateByQ.get(first.question_id));desired.push({key:`${day}|review|${topic.id}`,scheduled_for:day,topic_id:topic.id,question_id:first.question_id||existingReview?.question_id,task_type:'review',question_target:reviewTarget,duration_minutes:reviewMinutes,priority:risk>=95?100:risk>=85?96:90,status:'pending',source_reason:`${SOURCE_PREFIX}review`,plan_version:PLAN,sort_order:slot*100+10,progress_count:0});}
        if(!completedQuestions){const existingQuestions=m.plan.find(p=>p.scheduled_for===day&&p.topic_id===topic.id&&p.task_type==='questions'&&['pending','in_progress'].includes(p.status)&&String(p.source_reason||'').startsWith(SOURCE_PREFIX)),target=existingQuestions?Math.max(1,Number(existingQuestions.question_target||questionTarget)):questionTarget,useBank=(idx.unseen.get(topic.id)||0)>=target;desired.push({key:`${day}|questions|${topic.id}`,scheduled_for:day,topic_id:topic.id,question_id:null,task_type:'questions',question_target:target,duration_minutes:target*QMIN,priority:75,status:'pending',source_reason:useBank?`${SOURCE_PREFIX}bank`:`${SOURCE_PREFIX}qconcursos`,plan_version:PLAN,sort_order:slot*100+20,progress_count:0});}
      });
    }
    return{desired,meta};
  }

  async function reconcileGenerated(m,desired){
    const existing=m.plan.filter(p=>String(p.source_reason||'').startsWith(SOURCE_PREFIX)&&['pending','in_progress'].includes(p.status)),desiredMap=new Map(desired.map(d=>[d.key,d])),existingByKey=new Map();
    for(const p of existing){const key=`${p.scheduled_for}|${p.task_type}|${p.topic_id}`;if(!existingByKey.has(key))existingByKey.set(key,[]);existingByKey.get(key).push(p);}let changed=false;
    for(const [key,rows] of existingByKey){const want=desiredMap.get(key);if(!want){const removable=rows.filter(r=>r.status==='pending');if(removable.length){const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',removable.map(r=>r.id));if(del.error)throw del.error;changed=true;}continue;}const keep=rows[0],extras=rows.slice(1).filter(r=>r.status==='pending');if(extras.length){const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',extras.map(r=>r.id));if(del.error)throw del.error;changed=true;}if(keep.status==='pending'){const patch={question_id:want.question_id,question_target:want.question_target,duration_minutes:want.duration_minutes,priority:want.priority,source_reason:want.source_reason,plan_version:PLAN,sort_order:want.sort_order};if(Object.entries(patch).some(([k,v])=>String(keep[k]??'')!==String(v??''))){const u=await db.from('study_plan_items').update(patch).eq('id',keep.id).eq('user_id',user.id);if(u.error)throw u.error;changed=true;}}desiredMap.delete(key);}
    for(const want of desiredMap.values()){const row={...want,user_id:user.id};delete row.key;const ins=await db.from('study_plan_items').insert(row);if(ins.error)throw ins.error;changed=true;}return changed;
  }

  function injectStyles(){if($('#mentorFocusV432Css'))return;const style=document.createElement('style');style.id='mentorFocusV432Css';style.textContent=`.mentor-cycle-strip{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px;margin:12px 0 18px;border-radius:14px;background:#111;color:#fff;border-left:5px solid #f2c500;box-shadow:0 8px 24px rgba(0,0,0,.08)}.mentor-cycle-strip strong{display:block;font-size:14px}.mentor-cycle-strip span{font-size:12px;opacity:.78}.mentor-cycle-pair{font-weight:800;text-align:right}.focus-rule-v43{margin:10px 0 16px;padding:12px 14px;border-radius:12px;background:#fff7d6;border:1px solid #e6c959;font-size:13px;line-height:1.4}`;document.head.appendChild(style);}
  function renderFocus(meta,m,idx){const entry=meta.get(m.today)||meta.values().next().value;if(!entry)return;const focuses=(entry.subjects||[]).map(s=>{const locked=m.plan.find(p=>p.scheduled_for===m.today&&String(p.source_reason||'').startsWith(SOURCE_PREFIX)&&['pending','in_progress','completed'].includes(p.status)&&idx.topicById.get(p.topic_id)?.subject_id===s.id);return{s,t:locked?idx.topicById.get(locked.topic_id):idx.focusTopic(s.id,m.today)};});const pair=focuses.map(x=>x.s.name).join(' + '),detail=focuses.map(x=>`${x.s.name}: ${x.t?.syllabus_code||''} ${x.t?.title||''}`).join(' • '),html=`<div><strong>Ciclo ${entry.cycle.cycleNumber} • Dia ${entry.cycle.position+1} de ${CYCLE.length}</strong><span>1 assunto de foco por matéria</span></div><div class="mentor-cycle-pair">${esc(pair)}</div>`;for(const page of ['daily','dashboard']){const id=page==='daily'?'mentorCycleDaily':'mentorCycleDashboard';let host=$('#'+id);if(!host){host=document.createElement('div');host.id=id;host.className='mentor-cycle-strip';const target=page==='daily'?document.querySelector('[data-page-view="daily"] .page-header'):document.querySelector('.welcome-panel');target?.insertAdjacentElement('afterend',host);}if(host)host.innerHTML=html;}let rule=$('#focusRuleV43');if(!rule){rule=document.createElement('div');rule.id='focusRuleV43';rule.className='focus-rule-v43';document.querySelector('[data-page-view="daily"] .page-header')?.insertAdjacentElement('afterend',rule);}if(rule)rule.textContent=`Foco de hoje: ${detail}. O foco fica travado durante a sessão; revisões do mesmo assunto são agrupadas.`;}

  async function run({reload=true}={}){if(busy)return;busy=true;try{const ctx=await context();if(!ctx)return;injectStyles();let m=await loadModel(),idx=indexes(m),dates=studyDates(m.today,m.prefs);const cleaned=await cleanupLegacyPending(m);if(cleaned)m=await loadModel();idx=indexes(m);const {desired,meta}=desiredPlan(m,idx,dates),changed=await reconcileGenerated(m,desired);renderFocus(meta,m,idx);const key=`mentor-v432-${m.today}`;if((cleaned||changed)&&reload&&sessionStorage.getItem(key)!=='1'){sessionStorage.setItem(key,'1');setTimeout(()=>location.reload(),250);}else if(!cleaned&&!changed){sessionStorage.removeItem(key);}}catch(error){console.error('Mentor V4.3.2:',error);}finally{busy=false;}}

  window.MentorIntelligence=Object.freeze({version:VERSION,run,forgettingRisk,cycle:CYCLE});
})();