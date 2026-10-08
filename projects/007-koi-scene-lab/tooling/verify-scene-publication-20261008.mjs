import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
const expected=process.argv.find(a=>a.startsWith('--expected-bundle='))?.split('=')[1];assert.match(expected??'',/^[a-f0-9]{64}$/);
assert.ok(process.argv.includes('--approved-local-browser'));
const bundle=sha(await readFile(root+'web/app.js'));assert.equal(bundle,expected);
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const started=Date.now(),checks=[],captures=[],errors=[],consoleErrors=[],externalRequests=[];
let browser,page,complete=false,served=null;
const progress=()=>writeFileSync(root+'notes/browser-publication-20261008-progress.json',JSON.stringify({status:complete?'completed_see_final_record':'running_not_final',bundleSha256:bundle,elapsedMs:Date.now()-started,checks,captures,errors,consoleErrors,externalRequests},null,2)+'\n');
function check(name,condition,evidence){checks.push({name,passed:!!condition,evidence});progress();assert.ok(condition,name);console.log('PASS '+name);}
async function snap(){return page.evaluate(()=>{const c=window.__courtyard,cat=c.animals.cat;return {time:c.time,paused:c.settings.paused,state:cat.state,timer:cat.timer,pose:cat.poseNodes().map(n=>({p:n.position.toArray(),q:n.quaternion.toArray(),s:n.scale.toArray()}))};});}
async function pause(value){if(await page.locator('#pause-toggle').getAttribute('aria-pressed')!==String(value)){await page.locator('#scene-canvas').focus();await page.keyboard.press('Space');}assert.equal(await page.locator('#pause-toggle').getAttribute('aria-pressed'),String(value));}
async function framing(){await page.waitForFunction(()=>window.__courtyard?.followAnimal==='cat'&&!window.__courtyard.transition);return page.evaluate(()=>{const c=window.__courtyard,cat=c.animals.cat,p=cat.root.position.clone(),box={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};let vertices=0;
 cat.root.traverse(n=>{if(!n.isMesh||!n.geometry?.attributes.position)return;for(let i=0;i<n.geometry.attributes.position.count;i++){n.getVertexPosition(i,p);p.applyMatrix4(n.matrixWorld).project(c.camera);box.left=Math.min(box.left,p.x);box.right=Math.max(box.right,p.x);box.top=Math.max(box.top,p.y);box.bottom=Math.min(box.bottom,p.y);vertices++;}});
 return {box,vertices,camera:c.camera.position.toArray(),target:c.controls.target.toArray(),cat:cat.worldPosition,aspect:c.camera.aspect};});}
const fits=f=>f.vertices>0&&f.box.left>-.99&&f.box.right<.99&&f.box.bottom>-.99&&f.box.top<.99;
async function capture(name){await page.locator('#viewport').scrollIntoViewIfNeeded();await page.screenshot({path:root+'assets/'+name,type:'jpeg',quality:90});captures.push('assets/'+name);progress();}
try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});page=await browser.newPage({viewport:{width:1280,height:960},hasTouch:true,deviceScaleFactor:1});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{window.__qaContextEvents=[];for(const type of ['webglcontextlost','webglcontextrestored'])addEventListener(type,()=>window.__qaContextEvents.push(type),true);});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:8997'||['blob:','data:'].includes(u.protocol))return r.continue();externalRequests.push(u.href);return r.abort();});
 const response=new Promise(resolve=>page.on('response',r=>{if(new URL(r.url()).pathname==='/projects/007-koi-scene-lab/app.js')r.body().then(bytes=>{served=sha(bytes);resolve();});}));
 await page.goto('http://127.0.0.1:8997/projects/007-koi-scene-lab/?v='+bundle.slice(0,8)+'#scene',{waitUntil:'domcontentloaded'});await response;
 await page.waitForFunction(()=>document.getElementById('scene-loader').hidden&&window.__courtyard?.animals.cat);
 check('served v20 bundle matches and cat controls initialize',served===bundle&&await page.locator('#cat-observe').isEnabled(),{served,bundle});
 await pause(true);await page.locator('#view-select').selectOption('cat');const desktop=await framing();
 check('desktop cat fully fits with camera on foreground side looking toward garden',fits(desktop)&&desktop.camera[2]>desktop.cat.z&&desktop.target[2]<desktop.cat.z,desktop);
 const before=await snap();await new Promise(r=>setTimeout(r,1000));const after=await snap();check('pause freezes refined posture, limbs, tail and simulation time',JSON.stringify(before)===JSON.stringify(after),{state:before.state,time:before.time});
 await capture('cat-desktop-publication-20261008.jpg');
 await page.setViewportSize({width:390,height:844});await page.locator('#view-select').selectOption('cat');const mobile=await framing();
 const ui=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,buttons:[...document.querySelectorAll('.animal-actions button')].map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height};})}));
 check('mobile cat is complete with no overflow and 44px animal controls',fits(mobile)&&ui.width<=ui.viewport&&ui.buttons.every(b=>b.w>=44&&b.h>=44),{mobile,ui});
 await capture('cat-mobile-publication-20261008.jpg');
 await page.setViewportSize({width:1280,height:960});await page.locator('#cat-observe').click();
 await page.waitForFunction(()=>document.getElementById('cat-status').dataset.state==='walk',null,{timeout:120000,polling:100});await pause(true);const walking=await snap(),walkFrame=await framing();
 check('native patrol reaches walking and the foreground camera retains the complete cat',walking.state==='walk'&&walking.paused&&fits(walkFrame)&&walkFrame.camera[2]>walkFrame.cat.z,{state:walking.state,time:walking.time,frame:walkFrame});
 await capture('cat-walk-publication-20261008.jpg');
 const contextEvents=await page.evaluate(()=>window.__qaContextEvents);check('no page, shader-console, external-request or context errors',!errors.length&&!consoleErrors.length&&!externalRequests.length&&!contextEvents.length,{errors,consoleErrors,externalRequests,contextEvents});complete=true;
}catch(e){checks.push({name:'browser execution',passed:false,error:e.message});progress();throw e;}
finally{
 const record={date:new Date().toISOString(),version:20,clientDate:'2026-10-08',publicationCheck:true,url:'http://127.0.0.1:8997/projects/007-koi-scene-lab/?v='+bundle.slice(0,8)+'#scene',renderer:'Chromium headless / forced ANGLE SwiftShader software renderer',status:complete?'completed':'failed',bundleSha256:bundle,servedBundleSha256:served,scriptSha256:sha(await readFile(fileURLToPath(import.meta.url))),elapsedMs:Date.now()-started,checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,captures,errors,consoleErrors,externalRequests,method:'User-authorized local static publication package verification on the GitHub Pages subpath, using forced software rendering. Actual keyboard/select/button actions and read-only camera/mesh/pose observations. Raw JPEGs; desktop and 390px mobile. Only v20 cat initialization, framing, pause and patrol are tested; G, feeding, GLB and controlled context recovery are not rerun. No hardware performance claim.'};
 await writeFile(root+'notes/browser-publication-20261008.json',JSON.stringify(record,null,2)+'\n');progress();if(browser)await browser.close();
}
