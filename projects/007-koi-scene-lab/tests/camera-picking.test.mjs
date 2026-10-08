import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {frameBlend,updateOrbitControls} from '../src/camera-time.js';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
const bundle=await build({stdin:{contents:"export * as THREE from 'three'; export {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'; export {Courtyard} from './scene.js'; export {GardenAnimals} from './animals.js'; export {pickVisibleActor} from './visible-picking.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'camera-picking-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const module={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,require);
const {THREE,OrbitControls,Courtyard,GardenAnimals,pickVisibleActor}=module.exports;
const close=(a,b,epsilon=1e-11)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const closeVector=(a,b,epsilon=1e-11)=>a.toArray().forEach((v,i)=>close(v,b.toArray()[i],epsilon));

test('camera coefficient preserves the 60 Hz gain and composes by elapsed time',()=>{
 close(frameBlend(1/60),.12);close(frameBlend(3/60),1-.88**3);
 for(const fps of [20,60,120]){let remaining=1;for(let i=0;i<fps;i++)remaining*=1-frameBlend(1/fps);close(remaining,.88**60);}
 for(const seconds of [0,-1,NaN,Infinity])assert.equal(frameBlend(seconds),0);
 assert.equal(frameBlend(1,0),0);assert.equal(frameBlend(1,1),1);assert.throws(()=>frameBlend(1,1.1));
});

function followFixture(){const c=Object.create(Courtyard.prototype);c.camera=new THREE.PerspectiveCamera(48,1,.08,120);c.camera.position.set(-2,3,5);let updates=0;
 c.controls={target:new THREE.Vector3(1,0,0),enableDamping:true,dampingFactor:.075,update(){updates++;c.camera.lookAt(this.target);}};
 c.root=new THREE.Group();c.imported=null;c.transition=null;c.followAnimal='frog';c.followFish=null;c.time=7.5;
 c.animals={time:7.5,getView(){return {position:[3,2,1],target:[-.5,.04,2]};}};c.school={inspectionFish:null};
 return {c,updates:()=>updates};}

test('actual animal-follow method has equal 20/60/120 Hz half-second response without advancing simulation',()=>{
 const results=[];
 for(const fps of [20,60,120]){const {c,updates}=followFixture();for(let i=0;i<fps/2;i++)c.renderFollowTargets(1/fps);results.push([c.camera.position.clone(),c.controls.target.clone()]);
  assert.equal(updates(),fps/2,'controls update exactly once per rendered frame');assert.equal(c.time,7.5);assert.equal(c.animals.time,7.5);assert.equal(c.controls.dampingFactor,.075);
 }
 for(const result of results.slice(1)){closeVector(result[0],results[0][0]);closeVector(result[1],results[0][1]);}
 closeVector(results[0][0],new THREE.Vector3(-2,3,5).lerp(new THREE.Vector3(3,2,1),1-.88**30));
 closeVector(results[0][1],new THREE.Vector3(1,0,0).lerp(new THREE.Vector3(-.5,.04,2),1-.88**30));
});

function controlsFixture(){const listeners=new Map(),element={style:{},clientWidth:800,clientHeight:600,addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};}};
 const camera=new THREE.PerspectiveCamera(48,4/3,.08,120);camera.position.set(2,3,5);const controls=new OrbitControls(camera,element);controls.enableDamping=true;controls.dampingFactor=.075;controls.listenToKeyEvents(element);
 return {camera,controls,listeners};}
test('real OrbitControls pending pan damps consistently at 20/60/120 Hz',()=>{
 const results=[];
 for(const fps of [20,60,120]){const {camera,controls,listeners}=controlsFixture();listeners.get('keydown')({code:'ArrowRight',ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){}});
  for(let i=0;i<fps;i++)updateOrbitControls(controls,1/fps);results.push([camera.position.clone(),controls.target.clone()]);assert.equal(controls.dampingFactor,.075);
 }
 for(const result of results.slice(1)){closeVector(result[0],results[0][0]);closeVector(result[1],results[0][1]);}
});
test('time-aware OrbitControls restores its damping setting even when update throws',()=>{
 const controls={enableDamping:true,dampingFactor:.075,update(dt){close(dt,.05);close(this.dampingFactor,1-.925**3);throw new Error('fixture');}};
 assert.throws(()=>updateOrbitControls(controls,.05),/fixture/);assert.equal(controls.dampingFactor,.075);
});

function modelFixture(){const {c}=followFixture();c.imported=new THREE.Group();const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,2,4),new THREE.MeshBasicMaterial());mesh.position.set(3,2,4);c.imported.add(mesh);c.root.visible=false;c.settings={autoTour:true};c.interaction={stop(){}};c.status=[];c.onStatus=value=>c.status.push(value);c.animals.getView=()=>{throw new Error('hidden animal view must not be queried');};return c;}
test('all imported-scene animal requests select the model and never restore hidden follow state',()=>{
 for(const name of ['frog','turtle','dragonfly'])for(const instant of [false,true]){const c=modelFixture();c.followAnimal=name;c.setView(name,instant);assert.equal(c.followAnimal,null);assert.equal(c.followFish,null);assert.equal(c.transition,null);assert.equal(c.status.at(-1).view,'model');closeVector(c.controls.target,new THREE.Vector3(3,2,4));
  c.followAnimal=name;c.renderFollowTargets(.05);assert.equal(c.followAnimal,null);closeVector(c.controls.target,new THREE.Vector3(3,2,4));
 }
});
test('bound imported pond views keep the bound water center',()=>{
 for(const name of ['aerial','pond','shoal']){const c=modelFixture();c.school.habitat={polygon:[{x:8,z:3},{x:12,z:3},{x:12,z:7},{x:8,z:7}],waterLevel:1.2};c.setView(name,true);assert.equal(c.followAnimal,null);assert.equal(c.status.at(-1).view,name);closeVector(c.controls.target,new THREE.Vector3(10,1.2,5));}
});
test('hidden ancestors cancel animal and fish follow before reading their target',()=>{
 const {c}=followFixture();c.root.visible=false;c.animals.getView=()=>{throw new Error('hidden actor');};const parent=new THREE.Group();parent.visible=false;c.followFish={group:new THREE.Group()};parent.add(c.followFish.group);c.school.inspectionFish=c.followFish;c.fishObservationTarget=()=>{throw new Error('hidden fish');};c.renderFollowTargets(.02);assert.equal(c.followAnimal,null);assert.equal(c.followFish,null);assert.equal(c.school.inspectionFish,null);
});

function pickingFixture(){const scene=new THREE.Scene(),actors=new THREE.Group(),actor=new THREE.Group();scene.add(actors);actors.add(actor);actor.userData.actor='frog';const body=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());actor.add(body);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,4),new THREE.Vector3(0,0,-1));const addBlocker=(material=new THREE.MeshBasicMaterial(),parent=scene,z=2)=>{const blocker=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);blocker.position.z=z;parent.add(blocker);return blocker;};return {scene,actors,actor,body,ray,addBlocker};}
test('actual animal picking selects visible actor geometry and respects a nearer opaque blocker',()=>{
 const f=pickingFixture();const animals={group:f.actors,water:{mesh:null}};assert.equal(GardenAnimals.prototype.pick.call(animals,f.ray),'frog');f.addBlocker();assert.equal(GardenAnimals.prototype.pick.call(animals,f.ray),null);
});
test('transparent water shader and transparent material allow underwater turtle selection',()=>{
 const f=pickingFixture();f.actor.userData.actor='turtle';const water=f.addBlocker(new THREE.ShaderMaterial());const animals={group:f.actors,water:{mesh:water}};assert.equal(GardenAnimals.prototype.pick.call(animals,f.ray),'turtle');f.addBlocker(new THREE.MeshBasicMaterial({transparent:true,opacity:.45}),f.scene,2.5);assert.equal(GardenAnimals.prototype.pick.call(animals,f.ray),'turtle');
});
test('hidden ancestors and invisible materials never block actor rays',()=>{
 const f=pickingFixture(),hidden=new THREE.Group();hidden.visible=false;f.scene.add(hidden);f.addBlocker(undefined,hidden);const material=new THREE.MeshBasicMaterial();material.visible=false;f.addBlocker(material,f.scene,2.5);assert.equal(pickVisibleActor(f.ray,f.actors),'frog');f.actor.visible=false;assert.equal(pickVisibleActor(f.ray,f.actors),null);
});
test('actor body parts do not occlude their own actor and a farther blocker is ignored',()=>{
 const f=pickingFixture();f.addBlocker(undefined,f.actor,1);f.addBlocker(undefined,f.scene,-2);assert.equal(pickVisibleActor(f.ray,f.actors),'frog');
});
test('ray misses an opaque leaf silhouette instead of treating its bounding box as a blocker',()=>{
 const f=pickingFixture(),leaf=new THREE.Mesh(new THREE.CircleGeometry(.35,24),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));leaf.position.set(.6,0,2);f.scene.add(leaf);assert.equal(pickVisibleActor(f.ray,f.actors),'frog');leaf.position.x=0;assert.equal(pickVisibleActor(f.ray,f.actors),null);
});
test('world-space line thresholds neither enlarge actor click targets nor become false blockers',()=>{
 const f=pickingFixture(),geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.6,-.3,0),new THREE.Vector3(.6,.3,0)]),line=new THREE.Line(geometry,new THREE.LineBasicMaterial());line.position.z=2;f.scene.add(line);assert.equal(pickVisibleActor(f.ray,f.actors),'frog');
 f.body.position.x=2;f.actor.add(line);assert.equal(pickVisibleActor(f.ray,f.actors),null);
});
test('actual selected triangle material determines occlusion for multi-material geometry',()=>{
 const f=pickingFixture(),geometry=new THREE.BoxGeometry(2,2,.1),materials=Array.from({length:6},()=>new THREE.MeshBasicMaterial());materials[4].transparent=true;materials[4].opacity=.35;materials[5].transparent=true;materials[5].opacity=.35;const blocker=new THREE.Mesh(geometry,materials);blocker.position.z=2;f.scene.add(blocker);assert.equal(pickVisibleActor(f.ray,f.actors),'frog');materials[4].transparent=false;assert.equal(pickVisibleActor(f.ray,f.actors),null);
});
