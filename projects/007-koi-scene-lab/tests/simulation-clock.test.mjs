import test from 'node:test';
import assert from 'node:assert/strict';
import {SimulationClock} from '../src/simulation-clock.js';

test('5/20/60/120 Hz render schedules advance exactly the same fixed ticks',()=>{
 const states=[];for(const fps of [5,20,60,120]){const clock=new SimulationClock();let phase=0,velocity=.13,position=0;for(let i=0;i<fps*10;i++)clock.advance(1/fps,dt=>{phase+=dt;velocity+=(Math.sin(phase)*.1-velocity*.2)*dt;position+=velocity*dt;});assert.equal(clock.totalSteps,600);assert.equal(clock.droppedSeconds,0);states.push([phase,velocity,position]);}
 states.forEach(s=>assert.deepEqual(s,states[0]));
});
test('sub-tick render frames retain fractional time and expose interpolation alpha',()=>{
 const c=new SimulationClock();let count=0;const a=c.advance(1/120,()=>count++);assert.equal(a.steps,0);assert.equal(a.alpha,.5);const b=c.advance(1/120,()=>count++);assert.equal(b.steps,1);assert.equal(b.alpha,0);assert.equal(count,1);
});
test('pause and inactive intervals clear fractional backlog without replaying it',()=>{
 const c=new SimulationClock();let count=0;c.advance(1/120,()=>count++);c.advance(20,()=>count++,{enabled:false});assert.equal(c.accumulator,0);assert.equal(c.droppedSeconds,0);const r=c.advance(1/60,()=>count++);assert.equal(r.steps,1);assert.equal(count,1);
});
test('a long stall has bounded work and explicitly accounts for discarded time',()=>{
 const c=new SimulationClock();let simulated=0;const r=c.advance(20,dt=>simulated+=dt);assert.equal(r.steps,12);assert.ok(Math.abs(simulated-.2)<1e-12);assert.ok(Math.abs(r.droppedSeconds-19.8)<1e-12);assert.equal(c.accumulator,0);assert.equal(c.advance(1/60,()=>{}).steps,1);
});
test('reset restores clock counters and invalid durations fail before ticking',()=>{
 const c=new SimulationClock();c.advance(1,()=>{});c.reset();assert.equal(c.totalSteps,0);assert.equal(c.droppedSeconds,0);assert.equal(c.accumulator,0);for(const dt of [NaN,Infinity,-1])assert.throws(()=>c.advance(dt,()=>{throw new Error('must not tick');}));
});
test('advancement rate reports active realtime ticks, drops, and reset without including paused time',()=>{
 const c=new SimulationClock();assert.equal(c.advancementRate,null);c.advance(1/60,()=>{});assert.equal(c.advancementRate,1);
 c.advance(1,()=>{});const activeTime=c.inputSeconds;assert.ok(Math.abs(c.advancementRate-(13/60)/(61/60))<1e-12);
 c.advance(100,()=>{throw new Error('paused must not tick');},{enabled:false});assert.equal(c.inputSeconds,activeTime);
 c.reset();assert.equal(c.inputSeconds,0);assert.equal(c.advancementRate,null);
});
