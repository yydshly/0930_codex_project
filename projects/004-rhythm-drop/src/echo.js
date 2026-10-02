import {createEchoStage} from './echo-stage.js';
import {createEchoAudio} from './echo-audio.mjs';
import {identities} from './echo-characters.js';
import {phrase,signatures,performanceScore,performanceAt,filmScore,filmAt,meetingScore,MEETING_LENGTH,REST_LENGTH,newEpisode,reduceEpisode,readProgress} from './echo-story.mjs';
import {emotionScore,emotionAt,EMOTION_DURATION} from './echo-emotion.mjs';

const $=id=>document.getElementById(id),notes=[...document.querySelectorAll('[data-note]')];
const stage=createEchoStage($('stage')),audio=createEchoAudio();
let state=newEpisode(),mode='intro',selected='kong',view='front',pose='waiting',paused=false,starting=false,muted=false,generation=0,queue=[],performanceStart=0,filmStart=0,emotionStart=0,phaseStarted=0,lastInput=-1,completed=false,storageWorks=true,lastPerfChapter='';
const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const last={kong:-100,zhe:-100,dong:-100,su:-100},noteTimes=[-100,-100,-100];let treeAt=-100;
const progressKey='rhythm-drop.echo-crew.progress.v1';
try{completed=readProgress(localStorage.getItem(progressKey));}catch{storageWorks=false;}
function schedule(at,run){queue.push({at,run,generation});queue.sort((a,b)=>a.at-b.at);}
function emit(note,at=audio.clock()+.015,{tree=false,index}={}){
  audio.note(tree?{...note,pan:-.5}:note,at);schedule(at,()=>{if(tree)treeAt=at;else if(!['score','step'].includes(note.source))last[note.voice]=at;if(Number.isInteger(index))noteTimes[index]=at;});
}
function clear(){generation++;queue=[];audio.stop();for(const id of Object.keys(last))last[id]=-100;noteTimes.fill(-100);treeAt=-100;lastInput=-1;}
function showStage(){$('stage').scrollIntoView?.({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function advance(from,at){schedule(at,()=>change({type:'advance',from}));}
function change(action){
  const previous=state;state=reduceEpisode(state,action);if(previous===state)return;
  const time=audio.clock();
  if(previous.phase!==state.phase){
    phaseStarted=time;
    if(state.phase==='question'){
      phrase.forEach((midi,index)=>emit({voice:'zhe',midi:midi+12,length:.35},time+.45+index*.65,{tree:true,index}));advance('question',time+2.8);
    }
    if(state.phase==='crowded'){
      phrase.forEach((midi,index)=>emit({voice:'kong',midi,length:.38},time+.12+index*.10,{index}));advance('crowded',time+1.55);
    }
    if(state.phase==='listening'){
      phrase.forEach((midi,index)=>emit({voice:'zhe',midi:midi+12,length:.38},time+.4+index*.8,{tree:true,index}));advance('listening',time+3.05);
    }
    if(state.phase==='accepted'){
      for(const note of meetingScore)emit(note,time+note.at,{index:phrase.indexOf(note.midi%12+60)});
      advance('accepted',time+MEETING_LENGTH);
    }
    if(state.phase==='complete'){
      completed=true;try{localStorage.setItem(progressKey,JSON.stringify({version:1,episode1:true}));}catch{storageWorks=false;}
    }
  }
  updateUI();
}
const lines={
  intro:['空空','里面有人在唱歌吗？','听一听，它想对空空说什么。','空空的第一天'],
  question:['空空','我听见了！我也想说一句。','先看一看，空空为什么有点着急。','听见树洞里的三个音'],
  crowded:['空空','咦，怎么挤成一团了？','三个音同时跑出来，问候变得听不清了。','太着急的第一次回应'],
  ready:['空空','这次，我想把整句听完。','点「再听完整的一句」，陪空空重新听。','给声音一点空间'],
  listening:['空空','哆、来、咪……还有吗？','等这句唱完，再给回应留一拍。','先听完'],
  rest:['空空','先留一拍，让声音落下来。','按住「留一拍」，让空腔安静一下。','留白'],
  reply:['空空','现在，可以说我的问候了。','按哆、来、咪的顺序，慢慢回送这三个音。','回应'],
  accepted:['折折','我听见你的问候了！','折折走出树洞，也用自己的声音回答。','问候被接住了'],
  complete:['空空','原来，我们可以这样说话。','第一句问候，把两个小伙伴连在了一起。','一句问候，两位朋友'],
};
const descriptions={kong:'空空想说出自己的问候。它只能清楚留住最近的一小句，所以学着先听完，再回应。',zhe:'折折的折耳会打开和收起。没听完整的时候，它可以请朋友再说一次。',dong:'咚咚用风箱身体给大家稳稳的低音。需要换气时，也会请伙伴接一拍。',su:'簌簌总想看看下一阵风。风尾带它起跳，也提醒它回头等等朋友。'};
const filmLines={intro:['树洞里，有个还没认识的小伙伴。','一声小小的问候'],question:['三个音，从树洞飘向空空。','听见'],crowded:['空空太想被听见，三个音挤在一起。','着急'],ready:['它低下头，又决定认真听一次。','再试一次'],listening:['这次，空空让每一个音都落下来。','把整句听完'],rest:['没有声音的这一拍，也是一句话的一部分。','留一拍'],reply:['同一句问候，慢慢变成了空空自己的声音。','回一句'],accepted:['折折走了出来，用自己的声音接住它。','被听见'],complete:['不用说得很响。留出空间，就能听见彼此。','第一句问候，两位朋友']};
function updateUI(){
  let line=lines[state.phase];
  if(mode==='character')line=[identities[selected].name,identities[selected].feature+'，是它自己的特点。','看看正侧背，再听一听它的短句。','认识 '+identities[selected].name];
  if(mode==='performance'){const p=performanceAt(audio.clock()-performanceStart);line=['空空',p.complete?'听完、留白，问候就能被接住。':p.chapter==='听完'?'把朋友的一小句听完整。':p.chapter==='留白'?'这一拍，什么也不急着说。':'把声音从空腔里，送给朋友。','十秒试演 · 音乐与动作一起发生',p.complete?'试演结束':p.chapter];}
  const film=mode==='film'?filmAt(audio.clock()-filmStart):null;
  if(film){const story=lines[film.phase];line=[story[0],story[1],filmLines[film.phase][0],filmLines[film.phase][1]];}
  const emotional=mode==='emotion'?emotionAt(audio.clock()-emotionStart):null;
  if(emotional)line=emotional.dialogue;
  $('speaker').textContent=line[0];$('message').textContent=line[1];$('instruction').textContent=state.hint&&mode==='episode'?(state.phase==='rest'?'可以再按住一小会儿，小伙伴会等你。':'试试亮着的那个音，已经接对的还在。'):line[2];$('phase-label').textContent=line[3];
  $('scene-label').textContent=mode==='character'?'回声小队 · 人物认识':emotional?'那句没说完的问候':mode==='film'?'回声小队 · 20 秒小故事':'声谷 · 树洞旁';
  $('welcome').hidden=mode!=='intro';$('pause-screen').hidden=!paused;$('view-controls').hidden=mode!=='character';
  $('dialogue').hidden=mode==='intro'||mode==='character';$('phrase').hidden=mode!=='episode';$('note-controls').hidden=mode!=='episode'||state.phase!=='reply';
  $('listen').hidden=mode!=='episode'||!['ready','rest','reply'].includes(state.phase);$('listen').disabled=paused;
  $('hold').hidden=mode!=='episode'||state.phase!=='rest';$('hold').disabled=paused;
  $('rest-progress').hidden=$('hold').hidden;
  $('again').hidden=!(mode==='episode'&&state.phase==='complete'||film?.complete||emotional?.complete);$('again').disabled=paused;$('again').textContent=film||emotional?'♫ 陪空空回一句':'↻ 再说一次问候';
  $('action-controls').hidden=$('listen').hidden&&$('hold').hidden&&$('again').hidden;
  notes.forEach(button=>button.disabled=paused||mode!=='episode'||state.phase!=='reply');
  $('pause').disabled=mode==='intro'||!audio.ready()&&!paused;$('pause').textContent=paused?'▶ 继续':'Ⅱ 暂停';$('pause').setAttribute('aria-label',paused?'继续':'暂停');
  $('counter').textContent=emotional?`${EMOTION_DURATION}s`:film?'20s':mode==='performance'?'10s':state.phase==='reply'?`${state.answer} / 3`:state.phase==='complete'?'✧':'◌';
  $('memory').hidden=mode!=='episode'||state.phase!=='complete';$('save-state').textContent=storageWorks?'这次相遇留在这台设备上。':'这次相遇已完成，当前浏览器无法保存记录。';
  $('status').textContent=paused?'点「继续听故事」，回到这一拍。':emotional?(emotional.complete?'故事暂告一段。它们的下一句，还没有说完。':'正在观看 · 两个人，都有没说出口的话。'):film?(film.complete?'小故事看完了。也可以陪空空亲自回一句。':'正在观看 · 声音、视线与动作一起讲故事。'):mode==='intro'?(completed?'第一句问候已经完成，可以再听一次。':'两个伙伴都想靠近，却错过了彼此的那一拍。'):mode==='character'?identities[selected].voice:mode==='performance'?'听声、停顿与回应，来自同一段配乐。':'也可以按 1、2、3 回应；用空格按住「留一拍」。';
  $('audition').textContent='♫ 听'+identities[selected].name+'的短句';$('audition').disabled=starting;
  $('character-description').textContent=descriptions[selected];
  document.querySelectorAll('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.character===selected)));
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  $('phrase').replaceChildren();for(let i=0;i<3;i++){const el=document.createElement('span');el.textContent=['哆','来','咪'][i];el.dataset.phrase=i;el.className=mode==='episode'&&state.phase==='reply'&&i>=state.answer?'ghost':'';$('phrase').append(el);}
}
async function enable(){if(starting)return false;starting=true;try{await audio.init();paused=false;return true;}catch{$('status').textContent='声音还没开启，请再点击一次。';return false;}finally{starting=false;}}
async function start(){const turn=generation;if(await enable()&&turn===generation){clear();mode='episode';selected='kong';view='front';change({type:'start'});}}
function toIntro(){clear();mode='intro';state=newEpisode();selected='kong';view='front';paused=false;updateUI();}
async function togglePause(){if(paused){if(await enable())updateUI();}else if(audio.ready()){if(state.heldAt!==null)change({type:'release'});paused=true;void audio.pause();updateUI();}}
function answer(index){if(paused||mode!=='episode'||state.phase!=='reply'||!audio.ready()||!Number.isInteger(index)||!phrase[index])return;const time=audio.clock();if(time-lastInput<.13)return;lastInput=time;emit({voice:'kong',midi:phrase[index],length:.4},time+.015,{index});change({type:'note',index});}
function hold(){if(!paused&&mode==='episode'&&state.phase==='rest'&&audio.ready())change({type:'hold',time:audio.clock()});}
function release(){if(state.heldAt!==null)change({type:'release'});}
$('start').onclick=start;$('again').onclick=start;$('restart').onclick=toIntro;$('pause').onclick=togglePause;$('resume').onclick=async()=>{if(await enable())updateUI();};
$('listen').onclick=()=>{if(paused)return;clear();change({type:'listen'});};
$('hold').addEventListener('pointerdown',event=>{event.preventDefault();try{$('hold').setPointerCapture(event.pointerId);}catch{}hold();});
for(const name of ['pointerup','pointercancel','lostpointercapture','blur'])$('hold').addEventListener(name,release);
$('hold').addEventListener('keydown',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();if(!event.repeat)hold();}});
$('hold').addEventListener('keyup',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();release();}});
notes.forEach(button=>button.onclick=()=>answer(Number(button.dataset.note)));
stage.canvas.addEventListener('pointerdown',event=>{const index=stage.pick(event.clientX,event.clientY);if(index>=0)answer(index);});
document.querySelectorAll('[data-character]').forEach(button=>button.onclick=()=>{clear();release();state=newEpisode();mode='character';selected=button.dataset.character;view='front';pose='waiting';updateUI();showStage();});
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;updateUI();});
$('audition').onclick=async()=>{const turn=generation;if(await enable()&&turn===generation){clear();state=newEpisode();mode='character';pose='replying';view='front';for(const note of signatures[selected])emit(note,audio.clock()+.15+note.at);schedule(audio.clock()+4,()=>{pose='waiting';updateUI();});updateUI();showStage();}};
$('performance').onclick=async()=>{const turn=generation;if(await enable()&&turn===generation){clear();state=newEpisode();mode='performance';selected='kong';view='front';performanceStart=audio.clock()+.15;lastPerfChapter='';for(const note of performanceScore)emit(note,performanceStart+note.at,{tree:note.at<4,index:phrase.indexOf(note.midi%12+60)});updateUI();showStage();}};
$('watch-simple').onclick=async()=>{const turn=generation;if(await enable()&&turn===generation){clear();state=newEpisode();mode='film';selected='kong';view='front';filmStart=audio.clock()+.15;lastPerfChapter='';for(const note of filmScore)emit(note,filmStart+note.at,{tree:note.at<3.6||note.at>=6.5&&note.at<10,index:phrase.indexOf(note.midi%12+60)});updateUI();showStage();}};
$('watch').onclick=async()=>{const turn=generation;if(await enable()&&turn===generation){clear();state=newEpisode();mode='emotion';selected='kong';view='front';emotionStart=audio.clock()+.15;lastPerfChapter='';for(const note of emotionScore)emit(note,emotionStart+note.at,{tree:note.source==='tree'});updateUI();showStage();}};
$('mute').onclick=()=>{muted=!muted;audio.mute(muted);$('mute').textContent=muted?'♫ 声音关':'♫ 声音开';$('mute').setAttribute('aria-pressed',String(muted));};
document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||document.activeElement.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON','A','SUMMARY'].includes(document.activeElement.tagName))return;if(['1','2','3'].includes(event.key)){event.preventDefault();answer(Number(event.key)-1);}if(event.code==='Space'&&mode==='episode'&&!paused&&state.phase==='rest'){event.preventDefault();hold();}});
document.addEventListener('keyup',event=>{if(event.code==='Space')release();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode!=='intro'&&audio.ready()){release();paused=true;void audio.pause();updateUI();}});
window.addEventListener('blur',release);window.addEventListener('pagehide',()=>{clear();void audio.close();stage.dispose();});
function render(){
  requestAnimationFrame(render);const time=audio.clock();
  if(!paused){while(queue.length&&queue[0].at<=time){const event=queue.shift();if(event.generation===generation)event.run();}if(state.phase==='rest'&&state.heldAt!==null)change({type:'tick',time});}
  const pulses=Object.fromEntries(Object.entries(last).map(([id,at])=>[id,Math.max(0,1-(time-at)/.6)])),notePulses=noteTimes.map(at=>Math.max(0,1-(time-at)/.5));
  let phase=mode==='intro'?'intro':state.phase,elapsed=Math.max(0,time-phaseStarted),friendVisible,friendProgress,sceneTime=mode==='intro'?performance.now()/1000:time;
  if(mode==='performance'){
    const p=performanceAt(time-performanceStart);phase=p.complete?'complete':p.time<4?'listening':p.time<5.25?'rest':p.time<7.7?'reply':'accepted';elapsed=p.time-(p.time<4?0:p.time<5.25?4:p.time<7.7?5.25:7.7);friendVisible=p.zheVisible;friendProgress=(p.time-7.7)/.7;sceneTime=performanceStart+p.time;
    const tag=p.complete?'complete':p.chapter;if(tag!==lastPerfChapter){lastPerfChapter=tag;updateUI();}
  }
  if(mode==='film'){const f=filmAt(time-filmStart);phase=f.phase;elapsed=f.elapsed;sceneTime=filmStart+f.time;const tag=f.complete?'end':f.phase;if(tag!==lastPerfChapter){lastPerfChapter=tag;updateUI();}}
  if(mode==='emotion'){const f=emotionAt(time-emotionStart);phase=f.phase;elapsed=f.elapsed;sceneTime=emotionStart+f.time;friendVisible=undefined;const tag=f.complete?'end':f.phase;if(tag!==lastPerfChapter){lastPerfChapter=tag;updateUI();}}
  if(mode!=='emotion')friendVisible??=phase==='complete'||phase==='accepted'&&elapsed>=.45;
  const progress=state.heldAt===null?0:Math.min(1,(time-state.heldAt)/REST_LENGTH);
  stage.update({time:sceneTime,mode:mode==='character'?'character':'episode',direction:mode==='emotion'?'emotion':'simple',selected,view,pose,phase,elapsed,friendVisible,friendProgress,holding:progress,reducedMotion:motionPreference?.matches??false,pulses,noteAges:Object.fromEntries(Object.entries(last).map(([id,at])=>[id,time-at])),treeAge:time-treeAt,treePulse:Math.max(0,1-(time-treeAt)/.6),notePulses,hint:state.hint&&state.phase==='reply'?state.answer:-1});
  notes.forEach((button,i)=>{button.classList.toggle('hit',notePulses[i]>.5);button.classList.toggle('hint',state.hint&&state.phase==='reply'&&i===state.answer);});
  document.querySelectorAll('[data-phrase]').forEach(el=>el.classList.toggle('active',notePulses[Number(el.dataset.phrase)]>.4));
  $('hold-fill').style.width=progress*100+'%';$('rest-bar').style.width=progress*100+'%';$('rest-progress').setAttribute('aria-valuenow',String(Math.round(progress*100)));
}
updateUI();render();$('start').disabled=false;$('start').textContent='♫ 陪空空回一句';$('watch').disabled=false;$('watch-simple').disabled=false;$('performance').disabled=false;$('audition').disabled=false;
