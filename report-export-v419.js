(() => {
  'use strict';
  if (window.__mentorReportV419) return;
  window.__mentorReportV419 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const pct=(a,b)=>b?Math.round((Number(a||0)/Number(b))*1000)/10:0;
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const fmtDate=v=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');n.style.zIndex='100500';n.style.bottom='90px';
    clearTimeout(window.__reportV419Toast);window.__reportV419Toast=setTimeout(()=>n.classList.remove('show'),4500);
  }
  function setStatus(text,error=false){const s=$('#v417Status');if(!s)return;s.textContent=text;s.classList.toggle('error',!!error);}

  async function loadData(){
    const {data:{user},error:ue}=await db.auth.getUser();if(ue||!user)throw new Error('Entre na sua conta para gerar o relatório.');
    const today=dateKey();
    const [prefsR,subR,topR,attR,extR,sesR,revR,masR,planR]=await Promise.all([
      db.from('study_preferences').select('daily_minutes,study_days,review_ratio,buffer_percent,timezone').eq('user_id',user.id).maybeSingle(),
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,parent_topic_id,is_official_syllabus').order('position'),
      db.from('question_attempts').select('question_id,subject_id,topic_id,is_correct,response_time_seconds,confidence,error_type,answered_at,source_kind').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(3000),
      db.from('external_practice_batches').select('id,source_kind,subject_id,topic_id,total_questions,correct_count,confidence,duration_minutes,practiced_at,notes').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(1500),
      db.from('study_sessions').select('subject_id,topic_id,started_at,ended_at,duration_minutes,duration_seconds,questions_answered,correct_answers,activity_type,notes').eq('user_id',user.id).order('started_at',{ascending:false}).limit(1500),
      db.from('reviews').select('topic_id,due_at,status,trigger_reason,created_at').eq('user_id',user.id).order('due_at',{ascending:true}).limit(2000),
      db.from('topic_mastery').select('topic_id,mastery_score,attempts_count,correct_count,confidence_score,trend,last_attempt_at').eq('user_id',user.id),
      db.from('study_plan_items').select('scheduled_for,topic_id,task_type,question_target,progress_count,duration_minutes,status,source_reason,carried_from_date,completed_at,sort_order').eq('user_id',user.id).gte('scheduled_for',today).order('scheduled_for').order('sort_order').limit(1000)
    ]);
    for(const r of [prefsR,subR,topR,attR,extR,sesR,revR,masR,planR])if(r.error)throw r.error;
    const subjects=subR.data||[],topics=topR.data||[],attempts=attR.data||[],external=extR.data||[],sessions=sesR.data||[],reviews=revR.data||[],mastery=masR.data||[],plan=planR.data||[];
    const subMap=new Map(subjects.map(x=>[x.id,x.name])),topMap=new Map(topics.map(x=>[x.id,x]));
    const externalQ=external.reduce((s,x)=>s+Number(x.total_questions||0),0),externalC=external.reduce((s,x)=>s+Number(x.correct_count||0),0);
    const internalC=attempts.filter(x=>x.is_correct).length,totalQ=attempts.length+externalQ,totalC=internalC+externalC;
    const studySeconds=sessions.reduce((s,x)=>s+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0);
    const pendingReviews=reviews.filter(x=>x.status==='pending');
    const bySubject=subjects.map(s=>{
      const ia=attempts.filter(x=>x.subject_id===s.id),ex=external.filter(x=>x.subject_id===s.id),ss=sessions.filter(x=>x.subject_id===s.id);
      const q=ia.length+ex.reduce((n,x)=>n+Number(x.total_questions||0),0),c=ia.filter(x=>x.is_correct).length+ex.reduce((n,x)=>n+Number(x.correct_count||0),0);
      const times=ia.map(x=>Number(x.response_time_seconds||0)).filter(x=>x>=5&&x<=900).sort((a,b)=>a-b);
      const secs=ss.reduce((n,x)=>n+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0);
      return{subject:s.name,questions:q,correct:c,accuracy:pct(c,q),study_minutes:Math.round(secs/60),median_seconds:times.length?times[Math.floor(times.length/2)]:null};
    }).filter(x=>x.questions||x.study_minutes);
    const topicPerformance=mastery.map(m=>{const t=topMap.get(m.topic_id);return{subject:subMap.get(t?.subject_id)||'',code:t?.syllabus_code||'',topic:t?.title||'Assunto',performance:Number(m.mastery_score||0),evidence:Number(m.attempts_count||0),correct:Number(m.correct_count||0),confidence:Number(m.confidence_score||0),trend:m.trend||'stable'};});
    const namedPlan=plan.map(x=>{const t=topMap.get(x.topic_id);return{date:x.scheduled_for,subject:subMap.get(t?.subject_id)||'',topic:t?.title||'',code:t?.syllabus_code||'',type:x.task_type,target:x.question_target||0,progress:x.progress_count||0,minutes:x.duration_minutes||0,status:x.status,original_date:x.carried_from_date||null};});
    return{schema:'mentor-ia-study-report-v4',generated_at:new Date().toISOString(),timezone:TZ,privacy_note:'Relatório sem e-mail, senha ou identificador da conta.',preferences:prefsR.data||{},summary:{internal_questions:attempts.length,internal_correct:internalC,internal_accuracy:pct(internalC,attempts.length),external_questions:externalQ,external_correct:externalC,external_accuracy:pct(externalC,externalQ),total_questions:totalQ,total_correct:totalC,total_accuracy:pct(totalC,totalQ),study_seconds:studySeconds,study_minutes:Math.round(studySeconds/60),pending_reviews:pendingReviews.length,planned_items:plan.length},by_subject:bySubject,topic_performance:topicPerformance,recent_internal_attempts:attempts.slice(0,500).map(a=>({subject:subMap.get(a.subject_id)||'',topic:topMap.get(a.topic_id)?.title||'',topic_code:topMap.get(a.topic_id)?.syllabus_code||'',correct:!!a.is_correct,response_time_seconds:a.response_time_seconds,confidence:a.confidence,error_type:a.error_type,answered_at:a.answered_at,source_kind:a.source_kind})),recent_external_batches:external.slice(0,350).map(x=>({subject:subMap.get(x.subject_id)||'',topic:topMap.get(x.topic_id)?.title||'',topic_code:topMap.get(x.topic_id)?.syllabus_code||'',source_kind:x.source_kind,total_questions:x.total_questions,correct_count:x.correct_count,accuracy_percent:pct(x.correct_count,x.total_questions),duration_minutes:x.duration_minutes,confidence:x.confidence,practiced_at:x.practiced_at,notes:x.notes})),recent_study_sessions:sessions.slice(0,350).map(x=>({subject:subMap.get(x.subject_id)||'',topic:topMap.get(x.topic_id)?.title||'',topic_code:topMap.get(x.topic_id)?.syllabus_code||'',activity_type:x.activity_type,duration_seconds:Number(x.duration_seconds)||Number(x.duration_minutes||0)*60,duration_minutes:x.duration_minutes,questions_answered:x.questions_answered,correct_answers:x.correct_answers,started_at:x.started_at,ended_at:x.ended_at,notes:x.notes})),pending_reviews:pendingReviews.slice(0,350).map(x=>({subject:subMap.get(topMap.get(x.topic_id)?.subject_id)||'',topic:topMap.get(x.topic_id)?.title||'',topic_code:topMap.get(x.topic_id)?.syllabus_code||'',due_at:x.due_at,trigger_reason:x.trigger_reason})),current_plan:namedPlan};
  }

  function txtSummary(r){
    const s=r.summary||{};const lines=['MENTOR IA - RESUMO DE ESTUDOS',`Gerado em: ${fmtDate(r.generated_at)}`,'',`Questões registradas: ${s.total_questions||0}`,`Acertos: ${s.total_correct||0}`,`Taxa geral: ${s.total_accuracy||0}%`,`Tempo estudado: ${s.study_minutes||0} min`,`Revisões pendentes: ${s.pending_reviews||0}`,'','DESEMPENHO POR MATÉRIA'];
    (r.by_subject||[]).forEach(x=>lines.push(`${x.subject}: ${x.questions} questões | ${x.accuracy}% | ${x.study_minutes} min | mediana ${x.median_seconds??'-'}s/questão`));
    const weak=(r.topic_performance||[]).filter(x=>x.evidence>=5).sort((a,b)=>a.performance-b.performance).slice(0,10);
    if(weak.length){lines.push('','ASSUNTOS QUE MAIS PRECISAM DE ATENÇÃO');weak.forEach(x=>lines.push(`${x.code?x.code+' - ':''}${x.topic}: ${x.performance}% | ${x.evidence} evidências | tendência ${x.trend}`));}
    lines.push('','Arquivo completo: use o relatório JSON para análise detalhada de tentativas, sessões, revisões e cronograma.');return lines.join('\r\n');
  }

  function parentDownload(name,content,mime){
    try{
      if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mentor-download-text',name,mime,content},location.origin);return true;}
    }catch{}
    try{const blob=new Blob([content],{type:mime});const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>window.URL.revokeObjectURL(url),2000);return true;}catch{return false;}
  }

  function parentDownloadBinary(name,buffer,mime){
    try{
      if(window.parent&&window.parent!==window){window.parent.postMessage({type:'mentor-download-binary',name,mime,buffer},location.origin,[buffer]);return true;}
    }catch{}
    try{const blob=new Blob([buffer],{type:mime});const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>window.URL.revokeObjectURL(url),2000);return true;}catch{return false;}
  }

  function loadScript(src,id){return new Promise((resolve,reject)=>{if(document.getElementById(id)){resolve();return;}const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o gerador de PDF.'));document.head.appendChild(s);});}
  async function ensureJsPDF(){if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js','mentorJsPDF');if(!window.jspdf?.jsPDF)throw new Error('Gerador de PDF indisponível.');return window.jspdf.jsPDF;}

  function safeText(v=''){return String(v??'').replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ').trim();}
  function fit(doc,text,maxWidth){return doc.splitTextToSize(safeText(text),maxWidth);}
  function addPageHeader(doc,pageNo){doc.setFillColor(255,204,0);doc.rect(0,0,210,14,'F');doc.setTextColor(20,20,20);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('MENTOR IA - PMBA 2026',14,9);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(`Página ${pageNo}`,196,9,{align:'right'});doc.setTextColor(20,20,20);}
  function ensureSpace(doc,y,need,page){if(y+need<=282)return{y,page};doc.addPage();page++;addPageHeader(doc,page);return{y:24,page};}
  function card(doc,x,y,w,h,label,value){doc.setDrawColor(225);doc.setFillColor(249,249,249);doc.roundedRect(x,y,w,h,3,3,'FD');doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(95);doc.text(label,x+4,y+6);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(20);doc.text(String(value),x+4,y+16);}
  function barChart(doc,title,rows,valueKey,suffix='',maxValue=null){
    let y=doc.lastAutoY||0;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(20);doc.text(title,14,y);y+=7;
    const list=rows.slice(0,12);const max=maxValue??Math.max(1,...list.map(r=>Number(r[valueKey]||0)));
    list.forEach(r=>{const label=safeText(r.subject||r.label||'');const val=Number(r[valueKey]||0);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(70);const lbl=label.length>30?label.slice(0,29)+'…':label;doc.text(lbl,14,y+3.5);doc.setFillColor(235,235,235);doc.roundedRect(72,y,100,5,1,1,'F');doc.setFillColor(255,196,0);doc.roundedRect(72,y,Math.max(1,100*Math.min(1,val/max)),5,1,1,'F');doc.setFont('helvetica','bold');doc.setTextColor(30);doc.text(`${val}${suffix}`,176,y+3.7);y+=9;});doc.lastAutoY=y+5;return y+5;
  }

  async function buildPdf(r){
    const JsPDF=await ensureJsPDF();const doc=new JsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});let page=1;addPageHeader(doc,page);
    doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text('Relatório de Estudos',14,30);doc.setFontSize(11);doc.setFont('helvetica','normal');doc.setTextColor(90);doc.text(`Gerado em ${fmtDate(r.generated_at)}`,14,37);doc.text('Desempenho, ritmo, revisões e planejamento',14,43);doc.setTextColor(20);
    const s=r.summary||{};card(doc,14,52,43,24,'Questões',s.total_questions||0);card(doc,61,52,43,24,'Acerto geral',`${s.total_accuracy||0}%`);card(doc,108,52,43,24,'Tempo estudado',`${s.study_minutes||0} min`);card(doc,155,52,41,24,'Revisões',s.pending_reviews||0);
    doc.lastAutoY=88;barChart(doc,'Taxa de acerto por matéria',r.by_subject||[],'accuracy','%',100);
    let pos=ensureSpace(doc,doc.lastAutoY,115,page);page=pos.page;doc.lastAutoY=pos.y;barChart(doc,'Questões registradas por matéria',r.by_subject||[],'questions','');
    pos=ensureSpace(doc,doc.lastAutoY,115,page);page=pos.page;doc.lastAutoY=pos.y;barChart(doc,'Tempo estudado por matéria',r.by_subject||[],'study_minutes',' min');

    const weak=(r.topic_performance||[]).filter(x=>x.evidence>=5).sort((a,b)=>a.performance-b.performance).slice(0,10);
    pos=ensureSpace(doc,doc.lastAutoY,50,page);page=pos.page;let y=pos.y;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Assuntos que mais precisam de atenção',14,y);y+=7;
    if(!weak.length){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Ainda não há amostra suficiente para apontar fraquezas com segurança.',14,y);y+=8;}else{
      weak.forEach((x,i)=>{pos=ensureSpace(doc,y,15,page);y=pos.y;page=pos.page;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(`${i+1}. ${safeText(x.code?x.code+' - ':'')}${safeText(x.topic).slice(0,75)}`,14,y);doc.setFont('helvetica','normal');doc.setTextColor(80);doc.text(`${x.performance}% de desempenho | ${x.evidence} evidências | confiança ${x.confidence}% | tendência ${x.trend}`,18,y+5);doc.setTextColor(20);y+=11;});}

    const strong=(r.topic_performance||[]).filter(x=>x.evidence>=10&&x.performance>=80).sort((a,b)=>b.performance-a.performance||b.evidence-a.evidence).slice(0,8);
    pos=ensureSpace(doc,y,40,page);y=pos.y;page=pos.page;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Assuntos bem encaminhados',14,y);y+=7;
    if(!strong.length){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Nenhum assunto atingiu ainda o critério de amostra + 80% de desempenho.',14,y);y+=8;}else strong.forEach(x=>{pos=ensureSpace(doc,y,11,page);y=pos.y;page=pos.page;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`• ${safeText(x.code?x.code+' - ':'')}${safeText(x.topic).slice(0,80)} - ${x.performance}% (${x.evidence} evidências)`,14,y);y+=7;});

    pos=ensureSpace(doc,y,55,page);y=pos.y;page=pos.page;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Situação do planejamento',14,y);y+=7;const active=(r.current_plan||[]).filter(x=>['pending','in_progress'].includes(x.status));const completed=(r.current_plan||[]).filter(x=>x.status==='completed');doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`Itens ativos: ${active.length} | concluídos no recorte: ${completed.length} | revisões pendentes: ${s.pending_reviews||0}`,14,y);y+=8;
    active.slice(0,12).forEach(x=>{pos=ensureSpace(doc,y,10,page);y=pos.y;page=pos.page;const detail=x.type==='questions'?`${x.progress}/${x.target} questões`:`${x.minutes} min`;doc.text(`${x.date} • ${safeText(x.subject)} • ${safeText(x.code||'')} ${safeText(x.topic).slice(0,62)} • ${detail}`,14,y);y+=6;});

    pos=ensureSpace(doc,y,32,page);y=pos.y;page=pos.page;doc.setDrawColor(225);doc.line(14,y,196,y);y+=8;doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Leitura correta dos números',14,y);y+=6;doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(75);const note='Percentuais com poucas evidências não significam domínio. A Mentora considera quantidade de evidências, tendência, revisões pendentes e desempenho antes de concluir que um assunto está consolidado.';fit(doc,note,182).forEach(line=>{doc.text(line,14,y);y+=4.5;});doc.setTextColor(20);
    return doc.output('arraybuffer');
  }

  async function doDownload(kind){
    const btn=kind==='json'?$('#v417DownloadJson'):kind==='txt'?$('#v417DownloadTxt'):$('#v419DownloadPdf');
    if(btn)btn.disabled=true;setStatus(kind==='pdf'?'Montando PDF com gráficos…':'Gerando arquivo…');
    try{
      const r=await loadData();const d=dateKey();
      if(kind==='json'){const ok=parentDownload(`mentor-ia-relatorio-${d}.json`,JSON.stringify(r,null,2),'application/json;charset=utf-8');if(!ok)throw new Error('O navegador bloqueou o download.');}
      if(kind==='txt'){const ok=parentDownload(`mentor-ia-resumo-${d}.txt`,txtSummary(r),'text/plain;charset=utf-8');if(!ok)throw new Error('O navegador bloqueou o download.');}
      if(kind==='pdf'){const buffer=await buildPdf(r);const ok=parentDownloadBinary(`mentor-ia-relatorio-${d}.pdf`,buffer,'application/pdf');if(!ok)throw new Error('O navegador bloqueou o PDF.');}
      setStatus(`Arquivo ${kind.toUpperCase()} gerado com sucesso.`);toast(`Relatório ${kind.toUpperCase()} gerado.`,'ok');
    }catch(e){console.error(e);setStatus(e?.message||'Erro ao gerar o arquivo.',true);toast(e?.message||'Erro ao gerar o arquivo.','error');}
    finally{if(btn)btn.disabled=false;}
  }

  function patch(){
    const page=$('#v417ReportPage');if(!page)return false;
    const json=$('#v417DownloadJson'),txt=$('#v417DownloadTxt'),actions=page.querySelector('.v417-actions');
    if(json)json.onclick=()=>doDownload('json');if(txt)txt.onclick=()=>doDownload('txt');
    if(actions&&!$('#v419DownloadPdf')){const b=document.createElement('button');b.id='v419DownloadPdf';b.className='secondary-button';b.textContent='⬇ Baixar relatório em PDF';b.onclick=()=>doDownload('pdf');actions.insertBefore(b,$('#v417Refresh'));}
    const note=page.querySelector('.v417-note');if(note)note.innerHTML='<b>Para me enviar:</b> use o JSON para análise mais profunda. O TXT é um resumo simples. O PDF é uma versão visual, com gráficos e leitura rápida do desempenho. Nenhum deles inclui senha, e-mail ou ID da conta.';
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(patch())clearInterval(timer);if(tries>200)clearInterval(timer);},200);
  document.addEventListener('click',e=>{if(e.target.closest('[data-v417-report]'))setTimeout(patch,120);},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#reports')setTimeout(patch,120);});
})();