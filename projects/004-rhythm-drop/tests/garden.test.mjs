import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlant,gardenKinds,validateGarden,serializeGarden} from '../src/garden-model.mjs';
test('gesture duration extends a bounded phrase without changing its earlier notes',()=>{
  for(const kind of Object.keys(gardenKinds)){
    const short=createPlant(kind,.3,.6,0,'a'),long=createPlant(kind,.3,.6,3,'a');
    assert.deepEqual(short.notes,long.notes.slice(0,2));assert.equal(long.notes.length,6);
    assert.deepEqual(createPlant(kind,-1,100,99,'a'),createPlant(kind,.08,.88,3,'a'));
  }
});
test('garden files preserve every position and phrase and reject corrupt records',()=>{
  const plants=Object.keys(gardenKinds).map((kind,i)=>createPlant(kind,.2+i*.25,.7,2,`seed-${i}`));
  const file=JSON.parse(serializeGarden(plants));assert.deepEqual(validateGarden(file).plants,plants);
  for(const change of [{version:2},{plants:[plants[0],plants[0]]},{plants:[{...plants[0],notes:[1,2]}]},{plants:Array.from({length:25},(_,i)=>({...plants[0],id:String(i)}))}])assert.throws(()=>validateGarden({...file,...change}));
  assert.throws(()=>createPlant('missing',.5,.7));
});
