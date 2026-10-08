const fs=require('fs/promises'),path=require('path'),assert=require('assert');
const {chromium}=require('./browser.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/showcase');
const ids=['afterdark','hunter','station','ledger','order','wonder','range','expedition','builder','garden','factory','checkpoint'];
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl']});
 const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[],missing=[],records=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))missing.push({url:r.url(),status:r.status()})});
 for(const id of ids){
  await page.goto('http://127.0.0.1:8962/showcase.html?qa=1&play='+id+'#play');
  await page.waitForFunction(()=>window.gameShowcase?.ready||window.gameShowcase?.error,{timeout:30000});
  const status=await page.evaluate(()=>({id:gameShowcase.current,ready:gameShowcase.ready,error:gameShowcase.error,total:gameShowcase.total}));
  if(status.error){records.push(status);continue}
  await page.locator('#play-start').click();
  if(id==='hunter')await page.getByRole('button',{name:'进入熔炉',exact:true}).click();
  await page.waitForTimeout(450);
  await page.locator('#player-frame').screenshot({path:path.join(out,id+'.png')});
  const measure=await page.evaluate(()=>({id:gameShowcase.current,state:gameShowcase.state,status:gameShowcase.status,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,started:gameShowcase.started,buttons:Array.from(document.querySelectorAll('#play button:not([hidden])')).filter(b=>b.getBoundingClientRect().width).map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}));
  records.push(measure);console.log(id,JSON.stringify({error:status.error,started:measure.started,overflow:measure.pageWidth>measure.viewport}));
 }
 await page.goto('http://127.0.0.1:8962/showcase.html?qa=1');await page.waitForFunction(()=>window.gameShowcase?.ready);await page.screenshot({path:path.join(out,'hall.png'),fullPage:true});
 const report={checkedAt:new Date().toISOString(),environment:'isolated headless Chromium, same local server; normal user saves untouched',records,errors,missing};await fs.writeFile(path.join(root,'notes/showcase-smoke-check.json'),JSON.stringify(report,null,2));
 await browser.close();assert(!errors.length,errors.join('\n'));assert(!missing.length,JSON.stringify(missing));assert(records.length===12&&!records.some(r=>r.error),'All twelve worlds must open');console.log('12 / 12 worlds opened without missing assets or JavaScript errors');
})().catch(e=>{console.error(e);process.exitCode=1});
