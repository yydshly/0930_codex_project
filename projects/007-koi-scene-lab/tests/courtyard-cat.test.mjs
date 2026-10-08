import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {CAT_ROUTE_DURATION,CAT_ROUTE_BOUNDS,CAT_ROUTE_LENGTH,CAT_STRIDE_LENGTH,catRoute,catGait,solveCatLeg} from '../src/cat-motion.js';
import {PoseHistory} from '../src/pose-history.js';
const close=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const nodeRequire=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=nodeRequire('esbuild');
const compiled=await build({stdin:{contents:"import * as THREE from 'three'; export {THREE}; export {CourtyardCat} from './cat.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'cat-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,nodeRequire);const {THREE,CourtyardCat}=runtime.exports;
const parent=new THREE.Group(),cat=new CourtyardCat(parent);
const setScale=scale=>{parent.scale.set(scale,1,scale);parent.position.set(.5*(scale-1),0,.15*(scale-1));parent.updateWorldMatrix(true,true);cat.update(0,cat.time);};
function signature(){return JSON.stringify({state:cat.state,timer:cat.timer,time:cat.time,patrols:cat.patrolCount,position:cat.worldPosition,pose:cat.poseNodes().map(n=>{n.updateMatrixWorld(true);return n.matrix.toArray();}),tail:Array.from(cat.tail.skeleton.boneMatrices)});}
test('cat patrol is closed and reserves a dry world-space corridor at every phase',()=>{
 for(let i=0;i<=1000;i++){const p=catRoute(CAT_ROUTE_DURATION*i/1000);assert.ok(p.x>=CAT_ROUTE_BOUNDS.minX-1e-9&&p.x<=CAT_ROUTE_BOUNDS.maxX+1e-9);assert.ok(p.z>=CAT_ROUTE_BOUNDS.minZ&&p.z<=CAT_ROUTE_BOUNDS.maxZ);assert.equal(p.y,-.035);}
 const a=catRoute(0),b=catRoute(CAT_ROUTE_DURATION);close(a.x,b.x);close(a.z,b.z);close(a.heading,b.heading);
 const epsilon=.0001;assert.ok(Math.hypot(catRoute(epsilon).x-a.x,catRoute(epsilon).z-a.z)/epsilon<.00001);
});
test('cat route distance grows with physical travel and eases to rest at both ends',()=>{
 let previous=catRoute(0),travel=0;
 for(let i=1;i<=3000;i++){const p=catRoute(CAT_ROUTE_DURATION*i/3000);assert.ok(p.distance>=previous.distance);travel+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}
 close(previous.distance,CAT_ROUTE_LENGTH);assert.ok(Math.abs(travel-CAT_ROUTE_LENGTH)<.002);
 assert.equal(catRoute(0).speed,0);assert.equal(catRoute(CAT_ROUTE_DURATION).speed,0);
});
test('distance-driven stance cancels forward travel on a straight path and swing touches down softly',()=>{
 const a=.12*CAT_STRIDE_LENGTH,b=.28*CAT_STRIDE_LENGTH,g1=catGait(a,0),g2=catGait(b,0);
 assert.ok(g1.stance&&g2.stance);close(a+g1.x,b+g2.x);assert.equal(g1.lift,0);assert.equal(g2.lift,0);
 for(const fraction of [.68001,.99999])assert.ok(catGait(fraction*CAT_STRIDE_LENGTH,0).lift<1e-7);
 assert.ok(catGait(.84*CAT_STRIDE_LENGTH,0).lift<=.022);
});
test('seated forepaws remain below the shoulders rather than reaching forward',()=>{
 cat.reset();const legs=cat.legs.filter(l=>!l.hind);
 for(const leg of legs){assert.ok(Math.abs(leg.paw.position.x-leg.hip.position.x)<.015);assert.equal(leg.paw.position.y,0);}
 assert.ok(cat.neck.rotation.z<-.3,'head counter-rotates the raised chest');
});
test('repeated patrol during sitting preserves the in-progress pose and timing',()=>{
 cat.reset();cat.activate();cat.update(1.1,1.1);cat.update(CAT_ROUTE_DURATION,1.1+CAT_ROUTE_DURATION);cat.update(.25,1.35+CAT_ROUTE_DURATION);
 assert.equal(cat.state,'sit');const before=signature();assert.match(cat.activate(),/正在坐下/);cat.update(0,cat.time);
 assert.equal(signature(),before);
 cat.update(1,cat.time+1);assert.equal(cat.state,'observe');assert.match(cat.activate(),/起身/);assert.equal(cat.state,'stand');
});
test('leg inverse kinematics reaches supported paws without stretching either segment',()=>{
 for(const bend of [-1,1])for(const hip of [{x:.12,y:.27},{x:-.23,y:.14}]){
  const paw={x:hip.x+.035,y:.024},a=.156,b=.143,s=solveCatLeg(hip,paw,a,b,bend);
  close(Math.hypot(s.knee.x-hip.x,s.knee.y-hip.y),a);close(Math.hypot(paw.x-s.knee.x,paw.y-s.knee.y),b);
  close(hip.x+Math.sin(s.upperAngle)*a,s.knee.x);close(s.knee.y-Math.cos(s.lowerAngle)*b,paw.y);
 }
});
test('cat keeps adult world dimensions and heading under the full nonuniform parent transform',()=>{
 cat.reset();const baseline=cat.bounds(),size=baseline.getSize(new THREE.Vector3());
 for(const scale of [.65,1,1.25]){setScale(scale);const box=cat.bounds(),actual=box.getSize(new THREE.Vector3()),world=new THREE.Vector3();cat.root.getWorldPosition(world);close(world.x,2.45);close(world.z,6.6);close(world.y,-.035);
  for(const axis of ['x','y','z'])close(actual[axis],size[axis],1e-7);const matrix=cat.root.matrixWorld.elements;for(const column of [0,1,2])close(Math.hypot(matrix[column*4],matrix[column*4+1],matrix[column*4+2]),1);
 }
});
test('cat completes stand, walk, sit and observe continuously without entering the pond corridor',()=>{
 cat.reset();setScale(1.25);cat.activate();const states=new Set([cat.state]);let previous=cat.root.getWorldPosition(new THREE.Vector3()),maxStep=0,minY=Infinity;
 for(let i=1;i<=1400;i++){
  cat.update(.02,i*.02);states.add(cat.state);const p=cat.root.getWorldPosition(new THREE.Vector3());maxStep=Math.max(maxStep,p.distanceTo(previous));previous=p;
  assert.ok(p.x>=2.45-1e-8&&p.x<=4.15+1e-8);assert.ok(p.z>=6.3&&p.z<=6.9);const bounds=cat.bounds();assert.ok(bounds.min.z>5.70,'whole cat stays in the dry foreground even at maximum pond scale');
  if(i%20===0)cat.root.traverse(part=>{if(!part.isMesh)return;const positions=part.geometry.getAttribute('position'),point=new THREE.Vector3();for(let vertex=0;vertex<positions.count;vertex++){point.fromBufferAttribute(positions,vertex);if(part.isSkinnedMesh)part.applyBoneTransform(vertex,point);minY=Math.min(minY,point.applyMatrix4(part.matrixWorld).y);}});
 }
 assert.deepEqual([...states].sort(),['observe','sit','stand','walk']);assert.equal(cat.patrolCount,1);assert.ok(maxStep<.015,`brisk patrol exceeds .75 m/s: ${maxStep/.02}`);assert.ok(minY>=-.038,`geometry penetrates floor: ${minY}`);
});
test('cat zero steps freeze behavior and every animated joint after render interpolation; reset reproduces start',()=>{
 cat.reset();setScale(.65);const initial=signature();cat.activate();for(let i=1;i<=260;i++)cat.update(.02,i*.02);
 const history=new PoseHistory();history.record(cat.poseNodes(),[],cat.time,true);const before=signature(),tailGeometry=cat.tail.geometry.getAttribute('position'),positions=Array.from(tailGeometry.array),version=tailGeometry.version;
 for(let i=0;i<8;i++){history.withInterpolated(.4,()=>cat.updateSkeletons());cat.updateSkeletons();cat.update(0,cat.time+100);assert.equal(signature(),before);}
 assert.equal(tailGeometry.version,version);assert.deepEqual(Array.from(tailGeometry.array),positions);cat.reset();assert.equal(signature(),initial);
});
test('cat tail is one closed weighted surface with all nine bones represented in interpolation',()=>{
 const geometry=cat.tail.geometry,index=geometry.getIndex(),edges=new Map(),weights=geometry.getAttribute('skinWeight');
 for(let i=0;i<index.count;i+=3)for(const pair of [[index.getX(i),index.getX(i+1)],[index.getX(i+1),index.getX(i+2)],[index.getX(i+2),index.getX(i)]]){const key=pair.sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)??0)+1);}
 assert.ok([...edges.values()].every(count=>count===2));for(let i=0;i<weights.count;i++)close(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i),1,1e-7);
 assert.equal(cat.tailBones.length,9);assert.ok(cat.tailBones.every(b=>cat.poseNodes().includes(b)));assert.ok(cat.tail.isSkinnedMesh);assert.equal(cat.root.userData.actor,'cat');
});
test('cat camera conservatively fits its current posed tail and limbs in desktop and narrow mobile framing',()=>{
 cat.reset();cat.activate();cat.update(8,8);
 for(const aspect of [1280/960,390/844,.30]){const view=cat.getView(aspect),camera=new THREE.PerspectiveCamera(view.fov,aspect,.01,100);camera.position.set(...view.position);camera.lookAt(new THREE.Vector3(...view.target));camera.updateMatrixWorld(true);
  const box=cat.bounds();for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`cropped cat at aspect ${aspect}: ${p.toArray()}`);}
 }
});
