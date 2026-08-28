(() => {
  'use strict';

  const VERSION = '4.10.0';
  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const $ = (s) => document.querySelector(s);
  let db = null;
  let user = null;
  let timerState = null;
  let subjects = [];
  let topics = [];
  let tickHandle = null;
  let syncHandle = null;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('mentor-study-timer-v410') : null;

  function getDb() {
    if (db) return db;
    if (!window.supabase?.createClient) return null;
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return db;
  }

  function toast(text, kind = 'neutral') {
    const node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
    node.classList.add('show');
    clearTimeout(window.__studyTimerToast);
    window.__studyTimerToast = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function esc(v = '') {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function elapsedSeconds(st = timerState) {
    if (!st) return 0;
    let total = Number(st.accumulated_seconds || 0);
    if (st.status === 'running' && st.running_since) {
      const started = Date.parse(st.running_since);
      if (Number.isFinite(started)) total += Math.max(0, Math.floor((Date.now() - started) / 1000));
    }
    return total;
  }

  function subjectName(id) {
    return subjects.find(x => x.id === id)?.name || 'Matéria';
  }

  function topicName(id) {
    const t = topics.find(x => x.id === id);
    return t ? `${t.syllabus_code ? t.syllabus_code + ' • ' : ''}${t.title}` : 'Assunto';
  }

  function injectStyles() {
    if ($('#studyTimerV410Styles')) return;
    const style = document.createElement('style');
    style.id = 'studyTimerV410Styles';
    style.textContent = `
      #studyTimerPill{position:fixed;right:20px;bottom:24px;z-index:9500;border:0;border-radius:999px;background:#101820;color:#fff;box-shadow:0 10px 30px #0003;padding:11px 16px;font-weight:850;font-size:14px;display:flex;align-items:center;gap:9px;cursor:pointer}
      #studyTimerPill[data-running="true"]{background:#174f2c}
      #studyTimerPill .st-dot{width:9px;height:9px;border-radius:50%;background:#999}
      #studyTimerPill[data-running="true"] .st-dot{background:#36d86d;box-shadow:0 0 0 4px #36d86d22}
      #studyTimerModal{position:fixed;inset:0;z-index:99990;background:#0009;display:none;align-items:center;justify-content:center;padding:16px}
      #studyTimerModal.open{display:flex}
      #studyTimerCard{width:min(560px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:22px;padding:24px;box-shadow:0 25px 70px #0005;box-sizing:border-box}
      #studyTimerCard h2{font-size:30px;line-height:1.08;margin:4px 0 8px}
      #studyTimerCard .st-kicker{font-size:12px;letter-spacing:.1em;font-weight:900;color:#897100}
      #studyTimerCard .st-close{float:right;border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer}
      #studyTimerCard label{display:block;font-weight:800;margin-top:14px}
      #studyTimerCard select,#studyTimerCard input{width:100%;box-sizing:border-box;margin-top:7px;padding:13px;border:1px solid #d7d7d7;border-radius:11px;background:#fff;font:inherit}
      #studyTimerCard .st-clock{font-variant-numeric:tabular-nums;font-size:54px;line-height:1;text-align:center;font-weight:900;letter-spacing:-.04em;margin:22px 0 10px}
      #studyTimerCard .st-status{text-align:center;font-weight:800;color:#666;margin-bottom:18px}
      #studyTimerCard .st-topic{padding:14px;border-radius:13px;background:#f4f5f6;border-left:5px solid #f2c500;margin:14px 0}
      #studyTimerCard .st-topic strong{display:block;font-size:17px;margin-bottom:4px}
      #studyTimerCard .st-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
      #studyTimerCard button.st-primary,#studyTimerCard button.st-secondary,#studyTimerCard button.st-danger{border-radius:12px;padding:13px 14px;font-weight:900;font-size:16px;cursor:pointer}
      #studyTimerCard button.st-primary{background:#f2c500;border:1px solid #c9a700;color:#111}
      #studyTimerCard button.st-secondary{background:#fff;border:1px solid #bbb;color:#222}
      #studyTimerCard button.st-danger{background:#fff;border:1px solid #d66;color:#a22}
      #studyTimerCard button:disabled{opacity:.55;cursor:not-allowed}
      #studyTimerCard .st-hint{font-size:13px;line-height:1.4;color:#666;margin-top:12px}
      #studyTimerStartBox[hidden],#studyTimerActiveBox[hidden]{display:none!important}
      @media(max-width:620px){
        #studyTimerPill{right:14px;bottom:76px;padding:10px 13px;font-size:13px}
        #studyTimerModal{align-items:flex-end;padding:0}
        #studyTimerCard{width:100%;max-height:92dvh;border-radius:22px 22px 0 0;padding:22px 18px calc(22px + env(safe-area-inset-bottom))}
        #studyTimerCard .st-clock{font-size:46px}
      }
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if ($('#studyTimerPill')) return;
    injectStyles();
    const pill = document.createElement('button');
    pill.id = 'studyTimerPill';
    pill.type = 'button';
    pill.innerHTML = '<span class="st-dot"></span><span>⏱ Cronômetro</span><span id="studyTimerPillTime">00:00</span>';
    pill.addEventListener('click', () => openModal());
    document.body.appendChild(pill);

    const modal = document.createElement('div');
    modal.id = 'studyTimerModal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `
      <div id="studyTimerCard">
        <button class="st-close" id="studyTimerClose" aria-label="Fechar">×</button>
        <div class="st-kicker">TEMPO LÍQUIDO DE ESTUDO</div>
        <h2>Cronômetro por assunto</h2>
        <div id="studyTimerStartBox">
          <label>O que vai fazer?
            <select id="studyTimerActivity">
              <option value="study">Estudo / teoria</option>
              <option value="review">Revisão do assunto</option>
            </select>
          </label>
          <label>Matéria
            <select id="studyTimerSubject"><option value="">Escolha</option></select>
          </label>
          <label>Assunto
            <select id="studyTimerTopic"><option value="">Escolha a matéria primeiro</option></select>
          </label>
          <button class="st-primary" id="studyTimerStart" style="width:100%;margin-top:18px">▶ Iniciar cronômetro</button>
          <div class="st-hint">Trocar de aba, abrir PDF ou videoaula não pausa. O tempo só para quando você tocar em <b>Pausar</b>.</div>
        </div>
        <div id="studyTimerActiveBox" hidden>
          <div class="st-clock" id="studyTimerClock">00:00:00</div>
          <div class="st-status" id="studyTimerStatus">Em andamento</div>
          <div class="st-topic"><strong id="studyTimerActiveSubject"></strong><span id="studyTimerActiveTopic"></span></div>
          <label>Observação ao finalizar <span style="font-weight:400;color:#777">(opcional)</span>
            <input id="studyTimerNotes" maxlength="240" placeholder="Ex.: lei seca + resumo, videoaula, PDF..." />
          </label>
          <div class="st-actions">
            <button class="st-secondary" id="studyTimerPause">⏸ Pausar</button>
            <button class="st-primary" id="studyTimerFinish">✓ Finalizar e salvar</button>
            <button class="st-secondary" id="studyTimerResume" hidden>▶ Retomar</button>
            <button class="st-danger" id="studyTimerCancel">Cancelar sessão</button>
          </div>
          <div class="st-hint">Ao finalizar, o tempo líquido exato é salvo no assunto e passa a compor suas métricas de estudo.</div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    $('#studyTimerClose').onclick = closeModal;
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    $('#studyTimerSubject').addEventListener('change', fillTopics);
    $('#studyTimerStart').addEventListener('click', startTimer);
    $('#studyTimerPause').addEventListener('click', pauseTimer);
    $('#studyTimerResume').addEventListener('click', resumeTimer);
    $('#studyTimerFinish').addEventListener('click', finishTimer);
    $('#studyTimerCancel').addEventListener('click', cancelTimer);
  }

  function fillSubjects() {
    const sel = $('#studyTimerSubject');
    if (!sel) return;
    sel.innerHTML = '<option value="">Escolha</option>' + subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    fillTopics();
  }

  function fillTopics() {
    const subjectId = $('#studyTimerSubject')?.value || '';
    const sel = $('#studyTimerTopic');
    if (!sel) return;
    const rows = topics.filter(t => t.subject_id === subjectId);
    sel.innerHTML = rows.length
      ? '<option value="">Escolha</option>' + rows.map(t => `<option value="${esc(t.id)}">${esc((t.syllabus_code ? t.syllabus_code + ' • ' : '') + t.title)}</option>`).join('')
      : '<option value="">Escolha a matéria primeiro</option>';
  }

  function openModal() {
    $('#studyTimerModal')?.classList.add('open');
    $('#studyTimerModal')?.setAttribute('aria-hidden','false');
    render();
  }

  function closeModal() {
    $('#studyTimerModal')?.classList.remove('open');
    $('#studyTimerModal')?.setAttribute('aria-hidden','true');
  }

  function render() {
    const active = !!timerState;
    const startBox = $('#studyTimerStartBox');
    const activeBox = $('#studyTimerActiveBox');
    if (startBox) startBox.hidden = active;
    if (activeBox) activeBox.hidden = !active;

    const sec = elapsedSeconds();
    const clock = $('#studyTimerClock');
    if (clock) clock.textContent = fmt(sec);
    const pillTime = $('#studyTimerPillTime');
    if (pillTime) pillTime.textContent = sec >= 3600 ? fmt(sec) : fmt(sec).slice(3);
    const pill = $('#studyTimerPill');
    if (pill) pill.dataset.running = String(timerState?.status === 'running');

    if (!active) return;
    $('#studyTimerActiveSubject').textContent = subjectName(timerState.subject_id);
    $('#studyTimerActiveTopic').textContent = topicName(timerState.topic_id);
    $('#studyTimerStatus').textContent = timerState.status === 'running' ? '● Em andamento' : 'Pausado';
    $('#studyTimerPause').hidden = timerState.status !== 'running';
    $('#studyTimerResume').hidden = timerState.status === 'running';
  }

  async function refreshState(silent = false) {
    const client = getDb();
    if (!client || !user) return;
    const { data, error } = await client.from('study_timer_state').select('*').eq('user_id', user.id).maybeSingle();
    if (error) { if (!silent) console.warn('timer state', error); return; }
    timerState = data || null;
    render();
  }

  async function startTimer() {
    const client = getDb();
    const subjectId = $('#studyTimerSubject')?.value || '';
    const topicId = $('#studyTimerTopic')?.value || '';
    const activity = $('#studyTimerActivity')?.value || 'study';
    if (!subjectId || !topicId) return toast('Escolha a matéria e o assunto.', 'error');
    const btn = $('#studyTimerStart'); btn.disabled = true;
    try {
      const { data, error } = await client.rpc('start_study_timer', { p_subject_id: subjectId, p_topic_id: topicId, p_activity_type: activity });
      if (error) throw error;
      timerState = data;
      channel?.postMessage('sync');
      render();
      toast('Cronômetro iniciado.', 'ok');
    } catch (e) { toast(e?.message || 'Não foi possível iniciar.', 'error'); }
    finally { btn.disabled = false; }
  }

  async function pauseTimer() {
    const btn = $('#studyTimerPause'); btn.disabled = true;
    try {
      const { data, error } = await getDb().rpc('pause_study_timer');
      if (error) throw error;
      timerState = data; channel?.postMessage('sync'); render();
    } catch (e) { toast(e?.message || 'Não foi possível pausar.', 'error'); }
    finally { btn.disabled = false; }
  }

  async function resumeTimer() {
    const btn = $('#studyTimerResume'); btn.disabled = true;
    try {
      const { data, error } = await getDb().rpc('resume_study_timer');
      if (error) throw error;
      timerState = data; channel?.postMessage('sync'); render();
    } catch (e) { toast(e?.message || 'Não foi possível retomar.', 'error'); }
    finally { btn.disabled = false; }
  }

  async function finishTimer() {
    const sec = elapsedSeconds();
    if (sec < 5) return toast('Deixe o cronômetro rodar pelo menos alguns segundos.', 'error');
    const btn = $('#studyTimerFinish'); btn.disabled = true;
    try {
      const notes = ($('#studyTimerNotes')?.value || '').trim();
      const { data, error } = await getDb().rpc('finish_study_timer', { p_notes: notes || null });
      if (error) throw error;
      timerState = null;
      if ($('#studyTimerNotes')) $('#studyTimerNotes').value = '';
      channel?.postMessage('sync');
      render();
      closeModal();
      toast(`Sessão salva: ${fmt(Number(data?.duration_seconds || sec))} líquidos.`, 'ok');
      setTimeout(() => $('#dailyRefreshButton')?.click(), 150);
    } catch (e) { toast(e?.message || 'Não foi possível salvar a sessão.', 'error'); }
    finally { btn.disabled = false; }
  }

  async function cancelTimer() {
    if (!confirm('Cancelar esta sessão? O tempo atual não será salvo.')) return;
    const btn = $('#studyTimerCancel'); btn.disabled = true;
    try {
      const { error } = await getDb().rpc('cancel_study_timer');
      if (error) throw error;
      timerState = null; channel?.postMessage('sync'); render(); closeModal(); toast('Sessão cancelada.');
    } catch (e) { toast(e?.message || 'Não foi possível cancelar.', 'error'); }
    finally { btn.disabled = false; }
  }

  async function boot() {
    injectUi();
    const client = getDb();
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    user = session?.user || null;
    if (!user) return;
    const [sR, tR] = await Promise.all([
      client.from('subjects').select('id,name,position').eq('active',true).order('position'),
      client.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position')
    ]);
    if (!sR.error) subjects = sR.data || [];
    if (!tR.error) topics = tR.data || [];
    fillSubjects();
    await refreshState(true);
    clearInterval(tickHandle);
    tickHandle = setInterval(render, 1000);
    clearInterval(syncHandle);
    syncHandle = setInterval(() => refreshState(true), 15000);
    channel?.addEventListener('message', () => refreshState(true));
    window.addEventListener('focus', () => refreshState(true));
    window.MentorStudyTimer = { version: VERSION, open: openModal, refresh: refreshState };
  }

  let tries = 0;
  const wait = setInterval(() => {
    tries++;
    if (window.supabase?.createClient && document.body) {
      clearInterval(wait);
      boot().catch(e => console.warn('Study timer boot', e));
    } else if (tries > 120) clearInterval(wait);
  }, 250);
})();
