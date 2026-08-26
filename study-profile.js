(() => {
  'use strict';

  const VERSION = '6.0';
  let currentPlan = null;
  let bootRegenerated = false;

  const $ = selector => document.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function addStyle() {
    if ($('#mentorP6Style')) return;
    const style = document.createElement('style');
    style.id = 'mentorP6Style';
    style.textContent = `
      .p6-legacy-hidden{display:none!important}.p6-shell{margin:16px 0;padding:18px;border:1px solid rgba(148,163,184,.18);border-radius:22px;background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(10,16,31,.96));box-shadow:0 18px 50px rgba(0,0,0,.16)}
      .p6-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.p6-head h2{margin:4px 0 6px;font-size:1.35rem}.p6-head p{margin:0;color:#94a3b8;max-width:760px}.p6-version{font:700 .72rem/1 monospace;padding:8px 10px;border-radius:999px;background:rgba(59,130,246,.12);color:#93c5fd}
      .p6-today-actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.p6-today-actions button,.p6-task button,.p6-save{border:0;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer;background:#1e293b;color:#e2e8f0}.p6-today-actions button:hover,.p6-task button:hover{filter:brightness(1.12)}.p6-today-actions [data-p6-mode="low_time"]{background:#3f3f46}.p6-today-actions [data-p6-mode="extra"]{background:#164e63}.p6-today-actions [data-p6-mode="rest"]{background:#4c1d1d}.p6-today-actions [data-p6-mode="normal"]{background:#1e3a5f}
      .p6-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0 16px}.p6-summary article{padding:12px;border-radius:16px;background:rgba(30,41,59,.65)}.p6-summary span,.p6-summary small{display:block;color:#94a3b8;font-size:.75rem}.p6-summary strong{display:block;font-size:1.35rem;margin:3px 0;color:#f8fafc}
      .p6-tasks{display:grid;gap:9px}.p6-task{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px;border-radius:15px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.12)}.p6-task.done{opacity:.65}.p6-task-main{min-width:0}.p6-task-main strong{display:block;color:#f8fafc}.p6-task-main span,.p6-task-main small{display:block;color:#94a3b8;margin-top:3px}.p6-task-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.p6-task-actions .start{background:#1d4ed8}.p6-task-actions .done{background:#166534}.p6-badge{display:inline-block!important;width:max-content;padding:3px 7px;border-radius:999px;background:rgba(245,158,11,.14);color:#fcd34d!important;font-size:.66rem!important;font-weight:800}
      .p6-week{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:8px;overflow-x:auto;padding-bottom:4px;margin-top:16px}.p6-day{min-width:120px;padding:11px;border-radius:14px;background:rgba(30,41,59,.55)}.p6-day.today{outline:1px solid rgba(96,165,250,.65)}.p6-day strong,.p6-day span,.p6-day small{display:block}.p6-day span{font-size:.75rem;color:#94a3b8;margin-top:4px}.p6-day small{color:#64748b;margin-top:5px}.p6-bar{height:5px;background:#0f172a;border-radius:999px;overflow:hidden;margin-top:8px}.p6-bar i{display:block;height:100%;background:#60a5fa;border-radius:inherit}
      .p6-settings{margin-top:16px;border-top:1px solid rgba(148,163,184,.14);padding-top:12px}.p6-settings summary{cursor:pointer;font-weight:800;color:#cbd5e1}.p6-settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.p6-settings label{font-size:.75rem;color:#94a3b8}.p6-settings input[type="number"]{width:100%;box-sizing:border-box;margin-top:5px;border:1px solid #334155;background:#0f172a;color:#f8fafc;border-radius:10px;padding:10px}.p6-days{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}.p6-day-check{display:flex!important;align-items:center;gap:5px;padding:7px 9px;border-radius:10px;background:#111827;color:#cbd5e1!important}.p6-save{margin-top:12px;background:#1d4ed8}.p6-message{min-height:18px;margin-top:9px;color:#94a3b8;font-size:.78rem}.p6-empty{padding:18px;text-align:center;border:1px dashed #334155;border-radius:14px;color:#94a3b8}
      @media(max-width:760px){.p6-summary{grid-template-columns:repeat(2,1fr)}.p6-settings-grid{grid-template-columns:1fr}.p6-task{align-items:flex-start;flex-direction:column}.p6-task-actions{justify-content:flex-start}.p6-head{flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  async function waitForEngine(timeoutMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.MentorScheduleEngine) return window.MentorScheduleEngine;
      await sleep(60);
    }
    return null;
  }

  function inject() {
    if ($('#mentorP6Panel')) return;
    const legacy = $('.mission-card');
    if (!legacy) return;
    legacy.classList.add('p6-legacy-hidden');
    const panel = document.createElement('section');
    panel.id = 'mentorP6Panel';
    panel.className = 'p6-shell';
    panel.innerHTML = `
      <div class="p6-head"><div><span class="eyebrow">P6 • CRONOGRAMA ADAPTATIVO</span><h2>Missão de hoje + próximos 7 dias</h2><p>Revisões e estudo novo disputam o mesmo limite diário. Se o dia apertar, a fila é redistribuída sem avalanche.</p></div><span class="p6-version">V${VERSION}</span></div>
      <div class="p6-today-actions">
        <button type="button" data-p6-mode="low_time">HOJE ESTOU SEM TEMPO</button>
        <button type="button" data-p6-mode="extra">QUERO ESTUDAR MAIS HOJE</button>
        <button type="button" data-p6-mode="rest">FOLGAR HOJE</button>
        <button type="button" data-p6-mode="normal">NORMALIZAR HOJE</button>
      </div>
      <div id="p6Summary" class="p6-summary"></div>
      <div id="p6TodayTasks" class="p6-tasks"><div class="p6-empty">Carregando missão…</div></div>
      <div id="p6Week" class="p6-week"></div>
      <details class="p6-settings"><summary>Configurar tempo e dias de estudo</summary>
        <div class="p6-settings-grid">
          <label>Minutos por dia<input id="p6DailyMinutes" type="number" min="20" max="480" step="10"></label>
          <label>Reserva / buffer (%)<input id="p6Buffer" type="number" min="0" max="40" step="5"></label>
          <label>Fatia inicial para revisões (%)<input id="p6ReviewRatio" type="number" min="20" max="80" step="5"></label>
          <div class="p6-days" id="p6Days"></div>
        </div>
        <button class="p6-save" type="button" id="p6SaveSettings">SALVAR CRONOGRAMA</button>
      </details>
      <div id="p6Message" class="p6-message"></div>`;
    legacy.insertAdjacentElement('afterend', panel);

    panel.addEventListener('click', async event => {
      const mode = event.target.closest('[data-p6-mode]');
      if (mode) return handleMode(mode.dataset.p6Mode);
      const complete = event.target.closest('[data-p6-complete]');
      if (complete) return completeTask(complete.dataset.p6Complete);
      const start = event.target.closest('[data-p6-start]');
      if (start) return startTask(start.dataset.p6Start);
    });
    $('#p6SaveSettings')?.addEventListener('click', saveSettings);
  }

  function message(text) {
    const node = $('#p6Message');
    if (node) node.textContent = text || '';
  }

  function hardCapFor(key, prefs, overrides) {
    const date = new Date(`${key}T12:00:00`);
    const weekday = date.getDay() === 0 ? 7 : date.getDay();
    const regular = (prefs.study_days || []).map(Number).includes(weekday);
    let hard = regular ? Number(prefs.daily_minutes || 0) : 0;
    const override = (overrides || []).find(row => row.study_date === key);
    if (override) {
      if (override.mode === 'rest') hard = 0;
      else if (override.minutes_override != null) hard = Number(override.minutes_override);
    }
    return Math.max(0, hard);
  }

  function dayLabel(key, index) {
    if (index === 0) return 'Hoje';
    const date = new Date(`${key}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit' }).format(date).replace('.', '');
  }

  function activeItemsForDay(key) {
    return (currentPlan?.items || []).filter(item => item.scheduled_for === key && item.status !== 'skipped');
  }

  function render(plan) {
    currentPlan = plan;
    if (!plan) {
      $('#p6TodayTasks').innerHTML = '<div class="p6-empty">Entre na sua conta para ativar o cronograma adaptativo.</div>';
      $('#p6Summary').innerHTML = '';
      $('#p6Week').innerHTML = '';
      return;
    }

    const prefs = plan.preferences;
    const today = plan.start;
    const todayItems = activeItemsForDay(today);
    const completed = todayItems.filter(item => item.status === 'completed');
    const allocated = todayItems.reduce((sum,item) => sum + Number(item.duration_minutes || 0), 0);
    const completedMinutes = completed.reduce((sum,item) => sum + Number(item.duration_minutes || 0), 0);
    const reviews = todayItems.filter(item => item.task_type === 'review' && item.status !== 'completed').length;
    const hardCap = hardCapFor(today, prefs, plan.overrides);

    $('#p6Summary').innerHTML = `
      <article><span>Limite de hoje</span><strong>${hardCap} min</strong><small>teto duro</small></article>
      <article><span>Planejado</span><strong>${allocated} min</strong><small>inclui revisões</small></article>
      <article><span>Concluído</span><strong>${completedMinutes} min</strong><small>${completed.length}/${todayItems.length} tarefas</small></article>
      <article><span>Revisões hoje</span><strong>${reviews}</strong><small>competem com o tempo novo</small></article>`;

    if (!todayItems.length) {
      $('#p6TodayTasks').innerHTML = hardCap === 0
        ? '<div class="p6-empty">Hoje está marcado como descanso. A fila será redistribuída dentro dos próximos dias disponíveis.</div>'
        : '<div class="p6-empty">Nenhuma tarefa elegível agora. A plataforma preservou seu limite em vez de reciclar questões antes da hora.</div>';
    } else {
      $('#p6TodayTasks').innerHTML = todayItems.map(item => {
        const done = item.status === 'completed';
        const progress = Math.min(Number(item.progress_count || 0), Number(item.question_target || 0));
        const title = item.task_type === 'review' ? `Revisar ${item.topic_title}` : `${item.topic_title}`;
        const action = item.task_type === 'review' ? 'REVISÃO' : 'QUESTÕES NOVAS';
        const targetText = item.question_target ? `${progress}/${item.question_target} questão(ões)` : `${item.duration_minutes} min`;
        const moved = item.displaced_from ? '<span class="p6-badge">REAGENDADO</span>' : '';
        return `<article class="p6-task ${done ? 'done' : ''}" data-plan-item="${esc(item.id)}">
          <div class="p6-task-main">${moved}<strong>${esc(item.subject_name)} • ${esc(title)}</strong><span>${action} • ${esc(targetText)} • ${item.duration_minutes || 0} min</span><small>${esc(item.topic_code || '')}${item.source_reason === 'revisao_vencida' ? ' • revisão vencida' : ''}</small></div>
          <div class="p6-task-actions">${done ? '<strong>✓ CONCLUÍDA</strong>' : `<button class="start" data-p6-start="${esc(item.id)}">ABRIR</button><button class="done" data-p6-complete="${esc(item.id)}">CONCLUIR</button>`}</div>
        </article>`;
      }).join('');
    }

    const startDate = new Date(`${plan.start}T12:00:00`);
    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(startDate.getTime());
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const items = activeItemsForDay(key);
      const minutes = items.reduce((sum,item) => sum + Number(item.duration_minutes || 0), 0);
      const cap = hardCapFor(key, prefs, plan.overrides);
      const reviewCount = items.filter(item => item.task_type === 'review').length;
      const pct = cap ? Math.min(100, Math.round(minutes / cap * 100)) : 0;
      days.push(`<article class="p6-day ${i === 0 ? 'today' : ''}"><strong>${esc(dayLabel(key,i))}</strong><span>${minutes}/${cap} min</span><small>${items.length} tarefa(s) • ${reviewCount} revisão(ões)</small><div class="p6-bar"><i style="width:${pct}%"></i></div></article>`);
    }
    $('#p6Week').innerHTML = days.join('');
    renderSettings(prefs);
  }

  function renderSettings(prefs) {
    if (!prefs) return;
    $('#p6DailyMinutes').value = prefs.daily_minutes;
    $('#p6Buffer').value = prefs.buffer_percent;
    $('#p6ReviewRatio').value = prefs.review_ratio;
    const names = [['S',1],['T',2],['Q',3],['Q',4],['S',5],['S',6],['D',7]];
    $('#p6Days').innerHTML = names.map(([name,day]) => `<label class="p6-day-check"><input type="checkbox" data-p6-day="${day}" ${(prefs.study_days || []).map(Number).includes(day) ? 'checked' : ''}>${name}</label>`).join('');
  }

  async function refresh(forceRegenerate = false) {
    const engine = await waitForEngine();
    if (!engine) return;
    try {
      let plan = await engine.getPlan();
      if (plan && (forceRegenerate || (!bootRegenerated && !(plan.items || []).length))) {
        bootRegenerated = true;
        plan = await engine.regenerate();
      }
      render(plan);
    } catch (error) {
      console.error('P6: falha ao carregar cronograma', error);
      message('Não foi possível carregar o cronograma agora.');
    }
  }

  async function handleMode(mode) {
    const engine = await waitForEngine();
    if (!engine) return;
    message('Recalculando os próximos 7 dias…');
    try {
      const plan = await engine.setTodayMode(mode);
      render(plan);
      const labels = { low_time:'Dia reduzido aplicado.', extra:'Mais tempo liberado para hoje.', rest:'Hoje virou descanso; a fila foi redistribuída.', normal:'Limite normal restaurado.' };
      message(labels[mode] || 'Cronograma atualizado.');
    } catch (error) {
      console.error(error);
      message(error.message || 'Não foi possível ajustar o dia.');
    }
  }

  async function saveSettings() {
    const engine = await waitForEngine();
    if (!engine) return;
    const days = [...document.querySelectorAll('[data-p6-day]:checked')].map(node => Number(node.dataset.p6Day));
    if (!days.length) return message('Escolha pelo menos um dia de estudo.');
    message('Salvando e redistribuindo a semana…');
    try {
      await engine.savePreferences({
        daily_minutes: Number($('#p6DailyMinutes').value),
        buffer_percent: Number($('#p6Buffer').value),
        review_ratio: Number($('#p6ReviewRatio').value),
        study_days: days
      });
      await refresh();
      message('Cronograma salvo. A projeção foi recalculada dentro dos novos limites.');
    } catch (error) {
      console.error(error);
      message(error.message || 'Não foi possível salvar o cronograma.');
    }
  }

  async function completeTask(id) {
    const engine = await waitForEngine();
    if (!engine) return;
    try {
      const plan = await engine.completeItem(id);
      render(plan);
      message('Tarefa concluída e progresso salvo.');
    } catch (error) {
      console.error(error);
      message('Não foi possível concluir esta tarefa agora.');
    }
  }

  async function startTask(id) {
    const item = (currentPlan?.items || []).find(row => row.id === id);
    if (!item) return;
    const nav = document.querySelector('[data-go="acervo"]');
    nav?.click();
    await sleep(180);
    const subject = $('#bankSubject');
    const topic = $('#bankTopic');
    if (subject) {
      subject.value = '';
      subject.dispatchEvent(new Event('change', { bubbles:true }));
      await sleep(40);
    }
    if (topic && item.topic_id) {
      topic.value = item.topic_id;
      topic.dispatchEvent(new Event('change', { bubbles:true }));
    }
    const filter = item.task_type === 'review' ? 'review' : 'new';
    document.querySelector(`[data-question-filter="${filter}"]`)?.click();
    await sleep(30);
    $('#bankStartBtn')?.click();
  }

  async function boot() {
    addStyle();
    for (let i = 0; i < 80 && !$('.mission-card'); i += 1) await sleep(50);
    inject();
    await refresh();
    const db = window.mentorCloud?.client;
    db?.auth?.onAuthStateChange?.(event => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => refresh(true), 120);
    });
  }

  window.addEventListener('mentor:plan-updated', event => render(event.detail));
  window.addEventListener('mentor:attempt-saved', () => setTimeout(() => refresh(), 250));

  window.MentorStudyProfile = Object.freeze({ version: VERSION, refresh });
  boot().catch(error => console.error('P6: painel não iniciou', error));
})();
