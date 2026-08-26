(() => {
  'use strict';
  let installed = false;
  let lastAnalysis = null;

  function emit(result) {
    if (!result) return;
    lastAnalysis = result;
    window.dispatchEvent(new CustomEvent('mentor:analysis-updated', { detail: result }));
  }

  async function install() {
    if (installed) return;
    const engine = window.MentorEngine;
    if (!engine) return setTimeout(install, 80);
    installed = true;
    if (typeof engine.getLastAnalysis === 'function') return;

    const originalAnalyze = engine.analyze.bind(engine);
    const wrapped = Object.freeze({
      ...engine,
      analyze: async (...args) => {
        const result = await originalAnalyze(...args);
        emit(result);
        return result;
      },
      getLastAnalysis: () => lastAnalysis
    });
    window.MentorEngine = wrapped;

    window.addEventListener('mentor:external-practice-saved', () => {
      setTimeout(async () => {
        try {
          emit(await originalAnalyze('today', false));
          await wrapped.reloadHistory?.();
        } catch (error) {
          console.warn('P8: Mentora não atualizada após bateria externa', error);
        }
      }, 180);
    });

    try { emit(await originalAnalyze('today', false)); }
    catch (error) { console.warn('P8: análise inicial não capturada', error); }
  }

  install();
})();