import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TerrainFieldCache,buildTerrainField,sampleField} from '../src/voxel.js';
import {DEFAULT_SOURCE_CONFIG,sourceDirection} from '../src/sources.js';
import {aimJet,traceJet} from '../src/jet.js';
import {DEFAULT_SCENE,historySnapshot} from '../src/project.js';

const edits=[{op:'cut',center:[1,3,-1],radius:1},{op:'add',center:[-.5,4,-1],radius:.7},{op:'smooth',center:[1,3,-1],radius:1,strength:.8},{op:'flatten',center:[1,3,-1],radius:1,level:2.8,strength:.6},{op:'restore',center:[1,3,-1],radius:.5}];
test('whole-work history preserves camera and all settings while sculpting history stays scoped',()=>{
  const scene=structuredClone(DEFAULT_SCENE),camera={position:[14,12,23],target:[0,4,0]};scene.quality='ultra';scene.flow=.35;scene.waterStyle=2;scene.extraSources=[{...DEFAULT_SOURCE_CONFIG,position:[2,8,-2]}];
  const whole=historySnapshot(scene,'我的溪谷',camera,true),sculpt=historySnapshot(scene,'我的溪谷',camera);
  scene.extraSources[0].position[0]=4;camera.position[0]=7;scene.flow=1;
  assert.equal(whole.name,'我的溪谷');assert.equal(whole.scene.flow,.35);assert.equal(whole.scene.quality,'ultra');assert.equal(whole.scene.waterStyle,2);assert.equal(whole.scene.extraSources[0].position[0],2);assert.equal(whole.camera.position[0],14);
  assert.equal(sculpt.full,false);assert.equal('flow' in sculpt.scene,false);assert.equal('camera' in sculpt,false);assert.equal(sculpt.scene.extraSources[0].position[0],2);
});
test('incremental terrain matches full replay for all five brushes without replaying prior edits',()=>{
  const cache=new TerrainFieldCache();
  for(let n=0;n<=edits.length;n++){assert.deepEqual(cache.update(0,edits.slice(0,n)),buildTerrainField(0,edits.slice(0,n)));assert.equal(cache.applied,n?1:0);}
  const same=cache.field;assert.equal(cache.update(0,structuredClone(edits)),same);assert.equal(cache.applied,0);
});
test('cache invalidates on undo, branch edits, changed commands and preset switches',()=>{
  const cache=new TerrainFieldCache();cache.update(0,edits);
  for(const [preset,list] of [[0,edits.slice(0,2)],[0,[edits[0],edits[4]]],[0,[{...edits[0],radius:1.4},edits[4]]],[1,edits],[2,[]]])assert.deepEqual(cache.update(preset,list),buildTerrainField(preset,list));
});
test('skipped worker updates apply every intervening edit and keep cached keys immutable',()=>{
  const cache=new TerrainFieldCache(),commands=structuredClone(edits);cache.update(0,commands.slice(0,1));assert.deepEqual(cache.update(0,commands),buildTerrainField(0,commands));assert.equal(cache.applied,4);
  commands[0].center[0]=2;assert.deepEqual(cache.update(0,commands),buildTerrainField(0,commands));assert.equal(cache.applied,5);
});
test('ballistic aim reaches the requested target under the current gravity',()=>{
  const source={...DEFAULT_SOURCE_CONFIG,position:[0,8,-2],speed:6},target=[2,3,0],angles=aimJet(source,target,9.8);assert.ok(angles);
  const v=sourceDirection({...source,...angles}).map(x=>x*source.speed),t=Math.hypot(2,2)/Math.hypot(v[0],v[2]);
  const hit=source.position.map((x,i)=>x+v[i]*t-(i===1?4.9*t*t:0));hit.forEach((x,i)=>assert.ok(Math.abs(x-target[i])<1e-9));
  assert.equal(aimJet(source,[30,8,0],9.8),null);assert.equal(aimJet({...source,speed:0},target,9.8),null);assert.equal(aimJet(source,source.position,9.8),null);assert.equal(aimJet(source,[0,20,-2],9.8),null);
  assert.deepEqual(aimJet(source,[0,3,-2],9.8),{yaw:0,pitch:-90});
});
test('jet prediction terminates at terrain or a domain edge and handles off or buried sources',()=>{
  const field=buildTerrainField(0),source={...DEFAULT_SOURCE_CONFIG,position:[0,9,-2],pitch:-45,speed:3};
  const trace=traceJet(source,9.8,field);assert.equal(trace.reason,'hit');assert.ok(trace.points.length>2);assert.ok(Math.abs(sampleField(field,trace.impact))<.01);assert.ok(trace.points.flat().every(Number.isFinite));
  assert.equal(traceJet({...source,enabled:false},9.8,field).reason,'off');assert.equal(traceJet({...source,position:[0,.2,-2]},9.8,field).reason,'blocked');
  assert.equal(traceJet({...source,position:[5.4,11,0],yaw:90,pitch:75,speed:6},2,field).reason,'outside');
});
