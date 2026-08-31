(() => {
  'use strict';
  if (window.__mentorDailyActionsV502) return;
  window.__mentorDailyActionsV502 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const BANK_KEY='mentor-v433-bank-task';
  const QC_KEY='mentor-v433-qc-task';
  const CONTEXT_TTL=4*60*60*1000;
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db) return;

  const $=s=>document.querySelector(s);

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__mentorDailyActionsToast);window.__mentorDailyActionsToast=setTimeout(()=>n.classList.remove('show'),3400);
  }
  function emitChanged(kind='plan'){
    window.MentorRequestGuard?.invalidate?.();
    document.dispatchEvent(new CustomEvent('mentor-evidence-changed',{detail:{kind}}));
    document.dispatchEvent(new CustomEvent('mentor-plan-changed',{detail:{kind}}));
  }
  function saveCtx(key,value){sessionStorage.setItem(key,JSON.stringify({...value,created_at:Date.now()}));}
  function readCtx(key){
    try{const v=JSON.parse(sessionStorage.getItem(key)||'null');if(!v)return null;if(Date.now()-Number(v.created_at||0)>CONTEXT_TTL){sessionStorage.removeItem(key);return null;}return v;}catch{sessionStorage.removeItem(key);return null;}
  }
  function clearCtx(key){sessionStorage.removeItem(key);}
  function setCtx(key,patch){const old=readCtx(key)||{};saveCtx(key,{...old,...patch});}
  function wait(ms){return new Promise(r=>setTimeout(r,ms));}
  async function waitFor(selector,tries=25,delay=80){for(let i=0;i<tries;i++){const n=$(selector);if(n)return n;await wait(delay);}return null;}

  async function taskInfo(id){
    const {data:{user},error:uerr}=await db.auth.getUser();if(uerr||!user)throw new Error('Sessão expirada.');
    const r=await db.from('study_plan_items').select('id,topic_id,subtopic_id,task_type,question_target,progress_count,duration_minutes,status,completed_at,source_reason').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(r.error)throw r.error;if(!r.data)throw new Error('Meta não encontrada.');
    const t=await db.from('topics').select('id,subject_id,title,syllabus_code,parent_topic_id').eq('id',r.data.topic_id).maybeSingle();if(t.error)throw t.error;
    let sub=null;if(r.data.subtopic_id){const s=await db.from('topics').select('id,title,parent_topic_id').eq('id',r.data.subtopic_id).maybeSingle();if(s.error)throw s.error;sub=s.data||null;}
    return {...r.data,subject_id:t.data?.subject_id||null,topic_title:t.data?.title||'Assunto',syllabus_code:t.data?.syllabus_code||'',subtopic_title:sub?.title||null};
  }

  function navigateQuestions(tab){
    const nav=document.querySelector('[data-page="questions"]');
    if(nav)nav.click();else{location.hash='#questions';window.dispatchEvent(new HashChangeEvent('hashchange'));}
    setTimeout(()=>document.querySelector(`[data-question-tab="${tab}"]`)?.click(),40);
  }

  async function completeDirect(id,btn){
    if(btn?.dataset.busy==='1')return;if(btn){btn.dataset.busy='1';btn.disabled=true;}
    try{
      const item=await taskInfo(id);
      if(item.status==='completed'||item.completed_at){toast('Esta meta já está concluída.','ok');return;}
      if(item.task_type==='questions'){toast('Meta de questões só é concluída por respostas registradas ou bateria externa.','neutral');return;}
      const {data:{user}}=await db.auth.getUser();const target=Math.max(1,Number(item.question_target||1));
      const r=await db.from('study_plan_items').update({status:'completed',progress_count:target,completed_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).in('status',['pending','in_progress']);
      if(r.error)throw r.error;emitChanged('complete');toast('Meta concluída.','ok');
    }catch(error){console.error('daily complete direct',error);toast(error?.message||'Não foi possível concluir a meta.','error');}
    finally{if(btn){delete btn.dataset.busy;btn.disabled=false;}}
  }

  function ensureReviewModal(){
    let m=$('#v433ReviewModal');if(m)return m;
    const st=document.createElement('style');st.id='v433ReviewStyle';st.textContent=`.v433-rm{position:fixed;inset:0;background:#0009;z-index:100050;display:none;align-items:flex-end;justify-content:center}.v433-rm.open{display:flex}.v433-rs{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:20px 20px 0 0;padding:20px}.v433-rh{display:flex;justify-content:space-between;gap:12px}.v433-rh h2{margin:4px 0 6px}.v433-rstep{margin:10px 0;padding:12px;border-radius:10px;background:#f5f6f7;border-left:4px solid #c837a1;font-size:12px;line-height:1.45}.v433-ra{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.v433-ra button{flex:1}`;document.head.appendChild(st);
    m=document.createElement('div');m.id='v433ReviewModal';m.className='v433-rm';m.innerHTML='<div class="v433-rs"><div class="v433-rh"><div><small>REVISÃO DO ASSUNTO</small><h2 id="v433ReviewTitle"></h2><p class="muted" id="v433ReviewMeta"></p></div><button class="secondary-button" id="v433ReviewClose">×</button></div><div id="v433ReviewBody"></div><div class="v433-ra"><button class="primary-button" id="v433ReviewDone">Concluir revisão</button><button class="secondary-button" id="v433ReviewBack">Voltar</button></div></div>';
    document.body.appendChild(m);$('#v433ReviewClose').onclick=$('#v433ReviewBack').onclick=()=>m.classList.remove('open');return m;
  }
  async function openReview(id){
    try{
      const item=await taskInfo(id);if(item.task_type!=='review')throw new Error('Esta meta não é uma revisão.');
      const now=new Date().toISOString();const rr=await db.from('reviews').select('id').eq('topic_id',item.topic_id).eq('status','pending').lte('due_at',now);if(rr.error)throw rr.error;
      const m=ensureReviewModal();$('#v433ReviewTitle').textContent=`${item.syllabus_code?item.syllabus_code+' • ':''}${item.topic_title}`;$('#v433ReviewMeta').textContent=`${item.duration_minutes||4} min • ${(rr.data||[]).length} evento(s) vencido(s) agrupado(s)`;
      $('#v433ReviewBody').innerHTML=`<div class="v433-rstep"><strong>1. Recuperação sem olhar — 2 min</strong><br>Tente explicar o assunto antes de abrir teoria ou lei.</div><div class="v433-rstep"><strong>2. Conferência focada</strong><br>Confira apenas os pontos que não conseguiu recuperar e as pegadinhas que costuma errar.</div><div class="v433-rstep"><strong>3. Fechamento</strong><br>Anote uma regra ou exceção importante. Depois conclua a revisão.</div>`;
      const done=$('#v433ReviewDone');done.dataset.task=id;done.disabled=false;m.classList.add('open');
    }catch(e){console.error('review open',e);toast(e?.message||'Não foi possível abrir a revisão.','error');}
  }
  async function completeReview(btn){
    const id=btn?.dataset.task;if(!id||btn.disabled)return;btn.disabled=true;
    try{const r=await db.rpc('complete_topic_review_v432',{p_plan_item_id:id});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'Não foi possível concluir a revisão.');$('#v433ReviewModal')?.classList.remove('open');emitChanged('review');toast(r.data.duplicate?'Revisão já estava concluída.':`Revisão concluída${Number(r.data.reviews_completed||0)?` • ${r.data.reviews_completed} evento(s) resolvido(s)`:''}.`,'ok');}
    catch(e){console.error('review complete',e);toast(e?.message||'Não foi possível concluir a revisão.','error');}finally{btn.disabled=false;}
  }

  async function configureBankTask(id){
    try{
      const item=await taskInfo(id);if(item.task_type!=='questions')throw new Error('Esta meta não é de questões.');
      saveCtx(BANK_KEY,{task_id:item.id,topic_id:item.topic_id,subtopic_id:item.subtopic_id||null,subject_id:item.subject_id,target:Number(item.question_target||0),progress:Number(item.progress_count||0)});
      clearCtx(QC_KEY);navigateQuestions('bank');
      await wait(100);const subject=await waitFor('#bankSubject'),topic=await waitFor('#bankTopic');if(!subject||!topic)throw new Error('Banco de questões ainda não carregou.');
      subject.value=item.subject_id||'';subject.dispatchEvent(new Event('change',{bubbles:true}));await wait(60);topic.value=item.topic_id;topic.dispatchEvent(new Event('change',{bubbles:true}));
      if(item.subtopic_id){const sub=await waitFor('#bankSubtopic');if(sub){await wait(80);sub.value=item.subtopic_id;sub.dispatchEvent(new Event('change',{bubbles:true}));}}
      const mode=$('#bankMode');if(mode){mode.value='unseen';mode.dispatchEvent(new Event('change',{bubbles:true}));}
      await wait(80);$('#bankStartButton')?.click();toast(`Sessão vinculada à meta: ${item.subtopic_title||item.topic_title}.`,'ok');
    }catch(e){clearCtx(BANK_KEY);console.error('bank task',e);toast(e?.message||'Não foi possível abrir as questões.','error');}
  }

  function bankContextMatches(ctx){
    if(!ctx)return false;if($('#bankTopic')?.value!==ctx.topic_id)return false;
    if(ctx.subtopic_id&&$('#bankSubtopic')?.value!==ctx.subtopic_id)return false;return true;
  }
  let feedbackVisible=false,feedbackObserver=null;
  function bindFeedbackObserver(){
    const node=$('#questionFeedback');if(!node||feedbackObserver)return;
    feedbackVisible=!node.classList.contains('hidden');
    feedbackObserver=new MutationObserver(()=>{
      const visible=!node.classList.contains('hidden');
      if(visible&&!feedbackVisible)incrementBankTask().catch(e=>console.warn('bank progress',e));
      feedbackVisible=visible;
    });feedbackObserver.observe(node,{attributes:true,attributeFilter:['class']});
  }
  async function incrementBankTask(){
    const ctx=readCtx(BANK_KEY);if(!bankContextMatches(ctx))return;
    const questionId=$('#questionCard')?.dataset.questionId;if(!questionId)return;
    const r=await db.rpc('record_plan_question_progress_v502',{p_plan_item_id:ctx.task_id,p_question_id:questionId});if(r.error)throw r.error;
    if(!r.data?.ok)return;
    if(r.data.changed){setCtx(BANK_KEY,{progress:Number(r.data.progress||0)});emitChanged('question_unique');if(r.data.status==='completed'){clearCtx(BANK_KEY);toast('Meta de questões concluída com evidências válidas.','ok');}}
    else if(r.data.duplicate){toast('Questão repetida: não contou novamente na meta.','neutral');}
  }

  async function configureQcTask(id,desiredCount=0){
    try{
      const item=await taskInfo(id);if(item.task_type!=='questions')throw new Error('Esta meta não é de questões.');
      saveCtx(QC_KEY,{task_id:item.id,topic_id:item.topic_id,subtopic_id:item.subtopic_id||null,subject_id:item.subject_id,target:Number(item.question_target||0),progress:Number(item.progress_count||0),pending_key:null,pending_sig:null});
      clearCtx(BANK_KEY);navigateQuestions('external');await wait(100);
      const subject=await waitFor('#qcSubject'),topic=await waitFor('#qcTopic');if(!subject||!topic)throw new Error('QConcursos ainda não carregou.');
      subject.value=item.subject_id||'';subject.dispatchEvent(new Event('change',{bubbles:true}));await wait(60);topic.value=item.topic_id;topic.dispatchEvent(new Event('change',{bubbles:true}));
      if(item.subtopic_id){const sub=await waitFor('#qcSubtopic');if(sub){await wait(80);sub.value=item.subtopic_id;sub.dispatchEvent(new Event('change',{bubbles:true}));}}
      const remaining=Math.max(1,Number(item.question_target||0)-Number(item.progress_count||0)),requested=Math.max(0,Number(desiredCount||0));if($('#qcTotal'))$('#qcTotal').value=String(requested||remaining);
      toast(`Bateria vinculada à meta: ${item.subtopic_title||item.topic_title}.`,'ok');
    }catch(e){clearCtx(QC_KEY);console.error('qc task',e);toast(e?.message||'Não foi possível abrir o QConcursos.','error');}
  }
  function qcContextMatches(ctx){if(!ctx)return false;if($('#qcTopic')?.value!==ctx.topic_id)return false;if(ctx.subtopic_id&&$('#qcSubtopic')?.value!==ctx.subtopic_id)return false;return true;}
  function randomKey(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}-mentor`}
  async function recordQcTask(btn){
    const ctx=readCtx(QC_KEY);if(!qcContextMatches(ctx))return false;if(btn?.dataset.busy==='1')return true;
    const total=Number($('#qcTotal')?.value),correct=Number($('#qcCorrect')?.value),confidence=Number($('#qcConfidence')?.value),duration=$('#qcDuration')?.value===''?null:Number($('#qcDuration')?.value),notes=String($('#qcNotes')?.value||'').trim();
    if(!Number.isInteger(total)||total<1||!Number.isInteger(correct)||correct<0||correct>total){toast('Confira questões e acertos.','error');return true;}
    const sig=JSON.stringify([ctx.task_id,ctx.topic_id,ctx.subtopic_id||'',total,correct,confidence,duration,notes]);let idem=ctx.pending_sig===sig&&ctx.pending_key?ctx.pending_key:randomKey();setCtx(QC_KEY,{pending_sig:sig,pending_key:idem});
    if(btn){btn.dataset.busy='1';btn.disabled=true;}if($('#qcMessage'))$('#qcMessage').textContent='Registrando com proteção contra duplicidade...';
    try{
      const {data:{session}}=await db.auth.getSession();if(!session)throw new Error('Sessão expirada.');
      const res=await fetch(`${URL}/functions/v1/record-external-practice`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':KEY,'x-idempotency-key':idem},body:JSON.stringify({source_kind:'qconcursos',subject_id:ctx.subject_id,topic_id:ctx.topic_id,subtopic_id:ctx.subtopic_id,plan_item_id:ctx.task_id,source_url:null,total_questions:total,correct_count:correct,confidence,duration_minutes:duration,notes,idempotency_key:idem})});
      const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Não foi possível registrar.');
      const completed=data.plan?.completed===true;const progress=Number(data.plan?.progress??ctx.progress??0);setCtx(QC_KEY,{progress,pending_key:null,pending_sig:null});emitChanged('external');
      if($('#qcMessage'))$('#qcMessage').textContent=data.duplicate?'Esta bateria já havia sido registrada. Nenhum dado foi duplicado.':`Resultado salvo: ${correct}/${total}.`;
      toast(data.duplicate?'Bateria já registrada — duplicidade bloqueada.':`Bateria registrada: ${correct}/${total}.`,'ok');
      if(completed)clearCtx(QC_KEY);else if($('#qcTotal'))$('#qcTotal').value=String(Math.max(1,Number(ctx.target||0)-progress));
    }catch(e){console.error('qc direct record',e);if($('#qcMessage'))$('#qcMessage').textContent=e?.message||'Falha ao registrar.';toast(e?.message||'Falha ao registrar.','error');}
    finally{if(btn){delete btn.dataset.busy;btn.disabled=false;}}return true;
  }

  function clearMismatchedContext(e){
    if(!e.isTrusted)return;
    const id=e.target?.id;if(['bankSubject','bankTopic','bankSubtopic'].includes(id)){const c=readCtx(BANK_KEY);if(c&&!bankContextMatches(c))clearCtx(BANK_KEY);}
    if(['qcSubject','qcTopic','qcSubtopic'].includes(id)){const c=readCtx(QC_KEY);if(c&&!qcContextMatches(c))clearCtx(QC_KEY);}
  }

  document.addEventListener('click',e=>{
    const reviewDone=e.target.closest('#v433ReviewDone');if(reviewDone){e.preventDefault();e.stopImmediatePropagation();completeReview(reviewDone);return;}
    const goals=e.target.closest('#v428Goals,#v500Daily');
    if(goals){
      const complete=e.target.closest('[data-task-complete]');if(complete){e.preventDefault();e.stopImmediatePropagation();completeDirect(complete.dataset.taskComplete,complete);return;}
      const review=e.target.closest('[data-task-review]');if(review){e.preventDefault();e.stopImmediatePropagation();openReview(review.dataset.taskReview);return;}
      const bank=e.target.closest('[data-task-bank]');if(bank){e.preventDefault();e.stopImmediatePropagation();configureBankTask(bank.dataset.taskBank);return;}
      const qc=e.target.closest('[data-task-qc]');if(qc){e.preventDefault();e.stopImmediatePropagation();configureQcTask(qc.dataset.taskQc,Number(qc.dataset.qcCount||0));return;}
    }
    const record=e.target.closest('#qcRecordButton');if(record&&readCtx(QC_KEY)){e.preventDefault();e.stopImmediatePropagation();recordQcTask(record);}
  },true);
  document.addEventListener('change',clearMismatchedContext,true);
  setTimeout(bindFeedbackObserver,1200);
  const obs=new MutationObserver(()=>bindFeedbackObserver());obs.observe(document.documentElement,{childList:true,subtree:true});
})();