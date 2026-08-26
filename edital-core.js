(() => {
  'use strict';

  const V = '1.7';
  let db = null;
  let user = null;
  let subjects = [];
  let topics = [];
  let questions = [];
  let attempts = [];

  const $ = s => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function addAssets() {
    if (!$('#editalCoreCss')) {
      const l = document.createElement('link');
      l.id = 'editalCoreCss';
      l.rel = 'stylesheet';
      l.href = './edital-core.css?v=1.7';
      document.head.appendChild(l);
    }
  }

  async function getClient() {
    if (window.mentorCloud?.client) return window.mentorCloud.client;
    throw new Error('Conexão com a nuvem ainda não carregou.');
  }

  function qCount(topicId) {
    return questions.filter(q => q.topic_id === topicId).length;
  }

  function topicAttempts(topicId) {
    return attempts.filter(a => a.topic_id === topicId);
  }

  function topicStats(topic) {
    const a = topicAttempts(topic.id);
    const correct = a.filter(x => x.is_correct).length;
    const accuracy = a.length ? Math.round((correct / a.length) * 100) : null;
    const highConfidenceErrors = a.filter(x => !x.is_correct && Number(x.confidence) >= 5).length;
    const avgTime = a.length ? Math.round(a.reduce((s,x) => s + Number(x.response_time_seconds || 0), 0) / a.length) : 0;
    return { attempts: a.length, correct, accuracy, highConfidenceErrors, avgTime, questions: qCount(topic.id) };
  }

  function subjectTopics(subjectId) {
    return topics.filter(t => t.subject_id === subjectId).sort((a,b) => (a.position || 0) - (b.position || 0));
  }

  function subjectStats(subject) {
    const ts = subjectTopics(subject.id);
    const covered = ts.filter(t => qCount(t.id) > 0).length;
    const studied = ts.filter(t => topicAttempts(t.id).length > 0).length;
    return { total: ts.length, covered, studied };
  }

  function overallStats() {
    const covered = topics.filter(t => qCount(t.id) > 0).length;
    const studied = topics.filter(t => topicAttempts(t.id).length > 0).length;
    return { subjects: subjects.length, topics: topics.length, covered, studied, questions: questions.length };
  }

  function priorityTopic() {
    const withQuestions = topics.filter(t => qCount(t.id) > 0);
    if (!withQuestions.length) return null;

    const unseen = withQuestions.filter(t => topicAttempts(t.id).length === 0)
      .sort((a,b) => {
        const sa = subjects.find(s => s.id === a.subject_id)?.position || 999;
        const sb = subjects.find(s => s.id === b.subject_id)?.position || 999;
        return sa - sb || (a.position || 0) - (b.position || 0);
      });
    if (unseen.length) return unseen[0];

    return withQuestions
      .map(t => ({ topic: t, stats: topicStats(t) }))
      .sort((a,b) => {
        const riskA = (100 - (a.stats.accuracy ?? 0)) + a.stats.highConfidenceErrors * 15 + Math.min(20, a.stats.avgTime / 6);
        const riskB = (100 - (b.stats.accuracy ?? 0)) + b.stats.highConfidenceErrors * 15 + Math.min(20, b.stats.avgTime / 6);
        return riskB - riskA;
      })[0]?.topic || null;
  }

  function weakestStudiedTopic() {
    const studied = topics.map(t => ({ topic:t, stats:topicStats(t) })).filter(x => x.stats.attempts > 0);
    if (!studied.length) return null;
    return studied.sort((a,b) => (a.stats.accuracy ?? 0) - (b.stats.accuracy ?? 0) || b.stats.highConfidenceErrors - a.stats.highConfidenceErrors)[0];
  }

  function addMessage(text, who='ai') {
    const box = $('#chatMessages');
    if (!box) return;
    const div = document.createElement('div');
    div.className = `message ${who}`;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function mentorReply(type) {
    const p = priorityTopic();
    const weak = weakestStudiedTopic();
    const os = overallStats();
    if (!p) return 'O edital já está carregado, mas ainda preciso abastecer tópicos com questões reais antes de orientar por desempenho.';
    const ps = topicStats(p);
    const subject = subjects.find(s => s.id === p.subject_id)?.name || 'Matéria';

    if (type === 'today') {
      if (!ps.attempts) return `Hoje eu começaria por ${subject} → ${p.title}. Esse item está no edital e já tem ${ps.questions} questão(ões) reais disponíveis, mas ainda não foi medido.`;
      return `Hoje eu priorizaria ${subject} → ${p.title}. Seu histórico nesse tópico está em ${ps.accuracy}% de acertos, com ${ps.attempts} tentativa(s).`;
    }
    if (type === 'weakness') {
      if (!weak) return `Ainda não há tópicos estudados o suficiente para apontar uma fraqueza. A próxima medição deve ser ${subject} → ${p.title}.`;
      const s = subjects.find(x => x.id === weak.topic.subject_id)?.name || 'Matéria';
      return `Seu ponto mais fraco medido no edital é ${s} → ${weak.topic.title}: ${weak.stats.accuracy}% em ${weak.stats.attempts} tentativa(s).`;
    }
    if (type === 'pattern') {
      const recent = attempts.slice(0,30);
      const high = recent.filter(a => !a.is_correct && Number(a.confidence) >= 5).length;
      const slow = recent.filter(a => Number(a.response_time_seconds || 0) >= 60).length;
      const accuracy = recent.length ? Math.round(recent.filter(a => a.is_correct).length / recent.length * 100) : 0;
      return `Nas últimas ${recent.length} respostas do edital: ${accuracy}% de acertos, ${high} erro(s) com confiança alta e ${slow} resposta(s) acima de 60 segundos. Erro com confiança alta recebe prioridade extra.`;
    }
    if (type === 'advance') {
      if (!weak) return 'Ainda não liberaria avanço por domínio: primeiro precisamos medir mais itens do edital.';
      if ((weak.stats.accuracy ?? 0) >= 80 && weak.stats.attempts >= 5) return `Você pode avançar gradualmente, mantendo revisão de ${weak.topic.title}. A decisão continua presa aos itens do edital, não a assuntos externos.`;
      return `Ainda não avançaria desse núcleo. ${weak.topic.title} está em ${weak.stats.accuracy}% e precisa de mais consistência antes de sair do foco.`;
    }
    if (type === 'review') {
      const review = topics.map(t => ({topic:t,stats:topicStats(t)})).filter(x => x.stats.attempts && (x.stats.accuracy < 75 || x.stats.highConfidenceErrors)).sort((a,b) => (a.stats.accuracy ?? 0) - (b.stats.accuracy ?? 0)).slice(0,3);
      if (!review.length) return 'Ainda não há uma fila de revisão forte. Continue medindo tópicos do edital com questões reais.';
      return `Sua revisão deve começar por ${review.map(x => x.topic.title).join('; ')}.`;
    }
    return `A base atual tem ${os.topics} tópicos oficiais do edital e ${os.questions} questões reais já vinculadas.`;
  }

  function renderMission() {
    const p = priorityTopic();
    const title = $('#missionTitle');
    const subtitle = $('#missionSubtitle');
    const list = $('#dailyPlan');
    const progress = $('#missionProgress');
    if (!title || !subtitle || !list || !progress) return;
    if (!p) {
      title.textContent = 'Abastecendo o edital';
      subtitle.textContent = 'Os 99 tópicos estão cadastrados. Agora preciso ligar questões reais a eles.';
      progress.textContent = '0/3';
      list.innerHTML = '<div class="empty-history">Nenhuma questão disponível para iniciar a missão.</div>';
      return;
    }
    const s = subjects.find(x => x.id === p.subject_id)?.name || 'Matéria';
    const st = topicStats(p);
    title.textContent = `Foco: ${s}`;
    subtitle.textContent = `${p.syllabus_code || ''} · ${p.title}`;
    progress.textContent = '0/3';
    list.innerHTML = `
      <div class="edital-mission-step"><span class="edital-mission-num">1</span><div><strong>Revisão do item do edital</strong><small>${esc(p.title)}</small></div><span class="edital-mission-time">15 min</span></div>
      <div class="edital-mission-step"><span class="edital-mission-num">2</span><div><strong>Questões reais</strong><small>${st.questions ? `Resolver questões já vinculadas a este tópico.` : 'Aguardando abastecimento por acervo/internet.'}</small></div><span class="edital-mission-time">25 min</span></div>
      <div class="edital-mission-step"><span class="edital-mission-num">3</span><div><strong>Revisão ativa</strong><small>Revisar erros e marcar o tópico para nova checagem.</small></div><span class="edital-mission-time">15 min</span></div>`;
  }

  function renderHome() {
    const os = overallStats();
    const hero = $('#heroText');
    const headline = $('#mentorHeadline');
    const advice = $('#mentorAdvice');
    const p = priorityTopic();
    if (hero) hero.textContent = `PMBA Soldado 2026 é a grade oficial: ${os.subjects} matérias e ${os.topics} tópicos. O acervo e a internet só abastecem essa grade.`;
    if (headline) headline.textContent = p ? `Próximo foco do edital: ${subjects.find(s => s.id === p.subject_id)?.name || ''}.` : 'Edital carregado. Falta abastecer mais tópicos.';
    if (advice) advice.textContent = p ? p.title : `Já tenho a estrutura do edital; ${os.covered}/${os.topics} tópico(s) possuem questões vinculadas.`;
    renderMission();
  }

  function renderEdital() {
    const view = $('[data-view="edital"]');
    if (!view) return;
    const os = overallStats();
    const p = priorityTopic();
    const pSubject = p ? subjects.find(s => s.id === p.subject_id) : null;
    const sections = ['Conhecimentos Gerais','Conhecimentos Específicos'];

    const sectionHtml = sections.map(section => {
      const ss = subjects.filter(s => s.syllabus_section === section).sort((a,b) => (a.position||0)-(b.position||0));
      return `<div class="edital-section-title">${esc(section)}</div>` + ss.map(subject => {
        const st = subjectStats(subject);
        const pct = st.total ? Math.round(st.studied / st.total * 100) : 0;
        const rows = subjectTopics(subject.id).map(topic => {
          const ts = topicStats(topic);
          const state = ts.attempts ? (ts.accuracy >= 80 ? 'studied' : ts.accuracy < 60 ? 'review' : 'studied') : ts.questions ? 'covered' : '';
          const statusText = ts.attempts ? `${ts.accuracy}% · ${ts.attempts} resp.` : ts.questions ? `${ts.questions} questão(ões)` : 'sem questões';
          return `<div class="edital-topic">
            <span class="edital-code">${esc(topic.syllabus_code || '')}</span>
            <span class="edital-topic-title">${esc(topic.title)}</span>
            <div class="edital-topic-meta"><span class="edital-pill ${state}">${esc(statusText)}</span><button class="edital-train" data-edital-train="${topic.id}" data-edital-subject="${subject.id}" ${ts.questions ? '' : 'disabled'}>${ts.questions ? 'Treinar' : 'Aguardando'}</button></div>
          </div>`;
        }).join('');
        return `<article class="edital-subject"><div class="edital-subject-head"><div><h2>${esc(subject.name)}</h2><small>${st.covered}/${st.total} tópicos com questões · ${st.studied}/${st.total} já medidos</small></div><strong>${pct}% estudado</strong></div><div class="edital-subject-meter"><span style="width:${pct}%"></span></div><div class="edital-topic-list">${rows}</div></article>`;
      }).join('');
    }).join('');

    view.innerHTML = `<div class="edital-shell">
      <div class="edital-header"><div><span class="edital-kicker">FONTE DE VERDADE • PMBA SOLDADO 2026</span><h1>Seu edital controla toda a mentoria.</h1><p>Questões dos PDFs e futuras buscas na internet só entram se puderem ser vinculadas a um item desta grade.</p></div><span class="edital-seal">EDITAL CORE • V${V}</span></div>
      <div class="edital-overview"><article><span>Matérias</span><strong>${os.subjects}</strong><small>do edital</small></article><article><span>Tópicos</span><strong>${os.topics}</strong><small>grade oficial</small></article><article><span>Com questões</span><strong>${os.covered}</strong><small>já abastecidos</small></article><article><span>Já medidos</span><strong>${os.studied}</strong><small>com respostas</small></article></div>
      ${p ? `<div class="edital-priority"><strong>PRÓXIMO FOCO:</strong><p>${esc(pSubject?.name || '')} → ${esc(p.title)}</p></div>` : ''}
      <div class="edital-source-note">O currículo não será ampliado por conta própria pela IA. Materiais e internet servem para encontrar questões e explicações para os itens listados aqui.</div>
      ${sectionHtml}
    </div>`;
  }

  function injectView() {
    if (!$('[data-view="edital"]')) {
      const main = $('main');
      if (!main) return;
      const s = document.createElement('section');
      s.className = 'view';
      s.dataset.view = 'edital';
      main.appendChild(s);
    }
    const nav = $('.bottom-nav');
    if (nav && !nav.querySelector('[data-go="edital"]')) {
      const old = nav.querySelector('[data-go="mapa"]');
      const b = document.createElement('button');
      b.className = 'nav-item';
      b.dataset.go = 'edital';
      b.innerHTML = '<span>☷</span><small>Edital</small>';
      old ? old.replaceWith(b) : nav.appendChild(b);
    }
  }

  function installEvents() {
    document.addEventListener('click', e => {
      const train = e.target.closest('[data-edital-train]');
      if (train && !train.disabled) {
        e.preventDefault();
        window.mentorBank?.openTopic?.(train.dataset.editalSubject, train.dataset.editalTrain);
      }
    });

    document.addEventListener('click', e => {
      const mentor = e.target.closest('[data-mentor]');
      if (!mentor) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (typeof navigate === 'function') navigate('mentora');
      const labels = {today:'O que devo estudar hoje?',weakness:'Onde estou pior?',pattern:'Que padrão você vê?',advance:'Posso avançar?',review:'O que devo revisar?'};
      addMessage(labels[mentor.dataset.mentor] || 'Analise meu desempenho.', 'user');
      setTimeout(() => {
        addMessage(mentorReply(mentor.dataset.mentor), 'ai');
        const box = $('#chatMessages');
        if (box) box.insertAdjacentHTML('beforeend','<div class="edital-chat-note">Resposta baseada exclusivamente na grade PMBA 2026 + seu histórico real.</div>');
      }, 80);
    }, true);

    window.addEventListener('mentor:attempt-saved', () => setTimeout(refresh, 120));
  }

  async function loadData() {
    db = await getClient();
    const { data:{session} } = await db.auth.getSession();
    user = session?.user || null;
    if (!user) return;

    const [s,t,q,a] = await Promise.all([
      db.from('subjects').select('id,name,position,syllabus_section,source_name').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,position,syllabus_code,source_name').eq('active',true).order('position'),
      db.from('questions').select('id,subject_id,topic_id').limit(5000),
      db.from('question_attempts').select('question_id,subject_id,topic_id,is_correct,response_time_seconds,confidence,answered_at').order('answered_at',{ascending:false}).limit(5000)
    ]);
    if (s.error) throw s.error; if (t.error) throw t.error; if (q.error) throw q.error; if (a.error) throw a.error;
    subjects = s.data || [];
    topics = t.data || [];
    questions = q.data || [];
    attempts = a.data || [];
  }

  async function refresh() {
    try {
      await loadData();
      renderEdital();
      renderHome();
    } catch (e) {
      console.error('Falha ao carregar núcleo do edital:', e);
    }
  }

  async function boot() {
    addAssets();
    injectView();
    installEvents();
    await refresh();
    window.mentorEdital = { refresh, priorityTopic, topicStats };
  }

  boot().catch(console.error);
})();