(() => {
  'use strict';

  const VERSION = '9.1';
  let refreshing = false;
  let queued = false;
  const $ = selector => document.querySelector(selector);
  const esc = (value='') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function context() {
    const db=window.mentorCloud?.client;
    if (!db) return {db:null,user:null};
    const {data:{session}}=await db.auth.getSession();
    return {db,user:session?.user||null};
  }

  function reliability(attempts) {
    if (attempts>=8) return 'Alta';
    if (attempts>=4) return 'Média';
    if (attempts>0) return 'Baixa';
    return 'Sem dados';
  }

  function statusFor(score,attempts) {
    if (!attempts) return {label:'Sem dados',cls:'mid'};
    if (score>=75) return {label:'Bom domínio',cls:'good'};
    if (score>=55) return {label:'Em construção',cls:'mid'};
    return {label:'Prioridade',cls:'low'};
  }

  function groupMastery(subjects,topics,mastery) {
    const topicMap=new Map(topics.map(topic=>[topic.id,topic]));
    const groups=new Map(subjects.map(subject=>[subject.id,{subject,rows:[]} ]));
    mastery.forEach(row=>{
      const topic=topicMap.get(row.topic_id);
      if (!topic||!groups.has(topic.subject_id)) return;
      groups.get(topic.subject_id).rows.push({...row,topic});
    });
    return [...groups.values()].sort((a,b)=>Number(a.subject.position||0)-Number(b.subject.position||0));
  }

  function subjectStats(group) {
    const rows=group.rows;
    const evidence=rows.reduce((sum,row)=>sum+Number(row.attempts_count||0),0);
    const denominator=rows.reduce((sum,row)=>sum+Math.max(1,Number(row.attempts_count||0)),0);
    const weighted=evidence&&denominator?rows.reduce((sum,row)=>sum+Number(row.mastery_score||0)*Math.max(1,Number(row.attempts_count||0)),0)/denominator:0;
    const correct=rows.reduce((sum,row)=>sum+Number(row.correct_count||0),0);
    const last=rows.reduce((latest,row)=>Math.max(latest,row.last_attempt_at?new Date(row.last_attempt_at).getTime():0),0);
    return {evidence,score:Math.round(weighted||0),correct,last};
  }

  function renderOverview(groups,totalAttempts,correctAttempts) {
    const measured=groups.map(group=>({group,stats:subjectStats(group)})).filter(item=>item.stats.evidence>0);
    const totalEvidence=measured.reduce((sum,item)=>sum+item.stats.evidence,0);
    const overall=totalEvidence?Math.round(measured.reduce((sum,item)=>sum+item.stats.score*item.stats.evidence,0)/totalEvidence):null;
    const priority=[...measured].sort((a,b)=>a.stats.score-b.stats.score||b.stats.evidence-a.stats.evidence)[0];
    if ($('#overallMastery')) $('#overallMastery').textContent=overall==null?'—':`${overall}%`;
    if ($('#totalAnswered')) $('#totalAnswered').textContent=String(totalAttempts||0);
    if ($('#accuracy')) $('#accuracy').textContent=totalAttempts?`${Math.round(correctAttempts/totalAttempts*100)}%`:'—';
    if ($('#prioritySubject')) $('#prioritySubject').textContent=priority?.group?.subject?.name||'Aguardando dados';
    if ($('#heroText')&&priority) $('#heroText').textContent=`Sua prioridade atual é ${priority.group.subject.name} (${priority.stats.score}%). Abra as questões para seguir o ciclo.`;
  }

  function renderMiniMap(groups) {
    const host=$('#miniMap');
    if (!host) return;
    host.innerHTML=groups.map(group=>{
      const stats=subjectStats(group);
      return `<div class="subject-row"><div class="subject-top"><strong>${esc(group.subject.name)}</strong><span>${stats.evidence?`${stats.score}%`:'Sem dados'}</span></div><div class="bar"><span style="width:${stats.evidence?stats.score:0}%"></span></div></div>`;
    }).join('');
  }

  function renderKnowledgeMap(groups) {
    const host=$('#knowledgeMap');
    if (!host) return;
    host.innerHTML=groups.map(group=>{
      const stats=subjectStats(group);
      const status=statusFor(stats.score,stats.evidence);
      const topics=[...group.rows].sort((a,b)=>Number(a.mastery_score||0)-Number(b.mastery_score||0)).slice(0,4)
        .map(row=>`<span class="topic-pill">${esc(row.topic.title)}: ${Math.round(Number(row.mastery_score||0))}%</span>`).join('')||'<span class="topic-pill">Aguardando evidências</span>';
      const age=stats.last?Math.floor((Date.now()-stats.last)/86400000):0;
      const ageText=stats.evidence&&age>7?`<span class="age-note">${age} dias sem evidência</span>`:'';
      return `<article class="knowledge-card"><div class="knowledge-head"><div><span class="eyebrow">${stats.evidence} EVIDÊNCIA${stats.evidence===1?'':'S'}</span><h2>${esc(group.subject.name)}</h2></div><span class="status ${status.cls}">${status.label}</span></div><div class="knowledge-score">${stats.evidence?stats.score+'%':'—'}</div><div class="bar"><span style="width:${stats.evidence?stats.score:0}%"></span></div><div class="reliability"><span>Confiabilidade:</span><strong>${reliability(stats.evidence)}</strong>${ageText}</div><p>${stats.evidence?`${stats.correct} acerto(s) em ${stats.evidence} questão(ões)/evidências ponderadas.`:'Ainda não existem respostas suficientes para estimar seu domínio.'}</p><div class="topic-list">${topics}</div></article>`;
    }).join('');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
  }

  function renderHistory(attempts,subjectMap,topicMap) {
    const list=$('#historyList'), count=$('#historyCount');
    if (!list||!count) return;
    count.textContent=`${attempts.length} registro${attempts.length===1?'':'s'} recentes`;
    if (!attempts.length) {
      list.innerHTML='<div class="empty-history">Suas respostas aparecerão aqui depois do primeiro treino.</div>';
      return;
    }
    list.innerHTML=attempts.map(attempt=>{
      const conf=Number(attempt.confidence||0)>=5?'alta':Number(attempt.confidence||0)<=2?'baixa':'média';
      return `<article class="history-item"><div class="history-result ${attempt.is_correct?'good':'bad'}">${attempt.is_correct?'✓':'×'}</div><div class="history-copy"><strong>${esc(subjectMap.get(attempt.subject_id)||'Matéria')}</strong><span>${esc(topicMap.get(attempt.topic_id)||'Assunto')} · confiança ${conf}</span></div><div class="history-meta">${Number(attempt.response_time_seconds||0)}s<br>${esc(formatDate(attempt.answered_at))}</div></article>`;
    }).join('');
  }

  function lockEvidenceTaskButtons(plan) {
    (plan?.items||[]).filter(item=>['questions','review'].includes(item.task_type)).forEach(item=>{
      const button=document.querySelector(`[data-p6-complete="${CSS.escape(item.id)}"]`);
      if (!button) return;
      const badge=document.createElement('span');
      badge.className='p6-badge';
      badge.textContent='CONCLUI AUTOMATICAMENTE';
      button.replaceWith(badge);
    });
  }

  async function refresh() {
    if (refreshing) { queued=true; return; }
    refreshing=true;
    try {
      const {db,user}=await context();
      if (!db||!user) return;
      const [subjectsR,topicsR,masteryR,attemptsR,totalR,correctR]=await Promise.all([
        db.from('subjects').select('id,name,position').eq('active',true).order('position'),
        db.from('topics').select('id,subject_id,title,syllabus_code').eq('active',true),
        db.from('topic_mastery').select('topic_id,mastery_score,confidence_score,attempts_count,correct_count,last_attempt_at,next_review_at,trend').eq('user_id',user.id),
        db.from('question_attempts').select('subject_id,topic_id,is_correct,response_time_seconds,confidence,answered_at').eq('user_id',user.id).order('answered_at',{ascending:false}).limit(30),
        db.from('question_attempts').select('id',{count:'exact',head:true}).eq('user_id',user.id),
        db.from('question_attempts').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_correct',true)
      ]);
      for (const result of [subjectsR,topicsR,masteryR,attemptsR,totalR,correctR]) if (result.error) throw result.error;
      const subjects=subjectsR.data||[], topics=topicsR.data||[], mastery=masteryR.data||[];
      const groups=groupMastery(subjects,topics,mastery);
      renderOverview(groups,Number(totalR.count||0),Number(correctR.count||0));
      renderMiniMap(groups);
      renderKnowledgeMap(groups);
      renderHistory(attemptsR.data||[],new Map(subjects.map(row=>[row.id,row.name])),new Map(topics.map(row=>[row.id,row.title])));
      document.querySelector('[data-view="mentora"] .chat-card')?.classList.add('hidden');
      document.querySelectorAll('[data-view="mentora"] .quick-actions,[data-view="mentora"] .prompt-grid').forEach(node=>node.classList.add('p7-legacy-actions'));
    } catch(error) {
      console.warn('Stability 9.1: painel canônico não atualizado',error);
    } finally {
      refreshing=false;
      if (queued) { queued=false; setTimeout(refresh,80); }
    }
  }

  window.addEventListener('mentor:attempt-saved',()=>setTimeout(refresh,180));
  window.addEventListener('mentor:external-practice-saved',()=>setTimeout(refresh,220));
  window.addEventListener('mentor:plan-updated',event=>{
    lockEvidenceTaskButtons(event.detail);
    setTimeout(refresh,180);
  });
  window.addEventListener('mentor:analysis-updated',()=>setTimeout(refresh,180));

  async function boot() {
    await refresh();
    try { lockEvidenceTaskButtons(await window.MentorScheduleEngine?.getPlan?.()); } catch(error) { console.warn('Stability 9.1: plano não lido',error); }
    const db=window.mentorCloud?.client;
    db?.auth?.onAuthStateChange?.(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,160);});
  }

  window.MentorStability=Object.freeze({version:VERSION,refresh,lockEvidenceTaskButtons});
  boot();
})();