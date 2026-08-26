(() => {
  'use strict';

  const VERSION = '8.0';
  const Q_BASE = 'https://www.qconcursos.com/questoes-de-concursos/questoes';
  let db = null;
  let user = null;
  let topics = [];
  let subjects = [];
  let sources = [];
  let practices = [];
  let mounted = false;

  const $ = selector => document.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function addCss() {
    if ($('#mentorP8Css')) return;
    const link = document.createElement('link');
    link.id = 'mentorP8Css';
    link.rel = 'stylesheet';
    link.href = './external-practice.css?v=8.0';
    document.head.appendChild(link);
  }

  async function context(timeout = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const client = window.mentorCloud?.client;
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        return { db: client, user: session?.user || null };
      }
      await sleep(60);
    }
    return { db: null, user: null };
  }

  function validHttps(value) {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }

  function validQ(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'qconcursos.com' || url.hostname.endsWith('.qconcursos.com'));
    } catch { return false; }
  }

  function topicById(id) { return topics.find(row => row.id === id) || null; }
  function subjectById(id) { return subjects.find(row => row.id === id) || null; }
  function selectedTopicId() { return $('#p8Topic')?.value || ''; }

  function message(text, kind = 'neutral') {
    const node = $('#p8Message');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.kind = kind;
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
        <div><span class="eyebrow">FONTES EXTERNAS • P8</span><h2>Qconcursos + internet, no mesmo fluxo.</h2><p>O banco próprio continua primeiro. Quando faltar volume, use seu filtro do Qconcursos ou uma fonte externa confiável e registre o resultado aqui.</p></div>
      </div>
      <div class="p8-priority"><span>Prioridade de fonte</span><strong>PDF privado → banco próprio → Qconcursos → internet</strong></div>
      <div class="p8-grid">
        <article class="p8-card">
          <span class="eyebrow">TÓPICO OFICIAL</span>
          <label>Assunto<select id="p8Topic"><option value="">Escolha um tópico do edital</option></select></label>
          <div class="p8-actions-inline"><button type="button" id="p8OpenQ" class="primary">Abrir Qconcursos</button><button type="button" id="p8SearchWeb" class="secondary">Buscar na internet</button></div>
          <small>O Mentor não acessa sua senha nem faz scraping. Você usa o Q normalmente e volta para registrar o resultado.</small>
        </article>
        <article class="p8-card">
          <span class="eyebrow">FILTRO DO QCONCURSOS</span>
          <label>Link do filtro<input id="p8QUrl" type="url" inputmode="url" placeholder="https://www.qconcursos.com/questoes-de-concursos/questoes?..." /></label>
          <div class="p8-actions-inline"><button type="button" id="p8SaveQ" class="primary">Salvar filtro</button><button type="button" id="p8OpenSavedQ" class="secondary">Abrir salvo</button></div>
          <small id="p8SavedQHint">Nenhum filtro salvo para este tópico.</small>
        </article>
      </div>

      <article class="p8-card p8-batch">
        <div class="p8-card-head"><div><span class="eyebrow">REGISTRAR BATERIA EXTERNA</span><h3>Transforme o resultado em evidência para a Mentora.</h3></div><span id="p8BatchSource" class="p8-source-badge">QCONCURSOS</span></div>
        <div class="p8-form-grid">
          <label>Fonte<select id="p8SourceKind"><option value="qconcursos">Qconcursos</option><option value="official">Fonte oficial</option><option value="web">Outra fonte da internet</option></select></label>
          <label>Questões feitas<input id="p8Total" type="number" min="1" max="500" value="10" /></label>
          <label>Acertos<input id="p8Correct" type="number" min="0" max="500" value="0" /></label>
          <label>Tempo total (min)<input id="p8Minutes" type="number" min="0" max="900" placeholder="opcional" /></label>
          <label>Confiança geral<select id="p8Confidence"><option value="low">Baixa</option><option value="medium" selected>Média</option><option value="high">Alta</option></select></label>
          <label>Link da sessão/fonte<input id="p8PracticeUrl" type="url" inputmode="url" placeholder="opcional" /></label>
        </div>
        <label>Observação<textarea id="p8Notes" rows="2" maxlength="500" placeholder="Ex.: errei principalmente exceções da regra..."></textarea></label>
        <button type="button" id="p8RecordBatch" class="primary">Registrar bateria</button>
      </article>

      <article class="p8-card">
        <div class="p8-card-head"><div><span class="eyebrow">FONTE / MATERIAL EXTERNO</span><h3>Guardar um link confiável para este tópico.</h3></div></div>
        <div class="p8-source-form"><select id="p8LinkKind"><option value="official">Oficial</option><option value="web">Internet</option></select><input id="p8LinkLabel" type="text" maxlength="120" placeholder="Nome da fonte" /><input id="p8LinkUrl" type="url" inputmode="url" placeholder="https://..." /><button type="button" id="p8SaveLink" class="secondary">Salvar</button></div>
        <div id="p8Sources" class="p8-source-list"></div>
      </article>

      <div class="p8-summary-grid">
        <article><span>Baterias externas</span><strong id="p8BatchCount">0</strong><small>registradas</small></article>
        <article><span>Questões externas</span><strong id="p8QuestionCount">0</strong><small>evidências agregadas</small></article>
        <article><span>Acerto externo</span><strong id="p8Accuracy">—</strong><small>ponderado por volume</small></article>
      </div>
      <p id="p8Message" class="p8-message" aria-live="polite"></p>`;

    const ops = $('#mentorQgOps');
    const filter = view.querySelector('.bank-filter-card');
    if (ops) ops.insertAdjacentElement('afterend', panel);
    else if (filter) filter.insertAdjacentElement('beforebegin', panel);
    else view.appendChild(panel);

    $('#p8Topic')?.addEventListener('change', () => { syncSelectedTopic(); renderSources(); });
    $('#p8OpenQ')?.addEventListener('click', openQBase);
    $('#p8SearchWeb')?.addEventListener('click', searchWeb);
    $('#p8SaveQ')?.addEventListener('click', saveQFilter);
    $('#p8OpenSavedQ')?.addEventListener('click', openSavedQ);
    $('#p8RecordBatch')?.addEventListener('click', recordBatch);
    $('#p8SaveLink')?.addEventListener('click', saveExternalLink);
    $('#p8SourceKind')?.addEventListener('change', () => {
      const badge = $('#p8BatchSource'); if (badge) badge.textContent = $('#p8SourceKind').value.toUpperCase();
    });
    mounted = true;
  }

  function renderTopicOptions() {
    const select = $('#p8Topic');
    if (!select) return;
    const current = select.value;
    const ordered = [...topics].sort((a,b) => {
      const sa = Number(subjectById(a.subject_id)?.position || 999);
      const sb = Number(subjectById(b.subject_id)?.position || 999);
      return sa - sb || Number(a.position || 0) - Number(b.position || 0);
    });
    select.innerHTML = '<option value="">Escolha um tópico do edital</option>' + ordered.map(topic => {
      const subject = subjectById(topic.subject_id)?.name || 'Matéria';
      return `<option value="${esc(topic.id)}">${esc(subject)} • ${esc(topic.syllabus_code || '')} • ${esc(topic.title)}</option>`;
    }).join('');
    if (ordered.some(t => t.id === current)) select.value = current;
  }

  function savedQFor(topicId) {
    return sources.find(row => row.topic_id === topicId && row.source_kind === 'qconcursos_filter') || null;
  }

  function syncSelectedTopic() {
    const topicId = selectedTopicId();
    const saved = savedQFor(topicId);
    const input = $('#p8QUrl');
    if (input) input.value = saved?.url || '';
    const hint = $('#p8SavedQHint');
    if (hint) hint.textContent = saved ? `Filtro salvo em ${new Intl.DateTimeFormat('pt-BR').format(new Date(saved.updated_at || saved.created_at))}.` : 'Nenhum filtro salvo para este tópico.';
  }

  function openQBase() {
    const topic = topicById(selectedTopicId());
    if (!topic) return message('Escolha primeiro um tópico do edital.', 'warn');
    const saved = savedQFor(topic.id);
    window.open(saved?.url || Q_BASE, '_blank', 'noopener,noreferrer');
  }

  function openSavedQ() {
    const saved = savedQFor(selectedTopicId());
    if (!saved) return message('Ainda não há filtro do Qconcursos salvo para esse tópico.', 'warn');
    window.open(saved.url, '_blank', 'noopener,noreferrer');
  }

  function searchWeb() {
    const topic = topicById(selectedTopicId());
    if (!topic) return message('Escolha primeiro um tópico do edital.', 'warn');
    const subject = subjectById(topic.subject_id)?.name || '';
    const query = encodeURIComponent(`PMBA FCC ${subject} ${topic.title} questões prova gabarito`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
  }

  async function saveQFilter() {
    const topicId = selectedTopicId();
    const url = $('#p8QUrl')?.value.trim() || '';
    if (!topicId) return message('Escolha o tópico correspondente ao filtro.', 'warn');
    if (!validQ(url)) return message('Use um link HTTPS oficial do domínio qconcursos.com.', 'warn');
    const existing = savedQFor(topicId);
    const row = { user_id:user.id, topic_id:topicId, source_kind:'qconcursos_filter', label:'Filtro Qconcursos', url, updated_at:new Date().toISOString() };
    const result = existing
      ? await db.from('external_topic_sources').update(row).eq('id',existing.id).eq('user_id',user.id).select('*').single()
      : await db.from('external_topic_sources').insert(row).select('*').single();
    if (result.error) return message(result.error.message || 'Não foi possível salvar o filtro.', 'error');
    await loadData();
    syncSelectedTopic();
    message('Filtro do Qconcursos salvo para este tópico.', 'ok');
  }

  async function saveExternalLink() {
    const topicId = selectedTopicId();
    const kind = $('#p8LinkKind')?.value || 'web';
    const label = $('#p8LinkLabel')?.value.trim() || '';
    const url = $('#p8LinkUrl')?.value.trim() || '';
    if (!topicId) return message('Escolha primeiro o tópico do edital.', 'warn');
    if (!label) return message('Informe um nome para a fonte.', 'warn');
    if (!validHttps(url)) return message('A fonte precisa usar HTTPS.', 'warn');
    const result = await db.from('external_topic_sources').insert({ user_id:user.id, topic_id:topicId, source_kind:kind, label, url });
    if (result.error) return message(result.error.message || 'Não foi possível salvar a fonte.', 'error');
    $('#p8LinkLabel').value = ''; $('#p8LinkUrl').value = '';
    await loadData(); renderSources();
    message('Fonte externa salva para esse tópico.', 'ok');
  }

  async function recordBatch() {
    const topicId = selectedTopicId();
    const total = Number($('#p8Total')?.value || 0);
    const correct = Number($('#p8Correct')?.value || 0);
    const sourceKind = $('#p8SourceKind')?.value || 'qconcursos';
    const url = $('#p8PracticeUrl')?.value.trim() || '';
    if (!topicId) return message('Escolha o tópico da bateria.', 'warn');
    if (!Number.isInteger(total) || total < 1 || total > 500) return message('Informe uma quantidade válida de questões.', 'warn');
    if (!Number.isInteger(correct) || correct < 0 || correct > total) return message('Os acertos precisam ficar entre 0 e o total.', 'warn');
    if (url && !validHttps(url)) return message('O link da sessão precisa usar HTTPS.', 'warn');
    message('Registrando resultado e atualizando domínio…');
    const { data, error } = await db.functions.invoke('record-external-practice', { body: {
      topic_id:topicId, source_kind:sourceKind, total_questions:total, correct_count:correct,
      confidence:$('#p8Confidence')?.value || 'medium', total_minutes:Number($('#p8Minutes')?.value || 0) || null,
      source_url:url || null, notes:$('#p8Notes')?.value.trim() || null
    }});
    if (error || data?.error) return message(data?.error || error?.message || 'Não foi possível registrar a bateria.', 'error');
    $('#p8Notes').value = '';
    await loadData(); renderSummary();
    window.dispatchEvent(new CustomEvent('mentor:external-practice-saved', { detail:{ topicId, total, correct, sourceKind } }));
    window.MentorEngine?.analyze?.('today', false).catch?.(()=>{});
    message(`Bateria registrada: ${correct}/${total} (${Math.round(correct/total*100)}%). A Mentora já pode usar essa evidência.`, 'ok');
  }

  function renderSources() {
    const node = $('#p8Sources');
    if (!node) return;
    const topicId = selectedTopicId();
    const rows = sources.filter(row => row.topic_id === topicId && row.source_kind !== 'qconcursos_filter');
    node.innerHTML = rows.length ? rows.map(row => `<a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(row.source_kind === 'official' ? 'OFICIAL' : 'WEB')}</span><strong>${esc(row.label)}</strong><small>${esc(new URL(row.url).hostname)}</small></a>`).join('') : '<div class="p8-empty">Nenhuma fonte extra salva para este tópico.</div>';
  }

  function renderSummary() {
    const totalQuestions = practices.reduce((sum,row) => sum + Number(row.total_questions || 0),0);
    const totalCorrect = practices.reduce((sum,row) => sum + Number(row.correct_count || 0),0);
    if ($('#p8BatchCount')) $('#p8BatchCount').textContent = practices.length;
    if ($('#p8QuestionCount')) $('#p8QuestionCount').textContent = totalQuestions;
    if ($('#p8Accuracy')) $('#p8Accuracy').textContent = totalQuestions ? `${Math.round(totalCorrect/totalQuestions*100)}%` : '—';
  }

  async function loadData() {
    if (!db || !user) return;
    const [t,s,src,p] = await Promise.all([
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true),
      db.from('subjects').select('id,name,position').eq('active',true),
      db.from('external_topic_sources').select('*').eq('user_id',user.id).order('updated_at',{ascending:false}),
      db.from('external_practice_batches').select('*').eq('user_id',user.id).order('completed_at',{ascending:false}).limit(500)
    ]);
    for (const r of [t,s,src,p]) if (r.error) throw r.error;
    topics=t.data||[]; subjects=s.data||[]; sources=src.data||[]; practices=p.data||[];
    renderTopicOptions(); syncSelectedTopic(); renderSources(); renderSummary();
  }

  async function openForTopic(topicId) {
    const nav = document.querySelector('[data-go="acervo"]'); nav?.click();
    for (let i=0;i<50 && !$('#p8Topic');i+=1) await sleep(50);
    if ($('#p8Topic') && topics.some(row=>row.id===topicId)) {
      $('#p8Topic').value = topicId; syncSelectedTopic(); renderSources();
      $('#mentorP8Panel')?.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  }

  async function boot() {
    addCss();
    for (let i=0;i<100 && !$('[data-view="acervo"]');i+=1) await sleep(50);
    inject();
    const ctx = await context(); db=ctx.db; user=ctx.user;
    if (!db || !user) return message('Entre na conta para salvar filtros e resultados externos.', 'warn');
    await loadData();
    db.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'||event==='SIGNED_OUT'){
        user=session?.user||null;
        setTimeout(()=>{ if(user) loadData().catch(console.error); },120);
      }
    });
  }

  window.MentorExternalPractice = Object.freeze({ version:VERSION, openForTopic, reload:loadData });
  boot().catch(error => { console.error('P8:',error); message('Não foi possível iniciar as fontes externas agora.','error'); });
})();