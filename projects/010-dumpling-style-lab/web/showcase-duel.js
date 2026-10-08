import {W,H,clamp,images,canvasSurface,cover,sprite,shadow,glow,label,action,safeSaved} from './showcase-core.js';

export async function createDuel({host,input,saved,notify,sfx}){
 const art=await images(['scene',...['hero','rival'].flatMap(p=>['idle','walk-a','walk-b','jab','kick','guard','jump','hurt'].map(a=>p+'-'+a))],'assets/game-forms/duel/');
 const {ctx}=canvasSurface(host),floor=484;
 const fighter=(x)=>({x,y:0,vy:0,hp:100,face:1,walk:0,guard:0,hurt:0,attack:null,cooldown:0,meter:0});
 const defaults={hero:fighter(340),rival:fighter(780),round:1,wins:[0,0],time:45,phase:'fight',won:false,score:0,elapsed:0,hits:0,blocks:0,combo:0,bestCombo:0,aiWait:1.3};
 let s=safeSaved(saved,defaults),particles=[],freeze=0,flash='',flashTime=0,lastHit=-9,jumpBuffer=0,kickBuffer=0,skillBuffer=0;
 for(const key of ['hero','rival']){s[key]={...fighter(key==='hero'?340:780),...s[key]};s[key].x=clamp(s[key].x,105,1015);s[key].hp=clamp(s[key].hp,0,100);s[key].attack=null;s[key].cooldown=0}
 s.wins=Array.isArray(s.wins)&&s.wins.length===2?s.wins:[0,0];
 const burst=(x,y,color,n=16)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;particles.push({x,y,vx:Math.cos(a)*(80+i*7),vy:Math.sin(a)*145,life:.42,color})}};
 function attack(who,kind){
  if(s.phase!=='fight'||who.attack||who.cooldown>0||who.hurt>0||who.guard>0)return;
  if(kind==='skill'&&who.meter<100){if(who===s.hero)notify('命中和防守积攒能量，满格后可使出破阵。');return}
  const heavy=kind!=='jab';who.attack={kind,t:0,landed:false,windup:kind==='skill'?.20:heavy?.25:.11,duration:heavy?.60:.38};who.cooldown=heavy?.64:.40;
  if(kind==='skill')who.meter=0;sfx('slash');
 }
 function resolve(attacker,target){
  const a=attacker.attack;if(!a||a.landed||a.t<a.windup)return;a.landed=true;
  const reach=a.kind==='jab'?168:a.kind==='kick'?212:250,dx=target.x-attacker.x;
  if(Math.abs(dx)>reach||Math.sign(dx)!==attacker.face||Math.abs(target.y-attacker.y)>90)return;
  const guarded=target.guard>0&&target.face===-attacker.face&&target.y<4,damage=guarded?2:a.kind==='skill'?25:a.kind==='kick'?14:9;
  target.hp=Math.max(0,target.hp-damage);target.x=clamp(target.x+attacker.face*(guarded?8:20),105,1015);target.hurt=guarded?0:.19;
  if(!guarded)target.attack=null;attacker.meter=clamp(attacker.meter+(guarded?5:14),0,100);if(guarded)target.meter=clamp(target.meter+19,0,100);
  freeze=guarded?.027:.048;burst((attacker.x+target.x)/2,floor-125-target.y,guarded?'#7bdbe9':'#ffd388',guarded?10:19);sfx(guarded?'stamp':'hurt');
  if(attacker===s.hero){s.hits++;s.score+=guarded?20:damage*20;s.combo=s.elapsed-lastHit<1? s.combo+1:1;lastHit=s.elapsed;s.bestCombo=Math.max(s.bestCombo,s.combo)}
  if(guarded&&target===s.hero){s.blocks++;flash='格挡 · 能量提升'}else flash=guarded?'对手格挡':a.kind==='skill'?'破阵！':s.combo>1&&attacker===s.hero?s.combo+' 连击':'命中';flashTime=.55;
  if(target.hp<=0)endRound(attacker===s.hero?0:1);
 }
 function endRound(winner){
  if(s.phase!=='fight')return;s.wins[winner]++;s.phase=s.wins[winner]>=2?'match-end':'round-end';s.won=s.phase==='match-end'&&winner===0;
  s.hero.attack=s.rival.attack=null;flash=winner===0?'本回合胜利':'本回合失利';flashTime=2;sfx('success');
  if(s.won){s.score+=1000;notify('试炼完成：距离、格挡与反击形成了真正的对战节奏。')}
 }
 function nextRound(){s.round++;s.hero=fighter(340);s.rival=fighter(780);s.time=45;s.phase='fight';s.aiWait=1.1;flash='第 '+s.round+' 回合';flashTime=1.1}
 function replay(){s=structuredClone(defaults);particles=[];flash='新的试炼';flashTime=1.2;lastHit=-9;notify('新的三局两胜试炼开始。')}
 function tick(dt){
  s.elapsed+=dt;flashTime=Math.max(0,flashTime-dt);
  jumpBuffer=input.pressed.has('Space')?.18:Math.max(0,jumpBuffer-dt);kickBuffer=input.pressed.has('KeyE')?.18:Math.max(0,kickBuffer-dt);skillBuffer=input.pressed.has('KeyR')?.18:Math.max(0,skillBuffer-dt);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  if(freeze>0){freeze-=dt;return}if(s.phase!=='fight')return;
  s.time=Math.max(0,s.time-dt);const h=s.hero,r=s.rival;
  h.face=r.x>=h.x?1:-1;r.face=-h.face;
  for(const f of [h,r]){f.cooldown=Math.max(0,f.cooldown-dt);f.guard=Math.max(0,f.guard-dt);f.hurt=Math.max(0,f.hurt-dt);if(f.y>0||f.vy>0){f.vy-=1250*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0)f.vy=0}if(f.attack){f.attack.t+=dt;if(f.attack.t>=f.attack.duration)f.attack=null}}
  if(input.keys.has('KeyC')&&h.y===0&&!h.attack&&!h.hurt)h.guard=.12;
  if(jumpBuffer>0&&h.y===0&&!h.hurt){h.vy=570;h.guard=0;jumpBuffer=0;sfx('jump')}
  if(input.keys.has('KeyJ'))attack(h,'jab');if(kickBuffer>0&&!h.attack&&h.cooldown===0){attack(h,'kick');kickBuffer=0}if(skillBuffer>0&&!h.attack&&h.cooldown===0){attack(h,'skill');skillBuffer=0}
  if(!h.hurt&&!h.attack){const v=input.x*(h.guard>0?80:250);h.x=clamp(h.x+v*dt,105,1015);h.walk+=Math.abs(v)*dt}
  s.aiWait-=dt;const gap=Math.abs(h.x-r.x);
  if(!r.attack&&!r.guard&&!r.hurt){if(gap>157){r.x+=Math.sign(h.x-r.x)*150*dt;r.walk+=150*dt}else if(gap<110){r.x-=Math.sign(h.x-r.x)*75*dt;r.walk+=75*dt}}
  if(s.aiWait<=0&&!r.hurt&&!r.attack){const cycle=Math.floor(s.elapsed/1.1)%5;if(cycle===0){r.guard=.6;s.aiWait=.9}else{attack(r,cycle===2?'kick':'jab');s.aiWait=1.0}}
  r.x=clamp(r.x,105,1015);
  // Grounded bodies retain personal space. Jumping permits a side switch.
  if(Math.abs(h.x-r.x)<111&&h.y<85&&r.y<85){const sign=h.x<r.x?-1:1,middle=(h.x+r.x)/2;h.x=clamp(middle+sign*55.5,105,1015);r.x=clamp(middle-sign*55.5,105,1015)}
  resolve(h,r);resolve(r,h);if(s.phase==='fight'&&s.time===0)endRound(h.hp>=r.hp?0:1);
 }
 function drawFighter(f,prefix){
  const pose=f.hurt>0?'hurt':f.guard>0?'guard':f.attack?f.attack.kind==='jab'?'jab':'kick':f.y>0?'jump':(prefix==='hero'?input.x!==0:Math.abs(s.hero.x-f.x)>157)?(Math.floor(f.walk/42)%2?'walk-a':'walk-b'):'idle';
  shadow(ctx,f.x,floor,42);if(f.guard>0)glow(ctx,f.x,floor-110-f.y,110,'#76ddea25');
  // Draw extended arms/legs toward the opponent while keeping the torso anchored.
  const extension=['jab','kick'].includes(pose)?(pose==='kick'?34:26)*f.face:0;
  sprite(ctx,art[prefix+'-'+pose],f.x+extension,floor-f.y,215,f.face<0);
  if(f.attack&&f.attack.t<f.attack.windup){ctx.strokeStyle='#ffae67';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,floor-118-f.y,57+f.attack.t*30,0,Math.PI*2);ctx.stroke()}
 }
 function draw(){
  cover(ctx,art.scene);ctx.fillStyle='rgba(13,22,31,.16)';ctx.fillRect(0,0,W,H);
  drawFighter(s.hero,'hero');drawFighter(s.rival,'rival');
  for(const p of particles){ctx.globalAlpha=p.life/.42;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;
  ctx.fillStyle='rgba(9,19,31,.85)';ctx.fillRect(40,26,1040,101);
  ctx.font='bold 19px "Microsoft YaHei",sans-serif';ctx.textAlign='left';ctx.fillStyle='#c5f5ee';ctx.fillText('青岚 · 你',60,56);ctx.textAlign='right';ctx.fillStyle='#ffd5a9';ctx.fillText('晚照 · 试炼对手',1060,56);
  for(const [f,x,color,reverse] of [[s.hero,60,'#74d9d0',false],[s.rival,637,'#f2bd79',true]]){
   ctx.fillStyle='#293343';ctx.fillRect(x,69,423,17);ctx.fillStyle=color;ctx.fillRect(reverse?x+423*(1-f.hp/100):x,69,423*f.hp/100,17);
   ctx.fillStyle='#e8bb5a';ctx.fillRect(x,96,423*f.meter/100,5);
  }
  label(ctx,String(Math.ceil(s.time)).padStart(2,'0'),560,80,'#fff2c5',32);
  for(let side=0;side<2;side++)for(let i=0;i<2;i++){ctx.fillStyle=s.wins[side]>i?'#ffda81':'#536273';ctx.beginPath();ctx.arc(side?697+i*22:423+i*22,49,6,0,Math.PI*2);ctx.fill()}
  label(ctx,'第 '+s.round+' 回合 · 三局两胜',560,145,'#f4dca6',15);
  if(flashTime>0)label(ctx,flash,560,220,'#ffe49e',27);
  label(ctx,'J 出拳   E 踢击   C 防守   R 满能量破阵',560,582,'#e5e8df',17);
  if(s.phase!=='fight'){
   ctx.fillStyle='rgba(7,16,29,.75)';ctx.fillRect(275,258,570,187);
   label(ctx,s.phase==='match-end'?(s.won?'试炼胜利':'对手获胜'):'回合结束',560,310,s.won?'#7fe6d0':'#ffdb96',32);
   label(ctx,s.wins[0]+' : '+s.wins[1]+'  ·  最高 '+s.bestCombo+' 连击',560,361,'#f5e8ce',20);
   label(ctx,s.phase==='round-end'?'点击下方「下一回合」':'点击下方「再战一次」',560,413,'#c8d5de',17);
  }
 }
 return {tick,draw,getState:()=>structuredClone(s),getStatus:()=>({goal:s.phase==='fight'?'读预兆，控制距离，赢下两回合':s.won?'钟楼试炼完成':'继续试炼',message:'橙色预兆之后会出招。C 格挡积攒能量，跳跃可以换边；J 可按住连击，E 踢击距离更远。',stats:['比分 '+s.wins.join(' : '),'生命 '+Math.ceil(s.hero.hp),'能量 '+Math.floor(s.hero.meter)+'%','格挡 '+s.blocks,'最高连击 '+s.bestCombo],actions:s.phase==='fight'?[action('出拳 J',()=>attack(s.hero,'jab')),action('踢击 E',()=>attack(s.hero,'kick')),action('防守 C',()=>{if(!s.hero.attack)s.hero.guard=.7}),action('破阵 R',()=>attack(s.hero,'skill'),s.hero.meter<100)]:s.phase==='round-end'?[action('下一回合',nextRound)]:[action('再战一次',replay)]}),dispose(){particles=[]}};
}
