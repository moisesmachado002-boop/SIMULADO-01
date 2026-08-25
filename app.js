const STORAGE_KEY = 'mentorIA-v1';
const APP_VERSION = '1.2';

const subjects = [
  'Português',
  'Direito Constitucional',
  'Direito Administrativo',
  'Direito Penal',
  'Informática',
  'Matemática'
];

const questions = [
  {
    id: 1,
    subject: 'Português',
    topic: 'Conjunções',
    difficulty: 2,
    text: 'Na frase “Embora estivesse cansado, continuou estudando”, a palavra “Embora” introduz ideia de:',
    options: ['Causa', 'Concessão', 'Conclusão', 'Condição'],
    correct: 1,
    explanation: '“Embora” é uma conjunção concessiva: apresenta um fato que poderia impedir o outro, mas não impede.'
  },
  {
    id: 2,
    subject: 'Português',
    topic: 'Crase',
    difficulty: 2,
    text: 'Assinale a alternativa em que o uso da crase está correto:',
    options: ['Entreguei o documento à ela.', 'Cheguei à escola antes das oito.', 'Vou à pé todos os dias.', 'Refiro-me à pessoas experientes.'],
    correct: 1,
    explanation: 'Em “à escola” ocorre a fusão da preposição “a” com o artigo feminino “a”. Não há crase antes de pronome pessoal, em “a pé” nem antes de plural sem artigo.'
  },
  {
    id: 3,
    subject: 'Direito Constitucional',
    topic: 'Direitos fundamentais',
    difficulty: 2,
    text: 'No Brasil, a liberdade de manifestação do pensamento é assegurada constitucionalmente, sendo:',
    options: ['Permitido o anonimato em qualquer hipótese', 'Vedado o anonimato', 'Exigida autorização prévia do Estado', 'Restrita apenas a servidores públicos'],
    correct: 1,
    explanation: 'A Constituição assegura a manifestação do pensamento, mas veda o anonimato.'
  },
  {
    id: 4,
    subject: 'Direito Constitucional',
    topic: 'Princípios fundamentais',
    difficulty: 2,
    text: 'Qual alternativa apresenta um fundamento da República Federativa do Brasil previsto no art. 1º da Constituição?',
    options: ['Separação dos Poderes', 'Cidadania', 'Prevalência dos direitos humanos', 'Defesa da paz'],
    correct: 1,
    explanation: 'A cidadania é fundamento da República. Prevalência dos direitos humanos e defesa da paz aparecem entre os princípios das relações internacionais.'
  },
  {
    id: 5,
    subject: 'Direito Administrativo',
    topic: 'Princípios administrativos',
    difficulty: 1,
    text: 'Qual alternativa apresenta apenas princípios expressos no caput do art. 37 da Constituição Federal?',
    options: ['Legalidade e moralidade', 'Supremacia e autotutela', 'Continuidade e especialidade', 'Razoabilidade e proporcionalidade'],
    correct: 0,
    explanation: 'Legalidade e moralidade integram o conjunto expresso: legalidade, impessoalidade, moralidade, publicidade e eficiência.'
  },
  {
    id: 6,
    subject: 'Direito Administrativo',
    topic: 'Atos administrativos',
    difficulty: 2,
    text: 'Quando a Administração desfaz um ato válido por razões de conveniência e oportunidade, ocorre:',
    options: ['Anulação', 'Revogação', 'Convalidação obrigatória', 'Cassação judicial'],
    correct: 1,
    explanation: 'A revogação retira um ato válido por razões de mérito administrativo, isto é, conveniência e oportunidade.'
  },
  {
    id: 7,
    subject: 'Direito Penal',
    topic: 'Tentativa',
    difficulty: 2,
    text: 'Há tentativa quando o agente inicia a execução do crime, mas ele não se consuma por:',
    options: ['Arrependimento posterior obrigatório', 'Circunstâncias alheias à vontade do agente', 'Erro de proibição inevitável', 'Ausência completa de dolo desde o início'],
    correct: 1,
    explanation: 'Na tentativa, a execução é iniciada e a consumação não ocorre por circunstâncias alheias à vontade do agente.'
  },
  {
    id: 8,
    subject: 'Direito Penal',
    topic: 'Ilicitude',
    difficulty: 2,
    text: 'É causa legal de exclusão da ilicitude:',
    options: ['Embriaguez voluntária', 'Legítima defesa', 'Reincidência', 'Erro de tipo evitável em qualquer situação'],
    correct: 1,
    explanation: 'A legítima defesa é uma das causas legais de exclusão da ilicitude previstas no Código Penal.'
  },
  {
    id: 9,
    subject: 'Informática',
    topic: 'Segurança da informação',
    difficulty: 1,
    text: 'Qual prática aumenta a segurança de uma conta online?',
    options: ['Reutilizar a mesma senha em todos os serviços', 'Desativar atualizações automáticas', 'Ativar autenticação em dois fatores', 'Compartilhar códigos de verificação com terceiros'],
    correct: 2,
    explanation: 'A autenticação em dois fatores adiciona uma camada de proteção além da senha.'
  },
  {
    id: 10,
    subject: 'Informática',
    topic: 'Phishing',
    difficulty: 2,
    text: 'Uma mensagem que imita um banco e induz o usuário a clicar em um link falso para informar sua senha é um exemplo típico de:',
    options: ['Backup incremental', 'Phishing', 'Desfragmentação', 'Virtualização'],
    correct: 1,
    explanation: 'Phishing é uma técnica de engenharia social que tenta enganar a vítima para obter dados ou credenciais.'
  },
  {
    id: 11,
    subject: 'Matemática',
    topic: 'Porcentagem',
    difficulty: 1,
    text: 'Um candidato acertou 36 de 45 questões. Qual foi seu percentual de acertos?',
    options: ['72%', '75%', '80%', '85%'],
    correct: 2,
    explanation: '36 ÷ 45 = 0,8. Portanto, o percentual de acertos é 80%.'
  },
  {
    id: 12,
    subject: 'Matemática',
    topic: 'Regra de três',
    difficulty: 2,
    text: 'Se 4 cadernos custam R$ 60, mantendo o mesmo preço unitário, 7 cadernos custam:',
    options: ['R$ 90', 'R$ 95', 'R$ 100', 'R$ 105'],
    correct: 3,
    explanation: 'Cada caderno custa R$ 15. Logo, 7 × 15 = R$ 105.'
  }
];

function blankSubject() {
  return { score: 50, evidence: 0, total: 0, correct: 0, topics: {}, lastAttempt: null, highConfidenceErrors: 0 };
}

function freshState() {
  return {
    version: APP_VERSION,
    answered: 0,
    correct: 0,
    completedDiagnostics: 0,
    attempts: [],
    dailyPlan: { date: null, steps: [] },
    profile: { exam: 'Meu concurso', targetAccuracy: 80, dailyMinutes: 90 },
    subjects: Object.fromEntries(subjects.map(name => [name, blankSubject()]))
  };
}

function migrateState(saved) {
  const base = freshState();
  if (!saved || !saved.subjects) return base;
  base.answered = Number(saved.answered || 0);
  base.correct = Number(saved.correct || 0);
  base.completedDiagnostics = Number(saved.completedDiagnostics || 0);
  base.attempts = Array.isArray(saved.attempts) ? saved.attempts : [];
  base.dailyPlan = saved.dailyPlan && Array.isArray(saved.dailyPlan.steps) ? saved.dailyPlan : base.dailyPlan;
  base.profile = { ...base.profile, ...(saved.profile || {}) };

  subjects.forEach(name => {
    const old = saved.subjects[name];
    if (!old) return;
    base.subjects[name] = {
      ...blankSubject(),
      ...old,
      topics: { ...(old.topics || {}) }
    };
    Object.keys(base.subjects[name].topics).forEach(topicName => {
      base.subjects[name].topics[topicName] = {
        score: 50,
        evidence: 0,
        total: 0,
        correct: 0,
        lastAttempt: null,
        highConfidenceErrors: 0,
        ...base.subjects[name].topics[topicName]
      };
    });
  });
  base.version = APP_VERSION;
  return base;
}

let state = loadState();
let quiz = {
  active: false,
  index: 0,
  choice: null,
  startedAt: null,
  timerId: null,
  finalized: false,
  order: []
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return migrateState(saved);
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysSince(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function effectiveScore(data) {
  if (!data.evidence) return 50;
  const age = daysSince(data.lastAttempt);
  const penalty = age > 7 ? Math.min(12, (age - 7) * 0.35) : 0;
  return clamp(data.score - penalty, 15, 95);
}

function reliabilityFor(data) {
  if (!data.evidence) return 'Sem dados';
  if (data.evidence >= 8) return 'Alta';
  if (data.evidence >= 4) return 'Média';
  return 'Baixa';
}

function availableSubjects() {
  return Object.entries(state.subjects).filter(([, data]) => data.evidence > 0);
}

function overallMastery() {
  const items = availableSubjects();
  if (!items.length) return null;
  const weighted = items.reduce((sum, [, d]) => sum + effectiveScore(d) * Math.max(1, d.evidence), 0);
  const evidence = items.reduce((sum, [, d]) => sum + Math.max(1, d.evidence), 0);
  return Math.round(weighted / evidence);
}

function weakestSubject() {
  const items = availableSubjects();
  if (!items.length) return null;
  return [...items].sort((a, b) => effectiveScore(a[1]) - effectiveScore(b[1]) || b[1].evidence - a[1].evidence)[0];
}

function strongestSubject() {
  const items = availableSubjects();
  if (!items.length) return null;
  return [...items].sort((a, b) => effectiveScore(b[1]) - effectiveScore(a[1]))[0];
}

function weakestTopic(data) {
  const entries = Object.entries(data.topics || {}).filter(([, topic]) => topic.evidence > 0);
  if (!entries.length) return null;
  return [...entries].sort((a, b) => effectiveScore(a[1]) - effectiveScore(b[1]))[0];
}

function statusFor(data) {
  if (!data.evidence) return { label: 'Sem dados', cls: 'mid' };
  const score = effectiveScore(data);
  if (score >= 75) return { label: 'Bom domínio', cls: 'good' };
  if (score >= 55) return { label: 'Em construção', cls: 'mid' };
  return { label: 'Prioridade', cls: 'low' };
}

function patternStats() {
  const recent = state.attempts.slice(-20);
  const highConfidenceErrors = recent.filter(a => !a.correct && a.confidence === 'high');
  const slowAnswers = recent.filter(a => a.elapsed >= 60);
  const fastErrors = recent.filter(a => !a.correct && a.elapsed <= 12);
  const reasoned = recent.filter(a => a.reasoning && a.reasoning.trim().length >= 12);
  const avgTime = recent.length ? Math.round(recent.reduce((sum, a) => sum + a.elapsed, 0) / recent.length) : 0;
  return { recent, highConfidenceErrors, slowAnswers, fastErrors, reasoned, avgTime };
}

function renderDashboard() {
  const overall = overallMastery();
  const weak = weakestSubject();
  document.querySelector('#overallMastery').textContent = overall == null ? '—' : `${overall}%`;
  document.querySelector('#totalAnswered').textContent = state.answered;
  document.querySelector('#accuracy').textContent = state.answered ? `${Math.round((state.correct / state.answered) * 100)}%` : '—';
  document.querySelector('#prioritySubject').textContent = weak ? weak[0] : 'Diagnóstico';

  const hero = document.querySelector('#heroText');
  const headline = document.querySelector('#mentorHeadline');
  const advice = document.querySelector('#mentorAdvice');
  const heroAction = document.querySelector('#heroAction');

  if (!state.answered) {
    hero.textContent = 'Faça o diagnóstico para eu começar a construir seu mapa de conhecimento.';
    headline.textContent = 'Primeiro eu preciso medir você.';
    advice.textContent = 'Na V1.2 eu considero acerto, dificuldade, confiança, tempo e quantidade de evidências.';
    heroAction.textContent = 'Começar diagnóstico';
    heroAction.dataset.action = 'start-diagnostic';
  } else if (weak) {
    const score = Math.round(effectiveScore(weak[1]));
    hero.textContent = `Já tenho ${state.answered} evidências. Sua prioridade atual é ${weak[0]} (${score}%).`;
    headline.textContent = `${weak[0]} merece atenção agora.`;
    advice.textContent = buildTodayAdvice();
    heroAction.textContent = 'Ver missão de hoje';
    heroAction.dataset.action = 'scroll-mission';
  }

  ensureDailyPlan();
  renderDailyPlan();
  renderMiniMap();
  renderKnowledgeMap();
  renderHistory();
  renderProfile();
  renderPatternSummary();
}

function renderMiniMap() {
  const container = document.querySelector('#miniMap');
  container.innerHTML = subjects.map(name => {
    const data = state.subjects[name];
    const score = effectiveScore(data);
    const label = data.evidence ? `${Math.round(score)}%` : 'Sem dados';
    return `<div class="subject-row">
      <div class="subject-top"><strong>${name}</strong><span>${label}</span></div>
      <div class="bar"><span style="width:${data.evidence ? score : 0}%"></span></div>
    </div>`;
  }).join('');
}

function renderKnowledgeMap() {
  const container = document.querySelector('#knowledgeMap');
  container.innerHTML = subjects.map(name => {
    const data = state.subjects[name];
    const score = effectiveScore(data);
    const status = statusFor(data);
    const topicEntries = Object.entries(data.topics || {});
    const topics = topicEntries.length
      ? topicEntries
          .filter(([, d]) => d.evidence > 0)
          .sort((a,b) => effectiveScore(a[1]) - effectiveScore(b[1]))
          .slice(0,4)
          .map(([topic, d]) => `<span class="topic-pill">${topic}: ${Math.round(effectiveScore(d))}%</span>`).join('')
      : '<span class="topic-pill">Aguardando diagnóstico</span>';
    const age = data.lastAttempt ? daysSince(data.lastAttempt) : 0;
    const ageText = data.evidence && age > 7 ? `<span class="age-note">${age} dias sem evidência</span>` : '';
    return `<article class="knowledge-card">
      <div class="knowledge-head">
        <div><span class="eyebrow">${data.evidence} EVIDÊNCIA${data.evidence === 1 ? '' : 'S'}</span><h2>${name}</h2></div>
        <span class="status ${status.cls}">${status.label}</span>
      </div>
      <div class="knowledge-score">${data.evidence ? Math.round(score) + '%' : '—'}</div>
      <div class="bar"><span style="width:${data.evidence ? score : 0}%"></span></div>
      <div class="reliability"><span>Confiabilidade:</span><strong>${reliabilityFor(data)}</strong>${ageText}</div>
      <p>${data.evidence ? `${data.correct} acerto(s) em ${data.total} questão(ões). Erros com confiança alta registrados: ${data.highConfidenceErrors || 0}.` : 'Ainda não existem respostas suficientes para estimar seu domínio.'}</p>
      <div class="topic-list">${topics || '<span class="topic-pill">Sem tópico medido</span>'}</div>
    </article>`;
  }).join('');
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.go === view));
  if (view === 'mentora') initializeChat();
  if (view === 'historico') {
    renderHistory();
    renderProfile();
    renderPatternSummary();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startDiagnostic() {
  quiz.active = true;
  quiz.index = 0;
  quiz.choice = null;
  quiz.finalized = false;
  quiz.order = buildDiagnosticOrder();
  document.querySelector('#diagnosticEmpty').classList.add('hidden');
  document.querySelector('#quizCard').classList.remove('hidden');
  navigate('diagnostico');
  showQuestion();
}

function buildDiagnosticOrder() {
  const firstBySubject = subjects.map(subject => questions.find(q => q.subject === subject));
  const remaining = questions.filter(q => !firstBySubject.some(first => first.id === q.id));
  return [...firstBySubject, ...remaining];
}

function currentQuestion() {
  return quiz.order[quiz.index];
}

function showQuestion() {
  clearInterval(quiz.timerId);
  quiz.choice = null;
  quiz.finalized = false;
  quiz.startedAt = Date.now();

  const q = currentQuestion();
  document.querySelector('#questionMeta').textContent = `Questão ${quiz.index + 1} de ${quiz.order.length}`;
  document.querySelector('#quizProgress').style.width = `${(quiz.index / quiz.order.length) * 100}%`;
  document.querySelector('#questionSubject').textContent = q.subject;
  document.querySelector('#questionTopic').textContent = q.topic;
  document.querySelector('#questionDifficulty').textContent = `Nível ${q.difficulty}`;
  document.querySelector('#questionText').textContent = q.text;
  document.querySelector('#confidenceBox').classList.add('hidden');
  document.querySelector('#feedbackBox').className = 'feedback hidden';
  document.querySelector('#nextQuestionBtn').classList.add('hidden');
  document.querySelector('#reasoningInput').value = '';

  const answers = document.querySelector('#answers');
  answers.innerHTML = q.options.map((option, index) => `
    <button class="answer" data-answer="${index}">
      <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
      <span>${option}</span>
    </button>`).join('');

  answers.querySelectorAll('.answer').forEach(button => {
    button.addEventListener('click', () => selectAnswer(Number(button.dataset.answer)));
  });

  updateTimer();
  quiz.timerId = setInterval(updateTimer, 1000);
}

function updateTimer() {
  if (!quiz.startedAt) return;
  const secs = Math.floor((Date.now() - quiz.startedAt) / 1000);
  const min = String(Math.floor(secs / 60)).padStart(2, '0');
  const sec = String(secs % 60).padStart(2, '0');
  document.querySelector('#questionTimer').textContent = `${min}:${sec}`;
}

function selectAnswer(index) {
  if (quiz.finalized) return;
  quiz.choice = index;
  document.querySelectorAll('.answer').forEach(btn => btn.classList.toggle('selected', Number(btn.dataset.answer) === index));
  document.querySelector('#confidenceBox').classList.remove('hidden');
}

function scoreDelta(correct, difficulty, confidence, elapsed) {
  const confidenceValue = { low: -1, medium: 0, high: 1 }[confidence] ?? 0;
  let delta = correct
    ? 6 + difficulty * 2 + confidenceValue * 2
    : -(7 + difficulty * 2 + confidenceValue * 3);

  if (correct && elapsed <= 25) delta += 1;
  if (!correct && elapsed <= 10 && confidence === 'high') delta -= 2;
  return delta;
}

function ensureTopic(subject, topicName) {
  if (!subject.topics[topicName]) {
    subject.topics[topicName] = { score: 50, evidence: 0, total: 0, correct: 0, lastAttempt: null, highConfidenceErrors: 0 };
  }
  return subject.topics[topicName];
}

function finalizeAnswer(confidence) {
  if (quiz.choice == null || quiz.finalized) return;
  quiz.finalized = true;
  clearInterval(quiz.timerId);

  const q = currentQuestion();
  const isCorrect = quiz.choice === q.correct;
  const elapsed = Math.max(1, Math.round((Date.now() - quiz.startedAt) / 1000));
  const reasoning = document.querySelector('#reasoningInput').value.trim();
  const subject = state.subjects[q.subject];
  const topic = ensureTopic(subject, q.topic);
  const delta = scoreDelta(isCorrect, q.difficulty, confidence, elapsed);
  const timestamp = new Date().toISOString();

  [subject, topic].forEach(bucket => {
    bucket.score = clamp(bucket.score + delta, 15, 95);
    bucket.evidence += 1;
    bucket.total += 1;
    bucket.correct += isCorrect ? 1 : 0;
    bucket.lastAttempt = timestamp;
    if (!isCorrect && confidence === 'high') bucket.highConfidenceErrors = (bucket.highConfidenceErrors || 0) + 1;
  });

  state.answered += 1;
  state.correct += isCorrect ? 1 : 0;
  state.attempts.push({
    id: `${q.id}-${Date.now()}`,
    questionId: q.id,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    correct: isCorrect,
    selected: quiz.choice,
    confidence,
    elapsed,
    reasoning,
    delta,
    at: timestamp
  });
  if (state.attempts.length > 500) state.attempts = state.attempts.slice(-500);
  saveState();

  document.querySelectorAll('.answer').forEach(btn => btn.disabled = true);
  document.querySelectorAll('.confidence-options button').forEach(btn => btn.disabled = true);

  const feedback = document.querySelector('#feedbackBox');
  feedback.className = `feedback ${isCorrect ? 'good' : 'bad'}`;
  const confidenceText = { low: 'baixa', medium: 'média', high: 'alta' }[confidence];
  const signal = !isCorrect && confidence === 'high'
    ? ' Atenção: erro com confiança alta — isso vira prioridade para a mentora.'
    : isCorrect && confidence === 'low'
      ? ' Acerto com baixa confiança — vou tratar como domínio ainda frágil.'
      : '';
  feedback.innerHTML = `<strong>${isCorrect ? 'Acertou.' : 'Errou.'}</strong> ${q.explanation}<br><small>Tempo: ${elapsed}s · Confiança: ${confidenceText}.${signal}</small>`;
  document.querySelector('#nextQuestionBtn').classList.remove('hidden');
  renderDashboard();
}

function nextQuestion() {
  document.querySelectorAll('.confidence-options button').forEach(btn => btn.disabled = false);
  if (quiz.index < quiz.order.length - 1) {
    quiz.index += 1;
    showQuestion();
    return;
  }

  state.completedDiagnostics += 1;
  state.dailyPlan = { date: null, steps: [] };
  saveState();
  quiz.active = false;
  document.querySelector('#quizProgress').style.width = '100%';
  document.querySelector('#quizCard').classList.add('hidden');
  document.querySelector('#diagnosticEmpty').classList.remove('hidden');
  document.querySelector('#diagnosticEmpty h2').textContent = 'Diagnóstico concluído';
  document.querySelector('#diagnosticEmpty p').textContent = 'Seu mapa foi atualizado. A V1.2 já consegue montar uma missão diária e detectar alguns padrões de resposta.';
  document.querySelector('#diagnosticEmpty .primary').textContent = 'Refazer diagnóstico';
  renderDashboard();
  navigate('inicio');
  sendMentorMessage('today', false);
}

function buildTodayAdvice() {
  const weak = weakestSubject();
  if (!weak) return 'Faça primeiro o diagnóstico. Sem evidências eu estaria apenas chutando o que você deve estudar.';
  const [name, data] = weak;
  const score = Math.round(effectiveScore(data));
  const topic = weakestTopic(data);
  const topicText = topic ? `, principalmente em ${topic[0]}` : '';
  const reliability = reliabilityFor(data).toLowerCase();
  if (score < 50) return `Comece por ${name}${topicText}. Seu domínio estimado está em ${score}% e a confiabilidade dessa leitura é ${reliability}. Faça revisão curta e teste imediato.`;
  if (score < 70) return `Priorize ${name}${topicText}. Você já tem base, mas ainda não há consistência suficiente para tirar essa matéria do foco.`;
  return `Seu mapa está relativamente equilibrado. Mesmo assim, ${name}${topicText} é o menor domínio relativo. Hoje eu faria manutenção e depois misturaria questões antigas.`;
}

function generateDailyPlan() {
  const weak = weakestSubject();
  if (!weak) {
    return [{ title: 'Fazer diagnóstico inicial', detail: 'Preciso de evidências antes de orientar seu estudo.', minutes: 20, done: false }];
  }
  const [name, data] = weak;
  const topic = weakestTopic(data);
  const topicName = topic ? topic[0] : 'pontos básicos';
  const totalMinutes = clamp(Number(state.profile.dailyMinutes) || 90, 20, 480);
  const review = Math.max(15, Math.round(totalMinutes * 0.28));
  const practice = Math.max(20, Math.round(totalMinutes * 0.42));
  const mixed = Math.max(15, totalMinutes - review - practice);
  const highConf = state.attempts.slice(-20).some(a => !a.correct && a.confidence === 'high');

  const steps = [
    {
      title: `Revisão focada — ${name}`,
      detail: `Ataque ${topicName}. Vá direto ao conceito que explica seus erros recentes.`,
      minutes: review,
      done: false
    },
    {
      title: `Bateria de questões — ${name}`,
      detail: `Faça cerca de 10 questões de ${topicName}, marcando confiança em cada resposta.`,
      minutes: practice,
      done: false
    },
    {
      title: 'Teste de retenção misto',
      detail: highConf
        ? 'Misture questões de assuntos antigos e refaça mentalmente os erros em que você estava muito confiante.'
        : 'Misture questões de assuntos antigos sem olhar o tema antes de responder.',
      minutes: mixed,
      done: false
    }
  ];
  return steps;
}

function ensureDailyPlan(force = false) {
  const today = todayKey();
  if (force || state.dailyPlan.date !== today || !state.dailyPlan.steps.length) {
    state.dailyPlan = { date: today, steps: generateDailyPlan() };
    saveState();
  }
}

function renderDailyPlan() {
  const list = document.querySelector('#dailyPlan');
  const title = document.querySelector('#missionTitle');
  const subtitle = document.querySelector('#missionSubtitle');
  const progress = document.querySelector('#missionProgress');
  const regen = document.querySelector('#regeneratePlanBtn');
  const steps = state.dailyPlan.steps || [];
  const done = steps.filter(step => step.done).length;

  if (!state.answered) {
    title.textContent = 'Aguardando diagnóstico';
    subtitle.textContent = 'Depois do primeiro diagnóstico, eu monto uma sequência objetiva para hoje.';
    progress.textContent = '0/0';
    list.innerHTML = '<div class="empty-history">Faça o diagnóstico para liberar sua missão diária.</div>';
    regen.classList.add('hidden');
    return;
  }

  const weak = weakestSubject();
  title.textContent = weak ? `Foco: ${weak[0]}` : 'Missão de hoje';
  subtitle.textContent = `${state.profile.exam || 'Seu objetivo'} · ${state.profile.dailyMinutes} min disponíveis · meta de ${state.profile.targetAccuracy}% de acertos.`;
  progress.textContent = `${done}/${steps.length}`;
  regen.classList.remove('hidden');
  list.innerHTML = steps.map((step, index) => `
    <div class="plan-step ${step.done ? 'done' : ''}">
      <button class="step-check" data-plan-step="${index}" aria-label="Marcar etapa">${step.done ? '✓' : index + 1}</button>
      <div class="plan-copy"><strong>${step.title}</strong><small>${step.detail}</small></div>
      <span class="plan-time">${step.minutes} min</span>
    </div>`).join('');
}

function mentorResponse(type) {
  const weak = weakestSubject();
  const strong = strongestSubject();
  const overall = overallMastery();
  if (!weak) return 'Ainda não tenho evidências suficientes. Faça o diagnóstico primeiro e eu passo a orientar com base no seu desempenho.';

  if (type === 'today') {
    ensureDailyPlan();
    const firstOpen = state.dailyPlan.steps.find(step => !step.done);
    return `${buildTodayAdvice()} ${firstOpen ? `Sua próxima ação é: ${firstOpen.title} (${firstOpen.minutes} min).` : 'Você concluiu a missão planejada para hoje.'}`;
  }

  if (type === 'weakness') {
    const [name, data] = weak;
    const topic = weakestTopic(data);
    return `Seu ponto mais fraco agora é ${name}, com domínio estimado em ${Math.round(effectiveScore(data))}% e confiabilidade ${reliabilityFor(data).toLowerCase()}. ${topic ? `Dentro dela, ${topic[0]} está em ${Math.round(effectiveScore(topic[1]))}%.` : ''} Eu ainda quero mais evidências antes de considerar essa leitura estável.`;
  }

  if (type === 'pattern') {
    const p = patternStats();
    if (!p.recent.length) return 'Ainda não existe histórico suficiente para detectar padrões.';
    const parts = [];
    if (p.highConfidenceErrors.length) parts.push(`${p.highConfidenceErrors.length} erro(s) recente(s) com confiança alta`);
    if (p.fastErrors.length) parts.push(`${p.fastErrors.length} erro(s) em até 12 segundos`);
    if (p.slowAnswers.length) parts.push(`${p.slowAnswers.length} resposta(s) acima de 60 segundos`);
    if (!parts.length) parts.push('nenhum padrão de risco forte nas últimas respostas');
    return `Nas suas últimas ${p.recent.length} respostas, encontrei ${parts.join(', ')}. Seu tempo médio foi ${p.avgTime}s. Erro com confiança alta é o sinal que eu trato com mais prioridade, porque indica uma regra possivelmente aprendida de forma incorreta.`;
  }

  if (type === 'advance') {
    const [name, data] = weak;
    const score = effectiveScore(data);
    const target = Math.max(70, Number(state.profile.targetAccuracy || 80) - 10);
    if ((overall ?? 0) >= target && score >= target - 5 && data.evidence >= 4 && state.answered >= 18) {
      return `Eu liberaria avanço gradual. Seu domínio médio está em ${overall}% e até sua matéria mais fraca, ${name}, está em ${Math.round(score)}%. Avance, mas mantenha uma revisão curta dos tópicos antigos.`;
    }
    return `Ainda não liberaria avanço geral. Seu domínio médio está em ${overall ?? 0}% e ${name} está em ${Math.round(score)}% com ${data.evidence} evidência(s). Quero pelo menos mais consistência antes de abrir muita matéria nova.`;
  }

  if (type === 'review') {
    const ordered = availableSubjects().sort((a,b) => effectiveScore(a[1]) - effectiveScore(b[1])).slice(0,2);
    return `Sua revisão deveria começar por ${ordered.map(([name,d]) => `${name} (${Math.round(effectiveScore(d))}%)`).join(' e ')}. Agora eu também reduzo a confiança quando um assunto passa mais de 7 dias sem nova evidência.`;
  }

  return `Seu melhor desempenho no momento é ${strong ? strong[0] : 'indefinido'}.`;
}

function addChatMessage(text, who) {
  const box = document.querySelector('#chatMessages');
  const div = document.createElement('div');
  div.className = `message ${who}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function sendMentorMessage(type, navigateToChat = true) {
  const labels = {
    today: 'O que devo estudar hoje?',
    weakness: 'Onde estou pior?',
    pattern: 'Que padrão você vê nos meus erros?',
    advance: 'Posso avançar?',
    review: 'O que devo revisar?'
  };
  if (navigateToChat) navigate('mentora');
  addChatMessage(labels[type] || 'Analise meu desempenho.', 'user');
  setTimeout(() => addChatMessage(mentorResponse(type), 'ai'), 120);
}

function initializeChat() {
  const box = document.querySelector('#chatMessages');
  if (!box.children.length) {
    addChatMessage('Sou a V1.2 da sua mentora. Ainda não sou uma IA externa, mas agora guardo tentativas, tempo, confiança, recência e padrões de erro para orientar sua próxima ação.', 'ai');
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function renderHistory() {
  const list = document.querySelector('#historyList');
  const count = document.querySelector('#historyCount');
  if (!list || !count) return;
  count.textContent = `${state.attempts.length} registro${state.attempts.length === 1 ? '' : 's'}`;
  if (!state.attempts.length) {
    list.innerHTML = '<div class="empty-history">As suas respostas aparecerão aqui depois do diagnóstico.</div>';
    return;
  }
  list.innerHTML = state.attempts.slice(-30).reverse().map(attempt => `
    <article class="history-item">
      <div class="history-result ${attempt.correct ? 'good' : 'bad'}">${attempt.correct ? '✓' : '×'}</div>
      <div class="history-copy">
        <strong>${attempt.subject}</strong>
        <span>${attempt.topic} · confiança ${({low:'baixa',medium:'média',high:'alta'}[attempt.confidence] || '—')}</span>
      </div>
      <div class="history-meta">${attempt.elapsed}s<br>${formatDate(attempt.at)}</div>
    </article>`).join('');
}

function renderProfile() {
  const exam = document.querySelector('#profileExam');
  const target = document.querySelector('#profileTarget');
  const minutes = document.querySelector('#profileMinutes');
  if (!exam || !target || !minutes) return;
  exam.value = state.profile.exam || '';
  target.value = state.profile.targetAccuracy || 80;
  minutes.value = state.profile.dailyMinutes || 90;
}

function saveProfile() {
  const exam = document.querySelector('#profileExam').value.trim() || 'Meu concurso';
  const targetAccuracy = clamp(Number(document.querySelector('#profileTarget').value) || 80, 50, 100);
  const dailyMinutes = clamp(Number(document.querySelector('#profileMinutes').value) || 90, 20, 480);
  state.profile = { exam, targetAccuracy, dailyMinutes };
  state.dailyPlan = { date: null, steps: [] };
  saveState();
  renderDashboard();
  alert('Objetivo salvo. A missão diária foi recalculada.');
}

function renderPatternSummary() {
  const container = document.querySelector('#patternSummary');
  if (!container) return;
  const p = patternStats();
  if (!p.recent.length) {
    container.innerHTML = '<div class="pattern-item"><strong>Sem histórico ainda</strong><span>Faça o diagnóstico para eu começar a detectar padrões.</span></div>';
    return;
  }
  const items = [
    ['Erros com confiança alta', `${p.highConfidenceErrors.length} nas últimas ${p.recent.length} respostas`],
    ['Tempo médio por questão', `${p.avgTime} segundos`],
    ['Respostas acima de 60s', `${p.slowAnswers.length} ocorrência(s)`],
    ['Raciocínio registrado', `${p.reasoned.length} resposta(s) com explicação escrita`]
  ];
  container.innerHTML = items.map(([title, detail]) => `<div class="pattern-item"><strong>${title}</strong><span>${detail}</span></div>`).join('');
}

document.addEventListener('click', event => {
  const go = event.target.closest('[data-go]');
  if (go) navigate(go.dataset.go);

  const action = event.target.closest('[data-action]');
  if (action?.dataset.action === 'start-diagnostic') startDiagnostic();
  if (action?.dataset.action === 'regenerate-plan') {
    ensureDailyPlan(true);
    renderDailyPlan();
  }
  if (action?.dataset.action === 'scroll-mission') {
    document.querySelector('.mission-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const mentor = event.target.closest('[data-mentor]');
  if (mentor) sendMentorMessage(mentor.dataset.mentor, true);

  const step = event.target.closest('[data-plan-step]');
  if (step) {
    const index = Number(step.dataset.planStep);
    if (state.dailyPlan.steps[index]) {
      state.dailyPlan.steps[index].done = !state.dailyPlan.steps[index].done;
      saveState();
      renderDailyPlan();
    }
  }
});

document.querySelectorAll('.confidence-options button').forEach(button => {
  button.addEventListener('click', () => finalizeAnswer(button.dataset.confidence));
});

document.querySelector('#nextQuestionBtn').addEventListener('click', nextQuestion);
document.querySelector('#saveProfileBtn').addEventListener('click', saveProfile);

document.querySelector('#resetBtn').addEventListener('click', () => {
  if (!confirm('Apagar todos os dados locais da Mentor IA neste navegador?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

renderDashboard();
initializeChat();
