# MAPA DO PROJETO — Mentor IA

> Documento operacional obrigatório. Antes de qualquer alteração, consultar este mapa e o **STATUS DO PROJETO**. Se uma mudança exigir arquivo não previsto aqui, atualizar este mapa primeiro.

## Fonte de verdade e segurança
- Currículo: **Edital Verticalizado PMBA Soldado 2026**.
- Supabase Mentor IA: projeto `uysrtgyfnwyocdlaeyum`.
- GitHub público: `moisesmachado002-boop/SIMULADO-01`.
- PDFs licenciados e banco privado de questões nunca devem ser publicados no GitHub.
- Nunca expor service role, chaves privadas ou tokens.
- Não alterar o projeto/repositório Financeiro.
- Nunca inventar gabarito: em PDF, vale o gabarito do próprio material.

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões ✅ concluída
  - P2.1 — estados individuais ✅ concluída
  - P2.2 — filtros e integração visual ✅ concluída
  - P2.3 — dificuldade e origem ✅ concluída
- P3 — Importação dos PDFs 🔄 em andamento
  - P3.1 — Português 🔄 em andamento
    - P3.1a — Interpretação/Tipologia, lote 1 (questões 1–2) ✅ concluída
    - P3.1b — próximo lote de Português ⏳ pendente
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

**Última subparte concluída:** P3.1a — primeiro lote auditável de Português.

**Próxima subparte:** P3.1b — continuar Português, sem avançar para História antes de fechar P3.1.

**Fonte usada em P3.1:** `modulo questões gerais fcc (quad).pdf`, privado/licenciado.

**Último deploy confirmado antes da P3:** GitHub Pages run 58 — `completed/success` (P2.3).

## Resultado P3.1a
- Recorte: seção **Interpretação e Tipologia Textual**.
- Questões examinadas neste lote: 2.
- Válidas: 2.
- Importadas: 2.
- Duplicadas encontradas antes da inserção: 0.
- Descartadas: 0.
- Com gabarito do PDF: 2.
- Sem gabarito confiável: 0.
- Alternativas completas: 2/2, com 5 alternativas cada.
- Vinculadas ao edital: 2/2.
- Questão INT-1 → LP2 `Tipologia textual e gêneros textuais`, gabarito B, dificuldade `easy/estimated`.
- Questão INT-2 → LP1 `Compreensão e interpretação de textos`, gabarito C, dificuldade `medium/estimated`.
- Banco após o lote: 20 questões totais, todas privadas; documento-fonte com 20 questões registradas.
- O PDF não foi enviado nem copiado para o GitHub.

## Arquivos atuais e responsabilidades

### `MAPA-DO-PROJETO.md`
Status persistente, arquitetura, dependências e matriz de alteração. Atualizar ao final de cada subparte.

### `index.html`
Estrutura HTML base e carregamento estático de assets. Não guardar regras de negócio aqui.

### `app.js`
Motor legado/local de dashboard e diagnóstico. **Evitar novas funcionalidades**; alterar apenas em etapa específica de migração/limpeza.

### `styles.css`
Estilos globais/base. Módulos novos devem preferir CSS próprio.

### `cloud-sync.js`
Autenticação Supabase, perfil e sincronização do estado legado. Não usar para regras de questão/revisão.

### `auth.css`
Estilos de autenticação.

### `bank-mode.js`
Orquestrador da Central de Questões: carrega currículo, questões e estado; integra módulos; renderiza e salva tentativas. Alterar somente para wiring fino.

### `bank-mode.css`
Estilos base da Central de Questões.

### `qg-theme.css`
Tema QG compartilhado: alternativas, eliminação, acerto/erro, botões, timer e badges.

### `edital-core.js`
P1 — núcleo do edital/taxonomia: 12 matérias, 99 tópicos oficiais e subitens. Não ampliar currículo a partir de PDFs/internet.

### `edital-core.css`
Estilos da aba Edital.

### `q-mode.js` / `q-mode.css`
Modo legado/manual do Qconcursos. Reservar mudanças maiores para P8.

### `q-presets.js` / `q-presets.css`
Atalhos atuais do Qconcursos. Reservar para P8/migração futura.

### `sw.js`
Service Worker/PWA e cache dos assets. Alterar apenas quando assets frontend mudarem.

### `manifest.json` / `icon.svg`
Manifesto e ícone PWA.

### `README.md`
Documentação pública geral; não substitui este mapa.

## Módulos concluídos

### `question-state.js` — P2.1 ✅
Classifica `new`, `answered`, `correct`, `wrong`, `review`, `mastered`, considerando `next_review_at`.

### `question-filters.js` + `question-filters.css` — P2.2 ✅
Filtros Automático/Novas/Erradas/Acertadas/Revisão/Dominadas/Todas. Automático prioriza inéditas, depois revisões, depois aprendizado; dominadas ficam fora da rotação normal.

### `question-difficulty.js` + `question-difficulty.css` — P2.3 ✅
Dificuldade `easy|medium|hard` e origem `source|estimated|calibrated`. O nível só aparece após confirmação do gabarito.

## Módulos planejados
- `question-feedback.js` — P4: correta, motivo da correta, motivo específico da alternativa errada e análise de todas.
- `review-engine.js` — P6: revisões adaptativas.
- `study-profile.js` — P6: disponibilidade e teto diário.
- `schedule-engine.js` — P6: distribuição de aulas/revisões.
- `mentor-engine.js` — P7: prioridades e explicabilidade da Mentora; IA real somente por backend seguro.
- `qconcursos-links.js` — P8: tópico oficial → filtros/links Qconcursos.

## Supabase — estrutura relevante

### `questions`
Questão canônica privada/pública. Guarda fonte, prova, banca, ano, matéria/tópico, número/página, enunciado, alternativas, gabarito, explicação e dificuldade.
- P3: conteúdo licenciado fica aqui, privado.
- `difficulty`: `easy|medium|hard`.
- `difficulty_origin`: `source|estimated|calibrated`.

### `source_documents`
Registro do material de origem, licença, status e contagem importada. O módulo de questões gerais está registrado como `personal_module`, licença `private` e permanece `processing` enquanto P3.1/P3 estiver em andamento.

### `question_attempts`
Histórico imutável de cada resposta.

### `user_question_state`
Resumo por usuário+questão: `seen_count`, `correct_count`, `wrong_count`, última resposta, tempo, confiança, `next_review_at` e status.

### `subjects`, `topics`, `topic_components`, aliases
Currículo oficial da P1. Fontes externas não podem expandi-lo.

### `topic_mastery`
Domínio agregado por tópico.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + integração mínima em `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js`/CSS + integração mínima em `bank-mode.js`.
- Dificuldade → `question-difficulty.js`/CSS + `questions`.
- Importação P3 → `questions`, `source_documents`, taxonomia existente e fonte licenciada; **não publicar questões/PDF no GitHub**.
- Correção → futuro `question-feedback.js`.
- Edital/taxonomia → `edital-core.js` + tabelas da P1.
- Cronograma → `study-profile.js`, `schedule-engine.js`, `review-engine.js`.
- Mentora/IA → `mentor-engine.js` + backend/Edge Function com JWT.
- Qconcursos → `qconcursos-links.js`.
- Cache/PWA → `sw.js` apenas quando assets mudarem.

## Protocolo de importação P3
Para cada lote:
1. localizar trecho e gabarito no PDF licenciado;
2. trabalhar somente a matéria/subparte atual;
3. extrair enunciado e alternativas completas;
4. confirmar gabarito no próprio material;
5. mapear a tópico oficial e subitem quando aplicável;
6. consultar o banco por duplicidade antes de inserir;
7. usar dificuldade `estimated` quando a fonte não informar;
8. descartar questão quebrada, ilegível ou sem gabarito confiável;
9. manter conteúdo privado no Supabase;
10. atualizar contagem do documento-fonte, validar integridade e registrar o lote neste mapa.

## Regras de execução
1. Uma parte/subparte segura por execução.
2. Atualizar este mapa antes de tocar arquivo não previsto.
3. Preferir módulo separado a ampliar arquivos monolíticos.
4. Um commit claro por subparte sempre que possível.
5. Nunca inventar gabarito.
6. Nunca publicar material licenciado ou segredo.
7. Conferir Supabase, GitHub, mapa/status e Pages antes de marcar concluído.
8. Se Pages não estiver `completed/success`, não declarar a etapa concluída.
9. Se P1–P8 terminarem, parar e aguardar orientação.
