import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tilesForRect, destructionProgress, closestRayHit, makeTileBody, fragmentsForRect } from '../web/model.js';
const require=createRequire(new URL('../tooling/package.json',import.meta.url));
const Matter=require('matter-js');
test('Edge tiles cover the original area without counting a small edge like a full tile',()=>{
  const tiles=tilesForRect({x:10,y:20,width:101,height:73},48);
  assert.equal(tiles.length,6);assert.equal(tiles.reduce((sum,t)=>sum+t.area,0),101*73);
  assert.equal(tiles.at(-1).width,5);assert.equal(tiles.at(-1).height,25);
  assert.throws(()=>tilesForRect({x:0,y:0,width:100,height:100},0));
});
test('Global area progress and targeted price goal remain distinct',()=>{
  const tiles=[{area:100,detached:true,tag:'price'},{area:25,detached:false,tag:'price'},{area:375,detached:false,tag:'title'}];
  const progress=destructionProgress(tiles,'price');assert.equal(progress.ratio,.2);assert.equal(progress.goalRatio,.8);
  assert.equal(destructionProgress([]).ratio,0);
});
test('Ray collision selects first intact tile and skips a detached blocker',()=>{
  const tiles=[60,120].map(x=>({body:Matter.Bodies.rectangle(x,50,30,30,{isStatic:true}),detached:false}));
  assert.equal(closestRayHit(Matter,tiles,{x:0,y:50},{x:200,y:50}),tiles[0]);
  tiles[0].detached=true;assert.equal(closestRayHit(Matter,tiles,{x:0,y:50},{x:200,y:50}),tiles[1]);
  assert.equal(closestRayHit(Matter,tiles,{x:0,y:0},{x:200,y:0}),null);
});
test('A released Matter body falls and collides with the floor, while zero gravity remains stable',()=>{
  const engine=Matter.Engine.create();engine.gravity.y=1;
  const tile=makeTileBody(Matter,{x:40,y:20,width:20,height:20});
  const floor=Matter.Bodies.rectangle(50,140,150,20,{isStatic:true});Matter.Composite.add(engine.world,[tile,floor]);
  for(let i=0;i<20;i++)Matter.Engine.update(engine,1000/60);assert.equal(tile.position.y,30);
  Matter.Body.setStatic(tile,false);assert.ok(Number.isFinite(tile.mass)&&Number.isFinite(tile.inertia));for(let i=0;i<120;i++)Matter.Engine.update(engine,1000/60);
  assert.ok(tile.position.y>100&&tile.position.y<125,'released body settles above the floor');
  const zero=Matter.Engine.create();zero.gravity.y=0;const floating=Matter.Bodies.rectangle(20,30,20,20);Matter.Composite.add(zero.world,floating);
  for(let i=0;i<60;i++)Matter.Engine.update(zero,1000/60);assert.equal(floating.position.y,30);
});
test('Irregular glass triangles cover even narrow edge regions exactly',()=>{
  for(const [width,height] of [[101,73],[49,50],[600,43],[37,111]]){
    const triangles=fragmentsForRect({x:13,y:22,width,height},48,'price','glass');
    assert.ok(triangles.every(t=>t.vertices.length===3&&t.area>0));
    assert.ok(Math.abs(triangles.reduce((sum,t)=>sum+t.area,0)-width*height)<.0001);
    for(const triangle of triangles)for(const vertex of triangle.vertices){assert.ok(vertex.x>=13&&vertex.x<=13+width);assert.ok(vertex.y>=22&&vertex.y<=22+height);}
  }
});
test('Glass polygons become finite real rotating bodies after release',()=>{
  const triangle=fragmentsForRect({x:30,y:30,width:91,height:80},48,'content','glass')[0];
  const body=makeTileBody(Matter,triangle);Matter.Body.setStatic(body,false);Matter.Body.setAngularVelocity(body,.08);
  const engine=Matter.Engine.create();Matter.Composite.add(engine.world,body);for(let i=0;i<30;i++)Matter.Engine.update(engine,1000/60);
  assert.ok(Number.isFinite(body.position.x)&&Number.isFinite(body.position.y)&&Number.isFinite(body.inertia));assert.ok(Math.abs(body.angle)>.1);
});
test('Paper strips conserve area while changing aspect ratio and fragment count',()=>{
  const rect={x:0,y:0,width:200,height:101},base=tilesForRect(rect,48),strips=fragmentsForRect(rect,48,'content','paper');
  assert.ok(strips.length>base.length);assert.ok(strips.every(t=>t.height<=48*.38+.0001));
  assert.ok(Math.abs(strips.reduce((sum,t)=>sum+t.area,0)-200*101)<.0001);
});
test('Partial reveal contributes area without requiring full tile detachment',()=>{
  const tiles=[{area:100,progress:.4,detached:false,tag:'price'},{area:200,progress:.5,detached:false,tag:'other'}];
  assert.equal(destructionProgress(tiles,'price').goalRatio,.4);assert.equal(destructionProgress(tiles).destroyed,140);
  assert.equal(destructionProgress([{area:10,progress:2,tag:'price'}]).ratio,1);
});
