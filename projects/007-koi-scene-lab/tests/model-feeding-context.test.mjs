import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
const compiled=await build({stdin:{contents:"export * as THREE from 'three'; export {Courtyard} from './scene.js'; export {KoiSchool} from './fish.js'; export {HandInteraction} from './interaction.js'; export {DEFAULTS} from './config.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'model-feeding-context-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,Courtyard,KoiSchool,HandInteraction,DEFAULTS}=runtime.exports;

function withDOM(callback){const old=globalThis.document,context={fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){},putImageData(){},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}};globalThis.document={createElement(){return {width:0,height:0,getContext(){return context;}};},createElementNS(){return {addEventListener(){},removeEventListener(){},set src(value){this.url=value;}};}};try{return callback();}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}}

// A minimal self-contained glTF 2.0 triangle is parsed by the real GLTFLoader.
function glb({version='2.0',empty=false,external=false}={}){
 const positions=new Float32Array([0,0,0,2,0,0,0,1,.5]);
 const json=empty?{asset:{version},scene:0,scenes:[{nodes:[]}]}:{asset:{version},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:positions.byteLength,...(external?{uri:'mesh.bin'}:{})}],bufferViews:[{buffer:0,byteOffset:0,byteLength:positions.byteLength,target:34962}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[2,1,.5]}]};
 const raw=new TextEncoder().encode(JSON.stringify(json)),jsonLength=Math.ceil(raw.length/4)*4,bin=empty?null:new Uint8Array(positions.buffer),length=12+8+jsonLength+(bin?8+bin.byteLength:0),bytes=new ArrayBuffer(length),view=new DataView(bytes);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,length,true);view.setUint32(12,jsonLength,true);view.setUint32(16,0x4e4f534a,true);
 const text=new Uint8Array(bytes,20,jsonLength);text.fill(32);text.set(raw);
 if(bin){const offset=20+jsonLength;view.setUint32(offset,bin.byteLength,true);view.setUint32(offset+4,0x004e4942,true);new Uint8Array(bytes,offset+8).set(bin);}
 return bytes;
}
function file(name='fixture.glb',bytes=glb()){return {name,size:bytes.byteLength,async arrayBuffer(){return bytes;}};}
const habitat={polygon:[{x:-3,z:-3},{x:3,z:-3},{x:3,z:3},{x:-3,z:3}],waterLevel:.02,depth:.7,feedPoint:{x:0,y:.02,z:0},obstacles:[]};

function fixture({model=false,bound=false}={}){
 const c=Object.create(Courtyard.prototype);c.scene=new THREE.Scene();c.root=new THREE.Group();c.scene.add(c.root);c.settings={...DEFAULTS,paused:true};c.time=23.4;c.simulationClock={totalSteps:1404,droppedSeconds:.2};c.status=[];c.onStatus=value=>c.status.push(value);
 c.camera=new THREE.PerspectiveCamera(51,1.4,.08,120);c.camera.position.set(3,4,8);c.controls={target:new THREE.Vector3(0,0,0),maxPolarAngle:1.5,maxDistance:30,autoRotate:false,enableDamping:true,update(){}};
 c.water={mesh:new THREE.Mesh(),floor:new THREE.Mesh(),wall:new THREE.Mesh(),habitat:null,heightAt(){return .02;},addRipple(){},setHabitat(value){this.habitat=value;}};
 c.school=withDOM(()=>new KoiSchool(c.scene,c.water));c.school.reset();
 c.imported=model?new THREE.Group():null;c.importedMeta=model?{name:'old.glb',sha256:'a'.repeat(64),sourceSize:[3,2,3]}:null;
 if(model){c.imported.add(new THREE.Mesh(new THREE.BoxGeometry(3,2,3),new THREE.MeshStandardMaterial()));c.scene.add(c.imported);}
 if(bound){c.school.setHabitat(habitat);c.water.setHabitat(c.school.habitat);}
 c.binding={clears:0,redraw(){},clear(){this.clears++;}};c.experiment={resets:0,resetComparison(){this.resets++;}};c.updateSettings=value=>Object.assign(c.settings,value);
 c.interaction=withDOM(()=>new HandInteraction(c));
 // Seed a real live hand and token-backed food history. This suite tests context
 // transitions; release/land/swallow physics are covered by feeding-integration.
 if(c.hasDynamics)c.interaction.start('feed');else{c.interaction.mode='feed';c.interaction.phase='release';c.interaction.feedBatch=c.school.feeding.begin(6,c.time);c.school.feed(c.time,new THREE.Vector3());}
 const id=c.interaction.feedBatch;c.school.releasePellet(c.time,new THREE.Vector3(0,.25,0),new THREE.Vector3(0,-.03,0),id);const first=c.school.food.children[0];c.school.feeding.land(first.userData.particle.feedToken);c.school.feeding.consume(first.userData.particle.feedToken);first.userData.particle.eaten=true;first.visible=false;
 c.school.releasePellet(c.time+.01,new THREE.Vector3(.1,.25,0),new THREE.Vector3(0,-.03,0),id);c.school.consumed=1;c.school.metrics.consumed=1;c.school.fish[0].consumed=1;c.school.fish[0].targetPellet=c.school.food.children.find(mesh=>mesh.visible);c.interaction.timer=1.8;c.interaction.emitted=2;
 return c;
}
function snapshot(c){return {imported:c.imported,meta:structuredClone(c.importedMeta),rootVisible:c.root.visible,settings:structuredClone(c.settings),time:c.time,clock:structuredClone(c.simulationClock),batch:c.school.feeding.latest(),consumed:c.school.consumed,feedUntil:c.school.feedUntil,feedStart:c.school.feedStart,targets:c.school.fish.map(fish=>fish.targetPellet),positions:c.school.fish.map(fish=>fish.group.position.toArray()),particles:c.school.food.children.map(mesh=>mesh.userData.particle),foodVisible:c.school.food.visible,hand:{mode:c.interaction.mode,phase:c.interaction.phase,timer:c.interaction.timer,emitted:c.interaction.emitted,batch:c.interaction.feedBatch,visible:c.interaction.rig.root.visible},status:structuredClone(c.status),bindingClears:c.binding.clears,experimentResets:c.experiment.resets};}
function assertCleared(c){assert.equal(c.school.feeding.latest(),null);assert.equal(c.school.consumed,0);assert.equal(c.school.metrics.consumed,0);assert.equal(c.school.feedUntil,0);assert.equal(c.school.feedStart,0);assert.equal(c.interaction.mode,'idle');assert.equal(c.interaction.timer,0);assert.equal(c.interaction.emitted,0);assert.equal(c.interaction.feedBatch,null);assert.ok(c.school.fish.every(fish=>fish.targetPellet===null&&fish.consumed===0));assert.ok(c.school.food.children.every(mesh=>mesh.userData.particle===null&&!mesh.visible));assert.equal(c.school.food.visible,false);}

test('a valid unbound model and return to courtyard clear feeding without rewinding courtyard settings or time',async()=>{
 const c=fixture(),before=snapshot(c);await Courtyard.prototype.importGLB.call(c,file());
 assert.ok(c.imported);assert.equal(c.hasDynamics,false);assert.equal(c.importedMeta.name,'fixture.glb');assert.match(c.importedMeta.sha256,/^[0-9a-f]{64}$/);assertCleared(c);
 assert.deepEqual(c.settings,before.settings);assert.equal(c.time,before.time);assert.deepEqual(c.simulationClock,before.clock);assert.deepEqual(c.school.fish.map(fish=>fish.group.position.toArray()),before.positions);
 // Even a stale result in an unbound imported context must not revive on return.
 const importedId=c.school.feeding.begin(1,c.time);c.school.releasePellet(c.time,new THREE.Vector3(0,.2,0),new THREE.Vector3(),importedId);c.school.feed(c.time);c.school.consumed=2;c.school.metrics.consumed=2;
 Courtyard.prototype.clearModel.call(c);assert.equal(c.imported,null);assert.equal(c.hasDynamics,true);assert.equal(c.root.visible,true);assertCleared(c);assert.equal(c.time,before.time);assert.deepEqual(c.settings,before.settings);
});

test('successful replacement of an imported model clears the previous feeding context',async()=>{
 const c=fixture({model:true,bound:true}),old=c.imported,oldToken=c.school.food.children.find(mesh=>mesh.visible).userData.particle.feedToken,time=c.time,settings={...c.settings};
 await Courtyard.prototype.importGLB.call(c,file('replacement.glb'));
 assert.notEqual(c.imported,old);assert.equal(old.parent,null);assert.equal(c.importedMeta.name,'replacement.glb');assert.equal(c.school.habitat,null);assert.equal(c.water.habitat,null);assertCleared(c);
 assert.equal(c.school.feeding.consume(oldToken),false);assert.equal(c.time,time);assert.deepEqual(c.settings,settings);
});

test('invalid files, loader parse failures and empty geometry preserve the old live batch and model',async()=>{
 const c=fixture({model:true,bound:true}),before=snapshot(c);
 const invalid=[file('wrong.txt'),file('broken.glb',new ArrayBuffer(24)),file('old-version.glb',glb({version:'1.0'})),file('empty.glb',glb({empty:true})),file('external.glb',glb({external:true}))];
 for(const candidate of invalid){await assert.rejects(Courtyard.prototype.importGLB.call(c,candidate));assert.deepEqual(snapshot(c),before);}
});

test('digest failure after successful parsing preserves the entire previous context',async()=>{
 const c=fixture({model:true,bound:true}),before=snapshot(c),descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{async digest(){throw new Error('digest failed');}}}});
 try{await assert.rejects(Courtyard.prototype.importGLB.call(c,file()),/digest failed/);assert.deepEqual(snapshot(c),before);}finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}
});

test('repeated clearModel in the program courtyard leaves the ongoing batch and hand untouched',()=>{
 const c=fixture(),before=snapshot(c);
 Courtyard.prototype.clearModel.call(c);Courtyard.prototype.clearModel.call(c);
 assert.deepEqual(snapshot(c),before);
});

test('removing an actual bound habitat retains the existing food and ledger reset semantics',()=>{
 const c=fixture({model:true,bound:true}),time=c.time,settings={...c.settings};
 Courtyard.prototype.removeHabitat.call(c);
 assert.equal(c.school.habitat,null);assert.equal(c.water.habitat,null);assert.equal(c.school.feeding.latest(),null);assert.equal(c.school.consumed,0);assert.equal(c.school.feedUntil,0);assert.equal(c.school.feedStart,0);assert.equal(c.school.food.visible,false);assert.ok(c.school.food.children.every(mesh=>mesh.userData.particle===null));assert.equal(c.time,time);assert.deepEqual(c.settings,settings);
});
