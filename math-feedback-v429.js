(() => {
  'use strict';
  if (window.__mentorMathFeedbackV429) return;
  window.__mentorMathFeedbackV429 = true;

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  const db=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let busy=false,lastKey='';

  function injectStyle(){
    if($('#mathFeedbackV429Style'))return;
    const st=document.createElement('style');st.id='mathFeedbackV429Style';st.textContent=`
      .question-feedback.math429{padding:0!important;overflow:hidden;border:1px solid #d8dee5!important;background:#fff!important;color:#202830!important}
      .math429-head{padding:16px 18px;background:#f7f9fb;border-bottom:1px solid #e3e7eb;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .math429-head h3{margin:0!important;font-size:18px}.math429-head small{display:block;margin-top:4px;color:#68717a}.math429-key{font-weight:900;border-radius:999px;padding:7px 10px;background:#e7f6eb;color:#196c36;white-space:nowrap}
      .math429-grid{display:grid;gap:12px;padding:16px 18px}.math429-box{border:1px solid #e1e5e9;border-radius:12px;padding:14px 15px;background:#fff}
      .math429-box.solution{border-left:4px solid #f2c500;background:#fffdf4}.math429-box.compare{border-left:4px solid #d74a4a;background:#fff8f8}.math429-box.ok{border-left:4px solid #30945a;background:#f7fff9}
      .math429-label{font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#65707a;margin-bottom:7px}.math429-answer{font-size:14px;font-weight:850;margin:4px 0}.math429-answer span{font-weight:500;color:#4f5963}
      .math429-solution{font-size:14px;line-height:1.62;white-space:pre-wrap}.math429-options{display:grid;gap:8px;margin-top:10px}.math429-option{padding:10px 11px;border-radius:9px;background:#f5f6f7;border:1px solid #e5e7e9;font-size:13px;line-height:1.45}.math429-option.correct{background:#edf9f1;border-color:#b8dfc5}.math429-option.selected{background:#fff1f1;border-color:#ebc1c1}
      .math429-details summary{cursor:pointer;font-weight:850;font-size:13px}.math429-note{font-size:12px;line-height:1.45;color:#69727a}.math429-meta{padding:0 18px 16px;color:#727b83;font-size:11px}
      @media(max-width:640px){.math429-head{flex-direction:column}.math429-grid{padding:13px}.math429-meta{padding:0 13px 13px}}
    `;document.head.appendChild(st);
  }

  function answers(){
    const out={};document.querySelectorAll('#questionAnswers .answer').forEach(b=>{const l=String(b.dataset.answer||'').toUpperCase();const text=b.querySelector('span:last-child')?.textContent?.trim()||'';if(l)out[l]=text;});return out;
  }
  function isBoilerplate(v=''){
    const s=norm(v);return !s||s.includes('comentario detalhado em revisao')||s.includes('o desenvolvimento correto conduz a alternativa')||s.includes('compare esta opcao com a resolucao')||s.includes('o resultado nao satisfaz as condicoes do enunciado')||s.includes('a propriedade usada conduz a alternativa');
  }
  async function fetchQuestion(statement){
    if(!db||!statement)return null;try{const {data,error}=await db.from('questions').select('id,correct_answer,explanation,option_explanations,answer_key_note,board,exam_name,difficulty').eq('statement',statement).limit(1).maybeSingle();if(error)throw error;return data||null;}catch(e){console.warn('math feedback v4.29',e);return null;}
  }
  function fallbackWrong(selected,right){return `A alternativa ${selected} não coincide com o resultado obtido pela resolução. Refaça a passagem em que o cálculo chega ao valor da alternativa ${right}; é nesse ponto que as duas respostas se separam.`;}

  async function enhance(){
    if(busy)return;const node=$('#questionFeedback');if(!node||node.classList.contains('hidden'))return;
    const subject=$('#questionSubject')?.textContent?.trim()||'';if(!norm(subject).includes('matematica'))return;
    const statement=$('#questionStatement')?.textContent?.trim()||'';const rightBtn=$('#questionAnswers .answer.correct');if(!rightBtn)return;
    const wrongBtn=$('#questionAnswers .answer.wrong'),right=String(rightBtn.dataset.answer||'').toUpperCase(),selected=String((wrongBtn||rightBtn).dataset.answer||right).toUpperCase(),correct=!wrongBtn,key=`${statement}|${selected}|${right}`;
    if(lastKey===key&&node.classList.contains('math429'))return;busy=true;
    try{
      const row=await fetchQuestion(statement),map=answers(),opt=row?.option_explanations||{},resolution=(row?.explanation||node.querySelector('.coach411-box div:not([class])')?.textContent||'').trim();
      const selectedComment=opt[selected]&&!isBoilerplate(opt[selected])?opt[selected]:(!correct?fallbackWrong(selected,right):'Sua resposta coincide com o gabarito e com o resultado obtido na resolução.');
      const oldMeta=node.querySelector('small')?.textContent?.trim()||node.querySelector('.coach411-meta')?.textContent?.trim()||'';
      const allOptions=Object.keys(map).map(l=>{let txt=opt[l]||'';if(isBoilerplate(txt))txt=l===right?'Esta alternativa coincide com o resultado demonstrado na resolução.':'Esta alternativa não coincide com o resultado demonstrado na resolução.';return `<div class="math429-option ${l===right?'correct':''} ${l===selected&&l!==right?'selected':''}"><strong>${esc(l)}${l===right?' • gabarito':''}${l===selected&&l!==right?' • sua resposta':''}</strong> — ${esc(map[l])}<br><span>${esc(txt)}</span></div>`;}).join('');
      injectStyle();node.className=`question-feedback math429 ${correct?'good':'bad'}`;node.innerHTML=`
        <div class="math429-head"><div><h3>${correct?'✓ Acertou':'✕ Errou'}</h3><small>${correct?'Resposta confirmada':'Compare sua resposta com o gabarito abaixo'}</small></div><div class="math429-key">Gabarito ${esc(right)}</div></div>
        <div class="math429-grid">
          <section class="math429-box ${correct?'ok':'compare'}"><div class="math429-label">Resposta</div><div class="math429-answer">Correta: ${esc(right)} <span>— ${esc(map[right]||'')}</span></div>${!correct?`<div class="math429-answer">Sua resposta: ${esc(selected)} <span>— ${esc(map[selected]||'')}</span></div>`:''}</section>
          <section class="math429-box solution"><div class="math429-label">Resolução passo a passo</div><div class="math429-solution">${esc(resolution||'Resolução indisponível.')}</div></section>
          <section class="math429-box ${correct?'ok':'compare'}"><div class="math429-label">${correct?'Por que está correta':'Onde sua alternativa se diferencia'}</div><div class="math429-solution">${esc(selectedComment)}</div></section>
          <section class="math429-box math429-details"><details><summary>Comentários das alternativas</summary><div class="math429-options">${allOptions}</div></details></section>
          ${row?.answer_key_note?`<section class="math429-box"><div class="math429-label">Conferência do gabarito</div><div class="math429-note">${esc(row.answer_key_note)}</div></section>`:''}
        </div>${oldMeta?`<div class="math429-meta">${esc(oldMeta)}</div>`:''}`;
      node.dataset.math429=key;lastKey=key;
    }finally{busy=false;}
  }

  let obs=null,tries=0;const timer=setInterval(()=>{tries++;const n=$('#questionFeedback');if(n){obs?.disconnect();obs=new MutationObserver(()=>setTimeout(enhance,40));obs.observe(n,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});enhance();clearInterval(timer);}if(tries>180)clearInterval(timer);},200);
})();
