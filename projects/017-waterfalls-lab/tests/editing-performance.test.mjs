import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TerrainFieldCache,ObjectFieldCache,combineObjects} from '../src/voxel.js';
import {ObjectMeshCache} from '../src/object-mesh.js';
import {buildWorld,objectMeshSize} from '../src/world.js';

const objects=()=>Array.from({length:9},(_,i)=>({id:'o'+i,type:i%3?'rock':'mound',position:[(i%3-1)*1.2,3+Math.floor(i/3)*.6,.5],scale:[.55,.4,.6],rotation:i*.3}));
const terrain=new TerrainFieldCache();terrain.update(0,[]);
const expectedMesh=(list,selection)=>buildWorld(0,'summer',list.map((o,i)=>({...o,selected:selection.includes(i)})),true);
function patchMesh(mesh,update){if(update.rebuilt)return update.data.slice();for(const p of update.patches)mesh.set(p.data,p.offset);return mesh;}

test('group drag collision cache matches full union and rebuilds the static volume only once',()=>{
  const list=objects(),cache=new ObjectFieldCache(),indices=[1,4,7];let field;
  for(let step=0;step<12;step++){
    indices.forEach(i=>{list[i].position[0]+=.07;list[i].position[2]-=.025;});
    const result=cache.update(terrain.field,list,terrain.revision,indices);
    assert.deepEqual(result.field,combineObjects(terrain.field,list));assert.equal(result.staticRebuilt,step===0);assert.equal(result.changed,true);
    if(field)assert.equal(result.field,field);field=result.field;
  }
  assert.equal(cache.staticBuilds,1);assert.equal(cache.update(terrain.field,list,terrain.revision,indices).changed,false);
});

test('collision baseline invalidates after in-place terrain edits, undo, branches and preset changes',()=>{
  const tc=new TerrainFieldCache(),cache=new ObjectFieldCache(),list=objects(),edit={op:'cut',center:[0,3,.5],radius:1};tc.update(0,[]);
  cache.update(tc.field,list,tc.revision,[1]);const original=tc.field,revision=tc.revision;
  tc.update(0,[edit]);assert.equal(tc.field,original);assert.ok(tc.revision>revision);
  for(const [preset,edits] of [[0,[edit]],[0,[]],[0,[{...edit,op:'add'}]],[2,[]]]){
    tc.update(preset,edits);assert.deepEqual(cache.update(tc.field,list,tc.revision,[1]).field,combineObjects(tc.field,list));
  }
  const same=tc.revision;tc.update(2,[]);assert.equal(tc.revision,same);assert.equal(cache.update(tc.field,list,tc.revision,[1]).changed,false);
});

test('collision cache handles overlapping geometry, mutations, deletion and moving group changes without ghosts',()=>{
  const list=objects(),cache=new ObjectFieldCache();list[1].position=[...list[0].position];
  const verify=indices=>assert.deepEqual(cache.update(terrain.field,list,terrain.revision,indices).field,combineObjects(terrain.field,list));
  verify([0]);list[0].position[0]+=1;verify([0]);list[4].scale[0]=1.1;list[4].rotation=.8;verify([0]);
  verify([0,4]);list.splice(0,1);verify([0,3]);list.reverse();verify([1]);list.push({...structuredClone(list[0]),id:'new'});verify([]);
  list.length=0;verify([]);assert.deepEqual(cache.field,terrain.field);
});

test('partial mesh updates preserve every original face color and vertex across mixed types and selection',()=>{
  const list=objects(),cache=new ObjectMeshCache();let selection=[1,7],mesh=patchMesh(null,cache.update(list,selection));
  assert.deepEqual(mesh,expectedMesh(list,selection));assert.equal(cache.floatLength,list.reduce((n,o)=>n+objectMeshSize(o).floats,0));
  for(let step=0;step<6;step++){
    list[7].position[0]+=.1;list[7].rotation+=.12;list[1].scale[1]+=.02;
    const update=cache.update(list,selection);assert.equal(update.rebuilt,false);assert.equal(update.patches.length,2);assert.equal(update.patches[0].offset,objectMeshSize(list[0]).floats);
    mesh=patchMesh(mesh,update);assert.deepEqual(mesh,expectedMesh(list,selection));
  }
  selection=[0,2,3,7];mesh=patchMesh(mesh,cache.update(list,selection));assert.deepEqual(mesh,expectedMesh(list,selection));
  assert.equal(cache.update(list,selection).changed,false);
});

test('adjacent mesh edits coalesce uploads, including moving or selecting every object',()=>{
  const list=objects(),cache=new ObjectMeshCache();let mesh=patchMesh(null,cache.update(list));
  list.forEach(o=>o.position[2]+=.2);let update=cache.update(list);assert.equal(update.patches.length,1);assert.equal(update.patches[0].offset,0);assert.equal(update.patches[0].data.length,mesh.length);
  mesh=patchMesh(mesh,update);assert.deepEqual(mesh,expectedMesh(list,[]));
  const selection=list.map((o,i)=>i);update=cache.update(list,selection);assert.equal(update.patches.length,1);mesh=patchMesh(mesh,update);assert.deepEqual(mesh,expectedMesh(list,selection));
});

test('object mesh layout resets offsets and deterministic colors on append, reorder, deletion and type changes',()=>{
  const list=objects(),cache=new ObjectMeshCache();let mesh=patchMesh(null,cache.update(list));
  const verify=()=>{const result=cache.update(list,[1]);assert.equal(result.rebuilt,true);mesh=patchMesh(mesh,result);assert.deepEqual(mesh,expectedMesh(list,[1]));};
  list.push({...structuredClone(list[0]),id:'new'});verify();list.reverse();verify();list.splice(2,1);verify();list[0].type='rock';verify();list.length=0;verify();assert.equal(mesh.length,0);assert.equal(cache.update([],null).changed,false);
});
