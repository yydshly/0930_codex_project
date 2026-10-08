import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseSceneJSON,SCENE_JSON_BYTE_LIMIT} from '../src/scene-json.js';

test('pasted native calibration and binding exports preserve exact floating-point data',async()=>{
 for(const name of ['v11-calibration-export.json','v11-binding-export.json']){
  const text=await readFile(new URL('../notes/'+name,import.meta.url),'utf8');
  const data=parseSceneJSON(text);assert.deepEqual(data,JSON.parse(text));
  assert.equal(data.modelScale,1.1873770659862348);
 }
});
test('blank, malformed, primitive and array JSON cannot reach domain import',()=>{
 for(const value of [null,undefined,'','  ','{"x":}','true','null','4','"string"','[]'])assert.throws(()=>parseSceneJSON(value));
 assert.deepEqual(parseSceneJSON('  {"name":"锦鲤池"}  '),{name:'锦鲤池'});
});
test('pasted UTF-8 byte limit also protects multibyte text',()=>{
 const text=JSON.stringify({name:'鱼'.repeat(34000)});
 assert.ok(text.length<SCENE_JSON_BYTE_LIMIT);assert.throws(()=>parseSceneJSON(text),/100 KB/);
 const boundary='{"x":"'+'a'.repeat(SCENE_JSON_BYTE_LIMIT-8)+'"}';
 assert.equal(new TextEncoder().encode(boundary).length,SCENE_JSON_BYTE_LIMIT);
 assert.equal(parseSceneJSON(boundary).x.length,SCENE_JSON_BYTE_LIMIT-8);
 assert.throws(()=>parseSceneJSON(boundary+' '),/100 KB/);
});
