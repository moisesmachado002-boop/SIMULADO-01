# Mentor IA — Stability 9.1

Esta atualização consolida a arquitetura P1–P8 sem mudar o currículo, gabaritos ou regras permanentes do projeto.

## Banco e consistência

- Resposta de questão passou a usar `record_question_attempt_atomic`.
- Tentativa, estado da questão, domínio, revisão e progresso do plano são atualizados em uma única transação.
- Há idempotência por `client_attempt_id` e proteção curta de retry para evitar duplicidade se a resposta HTTP se perder.
- A regra adaptativa P6 é a única regra canônica de próxima revisão no fluxo novo.
- `mark_question_for_review_now` sincroniza Caderno QG, tabela `reviews` e recalculo do plano.
- `publish_study_plan_atomic` publica o cronograma com lock por usuário e operação atômica.

## Frontend

- Modo Automático mostra apenas questões realmente elegíveis: novas ou revisões vencidas.
- A correção P4 completa é carregada junto com a questão e pode ser exibida sem uma segunda consulta normal no momento do gabarito.
- O painel principal conectado passa a usar evidências canônicas do Supabase para domínio, precisão e histórico.
- A interface antiga permanece apenas como compatibilidade/fallback; fica escondida durante o bootstrap modular.
- Questões e revisões do P6 não podem ser concluídas manualmente: o progresso vem das respostas registradas.
- A análise P7 não é mais disparada duas vezes após registrar uma bateria externa.

## Sincronização e PWA

- O estado legado em `profiles.app_state` ganhou resolução simples por data de atualização para reduzir sobrescrita entre aparelhos.
- Senha mínima no cliente aumentou de 6 para 8 caracteres.
- `@supabase/supabase-js` está fixado na versão `2.112.4`.
- O service worker pré-armazena o SDK fixado e os módulos 9.1 para permitir inicialização offline após uma primeira carga bem-sucedida.
- A cor do tema PWA foi alinhada entre HTML e manifest.

## Banco — hardening adicional

- Índices de chaves estrangeiras ausentes foram adicionados nas tabelas apontadas pelo advisor.
- Índices duplicados foram removidos preservando os índices de constraints.
- Políticas RLS de aliases/componentes passaram a usar `(select auth.uid())`, evitando reavaliação por linha.
- As novas funções são `SECURITY INVOKER`; execução pública/anônima foi revogada e `authenticated` recebeu apenas `EXECUTE`.

## Validação

- Os RPCs atômicos foram testados dentro de transações com `ROLLBACK`, sem deixar dados de teste.
- Há workflow `.github/workflows/validate.yml` para verificar sintaxe JavaScript, referências do HTML e arquivos listados no cache do service worker.

## Limitação externa

A opção global **Leaked Password Protection** pertence à configuração do Supabase Auth e não é controlada pelo código do repositório. O frontend 9.1 já exige 8 caracteres, mas a proteção contra senhas vazadas deve permanecer habilitada no painel do Supabase quando disponível no plano da conta.
