const Q_BASE_URL = 'https://www.qconcursos.com/questoes-de-concursos/questoes';

function ensureQState() {
  if (!state.qMode) {
    state.qMode = {
      savedFilter: '',
      lastSubject: '',
      lastTopic: '',
      batches: 0
    };
    saveState();
  }
}

function isQUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'qconcursos.com' || url.hostname.endsWith('.qconcursos.com'));
  } catch {
    return false;
  }
}

function ensureQSubject(name) {
  const clean = name.trim();
  if (!clean) return null;
  if (!state.subjects[clean]) {
    state.subjects[clean] = blankSubject();
    if (!subjects.includes(clean)) subjects.push(clean);
  }
  return state.subjects[clean];
}

function qBatchDelta(total, correct, confidence) {
  const accuracy = correct / total;
  const centered = (accuracy - 0.5) * 26;
  const confidenceFactor = confidence === 'high' ? 1.12 : confidence === 'low' ? 0.88 : 1;
  const evidenceFactor = Math.min(1.35, 0.75 + Math.log10(total + 1) * 0.35);
  return Math.round(centered * confidenceFactor * evidenceFactor * 10) / 10;
}

function injectQMode() {
  ensureQState();

  const main = document.querySelector('main');
  const mapView = document.querySelector('[data-view="mapa"]');
  if (!main || !mapView || document.querySelector('[data-view="qconcursos"]')) return;

  const section = document.createElement('section');
  section.className = 'view';
  section.dataset.view = 'qconcursos';
  section.innerHTML = `
    <div class="section-heading standalone">
      <div>
        <span class="eyebrow">MODO Q • V1.3</span>
        <h1>Questões reais no Q. Análise aqui.</h1>
        <p>A Mentor IA não cria as questões. Você usa sua assinatura do Qconcursos normalmente e registra o resultado da bateria para alimentar seu mapa de conhecimento.</p>
      </div>
    </div>

    <article class="q-hero">
      <div>
        <span class="eyebrow">ABRIR BANCO DE QUESTÕES</span>
        <h2>Resolva no Qconcursos</h2>
        <p id="qRecommendation">A mentora vai sugerir qual matéria e assunto priorizar com base no seu mapa.</p>
      </div>
      <div class="q-actions">
        <button class="primary" id="openQBtn">Abrir Qconcursos ↗</button>
        <button class="secondary" id="openSavedQBtn">Abrir filtro salvo ↗</button>
      </div>
    </article>

    <div class="q-grid">
      <article class="profile-card">
        <span class="eyebrow">FILTRO FAVORITO</span>
        <h2>Salve o link do seu filtro</h2>
        <p class="q-help">No Q, monte o filtro por banca, disciplina e assunto. Depois copie o endereço da página e cole aqui. Na próxima sessão você volta direto para ele.</p>
        <label>Link do Qconcursos
          <input id="qFilterUrl" type="url" inputmode="url" placeholder="https://www.qconcursos.com/questoes-de-concursos/questoes?..." />
        </label>
        <button class="secondary" id="saveQFilterBtn">Salvar filtro</button>
        <small id="qFilterStatus" class="q-status"></small>
      </article>

      <article class="profile-card">
        <span class="eyebrow">REGISTRO RÁPIDO</span>
        <h2>Resultado da bateria</h2>
        <p class="q-help">Exemplo: fez 20 questões de Crase no Q e acertou 14. Registre 20 / 14 e a mentora atualiza o domínio.</p>
        <label>Matéria
          <input id="qSubject" list="qSubjectList" type="text" maxlength="80" placeholder="Ex.: Português" />
          <datalist id="qSubjectList"></datalist>
        </label>
        <label>Assunto
          <input id="qTopic" type="text" maxlength="100" placeholder="Ex.: Crase" />
        </label>
        <div class="field-grid">
          <label>Questões feitas
            <input id="qTotal" type="number" min="1" max="300" step="1" value="10" />
          </label>
          <label>Acertos
            <input id="qCorrect" type="number" min="0" max="300" step="1" value="0" />
          </label>
        </div>
        <label>Confiança geral na bateria
          <select id="qConfidence">
            <option value="low">Baixa</option>
            <option value="medium" selected>Média</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label>Tempo total em minutos <small>(opcional)</small>
          <input id="qMinutes" type="number" min="0" max="600" step="1" placeholder="Ex.: 18" />
        </label>
        <label>Link da questão/filtro <small>(opcional)</small>
          <input id="qAttemptUrl" type="url" inputmode="url" placeholder="Cole aqui se quiser guardar a origem" />
        </label>
        <label>Observação <small>(opcional)</small>
          <textarea id="qNote" rows="3" maxlength="500" placeholder="Ex.: errei principalmente exceções da regra..."></textarea>
        </label>
        <button class="primary" id="registerQBatchBtn">Registrar bateria</button>
      </article>
    </div>

    <article class="q-summary-card">
      <span class="eyebrow">COMO A MENTORA USA ISSO</span>
      <div class="q-summary-grid">
        <div><strong id="qBatchCount">0</strong><span>baterias do Q</span></div>
        <div><strong id="qQuestionCount">0</strong><span>questões reais registradas</span></div>
        <div><strong id="qAccuracy">—</strong><span>acerto no Q</span></div>
      </div>
      <p>O sistema usa o desempenho da bateria, o volume de questões, a confiança, o assunto e a recência para atualizar o mapa. A V1.3 não lê sua conta do Q nem pede sua senha.</p>
    </article>
  `;
  main.insertBefore(section, mapView);

  const nav = document.querySelector('.bottom-nav');
  if (nav) {
    nav.querySelector('[data-go="diagnostico"]')?.remove();
    const first = nav.querySelector('[data-go="inicio"]');
    const qNav = document.createElement('button');
    qNav.className = 'nav-item';
    qNav.dataset.go = 'qconcursos';
    qNav.innerHTML = '<span>Q</span><small>Questões</small>';
    first?.insertAdjacentElement('afterend', qNav);
  }

  document.querySelector('.version-badge')?.replaceChildren(document.createTextNode('v1.3'));
  const brandSub = document.querySelector('.brand > div > span:last-child');
  if (brandSub) brandSub.textContent = 'Questões reais + mentoria adaptativa';

  const heroEyebrow = document.querySelector('[data-view="inicio"] .hero-card .eyebrow');
  if (heroEyebrow) heroEyebrow.textContent = 'MENTORA ADAPTATIVA • V1.3';
  const diagText = document.querySelector('[data-view="inicio"] #mentorAdvice');
  if (diagText && !state.answered) diagText.textContent = 'Use questões reais do Qconcursos e registre seus resultados para eu construir seu mapa.';

  populateQFields();
  renderQSummary();
  renderQRecommendation();
}

function populateQFields() {
  ensureQState();
  const list = document.querySelector('#qSubjectList');
  if (list) list.innerHTML = subjects.map(name => `<option value="${name.replace(/"/g, '&quot;')}"></option>`).join('');
  const subject = document.querySelector('#qSubject');
  const topic = document.querySelector('#qTopic');
  const filter = document.querySelector('#qFilterUrl');
  if (subject && !subject.value) subject.value = state.qMode.lastSubject || weakestSubject()?.[0] || '';
  if (topic && !topic.value) {
    const selected = state.subjects[subject?.value];
    topic.value = state.qMode.lastTopic || (selected ? weakestTopic(selected)?.[0] || '' : '');
  }
  if (filter) filter.value = state.qMode.savedFilter || '';
}

function renderQRecommendation() {
  const el = document.querySelector('#qRecommendation');
  if (!el) return;
  const weak = weakestSubject();
  if (!weak) {
    el.textContent = 'Comece com uma bateria de 10 a 20 questões no Q e registre o resultado aqui. Depois eu consigo escolher sua prioridade.';
    return;
  }
  const topic = weakestTopic(weak[1]);
  const topicText = topic ? `, principalmente em ${topic[0]}` : '';
  el.textContent = `Minha recomendação agora: faça 10 a 20 questões de ${weak[0]}${topicText}. Seu domínio estimado nessa matéria está em ${Math.round(effectiveScore(weak[1]))}%.`;
}

function qAttempts() {
  return state.attempts.filter(a => a.source === 'qconcursos');
}

function renderQSummary() {
  ensureQState();
  const attempts = qAttempts();
  const total = attempts.reduce((sum, a) => sum + Number(a.totalQuestions || 0), 0);
  const correct = attempts.reduce((sum, a) => sum + Number(a.correctCount || 0), 0);
  const batch = document.querySelector('#qBatchCount');
  const count = document.querySelector('#qQuestionCount');
  const accuracy = document.querySelector('#qAccuracy');
  if (batch) batch.textContent = attempts.length;
  if (count) count.textContent = total;
  if (accuracy) accuracy.textContent = total ? `${Math.round(correct / total * 100)}%` : '—';
}

function saveQFilter() {
  const input = document.querySelector('#qFilterUrl');
  const status = document.querySelector('#qFilterStatus');
  const value = input?.value.trim() || '';
  if (!value) {
    state.qMode.savedFilter = '';
    saveState();
    if (status) status.textContent = 'Filtro removido.';
    return;
  }
  if (!isQUrl(value)) {
    if (status) status.textContent = 'Use um link oficial do domínio qconcursos.com.';
    return;
  }
  state.qMode.savedFilter = value;
  saveState();
  if (status) status.textContent = 'Filtro salvo neste navegador.';
}

function openQ(saved = false) {
  const url = saved && state.qMode.savedFilter && isQUrl(state.qMode.savedFilter)
    ? state.qMode.savedFilter
    : Q_BASE_URL;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function registerQBatch() {
  const subjectName = document.querySelector('#qSubject')?.value.trim() || '';
  const topicName = document.querySelector('#qTopic')?.value.trim() || 'Geral';
  const total = Number(document.querySelector('#qTotal')?.value || 0);
  const correct = Number(document.querySelector('#qCorrect')?.value || 0);
  const confidence = document.querySelector('#qConfidence')?.value || 'medium';
  const minutes = Number(document.querySelector('#qMinutes')?.value || 0);
  const sourceUrl = document.querySelector('#qAttemptUrl')?.value.trim() || '';
  const note = document.querySelector('#qNote')?.value.trim() || '';

  if (!subjectName) return alert('Informe a matéria.');
  if (!Number.isInteger(total) || total < 1 || total > 300) return alert('Informe uma quantidade válida de questões.');
  if (!Number.isInteger(correct) || correct < 0 || correct > total) return alert('Os acertos precisam estar entre 0 e o total de questões.');
  if (sourceUrl && !isQUrl(sourceUrl)) return alert('O link da origem precisa ser do Qconcursos.');

  ensureQState();
  const subject = ensureQSubject(subjectName);
  const topic = ensureTopic(subject, topicName);
  const delta = qBatchDelta(total, correct, confidence);
  const timestamp = new Date().toISOString();
  const accuracy = correct / total;
  const elapsedPerQuestion = minutes > 0 ? Math.round((minutes * 60) / total) : 0;
  const highConfidenceErrors = confidence === 'high' ? total - correct : 0;

  [subject, topic].forEach(bucket => {
    bucket.score = clamp(bucket.score + delta, 15, 95);
    bucket.evidence += total;
    bucket.total += total;
    bucket.correct += correct;
    bucket.lastAttempt = timestamp;
    bucket.highConfidenceErrors = (bucket.highConfidenceErrors || 0) + highConfidenceErrors;
  });

  state.answered += total;
  state.correct += correct;
  state.attempts.push({
    id: `q-${Date.now()}`,
    source: 'qconcursos',
    batch: true,
    subject: subjectName,
    topic: topicName,
    difficulty: 2,
    correct: accuracy >= 0.5,
    totalQuestions: total,
    correctCount: correct,
    accuracy,
    confidence,
    elapsed: elapsedPerQuestion,
    totalMinutes: minutes,
    reasoning: note,
    note,
    sourceUrl,
    delta,
    at: timestamp
  });
  if (state.attempts.length > 500) state.attempts = state.attempts.slice(-500);

  state.qMode.lastSubject = subjectName;
  state.qMode.lastTopic = topicName;
  state.qMode.batches = Number(state.qMode.batches || 0) + 1;
  state.dailyPlan = { date: null, steps: [] };
  saveState();

  document.querySelector('#qCorrect').value = '0';
  document.querySelector('#qMinutes').value = '';
  document.querySelector('#qAttemptUrl').value = '';
  document.querySelector('#qNote').value = '';

  renderDashboard();
  renderQSummary();
  renderQRecommendation();
  populateQFields();
  alert(`Bateria registrada: ${correct}/${total} (${Math.round(accuracy * 100)}%). O mapa foi atualizado.`);
}

function patchMentorForQ() {
  const original = mentorResponse;
  mentorResponse = function(type) {
    const base = original(type);
    if (!state.answered) return 'Ainda não tenho evidências. Abra o Qconcursos, faça uma bateria de questões reais e registre o resultado no Modo Q.';
    if (type === 'today' || type === 'weakness' || type === 'review') {
      const weak = weakestSubject();
      const topic = weak ? weakestTopic(weak[1]) : null;
      if (weak) {
        return `${base} Para testar isso com questões reais, abra o Modo Q e faça uma bateria de ${weak[0]}${topic ? ` — ${topic[0]}` : ''}.`;
      }
    }
    return base;
  };
}

function patchHistoryForQ() {
  const original = renderHistory;
  renderHistory = function() {
    original();
    const list = document.querySelector('#historyList');
    if (!list) return;
    const rows = [...list.querySelectorAll('.history-item')];
    const recent = state.attempts.slice(-30).reverse();
    rows.forEach((row, index) => {
      const attempt = recent[index];
      if (!attempt?.batch || attempt.source !== 'qconcursos') return;
      const result = row.querySelector('.history-result');
      const copy = row.querySelector('.history-copy');
      const meta = row.querySelector('.history-meta');
      if (result) {
        result.className = 'history-result q-source';
        result.textContent = 'Q';
      }
      if (copy) {
        copy.innerHTML = `<strong>${attempt.subject}</strong><span>${attempt.topic} · Qconcursos · ${attempt.correctCount}/${attempt.totalQuestions} (${Math.round(attempt.accuracy * 100)}%)</span>`;
      }
      if (meta) meta.innerHTML = `${attempt.totalMinutes ? attempt.totalMinutes + ' min' : 'bateria'}<br>${formatDate(attempt.at)}`;
    });
  };
}

// Redireciona o antigo diagnóstico de demonstração para o Modo Q.
document.addEventListener('click', event => {
  const oldDiagnostic = event.target.closest('[data-action="start-diagnostic"]');
  if (oldDiagnostic) {
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate('qconcursos');
  }
}, true);

injectQMode();
patchMentorForQ();
patchHistoryForQ();
renderDashboard();
renderQSummary();
renderQRecommendation();

const qView = document.querySelector('[data-view="qconcursos"]');
qView?.addEventListener('click', event => {
  if (event.target.closest('#openQBtn')) openQ(false);
  if (event.target.closest('#openSavedQBtn')) openQ(true);
  if (event.target.closest('#saveQFilterBtn')) saveQFilter();
  if (event.target.closest('#registerQBatchBtn')) registerQBatch();
});
