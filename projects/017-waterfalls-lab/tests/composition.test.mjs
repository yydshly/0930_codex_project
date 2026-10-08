import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DX,GRID} from '../src/world.js';
import {DEFAULT_SCENE,decodeProject,encodeProject,editSnapshot} from '../src/project.js';
import {DEFAULT_SOURCE_CONFIG,allSources,changeSource,packSources,sourceDirection} from '../src/sources.js';
import {buildTerrainField,fieldIndex,gridPoint,surfaceHeight} from '../src/voxel.js';

test('source weights exclude disabled emitters and jet directions preserve requested speed',()=>{
  const scene=structuredClone(DEFAULT_SCENE);scene.sourceConfig.power=1;scene.extraSources=[{...DEFAULT_SOURCE_CONFIG,position:[2,9,-3],power:3,yaw:90,pitch:0,speed:6},{...DEFAULT_SOURCE_CONFIG,position:[-2,9,-3],enabled:false,power:3}];
  const packed=packSources(scene);assert.equal(packed.count,3);assert.equal(packed.total,4);
  assert.equal(packed.data[3],.25);assert.equal(packed.data[11],1);assert.equal(packed.data[19],1);
  assert.ok(Math.abs(packed.data[8]-(2/DX+GRID[0]/2))<1e-5);
  assert.ok(Math.abs(packed.data[12]*120*DX-6)<1e-5);assert.ok(Math.abs(packed.data[13])+Math.abs(packed.data[14])<1e-6);
  assert.deepEqual(sourceDirection({...DEFAULT_SOURCE_CONFIG,yaw:0,pitch:0}),[0,0,1]);
  scene.sourceConfig.enabled=false;scene.extraSources[0].enabled=false;assert.equal(packSources(scene).total,0);assert.ok([...packSources(scene).data].every(Number.isFinite));
});

test('editing one source preserves others and undo snapshots own source arrays',()=>{
  const scene=structuredClone(DEFAULT_SCENE);scene.extraSources=[{...DEFAULT_SOURCE_CONFIG,position:[2,8,-2]}];
  const original=[...scene.source],snapshot=editSnapshot(scene);changeSource(scene,1,{position:[3,7,-1],yaw:45});
  assert.deepEqual(scene.source,original);assert.deepEqual(allSources(scene)[1].position,[3,7,-1]);assert.deepEqual(snapshot.extraSources[0].position,[2,8,-2]);
  changeSource(scene,0,{position:[0,9,-3],enabled:false});assert.equal(allSources(scene)[0].enabled,false);assert.deepEqual(scene.extraSources[0].position,[3,7,-1]);
});

test('older v2 projects migrate and new projects retain sources, surface style and sculpting',()=>{
  const legacy=decodeProject(JSON.stringify({format:'waterfalls-lab',version:2,scene:{source:[1,8,-2],objects:[],edits:[]}}));
  assert.deepEqual(legacy.scene.source,[1,8,-2]);assert.deepEqual(legacy.scene.extraSources,[]);assert.equal(legacy.scene.sourceConfig.radius,.45);
  const scene=legacy.scene;scene.extraSources=[{...DEFAULT_SOURCE_CONFIG,position:[-1,8,-2],pitch:-60,speed:3}];scene.waterStyle=1;scene.foam=.3;scene.edits=[{op:'smooth',center:[0,3,-1],radius:1,strength:.5},{op:'flatten',center:[0,3,-1],radius:1,level:2.5,strength:.8}];
  const result=decodeProject(encodeProject(scene,null));assert.deepEqual(result.scene.extraSources,scene.extraSources);assert.equal(result.scene.waterStyle,1);assert.equal(result.scene.foam,.3);assert.deepEqual(result.scene.edits,scene.edits);
  const invalid=JSON.parse(encodeProject(scene,null));invalid.scene.extraSources[0].speed=null;assert.throws(()=>decodeProject(JSON.stringify(invalid)));
  invalid.scene.extraSources=[];delete invalid.scene.edits[1].level;assert.throws(()=>decodeProject(JSON.stringify(invalid)));
  const wrongSwitch=JSON.parse(encodeProject(scene,null));wrongSwitch.scene.sourceConfig.enabled='false';assert.throws(()=>decodeProject(JSON.stringify(wrongSwitch)));
});

test('smoothing reduces local curvature without changing distant terrain',()=>{
  const cell=[35,16,13],center=gridPoint(...cell),radius=.72,edits=[{op:'cut',center,radius}],before=buildTerrainField(0,edits),after=buildTerrainField(0,[...edits,{op:'smooth',center,radius,strength:1}]);
  const curvature=field=>{const [x,y,z]=cell,neighbors=[[x-1,y,z],[x+1,y,z],[x,y-1,z],[x,y+1,z],[x,y,z-1],[x,y,z+1]];return Math.abs(field[fieldIndex(...cell)]-neighbors.reduce((sum,c)=>sum+field[fieldIndex(...c)],0)/6);};
  assert.ok(curvature(after)<curvature(before)*.5);assert.equal(after[fieldIndex(5,5,5)],before[fieldIndex(5,5,5)]);assert.ok([...after].every(Number.isFinite));
});

test('flattening moves the local surface toward the selected level while preserving remote geometry',()=>{
  const base=buildTerrainField(0),x=1.2,z=-1.2,height=surfaceHeight(base,x,z),level=height-.4;
  const edits=Array.from({length:8},()=>({op:'flatten',center:[x,height,z],radius:1.2,level,strength:1})),result=buildTerrainField(0,edits),flattened=surfaceHeight(result,x,z);
  assert.ok(flattened<height-.25);assert.ok(Math.abs(flattened-level)<.1);assert.equal(result[fieldIndex(5,5,5)],base[fieldIndex(5,5,5)]);
});
