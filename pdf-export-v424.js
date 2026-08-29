(() => {
  'use strict';
  if (window.__mentorPdfV424) return;
  window.__mentorPdfV424 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;

  const $=s=>document.querySelector(s);
  const pct=(a,b)=>b?Math.round(Number(a||0)/Number(b)*1000)/10:0;
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const fmtDate=v=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v));

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__mentorPdfV424Toast);window.__mentorPdfV424Toast=setTimeout(()=>n.classList.remove('show'),4200);
  }

  function postBinary(name,buffer,mime='application/pdf'){
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'mentor-download-binary',name,mime,buffer},location.origin,[buffer]);
      return;
    }
    const url=URL.createObjectURL(new Blob([buffer],{type:mime}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  function loadExternal(src,id){
    return new Promise((resolve,reject)=>{
      const old=document.getElementById(id);
      if(old){if(window.jspdf?.jsPDF)return resolve();old.remove();}
      const s=document.createElement('script');s.id=id;s.src=src;s.async=true;
      s.onload=()=>window.jspdf?.jsPDF?resolve():reject(new Error('Biblioteca de PDF carregou sem o gerador esperado.'));
      s.onerror=()=>{s.remove();reject(new Error('Falha ao carregar biblioteca de PDF.'));};
      document.head.appendChild(s);
    });
  }

  async function ensureJsPdf(){
    if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
    const sources=[
      ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','mentorJsPdfV424Cdnjs'],
      ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','mentorJsPdfV424Jsdelivr']
    ];
    let last=null;
    for(const [src,id] of sources){
      try{await loadExternal(src,id);if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;}catch(e){last=e;console.warn('PDF fallback:',e);}
    }
    throw last||new Error('Não foi possível carregar o gerador de PDF.');
  }

  async function loadPdfData(){
    const {data:{user},error:ue}=await db.auth.getUser();
    if(ue||!user)throw new Error('Entre na sua conta para gerar o PDF.');
    const today=dateKey();
    const [subR,topR,attR,extR,sesR,revR,planR]=await Promise.all([
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code').order('position'),
      db.from('question_attempts').select('subject_id,topic_id,is_correct').eq('user_id',user.id).limit(3000),
      db.from('external_practice_batches').select('subject_id,topic_id,total_questions,correct_count,notes').eq('user_id',user.id).limit(1500),
      db.from('study_sessions').select('duration_minutes,duration_seconds').eq('user_id',user.id).limit(1500),
      db.from('reviews').select('topic_id,due_at,status').eq('user_id',user.id).eq('status','pending').order('due_at',{ascending:true}).limit(2000),
      db.from('study_plan_items').select('scheduled_for,topic_id,task_type,question_target,progress_count,duration_minutes,status,carried_from_date,sort_order').eq('user_id',user.id).gte('scheduled_for',today).in('status',['pending','in_progress','completed']).order('scheduled_for').order('sort_order').limit(1000)
    ]);
    for(const r of [subR,topR,attR,extR,sesR,revR,planR])if(r.error)throw r.error;
    const subjects=subR.data||[],topics=topR.data||[],attempts=attR.data||[],external=extR.data||[],sessions=sesR.data||[],reviews=revR.data||[],plan=planR.data||[];
    const subMap=new Map(subjects.map(x=>[x.id,x.name])),topMap=new Map(topics.map(x=>[x.id,x]));
    const intCorrect=attempts.filter(x=>x.is_correct).length;
    const extQuestions=external.reduce((n,x)=>n+Number(x.total_questions||0),0);
    const extCorrect=external.reduce((n,x)=>n+Number(x.correct_count||0),0);
    const total=attempts.length+extQuestions,correct=intCorrect+extCorrect;
    const studySeconds=sessions.reduce((n,x)=>n+(Number(x.duration_seconds)||Number(x.duration_minutes||0)*60),0);
    const reviewTopics=new Set(reviews.map(x=>x.topic_id).filter(Boolean));
    const bySubject=subjects.map(s=>{
      const ia=attempts.filter(x=>x.subject_id===s.id),ex=external.filter(x=>x.subject_id===s.id);
      const q=ia.length+ex.reduce((n,x)=>n+Number(x.total_questions||0),0);
      const c=ia.filter(x=>x.is_correct).length+ex.reduce((n,x)=>n+Number(x.correct_count||0),0);
      return {subject:s.name,questions:q,correct:c,errors:q-c,accuracy:pct(c,q)};
    }).filter(x=>x.questions).sort((a,b)=>b.questions-a.questions);
    const topicAgg=new Map();
    const add=(topicId,q,c)=>{if(!topicId)return;const g=topicAgg.get(topicId)||{q:0,c:0};g.q+=q;g.c+=c;topicAgg.set(topicId,g);};
    attempts.forEach(x=>add(x.topic_id,1,x.is_correct?1:0));external.forEach(x=>add(x.topic_id,Number(x.total_questions||0),Number(x.correct_count||0)));
    const weak=[...topicAgg].map(([id,g])=>{const t=topMap.get(id);return{code:t?.syllabus_code||'',topic:t?.title||'',subject:subMap.get(t?.subject_id)||'',questions:g.q,accuracy:pct(g.c,g.q)};}).filter(x=>x.questions>=5).sort((a,b)=>a.accuracy-b.accuracy||b.questions-a.questions).slice(0,12);
    const active=plan.filter(x=>['pending','in_progress'].includes(x.status)).map(x=>{const t=topMap.get(x.topic_id);return{date:x.scheduled_for,subject:subMap.get(t?.subject_id)||'',code:t?.syllabus_code||'',topic:t?.title||'',type:x.task_type,target:Number(x.question_target||0),progress:Number(x.progress_count||0),minutes:Number(x.duration_minutes||0),carried:x.carried_from_date||null};}).slice(0,24);
    return {generatedAt:new Date(),summary:{questions:total,correct,errors:total-correct,accuracy:pct(correct,total),studyMinutes:Math.round(studySeconds/60),reviewTopics:reviewTopics.size,reviewEvents:reviews.length,activeItems:active.length},bySubject,weak,active};
  }

  function safeText(value){return String(value??'').replace(/[\u2013\u2014]/g,'-').replace(/\u2022/g,'-');}

  async function makePdf(data){
    const JsPDF=await ensureJsPdf();
    const doc=new JsPDF({unit:'mm',format:'a4',compress:true});
    const s=data.summary;let y=18;
    const pageBottom=282;
    const line=(text,size=9,bold=false,space=1.5)=>{
      doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
      const rows=doc.splitTextToSize(safeText(text),182);
      for(const row of rows){if(y>pageBottom){doc.addPage();y=18;}doc.text(row,14,y);y+=size*.42+space;}
    };
    const section=title=>{y+=3;line(title,12,true,2);};
    doc.setFillColor(242,197,0);doc.rect(0,0,210,10,'F');
    y=22;line('Mentor IA - Relatorio de Estudos',19,true,2);
    line(`Gerado em ${data.generatedAt.toLocaleString('pt-BR')}`,9,false,2);y+=2;
    line(`Questoes: ${s.questions}   |   Acertos: ${s.correct}   |   Erros: ${s.errors}   |   Taxa: ${s.accuracy}%`,11,true,2);
    line(`Tempo registrado: ${s.studyMinutes} min   |   Assuntos a revisar: ${s.reviewTopics}   |   Tarefas ativas: ${s.activeItems}`,9,false,2);
    section('Desempenho por disciplina');
    data.bySubject.forEach(x=>line(`${x.subject}: ${x.questions} questoes | ${x.correct} acertos | ${x.errors} erros | ${x.accuracy}%`));
    section('Assuntos que pedem atencao');
    if(!data.weak.length)line('Sem amostra suficiente.');
    else data.weak.forEach(x=>line(`${x.code?x.code+' - ':''}${x.topic}: ${x.accuracy}% em ${x.questions} questoes`));
    section('Cronograma ativo');
    if(!data.active.length)line('Nenhuma tarefa ativa.');
    else data.active.forEach(x=>line(`${fmtDate(`${x.date}T12:00:00Z`)} | ${x.subject} | ${x.code} ${x.topic} | ${x.type==='review'?'revisao':`${x.progress}/${x.target} questoes`}${x.carried?' | atividade trazida de dia anterior':''}`));
    return doc.output('arraybuffer');
  }

  async function exportPdf(button){
    if(button.disabled)return;
    button.disabled=true;const old=button.textContent;button.textContent='Gerando PDF...';
    try{
      const data=await loadPdfData();const buffer=await makePdf(data);
      postBinary(`mentor-ia-relatorio-${dateKey()}.pdf`,buffer,'application/pdf');
      toast('Relatório PDF gerado.','ok');
    }catch(e){console.error('PDF V4.24:',e);toast(`PDF: ${e?.message||'não foi possível gerar.'}`,'error');}
    finally{button.disabled=false;button.textContent=old;}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('#r422Pdf');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();exportPdf(b);
  },true);
})();