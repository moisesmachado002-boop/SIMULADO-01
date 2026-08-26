(() => {
  'use strict';

  const VERSION = '7.0';
  let db = null;
  let user = null;
  let currentIntent = 'today';
  let lastAnalysis = null;
  let mounted = false;

  const $ = selector => document.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function context(timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const client = window.mentorCloud?.client;
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        return { db: client, user: session?.user || null };
      }
      await sleep(60);
    }
    return { db: null, user: null };
  }

  function evidenceLabel(level) {
    return ({ low: 'Evidência inicial', medium: 'Evidência moderada', high: 'Evidência forte' })[level] || 'Evidência limitada';
  }

  function intentLabel(intent) {
    return ({ today:'Hoje', weakness:'Fraquezas', pattern:'Padrões', advance:'Avanço', review:'Revisão' })[intent] || 'Análise';
  }

  function inject() {
    if ($('#mentorP7Panel')) { mounted = true; return; }
    const view = $('[data-view="mentora"]');
    if (!view) return;

    view.querySelectorAll('.quick-actions,.prompt-grid').forEach(node => node.classList.add('p7-legacy-actions'));

    const panel = document.createElement('section');
    panel.id = 'mentorP7Panel';
    panel.className = 'p7-shell';
    panel.innerHTML = `
      <div class="p7-commandbar" aria-label="Análises da Mentora">
        <button type="button" data-p7-intent="today" class="active">Hoje</button>
        <button type="button" data-p7-intent="weakness">Fraquezas</button>
        <button type="button" data-p7-intent="pattern">Padrões</button>
        <button type="button" data-p7-intent="advance">Posso avançar?</button>
        <button type="button" data-p7-intent="review">Revisões</button>
      </div>
      <article class="p7-analysis" aria-live="polite">
        <div class="p7-analysis-head">
          <div><span class="eyebrow">MENTORA INTELIGENTE • P7</span><h2 id="p7Headline">Lendo suas evidências…</h2></div>
          <span id="p7Evidence" class="p7-evidence">—</span>
        </div>
        <p id="p7Summary" class="p7-summary">Acertos, erros, confiança, tempo, revisões e cronograma serão analisados em conjunto.</p>
        <div id="p7Reasons" class="p7-reasons"></div>
        <div id="p7Focus" class="p7-focus"></div>
        <div class="p7-next"><strong>Próxima ação</strong><p id="p7NextAction">Aguardando análise.</p></div>
        <div class="p7-actions">
          <button type="button" id="p7Refresh" class="secondary">Atualizar análise</button>
          <button type="button" id="p7Apply" class="primary" disabled>Aplicar prioridade ao cronograma</button>
        </div>
        <p id="p7Message" class="p7-message"></p>
      </article>
      <section class="p7-history">
        <div class="section-heading compact"><div><span class="eyebrow">MEMÓRIA DA MENTORA</span><h2>Análises importantes</h2></div></div>
        <div id="p7HistoryList" class="p7-history-list"><div class="p7-empty">Nenhuma análise registrada ainda.</div></div>
      </section>`;

    const mentorCard = view.querySelector('.mentor-card');
    mentorCard ? mentorCard.insertAdjacentElement('afterend', panel) : view.prepend(panel);

    panel.addEventListener('click', async event => {
      const intent = event.target.closest('[data-p7-intent]');
      if (intent) {
        currentIntent = intent.dataset.p7Intent || 'today';
        panel.querySelectorAll('[data-p7-intent]').forEach(btn => btn.classList.toggle('active', btn === intent));
        await analyze(currentIntent, true);
        return;
      }
      if (event.target.closest('#p7Refresh')) await analyze(currentIntent, false);
      if (event.target.closest('#p7Apply')) await applyPriority();
    });

    mounted = true;
  }

  function loading() {
    const headline = $('#p7Headline');
    const summary = $('#p7Summary');
    const apply = $('#p7Apply');
    if (headline) headline.textContent = 'Analisando seu histórico…';
    if (summary) summary.textContent = 'Cruzando desempenho, confiança, tempo, revisões e plano da P6.';
    if (apply) apply.disabled = true;
    message('');
  }

  function message(text, kind = 'neutral') {
    const node = $('#p7Message');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.kind = kind;
  }

  function render(analysis) {
    lastAnalysis = analysis;
    const headline = $('#p7Headline');
    const summary = $('#p7Summary');
    const evidence = $('#p7Evidence');
    const reasons = $('#p7Reasons');
    const focus = $('#p7Focus');
    const next = $('#p7NextAction');
    const apply = $('#p7Apply');

    if (headline) headline.textContent = analysis.headline || 'Análise atualizada.';
    if (summary) summary.textContent = analysis.summary || analysis.evidence_note || '';
    if (evidence) {
      evidence.textContent = evidenceLabel(analysis.evidence_level);
      evidence.dataset.level = analysis.evidence_level || 'low';
      evidence.title = analysis.evidence_note || '';
    }
    if (reasons) {
      const rows = Array.isArray(analysis.reasons) ? analysis.reasons : [];
      reasons.innerHTML = rows.length ? rows.map(reason => `<div><span>•</span><p>${esc(reason)}</p></div>`).join('') : '<div><p>Ainda não há evidência suficiente para apontar uma causa específica.</p></div>';
    }
    if (focus) {
      const rows = Array.isArray(analysis.focus) ? analysis.focus : [];
      focus.innerHTML = rows.length ? rows.map((item, index) => `
        <article class="p7-focus-card ${index === 0 ? 'primary-focus' : ''}">
          <div><span>${esc(item.syllabus_code || '')}</span><strong>${esc(item.subject || 'Matéria')}</strong></div>
          <h3>${esc(item.title || 'Tópico')}</h3>
          <p>${Number(item.attempts || 0) ? `${Number(item.accuracy || 0)}% em ${Number(item.attempts || 0)} resposta(s)` : 'Ainda sem medição'} · prioridade ${Number(item.priority || 0)}/100</p>
        </article>`).join('') : '<div class="p7-empty">Nenhum tópico abastecido pode ser priorizado agora.</div>';
    }
    if (next) next.textContent = analysis.next_action || 'Continue seguindo a missão atual.';
    if (apply) apply.disabled = !(analysis.recommended_topic_ids?.length && window.MentorScheduleEngine);

    const legacyHeadline = $('#mentorHeadline');
    const legacyAdvice = $('#mentorAdvice');
    if (legacyHeadline) legacyHeadline.textContent = analysis.headline || 'Mentora P7 ativa';
    if (legacyAdvice) legacyAdvice.textContent = analysis.evidence_note || analysis.summary || '';
  }

  async function fallback(intent) {
    if (!db || !user) throw new Error('Faça login para usar a Mentora.');
    const [attemptsR, topicsR, subjectsR, reviewsR] = await Promise.all([
      db.from('question_attempts').select('topic_id,is_correct,response_time_seconds,confidence,answered_at').eq('user_id', user.id).order('answered_at',{ascending:false}).limit(300),
      db.from('topics').select('id,subject_id,title,syllabus_code').eq('active',true),
      db.from('subjects').select('id,name').eq('active',true),
      db.from('reviews').select('topic_id,due_at,status').eq('user_id',user.id).eq('status','pending')
    ]);
    for (const r of [attemptsR,topicsR,subjectsR,reviewsR]) if (r.error) throw r.error;
    const attempts = attemptsR.data || [];
    const subjects = new Map((subjectsR.data || []).map(row => [row.id,row.name]));
    const rows = (topicsR.data || []).map(topic => {
      const list = attempts.filter(a => a.topic_id === topic.id);
      const correct = list.filter(a => a.is_correct).length;
      return { topic_id:topic.id,subject:subjects.get(topic.subject_id)||'Matéria',title:topic.title,syllabus_code:topic.syllabus_code||'',attempts:list.length,accuracy:list.length?Math.round(correct/list.length*100):0,priority:list.length?100-Math.round(correct/list.length*100):25 };
    }).filter(row => row.attempts).sort((a,b)=>b.priority-a.priority);
    const top = rows[0];
    const due = (reviewsR.data || []).filter(row => new Date(row.due_at).getTime() <= Date.now()).length;
    return {
      intent,
      headline: top ? `Prioridade provisória: ${top.subject}.` : 'Ainda preciso de mais respostas.',
      summary: top ? `${top.title}: ${top.accuracy}% em ${top.attempts} resposta(s).` : 'Sem evidência suficiente para escolher uma fraqueza.',
      evidence_level: attempts.length >= 5 ? 'medium' : 'low',
      evidence_note: `Modo local de contingência com ${attempts.length} resposta(s).`,
      reasons: due ? [`${due} revisão(ões) vencidas precisam permanecer no plano.`] : [],
      focus: top ? [top] : [],
      recommended_topic_ids: top ? [top.topic_id] : [],
      next_action: top ? 'Revise o tópico e valide a melhora com novas questões.' : 'Resolva questões para criar evidência.',
      schedule_safe:true
    };
  }

  async function analyze(intent = 'today', persist = false) {
    loading();
    try {
      const ctx = await context();
      db = ctx.db; user = ctx.user;
      if (!db || !user) throw new Error('Entre na sua conta para a Mentora ler o histórico.');
      const { data, error } = await db.functions.invoke('mentor-analyze', { body: { intent, persist } });
      if (error || !data || data.error) throw error || new Error(data?.error || 'Falha na análise.');
      render(data);
      if (persist) await loadHistory();
      return data;
    } catch (error) {
      console.warn('P7: backend analítico indisponível, usando contingência local', error);
      try {
        const local = await fallback(intent);
        render(local);
        message('Análise feita localmente; a memória da Mentora não foi atualizada agora.', 'warn');
        return local;
      } catch (fallbackError) {
        console.error('P7 indisponível:', fallbackError);
        message(fallbackError?.message || 'Não foi possível analisar seu histórico agora.', 'error');
        return null;
      }
    }
  }

  async function ensurePersisted() {
    if (lastAnalysis?.insight_id) return lastAnalysis;
    return analyze(currentIntent, true);
  }

  async function applyPriority() {
    try {
      message('Ajustando o cronograma sem aumentar a carga…');
      const analysis = await ensurePersisted();
      const topicId = analysis?.recommended_topic_ids?.[0];
      if (!topicId) throw new Error('A análise atual ainda não tem um tópico seguro para priorizar.');
      const engine = window.MentorScheduleEngine;
      if (!engine) throw new Error('O cronograma adaptativo ainda não carregou.');
      const ctx = await context(); db = ctx.db; user = ctx.user;
      if (!db || !user) throw new Error('Faça login para ajustar o plano.');

      const plan = await engine.getPlan();
      const candidates = (plan?.items || [])
        .filter(item => ['pending','in_progress'].includes(item.status) && item.task_type === 'questions')
        .sort((a,b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)) || Number(a.priority||50)-Number(b.priority||50));

      const existing = candidates.find(item => item.topic_id === topicId);
      const target = existing || candidates[0];
      if (!target) {
        message('Seu horizonte está ocupado por revisões ou não há tarefa de questões para substituir. Não acrescentei minutos extras.', 'warn');
        return;
      }

      const patch = {
        topic_id: topicId,
        priority: Math.max(95, Number(target.priority || 50)),
        source_reason: `mentora_p7_${currentIntent}`
      };
      const saved = await db.from('study_plan_items').update(patch).eq('id',target.id).eq('user_id',user.id).select('id').single();
      if (saved.error) throw saved.error;

      const updated = await engine.getPlan();
      window.dispatchEvent(new CustomEvent('mentor:plan-updated', { detail: updated }));
      message(existing ? 'Esse tópico já estava no plano e foi elevado à prioridade da Mentora.' : `Prioridade aplicada em ${target.scheduled_for}, substituindo apenas o foco da tarefa e preservando os mesmos minutos.`, 'ok');
      await loadHistory();
    } catch (error) {
      console.error('P7: prioridade não aplicada', error);
      message(error?.message || 'Não foi possível ajustar o cronograma.', 'error');
    }
  }

  async function loadHistory() {
    if (!db || !user) return;
    const result = await db.from('mentor_insights').select('id,insight_type,content,evidence_json,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(6);
    if (result.error) { console.warn('P7: histórico não carregado', result.error); return; }
    const node = $('#p7HistoryList');
    if (!node) return;
    const rows = result.data || [];
    node.innerHTML = rows.length ? rows.map(row => {
      const ev = row.evidence_json || {};
      return `<article class="p7-history-item"><div><strong>${esc(intentLabel(row.insight_type))}</strong><span>${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(row.created_at))}</span></div><p>${esc(row.content)}</p><small>${esc(evidenceLabel(ev.evidence_level))}</small></article>`;
    }).join('') : '<div class="p7-empty">As análises que você pedir serão registradas aqui.</div>';
  }

  async function boot() {
    inject();
    const ctx = await context(); db = ctx.db; user = ctx.user;
    if (db && user) {
      await Promise.all([analyze('today', false), loadHistory()]);
      db.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          user = session?.user || null;
          setTimeout(() => { analyze(currentIntent,false); loadHistory(); }, 120);
        }
      });
    } else {
      message('Entre na sua conta para ativar a Mentora Inteligente.', 'warn');
    }
  }

  window.addEventListener('mentor:attempt-saved', () => setTimeout(() => analyze(currentIntent,false), 250));
  window.MentorEngine = Object.freeze({ version:VERSION, analyze, applyPriority, reloadHistory:loadHistory });
  boot().catch(error => console.error('Falha ao iniciar P7:', error));
})();