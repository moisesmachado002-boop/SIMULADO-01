(() => {
  'use strict';

  const VERSION = '9.3';
  const DIAGNOSTIC_EXAM = 'Autoavaliação Mentora PMBA 2026';
  const FILTERS = Object.freeze({
    AUTO: 'auto',
    DIAGNOSTIC: 'diagnostic',
    NEW: 'new',
    WRONG: 'wrong',
    CORRECT: 'correct',
    REVIEW: 'review',
    MASTERED: 'mastered',
    ALL: 'all'
  });

  const LABELS = Object.freeze({
    [FILTERS.AUTO]: 'Automático',
    [FILTERS.DIAGNOSTIC]: 'Autoavaliação',
    [FILTERS.NEW]: 'Novas',
    [FILTERS.WRONG]: 'Erradas',
    [FILTERS.CORRECT]: 'Acertadas',
    [FILTERS.REVIEW]: 'Revisão',
    [FILTERS.MASTERED]: 'Dominadas',
    [FILTERS.ALL]: 'Todas'
  });

  function isDue(state, now = Date.now()) {
    if (window.MentorQuestionState?.isDue) return window.MentorQuestionState.isDue(state, now);
    if (!state?.next_review_at) return false;
    const reviewAt = new Date(state.next_review_at).getTime();
    return Number.isFinite(reviewAt) && reviewAt <= now;
  }

  function stateKey(state, now = Date.now()) {
    if (window.MentorQuestionState?.key) return window.MentorQuestionState.key(state, now);
    if (!state || Number(state.seen_count || 0) === 0) return 'new';
    if (isDue(state, now)) return 'review';
    if (state.last_is_correct === false) return 'wrong';
    if (state.status === 'mastered') return 'mastered';
    if (state.status === 'review') return 'review';
    if (state.last_is_correct === true) return 'correct';
    return 'answered';
  }

  function autoEligible(state, now = Date.now()) {
    return stateKey(state, now) === 'new' || isDue(state, now);
  }

  function isDiagnostic(question) {
    return question?.exam_name === DIAGNOSTIC_EXAM || String(question?.source_question_number || '').startsWith('AUTO-');
  }

  function matches(state, filter, now = Date.now()) {
    const key = stateKey(state, now);
    if (filter === FILTERS.AUTO) return autoEligible(state, now);
    if (filter === FILTERS.ALL) return true;
    if (filter === FILTERS.NEW) return key === 'new';
    if (filter === FILTERS.WRONG) return key === 'wrong' || (state?.last_is_correct === false && Number(state?.seen_count || 0) > 0);
    if (filter === FILTERS.CORRECT) return key === 'correct';
    if (filter === FILTERS.REVIEW) return state?.status === 'review' || key === 'review' || isDue(state, now);
    if (filter === FILTERS.MASTERED) return key === 'mastered';
    return true;
  }

  function filtered(questions, states, filter, now = Date.now()) {
    if (filter === FILTERS.DIAGNOSTIC) {
      return questions.filter(q => isDiagnostic(q) && Number(states.get(q.id)?.seen_count || 0) === 0);
    }
    return questions.filter(q => matches(states.get(q.id), filter, now));
  }

  function leastSeen(pool, states) {
    if (!pool.length) return null;
    const min = Math.min(...pool.map(q => Number(states.get(q.id)?.seen_count || 0)));
    const least = pool.filter(q => Number(states.get(q.id)?.seen_count || 0) === min);
    return least[Math.floor(Math.random() * least.length)] || pool[0] || null;
  }

  function chooseDiagnostic(questions, states) {
    const diagnostic = questions.filter(isDiagnostic);
    const fresh = diagnostic.filter(q => Number(states.get(q.id)?.seen_count || 0) === 0);
    if (!fresh.length) return null;

    const answeredBySubject = new Map();
    diagnostic.forEach(q => {
      if (!q.subject_id) return;
      if (!answeredBySubject.has(q.subject_id)) answeredBySubject.set(q.subject_id, 0);
      if (Number(states.get(q.id)?.seen_count || 0) > 0) {
        answeredBySubject.set(q.subject_id, answeredBySubject.get(q.subject_id) + 1);
      }
    });

    const freshSubjects = [...new Set(fresh.map(q => q.subject_id).filter(Boolean))];
    const minAnswered = freshSubjects.length
      ? Math.min(...freshSubjects.map(id => answeredBySubject.get(id) || 0))
      : 0;
    const prioritySubjects = new Set(freshSubjects.filter(id => (answeredBySubject.get(id) || 0) === minAnswered));
    const balanced = fresh.filter(q => !q.subject_id || prioritySubjects.has(q.subject_id));
    return balanced[Math.floor(Math.random() * balanced.length)] || fresh[0] || null;
  }

  function choose(questions, states, filter = FILTERS.AUTO, now = Date.now()) {
    if (!questions.length) return null;
    if (filter === FILTERS.DIAGNOSTIC) return chooseDiagnostic(questions, states);
    if (filter !== FILTERS.AUTO) return leastSeen(filtered(questions, states, filter, now), states);

    const fresh = questions.filter(q => stateKey(states.get(q.id), now) === 'new');
    if (fresh.length) return leastSeen(fresh, states);

    const dueReview = questions.filter(q => isDue(states.get(q.id), now));
    if (dueReview.length) return leastSeen(dueReview, states);

    return null;
  }

  function counts(questions, states, now = Date.now()) {
    const result = {};
    Object.values(FILTERS).forEach(filter => {
      if (filter === FILTERS.ALL) result[filter] = questions.length;
      else if (filter === FILTERS.DIAGNOSTIC) result[filter] = filtered(questions, states, filter, now).length;
      else result[filter] = questions.filter(q => matches(states.get(q.id), filter, now)).length;
    });
    return result;
  }

  window.MentorQuestionFilters = Object.freeze({
    version: VERSION,
    diagnosticExam: DIAGNOSTIC_EXAM,
    FILTERS,
    LABELS,
    stateKey,
    isDue,
    autoEligible,
    isDiagnostic,
    matches,
    filtered,
    choose,
    counts
  });
})();