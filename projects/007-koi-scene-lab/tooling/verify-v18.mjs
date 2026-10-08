// Existing user authorization covers isolated localhost UI acceptance.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
if(!process.argv.includes('--approved-local-browser'))throw new Error('Local-browser authorization flag required.');
const expected=process.argv.find(arg=>arg.startsWith('--expected-bundle='))?.split('=')[1];
assert.match(expected??'',/^[0-9a-f]{64}$/);
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bundle=sha(await readFile(root+'web/app.js'));assert.equal(bundle,expected);
const scriptSha256=sha(await readFile(fileURLToPath(import.meta.url)));
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const checks=[],captures=[],errors=[],consoleErrors=[],externalRequests=[];
let browser,page;
const checkpoint=()=>writeFileSync(root+'notes/browser-v18-progress.json',JSON.stringify({status:'running_not_final',bundleSha256:bundle,checks,captures,errors,consoleErrors,externalRequests},null,2)+'\n');
const check=(name,condition,evidence)=>{checks.push({name,passed:!!condition,...evidence===undefined?{}:{evidence}});checkpoint();assert.ok(condition,name);console.log('PASS '+name);};
const counts=()=>page.locator('#feeding-counts').innerText();
const paused=()=>page.locator('#pause-toggle').getAttribute('aria-pressed');
async function capture(name){await page.screenshot({path:root+'assets/'+name,type:'jpeg',quality:90});captures.push('assets/'+name);checkpoint();}
async function point(){await page.locator('#viewport').scrollIntoViewIfNeeded();const box=await page.locator('#scene-canvas').boundingBox();assert.ok(box);return {x:box.x+box.width*.45,y:box.y+box.height*.47};}
try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1,hasTouch:true});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{window.__localQaContextEvents=[];for(const type of ['webglcontextlost','webglcontextrestored'])window.addEventListener(type,()=>window.__localQaContextEvents.push(type),true);});
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol)||url.origin==='http://127.0.0.1:8947')return route.continue();externalRequests.push(url.href);return route.abort();});
 await page.goto('http://127.0.0.1:8947/?v='+bundle.slice(0,8)+'#scene',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('scene-loader')?.hidden);
 check('current scene initializes with seven fish and no stale feeding round',await page.locator('#setting-fishCount').inputValue()==='7'&&!await page.locator('#feeding-feedback').isVisible());
 await page.locator('#scene-canvas').focus();await page.keyboard.press('Space');
 check('focused canvas Space pauses simulation',await paused()==='true');
 await page.keyboard.down('v');await page.keyboard.down('v');await page.keyboard.up('v');
 check('held V toggles clean view only once',await page.locator('body').evaluate(el=>el.classList.contains('clean-scene')));
 await page.keyboard.press('Escape');
 check('Escape restores the normal controls',!await page.locator('body').evaluate(el=>el.classList.contains('clean-scene')));
 await page.keyboard.press('Control+v');
 check('browser modifier combinations do not toggle clean view',!await page.locator('body').evaluate(el=>el.classList.contains('clean-scene')));
 await page.locator('#pause-toggle').focus();await page.keyboard.press('e');await page.keyboard.press('g');
 check('letter keys on another page control do not start interaction',!await page.locator('#feeding-feedback').isVisible()&&!await page.locator('#stop-interaction').isVisible());
 await page.locator('#show-reference').click();await page.keyboard.press('e');
 check('reference modal keeps scene shortcuts inactive',await page.locator('#reference-dialog').evaluate(el=>el.open)&&!await page.locator('#feeding-feedback').isVisible());
 await page.keyboard.press('Escape');await page.locator('#scene-canvas').focus();await page.keyboard.press('e');await page.keyboard.press('Space');
 check('focused E starts a real feed and Space freezes that hand',await page.locator('#feeding-stop').isVisible()&&await paused()==='true');
 const frozen=await counts(),p=await point();await page.mouse.click(p.x,p.y);
 check('a native mouse click keeps the paused feed and its record',await page.locator('#feeding-stop').isVisible()&&await counts()===frozen,{counts:frozen});
 check('clicking the scene gives the canvas keyboard focus',await page.evaluate(()=>document.activeElement?.id)==='scene-canvas');
 await page.locator('#feeding-stop').focus();await page.keyboard.press('Enter');
 check('withdrawing a focused hand keeps focus on an available feedback action',!await page.locator('#feeding-stop').isVisible()&&await page.evaluate(()=>document.activeElement?.id)==='feeding-pause');
 await page.locator('#feeding-again').click();await page.locator('#feeding-pause').click();
 const beforeDrag=await counts(),drag=await point();await page.mouse.move(drag.x,drag.y);await page.mouse.down();await page.mouse.move(drag.x+40,drag.y-20,{steps:4});await page.mouse.up();
 check('actual mouse drag exits feeding while keeping released-pellet counts',!await page.locator('#feeding-stop').isVisible()&&await counts()===beforeDrag);
 await page.setViewportSize({width:390,height:844});await page.locator('#feeding-again').click();await page.locator('#feeding-pause').click();
 const beforeTap=await counts(),tap=await point();await page.touchscreen.tap(tap.x,tap.y);
 check('native mobile touch tap keeps the paused feed and its record',await page.locator('#feeding-stop').isVisible()&&await counts()===beforeTap);
 const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,buttons:[...document.querySelectorAll('.feeding-actions button')].filter(el=>!el.hidden).map(el=>{const r=el.getBoundingClientRect();return {id:el.id,width:r.width,height:r.height};})}));
 check('mobile page has no overflow and feedback targets remain at least 44px',geometry.width<=geometry.viewport&&geometry.buttons.length===3&&geometry.buttons.every(b=>b.width>=44&&b.height>=44),geometry);
 await page.locator('#feeding-feedback').scrollIntoViewIfNeeded();await capture('feeding-mobile-v18.jpg');
 const mobilePoint=await point();await page.mouse.move(mobilePoint.x,mobilePoint.y);await page.mouse.wheel(0,100);
 check('native wheel zoom exits feeding',!await page.locator('#feeding-stop').isVisible());
 await page.setViewportSize({width:1280,height:960});await page.locator('#reset').click();await page.locator('#pause-toggle').click();
 if(!await page.locator('#glb-panel').evaluate(el=>el.open))await page.locator('#glb-panel > summary').click();
 for(const name of ['hand-right.glb','binding-example.glb','hand-right.glb']){
  await page.locator('#model-file').setInputFiles(root+'web/assets/'+name);
  await page.waitForFunction(name=>document.getElementById('model-status')?.textContent==='当前模型：'+name,name);
  check('native GLB replacement renders '+name,!await page.locator('#scene-loader').isVisible()&&!await page.locator('#feed').isEnabled());
 }
 await page.locator('#clear-model').click();await page.waitForFunction(()=>document.getElementById('model-status')?.textContent==='尚未导入模型');
 check('clearing a textured skinned import returns to the usable courtyard',await page.locator('#feed').isEnabled()&&!await page.locator('#feeding-feedback').isVisible());
 if(await page.locator('#glb-panel').evaluate(el=>el.open))await page.locator('#glb-panel > summary').click();
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('courtyard-desktop-v18.jpg');
 await page.locator('#scene-canvas').focus();await page.keyboard.press('e');await page.keyboard.press('Space');await point();await capture('feeding-desktop-v18.jpg');
 await page.locator('#feeding-stop').click();await page.locator('#reset').click();
 const state=await page.evaluate(()=>({loaderHidden:document.getElementById('scene-loader')?.hidden,events:window.__localQaContextEvents}));
 check('scene remains active with no unintended context loss',state.loaderHidden&&state.events.length===0,state);
 check('no page, shader-console or external-request errors',errors.length===0&&consoleErrors.length===0&&externalRequests.length===0,{errors,consoleErrors,externalRequests});
}catch(error){if(!checks.some(c=>!c.passed))checks.push({name:'browser execution',passed:false,error:error.message});if(page)try{await capture('failure-v18.jpg');}catch{}throw error;}
finally{
 let contextEvents=[];if(page)try{contextEvents=await page.evaluate(()=>window.__localQaContextEvents??[]);}catch{}
 const record={date:new Date().toISOString(),version:18,bundleSha256:bundle,scriptSha256,authorization:'Continuing user-authorized isolated localhost browser QA.',method:'Real isolated Chromium UI keyboard/mouse/touch actions; read-only DOM and canvas-event observations. Software-capable WebGL. No GPU-memory measurement; context recovery not rerun here.',checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,captures,errors,consoleErrors,externalRequests,contextEvents};
 await writeFile(root+'notes/browser-v18-validation.json',JSON.stringify(record,null,2)+'\n');checkpoint();
 if(browser)await browser.close();
}
