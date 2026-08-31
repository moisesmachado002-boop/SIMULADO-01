import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
function cleanUrl(value){const raw=String(value||'').trim();if(!raw)return null;try{const u=new URL(raw);return u.protocol==='https:'?u.toString():null;}catch{return null;}}
function uuidOrNull(value){const s=String(value||'').trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)?s:null;}
async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405,headers:cors});
  try{
    const auth=req.headers.get('Authorization')||'';
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
    if(!url||!anon||!auth)return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:cors});
    const db=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await db.auth.getUser();
    if(userError||!user)return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:cors});

    const body=await req.json().catch(()=>({}));
    const sourceKind=['qconcursos','internet','official','other'].includes(body?.source_kind)?body.source_kind:null;
    const topicId=uuidOrNull(body?.topic_id),subjectId=uuidOrNull(body?.subject_id);
    const subtopicId=body?.subtopic_id==null||body?.subtopic_id===''?null:uuidOrNull(body.subtopic_id);
    const planItemId=body?.plan_item_id==null||body?.plan_item_id===''?null:uuidOrNull(body.plan_item_id);
    const total=Number(body?.total_questions),correct=Number(body?.correct_count);
    const confidence=body?.confidence==null?null:Number(body.confidence);
    const duration=body?.duration_minutes==null||body?.duration_minutes===''?null:Math.round(Number(body.duration_minutes));
    const notes=String(body?.notes||'').trim().slice(0,1200)||null;
    const sourceUrl=cleanUrl(body?.source_url);
    const practicedAt=body?.practiced_at?new Date(body.practiced_at):new Date();

    if(!sourceKind||!topicId||!subjectId)return new Response(JSON.stringify({error:'invalid_scope'}),{status:400,headers:cors});
    if(body?.subtopic_id&&!subtopicId)return new Response(JSON.stringify({error:'invalid_subtopic'}),{status:400,headers:cors});
    if(body?.plan_item_id&&!planItemId)return new Response(JSON.stringify({error:'invalid_plan_item'}),{status:400,headers:cors});
    if(!Number.isInteger(total)||total<1||total>500||!Number.isInteger(correct)||correct<0||correct>total)return new Response(JSON.stringify({error:'invalid_score'}),{status:400,headers:cors});
    if(confidence!=null&&(!Number.isInteger(confidence)||confidence<1||confidence>5))return new Response(JSON.stringify({error:'invalid_confidence'}),{status:400,headers:cors});
    if(duration!=null&&(!Number.isFinite(duration)||duration<0||duration>720))return new Response(JSON.stringify({error:'invalid_duration'}),{status:400,headers:cors});
    if(Number.isNaN(practicedAt.getTime()))return new Response(JSON.stringify({error:'invalid_date'}),{status:400,headers:cors});
    if(body?.source_url&&!sourceUrl)return new Response(JSON.stringify({error:'invalid_url'}),{status:400,headers:cors});
    if(sourceKind==='qconcursos'&&sourceUrl){const host=new URL(sourceUrl).hostname.toLowerCase();if(!(host==='qconcursos.com'||host.endsWith('.qconcursos.com')))return new Response(JSON.stringify({error:'invalid_qconcursos_url'}),{status:400,headers:cors});}

    const topicR=await db.from('topics').select('id,subject_id,title,syllabus_code,active').eq('id',topicId).eq('active',true).maybeSingle();
    if(topicR.error)throw topicR.error;
    if(!topicR.data||topicR.data.subject_id!==subjectId)return new Response(JSON.stringify({error:'topic_outside_syllabus'}),{status:400,headers:cors});

    if(subtopicId){
      const subR=await db.from('topics').select('id,parent_topic_id,active,source_name,is_official_syllabus').eq('id',subtopicId).maybeSingle();
      if(subR.error)throw subR.error;
      const technical=subR.data?.source_name==='filter_subtopic'&&subR.data?.is_official_syllabus===true;
      if(!subR.data||subR.data.parent_topic_id!==topicId||!(subR.data.active===true||technical)){
        return new Response(JSON.stringify({error:'subtopic_outside_topic'}),{status:400,headers:cors});
      }
    }

    let idempotencyKey=String(body?.idempotency_key||req.headers.get('x-idempotency-key')||'').trim();
    if(idempotencyKey&&(idempotencyKey.length<16||idempotencyKey.length>128))return new Response(JSON.stringify({error:'invalid_idempotency_key'}),{status:400,headers:cors});
    if(!idempotencyKey){
      const bucket=Math.floor(practicedAt.getTime()/(10*60*1000));
      const material=JSON.stringify([user.id,sourceKind,subjectId,topicId,subtopicId||'',planItemId||'',sourceUrl||'',total,correct,confidence,duration,notes||'',bucket]);
      idempotencyKey='auto_'+await sha256(material);
    }

    const atomic=await db.rpc('record_external_practice_atomic_v433',{
      p_source_kind:sourceKind,p_subject_id:subjectId,p_topic_id:topicId,p_subtopic_id:subtopicId,p_plan_item_id:planItemId,
      p_source_url:sourceUrl,p_total_questions:total,p_correct_count:correct,p_confidence:confidence,p_duration_minutes:duration,
      p_notes:notes,p_practiced_at:practicedAt.toISOString(),p_idempotency_key:idempotencyKey
    });
    if(atomic.error)throw atomic.error;
    const saved=atomic.data||{};
    const accuracy=Math.round(correct/total*100);

    if(saved.duplicate!==true){
      const insight=await db.from('mentor_insights').insert({
        user_id:user.id,topic_id:topicId,insight_type:'external_practice',
        content:`Bateria ${sourceKind==='qconcursos'?'QConcursos':'externa'}: ${correct}/${total} (${accuracy}%) em ${topicR.data.title}.`,
        evidence_json:{source:'external_practice_v8',source_kind:sourceKind,syllabus_code:topicR.data.syllabus_code||'',subtopic_id:subtopicId,plan_item_id:planItemId,total_questions:total,correct_count:correct,accuracy,confidence,duration_minutes:duration,source_url:sourceUrl,batch_id:saved.batch_id,plan:saved.plan||null}
      });
      if(insight.error)console.warn('mentor_insight_not_saved',insight.error.message);
    }

    return new Response(JSON.stringify({ok:true,duplicate:saved.duplicate===true,batch_id:saved.batch_id,practiced_at:saved.practiced_at,topic_id:topicId,subtopic_id:subtopicId,plan_item_id:planItemId,total_questions:total,correct_count:correct,accuracy,plan:saved.plan||null}),{status:200,headers:cors});
  }catch(error){
    console.error('record-external-practice-v8',error);
    return new Response(JSON.stringify({error:'record_failed'}),{status:500,headers:cors});
  }
});
