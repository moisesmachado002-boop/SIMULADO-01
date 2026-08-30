(() => {
  'use strict';
  if (window.__mentorWeekSummaryV434) return;
  window.__mentorWeekSummaryV434 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const addDays=(key,n)=>{const d=new Date(`${key}T15:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return dateKey(d);};
  const today=()=>dateKey();
  let activeStart='',busy=false;

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');
    clearTimeout(window.__mentorWeekToast);window.__mentorWeekToast=setTimeout(()=>n.classList.remove('show'),3600);
  }

  function style(){if($('#v432WeekStyle'))return;const s=document.createElement('style');s.id='v432WeekStyle';s.textContent=`
    .v431-week-note{margin:0 0 12px;padding:11px 14px;border:1px solid #d7e4ef;background:#f5f9fd;border-radius:10px;display:flex;gap:12px;justify-content:space-between;align-items:center;font-size:11px}.v431-week-note strong{font-size:12px}.v431-week-note b{background:#e3eefb;color:#244f83;border-radius:999px;padding:5px 8px;font-size:9px;white-space:nowrap}.v432-week-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.v432-replan{border:1px solid #b9cee1;background:#fff;color:#244f83;border-radius:8px;padding:7px 10px;font-size:10px;font-weight:850;cursor:pointer}.v432-replan:disabled{opacity:.55;cursor:wait}
    .v431-week-grid{display:grid;grid-template-columns:repeat(7,minmax(180px,1fr));gap:1px;background:#d7d7d7;border:1px solid #d7d7d7;border-radius:10px;overflow:auto}.v431-day{background:#fff;min-height:270px}.v431-day-head{background:#2f2f2f;color:#fff;padding:10px;font-size:11px;font-weight:850}.v431-day-head small{display:block;margin-top:4px;color:#d7d7d7;font-size:9px}.v431-day-body{padding:8px;display:grid;align-content:start;gap:8px}.v431-focus{border:1px solid #dfe5ea;border-left:5px solid #1f8fd5;background:#fff;border-radius:9px;padding:10px;color:#1d2730}.v431-focus.group{border-left-color:#e6a700;background:#fffdf5}.v431-focus.done{border-left-color:#3aa86a;background:#f2fbf5}.v431-focus.review{border-left-color:#c837a1;background:#fff7fc}.v431-subject{font-size:9px;text-transform:uppercase;font-weight:900;color:#69737d}.v431-title{font-size:12px;font-weight:900;margin:3px 0 7px;line-height:1.25}.v431-steps{display:grid;gap:4px}.v431-step{font-size:9px;color:#59636d;line-height:1.35}.v431-step b{color:#1f2933}.v431-total{margin-top:8px;padding-top:7px;border-top:1px solid #edf0f2;font-size:9px;font-weight:900;color:#374151}.v431-day-total{padding:7px 10px;border-top:1px solid #eee;background:#fafafa;font-size:9px;color:#68727b}.v431-empty{padding:16px 8px;color:#a0a6ad;font-size:10px}.v431-rest{padding:16px 8px;color:#89919a;font-size:10px;font-weight:800}.v431-badge{display:inline-block;margin-left:5px;padding:2px 5px;border-radius:999px;background:#eef3ff;color:#345d91;font-size:8px;font-weight:900}.v431-badge.group{background:#fff0bf;color:#775900}
    @media(max-width:900px){.v431-week-grid{grid-template-columns:repeat(7,220px)}.v431-week-note{align-items:flex-start;flex-direction:column}}
  `;document.head.appendChild(s);}

  function mondayOf(key){const d=new Date(`${key}T15:00:00Z`),w=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+1-w);return dateKey(d);}
  function defaultReplanStart(){const key=today(),d=new Date(`${key}T15:00:00Z`),w=d.getUTCDay()||7;return w===7?addDays(key,1):mondayOf(key);}
  function inferStart(){const heads=[...document.querySelectorAll('#v423WeekGrid .v423-day-head')];if(heads.length){const m=heads[0].textContent.match(/(\d{2})\/(\d{2})\/(\d{4})/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;}return activeStart||defaultReplanStart();}
  function br(k){const [y,m,d]=k.split('-');return `${d}/${m}/${y}`;}
  function weekday(k){return new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,weekday:'long'}).format(new Date(`${k}T15:00:00Z`)).replace(/^./,x=>x.toUpperCase());}

  async function fetchWeek(start){const {data:{user}}=await db.auth.getUser();if(!user)return null;const end=addDays(start,6);
    const [planR,topicsR,subjectsR,policiesR,prefsR]=await Promise.all([
      db.from('study_plan_items').select('id,topic_id,subtopic_id,scheduled_for,task_type,question_target,progress_count,duration_minutes,status,sort_order,source_reason,completed_at').eq('user_id',user.id).gte('scheduled_for',start).lte('scheduled_for',end).neq('status','skipped').order('scheduled_for').order('sort_order'),
      db.from('topics').select('id,subject_id,parent_topic_id,title,syllabus_code,source_name,position'),
      db.from('subjects').select('id,name'),
      db.from('user_topic_study_policy').select('topic_id,study_mode,max_subtopics_per_day,questions_per_subtopic,rationale').eq('user_id',user.id),
      db.from('study_preferences').select('study_days,daily_minutes,buffer_percent').eq('user_id',user.id).maybeSingle()
    ]);for(const r of [planR,topicsR,subjectsR,policiesR,prefsR])if(r.error)throw r.error;
    return {plan:planR.data||[],topics:new Map((topicsR.data||[]).map(x=>[x.id,x])),subjects:new Map((subjectsR.data||[]).map(x=>[x.id,x])),policies:new Map((policiesR.data||[]).map(x=>[x.topic_id,x])),prefs:prefsR.data||{study_days:[1,2,3,4,5,6],daily_minutes:120,buffer_percent:15}};
  }

  function groupsForDay(items,ctx){const map=new Map();for(const x of items){const p=ctx.policies.get(x.topic_id),key=p?.study_mode==='group'?x.topic_id:`${x.topic_id}|${x.subtopic_id||''}`;if(!map.has(key))map.set(key,{topic_id:x.topic_id,subtopic_id:x.subtopic_id,policy:p,items:[]});map.get(key).items.push(x);}return [...map.values()].sort((a,b)=>Math.min(...a.items.map(x=>x.sort_order||0))-Math.min(...b.items.map(x=>x.sort_order||0)));}
  function focusHtml(g,ctx){const t=ctx.topics.get(g.topic_id),sub=g.subtopic_id?ctx.topics.get(g.subtopic_id):null,s=t?ctx.subjects.get(t.subject_id):null,items=[...g.items].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));const group=g.policy?.study_mode==='group',done=items.every(x=>x.status==='completed'),review=items.every(x=>x.task_type==='review');const title=group?(t?.title||'Bloco conjunto'):(sub?.title||t?.title||'Atividade');const mins=items.reduce((z,x)=>z+Number(x.duration_minutes||0),0);const steps=[];
    const theory=items.filter(x=>['theory','study'].includes(x.task_type));if(theory.length)steps.push(`<div class="v431-step"><b>Estudo:</b> ${theory.reduce((z,x)=>z+Number(x.duration_minutes||0),0)} min</div>`);
    const reviews=items.filter(x=>x.task_type==='review');if(reviews.length)steps.push(`<div class="v431-step"><b>Revisão:</b> ${reviews.length} tópico(s)</div>`);
    const qs=items.filter(x=>x.task_type==='questions');if(qs.length){if(group){for(const q of qs){const c=q.subtopic_id?ctx.topics.get(q.subtopic_id):null;steps.push(`<div class="v431-step"><b>${esc(c?.title||'Questões')}:</b> ${Number(q.question_target||0)} questões${q.status==='completed'?' ✓':''}</div>`);}}else{steps.push(`<div class="v431-step"><b>Questões:</b> ${qs.reduce((z,x)=>z+Number(x.question_target||0),0)}${qs.some(x=>x.status==='in_progress')?' • em andamento':''}</div>`);}}
    return `<article class="v431-focus ${group?'group':''} ${done?'done':''} ${review?'review':''}"><div class="v431-subject">${esc(s?.name||'Estudo')} ${group?'<span class="v431-badge group">BLOCO CONJUNTO</span>':sub?'<span class="v431-badge">1 POR VEZ</span>':''}</div><div class="v431-title">${esc(title)}</div><div class="v431-steps">${steps.join('')}</div><div class="v431-total">${mins} min • ${done?'concluído':'planejado'}</div></article>`;
  }

  function render(start,ctx){const host=$('#v423WeekGrid');if(!host||!ctx)return;style();activeStart=start;const studyDays=new Set((ctx.prefs.study_days||[1,2,3,4,5,6]).map(Number));const days=Array.from({length:7},(_,i)=>addDays(start,i));const title=$('#v423WeekTitle');if(title){const nowMon=mondayOf(today()),delta=Math.round((new Date(`${start}T12:00:00Z`)-new Date(`${nowMon}T12:00:00Z`))/604800000);title.textContent=`Veja sua programação: ${delta===0?'semana atual':delta===1?'próxima semana':delta===-1?'semana anterior':delta>0?`${delta} semanas à frente`:`${Math.abs(delta)} semanas atrás`}`;}
    host.innerHTML=`<div class="v431-week-note"><div><strong>Semana em modo estável</strong><br><span>Abrir, atualizar ou navegar pela semana não altera o cronograma. Mudanças só acontecem quando você manda replanejar ou salva novos horários.</span></div><div class="v432-week-actions"><b>SOMENTE LEITURA</b><button class="v432-replan" id="v432ReplanWeek">Replanejar esta semana</button></div></div><div class="v431-week-grid">${days.map(day=>{const items=ctx.plan.filter(x=>x.scheduled_for===day),groups=groupsForDay(items,ctx),dow=new Date(`${day}T15:00:00Z`).getUTCDay()||7,total=items.reduce((z,x)=>z+Number(x.duration_minutes||0),0);return `<section class="v431-day"><div class="v431-day-head">${esc(weekday(day))}<br>${br(day)}<small>${groups.length?`${groups.length} foco(s) • ${total} min`:studyDays.has(dow)?'sem foco registrado':'descanso'}</small></div><div class="v431-day-body">${groups.length?groups.map(g=>focusHtml(g,ctx)).join(''):(studyDays.has(dow)?'<div class="v431-empty">Sem meta planejada.</div>':'<div class="v431-rest">Descanso</div>')}</div>${groups.length?`<div class="v431-day-total">Total do dia: <strong>${total} min</strong></div>`:''}</section>`;}).join('')}</div>`;
  }

  async function refresh(start=inferStart()){if(busy)return;busy=true;try{const ctx=await fetchWeek(start);if(ctx)render(start,ctx);}catch(e){console.warn('week summary stable',e);toast('Não foi possível atualizar a semana.','error');}finally{busy=false;}}

  async function stableReplan(start,{confirmUser=true,fallbackNext=false}={}){
    if(busy)return null;
    if(confirmUser&&!confirm('Replanejar esta semana? Revisões vencidas terão prioridade e tarefas pendentes podem ser reorganizadas.'))return null;
    busy=true;const btn=$('#v432ReplanWeek');if(btn)btn.disabled=true;
    try{
      let target=start||defaultReplanStart();
      let r=await db.rpc('rebuild_smart_week_v431',{p_week_start:target});if(r.error)throw r.error;
      if(r.data?.status==='frozen'&&fallbackNext){target=addDays(target,7);r=await db.rpc('rebuild_smart_week_v431',{p_week_start:target});if(r.error)throw r.error;}
      activeStart=target;
      window.MentorRequestGuard?.invalidate?.();
      document.dispatchEvent(new CustomEvent('mentor-plan-changed',{detail:{kind:'stable_replan',week_start:target,status:r.data?.status||'ok'}}));
      toast(r.data?.status==='frozen'?'A semana já começou e foi mantida como está.':'Semana replanejada com revisões primeiro.','ok');
      return r.data||null;
    }catch(e){console.warn('stable week replan',e);toast(e?.message||'Não foi possível replanejar.','error');return null;}
    finally{busy=false;if(btn)btn.disabled=false;await refresh(activeStart||start||defaultReplanStart());}
  }

  function boot(){
    style();setTimeout(()=>refresh(inferStart()),1500);
    document.addEventListener('click',e=>{
      const generic=e.target.closest('[data-action="replan"]');
      if(generic){e.preventDefault();e.stopImmediatePropagation();stableReplan(defaultReplanStart(),{confirmUser:true});return;}
      if(e.target.closest('#v432ReplanWeek')){e.preventDefault();e.stopImmediatePropagation();stableReplan(activeStart||inferStart(),{confirmUser:true});return;}
      if(e.target.closest('#v423PrevWeek,#v423NextWeek,#v423CurrentWeek'))setTimeout(()=>{activeStart='';refresh(inferStart());},180);
      if(e.target.closest('[data-task-complete],[data-task-qc],[data-task-bank],[data-task-review]'))setTimeout(()=>refresh(activeStart||inferStart()),1000);
    },true);
    document.addEventListener('mentor-preferences-changed',()=>{
      const start=defaultReplanStart();
      stableReplan(start,{confirmUser:false,fallbackNext:true});
    });
    document.addEventListener('mentor-plan-changed',e=>{if(e.detail?.kind!=='stable_replan')setTimeout(()=>refresh(activeStart||inferStart()),250);});
    setInterval(()=>{const host=$('#v423WeekGrid');if(!host)return;if(!host.querySelector('.v431-week-grid')&&!busy){activeStart='';refresh(inferStart());}},2500);
    window.addEventListener('focus',()=>setTimeout(()=>refresh(activeStart||inferStart()),350));
  }
  boot();
})();
