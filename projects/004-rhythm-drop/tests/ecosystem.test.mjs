import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,grow,stageOf,phraseNotes,absorb,fuse,cycleEvents,migrate,validateEcosystem} from '../src/ecosystem-model.mjs';
import {createPlant} from '../src/garden-model.mjs';
const water=seed('water',.25,.7,2,'a'),meadow=seed('meadow',.5,.7,1,'b'),air=seed('air',.75,.7,2,'c');
test('growth changes the audible phrase and persists through all stages',()=>{
  let p=water;for(let i=0;i<10;i++)p=grow(p);
  assert.equal(p.growth,9);assert.equal(stageOf(p),3);assert.equal(phraseNotes(water).length,2);assert.equal(phraseNotes(p).length,8);assert.equal(water.growth,0);
});
test('absorption keeps the host timbre and inherits the other melody without mutating parents',()=>{
  const original=JSON.stringify([water,air]);const change=absorb([water,air],'a','c');
  assert.equal(change.plants.length,1);assert.equal(change.result.id,'a');assert.deepEqual(change.result.mix,water.mix);assert.ok(change.result.notes.includes(air.notes[0]));assert.equal(change.result.mass,2);assert.equal(JSON.stringify([water,air]),original);
  assert.throws(()=>absorb([water,air],'a','a'));
});
test('fusion creates weighted timbre and a new identity; mixing retains individual plants',()=>{
  const change=fuse([water,meadow,air],'a','c','hybrid');assert.equal(change.plants.length,2);assert.deepEqual(change.result.mix,[{kind:'water',weight:.5},{kind:'air',weight:.5}]);assert.equal(change.result.generation,1);
  const events=cycleEvents([water,meadow,air]);assert.ok(events.some(e=>e.id==='a'&&e.step===0));assert.ok(events.some(e=>e.id==='b'&&e.step===0&&e.midi<60));assert.ok(events.some(e=>e.id==='c'&&e.step===1));
  assert.equal(cycleEvents([{...water,pattern:Array(8).fill(false)}]).length,0);
});
test('old garden files migrate without losing voices and new hybrid data round-trips',()=>{
  const old={format:'sound-garden',version:1,plants:[createPlant('water',.4,.7,1,'old')]};const before=JSON.stringify(old);const next=migrate(old);assert.equal(next.plants[0].growth,0);assert.deepEqual(next.plants[0].notes,old.plants[0].notes);assert.equal(JSON.stringify(old),before);
  const hybrid=fuse([water,air],'a','c','hybrid').result,file={format:'sound-garden-ecosystem',version:1,bpm:84,plants:[hybrid]};assert.deepEqual(validateEcosystem(JSON.parse(JSON.stringify(file))),file);
  assert.throws(()=>validateEcosystem({...file,plants:[{...hybrid,mix:[{kind:'water',weight:.1}]}]}));
});
