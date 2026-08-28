(() => {
  'use strict';
  if (window.__mentorTimerReviewManualV416) return;
  window.__mentorTimerReviewManualV416 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c));
  let subjects=[],topics=[],currentTimer=null,catalogLoaded=false,reviewTask=null;

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__v416Toast);window.__v416Toast=setTimeout(()=>n.classList.remove('show'),3800);
  }
  function elapsed(st=currentTimer){
    if(!st)return 0;let sec=Number(st.accumulated_seconds||0);
    if(st.status==='running'&&st.running_since){const x=Date.parse(st.running_since);if(Number.isFinite(x))sec+=Math.max(0,Math.floor((Date.now()-x)/1000));}
    return sec;
  }
  function subjectName(id){return subjects.find(x=>x.id===id)?.name||'Matéria';}
  function topicName(id){const t=topics.find(x=>x.id===id);return t?`${t.syllabus_code?t.syllabus_code+' • ':''}${t.title}`:'Assunto';}

  async function loadCatalog(force=false){
    if(catalogLoaded&&!force)return;
    const [s,t]=await Promise.all([
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position')
    ]);
    if(s.error)throw s.error;if(t.error)throw t.error;
    subjects=s.data||[];topics=t.data||[];catalogLoaded=true;
    repairBaseSelectors();fillManualSubjects();
  }
  function repairBaseSelectors(){
    const act=$('#studyTimerActivity');
    if(act&&!act.querySelector('option[value="questions"]')){const o=document.createElement('option');o.value='questions';o.textContent='Questões';act.appendChild(o);}
    const s=$('#studyTimerSubject');if(s&&subjects.length){const old=s.value;s.innerHTML='<option value="">Escolha</option>'+subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(subjects.some(x=>x.id===old))s.value=old;fillBaseTopics();}
  }
  function fillBaseTopics(){
    const s=$('#studyTimerSubject'),t=$('#studyTimerTopic');if(!s||!t)return;
    const old=t.value,rows=topics.filter(x=>x.subject_id===s.value);
    t.innerHTML=rows.length?'<option value="">Escolha</option>'+rows.map(x=>`<option value="${x.id}">${esc((x.syllabus_code?x.syllabus_code+' • ':'')+x.title)}</option>`).join(''):'<option value="">Escolha a matéria primeiro</option>';
    if(rows.some(x=>x.id===old))t.value=old;
  }

  function injectStyles(){
    if($('#v416Style'))return;const s=document.createElement('style');s.id='v416Style';s.textContent=`
      .v416-overlay{position:fixed;inset:0;z-index:100120;background:#0009;display:none;align-items:center;justify-content:center;padding:16px}.v416-overlay.open{display:flex}
      .v416-card{width:min(520px,100%);max-height:90dvh;overflow:auto;background:#fff;border-radius:20px;padding:22px;box-sizing:border-box;box-shadow:0 25px 70px #0005}
      .v416-card h2{margin:4px 0 8px;font-size:27px}.v416-kicker{font-size:12px;font-weight:900;letter-spacing:.09em;color:#8b7400}.v416-card label{display:block;font-weight:800;margin-top:13px}.v416-card select,.v416-card input{width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #d6d6d6;border-radius:10px;background:#fff;font:inherit}.v416-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.v416-actions button,.v416-full{padding:13px 14px;border-radius:11px;font-weight:900;font-size:15px;cursor:pointer}.v416-primary{background:#f2c500;border:1px solid #caa800;color:#111}.v416-secondary{background:#fff;border:1px solid #bbb;color:#222}.v416-note{font-size:13px;line-height:1.45;color:#666;margin-top:10px}.v416-summary{padding:10px 12px;border-radius:10px;background:#f5f6f7;font-weight:850;margin-top:12px}
      #studyTimerManualLaunch{width:100%;margin-top:10px;border-radius:12px;padding:12px 14px;font-weight:900;font-size:15px;background:#fff;border:1px solid #b8b8b8;color:#222;cursor:pointer}
      @media(max-width:620px){.v416-overlay{align-items:flex-end;padding:0}.v416-card{width:100%;border-radius:22px 22px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom))}.v416-actions{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function injectManualButton(){
    const start=$('#studyTimerStart');if(!start||$('#studyTimerManualLaunch'))return;
    const b=document.createElement('button');b.id='studyTimerManualLaunch';b.type='button';b.textContent='✍ Lançar tempo manual';start.insertAdjacentElement('afterend',b);b.onclick=()=>openManual();
  }
  function injectQuestionStats(){
    const active=$('#studyTimerActiveBox');if(!active||$('#studyTimerQuestionStats'))return;
    const box=document.createElement('div');box.id='studyTimerQuestionStats';box.hidden=true;box.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0"><label style="margin:0">Questões feitas<input id="studyTimerQuestionsDone" type="number" min="1" max="500" inputmode="numeric" value="20"></label><label style="margin:0">Quantas errou?<input id="studyTimerQuestionsErrors" type="number" min="0" max="500" inputmode="numeric" value="0"></label></div><div id="studyTimerQuestionsSummary" class="v416-summary"></div>`;
    active.querySelector('.st-topic')?.insertAdjacentElement('afterend',box);box.addEventListener('input',renderQuestionStats);
  }

  function injectModals(){
    if($('#v416Manual'))return;injectStyles();
    const manual=document.createElement('div');manual.id='v416Manual';manual.className='v416-overlay';manual.innerHTML=`<div class="v416-card"><div class="v416-kicker">LANÇAMENTO MANUAL</div><h2>Informar tempo estudado</h2><p class="v416-note">Use quando você não quiser usar o cronômetro. O tempo entra no histórico e no progresso da missão correspondente.</p><label>Atividade<select id="v416ManualActivity"><option value="study">Estudo / teoria</option><option value="review">Revisão do assunto</option><option value="questions">Questões</option></select></label><label>Matéria<select id="v416ManualSubject"><option value="">Escolha</option></select></label><label>Assunto<select id="v416ManualTopic"><option value="">Escolha a matéria primeiro</option></select></label><label>Tempo total (min)<input id="v416ManualMinutes" type="number" min="1" max="720" inputmode="numeric" value="30"></label><div id="v416ManualQuestions" hidden style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Questões feitas<input id="v416ManualQ" type="number" min="1" max="500" inputmode="numeric" value="20"></label><label>Quantas errou?<input id="v416ManualE" type="number" min="0" max="500" inputmode="numeric" value="0"></label></div><div class="v416-actions"><button id="v416ManualSave" class="v416-primary">Salvar lançamento</button><button id="v416ManualClose" class="v416-secondary">Cancelar</button></div></div>`;document.body.appendChild(manual);

    const choice=document.createElement('div');choice.id='v416ReviewChoice';choice.className='v416-overlay';choice.innerHTML=`<div class="v416-card"><div class="v416-kicker">REVISÃO DO ASSUNTO</div><h2>Como vai registrar o tempo?</h2><div id="v416ReviewTopic" class="v416-summary"></div><p class="v416-note">A revisão é do assunto. A questão errada serve apenas para indicar o que precisa voltar.</p><div class="v416-actions"><button id="v416ReviewTimer" class="v416-primary">⏱ Usar cronômetro</button><button id="v416ReviewManual" class="v416-secondary">✍ Informar tempo manual</button></div><button id="v416ReviewCancel" class="v416-secondary v416-full" style="width:100%;margin-top:10px">Cancelar</button></div>`;document.body.appendChild(choice);

    $('#v416ManualClose').onclick=()=>manual.classList.remove('open');
    manual.addEventListener('click',e=>{if(e.target===manual)manual.classList.remove('open');});
    $('#v416ManualSubject').onchange=fillManualTopics;
    $('#v416ManualActivity').onchange=()=>{$('#v416ManualQuestions').hidden=$('#v416ManualActivity').value!=='questions';};
    $('#v416ManualSave').onclick=saveManual;
    $('#v416ReviewCancel').onclick=()=>choice.classList.remove('open');
    choice.addEventListener('click',e=>{if(e.target===choice)choice.classList.remove('open');});
    $('#v416ReviewTimer').onclick=startReviewTimer;
    $('#v416ReviewManual').onclick=openReviewManual;
  }

  function fillManualSubjects(){
    const s=$('#v416ManualSubject');if(!s||!subjects.length)return;const old=s.value;s.innerHTML='<option value="">Escolha</option>'+subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(subjects.some(x=>x.id===old))s.value=old;fillManualTopics();
  }
  function fillManualTopics(){
    const s=$('#v416ManualSubject'),t=$('#v416ManualTopic');if(!s||!t)return;const old=t.value,rows=topics.filter(x=>x.subject_id===s.value);t.innerHTML=rows.length?'<option value="">Escolha</option>'+rows.map(x=>`<option value="${x.id}">${esc((x.syllabus_code?x.syllabus_code+' • ':'')+x.title)}</option>`).join(''):'<option value="">Escolha a matéria primeiro</option>';if(rows.some(x=>x.id===old))t.value=old;
  }
  async function openManual(prefill={}){
    await loadCatalog();injectModals();
    $('#v416ManualActivity').value=prefill.activity||$('#studyTimerActivity')?.value||'study';
    $('#v416ManualSubject').value=prefill.subject_id||$('#studyTimerSubject')?.value||'';fillManualTopics();
    $('#v416ManualTopic').value=prefill.topic_id||$('#studyTimerTopic')?.value||'';
    $('#v416ManualMinutes').value=Math.max(1,Number(prefill.minutes||30));
    $('#v416ManualQuestions').hidden=$('#v416ManualActivity').value!=='questions';
    $('#v416Manual').classList.add('open');
  }
  async function saveManual(){
    const btn=$('#v416ManualSave'),activity=$('#v416ManualActivity').value,subject=$('#v416ManualSubject').value,topic=$('#v416ManualTopic').value,minutes=Math.floor(Number($('#v416ManualMinutes').value||0)),q=Math.floor(Number($('#v416ManualQ').value||0)),e=Math.floor(Number($('#v416ManualE').value||0));
    if(!subject||!topic)return toast('Escolha matéria e assunto.','error');if(minutes<1||minutes>720)return toast('Informe um tempo válido.','error');if(activity==='questions'&&(q<1||e<0||e>q))return toast('Confira a quantidade de questões e erros.','error');
    btn.disabled=true;try{const {data,error}=await db.rpc('record_manual_study_activity',{p_subject_id:subject,p_topic_id:topic,p_activity_type:activity,p_duration_minutes:minutes,p_total_questions:activity==='questions'?q:0,p_wrong_count:activity==='questions'?e:0,p_notes:null});if(error)throw error;$('#v416Manual').classList.remove('open');const plan=data?.plan||{};toast(activity==='questions'?`${q} questões e ${minutes} min registrados${plan.matched?` • missão ${plan.progress}/${plan.target}`:''}.`:`${minutes} min de ${activity==='review'?'revisão':'estudo'} registrados.`,'ok');setTimeout(()=>location.reload(),350);}catch(err){console.error(err);toast(err?.message||'Não foi possível salvar.','error');}finally{btn.disabled=false;}
  }

  async function fetchTimer(){
    const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data}=await db.from('study_timer_state').select('*').eq('user_id',user.id).maybeSingle();currentTimer=data||null;renderQuestionStats();return currentTimer;
  }
  function renderQuestionStats(){
    const box=$('#studyTimerQuestionStats');if(!box)return;box.hidden=currentTimer?.activity_type!=='questions';if(box.hidden)return;const q=Math.max(0,Number($('#studyTimerQuestionsDone')?.value||0)),e=Math.max(0,Number($('#studyTimerQuestionsErrors')?.value||0)),c=Math.max(0,q-e),acc=q?Math.round(c/q*100):0,sec=elapsed(),pace=q&&sec?Math.round(sec/q):0;$('#studyTimerQuestionsSummary').textContent=q?`${c} acertos • ${e} erros • ${acc}%${pace?` • ${Math.floor(pace/60)}m${String(pace%60).padStart(2,'0')}s/questão`:''}`:'Informe a quantidade ao finalizar.';
  }

  async function openReviewChoice(taskId){
    await loadCatalog();injectModals();
    const {data,error}=await db.from('study_plan_items').select('id,topic_id,duration_minutes,status').eq('id',taskId).maybeSingle();if(error)throw error;if(!data)return toast('Meta de revisão não encontrada.','error');
    const topic=topics.find(x=>x.id===data.topic_id);if(!topic)return toast('Assunto da revisão não encontrado.','error');reviewTask={...data,subject_id:topic.subject_id};$('#v416ReviewTopic').textContent=`${subjectName(topic.subject_id)} • ${topicName(topic.id)}`;$('#v416ReviewChoice').classList.add('open');
  }
  async function startReviewTimer(){
    if(!reviewTask)return;const btn=$('#v416ReviewTimer');btn.disabled=true;try{const existing=await fetchTimer();if(existing){$('#v416ReviewChoice').classList.remove('open');toast('Já existe um cronômetro ativo. Finalize ou cancele antes de iniciar outro.','error');await window.MentorStudyTimer?.refresh?.();window.MentorStudyTimer?.open?.();return;}
      const {error}=await db.rpc('start_study_timer',{p_subject_id:reviewTask.subject_id,p_topic_id:reviewTask.topic_id,p_activity_type:'review'});if(error)throw error;$('#v416ReviewChoice').classList.remove('open');await window.MentorStudyTimer?.refresh?.();window.MentorStudyTimer?.open?.();toast('Cronômetro da revisão iniciado.','ok');
    }catch(err){console.error(err);toast(err?.message||'Não foi possível iniciar a revisão.','error');}finally{btn.disabled=false;}
  }
  async function openReviewManual(){
    if(!reviewTask)return;$('#v416ReviewChoice').classList.remove('open');await openManual({activity:'review',subject_id:reviewTask.subject_id,topic_id:reviewTask.topic_id,minutes:Number(reviewTask.duration_minutes||10)});
  }

  async function handleQuestionFinish(e){
    const finish=e.target.closest('#studyTimerFinish');if(!finish)return;await fetchTimer();if(currentTimer?.activity_type!=='questions')return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const q=Math.floor(Number($('#studyTimerQuestionsDone')?.value||0)),errors=Math.floor(Number($('#studyTimerQuestionsErrors')?.value||0));if(q<1||q>500)return toast('Informe quantas questões fez.','error');if(errors<0||errors>q)return toast('A quantidade de erros não pode passar das questões feitas.','error');finish.disabled=true;try{const notes=($('#studyTimerNotes')?.value||'').trim();const {data,error}=await db.rpc('finish_study_timer',{p_notes:notes||null,p_questions_answered:q,p_errors:errors});if(error)throw error;const plan=data?.plan||{};toast(`${q} questões registradas${plan.matched?` • missão ${plan.progress}/${plan.target}`:''}.`,'ok');try{new BroadcastChannel('mentor-study-timer-v410').postMessage('sync');}catch{}setTimeout(()=>location.reload(),350);}catch(err){console.error(err);toast(err?.message||'Não foi possível salvar as questões.','error');finish.disabled=false;}
  }

  document.addEventListener('click',e=>{
    const review=e.target.closest('[data-task-review]');if(review){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openReviewChoice(review.dataset.taskReview).catch(err=>toast(err?.message||'Não foi possível abrir a revisão.','error'));return;}
    if(e.target.closest('#studyTimerPill,#studyTimerStart,#studyTimerPause,#studyTimerResume'))setTimeout(()=>{loadCatalog().catch(()=>{});fetchTimer().catch(()=>{});},180);
  },true);
  document.addEventListener('click',handleQuestionFinish,true);
  document.addEventListener('change',e=>{if(e.target.id==='studyTimerSubject')fillBaseTopics();if(e.target.id==='studyTimerActivity')setTimeout(()=>fetchTimer().catch(()=>{}),80);},true);

  const obs=new MutationObserver(()=>{clearTimeout(window.__v416Mut);window.__v416Mut=setTimeout(()=>{injectStyles();injectModals();injectManualButton();injectQuestionStats();repairBaseSelectors();},120);});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  injectStyles();injectModals();setTimeout(()=>loadCatalog(true).catch(e=>console.warn('timer v416 catalog',e)),500);setTimeout(()=>{injectManualButton();injectQuestionStats();fetchTimer().catch(()=>{});},900);setInterval(()=>{if(currentTimer?.activity_type==='questions')renderQuestionStats();},1000);
})();