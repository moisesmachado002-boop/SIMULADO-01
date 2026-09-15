(() => {
  'use strict';
  if (window.__mentorQuestionSourceTabsV505) return;
  window.__mentorQuestionSourceTabsV505 = true;

  const $ = s => document.querySelector(s);
  let switching = false;
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

  function syncActive(kind = currentSource) {
    const tabs = $('[data-page-view="questions"] > .tabs');
    if (!tabs) return;
    const bank = tabs.querySelector('[data-question-tab="bank"]');
    const qc = tabs.querySelector('[data-question-tab="external"]');
    const internet = tabs.querySelector('[data-top-source="internet"]');
    const presencial = tabs.querySelector('[data-top-source="presencial"]');
    const externalVisible = $('[data-question-panel="external"]')?.classList.contains('active');

    [bank,qc,internet,presencial].forEach(btn => btn?.classList.remove('active'));
    if (!externalVisible) bank?.classList.add('active');
    else if (kind === 'internet') internet?.classList.add('active');
    else if (kind === 'presencial') presencial?.classList.add('active');
    else qc?.classList.add('active');
  }

  function chooseInnerWhenReady(kind, attempt = 0) {
    const inner = innerSourceButton(kind);
    if (inner) {
      inner.click();
      currentSource = kind;
      syncActive(kind);
      return;
    }
    if (attempt < 40) setTimeout(() => chooseInnerWhenReady(kind, attempt + 1), 100);
  }

  function selectExternal(kind) {
    currentSource = kind;
    const qcTop = $('[data-page-view="questions"] > .tabs [data-question-tab="external"]');
    if (!qcTop) return;
    switching = true;
    qcTop.click();
    switching = false;
    syncActive(kind);
    chooseInnerWhenReady(kind);
  }

  function inject() {
    const tabs = $('[data-page-view="questions"] > .tabs');
    const qcTop = tabs?.querySelector('[data-question-tab="external"]');
    if (!tabs || !qcTop) return false;

    injectStyles();
    tabs.classList.add('mentor-source-top-tabs');
    qcTop.dataset.topSource = 'qconcursos';

    if (!tabs.querySelector('[data-top-source="internet"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tab';
      button.dataset.topSource = 'internet';
      button.textContent = 'Questões Internet';
      qcTop.insertAdjacentElement('afterend', button);
    }

    if (!tabs.querySelector('[data-top-source="presencial"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tab';
      button.dataset.topSource = 'presencial';
      button.textContent = 'Presencial';
      tabs.appendChild(button);
    }

    if (!tabs.dataset.sourceTabsBound) {
      tabs.dataset.sourceTabsBound = '1';
      tabs.addEventListener('click', event => {
        const sourceButton = event.target.closest('[data-top-source]');
        if (!sourceButton || switching) return;
        const kind = sourceButton.dataset.topSource;
        if (kind === 'internet' || kind === 'presencial') {
          event.preventDefault();
          selectExternal(kind);
          return;
        }
        if (kind === 'qconcursos') {
          currentSource = 'qconcursos';
          setTimeout(() => chooseInnerWhenReady('qconcursos'), 0);
          setTimeout(() => syncActive('qconcursos'), 0);
        }
      });
    }

    const bank = tabs.querySelector('[data-question-tab="bank"]');
    if (bank && !bank.dataset.sourceBankBound) {
      bank.dataset.sourceBankBound = '1';
      bank.addEventListener('click', () => setTimeout(() => syncActive('bank'), 0));
    }

    syncActive();
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (inject() || tries > 160) clearInterval(timer);
  }, 120);

  new MutationObserver(() => {
    if (!$('[data-page-view="questions"] > .tabs.mentor-source-top-tabs')) inject();
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
