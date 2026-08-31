create or replace function public.update_study_preferences_v434(p_daily_minutes integer, p_study_days smallint[], p_review_ratio integer, p_buffer_percent integer, p_timezone text default 'America/Bahia'::text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_days smallint[];
  v_tz text:=coalesce(nullif(trim(p_timezone),''),'America/Bahia');
  v_today date;
  v_dow integer;
  v_week_start date;
  v_plan jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_daily_minutes is null or p_daily_minutes<20 or p_daily_minutes>480 then raise exception 'invalid_daily_minutes'; end if;
  if p_review_ratio is null or p_review_ratio<0 or p_review_ratio>100 then raise exception 'invalid_review_ratio'; end if;
  if p_buffer_percent is null or p_buffer_percent<0 or p_buffer_percent>40 then raise exception 'invalid_buffer_percent'; end if;

  select coalesce(array_agg(distinct d order by d),array[]::smallint[]) into v_days
  from unnest(coalesce(p_study_days,array[]::smallint[])) d where d between 1 and 7;
  if cardinality(v_days)=0 or cardinality(v_days)<>cardinality(coalesce(p_study_days,array[]::smallint[])) then raise exception 'invalid_study_days'; end if;
  if v_tz<>'America/Bahia' then raise exception 'unsupported_timezone'; end if;

  insert into public.study_preferences(user_id,daily_minutes,study_days,review_ratio,buffer_percent,timezone,updated_at)
  values(v_uid,p_daily_minutes,v_days,p_review_ratio,p_buffer_percent,v_tz,now())
  on conflict(user_id) do update set daily_minutes=excluded.daily_minutes,study_days=excluded.study_days,review_ratio=excluded.review_ratio,buffer_percent=excluded.buffer_percent,timezone=excluded.timezone,updated_at=now();

  v_today:=(now() at time zone 'America/Bahia')::date;
  v_dow:=extract(isodow from v_today)::int;
  v_week_start:=case when v_dow=7 then v_today+1 else v_today-(v_dow-1) end;
  v_plan:=public.rebuild_smart_week_v431(v_week_start);
  if coalesce(v_plan->>'status','')='frozen' then v_week_start:=v_week_start+7; v_plan:=public.rebuild_smart_week_v431(v_week_start); end if;

  return jsonb_build_object('ok',true,'daily_minutes',p_daily_minutes,'study_days',v_days,'review_ratio',p_review_ratio,'buffer_percent',p_buffer_percent,'timezone',v_tz,'plan',coalesce(v_plan,'{}'::jsonb),'week_start',v_week_start);
end;
$$;

revoke all on function public.update_study_preferences_v434(integer,smallint[],integer,integer,text) from public, anon;
grant execute on function public.update_study_preferences_v434(integer,smallint[],integer,integer,text) to authenticated;
