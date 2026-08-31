create table if not exists public.study_plan_question_evidence (
  plan_item_id uuid not null references public.study_plan_items(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  user_id uuid not null,
  counted_at timestamptz not null default now(),
  primary key (plan_item_id, question_id)
);

alter table public.study_plan_question_evidence enable row level security;

create index if not exists study_plan_question_evidence_user_idx
  on public.study_plan_question_evidence(user_id, counted_at desc);
