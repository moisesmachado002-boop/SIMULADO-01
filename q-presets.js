const Q_PRESETS = [
  {
    id: 'port-interpretacao-fcc',
    subject: 'Português',
    topic: 'Interpretação de Textos',
    label: 'Interpretação de Texto',
    badge: 'FCC',
    url: 'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=1&examining_board_ids%5B%5D=1&subject_ids%5B%5D=14655',
    aliases: ['interpretação', 'interpretacao', 'compreensão', 'compreensao']
  },
  {
    id: 'port-crase-fcc',
    subject: 'Português',
    topic: 'Crase',
    label: 'Crase',
    badge: 'FCC',
    url: 'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=1&examining_board_ids%5B%5D=1&subject_ids%5B%5D=15727',
    aliases: ['crase']
  },
  {
    id: 'port-conectivos',
    subject: 'Português',
    topic: 'Uso dos conectivos',
    label: 'Conjunções e conectivos',
    badge: 'Assunto',
    url: 'https://www.qconcursos.com/questoes-de-concursos/disciplinas/letras-portugues/uso-dos-conectivos/questoes',
    aliases: ['conjunções', 'conjuncoes', 'conectivos']
  },
  {
    id: 'const-fundamentais-fcc',
    subject: 'Direito Constitucional',
    topic: 'Teoria dos Direitos Fundamentais',
    label: 'Direitos Fundamentais',
    badge: 'FCC',
    url: 'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=3&examining_board_ids%5B%5D=1&subject_ids%5B%5D=18351',
    aliases: ['direitos fundamentais', 'garantias fundamentais']
  },
  {
    id: 'const-individuais-fcc',
    subject: 'Direito Constitucional',
    topic: 'Direitos Individuais',
    label: 'Direitos Individuais',
    badge: 'FCC',
    url: 'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=3&examining_board_ids%5B%5D=1&subject_ids%5B%5D=16321',
    aliases: ['direitos individuais', 'artigo 5', 'art. 5']
  },
  {
    id: 'adm-principios-fcc',
    subject: 'Direito Administrativo',
    topic: 'Princípios da Administração Pública',
    label: 'Princípios Administrativos',
    badge: 'FCC',
    url: 'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=2&examining_board_ids%5B%5D=1&subject_ids%5B%5D=896',
    aliases: ['princípios administrativos', 'principios administrativos', 'princípios da administração', 'principios da administracao']
  },
  {
    id: 'adm-limpe-fcc-medio',
    subject: 'Direito Administrativo',
    topic: 'LIMPE',
    label: 'LIMPE — art. 37',
    badge: 'FCC • Médio',
    url: 'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=2&examining_board_ids%5B%5D=1&scholarity_ids%5B%5D=2&subject_ids%5B%5D=16163',
    aliases: ['limpe', 'legalidade', 'impessoalidade', 'moralidade', 'publicidade', 'eficiência', 'eficiencia']
  },
  {
    id: 'penal-culpabilidade',
    subject: 'Direito Penal',
    topic: 'Culpabilidade',
    label: 'Culpabilidade',
    badge: 'Assunto',
    url: 'https://www.qconcursos.com/questoes-de-concursos/disciplinas/direito-direito-penal/culpabilidade/questoes',
    aliases: ['culpabilidade', 'imputabilidade']
  },
  {
    id: 'info-email',
    subject: 'Informática',
    topic: 'Correio Eletrônico',
    label: 'Correio eletrônico',
    badge: 'Assunto',
    url: 'https://www.qconcursos.com/questoes-de-concursos/disciplinas/tecnologia-da-informacao-nocoes-de-informatica/correio-eletronico-cliente-de-e-mail-e-webmail/questoes',
    aliases: ['correio eletrônico', 'correio eletronico', 'email', 'e-mail', 'outlook']
  },
  {
    id: 'mat-porcentagem',
    subject: 'Matemática',
    topic: 'Porcentagem',
    label: 'Porcentagem',
    badge: 'Assunto',
    url: 'https://www.qconcursos.com/questoes-de-concursos/disciplinas/matematica-matematica/porcentagem/questoes',
    aliases: ['porcentagem', 'percentual']
  }
];

function qNormalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function findPresetFor(subjectName, topicName = '') {
  const subject = qNormalize(subjectName);
  const topic = qNormalize(topicName);
  const sameSubject = Q_PRESETS.filter(p => qNormalize(p.subject) === subject);
  if (!sameSubject.length) return null;
  if (topic) {
    const exact = sameSubject.find(p =>
      qNormalize(p.topic).includes(topic) ||
      topic.includes(qNormalize(p.topic)) ||
      (p.aliases || []).some(alias => topic.includes(qNormalize(alias)) || qNormalize(alias).includes(topic))
    );
    if (exact) return exact;
  }
  return sameSubject[0];
}

function recommendedQPreset() {
  const weak = weakestSubject?.();
  if (!weak) return Q_PRESETS[0];
  const topic = weakestTopic?.(weak[1]);
  return findPresetFor(weak[0], topic?.[0] || '') || findPresetFor(weak[0]) || Q_PRESETS[0];
}

function prepareQPreset(preset) {
  ensureQState();
  state.qMode.pendingPreset = {
    id: preset.id,
    subject: preset.subject,
    topic: preset.topic,
    url: preset.url,
    openedAt: new Date().toISOString()
  };
  state.qMode.lastSubject = preset.subject;
  state.qMode.lastTopic = preset.topic;
  saveState();

  const subject = document.querySelector('#qSubject');
  const topic = document.querySelector('#qTopic');
  const source = document.querySelector('#qAttemptUrl');
  if (subject) subject.value = preset.subject;
  if (topic) topic.value = preset.topic;
  if (source) source.value = preset.url;
}

function openQPreset(preset) {
  prepareQPreset(preset);
  window.open(preset.url, '_blank', 'noopener,noreferrer');
  renderPresetRecommendation();
}

function renderPresetRecommendation() {
  const button = document.querySelector('#openMentorPresetBtn');
  const text = document.querySelector('#mentorPresetText');
  if (!button || !text) return;
  const preset = recommendedQPreset();
  button.dataset.presetId = preset.id;
  text.innerHTML = `<strong>${preset.subject}</strong><span>${preset.label} · ${preset.badge}</span>`;
}

function injectQPresets() {
  const view = document.querySelector('[data-view="qconcursos"]');
  const hero = view?.querySelector('.q-hero');
  if (!view || !hero || document.querySelector('#qPresetSection')) return;

  const section = document.createElement('section');
  section.id = 'qPresetSection';
  section.className = 'q-preset-section';
  section.innerHTML = `
    <article class="q-mentor-preset">
      <div>
        <span class="eyebrow">1 CLIQUE • RECOMENDAÇÃO DA MENTORA</span>
        <h2>Resolver o que mais precisa agora</h2>
        <div id="mentorPresetText" class="mentor-preset-text"></div>
      </div>
      <button class="primary" id="openMentorPresetBtn">Resolver agora ↗</button>
    </article>

    <div class="section-heading q-preset-heading">
      <div>
        <span class="eyebrow">FILTROS PRONTOS</span>
        <h2>Escolha o assunto e comece</h2>
        <p>Os botões abaixo abrem o Qconcursos já no assunto indicado. Nos atalhos marcados como FCC, a banca também já vai filtrada.</p>
      </div>
    </div>
    <div class="q-preset-grid">
      ${Q_PRESETS.map(preset => `
        <button class="q-preset-card" data-q-preset="${preset.id}">
          <span class="q-preset-badge">${preset.badge}</span>
          <strong>${preset.label}</strong>
          <small>${preset.subject}</small>
          <span class="q-preset-action">Fazer questões ↗</span>
        </button>
      `).join('')}
    </div>
  `;
  hero.insertAdjacentElement('afterend', section);

  renderPresetRecommendation();

  view.addEventListener('click', event => {
    const card = event.target.closest('[data-q-preset]');
    if (card) {
      const preset = Q_PRESETS.find(p => p.id === card.dataset.qPreset);
      if (preset) openQPreset(preset);
      return;
    }

    const recommended = event.target.closest('#openMentorPresetBtn');
    if (recommended) {
      const preset = Q_PRESETS.find(p => p.id === recommended.dataset.presetId) || recommendedQPreset();
      openQPreset(preset);
    }
  });
}

injectQPresets();

const originalRenderQRecommendationForPresets = renderQRecommendation;
renderQRecommendation = function() {
  originalRenderQRecommendationForPresets();
  renderPresetRecommendation();
};
