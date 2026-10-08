import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'assets/avatar'),{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1040},acceptDownloads:true});
const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))errors.push(`${r.status()} ${r.url()}`);});
const url='http://127.0.0.1:8949/projects/009-sprite-destruction-lab/avatar/';
function check(name,pass,details=''){checks.push({name,passed:Boolean(pass),details});if(!pass)throw Error(`${name}: ${details}`);}
async function shot(name){await page.locator('#avatar-stage').screenshot({path:path.join(root,'assets/avatar',`${name}.png`)});}
async function state(){return page.evaluate(()=>avatarLab.getState());}
try{
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.avatarLab?.getState().home?.radius>10);
  check('Real article DOM and avatar home are present',await page.locator('[data-destructible]').count()===3&&(await state()).actor.phase==='home'&&await page.locator('#scene-source').isVisible());await shot('home');
  const original=await page.locator('#scene-source').textContent();await page.locator('#escape').click();
  await page.waitForFunction(()=>avatarLab.getState().actor.phase==='leaping');
  check('Same destruction engine prepares actual card textures',await page.evaluate(()=>avatarLab.engine instanceof Object&&avatarLab.engine.texture.width>0&&avatarLab.engine.tiles.length>100&&avatarLab.engine.interactive===false));
  await page.waitForFunction(()=>avatarLab.getState().actor.age>.3&&avatarLab.getState().actor.phase==='leaping');
  check('Avatar visibly leaves its original circular home',await page.evaluate(()=>{const {actor,home}=avatarLab.getState();return Math.abs(actor.x-home.x)>15&&actor.scale<home.radius/26;}));await shot('escape');
  await page.waitForFunction(()=>avatarLab.getState().actions===1,undefined,{timeout:12000});
  check('A character kick releases real Matter fragments',await page.evaluate(()=>avatarLab.getState().detached>0&&avatarLab.engine.tiles.filter(t=>t.detached).every(t=>!t.body.isStatic&&Number.isFinite(t.body.inertia))));await shot('kick');
  const before=await page.evaluate(()=>avatarLab.engine.tiles.filter(t=>t.detached).map(t=>({id:t.body.id,...t.body.position})));await page.waitForTimeout(200);
  check('Released card texture moves in the existing physics world',await page.evaluate(previous=>avatarLab.engine.tiles.filter(t=>t.detached).some(t=>{const p=previous.find(p=>p.id===t.body.id);return p&&Math.hypot(t.body.position.x-p.x,t.body.position.y-p.y)>3;}),before));
  check('First kick stays within its target card',await page.evaluate(()=>avatarLab.engine.tiles.filter(t=>t.tag==='second'||t.tag==='third').every(t=>!t.detached)));
  await page.waitForFunction(()=>avatarLab.getState().actor.phase==='idle');
  await page.locator('#mischief').click();await page.waitForFunction(()=>avatarLab.getState().actions===2,undefined,{timeout:10000});
  check('Next command reaches and breaks a different actual card',await page.evaluate(()=>avatarLab.events.filter(e=>e.type==='kick').map(e=>e.target).join(',')==='first,second'&&avatarLab.engine.tiles.some(t=>t.tag==='second'&&t.detached)));await shot('mischief');
  await page.locator('#recall').click();await page.waitForFunction(()=>avatarLab.getState().actor.phase==='home',undefined,{timeout:5000});
  check('Recall returns the avatar while preserving damage',await page.evaluate(()=>avatarLab.getState().detached>0&&Math.abs(avatarLab.getState().actor.x-avatarLab.getState().home.x)<1));await shot('returned');
  await page.locator('#restore').click();
  check('Restore disposes physics and returns the original live DOM',await page.evaluate(()=>!avatarLab.engine&&!document.getElementById('scene-source').inert&&document.getElementById('engine-canvas').hidden)&&await page.locator('#scene-source').textContent()===original);
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#835bb5';x.fillRect(0,0,64,64);x.fillStyle='#f9dec0';x.beginPath();x.arc(32,32,17,0,Math.PI*2);x.fill();return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#head-upload').setInputFiles({name:'my-avatar.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>avatarLab.getState().headUploaded);
  check('Actual user-supplied image becomes the character head',(await state()).headUploaded);await shot('uploaded-head');
  await page.locator('#escape').click();await page.waitForFunction(()=>avatarLab.getState().actions===1,undefined,{timeout:12000});
  check('Uploaded head uses the same jump and real kick workflow',(await state()).headUploaded&&(await state()).detached>0);
  await page.locator('#restore').click();await page.locator('#clear-head').click();check('Original character can be restored after upload',!(await state()).headUploaded);
  await page.locator('#escape').click();await page.waitForFunction(()=>avatarLab.getState().actor.phase==='leaping');await page.locator('#recall').click();await page.waitForFunction(()=>avatarLab.getState().actor.phase==='home');
  check('Recall interrupts an unfinished escape without a delayed kick',(await state()).actions===0);
  const pending=page.waitForEvent('download');await page.locator('#export-events').click();const download=await pending;const destination=path.join(root,'notes/avatar-sample-events.json');await download.saveAs(destination);const exported=JSON.parse(await readFile(destination,'utf8'));
  check('Downloaded record contains actual kick points and fragment releases',exported.engine==='DestructionEngine'&&exported.events.some(e=>e.type==='kick'&&e.released>0&&Number.isFinite(e.point.x)));
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
  check('Resize restores the scene and fits the mobile viewport',!(await state()).engine&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile-home');
  await page.locator('#escape').click();await page.waitForFunction(()=>avatarLab.getState().actions===1,undefined,{timeout:12000});
  check('Mobile escape also releases actual fragments',(await state()).detached>0);await shot('mobile-kick');
  await page.locator('#recall').click();await page.waitForFunction(()=>avatarLab.getState().actor.phase==='home');await page.locator('#restore').click();
  check('Mobile recall and restore leave usable source content',await page.locator('#scene-source').isVisible()&&!(await state()).engine);
  check('No uncaught browser errors or missing local assets',errors.length===0,JSON.stringify(errors));
}catch(error){checks.push({name:'Avatar browser run',passed:false,details:error.message,state:await state().catch(()=>null)});await page.screenshot({path:path.join(root,'assets/avatar/failure.png'),fullPage:true});process.exitCode=1;console.error(error);}
finally{await writeFile(path.join(root,'notes/avatar-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),url,browser:browser.version(),checks,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),errors},null,2));await browser.close();}
