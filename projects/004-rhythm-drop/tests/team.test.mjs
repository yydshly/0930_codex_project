import test from 'node:test';
import assert from 'node:assert/strict';
import {teamScore,teamState,teamSignals} from '../src/team-cues.mjs';
import {scoreFor,narrativeAt,stories} from '../src/stories.mjs';
import {directedPose} from '../src/direction.mjs';

test('the meeting develops from a question to a simpler prototype and a held outcome',()=>{
  assert.equal(stories[5].id,'team');
  for(const [beat,phase] of [[0,'brief'],[16,'complex'],[24,'simple'],[32,'prototype'],[48,'ready']]){
    assert.equal(teamState(beat).board,phase);
    assert.equal(directedPose(5,beat).x,teamState(beat).hero.x);
  }
  assert.match(narrativeAt(5,20).line,/妈妈/);assert.match(narrativeAt(5,32).line,/做出来/);
  assert.deepEqual(teamState(64),teamState(100));
});
test('the hesitation, reply and engineer support are distinct audible events',()=>{
  assert.equal(teamScore(20).filter(n=>n.role==='self').length,1);
  assert.equal(teamScore(22).filter(n=>n.role==='self').length,0);
  assert.deepEqual(teamScore(27).map(n=>n.role),['reply']);
  assert.ok(teamScore(32).some(n=>n.role==='bass'));
  for(const beat of [44,45,46,47])assert.deepEqual(teamScore(beat),[]);
  for(let i=0;i<64;i++)for(const n of scoreFor(5,i))assert.ok(teamSignals(n.role,i+n.offset).some(s=>s.onset===i+n.offset));
  assert.deepEqual(teamState(64).pulses,{self:0,reply:0,bass:0});
});
