import test from 'node:test';
import assert from 'node:assert/strict';
import {rainCues} from '../src/rain-cues.mjs';
import {scoreFor} from '../src/stories.mjs';
import {directedPose} from '../src/direction.mjs';
test('water impacts share every bell onset, including offbeats, with the score',()=>{
  for(let beat=0;beat<64;beat++)for(const note of scoreFor(3,beat))if(note.type==='bell'){
    const at=beat+note.offset,cues=rainCues(at);
    assert.ok(cues.impacts.some(hit=>hit.at===at&&hit.midi===note.midi&&hit.age===0));
  }
  assert.ok(!rainCues(7.49).impacts.some(hit=>hit.at===7.5));
  assert.ok(rainCues(7.5).impacts.some(hit=>hit.at===7.5));
});
test('rain gives way to silence and light; seeking produces the same composition',()=>{
  assert.equal(rainCues(0).rain,1);assert.equal(rainCues(50).rain,0);
  assert.equal(rainCues(56).opening,1);assert.equal(rainCues(58).release,1);
  for(const beat of [44,45,46,47])assert.deepEqual(scoreFor(3,beat),[]);
  const before=rainCues(24);rainCues(64);assert.deepEqual(rainCues(24),before);
  assert.deepEqual(rainCues(64),rainCues(80));
  assert.equal(directedPose(3,0).z,directedPose(3,12).z);
  for(const beat of [12,56,64]){const a=directedPose(3,beat-1e-6),b=directedPose(3,beat);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);}
});
