import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],requests=[],checks=[];
const sha=x=>createHash('sha256').update(x).digest('hex'),base='http://127.0.0.1:8997/projects/007-koi-scene-lab/';
const sourceRuntimeSha256=sha(await readFile(root+'web/upstream/koi-pond.html')),sourceSnapshotSha256=sha(await readFile(root+'web/upstream/koi-pond.original.html'));
let servedRuntimeSha256=null;
const started=Date.now();
try{
 const page=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:1});
 page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 const runtimeResponse=await page.goto(base+'upstream/koi-pond.html',{timeout:120000});
 assert.equal(runtimeResponse.status(),200);servedRuntimeSha256=sha(await runtimeResponse.body());assert.equal(servedRuntimeSha256,sourceRuntimeSha256);checks.push('打包后原作与本地运行副本字节一致');
 await page.waitForFunction(()=>typeof setQuality==='function',null,{timeout:30000});
 await page.evaluate(()=>{P.quality='Low';P.ssao=false;P.godRays=false;P.dof=false;P.autoQuality=false;});
 await page.waitForFunction(()=>!document.getElementById('loader')||document.getElementById('loadmsg')?.textContent.startsWith('Failed'),null,{timeout:180000});
 assert.ok(await page.evaluate(()=>!document.getElementById('loader')),'原作初始化');
 checks.push('本地原作成功构造并渲染');
 await page.evaluate(()=>window.frame=()=>{});await page.waitForTimeout(1000);
 console.log(JSON.stringify(await page.evaluate(()=>({url:location.href,guide:document.getElementById('help')?.className,buttons:document.querySelectorAll('button').length,load:document.getElementById('loadmsg')?.textContent,fish:KOI.fish.length}))));
 if(await page.locator('#help-close').isVisible())await page.locator('#help-close').click({force:true});else await page.evaluate(()=>setGuide(false));
 await page.locator('#tb-freeze').click({force:true});assert.ok(await page.evaluate(()=>P.freezeScene));checks.push('原作冻结动态');
 await page.locator('#tb-clean').click({force:true});
 await page.screenshot({path:root+'assets/original-publication-20261008.png',timeout:90000});
 await page.evaluate(()=>setClean(false));
 await page.locator('#feedbtn').click({force:true});assert.ok(await page.evaluate(()=>FEED.active));checks.push('原作投喂按钮触发状态');
 await page.locator('#tb-weather').click({force:true});assert.equal(await page.evaluate(()=>WX.name),'Rain');checks.push('原作天气切换');
 const cameraBefore=await page.evaluate(()=>P.cameraMode);await page.locator('#tb-cam').click({force:true});assert.notEqual(await page.evaluate(()=>P.cameraMode),cameraBefore);checks.push('原作镜头模式切换');
 assert.equal(errors.length,0,errors.join('\n'));checks.push('无脚本与着色器错误');
 assert.ok(requests.every(u=>u.startsWith('http://127.0.0.1:8997/')));checks.push('依赖和原作均从本地加载');
 const info=await page.evaluate(()=>({quality:P.quality,fishCount:KOI.fish.length,weather:WX.name,time:SH.uTime.value,canvas:[renderer.domElement.width,renderer.domElement.height],renderer:renderer.getContext().getParameter(renderer.getContext().getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL??renderer.getContext().RENDERER)}));
 await writeFile(root+'notes/original-validation-publication-20261008.json',JSON.stringify({date:new Date().toISOString(),clientDate:'2026-10-08',publicationCheck:true,url:base+'upstream/koi-pond.html',status:'completed',passed:checks.length,failed:0,elapsedMs:Date.now()-started,sourceRuntimeSha256,servedRuntimeSha256,sourceSnapshotSha256,scriptSha256:sha(await readFile(fileURLToPath(import.meta.url))),captures:['assets/original-publication-20261008.png'],scope:'Local static publication package on the GitHub Pages subpath. Original initialization and UI states only; no full-quality, animal-motion, hardware-performance or online-deployment verification.',renderer:'Chromium headless / SwiftShader',viewport:[960,640],
 testOnlySettings:'Low quality; SSAO, god rays and DOF disabled for software renderer; original runtime file defaults unchanged. Scene frame function stopped after rendered frame for screenshot and UI state checks; native RAF retained. Click actionability wait skipped for software rendering.',checks,info,errors,requests},null,2));
 console.log(JSON.stringify({checks,info,errors}));
}finally{await browser.close();}

