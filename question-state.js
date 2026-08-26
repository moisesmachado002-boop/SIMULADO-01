(() => {
  'use strict';

  const VERSION = '5.0';

  const STATES = Object.freeze({
    NEW: 'new',
    ANSWERED: 'answered',
    CORRECT: 'correct',
    WRONG: 'wrong',
    REVIEW: 'review',
    MASTERED: 'mastered'
  });

  const META = Object.freeze({
    [STATES.NEW]: { label: 'NOVA', className: 'badge-novo' },
    [STATES.ANSWERED]: { label: 'RESPONDIDA', className: 'badge-learning' },
    [STATES.CORRECT]: { label: 'ACERTADA', className: 'badge-acerto' },
    [STATES.WRONG]: { label: 'ERRADA', className: 'badge-erro' },
    [STATES.REVIEW]: { label: 'REVISÃO', className: 'badge-erro' },
    [STATES.MASTERED]: { label: 'DOMINADA', className: 'badge-acerto' }
  });

  function isDue(state, now = Date.now()) {
    if (!state?.next_review_at) return false;
    const reviewAt = new Date(state.next_review_at).getTime();
    return Number.isFinite(reviewAt) && reviewAt <= now;
  }

  function key(state, now = Date.now()) {
    if (!state || Number(state.seen_count || 0) === 0) return STATES.NEW;
    if (isDue(state, now)) return STATES.REVIEW;
    if (state.last_is_correct === false) return STATES.WRONG;
    if (state.status === 'mastered') return STATES.MASTERED;
    if (state.status === 'review') return STATES.REVIEW;
    if (state.last_is_correct === true) return STATES.CORRECT;
    return STATES.ANSWERED;
  }

  function describe(state, now = Date.now()) {
    const stateKey = key(state, now);
    return { key: stateKey, ...META[stateKey] };
  }

  function isNew(state) {
    return key(state) === STATES.NEW;
  }

  function isMastered(state) {
    return key(state) === STATES.MASTERED;
  }

  function isReview(state, now = Date.now()) {
    return key(state, now) === STATES.REVIEW;
  }

  function snapshotAfterAttempt(previous, attempt) {
    const old = previous || {};
    const correct = Boolean(attempt?.is_correct);
    const seenCount = Number(old.seen_count || 0) + 1;
    const correctCount = Number(old.correct_count || 0) + (correct ? 1 : 0);
    const wrongCount = Number(old.wrong_count || 0) + (correct ? 0 : 1);

    return {
      ...old,
      seen_count: seenCount,
      correct_count: correctCount,
      wrong_count: wrongCount,
      last_selected_answer: attempt?.selected_answer ?? null,
      last_is_correct: correct,
      last_response_time_seconds: attempt?.response_time_seconds ?? null,
      last_confidence: attempt?.confidence ?? null,
      last_attempt_at: attempt?.answered_at ?? new Date().toISOString()
    };
  }

  window.MentorQuestionState = Object.freeze({
    version: VERSION,
    STATES,
    key,
    describe,
    isDue,
    isNew,
    isReview,
    isMastered,
    snapshotAfterAttempt
  });
})();
