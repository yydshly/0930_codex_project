const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('./browser.cjs');
const project=path.resolve(__dirname,'..'),base=process.env.DUMPLING_PREVIEW_URL||'http://127.0.0.1:8962/';
const verifyImages=!process.argv.includes('--skip-images');
const checks=[],errors=[],localResponses=[],deferredImages=[],screenshots=[];
function check(name,value,detail){assert(value,name+(detail?' — '+detail:''));checks.push({name,passed:true,...(detail?{detail}:{})});console.log('PASS',name)}
function writeResult(failure){fs.writeFileSync(path.join(project,'notes/extension-presentation-check.json'),JSON.stringify({date:'2026-10-02',base,imagesValidated:verifyImages,qaNote:'Only the remote original iframe is isolated. Local resources keep their real responses; missing extension WebP images are recorded as deferred in --skip-images mode. Parent and child selection, visibility, resizing and responsive layout use the real pages. These engineering checks do not establish player emotion or willingness to continue.',checks,screenshots,errors,localResponses,deferredImages,...(failure?{failure:String(failure)}:{})},null,2)+'\n')}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{const url=response.url();if(url.startsWith(base)&&response.status()>=400){const item={url,status:response.status()};if(!verifyImages&&/\/assets\/extension-(inn|islands|movers)\.webp(?:$|\?)/.test(url)){if(!deferredImages.some(x=>x.url===url))deferredImages.push(item)}else if(!localResponses.some(x=>x.url===url&&x.status===item.status))localResponses.push(item)}});
  await page.route('https://dumpling-dell.pages.dev/**',r=>r.fulfill({status:200,contentType:'text/html',body:'Remote original verified separately; local preview integration QA.'}));
  await page.goto(new URL('?prototype=movers',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#extension-frame')?.contentWindow?.extensionLab?.current==='movers',null,{timeout:30000});
  const frame=await (await page.locator('#extension-frame').elementHandle()).contentFrame();assert(frame,'Embedded game frame');
  const readTime=()=>frame.evaluate(()=>window.extensionLab.state.time);
  check('主导航入口指向新游戏段',await page.locator('nav a[href="#prototypes"]').count()===1);
  check('旧三段默认折叠',!await page.locator('#play-archive').evaluate(e=>e.open));
  check('旧二十种默认折叠',!await page.locator('#visual-archive').evaluate(e=>e.open));
  check('父URL初始指定搬家方向',await frame.evaluate(()=>extensionLab.current==='movers'&&!extensionLab.error));
  check('初始iframe位于视口外',await page.locator('#extension-frame').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=innerHeight||r.bottom<=0}));
  await page.waitForTimeout(400);const stopped=await readTime();await page.waitForTimeout(650);
  check('父页初始离屏时子游戏时钟停止',Math.abs((await readTime())-stopped)<.001,'movers.time remains unchanged after initial message settling');
  async function synced(id){await page.waitForFunction(id=>{const f=document.querySelector('#extension-frame');return f.contentWindow.extensionLab?.current===id&&new URL(location.href).searchParams.get('prototype')===id&&new URL(document.querySelector('.prototype-launch').href).searchParams.get('game')===id},id,{timeout:20000});check('方向 '+id+' 同步子页、父URL和完整页面CTA',true)}
  await synced('movers');
  await page.locator('nav a[href="#prototypes"]').click();await page.waitForFunction(()=>location.hash==='#prototypes');
  await page.locator('#extension-frame').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-92,behavior:'instant'}));
  await frame.waitForFunction(t=>extensionLab.state.time>t+.15,stopped,{timeout:20000});
  check('滚入视口后子游戏时钟恢复',true);
  await page.waitForFunction(()=>parseFloat(document.querySelector('#extension-frame').style.height)>0);
  async function resized(label){await page.waitForTimeout(250);const info=await page.evaluate(()=>{const f=document.querySelector('#extension-frame'),expected=Math.max(450,Math.min(1900,Math.ceil(f.contentWindow.document.querySelector('.game-shell').getBoundingClientRect().height+32)));return {actual:parseFloat(f.style.height),expected}});check(label,Math.abs(info.actual-info.expected)<=2,JSON.stringify(info))}
  await resized('桌面iframe高度随子页内容调整');
  await frame.locator('[data-game-tab=islands]').click();await synced('islands');
  check('子页切换浮岛真实渲染器可用',await frame.evaluate(()=>!extensionLab.error&&!!document.querySelector('[data-world=islands] canvas')));
  await frame.locator('[data-game-tab=inn]').click();await synced('inn');
  for(const id of ['movers','inn','islands']){await page.locator('[data-extension='+id+']').click();await synced(id)}
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#extension-frame')?.contentWindow?.extensionLab?.current==='islands',null,{timeout:30000});
  check('刷新保留父页选中的浮岛方向',new URL(page.url()).searchParams.get('prototype')==='islands');
  await synced('islands');
  const reloadedFrame=await (await page.locator('#extension-frame').elementHandle()).contentFrame();
  // Observe stop/start again after the initial document load, using a game with a saved clock.
  await reloadedFrame.locator('[data-game-tab=movers]').click();await synced('movers');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(350);
  const awayTime=await reloadedFrame.evaluate(()=>extensionLab.state.time);await page.waitForTimeout(600);
  check('滚离视口后子游戏再次停止',Math.abs((await reloadedFrame.evaluate(()=>extensionLab.state.time))-awayTime)<.001);
  await page.locator('#extension-frame').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-92,behavior:'instant'}));
  await reloadedFrame.waitForFunction(t=>extensionLab.state.time>t+.1,awayTime,{timeout:20000});check('再次滚入视口能继续运行',true);
  await page.setViewportSize({width:390,height:844});await page.locator('#extension-frame').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-120,behavior:'instant'}));await resized('手机iframe高度随子页内容调整');
  check('手机父研究页没有横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('手机子游戏没有横向溢出',await reloadedFrame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('手机子游戏提供触屏控制',await reloadedFrame.locator('.touch-controls').isVisible());
  await page.setViewportSize({width:1440,height:1050});await page.locator('[data-extension=islands]').click();await synced('islands');await resized('返回桌面后iframe重新调整高度');
  if(verifyImages){for(const id of ['inn','islands','movers']){const img=page.locator('[data-extension='+id+'] img');await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());check(id+' 场景WebP真实加载',await img.evaluate(e=>e.complete&&e.naturalWidth>100))}}else console.log('DEFERRED extension WebP checks; no local image responses are mocked');
  await page.locator('#prototypes').scrollIntoViewIfNeeded();const clean=await page.addStyleTag({content:'.site-head,.skip{visibility:hidden!important}'});await page.locator('#prototypes').screenshot({path:path.join(project,'assets/extension-worlds-overview.png')});await clean.evaluate(e=>e.remove());screenshots.push('assets/extension-worlds-overview.png');
  await page.goto(new URL('?experience=wonder#play-lab',base).href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.playLab?.state?.id==='wonder');
  check('旧#play-lab直达链接自动展开旧三段',await page.locator('#play-archive').evaluate(e=>e.open));
  check('旧直达链接仍选择神秘探索',await page.evaluate(()=>playLab.state.id==='wonder'));
  check('旧二十种在旧三段直达时仍折叠',!await page.locator('#visual-archive').evaluate(e=>e.open));
  check('本地资源无未豁免HTTP错误',localResponses.length===0,JSON.stringify(localResponses));
  check('父子页无JavaScript运行错误',errors.length===0,JSON.stringify(errors));
  writeResult();console.log('COMPLETE',checks.length,'extension presentation checks',verifyImages?'with scene images':'without scene-image validation');
 }catch(e){writeResult(e.stack||e);throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
