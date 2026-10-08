import {W,H,clamp,images,canvasSurface,action} from './showcase-core.js';
import {precisionPanel,pointerPosition,inscription,endCard} from './showcase-precision-kit.js';

export const PRISM_FIELD={left:82,right:1038,top:84,bottom:590},PRISM_PADDLE_Y=523,PRISM_RADIUS=10;
export function prismBricks(level=0){const bricks=[];for(let row=0;row<4;row++)for(let col=0;col<9;col++){if(level===1&&((row===0||row===3)&&(col===0||col===8)))continue;bricks.push({id:row*9+col,x:176+col*87,y:132+row*43,w:78,h:29,hp:level===1&&row===1?2:1,color:(row+col%3+level)%5})}return bricks}
export function prismFresh(){return {version:1,phase:'ready',level:0,bricks:prismBricks(),ball:{x:560,y:PRISM_PADDLE_Y-PRISM_RADIUS-4,vx:0,vy:0},paddle:560,target:560,lives:3,score:0,cleared:0,combo:0,maxCombo:0,elapsed:0,expanded:0,capsules:[],easy:true,won:false,message:'拖动或移动指针控制挡板，按发球。接球的位置决定反弹方向；每清掉六块，会落下扩展挡板奖励。'}}
export function prismRestore(raw){
 const f=prismFresh();if(!raw||raw.version!==1||!['ready','playing','won','lost'].includes(raw.phase)||![0,1].includes(raw.level)||!Array.isArray(raw.bricks)||raw.bricks.length>36||!Array.isArray(raw.capsules)||raw.capsules.length>8||typeof raw.easy!=='boolean')return f;
 const s=structuredClone(raw),layout=prismBricks(s.level);
 if(!s.bricks.every(b=>{const original=layout.find(v=>v.id===b.id);return original&&b.x===original.x&&b.y===original.y&&b.w===original.w&&b.h===original.h&&b.color===original.color&&Number.isInteger(b.hp)&&b.hp>=1&&b.hp<=original.hp})||new Set(s.bricks.map(b=>b.id)).size!==s.bricks.length)return f;
 if(!s.ball||!['x','y','vx','vy'].every(k=>Number.isFinite(s.ball[k]))||s.ball.x<40||s.ball.x>1080||s.ball.y<45||s.ball.y>650||Math.abs(s.ball.vx)>800||Math.abs(s.ball.vy)>800)return f;
 if(!['paddle','target','lives','score','cleared','combo','maxCombo','elapsed','expanded'].every(k=>Number.isFinite(s[k]))||s.paddle<82||s.paddle>1038||s.target<82||s.target>1038||s.lives<0||s.lives>3||s.score<0||s.elapsed<0||s.expanded<0||s.expanded>18||s.phase==='won'&&s.bricks.length||['playing','ready'].includes(s.phase)&&(!s.bricks.length||s.lives===0)||s.phase==='lost'&&s.lives!==0)return f;
 if(!s.capsules.every(p=>p&&['x','y','age'].every(k=>Number.isFinite(p[k]))&&p.x>40&&p.x<1080&&p.y>40&&p.y<650&&p.age>=0&&p.age<6))return f;
 s.won=s.phase==='won';s.message=typeof s.message==='string'?s.message.slice(0,240):f.message;return s;
}
export function prismWidth(s){return s.expanded>0?236:s.easy?188:148}
export function prismLaunch(s){if(s.phase!=='ready')return false;s.ball={x:s.paddle,y:PRISM_PADDLE_Y-PRISM_RADIUS-4,vx:100,vy:-(s.easy?290:345)};s.phase='playing';s.combo=0;s.message='看回落路线 · 挡板中心稳住，上沿两侧可以改变球的方向。';return true}
export function prismSetTarget(s,x){if(Number.isFinite(x)&&['ready','playing'].includes(s.phase))s.target=clamp(x,PRISM_FIELD.left+prismWidth(s)/2,PRISM_FIELD.right-prismWidth(s)/2)}
export function prismStep(s,dt){
 const events=[];if(!['ready','playing'].includes(s.phase))return events;dt=clamp(dt,0,.05);s.elapsed+=dt;s.expanded=Math.max(0,s.expanded-dt);prismSetTarget(s,s.target);
 s.paddle+=clamp(s.target-s.paddle,-1100*dt,1100*dt);s.paddle=clamp(s.paddle,PRISM_FIELD.left+prismWidth(s)/2,PRISM_FIELD.right-prismWidth(s)/2);
 if(s.phase==='ready'){s.ball.x=s.paddle;s.ball.y=PRISM_PADDLE_Y-PRISM_RADIUS-4;return events}
 const b=s.ball,steps=Math.max(1,Math.ceil(dt/.0025)),h=dt/steps,r=PRISM_RADIUS;
 for(let k=0;k<steps;k++){
  const px=b.x,py=b.y;b.x+=b.vx*h;b.y+=b.vy*h;
  if(b.x<PRISM_FIELD.left+r){b.x=PRISM_FIELD.left+r;b.vx=Math.abs(b.vx);events.push({type:'wall'})}if(b.x>PRISM_FIELD.right-r){b.x=PRISM_FIELD.right-r;b.vx=-Math.abs(b.vx);events.push({type:'wall'})}if(b.y<PRISM_FIELD.top+r){b.y=PRISM_FIELD.top+r;b.vy=Math.abs(b.vy);events.push({type:'wall'})}
  if(b.vy>0&&py+r<=PRISM_PADDLE_Y+1&&b.y+r>=PRISM_PADDLE_Y&&Math.abs(b.x-s.paddle)<prismWidth(s)/2+r){const rel=clamp((b.x-s.paddle)/(prismWidth(s)/2),-.94,.94),speed=clamp(Math.hypot(b.vx,b.vy)+4,s.easy?305:370,s.easy?470:570);b.x=clamp(b.x,PRISM_FIELD.left+r,PRISM_FIELD.right-r);b.y=PRISM_PADDLE_Y-r-.1;b.vx=Math.sin(rel*1.12)*speed;b.vy=-Math.cos(rel*1.12)*speed;s.combo=0;events.push({type:'paddle',x:b.x,y:b.y})}
  let hit=null;for(const brick of s.bricks){const x=clamp(b.x,brick.x,brick.x+brick.w),y=clamp(b.y,brick.y,brick.y+brick.h);if(Math.hypot(b.x-x,b.y-y)<r){hit=brick;break}}
  if(hit){const t=hit;if(px<=t.x-r||px>=t.x+t.w+r){b.vx=-b.vx;b.x=px<=t.x-r?t.x-r-.1:t.x+t.w+r+.1}else{b.vy=-b.vy;b.y=py<t.y+t.h/2?t.y-r-.1:t.y+t.h+r+.1}t.hp--;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.score+=t.hp?30:100+Math.min(s.combo,8)*15;events.push({type:t.hp?'chip':'brick',x:t.x+t.w/2,y:t.y+t.h/2,color:t.color});if(t.hp===0){s.bricks=s.bricks.filter(v=>v!==t);s.cleared++;if(s.cleared%6===0&&s.capsules.length<8)s.capsules.push({x:t.x+t.w/2,y:t.y+t.h/2,age:0});s.message='琉璃碎开 · 连续命中 '+s.combo+'，还有 '+s.bricks.length+' 块。'}
   if(!s.bricks.length){s.capsules=[];s.expanded=0;if(s.level===0){s.level=1;s.bricks=prismBricks(1);s.phase='ready';s.ball={x:s.paddle,y:PRISM_PADDLE_Y-r-4,vx:0,vy:0};s.message='第一幕完成 · 第二幕有双层琉璃，按发球继续。';events.push({type:'level'})}else{s.phase='won';s.won=true;s.ball.vx=s.ball.vy=0;s.message='两幕琉璃星阵全部点亮 · '+s.score+' 分。';events.push({type:'won'})}break}}
  if(b.y>PRISM_FIELD.bottom){s.lives--;s.combo=0;s.expanded=0;s.capsules=[];s.ball={x:s.paddle,y:PRISM_PADDLE_Y-r-4,vx:0,vy:0};s.phase=s.lives>0?'ready':'lost';s.message=s.lives?'掉了一球 · 余下 '+s.lives+' 次发球，砖阵进度保留。':'这一局结束 · 已点亮 '+s.cleared+' 块，'+s.score+' 分。';events.push({type:'miss'});break}
 }
 if(s.phase==='playing'){for(const c of s.capsules){c.age+=dt;c.y+=128*dt;if(Math.abs(c.y-PRISM_PADDLE_Y)<16&&Math.abs(c.x-s.paddle)<prismWidth(s)/2+13){c.age=9;s.expanded=18;s.message='接住星徽 · 挡板扩展 18 秒。';events.push({type:'bonus'})}}s.capsules=s.capsules.filter(c=>c.age<6&&c.y<575)}return events;
}

export async function createPrism({host,input,saved,notify=()=>{},sfx=()=>{}}){
 const art=await images(['field','brick','paddle'],'assets/game-forms/prism/'),{element,ctx}=canvasSurface(host),abort=new AbortController();let s=prismRestore(saved),active=false,particles=[],trail=[],pulse=0;
 const ui=precisionPanel(host,'<div class="precision-readout"><span class="prism-state"></span><small>拖动挡板 · 两侧接球改变角度</small></div><div class="precision-buttons"><button type="button" class="prism-left" aria-label="向左移动挡板">←</button><button type="button" class="prism-right" aria-label="向右移动挡板">→</button><button type="button" class="prism-easy">轻松模式</button><button type="button" class="primary prism-launch">发球 · 空格</button></div>');
 const launchButton=ui.panel.querySelector('.prism-launch'),easyButton=ui.panel.querySelector('.prism-easy'),readout=ui.panel.querySelector('.prism-state'),leftButton=ui.panel.querySelector('.prism-left'),rightButton=ui.panel.querySelector('.prism-right');
 element.setAttribute('aria-label','琉璃星阵打砖块。移动鼠标或拖动画面控制挡板，点击或空格发球。接球位置决定方向，接住星徽可扩展挡板。');element.style.touchAction='none';
 function sync(){launchButton.disabled=!active||s.phase!=='ready';easyButton.disabled=!active||!['ready','playing'].includes(s.phase);leftButton.disabled=rightButton.disabled=!active||!['ready','playing'].includes(s.phase);easyButton.textContent=s.easy?'轻松模式':'标准模式';easyButton.setAttribute('aria-pressed',String(s.easy));readout.textContent='第 '+(s.level+1)+' 幕 · 余下 '+s.bricks.length+' 块 · '+s.lives+' 球'+(s.expanded>0?' · 扩展 '+Math.ceil(s.expanded)+'s':'')}
 function launch(){if(active&&prismLaunch(s)){sfx('jump');sync()}}
 function pointer(e){if(active){prismSetTarget(s,pointerPosition(element,e).x);if(e.type==='pointerdown')element.setPointerCapture(e.pointerId)}}
 element.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||e.buttons)pointer(e)},{signal:abort.signal});element.addEventListener('pointerdown',pointer,{signal:abort.signal});
 for(const [button,key] of [[leftButton,'ArrowLeft'],[rightButton,'ArrowRight']]){button.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();input.keys.add(key);button.setPointerCapture(e.pointerId)},{signal:abort.signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>input.keys.delete(key),{signal:abort.signal})}
 launchButton.onclick=launch;easyButton.onclick=()=>{if(active&&['ready','playing'].includes(s.phase)){s.easy=!s.easy;prismSetTarget(s,s.target);sync()}};
 function restart(){s=prismFresh();particles=[];trail=[];sync()}
 function tick(dt){if(!active)return;dt=clamp(dt,0,.05);if(input.x)prismSetTarget(s,s.target+input.x*750*dt);if(input.pressed.has('Space')||input.pointers.length)launch();for(const e of prismStep(s,dt)){if(['brick','chip'].includes(e.type)){for(let i=0;i<10;i++)particles.push({x:e.x,y:e.y,vx:Math.cos(i*2.4)*70,vy:Math.sin(i*2.4)*70,c:e.color,age:0});sfx('pickup')}else if(e.type==='paddle'){pulse=.22;sfx('turn')}else if(e.type==='bonus')sfx('success');else if(e.type==='miss')sfx('hurt');else if(['won','level'].includes(e.type)){notify(s.message);sfx('success')}}if(s.phase==='playing'){trail.push({x:s.ball.x,y:s.ball.y});trail=trail.slice(-12)}else trail=[];particles.forEach(p=>{p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt});particles=particles.filter(p=>p.age<.55);pulse=Math.max(0,pulse-dt);sync()}
 const hues=[0,50,115,190,290],colors=['#92eef0','#ada1fa','#f9a4bc','#f3d892','#aee2b2'];
 function glass(im,x,y,w,h,type='brick'){ctx.save();ctx.shadowColor='#040d16';ctx.shadowBlur=10;ctx.shadowOffsetY=5;if(type==='brick')ctx.drawImage(im,45,108,2081,485,x,y,w,h);else ctx.drawImage(im,0,193,2172,346,x,y,w,h);ctx.restore()}
 function draw(){
  ctx.drawImage(art.field,0,0,W,H);inscription(ctx,'琉璃星阵','挡板反弹 · 第 '+(s.level+1)+' 幕');
  for(const t of s.bricks){ctx.save();ctx.filter='hue-rotate('+hues[t.color]+'deg)';glass(art.brick,t.x,t.y,t.w,t.h);ctx.restore();if(t.hp===2){ctx.strokeStyle='#f8dda6';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(t.x+7,t.y+7);ctx.lineTo(t.x+t.w-7,t.y+7);ctx.stroke();ctx.fillStyle='#f5deb0';ctx.beginPath();ctx.arc(t.x+t.w/2,t.y+t.h/2,2.5,0,Math.PI*2);ctx.fill()}}
  for(let i=0;i<trail.length;i++){ctx.fillStyle='rgba(153,235,236,'+(i/trail.length*.27)+')';ctx.beginPath();ctx.arc(trail[i].x,trail[i].y,PRISM_RADIUS*(i/trail.length),0,Math.PI*2);ctx.fill()}
  for(const p of particles){ctx.save();ctx.globalAlpha=1-p.age/.55;ctx.fillStyle=colors[p.c];ctx.translate(p.x,p.y);ctx.rotate(p.age*5);ctx.fillRect(-2,-4,4,8);ctx.restore()}
  for(const c of s.capsules){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.age);ctx.shadowColor='#6af0f2';ctx.shadowBlur=14;ctx.fillStyle='#84e0de';ctx.strokeStyle='#eecf83';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(13,0);ctx.lineTo(0,13);ctx.lineTo(-13,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  const pw=prismWidth(s);glass(art.paddle,s.paddle-pw/2,PRISM_PADDLE_Y,pw,29,'paddle');if(pulse){ctx.save();ctx.globalAlpha=pulse*2;ctx.fillStyle='#bdfaff';ctx.beginPath();ctx.roundRect(s.paddle-pw/2,PRISM_PADDLE_Y-2,pw,6,4);ctx.fill();ctx.restore()}
  const {x,y}=s.ball;ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#99ffff';const g=ctx.createRadialGradient(x-3,y-4,1,x,y,PRISM_RADIUS);g.addColorStop(0,'#fffef0');g.addColorStop(.4,'#c5faf5');g.addColorStop(1,'#4b959d');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,PRISM_RADIUS,0,Math.PI*2);ctx.fill();ctx.restore();
  if(s.phase==='ready'){ctx.save();ctx.strokeStyle='#8bdade8a';ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+38,y-132);ctx.stroke();ctx.restore()}
  ctx.save();ctx.font='600 16px "Microsoft YaHei",sans-serif';ctx.fillStyle='#e6d1a0';ctx.textAlign='right';ctx.fillText(s.score.toLocaleString()+' 分  ·  '+s.lives+' 球',1035,40);ctx.restore();
  if(s.phase==='won')endCard(ctx,'两幕星阵，全部点亮',s.score+' 分 · 最高连续命中 '+s.maxCombo);
  if(s.phase==='lost')endCard(ctx,'光还留在这里',s.score+' 分 · 点亮 '+s.cleared+' 块琉璃');
 }
 sync();return {tick,draw,onStart(){active=true;sync()},setActive(v){active=!!v;if(!active){input.keys.delete('ArrowLeft');input.keys.delete('ArrowRight')}sync()},getState:()=>structuredClone(s),getStatus:()=>({goal:s.won?'两幕琉璃星阵已全部点亮':s.phase==='lost'?'本局已结束':'接住回落的球，清掉两幕琉璃砖阵',message:s.message,stats:['第 '+(s.level+1)+' 幕','点亮 '+s.cleared+' 块','得分 '+s.score,'余下 '+s.lives+' 球'],actions:[action('重新开启星阵',restart,!active)]}),command(name,value){if(name==='target'&&Number.isFinite(value)){prismSetTarget(s,value);return true}if(name==='launch'){const phase=s.phase;launch();return phase!==s.phase}return false},dispose(){abort.abort();ui.dispose();input.keys.delete('ArrowLeft');input.keys.delete('ArrowRight');particles=[];trail=[]}};
}
