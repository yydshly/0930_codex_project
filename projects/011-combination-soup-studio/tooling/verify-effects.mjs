import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base=process.env.CAPABILITY_PREVIEW_URL||'http://127.0.0.1:8951/projects/011-combination-soup-studio/';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1040}});
const checks=[],errors=[],requests=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));page.on('requestfailed',r=>failed.push({url:r.url(),reason:r.failure()?.errorText}));
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
const state=()=>page.locator('#effect-state').innerText();
const pick=key=>page.locator('button[data-effect="'+key+'"]').click();
try{
  await mkdir(root+'assets',{recursive:true});
  await page.goto(base);
  await page.waitForSelector('.soup-film');
  await page.waitForFunction(()=>{const v=document.querySelector('.soup-film');return v.readyState>=2;},null,{timeout:30000});
  const t1=await page.locator('video').evaluate(v=>v.currentTime);await page.waitForTimeout(1300);
  check('原站汤碗视频实际解码并推进',await page.locator('video').evaluate(v=>v.videoWidth>0&&v.currentTime)>t1);
  const playing=await page.locator('video').evaluate(v=>!v.paused);check('视频默认无声播放',playing&&await page.locator('video').evaluate(v=>v.muted));
  await page.screenshot({path:root+'assets/original-effects-overview.png'});
  await page.locator('[data-play]').click();check('用户可暂停原站视频',await page.locator('video').evaluate(v=>v.paused));
  await pick('menu');check('模块切换卸载上一项视频',await page.locator('video').count()===0);
  await page.locator('[data-menu="2"]').click();await page.waitForFunction(()=>document.querySelector('#effect-state').textContent.includes('-240°'));
  check('旋转套餐同步标题与当前项',(await page.locator('[data-menu-name]').textContent()).includes('Laksa')&&(await state()).includes('-240°'));
  await page.locator('.menu-scroll').evaluate(el=>{el.scrollTop=0;});await page.waitForFunction(()=>document.querySelector('[data-menu="0"]').getAttribute('aria-pressed')==='true');
  check('实际滚动驱动套餐旋转',(await state()).includes('0°'));
  await page.locator('#effect-stage').screenshot({path:root+'assets/effect-menu.png'});
  await pick('broth');await page.waitForTimeout(600);const canvas=page.locator('.broth-canvas-native'),box=await canvas.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height*.46,r=Math.min(box.width,box.height)*.34;
  const before=await canvas.evaluate(c=>c.toDataURL());await page.mouse.move(cx+r,cy);await page.mouse.down();
  for(let n=0;n<=108;n++){const a=n/36*Math.PI*2;await page.mouse.move(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  await page.mouse.up();check('绕圈拖动累加实际搅动圈数',+(await page.locator('[data-laps]').textContent())>2.5);
  check('搅汤和倾斜改变实际 Canvas 画面',before!==await canvas.evaluate(c=>c.toDataURL()));
  await page.locator('[data-stir]').click();check('按钮可以替代拖动搅汤',+(await page.locator('[data-laps]').textContent())>3.5);
  const fillBefore=+(await page.locator('[data-fill]').textContent());
  await page.locator('[data-tilt]').evaluate(el=>{el.value=85;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('[data-spill]').classList.contains('on'));
  await page.waitForTimeout(1200);
  check('倾斜使汤量下降并触发真实溢出状态',+(await page.locator('[data-fill]').textContent())<fillBefore&&await page.locator('[data-spill]').evaluate(el=>el.classList.contains('on')));
  await page.locator('#effect-stage').screenshot({path:root+'assets/effect-broth.png'});
  await pick('delivery');await page.locator('[data-auto]').uncheck();const sent=+(await page.locator('[data-sent]').textContent());await page.locator('[data-city="Sydney"]').click();
  check('城市操作启动投送动画',+(await page.locator('[data-sent]').textContent())===sent+1);
  await page.waitForFunction(()=>document.querySelector('[data-arrival]').textContent==='Sydney',null,{timeout:8000});check('投送完成后同步真实落点',await page.locator('[data-arrival]').textContent()==='Sydney');
  const mapbox=await page.locator('.delivery-canvas-native').boundingBox();await page.mouse.click(mapbox.x+mapbox.width*.28,mapbox.y+mapbox.height*.6);check('点击地图也能选择落点投送',+(await page.locator('[data-sent]').textContent())===sent+2);
  await page.locator('#effect-stage').screenshot({path:root+'assets/effect-map.png'});
  await pick('fortune');await page.locator('[data-cookie-reset]').click();await page.locator('.fortune-cookie').click();await page.waitForTimeout(1700);
  const tip1=await page.locator('[data-fortune]').textContent();check('饼干开裂并展开真实提示',tip1.length>10&&(await page.locator('.fortune-cookie').getAttribute('class')).includes('cracked')&&await page.locator('[data-count]').textContent()==='1');
  await page.locator('.fortune-cookie').click();await page.waitForTimeout(1800);check('洗牌后的提示不立即重复',tip1!==await page.locator('[data-fortune]').textContent());
  await page.locator('#effect-stage').screenshot({path:root+'assets/effect-cookie.png'});
  await page.reload();await pick('fortune');check('本机记录可跨刷新保留',await page.locator('[data-count]').textContent()==='2');
  await page.locator('.fortune-cookie').click();await page.waitForTimeout(650);await page.locator('.fortune-cookie').click();await page.locator('[data-cookie-reset]').click();await page.waitForTimeout(450);check('重置会取消待揭晓动作并清除本机记录',await page.locator('[data-count]').textContent()==='0'&&!(await page.locator('.fortune-cookie').getAttribute('class')).includes('cracked'));
  await page.locator('#effect-tab-fortune').focus();await page.keyboard.press('ArrowLeft');check('效果页签支持键盘操作',await page.locator('#effect-tab-delivery').getAttribute('aria-selected')==='true');
  if(!await page.locator('#effect-application').isVisible())await page.locator('#effect-view-toggle').click();
  await page.locator('#effect-application').click();check('地图模块可进入区域服务技能',await page.locator('#skill-tab-territory').getAttribute('aria-selected')==='true'&&await page.locator('#skills').isVisible());
  await page.goto(base+'?effect=broth');check('每个模块有可直接访问的入口',await page.locator('#effect-tab-broth').getAttribute('aria-selected')==='true');
  for(const width of [390,768,1280]){
    await page.setViewportSize({width,height:900});
    for(const key of ['hero','menu','broth','delivery','fortune']){
      await pick(key);check(width+'px / '+key+' 没有横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    if(width===390){await page.locator('.fortune-cookie').click();await page.waitForTimeout(1400);await page.screenshot({path:root+'assets/effects-mobile.png'});}
  }
  const rp=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await rp.goto(base+'?effect=broth');await rp.evaluate(()=>document.fonts.ready);await rp.waitForTimeout(250);const staticBefore=await rp.locator('.broth-canvas-native').evaluate(c=>c.toDataURL());await rp.waitForTimeout(400);check('减少动态偏好时汤碗不会持续动画',staticBefore===await rp.locator('.broth-canvas-native').evaluate(c=>c.toDataURL()));await rp.locator('[data-stir]').click();check('减少动态偏好仍可操作搅汤',await rp.locator('[data-laps]').textContent()==='1.0');await rp.locator('button[data-effect="delivery"]').click();await rp.locator('[data-city="Hobart"]').click();check('减少动态偏好即时显示投送结果',await rp.locator('[data-arrival]').textContent()==='Hobart');await rp.close();
  check('浏览器没有未处理运行错误',errors.length===0);
  const external=requests.filter(r=>!r.url.startsWith(new URL(base).origin)&&!r.url.startsWith('data:')&&!r.url.startsWith('blob:'));
  check('仅加载明确标示的原站视频',external.every(r=>r.url==='https://combinationsoupstudio.com.au/assets/previews/soup-v-soup-s.mp4'&&r.method==='GET'));
  check('未提交原站咨询、留言或统计',requests.every(r=>r.method!=='POST'&&!/__stats|__gb|__e(?:$|\?)|\/api\/enquiry/.test(r.url)));
  const report={date:'2026-10-02',url:base,checks,errors,externalRequests:external,failedRequests:failed,scope:'五个拆分模块的浏览器功能与布局；视频直连原站，四项采用选定原站素材与组件的本地适配。视觉对照另见 design-qa.md。未验收真实手机陀螺仪、订单、原站后端或业务转化。'};
  await writeFile(root+'notes/effects-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors,externalRequests:external.length,failed}));
}finally{await browser.close();}
