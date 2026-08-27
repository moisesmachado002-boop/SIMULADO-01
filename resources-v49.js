(() => {
  'use strict';
  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  let db=null,subjects=[],topics=[],resources=[];
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function client(){
    if(db)return db;
    if(!window.supabase?.createClient)return null;
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return db;
  }
  function subjectName(id){return subjects.find(x=>x.id===id)?.name||''}
  function topicName(id){const t=topics.find(x=>x.id===id);return t?`${t.syllabus_code||''}${t.syllabus_code?' — ':''}${t.title}`:''}

  function setupPage(page,type){
    if(!page)return;
    const selects=[...page.querySelectorAll('select')],button=page.querySelector('.v49-filter-row button'),list=page.querySelector('.v49-empty');
    if(selects.length<2||!list)return;
    const [subject,topic]=selects;
    subject.disabled=false;topic.disabled=false;if(button)button.style.display='none';
    subject.innerHTML='<option value="">Todas as matérias</option>'+subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
    const fillTopics=()=>{const rows=topics.filter(t=>!subject.value||t.subject_id===subject.value);topic.innerHTML='<option value="">Todos os assuntos</option>'+rows.map(t=>`<option value="${t.id}">${esc((t.syllabus_code?`${t.syllabus_code} — `:'')+t.title)}</option>`).join('');render(type,page,subject.value,topic.value)};
    subject.addEventListener('change',fillTopics);topic.addEventListener('change',()=>render(type,page,subject.value,topic.value));fillTopics();
  }

  function render(type,page,subjectId='',topicId=''){
    const host=page.querySelector('.v49-empty');if(!host)return;
    const rows=resources.filter(r=>r.resource_type===type&&r.active!==false&&(!subjectId||r.subject_id===subjectId)&&(!topicId||r.topic_id===topicId));
    if(!rows.length){host.className='v49-empty';host.innerHTML=`<strong>${type==='video'?'Nenhuma videoaula':'Nenhum PDF'} adicionado ainda</strong><span>Quando um material for cadastrado, ele aparecerá automaticamente aqui.</span>`;return;}
    host.className='v49-library-grid';
    host.innerHTML=rows.map(r=>`<article class="v49-library-card"><div><span class="bigicon">${type==='video'?'▶️':'📄'}</span><h3>${esc(r.title)}</h3><p>${esc(subjectName(r.subject_id))}${r.topic_id?` • ${esc(topicName(r.topic_id))}`:''}</p>${r.description?`<p style="margin-top:8px">${esc(r.description)}</p>`:''}${r.source_label?`<span class="v49-badge" style="margin-top:10px">${esc(r.source_label)}</span>`:''}</div><a class="primary-button" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;text-align:center;margin-top:14px">${type==='video'?'Assistir vídeo ↗':'Abrir PDF ↗'}</a></article>`).join('');
  }

  async function load(){
    const c=client();if(!c)return;
    const {data:{session}}=await c.auth.getSession();if(!session)return;
    const [s,t,r]=await Promise.all([
      c.from('subjects').select('id,name,position').eq('active',true).order('position'),
      c.from('topics').select('id,subject_id,title,syllabus_code,position').eq('active',true).order('position'),
      c.from('study_resources').select('*').eq('owner_user_id',session.user.id).eq('active',true).order('position').order('created_at')
    ]);
    if(s.error||t.error||r.error){console.warn('Biblioteca:',s.error||t.error||r.error);return;}
    subjects=s.data||[];topics=t.data||[];resources=r.data||[];
    setupPage($('#v49VideoPage'),'video');setupPage($('#v49PdfPage'),'pdf');
  }

  let tries=0;const timer=setInterval(()=>{tries++;if($('#v49VideoPage')&&$('#v49PdfPage')&&window.supabase?.createClient){clearInterval(timer);load().catch(e=>console.warn('Biblioteca:',e));}if(tries>180)clearInterval(timer)},250);
})();