import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.CAPABILITY_PREVIEW_URL||'http://127.0.0.1:8951/projects/011-combination-soup-studio/';
const localOrigin=new URL(base).origin;
await mkdir(root+'assets',{recursive:true});await mkdir(root+'notes/verification-downloads',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1,acceptDownloads:true});
const errors=[],externalRequests=[],externalMediaAborts=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>{const failure=r.failure()?.errorText;if(r.url()==='https://combinationsoupstudio.com.au/assets/previews/soup-v-soup-s.mp4'&&failure==='net::ERR_ABORTED')externalMediaAborts.push({url:r.url(),failure});else errors.push(r.url()+' '+failure);});page.on('request',r=>{if(!r.url().startsWith(localOrigin+'/')&&!r.url().startsWith('blob:')&&r.url()!=='https://combinationsoupstudio.com.au/assets/previews/soup-v-soup-s.mp4')externalRequests.push(r.url());});
function check(name,result){if(!result)console.error(JSON.stringify({failedCheck:name,errors,externalRequests}));assert.ok(result,name);checks.push({name,passed:true});}
const facts=async()=>JSON.parse(await page.locator('#facts-preview').textContent());
async function slide(id,value){await page.locator(id).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function download(button,file){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);await d.saveAs(root+'notes/verification-downloads/'+file);check('下载 '+file,(await readFile(root+'notes/verification-downloads/'+file)).length>20);return d;}
try{
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#facts-preview').textContent.includes('山野茶社'));
  check('业务场景与研究来源入口可访问',await page.locator('#tab-brand').getAttribute('aria-selected')==='true'&&await page.locator('#sources a').count()===4);
  await page.screenshot({path:root+'assets/overview.png',fullPage:false});
  await page.locator('#brand-name').fill('林间茶屋');await page.locator('#brand-headline').fill('给周末，一杯新茶。');await page.locator('#brand-goal').selectOption('新品预订');await page.locator('input[name="brand-theme"][value="cobalt"]').check();
  check('品牌输入与画面实时同步',await page.locator('#preview-brand').textContent()==='林间茶屋'&&(await page.locator('#preview-headline').textContent()).includes('给周末')&&await page.locator('#brand-cta').textContent()==='新品预订');
  check('配色切换与事实同步',(await page.locator('#brand-preview').getAttribute('class')).includes('cobalt')&&(await facts()).当前参数.theme==='cobalt');
  await page.locator('#brand-name').fill('<img src=x>');check('输入按文字显示，没有 HTML 执行',await page.locator('#preview-brand').textContent()==='<img src=x>'&&await page.locator('#preview-brand img').count()===0);await page.locator('#brand-name').fill('林间茶屋');
  await page.locator('#brand-motion').uncheck();check('动效可停用',!(await page.locator('#brand-preview').getAttribute('class')).includes('motion-on'));
  await page.locator('#brand-cta').click();check('行动入口生成需求单，没有外部发送',await page.locator('#brief-dialog').isVisible()&&(await page.locator('#brief-text').textContent()).includes('林间茶屋'));
  await download('#brief-download','brand-brief.md');check('需求单保存当前业务选择',(await readFile(root+'notes/verification-downloads/brand-brief.md','utf8')).includes('新品预订'));
  await page.keyboard.press('Escape');check('需求单 Escape 可关闭',!await page.locator('#brief-dialog').isVisible());
  await page.locator('#tab-brand').focus();await page.keyboard.press('ArrowRight');check('场景页签支持键盘切换',await page.locator('#tab-product').getAttribute('aria-selected')==='true');
  await page.locator('#product-spin').uncheck();await page.waitForTimeout(100);const before=await page.locator('#product-canvas').evaluate(c=>c.toDataURL());
  await page.locator('input[name="product-color"][value="#bb633f"]').check();await slide('#product-explode',80);await slide('#product-light',40);await page.locator('#product-finish').selectOption('gloss');
  await page.waitForTimeout(850);const after=await page.locator('#product-canvas').evaluate(c=>c.toDataURL());check('产品配色、展开与表面改变实际画面',before!==after&&(await facts()).当前参数.explode===80&&(await facts()).当前参数.finish==='gloss');
  await page.locator('#product-canvas').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(before=>document.querySelector('#product-canvas').toDataURL()!==before,after);await page.waitForTimeout(500);check('键盘可以旋转产品',after!==await page.locator('#product-canvas').evaluate(c=>c.toDataURL()));
  const box=await page.locator('#product-canvas').boundingBox();const dragBefore=await page.locator('#product-canvas').evaluate(c=>c.toDataURL());await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.6,{steps:8});await page.mouse.up();await page.waitForFunction(before=>document.querySelector('#product-canvas').toDataURL()!==before,dragBefore);check('拖动可以旋转产品',dragBefore!==await page.locator('#product-canvas').evaluate(c=>c.toDataURL()));
  await page.locator('#scene-workspace').screenshot({path:root+'assets/product-scene.png'});await download('#image-download','product.png');
  await page.locator('#product-reset').click();check('产品重置恢复所有选项',(await facts()).当前参数.color==='#356873'&&(await facts()).当前参数.explode===0&&await page.locator('#product-light').inputValue()==='70');
  await page.locator('#tab-garden').click();check('默认庭院面积正确',await page.locator('#area-total').textContent()==='96.0 m²');
  await page.locator('#garden-save').click();await slide('#garden-width',16);await slide('#garden-depth',10);await slide('#garden-pond',30);await slide('#garden-green',45);await page.locator('#garden-priority').selectOption('gather');
  const current=await facts(),a=current.面积计算_m2;check('区域面积守恒且留有通行空间',Math.abs(a.pond+a.green+a.deck+a.other-a.total)<1e-8&&a.other>=a.total*.05&&current.当前参数.green===35);check('自动约束有明确说明',(await page.locator('#garden-compare-note').textContent()).includes('预留至少 5%'));
  await page.locator('#garden-compare').click();check('方案 A 比较保留当前输入',await page.locator('#garden-width').inputValue()==='16'&&await page.locator('#area-total').textContent()==='96.0 m²'&&(await facts()).当前查看==='已保存的方案 A');
  await page.locator('#garden-compare').click();check('返回当前方案没有覆盖参数',await page.locator('#area-total').textContent()==='160.0 m²'&&await page.locator('#garden-green').inputValue()==='35');
  const gardenBefore=await page.locator('#garden-canvas').evaluate(c=>c.toDataURL());await page.locator('#garden-time').selectOption('night');check('时段改变实际方案画面',gardenBefore!==await page.locator('#garden-canvas').evaluate(c=>c.toDataURL()));
  await page.locator('#scene-workspace').screenshot({path:root+'assets/garden-scene.png'});await download('#image-download','garden.png');
  await download('#facts-download','garden-facts.json');const json=JSON.parse(await readFile(root+'notes/verification-downloads/garden-facts.json','utf8'));check('事实导出与当前方案一致',json.面积计算_m2.total===160&&json.当前参数.time==='night');
  await page.locator('#brief-open').click();await download('#brief-download','garden-brief.md');check('庭院需求单包含面积与采用边界',(await readFile(root+'notes/verification-downloads/garden-brief.md','utf8')).includes('160.00 m²')&&(await page.locator('#brief-text').textContent()).includes('现场测量'));await page.locator('#brief-close').click();
  for(const width of [390,768,1280]){await page.setViewportSize({width,height:900});for(const key of ['brand','product','garden']){await page.locator('#tab-'+key).click();check(`${width}px / ${key} 没有横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check(`${width}px / ${key} 主操作可见`,await page.locator('#brief-open').isVisible());}if(width===390){await page.screenshot({path:root+'assets/mobile.png',fullPage:true});}}
  const rp=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await rp.goto(base);await rp.waitForFunction(()=>document.querySelector('#facts-preview').textContent.length>0);check('减少动态偏好默认停用标题动效',!await rp.locator('#brand-motion').isChecked());await rp.locator('#tab-product').click();check('减少动态偏好默认停用自动旋转',!await rp.locator('#product-spin').isChecked());await rp.close();
  await page.setViewportSize({width:1440,height:1080});await page.locator('#tab-brand').click();await page.locator('#brand-name').fill('山野茶社');await page.locator('#brand-headline').fill('把春天，泡进今天。');await page.locator('#brand-goal').selectOption('预约试饮');await page.locator('input[name="brand-theme"][value="forest"]').check();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:root+'assets/overview.png',fullPage:false});
  check('场景运行没有额外外部请求，原站视频为明确依赖',externalRequests.length===0);check('没有浏览器运行错误',errors.length===0);
  const report={date:'2026-10-02',url:base,checks,errors,externalRequests,externalMediaAborts,allowedExternalMedia:['https://combinationsoupstudio.com.au/assets/previews/soup-v-soup-s.mp4'],scope:'浏览器桌面与窄屏视口验证；没有真实客户转化、手机硬件性能、原站后端或交易验收。'};
  await writeFile(root+'notes/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors,externalRequests,screenshots:['overview.png','product-scene.png','garden-scene.png','mobile.png']}));
}finally{await browser.close();}
