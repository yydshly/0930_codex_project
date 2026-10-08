import test from 'node:test';
import assert from 'node:assert/strict';
import {stepSpring, stiffnessFor, tangentialForce, fiberPoints, FIXED_STEP, stepBounce} from '../src/physics.js';

test('fiber root remains attached and bending preserves each segment length',()=>{
  for(const bend of [[0,0,0],[1.2,-.8,.3],[-1,1.6,.9]]){
    const root=[.5,.8,-.3],points=fiberPoints(root,[0,1,0],bend,.28);
    assert.deepEqual(points[0],root);
    let arc=0;
    for(let i=1;i<points.length;i++){const length=Math.hypot(...points[i].map((v,j)=>v-points[i-1][j]));assert.ok(Math.abs(length-.28/6)<1e-12);arc+=length}
    assert.ok(Math.abs(arc-.28)<1e-12);
  }
});
test('a touch-induced displacement returns to rest with damping',()=>{
  const position=[.8,-.2,.3],velocity=[0,0,0];
  for(let i=0;i<1200;i++)stepSpring(position,velocity,[0,0,0],stiffnessFor(.2,.5));
  assert.ok(Math.hypot(...position)<1e-8);
  assert.ok(Math.hypot(...velocity)<1e-8);
});
test('longer and softer fibers bend more under the same load',()=>{
  const equilibrium=(length,rigidity)=>{const p=[0,0,0],v=[0,0,0],k=stiffnessFor(length,rigidity);for(let i=0;i<2400;i++)stepSpring(p,v,[12,0,0],k);assert.ok(Math.abs(p[0]-12/k)<1e-8);return p[0]};
  assert.ok(equilibrium(.28,.5)>equilibrium(.05,.5));
  assert.ok(equilibrium(.2,.2)>equilibrium(.2,.9));
});
test('guide forces remain tangent to the surface',()=>{
  const n=[.6,.8,0],force=tangentialForce([2,-3,1],n);
  assert.ok(Math.abs(force.reduce((sum,v,i)=>sum+v*n[i],0))<1e-12);
});
test('fixed-step simulation is independent of rendering frame rate',()=>{
  function run(rate){let acc=0,p=[0,0,0],v=[0,0,0];for(let frame=0;frame<rate*2;frame++){acc+=1/rate;while(acc+1e-12>=FIXED_STEP){stepSpring(p,v,[8,0,0],40);acc-=FIXED_STEP}}return p}
  const low=run(30),high=run(144);
  for(let axis=0;axis<3;axis++)assert.ok(Math.abs(low[axis]-high[axis])<1e-10);
});
test('strong forces remain bounded and finite',()=>{
  const p=[0,0,0],v=[0,0,0];for(let i=0;i<10000;i++){stepSpring(p,v,[10000,-9000,8000],20);assert.ok(p.every(Number.isFinite));assert.ok(Math.hypot(...p)<=1.600000001)}
});
test('gravity bounce respects the floor, loses energy, and settles',()=>{
  let h=.001,v=3.1,lastImpact=Infinity,landings=0;
  for(let i=0;i<1200;i++){
    const state=stepBounce(h,v);h=state.height;v=state.velocity;
    assert.ok(h>=0);
    if(state.impact){assert.ok(state.impact<lastImpact);lastImpact=state.impact;landings++;}
  }
  assert.ok(landings>=2);assert.equal(h,0);assert.equal(v,0);
});
