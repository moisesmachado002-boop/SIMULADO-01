(() => {
  'use strict';
  if (window.__mentorOverdueV415) return;
  window.__mentorOverdueV415 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db) return;

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const brDate=v=>{if(!v)return'';const [y,m,d]=String(v).split('-');return `${d}/${m}`;};

  let lockState=null;
  let displayRows=[];
  let topicMap=new Map();
  let subjectMap=new Map();
  let syncing=false;
  let decorating=false;
  let lastSync=0;
  let originalMentor=null;

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;
    n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__overdue415Toast);
    window.__overdue415Toast=setTimeout(()=>n.classList.remove('show'),3800);
  }

  function injectStyle(){
    if($('#overdueV415Style'))return;
    const s=document.createElement('style');s.id='overdueV415Style';s.textContent=`
      #v415LockBanner{margin:0 0 16px;padding:16px 18px;border-radius:14px;background:#fff1df;border:1px solid #efb35e;color:#6f3800;box-shadow:0 8px 24px #0000000d}
      #v415LockBanner .v415-lock-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
      #v415LockBanner strong{display:block;font-size:18px;margin-bottom:5px;color:#8a4300}
      #v415LockBanner p{margin:0;font-size:13px;line-height:1.45}
      #v415LockBanner button{border:1px solid #b56a0a;background:#fff;color:#7b4000;border-radius:9px;padding:10px 13px;font-weight:850;cursor:pointer}
      .daily-task.v415-overdue{border-color:#d97706!important;box-shadow:0 0 0 2px #f59e0b22,0 8px 22px #00000010!important}
      .v415-overdue-badge{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;padding:6px 9px;border-radius:999px;background:#fff1df;color:#9a4d00;border:1px solid #f2bb79;font-size:12px;font-weight:900;letter-spacing:.02em}
      .v415-progress{margin:12px 0 4px;padding:10px 12px;border-radius:10px;background:#f6f7f8;border:1px solid #e2e5e8}
      .v415-progress-head{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:13px;font-weight:850}
      .v415-progress-track{height:7px;border-radius:999px;background:#dde1e5;margin-top:8px;overflow:hidden}.v415-progress-fill{height:100%;background:#f2c500;border-radius:999px}
      .v415-week-locked{display:flex;align-items:center;justify-content:center;min-height:100px;padding:14px;text-align:center;color:#8a5b21;background:#fff8ed;border:1px dashed #e8b970;border-radius:10px;font-size:12px;font-weight:750}
      @media(max-width:620px){#v415LockBanner{margin:0 0 12px;padding:14px}#v415LockBanner button{width:100%}}
    `;document.head.appendChild(s);
  }

  function taskId(card){
    const n=card.querySelector('[data-task-complete],[data-task-review],[data-task-bank],[data-task-open-bank],[data-task-qc]');
    if(!n)return card.dataset.v47TaskId||null;
    return n.dataset.taskComplete||n.dataset.taskReview||n.dataset.taskBank||n.dataset.taskOpenBank||n.dataset.taskQc||card.dataset.v47TaskId||null;
  }

  async function loadDisplayRows(){
    if(!lockState?.locked){displayRows=[];topicMap=new Map();subjectMap=new Map();return;}
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const lock=lockState.locked_from_date;
    const [carriedR,doneR]=await Promise.all([
      db.from('study_plan_items').select('*').eq('user_id',user.id).eq('carried_from_date',lock).neq('status','skipped').order('sort_order'),
      db.from('study_plan_items').select('*').eq('user_id',user.id).eq('scheduled_for',lock).is('carried_from_date',null).eq('status','completed').order('sort_order')
    ]);
    if(carriedR.error)throw carriedR.error;if(doneR.error)throw doneR.error;
    const byId=new Map();[...(doneR.data||[]),...(carriedR.data||[])].forEach(r=>byId.set(r.id,r));
    displayRows=[...byId.values()].sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));

    const topicIds=[...new Set(displayRows.map(r=>r.topic_id).filter(Boolean))];
    topicMap=new Map();subjectMap=new Map();
    if(topicIds.length){
      const tr=await db.from('topics').select('id,title,syllabus_code,subject_id').in('id',topicIds);
      if(!tr.error){(tr.data||[]).forEach(t=>topicMap.set(t.id,t));const subjectIds=[...new Set((tr.data||[]).map(t=>t.subject_id).filter(Boolean))];if(subjectIds.length){const sr=await db.from('subjects').select('id,name').in('id',subjectIds);if(!sr.error)(sr.data||[]).forEach(s=>subjectMap.set(s.id,s));}}
    }
  }

  function renderBanner(){
    const list=$('#dailyTasks');if(!list)return;
    let b=$('#v415LockBanner');
    if(!lockState?.locked){b?.remove();return;}
    if(!b){b=document.createElement('div');b.id='v415LockBanner';list.parentElement?.insertBefore(b,list);}
    const d=brDate(lockState.locked_from_date);
    b.innerHTML=`<div class="v415-lock-head"><div><strong>⚠ DIA ${d} EM ATRASO • CICLO TRAVADO</strong><p>O planejamento continua no dia ${d}. Nenhuma matéria do dia seguinte entra enquanto estas missões não forem concluídas/confirmadas ou enquanto você não replanejar o atraso.</p></div><button type="button" id="v415ReplanButton">Replanejar atraso</button></div>`;
  }

  function decorateDaily(){
    const list=$('#dailyTasks');if(!list||!lockState?.locked)return;
    const lock=lockState.locked_from_date,d=brDate(lock),activeRows=displayRows.filter(r=>r.carried_from_date===lock),activeMap=new Map(activeRows.map(r=>[r.id,r]));

    setTextSafe('#dailyDate',`${d} • ATRASO`);
    setTextSafe('#dailyGreeting',`Dia ${d} ainda está em andamento.`);

    let visible=0;
    $$('#dailyTasks .daily-task').forEach(card=>{
      const id=taskId(card),row=id?activeMap.get(id):null;
      if(!row){card.style.display='none';return;}
      card.style.display='';visible++;
      card.classList.add('v415-overdue');
      const head=card.querySelector('.daily-task-header strong');if(head)head.textContent=`meta do dia ${d}`;
      card.querySelector('.v415-overdue-badge')?.remove();
      const badge=document.createElement('div');badge.className='v415-overdue-badge';badge.textContent=`⚠ ATRASO • dia ${d}`;card.prepend(badge);
      card.querySelector('.v415-progress')?.remove();
      if(row.task_type==='questions'){
        const target=Math.max(1,Number(row.question_target||1)),progress=Math.min(target,Math.max(0,Number(row.progress_count||0))),pct=Math.round(progress/target*100);
        const p=document.createElement('div');p.className='v415-progress';p.innerHTML=`<div class="v415-progress-head"><span>${progress}/${target} questões</span><span>${pct}%</span></div><div class="v415-progress-track"><div class="v415-progress-fill" style="width:${pct}%"></div></div>`;
        const actions=card.querySelector('.task-actions');if(actions)card.insertBefore(p,actions);else card.appendChild(p);
      }
    });

    const subjects=new Set(activeRows.map(r=>topicMap.get(r.topic_id)?.subject_id).filter(Boolean));
    const mins=activeRows.reduce((s,r)=>s+Number(r.duration_minutes||0),0);
    const done=activeRows.filter(r=>r.status==='completed').length;
    const rate=activeRows.length?Math.round(done/activeRows.length*100):0;
    setTextSafe('#dailySubjects',subjects.size);
    setTextSafe('#dailyMinutes',`${mins} min`);
    setTextSafe('#dailyCompleted',`${rate}%`);
    setTextSafe('#dailyProgressText',`${rate}%`);
    const bar=$('#dailyProgressBar');if(bar)bar.style.width=`${rate}%`;

    if(!visible&&activeRows.length){setTimeout(()=>location.reload(),180);}
  }

  function setTextSafe(sel,text){const n=$(sel);if(n)n.textContent=String(text);}

  function weekCard(r){
    const t=topicMap.get(r.topic_id),s=t?subjectMap.get(t.subject_id):null;
    const label=r.task_type==='review'?'Revisão do assunto':`${Number(r.question_target||0)} questões`;
    const cls=r.status==='completed'?' done':'';
    return `<div class="week-task ${r.task_type}${cls}"><strong>${escapeHtml(s?.name||'Estudo')}</strong><span>${escapeHtml((t?.title||'Atividade').slice(0,65))}</span><span>${label} • ${Number(r.duration_minutes||0)} min</span></div>`;
  }

  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function decorateWeek(){
    if(!lockState?.locked)return;
    const board=$('#weekBoard');if(!board)return;
    const lockLabel=brDate(lockState.locked_from_date),days=$$('#weekBoard .week-day');
    let lockIndex=-1;
    days.forEach((day,i)=>{if((day.querySelector('.week-day-head')?.textContent||'').includes(lockLabel))lockIndex=i;});
    if(lockIndex<0)return;
    const sig=`${lockState.locked_from_date}|${displayRows.map(r=>`${r.id}:${r.status}:${r.progress_count}`).join(',')}`;
    days.forEach((day,i)=>{
      const body=day.querySelector('.week-day-body');if(!body)return;
      if(i===lockIndex){if(body.dataset.v415Sig!==sig){body.dataset.v415Sig=sig;body.innerHTML=displayRows.map(weekCard).join('')||'<div class="empty-state">Sem metas</div>';}}
      else if(i>lockIndex){if(body.dataset.v415Locked!==lockLabel){body.dataset.v415Locked=lockLabel;body.innerHTML=`<div class="v415-week-locked">🔒 Aguardando concluir ou replanejar ${lockLabel}</div>`;}}
    });
  }

  async function decorate(){
    if(decorating)return;decorating=true;
    try{injectStyle();renderBanner();if(lockState?.locked){decorateDaily();decorateWeek();}}
    finally{decorating=false;}
  }

  async function syncLock({reloadIfMoved=false}={}){
    if(syncing)return lockState;syncing=true;
    try{
      const {data:{user}}=await db.auth.getUser();if(!user)return null;
      const {data,error}=await db.rpc('sync_overdue_study_day_lock');if(error)throw error;
      lockState=data||{locked:false};lastSync=Date.now();
      if(lockState.locked)localStorage.setItem('mentor_locked_day',lockState.locked_from_date);else localStorage.removeItem('mentor_locked_day');
      await loadDisplayRows();
      if(reloadIfMoved&&Number(data?.moved_for_controls||0)>0){setTimeout(()=>location.reload(),180);return lockState;}
      await decorate();return lockState;
    }catch(e){console.warn('study day lock v4.15',e);return lockState;}finally{syncing=false;}
  }

  async function replan(){
    if(!lockState?.locked)return false;
    const btn=$('#v415ReplanButton');if(btn)btn.disabled=true;
    try{
      const {data,error}=await db.rpc('replan_overdue_study_day');if(error)throw error;
      localStorage.removeItem('mentor_locked_day');
      toast(data?.replanned?'Atraso replanejado. O ciclo será retomado a partir daqui.':'Não há atraso para replanejar.','ok');
      setTimeout(()=>location.reload(),280);return true;
    }catch(e){console.error(e);toast(e?.message||'Não foi possível replanejar o atraso.','error');return true;}finally{if(btn)btn.disabled=false;}
  }

  function wrapMentor(){
    if(window.__mentorLockWrappedV415)return;
    const current=window.MentorIntelligence;if(!current?.run)return;
    originalMentor=current;window.__mentorLockWrappedV415=true;
    window.MentorIntelligence=Object.freeze({...current,run:async(opts={})=>{
      const lock=await syncLock({reloadIfMoved:true});
      if(lock?.locked||lock?.resolved_today){await decorate();return {locked:!!lock?.locked,resolved_today:!!lock?.resolved_today};}
      return originalMentor.run(opts);
    }});
  }

  document.addEventListener('click',async e=>{
    const repl=e.target.closest('#v415ReplanButton,[data-action="replan"]');
    if(repl&&lockState?.locked){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();await replan();return;}
  },true);

  const obs=new MutationObserver(()=>{
    wrapMentor();
    clearTimeout(window.__mentorLockDecorTimer415);
    window.__mentorLockDecorTimer415=setTimeout(()=>decorate().catch(()=>{}),120);
    if(Date.now()-lastSync>2500){clearTimeout(window.__mentorLockSyncTimer415);window.__mentorLockSyncTimer415=setTimeout(()=>syncLock().catch(()=>{}),380);}
  });
  obs.observe(document.documentElement,{subtree:true,childList:true});

  injectStyle();wrapMentor();setTimeout(()=>syncLock({reloadIfMoved:true}),420);
})();