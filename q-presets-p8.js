(() => {
  'use strict';

  const VERSION = '9.1.1';
  const PRESETS = [
    {id:'port-interpretacao-fcc',subject:'Português',topic:'Interpretação de Textos',label:'Interpretação de Texto',badge:'FCC',url:'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=1&examining_board_ids%5B%5D=1&subject_ids%5B%5D=14655',aliases:['interpretação','interpretacao','compreensão','compreensao']},
    {id:'port-crase-fcc',subject:'Português',topic:'Crase',label:'Crase',badge:'FCC',url:'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=1&examining_board_ids%5B%5D=1&subject_ids%5B%5D=15727',aliases:['crase']},
    {id:'port-conectivos',subject:'Português',topic:'Uso dos conectivos',label:'Conjunções e conectivos',badge:'Assunto',url:'https://www.qconcursos.com/questoes-de-concursos/disciplinas/letras-portugues/uso-dos-conectivos/questoes',aliases:['conjunções','conjuncoes','conectivos']},
    {id:'const-fundamentais-fcc',subject:'Direito Constitucional',topic:'Teoria dos Direitos Fundamentais',label:'Direitos Fundamentais',badge:'FCC',url:'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=3&examining_board_ids%5B%5D=1&subject_ids%5B%5D=18351',aliases:['direitos fundamentais','garantias fundamentais']},
    {id:'const-individuais-fcc',subject:'Direito Constitucional',topic:'Direitos Individuais',label:'Direitos Individuais',badge:'FCC',url:'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=3&examining_board_ids%5B%5D=1&subject_ids%5B%5D=16321',aliases:['direitos individuais','artigo 5','art. 5']},
    {id:'adm-principios-fcc',subject:'Direito Administrativo',topic:'Princípios da Administração Pública',label:'Princípios Administrativos',badge:'FCC',url:'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=2&examining_board_ids%5B%5D=1&subject_ids%5B%5D=896',aliases:['princípios administrativos','principios administrativos','princípios da administração','principios da administracao']},
    {id:'adm-limpe-fcc-medio',subject:'Direito Administrativo',topic:'LIMPE',label:'LIMPE — art. 37',badge:'FCC • Médio',url:'https://www.qconcursos.com/questoes-de-concursos/questoes?discipline_ids%5B%5D=2&examining_board_ids%5B%5D=1&scholarity_ids%5B%5D=2&subject_ids%5B%5D=16163',aliases:['limpe','legalidade','impessoalidade','moralidade','publicidade','eficiência','eficiencia']},
    {id:'penal-culpabilidade',subject:'Direito Penal',topic:'Culpabilidade',label:'Culpabilidade',badge:'Assunto',url:'https://www.qconcursos.com/questoes-de-concursos/disciplinas/direito-direito-penal/culpabilidade/questoes',aliases:['culpabilidade','imputabilidade']},
    {id:'info-email',subject:'Informática',topic:'Correio Eletrônico',label:'Correio eletrônico',badge:'Assunto',url:'https://www.qconcursos.com/questoes-de-concursos/disciplinas/tecnologia-da-informacao-nocoes-de-informatica/correio-eletronico-cliente-de-e-mail-e-webmail/questoes',aliases:['correio eletrônico','correio eletronico','email','e-mail','outlook']},
    {id:'mat-porcentagem',subject:'Matemática',topic:'Porcentagem',label:'Porcentagem',badge:'Assunto',url:'https://www.qconcursos.com/questoes-de-concursos/disciplinas/matematica-matematica/porcentagem/questoes',aliases:['porcentagem','percentual']}
  ];

  const $ = selector => document.querySelector(selector);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function chooseOption(select, wanted, aliases=[]) {
    if (!select) return false;
    const needles=[wanted,...aliases].map(norm).filter(Boolean);
    const option=[...select.options].find(opt=>{
      const text=norm(opt.textContent);
      return needles.some(needle=>text===needle||text.includes(needle)||needle.includes(text));
    });
    if (!option) return false;
    select.value=option.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function syncPresetToP8(preset, attempt=0) {
    const subject=$('#p8Subject');
    const topic=$('#p8Topic');
    const input=$('#p8QFilterUrl');
    if (input) input.value=preset.url;
    const subjectReady=chooseOption(subject,preset.subject);
    setTimeout(()=>{
      const topicReady=chooseOption($('#p8Topic'),preset.topic,preset.aliases);
      if ((!subjectReady||!topicReady) && attempt<3) setTimeout(()=>syncPresetToP8(preset,attempt+1),120);
    },80);
  }

  function selectedRecommendation() {
    const subjectText=$('#p8Subject')?.selectedOptions?.[0]?.textContent || $('#prioritySubject')?.textContent || '';
    const topicText=$('#p8Topic')?.selectedOptions?.[0]?.textContent || '';
    const subject=norm(subjectText);
    const topic=norm(topicText);
    const sameSubject=PRESETS.filter(p=>subject && norm(p.subject)===subject);
    if (sameSubject.length && topic) {
      const exact=sameSubject.find(p=>[p.topic,...p.aliases].some(v=>topic.includes(norm(v))||norm(v).includes(topic)));
      if (exact) return exact;
    }
    return sameSubject[0] || PRESETS[0];
  }

  function renderRecommendation() {
    const host=$('#p8PresetRecommendation');
    if (!host) return;
    const preset=selectedRecommendation();
    host.innerHTML=`<div><span class="p8-preset-kicker">1 CLIQUE • RECOMENDAÇÃO</span><strong>${preset.label}</strong><small>${preset.subject} • ${preset.badge}</small></div><button type="button" class="primary" data-p8-preset="${preset.id}">Resolver agora ↗</button>`;
  }

  function openPreset(preset) {
    syncPresetToP8(preset);
    const msg=$('#p8Message');
    if (msg) { msg.textContent=`Filtro pronto: ${preset.label} (${preset.badge}).`; msg.dataset.kind='ok'; }
    window.open(preset.url,'_blank','noopener,noreferrer');
  }

  function inject() {
    const panel=$('#mentorP8Panel');
    if (!panel || $('#p8PresetSection')) return false;
    const section=document.createElement('section');
    section.id='p8PresetSection';
    section.className='p8-presets-shell';
    section.innerHTML=`
      <div id="p8PresetRecommendation" class="p8-preset-recommendation"></div>
      <div class="p8-preset-heading"><div><span class="eyebrow">FILTROS PRONTOS DO QCONCURSOS</span><h3>Escolha e abra em 1 clique</h3><p>Os atalhos abaixo restauram os filtros prontos da versão anterior. Os marcados como FCC já incluem a banca.</p></div></div>
      <div class="p8-preset-grid">${PRESETS.map(p=>`<button type="button" class="p8-preset-card" data-p8-preset="${p.id}"><span class="p8-preset-badge">${p.badge}</span><strong>${p.label}</strong><small>${p.subject}</small><span class="p8-preset-action">Fazer questões ↗</span></button>`).join('')}</div>`;
    const scope=panel.querySelector('.p8-scope');
    scope ? scope.insertAdjacentElement('afterend',section) : panel.prepend(section);
    section.addEventListener('click',event=>{
      const button=event.target.closest('[data-p8-preset]');
      if (!button) return;
      const preset=PRESETS.find(p=>p.id===button.dataset.p8Preset);
      if (preset) openPreset(preset);
    });
    $('#p8Subject')?.addEventListener('change',()=>setTimeout(renderRecommendation,100));
    $('#p8Topic')?.addEventListener('change',renderRecommendation);
    window.addEventListener('mentor:analysis-updated',renderRecommendation);
    renderRecommendation();
    return true;
  }

  async function boot() {
    for (let i=0;i<80;i+=1) {
      if (inject()) break;
      await new Promise(resolve=>setTimeout(resolve,75));
    }
  }

  window.MentorQPresets=Object.freeze({version:VERSION,presets:PRESETS,openPreset});
  boot();
})();