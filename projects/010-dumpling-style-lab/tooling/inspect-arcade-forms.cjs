const {chromium}=require('./browser.cjs'),fs=require('fs/promises'),path=require('path');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8962/';
(async()=>{const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl']});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[],missing=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))missing.push(r.url())});
 const results={};await fs.mkdir(path.join(root,'assets/game-forms/arcade-qa'),{recursive:true});
 for(const id of ['brawler','skyline','coast']){
  await p.goto(base+'showcase.html?play='+id+'&qa=1#play');await p.waitForFunction(()=>gameShowcase?.ready||gameShowcase?.error,{},{timeout:30000});
  if(await p.evaluate(()=>gameShowcase.error))throw Error(await p.evaluate(()=>gameShowcase.error));
  await p.locator('#play-start').click();await p.locator('canvas.play-canvas').scrollIntoViewIfNeeded();await p.locator('#play-mount').focus();
  if(id==='brawler')await p.keyboard.down('d');if(id==='coast')await p.keyboard.down('w');await p.waitForTimeout(2000);await p.keyboard.up('d');await p.keyboard.up('w');
  await p.locator('#play-pause').click();await p.addStyleTag({content:'#play-paused{visibility:hidden!important}'});
  await p.locator('#player-frame').screenshot({path:path.join(root,'assets/game-forms/arcade-qa/'+id+'-first.png')});results[id]=await p.evaluate(()=>gameShowcase.state);
 }
 await fs.writeFile(path.join(root,'notes/arcade-first-view-20261003.json'),JSON.stringify({errors,missing,results},null,2));console.log(JSON.stringify({errors,missing,states:Object.fromEntries(Object.entries(results).map(([k,s])=>[k,{x:s.x,distance:s.distance,elapsed:s.elapsed,hp:s.hp}]))}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
