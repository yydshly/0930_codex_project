const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('./browser.cjs');
const project=path.resolve(__dirname,'..'),captureOnly=process.argv.includes('--capture-cozy');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960}}),checks=[],errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8962/')&&r.status()>=400)failed.push({url:r.url(),status:r.status()})});
  await page.route('https://dumpling-dell.pages.dev/**',r=>r.fulfill({status:200,contentType:'text/html',body:'Original verified separately. Isolated local presentation QA.'}));
  function check(name,value){assert(value,name);checks.push({name,passed:true});console.log('PASS',name)}
  await page.goto('http://127.0.0.1:8962/?experience=cozy#play-lab',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.playLab?.state.id==='cozy');
  if(captureOnly){
   async function click(x,y){await page.locator('#play-canvas').scrollIntoViewIfNeeded();const r=await page.locator('#play-canvas').boundingBox();await page.mouse.click(r.x+x/960*r.width,r.y+y/560*r.height);await page.waitForFunction(()=>!playLab.state.pending&&!playLab.state.route.length,null,{timeout:45000});await page.waitForTimeout(130)}
   await click(230,270);await click(657,339);await page.locator('#play-choice-follow').click();await click(722,437);await click(230,270);
   check('送果后莓丛记得行动结果',(await page.locator('#play-dialogue').textContent()).includes('已经送给小团'));
   check('照顾和随行状态一致',await page.evaluate(()=>playLab.state.friendFed&&playLab.state.choice==='follow'&&playLab.state.flowers>0));
   await click(722,437);await page.locator('.play-stage').screenshot({path:path.join(project,'web/assets/play-cozy.png')});
  }else{
   check('原作仍首先提供在线体验',await page.locator('iframe').first().getAttribute('src')==='https://dumpling-dell.pages.dev/');
   check('新主线有三段可玩体验',await page.locator('[data-play-world]').count()===3);
   check('扩展方向回到八种游戏气质',await page.locator('#extension .extension-grid article').count()===8);
   await page.locator('.play-evidence').scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.play-evidence img')].every(i=>i.complete&&i.naturalWidth>0));
   check('三张游玩结果截图成功加载',await page.locator('.play-evidence img').count()===3);
   await page.locator('.play-evidence').screenshot({path:path.join(project,'assets/play-worlds-overview.png')});
   for(const id of ['wonder','playful','cozy']){await page.locator('[data-play-evidence='+id+']').click();await page.waitForFunction(id=>playLab.state.id===id,id);check(id+' 截图可进入对应游戏',await page.locator('[data-play-world='+id+']').getAttribute('aria-selected')==='true')}
   await page.waitForTimeout(700);await page.locator('#play-lab').screenshot({path:path.join(project,'assets/play-lab-overview.png')});
   await page.goto('http://127.0.0.1:8962/?style=comic&group=new#lab',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.playLab&&location.hash==='#play-lab');
   check('旧入口转到游戏研究主线',await page.evaluate(()=>!new URL(location.href).searchParams.has('style')&&location.hash==='#play-lab'));
   check('旧材质对照默认收起',!await page.locator('#visual-archive').evaluate(e=>e.open));
   await page.locator('#visual-archive>summary').click();await page.locator('#stage').scrollIntoViewIfNeeded();await page.waitForTimeout(450);check('附录仍可打开',await page.locator('#visual-archive').evaluate(e=>e.open));
   await page.locator('[data-style-filter=all]').click();for(const img of await page.locator('#style-gallery img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode())}check('附录二十种材质截图保留',await page.locator('#style-gallery img').count()===20);
   await page.locator('#visual-archive>summary').click();await page.setViewportSize({width:390,height:844});await page.locator('#play-lab').scrollIntoViewIfNeeded();
   check('完整手机页面无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check('页面本地资源无错误响应',failed.length===0);
  }
  check('没有脚本运行错误',errors.length===0);
  fs.writeFileSync(path.join(project,'notes',captureOnly?'play-render-check.json':'play-presentation-check.json'),JSON.stringify({date:'2026-10-02',scope:'Local technical and presentation checks only; no human emotion or retention conclusion. Remote original isolated only during QA.',checks,errors,failedResources:failed},null,2)+'\n');
  console.log('COMPLETE',checks.length,captureOnly?'render checks':'presentation checks');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
