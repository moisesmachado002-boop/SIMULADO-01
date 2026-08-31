with targets(subject_name,title,syllabus_code) as (
  values
    ('Direito Constitucional','Poder Constituinte e Reforma Constitucional','DC-M1'),
    ('Direitos Humanos','Teoria Geral e Evolução dos Direitos Humanos','DH-M1'),
    ('Direito Penal','Aplicação da Lei Penal','DP-M1')
), prepared as (
  select s.user_id,s.id as subject_id,t.title,t.syllabus_code,
         coalesce((select max(x.position) from public.topics x where x.subject_id=s.id and x.parent_topic_id is null),0)+1 as position
  from targets t
  join public.subjects s on s.name=t.subject_name and s.active=true
)
insert into public.topics(user_id,subject_id,title,parent_topic_id,weight,active,position,syllabus_code,source_name,is_official_syllabus)
select p.user_id,p.subject_id,p.title,null,1.0,true,p.position,p.syllabus_code,'Mentoria ZD',false
from prepared p
where not exists (
  select 1
  from public.topics x
  where x.user_id=p.user_id
    and x.subject_id=p.subject_id
    and lower(trim(x.title))=lower(trim(p.title))
    and x.parent_topic_id is null
);

with mapping(subject_name,question_label,topic_title) as (
  values
    ('Direito Constitucional','Poder Constituinte e Reforma Constitucional (conteúdo extra)','Poder Constituinte e Reforma Constitucional'),
    ('Direitos Humanos','Teoria Geral e Evolução dos Direitos Humanos (conteúdo extra)','Teoria Geral e Evolução dos Direitos Humanos'),
    ('Direito Penal','Aplicação da Lei Penal (conteúdo extra)','Aplicação da Lei Penal')
)
update public.questions q
set topic_id=t.id,
    topic_label=t.title,
    content_meta=coalesce(q.content_meta,'{}'::jsonb) || jsonb_build_object('origin','Mentoria ZD','curriculum_kind','mentoria_topic')
from mapping m
join public.subjects s on s.name=m.subject_name and s.active=true
join public.topics t on t.subject_id=s.id
 and t.user_id=s.user_id
 and t.title=m.topic_title
 and t.parent_topic_id is null
 and t.active=true
where q.subject_id=s.id
  and q.topic_id is null
  and q.topic_label=m.question_label;

create or replace function public.mentor_topic_decisions_internal_v500(p_user_id uuid)
returns table(topic_id uuid, subject_id uuid, evidence integer, correct integer, accuracy numeric, due_reviews integer, study_days integer, high_conf_wrong integer, low_conf_correct integer, forgetting_risk integer, measured boolean, consolidated boolean, priority_score integer, exam_weight numeric, priority_band smallint, sequence_rank integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select r.topic_id,r.subject_id,r.evidence,r.correct,r.accuracy,r.due_reviews,r.study_days,r.high_conf_wrong,r.low_conf_correct,
         r.forgetting_risk,r.measured,r.consolidated,r.priority_score,r.exam_weight,r.priority_band,r.sequence_rank
  from public.mentor_topic_decisions_raw_v500(p_user_id) r
  join public.topics t on t.id=r.topic_id
  where t.active=true
    and (t.is_official_syllabus=true or t.source_name='Mentoria ZD');
$function$;

revoke execute on function public.mentor_topic_decisions_internal_v500(uuid) from public, anon, authenticated;
