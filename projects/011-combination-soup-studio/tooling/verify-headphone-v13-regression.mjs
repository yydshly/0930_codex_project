import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/',downloads=path.join(root,'notes/headphone-downloads-v13');
await mkdir(downloads,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage(),checks=[],errors=[];
let completed=false,failure=null;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{window.reports=[];window.addEventListener('message',e=>{if(e.data?.type==='foundry-result')window.reports.push(e.data.result);});});
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
async function download(p,scope,id,name){const [d]=await Promise.all([p.waitForEvent('download'),scope.locator(id).click()]);await d.saveAs(path.join(downloads,name));return readFile(path.join(downloads,name));}
async function generate(){await page.locator('#generate-plan').click();await page.waitForFunction(()=>!document.querySelector('#download-plan').disabled);}
async function slider(scope,id,value){await scope.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function imageChange(scope,action,name){const before=await scope.locator('#headphone-canvas').evaluate(c=>c.toDataURL());await action();await scope.waitForFunction(v=>document.querySelector('#headphone-canvas').toDataURL()!==v,before);check(name,true);}
try{
  await page.goto(base+'studio.html?example=headphones');await generate();
  check('示例来源明确为预置 AI 制作方案',await page.locator('#plan-source').textContent()==='AI 制作示例 · 预置');
  const plan=JSON.parse(await download(page,page,'#download-plan','experience-plan.json'));
  check('制作要求包含实际输入/来源/视觉/素材/操作与验收',plan.provider==='demo'&&plan.brief.product==='头戴式耳机'&&plan.plan.requirements.length>=5&&plan.plan.acceptance.length>=2&&plan.plan.assets.length>=3);
  await page.waitForFunction(()=>document.querySelector('#model-status').textContent.includes('未配置'));
  check('未配密钥时在线选项不可用且如实反馈',await page.locator('#plan-provider option[value=model]').evaluate(e=>e.disabled));
  await page.locator('#brief-goal').fill('帮助通勤者先看清结构，再保存自己喜欢的配色。');
  check('更改目标立即停用旧方案和旧交付',await page.locator('#open-plan-product').isDisabled()&&await page.locator('#download-plan').isDisabled()&&await page.locator('#plan-provider').inputValue()==='local-rules');
  await page.locator('.s-optional > summary').click();await page.locator('#brief-preference').fill('冷色、克制；重点是金属与耳垫。');await generate();
  let local=JSON.parse(await download(page,page,'#download-plan','local-plan.json'));
  check('本地整理实际携带新的目标与偏好',local.provider==='local-rules'&&JSON.stringify(local.plan).includes('帮助通勤者')&&JSON.stringify(local.plan).includes('冷色、克制'));
  for(const product of ['咖啡机','入耳式耳机','耳机']){
    await page.locator('#brief-product').fill(product);await generate();
    check(product+' 不误用头戴式耳机运行模块',await page.locator('#open-plan-product').isDisabled()&&await page.locator('#adapter-status').textContent().then(v=>v.includes('尚未实现')));
  }
  await page.locator('#brief-product').fill('<img src=x onerror="window.injected=true">');await generate();
  check('输入文本不执行 HTML 或事件',await page.evaluate(()=>!window.injected)&&await page.locator('#plan-content img').count()===0);
  await page.locator('#brief-product').fill('');
  check('清空必填值后仍能重新编辑与生成',!await page.locator('#generate-plan').isDisabled()&&await page.locator('#open-plan-product').isDisabled());
  await page.locator('#use-headphone-example').click();await generate();await page.locator('#open-plan-product').click();
  await page.waitForFunction(()=>document.querySelector('#prototype-mode')?.textContent.includes('本地 WebGL'));
  let f=await (await page.locator('#prototype').elementHandle()).contentFrame();
  await f.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  check('目标方案实际进入产品工作台与对应耳机模块',await page.locator('#prototype-title').textContent()==='头戴式耳机 · 产品体验'&&await f.locator('#headphone-canvas').count()===1&&await f.locator('#toilet-canvas').count()===0);
  check('品牌主视觉与特写真实加载',await f.locator('.h-hero-image').evaluate(e=>e.complete&&e.naturalWidth>1000)&&await f.locator('.h-detail-image img').evaluate(e=>e.complete&&e.naturalWidth>1000));
  await imageChange(f,()=>f.locator('[name=headphone-color]').nth(1).check(),'配色实际改变模型像素');
  await imageChange(f,()=>f.locator('#headphone-finish').selectOption('gloss'),'表面实际改变模型反射');
  await imageChange(f,()=>slider(f,'#headphone-fold',100),'折叠实际改变结构画面');
  await imageChange(f,()=>f.locator('[data-headphone-view=structure]').click(),'部件视角实际展开耳罩与耳垫');
  await imageChange(f,()=>f.locator('[data-headphone-environment=night]').click(),'观察环境实际改变背景与照明');
  await f.locator('[data-headphone-view=hero]').click();await slider(f,'#headphone-fold',65);
  await f.locator('#headphone-canvas').focus();await f.locator('#headphone-canvas').press('ArrowRight');await f.locator('#headphone-canvas').press('+');
  const selection=JSON.parse(await download(page,f,'#save-headphone-config','headphone-selection.json'));
  check('配置导出保留实际颜色/表面/折叠/环境/自定义观察',selection.selection.color==='#424b52'&&selection.selection.finish==='gloss'&&selection.selection.foldPercent===65&&selection.selection.environment==='night'&&selection.selection.view==='custom'&&selection.observation.zoom>1);
  check('未伪造性能或订单结果',selection.specification.battery==='待厂商提供'&&selection.dataMode==='original-concept'&&!selection.submitted);
  const md=(await download(page,f,'#save-headphone-sheet','headphone-selection.md')).toString();
  check('配置说明与屏幕选择一致',md.includes('65%')&&md.includes('待厂商提供')&&md.includes('夜')===false&&md.includes('night'));
  const png=await download(page,f,'#save-headphone-image','headphone-preview.png');
  check('当前模型真实导出 PNG',png.subarray(1,4).toString()==='PNG'&&png.length>10000);
  const screen=await f.locator('#headphone-canvas').evaluate(c=>c.toDataURL());
  check('PNG 内容与当前实际模型画布完全一致',png.equals(Buffer.from(screen.split(',')[1],'base64')));
  await page.locator('#save-project').click();await page.locator('#go-delivery').click();
  const definition=JSON.parse(await download(page,page,'#export-json','product-definition.json'));
  check('定义同时携带任务、方案来源与实际选配',definition.product.experiencePlanSource==='AI 制作示例 · 预置'&&definition.product.experiencePlan.category==='headphones'&&definition.product.headphones.initial.fold===65&&definition.product.headphones.initial.view==='custom');
  await download(page,page,'#export-zip','idea-foundry-headphones.zip');
  const unpack=path.join(downloads,'standalone');
  const py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import sys,pathlib,zipfile,json
z=zipfile.ZipFile(sys.argv[1]);out=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():assert (out/n).resolve().is_relative_to(out)
z.extractall(out);print(json.dumps(z.namelist()))`,path.join(downloads,'idea-foundry-headphones.zip'),unpack],{encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);const files=JSON.parse(py.stdout);
  check('独立包包含耳机影像、模型、方案与渲染许可',files.includes('experience-plan.json')&&files.includes('foundry/headphone-renderer.js')&&files.includes('foundry/headphone-domain.js')&&files.includes('foundry/planning-contract.js')&&files.includes('foundry/assets/headphone-mobile-v12.webp')&&files.includes('vendor/THREE-LICENSE.txt')&&!files.some(n=>n.startsWith('source-assets/')));
  const isolated=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true,reducedMotion:'reduce'}),standalone=await isolated.newPage(),bundleErrors=[];
  standalone.on('pageerror',e=>bundleErrors.push(e.message));
  await isolated.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='headphone.test'){await route.abort();return;}const file=path.resolve(unpack,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(unpack+path.sep)){await route.abort();return;}try{await route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
  await standalone.goto('http://headphone.test/');await standalone.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  const standaloneSelection=JSON.parse(await download(standalone,standalone,'#save-headphone-config','standalone-selection.json'));
  check('脱离原站恢复真实颜色/折叠与自定义观察',standaloneSelection.selection.color===selection.selection.color&&standaloneSelection.selection.foldPercent===65&&standaloneSelection.selection.view==='custom'&&Math.abs(standaloneSelection.observation.yaw-selection.observation.yaw)<.001&&Math.abs(standaloneSelection.observation.zoom-selection.observation.zoom)<.001);
  await imageChange(standalone,()=>standalone.locator('[data-headphone-environment=warm]').click(),'独立包继续操作而非静态截图');
  check('独立交付包无未处理错误',bundleErrors.length===0);await isolated.close();
  await page.reload();check('保存和刷新保留耳机产品身份',await page.locator('#product-kind').inputValue()==='headphones'&&await page.locator('[data-project]').count()===1);
  await page.locator('[data-import]').setInputFiles(path.join(downloads,'product-definition.json'));await page.locator('#build').click();await page.waitForFunction(()=>document.querySelector('#prototype-mode').textContent.includes('本地 WebGL'));
  f=await (await page.locator('#prototype').elementHandle()).contentFrame();check('导入定义恢复实际耳机选择',await f.locator('#headphone-fold').inputValue()==='65'&&await f.locator('[data-headphone-environment=night]').getAttribute('aria-pressed')==='true');
  await page.locator('#back-edit').click();await page.locator('#feature-finish').uncheck();await page.locator('#feature-structure').uncheck();await page.locator('#build').click();await page.waitForFunction(()=>document.querySelector('#prototype-mode').textContent.includes('本地 WebGL'));
  f=await (await page.locator('#prototype').elementHandle()).contentFrame();check('制作范围关闭材质/结构后消费者页同步移除操作',await f.locator('#headphone-finish').count()===0&&await f.locator('#headphone-explode').count()===0&&await f.locator('[data-headphone-view=structure]').count()===0);
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:844});await page.goto(base+'showroom.html?example=headphones');await page.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');await page.locator('.h-hero-image').evaluate(e=>e.decode());
    check(width+' 完整产品页无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===390){check('手机实际使用专用竖版影像',await page.locator('.h-hero-image').evaluate(e=>e.currentSrc.includes('mobile-v12')));await page.locator('#headphone-fold').scrollIntoViewIfNeeded();await slider(page,'#headphone-fold',90);const image=await download(page,page,'#save-headphone-image','offscreen-latest.png');const currentImage=await page.locator('#headphone-canvas').evaluate(c=>c.toDataURL());check('画布离开视口后仍导出最新选择及对应像素',image.equals(Buffer.from(currentImage.split(',')[1],'base64'))&&JSON.parse(await download(page,page,'#save-headphone-config','offscreen-selection.json')).selection.foldPercent===90);}
    await page.goto(base+'studio.html?example=headphones');await generate();check(width+' 制作方案页无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  const mockContext=await browser.newContext({acceptDownloads:true}),mock=await mockContext.newPage();let modelMode='success';
  await mockContext.route('http://127.0.0.1:8952/**',async route=>{const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:8951','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});if(route.request().url().endsWith('/status'))return route.fulfill({json:{available:true,model:'mock-model'},headers:cors});if(modelMode==='slow')await new Promise(r=>setTimeout(r,450));return route.fulfill({status:modelMode==='failure'?502:200,json:modelMode==='failure'?{error:'模拟模型输出无效'}:{plan:plan.plan,model:'mock-model',requestId:'mock-response'},headers:cors});});
  await mock.goto(base+'studio.html?example=headphones');await mock.waitForFunction(()=>!document.querySelector('#plan-provider option[value=model]').disabled);await mock.locator('#plan-provider').selectOption('model');await mock.locator('#generate-plan').click();await mock.waitForFunction(()=>document.querySelector('#plan-source').textContent==='在线模型生成');
  check('在线传输模拟成功后标明模型来源',!await mock.locator('#open-plan-product').isDisabled());
  modelMode='failure';await mock.locator('#generate-plan').click();await mock.waitForFunction(()=>document.querySelector('#studio-status').textContent.includes('模拟模型输出无效'));
  check('在线失败不交付旧方案',await mock.locator('#download-plan').isDisabled()&&await mock.locator('#open-plan-product').isDisabled());
  modelMode='slow';await mock.locator('#generate-plan').click();await mock.locator('#brief-goal').fill('新目标');await mock.waitForTimeout(600);
  check('在线返回期间修改目标取消旧结果',await mock.locator('#download-plan').isDisabled()&&!await mock.locator('#generate-plan').isDisabled());await mockContext.close();
  const fallbackContext=await browser.newContext();await fallbackContext.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});const fallback=await fallbackContext.newPage();await fallback.goto(base+'showroom.html?example=headphones');await fallback.waitForFunction(()=>document.querySelector('#headphone-render-status')?.textContent.includes('三维不可用'));
  check('无 WebGL 时明示降级并关闭无效结构操作',await fallback.locator('#headphone-fold').isDisabled()&&await fallback.locator('[data-headphone-view=front]').isDisabled()&&!await fallback.locator('#save-headphone-config').isDisabled());await fallbackContext.close();
  check('主流程无未处理浏览器或控制台错误',errors.length===0);completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/headphone-regression-v13.json',JSON.stringify({completed,failure,checks,errors,limitations:['在线成功/失败/取消采用模拟传输，未作付费真实模型调用','图像与几何是原创概念，未标定实物或声学性能','陌生产品只生成要求草案，不自动生成运行模块','手机使用模拟视口，未测真机性能']},null,2)+'\n');await browser.close();console.log(JSON.stringify({completed,checks:checks.length,errors,failure}));}
