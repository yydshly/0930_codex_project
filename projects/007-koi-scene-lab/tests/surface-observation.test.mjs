import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceWake,tailSource} from '../src/fish-wake.js';
import {waterPassDecision} from '../src/water-pass-policy.js';
import {sphereFitDistance} from '../src/camera-framing.js';
import {RippleField} from '../src/ripple-field.js';
const fish={x:0,y:-.03,z:0,heading:0,pitch:.14,size:.64,speed:.24,phase:5,amplitude:.05,bend:.08};
const view={world:[1,0,0,0,0,1,0,0,0,0,1,0,0,4,5,1],projection:[1,0,0,0,0,1,0,0,0,0,-1,-1,0,0,-.1,0],width:1200,height:800,altitude:4,frame:0,revision:0};

test('tail source follows spine phase and transforms equivariantly with heading and translation',()=>{
 const a=tailSource(fish),b=tailSource({...fish,x:2,z:3,heading:Math.PI/2});
 assert.ok(Math.abs(b.x-2-a.z)<1e-12&&Math.abs(b.z-3+a.x)<1e-12);
 assert.equal(a.y,b.y);assert.notEqual(a.z,tailSource({...fish,phase:fish.phase+1}).z);
});
test('surface coupling suppresses stopped/deep fish and decreases continuously with immersion',()=>{
 assert.equal(surfaceWake({...fish,speed:0},.02,.09),null);
 assert.equal(surfaceWake({...fish,y:-1},.02,.09),null);
 const shallow=surfaceWake(fish,.02,.09),deep=surfaceWake({...fish,y:-.10},.02,.09),slow=surfaceWake({...fish,speed:.08},.02,.09);
 assert.ok(shallow.strength>deep.strength&&shallow.strength>slow.strength);
 assert.ok(surfaceWake({...fish,speed:100},.02,.09).strength<=.006);
});
test('tail dipole uses opposite sources and flips sign with each half stroke',()=>{
 const a=surfaceWake(fish,.02,.09),b=surfaceWake({...fish,phase:fish.phase+Math.PI},.02,.09);
 assert.equal(a.impulses[0].amplitude+a.impulses[1].amplitude,0);
 assert.ok(Math.abs(a.impulses[0].amplitude+b.impulses[0].amplitude)<1e-12);
 assert.ok(a.radius>=.09*1.6);
});
test('paired wake produces both crests and troughs in the shared difference field',()=>{
 const f=new RippleField(128),a=surfaceWake({...fish,x:.5,z:.5,y:0,pitch:0,phase:5},.02,1/128);
 f.step(a.impulses.map(q=>({x:q.x,y:q.z,z:a.radius,w:q.amplitude})));
 assert.ok(Math.max(...f.height)>.0001&&Math.min(...f.height)<-.0001);
 assert.ok(Math.abs(f.height.reduce((x,y)=>x+y,0))<1e-6);
});
test('a stationary distant water pass is reused for only one intervening frame',()=>{
 assert.equal(waterPassDecision(view,null),'initial');
 assert.equal(waterPassDecision({...view,frame:1},view),'reuse');
 assert.equal(waterPassDecision({...view,frame:2},view),'cadence');
 assert.equal(waterPassDecision({...view,frame:1,altitude:.8},view),'near');
});
test('camera movement and projection changes refresh even on an otherwise skipped frame',()=>{
 const world=[...view.world];world[12]+=.001;assert.equal(waterPassDecision({...view,frame:1,world},view),'camera');
 const projection=[...view.projection];projection[0]+=.01;assert.equal(waterPassDecision({...view,frame:1,projection},view),'projection');
});
test('resize and explicit invalidation force fresh water targets immediately',()=>{
 assert.equal(waterPassDecision({...view,frame:1,width:900},view),'resize');
 assert.equal(waterPassDecision({...view,frame:1,revision:1},view),'invalidate');
});
test('unchanged continuously paused water reuses near and distant views across any frame count',()=>{
 for(const altitude of [.8,4]){const paused={...view,altitude,paused:true,content:'frozen pose'};assert.equal(waterPassDecision({...paused,frame:100},paused),'reuse');}
});
test('the first frozen frame and the first resumed frame refresh even within the active reuse cadence',()=>{
 const paused={...view,frame:1,paused:true,content:'frozen pose'};assert.equal(waterPassDecision(paused,view),'pause');assert.equal(waterPassDecision({...view,frame:2},paused),'resume');
});
test('paused reuse requires a known identical content signature',()=>{
 const paused={...view,paused:true,content:'pose A'};assert.equal(waterPassDecision({...paused,frame:1,content:'pose B'},paused),'content');
 for(const content of [null,undefined])assert.equal(waterPassDecision({...paused,content},{...paused,content}),'content');
});
test('camera, projection, viewport and revision invalidation remain mandatory for frozen water',()=>{
 const paused={...view,paused:true,content:'frozen pose'},world=[...view.world],projection=[...view.projection];world[12]+=.001;projection[0]+=.01;
 for(const [patch,reason]of [[{world},'camera'],[{projection},'projection'],[{width:900},'resize'],[{height:900},'resize'],[{revision:1},'invalidate']])assert.equal(waterPassDecision({...paused,frame:100,...patch},paused),reason);
});
test('sphere framing fits its angular silhouette in both desktop and portrait view fields',()=>{
 for(const aspect of [1.5,1,.55,.25]){const distance=sphereFitDistance(.5,45,aspect),angle=Math.asin(.5/distance),vertical=45*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*aspect);assert.ok(angle<vertical&&angle<horizontal);}
 assert.ok(sphereFitDistance(.5,45,.5)>sphereFitDistance(.5,45,1.5));
 assert.throws(()=>sphereFitDistance(.5,0,1));assert.throws(()=>sphereFitDistance(.5,45,0));
});
