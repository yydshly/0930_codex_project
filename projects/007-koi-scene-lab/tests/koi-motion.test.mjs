import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spineOffset,spineSlope,spineNormal,KOI_SPINE_GLSL} from '../src/koi-motion.js';

test('analytic traveling-wave and turn-bend slope matches central differences',()=>{
 let maxError=0,count=0;
 for(const phase of [0,.7,Math.PI,5.4])for(const amp of [0,.025,.075])for(const bend of [-.2,0,.2]){
  for(let i=0;i<=200;i++){
   const x=-.8+i*.005,h=1e-7,numerical=(spineOffset(x+h,phase,amp,bend)-spineOffset(x-h,phase,amp,bend))/(2*h);
   maxError=Math.max(maxError,Math.abs(numerical-spineSlope(x,phase,amp,bend)));count++;
  }
 }
 assert.ok(maxError<2e-6,`maximum derivative error ${maxError}`);
 console.log(`Spine derivative: ${count} cases, maximum error ${maxError}`);
});

test('mouth and anterior body receive no traveling-wave or turn displacement',()=>{
 for(const x of [-.02,0,.25,.5,.53]){
  assert.equal(spineOffset(x,1.2,.075,.2),0);
  assert.equal(Math.abs(spineSlope(x,1.2,.075,.2)),0);
 }
});

test('inverse-transpose normal stays perpendicular to deformed tangents',()=>{
 const x=-.31,phase=1.4,amp=.06,bend=.12,h=1e-6;
 const dz=(spineOffset(x+h,phase,amp,bend)-spineOffset(x-h,phase,amp,bend))/(2*h);
 const n=[-spineSlope(x,phase,amp,bend),0,1];
 assert.ok(Math.abs(n[0]+n[2]*dz)<1e-8);
 assert.equal(n[1],0);
 assert.ok(KOI_SPINE_GLSL.includes('n.x-koiSpineSlope(x)*n.z'));
});

test('a traveling-wave crest moves from positive-x head toward negative-x tail',()=>{
 // Search actual offsets in the constant-amplitude caudal envelope so its
 // gradient cannot shift the measured crest. Only one crest lies in this range.
 const crest=phase=>{let peak=-Infinity,xPeak=0;
  for(let i=0;i<=1400;i++){const x=-.8+i*.0002,y=spineOffset(x,phase,1);
   if(y>peak){peak=y;xPeak=x;}}
  return xPeak;
 };
 const phase=Math.PI/2+7*.68,initial=crest(phase),advanced=crest(phase+.35);
 assert.ok(Math.abs(initial+.68)<.0003,`initial crest ${initial}`);
 assert.ok(advanced<initial,`crest traveled toward head: ${initial} -> ${advanced}`);
 assert.ok(Math.abs((advanced-initial)+.05)<.0003,`crest displacement ${advanced-initial}`);
});

test('normal-correction experiment preserves shape while toggling the inverse transpose',()=>{
 const x=-.3,phase=.8,amplitude=.055,bend=.1,normal=[0,0,1];
 const corrected=spineNormal(normal,x,phase,amplitude,bend,1),uncorrected=spineNormal(normal,x,phase,amplitude,bend,0);
 assert.deepEqual(uncorrected,normal);
 assert.ok(Math.abs(corrected[0])>.05);
 const tangent=[1,0,spineSlope(x,phase,amplitude,bend)];
 assert.ok(Math.abs(corrected[0]*tangent[0]+corrected[2]*tangent[2])<1e-12);
 assert.ok(Math.abs(uncorrected[2]*tangent[2])>.05);
});
