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

  function injectStyles() {
    if ($('#manualStudyV481Styles')) return;
    const style = document.createElement('style');
    style.id = 'manualStudyV481Styles';
    style.textContent = `
      #studyModal .modal-card {max-height:calc(100dvh - 24px)!important;overflow-y:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:24px!important}
      #studyModal .modal-card > label,#studyModalQuestionsBox label{display:block;min-width:0}
      #studyModalActivityTypeLabel{margin-bottom:14px}
      #studyModalQuestionsBox{margin:14px 0 16px;padding:14px;background:#f7f7f7;border:1px solid #e3e3e3;border-radius:14px}
      #studyModalQuestionsBox[hidden]{display:none!important}
      #studyModalQuestionsBox .manual-q-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
      #studyModalQuestionsBox input,#studyModalNotes,#studyModalActivityType,#studyModalSubject,#studyModalTopic,#studyModalMinutes{box-sizing:border-box;width:100%}
      #studyModalQuestionSummary{margin:12px 0 0!important;padding:11px 12px;border-radius:10px;background:#fff;border:1px solid #ddd;color:#555!important;font-size:15px;line-height:1.35;font-weight:750!important}
      #studyModalNotesLabel{margin-top:14px}#studyModalNotesLabel .manual-optional{display:inline;margin-left:4px;font-weight:400;color:#777;font-size:.92em}
      #studyModalSave{margin-top:16px;position:sticky;bottom:0;z-index:2;box-shadow:0 -8px 18px rgba(255,255,255,.92)}
      @media(max-width:520px){#studyModal .modal-card{width:calc(100vw - 24px)!important;max-width:none!important;padding:22px 20px 20px!important;border-radius:20px!important}#studyModal .modal-card h2{font-size:31px!important;line-height:1.05;margin-bottom:20px}#studyModalQuestionsBox{padding:12px}#studyModalQuestionsBox .manual-q-grid{gap:10px}#studyModalQuestionsBox .manual-q-grid label{font-size:14px;line-height:1.2}#studyModalQuestionSummary{font-size:14px}}
    `;
    document.head.appendChild(style);
  }

  function syncForm() {
    const type = $('#studyModalActivityType')?.value || 'study';
    const qBox = $('#studyModalQuestionsBox');
    const minutesLabel = $('#studyModalMinutesLabel');
    const save = $('#studyModalSave');
    if (qBox) qBox.hidden = type !== 'questions';
    if (minutesLabel) minutesLabel.firstChild.textContent = type === 'questions' ? 'Tempo total das questões (min)' : type === 'review' ? 'Minutos de revisão' : 'Minutos estudados';
    if (save) save.textContent = type === 'questions' ? 'Registrar questões' : type === 'review' ? 'Registrar revisão' : 'Registrar estudo';
    syncQuestionSummary();
  }

  function syncQuestionSummary() {
    const total = Math.max(0, Number($('#studyModalQuestionsTotal')?.value || 0));
    const wrong = Math.max(0, Number($('#studyModalQuestionsWrong')?.value || 0));
    const safeWrong = Math.min(wrong, total),correct = Math.max(0, total - safeWrong),acc = total ? Math.round(correct / total * 100) : 0;
    const node = $('#studyModalQuestionSummary');
    if (node) node.textContent = total ? `${correct} acertos • ${safeWrong} erros • ${acc}% de acerto` : 'Informe a quantidade de questões.';
  }

  function enhanceModal() {
    const modal = $('#studyModal'),card = modal?.querySelector('.modal-card'),subject = $('#studyModalSubject'),minutes = $('#studyModalMinutes'),save = $('#studyModalSave');
    if (!modal || !card || !subject || !minutes || !save) return false;
    injectStyles();if ($('#studyModalActivityType')) return true;
    const subjectGrid = subject.closest('.form-grid');
    const typeWrap = document.createElement('label');typeWrap.id='studyModalActivityTypeLabel';typeWrap.innerHTML=`O que você fez?<select id="studyModalActivityType"><option value="study">Estudo / teoria</option><option value="review">Revisão do assunto</option><option value="questions">Questões</option></select>`;card.insertBefore(typeWrap,subjectGrid);
    const qBox=document.createElement('div');qBox.id='studyModalQuestionsBox';qBox.hidden=true;qBox.innerHTML=`<div class="manual-q-grid"><label>Questões feitas<input type="number" id="studyModalQuestionsTotal" min="1" max="500" value="20" inputmode="numeric" /></label><label>Erros<input type="number" id="studyModalQuestionsWrong" min="0" max="500" value="0" inputmode="numeric" /></label></div><div id="studyModalQuestionSummary">20 acertos • 0 erros • 100% de acerto</div>`;subjectGrid.insertAdjacentElement('afterend',qBox);
    const minutesLabel=minutes.closest('label');if(minutesLabel)minutesLabel.id='studyModalMinutesLabel';
    const notes=document.createElement('label');notes.id='studyModalNotesLabel';notes.innerHTML=`Observação <span class="manual-optional">(opcional)</span><input type="text" id="studyModalNotes" maxlength="240" placeholder="Ex.: videoaula, PDF, lei seca, simulado..." />`;if(minutesLabel)minutesLabel.insertAdjacentElement('afterend',notes);
    $('#studyModalActivityType')?.addEventListener('change',syncForm);$('#studyModalQuestionsTotal')?.addEventListener('input',syncQuestionSummary);$('#studyModalQuestionsWrong')?.addEventListener('input',syncQuestionSummary);syncForm();return true;
  }

  async function saveManualActivity() {
    const client=getDb();if(!client)return toast('A conexão ainda está carregando. Tente novamente em alguns segundos.','error');
    const type=$('#studyModalActivityType')?.value||'study',subjectId=$('#studyModalSubject')?.value||'',topicId=$('#studyModalTopic')?.value||'',minutes=Number($('#studyModalMinutes')?.value||0),total=type==='questions'?Number($('#studyModalQuestionsTotal')?.value||0):0,wrong=type==='questions'?Number($('#studyModalQuestionsWrong')?.value||0):0,notes=($('#studyModalNotes')?.value||'').trim();
    if(!subjectId||!topicId)return toast('Escolha a matéria e o assunto.','error');if(!Number.isFinite(minutes)||minutes<1||minutes>720)return toast('Informe um tempo válido.','error');
    if(type==='questions'){if(!Number.isInteger(total)||total<1||total>500)return toast('Informe quantas questões você fez.','error');if(!Number.isInteger(wrong)||wrong<0||wrong>total)return toast('Os erros devem ficar entre 0 e o total de questões.','error');}
    const button=$('#studyModalSave');if(button)button.disabled=true;
    try{
      const {data,error}=await client.rpc('record_manual_study_activity',{p_subject_id:subjectId,p_topic_id:topicId,p_activity_type:type,p_duration_minutes:Math.round(minutes),p_total_questions:total,p_wrong_count:wrong,p_notes:notes||null,p_practiced_at:new Date().toISOString()});if(error)throw error;
      $('#studyModal')?.classList.remove('open');$('#studyModal')?.setAttribute('aria-hidden','true');
      const plan=data?.plan||{},progress=plan?.matched?` • missão ${plan.progress}/${plan.target}`:'';
      const label=type==='questions'?`${data?.total_questions||total} questões registradas (${data?.correct_count??total-wrong} acertos)${progress}.`:type==='review'?`Revisão registrada${progress}.`:'Estudo registrado.';
      toast(label,'ok');setTimeout(()=>$('#dailyRefreshButton')?.click(),100);
    }catch(error){console.error('Registro manual:',error);toast(error?.message||'Não foi possível registrar a atividade.','error');}finally{if(button)button.disabled=false;}
  }

  document.addEventListener('click',event=>{const save=event.target.closest?.('#studyModalSave');if(!save||!$('#studyModalActivityType'))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();saveManualActivity();},true);
  let tries=0;const timer=setInterval(()=>{tries++;if(enhanceModal()||tries>120)clearInterval(timer);},250);
})();