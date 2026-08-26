(() => {
  'use strict';

  const VERSION = '9.3.1';
  const MILITARY_BASE = 'https://www.qconcursos.com/questoes-militares/questoes';

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

  // Filtros confirmados no segmento "Questões Militares" do QConcursos.
  // HB14 (Conjuração Baiana) pertence ao assunto QC "Processo de Independência...".
  const MILITARY_TOPICS = [
    {
      subject:'História do Brasil',
      topic:'Conjuração Baiana',
      label:'Conjuração Baiana',
      disciplineId:'550',
      subjectId:'14906',
      aliases:['revolta dos alfaiates','conjuracao baiana','conjuração baiana']
    }
  ];

  const SUBJECT_DISCIPLINES = Object.freeze({
    'portugues':'1',
    'lingua portuguesa':'1',
    'direito administrativo':'2',
    'direito constitucional':'3',
    'matematica':'13',
    'historia':'550',
    'historia do brasil':'550'
  });

  const $ = selector => document.querySelector(selector);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const cleanTopic = value => String(value || '').replace(/^\s*[A-Z]{1,6}\d+(?:\.\d+)?\s*[•·:\-–—]\s*/i,'').trim();

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
    const input=$('#p8QFilterUrl');
    if (input) input.value=preset.url;
    const subjectReady=chooseOption(subject,preset.subject);
    setTimeout(()=>{
      const topicReady=chooseOption($('#p8Topic'),preset.topic,preset.aliases);
      if ((!subjectReady||!topicReady) && attempt<3) setTimeout(()=>syncPresetToP8(preset,attempt+1),120);
    },80);
  }

  function selectedScope() {
    const subjectText=$('#p8Subject')?.selectedOptions?.[0]?.textContent || '';
    const topicRaw=$('#p8Topic')?.selectedOptions?.[0]?.textContent || '';
    return {
      subjectText:String(subjectText || '').trim(),
      topicText:cleanTopic(topicRaw),
      subject:norm(subjectText),
      topic:norm(cleanTopic(topicRaw))
    };
  }

  function exactPresetForScope(scope) {
    if (!scope.subject || !scope.topic) return null;
    const sameSubject=PRESETS.filter(p=>norm(p.subject)===scope.subject || (scope.subject==='lingua portuguesa' && norm(p.subject)==='portugues'));
    return sameSubject.find(p=>[p.topic,...p.aliases].some(v=>scope.topic.includes(norm(v))||norm(v).includes(scope.topic))) || null;
  }

  function militaryUrlFromPreset(preset) {
    try {
      const original=new URL(preset.url);
      if (original.pathname.includes('/questoes-de-concursos/questoes')) {
        const target=new URL(MILITARY_BASE);
        original.searchParams.getAll('discipline_ids[]').forEach(value=>target.searchParams.append('discipline_ids[]',value));
        original.searchParams.getAll('subject_ids[]').forEach(value=>target.searchParams.append('subject_ids[]',value));
        return target.toString();
      }
      if (original.pathname.includes('/questoes-de-concursos/disciplinas/')) {
        original.pathname=original.pathname.replace('/questoes-de-concursos/disciplinas/','/questoes-militares/disciplinas/');
        original.search='';
        return original.toString();
      }
    } catch(error) {
      console.warn('Filtro pronto do QConcursos inválido:',error);
    }
    return null;
  }

  function buildMilitaryRecommendation() {
    const scope=selectedScope();
    if (!scope.subjectText || !scope.topicText) return null;

    const mapped=MILITARY_TOPICS.find(item=>{
      const subjectMatch=norm(item.subject)===scope.subject;
      const topicTerms=[item.topic,...(item.aliases||[])].map(norm);
      return subjectMatch && topicTerms.some(term=>scope.topic.includes(term)||term.includes(scope.topic));
    });
    if (mapped) {
      const url=new URL(MILITARY_BASE);
      url.searchParams.append('discipline_ids[]',mapped.disciplineId);
      url.searchParams.append('subject_ids[]',mapped.subjectId);
      return {
        id:'military-selected-topic',
        subject:scope.subjectText,
        topic:scope.topicText,
        label:mapped.label || scope.topicText,
        badge:'Questões Militares',
        url:url.toString(),
        dynamic:true,
        exact:true
      };
    }

    const exactPreset=exactPresetForScope(scope);
    if (exactPreset) {
      const url=militaryUrlFromPreset(exactPreset);
      if (url) return {
        id:'military-selected-topic',
        subject:scope.subjectText,
        topic:scope.topicText,
        label:scope.topicText,
        badge:'Questões Militares',
        url,
        dynamic:true,
        exact:true
      };
    }

    const disciplineId=SUBJECT_DISCIPLINES[scope.subject];
    if (disciplineId) {
      const url=new URL(MILITARY_BASE);
      url.searchParams.append('discipline_ids[]',disciplineId);
      return {
        id:'military-selected-subject',
        subject:scope.subjectText,
        topic:scope.topicText,
        label:scope.topicText,
        badge:'Militares • matéria filtrada',
        url:url.toString(),
        dynamic:true,
        exact:false
      };
    }

    return null;
  }

  function selectedRecommendation() {
    const military=buildMilitaryRecommendation();
    if (military) return military;

    const scope=selectedScope();
    if (scope.subjectText || scope.topicText) return {
      id:'military-unmapped',
      subject:scope.subjectText || 'Matéria selecionada',
      topic:scope.topicText || '',
      label:scope.topicText || scope.subjectText || 'Questões Militares',
      badge:'Filtro militar pendente',
      url:'https://www.qconcursos.com/questoes-militares/questoes',
      dynamic:true,
      exact:false,
      unmapped:true
    };

    return null;
  }

  function renderRecommendation() {
    const host=$('#p8PresetRecommendation');
    if (!host) return;
    const recommendation=selectedRecommendation();
    if (!recommendation) {
      host.innerHTML='<div><span class="p8-preset-kicker">1 CLIQUE • RECOMENDAÇÃO</span><strong>Escolha matéria e assunto</strong><small>O link será montado no segmento Questões Militares.</small></div>';
      return;
    }
    const detail=recommendation.exact
      ? `${recommendation.subject} • ${recommendation.badge}`
      : `${recommendation.subject} • ${recommendation.badge}`;
    host.innerHTML=`<div><span class="p8-preset-kicker">1 CLIQUE • FILTRO SELECIONADO</span><strong>${recommendation.label}</strong><small>${detail}</small></div><button type="button" class="primary" data-p8-recommendation="1">Resolver agora ↗</button>`;
    const input=$('#p8QFilterUrl');
    if (input && recommendation.url) input.value=recommendation.url;
  }

  function openRecommendation() {
    const recommendation=selectedRecommendation();
    if (!recommendation?.url) return;
    const msg=$('#p8Message');
    if (msg) {
      msg.textContent=recommendation.exact
        ? `Abrindo Questões Militares: ${recommendation.subject} • ${recommendation.topic}.`
        : `Abrindo Questões Militares de ${recommendation.subject}. O assunto ainda não tem um ID exato mapeado no QC.`;
      msg.dataset.kind=recommendation.exact ? 'ok' : 'warn';
    }
    window.open(recommendation.url,'_blank','noopener,noreferrer');
  }

  function openPreset(preset) {
    syncPresetToP8(preset);
    const msg=$('#p8Message');
    if (msg) { msg.textContent=`Filtro pronto antigo: ${preset.label} (${preset.badge}).`; msg.dataset.kind='ok'; }
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
      <div class="p8-preset-heading"><div><span class="eyebrow">FILTROS PRONTOS DO QCONCURSOS</span><h3>Escolha e abra em 1 clique</h3><p>Os atalhos abaixo são filtros prontos antigos. Já o cartão acima acompanha a matéria e o assunto selecionados e abre o segmento Questões Militares.</p></div></div>
      <div class="p8-preset-grid">${PRESETS.map(p=>`<button type="button" class="p8-preset-card" data-p8-preset="${p.id}"><span class="p8-preset-badge">${p.badge}</span><strong>${p.label}</strong><small>${p.subject}</small><span class="p8-preset-action">Fazer questões ↗</span></button>`).join('')}</div>`;
    const scope=panel.querySelector('.p8-scope');
    scope ? scope.insertAdjacentElement('afterend',section) : panel.prepend(section);
    section.addEventListener('click',event=>{
      if (event.target.closest('[data-p8-recommendation]')) {
        openRecommendation();
        return;
      }
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

  window.MentorQPresets=Object.freeze({version:VERSION,presets:PRESETS,openPreset,openRecommendation,selectedRecommendation});
  boot();
})();