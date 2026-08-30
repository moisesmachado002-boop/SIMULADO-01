import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForSelector('iframe#mentorFrame',{timeout:15000});
const frame=page.frames().find(f=>f.url().includes('mentor-v4.html'));
if(!frame)throw new Error('Mentor iframe did not load');
await frame.waitForSelector('#appShell',{timeout:30000});
await frame.waitForTimeout(3500);
if(await frame.locator('#mentorModuleError').count())throw new Error('A production module failed to load');
if(!(await frame.locator('[data-page="daily"]').count()))throw new Error('Daily navigation missing');
if(!(await frame.locator('[data-page="week"]').count()))throw new Error('Week navigation missing');
if(!(await frame.locator('#savePreferencesButton').count()))throw new Error('Schedule preferences button missing');

if(await frame.locator('#authModal.open').count())await frame.locator('#authClose').click();
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
if(!(await frame.locator('#mentorV500PlanUiScript').count()))throw new Error('V5 plan controller was not injected');
if(!(await frame.locator('#mentorV432DailyActionsScript').count()))throw new Error('Direct Daily actions were not injected');

const fatal=errors.filter(x=>!/Sessão expirada|Failed to fetch|NetworkError/i.test(x));
if(fatal.length)throw new Error('Browser page errors: '+fatal.join(' | '));
console.log('V5 browser smoke test passed');
await browser.close();
