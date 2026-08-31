revoke insert, delete on public.study_plan_items from authenticated;
revoke insert, update, delete on public.topics from authenticated;
grant select on public.topics to authenticated;
