(() => {
  'use strict';

  const BANK_VERSION = '1.5';
  const FALLBACK_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const FALLBACK_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const SUBJECT_ALIAS = { 'Língua Portuguesa': 'Português' };

  let db = null;
  let user = null;
  let bank = [];
  let stateByQuestion = new Map();
  let current = null;
  let startedAt = 0;
  let selectedConfidence = 'medium';
  let sessionCorrect = 0;
  let sessionAnswered = 0;
  let answeredCurrent = false;

  function esc(value = '') {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  }

  function setVersion() {
    document.title = 'Mentor IA v1.5 — banco real de questões';
    document.querySelectorAll('.version-badge').forEach(el => el.textContent = 'v1.5');
    const eyebrow = document.querySelector('[data-view="inicio"] .hero-card .eyebrow');
    if (eyebrow) eyebrow.textContent = 'MENTORA + BANCO REAL • V1.5';
  }

  function injectUI() {
    if (document.querySelector('[data-view="acervo"]')) return;

    const main = document.querySelector('main');
    if (!main) return;

    const section = document.createElement('section');
    section.className = 'view';
    section.dataset.view = 'acervo';
    section.innerHTML = `
      <div class="section-heading standalone bank-heading">
        <div>
          <span class="eyebrow">BANCO REAL • SEU ACERVO</span>
          <h1>Resolva aqui as questões dos seus PDFs.</h1>
          <p>O gabarito vem do próprio módulo. A explicação é adicionada pela Mentora e suas respostas ficam salvas no Supabase.</p>
        </div>
      </div>

      <div class="bank-stats">
        <article><span>Disponíveis</span><strong id="bankTotal">—</strong><small>com explicação pronta</small></article>
        <article><span>Novas</span><strong id="bankNew">—</strong><small>ainda não respondidas</small></article>
        <article><span>Nesta sessão</span><strong id="bankSession">0/0</strong><small>acertos / respostas</small></article>
      </div>

      <article class="bank-filter-card">
        <div class="bank-filter-grid">
          <label>Matéria<select id="bankSubject"><option value="">Todas</option></select></label>
          <label>Assunto<select id="bankTopic"><option value="">Todos</option></select></label>
        </div>
        <button class="primary" id="bankStartBtn">Começar questões do meu acervo</button>
        <p id="bankStatus" class="bank-status">Entre na sua conta para carregar seu banco privado.</p>
      </article>

      <article id="bankQuestionCard" class="bank-question-card hidden">
        <div class="bank-question-top">
          <div><span id="bankQuestionSource" class="eyebrow">SEU MÓDULO</span><h2 id="bankQuestionMeta">Questão</h2></div>
          <span id="bankTimer" class="bank-timer">00:00</span>
        </div>
        <div class="bank-tags"><span id="bankQuestionSubject" class="tag"></span><span id="bankQuestionTopic" class="tag muted"></span></div>
        <div class="bank-confidence">
          <span>Antes de responder, sua confiança:</span>
          <button data-bank-confidence="low">Baixa</button>
          <button data-bank-confidence="medium" class="active">Média</button>
          <button data-bank-confidence="high">Alta</button>
        </div>
        <div id="bankStatement" class="bank-statement"></div>
        <div id="bankAnswers" class="bank-answers"></div>
        <div id="bankFeedback" class="bank-feedback hidden"></div>
        <button id="bankNextBtn" class="primary hidden">Próxima questão</button>
      </article>
    `;
    main.appendChild(section);

    const nav = document.querySelector('.bottom-nav');
    if (nav && !nav.querySelector('[data-go="acervo"]')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.dataset.go = 'acervo';
      button.innerHTML = '<span>▣</span><small>Acervo</small>';
      const diagnostic = nav.querySelector('[data-go="diagnostico"]');
      if (diagnostic) diagnostic.replaceWith(button); else nav.prepend(button);
    }

    const hero = document.querySelector('[data-view="inicio"] .hero-card');
    if (hero && !document.querySelector('#bankHomeCard')) {
      const card = document.createElement('article');
      card.id = 'bankHomeCard';
      card.className = 'bank-home-card';
      card.innerHTML = `
        <div><span class="eyebrow">QUESTÕES DOS SEUS PDFs</span><h2>Banco real já começou.</h2><p id="bankHomeText">Carregando seu acervo privado…</p></div>
        <button class="primary" data-go="acervo">Fazer questões</button>`;
      hero.insertAdjacentElement('afterend', card);
    }

    document.querySelector('#bankStartBtn')?.addEventListener('click', startBank);
    document.querySelector('#bankNextBtn')?.addEventListener('click', nextQuestion);
    document.querySelector('#bankSubject')?.addEventListener('change', () => { renderTopicOptions(); updateCounts(); });
    document.querySelector('#bankTopic')?.addEventListener('change', updateCounts);
    document.querySelector('[data-view="acervo"]')?.addEventListener('click', event => {
      const conf = event.target.closest('[data-bank-confidence]');
      if (conf && !answeredCurrent) {
        selectedConfidence = conf.dataset.bankConfidence;
        document.querySelectorAll('[data-bank-confidence]').forEach(b => b.classList.toggle('active', b === conf));
      }
      const answer = event.target.closest('[data-bank-answer]');
      if (answer) answerQuestion(answer.dataset.bankAnswer);
    });
  }

  function status(text, kind = 'neutral') {
    const el = document.querySelector('#bankStatus');
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind;
  }

  async function getClient() {
    if (window.mentorCloud?.client) return window.mentorCloud.client;
    if (!window.supabase?.createClient) throw new Error('Supabase não carregou.');
    return window.supabase.createClient(FALLBACK_URL, FALLBACK_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  async function loadBank() {
    if (!db) db = await getClient();
    const { data: { session } } = await db.auth.getSession();
    user = session?.user || null;
    if (!user) {
      bank = [];
      status('Entre na sua conta para acessar as questões privadas.', 'warn');
      const home = document.querySelector('#bankHomeText');
      if (home) home.textContent = 'Entre na sua conta para acessar as questões dos seus módulos.';
      updateCounts();
      return;
    }

    status('Carregando questões do seu acervo…', 'loading');
    const { data, error } = await db
      .from('questions')
      .select('id,exam_name,subject_label,topic_label,source_question_number,statement,alternatives,correct_answer,explanation,source_kind')
      .not('explanation', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1000);
    if (error) throw error;
    bank = data || [];

    const ids = bank.map(q => q.id);
    stateByQuestion = new Map();
    if (ids.length) {
      const { data: states, error: stateError } = await db
        .from('user_question_state')
        .select('question_id,seen_count,correct_count,wrong_count,last_seen_at,next_review_at,status')
        .in('question_id', ids);
      if (stateError) throw stateError;
      (states || []).forEach(s => stateByQuestion.set(s.question_id, s));
    }

    renderSubjectOptions();
    renderTopicOptions();
    updateCounts();
    status(bank.length ? 'Seu banco está pronto. Escolha o assunto e comece.' : 'Ainda não há questões liberadas no seu acervo.', bank.length ? 'ok' : 'warn');
    const home = document.querySelector('#bankHomeText');
    if (home) home.textContent = bank.length ? `${bank.length} questões reais já estão prontas para treino dentro da plataforma.` : 'As questões estão sendo preparadas.';
  }

  function renderSubjectOptions() {
    const select = document.querySelector('#bankSubject');
    if (!select) return;
    const currentValue = select.value;
    const values = [...new Set(bank.map(q => q.subject_label).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
    select.innerHTML = '<option value="">Todas</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (values.includes(currentValue)) select.value = currentValue;
  }

  function renderTopicOptions() {
    const subject = document.querySelector('#bankSubject')?.value || '';
    const select = document.querySelector('#bankTopic');
    if (!select) return;
    const currentValue = select.value;
    const values = [...new Set(bank.filter(q => !subject || q.subject_label === subject).map(q => q.topic_label).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
    select.innerHTML = '<option value="">Todos</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (values.includes(currentValue)) select.value = currentValue;
  }

  function filteredBank() {
    const subject = document.querySelector('#bankSubject')?.value || '';
    const topic = document.querySelector('#bankTopic')?.value || '';
    return bank.filter(q => (!subject || q.subject_label === subject) && (!topic || q.topic_label === topic));
  }

  function updateCounts() {
    const items = filteredBank();
    const newCount = items.filter(q => !stateByQuestion.has(q.id) || (stateByQuestion.get(q.id)?.seen_count || 0) === 0).length;
    const total = document.querySelector('#bankTotal');
    const fresh = document.querySelector('#bankNew');
    const session = document.querySelector('#bankSession');
    if (total) total.textContent = String(items.length);
    if (fresh) fresh.textContent = String(newCount);
    if (session) session.textContent = `${sessionCorrect}/${sessionAnswered}`;
  }

  function chooseQuestion() {
    const items = filteredBank();
    if (!items.length) return null;
    const now = Date.now();
    const unseen = items.filter(q => !stateByQuestion.has(q.id) || !(stateByQuestion.get(q.id)?.seen_count));
    const due = items.filter(q => {
      const s = stateByQuestion.get(q.id);
      return s?.next_review_at && new Date(s.next_review_at).getTime() <= now;
    });
    const pool = unseen.length ? unseen : (due.length ? due : [...items].sort((a,b) => (stateByQuestion.get(a.id)?.seen_count || 0) - (stateByQuestion.get(b.id)?.seen_count || 0)));
    const minSeen = Math.min(...pool.map(q => stateByQuestion.get(q.id)?.seen_count || 0));
    const leastSeen = pool.filter(q => (stateByQuestion.get(q.id)?.seen_count || 0) === minSeen);
    return leastSeen[Math.floor(Math.random() * leastSeen.length)] || pool[0];
  }

  async function startBank() {
    if (!db) db = await getClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) {
      window.mentorCloud?.openLogin?.();
      status('Entre na conta e toque novamente em começar.', 'warn');
      return;
    }
    if (!bank.length) await loadBank();
    current = chooseQuestion();
    if (!current) {
      status('Não há questões prontas nesse filtro ainda.', 'warn');
      return;
    }
    showQuestion(current);
  }

  function showQuestion(q) {
    current = q;
    answeredCurrent = false;
    startedAt = Date.now();
    selectedConfidence = 'medium';
    document.querySelectorAll('[data-bank-confidence]').forEach(b => b.classList.toggle('active', b.dataset.bankConfidence === 'medium'));

    const card = document.querySelector('#bankQuestionCard');
    card?.classList.remove('hidden');
    document.querySelector('#bankFeedback')?.classList.add('hidden');
    document.querySelector('#bankNextBtn')?.classList.add('hidden');
    document.querySelector('#bankQuestionSource').textContent = q.exam_name || 'Seu módulo';
    document.querySelector('#bankQuestionMeta').textContent = `Questão ${q.source_question_number || ''}`.trim();
    document.querySelector('#bankQuestionSubject').textContent = q.subject_label || 'Matéria';
    document.querySelector('#bankQuestionTopic').textContent = q.topic_label || 'Assunto';
    document.querySelector('#bankStatement').textContent = q.statement;

    const answers = document.querySelector('#bankAnswers');
    const alternatives = q.alternatives || {};
    answers.innerHTML = Object.entries(alternatives).map(([letter, text]) => `
      <button class="bank-answer" data-bank-answer="${esc(letter)}"><span>${esc(letter)}</span><strong>${esc(text)}</strong></button>`).join('');

    tickTimer();
    clearInterval(window.__mentorBankTimer);
    window.__mentorBankTimer = setInterval(tickTimer, 1000);
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function tickTimer() {
    const el = document.querySelector('#bankTimer');
    if (!el || !startedAt || answeredCurrent) return;
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    el.textContent = `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
  }

  function confidenceNumber() {
    return ({ low: 2, medium: 3, high: 5 })[selectedConfidence] || 3;
  }

  async function answerQuestion(letter) {
    if (!current || answeredCurrent) return;
    answeredCurrent = true;
    clearInterval(window.__mentorBankTimer);
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const correct = String(letter).toUpperCase() === String(current.correct_answer).toUpperCase();
    sessionAnswered += 1;
    if (correct) sessionCorrect += 1;

    document.querySelectorAll('.bank-answer').forEach(button => {
      button.disabled = true;
      const value = button.dataset.bankAnswer;
      if (value === current.correct_answer) button.classList.add('correct');
      if (value === letter && !correct) button.classList.add('wrong');
    });

    const feedback = document.querySelector('#bankFeedback');
    feedback.className = `bank-feedback ${correct ? 'good' : 'bad'}`;
    feedback.innerHTML = `<strong>${correct ? '✓ Acertou.' : `✕ Errou. Gabarito: ${esc(current.correct_answer)}.`}</strong><p>${esc(current.explanation || 'Explicação em preparação.')}</p>`;
    document.querySelector('#bankNextBtn')?.classList.remove('hidden');
    updateCounts();

    try {
      await saveAttempt(letter, correct, elapsed);
      mirrorToLegacyState(correct, elapsed);
    } catch (error) {
      console.error('Falha ao salvar tentativa do acervo:', error);
      feedback.insertAdjacentHTML('beforeend', '<small>⚠ A correção foi exibida, mas houve falha ao salvar esta tentativa na nuvem.</small>');
    }
  }

  function nextReviewIso(correct, correctCount) {
    const date = new Date();
    date.setDate(date.getDate() + (correct ? (correctCount >= 2 ? 14 : 7) : 1));
    return date.toISOString();
  }

  async function saveAttempt(letter, correct, elapsed) {
    const { data: { session } } = await db.auth.getSession();
    user = session?.user || null;
    if (!user) throw new Error('Sessão encerrada');

    const { error: attemptError } = await db.from('question_attempts').insert({
      user_id: user.id,
      question_id: current.id,
      is_correct: correct,
      selected_answer: letter,
      correct_answer_snapshot: current.correct_answer,
      response_time_seconds: elapsed,
      confidence: confidenceNumber(),
      source_kind: current.source_kind || 'personal_module'
    });
    if (attemptError) throw attemptError;

    const old = stateByQuestion.get(current.id) || { seen_count: 0, correct_count: 0, wrong_count: 0 };
    const nextCorrect = (old.correct_count || 0) + (correct ? 1 : 0);
    const nextWrong = (old.wrong_count || 0) + (correct ? 0 : 1);
    const nextSeen = (old.seen_count || 0) + 1;
    const row = {
      user_id: user.id,
      question_id: current.id,
      seen_count: nextSeen,
      correct_count: nextCorrect,
      wrong_count: nextWrong,
      last_seen_at: new Date().toISOString(),
      next_review_at: nextReviewIso(correct, nextCorrect),
      status: correct ? (nextCorrect >= 2 ? 'mastered' : 'learning') : 'review',
      updated_at: new Date().toISOString()
    };
    const { error: stateError } = await db.from('user_question_state').upsert(row, { onConflict: 'user_id,question_id' });
    if (stateError) throw stateError;
    stateByQuestion.set(current.id, row);
    updateCounts();
  }

  function mirrorToLegacyState(correct, elapsed) {
    try {
      if (typeof state === 'undefined' || typeof ensureTopic !== 'function' || typeof scoreDelta !== 'function') return;
      const legacySubject = SUBJECT_ALIAS[current.subject_label] || current.subject_label;
      const subject = state.subjects?.[legacySubject];
      if (!subject) return;
      const topic = ensureTopic(subject, current.topic_label || 'Acervo');
      const delta = scoreDelta(correct, 2, selectedConfidence, elapsed);
      const at = new Date().toISOString();
      [subject, topic].forEach(bucket => {
        bucket.score = clamp(bucket.score + delta, 15, 95);
        bucket.evidence += 1;
        bucket.total += 1;
        bucket.correct += correct ? 1 : 0;
        bucket.lastAttempt = at;
        if (!correct && selectedConfidence === 'high') bucket.highConfidenceErrors = (bucket.highConfidenceErrors || 0) + 1;
      });
      state.answered += 1;
      state.correct += correct ? 1 : 0;
      state.attempts.push({
        id: `bank-${current.id}-${Date.now()}`,
        questionId: current.id,
        subject: legacySubject,
        topic: current.topic_label || 'Acervo',
        difficulty: 2,
        correct,
        selected: null,
        confidence: selectedConfidence,
        elapsed,
        reasoning: '',
        delta,
        at,
        source: 'Acervo PDF'
      });
      if (state.attempts.length > 500) state.attempts = state.attempts.slice(-500);
      saveState();
      renderDashboard();
    } catch (error) {
      console.warn('Tentativa salva no Supabase, mas não espelhada no mapa local:', error);
    }
  }

  function nextQuestion() {
    const q = chooseQuestion();
    if (!q) return status('Você concluiu as questões disponíveis neste filtro por agora.', 'ok');
    showQuestion(q);
  }

  async function boot() {
    injectUI();
    setVersion();
    try {
      db = await getClient();
      await loadBank();
      db.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setTimeout(() => loadBank().catch(console.error), 50);
        }
      });
    } catch (error) {
      console.error('Banco real indisponível:', error);
      status('Não foi possível conectar ao banco agora.', 'error');
    }
  }

  boot();
})();
