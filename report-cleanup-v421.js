(() => {
  'use strict';
  if(window.__mentorReportCleanupV421)return;
  window.__mentorReportCleanupV421=true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s);
  const pct=(a,b)=>b?Math.round(Number(a||0)/Number(b)*1000)/10:0;
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__reportCleanupToast);window.__reportCleanupToast=setTimeout(()=>n.classList.remove('show'),4200);
  }
  function download(name,content,mime){
    try{
      if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mentor-download-text',name,mime,content},location.origin);return;}
    }catch{}
    const b=new Blob([content],{type:mime}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
  }

  async function loadClean(){
    const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new Error('Entre na sua conta para gerar o relatório.');
    const today=dateKey();
    const [subR,topR,attR,extR,sesR,revR,masR,planR]=await Promise.all([
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code').order('position'),
      db.from('question_attempts').select('subject_id,topic_id,is_correct,response_time_seconds,confidence,error_type,answered_at,source_kind').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(3000),
      db.from('external_practice_batches').select('source_kind,subject_id,topic_id,total_questions,correct_count,confidence,duration_minutes,practiced_at,notes').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(1500),
      db.from('study_sessions').select('subject_id,topic_id,started_at,ended_at,duration_minutes,duration_seconds,questions_answered,correct_answers,activity_type,notes').eq('user_id',user.id).order('started_at',{ascending:false}).limit(1500),
      db.from('reviews').select('topic_id,due_at,status,trigger_reason,created_at').eq('user_id',user.id).eq('status','pending').order('due_at',{ascending:true}).limit(2000),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count,correct_count,confidence_score,trend,last_attempt_at').eq('user_id',user.id),
      db.from('study_plan_items').select('scheduled_for,topic_id,task_type,question_target,progress_count,duration_minutes,status,source_reason,carried_from_date,completed_at,sort_order').eq('user_id',user.id).gte('scheduled_for',today).in('status',['pending','in_progress','completed']).order('scheduled_for').order('sort_order').limit(1000)
    ]);
    for(const r of [subR,topR,attR,extR,sesR,revR,masR,planR])if(r.error)throw r.error;
    const subjects=subR.data||[],topics=topR.data||[],attempts=attR.data||[],external=extR.data||[],sessions=sesR.data||[],reviews=revR.data||[],mastery=masR.data||[],plan=planR.data||[];
    const subMap=new Map(subjects.map(x=>[x.id,x.name])),topMap=new Map(topics.map(x=>[x.id,x]));
    const extQ=external.reduce((s,x)=>s+Number(x.total_questions||0),0),extC=external.reduce((s,x)=>s+Number(x.correct_count||0),0),intC=attempts.filter(x=>x.is_correct).length;
    const reviewGroups=new Map();
    for(const r of reviews){
      if(!r.topic_id)continue;const cur=reviewGroups.get(r.topic_id)||{topic_id:r.topic_id,event_count:0,due_at:r.due_at,reasons:new Set()};cur.event_count++;if(!cur.due_at||new Date(r.due_at)<new Date(cur.due_at))cur.due_at=r.due_at;if(r.trigger_reason)cur.reasons.add(r.trigger_reason);reviewGroups.set(r.topic_id,cur);
    }
    const pendingReviewTopics=[...reviewGroups.values()].map(x=>{const t=topMap.get(x.topic_id);return{subject:subMap.get(t?.subject_id)||'',topic:t?.title||'',topic_code:t?.syllabus_code||'',due_at:x.due_at,event_count:x.event_count,trigger_reasons:[...x.reasons]};});
    const activePlan=plan.filter(x=>['pending','in_progress'].includes(x.status));
    const completedPlan=plan.filter(x=>x.status==='completed');
    const namedPlan=plan.map(x=>{const t=topMap.get(x.topic_id);return{date:x.scheduled_for,subject:subMap.get(t?.subject_id)||'',topic:t?.title||'',code:t?.syllabus_code||'',type:x.task_type,target:x.task_type==='questions'?Number(x.question_target||0):0,progress:x.task_type==='questions'?Number(x.progress_count||0):0,minutes:Number(x.duration_minutes||0),status:x.status,original_date:x.carried_from_date||null};});
    return{
      schema:'mentor-ia-study-report-v4.21-clean',generated_at:new Date().toISOString(),timezone:TZ,
      privacy_note:'Relatório sem e-mail, senha ou identificador da conta.',
      summary:{internal_questions:attempts.length,internal_correct:intC,internal_accuracy:pct(intC,attempts.length),external_questions:extQ,external_correct:extC,external_accuracy:pct(extC,extQ),total_questions:attempts.length+extQ,total_correct:intC+extC,total_accuracy:pct(intC+extC,attempts.length+extQ),study_minutes:Math.round(sessions.reduce((s,x)=>s+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0)/60),pending_review_events:reviews.length,pending_review_topics:pendingReviewTopics.length,active_plan_items:activePlan.length,completed_plan_items_in_window:completedPlan.length},
      by_subject:subjects.map(s=>{const ia=attempts.filter(x=>x.subject_id===s.id),ex=external.filter(x=>x.subject_id===s.id),q=ia.length+ex.reduce((n,x)=>n+Number(x.total_questions||0),0),c=ia.filter(x=>x.is_correct).length+ex.reduce((n,x)=>n+Number(x.correct_count||0),0);return{subject:s.name,questions:q,correct:c,accuracy:pct(c,q)};}).filter(x=>x.questions),
      topic_performance:mastery.map(m=>{const t=topMap.get(m.topic_id);return{subject:subMap.get(t?.subject_id)||'',code:t?.syllabus_code||'',topic:t?.title||'',performance:Number(m.mastery_score||0),evidence:Number(m.attempts_count||0),correct:Number(m.correct_count||0),confidence:Number(m.confidence_score||0),trend:m.trend||'stable'};}),
      pending_review_topics:pendingReviewTopics,
      current_plan:namedPlan,
      recent_internal_attempts:attempts.slice(0,500).map(a=>({subject:subMap.get(a.subject_id)||'',topic:topMap.get(a.topic_id)?.title||'',topic_code:topMap.get(a.topic_id)?.syllabus_code||'',correct:!!a.is_correct,response_time_seconds:a.response_time_seconds,confidence:a.confidence,error_type:a.error_type,answered_at:a.answered_at,source_kind:a.source_kind})),
      recent_external_batches:external.slice(0,350).map(x=>({subject:subMap.get(x.subject_id)||'',topic:topMap.get(x.topic_id)?.title||'',topic_code:topMap.get(x.topic_id)?.syllabus_code||'',source_kind:x.source_kind,total_questions:x.total_questions,correct_count:x.correct_count,accuracy_percent:pct(x.correct_count,x.total_questions),duration_minutes:x.duration_minutes,confidence:x.confidence,practiced_at:x.practiced_at,notes:x.notes}))
    };
  }

  function txt(r){const s=r.summary||{},lines=['MENTOR IA - RESUMO LIMPO DE ESTUDOS','',`Questões registradas: ${s.total_questions||0}`,`Acertos: ${s.total_correct||0}`,`Taxa geral: ${s.total_accuracy||0}%`,`Tempo estudado: ${s.study_minutes||0} min`,`Assuntos a revisar: ${s.pending_review_topics||0}`,`Eventos de revisão agrupados nesses assuntos: ${s.pending_review_events||0}`,`Itens ativos no cronograma: ${s.active_plan_items||0}`,'','DESEMPENHO POR MATÉRIA'];(r.by_subject||[]).forEach(x=>lines.push(`${x.subject}: ${x.questions} questões | ${x.accuracy}%`));return lines.join('\r\n');}

  async function run(kind){
    const r=await loadClean(),d=dateKey();
    if(kind==='json')download(`mentor-ia-relatorio-limpo-${d}.json`,JSON.stringify(r,null,2),'application/json;charset=utf-8');
    else download(`mentor-ia-resumo-limpo-${d}.txt`,txt(r),'text/plain;charset=utf-8');
    toast('Relatório limpo gerado.','ok');
  }

  document.addEventListener('click',e=>{
    const json=e.target.closest('#v417DownloadJson'),txtBtn=e.target.closest('#v417DownloadTxt');if(!json&&!txtBtn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();run(json?'json':'txt').catch(err=>{console.error(err);toast(err?.message||'Erro ao gerar relatório.','error');});
  },true);

  function patchLabel(){const n=$('#v417Reviews');const label=n?.closest('.v417-card')?.querySelector('small');if(label)label.textContent='Eventos de revisão';const note=$('#v417ReportPage .v417-note');if(note)note.innerHTML='<b>Relatório limpo:</b> JSON e TXT ignoram tarefas puladas/substituídas e separam eventos de revisão da quantidade real de assuntos a revisar. O PDF continua como leitura visual.';}
  let tries=0;const timer=setInterval(()=>{tries++;patchLabel();if(tries>200)clearInterval(timer);},250);
})();