import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DestructionEngine} from '../web/engine.js';
import {makeTileBody} from '../web/model.js';

const require=createRequire(new URL('../tooling/package.json',import.meta.url));
const Matter=require('matter-js');

function browserGlobals(t){
  const events=[];
  const values={Matter,html2canvas:()=>{},window:{addEventListener:(...args)=>events.push(['window',...args])},document:{addEventListener:(...args)=>events.push(['document',...args])},cancelAnimationFrame:()=>{},requestAnimationFrame:()=>42};
  const previous=new Map(Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(values))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  t.after(()=>{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  let now=1000;t.mock.method(performance,'now',()=>now);
  const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
  const canvas={getContext:()=>ctx,addEventListener:(...args)=>events.push(['canvas',...args])};
  return {canvas,events,advance:milliseconds=>{now+=milliseconds;}};
}

function preparedEngine(canvas,options={}){
  const emitted=[],detached=[],pulses=[];
  const engine=new DestructionEngine({canvas,source:{},interactive:false,threshold:.5,onEvent:event=>emitted.push(event),...options});
  engine.width=300;engine.height=200;engine.physics=Matter.Engine.create();
  engine.tiles=[10,40,150].map(x=>{
    const tile={x,y:10,width:20,height:20,area:400,tag:'content',detached:false};
    return {...tile,body:makeTileBody(Matter,tile)};
  });
  engine.player=Matter.Bodies.rectangle(280,160,18,40);
  Matter.Composite.add(engine.physics.world,[...engine.tiles.map(tile=>tile.body),engine.player]);
  engine.effects={detached:(...args)=>detached.push(args),pulse:(...args)=>pulses.push(args),update:()=>{},draw:()=>{},count:0};
  engine.state='running';
  return {engine,emitted,detached,pulses};
}

test('An actor impact releases only nearby page fragments and advances real area progress',t=>{
  const {canvas}=browserGlobals(t),{engine,emitted,detached,pulses}=preparedEngine(canvas);
  const untouched={...engine.tiles[2].body.position};
  assert.equal(engine.impactAt({x:35,y:20},{radius:20}),true);
  assert.deepEqual(engine.tiles.map(tile=>tile.detached),[true,true,false]);
  assert.deepEqual(engine.tiles.map(tile=>tile.body.isStatic),[false,false,true]);
  assert.ok(engine.tiles.slice(0,2).every(tile=>Number.isFinite(tile.body.mass)&&Number.isFinite(tile.body.inertia)));
  assert.equal(detached.length,2);assert.equal(pulses.length,1);
  assert.equal(engine.getState().ratio,2/3);assert.equal(engine.getState().dynamic,2);
  assert.equal(engine.shots,1);assert.equal(engine.hits,1);assert.equal(engine.complete,true);
  assert.deepEqual(emitted.map(event=>event.type),['first-hit','shot','complete']);
  for(let frame=0;frame<30;frame++)Matter.Engine.update(engine.physics,1000/60);
  assert.deepEqual(engine.tiles[2].body.position,untouched);
  assert.notEqual(engine.tiles[0].body.position.y,20);
  engine.dispose();
});

test('Repeated and invalid impacts do not detach twice or bypass the running/cooldown guard',t=>{
  const {canvas,advance}=browserGlobals(t),{engine,detached,pulses,emitted}=preparedEngine(canvas);
  assert.equal(engine.impactAt({x:20,y:20},{radius:8,strength:Infinity}),true);
  const velocity={...engine.tiles[0].body.velocity};
  for(let attempt=0;attempt<100;attempt++)assert.equal(engine.impactAt({x:20,y:20}),false);
  assert.equal(engine.shots,1);assert.equal(detached.length,1);
  advance(101);assert.equal(engine.impactAt({x:20,y:20},{radius:8}),false);
  assert.equal(engine.shots,2);assert.equal(engine.hits,1);assert.equal(detached.length,1);assert.equal(pulses.length,1);
  assert.deepEqual(engine.tiles[0].body.velocity,velocity);
  assert.equal(emitted.at(-1).hit,false);
  advance(101);assert.equal(engine.impactAt({x:NaN,y:20}),false);
  assert.equal(engine.shots,2);
  engine.state='paused';assert.equal(engine.impactAt({x:50,y:20}),false);
  engine.dispose();assert.equal(engine.impactAt({x:50,y:20}),false);
});

test('Interactive input remains the default, while actor mode and repeated disposal are safe',t=>{
  const {canvas,events}=browserGlobals(t);
  const original=new DestructionEngine({canvas,source:{}});
  assert.equal(original.interactive,true);assert.equal(original.showAim,true);assert.equal(original.showPlayer,true);
  assert.ok(events.some(([surface,event])=>surface==='canvas'&&event==='pointerdown'));
  assert.ok(events.some(([surface,event])=>surface==='document'&&event==='visibilitychange'));
  const signal=original.inputAbort.signal;original.dispose();assert.equal(signal.aborted,true);original.dispose();
  events.length=0;
  const actor=new DestructionEngine({canvas,source:{},interactive:false,showAim:false,showPlayer:false});
  assert.equal(events.length,0);assert.equal(actor.inputAbort,undefined);
  actor.dispose();actor.dispose();assert.equal(actor.state,'disposed');
});

test('An actor frame callback observes stepped Matter bodies before drawing and may stop the loop',t=>{
  const {canvas}=browserGlobals(t),order=[];
  const {engine}=preparedEngine(canvas,{onFrame:({engine:current,elapsed,time})=>{
    order.push('actor');assert.equal(current,engine);assert.equal(elapsed,.02);assert.equal(time,1020);
    assert.ok(engine.physics.timing.timestamp>0);assert.ok(engine.player.position.y>160);
  }});
  engine.lastTime=1000;engine.accumulator=0;engine.fps=60;
  engine.draw=()=>order.push('draw');engine.frame(1020);
  assert.deepEqual(order,['actor','draw']);assert.equal(engine.frameId,42);
  engine.onFrame=()=>engine.dispose();engine.frame(1040);
  assert.equal(engine.state,'disposed');assert.equal(engine.frameId,null);
});

test('A queued animation timestamp older than start time never gives an actor negative elapsed time',t=>{
  const {canvas}=browserGlobals(t),frames=[];
  const {engine}=preparedEngine(canvas,{onFrame:frame=>frames.push({elapsed:frame.elapsed,time:frame.time})});
  engine.lastTime=1000;engine.accumulator=0;engine.fps=60;engine.draw=()=>{};
  engine.frame(980);
  assert.deepEqual(frames,[{elapsed:0,time:980}]);
  assert.equal(engine.accumulator,0);assert.equal(engine.physics.timing.timestamp,0);
  engine.frame(1000);
  assert.deepEqual(frames.at(-1),{elapsed:.02,time:1000});
  assert.ok(engine.physics.timing.timestamp>0);
  engine.dispose();
});

test('Actor presentation can hide both default character and aim without changing the draw pipeline',t=>{
  const {canvas}=browserGlobals(t),{engine}=preparedEngine(canvas,{showAim:false,showPlayer:false});
  let playerDraws=0,arcs=0;engine.drawPlayer=()=>playerDraws++;
  engine.ctx=new Proxy({arc:()=>arcs++},{get:(target,key)=>target[key]||(()=>{}),set:()=>true});
  engine.base={};engine.texture={};engine.dpr=1;engine.aim={x:10,y:10};engine.tiles=[];
  engine.draw();assert.equal(playerDraws,0);assert.equal(arcs,0);
  engine.showAim=true;engine.showPlayer=true;engine.draw();assert.equal(playerDraws,1);assert.equal(arcs,1);
  engine.dispose();
});
