create index if not exists study_plan_question_evidence_question_idx on public.study_plan_question_evidence(question_id);

revoke all on function public.rebuild_smart_week_v500(date) from public, anon, authenticated;
