import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/',folder=root+'notes/foundry-downloads-v14/',shots=root+'assets/qa/v14/';
await mkdir(folder,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,v)=>{assert.ok(v,name);checks.push({name,passed:true});};
const ready=()=>page.waitForFunction(()=>document.querySelector('#studio-live-canvas')?.dataset.materialsReady==='true');
async function download(id,name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(id).click()]);await d.saveAs(folder+name);return readFile(folder+name);}
let completed=false,failure=null;
try{
  await page.goto(base+'studio.html?example=headphones&revision=20261003-12');await ready();
  check('旧耳机链接可直接看到新版实际模型，无需额外生成操作',await page.locator('#studio-live').isVisible()&&page.url().includes('20261003-14'));
  check('实时预览保留系列与当前方案文案',await page.locator('.sl-copy h3').textContent().then(v=>v.includes('节奏')));
  await page.screenshot({path:shots+'studio-desktop.png',fullPage:true});await page.locator('#studio-live').screenshot({path:shots+'live-default.png'});
  const original=await page.locator('#studio-live-canvas').evaluate(c=>c.toDataURL());
  await page.locator('[name=live-color]').nth(1).check();
  check('改变配色实际改变渲染像素',original!==await page.locator('#studio-live-canvas').evaluate(c=>c.toDataURL()));
  await page.locator('#live-finish').selectOption('gloss');await page.locator('[data-live-environment=night]').click();
  await page.locator('#live-fold').evaluate(e=>{e.value='60';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#studio-live-canvas').focus();await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')).previewSelection?.selection?.view==='custom');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')));
  check('实际选择与自定义相机进入方案状态',stored.previewSelection.selection.color==='#424b52'&&stored.previewSelection.selection.finish==='gloss'&&stored.previewSelection.selection.foldPercent===60&&stored.previewSelection.selection.environment==='night'&&Number.isFinite(stored.previewSelection.observation.yaw));
  check('摘要同步选择',await page.locator('#live-selection-summary').textContent().then(v=>v.includes('石墨')&&v.includes('亮面')&&v.includes('60%')));
  await page.locator('#studio-live').screenshot({path:shots+'live-night-fold.png'});
  await page.reload();await ready();
  check('刷新同一页面恢复配色、表面、折叠和环境',await page.locator('[name=live-color]').nth(1).isChecked()&&await page.locator('#live-finish').inputValue()==='gloss'&&await page.locator('#live-fold').inputValue()==='60'&&await page.locator('[data-live-environment=night]').getAttribute('aria-pressed')==='true');
  const actual=JSON.parse(await download('#download-plan','preview-plan.json'));
  check('真实方案下载含工作台实际选择',actual.previewSelection.selection.foldPercent===60&&actual.previewSelection.observation.view==='custom');
  const md=(await download('#download-brief','production-brief.md')).toString();check('可读简报记录工作台选择与事实边界',md.includes('工作台实际选择')&&md.includes('石墨')&&md.includes('折叠：60%')&&md.includes('不是实物规格或订单'));
  await page.locator('#tab-review').click();await page.locator('#review-headline').fill('随心聆听，让选择看得见。');
  check('未应用文案时旧效果停用，旧交付不可下载',!await page.locator('#studio-live').isVisible()&&await page.locator('#download-plan').isDisabled());
  await page.locator('#review-finish').uncheck();await page.locator('#review-structure').uncheck();await page.locator('#apply-review').click();await ready();
  check('修改后的文案直接进入当前预览',await page.locator('.sl-copy h3').textContent()==='随心聆听，让选择看得见。');
  check('关闭的表面和部件操作实际从预览移除',await page.locator('#live-finish').count()===0&&await page.locator('[data-live-view=structure]').count()===0);
  check('改变操作范围保留兼容选配并重置禁用表面',await page.locator('[name=live-color]').nth(1).isChecked()&&await page.locator('#live-fold').inputValue()==='60'&&await page.locator('#live-selection-summary').textContent().then(v=>v.includes('哑光')));
  await page.locator('#open-live-product').click();await page.waitForFunction(()=>document.querySelector('#prototype-mode')?.textContent.includes('本地 WebGL'));
  const f=await (await page.locator('#prototype').elementHandle()).contentFrame();await f.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  check('工作台选择带入完整产品页',await f.locator('[name=headphone-color]').nth(1).isChecked()&&await f.locator('#headphone-fold').inputValue()==='60'&&await f.locator('[data-headphone-environment=night]').getAttribute('aria-pressed')==='true');
  check('完整产品页使用修改文案与操作范围',await f.locator('.h-hero-copy h1').textContent()==='随心聆听，让选择看得见。'&&await f.locator('#headphone-finish').count()===0&&await f.locator('[data-headphone-view=structure]').count()===0);
  await page.locator('#go-delivery').click();await download('#export-zip','idea-foundry-live-headphones-v14.zip');
  const unpack=folder+'standalone',py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import pathlib,sys,zipfile
z=zipfile.ZipFile(sys.argv[1]);p=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():assert (p/n).resolve().is_relative_to(p)
z.extractall(p)`,folder+'idea-foundry-live-headphones-v14.zip',unpack],{encoding:'utf8'});assert.equal(py.status,0,py.stderr);
  const cfg=JSON.parse(await readFile(unpack+'/product-definition.json','utf8')).product;
  check('实际 ZIP 定义保留来源、关闭范围与工作台选择',cfg.experiencePlanSource.includes('已调整')&&cfg.headphones.initial.fold===60&&cfg.headphones.initial.environment==='night'&&cfg.product.initial.color==='#424b52'&&!cfg.product.features.finish&&!cfg.product.features.structure);
  const isolated=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),bundle=await isolated.newPage();bundle.on('pageerror',e=>errors.push(e.message));
  await isolated.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='live-package.test')return route.abort();const file=path.resolve(unpack,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(path.resolve(unpack)+path.sep))return route.abort();try{await route.fulfill({contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
  await bundle.goto('http://live-package.test/');await bundle.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  check('阻断包外请求后仍保留工作台的真实选择和文案',await bundle.locator('#headphone-fold').inputValue()==='60'&&await bundle.locator('[name=headphone-color]').nth(1).isChecked()&&await bundle.locator('.h-hero-copy h1').textContent()==='随心聆听，让选择看得见。');await isolated.close();
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:844});await page.goto(base+'studio.html?example=headphones');await ready();
    check(width+' / 实时预览无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===390)await page.locator('#studio-live').screenshot({path:shots+'live-mobile.png'});
  }
  await page.locator('[name=live-color]').nth(2).check();await page.locator('#live-fold').evaluate(e=>{e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#reset-live-selection').click();
  check('重置恢复模型与即时摘要',await page.locator('[name=live-color]').first().isChecked()&&await page.locator('#live-fold').inputValue()==='0'&&await page.locator('#live-selection-summary').textContent().then(v=>v.includes('雾银')&&v.includes('0%')));
  await page.locator('#brief-product').fill('咖啡机');check('修改目标立即停止旧产品效果',!await page.locator('#studio-live').isVisible());await page.locator('#generate-plan').click();
  check('未知产品仍明确缺少模块，不展示耳机替代',!await page.locator('#studio-live').isVisible()&&await page.locator('#open-plan-product').isDisabled()&&!await page.locator('#download-brief').isDisabled());
  check('无未处理浏览器错误',errors.length===0);completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/foundry-verification-v14.json',JSON.stringify({completed,failure,checks,errors,limitations:['真实本地模型与状态，非本次在线模型生成','概念形体和影像，非厂商实物标定','手机视口模拟，未测真机或商业效果']},null,2));await browser.close();console.log(JSON.stringify({completed,checks:checks.length,errors,failure}));}
