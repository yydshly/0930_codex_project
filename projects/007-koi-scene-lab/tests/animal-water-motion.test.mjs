import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {pondLocalToWorld,pondWorldToLocal,worldPoseToPondMatrix,landingArc,blendHeading,turtleRoute,turtleRouteHeading,turtleShoreClearance,TURTLE_ORBIT_DURATION,TURTLE_RADIUS,TURTLE_BANK_MARGIN} from '../src/animal-water-motion.js';
import {sampleGerstner,surfaceSampleAt} from '../src/water-motion.js';
import {PoseHistory} from '../src/pose-history.js';

const scales=[.65,1,1.25],close=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
test('animal world/local coordinates roundtrip around the same scaled pond center',()=>{
 for(const scale of scales)for(const p of [{x:-2.6,y:.04,z:2.25},{x:-.5,y:-.13,z:-.15},{x:3,y:.5,z:1}]){
  const w=pondLocalToWorld(p,scale),back=pondWorldToLocal(w,scale);for(const key of ['x','y','z'])close(back[key],p[key]);
  close(Math.hypot(w.x+.5,w.z+.15),Math.hypot(p.x+.5,p.z+.15)*scale);
 }
});
test('landing arc starts and ends at the moving support, with zero extra endpoint velocity',()=>{
 const from={x:0,y:.03,z:0},target=t=>({x:1+.02*t,y:.04+.01*t,z:.5});
 assert.deepEqual(landingArc(from,target(0),0),from);assert.deepEqual(landingArc(from,target(1),1),target(1));
 const middle=landingArc(from,target(.5),.5);close(middle.y,.4675);
 const epsilon=1e-5,a=landingArc(from,target(epsilon),epsilon),b=landingArc(from,target(1-epsilon),1-epsilon),end=landingArc(from,target(1),1);
 assert.ok(Math.abs((a.y-from.y)/epsilon)<.0001);close((end.y-b.y)/epsilon,.01,.0001);
 assert.deepEqual(landingArc(from,target(1),2),target(1));
});
test('support heading takes the short turn across the angle seam',()=>{
 const a=Math.PI-.02,b=-Math.PI+.02,mid=blendHeading(a,b,.5);close(mid,Math.PI);close(blendHeading(a,b,1)-a,.04);
});
test('turtle complete route reserves a body radius plus bank margin at every pond scale',()=>{
 for(const scale of scales)for(let i=0;i<=720;i++){
  const p=turtleRoute(i/720*TURTLE_ORBIT_DURATION,scale),clearance=turtleShoreClearance(p,scale);
  assert.ok(clearance>=(TURTLE_RADIUS+TURTLE_BANK_MARGIN)*scale-1e-8,`shore clearance ${clearance} at ${scale}/${i}`);
 }
});
test('the turtle route completes continuously with matching entry and exit tangents',()=>{
 for(const scale of scales){const a=turtleRoute(0,scale),b=turtleRoute(TURTLE_ORBIT_DURATION,scale);close(a.x,b.x);close(a.z,b.z);
  close(turtleRouteHeading(0,scale),turtleRouteHeading(TURTLE_ORBIT_DURATION,scale));
  const epsilon=.00001,start=turtleRoute(epsilon,scale),end=turtleRoute(TURTLE_ORBIT_DURATION-epsilon,scale);
  close((start.x-a.x)/epsilon,(b.x-end.x)/epsilon,1e-6);close((start.z-a.z)/epsilon,(b.z-end.z)/epsilon,1e-6);
 }
});

// Build this fixture in memory. It exercises the real SDF actor and leaf
// geometry, but does not rebuild the browser artifact or need a GPU.
const nodeRequire=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=nodeRequire('esbuild');
const compiled=await build({stdin:{contents:"import * as THREE from 'three'; export {THREE}; export {GardenAnimals} from './animals.js'; export {lilyGeometry,lilyHeightAt} from './lily-geometry.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'animal-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,nodeRequire);
const {THREE,GardenAnimals,lilyGeometry,lilyHeightAt}=runtime.exports;
test('full affine child matrices cancel the nonuniform pond parent and preserve world normals',()=>{
 const up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(.32,.87,-.2).normalize(),q=new THREE.Quaternion().setFromUnitVectors(up,normal);
 for(const scale of scales){const world=new THREE.Matrix4().compose(new THREE.Vector3(-2,.037,2),q,new THREE.Vector3(.25*scale,.25*scale,.25*scale)),local=new THREE.Matrix4().fromArray(worldPoseToPondMatrix(world.elements,scale)),parent=new THREE.Matrix4().compose(new THREE.Vector3(.5*(scale-1),0,.15*(scale-1)),new THREE.Quaternion(),new THREE.Vector3(scale,1,scale)),actual=parent.multiply(local);
  for(let i=0;i<16;i++)close(actual.elements[i],world.elements[i]);const actualNormal=up.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(actual)).normalize();close(actualNormal.dot(normal),1);
  if(scale!==1){const column0=new THREE.Vector3().setFromMatrixColumn(local,0),column1=new THREE.Vector3().setFromMatrixColumn(local,1);assert.ok(Math.abs(column0.dot(column1))>1e-5,'the local pose must retain shear');}
 }
});
test('shared lily geometry keeps curvature, upward normals and a perch inside the actual triangles',()=>{
 const geometry=lilyGeometry(),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');let minY=Infinity,maxY=-Infinity;
 for(let i=0;i<p.count;i++){minY=Math.min(minY,p.getY(i));maxY=Math.max(maxY,p.getY(i));assert.ok(n.getY(i)>.9);}
 assert.ok(maxY-minY>.015);assert.ok(lilyHeightAt(geometry,-.48,.14)>0);assert.throws(()=>lilyHeightAt(geometry,.5,0));geometry.dispose();
});
let ripples=[],audioEvents=[],wind=.8;
const water={sampleAtRest(x,z,time){const p=sampleGerstner(x,z,time,wind);return {x:p.position[0],y:.02+p.position[1],z:p.position[2],normal:p.normal};},floatAnchorAt(x,z,time){const p=surfaceSampleAt(x,z,time,wind);return {x:p.x,z:p.z};},addRipple(x,z,time,amplitude){ripples.push({x,z,time,amplitude});}};
const previousDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const animals=new GardenAnimals(new THREE.Group(),water,{event:name=>audioEvents.push(name)},new THREE.MeshStandardMaterial());
if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
function reset(scale=1){animals.scale=scale;animals.reset();ripples=[];audioEvents=[];}
function distance(a,b){return Math.hypot(...a.map((v,i)=>v-b[i]));}
test('real resting frog follows its curved leaf position and sampled normal at all scales',()=>{
 for(const scale of scales){reset(scale);let movement=0,previous=animals.debugPose().frog.position;
  for(let i=1;i<=30;i++){animals.update(.02,i*.02,{pondScale:scale});const pose=animals.debugPose(),pad=pose.pads[0];
   assert.ok(distance(pose.frog.position,pose.frog.target)<1e-9);assert.ok(distance(pad.normal,pad.water.normal)<1e-9);assert.ok(distance(pose.frog.normal,pad.normal)<1e-9);
   movement+=distance(pose.frog.position,previous);previous=pose.frog.position;
  }assert.ok(movement>.01);
 }
});
test('real frog jump retargets the wave-moved landing pad and emits exactly one landing impulse',()=>{
 reset(.65);animals.activate('frog',0);const initial=animals.debugPose().frog.position;animals.update(0,0,{pondScale:.65});assert.ok(distance(initial,animals.debugPose().frog.position)<1e-9);
 for(let i=1;i<=43;i++)animals.update(i===43?.01:.02,Math.min(i*.02,.85),{pondScale:.65});
 let pose=animals.debugPose();assert.equal(pose.frog.state,'rest');assert.equal(pose.frog.pad,1);assert.ok(distance(pose.frog.position,pose.frog.target)<1e-9);assert.equal(pose.landingEvents,1);assert.equal(ripples.length,1);assert.equal(audioEvents.filter(n=>n==='frog').length,1);
 animals.update(.02,.87,{pondScale:.65});assert.equal(animals.landingEvents,1);
});
test('real dragonfly transitions to a moving perch continuously and stays attached through wind',()=>{
 reset(1.25);const d=animals.dragonflies[0];d.state='hover';d.timer=d.duration-.001;d.target.copy(d.root.getWorldPosition(new THREE.Vector3()));
 animals.update(.001,.001,{pondScale:1.25});assert.equal(d.state,'perch');const start=animals.debugPose().dragonflies[0].position;
 animals.update(0,.001,{pondScale:1.25});assert.ok(distance(start,animals.debugPose().dragonflies[0].position)<1e-9);
 for(let i=1;i<=50;i++){animals.update(.02,.001+i*.02,{pondScale:1.25});if(i>=40){const pose=animals.debugPose().dragonflies[0];assert.ok(distance(pose.position,pose.target)<1e-9);assert.ok(distance(pose.normal,animals.debugPose().pads[0].normal)<1e-9);}}
 assert.equal(d.state,'perch');assert.ok(d.contact);
});
test('real turtle tracks shared surface depth, stays inside the shore margin and returns continuously',()=>{
 for(const scale of scales){reset(scale);animals.activate('turtle',0);animals.update(0,0,{pondScale:scale});const p0=animals.debugPose().turtle.position;let previousLimbs=animals.turtle.limbs.map(l=>l.pivot.rotation.y),maxLimbStep=0;const sampleLimbs=()=>{const now=animals.turtle.limbs.map(l=>l.pivot.rotation.y);maxLimbStep=Math.max(maxLimbStep,...now.map((v,i)=>Math.abs(v-previousLimbs[i])));previousLimbs=now;};
  assert.ok(distance(p0,animals.turtleBaskPose().position.toArray())<1e-9);
  for(let i=1;i<=48;i++){animals.update(.05,i*.05,{pondScale:scale});sampleLimbs();}let pose=animals.debugPose();assert.equal(pose.turtle.state,'swim');assert.equal(pose.splashEvents,1);
  for(let i=1;i<=600;i++){animals.update(.05,2.4+i*.05,{pondScale:scale});sampleLimbs();pose=animals.debugPose();if(pose.turtle.state==='swim'){close(pose.turtle.depth,.15);assert.ok(pose.turtle.shoreClearance>=pose.turtle.bodyRadius+pose.turtle.bankMargin-1e-8);}}
  for(let i=1;i<=50;i++){animals.update(.05,32.4+i*.05,{pondScale:scale});sampleLimbs();}assert.equal(animals.turtle.state,'bask');assert.equal(animals.splashEvents,1);assert.equal(ripples.filter(p=>p.amplitude===.035).length,1);assert.ok(maxLimbStep<.14,`limb jump ${maxLimbStep} at scale ${scale}`);
 }
});
test('zero timestep freezes every actor pose, timer and impulse; reset reproduces the ecosystem start',()=>{
 reset();animals.activate('frog',0);animals.activate('turtle',0);animals.update(.4,.4,{pondScale:1});const before=animals.debugPose(),count=ripples.length;
 for(let i=0;i<4;i++)animals.update(0,.4,{pondScale:1});assert.deepEqual(animals.debugPose(),before);assert.equal(ripples.length,count);
 reset(.65);const initial=animals.debugPose();animals.update(2,2,{pondScale:.65});reset(.65);assert.deepEqual(animals.debugPose(),initial);
});

test('real turtle limb poses remain fixed after quaternion render restoration in every behavior',()=>{
 for(const scale of scales)for(const state of ['bask','enter','swim','exit']){
  reset(scale);const t=animals.turtle;t.state=state;t.timer=state==='bask'?0:state==='enter'?.2:state==='swim'?4:1;
  const settings={pondScale:scale},time=4;animals.update(0,time,settings);const nodes=t.limbs.map(l=>l.pivot),history=new PoseHistory();history.record(nodes,[],time,true);
  const before=nodes.map(node=>node.matrix.toArray()),timer=t.timer,impulses=ripples.length;
  for(let frame=0;frame<8;frame++){
   // Three converts quaternion writes back into an equivalent XYZ Euler pose.
   // A rear-limb yaw exceeds pi/2, so updating only Euler.y then flips x/z.
   history.withInterpolated(frame%2?.35:1,()=>{});animals.update(0,time,settings);history.record(nodes,[],time,true);
   nodes.forEach((node,i)=>node.matrix.elements.forEach((value,j)=>assert.ok(Math.abs(value-before[i][j])<1e-12,`${state} limb ${i} matrix[${j}] at scale ${scale}, frame ${frame}: ${value} != ${before[i][j]}`)));
   assert.equal(t.timer,timer);assert.equal(ripples.length,impulses);
  }
 }
});
