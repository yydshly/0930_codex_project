import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTerrainField,sampleField,combineObjects,raycastTerrain,buildTerrainMesh} from '../src/voxel.js';
import {DEFAULT_SCENE,encodeProject,decodeProject,editSnapshot} from '../src/project.js';

test('carving creates an internal cavity with a solid roof and floor, and restore closes it',()=>{
  const center=[2,3.8,-2.2],base=buildTerrainField(0),edits=[{op:'cut',center,radius:.9}],cut=buildTerrainField(0,edits);
  assert.ok(sampleField(base,center)<0);assert.ok(sampleField(cut,center)>2);
  assert.ok(sampleField(cut,[2,5.5,-2.2])<0);assert.ok(sampleField(cut,[2,2.2,-2.2])<0);
  const restored=buildTerrainField(0,[...edits,{op:'restore',center,radius:1.2}]);assert.ok(sampleField(restored,center)<0);
  const before=raycastTerrain(base,[2,3.8,-1.2],[0,0,-1]),after=raycastTerrain(cut,[2,3.8,-1.2],[0,0,-1]);
  assert.ok(before&&after);assert.ok(after.point[2]<before.point[2]-.8);
});
test('building can add a floating solid volume, independent of a heightfield',()=>{
  const center=[0,7.2,.8],base=buildTerrainField(0),added=buildTerrainField(0,[{op:'add',center,radius:.8}]);
  assert.ok(sampleField(base,center)>0);assert.ok(sampleField(added,center)<-2);assert.ok(sampleField(added,[0,5,.8])>0);
});
test('more than 16 objects all contribute to the shared collision field',()=>{
  const objects=Array.from({length:48},(_,i)=>({type:'rock',position:[-4.8+i%10*.96,11.04,-3.36+Math.floor(i/10)*.96],scale:[.35,.35,.35],rotation:0}));
  const field=combineObjects(buildTerrainField(0),objects);
  objects.forEach(o=>assert.ok(sampleField(field,o.position)<-.8));
});
test('carved surface mesh has finite vertices, unit normals and complete triangles',()=>{
  const field=buildTerrainField(0,[{op:'cut',center:[0,1.85,-1.1],radius:1.1}]),mesh=buildTerrainMesh(field);
  assert.ok(mesh.length>5000);assert.equal(mesh.length%27,0);
  for(let i=0;i<mesh.length;i+=9){assert.ok([...mesh.subarray(i,i+9)].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(mesh[i+3],mesh[i+4],mesh[i+5])-1)<1e-5);}
});
test('project roundtrip retains sculpting, transforms, spring, physics and camera; rejects broken geometry',()=>{
  const scene=structuredClone(DEFAULT_SCENE);scene.objects=[{id:'a',type:'rock',position:[1,3,0],scale:[.7,.4,1.1],rotation:.6}];scene.edits=[{op:'cut',center:[0,2,-1.1],radius:.8}];scene.source=[1,7,-2];scene.quality='ultra';scene.speed=.55;
  const camera={position:[10,9,15],target:[0,3,0]},doc=decodeProject(encodeProject(scene,camera,'我的溪谷'));
  assert.equal(doc.name,'我的溪谷');assert.deepEqual(doc.scene.edits,scene.edits);assert.deepEqual(doc.scene.source,scene.source);assert.equal(doc.scene.objects[0].rotation,.6);assert.equal(doc.scene.speed,.55);assert.deepEqual(doc.camera,camera);
  const saved=editSnapshot(scene);scene.edits[0].center[0]=5;assert.equal(saved.edits[0].center[0],0);
  assert.throws(()=>decodeProject('{"format":"waterfalls-lab","version":2,"scene":{"objects":[],"edits":[{"op":"cut","center":[0,2,0]}]}}'));
  const broken=JSON.parse(encodeProject(scene,camera));broken.scene.objects[0].scale[0]=null;assert.throws(()=>decodeProject(JSON.stringify(broken)));
});
