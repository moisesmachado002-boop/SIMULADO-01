create or replace function public.complete_plan_item_v502(p_plan_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_task public.study_plan_items%rowtype;
  v_target integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_plan_item_id is null then return jsonb_build_object('ok',false,'error','missing_task'); end if;

  select * into v_task
  from public.study_plan_items
  where id=p_plan_item_id and user_id=v_uid
  for update;

  if v_task.id is null then return jsonb_build_object('ok',false,'error','task_not_found'); end if;
  if v_task.task_type in ('questions','review') then return jsonb_build_object('ok',false,'error','evidence_required'); end if;
  if v_task.status='completed' or v_task.completed_at is not null then
    return jsonb_build_object('ok',true,'duplicate',true,'task_id',v_task.id,'status','completed');
  end if;
  if v_task.status not in ('pending','in_progress') then return jsonb_build_object('ok',false,'error','task_not_active'); end if;

  v_target:=greatest(1,coalesce(v_task.question_target,1));
  update public.study_plan_items
  set status='completed',progress_count=v_target,completed_at=now()
  where id=v_task.id and user_id=v_uid;

  return jsonb_build_object('ok',true,'duplicate',false,'task_id',v_task.id,'status','completed');
end;
$$;

revoke all on function public.complete_plan_item_v502(uuid) from public, anon;
grant execute on function public.complete_plan_item_v502(uuid) to authenticated;
revoke update on public.study_plan_items from authenticated;
