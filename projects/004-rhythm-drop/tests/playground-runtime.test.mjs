import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as model from '../src/playground-game.mjs';

// Executes the production controller with an explicit clock and simulated
// scene/audio adapters. This verifies interactions, not a browser render.
async function harness(){
  const source=await readFile(new URL('../src/playground.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../web/children/game/index.html',import.meta.url),'utf8');
  class Element{
    constructor(){this.hidden=false;this.disabled=false;this.dataset={};this.children=[];this.style={setProperty(){}};this.attributes={};this.classList={toggle(){},add(){}};}
    setAttribute(k,v){this.attributes[k]=v;}append(el){this.children.push(el);}replaceChildren(){this.children=[];}addEventListener(name,fn){this[name]=fn;}
  }
  const ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
  const tiles=Array.from({length:5},(_,tile)=>Object.assign(new Element(),{dataset:{tile:String(tile)}}));
  const chapters=Array.from({length:3},(_,chapter)=>Object.assign(new Element(),{dataset:{chapter:String(chapter)}}));
  const events={},storage=new Map();let frame,clock=0,running=false;
  const document={hidden:false,activeElement:{tagName:'BODY'},getElementById(id){assert.ok(ids.has(id),'HTML contains '+id);return ids.get(id);},createElement:()=>new Element(),querySelectorAll(selector){if(selector==='[data-tile]')return tiles;if(selector==='[data-chapter]')return chapters;if(selector==='[data-note]')return ids.get('phrase').children.filter(e=>e.dataset.note!==undefined);throw new Error(selector);},addEventListener(name,fn){events[name]=fn;}};
  const played=[],scene={canvas:new Element(),tilePlaces:[[-2,1.2],[-1,.4],[0,1.2],[1,.4],[2,1.2]],updateChild(role,s){assert.ok([s.x,s.y,s.z,s.pulse].every(Number.isFinite));},pick:()=>0,render(){},dispose(){}};
  const audio={async init(){running=true;},clock:()=>clock,ready:()=>running,note:(n,at)=>played.push({...n,at}),stop(){},mute(){},async pause(){running=false;},async close(){running=false;}};
  const execute=new Function('createPlaygroundStage','createPlaygroundAudio','sounds','echo','inputPhases','newGame','reduceGame','readMelody','responseScore','document','localStorage','requestAnimationFrame','window',source.replace(/^import .*;\r?\n/gm,'')+'\nreturn {state:()=>state,paused:()=>paused};');
  const controller=execute(()=>scene,()=>audio,model.sounds,model.echo,model.inputPhases,model.newGame,model.reduceGame,model.readMelody,model.responseScore,document,{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},fn=>{frame=fn;},{addEventListener(){}});
  function tick(seconds){const end=clock+seconds;if(!running){frame();return;}while(clock<end){clock=Math.min(end,clock+.05);frame();}}
  return {ids,tiles,events,document,played,storage,controller,tick,clock:()=>clock};
}

test('the complete playable controller reaches a saved four-voice song using the actual HTML IDs',async()=>{
  const h=await harness();await h.ids.get('start').onclick();assert.equal(h.controller.state().phase,'explore');
  for(const tile of [1,4,2]){h.tiles[tile].onclick();h.tick(.2);}
  assert.equal(h.controller.state().phase,'firstReply');h.tick(7);assert.equal(h.controller.state().phase,'echoInput');
  h.tiles[4].onclick();assert.equal(h.controller.state().hint,true);h.tick(.5);
  for(const tile of model.echo){h.tiles[tile].onclick();h.tick(.2);}
  h.tick(4);assert.equal(h.controller.state().phase,'welcome');
  for(const tile of [0,1,3,4]){h.tiles[tile].onclick();h.tick(.2);}
  h.tick(9);assert.equal(h.controller.state().phase,'complete');
  assert.deepEqual(JSON.parse([...h.storage.values()][0]),[0,1,3,4]);
  assert.ok(h.played.some(n=>n.role==='dou'));assert.ok(h.played.every(n=>Number.isFinite(n.at)));
  h.ids.get('listen').onclick();h.tick(4);assert.equal(h.controller.state().phase,'free');
});

test('leaving the page pauses its clock and restarting cancels unfinished partner turns',async()=>{
  const h=await harness();await h.ids.get('start').onclick();
  for(const tile of [0,2,3]){h.tiles[tile].onclick();h.tick(.2);}
  h.document.hidden=true;h.events.visibilitychange();assert.equal(h.controller.paused(),true);
  const time=h.clock();h.tick(20);assert.equal(h.clock(),time);assert.equal(h.controller.state().phase,'firstReply');
  await h.ids.get('resume').onclick();h.tick(7);assert.equal(h.controller.state().phase,'echoInput');
  h.ids.get('restart').onclick();h.tick(20);assert.equal(h.controller.state().phase,'intro');
  await h.ids.get('start').onclick();h.tick(20);assert.equal(h.controller.state().phase,'explore');
});

test('answering before a hint is sung cancels that outdated demonstration',async()=>{
  const h=await harness();await h.ids.get('start').onclick();
  for(const tile of [0,2,3]){h.tiles[tile].onclick();h.tick(.2);}
  h.tick(7);assert.equal(h.controller.state().phase,'echoInput');
  const before=h.played.filter(n=>n.role==='he').length;
  h.tiles[4].onclick();h.tick(.18);h.tiles[0].onclick();h.tick(.5);
  assert.equal(h.controller.state().answer,1);assert.equal(h.controller.state().hint,false);
  assert.equal(h.played.filter(n=>n.role==='he').length,before);
});
