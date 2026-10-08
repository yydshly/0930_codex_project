import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.CAPABILITY_PREVIEW_URL||'http://127.0.0.1:8951/projects/011-combination-soup-studio/';
await mkdir(root+'notes/skill-downloads',{recursive:true});await mkdir(root+'assets/qa',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'});
const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function check(name,result){assert.ok(result,name);checks.push({name,passed:true});}
async function select(key){await page.locator('#skill-tab-'+key).click();}
async function download(id,name){const [file]=await Promise.all([page.waitForEvent('download'),page.locator(id).click()]);await file.saveAs(root+'notes/skill-downloads/'+name);return readFile(root+'notes/skill-downloads/'+name,'utf8');}
async function json(name){return JSON.parse(await download('#skill-download-config',name));}
async function field(id,value){await page.locator(id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
try{
  await page.goto(base+'?effect=broth&skill=explain&revision=20261002-6#skills');
  await page.waitForFunction(()=>document.querySelector('#skill-purpose').textContent.length>20);
  check('直接链接定位产品解释技能',await page.locator('#skill-tab-explain').getAttribute('aria-selected')==='true');
  await page.locator('#skill-project').fill('我们的桌灯 · 产品体验');await page.locator('#skill-task').fill('选择日落橙，并展开结构，导出准确配置。');
  await page.locator('#skill-proof button').click();
  await page.locator('input[name=product-color][value="#bb633f"]').check();await field('#product-explode',64);await page.locator('#product-spin').uncheck();
  await page.locator('.header a[href="#skills"]').click();
  const product=await json('product.json');
  check('实际产品参数进入技能契约',product.当前业务示例结果.当前参数.color==='#bb633f'&&product.当前业务示例结果.当前参数.explode===64&&product.当前业务示例结果.当前参数.spin===false);
  check('编辑任务与项目进入结果',product.项目==='我们的桌灯 · 产品体验'&&product.用户任务.startsWith('选择日落橙'));
  check('业务指标保留待测基线',product.业务价值验证.基线==='待真实用户采样'&&product.业务价值验证.状态.includes('尚未实测'));
  await page.locator('#skill-plan-toggle').click();
  check('预览包含实时参数与任务',await page.locator('#skill-plan-text').textContent().then(t=>t.includes('"explode": 64')&&t.includes('选择日落橙')));
  const md=await download('#skill-download-plan','product.md');
  check('Markdown交付与JSON保留同一结果',md.includes('"explode": 64')&&md.includes('功能验收')&&md.includes('业务价值如何验证'));
  await page.locator('#skill-plan-toggle').click();
  await select('story');await page.locator('#skill-project').fill('<img src=x onerror=alert(1)> 自有品牌');
  check('输入以文本显示，不注入元素',await page.locator('#skill-plan-project img').count()===0);
  await page.locator('#skill-proof button').click();await page.locator('#brand-name').fill('松间茶舍');await page.locator('#brand-tea').selectOption('oolong');await page.locator('#brand-goal').selectOption('新品预订');
  await page.locator('.header a[href="#skills"]').click();const brand=await json('brand.json');
  check('品牌与所选茶款真实编辑结果同步导出',brand.当前业务示例结果.当前参数.name==='松间茶舍'&&brand.当前业务示例结果.当前参数.goal==='新品预订'&&brand.当前业务示例结果.当前参数.tea==='oolong');
  await page.locator('#skill-project').fill('松间茶舍 · 新品选型');
  await select('explain');check('跨技能切换保留各自草稿',await page.locator('#skill-project').inputValue()==='我们的桌灯 · 产品体验');
  const cachedProduct=await json('product-after-brand.json');check('切换业务场景后仍保留产品的最新配置',cachedProduct.当前业务示例结果.当前参数.color==='#bb633f'&&cachedProduct.当前业务示例结果.当前参数.explode===64);
  await select('territory');
  for(const [city,service,covered] of [['hangzhou','庭院改造',true],['hangzhou','日常维护',true],['ningbo','庭院改造',true],['ningbo','日常维护',false],['shanghai','庭院改造',false],['shanghai','日常维护',false]]){
    await page.locator('#skill-region').selectOption(city);await page.locator('#skill-service').selectOption(service);
    check('地区与服务组合反馈 '+city+' '+service,(await page.locator('#skill-region-status').textContent()).includes(covered?'示例可服务':'示例未覆盖'));
  }
  await page.locator('#skill-region').selectOption('ningbo');await page.locator('#skill-service').selectOption('日常维护');const region=await json('region-uncovered.json');
  check('未覆盖显示与实际导出一致',region.当前业务示例结果.地区==='宁波'&&region.当前业务示例结果.所选服务==='日常维护'&&region.当前业务示例结果.覆盖状态==='示例未覆盖');
  check('查询资料明确属于虚构示例',region.当前业务示例结果.性质.includes('虚构服务资料'));
  await page.locator('#skill-scope').selectOption('integration');const scope=await json('integration-plan.json');
  check('业务接入仅承诺计划并列出待接项',scope.计划范围.includes('接入计划')&&scope.交付物.some(x=>x.includes('待接入清单'))&&scope.范围说明.includes('不表示已发送咨询'));
  await select('reveal');let reveal=await json('reveal-before.json');check('内容初始状态未揭晓',reveal.当前业务示例结果.已揭晓===false&&reveal.当前业务示例结果.当前内容===null);
  await page.locator('#skill-reveal').click();reveal=await json('reveal-open.json');
  check('揭晓内容与记录准确',reveal.当前业务示例结果.揭晓次数===1&&reveal.当前业务示例结果.当前内容.title===await page.locator('#skill-tip-title').textContent());
  await page.locator('#skill-reveal').click();await page.locator('#skill-reveal').click();await page.locator('#skill-reveal').click();reveal=await json('reveal-repeat.json');
  check('重复揭晓循环内容并记录次数',reveal.当前业务示例结果.揭晓次数===4&&reveal.当前业务示例结果.当前内容.title==='先看建议，再调口味。');
  await page.locator('#skill-reveal-reset').click();reveal=await json('reveal-reset.json');check('重置内容与次数',reveal.当前业务示例结果.揭晓次数===0&&reveal.当前业务示例结果.当前内容===null);
  await page.locator('#skill-tab-reveal').focus();await page.keyboard.press('ArrowLeft');check('技能可用键盘切换',await page.locator('#skill-tab-territory').getAttribute('aria-selected')==='true');
  await page.locator('#effect-tab-delivery').click();if(!await page.locator('#effect-application').isVisible())await page.locator('#effect-view-toggle').click();await page.locator('#effect-application').click();
  check('地图效果进入区域查询技能',await page.locator('#skill-tab-territory').getAttribute('aria-selected')==='true'&&new URL(page.url()).searchParams.get('skill')==='territory');
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1100});
    for(const key of ['story','explain','territory','reveal']){
      await select(key);await page.locator('#skills').scrollIntoViewIfNeeded();
      check('布局无页面水平溢出 '+key+' '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:root+'assets/qa/skills-'+key+'-'+width+'.png',fullPage:false});
    }
  }
  await page.setViewportSize({width:1440,height:1100});await select('explain');await page.locator('#skills').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-96));
  await page.screenshot({path:root+'assets/skills-workbench.png'});
  await select('territory');await page.locator('#skill-plan-toggle').click();await page.locator('#skill-project').fill('交付项目'.repeat(15));
  await page.setViewportSize({width:390,height:1100});check('长项目名与交付预览无页面溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check('无未处理浏览器错误',errors.length===0);
}finally{await writeFile(root+'notes/skill-verification.json',JSON.stringify({date:'2026-10-02',scope:'Skills workbench regression on business scene revision 20261002-6',checks,errors},null,2));await browser.close();}
console.log('Skills workbench:',checks.length,'checks passed; errors:',errors.length);
