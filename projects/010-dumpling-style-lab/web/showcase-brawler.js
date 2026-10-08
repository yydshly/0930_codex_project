import {W,H,clamp,canvasSurface,images,sprite,shadow,glow,action,safeSaved} from './showcase-core.js';

const END=2480,LANE_TOP=438,LANE_BOTTOM=553;
const enemies=()=>[
 {id:0,stage:0,x:550,y:490,hp:3,max:3,kind:'enemy'}, {id:1,stage:0,x:710,y:530,hp:3,max:3,kind:'enemy'},
 {id:2,stage:1,x:1130,y:460,hp:3,max:3,kind:'enemy'}, {id:3,stage:1,x:1330,y:515,hp:5,max:5,kind:'heavy'},
 {id:4,stage:1,x:1450,y:550,hp:3,max:3,kind:'enemy'},
 {id:5,stage:2,x:2110,y:510,hp:10,max:10,kind:'heavy'}, {id:6,stage:2,x:2210,y:450,hp:3,max:3,kind:'enemy'}
].map(e=>({...e,cooldown:1,windup:0,stun:0,attack:0,fade:0}));
const defaults={x:180,y:495,z:0,vz:0,hp:8,facing:1,stage:0,elapsed:0,kills:0,hits:0,combo:0,bestCombo:0,throws:0,dodges:0,won:false,phase:'active',enemies:enemies()};

export async function createBrawler({host,input,saved,notify,sfx}){
 const art=await images(['street','idle','walk-a','walk-b','jab','hook','kick','jump','hurt','enemy','enemy-attack','heavy','heavy-attack'],'assets/game-forms/brawler/');
 const {element,ctx}=canvasSurface(host),s=safeSaved(saved,defaults);
 s.enemies=enemies().map(e=>({...e,...s.enemies?.find(old=>old.id===e.id)}));
 let camera=clamp(s.x-320,0,END-W),attack=null,attackCD=0,comboWindow=0,invulnerable=0,dodgeTime=0,dodgeCD=0,hitStop=0,shake=0,hurtPose=0,throwPose=0,stageBanner=2;
 const particles=[];
 const active=()=>s.enemies.filter(e=>e.hp>0&&e.stage===s.stage);
 function impact(x,y,color='#ffe9a8',count=14){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=70+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.2+Math.random()*.24,color})}}
 function damage(e,amount,push){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.x=clamp(e.x+s.facing*push,s.stage*800+30,s.stage*800+760);e.stun=.45;e.windup=0;s.hits++;impact(e.x,e.y-80);hitStop=.045;shake=.13;sfx('slash');if(!e.hp){s.kills++;e.fade=1.2;impact(e.x,e.y-65,'#fff4d1',22)}}
 function punch(){if(attackCD>0||s.won||s.phase==='down'||dodgeTime>0)return;
  const nearest=active().filter(e=>Math.abs(e.y-s.y)<40).sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];
  if(nearest&&Math.abs(nearest.x-s.x)<185)s.facing=Math.sign(nearest.x-s.x)||s.facing;
  s.combo=comboWindow>0?s.combo%3+1:1;s.bestCombo=Math.max(s.bestCombo,s.combo);comboWindow=1.2;
  const aerial=s.z>20,kind=aerial?'jump':['jab','hook','kick'][s.combo-1],duration=aerial?.43:[.34,.4,.56][s.combo-1];
  attack={kind,time:0,duration,hit:false,range:aerial?120:[100,118,160][s.combo-1],damage:aerial||s.combo===3?2:1};attackCD=duration+.035;sfx('slash');
 }
 function jump(){if(s.z===0&&s.phase==='active'&&!s.won){s.vz=570;sfx('jump')}}
 function dodge(){if(dodgeCD>0||s.phase!=='active'||s.won)return;dodgeTime=.28;dodgeCD=1;invulnerable=Math.max(invulnerable,.35);s.dodges++;sfx('jump')}
 function grab(){if(s.phase!=='active'||s.won||attackCD>0)return;const enemy=active().filter(e=>Math.abs(e.x-s.x)<68&&Math.abs(e.y-s.y)<30).sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];if(!enemy){notify('走近同一条路面上的对手，再抓取。');return}s.facing=Math.sign(enemy.x-s.x)||s.facing;damage(enemy,enemy.kind==='heavy'?1:2,105);for(const e of active())if(e!==enemy&&Math.abs(e.x-enemy.x)<110&&Math.abs(e.y-enemy.y)<40)damage(e,1,45);s.throws++;throwPose=.48;attackCD=.6;notify('抓取投掷：对手被甩开，附近的敌人也会被撞退。')}
 function restart(){Object.assign(s,structuredClone(defaults));s.enemies=enemies();camera=0;attack=null;attackCD=comboWindow=invulnerable=dodgeTime=dodgeCD=hitStop=shake=hurtPose=throwPose=0;particles.length=0;stageBanner=2;notify('新的清场开始了，先看对手走在哪条路面上。')}
 function hurt(){if(invulnerable>0||s.z>35||s.won||s.phase==='down')return;s.hp--;invulnerable=1.05;hurtPose=.28;shake=.2;s.combo=0;comboWindow=0;impact(s.x,s.y-85,'#ff9c7b',10);sfx('hurt');if(s.hp<=0){s.phase='down';notify('这次清场中断了。可以从当前街段重试。')}}
 function retry(){if(s.phase!=='down')return;s.hp=8;s.x=s.stage*800+170;s.y=495;s.z=s.vz=0;s.phase='active';invulnerable=1.5;camera=clamp(s.x-320,0,END-W);for(const e of s.enemies.filter(e=>e.stage===s.stage&&e.hp>0)){e.windup=e.stun=e.attack=0;e.cooldown=1.5}notify('回到当前街段，已经击退的对手继续保留。')}
 function tick(dt){
  s.elapsed+=dt;stageBanner=Math.max(0,stageBanner-dt);attackCD=Math.max(0,attackCD-dt);dodgeCD=Math.max(0,dodgeCD-dt);comboWindow=Math.max(0,comboWindow-dt);invulnerable=Math.max(0,invulnerable-dt);hurtPose=Math.max(0,hurtPose-dt);throwPose=Math.max(0,throwPose-dt);shake=Math.max(0,shake-dt);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.life-=dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  for(const e of s.enemies)if(e.fade>0)e.fade=Math.max(0,e.fade-dt);
  if(s.won||s.phase==='down')return;if(hitStop>0){hitStop=Math.max(0,hitStop-dt);return}
  if(input.pressed.has('Space'))jump();if(input.pressed.has('KeyC'))dodge();if(input.pressed.has('KeyE'))grab();if(input.keys.has('KeyJ')||input.pointers.length)punch();
  if(input.x&&!attack&&!throwPose)s.facing=Math.sign(input.x);
  dodgeTime=Math.max(0,dodgeTime-dt);const speed=dodgeTime>0?540:attack||throwPose?85:200,dx=dodgeTime>0?(input.x||s.facing):input.x;
  const edge=active().length?s.stage*800+765:END-35;s.x=clamp(s.x+dx*speed*dt,30,edge);s.y=clamp(s.y+input.y*speed*.65*dt,LANE_TOP,LANE_BOTTOM);
  if(s.z>0||s.vz>0){s.vz-=1550*dt;s.z=Math.max(0,s.z+s.vz*dt);if(s.z===0)s.vz=0}
  if(attack){attack.time+=dt;if(!attack.hit&&attack.time>attack.duration*.33){attack.hit=true;for(const e of active()){const dx=(e.x-s.x)*s.facing;if(dx>-15&&dx<attack.range&&Math.abs(e.y-s.y)<40)damage(e,attack.damage,attack.damage===2?68:28)}}if(attack.time>=attack.duration)attack=null}
  for(const e of active()){
   e.stun=Math.max(0,e.stun-dt);e.attack=Math.max(0,e.attack-dt);if(e.stun>0)continue;
   if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.attack=.28;if(Math.abs(e.x-s.x)<110&&Math.abs(e.y-s.y)<38)hurt();e.cooldown=e.kind==='heavy'?1.7:1.3}continue}
   e.cooldown=Math.max(0,e.cooldown-dt);const dx=s.x-e.x,dy=s.y-e.y,near=Math.abs(dx)<82&&Math.abs(dy)<26;
   if(near){if(e.cooldown===0)e.windup=e.kind==='heavy'?.85:.58}
   else{if(Math.abs(dx)>68)e.x+=Math.sign(dx)*(e.kind==='heavy'?58:82)*dt;if(Math.abs(dy)>12)e.y+=Math.sign(dy)*48*dt}
  }
  if(s.z<20)for(const e of active())if(Math.abs(e.y-s.y)<28&&Math.abs(e.x-s.x)<52){const side=Math.sign(e.x-s.x)||-s.facing;e.x=clamp(s.x+side*53,s.stage*800+30,s.stage*800+760)}
  if(!active().length){if(s.stage<2&&s.x>(s.stage+1)*800-60){s.stage++;stageBanner=2;notify(['','第一街段已清场，继续向前。','最后街段：留意重拳的预兆。'][s.stage]);sfx('door')}else if(s.stage===2&&s.x>END-100){s.won=true;sfx('success');notify('街道恢复了安静。三段清场完成。')}}
  camera+=(clamp(s.x-320,0,END-W)-camera)*Math.min(1,dt*5);
 }
 function figure(name,x,y,height,flip,alpha=1){sprite(ctx,art[name],x-camera,y,height,flip,alpha)}
 function draw(){
  ctx.fillStyle='#091a26';ctx.fillRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*5,(Math.random()-.5)*4);
  for(let tile=0;tile<3;tile++){if(tile%2){ctx.save();ctx.translate((tile+1)*W-camera,0);ctx.scale(-1,1);ctx.drawImage(art.street,0,0,W,H);ctx.restore()}else ctx.drawImage(art.street,tile*W-camera,0,W,H)}
  const laneGlow=ctx.createLinearGradient(0,420,0,590);laneGlow.addColorStop(0,'transparent');laneGlow.addColorStop(1,'rgba(5,15,22,.24)');ctx.fillStyle=laneGlow;ctx.fillRect(0,420,W,210);
  if(active().length){const gate=(s.stage+1)*800-15-camera;if(gate>0&&gate<W){ctx.setLineDash([8,12]);ctx.strokeStyle='#ffcc7a88';ctx.beginPath();ctx.moveTo(gate,435);ctx.lineTo(gate,565);ctx.stroke();ctx.setLineDash([])}}
  const actors=s.enemies.filter(e=>e.stage===s.stage&&(e.hp>0||e.fade>0)).map(e=>({type:'enemy',y:e.y,e}));actors.push({type:'player',y:s.y});actors.sort((a,b)=>a.y-b.y);
  for(const a of actors){
   if(a.type==='enemy'){const e=a.e,flip=e.x>s.x,size=e.kind==='heavy'?183:157,alpha=e.hp>0?1:e.fade/1.2;shadow(ctx,e.x-camera,e.y,30);if(e.windup>0){ctx.strokeStyle='#ff9568';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.x-camera,e.y,49,15,0,0,Math.PI*2);ctx.stroke();glow(ctx,e.x-camera,e.y-70,60,'#f972422a')}
    ctx.save();if(!e.hp){ctx.translate(e.x-camera,e.y);ctx.rotate(flip?-.65:.65);sprite(ctx,art[e.kind],0,10,size,flip,alpha)}else figure(e.attack>0?e.kind+'-attack':e.kind,e.x,e.y+Math.sin(s.elapsed*6+e.id)*(e.stun?0:1.5),size,flip);ctx.restore();
    if(e.hp>0){ctx.fillStyle='#1b1e27';ctx.fillRect(e.x-camera-25,e.y-size-13,50,5);ctx.fillStyle=e.kind==='heavy'?'#f9bd6d':'#e17869';ctx.fillRect(e.x-camera-25,e.y-size-13,50*e.hp/e.max,5)}
   }else{const moving=!!(input.x||input.y),pose=s.phase==='down'||hurtPose?'hurt':throwPose?'hook':attack?.kind|| (s.z>0?'jump':moving?(Math.floor(s.elapsed*9)%2?'walk-a':'walk-b'):'idle');shadow(ctx,s.x-camera,s.y,29);
    if(dodgeTime>0){for(let i=1;i<4;i++)figure('walk-a',s.x-i*s.facing*24,s.y,155,s.facing<0,.11*(4-i))}
    const alpha=invulnerable>0&&Math.floor(s.elapsed*15)%2?.45:1;figure(pose,s.x,s.y-s.z,155,s.facing<0,alpha);
    if(attack&&attack.hit&&attack.time<attack.duration*.65){ctx.strokeStyle='#ffe8a9aa';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x-camera+s.facing*70,s.y-s.z-75,35,s.facing<0?Math.PI*.7:-1.1,s.facing<0?Math.PI*1.3:1.1);ctx.stroke()}
   }
  }
  for(const p of particles){ctx.globalAlpha=clamp(p.life/.25,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-camera,p.y,4,3)}ctx.globalAlpha=1;ctx.restore();
  ctx.fillStyle='#07121bd9';ctx.fillRect(22,20,252,64);ctx.font='bold 15px Microsoft YaHei';ctx.fillStyle='#f7e8d3';ctx.fillText('夜港清场',38,43);for(let i=0;i<8;i++){ctx.fillStyle=i<s.hp?'#e98970':'#34434b';ctx.fillRect(38+i*27,57,21,9)}
  ctx.textAlign='right';ctx.fillStyle='#ffe4ad';ctx.font='bold 22px Microsoft YaHei';ctx.fillText(s.combo&&comboWindow>0?'连击 '+s.combo:'街段 '+(s.stage+1)+' / 3',W-32,44);ctx.font='14px Microsoft YaHei';ctx.fillStyle='#ede4d8';ctx.fillText('清场 '+s.kills+' / 7',W-32,68);ctx.textAlign='left';
  if(stageBanner>0&&!s.won){ctx.textAlign='center';ctx.fillStyle='#07121baa';ctx.fillRect(W/2-145,105,290,51);ctx.fillStyle='#ffe8bd';ctx.font='20px Microsoft YaHei';ctx.fillText(['01 / 灯下街口','02 / 仓库街段','03 / 港口出口'][s.stage],W/2,138);ctx.textAlign='left'}
  if(s.won||s.phase==='down'){ctx.fillStyle='#06101bb3';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.font='bold 38px Microsoft YaHei';ctx.fillStyle='#ffe6b0';ctx.fillText(s.won?'夜港清场完成':'返回街段，再试一次',W/2,H/2);ctx.font='18px Microsoft YaHei';ctx.fillText(s.won?'三段街道 · 七名对手 · 你的连击留下了回响':'点击画面下方的「返回当前街段」',W/2,H/2+42);ctx.textAlign='left'}
 }
 return {tick,draw,getState:()=>structuredClone(s),getStatus:()=>({goal:s.won?'三段街道已经清场':s.phase==='down'?'返回当前街段':'第 '+(s.stage+1)+' 街段 · '+(active().length?'击退当前对手':'继续向右前进'),message:'前后走位对齐路面。J 连续攻击组成直拳、勾拳、踢击；空格跳击，C 闪避，E 近身抓取投掷。',stats:['生命 '+s.hp+'/8','清场 '+s.kills+'/7','最高连段 '+s.bestCombo,'投掷 '+s.throws],actions:s.phase==='down'?[action('返回当前街段',retry)]:s.won?[action('再清场一次',restart)]:[action('连击 · J',punch),action('闪避 · C',dodge,dodgeCD>0),action('抓取投掷 · E',grab)]}),dispose:()=>element.remove()};
}
