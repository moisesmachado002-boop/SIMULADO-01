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

## REGRA DE EXECUÇÃO — ETAPAS COMPLETAS
A partir de 26/08/2026, a unidade de trabalho do projeto é a **etapa P completa**.

- Não usar mais P4.1, P4.2, P5.1 etc. como pontos de parada ou autorização.
- Pode haver organização técnica interna em vários arquivos/migrações, mas o usuário recebe e aprova apenas **P1, P2, P3, P4, P5, P6, P7 e P8**.
- Ao iniciar uma etapa, executar tudo que pertence àquela P antes de parar, salvo erro real, bloqueio de segurança ou necessidade inevitável de informação do usuário.
- Uma P só recebe ✅ quando banco, frontend, integrações necessárias e deploy estiverem validados.
- Não declarar uma P concluída apenas porque uma parte interna dela foi implementada.

## STATUS DO PROJETO
- **P1 — Edital e Taxonomia ✅ concluída**
- **P2 — Estrutura das Questões ✅ concluída**
- **P3 — Banco de Questões ✅ concluída no novo escopo**
  - Carga em massa foi abandonada por decisão do usuário.
  - Novas questões serão adicionadas sob demanda, conforme a necessidade diária.
  - Banco preservado com 98 questões no momento da mudança de estratégia.
  - O abastecimento futuro não bloqueia o avanço do produto.
- **P4 — Correção Completa 🔄 em andamento**
  - Parte da infraestrutura já foi criada (`question-feedback.js`, `question-feedback.css` e campos de explicação no Supabase), mas P4 só será marcada concluída quando todo o fluxo de correção previsto estiver fechado e validado.
- **P5 — Modo QG ⏳**
- **P6 — Cronograma e Revisões ⏳**
- **P7 — Mentora Inteligente ⏳**
- **P8 — Qconcursos + Internet ⏳**

**Etapa ativa:** P4 — Correção Completa.

**Próxima parada permitida:** somente após concluir e validar a P4 inteira, salvo erro real/bloqueio.

## Decisão permanente sobre o banco de questões
- Não tentar abastecer todas as matérias antecipadamente.
- Quando o usuário precisar estudar uma matéria/tópico e o estoque estiver baixo, buscar/importar apenas o necessário naquele momento.
- Prioridade de fonte: PDFs privados → banco próprio → Qconcursos → internet.
- Toda questão nova deve continuar vinculada ao edital oficial, deduplicada e com gabarito confiável.

## P4 — Correção Completa
A P4 inteira deve entregar, no fluxo pós-resposta:
1. informar claramente se acertou ou errou;
2. mostrar a alternativa marcada;
3. mostrar o gabarito registrado como fonte de verdade;
4. explicar por que a alternativa correta está correta;
5. quando houver erro, explicar especificamente por que a alternativa marcada está errada;
6. oferecer análise de todas as alternativas A–E;
7. nunca inventar justificativa ausente;
8. distinguir explicação geral, explicação por alternativa e observação/divergência de gabarito;
9. manter dificuldade oculta antes da resposta e revelá-la apenas depois;
10. preservar salvamento da tentativa, estado da questão, confiança e tempo;
11. funcionar de forma coerente nas questões antigas e nas novas questões adicionadas sob demanda;
12. validar Supabase, frontend, cache/PWA e GitHub Pages antes de marcar P4 ✅.

## P5 — Modo QG
Quando iniciada, deve ser concluída inteira antes de parar. Escopo: experiência de resolução, selecionar/eliminar/confirmar, timer, confiança, feedback, avançar, estados visuais e caderno de erros, sem quebrar P1–P4.

## P6 — Cronograma e Revisões
Quando iniciada, deve ser concluída inteira antes de parar. Escopo: perfil de estudo, capacidade diária, revisões adaptativas, dívida/rebalanceamento, ciclo flexível, missão diária e projeção semanal.

## P7 — Mentora Inteligente
Quando iniciada, deve ser concluída inteira antes de parar. Escopo: sinais de desempenho, diagnóstico, pré-requisitos, recomendações e IA real somente por backend seguro.

## P8 — Qconcursos + Internet
Quando iniciada, deve ser concluída inteira antes de parar. Escopo: links/filtros Qconcursos, prioridade de fontes, abastecimento sob demanda e integração segura sem scraping não autorizado.

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
- `question-feedback.js` / `question-feedback.css`: P4, correção estruturada por alternativa.
- `q-mode.js` / `q-mode.css`: modo legado/manual do Qconcursos; mudanças maiores na P8.
- `q-presets.js` / `q-presets.css`: atalhos Qconcursos; reservar para P8.
- `sw.js`: cache PWA.
- `manifest.json` / `icon.svg`: PWA.

## Supabase — estrutura relevante
- `questions`: questão canônica privada, gabarito e explicações; contém `option_explanations`, `explanation_status` e `answer_key_note`.
- `question_attempts`: histórico imutável de respostas.
- `user_question_state`: resumo por usuário+questão.
- `subjects`, `topics`, `topic_components` e aliases: currículo oficial.
- `topic_mastery`: domínio agregado por tópico.
- `source_documents`: origem/licença e contagem do acervo.

## Regras gerais
1. Executar uma **P inteira** por ciclo de trabalho, não subpartes como unidades de parada.
2. Preferir módulos separados a ampliar monólitos.
3. Nunca inventar gabarito, fonte ou metadado.
4. Nunca publicar material licenciado ou segredo.
5. Antes de marcar uma P concluída: validar Supabase, arquivos, mapa/status e GitHub Pages.
6. Só considerar deploy concluído com `status=completed` e `conclusion=success`.
7. Ao concluir uma P, a próxima execução começa diretamente na próxima P.
8. Ao concluir P8, parar e aguardar orientação.
