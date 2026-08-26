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
    - P3.1h — próximo lote seguro de Português ⏳
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

**Última subparte concluída:** P3.1g — importação segura de 6 questões da seção Sintaxe, com classificação fina entre LP7 e LP8.

**Próxima subparte:** P3.1h — continuar Português com novo lote validado diretamente contra questão + alternativas + gabarito do PDF; não avançar para História antes de fechar P3.1.

**Fonte usada em P3.1:** `modulo questões gerais fcc (quad).pdf`, privado/licenciado.

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
- Questões examinadas para o lote: 6; válidas/importadas: 6; duplicadas: 0; descartadas no lote final: 0.
- SIN-18 → LP7 `Sintaxe da oração e do período`, gabarito B, `hard/estimated`, página PDF 24.
- SIN-24 → LP8 `Pontuação`, gabarito C, `easy/estimated`, página PDF 26.
- SIN-25 → LP8 `Pontuação`, gabarito D, `easy/estimated`, página PDF 26.
- SIN-27 → LP7 `Sintaxe da oração e do período`, gabarito E, `easy/estimated`, página PDF 26.
- SIN-28 → LP7 `Sintaxe da oração e do período`, gabarito B, `medium/estimated`, página PDF 26.
- SIN-30 → LP8 `Pontuação`, gabarito D, `medium/estimated`, página PDF 27.
- Validação do lote: 6/6 gabaritos válidos, 6/6 privadas, 6/6 `difficulty_origin=estimated`, 0 `source_external_id` duplicado.
- Total real vinculado ao módulo após o lote: **30 questões**, todas de Português nesta fase; `source_documents.question_count=30`, `import_status=processing`.
- O gabarito geral do PDF confirma os blocos de Português, incluindo Sintaxe, Pontuação, Crase, Classes de Palavras, Ortografia, Concordância e Regência.

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
3. extrair enunciado e alternativas completas;
4. confirmar gabarito no próprio material;
5. mapear para tópico oficial/subitem aplicável;
6. consultar duplicidade por `source_external_id` e enunciado antes de inserir;
7. usar `estimated` se a fonte não informar dificuldade;
8. descartar/adiar questão quebrada, dependente de imagem ou com destaque essencial perdido;
9. manter conteúdo `private` no Supabase;
10. atualizar `source_documents.question_count` com o total real vinculado;
11. validar integridade e registrar o lote neste mapa.

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
