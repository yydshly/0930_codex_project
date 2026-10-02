import test from 'node:test';
import assert from 'node:assert/strict';
import {DURATION,score,chapterAt,positionAt,childState,jumpAt} from '../src/children-story.mjs';
test('the invitation has an actual musical rest, then a response and a shared cadence',()=>{
  assert.equal(DURATION,50);assert.equal(score.filter(n=>n.beat>=28&&n.beat<32).length,0);
  assert.ok(score.some(n=>n.role==='mumu'&&n.beat>=32&&n.beat<36));
  assert.ok(score.some(n=>n.role==='he'&&n.beat>36&&n.beat<40));
  assert.deepEqual([...new Set(score.filter(n=>n.beat===76).map(n=>n.role))].sort(),['dou','he','mai','mumu']);
  assert.equal(chapterAt(31.9).at,16);assert.equal(chapterAt(32).at,32);assert.equal(chapterAt(80).at,64);
});
test('the child who was welcomed returns to welcome the next child',()=>{
  assert.equal(childState('dou',63.9).visible,false);assert.equal(childState('dou',64).visible,true);
  assert.equal(childState('he',34).beckon,true);assert.equal(childState('mumu',69).beckon,true);
  assert.ok(positionAt('mumu',68).x<positionAt('mumu',64).x);
  assert.ok(positionAt('dou',76).x>positionAt('dou',68).x);
  for(const role of ['mumu','he','mai','dou'])assert.equal(childState(role,80).celebrate,true);
});
test('flights land on authored musical onsets and arbitrary seeking has a stable ending',()=>{
  for(const n of score)if(n.type!=='pad')assert.ok(Math.abs(jumpAt(n.role,n.beat))<1e-10);
  for(const role of ['mumu','he','mai','dou']){
    for(let b=0;b<=80;b+=.037){const s=childState(role,b);assert.ok([s.x,s.y,s.z,s.pulse].every(Number.isFinite));assert.ok(s.y>=-1e-10);}
    assert.deepEqual(childState(role,80),childState(role,800));assert.equal(jumpAt(role,80),0);
    assert.deepEqual(childState(role,51.3),childState(role,51.3));
  }
});
