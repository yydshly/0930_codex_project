import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSettings,DEFAULTS,pondBoundary,isInPond,validateExperiment,EXPERIMENT_DEFAULTS} from '../src/config.js';
test('scene import validates ranges, finite numbers and known weather',()=>{
  assert.throws(()=>validateSettings({hour:99}));assert.throws(()=>validateSettings({wind:NaN}));
  assert.throws(()=>validateSettings({weather:'storm'}));assert.throws(()=>validateSettings({fishCount:'20'}));
  assert.equal(validateSettings({fishCount:8.6}).fishCount,9);assert.equal(validateSettings({}).clarity,DEFAULTS.clarity);
});
test('experiment weights validate independently and do not enter persisted scene settings',()=>{
 const base=validateExperiment({separation:0,collision:false});assert.equal(base.separation,0);assert.equal(base.collision,false);assert.equal(base.alignment,.4);
 assert.deepEqual(validateExperiment({},base),base);assert.deepEqual(EXPERIMENT_DEFAULTS,{separation:2.4,alignment:.4,cohesion:.22,collision:true});
 for(const value of [NaN,Infinity,-.01,5.01,'2'])assert.throws(()=>validateExperiment({cohesion:value}));
 assert.throws(()=>validateExperiment({collision:1}));assert.throws(()=>validateExperiment({unrelated:1}));assert.throws(()=>validateExperiment(null));
 assert.equal(Object.hasOwn(validateSettings({separation:4}),'separation'),false);assert.equal(Object.hasOwn(DEFAULTS,'collision'),false);
});
test('pond boundary remains outside safe swimming domain at different scales',()=>{
  for(const scale of [.65,1,1.25]){assert.ok(isInPond(-.5,0,scale));assert.ok(!isInPond(11,0,scale));
    for(let i=0;i<360;i++){const p=pondBoundary(i/360*Math.PI*2,scale);assert.ok(!isInPond(p.x,p.z,scale));}}
});
