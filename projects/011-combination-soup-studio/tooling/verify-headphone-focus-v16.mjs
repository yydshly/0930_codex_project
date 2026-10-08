import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),folder=root+'notes/focus-downloads-v16/',base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};let completed=false,failure=null;
const ready=()=>page.waitForFunction(()=>document.querySelector('#studio-live-canvas')?.dataset.materialsReady==='true');
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')));
async function download(scope,id,name){const [d]=await Promise.all([page.waitForEvent('download'),scope.locator(id).click()]);await d.saveAs(folder+name);return readFile(folder+name);}
try{
  await page.goto(base+'studio.html?example=headphones&revision=20261003-16');await ready();
  const before=await page.locator('#studio-live-canvas').evaluate(c=>c.toDataURL());await page.locator('[data-live-view=detail]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')).previewSelection?.observation?.focus==='cup');
  check('铝壳观察切换实际焦点与画面',before!==await page.locator('#studio-live-canvas').evaluate(c=>c.toDataURL())&&await page.locator('#live-render-status').textContent().then(v=>v.includes('耳罩近景')));
  const detail=await page.locator('#studio-live-canvas').evaluate(c=>c.toDataURL());await page.locator('[data-live-view=cushion]').click();
  check('耳垫观察实际改变观察方向',detail!==await page.locator('#studio-live-canvas').evaluate(c=>c.toDataURL()));
  await page.locator('#studio-live-canvas').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')).previewSelection?.selection?.view==='custom');
  const chosen=(await stored()).previewSelection;check('旋转近景保持耳罩焦点而非跳回整机',chosen.observation.focus==='cup'&&chosen.selection.view==='custom');
  await page.locator('#expand-live-stage').click();check('放大画面后隐去旁栏并保留观察范围',await page.locator('#expand-live-stage').getAttribute('aria-pressed')==='true'&&!await page.locator('.sl-copy').isVisible()&&(await stored()).previewSelection.observation.focus==='cup');
  await page.locator('#expand-live-stage').click();check('收起画面恢复操作栏',await page.locator('.sl-copy').isVisible());
  const plan=JSON.parse(await download(page,'#download-plan','near-plan.json'));check('实际 JSON 保留近景观察字段',plan.previewSelection.observation.focus==='cup');
  const md=(await download(page,'#download-brief','production-brief.md')).toString();check('实际简报说明耳罩观察范围',md.includes('观察范围：耳罩细节'));
  await page.reload();await ready();check('工作台刷新后近景焦点与自定义角度恢复',(await stored()).previewSelection.observation.focus==='cup'&&Math.abs((await stored()).previewSelection.observation.yaw-chosen.observation.yaw)<.001);
  await page.locator('#open-live-product').click();await page.waitForFunction(()=>document.querySelector('#prototype-mode')?.textContent.includes('本地 WebGL'));
  const f=await (await page.locator('#prototype').elementHandle()).contentFrame();await f.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  const result=JSON.parse(await download(f,'#save-headphone-config','headphone-near.json'));check('完整产品接收真实近景范围与角度',result.observation.focus==='cup'&&result.selection.view==='custom'&&Math.abs(result.observation.yaw-chosen.observation.yaw)<.001);
  const png=await download(f,'#save-headphone-image','headphone-near.png');check('近景 PNG 与当前实际画布完全相同',png.equals(Buffer.from((await f.locator('#headphone-canvas').evaluate(c=>c.toDataURL())).split(',')[1],'base64')));
  await page.locator('#go-delivery').click();const cfg=JSON.parse(await download(page,'#export-json','product-definition.json'));check('交付定义保留耳罩相机范围',cfg.product.headphones.initial.camera.focus==='cup');
  await download(page,'#export-zip','idea-foundry-near-headphones-v16.zip');const unpack=folder+'standalone';
  const py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import pathlib,sys,zipfile
z=zipfile.ZipFile(sys.argv[1]);p=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():assert (p/n).resolve().is_relative_to(p)
z.extractall(p)`,folder+'idea-foundry-near-headphones-v16.zip',unpack],{encoding:'utf8'});assert.equal(py.status,0,py.stderr);
  const isolated=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),bundle=await isolated.newPage();bundle.on('pageerror',e=>errors.push(e.message));
  await isolated.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='near-package.test')return route.abort();const file=path.resolve(unpack,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(path.resolve(unpack)+path.sep))return route.abort();try{await route.fulfill({contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
  await bundle.goto('http://near-package.test/');await bundle.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  const [d]=await Promise.all([bundle.waitForEvent('download'),bundle.locator('#save-headphone-config').click()]);await d.saveAs(folder+'standalone-near.json');const independent=JSON.parse(await readFile(folder+'standalone-near.json','utf8'));
  check('阻断包外请求后仍恢复同一近景范围与角度',independent.observation.focus==='cup'&&Math.abs(independent.observation.yaw-chosen.observation.yaw)<.001);
  await bundle.locator('[data-headphone-view=hero]').click();const [reset]=await Promise.all([bundle.waitForEvent('download'),bundle.locator('#save-headphone-config').click()]);await reset.saveAs(folder+'standalone-whole.json');check('独立包可从近景回到整机',JSON.parse(await readFile(folder+'standalone-whole.json','utf8')).observation.focus==='product');await isolated.close();
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:844});await page.goto(base+'studio.html?example=headphones');await ready();await page.locator('[data-live-view=cushion]').click();
    check(width+' / 六个视角按钮无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#expand-live-stage').click();check(width+' / 放大预览无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.locator('#expand-live-stage').click();await page.locator('#reset-live-selection').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')).previewSelection?.observation?.focus==='product');
  check('重置恢复整机观察范围',(await stored()).previewSelection.selection.view==='hero');check('无未处理浏览器错误',errors.length===0);completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/headphone-focus-v16.json',JSON.stringify({completed,failure,checks,errors,limitations:['真实本地概念模型，非在线生成或实物标定','手机视口模拟，未测真机性能或商业效果']},null,2));await browser.close();console.log(JSON.stringify({completed,failure,checks:checks.length,errors}));}
