(() => {
  'use strict';
  if (window.__mentorReviewQuestionStatsV419) return;
  window.__mentorReviewQuestionStatsV419 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  let reviewSessions=new Map();

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');n.style.zIndex='100500';n.style.bottom='90px';
    clearTimeout(window.__v419ReviewToast);window.__v419ReviewToast=setTimeout(()=>n.classList.remove('show'),3800);
  }
  function pct(c,t){return t?Math.round(Number(c||0)/Number(t)*100):0;}

  function injectStyles(){
    if($('#v419ReviewQuestionStyle'))return;
    const s=document.createElement('style');s.id='v419ReviewQuestionStyle';s.textContent=`
      #v419ReviewQuestionBox{margin:12px 0;padding:13px;border-radius:12px;background:#fff8dd;border:1px solid #ead78a}
      #v419ReviewQuestionBox .rq-title{font-weight:900;margin-bottom:3px}.rq-note{font-size:12px;color:#666;margin-bottom:9px}
      .rq-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rq-grid label{margin:0!important}.rq-summary{margin-top:9px;font-size:12px;font-weight:850;color:#554600}
      #v419ReviewEdit{position:fixed;inset:0;background:#0009;z-index:100450;display:none;align-items:center;justify-content:center;padding:18px}#v419ReviewEdit.open{display:flex}
      #v419ReviewEdit .rq-card{width:min(520px,100%);background:#fff;border-radius:17px;padding:20px;box-shadow:0 25px 70px #0005}#v419ReviewEdit h2{margin:4px 0 3px}
      #v419ReviewEdit label{display:block;font-size:12px;font-weight:850;color:#555;margin-top:12px}#v419ReviewEdit input,#v419ReviewEdit textarea{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #ccc;border-radius:9px;padding:11px;font:inherit}
      #v419ReviewEdit textarea{min-height:70px}.rq-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}.rq-actions button{min-height:44px}
      @media(max-width:620px){#v419ReviewEdit{align-items:flex-end;padding:0}#v419ReviewEdit .rq-card{width:100%;border-radius:20px 20px 0 0;padding:18px 18px calc(20px + env(safe-area-inset-bottom))}.rq-grid{grid-template-columns:1fr}.rq-actions{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function injectTimerReviewFields(){
    const active=$('#studyTimerActiveBox');if(!active||$('#v419ReviewQuestionBox'))return;
    const box=document.createElement('div');box.id='v419ReviewQuestionBox';box.hidden=true;
    box.innerHTML=`<div class="rq-title">Questões feitas durante a revisão</div><div class="rq-note">Opcional. Se não fez questões, deixe 0. Se fez, o resultado entra no Histórico e no desempenho do assunto.</div><div class="rq-grid"><label>Questões feitas<input id="v419ReviewQ" type="number" min="0" max="500" inputmode="numeric" value="0"></label><label>Quantas errou?<input id="v419ReviewE" type="number" min="0" max="500" inputmode="numeric" value="0"></label></div><div class="rq-summary" id="v419ReviewSummary">Sem questões nesta revisão.</div>`;
    active.querySelector('.st-topic')?.insertAdjacentElement('afterend',box);
    box.addEventListener('input',renderReviewSummary);
  }

  function renderReviewSummary(){
    const q=Math.max(0,Math.floor(Number($('#v419ReviewQ')?.value||0))),e=Math.max(0,Math.floor(Number($('#v419ReviewE')?.value||0))),c=Math.max(0,q-e);
    const n=$('#v419ReviewSummary');if(!n)return;n.textContent=q?`${c} acertos • ${e} erros • ${pct(c,q)}%`:'Sem questões nesta revisão.';
  }

  async function syncTimerReviewBox(){
    injectTimerReviewFields();
    const box=$('#v419ReviewQuestionBox');if(!box)return;
    try{
      const {data:{user}}=await db.auth.getUser();if(!user){box.hidden=true;return;}
      const {data}=await db.from('study_timer_state').select('activity_type').eq('user_id',user.id).maybeSingle();
      box.hidden=data?.activity_type!=='review';
      if(!box.hidden)renderReviewSummary();
    }catch{box.hidden=true;}
  }

  function prepareManualReviewFields(){
    const act=$('#v416ManualActivity'),wrap=$('#v416ManualQuestions'),q=$('#v416ManualQ'),e=$('#v416ManualE');if(!act||!wrap||!q||!e)return;
    const apply=()=>{
      const v=act.value;
      if(v==='review'){
        wrap.hidden=false;q.min='0';if(q.dataset.reviewInit!=='1'){q.value='0';e.value='0';q.dataset.reviewInit='1';}
        const labels=wrap.querySelectorAll('label');if(labels[0])labels[0].childNodes[0].nodeValue='Questões feitas (opcional)';
      }else if(v==='questions'){
        wrap.hidden=false;q.min='1';if(Number(q.value||0)<1)q.value='20';q.dataset.reviewInit='0';
        const labels=wrap.querySelectorAll('label');if(labels[0])labels[0].childNodes[0].nodeValue='Questões feitas';
      }else{wrap.hidden=true;q.dataset.reviewInit='0';}
    };
    if(!act.dataset.v419Bound){act.dataset.v419Bound='1';act.addEventListener('change',apply);}apply();
  }

  async function finishReviewTimer(e){
    const btn=e.target.closest('#studyTimerFinish');if(!btn)return;
    const box=$('#v419ReviewQuestionBox');if(!box||box.hidden)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const q=Math.floor(Number($('#v419ReviewQ')?.value||0)),errors=Math.floor(Number($('#v419ReviewE')?.value||0));
    if(q<0||q>500)return toast('Confira a quantidade de questões.','error');
    if(errors<0||errors>q)return toast('Os erros não podem passar das questões feitas.','error');
    btn.disabled=true;
    try{
      const notes=($('#studyTimerNotes')?.value||'').trim();
      const {data,error}=await db.rpc('finish_study_timer',{p_notes:notes||null,p_questions_answered:q,p_errors:errors});if(error)throw error;
      const c=q-errors;
      toast(q?`Revisão salva • ${q} questões • ${c} acertos • ${errors} erros.`:'Revisão salva sem questões.','ok');
      try{new BroadcastChannel('mentor-study-timer-v410').postMessage('sync');}catch{}
      setTimeout(()=>location.reload(),350);
    }catch(err){console.error(err);toast(err?.message||'Não foi possível salvar a revisão.','error');btn.disabled=false;}
  }

  async function saveManualReview(e){
    const btn=e.target.closest('#v416ManualSave');if(!btn||$('#v416ManualActivity')?.value!=='review')return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const subject=$('#v416ManualSubject')?.value||'',topic=$('#v416ManualTopic')?.value||'',minutes=Math.floor(Number($('#v416ManualMinutes')?.value||0));
    const q=Math.floor(Number($('#v416ManualQ')?.value||0)),errors=Math.floor(Number($('#v416ManualE')?.value||0));
    if(!subject||!topic)return toast('Escolha matéria e assunto.','error');if(minutes<1||minutes>720)return toast('Informe um tempo válido.','error');
    if(q<0||q>500||errors<0||errors>q)return toast('Confira questões e erros.','error');
    btn.disabled=true;try{
      const {data,error}=await db.rpc('record_manual_study_activity',{p_subject_id:subject,p_topic_id:topic,p_activity_type:'review',p_duration_minutes:minutes,p_total_questions:q,p_wrong_count:errors,p_notes:null});if(error)throw error;
      $('#v416Manual')?.classList.remove('open');toast(q?`Revisão registrada • ${minutes} min • ${q} questões • ${q-errors} acertos.`:`${minutes} min de revisão registrados.`,'ok');setTimeout(()=>location.reload(),350);
    }catch(err){console.error(err);toast(err?.message||'Não foi possível salvar.','error');}finally{btn.disabled=false;}
  }

  function injectReviewEditModal(){
    if($('#v419ReviewEdit'))return;injectStyles();
    const m=document.createElement('div');m.id='v419ReviewEdit';m.innerHTML=`<div class="rq-card"><div class="eyebrow">EDITAR REVISÃO</div><h2>Revisão + questões</h2><div class="muted" id="v419EditSub"></div><label>Tempo (minutos)<input id="v419EditMinutes" type="number" min="1" max="720"></label><div class="rq-grid"><label>Questões feitas<input id="v419EditQ" type="number" min="0" max="500"></label><label>Quantas errou?<input id="v419EditE" type="number" min="0" max="500"></label></div><label>Observação<textarea id="v419EditNotes"></textarea></label><div class="rq-actions"><button class="secondary-button" id="v419EditCancel">Cancelar</button><button class="primary-button" id="v419EditSave">Salvar alteração</button></div></div>`;
    document.body.appendChild(m);$('#v419EditCancel').onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});$('#v419EditSave').onclick=saveReviewHistoryEdit;
  }

  function openReviewHistoryEdit(row){
    injectReviewEditModal();const m=$('#v419ReviewEdit');m.dataset.id=row.id;$('#v419EditSub').textContent=`${row.subject} • ${row.topic}`;$('#v419EditMinutes').value=row.duration_minutes||1;$('#v419EditQ').value=row.questions_answered||0;$('#v419EditE').value=Math.max(0,Number(row.questions_answered||0)-Number(row.correct_answers||0));$('#v419EditNotes').value=row.notes||'';m.classList.add('open');
  }

  async function saveReviewHistoryEdit(){
    const m=$('#v419ReviewEdit'),id=m?.dataset.id;if(!id)return;const btn=$('#v419EditSave');
    const minutes=Math.floor(Number($('#v419EditMinutes')?.value||0)),q=Math.floor(Number($('#v419EditQ')?.value||0)),errors=Math.floor(Number($('#v419EditE')?.value||0)),notes=$('#v419EditNotes')?.value||'';
    if(minutes<1||minutes>720)return toast('Informe um tempo válido.','error');if(q<0||q>500||errors<0||errors>q)return toast('Confira questões e erros.','error');
    btn.disabled=true;try{const {error}=await db.rpc('edit_learning_history_item',{p_kind:'session',p_id:id,p_duration_minutes:minutes,p_total_questions:q,p_wrong_count:errors,p_notes:notes||null});if(error)throw error;m.classList.remove('open');toast('Revisão atualizada.','ok');setTimeout(()=>location.reload(),300);}catch(err){console.error(err);toast(err?.message||'Não foi possível editar.','error');}finally{btn.disabled=false;}
  }

  async function decorateHistory(){
    const page=$('#v418HistoryPage');if(!page?.classList.contains('active'))return;
    try{
      const {data:{user}}=await db.auth.getUser();if(!user)return;
      const [sR,bR]=await Promise.all([
        db.from('study_sessions').select('id,activity_type,duration_minutes,questions_answered,correct_answers,notes,subject_id,topic_id').eq('user_id',user.id).eq('activity_type','review').order('ended_at',{ascending:false}).limit(500),
        db.from('external_practice_batches').select('id,study_session_id').eq('user_id',user.id).not('study_session_id','is',null).limit(500)
      ]);if(sR.error||bR.error)return;
      const subR=await db.from('subjects').select('id,name');const topR=await db.from('topics').select('id,title');
      const sm=new Map((subR.data||[]).map(x=>[x.id,x.name])),tm=new Map((topR.data||[]).map(x=>[x.id,x.title]));
      reviewSessions=new Map((sR.data||[]).map(x=>[x.id,{...x,subject:sm.get(x.subject_id)||'Matéria',topic:tm.get(x.topic_id)||'Assunto'}]));
      const reviewIds=new Set(reviewSessions.keys());
      (bR.data||[]).forEach(b=>{if(reviewIds.has(b.study_session_id))document.querySelector(`[data-lh-row="batch:${b.id}"]`)?.remove();});
      reviewSessions.forEach((r,id)=>{
        const row=document.querySelector(`[data-lh-row="session:${id}"]`);if(!row)return;const metrics=row.querySelector('.lh-metrics');if(!metrics)return;
        metrics.querySelectorAll('[data-v419-review-chip]').forEach(n=>n.remove());
        const q=Number(r.questions_answered||0),c=Number(r.correct_answers||0),e=Math.max(0,q-c);
        if(q>0){metrics.insertAdjacentHTML('beforeend',`<span class="lh-chip" data-v419-review-chip>${q} questões</span><span class="lh-chip" data-v419-review-chip>${c} acertos</span><span class="lh-chip" data-v419-review-chip>${e} erros</span><span class="lh-chip" data-v419-review-chip>${pct(c,q)}%</span>`);}
      });
    }catch(err){console.warn('review history decorate',err);}
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-lh-edit^="session:"]');if(edit){const id=edit.dataset.lhEdit.split(':')[1],row=reviewSessions.get(id);if(row){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openReviewHistoryEdit(row);return;}}
    if(e.target.closest('#studyTimerFinish')){finishReviewTimer(e);return;}
    if(e.target.closest('#v416ManualSave')){saveManualReview(e);return;}
  },true);

  function boot(){injectStyles();injectTimerReviewFields();prepareManualReviewFields();syncTimerReviewBox();decorateHistory();
    const obs=new MutationObserver(()=>{injectTimerReviewFields();prepareManualReviewFields();syncTimerReviewBox();decorateHistory();});obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    setInterval(()=>{syncTimerReviewBox();decorateHistory();},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();