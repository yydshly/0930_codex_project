import {W,H,clamp,canvasSurface,images,sprite,shadow,glow,label,action,safeSaved} from './showcase-core.js';

const FLOOR=467,END=3360;
const initialEnemies=()=>[
 {id:'sentry-1',kind:'turret',x:560,y:FLOOR,hp:4,max:4,timer:1.7},
 {id:'patrol-1',kind:'drone',x:820,y:366,hp:3,max:3,timer:2.2},
 {id:'sentry-2',kind:'turret',x:1500,y:FLOOR,hp:4,max:4,timer:1.8},
 {id:'patrol-2',kind:'drone',x:1805,y:340,hp:3,max:3,timer:2.4},
 {id:'sentry-3',kind:'turret',x:2410,y:FLOOR,hp:4,max:4,timer:1.9},
 {id:'guardian',kind:'boss',x:2960,y:FLOOR,hp:24,max:24,timer:2.1}
];
const defaults={x:100,y:FLOOR,vy:0,hp:6,facing:1,elapsed:0,checkpoint:100,weapon:'pulse',pickups:[],enemies:initialEnemies(),shots:0,hits:0,kills:0,retries:0,won:false,phase:'active',shield:0};
const platforms=[{x:720,y:366,w:180},{x:1710,y:340,w:190},{x:2150,y:393,w:180}];

export async function createRunAndGun({host,input,saved,notify,sfx}){
 const art=await images(['harbor','reactor','idle','run-a','run-b','jump','crouch','drone','turret','boss','crate','power','platform','shield'],'assets/game-forms/breach/');
 const {element,ctx}=canvasSurface(host),s=safeSaved(saved,defaults);
 s.enemies=initialEnemies().map(e=>({...e,...s.enemies?.find(p=>p.id===e.id)}));s.pickups=Array.isArray(s.pickups)?s.pickups:[];
 let camera=clamp(s.x-300,0,END-W),ground=s.y>=FLOOR,invulnerable=0,cooldown=0,jumpBuffer=0,coyote=0,flash=0,shake=0,gunActive=0,lastMouse=null;
 const bullets=[],hostile=[],particles=[];
 const crouched=()=>ground&&(input.keys.has('KeyS')||input.keys.has('ArrowDown'));
 const aim=()=>{
  const up=input.keys.has('KeyW')||input.keys.has('ArrowUp');
  if(up){const x=input.x;return x?{x:x/Math.SQRT2,y:-1/Math.SQRT2}:{x:0,y:-1}}
  if(lastMouse){const x=lastMouse.x+camera-s.x,y=lastMouse.y-(s.y-(crouched()?25:51)),len=Math.hypot(x,y);if(len>15)return {x:x/len,y:y/len}}
  return {x:s.facing,y:0};
 };
 function sparks(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=60+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.18+Math.random()*.38,color})}}
 function shoot(){if(s.won||s.phase==='down'||cooldown>0)return;const dir=aim(),base=Math.atan2(dir.y,dir.x);s.facing=dir.x<-.05?-1:dir.x>.05?1:s.facing;for(const angle of s.weapon==='spread'?[-.15,0,.15]:[0]){const a=base+angle;bullets.push({x:s.x+dir.x*30,y:s.y-(crouched()?25:51)+dir.y*22,vx:Math.cos(a)*940,vy:Math.sin(a)*940,life:1.15})}s.shots++;cooldown=s.weapon==='spread'?.19:.13;gunActive=.08;sfx('shot')}
 function jump(){if(s.won||s.phase==='down')return;jumpBuffer=.13}
 function retry(){if(s.phase!=='down')return;s.x=s.checkpoint;s.y=FLOOR;s.vy=0;s.hp=6;s.phase='active';s.retries++;s.shield=0;ground=true;invulnerable=2;bullets.length=hostile.length=0;camera=clamp(s.x-300,0,END-W);notify('已返回检查点，武器与已经击退的守卫保留。')}
 function hurt(){if(invulnerable>0||s.phase==='down'||s.won)return;if(s.shield>0){s.shield=0;invulnerable=.7;sparks(s.x,s.y-50,'#ffc56c');return}s.hp--;invulnerable=1.05;flash=.17;shake=.22;sfx('hurt');if(s.hp<=0){s.phase='down';s.vy=0;notify('这一段中断了。返回检查点，再试一次。')}}
 function hitEnemy(e,b){e.hp=Math.max(0,e.hp-1);s.hits++;sparks(b.x,b.y,'#f3bf6f',7);shake=.055;if(!e.hp){s.kills++;sparks(e.x,e.y-40,'#ffe0a3',28);sfx(e.kind==='boss'?'success':'pickup')}}
 const foeX=e=>e.kind==='drone'?e.x+Math.sin(s.elapsed*1.4+e.x)*48:e.x;
 const foeHeight=e=>e.kind==='boss'?152:e.kind==='turret'?83:64;
 function tick(dt){
  s.elapsed+=dt;invulnerable=Math.max(0,invulnerable-dt);cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt);gunActive=Math.max(0,gunActive-dt);
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  if(s.won||s.phase==='down')return;
  if(input.x){s.facing=Math.sign(input.x);lastMouse=null}
  if(input.pressed.has('Space'))jump();jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=ground?.09:Math.max(0,coyote-dt);
  if(jumpBuffer>0&&coyote>0){s.vy=-605;ground=false;coyote=jumpBuffer=0;sfx('jump')}
  const previous=s.y;s.x=clamp(s.x+input.x*(crouched()?100:255)*dt,30,END-45);s.vy+=1450*dt;s.y+=s.vy*dt;ground=false;
  if(s.y>=FLOOR){s.y=FLOOR;s.vy=0;ground=true}
  for(const p of platforms)if(s.x+18>p.x&&s.x-18<p.x+p.w&&previous<=p.y+2&&s.y>=p.y&&s.vy>=0){s.y=p.y;s.vy=0;ground=true;break}
  if(input.pointers.length){lastMouse=input.pointers.at(-1);shoot()}
  if(input.keys.has('KeyJ'))shoot();
  if(s.x>1190&&s.checkpoint===100){s.checkpoint=1230;sfx('pickup');notify('动力站入口已留下检查点。')}
  for(const [id,x] of [['power',1150],['shield',2240]])if(!s.pickups.includes(id)&&Math.hypot(s.x-x,s.y-(FLOOR-8))<52){s.pickups.push(id);if(id==='power'){s.weapon='spread';notify('散射模块已接入，每次射击发出三束脉冲。')}else{s.shield=1;notify('护盾可吸收下一次命中。')}sfx('pickup')}
  for(const e of s.enemies){if(!e.hp||Math.abs(foeX(e)-s.x)>820)continue;e.timer-=dt;if(e.timer<=0){const x=foeX(e),y=e.y-(e.kind==='boss'?88:e.kind==='turret'?53:31),dx=s.x-x,dy=s.y-(crouched()?25:51)-y,a=Math.atan2(dy,dx);for(const offset of e.kind==='boss'?[-.16,0,.16]:[0])hostile.push({x,y,vx:Math.cos(a+offset)*235,vy:Math.sin(a+offset)*235,life:4.5});e.timer=e.kind==='boss'?1.5:e.kind==='turret'?1.9:2.5;sfx('shot')}
   if(Math.abs(foeX(e)-s.x)<(e.kind==='boss'?58:32)&&s.y>e.y-foeHeight(e)&&s.y-65<e.y)hurt();
  }
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;for(const e of s.enemies){if(!e.hp)continue;const h=foeHeight(e),width=e.kind==='boss'?65:32;if(Math.abs(b.x-foeX(e))<width&&b.y>e.y-h&&b.y<e.y){hitEnemy(e,b);hit=true;break}}if(hit||b.life<=0||b.y<0||b.y>FLOOR+12)bullets.splice(i,1)}
  for(let i=hostile.length-1;i>=0;i--){const b=hostile[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;const h=crouched()?32:72;if(Math.abs(b.x-s.x)<17&&b.y>s.y-h&&b.y<s.y){hurt();hostile.splice(i,1)}else if(b.life<=0)hostile.splice(i,1)}
  const boss=s.enemies.find(e=>e.kind==='boss');if(s.x>END-100){if(boss.hp>0){s.x=END-100;notify('出口仍被守卫控制，击退它再离站。')}else{s.won=true;sfx('success')}}
  camera+=(clamp(s.x-300,0,END-W)-camera)*Math.min(1,dt*7);
 }
 function draw(){
  ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*5,(Math.random()-.5)*3);
  for(let i=0;i<3;i++){const x=i*W-camera;if(x>-W&&x<W){const image=i===1?art.reactor:art.harbor,floorFraction=i===1?.791:.751,dh=(H-FLOOR)/(1-floorFraction),dw=dh*image.width/image.height;ctx.save();ctx.beginPath();ctx.rect(x,0,W,H);ctx.clip();ctx.drawImage(image,x+(W-dw)/2,H-dh,dw,dh);ctx.restore()}}
  ctx.save();ctx.translate(-camera,0);
  for(const p of platforms)ctx.drawImage(art.platform,p.x,p.y-7,p.w,44);
  for(const x of [340,1310,1860,2730])sprite(ctx,art.crate,x,FLOOR,48);
  for(const [id,x] of [['power',1150],['shield',2240]])if(!s.pickups.includes(id)){glow(ctx,x,FLOOR-33,50,id==='power'?'#42cbd54b':'#ffc7754b');sprite(ctx,art[id],x,FLOOR-5+Math.sin(s.elapsed*3)*4,47)}
  for(const e of s.enemies){if(!e.hp)continue;const x=foeX(e),h=foeHeight(e);shadow(ctx,x,e.y,e.kind==='boss'?40:24);sprite(ctx,art[e.kind],x,e.y,h,x<s.x);if(e.timer<.45){glow(ctx,x,e.y-h*.63,e.kind==='boss'?76:40,'#ef513933')}
   if(e.hp<e.max){ctx.fillStyle='#121b27';ctx.fillRect(x-28,e.y-h-15,56,4);ctx.fillStyle=e.kind==='boss'?'#ee8764':'#e9b07c';ctx.fillRect(x-28,e.y-h-15,56*e.hp/e.max,4)}
  }
  for(const b of bullets){ctx.strokeStyle='#8df6ec';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.016,b.y-b.vy*.016);ctx.lineTo(b.x,b.y);ctx.stroke()}
  for(const b of hostile){glow(ctx,b.x,b.y,17,'#ff7e5459');ctx.fillStyle='#ffb186';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}
  shadow(ctx,s.x,s.y,23);const key=crouched()?'crouch':!ground?'jump':input.x?(Math.floor(s.elapsed*9)%2?'run-a':'run-b'):'idle';sprite(ctx,art[key],s.x,s.y,crouched()?57:91,s.facing<0,invulnerable>0&&Math.floor(s.elapsed*14)%2?.45:1);
  if(gunActive>0){const dir=aim();glow(ctx,s.x+dir.x*39,s.y-(crouched()?25:51)+dir.y*28,29,'#b8ffeeb0')}
  if(s.shield){ctx.strokeStyle='#eec68099';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,s.y-43,34,53,0,0,Math.PI*2);ctx.stroke()}
  for(const p of particles){ctx.globalAlpha=clamp(p.life*3,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
  label(ctx,'出口',END-55,FLOOR-108,'#bce8d9',14);ctx.restore();
  const gradient=ctx.createLinearGradient(0,0,0,145);gradient.addColorStop(0,'#091522de');gradient.addColorStop(1,'#09152200');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,145);
  ctx.fillStyle='#ecede1';ctx.font='bold 17px "Microsoft YaHei",sans-serif';ctx.fillText('潮汐突围 / RUN & GUN',30,39);ctx.font='12px "Microsoft YaHei",sans-serif';ctx.fillStyle='#a0b9c4';ctx.fillText(s.x<W?'01  港区栈桥':s.x<W*2?'02  动力站':'03  守卫出口',30,61);
  for(let i=0;i<6;i++){ctx.fillStyle=i<s.hp?'#dbb48b':'#364555';ctx.fillRect(W-170+i*22,28,14,9)}
  ctx.fillStyle='#92e7de';ctx.font='12px "Microsoft YaHei",sans-serif';ctx.textAlign='right';ctx.fillText(s.weapon==='spread'?'散射脉冲 / SPREAD':'单束脉冲 / PULSE',W-40,62);ctx.textAlign='left';
  const boss=s.enemies.find(e=>e.kind==='boss');if(s.x>2530&&boss.hp){ctx.fillStyle='#071320d9';ctx.fillRect(300,35,520,26);ctx.fillStyle='#d56f53';ctx.fillRect(312,45,496*boss.hp/boss.max,5);ctx.fillStyle='#e8baa8';ctx.font='11px sans-serif';ctx.fillText('出口守卫',313,34)}
  if(flash>0){ctx.fillStyle='#dd5c4c22';ctx.fillRect(0,0,W,H)}
  if(s.phase==='down'||s.won){ctx.fillStyle='#08121ecc';ctx.fillRect(0,0,W,H);label(ctx,s.won?'栈桥已经贯通':'返回检查点，再试一次',W/2,H/2,'#f0d7b2',26)}ctx.restore();
 }
 return {element,getState:()=>s,tick,draw,command(id){if(id==='fire')shoot();if(id==='jump')jump();if(id==='retry')retry()},getStatus:()=>({goal:s.won?'横版跑射样板完成':s.phase==='down'?'返回检查点':'向右突围，击退出口守卫',message:s.won?'跳跃帮助你躲过弹幕，持续射击和方向瞄准帮助你打开通路。':s.phase==='down'?'已取得武器与已击退目标保留，使用下方按钮返回。':'按住 J 连续射击；↑ 向上，移动 + ↑ 斜向射击。点画面也可朝该处射击。',stats:['生命 '+s.hp+' / 6','击退 '+s.kills+' / 6',s.weapon==='spread'?'三束散射':'单束脉冲','路程 '+Math.round(s.x/END*100)+'%'],actions:[action('开火 / J',shoot,s.won||s.phase==='down'),action('跳跃 / 空格',jump,s.won||s.phase==='down'),action('返回检查点',retry,s.phase!=='down')]}),dispose(){element.remove()}};
}
