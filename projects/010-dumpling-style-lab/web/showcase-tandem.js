import {W,H,images,canvasSurface,cover,shadow,glow,action,safeSaved,clamp} from './showcase-core.js';

export const TANDEM_RULES=Object.freeze({speed:196,gravity:1200,jump:435,bodyWidth:32,bodyHeight:86,chargeSeconds:1.6,bridgeSeconds:11});
export const TANDEM_LEVELS=Object.freeze([
 {name:'01 / 分工开门',hint:'P1 留在青色压板上，P2 跳过设备箱，穿过门，到右侧锁定通路。',floor:[{x:20,y:520,w:1080,h:70}],obstacles:[{x:442,y:484,w:55,h:36}],plates:[{x:330,y:520,w:62,player:0}],gate:{x:600,y:288,w:25,h:232},latch:{x:812,y:520,w:56},exit:{x:987,y:520,w:89},starts:[{x:115,y:520},{x:210,y:520}]},
 {name:'02 / 同步灯桥',hint:'P1 与 P2 分别站上两块压板，共同充能 1.6 秒。灯桥维持 11 秒，两人一起穿过峡谷。',floor:[{x:20,y:520,w:570,h:70},{x:870,y:520,w:230,h:70}],obstacles:[],plates:[{x:328,y:520,w:62,player:0},{x:448,y:520,w:62,player:1}],gap:{x:590,y:520,w:280},bridge:{x:590,y:520,w:280,h:22},exit:{x:987,y:520,w:89},starts:[{x:115,y:520},{x:210,y:520}]}
]);
const NAMES=['P1 · 林岚','P2 · 周衡'],COLORS=['#77e5e5','#f4c278'];
const fresh=level=>({version:1,level,players:TANDEM_LEVELS[level].starts.map((p,i)=>({...p,vx:0,vy:0,grounded:true,facing:1,id:i})),phase:'play',won:false,elapsed:0,failures:0,restarts:0,completed:[],gateLatched:false,charge:0,bridgeTimer:0,bridgeActivations:0,score:0,message:TANDEM_LEVELS[level].hint});

export async function createTandem({host,input,saved,notify,sfx}){
 const art=await images(['scene','lin','zhou'],'assets/game-forms/tandem/'),{ctx,element}=canvasSurface(host);
 element.setAttribute('aria-label','同步灯桥，本地双人合作。P1 用 A、D 移动，W 或空格跳跃；P2 用方向键左右移动，上键跳跃。两人分别控制角色，共同开启机关，并一起抵达出口。');
 let s=safeSaved(saved,fresh(0));if(!Number.isInteger(s.level)||s.level<0||s.level>1)s=fresh(0);
 if(!Array.isArray(s.players)||s.players.length!==2||s.players.some(p=>!p||![p.x,p.y,p.vx,p.vy].every(Number.isFinite)))s=fresh(s.level);
 s.players=s.players.map((p,i)=>({...p,x:clamp(p.x,36,1084),id:i,grounded:!!p.grounded,facing:p.facing<0?-1:1}));
 if(!Array.isArray(s.completed))s.completed=[];if(!['play','cleared','won'].includes(s.phase))s.phase='play';s.won=s.phase==='won'&&s.level===1;
 const abort=new AbortController(),pointerCodes=new Map(),held=new Set(),tapped=new Set();let active=false,time=0,flash=0;
 const playerFrame=host.closest('.player-frame')||host;playerFrame.classList.add('tandem-frame');
 const localStyle=document.createElement('style');localStyle.textContent='.tandem-pads{position:absolute;bottom:3px;left:5px;right:5px;display:flex;justify-content:space-between;gap:12px;z-index:3;touch-action:none}.tandem-pad{display:flex;gap:4px;position:relative;padding-top:18px}.tandem-pad small{position:absolute;left:4px;top:0;font-size:10px;letter-spacing:.08em;color:var(--pad-color)}.tandem-pad button{touch-action:none;user-select:none;min-height:44px;min-width:44px;padding:4px 8px;border-color:var(--pad-color);background:#0d2332ee;color:var(--pad-color);font-size:17px}.tandem-pad button[aria-pressed=true]{background:var(--pad-color);color:#071923;box-shadow:0 0 13px var(--pad-color)}.tandem-pad button:disabled{opacity:.45}@media(max-width:760px){.tandem-frame{padding-bottom:74px}}@media(min-width:761px){.tandem-pads{display:none}}';host.append(localStyle);
 const pads=document.createElement('div');pads.className='tandem-pads';pads.setAttribute('aria-label','两位玩家独立触控');
 [['P1 · 林岚','KeyA','KeyD','KeyW'],['P2 · 周衡','ArrowLeft','ArrowRight','ArrowUp']].forEach((codes,i)=>{const group=document.createElement('div');group.className='tandem-pad';group.style.setProperty('--pad-color',COLORS[i]);group.dataset.player=String(i+1);const label=document.createElement('small');label.textContent=codes[0];group.append(label);codes.slice(1).forEach((code,j)=>{const b=document.createElement('button');b.type='button';b.textContent=['←','→','↑'][j];b.dataset.coopKey=code;b.setAttribute('aria-label',codes[0]+['向左','向右','跳跃'][j]);b.setAttribute('aria-pressed','false');b.disabled=true;b.addEventListener('pointerdown',e=>{e.preventDefault();if(!active||s.phase!=='play')return;pointerCodes.set(e.pointerId,code);held.add(code);tapped.add(code);b.setPointerCapture(e.pointerId);b.setAttribute('aria-pressed','true')},{signal:abort.signal});const release=e=>{pointerCodes.delete(e.pointerId);if(![...pointerCodes.values()].includes(code)){held.delete(code);b.setAttribute('aria-pressed','false')}};for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,release,{signal:abort.signal});group.append(b)});pads.append(group)});playerFrame.append(pads);
 const level=()=>TANDEM_LEVELS[s.level],down=k=>input.keys.has(k)||held.has(k),pressed=k=>input.pressed.has(k)||tapped.has(k);
 function clearPads(){pointerCodes.clear();held.clear();tapped.clear();pads.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'))}
 window.addEventListener('blur',clearPads,{signal:abort.signal});
 function say(message,sound='turn'){s.message=message;if(sound)sfx(sound)}
 function heldPlate(plate){const p=s.players[plate.player];return p.grounded&&Math.abs(p.y-plate.y)<2&&p.x>=plate.x&&p.x<=plate.x+plate.w}
 const gateOpen=()=>s.gateLatched||heldPlate(level().plates[0]);
 function resetLevel(failure=false){const keep={elapsed:s.elapsed,failures:s.failures+(failure?1:0),restarts:s.restarts+(failure?0:1),completed:[...s.completed],bridgeActivations:s.bridgeActivations};s={...fresh(s.level),...keep};clearPads();flash=.8;sfx(failure?'hurt':'shuffle');s.message=failure?'有人落入峡谷。两位工程师已回到这一间的安全检查点。':level().hint}
 function next(){if(s.phase!=='cleared')return;const keep={elapsed:s.elapsed,failures:s.failures,restarts:s.restarts,completed:[...s.completed],score:s.score};s={...fresh(1),...keep};clearPads();sfx('door')}
 function replay(){s=fresh(0);clearPads();sfx('shuffle')}
 function solids(){const l=level();return [...l.floor,...l.obstacles,...(s.level===0&&!gateOpen()?[l.gate]:[]),...(s.level===1&&s.bridgeTimer>0?[l.bridge]:[])]}
 function movePlayer(p,axis,jump,dt){
  const r=TANDEM_RULES,half=r.bodyWidth/2,colliders=solids();p.vx=axis*r.speed;if(axis)p.facing=axis;
  if(jump&&p.grounded){p.vy=-r.jump;p.grounded=false;sfx('jump')}
  const oldX=p.x,oldY=p.y;let nx=clamp(p.x+p.vx*dt,36,1084);
  for(const b of colliders){if(p.y>b.y+.5&&p.y-r.bodyHeight<b.y+b.h-.5&&nx+half>b.x&&nx-half<b.x+b.w){if(axis>0&&oldX+half<=b.x+.5)nx=b.x-half;else if(axis<0&&oldX-half>=b.x+b.w-.5)nx=b.x+b.w+half}}
  p.x=nx;p.vy+=r.gravity*dt;let ny=p.y+p.vy*dt;p.grounded=false;
  for(const b of colliders){if(p.x+half<=b.x||p.x-half>=b.x+b.w)continue;if(p.vy>=0&&oldY<=b.y+.5&&ny>=b.y){ny=b.y;p.vy=0;p.grounded=true}else if(p.vy<0&&oldY-r.bodyHeight>=b.y+b.h-.5&&ny-r.bodyHeight<b.y+b.h){ny=b.y+b.h+r.bodyHeight;p.vy=0}}
  p.y=ny;
 }
 function tick(dt){
  if(!active||s.phase!=='play'){tapped.clear();return}s.elapsed+=dt;time+=dt;flash=Math.max(0,flash-dt);
  if(pressed('KeyR')){resetLevel();return}
  if(s.level===1){s.bridgeTimer=Math.max(0,s.bridgeTimer-dt);const both=level().plates.every(heldPlate);if(both){s.charge=Math.min(TANDEM_RULES.chargeSeconds,s.charge+dt);if(s.charge>=TANDEM_RULES.chargeSeconds){if(s.bridgeTimer<=0){s.bridgeActivations++;say('同步完成，灯桥开启。两人一起通过；离开压板后还有 11 秒。','door')}s.bridgeTimer=TANDEM_RULES.bridgeSeconds}}else s.charge=0}
  const axes=[Number(down('KeyD'))-Number(down('KeyA')),Number(down('ArrowRight'))-Number(down('ArrowLeft'))],jumps=[pressed('KeyW')||pressed('Space'),pressed('ArrowUp')];
  s.players.forEach((p,i)=>movePlayer(p,axes[i],jumps[i],dt));tapped.clear();
  if(s.players.some(p=>p.y>H+100)){resetLevel(true);return}
  if(s.level===0&&!s.gateLatched){const p=s.players[1],l=level().latch;if(p.grounded&&p.x>=l.x&&p.x<=l.x+l.w){s.gateLatched=true;say('P2 已锁定通路。P1 可以离开压板，两人前往右侧出口。','pickup')}}
  const reached=s.players.map(p=>p.grounded&&p.x>=level().exit.x&&p.y===520);
  if(reached.every(Boolean)){
   if(!s.completed.includes(s.level))s.completed.push(s.level);s.won=s.level===1;s.phase=s.won?'won':'cleared';s.score=s.completed.length*600+Math.max(0,300-s.failures*40);clearPads();sfx('success');s.message=s.won?'两位工程师同时抵达，观测站的灯桥恢复运行。':'分工开门完成。下一间需要两人同时给灯桥充能。';notify(s.message)
  }else if(reached.some(Boolean))s.message='一位工程师已抵达。出口需要两人一起进入。';
 }
 function text(txt,x,y,size=16,color='#dce9e9',align='left'){ctx.font=`${size}px "Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(txt,x,y)}
 function panel(x,y,w,h,fill='#08202bdc'){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#88b2bc50';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1)}
 function platform(b,bridge=false){const g=ctx.createLinearGradient(0,b.y,0,b.y+b.h);g.addColorStop(0,bridge?'#7ad1d7':'#9ba7a8');g.addColorStop(.13,bridge?'#27787d':'#3f525d');g.addColorStop(1,'#15252e');ctx.fillStyle=g;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle=bridge?'#cbfcf6':'#c6cac2';ctx.fillRect(b.x,b.y,b.w,3);ctx.strokeStyle='#081922aa';ctx.lineWidth=2;for(let x=b.x+14;x<b.x+b.w;x+=37){ctx.beginPath();ctx.moveTo(x,b.y+10);ctx.lineTo(x+18,b.y+b.h-5);ctx.stroke()}if(bridge){ctx.strokeStyle='#87e8e66b';for(let x=b.x+8;x<b.x+b.w;x+=28){ctx.beginPath();ctx.moveTo(x,b.y+5);ctx.lineTo(x,b.y+17);ctx.stroke()}}}
 function engineer(p,bob){const im=p.id===0?art.lin:art.zhou,source=p.id===0?[348,0,252,900]:[74,3,286,893],height=116,width=height*source[2]/source[3];ctx.save();ctx.translate(p.x,p.y+bob);if(p.facing<0)ctx.scale(-1,1);ctx.drawImage(im,...source,-width/2,-height,width,height);ctx.restore()}
 function draw(){
  cover(ctx,art.scene);ctx.fillStyle='#06172546';ctx.fillRect(0,0,W,H);const l=level();
  panel(32,24,1056,77);text('同步灯桥',55,62,27,'#f0e5cd');text('本地双人合作',55,86,12,'#9cbfc3');text(l.name,560,66,22,'#e4eee4','center');text('检查点 '+(s.level+1)+' / 2',1067,61,17,'#d0d9d5','right');text('两位玩家同时操作',1067,85,12,'#9ebbc1','right');
  panel(40,122,297,71);text('P1  林岚',58,151,18,COLORS[0]);text('A / D 移动 · W / 空格跳跃',58,178,14,'#cbdbdf');panel(783,122,297,71);text('P2  周衡',802,151,18,COLORS[1]);text('← / → 移动 · ↑ 跳跃',802,178,14,'#e1d8c4');
  if(s.level===1){ctx.fillStyle='#051323a0';ctx.fillRect(l.gap.x,l.gap.y,l.gap.w,110);glow(ctx,730,573,140,'#49767d38');if(s.bridgeTimer>0){glow(ctx,730,505,170,'#4ac5c345');platform(l.bridge,true)}else{ctx.save();ctx.strokeStyle='#96d1ce4b';ctx.setLineDash([10,11]);ctx.strokeRect(l.bridge.x,l.bridge.y,l.bridge.w,l.bridge.h);ctx.restore()}panel(430,222,260,57);text(s.bridgeTimer>0?'灯桥  '+s.bridgeTimer.toFixed(1)+' 秒':'两块压板需要同时受压',560,246,16,s.bridgeTimer>0?'#a9f5e5':'#d4dfdc','center');ctx.fillStyle='#395564';ctx.fillRect(450,261,220,4);ctx.fillStyle='#93e8e3';ctx.fillRect(450,261,220*s.charge/TANDEM_RULES.chargeSeconds,4)}
  l.floor.forEach(b=>platform(b));l.obstacles.forEach(b=>{platform(b);ctx.fillStyle='#d5a362';ctx.fillRect(b.x+5,b.y+4,b.w-10,4);text('跨越',b.x+b.w/2,b.y-10,12,'#e1cfa8','center')});
  for(const plate of l.plates){const on=heldPlate(plate),color=COLORS[plate.player];if(on)glow(ctx,plate.x+plate.w/2,513,72,color+'62');ctx.fillStyle='#172e35';ctx.fillRect(plate.x-5,514,plate.w+10,9);ctx.fillStyle=on?color:'#4b707b';ctx.fillRect(plate.x,514,plate.w,4);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(plate.x,504,plate.w,17);text('P'+(plate.player+1)+' 压板',plate.x+plate.w/2,555,13,color,'center');ctx.save();ctx.strokeStyle=on?color:'#63969a55';ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(plate.x+plate.w/2,569);ctx.lineTo(s.level===0?611:590,569);ctx.stroke();ctx.restore()}
  if(s.level===0){const g=l.gate,open=gateOpen();ctx.strokeStyle='#67919a';ctx.lineWidth=8;ctx.strokeRect(g.x-7,g.y-8,g.w+14,g.h+8);if(!open){const grad=ctx.createLinearGradient(g.x,0,g.x+g.w,0);grad.addColorStop(0,'#557180');grad.addColorStop(.5,'#98adb0');grad.addColorStop(1,'#365365');ctx.fillStyle=grad;ctx.fillRect(g.x,g.y,g.w,g.h);for(let y=g.y+8;y<520;y+=21){ctx.fillStyle='#28424d';ctx.fillRect(g.x+3,y,g.w-6,4)}}else{glow(ctx,g.x+12,395,80,'#75dcdb33');ctx.fillStyle='#81efdf';ctx.fillRect(g.x-7,g.y-8,g.w+14,7)}text(open?(s.gateLatched?'通路锁定':'P1 开门中'):'P1 压板开门',g.x+13,g.y-29,14,open?'#a9f2df':'#d7dfdb','center');const latch=l.latch;ctx.fillStyle=s.gateLatched?'#ffc775':'#947c60';ctx.fillRect(latch.x,514,latch.w,6);text('P2 锁定台',latch.x+latch.w/2,555,13,COLORS[1],'center')}
  const exit=l.exit;glow(ctx,exit.x+exit.w/2,420,85,'#c2daab25');ctx.fillStyle='#d0dba620';ctx.fillRect(exit.x,322,exit.w,198);ctx.strokeStyle='#c8d7af';ctx.lineWidth=2;ctx.strokeRect(exit.x,322,exit.w,198);text('共同出口',exit.x+exit.w/2,306,15,'#dfedc3','center');text('P1 + P2',exit.x+exit.w/2,549,12,'#c4d7b5','center');
  for(const p of s.players){shadow(ctx,p.x,p.y,24);const walking=Math.abs(p.vx)>0&&p.grounded,bob=walking?Math.sin(time*13)*2:Math.sin(time*2+p.id)*.6;glow(ctx,p.x,p.y-51,40,COLORS[p.id]+'16');engineer(p,bob);ctx.fillStyle=COLORS[p.id];ctx.fillRect(p.x-17,p.y-1,34,3);text('P'+(p.id+1),p.x,p.y-126,13,COLORS[p.id],'center')}
  panel(40,590,1040,28,'#081d2cec');text(s.message,560,610,13,'#dae6db','center');
  if(flash>0){ctx.fillStyle='#dba472'+Math.round(flash/0.8*60).toString(16).padStart(2,'0');ctx.fillRect(0,0,W,H)}
  if(s.phase!=='play'){panel(313,214,494,219,'#061d2af2');text(s.won?'灯桥恢复运行':'第一间合作完成',560,265,28,'#d5eed5','center');text('两位工程师均已抵达出口',560,307,19,'#ccdfdf','center');text('协作 '+s.completed.length+'/2 · 检查点回退 '+s.failures+' 次',560,344,15,'#aecbd0','center');text(s.won?'点击下方「重新协作」再玩一遍':'点击下方「进入同步灯桥」继续',560,395,15,'#e3c78f','center')}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),levels:structuredClone(TANDEM_LEVELS),rules:{...TANDEM_RULES},platesHeld:level().plates.map(heldPlate),gateOpen:s.level===0?gateOpen():null,exitReached:s.players.map(p=>p.grounded&&p.x>=level().exit.x&&p.y===520),touchHeld:[...held],active}),getStatus:()=>({goal:s.won?'同步灯桥恢复运行':s.phase==='cleared'?'分工开门完成':s.level===0?'一人开门，一人锁定通路':'两人共同充能，再一起通过灯桥',message:s.message,stats:['协作关卡 '+(s.level+1)+'/2','两位玩家独立操作','通路 '+(s.level===0?(s.gateLatched?'已锁定':gateOpen()?'受压开启':'未开启'):(s.bridgeTimer>0?s.bridgeTimer.toFixed(1)+' 秒':'等待充能')),'回退 '+s.failures+' 次'],actions:s.won?[action('重新协作',replay)]:s.phase==='cleared'?[action('进入同步灯桥',next),action('重试当前检查点',()=>resetLevel())]:[action('重试当前检查点',()=>resetLevel()),action('协作提示',()=>say(level().hint,''))]}),setActive(value){if(active&&!value)clearPads();active=value;pads.querySelectorAll('button').forEach(b=>b.disabled=!value||s.phase!=='play')},dispose(){clearPads();abort.abort();element.remove();pads.remove();playerFrame.classList.remove('tandem-frame');localStyle.remove()}};
}
