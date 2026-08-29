(() => {
  'use strict';
  if (window.__mentorDailyMissionV426) return;
  window.__mentorDailyMissionV426 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  let busy=false, timer=null, cache={items:[],parents:new Map(),children:new Map(),subjects:new Map()};

  function injectStyle(){
    if($('#v426Style'))return;
    const s=document.createElement('style');s.id='v426Style';s.textContent=`
      #dailyTasks.v426-native-hidden{display:none!important}
      #v425Plausibility{display:none!important}
      .v426-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:13px 16px;border:1px solid #dfe5ea;border-radius:11px;background:#fff}
      .v426-summary strong{font-size:13px}.v426-summary span{font-size:11px;color:#67717a}.v426-summary b{font-size:11px;background:#edf7ef;color:#24723a;border-radius:999px;padding:6px 9px;white-space:nowrap}
      .v426-list{display:grid;gap:14px}
      .v426-card{background:#fff;border:1px solid #dfe5ea;border-radius:11px;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.02)}
      .v426-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:15px 17px 12px;border-bottom:1px solid #edf0f2}
      .v426-subject{font-size:11px;font-weight:900;text-transform:uppercase;color:#747b83;margin-bottom:5px}.v426-title{font-size:18px;font-weight:900;color:#18212a;line-height:1.25}.v426-parent{font-size:10px;color:#888;margin-top:5px;max-width:880px;line-height:1.35}.v426-badge{font-size:10px;font-weight:900;background:#eef3ff;color:#2f5795;border-radius:999px;padding:5px 8px;white-space:nowrap}
      .v426-body{padding:4px 17px 14px}.v426-step{display:grid;grid-template-columns:30px 1fr auto;gap:11px;align-items:center;padding:12px 0;border-bottom:1px solid #f0f2f3}.v426-step:last-child{border-bottom:0}.v426-num{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#f1f3f5;color:#4a535c;font-size:11px;font-weight:900}.v426-step.done .v426-num{background:#dff2e4;color:#187137}.v426-step-main strong{display:block;font-size:13px;color:#202830}.v426-step-main span{display:block;font-size:10px;color:#707981;margin-top:3px}.v426-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.v426-actions button{min-height:36px}
      .v426-footer{display:flex;gap:7px;align-items:center;padding:10px 17px;background:#fafbfb;border-top:1px solid #edf0f2;font-size:10px;color:#68717a}.v426-footer strong{color:#222}
      @media(max-width:760px){.v426-head,.v426-summary{flex-direction:column}.v426-step{grid-template-columns:30px 1fr}.v426-actions{grid-column:2;justify-content:flex-start}.v426-title{font-size:16px}}
    `;document.head.appendChild(s);
  }

  async function load(){
    const {data:{user}}=await db.auth.getUser();if(!user)return false;
    const today=dateKey();
    const [planR,parentR,childR,subjectR]=await Promise.all([
      db.from('study_plan_items').select('id,topic_id,subtopic_id,scheduled_for,task_type,question_target,duration_minutes,status,sort_order,source_reason,progress_count').eq('user_id',user.id).eq('scheduled_for',today).neq('status','skipped').order('sort_order'),
      db.from('topics').select('id,subject_id,title,syllabus_code,parent_topic_id').is('parent_topic_id',null),
      db.from('topics').select('id,parent_topic_id,title,syllabus_code,position').eq('source_name','filter_subtopic').not('parent_topic_id','is',null).order('position'),
      db.from('subjects').select('id,name')
    ]);
    for(const r of [planR,parentR,childR,subjectR])if(r.error)throw r.error;
    const parents=new Map((parentR.data||[]).map(x=>[x.id,x])),subjects=new Map((subjectR.data||[]).map(x=>[x.id,x])),children=new Map();
    for(const c of (childR.data||[])){if(!children.has(c.parent_topic_id))children.set(c.parent_topic_id,[]);children.get(c.parent_topic_id).push(c);}
    cache={items:planR.data||[],parents,children,subjects};return true;
  }

  function groups(){
    const m=new Map();
    for(const item of cache.items){
      const key=`${item.topic_id}|${item.subtopic_id||''}`;
      if(!m.has(key))m.set(key,{topic_id:item.topic_id,subtopic_id:item.subtopic_id,items:[]});m.get(key).items.push(item);
    }
    return [...m.values()].sort((a,b)=>Math.min(...a.items.map(x=>Number(x.sort_order||0)))-Math.min(...b.items.map(x=>Number(x.sort_order||0))));
  }

  function infoFor(g){
    const parent=cache.parents.get(g.topic_id),rows=cache.children.get(g.topic_id)||[],child=rows.find(x=>x.id===g.subtopic_id)||null,subject=cache.subjects.get(parent?.subject_id);const idx=child?rows.findIndex(x=>x.id===child.id)+1:0;
    return{parent,child,subject,index:idx,total:rows.length,title:child?.title||parent?.title||'Atividade'};
  }

  function actionButtons(item,info){
    if(item.status==='completed')return '<span style="font-size:11px;font-weight:900;color:#187137">✓ concluído</span>';
    if(item.task_type==='theory')return `<button class="primary-button" data-v426-study="${item.id}">Começar estudo</button><button class="secondary-button" data-task-complete="${item.id}">Concluir estudo</button>`;
    if(item.task_type==='review')return `<button class="primary-button" data-task-review="${item.id}">Fazer revisão</button><button class="secondary-button" data-task-complete="${item.id}">Marcar revisado</button>`;
    if(item.task_type==='questions'){
      const qc=String(item.source_reason||'').includes('qconcursos');
      return `<button class="primary-button" ${qc?`data-task-qc="${item.id}"`:`data-task-bank="${item.id}"`}>Fazer ${Number(item.question_target||0)} questões</button><button class="secondary-button" data-task-complete="${item.id}">Concluir questões</button>`;
    }
    return `<button class="secondary-button" data-task-complete="${item.id}">Marcar concluída</button>`;
  }

  function stepLabel(item){
    if(item.task_type==='theory')return ['Estudar o subassunto',`${Number(item.duration_minutes||0)} min de teoria focada`];
    if(item.task_type==='review')return ['Fazer a revisão',`${Number(item.duration_minutes||0)} min`];
    if(item.task_type==='questions')return [`Resolver ${Number(item.question_target||0)} questões`,`${Number(item.duration_minutes||0)} min previstos`];
    return ['Concluir atividade',`${Number(item.duration_minutes||0)} min`];
  }

  function render(){
    injectStyle();const native=$('#dailyTasks');if(!native)return;native.classList.add('v426-native-hidden');
    let host=$('#v426Mission');if(!host){host=document.createElement('section');host.id='v426Mission';native.parentElement?.insertBefore(host,native);}
    const gs=groups(),mins=cache.items.reduce((s,x)=>s+Number(x.duration_minutes||0),0),subjects=new Set(gs.map(g=>cache.parents.get(g.topic_id)?.subject_id).filter(Boolean));
    const done=cache.items.filter(x=>x.status==='completed').length;
    host.innerHTML=`<div class="v426-summary"><div><strong>Hoje está simples: ${subjects.size} matéria(s), ${gs.length} foco(s)</strong><br><span>Faça cada cartão de cima para baixo. Quando terminar um passo, marque somente aquele passo como concluído.</span></div><b>${mins} min no total</b></div><div class="v426-list">${gs.map(g=>{const inf=infoFor(g),items=[...g.items].sort((a,b)=>{const rank={theory:1,review:1,questions:2,simulation:3};return (rank[a.task_type]||9)-(rank[b.task_type]||9)||Number(a.sort_order||0)-Number(b.sort_order||0);}),cardMins=items.reduce((s,x)=>s+Number(x.duration_minutes||0),0);return `<article class="v426-card"><div class="v426-head"><div><div class="v426-subject">${esc(inf.subject?.name||'Estudo')}</div><div class="v426-title">${esc(inf.title)}</div>${inf.child?`<div class="v426-parent">Parte de: ${esc(inf.parent?.title||'')}</div>`:''}</div>${inf.child?`<span class="v426-badge">${inf.index}/${inf.total} subassuntos</span>`:''}</div><div class="v426-body">${items.map((item,i)=>{const [title,meta]=stepLabel(item),done=item.status==='completed';return `<div class="v426-step ${done?'done':''}"><div class="v426-num">${done?'✓':i+1}</div><div class="v426-step-main"><strong>${esc(title)}</strong><span>${esc(meta)}</span></div><div class="v426-actions">${actionButtons(item,inf)}</div></div>`;}).join('')}</div><div class="v426-footer"><strong>${cardMins} min</strong><span>•</span><span>${items.every(x=>x.status==='completed')?'Foco concluído':'Siga os passos na ordem'}</span></div></article>`;}).join('')}</div>`;
    if($('#dailyMinutes'))$('#dailyMinutes').textContent=`${mins} min`;
    const rate=cache.items.length?Math.round(done/cache.items.length*100):0;if($('#dailyCompleted'))$('#dailyCompleted').textContent=`${rate}%`;if($('#dailyProgressText'))$('#dailyProgressText').textContent=`${rate}%`;if($('#dailyProgressBar'))$('#dailyProgressBar').style.width=`${rate}%`;
  }

  async function refresh(){if(busy)return;busy=true;try{if(await load())render();}catch(e){console.warn('daily mission v4.26',e);}finally{busy=false;}}

  document.addEventListener('click',e=>{
    const study=e.target.closest('[data-v426-study]');if(study){e.preventDefault();e.stopImmediatePropagation();const item=cache.items.find(x=>x.id===study.dataset.v426Study),g=groups().find(x=>x.items.some(y=>y.id===item?.id)),inf=g?infoFor(g):null;const toast=$('#toast');if(toast){toast.textContent=`Agora estude somente “${inf?.title||'este subassunto'}” por ${Number(item?.duration_minutes||0)} min.`;toast.dataset.kind='ok';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4200);}$('#studyTimerPill')?.click();return;}
    if(e.target.closest('[data-task-complete],[data-task-qc],[data-task-bank],[data-task-review]'))setTimeout(refresh,900);
  },true);

  const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{const native=$('#dailyTasks');if(native&&!native.classList.contains('v426-native-hidden'))render();},250);});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(refresh,1000);setTimeout(refresh,3200);window.addEventListener('focus',()=>setTimeout(refresh,350));
})();