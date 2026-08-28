(() => {
  'use strict';
  if (window.__mentorSubtopicsV414) return;
  window.__mentorSubtopicsV414 = true;

  const URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  if(!db)return;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let subtopics=[],counts=new Map();

  function injectStyle(){
    if($('#subtopicV414Style'))return;
    const s=document.createElement('style');s.id='subtopicV414Style';s.textContent=`
      .v414-subtopic-label{display:block}.v414-subtopic-label[hidden]{display:none!important}
      .v414-subtopic-hint{display:block;margin-top:5px;font-size:11px;line-height:1.35;color:#777}
      .v414-subtopic-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
      .v414-subtopic-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:#f5f6f7;border:1px solid #e2e4e7;font-size:11px;color:#444}
      .v414-subtopic-chip b{font-size:10px;color:#777}
      .syllabus-topic.v414-has-children{align-items:flex-start}
      .syllabus-topic.v414-has-children>div{min-width:0;flex:1}
      @media(min-width:900px){.filters-panel .form-grid.three.v414-four,.question-tab[data-question-panel="external"] .form-grid.three.v414-four{grid-template-columns:repeat(4,minmax(0,1fr))}}
    `;document.head.appendChild(s);
  }

  function children(parentId){return subtopics.filter(x=>x.parent_topic_id===parentId).sort((a,b)=>Number(a.position||0)-Number(b.position||0));}
  function countFor(id){return Number(counts.get(id)||0);}

  function ensureSelect(topicId,selectId,labelText,external=false){
    const topic=$('#'+topicId);if(!topic)return null;
    let sel=$('#'+selectId);if(sel)return sel;
    const topicLabel=topic.closest('label');if(!topicLabel)return null;
    const label=document.createElement('label');label.className='v414-subtopic-label';label.id=selectId+'Label';label.innerHTML=`${labelText}<select id="${selectId}"><option value="">Todos do tópico</option></select>${external?'<small class="v414-subtopic-hint">Organiza o recorte. Quando o QC não tiver ID exato salvo, confirme este subassunto no site externo.</small>':''}`;
    topicLabel.insertAdjacentElement('afterend',label);
    topicLabel.parentElement?.classList.add('v414-four');
    sel=label.querySelector('select');
    return sel;
  }

  function fill(topicId,selectId){
    const topic=$('#'+topicId),sel=$('#'+selectId),label=$('#'+selectId+'Label');if(!topic||!sel||!label)return;
    const rows=children(topic.value||'');
    label.hidden=!topic.value||!rows.length;
    const old=sel.value;
    sel.innerHTML='<option value="">Todos do tópico</option>'+rows.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${countFor(x.id)?` (${countFor(x.id)})`:''}</option>`).join('');
    if(rows.some(x=>x.id===old))sel.value=old;
    else sel.value='';
  }

  function injectFilters(){
    const bank=ensureSelect('bankTopic','bankSubtopic','Subassunto');
    const qc=ensureSelect('qcTopic','qcSubtopic','Subassunto',true);
    if(bank&&!bank.dataset.v414){bank.dataset.v414='1';bank.addEventListener('change',()=>{bank.dispatchEvent(new CustomEvent('mentor-subtopic-change',{bubbles:false}));$('#bankMode')?.dispatchEvent(new Event('change'));});}
    if(qc&&!qc.dataset.v414){qc.dataset.v414='1';qc.addEventListener('change',decorateQcPreview);}
    ['bankTopic','qcTopic'].forEach(id=>{const el=$('#'+id);if(el&&!el.dataset.v414Topic){el.dataset.v414Topic='1';el.addEventListener('change',()=>{fill(id,id==='bankTopic'?'bankSubtopic':'qcSubtopic');if(id==='qcTopic')decorateQcPreview();});}});
    fill('bankTopic','bankSubtopic');fill('qcTopic','qcSubtopic');
  }

  function decorateQcPreview(){
    setTimeout(()=>{
      const sel=$('#qcSubtopic'),box=$('#qcPreview');if(!sel||!box)return;
      box.querySelector('.v414-qc-sub')?.remove();
      if(!sel.value)return;
      const st=subtopics.find(x=>x.id===sel.value);if(!st)return;
      const note=document.createElement('small');note.className='v414-qc-sub v414-subtopic-hint';note.innerHTML=`Subassunto escolhido: <b>${esc(st.title)}</b>.`;
      box.appendChild(note);
    },20);
  }

  function decorateSyllabus(){
    const list=$('#syllabusList');if(!list)return;
    $$('#syllabusList .syllabus-topic').forEach(row=>{
      const strong=row.querySelector('strong');if(!strong)return;
      const code=(strong.textContent||'').split('•')[0].trim();
      const parent=subtopics.find(x=>x.parent_code===code)?.parent_topic_id;
      if(!parent)return;
      const rows=children(parent);if(!rows.length)return;
      row.classList.add('v414-has-children');
      let box=row.querySelector('.v414-subtopic-list');if(!box){box=document.createElement('div');box.className='v414-subtopic-list';strong.parentElement?.appendChild(box);}
      box.innerHTML=rows.map(x=>`<span class="v414-subtopic-chip">${esc(x.title)}${countFor(x.id)?` <b>${countFor(x.id)}q</b>`:''}</span>`).join('');
    });
  }

  async function load(){
    injectStyle();
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const [s,q]=await Promise.all([
      db.from('topics').select('id,parent_topic_id,title,position,syllabus_code').eq('source_name','filter_subtopic').not('parent_topic_id','is',null).order('position'),
      db.from('questions').select('subtopic_id').not('subtopic_id','is',null).limit(5000)
    ]);
    if(s.error)throw s.error;if(q.error)throw q.error;
    subtopics=(s.data||[]);
    const parentIds=[...new Set(subtopics.map(x=>x.parent_topic_id))];
    if(parentIds.length){const p=await db.from('topics').select('id,syllabus_code').in('id',parentIds);if(!p.error){const m=new Map((p.data||[]).map(x=>[x.id,x.syllabus_code]));subtopics.forEach(x=>x.parent_code=m.get(x.parent_topic_id)||'');}}
    counts=new Map();(q.data||[]).forEach(x=>{if(x.subtopic_id)counts.set(x.subtopic_id,(counts.get(x.subtopic_id)||0)+1);});
    injectFilters();decorateSyllabus();
  }

  const obs=new MutationObserver(()=>{
    clearTimeout(window.__mentorSubtopicsMut);
    window.__mentorSubtopicsMut=setTimeout(()=>{injectFilters();decorateSyllabus();},120);
  });
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>load().catch(e=>console.warn('subtopics v4.14',e)),700);
})();