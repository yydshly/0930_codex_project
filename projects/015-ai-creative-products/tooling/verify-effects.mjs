import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
const checks=[],errors=[],requests=[];
let playback;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>requests.push(request.url()));
const check=(name,passed)=>{assert.ok(passed,name);checks.push({name,passed:true});};
const first=page.locator('#effect-gallery [data-effect-case="1"]');
try{
  await page.goto('http://127.0.0.1:8975/',{waitUntil:'networkidle'});
  check('首页默认显示效果展厅',await page.locator('#view-effects').isVisible()&&await page.locator('#view-cases').isHidden());
  check('十个原作均有大画面播放卡片',await page.locator('#effect-gallery .effect-gallery-card').count()===10&&await page.locator('#effect-gallery [data-effect-play]').count()===10);
  check('初次浏览只请求本地资料',requests.every(url=>url.startsWith('http://127.0.0.1:8975/')));
  check('每个效果对应原作者与来源',await page.locator('#effect-gallery .effect-gallery-card').evaluateAll(cards=>cards.every(card=>{const source=SOURCE_DATA.cases.find(item=>item.id===Number(card.dataset.effectCase));return card.querySelector('.effect-gallery-source').href===source.url&&card.innerText.includes(source.author);} )));
  await first.locator('[data-effect-analysis="1"]').click();
  check('效果能直接进入对应制作思路',await page.locator('#view-cases').isVisible()&&await page.locator('.case-card[aria-pressed="true"]').getAttribute('data-case-id')==='1'&&await page.locator('[data-detail-tab="thinking"]').getAttribute('aria-selected')==='true');
  await page.goBack();
  await page.waitForFunction(()=>!document.querySelector('#view-effects').hidden);
  check('浏览器返回恢复效果展厅',await page.locator('#view-effects').isVisible());
  await first.locator('[data-effect-play="1"]').click();
  try{
    await page.waitForFunction(()=>document.querySelector('#effect-gallery [data-effect-case="1"] video')?.currentTime>.2,{},{timeout:30000});
    playback=await first.locator('video').evaluate(video=>({played:true,currentTime:video.currentTime,width:video.videoWidth,src:video.currentSrc}));
  }catch(error){playback={played:false,reason:error.message,state:await first.getAttribute('data-media-state')};}
  console.log(JSON.stringify({livePlayback:playback}));
  const firstPlayer=await first.locator('video').elementHandle();
  const pending=[];
  await page.route('https://video.twimg.com/**',route=>pending.push(route));
  const second=page.locator('#effect-gallery [data-effect-case="2"]');
  const request=page.waitForRequest(request=>request.url().includes('video.twimg.com'));
  await second.locator('[data-effect-play="2"]').click();
  await request;
  check('打开另一条效果时暂停原视频',await firstPlayer.evaluate(video=>video.paused));
  check('加载中有可见反馈',['loading','buffering'].includes(await second.getAttribute('data-media-state')));
  for(const route of pending.splice(0))await route.abort();
  await page.waitForFunction(()=>document.querySelector('#effect-gallery [data-effect-case="2"]').dataset.mediaState==='error');
  check('模拟失败显示重试和原帖',await second.locator('[data-effect-retry="2"]').isVisible()&&await second.locator('.effect-gallery-source').getAttribute('href')==='https://x.com/chrisfirst/status/2104644598626934858');
  const oldSecond=await second.locator('video').elementHandle();
  const retryRequest=page.waitForRequest(request=>request.url().includes('video.twimg.com'));
  await second.locator('[data-effect-retry="2"]').click();
  await retryRequest;
  check('重试清理旧播放器并发起新加载',await oldSecond.evaluate(video=>!video.isConnected&&!video.getAttribute('src'))&&await second.locator('video').count()===1);
  for(const route of pending.splice(0))await route.abort();
  await page.unroute('https://video.twimg.com/**');
  await page.locator('[data-view="products"]').click();
  check('离开效果展厅时所有播放暂停',await page.locator('video').evaluateAll(videos=>videos.every(video=>video.paused)));
  check('对比卡直接展示三个代表效果',await page.locator('.decision-effect-preview .effect-gallery-card').count()===3&&await page.locator('.decision-effect-preview').evaluateAll(containers=>containers.map(container=>container.dataset.effectCase).join(',')==='1,4,6'));
  await page.locator('.decision-card [data-product-link="music-visual"]').click();
  check('产品计划内展示其关联原作',await page.locator('#product-effect-gallery .effect-gallery-card').count()===1&&await page.locator('#product-effect-gallery .effect-gallery-card').getAttribute('data-effect-case')==='6');
  await page.locator('#product-effect-gallery [data-effect-analysis="6"]').click();
  check('产品内原作能进入正确案例制作思路',await page.locator('#view-cases').isVisible()&&await page.locator('.case-card[aria-pressed="true"]').getAttribute('data-case-id')==='6'&&await page.locator('[data-detail-tab="thinking"]').getAttribute('aria-selected')==='true');
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1050});
    for(const view of ['effects','products']){
      await page.locator(`[data-view="${view}"]`).click();
      check(`${view}在${width}px无页面横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===390)await page.screenshot({path:root+`assets/qa/${view}-effects-mobile.png`,fullPage:true});
    }
  }
  await page.goto('http://127.0.0.1:8975/#effects',{waitUntil:'networkidle'});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#effect-gallery').scrollIntoViewIfNeeded();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:root+'assets/overview.png'});
  await page.screenshot({path:root+'assets/qa/effects-desktop.png',fullPage:true});
  await page.locator('[data-view="products"]').click();
  await page.locator('#product-decision-board').scrollIntoViewIfNeeded();
  await page.screenshot({path:root+'assets/qa/product-effects-desktop.png'});
  check('无JavaScript运行错误',errors.length===0);
  await writeFile(root+'notes/effects-verification.json',JSON.stringify({checkedAt:'2026-10-02',checks,errors,playback,scope:'One live source playback sample; error and retry checks intentionally abort a second source request. Prior ten-source startup evidence is preserved separately.'},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,errors,playback}));
}finally{await browser.close();}
