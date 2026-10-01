import test from 'node:test';
import assert from 'node:assert/strict';
import {identityScore,identityPulse,identityState,identitySignals} from '../src/identity-cues.mjs';
import {scoreFor,stories} from '../src/stories.mjs';
import {directedPose} from '../src/direction.mjs';

test('the protagonist keeps a signature; the response first fills its rest',()=>{
  assert.deepEqual([0,1,2,3].map(i=>identityScore(i).map(n=>n.midi)),[[72],[74],[79],[]]);
  assert.ok(identityScore(2)[0].beats>identityScore(0)[0].beats);
  for(let i=0;i<27;i++)assert.equal(identityScore(i).filter(n=>n.role==='reply').length,0);
  assert.deepEqual(identityScore(27).map(n=>n.role),['reply']);
  assert.deepEqual(identityScore(35).map(n=>n.role),['reply','bass']);
  for(const i of [44,45,46,47])assert.deepEqual(identityScore(i),[]);
  assert.equal(stories[4].id,'identity');assert.deepEqual(scoreFor(4,27),identityScore(27));
  assert.deepEqual(scoreFor(2,27).map(n=>n.midi),[79]);assert.equal(scoreFor(2,27)[0].role,undefined);
});
test('visible responses use score onsets, including the passer-by offbeat',()=>{
  for(let i=0;i<64;i++)for(const n of identityScore(i)){
    const onset=i+n.offset;assert.ok(identityPulse(n.role,onset)>0);
    assert.ok(identitySignals(n.role,onset).some(s=>s.onset===onset&&s.age===0));
  }
  assert.equal(identityPulse('self',27),0);assert.equal(identityPulse('reply',27),1);
  assert.equal(identityPulse('visitor',17),0);assert.equal(identityPulse('visitor',17.5),1);
});
test('hesitation, complementary identities and final hold survive arbitrary seeking',()=>{
  assert.ok(identityState(21).hero.x>identityState(25).hero.x);
  assert.equal(identityState(26).answered,0);assert.ok(identityState(32).answered>0);
  assert.equal(identityState(34).supported,0);assert.ok(identityState(42).supported>0);
  const end=identityState(64);assert.deepEqual(end,identityState(68));
  assert.ok(Math.abs(end.hero.x)<1e-12);assert.notEqual(end.reply.x,end.bass.x);
  assert.deepEqual(end.pulses,{self:0,reply:0,bass:0,visitor:0});
  for(const beat of [0,16,27,35,48,64]){const state=identityState(beat),pose=directedPose(4,beat);assert.equal(pose.x,state.hero.x);assert.equal(pose.y,state.hero.y);}
});
