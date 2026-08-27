(() => {
  'use strict';

  const SUPABASE_URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  let db = null;

  const $ = (s) => document.querySelector(s);

  function toast(text, kind = 'neutral') {
    const node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
    node.classList.add('show');
    clearTimeout(window.__manualStudyToast);
    window.__manualStudyToast = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function getDb() {
    if (db) return db;
    if (!window.supabase?.createClient) return null;
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return db;
  }

  function syncForm() {
    const type = $('#studyModalActivityType')?.value || 'study';
    const qBox = $('#studyModalQuestionsBox');
    const minutesLabel = $('#studyModalMinutesLabel');
    const save = $('#studyModalSave');
    if (qBox) qBox.hidden = type !== 'questions';
    if (minutesLabel) {
      minutesLabel.firstChild.textContent = type === 'questions'
        ? 'Tempo total das questões'
        : type === 'review'
          ? 'Minutos de revisão'
          : 'Minutos estudados';
    }
    if (save) save.textContent = type === 'questions'
      ? 'Registrar questões'
      : type === 'review'
        ? 'Registrar revisão'
        : 'Registrar estudo';
    syncQuestionSummary();
  }

  function syncQuestionSummary() {
    const total = Math.max(0, Number($('#studyModalQuestionsTotal')?.value || 0));
    const wrong = Math.max(0, Number($('#studyModalQuestionsWrong')?.value || 0));
    const correct = Math.max(0, total - wrong);
    const acc = total ? Math.round(correct / total * 100) : 0;
    const node = $('#studyModalQuestionSummary');
    if (node) node.textContent = total ? `${correct} acertos • ${wrong} erros • ${acc}%` : 'Informe a quantidade de questões.';
  }

  function enhanceModal() {
    const modal = $('#studyModal');
    const card = modal?.querySelector('.modal-card');
    const subject = $('#studyModalSubject');
    const minutes = $('#studyModalMinutes');
    const save = $('#studyModalSave');
    if (!modal || !card || !subject || !minutes || !save) return false;
    if ($('#studyModalActivityType')) return true;

    const subjectGrid = subject.closest('.form-grid');
    const typeWrap = document.createElement('label');
    typeWrap.id = 'studyModalActivityTypeLabel';
    typeWrap.innerHTML = `O que você fez?
      <select id="studyModalActivityType">
        <option value="study">Estudo / teoria</option>
        <option value="review">Revisão do assunto</option>
        <option value="questions">Questões</option>
      </select>`;
    card.insertBefore(typeWrap, subjectGrid);

    const qBox = document.createElement('div');
    qBox.id = 'studyModalQuestionsBox';
    qBox.hidden = true;
    qBox.innerHTML = `
      <div class="form-grid two">
        <label>Quantas questões fez?
          <input type="number" id="studyModalQuestionsTotal" min="1" max="500" value="20" inputmode="numeric" />
        </label>
        <label>Quantas errou?
          <input type="number" id="studyModalQuestionsWrong" min="0" max="500" value="0" inputmode="numeric" />
        </label>
      </div>
      <div id="studyModalQuestionSummary" style="margin:-4px 0 12px;color:#666;font-weight:700">20 acertos • 0 erros • 100%</div>`;
    subjectGrid.insertAdjacentElement('afterend', qBox);

    const minutesLabel = minutes.closest('label');
    if (minutesLabel) minutesLabel.id = 'studyModalMinutesLabel';

    const notes = document.createElement('label');
    notes.innerHTML = `Observação <span style="font-weight:400;color:#777">(opcional)</span>
      <input type="text" id="studyModalNotes" maxlength="240" placeholder="Ex.: videoaula, PDF, lei seca, simulado..." />`;
    if (minutesLabel) minutesLabel.insertAdjacentElement('afterend', notes);

    $('#studyModalActivityType')?.addEventListener('change', syncForm);
    $('#studyModalQuestionsTotal')?.addEventListener('input', syncQuestionSummary);
    $('#studyModalQuestionsWrong')?.addEventListener('input', syncQuestionSummary);
    syncForm();
    return true;
  }

  async function saveManualActivity() {
    const client = getDb();
    if (!client) {
      toast('A conexão ainda está carregando. Tente novamente em alguns segundos.', 'error');
      return;
    }

    const type = $('#studyModalActivityType')?.value || 'study';
    const subjectId = $('#studyModalSubject')?.value || '';
    const topicId = $('#studyModalTopic')?.value || '';
    const minutes = Number($('#studyModalMinutes')?.value || 0);
    const total = type === 'questions' ? Number($('#studyModalQuestionsTotal')?.value || 0) : 0;
    const wrong = type === 'questions' ? Number($('#studyModalQuestionsWrong')?.value || 0) : 0;
    const notes = ($('#studyModalNotes')?.value || '').trim();

    if (!subjectId || !topicId) return toast('Escolha a matéria e o assunto.', 'error');
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 720) return toast('Informe um tempo válido.', 'error');
    if (type === 'questions') {
      if (!Number.isInteger(total) || total < 1 || total > 500) return toast('Informe quantas questões você fez.', 'error');
      if (!Number.isInteger(wrong) || wrong < 0 || wrong > total) return toast('Os erros devem ficar entre 0 e o total de questões.', 'error');
    }

    const button = $('#studyModalSave');
    if (button) button.disabled = true;
    try {
      const { data, error } = await client.rpc('record_manual_study_activity', {
        p_subject_id: subjectId,
        p_topic_id: topicId,
        p_activity_type: type,
        p_duration_minutes: Math.round(minutes),
        p_total_questions: total,
        p_wrong_count: wrong,
        p_notes: notes || null,
        p_practiced_at: new Date().toISOString()
      });
      if (error) throw error;

      $('#studyModal')?.classList.remove('open');
      $('#studyModal')?.setAttribute('aria-hidden', 'true');
      const label = type === 'questions'
        ? `${data?.total_questions || total} questões registradas (${data?.correct_count ?? total - wrong} acertos).`
        : type === 'review'
          ? 'Revisão registrada.'
          : 'Estudo registrado.';
      toast(label, 'ok');
      setTimeout(() => $('#dailyRefreshButton')?.click(), 100);
    } catch (error) {
      console.error('Registro manual:', error);
      toast(error?.message || 'Não foi possível registrar a atividade.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.addEventListener('click', (event) => {
    const save = event.target.closest?.('#studyModalSave');
    if (!save) return;
    if (!$('#studyModalActivityType')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    saveManualActivity();
  }, true);

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (enhanceModal() || tries > 120) clearInterval(timer);
  }, 250);
})();
