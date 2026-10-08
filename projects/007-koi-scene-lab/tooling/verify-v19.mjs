// Existing user authorization covers isolated localhost UI acceptance.
// The only injected state is a QA list of WebGL context events. Application
// actions use native UI; runtime observations below never mutate the scene.
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
const started=Date.now(),checks=[],captures=[],errors=[],consoleErrors=[],externalRequests=[],phaseObservations=[];
let browser,page,completed=false;
const checkpoint=()=>writeFileSync(root+'notes/browser-v19-progress.json',JSON.stringify({status:completed?'completed_see_final_record':'running_not_final',bundleSha256:bundle,elapsedMs:Date.now()-started,checks,captures,errors,consoleErrors,externalRequests,phaseObservations},null,2)+'\n');
const check=(name,condition,evidence)=>{checks.push({name,passed:!!condition,elapsedMs:Date.now()-started,...evidence===undefined?{}:{evidence}});checkpoint();assert.ok(condition,name);console.log('PASS '+name);};
const paused=()=>page.locator('#pause-toggle').getAttribute('aria-pressed');
const feedingCounts=()=>page.locator('#feeding-counts').innerText();
const startlePhase=()=>page.locator('#startle-feedback [aria-current="step"]').getAttribute('data-reaction-phase');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function capture(name){await page.screenshot({path:root+'assets/'+name,type:'jpeg',quality:90});captures.push('assets/'+name);checkpoint();}
async function focusCanvas(){await page.locator('#scene-canvas').scrollIntoViewIfNeeded();await page.locator('#scene-canvas').focus();}
async function setPause(value){if(await paused()!==String(value))await page.locator('#pause-toggle').click();assert.equal(await paused(),String(value));}
async function reset(){await page.locator('#reset').click();await page.waitForFunction(()=>document.getElementById('setting-fishCount')?.value==='7'&&document.getElementById('pause-toggle')?.getAttribute('aria-pressed')==='false');}
async function snapshot(){return page.evaluate(()=>{const c=window.__courtyard,cat=c?.animals.cat;if(!c)return null;return {time:c.time,paused:c.settings.paused,fishCount:c.settings.fishCount,mode:c.interaction.mode,startle:c.school.startleState,cat:cat?{state:cat.state,timer:cat.timer,patrolCount:cat.patrolCount,pose:cat.poseNodes().map(n=>({name:n.name,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray(),visible:n.visible}))}:null,fish:c.school.fish.slice(0,c.settings.fishCount).map(f=>({id:f.id,position:f.group.position.toArray(),heading:f.heading,speed:f.speed}))};});}
async function waitPhase(phase){await page.waitForFunction(phase=>document.querySelector('#startle-feedback [aria-current="step"]')?.dataset.reactionPhase===phase,phase,{timeout:180000,polling:100});const state=await snapshot();phaseObservations.push({phase,elapsedMs:Date.now()-started,state});checkpoint();return state;}
async function catFraming(){return page.evaluate(()=>{const c=window.__courtyard,cat=c?.animals.cat;if(!cat)return null;const V=cat.root.position.constructor,p=new V(),bounds={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};let count=0;const walk=node=>{if(!node.visible)return;if(node.isMesh&&node.geometry?.attributes.position){const n=node.geometry.attributes.position.count;for(let i=0;i<n;i++){node.getVertexPosition(i,p);p.applyMatrix4(node.matrixWorld).project(c.camera);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;bounds.left=Math.min(bounds.left,p.x);bounds.right=Math.max(bounds.right,p.x);bounds.bottom=Math.min(bounds.bottom,p.y);bounds.top=Math.max(bounds.top,p.y);count++;}}for(const child of node.children)walk(child);};walk(cat.root);return {bounds,meshVertexCount:count,aspect:c.camera.aspect,viewport:{width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth},method:'Read-only projection of actual mesh vertices, including getVertexPosition on the skinned tail. Fur shader displacement and line whiskers are not included.'};});}
async function checkFraming(name){await page.waitForFunction(()=>window.__courtyard?.followAnimal==='cat'&&!window.__courtyard?.transition,{},{timeout:180000,polling:100});await delay(500);const frame=await catFraming();check(name,frame?.meshVertexCount>0&&frame.bounds.left>=-.99&&frame.bounds.right<=.99&&frame.bounds.bottom>=-.99&&frame.bounds.top<=.99,frame);return frame;}

try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1,hasTouch:true});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{window.__localQaContextEvents=[];for(const type of ['webglcontextlost','webglcontextrestored'])window.addEventListener(type,()=>window.__localQaContextEvents.push(type),true);});
 page.on('pageerror',error=>{errors.push(error.message);checkpoint();});page.on('console',message=>{if(message.type()==='error'){consoleErrors.push(message.text());checkpoint();}});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol)||url.origin==='http://127.0.0.1:8947')return route.continue();externalRequests.push(url.href);return route.abort();});
 await page.goto('http://127.0.0.1:8947/?v='+bundle.slice(0,8)+'#scene',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('scene-loader')?.hidden&&window.__courtyard?.animals.cat);
 check('v19 courtyard initializes with seven fish, cat controls and no stale interaction',await page.locator('#setting-fishCount').inputValue()==='7'&&await page.locator('#cat-observe').isEnabled()&&await page.locator('#view-select option[value="cat"]').count()===1&&!await page.locator('#startle-feedback').isVisible()&&!await page.locator('#feeding-feedback').isVisible());

 await page.locator('#cat-observe').click();
 await page.waitForFunction(()=>document.getElementById('cat-status')?.dataset.state==='walk',{timeout:180000,polling:100});
 const walking=await snapshot();
 check('native cat patrol action reaches walking state and selects cat view',walking.cat?.state==='walk'&&await page.locator('#view-select').inputValue()==='cat',walking.cat);
 await setPause(true);await checkFraming('desktop cat camera contains the actual cat mesh');
 const catFrozen=await snapshot();await delay(1400);const catFrozenLater=await snapshot();
 check('UI pause freezes cat limbs, tail, pose and simulation time',catFrozen.paused&&catFrozen.time===catFrozenLater.time&&JSON.stringify(catFrozen.cat)===JSON.stringify(catFrozenLater.cat),{before:catFrozen.cat,after:catFrozenLater.cat,time:catFrozen.time});
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('cat-desktop-v19.jpg');
 await page.setViewportSize({width:390,height:844});await page.locator('#view-select').selectOption('cat');await checkFraming('mobile cat camera contains the actual cat mesh');
 const mobile=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,actions:[...document.querySelectorAll('.animal-actions button')].map(el=>{const r=el.getBoundingClientRect();return {name:el.textContent,width:r.width,height:r.height};})}));
 check('mobile wildlife controls have no page overflow and provide 44px targets',mobile.width<=mobile.viewport&&mobile.actions.length===4&&mobile.actions.every(b=>b.width>=44&&b.height>=44),mobile);
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('cat-mobile-v19.jpg');
 await setPause(false);await page.waitForFunction(()=>document.getElementById('cat-status')?.dataset.state==='sit',{timeout:180000,polling:100});
 check('cat completes a dry-land patrol and begins sitting through simulation',await page.locator('#cat-status').getAttribute('data-state')==='sit',(await snapshot()).cat);

 await page.setViewportSize({width:1280,height:960});await reset();await focusCanvas();await page.keyboard.press('g');
 check('native focused G starts the near-hand reaction without changing fish count',await page.locator('#startle-feedback').isVisible()&&await page.locator('#setting-fishCount').inputValue()==='7'&&(await snapshot()).mode==='stroke');
 const alert=await waitPhase('alert');check('hand approach exposes the alert phase before scattering',alert.startle.phase==='alert'&&alert.startle.alertFish>0,alert.startle);
 const startled=await waitPhase('startled');check('one near-hand stimulus scatters at least one fish',startled.startle.triggerCount===1&&startled.startle.affectedFish>0&&startled.startle.intensity>0,startled.startle);
 await focusCanvas();await page.keyboard.press('Space');const startleFrozen=await snapshot();
 check('native Space pauses the ongoing startled or recovering response',startleFrozen.paused&&['startled','recovering'].includes(startleFrozen.startle.phase)&&await page.locator('#startle-status').innerText().then(t=>t.includes('已暂停')),startleFrozen.startle);
 await delay(1400);const startleFrozenLater=await snapshot();
 check('paused response preserves fish poses, threat memory and simulation time',startleFrozen.time===startleFrozenLater.time&&JSON.stringify(startleFrozen.startle)===JSON.stringify(startleFrozenLater.startle)&&JSON.stringify(startleFrozen.fish)===JSON.stringify(startleFrozenLater.fish),{phase:startleFrozen.startle.phase,remaining:startleFrozen.startle.remaining,time:startleFrozen.time});
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('startle-desktop-v19.jpg');
 await setPause(false);const recovering=await waitPhase('recovering');
 check('response transitions to recovery with a decreasing intensity',recovering.startle.triggerCount===1&&recovering.startle.intensity<1,recovering.startle);
 const recovered=await waitPhase('idle');
 check('response naturally returns to calm without repeating the stimulus',recovered.startle.triggerCount===1&&recovered.startle.affectedFish===0&&recovered.startle.intensity===0&&recovered.mode==='idle',recovered.startle);
 await reset();check('reset clears the threat record and reaction panel',!await page.locator('#startle-feedback').isVisible()&&(await snapshot()).startle.triggerCount===0);

 await page.locator('#setting-fishCount').focus();await page.keyboard.press('Home');await focusCanvas();await page.keyboard.press('g');
 const noFish=await snapshot();
 check('zero-fish native G is rejected without adding fish or a hand',noFish.fishCount===0&&noFish.mode==='idle'&&noFish.startle.triggerCount===0&&!await page.locator('#startle-feedback').isVisible()&&await page.locator('#fish-subject option').count()===0,{fishCount:noFish.fishCount,mode:noFish.mode,message:await page.locator('#scene-toast').innerText()});

 await reset();await focusCanvas();await page.keyboard.press('e');
 await page.waitForFunction(()=>document.getElementById('feeding-counts')?.textContent.includes('本轮释放 6/6 粒'),{},{timeout:180000,polling:100});
 await setPause(true);const feedRecord=await feedingCounts();
 check('normal native feeding still releases exactly six grains',feedRecord.includes('本轮释放 6/6 粒'),{counts:feedRecord});
 await page.locator('#viewport').scrollIntoViewIfNeeded();const box=await page.locator('#scene-canvas').boundingBox();assert.ok(box);await page.mouse.click(box.x+box.width*.45,box.y+box.height*.47);
 check('native click preserves the paused feeding record and current hand state',await feedingCounts()===feedRecord&&(await snapshot()).mode==='feed'&&await paused()==='true',{counts:await feedingCounts()});
 await focusCanvas();await page.keyboard.press('Escape');await reset();
 if(!await page.locator('#glb-panel').evaluate(el=>el.open))await page.locator('#glb-panel > summary').click();
 await page.locator('#model-file').setInputFiles(root+'web/assets/binding-example.glb');
 await page.waitForFunction(()=>document.getElementById('model-status')?.textContent==='当前模型：binding-example.glb');
 check('unbound imported model disables cat and near-hand controls and hides reaction feedback',!await page.locator('#cat-observe').isEnabled()&&!await page.locator('#stroke').isEnabled()&&await page.locator('#view-select option[value="cat"]').isDisabled()&&!await page.locator('#startle-feedback').isVisible());
 await page.locator('#clear-model').click();await page.waitForFunction(()=>document.getElementById('model-status')?.textContent==='尚未导入模型');
 check('clearing imported model restores cat and hand controls with empty threat memory',await page.locator('#cat-observe').isEnabled()&&await page.locator('#stroke').isEnabled()&&(await snapshot()).startle.triggerCount===0&&!await page.locator('#startle-feedback').isVisible());
 if(await page.locator('#glb-panel').evaluate(el=>el.open))await page.locator('#glb-panel > summary').click();
 await page.locator('#principle-select').selectOption('startle');
 check('new reaction principle explains rule depth and links a usable native demo',await page.locator('#principle-method').innerText().then(t=>/距离|阈值|状态|刺激/.test(t))&&await page.locator('#principle-demo').isEnabled());
 const contextEvents=await page.evaluate(()=>window.__localQaContextEvents??[]);
 check('no unintended context loss or restoration occurred',contextEvents.length===0,{contextEvents});
 check('no page, shader-console or external-request errors occurred',errors.length===0&&consoleErrors.length===0&&externalRequests.length===0,{errors,consoleErrors,externalRequests});
 completed=true;
}catch(error){if(!checks.some(c=>!c.passed))checks.push({name:'browser execution',passed:false,elapsedMs:Date.now()-started,error:error.message});if(page)try{await capture('failure-v19.jpg');}catch{}throw error;}
finally{
 let contextEvents=[];if(page)try{contextEvents=await page.evaluate(()=>window.__localQaContextEvents??[]);}catch{}
 const record={date:new Date().toISOString(),version:19,status:completed?'completed':'failed',bundleSha256:bundle,scriptSha256,elapsedMs:Date.now()-started,authorization:'Continuing user-authorized isolated localhost browser QA.',method:'Real isolated Chromium keyboard/mouse UI actions and desktop/mobile viewport resizing; DOM and read-only runtime observations of scene pose, time and threat memory. Raw native screenshots. Software-capable WebGL; no GPU-memory or hardware-performance measurement. This is focused v19 wildlife/reaction acceptance; v18 checks are not claimed as rerun.',checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,captures,phaseObservations,errors,consoleErrors,externalRequests,contextEvents};
 await writeFile(root+'notes/browser-v19-validation.json',JSON.stringify(record,null,2)+'\n');checkpoint();
 if(browser)await browser.close();
}
