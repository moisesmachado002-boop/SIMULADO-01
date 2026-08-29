(() => {
  'use strict';
  if (window.__mentorAnalyticsV423) return;
  window.__mentorAnalyticsV423 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db) return;

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n||0));
  const pct=(a,b)=>b?Math.round(Number(a||0)/Number(b)*1000)/10:0;
  const COLORS=['#0ea5e9','#d633b3','#f4b942','#ef4444','#1437b8','#333333','#10c96f','#7c3aed','#0f766e','#c2410c','#64748b','#db2777'];
  let cache=null, perfTab='summary', weekOffset=0;

  const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const monthKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit'}).format(d);
  const brDate=v=>v?new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)):'—';
  const brShort=v=>v?new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit'}).format(new Date(v)):'—';
  const toNoon=key=>new Date(`${key}T15:00:00Z`);
  const addDays=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;};
  const dayKey=d=>dateKey(d);
  const mondayOf=(d=new Date())=>{const x=toNoon(dateKey(d)),w=x.getUTCDay()||7;return addDays(x,1-w);};
  const isLegacy=b=>String(b.notes||'').startsWith('LEGACY_ZERO_DUVIDAS|');

  function injectStyles(){
    if($('#v423Styles')) return;
    const s=document.createElement('style');s.id='v423Styles';s.textContent=`
      .v423-import-note{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff8d8;border:1px solid #ead374;border-radius:12px;padding:12px 14px;margin:0 0 16px;font-size:12px}.v423-import-note strong{color:#5b4900}
      .v423-bigstats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:0 0 18px}.v423-bigstat{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:22px;text-align:center;box-shadow:var(--shadow,0 4px 18px #0000000c)}.v423-bigstat span{display:block;font-size:14px;color:var(--muted,#666);font-weight:750;margin-bottom:12px}.v423-bigstat strong{font-size:48px;letter-spacing:-2px}
      .v423-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 15px}.v423-tab{border:1px solid var(--line,#ddd);background:#fff;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.v423-tab.active{background:#1f2937;color:#fff;border-color:#1f2937}.v423-panel{display:none}.v423-panel.active{display:block}
      .v423-two{display:grid;grid-template-columns:1.25fr .75fr;gap:14px}.v423-chart{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:15px;min-height:320px;overflow:hidden}.v423-chart h2{margin:0 0 4px;font-size:18px}.v423-chart p{margin:0 0 14px;color:var(--muted,#666);font-size:12px}.v423-svg{width:100%;height:265px;display:block}.v423-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:10px}.v423-legend span{display:inline-flex;align-items:center;gap:5px}.v423-dot{width:9px;height:9px;border-radius:50%;display:inline-block}
      .v423-donut-wrap{display:grid;place-items:center;min-height:210px}.v423-donut{width:180px;height:180px;border-radius:50%;position:relative}.v423-donut:after{content:'';position:absolute;inset:42px;background:#fff;border-radius:50%;box-shadow:inset 0 0 0 1px #eee}.v423-donut-center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;z-index:1;font-weight:900}.v423-donut-center small{display:block;font-size:10px;color:#666;font-weight:700}
      .v423-table-wrap{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;overflow:auto}.v423-table{width:100%;border-collapse:collapse;min-width:760px}.v423-table th,.v423-table td{padding:10px 11px;border-bottom:1px solid #e8e8e8;text-align:left;font-size:12px}.v423-table th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:#fafafa;position:sticky;top:0;z-index:1}.v423-table td.num,.v423-table th.num{text-align:right}.v423-table tbody tr:hover{background:#fffbea}.v423-filter{display:flex;gap:10px;align-items:end;margin-bottom:12px;flex-wrap:wrap}.v423-filter label{font-size:11px;font-weight:800}.v423-filter select{display:block;margin-top:5px;min-width:260px}
      .v423-week-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin-bottom:14px}.v423-week-nav{display:flex;gap:8px;flex-wrap:wrap}.v423-week-legend{display:flex;gap:18px;flex-wrap:wrap;padding:12px 0 16px;font-size:11px}.v423-week-legend span{display:inline-flex;align-items:center;gap:6px}.v423-swatch{width:22px;height:8px;border-radius:2px;display:inline-block}.v423-week-grid{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:1px;background:#d7d7d7;border:1px solid #d7d7d7;overflow:auto;border-radius:10px}.v423-day{background:#fff;min-height:260px}.v423-day.today{box-shadow:inset 0 0 0 2px #f2c500}.v423-day-head{background:#2f2f2f;color:#fff;padding:10px 9px;font-size:11px;font-weight:850;min-height:42px}.v423-day-body{padding:0;display:grid;align-content:start}.v423-task{padding:12px 10px;min-height:88px;color:#fff;border-bottom:1px solid rgba(255,255,255,.35)}.v423-task strong{display:block;font-size:11px;text-transform:uppercase;margin-bottom:5px}.v423-task p{font-size:10px;line-height:1.35;margin:0 0 7px}.v423-task small{display:inline-block;background:#fff;color:#222;padding:2px 5px;border-radius:4px;font-size:9px;font-weight:900}.v423-task.review{background:#d62fae}.v423-task.questions{background:#10a957}.v423-task.study{background:#18b9df}.v423-task.summary{background:#f97316}.v423-task.completed{background:#a9dfbb;color:#173d23}.v423-task.overdue{background:#efb8c0;color:#6f1d2b}.v423-empty-day{padding:16px 10px;color:#aaa;font-size:11px}
      .v423-dashboard-strip{margin-top:14px}.v423-dashboard-strip .v423-bigstat strong{font-size:34px}.v423-dashboard-strip .v423-bigstat{padding:16px}
      @media(max-width:900px){.v423-two{grid-template-columns:1fr}.v423-bigstats{grid-template-columns:1fr}.v423-week-head{align-items:flex-start;flex-direction:column}.v423-bigstat strong{font-size:38px}}
      @media(max-width:600px){.v423-filter select{min-width:100%}.v423-week-grid{grid-template-columns:repeat(7,220px)}}
    `;document.head.appendChild(s);
  }

  function injectPerformancePage(){
    const page=document.querySelector('.page[data-page-view="performance"]');if(!page||page.dataset.v423==='1')return;
    page.dataset.v423='1';page.innerHTML=`
      <div class="page-header"><div><p class="eyebrow">MEU DESEMPENHO</p><h1>Resumo do desempenho</h1><p class="muted">Questões do Mentor + baterias externas + histórico importado.</p></div><button class="secondary-button" id="v423PerfRefresh">Atualizar</button></div>
      <div class="v423-import-note" id="v423ImportNote"><span>Carregando histórico...</span></div>
      <div class="v423-tabs">
        <button class="v423-tab active" data-v423-tab="summary">Visão geral</button><button class="v423-tab" data-v423-tab="subjects">Por disciplina</button><button class="v423-tab" data-v423-tab="topics">Por assunto</button><button class="v423-tab" data-v423-tab="evolution">Evolução por assunto</button>
      </div>
      <section class="v423-panel active" data-v423-panel="summary">
        <div class="v423-bigstats"><article class="v423-bigstat"><span>Total de Questões Feitas</span><strong id="v423Total">—</strong></article><article class="v423-bigstat"><span>Total de Acertos</span><strong id="v423Correct">—</strong></article><article class="v423-bigstat"><span>Total de Erros</span><strong id="v423Errors">—</strong></article></div>
        <div class="v423-two"><section class="v423-chart"><h2>Performance mensal por disciplina</h2><p>Percentual de acerto por mês com atividade registrada.</p><div id="v423Monthly"></div></section><section class="v423-chart"><h2>Questões feitas por disciplina</h2><p>Distribuição acumulada das questões registradas.</p><div id="v423Donut"></div></section></div>
      </section>
      <section class="v423-panel" data-v423-panel="subjects"><div class="v423-table-wrap"><table class="v423-table"><thead><tr><th>Disciplina</th><th class="num">Total</th><th class="num">Acertos</th><th class="num">Erros</th><th class="num">Pct</th></tr></thead><tbody id="v423SubjectsBody"></tbody></table></div></section>
      <section class="v423-panel" data-v423-panel="topics"><div class="v423-filter"><label>Disciplina<select id="v423TopicFilter"><option value="">Todas</option></select></label></div><div class="v423-table-wrap"><table class="v423-table"><thead><tr><th>Disciplina</th><th>Assunto</th><th class="num">Total</th><th class="num">Acertos</th><th class="num">Erros</th><th class="num">Pct</th></tr></thead><tbody id="v423TopicsBody"></tbody></table></div></section>
      <section class="v423-panel" data-v423-panel="evolution"><div class="v423-filter"><label>Disciplina<select id="v423EvolutionFilter"><option value="">Todas</option></select></label></div><div class="v423-table-wrap"><table class="v423-table"><thead><tr><th>Tópico</th><th>1ª Data</th><th class="num">Questões 1</th><th class="num">Acertos 1</th><th class="num">% Taxa 1</th><th>2ª Data</th><th class="num">Questões 2</th><th class="num">Acertos 2</th><th class="num">% Taxa 2</th><th>3ª Data</th><th class="num">Questões 3</th><th class="num">Acertos 3</th><th class="num">% Taxa 3</th></tr></thead><tbody id="v423EvolutionBody"></tbody></table></div></section>`;
    page.addEventListener('click',e=>{const b=e.target.closest('[data-v423-tab]');if(b)setPerfTab(b.dataset.v423Tab);});
    $('#v423PerfRefresh')?.addEventListener('click',()=>refresh(true));
    $('#v423TopicFilter')?.addEventListener('change',renderTopicTable);$('#v423EvolutionFilter')?.addEventListener('change',renderEvolutionTable);
  }

  function injectWeekPage(){
    const page=document.querySelector('.page[data-page-view="week"]');if(!page||page.dataset.v423==='1')return;
    page.dataset.v423='1';page.innerHTML=`
      <div class="v423-week-head"><div><p class="eyebrow">PLANEJAMENTO</p><h1 id="v423WeekTitle">Veja sua programação: semana atual</h1><p class="muted">Navegue entre as semanas sem alterar automaticamente a missão do dia.</p></div><div class="v423-week-nav"><button class="secondary-button" id="v423PrevWeek">← anterior</button><button class="secondary-button" id="v423CurrentWeek">semana atual</button><button class="secondary-button" id="v423NextWeek">próxima →</button></div></div>
      <section class="panel"><div class="v423-week-legend"><span><i class="v423-swatch" style="background:#18b9df"></i>Estudo</span><span><i class="v423-swatch" style="background:#d62fae"></i>Revisão</span><span><i class="v423-swatch" style="background:#f97316"></i>Resumo</span><span><i class="v423-swatch" style="background:#10a957"></i>Exercício / questões</span><span><i class="v423-swatch" style="background:#a9dfbb"></i>Cumprido</span><span><i class="v423-swatch" style="background:#efb8c0"></i>Atrasado</span></div><div id="v423WeekGrid"><div class="empty-state">Carregando semana...</div></div></section>`;
    $('#v423PrevWeek').onclick=()=>{weekOffset--;renderWeek();};$('#v423NextWeek').onclick=()=>{weekOffset++;renderWeek();};$('#v423CurrentWeek').onclick=()=>{weekOffset=0;renderWeek();};
  }

  function injectDashboard(){
    const page=document.querySelector('.page[data-page-view="dashboard"]'),anchor=page?.querySelector('.welcome-panel');if(!page||!anchor||$('#v423DashboardStats'))return;
    const wrap=document.createElement('div');wrap.id='v423DashboardStats';wrap.className='v423-bigstats v423-dashboard-strip';wrap.innerHTML=`<article class="v423-bigstat"><span>Questões acumuladas</span><strong id="v423DashTotal">—</strong></article><article class="v423-bigstat"><span>Acertos acumulados</span><strong id="v423DashCorrect">—</strong></article><article class="v423-bigstat"><span>Erros acumulados</span><strong id="v423DashErrors">—</strong></article>`;anchor.insertAdjacentElement('afterend',wrap);
  }

  function patchPerformanceMenu(){
    const sub=document.querySelector('[data-v49-sub="performance"]');if(!sub||sub.querySelector('[data-v423-menu]'))return;
    const existing=[...sub.children];
    const holder=document.createElement('div');holder.style.display='contents';holder.innerHTML=`<button data-page="performance" data-v423-menu="subjects">Por Disciplina</button><button data-page="performance" data-v423-menu="topics">Por Assunto</button><button data-page="performance" data-v423-menu="evolution">Evolução por Assunto</button>`;
    const ref=existing[1]||null;[...holder.children].forEach(n=>sub.insertBefore(n,ref));
  }

  function setPerfTab(tab='summary'){
    perfTab=tab;$$('[data-v423-tab]').forEach(b=>b.classList.toggle('active',b.dataset.v423Tab===tab));$$('[data-v423-panel]').forEach(p=>p.classList.toggle('active',p.dataset.v423Panel===tab));
  }

  function addAgg(map,key,total,correct){const g=map.get(key)||{total:0,correct:0};g.total+=Number(total||0);g.correct+=Number(correct||0);map.set(key,g);}
  async function load(){
    const {data:{user},error:ue}=await db.auth.getUser();if(ue||!user)throw new Error('Entre na sua conta para carregar o desempenho.');
    const today=toNoon(dateKey()),start=dayKey(addDays(today,-56)),end=dayKey(addDays(today,56));
    const [subR,topR,attR,extR,planR]=await Promise.all([
      db.from('subjects').select('id,name,position').eq('active',true).order('position'),
      db.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
      db.from('question_attempts').select('subject_id,topic_id,is_correct,answered_at').eq('user_id',user.id).order('answered_at'),
      db.from('external_practice_batches').select('subject_id,topic_id,total_questions,correct_count,practiced_at,source_kind,notes').eq('user_id',user.id).order('practiced_at'),
      db.from('study_plan_items').select('id,scheduled_for,topic_id,task_type,question_target,progress_count,duration_minutes,status,source_reason,carried_from_date,sort_order').eq('user_id',user.id).gte('scheduled_for',start).lte('scheduled_for',end).order('scheduled_for').order('sort_order')
    ]);for(const r of [subR,topR,attR,extR,planR])if(r.error)throw r.error;
    const subjects=subR.data||[],topics=topR.data||[],attempts=attR.data||[],external=extR.data||[],plan=planR.data||[];
    const sMap=new Map(subjects.map(s=>[s.id,s])),tMap=new Map(topics.map(t=>[t.id,t]));
    const subjectAgg=new Map(),topicAgg=new Map(),topicDays=new Map(),monthly=new Map();
    let total=0,correct=0;
    function event(subject_id,topic_id,q,c,when){q=Number(q||0);c=Number(c||0);total+=q;correct+=c;addAgg(subjectAgg,subject_id,q,c);addAgg(topicAgg,topic_id,q,c);const d=dateKey(new Date(when)),m=monthKey(new Date(when));if(!topicDays.has(topic_id))topicDays.set(topic_id,new Map());addAgg(topicDays.get(topic_id),d,q,c);const mk=`${subject_id}|${m}`;addAgg(monthly,mk,q,c);}
    attempts.forEach(a=>event(a.subject_id,a.topic_id,1,a.is_correct?1:0,a.answered_at));external.forEach(b=>event(b.subject_id,b.topic_id,b.total_questions,b.correct_count,b.practiced_at));
    const legacy=external.filter(isLegacy),legacyQ=legacy.reduce((s,b)=>s+Number(b.total_questions||0),0),legacyC=legacy.reduce((s,b)=>s+Number(b.correct_count||0),0);
    cache={subjects,topics,attempts,external,plan,sMap,tMap,subjectAgg,topicAgg,topicDays,monthly,total,correct,errors:total-correct,legacyQ,legacyC,legacyBatches:legacy.length};return cache;
  }

  function renderAll(){if(!cache)return;renderSummary();renderSubjectTable();fillFilters();renderTopicTable();renderEvolutionTable();renderWeek();}
  function renderSummary(){
    const c=cache;['v423Total','v423DashTotal'].forEach(id=>{const n=$('#'+id);if(n)n.textContent=fmt(c.total);});['v423Correct','v423DashCorrect'].forEach(id=>{const n=$('#'+id);if(n)n.textContent=fmt(c.correct);});['v423Errors','v423DashErrors'].forEach(id=>{const n=$('#'+id);if(n)n.textContent=fmt(c.errors);});
    const note=$('#v423ImportNote');if(note)note.innerHTML=`<span><strong>Histórico Zero Dúvidas importado:</strong> ${fmt(c.legacyQ)} questões • ${fmt(c.legacyC)} acertos • ${fmt(c.legacyQ-c.legacyC)} erros, em ${c.legacyBatches} baterias. O restante vem do Mentor IA.</span><span><strong>Geral:</strong> ${pct(c.correct,c.total)}%</span>`;
    renderMonthly();renderDonut();
  }

  function subjectRows(){return cache.subjects.map((s,i)=>{const a=cache.subjectAgg.get(s.id)||{total:0,correct:0};return{s,index:i,total:a.total,correct:a.correct,errors:a.total-a.correct,accuracy:pct(a.correct,a.total)};}).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);}
  function renderSubjectTable(){const body=$('#v423SubjectsBody');if(!body)return;body.innerHTML=subjectRows().map(r=>`<tr><td><strong>${esc(r.s.name)}</strong></td><td class="num">${fmt(r.total)}</td><td class="num">${fmt(r.correct)}</td><td class="num">${fmt(r.errors)}</td><td class="num"><strong>${r.accuracy}%</strong></td></tr>`).join('')||'<tr><td colspan="5">Sem dados.</td></tr>';}
  function topicRows(){return cache.topics.map(t=>{const a=cache.topicAgg.get(t.id)||{total:0,correct:0},s=cache.sMap.get(t.subject_id);return{t,s,total:a.total,correct:a.correct,errors:a.total-a.correct,accuracy:pct(a.correct,a.total)};}).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);}
  function fillFilters(){for(const id of ['v423TopicFilter','v423EvolutionFilter']){const sel=$('#'+id);if(!sel||sel.dataset.ready)return;sel.dataset.ready='1';sel.innerHTML='<option value="">Todas</option>'+cache.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');}}
  function renderTopicTable(){const body=$('#v423TopicsBody');if(!body||!cache)return;const f=$('#v423TopicFilter')?.value||'';const rows=topicRows().filter(r=>!f||r.t.subject_id===f);body.innerHTML=rows.map(r=>`<tr><td>${esc(r.s?.name||'')}</td><td><strong>${esc(r.t.syllabus_code||'')}</strong> ${esc(r.t.title)}</td><td class="num">${fmt(r.total)}</td><td class="num">${fmt(r.correct)}</td><td class="num">${fmt(r.errors)}</td><td class="num"><strong>${r.accuracy}%</strong></td></tr>`).join('')||'<tr><td colspan="6">Sem dados nesse filtro.</td></tr>';}
  function renderEvolutionTable(){const body=$('#v423EvolutionBody');if(!body||!cache)return;const f=$('#v423EvolutionFilter')?.value||'';const rows=topicRows().filter(r=>!f||r.t.subject_id===f);body.innerHTML=rows.map(r=>{const days=[...(cache.topicDays.get(r.t.id)||new Map()).entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-3);while(days.length<3)days.unshift(null);const cells=days.map(d=>d?`<td>${brDate(`${d[0]}T15:00:00Z`)}</td><td class="num">${fmt(d[1].total)}</td><td class="num">${fmt(d[1].correct)}</td><td class="num">${pct(d[1].correct,d[1].total)}%</td>`:'<td>—</td><td class="num">0</td><td class="num">0</td><td class="num">0%</td>').join('');return `<tr><td><strong>${esc(r.s?.name||'')}</strong><br>${esc(r.t.syllabus_code||'')} • ${esc(r.t.title)}</td>${cells}</tr>`;}).join('')||'<tr><td colspan="13">Sem dados nesse filtro.</td></tr>';}

  function renderMonthly(){
    const host=$('#v423Monthly');if(!host||!cache)return;const months=[...new Set([...cache.monthly.keys()].map(k=>k.split('|')[1]))].sort();if(!months.length){host.innerHTML='<div class="empty-state">Sem dados mensais.</div>';return;}
    const rows=subjectRows().slice(0,7),W=900,H=245,L=44,R=14,T=14,B=38,plotW=W-L-R,plotH=H-T-B,x=i=>L+(months.length===1?plotW/2:i*plotW/(months.length-1)),y=v=>T+(100-v)*plotH/100;
    let svg=`<svg viewBox="0 0 ${W} ${H}" class="v423-svg" role="img" aria-label="Performance mensal por disciplina">`;
    [0,25,50,75,100].forEach(v=>{svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#e5e7eb" stroke-width="1"/><text x="${L-7}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="#6b7280">${v}%</text>`;});
    months.forEach((m,i)=>{const [yr,mo]=m.split('-');svg+=`<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="10" fill="#6b7280">${mo}/${yr.slice(2)}</text>`;});
    rows.forEach((r,idx)=>{const color=COLORS[idx%COLORS.length],pts=[];months.forEach((m,i)=>{const a=cache.monthly.get(`${r.s.id}|${m}`);if(a?.total)pts.push([x(i),y(pct(a.correct,a.total)),pct(a.correct,a.total)]);});if(pts.length>1)svg+=`<polyline points="${pts.map(p=>`${p[0]},${p[1]}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;pts.forEach(p=>{svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${color}"/><text x="${p[0]}" y="${p[1]-8}" text-anchor="middle" font-size="9" fill="#333">${p[2]}%</text>`;});});svg+='</svg>';
    host.innerHTML=svg+`<div class="v423-legend">${rows.map((r,i)=>`<span><i class="v423-dot" style="background:${COLORS[i%COLORS.length]}"></i>${esc(r.s.name)}</span>`).join('')}</div>`;
  }
  function renderDonut(){const host=$('#v423Donut');if(!host||!cache)return;const rows=subjectRows(),total=rows.reduce((s,r)=>s+r.total,0);if(!total){host.innerHTML='<div class="empty-state">Sem dados.</div>';return;}let cursor=0;const seg=[];rows.forEach((r,i)=>{const start=cursor,end=cursor+r.total/total*100;seg.push(`${COLORS[i%COLORS.length]} ${start}% ${end}%`);cursor=end;});host.innerHTML=`<div class="v423-donut-wrap"><div class="v423-donut" style="background:conic-gradient(${seg.join(',')})"><div class="v423-donut-center"><div>${fmt(total)}<small>questões</small></div></div></div></div><div class="v423-legend">${rows.map((r,i)=>`<span><i class="v423-dot" style="background:${COLORS[i%COLORS.length]}"></i>${esc(r.s.name)} (${fmt(r.total)})</span>`).join('')}</div>`;}

  function taskClass(p,day){if(p.status==='completed')return 'completed';if(day<dateKey()&&['pending','in_progress'].includes(p.status))return 'overdue';if(p.task_type==='review')return 'review';if(['summary','resume','resumo'].includes(String(p.task_type)))return 'summary';if(p.task_type==='study')return 'study';return 'questions';}
  function taskLabel(p){if(p.task_type==='review')return 'Revisão';if(['summary','resume','resumo'].includes(String(p.task_type)))return 'Resumo';if(p.task_type==='study')return 'Estudo';return 'Exercício';}
  function taskMinutes(p){return Number(p.duration_minutes||0)||(p.task_type==='review'?4:Math.max(3,Number(p.question_target||1)*3));}
  function renderWeek(){const host=$('#v423WeekGrid');if(!host||!cache)return;const start=addDays(mondayOf(new Date()),weekOffset*7),days=Array.from({length:7},(_,i)=>dayKey(addDays(start,i))),today=dateKey();const title=$('#v423WeekTitle');if(title)title.textContent=`Veja sua programação: ${weekOffset===0?'semana atual':weekOffset===1?'próxima semana':weekOffset===-1?'semana anterior':weekOffset>0?`${weekOffset} semanas à frente`:`${Math.abs(weekOffset)} semanas atrás`}`;const rows=cache.plan.filter(p=>days.includes(p.scheduled_for)&&p.status!=='skipped');host.innerHTML=`<div class="v423-week-grid">${days.map(day=>{const items=rows.filter(p=>p.scheduled_for===day);const d=toNoon(day),weekday=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,weekday:'long'}).format(d);return `<section class="v423-day ${day===today?'today':''}"><div class="v423-day-head">${esc(weekday.charAt(0).toUpperCase()+weekday.slice(1))}<br>${brDate(`${day}T15:00:00Z`)}</div><div class="v423-day-body">${items.length?items.map(p=>{const t=cache.tMap.get(p.topic_id),s=t?cache.sMap.get(t.subject_id):null,cls=taskClass(p,day),extra=p.task_type==='questions'?`${Number(p.progress_count||0)}/${Number(p.question_target||0)} questões`:`${taskMinutes(p)} min`;return `<article class="v423-task ${cls}"><strong>${esc(s?.name||'Estudo')}</strong><p>${esc(t?.syllabus_code?`${t.syllabus_code}. `:'')}${esc(t?.title||'Atividade')}</p><p>${taskLabel(p)}${p.carried_from_date?` • veio de ${brShort(`${p.carried_from_date}T15:00:00Z`)}`:''}</p><small>${extra}</small></article>`;}).join(''):'<div class="v423-empty-day">Sem metas</div>'}</div></section>`;}).join('')}</div>`;}

  async function refresh(showToast=false){try{await load();renderAll();if(showToast){const n=$('#toast');if(n){n.textContent='Desempenho atualizado.';n.dataset.kind='ok';n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2500);}}}catch(e){console.error('V4.23 analytics',e);const note=$('#v423ImportNote');if(note)note.textContent=e?.message||'Não foi possível carregar o desempenho.';}}

  function bindGlobal(){document.addEventListener('click',e=>{const m=e.target.closest('[data-v423-menu]');if(m)setTimeout(()=>setPerfTab(m.dataset.v423Menu),20);const p=e.target.closest('[data-page="performance"]');if(p&&!m)setTimeout(()=>setPerfTab('summary'),20);},true);}
  function boot(){injectStyles();injectPerformancePage();injectWeekPage();injectDashboard();patchPerformanceMenu();bindGlobal();refresh(false);setInterval(()=>{patchPerformanceMenu();if(location.hash==='#performance'&&cache)renderSummary();},4000);}
  let tries=0;const timer=setInterval(()=>{tries++;if($('#appShell')&&document.querySelector('.page[data-page-view="performance"]')&&document.querySelector('.page[data-page-view="week"]')){clearInterval(timer);boot();}if(tries>180)clearInterval(timer);},180);
})();