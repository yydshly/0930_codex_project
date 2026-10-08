import {W,H,clamp,canvasSurface,images,glow,action,safeSaved} from './showcase-core.js';

const LEFT=315,RIGHT=805,WIDTH=RIGHT-LEFT;
const defaults={x:560,y:515,hp:5,elapsed:0,spawn:0,enemies:[],kills:0,score:0,shots:0,hits:0,power:1,bombs:2,bombsUsed:0,supplies:[],won:false,phase:'active',autoFire:true,bossSpawned:false};
export async function createFlight({host,input,saved,notify,sfx}){
 const art=await images(['ocean','plane','bank-left','bank-right','fighter','bomber','carrier','supply','cloud'],'assets/game-forms/skyline/'),{element,ctx}=canvasSurface(host),s=safeSaved(saved,defaults);
 s.enemies=Array.isArray(s.enemies)?s.enemies:[];s.supplies=Array.isArray(s.supplies)?s.supplies:[];
 let shootCD=0,invulnerable=0,shock=0,shake=0,target=null;const bullets=[],hostile=[],particles=[];
 const schedule=[1,4.5,8,12,16,20,24,28],alive=()=>s.enemies.filter(e=>e.hp>0);
 function burst(x,y,color='#ffd996',count=20){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=35+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.45,color})}}
 function hit(e,amount=1){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.flash=.085;s.hits++;burst(e.x,e.y,'#fff1ab',4);if(!e.hp){s.kills++;s.score+=e.kind==='carrier'?2500:e.kind==='bomber'?250:100;burst(e.x,e.y,'#ffb05f',e.kind==='carrier'?90:30);sfx('pickup');if(e.kind==='bomber')s.supplies.push({x:e.x,y:e.y});if(e.kind==='carrier'){s.won=true;sfx('success');notify('守关机已击退，群岛航路重新开放。')}}}
 function fire(){if(shootCD>0||s.phase==='down'||s.won)return;const offsets=s.power===1?[-14,14]:[-25,0,25];for(const offset of offsets)bullets.push({x:s.x+offset,y:s.y-36,vx:offset*(s.power>1?1.5:0),vy:-750,life:1});s.shots++;shootCD=s.power>1?.12:.15;sfx('shot')}
 function bomb(){if(s.bombs<=0||s.phase==='down'||s.won)return;s.bombs--;s.bombsUsed++;shock=.65;shake=.22;hostile.length=0;for(const e of alive())hit(e,e.kind==='carrier'?12:5);sfx('success');notify('冲击波清除了当前弹道，并击中画面中的敌机。')}
 function restart(){Object.assign(s,structuredClone(defaults));shootCD=invulnerable=shock=shake=0;target=null;bullets.length=hostile.length=particles.length=0;notify('新的航路开始了，留意编队和补给。')}
 function hurt(){if(invulnerable>0||s.phase==='down'||s.won)return;s.hp--;invulnerable=1.5;shake=.2;burst(s.x,s.y,'#ff8c66');sfx('hurt');if(s.hp<=0){s.phase='down';notify('飞机失去动力。可在当前航段重试。')}}
 function retry(){if(s.phase!=='down')return;s.hp=5;s.phase='active';s.x=560;s.y=515;invulnerable=2;hostile.length=0;for(const e of alive())e.timer=Math.max(1.2,e.timer);notify('飞机重新进入当前航段，补给和推进进度保留。')}
 function spawnWave(index){const heavy=index%3===2;
  if(heavy)s.enemies.push({id:'b'+index,kind:'bomber',x:560,base:560,y:-70,hp:7,max:7,age:0,timer:1.3,flash:0});
  else for(let n=0;n<3;n++){const x=405+n*150;s.enemies.push({id:index+'-'+n,kind:'fighter',x,base:x,y:-70-n*42,hp:2,max:2,age:n*.4,timer:1.1+n*.25,flash:0})}
 }
 function tick(dt){
  shootCD=Math.max(0,shootCD-dt);invulnerable=Math.max(0,invulnerable-dt);shock=Math.max(0,shock-dt);shake=Math.max(0,shake-dt);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  if(s.won||s.phase==='down')return;s.elapsed+=dt;
  if(input.pressed.has('Space')||input.pressed.has('KeyC'))bomb();
  if(input.x||input.y)target=null;
  for(const p of input.pointers)if(p.x>LEFT&&p.x<RIGHT)target={x:p.x,y:p.y};
  let mx=input.x,my=input.y;if(target){const dx=target.x-s.x,dy=target.y-s.y,len=Math.hypot(dx,dy);if(len>6){mx=dx/len;my=dy/len}else target=null}
  s.x=clamp(s.x+mx*285*dt+input.look.x*W/Math.max(1,element.clientWidth),LEFT+35,RIGHT-35);s.y=clamp(s.y+my*285*dt+input.look.y*W/Math.max(1,element.clientWidth),75,H-50);
  if(s.autoFire||input.keys.has('KeyJ'))fire();
  while(s.spawn<schedule.length&&s.elapsed>=schedule[s.spawn]){spawnWave(s.spawn);s.spawn++}
  if(s.elapsed>=33&&!s.bossSpawned){s.bossSpawned=true;s.enemies.push({id:'carrier',kind:'carrier',x:560,base:560,y:-140,hp:65,max:65,age:0,timer:2,flash:0});notify('大型守关机进入航路。观察扇形弹道，保留冲击波。');sfx('door')}
  for(const e of alive()){
   e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.x=e.base+Math.sin(e.age*(e.kind==='carrier'?.6:1.5))* (e.kind==='carrier'?95:35);
   if(e.kind==='carrier')e.y=Math.min(140,e.y+65*dt);else e.y+=(e.kind==='bomber'?68:100)*dt;
   e.timer-=dt;
   if(e.timer<=0&&e.y>20&&e.y<470){const a=Math.atan2(s.y-e.y,s.x-e.x),fan=e.kind==='carrier'?[-.65,-.44,-.22,0,.22,.44,.65]:e.kind==='bomber'?[-.28,0,.28]:[0];for(const offset of fan){const angle=a+offset;hostile.push({x:e.x,y:e.y+26,vx:Math.cos(angle)* (e.kind==='carrier'?155:145),vy:Math.sin(angle)*(e.kind==='carrier'?155:145),r:e.kind==='carrier'?6:5})}e.timer=e.kind==='carrier'?1.3:e.kind==='bomber'?1.8:2.2;sfx('shot')}
  }
  for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of alive()){const rx=e.kind==='carrier'?102:e.kind==='bomber'?46:29,ry=e.kind==='carrier'?77:e.kind==='bomber'?48:37;if(Math.abs(b.x-e.x)<rx&&Math.abs(b.y-e.y)<ry){b.life=0;hit(e);break}}}
  for(let i=bullets.length-1;i>=0;i--)if(bullets[i].life<=0||bullets[i].y<0)bullets.splice(i,1);
  for(const b of hostile){b.x+=b.vx*dt;b.y+=b.vy*dt;if(Math.hypot(b.x-s.x,b.y-s.y)<b.r+9){b.y=H+30;hurt()}}
  for(let i=hostile.length-1;i>=0;i--)if(hostile[i].y>H+15||hostile[i].y<-15||hostile[i].x<LEFT-10||hostile[i].x>RIGHT+10)hostile.splice(i,1);
  for(const e of alive())if(e.kind!=='carrier'&&Math.abs(e.x-s.x)<30&&Math.abs(e.y-s.y)<40)hurt();
  for(const p of s.supplies){p.y+=75*dt;if(Math.hypot(p.x-s.x,p.y-s.y)<43){p.y=H+80;s.power=2;s.bombs=Math.min(3,s.bombs+1);s.score+=150;sfx('pickup');notify('补给已取得：三路火力，并补充一枚冲击波。')}}
  s.supplies=s.supplies.filter(p=>p.y<H+40);s.enemies=s.enemies.filter(e=>e.hp>0&&e.y<H+100);
 }
 function plane(name,x,y,width,alpha=1){const im=art[name],height=width*im.height/im.width;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x-width/2,y-height/2,width,height);ctx.restore()}
 function text(t,x,y,size=15,color='#ddeae9'){ctx.font=size+'px Microsoft YaHei';ctx.fillStyle=color;ctx.fillText(t,x,y)}
 function draw(){
  ctx.fillStyle='#06131d';ctx.fillRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#12313b');g.addColorStop(.5,'#06131d');g.addColorStop(1,'#142a35');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.beginPath();ctx.rect(LEFT,0,WIDTH,H);ctx.clip();if(shake>0)ctx.translate((Math.random()-.5)*7,(Math.random()-.5)*5);
  const imageHeight=WIDTH*art.ocean.height/art.ocean.width,offset=(s.elapsed*82)%imageHeight;ctx.drawImage(art.ocean,LEFT,offset-imageHeight,WIDTH,imageHeight);ctx.drawImage(art.ocean,LEFT,offset,WIDTH,imageHeight);
  ctx.fillStyle='#06344116';ctx.fillRect(LEFT,0,WIDTH,H);
  for(const e of alive()){const size=e.kind==='carrier'?225:e.kind==='bomber'?106:67;plane(e.kind,e.x+9,e.y+20,size,.13);plane(e.kind,e.x,e.y,size);if(e.timer<.4){glow(ctx,e.x,e.y+27,25,'#ffae5877')}if(e.flash){glow(ctx,e.x,e.y,size*.65,'#ffffff99')}
   if(e.kind==='carrier'){ctx.fillStyle='#10202a';ctx.fillRect(LEFT+36,25,WIDTH-72,10);ctx.fillStyle='#ee9872';ctx.fillRect(LEFT+36,25,(WIDTH-72)*e.hp/e.max,10);ctx.textAlign='center';text('群岛守关机',560,55,14,'#fff1cf');ctx.textAlign='left'}
  }
  for(const p of s.supplies){glow(ctx,p.x,p.y,32,'#ffcf6d55');plane('supply',p.x,p.y,32)}
  ctx.lineCap='round';for(const b of bullets){ctx.strokeStyle='#e6ffff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.x,b.y+15);ctx.lineTo(b.x,b.y);ctx.stroke()}
  for(const b of hostile){ctx.fillStyle='#ffd79e';ctx.strokeStyle='#a8352e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.stroke()}
  if(invulnerable===0||Math.floor(s.elapsed*12)%2===0){const pose=input.x<0?'bank-left':input.x>0?'bank-right':'plane';plane(pose,s.x+9,s.y+23,73,.18);glow(ctx,s.x-15,s.y+40,19,'#70edff77');glow(ctx,s.x+15,s.y+40,19,'#70edff77');plane(pose,s.x,s.y,73);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(s.x,s.y,2.5,0,Math.PI*2);ctx.fill()}
  for(let i=0;i<2;i++)plane('cloud',LEFT+70+i*330,(s.elapsed*38+i*370)%900-150,170,.4);
  for(const p of particles){ctx.globalAlpha=clamp(p.life/.3,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;
  if(shock>0){ctx.strokeStyle='#e2fcff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(s.x,s.y,(.65-shock)*1050,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(227,255,255,'+(shock*.27)+')';ctx.fillRect(LEFT,0,WIDTH,H)}ctx.restore();
  ctx.strokeStyle='#b4e7da44';ctx.lineWidth=1;ctx.strokeRect(LEFT-.5,0,WIDTH+1,H);
  text('SKY / PATROL',35,68,14,'#9abdc1');text('群岛航线',35,108,29,'#fff0d8');text('纵向飞行射击',35,144,16,'#adc6c9');
  text('SCORE',35,220,12,'#9abdc1');text(String(s.score).padStart(6,'0'),35,259,31,'#f7d299');text('机体状态',35,320,14);for(let i=0;i<5;i++){ctx.fillStyle=i<s.hp?'#99e2d7':'#304b52';ctx.fillRect(35+i*36,340,29,10)}text('冲击波 '+s.bombs+' 枚',35,405,16,'#e4d1aa');text('空格 / C 清除弹道',35,437,13,'#adc6c9');
  text('航路推进',840,88,16,'#e7e5ce');text(Math.min(100,Math.floor(s.elapsed/33*100))+'%',840,129,30,'#9fe4d4');ctx.fillStyle='#233f48';ctx.fillRect(840,153,215,5);ctx.fillStyle='#8fd8cc';ctx.fillRect(840,153,215*Math.min(1,s.elapsed/33),5);text(s.bossSpawned?'守关机已进入':'编队正在接近',840,208,16);text(s.power>1?'火力 / 三路':'火力 / 双路',840,271,17,'#f3d3a0');text('白色弹道：你的火力',840,367,13);text('橙色弹道：敌机攻击',840,395,13);text('机身中心白点为受击点',840,455,13,'#a9c0c5');text('拖动或方向键驾驶',840,548,13,'#a9c0c5');
  if(s.won||s.phase==='down'){ctx.fillStyle='#06131dbb';ctx.fillRect(LEFT,0,WIDTH,H);ctx.textAlign='center';text(s.won?'航路已开放':'当前航段中断',560,270,31,'#ffe7b1');text(s.won?'守关机击退 · 得分 '+s.score:'点击下方「返回当前航段」',560,314,16,'#e8f3eb');ctx.textAlign='left'}
 }
 return {tick,draw,getState:()=>structuredClone(s),getStatus:()=>({goal:s.won?'群岛航线完成':s.phase==='down'?'返回当前航段':s.bossSpawned?'击退大型守关机':'穿过群岛，避开敌机编队',message:'方向键 / WASD 驾驶，拖动画面也可移动飞机。默认自动射击；空格 / C 发射冲击波。机身中心白点为受击点。',stats:['机体 '+s.hp+'/5','得分 '+s.score,'击退 '+s.kills,'冲击波 '+s.bombs],actions:s.phase==='down'?[action('返回当前航段',retry)]:s.won?[action('再飞一次',restart)]:[action('冲击波 · 空格',bomb,s.bombs===0),action('自动射击：'+(s.autoFire?'开':'关'),()=>{s.autoFire=!s.autoFire})]}),dispose:()=>element.remove()};
}
