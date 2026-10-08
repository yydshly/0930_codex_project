import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.CAPABILITY_PREVIEW_URL||'http://127.0.0.1:8951/projects/011-combination-soup-studio/';
await mkdir(root+'notes/scene-downloads-v5',{recursive:true});await mkdir(root+'assets/qa/v5',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'});
const checks=[],errors=[],failedAssets=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failedAssets.push({url:r.url(),status:r.status()});});
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
const facts=async()=>JSON.parse(await page.locator('#facts-preview').textContent());
const image=async()=>page.locator('#garden-canvas').evaluate(c=>c.toDataURL());
const slider=async(id,value)=>page.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
async function change(action,name){const before=await image();await action();await page.waitForFunction(before=>document.querySelector('#garden-canvas').toDataURL()!==before,before);check(name,before!==await image());}
async function download(id,name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(id).click()]);await d.saveAs(root+'notes/scene-downloads-v5/'+name);return readFile(root+'notes/scene-downloads-v5/'+name);}
async function position(){await page.locator('#scene-workspace').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-90));await page.waitForTimeout(450);}
try{
  await page.goto(base+'?effect=broth&scene=brand&revision=20261002-5#scenes');await position();
  await page.waitForFunction(()=>document.querySelector('.brand-photo').complete&&document.querySelector('.brand-photo').naturalWidth>1000);
  check('品牌使用实际解码的原创照片',await page.locator('.brand-photo').evaluate(el=>el.naturalWidth>=1440));
  await page.locator('#brand-name').fill('青山茶事');await page.locator('#brand-headline').fill('山中一盏茶，留住春日香。');await page.locator('#brand-tea').selectOption('oolong');
  check('摄影标签和正文仍同步客户内容',(await page.locator('.tin-logo').textContent()).replaceAll('\n','')==='青山'&&(await page.locator('.tin-type').textContent()).includes('焙香乌龙')&&(await facts()).当前参数.name==='青山茶事');
  await page.locator('#brand-cta').click();const brief=(await download('#brief-download','brand.md')).toString('utf8');
  check('品牌行动入口导出的内容保持当前选择',brief.includes('青山茶事')&&brief.includes('山中一盏茶，留住春日香。')&&brief.includes('焙香乌龙'));await page.locator('#brief-close').click();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1100});await page.locator('#brand-name').fill('来自春日山林的茶事研究与生活体验品牌');await page.locator('#brand-headline').fill('从春天的第一片新叶开始，寻找属于自己的日常茶味和慢生活。');await position();
    const bounds=await page.locator('#brand-preview').evaluate(el=>{const p=el.getBoundingClientRect(),h=el.querySelector('#preview-headline').getBoundingClientRect(),f=el.querySelector('.brand-footer').getBoundingClientRect();return {inside:h.left>=p.left&&h.right<=p.right,aboveFooter:h.bottom<f.top};});
    check('长文案未越出画面或覆盖底部 '+width,bounds.inside&&bounds.aboveFooter);check('品牌无横向溢出 '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:root+'assets/qa/v5/brand-long-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:1100});await page.locator('#tab-garden').click();await position();
  await page.waitForFunction(()=>document.querySelector('#garden-renderer-label').dataset.renderer==='webgl');await page.waitForTimeout(750);
  check('庭院实际使用WebGL并保留面积数据',(await facts()).观察状态.renderer==='webgl'&&(await facts()).面积计算_m2.total===96);
  check('减少动态偏好默认暂停水面',!await page.locator('#garden-motion').isChecked());
  const still=await image();await page.waitForTimeout(300);check('暂停后实际Canvas画面保持静止',still===await image());
  await change(()=>page.locator('[data-garden-time=night]').click(),'夜色实际改变庭院灯光像素');
  await change(()=>page.locator('#garden-motion').check(),'主动启用水面后实际画面变化');const moving=await image();await page.waitForTimeout(240);check('水面持续产生实时变化',moving!==await image());await page.locator('#garden-motion').uncheck();
  await change(()=>page.locator('[data-garden-view=plan]').click(),'总览平面使用不同的真实投影');check('平面视角记录在结果中',(await facts()).观察状态.view==='plan');
  await change(()=>page.locator('#garden-view-reset').click(),'复位恢复三维观察');
  await change(async()=>{await page.locator('#garden-canvas').focus();await page.keyboard.press('ArrowRight');},'键盘旋转确实改变三维庭院');
  await change(async()=>{const b=await page.locator('#garden-canvas').boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.6);await page.mouse.down();await page.mouse.move(b.x+b.width*.65,b.y+b.height*.57,{steps:8});await page.mouse.up();},'拖动确实改变三维庭院');
  await page.waitForTimeout(280);const zoom=(await facts()).观察状态.zoom;await change(async()=>{await page.locator('#garden-canvas').hover();await page.mouse.wheel(0,-100);},'滚轮实际缩放庭院');await page.waitForTimeout(280);check('缩放状态随实际视图记录',(await facts()).观察状态.zoom>zoom);
  await page.locator('#garden-view-reset').click();await page.locator('[data-garden-time=day]').click();await page.locator('#garden-save').click();await page.waitForTimeout(150);const saved=await image();
  await change(()=>slider('#garden-width',16),'尺度变更实际重建空间');await slider('#garden-pond',26);await page.locator('#garden-priority').selectOption('gather');await page.waitForTimeout(100);
  const current=await image();await page.locator('#garden-compare').click();await page.waitForTimeout(150);const compared=await image();
  if(saved!==compared){await writeFile(root+'assets/qa/v5/compare-saved.png',Buffer.from(saved.split(',')[1],'base64'));await writeFile(root+'assets/qa/v5/compare-restored.png',Buffer.from(compared.split(',')[1],'base64'));const a=await sharp(Buffer.from(saved.split(',')[1],'base64')).raw().toBuffer(),b=await sharp(Buffer.from(compared.split(',')[1],'base64')).raw().toBuffer();let diff=0,count=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);diff+=d;count+=Number(d>0);max=Math.max(max,d);}console.log('Compare diagnostics',JSON.stringify({facts:await facts(),pixels:{meanAbsolute:diff/a.length,changedChannels:count,max}}));}
  check('方案A还原实际空间和面积',saved===compared&&(await facts()).面积计算_m2.total===96&&(await facts()).当前查看==='已保存的方案 A');
  check('比较未覆盖当前输入',await page.locator('#garden-width').inputValue()==='16');const exported=JSON.parse((await download('#facts-download','garden-A.json')).toString('utf8'));check('比较导出记录的是查看中的方案A',exported.当前参数.width===12&&exported.观察状态.renderer==='webgl');
  const png=await download('#image-download','garden-A.png'),metadata=await sharp(png).metadata(),stats=await sharp(png).stats();check('方案A导出包含真实三维像素',metadata.width>500&&stats.channels.some(c=>c.stdev>15));
  await page.locator('#garden-compare').click();await page.waitForTimeout(150);check('返回后保留最新真实画面与参数',current===await image()&&(await facts()).当前参数.width===16);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1100});await page.locator('[data-garden-view=plan]').click();await position();
    const bounds=await page.locator('#garden-preview').evaluate(el=>{const stage=el.querySelector('.garden-stage').getBoundingClientRect(),title=el.querySelector('.garden-editorial h3').getBoundingClientRect(),dock=el.querySelector('.garden-view-toolbar').getBoundingClientRect();return {titleInside:title.right<=stage.right&&title.left>=stage.left,dockInside:dock.bottom<=stage.bottom&&dock.left>=stage.left&&dock.right<=stage.right};});
    check('庭院平面标题和工具栏位于画面内 '+width,bounds.titleInside&&bounds.dockInside);check('庭院无横向溢出 '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:root+'assets/qa/v5/garden-plan-'+width+'.png'});
  }
  await page.locator('#garden-view-reset').click();for(const [w,d] of [[8,6],[18,14]]){await slider('#garden-width',w);await slider('#garden-depth',d);await page.waitForTimeout(200);const f=await facts(),a=f.面积计算_m2;check('极端尺度面积完整 '+w+'x'+d,Math.abs(a.pond+a.green+a.deck+a.other-w*d)<.001);await page.screenshot({path:root+'assets/qa/v5/garden-size-'+w+'x'+d+'.png'});}
  const fallback=await browser.newPage({viewport:{width:390,height:1100},reducedMotion:'reduce',acceptDownloads:true});fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:get.call(this,type,...args);};});
  await fallback.goto(base+'?effect=broth&scene=garden&revision=20261002-5#scenes');await fallback.waitForFunction(()=>document.querySelector('#garden-renderer-label').dataset.renderer==='canvas');
  check('无WebGL时庭院明确标记二维兼容',await fallback.locator('#garden-renderer-label').textContent()==='二维兼容预览'&&await fallback.locator('#garden-canvas').getAttribute('aria-label')==='根据当前尺度和比例绘制的二维兼容庭院平面图');
  check('兼容模式停用不支持的三维与水面功能',await fallback.locator('[data-garden-view=perspective]').isDisabled()&&await fallback.locator('#garden-motion').isDisabled()&&!await fallback.locator('#garden-motion').isChecked());
  const beforeFallback=await fallback.locator('#garden-canvas').evaluate(c=>c.toDataURL());await fallback.locator('#garden-time').selectOption('night');check('兼容平面仍可变更参数',beforeFallback!==await fallback.locator('#garden-canvas').evaluate(c=>c.toDataURL()));
  await fallback.screenshot({path:root+'assets/qa/v5/garden-fallback-390.png'});await fallback.close();
  check('本地素材没有加载失败',failedAssets.length===0);check('没有未处理浏览器错误',errors.length===0);
}finally{await writeFile(root+'notes/business-scenes-v5-verification.json',JSON.stringify({date:'2026-10-02',revision:'20261002-5',checks,errors,failedAssets,scope:'Actual pixels, observations, areas, exports and desktop/tablet/phone layout. No claim of subjective parity with source, physical calibration or mobile hardware performance.'},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.length,errors,failedAssets}));
