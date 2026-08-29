(() => {
  'use strict';
  if (window.__mentorQCBanksV421) return;
  window.__mentorQCBanksV421 = true;

  function patch(){
    const select=document.getElementById('qcBoard');
    if(!select)return false;
    const wanted=[['1','FCC'],['379','INSTITUTO AOCP']];
    for(const [value,label] of wanted){
      if(![...select.options].some(o=>o.value===value)){
        const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o);
      }
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(patch()||tries>200)clearInterval(timer);},150);
  new MutationObserver(()=>patch()).observe(document.documentElement,{childList:true,subtree:true});
})();