import test from 'node:test';
import assert from 'node:assert/strict';
import {pressOffset} from '../src/deformation.js';
test('local press has maximum depth at contact and falls off away from contact',()=>{
  const contact=pressOffset([0,0,1],[0,0,1],[0,0,1],.2);
  assert.ok(contact[0]===0&&contact[1]===0&&contact[2]===-.2);
  assert.ok(Math.abs(pressOffset([1,0,1],[0,0,1],[0,0,1],.2)[2])<.001);
});
test('released skin and fiber root return to their shared rest surface',()=>{
  const offset=pressOffset([.3,.2,.7],[0,0,1],[.3,.2,.7],0);
  assert.ok(offset.every(v=>v===0));
});
