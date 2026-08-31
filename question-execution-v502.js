(() => {
  'use strict';
  if(window.__mentorQuestionExecutionV502)return;
  window.__mentorQuestionExecutionV502=true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const BANK_KEY='mentor-v433-bank-task';
  const QC_KEY='mentor-v433-qc-task';
  const CONTEXT_TTL=4*60*60*1000;
  let client=null,busy=false,lastFeedback=false;
  const $=s=>document.querySelector(s);

  function db(){
    if(client)return client;
    if(!window.supabase?.createClient)throw new Error('Conexão ainda não carregou.');
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return client;
  }
  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__mentorV502Toast);window.__mentorV502Toast=setTimeout(()=>n.classList.remove('show'),3800);
  }
  function readCtx(key){
    try{const v=JSON.parse(sessionStorage.getItem(key)||'null');if(!v)return null;if(Date.now()-Number(v.created_at||0)>CONTEXT_TTL){sessionStorage.removeItem(key);return null;}return v;}catch{return null;}
  }
  function writeCtx(key,patch){const old=readCtx(key)||{};sessionStorage.setItem(key,JSON.stringify({...old,...patch,created_at:old.created_at||Date.now()}));}
  function clearCtx(key){sessionStorage.removeItem(key);}
  function emit(kind){window.MentorRequestGuard?.invalidate?.();document.dispatchEvent(new CustomEvent('mentor-evidence-changed',{detail:{kind}}));document.dispatchEvent(new CustomEvent('mentor-plan-changed',{detail:{kind}}));}

  async function loadStats(taskIds){
    const ids=[...new Set(taskIds.filter(Boolean))];if(!ids.length)return new Map();
    const c=db(),{data:{user},error:uerr}=await c.auth.getUser();if(uerr||!user)throw new Error('Sessão expirada.');
    const tr=await c.from('study_plan_items').select('id,topic_id,subtopic_id,question_target,progress_count,status,completed_at').eq('user_id',user.id).in('id',ids);if(tr.error)throw tr.error;
    const tasks=tr.data||[],topicIds=[...new Set(tasks.map(x=>x.topic_id).filter(Boolean))];
    const qr=topicIds.length?await c.from('questions').select('id,topic_id,subtopic_id').in('topic_id',topicIds):{data:[],error:null};if(qr.error)throw qr.error;
    const questions=qr.data||[],qids=questions.map(x=>x.id);let states=[];
    for(let i=0;i<qids.length;i+=300){const sr=await c.from('user_question_state').select('question_id,seen_count').eq('user_id',user.id).in('question_id',qids.slice(i,i+300));if(sr.error)throw sr.error;states.push(...(sr.data||[]));}
    const seen=new Map(states.map(x=>[x.question_id,Number(x.seen_count||0)])),out=new Map();
    for(const t of tasks){
      const scope=questions.filter(q=>q.topic_id===t.topic_id&&(!t.subtopic_id||q.subtopic_id===t.subtopic_id));
      const unseen=scope.filter(q=>!seen.get(q.id)).length,remaining=Math.max(0,Number(t.question_target||0)-Number(t.progress_count||0));
      out.set(t.id,{...t,available:scope.length,unseen,remaining,bankCount:Math.min(unseen,remaining),qcCount:Math.max(0,remaining-Math.min(unseen,remaining))});
    }
    return out;
  }

  async function decorateDaily(){
    if(busy)return;busy=true;
    try{
      const rows=[...document.querySelectorAll('.v500-step')].filter(r=>r.querySelector('[data-task-bank],[data-task-qc],[data-task-complete]'));
      const taskIds=rows.map(r=>r.querySelector('[data-task-bank]')?.dataset.taskBank||r.querySelector('[data-task-qc]')?.dataset.taskQc).filter(Boolean);
      if(!taskIds.length)return;
      const stats=await loadStats(taskIds);
      for(const row of rows){
        const oldBank=row.querySelector('[data-task-bank]'),oldQc=row.querySelector('[data-task-qc]');
        const id=oldBank?.dataset.taskBank||oldQc?.dataset.taskQc;if(!id)continue;
        const st=stats.get(id);if(!st||st.status==='completed'||st.completed_at)continue;
        const actions=row.querySelector('.v500-actions');if(!actions)continue;
        const buttons=[];
        if(st.bankCount>0)buttons.push(`<button class="primary-button" data-task-bank="${id}">Banco próprio (${st.bankCount})</button>`);
        if(st.qcCount>0)buttons.push(`<button class="${st.bankCount>0?'secondary-button':'primary-button'}" data-task-qc="${id}">QConcursos (${st.qcCount})</button>`);
        actions.innerHTML=buttons.join('')||'<span style="font-weight:900;color:#187137;font-size:11px">✓ meta preenchida</span>';
        const small=row.querySelector('small');if(small){if(!small.dataset.v502Base)small.dataset.v502Base=small.textContent||'';small.textContent=`${small.dataset.v502Base} • ${st.unseen} inédita(s) disponíveis${st.qcCount>0?` • completar ${st.qcCount} no QConcursos`:''}`;}
        row.dataset.v502QuestionTask='1';
      }
    }catch(e){console.warn('question execution decorate',e);}finally{busy=false;}
  }

  async function recordBankEvidence(){
    const ctx=readCtx(BANK_KEY);if(!ctx)return;
    const qid=$('#questionCard')?.dataset.questionId;if(!qid)return;
    try{
      const r=await db().rpc('record_plan_question_progress_v502',{p_plan_item_id:ctx.task_id,p_question_id:qid});
      if(r.error)throw r.error;const data=r.data||{};
      if(!data.ok){console.warn('question evidence rejected',data.error);return;}
      if(data.changed){writeCtx(BANK_KEY,{progress:Number(data.progress||0)});emit('question_unique');if(data.status==='completed'){clearCtx(BANK_KEY);toast('Meta de questões concluída com evidências válidas.','ok');}}
      else if(data.duplicate){toast('Questão repetida: não contou novamente na meta.','neutral');}
      setTimeout(decorateDaily,80);setTimeout(()=>guardNextButton(ctx.task_id),120);
    }catch(e){console.warn('question evidence progress',e);}
  }

  async function guardNextButton(taskId){
    const next=$('#questionNextButton');if(!next||!taskId)return;
    try{
      const st=(await loadStats([taskId])).get(taskId);if(!st)return;
      if(!next.dataset.v502Text)next.dataset.v502Text=next.textContent||'Próxima questão';
      if(st.unseen<=0&&st.remaining>0){next.disabled=true;next.textContent='Sem inéditas — use o QConcursos';next.title='As questões inéditas deste recorte acabaram. Volte à Meta Diária e complete o restante no QConcursos.';}
      else{next.disabled=false;next.textContent=next.dataset.v502Text;next.removeAttribute('title');}
    }catch(e){console.warn('next guard',e);}
  }

  function bindFeedback(){
    const node=$('#questionFeedback');if(!node||node.dataset.v502Bound)return;
    node.dataset.v502Bound='1';lastFeedback=!node.classList.contains('hidden');
    new MutationObserver(()=>{const visible=!node.classList.contains('hidden');if(visible&&!lastFeedback)recordBankEvidence();lastFeedback=visible;}).observe(node,{attributes:true,attributeFilter:['class']});
  }

  async function recordManualSubtopicQc(btn){
    if(readCtx(QC_KEY))return false;
    const subtopic=$('#qcSubtopic')?.value||'';if(!subtopic)return false;
    const subject=$('#qcSubject')?.value||'',topic=$('#qcTopic')?.value||'';
    const total=Number($('#qcTotal')?.value),correct=Number($('#qcCorrect')?.value),confidence=Number($('#qcConfidence')?.value),duration=$('#qcDuration')?.value===''?null:Number($('#qcDuration')?.value),notes=String($('#qcNotes')?.value||'').trim();
    if(!subject||!topic||!Number.isInteger(total)||total<1||!Number.isInteger(correct)||correct<0||correct>total){toast('Confira matéria, assunto, questões e acertos.','error');return true;}
    btn.disabled=true;if($('#qcMessage'))$('#qcMessage').textContent='Registrando o subassunto selecionado...';
    try{
      const {data:{session}}=await db().auth.getSession();if(!session)throw new Error('Sessão expirada.');
      const idem=crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}-v502`;
      const res=await fetch(`${URL}/functions/v1/record-external-practice`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':KEY,'x-idempotency-key':idem},body:JSON.stringify({source_kind:'qconcursos',subject_id:subject,topic_id:topic,subtopic_id:subtopic,plan_item_id:null,source_url:null,total_questions:total,correct_count:correct,confidence,duration_minutes:duration,notes,idempotency_key:idem})});
      const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Não foi possível registrar.');
      if($('#qcMessage'))$('#qcMessage').textContent=data.duplicate?'Esta bateria já havia sido registrada.':`Resultado salvo no subassunto: ${correct}/${total}.`;
      toast(data.duplicate?'Bateria já registrada.':`Bateria registrada: ${correct}/${total}.`,'ok');emit('external_subtopic');
      setTimeout(()=>parent.postMessage({type:'mentor-refresh',hash:'#questions'},location.origin),650);
    }catch(e){if($('#qcMessage'))$('#qcMessage').textContent=e?.message||'Falha ao registrar.';toast(e?.message||'Falha ao registrar.','error');}
    finally{btn.disabled=false;}return true;
  }

  document.addEventListener('click',e=>{
    const complete=e.target.closest('[data-task-complete]');if(complete&&complete.closest('.v500-step')?.dataset.v502QuestionTask==='1'){e.preventDefault();e.stopImmediatePropagation();toast('Meta de questões só é concluída por respostas registradas ou bateria externa.','neutral');return;}
    const record=e.target.closest('#qcRecordButton');if(record&&!readCtx(QC_KEY)&&($('#qcSubtopic')?.value||'')){e.preventDefault();e.stopImmediatePropagation();recordManualSubtopicQc(record);}
  },true);

  document.addEventListener('mentor-plan-changed',()=>setTimeout(decorateDaily,80));
  document.addEventListener('mentor-evidence-changed',()=>setTimeout(decorateDaily,80));
  const obs=new MutationObserver(()=>{bindFeedback();clearTimeout(window.__mentorV502Decorate);window.__mentorV502Decorate=setTimeout(decorateDaily,120);});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>{bindFeedback();decorateDaily();},900);
})();
