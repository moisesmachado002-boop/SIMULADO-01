(() => {
  'use strict';
  if(window.__mentorQuestionEliminationV412)return;
  window.__mentorQuestionEliminationV412=true;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  function injectStyle(){if($('#qeV412Style'))return;const s=document.createElement('style');s.id='qeV412Style';s.textContent=`
    #questionAnswers .answer{position:relative;padding-right:48px!important}
    #questionAnswers .answer .qe-cut{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:15px;font-weight:900;color:#777;background:#fff;border:1px solid #d7d7d7;opacity:.2;transition:.15s;z-index:3}
    #questionAnswers .answer:hover .qe-cut,#questionAnswers .answer .qe-cut:focus{opacity:1;color:#b42318;border-color:#e6a6a0}
    #questionAnswers .answer.qe-eliminated{opacity:.48;background:#f3f3f3!important;border-color:#d4d4d4!important}
    #questionAnswers .answer.qe-eliminated>span:not(.answer-letter):not(.qe-cut){text-decoration:line-through;text-decoration-thickness:2px}
    #questionAnswers .answer.qe-eliminated .qe-cut{opacity:1;background:#fff4f2;color:#b42318;border-color:#f0b0aa}
    #questionAnswers .answer:disabled .qe-cut{display:none!important}
    @media(max-width:720px){#questionAnswers .answer .qe-cut{opacity:.7}}
  `;document.head.appendChild(s);}
  function decorate(){injectStyle();$$('#questionAnswers .answer').forEach(a=>{if(a.querySelector('.qe-cut'))return;const x=document.createElement('span');x.className='qe-cut';x.setAttribute('role','button');x.setAttribute('tabindex','0');x.setAttribute('aria-label','Riscar alternativa');x.title='Riscar alternativa';x.textContent='✕';a.appendChild(x);});}
  function canToggle(a){return a&&!a.disabled&&!$('#questionFeedback')?.classList.contains('good')&&!$('#questionFeedback')?.classList.contains('bad');}
  function toggle(a){if(!canToggle(a))return;a.classList.toggle('qe-eliminated');}
  document.addEventListener('click',e=>{const cut=e.target.closest('.qe-cut');if(cut){e.preventDefault();e.stopImmediatePropagation();toggle(cut.closest('.answer'));return;}const a=e.target.closest('#questionAnswers .answer.qe-eliminated');if(a&&canToggle(a)){e.preventDefault();e.stopImmediatePropagation();toggle(a);}},true);
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('qe-cut')){e.preventDefault();e.stopPropagation();toggle(e.target.closest('.answer'));}},true);
  document.addEventListener('contextmenu',e=>{const a=e.target.closest('#questionAnswers .answer');if(a&&canToggle(a)){e.preventDefault();toggle(a);}},true);
  const o=new MutationObserver(()=>{clearTimeout(window.__qeV412T);window.__qeV412T=setTimeout(decorate,40);});o.observe(document.documentElement,{subtree:true,childList:true});decorate();
})();