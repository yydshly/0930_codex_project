const {chromium}=require('./browser.cjs'),assert=require('assert/strict'),fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8962/',looks=['clay','felt','watercolor','engraving'];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[],missing=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))missing.push(r.url())});
  await page.addInitScript(()=>{window.__artDraws=new Set();const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(image?.src?.includes('/assets/art-styles/'))window.__artDraws.add(image.src);return draw.call(this,image,...args)}});
  const ready=async()=>{await page.waitForFunction(()=>window.extensionLab?.current==='inn'&&!extensionLab.error);await page.waitForFunction(async()=>{const {worldArtStatus}=await import('./games/worlds-art.js?v=4');return worldArtStatus('inn').ready})};
  const command=async id=>page.locator('#game-actions [data-command="'+id+'"]').click();
  await page.goto(base+'games.html?game=inn&look=paint&qa=1#game-view');await ready();
  await command('read-guest');await command('room-quiet');await command('place-tea');await command('place-plant');await command('place-books');await command('assign');
  await page.waitForFunction(()=>extensionLab.state.current.settled>=1.2);await page.locator('#game-pause').click();
  await page.waitForFunction(()=>extensionLab.paused);const before=await page.evaluate(()=>extensionLab.state);
  await fs.mkdir(path.join(root,'assets/art-styles/playable-previews'),{recursive:true});
  for(const look of ['paint','pixel','cel','paper','neon','diorama','voxel','cinematic',...looks]){
   await page.locator('button[data-art-direction="'+look+'"]').click();await page.waitForFunction(look=>document.body.dataset.artDirection===look,look);await ready();
   assert.deepEqual(await page.evaluate(()=>extensionLab.state),before,'Switching '+look+' must preserve the full inn state');
   if(looks.includes(look)){await page.locator('#game-mount canvas:visible').scrollIntoViewIfNeeded();await page.waitForTimeout(180);await page.locator('#game-mount canvas:visible').screenshot({path:path.join(root,'assets/art-styles/playable-previews',look+'.png'),style:'#pause-screen{visibility:hidden!important}'});const drawn=await page.evaluate(()=>[...window.__artDraws]);assert(drawn.some(s=>s.endsWith('/'+look+'/courier-activity.webp')),look+' activity art');assert(drawn.some(s=>s.endsWith('/'+look+'/tea.webp')),look+' prop art')}
  }
  checks.push('All 12 inn styles preserve the full occupied-room state; four new backgrounds, activity sprites and furniture actually drawn');
  await page.locator('#game-pause').click();await page.waitForFunction(()=>!extensionLab.paused);
  await page.locator('#game-mount canvas:visible').scrollIntoViewIfNeeded();await page.locator('#game-mount canvas:visible').focus();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');
  const draws=await page.evaluate(()=>[...window.__artDraws]);assert(draws.some(s=>s.endsWith('/engraving/keeper-walk-a.webp')));assert(draws.some(s=>s.endsWith('/engraving/keeper-walk-b.webp')));
  checks.push('Actual keyboard movement uses both generated walk frames');
  await page.locator('button[data-art-direction=clay]').click();await ready();await page.locator('.art-favorite').click();await page.reload();await ready();assert.equal(await page.locator('body').getAttribute('data-art-direction'),'clay');assert.equal(await page.locator('.art-favorite').getAttribute('aria-pressed'),'true');
  await page.locator('#tab-ecology').click();await page.waitForFunction(()=>extensionLab.current==='ecology');assert.equal(await page.locator('body').getAttribute('data-art-direction'),'paint');assert(await page.locator('button[data-art-direction=clay]').isDisabled());await page.locator('#tab-inn').click();await ready();assert.equal(await page.locator('body').getAttribute('data-art-direction'),'clay');checks.push('Per-game remembered style and favorite persist; new styles correctly limited to the inn');
  await page.goto(base+'showcase.html?play=legacy-inn&qa=1#play');await page.waitForFunction(()=>window.gameShowcase?.ready);let frame=page.frames().find(f=>f.url().includes('games.html'));await frame.waitForFunction(()=>window.extensionLab?.current==='inn');
  assert.equal(await page.locator('.legacy-style-samples button').count(),4);await page.locator('.legacy-style-samples [data-look=felt]').click();await frame.waitForFunction(()=>document.body.dataset.artDirection==='felt');assert.equal(await page.locator('.legacy-toolbar select').inputValue(),'felt');
  await frame.locator('#tab-ecology').click();await page.waitForFunction(()=>gameShowcase.current==='legacy-ecology');assert(await page.locator('.legacy-style-samples').isHidden());assert(await page.locator('.legacy-toolbar option[value=felt]').evaluate(e=>e.disabled));checks.push('Gallery preview controls select the same art; unsupported options hidden/disabled on other worlds');
  await page.setViewportSize({width:390,height:844});
  for(const look of looks){await page.goto(base+'games.html?game=inn&look='+look+'&qa=1#game-view');await ready();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#art-directions').screenshot({path:path.join(root,'assets/art-styles/playable-previews',look+'-mobile.png')})}
  checks.push('All four new styles fit 390px mobile without horizontal overflow');
  const keys=await page.evaluate(()=>Object.keys(localStorage));assert(!keys.some(k=>k.startsWith('dumpling-extension-v1-')||k==='dumpling-art-directions-v2'));checks.push('Isolated QA did not write normal user saves or preferences');
  const manifest=JSON.parse(await fs.readFile(path.join(root,'notes/style-preservation-20261003.json'),'utf8'));
  for(const file of manifest.files)assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root,file.path))).digest('hex'),file.sha256,file.path);
  checks.push('All '+manifest.files.length+' existing visual assets have identical hashes');assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await fs.writeFile(path.join(root,'notes/style-packs-check-20261003.json'),JSON.stringify({at:new Date().toISOString(),method:'isolated browser, actual UI and keyboard input; read-only gameplay state',checks,errors,missing},null,2));console.log(checks.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
