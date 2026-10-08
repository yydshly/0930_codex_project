/* Source-reference revision: loading/export/navigation/layout. Module-specific
 * camera, interaction, recording and gameplay checks live in reference-*.json. */
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const req=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=req('playwright'),sharp=req('sharp'),root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8975/';
const checks=[],errors=[],requests=[],assetFailures=[];const check=(name,ok)=>{assert.ok(ok,name);checks.push({name,passed:true});};
await mkdir(root+'assets/qa/reference-revision',{recursive:true});await mkdir(root+'notes/reference-state-downloads',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1080},acceptDownloads:true});
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)assetFailures.push({url:response.url(),status:response.status()});});
try{
 for(let id=1;id<=10;id++){
  const num=String(id).padStart(2,'0');await page.goto(base+'labs/?id='+id,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.ProductLab?.getState());
  check(`${num}模块、来源与参考契约`,await page.evaluate(id=>ProductLab.id===id&&Boolean(ProductLab.getState())&&Boolean(ProductLab.getMeta().reference.focus)&&Boolean(ProductLab.getMeta().reference.boundary),id));
  if([2,5,6,7,8,9,10].includes(id))check(`${num}实际WebGL空间渲染`,await page.evaluate(()=>{const canvas=document.querySelector('#lab-root canvas');return Boolean(canvas?.getContext('webgl2')||canvas?.getContext('webgl'));}));
  const preview=page.locator('#lab-root canvas').first();const target=await preview.count()?preview:page.locator('#lab-root');const pixels=await target.screenshot();const stats=await sharp(pixels).stats();check(`${num}实际效果有画面`,stats.channels.slice(0,3).some(channel=>channel.stdev>12));
  await page.screenshot({path:root+`assets/qa/reference-revision/${num}-desktop.png`,fullPage:true});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-state').click()]);const path=root+`notes/reference-state-downloads/${num}.json`;await download.saveAs(path);const state=JSON.parse(await readFile(path,'utf8'));
  check(`${num}真实体验导出含当前状态、原作依据及本例独立诊断`,state.schemaVersion===2&&state.caseId===id&&state.state&&state.reference.sourceTech&&state.reference.boundary&&state.source.includes('/status/')&&state.optimization?.caseId===id&&state.optimization.changes.length>0&&state.optimization.verify.length>0);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:root+`assets/qa/reference-revision/${num}-mobile.png`,fullPage:true});check(`${num}手机无横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.setViewportSize({width:1440,height:1080});
 }
 await page.goto(base+'?v=8#demo-06',{waitUntil:'networkidle'});await page.locator('#lab-frame').contentFrame().locator('canvas').waitFor();
 check('主站十项与独立原作对应',await page.locator('.demo-option').count()===10);
 await page.locator('.case-technical summary').click();
 check('当前原作直接可见并分离两套技术',await page.locator('.demo-source').getAttribute('open')!==null&&(await page.locator('#demo-reference').innerText()).includes('原作披露的技术')&&(await page.locator('#demo-reference').innerText()).includes('本机没有 Blender'));
 for(const id of [2,3,4,5,7,8,9,10,1,6]){await page.locator(`#demo-selector [data-demo-id="${id}"]`).click();await page.waitForFunction(id=>DemoGallery.getCurrentId()===id,id);await page.locator('#lab-frame').contentFrame().locator('#export-state').waitFor();check(`主站切换${String(id).padStart(2,'0')}时原作与产品同步`,await page.locator('#demo-original-effect').getAttribute('data-effect-case-ids')===String(id)&&await page.locator('#lab-frame').getAttribute('src')===`labs/?id=${id}&embedded=1`);check(`仅展示${String(id).padStart(2,'0')}自己的问题、重点和验收`,await page.evaluate(id=>{const analysis=CASE_OPTIMIZATION_DATA[id],mapping=document.querySelector('#demo-mapping'),detail=document.querySelector('.case-optimization');return mapping.dataset.analysisCaseId===String(id)&&mapping.textContent.includes(analysis.diagnosis)&&mapping.textContent.includes(analysis.priority)&&detail.dataset.analysisCaseId===String(id)&&document.querySelectorAll('.case-optimization').length===1&&analysis.changes.every(text=>detail.textContent.includes(text))&&analysis.verify.every(text=>detail.textContent.includes(text));},id));}
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:root+'assets/qa/reference-revision/gallery-desktop.png',fullPage:true});await page.screenshot({path:root+'assets/overview.png'});
 await page.locator('#demo-stage').scrollIntoViewIfNeeded();await page.screenshot({path:root+'assets/qa/reference-revision/06-main-comparison.png',fullPage:true});
 const frame=page.locator('#lab-frame').contentFrame();await frame.locator('[data-action=video]').click();await page.waitForTimeout(400);await page.locator('a[data-view="effects"]').click();const hidden=await page.locator('#lab-frame').evaluate(f=>f.contentWindow.ProductLab.getState());check('离开主视图取消音乐播放与录制',!hidden.playing&&!hidden.recording);check('取消反馈与状态一致',(await frame.locator('#host-status').innerText()).includes('取消'));
 await page.locator('a[data-view="demo"]').click();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:root+'assets/qa/reference-revision/gallery-mobile.png',fullPage:true});check('主站手机与嵌入无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await page.locator('#lab-frame').evaluate(f=>f.contentDocument.documentElement.scrollWidth<=f.contentWindow.innerWidth));
 await page.goto(base+'#products');check('十项产品映射仍保留',await page.locator('#prototype-product-rows tr').count()===10);check('未操作原视频时仅使用本地资源',requests.every(url=>url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:')));check('新版本地材质和运行资产全部加载',assetFailures.length===0);check('无页面错误',errors.length===0);
 await writeFile(root+'notes/reference-integration-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,assetFailures,sourceVideosDownloaded:false},null,2));console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await browser.close();}


