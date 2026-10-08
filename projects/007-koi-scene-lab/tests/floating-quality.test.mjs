import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFloatAnchor} from '../src/floating-motion.js';
import {sampleGerstner,surfaceSampleAt} from '../src/water-motion.js';
import {waterTargetSizes} from '../src/water-quality.js';

test('float anchor moves in the prescribed wind direction with consistent timestep integration',()=>{
 const start={x:-.4,z:2},a=advanceFloatAnchor(start,1,.6);let b=start;
 for(let i=0;i<60;i++)b=advanceFloatAnchor(b,1/60,.6);
 assert.ok(Math.abs(a.x-b.x)<1e-12&&Math.abs(a.z-b.z)<1e-12);
 assert.ok(Math.abs(Math.hypot(a.x-start.x,a.z-start.z)-.006)<1e-12);
 assert.deepEqual(start,{x:-.4,z:2});
});
test('zero wind and zero time preserve the anchor; blocked drift cannot cross a bank',()=>{
 const a={x:0,z:0};assert.deepEqual(advanceFloatAnchor(a,3,0),a);
 assert.deepEqual(advanceFloatAnchor(a,0,1),a);
 assert.deepEqual(advanceFloatAnchor(a,1,1,x=>x<=0),a);
});
test('advected material coordinate and world height sample agree while horizontal orbit changes',()=>{
 let anchor={x:-.4,z:2.8},previous=sampleGerstner(anchor.x,anchor.z,0,.7).position,maxMotion=0;
 for(let i=1;i<=240;i++){anchor=advanceFloatAnchor(anchor,1/60,.7);const t=i/60,s=sampleGerstner(anchor.x,anchor.z,t,.7),back=surfaceSampleAt(s.position[0],s.position[2],t,.7);
  assert.ok(Math.hypot(back.x-anchor.x,back.z-anchor.z)<1e-10);
  assert.ok(Math.abs(back.height-(.02+s.position[1]))<1e-10);
  maxMotion=Math.max(maxMotion,Math.hypot(s.position[0]-previous[0],s.position[2]-previous[2]));}
 assert.ok(maxMotion>.025);
});
test('water transmission follows large canvas detail while distant reflection remains bounded',()=>{
 const s=waterTargetSizes(1140,1.5,4.7);assert.deepEqual(s.reflection,{width:512,height:341});
 assert.deepEqual(s.refraction,{width:1024,height:683});
 assert.equal(waterTargetSizes(360,1,4).refraction.width,512);
 assert.equal(waterTargetSizes(600,1.5,.5).refraction.width,1024);
});
test('water targets respect texture limits and cap extreme portrait allocation',()=>{
 for(const aspect of [.2,.7,1,4])for(const altitude of [.1,5]){const s=waterTargetSizes(3000,aspect,altitude,512);for(const t of Object.values(s))assert.ok(t.width<=512&&t.height<=512&&t.width>=128&&t.height>=128);}
 assert.throws(()=>waterTargetSizes(0,1,2));assert.throws(()=>waterTargetSizes(100,0,2));
});
