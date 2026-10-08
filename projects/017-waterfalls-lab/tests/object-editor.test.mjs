import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ObjectPicker,ObjectDrag,ObjectGroupDrag,ObjectSelection,copyObjects,groupMoveRange,selectionBounds,mirrorObject,mirrorSource} from '../src/object-editor.js';
import {buildTerrainField,combineObjects,sampleField} from '../src/voxel.js';
import {GRID,buildWorld} from '../src/world.js';
import {sourceDirection,DEFAULT_SOURCE_CONFIG} from '../src/sources.js';
import {DEFAULT_SCENE,encodeProject,decodeProject} from '../src/project.js';

const object=(id,position=[0,3,0],scale=[.5,.5,.5],rotation=0,type='rock')=>({id,type,position,scale,rotation});
const near=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6,`${actual} != ${expected}`));

test('overlapping objects pick the front triangle regardless of list order',()=>{
  const picker=new ObjectPicker(),front=object('front',[0,3,2]),back=object('back',[0,3,-2]);
  for(const objects of [[back,front],[front,back]]){
    const hit=picker.pick(objects,[0,3,8],[0,0,-2]);assert.equal(objects[hit.index].id,'front');assert.ok(hit.distance>5&&hit.distance<6);near(hit.point,[0,3,8-hit.distance]);
  }
  assert.equal(picker.pick([front],[0,3,8],[0,0,0]),null);
});

test('a rotated thin object cannot be selected through its empty screen bounds',()=>{
  const picker=new ObjectPicker(),thin=object('thin',[0,3,0],[2,.2,.2],0,'mound');
  assert.ok(picker.pick([thin],[1,3,8],[0,0,-1]));thin.rotation=Math.PI/2;
  assert.equal(picker.pick([thin],[1,3,8],[0,0,-1]),null);
  assert.ok(picker.pick([thin],[0,3,8],[0,0,-1]));
});

test('actual terrain occludes an object and cutting the wall makes it selectable',()=>{
  const picker=new ObjectPicker(),rock=object('rock',[0,3,-.1],[.25,.25,.25]),edits=[{op:'add',center:[0,3,1],radius:.6}];
  assert.ok(picker.pick([rock],[0,3,4],[0,0,-1]));
  assert.equal(picker.pick([rock],[0,3,4],[0,0,-1],buildTerrainField(0,edits)),null);
  edits.push({op:'cut',center:[0,3,1],radius:.9});assert.ok(picker.pick([rock],[0,3,4],[0,0,-1],buildTerrainField(0,edits)));
});

test('pick geometry is reused, invalidated by in-place transforms, and pruned on removal',()=>{
  const picker=new ObjectPicker(),rock=object('rock');picker.pick([rock],[0,3,4],[0,0,-1]);const first=picker.entries.get('rock');
  rock.selected=true;picker.pick([rock],[0,3,4],[0,0,-1]);assert.equal(picker.entries.get('rock'),first);
  rock.position[0]=.1;picker.pick([rock],[0,3,4],[0,0,-1]);assert.notEqual(picker.entries.get('rock'),first);
  assert.ok(picker.pick([rock],rock.position,[0,1,0]));picker.pick([],[0,3,4],[0,0,-1]);assert.equal(picker.entries.size,0);
});

test('drag preserves the grab offset and a stationary snapped drag does not move off-grid work',()=>{
  const start=[1.13,3,-1.27],anchor=[1.8,3,-.8],drag=new ObjectDrag(start,anchor,200);
  near(drag.update(anchor,200,'plane',.25),start);near(drag.update([2.3,3,-1.3],190),[1.63,3,-1.77]);
  assert.deepEqual(start,[1.13,3,-1.27]);assert.deepEqual(anchor,[1.8,3,-.8]);
  const imported=[5.5,.05,4.8];near(new ObjectDrag(imported,anchor,200).update(anchor,200),imported);
});

test('axis constraints and relative snapping retain untouched coordinates and domain bounds',()=>{
  const start=[1.13,3.07,-1.27],anchor=[0,3,0];
  near(new ObjectDrag(start,anchor,200,'x').update([.37,3,1],150,'x',.25),[1.38,3.07,-1.27]);
  near(new ObjectDrag(start,anchor,200,'z').update([1,3,-.37],150,'z',.25),[1.13,3.07,-1.52]);
  near(new ObjectDrag(start,null,200,'y').update(null,180,'y',.1),[1.13,3.47,-1.27]);
  near(new ObjectDrag([5.2,12.3,4.4],anchor,200).update([10,3,10],200,'plane',.5),[5.3,12.3,4.5]);
  assert.equal(new ObjectDrag(start,null,200,'y').update(null,2000,'y')[1],.12);
});

test('switching into and out of vertical movement rebases without a jump',()=>{
  const drag=new ObjectDrag([1,3,-1],[0,3,0],200);
  near(drag.update([1,3,1],180),[2,3,0]);near(drag.update(null,170,'y'),[2,3,0]);
  near(drag.update(null,150,'y'),[2,3.36,0]);near(drag.update([4,3.36,4],150,'plane'),[2,3.36,0]);
  near(drag.update([4.5,3.36,4.5],140),[2.5,3.36,.5]);
});

test('parallel or missing drag planes suspend movement and recover without a discontinuity',()=>{
  const drag=new ObjectDrag([1,3,-1],null,200);
  near(drag.update([5,3,5],180),[1,3,-1]);near(drag.update([5.5,3,5],170),[1.5,3,-1]);
  near(drag.update(null,160),[1.5,3,-1]);near(drag.update([-4,3,-4],150),[1.5,3,-1]);
  near(drag.update([-3.8,3,-4],140),[1.7,3,-1]);
});

test('mirrored transforms reflect collision and source velocity, preserve settings and save independently',()=>{
  const rock=object('original',[1.3,3,.8],[1,.6,.3],.6),copy=mirrorObject(rock,'mirror');
  const empty=new Float32Array(GRID.reduce((a,b)=>a*b,1)).fill(100),a=combineObjects(empty,[rock]),b=combineObjects(empty,[copy]);
  for(const x of [-2,-1.7,-1.3,-1,-.8])for(const y of [2.6,3,3.4])for(const z of [.4,.8,1.2])assert.ok(Math.abs(sampleField(a,[-x,y,z])-sampleField(b,[x,y,z]))<1e-5);
  const source={...DEFAULT_SOURCE_CONFIG,position:[1.5,8,-2],yaw:37,pitch:-31,power:2.5,enabled:false},reflected=mirrorSource(source),v=sourceDirection(source);
  near(sourceDirection(reflected),[-v[0],v[1],v[2]]);assert.equal(reflected.enabled,false);assert.equal(reflected.power,2.5);
  const scene=structuredClone(DEFAULT_SCENE);scene.objects=[rock,copy];scene.extraSources=[source,reflected];const restored=decodeProject(encodeProject(scene,null)).scene;
  assert.deepEqual(restored.objects.map(o=>o.position),[rock.position,copy.position]);assert.deepEqual(restored.extraSources,[source,reflected]);
  copy.position[1]=10;reflected.position[1]=10;assert.equal(rock.position[1],3);assert.equal(source.position[1],8);
});

test('group selection tracks identities across removals and toggles without stale indices',()=>{
  const objects=[object('a'),object('b'),object('c')],selection=new ObjectSelection();
  selection.choose(objects,0);selection.choose(objects,2,true);assert.deepEqual(selection.indices(objects),[0,2]);assert.equal(selection.primary(objects),2);
  objects.shift();assert.deepEqual(selection.indices(objects),[1]);assert.equal(selection.primary(objects),1);
  selection.choose(objects,0,true);assert.deepEqual(selection.indices(objects),[0,1]);selection.choose(objects,0,true);assert.equal(selection.primary(objects),1);
  selection.replace(objects,[0,1,99],0);assert.deepEqual(selection.indices(objects),[0,1]);selection.clear();assert.deepEqual(selection.indices(objects),[]);assert.equal(selection.primary(objects),null);
});

test('group dragging limits one common translation at boundaries without collapsing spacing',()=>{
  const positions=[[4.9,3,0],[5.2,4,1]],drag=new ObjectGroupDrag(positions,[0,4,0],200,'plane',1);
  const moved=drag.update([10,4,2],200);near(moved[0],[5,3,2]);near(moved[1],[5.3,4,3]);near(moved[1].map((v,i)=>v-moved[0][i]),[.3,1,1]);
  const rebased=drag.update(null,180,'y');rebased.forEach((p,i)=>near(p,moved[i]));
  const raised=drag.update(null,-800,'y',.25);near(raised[0],[5,11.4,2]);near(raised[1],[5.3,12.4,3]);assert.deepEqual(positions,[[4.9,3,0],[5.2,4,1]]);
});

test('imported groups outside editor limits keep their original shape and cannot move farther out',()=>{
  const positions=[[-5.5,.05,4.8],[5.5,1,4]],drag=new ObjectGroupDrag(positions,[0,1,0],200);
  drag.update([0,1,0],200).forEach((p,i)=>near(p,positions[i]));drag.update([10,1,10],200).forEach((p,i)=>near(p,positions[i]));
  assert.deepEqual(groupMoveRange([]),[[0,0],[0,0],[0,0]]);assert.equal(selectionBounds([],[]),null);
});

test('group copies choose an inward offset at the edge, retain spacing and own their transforms',()=>{
  const objects=[object('a',[4.9,3,0]),object('b',[5.25,4,1])];let id=0;
  const copies=copyObjects(objects,[0,1],()=>String(++id));near(copies[0].position,[4.45,3,0]);near(copies[1].position,[4.8,4,1]);
  near(copies[1].position.map((v,i)=>v-copies[0].position[i]),[.35,1,1]);assert.notEqual(copies[0].id,copies[1].id);
  copies[0].scale[0]=2;copies[0].position[1]=10;assert.equal(objects[0].scale[0],.5);assert.equal(objects[0].position[1],3);
});

test('group mirror applies to every selected transform and saved copies remain independent',()=>{
  const objects=[object('a',[1,3,0],[1,.5,.3],.4),object('b',[2,4,1],[.4,.6,.5],-.7),object('c')];let id=0;
  const mirrored=copyObjects(objects,[0,1],()=>String(++id),true);assert.equal(mirrored.length,2);near(mirrored[0].position,[-1,3,0]);near(mirrored[1].position,[-2,4,1]);assert.equal(mirrored[0].rotation,-.4);assert.equal(mirrored[1].rotation,.7);
  const scene=structuredClone(DEFAULT_SCENE);scene.objects=[...objects,...mirrored];const loaded=decodeProject(encodeProject(scene,null)).scene;
  assert.deepEqual(loaded.objects.map(o=>o.position),scene.objects.map(o=>o.position));assert.equal(objects[2].position[0],0);
});

test('group focus encloses the actual rotated mesh including the moss caps',()=>{
  const objects=[object('a',[-2,3,0],[1.7,.4,.2],.8),object('b',[2,5,1],[.2,1.4,.7],-.3)],box=selectionBounds(objects,[0,1]),vertices=buildWorld(0,'summer',objects,true);
  assert.ok(box.center.every(Number.isFinite));for(let i=0;i<vertices.length;i+=9)assert.ok(Math.hypot(...box.center.map((v,j)=>vertices[i+j]-v))<=box.radius+1e-6);
});
