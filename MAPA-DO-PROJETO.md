# MAPA DO PROJETO — Mentor IA

> Documento operacional obrigatório. Antes de qualquer alteração, consultar este mapa e o **STATUS DO PROJETO**. Se uma mudança exigir arquivo não previsto aqui, atualizar este mapa primeiro.

## Fonte de verdade
- Currículo: **Edital Verticalizado PMBA Soldado 2026**.
- Supabase Mentor IA: projeto `uysrtgyfnwyocdlaeyum`.
- GitHub público: `moisesmachado002-boop/SIMULADO-01`.
- PDFs licenciados e banco privado de questões nunca devem ser publicados no GitHub.
- Não alterar o projeto/repositório Financeiro.

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões ✅ concluída
  - P2.1 — estados individuais ✅ concluída
  - P2.2 — filtros e integração visual dos estados ✅ concluída
  - P2.3 — dificuldade e origem da dificuldade ✅ concluída
- P3 — Importação dos PDFs 🔄 próxima etapa
  - P3.1 — Português ⏳ pendente
  - P3.2 — História ⏳ pendente
  - P3.3 — Geografia ⏳ pendente
  - P3.4 — Matemática ⏳ pendente
  - P3.5 — Informática ⏳ pendente
  - P3.6 — Direito Constitucional ⏳ pendente
  - P3.7 — Direitos Humanos ⏳ pendente
  - P3.8 — Direito Administrativo ⏳ pendente
  - P3.9 — Direito Penal ⏳ pendente
  - P3.10 — Igualdade Racial e de Gênero ⏳ pendente
  - P3.11 — Direito Penal Militar ⏳ pendente
- P4 — Correção Completa ⏳ pendente
- P5 — Modo QG ⏳ pendente
- P6 — Cronograma e Revisões ⏳ pendente
- P7 — Mentora Inteligente ⏳ pendente
- P8 — Qconcursos + Internet ⏳ pendente

**Última subparte concluída:** P2.3 — dificuldade easy/medium/hard + origem source/estimated/calibrated.

**Próxima subparte:** P3.1 — importar e classificar Português a partir do acervo licenciado, usando o gabarito do próprio PDF.

**Último deploy confirmado antes do fechamento da P2.3:** GitHub Pages run 52 — success.

**Deploy da P2.3:** confirmar o run gerado pelo commit final deste mapa antes de declarar a versão concluída.

## Regras centrais de arquitetura
1. Uma parte/subparte segura por execução.
2. Funcionalidade nova deve preferir arquivo próprio.
3. `app.js`, `bank-mode.js` e `edital-core.js` não devem virar depósitos de novas regras.
4. Alterar arquivos orquestradores apenas para integração fina de módulos.
5. Atualizar este mapa ao terminar cada subparte.
6. Nunca inventar gabarito.
7. Nunca publicar segredo, service role, token ou PDF licenciado.
8. GitHub Pages precisa terminar em `completed/success` antes de declarar uma etapa concluída.

## Arquivos atuais

### `MAPA-DO-PROJETO.md`
Mapa operacional, responsabilidades, dependências e status persistente. Consultar sempre antes de modificar o projeto.

### `index.html`
Estrutura HTML base e carregamento estático de assets.
- P2.3: carrega `question-difficulty.css` e `question-difficulty.js`.
- Pode ser alterado para inclusão explícita de módulo, mas não para guardar regra de negócio.
- Metadados/cópias antigas continuam pendentes para uma etapa própria de limpeza.

### `app.js`
Motor legado/local de dashboard, diagnóstico e estado antigo.
- Evitar novas funcionalidades.
- Só alterar em etapa específica de migração/limpeza.

### `styles.css`
Estilos globais/base. Não usar como depósito de estilos de módulos novos.

### `cloud-sync.js`
Autenticação Supabase, perfil na nuvem, sincronização do estado legado e carregamento do banco privado.
- Mantém query/versionamento interno antigo; limpar em etapa própria.
- Não usar para regras de questões, dificuldade ou revisão.

### `auth.css`
Estilos de autenticação e conta.

### `bank-mode.js`
Orquestrador da Central de Questões.
- Carrega edital, questões e `user_question_state`.
- Integra `question-state.js` e `question-filters.js`.
- Renderiza questão, confirma gabarito e salva tentativa/estado.
- P2.2: versão 1.9, filtros Automático/Novas/Erradas/Acertadas/Revisão/Dominadas/Todas.
- Não concentrar nele novas regras grandes.

### `bank-mode.css`
Estilos base da Central de Questões.

### `qg-theme.css`
Tema visual/mecânica QG: alternativas, eliminação, acerto/erro, botões, timer e badges compartilhados.

### `edital-core.js`
P1 — núcleo do edital e taxonomia. Controla as 12 matérias, 99 tópicos oficiais, subitens, página de origem e visão do edital.
- Não alterar para filtros, dificuldade ou importação de conteúdo.

### `edital-core.css`
Estilos exclusivos da aba Edital.

### `q-mode.js` / `q-mode.css`
Modo legado/manual relacionado ao Qconcursos. Reservar mudanças maiores para P8.

### `q-presets.js` / `q-presets.css`
Atalhos atuais do Qconcursos. Reservar para P8/migração para `qconcursos-links.js`.

### `sw.js`
Service Worker/PWA.
- P2.2: incluiu módulos de estado/filtros.
- P2.3: cache `mentor-ia-v2-0-p2-3` inclui módulo e CSS de dificuldade.
- Atualizar somente quando assets mudarem.

### `manifest.json` / `icon.svg`
Manifesto e ícone da PWA.

### `README.md`
Documentação pública geral; não substitui este mapa.

## Módulos concluídos

### `question-state.js` — P2.1 ✅
Motor puro de estado individual.
Interpreta:
- `new` → NOVA
- `answered` → RESPONDIDA
- `correct` → ACERTADA
- `wrong` → ERRADA
- `review` → REVISÃO
- `mastered` → DOMINADA

Também considera `next_review_at` e expõe API em `window.MentorQuestionState`.

### `question-filters.js` — P2.2 ✅
Motor isolado dos filtros e da seleção automática.
Modo Automático:
1. inéditas;
2. revisões vencidas/em revisão;
3. questões em aprendizado com menos contatos;
4. dominadas ficam fora da rotação automática.

Filtros explícitos: Novas, Erradas, Acertadas, Revisão, Dominadas e Todas.

### `question-filters.css` — P2.2 ✅
Estilos exclusivos dos filtros de estado.

### `question-difficulty.js` — P2.3 ✅
Motor de dificuldade.
- níveis: `easy`, `medium`, `hard`;
- origem: `source`, `estimated`, `calibrated`;
- normalização compatível com valores antigos;
- estimador determinístico disponível para futuras importações;
- API em `window.MentorQuestionDifficulty`.

REGRA DE UX: o módulo **não exibe dificuldade durante a resolução**. Ele escuta `mentor:attempt-saved`, busca o nível da questão e insere o card somente depois da confirmação/salvamento do gabarito.

### `question-difficulty.css` — P2.3 ✅
Estilos exclusivos do card pós-resposta: FÁCIL / MÉDIA / DIFÍCIL + origem da classificação.

## Módulos planejados

### `question-feedback.js` — P4
Correção detalhada: correta + por que a alternativa escolhida está errada + análise opcional de todas as alternativas.

### `review-engine.js` — P6
Revisões adaptativas e vencimentos.

### `study-profile.js` — P6
Disponibilidade diária/semanal e teto de tempo.

### `schedule-engine.js` — P6
Distribuição de aulas/revisões dentro da capacidade diária.

### `mentor-engine.js` — P7
Motor de prioridade/explicabilidade da Mentora e futura integração segura com IA real.

### `qconcursos-links.js` — P8
Mapeamento tópico oficial → links/filtros do Qconcursos.

## Supabase — estrutura relevante

### `questions`
Questão canônica privada/pública.
Após P2.3, dificuldade usa:
- `difficulty` text: `easy | medium | hard`;
- `difficulty_origin` text: `source | estimated | calibrated`;
- `difficulty_updated_at` timestamptz.

Constraints impedem valores inválidos e exigem que dificuldade e origem existam juntas.
Índices existem para `difficulty` e `difficulty_origin`.

### `question_attempts`
Histórico imutável de respostas: alternativa marcada, acerto/erro, tempo, confiança, gabarito snapshot, data, matéria/tópico.

### `user_question_state`
Resumo por usuário+questão:
- `seen_count`
- `correct_count`
- `wrong_count`
- `last_seen_at`
- `next_review_at`
- `status`
- `last_selected_answer`
- `last_is_correct`
- `last_response_time_seconds`
- `last_confidence`
- `last_attempt_at`

### `subjects`, `topics`, `topic_components`, aliases
P1. Currículo oficial. Fontes externas não podem expandir esse currículo.

### `topic_mastery`
Domínio agregado por tópico.

## Validações concluídas

### P2.1
- 18 questões.
- 8 estados individuais.
- 8 tentativas.
- 0 estados órfãos.
- 0 estados duplicados.
- 0 contadores inconsistentes.
- 0 respondidas sem `last_attempt_at`.

### P2.2
- Integridade do Supabase preservada.
- Filtros e seleção automática isolados em arquivos próprios.
- GitHub Pages run 52: build e deploy `success`.

### P2.3
- Migração converteu o campo numérico legado de dificuldade para texto controlado.
- Constraint antiga 1–5 foi substituída por `easy/medium/hard`.
- `difficulty_origin` aceita somente `source/estimated/calibrated`.
- 0 pares inconsistentes entre dificuldade e origem.
- 18 questões atuais classificadas como **estimadas**, nunca como oficiais: 10 `easy`, 8 `medium`, 0 `hard` neste lote atual.
- A origem `estimated` fica visível no card pós-resposta como estimativa da plataforma.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + integração mínima `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js` + `question-filters.css` + integração mínima `bank-mode.js`.
- Dificuldade → `question-difficulty.js` + `question-difficulty.css` + schema `questions`; wiring estático em `index.html` e cache em `sw.js`.
- Correção/explicação → futuro `question-feedback.js`.
- Visual QG compartilhado → `qg-theme.css`.
- Edital/taxonomia → `edital-core.js` + tabelas da P1.
- Importação P3 → banco Supabase + fontes licenciadas; não publicar questões/PDFs no GitHub.
- Cronograma → `study-profile.js`, `schedule-engine.js`, `review-engine.js`.
- Mentora/IA → `mentor-engine.js` + backend/Edge Function com JWT; nunca chave secreta no frontend.
- Qconcursos → `qconcursos-links.js` / migração futura de presets.
- PWA/cache → `sw.js`.

## Próxima execução — P3.1 Português
Antes de importar:
1. ler este mapa;
2. confirmar que o deploy P2.3 está `completed/success`;
3. localizar o módulo licenciado de questões gerais;
4. trabalhar apenas Português;
5. extrair enunciado + alternativas + gabarito do próprio PDF;
6. mapear cada questão ao tópico oficial LP1–LP11 e subitem quando aplicável;
7. detectar duplicidades contra o banco atual;
8. atribuir dificuldade `estimated` quando a fonte não informar;
9. não importar questão quebrada/sem gabarito confiável;
10. ao final registrar encontradas, válidas, importadas, duplicadas e descartadas.
