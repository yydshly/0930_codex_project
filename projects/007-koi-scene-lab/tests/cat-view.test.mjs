import test from 'node:test';
import assert from 'node:assert/strict';
import {catObservationView} from '../src/cat-view.js';

test('cat observer stays on the foreground side and looks back into the garden across the route',()=>{
 for(const x of [2.45,3.3,4.15])for(const z of [6.3,6.6,6.9])for(const aspect of [.30,.68,1.5]){
  const center={x,y:.26,z},view=catObservationView({center,radius:.46},aspect);
  assert.ok(view.position[2]>z,'camera cannot orbit to the pond side as the cat turns');
  assert.ok(view.target[2]<z,'composition includes space toward the garden');
  assert.ok(view.position[1]>.26);assert.ok(view.position[0]>view.target[0]);
  assert.ok(view.position.every(Number.isFinite));assert.equal(view.fov,52);
 }
});

test('cat contextual framing keeps narrower displays farther away and the garden bias bounded',()=>{
 const sphere={center:{x:2.45,y:.26,z:6.6},radius:.46},desktop=catObservationView(sphere,1.5),mobile=catObservationView(sphere,.4);
 const distance=v=>Math.hypot(...v.position.map((p,i)=>p-v.target[i]));
 assert.ok(distance(mobile)>distance(desktop));assert.deepEqual(desktop.target,mobile.target);
 assert.ok(Math.hypot(...desktop.target.map((p,i)=>p-[sphere.center.x,sphere.center.y,sphere.center.z][i]))<.4);
 const a=desktop.position.map((p,i)=>(p-desktop.target[i])/distance(desktop)),b=mobile.position.map((p,i)=>(p-mobile.target[i])/distance(mobile));
 for(let i=0;i<3;i++)assert.ok(Math.abs(a[i]-b[i])<1e-12);
});
