import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
// Compile the actual scene methods in memory; no WebGL context or web output.
const compiled=await build({stdin:{contents:"export * as THREE from 'three'; export {Courtyard} from './scene.js'; export {PondWater,createWaterfall} from './water.js'; export {GardenAnimals} from './animals.js'; export {PoseHistory} from './pose-history.js'; export {SimulationClock} from './simulation-clock.js'; export {AlgorithmExperiment} from './experiment.js'; export {DEFAULTS} from './config.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'paused-water-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,Courtyard,PondWater,createWaterfall,GardenAnimals,PoseHistory,SimulationClock,AlgorithmExperiment,DEFAULTS}=runtime.exports;

function fixture({altitude=4,shadows=true}={}){
 const c=Object.create(Courtyard.prototype),counts={offscreen:0,main:0,controls:0,skeleton:0,shadowFrames:[]};let target=null;
 c.renderer={capabilities:{isWebGL2:false,maxTextureSize:2048},extensions:{has(){return false;}},shadowMap:{autoUpdate:true,enabled:shadows},info:{reset(){}},clippingPlanes:[],size:new THREE.Vector2(1200,800),toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:DEFAULTS.exposure,
  getDrawingBufferSize(out){return out.copy(this.size);},getRenderTarget(){return target;},setRenderTarget(value){target=value;},clear(){},render(){counts.offscreen++;counts.shadowFrames.push(counts.main);}};
 c.settings={...DEFAULTS,paused:true};c.time=0;c.frameIndex=0;c.simulationClock=new SimulationClock();c.poseHistory=new PoseHistory();c.scene=new THREE.Scene();c.scene.background=new THREE.Color('#c8d8de');c.scene.fog=new THREE.FogExp2('#c8d8de',.01);
 c.root=new THREE.Group();c.scene.add(c.root);c.camera=new THREE.PerspectiveCamera(51,1.5,.08,120);c.camera.position.set(0,altitude,5);c.camera.lookAt(0,0,0);
 c.controls={target:new THREE.Vector3(),enableDamping:true,dampingFactor:.075,update(){counts.controls++;if(this.moveNext){c.camera.position.x+=.05;this.moveNext=false;}return true;}};
 c.sun=new THREE.DirectionalLight('#fff0d1',3.1);c.sun.position.set(-10,14,10);c.sun.castShadow=true;c.hemi=new THREE.HemisphereLight('#d7edff','#8b7955',1.35);c.scene.add(c.sun,c.sun.target,c.hemi);c.sunDirection=c.sun.position.clone().normalize();
 c.water=new PondWater(c.renderer,c.scene,c.camera,new THREE.MeshStandardMaterial(),c.sun);c.waterfall=createWaterfall();c.root.add(c.waterfall.group);
 const fishGroup=new THREE.Group(),fishMesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());fishGroup.add(fishMesh);
 const state=Object.fromEntries(['uMouth','uGill','uPhase','uAmp','uBend','uSpread','uFold','uNormalCorrection','uSurfaceDetail'].map(key=>[key,{value:key==='uNormalCorrection'||key==='uSurfaceDetail'?1:0}]));
 c.school={group:new THREE.Group(),food:new THREE.Group(),fish:[{id:0,group:fishGroup,state}],metrics:{},habitat:null,setExperiment(values){this.experiment=values;},setSurfaceDetail(value){state.uSurfaceDetail.value=value?1:0;},clearFood(){this.food.children.forEach(o=>o.visible=false);}};c.school.group.add(fishGroup);c.scene.add(c.school.group,c.school.food);
 const actor=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());c.animals={group:new THREE.Group()};c.animals.group.add(actor);c.root.add(c.animals.group);
 const wet={value:0},handRoot=new THREE.Group(),bone=new THREE.Bone();handRoot.add(bone);c.interaction={rig:{root:handRoot,bones:[bone],material:{userData:{wet}},mesh:{skeleton:{update(){counts.skeleton++;}}}},stop(){handRoot.visible=false;},reset(){this.stop();}};c.scene.add(handRoot);
 c.binding={group:new THREE.Group(),clear(){}};c.scene.add(c.binding.group);c.experiment=new AlgorithmExperiment(c);
 c.architecture=new THREE.Group();c.deck=new THREE.Group();c.landscape={floor:new THREE.Mesh(new THREE.PlaneGeometry()),stones:new THREE.Group()};c.root.add(c.architecture,c.deck,c.landscape.floor,c.landscape.stones);c.bloom={strength:0};
 c.imported=null;c.followFish=c.followAnimal=c.transition=null;c.onStatus=()=>{};c.composer={render(){counts.main++;}};
 c.poseNodes=()=>[fishGroup,c.school.food,handRoot,bone,actor];c.poseUniforms=()=>[c.water.material.uniforms.time,wet,...['uMouth','uGill','uPhase','uAmp','uBend','uSpread','uFold'].map(key=>state[key])];
 c.updateDynamics=dt=>{c.time+=dt;c.water.update(c.time,c.settings,c.sunDirection,c.sun.color,dt);c.waterfall.update(c.time);c.recordPose(dt===0);};c.updateDynamics(0);
 return {c,counts,actor,bone,fishMesh,state,wet};
}
function frame(c){c.advanceFrame(1/60);c.renderInterpolated(c.settings.paused?1:.5,1/60);c.frameIndex++;}
function settle(c){frame(c);frame(c);}
function changedContent(c,mutate){const before=c.water.passStats.updates;mutate();settle(c);assert.equal(c.water.passStats.updates,before+2);frame(c);assert.equal(c.water.passStats.updates,before+2);}

test('actual renderInterpolated freezes near and distant water after synchronizing shadows while main rendering continues',()=>{
 for(const altitude of [.8,4]){const {c,counts}=fixture({altitude});for(let i=0;i<8;i++)frame(c);
  assert.equal(c.water.passStats.updates,2);assert.equal(counts.offscreen,4);assert.equal(counts.main,8);assert.equal(counts.controls,8);assert.equal(counts.skeleton,8);assert.deepEqual(counts.shadowFrames,[0,0,1,1]);assert.equal(c.simulationClock.totalSteps,0);assert.equal(c.time,0);
 }
});

test('context recovery invalidates frozen water before the first real resumed render and then stabilizes again',()=>{
 const {c,counts}=fixture();settle(c);c.active=true;c.clock={getDelta(){return 90;}};c.canvas={parentElement:{clientWidth:1200,clientHeight:800}};c.renderer.getPixelRatio=()=>1;c.renderer.setSize=()=>{};c.composer.setSize=()=>{};
 const time=c.time,pose=c.poseHistory.current,previous=c.water.lastPass;c.handleContextLost({preventDefault(){}});frame(c);assert.equal(counts.main,2);assert.equal(c.water.passStats.updates,2);
 c.handleContextRestored();assert.equal(c.active,true);assert.equal(c.time,time);assert.equal(c.poseHistory.current,pose);assert.notEqual(c.water.lastPass,previous);assert.equal(c.water.lastPass,null);
 frame(c);assert.equal(c.water.passStats.updates,3);assert.equal(c.water.passStats.reason,'initial');frame(c);assert.equal(c.water.passStats.updates,4);for(let i=0;i<4;i++)frame(c);assert.equal(c.water.passStats.updates,4);assert.equal(counts.main,8);
});

test('actual renderInterpolated with real paused animals stabilizes water without changing turtle limb poses',()=>{
 for(const [altitude,scale]of [[.8,.65],[4,1],[4,1.25]]){
  const {c,counts}=fixture({altitude});c.root.remove(c.animals.group);
  const previousDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
  try{c.animals=new GardenAnimals(c.root,c.water,{event(){}},new THREE.MeshStandardMaterial());}
  finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
  c.settings.pondScale=scale;c.time=4;c.interaction.grain=new THREE.Group();c.lilies=new THREE.Group();delete c.poseNodes;
  c.updateDynamics=dt=>{c.time+=dt;c.water.update(c.time,c.settings,c.sunDirection,c.sun.color,dt);c.animals.update(dt,c.time,c.settings);c.waterfall.update(c.time);c.recordPose(dt===0);};c.updateDynamics(0);
  assert.ok(c.poseNodes().includes(c.animals.turtle.limbs[2].pivot));const limbs=c.animals.turtle.limbs.map(l=>l.pivot.matrix.toArray());
  for(let i=0;i<10;i++){frame(c);c.animals.turtle.limbs.forEach((l,j)=>l.pivot.matrix.elements.forEach((value,k)=>assert.ok(Math.abs(value-limbs[j][k])<1e-12,`paused limb ${j} matrix[${k}] at frame ${i}: ${value} != ${limbs[j][k]}`)));}
  assert.equal(c.water.passStats.updates,2);assert.equal(counts.offscreen,4);assert.equal(counts.main,10);assert.equal(counts.controls,10);assert.equal(c.time,4);assert.equal(c.simulationClock.totalSteps,0);
 }
});

test('paused camera damping, projection, resize and revision changes still refresh actual water passes',()=>{
 const {c,counts}=fixture();settle(c);let updates=2;
 for(const mutate of [()=>c.controls.moveNext=true,()=>{c.camera.fov=45;c.camera.updateProjectionMatrix();},()=>c.renderer.size.x=900,()=>c.water.invalidatePasses()]){mutate();frame(c);assert.equal(c.water.passStats.updates,++updates);frame(c);assert.equal(c.water.passStats.updates,updates);}
 assert.equal(counts.main,10);assert.equal(counts.controls,10);
});

test('paused zero-step pose changes, parent transforms, geometry swaps and visibility invalidate actual water output',()=>{
 const {c,actor,bone}=fixture();settle(c);
 for(const mutate of [()=>actor.position.x=.2,()=>actor.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),.2),()=>actor.scale.y=2,()=>actor.geometry=actor.geometry.clone(),()=>actor.visible=false,()=>c.animals.group.position.z=.3,()=>c.interaction.stop(),()=>{bone.matrixAutoUpdate=false;bone.matrix.elements[4]=.17;}])changedContent(c,mutate);
 // Raw matrix edits can keep position/quaternion/scale completely unchanged.
 changedContent(c,()=>bone.matrix.elements[4]=.18);
});

test('normal correction, other fish material inputs and water debug changes refresh despite unchanged pose uniforms',()=>{
 const {c,state,wet}=fixture();settle(c);
 changedContent(c,()=>c.experiment.setParameters({normalCorrection:false}));assert.equal(state.uNormalCorrection.value,0);
 changedContent(c,()=>state.uSurfaceDetail.value=0);changedContent(c,()=>wet.value=.7);changedContent(c,()=>c.experiment.setParameters({waterDebug:'normal'}));
 const before=c.water.passStats.updates;c.experiment.setParameters({overlay:{vectors:true,collision:true}});for(let i=0;i<4;i++)frame(c);assert.equal(c.water.passStats.updates,before,'auxiliary lines are excluded from both water passes');
});

test('identical waterfall positions may be uploaded every paused frame without forcing new water passes',()=>{
 const {c}=fixture();settle(c);const attribute=c.waterfall.group.children[1].geometry.attributes.position,version=attribute.version;
 for(let i=0;i<6;i++)frame(c);assert.ok(attribute.version>=version+6);assert.equal(c.water.passStats.updates,2);
 changedContent(c,()=>c.time=1);
});

test('loaded textures, material values, direct lights and authored setting changes invalidate frozen water',()=>{
 const {c,fishMesh}=fixture();settle(c);const texture=new THREE.Texture();
 changedContent(c,()=>fishMesh.material.map=texture);changedContent(c,()=>texture.needsUpdate=true);changedContent(c,()=>fishMesh.material.roughness=.2);
 changedContent(c,()=>c.sun.intensity=.9);changedContent(c,()=>c.sun.position.x=5);changedContent(c,()=>c.hemi.groundColor.set('#334455'));
 const revision=c.water.passRevision;changedContent(c,()=>c.updateSettings({hour:12,wind:.6}));assert.ok(c.water.passRevision>revision);
});

test('explicit frozen rendering records cache context and water-domain changes already advance the pass revision',()=>{
 const {c}=fixture();c.renderCurrent();assert.equal(c.water.lastPass.paused,true);frame(c);frame(c);assert.equal(c.water.passStats.updates,2);
 const habitat={polygon:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}],waterLevel:.3,depth:.65,feedPoint:{x:0,y:.3,z:0},obstacles:[]};
 let revision=c.water.passRevision;changedContent(c,()=>c.water.setHabitat(habitat));assert.ok(c.water.passRevision>revision);
 revision=c.water.passRevision;changedContent(c,()=>c.water.setHabitat(null));assert.ok(c.water.passRevision>revision);
});

test('returning from a model invalidates water even before the camera transition moves',()=>{
 const {c}=fixture();settle(c);c.imported=new THREE.Group();c.scene.add(c.imported);c.root.visible=false;const revision=c.water.passRevision,before=c.water.passStats.updates;
 frame(c);assert.equal(c.water.passStats.updates,before);c.clearModel();assert.ok(c.water.passRevision>revision);assert.ok(c.transition);settle(c);assert.equal(c.water.passStats.updates,before+2);
});

test('resume refreshes immediately and active near/distant cadence bypasses paused snapshot work',()=>{
 for(const altitude of [.8,4]){const {c}=fixture({altitude});settle(c);c.settings.paused=false;c.advanceFrame=()=>{};
  Object.defineProperty(c.waterfall,'time',{get(){throw new Error('active frames must not collect paused content');}});
  frame(c);assert.equal(c.water.passStats.reason,'resume');const before=c.water.passStats.updates;frame(c);assert.equal(c.water.passStats.updates,before+(altitude<1.8?1:0));frame(c);assert.equal(c.water.passStats.updates,before+(altitude<1.8?2:1));
 }
});

test('Three transparent DoubleSide render bookkeeping cannot invalidate an unchanged frozen scene',()=>{
 const {c,counts}=fixture(),material=new THREE.MeshPhysicalMaterial({transparent:true,opacity:.7,side:THREE.DoubleSide});
 const wing=new THREE.Mesh(new THREE.PlaneGeometry(),material);c.animals.group.add(wing);assert.equal(material.forceSinglePass,false);
 // WebGLRenderer r160 renderObject (1570-1580): draw back and front sides,
 // increment Material.version for each program update, then restore DoubleSide.
 const drawDoubleSide=()=>{material.side=THREE.BackSide;material.needsUpdate=true;material.side=THREE.FrontSide;material.needsUpdate=true;material.side=THREE.DoubleSide;};
 const render=c.renderer.render;c.renderer.render=()=>{render();drawDoubleSide();};const main=c.composer.render;c.composer.render=()=>{main();drawDoubleSide();};
 for(let i=0;i<8;i++)frame(c);assert.ok(material.version>=16);assert.equal(c.water.passStats.updates,2);assert.equal(counts.main,8);assert.equal(counts.offscreen,4);
 changedContent(c,()=>material.opacity=.5);
});

test('shader definitions, extensions and source remain semantic inputs while uniform upload flags are ignored',()=>{
 const {c}=fixture(),material=new THREE.ShaderMaterial({defines:{CHOICE:0},uniforms:{value:{value:0}}});c.animals.group.add(new THREE.Mesh(new THREE.PlaneGeometry(),material));settle(c);
 const before=c.water.passStats.updates,main=c.composer.render;c.composer.render=()=>{main();material.uniformsNeedUpdate=false;};
 for(let i=0;i<4;i++){material.uniformsNeedUpdate=true;material.needsUpdate=true;frame(c);}assert.equal(c.water.passStats.updates,before);
 changedContent(c,()=>{material.defines.CHOICE=1;material.needsUpdate=true;});changedContent(c,()=>material.extensions.derivatives=true);changedContent(c,()=>material.fragmentShader+='\n// changed shader');
 changedContent(c,()=>material.uniforms.value.value=1);
});
