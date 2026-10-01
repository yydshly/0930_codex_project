import test from 'node:test';
import assert from 'node:assert/strict';
import {directedPose} from '../src/direction.mjs';
test('opening rests, farewell hesitation, and the long leap belong to story time',()=>{
  assert.equal(directedPose(0,0).z,directedPose(0,5).z);
  assert.equal(directedPose(1,30).z,directedPose(1,31.9).z);
  assert.ok(directedPose(1,34).y>directedPose(1,32).y+3);
  for(const beat of [6,30,32,36,64])for(const story of [0,1]){
    const a=directedPose(story,beat-1e-6),b=directedPose(story,beat);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);
  }
});
test('brand stays in the composition and all endings stop moving',()=>{
  for(const beat of [0,16,32,48,64])assert.equal(directedPose(2,beat).z,0);
  for(const story of [0,1,2,3,4])assert.deepEqual(directedPose(story,64),directedPose(story,68));
});
