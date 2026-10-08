import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/',folder=root+'notes/foundry-downloads-v13/';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));const check=(name,v)=>{assert.ok(v,name);checks.push({name,passed:true});};
async function download(scope,id,name){const [d]=await Promise.all([page.waitForEvent('download'),scope.locator(id).click()]);await d.saveAs(folder+name);return readFile(folder+name);}
let completed=false,failure=null;
try{
  await page.goto(base+'studio.html?example=headphones&revision=20261003-13');check('只要求产品与任务，其余输入可展开',!await page.locator('.s-optional').getAttribute('open'));
  await page.locator('#generate-plan').click();await page.locator('#plan-actions').waitFor({state:'visible'});
  check('方案有三个可切换的内容面板',await page.locator('[role=tab]').count()===3&&await page.locator('#panel-overview').isVisible());
  await page.locator('#tab-overview').focus();await page.keyboard.press('ArrowRight');check('键盘切换素材标签并同步 aria 状态',await page.locator('#tab-assets').getAttribute('aria-selected')==='true'&&await page.locator('#panel-assets').isVisible());
  await page.keyboard.press('ArrowRight');check('键盘可进入调整与验收',await page.locator('#panel-review').isVisible());
  await page.locator('#review-headline').fill('随心聆听，保留你的选择。');await page.locator('#review-tagline').fill('看清外观与配色，再留下配置。');
  check('未应用调整禁止交付旧内容',await page.locator('#open-plan-product').isDisabled()&&await page.locator('#download-plan').isDisabled()&&await page.locator('#download-brief').isDisabled());
  await page.locator('#review-finish').uncheck();await page.locator('#review-structure').uncheck();await page.locator('#review-form details summary').click();
  await page.locator('[data-review-requirement="0"]').fill('完整头戴轮廓，手机标题不能覆盖头梁。');await page.locator('[data-review-verify="0"]').fill('检查 390 像素首屏的主体与按钮。');await page.locator('#apply-review').click();
  check('调整明确记录来源，下载重新可用',await page.locator('#plan-source').textContent().then(v=>v.includes('已调整'))&&!await page.locator('#download-brief').isDisabled());
  const plan=JSON.parse(await download(page,'#download-plan','edited-plan.json'));
  check('实际方案文件保存文案、要求与交互开关',plan.plan.headline.startsWith('随心聆听')&&plan.plan.requirements[0].verify.includes('390')&&!plan.implementationOptions.finish&&!plan.implementationOptions.structure&&plan.revisions.length===1&&!plan.plan.userFlow.some(v=>v.includes('部件')));
  const md=(await download(page,'#download-brief','production-brief.md')).toString();check('制作简报可读且包含验收与事实边界',md.includes('随心聆听')&&md.includes('手机标题不能覆盖头梁')&&md.includes('清单不是完成证明'));
  await page.goto(base+'studio.html?revision=20261003-13');check('刷新恢复已调整方案与操作范围',await page.locator('#review-headline').inputValue()==='随心聆听，保留你的选择。'&&!await page.locator('#review-structure').isChecked());
  await page.locator('#open-plan-product').click();await page.waitForFunction(()=>document.querySelector('#prototype-mode')?.textContent.includes('本地 WebGL'));
  const f=await (await page.locator('#prototype').elementHandle()).contentFrame();await f.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  check('实际产品页使用修改后的标题',await f.locator('.h-hero-copy h1').textContent()==='随心聆听，保留你的选择。');
  check('关闭的表面与部件操作实际从页面移除',await f.locator('#headphone-finish').count()===0&&await f.locator('#headphone-explode').count()===0&&await f.locator('[data-headphone-view=structure]').count()===0);
  await f.locator('[name=headphone-color]').nth(1).check();await f.locator('[data-headphone-environment=night]').click();await f.locator('#headphone-fold').evaluate(e=>{e.value='70';e.dispatchEvent(new Event('input',{bubbles:true}));});
  check('选配旁摘要同步实际选择',await f.locator('#headphone-live-summary').textContent().then(v=>v.includes('石墨')&&v.includes('夜色')&&v.includes('70%')));
  await f.locator('#reset-headphone').click();const chosen=JSON.parse(await download(f,'#save-headphone-config','reset-selection.json'));
  check('重置同时恢复模型和导出状态',chosen.selection.color==='#c4c8ca'&&chosen.selection.foldPercent===0&&chosen.selection.structurePercent===0&&chosen.selection.environment==='warm'&&chosen.selection.view==='hero');
  await page.locator('#go-delivery').click();await download(page,'#export-zip','idea-foundry-reviewed-headphones-v13.zip');
  const unpack=folder+'standalone';const py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import pathlib,sys,zipfile
z=zipfile.ZipFile(sys.argv[1]);p=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():assert (p/n).resolve().is_relative_to(p)
z.extractall(p)`,folder+'idea-foundry-reviewed-headphones-v13.zip',unpack],{encoding:'utf8'});assert.equal(py.status,0,py.stderr);
  const cfg=JSON.parse(await readFile(unpack+'/product-definition.json','utf8'));check('项目包定义保留调整来源与实际操作范围',cfg.product.experiencePlanSource.includes('已调整')&&!cfg.product.product.features.finish&&!cfg.product.product.features.structure&&!cfg.userFlow.some(v=>v.includes('部件')||v.includes('表面')));
  const isolated=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),bundle=await isolated.newPage();bundle.on('pageerror',e=>errors.push(e.message));
  await isolated.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='reviewed.test')return route.abort();const file=path.resolve(unpack,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(path.resolve(unpack)+path.sep))return route.abort();try{await route.fulfill({contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
  await bundle.goto('http://reviewed.test/');await bundle.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');check('阻断包外资源后修改文案与关闭操作仍生效',await bundle.locator('.h-hero-copy h1').textContent()==='随心聆听，保留你的选择。'&&await bundle.locator('#headphone-explode').count()===0);await isolated.close();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:844});await page.goto(base+'studio.html?example=headphones');await page.locator('#generate-plan').click();await page.locator('#plan-actions').waitFor({state:'visible'});for(const name of ['overview','assets','review']){await page.locator('[data-plan-tab='+name+']').click();check(width+' / '+name+' 标签无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}}
  await page.locator('#brief-product').fill('咖啡机');await page.locator('#generate-plan').click();check('新产品调整仍不伪造耳机运行模块',await page.locator('#open-plan-product').isDisabled()&&!await page.locator('#download-brief').isDisabled());
  check('无未处理浏览器错误',errors.length===0);completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/foundry-verification-v13.json',JSON.stringify({completed,failure,checks,errors,limitations:['规则/预置方案与人工调整，不是本次在线模型生成','概念影像与几何，非厂商实物标定','手机视口模拟，未测真机或商业效果']},null,2));await browser.close();console.log(JSON.stringify({completed,checks:checks.length,errors,failure}));}
