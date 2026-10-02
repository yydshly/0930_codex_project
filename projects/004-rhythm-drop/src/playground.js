import {createPlaygroundStage} from './playground-stage.js';
import {createPlaygroundAudio} from './playground-audio.mjs';
import {sounds,echo,inputPhases,newGame,reduceGame,readMelody,responseScore} from './playground-game.mjs';

const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('[data-tile]')];
const stage=createPlaygroundStage($('stage')),audio=createPlaygroundAudio();
let state=newGame(),paused=false,starting=false,muted=false,lastTap=-1,liveTile=-1,liveUntil=0,generation=0,hintTurn=0,queue=[],saved=[],storageWorks=true;
const storageKey='rhythm-drop.playground.melody.v1';
try{saved=readMelody(localStorage.getItem(storageKey));}catch{storageWorks=false;}
const pulses=Array(5).fill(-100),motions={},starts={mumu:[-2.8,1.85],he:[.9,-.85],mai:[-1.35,-1.15],dou:[-4.25,1.85]};
for(const [role,[x,z]]of Object.entries(starts))motions[role]={from:{x,z},to:{x,z},at:-10,duration:.45,jump:false};
const smooth=x=>x*x*(3-2*x);
function position(role,time){const m=motions[role],t=Math.min(1,Math.max(0,(time-m.at)/m.duration)),a=smooth(t);return {x:m.from.x+(m.to.x-m.from.x)*a,z:m.from.z+(m.to.z-m.from.z)*a,y:m.jump?(m.from.y??0)*(1-t)+Math.sin(t*Math.PI)*.63:0,walking:!m.jump&&t<1};}
function move(role,x,z,{jump=false,at=audio.clock(),duration=.48}={}){const from=position(role,at);motions[role]={from,to:{x,z},at,duration,jump};}
function visualNote(note,at){
  pulses[note.tile]=at;liveTile=note.tile;liveUntil=at+.4;
  if(note.role==='mumu')move('mumu',...stage.tilePlaces[note.tile],{jump:true,at});
  else{const p=position(note.role,at);move(note.role,p.x,p.z,{jump:true,at});}
  if(state.phase==='echoListen')liveTile=note.tile;
}
function enqueue(at,run){queue.push({at,run,generation});queue.sort((a,b)=>a.at-b.at);}
function emit(note,at=audio.clock()+.012){audio.note(note,at);enqueue(at,()=>visualNote(note,at));}
function advance(from,at){enqueue(at,()=>change({type:'advance',from}));}
function remember(){
  if(!state.melody.length)return;saved=[...state.melody];
  try{localStorage.setItem(storageKey,JSON.stringify(saved));storageWorks=true;}catch{storageWorks=false;}
}
function playPhrase(phrase,{ensemble=false,newcomer=true,at=audio.clock()+.5,step=.62}={}){
  for(const note of responseScore(phrase,{ensemble,step}))if(newcomer||note.role!=='dou')emit(note,at+note.at);
  return at+Math.max(0,phrase.length-1)*step+.95;
}
function change(action){
  const previous=state;state=reduceGame(state,action);
  if(state===previous)return;
  if(action.type==='tap'&&state.phase==='free')remember();
  if(state.phase!==previous.phase){
    const time=audio.clock();
    if(state.phase==='firstReply')advance('firstReply',playPhrase(state.first));
    if(state.phase==='echoListen')advance('echoListen',playPhrase(echo,{at:time+.8,step:.85}));
    if(state.phase==='echoTogether')advance('echoTogether',playPhrase(echo,{ensemble:true,newcomer:false,at:time+.45}));
    if(state.phase==='welcome')move('dou',-2.9,1.65,{at:time,duration:1.35});
    if(state.phase==='finale'){
      remember();move('dou',-1.6,1.85,{at:time,duration:.7});
      const end=playPhrase(state.melody,{ensemble:true,at:time+.8});
      const finish=playPhrase(state.melody,{ensemble:true,at:end+.1,step:.55});
      // A shared major cadence makes the welcome audible.
      for(const [role,midi]of [['mumu',60],['he',76],['mai',48],['dou',79]])emit({role,midi,tile:0,length:1.1,gain:.055},finish-.3);
      advance('finale',finish+1.1);
    }
    if(state.phase==='freeListen')advance('freeListen',playPhrase(state.melody,{ensemble:true,at:time+.25,step:.5}));
  }
  updateUI();
}
const script={
  intro:['小禾','你好，木木！想一起玩吗？','先点「一起玩」，再踩下面的彩色地砖。','给每个小伙伴，留一个位置'],
  explore:['小禾','踩三块地砖，听听你的声音。','喜欢哪个颜色，就点哪个。每一步都能唱歌。','木木的脚步，开始有了声音'],
  firstReply:['小禾','听到了！我来接你的三个音。','先听一听，小禾正在用钟琴回答你。','你的旋律，被小禾接住了'],
  echoListen:['小禾','这次我先跳，你来接好吗？','看看亮起的地砖，听听这三个音。','先听朋友，再用自己的声音回答'],
  echoInput:['小禾','轮到你了：哆、咪、嗦。','按刚才的顺序点地砖，慢慢来就好。','不着急，我们等着你的回答'],
  echoTogether:['阿麦','接住啦！我也来给你们伴奏。','听，钢琴、钟琴和低音走到了一起。','不同的声音，也能一起跳'],
  welcome:['木木','豆豆来了，给他编一小段歌吧。','点四个喜欢的音，邀请新朋友一起玩。','现在，换你给新朋友留一个位置'],
  finale:['豆豆','谢谢你！我也想一起跳！','这是你编的旋律，大家正在一起唱。','你创造的声音，让我们走到了一起'],
  complete:['木木','这首小曲，是我们一起做的！','再听一遍，或者继续编自己的歌。','四个小伙伴，一个共同的节拍'],
  free:['木木','音乐操场，现在交给你！','随便跳，把喜欢的音连起来。最多留住最近十六个音。','每次跳跃，都可以是新的创作'],
  freeListen:['小禾','听，你的小曲又长大了一点。','我们用四种声音，唱出你刚才的脚步。','同一段旋律，每个朋友有自己的声音'],
};
function chapter(){return ['intro','explore','firstReply'].includes(state.phase)?0:['echoListen','echoInput','echoTogether'].includes(state.phase)?1:2;}
function updateUI(){
  const [speaker,message,instruction,label]=script[state.phase];$('speaker').textContent=speaker;$('message').textContent=message;$('instruction').textContent=state.hint?'试试亮着的那一块，小禾陪你慢慢跳。':instruction;$('scene-label').textContent=label;
  $('speaker').style.background=speaker==='木木'?'#efdbbf':speaker==='阿麦'?'#d8e3cd':speaker==='豆豆'?'#eadfae':'#ebd1c9';
  $('intro').hidden=state.phase!=='intro';$('pause-screen').hidden=!paused;
  buttons.forEach(button=>button.disabled=paused||!inputPhases.includes(state.phase));
  const c=chapter();document.querySelectorAll('[data-chapter]').forEach((el,i)=>{el.setAttribute('aria-current',i===c?'step':'false');el.classList.toggle('done',i<c||state.phase==='complete');});
  $('counter').textContent=state.phase==='explore'?`${state.first.length} / 3`:state.phase==='echoInput'?`${state.answer} / 3`:state.phase==='welcome'?`${state.welcome.length} / 4`:['complete','free','freeListen'].includes(state.phase)?'♫':'···';
  $('keepsake').hidden=!['complete','free','freeListen'].includes(state.phase);
  $('free').hidden=state.phase!=='complete';$('listen').disabled=state.phase==='freeListen'||!state.melody.length||paused;$('listen').textContent=state.phase==='freeListen'?'♫ 大家正在唱…':'♫ 听听我们的歌';
  $('melody-name').textContent=state.phase==='free'?`新旋律 · ${state.melody.length} 个音`:'木木与朋友们';
  $('save-state').textContent=storageWorks?'旋律已留在这台设备，关掉后也能再听。':'当前浏览器不能保存，旋律可以在本页继续播放。';
  $('celebration').hidden=!['finale','complete'].includes(state.phase);$('last-song').hidden=state.phase!=='intro'||!saved.length;
  $('status').textContent=paused?'小伙伴暂停了。点「继续一起跳」回来。':state.phase==='intro'?'原创角色与合成音色 · 无需账号':'你可以点下面的按钮，也可以直接点操场里的地砖。';
  drawPhrase();
}
function phraseData(){
  if(['explore','firstReply'].includes(state.phase))return {notes:state.first,total:3};
  if(['echoListen','echoInput','echoTogether'].includes(state.phase))return {notes:echo,total:3,ghost:state.phase==='echoInput'?state.answer:3};
  if(['welcome','finale','complete'].includes(state.phase))return {notes:state.welcome,total:4};
  return {notes:state.melody,total:0};
}
function drawPhrase(){
  const {notes,total,ghost}=phraseData();$('phrase').replaceChildren();
  if(state.phase==='intro'){const el=document.createElement('span');el.className='empty';el.textContent='♪  ·  ♫  ·  ♪';$('phrase').append(el);return;}
  for(let i=0;i<Math.max(notes.length,total);i++){
    const el=document.createElement('span');el.className='note';const tile=notes[i];
    if(tile===undefined){el.classList.add('ghost');el.style.setProperty('--tile','#a9b197');el.textContent='·';}
    else{el.style.setProperty('--tile',sounds[tile].color);el.textContent=sounds[tile].name;el.dataset.note=tile;if(ghost!==undefined&&i>=ghost)el.classList.add('ghost');}
    $('phrase').append(el);
  }
}
function tap(tile){
  if(paused||!inputPhases.includes(state.phase)||!audio.ready())return;
  const time=audio.clock();if(time-lastTap<.13)return;lastTap=time;
  const expected=state.phase==='echoInput'?echo[state.answer]:null;
  const answer=state.answer,hintId=++hintTurn;
  emit({role:'mumu',tile,midi:sounds[tile].midi});change({type:'tap',tile});
  if(expected!==null&&tile!==expected)enqueue(time+.4,()=>{if(hintTurn===hintId&&state.phase==='echoInput'&&state.answer===answer&&state.hint)emit({role:'he',tile:expected,midi:sounds[expected].midi+12,gain:.055});});
}
async function enable(){
  if(starting)return false;starting=true;
  try{await audio.init();paused=false;return true;}catch{$('status').textContent='声音还没开启，请再点一次「一起玩」。';return false;}finally{starting=false;}
}
function clearPerformance(){generation++;hintTurn++;queue=[];audio.stop();pulses.fill(-100);liveTile=-1;lastTap=-1;for(const [role,[x,z]]of Object.entries(starts))motions[role]={from:{x,z},to:{x,z},at:audio.clock()-10,duration:.45,jump:false};}
$('start').onclick=async()=>{const turn=generation;if(await enable()&&turn===generation){clearPerformance();change({type:'start'});}};
$('restart').onclick=()=>{clearPerformance();state=newGame();paused=false;updateUI();};
$('resume').onclick=async()=>{if(await enable())updateUI();};
$('listen').onclick=()=>change({type:'listen'});$('free').onclick=()=>change({type:'free'});
$('listen-saved').onclick=async()=>{const turn=generation;if(await enable()&&turn===generation){clearPerformance();state={...newGame(),phase:'complete',welcome:[...saved],melody:[...saved]};change({type:'listen'});}};
$('mute').onclick=()=>{muted=!muted;audio.mute(muted);$('mute').textContent=muted?'♫ 声音关':'♫ 声音开';$('mute').setAttribute('aria-pressed',String(muted));$('mute').setAttribute('aria-label',muted?'开启声音':'关闭声音');};
buttons.forEach(button=>button.onclick=()=>tap(Number(button.dataset.tile)));
stage.canvas.addEventListener('pointerdown',event=>{const tile=stage.pick(event.clientX,event.clientY);if(tile>=0){event.preventDefault();tap(tile);}});
document.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;const tile=Number(event.key)-1;if(event.key>='1'&&event.key<='5'){event.preventDefault();tap(tile);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase!=='intro'&&audio.ready()){paused=true;void audio.pause();updateUI();}});
window.addEventListener('pagehide',()=>{clearPerformance();void audio.close();stage.dispose();});
function render(){
  requestAnimationFrame(render);const time=audio.clock();
  if(!paused)while(queue.length&&queue[0].at<=time){const event=queue.shift();if(event.generation===generation)event.run();}
  const c=chapter();
  for(const role of Object.keys(starts)){
    const p=position(role,time),m=motions[role],pulse=m.jump?Math.max(0,1-(time-m.at)/.4):0;
    stage.updateChild(role,{...p,pulse,visible:role!=='dou'||c===2,beckon:role==='he'&&c===0&&state.phase!=='firstReply'||role==='mumu'&&state.phase==='welcome',celebrate:state.phase==='complete'},time);
  }
  const strength=pulses.map(at=>Math.max(0,1-(time-at)/.5));
  buttons.forEach((button,i)=>{button.classList.toggle('hit',strength[i]>.5);button.classList.toggle('hint',state.phase==='echoInput'&&state.hint&&i===echo[state.answer]);});
  document.querySelectorAll('[data-note]').forEach(el=>el.classList.toggle('active',time<liveUntil&&Number(el.dataset.note)===liveTile));
  stage.render(strength,state.phase==='echoInput'&&state.hint?echo[state.answer]:-1);
}
updateUI();render();$('start').disabled=false;$('start').textContent='▶ 一起玩';$('status').textContent='点「一起玩」开启声音，小伙伴已经准备好了。';
