import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/';
const downloads=path.join(root,'notes/foundry-v1-downloads'),shots=path.join(root,'assets/qa');
await mkdir(downloads,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'});
const page=await context.newPage(),checks=[],errors=[];
let completed=false,failure=null;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{window.foundryReports=[];window.addEventListener('message',e=>{if(e.data?.type?.startsWith('foundry-'))window.foundryReports.push(e.data);});});
const check=(name,result)=>{assert.ok(result,name);checks.push({name,passed:true});};
const frame=async()=>await (await page.locator('#prototype').elementHandle()).contentFrame();
const ready=()=>page.waitForFunction(()=>document.querySelector('#prototype-mode').textContent.includes('本地 WebGL')||document.querySelector('#prototype-mode').textContent.includes('本地服务'));
async function build(){await page.locator('#build').click();await ready();return frame();}
async function slider(f,id,value){await f.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}
async function download(scope,id,name){const [d]=await Promise.all([page.waitForEvent('download'),scope.locator(id).click()]);await d.saveAs(path.join(downloads,name));return readFile(path.join(downloads,name));}
const lastResult=()=>page.evaluate(()=>window.foundryReports.filter(r=>r.type==='foundry-result').at(-1)?.result);
async function checkBundle(name,template){
  const target=path.join(downloads,template+'-unpacked');
  const py=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c',`import zipfile,pathlib,sys,json
z=zipfile.ZipFile(sys.argv[1]);root=pathlib.Path(sys.argv[2]).resolve();assert z.testzip() is None
for n in z.namelist():
 p=(root/n).resolve();assert p.is_relative_to(root)
z.extractall(root);print(json.dumps(z.namelist()))`,path.join(downloads,name),target],{encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);const files=JSON.parse(py.stdout);
  check(template+' ZIP 校验和与路径合法',files.includes('index.html')&&files.includes('README.md')&&files.includes('product-definition.json'));
  check(template+' 按需携带依赖',template==='product'?files.includes('vendor/THREE-LICENSE.txt'):!files.some(n=>n.includes('three-r160')));
  const isolated=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true}),standalone=await isolated.newPage(),bundleErrors=[];
  standalone.on('pageerror',e=>bundleErrors.push(e.message));
  await isolated.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.hostname!=='bundle.test'){await route.abort();return;}
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(target,'.'+relative);
    if(!file.startsWith(target+path.sep)){await route.abort();return;}
    try{const data=await readFile(file),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.txt':'text/plain'}[path.extname(file)]||'application/octet-stream';await route.fulfill({status:200,contentType:mime,body:data});}catch{await route.fulfill({status:404,body:'File not found'});}
  });
  await standalone.goto('http://bundle.test/');
  const def=JSON.parse(await readFile(path.join(target,'product-definition.json'),'utf8'));
  check(template+' 包内名称与定义一致',await standalone.locator('.p-header strong').textContent()===def.product.name);
  if(template==='product'){
    await standalone.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('拖动'));
    check('独立产品包恢复当前颜色与亮度',await standalone.locator('[name=color]:checked').inputValue()===def.product.product.initial.color&&await standalone.locator('#light').inputValue()===String(def.product.product.initial.light));
    await standalone.locator('#finish').selectOption('matte');
    const [d]=await Promise.all([standalone.waitForEvent('download'),standalone.locator('#save-config').click()]);await d.saveAs(path.join(downloads,'standalone-selection.json'));
    check('独立产品包完成选配与导出',JSON.parse(await readFile(path.join(downloads,'standalone-selection.json'),'utf8')).selection.finish==='matte');
    await standalone.screenshot({path:path.join(shots,'foundry-product-standalone-v1.png'),fullPage:true});
  }else{
    await standalone.locator('#query').click();check('独立服务包按实际配置查询',await standalone.locator('#query-title').textContent()==='苏州 · 在当前服务范围内');
  }
  check(template+' 包离开演示站可运行',bundleErrors.length===0);
  check(template+' README 有真实换行',(await readFile(path.join(target,'README.md'),'utf8')).includes('\n\n## 首版任务\n'));
  await isolated.close();return def;
}
try{
  await page.goto(base+'?example=product');
  check('定义页从完整示例开始',await page.locator('#name').inputValue()==='配灯 · 灯具选配');
  await page.locator('#name').fill('LUMA · 桌灯配置');await page.locator('#headline').fill('先看清，再选定。');await page.locator('#item-name').fill('LUMA 弧线桌灯');
  await page.locator('#colors-editor [data-color=label]').nth(1).fill('陶土橙');
  await page.screenshot({path:path.join(shots,'foundry-define-desktop-v1.png'),fullPage:true});
  let f=await build();check('自定义名称和标题进入运行原型',await f.locator('.p-header strong').textContent()==='LUMA · 桌灯配置'&&await f.locator('h1').textContent()==='先看清，再选定。');
  const before=await f.locator('canvas').evaluate(c=>c.toDataURL());await f.locator('[name=color]').nth(1).check();
  await f.waitForFunction(b=>document.querySelector('canvas').toDataURL()!==b,before);
  check('配色改变实际 WebGL 像素',await f.locator('canvas').evaluate(c=>c.toDataURL())!==before);
  await f.locator('#finish').selectOption('gloss');await slider(f,'#light',37);await f.locator('[data-view=structure]').click();
  const selection=JSON.parse(await download(f,'#save-config','product-selection.json'));
  check('选配导出准确保留名称/材质/亮度/结构',selection.selection.colorName==='陶土橙'&&selection.selection.finish==='gloss'&&selection.selection.lightPercent===37&&selection.selection.structurePercent===78&&!selection.submitted);
  const png=await download(f,'#save-image','product-preview.png');check('当前画面实际导出 PNG',png.subarray(1,4).toString()==='PNG'&&png.length>10000);
  await page.screenshot({path:path.join(shots,'foundry-preview-desktop-v1.png'),fullPage:true});
  await page.locator('#save-project').click();check('产品可保存继续',await page.locator('[data-project]').count()===1);
  await page.locator('#go-delivery').click();await page.screenshot({path:path.join(shots,'foundry-delivery-desktop-v1.png'),fullPage:true});
  await download(page,'#export-zip','idea-foundry-product.zip');const productDef=await checkBundle('idea-foundry-product.zip','product');
  check('包的启动配置与当前试用一致',productDef.product.product.initial.color===selection.selection.color&&productDef.product.product.initial.explode===78);
  const json=JSON.parse(await download(page,'#export-json','product-definition.json'));check('产品定义明确记录模型未接入',json.construction.modelConnected===false);
  await page.locator('[data-step=define]').click();await page.locator('#name').fill('修改后的产品');
  await page.locator('[data-step=delivery]').click();check('修改定义后阻止导出过期运行包',await page.locator('#export-zip').isDisabled()&&await page.locator('#export-json').isDisabled());
  await page.locator('[data-step=define]').click();await page.locator('[data-import]').setInputFiles(path.join(downloads,'product-definition.json'));
  await page.waitForFunction(()=>document.querySelector('#name').value==='LUMA · 桌灯配置');
  check('JSON 导入还原产品和当前配置',await page.locator('#name').inputValue()==='LUMA · 桌灯配置');
  await page.locator('#feature-structure').uncheck();f=await build();check('功能开关改变真实页面',await f.locator('#explode').count()===0&&await f.locator('[data-view=structure]').count()===0);
  await page.locator('#back-edit').click();await page.locator('#use-ai').check();f=await build();await page.locator('#go-delivery').click();
  check('AI 需求作为待接能力展示',await page.locator('#pending-list').textContent().then(v=>v.includes('AI 模型服务'))&&await f.locator('footer').textContent().then(v=>v.includes('AI 服务待接入')));
  await page.locator('[data-step=define]').click();await page.locator('[data-template=coverage]').click();
  await page.locator('#name').fill('到家 · 维修资格查询');await page.locator('#idea').fill('让顾客确认自己所在地区是否可以上门维修，再整理故障需求。');await page.locator('#problem').fill('顾客不清楚上门范围，咨询经常缺少故障说明。');await page.locator('#input').fill('地区规则和故障需求');await page.locator('#outcome').fill('明确的服务结果和可交接的维修需求');await page.locator('#headline').fill('维修能否上门，先查清楚。');await page.locator('#tagline').fill('确认地区，说明故障，把完整需求带走。');await page.locator('#service-name').fill('上门维修');await page.locator('[data-region=name]').first().fill('苏州');await page.locator('[data-region=detail]').first().fill('周一至周六可安排维修，具体时间需人工确认。');
  f=await build();await f.locator('#query').click();check('新规则形成实际查询结果',await f.locator('#query-title').textContent()==='苏州 · 在当前服务范围内');
  await f.locator('#request-note').fill('客厅主灯无法点亮');const request=JSON.parse(await download(f,'#save-request','service-request.json'));
  check('服务摘要保留地区/需求且没有虚假提交',request.region==='苏州'&&request.note==='客厅主灯无法点亮'&&!request.submitted);
  await f.locator('#region').selectOption('region-2');check('切换地区清除过期查询',await f.locator('#save-request').isDisabled()&&await lastResult()===null);
  await f.locator('#query').click();check('未覆盖规则反馈正确',await f.locator('#query-title').textContent()==='上海 · 暂未覆盖');
  await page.screenshot({path:path.join(shots,'foundry-service-desktop-v1.png'),fullPage:true});
  await page.locator('#save-project').click();check('两种产品定义独立保存',await page.locator('[data-project]').count()===2);
  await page.locator('#go-delivery').click();await download(page,'#export-zip','idea-foundry-coverage.zip');await checkBundle('idea-foundry-coverage.zip','coverage');
  await page.reload();check('刷新保留两个产品',await page.locator('[data-project]').count()===2);
  await page.locator('#save-project').click();check('刷新继续编辑不会重复创建产品',await page.locator('[data-project]').count()===2);
  await page.locator('[data-project]').filter({hasText:'LUMA'}).click();check('保存后恢复选配结果',await page.locator('#name').inputValue()==='LUMA · 桌灯配置');
  await page.locator('#name').fill('</script><img src=x onerror="window.bad=1">');await page.locator('#headline').fill('<svg onload="window.bad=1">');f=await build();
  check('用户内容作为文本显示',await f.locator('.p-header strong').textContent()==='</script><img src=x onerror="window.bad=1">'&&await f.locator('img,svg').count()===0&&!await f.evaluate(()=>window.bad));
  await page.locator('#back-edit').click();await page.locator('#name').fill('');await page.locator('#build').click();check('必填定义缺失阻止构建',await page.locator('#status').textContent()==='请填写产品名称。');
  await page.locator('[data-import]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('JSON 格式无效'));check('无效 JSON 有明确反馈',true);
  const invalid=structuredClone(json);invalid.schemaVersion='2';invalid.product.schemaVersion='2';await page.locator('[data-import]').setInputFiles({name:'unknown.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('版本不支持'));check('未知定义版本被拒绝',true);
  await page.locator('[data-import]').setInputFiles(path.join(downloads,'product-definition.json'));await page.waitForFunction(()=>document.querySelector('#name').value==='LUMA · 桌灯配置');await page.locator('[data-color=value]').nth(1).evaluate(el=>{el.value='#356873';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#build').click();check('重复配色阻止构建',await page.locator('#status').textContent()==='配色值不能重复。');
  await page.locator('#new-project').click();await page.locator('#name').fill('办公照明 · 新产品');await page.locator('#save-project').click();check('同类新想法创建独立产品',await page.locator('[data-project]').count()===3&&await page.locator('[data-project]').filter({hasText:'LUMA'}).count()===1);
  for(const width of [768,390]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'?example=product');
    check(width+' 定义页无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));f=await build();
    check(width+' 原型与工作台无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(shots,'foundry-preview-'+width+'-v1.png'),fullPage:true});
  }
  check('运行过程无未处理浏览器错误',errors.length===0);
  completed=true;
}catch(e){failure=e.message;throw e;}finally{
  await writeFile(path.join(root,'notes/foundry-v1-verification.json'),JSON.stringify({version:'1.0',checkedAt:new Date().toISOString(),completed,failure,checks,errors,limitations:['浏览器使用桌面 Chromium；手机宽度验证不代表真实手机硬件性能','未接入在线模型、真实产品数据或业务提交','价值指标尚未经过真实用户测量']},null,2)+'\n');
  await browser.close();console.log(JSON.stringify({checks:checks.length,errors}));
}
