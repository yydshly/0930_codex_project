import {W,H,clamp,images,canvasSurface,cover,glow,label,action,safeSaved} from './showcase-core.js';

export const STEALTH_WALLS=[{x:225,y:126,w:156,h:157},{x:462,y:292,w:143,h:192},{x:643,y:106,w:169,h:177},{x:893,y:315,w:115,h:111}];
export const STEALTH_TERMINALS=[{x:445,y:122,name:'北侧终端'},{x:650,y:514,name:'南侧终端'},{x:951,y:120,name:'东侧终端'}];
const routes=[[[170,155],[430,155],[430,312],[170,312]],[[430,286],[626,286],[626,520],[430,520]],[[840,132],[1028,132],[1028,290],[840,290]]];
const defaults={version:1,time:0,phase:'play',x:127,y:523,angle:Math.PI/2,crouching:true,exposure:0,collected:[],guards:routes.map((route,i)=>({id:i,x:route[0][0],y:route[0][1],waypoint:1,angle:0,investigate:null,timer:0,seeing:false})),path:[],lures:2,noise:null,checkpoint:null,steps:0,hiddenTime:0,seenTime:0,interactions:0,distractions:0,won:false,score:0};
const blocked=(x,y,r=11)=>x<55+r||x>1070-r||y<62+r||y>573-r||STEALTH_WALLS.some(w=>x>w.x-r&&x<w.x+w.w+r&&y>w.y-r&&y<w.y+w.h+r);
export function stealthClear(a,b){
 const n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/6);for(let i=1;i<n;i++)if(STEALTH_WALLS.some(w=>{const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;return x>w.x&&x<w.x+w.w&&y>w.y&&y<w.y+w.h}))return false;return true;
}
function routeTo(x,y,target){
 const step=16,start=[Math.round(x/step),Math.round(y/step)],end=[Math.round(target.x/step),Math.round(target.y/step)],key=(c,r)=>c+','+r;
 if(blocked(end[0]*step,end[1]*step))return [];
 const queue=[start],previous=new Map([[key(...start),null]]);let found=false;
 for(let i=0;i<queue.length;i++){const [c,r]=queue[i];if(c===end[0]&&r===end[1]){found=true;break}for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,k=key(nc,nr);if(!previous.has(k)&&!blocked(nc*step,nr*step)){previous.set(k,[c,r]);queue.push([nc,nr])}}}
 if(!found)return [];const out=[];let q=end;while(previous.get(key(...q))){out.push({x:q[0]*step,y:q[1]*step});q=previous.get(key(...q))}return out.reverse();
}
export async function createStealth({host,input,saved,notify,sfx}){
 const [scene,art]=await Promise.all([images(['scene'],'assets/game-forms/stealth/'),images(['operative','crouch','patrol'],'assets/game-forms/action/')]);
 const {ctx,element}=canvasSurface(host);element.setAttribute('aria-label','夜庭潜行。点击通路自动绕开建筑，方向键移动，C切换蹲行，E读取近处终端，R投掷声响。');
 let s=safeSaved(saved,defaults),flash='',flashTime=0;
 function checkpoint(){return {x:s.x,y:s.y,collected:[...s.collected],lures:s.lures,interactions:s.interactions,distractions:s.distractions,steps:s.steps,time:s.time,score:s.score}}
 function interact(){if(s.phase!=='play')return;const terminal=STEALTH_TERMINALS.findIndex((t,i)=>!s.collected.includes(i)&&Math.hypot(t.x-s.x,t.y-s.y)<41);if(terminal>=0){s.collected.push(terminal);s.interactions++;s.score+=300;s.checkpoint=checkpoint();flash=STEALTH_TERMINALS[terminal].name+' · 读取完成';flashTime=1.5;sfx('pickup');return}if(Math.hypot(s.x-1020,s.y-535)<45){if(s.collected.length===3){s.won=true;s.phase='won';s.score+=Math.max(0,500-Math.round(s.seenTime*20));notify('三个终端已读取，成功从东侧离场。');sfx('success')}else notify('出口还需三个终端的通行信号。');return}notify('靠近发光终端或出口，再按 E。')}
 function crouch(){s.crouching=!s.crouching;flash=s.crouching?'蹲行 · 不产生脚步声':'快走 · 近处守卫会听到脚步';flashTime=1}
 function distract(){if(s.lures<=0||s.phase!=='play'){notify('声响道具已经用完。');return}const hover=input.hover,target=hover&&!blocked(hover.x,hover.y,2)?hover:{x:clamp(s.x+Math.sin(s.angle)*120,70,1050),y:clamp(s.y-Math.cos(s.angle)*120,80,550)};s.lures--;s.distractions++;s.noise={x:target.x,y:target.y,life:3};for(const g of s.guards)if(Math.hypot(g.x-target.x,g.y-target.y)<260&&stealthClear(g,target)){g.investigate={x:target.x,y:target.y};g.timer=4.5}flash='声响引开附近巡逻者';flashTime=1.3;sfx('turn')}
 function retry(){const cp=s.checkpoint;const distracts=s.distractions;s=structuredClone(defaults);if(cp){Object.assign(s,structuredClone(cp));s.checkpoint=structuredClone(cp)}s.distractions=Math.max(s.distractions,distracts);flash='回到最近的安全记录';flashTime=2}
 function restart(){s=structuredClone(defaults);flash='新的潜入路线';flashTime=1.5}
 function tick(dt){
  s.time+=dt;flashTime=Math.max(0,flashTime-dt);if(s.phase!=='play')return;
  if(input.pressed.has('KeyC'))crouch();if(input.pressed.has('KeyE')||input.pressed.has('Space'))interact();if(input.pressed.has('KeyR'))distract();
  for(const p of input.pointers){const path=routeTo(s.x,s.y,p);if(path.length)s.path=path;else if(Math.hypot(p.x-s.x,p.y-s.y)<41)interact();else{flash='建筑与外墙阻挡通路';flashTime=1}}
  let dx=input.x,dy=input.y;if(dx||dy)s.path=[];else if(s.path.length){const p=s.path[0],d=Math.hypot(p.x-s.x,p.y-s.y);if(d<3){s.path.shift()}else{dx=(p.x-s.x)/d;dy=(p.y-s.y)/d}}
  const moving=!!(dx||dy),speed=s.crouching?81:145,n=Math.hypot(dx,dy)||1,ox=s.x,oy=s.y;
  if(moving){s.angle=Math.atan2(dy,dx)+Math.PI/2;const nx=s.x+dx/n*speed*dt,ny=s.y+dy/n*speed*dt;if(!blocked(nx,s.y))s.x=nx;if(!blocked(s.x,ny))s.y=ny;s.steps+=Math.hypot(s.x-ox,s.y-oy)}
  if(s.noise){s.noise.life-=dt;if(s.noise.life<=0)s.noise=null}
  let seen=false,heard=false;
  for(const g of s.guards){
   g.timer=Math.max(0,g.timer-dt);if(g.timer===0)g.investigate=null;
   const target=g.investigate||{x:routes[g.id][g.waypoint][0],y:routes[g.id][g.waypoint][1]},gx=target.x-g.x,gy=target.y-g.y,d=Math.hypot(gx,gy);
   if(d>3){const distance=Math.min(d,(g.investigate?70:49)*dt);g.x+=gx/d*distance;g.y+=gy/d*distance;g.angle=Math.atan2(gy,gx)}else if(!g.investigate)g.waypoint=(g.waypoint+1)%routes[g.id].length;
   const px=s.x-g.x,py=s.y-g.y,r=Math.hypot(px,py),delta=Math.atan2(Math.sin(Math.atan2(py,px)-g.angle),Math.cos(Math.atan2(py,px)-g.angle)),range=s.crouching?135:172;
   g.seeing=r<range&&Math.abs(delta)<.54&&stealthClear(g,s);if(g.seeing){seen=true;s.seenTime+=dt}if(moving&&!s.crouching&&r<93&&stealthClear(g,s)){heard=true;if(!g.seeing){g.investigate={x:s.x,y:s.y};g.timer=1.8}}
  }
  if(seen)s.exposure=Math.min(1,s.exposure+dt*.88);else if(heard)s.exposure=Math.min(.8,s.exposure+dt*.35);else{s.exposure=Math.max(0,s.exposure-dt*.85);s.hiddenTime+=dt}
  if(s.exposure>=1){s.phase='caught';s.path=[];notify('巡逻者确认了你的位置，可以从最近已读取终端重试。');sfx('hurt')}
 }
 function actor(key,x,y,angle,height){const im=art[key],w=height*im.width/im.height;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.shadowColor='#000b';ctx.shadowBlur=5;ctx.drawImage(im,-w/2,-height/2,w,height);ctx.restore()}
 function draw(){
  cover(ctx,scene.scene);ctx.fillStyle='#020f1815';ctx.fillRect(0,0,W,H);
  for(const g of s.guards){const range=s.crouching?135:172;ctx.save();ctx.fillStyle=g.seeing?'#ff614a45':'#ffdd8225';ctx.strokeStyle=g.seeing?'#ff7869aa':'#ffe2a84a';ctx.beginPath();ctx.moveTo(g.x,g.y);for(let i=0;i<=30;i++){const a=g.angle-.54+i/30*1.08;let length=range;for(let r=8;r<=range;r+=8){const p={x:g.x+Math.cos(a)*r,y:g.y+Math.sin(a)*r};if(!stealthClear(g,p)){length=r-8;break}}ctx.lineTo(g.x+Math.cos(a)*length,g.y+Math.sin(a)*length)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();actor('patrol',g.x,g.y,g.angle+Math.PI/2,36);if(g.investigate)label(ctx,'?',g.x,g.y-26,'#f9e0a5',14)}
  if(s.path.length){ctx.strokeStyle='#7acac966';ctx.setLineDash([3,5]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x,s.y);for(const p of s.path)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([])}
  for(let i=0;i<STEALTH_TERMINALS.length;i++){const t=STEALTH_TERMINALS[i],done=s.collected.includes(i);glow(ctx,t.x,t.y,28,done?'#b8ff982d':'#63fcdf55');ctx.strokeStyle=done?'#b2e6a9':'#6ee5df';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(t.x,t.y,18,0,Math.PI*2);ctx.stroke();label(ctx,done?'✓':String(i+1),t.x,t.y-24,done?'#ccf4b0':'#aeede7',13)}
  if(s.noise){ctx.strokeStyle='#f0d5a2';ctx.beginPath();ctx.arc(s.noise.x,s.noise.y,13+(3-s.noise.life)*15,0,Math.PI*2);ctx.stroke()}
  glow(ctx,1020,535,35,s.collected.length===3?'#91ffe35a':'#dfba6329');label(ctx,'出口',1020,567,'#d8e3ba',14);actor(s.crouching?'crouch':'operative',s.x,s.y,s.angle,s.crouching?30:37);
  ctx.strokeStyle=s.exposure>.3?'#ff8e69':'#77e1d2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,21,0,Math.PI*2);ctx.stroke();if(s.exposure>0){ctx.strokeStyle='#ff786a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,25,-Math.PI/2,-Math.PI/2+s.exposure*Math.PI*2);ctx.stroke()}
  label(ctx,'夜庭潜行 · 终端 '+s.collected.length+'/3',249,38,'#bbe8dd',21);label(ctx,(s.crouching?'蹲行 · 安静':'快走 · 有脚步声')+'   声响 '+s.lures,838,38,'#ecdcac',16);
  label(ctx,'点通路绕行 · C 蹲行 / 快走 · E 读取近处终端 · R 向鼠标处投掷声响',560,607,'#b9d1d4',15);
  if(flashTime>0)label(ctx,flash,560,559,'#ffe3a5',18);
  if(s.phase!=='play'){ctx.fillStyle='#061821ed';ctx.fillRect(327,208,466,220);label(ctx,s.won?'三个信号 · 安全离场':'位置暴露 · 潜入中断',560,265,s.won?'#b8f6cf':'#ffc8a4',28);label(ctx,'终端 '+s.collected.length+'/3 · 被看见 '+s.seenTime.toFixed(1)+' 秒',560,329,'#deebd7',19);label(ctx,s.won?'下方可重新潜入':'下方从最近终端重试',560,390,'#b9d8d5',17)}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),walls:STEALTH_WALLS,terminals:STEALTH_TERMINALS,exit:{x:1020,y:535}}),getStatus:()=>({goal:s.won?'成功离场':s.phase==='caught'?'位置暴露，可重试':'读取三个终端，再抵达东侧出口',message:'点击通路会绕过建筑；蹲行不产生脚步声，快走更快但会惊动附近守卫。视野会被建筑截断，暴露圆环满后才会被确认。先把鼠标移到通路，再用 R 投掷声响。',stats:['终端 '+s.collected.length+'/3',s.crouching?'蹲行':'快走','暴露 '+Math.round(s.exposure*100)+'%','声响 '+s.lures,'被看见 '+s.seenTime.toFixed(1)+'秒'],actions:s.won?[action('重新潜入',restart)]:s.phase==='caught'?[action('从最近终端重试',retry),action('重新潜入',restart)]:[action(s.crouching?'切到快走 · C':'切到蹲行 · C',crouch),action('读取 / 离场 · E',interact),action('投掷声响 · R',distract,s.lures===0)]}),dispose(){s.path=[]}};
}
