(() => {
  'use strict';

  const VERSION = '2.3';
  const LEVELS = Object.freeze({ EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' });
  const ORIGINS = Object.freeze({ SOURCE: 'source', ESTIMATED: 'estimated', CALIBRATED: 'calibrated' });
  const META = Object.freeze({
    [LEVELS.EASY]: { label: 'FÁCIL', className: 'difficulty-easy' },
    [LEVELS.MEDIUM]: { label: 'MÉDIA', className: 'difficulty-medium' },
    [LEVELS.HARD]: { label: 'DIFÍCIL', className: 'difficulty-hard' }
  });
  const ORIGIN_LABELS = Object.freeze({
    [ORIGINS.SOURCE]: 'informada pela fonte',
    [ORIGINS.ESTIMATED]: 'estimativa da plataforma',
    [ORIGINS.CALIBRATED]: 'calibrada pelo desempenho'
  });

  const cache = new Map();

  function normalize(value) {
    if (value == null || value === '') return null;
    const text = String(value).toLowerCase().trim();
    if (['easy', 'facil', 'fácil', '1', '2'].includes(text)) return LEVELS.EASY;
    if (['medium', 'medio', 'médio', '3'].includes(text)) return LEVELS.MEDIUM;
    if (['hard', 'dificil', 'difícil', '4', '5'].includes(text)) return LEVELS.HARD;
    return null;
  }

  function normalizeOrigin(value) {
    const text = String(value || '').toLowerCase().trim();
    return Object.values(ORIGINS).includes(text) ? text : null;
  }

  function describe(question) {
    const level = normalize(question?.difficulty);
    if (!level) return null;
    const origin = normalizeOrigin(question?.difficulty_origin) || ORIGINS.ESTIMATED;
    return {
      level,
      origin,
      label: META[level].label,
      className: META[level].className,
      originLabel: ORIGIN_LABELS[origin]
    };
  }

  function estimate(question) {
    const statement = String(question?.statement || '');
    const alternatives = question?.alternatives && typeof question.alternatives === 'object'
      ? Object.values(question.alternatives).join(' ')
      : '';
    let score = 0;
    if (statement.length > 900) score += 2;
    else if (statement.length > 500) score += 1;
    if (alternatives.length > 900) score += 2;
    else if (alternatives.length > 500) score += 1;
    if (/(exceto|incorreta|correta|respectivamente|analise|considere)/i.test(statement)) score += 1;
    if (/\d/.test(statement)) score += 1;
    return score <= 1 ? LEVELS.EASY : score <= 3 ? LEVELS.MEDIUM : LEVELS.HARD;
  }

  async function fetchQuestion(questionId) {
    if (!questionId) return null;
    if (cache.has(questionId)) return cache.get(questionId);
    const db = window.mentorCloud?.client;
    if (!db) return null;
    const { data, error } = await db.from('questions')
      .select('id,difficulty,difficulty_origin,difficulty_updated_at')
      .eq('id', questionId)
      .maybeSingle();
    if (error) {
      console.warn('Não foi possível carregar a dificuldade da questão:', error);
      return null;
    }
    if (data) cache.set(questionId, data);
    return data || null;
  }

  function reveal(question) {
    const feedback = document.querySelector('#bankFeedback');
    if (!feedback || feedback.classList.contains('hidden')) return false;
    const info = describe(question);
    if (!info) return false;

    feedback.querySelector('.question-difficulty-card')?.remove();
    const card = document.createElement('div');
    card.className = `question-difficulty-card ${info.className}`;
    card.innerHTML = `<span>DIFICULDADE</span><strong>${info.label}</strong><small>${info.originLabel}</small>`;

    const result = feedback.querySelector('.qg-feedback-result');
    if (result) result.insertAdjacentElement('afterend', card);
    else feedback.prepend(card);
    return true;
  }

  function loadFeedbackModule() {
    if (window.MentorQuestionFeedback || document.querySelector('#mentorQuestionFeedbackScript')) return;
    const script = document.createElement('script');
    script.id = 'mentorQuestionFeedbackScript';
    script.src = './question-feedback.js?v=4.1';
    document.body.appendChild(script);
  }

  window.addEventListener('mentor:attempt-saved', async event => {
    const questionId = event.detail?.questionId;
    if (!questionId) return;
    const question = await fetchQuestion(questionId);
    if (question) reveal(question);
  });

  loadFeedbackModule();

  window.MentorQuestionDifficulty = Object.freeze({
    version: VERSION,
    LEVELS,
    ORIGINS,
    normalize,
    normalizeOrigin,
    describe,
    estimate,
    fetchQuestion,
    reveal
  });
})();
