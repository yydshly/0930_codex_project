import {W,H,images,canvasSurface,cover,label,action,safeSaved} from './showcase-core.js';

// # = masonry, T = pressure plate, E = exit, B = crate, P = porter.
// The three compact warehouses were designed for this maritime collection.
export const CARGO_LEVELS=Object.freeze([
 {name:'靠岸入库',hint:'绕到木箱左侧，将它推上右方的压板。',grid:['#########','#..#...E#','#..#....#','#..B.T..#','#..P....#','#.......#','#########']},
 {name:'双灯联锁',hint:'两块压板同时受压，出口才会开启。',grid:['#########','#..T...E#','#.......#','#..B#B..#','#...P...#','#..T....#','#########']},
 {name:'潮汐总仓',hint:'先给并排木箱腾出空间，再分别送往三块压板。',grid:['#########','#T.....E#','#...#...#','#.BB.B..#','#P..#...#','#T...T..#','#########']}
].map(l=>Object.freeze({...l,grid:Object.freeze(l.grid)})));
export const CARGO_BOARD=Object.freeze({x:281,y:116,cell:62,cols:9,rows:7});
const directions={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
const same=(a,b)=>a.c===b.c&&a.r===b.r,key=p=>p.c+','+p.r;
const topology=CARGO_LEVELS.map(l=>{const plates=[],boxes=[];let player,exit;for(let r=0;r<l.grid.length;r++)for(let c=0;c<l.grid[r].length;c++){const t=l.grid[r][c];if(t==='T')plates.push({c,r});if(t==='B')boxes.push({id:boxes.length,c,r});if(t==='P')player={c,r};if(t==='E')exit={c,r}}return {plates,boxes,player,exit}});
const fresh=level=>({version:1,level,player:{...topology[level].player},boxes:structuredClone(topology[level].boxes),moves:0,pushes:0,totalMoves:0,totalPushes:0,restarts:0,undos:0,completed:[],score:0,phase:'play',won:false,facing:'down',undo:[],elapsed:0,message:CARGO_LEVELS[level].hint});

export async function createCargo({host,input,saved,notify,sfx}){
 const art=await images(['room','crate','worker','plate','wall'],'assets/game-forms/cargo/'),{ctx,element}=canvasSurface(host);
 element.setAttribute('aria-label','潮仓搬运。方向键或 WASD 移动，只能推动木箱。所有压板被木箱压住后，走入出口。C 撤销，R 重开当前仓库，也可点击空地行走。');
 let raw=safeSaved(saved,fresh(0));const level=Number.isInteger(raw.level)&&raw.level>=0&&raw.level<CARGO_LEVELS.length?raw.level:0;
 let s=fresh(level);for(const k of Object.keys(s))if(k in raw)s[k]=structuredClone(raw[k]);s.level=level;
 const tile=(c,r)=>CARGO_LEVELS[s.level].grid[r]?.[c]||'#';
 const valid=p=>p&&Number.isInteger(p.c)&&Number.isInteger(p.r)&&tile(p.c,p.r)!=='#';
 if(!valid(s.player)||!Array.isArray(s.boxes)||s.boxes.length!==topology[s.level].boxes.length||s.boxes.some(b=>!valid(b)||same(b,s.player))||new Set(s.boxes.map(key)).size!==s.boxes.length)s=fresh(level);
 s.boxes=s.boxes.map((b,i)=>({id:i,c:b.c,r:b.r}));s.completed=Array.isArray(s.completed)?s.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<=s.level):[];
 s.undo=Array.isArray(s.undo)?s.undo.slice(-200).filter(u=>u&&valid(u.player)&&Array.isArray(u.boxes)&&u.boxes.length===s.boxes.length&&u.boxes.every(valid)&&new Set(u.boxes.map(key)).size===u.boxes.length&&!u.boxes.some(b=>same(b,u.player))):[];
 for(const k of ['moves','pushes','totalMoves','totalPushes','restarts','undos','elapsed'])if(!Number.isFinite(s[k])||s[k]<0)s[k]=0;
 const occupied=()=>topology[s.level].plates.filter(p=>s.boxes.some(b=>same(p,b))).length;
 const open=()=>occupied()===topology[s.level].plates.length;
 if(!['play','cleared','won'].includes(s.phase)||s.phase!=='play'&&(!open()||!same(s.player,topology[s.level].exit)))s.phase='play';
 s.won=s.phase==='won'&&s.level===CARGO_LEVELS.length-1;s.score=s.completed.length*500;
 let queue=[],path=[],cooldown=0,tween=null,held='',heldTime=0,repeatAt=.34,active=true,time=0;
 function say(message,sound='turn'){s.message=message;if(sound)sfx(sound)}
 function clearMotion(){queue=[];path=[];cooldown=0;tween=null;held='';heldTime=0;repeatAt=.34}
 function snapshot(){return {player:{...s.player},boxes:structuredClone(s.boxes),moves:s.moves,pushes:s.pushes,totalMoves:s.totalMoves,totalPushes:s.totalPushes,facing:s.facing}}
 function remember(){s.undo.push(snapshot());if(s.undo.length>200)s.undo.shift()}
 function move(dx,dy){
  if(s.phase!=='play')return false;
  const next={c:s.player.c+dx,r:s.player.r+dy};s.facing=dy<0?'up':dy>0?'down':dx<0?'left':'right';
  if(tile(next.c,next.r)==='#'){say('石墙挡住了这条路。','');return false}
  if(same(next,topology[s.level].exit)&&!open()){say('出口仍锁住：把所有木箱留在压板上。','');return false}
  const box=s.boxes.find(b=>same(b,next)),dest={c:next.c+dx,r:next.r+dy};
  if(box&&(tile(dest.c,dest.r)==='#'||s.boxes.some(b=>same(b,dest))||same(dest,topology[s.level].exit))){say('木箱前方没有空位；可以绕行，或撤销上一步。','');return false}
  const before=snapshot(),wasOpen=open();remember();s.player=next;s.moves++;s.totalMoves++;
  if(box){box.c=dest.c;box.r=dest.r;s.pushes++;s.totalPushes++;sfx(topology[s.level].plates.some(p=>same(p,dest))?'pickup':'build')}else sfx('step');
  tween={player:before.player,boxes:before.boxes,t:0};cooldown=.145;
  if(!wasOpen&&open())say('全部压板亮起。现在走到标记的出口。','door');
  else if(wasOpen&&!open())say('一只木箱离开压板，出口重新锁上。','turn');
  else if(box)s.message='木箱已推进一格。只能推，不能从前方拉回。';
  if(same(s.player,topology[s.level].exit)&&open()){
   if(!s.completed.includes(s.level))s.completed.push(s.level);s.score=s.completed.length*500;
   s.won=s.level===CARGO_LEVELS.length-1;s.phase=s.won?'won':'cleared';queue=[];path=[];
   say(s.won?'三间潮仓全部交付。压板保持点亮，港口的夜班搬运完成。':'这间仓库已交付。准备好后，进入下一间仓库。','success');
   notify(s.won?'潮仓搬运完成：三间仓库的木箱全部归位。':'第 '+(s.level+1)+' 间仓库完成，出口已通过。');
  }
  return true;
 }
 function undo(){if(!s.undo.length)return;const old=s.undo.pop();Object.assign(s,structuredClone(old));s.undos++;s.phase='play';s.won=false;s.completed=s.completed.filter(n=>n!==s.level);s.score=s.completed.length*500;clearMotion();say('已撤销一步，木箱与搬运员回到先前的位置。','turn')}
 function restartLevel(){const keep={totalMoves:s.totalMoves,totalPushes:s.totalPushes,restarts:s.restarts+1,undos:s.undos,completed:s.completed.filter(n=>n!==s.level),elapsed:s.elapsed};s={...fresh(s.level),...keep};s.score=s.completed.length*500;clearMotion();say('当前仓库重新摆放好了。'+CARGO_LEVELS[s.level].hint,'shuffle')}
 function nextLevel(){if(s.phase!=='cleared')return;const keep={totalMoves:s.totalMoves,totalPushes:s.totalPushes,restarts:s.restarts,undos:s.undos,completed:[...s.completed],score:s.score,elapsed:s.elapsed};s={...fresh(s.level+1),...keep};clearMotion();sfx('door')}
 function replay(){s=fresh(0);clearMotion();sfx('shuffle')}
 function walkTo(target){
  if(s.phase!=='play')return;const crate=s.boxes.find(b=>same(b,target));
  if(crate){const dx=target.c-s.player.c,dy=target.r-s.player.r;if(Math.abs(dx)+Math.abs(dy)===1){queue=[[dx,dy]];path=[]}else say('先走到木箱旁边，再朝木箱前进来推动它。','');return}
  if(tile(target.c,target.r)==='#')return;if(same(target,topology[s.level].exit)&&!open()){say('所有压板受压后，出口才会放行。','');return}
  const todo=[s.player],seen=new Map([[key(s.player),null]]);let found=false;
  for(let i=0;i<todo.length;i++){const p=todo[i];if(same(p,target)){found=true;break}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={c:p.c+dx,r:p.r+dy},k=key(n);if(tile(n.c,n.r)==='#'||s.boxes.some(b=>same(b,n))||same(n,topology[s.level].exit)&&!open()||seen.has(k))continue;seen.set(k,{p,d:[dx,dy]});todo.push(n)}}
  if(!found){say('这处空地暂时被挡住。先调整木箱，再选择可到达的位置。','');return}
  path=[];let p=target;while(!same(p,s.player)){const link=seen.get(key(p));path.unshift(link.d);p=link.p}queue=[];
 }
 function tick(dt){
  s.elapsed+=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);if(tween){tween.t=Math.min(1,tween.t+dt/.145);if(tween.t===1)tween=null}
  if(!active)return;if(input.pressed.has('KeyC')){undo();return}if(input.pressed.has('KeyR')){restartLevel();return}
  let pressed=false;for(const code of input.pressed){const d=directions[code];if(d&&s.phase==='play'){if(!pressed){queue=[];path=[]}queue.push(d);pressed=true}}
  let dir='';if(input.x||input.y)dir=input.y?(input.y>0?'0,1':'0,-1'):(input.x>0?'1,0':'-1,0');
  if(dir!==held){held=dir;heldTime=0;repeatAt=.34;if(dir&&!pressed&&s.phase==='play'){queue.push(dir.split(',').map(Number));path=[]}}
  else if(dir){heldTime+=dt;if(heldTime>=repeatAt&&s.phase==='play'){repeatAt+=.19;if(queue.length<2)queue.push(dir.split(',').map(Number))}}
  for(const p of input.pointers){const b=CARGO_BOARD,c=Math.floor((p.x-b.x)/b.cell),r=Math.floor((p.y-b.y)/b.cell);if(c>=0&&c<b.cols&&r>=0&&r<b.rows)walkTo({c,r})}
  if(cooldown<=0&&s.phase==='play'){const d=queue.shift()||path.shift();if(d&&!move(...d)){path=[];cooldown=.11}}
 }
 const point=p=>({x:CARGO_BOARD.x+(p.c+.5)*CARGO_BOARD.cell,y:CARGO_BOARD.y+(p.r+.5)*CARGO_BOARD.cell});
 function artTile(id,x,y,size){const source={crate:[56,42,363,396],plate:[107,44,301,300],wall:[124,4,230,358],worker:[89,17,301,393]}[id];ctx.drawImage(art[id],...source,x-size/2,y-size/2,size,size)}
 function shadow(x,y,size){ctx.fillStyle='#030a0b75';ctx.beginPath();ctx.ellipse(x,y+size*.37,size*.38,size*.14,0,0,Math.PI*2);ctx.fill()}
 function text(txt,x,y,size=14,color='#cfdbd0',align='left'){ctx.font=`${size}px "Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(txt,x,y)}
 function panel(x,y,w,h){ctx.fillStyle='#081e25e8';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#bba06c77';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h)}
 function draw(){
  cover(ctx,art.room);ctx.fillStyle='#03131b52';ctx.fillRect(0,0,W,H);
  panel(52,26,1016,58);text('潮仓搬运',76,64,24,'#f1dbac');text('0'+(s.level+1)+' / 03  '+CARGO_LEVELS[s.level].name,560,62,20,'#e8dcc5','center');text('压板 '+occupied()+'/'+topology[s.level].plates.length,1044,62,18,open()?'#91efd3':'#bdd9d6','right');
  panel(56,177,199,248);text('搬运规则',76,213,17,'#edcb8d');text('方向键 / WASD',76,252,14);text('木箱只能推，不能拉',76,280,14);text('所有压板同时受压',76,308,14);text('再走入亮起的出口',76,336,14);text('点空地：自动绕行',76,374,13,'#a2bbb9');text('C 撤销 · R 重开',76,402,13,'#a2bbb9');
  panel(866,177,199,248);text('本仓交付',886,213,17,'#edcb8d');text(String(s.moves).padStart(2,'0'),886,266,35,'#e8dcc5');text('移动步数',949,264,13,'#a2bbb9');text(String(s.pushes).padStart(2,'0'),886,314,35,'#e8dcc5');text('推动次数',949,312,13,'#a2bbb9');text('已交付  '+s.completed.length+' / 3',886,366,15,'#d0e6d6');text('出口  '+(open()?'开启':'锁定'),886,401,15,open()?'#90e7bd':'#9cb5ba');
  const b=CARGO_BOARD;ctx.fillStyle='#05131980';ctx.fillRect(b.x-9,b.y-9,b.cols*b.cell+18,b.rows*b.cell+18);ctx.strokeStyle='#bb986777';ctx.lineWidth=3;ctx.strokeRect(b.x-6,b.y-6,b.cols*b.cell+12,b.rows*b.cell+12);
  for(let r=0;r<b.rows;r++)for(let c=0;c<b.cols;c++){const x=b.x+c*b.cell,y=b.y+r*b.cell,t=tile(c,r),p=point({c,r});ctx.fillStyle=(c+r)%2?'#bfdace10':'#071b281b';ctx.fillRect(x,y,b.cell,b.cell);ctx.strokeStyle='#d0dfc726';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,b.cell-1,b.cell-1);if(t==='#'){shadow(p.x,p.y,61);artTile('wall',p.x,p.y,61)}else if(t==='T'){const covered=s.boxes.some(q=>q.c===c&&q.r===r);ctx.fillStyle=covered?'#d8b35368':'#6bd1cc27';ctx.fillRect(x+5,y+5,b.cell-10,b.cell-10);artTile('plate',p.x,p.y,50);ctx.strokeStyle=covered?'#f9d67c':'#81d7d0';ctx.lineWidth=2;ctx.strokeRect(x+4,y+4,b.cell-8,b.cell-8)}else if(t==='E'){const unlocked=open();ctx.fillStyle=unlocked?'#5ac4a757':'#071c27d9';ctx.fillRect(x+3,y+3,b.cell-6,b.cell-6);ctx.strokeStyle=unlocked?'#a5f6ce':'#819792';ctx.lineWidth=2;ctx.strokeRect(x+4,y+4,b.cell-8,b.cell-8);if(!unlocked){for(let i=0;i<4;i++){ctx.fillStyle='#9cad9c77';ctx.fillRect(x+12+i*11,y+10,4,41)}}text(unlocked?'出口 →':'出口',p.x,p.y+6,15,unlocked?'#d9fff0':'#d4dbc1','center')}}
  const ease=tween?1-Math.pow(1-tween.t,3):1;
  for(const box of s.boxes){const from=tween?.boxes.find(v=>v.id===box.id)||box,p=point({c:from.c+(box.c-from.c)*ease,r:from.r+(box.r-from.r)*ease});shadow(p.x,p.y,55);artTile('crate',p.x,p.y,54);if(topology[s.level].plates.some(v=>same(v,box))){ctx.strokeStyle='#f7d982';ctx.lineWidth=2;ctx.strokeRect(p.x-28,p.y-28,56,56)}}
  const from=tween?.player||s.player,p=point({c:from.c+(s.player.c-from.c)*ease,r:from.r+(s.player.r-from.r)*ease});shadow(p.x,p.y,41);ctx.save();ctx.translate(p.x,p.y);ctx.rotate({down:0,up:Math.PI,left:Math.PI/2,right:-Math.PI/2}[s.facing]||0);ctx.drawImage(art.worker,89,17,301,393,-19,-25,38,50);ctx.restore();
  if(input.hover&&s.phase==='play'){const c=Math.floor((input.hover.x-b.x)/b.cell),r=Math.floor((input.hover.y-b.y)/b.cell);if(tile(c,r)!=='#'){ctx.strokeStyle='#ebd591bb';ctx.lineWidth=2;ctx.strokeRect(b.x+c*b.cell+2,b.y+r*b.cell+2,b.cell-4,b.cell-4)}}
  panel(180,570,760,38);text(s.message,560,595,14,'#e0dac0','center');
  if(s.phase!=='play'){panel(335,209,450,211);label(ctx,s.won?'夜班搬运完成':'仓库交付完成',560,265,'#bdf1cc',30);text(s.won?'三间潮仓 · 所有木箱归位':'压板已点亮，已走入出口',560,310,18,'#e8dcc5','center');text('本仓 '+s.moves+' 步 / '+s.pushes+' 次推动',560,346,16,'#bdd9d6','center');text(s.won?'点击下方「重新搬运」再试一次':'点击下方「进入下一间仓库」继续',560,389,15,'#dcc896','center')}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),grid:[...CARGO_LEVELS[s.level].grid],levels:structuredClone(CARGO_LEVELS),board:{...CARGO_BOARD},plates:structuredClone(topology[s.level].plates),exit:{...topology[s.level].exit},occupied:occupied(),doorOpen:open(),queued:queue.length+path.length}),getStatus:()=>({goal:s.won?'三间潮仓全部交付':s.phase==='cleared'?'仓库交付完成':'推动木箱压住全部压板，再走入出口',message:s.message,stats:['仓库 '+(s.level+1)+'/3','移动 '+s.moves,'推动 '+s.pushes,'压板 '+occupied()+'/'+topology[s.level].plates.length,'交付 '+s.completed.length+'/3'],actions:s.won?[action('重新搬运',replay)]:s.phase==='cleared'?[action('进入下一间仓库',nextLevel),action('撤销一步',undo,!s.undo.length),action('重开当前仓库',restartLevel)]:[action('撤销一步',undo,!s.undo.length),action('重开当前仓库',restartLevel),action('查看搬运提示',()=>say(CARGO_LEVELS[s.level].hint))]}),setActive(value){if(active&&!value)clearMotion();active=value},dispose(){clearMotion()}};
}
