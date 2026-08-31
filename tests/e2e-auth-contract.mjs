import { chromium } from 'playwright';

const REF='uysrtgyfnwyocdlaeyum';
const USER='11111111-1111-4111-8111-111111111111';
const SUBJECT='22222222-2222-4222-8222-222222222222';
const TOPIC='33333333-3333-4333-8333-333333333333';
const QUESTION1='44444444-4444-4444-8444-444444444441';
const QUESTION2='44444444-4444-4444-8444-444444444442';
const TASK='55555555-5555-4555-8555-555555555555';
const now=new Date();
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const exp=4102444800;
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const accessToken=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:USER,email:'ci@mentor.local',role:'authenticated',aud:'authenticated',exp})}.ci`;
const user={id:USER,email:'ci@mentor.local',role:'authenticated',aud:'authenticated',user_metadata:{display_name:'Aluno CI'},app_metadata:{provider:'email',providers:['email']},created_at:'2026-01-01T00:00:00Z'};
const session={access_token:accessToken,refresh_token:'ci-refresh-token',expires_in:315360000,expires_at:exp,token_type:'bearer',user};

const subject={id:SUBJECT,name:'Direito Penal',position:8,syllabus_section:'Direito Penal',active:true};
const topic={id:TOPIC,subject_id:SUBJECT,parent_topic_id:null,title:'Aplicação da Lei Penal',position:10,syllabus_code:'DP-M1',weight:1,active:true,source_name:'Mentoria ZD',is_official_syllabus:false};
const questions=[
  {id:QUESTION1,exam_name:'Mentoria ZD',board:'FCC',year:2026,subject_id:SUBJECT,topic_id:TOPIC,subtopic_id:null,subject_label:'Direito Penal',topic_label:'Aplicação da Lei Penal',statement:'Questão CI 1',alternatives:{A:'Alternativa correta',B:'Alternativa incorreta',C:'Outra alternativa',D:'Outra alternativa',E:'Outra alternativa'},correct_answer:'A',explanation:'Explicação CI',option_explanations:{A:'Correta'},answer_key_note:null,difficulty:'hard',source_kind:'personal_module'},
  {id:QUESTION2,exam_name:'Mentoria ZD',board:'FCC',year:2026,subject_id:SUBJECT,topic_id:TOPIC,subtopic_id:null,subject_label:'Direito Penal',topic_label:'Aplicação da Lei Penal',statement:'Questão CI 2',alternatives:{A:'A',B:'B',C:'C',D:'D',E:'E'},correct_answer:'B',explanation:'Explicação CI 2',option_explanations:{B:'Correta'},answer_key_note:null,difficulty:'hard',source_kind:'personal_module'}
];
const prefs={user_id:USER,daily_minutes:240,study_days:[1,2,3,4,5,6],review_ratio:40,buffer_percent:15,timezone:'America/Bahia',updated_at:'2026-08-31T00:00:00Z'};
const plan=[{id:TASK,user_id:USER,topic_id:TOPIC,subtopic_id:null,scheduled_for:today,task_type:'questions',question_target:2,progress_count:0,duration_minutes:30,status:'pending',sort_order:120,source_reason:'v500_questions',completed_at:null,lifecycle_kind:'active'}];

let capturedPrefs=null;
let capturedProgress=null;
let attemptCalls=0;

function json(route,body,status=200,headers={}){
  return route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*',...headers},body:JSON.stringify(body)});
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));

await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:`sb-${REF}-auth-token`,value:session});

await page.route(new RegExp(`https://${REF}\\.supabase\\.co/.*`),async route=>{
  const req=route.request();
  const url=new URL(req.url());
  const path=url.pathname;
  const method=req.method();
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
  if(path==='/auth/v1/user')return json(route,user);
  if(path.startsWith('/auth/v1/token'))return json(route,session);
  if(path==='/functions/v1/mentor-analyze')return json(route,{ok:true,intent:'today',headline:'CI autenticado',summary:'Fluxo autenticado simulado.',next_action:'Continuar.',evidence_level:'medium',reasons:[],focus:[]});
  if(path==='/functions/v1/record-external-practice')return json(route,{ok:true,duplicate:false,plan:{completed:false,progress:1}});

  if(path.startsWith('/rest/v1/rpc/')){
    const name=path.split('/').pop();
    let body={};try{body=req.postDataJSON()||{};}catch{}
    if(name==='update_study_preferences_v434'){
      capturedPrefs=body;
      return json(route,{ok:true,preferences:{...prefs,daily_minutes:Number(body.p_daily_minutes||240)},planner:{status:'rebuilt',daily_cap_minutes:272}});
    }
    if(name==='rebuild_smart_week_v431')return json(route,{status:'rebuilt',daily_cap_minutes:204,inserted:0,superseded:0,reviews_remaining:0});
    if(name==='record_question_attempt_atomic'){
      attemptCalls++;
      return json(route,{ok:true,duplicate:false,is_correct:true,review_scheduled:true});
    }
    if(name==='record_plan_question_progress_v502'){
      capturedProgress=body;
      return json(route,{ok:true,changed:true,duplicate:false,progress:1,target:2,status:'in_progress'});
    }
    if(name==='complete_plan_item_v502')return json(route,{ok:true,duplicate:false,status:'completed'});
    if(name==='complete_topic_review_v432')return json(route,{ok:true,duplicate:false,reviews_completed:1});
    return json(route,[]);
  }

  if(path.startsWith('/rest/v1/')){
    const table=path.slice('/rest/v1/'.length).split('?')[0];
    const singular=(req.headers()['accept']||'').includes('application/vnd.pgrst.object+json');
    if(table==='profiles')return json(route,{id:USER,display_name:'Aluno CI'});
    if(table==='study_preferences')return json(route,prefs);
    if(table==='subjects')return json(route,[subject]);
    if(table==='topics')return json(route,[topic]);
    if(table==='question_attempts')return json(route,[]);
    if(table==='external_practice_batches')return json(route,[]);
    if(table==='study_sessions')return json(route,[]);
    if(table==='study_plan_items')return json(route,plan);
    if(table==='reviews')return json(route,[]);
    if(table==='external_source_links')return json(route,[]);
    if(table==='questions')return json(route,questions);
    if(table==='user_question_state')return json(route,[]);
    if(table==='user_topic_study_policy')return json(route,[]);
    if(table==='planner_subject_priority'||table==='planner_topic_priority')return json(route,[]);
    return json(route,singular?{}:[]);
  }
  return json(route,{});
});

await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForSelector('iframe#mentorFrame',{timeout:15000});
await page.waitForTimeout(500);
const frame=page.frames().find(f=>f.url().includes('/v2.html'));
if(!frame)throw new Error('Authenticated contract did not reach static v2.html core');
await frame.waitForSelector('#appShell',{timeout:30000});
await frame.waitForFunction(()=>document.querySelector('#accountName')?.textContent?.includes('Aluno CI'),null,{timeout:15000});
if(await frame.locator('#authModal.open').count())throw new Error('Authenticated fixture incorrectly opened login modal');
if(!(await frame.locator('#bankTopic option').filter({hasText:'Aplicação da Lei Penal'}).count()))throw new Error('Mentoria ZD topic is not available as a normal topic');

const planGroup=frame.locator('[data-v49-toggle="plan"]');
if(!(await planGroup.count()))throw new Error('Plan navigation group missing in authenticated flow');
await planGroup.click();
const planNav=frame.locator('[data-v49-sub="plan"] [data-page="plan"]:visible').first();
if(!(await planNav.count()))throw new Error('Visible Plan navigation missing in authenticated flow');
await planNav.click();
await frame.waitForTimeout(250);
await frame.locator('#prefDailyMinutes').fill('320');
await frame.locator('#savePreferencesButton').click();
for(let i=0;i<30&&!capturedPrefs;i++)await page.waitForTimeout(100);
if(!capturedPrefs)throw new Error('Saving preferences did not call update_study_preferences_v434');
if(Number(capturedPrefs.p_daily_minutes)!==320)throw new Error(`Expected 320 daily minutes, received ${capturedPrefs.p_daily_minutes}`);
if(!Array.isArray(capturedPrefs.p_study_days)||!capturedPrefs.p_study_days.length)throw new Error('Study days were not sent with preferences');

await page.waitForTimeout(1200);
await frame.waitForSelector('#mentorV432DailyActionsScript[data-loaded="1"]',{state:'attached',timeout:10000});
await frame.waitForSelector('#mentorV502QuestionExecutionScript[data-loaded="1"]',{state:'attached',timeout:10000});
const dailyNav=frame.locator('.v49-direct[data-page="daily"], [data-page="daily"]:visible').first();
if(!(await dailyNav.count()))throw new Error('Visible Daily navigation missing in authenticated flow');
await dailyNav.click();
const bankButton=frame.locator('[data-task-bank]:visible').first();
await bankButton.waitFor({state:'visible',timeout:8000});
await bankButton.click();
await frame.waitForSelector('#questionCard:not(.hidden)',{timeout:8000});
const qid=await frame.locator('#questionCard').getAttribute('data-question-id');
if(![QUESTION1,QUESTION2].includes(qid))throw new Error('Question technical id was not exposed by static core');
const correctAnswer=qid===QUESTION1?'A':'B';
await frame.locator(`#questionAnswers [data-answer="${correctAnswer}"]`).click();
await frame.locator('#questionConfirmButton').click();
for(let i=0;i<40&&!capturedProgress;i++)await page.waitForTimeout(100);
if(attemptCalls<1)throw new Error('Question attempt RPC was not called');
if(!capturedProgress)throw new Error('Unique plan evidence RPC was not called after answering');
if(capturedProgress.p_plan_item_id!==TASK)throw new Error('Question evidence was attached to the wrong plan item');
if(capturedProgress.p_question_id!==qid)throw new Error('Question evidence did not preserve the answered question id');

const fatal=errors.filter(x=>!/Failed to fetch|NetworkError|ResizeObserver loop/i.test(x));
if(fatal.length)throw new Error('Authenticated browser page errors: '+fatal.join(' | '));
console.log('V5.03 authenticated browser contract passed');
await browser.close();
