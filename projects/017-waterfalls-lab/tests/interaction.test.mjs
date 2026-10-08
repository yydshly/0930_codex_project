import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BrushStroke,brushEdits} from '../src/stroke.js';
import {SourceUploadCache,DEFAULT_SOURCE_CONFIG} from '../src/sources.js';
import {createSimSlots,writeSimSlot} from '../src/sim-params.js';
import {GRID,DX} from '../src/world.js';
import {DEFAULT_SCENE,encodeProject,decodeProject} from '../src/project.js';
import {buildTerrainField,sampleField} from '../src/voxel.js';

const hit=x=>({point:[x,3,-1],normal:[0,1,0]});
test('fast and densely sampled pointer paths create the same evenly spaced brush sequence',()=>{
  const fast=new BrushStroke(hit(0),.5),slow=new BrushStroke(hit(0),.5),a=fast.sample(hit(2)),b=[];
  for(let x=.02;x<=2.00001;x+=.02)b.push(...slow.sample(hit(Math.min(2,x))));
  assert.equal(a.length,b.length);assert.ok(a.length>10);
  a.forEach((value,i)=>{assert.ok(Math.abs(value.point[0]-b[i].point[0])<1e-8);assert.ok(Math.abs(value.point[0]-(i+1)*.115)<1e-8);});
});
test('a fast cut stroke opens one continuous channel in the actual voxel collision field',()=>{
  const radius=.3,stroke=new BrushStroke(hit(0),radius),samples=[hit(0),...stroke.sample(hit(2))],before=buildTerrainField(0),after=buildTerrainField(0,brushEdits(samples,{op:'cut',radius}));
  for(let x=0;x<=1.9;x+=.05){const p=[x,3-.55*radius,-1];assert.ok(sampleField(before,p)<0);assert.ok(sampleField(after,p)>0,'solid gap at x='+x);}
});
test('stroke gaps and large jumps cannot join unrelated surfaces, and input normals remain independent',()=>{
  const first=hit(0),stroke=new BrushStroke(first,.5);first.point[0]=4;const samples=stroke.sample({point:[.5,3,-1],normal:[1,0,0]});
  assert.ok(samples.length>2);samples.forEach(p=>assert.ok(Math.abs(Math.hypot(...p.normal)-1)<1e-8));
  assert.deepEqual(stroke.sample(null),[]);assert.deepEqual(stroke.sample(hit(2)),[hit(2)]);assert.deepEqual(stroke.sample(hit(-5.5)),[hit(-5.5)]);
});
test('batched mirrored flattening keeps one level and every edit can be saved and restored',()=>{
  const scene=structuredClone(DEFAULT_SCENE),hits=[hit(.5),{point:[1,3.3,-1],normal:[.4,.8,.2]}];
  scene.edits=brushEdits(hits,{op:'flatten',radius:.5,strength:.8,mirror:true,level:2.9});
  assert.equal(scene.edits.length,4);assert.ok(scene.edits.every(e=>e.level===2.9&&e.strength===.8));
  assert.equal(scene.edits[1].center[0],-scene.edits[0].center[0]);assert.deepEqual(decodeProject(encodeProject(scene,null)).scene.edits,scene.edits);
  assert.equal(brushEdits([hit(0)],{op:'cut',radius:.5,mirror:true}).length,1);
});
test('unchanged sources reuse payload while global flow updates total without triggering upload',()=>{
  const scene=structuredClone(DEFAULT_SCENE),cache=new SourceUploadCache();scene.extraSources=[{...DEFAULT_SOURCE_CONFIG,position:[2,9,-2],power:3}];
  const first=cache.update(scene),data=first.data;assert.equal(first.changed,true);assert.equal(first.total,4);
  scene.flow=.25;const next=cache.update(scene);assert.equal(next.changed,false);assert.equal(next.data,data);assert.equal(next.total,1);
  scene.extraSources[0].enabled=false;assert.equal(cache.update(scene).changed,true);assert.equal(cache.update(scene).total,.25);
  scene.sourceConfig.enabled=false;assert.equal(cache.update(scene).total,0);assert.ok([...cache.update(scene).data].every(Number.isFinite));assert.equal(cache.update(scene,true).changed,true);
});
test('source cache notices in-place transforms, count changes, directions and forced resource rebuilds',()=>{
  const scene=structuredClone(DEFAULT_SCENE),cache=new SourceUploadCache();cache.update(scene);
  scene.source[0]=2;assert.equal(cache.update(scene).changed,true);assert.ok(Math.abs(cache.result.data[0]-(2/DX+GRID[0]/2))<1e-5);
  scene.sourceConfig.yaw=90;assert.equal(cache.update(scene).changed,true);
  scene.extraSources.push({...DEFAULT_SOURCE_CONFIG,position:[1,8,-2]});assert.equal(cache.update(scene).count,2);assert.equal(cache.update(scene).changed,false);
  assert.equal(cache.update(scene,true).changed,true);
});
test('reusable simulation blocks are byte-identical to the original WGSL uniform layout',()=>{
  const slots=createSimSlots(),scene=structuredClone(DEFAULT_SCENE);assert.equal(new Set(slots.map(s=>s.data)).size,12);
  for(const count of [8192,16384,24576,49152])for(let sub=0;sub<4;sub++)for(let iter=0;iter<3;iter++){
    const legacy=new ArrayBuffer(80),f=new Float32Array(legacy),u=new Uint32Array(legacy);
    u.set([...GRID,count],0);f.set([1/120,DX,scene.gravity,scene.viscosity],4);f.set([scene.source[0]/DX+GRID[0]/2,scene.source[1]/DX,scene.source[2]/DX+GRID[2]/2,1.75],8);u.set([100+sub,iter,iter===2?1:0,5],12);f.set([scene.flow,16384/count,0,0],16);
    assert.deepEqual(new Uint8Array(writeSimSlot(slots[sub*3+iter],scene,count,100+sub,iter,5,1.75)),new Uint8Array(legacy));
  }
});
test('smoothing saves new levels, preserves legacy appearance, and refuses invalid pass counts',()=>{
  const scene=structuredClone(DEFAULT_SCENE);scene.surfaceSmoothing=3;const doc=JSON.parse(encodeProject(scene,null));assert.equal(decodeProject(JSON.stringify(doc)).scene.surfaceSmoothing,3);
  delete doc.scene.surfaceSmoothing;assert.equal(decodeProject(JSON.stringify(doc)).scene.surfaceSmoothing,1);
  for(const invalid of [0,4,2.5,null]){doc.scene.surfaceSmoothing=invalid;assert.throws(()=>decodeProject(JSON.stringify(doc)));}
});
