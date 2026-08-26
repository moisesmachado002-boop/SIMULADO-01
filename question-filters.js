(() => {
  'use strict';

  const VERSION = '2.2';
  const FILTERS = Object.freeze({
    AUTO: 'auto',
    NEW: 'new',
    WRONG: 'wrong',
    CORRECT: 'correct',
    REVIEW: 'review',
    MASTERED: 'mastered',
    ALL: 'all'
  });

  const LABELS = Object.freeze({
    [FILTERS.AUTO]: 'Automático',
    [FILTERS.NEW]: 'Novas',
    [FILTERS.WRONG]: 'Erradas',
    [FILTERS.CORRECT]: 'Acertadas',
    [FILTERS.REVIEW]: 'Revisão',
    [FILTERS.MASTERED]: 'Dominadas',
    [FILTERS.ALL]: 'Todas'
  });

  function stateKey(state, now = Date.now()) {
    if (window.MentorQuestionState?.key) return window.MentorQuestionState.key(state, now);
    if (!state || Number(state.seen_count || 0) === 0) return 'new';
    if (state.status === 'mastered') return 'mastered';
    if (state.status === 'review') return 'review';
    if (state.last_is_correct === true) return 'correct';
    if (state.last_is_correct === false) return 'wrong';
    return 'answered';
  }

  function isDue(state, now = Date.now()) {
    if (window.MentorQuestionState?.isDue) return window.MentorQuestionState.isDue(state, now);
    if (!state?.next_review_at) return false;
    const reviewAt = new Date(state.next_review_at).getTime();
    return Number.isFinite(reviewAt) && reviewAt <= now;
  }

  function matches(state, filter, now = Date.now()) {
    const key = stateKey(state, now);
    if (filter === FILTERS.AUTO || filter === FILTERS.ALL) return true;
    if (filter === FILTERS.NEW) return key === 'new';
    if (filter === FILTERS.WRONG) return key === 'wrong' || (key === 'review' && state?.last_is_correct === false);
    if (filter === FILTERS.CORRECT) return key === 'correct';
    if (filter === FILTERS.REVIEW) return key === 'review' || isDue(state, now);
    if (filter === FILTERS.MASTERED) return key === 'mastered';
    return true;
  }

  function filtered(questions, states, filter, now = Date.now()) {
    if (filter === FILTERS.AUTO) return [...questions];
    return questions.filter(q => matches(states.get(q.id), filter, now));
  }

  function leastSeen(pool, states) {
    if (!pool.length) return null;
    const min = Math.min(...pool.map(q => Number(states.get(q.id)?.seen_count || 0)));
    const least = pool.filter(q => Number(states.get(q.id)?.seen_count || 0) === min);
    return least[Math.floor(Math.random() * least.length)] || pool[0];
  }

  function choose(questions, states, filter = FILTERS.AUTO, now = Date.now()) {
    if (!questions.length) return null;

    if (filter !== FILTERS.AUTO) {
      return leastSeen(filtered(questions, states, filter, now), states);
    }

    const fresh = questions.filter(q => stateKey(states.get(q.id), now) === 'new');
    if (fresh.length) return leastSeen(fresh, states);

    const dueReview = questions.filter(q => {
      const state = states.get(q.id);
      return stateKey(state, now) === 'review' || isDue(state, now);
    });
    if (dueReview.length) return leastSeen(dueReview, states);

    const learning = questions.filter(q => stateKey(states.get(q.id), now) !== 'mastered');
    if (learning.length) return leastSeen(learning, states);

    return null;
  }

  function counts(questions, states, now = Date.now()) {
    return {
      [FILTERS.AUTO]: questions.length,
      [FILTERS.NEW]: questions.filter(q => matches(states.get(q.id), FILTERS.NEW, now)).length,
      [FILTERS.WRONG]: questions.filter(q => matches(states.get(q.id), FILTERS.WRONG, now)).length,
      [FILTERS.CORRECT]: questions.filter(q => matches(states.get(q.id), FILTERS.CORRECT, now)).length,
      [FILTERS.REVIEW]: questions.filter(q => matches(states.get(q.id), FILTERS.REVIEW, now)).length,
      [FILTERS.MASTERED]: questions.filter(q => matches(states.get(q.id), FILTERS.MASTERED, now)).length,
      [FILTERS.ALL]: questions.length
    };
  }

  window.MentorQuestionFilters = Object.freeze({
    version: VERSION,
    FILTERS,
    LABELS,
    stateKey,
    matches,
    filtered,
    choose,
    counts
  });
})();
