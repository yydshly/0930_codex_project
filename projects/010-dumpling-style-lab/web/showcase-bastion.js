import {W,H,clamp,images,canvasSurface,cover,sprite,shadow,glow,label,action,safeSaved} from './showcase-core.js';

export const TOWER_TYPES={bolt:{name:'连弩',cost:90,range:192,damage:18,interval:.72,color:'#f6d38d'},frost:{name:'霜塔',cost:80,range:167,damage:8,interval:1.05,color:'#8befec'},mortar:{name:'迫击',cost:120,range:231,damage:28,interval:1.65,color:'#ffa480'}};
// These points follow the center of the generated cobblestone road, including its curved corners.
export const BASTION_PATH=[[-20,288],[269,288],[294,278],[309,255],[309,187],[321,172],[341,163],[475,163],[492,172],[503,191],[503,346],[514,365],[538,382],[716,383],[740,377],[759,356],[763,254],[775,235],[793,225],[997,224],[1075,214],[1138,214]];
export const BASTION_PADS=[{x:174,y:236},{x:253,y:338},{x:398,y:224},{x:571,y:290},{x:676,y:326},{x:830,y:287},{x:724,y:177},{x:943,y:279}];
export async function createBastion({host,input,saved,notify,sfx}){
 const [scene,art]=await Promise.all([images(['scene'],'assets/game-forms/bastion/'),images(['bolt','frost','mortar','beetle'],'assets/game-forms/strategy/')]),{ctx}=canvasSurface(host);
 const segments=BASTION_PATH.slice(1).map((p,i)=>Math.hypot(p[0]-BASTION_PATH[i][0],p[1]-BASTION_PATH[i][1])),length=segments.reduce((a,b)=>a+b,0);
 const at=progress=>{let d=clamp(progress,0,length);for(let i=0;i<segments.length;i++){if(d<=segments[i]){const p=BASTION_PATH[i],q=BASTION_PATH[i+1],t=d/segments[i];return {x:p[0]+(q[0]-p[0])*t,y:p[1]+(q[1]-p[1])*t,face:q[0]<p[0]?-1:1}}d-=segments[i]}return {x:1138,y:214,face:1}};
 const defaults={gold:260,lives:15,wave:0,phase:'build',towers:[],enemies:[],spawned:0,nextId:1,spawnTime:0,time:0,kills:0,leaks:0,hits:0,splashHits:0,score:0,buildKind:'bolt',selectedPad:null,won:false,checkpoint:null};
 let s=safeSaved(saved,defaults),shots=[],particles=[],flash='先选择塔，再点击发光部署点',flashTime=3;
 function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;particles.push({x,y,vx:Math.cos(a)*70,vy:Math.sin(a)*70,life:.45,color})}}
 function deploy(index){
  if(s.phase==='down'||s.won)return;s.selectedPad=index;const exists=s.towers.find(t=>t.pad===index);if(exists)return;const type=TOWER_TYPES[s.buildKind];
  if(s.gold<type.cost){notify('资金不足。可以等击退敌人获得资金，或选择另一种塔。');return}
  s.gold-=type.cost;s.towers.push({pad:index,kind:s.buildKind,level:1,cd:0,shots:0});burst(BASTION_PADS[index].x,BASTION_PADS[index].y,'#a4f6dc');sfx('build');flash=type.name+'部署';flashTime=1;
 }
 function selected(){return s.towers.find(t=>t.pad===s.selectedPad)}
 function upgrade(){const t=selected();if(!t||t.level>=3||s.gold<t.level*60||s.won||s.phase==='down')return;s.gold-=t.level*60;t.level++;sfx('build');flash='升级至 '+t.level+' 级';flashTime=1}
 function sell(){const t=selected();if(!t||s.won||s.phase==='down')return;s.gold+=Math.floor(TOWER_TYPES[t.kind].cost*.65+(t.level-1)*35);s.towers=s.towers.filter(a=>a!==t);sfx('cards')}
 function checkpoint(){return {gold:s.gold,lives:s.lives,wave:s.wave,towers:structuredClone(s.towers),kills:s.kills,leaks:s.leaks,hits:s.hits,splashHits:s.splashHits,score:s.score,buildKind:s.buildKind,selectedPad:s.selectedPad}}
 function launch(){if(s.phase!=='build'||s.won)return;if(!s.towers.length){notify('先部署至少一座塔，再放行敌群。');return}s.checkpoint=checkpoint();s.wave++;s.phase='wave';s.spawned=0;s.spawnTime=0;s.enemies=[];flash='第 '+s.wave+' 波进入石路';flashTime=1.5;sfx('door')}
 function retry(){if(!s.checkpoint)return;const cp=structuredClone(s.checkpoint);s={...structuredClone(defaults),...cp,checkpoint:cp};shots=[];particles=[];flash='回到本波前 · 可以调整部署';flashTime=2}
 function replay(){s=structuredClone(defaults);shots=[];particles=[];flash='新的防线';flashTime=2}
 const count=()=>s.wave===5?12:5+s.wave;
 function tick(dt){
  s.time+=dt;flashTime=Math.max(0,flashTime-dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  if(s.won||s.phase==='down')return;
  for(const p of input.pointers){const index=BASTION_PADS.findIndex(t=>Math.hypot(p.x-t.x,p.y-t.y)<31);if(index>=0)deploy(index)}
  if(input.pressed.has('Space')||input.pressed.has('KeyE'))launch();if(input.pressed.has('KeyR'))upgrade();
  if(s.phase!=='wave')return;
  s.spawnTime-=dt;if(s.spawned<count()&&s.spawnTime<=0){const boss=s.wave===5&&s.spawned===count()-1,hp=boss?240:19+s.wave*7;s.enemies.push({id:s.nextId++,d:0,hp,maxHp:hp,boss,speed:boss?48:64+s.wave*3,slow:0});s.spawned++;s.spawnTime=.87}
  for(const e of s.enemies){e.slow=Math.max(0,e.slow-dt);e.d+=e.speed*dt*(e.slow>0?e.boss?.75:.52:1);if(e.d>=length&&e.hp>0){e.hp=0;e.leaked=true;s.lives-=e.boss?3:1;s.leaks++;flash='防线被突破';flashTime=.8;sfx('hurt')}}
  for(const t of s.towers){t.cd=Math.max(0,t.cd-dt);if(t.cd>0)continue;const cfg=TOWER_TYPES[t.kind],pad=BASTION_PADS[t.pad],range=cfg.range+(t.level-1)*18,target=s.enemies.filter(e=>e.hp>0&&Math.hypot(at(e.d).x-pad.x,at(e.d).y-pad.y)<=range).sort((a,b)=>b.d-a.d)[0];if(!target)continue;t.cd=cfg.interval/(1+(t.level-1)*.13);t.shots++;shots.push({x:pad.x,y:pad.y-48,start:{x:pad.x,y:pad.y-48},target:target.id,kind:t.kind,level:t.level,life:0});sfx(t.kind==='frost'?'water':'shot')}
  for(const shot of shots){const e=s.enemies.find(e=>e.id===shot.target&&e.hp>0);if(!e){shot.dead=true;continue}const p=at(e.d),dx=p.x-shot.x,dy=p.y-11-shot.y,d=Math.hypot(dx,dy);shot.life+=dt;if(d<13){shot.dead=true;const cfg=TOWER_TYPES[shot.kind],damage=cfg.damage*(1+(shot.level-1)*.6),victims=shot.kind==='mortar'?s.enemies.filter(v=>v.hp>0&&Math.abs(v.d-e.d)<82):[e];if(shot.kind==='mortar')s.splashHits+=Math.max(0,victims.length-1);for(const v of victims){v.hp=Math.max(0,v.hp-damage);if(shot.kind==='frost')v.slow=1.65;s.hits++;if(v.hp===0){s.kills++;s.gold+=v.boss?60:12;s.score+=v.boss?500:100}}burst(p.x,p.y,cfg.color,shot.kind==='mortar'?24:9)}else{shot.x+=dx/d*430*dt;shot.y+=dy/d*430*dt}}
  shots=shots.filter(p=>!p.dead);s.enemies=s.enemies.filter(e=>e.hp>0);
  if(s.lives<=0){s.lives=0;s.phase='down';shots=[];notify('城门防线中断，可回到本波之前重新部署。');return}
  if(s.spawned===count()&&s.enemies.length===0){s.gold+=35;s.phase='build';shots=[];flash='第 '+s.wave+' 波守住 · 获得 35 资金';flashTime=2;sfx('success');if(s.wave===5){s.won=true;s.phase='won';s.score+=s.lives*100;notify('五波防守完成。部署位置、射程、减速与范围火力共同改变敌群行进。')}}
 }
 function draw(){
  cover(ctx,scene.scene);ctx.fillStyle='#07161b14';ctx.fillRect(0,0,W,H);
  const hovered=input.hover?BASTION_PADS.findIndex(p=>Math.hypot(input.hover.x-p.x,input.hover.y-p.y)<31):-1,focus=hovered>=0?hovered:s.selectedPad;
  if(focus!==null&&focus>=0){const t=s.towers.find(t=>t.pad===focus),cfg=TOWER_TYPES[t?.kind||s.buildKind],p=BASTION_PADS[focus];ctx.fillStyle=cfg.color+'0d';ctx.strokeStyle=cfg.color+'80';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(p.x,p.y,cfg.range+((t?.level||1)-1)*18,0,Math.PI*2);ctx.fill();ctx.stroke()}
  for(let i=0;i<BASTION_PADS.length;i++){const p=BASTION_PADS[i],t=s.towers.find(t=>t.pad===i);ctx.fillStyle=t?'#1c333477':'#152f36bb';ctx.strokeStyle=s.selectedPad===i?'#ffdda0':'#a7dace';ctx.lineWidth=s.selectedPad===i?2.5:1.5;ctx.beginPath();ctx.ellipse(p.x,p.y+5,25,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();if(t){shadow(ctx,p.x,p.y+6,27);sprite(ctx,art[t.kind],p.x,p.y+6,82+(t.level-1)*4);ctx.fillStyle='#ffe4ac';for(let star=0;star<t.level;star++){ctx.beginPath();ctx.arc(p.x+(star-(t.level-1)/2)*8,p.y+19,2.4,0,Math.PI*2);ctx.fill()}}else{ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#d9eee3';ctx.fillText(String(i+1),p.x,p.y+4)}}
  for(const e of [...s.enemies].sort((a,b)=>at(a.d).y-at(b.d).y)){const p=at(e.d);shadow(ctx,p.x,p.y+9,e.boss?27:13);if(e.slow>0)glow(ctx,p.x,p.y,35,'#8bf4fa66');sprite(ctx,art.beetle,p.x,p.y+16,e.boss?69:37,p.face<0);const w=e.boss?55:31;ctx.fillStyle='#132321';ctx.fillRect(p.x-w/2,p.y-(e.boss?54:26),w,4);ctx.fillStyle=e.boss?'#f7ae70':'#e5a8cd';ctx.fillRect(p.x-w/2,p.y-(e.boss?54:26),w*e.hp/e.maxHp,4)}
  for(const p of shots){const cfg=TOWER_TYPES[p.kind];glow(ctx,p.x,p.y,12,cfg.color+'77');ctx.fillStyle=cfg.color;ctx.beginPath();ctx.arc(p.x,p.y,p.kind==='mortar'?5:3,0,Math.PI*2);ctx.fill()}
  for(const p of particles){ctx.fillStyle=p.color;ctx.globalAlpha=p.life/.45;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
  ctx.fillStyle='rgba(8,27,29,.88)';ctx.fillRect(24,24,450,84);ctx.fillStyle='#f5e1b3';ctx.textAlign='left';ctx.font='bold 23px "Microsoft YaHei",sans-serif';ctx.fillText('暮林守望',44,59);ctx.fillStyle='#bddcd6';ctx.font='16px sans-serif';ctx.fillText('城门 '+s.lives+'   资金 '+s.gold+'   波次 '+s.wave+'/5   击退 '+s.kills,44,88);
  label(ctx,s.phase==='build'?'部署与升级 → 空格开始下一波':'路线推进 → 防御塔持续拦截',830,57,'#e8dcb7',16);
  if(flashTime>0)label(ctx,flash,560,554,'#fff0bd',20);
  const t=selected();label(ctx,t?TOWER_TYPES[t.kind].name+' '+t.level+' 级 · R 升级':'当前部署：'+TOWER_TYPES[s.buildKind].name+' · '+TOWER_TYPES[s.buildKind].cost+' 资金',560,601,'#d5e8df',16);
  if(s.won||s.phase==='down'){ctx.fillStyle='rgba(7,24,28,.94)';ctx.fillRect(315,212,490,227);label(ctx,s.won?'暮林防线守住':'城门防线中断',560,273,s.won?'#a0f3ce':'#ffbd9d',30);label(ctx,'击退 '+s.kills+' · 突破 '+s.leaks+' · '+s.score+' 分',560,334,'#fae1b0',21);label(ctx,s.won?'下方可以再守一次':'回到本波前，重新安排塔的组合',560,395,'#c8dedb',17)}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),path:BASTION_PATH,pads:BASTION_PADS,length,types:TOWER_TYPES}),getStatus:()=>{const t=selected();return {goal:s.won?'五波防线完成':s.phase==='down'?'回到本波前调整防线':s.phase==='build'?'布置防御，准备第 '+(s.wave+1)+' 波':'拦截第 '+s.wave+' 波敌群',message:'先选塔，再点发光部署点。连弩稳定输出，霜塔减速，迫击造成范围伤害。点已建的塔可看射程、升级或回收；敌人沿石路驶向城门。',stats:['城门 '+s.lives,'资金 '+s.gold,'波次 '+s.wave+'/5','击退 '+s.kills,'突破 '+s.leaks],actions:s.won?[action('再守一次',replay)]:s.phase==='down'?[action('回到本波前',retry),action('重新部署',replay)]:[...Object.entries(TOWER_TYPES).map(([kind,cfg])=>action(cfg.name+' · '+cfg.cost+(s.buildKind===kind?' ✓':''),()=>{s.buildKind=kind})),...(t?[action('升级 '+t.level*60+' · R',upgrade,t.level>=3||s.gold<t.level*60),action('回收此塔',sell)]:[]),action('开始第 '+(s.wave+1)+' 波',launch,s.phase!=='build')]}},dispose(){shots=[];particles=[]}};
}
