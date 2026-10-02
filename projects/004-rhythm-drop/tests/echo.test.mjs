import test from 'node:test';
import assert from 'node:assert/strict';
import {newEpisode,reduceEpisode,REST_LENGTH,performanceAt,performanceScore,filmScore,filmAt,signature,readProgress} from '../src/echo-story.mjs';
import {renderNote,renderDryScore} from '../src/echo-sound.mjs';

test('the story requires a complete hearing, a real rest and a clear answer before meeting the friend',()=>{
  let state=reduceEpisode(newEpisode(),{type:'start'});
  for(const from of ['question','crowded'])state=reduceEpisode(state,{type:'advance',from});
  assert.equal(state.phase,'ready');state=reduceEpisode(state,{type:'listen'});
  state=reduceEpisode(state,{type:'advance',from:'listening'});assert.equal(state.phase,'rest');
  assert.equal(reduceEpisode(state,{type:'note',index:0}),state);
  state=reduceEpisode(state,{type:'hold',time:10});state=reduceEpisode(state,{type:'tick',time:10+REST_LENGTH-.001});assert.equal(state.phase,'rest');
  state=reduceEpisode(state,{type:'release'});assert.equal(state.heldAt,null);assert.equal(state.hint,true);
  state=reduceEpisode(state,{type:'hold',time:12});state=reduceEpisode(state,{type:'tick',time:12+REST_LENGTH});assert.equal(state.phase,'reply');
  state=reduceEpisode(state,{type:'note',index:0});state=reduceEpisode(state,{type:'note',index:2});assert.equal(state.answer,1);assert.equal(state.hint,true);
  for(const index of [1,2])state=reduceEpisode(state,{type:'note',index});assert.equal(state.phase,'accepted');
  state=reduceEpisode(state,{type:'advance',from:'accepted'});assert.equal(state.phase,'complete');
});
test('the ten-second acting cue has an actual silence between listening and replying, and freezes its ending',()=>{
  assert.equal(performanceAt(4).chapter,'留白');assert.equal(performanceAt(5.25).chapter,'回应');
  assert.ok(performanceScore.filter(n=>n.at<4).every(n=>n.at+n.length+.42<4));
  assert.equal(performanceScore.filter(n=>n.at>=4&&n.at<5.25).length,0);
  assert.deepEqual(performanceAt(10),performanceAt(100));assert.equal(performanceAt(7.5).zheVisible,false);assert.equal(performanceAt(8).zheVisible,true);
  assert.equal(signature.length,3);assert.ok(signature[2].at>signature[1].at+.8);
});
test('all four voices produce deterministic finite unclipped signals and the rest is numerically silent',()=>{
  for(const voice of ['kong','zhe','dong','su']){const note={voice,midi:voice==='dong'?48:72,length:.4};const a=renderNote(note,8000),b=renderNote(note,8000);assert.deepEqual(a,b);assert.ok(a.some(v=>Math.abs(v)>.02));assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.5));}
  const signal=renderDryScore(performanceScore,10,8000);assert.equal(signal.left.length,80000);
  assert.ok(signal.left.subarray(4*8000,5.25*8000).every(v=>v===0));assert.ok(signal.right.subarray(4*8000,5.25*8000).every(v=>v===0));
  assert.throws(()=>renderNote({voice:'unknown',midi:60}));
});
test('stale turns, invalid inputs and corrupted memory cannot skip the story',()=>{
  const state={...newEpisode(),phase:'reply'};
  for(const index of [-1,3,NaN,'0'])assert.equal(reduceEpisode(state,{type:'note',index}),state);
  assert.equal(reduceEpisode(state,{type:'advance',from:'accepted'}),state);
  assert.equal(readProgress('{"version":1,"episode1":true}'),true);
  for(const raw of ['bad','null','{}','{"version":2,"episode1":true}','{"version":1,"episode1":"true"}'])assert.equal(readProgress(raw),false);
});

test('the complete twenty-second film contains a failure, a new attempt and a slower clear answer before the meeting',()=>{
  assert.deepEqual([0,1,4,6,7,10.5,12,15,20].map(t=>filmAt(t).phase),['intro','question','crowded','ready','listening','rest','reply','accepted','complete']);
  const rush=filmScore.filter(n=>filmAt(n.at).phase==='crowded'),reply=filmScore.filter(n=>filmAt(n.at).phase==='reply');
  assert.equal(rush.length,3);assert.equal(reply.length,3);assert.ok(rush[1].at<rush[0].at+rush[0].length);assert.ok(reply[1].at>reply[0].at+reply[0].length+.42);
  assert.deepEqual(filmAt(20),filmAt(200));assert.equal(filmAt(-1).time,0);assert.ok(filmScore.every(n=>n.at+n.length+.42<20));
});

test('the film has a genuinely silent rest and audible sources on the correct stereo side',()=>{
  const sound=renderDryScore(filmScore,20,8000),energy=values=>values.reduce((sum,v)=>sum+v*v,0);
  for(const channel of [sound.left,sound.right]){assert.ok(channel.every(v=>Number.isFinite(v)&&Math.abs(v)<.8));assert.ok(channel.subarray(10*8000,11.2*8000).every(v=>v===0));}
  const tree=[1*8000,3.3*8000],friend=[16*8000,18*8000];
  assert.ok(energy(sound.left.subarray(...tree))>energy(sound.right.subarray(...tree))*2);
  assert.ok(energy(sound.right.subarray(...friend))>energy(sound.left.subarray(...friend)));
});
