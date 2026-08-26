(() => {
  'use strict';

  const VERSION = '9.1';
  const URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const ALIAS = { 'Língua Portuguesa': 'Português' };

  let db = null;
  let user = null;
  let syllabusSubjects = [];
  let syllabusTopics = [];
  let bank = [];
  let states = new Map();
  let current = null;
  let startedAt = 0;
  let confidence = 'medium';
  let choice = null;
  let eliminated = new Set();
  let answered = false;
  let saving = false;
  let sessionCorrect = 0;
  let sessionAnswered = 0;
  let currentFilter = 'auto';

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function addCss(id, href) {
    if ($(id)) return;
    const link = document.createElement('link');
    link.id = id.replace('#','');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = $(id);
      if (existing) {
        if (existing.dataset.loaded === '1' || existing.readyState === 'complete') return resolve();
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', reject, { once:true });
        return;
      }
      const script = document.createElement('script');
      script.id = id.replace('#','');
      script.src = src;
      script.onload = () => { script.dataset.loaded = '1'; resolve(); };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async function loadAssets() {
    addCss('#mentorQuestionFiltersCss', './question-filters.css?v=9.1');
    if (!$('#mentorEditalCore')) {
      const script = document.createElement('script');
      script.id = 'mentorEditalCore';
      script.src = './edital-core.js?v=1.8';
      document.body.appendChild(script);
    }
    await loadScript('#mentorQuestionState', './question-state.js?v=2.1');
    await loadScript('#mentorQuestionFilters', './question-filters.js?v=9.1');
  }

  function setVersion() {
    document.title = 'Mentor IA — PMBA 2026';
    $$('.version-badge').forEach(node => node.textContent = 'PMBA');
  }

  function injectUI() {
    if ($('[data-view="acervo"]')) return;
    const main = $('main');
    if (!main) return;

    const section = document.createElement('section');
    section.className = 'view';
    section.dataset.view = 'acervo';
    section.innerHTML = `
      <div class="qg-bank-header">
        <div>
          <span class="qg-kicker">CENTRAL DE QUESTÕES • EDITAL PMBA SOLDADO 2026</span>
          <h1>Modo QG + Mentora</h1>
          <p>Questões inéditas têm prioridade. Questões antigas só voltam automaticamente quando a revisão vence.</p>
        </div>
        <span class="qg-version">V${VERSION}</span>
      </div>

      <div class="bank-stats">
        <article><span>Questões</span><strong id="bankTotal">—</strong><small>elegíveis no filtro</small></article>
        <article><span>Novas</span><strong id="bankNew">—</strong><small>ainda não vistas</small></article>
        <article><span>Operação</span><strong id="bankSession">0/0</strong><small>acertos / respostas</small></article>
      </div>

      <article class="bank-filter-card qg-panel">
        <div class="qg-panel-title">FILTRO PELO EDITAL</div>
        <div class="bank-filter-grid">
          <label>Matéria<select id="bankSubject"><option value="">Todas do edital</option></select></label>
          <label>Assunto<select id="bankTopic"><option value="">Todos do edital</option></select></label>
        </div>
        <div class="question-state-filter">
          <span class="question-state-filter-label">Estado da questão</span>
          <div id="bankStateFilters" class="question-state-filter-list"></div>
          <div id="bankStateSummary" class="question-state-summary">Automático: inéditas primeiro; depois revisões vencidas.</div>
        </div>
        <button class="qg-btn qg-btn-primary" id="bankStartBtn">INICIAR QUESTÕES REAIS</button>
        <p id="bankStatus" class="bank-status">Entre na sua conta para carregar o edital e seu banco privado.</p>
      </article>

      <div id="bankOperational" class="hidden">
        <div class="qg-timer-bar"><span>⏱ TEMPO NA QUESTÃO</span><span id="bankTimer" class="qg-time-display">00:00</span></div>
        <article id="bankQuestionCard" class="qg-question-card">
          <div class="qg-meta-info"><span id="bankQuestionMeta">Questão</span><span id="bankQuestionStatus" class="qg-status-badge badge-novo">NOVA</span></div>
          <div class="qg-source-line"><strong id="bankQuestionSubject">Matéria</strong><span>•</span><span id="bankQuestionTopic">Assunto</span><span>•</span><span id="bankQuestionSource">Seu módulo</span></div>
          <div id="bankStatement" class="qg-enunciado"></div>
          <div id="bankAnswers" class="qg-options-list"></div>
          <div class="qg-confidence"><span>CONFIANÇA ANTES DO GABARITO:</span><button data-bank-confidence="low">BAIXA</button><button data-bank-confidence="medium" class="active">MÉDIA</button><button data-bank-confidence="high">ALTA</button></div>
          <div id="bankFeedback" class="qg-comment-box hidden"></div>
          <div class="qg-actions"><span id="bankProgress">Aguardando resposta</span><div><button id="bankConfirmBtn" class="qg-btn qg-btn-confirm hidden">DISPARAR GABARITO</button><button id="bankNextBtn" class="qg-btn hidden">AVANÇAR LINHA DE FRENTE →</button></div></div>
        </article>
      </div>`;
    main.appendChild(section);

    const nav = $('.bottom-nav');
    if (nav && !nav.querySelector('[data-go="acervo"]')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.dataset.go = 'acervo';
      button.innerHTML = '<span>▣</span><small>Questões</small>';
      const old = nav.querySelector('[data-go="diagnostico"]');
      old ? old.replaceWith(button) : nav.prepend(button);
    }

    const hero = $('[data-view="inicio"] .hero-card');
    if (hero && !$('#bankHomeCard')) {
      const card = document.createElement('article');
      card.id = 'bankHomeCard';
      card.className = 'bank-home-card qg-panel';
      card.innerHTML = '<div><span class="qg-kicker">EDITAL PMBA 2026 + BANCO REAL</span><h2>Treino guiado pelo edital.</h2><p id="bankHomeText">Carregando cobertura do seu edital…</p></div><button class="qg-btn qg-btn-primary" data-go="acervo">ABRIR QUESTÕES</button>';
      hero.insertAdjacentElement('afterend', card);
    }

    $('#bankStartBtn')?.addEventListener('click', begin);
    $('#bankConfirmBtn')?.addEventListener('click', confirmAnswer);
    $('#bankNextBtn')?.addEventListener('click', nextQuestion);
    $('#bankSubject')?.addEventListener('change', () => { renderTopicOptions(); updateCounts(); });
    $('#bankTopic')?.addEventListener('change', updateCounts);

    section.addEventListener('click', event => {
      const stateFilter = event.target.closest('[data-question-filter]');
      if (stateFilter) {
        currentFilter = stateFilter.dataset.questionFilter || 'auto';
        renderStateFilters();
        updateCounts();
        return;
      }
      const conf = event.target.closest('[data-bank-confidence]');
      if (conf && !answered && !saving) {
        confidence = conf.dataset.bankConfidence;
        $$('[data-bank-confidence]').forEach(node => node.classList.toggle('active', node === conf));
        return;
      }
      const eliminate = event.target.closest('[data-bank-eliminate]');
      if (eliminate && !answered && !saving) {
        event.stopPropagation();
        toggleEliminate(eliminate.dataset.bankEliminate);
        return;
      }
      const answer = event.target.closest('[data-bank-answer]');
      if (answer && !answered && !saving) selectAnswer(answer.dataset.bankAnswer);
    });
  }

  function status(text, kind='neutral') {
    const node = $('#bankStatus');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
  }

  async function getClient() {
    if (window.mentorCloud?.client) return window.mentorCloud.client;
    if (!window.supabase?.createClient) throw new Error('Supabase não carregou.');
    return window.supabase.createClient(URL, KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
  }

  async function loadData() {
    if (!db) db = await getClient();
    const { data:{session} } = await db.auth.getSession();
    user = session?.user || null;
    if (!user) {
      syllabusSubjects = [];
      syllabusTopics = [];
      bank = [];
      states = new Map();
      status('Entre na sua conta para acessar a grade PMBA 2026 e seu banco privado.', 'warn');
      updateCounts();
      return;
    }

    status('Carregando edital PMBA 2026 e questões…', 'loading');
    const [subjectsResult, topicsResult, questionsResult] = await Promise.all([
      db.from('subjects').select('id,name,position,syllabus_section').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,position,syllabus_code').eq('active',true).order('position'),
      db.from('questions').select('id,exam_name,subject_id,topic_id,subject_label,topic_label,source_question_number,statement,alternatives,correct_answer,explanation,option_explanations,explanation_status,answer_key_note,difficulty,difficulty_origin,source_kind').not('explanation','is',null).order('created_at',{ascending:true}).limit(5000)
    ]);
    if (subjectsResult.error) throw subjectsResult.error;
    if (topicsResult.error) throw topicsResult.error;
    if (questionsResult.error) throw questionsResult.error;
    syllabusSubjects = subjectsResult.data || [];
    syllabusTopics = topicsResult.data || [];
    bank = questionsResult.data || [];

    states = new Map();
    const ids = bank.map(row => row.id);
    if (ids.length) {
      const result = await db.from('user_question_state')
        .select('question_id,seen_count,correct_count,wrong_count,last_seen_at,next_review_at,status,last_selected_answer,last_is_correct,last_response_time_seconds,last_confidence,last_attempt_at,review_stage,review_interval_hours,review_defer_count')
        .in('question_id', ids);
      if (result.error) throw result.error;
      (result.data || []).forEach(row => states.set(row.question_id, row));
    }

    renderSubjectOptions();
    renderTopicOptions();
    renderStateFilters();
    updateCounts();
    const covered = new Set(bank.map(q => q.topic_id).filter(Boolean)).size;
    status(`Edital carregado: ${syllabusSubjects.length} matérias, ${syllabusTopics.length} tópicos. ${covered} tópico(s) já têm questões.`, 'ok');
    if ($('#bankHomeText')) $('#bankHomeText').textContent = `${syllabusTopics.length} tópicos oficiais carregados; ${covered} já têm questões reais no banco.`;
  }

  function renderSubjectOptions() {
    const select = $('#bankSubject');
    if (!select) return;
    const old = select.value;
    select.innerHTML = '<option value="">Todas do edital</option>' + syllabusSubjects.map(subject => `<option value="${subject.id}">${esc(subject.name)}</option>`).join('');
    if (syllabusSubjects.some(subject => subject.id === old)) select.value = old;
  }

  function renderTopicOptions() {
    const subjectId = $('#bankSubject')?.value || '';
    const select = $('#bankTopic');
    if (!select) return;
    const old = select.value;
    const items = syllabusTopics.filter(topic => !subjectId || topic.subject_id === subjectId).sort((a,b) => (a.position||0)-(b.position||0));
    select.innerHTML = '<option value="">Todos do edital</option>' + items.map(topic => {
      const count = bank.filter(q => q.topic_id === topic.id).length;
      return `<option value="${topic.id}">${esc(topic.syllabus_code || '')} — ${esc(topic.title)}${count ? ` (${count})` : ' (0)'}</option>`;
    }).join('');
    if (items.some(topic => topic.id === old)) select.value = old;
  }

  function baseFilteredBank() {
    const subjectId = $('#bankSubject')?.value || '';
    const topicId = $('#bankTopic')?.value || '';
    return bank.filter(q => (!subjectId || q.subject_id === subjectId) && (!topicId || q.topic_id === topicId));
  }

  function visibleFilteredBank() {
    const base = baseFilteredBank();
    const filters = window.MentorQuestionFilters;
    return filters ? filters.filtered(base, states, currentFilter) : base;
  }

  function selectedTopic() {
    const id = $('#bankTopic')?.value || '';
    return syllabusTopics.find(topic => topic.id === id) || null;
  }

  function renderStateFilters() {
    const host = $('#bankStateFilters');
    const filters = window.MentorQuestionFilters;
    if (!host || !filters) return;
    const counts = filters.counts(baseFilteredBank(), states);
    const order = [filters.FILTERS.AUTO, filters.FILTERS.NEW, filters.FILTERS.WRONG, filters.FILTERS.CORRECT, filters.FILTERS.REVIEW, filters.FILTERS.MASTERED, filters.FILTERS.ALL];
    host.innerHTML = order.map(key => `<button type="button" class="question-state-filter-btn ${currentFilter === key ? 'active' : ''}" data-question-filter="${key}">${esc(filters.LABELS[key])}<span>${counts[key] ?? 0}</span></button>`).join('');
    const summary = $('#bankStateSummary');
    if (summary) summary.textContent = currentFilter === filters.FILTERS.AUTO
      ? 'Automático: inéditas primeiro; depois somente revisões vencidas. Se ambas acabarem, a operação termina.'
      : `${filters.LABELS[currentFilter]}: ${counts[currentFilter] ?? 0} questão(ões) neste recorte.`;
  }

  function updateCounts() {
    const base = baseFilteredBank();
    const filters = window.MentorQuestionFilters;
    const counts = filters ? filters.counts(base, states) : { new: base.filter(q => !states.get(q.id)?.seen_count).length };
    const visible = visibleFilteredBank();
    if ($('#bankTotal')) $('#bankTotal').textContent = visible.length;
    if ($('#bankNew')) $('#bankNew').textContent = counts.new ?? 0;
    if ($('#bankSession')) $('#bankSession').textContent = `${sessionCorrect}/${sessionAnswered}`;
    renderStateFilters();

    const topic = selectedTopic();
    if (topic && base.length === 0) {
      status(`Este item está no edital (${topic.syllabus_code || ''}), mas ainda não tem questões no banco. Ele fica na fila de abastecimento por PDF/internet.`, 'warn');
    } else if (base.length && visible.length === 0) {
      status(currentFilter === 'auto' ? 'Não há questão nova nem revisão vencida neste recorte agora.' : 'Não há questões neste estado para o filtro atual.', 'warn');
    }
  }

  function chooseQuestion() {
    const items = baseFilteredBank();
    if (!items.length) return null;
    const filters = window.MentorQuestionFilters;
    if (filters) return filters.choose(items, states, currentFilter);
    const unseen = items.filter(q => !states.get(q.id)?.seen_count);
    return unseen[0] || null;
  }

  async function begin() {
    if (!db) db = await getClient();
    const { data:{session} } = await db.auth.getSession();
    if (!session?.user) {
      window.mentorCloud?.openLogin?.();
      status('Entre na conta e toque novamente em iniciar.', 'warn');
      return;
    }
    if (!syllabusSubjects.length) await loadData();
    current = chooseQuestion();
    if (!current) {
      const topic = selectedTopic();
      const filterLabel = window.MentorQuestionFilters?.LABELS?.[currentFilter];
      status(topic ? `Sem questões elegíveis para ${topic.syllabus_code || ''} — ${topic.title}${filterLabel ? ` no filtro ${filterLabel}` : ''}.` : 'Nenhuma questão elegível neste filtro.', 'warn');
      return;
    }
    $('#bankOperational')?.classList.remove('hidden');
    showQuestion(current);
  }

  function questionBadge(q) {
    const state = states.get(q.id);
    const descriptor = window.MentorQuestionState?.describe?.(state);
    if (descriptor) return [descriptor.label, descriptor.className];
    if (!state || !state.seen_count) return ['NOVA','badge-novo'];
    if (state.status === 'mastered') return ['DOMINADA','badge-acerto'];
    if (state.status === 'review') return ['REVISÃO','badge-erro'];
    if (state.last_is_correct === true) return ['ACERTADA','badge-acerto'];
    if (state.last_is_correct === false) return ['ERRADA','badge-erro'];
    return ['RESPONDIDA','badge-learning'];
  }

  function renderCurrentBadge() {
    if (!current) return;
    const [label, cls] = questionBadge(current);
    const badge = $('#bankQuestionStatus');
    if (badge) { badge.textContent = label; badge.className = `qg-status-badge ${cls}`; }
  }

  function showQuestion(q) {
    current = q;
    answered = false;
    saving = false;
    choice = null;
    eliminated = new Set();
    startedAt = Date.now();
    confidence = 'medium';
    $$('[data-bank-confidence]').forEach(button => { button.disabled = false; button.classList.toggle('active', button.dataset.bankConfidence === 'medium'); });
    $('#bankFeedback')?.classList.add('hidden');
    $('#bankConfirmBtn')?.classList.add('hidden');
    $('#bankNextBtn')?.classList.add('hidden');

    renderCurrentBadge();
    $('#bankQuestionSource').textContent = q.exam_name || 'Seu módulo';
    $('#bankQuestionMeta').textContent = `QUESTÃO ${q.source_question_number || '—'}`;
    $('#bankQuestionSubject').textContent = q.subject_label || syllabusSubjects.find(s => s.id === q.subject_id)?.name || 'Matéria';
    $('#bankQuestionTopic').textContent = q.topic_label || syllabusTopics.find(t => t.id === q.topic_id)?.title || 'Assunto';
    $('#bankStatement').textContent = q.statement;
    $('#bankProgress').textContent = `${sessionAnswered} respondida(s) nesta operação`;

    const entries = Object.entries(q.alternatives || {});
    const canEliminate = entries.length > 2;
    $('#bankAnswers').innerHTML = entries.map(([letter,text]) => `
      <div class="qg-option-wrapper" data-option-wrapper="${esc(letter)}">
        <button class="qg-option-item" data-bank-answer="${esc(letter)}"><span class="qg-option-letter">${esc(letter)}</span><span>${esc(text)}</span></button>
        ${canEliminate ? `<button class="qg-btn-eliminar" data-bank-eliminate="${esc(letter)}" title="Eliminar alternativa">×</button>` : ''}
      </div>`).join('');

    tickTimer();
    clearInterval(window.__mentorBankTimer);
    window.__mentorBankTimer = setInterval(tickTimer, 1000);
    $('#bankQuestionCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function selectAnswer(letter) {
    if (answered || saving || eliminated.has(letter)) return;
    choice = letter;
    $$('[data-option-wrapper]').forEach(wrapper => wrapper.classList.toggle('selected', wrapper.dataset.optionWrapper === letter));
    $('#bankConfirmBtn')?.classList.remove('hidden');
  }

  function toggleEliminate(letter) {
    if (answered || saving) return;
    const wrapper = [...$$('[data-option-wrapper]')].find(node => node.dataset.optionWrapper === letter);
    if (!wrapper) return;
    if (eliminated.has(letter)) {
      eliminated.delete(letter);
      wrapper.classList.remove('eliminated');
    } else {
      eliminated.add(letter);
      wrapper.classList.add('eliminated');
      if (choice === letter) {
        choice = null;
        wrapper.classList.remove('selected');
        $('#bankConfirmBtn')?.classList.add('hidden');
      }
    }
  }

  function tickTimer() {
    const timer = $('#bankTimer');
    if (!timer || !startedAt || answered) return;
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    timer.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
  }

  function confidenceNumber() {
    return ({low:2, medium:3, high:5})[confidence] || 3;
  }

  function mentorSignal(correct, secs) {
    if (correct && confidence === 'high' && secs <= 45) return 'Sinal forte de domínio. Vou exigir consistência antes de considerar este item do edital dominado.';
    if (correct && confidence === 'low') return 'Acerto frágil: resposta certa com pouca segurança. Este tópico deve reaparecer.';
    if (!correct && confidence === 'high') return 'Alerta conceitual: erro com confiança alta. Este item do edital sobe na fila de revisão.';
    if (!correct && confidence === 'low') return 'Lacuna reconhecida. A próxima intervenção deve reforçar a base deste mesmo item do edital.';
    return correct ? 'Bom sinal. Continue até haver evidência suficiente de domínio.' : 'Erro registrado. A revisão continuará presa a este tópico oficial do edital.';
  }

  function clientAttemptId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function updateLocalStateFromResult(result, selected, correct, secs) {
    const old = states.get(current.id) || { seen_count:0, correct_count:0, wrong_count:0, review_stage:0, review_defer_count:0 };
    states.set(current.id, {
      ...old,
      question_id: current.id,
      seen_count: Number(old.seen_count || 0) + (result.duplicate ? 0 : 1),
      correct_count: Number(old.correct_count || 0) + (!result.duplicate && correct ? 1 : 0),
      wrong_count: Number(old.wrong_count || 0) + (!result.duplicate && !correct ? 1 : 0),
      last_seen_at: new Date().toISOString(),
      next_review_at: result.next_review_at || old.next_review_at,
      status: result.status || old.status,
      last_selected_answer: selected,
      last_is_correct: correct,
      last_response_time_seconds: secs,
      last_confidence: confidenceNumber(),
      last_attempt_at: new Date().toISOString(),
      review_stage: Number(result.review_stage ?? old.review_stage ?? 0),
      review_interval_hours: Number(result.review_interval_hours ?? old.review_interval_hours ?? 0) || null,
      review_defer_count: 0
    });
  }

  async function confirmAnswer() {
    if (!current || answered || saving || !choice) return;
    saving = true;
    const confirm = $('#bankConfirmBtn');
    if (confirm) { confirm.disabled = true; confirm.textContent = 'SALVANDO…'; }

    const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const right = String(current.correct_answer).toUpperCase();
    const selected = String(choice).toUpperCase();
    const correct = selected === right;

    try {
      const { data:{session} } = await db.auth.getSession();
      user = session?.user || null;
      if (!user) throw new Error('Sessão encerrada. Entre novamente.');

      const { data, error } = await db.rpc('record_question_attempt_atomic', {
        p_question_id: current.id,
        p_selected_answer: selected,
        p_response_time_seconds: secs,
        p_confidence: confidenceNumber(),
        p_client_attempt_id: clientAttemptId(),
        p_reasoning_text: null,
        p_source_kind: current.source_kind || 'personal_module'
      });
      if (error || !data?.ok) throw error || new Error('Não foi possível registrar a resposta.');

      answered = true;
      saving = false;
      clearInterval(window.__mentorBankTimer);
      sessionAnswered += 1;
      if (correct) sessionCorrect += 1;
      updateLocalStateFromResult(data, selected, correct, secs);

      $$('[data-option-wrapper]').forEach(wrapper => {
        const letter = wrapper.dataset.optionWrapper;
        wrapper.classList.remove('selected','eliminated');
        if (letter === right) wrapper.classList.add('correct');
        if (letter === selected && !correct) wrapper.classList.add('wrong');
        wrapper.querySelectorAll('button').forEach(button => button.disabled = true);
      });
      $$('[data-bank-confidence]').forEach(button => button.disabled = true);
      if (confirm) { confirm.classList.add('hidden'); confirm.disabled = false; confirm.textContent = 'DISPARAR GABARITO'; }
      $('#bankNextBtn')?.classList.remove('hidden');

      const feedback = $('#bankFeedback');
      feedback.className = `qg-comment-box ${correct ? 'good' : 'bad'}`;
      feedback.innerHTML = `<div class="qg-feedback-result">${correct ? '✅ ALVO CONFIRMADO — ACERTO' : `❌ RESPOSTA INCORRETA — GABARITO ${esc(right)}`}</div><div class="qg-analysis-title">💡 EXPLICAÇÃO + LEITURA DA MENTORA</div><p>${esc(current.explanation || 'Explicação em preparação.')}</p><div class="qg-mentor-signal">${esc(mentorSignal(correct, secs))}</div><small>Tempo: ${secs}s • Confiança: ${confidence === 'high' ? 'alta' : confidence === 'low' ? 'baixa' : 'média'}${eliminated.size ? ` • ${eliminated.size} alternativa(s) eliminada(s)` : ''}</small>`;
      $('#bankProgress').textContent = `${sessionCorrect}/${sessionAnswered} acertos nesta operação`;

      window.MentorQuestionFeedback?.render?.(current, selected);
      renderCurrentBadge();
      updateCounts();
      if (!data.duplicate) mirrorToLegacyState(correct, secs);

      const detail = {
        atomic: true,
        reviewScheduled: true,
        planProgressHandled: true,
        questionId: current.id,
        topicId: current.topic_id,
        subjectId: current.subject_id,
        correct,
        nextReviewAt: data.next_review_at,
        reviewStage: data.review_stage,
        reviewIntervalHours: data.review_interval_hours,
        planItemId: data.plan_item_id || null,
        planItemCompleted: data.plan_item_completed === true
      };
      window.dispatchEvent(new CustomEvent('mentor:attempt-saved', { detail }));
      window.dispatchEvent(new CustomEvent('mentor:question-revealed', { detail:{ question:current, selected, correct } }));
    } catch (error) {
      saving = false;
      console.error('Falha ao salvar tentativa atômica:', error);
      if (confirm) { confirm.disabled = false; confirm.textContent = 'TENTAR SALVAR DE NOVO'; }
      const feedback = $('#bankFeedback');
      feedback.className = 'qg-comment-box bad';
      feedback.innerHTML = `<div class="qg-feedback-result">⚠ RESPOSTA AINDA NÃO REGISTRADA</div><p>${esc(error?.message || 'Falha temporária de conexão.')}</p><small>O gabarito não foi consumido. Toque novamente para tentar salvar sem duplicar a tentativa.</small>`;
    }
  }

  function mirrorToLegacyState(correct, secs) {
    try {
      if (typeof state === 'undefined' || typeof scoreDelta !== 'function' || typeof ensureTopic !== 'function') return;
      const subjectName = ALIAS[current.subject_label] || current.subject_label || syllabusSubjects.find(s => s.id === current.subject_id)?.name;
      if (!subjectName) return;
      if (!state.subjects[subjectName] && typeof blankSubject === 'function') state.subjects[subjectName] = blankSubject();
      const subject = state.subjects[subjectName];
      if (!subject) return;
      const topicName = current.topic_label || syllabusTopics.find(t => t.id === current.topic_id)?.title || 'Edital';
      const topic = ensureTopic(subject, topicName);
      const delta = scoreDelta(correct, 2, confidence, secs);
      const at = new Date().toISOString();
      [subject,topic].forEach(bucket => {
        bucket.score = typeof clamp === 'function' ? clamp(bucket.score + delta, 15, 95) : bucket.score + delta;
        bucket.evidence += 1;
        bucket.total += 1;
        bucket.correct += correct ? 1 : 0;
        bucket.lastAttempt = at;
        if (!correct && confidence === 'high') bucket.highConfidenceErrors = (bucket.highConfidenceErrors || 0) + 1;
      });
      state.answered += 1;
      state.correct += correct ? 1 : 0;
      state.profile.exam = 'PMBA Soldado 2026';
      state.attempts.push({ id:`bank-${current.id}-${Date.now()}`, questionId:current.id, subject:subjectName, topic:topicName, difficulty:2, correct, selected:choice, confidence, elapsed:secs, reasoning:'', delta, at, source:'Acervo PDF • Edital PMBA 2026' });
      if (state.attempts.length > 500) state.attempts = state.attempts.slice(-500);
      if (typeof saveState === 'function') saveState();
      if (typeof renderDashboard === 'function') renderDashboard();
    } catch (error) {
      console.warn('Tentativa ficou salva no Supabase, mas não foi espelhada no painel legado:', error);
    }
  }

  function nextQuestion() {
    const next = chooseQuestion();
    if (!next) {
      status(currentFilter === 'auto' ? 'Operação automática concluída: não há questão nova nem revisão vencida agora.' : 'Você concluiu as questões disponíveis neste estado.', 'ok');
      $('#bankOperational')?.classList.add('hidden');
      return;
    }
    showQuestion(next);
  }

  async function openTopic(subjectId, topicId) {
    if (!syllabusSubjects.length) await loadData();
    if (typeof navigate === 'function') navigate('acervo');
    const subject = $('#bankSubject');
    const topic = $('#bankTopic');
    if (subject) subject.value = subjectId || '';
    renderTopicOptions();
    if (topic) topic.value = topicId || '';
    currentFilter = 'auto';
    updateCounts();
    await begin();
  }

  async function boot() {
    try {
      await loadAssets();
      injectUI();
      setVersion();
      window.mentorBank = Object.freeze({
        version: VERSION,
        openTopic,
        reload: loadData,
        getCurrentQuestion: () => current,
        getCurrentState: () => current ? states.get(current.id) || null : null
      });
      db = await getClient();
      await loadData();
      db.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => loadData().catch(console.error), 80);
      });
    } catch (error) {
      console.error('Banco de questões indisponível:', error);
      status('Não foi possível conectar ao banco agora.', 'error');
    }
  }

  boot();
})();