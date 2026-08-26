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

## REGRA DE EXECUÇÃO POR ETAPA
- O projeto avança somente por etapas inteiras: **P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8**.
- Não usar numeração operacional `.1`, `.2`, `.3` no status do projeto.
- Pode haver alterações técnicas internas em vários arquivos ou tabelas durante uma P, mas a etapa só termina quando o conjunto inteiro estiver implementado, validado e publicado.
- Ao concluir uma P, atualizar este mapa e apontar apenas a próxima P.

## REGRA DE CONFIRMAÇÃO DO USUÁRIO
- Um primeiro `C` pede a apresentação da próxima etapa e do que será feito.
- Um segundo `C` confirma a execução da etapa inteira.
- Não iniciar uma nova P apenas com o primeiro `C`.

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões ✅ concluída
- P3 — Banco de Questões ✅ concluída no modelo **sob demanda**
- P4 — Correção Completa ✅ concluída
- P5 — Modo QG ✅ concluída
- P6 — Cronograma e Revisões ✅ concluída
- P7 — Mentora Inteligente ⏳ próxima etapa
- P8 — Qconcursos + Internet ⏳

**Última etapa concluída:** P6 — Cronograma e Revisões.

**Próxima etapa:** P7 — Mentora Inteligente.

## P3 — decisão permanente sobre o banco de questões
- Não tentar abastecer todas as matérias antecipadamente.
- Novas questões entram conforme a necessidade diária do usuário.
- Prioridade de fonte: PDFs privados → banco próprio → Qconcursos → internet.
- Toda questão nova deve estar vinculada ao edital oficial, deduplicada e com gabarito confiável.
- Banco preservado no fechamento da estratégia: **98 questões**.
- Questões ainda sem correção completa podem permanecer armazenadas, mas não entram no treino enquanto `explanation` estiver nulo.

## P4 — Correção Completa
A P4 está fechada com o seguinte contrato funcional:
1. ao confirmar uma resposta, mostrar imediatamente se acertou ou errou;
2. mostrar a alternativa marcada pelo usuário;
3. mostrar o gabarito registrado no material;
4. explicar especificamente por que a alternativa correta está correta;
5. quando houver erro, explicar especificamente por que a alternativa marcada está errada;
6. oferecer **ANALISAR TODAS AS ALTERNATIVAS** com análise A–E (ou todas as alternativas realmente existentes);
7. mostrar observação de divergência de gabarito separadamente em `answer_key_note`, sem alterar silenciosamente o gabarito oficial;
8. a correção completa aparece ao revelar o gabarito e não depende do sucesso do salvamento da tentativa na nuvem;
9. dificuldade continua oculta durante a resolução e aparece somente após a resposta;
10. a plataforma não inventa justificativa para alternativa sem análise cadastrada.

### Estado validado da P4
- `questions` possui `option_explanations jsonb`, `explanation_status` e `answer_key_note`.
- **29 questões** atualmente elegíveis no treino possuem `explanation_status='per_option'`.
- Essas 29 possuem análise para todas as alternativas existentes: **0 análises de opção faltando**.
- **0 questões visíveis** estão com correção incompleta.
- **0 gabaritos** apontam para alternativa inexistente.
- **69 questões** permanecem aguardando abastecimento/correção conforme a necessidade diária e ficam fora da rotação atual porque `explanation` está nulo.
- O banco possui o contrato `questions_p4_ready_visibility_check`: uma questão só pode ter `explanation` não nulo se estiver `per_option` e tiver explicação para todas as alternativas.

## P5 — Modo QG
A P5 está fechada com o seguinte contrato funcional:
1. a Central de Questões passa a exibir **Modo QG DOS PRAÇAS** como operação principal do banco próprio;
2. existem quatro entradas operacionais separadas: **Operação Automática**, **Só Questões Novas**, **Caderno Pendente** e **Fila de Revisão**;
3. o modo automático escolhe primeiro questões nunca respondidas e, depois, somente revisões cujo `next_review_at` já venceu;
4. questão respondida não volta automaticamente antes da data de revisão; se não houver nova nem revisão vencida, a operação automática termina;
5. questão cujo último resultado foi erro aparece visualmente como **ERRADA** até a revisão vencer, em vez de ser mascarada imediatamente como revisão;
6. o **Caderno de Erros** é automático e persistente a partir de `wrong_count > 0`; um erro não desaparece do histórico quando a questão é recuperada;
7. o caderno distingue **ERRO PENDENTE**, **REVISÃO VENCIDA** e **RECUPERADA**;
8. questão recuperada pode ser recolocada manualmente na revisão pelo botão **REVISAR DE NOVO**;
9. o painel QG mostra contadores separados de novas, revisões vencidas, questões no caderno e precisão acumulada;
10. o Modo QG reaproveita os filtros e o histórico persistente do Supabase; não cria um segundo estado paralelo;
11. a correção completa da P4 continua sendo o feedback obrigatório após responder;
12. dificuldade continua oculta durante a resolução e só aparece após o gabarito.

### Estado validado da P5 no fechamento
Snapshot de validação no momento da implementação:
- questões elegíveis no treino: **29**;
- questões novas: **20**;
- revisões vencidas naquele momento: **0**;
- questões que já haviam sido erradas e estavam no caderno: **7**;
- erros ainda pendentes: **7**.

Esses números são apenas snapshot de validação e mudam naturalmente conforme o usuário responde.

## P6 — Cronograma e Revisões
A P6 está fechada com o seguinte contrato funcional:
1. o usuário configura **minutos por dia** e os **dias da semana em que estuda**;
2. o cronograma funciona como **ciclo flexível**, sem prender matérias a dias fixos da semana;
3. cada dia possui limite duro de minutos; nenhuma redistribuição pode ultrapassar esse teto;
4. existe buffer configurável; dívida alta de revisão pode usar o buffer, mas nunca ultrapassar o limite duro;
5. revisões e estudo novo disputam a mesma capacidade diária, evitando empilhamento artificial;
6. a base de revisão é **1 dia → 7 dias → 30 dias**, com manutenção limitada a no máximo 45 dias;
7. erro com confiança alta volta em cerca de **6 horas**; erro médio em **12 horas** e erro de baixa confiança em até **24 horas**; erro recorrente ganha prioridade adicional;
8. acerto frágil encurta o intervalo; acerto rápido com alta confiança pode alongá-lo moderadamente;
9. uma revisão vencida há vários dias recebe proteção de prioridade para não ser adiada indefinidamente;
10. atividades perdidas ou deslocadas retornam à fila com `displaced_from` e são redistribuídas dentro da capacidade dos próximos dias;
11. os botões **HOJE ESTOU SEM TEMPO**, **QUERO ESTUDAR MAIS HOJE**, **FOLGAR HOJE** e **NORMALIZAR HOJE** recalculam a semana sem criar avalanche;
12. o painel inicial substitui a missão legada por **Missão de hoje + projeção de 7 dias**;
13. o progresso das tarefas é persistido em `study_plan_items.progress_count`, `status` e `completed_at`;
14. responder uma questão atualiza automaticamente o progresso da missão e agenda a próxima revisão;
15. depois de tentativa, mudança de revisão, alteração de tempo ou mudança dos dias de estudo, a projeção de 7 dias é recalculada;
16. tarefas de questões novas priorizam tópicos oficiais com menor domínio/menor evidência e rotacionam pelo ciclo em vez de fixar um dia da semana;
17. a P6 usa o mesmo `user_question_state` da P5 e não cria um estado paralelo de questão.

### Estado validado da P6 no fechamento
- `study_preferences`: **1 perfil** existente e protegido por RLS.
- `reviews`: **9 revisões pendentes** sincronizadas com o histórico atual.
- `user_question_state`: **9 estados com próxima revisão** e **0 questões respondidas sem intervalo P6**.
- intervalos acima do teto de 45 dias: **0**.
- itens de plano com duração inválida: **0**.
- histórico anterior foi normalizado para a regra P6: erros médios atuais em 12h, erro de baixa confiança em 24h, primeiro acerto em 24h e acerto forte em 30h.

## Arquivos e responsabilidades
- `MAPA-DO-PROJETO.md`: status, arquitetura e decisões operacionais.
- `index.html`: estrutura HTML base e carregamento dos módulos legados + `runtime-bootstrap.js`.
- `app.js`: motor legado/local; evitar novas regras de negócio.
- `styles.css`: estilos globais.
- `runtime-bootstrap.js`: inicialização modular segura do Supabase/cloud e das camadas P5/P6.
- `cloud-sync.js`: autenticação Supabase e sincronização; carrega a Central privada.
- `bank-mode.js`: orquestrador da Central de Questões; manter wiring fino.
- `bank-mode.css`: estilos base da Central.
- `qg-theme.css`: tema QG compartilhado.
- `qg-mode.js` / `qg-mode.css`: P5, painel operacional, caderno de erros e entradas de treino.
- `review-engine.js`: P6, intervalos adaptativos e sincronização `user_question_state` ↔ `reviews`.
- `schedule-engine.js`: P6, capacidade diária, dívida, ciclo flexível, projeção de 7 dias e progresso persistente.
- `study-profile.js`: P6, missão de hoje, configuração de tempo/dias, overrides e projeção semanal.
- `edital-core.js` / `edital-core.css`: currículo/taxonomia oficial.
- `question-state.js`: estados `new|answered|correct|wrong|review|mastered`.
- `question-filters.js` / `question-filters.css`: filtros e rotação; automático = novas → revisões vencidas.
- `question-difficulty.js` / `question-difficulty.css`: dificuldade `easy|medium|hard`, origem e revelação pós-resposta.
- `question-feedback.js` / `question-feedback.css`: P4, correção estruturada completa e análise por alternativa.
- `q-mode.js` / `q-mode.css`: modo legado/manual do Qconcursos; será tratado na P8.
- `q-presets.js` / `q-presets.css`: atalhos Qconcursos; será tratado na P8.
- `sw.js`: cache PWA.
- `manifest.json` / `icon.svg`: PWA.

## Supabase — estrutura relevante
- `questions`: questão canônica privada, gabarito e explicações P4.
- `question_attempts`: histórico imutável de respostas.
- `user_question_state`: resumo por usuário+questão; fonte do Caderno QG e da próxima revisão adaptativa P6.
- `reviews`: fila persistente de revisões por questão/tópico, com estágio, intervalo e motivo.
- `study_preferences`: limite diário, dias de estudo, buffer e proporção inicial de revisões.
- `study_day_overrides`: ajustes de capacidade por data (`normal|low_time|extra|rest`).
- `study_plan_items`: missão diária/projeção, duração, prioridade, origem, deslocamento e progresso.
- `study_sessions`: sessões de estudo registráveis.
- `subjects`, `topics`, `topic_components` e aliases: currículo oficial.
- `topic_mastery`: domínio agregado por tópico e próxima revisão.
- `source_documents`: origem/licença e contagem do acervo.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + wiring mínimo `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js`/CSS + wiring mínimo `bank-mode.js`.
- Modo QG/caderno → `qg-mode.js`/CSS + `user_question_state`.
- Dificuldade → `question-difficulty.js`/CSS + `questions`.
- Correção → `question-feedback.js`/CSS + campos P4 em `questions`.
- Revisões adaptativas → `review-engine.js` + `reviews` + campos P6 de `user_question_state`.
- Cronograma/capacidade/projeção → `schedule-engine.js` + `study_preferences` + `study_day_overrides` + `study_plan_items`.
- Painel/tempo/dias/atalhos do dia → `study-profile.js`.
- Importar questão sob demanda → `questions`, `source_documents`, taxonomia P1 e fonte privada; a questão só entra no treino com correção P4 completa.
- Edital/taxonomia → `edital-core.js` + tabelas P1.
- Mentora/IA → futuro `mentor-engine.js` + backend seguro na P7.
- Qconcursos → futuro `qconcursos-links.js` na P8.
- Cache/PWA → `sw.js` quando assets frontend mudarem.

## Regras permanentes
1. Concluir uma P inteira antes de avançar para a próxima.
2. Preferir módulos separados a ampliar monólitos.
3. Nunca inventar gabarito, fonte ou metadado.
4. Nunca publicar material licenciado ou segredo.
5. Questão nova destinada ao treino deve entrar com correção completa por alternativa.
6. No automático, questão antiga só volta se a revisão estiver vencida; filtros manuais podem chamá-la antes.
7. Erro histórico permanece no Caderno QG mesmo após recuperação.
8. O cronograma nunca ultrapassa o limite duro configurado para o dia.
9. Revisões adiadas acumulam prioridade e retornam à fila sem avalanche.
10. Antes de marcar uma P concluída: validar Supabase, arquivos, mapa e GitHub Pages.
11. Só considerar deploy concluído com `status=completed` e `conclusion=success`.
12. Se P1–P8 terminarem, parar e aguardar orientação.
