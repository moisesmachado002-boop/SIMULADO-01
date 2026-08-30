(() => {
  'use strict';
  if (window.__mentorV435Controls) return;
  window.__mentorV435Controls = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  let client=null;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function db(){
    if(client)return client;
    if(!window.supabase?.createClient)throw new Error('Conexão ainda não carregou. Tente novamente em alguns segundos.');
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return client;
  }

  function toast(text,kind='neutral'){
    const node=$('#toast');if(!node)return;
    node.textContent=text;node.dataset.kind=kind;node.classList.add('show');
    clearTimeout(window.__mentorV435Toast);
    window.__mentorV435Toast=setTimeout(()=>node.classList.remove('show'),3600);
  }

  function removeLegacyReopen(){
    $$('[data-v47-reopen]').forEach(n=>n.remove());
  }

  function ensureSkipButton(){
    const card=$('#questionCard');if(!card)return;
    let btn=$('#questionSkipButton');
    if(!btn){
      btn=document.createElement('button');
      btn.id='questionSkipButton';btn.type='button';btn.className='secondary-button';btn.textContent='Pular questão →';
      const confirm=$('#questionConfirmButton');
      if(confirm?.parentElement)confirm.parentElement.insertBefore(btn,confirm.nextSibling);else card.appendChild(btn);
      btn.addEventListener('click',()=>{
        const feedback=$('#questionFeedback');
        if(feedback&&!feedback.classList.contains('hidden'))return;
        const next=$('#questionNextButton');
        if(next){next.click();toast('Questão pulada. Não contou como erro nem como progresso.');}
      });
    }
    const feedback=$('#questionFeedback');
    const unanswered=!feedback||feedback.classList.contains('hidden');
    btn.classList.toggle('hidden',!unanswered||card.classList.contains('hidden'));
  }

  async function savePreferences(btn){
    const daily=Number($('#prefDailyMinutes')?.value);
    const review=Number($('#prefReviewRatio')?.value);
    const buffer=Number($('#prefBuffer')?.value);
    const days=$$('#weekdayPicker input:checked').map(x=>Number(x.value));
    if(!Number.isFinite(daily)||daily<20||daily>480||!days.length)throw new Error('Confira os horários e dias de estudo.');
    if(btn){btn.disabled=true;btn.dataset.busy='1';btn.textContent='Salvando...';}
    try{
      const c=db();
      const {data:{user}}=await c.auth.getUser();if(!user)throw new Error('Sessão expirada.');
      const {data,error}=await c.rpc('update_study_preferences_v434',{
        p_daily_minutes:Math.round(daily),
        p_study_days:days,
        p_review_ratio:clamp(Math.round(Number.isFinite(review)?review:40),0,100),
        p_buffer_percent:clamp(Math.round(Number.isFinite(buffer)?buffer:15),0,40),
        p_timezone:TZ
      });
      if(error)throw error;if(!data?.ok)throw new Error('Não foi possível salvar os horários.');
      window.MentorRequestGuard?.invalidate?.();
      document.dispatchEvent(new CustomEvent('mentor-preferences-changed',{detail:data}));
      document.dispatchEvent(new CustomEvent('mentor-plan-changed',{detail:{kind:'preferences_replan',week_start:data.week_start||data.plan?.week_start||null,status:data.plan?.status||'ok'}}));
      toast('Horários salvos e cronograma atualizado.','ok');
      setTimeout(()=>location.reload(),650);
    } finally {
      if(btn){btn.disabled=false;delete btn.dataset.busy;btn.textContent='Salvar horários';}
    }
  }

  document.addEventListener('click',e=>{
    const save=e.target.closest('#savePreferencesButton');
    if(save){
      e.preventDefault();e.stopImmediatePropagation();
      if(save.dataset.busy==='1')return;
      savePreferences(save).catch(err=>{console.error('study preferences v435',err);toast(err?.message||'Não foi possível salvar os horários.','error');});
      return;
    }
    const legacy=e.target.closest('[data-v47-reopen]');
    if(legacy){e.preventDefault();e.stopImmediatePropagation();legacy.remove();toast('Meta concluída é definitiva.','neutral');}
  },true);

  const observer=new MutationObserver(()=>{
    ensureSkipButton();
    removeLegacyReopen();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  ensureSkipButton();
  removeLegacyReopen();
})();
