(() => {
  'use strict';
  if (window.__mentorOverdueV413) return;
  window.__mentorOverdueV413 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db) return;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const brDate=v=>{if(!v)return'';const [y,m,d]=String(v).split('-');return `${d}/${m}`;};
  let lockState=null,syncing=false,lastSync=0,originalMentor=null;

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__overdueToast);window.__overdueToast=setTimeout(()=>n.classList.remove('show'),3800);
  }

  function injectStyle(){
    if($('#overdueV413Style'))return;
    const s=document.createElement('style');s.id='overdueV413Style';s.textContent=`
      #v413LockBanner{margin:0 0 16px;padding:16px 18px;border-radius:14px;background:#fff1df;border:1px solid #efb35e;color:#6f3800;box-shadow:0 8px 24px #0000000d}
      #v413LockBanner .v413-lock-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
      #v413LockBanner strong{display:block;font-size:18px;margin-bottom:5px;color:#8a4300}
      #v413LockBanner p{margin:0;font-size:13px;line-height:1.45}
      #v413LockBanner button{border:1px solid #b56a0a;background:#fff;color:#7b4000;border-radius:9px;padding:10px 13px;font-weight:850;cursor:pointer}
      .daily-task.v413-overdue{border-color:#d97706!important;box-shadow:0 0 0 2px #f59e0b22,0 8px 22px #00000010!important}
      .v413-overdue-badge{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;padding:6px 9px;border-radius:999px;background:#fff1df;color:#9a4d00;border:1px solid #f2bb79;font-size:12px;font-weight:900;letter-spacing:.02em}
      .v413-progress{margin:12px 0 4px;padding:10px 12px;border-radius:10px;background:#f6f7f8;border:1px solid #e2e5e8}
      .v413-progress-head{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:13px;font-weight:850}
      .v413-progress-track{height:7px;border-radius:999px;background:#dde1e5;margin-top:8px;overflow:hidden}.v413-progress-fill{height:100%;background:#f2c500;border-radius:999px}
      @media(max-width:620px){#v413LockBanner{margin:0 0 12px;padding:14px}#v413LockBanner button{width:100%}}
    `;document.head.appendChild(s);
  }

  function taskId(card){
    const n=card.querySelector('[data-task-complete],[data-task-review],[data-task-open-bank],[data-task-qc]');
    if(!n)return card.dataset.v47TaskId||null;
    return n.dataset.taskComplete||n.dataset.taskReview||n.dataset.taskOpenBank||n.dataset.taskQc||card.dataset.v47TaskId||null;
  }

  async function fetchTodayRows(){
    const {data:{user}}=await db.auth.getUser();if(!user)return[];
    const {data,error}=await db.from('study_plan_items').select('id,carried_from_date,status,task_type,progress_count,question_target,scheduled_for,sort_order').eq('user_id',user.id).eq('scheduled_for',today()).neq('status','skipped').order('sort_order');
    if(error)throw error;return data||[];
  }

  function renderBanner(){
    const list=$('#dailyTasks');if(!list)return;
    let b=$('#v413LockBanner');
    if(!lockState?.locked){b?.remove();return;}
    if(!b){b=document.createElement('div');b.id='v413LockBanner';list.parentElement?.insertBefore(b,list);}
    b.innerHTML=`<div class="v413-lock-head"><div><strong>⚠ DIA ${brDate(lockState.locked_from_date)} EM ATRASO</strong><p>O ciclo está travado neste dia. Ele só avança quando as missões forem concluídas/confirmadas ou quando você escolher replanejar o atraso.</p></div><button type="button" id="v413ReplanButton">Replanejar atraso</button></div>`;
  }

  async function decorate(){
    injectStyle();renderBanner();
    const rows=await fetchTodayRows(),map=new Map(rows.map(x=>[x.id,x]));
    $$('#dailyTasks .daily-task').forEach((card,i)=>{
      const row=map.get(taskId(card))||rows[i];if(!row)return;
      card.classList.toggle('v413-overdue',!!row.carried_from_date);
      card.querySelector('.v413-overdue-badge')?.remove();
      card.querySelector('.v413-progress')?.remove();
      if(row.carried_from_date){const badge=document.createElement('div');badge.className='v413-overdue-badge';badge.textContent=`⚠ ATRASO • missão de ${brDate(row.carried_from_date)}`;card.prepend(badge);}
      if(row.task_type==='questions'){
        const target=Math.max(1,Number(row.question_target||1)),progress=Math.min(target,Math.max(0,Number(row.progress_count||0))),pct=Math.round(progress/target*100);
        const p=document.createElement('div');p.className='v413-progress';p.innerHTML=`<div class="v413-progress-head"><span>${progress}/${target} questões</span><span>${pct}%</span></div><div class="v413-progress-track"><div class="v413-progress-fill" style="width:${pct}%"></div></div>`;
        const actions=card.querySelector('.task-actions');if(actions)card.insertBefore(p,actions);else card.appendChild(p);
      }
    });
  }

  async function syncLock({reloadIfMoved=false}={}){
    if(syncing)return lockState;syncing=true;
    try{
      const {data:{user}}=await db.auth.getUser();if(!user)return null;
      const {data,error}=await db.rpc('sync_overdue_study_day_lock');if(error)throw error;
      lockState=data||{locked:false};lastSync=Date.now();
      if(reloadIfMoved&&Number(data?.moved||0)>0){setTimeout(()=>location.reload(),180);return lockState;}
      await decorate();return lockState;
    }catch(e){console.warn('study day lock',e);return lockState;}finally{syncing=false;}
  }

  async function replan(){
    if(!lockState?.locked)return false;
    const btn=$('#v413ReplanButton');if(btn)btn.disabled=true;
    try{
      const {data,error}=await db.rpc('replan_overdue_study_day');if(error)throw error;
      toast(data?.replanned?'Atraso replanejado. O ciclo volta a avançar no próximo dia de estudo.':'Não há atraso para replanejar.','ok');
      setTimeout(()=>location.reload(),280);return true;
    }catch(e){console.error(e);toast(e?.message||'Não foi possível replanejar o atraso.','error');return true;}finally{if(btn)btn.disabled=false;}
  }

  function wrapMentor(){
    if(window.__mentorLockWrappedV413)return;
    const current=window.MentorIntelligence;if(!current?.run)return;
    originalMentor=current;window.__mentorLockWrappedV413=true;
    window.MentorIntelligence=Object.freeze({...current,run:async(opts={})=>{
      const lock=await syncLock({reloadIfMoved:true});
      if(lock?.locked||lock?.resolved_today){await decorate();return {locked:!!lock?.locked,resolved_today:!!lock?.resolved_today};}
      return originalMentor.run(opts);
    }});
  }

  document.addEventListener('click',async e=>{
    const repl=e.target.closest('#v413ReplanButton,[data-action="replan"]');
    if(repl&&lockState?.locked){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();await replan();return;}
  },true);

  const obs=new MutationObserver(()=>{
    wrapMentor();clearTimeout(window.__mentorLockDecorTimer);window.__mentorLockDecorTimer=setTimeout(()=>decorate().catch(()=>{}),120);
    if(Date.now()-lastSync>1800){clearTimeout(window.__mentorLockSyncTimer);window.__mentorLockSyncTimer=setTimeout(()=>syncLock().catch(()=>{}),300);}
  });
  obs.observe(document.documentElement,{subtree:true,childList:true});

  injectStyle();wrapMentor();setTimeout(()=>syncLock({reloadIfMoved:true}),420);
})();