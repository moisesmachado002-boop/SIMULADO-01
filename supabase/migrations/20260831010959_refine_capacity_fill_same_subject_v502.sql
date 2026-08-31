create or replace function public.fill_week_capacity_v502(p_week_start date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_today date:=(now() at time zone 'America/Bahia')::date;
  v_week_end date:=p_week_start+6;
  v_daily integer:=60;
  v_buffer integer:=15;
  v_days smallint[]:=array[1,2,3,4,5,6]::smallint[];
  v_hard integer;
  v_goal integer;
  v_day date;
  v_used integer;
  v_subject uuid;
  v_topic uuid;
  v_qtarget integer;
  v_qminutes integer;
  v_priority integer;
  v_inserted integer:=0;
  v_generation uuid:=gen_random_uuid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_week_start is null then raise exception 'week_start_required'; end if;

  select coalesce(daily_minutes,60),coalesce(buffer_percent,15),coalesce(study_days,array[1,2,3,4,5,6]::smallint[])
    into v_daily,v_buffer,v_days
  from public.study_preferences where user_id=v_uid;

  v_hard:=greatest(45,floor(v_daily*(100-greatest(0,least(40,v_buffer)))/100.0)::int);
  v_goal:=floor(v_hard*0.82)::int;

  for v_day in select d::date from generate_series(greatest(p_week_start,v_today),v_week_end,interval '1 day') g(d) loop
    if not(extract(isodow from v_day)::int=any(v_days::int[])) then continue; end if;
    if exists(select 1 from public.study_plan_items p where p.user_id=v_uid and p.scheduled_for=v_day and p.status in ('in_progress','completed') and p.task_type<>'review') then continue; end if;

    select coalesce(sum(coalesce(p.duration_minutes,0)),0)::int into v_used
    from public.study_plan_items p
    where p.user_id=v_uid and p.scheduled_for=v_day and p.status in ('pending','in_progress','completed');

    if v_used>=v_goal or v_hard-v_used<8 then continue; end if;

    for v_subject in
      select t.subject_id
      from public.study_plan_items p
      join public.topics t on t.id=p.topic_id
      where p.user_id=v_uid and p.scheduled_for=v_day and p.status in ('pending','in_progress','completed')
      group by t.subject_id
      order by count(*) filter(where p.task_type<>'review') desc,count(*) filter(where p.task_type='review') desc,t.subject_id
    loop
      exit when v_used>=v_goal or v_hard-v_used<8;

      v_topic:=null;
      select d.topic_id into v_topic
      from public.mentor_topic_decisions_internal_v500(v_uid) d
      where d.subject_id=v_subject
        and not d.consolidated
        and not exists(select 1 from public.user_topic_study_policy usp where usp.user_id=v_uid and usp.topic_id=d.topic_id)
        and not exists(select 1 from public.study_plan_items px where px.user_id=v_uid and px.scheduled_for=v_day and px.topic_id=d.topic_id and px.status in ('pending','in_progress','completed'))
      order by d.priority_score desc,d.priority_band asc,d.sequence_rank asc,d.evidence asc
      limit 1;

      if v_topic is null then continue; end if;

      select coalesce(d.priority_score,60)::int into v_priority
      from public.mentor_topic_decisions_internal_v500(v_uid) d where d.topic_id=v_topic;
      v_priority:=coalesce(v_priority,60);

      v_qtarget:=least(15,greatest(5,ceil((v_goal-v_used)/1.5)::int));
      v_qminutes:=greatest(8,ceil(v_qtarget*1.5)::int);
      while v_used+v_qminutes>v_hard and v_qtarget>5 loop
        v_qtarget:=v_qtarget-1;
        v_qminutes:=greatest(8,ceil(v_qtarget*1.5)::int);
      end loop;
      if v_used+v_qminutes>v_hard then continue; end if;

      insert into public.study_plan_items(user_id,topic_id,scheduled_for,task_type,question_target,status,duration_minutes,priority,source_reason,plan_version,sort_order,progress_count,generation_id,lifecycle_kind)
      values(v_uid,v_topic,v_day,'questions',v_qtarget,'pending',v_qminutes,least(97,greatest(50,v_priority)),'v502_capacity_questions','v502',900,0,v_generation,'active');
      v_inserted:=v_inserted+1;
      v_used:=v_used+v_qminutes;
    end loop;
  end loop;

  return jsonb_build_object('ok',true,'inserted',v_inserted,'target_utilization_percent',82,'daily_cap_minutes',v_hard);
end;
$$;

revoke all on function public.fill_week_capacity_v502(date) from public, anon, authenticated;
