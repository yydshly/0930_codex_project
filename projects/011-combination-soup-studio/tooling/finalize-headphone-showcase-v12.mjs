import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/',folder=root+'notes/headphone-downloads-v12/';
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:820},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto(base+'studio.html?example=headphones');await page.locator('#generate-plan').click();await page.locator('#open-plan-product').click();
  await page.waitForFunction(()=>document.querySelector('#prototype-mode')?.textContent.includes('本地 WebGL'));
  const f=await (await page.locator('#prototype').elementHandle()).contentFrame();await f.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  await page.locator('#go-delivery').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-zip').click()]);
  const zipFile=folder+'idea-foundry-headphones-showcase-v12.zip';await download.saveAs(zipFile);const unpack=folder+'showcase-standalone';
  const py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import sys,pathlib,zipfile
z=zipfile.ZipFile(sys.argv[1]);p=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():assert (p/n).resolve().is_relative_to(p)
z.extractall(p)`,zipFile,unpack],{encoding:'utf8'});assert.equal(py.status,0,py.stderr);
  const d=JSON.parse(await readFile(unpack+'/product-definition.json','utf8'));assert.equal(d.product.product.kind,'headphones');assert.equal(d.product.experiencePlan.category,'headphones');assert.equal(d.product.headphones.initial.fold,0);
  const isolated=await browser.newContext({viewport:{width:1440,height:820},reducedMotion:'reduce'}),bundle=await isolated.newPage();
  bundle.on('pageerror',e=>errors.push(e.message));bundle.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await isolated.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='headphone-showcase.test')return route.abort();const file=path.resolve(unpack,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(path.resolve(unpack)+path.sep))return route.abort();try{await route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
  await bundle.goto('http://headphone-showcase.test/');await bundle.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');await bundle.locator('.h-hero-image').evaluate(e=>e.decode());
  await bundle.locator('.h-hero').screenshot({path:root+'assets/qa/v12/final-standalone-hero.png'});await bundle.locator('.h-hero-copy .h-primary').click();assert.ok(await bundle.evaluate(()=>scrollY>1000));
  await bundle.locator('.h-live').screenshot({path:root+'assets/qa/v12/final-standalone-live.png'});
  await bundle.locator('[data-headphone-view=structure]').click();await bundle.locator('.h-live').screenshot({path:root+'assets/qa/v12/final-standalone-structure.png'});
  await bundle.locator('[data-headphone-view=hero]').click();await bundle.locator('#headphone-fold').evaluate(e=>{e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));});await bundle.locator('.h-live').screenshot({path:root+'assets/qa/v12/final-standalone-fold.png'});
  await bundle.locator('#headphone-canvas').evaluate(c=>{(c.getContext('webgl2')||c.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();});await bundle.waitForFunction(()=>document.querySelector('#headphone-render-status').textContent.includes('重新载入'));
  await bundle.setViewportSize({width:1280,height:820});await bundle.waitForTimeout(100);assert.ok(await bundle.locator('#headphone-render-status').textContent().then(v=>v.includes('重新载入')));
  await page.setViewportSize({width:390,height:844});await page.goto(base+'showroom.html?example=headphones');await page.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');await page.locator('.h-hero-image').evaluate(e=>e.decode());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.h-hero').screenshot({path:root+'assets/qa/v12/final-showcase-mobile.png'});
  assert.equal(errors.length,0,errors.join('\n'));await writeFile(root+'notes/headphone-final-delivery-v12.json',JSON.stringify({completed:true,errors,zip:path.relative(root,zipFile),planSource:d.product.experiencePlanSource,defaultState:{color:d.product.product.initial.color,fold:d.product.headphones.initial.fold,environment:d.product.headphones.initial.environment},externalResources:'blocked',independentOrigin:'http://headphone-showcase.test/',webglMaterialsLoaded:true,heroNavigation:true,contextLossRetainsError:true,mobileViewport:'390x844',limitations:['原创概念系列，非厂商实拍或 CAD','在线模型未作真实调用验收','手机视口模拟，不代表真机性能']},null,2));
  console.log(JSON.stringify({completed:true,errors,zip:zipFile}));
}finally{await browser.close();}
