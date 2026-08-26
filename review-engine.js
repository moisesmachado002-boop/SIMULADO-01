(() => {
  'use strict';

  const VERSION = '9.1';
  const BASE_HOURS = Object.freeze({ 1: 24, 2: 168, 3: 720, 4: 1080 });
  const MAX_INTERVAL_HOURS = 1080;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function waitForDb(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const db = window.mentorCloud?.client;
      if (db) return db;
      await sleep(50);
    }
    return null;
  }

  function addHours(iso, hours) {
    const date = iso ? new Date(iso) : new Date();
    date.setTime(date.getTime() + Math.max(1, hours) * 3600000);
    return date.toISOString();
  }

  function computeInterval(state) {
    const correct = state?.last_is_correct === true;
    const confidence = Number(state?.last_confidence || 3);
    const responseSeconds = Number(state?.last_response_time_seconds || 0);
    const currentStage = Math.max(0, Math.min(4, Number(state?.review_stage || 0)));
    const wrongCount = Number(state?.wrong_count || 0);

    if (!correct) {
      let hours = confidence >= 5 ? 6 : confidence >= 3 ? 12 : 24;
      if (wrongCount >= 2) hours = Math.min(hours, 8);
      return {
        stage: 0,
        hours,
        reason: confidence >= 5 ? 'erro_alta_confianca' : wrongCount >= 2 ? 'erro_recorrente' : 'erro'
      };
    }

    const nextStage = Math.min(4, Math.max(1, currentStage + 1));
    let hours = BASE_HOURS[nextStage] || BASE_HOURS[3];
    const strong = confidence >= 5 && responseSeconds > 0 && responseSeconds <= 45;
    const fragile = confidence <= 2;
    if (fragile) hours = Math.max(12, Math.round(hours * 0.5));
    if (strong) hours = Math.min(MAX_INTERVAL_HOURS, Math.round(hours * 1.25));
    if (wrongCount > 0 && nextStage <= 2) hours = Math.min(hours, 168);

    return {
      stage: nextStage,
      hours: Math.min(MAX_INTERVAL_HOURS, hours),
      reason: strong ? 'acerto_forte' : fragile ? 'acerto_fragil' : 'acerto'
    };
  }

  async function scheduleAfterAttempt(questionId) {
    if (!questionId) return null;
    const db = await waitForDb();
    if (!db) return null;
    const { data: { session } } = await db.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const stateResult = await db.from('user_question_state')
      .select('question_id,seen_count,correct_count,wrong_count,last_is_correct,last_confidence,last_response_time_seconds,last_attempt_at,review_stage,review_defer_count,status')
      .eq('user_id', user.id).eq('question_id', questionId).maybeSingle();
    if (stateResult.error || !stateResult.data) {
      if (stateResult.error) console.warn('P6: estado da questão indisponível', stateResult.error);
      return null;
    }

    const questionResult = await db.from('questions').select('id,topic_id').eq('id', questionId).maybeSingle();
    if (questionResult.error) return null;

    const state = stateResult.data;
    const plan = computeInterval(state);
    const anchor = state.last_attempt_at || new Date().toISOString();
    const dueAt = addHours(anchor, plan.hours);
    const mastered = state.last_is_correct === true && plan.stage >= 3 && Number(state.correct_count || 0) >= 3;

    const updateState = await db.from('user_question_state').update({
      next_review_at: dueAt,
      review_stage: plan.stage,
      review_interval_hours: plan.hours,
      review_defer_count: 0,
      review_anchor_at: anchor,
      status: state.last_is_correct === false ? 'review' : mastered ? 'mastered' : 'learning',
      updated_at: new Date().toISOString()
    }).eq('user_id', user.id).eq('question_id', questionId);
    if (updateState.error) throw updateState.error;

    await db.from('reviews').update({ status:'completed', completed_at:anchor, updated_at:new Date().toISOString() })
      .eq('user_id', user.id).eq('question_id', questionId).eq('status','pending');

    const reviewInsert = await db.from('reviews').insert({
      user_id:user.id,
      topic_id:questionResult.data?.topic_id || null,
      question_id:questionId,
      due_at:dueAt,
      review_type:'adaptive-question',
      status:'pending',
      review_stage:plan.stage,
      interval_hours:plan.hours,
      trigger_reason:plan.reason,
      updated_at:new Date().toISOString()
    });
    if (reviewInsert.error) throw reviewInsert.error;

    if (questionResult.data?.topic_id) {
      await db.from('topic_mastery').update({ next_review_at:dueAt, updated_at:new Date().toISOString() })
        .eq('user_id', user.id).eq('topic_id', questionResult.data.topic_id);
    }

    const detail = { questionId, dueAt, stage:plan.stage, intervalHours:plan.hours, reason:plan.reason };
    window.dispatchEvent(new CustomEvent('mentor:review-scheduled', { detail }));
    return detail;
  }

  window.addEventListener('mentor:attempt-saved', event => {
    if (event.detail?.reviewScheduled) return;
    scheduleAfterAttempt(event.detail?.questionId).catch(error => console.error('P6: falha ao reagendar revisão', error));
  });

  window.MentorReviewEngine = Object.freeze({
    version: VERSION,
    computeInterval,
    scheduleAfterAttempt,
    maxIntervalHours: MAX_INTERVAL_HOURS
  });
})();