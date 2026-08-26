(() => {
  'use strict';

  const V = '1.7';
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
  let sessionCorrect = 0;
  let sessionAnswered = 0;

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function loadAssets() {
    if (!$('#mentorQgTheme')) {
      const l = document.createElement('link');
      l.id = 'mentorQgTheme';
      l.rel = 'stylesheet';
      l.href = './qg-theme.css?v=1.7';
      document.head.appendChild(l);
    }
    if (!$('#mentorEditalCore')) {
      const s = document.createElement('script');
      s.id = 'mentorEditalCore';
      s.src = './edital-core.js?v=1.7';
      s.defer = true;
      document.body.appendChild(s);
    }
  }

  function setVersion() {
    document.title = 'Mentor IA v1.7 — Edital PMBA 2026';
    $$('.version-badge').forEach(e => e.textContent = 'v1.7');
    const eyebrow = $('[data-view="inicio"] .hero-card .eyebrow');
    if (eyebrow) eyebrow.textContent = 'PMBA 2026 • EDITAL CORE • V1.7';
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
          <p>O edital define o assunto. Seus PDFs e, depois, a internet fornecem questões reais para esse assunto.</p>
        </div>
        <span class="qg-version">V${V}</span>
      </div>

      <div class="bank-stats">
        <article><span>Questões</span><strong id="bankTotal">—</strong><small>no filtro atual</small></article>
        <article><span>Novas</span><strong id="bankNew">—</strong><small>ainda não vistas</small></article>
        <article><span>Operação</span><strong id="bankSession">0/0</strong><small>acertos / respostas</small></article>
      </div>

      <article class="bank-filter-card qg-panel">
        <div class="qg-panel-title">FILTRO PELO EDITAL</div>
        <div class="bank-filter-grid">
          <label>Matéria<select id="bankSubject"><option value="">Todas do edital</option></select></label>
          <label>Assunto<select id="bankTopic"><option value="">Todos do edital</option></select></label>
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
      const b = document.createElement('button');
      b.className = 'nav-item';
      b.dataset.go = 'acervo';
      b.innerHTML = '<span>▣</span><small>Questões</small>';
      const old = nav.querySelector('[data-go="diagnostico"]');
      old ? old.replaceWith(b) : nav.prepend(b);
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
      const conf = event.target.closest('[data-bank-confidence]');
      if (conf && !answered) {
        confidence = conf.dataset.bankConfidence;
        $$('[data-bank-confidence]').forEach(x => x.classList.toggle('active', x === conf));
        return;
      }
      const eliminate = event.target.closest('[data-bank-eliminate]');
      if (eliminate && !answered) {
        event.stopPropagation();
        toggleEliminate(eliminate.dataset.bankEliminate);
        return;
      }
      const answer = event.target.closest('[data-bank-answer]');
      if (answer && !answered) selectAnswer(answer.dataset.bankAnswer);
    });
  }

  function status(text, kind='neutral') {
    const el = $('#bankStatus');
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind;
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
      status('Entre na sua conta para acessar a grade PMBA 2026 e seu banco privado.', 'warn');
      updateCounts();
      return;
    }

    status('Carregando edital PMBA 2026 e questões…', 'loading');
    const [s,t,q] = await Promise.all([
      db.from('subjects').select('id,name,position,syllabus_section').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,position,syllabus_code').eq('active',true).order('position'),
      db.from('questions').select('id,exam_name,subject_id,topic_id,subject_label,topic_label,source_question_number,statement,alternatives,correct_answer,explanation,source_kind').not('explanation','is',null).order('created_at',{ascending:true}).limit(5000)
    ]);
    if (s.error) throw s.error;
    if (t.error) throw t.error;
    if (q.error) throw q.error;
    syllabusSubjects = s.data || [];
    syllabusTopics = t.data || [];
    bank = q.data || [];

    states = new Map();
    const ids = bank.map(x => x.id);
    if (ids.length) {
      const r = await db.from('user_question_state').select('question_id,seen_count,correct_count,wrong_count,last_seen_at,next_review_at,status').in('question_id', ids);
      if (r.error) throw r.error;
      (r.data || []).forEach(x => states.set(x.question_id, x));
    }

    renderSubjectOptions();
    renderTopicOptions();
    updateCounts();
    const covered = new Set(bank.map(q => q.topic_id).filter(Boolean)).size;
    status(`Edital carregado: ${syllabusSubjects.length} matérias, ${syllabusTopics.length} tópicos. ${covered} tópico(s) já têm questões.`, 'ok');
    if ($('#bankHomeText')) $('#bankHomeText').textContent = `${syllabusTopics.length} tópicos oficiais carregados; ${covered} já têm questões reais no banco.`;
  }

  function renderSubjectOptions() {
    const e = $('#bankSubject');
    if (!e) return;
    const old = e.value;
    e.innerHTML = '<option value="">Todas do edital</option>' + syllabusSubjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    if (syllabusSubjects.some(s => s.id === old)) e.value = old;
  }

  function renderTopicOptions() {
    const subjectId = $('#bankSubject')?.value || '';
    const e = $('#bankTopic');
    if (!e) return;
    const old = e.value;
    const items = syllabusTopics.filter(t => !subjectId || t.subject_id === subjectId).sort((a,b) => (a.position||0)-(b.position||0));
    e.innerHTML = '<option value="">Todos do edital</option>' + items.map(t => {
      const count = bank.filter(q => q.topic_id === t.id).length;
      return `<option value="${t.id}">${esc(t.syllabus_code || '')} — ${esc(t.title)}${count ? ` (${count})` : ' (0)'}</option>`;
    }).join('');
    if (items.some(t => t.id === old)) e.value = old;
  }

  function filteredBank() {
    const subjectId = $('#bankSubject')?.value || '';
    const topicId = $('#bankTopic')?.value || '';
    return bank.filter(q => (!subjectId || q.subject_id === subjectId) && (!topicId || q.topic_id === topicId));
  }

  function selectedTopic() {
    const id = $('#bankTopic')?.value || '';
    return syllabusTopics.find(t => t.id === id) || null;
  }

  function updateCounts() {
    const items = filteredBank();
    const fresh = items.filter(q => !states.has(q.id) || !(states.get(q.id)?.seen_count)).length;
    if ($('#bankTotal')) $('#bankTotal').textContent = items.length;
    if ($('#bankNew')) $('#bankNew').textContent = fresh;
    if ($('#bankSession')) $('#bankSession').textContent = `${sessionCorrect}/${sessionAnswered}`;

    const topic = selectedTopic();
    if (topic && items.length === 0) status(`Este item está no edital (${topic.syllabus_code || ''}), mas ainda não tem questões no banco. Ele fica na fila de abastecimento por PDF/internet.`, 'warn');
  }

  function chooseQuestion() {
    const items = filteredBank();
    if (!items.length) return null;
    const now = Date.now();
    const unseen = items.filter(q => !states.has(q.id) || !states.get(q.id)?.seen_count);
    const due = items.filter(q => {
      const s = states.get(q.id);
      return s?.next_review_at && new Date(s.next_review_at).getTime() <= now;
    });
    const pool = unseen.length ? unseen : due.length ? due : [...items].sort((a,b) => (states.get(a.id)?.seen_count||0) - (states.get(b.id)?.seen_count||0));
    const minSeen = Math.min(...pool.map(q => states.get(q.id)?.seen_count || 0));
    const least = pool.filter(q => (states.get(q.id)?.seen_count || 0) === minSeen);
    return least[Math.floor(Math.random() * least.length)] || pool[0];
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
      const t = selectedTopic();
      status(t ? `Sem questões ainda para ${t.syllabus_code || ''} — ${t.title}.` : 'Nenhuma questão encontrada nesse filtro.', 'warn');
      return;
    }
    $('#bankOperational')?.classList.remove('hidden');
    showQuestion(current);
  }

  function questionBadge(q) {
    const s = states.get(q.id);
    if (!s || !s.seen_count) return ['NOVA','badge-novo'];
    if (s.status === 'mastered') return ['DOMINADA','badge-acerto'];
    if (s.status === 'review' || s.wrong_count > 0) return ['REVISÃO','badge-erro'];
    return ['APRENDENDO','badge-learning'];
  }

  function showQuestion(q) {
    current = q;
    answered = false;
    choice = null;
    eliminated = new Set();
    startedAt = Date.now();
    confidence = 'medium';
    $$('[data-bank-confidence]').forEach(b => { b.disabled = false; b.classList.toggle('active', b.dataset.bankConfidence === 'medium'); });
    $('#bankFeedback')?.classList.add('hidden');
    $('#bankConfirmBtn')?.classList.add('hidden');
    $('#bankNextBtn')?.classList.add('hidden');

    const [label, cls] = questionBadge(q);
    const badge = $('#bankQuestionStatus');
    if (badge) { badge.textContent = label; badge.className = `qg-status-badge ${cls}`; }
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
    if (answered || eliminated.has(letter)) return;
    choice = letter;
    $$('[data-option-wrapper]').forEach(w => w.classList.toggle('selected', w.dataset.optionWrapper === letter));
    $('#bankConfirmBtn')?.classList.remove('hidden');
  }

  function toggleEliminate(letter) {
    if (answered) return;
    const wrapper = [...$$('[data-option-wrapper]')].find(x => x.dataset.optionWrapper === letter);
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
    const e = $('#bankTimer');
    if (!e || !startedAt || answered) return;
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    e.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
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

  async function confirmAnswer() {
    if (!current || answered || !choice) return;
    answered = true;
    clearInterval(window.__mentorBankTimer);
    const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const right = String(current.correct_answer).toUpperCase();
    const selected = String(choice).toUpperCase();
    const correct = selected === right;
    sessionAnswered += 1;
    if (correct) sessionCorrect += 1;

    $$('[data-option-wrapper]').forEach(w => {
      const letter = w.dataset.optionWrapper;
      w.classList.remove('selected','eliminated');
      if (letter === right) w.classList.add('correct');
      if (letter === selected && !correct) w.classList.add('wrong');
      w.querySelectorAll('button').forEach(b => b.disabled = true);
    });
    $$('[data-bank-confidence]').forEach(b => b.disabled = true);
    $('#bankConfirmBtn')?.classList.add('hidden');
    $('#bankNextBtn')?.classList.remove('hidden');

    const f = $('#bankFeedback');
    f.className = `qg-comment-box ${correct ? 'good' : 'bad'}`;
    f.innerHTML = `<div class="qg-feedback-result">${correct ? '✅ ALVO CONFIRMADO — ACERTO' : `❌ RESPOSTA INCORRETA — GABARITO ${esc(right)}`}</div><div class="qg-analysis-title">💡 EXPLICAÇÃO + LEITURA DA MENTORA</div><p>${esc(current.explanation || 'Explicação em preparação.')}</p><div class="qg-mentor-signal">${esc(mentorSignal(correct, secs))}</div><small>Tempo: ${secs}s • Confiança: ${confidence === 'high' ? 'alta' : confidence === 'low' ? 'baixa' : 'média'}${eliminated.size ? ` • ${eliminated.size} alternativa(s) eliminada(s)` : ''}</small>`;
    $('#bankProgress').textContent = `${sessionCorrect}/${sessionAnswered} acertos nesta operação`;
    updateCounts();

    try {
      await saveAttempt(selected, correct, secs);
      mirrorToLegacyState(correct, secs);
      window.dispatchEvent(new CustomEvent('mentor:attempt-saved', { detail:{ questionId:current.id, topicId:current.topic_id, correct } }));
    } catch (e) {
      console.error('Falha ao salvar tentativa:', e);
      f.insertAdjacentHTML('beforeend','<small class="qg-save-warning">⚠ A correção foi exibida, mas houve falha ao salvar esta tentativa na nuvem.</small>');
    }
  }

  function nextReviewIso(correct, correctCount) {
    const d = new Date();
    d.setDate(d.getDate() + (correct ? (correctCount >= 2 ? 14 : 7) : 1));
    return d.toISOString();
  }

  async function saveAttempt(selected, correct, secs) {
    const { data:{session} } = await db.auth.getSession();
    user = session?.user || null;
    if (!user) throw new Error('Sessão encerrada.');

    const now = new Date().toISOString();
    const attempt = {
      user_id: user.id,
      question_id: current.id,
      subject_id: current.subject_id || null,
      topic_id: current.topic_id || null,
      answered_at: now,
      is_correct: correct,
      selected_answer: selected,
      correct_answer_snapshot: current.correct_answer,
      response_time_seconds: secs,
      confidence: confidenceNumber(),
      source_kind: current.source_kind || 'personal_module'
    };
    const { error: attemptError } = await db.from('question_attempts').insert(attempt);
    if (attemptError) throw attemptError;

    const old = states.get(current.id) || { seen_count:0, correct_count:0, wrong_count:0 };
    const nextCorrect = (old.correct_count || 0) + (correct ? 1 : 0);
    const nextWrong = (old.wrong_count || 0) + (correct ? 0 : 1);
    const nextSeen = (old.seen_count || 0) + 1;
    const nextReview = nextReviewIso(correct, nextCorrect);
    const row = {
      user_id:user.id,
      question_id:current.id,
      seen_count:nextSeen,
      correct_count:nextCorrect,
      wrong_count:nextWrong,
      last_seen_at:now,
      next_review_at:nextReview,
      status:correct ? (nextCorrect >= 2 ? 'mastered' : 'learning') : 'review',
      updated_at:now
    };
    const { error: stateError } = await db.from('user_question_state').upsert(row, { onConflict:'user_id,question_id' });
    if (stateError) throw stateError;
    states.set(current.id, row);

    if (current.topic_id) {
      const previous = await db.from('topic_mastery').select('attempts_count,correct_count').eq('user_id',user.id).eq('topic_id',current.topic_id).maybeSingle();
      if (previous.error) throw previous.error;
      const attemptsCount = Number(previous.data?.attempts_count || 0) + 1;
      const correctCount = Number(previous.data?.correct_count || 0) + (correct ? 1 : 0);
      const mastery = Math.round((correctCount / attemptsCount) * 100);
      const confidenceScore = Math.min(100, Math.round((attemptsCount / 8) * 100));
      const masteryRow = {
        user_id:user.id,
        topic_id:current.topic_id,
        mastery_score:mastery,
        confidence_score:confidenceScore,
        attempts_count:attemptsCount,
        correct_count:correctCount,
        last_attempt_at:now,
        next_review_at:nextReview,
        trend: correct ? 'up' : 'down',
        updated_at:now
      };
      const { error: masteryError } = await db.from('topic_mastery').upsert(masteryRow, { onConflict:'user_id,topic_id' });
      if (masteryError) throw masteryError;
    }
    updateCounts();
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
    } catch (e) {
      console.warn('Tentativa ficou salva no Supabase, mas não foi espelhada no mapa legado:', e);
    }
  }

  function nextQuestion() {
    const q = chooseQuestion();
    if (!q) {
      status('Você concluiu as questões disponíveis neste filtro. O item continua no edital e pode entrar em revisão ou ser abastecido com novas questões.', 'ok');
      return;
    }
    showQuestion(q);
  }

  async function openTopic(subjectId, topicId) {
    if (!syllabusSubjects.length) await loadData();
    if (typeof navigate === 'function') navigate('acervo');
    const s = $('#bankSubject');
    const t = $('#bankTopic');
    if (s) s.value = subjectId || '';
    renderTopicOptions();
    if (t) t.value = topicId || '';
    updateCounts();
    await begin();
  }

  async function boot() {
    injectUI();
    loadAssets();
    setVersion();
    window.mentorBank = { openTopic, reload:loadData };
    try {
      db = await getClient();
      await loadData();
      db.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => loadData().catch(console.error), 80);
      });
    } catch (e) {
      console.error('Banco de questões indisponível:', e);
      status('Não foi possível conectar ao banco agora.', 'error');
    }
  }

  boot();
})();