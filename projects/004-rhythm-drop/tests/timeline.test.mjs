import test from 'node:test';
import assert from 'node:assert/strict';
import { ballAt, beatAt, pointAt, duration, sceneAt } from '../src/timeline.mjs';
test('every musical beat lands precisely on its platform', () => {
  for (const bpm of [60,108,180]) for(let i=0;i<64;i++) {
    const beat = beatAt(i * 60 / bpm, bpm);
    const ball = ballAt(beat), platform = pointAt(i);
    assert.ok(Math.abs(ball.x-platform.x)<1e-8);
    assert.ok(Math.abs(ball.y-platform.y-.62)<1e-8);
    assert.ok(Math.abs(ball.z-platform.z)<1e-8);
  }
});
test('flight stays continuous across a beat and rises at its midpoint', () => {
  for(let i=0;i<64;i++) {
    const before=ballAt(i+1-1e-7), after=ballAt(i+1);
    assert.ok(Math.abs(before.y-after.y)<1e-5);
    const mid=ballAt(i+.5,3), a=pointAt(i), b=pointAt(i+1);
    assert.ok(Math.abs(mid.y-((a.y+b.y)/2+3.62))<1e-9);
  }
});
test('chapters switch on 16-beat boundaries and manual mode stays fixed', () => {
  assert.equal(sceneAt(15.99,0,true),0); assert.equal(sceneAt(16,0,true),1);
  assert.equal(sceneAt(32,0,true),2); assert.equal(sceneAt(48,0,true),0);
  assert.equal(sceneAt(32,1,false),1);
});
test('music duration is independent of manually calibrated BPM', () => {
  assert.equal(duration(120),32); assert.equal(duration(180,93.7),93.7);
});
