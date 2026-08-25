const STORAGE_KEY = 'mentorIA-v1';

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
    subject: 'Direito Constitucional',
    topic: 'Direitos fundamentais',
    difficulty: 2,
    text: 'No Brasil, a liberdade de manifestação do pensamento é assegurada constitucionalmente, sendo:',
    options: ['Permitido o anonimato em qualquer hipótese', 'Vedado o anonimato', 'Exigida autorização prévia do Estado', 'Restrita apenas a servidores públicos'],
    correct: 1,
    explanation: 'A Constituição assegura a manifestação do pensamento, mas veda o anonimato.'
  },
  {
    id: 3,
    subject: 'Direito Administrativo',
    topic: 'Princípios administrativos',
    difficulty: 1,
    text: 'Qual alternativa apresenta apenas princípios expressos no caput do art. 37 da Constituição Federal?',
    options: ['Legalidade e moralidade', 'Supremacia e autotutela', 'Continuidade e especialidade', 'Razoabilidade e proporcionalidade'],
    correct: 0,
    explanation: 'Legalidade e moralidade integram o conjunto expresso: legalidade, impessoalidade, moralidade, publicidade e eficiência.'
  },
  {
    id: 4,
    subject: 'Direito Penal',
    topic: 'Tentativa',
    difficulty: 2,
    text: 'Há tentativa quando o agente inicia a execução do crime, mas ele não se consuma por:',
    options: ['Arrependimento posterior obrigatório', 'Circunstâncias alheias à vontade do agente', 'Erro de proibição inevitável', 'Ausência completa de dolo desde o início'],
    correct: 1,
    explanation: 'Na tentativa, a execução é iniciada e a consumação não ocorre por circunstâncias alheias à vontade do agente.'
  },
  {
    id: 5,
    subject: 'Informática',
    topic: 'Segurança da informação',
    difficulty: 1,
    text: 'Qual prática aumenta a segurança de uma conta online?',
    options: ['Reutilizar a mesma senha em todos os serviços', 'Desativar atualizações automáticas', 'Ativar autenticação em dois fatores', 'Compartilhar códigos de verificação com terceiros'],
    correct: 2,
    explanation: 'A autenticação em dois fatores adiciona uma camada de proteção além da senha.'
  },
  {
    id: 6,
    subject: 'Matemática',
    topic: 'Porcentagem',
    difficulty: 1,
    text: 'Um candidato acertou 36 de 45 questões. Qual foi seu percentual de acertos?',
    options: ['72%', '75%', '80%', '85%'],
    correct: 2,
    explanation: '36 ÷ 45 = 0,8. Portanto, o percentual de acertos é 80%.'
  }
];

function freshState() {
  return {
    answered: 0,
    correct: 0,
    completedDiagnostics: 0,
    subjects: Object.fromEntries(subjects.map(name => [name, {
      score: 50,
      evidence: 0,
      total: 0,
      correct: 0,
      topics: {}
    }]))
  };
}

let state = loadState();
let quiz = {
  active: false,
  index: 0,
  choice: null,
  startedAt: null,
  timerId: null,
  finalized: false
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.subjects ? saved : freshState();
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

function availableSubjects() {
  return Object.entries(state.subjects).filter(([, data]) => data.evidence > 0);
}

function overallMastery() {
  const items = availableSubjects();
  if (!items.length) return null;
  const weighted = items.reduce((sum, [, d]) => sum + d.score * Math.max(1, d.evidence), 0);
  const evidence = items.reduce((sum, [, d]) => sum + Math.max(1, d.evidence), 0);
  return Math.round(weighted / evidence);
}

function weakestSubject() {
  const items = availableSubjects();
  if (!items.length) return null;
  return items.sort((a, b) => a[1].score - b[1].score || b[1].evidence - a[1].evidence)[0];
}

function strongestSubject() {
  const items = availableSubjects();
  if (!items.length) return null;
  return items.sort((a, b) => b[1].score - a[1].score)[0];
}

function statusFor(data) {
  if (!data.evidence) return { label: 'Sem dados', cls: 'mid' };
  if (data.score >= 75) return { label: 'Bom domínio', cls: 'good' };
  if (data.score >= 55) return { label: 'Em construção', cls: 'mid' };
  return { label: 'Prioridade', cls: 'low' };
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

  if (!state.answered) {
    hero.textContent = 'Faça um diagnóstico rápido para eu estimar seus pontos fortes e suas prioridades.';
    headline.textContent = 'Primeiro eu preciso medir você.';
    advice.textContent = 'O diagnóstico usa acerto, dificuldade e sua confiança na resposta. Depois disso eu monto a prioridade de estudo.';
  } else if (weak) {
    hero.textContent = `Já tenho ${state.answered} evidências. Hoje sua maior prioridade é ${weak[0]}.`;
    headline.textContent = `${weak[0]} merece atenção agora.`;
    advice.textContent = buildTodayAdvice();
  }

  renderMiniMap();
  renderKnowledgeMap();
}

function renderMiniMap() {
  const container = document.querySelector('#miniMap');
  container.innerHTML = subjects.map(name => {
    const data = state.subjects[name];
    const label = data.evidence ? `${Math.round(data.score)}%` : 'Sem dados';
    const width = data.evidence ? data.score : 0;
    return `<div class="subject-row">
      <div class="subject-top"><strong>${name}</strong><span>${label}</span></div>
      <div class="bar"><span style="width:${width}%"></span></div>
    </div>`;
  }).join('');
}

function renderKnowledgeMap() {
  const container = document.querySelector('#knowledgeMap');
  container.innerHTML = subjects.map(name => {
    const data = state.subjects[name];
    const status = statusFor(data);
    const topicEntries = Object.entries(data.topics);
    const topics = topicEntries.length
      ? topicEntries.sort((a,b) => a[1].score - b[1].score).slice(0,3).map(([topic, d]) => `<span class="topic-pill">${topic}: ${Math.round(d.score)}%</span>`).join('')
      : '<span class="topic-pill">Aguardando diagnóstico</span>';
    return `<article class="knowledge-card">
      <div class="knowledge-head">
        <div><span class="eyebrow">${data.evidence} EVIDÊNCIA${data.evidence === 1 ? '' : 'S'}</span><h2>${name}</h2></div>
        <span class="status ${status.cls}">${status.label}</span>
      </div>
      <div class="knowledge-score">${data.evidence ? Math.round(data.score) + '%' : '—'}</div>
      <div class="bar"><span style="width:${data.evidence ? data.score : 0}%"></span></div>
      <p>${data.evidence ? `${data.correct} acerto(s) em ${data.total} questão(ões). A confiança também interfere na estimativa.` : 'Ainda não existem respostas suficientes para estimar seu domínio.'}</p>
      <div class="topic-list">${topics}</div>
    </article>`;
  }).join('');
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.go === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startDiagnostic() {
  quiz.active = true;
  quiz.index = 0;
  quiz.choice = null;
  quiz.finalized = false;
  document.querySelector('#diagnosticEmpty').classList.add('hidden');
  document.querySelector('#quizCard').classList.remove('hidden');
  navigate('diagnostico');
  showQuestion();
}

function showQuestion() {
  clearInterval(quiz.timerId);
  quiz.choice = null;
  quiz.finalized = false;
  quiz.startedAt = Date.now();

  const q = questions[quiz.index];
  document.querySelector('#questionMeta').textContent = `Questão ${quiz.index + 1} de ${questions.length}`;
  document.querySelector('#quizProgress').style.width = `${(quiz.index / questions.length) * 100}%`;
  document.querySelector('#questionSubject').textContent = q.subject;
  document.querySelector('#questionTopic').textContent = q.topic;
  document.querySelector('#questionText').textContent = q.text;
  document.querySelector('#confidenceBox').classList.add('hidden');
  document.querySelector('#feedbackBox').className = 'feedback hidden';
  document.querySelector('#nextQuestionBtn').classList.add('hidden');

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

function scoreDelta(correct, difficulty, confidence) {
  const confidenceValue = { low: -1, medium: 0, high: 1 }[confidence] ?? 0;
  if (correct) return 7 + difficulty * 2 + confidenceValue * 2;
  return -(7 + difficulty * 2 + confidenceValue * 3);
}

function finalizeAnswer(confidence) {
  if (quiz.choice == null || quiz.finalized) return;
  quiz.finalized = true;
  clearInterval(quiz.timerId);

  const q = questions[quiz.index];
  const isCorrect = quiz.choice === q.correct;
  const elapsed = Math.max(1, Math.round((Date.now() - quiz.startedAt) / 1000));
  const subject = state.subjects[q.subject];
  const delta = scoreDelta(isCorrect, q.difficulty, confidence);

  subject.score = clamp(subject.score + delta, 15, 95);
  subject.evidence += 1;
  subject.total += 1;
  subject.correct += isCorrect ? 1 : 0;

  if (!subject.topics[q.topic]) subject.topics[q.topic] = { score: 50, evidence: 0, total: 0, correct: 0 };
  const topic = subject.topics[q.topic];
  topic.score = clamp(topic.score + delta, 15, 95);
  topic.evidence += 1;
  topic.total += 1;
  topic.correct += isCorrect ? 1 : 0;

  state.answered += 1;
  state.correct += isCorrect ? 1 : 0;
  saveState();

  document.querySelectorAll('.answer').forEach(btn => btn.disabled = true);
  document.querySelectorAll('.confidence-options button').forEach(btn => btn.disabled = true);

  const feedback = document.querySelector('#feedbackBox');
  feedback.className = `feedback ${isCorrect ? 'good' : 'bad'}`;
  const confidenceText = { low: 'baixa', medium: 'média', high: 'alta' }[confidence];
  feedback.innerHTML = `<strong>${isCorrect ? 'Acertou.' : 'Errou.'}</strong> ${q.explanation}<br><small>Tempo: ${elapsed}s · Confiança: ${confidenceText}. A mentora registrou isso como evidência para ${q.subject}.</small>`;
  document.querySelector('#nextQuestionBtn').classList.remove('hidden');
  renderDashboard();
}

function nextQuestion() {
  document.querySelectorAll('.confidence-options button').forEach(btn => btn.disabled = false);
  if (quiz.index < questions.length - 1) {
    quiz.index += 1;
    showQuestion();
    return;
  }

  state.completedDiagnostics += 1;
  saveState();
  quiz.active = false;
  document.querySelector('#quizProgress').style.width = '100%';
  document.querySelector('#quizCard').classList.add('hidden');
  document.querySelector('#diagnosticEmpty').classList.remove('hidden');
  document.querySelector('#diagnosticEmpty h2').textContent = 'Diagnóstico concluído';
  document.querySelector('#diagnosticEmpty p').textContent = 'Seu primeiro mapa foi criado. Continue respondendo questões no futuro para a estimativa ficar mais confiável.';
  document.querySelector('#diagnosticEmpty .primary').textContent = 'Refazer diagnóstico';
  renderDashboard();
  navigate('inicio');
  sendMentorMessage('today', false);
}

function buildTodayAdvice() {
  const weak = weakestSubject();
  if (!weak) return 'Faça primeiro o diagnóstico. Sem evidências eu estaria apenas chutando o que você deve estudar.';
  const [name, data] = weak;
  const topic = Object.entries(data.topics).sort((a,b) => a[1].score - b[1].score)[0];
  const topicText = topic ? `, principalmente em ${topic[0]}` : '';
  if (data.score < 50) return `Eu começaria por ${name}${topicText}. Seu domínio estimado está em ${Math.round(data.score)}%. Faça uma revisão curta e depois uma bateria pequena de questões.`;
  if (data.score < 70) return `Priorize ${name}${topicText}. Você já tem base, mas ainda não há consistência suficiente para tirar essa matéria do foco.`;
  return `Seu mapa está equilibrado. Mesmo assim, ${name}${topicText} é hoje o ponto com menor domínio relativo. Faça uma revisão de manutenção antes de avançar.`;
}

function mentorResponse(type) {
  const weak = weakestSubject();
  const strong = strongestSubject();
  const overall = overallMastery();
  if (!weak) return 'Ainda não tenho evidências suficientes. Faça o diagnóstico primeiro e eu passo a orientar com base no seu desempenho.';

  if (type === 'today') return buildTodayAdvice();
  if (type === 'weakness') {
    const [name, data] = weak;
    const topic = Object.entries(data.topics).sort((a,b) => a[1].score - b[1].score)[0];
    return `Seu ponto mais fraco agora é ${name}, com domínio estimado em ${Math.round(data.score)}%. ${topic ? `Dentro dela, ${topic[0]} é o tópico que eu atacaria primeiro.` : ''} Eu ainda quero mais questões antes de considerar essa estimativa estável.`;
  }
  if (type === 'advance') {
    const weakScore = weak[1].score;
    if ((overall ?? 0) >= 75 && weakScore >= 65 && state.answered >= 12) return 'Sim. Seus resultados já estão suficientemente consistentes para aumentar a dificuldade e abrir assuntos novos, mantendo revisões curtas dos pontos antigos.';
    return `Ainda não liberaria avanço geral. Seu domínio médio está em ${overall ?? 0}% e ${weak[0]} ainda está em ${Math.round(weakScore)}%. Eu consolidaria esse ponto antes.`;
  }
  if (type === 'review') {
    const ordered = availableSubjects().sort((a,b) => a[1].score - b[1].score).slice(0,2);
    return `Sua revisão deveria começar por ${ordered.map(([name,d]) => `${name} (${Math.round(d.score)}%)`).join(' e ')}. Na versão com histórico de datas, eu também vou considerar há quantos dias você não vê cada assunto.`;
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
    advance: 'Posso avançar?',
    review: 'O que devo revisar?'
  };
  if (navigateToChat) navigate('mentora');
  addChatMessage(labels[type] || 'Analise meu desempenho.', 'user');
  setTimeout(() => addChatMessage(mentorResponse(type), 'ai'), 180);
}

function initializeChat() {
  const box = document.querySelector('#chatMessages');
  if (!box.children.length) addChatMessage('Sou a demonstração da sua futura mentora. Eu ainda uso regras locais, mas já consigo interpretar seu mapa de domínio e sugerir a próxima ação.', 'ai');
}

document.addEventListener('click', event => {
  const go = event.target.closest('[data-go]');
  if (go) {
    navigate(go.dataset.go);
    if (go.dataset.go === 'mentora') initializeChat();
  }

  const action = event.target.closest('[data-action]');
  if (action?.dataset.action === 'start-diagnostic') startDiagnostic();

  const mentor = event.target.closest('[data-mentor]');
  if (mentor) sendMentorMessage(mentor.dataset.mentor, true);
});

document.querySelectorAll('.confidence-options button').forEach(button => {
  button.addEventListener('click', () => finalizeAnswer(button.dataset.confidence));
});

document.querySelector('#nextQuestionBtn').addEventListener('click', nextQuestion);

document.querySelector('#resetBtn').addEventListener('click', () => {
  if (!confirm('Apagar apenas os dados locais desta demonstração?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

renderDashboard();
initializeChat();
