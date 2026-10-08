import {W,H,clamp,images,canvasSurface,cover,glow,label,action,safeSaved} from './showcase-core.js';

export const PINBALL_BUMPERS=[{x:467,y:168,r:29},{x:648,y:168,r:29},{x:558,y:255,r:32}];
export const PINBALL_TARGETS=[{x:406,y:302,r:15},{x:705,y:303,r:15},{x:442,y:407,r:15},{x:674,y:407,r:15}];
const walls=[[[391,47],[766,47]],[[391,47],[349,479]],[[766,47],[792,600]],[[349,479],[423,520]],[[724,479],[695,520]],[[400,430],[466,478]],[[716,430],[654,478]],[[733,553],[733,165]],[[720,47],[766,95]]];
const defaults={version:1,phase:'ready',time:0,ball:{x:752,y:540,vx:0,vy:0,r:8},balls:3,score:0,best:0,charge:0,launched:0,bumperHits:0,flipperHits:0,wallHits:0,targetHits:0,lit:[false,false,false,false],leftAngle:.27,rightAngle:Math.PI-.27,nudges:3,tilt:0,savedFor:0,won:false};
function closest(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return {x:ax+dx*t,y:ay+dy*t,t}}
export async function createPinball({host,input,saved,notify,sfx}){
 const art=await images(['scene'],'assets/game-forms/pinball/'),{ctx,element}=canvasSurface(host);element.setAttribute('aria-label','星轨弹球。A或左键控制左挡板，D或右键控制右挡板，按住空格蓄力松开发球。触摸机台左半或右半控制对应挡板。');
 let s=safeSaved(saved,defaults),particles=[],trail=[],flash='',flashTime=0,lastSpace=false,pulseLeft=0,pulseRight=0,active=false;const holds=new Map(),controller=new AbortController();
 // Pointer buttons operate physical flippers while held, including two fingers.
 element.addEventListener('pointerdown',e=>{if(!active||s.phase!=='live')return;const r=element.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;holds.set(e.pointerId,x<560?'left':'right');element.setPointerCapture(e.pointerId)},{signal:controller.signal});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,e=>holds.delete(e.pointerId),{signal:controller.signal});
 function restart(){const best=Math.max(s.best,s.score);s=structuredClone(defaults);s.best=best;particles=[];trail=[];flash='新一台 · 三颗球';flashTime=1.5}
 function launch(){if(s.phase!=='ready')return;const power=.4+s.charge*.6;s.ball={x:752,y:540,vx:0,vy:-655-power*95,r:8};s.phase='live';s.charge=0;s.launched++;s.nudges=3;s.tilt=0;s.savedFor=3;trail=[];flash='球已发射 · 在回落时接球';flashTime=1.2;sfx('shot')}
 function nudge(){if(s.phase!=='live'||s.nudges<=0)return;s.nudges--;s.tilt=.28;s.ball.vx+=s.ball.x<560?45:-45;s.ball.vy-=60;flash='推台 · 剩余 '+s.nudges+' 次';flashTime=.65;sfx('turn')}
 function burst(x,y,color,count=13){for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;particles.push({x,y,vx:Math.cos(angle)*80,vy:Math.sin(angle)*80,life:.45,color})}}
 function addScore(points,x,y,color){s.score+=points;s.best=Math.max(s.best,s.score);burst(x,y,color);sfx('pickup');if(s.score>=1800&&!s.won){s.won=true;flash='1800 分达成 · 继续挑战最高分';flashTime=2;sfx('success')}}
 function collide(ax,ay,bx,by,radius,restitution,surface={x:0,y:0},kind='wall'){
  const b=s.ball,p=closest(b.x,b.y,ax,ay,bx,by),dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),limit=b.r+radius;if(d>=limit||d<.001)return false;
  const nx=dx/d,ny=dy/d;b.x=p.x+nx*(limit+.2);b.y=p.y+ny*(limit+.2);const relative=(b.vx-surface.x)*nx+(b.vy-surface.y)*ny;
  if(relative<0){b.vx-=(1+restitution)*relative*nx;b.vy-=(1+restitution)*relative*ny;if(kind==='flipper'){if(relative<-35){s.flipperHits++;burst(p.x,p.y,'#a7f8ee',6);sfx('cards')}}else if(relative<-10)s.wallHits++;return true}return false;
 }
 function flipper(left,dt,held){const key=left?'leftAngle':'rightAngle',pivot={x:left?455:662,y:552},target=left?(held?-.54:.27):(held?Math.PI+.54:Math.PI-.27),old=s[key],step=clamp(target-old,-17*dt,17*dt);s[key]+=step;const end={x:pivot.x+Math.cos(s[key])*91,y:pivot.y+Math.sin(s[key])*91},p=closest(s.ball.x,s.ball.y,pivot.x,pivot.y,end.x,end.y),omega=step/dt,surface={x:-omega*(p.y-pivot.y),y:omega*(p.x-pivot.x)};collide(pivot.x,pivot.y,end.x,end.y,9,.84,surface,'flipper')}
 function drained(){
  if(s.savedFor>0){s.ball={x:752,y:540,vx:0,vy:-710,r:8};s.savedFor=0;flash='开球保护 · 自动补发';flashTime=1;sfx('door');return}
  s.balls--;s.phase=s.balls>0?'ready':'ended';s.ball={x:752,y:540,vx:0,vy:0,r:8};s.charge=0;trail=[];sfx('hurt');flash=s.balls>0?'落袋 · 还有 '+s.balls+' 颗球':'三颗球结束 · '+s.score+' 分';flashTime=2;
 }
 function tick(dt){
  s.time+=dt;flashTime=Math.max(0,flashTime-dt);pulseLeft=Math.max(0,pulseLeft-dt);pulseRight=Math.max(0,pulseRight-dt);s.tilt=Math.max(0,s.tilt-dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  const space=input.keys.has('Space');if(s.phase==='ready'){if(space)s.charge=Math.min(1,s.charge+dt*.9);if(lastSpace&&!space)launch()}lastSpace=space;
  if(input.pressed.has('KeyE'))nudge();if(s.phase!=='live')return;
  const left=input.keys.has('KeyA')||input.keys.has('ArrowLeft')||pulseLeft>0||[...holds.values()].includes('left'),right=input.keys.has('KeyD')||input.keys.has('ArrowRight')||pulseRight>0||[...holds.values()].includes('right');
  s.savedFor=Math.max(0,s.savedFor-dt);const steps=Math.ceil(dt/.006),h=dt/steps;
  for(let i=0;i<steps;i++){
   const b=s.ball;b.vy+=395*h;b.vx*=Math.exp(-.055*h);b.vy*=Math.exp(-.055*h);b.x+=b.vx*h;b.y+=b.vy*h;
   for(const [a,z] of walls)collide(...a,...z,5,.84);
   for(const [index,bumper] of PINBALL_BUMPERS.entries()){
    const dx=b.x-bumper.x,dy=b.y-bumper.y,d=Math.hypot(dx,dy),limit=bumper.r+b.r;if(d<limit&&d>0){const nx=dx/d,ny=dy/d,approach=b.vx*nx+b.vy*ny;b.x=bumper.x+nx*(limit+.25);b.y=bumper.y+ny*(limit+.25);if(approach<0){const impulse=Math.max(125,-approach*1.84+100);b.vx+=nx*impulse;b.vy+=ny*impulse;s.bumperHits++;addScore(100,bumper.x,bumper.y,index===1?'#ffdc91':'#93f5ec')}}
   }
   for(const [index,t] of PINBALL_TARGETS.entries()){
    const dx=b.x-t.x,dy=b.y-t.y,d=Math.hypot(dx,dy);if(d<t.r+b.r&&d>0){const nx=dx/d,ny=dy/d,approach=b.vx*nx+b.vy*ny;b.x=t.x+nx*(t.r+b.r+.2);b.y=t.y+ny*(t.r+b.r+.2);if(approach<0){b.vx-=1.7*approach*nx;b.vy-=1.7*approach*ny;s.targetHits++;addScore(s.lit[index]?50:200,t.x,t.y,'#f9d495');s.lit[index]=true;if(s.lit.every(Boolean)){addScore(500,558,335,'#f7eba7');s.lit.fill(false);flash='四星连亮 · 额外 500 分';flashTime=1.5}}}
   }
   flipper(true,h,left);flipper(false,h,right);const speed=Math.hypot(b.vx,b.vy);if(speed>1250){b.vx*=1250/speed;b.vy*=1250/speed}if(b.y>620||b.x<310||b.x>807){drained();break}
  }
  if(s.phase==='live'){trail.push({x:s.ball.x,y:s.ball.y});if(trail.length>17)trail.shift()}
 }
 function metalLine(ax,ay,bx,by,width,color){ctx.lineCap='round';ctx.strokeStyle='#041a25';ctx.lineWidth=width+5;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();const gradient=ctx.createLinearGradient(ax,ay-width/2,ax,ay+width/2);gradient.addColorStop(0,'#fff0ce');gradient.addColorStop(.22,color);gradient.addColorStop(.7,'#746145');gradient.addColorStop(1,'#e8bd75');ctx.strokeStyle=gradient;ctx.lineWidth=width;ctx.stroke();ctx.strokeStyle='#f5e7c280';ctx.lineWidth=1;ctx.stroke()}
 function draw(){
  cover(ctx,art.scene);ctx.save();if(s.tilt>0)ctx.translate(Math.sin(s.time*90)*3,s.tilt*4);
  for(const [a,z] of walls)metalLine(...a,...z,8,'#b6bcae');
  for(let i=0;i<PINBALL_BUMPERS.length;i++){const t=PINBALL_BUMPERS[i];glow(ctx,t.x,t.y,t.r+22,i===1?'#e7b76b40':'#68ebef40');ctx.shadowColor='#000b';ctx.shadowBlur=7;const g=ctx.createRadialGradient(t.x-8,t.y-9,2,t.x,t.y,t.r);g.addColorStop(0,'#f7f1d6');g.addColorStop(.38,i===1?'#dfab53':'#73d8de');g.addColorStop(.68,'#233f4a');g.addColorStop(.86,'#dcb76a');g.addColorStop(1,'#6a4b25');ctx.fillStyle=g;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffe5ad';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#eff9e4';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('100',t.x,t.y+5)}
  for(let i=0;i<PINBALL_TARGETS.length;i++){const t=PINBALL_TARGETS[i];if(s.lit[i])glow(ctx,t.x,t.y,31,'#ffdc9866');ctx.fillStyle=s.lit[i]?'#ffdf8a':'#143543';ctx.strokeStyle='#d8b071';ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillStyle=s.lit[i]?'#684b22':'#d9c79c';ctx.fillText('✦',t.x,t.y+6)}
  metalLine(455,552,455+Math.cos(s.leftAngle)*91,552+Math.sin(s.leftAngle)*91,17,'#8eebde');metalLine(662,552,662+Math.cos(s.rightAngle)*91,552+Math.sin(s.rightAngle)*91,17,'#8eebde');
  ctx.fillStyle='#061b27';ctx.fillRect(738,557,28,50);ctx.strokeStyle='#cbaa62';ctx.lineWidth=2;ctx.strokeRect(738,557,28,50);metalLine(742,590,762,590,6,'#d5cab1');if(s.phase==='ready'){ctx.fillStyle='#7ce8df';ctx.fillRect(741,600-s.charge*35,22,s.charge*35)}
  ctx.lineWidth=3;for(let i=1;i<trail.length;i++){ctx.strokeStyle=`rgba(190,241,232,${i/trail.length*.45})`;ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke()}
  const b=s.ball,g=ctx.createRadialGradient(b.x-3,b.y-4,1,b.x,b.y,b.r);g.addColorStop(0,'#fff');g.addColorStop(.38,'#b7cbd1');g.addColorStop(.8,'#37545f');g.addColorStop(1,'#e1eef0');ctx.fillStyle=g;ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;for(const p of particles){ctx.globalAlpha=p.life/.45;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;ctx.restore();
  ctx.fillStyle='#061723df';ctx.fillRect(38,52,245,275);ctx.fillStyle='#eddfb5';ctx.font='bold 25px "Microsoft YaHei",sans-serif';ctx.textAlign='left';ctx.fillText('星轨弹球',61,92);ctx.font='bold 38px monospace';ctx.fillStyle='#a4f4e7';ctx.fillText(String(s.score).padStart(6,'0'),61,151);ctx.font='15px sans-serif';ctx.fillStyle='#c9d6d4';ctx.fillText('余球 '+s.balls+'   目标 1800 分',61,190);ctx.fillText('最高 '+s.best+'   弹击 '+s.bumperHits,61,222);ctx.fillText('点亮四星额外 +500',61,254);ctx.fillText('A / ← 左挡板',61,285);ctx.fillText('D / → 右挡板',61,309);
  label(ctx,s.phase==='ready'?'按住空格蓄力 · 松开发球':'回落时击球 · 按住左右半台操作挡板',560,604,'#eee0b8',14);
  if(flashTime>0)label(ctx,flash,560,363,'#fbebb8',18);
  if(s.phase==='ended'){ctx.fillStyle='#071a26ee';ctx.fillRect(365,282,393,161);label(ctx,'三颗球 · '+s.score+' 分',560,337,'#c6f4e2',27);label(ctx,s.won?'星轨挑战达成':'再试一次，找准回落时机',560,397,'#e2d5ad',17)}
 }
 return {tick,draw,setActive(value){active=value;if(!value){holds.clear();lastSpace=false}},getState:()=>({...structuredClone(s),bumpers:PINBALL_BUMPERS,targets:PINBALL_TARGETS,walls}),getStatus:()=>({goal:s.phase==='ended'?'三颗球结束 · '+s.score+' 分':'击打挡板 · 连亮四星 · 挑战 1800 分',message:'球受重力落下，挡板转动会改变反弹方向和力度。A/D 或左右键控制挡板，也可按住画面左半、右半；空格蓄力后松开发球，E 推台每球限三次。开球有三秒保护。',stats:['得分 '+s.score,'余球 '+s.balls,'弹击 '+s.bumperHits,'接球 '+s.flipperHits,'最高 '+s.best],actions:s.phase==='ended'?[action('再开一台',restart)]:[action('发球',launch,s.phase!=='ready'),action('左挡板',()=>{pulseLeft=.22}),action('右挡板',()=>{pulseRight=.22}),action('推台 · E',nudge,s.phase!=='live'||s.nudges===0)]}),dispose(){controller.abort();holds.clear();particles=[];trail=[]}};
}
