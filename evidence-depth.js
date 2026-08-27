(() => {
  'use strict';

  const VERSION='2.0.0';
  const TARGET=10;
  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';

  let db=null,user=null,busy=false,patchTimer=null,applying=false,lastQcTopic=null;
  let topics=[],subjects=[];
  let metrics=new Map(),bankAvailable=new Map();

  const $=s=>document.querySelector(s);
  const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n||0));
  const pct=(a,b)=>b?Math.round(Number(a||0)/Number(b)*100):0;
  const dayKey=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):'';
  const setText=(node,text)=>{if(node&&node.textContent!==text)node.textContent=text;};
  const setHtml=(node,html)=>{if(node&&node.innerHTML!==html)node.innerHTML=html;};
  const subjectById=id=>subjects.find(s=>s.id===id);

  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ensureMapList(map,key){if(!map.has(key))map.set(key,[]);return map.get(key);}
  function mFor(topicId){return metrics.get(topicId)||{topic_id:topicId,evidence:0,accuracy:0,confidence:0,internalDistinct:0,rawInternal:0,external:0,correct:0,studyDays:0,dueReviews:0,measured:false,consolidated:false};}
  function remaining(topicId){return Math.max(0,TARGET-mFor(topicId).evidence);}

  async function ensureDb(){
    if(db)return db;
    if(window.supabase?.createClient){db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return db;}
    return null;
  }

  async function refresh(){
    if(busy)return;
    busy=true;
    try{
      const client=await ensureDb();if(!client)return;
      const session=(await client.auth.getSession()).data?.session;user=session?.user||null;if(!user)return;
      const [topicsR,subjectsR,masteryR,attemptsR,externalR,questionsR,reviewsR]=await Promise.all([
        client.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
        client.from('subjects').select('id,name,position').eq('active',true).order('position'),
        client.from('topic_mastery').select('topic_id,mastery_score,confidence_score,attempts_count,correct_count,trend').eq('user_id',user.id),
        client.from('question_attempts').select('id,question_id,topic_id,is_correct,answered_at').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(3000),
        client.from('external_practice_batches').select('topic_id,total_questions,correct_count,practiced_at').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(2000),
        client.from('questions').select('id,topic_id').not('explanation','is',null).limit(5000),
        client.from('reviews').select('topic_id,due_at,status').eq('user_id',user.id).eq('status','pending').limit(1000)
      ]);
      for(const r of [topicsR,subjectsR,masteryR,attemptsR,externalR,questionsR,reviewsR])if(r.error)throw r.error;

      topics=topicsR.data||[];subjects=subjectsR.data||[];
      const masteryByTopic=new Map((masteryR.data||[]).map(row=>[row.topic_id,row]));
      const rawByTopic=new Map(),latestByTopic=new Map(),seenByTopic=new Map();
      (attemptsR.data||[]).forEach(row=>{
        if(!row.topic_id||!row.question_id)return;
        ensureMapList(rawByTopic,row.topic_id).push(row);
        if(!seenByTopic.has(row.topic_id))seenByTopic.set(row.topic_id,new Set());
        const seen=seenByTopic.get(row.topic_id);
        if(seen.has(row.question_id))return;
        seen.add(row.question_id);ensureMapList(latestByTopic,row.topic_id).push(row);
      });
      const extByTopic=new Map();(externalR.data||[]).forEach(row=>{if(row.topic_id)ensureMapList(extByTopic,row.topic_id).push(row);});
      const dueByTopic=new Map();const now=Date.now();(reviewsR.data||[]).forEach(r=>{if(r.topic_id&&r.due_at&&new Date(r.due_at).getTime()<=now)dueByTopic.set(r.topic_id,Number(dueByTopic.get(r.topic_id)||0)+1);});
      bankAvailable=new Map();(questionsR.data||[]).forEach(row=>{if(row.topic_id)bankAvailable.set(row.topic_id,Number(bankAvailable.get(row.topic_id)||0)+1);});

      metrics=new Map();
      topics.forEach(t=>{
        const raw=rawByTopic.get(t.id)||[],latest=latestByTopic.get(t.id)||[],ext=extByTopic.get(t.id)||[];
        const external=ext.reduce((s,b)=>s+Number(b.total_questions||0),0),externalCorrect=ext.reduce((s,b)=>s+Number(b.correct_count||0),0);
        const internalCorrect=latest.filter(a=>a.is_correct).length,evidence=latest.length+external,correct=internalCorrect+externalCorrect;
        const days=new Set();latest.forEach(a=>a.answered_at&&days.add(dayKey(a.answered_at)));ext.forEach(b=>b.practiced_at&&days.add(dayKey(b.practiced_at)));
        const stored=masteryByTopic.get(t.id);const accuracy=evidence?pct(correct,evidence):0,confidence=Math.min(100,Math.round(evidence/TARGET*100));
        const dueReviews=Number(dueByTopic.get(t.id)||0),measured=evidence>=TARGET,consolidated=measured&&accuracy>=80&&days.size>=2&&dueReviews===0&&String(stored?.trend||'stable')!=='down';
        metrics.set(t.id,{topic_id:t.id,subject_id:t.subject_id,evidence,accuracy,confidence,internalDistinct:latest.length,rawInternal:raw.length,external,correct,studyDays:days.size,dueReviews,measured,consolidated,trend:stored?.trend||'stable'});
      });
      patch();
    }catch(error){console.warn('Evidence depth v2:',error);}finally{busy=false;}
  }

  function classification(m){if(!m.evidence)return'unseen';if(!m.measured)return'diagnostic';if(m.accuracy<60)return'weak';if(m.accuracy<80)return'mid';return'strong';}
  function evidenceLabel(m){if(!m.evidence)return'Sem amostra';if(!m.measured)return`Amostra ${m.evidence}/${TARGET}`;if(m.consolidated)return'Consolidado';return'Medido';}

  function patchMetrics(){
    const rows=[...metrics.values()];const evidence=rows.reduce((s,m)=>s+m.evidence,0),correct=rows.reduce((s,m)=>s+m.correct,0),measured=rows.filter(m=>m.measured).length,distinct=rows.reduce((s,m)=>s+m.internalDistinct,0),external=rows.reduce((s,m)=>s+m.external,0);
    setText($('#metricQuestions'),fmt(evidence));setText($('#metricAccuracy'),evidence?`${pct(correct,evidence)}%`:'—');setText($('#metricMeasured'),`${measured}/${topics.length}`);
    setText($('#knowAttempts'),fmt(distinct));setText($('#knowExternal'),fmt(external));setText($('#knowTopics'),fmt(measured));
  }

  function patchSyllabus(){
    document.querySelectorAll('[data-study-topic]').forEach(row=>{
      const id=row.getAttribute('data-study-topic'),m=mFor(id),cls=classification(m);
      const dot=row.querySelector('.topic-dot');if(dot){dot.classList.remove('weak','mid','strong');if(['weak','mid','strong'].includes(cls))dot.classList.add(cls);}
      const copy=row.querySelector('.topic-copy span');
      const detail=!m.evidence?'Ainda sem evidência':!m.measured?`${m.evidence}/${TARGET} evidências • desempenho atual ${m.accuracy}% • amostra em construção`:`${m.evidence} evidências • desempenho ${m.accuracy}% • ${m.consolidated?'retenção confirmada':'medido'}`;
      setText(copy,detail);
      const score=row.querySelector('.topic-score');setText(score,!m.evidence?'—':m.measured?`${m.accuracy}%`:`${m.evidence}/${TARGET}`);
      let badge=row.querySelector('.evidence-depth-badge');if(!badge){badge=document.createElement('span');badge.className='evidence-depth-badge count-pill';score?.insertAdjacentElement('beforebegin',badge);}setText(badge,evidenceLabel(m));
    });
    document.querySelectorAll('.subject-block').forEach(block=>{const rows=[...block.querySelectorAll('[data-study-topic]')];if(!rows.length)return;const done=rows.filter(row=>mFor(row.getAttribute('data-study-topic')).measured).length;setText(block.querySelector('.subject-head .count-pill'),`${done}/${rows.length} medidos`);});
  }

  function patchStudyStatus(){
    const id=$('#studyTopic')?.value,box=$('#studyTopicStatus');if(!box)return;
    if(!id){setHtml(box,'<span>Selecione um assunto. O diagnóstico só fecha após uma amostra mínima de 10 evidências distintas/externas.</span>');return;}
    const t=topics.find(x=>x.id===id),m=mFor(id),avail=Number(bankAvailable.get(id)||0),left=remaining(id);
    const perf=m.evidence?`${m.accuracy}%`:'—';
    setHtml(box,`<strong>${esc(t?.syllabus_code||'')} • ${esc(t?.title||'Assunto')}</strong><br><b>Desempenho atual:</b> ${perf} • <b>Amostra:</b> ${m.evidence}/${TARGET} • <b>Confiança da amostra:</b> ${m.confidence}%<br><small>${m.internalDistinct} questão(ões) internas distintas • ${m.rawInternal} tentativa(s) internas no histórico • ${m.external} externa(s) • ${m.studyDays} dia(s) com evidência${m.measured?` • ${m.consolidated?'consolidado':'medido, retenção ainda a confirmar'}`:` • faltam ${left}`}. Banco próprio disponível: ${avail}.</small>`);
  }

  function ensureInfoBox(after,id){let n=document.getElementById(id);if(!n&&after){n=document.createElement('div');n.id=id;n.className='topic-status';n.style.marginTop='10px';after.insertAdjacentElement('afterend',n);}return n;}
  function patchQc(){
    const id=$('#qcTopic')?.value,preview=$('#qcPreview');if(!preview)return;const box=ensureInfoBox(preview,'evidenceDepthQc');
    if(!id){setText(box,'Escolha um tópico. A meta diagnóstica é formar 10 evidências, preferencialmente com questões diferentes.');return;}
    const m=mFor(id),left=remaining(id);setHtml(box,m.measured?`<strong>${m.evidence} evidências registradas.</strong> <small>Desempenho estimado ${m.accuracy}%. Novas questões servem para reforço e retenção.</small>`:`<strong>${m.evidence}/${TARGET} evidências.</strong> <small>Faça mais ${left} questão(ões) novas/diferentes deste tópico para fechar a amostra mínima.</small>`);
    if(id!==lastQcTopic){const input=$('#qcTotal');if(input)input.value=String(left>0?left:TARGET);lastQcTopic=id;}
  }

  function patchBank(){
    const id=$('#bankTopic')?.value,helper=$('#bankMessage');if(!helper)return;
    if(!id){setText(helper,'Escolha um tópico. Questão repetida continua valendo como revisão, mas não aumenta a amostra diagnóstica.');return;}
    const m=mFor(id),avail=Number(bankAvailable.get(id)||0),left=remaining(id);
    if(m.measured)setText(helper,`Tópico medido: ${m.evidence} evidências, desempenho ${m.accuracy}%. O banco possui ${avail} questão(ões) para reforço.`);
    else setText(helper,`Amostra ${m.evidence}/${TARGET}. O banco possui ${avail} questão(ões) cadastrada(s); faltam ${left} evidência(s). Complete com questões diferentes no Banco/QConcursos.`);
  }

  function patchWeakList(){
    const node=$('#weakList');if(!node)return;
    let rows=topics.map(t=>({t,m:mFor(t.id)})).filter(x=>x.m.evidence>0);
    const measured=rows.filter(x=>x.m.measured).sort((a,b)=>a.m.accuracy-b.m.accuracy||b.m.evidence-a.m.evidence);
    const diagnostic=rows.filter(x=>!x.m.measured).sort((a,b)=>a.m.accuracy-b.m.accuracy||b.m.evidence-a.m.evidence);
    rows=(measured.length?measured:diagnostic).slice(0,4);
    if(!rows.length){setHtml(node,'<div class="empty">Resolva questões diferentes para construir seu raio-X.</div>');return;}
    setHtml(node,rows.map(({t,m})=>{const s=subjectById(t.subject_id);return `<article class="list-row"><div><strong>${esc(s?.name||'')} • ${esc(t.title)}</strong><span>${m.measured?`${m.evidence} evidências • confiança ${m.confidence}%`:`sinal inicial • ${m.evidence}/${TARGET} evidências`}</span></div><span class="list-score">${m.measured?`${m.accuracy}%`:`${m.evidence}/${TARGET}`}</span></article>`;}).join(''));
  }

  function patchLanguage(){
    const qc=$('#qcMessage');if(qc&&/domínio/i.test(qc.textContent||''))setText(qc,(qc.textContent||'').replace(/domínio/gi,'desempenho e confiança da amostra'));
    const focus=$('#mentorFocus');if(focus)focus.querySelectorAll('.list-row span').forEach(span=>{const txt=span.textContent||'';if(/domínio/i.test(txt))setText(span,txt.replace(/domínio/gi,'desempenho'));});
  }

  function patch(){
    clearTimeout(patchTimer);patchTimer=setTimeout(()=>{
      if(applying)return;applying=true;
      try{patchMetrics();patchSyllabus();patchStudyStatus();patchQc();patchBank();patchWeakList();patchLanguage();}finally{applying=false;}
    },40);
  }

  function bind(){
    ['studyTopic','qcTopic','bankTopic'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(patch,80)));
    document.addEventListener('click',event=>{if(event.target.closest('#qcRecordBtn,#bankConfirmBtn,#bankNextBtn,#refreshAllBtn'))setTimeout(refresh,900);});
    const observer=new MutationObserver(()=>{if(!applying)patch();});observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  async function boot(){for(let i=0;i<40&&!window.supabase?.createClient;i+=1)await new Promise(r=>setTimeout(r,100));bind();await refresh();setInterval(refresh,30000);}
  window.MentorEvidenceDepth=Object.freeze({version:VERSION,target:TARGET,refresh,metrics:()=>new Map(metrics)});
  boot();
})();