import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build,stop} from '../tooling/node_modules/esbuild/lib/main.js';
import {createSimSlots} from '../src/sim-params.js';
import {buildWorld} from '../src/world.js';
import {TerrainFieldCache,combineObjects} from '../src/voxel.js';

const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/gpu.js',import.meta.url))],bundle:true,platform:'node',format:'esm',target:'es2022',write:false,nodePaths:[fileURLToPath(new URL('../tooling/node_modules',import.meta.url))],logLevel:'silent'});
stop();
const {WaterfallEngine}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));

test('actual simulation dispatch uses independent slots and skips unchanged source uploads',()=>{
  const engine=new WaterfallEngine({},()=>{}),writes=[],dispatches=[];
  engine.count=49152;engine.stats.steps=50;engine.uniforms=Array.from({length:12},(_,slot)=>({slot}));engine.simGroups=engine.uniforms;engine.simData=createSimSlots();engine.sourceCapacity=8;engine.sourcesBuffer={source:true};engine.grid={};
  engine.device={queue:{writeBuffer(buffer,offset,data){const bytes=data instanceof ArrayBuffer?new Uint8Array(data):new Uint8Array(data.buffer,data.byteOffset,data.byteLength);writes.push({buffer,bytes:bytes.slice()});}}};
  engine.compute={prepare:'prepare',p2g:'p2g',updateGrid:'updateGrid',g2p:'g2p'};
  const encoder={clearBuffer(){},beginComputePass(){let pipeline,group;return {setPipeline(value){pipeline=value;},setBindGroup(index,value){group=value;},dispatchWorkgroups(n){dispatches.push({pipeline,group,n});},end(){}};}};
  engine.simulate(encoder,4);assert.equal(dispatches.length,40);assert.equal(writes.filter(w=>w.buffer.source).length,1);
  const parameters=writes.filter(w=>!w.buffer.source);assert.equal(parameters.length,12);
  parameters.forEach(({buffer,bytes},i)=>{assert.equal(buffer.slot,i);const u=new Uint32Array(bytes.buffer);assert.equal(u[12],50+Math.floor(i/3));assert.equal(u[13],i%3);assert.equal(u[14],i%3===2?1:0);});
  engine.state.flow=.5;engine.simulate(encoder,2);assert.equal(writes.filter(w=>w.buffer.source).length,1);
  assert.equal(new Float32Array(writes.at(-1).bytes.buffer)[11],.5);assert.equal(new Uint32Array(parameters[0].bytes.buffer)[12],50);
  engine.state.sourceConfig.enabled=false;engine.simulate(encoder,1);assert.equal(writes.filter(w=>w.buffer.source).length,2);assert.equal(new Float32Array(writes.at(-1).bytes.buffer)[11],0);assert.equal(engine.stats.steps,57);
});

test('actual resize and render preserve texture dependencies at every smoothing level',()=>{
  globalThis.devicePixelRatio=1;
  for(const level of [1,2,3]){
    const engine=new WaterfallEngine({clientWidth:640,clientHeight:360},()=>{}),passes=[];
    engine.state.surfaceSmoothing=level;engine.count=8192;engine.vertexCount=3;engine.camera={updateProjectionMatrix(){}};
    engine.texture=()=>{const texture={destroy(){},createView(){return {texture};}};return texture;};
    engine.bind=(pipeline,entries)=>({pipeline,entries});engine.blurH={};engine.blurV={};engine.frameUniform={};
    for(const name of ['scene','sky','shadow','water','thickness','filter','composite'])engine[name+'Pipeline']=name;
    engine.resize();engine.context={getCurrentTexture:()=>engine.texture()};engine.mesh={terrain:true};engine.objectMesh={objects:true};engine.objectVertexCount=696;engine.shadow=engine.texture();engine.shadowDirty=true;const draws=[];
    const encoder={copyTextureToTexture(){},beginRenderPass(options){const pass={target:options.colorAttachments[0]?.view.texture};let vertex;return {setPipeline(value){pass.pipeline=value;},setBindGroup(index,value){pass.group=value;},setVertexBuffer(slot,value){vertex=value;},draw(count){draws.push({pipeline:pass.pipeline,vertex,count});},end(){passes.push(pass);}};}};
    engine.render(encoder);const filters=passes.filter(p=>p.pipeline==='filter');assert.equal(filters.length,level*2);
    const produced=new Set([engine.targets.water]);
    filters.forEach((pass,i)=>{const input=pass.group.entries.find(e=>e.binding===1).resource.texture;assert.ok(produced.has(input));assert.notEqual(input,pass.target);assert.equal(pass.target,i%2?engine.targets.smooth:engine.targets.blur);produced.add(pass.target);});
    assert.equal(filters.at(-1).target,engine.targets.smooth);assert.equal(passes.at(-1).pipeline,'composite');
    for(const pipeline of ['shadow','scene'])assert.deepEqual(draws.filter(d=>d.pipeline===pipeline).map(d=>[d.vertex,d.count]),[[engine.mesh,3],[engine.objectMesh,696]]);
  }
});

test('actual object mesh updates patch the retained buffer and destroy it only on layout changes',()=>{
  const previousUsage=globalThis.GPUBufferUsage;globalThis.GPUBufferUsage={VERTEX:1,COPY_DST:4};
  try{
    const engine=new WaterfallEngine({},()=>{}),buffers=[],writes=[];engine.worldKey='0:summer';
    engine.state.objects=[{id:'rock',type:'rock',position:[0,3,1],scale:[.5,.5,.5],rotation:0}];
    engine.buffer=(data,usage)=>{const buffer={data:data.slice(),usage,destroyed:0,destroy(){this.destroyed++;}};buffers.push(buffer);return buffer;};
    engine.device={queue:{writeBuffer(buffer,offset,data){assert.equal(buffer.destroyed,0);buffer.data.set(data,offset/4);writes.push({buffer,offset});}}};
    engine.rebuildWorld();assert.equal(buffers.length,1);assert.ok(engine.objectVertexCount>0);assert.equal(buffers[0].usage,5);engine.shadowDirty=false;
    engine.rebuildWorld();assert.equal(buffers.length,1);assert.equal(engine.shadowDirty,false);assert.equal(buffers[0].destroyed,0);
    engine.state.edits.push({op:'cut',center:[0,2,0],radius:.4});engine.rebuildWorld();assert.equal(buffers.length,1);
    engine.selection=0;engine.rebuildWorld();assert.equal(buffers.length,1);assert.equal(writes.length,1);assert.equal(buffers[0].destroyed,0);
    engine.state.objects[0].rotation=.5;engine.rebuildWorld();assert.equal(buffers.length,1);assert.equal(writes.length,2);assert.deepEqual(buffers[0].data,buildWorld(0,'summer',[{...engine.state.objects[0],selected:true}],true));
    engine.state.objects=[];engine.selection=null;engine.rebuildWorld();assert.equal(buffers.length,1);assert.equal(buffers[0].destroyed,1);assert.equal(engine.objectMesh,null);assert.equal(engine.objectVertexCount,0);
    engine.rebuildWorld();assert.equal(buffers[0].destroyed,1);
  }finally{globalThis.GPUBufferUsage=previousUsage;}
});

test('actual grouped selection highlights every chosen object and retains the cached mesh',()=>{
  const previousUsage=globalThis.GPUBufferUsage;globalThis.GPUBufferUsage={VERTEX:1,COPY_DST:4};
  try{
    const engine=new WaterfallEngine({},()=>{}),writes=[];engine.worldKey='0:summer';engine.state.objects=[{id:'a',type:'rock',position:[0,3,1],scale:[.5,.5,.5],rotation:0},{id:'b',type:'rock',position:[2,3,1],scale:[.5,.5,.5],rotation:0}];
    engine.buffer=data=>({data:data.slice(),destroy(){}});engine.device={queue:{writeBuffer(buffer,offset,data){buffer.data.set(data,offset/4);writes.push({offset,data});}}};engine.selection=[0,1];engine.rebuildWorld();
    const second=buildWorld(0,'summer',[engine.state.objects[0]],true).length,buffer=engine.objectMesh;assert.ok(buffer.data[6]>.5);assert.ok(buffer.data[second+6]>.5);
    engine.rebuildWorld();assert.equal(writes.length,0);engine.selection=[1];engine.rebuildWorld();assert.equal(writes.length,1);assert.equal(writes[0].offset,0);assert.equal(writes[0].data.length,second);assert.equal(engine.objectMesh,buffer);assert.ok(buffer.data[6]<.5);assert.ok(buffer.data[second+6]>.5);
  }finally{globalThis.GPUBufferUsage=previousUsage;}
});

test('actual collision uploads skip unchanged objects and track terrain revisions during a drag',()=>{
  const engine=new WaterfallEngine({},()=>{}),writes=[];engine.terrainCache=new TerrainFieldCache();engine.terrainField=engine.terrainCache.update(0,[]);engine.solid={};
  engine.state.objects=[{id:'rock',type:'rock',position:[0,3,1],scale:[.7,.5,.6],rotation:.4}];engine.device={queue:{writeBuffer(buffer,offset,data){assert.equal(buffer,engine.solid);writes.push(data.slice());}}};
  engine.updateObjects([0]);const revision=engine.collisionRevision,field=engine.collisionField;engine.updateObjects([0]);assert.equal(writes.length,1);assert.equal(engine.collisionRevision,revision);
  engine.state.objects[0].position[0]=1;engine.updateObjects([0]);assert.equal(engine.collisionField,field);assert.equal(engine.collisionRevision,revision+1);assert.equal(writes.length,2);assert.equal(engine.collisionCache.staticBuilds,1);assert.deepEqual(writes.at(-1),combineObjects(engine.terrainField,engine.state.objects));
  engine.state.edits=[{op:'add',center:[-1,3,1],radius:.9}];engine.terrainField=engine.terrainCache.update(0,engine.state.edits);engine.updateObjects([0]);assert.equal(writes.length,3);assert.deepEqual(writes.at(-1),combineObjects(engine.terrainField,engine.state.objects));
  engine.state.objects=[];engine.updateObjects();assert.deepEqual(writes.at(-1),engine.terrainField);
});

test('actual simulation resets initialize the replacement solid buffer even when the field cache is unchanged',()=>{
  const previousUsage=globalThis.GPUBufferUsage;globalThis.GPUBufferUsage={VERTEX:1,STORAGE:2,COPY_DST:4,COPY_SRC:8,UNIFORM:16};
  try{
    const engine=new WaterfallEngine({},()=>{});engine.state.quality='light';engine.state.objects=[{id:'rock',type:'rock',position:[0,3,1],scale:[.5,.5,.5]}];
    engine.device={queue:{writeBuffer(){}},createBindGroup:()=>({})};engine.buffer=(data,usage)=>({data:typeof data==='number'?null:data.slice(),usage,destroyed:0,destroy(){this.destroyed++;}});engine.bind=()=>({});engine.rebuildWorld=()=>{};
    engine.reset();const old=engine.solid,field=engine.collisionField.slice();engine.reset();assert.equal(old.destroyed,1);assert.notEqual(engine.solid,old);assert.deepEqual(engine.solid.data,field);assert.equal(engine.collisionCache.staticBuilds,1);
    engine.state.objects=[];engine.state.preset=2;engine.reset();assert.deepEqual(engine.solid.data,engine.terrainField);assert.notDeepEqual(engine.solid.data,field);
  }finally{globalThis.GPUBufferUsage=previousUsage;}
});
