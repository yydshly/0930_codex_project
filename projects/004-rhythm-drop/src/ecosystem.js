import {kinds,seed,migrate,validateEcosystem,voiceName,stageName,stageOf,phraseNotes,grow,absorb,fuse,cycleEvents} from './ecosystem-model.mjs';
import {createGardenPainter} from './garden-painter.mjs';
const $=id=>document.getElementById(id),canvas=$('ecosystem'),painter=createGardenPainter(canvas),key='rhythm-drop.ecosystem.v1';
let plants=[],bpm=84,selected=[],past=[],future=[],storageIssue=false,started=false,playing=false,muted=false,ctx,master,verb,currentBeat=-1,mode='';
const timers=new Set(),voices=new Set(),events=[],transitions=[];
const clone=value=>JSON.parse(JSON.stringify(value));
const state=()=>({format:'sound-garden-ecosystem',version:1,bpm,plants:clone(plants)});
const status=text=>$('status').textContent=text;
let hasSession=false,bootMessage='从种子开始。选一株培育，选两株吞噬或合成，再试一次叠奏。';
try{
  const raw=localStorage.getItem(key);
  if(raw){const session=JSON.parse(raw);if(session.format!=='sound-garden-ecosystem-session'||session.version!==1||!Array.isArray(session.past)||session.past.length>30||!Array.isArray(session.future)||session.future.length>30||!Array.isArray(session.selected)||session.selected.length>3||session.selected.some(s=>typeof s!=='string'))throw new Error();
    const current=validateEcosystem(session.current);hasSession=true;plants=current.plants;bpm=current.bpm;past=session.past.map(validateEcosystem);future=session.future.map(validateEcosystem);selected=session.selected.filter(id=>plants.some(p=>p.id===id));bootMessage='声音生态已恢复，包括成长、混合比例与可撤回的变化。';
  }else{
    const old=localStorage.getItem('rhythm-drop.garden.v1');
    if(old){try{const current=migrate(JSON.parse(old));plants=current.plants;bootMessage='种植版的声音已复制为种子。原版与原档案独立保留，可以从这里继续进化。';}catch{bootMessage='原种植档案暂时无法读取，原数据保留。这里提供三株新的试验种子。';}}
  }
}catch{storageIssue=true;bootMessage='生态档案暂时无法读取，旧记录保留。本页仍可创作与导出，暂不写入本机档案。';}
if(!plants.length&&!storageIssue&&!hasSession)plants=[seed('water',.27,.7,1.5,crypto.randomUUID()),seed('meadow',.5,.72,1.5,crypto.randomUUID()),seed('air',.73,.68,1.5,crypto.randomUUID())];
if(!selected.length)selected=plants.slice(0,2).map(p=>p.id);
$('tempo').value=bpm;
function save(){
  if(storageIssue){$('save-state').textContent='本机档案不可写 / 请导出保留';return;}
  try{localStorage.setItem(key,JSON.stringify({format:'sound-garden-ecosystem-session',version:1,current:state(),selected,past,future}));$('save-state').textContent='生态已保存 / 种植版档案保留';}
  catch{storageIssue=true;$('save-state').textContent='本机保存不可用 / 请导出文件';}
}
function commit(next,selection=selected){
  const validated=validateEcosystem(next);past=[...past,state()].slice(-30);future=[];plants=validated.plants;bpm=validated.bpm;selected=selection.filter(id=>plants.some(p=>p.id===id));save();renderUI();
}
function restore(value){const validated=validateEcosystem(value);plants=validated.plants;bpm=validated.bpm;selected=plants.slice(0,2).map(p=>p.id);$('tempo').value=bpm;save();renderUI();}
function label(p){return `${plants.indexOf(p)+1} · ${voiceName(p)}`;}
const pitchName=midi=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);
function choose(id){
  stop();if(selected.includes(id))selected=selected.filter(s=>s!==id);else if(selected.length<3)selected.push(id);else{status('先取消一株选择，再选其他植物。一次最多搭配三株。');return;}
  save();renderUI();status(selected.length?`已选 ${selected.length} 株。A 是第一株，B 是第二株。`:'选一株培育，或按顺序选择两株发生关系。');
}
function renderUI(){
  selected=selected.filter(id=>plants.some(p=>p.id===id));$('plant-count').textContent=`${plants.length} 株 / ${plants.filter(p=>p.mix.length>1).length} 种混合声`;
  $('selection-count').textContent=`已选 ${selected.length} / 3 株`;$('plant-list').replaceChildren();
  plants.forEach(p=>{
    const button=document.createElement('button');button.className='plant-card';button.setAttribute('aria-pressed',String(selected.includes(p.id)));
    const index=document.createElement('span');index.className='plant-index';index.textContent=selected.includes(p.id)?'ABC'[selected.indexOf(p.id)]:String(plants.indexOf(p)+1);index.style.color=kinds[p.kind].color;
    const info=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small'),growth=document.createElement('span');name.textContent=label(p);detail.textContent=`${stageName(p)} · 成长 ${p.growth}/9 · 第 ${p.generation} 代`;growth.className='growth-track';for(let i=0;i<9;i++){const pip=document.createElement('i');pip.className=i<p.growth?'on':'';growth.append(pip);}info.append(name,detail,growth);button.append(index,info);button.onclick=()=>choose(p.id);$('plant-list').append(button);
  });
  $('nurture').disabled=!selected.length||playing;$('absorb').disabled=selected.length!==2||playing;$('fuse').disabled=selected.length!==2||playing;$('mix-play').disabled=!selected.length;
  $('mix-play').textContent=playing?'Ⅱ 停止演奏':'▷ 听这段叠奏';$('undo').disabled=!past.length;$('redo').disabled=!future.length;
  $('scene-hint').textContent=selected.length===2?'A 吞噬 B：A 保留音色 · 合成：生成新的混合声':selected.length?'选好声部与节奏，听它们一起生长':'点选植物，或在下方列表选择。';
  const host=plants.find(p=>p.id===selected[0]);$('inspector').replaceChildren();
  if(host){const title=document.createElement('strong');title.textContent=`A / ${label(host)} · ${stageName(host)}`;const description=document.createElement('div');description.textContent=`现在会唱 ${phraseNotes(host).length} 个音：${phraseNotes(host).map(pitchName).join(' · ')}。能量 ${host.mass}，第 ${host.generation} 代。`;$('inspector').append(title,description);host.mix.forEach(m=>{const tag=document.createElement('span');tag.className='mix-ratio';tag.textContent=`${kinds[m.kind].voice} ${Math.round(m.weight*100)}%`;tag.style.color=kinds[m.kind].color;$('inspector').append(tag);});if(host.lineage.length){const line=document.createElement('div');line.textContent='记住的来源：'+host.lineage.slice(-3).join(' / ');$('inspector').append(line);}}
  else $('inspector').textContent='成长会增加乐句与音色层次；吞噬保留 A 的音色；合成混合两株的音色。';
  $('sequencer').replaceChildren();selected.forEach((id,index)=>{const p=plants.find(p=>p.id===id),lane=document.createElement('div');lane.className='lane';
    const name=document.createElement('span');name.textContent=`${'ABC'[index]} / ${voiceName(p).split(' · ')[0]}`;
    const part=document.createElement('select');part.setAttribute('aria-label',`${'ABC'[index]} 的声部`);for(const [value,label] of [['melody','旋律'],['harmony','和声'],['pulse','点拍']])part.add(new Option(label,value));part.value=p.part;part.onchange=()=>edit(p.id,{part:part.value});
    const volume=document.createElement('label');volume.textContent=`音量 ${Math.round(p.gain*100)}%`;const input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.value=p.gain*100;input.setAttribute('aria-label',`${'ABC'[index]} 的音量`);input.onchange=()=>edit(p.id,{gain:Number(input.value)/100});volume.append(input);
    const steps=document.createElement('div');steps.className='steps';p.pattern.forEach((on,i)=>{const button=document.createElement('button');button.textContent=String(i+1);button.setAttribute('aria-label',`${'ABC'[index]} 第 ${i+1} 拍`);button.setAttribute('aria-pressed',String(on));button.dataset.step=String(i);button.onclick=()=>{const pattern=[...p.pattern];pattern[i]=!on;edit(p.id,{pattern});};steps.append(button);});lane.append(name,part,volume,steps);$('sequencer').append(lane);
  });
}
function edit(id,patch){stop();commit({...state(),plants:plants.map(p=>p.id===id?{...p,...patch}:p)});status('声部、音量或节奏已改变。再听一次，感受它的变化。');}
function audio(){
  if(ctx)return;ctx=new AudioContext();master=ctx.createGain();master.gain.value=muted?0:.38;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=5;master.connect(limiter);limiter.connect(ctx.destination);
  verb=ctx.createConvolver();const impulse=ctx.createBuffer(2,ctx.sampleRate*2.2,ctx.sampleRate);for(let ch=0;ch<2;ch++){let n=41+ch,data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++){n=n*16807%2147483647;data[i]=(n/1073741824-1)*Math.pow(1-i/data.length,3)*.3;}}verb.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.24;verb.connect(wet);wet.connect(master);
}
async function enter(){try{audio();await ctx.resume();if(ctx.state!=='running')throw new Error();started=true;$('welcome').hidden=true;return true;}catch{status('声音尚未打开，请再次点击进入，或检查浏览器音频设置。');return false;}}
function tone(p,midi,at,beats=1.5,gain=p.gain){
  if(!ctx)return;const seconds=60/bpm,duration=Math.min(3.2,Math.max(.3,beats*seconds)),age=stageOf(p);
  // A hybrid mixes the actual oscillator partials and envelopes of both parents.
  for(const mix of p.mix){
    const water=mix.kind==='water',air=mix.kind==='air',partials=water?[[1,1],[2.01,.24]]:air?[[1,1],[2.75,.13],[4.01,.06]]:[[1,1],[2,.28],[3,.11]];
    const env=ctx.createGain(),pan=ctx.createStereoPanner(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=(air?2600:water?2000:1100)+age*350;pan.pan.value=(p.x-.5)*.9;
    env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(.08*gain*mix.weight*(1+age*.08),at+(water?.009:.025));env.gain.exponentialRampToValueAtTime(.0001,at+duration);filter.connect(env);env.connect(pan);pan.connect(master);env.connect(verb);
    let remaining=partials.length;for(const [ratio,weight] of partials){const osc=ctx.createOscillator(),amp=ctx.createGain();osc.type='sine';osc.frequency.value=440*2**((midi-69)/12)*ratio;amp.gain.value=weight;osc.connect(amp);amp.connect(filter);osc.start(at);osc.stop(at+duration+.04);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();amp.disconnect();if(--remaining===0){filter.disconnect();env.disconnect();pan.disconnect();}};}
  }
  events.push({id:p.id,x:p.x,y:p.y,kind:p.kind,time:performance.now()+Math.max(0,at-ctx.currentTime)*1000});
}
function later(fn,delay){const timer=setTimeout(()=>{timers.delete(timer);fn();},delay);timers.add(timer);}
function stop(){for(const timer of timers)clearTimeout(timer);timers.clear();for(const voice of voices){try{voice.stop();}catch{}}voices.clear();events.splice(0);playing=false;mode='';currentBeat=-1;$('beat-status').textContent='8 拍 / 各自保留声音';renderUI();}
function growth(ids){const real=ids.filter(id=>plants.some(p=>p.id===id&&p.growth<9));if(!real.length)return;commit({...state(),plants:plants.map(p=>real.includes(p.id)?grow(p):p)});}
async function solo(p,cultivate=false){
  if(!await enter())return;stop();playing=true;mode=cultivate?'grow':'preview';renderUI();const notes=phraseNotes(p),space=.56,at=ctx.currentTime+.04;
  notes.forEach((midi,i)=>tone(p,midi,at+i*space,1.65));status(cultivate?'听这一轮乐句，完成后它会成长一格。':'听见新声音：音色比例和音序已经发生变化。');
  later(()=>{playing=false;mode='';if(cultivate)growth([p.id]);else renderUI();status(cultivate?`这一株已成长：${stageName(plants.find(q=>q.id===p.id))}。乐句与音色随阶段改变。`:'新声音已留下，可以培育、继续合成，或与其他植物叠奏。');},((notes.length-1)*space+1.8)*1000);
}
function startCycle(){
  const group=selected.map(id=>plants.find(p=>p.id===id)).filter(Boolean),compiled=cycleEvents(group).filter(e=>e.gain>0);if(!compiled.length){stop();status('这段编排没有发声。打开一拍或提高音量，再听一次。');return;}
  const at=ctx.currentTime+.04,step=60/bpm;compiled.forEach(e=>tone(group.find(p=>p.id===e.id),e.midi,at+e.step*step,e.beats,e.gain));
  for(let i=0;i<8;i++)later(()=>{currentBeat=i;$('beat-status').textContent=`第 ${i+1} / 8 拍 · ${bpm} BPM`;document.querySelectorAll('[data-step]').forEach(b=>b.classList.toggle('current',Number(b.dataset.step)===i));},(i*step+.04)*1000);
  later(()=>{growth([...new Set(compiled.map(e=>e.id))]);if($('loop').checked&&playing){renderUI();startCycle();status('完成一轮，参与的植物成长一格。下一轮继续。');}else{playing=false;mode='';currentBeat=-1;renderUI();$('beat-status').textContent='一轮完成 / 成长已保留';status('这段叠奏已完成。声部保持独立，参与的植物获得成长。');}},(8*step+.04)*1000);
}
async function mixPlay(){if(playing){stop();status('已停下，完成的成长仍保留。');return;}if(!selected.length||!await enter())return;stop();playing=true;mode='mix';renderUI();startCycle();}
function transform(type){
  if(selected.length!==2)return;stop();try{const change=type==='absorb'?absorb(plants,...selected):fuse(plants,...selected,crypto.randomUUID());const old=change.parents;
    commit({...state(),plants:change.plants},[change.result.id]);for(const parent of old){if(parent.id===change.result.id)continue;transitions.push({from:parent,to:change.result,color:kinds[parent.kind].color,time:performance.now()});}
    status(type==='absorb'?'A 吞噬了 B：A 的音色不变，音序、能量和成长增加。可撤回。':'两株合成新植物：两种音色按能量比例混合。可撤回。');void solo(plants.find(p=>p.id===change.result.id));
  }catch(error){status(error.message);}
}
$('enter').onclick=async()=>{if(await enter())status('先选一株培育，再选两株试试吞噬与合成。');};
$('nurture').onclick=()=>{const p=plants.find(p=>p.id===selected[0]);if(p)void solo(p,true);};$('absorb').onclick=()=>transform('absorb');$('fuse').onclick=()=>transform('fuse');$('mix-play').onclick=()=>void mixPlay();
document.querySelectorAll('[data-seed]').forEach(button=>button.onclick=()=>{stop();if(plants.length>=24){status('最多保留 24 株。合成两株可以腾出位置。');return;}const i=plants.length,p=seed(button.dataset.seed,.17+(i%5)*.16,.68+(Math.floor(i/5)%3)*.065,1.5,crypto.randomUUID());commit({...state(),plants:[...plants,p]},[p.id]);status('新种子有自己的两个音，听它慢慢长大。');});
$('undo').onclick=()=>{if(!past.length)return;stop();future=[...future,state()].slice(-30);const previous=past.pop();restore(previous);status('上一步已完整撤回，原来的植物、音序和混合比例都回来了。');};
$('redo').onclick=()=>{if(!future.length)return;stop();past=[...past,state()].slice(-30);const next=future.pop();restore(next);status('变化已恢复，可以继续创作。');};
$('tempo').onchange=()=>{const value=Number($('tempo').value);if(!Number.isInteger(value)||value<60||value>120){$('tempo').value=bpm;status('速度请填写 60–120 的整数。');return;}stop();commit({...state(),bpm:value});status('速度已保存，下一轮按新的节奏演奏。');};
$('sound').onclick=()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.38,ctx.currentTime,.05);$('sound').textContent=muted?'♩ 静音':'♫ 有声';$('sound').setAttribute('aria-pressed',String(muted));$('sound').setAttribute('aria-label',muted?'打开声音':'静音');};
canvas.addEventListener('pointerdown',event=>{if(!started){void enter();return;}const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height,size=painter.size();
  const p=[...plants].sort((a,b)=>a.y-b.y).findLast(p=>Math.abs((p.x-x)*size.width)<34&&((p.y-y)*size.height)>-25&&((p.y-y)*size.height)<110);
  if(p){choose(p.id);return;}stop();if(plants.length>=24){status('这一页已经有 24 株，先合成两株再种新的声音。');return;}const plant=seed('water',x,y,1.5,crypto.randomUUID());commit({...state(),plants:[...plants,plant]},[plant.id]);status('空白处长出一颗新的莲种子，可在列表种下花或铃。');
});
let exportURL='';$('export').onclick=()=>{if(exportURL)URL.revokeObjectURL(exportURL);const text=JSON.stringify(state(),null,2);exportURL=URL.createObjectURL(new Blob([text],{type:'application/json'}));$('download').href=exportURL;$('download').download='声音生态.json';$('export-text').value=text;$('export-panel').hidden=false;status('成长、音序、混合比例和叠奏编排都已放入文件。');};
$('import').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>128*1024)throw new Error('请选择小于 128 KB 的文件。');const next=migrate(JSON.parse(await file.text()));stop();commit(next,next.plants.slice(0,2).map(p=>p.id));$('tempo').value=bpm;status('声音生态已打开。原来的生态仍可通过撤回恢复。');}catch(error){status(error.message||'文件无法打开，原生态已保留。');}finally{event.target.value='';}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(ctx)void ctx.suspend();started=false;$('welcome').hidden=false;}});
function render(now){for(let i=events.length-1;i>=0;i--)if(now-events[i].time>2500)events.splice(i,1);for(let i=transitions.length-1;i>=0;i--)if(now-transitions[i].time>1600)transitions.splice(i,1);painter.draw(plants,selected,events,transitions,now);requestAnimationFrame(render);}
renderUI();status(bootMessage);if(storageIssue)$('save-state').textContent='旧档案保留 / 可创作与导出';requestAnimationFrame(render);
