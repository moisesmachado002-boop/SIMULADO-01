(() => {
  'use strict';
  if(window.__mentorPasswordSecurityV503)return;
  window.__mentorPasswordSecurityV503=true;

  const $=s=>document.querySelector(s);
  let busy=false;

  function hex(buffer){
    return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  async function sha1(value){
    if(!globalThis.crypto?.subtle)throw new Error('Verificação criptográfica indisponível neste navegador.');
    return hex(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(String(value))));
  }

  async function breachedPassword(password){
    const hash=await sha1(password),prefix=hash.slice(0,5),suffix=hash.slice(5);
    const res=await fetch(`https://api.pwnedpasswords.com/range/${prefix}`,{
      method:'GET',
      headers:{'Add-Padding':'true'},
      cache:'no-store',
      referrerPolicy:'no-referrer'
    });
    if(!res.ok)throw new Error('Não foi possível consultar a base de senhas comprometidas.');
    const text=await res.text();
    for(const line of text.split(/\r?\n/)){
      const [candidate,count]=line.trim().split(':');
      if(candidate?.toUpperCase()===suffix)return {breached:true,count:Number(count||0)};
    }
    return {breached:false,count:0};
  }

  function message(text,kind='error'){
    const n=$('#authMessage');
    if(n){n.textContent=text;n.dataset.kind=kind;}
  }

  async function validateAndContinue(button){
    if(busy)return;
    const modal=$('#authModal');
    if(!modal||modal.dataset.mode!=='signup')return;
    const password=$('#authPassword')?.value||'';
    if(password.length<8){message('Para criar conta, use pelo menos 8 caracteres.');return;}
    busy=true;button.disabled=true;message('Verificando segurança da senha…','');
    try{
      const result=await breachedPassword(password);
      if(result.breached){
        message('Essa senha aparece em vazamentos conhecidos. Escolha outra senha.');
        return;
      }
      button.dataset.v503SecurityApproved='1';
      button.disabled=false;
      button.click();
    }catch(error){
      console.warn('password breach check',error);
      message('Não foi possível validar a senha com segurança agora. Tente novamente.');
    }finally{
      busy=false;
      if(button.dataset.v503SecurityApproved!=='1')button.disabled=false;
    }
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('#authSubmit');
    if(!button||$('#authModal')?.dataset.mode!=='signup')return;
    if(button.dataset.v503SecurityApproved==='1'){
      delete button.dataset.v503SecurityApproved;
      return;
    }
    e.preventDefault();e.stopImmediatePropagation();
    validateAndContinue(button);
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||e.target?.id!=='authPassword'||$('#authModal')?.dataset.mode!=='signup')return;
    e.preventDefault();e.stopImmediatePropagation();
    const button=$('#authSubmit');if(button)validateAndContinue(button);
  },true);

  window.MentorPasswordSecurityV503={breachedPassword};
})();
