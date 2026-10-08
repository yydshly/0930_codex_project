import test from 'node:test';
import assert from 'node:assert/strict';
import {GRID,DX,terrain,initialParticles,makeTerrainTexture,buildWorld} from '../src/world.js';
test('all presets initialize bounded, finite liquid states',()=>{
  for(let preset=0;preset<3;preset++){
    const data=initialParticles(8192,preset);assert.equal(data.length,8192*20);
    for(let i=0;i<data.length;i+=20){assert.ok([...data.subarray(i,i+20)].every(Number.isFinite));assert.ok(data[i]>=1&&data[i]<GRID[0]-1);assert.ok(data[i+1]>=0&&data[i+1]<GRID[1]-1);assert.ok(data[i+2]>=1&&data[i+2]<GRID[2]-1);assert.equal(data[i+3],1);}
    const h=makeTerrainTexture(preset);assert.equal(h.length,GRID[0]*GRID[2]);assert.ok([...h].every(Number.isFinite));assert.ok(Math.max(...h)<GRID[1]-2);
  }
});
test('terrain heightfield matches collision samples at all grid points',()=>{
  for(let preset=0;preset<3;preset++){const h=makeTerrainTexture(preset);for(let z=0;z<GRID[2];z++)for(let x=0;x<GRID[0];x++){assert.ok(Math.abs(h[z*GRID[0]+x]*DX-terrain((x-GRID[0]/2)*DX,(z-GRID[2]/2)*DX,preset))<1e-6);}}
});
test('forest and placed objects produce complete finite triangles with unit normals',()=>{
  const data=buildWorld(1,'autumn',[{type:'rock',position:[-.7,3.6,-.5],scale:[.63,.55,.6]}]);assert.equal(data.length%27,0);assert.ok(data.length>100000);
  for(let i=0;i<data.length;i+=9){assert.ok([...data.subarray(i,i+9)].every(Number.isFinite));const n=Math.hypot(data[i+3],data[i+4],data[i+5]);assert.ok(n<1e-5||Math.abs(n-1)<1e-5);for(let j=6;j<9;j++)assert.ok(data[i+j]>=0&&data[i+j]<=1);}
});
