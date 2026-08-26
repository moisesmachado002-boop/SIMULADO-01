(() => {
  'use strict';

  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const CLOUD_VERSION = '9.1';
  const APP_PUBLIC_URL = 'https://moisesmachado002-boop.github.io/SIMULADO-01/';

  if (!window.supabase?.createClient) {
    console.error('Supabase SDK não carregou.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  let currentUser = null;
  let syncing = false;
  let applyingCloud = false;
  let syncTimer = null;
  const originalSaveState = window.saveState || (typeof saveState === 'function' ? saveState : null);

  function nowIso() { return new Date().toISOString(); }
  function safeName(user) { return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Estudante'; }

  function timeValue(value) {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  function stateStamp(payload, profileUpdatedAt='') {
    if (!payload || typeof payload !== 'object') return 0;
    const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
    const lastAttempt = attempts.reduce((max,item) => Math.max(max,timeValue(item?.at)),0);
    return Math.max(
      lastAttempt,
      timeValue(payload.cloud?.localUpdatedAt),
      timeValue(payload.cloud?.syncedAt),
      timeValue(profileUpdatedAt)
    );
  }

  function setCloudStatus(text,mode='neutral') {
    const badge=document.querySelector('#cloudStatusBadge');
    if (!badge) return;
    badge.textContent=text;
    badge.dataset.mode=mode;
  }

  function showMessage(message,type='neutral') {
    const node=document.querySelector('#authMessage');
    if (!node) return;
    node.textContent=message;
    node.dataset.type=type;
  }

  function setBusy(busy) {
    document.querySelectorAll('#authGate button, #accountSheet button').forEach(button => button.disabled=busy);
  }

  function localSnapshot() {
    if (typeof state === 'undefined' || !state || typeof state !== 'object') return null;
    return JSON.parse(JSON.stringify(state));
  }

  async function persistCloudState() {
    if (!currentUser || syncing || applyingCloud || typeof state === 'undefined') return;
    syncing=true;
    setCloudStatus('Salvando…','syncing');
    try {
      if (!state.cloud || typeof state.cloud !== 'object') state.cloud={};
      if (!state.cloud.localUpdatedAt) state.cloud.localUpdatedAt=nowIso();
      const payload=JSON.parse(JSON.stringify(state));
      payload.cloud={...payload.cloud,version:CLOUD_VERSION,syncedAt:nowIso()};
      const {error}=await db.from('profiles').upsert({
        id:currentUser.id,
        display_name:safeName(currentUser),
        app_state:payload,
        updated_at:payload.cloud.syncedAt
      },{onConflict:'id'});
      if (error) throw error;
      state.cloud={...state.cloud,syncedAt:payload.cloud.syncedAt,version:CLOUD_VERSION};
      originalSaveState?.();
      setCloudStatus('Nuvem ✓','ok');
    } catch(error) {
      console.error('Falha ao sincronizar Mentor IA:',error);
      setCloudStatus('Erro na nuvem','error');
    } finally {
      syncing=false;
    }
  }

  function scheduleCloudSave() {
    if (!currentUser || applyingCloud) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(persistCloudState,700);
  }

  if (originalSaveState && typeof saveState === 'function') {
    window.saveState = saveState = function cloudAwareSaveState() {
      if (!applyingCloud && typeof state !== 'undefined') {
        state.cloud={...(state.cloud||{}),version:CLOUD_VERSION,localUpdatedAt:nowIso()};
      }
      originalSaveState();
      scheduleCloudSave();
    };
  }

  function normalizeCloudState(raw) {
    if (!raw || typeof raw !== 'object' || !raw.subjects) return null;
    const qMode=raw.qMode?{...raw.qMode}:null;
    const migrated=typeof migrateState==='function'?migrateState(raw):raw;
    if (qMode) migrated.qMode=qMode;
    migrated.cloud={...(raw.cloud||{}),version:CLOUD_VERSION};
    return migrated;
  }

  function applyState(next) {
    if (!next || typeof state==='undefined') return;
    applyingCloud=true;
    state=next;
    originalSaveState?.();
    applyingCloud=false;
    if (typeof ensureQState==='function') ensureQState();
    if (typeof renderDashboard==='function') renderDashboard();
    if (typeof renderQSummary==='function') renderQSummary();
    if (typeof renderQRecommendation==='function') renderQRecommendation();
    if (typeof renderPresetRecommendation==='function') renderPresetRecommendation();
  }

  async function loadOrCreateProfile(user) {
    setCloudStatus('Carregando…','syncing');
    const {data,error}=await db.from('profiles').select('id,display_name,app_state,updated_at').eq('id',user.id).maybeSingle();
    if (error) throw error;

    const cloudState=normalizeCloudState(data?.app_state);
    const localState=localSnapshot();
    const cloudTime=stateStamp(cloudState,data?.updated_at);
    const localTime=stateStamp(localState);

    if (cloudState && cloudTime > localTime + 1000) {
      applyState(cloudState);
      setCloudStatus('Nuvem ✓','ok');
      return;
    }

    if (localState && localTime > cloudTime + 1000) {
      await persistCloudState();
      return;
    }

    if (cloudState) {
      applyState(cloudState);
      setCloudStatus('Nuvem ✓','ok');
      return;
    }

    await persistCloudState();
  }

  function openAuth(mode='signin') {
    const gate=document.querySelector('#authGate');
    if (!gate) return;
    gate.classList.add('open');
    gate.dataset.mode=mode;
    document.querySelector('#authTitle').textContent=mode==='signup'?'Criar sua conta':'Entrar na Mentor IA';
    document.querySelector('#authPrimaryBtn').textContent=mode==='signup'?'Criar conta':'Entrar';
    document.querySelector('#authNameWrap')?.classList.toggle('hidden',mode!=='signup');
    document.querySelector('#authSwitchBtn').textContent=mode==='signup'?'Já tenho conta':'Criar uma conta';
    showMessage('');
  }

  function closeAuth() { document.querySelector('#authGate')?.classList.remove('open'); }

  function openAccount() {
    if (!currentUser) return openAuth('signin');
    document.querySelector('#accountEmail').textContent=currentUser.email||'Conta conectada';
    document.querySelector('#accountSheet')?.classList.add('open');
  }

  async function submitAuth() {
    const mode=document.querySelector('#authGate')?.dataset.mode||'signin';
    const email=document.querySelector('#authEmail')?.value.trim()||'';
    const password=document.querySelector('#authPassword')?.value||'';
    const name=document.querySelector('#authName')?.value.trim()||'';
    if (!email.includes('@')) return showMessage('Informe um e-mail válido.','error');
    if (password.length<8) return showMessage('A senha precisa ter pelo menos 8 caracteres.','error');

    setBusy(true);
    showMessage(mode==='signup'?'Criando conta…':'Entrando…');
    try {
      if (mode==='signup') {
        const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:APP_PUBLIC_URL,data:{display_name:name||email.split('@')[0]}}});
        if (error) throw error;
        if (!data.session) return showMessage('Conta criada. Confirme o e-mail e depois entre.','ok');
      } else {
        const {error}=await db.auth.signInWithPassword({email,password});
        if (error) throw error;
      }
    } catch(error) {
      console.error(error);
      showMessage(error?.message||'Não foi possível autenticar.','error');
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      await persistCloudState();
      const {error}=await db.auth.signOut();
      if (error) throw error;
      document.querySelector('#accountSheet')?.classList.remove('open');
    } catch(error) {
      console.error(error);
      alert('Não foi possível sair agora.');
    } finally { setBusy(false); }
  }

  function updateUI(user) {
    currentUser=user||null;
    const button=document.querySelector('#accountButton');
    if (button) {
      button.title=currentUser?`Conta: ${currentUser.email||''}`:'Entrar e sincronizar';
      button.querySelector('span').textContent=currentUser?'☁':'♙';
    }
    if (currentUser) { closeAuth(); setCloudStatus('Nuvem ✓','ok'); }
    else setCloudStatus('Somente local','neutral');
  }

  async function onAuthenticated(user) {
    updateUI(user);
    try { await loadOrCreateProfile(user); }
    catch(error) {
      console.error('Erro ao carregar dados da nuvem:',error);
      setCloudStatus('Erro na nuvem','error');
    }
  }

  function injectUI() {
    if (document.querySelector('#authGate')) return;
    const header=document.querySelector('.topbar');
    if (header) {
      const tools=document.createElement('div');
      tools.className='cloud-tools';
      tools.innerHTML='<span id="cloudStatusBadge" class="cloud-status" data-mode="neutral">Somente local</span><button class="icon-button account-button" id="accountButton" aria-label="Conta e sincronização" title="Entrar e sincronizar"><span>♙</span></button>';
      header.appendChild(tools);
    }

    document.body.insertAdjacentHTML('beforeend',`
      <div class="auth-gate" id="authGate" data-mode="signin"><div class="auth-card">
        <button class="auth-close" id="authCloseBtn" aria-label="Fechar">×</button><div class="auth-logo">M</div><span class="eyebrow">MENTOR IA • NUVEM</span>
        <h2 id="authTitle">Entrar na Mentor IA</h2><p>Seu progresso e seu banco privado ficam vinculados à sua conta.</p>
        <label id="authNameWrap" class="hidden">Nome<input id="authName" type="text" autocomplete="name" maxlength="60" placeholder="Seu nome" /></label>
        <label>E-mail<input id="authEmail" type="email" autocomplete="email" inputmode="email" placeholder="seu@email.com" /></label>
        <label>Senha<input id="authPassword" type="password" autocomplete="current-password" minlength="8" placeholder="Mínimo de 8 caracteres" /></label>
        <button class="primary auth-primary" id="authPrimaryBtn">Entrar</button><button class="text-button auth-switch" id="authSwitchBtn">Criar uma conta</button>
        <div class="auth-message" id="authMessage"></div><button class="secondary local-only" id="localOnlyBtn">Continuar só neste aparelho</button><small>As questões privadas exigem login.</small>
      </div></div>
      <div class="account-sheet" id="accountSheet"><div class="account-card"><button class="auth-close" id="accountCloseBtn" aria-label="Fechar">×</button><span class="eyebrow">CONTA CONECTADA</span><h2>Mentor IA na nuvem</h2><p id="accountEmail"></p><button class="primary" id="syncNowBtn">Sincronizar agora</button><button class="secondary" id="signOutBtn">Sair da conta</button></div></div>`);

    document.querySelector('#accountButton')?.addEventListener('click',openAccount);
    document.querySelector('#authCloseBtn')?.addEventListener('click',closeAuth);
    document.querySelector('#accountCloseBtn')?.addEventListener('click',()=>document.querySelector('#accountSheet')?.classList.remove('open'));
    document.querySelector('#localOnlyBtn')?.addEventListener('click',closeAuth);
    document.querySelector('#authPrimaryBtn')?.addEventListener('click',submitAuth);
    document.querySelector('#authSwitchBtn')?.addEventListener('click',()=>openAuth(document.querySelector('#authGate')?.dataset.mode==='signup'?'signin':'signup'));
    document.querySelector('#syncNowBtn')?.addEventListener('click',persistCloudState);
    document.querySelector('#signOutBtn')?.addEventListener('click',signOut);
    document.querySelector('#authPassword')?.addEventListener('keydown',event=>{if(event.key==='Enter')submitAuth();});
  }

  function loadBankAssets() {
    if (!document.querySelector('#mentorBankCss')) {
      const css=document.createElement('link');
      css.id='mentorBankCss'; css.rel='stylesheet'; css.href='./bank-mode.css?v=9.1'; document.head.appendChild(css);
    }
    if (!document.querySelector('#mentorBankScript')) {
      const script=document.createElement('script');
      script.id='mentorBankScript'; script.src='./bank-mode.js?v=9.1'; script.defer=true; document.body.appendChild(script);
    }
  }

  window.mentorCloud={client:db,syncNow:persistCloudState,openLogin:()=>openAuth('signin'),get user(){return currentUser;}};

  async function boot() {
    injectUI();
    loadBankAssets();
    const {data:{session}}=await db.auth.getSession();
    if (session?.user) await onAuthenticated(session.user);
    else { updateUI(null); openAuth('signin'); }
    db.auth.onAuthStateChange(async(event,sessionNow)=>{
      if (event==='SIGNED_IN'&&sessionNow?.user) await onAuthenticated(sessionNow.user);
      else if (event==='SIGNED_OUT') { updateUI(null); openAuth('signin'); }
      else if (event==='TOKEN_REFRESHED'&&sessionNow?.user) currentUser=sessionNow.user;
    });
  }

  boot().catch(error=>{
    console.error('Falha ao iniciar nuvem:',error);
    setCloudStatus('Nuvem indisponível','error');
  });
})();