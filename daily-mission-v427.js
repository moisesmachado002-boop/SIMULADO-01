(() => {
  'use strict';
  if (window.__mentorDailyMissionV427) return;
  window.__mentorDailyMissionV427 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s), esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  let busy=false,timer=null,cache={items:[],parents:new Map(),children:new Map(),subjects:new Map(),policies:new Map()};

  function injectStyle(){
    if($('#v427Style'))return;
    const s=document.createElement('style');s.id='v427Style';s.textContent=`
      #dailyTasks.v427-native-hidden{display:none!important} #v425Plausibility,#v426Mission{display:none!important}
      .v427-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:13px 16px;border:1px solid #dfe5ea;border-radius:11px;background:#fff}
      .v427-summary strong{font-size:13px}.v427-summary span{font-size:11px;color:#67717a}.v427-summary b{font-size:11px;background:#edf7ef;color:#24723a;border-radius:999px;padding:6px 9px;white-space:nowrap}
      .v427-list{display:grid;gap:14px}.v427-card{background:#fff;border:1px solid #dfe5ea;border-radius:11px;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.02)}
      .v427-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:15px 17px 12px;border-bottom:1px solid #edf0f2}
      .v427-subject{font-size:11px;font-weight:900;text-transform:uppercase;color:#747b83;margin-bottom:5px}.v427-title{font-size:18px;font-weight:900;color:#18212a;line-height:1.25}.v427-parent{font-size:10px;color:#888;margin-top:5px;max-width:920px;line-height:1.35}
      .v427-badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.v427-badge{font-size:10px;font-weight:900;border-radius:999px;padding:5px 8px;white-space:nowrap}.v427-badge.group{background:#fff2cc;color:#7b5700}.v427-badge.split{background:#eef3ff;color:#2f5795}.v427-badge.human{background:#edf7ef;color:#24723a}
      .v427-body{padding:4px 17px 14px}.v427-step{display:grid;grid-template-columns:30px 1fr auto;gap:11px;align-items:center;padding:12px 0;border-bottom:1px solid #f0f2f3}.v427-step:last-child{border-bottom:0}.v427-num{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#f1f3f5;color:#4a535c;font-size:11px;font-weight:900}.v427-step.done .v427-num{background:#dff2e4;color:#187137}.v427-step-main strong{display:block;font-size:13px;color:#202830}.v427-step-main span{display:block;font-size:10px;color:#707981;margin-top:3px;line-height:1.35}.v427-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.v427-actions button{min-height:36px}
      .v427-footer{display:flex;gap:7px;align-items:center;padding:10px 17px;background:#fafbfb;border-top:1px solid #edf0f2;font-size:10px;color:#68717a}.v427-footer strong{color:#222}
      @media(max-width:760px){.v427-head,.v427-summary{flex-direction:column}.v427-badges{justify-content:flex-start}.v427-step{grid-template-columns:30px 1fr}.v427-actions{grid-column:2;justify-content:flex-start}.v427-title{font-size:16px}}
    `;document.head.appendChild(s);
  }

  async function load(){
    const {data:{user}}=await db.auth.getUser();if(!user)return false;
    const today=dateKey();
    const [planR,parentR,childR,subjectR,policyR]=await Promise.all([
      db.from('study_plan_items').select('id,topic_id,subtopic_id,scheduled_for,task_type,question_target,duration_minutes,status,sort_order,source_reason,progress_count').eq('user_id',user.id).eq('scheduled_for',today).neq('status','skipped').order('sort_order'),
      db.from('topics').select('id,subject_id,title,syllabus_code,parent_topic_id').is('parent_topic_id',null),
      db.from('topics').select('id,parent_topic_id,title,syllabus_code,position').eq('source_name','filter_subtopic').not('parent_topic_id','is',null).order('position'),
      db.from('subjects').select('id,name'),
      db.from('user_topic_study_policy').select('topic_id,study_mode,max_subtopics_per_day,questions_per_subtopic,theory_minutes,rationale').eq('user_id',user.id)
    ]);
    for(const r of [planR,parentR,childR,subjectR,policyR])if(r.error)throw r.error;
    const parents=new Map((parentR.data||[]).map(x=>[x.id,x])),subjects=new Map((subjectR.data||[]).map(x=>[x.id,x])),children=new Map(),policies=new Map((policyR.data||[]).map(x=>[x.topic_id,x]));
    for(const c of (childR.data||[])){if(!children.has(c.parent_topic_id))children.set(c.parent_topic_id,[]);children.get(c.parent_topic_id).push(c);}
    cache={items:planR.data||[],parents,children,subjects,policies};return true;
  }

  function policyFor(topicId){return cache.policies.get(topicId)||{study_mode:'adaptive',max_subtopics_per_day:1,questions_per_subtopic:10,theory_minutes:20,rationale:''};}
  function groupKey(item){const p=policyFor(item.topic_id);return p.study_mode==='group'?item.topic_id:`${item.topic_id}|${item.subtopic_id||''}`;}
  function groups(){
    const m=new Map();
    for(const item of cache.items){const key=groupKey(item);if(!m.has(key))m.set(key,{topic_id:item.topic_id,items:[]});m.get(key).items.push(item);}
    return [...m.values()].sort((a,b)=>Math.min(...a.items.map(x=>Number(x.sort_order||0)))-Math.min(...b.items.map(x=>Number(x.sort_order||0))));
  }

  function infoFor(g){
    const parent=cache.parents.get(g.topic_id),rows=cache.children.get(g.topic_id)||[],policy=policyFor(g.topic_id),subject=cache.subjects.get(parent?.subject_id);
    const ids=[...new Set(g.items.map(x=>x.subtopic_id).filter(Boolean))],moduleRows=rows.filter(x=>ids.includes(x.id));
    const single=policy.study_mode!=='group'?rows.find(x=>x.id===g.items.find(y=>y.subtopic_id)?.subtopic_id)||null:null;
    const idx=single?rows.findIndex(x=>x.id===single.id)+1:0;
    return{parent,rows,policy,subject,moduleRows,single,index:idx,total:rows.length,title:policy.study_mode==='group'?(parent?.title||'Bloco de estudo'):(single?.title||parent?.title||'Atividade')};
  }

  function childFor(item,info){return item.subtopic_id?info.rows.find(x=>x.id===item.subtopic_id)||null:null;}
  function actionButtons(item){
    if(item.status==='completed')return '<span style="font-size:11px;font-weight:900;color:#187137">✓ concluído</span>';
    if(item.task_type==='theory')return `<button class="primary-button" data-v427-study="${item.id}">Começar estudo</button><button class="secondary-button" data-task-complete="${item.id}">Concluir estudo</button>`;
    if(item.task_type==='review')return `<button class="primary-button" data-task-review="${item.id}">Fazer revisão</button><button class="secondary-button" data-task-complete="${item.id}">Marcar revisado</button>`;
    if(item.task_type==='questions'){const qc=String(item.source_reason||'').includes('qconcursos')||String(item.source_reason||'').includes('group_v427');return `<button class="primary-button" ${qc?`data-task-qc="${item.id}"`:`data-task-bank="${item.id}"`}>Fazer ${Number(item.question_target||0)} questões</button><button class="secondary-button" data-task-complete="${item.id}">Concluir questões</button>`;}
    return `<button class="secondary-button" data-task-complete="${item.id}">Marcar concluída</button>`;
  }

  function stepLabel(item,info){
    const child=childFor(item,info),group=info.policy.study_mode==='group';
    if(item.task_type==='theory')return [group?'Estudar o bloco conjunto':'Estudar o subassunto',group?`${Number(item.duration_minutes||0)} min para comparar e entender o conjunto`:`${Number(item.duration_minutes||0)} min de teoria focada`];
    if(item.task_type==='review')return [child?`Revisar — ${child.title}`:'Fazer a revisão',`${Number(item.duration_minutes||0)} min`];
    if(item.task_type==='questions')return [child?`${Number(item.question_target||0)} questões — ${child.title}`:`Resolver ${Number(item.question_target||0)} questões`,`${Number(item.duration_minutes||0)} min previstos`];
    return ['Concluir atividade',`${Number(item.duration_minutes||0)} min`];
  }

  function render(){
    injectStyle();const native=$('#dailyTasks');if(!native)return;native.classList.add('v427-native-hidden');
    let host=$('#v427Mission');if(!host){host=document.createElement('section');host.id='v427Mission';native.parentElement?.insertBefore(host,native);}
    const gs=groups(),mins=cache.items.reduce((s,x)=>s+Number(x.duration_minutes||0),0),subjects=new Set(gs.map(g=>cache.parents.get(g.topic_id)?.subject_id).filter(Boolean)),done=cache.items.filter(x=>x.status==='completed').length;
    host.innerHTML=`<div class="v427-summary"><div><strong>${subjects.size} matéria(s), ${gs.length} foco(s) hoje</strong><br><span>O Mentor separa conteúdo pesado e agrupa apenas os blocos que foram classificados como compatíveis no mesmo dia.</span></div><b>${mins} min no total</b></div><div class="v427-list">${gs.map(g=>{const inf=infoFor(g),rank={theory:1,review:1,questions:2,simulation:3},items=[...g.items].sort((a,b)=>(rank[a.task_type]||9)-(rank[b.task_type]||9)||Number(a.sort_order||0)-Number(b.sort_order||0)),cardMins=items.reduce((s,x)=>s+Number(x.duration_minutes||0),0),group=inf.policy.study_mode==='group';return `<article class="v427-card"><div class="v427-head"><div><div class="v427-subject">${esc(inf.subject?.name||'Estudo')}</div><div class="v427-title">${esc(inf.title)}</div><div class="v427-parent">${group?`Bloco conjunto: ${esc((inf.rows.slice(0,inf.policy.max_subtopics_per_day).map(x=>x.title).join(' • ')))}`:(inf.single?`Parte de: ${esc(inf.parent?.title||'')}`:'')}</div></div><div class="v427-badges">${group?'<span class="v427-badge group">BLOCO CONJUNTO</span>':(inf.single?`<span class="v427-badge split">${inf.index}/${inf.total} • 1 POR VEZ</span>`:'')}<span class="v427-badge human">REGRA MONITORADA</span></div></div><div class="v427-body">${items.map((item,i)=>{const [title,meta]=stepLabel(item,inf),isDone=item.status==='completed';return `<div class="v427-step ${isDone?'done':''}"><div class="v427-num">${isDone?'✓':i+1}</div><div class="v427-step-main"><strong>${esc(title)}</strong><span>${esc(meta)}</span></div><div class="v427-actions">${actionButtons(item)}</div></div>`;}).join('')}</div><div class="v427-footer"><strong>${cardMins} min</strong><span>•</span><span>${items.every(x=>x.status==='completed')?'Foco concluído':group?'Estude o conjunto; resolva as questões separadas por módulo':'Um subassunto por vez'}</span></div></article>`;}).join('')}</div>`;
    if($('#dailyMinutes'))$('#dailyMinutes').textContent=`${mins} min`;const rate=cache.items.length?Math.round(done/cache.items.length*100):0;if($('#dailyCompleted'))$('#dailyCompleted').textContent=`${rate}%`;if($('#dailyProgressText'))$('#dailyProgressText').textContent=`${rate}%`;if($('#dailyProgressBar'))$('#dailyProgressBar').style.width=`${rate}%`;
  }

  async function applyPolicies(){
    try{const {error}=await db.rpc('apply_topic_study_policies_v427');if(error)throw error;}catch(e){console.warn('scope policy v4.27',e);}
  }
  async function refresh(apply=false){if(busy)return;busy=true;try{if(apply)await applyPolicies();if(await load())render();}catch(e){console.warn('daily mission v4.27',e);}finally{busy=false;}}

  document.addEventListener('click',e=>{
    const study=e.target.closest('[data-v427-study]');if(study){e.preventDefault();e.stopImmediatePropagation();const item=cache.items.find(x=>x.id===study.dataset.v427Study),g=groups().find(x=>x.items.some(y=>y.id===item?.id)),inf=g?infoFor(g):null,group=inf?.policy?.study_mode==='group';const toast=$('#toast');if(toast){toast.textContent=group?`Estude o bloco conjunto por ${Number(item?.duration_minutes||0)} min. Depois faça as questões de cada módulo separadamente.`:`Agora estude somente “${inf?.title||'este subassunto'}” por ${Number(item?.duration_minutes||0)} min.`;toast.dataset.kind='ok';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4800);}$('#studyTimerPill')?.click();return;}
    if(e.target.closest('[data-task-complete],[data-task-qc],[data-task-bank],[data-task-review]'))setTimeout(()=>refresh(false),900);
  },true);

  const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{const native=$('#dailyTasks');if(native&&!native.classList.contains('v427-native-hidden'))render();},250);});obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>refresh(true),1700);setTimeout(()=>refresh(true),4400);window.addEventListener('focus',()=>setTimeout(()=>refresh(true),450));
})();