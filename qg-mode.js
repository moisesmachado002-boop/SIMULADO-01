(() => {
  'use strict';

  const VERSION = '5.0';
  const MAX_NOTEBOOK_ROWS = 12;
  let db = null;
  let user = null;
  let questions = [];
  let states = new Map();
  let mounted = false;

  const $ = selector => document.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>'\"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;'
  }[char]));

  function addCss() {
    if ($('#mentorQgModeCss')) return;
    const link = document.createElement('link');
    link.id = 'mentorQgModeCss';
    link.rel = 'stylesheet';
    link.href = './qg-mode.css?v=5.0';
    document.head.appendChild(link);
  }

  function formatDate(iso) {
    if (!iso) return 'sem data';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'sem data';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function due(state, now = Date.now()) {
    if (!state?.next_review_at) return false;
    const time = new Date(state.next_review_at).getTime();
    return Number.isFinite(time) && time <= now;
  }

  async function waitForBank(timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if ($('[data-view="acervo"]') && $('#bankStateFilters') && $('#bankStartBtn')) return true;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return false;
  }

  function injectPanel() {
    if ($('#mentorQgOps')) {
      mounted = true;
      return;
    }
    const view = $('[data-view="acervo"]');
    if (!view) return;

    const header = view.querySelector('.qg-bank-header');
    const h1 = header?.querySelector('h1');
    const description = header?.querySelector('p');
    if (h1) h1.textContent = 'Modo QG DOS PRAÇAS';
    if (description) description.textContent = 'Fila limpa: novas primeiro. Questão antiga só volta automaticamente quando a revisão vencer; erros e revisões também podem ser chamados manualmente.';

    const panel = document.createElement('section');
    panel.id = 'mentorQgOps';
    panel.className = 'qg-ops-shell';
    panel.innerHTML = `
      <div class="qg-ops-head">
        <div>
          <span class="qg-kicker">OPERAÇÃO QG • P5</span>
          <h2>Treino sem misturar as filas.</h2>
          <p>Escolha uma missão. O automático preserva as revisões futuras; o caderno guarda todo erro já cometido, mesmo depois de recuperado.</p>
        </div>
        <span class="qg-ops-version">V${VERSION}</span>
      </div>

      <div class="qg-ops-stats">
        <article><span>Novas</span><strong id="qgFreshCount">—</strong><small>nunca respondidas</small></article>
        <article><span>Revisões</span><strong id="qgDueCount">—</strong><small>vencidas agora</small></article>
        <article><span>Caderno</span><strong id="qgErrorCount">—</strong><small>já erradas alguma vez</small></article>
        <article><span>Precisão</span><strong id="qgAccuracy">—</strong><small>histórico do banco</small></article>
      </div>

      <div class="qg-ops-actions" aria-label="Modos de treino QG">
        <button type="button" data-qg-run="auto"><strong>OPERAÇÃO AUTOMÁTICA</strong><span>Novas → revisões vencidas</span></button>
        <button type="button" data-qg-run="new"><strong>SÓ QUESTÕES NOVAS</strong><span>Sem misturar respondidas</span></button>
        <button type="button" data-qg-run="wrong"><strong>CADERNO PENDENTE</strong><span>Refazer erros ainda abertos</span></button>
        <button type="button" data-qg-run="review"><strong>FILA DE REVISÃO</strong><span>Revisões marcadas/vencidas</span></button>
      </div>

      <details class="qg-error-notebook" open>
        <summary>
          <span><strong>CADERNO DE ERROS</strong><small id="qgNotebookSummary">Carregando histórico…</small></span>
          <span>⌄</span>
        </summary>
        <div id="qgNotebookList" class="qg-notebook-list"></div>
      </details>

      <div id="qgOpsMessage" class="qg-ops-message" aria-live="polite"></div>
    `;

    if (header) header.insertAdjacentElement('afterend', panel);
    else view.prepend(panel);

    panel.addEventListener('click', event => {
      const run = event.target.closest('[data-qg-run]');
      if (run) runMode(run.dataset.qgRun);

      const review = event.target.closest('[data-qg-review-question]');
      if (review) markForReview(review.dataset.qgReviewQuestion);
    });

    mounted = true;
  }

  function message(text, kind = 'neutral') {
    const node = $('#qgOpsMessage');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
  }

  async function loadData() {
    db = window.mentorCloud?.client || db;
    if (!db) {
      message('Entre na conta para carregar o Modo QG.', 'warn');
      return;
    }

    const { data: { session } } = await db.auth.getSession();
    user = session?.user || null;
    if (!user) {
      questions = [];
      states = new Map();
      render();
      message('Entre na conta para carregar seu caderno de erros.', 'warn');
      return;
    }

    const q = await db.from('questions')
      .select('id,subject_label,topic_label,source_question_number,exam_name,correct_answer')
      .not('explanation', 'is', null)
      .order('created_at', { ascending: true });
    if (q.error) throw q.error;
    questions = q.data || [];

    states = new Map();
    const ids = questions.map(item => item.id);
    if (ids.length) {
      const s = await db.from('user_question_state')
        .select('question_id,seen_count,correct_count,wrong_count,last_is_correct,last_selected_answer,last_attempt_at,last_confidence,next_review_at,status')
        .eq('user_id', user.id)
        .in('question_id', ids);
      if (s.error) throw s.error;
      (s.data || []).forEach(row => states.set(row.question_id, row));
    }

    render();
  }

  function stats() {
    const now = Date.now();
    let fresh = 0;
    let dueCount = 0;
    let errors = 0;
    let recovered = 0;
    let seen = 0;
    let correct = 0;

    questions.forEach(question => {
      const state = states.get(question.id);
      const seenCount = Number(state?.seen_count || 0);
      if (!seenCount) fresh += 1;
      if (due(state, now)) dueCount += 1;
      if (Number(state?.wrong_count || 0) > 0) {
        errors += 1;
        if (state?.last_is_correct === true) recovered += 1;
      }
      seen += seenCount;
      correct += Number(state?.correct_count || 0);
    });

    return {
      fresh,
      due: dueCount,
      errors,
      recovered,
      accuracy: seen ? Math.round((correct / seen) * 100) : null
    };
  }

  function notebookRows() {
    const now = Date.now();
    return questions
      .map(question => ({ question, state: states.get(question.id) }))
      .filter(item => Number(item.state?.wrong_count || 0) > 0)
      .sort((a, b) => {
        const aDue = due(a.state, now) ? 1 : 0;
        const bDue = due(b.state, now) ? 1 : 0;
        if (aDue !== bDue) return bDue - aDue;
        const aOpen = a.state?.last_is_correct === false ? 1 : 0;
        const bOpen = b.state?.last_is_correct === false ? 1 : 0;
        if (aOpen !== bOpen) return bOpen - aOpen;
        const wrongDiff = Number(b.state?.wrong_count || 0) - Number(a.state?.wrong_count || 0);
        if (wrongDiff) return wrongDiff;
        return new Date(b.state?.last_attempt_at || 0) - new Date(a.state?.last_attempt_at || 0);
      });
  }

  function renderNotebook() {
    const list = $('#qgNotebookList');
    const summary = $('#qgNotebookSummary');
    if (!list || !summary) return;

    if (!user) {
      summary.textContent = 'Faça login para acessar.';
      list.innerHTML = '<div class="qg-notebook-empty">Seu caderno fica vinculado à sua conta.</div>';
      return;
    }

    const rows = notebookRows();
    const recovered = rows.filter(item => item.state?.last_is_correct === true).length;
    const pending = rows.length - recovered;
    summary.textContent = `${rows.length} questão(ões) no histórico • ${pending} pendente(s) • ${recovered} recuperada(s)`;

    if (!rows.length) {
      list.innerHTML = '<div class="qg-notebook-empty">Nenhum erro registrado ainda. Quando você errar, a questão entra aqui automaticamente.</div>';
      return;
    }

    list.innerHTML = rows.slice(0, MAX_NOTEBOOK_ROWS).map(({ question, state }) => {
      const isDue = due(state);
      const recoveredNow = state.last_is_correct === true;
      const status = isDue ? 'REVISÃO VENCIDA' : recoveredNow ? 'RECUPERADA' : 'ERRO PENDENTE';
      const statusClass = isDue ? 'due' : recoveredNow ? 'recovered' : 'pending';
      const wrongCount = Number(state.wrong_count || 0);
      const lastChoice = state.last_is_correct === false && state.last_selected_answer
        ? ` • marcou ${esc(String(state.last_selected_answer).toUpperCase())}`
        : '';
      const reviewAction = recoveredNow && !isDue
        ? `<button type="button" data-qg-review-question="${esc(question.id)}">REVISAR DE NOVO</button>`
        : '';

      return `<article class="qg-notebook-item">
        <div class="qg-notebook-main">
          <span class="qg-notebook-state ${statusClass}">${status}</span>
          <strong>${esc(question.subject_label || 'Matéria')} → ${esc(question.topic_label || 'Assunto')}</strong>
          <small>Questão ${esc(question.source_question_number || '—')} • ${wrongCount} erro(s)${lastChoice} • última tentativa ${esc(formatDate(state.last_attempt_at))}</small>
        </div>
        <div class="qg-notebook-side">
          ${reviewAction}
        </div>
      </article>`;
    }).join('') + (rows.length > MAX_NOTEBOOK_ROWS
      ? `<div class="qg-notebook-more">+ ${rows.length - MAX_NOTEBOOK_ROWS} questão(ões) permanecem no caderno.</div>`
      : '');
  }

  function render() {
    if (!mounted) injectPanel();
    const info = stats();
    if ($('#qgFreshCount')) $('#qgFreshCount').textContent = info.fresh;
    if ($('#qgDueCount')) $('#qgDueCount').textContent = info.due;
    if ($('#qgErrorCount')) $('#qgErrorCount').textContent = info.errors;
    if ($('#qgAccuracy')) $('#qgAccuracy').textContent = info.accuracy == null ? '—' : `${info.accuracy}%`;
    renderNotebook();
  }

  function activateFilter(filter) {
    const button = $(`[data-question-filter="${CSS.escape(filter)}"]`);
    if (!button) return false;
    button.click();
    return true;
  }

  async function runMode(filter) {
    if (typeof navigate === 'function') navigate('acervo');
    await waitForBank(2500);

    if (!activateFilter(filter)) {
      message('O filtro solicitado ainda não carregou. Tente novamente em alguns segundos.', 'warn');
      return;
    }

    const labels = {
      auto: 'Operação automática: novas primeiro; depois somente revisões vencidas.',
      new: 'Modo novas: nenhuma questão já respondida entra nesta fila.',
      wrong: 'Caderno pendente: somente questões cujo último resultado ainda é erro.',
      review: 'Fila de revisão: questões marcadas para revisão, inclusive as chamadas manualmente.'
    };
    message(labels[filter] || 'Modo QG iniciado.', 'ok');
    setTimeout(() => $('#bankStartBtn')?.click(), 30);
  }

  async function markForReview(questionId) {
    if (!db || !user || !questionId) return;
    const state = states.get(questionId);
    if (!state) return;
    const now = new Date().toISOString();
    const { error } = await db.from('user_question_state')
      .update({ status: 'review', next_review_at: now, updated_at: now })
      .eq('user_id', user.id)
      .eq('question_id', questionId);
    if (error) {
      console.error('Não foi possível recolocar a questão na revisão:', error);
      message('Não foi possível marcar essa questão para revisão agora.', 'error');
      return;
    }
    states.set(questionId, { ...state, status: 'review', next_review_at: now });
    render();
    message('Questão recuperada voltou para a fila de revisão.', 'ok');
  }

  async function boot() {
    addCss();
    const ready = await waitForBank();
    if (!ready) return;
    injectPanel();
    try {
      await loadData();
      db = window.mentorCloud?.client || db;
      db?.auth?.onAuthStateChange?.((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setTimeout(() => loadData().catch(console.error), 100);
        }
      });
    } catch (error) {
      console.error('Modo QG indisponível:', error);
      message('Não foi possível carregar o Modo QG agora.', 'error');
    }
  }

  window.addEventListener('mentor:attempt-saved', () => {
    setTimeout(() => loadData().catch(console.error), 80);
  });

  window.MentorQgMode = Object.freeze({ version: VERSION, reload: loadData, runMode });
  boot();
})();
