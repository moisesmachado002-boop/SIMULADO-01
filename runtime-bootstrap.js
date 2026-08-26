(() => {
  'use strict';

  const VERSION = '8.0';

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.loaded === '1' || existing.readyState === 'complete') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.onload = () => { script.dataset.loaded = '1'; resolve(); };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function addCss(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  async function boot() {
    addCss('mentorAuthCss', './auth.css?v=8.0');
    if (!window.supabase?.createClient) await loadScript('mentorSupabaseSdk', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    if (!window.mentorCloud) await loadScript('mentorCloudSync', './cloud-sync.js?v=5.0');
    if (!window.MentorQgMode) await loadScript('mentorQgModeScript', './qg-mode.js?v=5.0');
    if (!window.MentorReviewEngine) await loadScript('mentorReviewEngine', './review-engine.js?v=6.0');
    if (!window.MentorScheduleEngine) await loadScript('mentorScheduleEngine', './schedule-engine.js?v=6.0');
    if (!window.MentorStudyProfile) await loadScript('mentorStudyProfile', './study-profile.js?v=6.0');
    addCss('mentorLayoutRefresh', './layout-refresh.css?v=8.0');
  }

  window.MentorRuntimeBootstrap = Object.freeze({ version: VERSION, boot });
  boot().catch(error => console.error('Falha ao iniciar módulos do Mentor IA:', error));
})();