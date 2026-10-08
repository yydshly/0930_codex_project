import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateHabitat} from '../src/habitat-geometry.js';
import {createCalibration} from '../src/model-calibration.js';
import {SimulationClock} from '../src/simulation-clock.js';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
const compiled=await build({stdin:{contents:"export * as THREE from 'three'; export {Courtyard} from './scene.js'; export {KoiSchool} from './fish.js'; export {SceneBinding} from './scene-binding.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'habitat-transaction-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,Courtyard,KoiSchool,SceneBinding}=runtime.exports;
const oldHabitat={polygon:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}],waterLevel:.3,depth:.65,feedPoint:{x:0,y:.3,z:0},obstacles:[]};
// This passes polygon, area, water and feed-point validation, but cannot fit
// even the smallest actual koi body. It is not merely a malformed JSON test.
const tinyHabitat={polygon:[{x:-.025,z:-.025},{x:.025,z:-.025},{x:.025,z:.025},{x:-.025,z:.025}],waterLevel:.1,depth:.3,feedPoint:{x:0,y:.1,z:0},obstacles:[]};
const withDOM=callback=>{const old=globalThis.document,ctx={fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){},putImageData(){},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}};globalThis.document={createElement(){return {width:0,height:0,getContext(){return ctx;}};}};try{return callback();}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}};

function fixture(){const c=Object.create(Courtyard.prototype);c.scene=new THREE.Scene();c.root=new THREE.Group();c.scene.add(c.root);c.imported=new THREE.Group();c.importedMeta={name:'transaction.glb',sha256:'a'.repeat(64),sourceSize:[10,4,8]};c.scene.add(c.imported);c.settings={modelScale:1,paused:false,autoTour:false};c.time=7;
 c.camera=new THREE.PerspectiveCamera(48,1,.08,120);c.camera.position.set(3,2,5);c.controls={target:new THREE.Vector3(0,.3,0)};c.transition={from:new THREE.Vector3(2,1,4),to:new THREE.Vector3(3,2,5),t:.4};c.followAnimal=null;
 c.water={habitat:structuredClone(oldHabitat),mesh:new THREE.Mesh(new THREE.PlaneGeometry(4,4)),floor:new THREE.Mesh(new THREE.PlaneGeometry(4,4)),wall:new THREE.Mesh(new THREE.PlaneGeometry(4,4)),changes:0,setHabitat(value){this.changes++;this.habitat=value;}};
 c.school=withDOM(()=>new KoiSchool(c.scene,c.water));c.school.setHabitat(oldHabitat);c.followFish=c.school.fish[0];c.school.inspectionFish=c.followFish;c.school.feed(c.time,new THREE.Vector3(0,.3,0));c.school.releasePellet(c.time,new THREE.Vector3(0,.8,0),new THREE.Vector3(.05,-.1,.05));
 c.interaction={mode:'feed',phase:'release',timer:2.5,emitted:2,rig:{root:new THREE.Group()},stops:0,stop(){this.stops++;this.mode=this.phase='idle';this.rig.root.visible=false;c.school.strokeTarget=null;}};
 c.experiment={resets:0,resetComparison(){this.resets++;}};c.status=[];c.onStatus=value=>c.status.push(value);c.updateDynamics=()=>{c.dynamics=(c.dynamics||0)+1;};c.setView=name=>{c.views=(c.views||[]).concat(name);c.followFish=null;c.transition=null;};c.updateSettings=input=>{c.settings={...c.settings,...input};};
 c.binding=new SceneBinding(c);c.binding.applied=structuredClone(oldHabitat);c.binding.draft=structuredClone(oldHabitat);c.binding.calibration={points:[{x:-2,y:2,z:4},{x:2,y:2,z:4}],record:createCalibration([{x:-2,y:2,z:4},{x:2,y:2,z:4}],4,c.importedMeta)};c.binding.redraw();
 return c;
}
function snapshot(c){return {
 binding:structuredClone(c.binding.getState()),water:{habitat:structuredClone(c.water.habitat),geometry:[c.water.mesh.geometry,c.water.floor.geometry,c.water.wall.geometry],visible:[c.water.mesh.visible,c.water.floor.visible,c.water.wall.visible],changes:c.water.changes},
 interaction:{mode:c.interaction.mode,phase:c.interaction.phase,timer:c.interaction.timer,emitted:c.interaction.emitted,visible:c.interaction.rig.root.visible,stops:c.interaction.stops},camera:{position:c.camera.position.toArray(),target:c.controls.target.toArray(),fov:c.camera.fov,transition:c.transition,followFish:c.followFish},
 school:{habitat:c.school.habitat,shoreline:c.school.shoreline,feedUntil:c.school.feedUntil,feedStart:c.school.feedStart,feedPoint:c.school.feedPoint.toArray(),inspectionFish:c.school.inspectionFish,foodVisible:c.school.food.visible,nextFood:c.school.nextFood,
  fish:c.school.fish.map(f=>({position:f.group.position.toArray(),spawn:f.spawn.toArray(),heading:f.heading,phase:f.phase.value,random:f.random})),food:c.school.food.children.map(p=>({position:p.position.toArray(),visible:p.visible,particle:p.userData.particle}))},
 settings:structuredClone(c.settings),time:c.time,status:structuredClone(c.status),experimentResets:c.experiment.resets,dynamics:c.dynamics,views:c.views};}

test('valid but undersized imported water is rejected before interrupting actual koi feeding or other scene state',()=>{
 assert.deepEqual(validateHabitat(tinyHabitat),tinyHabitat);const c=fixture(),before=snapshot(c);
 assert.throws(()=>c.binding.apply(tinyHabitat),/可游区域过小|鱼体所需空间/);assert.deepEqual(snapshot(c),before);
 // Invalid JSON geometry must have the same no-change result through the public
 // Courtyard method, without relying on SceneBinding's earlier validation.
 assert.throws(()=>Courtyard.prototype.applyHabitat.call(c,{...oldHabitat,polygon:[{x:0,z:0},{x:1,z:1}]}),/边界/);assert.deepEqual(snapshot(c),before);
});
test('undersized binding JSON preserves old habitat, calibration and active hand state',()=>{
 const c=fixture(),before=snapshot(c),data=c.binding.exportData();data.habitat=structuredClone(tinyHabitat);
 // Import checks its existing calibration against actual model surfaces first.
 // Supply the real GLB-like box used by the saved calibration points.
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(10,4,8),new THREE.MeshBasicMaterial());mesh.position.y=2;c.imported.add(mesh);
 assert.throws(()=>c.binding.importData(data),/可游区域过小|鱼体所需空间/);assert.deepEqual(snapshot(c),before);
});
test('successful habitat commits exactly one koi reset and forwards canonical validated geometry to water',()=>{
 const c=fixture(),input=structuredClone(oldHabitat);input.polygon.push({...input.polygon[0]});input.feedPoint.y=999;
 let resets=0;const reset=c.school.reset.bind(c.school);c.school.reset=options=>{resets++;return reset(options);};
 Courtyard.prototype.applyHabitat.call(c,input);assert.equal(resets,1);assert.equal(c.interaction.stops,1);assert.equal(c.water.changes,1);assert.equal(c.experiment.resets,1);assert.equal(c.dynamics,1);assert.deepEqual(c.views,['aerial']);
 assert.equal(c.water.habitat,c.school.habitat);assert.equal(c.water.habitat.polygon.length,4);assert.equal(c.water.habitat.feedPoint.y,.3);assert.equal(input.polygon.length,5);assert.equal(input.feedPoint.y,999);
 const reference=fixture();reference.school.setHabitat(c.school.habitat);assert.deepEqual(c.school.fish.map(f=>f.group.position.toArray()),reference.school.fish.map(f=>f.group.position.toArray()));assert.deepEqual(c.school.fish.map(f=>f.random()),reference.school.fish.map(f=>f.random()));
});

function resetFixture(){const c=fixture(),mesh=new THREE.Mesh(new THREE.BoxGeometry(10,4,8),new THREE.MeshBasicMaterial());mesh.position.y=2;c.imported.add(mesh);
 c.interaction.reset=function(){this.stop();this.timer=0;this.emitted=0;};c.animals={resets:0,reset(){this.resets++;}};c.water.resets=0;c.water.reset=function(){this.resets++;};c.simulationClock=new SimulationClock();c.simulationClock.advance(1/60,()=>{});return c;}
test('actual experiment reset closes pending calibration through its API and restores verified endpoints',()=>{
 const c=resetFixture(),record=structuredClone(c.binding.calibration.record),old=structuredClone(c.binding.applied);c.binding.beginCalibration();c.binding.pick(new THREE.Ray(new THREE.Vector3(-1,2,20),new THREE.Vector3(0,0,-1)));assert.equal(c.binding.calibration.pending,true);assert.equal(c.binding.calibration.points.length,1);
 Courtyard.prototype.resetExperimentRun.call(c);assert.equal(c.binding.mode,null);assert.equal(c.binding.calibration.pending,false);assert.equal(c.binding.calibration.backup,null);assert.deepEqual(c.binding.calibration.record,record);assert.deepEqual(c.binding.calibration.points,record.points);assert.deepEqual(c.binding.applied,old);assert.deepEqual(c.school.habitat,old);assert.equal(c.time,0);assert.equal(c.simulationClock.totalSteps,0);assert.equal(c.animals.resets,1);assert.equal(c.water.resets,1);assert.equal(c.interaction.mode,'idle');
});
test('unavailable imported experiment reset rejects before cancelling calibration or stopping the hand',()=>{
 const c=resetFixture();c.binding.beginCalibration();c.school.habitat=null;const before=snapshot(c),clock=c.simulationClock.totalSteps;
 assert.throws(()=>Courtyard.prototype.resetExperimentRun.call(c),/先应用动态水域绑定/);assert.deepEqual(snapshot(c),before);assert.equal(c.simulationClock.totalSteps,clock);assert.equal(c.animals.resets,0);assert.equal(c.water.resets,0);
});
test('courtyard experiment reset uses calibration cancellation without requiring an imported model',()=>{
 const c=resetFixture();c.imported=null;c.binding.clear();Courtyard.prototype.resetExperimentRun.call(c);assert.equal(c.binding.mode,null);assert.equal(c.binding.calibration.pending,false);assert.equal(c.time,0);assert.equal(c.simulationClock.totalSteps,0);assert.equal(c.animals.resets,1);
});
