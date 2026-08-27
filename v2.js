(() => {
  'use strict';

  const VERSION = '2.0.0';
  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const QC_BASE = 'https://www.qconcursos.com/questoes-de-concursos/questoes';
  const APP_URL = 'https://moisesmachado002-boop.github.io/SIMULADO-01/v2.html';

  const DISCIPLINE_IDS = {
    'Língua Portuguesa': '1',
    'Direito Administrativo': '2',
    'Direito Constitucional': '3',
    'Matemática': '13'
  };
  const BOARD_LABELS = { '189':'IBFC', '2':'CEBRASPE', '152':'VUNESP', '63':'FGV' };
  const TOPIC_PRESETS = {
    MAT1: [
      { label:'Conjuntos numéricos (filtro amplo de Matemática)', subjectIds:[] },
      { label:'Progressão Aritmética (PA)', subjectIds:['18902'] },
      { label:'Progressão Geométrica (PG)', subjectIds:['18903'] }
    ],
    MAT5: [{ label:'Análise combinatória e probabilidade (filtro amplo)', subjectIds:[] }]
  };

  const state = {
    db: null, user: null, subjects: [], topics: [], mastery: [], attempts: [], external: [], sessions: [], plan: [], reviews: [], links: [],
    questions: [], qStates: new Map(), syllabusFilter: 'all', mentor: null,
    bank: { current:null, selected:null, confidence:3, startedAt:0, timer:null, answered:false, score:0, total:0 }
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => new Intl.NumberFormat('pt-BR').format(Number(n||0));
  const pct = (a,b) => b ? Math.round(Number(a||0)/Number(b)*100) : 0;
  const dateKey = d => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(d||new Date());
  const shortDate = value => value ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Bahia'}).format(new Date(value)) : '—';
  const subjectById = id => state.subjects.find(x=>x.id===id);
  const topicById = id => state.topics.find(x=>x.id===id);
  const masteryByTopic = id => state.mastery.find(x=>x.topic_id===id);

  function toast(text,kind='neutral') {
    const node=$('#toast'); if(!node)return;
    node.textContent=text; node.dataset.kind=kind; node.classList.add('show');
    clearTimeout(window.__v2Toast); window.__v2Toast=setTimeout(()=>node.classList.remove('show'),2800);
  }

  function setSync(text,kind='neutral') { const n=$('#syncPill'); if(n){n.textContent=text;n.dataset.state=kind;} }
  function requireUser() { if(state.user)return true; openAuth('signin'); toast('Entre na sua conta para usar seus dados.','error'); return false; }

  function navigate(view) {
    $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
    $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.go===view));
    window.scrollTo({top:0,behavior:'smooth'});
    history.replaceState(null,'',`#${view}`);
  }

  function bindNavigation() {
    document.addEventListener('click',e=>{
      const go=e.target.closest('[data-go]'); if(go){navigate(go.dataset.go);return;}
      const mentor=e.target.closest('[data-mentor-intent]'); if(mentor){
        if(!requireUser())return;
        const intent=mentor.dataset.mentorIntent;
        navigate('mentor'); runMentor(intent,true).catch(showError);
      }
    });
    window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(['home','study','external','bank','mentor'].includes(v))navigate(v);});
  }

  function openAuth(mode='signin') {
    const modal=$('#authModal'); modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); modal.dataset.mode=mode;
    $('#authTitle').textContent=mode==='signup'?'Criar conta':'Entrar';
    $('#authSubmit').textContent=mode==='signup'?'Criar conta':'Entrar';
    $('#authSwitch').textContent=mode==='signup'?'Já tenho conta':'Criar nova conta';
    $('#authNameWrap').classList.toggle('hidden',mode!=='signup');
    $('#authPassword').autocomplete=mode==='signup'?'new-password':'current-password';
    $('#authMessage').textContent='';
  }
  function closeAuth(){ $('#authModal').classList.remove('open'); $('#authModal').setAttribute('aria-hidden','true'); }
  function openAccount(){ if(!state.user)return openAuth(); $('#accountName').textContent=state.user.user_metadata?.display_name||state.user.email?.split('@')[0]||'Mentor IA';$('#accountEmail').textContent=state.user.email||'';$('#accountModal').classList.add('open'); }

  async function submitAuth() {
    const mode=$('#authModal').dataset.mode||'signin', email=$('#authEmail').value.trim(), password=$('#authPassword').value, name=$('#authName').value.trim();
    const message=$('#authMessage'); message.dataset.kind='';
    if(!email.includes('@')){message.textContent='Informe um e-mail válido.';message.dataset.kind='error';return;}
    if(mode==='signup'&&password.length<8){message.textContent='Para criar conta, use uma senha de pelo menos 8 caracteres.';message.dataset.kind='error';return;}
    if(!password){message.textContent='Informe sua senha.';message.dataset.kind='error';return;}
    $('#authSubmit').disabled=true; message.textContent=mode==='signup'?'Criando conta…':'Entrando…';
    try{
      if(mode==='signup'){
        const {data,error}=await state.db.auth.signUp({email,password,options:{emailRedirectTo:APP_URL,data:{display_name:name||email.split('@')[0]}}});
        if(error)throw error;
        if(!data.session){message.textContent='Conta criada. Confirme o e-mail e depois entre.';message.dataset.kind='ok';return;}
      }else{
        const {error}=await state.db.auth.signInWithPassword({email,password}); if(error)throw error;
      }
      closeAuth();
    }catch(error){message.textContent=error?.message||'Não foi possível entrar.';message.dataset.kind='error';}
    finally{$('#authSubmit').disabled=false;}
  }

  function bindAuth() {
    $('#accountBtn').addEventListener('click',openAccount);
    $('#authClose').addEventListener('click',closeAuth);
    $('#accountClose').addEventListener('click',()=>$('#accountModal').classList.remove('open'));
    $('#authSwitch').addEventListener('click',()=>openAuth($('#authModal').dataset.mode==='signup'?'signin':'signup'));
    $('#authSubmit').addEventListener('click',submitAuth);
    $('#authPassword').addEventListener('keydown',e=>{if(e.key==='Enter')submitAuth();});
    $('#signOutBtn').addEventListener('click',async()=>{await state.db.auth.signOut();$('#accountModal').classList.remove('open');});
  }

  async function loadData() {
    if(!state.user)return;
    setSync('Atualizando…','neutral');
    const today=dateKey(new Date());
    const [subjectsR,topicsR,masteryR,attemptsR,externalR,sessionsR,planR,reviewsR,linksR,questionsR]=await Promise.all([
      state.db.from('subjects').select('id,name,position,syllabus_section').eq('active',true).order('position'),
      state.db.from('topics').select('id,subject_id,title,position,syllabus_code,weight').eq('active',true).order('position'),
      state.db.from('topic_mastery').select('*').eq('user_id',state.user.id),
      state.db.from('question_attempts').select('id,question_id,subject_id,topic_id,is_correct,response_time_seconds,confidence,error_type,answered_at,source_kind').eq('user_id',state.user.id).order('answered_at',{ascending:false}).limit(1500),
      state.db.from('external_practice_batches').select('*').eq('user_id',state.user.id).order('practiced_at',{ascending:false}).limit(500),
      state.db.from('study_sessions').select('*').eq('user_id',state.user.id).order('started_at',{ascending:false}).limit(300),
      state.db.from('study_plan_items').select('*').eq('user_id',state.user.id).gte('scheduled_for',today).order('scheduled_for').order('sort_order').limit(200),
      state.db.from('reviews').select('id,topic_id,question_id,due_at,status,review_stage,trigger_reason').eq('user_id',state.user.id).eq('status','pending').limit(500),
      state.db.from('external_source_links').select('*').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(300),
      state.db.from('questions').select('id,exam_name,board,year,subject_id,topic_id,subject_label,topic_label,source_question_number,statement,alternatives,correct_answer,explanation,option_explanations,answer_key_note,difficulty,source_kind').not('explanation','is',null).order('created_at',{ascending:true}).limit(5000)
    ]);
    for(const r of [subjectsR,topicsR,masteryR,attemptsR,externalR,sessionsR,planR,reviewsR,linksR,questionsR]) if(r.error)throw r.error;
    state.subjects=subjectsR.data||[];state.topics=topicsR.data||[];state.mastery=masteryR.data||[];state.attempts=attemptsR.data||[];state.external=externalR.data||[];state.sessions=sessionsR.data||[];state.plan=planR.data||[];state.reviews=reviewsR.data||[];state.links=linksR.data||[];state.questions=questionsR.data||[];
    await loadQuestionStates();
    renderAll();
    setSync('Nuvem ✓','ok');
  }

  async function loadQuestionStates(){
    state.qStates=new Map(); const ids=state.questions.map(q=>q.id); if(!ids.length)return;
    const {data,error}=await state.db.from('user_question_state').select('question_id,seen_count,correct_count,wrong_count,last_seen_at,next_review_at,status,last_selected_answer,last_is_correct,last_response_time_seconds,last_confidence,last_attempt_at,review_stage').in('question_id',ids);
    if(error)throw error;(data||[]).forEach(x=>state.qStates.set(x.question_id,x));
  }

  function populateSelect(selectId,topicSelectId,allowAll=false){
    const s=$(selectId);if(!s)return;const old=s.value;
    s.innerHTML=`<option value="">${allowAll?'Todas':'Escolha a matéria'}</option>`+state.subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
    if(state.subjects.some(x=>x.id===old))s.value=old;
    const renderTopics=()=>{
      const t=$(topicSelectId);if(!t)return;const prev=t.value;const rows=state.topics.filter(x=>!s.value||x.subject_id===s.value);
      t.innerHTML=`<option value="">${allowAll?'Todos':'Escolha o assunto'}</option>`+rows.map(x=>`<option value="${x.id}">${esc(x.syllabus_code||'')} — ${esc(x.title)}</option>`).join('');
      if(rows.some(x=>x.id===prev))t.value=prev;
    };
    if(!s.dataset.bound){s.addEventListener('change',renderTopics);s.dataset.bound='1';}renderTopics();
  }

  function renderAll(){
    populateSelect('#studySubject','#studyTopic');populateSelect('#qcSubject','#qcTopic');populateSelect('#bankSubject','#bankTopic',true);
    renderHome();renderStudy();renderQc();renderBankCounts();renderKnowledge();
    runMentor('today',false).catch(()=>{});
  }

  function renderHome(){
    const internalCorrect=state.attempts.filter(a=>a.is_correct).length;
    const extTotal=state.external.reduce((s,b)=>s+Number(b.total_questions||0),0),extCorrect=state.external.reduce((s,b)=>s+Number(b.correct_count||0),0);
    const total=state.attempts.length+extTotal,correct=internalCorrect+extCorrect;
    const due=state.reviews.filter(r=>new Date(r.due_at)<=new Date()).length;
    $('#metricQuestions').textContent=fmt(total);$('#metricAccuracy').textContent=total?`${pct(correct,total)}%`:'—';$('#metricMeasured').textContent=`${state.mastery.filter(m=>Number(m.attempts_count||0)>0).length}/${state.topics.length}`;$('#metricReviews').textContent=fmt(due);
    const name=state.user?.user_metadata?.display_name||state.user?.email?.split('@')[0];if(name)$('#homeGreeting').textContent=`${name}, aqui está seu estudo.`;
    const today=dateKey(new Date());const items=state.plan.filter(p=>p.scheduled_for===today&&['pending','in_progress'].includes(p.status));
    $('#todayPlan').innerHTML=items.length?items.map(p=>{const t=topicById(p.topic_id);const s=t?subjectById(t.subject_id):null;return `<article class="list-row"><div><strong>${esc(s?.name||'Estudo')} • ${esc(t?.title||'Revisão')}</strong><span>${esc(p.task_type==='questions'?`${p.question_target||1} questão(ões)`:`${p.duration_minutes||0} min`)}${p.source_reason?` • ${esc(p.source_reason)}`:''}</span></div><span class="list-score">${p.status==='in_progress'?'EM CURSO':'HOJE'}</span></article>`}).join(''):'<div class="empty">Nenhuma tarefa pendente para hoje.</div>';
    const weak=[...state.mastery].filter(m=>Number(m.attempts_count||0)>0).sort((a,b)=>Number(a.mastery_score||50)-Number(b.mastery_score||50)).slice(0,4);
    $('#weakList').innerHTML=weak.length?weak.map(m=>{const t=topicById(m.topic_id);const s=t?subjectById(t.subject_id):null;return `<article class="list-row"><div><strong>${esc(s?.name||'')} • ${esc(t?.title||'')}</strong><span>${m.attempts_count||0} evidências • tendência ${esc(m.trend||'estável')}</span></div><span class="list-score">${Math.round(Number(m.mastery_score||0))}%</span></article>`}).join(''):'<div class="empty">Resolva questões para construir seu raio-X.</div>';
  }

  function topicClass(m){if(!m||!Number(m.attempts_count))return'unseen';const n=Number(m.mastery_score||0);return n<60?'weak':n<80?'mid':'strong';}
  function renderStudy(){
    const filter=state.syllabusFilter;let visible=state.topics.filter(t=>{const m=masteryByTopic(t.id),cls=topicClass(m);if(filter==='unseen')return cls==='unseen';if(filter==='weak')return cls==='weak';if(filter==='strong')return cls==='strong';return true;});
    $('#syllabusCount').textContent=`${visible.length}/${state.topics.length}`;
    const groups=state.subjects.map(s=>({subject:s,topics:visible.filter(t=>t.subject_id===s.id)})).filter(g=>g.topics.length);
    $('#syllabusMap').innerHTML=groups.length?groups.map(g=>{
      const measured=g.topics.filter(t=>topicClass(masteryByTopic(t.id))!=='unseen').length;
      return `<section class="subject-block"><div class="subject-head"><strong>${esc(g.subject.name)}</strong><span class="count-pill">${measured}/${g.topics.length} medidos</span></div><div class="topic-list">${g.topics.map(t=>{const m=masteryByTopic(t.id),cls=topicClass(m);return `<div class="topic-row" data-study-topic="${t.id}"><span class="topic-dot ${cls==='unseen'?'':cls}"></span><div class="topic-copy"><strong>${esc(t.syllabus_code||'')} • ${esc(t.title)}</strong><span>${m?`${m.attempts_count||0} evidências • ${Math.round(Number(m.mastery_score||0))}% domínio`:'Ainda sem evidência'}</span></div><span class="topic-score">${m?`${Math.round(Number(m.mastery_score||0))}%`:'—'}</span></div>`}).join('')}</div></section>`;
    }).join(''):'<div class="empty">Nenhum tópico neste filtro.</div>';
    renderStudyStatus();
  }

  function renderStudyStatus(){
    const id=$('#studyTopic').value,t=topicById(id),box=$('#studyTopicStatus'); if(!t){box.innerHTML='<span>Selecione um assunto para ver o diagnóstico.</span>';return;}
    const m=masteryByTopic(id);const attempts=state.attempts.filter(a=>a.topic_id===id).length,ext=state.external.filter(b=>b.topic_id===id).reduce((s,b)=>s+Number(b.total_questions||0),0),sessions=state.sessions.filter(s=>s.topic_id===id).length;
    box.innerHTML=`<strong>${esc(t.syllabus_code||'')} • ${esc(t.title)}</strong><br>${m?`Domínio ${Math.round(Number(m.mastery_score||0))}% • ${m.attempts_count||0} evidências • tendência ${esc(m.trend||'estável')}`:'Ainda não medido por questões.'}<br><small>${attempts} questão(ões) internas • ${ext} externas • ${sessions} sessão(ões) de estudo registradas</small>`;
  }

  async function recordStudy(){
    if(!requireUser())return;const topicId=$('#studyTopic').value,t=topicById(topicId),minutes=Number($('#studyMinutes').value);if(!t)return toast('Escolha um assunto do edital.','error');if(!Number.isFinite(minutes)||minutes<1||minutes>480)return toast('Informe de 1 a 480 minutos.','error');
    const ended=new Date(),started=new Date(ended.getTime()-minutes*60000);$('#recordStudyBtn').disabled=true;
    try{const {error}=await state.db.from('study_sessions').insert({user_id:state.user.id,subject_id:t.subject_id,topic_id:t.id,started_at:started.toISOString(),ended_at:ended.toISOString(),duration_minutes:Math.round(minutes),questions_answered:0,correct_answers:0});if(error)throw error;toast('Estudo registrado no seu histórico.','ok');await loadData();}
    catch(e){showError(e);}finally{$('#recordStudyBtn').disabled=false;}
  }

  function currentQcTopic(){return topicById($('#qcTopic').value);}
  function latestSavedQc(topicId){return state.links.find(l=>l.topic_id===topicId&&l.source_kind==='qconcursos_filter')||null;}
  function qcPresetsFor(t){return t?TOPIC_PRESETS[t.syllabus_code]||[]:[];}
  function buildQcUrl(){
    const t=currentQcTopic();if(!t)return null;const saved=latestSavedQc(t.id);const board=$('#qcBoard').value;
    if(saved&&!board)return {url:saved.url,kind:'saved',label:'Filtro exato já salvo para este assunto'};
    const subject=subjectById(t.subject_id),disciplineId=DISCIPLINE_IDS[subject?.name];
    const url=new URL(QC_BASE);if(disciplineId)url.searchParams.append('discipline_ids[]',disciplineId);if(board)url.searchParams.append('examining_board_ids[]',board);
    const presets=qcPresetsFor(t),presetIndex=Number($('#qcPreset').value||0),preset=presets[presetIndex];if(preset?.subjectIds?.length)preset.subjectIds.forEach(id=>url.searchParams.append('subject_ids[]',id));
    if(saved&&board){try{const savedUrl=new URL(saved.url);savedUrl.searchParams.set('examining_board_ids[]',board);return {url:savedUrl.toString(),kind:'saved+board',label:'Filtro salvo + banca selecionada'};}catch{}}
    return {url:url.toString(),kind:(disciplineId||preset?.subjectIds?.length)?'generated':'broad',label:preset?.subjectIds?.length?'Filtro automático por assunto':disciplineId?'Filtro automático por disciplina':'Filtro amplo do QConcursos — confirme o assunto no QC'};
  }

  function renderQc(){
    const t=currentQcTopic(),subject=t?subjectById(t.subject_id):null,presets=qcPresetsFor(t);const wrap=$('#qcPresetWrap'),select=$('#qcPreset');
    wrap.classList.toggle('hidden',!presets.length);if(presets.length){const old=select.value;select.innerHTML=presets.map((p,i)=>`<option value="${i}">${esc(p.label)}</option>`).join('');if(select.querySelector(`option[value="${old}"]`))select.value=old;}
    const built=buildQcUrl();$('#qcSelectedLabel').textContent=t?`${t.syllabus_code||''} • ${t.title.slice(0,42)}${t.title.length>42?'…':''}`:'Nenhum tópico';
    $('#qcPreview').innerHTML=built?`<div><strong>${esc(built.label)}</strong><span>${esc(subject?.name||'')} → ${esc(t.title)}${$('#qcBoard').value?` • ${esc(BOARD_LABELS[$('#qcBoard').value]||'Banca')}`:''}</span></div><span class="count-pill">${built.kind==='broad'?'REVISAR NO QC':'PRONTO'}</span>`:'<div><strong>Escolha um assunto.</strong><span>Vou procurar primeiro um filtro exato já salvo para ele.</span></div>';
    $('#externalCount').textContent=state.external.length;
    $('#externalHistory').innerHTML=state.external.length?state.external.slice(0,12).map(b=>{const t2=topicById(b.topic_id),s2=t2?subjectById(t2.subject_id):null;return `<article class="list-row"><div><strong>${esc(s2?.name||'')} • ${esc(t2?.title||'')}</strong><span>${shortDate(b.practiced_at)} • ${b.source_kind==='qconcursos'?'QConcursos':esc(b.source_kind||'Externa')}</span></div><span class="list-score">${b.correct_count}/${b.total_questions} • ${pct(b.correct_count,b.total_questions)}%</span></article>`}).join(''):'<div class="empty">Nenhuma bateria registrada ainda.</div>';
  }

  async function saveQcFilter(){
    if(!requireUser())return;const t=currentQcTopic(),built=buildQcUrl();if(!t||!built)return toast('Escolha um assunto.','error');const subject=subjectById(t.subject_id),u=new URL(built.url);
    const row={user_id:state.user.id,topic_id:t.id,source_kind:'qconcursos_filter',title:`Filtro QC • ${subject?.name||''} • ${t.title}`,url:u.toString(),domain:u.hostname,trust_level:'subscription',status:'saved',metadata_json:{source:'mentor_v2',version:VERSION,syllabus_code:t.syllabus_code||'',auto_generated:true}};
    try{const {data,error}=await state.db.from('external_source_links').upsert(row,{onConflict:'user_id,url'}).select('*').single();if(error)throw error;state.links=[data,...state.links.filter(x=>x.id!==data.id&&x.url!==data.url)];toast('Filtro salvo para este tópico.','ok');renderQc();}catch(e){showError(e);}
  }

  async function recordExternal(){
    if(!requireUser())return;const t=currentQcTopic(),built=buildQcUrl();if(!t)return toast('Escolha o assunto que você praticou.','error');const total=Number($('#qcTotal').value),correct=Number($('#qcCorrect').value),confidence=Number($('#qcConfidence').value),duration=$('#qcDuration').value===''?null:Number($('#qcDuration').value),notes=$('#qcNotes').value.trim();if(!Number.isInteger(total)||total<1||!Number.isInteger(correct)||correct<0||correct>total)return toast('Confira a quantidade de questões e acertos.','error');
    $('#qcRecordBtn').disabled=true;$('#qcMessage').textContent='Registrando e recalculando sua leitura…';
    try{
      const {data:{session}}=await state.db.auth.getSession();if(!session)throw new Error('Sessão expirada. Entre novamente.');
      const res=await fetch(`${SUPABASE_URL}/functions/v1/record-external-practice`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':SUPABASE_KEY},body:JSON.stringify({source_kind:'qconcursos',subject_id:t.subject_id,topic_id:t.id,source_url:built?.url||null,total_questions:total,correct_count:correct,confidence,duration_minutes:duration,notes})});
      const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Não foi possível registrar.');
      toast(`Bateria registrada: ${correct}/${total} (${pct(correct,total)}%).`,'ok');await loadData();const report=await runMentor('weakness',false);renderQcReport(report);$('#qcMessage').textContent='Resultado salvo. A Mentora já recalculou o domínio.';
    }catch(e){$('#qcMessage').textContent=e?.message||'Falha ao registrar.';showError(e);}finally{$('#qcRecordBtn').disabled=false;}
  }

  function renderQcReport(report){if(!report)return;$('#qcReportCard').classList.remove('hidden');$('#qcReportHeadline').textContent=report.headline||'Resultado analisado';$('#qcReportEvidence').textContent=evidenceText(report.evidence_level);$('#qcReportSummary').textContent=report.summary||'';$('#qcReportNext').textContent=report.next_action||'';$('#qcReportCard').scrollIntoView({behavior:'smooth',block:'center'});}

  function bankFiltered(){const s=$('#bankSubject').value,t=$('#bankTopic').value;return state.questions.filter(q=>(!s||q.subject_id===s)&&(!t||q.topic_id===t));}
  function renderBankCounts(){const rows=bankFiltered();const unseen=rows.filter(q=>!Number(state.qStates.get(q.id)?.seen_count||0));$('#bankAvailable').textContent=rows.length;$('#bankNewCount').textContent=unseen.length;$('#bankSessionScore').textContent=`${state.bank.score}/${state.bank.total}`;}
  function chooseBankQuestion(){const rows=bankFiltered().filter(q=>q.id!==state.bank.current?.id);const unseen=rows.filter(q=>!Number(state.qStates.get(q.id)?.seen_count||0));const pool=unseen.length?unseen:rows;if(!pool.length)return null;return pool[Math.floor(Math.random()*pool.length)];}
  function questionState(q){const st=state.qStates.get(q.id);if(!st||!st.seen_count)return'NOVA';if(st.last_is_correct===false)return'ERRADA';if(st.status==='mastered')return'DOMINADA';if(st.next_review_at&&new Date(st.next_review_at)<=new Date())return'REVISÃO';return'RESPONDIDA';}
  function startBank(){if(!requireUser())return;const q=chooseBankQuestion();if(!q)return toast('Não há questão disponível neste filtro.','error');showQuestion(q);}
  function showQuestion(q){state.bank.current=q;state.bank.selected=null;state.bank.answered=false;state.bank.confidence=3;state.bank.startedAt=Date.now();clearInterval(state.bank.timer);state.bank.timer=setInterval(tickBankTimer,1000);$('#questionCard').classList.remove('hidden');$('#bankConfirmBtn').classList.add('hidden');$('#bankNextBtn').classList.add('hidden');$('#questionFeedback').className='question-feedback hidden';$('#questionMeta').textContent=`${q.board||q.exam_name||'Banco próprio'}${q.year?` • ${q.year}`:''}`;$('#questionSubject').textContent=q.subject_label||subjectById(q.subject_id)?.name||'Matéria';$('#questionTopic').textContent=q.topic_label||topicById(q.topic_id)?.title||'Assunto';$('#questionState').textContent=questionState(q);$('#questionStatement').textContent=q.statement;$('#questionAnswers').innerHTML=Object.entries(q.alternatives||{}).map(([l,text])=>`<button class="answer" data-answer="${esc(l)}"><span class="answer-letter">${esc(l)}</span><span>${esc(text)}</span></button>`).join('');$$('[data-bank-confidence]').forEach(b=>b.classList.toggle('active',b.dataset.bankConfidence==='3'));$('#questionTimer').textContent='00:00';$('#questionCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function tickBankTimer(){if(!state.bank.current||state.bank.answered)return;const sec=Math.floor((Date.now()-state.bank.startedAt)/1000);$('#questionTimer').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
  function clientAttemptId(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;}

  async function confirmBank(){
    const q=state.bank.current;if(!q||state.bank.answered||!state.bank.selected)return;$('#bankConfirmBtn').disabled=true;const selected=state.bank.selected.toUpperCase(),right=String(q.correct_answer||'').toUpperCase(),correct=selected===right,secs=Math.max(1,Math.round((Date.now()-state.bank.startedAt)/1000));
    try{const {data,error}=await state.db.rpc('record_question_attempt_atomic',{p_question_id:q.id,p_selected_answer:selected,p_response_time_seconds:secs,p_confidence:Number(state.bank.confidence),p_client_attempt_id:clientAttemptId(),p_reasoning_text:null,p_source_kind:q.source_kind||'personal_module'});if(error||!data?.ok)throw error||new Error('Não foi possível registrar a resposta.');state.bank.answered=true;clearInterval(state.bank.timer);state.bank.total+=data.duplicate?0:1;if(correct&&!data.duplicate)state.bank.score+=1;$$('#questionAnswers .answer').forEach(btn=>{const l=btn.dataset.answer;btn.disabled=true;if(l===right)btn.classList.add('correct');if(l===selected&&!correct)btn.classList.add('wrong');});$('#bankConfirmBtn').classList.add('hidden');$('#bankNextBtn').classList.remove('hidden');renderQuestionFeedback(q,selected,correct,secs);toast(correct?'Acertou. Resposta registrada.':'Erro registrado e revisão agendada.',correct?'ok':'neutral');await refreshAfterAttempt(q,data,selected,correct,secs);}
    catch(e){showError(e);}finally{$('#bankConfirmBtn').disabled=false;}
  }

  function renderQuestionFeedback(q,selected,correct,secs){const node=$('#questionFeedback'),right=String(q.correct_answer||'').toUpperCase(),opt=q.option_explanations||{};node.className=`question-feedback ${correct?'good':'bad'}`;node.innerHTML=`<h3>${correct?'✓ Acerto':`✕ Erro • gabarito ${esc(right)}`}</h3><p>${esc(q.explanation||'Explicação em preparação.')}</p>${Object.keys(opt).length?`<div>${Object.entries(opt).map(([l,text])=>`<div class="option-review"><strong>${esc(l)}${l===right?' • correta':''}${l===selected&&!correct?' • sua resposta':''}</strong> — ${esc(text)}</div>`).join('')}</div>`:''}${q.answer_key_note?`<p><strong>Observação do gabarito:</strong> ${esc(q.answer_key_note)}</p>`:''}<small>Tempo: ${secs}s • confiança ${state.bank.confidence===5?'alta':state.bank.confidence===2?'baixa':'média'}</small>`;}
  async function refreshAfterAttempt(q,data,selected,correct,secs){const old=state.qStates.get(q.id)||{seen_count:0,correct_count:0,wrong_count:0};state.qStates.set(q.id,{...old,question_id:q.id,seen_count:Number(old.seen_count||0)+(data.duplicate?0:1),correct_count:Number(old.correct_count||0)+(!data.duplicate&&correct?1:0),wrong_count:Number(old.wrong_count||0)+(!data.duplicate&&!correct?1:0),last_is_correct:correct,last_selected_answer:selected,last_response_time_seconds:secs,last_confidence:state.bank.confidence,last_attempt_at:new Date().toISOString(),next_review_at:data.next_review_at,status:data.status,review_stage:data.review_stage});renderBankCounts();await loadData();}

  function evidenceText(level){return level==='high'?'EVIDÊNCIA ALTA':level==='medium'?'EVIDÊNCIA MÉDIA':'EVIDÊNCIA BAIXA';}
  async function runMentor(intent='today',scroll=false){
    if(!state.user)return null;$$('.mentor-action').forEach(b=>b.classList.toggle('active',b.dataset.mentorIntent===intent));$('#mentorHeadline').textContent='Analisando seu histórico…';
    const {data,error}=await state.db.functions.invoke('mentor-analyze',{body:{intent,persist:false}});if(error)throw error;state.mentor=data;renderMentor(data,intent);if(intent==='today')renderHomeMentor(data);if(scroll)$('#mentorHeadline').scrollIntoView({behavior:'smooth',block:'center'});return data;
  }
  function renderHomeMentor(r){if(!r)return;$('#homeMentorHeadline').textContent=r.headline||'Seu próximo passo';$('#homeMentorSummary').textContent=r.summary||'';$('#homeNextAction').textContent=r.next_action||'';$('#homeEvidence').textContent=evidenceText(r.evidence_level);}
  function renderMentor(r,intent){if(!r)return;const labels={today:'LEITURA DE HOJE',weakness:'FRAQUEZAS',pattern:'PADRÕES',advance:'POSSO AVANÇAR?',review:'REVISÕES'};$('#mentorIntentLabel').textContent=labels[intent]||'MENTORA';$('#mentorHeadline').textContent=r.headline||'Leitura pronta';$('#mentorSummary').textContent=r.summary||'';$('#mentorNext').textContent=r.next_action||'';$('#mentorEvidence').textContent=evidenceText(r.evidence_level);$('#mentorReasons').innerHTML=(r.reasons||[]).length?(r.reasons||[]).map(x=>`<div class="reason">${esc(x)}</div>`).join(''):'<div class="empty">Sem motivos adicionais.</div>';$('#mentorFocus').innerHTML=(r.focus||[]).length?r.focus.map(f=>`<article class="list-row"><div><strong>${esc(f.subject||'')} • ${esc(f.title||'')}</strong><span>${f.attempts||0} evidências • domínio ${Math.round(Number(f.mastery_score||0))}% • prioridade ${f.priority||0}</span></div><span class="list-score">${f.accuracy||0}%</span></article>`).join(''):'<div class="empty">Ainda não há foco medido.</div>';}
  function renderKnowledge(){const ext=state.external.reduce((s,b)=>s+Number(b.total_questions||0),0);$('#knowAttempts').textContent=fmt(state.attempts.length);$('#knowExternal').textContent=fmt(ext);$('#knowSessions').textContent=fmt(state.sessions.length);$('#knowTopics').textContent=fmt(state.mastery.filter(m=>Number(m.attempts_count||0)>0).length);}

  function bindStudy(){
    $('#studyTopic').addEventListener('change',renderStudyStatus);$('#studySubject').addEventListener('change',()=>setTimeout(renderStudyStatus,0));$('#recordStudyBtn').addEventListener('click',recordStudy);
    document.addEventListener('click',e=>{const f=e.target.closest('[data-syllabus-filter]');if(f){state.syllabusFilter=f.dataset.syllabusFilter;$$('[data-syllabus-filter]').forEach(x=>x.classList.toggle('active',x===f));renderStudy();}const topic=e.target.closest('[data-study-topic]');if(topic){const t=topicById(topic.dataset.studyTopic);if(!t)return;$('#studySubject').value=t.subject_id;$('#studySubject').dispatchEvent(new Event('change'));setTimeout(()=>{$('#studyTopic').value=t.id;renderStudyStatus();window.scrollTo({top:110,behavior:'smooth'});},0);}});
  }

  function bindQc(){['#qcSubject','#qcTopic','#qcBoard','#qcPreset'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(renderQc,0)));$('#qcOpenBtn').addEventListener('click',()=>{const built=buildQcUrl();if(!built)return toast('Escolha um assunto.','error');window.open(built.url,'_blank','noopener,noreferrer');});$('#qcSaveBtn').addEventListener('click',saveQcFilter);$('#qcRecordBtn').addEventListener('click',recordExternal);}
  function bindBank(){['#bankSubject','#bankTopic'].forEach(id=>$(id).addEventListener('change',()=>{setTimeout(renderBankCounts,0)}));$('#bankStartBtn').addEventListener('click',startBank);$('#bankConfirmBtn').addEventListener('click',confirmBank);$('#bankNextBtn').addEventListener('click',()=>{const q=chooseBankQuestion();q?showQuestion(q):toast('Sessão concluída neste filtro.','ok');});$('#questionAnswers').addEventListener('click',e=>{const btn=e.target.closest('[data-answer]');if(!btn||state.bank.answered)return;state.bank.selected=btn.dataset.answer;$$('#questionAnswers .answer').forEach(x=>x.classList.toggle('selected',x===btn));$('#bankConfirmBtn').classList.remove('hidden');});$('#bankConfidenceRow').addEventListener('click',e=>{const b=e.target.closest('[data-bank-confidence]');if(!b||state.bank.answered)return;state.bank.confidence=Number(b.dataset.bankConfidence);$$('[data-bank-confidence]').forEach(x=>x.classList.toggle('active',x===b));});}
  function bindMentor(){$('#refreshAllBtn').addEventListener('click',async()=>{if(!requireUser())return;try{await loadData();await runMentor('today',false);toast('Dados atualizados.','ok');}catch(e){showError(e);}});}

  function showError(error){console.error(error);toast(error?.message||'Algo deu errado. Tente novamente.','error');setSync('Falha ao sincronizar','warn');}
  function clearUser(){state.user=null;state.subjects=[];state.topics=[];state.mastery=[];state.attempts=[];state.external=[];state.sessions=[];state.plan=[];state.reviews=[];state.links=[];state.questions=[];state.qStates=new Map();setSync('Entre para sincronizar','warn');$('#accountBtn').textContent='M';$('#homeGreeting').textContent='Seu estudo, sem bagunça.';$('#homeMentorHeadline').textContent='Entre para carregar sua leitura.';$('#homeMentorSummary').textContent='Seu histórico fica vinculado à sua conta.';$('#homeNextAction').textContent='Faça login para continuar de onde parou.';}

  async function boot(){
    if(!window.supabase?.createClient)throw new Error('Supabase SDK não carregou.');state.db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    bindNavigation();bindAuth();bindStudy();bindQc();bindBank();bindMentor();
    const {data:{session}}=await state.db.auth.getSession();state.user=session?.user||null;
    if(state.user){$('#accountBtn').textContent=(state.user.user_metadata?.display_name||state.user.email||'M').slice(0,1).toUpperCase();await loadData();}
    else{clearUser();openAuth('signin');}
    state.db.auth.onAuthStateChange((event,sessionNow)=>{setTimeout(async()=>{if(sessionNow?.user){state.user=sessionNow.user;$('#accountBtn').textContent=(state.user.user_metadata?.display_name||state.user.email||'M').slice(0,1).toUpperCase();closeAuth();try{await loadData();toast('Histórico carregado.','ok');}catch(e){showError(e);}}else if(event==='SIGNED_OUT'){clearUser();openAuth('signin');}},0);});
    const initial=location.hash.slice(1);if(['home','study','external','bank','mentor'].includes(initial))navigate(initial);
  }

  boot().catch(showError);
})();
