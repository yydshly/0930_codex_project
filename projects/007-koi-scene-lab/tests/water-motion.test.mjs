import test from 'node:test';
import assert from 'node:assert/strict';
import {WAVE_COMPONENTS,sampleGerstner,surfaceHeightAt} from '../src/water-motion.js';
test('Gerstner analytic tangents agree with displaced surface finite differences',()=>{
 let cases=0,maxError=0;const e=1e-5;
 for(const wind of [0,.32,1])for(const t of [0,.7,3.2])for(let x=-3;x<=3;x+=.6)for(let z=-2;z<=2;z+=.4){
  const s=sampleGerstner(x,z,t,wind),xp=sampleGerstner(x+e,z,t,wind).position,xm=sampleGerstner(x-e,z,t,wind).position,zp=sampleGerstner(x,z+e,t,wind).position,zm=sampleGerstner(x,z-e,t,wind).position;
  for(let k=0;k<3;k++){maxError=Math.max(maxError,Math.abs((xp[k]-xm[k])/(2*e)-s.tangentX[k]),Math.abs((zp[k]-zm[k])/(2*e)-s.tangentZ[k]));}
  assert.ok(s.normal[1]>.90);assert.ok(Math.abs(s.normal.reduce((sum,n,i)=>sum+n*s.tangentX[i],0))<1e-12);cases++;
 }
 assert.ok(maxError<1e-7,`max derivative error ${maxError}`);console.log(JSON.stringify({waveDerivativeCases:cases,maxError}));
});
test('Floating surface height inverts the horizontal orbit of all four waves',()=>{
 for(const wind of [0,.32,1])for(const t of [0,1.2,8.5])for(let x=-4;x<4;x+=.7){
  const s=sampleGerstner(x,x*.37,t,wind),height=surfaceHeightAt(s.position[0],s.position[2],t,wind);
  assert.ok(Math.abs(height-(.02+s.position[1]))<1e-10);
 }
});
test('Wave parameters use gravity dispersion and remain below surface folding limit',()=>{
 assert.equal(WAVE_COMPONENTS.length,4);
 assert.ok(WAVE_COMPONENTS.every(w=>Math.abs(w.omega*w.omega-9.81*w.k)<1e-10));
 const maxSteepness=WAVE_COMPONENTS.reduce((sum,w)=>sum+.15*.012*w.amplitude*w.k,0);assert.ok(maxSteepness<1);
});
