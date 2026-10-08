import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const base='http://127.0.0.1:8951/projects/011-combination-soup-studio/';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1040}});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
function check(name,ok){assert.ok(ok,name);checks.push({name,passed:true});}
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
try{
 await page.goto(base+'?effect=broth#original-effects');await page.evaluate(()=>document.fonts.ready);
 check('搅汤默认放大展示且显示真实自动体验状态',await page.locator('.effect-focus').count()===1&&await page.locator('[data-demo]').getAttribute('aria-pressed')==='true');
 const startFill=+(await page.locator('[data-fill]').textContent());
 await page.waitForFunction(fill=>document.querySelector('[data-spill]').classList.contains('on')&&+document.querySelector('[data-fill]').textContent<fill,startFill,{timeout:6000});
 check('自动体验真的驱动汤面溢出，未伪造用户圈数',+(await page.locator('[data-fill]').textContent())<startFill&&await page.locator('[data-laps]').textContent()==='0.0');
 await page.locator('[data-stir]').click();
 check('用户操作立即接管自动体验',await page.locator('[data-demo]').getAttribute('aria-pressed')==='false'&&await page.locator('[data-laps]').textContent()==='1.0');
 for(let i=0;i<7;i++)await page.locator('[data-stir]').click();
 check('搅满8圈给出进度与可见奖励',await page.locator('.native-broth.done').count()===1&&await page.locator('[data-laps-progress]').getAttribute('value')==='8');
 await page.locator('[data-effects-motion]').click();await page.waitForTimeout(300);
 const stopped=await page.locator('.broth-canvas-native').evaluate(c=>c.toDataURL());await page.waitForTimeout(450);
 check('可主动暂停实际Canvas动画',stopped===await page.locator('.broth-canvas-native').evaluate(c=>c.toDataURL()));
 await page.locator('[data-effects-motion]').click();const resumed=await page.locator('.broth-canvas-native').evaluate(c=>c.toDataURL());await page.waitForTimeout(450);
 check('开启动态后Canvas重新实时变化',resumed!==await page.locator('.broth-canvas-native').evaluate(c=>c.toDataURL()));
 await page.locator('button[data-effect="delivery"]').click();await page.locator('[data-city="Perth"]').click();
 const sent=await page.locator('[data-sent]').textContent();
 check('手动投送立即显示正确目标且不伪造落点',await page.locator('[data-target-name]').textContent()==='Perth'&&await page.locator('[data-arrival]').textContent()==='Australia');
 await page.waitForTimeout(1600);
 check('追踪手动包裹时暂停新的自动发射',sent===await page.locator('[data-sent]').textContent()&&(await page.locator('[data-auto-label]').textContent()).includes('暂缓'));
 await page.waitForFunction(()=>document.querySelector('[data-target]').dataset.state==='landed',null,{timeout:7000});
 check('实际到达后才同步目标卡与落点',await page.locator('[data-arrival]').textContent()==='Perth');
 await page.locator('button[data-effect="fortune"]').click();await page.locator('[data-cookie-reset]').click();await page.locator('.fortune-cookie').click();await page.waitForTimeout(1800);
 check('纸条有实时开裂后展开与完整文字',await page.locator('.fortune-slip.open').count()===1&&(await page.locator('[data-fortune]').textContent()).length>10);
 await page.waitForTimeout(4000);
 check('饼干不会自动合拢打断效果观察',await page.locator('.fortune-cookie.cracked').count()===1);
 await page.locator('[data-cookie-open]').click();await page.waitForTimeout(1700);
 check('明显的再开一个按钮真实打开下一次',await page.locator('[data-count]').textContent()==='2');
 await page.locator('#effect-view-toggle').click();check('说明可按需展开',await page.locator('#effect-inspector').isVisible());
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1100});
  for(const key of ['broth','delivery','fortune']){
   await page.goto(base+'?effect='+key+'#original-effects');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
   const stage=await page.locator('#effect-stage').boundingBox();
   check(width+'px '+key+' 页面无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(key==='broth'){
    check(width+'px 配方卡与标题不互相遮挡',!overlap(await page.locator('.native-heading').boundingBox(),await page.locator('.native-broth-recipe').boundingBox()));
    check(width+'px 状态与控件不互相遮挡',!overlap(await page.locator('.native-broth-status').boundingBox(),await page.locator('.native-broth-controls').boundingBox()));
   }
   if(key==='fortune'){
    await page.locator('.fortune-cookie').click();await page.waitForTimeout(1200);
    check(width+'px 饼干纸条不挡底部控件',!overlap(await page.locator('.fortune-slip').boundingBox(),await page.locator('.native-cookie-foot').boundingBox()));
   }
   await page.locator('#effect-stage').screenshot({path:root+'assets/qa/refined-'+key+'-'+width+'.png'});
  }
 }
 const rp=await browser.newPage({viewport:{width:390,height:1100},reducedMotion:'reduce'});
 await rp.goto(base+'?effect=broth#original-effects');await rp.evaluate(()=>document.fonts.ready);await rp.waitForTimeout(300);
 const still=await rp.locator('.broth-canvas-native').evaluate(c=>c.toDataURL());await rp.waitForTimeout(350);check('系统减少动态偏好仍默认静态',still===await rp.locator('.broth-canvas-native').evaluate(c=>c.toDataURL()));
 await rp.locator('[data-effects-motion]').click();const moving=await rp.locator('.broth-canvas-native').evaluate(c=>c.toDataURL());await rp.waitForTimeout(350);check('用户可明确选择开启实时体验',moving!==await rp.locator('.broth-canvas-native').evaluate(c=>c.toDataURL()));
 await rp.locator('button[data-effect="fortune"]').click();check('明确开启后开裂过渡没有被系统CSS意外关闭',await rp.locator('.half.l').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)>0));await rp.close();
 check('新交互无未处理运行错误',errors.length===0);
 await writeFile(root+'notes/refinement-verification.json',JSON.stringify({date:'2026-10-02',checks,errors,scope:'动态真实性、用户接管、运动偏好与局部构图；不证明主观观感或硬件倾斜可靠性'},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await browser.close();}
