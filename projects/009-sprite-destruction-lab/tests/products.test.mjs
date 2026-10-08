import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,summarize,particleCounts,validateProject} from '../web/products/data.js';
import {withWebMDuration} from '../web/products/webm.js';
test('CSV keeps quoted category names, decimals and repeated-category totals',()=>{
  const rows=parseCSV('\uFEFF类别,数值\r\n"活动,春季",10.5\r\n"活动,春季",9.5\r\n"邮件""订阅",5\r\n');
  assert.deepEqual(rows,[{category:'活动,春季',value:20},{category:'邮件"订阅',value:5}]);
  assert.equal(summarize(rows).total,25);assert.equal(summarize(rows).share,.8);
});
test('Malformed and misleading imported data is rejected',()=>{
  for(const text of ['a,b\nx,5','category,value\nx,-5','category,value\nx,','category,value\nx,Infinity','category,value\nx,0','category,value\n"x,10'])assert.throws(()=>parseCSV(text));
});
test('Visual particle allocation conserves its budget without changing source values',()=>{
  const rows=[{category:'小类',value:.5},{category:'主要',value:99.5},{category:'零',value:0}];const snapshot=structuredClone(rows),counts=particleCounts(rows);
  assert.equal(counts.reduce((s,n)=>s+n,0),420);assert.equal(counts[2],0);assert.deepEqual(rows,snapshot);assert.equal(summarize(rows).total,100);
});
test('A partial project cannot replace the workspace',()=>{
  assert.throws(()=>validateProject({format:'forma-project',version:1,state:{motion:{}}}));
});
test('Very small legal decimal values survive serialization through numeric CSV fields',()=>{
  const original=parseCSV('category,value\n极小值,0.0000001\n其他,1\n');
  const restored=JSON.parse(JSON.stringify(original));
  const rows=parseCSV('category,value\n'+restored.map(r=>`${r.category},${r.value}`).join('\n'));
  assert.deepEqual(rows,original);assert.equal(rows[0].value,1e-7);
});
test('Unexpected WebM layouts are preserved by rejecting metadata rewriting',async()=>{
  await assert.rejects(()=>withWebMDuration(new Blob([new Uint8Array([1,2,3])]),3));
  await assert.rejects(()=>withWebMDuration(new Blob([]),0));
});
