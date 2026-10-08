import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DestructionEngine} from '../web/engine.js';

const require=createRequire(new URL('../tooling/package.json',import.meta.url));
const Matter=require('matter-js');

function canvas(color=[182,91,43,255]){
  const node={width:0,height:0,color,calls:[]};
  const context=new Proxy({
    drawImage:(...args)=>{node.calls.push(['drawImage',...args]);node.color=args[0].color||node.color;},
    createLinearGradient:()=>({addColorStop:()=>{}}),
    getImageData:(_x,_y,width,height)=>{
      const data=new Uint8ClampedArray(width*height*4);
      for(let i=0;i<data.length;i+=4)data.set(node.color,i);
      return {width,height,data};
    },
  },{get:(target,key)=>target[key]||((...args)=>node.calls.push([key,...args])),set:(target,key,value)=>{target[key]=value;return true;}});
  node.getContext=()=>context;
  return node;
}

function environment(t){
  const created=[];
  const globals={Matter,html2canvas:undefined,devicePixelRatio:1,cancelAnimationFrame:()=>{},requestAnimationFrame:()=>42,document:{fonts:{ready:Promise.resolve()},createElement:tag=>{assert.equal(tag,'canvas');const result=canvas();created.push(result);return result;}}};
  const before=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  t.after(()=>{for(const [key,descriptor] of before){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const output=canvas(),events=[];
  const make=options=>new DestructionEngine({canvas:output,interactive:false,showAim:false,showPlayer:false,onEvent:event=>events.push(event),...options});
  const image={naturalWidth:600,naturalHeight:400,complete:true,color:[182,91,43,255]};
  return {created,output,events,make,image};
}

test('A loaded screenshot normalizes its pixels, clips CSS regions, and releases actual Matter fragments',async t=>{
  const {make,image,output,created,events}=environment(t),engine=make({effect:'glass',cellSize:20});
  const result=await engine.prepareSnapshot({texture:image,width:300,height:200,dpr:2,regions:[{x:-10,y:5,width:30,height:35,tag:' left '},{x:280,y:180,width:50,height:50,tag:'edge'},{x:400,y:0,width:10,height:10,tag:'offscreen'}]});
  assert.equal(result,engine);assert.equal(engine.state,'ready');assert.equal(engine.base,null);
  assert.deepEqual(engine.regions,[{x:0,y:5,width:20,height:35,tag:'left'},{x:280,y:180,width:20,height:20,tag:'edge'}]);
  assert.equal(output.width,600);assert.equal(output.height,400);assert.equal(created.length,1);
  assert.deepEqual(created[0].calls[0],['drawImage',image,0,0,600,400]);
  assert.equal(engine.tiles.reduce((area,tile)=>area+tile.area,0),1100);
  assert.ok(engine.tiles.every(tile=>tile.body.isStatic));
  const draws=output.calls.filter(([type])=>type==='drawImage');
  assert.equal(draws.length,engine.tiles.length);assert.ok(draws.every(call=>call.length===10&&call[1]===engine.texture),'transparent scene draws cropped tiles, never a whole-page background');
  const first=engine.tiles[0];
  assert.deepEqual(draws[0].slice(2,6),[first.x*2,first.y*2,first.width*2,first.height*2]);
  engine.start();assert.equal(engine.impactAt({x:10,y:22},{radius:30}),true);
  assert.ok(engine.tiles.filter(tile=>tile.tag==='left').every(tile=>tile.detached&&!tile.body.isStatic));
  assert.ok(engine.tiles.filter(tile=>tile.tag==='edge').every(tile=>!tile.detached&&tile.body.isStatic));
  assert.equal(engine.getState().destroyed,700);
  const oldY=first.body.position.y;for(let step=0;step<30;step++)Matter.Engine.update(engine.physics,1000/60);
  assert.notEqual(first.body.position.y,oldY);
  assert.deepEqual(events.slice(0,2).map(event=>event.type),['loading','ready']);engine.dispose();
});

test('Canvas screenshots may have a different source resolution, and opaque mode retains the old base layer',async t=>{
  const {make,output,created}=environment(t),engine=make({cellSize:32});
  const input=canvas();input.width=900;input.height=600;
  await engine.prepareSnapshot({texture:input,width:300,height:200,dpr:1.5,transparent:false,regions:[{x:20,y:30,width:64,height:32}]});
  assert.equal(engine.texture.width,450);assert.equal(engine.texture.height,300);
  assert.deepEqual(created[0].calls[0],['drawImage',input,0,0,450,300]);
  assert.equal(created.length,2);assert.equal(engine.base,created[1]);
  assert.deepEqual(engine.base.calls.find(([type])=>type==='fillRect'),['fillRect',30,45,96,48]);
  assert.deepEqual(output.calls.find(([type])=>type==='drawImage'),['drawImage',engine.base,0,0,300,200]);
  assert.equal(engine.tiles.length,2);assert.equal(engine.regions[0].tag,'content');engine.dispose();
});

test('The original DOM capture still creates an opaque base and the same marked-region Matter world',async t=>{
  const {make,output}=environment(t),captured=canvas();captured.width=100;captured.height=80;
  const source={
    getBoundingClientRect:()=>({left:10,top:10,width:100,height:80}),
    querySelectorAll:selector=>{
      assert.equal(selector,'[data-destructible]');
      return [{dataset:{tag:'original'},getBoundingClientRect:()=>({left:12,top:17,right:52,bottom:37})}];
    },
  };
  let request;globalThis.html2canvas=async (element,options)=>{request={element,options};return captured;};
  const engine=make({source,cellSize:20});await engine.prepare();
  assert.equal(request.element,source);assert.equal(request.options.scale,1);
  assert.equal(request.options.useCORS,false);assert.equal(request.options.allowTaint,false);
  assert.equal(engine.transparent,false);assert.ok(engine.base);assert.equal(engine.texture,captured);
  assert.deepEqual(engine.regions,[{x:2,y:7,width:40,height:20,tag:'original'}]);
  assert.equal(engine.tiles.length,2);assert.equal(engine.physics.world.bodies.length,6);
  assert.equal(output.calls.find(([type])=>type==='drawImage')[1],engine.base);
  assert.equal(engine.state,'ready');engine.dispose();
});

test('Snapshot pixels feed the original particle effects, and ripple rendering stays clipped to selected regions',async t=>{
  const {make,image,output}=environment(t),pixels=make({effect:'pixels',cellSize:16});
  await pixels.prepareSnapshot({texture:image,width:100,height:80,regions:[{x:10,y:10,width:32,height:32}]});
  pixels.start();assert.equal(pixels.impactAt({x:26,y:26},{radius:40}),true);
  assert.ok(pixels.effects.particles.length>0);assert.equal(pixels.effects.particles[0].color,'rgb(182,91,43)');
  assert.equal(pixels.getState().ratio,1);assert.ok(pixels.tiles.every(tile=>tile.removed));pixels.dispose();
  output.calls.length=0;
  const ripple=make({effect:'ripple'});
  await ripple.prepareSnapshot({texture:image,width:100,height:80,regions:[{x:10,y:15,width:30,height:20}]});
  const rectIndex=output.calls.findIndex(call=>call[0]==='rect');
  const clipIndex=output.calls.findIndex(call=>call[0]==='clip');
  const imageIndex=output.calls.findIndex(call=>call[0]==='drawImage');
  assert.deepEqual(output.calls[rectIndex],['rect',10,15,30,20]);
  assert.ok(rectIndex<clipIndex&&clipIndex<imageIndex,'whole screenshot in reveal mode is clipped before it can cover external page content');ripple.dispose();
});

test('Snapshot validation rejects invalid geometry, unloaded textures and unreasonable allocations before changing the scene',async t=>{
  const {make,image,created}=environment(t),engine=make({effect:'glass',cellSize:16});
  const base={texture:image,width:100,height:80,regions:[{x:0,y:0,width:20,height:20}]};
  for(const invalid of [
    {...base,width:Infinity},{...base,height:0},{...base,width:9000},{...base,dpr:0},{...base,dpr:4},
    {...base,width:8192,height:8192,dpr:3},{...base,texture:{...image,complete:false}},{...base,texture:null},
    {...base,regions:null},{...base,regions:Array(257).fill(base.regions[0])},
    {...base,regions:[{x:NaN,y:0,width:20,height:20}]},{...base,regions:[{x:0,y:0,width:-1,height:20}]},
    {...base,width:2000,height:2000,regions:[{x:0,y:0,width:2000,height:2000}]},
  ])await assert.rejects(engine.prepareSnapshot(invalid));
  assert.equal(engine.state,'idle');assert.equal(engine.physics,undefined);assert.equal(created.length,0);
  await engine.prepareSnapshot({...base,regions:[{...base.regions[0],tag:'x'.repeat(200)}]});assert.equal(engine.regions[0].tag.length,128);
  await assert.rejects(engine.prepare(),/html2canvas/);assert.equal(engine.state,'ready');engine.dispose();
});

test('Replacing a snapshot clears the previous world, and a pending DOM render cannot overwrite newer input',async t=>{
  const {make,image,output}=environment(t);
  const source={getBoundingClientRect:()=>({left:0,top:0,width:100,height:80}),querySelectorAll:()=>[]};
  const engine=make({source});
  let finishDOM;globalThis.html2canvas=()=>new Promise(resolve=>{finishDOM=resolve;});
  const pending=engine.prepare();await Promise.resolve();
  await engine.prepareSnapshot({texture:image,width:100,height:80,regions:[{x:1,y:2,width:30,height:20,tag:'snapshot'}]});
  finishDOM(canvas());await pending;assert.equal(engine.regions[0].tag,'snapshot');assert.equal(engine.texture.width,100);
  const firstWorld=engine.physics.world;engine.start();engine.impactAt({x:15,y:15},{radius:40});
  await engine.prepareSnapshot({texture:image,width:120,height:90,regions:[{x:40,y:20,width:30,height:20,tag:'replacement'}]});
  assert.equal(firstWorld.bodies.length,0);assert.equal(engine.state,'ready');assert.equal(engine.frameId,null);
  assert.equal(engine.shots,0);assert.equal(engine.hits,0);assert.equal(engine.complete,false);assert.equal(engine.regions[0].tag,'replacement');
  assert.equal(output.width,120);engine.dispose();await engine.prepareSnapshot({});assert.equal(engine.state,'disposed');
});
