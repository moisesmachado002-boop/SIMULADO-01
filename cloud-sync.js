(() => {
  'use strict';

  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const CLOUD_VERSION = '1.4.1';
  const APP_PUBLIC_URL = 'https://moisesmachado002-boop.github.io/SIMULADO-01/';

  if (!window.supabase?.createClient) {
    console.error('Supabase SDK não carregou.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  let currentUser = null;
  let syncing = false;
  let applyingCloud = false;
  let syncTimer = null;
  const originalSaveState = window.saveState || saveState;

  function nowIso() {
    return new Date().toISOString();
  }

  function safeDisplayName(user) {
    return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Estudante';
  }

  function setCloudStatus(text, mode = 'neutral') {
    const badge = document.querySelector('#cloudStatusBadge');
    if (!badge) return;
    badge.textContent = text;
    badge.dataset.mode = mode;
  }

  async function persistCloudState() {
    if (!currentUser || syncing || applyingCloud) return;
    syncing = true;
    setCloudStatus('Salvando…', 'syncing');
    try {
      const payload = JSON.parse(JSON.stringify(state));
      payload.cloud = {
        version: CLOUD_VERSION,
        syncedAt: nowIso()
      };

      const { error } = await db
        .from('profiles')
        .upsert({
          id: currentUser.id,
          display_name: safeDisplayName(currentUser),
          app_state: payload,
          updated_at: nowIso()
        }, { onConflict: 'id' });

      if (error) throw error;
      setCloudStatus('Nuvem ✓', 'ok');
    } catch (error) {
      console.error('Falha ao sincronizar Mentor IA:', error);
      setCloudStatus('Erro na nuvem', 'error');
    } finally {
      syncing = false;
    }
  }

  function scheduleCloudSave() {
    if (!currentUser || applyingCloud) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(persistCloudState, 700);
  }

  window.saveState = saveState = function cloudAwareSaveState() {
    originalSaveState();
    scheduleCloudSave();
  };

  function normalizeCloudState(raw) {
    if (!raw || typeof raw !== 'object' || !raw.subjects) return null;
    const qMode = raw.qMode ? { ...raw.qMode } : null;
    const migrated = typeof migrateState === 'function' ? migrateState(raw) : raw;
    if (qMode) migrated.qMode = qMode;
    migrated.version = CLOUD_VERSION;
    return migrated;
  }

  async function loadOrCreateCloudProfile(user) {
    setCloudStatus('Carregando…', 'syncing');
    const { data, error } = await db
      .from('profiles')
      .select('id, display_name, app_state, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    const cloudState = normalizeCloudState(data?.app_state);
    if (cloudState) {
      applyingCloud = true;
      state = cloudState;
      originalSaveState();
      applyingCloud = false;
      if (typeof ensureQState === 'function') ensureQState();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderQSummary === 'function') renderQSummary();
      if (typeof renderQRecommendation === 'function') renderQRecommendation();
      if (typeof renderPresetRecommendation === 'function') renderPresetRecommendation();
      setCloudStatus('Nuvem ✓', 'ok');
      return;
    }

    await persistCloudState();
  }

  function showMessage(message, type = 'neutral') {
    const el = document.querySelector('#authMessage');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
  }

  function setAuthBusy(busy) {
    document.querySelectorAll('#authGate button, #accountSheet button').forEach(btn => {
      btn.disabled = busy;
    });
  }

  function openAuthGate(mode = 'signin') {
    const gate = document.querySelector('#authGate');
    if (!gate) return;
    gate.classList.add('open');
    gate.dataset.mode = mode;
    document.querySelector('#authTitle').textContent = mode === 'signup' ? 'Criar sua conta' : 'Entrar na Mentor IA';
    document.querySelector('#authPrimaryBtn').textContent = mode === 'signup' ? 'Criar conta' : 'Entrar';
    document.querySelector('#authNameWrap').classList.toggle('hidden', mode !== 'signup');
    document.querySelector('#authSwitchBtn').textContent = mode === 'signup' ? 'Já tenho conta' : 'Criar uma conta';
    showMessage('');
  }

  function closeAuthGate() {
    document.querySelector('#authGate')?.classList.remove('open');
  }

  function openAccountSheet() {
    if (!currentUser) {
      openAuthGate('signin');
      return;
    }
    const sheet = document.querySelector('#accountSheet');
    if (!sheet) return;
    document.querySelector('#accountEmail').textContent = currentUser.email || 'Conta conectada';
    sheet.classList.add('open');
  }

  function closeAccountSheet() {
    document.querySelector('#accountSheet')?.classList.remove('open');
  }

  async function submitAuth() {
    const gate = document.querySelector('#authGate');
    const mode = gate?.dataset.mode || 'signin';
    const email = document.querySelector('#authEmail')?.value.trim() || '';
    const password = document.querySelector('#authPassword')?.value || '';
    const name = document.querySelector('#authName')?.value.trim() || '';

    if (!email || !email.includes('@')) return showMessage('Informe um e-mail válido.', 'error');
    if (password.length < 6) return showMessage('A senha precisa ter pelo menos 6 caracteres.', 'error');

    setAuthBusy(true);
    showMessage(mode === 'signup' ? 'Criando conta…' : 'Entrando…');
    try {
      if (mode === 'signup') {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: APP_PUBLIC_URL,
            data: { display_name: name || email.split('@')[0] }
          }
        });
        if (error) throw error;
        if (!data.session) {
          showMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.', 'ok');
          return;
        }
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      console.error(error);
      showMessage(error?.message || 'Não foi possível autenticar.', 'error');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthBusy(true);
    try {
      await persistCloudState();
      const { error } = await db.auth.signOut();
      if (error) throw error;
      closeAccountSheet();
    } catch (error) {
      console.error(error);
      alert('Não foi possível sair agora.');
    } finally {
      setAuthBusy(false);
    }
  }

  function updateAuthUI(user) {
    currentUser = user || null;
    const accountButton = document.querySelector('#accountButton');
    if (accountButton) {
      accountButton.title = currentUser ? `Conta: ${currentUser.email || ''}` : 'Entrar e sincronizar';
      accountButton.querySelector('span').textContent = currentUser ? '☁' : '♙';
    }
    if (currentUser) {
      closeAuthGate();
      setCloudStatus('Nuvem ✓', 'ok');
    } else {
      setCloudStatus('Somente local', 'neutral');
    }
  }

  async function onAuthenticated(user) {
    updateAuthUI(user);
    try {
      await loadOrCreateCloudProfile(user);
    } catch (error) {
      console.error('Erro ao carregar dados da nuvem:', error);
      setCloudStatus('Erro na nuvem', 'error');
    }
  }

  function injectCloudUI() {
    if (document.querySelector('#authGate')) return;

    const header = document.querySelector('.topbar');
    if (header) {
      const tools = document.createElement('div');
      tools.className = 'cloud-tools';
      tools.innerHTML = `
        <span id="cloudStatusBadge" class="cloud-status" data-mode="neutral">Somente local</span>
        <button class="icon-button account-button" id="accountButton" aria-label="Conta e sincronização" title="Entrar e sincronizar"><span>♙</span></button>
      `;
      header.appendChild(tools);
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div class="auth-gate" id="authGate" data-mode="signin">
        <div class="auth-card">
          <button class="auth-close" id="authCloseBtn" aria-label="Fechar">×</button>
          <div class="auth-logo">M</div>
          <span class="eyebrow">MENTOR IA • NUVEM</span>
          <h2 id="authTitle">Entrar na Mentor IA</h2>
          <p>Seu progresso, histórico e mapa de conhecimento ficam salvos no Supabase e podem ser recuperados em outro aparelho.</p>
          <label id="authNameWrap" class="hidden">Nome
            <input id="authName" type="text" autocomplete="name" maxlength="60" placeholder="Seu nome" />
          </label>
          <label>E-mail
            <input id="authEmail" type="email" autocomplete="email" inputmode="email" placeholder="seu@email.com" />
          </label>
          <label>Senha
            <input id="authPassword" type="password" autocomplete="current-password" minlength="6" placeholder="Mínimo de 6 caracteres" />
          </label>
          <button class="primary auth-primary" id="authPrimaryBtn">Entrar</button>
          <button class="text-button auth-switch" id="authSwitchBtn">Criar uma conta</button>
          <div class="auth-message" id="authMessage"></div>
          <button class="secondary local-only" id="localOnlyBtn">Continuar só neste aparelho</button>
          <small>O modo local continua funcionando, mas não terá backup na nuvem.</small>
        </div>
      </div>

      <div class="account-sheet" id="accountSheet">
        <div class="account-card">
          <button class="auth-close" id="accountCloseBtn" aria-label="Fechar">×</button>
          <span class="eyebrow">CONTA CONECTADA</span>
          <h2>Mentor IA na nuvem</h2>
          <p id="accountEmail"></p>
          <button class="primary" id="syncNowBtn">Sincronizar agora</button>
          <button class="secondary" id="signOutBtn">Sair da conta</button>
        </div>
      </div>
    `);

    document.querySelector('#accountButton')?.addEventListener('click', openAccountSheet);
    document.querySelector('#authCloseBtn')?.addEventListener('click', closeAuthGate);
    document.querySelector('#accountCloseBtn')?.addEventListener('click', closeAccountSheet);
    document.querySelector('#localOnlyBtn')?.addEventListener('click', closeAuthGate);
    document.querySelector('#authPrimaryBtn')?.addEventListener('click', submitAuth);
    document.querySelector('#authSwitchBtn')?.addEventListener('click', () => {
      const mode = document.querySelector('#authGate')?.dataset.mode === 'signup' ? 'signin' : 'signup';
      openAuthGate(mode);
    });
    document.querySelector('#syncNowBtn')?.addEventListener('click', persistCloudState);
    document.querySelector('#signOutBtn')?.addEventListener('click', signOut);
    document.querySelector('#authPassword')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitAuth();
    });
  }

  async function bootCloud() {
    injectCloudUI();

    document.title = 'Mentor IA v1.4.1 — questões reais + nuvem';
    document.querySelectorAll('.version-badge').forEach(el => el.textContent = 'v1.4.1');
    const heroEyebrow = document.querySelector('[data-view="inicio"] .hero-card .eyebrow');
    if (heroEyebrow) heroEyebrow.textContent = 'MENTORA ADAPTATIVA • V1.4.1';
    const qEyebrow = document.querySelector('[data-view="qconcursos"] .section-heading .eyebrow');
    if (qEyebrow) qEyebrow.textContent = 'QUESTÕES REAIS • V1.4.1';

    const historyIntro = document.querySelector('[data-view="historico"] .section-heading.standalone p');
    if (historyIntro) historyIntro.textContent = 'Entre na sua conta para manter seus registros sincronizados no Supabase. O modo local continua disponível como contingência.';

    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      await onAuthenticated(session.user);
    } else {
      updateAuthUI(null);
      openAuthGate('signin');
    }

    db.auth.onAuthStateChange(async (event, sessionNow) => {
      if (event === 'SIGNED_IN' && sessionNow?.user) {
        await onAuthenticated(sessionNow.user);
      } else if (event === 'SIGNED_OUT') {
        updateAuthUI(null);
        openAuthGate('signin');
      } else if (event === 'TOKEN_REFRESHED' && sessionNow?.user) {
        currentUser = sessionNow.user;
      }
    });
  }

  window.mentorCloud = {
    syncNow: persistCloudState,
    openLogin: () => openAuthGate('signin'),
    get user() { return currentUser; }
  };

  bootCloud().catch(error => {
    console.error('Falha ao iniciar nuvem:', error);
    setCloudStatus('Nuvem indisponível', 'error');
  });
})();
