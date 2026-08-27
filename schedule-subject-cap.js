(() => {
  'use strict';

  const VERSION='2.0.0';
  const MAX_SUBJECTS_PER_DAY=2;
  const EVIDENCE_TARGET=10;
  const QUESTION_MINUTES=3;
  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const PLAN_VERSION='p6-v1';
  const HORIZON_DAYS=7;
  let busy=false,fallbackDb=null,timer=null;

  function dateKey(date=new Date(),timeZone='America/Bahia'){
    return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  }
  function fromKey(key){const [y,m,d]=String(key).split('-').map(Number);return new Date(Date.UTC(y,(m||1)-1,d||1,15,0,0));}
  function addDays(date,amount){const next=new Date(date.getTime());next.setUTCDate(next.getUTCDate()+amount);return next;}
  function isoWeekday(date){const day=date.getUTCDay();return day===0?7:day;}

  async function getDb(){
    if(window.mentorCloud?.client)return window.mentorCloud.client;
    if(fallbackDb)return fallbackDb;
    if(!window.supabase?.createClient)return null;
    fallbackDb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return fallbackDb;
  }

  function subjectIdForItem(item,topicMap){return topicMap.get(item.topic_id)?.subject_id||null;}
  function buildStudyDates(today,prefs){
    const allowed=new Set((prefs.study_days||[1,2,3,4,5,6]).map(Number)),start=fromKey(today),dates=[];
    for(let offset=0;offset<HORIZON_DAYS;offset+=1){const date=addDays(start,offset);if(allowed.has(isoWeekday(date)))dates.push(dateKey(date,prefs.timezone||'America/Bahia'));}
    return dates;
  }
  function priorityValue(item){const boost=item.task_type==='review'?1000:item.task_type==='questions'?200:0;return boost+Number(item.priority||0);}
  function addTopicToDay(info,subjectId,topicId){if(!subjectId||!topicId)return;if(!info.topicIds.has(subjectId))info.topicIds.set(subjectId,new Set());info.topicIds.get(subjectId).add(topicId);}

  function chooseTopic(subjectId,info,topicsBySubject,evidenceByTopic){
    const dayTopics=[...(info.topicIds.get(subjectId)||[])];
    const all=topicsBySubject.get(subjectId)||[];
    const pool=(dayTopics.length?dayTopics.map(id=>all.find(t=>t.id===id)).filter(Boolean):all);
    const rank=t=>{
      const m=evidenceByTopic.get(t.id)||{count:0,score:50};
      if(m.count>=EVIDENCE_TARGET&&m.score<80)return 300+(80-m.score);
      if(m.count>0&&m.count<EVIDENCE_TARGET)return 220+m.count;
      if(m.count===0)return 150-Number(t.position||0)/100;
      if(m.score<80)return 120+(80-m.score);
      return 20-Number(t.position||0)/100;
    };
    return [...pool].sort((a,b)=>rank(b)-rank(a)||Number(a.position||0)-Number(b.position||0))[0]||null;
  }

  async function addFillTasks({db,user,prefs,studyDates,dayInfo,topicsBySubject,evidenceByTopic,bankAvailable,seenInternal}){
    const hardMinutes=Math.max(20,Number(prefs.daily_minutes||60));
    const rows=[];
    for(const day of studyDates){
      const info=dayInfo.get(day);if(!info||!info.subjects.size)continue;
      const remaining=Math.max(0,hardMinutes-info.minutes),totalQuestions=Math.floor(remaining/QUESTION_MINUTES);
      if(totalQuestions<1)continue;
      const subjectIds=[...info.subjects].slice(0,MAX_SUBJECTS_PER_DAY),counts=new Map(subjectIds.map(id=>[id,0]));
      for(let i=0;i<totalQuestions;i+=1){const sid=subjectIds[i%subjectIds.length];counts.set(sid,Number(counts.get(sid)||0)+1);}
      let order=1000;
      for(const subjectId of subjectIds){
        const target=Number(counts.get(subjectId)||0);if(target<1)continue;
        const topic=chooseTopic(subjectId,info,topicsBySubject,evidenceByTopic);if(!topic)continue;
        const available=Math.max(0,Number(bankAvailable.get(topic.id)||0)-Number(seenInternal.get(topic.id)||0));
        const bankTarget=Math.min(target,available),qcTarget=target-bankTarget;
        if(bankTarget>0){rows.push({user_id:user.id,plan_version:PLAN_VERSION,topic_id:topic.id,question_id:null,scheduled_for:day,task_type:'questions',question_target:bankTarget,duration_minutes:bankTarget*QUESTION_MINUTES,priority:62,source_reason:'cap_fill_bank',displaced_from:null,sort_order:order,status:'pending',progress_count:0});order+=10;}
        if(qcTarget>0){rows.push({user_id:user.id,plan_version:PLAN_VERSION,topic_id:topic.id,question_id:null,scheduled_for:day,task_type:'questions',question_target:qcTarget,duration_minutes:qcTarget*QUESTION_MINUTES,priority:58,source_reason:'cap_fill_qconcursos',displaced_from:null,sort_order:order,status:'pending',progress_count:0});order+=10;}
      }
    }
    if(!rows.length)return 0;
    const inserted=await db.from('study_plan_items').insert(rows).select('id');
    if(inserted.error)throw inserted.error;
    return inserted.data?.length||rows.length;
  }

  async function normalize(options={}){
    if(busy)return{ok:true,changed:0,skipped:'busy'};
    busy=true;
    try{
      const db=options.db||await getDb();if(!db)return{ok:false,changed:0,reason:'no_db'};
      const sessionResult=await db.auth.getSession(),user=options.user||sessionResult.data?.session?.user||null;if(!user)return{ok:false,changed:0,reason:'no_user'};
      const prefR=await db.from('study_preferences').select('*').eq('user_id',user.id).maybeSingle();if(prefR.error)throw prefR.error;
      const prefs=prefR.data||{daily_minutes:60,study_days:[1,2,3,4,5,6],timezone:'America/Bahia'};
      const today=dateKey(new Date(),prefs.timezone||'America/Bahia'),end=dateKey(addDays(fromKey(today),HORIZON_DAYS-1),prefs.timezone||'America/Bahia');

      const [itemsR,topicsR,masteryR,questionsR,attemptsR]=await Promise.all([
        db.from('study_plan_items').select('*').eq('user_id',user.id).eq('plan_version',PLAN_VERSION).gte('scheduled_for',today).lte('scheduled_for',end).in('status',['pending','in_progress','completed']).order('scheduled_for').order('sort_order'),
        db.from('topics').select('id,subject_id,position').eq('active',true),
        db.from('topic_mastery').select('topic_id,attempts_count,mastery_score').eq('user_id',user.id),
        db.from('questions').select('id,topic_id').not('explanation','is',null).limit(5000),
        db.from('question_attempts').select('topic_id,question_id').eq('user_id',user.id).limit(5000)
      ]);
      for(const r of [itemsR,topicsR,masteryR,questionsR,attemptsR])if(r.error)throw r.error;

      const items=itemsR.data||[];if(!items.length)return{ok:true,changed:0};
      const topics=topicsR.data||[],topicMap=new Map(topics.map(row=>[row.id,row])),topicsBySubject=new Map();
      topics.forEach(t=>{if(!topicsBySubject.has(t.subject_id))topicsBySubject.set(t.subject_id,[]);topicsBySubject.get(t.subject_id).push(t);});
      const evidenceByTopic=new Map((masteryR.data||[]).map(m=>[m.topic_id,{count:Number(m.attempts_count||0),score:Number(m.mastery_score||0)}]));
      const bankAvailable=new Map();(questionsR.data||[]).forEach(q=>{if(q.topic_id)bankAvailable.set(q.topic_id,Number(bankAvailable.get(q.topic_id)||0)+1);});
      const seenSets=new Map();(attemptsR.data||[]).forEach(a=>{if(!a.topic_id||!a.question_id)return;if(!seenSets.has(a.topic_id))seenSets.set(a.topic_id,new Set());seenSets.get(a.topic_id).add(a.question_id);});
      const seenInternal=new Map([...seenSets.entries()].map(([id,set])=>[id,set.size]));
      const studyDates=buildStudyDates(today,prefs);if(!studyDates.length)return{ok:true,changed:0};
      const dayInfo=new Map(studyDates.map(day=>[day,{subjects:new Set(),minutes:0,items:[],topicIds:new Map()}]));
      const hardMinutes=Math.max(20,Number(prefs.daily_minutes||60));

      items.filter(item=>item.status!=='pending').forEach(item=>{const info=dayInfo.get(item.scheduled_for);if(!info)return;const subjectId=subjectIdForItem(item,topicMap);if(subjectId)info.subjects.add(subjectId);info.minutes+=Number(item.duration_minutes||0);info.items.push(item.id);addTopicToDay(info,subjectId,item.topic_id);});

      const pending=items.filter(item=>item.status==='pending').sort((a,b)=>{const dateCmp=String(a.scheduled_for).localeCompare(String(b.scheduled_for));if(dateCmp)return dateCmp;const p=priorityValue(b)-priorityValue(a);return p||Number(a.sort_order||0)-Number(b.sort_order||0);});
      const assignments=[],overflow=[];
      for(const item of pending){
        const subjectId=subjectIdForItem(item,topicMap),earliest=String(item.scheduled_for||today)<today?today:String(item.scheduled_for||today),duration=Math.max(1,Number(item.duration_minutes||0));let chosen=null;
        for(const day of studyDates){if(day<earliest)continue;const info=dayInfo.get(day),subjectAllowed=!subjectId||info.subjects.has(subjectId)||info.subjects.size<MAX_SUBJECTS_PER_DAY,timeAllowed=info.minutes+duration<=hardMinutes;if(subjectAllowed&&timeAllowed){chosen=day;break;}}
        if(!chosen){for(const day of studyDates){const info=dayInfo.get(day),subjectAllowed=!subjectId||info.subjects.has(subjectId)||info.subjects.size<MAX_SUBJECTS_PER_DAY,timeAllowed=info.minutes+duration<=hardMinutes;if(subjectAllowed&&timeAllowed){chosen=day;break;}}}
        if(!chosen){overflow.push(item);continue;}
        const info=dayInfo.get(chosen);if(subjectId)info.subjects.add(subjectId);info.minutes+=duration;info.items.push(item.id);addTopicToDay(info,subjectId,item.topic_id);assignments.push({item,chosen});
      }

      const updates=[],byDay=new Map();for(const a of assignments){if(!byDay.has(a.chosen))byDay.set(a.chosen,[]);byDay.get(a.chosen).push(a);}
      for(const [day,rows] of byDay){rows.sort((a,b)=>priorityValue(b.item)-priorityValue(a.item)||Number(a.item.sort_order||0)-Number(b.item.sort_order||0));rows.forEach((row,index)=>updates.push({id:row.item.id,oldDate:row.item.scheduled_for,newDate:day,sortOrder:(index+1)*10,displacedFrom:row.item.displaced_from||(row.item.scheduled_for!==day?row.item.scheduled_for:null)}));}

      let changed=0;
      for(const row of updates){if(row.oldDate===row.newDate&&Number(row.sortOrder)===Number(pending.find(x=>x.id===row.id)?.sort_order||0))continue;const patch={scheduled_for:row.newDate,sort_order:row.sortOrder};if(row.displacedFrom)patch.displaced_from=row.displacedFrom;const result=await db.from('study_plan_items').update(patch).eq('id',row.id).eq('user_id',user.id);if(result.error)throw result.error;changed+=1;}
      for(const item of overflow){const result=await db.from('study_plan_items').update({status:'skipped'}).eq('id',item.id).eq('user_id',user.id).eq('status','pending');if(result.error)throw result.error;changed+=1;}

      const filled=await addFillTasks({db,user,prefs,studyDates,dayInfo,topicsBySubject,evidenceByTopic,bankAvailable,seenInternal});changed+=filled;

      if(changed){const detail={subjectCapApplied:true,maxSubjectsPerDay:MAX_SUBJECTS_PER_DAY,dailyMinutes:hardMinutes,changed,filled,overflow:overflow.length};window.dispatchEvent(new CustomEvent('mentor:subject-cap-applied',{detail}));if(window.MentorScheduleEngine?.getPlan&&options.notify!==false){try{const plan=await window.MentorScheduleEngine.getPlan();window.dispatchEvent(new CustomEvent('mentor:plan-updated',{detail:{...plan,subjectCapApplied:true}}));}catch{}}}
      return{ok:true,changed,filled,overflow:overflow.length};
    }finally{busy=false;}
  }

  function scheduleNormalize(delay=180){clearTimeout(timer);timer=setTimeout(()=>normalize().catch(error=>console.warn('Planejamento de 2 matérias não aplicado:',error)),delay);}
  window.addEventListener('mentor:plan-updated',event=>{if(event.detail?.subjectCapApplied)return;scheduleNormalize();});
  window.addEventListener('mentor:attempt-saved',()=>scheduleNormalize(350));
  window.addEventListener('mentor:review-scheduled',()=>scheduleNormalize(350));
  window.MentorSubjectCap=Object.freeze({version:VERSION,maxSubjectsPerDay:MAX_SUBJECTS_PER_DAY,evidenceTarget:EVIDENCE_TARGET,normalize,scheduleNormalize});
  setTimeout(()=>scheduleNormalize(0),650);
})();