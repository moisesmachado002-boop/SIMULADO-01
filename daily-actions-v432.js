(() => {
  'use strict';
  if (window.__mentorDailyActionsV432) return;
  window.__mentorDailyActionsV432 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db) return;

  const LEGACY_RELAY_ACTIONS = [
    ['data-task-review','taskReview'],
    ['data-task-bank','taskBank'],
    ['data-task-qc','taskQc']
  ];

  function escAttr(v='') {
    return String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  }

  function toast(text, kind='neutral') {
    const n=document.querySelector('#toast');
    if(!n) return;
    n.textContent=text;
    n.dataset.kind=kind;
    n.classList.add('show');
    clearTimeout(window.__mentorDailyActionsToast);
    window.__mentorDailyActionsToast=setTimeout(()=>n.classList.remove('show'),3200);
  }

  async function completeDirect(id,btn) {
    if(btn?.dataset.busy==='1') return;
    if(btn){btn.dataset.busy='1';btn.disabled=true;}
    try {
      const {data:{user},error:userError}=await db.auth.getUser();
      if(userError||!user) throw new Error('Sessão expirada.');
      const row=await db.from('study_plan_items')
        .select('id,question_target,status,completed_at')
        .eq('id',id).eq('user_id',user.id).maybeSingle();
      if(row.error) throw row.error;
      if(!row.data) throw new Error('Meta não encontrada.');
      if(row.data.status==='completed'||row.data.completed_at){
        toast('Esta meta já está concluída.','ok');
        return;
      }
      const target=Math.max(1,Number(row.data.question_target||1));
      const done=await db.from('study_plan_items').update({
        status:'completed',progress_count:target,completed_at:new Date().toISOString()
      }).eq('id',id).eq('user_id',user.id).in('status',['pending','in_progress']);
      if(done.error) throw done.error;
      window.MentorRequestGuard?.invalidate?.();
      document.dispatchEvent(new CustomEvent('mentor-evidence-changed'));
      toast('Meta concluída.','ok');
      setTimeout(()=>{
        try{parent.postMessage({type:'mentor-refresh',hash:'#daily'},location.origin);}catch{}
      },280);
    } catch(error) {
      console.error('daily complete direct',error);
      toast(error?.message||'Não foi possível concluir a meta.','error');
    } finally {
      if(btn){delete btn.dataset.busy;btn.disabled=false;}
    }
  }

  function relayLegacy(e,attr,key,id) {
    const native=document.querySelector(`#dailyTasks [${attr}="${escAttr(id)}"]`);
    if(!native) {
      toast('Esta ação ainda está carregando. Tente novamente em instantes.','error');
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    native.click();
  }

  function handle(e) {
    if(!e.target.closest('#v428Goals')) return;

    const complete=e.target.closest('[data-task-complete]');
    if(complete){
      const id=complete.dataset.taskComplete;
      if(!id) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      completeDirect(id,complete);
      return;
    }

    for (const [attr,key] of LEGACY_RELAY_ACTIONS) {
      const btn=e.target.closest(`[${attr}]`);
      if(!btn) continue;
      const id=btn.dataset[key];
      if(!id) return;
      relayLegacy(e,attr,key,id);
      return;
    }
  }

  document.addEventListener('click',handle,true);
})();
