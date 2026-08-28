(() => {
  'use strict';
  if (window.__mentorOverdueV412) return;
  window.__mentorOverdueV412 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db) return;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const brDate=v=>{if(!v)return'';const [y,m,d]=String(v).split('-');return `${d}/${m}`;};

  function injectStyle(){
    if($('#overdueV412Style'))return;
    const s=document.createElement('style');s.id='overdueV412Style';s.textContent=`
      .daily-task.v412-overdue{border-color:#d97706!important;box-shadow:0 0 0 2px #f59e0b22,0 8px 22px #00000010!important}
      .v412-overdue-badge{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;padding:6px 9px;border-radius:999px;background:#fff1df;color:#9a4d00;border:1px solid #f2bb79;font-size:12px;font-weight:900;letter-spacing:.02em}
    `;document.head.appendChild(s);
  }

  function taskId(card){
    const n=card.querySelector('[data-task-complete],[data-task-review],[data-task-open-bank],[data-task-qc]');
    if(!n)return null;
    return n.dataset.taskComplete||n.dataset.taskReview||n.dataset.taskOpenBank||n.dataset.taskQc||null;
  }

  async function decorate(){
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const {data,error}=await db.from('study_plan_items').select('id,carried_from_date,status').eq('user_id',user.id).eq('scheduled_for',today()).not('carried_from_date','is',null).neq('status','skipped');
    if(error)return console.warn('overdue decorate',error);
    const map=new Map((data||[]).map(x=>[x.id,x]));
    $$('#dailyTasks .daily-task').forEach(card=>{
      const row=map.get(taskId(card));
      card.classList.toggle('v412-overdue',!!row);
      card.querySelector('.v412-overdue-badge')?.remove();
      if(row){
        const b=document.createElement('div');b.className='v412-overdue-badge';b.textContent=`⚠ ATRASADA • veio de ${brDate(row.carried_from_date)}`;card.prepend(b);
      }
    });
  }

  async function carry(){
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const {data,error}=await db.rpc('carry_over_overdue_plan_items');
    if(error){console.warn('carry overdue',error);return;}
    const moved=Number(data?.moved||0),key=`mentor-overdue-v412-${today()}`;
    if(moved>0&&sessionStorage.getItem(key)!=='1'){
      sessionStorage.setItem(key,'1');
      setTimeout(()=>location.reload(),180);
      return;
    }
    injectStyle();decorate();
  }

  const obs=new MutationObserver(()=>{clearTimeout(window.__mentorOverdueDecor);window.__mentorOverdueDecor=setTimeout(decorate,140);});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(carry,450);
})();