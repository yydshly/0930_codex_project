import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/',downloads=path.join(root,'notes/toilet-downloads-v10');
await mkdir(downloads,{recursive:true});await mkdir(root+'assets/qa',{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage(),checks=[],errors=[];
let completed=false,failure=null;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{window.reports=[];window.addEventListener('message',e=>{if(e.data?.type==='foundry-result')window.reports.push(e.data.result);});});
const check=(name,result)=>{assert.ok(result,name);checks.push({name,passed:true});},frame=async()=>await (await page.locator('#prototype').elementHandle()).contentFrame();
const ready=()=>page.waitForFunction(()=>document.querySelector('#prototype-mode').textContent.includes('本地 WebGL'));
async function result(){
  await page.waitForFunction(()=>{
    const d=document.querySelector('#prototype')?.contentDocument,r=window.reports.at(-1);if(!d?.querySelector('#toilet-canvas')||!r?.selection)return false;
    const value=id=>d.querySelector(id)?.value,n=id=>value(id)===''?null:Number(value(id));
    return r.selection.modelId===d.querySelector('[data-model][aria-pressed=true]')?.dataset.model&&r.selection.roughIn===Number(value('#toilet-rough-in'))&&r.selection.includeInstallation===d.querySelector('#include-installation').checked&&r.selection.color===d.querySelector('[name=toilet-color]:checked')?.value&&r.selection.lidPercent===Number(value('#toilet-lid'))&&r.site.drain===value('#site-drain')&&r.site.power===value('#site-power')&&r.site.notes===value('#site-notes')&&r.site.roughIn===n('#site-rough-in')&&r.site.width===n('#site-width')&&r.site.depth===n('#site-depth')&&r.specification.depthMm===Number(d.querySelector('#toilet-depth').textContent);
  });
  return page.evaluate(()=>window.reports.at(-1));
}
async function slider(f,id,value){await f.locator(id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function download(scope,id,name){const [d]=await Promise.all([page.waitForEvent('download'),scope.locator(id).click()]);await d.saveAs(path.join(downloads,name));return readFile(path.join(downloads,name));}
async function changedImage(f,action,label){const before=await f.locator('canvas').evaluate(c=>c.toDataURL());await action();await f.waitForFunction(b=>document.querySelector('canvas').toDataURL()!==b,before);check(label,true);}
try{
  await page.goto(base+'?example=toilet&step=preview&revision=20261002-10');await ready();let f=await frame();
  check('马桶案例直接进入独立产品模块',await f.locator('#toilet-canvas').count()===1&&await f.locator('#product-canvas').count()===0&&await f.locator('[data-model]').count()===3);
  check('默认保留未测量项而非安装成功',await f.locator('#toilet-fit-result').getAttribute('data-fit')==='incomplete'&&!await f.locator('#fit-title').textContent().then(v=>v.includes('可以安装')));
  await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-smart-hero-v10.png'});
  await changedImage(f,()=>slider(f,'#toilet-lid',100),'盖板开合实际改变三维画面');
  await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-smart-open-v10.png'});
  await changedImage(f,()=>f.locator('[name=toilet-color]').nth(2).check(),'陶瓷配色实际改变像素');
  await changedImage(f,()=>f.locator('[data-model=compact]').click(),'切换型号实际改变水箱与形体');
  check('型号切换同步尺寸/电源/示例价',await f.locator('#toilet-depth').textContent()==='650'&&await f.locator('#toilet-power').textContent()==='无需'&&await f.locator('#toilet-total').textContent()==='¥2,190');
  await changedImage(f,()=>f.locator('[data-toilet-view=side]').click(),'侧面与尺寸标注改变画面');
  check('侧面视角同步尺寸开关',await f.locator('#show-dimensions').isChecked());
  await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-side-dimensions-v10.png'});
  await changedImage(f,()=>f.locator('[data-toilet-view=structure]').click(),'部件视角实际展开组件');
  check('部件展开值同步交接数据',(await result()).selection.structurePercent===80);
  await f.locator('[data-model=smart]').click();await f.locator('[data-toilet-view=hero]').click();await slider(f,'#toilet-lid',0);await f.locator('[name=toilet-color]').first().check();
  await f.locator('#use-site-example').click();check('完整示例现场可初步匹配',await f.locator('#toilet-fit-result').getAttribute('data-fit')==='preliminary-match');
  await f.locator('#include-installation').check();check('示例合计由产品与安装需求驱动',(await result()).estimate.total===6480);
  await f.locator('#toilet-rough-in').selectOption('400');check('坑距改变后原匹配结果失效',await f.locator('#toilet-fit-result').getAttribute('data-fit')==='conflict'&&(await result()).fit.checks.find(x=>x.key==='roughIn').status==='conflict');
  await f.locator('#toilet-rough-in').selectOption('305');await f.locator('#site-power').selectOption('no');check('电子款缺少电源形成冲突',(await result()).fit.checks.find(x=>x.key==='power').status==='conflict');
  await f.locator('[data-model=compact]').click();check('无电源款恢复正确规则',(await result()).fit.checks.find(x=>x.key==='power').status==='match');
  await f.locator('#site-width').fill('400');check('空间宽度不足形成明确冲突',(await result()).fit.checks.find(x=>x.key==='width').status==='conflict');
  await f.locator('#site-width').fill('900');await f.locator('#site-depth').fill('750');check('空间进深不足形成明确冲突',(await result()).fit.checks.find(x=>x.key==='depth').status==='conflict');
  await f.locator('#site-depth').fill('1200');await f.locator('#site-drain').selectOption('wall');check('后排水不会误判为当前目录适用',(await result()).fit.checks.find(x=>x.key==='drain').status==='conflict');
  await f.locator('#site-drain').selectOption('floor');await f.locator('#site-rough-in').fill('');check('清空已填测量值重新回到待确认',(await result()).fit.status==='incomplete');
  await f.locator('#site-width').fill('99999');check('异常现场数值禁止导出选型单',await f.locator('#save-toilet-config').isDisabled()&&(await result()).validation.valid===false);
  await page.locator('#go-delivery').click();await page.locator('#export-zip').click();check('异常现场数值禁止导出错误项目包',await page.locator('#status').textContent().then(v=>v.includes('修正原型中的现场数值')));
  await page.locator('#try-again').click();await f.locator('#use-site-example').click();await f.locator('#site-notes').fill('请复核门扇开启范围和进水位置。');
  const selected=JSON.parse(await download(f,'#save-toilet-config','toilet-selection.json'));
  check('选型单准确记录型号/坑距/现场/示例合计',selected.selection.modelId==='compact'&&selected.selection.roughIn===305&&selected.site.notes.includes('门扇')&&selected.estimate.total===2880&&selected.dataMode==='illustrative-catalog'&&!selected.submitted);
  const md=(await download(f,'#save-toilet-sheet','toilet-selection.md')).toString();check('交接说明包含尺寸与待复核边界',md.includes('365 × 650 × 735 mm')&&md.includes('非实际报价')&&md.includes('供水条件与现场复核'));
  const png=await download(f,'#save-toilet-image','toilet-preview.png');check('真实画面可下载 PNG',png.subarray(1,4).toString()==='PNG'&&png.length>10000);
  await f.locator('.t-fit').screenshot({path:root+'assets/qa/toilet-fit-matched-v10.png'});
  await page.locator('#save-project').click();check('马桶作为独立产品保存',await page.locator('[data-project]').count()===1);
  await page.locator('#go-delivery').click();await download(page,'#export-zip','idea-foundry-toilet.zip');const json=JSON.parse(await download(page,'#export-json','product-definition.json'));
  check('产品定义保留马桶配置与现场条件',json.product.product.kind==='toilet'&&json.product.toilet.initial.modelId==='compact'&&json.product.toilet.initial.includeInstallation&&json.product.toilet.initial.site.notes===selected.site.notes);
  const unpack=path.join(downloads,'standalone');
  const py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import sys,pathlib,zipfile,json
z=zipfile.ZipFile(sys.argv[1]);out=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():assert (out/n).resolve().is_relative_to(out)
z.extractall(out);print(json.dumps(z.namelist()))`,path.join(downloads,'idea-foundry-toilet.zip'),unpack],{encoding:'utf8'});assert.equal(py.status,0,py.stderr);const files=JSON.parse(py.stdout);
  check('马桶 ZIP 完整且仅含所需模块',files.includes('foundry/toilet-renderer.js')&&files.includes('vendor/THREE-LICENSE.txt')&&!files.includes('product-renderer.js')&&!files.some(n=>n.startsWith('source-assets/')));
  const isolated=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true}),standalone=await isolated.newPage(),bundleErrors=[];standalone.on('pageerror',e=>bundleErrors.push(e.message));
  await isolated.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='toilet.test'){await route.abort();return;}const file=path.resolve(unpack,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(unpack+path.sep)){await route.abort();return;}try{await route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.txt':'text/plain'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'missing file'});}});
  await standalone.goto('http://toilet.test/');await standalone.waitForFunction(()=>document.querySelector('#toilet-render-status')?.textContent.includes('拖动'));
  check('独立包恢复所选型号/现场/安装需求',await standalone.locator('#toilet-name').textContent()==='C1 紧凑款'&&await standalone.locator('#include-installation').isChecked()&&await standalone.locator('#site-notes').inputValue()===selected.site.notes);
  await standalone.locator('[data-model=smart]').click();check('独立包继续按业务规则核对',await standalone.locator('#toilet-fit-result').getAttribute('data-fit')==='preliminary-match');
  const [d]=await Promise.all([standalone.waitForEvent('download'),standalone.locator('#save-toilet-config').click()]);await d.saveAs(path.join(downloads,'standalone-selection.json'));check('离开工作台仍可完整操作与导出',JSON.parse(await readFile(path.join(downloads,'standalone-selection.json'),'utf8')).selection.modelId==='smart'&&bundleErrors.length===0);
  await standalone.locator('.t-main').screenshot({path:root+'assets/qa/toilet-standalone-v10.png'});await isolated.close();
  await page.reload();check('刷新保留马桶产品身份',await page.locator('#product-kind').inputValue()==='toilet'&&await page.locator('[data-project]').count()===1);
  await page.locator('[data-import]').setInputFiles(path.join(downloads,'product-definition.json'));await page.waitForFunction(()=>document.querySelector('#product-kind').value==='toilet');
  await page.locator('.toilet-catalog-row').first().locator('summary').click();await page.locator('[data-sku="0"][data-key=depth]').fill('620');await page.locator('[data-rule=frontClearance]').fill('350');
  await page.locator('#build').click();await ready();f=await frame();check('商家修改目录尺寸后实际运行页更新',await f.locator('#toilet-depth').textContent()==='620');
  check('商家修改规划值影响实际核对结果',(await result()).fit.requiredDepth===970);
  await page.locator('#back-edit').click();if(await page.locator('.toilet-catalog-row').first().getAttribute('open')===null)await page.locator('.toilet-catalog-row').first().locator('summary').click();await page.locator('[data-sku="0"][data-key=height]').fill('350');await page.locator('#build').click();check('不合理总高/坐高关系阻止构建',await page.locator('#status').textContent().then(v=>v.includes('总高应至少比坐高多')));
  for(const width of [768,390]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'?example=toilet');check(width+' 马桶定义页无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('#build').click();await ready();f=await frame();check(width+' 马桶预览可布局与滚动',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-preview-'+width+'-v10.png'});
  }
  check('马桶运行无未处理浏览器错误',errors.length===0);completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/toilet-verification-v10.json',JSON.stringify({completed,failure,checks,errors,limitations:['概念形体与虚构目录，未作实物尺寸或材质标定','空间预留为商家规划值；实际安装需厂商图纸及现场复核','未接入在线模型、真实报价或订单','模拟手机视口，不代表真机性能']},null,2)+'\n');await browser.close();console.log(JSON.stringify({completed,checks:checks.length,errors,failure}));}
