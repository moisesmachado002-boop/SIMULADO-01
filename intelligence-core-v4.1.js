(() => {
  'use strict';

  const VERSION='4.1.0';
  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN='v3-clean',TZ='America/Bahia',DAYS=7,QMIN=3,RMIN=4,TARGET=10,MAX_SUBJECTS=2;
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
  const dk=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const fromKey=k=>{const [y,m,d]=String(k).split('-').map(Number);return new Date(Date.UTC(y,m-1,d,15));};
  const add=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;};
  const weekday=d=>{const n=d.getUTCDay();return n===0?7:n;};
  const minutes=p=>Number(p.duration_minutes||0)||(p.task_type==='review'?RMIN:Math.max(QMIN,Number(p.question_target||1)*QMIN));

  function risk(st){
    if(!st)return 0;
    const anchor=Date.parse(st.review_anchor_at||st.last_attempt_at||'');
    const interval=Math.max(1,Number(st.review_interval_hours||24));
    let r=0;
    if(Number.isFinite(anchor)){
      const elapsed=Math.max(0,Date.now()-anchor)/3600000;
      r=Math.round((1-Math.pow(.5,elapsed/interval))*100);
    }
    if(st.last_is_correct===false&&Number(st.last_confidence||0)>=5)r=Math.max(r,95);
    else if(st.last_is_correct===false)r=Math.max(r,80);
    else if(st.last_is_correct===true&&Number(st.last_confidence||0)<=2)r=Math.max(r,70);
    if(st.next_review_at&&Date.parse(st.next_review_at)<=Date.now())r=Math.max(r,90);
    return clamp(r,0,100);
  }

  async function ctx(){
    if(!window.supabase?.createClient)return null;
    if(!db)db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await db.auth.getSession();
    user=session?.user||null;
    return user?{session}:null;
  }

  function studyDates(today,prefs){
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number)),out=[];
    for(let i=0;i<DAYS;i++){const d=add(fromKey(today),i);if(allowed.has(weekday(d)))out.push(dk(d));}
    return out;
  }

  function steps(anchor,target,prefs){
    if(target<=anchor)return 0;
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number));
    let n=0,d=add(fromKey(anchor),1),end=fromKey(target).getTime();
    while(d.getTime()<=end){if(allowed.has(weekday(d)))n++;d=add(d,1);}return n;
  }

  function cycleAt(cs,day,prefs){
    const base=clamp(Number(cs.cycle_position||0),0,5),raw=base+steps(cs.anchor_date,day,prefs);
    return{position:raw%6,cycleNumber:Number(cs.cycle_number||1)+Math.floor(raw/6),pair:CYCLE[raw%6]};
  }

  async function cycleState(today){
    const r=await db.from('study_cycle_state').select('*').eq('user_id',user.id).maybeSingle();
    if(r.error)throw r.error;if(r.data)return r.data;
    const c=await db.from('study_cycle_state').insert({user_id:user.id,cycle_position:0,cycle_number:1,anchor_date:today}).select('*').single();
    if(c.error)throw c.error;return c.data;
  }

  async function load(){
    const today=dk(),end=dk(add(fromKey(today),DAYS-1));
    const [pr,sr,tr,mr,qr,stR,rr,pl,ar,er]=await Promise.all([
      db.from('study_preferences').select('*').eq('user_id',user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count').eq('user_id',user.id),
      db.from('questions').select('id,topic_id,subject_id').not('explanation','is',null).limit(5000),
      db.from('user_question_state').select('question_id,seen_count,last_is_correct,last_confidence,last_attempt_at,next_review_at,review_interval_hours,review_anchor_at').eq('user_id',user.id).limit(5000),
      db.from('reviews').select('id,topic_id,question_id,due_at,status').eq('user_id',user.id).eq('status','pending').limit(2000),
      db.from('study_plan_items').select('*').eq('user_id',user.id).gte('scheduled_for',today).lte('scheduled_for',end).order('scheduled_for').order('sort_order'),
      db.from('question_attempts').select('question_id,topic_id,answered_at').eq('user_id',user.id).gte('answered_at',`${today}T00:00:00-03:00`),
      db.from('external_practice_batches').select('topic_id,total_questions,practiced_at').eq('user_id',user.id).gte('practiced_at',`${today}T00:00:00-03:00`)
    ]);
    for(const r of [pr,sr,tr,mr,qr,stR,rr,pl,ar,er])if(r.error)throw r.error;
    return{today,end,prefs:pr.data||{daily_minutes:60,study_days:[1,2,3,4,5,6]},subjects:sr.data||[],topics:tr.data||[],mastery:mr.data||[],questions:qr.data||[],states:stR.data||[],reviews:rr.data||[],plan:pl.data||[],attempts:ar.data||[],external:er.data||[],cycle:await cycleState(today)};
  }

  function indexes(m){
    const subjectByName=new Map(m.subjects.map(s=>[s.name,s])),topicById=new Map(m.topics.map(t=>[t.id,t])),mastery=new Map(m.mastery.map(x=>[x.topic_id,x])),qById=new Map(m.questions.map(q=>[q.id,q])),stByQ=new Map(m.states.map(s=>[s.question_id,s])),unseen=new Map(),available=new Map(),statesByTopic=new Map(),due=new Map();
    for(const q of m.questions){if(!q.topic_id)continue;available.set(q.topic_id,(available.get(q.topic_id)||0)+1);const st=stByQ.get(q.id);if(!st||!Number(st.seen_count||0))unseen.set(q.topic_id,(unseen.get(q.topic_id)||0)+1);if(st){if(!statesByTopic.has(q.topic_id))statesByTopic.set(q.topic_id,[]);statesByTopic.get(q.topic_id).push(st);}}
    for(const r of m.reviews)if(r.topic_id&&Date.parse(r.due_at)<=Date.now())due.set(r.topic_id,(due.get(r.topic_id)||0)+1);
    const score=t=>{const x=mastery.get(t.id)||{},a=Number(x.attempts_count||0),acc=Number(x.mastery_score||0),need=Math.max(0,TARGET-a),r=(statesByTopic.get(t.id)||[]).reduce((mx,s)=>Math.max(mx,risk(s)),0);return(due.get(t.id)||0)*30+r+need*8+(a?100-acc:35)+Math.min(20,unseen.get(t.id)||0);};
    const best=sid=>m.topics.filter(t=>t.subject_id===sid&&(available.get(t.id)||0)>0).sort((a,b)=>score(b)-score(a)||Number(a.position||0)-Number(b.position||0))[0]||null;
    return{subjectByName,topicById,mastery,qById,stByQ,unseen,available,score,best};
  }

  function buildPairs(m,idx,dates){
    const pairs=new Map(),meta=new Map();
    for(const day of dates){const c=cycleAt(m.cycle,day,m.prefs),ids=c.pair.map(n=>idx.subjectByName.get(n)?.id).filter(Boolean).slice(0,2);pairs.set(day,new Set(ids));meta.set(day,c);}return{pairs,meta};
  }

  function targetReview(r,m,idx,pairs,dates){
    const q=idx.qById.get(r.question_id),t=idx.topicById.get(r.topic_id||q?.topic_id),sid=t?.subject_id||q?.subject_id;if(!sid)return null;
    const rr=risk(idx.stByQ.get(r.question_id));let due=dk(new Date(r.due_at));if(due<m.today)due=m.today;
    const regular=dates.find(d=>d>=due&&pairs.get(d)?.has(sid));if(regular&&rr<95)return{day:regular,sid,risk:rr};
    if(rr>=95||dk(new Date(r.due_at))<=m.today){const d=dates[0];return d?{day:d,sid,risk:rr,interrupt:true}:null;}
    const later=dates.find(d=>pairs.get(d)?.has(sid));return later?{day:later,sid,risk:rr}:null;
  }

  async function planCycle(m){
    const idx=indexes(m),dates=studyDates(m.today,m.prefs);if(!dates.length)return{changed:false,dates,idx,pairs:new Map(),meta:new Map(),model:m};
    const {pairs,meta}=buildPairs(m,idx,dates);let changed=false;

    const placements=[];
    for(const r of m.reviews){const p=targetReview(r,m,idx,pairs,dates);if(!p)continue;if(p.interrupt&&!pairs.get(p.day).has(p.sid)){const set=pairs.get(p.day),keep=[...set][0];set.clear();if(keep)set.add(keep);set.add(p.sid);}placements.push({r,...p});}

    for(const p of placements){
      const existing=m.plan.find(x=>x.task_type==='review'&&x.question_id===p.r.question_id&&x.status!=='skipped'),priority=p.risk>=95?100:p.risk>=85?96:p.risk>=65?90:82,source=p.risk>=85?'revisao_preditiva_urgente':p.risk>=65?'revisao_preditiva':'revisao_programada';
      if(existing){if(existing.scheduled_for!==p.day||Number(existing.priority||0)<priority||existing.source_reason!==source||existing.plan_version!==PLAN){const u=await db.from('study_plan_items').update({scheduled_for:p.day,priority,source_reason:source,plan_version:PLAN}).eq('id',existing.id).eq('user_id',user.id);if(u.error)throw u.error;changed=true;}}
      else{const i=await db.from('study_plan_items').insert({user_id:user.id,topic_id:p.r.topic_id,question_id:p.r.question_id,scheduled_for:p.day,task_type:'review',question_target:1,duration_minutes:RMIN,priority,status:'pending',source_reason:source,plan_version:PLAN,sort_order:10,progress_count:0});if(i.error)throw i.error;changed=true;}
    }

    const legacy=m.plan.filter(p=>p.status==='pending'&&p.task_type==='questions'&&p.source_reason==='cap_fill_qconcursos');
    if(legacy.length){const d=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',legacy.map(x=>x.id));if(d.error)throw d.error;changed=true;}

    const cyclePending=m.plan.filter(p=>p.status==='pending'&&p.task_type==='questions'&&String(p.source_reason||'').startsWith('cycle_v4_'));
    const incompatible=cyclePending.filter(p=>{const sid=idx.topicById.get(p.topic_id)?.subject_id;return !pairs.get(p.scheduled_for)?.has(sid);});
    if(incompatible.length){const d=await db.from('study_plan_items').delete().eq('user_id',user.id).in('id',incompatible.map(x=>x.id));if(d.error)throw d.error;changed=true;}

    const fresh=await db.from('study_plan_items').select('*').eq('user_id',user.id).gte('scheduled_for',m.today).lte('scheduled_for',m.end).neq('status','skipped').order('scheduled_for').order('sort_order');if(fresh.error)throw fresh.error;
    const current=fresh.data||[],hard=Math.max(20,Number(m.prefs.daily_minutes||60));

    for(const day of dates){
      const dayItems=current.filter(p=>p.scheduled_for===day&&['pending','in_progress','completed'].includes(p.status));
      const fixedSubjects=[...new Set(dayItems.filter(p=>p.status!=='pending'||!String(p.source_reason||'').startsWith('cycle_v4_')).map(p=>idx.topicById.get(p.topic_id)?.subject_id).filter(Boolean))];
      if(fixedSubjects.length){const set=pairs.get(day);for(const sid of fixedSubjects.slice(0,2))set.add(sid);while(set.size>2){const removable=[...set].find(s=>!fixedSubjects.includes(s));if(!removable)break;set.delete(removable);}}
      let remaining=Math.max(0,hard-dayItems.reduce((s,p)=>s+minutes(p),0));if(remaining<QMIN)continue;
      const subjects=[...pairs.get(day)].slice(0,MAX_SUBJECTS),candidates=subjects.map(sid=>({sid,topic:idx.best(sid)})).filter(x=>x.topic);
      for(let n=0;n<candidates.length&&remaining>=QMIN;n++){
        const {sid,topic}=candidates[n];if(dayItems.some(p=>p.task_type==='questions'&&idx.topicById.get(p.topic_id)?.subject_id===sid))continue;
        const share=Math.max(QMIN,Math.floor(remaining/(candidates.length-n)));let target=Math.min(10,Math.max(1,Math.floor(share/QMIN))),need=Math.max(0,TARGET-Number(idx.mastery.get(topic.id)?.attempts_count||0));if(need)target=Math.min(target,need);
        let bank=Math.min(target,idx.unseen.get(topic.id)||0);
        if(bank>0){bank=Math.min(bank,Math.floor(remaining/QMIN));if(bank>0){const i=await db.from('study_plan_items').insert({user_id:user.id,topic_id:topic.id,scheduled_for:day,task_type:'questions',question_target:bank,duration_minutes:bank*QMIN,priority:72,status:'pending',source_reason:'cycle_v4_bank',plan_version:PLAN,sort_order:500+n*20,progress_count:0});if(i.error)throw i.error;remaining-=bank*QMIN;target-=bank;changed=true;}}
        if(target>0&&remaining>=QMIN){const qn=Math.min(target,Math.floor(remaining/QMIN));if(qn>0){const i=await db.from('study_plan_items').insert({user_id:user.id,topic_id:topic.id,scheduled_for:day,task_type:'questions',question_target:qn,duration_minutes:qn*QMIN,priority:68,status:'pending',source_reason:'cycle_v4_qconcursos',plan_version:PLAN,sort_order:510+n*20,progress_count:0});if(i.error)throw i.error;remaining-=qn*QMIN;changed=true;}}
      }
    }
    return{changed,dates,idx,pairs,meta,model:m};
  }

  async function reconcile(m){
    const items=m.plan.filter(p=>p.scheduled_for===m.today&&p.plan_version===PLAN&&p.task_type==='questions'&&['pending','in_progress'].includes(p.status));if(!items.length)return false;
    const internal=new Map(),seen=new Set(),external=new Map();
    for(const a of m.attempts){if(!a.topic_id||!a.question_id)continue;const k=`${a.topic_id}|${a.question_id}`;if(seen.has(k))continue;seen.add(k);internal.set(a.topic_id,(internal.get(a.topic_id)||0)+1);}for(const b of m.external)if(b.topic_id)external.set(b.topic_id,(external.get(b.topic_id)||0)+Number(b.total_questions||0));
    let changed=false;for(const p of items){const actual=String(p.source_reason||'').includes('qconcursos')?(external.get(p.topic_id)||0):(internal.get(p.topic_id)||0),target=Math.max(1,Number(p.question_target||1)),progress=Math.min(target,Math.max(Number(p.progress_count||0),actual)),status=progress>=target?'completed':progress?'in_progress':'pending';if(progress!==Number(p.progress_count||0)||status!==p.status){const u=await db.from('study_plan_items').update({progress_count:progress,status,completed_at:status==='completed'?new Date().toISOString():null}).eq('id',p.id).eq('user_id',user.id);if(u.error)throw u.error;changed=true;}}return changed;
  }

  function style(){if($('#mentorIntelligenceV41Css'))return;const s=document.createElement('style');s.id='mentorIntelligenceV41Css';s.textContent='.mentor-cycle-strip{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px;margin:12px 0 18px;border-radius:14px;background:#111;color:#fff;border-left:5px solid #f2c500;box-shadow:0 8px 24px rgba(0,0,0,.08)}.mentor-cycle-strip strong{display:block;font-size:14px}.mentor-cycle-strip span{font-size:12px;opacity:.78}.mentor-cycle-pair{font-weight:800;text-align:right}.mentor-v4-alerts{display:grid;gap:10px;margin:14px 0}.mentor-v4-alert{padding:14px 16px;border-radius:12px;border:1px solid #ddd;background:#fff}.mentor-v4-alert[data-severity="critical"]{border-left:5px solid #b91c1c;background:#fff5f5}.mentor-v4-alert[data-severity="high"]{border-left:5px solid #d97706;background:#fff9ed}.mentor-v4-alert[data-severity="medium"]{border-left:5px solid #2563eb;background:#f5f8ff}.mentor-v4-alert strong{display:block;margin-bottom:5px}.mentor-v4-alert span{font-size:13px;color:#555}.mentor-dashboard-alert{margin-top:12px;padding:11px 13px;border-radius:10px;background:#fff4cf;border:1px solid #e4c65b;font-size:13px;font-weight:700}';document.head.appendChild(s);}

  function renderCycle(x){if(!x.dates.length)return;const today=dk(),day=x.dates.includes(today)?today:x.dates[0],meta=x.meta.get(day);if(!meta)return;const names=[...x.pairs.get(day)].map(id=>x.model.subjects.find(s=>s.id===id)?.name).filter(Boolean),html=`<div><strong>Ciclo ${meta.cycleNumber} • Dia ${meta.position+1} de 6</strong><span>${day===today?'Ciclo de hoje':'Próximo dia de estudo'}</span></div><div class="mentor-cycle-pair">${esc(names.join(' + '))}</div>`;for(const [id,anchor] of [['mentorCycleDaily','[data-page-view="daily"] .page-header'],['mentorCycleDashboard','.welcome-panel']]){let h=$('#'+id);if(!h){h=document.createElement('div');h.id=id;h.className='mentor-cycle-strip';$(anchor)?.insertAdjacentElement('afterend',h);}if(h)h.innerHTML=html;}}

  async function alerts(session){const r=await fetch(`${URL}/functions/v1/mentor-analyze`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:KEY},body:JSON.stringify({intent:'today',persist:false})}),data=await r.json();if(!r.ok)throw new Error(data.error||'Mentora indisponível');const arr=Array.isArray(data.alerts)?data.alerts:[];let host=$('#mentorV4Alerts');if(!host){host=document.createElement('section');host.id='mentorV4Alerts';host.className='panel';host.innerHTML='<div class="panel-heading"><div><small>ALERTAS AUTOMÁTICOS</small><h2>O que a Mentora detectou</h2></div></div><div class="mentor-v4-alerts" id="mentorV4AlertList"></div>';$('[data-page-view="mentor"] .mentor-report')?.insertAdjacentElement('afterend',host);}const list=$('#mentorV4AlertList');if(list)list.innerHTML=arr.length?arr.slice(0,5).map(a=>`<article class="mentor-v4-alert" data-severity="${esc(a.severity||'medium')}"><strong>${esc(a.message)}</strong><span>${esc(a.action)}</span></article>`).join(''):'<div class="empty-state">Nenhum alerta crítico agora. Siga o ciclo.</div>';let d=$('#mentorDashboardAlertV4'),top=arr[0];if(!d&&top){d=document.createElement('div');d.id='mentorDashboardAlertV4';d.className='mentor-dashboard-alert';$('#dashboardMentorNext')?.insertAdjacentElement('afterend',d);}if(d){d.hidden=!top;if(top)d.textContent=`${top.message} ${top.action}`;}}

  async function run({reload=true}={}){if(busy)return;busy=true;try{const c=await ctx();if(!c)return;style();let m=await load(),p=await planCycle(m);m=await load();const rec=await reconcile(m);renderCycle({...p,model:m});await alerts(c.session);const changed=p.changed||rec,key=`mentor-v41-reload-${dk()}`;if(changed&&reload&&sessionStorage.getItem(key)!=='1'){sessionStorage.setItem(key,'1');setTimeout(()=>location.reload(),250);}else if(!changed)sessionStorage.removeItem(key);}catch(e){console.error('Mentor Intelligence V4.1:',e);}finally{busy=false;}}

  async function boot(){await new Promise(r=>setTimeout(r,1500));await run();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')run({reload:false});});window.addEventListener('focus',()=>run({reload:false}));}
  window.MentorIntelligence=Object.freeze({version:VERSION,run,forgettingRisk:risk,cycle:CYCLE});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
