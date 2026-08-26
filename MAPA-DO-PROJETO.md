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
  - P2.1 — estados individuais ✅
  - P2.2 — filtros e integração visual ✅
  - P2.3 — dificuldade e origem ✅
- P3 — Importação dos PDFs 🔄 em andamento
  - P3.1 — Português 🔄 em andamento
    - P3.1a — Interpretação/Tipologia, lote 1 (questões 1–2) ✅
    - P3.1b — Sintaxe, lote seguro (questão 16) ✅
    - P3.1c — próximo lote de Português ⏳
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

**Última subparte concluída:** P3.1b — lote seguro de Português, questão INT-16.

**Próxima subparte:** P3.1c — continuar Português, sem avançar para História antes de fechar P3.1.

**Fonte usada em P3.1:** `modulo questões gerais fcc (quad).pdf`, privado/licenciado.

## Resultados da P3.1
### P3.1a
- Questões examinadas: 2; válidas/importadas: 2; duplicadas: 0; descartadas: 0.
- INT-1 → LP2 `Tipologia textual e gêneros textuais`, gabarito B, `easy/estimated`.
- INT-2 → LP1 `Compreensão e interpretação de textos`, gabarito C, `medium/estimated`.

### P3.1b
- Recorte seguro: questão 16 da seção de Português localizada no módulo.
- Encontradas/examinadas neste lote: 1.
- Válidas/importadas: 1.
- Duplicadas antes da inserção: 0.
- Descartadas: 0.
- Com gabarito do PDF: 1; sem gabarito confiável: 0.
- Alternativas completas: 5/5.
- Vinculada ao edital: INT-16 → LP7 `Sintaxe da oração e do período`.
- Gabarito preservado do PDF: E.
- Dificuldade: `medium/estimated`; a fonte não informa nível oficial.
- `source_page` ficou nulo porque o recorte recuperado não permitiu confirmar com segurança o número da página; não foi inventado.
- Banco após o lote: 21 questões totais, todas privadas; documento-fonte com 21 questões registradas.
- O PDF não foi enviado nem copiado para o GitHub.

## Arquivos atuais e responsabilidades
- `MAPA-DO-PROJETO.md`: status persistente, arquitetura e matriz de alteração.
- `index.html`: estrutura HTML base e carregamento estático; sem regras de negócio.
- `app.js`: motor legado/local; evitar novas funcionalidades.
- `styles.css`: estilos globais/base.
- `cloud-sync.js`: autenticação Supabase, perfil e sincronização legada.
- `auth.css`: estilos de autenticação.
- `bank-mode.js`: orquestrador da Central de Questões; wiring fino apenas.
- `bank-mode.css`: estilos base da Central.
- `qg-theme.css`: tema QG compartilhado.
- `edital-core.js` / `edital-core.css`: P1, currículo/taxonomia oficial e UI do edital; não ampliar via fontes externas.
- `q-mode.js` / `q-mode.css`: modo legado/manual do Qconcursos; mudanças maiores só na P8.
- `q-presets.js` / `q-presets.css`: atalhos Qconcursos; reservar para P8.
- `sw.js`: Service Worker/PWA; alterar apenas quando assets frontend mudarem.
- `manifest.json` / `icon.svg`: manifesto e ícone PWA.
- `README.md`: documentação pública geral.

## Módulos concluídos
- `question-state.js` — P2.1: `new|answered|correct|wrong|review|mastered`.
- `question-filters.js` + CSS — P2.2: Automático/Novas/Erradas/Acertadas/Revisão/Dominadas/Todas.
- `question-difficulty.js` + CSS — P2.3: `easy|medium|hard`, origem `source|estimated|calibrated`, revelação só após gabarito.

## Módulos planejados
- `question-feedback.js` — P4.
- `review-engine.js`, `study-profile.js`, `schedule-engine.js` — P6.
- `mentor-engine.js` — P7; IA real somente por backend seguro.
- `qconcursos-links.js` — P8.

## Supabase — estrutura relevante
- `questions`: questão canônica; P3 guarda conteúdo licenciado privado, dificuldade e origem.
- `source_documents`: material de origem/licença/status/contagem.
- `question_attempts`: histórico imutável das respostas.
- `user_question_state`: resumo por usuário+questão, contadores, última resposta, tempo, confiança, revisão e status.
- `subjects`, `topics`, `topic_components` e aliases: currículo oficial P1; fontes externas não ampliam.
- `topic_mastery`: domínio agregado por tópico.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + wiring mínimo `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js`/CSS + wiring mínimo `bank-mode.js`.
- Dificuldade → `question-difficulty.js`/CSS + `questions`.
- Importação P3 → `questions`, `source_documents`, taxonomia P1 e fonte licenciada; não publicar questões/PDF no GitHub.
- Correção → futuro `question-feedback.js`.
- Edital/taxonomia → `edital-core.js` + tabelas P1.
- Cronograma → `study-profile.js`, `schedule-engine.js`, `review-engine.js`.
- Mentora/IA → `mentor-engine.js` + backend/Edge Function com JWT.
- Qconcursos → `qconcursos-links.js`.
- Cache/PWA → `sw.js` apenas se assets mudarem.

## Protocolo de importação P3
1. localizar trecho e gabarito no PDF licenciado;
2. trabalhar somente a matéria/subparte atual;
3. extrair enunciado e alternativas completas;
4. confirmar gabarito no próprio material;
5. mapear a tópico oficial/subitem quando aplicável;
6. consultar duplicidade antes de inserir;
7. usar `estimated` se a fonte não informar dificuldade;
8. descartar questão quebrada, ilegível ou sem gabarito confiável;
9. manter conteúdo privado no Supabase;
10. atualizar contagem, validar integridade e registrar o lote neste mapa.

## Regras de execução
1. Uma parte/subparte segura por execução.
2. Atualizar este mapa antes de tocar arquivo não previsto.
3. Preferir módulo separado a ampliar monólitos.
4. Um commit claro por subparte sempre que possível.
5. Nunca inventar gabarito ou página de origem.
6. Nunca publicar material licenciado ou segredo.
7. Conferir Supabase, GitHub, mapa/status e Pages antes de marcar concluído.
8. Se Pages não estiver `completed/success`, não declarar concluído.
9. Se P1–P8 terminarem, parar e aguardar orientação.
