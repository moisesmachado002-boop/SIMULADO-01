# Mentor IA 2.0 — Roadmap de redesign

## Objetivo

A V2 reorganiza a experiência sem descartar a base de dados e os motores já validados da plataforma. O foco é deixar cada atividade no lugar certo e transformar a Mentora em uma camada transversal que acompanha o que o aluno realmente faz.

## Estratégia de publicação

- A versão atual permanece em `index.html`.
- A prévia da V2 fica em `v2.html`.
- A V2 usa o mesmo projeto Supabase e, portanto, o mesmo histórico do aluno.
- A versão atual só deve ser substituída depois de a V2 ser testada em celular e desktop.

## Navegação V2

1. **Hoje** — painel, métricas, missão e próximo passo da Mentora.
2. **Estudo** — edital verticalizado, domínio por assunto e registro de sessões de estudo.
3. **QConcursos** — questões externas, filtro por edital/banca, registro da bateria e relatório automático.
4. **Banco** — questões da própria plataforma, correção completa e revisão adaptativa.
5. **IA** — leitura de hoje, fraquezas, padrões, avanço e revisões.

## O que já está funcional na primeira prévia

### Base e conta
- Reutilização da mesma autenticação Supabase.
- Login não bloqueia uma conta existente por regra local de 8 caracteres; o mínimo de 8 fica apenas no cadastro de uma conta nova.
- Carregamento de matérias, 99 tópicos do edital, domínio, tentativas, revisões, cronograma, sessões, fontes externas e questões elegíveis.

### Hoje
- Total de evidências internas + externas.
- Taxa de acerto combinada.
- Tópicos medidos no edital.
- Revisões vencidas.
- Missão do dia a partir de `study_plan_items`.
- Raio-X dos tópicos de menor domínio.
- Leitura `today` do `mentor-analyze`.

### Estudo
- Matéria e assunto separados do módulo de questões.
- Mapa completo do edital.
- Filtros: todos, não medidos, baixo domínio e bem encaminhados.
- Registro manual de uma sessão de estudo em `study_sessions`.
- Exibição das evidências internas, externas e sessões daquele tópico.

### QConcursos
- Módulo totalmente separado do Banco próprio.
- Matéria, assunto do edital e banca.
- Reaproveitamento prioritário de um filtro exato já salvo em `external_source_links`.
- Geração automática inicial por disciplina para Português, Matemática, Direito Administrativo e Direito Constitucional.
- Bancas mapeadas inicialmente: IBFC, CEBRASPE, VUNESP e FGV.
- Presets de Matemática já conhecidos: PA e PG.
- Quando ainda não existe mapeamento exato, a interface informa que o filtro é amplo em vez de fingir precisão.
- Registro de total, acertos, confiança, tempo e observação pela Edge Function `record-external-practice`.
- Atualização automática de `topic_mastery` e memória da Mentora.
- Relatório imediato da IA depois de registrar a bateria.

### Banco próprio
- Filtro de matéria e assunto independente do QConcursos.
- Prioridade para questões inéditas.
- Cronômetro e confiança.
- Registro pela RPC `record_question_attempt_atomic`.
- Correção com gabarito, explicação e análise das alternativas quando disponível.
- Reutilização do mesmo estado de revisão e domínio da plataforma atual.

### Mentora
- Usa a Edge Function `mentor-analyze` existente.
- Leituras: Hoje, Fraquezas, Padrões, Posso avançar? e Revisões.
- Mostra nível de evidência, motivos, tópicos prioritários e próximo passo.
- Exibe o rastro que a plataforma conhece: questões internas, questões externas, sessões de estudo e tópicos medidos.

## Próximos incrementos da V2

### QConcursos — prioridade alta
- Mapear automaticamente as demais disciplinas do edital no filtro clássico do QC.
- Criar tabela de correspondência `tópico PMBA -> assunto(s) QConcursos` sem alterar a taxonomia oficial do edital.
- Validar cada correspondência antes de marcar como filtro exato.
- Permitir múltiplos subfocos quando um único item do edital engloba vários assuntos do QC.
- Guardar a correspondência validada para reutilização automática.

### Estudo — prioridade alta
- Permitir marcar tarefas teóricas do cronograma como concluídas diretamente pela V2.
- Diferenciar teoria nova, revisão teórica e resolução de questões.
- Mostrar horas/minutos por matéria e por semana.

### Dashboard — prioridade média
- Gráfico de evolução por período.
- Cobertura do edital por matéria.
- Pendências e revisões dos próximos 7 dias.
- Comparação de desempenho entre Banco próprio e QConcursos sem misturar padrões que exigem resposta individual.

### UX — prioridade média
- Teste final em telas pequenas Android.
- Estados de carregamento e conexão mais detalhados.
- Atalhos de “continuar de onde parei”.
- PWA/cache próprio da V2 depois da aprovação visual.

## Regra de segurança e integridade

- A V2 não solicita senha do QConcursos.
- A V2 não faz scraping em massa nem importa automaticamente conteúdo protegido do QConcursos.
- Filtros externos são atalhos/rastreadores; resultados informados pelo aluno viram evidência de desempenho.
- O gabarito do Banco próprio continua sendo a fonte de verdade cadastrada; a IA não o altera silenciosamente.
- Nenhuma chave `service_role` ou segredo privado deve ir para o frontend.
