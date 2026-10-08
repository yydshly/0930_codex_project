const {chromium}=require('./browser.cjs');
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),base=process.env.FORM_BASE||'http://127.0.0.1:8962/';
const DIRS=[['ArrowUp',0,-1],['ArrowDown',0,1],['ArrowLeft',-1,0],['ArrowRight',1,0]];

// This solver only observes the published board and canonical state. Every
// planned move below is executed with an actual keyboard or canvas input.
function solve(s){
 const grid=s.grid,width=grid[0].length,idx=p=>p.r*width+p.c,exit=idx(s.exit),plates=s.plates.map(idx),initial={p:idx(s.player),b:s.boxes.map(idx).sort((a,b)=>a-b),prev:-1,key:''};
 const queue=[initial],seen=new Set([initial.p+'|'+initial.b.join(',')]);let win=-1;
 for(let i=0;i<queue.length;i++){
  const at=queue[i],open=plates.every(t=>at.b.includes(t));if(open&&at.p===exit){win=i;break}
  for(const [key,dx,dy]of DIRS){
   const c=at.p%width+dx,r=Math.floor(at.p/width)+dy,n=r*width+c;
   if(!grid[r]?.[c]||grid[r][c]==='#'||n===exit&&!open)continue;
   const boxes=[...at.b],bi=boxes.indexOf(n);
   if(bi>=0){const bc=c+dx,br=r+dy,dest=br*width+bc;if(!grid[br]?.[bc]||grid[br][bc]==='#'||boxes.includes(dest)||dest===exit)continue;boxes[bi]=dest;boxes.sort((a,b)=>a-b)}
   const stamp=n+'|'+boxes.join(',');if(seen.has(stamp))continue;seen.add(stamp);queue.push({p:n,b:boxes,prev:i,key});
  }
 }
 assert(win>=0,'warehouse '+(s.level+1)+' must be solvable');const moves=[];for(let i=win;queue[i].prev>=0;i=queue[i].prev)moves.unshift(queue[i].key);
 return {moves,visited:seen.size};
}
function initialState(level,number){const plates=[],boxes=[];let player,exit;for(let r=0;r<level.grid.length;r++)for(let c=0;c<level.grid[r].length;c++){const t=level.grid[r][c];if(t==='T')plates.push({c,r});if(t==='B')boxes.push({c,r});if(t==='P')player={c,r};if(t==='E')exit={c,r}}return {level:number,grid:level.grid,plates,boxes,player,exit}}

(async()=>{
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),checks=[],results={},errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url())});
 const state=()=>page.evaluate(()=>window.gameShowcase.state);
 async function waitReady(){await page.waitForFunction(()=>window.gameShowcase?.ready||window.gameShowcase?.error);assert.equal(await page.evaluate(()=>gameShowcase.error),null);assert.equal(await page.evaluate(()=>gameShowcase.total),41)}
 async function focus(){await page.locator('#play-mount').scrollIntoViewIfNeeded();await page.locator('#play-mount').focus()}
 async function press(key){const s=await state();await page.keyboard.press(key);await page.waitForFunction(({moves,phase})=>gameShowcase.state.moves>moves||gameShowcase.state.phase!==phase,{moves:s.moves,phase:s.phase},{timeout:2500});return state()}
 async function clickTile(c,r){const s=await state(),box=await page.locator('canvas.play-canvas').boundingBox(),board=s.board;await page.mouse.click(box.x+(board.x+(c+.5)*board.cell)/1120*box.width,box.y+(board.y+(r+.5)*board.cell)/630*box.height)}
 async function at(c,r){await page.waitForFunction(({c,r})=>gameShowcase.state.player.c===c&&gameShowcase.state.player.r===r&&gameShowcase.state.queued===0,{c,r},{timeout:6000})}
 async function action(name){await page.getByRole('button',{name,exact:true}).click();await focus()}
 async function saveReload(){
  await page.locator('#play-pause').click();const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('dumpling-showcase-qa-v1-cargo')).state);
  await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);assert.equal((await state()).moves,before.moves,'paused warehouse cannot move');
  await page.reload();await waitReady();const after=await state();for(const k of ['level','player','boxes','moves','pushes','totalMoves','totalPushes','undo','completed','phase'])assert.deepEqual(after[k],before[k],'restored '+k);
  await page.locator('#play-start').click();await focus();checks.push('Pause freezes input; saved player, boxes, undo stack and warehouse restore on reload');
 }
 await page.goto(base+'showcase.html?play=cargo&qa=1#play');await waitReady();await page.locator('#play-start').click();await focus();
 const start=await state();assert.equal(start.levels.length,3);results.solvers=start.levels.map((l,i)=>{const p=solve(initialState(l,i));return {warehouse:i+1,name:l.name,shortestMoves:p.moves.length,visitedStates:p.visited}});checks.push('Read-only BFS proves all three original layouts can reach the exit with push-only rules');
 // The starting crate has masonry behind it: pushing up must not move either.
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(680);await page.keyboard.up('ArrowUp');let current=await state();assert.deepEqual(current.player,start.player);assert.deepEqual(current.boxes,start.boxes);assert.equal(current.moves,0);checks.push('Held direction cannot push a crate into masonry or pass through it');
 await press('ArrowDown');assert.deepEqual((await state()).boxes,start.boxes,'walking away must never pull a crate');await action('撤销一步');assert.deepEqual((await state()).player,start.player);assert.deepEqual((await state()).boxes,start.boxes);checks.push('Walking away does not pull crates; real undo restores the move');
 await clickTile(2,2);await at(2,2);current=await state();await page.keyboard.press('ArrowRight');await page.waitForTimeout(220);assert.deepEqual((await state()).player,current.player);assert.equal((await state()).moves,current.moves);checks.push('Clicked reachable floor follows a real route; a direct wall blocks the porter');
 await action('重开当前仓库');assert.deepEqual((await state()).player,start.player);assert.deepEqual((await state()).boxes,start.boxes);assert.equal((await state()).moves,0);
 await clickTile(2,3);await at(2,3);await clickTile(3,3);await page.waitForFunction(()=>gameShowcase.state.boxes[0].c===4);assert.equal((await state()).pushes,1);await action('撤销一步');assert.deepEqual((await state()).boxes,start.boxes);await action('重开当前仓库');checks.push('Adjacent crate click pushes exactly one square; undo and per-warehouse restart restore original placement');
 await clickTile(4,5);await at(4,5);const heldBefore=await state();await page.keyboard.down('ArrowRight');await page.waitForTimeout(410);await page.keyboard.up('ArrowRight');current=await state();assert(current.moves-heldBefore.moves>=1&&current.moves-heldBefore.moves<=3,'held key must repeat at a controlled pace');await action('重开当前仓库');checks.push('Held movement uses a deliberate initial delay and bounded repeat rate');
 // Occupying a plate alone is insufficient: the porter must enter the exit.
 let plan=solve(await state());for(const key of plan.moves.slice(0,4))await press(key);current=await state();assert(current.doorOpen);assert.equal(current.phase,'play');assert.equal(current.won,false);assert.notDeepEqual(current.player,current.exit);checks.push('Boxes open the exit, but the warehouse completes only after walking onto it');
 for(const key of ['ArrowDown','ArrowRight','ArrowRight','ArrowUp','ArrowLeft'])await press(key);current=await state();assert.equal(current.doorOpen,false);assert.equal(current.occupied,0);await clickTile(7,1);await page.waitForTimeout(220);assert.deepEqual((await state()).player,current.player,'locked exit click cannot walk through the door');await action('撤销一步');assert((await state()).doorOpen);assert.equal((await state()).occupied,1);await action('重开当前仓库');checks.push('Moving a crate off its plate locks the exit; a real undo restores the box and reopens it');
 plan=solve(await state());for(const key of plan.moves)await press(key);current=await state();assert.equal(current.phase,'cleared');assert.deepEqual(current.completed,[0]);results.warehouse1={moves:current.moves,pushes:current.pushes};await action('进入下一间仓库');assert.equal((await state()).level,1);
 plan=solve(await state());for(const key of plan.moves.slice(0,7))await press(key);await saveReload();plan=solve(await state());for(const key of plan.moves)await press(key);current=await state();assert.equal(current.phase,'cleared');assert.deepEqual(current.completed,[0,1]);results.warehouse2={moves:current.moves,pushes:current.pushes};await action('进入下一间仓库');assert.equal((await state()).level,2);
 await press('ArrowUp');current=await state();await page.keyboard.press('ArrowRight');await page.waitForTimeout(220);assert.deepEqual((await state()).boxes,current.boxes);assert.deepEqual((await state()).player,current.player);assert.equal((await state()).moves,current.moves);await action('重开当前仓库');checks.push('A neighboring crate blocks a push; crates cannot overlap or push each other in a chain');
 plan=solve(await state());let screenshot=false;for(const key of plan.moves){await press(key);current=await state();if(!screenshot&&current.doorOpen&&current.phase==='play'){await page.waitForTimeout(170);fs.mkdirSync(path.join(root,'assets/game-forms/completion-qa'),{recursive:true});await page.locator('#play-mount').screenshot({path:path.join(root,'assets/game-forms/completion-qa/cargo-playable.png')});screenshot=true}}
 current=await state();assert(current.won);assert.equal(current.phase,'won');assert.deepEqual(current.completed,[0,1,2]);assert.equal(current.score,1500);assert.equal(current.occupied,3);assert.deepEqual(current.player,current.exit);assert(screenshot);results.warehouse3={moves:current.moves,pushes:current.pushes};results.finish={score:current.score,totalMoves:current.totalMoves,totalPushes:current.totalPushes,elapsed:current.elapsed};checks.push('All three exits complete through real keyboard controls and visible next-warehouse actions');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dumpling-showcase-qa-v1-records'))?.cargo?.completed);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dumpling-showcase-qa-v1-records')).cargo.best),1500);
 await saveReload();assert((await state()).won);await action('重新搬运');current=await state();assert.equal(current.level,0);assert.equal(current.won,false);assert.equal(current.score,0);assert.equal(current.moves,0);assert.deepEqual(current.boxes,start.boxes);assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('dumpling-showcase-qa-v1-records')).cargo.completed));checks.push('Completed save restores; replay resets the puzzle while retaining the completion record');
 const normal=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('dumpling-showcase-v1-')||k.startsWith('dumpling-extension-v1-')));assert.deepEqual(normal,[]);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);checks.push('QA storage is isolated; no runtime exceptions or missing assets');
 fs.mkdirSync(path.join(root,'notes'),{recursive:true});fs.writeFileSync(path.join(root,'notes/completion-cargo-check-20261003.json'),JSON.stringify({passed:true,url:base+'showcase.html?play=cargo&qa=1#play',viewport:{width:1440,height:1000},checks,results,errors,missing},null,2));await browser.close();console.log(checks.join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
