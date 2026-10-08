const {chromium}=require('./browser.cjs'),fs=require('fs/promises'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl']});try{
 const context=await browser.newContext({viewport:{width:1540,height:1100}}),p=await context.newPage();await p.goto('http://127.0.0.1:8962/forms.html?left=racing&right=beat-em-up&qa=1#compare');
 const frames=p.frames().filter(f=>f.url().includes('present=1'));for(const f of frames)await f.waitForFunction(()=>window.gameShowcase?.ready||window.gameShowcase?.error);
 const race=frames.find(f=>f.url().includes('play=coast')),fighter=frames.find(f=>f.url().includes('play=brawler'));
 await race.locator('#play-start').click();await race.locator('#play-mount').focus();await p.keyboard.down('w');await p.waitForTimeout(2500);await p.keyboard.up('w');
 await fighter.locator('#play-start').click();await fighter.locator('#play-mount').focus();await p.keyboard.down('d');await p.waitForTimeout(850);await p.keyboard.up('d');await p.keyboard.down('j');await p.waitForTimeout(600);await p.keyboard.up('j');await fighter.locator('#play-pause').click();
 for(const f of frames)await f.addStyleTag({content:'#play-paused{visibility:hidden!important}'});
 await p.locator('#compare').screenshot({path:path.join(root,'assets/game-forms/arcade-qa/comparison.png')});
 console.log('Captured actual 3D racing and street combat in the comparison page.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
