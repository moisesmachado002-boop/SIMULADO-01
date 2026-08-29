# Mentor IA — V4.22

Plataforma pessoal de estudos adaptativos para organizar ciclo, metas diárias, questões, revisões, desempenho e histórico com persistência no Supabase.

## Produção

Entrada pública: `index.html` → `mentor-v422.html` → `mentor-v4.html`.

A V4.22 mantém os módulos de estudo já estáveis e consolida o sistema de relatórios em um único módulo: `report-v422.js`.

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

## Revisões

Revisões são agrupadas por **assunto** no relatório. Vários eventos espaçados podem existir para o mesmo assunto no banco, mas isso não significa várias sessões obrigatórias no mesmo dia.

A interface deve mostrar uma única revisão do assunto quando for necessária.

## Relatórios V4.22

O módulo `report-v422.js` oferece:

- JSON completo para análise;
- TXT resumido;
- PDF de leitura rápida;
- total de questões e acertos;
- tempo registrado;
- assuntos a revisar, separados da quantidade de eventos de revisão;
- cronograma ativo sem tarefas `skipped`;
- assuntos com pior desempenho quando existe amostra mínima.

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
- entrada de produção da V4.22;
- presença dos módulos obrigatórios;
- ausência dos três módulos antigos de relatório no wrapper de produção;
- invariantes básicos do relatório V4.22.

## Manutenção

Arquivos de versões antigas permanecem no repositório como histórico/fallback, mas **não devem ser recolocados no carregamento de produção sem necessidade**. Mudanças futuras devem preferir substituir um módulo existente em vez de empilhar outra camada sobre ele.