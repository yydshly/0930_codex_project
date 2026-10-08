import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {FishStartle,STARTLE_LIMITS} from '../src/fish-startle.js';
import {bodySpheres,schoolSnapshot,createShoreline,signedShoreDistance} from '../src/fish-steering.js';
import {habitatClearance} from '../src/habitat-geometry.js';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
const compiled=await build({stdin:{contents:"export * as THREE from 'three'; export {KoiSchool} from './fish.js'; export {HandInteraction} from './interaction.js'; export {DEFAULTS} from './config.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'startle-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,KoiSchool,HandInteraction,DEFAULTS}=runtime.exports;
const near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const fish=(id,x,z=0)=>({id,x,y:-.2,z,heading:0,size:.6,speed:.16,pitch:0});
function withDOM(callback){const previous=globalThis.document,context={fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){},putImageData(){},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}};
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return context;}};},createElementNS(){return {addEventListener(){},removeEventListener(){},set src(value){this.url=value;}};}};
 try{return callback();}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}}
function fixture({hand=false,count=1}={}){const scene=new THREE.Scene(),water={heightAt(){return .02;},addRipple(){}};
 const school=withDOM(()=>new KoiSchool(scene,water));school.reset();
 const c={scene,water,school,time:0,hasDynamics:true,waterLevel:.02,settings:{...DEFAULTS,fishCount:count,surfaceWakes:false},camera:new THREE.PerspectiveCamera(),controls:{target:new THREE.Vector3(),maxPolarAngle:1.55},binding:{mode:null,redraw(){}},audio:{event(){}},status:[],onStatus(value){this.status.push(value);},moveCamera(value){this.lastCamera=value;},updateSettings(value){Object.assign(this.settings,value);}};
 school.onStartleState=value=>c.onStatus(value);if(hand)c.interaction=withDOM(()=>new HandInteraction(c));
 const step=(dt=1/60)=>{c.time+=dt;c.interaction?.update(dt,c.time);school.update(dt,c.time,c.settings);};
 school.update(0,0,c.settings);return {c,school,step};}
function locate(f,x=0,z=0,heading=0){f.group.position.set(x,-.20,z);f.heading=heading;f.group.rotation.set(0,heading,0);f.speed=.12;f.turnRate=f.pitch=0;f.cycleT=100;}

test('distance thresholds produce alert, one local startle, and finite outward scatter',()=>{
 const response=new FishStartle(),snapshot=[fish(0,.15),fish(1,.8,.4),fish(2,4)],source={x:0,y:.40,z:0};
 assert.equal(response.begin(source),true);response.advance(1/60,snapshot,.02);assert.equal(response.state.phase,'idle');assert.equal(response.alert(snapshot[0]),0,'a hand far above the water is not an alert force');
 response.move({x:0,y:.20,z:0});response.advance(1/60,snapshot,.02);assert.equal(response.state.phase,'alert');assert.equal(response.state.alertFish,2);assert.equal(response.state.triggerCount,0);
 response.move({x:0,y:.07,z:0});response.advance(1/60,snapshot,.02);assert.equal(response.state.phase,'startled');assert.equal(response.state.triggerCount,1);assert.equal(response.state.affectedFish,2);
 for(const f of snapshot.slice(0,2)){const force=response.response(f);near(Math.hypot(force.x,force.z),1);assert.ok(force.x*f.x+force.z*f.z>0);assert.ok(force.intensity>0&&force.intensity<=1);}
 assert.equal(response.response(snapshot[2]).intensity,0);for(let i=0;i<20;i++)response.advance(1/60,snapshot,.02);assert.equal(response.state.triggerCount,1);
 assert.equal(response.begin(source),false,'repeated approaches cannot restart an active burst');
});

test('coincident fish receive different finite escape headings without fixed destinations',()=>{
 const response=new FishStartle(),snapshot=[fish(0,0),fish(1,0)];response.begin({x:0,y:.07,z:0});response.advance(1/60,snapshot,.02);
 const a=response.response(snapshot[0]),b=response.response(snapshot[1]);assert.ok(Number.isFinite(a.x+a.z+b.x+b.z));assert.notDeepEqual(a,b);
});

test('withdrawal keeps threat memory, zero time freezes it, recovery expires in simulation seconds',()=>{
 const response=new FishStartle(),snapshot=[fish(0,.1)],source={x:0,y:.07,z:0};response.begin(source);response.advance(.02,snapshot,.02);response.end();
 source.x=40;assert.equal(response.state.source.x,0);const state=response.state;response.advance(0,[fish(0,9)],.02);assert.deepEqual(response.state,state);
 response.advance(.91,snapshot,.02);assert.equal(response.state.phase,'recovering');assert.ok(response.state.intensity<1);assert.ok(response.state.remaining>3.5);
 response.advance(STARTLE_LIMITS.duration,snapshot,.02);assert.equal(response.state.phase,'idle');assert.equal(response.state.intensity,0);assert.equal(response.state.remaining,0);assert.equal(response.state.triggerCount,1);assert.equal(response.response(snapshot[0]).intensity,0);
 assert.equal(response.begin({x:0,y:.07,z:0}),true);response.reset();assert.equal(response.state.triggerCount,0);assert.equal(response.state.source,null);
});

test('zero fish cannot trigger and removal of all affected fish releases stale source memory',()=>{
 const response=new FishStartle();response.begin({x:0,y:.07,z:0});response.advance(.02,[],.02);assert.equal(response.state.triggerCount,0);assert.equal(response.state.phase,'idle');
 response.begin({x:0,y:.07,z:0});response.advance(.02,[fish(0,.1)],.02);response.end();response.advance(.02,[],.02);assert.equal(response.state.affectedFish,0);assert.equal(response.state.source,null);
});

test('school selection and zero-step approach never pull, hold or teleport a fish',()=>{
 const f=fixture({count:2}),positions=f.school.fish.map(q=>q.group.position.toArray()),headings=f.school.fish.map(q=>q.heading),source=new THREE.Vector3(1,.4,1);
 const selected=f.school.beginApproach(source,2,0);assert.ok(selected);assert.equal(f.school.strokeTarget,null);assert.deepEqual(f.school.fish.map(q=>q.group.position.toArray()),positions);assert.deepEqual(f.school.fish.map(q=>q.heading),headings);
 const state=f.school.startleState;f.school.updateApproach(new THREE.Vector3(1,.04,1),0,0);f.school.update(0,0,f.c.settings);assert.deepEqual(f.school.startleState,state);assert.deepEqual(f.school.fish.map(q=>q.group.position.toArray()),positions);
});

test('actual school accelerates and turns continuously, dives and escapes a nearby source',()=>{
 const f=fixture(),q=f.school.fish[0];locate(q,0,0,Math.PI);const source=new THREE.Vector3(-.35,.07,0),initial=q.group.position.clone();
 f.school.beginApproach(source,1,0);let minY=initial.y;
 for(let i=0;i<150;i++){const before=q.group.position.clone(),speed=q.speed,heading=q.heading,rate=q.turnRate;f.step();const force=q.debugForces.threat;
  assert.ok(q.speed<=STARTLE_LIMITS.maxSpeed+1e-12);assert.ok(q.speed-speed<=STARTLE_LIMITS.maxAcceleration/60+1e-12);assert.ok(Math.abs(q.turnRate-rate)<=STARTLE_LIMITS.maxTurnAcceleration/60+1e-12);assert.ok(Math.abs(q.heading-heading)<=STARTLE_LIMITS.maxTurnRate/60+1e-12);
  assert.ok(Math.hypot(q.group.position.x-before.x,q.group.position.z-before.z)<=STARTLE_LIMITS.maxSpeed/60+1e-12);assert.ok(Math.abs(q.group.position.y-before.y)<.02);
  if(force)assert.ok(force.x*(before.x-source.x)+force.z*(before.z-source.z)>0);minY=Math.min(minY,q.group.position.y);
 }
 assert.ok(q.group.position.distanceTo(source)>initial.distanceTo(source)+.20);assert.ok(minY<initial.y-.09);assert.equal(f.school.startleState.triggerCount,1);assert.equal(f.school.startleState.phase,'recovering');
 assert.equal(f.school.metrics.fleeingFish,1);assert.ok(f.school.metrics.startleIntensity<1);assert.ok(f.c.status.some(s=>s.startle?.phase==='startled'));assert.ok(f.c.status.some(s=>s.startle?.phase==='recovering'));
 f.school.endApproach();for(let i=0;i<130;i++)f.step();assert.equal(f.school.startleState.phase,'idle');assert.equal(q.startleIntensity,0);assert.ok(f.c.status.some(s=>s.startle?.phase==='idle'));
});

test('actual hand withdraws promptly and keeps its aim fixed when the fish flees',()=>{
 const f=fixture({hand:true}),h=f.c.interaction,q=f.school.fish[0];locate(q,0,0);h.start('stroke');const point=h.point.clone(),end=h.end.clone();let withdrewAt=null,freezeChecked=false;
 for(let i=0;i<200;i++){f.step();assert.deepEqual(h.point.toArray(),point.toArray());assert.deepEqual(h.end.toArray(),end.toArray());
  if(h.phase==='withdraw'&&withdrewAt===null){withdrewAt=f.c.time;const state=f.school.startleState,timer=h.timer,pose=h.rig.root.position.toArray(),bones=h.rig.bones.map(b=>b.quaternion.toArray());h.update(0,f.c.time);f.school.update(0,f.c.time,f.c.settings);assert.deepEqual(f.school.startleState,state);assert.equal(h.timer,timer);assert.deepEqual(h.rig.root.position.toArray(),pose);assert.deepEqual(h.rig.bones.map(b=>b.quaternion.toArray()),bones);freezeChecked=true;}
 }
 assert.ok(withdrewAt!==null&&withdrewAt<2);assert.ok(freezeChecked);assert.equal(h.mode,'idle');assert.equal(h.rig.root.visible,false);assert.equal(f.school.startleState.triggerCount,1);assert.equal(f.school.strokeTarget,null);assert.equal(h.touching,false);
 assert.ok(f.c.status.some(s=>s.message?.includes('手及时收回')));assert.ok(f.c.status.every(s=>!s.message?.includes('轻贴鱼背')));
});

test('hand entry rejects no fish and a recovering school without changing the population',()=>{
 const f=fixture({hand:true,count:0}),h=f.c.interaction;h.start('stroke');assert.equal(h.mode,'idle');assert.equal(f.c.settings.fishCount,0);assert.equal(f.school.startleState.triggerCount,0);
 f.c.settings.fishCount=1;locate(f.school.fish[0],0,0);f.school.beginApproach(new THREE.Vector3(0,.07,0),1,0);f.step();f.school.endApproach();h.start('stroke');assert.equal(h.mode,'idle');assert.equal(f.school.startleState.triggerCount,1);assert.ok(f.c.status.at(-1).message.includes('仍在恢复'));
});

test('habitat changes and deterministic reset clear fear while clearing pellets alone preserves it',()=>{
 const f=fixture();locate(f.school.fish[0],0,0);f.school.beginApproach(new THREE.Vector3(0,.07,0),1,0);f.step();const threat=f.school.startleState;f.school.clearFood();assert.deepEqual(f.school.startleState,threat);
 const habitat={polygon:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}],waterLevel:.3,depth:.65,feedPoint:{x:0,y:.3,z:0},obstacles:[]};f.school.setHabitat(habitat);assert.equal(f.school.startleState.triggerCount,0);assert.equal(f.school.startleState.phase,'idle');
 f.school.reset();f.c.time=0;const first=[];for(let i=0;i<30;i++)f.step();for(const q of f.school.fish)first.push([q.heading,q.speed,...q.group.position.toArray()]);
 f.school.reset();f.c.time=0;for(let i=0;i<30;i++)f.step();assert.deepEqual(f.school.fish.map(q=>[q.heading,q.speed,...q.group.position.toArray()]),first);
});

test('startle preserves default shoreline and imported shallow habitat body constraints',()=>{
 for(const scale of [.65,1.25]){const f=fixture(),q=f.school.fish[0];f.c.settings.pondScale=scale;locate(q,1.4*scale,0);f.school.beginApproach(new THREE.Vector3(q.group.position.x-.30,.07,0),1,0);
  const shore=createShoreline(scale);for(let i=0;i<330;i++){f.step();assert.ok(signedShoreDistance(shore,q.group.position.x,q.group.position.z).distance<-.05);assert.ok(Number.isFinite(q.heading+q.speed+q.group.position.y));}
  assert.equal(f.school.startleState.phase,'idle');
 }
 const f=fixture(),habitat={polygon:[{x:-1.5,z:-1.5},{x:1.5,z:-1.5},{x:1.5,z:1.5},{x:-1.5,z:1.5}],waterLevel:.3,depth:.4,feedPoint:{x:0,y:.3,z:0},obstacles:[{x:-.65,z:0,radius:.20}]};f.school.setHabitat(habitat);const q=f.school.fish[0];locate(q,1.10,0);q.group.position.y=.1;f.school.beginApproach(new THREE.Vector3(.8,.36,0),1,0);
 for(let i=0;i<330;i++){f.step();for(const sphere of bodySpheres(schoolSnapshot([q])[0]))assert.ok(habitatClearance(f.school.habitat,sphere.x,sphere.z)>=sphere.radius-.0001);assert.ok(q.group.position.y>=f.school.waterLevel-habitat.depth+q.group.scale.x*.1-.001);}
 assert.equal(f.school.startleState.triggerCount,1);assert.equal(f.school.startleState.phase,'idle');
});
