import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.CAPABILITY_PREVIEW_URL||'http://127.0.0.1:8951/projects/011-combination-soup-studio/';
await mkdir(root+'notes/product-downloads',{recursive:true});await mkdir(root+'assets/qa',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(name,result)=>{assert.ok(result,name);checks.push({name,passed:true});};
const facts=async()=>JSON.parse(await page.locator('#facts-preview').textContent());
const image=()=>page.locator('#product-canvas').evaluate(c=>c.toDataURL());
async function change(action,name){const before=await image();await action();await page.waitForFunction(before=>document.querySelector('#product-canvas').toDataURL()!==before,before);check(name,await image()!==before);}
async function slider(id,value){await page.locator(id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function download(id,name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(id).click()]);await d.saveAs(root+'notes/product-downloads/'+name);return readFile(root+'notes/product-downloads/'+name);}
try{
  await page.goto(base+'?effect=broth&scene=product&revision=20261002-7#product-preview');
  await page.waitForFunction(()=>document.querySelector('#product-renderer-label').dataset.renderer==='webgl');
  check('直接入口显示产品场景和真实WebGL',await page.locator('#tab-product').getAttribute('aria-selected')==='true'&&await page.locator('#product-model-loading').isHidden());
  const studio=await image();
  await change(()=>page.locator('[data-product-room=night]').click(),'夜景确实改变像素');
  const night=await image(),studioStats=await sharp(Buffer.from(studio.split(',')[1],'base64')).stats(),nightStats=await sharp(Buffer.from(night.split(',')[1],'base64')).stats();
  check('夜景整体照度低于棚拍',nightStats.channels.slice(0,3).reduce((s,c)=>s+c.mean,0)<studioStats.channels.slice(0,3).reduce((s,c)=>s+c.mean,0)*.7);
  await change(()=>page.locator('[data-product-light="0"]').click(),'灯关闭改变实际发光');await change(()=>page.locator('[data-product-light="90"]').click(),'明亮预设改变实际发光');
  await page.locator('[data-product-room=studio]').click();
  await change(()=>page.locator('input[name=product-color][value="#bb633f"]').check(),'日落橙真实改变模型');
  await change(()=>page.locator('#product-finish').selectOption('gloss'),'哑光与亮面真实改变材质');
  await change(()=>page.locator('[data-product-view=front]').click(),'正面视角真实改变画面');
  await change(()=>page.locator('[data-product-view=detail]').click(),'细节视角真实改变画面');
  await change(()=>page.locator('[data-product-view=structure]').click(),'结构解析真实展开零件');
  check('结构视角同步参数并停止自动旋转',(await facts()).当前参数.explode===78&&!await page.locator('#product-spin').isChecked());
  for(const [part,title] of [['shade','圆润灯罩'],['diffuser','光源与扩散板'],['stem','金属支柱'],['base','稳固底座']]){
    await page.locator('[data-product-view=structure]').click();
    const spot=page.locator('[data-product-part='+part+']');await spot.click();
    check('零件聚焦与说明 '+part,await page.locator('#product-part-title').textContent()===title&&(await facts()).观察状态.part===part);
    const canvas=await page.locator('#product-canvas').boundingBox(),panel=await page.locator('#product-part-panel').boundingBox();check('零件说明不遮模型 '+part,panel.y>=canvas.y+canvas.height-1);
    await page.locator('#product-part-close').click();
  }
  await page.locator('[data-product-view=hero]').click();
  await change(async()=>{await page.locator('#product-canvas').focus();await page.keyboard.press('ArrowRight');},'键盘旋转真实改变画面');
  await change(async()=>{const b=await page.locator('#product-canvas').boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.6);await page.mouse.down();await page.mouse.move(b.x+b.width*.65,b.y+b.height*.53,{steps:8});await page.mouse.up();},'拖动实际改变横向与俯仰视角');
  const zoomBefore=(await facts()).观察状态.zoom;await change(()=>page.locator('[data-product-zoom=in]').click(),'缩放按钮实际改变画面');await page.waitForTimeout(350);
  check('最新缩放观察状态同步事实',(await facts()).观察状态.zoom>zoomBefore);
  await page.locator('#product-reset').click();const reset=await facts();check('重置恢复环境视角与全部配置',reset.当前参数.color==='#356873'&&reset.当前参数.finish==='matte'&&reset.当前参数.light===70&&reset.当前参数.explode===0&&reset.当前参数.room==='studio'&&reset.观察状态.view==='hero');
  await page.locator('[data-product-room=night]').click();await page.locator('#product-finish').selectOption('gloss');await slider('#product-explode',61);await page.waitForTimeout(250);
  const png=await download('#image-download','current-night.png'),metadata=await sharp(png).metadata(),stats=await sharp(png).stats();check('实际PNG保留WebGL画面',metadata.width>500&&metadata.height>400&&stats.channels.some(c=>c.stdev>10));
  await page.locator('#brief-open').click();const brief=(await download('#brief-download','current-config.md')).toString('utf8');check('需求单保留新材质环境与结构',brief.includes('展示环境：夜景')&&brief.includes('表面效果：亮面涂层')&&brief.includes('结构展开比例：61%'));await page.locator('#brief-close').click();
  await page.locator('.header a[href="#skills"]').click();await page.locator('#skill-tab-explain').click();const skill=JSON.parse((await download('#skill-download-config','product-skill.json')).toString('utf8'));check('技能计划接住真实三维配置',skill.当前业务示例结果.当前参数.room==='night'&&skill.当前业务示例结果.当前参数.explode===61&&skill.当前业务示例结果.观察状态.renderer==='webgl');
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1100});await page.locator('#product-reset').click();await page.locator('#product-preview').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-90));
    check('产品无横向溢出 '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width<1001){const c=await page.locator('#product-canvas').boundingBox(),controls=await page.locator('#scene-workspace .controls').boundingBox(),result=await page.locator('#scene-workspace .result-strip').boundingBox();check('窄屏配置紧邻舞台且先于交付说明 '+width,controls.y>=c.y+c.height-1&&controls.y<result.y);}
    for(const view of ['hero','detail','structure']){
      await page.locator('[data-product-view='+view+']').click();await page.waitForTimeout(200);await page.screenshot({path:root+'assets/qa/product-final-'+view+'-'+width+'.png'});
      if(view==='structure'){const canvas=await page.locator('#product-canvas').boundingBox();for(const part of ['shade','diffuser','stem','base']){const b=await page.locator('[data-product-part='+part+']').boundingBox();check('热点在舞台内 '+part+' '+width,b&&b.x>=canvas.x&&b.y>=canvas.y&&b.x+b.width<=canvas.x+canvas.width+1&&b.y+b.height<=canvas.y+canvas.height+1);}}
    }
  }
  const fallback=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).startsWith('webgl'))return null;return getContext.call(this,type,...args);};});
  fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.goto(base+'?effect=broth&scene=product&revision=20261002-7#product-preview');
  await fallback.waitForFunction(()=>document.querySelector('#product-renderer-label').dataset.renderer==='canvas');
  check('无WebGL设备明确显示兼容预览',(await fallback.locator('.product-help p').textContent()).includes('二维兼容预览'));
  check('兼容预览停用不支持的旋转缩放',await fallback.locator('#product-spin').isDisabled()&&!await fallback.locator('#product-spin').isChecked()&&await fallback.locator('[data-product-zoom=in]').isDisabled()&&await fallback.locator('[data-product-view=front]').isDisabled());
  const fallbackBefore=await fallback.locator('#product-canvas').evaluate(c=>c.toDataURL());await fallback.locator('input[name=product-color][value="#bb633f"]').check();
  check('兼容预览配色仍改变实际画面',fallbackBefore!==await fallback.locator('#product-canvas').evaluate(c=>c.toDataURL()));
  await fallback.locator('#product-reset').click();check('兼容重置不会错误记录自动旋转',JSON.parse(await fallback.locator('#facts-preview').textContent()).当前参数.spin===false);
  const [fd]=await Promise.all([fallback.waitForEvent('download'),fallback.locator('#image-download').click()]);await fd.saveAs(root+'notes/product-downloads/fallback.png');
  check('兼容PNG正常导出',(await sharp(await readFile(root+'notes/product-downloads/fallback.png')).metadata()).width>=350);
  await fallback.close();
  check('无未处理浏览器错误',errors.length===0);
}finally{await writeFile(root+'notes/product-showcase-verification.json',JSON.stringify({date:'2026-10-02',revision:'20261002-7',checks,errors,scope:'Actual WebGL images, controls, exports and 390/768/1440 viewport checks; functionality does not establish subjective texture quality, physical product calibration or phone hardware performance.'},null,2));await browser.close();}
console.log('Product showcase:',checks.length,'checks passed; errors:',errors.length);
