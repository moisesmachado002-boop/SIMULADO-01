(() => {
  'use strict';

  const V = '1.8';
  let db = null;
  let user = null;
  let subjects = [];
  let topics = [];
  let components = [];
  let questions = [];
  let attempts = [];

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function setVersion() {
    document.title = 'Mentor IA v1.8 — P1 Edital PMBA 2026';
    $$('.version-badge').forEach(e => e.textContent = 'v1.8');
    $$('.qg-version').forEach(e => e.textContent = 'V1.8');
    const eyebrow = $('[data-view="inicio"] .hero-card .eyebrow');
    if (eyebrow) eyebrow.textContent = 'PMBA 2026 • P1 TAXONOMIA • V1.8';
  }

  function addAssets() {
    if (!$('#editalCoreCss')) {
      const l = document.createElement('link');
      l.id = 'editalCoreCss';
      l.rel = 'stylesheet';
      l.href = './edital-core.css?v=1.8';
      document.head.appendChild(l);
    }
  }

  async function getClient() {
    if (window.mentorCloud?.client) return window.mentorCloud.client;
    throw new Error('Conexão com a nuvem ainda não carregou.');
  }

  const qCount = topicId => questions.filter(q => q.topic_id === topicId).length;
  const topicAttempts = topicId => attempts.filter(a => a.topic_id === topicId);
  const topicComponents = topicId => components.filter(c => c.topic_id === topicId).sort((a,b) => (a.position||0)-(b.position||0));
  const subjectTopics = subjectId => topics.filter(t => t.subject_id === subjectId).sort((a,b) => (a.position||0)-(b.position||0));

  function topicStats(topic) {
    const a = topicAttempts(topic.id);
    const correct = a.filter(x => x.is_correct).length;
    const accuracy = a.length ? Math.round(correct / a.length * 100) : null;
    const highConfidenceErrors = a.filter(x => !x.is_correct && Number(x.confidence) >= 5).length;
    const avgTime = a.length ? Math.round(a.reduce((s,x) => s + Number(x.response_time_seconds || 0), 0) / a.length) : 0;
    return { attempts:a.length, correct, accuracy, highConfidenceErrors, avgTime, questions:qCount(topic.id) };
  }

  function subjectStats(subject) {
    const ts = subjectTopics(subject.id);
    return {
      total: ts.length,
      covered: ts.filter(t => qCount(t.id) > 0).length,
      studied: ts.filter(t => topicAttempts(t.id).length > 0).length
    };
  }

  function overallStats() {
    return {
      subjects: subjects.length,
      topics: topics.length,
      components: components.length,
      covered: topics.filter(t => qCount(t.id) > 0).length,
      studied: topics.filter(t => topicAttempts(t.id).length > 0).length,
      questions: questions.length
    };
  }

  function priorityTopic() {
    const withQuestions = topics.filter(t => qCount(t.id) > 0);
    if (!withQuestions.length) return null;
    const unseen = withQuestions.filter(t => topicAttempts(t.id).length === 0).sort((a,b) => {
      const sa = subjects.find(s => s.id === a.subject_id)?.position || 999;
      const sb = subjects.find(s => s.id === b.subject_id)?.position || 999;
      return sa - sb || (a.position||0) - (b.position||0);
    });
    if (unseen.length) return unseen[0];
    return withQuestions.map(t => ({topic:t,stats:topicStats(t)})).sort((a,b) => {
      const ra = (100-(a.stats.accuracy??0)) + a.stats.highConfidenceErrors*15 + Math.min(20,a.stats.avgTime/6);
      const rb = (100-(b.stats.accuracy??0)) + b.stats.highConfidenceErrors*15 + Math.min(20,b.stats.avgTime/6);
      return rb-ra;
    })[0]?.topic || null;
  }

  function weakestStudiedTopic() {
    const studied = topics.map(t => ({topic:t,stats:topicStats(t)})).filter(x => x.stats.attempts > 0);
    return studied.sort((a,b) => (a.stats.accuracy??0)-(b.stats.accuracy??0) || b.stats.highConfidenceErrors-a.stats.highConfidenceErrors)[0] || null;
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
    if (!p) return `O edital está estruturado em ${os.topics} itens oficiais e ${os.components} subitens explícitos. Ainda preciso abastecer mais tópicos com questões reais.`;
    const ps = topicStats(p);
    const subject = subjects.find(s => s.id === p.subject_id)?.name || 'Matéria';
    if (type === 'today') return !ps.attempts
      ? `Hoje eu começaria por ${subject} → ${p.title}. Esse item já possui ${ps.questions} questão(ões) reais e ainda não foi medido.`
      : `Hoje eu priorizaria ${subject} → ${p.title}. Seu histórico está em ${ps.accuracy}% com ${ps.attempts} tentativa(s).`;
    if (type === 'weakness') {
      if (!weak) return `Ainda não há histórico suficiente. A próxima medição deve ser ${subject} → ${p.title}.`;
      const s = subjects.find(x => x.id === weak.topic.subject_id)?.name || 'Matéria';
      return `Seu ponto mais fraco medido é ${s} → ${weak.topic.title}: ${weak.stats.accuracy}% em ${weak.stats.attempts} tentativa(s).`;
    }
    if (type === 'pattern') {
      const recent = attempts.slice(0,30);
      const high = recent.filter(a => !a.is_correct && Number(a.confidence)>=5).length;
      const slow = recent.filter(a => Number(a.response_time_seconds||0)>=60).length;
      const accuracy = recent.length ? Math.round(recent.filter(a=>a.is_correct).length/recent.length*100) : 0;
      return `Nas últimas ${recent.length} respostas: ${accuracy}% de acertos, ${high} erro(s) com confiança alta e ${slow} resposta(s) acima de 60 segundos.`;
    }
    if (type === 'advance') {
      if (!weak) return 'Ainda não liberaria avanço por domínio: precisamos medir mais itens do edital.';
      return (weak.stats.accuracy??0)>=80 && weak.stats.attempts>=5
        ? `Você pode avançar gradualmente, mantendo revisão de ${weak.topic.title}.`
        : `Ainda não avançaria desse núcleo. ${weak.topic.title} está em ${weak.stats.accuracy}% e precisa de mais consistência.`;
    }
    if (type === 'review') {
      const review = topics.map(t=>({topic:t,stats:topicStats(t)})).filter(x=>x.stats.attempts&&(x.stats.accuracy<75||x.stats.highConfidenceErrors)).sort((a,b)=>(a.stats.accuracy??0)-(b.stats.accuracy??0)).slice(0,3);
      return review.length ? `Sua revisão deve começar por ${review.map(x=>x.topic.title).join('; ')}.` : 'Ainda não há uma fila de revisão forte.';
    }
    return `A base atual tem ${os.topics} tópicos oficiais, ${os.components} subitens de classificação e ${os.questions} questões reais vinculadas.`;
  }

  function renderMission() {
    const p = priorityTopic();
    const title = $('#missionTitle'), subtitle = $('#missionSubtitle'), list = $('#dailyPlan'), progress = $('#missionProgress');
    if (!title || !subtitle || !list || !progress) return;
    if (!p) {
      title.textContent = 'Abastecendo o edital';
      subtitle.textContent = 'A taxonomia oficial está pronta. Agora o banco de questões será ampliado por etapas.';
      progress.textContent = '0/3';
      list.innerHTML = '<div class="empty-history">Nenhuma questão disponível para iniciar a missão.</div>';
      return;
    }
    const s = subjects.find(x=>x.id===p.subject_id)?.name || 'Matéria';
    const st = topicStats(p);
    title.textContent = `Foco: ${s}`;
    subtitle.textContent = `${p.syllabus_code||''} · ${p.title}`;
    progress.textContent = '0/3';
    list.innerHTML = `<div class="edital-mission-step"><span class="edital-mission-num">1</span><div><strong>Revisão do item do edital</strong><small>${esc(p.title)}</small></div><span class="edital-mission-time">15 min</span></div><div class="edital-mission-step"><span class="edital-mission-num">2</span><div><strong>Questões reais</strong><small>${st.questions?'Resolver questões já vinculadas a este tópico.':'Aguardando abastecimento por acervo/internet.'}</small></div><span class="edital-mission-time">25 min</span></div><div class="edital-mission-step"><span class="edital-mission-num">3</span><div><strong>Revisão ativa</strong><small>Revisar erros e marcar o tópico para nova checagem.</small></div><span class="edital-mission-time">15 min</span></div>`;
  }

  function renderHome() {
    const os = overallStats();
    const p = priorityTopic();
    const hero = $('#heroText'), headline = $('#mentorHeadline'), advice = $('#mentorAdvice');
    if (hero) hero.textContent = `PMBA Soldado 2026 é a grade oficial: ${os.subjects} matérias, ${os.topics} tópicos e ${os.components} subitens explícitos para classificar questões.`;
    if (headline) headline.textContent = p ? `Próximo foco do edital: ${subjects.find(s=>s.id===p.subject_id)?.name||''}.` : 'Edital estruturado. Próxima etapa: banco de questões.';
    if (advice) advice.textContent = p ? p.title : `${os.covered}/${os.topics} tópico(s) já possuem questões vinculadas.`;
    renderMission();
  }

  function componentsHtml(topic) {
    const cs = topicComponents(topic.id);
    if (!cs.length) return '';
    return `<details class="edital-components"><summary>${cs.length} subitem(ns) explícito(s)</summary><div>${cs.map(c=>`<span>${esc(c.label)}</span>`).join('')}</div></details>`;
  }

  function renderEdital() {
    const view = $('[data-view="edital"]');
    if (!view) return;
    const os = overallStats();
    const p = priorityTopic();
    const pSubject = p ? subjects.find(s=>s.id===p.subject_id) : null;
    const sections = ['Conhecimentos Gerais','Conhecimentos Específicos'];
    const body = sections.map(section => {
      const ss = subjects.filter(s=>s.syllabus_section===section).sort((a,b)=>(a.position||0)-(b.position||0));
      return `<div class="edital-section-title">${esc(section)}</div>` + ss.map(subject => {
        const st = subjectStats(subject);
        const pct = st.total ? Math.round(st.studied/st.total*100) : 0;
        const rows = subjectTopics(subject.id).map(topic => {
          const ts = topicStats(topic);
          const state = ts.attempts ? (ts.accuracy>=80?'studied':ts.accuracy<60?'review':'studied') : ts.questions?'covered':'';
          const statusText = ts.attempts ? `${ts.accuracy}% · ${ts.attempts} resp.` : ts.questions ? `${ts.questions} questão(ões)` : 'sem questões';
          return `<div class="edital-topic"><span class="edital-code">${esc(topic.syllabus_code||'')}<small>p.${esc(topic.source_page||'—')}</small></span><span class="edital-topic-title">${esc(topic.title)}</span><div class="edital-topic-meta"><span class="edital-pill ${state}">${esc(statusText)}</span><button class="edital-train" data-edital-train="${topic.id}" data-edital-subject="${subject.id}" ${ts.questions?'':'disabled'}>${ts.questions?'Treinar':'Aguardando'}</button></div>${componentsHtml(topic)}</div>`;
        }).join('');
        return `<article class="edital-subject"><div class="edital-subject-head"><div><h2>${esc(subject.name)}</h2><small>p.${esc(subject.source_page||'—')} · ${st.covered}/${st.total} tópicos com questões · ${st.studied}/${st.total} medidos</small></div><strong>${pct}% estudado</strong></div><div class="edital-subject-meter"><span style="width:${pct}%"></span></div><div class="edital-topic-list">${rows}</div></article>`;
      }).join('');
    }).join('');

    view.innerHTML = `<div class="edital-shell"><div class="edital-header"><div><span class="edital-kicker">P1 CONCLUÍDA • FONTE DE VERDADE • PMBA SOLDADO 2026</span><h1>Seu edital controla toda a mentoria.</h1><p>Os 99 itens oficiais permanecem intactos. Os subitens servem para classificar as questões com mais precisão sem alterar o currículo.</p></div><span class="edital-seal">P1 TAXONOMIA • V${V}</span></div><div class="edital-overview"><article><span>Matérias</span><strong>${os.subjects}</strong><small>do edital</small></article><article><span>Tópicos</span><strong>${os.topics}</strong><small>grade oficial</small></article><article><span>Subitens</span><strong>${os.components}</strong><small>classificação fina</small></article><article><span>Com questões</span><strong>${os.covered}</strong><small>já abastecidos</small></article></div>${p?`<div class="edital-priority"><strong>PRÓXIMO FOCO:</strong><p>${esc(pSubject?.name||'')} → ${esc(p.title)}</p></div>`:''}<div class="edital-source-note">Cada tópico agora carrega código oficial, ordem, página de origem e subitens explícitos. Nomes equivalentes ficam no banco para ajudar a IA a classificar questões futuras.</div>${body}</div>`;
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
      addMessage(labels[mentor.dataset.mentor]||'Analise meu desempenho.','user');
      setTimeout(()=>{ addMessage(mentorReply(mentor.dataset.mentor),'ai'); const box=$('#chatMessages'); if(box) box.insertAdjacentHTML('beforeend','<div class="edital-chat-note">Resposta baseada na grade PMBA 2026 + seu histórico real.</div>'); },80);
    },true);
    window.addEventListener('mentor:attempt-saved',()=>setTimeout(refresh,120));
  }

  async function loadData() {
    db = await getClient();
    const {data:{session}} = await db.auth.getSession();
    user = session?.user || null;
    if (!user) { subjects=[]; topics=[]; components=[]; questions=[]; attempts=[]; return; }
    const [s,t,c,q,a] = await Promise.all([
      db.from('subjects').select('id,name,position,syllabus_section,source_name,source_page').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,position,syllabus_code,source_name,source_page').eq('active',true).order('position'),
      db.from('topic_components').select('id,topic_id,label,position,source_kind').order('position'),
      db.from('questions').select('id,subject_id,topic_id').limit(5000),
      db.from('question_attempts').select('question_id,subject_id,topic_id,is_correct,response_time_seconds,confidence,answered_at').order('answered_at',{ascending:false}).limit(5000)
    ]);
    if (s.error) throw s.error; if (t.error) throw t.error; if (c.error) throw c.error; if (q.error) throw q.error; if (a.error) throw a.error;
    subjects=s.data||[]; topics=t.data||[]; components=c.data||[]; questions=q.data||[]; attempts=a.data||[];
  }

  async function refresh() {
    try { await loadData(); setVersion(); renderEdital(); renderHome(); }
    catch(e) { console.error('Falha ao carregar núcleo do edital:',e); }
  }

  async function boot() {
    addAssets();
    injectView();
    installEvents();
    await refresh();
    db = db || await getClient();
    db.auth.onAuthStateChange((event)=>{ if(event==='SIGNED_IN'||event==='SIGNED_OUT') setTimeout(refresh,100); });
    window.mentorEdital = { refresh, priorityTopic, topicStats, topicComponents, version:V };
  }

  boot().catch(console.error);
})();