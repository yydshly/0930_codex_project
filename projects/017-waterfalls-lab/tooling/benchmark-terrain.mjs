import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {buildTerrainField,TerrainFieldCache} from '../src/voxel.js';

const edits=Array.from({length:120},(_,i)=>({op:i%4===0?'add':'cut',center:[Math.sin(i*.17)*1.8,3+Math.cos(i*.11)*.6,-1.4+i%12*.08],radius:.85}));
buildTerrainField(0,edits.slice(0,10));
function measure(incremental){
  const start=performance.now(),cache=new TerrainFieldCache();let field,applied=0;
  for(let n=1;n<=edits.length;n++){field=incremental?cache.update(0,edits.slice(0,n)):buildTerrainField(0,edits.slice(0,n));applied+=incremental?cache.applied:n;}
  return {ms:performance.now()-start,applied,field};
}
const full=measure(false),incremental=measure(true);assert.deepEqual(full.field,incremental.field);
console.log(JSON.stringify({strokes:edits.length,fullReplayMs:+full.ms.toFixed(2),incrementalMs:+incremental.ms.toFixed(2),ratio:+(full.ms/incremental.ms).toFixed(2),fullBrushApplications:full.applied,incrementalBrushApplications:incremental.applied,identical:true},null,2));
