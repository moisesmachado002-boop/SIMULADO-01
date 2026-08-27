(() => {
  'use strict';
  if (window.__mentorV47Controls) return;
  window.__mentorV47Controls = true;

  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ = 'America/Bahia';
  const client = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_KEY);
  if (!client) return;

  const $ = s => document.querySelector(s);
  const dateKey = () => new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  const toast = (text, kind='neutral') => {
    const node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
    node.classList.add('show');
    clearTimeout(window.__mentorV47Toast);
    window.__mentorV47Toast = setTimeout(() => node.classList.remove('show'), 3200);
  };

  let user = null;
  let todayRows = [];
  let syncing = false;

  async function ensureUser() {
    if (user) return user;
    const {data} = await client.auth.getUser();
    user = data?.user || null;
    return user;
  }

  async function fetchTodayRows() {
    const u = await ensureUser();
    if (!u) return [];
    const {data, error} = await client.from('study_plan_items')
      .select('*')
      .eq('user_id', u.id)
      .eq('scheduled_for', dateKey())
      .neq('status', 'skipped')
      .order('sort_order', {ascending:true});
    if (error) throw error;
    todayRows = data || [];
    return todayRows;
  }

  function ensureSkipButton() {
    const card = $('#questionCard');
    if (!card) return;
    let btn = $('#questionSkipButton');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'questionSkipButton';
      btn.type = 'button';
      btn.className = 'secondary-button';
      btn.textContent = 'Pular questão →';
      const confirm = $('#questionConfirmButton');
      if (confirm?.parentElement) confirm.parentElement.insertBefore(btn, confirm.nextSibling);
      else card.appendChild(btn);
      btn.addEventListener('click', () => {
        const feedback = $('#questionFeedback');
        if (feedback && !feedback.classList.contains('hidden')) return;
        const next = $('#questionNextButton');
        if (next) {
          next.click();
          toast('Questão pulada. Não contou como erro nem como progresso.');
        }
      });
    }
    const feedback = $('#questionFeedback');
    const unanswered = !feedback || feedback.classList.contains('hidden');
    btn.classList.toggle('hidden', !unanswered || card.classList.contains('hidden'));
  }

  async function decorateDailyTasks() {
    if (syncing) return;
    const list = $('#dailyTasks');
    if (!list) return;
    syncing = true;
    try {
      const rows = await fetchTodayRows();
      const cards = [...list.querySelectorAll('.daily-task')];
      cards.forEach((card, i) => {
        const item = rows[i];
        if (!item) return;
        card.dataset.v47TaskId = item.id;
        const actions = card.querySelector('.task-actions');
        if (!actions) return;
        actions.querySelectorAll('[data-v47-reopen]').forEach(n => n.remove());
        if (item.status === 'completed') {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'secondary-button';
          b.dataset.v47Reopen = item.id;
          b.textContent = 'Reabrir na meta de hoje';
          actions.appendChild(b);
        }
      });
    } catch (e) {
      console.warn('V4.7 controles:', e);
    } finally {
      syncing = false;
    }
  }

  async function manualComplete(id) {
    const u = await ensureUser();
    if (!u) return;
    const {data:item, error:readError} = await client.from('study_plan_items')
      .select('id,progress_count,question_target,task_type')
      .eq('id', id).eq('user_id', u.id).single();
    if (readError) throw readError;
    const before = Math.max(0, Number(item.progress_count || 0));
    const target = Math.max(1, Number(item.question_target || 1));
    const {error} = await client.from('study_plan_items').update({
      status:'completed',
      progress_count:target,
      completed_at:new Date().toISOString(),
      progress_before_manual_complete:before
    }).eq('id', id).eq('user_id', u.id);
    if (error) throw error;
    toast('Meta concluída. Você pode reabri-la se precisar.', 'ok');
    $('#dailyRefreshButton')?.click();
  }

  async function reopen(id) {
    const u = await ensureUser();
    if (!u) return;
    const {data:item, error:readError} = await client.from('study_plan_items')
      .select('id,progress_count,question_target,task_type,progress_before_manual_complete')
      .eq('id', id).eq('user_id', u.id).single();
    if (readError) throw readError;
    const target = Math.max(1, Number(item.question_target || 1));
    let restored = Number(item.progress_before_manual_complete);
    if (!Number.isFinite(restored)) restored = 0;
    if (item.task_type === 'review') restored = 0;
    else restored = Math.min(Math.max(0, target - 1), Math.max(0, restored));
    const {error} = await client.from('study_plan_items').update({
      status: restored > 0 ? 'in_progress' : 'pending',
      progress_count: restored,
      completed_at:null,
      progress_before_manual_complete:null
    }).eq('id', id).eq('user_id', u.id);
    if (error) throw error;
    toast(restored > 0 ? `Meta reaberta em ${restored}/${target}.` : 'Meta reaberta na rotina de hoje.', 'ok');
    $('#dailyRefreshButton')?.click();
  }

  document.addEventListener('click', e => {
    const complete = e.target.closest('[data-task-complete]');
    if (complete) {
      e.preventDefault();
      e.stopImmediatePropagation();
      manualComplete(complete.dataset.taskComplete).catch(err => { console.error(err); toast('Não foi possível concluir a meta.', 'error'); });
      return;
    }
    const reopenBtn = e.target.closest('[data-v47-reopen]');
    if (reopenBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      reopen(reopenBtn.dataset.v47Reopen).catch(err => { console.error(err); toast('Não foi possível reabrir a meta.', 'error'); });
    }
  }, true);

  const observer = new MutationObserver(() => {
    ensureSkipButton();
    clearTimeout(window.__mentorV47DecorateTimer);
    window.__mentorV47DecorateTimer = setTimeout(decorateDailyTasks, 120);
  });
  observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});

  ensureSkipButton();
  decorateDailyTasks();
})();