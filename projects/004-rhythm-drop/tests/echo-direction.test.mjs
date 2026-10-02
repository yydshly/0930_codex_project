import test from 'node:test';
import assert from 'node:assert/strict';
import {directEpisode,noteMotion} from '../src/echo-direction.mjs';

test('attention follows the source and changes to the newcomer before their answer',()=>{
  const listening=directEpisode({phase:'listening',elapsed:2}),rush=directEpisode({phase:'crowded',elapsed:1}),quiet=directEpisode({phase:'rest',elapsed:1,holding:1});
  assert.ok(listening.kong.look<0);assert.equal(listening.kong.gesture,'listen');assert.equal(rush.kong.emotion,'embarrassed');assert.equal(rush.kong.gesture,'tuck');assert.equal(quiet.kong.emotion,'calm');
  assert.equal(directEpisode({phase:'accepted',elapsed:0}).friendVisible,false);
  const peek=directEpisode({phase:'accepted',elapsed:.5}),arrival=directEpisode({phase:'accepted',elapsed:2.1}),answer=directEpisode({phase:'accepted',elapsed:2.5});
  assert.ok(peek.friend.x< -2);assert.equal(peek.friend.walk,0);assert.equal(arrival.friend.walk,1);assert.equal(arrival.zhe.walking,false);assert.ok(answer.kong.look>0);assert.equal(answer.zhe.mode,'replying');
  assert.ok(arrival.camera[0]>peek.camera[0]);assert.equal(directEpisode({phase:'complete'}).connection,1);
});

test('each sound has preparation, a bounded lift and a grounded landing instead of a looping bounce',()=>{
  assert.equal(noteMotion(-.1).y,0);assert.ok(noteMotion(.04).squash>0);assert.equal(noteMotion(.04).y,0);assert.ok(noteMotion(.22).y>.20);assert.equal(noteMotion(.5).y,0);assert.deepEqual(noteMotion(5),{y:0,squash:0,lean:0});
  for(let age=0;age<2;age+=.01){const m=noteMotion(age);assert.ok(Object.values(m).every(Number.isFinite));assert.ok(m.y>=0&&m.y<=.25);assert.ok(Math.abs(m.squash)<.08);}
});

test('reduced motion keeps the same wide framing and replaces leaps with a subtle sound cue',()=>{
  const first=directEpisode({phase:'intro',reducedMotion:true});
  for(const phase of ['crowded','listening','rest','reply','accepted','complete'])assert.deepEqual(directEpisode({phase,reducedMotion:true}).camera,first.camera);
  for(let age=0;age<1;age+=.05){const m=noteMotion(age,{reducedMotion:true});assert.equal(m.y,0);assert.ok(Math.abs(m.squash)<=.014);}
});
