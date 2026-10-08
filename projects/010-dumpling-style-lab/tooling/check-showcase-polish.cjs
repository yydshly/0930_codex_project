const fs=require('fs/promises'),path=require('path'),assert=require('assert');
const {chromium}=require('./browser.cjs');
const root=path.resolve(__dirname,'..'),results=[],errors=[],selected=process.argv.slice(2);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl']});
 const context=await browser.newContext({viewport:{width:960,height:800}}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 const state=()=>p.evaluate(()=>structuredClone(gameShowcase.state));
 async function enter(id){await p.goto('http://127.0.0.1:8962/showcase.html?qa=1&play='+id+'#play');await p.waitForFunction(()=>gameShowcase?.ready);await p.locator('#play-start').click();await p.locator('#play-mount').focus()}
 const press=async key=>{await p.locator('#play-mount').focus();await p.keyboard.press(key);await p.waitForTimeout(90)};
 const action=async name=>{await p.locator('#play-actions').getByRole('button',{name,exact:true}).click();await p.locator('#play-mount').focus();await p.waitForTimeout(100)};
 async function hold(key,until,timeout=30000){await p.locator('#player-frame').scrollIntoViewIfNeeded();await p.locator('#play-mount').focus();await p.keyboard.down(key);const started=Date.now();try{while(!until(await state())){if(Date.now()-started>timeout)throw Error('Movement timeout '+key+' '+JSON.stringify(await state()));await p.waitForTimeout(60)}}finally{await p.keyboard.up(key)}}
 async function axis(field,target,minus,plus,tolerance=.32){for(let i=0;i<10;i++){const s=await state();if(Math.abs(s[field]-target)<tolerance)return;const positive=s[field]<target;await hold(positive?plus:minus,s=>positive?s[field]>=target-tolerance:s[field]<=target+tolerance)}throw Error('Axis did not settle '+field)}
 async function faceForward(){await p.locator('#player-frame').scrollIntoViewIfNeeded();const s=await state(),b=await p.locator('canvas.play-canvas').boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+s.camYaw/.004,b.y+b.height/2,{steps:8});await p.mouse.up();await p.waitForTimeout(250);assert(Math.abs((await state()).camYaw)<.06)}
 async function check(id,fn){if(selected.length&&!selected.includes(id))return;try{await fn();await p.locator('#player-frame').screenshot({path:path.join(root,'assets/showcase',id+'-polished.png')});results.push({id,passed:true,state:await state()});console.log(id+' passed')}catch(e){results.push({id,failed:e.message,state:await state()});console.error(id,e.message);await p.locator('#player-frame').screenshot({path:path.join(root,'assets/showcase',id+'-polish-failed.png')})}}
 await check('hunter',async()=>{
  await enter('hunter');await action('进入熔炉');const held=new Set();await p.keyboard.down('j');
  async function moving(wanted){for(const k of held)if(!wanted.has(k)){await p.keyboard.up(k);held.delete(k)}for(const k of wanted)if(!held.has(k)){await p.keyboard.down(k);held.add(k)}}
  const start=Date.now();
  while(Date.now()-start<150000){
   const s=await state();if(s.won||s.phase==='lost')break;
   if(s.phase==='upgrade'){await moving(new Set());await p.keyboard.up('j');await action(s.hp<65?'余烬 · 恢复与生命上限':'锋刃 · 攻击 +12');await p.keyboard.down('j');continue}
   const living=s.enemies.filter(e=>e.hp>0),nearest=living.sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];
   const target=living.find(e=>e.type===2)||nearest;
   let dx=target.x-s.x,dy=target.y-s.y,dist=Math.hypot(dx,dy);
   const threat=living.find(e=>e.mode==='warn'&&e.type!==2&&e.clock<.32&&Math.hypot(e.x-s.x,e.y-s.y)<(e.type===3?210:155));
   if(threat){dx=s.x-threat.x;dy=s.y-threat.y;dist=300}
   const wanted=new Set();if(dist>110||threat){if(Math.abs(dx)>15)wanted.add(dx>0?'d':'a');if(Math.abs(dy)>15)wanted.add(dy>0?'s':'w')}
   await moving(wanted);if(threat)await p.keyboard.press('Space');await p.waitForTimeout(85);
  }
  await moving(new Set());await p.keyboard.up('j');const end=await state();assert(end.won&&end.kills===12,'Three-wave real-input victory '+JSON.stringify(end));
  assert((await p.locator('.world-card[data-id=hunter] .card-badge').textContent()).includes('已完成'));
  await action('再挑战一场');assert((await state()).phase==='fight'&&(await state()).kills===0);await p.keyboard.press('Space');await p.waitForTimeout(110);assert(Math.abs((await state()).x-560)>8,'Stationary dodge must move');
  console.log('hunter: all 12 guards, boss, upgrades, replay and stationary dash');
 });
 await check('station',async()=>{
  await enter('station');await axis('z',1,'w','s');await press('e');assert((await state()).solved[0]);
  await axis('x',1.5,'a','d');await axis('z',-2,'w','s');await axis('x',0,'a','d');await axis('z',-7.5,'w','s');await axis('x',-2,'a','d');await press('e');assert((await state()).battery==='held');
  await axis('x',2,'a','d');await axis('z',-11,'w','s');await press('e');assert((await state()).solved[1]);await axis('x',0,'a','d');await axis('z',-21.5,'w','s');
  for(const x of [-2,2,0]){await axis('x',x,'a','d');await press('e')}assert((await state()).solved[2]);await axis('x',0,'a','d');await hold('w',s=>s.won);
  await p.reload();await p.waitForFunction(()=>gameShowcase?.ready);await p.locator('#play-start').click();assert((await state()).won);assert(await p.locator('.spatial-ending').isVisible());assert((await p.locator('.scene-hud').textContent()).includes('已恢复'));
 });
 await check('expedition',async()=>{
  await enter('expedition');await faceForward();await axis('x',-5,'a','d');await axis('z',-2,'w','s');await p.waitForFunction(()=>gameShowcase.state.stones.length===1);
  await axis('z',0,'w','s');await axis('x',2,'a','d');await axis('z',3,'w','s');await p.waitForFunction(()=>gameShowcase.state.stones.length===2);
  await axis('z',-1.15,'w','s');await axis('x',6.9,'a','d');await p.locator('#player-frame').scrollIntoViewIfNeeded();await p.locator('#play-mount').focus();await p.keyboard.down('w');await p.keyboard.press('Space');try{await p.waitForFunction(()=>gameShowcase.state.z<-2.7,null,{timeout:20000})}finally{await p.keyboard.up('w')}await p.waitForFunction(()=>gameShowcase.state.stones.length===3);
  await axis('z',1,'w','s');await axis('x',8,'a','d');await press('e');assert((await state()).won);
 });
 await check('builder',async()=>{
  await enter('builder');await faceForward();for(let i=0;i<3;i++){await action('建造方块');if(i<2)await action('选择下一格')}
  assert((await state()).stock===5);await axis('x',8,'a','d');await axis('z',1,'w','s');await press('e');assert((await state()).won);
 });
 await browser.close();const file=path.join(root,'notes/showcase-polish-check.json');let merged=results;
 if(selected.length){try{const previous=JSON.parse(await fs.readFile(file));merged=[...previous.results.filter(r=>!selected.includes(r.id)),...results]}catch{}}
 await fs.writeFile(file,JSON.stringify({at:new Date().toISOString(),method:'isolated browser; all progress earned through real keyboard/pointer input; state read only',results:merged,errors},null,2));
 assert(!errors.length,errors.join('\n'));assert(!results.some(r=>r.failed),'Polish checks failed');
})().catch(e=>{console.error(e);process.exitCode=1});
