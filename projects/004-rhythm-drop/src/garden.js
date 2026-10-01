import {gardenKinds,createPlant,validateGarden,serializeGarden} from './garden-model.mjs';
const $=id=>document.getElementById(id),canvas=$('garden'),g=canvas.getContext('2d');
const key='rhythm-drop.garden.v1',archiveKey='rhythm-drop.garden-archive.v1';
let plants=[],archives=[],storageIssue=false,kind='water',started=false,muted=false,playing=false,ctx,master,verb,active=null,lastNote=0,redo=null;
let width=1,height=1,cursor={x:.5,y:.68},exportURL='',playEnd=null;
const voices=new Set(),timers=new Set(),effects=[],born=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const ease=t=>{const n=clamp(t,0,1);return n*n*(3-2*n);};
try{
  const raw=localStorage.getItem(key);if(raw)plants=validateGarden(JSON.parse(raw)).plants;
  const old=localStorage.getItem(archiveKey);if(old){const parsed=JSON.parse(old);if(!Array.isArray(parsed)||parsed.some(p=>typeof p.id!=='string'||!Number.isFinite(Date.parse(p.createdAt))))throw new Error();archives=parsed.map(p=>({...p,garden:validateGarden(p.garden)}));}
}catch{storageIssue=true;$('save-state').textContent='档案暂时无法读取 / 可导出当前花园';}
const status=text=>$('status').textContent=text;
function updateUI(){
  $('plant-count').textContent=`${plants.length} 株声音`;$('undo').disabled=!plants.length;$('redo').hidden=!redo;
  $('listen').disabled=!plants.length&&!playing;$('listen').textContent=playing?'Ⅱ 停下，留一点安静':'▷ 听听这座花园';
}
function save(){
  updateUI();$('export-panel').hidden=true;if(exportURL){URL.revokeObjectURL(exportURL);exportURL='';}
  if(storageIssue)return;
  try{localStorage.setItem(key,serializeGarden(plants));$('save-state').textContent='已保存在此浏览器';}
  catch{storageIssue=true;$('save-state').textContent='本机保存不可用 / 请导出花园';status('这页可以继续演奏。请保存花园文件，保留你的声音。');}
}
function renderArchives(){
  $('saved-gardens').replaceChildren(new Option('选择一个保存时间…',''));
  archives.forEach(p=>$('saved-gardens').add(new Option(`${new Date(p.createdAt).toLocaleString('zh-CN')} · ${p.garden.plants.length} 株声音`,p.id)));
}
function archiveCurrent(){
  if(!plants.length)return true;
  if(storageIssue){status('本机档案不可写。先导出当前花园，再在新页面创作。');return false;}
  const next=[...archives,{id:crypto.randomUUID(),createdAt:new Date().toISOString(),garden:validateGarden({format:'sound-garden',version:1,plants})}];
  try{localStorage.setItem(archiveKey,JSON.stringify(next));archives=next;renderArchives();return true;}
  catch{status('当前花园还没有归档成功。请先导出文件，植物已保留。');return false;}
}
function audio(){
  if(ctx)return;
  ctx=new AudioContext();master=ctx.createGain();master.gain.value=muted?0:.5;
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=4;master.connect(limiter);limiter.connect(ctx.destination);
  verb=ctx.createConvolver();const impulse=ctx.createBuffer(2,ctx.sampleRate*2.5,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);let seed=29+ch;for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=(seed/1073741824-1)*Math.pow(1-i/data.length,3)*.35;}}
  verb.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.3;verb.connect(wet);wet.connect(master);
}
async function enter(){
  try{audio();await ctx.resume();if(ctx.state!=='running')throw new Error();started=true;$('welcome').hidden=true;$('gesture-hint').textContent='按住种植 · 松开生长 · 触碰植物重听';return true;}
  catch{status('声音还没有打开，请再次点击“进入花园”或检查浏览器音频设置。');return false;}
}
function note(plant,midi){
  if(!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime+.01,air=plant.kind==='air',water=plant.kind==='water',length=water?2.1:air?2.8:2.4;
  const envelope=ctx.createGain(),pan=ctx.createStereoPanner(),filter=ctx.createBiquadFilter();
  pan.pan.value=(plant.x-.5)*1.1;filter.type='lowpass';filter.frequency.value=air?3400:water?2800:1700;
  envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(water?.075:.06,t+(water?.009:.035));envelope.gain.exponentialRampToValueAtTime(.0001,t+length);
  filter.connect(envelope);envelope.connect(pan);pan.connect(master);envelope.connect(verb);
  const partials=water?[[1,1],[2.01,.24]]:air?[[1,1],[2.75,.13],[4.01,.06]]:[[1,1],[2,.28],[3,.11]];let remaining=partials.length;
  partials.forEach(([harmonic,level])=>{const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=440*2**((midi-69)/12)*harmonic;const mix=ctx.createGain();mix.gain.value=level;osc.connect(mix);mix.connect(filter);osc.start(t);osc.stop(t+length+.05);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();mix.disconnect();if(--remaining===0){filter.disconnect();envelope.disconnect();pan.disconnect();}};});
  effects.push({x:plant.x,y:plant.y,kind:plant.kind,time:performance.now(),id:plant.id});
}
function later(fn,ms){const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;}
function stop(){
  for(const timer of timers)clearTimeout(timer);timers.clear();playEnd=null;
  for(const voice of voices){try{voice.stop();}catch{}}voices.clear();playing=false;updateUI();
}
function phrase(plant){plant.notes.forEach((midi,i)=>later(()=>note(plant,midi),i*gardenKinds[plant.kind].spacing*1000));}
async function listen(){
  if(playing){stop();status('声音慢慢落下。花园还在这里。');return;}
  if(!plants.length)return;
  if(!await enter())return;stop();playing=true;updateUI();
  const ordered=[...plants].sort((a,b)=>a.x-b.x),interval=1.8;let end=0;
  ordered.forEach((plant,j)=>plant.notes.forEach((midi,i)=>{const at=j*interval+i*gardenKinds[plant.kind].spacing;end=Math.max(end,at);later(()=>note(plant,midi),at*1000);}));
  status('从左到右，听见你留下的每一束声音。');playEnd=later(()=>{playing=false;updateUI();status('这一段属于你的旋律，已经留在花园里。');},(end+3)*1000);
}
function add(plant){
  if(plants.length>=24){status('这页已经长满了 24 株声音。可以保留这页，再开始一座新花园。');return false;}
  plants.push(plant);born.set(plant.id,performance.now());redo=null;save();return true;
}
async function seedButton(){
  if(!await enter())return;stop();
  const i=plants.length,plant=createPlant(kind,.22+(i%4)*.18,.65+(Math.floor(i/4)%3)*.07,1.5,crypto.randomUUID());
  if(add(plant)){phrase(plant);status(`${gardenKinds[kind].name}留下一束旋律。触碰它，还能听见。`);}
}
function pos(event){const rect=canvas.getBoundingClientRect();return {x:clamp((event.clientX-rect.left)/rect.width,.08,.92),y:clamp((event.clientY-rect.top)/rect.height,.32,.88)};}
function nearest(p){return [...plants].sort((a,b)=>a.y-b.y).findLast(plant=>{
  const size=clamp(width/850,.85,1.25)*(.7+plant.y*.5),dx=(plant.x-p.x)*width,dy=(plant.y-p.y)*height;
  return Math.abs(dx)<Math.max(24,32*size)&&dy> -18&&dy<(52+plant.held*15)*size+18;
});}
function begin(p,pointerId=null){
  if(!started||active)return;
  const existing=nearest(p);stop();
  if(existing){phrase(existing);status(`再听一听，这株${gardenKinds[existing.kind].name}记住的旋律。`);return;}
  if(plants.length>=24){status('这一页已经长满声音。先保留它，再开启新花园。');return;}
  const start=performance.now();active={...createPlant(kind,p.x,p.y,0,crypto.randomUUID()),start,pointerId};lastNote=0;
  note(active,active.notes[0]);status('声音正在生长……松开时，把它留在这里。');
}
function finish(){
  if(!active)return;const p=active,held=clamp((performance.now()-p.start)/1000,0,3);active=null;
  const plant=createPlant(p.kind,p.x,p.y,held,p.id);
  if(add(plant)){// Finish the phrase on release; replay keeps the same note sequence.
    plant.notes.slice(lastNote+1).forEach((midi,i)=>later(()=>note(plant,midi),(i+1)*gardenKinds[plant.kind].spacing*1000));
    status(`种下了 ${plant.notes.length} 个音的${gardenKinds[plant.kind].name}旋律。触碰它，再听一次。`);
  }
}
canvas.addEventListener('pointerdown',event=>{if(!started){void enter();return;}event.preventDefault();canvas.focus({preventScroll:true});cursor=pos(event);canvas.setPointerCapture(event.pointerId);begin(cursor,event.pointerId);});
canvas.addEventListener('pointermove',event=>{cursor=pos(event);});
canvas.addEventListener('pointerup',event=>{if(active?.pointerId===event.pointerId)finish();});
canvas.addEventListener('pointercancel',()=>{active=null;stop();status('这次触碰已取消，还没有种下植物。');});
canvas.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){event.preventDefault();cursor.x=clamp(cursor.x+(event.code==='ArrowLeft'?-.05:event.code==='ArrowRight'?.05:0),.08,.92);cursor.y=clamp(cursor.y+(event.code==='ArrowUp'?-.05:event.code==='ArrowDown'?.05:0),.32,.88);showCursor();}
  if(event.code==='Space'){event.preventDefault();if(!event.repeat){if(!started)void enter();else begin(cursor);}}
  if(event.code==='Escape'){active=null;stop();status('已停下。花园里的植物仍然保留。');}
});
canvas.addEventListener('keyup',event=>{if(event.code==='Space'){event.preventDefault();if(active?.pointerId===null)finish();}});
canvas.addEventListener('blur',()=>{if(active?.pointerId===null)finish();$('seed-cursor').hidden=true;});
function showCursor(){const el=$('seed-cursor');el.hidden=false;el.style.left=`${cursor.x*100}%`;el.style.top=`${cursor.y*100}%`;}
$('enter').onclick=async()=>{if(await enter())status('选一种声音，点击或按住空白处，把此刻种下来。');};
$('plant-button').onclick=()=>void seedButton();$('listen').onclick=()=>void listen();
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.5,ctx.currentTime,.08);$('sound').textContent=muted?'♩ 静音':'♫ 有声';$('sound').setAttribute('aria-pressed',String(muted));$('sound').setAttribute('aria-label',muted?'打开声音':'静音');};
document.querySelectorAll('[data-kind]').forEach(button=>button.onclick=()=>{if(active)finish();kind=button.dataset.kind;document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('scene-name').textContent=`${gardenKinds[kind].name} / ${kind.toUpperCase()}`;status(gardenKinds[kind].hint);});
$('undo').onclick=()=>{active=null;stop();redo=plants.pop();save();status('上一株暂时收起来了，可以点击“恢复上一株”。');};
$('redo').onclick=()=>{if(!redo)return;plants.push(redo);redo=null;save();status('上一株回到花园，旋律仍然保留。');};
$('new-garden').onclick=()=>{if(active)finish();if(!archiveCurrent())return;stop();plants=[];redo=null;save();status('上一页保留在本机花园列表中。这一页，可以重新开始。');};
$('saved-gardens').onchange=event=>{const saved=archives.find(a=>a.id===event.target.value);if(!saved)return;if(active)finish();if(!archiveCurrent())return;stop();plants=validateGarden(saved.garden).plants;redo=null;save();event.target.value='';status('之前的花园回来了，触碰植物就能听见。');};
$('export').onclick=()=>{if(active)finish();const data=serializeGarden(plants);if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(new Blob([data],{type:'application/json'}));$('download').href=exportURL;$('download').download=`声音花园-${new Date().toISOString().slice(0,10)}.json`;$('export-text').value=JSON.stringify(JSON.parse(data),null,2);$('export-panel').hidden=false;status('花园文件已准备好。可下载，或复制文本保留。');};
$('import').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>64*1024)throw new Error('请选择小于 64 KB 的花园文件。');const garden=validateGarden(JSON.parse(await file.text()));if(active)finish();if(!archiveCurrent())return;stop();plants=garden.plants;redo=null;save();status('花园已打开，原来这一页已归档保留。');}catch(error){status(error.message||'文件无法读取，当前花园已保留。');}finally{event.target.value='';}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){active=null;stop();if(ctx)void ctx.suspend();}else if(started){started=false;$('welcome').hidden=false;$('enter').firstChild.textContent='继续听声音 ';}});

// Drawn entirely in code: no remote images, music or fonts.
function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const ratio=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);g.setTransform(ratio,0,0,ratio,0,0);}
new ResizeObserver(resize).observe(canvas);resize();
function ellipse(x,y,rx,ry,color,rotation=0){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);g.fill();}
function stroke(x1,y1,x2,y2,color,size=1){g.strokeStyle=color;g.lineWidth=size;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
function glow(x,y,r,color,opacity=.2){g.save();g.globalAlpha=opacity;const fill=g.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,color);fill.addColorStop(1,'transparent');g.fillStyle=fill;g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
function landscape(t){
  const gradient=g.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#183838');gradient.addColorStop(.48,'#527a70');gradient.addColorStop(.65,'#244f50');gradient.addColorStop(1,'#102b30');g.fillStyle=gradient;g.fillRect(0,0,width,height);
  glow(width*.72,height*.2,width*.35,'#d4d5a6',.22);ellipse(width*.72,height*.21,22,22,'#c9d3ad');glow(width*.72,height*.21,85,'#d6dbb5',.18);
  for(let layer=0;layer<3;layer++){
    g.fillStyle=['#43675e','#2b544e','#244744'][layer];g.beginPath();g.moveTo(0,height*.48);
    for(let i=0;i<=30;i++){const x=i/30*width,y=height*(.34+layer*.055)+Math.sin(i*.22+layer*2)*height*.065+Math.sin(i*.58+layer)*height*.022;g.lineTo(x,y);}
    g.lineTo(width,height*.58);g.lineTo(0,height*.58);g.fill();
  }
  const mist=g.createLinearGradient(0,height*.36,0,height*.58);mist.addColorStop(0,'#b5c5aa00');mist.addColorStop(.5,'#bdd0b333');mist.addColorStop(1,'#b5c5aa00');g.fillStyle=mist;g.fillRect(0,height*.36,width,height*.22);
  for(let i=0;i<23;i++){const x=width*(.72+Math.sin(i*4.6)*(.015+i*.004)),y=height*(.49+i*.012);stroke(x-width*.02,y,x+width*.02+i*.4,y,`rgba(192,215,182,${.02+(1-i/23)*.09})`);}
  g.fillStyle='#17392f';g.beginPath();g.moveTo(0,height*.68);g.bezierCurveTo(width*.25,height*.58,width*.52,height*.94,width,height*.68);g.lineTo(width,height);g.lineTo(0,height);g.fill();
  g.strokeStyle='#aac5a12b';g.lineWidth=1;g.beginPath();g.moveTo(0,height*.68);g.bezierCurveTo(width*.25,height*.58,width*.52,height*.94,width,height*.68);g.stroke();
  for(let i=0;i<190;i++){
    const x=(Math.sin(i*12.9898)*.5+.5)*width,y=height*(.8+(Math.sin(i*7.23)*.5+.5)*.23),len=12+(i%9)*5;
    const sway=Math.sin(t*.35+i)*4;
    g.strokeStyle=i%3===0?'#7b9d7045':'#365f4966';g.lineWidth=i%4===0?1.6:.8;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+sway-7,y-len*.5,x+sway-3,y-len);g.stroke();
    if(i%16===0){ellipse(x+sway-3,y-len,2,3,'#c8c7a666');glow(x,y-len,14,'#bfccaf',.08);}
  }
  for(let i=0;i<38;i++){const x=(Math.sin(i*14.1)*.5+.5)*width+Math.sin(t*.18+i)*10,y=height*(.38+(Math.cos(i*3.1)*.5+.5)*.45)+Math.sin(t*.22+i)*7,opacity=.18+(Math.sin(t*.8+i)*.5+.5)*.5;g.globalAlpha=opacity;ellipse(x,y,1.2,1.2,'#dfe4b6');glow(x,y,8,'#dfe4b6',.15);}
  g.globalAlpha=1;
}
function plantDrawing(plant,now,t,preview=false){
  const age=born.has(plant.id)?(now-born.get(plant.id))/1700:1,growth=preview?.35+ease((now-plant.start)/2600)*.65:ease(age),x=plant.x*width,y=plant.y*height;
  const size=clamp(width/850,.85,1.25)*(.7+plant.y*.5),stem=(52+plant.held*15)*size*growth;
  const pulse=effects.reduce((n,e)=>e.id===plant.id?Math.max(n,Math.max(0,1-(now-e.time)/1100)):n,0),sway=Math.sin(t*.6+plant.x*8)*3*size*(reduced?0:1);
  g.save();g.translate(x,y);g.globalAlpha=preview?.65:1;
  ellipse(0,2,22*size,5*size,'#071d2533');glow(0,-stem*.55,52*size,gardenKinds[plant.kind].color,.12+pulse*.18);
  if(plant.kind==='water'){
    ellipse(0,0,25*size,8*size,'#4f83757a');ellipse(12*size,-2,15*size,4*size,'#7d9b7770',-.3);
    stroke(0,0,sway,-stem*.65,'#8cbba1',1.4*size);g.translate(sway,-stem*.65);
    for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;ellipse(Math.cos(a)*9*size,Math.sin(a)*10*size,14*size,6*size,['#c3d8cd','#cfe3d3','#e0e7cf'][i%3],a+.3);}
    ellipse(0,1,10*size,4*size,'#e1d7ab');ellipse(0,0,3*size,2*size,'#fff1c4');
  }else if(plant.kind==='meadow'){
    for(let branch=0;branch<3;branch++){
      const dx=(branch-1)*24*size+sway,h=stem*(branch===1?1:.72);
      g.strokeStyle='#9ab786';g.lineWidth=1.5*size;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(dx*.4,-h*.7,dx,-h);g.stroke();
      ellipse(dx*.5-7*size,-h*.4,11*size,3.8*size,'#779c6e',.45);ellipse(dx*.7+6*size,-h*.65,10*size,3.8*size,'#abc191',-.55);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;ellipse(dx+Math.cos(a)*8*size,-h+Math.sin(a)*8*size,7*size,4*size,'#e1c9a6',a);}
      ellipse(dx,-h,3*size,3*size,'#f9e5af');
    }
  }else{
    stroke(0,0,sway,-stem,'#9bafab',1.3*size);
    for(let i=0;i<3;i++){const dx=(i-1)*20*size+sway,h=stem*(.58+i*.17);stroke(sway,-h-10*size,dx,-h,'#b6c4b2',size);stroke(dx,-h,dx,-h+12*size,'#c3c5df',size);ellipse(dx,-h+15*size,5*size,8*size,'#c2b8dc',-.2+sway*.03);ellipse(dx,-h+12*size,2*size,3*size,'#eeebda');glow(dx,-h+15*size,18*size,'#d6c9f0',.17+pulse*.15);}
  }
  g.restore();
}
function render(now){
  const t=reduced?0:now/1000;landscape(t);
  for(let i=effects.length-1;i>=0;i--)if(now-effects[i].time>2500)effects.splice(i,1);
  for(const effect of effects){const age=(now-effect.time)/2500,color=gardenKinds[effect.kind].color;g.save();g.globalAlpha=(1-age)*.42;g.strokeStyle=color;g.lineWidth=1;g.beginPath();g.ellipse(effect.x*width,effect.y*height,(12+age*95)*Math.min(width/650,1.2),(4+age*25)*Math.min(width/650,1.2),0,0,Math.PI*2);g.stroke();g.restore();}
  [...plants].sort((a,b)=>a.y-b.y).forEach(p=>plantDrawing(p,now,t));
  if(active){
    const held=clamp((now-active.start)/1000,0,3),plant=createPlant(active.kind,active.x,active.y,held,active.id);
    const count=plant.notes.length,index=Math.min(count-1,Math.floor(held/.65));
    if(index>lastNote){lastNote=index;note(active,plant.notes[index]);}
    plantDrawing({...plant,start:active.start},now,t,true);
    if(held>=3)finish();
  }
  requestAnimationFrame(render);
}
renderArchives();updateUI();if(plants.length)status('你之前种下的声音，还在这里。进入花园，再听一听。');requestAnimationFrame(render);
