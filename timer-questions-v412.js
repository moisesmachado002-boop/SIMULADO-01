(() => {
  'use strict';
  if(window.__mentorTimerQuestionsV412)return;
  window.__mentorTimerQuestionsV412=true;
  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s);
  let current=null;
  function toast(text,kind='neutral'){const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');clearTimeout(window.__tqV412Toast);window.__tqV412Toast=setTimeout(()=>n.classList.remove('show'),3200);}
  function inject(){
    const act=$('#studyTimerActivity');if(act&&!act.querySelector('option[value="questions"]')){const o=document.createElement('option');o.value='questions';o.textContent='Questões';act.appendChild(o);}
    const active=$('#studyTimerActiveBox');if(active&&!$('#studyTimerQuestionStats')){
      const box=document.createElement('div');box.id='studyTimerQuestionStats';box.hidden=true;box.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0"><label style="margin:0">Questões feitas<input id="studyTimerQuestionsDone" type="number" min="1" max="500" inputmode="numeric" value="20"></label><label style="margin:0">Quantas errou?<input id="studyTimerQuestionsErrors" type="number" min="0" max="500" inputmode="numeric" value="0"></label></div><div id="studyTimerQuestionsSummary" style="padding:10px 12px;border-radius:10px;background:#f5f6f7;font-weight:850;margin-bottom:8px"></div>`;
      const topic=active.querySelector('.st-topic');topic?.insertAdjacentElement('afterend',box);
      box.addEventListener('input',renderSummary);
    }
  }
  function elapsed(){
    if(!current)return 0;let s=Number(current.accumulated_seconds||0);if(current.status==='running'&&current.running_since){const x=Date.parse(current.running_since);if(Number.isFinite(x))s+=Math.max(0,Math.floor((Date.now()-x)/1000));}return s;
  }
  function renderSummary(){
    const box=$('#studyTimerQuestionStats');if(!box)return;box.hidden=current?.activity_type!=='questions';if(box.hidden)return;
    const q=Math.max(0,Number($('#studyTimerQuestionsDone')?.value||0)),e=Math.max(0,Number($('#studyTimerQuestionsErrors')?.value||0)),c=Math.max(0,q-e),acc=q?Math.round(c/q*100):0,sec=elapsed(),pace=q&&sec?Math.round(sec/q):0;
    const p=pace?`${Math.floor(pace/60)}m${String(pace%60).padStart(2,'0')}s/questão`:'ritmo será calculado ao finalizar';
    $('#studyTimerQuestionsSummary').textContent=q?`${c} acertos • ${e} erros • ${acc}% • ${p}`:p;
  }
  async function sync(){inject();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data}=await db.from('study_timer_state').select('*').eq('user_id',user.id).maybeSingle();current=data||null;renderSummary();}
  document.addEventListener('click',e=>{if(e.target.closest('#studyTimerPill,#studyTimerStart,#studyTimerPause,#studyTimerResume'))setTimeout(sync,250);},true);
  document.addEventListener('change',e=>{if(e.target.id==='studyTimerActivity')setTimeout(sync,80);},true);
  document.addEventListener('click',async e=>{
    const finish=e.target.closest('#studyTimerFinish');if(!finish)return;
    await sync();if(current?.activity_type!=='questions')return;
    e.preventDefault();e.stopImmediatePropagation();
    const q=Math.floor(Number($('#studyTimerQuestionsDone')?.value||0)),errors=Math.floor(Number($('#studyTimerQuestionsErrors')?.value||0));
    if(!Number.isFinite(q)||q<1||q>500)return toast('Informe quantas questões você fez.','error');
    if(!Number.isFinite(errors)||errors<0||errors>q)return toast('A quantidade de erros não pode passar das questões feitas.','error');
    finish.disabled=true;
    try{
      const notes=($('#studyTimerNotes')?.value||'').trim();
      const {data,error}=await db.rpc('finish_study_timer',{p_notes:notes||null,p_questions_answered:q,p_errors:errors});if(error)throw error;
      const correct=Number(data?.correct_answers??q-errors),mins=Number(data?.duration_minutes||0);
      toast(`${q} questões registradas: ${correct} acertos e ${errors} erros em ${mins} min.`,'ok');
      try{new BroadcastChannel('mentor-study-timer-v410').postMessage('sync');}catch{}
      setTimeout(()=>location.reload(),450);
    }catch(err){console.error(err);toast(err?.message||'Não foi possível salvar as questões.','error');finish.disabled=false;}
  },true);
  const obs=new MutationObserver(()=>{clearTimeout(window.__tqV412Mut);window.__tqV412Mut=setTimeout(()=>{inject();renderSummary();},80);});obs.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>{if(current?.activity_type==='questions')renderSummary();},1000);
  setTimeout(sync,600);
})();