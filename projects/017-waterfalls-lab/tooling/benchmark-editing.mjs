import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {buildTerrainField,combineObjects,ObjectFieldCache} from '../src/voxel.js';
import {buildWorld} from '../src/world.js';
import {ObjectMeshCache} from '../src/object-mesh.js';

// CPU work only. These numbers do not measure browser frame rate or GPU time.
const count=300,steps=40,moving=[15,151,298],field=buildTerrainField(0);
const initial=Array.from({length:count},(_,i)=>({id:'o'+i,type:i%4?'rock':'mound',position:[(i%20-10)*.4,1+Math.floor(i/20)*.65,1.5],scale:[.45,.35,.5],rotation:i*.13}));
const selected=objects=>objects.map((o,i)=>({...o,selected:moving.includes(i)}));
buildWorld(0,'summer',selected(initial.slice(0,20)),true);combineObjects(field,initial.slice(0,20));
function measure(incremental){
  const objects=structuredClone(initial),collision=new ObjectFieldCache(),meshes=new ObjectMeshCache();
  let solid,mesh,vertexBytes=0;
  if(incremental){collision.update(field,objects,1);mesh=meshes.update(objects,moving).data.slice();}
  const start=performance.now();
  for(let step=0;step<steps;step++){
    moving.forEach(i=>{objects[i].position[0]+=.025;objects[i].position[2]-=.012;objects[i].rotation+=.008;});
    if(incremental){
      solid=collision.update(field,objects,1,moving).field;
      const update=meshes.update(objects,moving);for(const patch of update.patches){mesh.set(patch.data,patch.offset);vertexBytes+=patch.data.byteLength;}
    }else{solid=combineObjects(field,objects);mesh=buildWorld(0,'summer',selected(objects),true);vertexBytes+=mesh.byteLength;}
  }
  return {ms:performance.now()-start,solid,mesh,vertexBytes,staticBuilds:incremental?collision.staticBuilds-1:steps};
}
const full=measure(false),incremental=measure(true);assert.deepEqual(full.solid,incremental.solid);assert.deepEqual(full.mesh,incremental.mesh);
console.log(JSON.stringify({objects:count,movingObjects:moving.length,updates:steps,fullUpdateMs:+full.ms.toFixed(2),incrementalMs:+incremental.ms.toFixed(2),cpuRatio:+(full.ms/incremental.ms).toFixed(2),fullVertexBytes:full.vertexBytes,partialVertexBytes:incremental.vertexBytes,vertexReductionPercent:+((1-incremental.vertexBytes/full.vertexBytes)*100).toFixed(2),fullStaticBuilds:full.staticBuilds,incrementalStaticBuilds:incremental.staticBuilds,identicalCollision:true,identicalVerticesAndColors:true},null,2));
