(() => {
  'use strict';

  const VERSION = '9.1.1';
  const SUPABASE_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4';
  let visualGuardInstalled = false;
  let guardBusy = false;

  function loadScript(id,src) {
    return new Promise((resolve,reject)=>{
      const existing=document.getElementById(id);
      if (existing) {
        if (existing.dataset.loaded==='1'||existing.readyState==='complete') return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.id=id; script.src=src;
      script.onload=()=>{script.dataset.loaded='1';resolve();};
      script.onerror=reject;
      document.body.appendChild(script);
    });
  }

  function addCss(id,href) {
    let link=document.getElementById(id);
    if (!link) {
      link=document.createElement('link');
      link.id=id; link.rel='stylesheet'; link.href=href; document.head.appendChild(link);
    }
    return link;
  }

  function removeLegacyVisualTheme() {
    document.querySelectorAll('#mentorQgTheme, link[href*="qg-theme.css"]').forEach(node=>node.remove());
  }

  function normalizeLegacyUI() {
    document.querySelector('[data-view="qconcursos"]')?.remove();
    document.querySelectorAll('.bottom-nav [data-go="qconcursos"]').forEach(node=>node.remove());
    document.querySelectorAll('[data-action="start-diagnostic"]').forEach(button=>{
      button.removeAttribute('data-action'); button.dataset.go='acervo';
    });
    const brandSub=document.querySelector('.brand > div > span:last-child');
    if (brandSub) brandSub.textContent='Plano de estudos • PMBA 2026';
    document.title='Mentor IA — PMBA 2026';
    document.documentElement.dataset.mentorRuntime='ready';
  }

  function keepVisualLockLast() {
    removeLegacyVisualTheme();
    const refresh=document.getElementById('mentorLayoutRefresh');
    const lock=addCss('mentorLayoutLock','./layout-lock.css?v=9.1');
    const alreadyOrdered=lock===document.head.lastElementChild&&(!refresh||refresh.nextElementSibling===lock);
    if (alreadyOrdered) return;
    if (refresh) document.head.appendChild(refresh);
    document.head.appendChild(lock);
  }

  function installVisualGuard() {
    if (visualGuardInstalled) return;
    visualGuardInstalled=true;
    const observer=new MutationObserver(mutations=>{
      if (guardBusy) return;
      const changedStyles=mutations.some(mutation=>[...mutation.addedNodes].some(node=>node.nodeType===1&&(node.tagName==='STYLE'||(node.tagName==='LINK'&&node.rel==='stylesheet'))));
      if (!changedStyles) return;
      guardBusy=true;
      queueMicrotask(()=>{try{keepVisualLockLast();}finally{guardBusy=false;}});
    });
    observer.observe(document.head,{childList:true});
  }

  async function boot() {
    addCss('mentorAuthCss','./auth.css?v=9.1');
    if (!window.supabase?.createClient) await loadScript('mentorSupabaseSdk',SUPABASE_SDK);
    if (!window.mentorCloud) await loadScript('mentorCloudSync','./cloud-sync.js?v=9.1');
    if (!window.MentorQgMode) await loadScript('mentorQgModeScript','./qg-mode.js?v=9.1');
    if (!window.MentorReviewEngine) await loadScript('mentorReviewEngine','./review-engine.js?v=9.1');
    if (!window.MentorScheduleEngine) await loadScript('mentorScheduleEngine','./schedule-engine.js?v=9.1');
    if (!window.MentorStudyProfile) await loadScript('mentorStudyProfile','./study-profile.js?v=6.0');

    addCss('mentorEngineCss','./mentor-engine.css?v=7.0');
    if (!window.MentorEngine) await loadScript('mentorEngineScript','./mentor-engine.js?v=7.0');
    await loadScript('mentorP8Bridge','./mentor-p8-bridge.js?v=9.1');

    addCss('mentorExternalCss','./qconcursos-links.css?v=9.0');
    if (!window.MentorExternal) await loadScript('mentorExternalScript','./qconcursos-links.js?v=9.0');
    addCss('mentorQPresetsCss','./q-presets-p8.css?v=9.1.1');
    await loadScript('mentorQPresetsScript','./q-presets-p8.js?v=9.1.1');
    await loadScript('mentorStability','./stability-9.1.js?v=9.1');

    addCss('mentorLayoutRefresh','./layout-refresh.css?v=8.0');
    normalizeLegacyUI();
    keepVisualLockLast();
    installVisualGuard();

    [250,900].forEach(delay=>setTimeout(()=>{normalizeLegacyUI();keepVisualLockLast();},delay));
  }

  window.MentorRuntimeBootstrap=Object.freeze({version:VERSION,boot});
  boot().catch(error=>{
    console.error('Falha ao iniciar módulos do Mentor IA:',error);
    document.documentElement.dataset.mentorRuntime='error';
  });
})();