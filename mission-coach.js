(() => {
  'use strict';

  const VERSION = '9.2';
  const QUESTION_MINUTES = 3;
  let refreshing = false;
  let queued = false;
  let observer = null;

  const $ = selector => document.querySelector(selector);
  const esc = (value='') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function context() {
    const db = window.mentorCloud?.client;
    if (!db) return { db:null, user:null };
    const { data:{ session } } = await db.auth.getSession();
    return { db, user:session?.user || null };
  }

  function addStyles() {
    if ($('#mentorMissionCoachCss')) return;
    const style = document.createElement('style');
    style.id = 'mentorMissionCoachCss';
    style.textContent = `
      .mission-context-note{margin:12px 0;padding:13px 14px;border:1px solid var(--line);border-radius:14px;background:rgba(124,58,237,.08);font-size:13px;line-height:1.5;color:var(--muted)}
      .mission-context-note strong{display:block;color:var(--text);margin-bottom:4px}
      .mission-method{display:block;margin-top:5px;color:var(--muted);font-size:12px;line-height:1.45}
      .mission-time-hint{display:block;margin-top:2px;font-size:10px;color:var(--muted)}
    `;
    document.head.appendChild(style);
  }

  function usefulMinutes(item) {
    const stored = Math.max(0, Number(item?.duration_minutes || 0));
    if (item?.task_type !== 'questions') return stored;
    const target = Math.max(1, Number(item?.question_target || 1));
    const questionBudget = Math.max(QUESTION_MINUTES, target * QUESTION_MINUTES);
    return stored ? Math.min(stored, questionBudget) : questionBudget;
  }

  async function normalizeSparseDurations(plan, db, user) {
    if (!plan?.items?.length || !db || !user) return plan;
    const sparse = plan.items.filter(item => {
      if (item.task_type !== 'questions' || !['pending','in_progress'].includes(item.status)) return false;
      return Number(item.duration_minutes || 0) > usefulMinutes(item);
    });
    if (!sparse.length) return plan;
    for (const item of sparse) {
      const result = await db.from('study_plan_items')
        .update({ duration_minutes:usefulMinutes(item) })
        .eq('id',item.id)
        .eq('user_id',user.id);
      if (result.error) throw result.error;
    }
    return window.MentorScheduleEngine?.getPlan?.() || plan;
  }

  function itemDetail(item, hasEvidence) {
    const subject = item.subject_name || 'Matéria';
    const topic = item.topic_title || 'Assunto';
    const target = Math.max(1, Number(item.question_target || 1));
    if (item.task_type === 'review') {
      return `Revisão espaçada de ${subject} → ${topic}. Refaça sem olhar a resposta anterior; consulte a explicação somente depois de tentar recuperar a regra da memória.`;
    }
    if (!hasEvidence) {
      return `Amostra diagnóstica de ${subject} → ${topic}: faça ${target} questão${target===1?'':'ões'} sem consultar teoria durante a resposta. Depois, use o feedback para corrigir a regra e marque sua confiança. Esta amostra gera evidência; sozinha não define uma fraqueza.`;
    }
    return `Prática de recuperação em ${subject} → ${topic}: faça ${target} questão${target===1?'':'ões'} tentando lembrar a regra antes de consultar material. Corrija o erro logo após responder e registre confiança.`;
  }

  function itemTitle(item, hasEvidence) {
    if (item.task_type === 'review') return `Revisão espaçada — ${item.subject_name || 'Matéria'}`;
    if (!hasEvidence) return `Diagnóstico por questões — ${item.subject_name || 'Matéria'}`;
    return `Questões de recuperação — ${item.subject_name || 'Matéria'}`;
  }

  async function evidenceSnapshot(db, user) {
    const [attemptR, externalR, questionR] = await Promise.all([
      db.from('question_attempts').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      db.from('external_practice_batches').select('total_questions').eq('user_id',user.id),
      db.from('questions').select('subject_id').not('explanation','is',null).limit(5000)
    ]);
    for (const result of [attemptR,externalR,questionR]) if (result.error) throw result.error;
    const external = (externalR.data || []).reduce((sum,row)=>sum+Number(row.total_questions||0),0);
    const internalSubjects = new Set((questionR.data || []).map(row=>row.subject_id).filter(Boolean)).size;
    return { evidence:Number(attemptR.count || 0) + external, internalSubjects };
  }

  function render(plan, snapshot) {
    const list = $('#dailyPlan');
    const title = $('#missionTitle');
    const subtitle = $('#missionSubtitle');
    const progress = $('#missionProgress');
    const regen = $('#regeneratePlanBtn');
    if (!list || !title || !subtitle || !progress) return;

    const today = window.MentorScheduleEngine?.dateKey?.() || new Date().toISOString().slice(0,10);
    const items = (plan?.items || []).filter(item => item.scheduled_for === today && ['pending','in_progress','completed'].includes(item.status));
    const hasEvidence = Number(snapshot?.evidence || 0) >= 5;
    const totalTarget = items.reduce((sum,item)=>sum+Math.max(1,Number(item.question_target || 1)),0);
    const doneTarget = items.reduce((sum,item)=>sum+Math.min(Math.max(1,Number(item.question_target || 1)),Number(item.progress_count || (item.status==='completed'?item.question_target:0) || 0)),0);
    const minutes = items.reduce((sum,item)=>sum+usefulMinutes(item),0);
    const dailyBudget = Number(plan?.preferences?.daily_minutes || 0);

    if (!items.length) {
      title.textContent = snapshot?.evidence ? 'Sem tarefa pendente para hoje' : 'Primeiro: construir uma linha de base';
      subtitle.textContent = snapshot?.evidence ? 'Seu cronograma não tem itens pendentes neste momento.' : 'Sem histórico, a Mentora não deve inventar uma fraqueza.';
      progress.textContent = '0/0';
      list.innerHTML = '<div class="empty-history">Abra Questões para gerar evidência ou registre uma bateria externa do Qconcursos.</div>';
      regen?.classList.add('hidden');
      return;
    }

    if (!hasEvidence) {
      title.textContent = 'Missão: construir linha de base';
      subtitle.textContent = `${dailyBudget || minutes} min disponíveis · primeiro medir, depois priorizar.`;
    } else {
      const first = items.find(item=>item.status!=='completed') || items[0];
      title.textContent = `Foco: ${first?.subject_name || 'seu plano adaptativo'}`;
      subtitle.textContent = `${minutes} min estimados em tarefas rastreáveis · tempo é orçamento, não meta por questão.`;
    }
    progress.textContent = `${doneTarget}/${totalTarget}`;
    regen?.classList.add('hidden');

    const note = !hasEvidence
      ? `<div class="mission-context-note"><strong>Por que essa missão?</strong>Seu histórico foi zerado. Uma única questão não é suficiente para concluir que você domina ou não um assunto. A prioridade agora é criar uma amostra mínima e diversificar as fontes antes de concentrar o estudo.</div>`
      : `<div class="mission-context-note"><strong>Como usar o tempo</strong>Os minutos são uma estimativa de agenda. Se terminar as questões antes, use o restante para corrigir erros, recuperar a regra sem olhar e seguir para a próxima tarefa — não fique preso esperando o relógio.</div>`;

    const rows = items.map((item,index) => {
      const target = Math.max(1,Number(item.question_target || 1));
      const completed = item.status === 'completed';
      const time = usefulMinutes(item);
      return `<div class="plan-step ${completed?'done':''}">
        <div class="step-check" aria-hidden="true">${completed?'✓':index+1}</div>
        <div class="plan-copy"><strong>${esc(itemTitle(item,hasEvidence))}</strong><small>${esc(itemDetail(item,hasEvidence))}<span class="mission-method">Meta: ${target} questão${target===1?'':'ões'} · ${esc(item.topic_title || 'Assunto')}.</span></small></div>
        <span class="plan-time">~${time} min<span class="mission-time-hint">estimativa</span></span>
      </div>`;
    }).join('');

    let external = '';
    const remaining = Math.max(0,dailyBudget-minutes);
    if (!hasEvidence && Number(snapshot?.internalSubjects || 0) <= 1 && remaining >= 10) {
      external = `<div class="mission-context-note"><strong>Complete o diagnóstico fora do banco interno</strong>Hoje o banco próprio cobre poucas matérias. Use parte dos ~${remaining} min restantes para fazer uma bateria de 5–10 questões de outra matéria no Qconcursos e registre o resultado em “Qconcursos + Internet”. Isso evita que a Mentora trate Português como prioridade só porque é onde há mais questões internas.</div>`;
    }
    list.innerHTML = note + rows + external;
  }

  async function refresh() {
    if (refreshing) { queued = true; return; }
    refreshing = true;
    try {
      addStyles();
      const engine = window.MentorScheduleEngine;
      const { db, user } = await context();
      if (!engine || !db || !user) return;
      let plan = await engine.getPlan();
      plan = await normalizeSparseDurations(plan,db,user);
      const snapshot = await evidenceSnapshot(db,user);
      render(plan,snapshot);
    } catch(error) {
      console.warn('Mission Coach: missão não atualizada',error);
    } finally {
      refreshing = false;
      if (queued) { queued=false; setTimeout(refresh,80); }
    }
  }

  async function boot() {
    const started = Date.now();
    while ((!window.MentorScheduleEngine || !window.mentorCloud?.client) && Date.now()-started < 8000) await sleep(80);
    await refresh();
    window.addEventListener('mentor:plan-updated',()=>setTimeout(refresh,120));
    window.addEventListener('mentor:attempt-saved',()=>setTimeout(refresh,180));
    window.addEventListener('mentor:external-practice-saved',()=>setTimeout(refresh,180));
    window.addEventListener('mentor:review-scheduled',()=>setTimeout(refresh,180));
    const host = $('#dailyPlan');
    if (host && !observer) {
      observer = new MutationObserver(()=>{
        if (!refreshing) setTimeout(refresh,120);
      });
      observer.observe(host,{childList:true,subtree:true});
    }
  }

  window.MentorMissionCoach = Object.freeze({ version:VERSION, refresh, usefulMinutes });
  boot();
})();