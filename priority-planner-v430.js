(() => {
  'use strict';
  if (window.__mentorPriorityPlannerV430) return;
  window.__mentorPriorityPlannerV430 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;

  const $=s=>document.querySelector(s);

  function injectStyles(){
    if($('#priorityPlannerV430Styles'))return;
    const st=document.createElement('style');
    st.id='priorityPlannerV430Styles';
    st.textContent=`
      .v430-priority-banner{margin:0 0 16px;padding:14px 15px;border:1px solid #d9e4ef;border-radius:13px;background:#f7fbff;color:#1f2f3f}
      .v430-priority-banner strong{display:block;font-size:14px;margin-bottom:7px}
      .v430-priority-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
      .v430-priority-chip{font-size:11px;font-weight:750;padding:5px 8px;border-radius:999px;background:#fff;border:1px solid #dfe7ef;color:#44566a}
      .v430-priority-note{font-size:12px;line-height:1.45;color:#5d6b79}
      .v430-plan-card{margin:0 0 18px;padding:15px;border:1px solid #dedede;border-radius:13px;background:#fff}
      .v430-plan-card h3{margin:0 0 8px;font-size:15px}
      .v430-plan-card p{margin:0;color:#5f5f5f;font-size:12px;line-height:1.5}
    `;
    document.head.appendChild(st);
  }

  function injectBanner(){
    injectStyles();
    const daily=$('[data-page-view="daily"]');
    if(daily&&!$('#priorityPlannerV430Daily')){
      const header=daily.querySelector('.page-header');
      const box=document.createElement('div');
      box.id='priorityPlannerV430Daily';
      box.className='v430-priority-banner';
      box.innerHTML=`<strong>Ordem inteligente ativa</strong><div class="v430-priority-note">O cronograma agora escolhe por prioridade de prova, sequência pedagógica, continuidade do assunto iniciado e desempenho. Revisões vencidas continuam acima da fila normal.</div><div class="v430-priority-chips"><span class="v430-priority-chip">PROVA PMBA</span><span class="v430-priority-chip">ORDEM</span><span class="v430-priority-chip">CONTINUIDADE</span><span class="v430-priority-chip">DESEMPENHO</span></div>`;
      if(header)header.insertAdjacentElement('afterend',box); else daily.prepend(box);
    }
    const plan=$('[data-page-view="plan"]');
    if(plan&&!$('#priorityPlannerV430Plan')){
      const header=plan.querySelector('.page-header');
      const box=document.createElement('div');
      box.id='priorityPlannerV430Plan';
      box.className='v430-plan-card';
      box.innerHTML=`<h3>Como a fila de estudo é decidida</h3><p>1) revisão vencida; 2) assunto já iniciado recentemente; 3) assunto mais recorrente na PMBA e bancas de referência; 4) ordem planejada dentro da matéria; 5) seu desempenho. Um tópico do fim do edital não pula para a frente só porque ainda tem poucas evidências.</p>`;
      if(header)header.insertAdjacentElement('afterend',box); else plan.prepend(box);
    }
  }

  async function applyPriority(){
    const {data:{user}}=await db.auth.getUser();
    if(!user)return;
    const {error}=await db.rpc('apply_smart_priorities_v430',{p_user_id:user.id});
    if(error){console.warn('priority v4.30',error);return;}

    const now=new Date();
    const key=`mentor-v430-priority-refresh-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    if(!sessionStorage.getItem(key)){
      sessionStorage.setItem(key,'1');
      setTimeout(()=>{
        try{parent.postMessage({type:'mentor-refresh',hash:location.hash||'#daily'},location.origin);}catch(e){}
      },500);
    }
  }

  const observer=new MutationObserver(()=>injectBanner());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(injectBanner,700);
  setTimeout(()=>applyPriority().catch(e=>console.warn('priority v4.30',e)),2200);
})();