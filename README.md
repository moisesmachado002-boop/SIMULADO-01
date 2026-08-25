# Mentor IA — V1.2

Protótipo de uma mentora de estudos adaptativa. O objetivo é ir além de um simples percentual de acertos e transformar cada resposta em evidência sobre o conhecimento do aluno.

## O que a V1.2 já faz

- diagnóstico com 12 questões próprias de demonstração;
- registro de acerto/erro, dificuldade, confiança, tempo e raciocínio opcional;
- mapa de domínio por matéria e por assunto;
- confiabilidade da estimativa conforme a quantidade de evidências;
- pequena perda de confiança quando um assunto passa muitos dias sem nova evidência;
- detecção de erros com confiança alta, respostas lentas e erros muito rápidos;
- missão diária gerada a partir da principal fraqueza;
- objetivo configurável (concurso, meta de acertos e minutos por dia);
- histórico local das tentativas;
- mentora local baseada em regras para sugerir estudo, revisão e avanço.

## Limitações atuais

- os dados ficam apenas no `localStorage` do navegador;
- ainda não há login ou sincronização;
- ainda não há modelo de IA externo;
- as questões desta versão são próprias de demonstração;
- não existe integração com banco de questões de terceiros.

## Próximas etapas

A próxima grande versão deve conectar Supabase para autenticação e histórico persistente. Depois, uma IA real poderá consumir somente os dados necessários do perfil de conhecimento para orientar o aluno.
