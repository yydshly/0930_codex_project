import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
const compiled=await build({
  stdin:{contents:"export * as THREE from 'three'; export {KoiSchool} from './fish.js'; export {HandInteraction} from './interaction.js'; export {DEFAULTS} from './config.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'feeding-integration-fixture.js'},
  bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent',
});
const runtime={exports:{}};
new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,KoiSchool,HandInteraction,DEFAULTS}=runtime.exports;

// Only texture drawing/image loading are stubbed. Fish geometry, mouth placement,
// pellet movement, hand skeleton, state-machine methods and ledger are real code.
function withDOM(callback){
  const previous=globalThis.document,context={fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){},putImageData(){},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}};
  globalThis.document={createElement(){return {width:0,height:0,getContext(){return context;}};},createElementNS(){return {addEventListener(){},removeEventListener(){},set src(value){this.url=value;}};}};
  try{return callback();}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
function fixture({hand=false}={}){
  const scene=new THREE.Scene(),ripples=[];
  const water={heightAt(){return .02;},addRipple(...values){ripples.push(values);}};
  const school=withDOM(()=>new KoiSchool(scene,water));school.reset();
  const c={scene,water,school,time:0,hasDynamics:true,waterLevel:.02,settings:{...DEFAULTS,fishCount:0,surfaceWakes:false},camera:new THREE.PerspectiveCamera(),controls:{target:new THREE.Vector3(),maxPolarAngle:1.55},binding:{mode:null,redraw(){}},audio:{event(){}},status:[],onStatus(value){this.status.push(value);},moveCamera(value){this.lastCamera=value;},updateSettings(value){Object.assign(this.settings,value);}};
  if(hand)c.interaction=withDOM(()=>new HandInteraction(c));
  return {c,school,ripples,step(time,dt=1/60){c.time=time;school.update(dt,time,c.settings);}};
}
function release(f,id,{time=0,x=0,z=0,y=.25}={}){
  f.school.releasePellet(time,new THREE.Vector3(x,y,z),new THREE.Vector3(0,-.03,0),id);
  return f.school.food.children.findLast(mesh=>mesh.userData.particle?.time===time&&mesh.userData.particle.feedToken?.batchId===id);
}
function land(f,pellet,time){
  f.step(time);
  assert.equal(pellet.userData.particle.landed,true);
  assert.ok(Math.abs(pellet.position.y-.022)<1e-12);
}
function beginActualSwallow(f,pellet,time){
  const fish=f.school.fish[0];f.c.settings.fishCount=1;
  f.school.feed(time,pellet.position);
  // Put the actual computed mouth within the existing bite gate. The production
  // update chooses its own target and creates swallow; no swallow event is faked.
  fish.heading=fish.turnRate=fish.pitch=fish.speed=0;
  fish.mouthOpen=.95;fish.state.uMouth.value=.95;fish.lastBite=-100;
  fish.group.position.set(pellet.position.x-(.5+.022*.95)*fish.group.scale.x,pellet.position.y+.004*fish.group.scale.x,pellet.position.z);
  fish.group.rotation.set(0,0,0);fish.group.updateMatrixWorld(true);
  f.step(time);
  const swallow=pellet.userData.particle.swallow;
  assert.ok(swallow,'production mouth/target/time checks start the swallow');
  assert.equal(swallow.fish,fish);
  const mouth=f.school.mouthWorld(fish);
  assert.ok(Math.hypot(mouth.x-swallow.from.x,mouth.z-swallow.from.z)<.042);
  assert.ok(Math.abs(mouth.y-swallow.from.y)<.035);
  return swallow.start;
}
function finishActualSwallow(f,pellet,start){
  const before=f.school.consumed;
  for(let i=1;i<=9;i++)f.step(start+i/60);
  assert.equal(f.school.consumed,before,'the first 0.15 seconds are still swallowing');
  f.step(start+10/60);
  assert.equal(pellet.userData.particle.eaten,true);
  assert.equal(f.school.consumed,before+1);
  f.step(start+11/60);
  assert.equal(f.school.consumed,before+1,'a completed pellet cannot count twice');
}

test('actual koi release, freefall, mouth gate and swallow completion update the same feeding batch',()=>{
  const f=fixture(),id=f.school.feeding.begin(1),pellet=release(f,id);
  assert.equal(f.school.feeding.latest().released,1);
  assert.equal(f.school.feeding.latest().landed,0);
  f.step(.10);
  assert.equal(pellet.userData.particle.landed,false);
  assert.equal(f.school.feeding.latest().landed,0);
  land(f,pellet,.30);f.school.feeding.end(id,'complete');
  const start=beginActualSwallow(f,pellet,.55);
  assert.equal(f.school.feeding.latest().consumed,0);
  finishActualSwallow(f,pellet,start);
  const batch=f.school.feeding.latest();
  assert.equal(batch.landed,1);assert.equal(batch.consumed,1);assert.equal(batch.expired,0);assert.equal(batch.pending,0);assert.equal(batch.settled,true);
  assert.equal(f.school.fish[0].consumed,1);
  assert.equal(f.school.metrics.consumed,1);
});

test('a real landed pellet expires through school update without increasing consumed totals',()=>{
  const f=fixture(),id=f.school.feeding.begin(1),pellet=release(f,id);
  land(f,pellet,.30);f.school.feeding.end(id);
  f.step(14.31);
  assert.equal(pellet.userData.particle.expired,true);
  assert.equal(pellet.userData.particle.eaten,true);
  assert.equal(pellet.visible,false);
  const batch=f.school.feeding.latest();
  assert.equal(batch.expired,1);assert.equal(batch.consumed,0);assert.equal(batch.pending,0);assert.equal(batch.settled,true);
  assert.equal(f.school.consumed,0);assert.equal(f.school.metrics.consumed,0);
  f.step(14.32);assert.equal(f.school.feeding.latest().expired,1);
});

test('actual early hand stop retains a partial batch across later hand inspection',()=>{
  const f=fixture({hand:true}),h=f.c.interaction;
  h.start('feed');const id=h.feedBatch;
  for(let i=1;i<=105;i++){f.c.time=i/60;h.update(1/60,f.c.time);f.step(f.c.time);}
  assert.equal(h.emitted,1);assert.equal(f.school.feeding.latest().released,1);
  h.stop(true);const stopped=f.school.feeding.latest();
  assert.equal(stopped.id,id);assert.equal(stopped.handEnded,true);assert.equal(stopped.endReason,'stopped');assert.equal(stopped.unreleased,5);assert.equal(stopped.pending,1);
  h.start('inspect');assert.equal(h.emitted,0);
  assert.deepEqual(f.school.feeding.latest(),stopped,'non-feeding inspection cannot erase the batch');
  h.update(1/60,f.c.time+1/60);h.stop();
  assert.deepEqual(f.school.feeding.latest(),stopped);
  f.step(2.50);assert.equal(f.school.feeding.latest().landed,1);
  f.step(16.51);const settled=f.school.feeding.latest();
  assert.equal(settled.expired,1);assert.equal(settled.consumed,0);assert.equal(settled.unreleased,5);assert.equal(settled.settled,true);
});

test('the real hand state machine releases all six and marks natural withdrawal complete',()=>{
  const f=fixture({hand:true}),h=f.c.interaction;
  h.start('feed');const id=h.feedBatch;
  for(let i=1;i<=245;i++){f.c.time=i/60;h.update(1/60,f.c.time);f.step(f.c.time);}
  const batch=f.school.feeding.latest();
  assert.equal(h.mode,'idle');assert.equal(h.feedBatch,null);assert.equal(h.emitted,6);
  assert.equal(batch.id,id);assert.equal(batch.released,6);assert.equal(batch.landed,6);assert.equal(batch.handEnded,true);assert.equal(batch.endReason,'complete');assert.equal(batch.pending,6);assert.equal(batch.settled,false);
  h.start('inspect');assert.deepEqual(f.school.feeding.latest(),batch);
});

test('a zero-fish feed keeps the user setting and reports only real release and water feedback',()=>{
  const f=fixture({hand:true}),h=f.c.interaction;
  h.start('feed');
  assert.equal(f.c.settings.fishCount,0);
  assert.match(f.c.status.at(-1).message,/没有锦鲤/);
  for(let i=1;i<=125;i++){f.c.time=i/60;h.update(1/60,f.c.time);f.step(f.c.time);}
  assert.equal(f.c.settings.fishCount,0);
  const batch=f.school.feeding.latest();
  assert.equal(batch.released,6);assert.equal(batch.consumed,0);
  assert.ok(f.c.status.some(s=>s.message?.includes('可观察落水与涟漪')));
  assert.ok(f.c.status.every(s=>!s.message?.includes('锦鲤正在靠近')));
});

test('the release announcement follows fish count changes during the actual reach',()=>{
  const f=fixture({hand:true}),h=f.c.interaction;
  f.c.settings.fishCount=1;h.start('feed');
  assert.match(f.c.status.at(-1).message,/捏住/);
  f.c.settings.fishCount=0;
  for(let i=1;i<=106;i++){f.c.time=i/60;h.update(1/60,f.c.time);f.step(f.c.time);}
  assert.ok(f.c.status.some(s=>s.message?.includes('当前没有锦鲤，可观察落水与涟漪')));
  assert.equal(f.c.settings.fishCount,0);assert.equal(f.school.feeding.latest().consumed,0);
});

test('school clearFood removes particle records and ledger history without reviving old tokens',()=>{
  const f=fixture(),oldId=f.school.feeding.begin(1),oldPellet=release(f,oldId);
  land(f,oldPellet,.30);const oldToken=oldPellet.userData.particle.feedToken;
  f.school.clearFood();
  assert.equal(f.school.feeding.latest(),null);assert.equal(f.school.consumed,0);assert.equal(f.school.food.visible,false);
  assert.ok(f.school.food.children.every(mesh=>mesh.userData.particle===null&&!mesh.visible));
  const newId=f.school.feeding.begin(1,.4),newPellet=release(f,newId,{time:.4});
  assert.ok(newId>oldId);assert.equal(newPellet,oldPellet,'the mesh slot is genuinely reused');
  const before=f.school.feeding.latest();
  assert.equal(f.school.feeding.land(oldToken),false);assert.equal(f.school.feeding.consume(oldToken),false);assert.equal(f.school.feeding.expire(oldToken),false);
  assert.deepEqual(f.school.feeding.latest(),before);
  land(f,newPellet,.7);assert.equal(f.school.feeding.latest().landed,1);
  assert.equal(f.school.feeding.latest().consumed,0);
});

test('an older batch swallowed through actual school code does not count toward the newer batch',()=>{
  const f=fixture(),oldId=f.school.feeding.begin(1),oldPellet=release(f,oldId);
  land(f,oldPellet,.30);f.school.feeding.end(oldId,'complete');
  const newId=f.school.feeding.begin(1,.31),newPellet=release(f,newId,{time:.31,z:.7});
  land(f,newPellet,.65);const before=f.school.feeding.latest();
  assert.equal(f.school.feeding.retainedBatchCount,2);
  const start=beginActualSwallow(f,oldPellet,.70);
  finishActualSwallow(f,oldPellet,start);
  assert.equal(f.school.consumed,1);
  assert.deepEqual(f.school.feeding.latest(),before);
  assert.equal(newPellet.userData.particle.eaten,false);
  assert.equal(f.school.feeding.latest().consumed,0);
  assert.equal(f.school.feeding.retainedBatchCount,1);
});
