import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EXPERIMENT_DEFAULTS,validateExperiment,experimentDuration,trajectorySignature} from '../src/experiment-config.js';
test('partial experiment edits retain v5 defaults and independently control overlays',()=>{
 const p=validateExperiment({alignment:0,overlay:{collision:true}});
 assert.equal(p.separation,2.4);assert.equal(p.cohesion,.22);assert.equal(p.collision,true);assert.equal(p.normalCorrection,true);
 assert.deepEqual(p.overlay,{vectors:false,collision:true});assert.deepEqual(EXPERIMENT_DEFAULTS.overlay,{vectors:false,collision:false});
});
test('invalid edits reject without modifying the previous experiment',()=>{
 const current=validateExperiment();
 for(const patch of [{separation:NaN},{alignment:-.01},{cohesion:5.1},{collision:'false'},{normalCorrection:0},{waterDebug:'depth'},{overlay:{forces:true}},{overlay:[]}])assert.throws(()=>validateExperiment(patch,current));
 assert.deepEqual(current,EXPERIMENT_DEFAULTS);
});
test('replay duration is bounded and trajectory signature distinguishes observed movement',()=>{
 assert.equal(experimentDuration(8),8);for(const v of [0,21,Infinity,'8'])assert.throws(()=>experimentDuration(v));
 const fish=[{position:[1,2,3],heading:.4,speed:.2,phase:1}];assert.equal(trajectorySignature(fish),trajectorySignature(structuredClone(fish)));
 assert.notEqual(trajectorySignature(fish),trajectorySignature([{...fish[0],position:[1.01,2,3]}]));
});
