(() => {
  'use strict';

  const VERSION = '1.0.0';
  const TARGET = 10;
  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';

  let db = null;
  let user = null;
  let topics = [];
  let evidence = new Map();
  let bankAvailable = new Map();
  let lastQcTopic = null;
  let busy = false;
  let patchTimer = null;

  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function add(map,key,value=1){
    if(!key)return;
    map.set(key,Number(map.get(key)||0)+Number(value||0));
  }

  function countFor(topicId){ return Number(evidence.get(topicId)||0); }
  function availableFor(topicId){ return Number(bankAvailable.get(topicId)||0); }
  function remainingFor(topicId){ return Math.max(0,TARGET-countFor(topicId)); }

  async function ensureDb(){
    if(db)return db;
    if(window.supabase?.createClient){
      db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      return db;
    }
    return null;
  }

  async function refresh(){
    if(busy)return;
    busy=true;
    try{
      const client=await ensureDb();
      if(!client)return;
      const session=(await client.auth.getSession()).data?.session;
      user=session?.user||null;
      if(!user)return;

      const [topicsR,attemptsR,externalR,questionsR]=await Promise.all([
        client.from('topics').select('id,subject_id,title,syllabus_code').eq('active',true),
        client.from('question_attempts').select('topic_id').eq('user_id',user.id).limit(5000),
        client.from('external_practice_batches').select('topic_id,total_questions').eq('user_id',user.id).limit(2000),
        client.from('questions').select('id,topic_id').not('explanation','is',null).limit(5000)
      ]);
      for(const r of [topicsR,attemptsR,externalR,questionsR]) if(r.error)throw r.error;

      topics=topicsR.data||[];
      evidence=new Map();
      bankAvailable=new Map();
      (attemptsR.data||[]).forEach(row=>add(evidence,row.topic_id,1));
      (externalR.data||[]).forEach(row=>add(evidence,row.topic_id,row.total_questions));
      (questionsR.data||[]).forEach(row=>add(bankAvailable,row.topic_id,1));
      patch();
    }catch(error){
      console.warn('Evidence depth:',error);
    }finally{
      busy=false;
    }
  }

  function ensureInfoBox(afterNode,id){
    let node=document.getElementById(id);
    if(!node&&afterNode){
      node=document.createElement('div');
      node.id=id;
      node.className='topic-status';
      node.style.marginTop='10px';
      afterNode.insertAdjacentElement('afterend',node);
    }
    return node;
  }

  function patchMetrics(){
    const measured=topics.filter(t=>countFor(t.id)>=TARGET).length;
    const metric=$('#metricMeasured');
    if(metric)metric.textContent=`${measured}/${topics.length}`;
    const know=$('#knowTopics');
    if(know)know.textContent=String(measured);
  }

  function patchSyllabus(){
    document.querySelectorAll('[data-study-topic]').forEach(row=>{
      const id=row.getAttribute('data-study-topic');
      const n=countFor(id);
      const complete=n>=TARGET;
      let badge=row.querySelector('.evidence-depth-badge');
      if(!badge){
        badge=document.createElement('span');
        badge.className='evidence-depth-badge count-pill';
        const score=row.querySelector('.topic-score');
        if(score)score.insertAdjacentElement('beforebegin',badge);
        else row.appendChild(badge);
      }
      badge.textContent=complete?`MEDIDO ${n}`:`${n}/${TARGET}`;
      badge.title=complete?'Amostra mínima atingida':'Evidências necessárias para medir este tópico com mais segurança';
    });

    document.querySelectorAll('.subject-block').forEach(block=>{
      const rows=[...block.querySelectorAll('[data-study-topic]')];
      if(!rows.length)return;
      const done=rows.filter(row=>countFor(row.getAttribute('data-study-topic'))>=TARGET).length;
      const pill=block.querySelector('.subject-head .count-pill');
      if(pill)pill.textContent=`${done}/${rows.length} medidos`;
    });
  }

  function patchStudyStatus(){
    const select=$('#studyTopic');
    const topicId=select?.value;
    const base=$('#studyTopicStatus');
    if(!base)return;
    const box=ensureInfoBox(base,'evidenceDepthStudy');
    if(!topicId){ if(box)box.textContent='Meta diagnóstica: 10 questões por tópico para a IA considerar o assunto realmente medido.'; return; }
    const n=countFor(topicId),avail=availableFor(topicId),left=remainingFor(topicId);
    if(box){
      box.innerHTML=n>=TARGET
        ? `<strong>Amostra suficiente: ${n} evidências.</strong><br><small>A IA já pode usar este tópico com confiança maior no diagnóstico.</small>`
        : `<strong>Amostra em construção: ${n}/${TARGET} evidências.</strong><br><small>Banco próprio: ${avail} questão(ões) disponível(is). Faltam ${left}; complete pelo Banco ou pelo QConcursos.</small>`;
    }
  }

  function patchQc(){
    const select=$('#qcTopic');
    const topicId=select?.value;
    const preview=$('#qcPreview');
    if(!preview)return;
    const box=ensureInfoBox(preview,'evidenceDepthQc');
    if(!topicId){ if(box)box.textContent='Escolha um tópico. A meta será de 10 questões/evidências naquele assunto.'; return; }
    const n=countFor(topicId),left=remainingFor(topicId);
    if(box){
      box.innerHTML=n>=TARGET
        ? `<strong>${n} evidências já registradas neste tópico.</strong> <small>Você já atingiu a amostra mínima; novas questões servem como reforço.</small>`
        : `<strong>${n}/${TARGET} evidências.</strong> <small>Faça pelo menos mais ${left} questão(ões) deste tópico para fechar a amostra mínima.</small>`;
    }
    if(topicId!==lastQcTopic){
      const input=$('#qcTotal');
      if(input)input.value=String(left>0?left:TARGET);
      lastQcTopic=topicId;
    }
  }

  function patchBank(){
    const select=$('#bankTopic');
    const topicId=select?.value;
    const helper=$('#bankMessage');
    if(!helper)return;
    if(!topicId){
      helper.textContent='Escolha um tópico para ver a profundidade. A meta diagnóstica é 10 evidências por assunto.';
      return;
    }
    const n=countFor(topicId),avail=availableFor(topicId),left=remainingFor(topicId);
    if(n>=TARGET){
      helper.textContent=`Tópico com ${n} evidências: amostra mínima atingida. O banco possui ${avail} questão(ões) cadastrada(s) para reforço.`;
    }else if(avail>=left){
      helper.textContent=`Meta ${TARGET}: você tem ${n}. Há ${avail} questão(ões) no banco; faltam ${left} evidência(s) para medir o tópico.`;
    }else{
      helper.textContent=`Meta ${TARGET}: você tem ${n}. O banco próprio só possui ${avail} questão(ões) neste tópico; complete as ${left} evidências restantes pelo QConcursos.`;
    }
  }

  function patch(){
    clearTimeout(patchTimer);
    patchTimer=setTimeout(()=>{
      patchMetrics();
      patchSyllabus();
      patchStudyStatus();
      patchQc();
      patchBank();
    },30);
  }

  function bind(){
    ['studyTopic','qcTopic','bankTopic'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(patch,80)));
    document.addEventListener('click',event=>{
      if(event.target.closest('#qcRecordBtn,#bankConfirmBtn,#bankNextBtn,#refreshAllBtn')) setTimeout(refresh,900);
    });
    const observer=new MutationObserver(()=>patch());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  async function boot(){
    for(let i=0;i<40&&!window.supabase?.createClient;i+=1)await sleep(100);
    bind();
    await refresh();
    setInterval(refresh,30000);
  }

  window.MentorEvidenceDepth=Object.freeze({version:VERSION,target:TARGET,refresh});
  boot();
})();