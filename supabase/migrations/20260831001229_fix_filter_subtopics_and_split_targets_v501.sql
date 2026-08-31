do $patch$
declare
  v_def text;
  v_old text;
begin
  select pg_get_functiondef('public.mentor_pick_split_subtopic_v431(uuid,uuid,date,date)'::regprocedure) into v_def;
  v_old := 'c.source_name=''filter_subtopic'' and c.active=true';
  if position(v_old in v_def)=0 then raise exception 'split_subtopic_contract_pattern_missing'; end if;
  v_def := replace(v_def,v_old,'c.source_name=''filter_subtopic'' and c.is_official_syllabus=true');
  execute v_def;
end
$patch$;

do $patch$
declare
  v_def text;
  v_old text;
begin
  select pg_get_functiondef('public.rebuild_smart_week_v500(date)'::regprocedure) into v_def;

  v_old := 'c.source_name=''filter_subtopic'' and c.active=true';
  if position(v_old in v_def)=0 then raise exception 'group_count_contract_pattern_missing'; end if;
  v_def := replace(v_def,v_old,'c.source_name=''filter_subtopic'' and c.is_official_syllabus=true');

  v_old := 'from public.topics where parent_topic_id=v_topic and source_name=''filter_subtopic'' and active=true order by position limit v_comp_count';
  if position(v_old in v_def)=0 then raise exception 'group_loop_contract_pattern_missing'; end if;
  v_def := replace(v_def,v_old,'from public.topics where parent_topic_id=v_topic and source_name=''filter_subtopic'' and is_official_syllabus=true order by position limit v_comp_count');

  v_old := 'v_theory:=case when v_math then 25 else 20 end;v_qtarget:=case when coalesce(v_evidence,0)<3 then 10 else 12 end;v_qminutes:=v_qtarget*3;';
  if position(v_old in v_def)=0 then raise exception 'normal_question_target_pattern_missing'; end if;
  v_def := replace(v_def,v_old,'v_theory:=case when v_math then 25 else 20 end;v_qtarget:=20;v_qminutes:=greatest(8,ceil(v_qtarget*1.5)::int);');

  execute v_def;
end
$patch$;

do $patch$
declare
  v_def text;
  v_old text;
begin
  select pg_get_functiondef('public.record_external_practice_atomic_v433(text,uuid,uuid,uuid,uuid,text,integer,integer,smallint,integer,text,timestamptz,text)'::regprocedure) into v_def;
  v_old := 'st.id=p_subtopic_id and st.parent_topic_id=p_topic_id and st.active=true';
  if position(v_old in v_def)=0 then raise exception 'external_subtopic_contract_pattern_missing'; end if;
  v_def := replace(v_def,v_old,'st.id=p_subtopic_id and st.parent_topic_id=p_topic_id and st.source_name=''filter_subtopic'' and st.is_official_syllabus=true');
  execute v_def;
end
$patch$;

do $patch$
declare
  v_def text;
  v_old text := 'coalesce(new.source_reason,'''') <> ''v500_group_questions''';
  v_hits integer;
begin
  select pg_get_functiondef('public.guard_study_plan_stability()'::regprocedure) into v_def;
  v_hits := (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old);
  if v_hits<>2 then raise exception 'question_guard_pattern_count_%',v_hits; end if;
  v_def := replace(v_def,v_old,'coalesce(new.source_reason,'''') not in (''v500_group_questions'',''v500_split_questions'')');
  execute v_def;
end
$patch$;

comment on function public.mentor_pick_split_subtopic_v431(uuid,uuid,date,date) is 'V5.01: filter_subtopic is a technical child; validity comes from official syllabus linkage, not child active=true.';
comment on function public.record_external_practice_atomic_v433(text,uuid,uuid,uuid,uuid,text,integer,integer,smallint,integer,text,timestamptz,text) is 'V5.01: accepts official filter_subtopic children linked to an active official parent topic.';
