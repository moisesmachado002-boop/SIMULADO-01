(() => {
  'use strict';
  if (window.__mentorQuestionSourceTabsV505) return;
  window.__mentorQuestionSourceTabsV505 = true;

  const $ = selector => document.querySelector(selector);
  let currentSource = 'qconcursos';

  function injectStyles() {
    if ($('#mentorQuestionSourceTabsV505Styles')) return;
    const style = document.createElement('style');
    style.id = 'mentorQuestionSourceTabsV505Styles';
    style.textContent = `
      [data-page-view="questions"] > .tabs.mentor-source-top-tabs{width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
      [data-page-view="questions"] > .tabs.mentor-source-top-tabs .tab{min-width:0;white-space:normal;line-height:1.15;text-align:center}
      #externalSourceTabs{display:none!important}
      @media(max-width:620px){[data-page-view="questions"] > .tabs.mentor-source-top-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function innerSourceButton(kind) {
    return document.querySelector(`#externalSourceTabs [data-external-source="${kind}"]`);
  }

  function setInnerSource(kind, attempt = 0) {
    const inner = innerSourceButton(kind);
    if (inner) {
      if (!inner.classList.contains('active')) inner.click();
      currentSource = kind;
      syncActive();
      return;
    }
    if (attempt < 12) setTimeout(() => setInnerSource(kind, attempt + 1), 150);
  }

  function syncActive() {
    const tabs = $('[data-page-view="questions"] > .tabs');
    if (!tabs) return;
    const bank = tabs.querySelector('[data-question-tab="bank"]');
    const qc = tabs.querySelector('[data-question-tab="external"]');
    const internet = tabs.querySelector('[data-top-source="internet"]');
    const presencial = tabs.querySelector('[data-top-source="presencial"]');
    const externalVisible = $('[data-question-panel="external"]')?.classList.contains('active');

    [bank, qc, internet, presencial].forEach(button => button?.classList.remove('active'));
    if (!externalVisible) bank?.classList.add('active');
    else if (currentSource === 'internet') internet?.classList.add('active');
    else if (currentSource === 'presencial') presencial?.classList.add('active');
    else qc?.classList.add('active');
  }

  function openExternal(kind) {
    currentSource = kind;
    const qcTop = $('[data-page-view="questions"] > .tabs [data-question-tab="external"]');
    const panel = $('[data-question-panel="external"]');
    if (!qcTop || !panel) return;
    if (!panel.classList.contains('active')) qcTop.click();
    setInnerSource(kind);
    queueMicrotask(syncActive);
  }

  function inject() {
    const tabs = $('[data-page-view="questions"] > .tabs');
    const bank = tabs?.querySelector('[data-question-tab="bank"]');
    const qcTop = tabs?.querySelector('[data-question-tab="external"]');
    if (!tabs || !bank || !qcTop) return false;

    injectStyles();
    tabs.classList.add('mentor-source-top-tabs');

    let internet = tabs.querySelector('[data-top-source="internet"]');
    if (!internet) {
      internet = document.createElement('button');
      internet.type = 'button';
      internet.className = 'tab';
      internet.dataset.topSource = 'internet';
      internet.textContent = 'Questões Internet';
      qcTop.insertAdjacentElement('afterend', internet);
    }

    let presencial = tabs.querySelector('[data-top-source="presencial"]');
    if (!presencial) {
      presencial = document.createElement('button');
      presencial.type = 'button';
      presencial.className = 'tab';
      presencial.dataset.topSource = 'presencial';
      presencial.textContent = 'Presencial';
      tabs.appendChild(presencial);
    }

    if (!bank.dataset.sourceTopBound) {
      bank.dataset.sourceTopBound = '1';
      bank.addEventListener('click', () => queueMicrotask(syncActive));
    }

    if (!qcTop.dataset.sourceTopBound) {
      qcTop.dataset.sourceTopBound = '1';
      qcTop.addEventListener('click', () => {
        currentSource = 'qconcursos';
        setInnerSource('qconcursos');
        queueMicrotask(syncActive);
      });
    }

    if (!internet.dataset.sourceTopBound) {
      internet.dataset.sourceTopBound = '1';
      internet.addEventListener('click', event => {
        event.preventDefault();
        openExternal('internet');
      });
    }

    if (!presencial.dataset.sourceTopBound) {
      presencial.dataset.sourceTopBound = '1';
      presencial.addEventListener('click', event => {
        event.preventDefault();
        openExternal('presencial');
      });
    }

    syncActive();
    return true;
  }

  let attempts = 0;
  const maxAttempts = 12;
  const retry = () => {
    if (inject()) return;
    attempts += 1;
    if (attempts < maxAttempts) setTimeout(retry, Math.min(100 + attempts * 150, 900));
  };

  retry();
})();
