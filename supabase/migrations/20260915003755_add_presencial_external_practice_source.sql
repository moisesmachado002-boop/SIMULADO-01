alter table public.external_practice_batches
  drop constraint if exists external_practice_batches_source_kind_check;

alter table public.external_practice_batches
  add constraint external_practice_batches_source_kind_check
  check (source_kind = any (array['qconcursos'::text,'internet'::text,'official'::text,'other'::text,'presencial'::text]));

create or replace function public.record_external_practice_atomic_v433(
  p_source_kind text,
  p_subject_id uuid,
  p_topic_id uuid,
  p_subtopic_id uuid,
  p_plan_item_id uuid,
  p_source_url text,
  p_total_questions integer,
  p_correct_count integer,
  p_confidence smallint,
  p_duration_minutes integer,
  p_notes text,
  p_practiced_at timestamp with time zone,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_batch public.external_practice_batches%rowtype;
  v_plan public.study_plan_items%rowtype;
  v_today date;
  v_target integer;
  v_before integer;
  v_after integer;
  v_completed boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_source_kind not in ('qconcursos','internet','official','other','presencial') then raise exception 'invalid_source_kind'; end if;
  if p_total_questions is null or p_total_questions < 1 or p_total_questions > 500 then raise exception 'invalid_total'; end if;
  if p_correct_count is null or p_correct_count < 0 or p_correct_count > p_total_questions then raise exception 'invalid_correct'; end if;
  if p_confidence is not null and (p_confidence < 1 or p_confidence > 5) then raise exception 'invalid_confidence'; end if;
  if p_duration_minutes is not null and (p_duration_minutes < 0 or p_duration_minutes > 720) then raise exception 'invalid_duration'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 16 or char_length(p_idempotency_key) > 128 then raise exception 'invalid_idempotency_key'; end if;
  if not exists(select 1 from public.topics t where t.id=p_topic_id and t.subject_id=p_subject_id and t.active=true) then raise exception 'topic_outside_syllabus'; end if;
  if p_subtopic_id is not null and not exists(select 1 from public.topics st where st.id=p_subtopic_id and st.parent_topic_id=p_topic_id and st.source_name='filter_subtopic' and st.is_official_syllabus=true) then raise exception 'subtopic_outside_topic'; end if;

  insert into public.external_practice_batches(
    user_id,source_kind,subject_id,topic_id,subtopic_id,source_url,total_questions,correct_count,confidence,duration_minutes,notes,practiced_at,idempotency_key
  ) values(
    v_uid,p_source_kind,p_subject_id,p_topic_id,p_subtopic_id,p_source_url,p_total_questions,p_correct_count,p_confidence,p_duration_minutes,left(p_notes,1200),coalesce(p_practiced_at,now()),p_idempotency_key
  )
  on conflict (user_id,idempotency_key) where idempotency_key is not null do nothing
  returning * into v_batch;

  if not found then
    select * into v_batch from public.external_practice_batches where user_id=v_uid and idempotency_key=p_idempotency_key limit 1;
    return jsonb_build_object('ok',true,'duplicate',true,'batch_id',v_batch.id,'practiced_at',v_batch.practiced_at,
      'plan',case when v_batch.plan_item_id is null then null else jsonb_build_object('id',v_batch.plan_item_id,'progress_before',v_batch.plan_progress_before,'progress',v_batch.plan_progress_after) end);
  end if;

  perform public.recalculate_topic_mastery_row(p_topic_id);
  v_today := (coalesce(p_practiced_at,now()) at time zone 'America/Bahia')::date;

  if p_plan_item_id is not null then
    select p.* into v_plan from public.study_plan_items p
      where p.id=p_plan_item_id and p.user_id=v_uid and p.topic_id=p_topic_id and p.task_type='questions'
        and p.status in ('pending','in_progress')
        and (p_subtopic_id is null or p.subtopic_id is not distinct from p_subtopic_id)
      for update;
  else
    select p.* into v_plan from public.study_plan_items p
      where p.user_id=v_uid and p.topic_id=p_topic_id and p.task_type='questions'
        and p.status in ('pending','in_progress')
        and (p_subtopic_id is null or p.subtopic_id is not distinct from p_subtopic_id)
        and (p.scheduled_for=v_today or p.carried_from_date is not null)
      order by (p.carried_from_date is null) asc,(position('qconcursos' in coalesce(p.source_reason,''))=0) asc,p.sort_order asc
      limit 1 for update;
  end if;

  if v_plan.id is not null then
    v_target:=greatest(1,coalesce(v_plan.question_target,1));
    v_before:=greatest(0,coalesce(v_plan.progress_count,0));
    v_after:=least(v_target,v_before+p_total_questions);
    v_completed:=v_after>=v_target;
    update public.study_plan_items set progress_count=v_after,status=case when v_completed then 'completed' else 'in_progress' end,
      completed_at=case when v_completed then coalesce(p_practiced_at,now()) else null end where id=v_plan.id and user_id=v_uid;
    update public.external_practice_batches set plan_item_id=v_plan.id,plan_progress_before=v_before,plan_progress_after=v_after,updated_at=now()
      where id=v_batch.id and user_id=v_uid;
  end if;

  update public.external_practice_batches set processing_completed_at=now(),updated_at=now() where id=v_batch.id and user_id=v_uid;
  return jsonb_build_object('ok',true,'duplicate',false,'batch_id',v_batch.id,'practiced_at',v_batch.practiced_at,
    'plan',case when v_plan.id is null then null else jsonb_build_object('id',v_plan.id,'target',v_target,'progress_before',v_before,'progress',v_after,'completed',v_completed,'source_reason',v_plan.source_reason,'plan_version',v_plan.plan_version) end);
end;
$function$;