(() => {
  'use strict';

  const VERSION='4.3.0';
  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN='v3-clean';
  const TZ='America/Bahia';
  const HORIZON=7;
  const QUESTION_MINUTES=3;
  const REVIEW_BLOCK_MINUTES=6;
  const MAX_SUBJECTS=2;
  const TARGET_EVIDENCE=10;
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
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
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
    for(let i=0;i<HORIZON;i++){
      const d=addDays(fromKey(today),i);
      if(allowed.has(isoWeekday(d)))out.push(dateKey(d));
    }
    return out;
  }

  function countStudySteps(anchor,target,prefs){
    if(target<=anchor)return 0;
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number));
    let count=0,d=addDays(fromKey(anchor),1),end=fromKey(target).getTime();
    while(d.getTime()<=end){if(allowed.has(isoWeekday(d)))count++;d=addDays(d,1);}
    return count;
  }

  function cycleAt(cs,day,prefs){
    const base=clamp(Number(cs.cycle_position||0),0,CYCLE.length-1);
    const raw=base+countStudySteps(cs.anchor_date,day,prefs);
    return {position:raw%CYCLE.length,cycleNumber:Number(cs.cycle_number||1)+Math.floor(raw/CYCLE.length),pair:CYCLE[raw%CYCLE.length]};
  }

  async function ensureCycle(today){
    const r=await db.from('study_cycle_state').select('*').eq('user_id',user.id).maybeSingle();
    if(r.error)throw r.error;
    if(r.data)return r.data;
    const c=await db.from('study_cycle_state').insert({user_id:user.id,cycle_position:0,cycle_number:1,anchor_date:today}).select('*').single();
    if(c.error)throw c.error;
    return c.data;
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
    return {
      today,end,
      prefs:prefsR.data||{daily_minutes:60,study_days:[1,2,3,4,5,6]},
      subjects:subjectsR.data||[],topics:topicsR.data||[],mastery:masteryR.data||[],questions:questionsR.data||[],states:statesR.data||[],reviews:reviewsR.data||[],plan:planR.data||[],cycle:await ensureCycle(today)
    };
  }

  function indexes(m){
    const subjectByName=new Map(m.subjects.map(s=>[s.name,s]));
    const topicById=new Map(m.topics.map(t=>[t.id,t]));
    const masteryByTopic=new Map(m.mastery.map(x=>[x.topic_id,x]));
    const qById=new Map(m.questions.map(q=>[q.id,q]));
    const stateByQ=new Map(m.states.map(s=>[s.question_id,s]));
    const available=new Map(),unseen=new Map(),statesByTopic=new Map(),reviewsByTopic=new Map();

    for(const q of m.questions){
      if(!q.topic_id)continue;
      available.set(q.topic_id,(available.get(q.topic_id)||0)+1);
      const st=stateByQ.get(q.id);
      if(!st||!Number(st.seen_count||0))unseen.set(q.topic_id,(unseen.get(q.topic_id)||0)+1);
      if(st){if(!statesByTopic.has(q.topic_id))statesByTopic.set(q.topic_id,[]);statesByTopic.get(q.topic_id).push(st);}
    }
    for(const r of m.reviews){
      const q=qById.get(r.question_id),topicId=r.topic_id||q?.topic_id;
      if(!topicId)continue;
      if(!reviewsByTopic.has(topicId))reviewsByTopic.set(topicId,[]);
      reviewsByTopic.get(topicId).push(r);
    }

    function topicScore(topic,day){
      const master=masteryByTopic.get(topic.id)||{};
      const evidence=Number(master.attempts_count||0),accuracy=Number(master.mastery_score||0);
      const due=(reviewsByTopic.get(topic.id)||[]).filter(r=>dateKey(new Date(r.due_at))<=day);
      const maxRisk=(statesByTopic.get(topic.id)||[]).reduce((mx,st)=>Math.max(mx,forgettingRisk(st)),0);
      const weak=evidence>=TARGET_EVIDENCE?Math.max(0,80-accuracy)*2:Math.max(0,TARGET_EVIDENCE-evidence)*7;
      const trendPenalty=master.trend==='down'?25:0;
      const unseenBonus=Math.min(15,unseen.get(topic.id)||0);
      return due.length*55+maxRisk+weak+trendPenalty+unseenBonus;
    }

    function focusTopic(subjectId,day){
      return m.topics
        .filter(t=>t.subject_id===subjectId)
        .sort((a,b)=>topicScore(b,day)-topicScore(a,day)||Number(a.position||0)-Number(b.position||0))[0]||null;
    }

    function bestDueReview(topicId,day){
      const rows=(reviewsByTopic.get(topicId)||[]).filter(r=>dateKey(new Date(r.due_at))<=day);
      return rows.sort((a,b)=>{
        const ra=forgettingRisk(stateByQ.get(a.question_id)),rb=forgettingRisk(stateByQ.get(b.question_id));
        return rb-ra||Date.parse(a.due_at)-Date.parse(b.due_at);
      })[0]||null;
    }

    return {subjectByName,topicById,masteryByTopic,qById,stateByQ,available,unseen,reviewsByTopic,topicScore,focusTopic,bestDueReview};
  }

  async function cleanupLegacyPending(m){
    const old=m.plan.filter(p=>p.status==='pending'&&(
      (p.task_type==='review'&&String(p.source_reason||'').startsWith('revisao_'))||
      (p.task_type==='questions'&&(
        p.source_reason==='cap_fill_qconcursos'||
        String(p.source_reason||'').startsWith('cycle_v4_')||
        String(p.source_reason||'').startsWith('cycle_v41_')||
        String(p.source_reason||'').startsWith('cycle_v42_')
      ))
    ));
    if(!old.length)return false;
    const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',old.map(x=>x.id));
    if(del.error)throw del.error;
    return true;
  }

  function desiredPlan(m,idx,dates){
    const desired=[];
    const daily=Math.max(20,Number(m.prefs.daily_minutes||60));
    const perSubject=Math.max(10,Math.floor(daily/MAX_SUBJECTS));
    const meta=new Map();

    for(const day of dates){
      const cycle=cycleAt(m.cycle,day,m.prefs);
      const subjects=cycle.pair.map(name=>idx.subjectByName.get(name)).filter(Boolean).slice(0,MAX_SUBJECTS);
      meta.set(day,{cycle,subjects});

      subjects.forEach((subject,slot)=>{
        const topic=idx.focusTopic(subject.id,day);
        if(!topic)return;
        const review=idx.bestDueReview(topic.id,day);
        const hasReview=!!review;
        const reviewMinutes=hasReview?Math.min(REVIEW_BLOCK_MINUTES,Math.max(4,perSubject-QUESTION_MINUTES*4)):0;
        const questionMinutes=Math.max(QUESTION_MINUTES,perSubject-reviewMinutes);
        const questionTarget=Math.max(4,Math.floor(questionMinutes/QUESTION_MINUTES));

        if(hasReview){
          const risk=forgettingRisk(idx.stateByQ.get(review.question_id));
          desired.push({
            key:`${day}|review|${topic.id}`,
            scheduled_for:day,topic_id:topic.id,question_id:review.question_id,task_type:'review',question_target:1,
            duration_minutes:reviewMinutes,priority:risk>=95?100:risk>=85?96:90,status:'pending',
            source_reason:`${SOURCE_PREFIX}review`,plan_version:PLAN,sort_order:slot*100+10,progress_count:0
          });
        }

        const unseen=idx.unseen.get(topic.id)||0;
        const useBank=unseen>=questionTarget;
        desired.push({
          key:`${day}|questions|${topic.id}`,
          scheduled_for:day,topic_id:topic.id,question_id:null,task_type:'questions',question_target:questionTarget,
          duration_minutes:questionTarget*QUESTION_MINUTES,priority:75,status:'pending',
          source_reason:useBank?`${SOURCE_PREFIX}bank`:`${SOURCE_PREFIX}qconcursos`,plan_version:PLAN,sort_order:slot*100+20,progress_count:0
        });
      });
    }
    return {desired,meta};
  }

  async function reconcileGenerated(m,desired){
    const existing=m.plan.filter(p=>String(p.source_reason||'').startsWith(SOURCE_PREFIX)&&['pending','in_progress'].includes(p.status));
    const desiredMap=new Map(desired.map(d=>[d.key,d]));
    const existingByKey=new Map();
    for(const p of existing){
      const key=`${p.scheduled_for}|${p.task_type}|${p.topic_id}`;
      if(!existingByKey.has(key))existingByKey.set(key,[]);
      existingByKey.get(key).push(p);
    }
    let changed=false;

    for(const [key,rows] of existingByKey){
      const want=desiredMap.get(key);
      if(!want){
        const removable=rows.filter(r=>r.status==='pending');
        if(removable.length){const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',removable.map(r=>r.id));if(del.error)throw del.error;changed=true;}
        continue;
      }
      const keep=rows[0];
      const extras=rows.slice(1).filter(r=>r.status==='pending');
      if(extras.length){const del=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',extras.map(r=>r.id));if(del.error)throw del.error;changed=true;}
      if(keep.status==='pending'){
        const patch={question_id:want.question_id,question_target:want.question_target,duration_minutes:want.duration_minutes,priority:want.priority,source_reason:want.source_reason,plan_version:PLAN,sort_order:want.sort_order};
        const differs=Object.entries(patch).some(([k,v])=>String(keep[k]??'')!==String(v??''));
        if(differs){const u=await db.from('study_plan_items').update(patch).eq('id',keep.id).eq('user_id',user.id);if(u.error)throw u.error;changed=true;}
      }
      desiredMap.delete(key);
    }

    for(const want of desiredMap.values()){
      const row={...want,user_id:user.id};delete row.key;
      const ins=await db.from('study_plan_items').insert(row);
      if(ins.error)throw ins.error;
      changed=true;
    }
    return changed;
  }

  function injectStyles(){
    if($('#mentorFocusV43Css'))return;
    const style=document.createElement('style');style.id='mentorFocusV43Css';style.textContent=`
      .mentor-cycle-strip{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px;margin:12px 0 18px;border-radius:14px;background:#111;color:#fff;border-left:5px solid #f2c500;box-shadow:0 8px 24px rgba(0,0,0,.08)}
      .mentor-cycle-strip strong{display:block;font-size:14px}.mentor-cycle-strip span{font-size:12px;opacity:.78}.mentor-cycle-pair{font-weight:800;text-align:right}
      .focus-rule-v43{margin:10px 0 16px;padding:12px 14px;border-radius:12px;background:#fff7d6;border:1px solid #e6c959;font-size:13px;line-height:1.4}
    `;document.head.appendChild(style);
  }

  function renderFocus(meta,m,idx){
    const today=m.today,entry=meta.get(today)||meta.values().next().value;if(!entry)return;
    const subjects=entry.subjects||[];
    const focuses=subjects.map(s=>({s,t:idx.focusTopic(s.id,today)}));
    const pair=focuses.map(x=>x.s.name).join(' + ');
    const detail=focuses.map(x=>`${x.s.name}: ${x.t?.syllabus_code||''} ${x.t?.title||''}`).join(' • ');
    const html=`<div><strong>Ciclo ${entry.cycle.cycleNumber} • Dia ${entry.cycle.position+1} de ${CYCLE.length}</strong><span>1 assunto de foco por matéria</span></div><div class="mentor-cycle-pair">${esc(pair)}</div>`;
    for(const page of ['daily','dashboard']){
      const id=page==='daily'?'mentorCycleDaily':'mentorCycleDashboard';let host=$('#'+id);
      if(!host){host=document.createElement('div');host.id=id;host.className='mentor-cycle-strip';const target=page==='daily'?document.querySelector('[data-page-view="daily"] .page-header'):document.querySelector('.welcome-panel');target?.insertAdjacentElement('afterend',host);}if(host)host.innerHTML=html;
    }
    let rule=$('#focusRuleV43');
    if(!rule){rule=document.createElement('div');rule.id='focusRuleV43';rule.className='focus-rule-v43';document.querySelector('[data-page-view="daily"] .page-header')?.insertAdjacentElement('afterend',rule);}
    if(rule)rule.textContent=`Foco de hoje: ${detail}. As outras revisões ficam na fila para a próxima passagem da matéria no ciclo.`;
  }

  async function run({reload=true}={}){
    if(busy)return;busy=true;
    try{
      const ctx=await context();if(!ctx)return;
      injectStyles();
      let m=await loadModel(),idx=indexes(m),dates=studyDates(m.today,m.prefs);
      const cleaned=await cleanupLegacyPending(m);
      if(cleaned)m=await loadModel();
      idx=indexes(m);
      const {desired,meta}=desiredPlan(m,idx,dates);
      const changed=await reconcileGenerated(m,desired);
      renderFocus(meta,m,idx);
      const key=`mentor-v43-${m.today}`;
      if((cleaned||changed)&&reload&&sessionStorage.getItem(key)!=='1'){
        sessionStorage.setItem(key,'1');setTimeout(()=>location.reload(),250);
      }else if(!cleaned&&!changed){sessionStorage.removeItem(key);}
    }catch(error){console.error('Mentor V4.3:',error);}finally{busy=false;}
  }

  window.MentorIntelligence=Object.freeze({version:VERSION,run,forgettingRisk,cycle:CYCLE});
})();