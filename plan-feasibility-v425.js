(() => {
  'use strict';
  if (window.__mentorPlanFeasibilityV425) return;
  window.__mentorPlanFeasibilityV425 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const addDays=(key,n)=>{const [y,m,d]=key.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d+Number(n||0),15));return dateKey(x);};
  let cache={plan:[],topics:new Map(),subjects:new Map(),children:new Map(),prefs:null};
  let busy=false,observerBusy=false;

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__v425Toast);window.__v425Toast=setTimeout(()=>n.classList.remove('show'),3600);
  }

  function injectStyle(){
    if($('#v425Style'))return;
    const s=document.createElement('style');s.id='v425Style';s.textContent=`
      .v425-scope-note{margin:0 0 14px;padding:12px 14px;border-radius:10px;border:1px solid #c9dfcc;background:#f3fbf4;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.v425-scope-note strong{display:block;font-size:12px;margin-bottom:3px}.v425-scope-note span{font-size:11px;color:#55705a;line-height:1.4}.v425-scope-badge{white-space:nowrap;background:#def0e1;color:#1c6630;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}
      .daily-task.v425-scoped .task-content>p{line-height:1.45}.v425-focus{font-size:14px;font-weight:900;color:#1d2630}.v425-parent{display:block;color:#7a7f85;font-size:10px;margin-top:3px}.v425-seq{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;background:#eef3ff;color:#254e8a;font-size:9px;font-weight:900;margin-left:5px}.daily-task[data-type="theory"] .task-color{background:#18b9df!important}
      @media(max-width:700px){.v425-scope-note{flex-direction:column}.v425-scope-badge{align-self:flex-start}}
    `;document.head.appendChild(s);
  }

  async function load(){
    const {data:{user}}=await db.auth.getUser();if(!user)return false;
    const today=dateKey(),end=addDays(today,13);
    const [prefsR,planR,parentsR,childrenR,subjectsR]=await Promise.all([
      db.from('study_preferences').select('daily_minutes,buffer_percent').eq('user_id',user.id).maybeSingle(),
      db.from('study_plan_items').select('id,topic_id,subtopic_id,scheduled_for,task_type,question_target,duration_minutes,status,sort_order,source_reason,progress_count').eq('user_id',user.id).gte('scheduled_for',today).lte('scheduled_for',end).neq('status','skipped').order('scheduled_for').order('sort_order'),
      db.from('topics').select('id,subject_id,title,syllabus_code,parent_topic_id,position').is('parent_topic_id',null),
      db.from('topics').select('id,parent_topic_id,title,syllabus_code,position').eq('source_name','filter_subtopic').not('parent_topic_id','is',null).order('position'),
      db.from('subjects').select('id,name')
    ]);
    for(const r of [prefsR,planR,parentsR,childrenR,subjectsR])if(r.error)throw r.error;
    const topics=new Map((parentsR.data||[]).map(x=>[x.id,x])),subjects=new Map((subjectsR.data||[]).map(x=>[x.id,x]));
    const children=new Map();for(const c of (childrenR.data||[])){if(!children.has(c.parent_topic_id))children.set(c.parent_topic_id,[]);children.get(c.parent_topic_id).push(c);}
    cache={plan:planR.data||[],topics,subjects,children,prefs:prefsR.data||{daily_minutes:60,buffer_percent:15}};
    return true;
  }

  function planIdFromCard(card){
    const b=card.querySelector('[data-task-complete],[data-task-qc],[data-task-bank],[data-task-review],[data-v425-theory]');
    if(!b)return '';
    return b.dataset.taskComplete||b.dataset.taskQc||b.dataset.taskBank||b.dataset.taskReview||b.dataset.v425Theory||'';
  }

  function scopeInfo(item){
    if(!item?.subtopic_id)return null;const child=(cache.children.get(item.topic_id)||[]).find(x=>x.id===item.subtopic_id);if(!child)return null;
    const rows=cache.children.get(item.topic_id)||[],idx=Math.max(0,rows.findIndex(x=>x.id===child.id));return{child,parent:cache.topics.get(item.topic_id),index:idx+1,total:rows.length};
  }

  function decorateCard(card,item){
    if(!card||!item)return;const info=scopeInfo(item);if(!info)return;
    card.classList.add('v425-scoped');
    const p=card.querySelector('.task-content>p');
    if(p)p.innerHTML=`<span class="v425-focus">${esc(info.child.title)}</span><span class="v425-seq">${info.index}/${info.total} subassuntos</span><span class="v425-parent">Parte de: ${esc(info.parent?.title||'assunto do edital')}</span>`;
    const meta=card.querySelectorAll('.task-meta span');
    if(meta[0])meta[0].textContent=item.task_type==='theory'?'Estudo guiado':item.task_type==='review'?'Revisão':`${Number(item.question_target||0)} questão(ões)`;
    if(meta[1])meta[1].textContent=`${Number(item.duration_minutes||0)} min`;
    if(meta[2])meta[2].textContent=info.child.syllabus_code||info.parent?.syllabus_code||'';
    card.dataset.type=item.task_type;
    if(item.task_type==='theory'){
      const primary=card.querySelector('.task-actions .primary-button');
      if(primary){delete primary.dataset.taskBank;delete primary.dataset.taskQc;delete primary.dataset.taskReview;primary.dataset.v425Theory=item.id;primary.textContent=`Estudar ${Number(item.duration_minutes||0)} min`;}
    }else if(item.task_type==='questions'){
      const b=card.querySelector('[data-task-qc],[data-task-bank]');if(b)b.textContent=`Questões: ${info.child.title}`;
    }else if(item.task_type==='review'){
      const b=card.querySelector('[data-task-review]');if(b)b.textContent=`Revisar: ${info.child.title}`;
    }
  }

  function decorateDaily(){
    const today=dateKey(),items=cache.plan.filter(x=>x.scheduled_for===today&&x.status!=='skipped').sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
    const cards=$$('#dailyTasks .daily-task');
    cards.forEach((card,i)=>{
      const id=planIdFromCard(card),item=(id&&items.find(x=>x.id===id))||items[i];decorateCard(card,item);
    });
    const minutes=items.reduce((s,x)=>s+Number(x.duration_minutes||0),0),done=items.filter(x=>x.status==='completed').length,rate=items.length?Math.round(done/items.length*100):0;
    if($('#dailyMinutes'))$('#dailyMinutes').textContent=`${minutes} min`;
    if($('#dailyCompleted'))$('#dailyCompleted').textContent=`${rate}%`;
    if($('#dailyProgressText'))$('#dailyProgressText').textContent=`${rate}%`;
    if($('#dailyProgressBar'))$('#dailyProgressBar').style.width=`${rate}%`;
    renderPlausibility(items);
  }

  function renderPlausibility(items){
    const host=$('#dailyTasks');if(!host)return;let note=$('#v425Plausibility');if(!note){note=document.createElement('div');note.id='v425Plausibility';note.className='v425-scope-note';host.parentElement?.insertBefore(note,host);}
    const broad=items.filter(x=>(cache.children.get(x.topic_id)||[]).length>=3),unscoped=broad.filter(x=>!x.subtopic_id),subjects=new Set(items.map(x=>cache.topics.get(x.topic_id)?.subject_id).filter(Boolean));
    const minutes=items.reduce((s,x)=>s+Number(x.duration_minutes||0),0),daily=Number(cache.prefs?.daily_minutes||60),buffer=Number(cache.prefs?.buffer_percent||0),workBudget=Math.max(20,Math.round(daily*(100-buffer)/100));
    const problems=[];if(unscoped.length)problems.push(`${unscoped.length} assunto(s) amplo(s) ainda sem divisão`);if(subjects.size>2)problems.push('mais de duas matérias no dia');if(minutes>daily)problems.push(`carga de ${minutes} min acima da meta de ${daily} min`);
    if(problems.length){note.innerHTML=`<div><strong>⚠ Plano precisa de ajuste</strong><span>${esc(problems.join(' • '))}</span></div><b class="v425-scope-badge">checagem automática</b>`;}
    else{const scoped=new Set(broad.filter(x=>x.subtopic_id).map(x=>x.topic_id)).size;note.innerHTML=`<div><strong>✓ Carga plausível para hoje</strong><span>${scoped?`${scoped} assunto(s) amplo(s) dividido(s) em um único subassunto por vez. `:''}${minutes} min planejados; sua meta é ${daily} min${buffer?` com ${buffer}% de reserva`:''}.</span></div><b class="v425-scope-badge">plano inteligente</b>`;}
  }

  function decorateWeek(){
    const grid=$('#v423WeekGrid');if(!grid)return;
    $$('.v423-task',grid).forEach(task=>{
      const text=(task.textContent||'').toLowerCase();
      for(const item of cache.plan){const info=scopeInfo(item);if(!info)continue;const parent=(info.parent?.title||'').slice(0,28).toLowerCase();if(parent&&text.includes(parent)){let line=task.querySelector('.v425-week-scope');if(!line){line=document.createElement('p');line.className='v425-week-scope';task.appendChild(line);}line.textContent=`Foco: ${info.child.title} (${info.index}/${info.total})`;break;}}
    });
  }

  async function apply(){
    if(busy)return;busy=true;
    try{
      const {data:{user}}=await db.auth.getUser();if(!user)return;
      const {data,error}=await db.rpc('apply_feasible_plan_scopes');if(error)throw error;
      await load();injectStyle();decorateDaily();decorateWeek();
      const changed=Number(data?.assigned||0)+Number(data?.theory_added||0)+Number(data?.synthetic_reviews_removed||0);
      const key=`mentor-v425-reload-${dateKey()}`;
      if(changed>0&&!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');setTimeout(()=>location.reload(),300);}
    }catch(e){console.warn('plan feasibility v4.25',e);toast('Não consegui aplicar a checagem de carga do plano.','error');}
    finally{busy=false;}
  }

  document.addEventListener('click',e=>{
    const theory=e.target.closest('[data-v425-theory]');
    if(theory){e.preventDefault();e.stopImmediatePropagation();const item=cache.plan.find(x=>x.id===theory.dataset.v425Theory),info=scopeInfo(item);toast(`Estude somente “${info?.child.title||'este subassunto'}” por ${Number(item?.duration_minutes||0)} min e marque concluída ao terminar.`,'ok');$('#studyTimerPill')?.click();return;}
    const qc=e.target.closest('[data-task-qc]');
    if(qc){const item=cache.plan.find(x=>x.id===qc.dataset.taskQc),sub=item?.subtopic_id;if(sub)setTimeout(()=>{const sel=$('#qcSubtopic');if(sel&&[...sel.options].some(o=>o.value===sub)){sel.value=sub;sel.dispatchEvent(new Event('change',{bubbles:true}));}},700);}
    if(e.target.closest('[data-action="replan"],#dailyRefreshButton'))setTimeout(apply,1500);
  },true);

  const obs=new MutationObserver(()=>{if(observerBusy)return;observerBusy=true;setTimeout(()=>{observerBusy=false;decorateDaily();decorateWeek();},180);});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(apply,1200);setTimeout(apply,3800);
  window.addEventListener('focus',()=>setTimeout(apply,400));
})();