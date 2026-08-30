(() => {
  'use strict';
  if(window.__mentorPlanUiV500)return;
  window.__mentorPlanUiV500=true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  let client=null,busy=false,activeWeek='';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const addDays=(key,n)=>{const d=new Date(`${key}T15:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return dateKey(d);};
  const mondayOf=key=>{const d=new Date(`${key}T15:00:00Z`),w=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+1-w);return dateKey(d);};
  const defaultWeek=()=>{const t=dateKey(),w=new Date(`${t}T15:00:00Z`).getUTCDay()||7;return w===7?addDays(t,1):mondayOf(t);};
  const br=k=>{const [y,m,d]=String(k).split('-');return `${d}/${m}/${y}`;};
  const weekday=k=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,weekday:'long'}).format(new Date(`${k}T15:00:00Z`)).replace(/^./,x=>x.toUpperCase());

  function db(){
    if(client)return client;
    if(!window.supabase?.createClient)throw new Error('Conexão ainda não carregou.');
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return client;
  }
  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__mentorPlanUiToast);window.__mentorPlanUiToast=setTimeout(()=>n.classList.remove('show'),3800);
  }
  function emit(kind='plan'){
    window.MentorRequestGuard?.invalidate?.();
    document.dispatchEvent(new CustomEvent('mentor-plan-changed',{detail:{kind}}));
  }

  function style(){
    if($('#mentorPlanUiV500Style'))return;
    const s=document.createElement('style');s.id='mentorPlanUiV500Style';s.textContent=`
      #dailyTasks.v500-native-hidden{display:none!important}.v500-status{margin:0 0 12px;padding:11px 14px;border:1px solid #d8e7da;background:#f3faf4;border-radius:10px;display:flex;justify-content:space-between;gap:12px;align-items:center}.v500-status strong{font-size:12px}.v500-status span{font-size:10px;color:#65716a}.v500-status b{font-size:9px;background:#dff2e4;color:#1d7138;border-radius:999px;padding:5px 8px;white-space:nowrap}.v500-status.warn{background:#fff6e5;border-color:#efc16e}.v500-status.warn b{background:#ffe2a6;color:#734d00}
      .v500-list{display:grid;gap:14px}.v500-card{background:#fff;border:1px solid #dfe5ea;border-radius:12px;overflow:hidden}.v500-card.review{border-left:5px solid #c837a1}.v500-head{padding:15px 17px 12px;border-bottom:1px solid #edf0f2;display:flex;justify-content:space-between;gap:14px}.v500-subject{font-size:10px;font-weight:900;color:#737b83;text-transform:uppercase}.v500-title{font-size:17px;font-weight:900;color:#18212a;margin-top:4px}.v500-parent{font-size:10px;color:#858b91;margin-top:5px;line-height:1.4}.v500-badge{font-size:9px;font-weight:900;border-radius:999px;padding:5px 8px;background:#eef3ff;color:#2f5795;height:max-content;white-space:nowrap}.v500-badge.review{background:#fff0fa;color:#8f216f}.v500-body{padding:3px 17px 13px}.v500-step{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #f0f2f3}.v500-step:last-child{border-bottom:0}.v500-num{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#f0f2f4;font-size:10px;font-weight:900}.v500-step.done .v500-num{background:#dff2e4;color:#187137}.v500-step strong{display:block;font-size:13px}.v500-step small{display:block;color:#707981;margin-top:3px;font-size:10px}.v500-actions{display:flex;gap:7px;flex-wrap:wrap}.v500-foot{padding:10px 17px;background:#fafbfb;border-top:1px solid #edf0f2;font-size:10px;color:#69727a}
      .v500-week-note{margin:0 0 12px;padding:11px 14px;border:1px solid #d7e4ef;background:#f5f9fd;border-radius:10px;display:flex;gap:12px;justify-content:space-between;align-items:center;font-size:11px}.v500-week-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.v500-week-actions b{background:#e3eefb;color:#244f83;border-radius:999px;padding:5px 8px;font-size:9px}.v500-replan{border:1px solid #b9cee1;background:#fff;color:#244f83;border-radius:8px;padding:7px 10px;font-size:10px;font-weight:850;cursor:pointer}.v500-grid{display:grid;grid-template-columns:repeat(7,minmax(180px,1fr));gap:1px;background:#d7d7d7;border:1px solid #d7d7d7;border-radius:10px;overflow:auto}.v500-day{background:#fff;min-height:260px}.v500-day-head{background:#2f2f2f;color:#fff;padding:10px;font-size:11px;font-weight:850}.v500-day-head small{display:block;margin-top:4px;color:#d7d7d7;font-size:9px}.v500-day-body{padding:8px;display:grid;align-content:start;gap:8px}.v500-focus{border:1px solid #dfe5ea;border-left:5px solid #1f8fd5;background:#fff;border-radius:9px;padding:10px;color:#1d2730}.v500-focus.review{border-left-color:#c837a1;background:#fff7fc}.v500-focus.done{border-left-color:#3aa86a;background:#f2fbf5}.v500-focus .subj{font-size:9px;text-transform:uppercase;font-weight:900;color:#69737d}.v500-focus .ttl{font-size:12px;font-weight:900;margin:3px 0 7px;line-height:1.25}.v500-focus .line{font-size:9px;color:#59636d;line-height:1.35;margin:3px 0}.v500-total{margin-top:8px;padding-top:7px;border-top:1px solid #edf0f2;font-size:9px;font-weight:900;color:#374151}.v500-day-total{padding:7px 10px;border-top:1px solid #eee;background:#fafafa;font-size:9px;color:#68727b}.v500-empty,.v500-rest{padding:16px 8px;color:#9299a1;font-size:10px}.v500-rest{font-weight:800}
      @media(max-width:900px){.v500-grid{grid-template-columns:repeat(7,220px)}.v500-week-note,.v500-head,.v500-status{align-items:flex-start;flex-direction:column}.v500-step{grid-template-columns:28px 1fr}.v500-actions{grid-column:2}}
    `;document.head.appendChild(s);
  }

  async function context(start,end){
    const c=db(),{data:{user},error:uerr}=await c.auth.getUser();if(uerr||!user)throw new Error('Sessão expirada.');
    const [planR,topicsR,subjectsR,policiesR,prefsR]=await Promise.all([
      c.from('study_plan_items').select('id,topic_id,subtopic_id,scheduled_for,task_type,question_target,progress_count,duration_minutes,status,sort_order,source_reason,completed_at,lifecycle_kind').eq('user_id',user.id).gte('scheduled_for',start).lte('scheduled_for',end).neq('status','skipped').order('scheduled_for').order('sort_order'),
      c.from('topics').select('id,subject_id,parent_topic_id,title,syllabus_code,source_name,position'),
      c.from('subjects').select('id,name,position'),
      c.from('user_topic_study_policy').select('topic_id,study_mode,max_subtopics_per_day,questions_per_subtopic,rationale').eq('user_id',user.id),
      c.from('study_preferences').select('study_days,daily_minutes,buffer_percent,review_ratio,updated_at').eq('user_id',user.id).maybeSingle()
    ]);
    for(const r of [planR,topicsR,subjectsR,policiesR,prefsR])if(r.error)throw r.error;
    return {plan:planR.data||[],topics:new Map((topicsR.data||[]).map(x=>[x.id,x])),subjects:new Map((subjectsR.data||[]).map(x=>[x.id,x])),policies:new Map((policiesR.data||[]).map(x=>[x.topic_id,x])),prefs:prefsR.data||{study_days:[1,2,3,4,5,6],daily_minutes:120,buffer_percent:15,review_ratio:40}};
  }

  function grouped(items,ctx){
    const m=new Map();
    for(const x of items){
      const t=ctx.topics.get(x.topic_id),sid=t?.subject_id||x.topic_id,p=ctx.policies.get(x.topic_id),review=x.task_type==='review';
      const key=review?`review|${sid}`:(p?.study_mode==='group'?`group|${x.topic_id}`:`focus|${x.topic_id}|${x.subtopic_id||''}`);
      if(!m.has(key))m.set(key,{topic_id:x.topic_id,subject_id:sid,review,policy:p,items:[]});m.get(key).items.push(x);
    }
    return [...m.values()].sort((a,b)=>Math.min(...a.items.map(x=>x.sort_order||0))-Math.min(...b.items.map(x=>x.sort_order||0)));
  }

  function taskAction(x){
    if(x.status==='completed')return '<span style="font-weight:900;color:#187137;font-size:11px">✓ concluído</span>';
    if(x.task_type==='review')return `<button class="primary-button" data-task-review="${x.id}">Revisar</button>`;
    if(x.task_type==='questions'){
      const qc=/qconcursos|group_v428|feasible_v425|v500_group/.test(x.source_reason||'');
      return `<button class="primary-button" ${qc?`data-task-qc="${x.id}"`:`data-task-bank="${x.id}"`}>Fazer questões</button><button class="secondary-button" data-task-complete="${x.id}">Concluir</button>`;
    }
    if(['theory','study'].includes(x.task_type))return `<button class="primary-button" data-v500-study="${x.id}">Começar estudo</button><button class="secondary-button" data-task-complete="${x.id}">Concluir</button>`;
    return `<button class="secondary-button" data-task-complete="${x.id}">Concluir</button>`;
  }

  function dailyCard(g,ctx){
    const items=[...g.items].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)),t=ctx.topics.get(g.topic_id),s=ctx.subjects.get(g.subject_id),sub=items.find(x=>x.subtopic_id)?.subtopic_id,st=sub?ctx.topics.get(sub):null,mins=items.reduce((z,x)=>z+Number(x.duration_minutes||0),0),allDone=items.every(x=>x.status==='completed');
    const title=g.review?`Revisões de ${s?.name||'matéria'}`:(g.policy?.study_mode==='group'?(t?.title||'Bloco conjunto'):(st?.title||t?.title||'Atividade'));
    const parent=g.review?`${items.length} assunto(s) agrupado(s) por matéria.`:(st?`Parte de: ${t?.title||''}`:g.policy?.study_mode==='group'?'Bloco conjunto do mesmo assunto.':'');
    const rows=items.map((x,i)=>{const tx=ctx.topics.get(x.topic_id),sx=x.subtopic_id?ctx.topics.get(x.subtopic_id):null;let a='Atividade',b=`${x.duration_minutes||0} min`;if(x.task_type==='review'){a=tx?.title||'Revisão';b=`${x.duration_minutes||0} min de revisão`;}else if(x.task_type==='questions'){a=sx?`${x.question_target||0} questões — ${sx.title}`:`${x.question_target||0} questões`;b=`${x.duration_minutes||0} min previstos`;}else if(['theory','study'].includes(x.task_type)){a='Estudar';b=`${x.duration_minutes||0} min de teoria`;}return `<div class="v500-step ${x.status==='completed'?'done':''}"><div class="v500-num">${x.status==='completed'?'✓':i+1}</div><div><strong>${esc(a)}</strong><small>${esc(b)}</small></div><div class="v500-actions">${taskAction(x)}</div></div>`;}).join('');
    return `<article class="v500-card ${g.review?'review':''}"><div class="v500-head"><div><div class="v500-subject">${esc(s?.name||'Estudo')}</div><div class="v500-title">${esc(title)}</div><div class="v500-parent">${esc(parent)}</div></div><span class="v500-badge ${g.review?'review':''}">${g.review?'REVISÕES':g.policy?.study_mode==='group'?'BLOCO CONJUNTO':'META DO DIA'}</span></div><div class="v500-body">${rows}</div><div class="v500-foot"><strong>${mins} min</strong> • ${allDone?'foco concluído':'faça somente o que está neste cartão'}</div></article>`;
  }

  async function renderDaily(){
    const today=dateKey(),ctx=await context(addDays(today,-30),today),native=$('#dailyTasks');if(!native)return;
    native.classList.add('v500-native-hidden');let host=$('#v500Daily');if(!host){host=document.createElement('section');host.id='v500Daily';native.parentElement?.insertBefore(host,native);}
    const activeDates=[...new Set(ctx.plan.filter(x=>['pending','in_progress'].includes(x.status)&&x.scheduled_for<=today).map(x=>x.scheduled_for))].sort();
    const day=activeDates[0]||today,overdue=day<today,items=ctx.plan.filter(x=>x.scheduled_for===day),groups=grouped(items,ctx),mins=items.reduce((s,x)=>s+Number(x.duration_minutes||0),0),budget=Math.max(20,Math.floor(Number(ctx.prefs.daily_minutes||120)*(100-clamp(Number(ctx.prefs.buffer_percent||0),0,40))/100)),subjects=new Set(items.map(x=>ctx.topics.get(x.topic_id)?.subject_id).filter(Boolean)),doneMinutes=items.reduce((s,x)=>s+(x.status==='completed'?Number(x.duration_minutes||0):x.task_type==='questions'&&x.status==='in_progress'?Number(x.duration_minutes||0)*Math.min(1,Number(x.progress_count||0)/Math.max(1,Number(x.question_target||1))):0),0),rate=mins?Math.round(doneMinutes/mins*100):0,started=items.some(x=>['completed','in_progress'].includes(x.status)),over=mins>budget;
    const head=overdue?`Meta de ${br(day)} em atraso`:started?'Meta de hoje em execução':'Meta de hoje pronta';
    const detail=overdue?'Ela continua no dia original. Nada foi movido automaticamente. Conclua ou use Replanejar.':`${groups.some(g=>g.review)?'Revisões da mesma matéria ficam juntas. ':''}Configuração: ${ctx.prefs.daily_minutes||120} min/dia, ${ctx.prefs.review_ratio??40}% revisão, teto útil ${budget} min.`;
    host.innerHTML=`<div class="v500-status ${overdue||over?'warn':''}"><div><strong>${head}</strong><br><span>${detail}</span></div><b>${overdue?'ATRASO':over?'REVER CARGA':'ESTÁVEL'}</b></div><div class="v500-list">${groups.length?groups.map(g=>dailyCard(g,ctx)).join(''):'<div class="empty-state panel">Sem meta planejada para hoje.</div>'}</div>`;
    if($('#dailyDate'))$('#dailyDate').textContent=overdue?`${br(day).slice(0,5)} • ATRASO`:br(day).slice(0,5);
    if($('#dailyGreeting'))$('#dailyGreeting').textContent=overdue?`Conclua a meta de ${br(day).slice(0,5)}`:'Seu estudo de hoje';
    if($('#dailySubjects'))$('#dailySubjects').textContent=subjects.size;if($('#dailyMinutes'))$('#dailyMinutes').textContent=`${mins} min`;if($('#dailyCompleted'))$('#dailyCompleted').textContent=`${rate}%`;if($('#dailyProgressText'))$('#dailyProgressText').textContent=`${rate}%`;if($('#dailyProgressBar'))$('#dailyProgressBar').style.width=`${rate}%`;
  }

  function weekFocus(g,ctx){
    const items=[...g.items].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)),t=ctx.topics.get(g.topic_id),s=ctx.subjects.get(g.subject_id),sub=items.find(x=>x.subtopic_id)?.subtopic_id,st=sub?ctx.topics.get(sub):null,mins=items.reduce((z,x)=>z+Number(x.duration_minutes||0),0),done=items.every(x=>x.status==='completed'),title=g.review?`Revisões de ${s?.name||'matéria'}`:(g.policy?.study_mode==='group'?(t?.title||'Bloco conjunto'):(st?.title||t?.title||'Atividade'));
    const lines=g.review?items.map(x=>`<div class="line">• ${esc(ctx.topics.get(x.topic_id)?.title||'Revisão')} • ${Number(x.duration_minutes||0)} min${x.status==='completed'?' ✓':''}</div>`).join(''):items.map(x=>{if(['theory','study'].includes(x.task_type))return `<div class="line"><b>Estudo:</b> ${Number(x.duration_minutes||0)} min${x.status==='completed'?' ✓':''}</div>`;if(x.task_type==='questions'){const sx=x.subtopic_id?ctx.topics.get(x.subtopic_id):null;return `<div class="line"><b>${esc(sx?.title||'Questões')}:</b> ${Number(x.question_target||0)} questões${x.status==='completed'?' ✓':''}</div>`;}return '';}).join('');
    return `<article class="v500-focus ${g.review?'review':''} ${done?'done':''}"><div class="subj">${esc(s?.name||'Estudo')}</div><div class="ttl">${esc(title)}</div>${lines}<div class="v500-total">${mins} min • ${done?'concluído':'planejado'}</div></article>`;
  }

  async function renderWeek(start=activeWeek||defaultWeek()){
    const ctx=await context(start,addDays(start,6)),host=$('#v423WeekGrid')||$('#weekBoard');if(!host)return;activeWeek=start;
    const studyDays=new Set((ctx.prefs.study_days||[1,2,3,4,5,6]).map(Number)),days=Array.from({length:7},(_,i)=>addDays(start,i));
    host.innerHTML=`<div class="v500-week-note"><div><strong>Planejamento V5</strong><br><span>Abrir, atualizar e navegar não alteram o cronograma. Salvar horários e Replanejar usam o mesmo motor.</span></div><div class="v500-week-actions"><b>SOMENTE LEITURA</b><button class="v500-replan" id="v500Replan">Replanejar esta semana</button></div></div><div class="v500-grid">${days.map(day=>{const items=ctx.plan.filter(x=>x.scheduled_for===day),groups=grouped(items,ctx),dow=new Date(`${day}T15:00:00Z`).getUTCDay()||7,total=items.reduce((z,x)=>z+Number(x.duration_minutes||0),0);return `<section class="v500-day"><div class="v500-day-head">${esc(weekday(day))}<br>${br(day)}<small>${groups.length?`${groups.length} bloco(s) • ${total} min`:studyDays.has(dow)?'sem foco registrado':'descanso'}</small></div><div class="v500-day-body">${groups.length?groups.map(g=>weekFocus(g,ctx)).join(''):(studyDays.has(dow)?'<div class="v500-empty">Sem meta planejada.</div>':'<div class="v500-rest">Descanso</div>')}</div>${groups.length?`<div class="v500-day-total">Total do dia: <strong>${total} min</strong></div>`:''}</section>`;}).join('')}</div>`;
  }

  async function savePreferences(btn){
    if(btn?.dataset.busy==='1')return;
    const daily=Number($('#prefDailyMinutes')?.value),review=Number($('#prefReviewRatio')?.value),buffer=Number($('#prefBuffer')?.value),days=$$('#weekdayPicker input:checked').map(x=>Number(x.value));
    if(!Number.isFinite(daily)||daily<20||daily>480||!days.length)throw new Error('Confira minutos e dias de estudo.');
    if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='Salvando...';}
    try{
      const r=await db().rpc('update_study_preferences_v434',{p_daily_minutes:Math.round(daily),p_study_days:days,p_review_ratio:clamp(Math.round(Number.isFinite(review)?review:40),0,100),p_buffer_percent:clamp(Math.round(Number.isFinite(buffer)?buffer:15),0,40),p_timezone:TZ});
      if(r.error)throw r.error;if(!r.data?.ok)throw new Error('O servidor não confirmou a alteração.');
      toast('Configuração salva e cronograma recalculado.','ok');emit('preferences_replan');setTimeout(()=>location.reload(),600);
    }finally{if(btn){delete btn.dataset.busy;btn.disabled=false;btn.textContent='Salvar horários';}}
  }

  async function replan(start=activeWeek||defaultWeek(),confirmUser=true){
    if(busy)return;if(confirmUser&&!confirm('Replanejar esta semana? Metas pendentes podem ser substituídas e revisões terão prioridade.'))return;busy=true;
    try{
      const r=await db().rpc('rebuild_smart_week_v431',{p_week_start:start});if(r.error)throw r.error;
      toast('Semana replanejada pelo motor V5.','ok');emit('stable_replan');await Promise.allSettled([renderDaily(),renderWeek(start)]);return r.data;
    }finally{busy=false;}
  }

  function ensureSkipButton(){
    const card=$('#questionCard');if(!card||$('#questionSkipButton'))return;
    const btn=document.createElement('button');btn.id='questionSkipButton';btn.type='button';btn.className='secondary-button';btn.textContent='Pular questão →';const confirm=$('#questionConfirmButton');if(confirm?.parentElement)confirm.parentElement.insertBefore(btn,confirm.nextSibling);
    btn.addEventListener('click',()=>{const fb=$('#questionFeedback');if(fb&&!fb.classList.contains('hidden'))return;$('#questionNextButton')?.click();toast('Questão pulada. Não contou como erro nem como progresso.');});
  }

  function boot(){
    style();setTimeout(()=>{renderDaily().catch(e=>console.warn('daily v500',e));renderWeek().catch(e=>console.warn('week v500',e));ensureSkipButton();},1100);
    document.addEventListener('click',e=>{
      const save=e.target.closest('#savePreferencesButton');if(save){e.preventDefault();e.stopImmediatePropagation();savePreferences(save).catch(err=>{console.error(err);toast(err?.message||'Não foi possível salvar.','error');});return;}
      const rp=e.target.closest('#v500Replan,[data-action="replan"]');if(rp){e.preventDefault();e.stopImmediatePropagation();replan(activeWeek||defaultWeek(),true).catch(err=>{console.error(err);toast(err?.message||'Não foi possível replanejar.','error');});return;}
      const study=e.target.closest('[data-v500-study]');if(study){e.preventDefault();e.stopImmediatePropagation();$('#studyTimerPill')?.click();toast('Cronômetro aberto para esta meta.','ok');return;}
      if(e.target.closest('#dailyRefreshButton'))setTimeout(()=>renderDaily().catch(()=>{}),120);
      if(e.target.closest('#v423PrevWeek')){activeWeek=addDays(activeWeek||defaultWeek(),-7);setTimeout(()=>renderWeek(activeWeek).catch(()=>{}),120);}
      if(e.target.closest('#v423NextWeek')){activeWeek=addDays(activeWeek||defaultWeek(),7);setTimeout(()=>renderWeek(activeWeek).catch(()=>{}),120);}
      if(e.target.closest('#v423CurrentWeek')){activeWeek=defaultWeek();setTimeout(()=>renderWeek(activeWeek).catch(()=>{}),120);}
    },true);
    document.addEventListener('mentor-plan-changed',()=>setTimeout(()=>{renderDaily().catch(()=>{});renderWeek(activeWeek||defaultWeek()).catch(()=>{});},220));
    const obs=new MutationObserver(()=>ensureSkipButton());obs.observe(document.documentElement,{subtree:true,childList:true});
    window.addEventListener('focus',()=>setTimeout(()=>{renderDaily().catch(()=>{});renderWeek(activeWeek||defaultWeek()).catch(()=>{});},350));
  }
  boot();
})();
