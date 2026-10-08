import { W, H, clamp, images, canvasSurface, cover, glow, sprite, hash, action } from './showcase-core.js';

const CAMERA_NAMES = ['雨港码头', '机房通道', '灯塔入口', '图档室'];
const DURATION = 72;
const STAGES = ['waiting', 'quay', 'crossing', 'beacon', 'returning', 'safe'];
const VISITOR_STAGES = ['absent', 'quay', 'hall', 'departed'];
const finite = (n, fallback, min, max) => Number.isFinite(n) ? clamp(n, min, max) : fallback;

export function freshWatch(best = 0) {
 return { version: 1, elapsed: 0, power: 100, camera: 0, phase: 'watch', lamps: [false,false,false,false], shutter: false, backupUsed: false, beacon: 0, crew: {stage:'waiting', p:0, guided:0, safe:false}, visitor: {stage:'absent', p:0, blocked:0, lit:0, seen:false}, log:['港务电台：穿橙色雨衣的检修员正在靠岸。码头探照灯可以为他照路。'], announced: {crew:false, visitor:false, storm:false}, won:false, best, score:0, switches:0 };
}
export function sanitizeWatch(saved) {
 if(!saved || saved.version !== 1) return freshWatch();
 const d = freshWatch(finite(saved.best,0,0,10000)), s = {...d};
 for(const k of ['elapsed','power','camera','beacon','score','switches']) s[k] = finite(saved[k],d[k],0,k==='elapsed'?DURATION:k==='camera'?3:k==='beacon'?6:k==='power'?100:10000);
 s.camera = Math.floor(s.camera);s.phase=['watch','won','failed'].includes(saved.phase)?saved.phase:'watch';
 s.lamps=Array.from({length:4},(_,i)=>saved.lamps?.[i]===true);s.shutter=saved.shutter===true;s.backupUsed=saved.backupUsed===true;s.won=s.phase==='won';
 s.crew={stage:STAGES.includes(saved.crew?.stage)?saved.crew.stage:'waiting',p:finite(saved.crew?.p,0,0,1),guided:finite(saved.crew?.guided,0,0,3),safe:saved.crew?.safe===true};
 s.visitor={stage:VISITOR_STAGES.includes(saved.visitor?.stage)?saved.visitor.stage:'absent',p:finite(saved.visitor?.p,0,0,1),blocked:finite(saved.visitor?.blocked,0,0,9),lit:finite(saved.visitor?.lit,0,0,7),seen:saved.visitor?.seen===true};
 s.log=Array.isArray(saved.log)?saved.log.filter(v=>typeof v==='string').map(v=>v.slice(0,200)).slice(0,5):d.log;
 s.announced=Object.fromEntries(['crew','visitor','storm'].map(k=>[k,saved.announced?.[k]===true]));
 if(s.power===0&&s.phase==='watch'){s.lamps.fill(false);s.shutter=false;s.beacon=0}return s;
}
function note(s,text){s.log.unshift(text);s.log=s.log.slice(0,5)}
function fail(s,text){s.phase='failed';s.won=false;note(s,text)}
export function actWatch(s, command, value) {
 if(command==='camera'){const n=Math.floor(clamp(Number(value)||0,0,3));if(n!==s.camera)s.switches++;s.camera=n;return true}
 if(s.phase!=='watch')return false;
 if(command==='lamp'){if(s.power<=0)return false;s.lamps[s.camera]=!s.lamps[s.camera];return true}
 if(command==='shutter'){if(s.power<=0)return false;s.shutter=!s.shutter;note(s,s.shutter?'通道卷闸已落下。持续供电才能保持关闭。':'通道卷闸已升起。');return true}
 if(command==='beacon'){if(s.camera!==2||s.beacon>0||s.power<9)return false;s.power-=9;s.beacon=6;note(s,'灯塔发出六秒引导光。检修员正在寻找入口。');return true}
 if(command==='backup'){if(s.camera!==3||s.backupUsed)return false;s.backupUsed=true;s.power=Math.min(100,s.power+22);note(s,'旁路电池已接入：恢复 22% 电力，本班只能使用一次。');return true}
 return false;
}
export function advanceWatch(s,dt){
 if(s.phase!=='watch'||!Number.isFinite(dt)||dt<=0)return;
 // Substeps keep encounters identical for a paused tab and a normal render loop.
 let left=Math.min(dt,10);while(left>0&&s.phase==='watch'){const h=Math.min(.05,left);step(s,h);left-=h}
}
function step(s,dt){
 s.elapsed=Math.min(DURATION,s.elapsed+dt);s.beacon=Math.max(0,s.beacon-dt);
 s.power=Math.max(0,s.power-dt*(.16+s.lamps.filter(Boolean).length*.54+(s.shutter?.72:0)+(s.beacon>0?.35:0)));
 if(s.power<=0){s.lamps.fill(false);s.shutter=false;s.beacon=0}
 if(s.elapsed>=11&&!s.announced.crew){s.announced.crew=true;s.crew.stage='quay';note(s,'码头出现橙色雨衣：照亮码头两秒，为检修员引路。')}
 if(s.crew.stage==='quay'&&s.lamps[0]){s.crew.guided=Math.min(3,s.crew.guided+dt);if(s.crew.guided>=2){s.crew.stage='crossing';s.crew.p=0;note(s,'检修员确认了通路，正在前往灯塔。切换 03，发出引导光。')}}
 if(s.crew.stage==='crossing'){s.crew.p=Math.min(1,s.crew.p+dt/13);if(s.crew.p>=1){s.crew.stage='beacon';s.crew.p=0;s.crew.guided=0;note(s,'检修员已到灯塔台阶。发出引导光三秒，他就能找到入口。')}}
 if(s.crew.stage==='beacon'&&s.beacon>0){s.crew.guided=Math.min(3,s.crew.guided+dt);if(s.crew.guided>=3){s.crew.stage='returning';s.crew.p=0;note(s,'检修员看到引导光，正在进入灯塔。')}}
 if(s.crew.stage==='returning'){s.crew.p=Math.min(1,s.crew.p+dt/8);if(s.crew.p>=1){s.crew.stage='safe';s.crew.safe=true;note(s,'检修员已安全到站。继续保护机房，等待本班交接。')}}
 if(s.elapsed>=25&&!s.announced.visitor){s.announced.visitor=true;s.visitor.stage='quay';note(s,'码头传来脚步声。第二个身影没有橙色雨衣，请查看来访路线。')}
 if(s.visitor.stage==='quay'){
  if(s.camera===0){s.visitor.seen=true}
  const lit=s.lamps[0]&&s.visitor.lit<7;
  if(lit)s.visitor.lit=Math.min(7,s.visitor.lit+dt);
  s.visitor.p=Math.min(1,s.visitor.p+dt/(lit?34:12));
  if(s.visitor.p>=1){s.visitor.stage='hall';s.visitor.p=0;note(s,'无标识来访者进入机房通道。落下卷闸，保护发电机。')}
 }
 if(s.visitor.stage==='hall'){
  if(s.shutter&&s.visitor.p>=.23&&s.visitor.p<=.27){s.visitor.blocked=Math.min(9,s.visitor.blocked+dt);if(s.visitor.blocked>=9){s.visitor.stage='departed';note(s,'来访者在卷闸外停留后离开。现在可以升起卷闸，节省电力。')}}
  else s.visitor.p=Math.min(1,s.visitor.p+dt/(s.lamps[1]?21:15));
  if(s.visitor.p>=1)fail(s,'机房失去联络：未关闭的通道让来访者触及发电机。重新值守，检查卷闸。');
 }
 if(s.elapsed>=54&&!s.announced.storm){s.announced.storm=true;note(s,s.crew.safe?'海潮正在抬高。本班交接还有 '+Math.ceil(DURATION-s.elapsed)+' 秒。':'潮位正在抬高。检修员仍在外面，立即检查 03 灯塔入口。')}
 if(s.elapsed>=DURATION&&s.phase==='watch'){
  if(!s.crew.safe)fail(s,'潮水漫过了外侧道路，检修员没有找到入口。先照亮码头，再用灯塔引导。');
  else if(s.visitor.stage!=='departed')fail(s,'来访路线尚未确认安全。及时关闭机房卷闸，让来访者离开。');
  else if(s.power<=0)fail(s,'检修员已到站，但交接前备用电力耗尽。关闭闲置探照灯，及时接入旁路电池。');
  else{s.phase='won';s.won=true;s.score=Math.round(700+s.power*3);s.best=Math.max(s.best,s.score);note(s,'本班平安交接：检修员到站，机房保持供电。')}
 }
}

export async function createWatch({host,input,saved,notify=()=>{},sfx=()=>{},getSound=()=>false}){
 const art=await images(['quay','hall','beacon','store','worker','visitor'],'assets/game-forms/watch/');
 const {element,ctx}=canvasSurface(host);element.setAttribute('aria-label','夜潮值守实时监控画面，切换四个机位，照路、引导和控制机房卷闸');
 let s=sanitizeWatch(saved),active=false,fade=0,flash=0,oldCamera=s.camera,gateVisual=s.shutter?1:0,disposed=false,oldOutcome=s.phase;
 const rng=hash(4089),rain=Array.from({length:110},()=>({x:rng()*W,y:rng()*H,len:12+rng()*18,speed:330+rng()*260,a:.035+rng()*.09}));
 const style=document.createElement('style');style.textContent=`.watch-controls{color:#d9e6e3;background:#12252a;border:1px solid #355155;border-radius:0 0 8px 8px;padding:14px;display:grid;gap:12px;margin-top:0}.watch-meters{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font:13px Microsoft YaHei,sans-serif;color:#bdd1cb;padding:1px 2px 4px}.watch-meters b{font-weight:500;color:#ebdfbe;margin-left:5px}.watch-cameras{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.watch-controls button{font-family:Microsoft YaHei,sans-serif;cursor:pointer;min-height:48px;border:1px solid #496364;background:#20363b;color:#dce5df;border-radius:5px;padding:9px 10px;text-align:left;transition:background .15s}.watch-controls button:hover:not(:disabled){background:#30494d}.watch-controls button:focus-visible{outline:3px solid #f6cd8e;outline-offset:3px}.watch-controls button:disabled{opacity:.42;cursor:default}.watch-controls button[aria-pressed=true]{background:#594d35;border-color:#d7bb78;color:#fff0c5}.watch-cameras b{display:block;font-size:14px;font-weight:500}.watch-cameras small{display:block;margin-top:3px;font-size:11px;color:#b6cbc7}.watch-actions{display:grid;grid-template-columns:1.1fr 1.1fr 1fr 1fr;gap:8px}.watch-actions button{font-size:13px;text-align:center}.watch-report{display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:start;padding:7px 2px 0;font-size:13px;line-height:1.7}.watch-report strong{color:#e6d3a8;font-size:12px;font-weight:500}.watch-report p{margin:0;color:#d5dfd7}.watch-frame:fullscreen{display:flex;flex-direction:column;background:#08191d;overflow:auto}.watch-frame:fullscreen .play-mount{flex:1;min-height:0;aspect-ratio:auto}.watch-frame:fullscreen .watch-controls{flex:0 0 auto;max-width:1280px;width:100%;box-sizing:border-box;align-self:center}.watch-frame:fullscreen .play-canvas{object-fit:contain}@media(max-width:600px){.watch-controls{padding:10px;gap:9px}.watch-cameras{grid-template-columns:repeat(2,1fr)}.watch-actions{grid-template-columns:repeat(2,1fr)}.watch-report{grid-template-columns:1fr;gap:1px}.watch-cameras small{font-size:12px}.watch-actions button{font-size:13px;min-height:46px}}`;
 document.head.append(style);
 const controls=document.createElement('div');controls.className='watch-controls';controls.innerHTML='<div class="watch-meters" aria-label="值守状态"><span>备用电力<b data-meter="power"></b></span><span>本班交接<b data-meter="time"></b></span><span>接应人员<b data-meter="crew"></b></span></div><nav class="watch-cameras" aria-label="监控机位"></nav><div class="watch-actions" role="group" aria-label="值守控制"></div><div class="watch-report" role="status" aria-live="polite"><strong>港务电台</strong><p></p></div>';
 const frame=host.closest('.player-frame')||host,mount=host.closest('.play-mount')||host;mount.after(controls);frame.classList.add('watch-frame');
 const cameraButtons=CAMERA_NAMES.map((name,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent='0'+(i+1)+' · '+name;b.setAttribute('aria-label','机位 '+(i+1)+' '+name);b.onclick=()=>command('camera',i);controls.querySelector('nav').append(b);return b});
 const buttonNames=['lamp','shutter','beacon','backup'],buttons={};for(const id of buttonNames){const b=document.createElement('button');b.type='button';b.onclick=()=>command(id);controls.querySelector('.watch-actions').append(b);buttons[id]=b}
 let lastSyncKey='';
 let soundContext=null,soundGain=null,sources=[],soundStarted=false,lastSound=false;
 const abort=new AbortController();
 function setupSound(){if(!getSound()||disposed)return;try{soundContext??=new(window.AudioContext||window.webkitAudioContext)();if(!soundStarted){const buffer=soundContext.createBuffer(1,soundContext.sampleRate*3,soundContext.sampleRate),data=buffer.getChannelData(0);let previous=0;const r=hash(492);for(let i=0;i<data.length;i++){previous=(previous+.035*(r()*2-1))/1.035;data[i]=previous*3.6}soundGain=soundContext.createGain();soundGain.gain.value=0;soundGain.connect(soundContext.destination);const noise=soundContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=soundContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1150;noise.connect(filter);filter.connect(soundGain);noise.start();sources.push(noise);const hum=soundContext.createOscillator(),hg=soundContext.createGain();hum.type='sine';hum.frequency.value=51;hg.gain.value=.11;hum.connect(hg);hg.connect(soundGain);hum.start();sources.push(hum);soundStarted=true}soundContext.resume().catch(()=>{})}catch{}}
 document.addEventListener('click',setupSound,{signal:abort.signal});document.addEventListener('keydown',setupSound,{signal:abort.signal});
 function soundSync(){const enabled=active&&getSound()&&s.phase==='watch';if(soundGain){soundGain.gain.setTargetAtTime(enabled?(s.camera===1?.19:.12):0,soundContext.currentTime,.15)}if(lastSound!==enabled){lastSound=enabled;if(enabled&&soundContext)soundContext.resume().catch(()=>{});else if(soundContext)setTimeout(()=>{if(!lastSound&&!disposed)soundContext?.suspend().catch(()=>{})},250)}}
 function command(id,value){if(id==='restart'){s=freshWatch(s.best);oldOutcome='watch';gateVisual=0;fade=.18;notify('新的值守班次开始。');sync();return true}if(!active&&id!=='camera')return false;const ok=actWatch(s,id,value);if(!ok)return false;if(id==='camera'){oldCamera=value;fade=.22;sfx('turn')}else if(id==='shutter')sfx('door');else if(id==='backup')sfx('pickup');else if(id==='beacon')sfx('success');else sfx('stamp');sync();return true}
 frame.addEventListener('keydown',e=>{if(e.repeat)return;if(['Digit1','Digit2','Digit3','Digit4'].includes(e.code)){e.preventDefault();command('camera',Number(e.code.slice(-1))-1)}if(e.code==='KeyC'){e.preventDefault();command('camera',(s.camera+1)%4)}if(e.code==='KeyL'){e.preventDefault();command('lamp')}if(e.code==='KeyG'){e.preventDefault();command('shutter')}if(e.code==='KeyB'){e.preventDefault();command('beacon')}},{signal:abort.signal});
 function sync(){
  soundSync();const key=JSON.stringify([active,s.camera,s.phase,Math.ceil(s.power),Math.ceil(DURATION-s.elapsed),Math.ceil(s.beacon),s.lamps,s.shutter,s.backupUsed,s.crew.stage,s.visitor.stage,s.log[0]]);if(key===lastSyncKey)return;lastSyncKey=key;
  const occupancy=[s.crew.stage==='quay'||s.crew.stage==='crossing'||s.visitor.stage==='quay'?'有人影':'海潮与雨声',s.visitor.stage==='hall'?'脚步接近':'机组运行',s.crew.stage==='beacon'||s.crew.stage==='returning'?'检修员等待':s.crew.safe?'人员已到站':'入口空闲',s.backupUsed?'旁路电池已用':'备用电源可用'];
  controls.querySelector('[data-meter=power]').textContent=Math.ceil(s.power)+'%';controls.querySelector('[data-meter=time]').textContent=s.phase==='won'?'已完成':s.phase==='failed'?'暂停':Math.ceil(DURATION-s.elapsed)+'秒';controls.querySelector('[data-meter=crew]').textContent=s.crew.safe?'已到站':s.crew.stage==='waiting'?'待靠岸':'接应中';
  cameraButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(s.camera===i));b.querySelector('small').textContent=occupancy[i]});
  buttons.lamp.textContent=(s.lamps[s.camera]?'关闭':'开启')+'探照灯 · L';buttons.lamp.setAttribute('aria-pressed',String(s.lamps[s.camera]));buttons.lamp.disabled=!active||s.phase!=='watch'||s.power<=0;
  buttons.shutter.textContent=(s.shutter?'升起':'落下')+'机房卷闸 · G';buttons.shutter.setAttribute('aria-pressed',String(s.shutter));buttons.shutter.disabled=!active||s.phase!=='watch'||s.power<=0;
  buttons.beacon.textContent=s.beacon>0?'引导光 '+Math.ceil(s.beacon)+'秒':'灯塔引导 · B';buttons.beacon.disabled=!active||s.phase!=='watch'||s.camera!==2||s.beacon>0||s.power<9;
  buttons.backup.textContent=s.backupUsed?'旁路供电已使用':'旁路供电 +22%';buttons.backup.disabled=!active||s.phase!=='watch'||s.camera!==3||s.backupUsed;
  const p=controls.querySelector('.watch-report p');if(p.textContent!==s.log[0])p.textContent=s.log[0];
 }
 function tick(dt){if(!active)return;advanceWatch(s,dt);fade=Math.max(0,fade-dt);flash=Math.max(0,flash-dt);gateVisual+=(Number(s.shutter)-gateVisual)*Math.min(1,dt*4.5);for(const r of rain){r.y+=r.speed*dt;r.x-=r.speed*.21*dt;if(r.y>H+30){r.y=-30;r.x=(r.x+471)%W}if(r.x<0)r.x+=W}if(s.phase!==oldOutcome){oldOutcome=s.phase;if(s.won)sfx('success');else sfx('hurt')}if(Math.floor(s.elapsed*10)%167===0&&Math.floor(s.elapsed)>1)flash=.12;sync()}
 function point(a,b,t){return {x:(a[0]+(b[0]-a[0])*t)*W,y:(a[1]+(b[1]-a[1])*t)*H,h:a[2]+(b[2]-a[2])*t}}
 function actor(im,p,lit,walking=true){ctx.save();const bob=walking?Math.sin(s.elapsed*6)*1.8:0;ctx.globalAlpha=.25;ctx.fillStyle='#050f16';ctx.beginPath();ctx.ellipse(p.x,p.y,p.h*.22,p.h*.055,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.save();ctx.translate(p.x,p.y+bob);ctx.scale(1+(walking?Math.sin(s.elapsed*6)*.007:0),1);ctx.filter=lit?'brightness(1.15) saturate(.8)':'brightness(.68) saturate(.65)';sprite(ctx,im,0,0,p.h);ctx.filter='none';ctx.restore();if(lit)glow(ctx,p.x,p.y-p.h*.57,p.h*.75,'rgba(223,196,141,.08)');ctx.restore()}
 function drawFlood(){if(!s.lamps[s.camera]||s.power<=0)return;const config=[{x:.15,y:.17,toX:.69,toY:.83},{x:.47,y:.16,toX:.50,toY:.76},{x:.21,y:.24,toX:.55,toY:.73},{x:.32,y:.37,toX:.60,toY:.72}][s.camera],x=config.x*W,y=config.y*H,tx=config.toX*W,ty=config.toY*H;ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createLinearGradient(x,y,tx,ty);g.addColorStop(0,'rgba(242,219,173,.16)');g.addColorStop(1,'rgba(219,215,186,.01)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx+180,ty+25);ctx.lineTo(tx-180,ty+25);ctx.closePath();ctx.fill();glow(ctx,tx,ty-60,240,'rgba(208,206,173,.085)');glow(ctx,x,y,27,'rgba(255,225,173,.55)');ctx.restore()}
 function drawDoor(){if(gateVisual<.01)return;const p=[[.484,.067],[.741,.067],[.738,.353],[.483,.336]],yTop=(p[0][1]+p[1][1])/2*H,bottom=yTop+(.336*H-yTop)*gateVisual;ctx.save();ctx.beginPath();ctx.moveTo(p[0][0]*W,yTop);ctx.lineTo(p[1][0]*W,yTop+12);ctx.lineTo(p[1][0]*W,bottom+12);ctx.lineTo(p[0][0]*W,bottom);ctx.closePath();ctx.clip();const g=ctx.createLinearGradient(p[0][0]*W,0,p[1][0]*W,0);g.addColorStop(0,'#1a3339');g.addColorStop(.48,'#50666a');g.addColorStop(1,'#233d43');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let y=yTop;y<bottom+14;y+=9){ctx.strokeStyle='#152b3290';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(.483*W,y);ctx.lineTo(.741*W,y+12);ctx.stroke();ctx.strokeStyle='#95a39b35';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(.483*W,y+2);ctx.lineTo(.741*W,y+14);ctx.stroke()}ctx.restore();ctx.strokeStyle='#71837c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(.483*W,bottom);ctx.lineTo(.741*W,bottom+12);ctx.stroke()}
 function draw(){
  cover(ctx,art[['quay','hall','beacon','store'][s.camera]]);ctx.save();
  // The original photography supplies materials; weather, light, gates and moving visitors are live layers.
  if(s.power<=0){ctx.fillStyle='#06203166';ctx.fillRect(0,0,W,H)}
  if(s.camera===0){if(['quay','crossing'].includes(s.crew.stage)){const t=s.crew.stage==='quay'?0:s.crew.p;actor(art.worker,point([.41,.48,70],[.56,.76,155],t),s.lamps[0],s.crew.stage==='crossing')}if(s.visitor.stage==='quay')actor(art.visitor,point([.44,.47,68],[.38,.80,175],s.visitor.p),s.lamps[0]);}
  if(s.camera===1){if(s.visitor.stage==='hall'){actor(art.visitor,s.visitor.p<=.25?point([.60,.29,60],[.60,.35,84],s.visitor.p/.25):point([.60,.35,84],[.77,.84,200],(s.visitor.p-.25)/.75),s.lamps[1],!(s.shutter&&s.visitor.p>=.23&&s.visitor.p<=.27))}drawDoor()}
  if(s.camera===2){if(['beacon','returning'].includes(s.crew.stage))actor(art.worker,point([.50,.54,109],[.245,.60,126],s.crew.stage==='beacon'?0:s.crew.p),s.lamps[2]||s.beacon>0,s.crew.stage==='returning');if(s.beacon>0){ctx.globalCompositeOperation='screen';glow(ctx,.26*W,.44*H,150,'rgba(244,213,143,.15)');const pulse=.35+.15*Math.sin(s.elapsed*5);ctx.fillStyle=`rgba(218,217,184,${pulse*.14})`;ctx.beginPath();ctx.moveTo(.19*W,.29*H);ctx.lineTo(.95*W,.14*H);ctx.lineTo(.95*W,.43*H);ctx.closePath();ctx.fill();ctx.globalCompositeOperation='source-over'}}
  drawFlood();
  if(s.camera===0||s.camera===2){ctx.strokeStyle='#b9d6db';ctx.lineWidth=.65;for(const r of rain){ctx.globalAlpha=r.a;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.len*.22,r.y+r.len);ctx.stroke()}ctx.globalAlpha=1;for(let i=0;i<7;i++){const t=(s.elapsed*.4+i*.16)%1;ctx.strokeStyle=`rgba(130,174,188,${(1-t)*.04})`;ctx.beginPath();ctx.ellipse((.37+i*.074)*W,(.63+(i%3)*.083)*H,10+t*16,2+t*3,0,0,Math.PI*2);ctx.stroke()}}
  if(flash>0){ctx.fillStyle=`rgba(154,186,199,${flash*.36})`;ctx.fillRect(0,0,W,H)}
  const edge=ctx.createLinearGradient(0,0,0,100);edge.addColorStop(0,'#0a1b26bd');edge.addColorStop(1,'#0a1b2600');ctx.fillStyle=edge;ctx.fillRect(0,0,W,100);
  ctx.fillStyle='#dbe9e7';ctx.font='500 17px Microsoft YaHei,sans-serif';ctx.textAlign='left';ctx.fillText('CAM 0'+(s.camera+1)+'  /  '+CAMERA_NAMES[s.camera],25,35);ctx.fillStyle=active&&s.phase==='watch'?'#d7b079':'#82a9a7';ctx.beginPath();ctx.arc(27,58,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bbd0ce';ctx.font='11px Microsoft YaHei,sans-serif';ctx.fillText(s.phase==='won'?'SHIFT COMPLETE · 本班平安交接':s.phase==='failed'?'记录暂停 · 等待重新值守':active?'LIVE · NORTH TIDE STATION':'值守画面 · 等待开始',39,62);
  ctx.textAlign='right';ctx.fillStyle=s.power<22?'#efd0a1':'#dce8df';ctx.font='500 17px Microsoft YaHei,sans-serif';ctx.fillText('电力 '+Math.ceil(s.power)+'%',W-25,35);ctx.font='13px Microsoft YaHei,sans-serif';ctx.fillStyle='#bdcfcc';ctx.fillText('交接 '+Math.max(0,Math.ceil(DURATION-s.elapsed))+'s',W-25,58);
  ctx.fillStyle='#091d25b8';ctx.beginPath();ctx.roundRect(24,H-52,s.camera===1?230:190,30,4);ctx.fill();ctx.textAlign='left';ctx.font='12px Microsoft YaHei,sans-serif';ctx.fillStyle='#d3dfd8';ctx.fillText(s.camera===1?'机房卷闸：'+(s.shutter?'关闭 · 持续供电':'开启'):s.camera===2?'灯塔：'+(s.crew.safe?'检修员已到站':s.beacon>0?'引导光开启':'等待接应'):s.camera===3?'旁路电池：'+(s.backupUsed?'已使用':'待接入'):'探照灯：'+(s.lamps[0]?'照亮码头':'待开启'),37,H-32);
  if(s.phase!=='watch'){ctx.fillStyle='#091923c9';ctx.beginPath();ctx.roundRect(W/2-228,H/2-76,456,154,9);ctx.fill();ctx.textAlign='center';ctx.fillStyle='#d7b77e';ctx.font='12px Microsoft YaHei,sans-serif';ctx.fillText(s.won?'SHIFT COMPLETE':'值守记录',W/2,H/2-42);ctx.fillStyle='#e5ebe2';ctx.font='500 25px Microsoft YaHei,sans-serif';ctx.fillText(s.won?'每个人，都平安到站。':'这班值守需要重新安排。',W/2,H/2-5);ctx.font='14px Microsoft YaHei,sans-serif';ctx.fillStyle='#bacfcc';ctx.fillText(s.won?'检修员到站 · 机房供电 · 剩余电力 '+Math.ceil(s.power)+'%':'点击下方“重新值守”，检查电台提示与机位。',W/2,H/2+30)}
  if(fade>0){ctx.fillStyle=`rgba(10,27,35,${fade/.22*.25})`;ctx.fillRect(0,0,W,H)}ctx.restore();
 }
 sync();return {tick,draw,setActive(value){active=!!value;sync()},command(name,value){return name==='next'?command('camera',(s.camera+1)%4):command(name,value)},getState:()=>({...structuredClone(s),active,style:'authored-surveillance',duration:DURATION}),getStatus:()=>({goal:s.won?'夜潮值守平安交接':s.phase==='failed'?'重新安排接应与机房保护':'接应橙衣检修员，保护机房至交接',message:s.log[0],stats:['检修员 '+(s.crew.safe?'已到站':s.crew.stage==='waiting'?'未靠岸':'途中'),'机房 '+(s.visitor.stage==='departed'?'安全':s.visitor.stage==='hall'?'通道有人':'运行中'),'电力 '+Math.ceil(s.power)+'%','交接 '+Math.ceil(DURATION-s.elapsed)+'s'],actions:[action('重新值守',()=>command('restart'))]}),dispose(){disposed=true;abort.abort();sources.forEach(n=>{try{n.stop()}catch{}});soundContext?.close().catch(()=>{});controls.remove();style.remove();frame.classList.remove('watch-frame');element.remove()}};
}
