import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];
let signupCalled=false;
page.on('pageerror',e=>errors.push(String(e)));

await page.route('https://api.pwnedpasswords.com/range/**',route=>route.fulfill({status:200,contentType:'text/plain',body:'1E4C9B93F3F0682250B6CF8331B7EE68FD8:999999\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0'}));
await page.route('https://uysrtgyfnwyocdlaeyum.supabase.co/auth/v1/signup',route=>{signupCalled=true;return route.fulfill({status:400,contentType:'application/json',body:'{"message":"signup should have been blocked by password security"}'});});

await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForSelector('iframe#mentorFrame',{timeout:15000});
await page.waitForTimeout(250);
const frame=page.frames().find(f=>f.url().includes('/v2.html'));
if(!frame)throw new Error('Consolidated V5.03 frame did not load v2.html directly');
if(page.frames().some(f=>f.url().includes('mentor-v4.html')))throw new Error('Legacy mentor-v4 bootstrap is still in the production frame chain');
await frame.waitForSelector('#appShell',{timeout:30000});
await frame.waitForTimeout(3800);
if(await frame.locator('#mentorModuleError').count())throw new Error('A production module failed to load');
if(!(await frame.locator('[data-page="daily"]').count()))throw new Error('Daily navigation missing');
if(!(await frame.locator('[data-page="week"]').count()))throw new Error('Week navigation missing');
if(!(await frame.locator('#savePreferencesButton').count()))throw new Error('Schedule preferences button missing');
if(!(await frame.locator('#mentorV503PasswordSecurityScript[data-loaded="1"]').count()))throw new Error('V5.03 password security module missing');

if(!(await frame.locator('#authModal.open').count()))await frame.locator('#accountButton').click();
if(frame.locator('#authModal').getAttribute('data-mode')!=='signup')await frame.locator('#authSwitch').click();
await frame.locator('#authEmail').fill('ci-password-test@example.invalid');
await frame.locator('#authPassword').fill('password');
await frame.locator('#authSubmit').click();
await frame.waitForFunction(()=>document.querySelector('#authMessage')?.textContent?.includes('vazamentos conhecidos'),null,{timeout:5000});
if(signupCalled)throw new Error('Compromised password reached Supabase signup endpoint');
if(!(await frame.locator('#authModal.open').count()))throw new Error('Compromised password unexpectedly closed signup modal');
await frame.locator('#authClose').click();

const planGroup=frame.locator('[data-v49-toggle="plan"]');
if(!(await planGroup.count()))throw new Error('Plan navigation group missing');
await planGroup.click();
const planNav=frame.locator('[data-v49-sub="plan"] [data-page="plan"]:visible').first();
if(!(await planNav.count()))throw new Error('Visible Plan navigation missing after opening group');
await planNav.click();
await frame.waitForTimeout(180);
if(!(await frame.locator('[data-page-view="plan"].active').count()))throw new Error('Plan navigation failed');
const weekNav=frame.locator('.v49-direct[data-page="week"]');
if(!(await weekNav.count()))throw new Error('Visible Week navigation missing');
await weekNav.click();
await frame.waitForTimeout(180);
if(!(await frame.locator('[data-page-view="week"].active').count()))throw new Error('Week navigation failed');

const forbidden=['mentorV47ControlsScript','mentorV428DailyGoalsScript','mentorV430PriorityPlannerScript','mentorV431WeekSummaryScript','mentorV415OverdueLockScript','mentorV416TimerReviewManualScript'];
for(const id of forbidden)if(await frame.locator('#'+id).count())throw new Error('Superseded planning/action module loaded: '+id);
const required=['mentorV503PasswordSecurityScript','mentorV500PlanUiScript','mentorV502QuestionExecutionScript','mentorV432DailyActionsScript'];
for(const id of required)if(!(await frame.locator('#'+id).count()))throw new Error('Required V5.03 module missing: '+id);

const fatal=errors.filter(x=>!/Sessão expirada|Failed to fetch|NetworkError/i.test(x));
if(fatal.length)throw new Error('Browser page errors: '+fatal.join(' | '));
console.log('V5.03 consolidated browser smoke and password breach test passed');
await browser.close();
