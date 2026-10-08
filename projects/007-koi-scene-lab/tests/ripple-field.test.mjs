import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RippleField,RIPPLE_CONSTANTS} from '../src/ripple-field.js';
import {surfaceSampleAt,sampleGerstner,surfaceHeightAt} from '../src/water-motion.js';
const impulse=(x,y,w=.035,z=.10)=>({x,y,z,w});
test('a centred impulse is radial and the next stencil propagates height to its neighbours',()=>{
 const f=new RippleField(9);f.step([impulse(.5,.5,.035,.035)]);const center=4*9+4,h=f.height[center];assert.ok(Math.abs(h-.035)<1e-8);
 assert.equal(f.height[center-1],f.height[center+1]);assert.equal(f.height[center-9],f.height[center+9]);f.step();assert.ok(f.height[center]<h);assert.ok(f.height[center+1]>0);assert.ok(f.velocity[center+1]>0);
});
test('bank mask keeps land exactly dry and the stencil reflects instead of draining into it',()=>{
 const mask=new Uint8Array(25*4);for(let i=0;i<25;i++)mask[i*4]=i%5<3?255:0;const f=new RippleField(5,mask);
 for(let i=0;i<25;i++)if(f.wet(i))f.height[i]=.025;f.step();assert.equal(f.velocity[2+2*5],0);
 f.step([impulse(.7,.5)]);for(let i=0;i<25;i++)if(!f.wet(i)){assert.equal(f.height[i],0);assert.equal(f.velocity[i],0);}
});
test('sampling uses the same pixel-centre bilinear convention as the GPU texture',()=>{
 const f=new RippleField(2);f.height.set([0,.02,.04,.06]);assert.ok(Math.abs(f.sample(.5,.5)-.03)<1e-8);assert.equal(f.sample(.25,.25),0);assert.ok(Math.abs(f.sample(1,1)-.06)<1e-8);assert.equal(f.sample(-.1,.5),0);assert.equal(f.sample(NaN,.5),0);
});
test('fixed impulse schedule reproduces identical height and velocity fields',()=>{
 const a=new RippleField(32),b=new RippleField(32);for(let i=0;i<120;i++){const q=i%30===0?[impulse(.4,.6)]:[];a.step(q);b.step(q);}assert.deepEqual(a.height,b.height);assert.deepEqual(a.velocity,b.velocity);
});
test('height and velocity remain bounded for a strong repeated disturbance',()=>{
 const f=new RippleField(32);for(let i=0;i<180;i++){f.step(i<10?[impulse(.5,.5,.8)]:[]);assert.ok(f.height.every(h=>Number.isFinite(h)&&Math.abs(h)<=RIPPLE_CONSTANTS.maxHeight+1e-8));assert.ok(f.velocity.every(v=>Number.isFinite(v)&&Math.abs(v)<=RIPPLE_CONSTANTS.maxVelocity+1e-8));}
});
test('reset clears both ping-pong buffers and subsequent samples',()=>{
 const f=new RippleField(16);f.step([impulse(.5,.5)]);f.step();f.reset();assert.ok([f.height,f.velocity,f.nextHeight,f.nextVelocity].every(a=>a.every(v=>v===0)));assert.equal(f.sample(.5,.5),0);
});
test('rest-coordinate inverse sampling keeps local ripples aligned with Gerstner displacement',()=>{
 for(const [x,z,time,wind]of [[0,0,0,.3],[1.3,-.7,2,1],[-2.1,3.2,4.8,.7]]){const s=surfaceSampleAt(x,z,time,wind),g=sampleGerstner(s.x,s.z,time,wind);assert.ok(Math.abs(g.position[0]-x)<1e-10&&Math.abs(g.position[2]-z)<1e-10);assert.equal(s.height,surfaceHeightAt(x,z,time,wind));}
});
