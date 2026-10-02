import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as model from '../src/echo-story.mjs';
import * as emotional from '../src/echo-emotion.mjs';

// Actual controller + actual HTML identifiers, with explicitly simulated
// scene/audio adapters. This does not verify a browser render or playback.
async function harness(){
  const source=await readFile(new URL('../src/echo.js',import.meta.url),'utf8'),html=await readFile(new URL('../web/echo/index.html',import.meta.url),'utf8');
  class Element{
    constructor(){this.dataset={};this.style={};this.children=[];this.attributes={};this.listeners={};this.classList={toggle(){}};}
    setAttribute(k,v){this.attributes[k]=v;}append(el){this.children.push(el);}replaceChildren(){this.children=[];}setPointerCapture(){}
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}fire(name,event={}){for(const fn of this.listeners[name]??[])fn({preventDefault(){},...event});}
  }
  const ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
  const group=(key,values)=>values.map(value=>Object.assign(new Element(),{dataset:{[key]:String(value)}}));
  const notes=group('note',[0,1,2]),characters=group('character',['kong','zhe','dong','su']),views=group('view',['front','side','back']),events={};let frame,clock=0,running=false,sceneState;
  const storage=new Map(),played=[];
  const document={hidden:false,activeElement:{tagName:'BODY'},getElementById(id){assert.ok(ids.has(id),'HTML must contain '+id);return ids.get(id);},createElement:()=>new Element(),querySelectorAll(selector){if(selector==='[data-note]')return notes;if(selector==='[data-character]')return characters;if(selector==='[data-view]')return views;if(selector==='[data-phrase]')return ids.get('phrase').children;throw new Error(selector);},addEventListener(name,fn){events[name]=fn;}};
  const stage={canvas:new Element(),pick:()=>0,update(s){sceneState=s;assert.ok(Number.isFinite(s.time));assert.ok(Object.values(s.pulses).every(Number.isFinite));},dispose(){}};
  const audio={async init(){running=true;},clock:()=>clock,ready:()=>running,note:(n,at)=>played.push({...n,at}),stop(){},mute(){},async pause(){running=false;},async close(){running=false;}};
  const identities=Object.fromEntries(['kong','zhe','dong','su'].map((id,i)=>[id,{name:['空空','折折','咚咚','簌簌'][i],feature:id,voice:id}]));
  const execute=new Function('createEchoStage','createEchoAudio','identities','phrase','signatures','performanceScore','performanceAt','filmScore','filmAt','meetingScore','MEETING_LENGTH','REST_LENGTH','newEpisode','reduceEpisode','readProgress','emotionScore','emotionAt','EMOTION_DURATION','document','localStorage','requestAnimationFrame','window','performance',source.replace(/^import .*;\r?\n/gm,'')+'\nreturn {state:()=>state,mode:()=>mode,paused:()=>paused};');
  const controller=execute(()=>stage,()=>audio,identities,model.phrase,model.signatures,model.performanceScore,model.performanceAt,model.filmScore,model.filmAt,model.meetingScore,model.MEETING_LENGTH,model.REST_LENGTH,model.newEpisode,model.reduceEpisode,model.readProgress,emotional.emotionScore,emotional.emotionAt,emotional.EMOTION_DURATION,document,{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},fn=>{frame=fn;},{addEventListener(){}},{now:()=>1000});
  function tick(seconds){if(!running){frame();return;}const end=clock+seconds;while(clock<end){clock=Math.min(end,clock+.04);frame();}}
  return {ids,notes,characters,views,events,document,storage,played,controller,tick,clock:()=>clock,scene:()=>sceneState};
}
async function toRest(h){await h.ids.get('start').onclick();h.tick(5);assert.equal(h.controller.state().phase,'ready');h.ids.get('listen').onclick();h.tick(3.3);assert.equal(h.controller.state().phase,'rest');}

test('the playable first episode waits, keeps progress on a different note and records the meeting',async()=>{
  const h=await harness();await toRest(h);h.notes[0].onclick();assert.equal(h.controller.state().answer,0);
  h.ids.get('hold').fire('pointerdown');h.tick(.3);h.ids.get('hold').fire('pointerup');assert.equal(h.controller.state().phase,'rest');
  h.ids.get('hold').fire('pointerdown');h.tick(.85);assert.equal(h.controller.state().phase,'reply');
  for(const index of [0,2,1,2]){h.notes[index].onclick();h.tick(.2);}
  assert.equal(h.controller.state().phase,'accepted');h.tick(model.MEETING_LENGTH+.2);assert.equal(h.controller.state().phase,'complete');assert.equal(h.scene().friendVisible,true);
  assert.equal(JSON.parse([...h.storage.values()][0]).episode1,true);assert.ok(h.played.some(n=>n.voice==='zhe'));assert.ok(h.played.every(n=>Number.isFinite(n.at)));
});
test('backgrounding releases a held rest, freezes the clock and cannot silently complete it',async()=>{
  const h=await harness();await toRest(h);h.ids.get('hold').fire('pointerdown');h.tick(.2);
  h.document.hidden=true;h.events.visibilitychange();const now=h.clock();h.tick(5);assert.equal(h.clock(),now);assert.equal(h.controller.state().heldAt,null);
  await h.ids.get('resume').onclick();h.tick(2);assert.equal(h.controller.state().phase,'rest');h.ids.get('hold').fire('pointerdown');h.tick(.85);assert.equal(h.controller.state().phase,'reply');
  h.ids.get('restart').onclick();h.tick(20);assert.equal(h.controller.mode(),'intro');assert.equal(h.controller.state().phase,'intro');
});
test('the ten-second acting take freezes, and character viewing and auditions remain independent of episode progress',async()=>{
  const h=await harness();await h.ids.get('performance').onclick();h.tick(11);const pose={...h.scene()};h.tick(5);assert.equal(h.scene().time,pose.time);assert.equal(h.scene().friendVisible,true);
  h.characters[2].onclick();assert.equal(h.controller.mode(),'character');assert.equal(h.scene().time,pose.time);h.tick(.1);assert.equal(h.scene().selected,'dong');
  h.views[2].onclick();h.tick(.1);assert.equal(h.scene().view,'back');await h.ids.get('audition').onclick();h.tick(4.2);assert.ok(h.played.some(n=>n.voice==='dong'));assert.equal(h.scene().pose,'waiting');assert.equal(h.storage.size,0);
});

test('the complete film keeps its real rest, pauses, freezes the ending, and can hand off to play without granting progress',async()=>{
  const h=await harness();await h.ids.get('watch-simple').onclick();assert.equal(h.controller.mode(),'film');assert.equal(h.ids.get('note-controls').hidden,true);
  h.tick(4.1);assert.equal(h.scene().phase,'crowded');h.tick(6.2);assert.equal(h.scene().phase,'rest');assert.equal(h.scene().pulses.kong,0);assert.equal(h.scene().treePulse,0);
  await h.ids.get('pause').onclick();const frozen=h.scene().time;h.tick(3);assert.equal(h.scene().time,frozen);await h.ids.get('resume').onclick();
  h.tick(11);assert.equal(h.scene().phase,'complete');const ending=h.scene().time;h.tick(3);assert.equal(h.scene().time,ending);assert.equal(h.storage.size,0);assert.equal(h.ids.get('again').hidden,false);
  await h.ids.get('again').onclick();h.tick(.1);assert.equal(h.controller.mode(),'episode');assert.equal(h.controller.state().phase,'question');assert.equal(h.ids.get('note-controls').hidden,true);
});

test('selecting a character during a paused story preserves a usable resume control',async()=>{
  const h=await harness();await h.ids.get('watch').onclick();h.tick(2);await h.ids.get('pause').onclick();h.characters[1].onclick();h.tick(1);
  assert.equal(h.controller.mode(),'character');assert.equal(h.controller.paused(),true);assert.equal(h.ids.get('pause-screen').hidden,false);assert.equal(h.ids.get('pause').disabled,false);
  const frozen=h.clock();await h.ids.get('resume').onclick();h.tick(.3);assert.ok(h.clock()>frozen);assert.equal(h.controller.paused(),false);assert.equal(h.ids.get('pause-screen').hidden,true);
});

test('the rest shortcut leaves focused buttons, links and editable fields to their native keyboard behavior',async()=>{
  const h=await harness();await toRest(h);
  for(const tagName of ['BUTTON','A','SUMMARY','INPUT','TEXTAREA','SELECT']){h.document.activeElement={tagName};let prevented=false;h.events.keydown({code:'Space',key:' ',preventDefault(){prevented=true;}});assert.equal(h.controller.state().heldAt,null);assert.equal(prevented,false);}
  h.document.activeElement={tagName:'BODY'};h.events.keydown({code:'Space',key:' ',defaultPrevented:true});assert.equal(h.controller.state().heldAt,null);
  h.events.keydown({code:'Space',key:' ',preventDefault(){}});assert.equal(h.controller.state().heldAt,h.clock());h.events.keyup({code:'Space'});assert.equal(h.controller.state().heldAt,null);
});

test('the emotional cut plays both perspectives, pauses its held silence and freezes the unresolved ending without awarding progress',async()=>{
  const h=await harness();await h.ids.get('watch').onclick();assert.equal(h.controller.mode(),'emotion');h.tick(14.5);assert.equal(h.scene().phase,'misread');
  assert.equal(h.scene().pulses.kong,0);assert.equal(h.scene().pulses.zhe,0);await h.ids.get('pause').onclick();const frozen=h.scene().time;h.tick(2);assert.equal(h.scene().time,frozen);await h.ids.get('resume').onclick();
  h.tick(11);assert.equal(h.scene().phase,'call-back');h.tick(28);assert.equal(h.scene().phase,'open-ending');const end=h.scene().time;h.tick(3);assert.equal(h.scene().time,end);assert.equal(h.storage.size,0);assert.equal(h.ids.get('again').hidden,false);
  await h.ids.get('watch-simple').onclick();h.tick(1);assert.equal(h.controller.mode(),'film');assert.equal(h.scene().direction,'simple');h.ids.get('restart').onclick();h.tick(60);assert.equal(h.controller.mode(),'intro');
});
