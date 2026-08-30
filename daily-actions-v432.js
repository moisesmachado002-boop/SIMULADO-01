(() => {
  'use strict';
  if (window.__mentorDailyActionsV432) return;
  window.__mentorDailyActionsV432 = true;

  const ACTIONS = [
    ['data-task-complete','taskComplete'],
    ['data-task-review','taskReview'],
    ['data-task-bank','taskBank'],
    ['data-task-qc','taskQc']
  ];

  function escAttr(v='') {
    return String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  }

  function toast(text, kind='neutral') {
    const n=document.querySelector('#toast');
    if(!n) return;
    n.textContent=text;
    n.dataset.kind=kind;
    n.classList.add('show');
    clearTimeout(window.__mentorDailyActionsToast);
    window.__mentorDailyActionsToast=setTimeout(()=>n.classList.remove('show'),3200);
  }

  function relay(e) {
    const goals=e.target.closest('#v428Goals');
    if(!goals) return;

    for (const [attr,key] of ACTIONS) {
      const btn=e.target.closest(`[${attr}]`);
      if(!btn) continue;
      const id=btn.dataset[key];
      if(!id) return;

      const native=document.querySelector(`#dailyTasks [${attr}="${escAttr(id)}"]`);
      if(!native) {
        toast('A ação ainda não carregou. Atualize a Meta Diária e tente novamente.','error');
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      native.click();
      return;
    }
  }

  document.addEventListener('click', relay, true);
})();
