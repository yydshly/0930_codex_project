import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.RESEARCH_URL||'https://yydshly.github.io/0930_codex_project/projects/009-sprite-destruction-lab/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1020},acceptDownloads:true});
const checks=[],errors=[];const cache=path.resolve(root,'../../.cache/sprite-experience');await mkdir(cache,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(`${r.status()} ${r.url()}`);});
function check(name,passed,details=''){checks.push({name,passed:Boolean(passed),details});if(!passed)throw Error(`${name}: ${details}`);}
async function goto(relative){await page.goto(new URL(relative,base).href,{waitUntil:'networkidle'});}
try{
  await goto('avatar-anywhere/#proof');
  await page.waitForFunction(()=>Number.isFinite(document.querySelector('video').duration));
  const video=await page.locator('video').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
  check('Actual GitHub recording has playable duration and dimensions',video.duration>15&&video.duration<16&&video.width===1440,JSON.stringify(video));
  await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>.25);
  check('Published recording actually plays',await page.locator('video').evaluate(v=>v.currentTime>0));
  await page.locator('video').evaluate(v=>v.pause());
  const before=await page.locator('[data-demo-card]').textContent();await page.locator('#launch-demo').click();
  const host=page.locator('#avatar-anywhere-host');
  await host.locator('#pick-avatar').click();let rect=await page.locator('[data-demo-avatar]').boundingBox();await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
  await host.locator('#pick-target').click();rect=await page.locator('[data-demo-card]').boundingBox();await page.mouse.click(rect.x+20,rect.y+20);
  await host.locator('#escape').click();await page.waitForFunction(()=>AvatarAnywhere.getState().engine?.hits>0,undefined,{timeout:20000});
  check('Public demo takes page pixels and releases real fragments',await page.evaluate(()=>AvatarAnywhere.engine.texture.width>0&&AvatarAnywhere.engine.tiles.some(t=>t.detached)));
  await host.locator('#restore').click();
  check('Public demo restores the original content',await page.locator('[data-demo-card]').textContent()===before&&await page.evaluate(()=>AvatarAnywhere.getState().engine===null));
  await host.locator('#close').click();
  await goto('avatar/');await page.waitForFunction(()=>window.avatarLab?.getState().home?.radius>10);
  await page.locator('#escape').click();await page.waitForFunction(()=>avatarLab.getState().actions===1,undefined,{timeout:16000});
  check('Avatar escape kicks actual Matter bodies',await page.evaluate(()=>avatarLab.getState().detached>0&&avatarLab.engine.tiles.filter(t=>t.detached).every(t=>Number.isFinite(t.body.position.x))));
  await page.locator('#restore').click();check('Avatar restores its page',await page.evaluate(()=>avatarLab.getState().engine===null&&avatarLab.getState().actor.phase==='home'));
  await goto('products/#motion');await page.waitForFunction(()=>window.forma?.tool==='motion');
  await page.locator('#motion-play').click();await page.waitForFunction(()=>forma.engine?.getState().hits>0,undefined,{timeout:15000});
  check('Content motion editor animates actual content',await page.evaluate(()=>forma.engine.getState().ratio>0));
  await page.locator('#motion-reset').click();
  const pending=page.waitForEvent('download');await page.locator('#motion-png').click();const download=await pending;const file=path.join(cache,'motion.png');await download.saveAs(file);
  check('Live editor generates a real PNG download',(await readFile(file)).subarray(1,4).toString()==='PNG');
  await goto('toolbox/#tables');await page.waitForFunction(()=>window.FormaToolbox?.getState().matrix?.length>1);
  const table=await page.evaluate(()=>FormaToolbox.getState());
  check('Toolbox reads the real deployed catalog table',table.tab==='tables'&&table.matrix.length>8&&table.matrix.some(row=>row.includes('009')));
  await page.evaluate(()=>location.hash='notes');await page.waitForFunction(()=>FormaToolbox.getState().tab==='notes');
  check('Toolbox switches to the source-note route',await page.evaluate(()=>FormaToolbox.getState().tab==='notes'));
  check('No uncaught browser errors or failed own-site resources',errors.length===0,JSON.stringify(errors));
}catch(error){checks.push({name:'Published experience run',passed:false,details:error.message});process.exitCode=1;await page.screenshot({path:path.join(cache,'failure.png'),fullPage:true});}
finally{await writeFile(path.join(root,'notes',process.env.EXPERIENCE_REPORT||'publication-experience-online.json'),JSON.stringify({checkedAt:new Date().toISOString(),url:base,checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,failed:checks.filter(c=>!c.passed),errors},null,2));await browser.close();}
