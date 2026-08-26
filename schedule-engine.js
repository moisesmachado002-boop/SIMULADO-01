(() => {
  'use strict';

  const VERSION = '6.0';
  const PLAN_VERSION = 'p6-v1';
  const HORIZON_DAYS = 7;
  const REVIEW_MINUTES = 4;
  const QUESTION_MINUTES = 3;
  const DEFAULTS = Object.freeze({
    daily_minutes: 60,
    study_days: [1,2,3,4,5,6],
    review_ratio: 40,
    buffer_percent: 15,
    low_time_minutes: 20,
    extra_step_minutes: 30,
    timezone: 'America/Bahia'
  });

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function fromKey(key) {
    const [y,m,d] = String(key).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  }

  function addDays(date, amount) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + amount);
    return next;
  }

  function isoWeekday(date) {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  async function waitForDb(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const db = window.mentorCloud?.client;
      if (db) return db;
      await sleep(50);
    }
    return null;
  }

  async function userContext() {
    const db = await waitForDb();
    if (!db) return { db: null, user: null };
    const { data: { session } } = await db.auth.getSession();
    return { db, user: session?.user || null };
  }

  async function ensurePreferences() {
    const { db, user } = await userContext();
    if (!db || !user) return null;
    const current = await db.from('study_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (current.error) throw current.error;
    if (current.data) return current.data;
    const row = { user_id: user.id, ...DEFAULTS };
    const created = await db.from('study_preferences').insert(row).select('*').single();
    if (created.error) throw created.error;
    return created.data;
  }

  async function savePreferences(patch) {
    const { db, user } = await userContext();
    if (!db || !user) throw new Error('Faça login para salvar o cronograma.');
    const old = await ensurePreferences();
    const days = Array.isArray(patch.study_days) ? [...new Set(patch.study_days.map(Number))].filter(n => n >= 1 && n <= 7).sort() : old.study_days;
    const row = {
      daily_minutes: clamp(Number(patch.daily_minutes ?? old.daily_minutes), 20, 480),
      study_days: days.length ? days : old.study_days,
      review_ratio: clamp(Number(patch.review_ratio ?? old.review_ratio), 20, 80),
      buffer_percent: clamp(Number(patch.buffer_percent ?? old.buffer_percent), 0, 40),
      low_time_minutes: clamp(Number(patch.low_time_minutes ?? old.low_time_minutes), 10, 120),
      extra_step_minutes: clamp(Number(patch.extra_step_minutes ?? old.extra_step_minutes), 10, 120),
      timezone: old.timezone || DEFAULTS.timezone,
      updated_at: new Date().toISOString()
    };
    const saved = await db.from('study_preferences').update(row).eq('user_id', user.id).select('*').single();
    if (saved.error) throw saved.error;
    await regenerate({ rebalanceToday: true });
    return saved.data;
  }

  async function todayOverride() {
    const { db, user } = await userContext();
    if (!db || !user) return null;
    const result = await db.from('study_day_overrides').select('*').eq('user_id', user.id).eq('study_date', dateKey()).maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function setTodayMode(mode) {
    const { db, user } = await userContext();
    if (!db || !user) throw new Error('Faça login para ajustar o dia.');
    const prefs = await ensurePreferences();
    const today = dateKey();
    if (mode === 'normal') {
      const removed = await db.from('study_day_overrides').delete().eq('user_id', user.id).eq('study_date', today);
      if (removed.error) throw removed.error;
    } else {
      const existing = await todayOverride();
      let minutes = prefs.daily_minutes;
      if (mode === 'low_time') minutes = Math.min(prefs.daily_minutes, prefs.low_time_minutes);
      if (mode === 'rest') minutes = 0;
      if (mode === 'extra') {
        const base = existing?.mode === 'extra' && Number.isFinite(Number(existing.minutes_override))
          ? Number(existing.minutes_override)
          : prefs.daily_minutes;
        minutes = clamp(base + prefs.extra_step_minutes, 20, 720);
      }
      const saved = await db.from('study_day_overrides').upsert({
        user_id: user.id,
        study_date: today,
        mode,
        minutes_override: minutes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,study_date' });
      if (saved.error) throw saved.error;
    }
    await regenerate({ rebalanceToday: true });
    return getPlan();
  }

  function capacityFor(date, prefs, overrides, reviewPressure = 0) {
    const key = dateKey(date);
    const override = overrides.get(key);
    const regular = (prefs.study_days || []).map(Number).includes(isoWeekday(date));
    let hard = regular ? Number(prefs.daily_minutes) : 0;

    if (override) {
      if (override.mode === 'rest') hard = 0;
      else if (override.minutes_override != null) hard = Number(override.minutes_override);
    }

    hard = clamp(Number(hard || 0), 0, 720);
    let schedulable = Math.floor(hard * (100 - Number(prefs.buffer_percent || 0)) / 100);
    // Dívida alta pode usar o buffer, mas nunca ultrapassa o limite duro do dia.
    if (hard > 0 && reviewPressure > schedulable * 0.6) schedulable = hard;
    return { hard, schedulable };
  }

  function reviewPriority(state, dueAt) {
    const now = Date.now();
    const due = new Date(dueAt).getTime();
    const overdueDays = Number.isFinite(due) ? Math.max(0, (now - due) / 86400000) : 0;
    let score = 70 + Math.min(20, Math.round(overdueDays * 4));
    if (state?.last_is_correct === false) score += 6;
    if (Number(state?.last_confidence || 0) >= 5 && state?.last_is_correct === false) score += 8;
    score += Math.min(6, Number(state?.review_defer_count || 0) * 2);
    return clamp(score, 1, 100);
  }

  async function regenerate(options = {}) {
    const { db, user } = await userContext();
    if (!db || !user) return null;
    const prefs = await ensurePreferences();
    const todayDate = fromKey(dateKey());
    const today = dateKey(todayDate);
    const horizon = dateKey(addDays(todayDate, HORIZON_DAYS - 1));
    const debtFrom = dateKey(addDays(todayDate, -21));

    const [overrideResult, qResult, topicResult, subjectResult, masteryResult, planResult] = await Promise.all([
      db.from('study_day_overrides').select('*').eq('user_id', user.id).gte('study_date', today).lte('study_date', horizon),
      db.from('questions').select('id,topic_id,subject_id,subject_label,topic_label').not('explanation', 'is', null).limit(5000),
      db.from('topics').select('id,subject_id,title,position,syllabus_code').eq('active', true),
      db.from('subjects').select('id,name,position').eq('active', true),
      db.from('topic_mastery').select('topic_id,mastery_score,confidence_score,attempts_count,last_attempt_at').eq('user_id', user.id),
      db.from('study_plan_items').select('*').eq('user_id', user.id).gte('scheduled_for', debtFrom).lte('scheduled_for', horizon)
    ]);
    for (const result of [overrideResult,qResult,topicResult,subjectResult,masteryResult,planResult]) if (result.error) throw result.error;

    const questions = qResult.data || [];
    const questionIds = questions.map(q => q.id);
    let stateRows = [];
    if (questionIds.length) {
      const stateResult = await db.from('user_question_state')
        .select('question_id,seen_count,correct_count,wrong_count,last_is_correct,last_confidence,last_attempt_at,next_review_at,review_stage,review_defer_count,status')
        .eq('user_id', user.id)
        .in('question_id', questionIds);
      if (stateResult.error) throw stateResult.error;
      stateRows = stateResult.data || [];
    }

    const overrides = new Map((overrideResult.data || []).map(row => [row.study_date, row]));
    const qById = new Map(questions.map(q => [q.id, q]));
    const states = new Map(stateRows.map(s => [s.question_id, s]));
    const mastery = new Map((masteryResult.data || []).map(row => [row.topic_id, row]));
    const topics = topicResult.data || [];
    const subjects = new Map((subjectResult.data || []).map(row => [row.id, row]));
    const oldPlan = planResult.data || [];

    const debtRows = oldPlan.filter(item => item.plan_version === PLAN_VERSION && item.scheduled_for < today && ['pending','in_progress'].includes(item.status));
    const todayMovable = options.rebalanceToday
      ? oldPlan.filter(item => item.plan_version === PLAN_VERSION && item.scheduled_for === today && ['pending','in_progress'].includes(item.status))
      : [];
    const debtSource = [...debtRows, ...todayMovable];

    if (debtRows.length) {
      const ids = debtRows.map(row => row.id);
      const skipped = await db.from('study_plan_items').update({ status: 'skipped' }).in('id', ids).eq('user_id', user.id);
      if (skipped.error) throw skipped.error;
    }
    if (todayMovable.length) {
      const ids = todayMovable.map(row => row.id);
      const skipped = await db.from('study_plan_items').update({ status: 'skipped' }).in('id', ids).eq('user_id', user.id);
      if (skipped.error) throw skipped.error;
    }

    let futureDelete = db.from('study_plan_items').delete().eq('user_id', user.id).eq('plan_version', PLAN_VERSION).gt('scheduled_for', today).in('status', ['pending','in_progress']);
    const deleted = await futureDelete;
    if (deleted.error) throw deleted.error;

    const fixed = oldPlan.filter(item => item.plan_version === PLAN_VERSION && item.scheduled_for >= today && item.scheduled_for <= horizon && (
      item.status === 'completed' || (!options.rebalanceToday && item.scheduled_for === today && ['pending','in_progress'].includes(item.status))
    ));
    const fixedKeys = new Set(fixed.map(item => `${item.task_type}|${item.question_id || ''}|${item.topic_id || ''}`));

    const reviewCandidates = [];
    stateRows.forEach(state => {
      if (!state.next_review_at || !qById.has(state.question_id)) return;
      const dueDate = dateKey(new Date(state.next_review_at));
      if (dueDate > horizon) return;
      const q = qById.get(state.question_id);
      const key = `review|${q.id}|${q.topic_id || ''}`;
      if (fixedKeys.has(key)) return;
      reviewCandidates.push({
        kind: 'review',
        question_id: q.id,
        topic_id: q.topic_id,
        subject_id: q.subject_id,
        due: dueDate,
        priority: reviewPriority(state, state.next_review_at),
        duration: REVIEW_MINUTES,
        source_reason: dueDate <= today ? 'revisao_vencida' : 'revisao_programada',
        displaced_from: null
      });
    });

    const debtCandidates = debtSource.map(item => ({
      kind: item.task_type,
      question_id: item.question_id || null,
      topic_id: item.topic_id || null,
      subject_id: item.topic_id ? topics.find(t => t.id === item.topic_id)?.subject_id || null : null,
      due: today,
      priority: Math.max(80, Number(item.priority || 50)),
      duration: Number(item.duration_minutes || (item.task_type === 'review' ? REVIEW_MINUTES : 20)),
      question_target: item.question_target || null,
      source_reason: 'divida_reagendada',
      displaced_from: item.displaced_from || item.scheduled_for
    }));

    const newByTopic = new Map();
    questions.forEach(q => {
      if (!q.topic_id) return;
      const state = states.get(q.id);
      if (Number(state?.seen_count || 0) > 0) return;
      if (!newByTopic.has(q.topic_id)) newByTopic.set(q.topic_id, []);
      newByTopic.get(q.topic_id).push(q);
    });

    const topicQueue = topics
      .filter(topic => newByTopic.has(topic.id))
      .map(topic => {
        const m = mastery.get(topic.id);
        const subject = subjects.get(topic.subject_id);
        const score = Number(m?.mastery_score ?? 35);
        const attempts = Number(m?.attempts_count || 0);
        const last = m?.last_attempt_at ? new Date(m.last_attempt_at).getTime() : 0;
        return { topic, subject, score, attempts, last, newCount: newByTopic.get(topic.id).length };
      })
      .sort((a,b) => a.score - b.score || a.attempts - b.attempts || a.last - b.last || Number(a.subject?.position || 0) - Number(b.subject?.position || 0) || Number(a.topic.position || 0) - Number(b.topic.position || 0));

    const completedByDay = new Map();
    const fixedPendingByDay = new Map();
    fixed.forEach(item => {
      const target = item.status === 'completed' ? completedByDay : fixedPendingByDay;
      target.set(item.scheduled_for, (target.get(item.scheduled_for) || 0) + Number(item.duration_minutes || 0));
    });

    const reviewPressure = reviewCandidates.filter(item => item.due <= today).length * REVIEW_MINUTES + debtCandidates.filter(item => item.kind === 'review').reduce((sum,item) => sum + item.duration, 0);
    const inserts = [];
    let rotation = 0;

    for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
      const date = addDays(todayDate, offset);
      const key = dateKey(date);
      const cap = capacityFor(date, prefs, overrides, reviewPressure);
      let available = Math.max(0, cap.schedulable - Number(completedByDay.get(key) || 0) - Number(fixedPendingByDay.get(key) || 0));
      if (available < REVIEW_MINUTES) continue;
      let order = 10;

      const eligibleReviews = reviewCandidates
        .filter(item => !item.assigned && item.due <= key)
        .sort((a,b) => b.priority - a.priority || a.due.localeCompare(b.due));
      const reviewDemand = eligibleReviews.reduce((sum,item) => sum + item.duration, 0);
      let reviewBudget = Math.floor(available * Number(prefs.review_ratio || 40) / 100);
      if (reviewDemand > reviewBudget) reviewBudget = Math.max(reviewBudget, Math.floor(available * (reviewDemand > cap.hard ? 0.75 : 0.6)));
      if (!topicQueue.length) reviewBudget = available;
      let reviewUsed = 0;

      for (const item of eligibleReviews) {
        const overdueDays = Math.max(0, Math.floor((fromKey(key) - fromKey(item.due)) / 86400000));
        const protectedReview = overdueDays >= 3 || item.priority >= 95;
        if (available < item.duration) break;
        if (!protectedReview && reviewUsed + item.duration > reviewBudget) break;
        inserts.push({
          user_id: user.id, topic_id: item.topic_id, question_id: item.question_id,
          scheduled_for: key, task_type: 'review', question_target: 1,
          duration_minutes: item.duration, priority: item.priority,
          source_reason: item.source_reason, displaced_from: item.displaced_from,
          plan_version: PLAN_VERSION, sort_order: order, status: 'pending', progress_count: 0
        });
        item.assigned = true;
        available -= item.duration;
        reviewUsed += item.duration;
        order += 10;
      }

      const debtEligible = debtCandidates.filter(item => !item.assigned).sort((a,b) => b.priority - a.priority);
      for (const item of debtEligible) {
        if (available < Math.min(10, item.duration)) break;
        const duration = Math.min(item.duration, available);
        inserts.push({
          user_id: user.id, topic_id: item.topic_id, question_id: item.question_id,
          scheduled_for: key, task_type: item.kind === 'review' ? 'review' : item.kind,
          question_target: item.question_target || (item.kind === 'review' ? 1 : Math.max(1, Math.floor(duration / QUESTION_MINUTES))),
          duration_minutes: duration, priority: item.priority,
          source_reason: item.source_reason, displaced_from: item.displaced_from,
          plan_version: PLAN_VERSION, sort_order: order, status: 'pending', progress_count: 0
        });
        item.assigned = true;
        available -= duration;
        order += 10;
      }

      let safety = 0;
      while (available >= 10 && topicQueue.length && safety < topicQueue.length * 3) {
        const candidate = topicQueue[rotation % topicQueue.length];
        rotation += 1;
        safety += 1;
        if (!candidate || candidate.newCount <= 0) continue;
        const duration = Math.min(20, available);
        const target = Math.min(candidate.newCount, Math.max(3, Math.floor(duration / QUESTION_MINUTES)));
        inserts.push({
          user_id: user.id, topic_id: candidate.topic.id, question_id: null,
          scheduled_for: key, task_type: 'questions', question_target: target,
          duration_minutes: duration, priority: clamp(75 - Math.round(candidate.score / 4), 35, 80),
          source_reason: 'questoes_novas', displaced_from: null,
          plan_version: PLAN_VERSION, sort_order: order, status: 'pending', progress_count: 0
        });
        candidate.newCount -= target;
        available -= duration;
        order += 10;
      }
    }

    if (inserts.length) {
      const result = await db.from('study_plan_items').insert(inserts);
      if (result.error) throw result.error;
    }

    // Revisões vencidas que ficaram sem espaço acumulam prioridade para a próxima projeção.
    const unassignedOverdue = reviewCandidates.filter(item => !item.assigned && item.due <= horizon);
    for (const item of unassignedOverdue) {
      const state = states.get(item.question_id);
      if (!state) continue;
      await db.from('user_question_state')
        .update({ review_defer_count: Number(state.review_defer_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('question_id', item.question_id);
    }

    const detail = await getPlan();
    window.dispatchEvent(new CustomEvent('mentor:plan-updated', { detail }));
    return detail;
  }

  async function getPlan() {
    const { db, user } = await userContext();
    if (!db || !user) return null;
    const prefs = await ensurePreferences();
    const start = dateKey();
    const end = dateKey(addDays(fromKey(start), HORIZON_DAYS - 1));
    const [itemsResult, overrideResult, topicsResult, subjectsResult] = await Promise.all([
      db.from('study_plan_items').select('*').eq('user_id', user.id).eq('plan_version', PLAN_VERSION).gte('scheduled_for', start).lte('scheduled_for', end).order('scheduled_for').order('sort_order'),
      db.from('study_day_overrides').select('*').eq('user_id', user.id).gte('study_date', start).lte('study_date', end),
      db.from('topics').select('id,subject_id,title,syllabus_code'),
      db.from('subjects').select('id,name')
    ]);
    for (const r of [itemsResult,overrideResult,topicsResult,subjectsResult]) if (r.error) throw r.error;
    const topics = new Map((topicsResult.data || []).map(row => [row.id, row]));
    const subjects = new Map((subjectsResult.data || []).map(row => [row.id, row]));
    const items = (itemsResult.data || []).map(item => {
      const topic = topics.get(item.topic_id);
      const subject = topic ? subjects.get(topic.subject_id) : null;
      return { ...item, topic_title: topic?.title || 'Revisão geral', topic_code: topic?.syllabus_code || '', subject_name: subject?.name || 'Estudo' };
    });
    return { preferences: prefs, overrides: overrideResult.data || [], items, start, end };
  }

  async function completeItem(itemId) {
    const { db, user } = await userContext();
    if (!db || !user) return;
    const current = await db.from('study_plan_items').select('question_target').eq('id', itemId).eq('user_id', user.id).maybeSingle();
    if (current.error) throw current.error;
    const result = await db.from('study_plan_items').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress_count: Number(current.data?.question_target || 0)
    }).eq('id', itemId).eq('user_id', user.id);
    if (result.error) throw result.error;
    const plan = await getPlan();
    window.dispatchEvent(new CustomEvent('mentor:plan-updated', { detail: plan }));
    return plan;
  }

  async function progressFromAttempt(questionId, topicId) {
    const { db, user } = await userContext();
    if (!db || !user) return;
    const today = dateKey();
    const result = await db.from('study_plan_items')
      .select('*').eq('user_id', user.id).eq('plan_version', PLAN_VERSION).eq('scheduled_for', today)
      .in('status', ['pending','in_progress']).order('sort_order');
    if (result.error) throw result.error;
    const rows = result.data || [];
    let item = rows.find(row => row.task_type === 'review' && row.question_id === questionId);
    if (!item && topicId) item = rows.find(row => row.task_type === 'questions' && row.topic_id === topicId);
    if (!item) return;
    const nextProgress = Number(item.progress_count || 0) + 1;
    const target = Number(item.question_target || 1);
    const done = nextProgress >= target;
    const update = await db.from('study_plan_items').update({
      progress_count: nextProgress,
      status: done ? 'completed' : 'in_progress',
      completed_at: done ? new Date().toISOString() : null
    }).eq('id', item.id).eq('user_id', user.id);
    if (update.error) throw update.error;
    const plan = await getPlan();
    window.dispatchEvent(new CustomEvent('mentor:plan-updated', { detail: plan }));
  }

  window.addEventListener('mentor:attempt-saved', event => {
    progressFromAttempt(event.detail?.questionId, event.detail?.topicId).catch(error => console.warn('P6: progresso da missão não atualizado', error));
  });
  window.addEventListener('mentor:review-scheduled', () => {
    setTimeout(() => regenerate().catch(error => console.warn('P6: projeção não recalculada', error)), 120);
  });

  window.MentorScheduleEngine = Object.freeze({
    version: VERSION,
    planVersion: PLAN_VERSION,
    defaults: DEFAULTS,
    ensurePreferences,
    savePreferences,
    setTodayMode,
    regenerate,
    getPlan,
    completeItem,
    progressFromAttempt,
    dateKey,
    isoWeekday
  });
})();
