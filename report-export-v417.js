(() => {
  'use strict';
  if (window.__mentorReportV417) return;
  window.__mentorReportV417 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const pct=(a,b)=>b?Math.round((Number(a||0)/Number(b))*1000)/10:0;
  const safe=(v='')=>String(v??'');

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__reportToast);window.__reportToast=setTimeout(()=>n.classList.remove('show'),3800);
  }

  function injectStyles(){
    if($('#v417ReportStyle'))return;
    const s=document.createElement('style');s.id='v417ReportStyle';s.textContent=`
      #v417ReportPage{display:none}#v417ReportPage.active{display:block}
      .v417-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:16px}
      .v417-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}
      .v417-card{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:16px;box-shadow:var(--shadow,0 4px 18px #0000000c)}
      .v417-card small{display:block;color:#777;font-weight:750;margin-bottom:6px}.v417-card strong{font-size:24px}
      .v417-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.v417-actions button{min-height:44px}
      .v417-note{margin-top:14px;padding:13px 15px;border-radius:10px;background:#f6f7f8;color:#555;font-size:13px;line-height:1.5}
      .v417-status{font-size:13px;color:#666;margin-top:10px}
      @media(max-width:720px){.v417-grid{grid-template-columns:1fr}.v417-hero{align-items:flex-start;flex-direction:column}.v417-actions{display:grid;grid-template-columns:1fr}.v417-actions button{width:100%}}
    `;document.head.appendChild(s);
  }

  function injectPage(){
    if($('#v417ReportPage'))return;
    injectStyles();
    const main=$('main.content');if(!main)return;
    const p=document.createElement('section');p.id='v417ReportPage';p.className='v49-material-page';p.dataset.v49View='reports';
    p.innerHTML=`
      <div class="v417-hero">
        <div><p class="eyebrow">MEU DESEMPENHO</p><h1>Relatórios</h1><p class="muted">Exporte seus dados de estudo para análise detalhada da Mentora ou para enviar ao ChatGPT.</p></div>
        <span class="v49-badge">Sem e-mail, senha ou ID da conta</span>
      </div>
      <section class="panel">
        <div class="v417-grid">
          <div class="v417-card"><small>Questões registradas</small><strong id="v417Questions">—</strong></div>
          <div class="v417-card"><small>Tempo estudado</small><strong id="v417Minutes">—</strong></div>
          <div class="v417-card"><small>Revisões pendentes</small><strong id="v417Reviews">—</strong></div>
        </div>
        <div class="v417-actions">
          <button class="primary-button" id="v417DownloadJson">⬇ Baixar relatório completo (.json)</button>
          <button class="secondary-button" id="v417DownloadTxt">⬇ Baixar resumo (.txt)</button>
          <button class="secondary-button" id="v417Refresh">↻ Atualizar dados</button>
        </div>
        <div class="v417-note"><b>Para me enviar:</b> baixe o relatório completo e anexe o arquivo no chat. O JSON inclui desempenho por matéria/assunto, tempos, confiança, erros, revisões, histórico recente, lançamentos externos e cronograma — sem dados de login.</div>
        <div class="v417-status" id="v417Status">Abra esta página para atualizar os números.</div>
      </section>`;
    main.appendChild(p);
    $('#v417DownloadJson').onclick=()=>download('json');
    $('#v417DownloadTxt').onclick=()=>download('txt');
    $('#v417Refresh').onclick=()=>refreshPreview(true);
  }

  function patchNav(){
    $$('.v49-sub button').forEach(b=>{
      const text=b.textContent.trim();
      if(text==='Relatórios'||text==='Relatório para baixar'){
        b.removeAttribute('data-page');b.removeAttribute('data-question-tab');b.dataset.v417Report='1';
      }
    });
  }

  function openReport(){
    injectPage();
    $$('.page').forEach(p=>p.classList.remove('active'));
    $$('.v49-material-page').forEach(p=>p.classList.remove('active'));
    $('#v417ReportPage')?.classList.add('active');
    if($('#topbarPageTitle'))$('#topbarPageTitle').textContent='Relatórios';
    if($('#topbarPageSubtitle'))$('#topbarPageSubtitle').textContent='Exportação completa dos seus estudos';
    history.replaceState(null,'','#reports');
    $('#appShell')?.classList.remove('menu-open');
    window.scrollTo({top:0,behavior:'smooth'});
    refreshPreview(false);
  }

  async function loadReportData(){
    const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('Entre na sua conta para gerar o relatório.');
    const now=new Date(),today=dateKey(now);
    const [prefsR,subR,topicR,masteryR,attemptR,externalR,sessionsR,reviewsR,planR,cycleR]=await Promise.all([
      db.from('study_preferences').select('daily_minutes,study_days,review_ratio,buffer_percent,timezone').eq('user_id',user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position,parent_topic_id,is_official_syllabus').order('position'),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count,correct_count,confidence_score,trend,last_attempt_at,updated_at').eq('user_id',user.id),
      db.from('question_attempts').select('question_id,subject_id,topic_id,is_correct,response_time_seconds,confidence,error_type,answered_at,source_kind').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(1200),
      db.from('external_practice_batches').select('source_kind,subject_id,topic_id,total_questions,correct_count,confidence,duration_minutes,practiced_at,notes').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(500),
      db.from('study_sessions').select('subject_id,topic_id,started_at,ended_at,duration_minutes,duration_seconds,questions_answered,correct_answers,activity_type,notes').eq('user_id',user.id).order('started_at',{ascending:false}).limit(800),
      db.from('reviews').select('topic_id,due_at,status,trigger_reason,created_at').eq('user_id',user.id).order('due_at',{ascending:true}).limit(1000),
      db.from('study_plan_items').select('scheduled_for,topic_id,task_type,question_target,progress_count,duration_minutes,status,source_reason,carried_from_date,completed_at,sort_order').eq('user_id',user.id).gte('scheduled_for',today).order('scheduled_for').order('sort_order').limit(500),
      db.from('study_cycle_state').select('cycle_position,cycle_number,anchor_date,updated_at').eq('user_id',user.id).maybeSingle()
    ]);
    for(const r of [prefsR,subR,topicR,masteryR,attemptR,externalR,sessionsR,reviewsR,planR,cycleR])if(r.error)throw r.error;
    const subjects=subR.data||[],topics=topicR.data||[],subjectById=new Map(subjects.map(s=>[s.id,s.name])),topicById=new Map(topics.map(t=>[t.id,t]));
    const attempts=attemptR.data||[],external=externalR.data||[],sessions=sessionsR.data||[],reviews=reviewsR.data||[],mastery=masteryR.data||[],plan=planR.data||[];
    const extQ=external.reduce((s,x)=>s+Number(x.total_questions||0),0),extC=external.reduce((s,x)=>s+Number(x.correct_count||0),0);
    const internalCorrect=attempts.filter(x=>x.is_correct).length;
    const totalStudySeconds=sessions.reduce((s,x)=>s+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0);
    const bySubject=subjects.map(s=>{
      const ia=attempts.filter(x=>x.subject_id===s.id),ex=external.filter(x=>x.subject_id===s.id),ss=sessions.filter(x=>x.subject_id===s.id);
      const exQ=ex.reduce((n,x)=>n+Number(x.total_questions||0),0),exC=ex.reduce((n,x)=>n+Number(x.correct_count||0),0),q=ia.length+exQ,c=ia.filter(x=>x.is_correct).length+exC;
      const times=ia.map(x=>Number(x.response_time_seconds||0)).filter(x=>x>=5&&x<=900).sort((a,b)=>a-b),median=times.length?times[Math.floor(times.length/2)]:null;
      return{subject:s.name,questions:q,correct:c,accuracy_percent:pct(c,q),median_response_seconds:median,study_minutes:Math.round(ss.reduce((n,x)=>n+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0)/60)};
    });
    const topicStats=mastery.map(m=>{const t=topicById.get(m.topic_id);return{subject:subjectById.get(t?.subject_id)||null,topic_code:t?.syllabus_code||null,topic:t?.title||'Assunto',performance_percent:Number(m.mastery_score||0),evidence:Number(m.attempts_count||0),correct:Number(m.correct_count||0),sample_confidence_percent:Number(m.confidence_score||0),trend:m.trend||'stable',last_attempt_at:m.last_attempt_at};});
    const nameAttempt=a=>({subject:subjectById.get(a.subject_id)||null,topic:topicById.get(a.topic_id)?.title||null,topic_code:topicById.get(a.topic_id)?.syllabus_code||null,correct:!!a.is_correct,response_time_seconds:a.response_time_seconds,confidence:a.confidence,error_type:a.error_type,answered_at:a.answered_at,source_kind:a.source_kind});
    const nameExternal=x=>({subject:subjectById.get(x.subject_id)||null,topic:topicById.get(x.topic_id)?.title||null,topic_code:topicById.get(x.topic_id)?.syllabus_code||null,source_kind:x.source_kind,total_questions:x.total_questions,correct_count:x.correct_count,accuracy_percent:pct(x.correct_count,x.total_questions),duration_minutes:x.duration_minutes,confidence:x.confidence,practiced_at:x.practiced_at,notes:x.notes});
    const nameSession=x=>({subject:subjectById.get(x.subject_id)||null,topic:topicById.get(x.topic_id)?.title||null,topic_code:topicById.get(x.topic_id)?.syllabus_code||null,activity_type:x.activity_type,duration_seconds:Number(x.duration_seconds)||Number(x.duration_minutes||0)*60,duration_minutes:x.duration_minutes,questions_answered:x.questions_answered,correct_answers:x.correct_answers,started_at:x.started_at,ended_at:x.ended_at,notes:x.notes});
    const namePlan=x=>({date:x.scheduled_for,original_date:x.carried_from_date||null,subject:subjectById.get(topicById.get(x.topic_id)?.subject_id)||null,topic:topicById.get(x.topic_id)?.title||null,topic_code:topicById.get(x.topic_id)?.syllabus_code||null,task_type:x.task_type,target_questions:x.task_type==='questions'?Number(x.question_target||0):0,progress_questions:x.task_type==='questions'?Number(x.progress_count||0):0,duration_minutes:x.duration_minutes,status:x.status,source_reason:x.source_reason,completed_at:x.completed_at});
    const pendingReviews=reviews.filter(x=>x.status==='pending');
    return{
      schema:'mentor-ia-study-report-v3',
      generated_at:new Date().toISOString(),timezone:TZ,
      privacy_note:'Relatório sem e-mail, senha ou identificador da conta.',
      preferences:prefsR.data||{},cycle:cycleR.data||null,
      summary:{internal_questions:attempts.length,internal_correct:internalCorrect,internal_accuracy_percent:pct(internalCorrect,attempts.length),external_questions:extQ,external_correct:extC,external_accuracy_percent:pct(extC,extQ),total_questions:attempts.length+extQ,total_correct:internalCorrect+extC,total_accuracy_percent:pct(internalCorrect+extC,attempts.length+extQ),study_seconds:totalStudySeconds,study_minutes:Math.round(totalStudySeconds/60),pending_reviews:pendingReviews.length,planned_items:plan.length},
      by_subject:bySubject,
      topic_performance:topicStats,
      recent_internal_attempts:attempts.slice(0,500).map(nameAttempt),
      recent_external_batches:external.slice(0,250).map(nameExternal),
      recent_study_sessions:sessions.slice(0,300).map(nameSession),
      pending_reviews:pendingReviews.slice(0,300).map(x=>({subject:subjectById.get(topicById.get(x.topic_id)?.subject_id)||null,topic:topicById.get(x.topic_id)?.title||null,topic_code:topicById.get(x.topic_id)?.syllabus_code||null,due_at:x.due_at,trigger_reason:x.trigger_reason})),
      current_plan:plan.map(namePlan)
    };
  }

  function triggerDownload(name,text,type){
    const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function txtSummary(r){
    const s=r.summary||{};
    const lines=[
      'MENTOR IA — RESUMO DE ESTUDOS',
      `Gerado em: ${new Date(r.generated_at).toLocaleString('pt-BR')}`,
      '',
      `Questões totais registradas: ${s.total_questions||0}`,
      `Acertos totais: ${s.total_correct||0}`,
      `Taxa geral: ${s.total_accuracy_percent||0}%`,
      `Tempo estudado: ${s.study_minutes||0} min`,
      `Revisões pendentes: ${s.pending_reviews||0}`,
      '',
      'DESEMPENHO POR MATÉRIA'
    ];
    (r.by_subject||[]).forEach(x=>lines.push(`${x.subject}: ${x.questions} questões | ${x.accuracy_percent}% | ${x.study_minutes} min | mediana ${x.median_response_seconds??'—'}s/questão`));
    lines.push('','Observação: o relatório completo em JSON contém desempenho por assunto, confiança, erros, revisões, sessões e cronograma.');
    return lines.join('\n');
  }

  async function refreshPreview(showToast){
    const st=$('#v417Status');if(st)st.textContent='Atualizando dados…';
    try{
      const r=await loadReportData();
      if($('#v417Questions'))$('#v417Questions').textContent=String(r.summary.total_questions||0);
      if($('#v417Minutes'))$('#v417Minutes').textContent=`${r.summary.study_minutes||0} min`;
      if($('#v417Reviews'))$('#v417Reviews').textContent=String(r.summary.pending_reviews||0);
      if(st)st.textContent=`Atualizado agora • ${r.summary.total_accuracy_percent||0}% de acerto geral`;
      if(showToast)toast('Dados do relatório atualizados.','ok');
      return r;
    }catch(e){if(st)st.textContent=e?.message||'Não foi possível carregar o relatório.';if(showToast)toast(st.textContent,'error');throw e;}
  }

  async function download(kind){
    const btn=kind==='json'?$('#v417DownloadJson'):$('#v417DownloadTxt');if(btn)btn.disabled=true;
    try{
      const r=await refreshPreview(false),stamp=dateKey();
      if(kind==='json')triggerDownload(`mentor-ia-relatorio-${stamp}.json`,JSON.stringify(r,null,2),'application/json;charset=utf-8');
      else triggerDownload(`mentor-ia-resumo-${stamp}.txt`,txtSummary(r),'text/plain;charset=utf-8');
      toast('Relatório baixado. Agora você pode anexá-lo no chat.','ok');
    }catch(e){toast(e?.message||'Não foi possível gerar o relatório.','error');}
    finally{if(btn)btn.disabled=false;}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-v417-report]');
    if(b){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openReport();}
  },true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#reports')openReport();});

  let tries=0;const timer=setInterval(()=>{
    tries++;
    if($('#appShell')&&$('main.content')&&$('.sidebar-nav')){
      injectPage();patchNav();
      const mo=new MutationObserver(()=>{clearTimeout(window.__v417NavPatch);window.__v417NavPatch=setTimeout(patchNav,80);});mo.observe($('.sidebar-nav'),{childList:true,subtree:true});
      if(location.hash==='#reports')openReport();
      clearInterval(timer);
    }
    if(tries>180)clearInterval(timer);
  },200);
})();