import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/';
const out=root+'assets/qa/v8/',downloads=root+'notes/scene-downloads-v8/';
await mkdir(out,{recursive:true});await mkdir(downloads,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce',acceptDownloads:true});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
const facts=async()=>JSON.parse(await page.locator('#facts-preview').textContent());
const pixels=async(scene)=>page.locator('#'+scene+'-canvas').evaluate(c=>c.toDataURL());
async function position(){await page.locator('#scene-workspace').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-90));await page.waitForTimeout(350);}
async function changed(scene,action,name){const before=await pixels(scene);await action();await position();await page.waitForFunction(({scene,before})=>document.querySelector('#'+scene+'-canvas').toDataURL()!==before,{scene,before});check(name,before!==await pixels(scene));}
async function download(id,name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(id).click()]);await d.saveAs(downloads+name);return readFile(downloads+name);}
try{
  await page.goto(base+'?effect=broth&scene=product&revision=20261002-8#scenes');await position();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#facts-preview').textContent).观察状态?.environmentReady);
  await page.waitForTimeout(500);
  check('默认展示实际解码的室内全景',(await facts()).观察状态.backgroundSource==='generated-panorama');
  const interior=await pixels('product');await changed('product',()=>page.locator('[data-product-setting=studio]').click(),'棚拍与室内切换改变真实画面');
  check('棚拍的状态和选择同步',(await facts()).观察状态.backgroundSource==='studio-color'&&await page.locator('#product-setting').inputValue()==='studio');
  await changed('product',()=>page.locator('#product-setting').selectOption('interior'),'选择框可恢复室内');
  check('恢复室内还原相同像素',interior===await pixels('product'));
  await page.locator('#product-finish').selectOption('gloss');await position();
  const reflected=await pixels('product');await changed('product',()=>page.locator('#product-reflections').uncheck(),'反射开关实际改变材质');
  check('反射关闭的事实同步',(await facts()).当前参数.reflections===false&&(await facts()).观察状态.reflections===false);
  const original=await sharp(Buffer.from(reflected.split(',')[1],'base64')).extract({left:10,top:15,width:50,height:50}).raw().toBuffer();
  const off=await sharp(Buffer.from((await pixels('product')).split(',')[1],'base64')).extract({left:10,top:15,width:50,height:50}).raw().toBuffer();
  check('反射开关保持全景背景像素',original.equals(off));
  await page.locator('#brief-open').click();const brief=await page.locator('#brief-text').textContent();
  check('需求单记录室内与关闭反射',brief.includes('展示场景：室内全景')&&brief.includes('环境反射：关闭'));await page.locator('#brief-close').click();
  const exportFacts=JSON.parse((await download('#facts-download','product-interior.json')).toString());check('导出保存实际背景状态',exportFacts.观察状态.backgroundSource==='generated-panorama'&&exportFacts.当前参数.reflections===false);
  const png=await download('#image-download','product-interior.png');check('PNG包含实际模型和全景像素',(await sharp(png).stats()).channels.some(c=>c.stdev>25));
  await position();const stageHeight=await page.locator('#product-canvas').evaluate(el=>el.getBoundingClientRect().height);
  await page.locator('#product-fields .scene-material-source summary').click();await page.waitForFunction(()=>document.querySelector('#product-fields .scene-material-source img').naturalWidth>1000);
  check('室内原图可展开查看',await page.locator('#product-fields .scene-material-source').evaluate(el=>el.open));
  check('原图展开未改变模型画布高度',stageHeight===await page.locator('#product-canvas').evaluate(el=>el.getBoundingClientRect().height));
  await page.locator('#product-fields .scene-material-source summary').click();await page.locator('#product-reset').click();await position();
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:1100});await position();await page.screenshot({path:out+'final-product-'+width+'.png'});await page.locator('#product-preview').screenshot({path:out+'product-interior-stage-'+width+'.png'});
    check('产品工具栏和页面无溢出 '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await page.locator('.product-setting-toolbar').evaluate(el=>{const r=el.getBoundingClientRect(),s=document.querySelector('#product-preview').getBoundingClientRect();return r.left>=s.left&&r.right<=s.right;}));
  }
  await page.setViewportSize({width:1440,height:1100});await page.locator('[data-product-setting=studio]').click();await position();await page.screenshot({path:out+'final-product-studio.png'});
  await page.locator('#tab-garden').click();await position();const garden=await pixels('garden');
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:1100});
    for(const view of ['water','plant']){
      await changed('garden',()=>page.locator('[data-garden-view='+view+']').click(),'近景实际改变三维相机 '+view+' '+width);
      check('近景状态记录正确 '+view+' '+width,(await facts()).观察状态.view===view&&(await page.locator('#garden-view-label').textContent()).includes(view==='water'?'水景近景':'植物近景'));
      check('近景工具栏和页面无溢出 '+view+' '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await page.locator('.garden-view-toolbar').evaluate(el=>{const r=el.getBoundingClientRect(),s=document.querySelector('.garden-stage').getBoundingClientRect();return r.left>=s.left&&r.right<=s.right&&r.bottom<=s.bottom;}));
      await page.screenshot({path:out+'final-garden-'+view+'-'+width+'.png'});await page.locator('.garden-stage').screenshot({path:out+'garden-'+view+'-stage-'+width+'.png'});
    }
    await page.locator('#garden-view-reset').click();await position();await page.screenshot({path:out+'final-garden-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:1100});await position();check('近景复位恢复原来的三维空间',garden===await pixels('garden'));
  await page.setViewportSize({width:390,height:1100});await position();const visibleGarden=await pixels('garden');
  await page.locator('#garden-priority').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-80));await page.waitForTimeout(350);
  check('庭院离开视口的检查条件成立',await page.locator('#garden-canvas').evaluate(el=>el.getBoundingClientRect().bottom<0));
  await page.locator('#garden-priority').selectOption('gather');check('离开视口后庭院参数仍刷新画面',visibleGarden!==await pixels('garden'));
  const offscreenGarden=await pixels('garden'),gardenPng=await download('#image-download','garden-offscreen.png');
  check('庭院离开视口时导出最新画面',Buffer.from(offscreenGarden.split(',')[1],'base64').equals(gardenPng));
  await page.locator('#garden-priority').selectOption('water');await page.locator('#tab-product').click();await position();const visibleProduct=await pixels('product');
  await page.locator('#product-finish').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-80));await page.waitForTimeout(350);
  check('产品离开视口的检查条件成立',await page.locator('#product-canvas').evaluate(el=>el.getBoundingClientRect().bottom<0));
  await page.locator('#product-finish').selectOption('gloss');check('离开视口后产品材质仍刷新画面',visibleProduct!==await pixels('product'));
  const offscreenProduct=await pixels('product'),productPng=await download('#image-download','product-offscreen.png');
  check('产品离开视口时导出最新画面',Buffer.from(offscreenProduct.split(',')[1],'base64').equals(productPng));
  await page.locator('#tab-garden').click();await position();
  await page.locator('#garden-fields .scene-material-source summary').click();await page.waitForFunction(()=>document.querySelector('.leaf-source').naturalWidth>500);check('透明叶片原图可直接查看',await page.locator('#garden-fields .scene-material-source').evaluate(el=>el.open));await page.locator('#garden-fields .scene-material-source summary').click();
  const fallback=await browser.newPage({viewport:{width:390,height:1100},reducedMotion:'reduce'});fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:get.call(this,type,...args);};});
  await fallback.goto(base+'?scene=product&revision=20261002-8#scenes');await fallback.waitForFunction(()=>JSON.parse(document.querySelector('#facts-preview').textContent).观察状态?.renderer==='canvas');
  check('兼容模式关闭不支持的室内和反射',await fallback.locator('#product-setting').isDisabled()&&await fallback.locator('#product-reflections').isDisabled()&&JSON.parse(await fallback.locator('#facts-preview').textContent()).观察状态.backgroundSource==='canvas-gradient');
  await fallback.locator('#tab-garden').click();check('兼容模式关闭水景和植物相机',await fallback.locator('[data-garden-view=water]').isDisabled()&&await fallback.locator('[data-garden-view=plant]').isDisabled());await fallback.close();
  const missing=await browser.newPage({viewport:{width:390,height:1100},reducedMotion:'reduce'});missing.on('pageerror',e=>errors.push(e.message));
  await missing.route('**/assets/studio-environment-v5.webp',r=>r.abort());await missing.goto(base+'?scene=product&revision=20261002-8#scenes');
  await missing.waitForFunction(()=>document.querySelector('#product-setting-status').textContent.includes('全景不可用'));
  const missingFacts=JSON.parse(await missing.locator('#facts-preview').textContent());check('全景失败明确回退棚拍',missingFacts.观察状态.environmentFailed&&missingFacts.观察状态.backgroundSource==='studio-color');
  const before=await missing.locator('#product-canvas').evaluate(c=>c.toDataURL());await missing.locator('input[name=product-color][value="#bb633f"]').check();await missing.waitForTimeout(300);check('全景失败后配置仍可用',before!==await missing.locator('#product-canvas').evaluate(c=>c.toDataURL()));await missing.close();
  check('正常路径无浏览器错误',errors.length===0);
}finally{await writeFile(root+'notes/scene-refinements-v8-verification.json',JSON.stringify({date:'2026-10-02',revision:'20261002-8',checks,errors,scope:'Actual decoded assets, canvas changes, exports, cameras, responsive layout and explicit failure/compatibility states. Visual quality requires screenshot review.'},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.length,errors}));
