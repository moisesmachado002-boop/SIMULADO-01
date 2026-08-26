# MAPA DO PROJETO — Mentor IA

> Documento operacional obrigatório. Antes de qualquer alteração, consultar este mapa e o **STATUS DO PROJETO**. Se uma mudança exigir arquivo não previsto aqui, atualizar este mapa primeiro.

## Fonte de verdade e segurança
- Currículo: **Edital Verticalizado PMBA Soldado 2026**.
- Supabase Mentor IA: projeto `uysrtgyfnwyocdlaeyum`.
- GitHub público: `moisesmachado002-boop/SIMULADO-01`.
- PDFs licenciados e banco privado de questões nunca devem ser publicados no GitHub.
- Nunca expor service role, chaves privadas ou tokens.
- Não alterar o projeto/repositório Financeiro.
- Nunca inventar gabarito: para questões extraídas de PDF, vale o gabarito do próprio material.
- Edge Function `import-mentor-questions`: desde P3.1g está com `verify_jwt=true`, sem token fixo embutido e bloqueada para mutações públicas; importações P3 são feitas pelo pipeline administrativo controlado.

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões ✅ concluída
  - P2.1 — estados individuais ✅
  - P2.2 — filtros e integração visual ✅
  - P2.3 — dificuldade e origem ✅
- P3 — Importação dos PDFs 🔄 em andamento
  - P3.1 — Português 🔄 em andamento
    - P3.1a — Interpretação/Tipologia, questões 1–2 ✅
    - P3.1b — Sintaxe, questão 16 ✅
    - P3.1c — auditoria/reconciliação de Crase ✅
    - P3.1d — Sintaxe, questão 17 ✅
    - P3.1e — Sintaxe, questão 1 ✅
    - P3.1f — Sintaxe, questão 2 ✅
    - P3.1g — lote seguro Sintaxe/Pontuação (6 questões) ✅
    - P3.1h — lote mínimo de 30 questões: Ortografia/Grafia + Concordância ✅
    - P3.1i — próximo lote de Português com no mínimo 30 questões válidas ⏳
  - P3.2 — História ⏳
  - P3.3 — Geografia ⏳
  - P3.4 — Matemática ⏳
  - P3.5 — Informática ⏳
  - P3.6 — Direito Constitucional ⏳
  - P3.7 — Direitos Humanos ⏳
  - P3.8 — Direito Administrativo ⏳
  - P3.9 — Direito Penal ⏳
  - P3.10 — Igualdade Racial e de Gênero ⏳
  - P3.11 — Direito Penal Militar ⏳
- P4 — Correção Completa ⏳
- P5 — Modo QG ⏳
- P6 — Cronograma e Revisões ⏳
- P7 — Mentora Inteligente ⏳
- P8 — Qconcursos + Internet ⏳

**Última subparte concluída:** P3.1h — importação de 30 questões em um único lote, sendo 20 da seção Ortografia/Grafia e 10 da seção Concordância Verbal e Nominal.

**Próxima subparte:** P3.1i — continuar Português com outro lote de no mínimo 30 questões válidas, sem reduzir a qualidade para completar quantidade.

**Fonte usada em P3.1:** `modulo questões gerais fcc (quad).pdf`, privado/licenciado.

## Regra de tamanho dos lotes P3
- A partir da P3.1h, cada novo lote de importação deve ter **no mínimo 30 questões válidas**.
- A quantidade nunca autoriza importar questão quebrada, ilegível, duplicada, sem gabarito confiável ou fora do edital.
- Se a matéria/subparte não tiver 30 questões válidas restantes, não completar artificialmente: registrar a quantidade real disponível e informar a limitação antes de encerrar a matéria.

## Resultados acumulados da P3.1
### P3.1a
- 2 importadas: INT-1 → LP2, gabarito B; INT-2 → LP1, gabarito C.

### P3.1b
- INT-16 → LP7, gabarito E.

### P3.1c
- 18 registros de Crase já existentes foram auditados/reconciliados; P3-7 e P3-9 não foram recriadas sem confirmação segura.

### P3.1d
- INT-17 → LP7, gabarito D.

### P3.1e
- SIN-1 → LP7, gabarito C.

### P3.1f
- SIN-2 → LP7, gabarito E.
- Após P3.1f: 24 questões vinculadas ao módulo.

### P3.1g
- 6 importadas: SIN-18, SIN-24, SIN-25, SIN-27, SIN-28 e SIN-30.
- Classificação entre LP7 `Sintaxe da oração e do período` e LP8 `Pontuação`.
- Após P3.1g: 30 questões vinculadas ao módulo.

### P3.1h
- Lote solicitado: **30 questões**; inseridas: **30**; puladas/duplicadas: **0**.
- ORT-1 a ORT-20: 20 questões da seção `ORTOGRAFIA E GRAFIA`.
- CON-1 a CON-10: 10 questões da seção `CONCORDÂNCIA VERBAL E NOMINAL`.
- Mapeamento primário: LP3 `Ortografia oficial`, LP4 `Acentuação gráfica`, LP7 `Sintaxe da oração e do período` e LP9 `Concordância nominal e verbal`, conforme o conteúdo efetivamente cobrado.
- Validação: 30/30 gabaritos A–E válidos; 30/30 com alternativas A–E; 30/30 privadas; 30/30 `difficulty_origin=estimated`; 30/30 vinculadas a matéria e tópico oficiais.
- Gabaritos confirmados no gabarito geral do próprio PDF antes do insert.
- Total real vinculado ao módulo após P3.1h: **60 questões**; `source_documents.question_count=60`; importação de Português continua em `processing`.

## Arquivos atuais e responsabilidades
- `MAPA-DO-PROJETO.md`: status persistente, arquitetura e matriz de alteração.
- `index.html`: estrutura HTML base e carregamento estático; sem regras de negócio.
- `app.js`: motor legado/local; evitar novas funcionalidades.
- `styles.css`: estilos globais/base.
- `cloud-sync.js`: autenticação Supabase, perfil e sincronização legada.
- `auth.css`: estilos de autenticação.
- `bank-mode.js`: orquestrador da Central de Questões; apenas wiring fino.
- `bank-mode.css`: estilos base da Central.
- `qg-theme.css`: tema QG compartilhado.
- `edital-core.js` / `edital-core.css`: P1, currículo/taxonomia oficial e UI do edital; fontes externas não ampliam currículo.
- `q-mode.js` / `q-mode.css`: modo legado/manual do Qconcursos; mudanças maiores só na P8.
- `q-presets.js` / `q-presets.css`: atalhos Qconcursos; reservar para P8.
- `question-state.js`: P2.1, estados `new|answered|correct|wrong|review|mastered`.
- `question-filters.js` / `question-filters.css`: P2.2, filtros e rotação por estado.
- `question-difficulty.js` / `question-difficulty.css`: P2.3, `easy|medium|hard`, origem `source|estimated|calibrated`, revelação somente pós-gabarito.
- `sw.js`: Service Worker/PWA; alterar apenas quando assets frontend mudarem.
- `manifest.json` / `icon.svg`: PWA.
- `README.md`: documentação pública geral.

## Módulos planejados
- `question-feedback.js` — P4.
- `review-engine.js`, `study-profile.js`, `schedule-engine.js` — P6.
- `mentor-engine.js` — P7; IA real somente por backend seguro.
- `qconcursos-links.js` — P8.

## Supabase — estrutura relevante
- `questions`: questão canônica; P3 guarda conteúdo licenciado como `private`, gabarito, tópico, dificuldade e origem.
- `source_documents`: origem/licença/status/contagem real do material.
- `question_attempts`: histórico imutável de respostas.
- `user_question_state`: resumo por usuário+questão, contadores, última resposta, tempo, confiança, revisão e status.
- `subjects`, `topics`, `topic_components` e aliases: currículo oficial P1.
- `topic_mastery`: domínio agregado por tópico.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + wiring mínimo `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js`/CSS + wiring mínimo `bank-mode.js`.
- Dificuldade → `question-difficulty.js`/CSS + `questions`.
- Importação P3 → `questions`, `source_documents`, taxonomia P1 e fonte licenciada; não publicar conteúdo no GitHub.
- Correção → futuro `question-feedback.js`.
- Edital/taxonomia → `edital-core.js` + tabelas P1.
- Cronograma → `study-profile.js`, `schedule-engine.js`, `review-engine.js`.
- Mentora/IA → `mentor-engine.js` + backend/Edge Function com JWT.
- Qconcursos → `qconcursos-links.js`.
- Cache/PWA → `sw.js` apenas se assets mudarem.

## Protocolo de importação P3
1. localizar questão e gabarito no PDF licenciado;
2. trabalhar somente a matéria/subparte atual;
3. montar lotes com no mínimo 30 questões válidas quando houver estoque suficiente;
4. extrair enunciado e alternativas completas;
5. confirmar gabarito no próprio material;
6. mapear para tópico oficial/subitem aplicável;
7. consultar duplicidade por `source_external_id` e enunciado antes de inserir;
8. usar `estimated` se a fonte não informar dificuldade;
9. descartar/adiar questão quebrada, dependente de imagem ou com destaque essencial perdido;
10. manter conteúdo `private` no Supabase;
11. atualizar `source_documents.question_count` com o total real vinculado;
12. validar integridade e registrar o lote neste mapa.

## Regras de execução
1. Uma parte/subparte segura por execução.
2. Atualizar este mapa antes de tocar arquivo não previsto.
3. Preferir módulo separado a ampliar monólitos.
4. Um commit claro por subparte sempre que possível.
5. Nunca inventar gabarito, página ou metadado de fonte.
6. Nunca publicar material licenciado ou segredo.
7. Conferir Supabase, GitHub, mapa/status e Pages antes de marcar concluído.
8. Se Pages não estiver `completed/success`, não declarar concluído.
9. Se P1–P8 terminarem, parar e aguardar orientação.
