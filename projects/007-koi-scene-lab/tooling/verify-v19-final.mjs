// Continuing user-authorized isolated localhost browser QA.
// Native UI changes application state. The injected observer only records DOM
// phases and read-only runtime observations in QA-owned arrays.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
if(!process.argv.includes('--approved-local-browser'))throw new Error('Local-browser authorization flag required.');
const expected=process.argv.find(arg=>arg.startsWith('--expected-bundle='))?.split('=')[1];assert.match(expected??'',/^[0-9a-f]{64}$/);
const root=fileURLToPath(new URL('../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bundle=sha(await readFile(root+'web/app.js'));assert.equal(bundle,expected);
const scriptSha256=sha(await readFile(fileURLToPath(import.meta.url)));
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const started=Date.now(),checks=[],captures=[],errors=[],consoleErrors=[],externalRequests=[];
let browser,page,completed=false,servedBundleSha256=null;
const checkpoint=()=>writeFileSync(root+'notes/browser-v19-final-progress.json',JSON.stringify({status:completed?'completed_see_final_record':'running_not_final',bundleSha256:bundle,servedBundleSha256,elapsedMs:Date.now()-started,checks,captures,errors,consoleErrors,externalRequests},null,2)+'\n');
const check=(name,condition,evidence)=>{checks.push({name,passed:!!condition,elapsedMs:Date.now()-started,...evidence===undefined?{}:{evidence}});checkpoint();assert.ok(condition,name);console.log('PASS '+name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function capture(name){await page.screenshot({path:root+'assets/'+name,type:'jpeg',quality:90});captures.push('assets/'+name);checkpoint();}
async function focusCanvas(){await page.locator('#scene-canvas').scrollIntoViewIfNeeded();await page.locator('#scene-canvas').focus();}
async function setPause(value){if(await page.locator('#pause-toggle').getAttribute('aria-pressed')!==String(value)){await focusCanvas();await page.keyboard.press('Space');}assert.equal(await page.locator('#pause-toggle').getAttribute('aria-pressed'),String(value));}
async function snapshot(){return page.evaluate(()=>{const c=window.__courtyard,cat=c?.animals.cat;if(!c)return null;return {time:c.time,paused:c.settings.paused,fishCount:c.settings.fishCount,mode:c.interaction.mode,startle:c.school.startleState,cat:cat?{state:cat.state,timer:cat.timer,patrolCount:cat.patrolCount,pose:cat.poseNodes().map(n=>({name:n.name,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray(),visible:n.visible}))}:null,fish:c.school.fish.slice(0,c.settings.fishCount).map(f=>({id:f.id,position:f.group.position.toArray(),heading:f.heading,speed:f.speed}))};});}
async function catFraming(){await page.waitForFunction(()=>window.__courtyard?.followAnimal==='cat'&&!window.__courtyard?.transition,{},{timeout:180000,polling:100});return page.evaluate(()=>{const c=window.__courtyard,cat=c.animals.cat,V=cat.root.position.constructor,p=new V(),bounds={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};let count=0;const walk=node=>{if(!node.visible)return;if(node.isMesh&&node.geometry?.attributes.position)for(let i=0;i<node.geometry.attributes.position.count;i++){node.getVertexPosition(i,p);p.applyMatrix4(node.matrixWorld).project(c.camera);bounds.left=Math.min(bounds.left,p.x);bounds.right=Math.max(bounds.right,p.x);bounds.bottom=Math.min(bounds.bottom,p.y);bounds.top=Math.max(bounds.top,p.y);count++;}for(const child of node.children)walk(child);};walk(cat.root);return {bounds,meshVertexCount:count,aspect:c.camera.aspect,method:'Read-only actual mesh vertex projection, including the skinned tail. Shader fur displacement and line whiskers are excluded.'};});}
const framed=frame=>frame.meshVertexCount>0&&frame.bounds.left>=-.99&&frame.bounds.right<=.99&&frame.bounds.bottom>=-.99&&frame.bounds.top<=.99;

try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1,hasTouch:true});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{
  window.__localQaContextEvents=[];window.__localQaPhaseEvents=[];
  for(const type of ['webglcontextlost','webglcontextrestored'])window.addEventListener(type,()=>window.__localQaContextEvents.push(type),true);
  let last='';
  const observe=()=>{const panel=document.getElementById('startle-feedback'),phase=panel?.querySelector('[aria-current="step"]')?.dataset.reactionPhase;if(!panel||panel.hidden||!phase||phase===last)return;last=phase;const state=window.__courtyard?.school?.startleState;window.__localQaPhaseEvents.push({phase,wallTimeMs:performance.now(),status:document.getElementById('startle-status')?.textContent,counts:document.getElementById('startle-counts')?.textContent,simulationTime:window.__courtyard?.time,startle:state?JSON.parse(JSON.stringify(state)):null});};
  new MutationObserver(observe).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-current','hidden']});
 });
 page.on('pageerror',error=>{errors.push(error.message);checkpoint();});page.on('console',message=>{if(message.type()==='error'){consoleErrors.push(message.text());checkpoint();}});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol)||url.origin==='http://127.0.0.1:8947')return route.continue();externalRequests.push(url.href);return route.abort();});
 const servedBundle=new Promise((resolve,reject)=>page.on('response',response=>{if(new URL(response.url()).pathname==='/app.js')response.body().then(bytes=>{servedBundleSha256=sha(bytes);resolve();},reject);}));
 await page.goto('http://127.0.0.1:8947/?v='+bundle.slice(0,8)+'#scene',{waitUntil:'domcontentloaded'});await servedBundle;
 await page.waitForFunction(()=>document.getElementById('scene-loader')?.hidden&&window.__courtyard?.animals.cat);
 check('final bundle is served exactly and initializes cat, seven fish and empty feedback',servedBundleSha256===bundle&&await page.locator('#cat-observe').isEnabled()&&await page.locator('#setting-fishCount').inputValue()==='7'&&!await page.locator('#startle-feedback').isVisible()&&!await page.locator('#feeding-feedback').isVisible(),{bundleSha256:bundle,servedBundleSha256});
 await setPause(true);await page.locator('#view-select').selectOption('cat');const desktop=await catFraming();
 check('final desktop cat view frames actual body, limbs and skinned tail while paused',framed(desktop)&&(await snapshot()).paused,desktop);
 const catBefore=await snapshot();await delay(1300);const catAfter=await snapshot();
 check('final UI pause preserves the cat pose and simulation time',catBefore.time===catAfter.time&&JSON.stringify(catBefore.cat)===JSON.stringify(catAfter.cat),{state:catBefore.cat.state,poseNodes:catBefore.cat.pose.length,time:catBefore.time});
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('cat-desktop-v19-final.jpg');
 await page.setViewportSize({width:390,height:844});await page.locator('#view-select').selectOption('cat');const mobile=await catFraming();
 const mobileUi=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,targets:[...document.querySelectorAll('.animal-actions button')].map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height};})}));
 check('final mobile cat view frames the body with no overflow and 44px animal controls',framed(mobile)&&mobileUi.width<=mobileUi.viewport&&mobileUi.targets.length===4&&mobileUi.targets.every(b=>b.width>=44&&b.height>=44),{...mobile,...mobileUi});
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('cat-mobile-v19-final.jpg');

 await page.setViewportSize({width:1280,height:960});await focusCanvas();await page.keyboard.press('g');
 await page.waitForFunction(()=>window.__localQaPhaseEvents.some(e=>e.phase==='startled'),{},{timeout:180000,polling:100});
 await page.keyboard.press('Space');const triggered=await snapshot(),trace=await page.evaluate(()=>window.__localQaPhaseEvents);
 const alertIndex=trace.findIndex(e=>e.phase==='alert'),startledIndex=trace.findIndex(e=>e.phase==='startled');
 check('final native G exposes alert before one near-hand scatter event',alertIndex>=0&&startledIndex>alertIndex&&trace[startledIndex].startle.triggerCount===1&&trace[startledIndex].startle.affectedFish>0&&triggered.fishCount===7,{trace});
 check('final response panel uses current-response counts and reports native pause',triggered.paused&&['startled','recovering'].includes(triggered.startle.phase)&&await page.locator('#startle-counts').innerText().then(t=>t.includes('当前响应')&&!t.includes('本次受影响'))&&await page.locator('#startle-status').innerText().then(t=>t.includes('已暂停')),{phase:triggered.startle.phase,counts:await page.locator('#startle-counts').innerText()});
 await delay(1300);const later=await snapshot();
 check('final native pause freezes threat memory and all fish poses',triggered.time===later.time&&JSON.stringify(triggered.startle)===JSON.stringify(later.startle)&&JSON.stringify(triggered.fish)===JSON.stringify(later.fish),{time:triggered.time,remaining:triggered.startle.remaining});
 await page.locator('#viewport').scrollIntoViewIfNeeded();await capture('startle-desktop-v19-final.jpg');
 await setPause(false);await page.waitForFunction(()=>window.__localQaPhaseEvents.some(e=>e.phase==='recovering')&&window.__courtyard?.school.startleState.phase==='idle',{},{timeout:180000,polling:100});
 const restored=await snapshot();
 check('final hand withdraws and fish recover naturally without another stimulus',restored.mode==='idle'&&restored.startle.triggerCount===1&&restored.startle.intensity===0&&restored.startle.affectedFish===0,{startle:restored.startle,trace:await page.evaluate(()=>window.__localQaPhaseEvents)});
 await page.locator('#setting-fishCount').focus();await page.keyboard.press('Home');await focusCanvas();await page.keyboard.press('g');const zero=await snapshot();
 check('final zero-fish G rejects hand approach without repopulating',zero.fishCount===0&&zero.mode==='idle'&&await page.locator('#fish-subject option').count()===0,{fishCount:zero.fishCount,mode:zero.mode,message:await page.locator('#scene-toast').innerText()});
 await page.locator('#principle-select').selectOption('startle');
 check('final page explains near-hand reaction rules and supplies a usable demo',await page.locator('#principle-method').innerText().then(t=>/距离|阈值|状态|刺激/.test(t))&&await page.locator('#principle-demo').isEnabled());
 const events=await page.evaluate(()=>window.__localQaContextEvents);
 check('final focused acceptance has no context, page, shader-console or external-request errors',events.length===0&&errors.length===0&&consoleErrors.length===0&&externalRequests.length===0,{events,errors,consoleErrors,externalRequests});completed=true;
}catch(error){if(!checks.some(c=>!c.passed))checks.push({name:'browser execution',passed:false,elapsedMs:Date.now()-started,error:error.message});if(page)try{await capture('failure-v19-final.jpg');}catch{}throw error;}
finally{
 let contextEvents=[],phaseEvents=[];if(page)try{({contextEvents,phaseEvents}=await page.evaluate(()=>({contextEvents:window.__localQaContextEvents??[],phaseEvents:window.__localQaPhaseEvents??[]})));}catch{}
 const record={date:new Date().toISOString(),version:19,scope:'Final-bundle focused acceptance after two source fixes. The earlier cat full-patrol run is separate and belongs to its recorded base bundle. Feed and imported-model interactions are not rerun here.',status:completed?'completed':'failed',bundleSha256:bundle,servedBundleSha256,scriptSha256,elapsedMs:Date.now()-started,authorization:'Continuing user-authorized isolated localhost browser QA.',method:'Isolated Chromium UI keyboard actions, select/range controls and desktop/mobile viewport resizing; preinstalled DOM MutationObserver records transient phases without changing application state. Read-only runtime pose/time/threat snapshots. Raw native JPEGs. Software-capable WebGL; no hardware-performance or GPU-memory claims.',checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,captures,phaseEvents,contextEvents,errors,consoleErrors,externalRequests};
 await writeFile(root+'notes/browser-v19-final-validation.json',JSON.stringify(record,null,2)+'\n');checkpoint();if(browser)await browser.close();
}
