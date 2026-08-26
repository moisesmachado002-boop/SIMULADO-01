(() => {
  'use strict';
  const VERSION = '9.1';
  let installed = false;
  let lastAnalysis = null;

  function emit(result) {
    if (!result) return;
    lastAnalysis = result;
    window.dispatchEvent(new CustomEvent('mentor:analysis-updated',{detail:result}));
  }

  async function install() {
    if (installed) return;
    const engine = window.MentorEngine;
    if (!engine) return setTimeout(install,80);
    installed = true;
    if (typeof engine.getLastAnalysis === 'function') return;

    const originalAnalyze = engine.analyze.bind(engine);
    window.MentorEngine = Object.freeze({
      ...engine,
      version: VERSION,
      analyze: async (...args) => {
        const result = await originalAnalyze(...args);
        emit(result);
        return result;
      },
      getLastAnalysis: () => lastAnalysis
    });

    try { emit(await originalAnalyze('today',false)); }
    catch(error) { console.warn('P8: análise inicial não capturada',error); }
  }

  install();
})();