(() => {
  'use strict';
  if (window.__mentorPresencialSourceV504) return;
  window.__mentorPresencialSourceV504 = true;

  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const SOURCES = Object.freeze({
    qconcursos: { label: 'QConcursos', helper: 'Registre aqui o resultado da bateria feita no QConcursos.' },
    internet: { label: 'Questões Internet', helper: 'Registre questões feitas em sites, PDFs públicos ou outras fontes da internet.' },
    presencial: { label: 'Presencial', helper: 'Registre as questões feitas durante o curso presencial.' }
  });

  let source = 'qconcursos';
  let db = null;
  const $ = selector => document.querySelector(selector);

  function toast(text, kind = 'neutral') {
    const node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
    node.classList.add('show');
    clearTimeout(window.__presencialToast);
    window.__presencialToast = setTimeout(() => node.classList.remove('show'), 3200);
  }

  function client() {
    if (db) return db;
    if (!window.supabase?.createClient) return null;
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return db;
  }

  function injectStyles() {
    if ($('#mentorPresencialSourceStyles')) return;
    const style = document.createElement('style');
    style.id = 'mentorPresencialSourceStyles';
    style.textContent = `
      .external-source-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}
      .external-source-tabs button{border:1px solid #d9d9d9;background:#fff;color:#333;border-radius:999px;padding:10px 14px;font:700 13px/1 system-ui;cursor:pointer}
      .external-source-tabs button.active{background:#111;color:#fff;border-color:#111}
      #externalSourceUrlWrap{margin-top:12px}
      #externalSourceUrlWrap[hidden]{display:none!important}
      #externalSourceUrl{width:100%;box-sizing:border-box}
      .external-source-hint{margin:10px 0 0;color:#666;font-size:13px;line-height:1.4}
      @media(max-width:520px){.external-source-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.external-source-tabs button{padding:10px 6px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function sourceLabel(kind) {
    return SOURCES[kind]?.label || 'Externa';
  }

  function updateUi() {
    const tabs = $('#externalSourceTabs');
    if (!tabs) return;
    tabs.querySelectorAll('[data-external-source]').forEach(button => button.classList.toggle('active', button.dataset.externalSource === source));

    const boardLabel = $('#qcBoard')?.closest('label');
    const actions = $('#qcOpenButton')?.closest('.actions');
    const urlWrap = $('#externalSourceUrlWrap');
    const preview = $('#qcPreview');
    const recordButton = $('#qcRecordButton');
    const message = $('#qcMessage');
    const resultHeading = $('#qcRecordButton')?.closest('.qc-result-panel')?.querySelector('.panel-heading h2');
    const resultSmall = $('#qcRecordButton')?.closest('.qc-result-panel')?.querySelector('.panel-heading small');

    if (boardLabel) boardLabel.hidden = source !== 'qconcursos';
    if (actions) actions.hidden = source !== 'qconcursos';
    if (urlWrap) urlWrap.hidden = source !== 'internet';
    if (resultHeading) resultHeading.textContent = source === 'presencial' ? 'Registrar curso presencial' : source === 'internet' ? 'Registrar questões da internet' : 'Registrar bateria';
    if (resultSmall) resultSmall.textContent = source === 'presencial' ? '2 • LANCE O RESULTADO DO CURSO' : source === 'internet' ? '2 • LANCE O RESULTADO DA INTERNET' : '2 • VOLTE COM O RESULTADO';
    if (recordButton) recordButton.textContent = source === 'presencial' ? 'Registrar presencial' : source === 'internet' ? 'Registrar internet' : 'Registrar e analisar';
    if (message) message.textContent = SOURCES[source].helper;

    if (source === 'internet' && preview) {
      preview.innerHTML = '<strong>Questões da internet</strong><span>Escolha matéria e assunto; o link da fonte é opcional.</span>';
    } else if (source === 'presencial' && preview) {
      preview.innerHTML = '<strong>Curso presencial</strong><span>Escolha matéria e assunto e informe quantas questões você fez e quantas acertou.</span>';
    }
  }

  function setSource(next) {
    if (!SOURCES[next]) return;
    source = next;
    updateUi();
  }

  function inject() {
    const panel = document.querySelector('[data-question-panel="external"]');
    const firstPanel = panel?.querySelector('.panel');
    if (!panel || !firstPanel) return false;
    injectStyles();

    if (!$('#externalSourceTabs')) {
      const tabs = document.createElement('div');
      tabs.id = 'externalSourceTabs';
      tabs.className = 'external-source-tabs';
      tabs.setAttribute('role', 'tablist');
      tabs.innerHTML = Object.entries(SOURCES).map(([key, item]) => `<button type="button" data-external-source="${key}" class="${key === source ? 'active' : ''}">${item.label}</button>`).join('');
      firstPanel.insertAdjacentElement('beforebegin', tabs);
      tabs.addEventListener('click', event => {
        const button = event.target.closest('[data-external-source]');
        if (button) setSource(button.dataset.externalSource);
      });
    }

    if (!$('#externalSourceUrlWrap')) {
      const wrap = document.createElement('label');
      wrap.id = 'externalSourceUrlWrap';
      wrap.hidden = true;
      wrap.innerHTML = 'Link da fonte <span style="font-weight:400;color:#777">(opcional)</span><input id="externalSourceUrl" type="url" inputmode="url" placeholder="https://..." />';
      const resultPanel = $('#qcRecordButton')?.closest('.qc-result-panel');
      const notesLabel = $('#qcNotes')?.closest('label');
      if (resultPanel && notesLabel) notesLabel.insertAdjacentElement('beforebegin', wrap);
    }

    ['qcSubject', 'qcTopic', 'qcBoard'].forEach(id => $('#' + id)?.addEventListener('change', () => setTimeout(updateUi, 0)));
    updateUi();
    return true;
  }

  function validHttps(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      return url.protocol === 'https:' ? url.toString() : false;
    } catch {
      return false;
    }
  }

  async function recordNonQc() {
    const api = client();
    if (!api) return toast('A conexão ainda está carregando. Tente novamente.','error');
    const subjectId = $('#qcSubject')?.value || '';
    const topicId = $('#qcTopic')?.value || '';
    const total = Number($('#qcTotal')?.value || 0);
    const correct = Number($('#qcCorrect')?.value || 0);
    const confidence = Number($('#qcConfidence')?.value || 3);
    const durationRaw = $('#qcDuration')?.value ?? '';
    const duration = durationRaw === '' ? null : Number(durationRaw);
    const notes = ($('#qcNotes')?.value || '').trim();

    if (!subjectId || !topicId) return toast('Escolha a matéria e o assunto.','error');
    if (!Number.isInteger(total) || total < 1 || total > 500 || !Number.isInteger(correct) || correct < 0 || correct > total) return toast('Confira a quantidade de questões e acertos.','error');
    if (duration !== null && (!Number.isFinite(duration) || duration < 0 || duration > 720)) return toast('Confira o tempo total.','error');

    let sourceUrl = null;
    if (source === 'internet') {
      const checked = validHttps($('#externalSourceUrl')?.value || '');
      if (checked === false) return toast('Use um link https válido ou deixe o campo vazio.','error');
      sourceUrl = checked;
    }

    const { data: { session } } = await api.auth.getSession();
    if (!session) return toast('Sua sessão expirou. Entre novamente.','error');

    const button = $('#qcRecordButton');
    if (button) button.disabled = true;
    const message = $('#qcMessage');
    if (message) message.textContent = `Registrando ${sourceLabel(source)} e atualizando seu desempenho...`;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/record-external-practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          source_kind: source,
          subject_id: subjectId,
          topic_id: topicId,
          source_url: sourceUrl,
          total_questions: total,
          correct_count: correct,
          confidence,
          duration_minutes: duration,
          notes: notes || null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Não foi possível registrar.');
      toast(`${sourceLabel(source)} registrado: ${correct}/${total}.`,'ok');
      if (message) message.textContent = `${sourceLabel(source)} salvo. A Mentora vai usar esse resultado nas próximas análises.`;
      setTimeout(() => $('#dailyRefreshButton')?.click(), 100);
    } catch (error) {
      console.error('Registro de fonte externa:', error);
      if (message) message.textContent = error?.message || 'Falha ao registrar.';
      toast(error?.message || 'Falha ao registrar.','error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#qcRecordButton');
    if (!button || source === 'qconcursos') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    recordNonQc();
  }, true);

  const observer = new MutationObserver(() => {
    document.querySelectorAll('#externalHistory .table-row span').forEach(node => {
      node.textContent = node.textContent.replace(/\bpresencial\b/gi, 'Presencial').replace(/\binternet\b/gi, 'Internet');
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (inject() || tries > 160) clearInterval(timer);
  }, 150);
})();