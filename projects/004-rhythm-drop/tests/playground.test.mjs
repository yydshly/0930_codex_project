import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,reduceGame,echo,responseScore,readMelody} from '../src/playground-game.mjs';
const tap=(state,tile)=>reduceGame(state,{type:'tap',tile});
const advance=state=>reduceGame(state,{type:'advance',from:state.phase});

test('a child can improvise, receive a reply, learn a phrase and welcome someone with their own tune',()=>{
  let s=reduceGame(newGame(),{type:'start'});
  for(const tile of [4,1,4])s=tap(s,tile);
  assert.equal(s.phase,'firstReply');assert.deepEqual(s.first,[4,1,4]);
  s=advance(s);assert.equal(s.phase,'echoListen');s=advance(s);assert.equal(s.phase,'echoInput');
  for(const tile of echo)s=tap(s,tile);
  assert.equal(s.phase,'echoTogether');s=advance(s);assert.equal(s.phase,'welcome');
  for(const tile of [1,3,2,4])s=tap(s,tile);
  assert.equal(s.phase,'finale');assert.deepEqual(s.melody,[1,3,2,4]);s=advance(s);assert.equal(s.phase,'complete');
  const score=responseScore(s.melody,{ensemble:true});
  assert.deepEqual([...new Set(score.map(n=>n.role))].sort(),['dou','he','mai','mumu']);
  assert.deepEqual(score.filter(n=>n.role==='he').map(n=>n.tile),s.melody);
});

test('a different note offers a hint, retains progress and never forces a restart',()=>{
  let s={...newGame(),phase:'echoInput'};
  s=tap(s,0);assert.equal(s.answer,1);
  for(let i=0;i<20;i++)s=tap(s,4);
  assert.equal(s.answer,1);assert.equal(s.phase,'echoInput');assert.equal(s.hint,true);
  s=tap(s,2);assert.equal(s.answer,2);assert.equal(s.hint,false);
  s=tap(s,3);assert.equal(s.phase,'echoTogether');
});

test('listening locks input and stale sequence completions cannot advance a new story',()=>{
  for(const phase of ['intro','firstReply','echoListen','echoTogether','finale','complete','freeListen']){
    const s={...newGame(),phase};assert.equal(tap(s,0),s);
    assert.equal(reduceGame(s,{type:'advance',from:'wrong'}),s);
  }
  let s=reduceGame(newGame(),{type:'start'});
  assert.equal(reduceGame(s,{type:'advance',from:'finale'}),s);
  for(const tile of [-1,5,NaN,Infinity,1.5,'2'])assert.equal(tap(s,tile),s);
});

test('free composition keeps the latest sixteen valid notes and persisted data is bounded',()=>{
  let s=reduceGame({...newGame(),phase:'complete',melody:[0,2,3,0]},{type:'free'});
  assert.deepEqual(s.melody,[]);
  for(let i=0;i<40;i++)s=tap(s,i%5);
  assert.equal(s.melody.length,16);assert.deepEqual(s.melody,Array.from({length:16},(_,i)=>(i+24)%5));
  assert.deepEqual(readMelody(JSON.stringify(s.melody)),s.melody);
  for(const raw of ['null','{}','[]','[1,2,5]','["0"]','[1.1]','bad',JSON.stringify(Array(17).fill(0))])assert.deepEqual(readMelody(raw),[]);
  const previous=[...s.melody];s=reduceGame(s,{type:'listen'});assert.equal(s.phase,'freeListen');s=advance(s);assert.equal(s.phase,'free');assert.deepEqual(s.melody,previous);
});
