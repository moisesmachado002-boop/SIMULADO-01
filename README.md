# Mentor IA — V4.23

Plataforma pessoal de estudos adaptativos para organizar ciclo, metas diárias, questões, revisões, desempenho e histórico com persistência no Supabase.

## Produção

Entrada pública: `index.html` → `mentor-v423.html` → `mentor-v4.html`.

A V4.23 mantém o núcleo de estudo estabilizado na V4.22 e acrescenta `analytics-v423.js`, responsável pela nova visualização de desempenho e pela navegação semanal ampliada.

## Regras do cronograma

Estas regras são invariantes do produto e não devem ser removidas em alterações futuras:

1. A missão do dia não pode crescer sozinha depois que o aluno começou a executá-la.
2. Um mesmo assunto não pode receber duas tarefas ativas do mesmo tipo no mesmo dia.
3. Depois que a revisão de um assunto foi concluída, outra revisão desse assunto não deve reaparecer no mesmo dia.
4. Uma matéria que já teve outro assunto iniciado ou concluído no dia não deve ganhar automaticamente um segundo assunto no mesmo dia.
5. Tarefas de questões geradas automaticamente usam meta previsível de 20 questões por assunto.
6. Atividades atrasadas concluídas no dia atual contam como trabalho realizado; o planejador não deve preencher artificialmente esse espaço com nova matéria/assunto.
7. Registros `skipped` são histórico técnico e nunca devem ser apresentados como tarefas ativas.
8. O plano diário deve trabalhar com no máximo duas matérias.

Essas regras têm proteção tanto no planejador quanto no banco (`study_plan_items`), incluindo índice único para tarefa ativa por assunto/dia/tipo e trigger de estabilidade.

## Desempenho V4.23

A área **Meu Desempenho** passa a ter quatro leituras principais:

- **Visão geral:** total de questões, acertos, erros, evolução mensal por disciplina e distribuição de questões por disciplina;
- **Por disciplina:** total, acertos, erros e percentual de cada matéria;
- **Por assunto:** detalhamento por tópico do edital, com filtro por disciplina;
- **Evolução por assunto:** até três datas recentes por tópico, com questões, acertos e percentual em cada data.

O Painel também mostra os totais acumulados de questões, acertos e erros.

## Semana V4.23

A tela semanal permite navegar entre semana anterior, atual e próximas semanas. As atividades usam legenda visual para estudo, revisão, resumo, questões, concluído e atrasado.

A navegação semanal é somente leitura: mover tarefas continua sendo responsabilidade do replanejamento controlado, para não reintroduzir alterações silenciosas no cronograma.

## Histórico importado

Dados antigos podem ser importados desde que sejam identificados pela origem e verificados contra o banco antes da inserção.

O histórico Zero Dúvidas importado em 28/08/2026 foi armazenado em `external_practice_batches` com marcador `LEGACY_ZERO_DUVIDAS` nas observações. O conjunto contém 9 baterias, 196 questões, 167 acertos e 29 erros.

Regras para importações futuras:

- nunca reinserir uma bateria já marcada com a mesma chave de origem;
- preservar data, quantidade e acertos do material-fonte;
- não inventar detalhamento que não exista na fonte;
- quando o assunto antigo não corresponder perfeitamente ao edital atual, registrar a ressalva nas observações;
- dados importados alimentam o histórico, mas permanecem identificáveis como legados.

## Revisões

Revisões são agrupadas por **assunto** no relatório. Vários eventos espaçados podem existir para o mesmo assunto no banco, mas isso não significa várias sessões obrigatórias no mesmo dia.

A interface deve mostrar uma única revisão do assunto quando for necessária.

## Relatórios

O módulo `report-v422.js` continua oferecendo JSON, TXT e PDF, com total de questões e acertos, tempo registrado, assuntos a revisar separados dos eventos de revisão e cronograma ativo sem tarefas `skipped`.

## QConcursos

A plataforma mantém o banco interno separado do QConcursos, mas ambos alimentam o histórico de desempenho. O filtro externo inclui, entre outras, FCC e Instituto AOCP.

Os resultados do QConcursos continuam sendo registrados pelo aluno; a aplicação não acessa conta, assinatura ou senha do serviço.

## Dados e segurança

- autenticação e persistência: Supabase;
- dados pessoais de estudo protegidos por RLS;
- tabelas pessoais não são expostas para o papel anônimo;
- RPCs sensíveis exigem usuário autenticado e validam o usuário da sessão;
- relatórios exportados não incluem e-mail, senha ou identificador da conta.

## Validação

O workflow `.github/workflows/validate.yml` verifica em cada push para `main`:

- sintaxe de todos os arquivos JavaScript;
- entrada de produção da V4.23;
- presença dos módulos obrigatórios;
- presença das funcionalidades de desempenho V4.23;
- ausência dos módulos antigos de relatório no wrapper de produção;
- invariantes básicos do relatório consolidado.

## Manutenção

Arquivos de versões antigas permanecem no repositório como histórico/fallback, mas **não devem ser recolocados no carregamento de produção sem necessidade**. Mudanças futuras devem preferir substituir um módulo existente em vez de empilhar outra camada sem justificativa.