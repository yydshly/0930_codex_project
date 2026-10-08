import {W,H,clamp,hash,images,canvasSurface,sprite,glow,label,action,safeSaved} from './showcase-core.js';

export async function createMaze({host,input,saved,notify,sfx}){
 const art=await images(['up','right','down','left','red','violet','battery','portal'],'assets/game-forms/maze/'),{ctx}=canvasSurface(host);
 const size=17,tile=30,ox=305,oy=68,dirs=[[0,-1,'up'],[1,0,'right'],[0,1,'down'],[-1,0,'left']];
 // A fixed connected maze with loops, authored once from a deterministic topology.
 const random=hash(7314),board=Array.from({length:size},()=>Array(size).fill('#')),stack=[[1,1]];
 board[1][1]='.';
 while(stack.length){const [c,r]=stack.at(-1),options=dirs.filter(([dx,dy])=>c+2*dx>0&&c+2*dx<size-1&&r+2*dy>0&&r+2*dy<size-1&&board[r+2*dy][c+2*dx]==='#');if(!options.length){stack.pop();continue}const [dx,dy]=options[Math.floor(random()*options.length)];board[r+dy][c+dx]='.';board[r+2*dy][c+2*dx]='.';stack.push([c+2*dx,r+2*dy])}
 for(let r=2;r<size-2;r++)for(let c=2;c<size-2;c++)if(board[r][c]==='#'&&((board[r][c-1]==='.'&&board[r][c+1]==='.')||(board[r-1][c]==='.'&&board[r+1][c]==='.'))&&random()<.27)board[r][c]='.';
 const open=(c,r)=>c>=0&&r>=0&&c<size&&r<size&&board[r][c]!== '#',key=(c,r)=>r*size+c;
 const powers=[key(1,1),key(15,1),key(1,15),key(15,15)],pellets=[];
 for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(open(c,r))pellets.push(key(c,r));
 const actor=(c,r,d=1)=>({c,r,nc:c,nr:r,p:0,d});
 const defaults={player:actor(1,1),ghosts:[{...actor(15,15),color:'red'},{...actor(15,1),color:'violet'}],collected:[],score:0,lives:3,power:0,pulses:3,freeze:0,grace:2,time:0,won:false,down:false,chain:0,eaten:0};
 let s=safeSaved(saved,defaults),collected=new Set(s.collected),queued=1,path=[],particles=[],flash='连通回路，收集全部信号',flashTime=2;
 s.player={...actor(1,1),...s.player};if(!open(s.player.c,s.player.r))s.player=actor(1,1);s.ghosts=defaults.ghosts.map((g,i)=>({...g,...s.ghosts?.[i]}));
 function route(from,to){const q=[[from.c,from.r]],prev=new Map([[key(from.c,from.r),null]]);for(let i=0;i<q.length;i++){const [c,r]=q[i];if(c===to.c&&r===to.r)break;for(const [dx,dy]of dirs){const nc=c+dx,nr=r+dy,k=key(nc,nr);if(open(nc,nr)&&!prev.has(k)){prev.set(k,key(c,r));q.push([nc,nr])}}}let cursor=key(to.c,to.r);if(!prev.has(cursor))return [];const out=[];while(prev.get(cursor)!==null){const c=cursor%size,r=Math.floor(cursor/size),before=prev.get(cursor),bc=before%size,br=Math.floor(before/size);out.push(dirs.findIndex(([dx,dy])=>c-bc===dx&&r-br===dy));cursor=before}return out.reverse()}
 function positions(a){return {x:a.c+(a.nc-a.c)*a.p,y:a.r+(a.nr-a.r)*a.p}}
 function burst(c,r,color){for(let i=0;i<12;i++){const a=i/12*Math.PI*2;particles.push({x:ox+(c+.5)*tile,y:oy+(r+.5)*tile,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:.5,color})}}
 function collect(){const p=s.player,k=key(p.c,p.r);if(collected.has(k))return;collected.add(k);s.score+=powers.includes(k)?100:10;if(powers.includes(k)){s.power=6;s.chain=0;s.pulses=Math.min(3,s.pulses+1);flash='强化信号 · 现在可以反追';flashTime=1.5;sfx('pickup');burst(p.c,p.r,'#8ff9e8')}else if(collected.size%7===0)sfx('cards');if(collected.size===pellets.length){s.won=true;s.score+=s.lives*500;flash='全部信号已接通';flashTime=8;notify('回路完成！追逐、路线选择与强化反追组成了单屏迷宫体验。');sfx('success')}}
 function pulse(){if(s.won||s.down||s.pulses===0)return;s.pulses--;s.freeze=3.2;flash='脉冲 · 追踪器停滞';flashTime=1.2;burst(s.player.c,s.player.r,'#ffcf74');sfx('build')}
 function advance(a,dt,duration,choose){if(a.p===0){const d=choose(a);if(d<0)return;const [dx,dy]=dirs[d];if(!open(a.c+dx,a.r+dy))return;a.d=d;a.nc=a.c+dx;a.nr=a.r+dy}a.p+=dt/duration;if(a.p>=1){a.c=a.nc;a.r=a.nr;a.p=0;if(a===s.player)collect()}}
 function retry(){s.lives=3;s.down=false;s.grace=2;s.player=actor(1,1);s.ghosts=structuredClone(defaults.ghosts);queued=1;path=[];flash='信号保留 · 继续这一巡回';flashTime=1.4}
 function replay(){s=structuredClone(defaults);collected=new Set();queued=1;path=[];particles=[];flash='新的回路';flashTime=1.4}
 function tick(dt){
  s.time+=dt;flashTime=Math.max(0,flashTime-dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  if(s.won||s.down)return;s.power=Math.max(0,s.power-dt);s.freeze=Math.max(0,s.freeze-dt);s.grace=Math.max(0,s.grace-dt);
  const codes=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'],wasd=['KeyW','KeyD','KeyS','KeyA'];
  for(let d=0;d<4;d++)if(input.pressed.has(codes[d])||input.pressed.has(wasd[d])||input.keys.has(codes[d])||input.keys.has(wasd[d])){queued=d;path=[]}
  if(input.pressed.has('KeyJ')||input.pressed.has('Space'))pulse();
  for(const point of input.pointers){const c=Math.floor((point.x-ox)/tile),r=Math.floor((point.y-oy)/tile);if(open(c,r)){const start=s.player.p>0?{c:s.player.nc,r:s.player.nr}:s.player;path=route(start,{c,r});queued=-1}}
  collect();advance(s.player,dt,.16,a=>{if(path.length)return path.shift();if(queued>=0){const [dx,dy]=dirs[queued];if(open(a.c+dx,a.r+dy))return queued}return a.d});
  if(s.freeze===0)for(let i=0;i<s.ghosts.length;i++)advance(s.ghosts[i],dt,s.power>0?.51:.40,a=>{
   if(s.power>0){const choices=dirs.map(([dx,dy],d)=>({d,c:a.c+dx,r:a.r+dy})).filter(p=>open(p.c,p.r));choices.sort((b,c)=>(Math.abs(c.c-s.player.c)+Math.abs(c.r-s.player.r))-(Math.abs(b.c-s.player.c)+Math.abs(b.r-s.player.r)));return choices[0]?.d??-1}
   const target=i===0?s.player:{c:s.player.nc,r:s.player.nr};return route(a,target)[0]??-1;
  });
  const p=positions(s.player);
  for(let i=0;i<s.ghosts.length;i++){const g=s.ghosts[i],gp=positions(g);if(Math.hypot(p.x-gp.x,p.y-gp.y)>.61)continue;
   if(s.power>0){s.chain++;s.eaten++;s.score+=200*s.chain;burst(g.c,g.r,'#cc8dff');s.ghosts[i]={...actor(i?15:15,i?1:15),color:g.color};s.freeze=Math.max(s.freeze,.8);flash='反追 +'+200*s.chain;flashTime=.75;sfx('success')}
   else if(s.grace===0){s.lives--;burst(s.player.c,s.player.r,'#ff877b');s.player=actor(1,1);queued=1;path=[];s.grace=2.2;s.ghosts=structuredClone(defaults.ghosts);s.down=s.lives<=0;flash=s.down?'巡回中断 · 信号仍保留':'碰撞 · 重新接入';flashTime=1.4;sfx('hurt');break}
  }
 }
 function draw(){
  ctx.fillStyle='#081325';ctx.fillRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#173653');bg.addColorStop(.5,'#0c142a');bg.addColorStop(1,'#32214a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.fillStyle='#060d1c';ctx.fillRect(ox-7,oy-7,524,524);ctx.strokeStyle='#3e9abc';ctx.lineWidth=2;ctx.strokeRect(ox-7,oy-7,524,524);
  for(let r=0;r<size;r++)for(let c=0;c<size;c++){
   const x=ox+c*tile,y=oy+r*tile,k=key(c,r);
   if(!open(c,r)){ctx.fillStyle='#213955';ctx.beginPath();ctx.roundRect(x+2,y+2,tile-4,tile-4,5);ctx.fill();ctx.strokeStyle='#438bb5';ctx.lineWidth=1.3;ctx.stroke();ctx.fillStyle='#82c7df23';ctx.fillRect(x+6,y+5,tile-12,3)}
   else if(!collected.has(k)){if(powers.includes(k)){glow(ctx,x+15,y+15,22,'#78f8e532');sprite(ctx,art.battery,x+15,y+27,25+Math.sin(s.time*4)*2)}else{ctx.fillStyle='#d9dfb8';ctx.beginPath();ctx.arc(x+15,y+15,2.7,0,Math.PI*2);ctx.fill()}}
  }
  for(const g of s.ghosts){const p=positions(g);if(s.power>0||s.freeze>0)glow(ctx,ox+(p.x+.5)*tile,oy+(p.y+.5)*tile,28,'#98e2ff5c');sprite(ctx,art[g.color],ox+(p.x+.5)*tile,oy+(p.y+1)*tile,29)}
  const p=positions(s.player);if(s.power>0)glow(ctx,ox+(p.x+.5)*tile,oy+(p.y+.5)*tile,36,'#72f9db65');ctx.globalAlpha=s.grace>0&&Math.floor(s.time*10)%2?.55:1;sprite(ctx,art[dirs[s.player.d][2]],ox+(p.x+.5)*tile,oy+(p.y+1)*tile,29);ctx.globalAlpha=1;
  for(const part of particles){ctx.fillStyle=part.color;ctx.globalAlpha=part.life*2;ctx.fillRect(part.x,part.y,3,3)}ctx.globalAlpha=1;
  label(ctx,'NEON CIRCUIT',151,99,'#8ce7ea',19);label(ctx,'霓虹回路',151,145,'#fff2c6',30);
  sprite(ctx,art.right,152,268,86);label(ctx,String(s.score).padStart(6,'0'),152,321,'#f6cf73',34);
  label(ctx,'剩余信号 '+(pellets.length-collected.size),152,375,'#d0e1ec',19);label(ctx,'生命 '+s.lives+'   脉冲 '+s.pulses,152,423,'#93eee1',18);
  label(ctx,s.power>0?'强化 '+s.power.toFixed(1)+' 秒':'方向键 / WASD 移动',968,210,'#a4e9e7',17);
  label(ctx,'J / 空格 · 脉冲停滞',968,265,'#f1d18a',16);label(ctx,'点走廊 · 规划路线',968,310,'#d1d9e6',16);
  sprite(ctx,art.portal,966,463,112);label(ctx,'收集 → 追逐 → 反追',966,518,'#b6c8da',16);
  if(flashTime>0)label(ctx,flash,560,39,'#b6f6e7',19);
  if(s.won||s.down){ctx.fillStyle='rgba(4,13,27,.91)';ctx.fillRect(340,220,440,208);label(ctx,s.won?'回路接通':'巡回中断',560,280,s.won?'#7ff5d4':'#ffb89d',30);label(ctx,s.score+' 分 · 反追 '+s.eaten+' 次',560,334,'#ffe29f',21);label(ctx,s.won?'下方可重新巡回':'下方可继续，已收集信号保留',560,384,'#c0d3e5',16)}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),collected:[...collected],board:board.map(r=>r.join('')),total:pellets.length,remaining:pellets.length-collected.size}),getStatus:()=>({goal:s.won?'全部信号已接通':s.down?'继续当前巡回':'在单屏迷宫中收集全部信号',message:'钻石提供 6 秒强化，能反追无人机。J 发出停滞脉冲；也可以点击走廊规划路线，角色会沿通路移动。',stats:['信号 '+collected.size+'/'+pellets.length,'得分 '+s.score,'生命 '+s.lives,'脉冲 '+s.pulses,'反追 '+s.eaten],actions:s.won?[action('重新巡回',replay)]:s.down?[action('继续当前巡回',retry),action('重新巡回',replay)]:[action('发出脉冲 J',pulse,s.pulses===0)]}),dispose(){particles=[];path=[]}};
}
