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

## STATUS DO PROJETO
- P1 — Edital e Taxonomia ✅ concluída
- P2 — Estrutura das Questões ✅ concluída
- P3 — Banco de Questões ✅ concluída no modelo **sob demanda**
- P4 — Correção Completa ✅ concluída
- P5 — Modo QG ⏳ próxima etapa
- P6 — Cronograma e Revisões ⏳
- P7 — Mentora Inteligente ⏳
- P8 — Qconcursos + Internet ⏳

**Última etapa concluída:** P4 — Correção Completa.

**Próxima etapa:** P5 — Modo QG.

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
- O banco possui o contrato `questions_p4_ready_visibility_check`: uma questão só pode ter `explanation` não nulo se estiver `per_option` e tiver explicação para todas as alternativas. Isso impede que novas importações coloquem questão incompleta no treino.

## Arquivos e responsabilidades
- `MAPA-DO-PROJETO.md`: status, arquitetura e decisões operacionais.
- `index.html`: estrutura HTML base e carregamento dos módulos globais.
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
- `question-feedback.js` / `question-feedback.css`: P4, correção estruturada completa e análise por alternativa.
- `q-mode.js` / `q-mode.css`: modo legado/manual do Qconcursos; será tratado na P8.
- `q-presets.js` / `q-presets.css`: atalhos Qconcursos; será tratado na P8.
- `sw.js`: cache PWA.
- `manifest.json` / `icon.svg`: PWA.

## Supabase — estrutura relevante
- `questions`: questão canônica privada, gabarito e explicações P4.
- `question_attempts`: histórico imutável de respostas.
- `user_question_state`: resumo por usuário+questão.
- `subjects`, `topics`, `topic_components` e aliases: currículo oficial.
- `topic_mastery`: domínio agregado por tópico.
- `source_documents`: origem/licença e contagem do acervo.

## Matriz “quero mudar X → onde mexer”
- Estado/badge → `question-state.js` + wiring mínimo `bank-mode.js` + `user_question_state`.
- Filtros/rotação → `question-filters.js`/CSS + wiring mínimo `bank-mode.js`.
- Dificuldade → `question-difficulty.js`/CSS + `questions`.
- Correção → `question-feedback.js`/CSS + campos P4 em `questions`.
- Importar questão sob demanda → `questions`, `source_documents`, taxonomia P1 e fonte privada; a questão só entra no treino com correção P4 completa.
- Edital/taxonomia → `edital-core.js` + tabelas P1.
- Cronograma → futuros `study-profile.js`, `schedule-engine.js`, `review-engine.js` na P6.
- Mentora/IA → futuro `mentor-engine.js` + backend seguro na P7.
- Qconcursos → futuro `qconcursos-links.js` na P8.
- Cache/PWA → `sw.js` quando assets frontend mudarem.

## Regras permanentes
1. Concluir uma P inteira antes de avançar para a próxima.
2. Preferir módulos separados a ampliar monólitos.
3. Nunca inventar gabarito, fonte ou metadado.
4. Nunca publicar material licenciado ou segredo.
5. Questão nova destinada ao treino deve entrar com correção completa por alternativa.
6. Antes de marcar uma P concluída: validar Supabase, arquivos, mapa e GitHub Pages.
7. Só considerar deploy concluído com `status=completed` e `conclusion=success`.
8. Se P1–P8 terminarem, parar e aguardar orientação.
