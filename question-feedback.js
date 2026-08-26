(() => {
  'use strict';

  const VERSION = '9.1';
  const cache = new Map();
  const metaCache = new Map();
  const esc = (value='') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function addCss() {
    if (document.querySelector('#mentorQuestionFeedbackCss')) return;
    const link=document.createElement('link');
    link.id='mentorQuestionFeedbackCss';
    link.rel='stylesheet';
    link.href='./question-feedback.css?v=9.1';
    document.head.appendChild(link);
  }

  async function waitForDb(timeoutMs=2500) {
    const start=Date.now();
    while (Date.now()-start<timeoutMs) {
      const db=window.mentorCloud?.client;
      if (db) return db;
      await new Promise(resolve=>setTimeout(resolve,40));
    }
    return null;
  }

  async function fetchQuestion(questionId) {
    if (!questionId) return null;
    const current=window.mentorBank?.getCurrentQuestion?.();
    if (current?.id===questionId && current.option_explanations) return current;
    if (cache.has(questionId)) return cache.get(questionId);
    const db=await waitForDb();
    if (!db) return null;
    const {data,error}=await db.from('questions')
      .select('id,source_question_number,exam_name,subject_label,topic_label,correct_answer,explanation,option_explanations,explanation_status,answer_key_note,alternatives')
      .eq('id',questionId).maybeSingle();
    if (error) { console.warn('Não foi possível carregar a correção completa:',error); return null; }
    if (data) cache.set(questionId,data);
    return data||null;
  }

  function visibleMeta() {
    return {
      sourceQuestionNumber:String(document.querySelector('#bankQuestionMeta')?.textContent||'').replace(/^QUESTÃO\s+/i,'').trim(),
      subject:String(document.querySelector('#bankQuestionSubject')?.textContent||'').trim(),
      topic:String(document.querySelector('#bankQuestionTopic')?.textContent||'').trim(),
      exam:String(document.querySelector('#bankQuestionSource')?.textContent||'').trim()
    };
  }

  async function fetchVisibleQuestion(meta=visibleMeta()) {
    const current=window.mentorBank?.getCurrentQuestion?.();
    if (current?.option_explanations && (!meta.sourceQuestionNumber || String(current.source_question_number||'')===meta.sourceQuestionNumber)) return current;
    if (!meta.sourceQuestionNumber) return null;
    const key=[meta.exam,meta.subject,meta.topic,meta.sourceQuestionNumber].join('|');
    if (metaCache.has(key)) return metaCache.get(key);
    const db=await waitForDb();
    if (!db) return null;
    let query=db.from('questions').select('id,source_question_number,exam_name,subject_label,topic_label,correct_answer,explanation,option_explanations,explanation_status,answer_key_note,alternatives').eq('source_question_number',meta.sourceQuestionNumber);
    if (meta.subject && meta.subject!=='Matéria') query=query.eq('subject_label',meta.subject);
    if (meta.topic && meta.topic!=='Assunto') query=query.eq('topic_label',meta.topic);
    if (meta.exam && meta.exam!=='Seu módulo') query=query.eq('exam_name',meta.exam);
    const {data,error}=await query.order('created_at',{ascending:true}).limit(1);
    if (error) { console.warn('Não foi possível localizar a questão visível para correção:',error); return null; }
    const question=data?.[0]||null;
    if (question) { cache.set(question.id,question); metaCache.set(key,question); }
    return question;
  }

  function inferLetters(question,selectedOverride='') {
    const correctNode=document.querySelector('#bankAnswers [data-option-wrapper].correct');
    const wrongNode=document.querySelector('#bankAnswers [data-option-wrapper].wrong');
    const selectedNode=document.querySelector('#bankAnswers [data-option-wrapper].selected');
    const right=String(question?.correct_answer||correctNode?.dataset.optionWrapper||'').toUpperCase();
    const selected=String(selectedOverride||wrongNode?.dataset.optionWrapper||selectedNode?.dataset.optionWrapper||right).toUpperCase();
    return {right,selected};
  }

  function explanationFor(question,letter,right) {
    const perOption=question?.option_explanations && typeof question.option_explanations==='object' ? question.option_explanations : {};
    const specific=perOption[letter]||perOption[String(letter).toLowerCase()];
    if (specific) return {text:String(specific),specific:true};
    if (letter===right && question?.explanation) return {text:String(question.explanation),specific:false};
    return {text:'A justificativa específica desta alternativa ainda não foi cadastrada. O gabarito permanece o do material original; a plataforma não inventa uma explicação para preencher a lacuna.',specific:false};
  }

  function hideLegacyGeneral(feedback) {
    const title=feedback.querySelector('.qg-analysis-title');
    if (title) title.classList.add('p4-legacy-hidden');
    const paragraph=title?.nextElementSibling;
    if (paragraph?.tagName==='P') paragraph.classList.add('p4-legacy-hidden');
  }

  function render(question,selectedOverride='') {
    const feedback=document.querySelector('#bankFeedback');
    if (!feedback || feedback.classList.contains('hidden') || !question) return false;
    feedback.querySelector('.mentor-feedback-p4')?.remove();
    hideLegacyGeneral(feedback);

    const {right,selected}=inferLetters(question,selectedOverride);
    if (!right) return false;
    const correctInfo=explanationFor(question,right,right);
    const wrong=selected && selected!==right;
    const wrongInfo=wrong?explanationFor(question,selected,right):null;
    const alternatives=question.alternatives && typeof question.alternatives==='object' ? question.alternatives : {};

    const block=document.createElement('section');
    block.className='mentor-feedback-p4';
    block.innerHTML=`
      <div class="p4-answer-line"><span>${wrong?`Você marcou <strong>${esc(selected)}</strong> ❌`:`Você marcou <strong>${esc(right)}</strong> ✅`}</span><span>Gabarito: <strong>${esc(right)}</strong> ✅</span></div>
      <div class="p4-explanation p4-correct-explanation"><span class="p4-label">POR QUE ${esc(right)} ESTÁ CORRETA</span><p>${esc(correctInfo.text)}</p></div>
      ${wrong?`<div class="p4-explanation p4-wrong-explanation"><span class="p4-label">POR QUE ${esc(selected)} ESTÁ ERRADA</span><p>${esc(wrongInfo.text)}</p>${wrongInfo.specific?'':'<small>Explicação específica pendente de cadastro.</small>'}</div>`:''}
      ${question.answer_key_note?`<div class="p4-key-note"><strong>Observação sobre o gabarito:</strong> ${esc(question.answer_key_note)}</div>`:''}
      <button type="button" class="p4-all-options-btn">ANALISAR TODAS AS ALTERNATIVAS</button>
      <div class="p4-all-options hidden"></div>`;

    const allHost=block.querySelector('.p4-all-options');
    allHost.innerHTML=Object.entries(alternatives).map(([letter,text])=>{
      const key=String(letter).toUpperCase();
      const info=explanationFor(question,key,right);
      const state=key===right?' correta':(key===selected&&wrong?' marcada-errada':'');
      const marker=key===right?'<small>GABARITO</small>':(key===selected?'<small>SUA RESPOSTA</small>':'');
      return `<article class="p4-option-analysis${state}"><div><strong>${esc(key)}</strong><span>${esc(text)}</span>${marker}</div><p>${esc(info.text)}</p></article>`;
    }).join('');

    block.querySelector('.p4-all-options-btn')?.addEventListener('click',event=>{
      const hidden=allHost.classList.toggle('hidden');
      event.currentTarget.textContent=hidden?'ANALISAR TODAS AS ALTERNATIVAS':'OCULTAR ANÁLISE DAS ALTERNATIVAS';
    });
    const result=feedback.querySelector('.qg-feedback-result');
    result?result.insertAdjacentElement('afterend',block):feedback.prepend(block);
    if (question.id) cache.set(question.id,question);
    return true;
  }

  window.addEventListener('mentor:question-revealed',event=>{
    const question=event.detail?.question;
    if (question) render(question,event.detail?.selected||'');
  });

  window.addEventListener('mentor:attempt-saved',async event=>{
    if (event.detail?.atomic) return;
    const questionId=event.detail?.questionId;
    if (!questionId) return;
    const question=await fetchQuestion(questionId);
    if (question) render(question);
  });

  addCss();
  window.MentorQuestionFeedback=Object.freeze({version:VERSION,fetchQuestion,fetchVisibleQuestion,render,explanationFor});
})();