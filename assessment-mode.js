(() => {
  'use strict';

  const VERSION = '9.3';
  const EXAM = 'Autoavaliação Mentora PMBA 2026';
  const EXPECTED_TOTAL = 24;
  let db = null;
  let user = null;
  let lastProgress = null;
  let observer = null;
  const $ = selector => document.querySelector(selector);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const esc = (value='') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function addStyles() {
    if ($('#mentorAssessmentStyles')) return;
    const style = document.createElement('style');
    style.id = 'mentorAssessmentStyles';
    style.textContent = `
      .assessment-card{margin:14px 0;padding:18px;border:1px solid var(--line,#28324a);border-radius:18px;background:linear-gradient(145deg,rgba(47,92,255,.13),rgba(255,255,255,.02));box-shadow:0 10px 28px rgba(0,0,0,.12)}
      .assessment-top{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.assessment-top h2{margin:4px 0 7px;font-size:1.2rem}.assessment-top p{margin:0;color:var(--muted,#9aa4bd);line-height:1.45}.assessment-badge{white-space:nowrap;border:1px solid rgba(118,149,255,.45);border-radius:999px;padding:6px 9px;font-size:.72rem;font-weight:800;letter-spacing:.04em}.assessment-progress{margin-top:14px}.assessment-progress-line{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.assessment-progress-line span{display:block;height:100%;background:currentColor;border-radius:999px}.assessment-stats{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 0;font-size:.82rem;color:var(--muted,#9aa4bd)}.assessment-stats strong{color:var(--text,#fff)}
      .assessment-action{margin-top:14px;width:100%;border:0;border-radius:12px;padding:13px 14px;font-weight:900;cursor:pointer;background:var(--primary,#5271ff);color:#fff}.assessment-action:disabled{opacity:.55;cursor:not-allowed}.assessment-note{margin:9px 0 0;font-size:.78rem;color:var(--muted,#9aa4bd);line-height:1.4}.assessment-weak{margin-top:11px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:.82rem;line-height:1.4}.assessment-filter-btn{outline:2px solid rgba(82,113,255,.45);outline-offset:1px}.assessment-filter-btn span{font-weight:900}
      @media(max-width:520px){.assessment-top{display:block}.assessment-badge{display:inline-block;margin-top:10px}}
    `;
    document.head.appendChild(style);
  }

  async function context(timeoutMs=6000) {
    const start = Date.now();
    while (Date.now()-start < timeoutMs) {
      db = window.mentorCloud?.client || db;
      if (db) {
        const {data:{session}} = await db.auth.getSession();
        user = session?.user || null;
        return {db,user};
      }
      await sleep(80);
    }
    return {db:null,user:null};
  }

  function injectCard() {
    if ($('#mentorAssessmentCard')) return;
    const view = $('[data-view="acervo"]');
    const filterCard = view?.querySelector('.bank-filter-card');
    if (!filterCard) return;
    const card = document.createElement('article');
    card.id = 'mentorAssessmentCard';
    card.className = 'assessment-card';
    card.innerHTML = `
      <div class="assessment-top">
        <div><span class="qg-kicker">AUTOAVALIAÇÃO INICIAL • PMBA 2026</span><h2>Diagnóstico médio–difícil</h2><p id="assessmentDescription">24 questões inéditas, distribuídas entre 12 matérias. A ordem alterna disciplinas para evitar um diagnóstico enviesado.</p></div>
        <span class="assessment-badge">V${VERSION}</span>
      </div>
      <div class="assessment-progress">
        <div class="assessment-progress-line"><span id="assessmentBar" style="width:0%"></span></div>
        <div class="assessment-stats"><span><strong id="assessmentDone">0/24</strong> respondidas</span><span><strong id="assessmentAccuracy">—</strong> acertos</span><span><strong id="assessmentRemaining">24</strong> restantes</span></div>
      </div>
      <div id="assessmentWeak" class="assessment-weak" hidden></div>
      <button type="button" id="assessmentStart" class="assessment-action">COMEÇAR AUTOAVALIAÇÃO</button>
      <p class="assessment-note">Resultado inicial, não sentença: são 2 itens por matéria. A Mentora usa isso para escolher onde coletar mais evidência depois.</p>`;
    filterCard.insertAdjacentElement('beforebegin', card);
    $('#assessmentStart')?.addEventListener('click', handleAction);
  }

  function ensureFilterButton() {
    const host = $('#bankStateFilters');
    const filters = window.MentorQuestionFilters;
    if (!host || !filters?.FILTERS?.DIAGNOSTIC) return;
    let button = host.querySelector('[data-question-filter="diagnostic"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'question-state-filter-btn assessment-filter-btn';
      button.dataset.questionFilter = 'diagnostic';
      host.prepend(button);
    }
    const remaining = Number(lastProgress?.remaining ?? EXPECTED_TOTAL);
    button.innerHTML = `AUTOAVALIAÇÃO<span>${remaining}</span>`;
  }

  async function loadProgress() {
    const ctx = await context(2500);
    if (!ctx.db || !ctx.user) {
      renderProgress({total:EXPECTED_TOTAL,answered:0,correct:0,remaining:EXPECTED_TOTAL,subjects:[]});
      return null;
    }
    const q = await ctx.db.from('questions').select('id,subject_id,subject_label,difficulty').eq('exam_name',EXAM).order('source_question_number');
    if (q.error) throw q.error;
    const questions = q.data || [];
    const ids = questions.map(row => row.id);
    let states = [];
    if (ids.length) {
      const s = await ctx.db.from('user_question_state').select('question_id,seen_count,last_is_correct').eq('user_id',ctx.user.id).in('question_id',ids);
      if (s.error) throw s.error;
      states = s.data || [];
    }
    const stateMap = new Map(states.map(row => [row.question_id,row]));
    const groups = new Map();
    questions.forEach(qrow => {
      const key = qrow.subject_id || qrow.subject_label;
      if (!groups.has(key)) groups.set(key,{name:qrow.subject_label||'Matéria',total:0,answered:0,correct:0});
      const g = groups.get(key); g.total += 1;
      const st = stateMap.get(qrow.id);
      if (Number(st?.seen_count||0)>0) { g.answered += 1; if (st?.last_is_correct === true) g.correct += 1; }
    });
    const subjects = [...groups.values()];
    const answered = subjects.reduce((sum,g)=>sum+g.answered,0);
    const correct = subjects.reduce((sum,g)=>sum+g.correct,0);
    const total = questions.length || EXPECTED_TOTAL;
    const progress = {total,answered,correct,remaining:Math.max(0,total-answered),subjects};
    lastProgress = progress;
    renderProgress(progress);
    ensureFilterButton();
    if (progress.total && progress.answered >= progress.total) await maybeAnalyze(progress);
    return progress;
  }

  function renderProgress(progress) {
    lastProgress = progress;
    const total = Math.max(1,Number(progress.total||EXPECTED_TOTAL));
    const answered = Number(progress.answered||0);
    const correct = Number(progress.correct||0);
    const pct = Math.round(answered/total*100);
    if ($('#assessmentBar')) $('#assessmentBar').style.width = `${pct}%`;
    if ($('#assessmentDone')) $('#assessmentDone').textContent = `${answered}/${total}`;
    if ($('#assessmentAccuracy')) $('#assessmentAccuracy').textContent = answered ? `${Math.round(correct/answered*100)}%` : '—';
    if ($('#assessmentRemaining')) $('#assessmentRemaining').textContent = String(Math.max(0,total-answered));
    const button = $('#assessmentStart');
    if (button) {
      button.dataset.complete = answered >= total ? '1' : '0';
      button.textContent = answered >= total ? 'VER ANÁLISE DA MENTORA' : answered ? 'CONTINUAR AUTOAVALIAÇÃO' : 'COMEÇAR AUTOAVALIAÇÃO';
    }
    const weak = $('#assessmentWeak');
    if (!weak) return;
    if (answered < total) { weak.hidden = true; weak.innerHTML=''; return; }
    const ranked = [...(progress.subjects||[])].sort((a,b)=>(a.correct/Math.max(1,a.total))-(b.correct/Math.max(1,b.total)) || a.name.localeCompare(b.name));
    const lowest = ranked.slice(0,3).map(g=>`${esc(g.name)}: ${g.correct}/${g.total}`).join(' • ');
    weak.hidden = false;
    weak.innerHTML = `<strong>Sinais iniciais para confirmar:</strong> ${lowest}. Com apenas 2 questões por matéria, a Mentora deve usar isso para pedir mais evidência, não para declarar domínio definitivo.`;
  }

  async function maybeAnalyze(progress) {
    if (!user || !progress?.total || progress.answered < progress.total) return;
    const key = `mentor-assessment-analyzed-${VERSION}-${user.id}`;
    if (localStorage.getItem(key)==='1') return;
    try {
      const analysis = await window.MentorEngine?.analyze?.('weakness',true);
      if (analysis) localStorage.setItem(key,'1');
    } catch(error) {
      console.warn('Autoavaliação concluída, mas a análise automática será refeita ao abrir a Mentora.',error);
    }
  }

  async function startAssessment() {
    const ctx = await context();
    if (!ctx.user) {
      window.mentorCloud?.openLogin?.();
      return;
    }
    if (typeof navigate === 'function') navigate('acervo');
    const subject = $('#bankSubject');
    if (subject) {
      subject.value = '';
      subject.dispatchEvent(new Event('change',{bubbles:true}));
    }
    await sleep(60);
    const topic = $('#bankTopic');
    if (topic) { topic.value=''; topic.dispatchEvent(new Event('change',{bubbles:true})); }
    ensureFilterButton();
    await sleep(30);
    const filterButton = $('[data-question-filter="diagnostic"]');
    filterButton?.click();
    await sleep(50);
    $('#bankStartBtn')?.click();
  }

  async function handleAction() {
    if ($('#assessmentStart')?.dataset.complete === '1') {
      document.querySelector('.bottom-nav [data-go="mentora"]')?.click();
      try { await window.MentorEngine?.analyze?.('weakness',true); } catch(error) { console.warn(error); }
      return;
    }
    await startAssessment();
  }

  function observeFilters() {
    if (observer) return;
    observer = new MutationObserver(()=>ensureFilterButton());
    const host = $('#bankStateFilters');
    if (host) observer.observe(host,{childList:true});
  }

  async function boot() {
    addStyles();
    const start = Date.now();
    while (Date.now()-start < 7000 && (!$('[data-view="acervo"]') || !$('#bankStateFilters'))) await sleep(100);
    injectCard();
    ensureFilterButton();
    observeFilters();
    try { await loadProgress(); } catch(error) { console.warn('Autoavaliação não carregada:',error); }
    window.addEventListener('mentor:question-revealed',event=>{
      if (event.detail?.question?.exam_name === EXAM) setTimeout(()=>loadProgress().catch(console.warn),180);
    });
    const client = window.mentorCloud?.client;
    client?.auth?.onAuthStateChange?.(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>loadProgress().catch(console.warn),180);});
  }

  window.MentorAssessmentMode = Object.freeze({version:VERSION,exam:EXAM,start:startAssessment,refresh:loadProgress});
  boot();
})();