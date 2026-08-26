# MAPA DO PROJETO — Mentor IA

> Documento operacional obrigatório. Consultar antes de qualquer alteração.

## Fonte de verdade e segurança
- Currículo: **Edital Verticalizado PMBA Soldado 2026**.
- Supabase Mentor IA: `uysrtgyfnwyocdlaeyum`.
- GitHub público: `moisesmachado002-boop/SIMULADO-01`.
- Conteúdo licenciado dos PDFs permanece privado no Supabase.
- Nunca expor service role, chaves privadas, tokens ou PDFs licenciados.
- Nunca alterar o projeto Financeiro.
- Gabarito do material é a fonte de verdade; IA nunca substitui silenciosamente o gabarito.

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões ✅ concluída
  - P2.1 — estados individuais ✅
  - P2.2 — filtros e integração visual ✅
  - P2.3 — dificuldade pós-resposta e origem ✅
- P3 — Importação dos PDFs ✅ **reescopada/encerrada como carga em massa**
  - O usuário decidiu não importar todo o acervo antecipadamente.
  - Novas questões serão adicionadas **sob demanda, conforme a necessidade diária**.
  - Banco atual preservado: **98 questões**, todas de Língua Portuguesa no momento da mudança de estratégia.
  - A P3 não bloqueia mais o avanço do produto.
- P4 — Correção Completa 🔄 em andamento
  - P4.1 — estrutura de correção por alternativa + UI pós-resposta ✅
  - P4.2 — enriquecer/validar explicações específicas por alternativa conforme as questões forem usadas ⏳
- P5 — Modo QG ⏳
- P6 — Cronograma e Revisões ⏳
- P7 — Mentora Inteligente ⏳
- P8 — Qconcursos + Internet ⏳

**Última subparte concluída:** P4.1 — motor modular de correção pós-resposta.

**Próxima subparte:** P4.2 — completar o fluxo de explicações específicas por alternativa sem inventar justificativas ausentes.

## Decisão permanente sobre o banco de questões
- Não tentar mais abastecer todas as matérias de uma vez.
- Quando o usuário precisar estudar uma matéria/tópico e o estoque estiver baixo, buscar/importar apenas o necessário naquele momento.
- Prioridade de fonte continua: PDFs privados → banco próprio → Qconcursos → internet.
- Toda questão nova deve continuar vinculada ao edital oficial, deduplicada e com gabarito confiável.

## P4 — regra de correção
Ao responder uma questão, a interface deve:
1. informar se acertou ou errou;
2. mostrar a alternativa marcada;
3. mostrar o gabarito registrado;
4. explicar por que a correta está correta;
5. se houver erro, explicar especificamente a alternativa marcada quando essa análise estiver cadastrada;
6. oferecer **ANALISAR TODAS AS ALTERNATIVAS**;
7. nunca inventar uma justificativa faltante — mostrar que a análise específica ainda não foi cadastrada;
8. mostrar divergências/observações de gabarito separadamente, sem trocar o gabarito oficial.

## Arquivos e responsabilidades
- `MAPA-DO-PROJETO.md`: status, arquitetura e decisões operacionais.
- `index.html`: estrutura HTML base.
- `app.js`: motor legado/local; evitar novas regras de negócio.
- `styles.css`: estilos globais.
- `cloud-sync.js`: autenticação Supabase e sincronização.
- `bank-mode.js`: orquestrador da Central de Questões; manter wiring fino.
- `bank-mode.css`: estilos base da Central.
- `qg-theme.css`: tema QG compartilhado.
- `edital-core.js` / `edital-core.css`: currículo/taxonomia oficial.
- `question-state.js`: estados `new|answered|correct|wrong|review|mastered`.
- `question-filters.js` / `question-filters.css`: filtros e rotação por estado.
- `question-difficulty.js` / `question-difficulty.css`: dificuldade `easy|medium|hard`, origem e revelação pós-resposta.
- `question-feedback.js` / `question-feedback.css`: **P4**, correção estruturada, explicação da correta, explicação da alternativa marcada e análise A–E.
- `q-mode.js` / `q-mode.css`: modo legado/manual do Qconcursos; mudanças maiores na P8.
- `q-presets.js` / `q-presets.css`: atalhos Qconcursos; reservar para P8.
- `sw.js`: cache PWA.
- `manifest.json` / `icon.svg`: PWA.

## Supabase — estrutura relevante
- `questions`: questão canônica privada, gabarito e explicações.
  - P4.1 adicionou `option_explanations jsonb`, `explanation_status` e `answer_key_note`.
- `question_attempts`: histórico imutável de respostas.
- `user_question_state`: resumo por usuário+questão.
- `subjects`, `topics`, `topic_components` e aliases: currículo oficial.
- `topic_mastery`: domínio agregado por tópico.
- `source_documents`: origem/licença e contagem do acervo; módulo geral reconciliado para 98 questões.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + wiring mínimo `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js`/CSS + wiring mínimo `bank-mode.js`.
- Dificuldade → `question-difficulty.js`/CSS + `questions`.
- Correção → `question-feedback.js`/CSS + campos P4 em `questions`.
- Importar questão sob demanda → `questions`, `source_documents`, taxonomia P1 e fonte privada.
- Edital/taxonomia → `edital-core.js` + tabelas P1.
- Cronograma → futuros `study-profile.js`, `schedule-engine.js`, `review-engine.js`.
- Mentora/IA → futuro `mentor-engine.js` + backend seguro.
- Qconcursos → futuro `qconcursos-links.js`.
- Cache/PWA → `sw.js` quando assets frontend mudarem.

## Regras de execução
1. Trabalhar uma subparte segura por vez.
2. Preferir módulos separados a ampliar monólitos.
3. Nunca inventar gabarito, fonte ou metadado.
4. Nunca publicar material licenciado ou segredo.
5. Antes de marcar subparte concluída: validar Supabase, arquivos, mapa e GitHub Pages.
6. Só considerar deploy concluído com `status=completed` e `conclusion=success`.
7. Se P1–P8 terminarem, parar e aguardar orientação.
