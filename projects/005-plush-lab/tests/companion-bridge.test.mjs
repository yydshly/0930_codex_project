import test from 'node:test';
import assert from 'node:assert/strict';
import {companionCommand,companionEvent} from '../src/companion-bridge.js';
import {defaultWorld,PERSONALITIES,encodeWorld,decodeWorld} from '../src/world-config.js';
test('only limited companion commands are accepted',()=>{
  for(const action of ['greet','jump','fetch','cancel'])assert.equal(companionCommand({type:'plush:command',action,requestId:'one'}).action,action);
  for(const value of [null,[],{type:'plush:command',action:'delete',requestId:'one'},{type:'plush:command',action:'greet'},{type:'plush:command',action:'greet',requestId:'x'.repeat(101)}])assert.equal(companionCommand(value),null);
  assert.deepEqual(companionCommand({type:'plush:hello'}),{type:'plush:hello'});
});
test('ready packets require a bounded world code and known personality',()=>{
  const ready={type:'plush:ready',companion:{name:'小团子',personality:'curious'},worldCode:'abc_123-'};
  assert.deepEqual(companionEvent(ready),ready);
  assert.equal(companionEvent({...ready,worldCode:'javascript:alert(1)'}),null);
  assert.equal(companionEvent({...ready,companion:{...ready.companion,personality:'unknown'}}),null);
});
test('only completed shared activity events can enter local memories',()=>{
  const event={type:'plush:event',kind:'play',title:'捡回了一颗球',eventId:'world-1-fetch-1'};
  assert.deepEqual(companionEvent(event),event);
  assert.equal(companionEvent({...event,kind:'fetch-started'}),null);
  assert.equal(companionEvent({...event,eventId:''}),null);
  assert.equal(companionEvent({type:'plush:event',kind:'hello',title:'x'.repeat(101),eventId:'a'}),null);
});
test('the actual default world and every catalog personality complete the studio handshake',()=>{
  for(const {id:personality} of PERSONALITIES){
    const world={...defaultWorld(),personality};
    const packet={type:'plush:ready',companion:{name:world.name,personality},worldCode:encodeWorld(world)};
    const accepted=companionEvent(packet);
    assert.deepEqual(accepted,packet);
    assert.equal(decodeWorld(accepted.worldCode).personality,personality);
  }
});
test('failed rendering and a newer world draft have distinct feedback packets',()=>{
  for(const type of ['plush:error','plush:draft-stale'])assert.deepEqual(companionEvent({type,message:'打开小世界查看最新创作'}),{type,message:'打开小世界查看最新创作'});
  assert.equal(companionEvent({type:'plush:draft-stale',message:''}),null);
});
