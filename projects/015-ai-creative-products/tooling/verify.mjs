import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.CREATIVE_PREVIEW_URL || 'http://127.0.0.1:8975/';
await mkdir(root+'assets/qa', {recursive:true});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true,reducedMotion:'reduce'});
const checks=[],errors=[],requests=[];
page.on('pageerror', e=>errors.push(e.message));
page.on('request', r=>requests.push(r.url()));
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
try {
  await page.goto(base+'#cases', {waitUntil:'networkidle'});
  check('完整展示十个来源案例',await page.locator('.case-card').count()===10);
  check('初次打开没有请求第三方媒体',requests.every(url=>url.startsWith(base)));
  check('十张原作封面已加载',await page.locator('.case-card img').evaluateAll(images=>images.length===10&&images.every(image=>image.complete&&image.naturalWidth>0)));
  check('来源与研究编号对应',await page.evaluate(()=>SOURCE_DATA.cases.every(source=>RESEARCH_DATA.cases.some(research=>research.id===source.id))));
  check('八个产品和三项优先验证',await page.evaluate(()=>RESEARCH_DATA.products.length===8&&RESEARCH_DATA.products.filter(p=>p.priority==='优先验证').length===3));
  check('案例关联产品均存在',await page.evaluate(()=>RESEARCH_DATA.cases.every(c=>c.productIds.every(id=>RESEARCH_DATA.products.some(p=>p.id===id)))));
  await page.screenshot({path:root+'assets/qa/cases-desktop.png',fullPage:false});
  await page.locator('[data-case-filter="音乐"]').click();
  check('音乐筛选只保留第六例',await page.locator('.case-card').count()===1&&await page.locator('.case-card').getAttribute('data-case-id')==='6');
  await page.locator('[data-case-id="6"]').click();
  await page.locator('[data-detail-tab="thinking"]').click();
  check('案例六流程明确披露和推演边界',(await page.locator('#detail-panel').innerText()).includes('Python')&&(await page.locator('#detail-panel').innerText()).includes('Blender')&&(await page.locator('#detail-panel').innerText()).includes('推演'));
  await page.locator('[data-detail-tab="thinking"]').focus();
  await page.keyboard.press('ArrowRight');
  check('阅读角度支持键盘切换',await page.locator('[data-detail-tab="extension"]').getAttribute('aria-selected')==='true');
  await page.locator('#detail-panel [data-product-link="music-visual"]').click();
  await page.waitForFunction(()=>!document.querySelector('#view-products').hidden);
  check('从案例可进入关联产品',(await page.locator('#product-detail .product-detail-header h3').innerText()).includes('音乐'));
  check('产品计划有输入输出最小版本与验证',await page.locator('#product-detail').innerText().then(text=>['用户提供什么','用户得到什么','第一版只做这些','怎样判断值得继续'].every(phrase=>text.includes(phrase))));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-product').click()]);
  const downloadPath=root+'notes/export-verification.md';await download.saveAs(downloadPath);
  const brief=await readFile(downloadPath,'utf8');
  check('导出计划包含当前产品与真实来源',brief.includes('音乐')&&brief.includes('最小版本')&&brief.includes('https://x.com/kevin_t_ngo/status/2105304249060274631'));
  await page.locator('[data-product-filter="优先验证"]').click();
  check('优先验证筛选为三个产品',await page.locator('.product-card').count()===3);
  await page.locator('#product-detail [data-case-link="6"]').click();
  await page.waitForFunction(()=>!document.querySelector('#view-cases').hidden);
  check('产品可返回关联案例',await page.locator('[data-case-id="6"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-case-filter="全部"]').click();
  await page.locator('#case-search').fill('不存在的案例xyz');
  check('无匹配时给出明确状态',await page.locator('.case-card').count()===0&&await page.locator('#case-empty').isVisible());
  await page.locator('#case-search').fill('');
  await page.locator('[data-case-id="9"]').click();
  check('第九例保留多工具事实',await page.locator('#detail-panel').innerText().then(text=>text.includes('Sonnet')&&text.includes('Meshy')&&text.includes('Three.js')));
  await page.locator('[data-view="capabilities"]').click();
  await page.waitForFunction(()=>!document.querySelector('#view-capabilities').hidden);
  check('能力图和证据表展示十个案例',await page.locator('#evidence-rows tr').count()===10&&await page.locator('.capability-lane').count()===4);
  await page.screenshot({path:root+'assets/qa/capabilities-desktop.png',fullPage:true});
  await page.locator('[data-view="products"]').click();
  await page.waitForFunction(()=>!document.querySelector('#view-products').hidden);
  await page.locator('[data-product-filter="全部"]').click();
  await page.screenshot({path:root+'assets/qa/products-desktop.png',fullPage:true});
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1050});
    for(const view of ['cases','capabilities','products']){
      await page.locator(`[data-view="${view}"]`).click();
      await page.waitForFunction(view=>!document.querySelector(`#view-${view}`).hidden,view);
      check(`${view}在${width}px无页面横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===390)await page.screenshot({path:root+`assets/qa/${view}-mobile.png`,fullPage:true});
    }
  }
  const samplePage=await browser.newPage();
  await samplePage.goto(base+'#case-06');
  check('深链接可直接选中第六例',await samplePage.locator('[data-case-id="6"]').getAttribute('aria-pressed')==='true');
  await samplePage.locator('#play-original').click();
  let videoResult;
  try {
    await samplePage.waitForFunction(()=>document.querySelector('#case-media video')?.currentTime>0.4,{},{timeout:15000});
    videoResult=await samplePage.locator('#case-media video').evaluate(video=>({currentTime:video.currentTime,readyState:video.readyState,width:video.videoWidth,src:video.currentSrc}));
    check('第六例原作视频实际开始播放',videoResult.currentTime>0.4&&videoResult.width>0);
  } catch(error) {
    videoResult={verified:false,message:error.message,state:await samplePage.locator('#case-media').innerText()};
  }
  check('无JavaScript运行错误',errors.length===0);
  await samplePage.locator('[data-view="products"]').click();
  await samplePage.waitForFunction(()=>!document.querySelector('#view-products').hidden);
  check('离开案例视图时停止声音',await samplePage.locator('#case-media video').evaluate(video=>video.paused));
  await samplePage.close();
  await writeFile(root+'notes/verification.json',JSON.stringify({checkedAt:'2026-10-02',base,checks,errors,videoResult},null,2)+'\n');
  console.log(JSON.stringify({interfaceChecks:checks.length,videoResult}));
  const allMediaChecks=[];
  for(let id=1;process.env.CREATIVE_SKIP_MEDIA!=='1'&&id<=10;id++){
    const mediaPage=await browser.newPage();
    await mediaPage.goto(base+`#case-${String(id).padStart(2,'0')}`);
    await mediaPage.locator('#play-original').click();
    try{
      await mediaPage.waitForFunction(()=>document.querySelector('#case-media video')?.currentTime>0.15,{},{timeout:15000});
      const result=await mediaPage.locator('#case-media video').evaluate(video=>({currentTime:video.currentTime,duration:video.duration,width:video.videoWidth,readyState:video.readyState}));
      allMediaChecks.push({id,played:true,...result});
    }catch(error){allMediaChecks.push({id,played:false,state:await mediaPage.locator('#case-media').innerText()});}
    await mediaPage.close();
    console.log(JSON.stringify(allMediaChecks.at(-1)));
  }
  if(allMediaChecks.length) await writeFile(root+'notes/media-verification.json',JSON.stringify({checkedAt:'2026-10-02',results:allMediaChecks},null,2)+'\n');
  console.log(JSON.stringify({allMediaChecks}));
  await writeFile(root+'notes/verification.json',JSON.stringify({checkedAt:'2026-10-02',base,checks,errors,videoResult,allMediaChecks},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,errors,videoResult,allMediaChecks},null,2));
} finally {await browser.close();}
