(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  function addStyles() {
    if ($('#mentorV49Styles')) return;
    const style = document.createElement('style');
    style.id = 'mentorV49Styles';
    style.textContent = `
      @media (min-width: 1000px){:root{--sidebar:292px}}
      .v49-nav{padding:12px 8px 20px}
      .v49-direct,.v49-parent{width:100%;display:flex;align-items:center;gap:11px;border:0;background:transparent;color:#181818;padding:11px 12px;border-radius:7px;text-align:left;font-weight:700;font-size:13px}
      .v49-direct:hover,.v49-parent:hover,.v49-direct.active,.v49-parent.active{background:rgba(255,255,255,.6)}
      .v49-direct.v49-history{background:rgba(255,255,255,.34);margin:2px 0}
      .v49-direct.v49-history:hover{background:rgba(255,255,255,.7)}
      .v49-ico{width:24px;text-align:center;font-size:16px;flex:0 0 24px}
      .v49-caret{margin-left:auto;font-size:13px;transition:transform .18s}.v49-parent[aria-expanded="true"] .v49-caret{transform:rotate(180deg)}
      .v49-sub{display:none;padding:2px 0 7px 47px}.v49-sub.open{display:flex;flex-direction:column}
      .v49-sub button{border:0;background:transparent;text-align:left;color:#332e11;padding:7px 5px;font-size:11.5px;border-radius:5px}
      .v49-sub button:hover,.v49-sub button.active{font-weight:850;background:rgba(255,255,255,.35)}
      .v49-sep{height:1px;background:rgba(0,0,0,.09);margin:8px 9px}
      .v49-material-page{display:none}.v49-material-page.active{display:block;animation:fade .14s ease}
      .v49-library-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:16px}
      .v49-library-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .v49-library-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px;box-shadow:var(--shadow);min-height:170px;display:flex;flex-direction:column;justify-content:space-between}
      .v49-library-card .bigicon{font-size:31px}.v49-library-card h3{margin:12px 0 5px;font-size:18px}.v49-library-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      .v49-empty{background:#fff;border:1px dashed #bfc4c8;border-radius:10px;padding:30px;text-align:center;color:var(--muted)}
      .v49-empty strong{display:block;color:#222;font-size:18px;margin-bottom:6px}
      .v49-filter-row{display:grid;grid-template-columns:1fr 2fr auto;gap:10px;margin-bottom:14px}
      .v49-badge{display:inline-flex;align-items:center;border-radius:999px;background:#fff6bf;padding:5px 9px;font-size:10px;font-weight:800}
      @media(max-width:760px){.v49-library-grid{grid-template-columns:1fr}.v49-filter-row{grid-template-columns:1fr}.v49-library-hero{align-items:flex-start;flex-direction:column}.v49-sub{padding-left:42px}}
    `;
    document.head.appendChild(style);
  }

  function addMaterialPages() {
    const main = $('main.content');
    if (!main || $('#v49VideoPage')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <section class="v49-material-page" id="v49VideoPage" data-v49-view="videos">
        <div class="v49-library-hero"><div><p class="eyebrow">MATERIAIS DE ESTUDO</p><h1>Videoaulas</h1><p class="muted">Vídeos selecionados por matéria e assunto do edital.</p></div><span class="v49-badge">Biblioteca preparada</span></div>
        <section class="panel"><div class="v49-filter-row"><select disabled><option>Todas as matérias</option></select><select disabled><option>Todos os assuntos</option></select><button class="secondary-button" disabled>Filtrar</button></div><div class="v49-empty"><strong>Nenhuma videoaula adicionada ainda</strong><span>Esta área já está pronta para receber os links selecionados do YouTube por assunto.</span></div></section>
      </section>
      <section class="v49-material-page" id="v49PdfPage" data-v49-view="pdfs">
        <div class="v49-library-hero"><div><p class="eyebrow">MATERIAIS DE ESTUDO</p><h1>PDFs e Arquivos</h1><p class="muted">Materiais de apoio organizados pelo edital.</p></div><span class="v49-badge">Biblioteca preparada</span></div>
        <section class="panel"><div class="v49-filter-row"><select disabled><option>Todas as matérias</option></select><select disabled><option>Todos os assuntos</option></select><button class="secondary-button" disabled>Filtrar</button></div><div class="v49-empty"><strong>Nenhum PDF adicionado ainda</strong><span>Esta área já está pronta para receber PDFs, leis, resumos e outros arquivos.</span></div></section>
      </section>
      <section class="v49-material-page" id="v49SimuladosPage" data-v49-view="simulados">
        <div class="v49-library-hero"><div><p class="eyebrow">QUESTÕES</p><h1>Simulados</h1><p class="muted">Treinos completos e por matéria.</p></div><span class="v49-badge">Em preparação</span></div>
        <div class="v49-library-grid"><article class="v49-library-card"><div><span class="bigicon">📝</span><h3>Simulado completo</h3><p>Modelo de prova com distribuição de questões, cronômetro e relatório final.</p></div><button class="secondary-button" disabled>Em breve</button></article><article class="v49-library-card"><div><span class="bigicon">📚</span><h3>Simulado por matéria</h3><p>Bateria concentrada em uma disciplina do ciclo.</p></div><button class="secondary-button" disabled>Em breve</button></article><article class="v49-library-card"><div><span class="bigicon">🎯</span><h3>Simulado de fraquezas</h3><p>Questões selecionadas pela Mentora a partir dos pontos mais instáveis.</p></div><button class="secondary-button" disabled>Em breve</button></article></div>
      </section>`;
    [...wrap.children].forEach(n => main.appendChild(n));
  }

  const groups = [
    {id:'questions',icon:'✓',label:'Questões',items:[
      ['Praticar Questões','page','questions','bank'],
      ['QConcursos','page','questions','external'],
      ['Questões Erradas','wrong'],
      ['Simulados','custom','simulados']
    ]},
    {id:'performance',icon:'◔',label:'Meu Desempenho',items:[
      ['Visão Geral','page','performance'],
      ['Progresso do Edital','page','syllabus'],
      ['Relatórios para baixar','reports']
    ]},
    {id:'plan',icon:'⚙',label:'Meu Plano',items:[
      ['Plano e Ciclo','page','plan'],
      ['Horários','page','plan','schedule'],
      ['Replanejar Atrasos','replan'],
      ['Assuntos do Edital','page','syllabus']
    ]},
    {id:'materials',icon:'▣',label:'Materiais de Estudo',items:[
      ['Videoaulas','custom','videos'],
      ['PDFs / Arquivos','custom','pdfs']
    ]},
    {id:'mentor',icon:'✦',label:'Mentora IA',items:[
      ['Abrir Mentora','page','mentor']
    ]}
  ];

  function itemButton(item) {
    const [label,type,a,b] = item;
    if (type === 'page') {
      const extra = a === 'questions' && b ? ` data-question-tab="${b}"` : (a === 'plan' && b === 'schedule' ? ' data-plan-focus="schedule"' : '');
      return `<button data-page="${a}"${extra}>${label}</button>`;
    }
    if (type === 'custom') return `<button data-v49-open="${a}">${label}</button>`;
    if (type === 'wrong') return `<button data-v49-action="wrong">${label}</button>`;
    if (type === 'replan') return `<button data-action="replan">${label}</button>`;
    if (type === 'reports') return `<button data-v417-report="1">${label}</button>`;
    return '';
  }

  function buildNav() {
    const nav = $('.sidebar-nav');
    if (!nav || nav.dataset.v49 === '1') return false;
    nav.dataset.v49 = '1';
    nav.classList.add('v49-nav');
    nav.innerHTML = `
      <button class="v49-direct active" data-page="dashboard"><span class="v49-ico">⌂</span><span>Painel</span></button>
      <button class="v49-direct" data-page="daily"><span class="v49-ico">▣</span><span>Metas Diárias</span></button>
      <button class="v49-direct" data-page="week"><span class="v49-ico">▦</span><span>Resumo da Semana</span></button>
      <button class="v49-direct v49-history" data-v418-history="1"><span class="v49-ico">↺</span><span>Histórico de Lançamentos</span></button>
      <div class="v49-sep"></div>
      ${groups.map(g => `<div class="v49-group" data-v49-group="${g.id}"><button class="v49-parent" data-v49-toggle="${g.id}" aria-expanded="false"><span class="v49-ico">${g.icon}</span><span>${g.label}</span><span class="v49-caret">⌄</span></button><div class="v49-sub" data-v49-sub="${g.id}">${g.items.map(itemButton).join('')}</div></div>`).join('')}
      <div class="v49-sep"></div>
      <button class="v49-direct" data-page="settings"><span class="v49-ico">◉</span><span>Configurações</span></button>`;
    return true;
  }

  function closeMaterials() { $$('.v49-material-page').forEach(p => p.classList.remove('active')); }

  function openCustom(view, title, subtitle) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.v49-material-page').forEach(p => p.classList.toggle('active', p.dataset.v49View === view));
    const t = $('#topbarPageTitle'), s = $('#topbarPageSubtitle');
    if (t) t.textContent = title;if (s) s.textContent = subtitle;
    history.replaceState(null,'',`#${view}`);$('#appShell')?.classList.remove('menu-open');window.scrollTo({top:0,behavior:'smooth'});
  }

  function setGroupOpen(id) {
    $$('.v49-group').forEach(g => {const active = g.dataset.v49Group === id;g.querySelector('.v49-parent')?.setAttribute('aria-expanded', String(active));g.querySelector('.v49-sub')?.classList.toggle('open', active);});
  }

  function handleWrongQuestions() {
    closeMaterials();document.querySelector('[data-page="questions"]')?.click();
    setTimeout(() => {document.querySelector('[data-question-tab="bank"]')?.click();const mode = $('#bankMode');if (mode) { mode.value = 'review';mode.dispatchEvent(new Event('change')); }}, 60);
  }

  function bind() {
    document.addEventListener('click', e => {
      const toggle = e.target.closest('[data-v49-toggle]');
      if (toggle) {e.preventDefault();e.stopPropagation();const id=toggle.dataset.v49Toggle,wasOpen=toggle.getAttribute('aria-expanded')==='true';if(wasOpen){toggle.setAttribute('aria-expanded','false');document.querySelector(`[data-v49-sub="${id}"]`)?.classList.remove('open');}else setGroupOpen(id);return;}
      const custom = e.target.closest('[data-v49-open]');
      if (custom) {e.preventDefault();e.stopPropagation();const v=custom.dataset.v49Open;if(v==='videos')openCustom('videos','Videoaulas','Materiais de estudo por assunto');else if(v==='pdfs')openCustom('pdfs','PDFs e Arquivos','Biblioteca de materiais de estudo');else openCustom('simulados','Simulados','Treinos completos e por matéria');return;}
      const wrong=e.target.closest('[data-v49-action="wrong"]');if(wrong){e.preventDefault();e.stopPropagation();handleWrongQuestions();return;}
      const normal=e.target.closest('[data-page],[data-action="replan"]');if(normal)closeMaterials();
    }, true);

    window.addEventListener('hashchange', () => {const h=location.hash.slice(1);if(['videos','pdfs','simulados'].includes(h)){if(h==='videos')openCustom(h,'Videoaulas','Materiais de estudo por assunto');if(h==='pdfs')openCustom(h,'PDFs e Arquivos','Biblioteca de materiais de estudo');if(h==='simulados')openCustom(h,'Simulados','Treinos completos e por matéria');}});
  }

  function boot() {
    addStyles();addMaterialPages();if(!buildNav())return;bind();const h=location.hash.slice(1);if(['videos','pdfs','simulados'].includes(h))setTimeout(()=>window.dispatchEvent(new Event('hashchange')),80);
  }

  let tries=0;const timer=setInterval(()=>{tries++;if($('#appShell')&&$('.sidebar-nav')&&$('main.content')){clearInterval(timer);boot();}if(tries>160)clearInterval(timer);},200);
})();