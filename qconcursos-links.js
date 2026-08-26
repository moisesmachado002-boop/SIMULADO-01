(() => {
  'use strict';

  const VERSION = '8.0';
  const Q_URL = 'https://www.qconcursos.com/questoes-de-concursos/questoes';
  const OFFICIAL_DOMAINS = ['gov.br','concursosfcc.com.br','fcc.org.br','cebraspe.org.br','ibfc.org.br','institutoaocp.org.br'];
  let db = null;
  let user = null;
  let subjects = [];
  let topics = [];
  let links = [];
  let batches = [];
  let mounted = false;
  let selectedTopicId = '';

  const $ = selector => document.querySelector(selector);
  const esc = (value='') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function context(timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const client = window.mentorCloud?.client;
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        return { db: client, user: session?.user || null };
      }
      await sleep(60);
    }
    return { db:null, user:null };
  }

  function parseHttps(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:') return null;
      return url;
    } catch { return null; }
  }

  function isQUrl(value) {
    const url = parseHttps(value);
    return !!url && (url.hostname === 'qconcursos.com' || url.hostname.endsWith('.qconcursos.com'));
  }

  function isOfficialHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    return OFFICIAL_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
  }

  function message(text, kind='neutral') {
    const node = $('#p8Message');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.kind = kind;
  }

  async function waitForBank(timeoutMs=7000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if ($('[data-view="acervo"]')) return true;
      await sleep(70);
    }
    return false;
  }

  function inject() {
    if ($('#mentorP8Panel')) { mounted = true; return; }
    const view = $('[data-view="acervo"]');
    if (!view) return;
    const panel = document.createElement('section');
    panel.id = 'mentorP8Panel';
    panel.className = 'p8-shell';
    panel.innerHTML = `
      <div class="p8-head">
        <div><span class="eyebrow">P8 • FONTES EXTERNAS</span><h2>Qconcursos + Internet</h2><p>Use fontes externas quando o banco próprio não bastar. O Mentor registra desempenho e origem sem copiar conteúdo protegido nem fazer scraping.</p></div>
        <span class="p8-badge">EDITAL OFICIAL</span>
      </div>

      <div class="p8-scope">
        <label>Matéria<select id="p8Subject"><option value="">Escolha a matéria</option></select></label>
        <label>Assunto do edital<select id="p8Topic"><option value="">Escolha o assunto</option></select></label>
      </div>

      <div class="p8-grid">
        <article class="p8-card">
          <span class="p8-card-kicker">QCONCURSOS</span>
          <h3>Abra e reutilize seu filtro</h3>
          <p>Monte o filtro oficial no QC por disciplina, assunto, banca e demais critérios. Cole o link aqui para voltar direto a ele depois.</p>
          <input id="p8QFilterUrl" type="url" inputmode="url" placeholder="https://www.qconcursos.com/questoes-de-concursos/questoes?...">
          <div class="p8-actions">
            <button type="button" class="primary" id="p8OpenQ">Abrir Qconcursos ↗</button>
            <button type="button" class="secondary" id="p8SaveQ">Salvar filtro</button>
            <button type="button" class="secondary" id="p8OpenSaved">Abrir salvo ↗</button>
          </div>
          <small>O Mentor não pede sua senha e não extrai em massa questões do QC.</small>
        </article>

        <article class="p8-card">
          <span class="p8-card-kicker">RESULTADO DA BATERIA</span>
          <h3>Traga o desempenho para a Mentora</h3>
          <div class="p8-two">
            <label>Questões feitas<input id="p8Total" type="number" min="1" max="500" value="10"></label>
            <label>Acertos<input id="p8Correct" type="number" min="0" max="500" value="0"></label>
          </div>
          <div class="p8-two">
            <label>Confiança<select id="p8Confidence"><option value="2">Baixa</option><option value="3" selected>Média</option><option value="5">Alta</option></select></label>
            <label>Tempo total (min)<input id="p8Duration" type="number" min="0" max="720" placeholder="opcional"></label>
          </div>
          <textarea id="p8Notes" rows="2" maxlength="1200" placeholder="Observação opcional sobre a bateria"></textarea>
          <button type="button" class="primary" id="p8Record">Registrar bateria</button>
        </article>

        <article class="p8-card p8-wide">
          <span class="p8-card-kicker">INTERNET E FONTES OFICIAIS</span>
          <h3>Procure material real sem sair do tópico</h3>
          <p>Os atalhos montam uma busca pelo assunto oficial. Quando encontrar uma prova, questão ou material útil, salve a origem para manter rastreabilidade.</p>
          <div class="p8-actions">
            <button type="button" class="secondary" id="p8SearchWeb">Buscar questões na web ↗</button>
            <button type="button" class="secondary" id="p8SearchOfficial">Buscar prova/material oficial ↗</button>
          </div>
          <div class="p8-source-form">
            <select id="p8SourceKind">
              <option value="official_exam">Prova oficial</option>
              <option value="official_material">Material oficial</option>
              <option value="web_question">Questão pública</option>
            </select>
            <input id="p8SourceTitle" type="text" maxlength="180" placeholder="Título da fonte">
            <input id="p8SourceUrl" type="url" inputmode="url" placeholder="https://...">
            <button type="button" class="secondary" id="p8SaveSource">Salvar origem</button>
          </div>
        </article>
      </div>

      <div class="p8-history-grid">
        <section><div class="section-heading compact"><div><span class="eyebrow">FONTES SALVAS</span><h3>Do assunto selecionado</h3></div></div><div id="p8SavedLinks" class="p8-list"></div></section>
        <section><div class="section-heading compact"><div><span class="eyebrow">BATERIAS EXTERNAS</span><h3>Histórico recente</h3></div></div><div id="p8BatchHistory" class="p8-list"></div></section>
      </div>
      <p id="p8Message" class="p8-message" aria-live="polite"></p>`;

    const anchor = $('#mentorQgOps') || view.querySelector('.qg-bank-header');
    anchor ? anchor.insertAdjacentElement('afterend', panel) : view.prepend(panel);

    $('#p8Subject')?.addEventListener('change', () => { selectedTopicId=''; renderTopicOptions(); renderHistory(); });
    $('#p8Topic')?.addEventListener('change', () => { selectedTopicId=$('#p8Topic')?.value || ''; renderHistory(); syncBankFromP8(); });
    $('#p8OpenQ')?.addEventListener('click', () => window.open(Q_URL,'_blank','noopener,noreferrer'));
    $('#p8SaveQ')?.addEventListener('click', saveQFilter);
    $('#p8OpenSaved')?.addEventListener('click', openSavedFilter);
    $('#p8Record')?.addEventListener('click', recordBatch);
    $('#p8SearchWeb')?.addEventListener('click', () => openSearch(false));
    $('#p8SearchOfficial')?.addEventListener('click', () => openSearch(true));
    $('#p8SaveSource')?.addEventListener('click', saveSource);
    panel.addEventListener('click', event => {
      const open = event.target.closest('[data-p8-open]');
      if (open) window.open(open.dataset.p8Open,'_blank','noopener,noreferrer');
    });
    mounted = true;
  }

  function selectedTopic() {
    const id = $('#p8Topic')?.value || selectedTopicId;
    return topics.find(topic => topic.id === id) || null;
  }

  function selectedSubject() {
    const topic = selectedTopic();
    return subjects.find(subject => subject.id === topic?.subject_id) || subjects.find(subject => subject.id === $('#p8Subject')?.value) || null;
  }

  function renderSubjectOptions() {
    const select = $('#p8Subject');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Escolha a matéria</option>' + subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    if (subjects.some(s => s.id === current)) select.value = current;
  }

  function renderTopicOptions() {
    const select = $('#p8Topic');
    if (!select) return;
    const subjectId = $('#p8Subject')?.value || '';
    const rows = topics.filter(t => !subjectId || t.subject_id === subjectId);
    select.innerHTML = '<option value="">Escolha o assunto</option>' + rows.map(t => `<option value="${esc(t.id)}">${esc(t.syllabus_code || '')} • ${esc(t.title)}</option>`).join('');
    if (selectedTopicId && rows.some(t => t.id === selectedTopicId)) select.value = selectedTopicId;
  }

  function latestQFilter(topicId) {
    return links.filter(link => link.topic_id === topicId && link.source_kind === 'qconcursos_filter').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0] || null;
  }

  function renderHistory() {
    const topic = selectedTopic();
    const linkNode = $('#p8SavedLinks');
    const batchNode = $('#p8BatchHistory');
    if (!linkNode || !batchNode) return;
    if (!topic) {
      linkNode.innerHTML = '<div class="p8-empty">Escolha um assunto do edital.</div>';
      batchNode.innerHTML = '<div class="p8-empty">Escolha um assunto do edital.</div>';
      return;
    }
    const topicLinks = links.filter(link => link.topic_id === topic.id).slice(0,8);
    linkNode.innerHTML = topicLinks.length ? topicLinks.map(link => `<article class="p8-row"><div><strong>${esc(link.title)}</strong><span>${esc(link.source_kind.replaceAll('_',' '))} • ${esc(link.domain || '')}</span></div><button type="button" class="text-button" data-p8-open="${esc(link.url)}">Abrir ↗</button></article>`).join('') : '<div class="p8-empty">Nenhuma fonte salva neste assunto.</div>';
    const topicBatches = batches.filter(batch => batch.topic_id === topic.id).slice(0,8);
    batchNode.innerHTML = topicBatches.length ? topicBatches.map(batch => `<article class="p8-row"><div><strong>${batch.correct_count}/${batch.total_questions} • ${Math.round(batch.correct_count/batch.total_questions*100)}%</strong><span>${batch.source_kind === 'qconcursos' ? 'Qconcursos' : 'Fonte externa'} • ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(batch.practiced_at))}</span></div></article>`).join('') : '<div class="p8-empty">Nenhuma bateria externa registrada neste assunto.</div>';
    const filter = latestQFilter(topic.id);
    const input = $('#p8QFilterUrl');
    if (input && filter && !input.value) input.value = filter.url;
  }

  function syncBankFromP8() {
    const topic = selectedTopic();
    if (!topic) return;
    const subject = $('#bankSubject');
    const bankTopic = $('#bankTopic');
    if (subject) {
      subject.value = topic.subject_id;
      subject.dispatchEvent(new Event('change',{bubbles:true}));
    }
    setTimeout(() => {
      if (bankTopic) {
        bankTopic.value = topic.id;
        bankTopic.dispatchEvent(new Event('change',{bubbles:true}));
      }
    },50);
  }

  function syncP8FromBank() {
    const bankTopic = $('#bankTopic')?.value;
    if (!bankTopic || !topics.some(t => t.id === bankTopic)) return;
    openTopic(bankTopic,false);
  }

  async function loadData() {
    const ctx = await context(); db=ctx.db; user=ctx.user;
    if (!db || !user) { message('Entre na sua conta para salvar filtros e resultados.','warn'); return; }
    const [sR,tR,lR,bR] = await Promise.all([
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
      db.from('external_source_links').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
      db.from('external_practice_batches').select('*').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(100)
    ]);
    for (const r of [sR,tR,lR,bR]) if (r.error) throw r.error;
    subjects=sR.data||[]; topics=tR.data||[]; links=lR.data||[]; batches=bR.data||[];
    renderSubjectOptions(); renderTopicOptions();
    const bankTopic = $('#bankTopic')?.value;
    if (bankTopic && topics.some(t=>t.id===bankTopic)) openTopic(bankTopic,false);
    else renderHistory();
  }

  async function saveQFilter() {
    try {
      const topic=selectedTopic();
      if (!topic) throw new Error('Escolha o assunto do edital antes de salvar o filtro.');
      const raw=$('#p8QFilterUrl')?.value?.trim() || '';
      if (!isQUrl(raw)) throw new Error('Cole um link oficial do domínio qconcursos.com.');
      const url=parseHttps(raw);
      const subject=selectedSubject();
      const row={user_id:user.id,topic_id:topic.id,source_kind:'qconcursos_filter',title:`Filtro QC • ${subject?.name || ''} • ${topic.title}`,url:url.toString(),domain:url.hostname,trust_level:'subscription',status:'saved',metadata_json:{syllabus_code:topic.syllabus_code||'',source:'p8_qconcursos'}};
      const saved=await db.from('external_source_links').upsert(row,{onConflict:'user_id,url'}).select('*').single();
      if (saved.error) throw saved.error;
      links=[saved.data,...links.filter(link=>link.id!==saved.data.id && link.url!==saved.data.url)];
      renderHistory(); message('Filtro do Qconcursos salvo para este assunto.','ok');
    } catch(error) { message(error?.message || 'Não foi possível salvar o filtro.','error'); }
  }

  function openSavedFilter() {
    const topic=selectedTopic();
    if (!topic) return message('Escolha o assunto primeiro.','warn');
    const filter=latestQFilter(topic.id);
    if (!filter) return message('Ainda não há filtro do Qconcursos salvo para este assunto.','warn');
    window.open(filter.url,'_blank','noopener,noreferrer');
    db?.from('external_source_links').update({last_used_at:new Date().toISOString()}).eq('id',filter.id).eq('user_id',user.id).then(()=>{});
  }

  async function recordBatch() {
    try {
      const topic=selectedTopic(),subject=selectedSubject();
      if (!topic || !subject) throw new Error('Escolha matéria e assunto do edital.');
      const total=Number($('#p8Total')?.value),correct=Number($('#p8Correct')?.value);
      if (!Number.isInteger(total)||total<1||total>500||!Number.isInteger(correct)||correct<0||correct>total) throw new Error('Confira a quantidade de questões e acertos.');
      const filter=latestQFilter(topic.id);
      const sourceInput=$('#p8QFilterUrl')?.value?.trim() || '';
      const sourceUrl=isQUrl(sourceInput)?sourceInput:(filter?.url||null);
      message('Registrando bateria e atualizando seu domínio…');
      const {data,error}=await db.functions.invoke('record-external-practice',{body:{source_kind:'qconcursos',subject_id:subject.id,topic_id:topic.id,source_url:sourceUrl,total_questions:total,correct_count:correct,confidence:Number($('#p8Confidence')?.value||3),duration_minutes:$('#p8Duration')?.value===''?null:Number($('#p8Duration')?.value),notes:$('#p8Notes')?.value||null}});
      if (error || !data?.ok) throw error || new Error('Falha ao registrar a bateria.');
      await loadData();
      window.dispatchEvent(new CustomEvent('mentor:external-practice-saved',{detail:{topicId:topic.id,batch:data}}));
      try { await window.MentorScheduleEngine?.regenerate?.({rebalanceToday:true}); } catch(e) { console.warn('P8: cronograma não recalculado',e); }
      try { await window.MentorEngine?.analyze?.('today',false); } catch(e) { console.warn('P8: Mentora não atualizada',e); }
      message(`Bateria registrada: ${correct}/${total} (${Math.round(correct/total*100)}%). Domínio e Mentora foram atualizados.`,'ok');
    } catch(error) { console.error(error); message(error?.message || 'Não foi possível registrar a bateria.','error'); }
  }

  function openSearch(official) {
    const topic=selectedTopic(),subject=selectedSubject();
    if (!topic || !subject) return message('Escolha matéria e assunto antes de pesquisar.','warn');
    const query=official
      ? `("${topic.title}") "${subject.name}" (site:gov.br OR site:concursosfcc.com.br OR site:cebraspe.org.br OR site:ibfc.org.br) prova concurso PDF`
      : `"${topic.title}" "${subject.name}" questões concurso FCC prova`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`,'_blank','noopener,noreferrer');
  }

  async function saveSource() {
    try {
      const topic=selectedTopic();
      if (!topic) throw new Error('Escolha o assunto do edital.');
      const url=parseHttps($('#p8SourceUrl')?.value);
      if (!url) throw new Error('Informe uma URL HTTPS válida.');
      const sourceKind=$('#p8SourceKind')?.value || 'web_question';
      const title=$('#p8SourceTitle')?.value?.trim() || `${topic.syllabus_code || ''} • ${topic.title}`;
      const official=(sourceKind==='official_exam'||sourceKind==='official_material')&&isOfficialHost(url.hostname);
      const row={user_id:user.id,topic_id:topic.id,source_kind:sourceKind,title:title.slice(0,180),url:url.toString(),domain:url.hostname,trust_level:official?'official':sourceKind==='web_question'?'public':'unverified',status:official?'verified':'candidate',metadata_json:{syllabus_code:topic.syllabus_code||'',source:'p8_manual_source',official_domain:official}};
      const saved=await db.from('external_source_links').upsert(row,{onConflict:'user_id,url'}).select('*').single();
      if(saved.error) throw saved.error;
      links=[saved.data,...links.filter(link=>link.id!==saved.data.id && link.url!==saved.data.url)];
      $('#p8SourceTitle').value=''; $('#p8SourceUrl').value=''; renderHistory();
      message(official?'Fonte oficial reconhecida e salva.':'Fonte salva como candidata; ela não entra automaticamente no banco de questões.','ok');
    } catch(error) { message(error?.message || 'Não foi possível salvar a fonte.','error'); }
  }

  async function openTopic(topicId,navigate=true) {
    if (!topics.length) await loadData();
    const topic=topics.find(t=>t.id===topicId);
    if (!topic) return;
    selectedTopicId=topic.id;
    const subjectSelect=$('#p8Subject');
    if (subjectSelect) subjectSelect.value=topic.subject_id;
    renderTopicOptions();
    const topicSelect=$('#p8Topic'); if(topicSelect) topicSelect.value=topic.id;
    renderHistory();
    if (navigate) {
      document.querySelector('[data-go="acervo"]')?.click();
      setTimeout(()=>$('#mentorP8Panel')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    }
  }

  async function installShortcuts() {
    const mentorActions=$('.p7-actions');
    if (mentorActions && !$('#p8MentorSources')) {
      const b=document.createElement('button'); b.id='p8MentorSources'; b.type='button'; b.className='secondary'; b.textContent='Abrir fontes do foco';
      b.addEventListener('click',()=>{
        const analysis=window.MentorEngine?.getLastAnalysis?.();
        const topicId=analysis?.recommended_topic_ids?.[0];
        if (!topicId) return message('A Mentora ainda não tem um tópico prioritário seguro.','warn');
        openTopic(topicId,true);
      });
      mentorActions.appendChild(b);
    }
    const plan=await window.MentorScheduleEngine?.getPlan?.().catch?.(()=>null) || await window.MentorScheduleEngine?.getPlan?.();
    (plan?.items||[]).filter(item=>item.task_type==='questions').forEach(item=>{
      const task=document.querySelector(`[data-plan-item="${CSS.escape(item.id)}"] .p6-task-actions`);
      if (task && !task.querySelector('[data-p8-plan-topic]')) {
        const b=document.createElement('button'); b.type='button'; b.dataset.p8PlanTopic=item.topic_id||''; b.textContent='FONTES';
        b.addEventListener('click',()=>openTopic(item.topic_id,true)); task.insertBefore(b,task.firstChild);
      }
    });
  }

  async function boot() {
    const ready=await waitForBank();
    if (!ready) return;
    inject();
    try {
      await loadData();
      $('#bankTopic')?.addEventListener('change',syncP8FromBank);
      await installShortcuts();
      window.addEventListener('mentor:plan-updated',()=>setTimeout(()=>installShortcuts().catch(console.warn),120));
      window.addEventListener('mentor:analysis-updated',()=>setTimeout(()=>installShortcuts().catch(console.warn),120));
      db?.auth?.onAuthStateChange?.((event)=>{ if(event==='SIGNED_IN'||event==='SIGNED_OUT') setTimeout(()=>loadData().catch(console.error),120); });
    } catch(error) { console.error('P8 não iniciou:',error); message('Não foi possível carregar as fontes externas agora.','error'); }
  }

  window.MentorExternal = Object.freeze({version:VERSION,openTopic,reload:loadData});
  boot();
})();