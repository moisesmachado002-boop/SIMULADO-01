create or replace function public.record_plan_question_progress_v502(
  p_plan_item_id uuid,
  p_question_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.study_plan_items%rowtype;
  v_q record;
  v_inserted uuid;
  v_target integer;
  v_progress integer;
  v_status text;
  v_completed_at timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_plan_item_id is null or p_question_id is null then return jsonb_build_object('ok',false,'error','missing_scope'); end if;

  select * into v_task from public.study_plan_items where id=p_plan_item_id and user_id=v_uid for update;
  if v_task.id is null then return jsonb_build_object('ok',false,'error','task_not_found'); end if;
  if v_task.task_type<>'questions' then return jsonb_build_object('ok',false,'error','not_question_task'); end if;
  if v_task.status='completed' or v_task.completed_at is not null then
    return jsonb_build_object('ok',true,'changed',false,'duplicate',true,'status','completed','progress',coalesce(v_task.progress_count,0));
  end if;

  select q.id,q.topic_id,q.subtopic_id into v_q from public.questions q where q.id=p_question_id;
  if v_q.id is null then return jsonb_build_object('ok',false,'error','question_not_found'); end if;
  if v_q.topic_id is distinct from v_task.topic_id then return jsonb_build_object('ok',false,'error','question_outside_task_topic'); end if;
  if v_task.subtopic_id is not null and v_q.subtopic_id is distinct from v_task.subtopic_id then
    return jsonb_build_object('ok',false,'error','question_outside_task_subtopic');
  end if;

  if not exists (
    select 1 from public.question_attempts qa
    where qa.user_id=v_uid
      and qa.question_id=p_question_id
      and qa.answered_at >= (v_task.scheduled_for::timestamp at time zone 'America/Bahia')
  ) then
    return jsonb_build_object('ok',false,'error','question_not_answered_for_task');
  end if;

  insert into public.study_plan_question_evidence(plan_item_id,question_id,user_id)
  values(v_task.id,p_question_id,v_uid)
  on conflict(plan_item_id,question_id) do nothing
  returning question_id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('ok',true,'changed',false,'duplicate',true,'status',v_task.status,'progress',coalesce(v_task.progress_count,0));
  end if;

  v_target:=greatest(1,coalesce(v_task.question_target,1));
  v_progress:=least(v_target,coalesce(v_task.progress_count,0)+1);
  v_status:=case when v_progress>=v_target then 'completed' else 'in_progress' end;
  v_completed_at:=case when v_progress>=v_target then now() else null end;

  update public.study_plan_items
  set progress_count=v_progress,status=v_status,completed_at=v_completed_at
  where id=v_task.id and user_id=v_uid;

  return jsonb_build_object('ok',true,'changed',true,'duplicate',false,'status',v_status,'progress',v_progress,'target',v_target,'question_id',p_question_id);
end;
$$;

revoke all on function public.record_plan_question_progress_v502(uuid,uuid) from public, anon;
grant execute on function public.record_plan_question_progress_v502(uuid,uuid) to authenticated;
