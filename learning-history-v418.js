(() => {
  'use strict';
  if (window.__mentorLearningHistoryV418) return;
  window.__mentorLearningHistoryV418 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const TZ='America/Bahia';
  const db=window.supabase?.createClient?.(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>v?new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
  const pct=(a,b)=>b?Math.round((Number(a||0)/Number(b))*100):0;
  let rows=[],filter='all',editing=null,dirty=false;

  function toast(text,kind='neutral'){
    const n=$('#toast');if(!n)return;n.textContent=text;n.dataset.kind=kind;n.classList.add('show');n.style.zIndex='100500';n.style.bottom='90px';
    clearTimeout(window.__lhToast);window.__lhToast=setTimeout(()=>n.classList.remove('show'),3600);
  }
  function showError(e){console.error(e);toast(e?.message||'Não foi possível concluir a alteração.','error');const s=$('#lhStatus');if(s){s.textContent=e?.message||'Erro ao atualizar histórico.';s.className='lh-status dirty';}}

  function injectStyles(){
    if($('#v418HistoryStyles'))return;
    const s=document.createElement('style');s.id='v418HistoryStyles';s.textContent=`
      #v418HistoryPage{display:none}#v418HistoryPage.active{display:block}
      .lh-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:16px}.lh-head h1{margin:3px 0 6px}
      .lh-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.lh-tabs button{border:1px solid var(--line,#d8d8d8);background:#fff;padding:9px 12px;border-radius:999px;font-weight:750}.lh-tabs button.active{background:#151515;color:#fff;border-color:#151515}
      .lh-status{margin:10px 0 14px;padding:10px 12px;border-radius:8px;background:#f5f6f7;color:#555;font-size:12px}.lh-status.dirty{background:#fff3d7;color:#694900;font-weight:700}
      .lh-list{display:flex;flex-direction:column;gap:10px}.lh-row{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:15px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;box-shadow:var(--shadow,0 3px 14px #0000000b)}
      .lh-type{display:inline-flex;border-radius:999px;padding:5px 9px;background:#f1f2f3;font-size:10px;font-weight:850;text-transform:uppercase}.lh-type.study{background:#eaf7ef}.lh-type.review{background:#e9f3ff}.lh-type.questions{background:#fff1d9}.lh-type.qconcursos{background:#fff0c7}
      .lh-title{font-weight:850;font-size:16px;margin:8px 0 3px}.lh-sub{color:#666;font-size:12px;line-height:1.45}.lh-metrics{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.lh-chip{background:#f4f5f6;border-radius:7px;padding:6px 8px;font-size:11px;font-weight:700}
      .lh-actions{display:flex;gap:7px}.lh-actions button{min-width:78px;min-height:38px}.lh-empty{padding:30px;text-align:center;color:#777;border:1px dashed #ccc;border-radius:12px;background:#fff}.lh-empty strong{display:block;color:#222;font-size:17px;margin-bottom:5px}
      .lh-modal{position:fixed;inset:0;background:#0009;z-index:100300;display:none;align-items:center;justify-content:center;padding:20px}.lh-modal.open{display:flex}.lh-sheet{background:#fff;border-radius:16px;width:min(520px,100%);max-height:90vh;overflow:auto;padding:20px;box-shadow:0 22px 70px #0006}.lh-sheet-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.lh-close{border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer}.lh-field{margin-top:13px}.lh-field label{display:block;font-size:12px;font-weight:800;margin-bottom:6px;color:#555}.lh-field input,.lh-field textarea{width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:9px;padding:11px 12px;font:inherit}.lh-field textarea{min-height:76px;resize:vertical}.lh-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lh-save{display:flex;gap:9px;margin-top:18px}.lh-save button{flex:1;min-height:44px}
      @media(max-width:720px){.lh-head{align-items:flex-start;flex-direction:column}.lh-row{grid-template-columns:1fr}.lh-actions{display:grid;grid-template-columns:1fr 1fr}.lh-actions button{width:100%}.lh-two{grid-template-columns:1fr}.lh-sheet{padding:17px}}
    `;document.head.appendChild(s);
  }

  function injectPage(){
    if($('#v418HistoryPage'))return;
    injectStyles();const main=$('main.content');if(!main)return;
    const p=document.createElement('section');p.id='v418HistoryPage';p.className='v49-material-page';p.dataset.v49View='history';
    p.innerHTML=`<div class="lh-head"><div><p class="eyebrow">MEU DESEMPENHO</p><h1>Histórico de Lançamentos</h1><p class="muted">Veja, edite ou apague os registros que você lançou.</p></div><span class="v49-badge">Dados editáveis</span></div>
      <div class="lh-tabs"><button class="active" data-lh-filter="all">Todos</button><button data-lh-filter="study">Estudo</button><button data-lh-filter="review">Revisão</button><button data-lh-filter="questions">Questões</button><button data-lh-filter="qconcursos">QConcursos</button></div>
      <div class="lh-status" id="lhStatus">Carregando histórico…</div><div class="lh-list" id="lhList"></div>`;
    main.appendChild(p);

    const m=document.createElement('div');m.id='lhModal';m.className='lh-modal';m.setAttribute('aria-hidden','true');
    m.innerHTML=`<div class="lh-sheet"><div class="lh-sheet-head"><div><small class="eyebrow">EDITAR LANÇAMENTO</small><h2 id="lhEditTitle" style="margin:4px 0 2px"></h2><div class="muted" id="lhEditSub"></div></div><button class="lh-close" data-lh-close>×</button></div>
      <div id="lhQuestionFields" class="lh-two"><div class="lh-field"><label>Questões feitas</label><input id="lhEditTotal" type="number" min="1" max="500"></div><div class="lh-field"><label>Questões erradas</label><input id="lhEditWrong" type="number" min="0" max="500"></div></div>
      <div class="lh-field"><label>Tempo (minutos)</label><input id="lhEditMinutes" type="number" min="0" max="720" placeholder="Sem tempo informado"></div><div class="lh-field"><label>Observação</label><textarea id="lhEditNotes" placeholder="Opcional"></textarea></div>
      <div class="lh-save"><button class="secondary-button" data-lh-close>Cancelar</button><button class="primary-button" id="lhSave">Salvar alteração</button></div></div>`;
    document.body.appendChild(m);$('#lhSave').onclick=saveEdit;
  }

  function patchNav(){
    const sub=document.querySelector('[data-v49-sub="performance"]');if(!sub)return;
    if(!sub.querySelector('[data-v418-history]')){const b=document.createElement('button');b.textContent='Histórico de Lançamentos';b.dataset.v418History='1';const report=[...sub.querySelectorAll('button')].find(x=>x.textContent.trim()==='Relatórios');report?sub.insertBefore(b,report):sub.appendChild(b);}
  }

  function openHistory(){
    injectPage();patchNav();$$('.page').forEach(p=>p.classList.remove('active'));$$('.v49-material-page').forEach(p=>p.classList.remove('active'));$('#v418HistoryPage')?.classList.add('active');
    if($('#topbarPageTitle'))$('#topbarPageTitle').textContent='Histórico de Lançamentos';if($('#topbarPageSubtitle'))$('#topbarPageSubtitle').textContent='Editar e apagar registros de estudo';
    history.replaceState(null,'','#history');try{window.parent.history.replaceState(null,'',window.parent.location.pathname+window.parent.location.search+'#history');}catch{}
    $('#appShell')?.classList.remove('menu-open');window.scrollTo({top:0,behavior:'smooth'});loadRows().catch(showError);
  }

  async function loadRows(){
    const st=$('#lhStatus');if(st){st.className='lh-status';st.textContent='Atualizando histórico…';}
    const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('Entre na sua conta para ver o histórico.');
    const [subR,topR,sesR,batR]=await Promise.all([
      db.from('subjects').select('id,name').eq('active',true),db.from('topics').select('id,subject_id,title,syllabus_code'),
      db.from('study_sessions').select('id,subject_id,topic_id,activity_type,duration_minutes,duration_seconds,questions_answered,correct_answers,notes,ended_at,created_at,plan_item_id').eq('user_id',user.id).order('ended_at',{ascending:false}).limit(800),
      db.from('external_practice_batches').select('id,source_kind,subject_id,topic_id,total_questions,correct_count,duration_minutes,notes,practiced_at,created_at,study_session_id,plan_item_id').eq('user_id',user.id).order('practiced_at',{ascending:false}).limit(800)
    ]);for(const r of [subR,topR,sesR,batR])if(r.error)throw r.error;
    const sm=new Map((subR.data||[]).map(x=>[x.id,x.name])),tm=new Map((topR.data||[]).map(x=>[x.id,x])),batches=batR.data||[],linked=new Set(batches.map(x=>x.study_session_id).filter(Boolean)),list=[];
    for(const b of batches){const t=tm.get(b.topic_id),total=Number(b.total_questions||0),correct=Number(b.correct_count||0);list.push({kind:'batch',id:b.id,type:b.source_kind==='qconcursos'?'qconcursos':'questions',subject:sm.get(b.subject_id)||'Matéria',topic:t?.title||'Assunto',code:t?.syllabus_code||'',when:b.practiced_at||b.created_at,duration:b.duration_minutes,total,correct,wrong:Math.max(0,total-correct),notes:b.notes||'',linkedPlan:!!b.plan_item_id});}
    for(const s of (sesR.data||[])){if(s.activity_type==='questions'&&linked.has(s.id))continue;const t=tm.get(s.topic_id),total=Number(s.questions_answered||0),correct=Number(s.correct_answers||0);list.push({kind:'session',id:s.id,type:s.activity_type||'study',subject:sm.get(s.subject_id)||'Matéria',topic:t?.title||'Assunto',code:t?.syllabus_code||'',when:s.ended_at||s.created_at,duration:Number(s.duration_minutes||Math.round(Number(s.duration_seconds||0)/60))||0,total,correct,wrong:Math.max(0,total-correct),notes:s.notes||'',linkedPlan:!!s.plan_item_id});}
    rows=list.sort((a,b)=>new Date(b.when)-new Date(a.when));renderRows();if(st){st.textContent=`${rows.length} lançamento(s) encontrado(s).${dirty?' Alterações feitas: metas e desempenho serão atualizados ao sair desta tela.':''}`;st.classList.toggle('dirty',dirty);}
  }

  function rowHtml(r){
    const q=['questions','qconcursos'].includes(r.type),labels={study:'Estudo',review:'Revisão',questions:'Questões',qconcursos:'QConcursos'},chips=[];
    if(r.duration!==null&&r.duration!==undefined)chips.push(`<span class="lh-chip">⏱ ${esc(r.duration)} min</span>`);if(q)chips.push(`<span class="lh-chip">${r.total} questões</span>`,`<span class="lh-chip">${r.correct} acertos</span>`,`<span class="lh-chip">${r.wrong} erros</span>`,`<span class="lh-chip">${pct(r.correct,r.total)}%</span>`);if(r.linkedPlan)chips.push('<span class="lh-chip">Ligado à missão</span>');
    return `<article class="lh-row"><div><span class="lh-type ${r.type}">${labels[r.type]||r.type}</span><div class="lh-title">${esc(r.subject)} — ${esc(r.topic)}</div><div class="lh-sub">${r.code?esc(r.code)+' • ':''}${fmtDate(r.when)}${r.notes?' • '+esc(r.notes):''}</div><div class="lh-metrics">${chips.join('')}</div></div><div class="lh-actions"><button class="secondary-button" data-lh-edit="${r.kind}:${r.id}">Editar</button><button class="secondary-button" data-lh-delete="${r.kind}:${r.id}">Apagar</button></div></article>`;
  }
  function renderRows(){const list=$('#lhList');if(!list)return;const show=rows.filter(r=>filter==='all'||r.type===filter||(filter==='questions'&&r.type==='qconcursos'));list.innerHTML=show.length?show.map(rowHtml).join(''):'<div class="lh-empty"><strong>Nenhum lançamento neste filtro</strong><span>Os registros feitos por você aparecerão aqui.</span></div>';}
  function findRow(token){const [kind,id]=String(token||'').split(':');return rows.find(r=>r.kind===kind&&r.id===id)||null;}

  function openEdit(r){if(!r)return;editing=r;const q=['questions','qconcursos'].includes(r.type);$('#lhEditTitle').textContent=q?'Editar questões':r.type==='review'?'Editar revisão':'Editar estudo';$('#lhEditSub').textContent=`${r.subject} • ${r.topic}`;$('#lhQuestionFields').style.display=q?'grid':'none';$('#lhEditTotal').value=q?r.total:'';$('#lhEditWrong').value=q?r.wrong:'';$('#lhEditMinutes').value=r.duration??'';$('#lhEditNotes').value=r.notes||'';$('#lhModal').classList.add('open');$('#lhModal').setAttribute('aria-hidden','false');}
  function closeEdit(){editing=null;$('#lhModal')?.classList.remove('open');$('#lhModal')?.setAttribute('aria-hidden','true');}

  async function saveEdit(){
    if(!editing)return;const btn=$('#lhSave');btn.disabled=true;
    try{const q=['questions','qconcursos'].includes(editing.type),raw=$('#lhEditMinutes').value.trim(),minutes=raw===''?null:Number(raw),total=q?Number($('#lhEditTotal').value):null,wrong=q?Number($('#lhEditWrong').value):null,notes=$('#lhEditNotes').value.trim();
      if(minutes!==null&&(!Number.isFinite(minutes)||minutes<0||minutes>720))throw new Error('Informe um tempo válido.');if(!q&&(!minutes||minutes<1))throw new Error('Informe ao menos 1 minuto.');if(q&&(!Number.isInteger(total)||total<1||!Number.isInteger(wrong)||wrong<0||wrong>total))throw new Error('Confira a quantidade de questões e erros.');
      const {error}=await db.rpc('edit_learning_history_item',{p_kind:editing.kind,p_id:editing.id,p_duration_minutes:minutes,p_total_questions:total,p_wrong_count:wrong,p_notes:notes||null});if(error)throw error;dirty=true;closeEdit();toast('Lançamento corrigido e dados recalculados.','ok');await loadRows();
    }catch(e){showError(e);}finally{btn.disabled=false;}
  }
  async function deleteRow(r){if(!r)return;const desc=['questions','qconcursos'].includes(r.type)?`${r.total} questões de ${r.topic}`:`${r.duration} min de ${r.topic}`;if(!confirm(`Apagar este lançamento?\n\n${desc}\n\nA plataforma recalculará o desempenho e, quando houver vínculo, o progresso da missão.`))return;try{const {error}=await db.rpc('delete_learning_history_item',{p_kind:r.kind,p_id:r.id});if(error)throw error;dirty=true;toast('Lançamento apagado e dados recalculados.','ok');await loadRows();}catch(e){showError(e);}}

  function targetHash(el){if(el.matches?.('[data-page]'))return '#'+el.dataset.page;if(el.matches?.('[data-v49-open]'))return '#'+el.dataset.v49Open;if(el.matches?.('[data-v417-report]'))return '#reports';return null;}
  document.addEventListener('click',e=>{
    const h=e.target.closest('[data-v418-history]');if(h){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openHistory();return;}
    const f=e.target.closest('[data-lh-filter]');if(f){filter=f.dataset.lhFilter;$$('[data-lh-filter]').forEach(x=>x.classList.toggle('active',x===f));renderRows();return;}
    const ed=e.target.closest('[data-lh-edit]');if(ed){openEdit(findRow(ed.dataset.lhEdit));return;}const del=e.target.closest('[data-lh-delete]');if(del){deleteRow(findRow(del.dataset.lhDelete));return;}if(e.target.closest('[data-lh-close]')){closeEdit();return;}
    const nav=e.target.closest('[data-page],[data-v49-open],[data-v417-report]');if(nav&&dirty){const hash=targetHash(nav);if(hash){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();try{window.parent.postMessage({type:'mentor-refresh',hash},window.location.origin);}catch{}return;}}
  },true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#history')openHistory();});

  let tries=0;const timer=setInterval(()=>{tries++;if($('#appShell')&&$('main.content')&&$('.sidebar-nav')){injectPage();patchNav();const mo=new MutationObserver(()=>{clearTimeout(window.__lhNavPatch);window.__lhNavPatch=setTimeout(patchNav,80);});mo.observe($('.sidebar-nav'),{childList:true,subtree:true});if(location.hash==='#history')openHistory();clearInterval(timer);}if(tries>180)clearInterval(timer);},200);
})();