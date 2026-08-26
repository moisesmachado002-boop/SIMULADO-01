# MAPA DO PROJETO — Mentor IA

> Documento operacional obrigatório. Antes de qualquer alteração, consultar este mapa e o **STATUS DO PROJETO**. Se uma mudança exigir arquivo não previsto aqui, atualizar este mapa primeiro.

## Fonte de verdade
- Currículo: **Edital Verticalizado PMBA Soldado 2026**.
- Supabase do Mentor IA: projeto `uysrtgyfnwyocdlaeyum`.
- Repositório público: `moisesmachado002-boop/SIMULADO-01`.
- Materiais/PDFs licenciados e banco privado de questões **não devem ser publicados no GitHub**.
- Não alterar o projeto/repositório Financeiro.

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões 🔄 em andamento
- P3 — Importação dos PDFs ⏳ pendente
- P4 — Correção Completa ⏳ pendente
- P5 — Modo QG ⏳ pendente
- P6 — Cronograma e Revisões ⏳ pendente
- P7 — Mentora Inteligente ⏳ pendente
- P8 — Qconcursos + Internet ⏳ pendente

**Última subparte concluída:** P1 — Edital e Taxonomia (v1.8)

**Próxima subparte:** P2.1 — estados individuais das questões

**Último commit de versão conhecido antes da P2:** `a7fd7a62d2f1cb0e7c7662bf8862aa6c0f6832ed`

**Último deploy confirmado antes da P2:** GitHub Pages run 45, success

**Problemas pendentes conhecidos:**
- `app.js` ainda contém lógica legada e deve ser evitado em novas funcionalidades.
- `cloud-sync.js` mantém versão interna antiga e carrega `bank-mode.js?v=1.5`; limpar somente em etapa própria, não durante P2.1.
- `index.html` possui metadados/cópias antigas; não alterar fora de uma etapa de limpeza específica.

## Arquivos atuais e responsabilidades

### `index.html`
Estrutura HTML base, views antigas, navegação inicial e carregamento dos assets principais.
- Alterar quando: estrutura HTML estática, metadados ou inclusão explícita de módulo exigir mudança.
- Não alterar para: regras de questão, revisão, taxonomia ou IA.

### `app.js`
Motor legado/local: estado antigo, dashboard, diagnóstico e funções herdadas.
- Dependências: `index.html`, módulos que ainda espelham progresso legado.
- Regra: **evitar novas funcionalidades aqui**. Só alterar quando uma etapa específica exigir retirar/migrar legado.

### `styles.css`
Estilos globais/base da interface.
- Não usar como depósito de estilos de funcionalidades novas; preferir CSS específico do módulo.

### `cloud-sync.js`
Autenticação Supabase, perfil em nuvem, sincronização do estado legado e carregamento do banco privado.
- Alterar quando: autenticação, sincronização de perfil ou carregamento modular central exigir.
- Não alterar para: regra interna de estados/filtros/dificuldade das questões, salvo necessidade de wiring documentada antes.

### `auth.css`
Estilos de autenticação e conta.

### `bank-mode.js`
Orquestrador atual do banco privado e sessão de questões: carrega edital/questões/estado, seleciona questão, renderiza, confirma gabarito, salva tentativa e `user_question_state`.
- Alterar somente para integração fina com módulos de questão até que seja totalmente modularizado.
- Não concentrar novas regras grandes aqui.

### `bank-mode.css`
Estilos da Central de Questões e componentes associados.

### `qg-theme.css`
Tema e mecânica visual herdada do QG dos Praças: alternativas, acerto/erro, botões, badges, timer.
- Alterar somente para comportamento/visual QG compartilhado.

### `edital-core.js`
P1 — núcleo do edital/taxonomia no frontend. Renderiza 12 matérias, 99 tópicos, subitens e métricas por tópico.
- Não alterar para estado individual, filtros ou dificuldade de questões.

### `edital-core.css`
Estilos exclusivos da aba Edital.

### `q-mode.js`
Modo legado/manual de registro de questões do Qconcursos.
- Futuramente será revisto na P8.
- Não alterar durante P2/P3 salvo integração indispensável previamente documentada.

### `q-mode.css`
Estilos do modo Qconcursos legado.

### `q-presets.js`
Atalhos/filtros Qconcursos existentes.
- Reservado para P8 ou migração para `qconcursos-links.js`.

### `q-presets.css`
Estilos dos presets Qconcursos.

### `sw.js`
Service Worker/PWA e lista de assets em cache.
- Alterar quando novo módulo frontend precisar funcionar corretamente na PWA ou quando a versão do cache mudar.
- Sempre testar GitHub Pages após alteração.

### `manifest.json`
Manifesto PWA.

### `icon.svg`
Ícone PWA.

### `README.md`
Documentação pública geral do repositório; não é o mapa operacional.

## Módulos planejados

### `question-state.js` — P2.1
Responsável por interpretar estado individual da questão e fornecer rótulo visual consistente: nova, respondida, acertada, errada, revisão, dominada.
- Fonte de dados: `user_question_state` e `question_attempts` no Supabase.
- Integração permitida na P2.1: `bank-mode.js` e `sw.js`.

### `question-filters.js` — P2.2
Filtros Novas / Erradas / Acertadas / Revisão / Dominadas / Todas e regras de elegibilidade da seleção.
- Integração esperada: `bank-mode.js`, CSS próprio, `sw.js`.

### `question-difficulty.js` — P2.3
Dificuldade easy/medium/hard, origem source/estimated/calibrated e revelação somente pós-gabarito.
- Não exibir dificuldade antes da resposta.

### `question-feedback.js` — P4
Correção detalhada: correta + alternativa errada marcada + análise opcional de todas as alternativas.

### `review-engine.js` — P6
Cálculo de revisões adaptativas e vencimento.

### `study-profile.js` — P6
Disponibilidade diária/semanal e limites de tempo.

### `schedule-engine.js` — P6
Distribuição de aulas/revisões dentro do teto diário e redistribuição de pendências.

### `mentor-engine.js` — P7
Motor de prioridade/explicabilidade da Mentora; futuramente integração segura com IA real via backend.

### `qconcursos-links.js` — P8
Mapeamento tópico oficial → filtros/links do Qconcursos.

## Supabase — tabelas relevantes

### `questions`
Questão canônica e conteúdo: fonte, prova, banca, ano, matéria/tópico, enunciado, alternativas, gabarito, explicação, dificuldade e metadados.

### `question_attempts`
Histórico imutável de cada resposta: alternativa marcada, acerto/erro, tempo, confiança, gabarito snapshot, data e tópico.

### `user_question_state`
Estado resumido por usuário+questão: quantidades, última visualização/resposta, próxima revisão e status.

### `subjects`, `topics`, `topic_components`, aliases
P1. Currículo oficial e taxonomia. Não expandir por fontes externas.

### `topic_mastery`
Domínio agregado por tópico.

## Matriz “quero mudar X → onde mexer”
- Estado individual/badge da questão → `question-state.js`; integração mínima em `bank-mode.js`; schema `user_question_state`.
- Filtros de questão → `question-filters.js`; integração mínima em `bank-mode.js`.
- Dificuldade → `question-difficulty.js`; schema `questions`; integração pós-resposta.
- Correção/explicações → `question-feedback.js`.
- Visual QG → `qg-theme.css`/CSS específico; não mexer no edital.
- Edital/tópicos → `edital-core.js` + Supabase da taxonomia; não mexer no banco de questões sem necessidade.
- Cronograma → `study-profile.js`, `schedule-engine.js`, `review-engine.js` + tabelas próprias.
- IA/Mentora → `mentor-engine.js` + Edge Function segura; nunca chave privada no frontend.
- Qconcursos → `qconcursos-links.js`/migração futura de `q-presets.js`.
- Cache/PWA → `sw.js` somente após saber quais assets mudaram.

## Regras de execução
1. Uma parte/subparte segura por execução.
2. Atualizar este mapa antes de tocar arquivo não previsto.
3. Preferir novo módulo separado a ampliar arquivos monolíticos.
4. Um commit claro por subparte sempre que possível.
5. Nunca inventar gabarito.
6. Nunca publicar material licenciado ou segredo.
7. Conferir Supabase, GitHub, mapa/status e Pages antes de marcar concluído.
8. Se Pages não estiver `completed/success`, não declarar versão concluída.
9. Se P1–P8 terminarem, parar e aguardar orientação.
