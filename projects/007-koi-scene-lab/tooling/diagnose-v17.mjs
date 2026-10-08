// Instrumented localhost debugging only; not final browser acceptance evidence.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
if(!process.argv.includes('--approved-local-browser'))throw new Error('Local browser approval required.');
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(root+'tooling/package.json'),{build}=require('esbuild');
const bundleHash=createHash('sha256').update(await readFile(root+'web/app.js')).digest('hex');
const needle='return {paused:true,content:poseSnapshotSignature(this.poseHistory.current,[state,fish,this.waterfall.time,materialPassState(this.water.material,waterDerivedUniforms),this.renderer.toneMapping,this.renderer.toneMappingExposure])};';
const injected=[
 'const content=poseSnapshotSignature(this.poseHistory.current,[state,fish,this.waterfall.time,materialPassState(this.water.material,waterDerivedUniforms),this.renderer.toneMapping,this.renderer.toneMappingExposure]);',
 'const next=JSON.parse(content),changes=[];function diff(a,b,path=[]){if(changes.length>=8||JSON.stringify(a)===JSON.stringify(b))return;if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){for(let i=0;i<a.length;i++)diff(a[i],b[i],[...path,i]);}else changes.push({path,before:JSON.stringify(a)?.slice(0,180),after:JSON.stringify(b)?.slice(0,180)});}',
 'if(this._debugPreviousContent){diff(this._debugPreviousContent,next);if(changes.length)console.log("WATER_TRACE "+JSON.stringify({frame:this.frameIndex,changes}));}this._debugPreviousContent=next;',
 'return {paused:true,content};'
].join('\n');
const compiled=await build({entryPoints:[root+'src/main.js'],bundle:true,write:false,format:'esm',target:['es2022'],nodePaths:[root+'tooling/node_modules'],plugins:[{name:'pause-difference-trace',setup(api){api.onLoad({filter:/[\\/]scene\.js$/},async args=>{let source=await readFile(args.path,'utf8');assert.ok(source.includes(needle));source=source.replace(needle,injected);const reason='const reason=this.water.passDecision(this.frameIndex,context);';assert.ok(source.includes(reason));source=source.replace(reason,reason+'if(context.paused)console.log("WATER_REASON "+JSON.stringify({frame:this.frameIndex,reason,revision:this.water.passRevision}));');return {contents:source,loader:'js'};});}}]});
const debugScript=compiled.outputFiles[0].text;
const externalRequire=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=externalRequire('playwright');
const traces=[],errors=[];let browser;
try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1280,height:960}});page.setDefaultTimeout(90000);
 page.on('console',msg=>{if(/^WATER_(TRACE|REASON) /.test(msg.text()))traces.push(msg.text());});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:8947'){if(url.pathname==='/app.js')return route.fulfill({body:debugScript,contentType:'application/javascript'});return route.continue();}if(['blob:','data:'].includes(url.protocol))return route.continue();return route.abort();});
 await page.goto('http://127.0.0.1:8947/?debug=pause#scene',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.getElementById('scene-loader')?.hidden,null,{timeout:120000});
 await page.locator('#setting-fishCount').press('Home');await page.locator('#pause-toggle').click();await page.locator('#principle-select').selectOption('performance');
 const status=await page.evaluate(async()=>{for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);return document.getElementById('principle-metrics')?.textContent;});
 console.log(JSON.stringify({status,traces:traces.slice(-18),errors},null,2));
}finally{
 await writeFile(root+'notes/paused-water-v17-diagnostic.json',JSON.stringify({date:new Date().toISOString(),baseBundleSha256:bundleHash,debugBundleSha256:createHash('sha256').update(debugScript).digest('hex'),method:'Instrumented source served only to an isolated localhost browser; console differences diagnose cache inputs. Not final QA pixels or acceptance.',traces,errors},null,2)+'\n');if(browser)await browser.close();
}
