(() => {
  'use strict';

  const SUPABASE_URL='https://uysrtgyfnwyocdlaeyum.supabase.co';
  const SUPABASE_KEY='sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  let db=null;
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  function client(){
    if(db)return db;
    if(!window.supabase?.createClient)return null;
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return db;
  }

  function generic(text=''){
    const s=norm(text);
    return !s ||
      s.includes('gabarito registrado no material importado') ||
      s.includes('comentario detalhado ainda sera revisado') ||
      s.includes('alternativa nao indicada como correta no gabarito') ||
      s.includes('alternativa indicada como correta no gabarito') ||
      s.includes('explicacao em preparacao') ||
      s.includes('comentario detalhado em revisao');
  }

  function injectStyles(){
    if($('#feedbackCoachV411Styles'))return;
    const st=document.createElement('style');
    st.id='feedbackCoachV411Styles';
    st.textContent=`
      .question-feedback.coach411{padding:18px!important;border-width:1px!important}
      .coach411 h3{margin:0 0 14px!important}
      .coach411-grid{display:grid;gap:12px}
      .coach411-box{background:#fff;border:1px solid #dedede;border-radius:12px;padding:14px 15px;color:#242424}
      .coach411.bad .coach411-box{background:#fffafa}
      .coach411.good .coach411-box{background:#fbfffc}
      .coach411-title{font-weight:850;font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:7px;color:#595959}
      .coach411-answer{font-weight:800;margin-bottom:5px}
      .coach411-mini{border-left:4px solid #f2c400!important;background:#fffdf2!important}
      .coach411-next{border-left:4px solid #1b5795!important;background:#f5f9ff!important}
      .coach411-options{display:grid;gap:8px;margin-top:9px}
      .coach411-option{padding:10px 11px;border-radius:9px;background:#f5f5f5;line-height:1.4}
      .coach411-option.correct{background:#effaf4;border:1px solid #b8dfc9}
      .coach411-option.wrong{background:#fff0f0;border:1px solid #efc4c4}
      .coach411-meta{display:block;margin-top:12px;color:#666;font-size:12px}
      @media(max-width:640px){.question-feedback.coach411{padding:14px!important}.coach411-box{padding:12px}.coach411-grid{gap:10px}}
    `;
    document.head.appendChild(st);
  }

  function miniReview(topic='',subject=''){
    const t=norm(topic),s=norm(subject);
    if(t.includes('crase'))return 'Crase é a fusão da preposição “a” com o artigo feminino “a/as”. Teste rápido: troque o termo feminino por um masculino; se aparecer “ao”, normalmente haverá “à” no feminino. Não há crase antes de verbo e, em regra, diante de pronomes que não admitem artigo.';
    if(t.includes('sintaxe'))return 'Comece pelo verbo. Depois localize sujeito, complementos verbais e termos acessórios. Para distinguir objeto direto e indireto, observe se o verbo exige preposição.';
    if(t.includes('pontuacao'))return 'Vírgula não separa sujeito do verbo nem verbo do complemento. Ela marca deslocamentos, intercalações, enumerações e certas orações. Sempre identifique a estrutura sintática antes de pontuar.';
    if(t.includes('interpretacao'))return 'Responda pelo que o texto autoriza, não pelo que parece verdadeiro no mundo. Localize a ideia central, os conectivos e o trecho que sustenta cada alternativa.';
    if(t.includes('tipologia')||t.includes('generos textuais'))return 'Diferencie finalidade e estrutura: narração apresenta ações no tempo; descrição caracteriza; dissertação expõe/argumenta; injunção orienta. O gênero depende também da função comunicativa.';
    if(t.includes('acentuacao'))return 'Primeiro identifique a sílaba tônica e classifique a palavra em oxítona, paroxítona ou proparoxítona. Depois aplique a regra específica, incluindo hiatos e ditongos quando necessário.';
    if(t.includes('classes de palavras'))return 'Classifique a palavra pelo papel que exerce no contexto, não apenas pela forma isolada. A mesma palavra pode mudar de classe conforme a função na frase.';
    if(t.includes('concordancia'))return 'Na concordância verbal, localize o núcleo do sujeito. Na nominal, identifique o substantivo a que o termo se refere. Atenção a sujeitos compostos, expressões partitivas e casos facultativos.';
    if(t.includes('regencia'))return 'Regência é a relação de dependência entre um termo e seu complemento. O ponto decisivo costuma ser a preposição exigida pelo verbo ou pelo nome.';
    if(t.includes('significacao'))return 'O sentido depende do contexto. Diferencie denotação/conotação, sinonímia contextual, polissemia e efeitos produzidos pela escolha lexical.';
    if(t.includes('principios fundamentais')&&s.includes('constitucional'))return 'Revise os arts. 1º a 4º da Constituição: fundamentos da República, objetivos fundamentais, princípios das relações internacionais e a regra do parágrafo único do art. 1º.';
    if(t.includes('direitos e garantias')&&s.includes('constitucional'))return 'Nos direitos fundamentais, preste atenção à literalidade constitucional, destinatários, eficácia, remédios constitucionais e às exceções expressamente previstas.';
    if(t.includes('organizacao do estado'))return 'Revise a repartição político-administrativa, competências dos entes, bens e hipóteses constitucionais de intervenção. Questões costumam trocar competência comum, concorrente e privativa.';
    if(t.includes('administracao publica')||t.includes('principios fundamentais da administracao'))return 'Na Administração Pública, tenha como eixo legalidade, impessoalidade, moralidade, publicidade e eficiência. Diferencie princípios, regras de agentes públicos e limites da atuação administrativa.';
    if(t.includes('poderes e deveres'))return 'Diferencie poder vinculado, discricionário, hierárquico, disciplinar, regulamentar e poder de polícia. Abuso de poder pode ocorrer por excesso de poder ou desvio de finalidade.';
    if(t.includes('servidores publicos'))return 'Revise cargo, emprego e função, formas de provimento, acumulação, estabilidade e regras constitucionais dos agentes públicos. Atenção às exceções expressas.';
    if(t.includes('do crime')||t.startsWith('crime'))return 'Na teoria do crime, organize o raciocínio em fato típico, ilicitude e culpabilidade. Em seguida verifique consumação/tentativa, desistência, arrependimento e causas de exclusão.';
    if(t.includes('crimes contra a vida'))return 'Diferencie homicídio, lesão corporal e rixa pelos elementos do tipo, resultado, dolo/culpa, qualificadoras e causas de aumento/diminuição. Leia com cuidado o verbo do tipo penal.';
    if(t.includes('liberdade pessoal'))return 'Compare constrangimento ilegal, ameaça, perseguição, sequestro e cárcere privado pelo verbo nuclear, meio empregado e restrição efetiva da liberdade.';
    if(t.includes('patrimonio'))return 'No patrimônio, diferencie principalmente furto, roubo, extorsão, apropriação indébita e receptação. O ponto-chave é como o agente obtém ou mantém a coisa e se há violência/grave ameaça.';
    if(t.includes('dignidade sexual'))return 'Diferencie estupro, importunação e assédio sexual pelo meio empregado, presença de violência/grave ameaça, vulnerabilidade e relação de superioridade.';
    if(t.includes('corrupcao ativa'))return 'Corrupção ativa é crime praticado pelo particular ao oferecer ou prometer vantagem indevida a funcionário público para determiná-lo a praticar, omitir ou retardar ato de ofício.';
    if(t.includes('corrupcao passiva'))return 'Corrupção passiva ocorre quando o funcionário público solicita, recebe ou aceita promessa de vantagem indevida em razão da função. Compare os verbos do tipo com os da corrupção ativa.';
    if(t.includes('tortura'))return 'Na Lei 9.455/1997, identifique finalidade, sujeito ativo/passivo, formas equiparadas, causas de aumento e efeitos da condenação. A finalidade específica costuma decidir a questão.';
    if(t.includes('declaracao universal'))return 'Na DUDH, atenção à universalidade, igualdade, dignidade, liberdades, garantias processuais e direitos sociais. Muitas questões cobram a literalidade dos artigos.';
    if(t.includes('sao jose')||t.includes('americana sobre direitos humanos'))return 'No Pacto de San José, diferencie deveres dos Estados, direitos protegidos, garantias judiciais e regras de suspensão. Questões costumam explorar exceções e redação literal.';
    if(t.includes('pid')||t.includes('economicos, sociais e culturais'))return 'No PIDESC, foque autodeterminação, realização progressiva, igualdade, trabalho, previdência, família, saúde, educação e cultura, observando deveres estatais e limites.';
    if(t.includes('pequim'))return 'A Declaração/Plataforma de Pequim trabalha igualdade, desenvolvimento e paz, com foco em eliminar discriminações e ampliar participação, autonomia e acesso a oportunidades.';
    if(s.includes('matematica'))return `Em ${topic}, refaça o raciocínio em etapas: identifique os dados, escolha a relação/fórmula adequada, faça a conta e confira se o resultado é compatível com o enunciado.`;
    if(s.includes('informatica'))return `Em ${topic}, revise conceito, finalidade e caminho de uso. Em Informática, as alternativas erradas costumam trocar nomes de recursos, atalhos ou funções parecidas.`;
    if(s.includes('direito'))return `Em ${topic}, revise a regra central, seus requisitos e as exceções expressas. Em questões jurídicas, desconfie de palavras absolutas como “sempre”, “nunca” e “somente” quando a lei prevê ressalvas.`;
    return `Revise o conceito central de ${topic||'este assunto'}, seus critérios, exceções e exemplos. Em seguida, tente explicar a regra com suas próprias palavras antes da próxima questão.`;
  }

  function fallbackExplanation({topic,subject,right,rightText,selected,selectedText,correct}){
    const t=norm(topic),s=norm(subject);
    if(t.includes('crase')){
      return correct
        ? `A alternativa ${right} mantém a crase porque a substituição continua permitindo a combinação da preposição “a” com artigo feminino. Em “${rightText}”, o núcleo feminino admite artigo e preserva a estrutura exigida.`
        : `A alternativa correta é ${right}: “${rightText}”. Para manter a crase, a substituição precisa conservar a preposição “a” e também admitir artigo feminino “a”. Sua resposta ${selected} (“${selectedText}”) não preserva essa combinação no mesmo ponto.`;
    }
    if(s.includes('lingua portuguesa')){
      return correct
        ? `A alternativa ${right} é a que respeita a regra de ${topic}. O ponto decisivo é observar a estrutura da frase no contexto, e não apenas uma palavra isolada.`
        : `A correta é ${right}: “${rightText}”. Sua resposta foi ${selected}: “${selectedText}”. Compare as duas pela regra de ${topic}; a diferença relevante está na função/estrutura exigida pelo enunciado.`;
    }
    return correct
      ? `A alternativa ${right} (“${rightText}”) é a que atende à regra cobrada em ${topic}. Use a mini revisão abaixo para fixar o critério que decidiu a questão.`
      : `A correta é ${right}: “${rightText}”. Sua resposta foi ${selected}: “${selectedText}”. O ponto que separa as alternativas é a regra central de ${topic}, resumida logo abaixo.`;
  }

  async function fetchQuestion(statement){
    const c=client();
    if(!c||!statement)return null;
    try{
      const {data,error}=await c.from('questions').select('id,explanation,option_explanations,answer_key_note,correct_answer').eq('statement',statement).limit(1).maybeSingle();
      if(error)return null;
      return data||null;
    }catch{return null;}
  }

  function optionMap(){
    const out={};
    document.querySelectorAll('#questionAnswers .answer').forEach(b=>{
      const l=String(b.dataset.answer||'').toUpperCase();
      const txt=b.querySelector('span:last-child')?.textContent?.trim()||b.textContent.replace(l,'').trim();
      if(l)out[l]=txt;
    });
    return out;
  }

  function meaningfulOptions(obj){
    if(!obj||typeof obj!=='object')return {};
    return Object.fromEntries(Object.entries(obj).filter(([,v])=>v&&!generic(v)));
  }

  async function enhance(){
    const node=$('#questionFeedback');
    if(!node||node.classList.contains('hidden'))return;
    const statement=$('#questionStatement')?.textContent?.trim()||'';
    const topic=$('#questionTopic')?.textContent?.trim()||'este assunto';
    const subject=$('#questionSubject')?.textContent?.trim()||'';
    const answers=optionMap();
    const rightBtn=$('#questionAnswers .answer.correct');
    const wrongBtn=$('#questionAnswers .answer.wrong');
    const right=String(rightBtn?.dataset.answer||'').toUpperCase();
    if(!right)return;
    const correct=!wrongBtn;
    const selected=String((wrongBtn||rightBtn)?.dataset.answer||right).toUpperCase();
    const key=`${statement}|${right}|${selected}`;
    if(node.dataset.coach411===key)return;
    node.dataset.coach411=key;

    const oldP=node.querySelector('p')?.textContent?.trim()||'';
    const oldSmall=node.querySelector('small')?.textContent?.trim()||'';
    const row=await fetchQuestion(statement);
    const rightText=answers[right]||'';
    const selectedText=answers[selected]||'';
    const explanation=(row?.explanation&&!generic(row.explanation))?row.explanation:(!generic(oldP)?oldP:fallbackExplanation({topic,subject,right,rightText,selected,selectedText,correct}));
    const mini=(row?.answer_key_note&&norm(row.answer_key_note).includes('mini revisao'))?row.answer_key_note.replace(/^\s*Mini revisão\s*:\s*/i,''):miniReview(topic,subject);
    const opts=meaningfulOptions(row?.option_explanations);
    const confidence=norm(oldSmall).includes('confianca baixa')?'baixa':norm(oldSmall).includes('confianca alta')?'alta':'média';
    const next=!correct
      ? 'Antes de avançar: diga a regra em uma frase, identifique por que sua alternativa falhou e faça pelo menos 2 questões diferentes deste mesmo assunto.'
      : confidence==='baixa'
        ? 'Você acertou com confiança baixa. Trate como acerto frágil: faça mais 2 questões deste assunto sem consultar a teoria.'
        : 'Acerto consistente nesta questão. Siga para a próxima e confirme a regra em questões diferentes.';

    const optionHtml=[];
    if(opts[right])optionHtml.push(`<div class="coach411-option correct"><strong>${esc(right)} • correta</strong> — ${esc(opts[right])}</div>`);
    if(!correct&&selected!==right&&opts[selected])optionHtml.push(`<div class="coach411-option wrong"><strong>${esc(selected)} • sua resposta</strong> — ${esc(opts[selected])}</div>`);

    node.classList.add('coach411');
    node.classList.toggle('good',correct);
    node.classList.toggle('bad',!correct);
    node.innerHTML=`
      <h3>${correct?'✓ Acertou':`✕ Errou • correta ${esc(right)}`}</h3>
      <div class="coach411-grid">
        <section class="coach411-box">
          <div class="coach411-title">Entenda a questão</div>
          <div class="coach411-answer">${correct?`Por que ${esc(right)} está correta`:`Sua resposta ${esc(selected)} × correta ${esc(right)}`}</div>
          <div>${esc(explanation)}</div>
          ${optionHtml.length?`<div class="coach411-options">${optionHtml.join('')}</div>`:''}
        </section>
        <section class="coach411-box coach411-mini">
          <div class="coach411-title">Mini revisão • ${esc(topic)}</div>
          <div>${esc(mini)}</div>
        </section>
        <section class="coach411-box coach411-next">
          <div class="coach411-title">Próximo passo</div>
          <div>${esc(next)}</div>
        </section>
      </div>
      ${oldSmall?`<small class="coach411-meta">${esc(oldSmall)}</small>`:''}`;
  }

  injectStyles();
  let observer=null,tries=0;
  const timer=setInterval(()=>{
    tries++;
    const node=$('#questionFeedback');
    if(node){
      observer?.disconnect();
      observer=new MutationObserver(()=>queueMicrotask(enhance));
      observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      enhance();
      clearInterval(timer);
    }
    if(tries>160)clearInterval(timer);
  },250);
})();
