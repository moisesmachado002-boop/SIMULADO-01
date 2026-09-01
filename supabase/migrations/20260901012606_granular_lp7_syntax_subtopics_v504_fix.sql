do $$
declare
  v_parent uuid;
begin
  select id into v_parent
  from public.topics
  where syllabus_code='LP7' and title='Sintaxe da oração e do período' and parent_topic_id is null
  limit 1;

  if v_parent is null then
    raise exception 'LP7 parent topic not found';
  end if;

  update public.topics
     set source_name='legacy_filter_subtopic',
         is_official_syllabus=false
   where parent_topic_id=v_parent
     and source_name='filter_subtopic'
     and syllabus_code in ('LP7.1','LP7.2','LP7.3','LP7.4');

  insert into public.topics(id,user_id,subject_id,parent_topic_id,title,position,syllabus_code,weight,active,source_name,is_official_syllabus)
  select gen_random_uuid(),p.user_id,p.subject_id,v_parent,x.title,x.position,x.code,coalesce(p.weight,1),false,'filter_subtopic',true
  from public.topics p
  cross join (values
    (1,'LP7.01','Estrutura da oração: sujeito e predicado'),
    (2,'LP7.02','Tipos de sujeito e oração sem sujeito'),
    (3,'LP7.03','Predicação verbal e nominal'),
    (4,'LP7.04','Complementos verbais: objeto direto e indireto'),
    (5,'LP7.05','Complemento nominal e agente da passiva'),
    (6,'LP7.06','Termos acessórios: adjunto adnominal e adjunto adverbial'),
    (7,'LP7.07','Aposto e vocativo'),
    (8,'LP7.08','Funções sintáticas dos pronomes oblíquos'),
    (9,'LP7.09','Vozes verbais e transformação ativa/passiva'),
    (10,'LP7.10','Período simples e oração absoluta'),
    (11,'LP7.11','Orações coordenadas'),
    (12,'LP7.12','Orações subordinadas substantivas'),
    (13,'LP7.13','Orações subordinadas adjetivas'),
    (14,'LP7.14','Orações subordinadas adverbiais'),
    (15,'LP7.15','Relações lógico-semânticas e conectivos'),
    (16,'LP7.16','Correlação verbal e articulação de períodos'),
    (17,'LP7.17','Orações reduzidas e desenvolvidas'),
    (18,'LP7.18','Análise sintática integrada e reescrita')
  ) as x(position,code,title)
  where p.id=v_parent
    and not exists (
      select 1 from public.topics t
      where t.parent_topic_id=v_parent and t.syllabus_code=x.code
    );

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.09'
    and q.id in ('ffbd09ee-471f-4e1e-863c-04ca3adb4ded','03aba256-30dd-41a5-a227-06f1a1d9920d','2c295eff-46a8-4b8f-90a0-2565e02f9901','8ac03865-0149-457d-8b33-0202676f4c28','7d133772-d687-4c4d-b788-01870ae4a212');

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.14'
    and q.id in ('ed495262-c055-4fd8-b81f-599cd5f6f1d2','36ac5ada-6e09-4acf-a290-1eb31c066dac');

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.08'
    and q.id='805d797a-6bba-4715-b7c1-20da003aef63';

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.15'
    and q.id='1ae39d8c-bc2e-4efa-a1e9-78e5e7a1262a';

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.18'
    and q.id='5c7ce6b1-ed23-4e88-9f10-42e95dbd0483';

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.16'
    and q.id in ('e49bdc23-cf00-4ff2-95c2-dcd60e8dd4fb','0b65c82b-5bec-4c36-876e-415dabeef29c','92ed47aa-70f8-4c44-ab86-71a69d4a5b54');

  update public.questions q set subtopic_id=st.id
  from public.topics st
  where st.parent_topic_id=v_parent and st.syllabus_code='LP7.12'
    and q.id='a843ebe6-d52e-4bfe-8d10-ca92d4d5e609';
end $$;
