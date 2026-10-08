import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {transformSync} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/WorldExperience.tsx'),'utf8');
const controllerSource=fs.readFileSync(path.join(root,'src/WorldAudio.ts'),'utf8');
const compile=(text,loader)=>transformSync(text,{loader,format:'cjs',target:'es2022'}).code;
const hostCode=compile(source,'tsx'),controllerCode=compile(controllerSource,'ts');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const checks=[];
function check(label,passed,evidence){checks.push({label,passed:!!passed,...(evidence?{evidence}:{})});if(!passed)throw new Error(label);}
const close=(a,b)=>Math.abs(Number(a)-b)<.02;

/** Deliberately small mocks: this verifies host decisions, never browser rendering or audibility. */
async function fixture({scene='shadow',reduced=false,initialStorage={},metadataDelay=false}={}){
  let slots=[],cursor=0,dirty=true,tree,effects=[],raf=new Map(),rafId=0,now=1000,lastRenderState,visits=[],href='http://localhost/?view=experience&scene='+scene+'&v=6';
  let query={matches:reduced,listeners:[],addEventListener(t,f){this.listeners.push(f);},removeEventListener(t,f){this.listeners=this.listeners.filter(x=>x!==f);}};
  const listeners=new Map(),storage=new Map(Object.entries(initialStorage)),media=[],contexts=[],timers=new Map();
  let timerId=0;
  const schedule=(fn,delay=0)=>{const id=++timerId;timers.set(id,{at:now+Math.max(0,Number(delay)||0),fn});return id;};
  const unschedule=id=>timers.delete(id);
  const flushTimers=()=>{for(let guard=0;guard<1000;guard++){const due=[...timers.entries()].filter(([,timer])=>timer.at<=now+.001).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)return;timers.delete(due[0]);due[1].fn();}throw new Error('Mock timers did not settle');};
  class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  let rejectPlay=false,deferPlay=false,deferred=[];
  const captured=new Set();
  const canvas={dataset:{},width:800,height:533,getBoundingClientRect:()=>({width:800,height:533,left:0,top:0}),getContext:()=>({setTransform(){}}),focus(){},setPointerCapture(id){captured.add(id);},hasPointerCapture(id){return captured.has(id);},releasePointerCapture(id){captured.delete(id);}};
  const document={hidden:false,title:'',addEventListener(t,f){const l=listeners.get(t)||[];l.push(f);listeners.set(t,l);},removeEventListener(t,f){listeners.set(t,(listeners.get(t)||[]).filter(x=>x!==f));},getElementById:()=>({focus(){}}),createElement:()=>({width:4,height:4,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(64).fill(255)})})})};
  class AudioMock{
    constructor(src=''){this._src=src;this._currentTime=0;this.paused=true;this.ended=false;this.readyState=metadataDelay?0:4;this.duration=32;this.events={};this.playCalls=0;this.loadCalls=0;this.pending=false;media.push(this);}
    get src(){return this._src;}
    set src(value){this._src=value;}
    get currentTime(){return this._currentTime;}
    set currentTime(value){if(this.readyState<1)throw new Error('Metadata not ready');this._currentTime=Math.max(0,Math.min(this.duration,Number(value)));this.ended=false;}
    addEventListener(t,f){(this.events[t]??=[]).push(f);}
    dispatch(t){for(const f of this.events[t]||[])f();}
    load(){this.loadCalls++;this._currentTime=0;this.paused=true;this.ended=false;this.pending=false;this.readyState=metadataDelay?0:4;if(!metadataDelay)queueMicrotask(()=>this.dispatch('loadedmetadata'));}
    metadata(){this.readyState=4;this.dispatch('loadedmetadata');const ready=deferred.filter(request=>request.media===this&&request.metadataBlocked);deferred=deferred.filter(request=>!ready.includes(request));ready.forEach(request=>request.resolve());}
    pause(){this.paused=true;}
    play(){this.playCalls++;if(rejectPlay)return Promise.reject(new Error('blocked'));if(this.ended)this._currentTime=0;this.paused=false;this.ended=false;if(deferPlay||this.readyState<3){this.pending=true;return new Promise((resolve,reject)=>deferred.push({media:this,metadataBlocked:!deferPlay,resolve:()=>{this.pending=false;resolve();},reject}));}return Promise.resolve();}
    advance(seconds){if(this.paused||this.pending||this.readyState<3)return;this._currentTime=Math.min(this.duration,this._currentTime+seconds);this.dispatch('timeupdate');if(this._currentTime>=this.duration){this.paused=true;this.ended=true;this.dispatch('ended');}}
  }
  class AudioContextMock{
    constructor(){this.sampleRate=44100;this.destination={};this.state='suspended';contexts.push(this);}
    createAnalyser(){return this.analyser={fftSize:0,minDecibels:0,maxDecibels:0,smoothingTimeConstant:0,get frequencyBinCount(){return this.fftSize/2;},connect(){},getByteFrequencyData(bins){for(let i=0;i<bins.length;i++)bins[i]=i<10?180:90;}};}
    createMediaElementSource(audio){this.source=audio;return {connect:()=>{}};}
    resume(){this.state='running';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  }
  class ImageMock{constructor(){this.width=4;this.height=4;}set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}}
  const react={
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(!Object.is(next,slots[i].value)){slots[i].value=next;dirty=true;}}];},
    useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
    useEffect(fn,deps){const i=cursor++;const prior=slots[i];if(!prior||deps.some((v,j)=>!Object.is(v,prior.deps[j]))){effects.push(()=>{prior?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
    createElement(type,props,...children){const value={type,props:props||{},children:children.flat(Infinity).filter(x=>x!==false&&x!=null)};if(props?.ref)props.ref.current=type==='canvas'?canvas:{focus(){}};return value;},
  };
  const location={get href(){return href;},get search(){return new URL(href).search;}};
  const sandbox={console,URL,URLSearchParams,Uint8Array,Uint8ClampedArray,Promise,Map,Math,Number,Object,JSON,Date:ClockDate,performance:{now:()=>now},setTimeout:schedule,clearTimeout:unschedule,queueMicrotask,document,location,history:{replaceState(a,b,url){href=String(url);}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},matchMedia:()=>query,devicePixelRatio:1,Image:ImageMock,Audio:AudioMock,window:{AudioContext:AudioContextMock,setTimeout:schedule,clearTimeout:unschedule},requestAnimationFrame(fn){raf.set(++rafId,fn);return rafId;},cancelAnimationFrame(id){raf.delete(id);}};
  const context=vm.createContext(sandbox);
  const load=(code,imports)=>{const module={exports:{}};vm.runInContext('(function(require,module,exports){'+code+'\n})',context)(name=>imports[name],module,module.exports);return module.exports;};
  const controller=load(controllerCode,{});
  const component=load(hostCode,{react,'./WorldAudio':controller,'./WorldScenes':{duration:32,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),renderWorld(ctx,assets,s){lastRenderState={...s};if(visits.at(-1)!==s.scene)visits.push(s.scene);return {chapter:Math.min(3,Math.floor(s.time/8)),pose:s.interaction%4===1?'dancer-leap':s.interaction%4===2?'dancer-spin':'dancer',partnerPose:'light-brave',actionPhase:s.age<.4?'prepare':s.age<1.25?'act':s.age<2.55?'reply':s.age<3.5?'settle':'idle',capturePhase:(s.captureAge??100)<2.6?'fly':'complete'};}}});
  async function settle(){for(let n=0;n<20;n++){if(dirty){dirty=false;cursor=0;effects=[];tree=component.WorldExperience();const pending=effects;effects=[];for(const f of pending)f();}await Promise.resolve();await Promise.resolve();if(!dirty&&n>4)return;}throw new Error('Mock render failed to settle');}
  const nodes=()=>{const all=[];const walk=n=>{if(n&&typeof n==='object'){all.push(n);n.children?.forEach(walk);}};walk(tree);return all;};
  const node=predicate=>nodes().find(predicate);
  const button=text=>node(n=>n.type==='button'&&n.children.some(c=>typeof c==='string'&&c.includes(text)));
  const byClass=name=>node(n=>typeof n.props.className==='string'&&n.props.className.split(' ').includes(name));
  async function click(target){if(!target||target.props.disabled)throw new Error('Missing/disabled target');target.props.onClick();await settle();}
  async function step(seconds=.1,{advanceAudio=true}={}){now+=seconds*1000;if(advanceAudio)for(const a of media)a.advance(seconds);flushTimers();const frame=[...raf.values()];raf.clear();frame.forEach(f=>f(now));await settle();}
  async function ticks(seconds){for(let i=0;i<Math.round(seconds*10);i++)await step(.1);}
  async function changeScene(id){await click(node(n=>n.props.id==='world-tab-'+id));await step(.1);}
  async function changeReduced(value){query.matches=value;for(const f of query.listeners)f();await settle();await step(.1);}
  async function visibility(hidden){document.hidden=hidden;for(const f of listeners.get('visibilitychange')||[])f();await settle();}
  async function seek(time){const input=node(n=>n.type==='input'&&n.props['aria-label']==='演出进度');input.props.onChange({target:{value:String(time)}});await settle();await step(.1,{advanceAudio:false});}
  async function pointer(type,x=.64,y=.5,id=1){const target=node(n=>n.type==='canvas'),handler=target.props['onPointer'+type];if(!handler)throw new Error('Missing pointer handler '+type);handler({currentTarget:canvas,clientX:x*800,clientY:y*533,pointerId:id,isPrimary:true,button:0,buttons:type==='Up'?0:1,preventDefault(){}});await settle();}
  async function key(key){const target=node(n=>n.type==='canvas');target.props.onKeyDown({key,preventDefault(){}});await settle();}
  await settle();await step(.1);
  return {button,byClass,node,click,step,ticks,changeScene,changeReduced,visibility,seek,pointer,key,media,contexts,canvas,visits,storage,timers,scores:controller.worldScores,get href(){return href;},get frame(){return lastRenderState;},set rejectPlay(v){rejectPlay=v;},set deferPlay(v){deferPlay=v;},async resolvePlay(){deferred.splice(0).forEach(x=>x.resolve());await settle();},async settle(){await settle();}};
}

const h=await fixture();
check('v6 entry updates URL and visible edition to v10',h.href.includes('v=10')&&h.byClass('world-edition').children.includes('v10'));
check('score configuration only points to actual local music files',h.scores&&Object.values(h.scores).every(score=>!score.src||fs.existsSync(path.resolve(root,'web',score.src))),h.scores);
const scoreAvailable=(fixture,scene)=>Boolean(fixture.scores?.[scene]?.src);
const scoreMatches=(fixture,scene)=>scoreAvailable(fixture,scene)?fixture.media.some(media=>media.src===fixture.scores[scene].src&&!media.paused):fixture.media.every(media=>media.paused);
check('initial scene remains silent without constructing audio or an AudioContext',h.media.length===0&&h.contexts.length===0);
await h.click(h.button('开启影子配乐'));await h.step(.1);
check('explicit music button starts the actual configured media source and enables the score',h.media.length===1&&h.media[0].src===h.scores.shadow.src&&!h.media[0].paused&&h.button('关闭影子配乐').props['aria-pressed']);
const analyser=h.contexts[0].analyser;
check('live frequency analyser uses FFT1024 and -90/-10 dB range',analyser.fftSize===1024&&analyser.minDecibels===-90&&analyser.maxDecibels===-10);
h.media[0].currentTime=6.875;await h.step(.1,{advanceAudio:false});
check('shadow stage uses media.currentTime without adding the visual RAF delta',close(h.frame.time,6.875),{mediaTime:h.media[0].currentTime,stageTime:h.frame.time});
check('normalised energy, low and high frequency bands reach the renderer',h.frame.audio.energy>0&&h.frame.audio.low>h.frame.audio.high&&Object.values(h.frame.audio).every(x=>x>=0&&x<=1),h.frame.audio);
await h.click(h.button('暂停演出'));const paused=h.media[0].currentTime;await h.ticks(.5);
check('pause freezes both clocks and sends zero frequency bands',h.media[0].paused&&close(h.frame.time,paused)&&Object.values(h.frame.audio).every(x=>x===0));
await h.click(h.button('继续演出'));await h.ticks(.3);
check('resume continues music from the same position',!h.media[0].paused&&h.media[0].currentTime>paused&&h.media[0].currentTime<paused+1);
await h.seek(12.35);
check('manual timeline seek pauses and updates audio and visual time together',h.media[0].paused&&close(h.media[0].currentTime,12.35)&&close(h.frame.time,12.35));
await h.click(h.byClass('world-chapters').children[2]);await h.step(.1);
check('chapter selection resumes the score from the chosen chapter',!h.media[0].paused&&h.media[0].currentTime>=16.05&&h.media[0].currentTime<16.4);
await h.click(h.button('从头再演'));await h.step(.1);
check('replay resets media and stage together',!h.media[0].paused&&h.media[0].currentTime<.4&&h.frame.time<.4);
h.media[0].currentTime=13.42;await h.click(h.button('关闭影子配乐'));await h.step(.1);
check('disabling music returns to visual clock at the preserved media position',h.media[0].paused&&h.frame.time>=13.42&&h.frame.time<13.7&&Object.values(h.frame.audio).every(x=>x===0));
await h.ticks(.5);check('visual clock continues after music is disabled',h.frame.time>13.7);
h.rejectPlay=true;await h.click(h.button('开启影子配乐'));await h.step(.1);
check('a rejected playback promise returns to silence with an explicit retry message',h.media[0].paused&&h.button('开启影子配乐')&&!h.button('开启影子配乐').props['aria-pressed']&&h.byClass('world-music-note').children.join('').includes('暂时没能播放'));
h.rejectPlay=false;await h.click(h.button('开启影子配乐'));await h.step(.1);
h.media[0].dispatch('error');await h.settle();await h.step(.1);
check('media decoding error disables the score and continues silent animation',h.media[0].paused&&!!h.button('开启影子配乐')&&Object.values(h.frame.audio).every(x=>x===0));
await h.click(h.button('开启影子配乐'));await h.step(.1);await h.changeScene('moon');
check('scene switch uses only the configured score; ungenerated scenes remain explicitly silent',h.frame.scene==='moon'&&scoreMatches(h,'moon')&&(scoreAvailable(h,'moon')||h.byClass('world-music-note').children.join('').includes('配乐待生成')),{configuredScore:h.scores.moon});
await h.changeScene('shadow');await h.step(.1);
check('returning to shadow may resume a previously user-enabled score from its opening',!h.media[0].paused&&h.frame.scene==='shadow'&&h.frame.time<.5);
await h.visibility(true);const hiddenTime=h.media[0].currentTime;await h.ticks(.5);
check('background visibility pauses the score and stage clock',h.media[0].paused&&close(h.media[0].currentTime,hiddenTime)&&close(h.frame.time,hiddenTime));
await h.visibility(false);await h.step(.1);check('foreground visibility resumes a playing score',!h.media[0].paused);
await h.changeReduced(true);const staticTime=h.frame.time;await h.ticks(.5);
check('live reduced-motion switch pauses sound and holds the stage static',h.media[0].paused&&close(h.frame.time,staticTime)&&h.button('关闭影子配乐').props.disabled&&Object.values(h.frame.audio).every(x=>x===0));
await h.changeReduced(false);check('leaving reduced mode does not resume sound automatically',h.media[0].paused);
await h.click(h.button('继续演出'));h.media[0].currentTime=32;h.media[0].paused=true;h.media[0].ended=true;h.media[0].dispatch('ended');await h.settle();await h.step(.1);
check('ended music settles at final tableau with zero bands',close(h.frame.time,31.99)&&h.media[0].paused&&Object.values(h.frame.audio).every(x=>x===0));
const p=await fixture();await p.click(p.button('开启影子配乐'));await p.step(.1);await p.click(p.button('连演三个世界'));await p.step(.1);
check('playlist begins in gravity without leaking the shadow soundtrack',p.frame.scene==='gravity'&&scoreMatches(p,'gravity')&&p.canvas.dataset.playlist==='true',{configuredScore:p.scores.gravity});
await p.ticks(35);check('playlist keeps gravity finale for at least 3.5 seconds',p.frame.scene==='gravity'&&Number(p.canvas.dataset.endingHold)>2.9);
await p.click(p.byClass('world-collect'));await p.ticks(3.8);check('late collection dialogue finishes before the next playlist scene',p.frame.scene==='gravity');
await p.ticks(.5);check('playlist moves from gravity to moon after the late reply',p.frame.scene==='moon'&&scoreMatches(p,'moon'));
await p.ticks(35.8);check('playlist reaches shadow and plays only the previously user-enabled soundtrack',p.frame.scene==='shadow'&&!p.media[0].paused);
p.media[0].currentTime=32;p.media[0].paused=true;p.media[0].ended=true;p.media[0].dispatch('ended');await p.step(.1,{advanceAudio:false});await p.ticks(1.3);
await p.click(p.button('暂停演出'));const hold=Number(p.canvas.dataset.endingHold);await p.ticks(.5);
check('pausing a musical playlist finale freezes its hold timer',p.media[0].paused&&close(p.canvas.dataset.endingHold,hold));
const endedPlayCalls=p.media[0].playCalls;
await p.click(p.button('继续连演'));await p.step(.1);
check('resuming a truly ended playlist finale never calls play or rewinds the media',p.media[0].paused&&p.media[0].playCalls===endedPlayCalls&&p.media[0].currentTime===32&&close(p.frame.time,31.99),{playCallsBefore:endedPlayCalls,playCallsAfter:p.media[0].playCalls,mediaTime:p.media[0].currentTime});
await p.ticks(2.4);
check('the musical playlist ends on the shadow tableau and never loops',p.frame.scene==='shadow'&&p.canvas.dataset.playlist==='false'&&p.canvas.dataset.playing==='false'&&p.media[0].paused,{visits:p.visits});
await p.click(p.button('连演三个世界'));await p.step(.1);await p.seek(9);
check('manual seek cancels playlist and pauses it',p.canvas.dataset.playlist==='false'&&p.canvas.dataset.playing==='false');
await p.click(p.button('连演三个世界'));await p.step(.1);await p.click(p.byClass('world-chapters').children[1]);await p.step(.1);
check('manual chapter selection cancels playlist and plays selected chapter',p.canvas.dataset.playlist==='false'&&p.canvas.dataset.playing==='true'&&p.frame.time>=8);
await p.click(p.button('连演三个世界'));await p.step(.1);await p.click(p.button('从头再演'));await p.step(.1);
check('manual replay cancels playlist',p.canvas.dataset.playlist==='false'&&p.frame.time<.5);
await p.click(p.button('连演三个世界'));await p.step(.1);await p.changeScene('moon');
check('manual scene switch cancels playlist and starts the selected scene',p.frame.scene==='moon'&&p.canvas.dataset.playlist==='false'&&p.canvas.dataset.playing==='true');
await p.click(p.button('专注看演出'));check('theater toggle preserves aria-pressed behavior',p.button('退出专注观看').props['aria-pressed']);
const r=await fixture({reduced:true});
check('initial reduced mode constructs no audio and disables playlist/music',r.media.length===0&&r.button('开启影子配乐').props.disabled&&r.button('连演三个世界').props.disabled);
await r.click(r.byClass('world-chapters').children[2]);await r.step(.1);check('static manual chapter selection remains available',r.frame.time>=16&&r.canvas.dataset.playing==='false');
const q=await fixture();q.deferPlay=true;await q.click(q.button('开启影子配乐'));const pendingTime=q.media[0].currentTime;
await q.changeScene('moon');await q.resolvePlay();await q.step(.1);
check('a stale pending playback promise cannot restart the previous score after a scene switch',q.frame.scene==='moon'&&scoreMatches(q,'moon'),{requestedAt:pendingTime,configuredScore:q.scores.moon});

const drag=await fixture();await drag.seek(5);
await drag.pointer('Down',.42,.6);
for(let n=0;n<40;n++){await drag.pointer('Move',.42+n*.006,.6);await drag.step(.1);}
check('continuous pointer movement does not reset action age and the gesture reaches idle',Number(drag.canvas.dataset.actionAge)>=3.5&&drag.canvas.dataset.actionPhase==='idle'&&Number(drag.canvas.dataset.interactions)===1,{actionAge:drag.canvas.dataset.actionAge,actionPhase:drag.canvas.dataset.actionPhase,interactions:drag.canvas.dataset.interactions});
await drag.pointer('Up',.65,.6);const dragPaused=drag.frame.time;await drag.ticks(.4);
check('dragging in a paused tableau preserves the paused show clock',close(drag.frame.time,dragPaused)&&drag.canvas.dataset.playing==='false');

const delayed=await fixture({metadataDelay:true});await delayed.seek(12.35);await delayed.click(delayed.button('开启影子配乐'));
await delayed.ticks(1.2);
check('delayed metadata keeps the requested media position available instead of rewinding to zero',delayed.frame.time>=12.3&&delayed.frame.time<14,{stageTime:delayed.frame.time,readyState:delayed.media[0].readyState});
delayed.media[0].metadata();await delayed.settle();await delayed.step(.1);
check('metadata arrival applies the outstanding seek before normal musical playback',delayed.media[0].readyState===4&&delayed.media[0].currentTime>=12.3&&delayed.media[0].currentTime<12.7&&!delayed.media[0].paused,{mediaTime:delayed.media[0].currentTime,stageTime:delayed.frame.time});

const timeout=await fixture();timeout.deferPlay=true;await timeout.click(timeout.button('开启影子配乐'));
await timeout.ticks(14);
check('preparing score remains pending before the configured fifteen second deadline',timeout.byClass('world-music-toggle').props['aria-pressed']&&timeout.byClass('world-music-note').children.join('').includes('准备'));
await timeout.ticks(1.4);
check('an unresolved play promise times out to explicit silent fallback',timeout.media[0].paused&&!timeout.byClass('world-music-toggle').props['aria-pressed']&&/静音|暂时|超时/.test(timeout.byClass('world-music-note').children.join('')),{stageTime:timeout.frame.time,message:timeout.byClass('world-music-note').children.join('')});
const fallbackTime=timeout.frame.time;await timeout.ticks(.5);
check('visual performance advances again after preparing music times out',timeout.frame.time>fallbackTime&&Object.values(timeout.frame.audio).every(value=>value===0));
await timeout.resolvePlay();await timeout.step(.1);
check('a timed out playback promise cannot revive old sound when it eventually resolves',timeout.media[0].paused&&!timeout.byClass('world-music-toggle').props['aria-pressed']);

const stalled=await fixture();await stalled.click(stalled.button('开启影子配乐'));await stalled.ticks(.3);
stalled.media[0].readyState=2;stalled.media[0].dispatch('waiting');await stalled.settle();await stalled.ticks(15.4);
check('waiting without media progress also falls back after fifteen seconds',stalled.media[0].paused&&!stalled.byClass('world-music-toggle').props['aria-pressed']&&/静音|暂时|超时/.test(stalled.byClass('world-music-note').children.join('')));
const repeatedStall=await fixture();await repeatedStall.click(repeatedStall.button('开启影子配乐'));await repeatedStall.ticks(.3);
repeatedStall.media[0].readyState=2;repeatedStall.media[0].dispatch('waiting');await repeatedStall.settle();await repeatedStall.ticks(10);
repeatedStall.media[0].dispatch('stalled');await repeatedStall.settle();await repeatedStall.ticks(5.4);
check('repeated waiting or stalled events cannot extend a fifteen second no-progress deadline',repeatedStall.media[0].paused&&!repeatedStall.byClass('world-music-toggle').props['aria-pressed']);
const recovering=await fixture();await recovering.click(recovering.button('开启影子配乐'));await recovering.ticks(.3);
recovering.media[0].readyState=2;recovering.media[0].dispatch('waiting');await recovering.settle();await recovering.ticks(10);
recovering.media[0].readyState=4;recovering.media[0].dispatch('playing');await recovering.settle();await recovering.ticks(6);
check('real playback recovery clears the previous waiting deadline',!recovering.media[0].paused&&recovering.byClass('world-music-toggle').props['aria-pressed']&&recovering.frame.audio.energy>0);
if(scoreAvailable(h,'gravity')){
  const sourceSwitch=await fixture();sourceSwitch.deferPlay=true;await sourceSwitch.click(sourceSwitch.button('开启影子配乐'));await sourceSwitch.changeScene('gravity');await sourceSwitch.resolvePlay();await sourceSwitch.step(.1);
  check('source load resets old media position and reuses the single audio graph',sourceSwitch.media.length===1&&sourceSwitch.contexts.length===1&&sourceSwitch.media[0].loadCalls>=1&&sourceSwitch.media[0].currentTime<.5&&sourceSwitch.media[0].src===sourceSwitch.scores.gravity.src,{loadCalls:sourceSwitch.media[0].loadCalls,mediaTime:sourceSwitch.media[0].currentTime});
  check('stale old play completion cannot revive the shadow score over the new garden score',scoreMatches(sourceSwitch,'gravity')&&sourceSwitch.frame.scene==='gravity');
}

const garden=await fixture({scene:'gravity'});await garden.seek(29);
const plantRun=await fixture({scene:'gravity'});
if(scoreAvailable(plantRun,'gravity'))await plantRun.click(plantRun.byClass('world-music-toggle'));
await plantRun.click(plantRun.button('连演三个世界'));await plantRun.ticks(.5);
const selectingTime=plantRun.frame.time;
await plantRun.click(plantRun.byClass('world-plant'));await plantRun.step(.1);
check('entering plant selection cancels playlist and pauses visual and available musical clocks',plantRun.canvas.dataset.playlist==='false'&&plantRun.canvas.dataset.playing==='false'&&close(plantRun.frame.time,selectingTime)&&plantRun.media.every(media=>media.paused),{timeBefore:selectingTime,timeAfter:plantRun.frame.time,playlist:plantRun.canvas.dataset.playlist});
await plantRun.pointer('Down',.56,.75);await plantRun.pointer('Up',.56,.75);await plantRun.ticks(2.9);
check('a planted discovery completes its independent feedback while the stable show remains paused',plantRun.frame.gardenPlots.length===1&&plantRun.frame.captureAge>=2.6&&close(plantRun.frame.time,selectingTime)&&plantRun.canvas.dataset.playing==='false'&&plantRun.media.every(media=>media.paused),{captureAge:plantRun.frame.captureAge,stageTime:plantRun.frame.time});
const plotKey='chippytea-garden-plots';
const plots=()=>garden.frame.gardenPlots||[];
const storedPlots=()=>JSON.parse(garden.storage.get(plotKey)||'[]');
const gardenCount=()=>JSON.parse(garden.storage.get('chippytea-original-worlds')||'{}').gravity||0;
await garden.click(garden.byClass('world-plant'));
check('arming a planting location neither collects nor changes the show time',gardenCount()===0&&plots().length===0&&close(garden.frame.time,29));
await garden.key('Escape');await garden.step(.1);
check('Escape cancels planting mode without leaving a plot',gardenCount()===0&&plots().length===0&&!garden.byClass('world-plant').props['aria-pressed']);
await garden.click(garden.byClass('world-plant'));await garden.pointer('Down',.4,.77);await garden.pointer('Move',.55,.78);await garden.step(.1);
check('plant location preview does not save before pointer release',gardenCount()===0&&plots().length===0);
await garden.pointer('Up',.55,.78);await garden.step(.1);
check('pointer release plants one saved location during the final act',gardenCount()===1&&plots().length===1&&storedPlots().length===1&&close(garden.frame.time,29),{plots:plots(),stored:storedPlots()});
await garden.click(garden.byClass('world-plant'));await garden.key('ArrowLeft');await garden.key('Enter');await garden.step(.1);
check('keyboard Enter commits a planting location and exits selection',gardenCount()===2&&plots().length===2&&!garden.byClass('world-plant').props['aria-pressed']);
for(const [x,y] of [[0,0],[1,1],[.3,.7],[.68,.8]]){await garden.click(garden.byClass('world-plant'));await garden.pointer('Down',x,y);await garden.pointer('Up',x,y);await garden.step(.1);}
check('garden keeps only the most recent four valid saved positions',plots().length===4&&storedPlots().length===4&&gardenCount()===6,{plots:plots(),stored:storedPlots()});
const safeGardenPoint=plot=>Number.isFinite(plot.x)&&Number.isFinite(plot.y)&&plot.x>=.39&&plot.x<=.66&&plot.y>=.73&&plot.y<=.765;
check('out of bounds clicks are clamped into the actual garden planting safe area',plots().every(safeGardenPoint),plots());
const reloaded=await fixture({scene:'gravity',initialStorage:Object.fromEntries(garden.storage)});
check('reloading restores the actual four planted positions rather than only a count',JSON.stringify(reloaded.frame.gardenPlots)===JSON.stringify(storedPlots()),reloaded.frame.gardenPlots);
const oldGarden=await fixture({scene:'gravity',initialStorage:{'chippytea-original-worlds':JSON.stringify({gravity:3,moon:0,shadow:0})}});
check('legacy count-only records remain usable with three safe fallback plots',oldGarden.frame.count===3&&Array.isArray(oldGarden.frame.gardenPlots)&&oldGarden.frame.gardenPlots.length===3&&oldGarden.frame.gardenPlots.every(safeGardenPoint),{count:oldGarden.frame.count,plots:oldGarden.frame.gardenPlots});
const corruptGarden=await fixture({scene:'gravity',initialStorage:{[plotKey]:JSON.stringify([{x:-99,y:99},{x:'bad',y:.5},null,{x:.55,y:.8}])}});
check('malformed garden records are filtered or safely clamped without breaking the host',Array.isArray(corruptGarden.frame.gardenPlots)&&corruptGarden.frame.gardenPlots.length===2&&corruptGarden.frame.gardenPlots.every(safeGardenPoint),corruptGarden.frame.gardenPlots);
const zoomedGarden=await fixture({scene:'gravity'});await zoomedGarden.seek(12);await zoomedGarden.click(zoomedGarden.byClass('world-plant'));
const testZoom=1.055,targetPoint={x:.55,y:.75},testOffset=Math.sin(12*.21)*18;
const screenPoint={x:(768+(targetPoint.x*1536-768+testOffset)*testZoom)/1536,y:(570+(targetPoint.y*1024-570)*testZoom)/1024};
zoomedGarden.canvas.dataset.zoom=String(testZoom);
await zoomedGarden.pointer('Down',screenPoint.x,screenPoint.y);await zoomedGarden.pointer('Up',screenPoint.x,screenPoint.y);await zoomedGarden.step(.1);
check('planting inversely projects the visible pointer through camera zoom and pan',Math.abs(zoomedGarden.frame.gardenPlots[0].x-targetPoint.x)<.0001&&Math.abs(zoomedGarden.frame.gardenPlots[0].y-targetPoint.y)<.0001,{targetPoint,screenPoint,actual:zoomedGarden.frame.gardenPlots[0]});
await zoomedGarden.click(zoomedGarden.byClass('world-plant'));await zoomedGarden.pointer('Down',.6,.75);await zoomedGarden.pointer('Cancel',.6,.75);await zoomedGarden.pointer('Up',.6,.75);await zoomedGarden.step(.1);
check('cancelled pointer selection never commits an extra plant',zoomedGarden.frame.gardenPlots.length===1);
await zoomedGarden.changeScene('moon');await zoomedGarden.changeScene('gravity');
check('scene switching cancels location selection while preserving saved plants',zoomedGarden.canvas.dataset.planting==='false'&&zoomedGarden.frame.gardenPlots.length===1);

const record={version:10,kind:'component_and_audio_logic_simulation',mocked:true,browserVerification:false,visualVerification:false,actualAudioPlaybackVerified:false,source:'src/WorldExperience.tsx',sourceSha256:hash(source),audioController:'src/WorldAudio.ts',audioControllerSha256:hash(controllerSource),musicConfiguration:h.scores,musicConfigurationSha256:hash(JSON.stringify(h.scores)),script:'tooling/verify-world-host.mjs',scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8')),checkedAt:new Date().toISOString(),environment:'Node VM + mocked React hooks, Image, DOM, requestAnimationFrame, localStorage, HTMLAudioElement, AudioContext, controlled timeout timers and renderWorld; no real browser or audible playback',checks,passed:checks.every(x=>x.passed),limitations:['Browser autoplay policy, physical sound output, real decoder timing, fonts/layout, pointer routing, Canvas imagery and persistence across real reloads are not verified by these mocks.','Real media existence, MP3 decoding, non-silence and generation provenance are recorded separately in notes/world-music-generation-v9.json and subsequent music generation records.','Ended playback, metadata loading, source load and timeout behavior are modeled explicitly; these checks still do not constitute browser media validation.']};
fs.writeFileSync(path.join(root,'notes/host-behavior-verification-v10.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({passed:record.passed,checks:checks.length,sourceSha256:record.sourceSha256,audioControllerSha256:record.audioControllerSha256,mocked:true,browserVerification:false}));
