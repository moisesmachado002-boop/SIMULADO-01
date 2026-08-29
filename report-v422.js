(() => {
  'use strict';
  if (window.__mentorReportV422) return;
  window.__mentorReportV422 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const pct=(a,b)=>b?Math.round(Number(a||0)/Number(b)*1000)/10:0;
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const fmtDate=v=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v));
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__mentorReportV422Toast);window.__mentorReportV422Toast=setTimeout(()=>n.classList.remove('show'),3800);
  }
  function injectStyle(){
    if($('#mentorReportV422Style'))return;
    const s=document.createElement('style');s.id='mentorReportV422Style';s.textContent=`
      #mentorReportV422{display:none}#mentorReportV422.active{display:block}
      .r422-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:16px}
      .r422-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:16px}
      .r422-stat{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:15px;box-shadow:var(--shadow,0 4px 18px #0000000c)}
      .r422-stat span{display:block;color:var(--muted,#666);font-size:11px;font-weight:800;margin-bottom:7px}.r422-stat strong{font-size:22px}
      .r422-columns{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.r422-list{display:grid;gap:9px}
      .r422-row{padding:12px;border:1px solid var(--line,#e2e2e2);border-radius:10px;background:#fff}.r422-row strong{display:block;margin-bottom:4px}.r422-row small{color:var(--muted,#666);line-height:1.45}
      .r422-actions{display:flex;gap:9px;flex-wrap:wrap}.r422-note{margin-top:12px;font-size:12px;color:var(--muted,#666)}
      @media(max-width:900px){.r422-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.r422-columns{grid-template-columns:1fr}}
      @media(max-width:560px){.r422-grid{grid-template-columns:1fr}.r422-head{align-items:flex-start;flex-direction:column}.r422-actions{display:grid;grid-template-columns:1fr;width:100%}.r422-actions button{width:100%}}
    `;document.head.appendChild(s);
  }

  function injectPage(){
    if($('#mentorReportV422'))return;
    injectStyle();const main=$('main.content');if(!main)return;
    const p=document.createElement('section');p.id='mentorReportV422';p.className='v49-material-page';p.dataset.v49View='reports';
    p.innerHTML=`
      <div class="r422-head"><div><p class="eyebrow">MEU DESEMPENHO</p><h1>Relatórios</h1><p class="muted">Uma leitura limpa do que foi realmente estudado e do que ainda está ativo.</p></div><span class="v49-badge">V4.22 • sem tarefas puladas</span></div>
      <div class="r422-grid">
        <div class="r422-stat"><span>QUESTÕES</span><strong id="r422Questions">—</strong></div>
        <div class="r422-stat"><span>ACERTO GERAL</span><strong id="r422Accuracy">—</strong></div>
        <div class="r422-stat"><span>TEMPO REGISTRADO</span><strong id="r422Minutes">—</strong></div>
        <div class="r422-stat"><span>ASSUNTOS A REVISAR</span><strong id="r422ReviewTopics">—</strong></div>
        <div class="r422-stat"><span>TAREFAS ATIVAS</span><strong id="r422Active">—</strong></div>
      </div>
      <div class="r422-columns">
        <section class="panel"><div class="panel-heading"><div><small>CRONOGRAMA</small><h2>Próximas tarefas</h2></div></div><div class="r422-list" id="r422Plan"><div class="empty-state">Carregando…</div></div></section>
        <section class="panel"><div class="panel-heading"><div><small>PRIORIDADE</small><h2>Assuntos que pedem atenção</h2></div></div><div class="r422-list" id="r422Weak"><div class="empty-state">Carregando…</div></div></section>
      </div>
      <section class="panel" style="margin-top:14px"><div class="panel-heading"><div><small>EXPORTAR</small><h2>Baixar relatório</h2></div></div><div class="r422-actions"><button class="primary-button" id="r422Json">⬇ JSON completo</button><button class="secondary-button" id="r422Txt">⬇ Resumo TXT</button><button class="secondary-button" id="r422Pdf">⬇ PDF</button><button class="secondary-button" id="r422Refresh">↻ Atualizar</button></div><p class="r422-note">“Eventos de revisão” são agrupados por assunto. O cronograma exportado ignora registros pulados/substituídos.</p></section>`;
    main.appendChild(p);
    $('#r422Json').onclick=()=>download('json');$('#r422Txt').onclick=()=>download('txt');$('#r422Pdf').onclick=()=>download('pdf');$('#r422Refresh').onclick=()=>refresh(true);
  }

  async function loadData(){
    const {data:{user},error:ue}=await db.auth.getUser();if(ue||!user)throw new Error('Entre na sua conta para gerar o relatório.');
    const today=dateKey();
    const [prefsR,subR,topR,attR,extR,sesR,revR,masR,planR]=await Promise.all([
      db.from('study_preferences').select('daily_minutes,study_days,review_ratio,buffer_percent,timezone').eq('user_id',user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code').order('position'),
      db.from('question_attempts').select('subject_id,topic_id,is_correct,response_time_seconds,confidence,error_type,answered_at,source_kind').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(3000),
      db.from('external_practice_batches').select('source_kind,subject_id,topic_id,total_questions,correct_count,confidence,duration_minutes,practiced_at,notes').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(1500),
      db.from('study_sessions').select('subject_id,topic_id,started_at,ended_at,duration_minutes,duration_seconds,questions_answered,correct_answers,activity_type,notes').eq('user_id',user.id).order('started_at',{ascending:false}).limit(1500),
      db.from('reviews').select('topic_id,due_at,status,trigger_reason,created_at').eq('user_id',user.id).eq('status','pending').order('due_at',{ascending:true}).limit(2000),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count,correct_count,confidence_score,trend,last_attempt_at').eq('user_id',user.id),
      db.from('study_plan_items').select('scheduled_for,topic_id,task_type,question_target,progress_count,duration_minutes,status,source_reason,carried_from_date,completed_at,sort_order').eq('user_id',user.id).gte('scheduled_for',today).in('status',['pending','in_progress','completed']).order('scheduled_for').order('sort_order').limit(1000)
    ]);
    for(const r of [prefsR,subR,topR,attR,extR,sesR,revR,masR,planR])if(r.error)throw r.error;
    const subjects=subR.data||[],topics=topR.data||[],attempts=attR.data||[],external=extR.data||[],sessions=sesR.data||[],reviews=revR.data||[],mastery=masR.data||[],plan=planR.data||[];
    const subMap=new Map(subjects.map(x=>[x.id,x.name])),topMap=new Map(topics.map(x=>[x.id,x]));
    const extQ=external.reduce((s,x)=>s+Number(x.total_questions||0),0),extC=external.reduce((s,x)=>s+Number(x.correct_count||0),0),intC=attempts.filter(x=>x.is_correct).length;
    const groups=new Map();for(const r of reviews){if(!r.topic_id)continue;const g=groups.get(r.topic_id)||{topic_id:r.topic_id,event_count:0,due_at:r.due_at,reasons:new Set()};g.event_count++;if(new Date(r.due_at)<new Date(g.due_at))g.due_at=r.due_at;if(r.trigger_reason)g.reasons.add(r.trigger_reason);groups.set(r.topic_id,g);}
    const reviewTopics=[...groups.values()].map(g=>{const t=topMap.get(g.topic_id);return{subject:subMap.get(t?.subject_id)||'',topic:t?.title||'',code:t?.syllabus_code||'',due_at:g.due_at,event_count:g.event_count,reasons:[...g.reasons]};}).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at));
    const namedPlan=plan.map(x=>{const t=topMap.get(x.topic_id);return{date:x.scheduled_for,original_date:x.carried_from_date||null,subject:subMap.get(t?.subject_id)||'',topic:t?.title||'',code:t?.syllabus_code||'',type:x.task_type,target:x.task_type==='questions'?Number(x.question_target||0):0,progress:x.task_type==='questions'?Number(x.progress_count||0):0,minutes:Number(x.duration_minutes||0),status:x.status,source_reason:x.source_reason||''};});
    const active=namedPlan.filter(x=>['pending','in_progress'].includes(x.status));
    const studySeconds=sessions.reduce((s,x)=>s+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0);
    return{schema:'mentor-ia-study-report-v4.22',generated_at:new Date().toISOString(),timezone:TZ,privacy_note:'Relatório sem e-mail, senha ou identificador da conta.',preferences:prefsR.data||{},summary:{internal_questions:attempts.length,internal_correct:intC,internal_accuracy:pct(intC,attempts.length),external_questions:extQ,external_correct:extC,external_accuracy:pct(extC,extQ),total_questions:attempts.length+extQ,total_correct:intC+extC,total_accuracy:pct(intC+extC,attempts.length+extQ),study_seconds:studySeconds,study_minutes:Math.round(studySeconds/60),pending_review_events:reviews.length,pending_review_topics:reviewTopics.length,active_plan_items:active.length},by_subject:subjects.map(s=>{const ia=attempts.filter(x=>x.subject_id===s.id),ex=external.filter(x=>x.subject_id===s.id),q=ia.length+ex.reduce((n,x)=>n+Number(x.total_questions||0),0),c=ia.filter(x=>x.is_correct).length+ex.reduce((n,x)=>n+Number(x.correct_count||0),0);return{subject:s.name,questions:q,correct:c,accuracy:pct(c,q)};}).filter(x=>x.questions),topic_performance:mastery.map(m=>{const t=topMap.get(m.topic_id);return{subject:subMap.get(t?.subject_id)||'',code:t?.syllabus_code||'',topic:t?.title||'',performance:Number(m.mastery_score||0),evidence:Number(m.attempts_count||0),correct:Number(m.correct_count||0),confidence:Number(m.confidence_score||0),trend:m.trend||'stable',last_attempt_at:m.last_attempt_at};}),pending_review_topics:reviewTopics,current_plan:namedPlan,recent_internal_attempts:attempts.slice(0,500).map(a=>({subject:subMap.get(a.subject_id)||'',topic:topMap.get(a.topic_id)?.title||'',topic_code:topMap.get(a.topic_id)?.syllabus_code||'',correct:!!a.is_correct,response_time_seconds:a.response_time_seconds,confidence:a.confidence,error_type:a.error_type,answered_at:a.answered_at,source_kind:a.source_kind})),recent_external_batches:external.slice(0,350).map(x=>({subject:subMap.get(x.subject_id)||'',topic:topMap.get(x.topic_id)?.title||'',topic_code:topMap.get(x.topic_id)?.syllabus_code||'',source_kind:x.source_kind,total_questions:x.total_questions,correct_count:x.correct_count,accuracy_percent:pct(x.correct_count,x.total_questions),duration_minutes:x.duration_minutes,confidence:x.confidence,practiced_at:x.practiced_at,notes:x.notes})),recent_study_sessions:sessions.slice(0,350).map(x=>({subject:subMap.get(x.subject_id)||'',topic:topMap.get(x.topic_id)?.title||'',topic_code:topMap.get(x.topic_id)?.syllabus_code||'',activity_type:x.activity_type,duration_seconds:Number(x.duration_seconds)||Number(x.duration_minutes||0)*60,duration_minutes:x.duration_minutes,questions_answered:x.questions_answered,correct_answers:x.correct_answers,started_at:x.started_at,ended_at:x.ended_at,notes:x.notes}))};
  }

  function render(r){
    const s=r.summary||{};$('#r422Questions').textContent=s.total_questions||0;$('#r422Accuracy').textContent=`${s.total_accuracy||0}%`;$('#r422Minutes').textContent=`${s.study_minutes||0} min`;$('#r422ReviewTopics').textContent=s.pending_review_topics||0;$('#r422Active').textContent=s.active_plan_items||0;
    const active=(r.current_plan||[]).filter(x=>['pending','in_progress'].includes(x.status)).slice(0,10);
    $('#r422Plan').innerHTML=active.length?active.map(x=>`<div class="r422-row"><strong>${esc(x.subject)} • ${esc(x.code||'')}</strong><small>${esc(x.topic)}<br>${fmtDate(`${x.date}T12:00:00Z`)} • ${x.type==='review'?`revisão • ${x.minutes} min`:`${x.progress}/${x.target} questões`}${x.original_date?` • veio de ${fmtDate(`${x.original_date}T12:00:00Z`)}`:''}</small></div>`).join(''):'<div class="empty-state">Cronograma ativo em dia.</div>';
    const weak=(r.topic_performance||[]).filter(x=>x.evidence>=5).sort((a,b)=>a.performance-b.performance||b.evidence-a.evidence).slice(0,8);
    $('#r422Weak').innerHTML=weak.length?weak.map(x=>`<div class="r422-row"><strong>${esc(x.code?x.code+' • ':'')}${esc(x.topic)}</strong><small>${x.performance}% • ${x.evidence} evidências • tendência ${esc(x.trend)}</small></div>`).join(''):'<div class="empty-state">Ainda não há amostra suficiente.</div>';
  }
  async function refresh(showToast=false){try{const r=await loadData();render(r);if(showToast)toast('Relatório atualizado.','ok');return r;}catch(e){console.error(e);toast(e?.message||'Erro ao atualizar relatório.','error');throw e;}}

  function textReport(r){const s=r.summary||{},lines=['MENTOR IA - RELATÓRIO DE ESTUDOS V4.22',`Gerado em: ${new Date(r.generated_at).toLocaleString('pt-BR')}`,'',`Questões registradas: ${s.total_questions||0}`,`Acertos: ${s.total_correct||0}`,`Taxa geral: ${s.total_accuracy||0}%`,`Tempo registrado: ${s.study_minutes||0} min`,`Assuntos a revisar: ${s.pending_review_topics||0}`,`Eventos de revisão: ${s.pending_review_events||0}`,`Tarefas ativas: ${s.active_plan_items||0}`,'','DESEMPENHO POR MATÉRIA'];(r.by_subject||[]).forEach(x=>lines.push(`${x.subject}: ${x.questions} questões | ${x.accuracy}%`));const active=(r.current_plan||[]).filter(x=>['pending','in_progress'].includes(x.status));if(active.length){lines.push('','CRONOGRAMA ATIVO');active.forEach(x=>lines.push(`${x.date} | ${x.subject} | ${x.code} ${x.topic} | ${x.type==='review'?'revisão':`${x.progress}/${x.target} questões`}`));}return lines.join('\r\n');}
  function parentText(name,content,mime){if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mentor-download-text',name,mime,content},location.origin);return;}const b=new Blob([content],{type:mime}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);}
  function parentBinary(name,buffer,mime){if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mentor-download-binary',name,mime,buffer},location.origin,[buffer]);return;}const b=new Blob([buffer],{type:mime}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);}
  function loadScript(src,id){return new Promise((resolve,reject)=>{if(document.getElementById(id)){resolve();return;}const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Gerador de PDF indisponível.'));document.head.appendChild(s);});}
  async function pdfReport(r){if(!window.jspdf?.jsPDF)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js','mentorJsPdf422');const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error('Gerador de PDF indisponível.');const doc=new JsPDF({unit:'mm',format:'a4'}),s=r.summary||{};let y=18;const line=(text,size=9,bold=false)=>{if(y>282){doc.addPage();y=18;}doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const rows=doc.splitTextToSize(String(text),182);rows.forEach(t=>{doc.text(t,14,y);y+=size*.45+1.5;});};doc.setFillColor(255,204,0);doc.rect(0,0,210,10,'F');y=22;line('Mentor IA - Relatório de Estudos',19,true);line(`Gerado em ${new Date(r.generated_at).toLocaleString('pt-BR')}`,9);y+=3;line(`Questões: ${s.total_questions||0}   |   Acerto geral: ${s.total_accuracy||0}%   |   Tempo: ${s.study_minutes||0} min`,11,true);line(`Assuntos a revisar: ${s.pending_review_topics||0}   |   Eventos de revisão: ${s.pending_review_events||0}   |   Tarefas ativas: ${s.active_plan_items||0}`,9);y+=5;line('Desempenho por matéria',12,true);(r.by_subject||[]).forEach(x=>line(`${x.subject}: ${x.questions} questões | ${x.accuracy}%`));y+=5;line('Assuntos que pedem atenção',12,true);const weak=(r.topic_performance||[]).filter(x=>x.evidence>=5).sort((a,b)=>a.performance-b.performance).slice(0,10);if(!weak.length)line('Sem amostra suficiente.');else weak.forEach(x=>line(`${x.code?x.code+' - ':''}${x.topic}: ${x.performance}% | ${x.evidence} evidências`));y+=5;line('Cronograma ativo',12,true);const active=(r.current_plan||[]).filter(x=>['pending','in_progress'].includes(x.status)).slice(0,20);if(!active.length)line('Nenhuma tarefa ativa.');else active.forEach(x=>line(`${x.date} | ${x.subject} | ${x.code} ${x.topic} | ${x.type==='review'?'revisão':`${x.progress}/${x.target} questões`}`));return doc.output('arraybuffer');}
  async function download(kind){const b=$(`#r422${kind[0].toUpperCase()+kind.slice(1)}`);if(b)b.disabled=true;try{const r=await loadData(),d=dateKey();if(kind==='json')parentText(`mentor-ia-relatorio-${d}.json`,JSON.stringify(r,null,2),'application/json;charset=utf-8');else if(kind==='txt')parentText(`mentor-ia-resumo-${d}.txt`,textReport(r),'text/plain;charset=utf-8');else parentBinary(`mentor-ia-relatorio-${d}.pdf`,await pdfReport(r),'application/pdf');toast(`Relatório ${kind.toUpperCase()} gerado.`,'ok');}catch(e){console.error(e);toast(e?.message||'Erro ao gerar relatório.','error');}finally{if(b)b.disabled=false;}}

  function open(){injectPage();$$('.page').forEach(p=>p.classList.remove('active'));$$('.v49-material-page').forEach(p=>p.classList.remove('active'));$('#mentorReportV422')?.classList.add('active');if($('#topbarPageTitle'))$('#topbarPageTitle').textContent='Relatórios';if($('#topbarPageSubtitle'))$('#topbarPageSubtitle').textContent='Desempenho e cronograma sem ruído';history.replaceState(null,'','#reports');$('#appShell')?.classList.remove('menu-open');window.scrollTo({top:0,behavior:'smooth'});refresh(false).catch(()=>{});}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-v417-report]');if(!b)return;e.preventDefault();e.stopPropagation();open();},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#reports')open();});
  let tries=0;const timer=setInterval(()=>{tries++;if($('#appShell')&&$('main.content')){clearInterval(timer);injectPage();if(location.hash==='#reports')open();}if(tries>160)clearInterval(timer);},180);
})();