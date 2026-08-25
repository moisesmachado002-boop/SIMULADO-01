# Mentor IA — V1.3

Protótipo de uma mentora de estudos adaptativa focada em transformar desempenho real em um mapa de conhecimento.

## Principal mudança da V1.3

A plataforma deixa de depender de questões próprias de demonstração como fluxo principal. O aluno usa questões reais no Qconcursos e registra os resultados das baterias na Mentor IA.

## Modo Q

- botão direto para abrir o banco de questões do Qconcursos;
- possibilidade de salvar o link de um filtro já montado no Q;
- registro rápido de baterias (matéria, assunto, quantidade, acertos, confiança e tempo);
- link opcional da origem e observações pessoais;
- atualização automática do domínio por matéria e assunto;
- resumo separado de quantas baterias e questões reais do Q foram registradas;
- recomendações da mentora apontando a próxima matéria/assunto para testar no Q;
- histórico identifica registros provenientes do Qconcursos.

## O que a mentora considera

- taxa de acertos;
- quantidade de questões da bateria;
- confiança informada pelo aluno;
- tempo por questão quando disponível;
- matéria e assunto;
- recência das evidências;
- quantidade acumulada de evidências.

## Limitações atuais

- o sistema não acessa a conta, a assinatura ou a senha do Qconcursos;
- não existe API oficial do Q integrada nesta versão;
- os resultados do Q são registrados manualmente pelo aluno;
- os dados ainda ficam no `localStorage` do navegador;
- ainda não há login, sincronização ou modelo de IA externo.

## Próxima grande etapa

Conectar Supabase para autenticação e histórico persistente. Depois, conectar uma IA real ao perfil de conhecimento. Se futuramente houver uma integração oficial/autorizada com o provedor de questões, o registro poderá ficar mais automático sem copiar o banco de terceiros.
