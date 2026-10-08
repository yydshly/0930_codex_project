import {PerspectiveCamera,OrthographicCamera,Matrix4,Vector3,WebGPUCoordinateSystem} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GRID,DX,initialParticles,buildWorld} from './world.js';
import {TerrainFieldCache,ObjectFieldCache} from './voxel.js';
import {ObjectMeshCache} from './object-mesh.js';
import {DEFAULT_SCENE} from './project.js';
import {SourceUploadCache} from './sources.js';
import {createSimSlots,writeSimSlot} from './sim-params.js';
import {SIM,SCENE,WATER,FILTER,COMPOSITE} from './shaders.js';
const U=()=>GPUBufferUsage,T=()=>GPUTextureUsage;
export class WaterfallEngine {
  constructor(canvas,onStatus){this.canvas=canvas;this.onStatus=onStatus;this.state=structuredClone(DEFAULT_SCENE);this.errors=[];this.frame=0;this.elapsed=0;this.stats={fps:0,particles:0,steps:0};this.worldVersion=0;this.worldReady=0;this.selection=null;}
  async init(){
    if(!navigator.gpu)throw new Error('当前浏览器未启用 WebGPU。请用支持 WebGPU 的 Chrome 或 Edge 打开本地地址。');
    this.adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if(!this.adapter)throw new Error('未找到可用 WebGPU 设备。请检查浏览器硬件加速与显卡驱动。');
    this.device=await this.adapter.requestDevice();const d=this.device;
    d.addEventListener('uncapturederror',e=>{this.errors.push(e.error.message);if(!this.stopped){this.stopped=true;this.onStatus(e.error.message,true);}console.error(e.error.message);});
    d.lost.then(info=>{this.stopped=true;this.onStatus('图形设备已中断，请重新加载页面。'+info.message,true);});
    this.context=this.canvas.getContext('webgpu');this.format=navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device:d,format:this.format,alphaMode:'opaque',usage:T().RENDER_ATTACHMENT|T().COPY_SRC});
    this.camera=new PerspectiveCamera(43,1,.1,100);this.camera.coordinateSystem=WebGPUCoordinateSystem;this.camera.position.set(14,12,23);
    this.controls=new OrbitControls(this.camera,this.canvas);this.controls.target.set(-.35,4.15,-.5);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=1.5;this.controls.maxDistance=55;this.controls.maxPolarAngle=Math.PI*.94;this.controls.update();
    this.lightCamera=new OrthographicCamera(-13,13,14,-14,.1,55);this.lightCamera.coordinateSystem=WebGPUCoordinateSystem;
    this.frameUniform=this.buffer(384,U().UNIFORM|U().COPY_DST);this.frameData=new Float32Array(96);
    this.simLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},...[1,2,3].map(binding=>({binding,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}})),...[4,5].map(binding=>({binding,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}))]});
    const simModule=await this.module(SIM,'PB-MPM 3D');const layout=d.createPipelineLayout({bindGroupLayouts:[this.simLayout]});this.compute={};
    for(const key of ['prepare','p2g','updateGrid','g2p'])this.compute[key]=await d.createComputePipelineAsync({label:key,layout,compute:{module:simModule,entryPoint:key}});
    const sceneModule=await this.module(SCENE,'Forest and shadows'),waterModule=await this.module(WATER,'Fluid surface'),filterModule=await this.module(FILTER,'Bilateral filter'),compositeModule=await this.module(COMPOSITE,'Water optics');
    this.vertexLayout={arrayStride:36,attributes:[{shaderLocation:0,format:'float32x3',offset:0},{shaderLocation:1,format:'float32x3',offset:12},{shaderLocation:2,format:'float32x3',offset:24}]};
    this.scenePipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:sceneModule,entryPoint:'vs',buffers:[this.vertexLayout]},fragment:{module:sceneModule,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth32float',depthWriteEnabled:true,depthCompare:'less'}});
    this.shadowPipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:sceneModule,entryPoint:'shadowVS',buffers:[{arrayStride:36,attributes:[this.vertexLayout.attributes[0]]}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth32float',depthWriteEnabled:true,depthCompare:'less',depthBias:2,depthBiasSlopeScale:2}});
    this.skyPipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:sceneModule,entryPoint:'fullscreen'},fragment:{module:sceneModule,entryPoint:'skyFS',targets:[{format:'rgba16float'}]},depthStencil:{format:'depth32float',depthWriteEnabled:false,depthCompare:'always'}});
    this.waterPipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:waterModule,entryPoint:'waterVS'},fragment:{module:waterModule,entryPoint:'depthFS',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth32float',depthWriteEnabled:true,depthCompare:'less'}});
    this.thicknessPipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:waterModule,entryPoint:'waterVS'},fragment:{module:waterModule,entryPoint:'thicknessFS',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'one',dstFactor:'one'}}}]},depthStencil:{format:'depth32float',depthWriteEnabled:false,depthCompare:'less'}});
    this.filterPipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:filterModule,entryPoint:'fullscreen'},fragment:{module:filterModule,entryPoint:'blur',targets:[{format:'rgba16float'}]}});
    this.compositePipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:compositeModule,entryPoint:'fullscreen'},fragment:{module:compositeModule,entryPoint:'composite',targets:[{format:this.format}]}});
    this.shadow=this.texture(2048,2048,'depth32float');this.shadowSampler=d.createSampler({compare:'less',magFilter:'linear',minFilter:'linear'});
    this.shadowGroup=this.bind(this.shadowPipeline,[{binding:0,resource:{buffer:this.frameUniform}}]);
    this.skyGroup=this.bind(this.skyPipeline,[{binding:0,resource:{buffer:this.frameUniform}}]);
    this.sceneGroup=this.bind(this.scenePipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:this.shadow.createView()},{binding:2,resource:this.shadowSampler}]);
    this.blurH=this.buffer(new Float32Array([1,0,0,0]),U().UNIFORM|U().COPY_DST);this.blurV=this.buffer(new Float32Array([0,1,0,0]),U().UNIFORM|U().COPY_DST);
    this.terrainWorker=new Worker(new URL('./terrain-worker.js'+new URL(import.meta.url).search,document.baseURI),{type:'module'});
    this.terrainWorker.onmessage=({data})=>{this.terrainBusy=false;if(data.version===this.worldVersion){if(data.error){this.onStatus('地形重建失败：'+data.error,true);}else{this.setWorldMesh(data.mesh);this.worldReady=data.version;document.body.dataset.terrain='ready';}}const next=this.pendingTerrain;this.pendingTerrain=null;if(next){this.terrainBusy=true;this.terrainWorker.postMessage(next);}};
    this.terrainWorker.onerror=e=>this.onStatus('地形编辑工作线程中断：'+e.message,true);
    this.reset();this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas);
    this.stats.adapter=this.adapter.info?.description||this.adapter.info?.device||'WebGPU';this.onStatus('水流已就绪');
    this.previous=performance.now();this.fpsTime=this.previous;this.fpsFrames=0;this.accumulator=0;this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
  }
  buffer(sizeOrData,usage){const data=typeof sizeOrData==='number'?null:sizeOrData;const b=this.device.createBuffer({size:data?Math.ceil(data.byteLength/4)*4:sizeOrData,usage,mappedAtCreation:!!data});if(data){new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));b.unmap();}return b;}
  texture(w,h,format){return this.device.createTexture({size:[w,h],format,usage:T().RENDER_ATTACHMENT|T().TEXTURE_BINDING|T().COPY_SRC|T().COPY_DST});}
  bind(pipeline,entries){return this.device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries});}
  async module(code,label){const m=this.device.createShaderModule({code,label});const result=await m.getCompilationInfo();const errors=result.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(label+': '+errors.map(x=>`line ${x.lineNum}: ${x.message}`).join('\n'));return m;}
  reset(){
    const previous=this.resources||[];this.resources=[];for(const resource of previous)resource.destroy();
    const count={light:8192,fine:16384,cinema:24576,ultra:49152}[this.state.quality];this.count=count;this.stats.particles=count;
    this.particles=this.buffer(initialParticles(count,this.state.preset),U().STORAGE|U().COPY_DST|U().COPY_SRC);
    const cells=GRID.reduce((a,b)=>a*b,1);this.grid=this.buffer(cells*20,U().STORAGE|U().COPY_DST);this.gridVelocity=this.buffer(cells*16,U().STORAGE|U().COPY_DST);
    this.terrainCache??=new TerrainFieldCache();this.terrainField=this.terrainCache.update(this.state.preset,this.state.edits);this.collisionCache??=new ObjectFieldCache();this.collisionField=this.collisionCache.update(this.terrainField,this.state.objects,this.terrainCache.revision).field;this.collisionRevision=(this.collisionRevision||0)+1;this.solid=this.buffer(this.collisionField,U().STORAGE|U().COPY_DST);
    this.sourceCapacity=0;this.sourcesBuffer=null;this.uniforms=[];this.simGroups=[];this.resources.push(this.particles,this.grid,this.gridVelocity,this.solid);
    for(let i=0;i<12;i++){const uniform=this.buffer(80,U().UNIFORM|U().COPY_DST);this.uniforms.push(uniform);this.resources.push(uniform);}
    this.simData??=createSimSlots();this.updateSources(true);
    this.waterGroup=this.bind(this.waterPipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:{buffer:this.particles}}]);
    this.thicknessGroup=this.bind(this.thicknessPipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:{buffer:this.particles}}]);
    this.rebuildWorld(true);this.frame=0;this.stats.steps=0;this.accumulator=0;
  }
  setWorldMesh(vertices){this.mesh?.destroy();this.mesh=this.buffer(vertices,U().VERTEX);this.vertexCount=vertices.length/9;this.shadowDirty=true;}
  rebuildWorld(terrainChanged=false){
    const key=this.state.preset+':'+this.state.season;
    if(terrainChanged||key!==this.worldKey){this.worldKey=key;this.worldVersion++;this.pendingTerrain=null;if(!this.state.edits.length){this.setWorldMesh(buildWorld(this.state.preset,this.state.season,[]));this.worldReady=this.worldVersion;document.body.dataset.terrain='ready';}else{if(!this.mesh)this.setWorldMesh(buildWorld(this.state.preset,this.state.season,[]));document.body.dataset.terrain='building';const task={version:this.worldVersion,preset:this.state.preset,season:this.state.season,edits:this.state.edits};if(this.terrainBusy)this.pendingTerrain=task;else{this.terrainBusy=true;this.terrainWorker.postMessage(task);}}}
    this.objectMeshCache??=new ObjectMeshCache();const update=this.objectMeshCache.update(this.state.objects,this.selection);
    if(update.rebuilt){this.objectMesh?.destroy();this.objectMesh=null;this.objectVertexCount=update.data.length/9;if(update.data.length)this.objectMesh=this.buffer(update.data,U().VERTEX|U().COPY_DST);}
    else for(const patch of update.patches)this.device.queue.writeBuffer(this.objectMesh,patch.offset*4,patch.data);
    if(update.changed)this.shadowDirty=true;
  }
  updateObjects(movingIndices=[]){this.collisionCache??=new ObjectFieldCache();const update=this.collisionCache.update(this.terrainField,this.state.objects,this.terrainCache?.revision||0,movingIndices);this.collisionField=update.field;if(update.changed){this.collisionRevision=(this.collisionRevision||0)+1;this.device.queue.writeBuffer(this.solid,0,this.collisionField);}}
  updateTerrain(){this.terrainField=this.terrainCache.update(this.state.preset,this.state.edits);this.updateObjects();this.rebuildWorld(true);}
  updateSources(force=false){
    this.sourceCache??=new SourceUploadCache();const packed=this.sourceCache.update(this.state,force);this.sourceCount=packed.count;this.sourceFlow=packed.total;
    if(packed.count>this.sourceCapacity){const previous=this.sourcesBuffer;this.sourceCapacity=2**Math.ceil(Math.log2(Math.max(1,packed.count)));this.sourcesBuffer=this.buffer(this.sourceCapacity*32,U().STORAGE|U().COPY_DST);this.resources.push(this.sourcesBuffer);this.simGroups=this.uniforms.map(uniform=>this.device.createBindGroup({layout:this.simLayout,entries:[uniform,this.particles,this.grid,this.gridVelocity,this.solid,this.sourcesBuffer].map((buffer,binding)=>({binding,resource:{buffer}}))}));if(previous){this.resources=this.resources.filter(r=>r!==previous);previous.destroy();}}
    if(packed.changed)this.device.queue.writeBuffer(this.sourcesBuffer,0,packed.data);
  }
  cameraState(){return {position:this.camera.position.toArray(),target:this.controls.target.toArray()};}
  restoreCamera(camera){if(camera){this.camera.position.fromArray(camera.position);this.controls.target.fromArray(camera.target);this.controls.update();}}
  focusAt(target,radius=2){const offset=this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(Math.max(2,radius*3.6));this.controls.target.fromArray(target);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
  resize(){
    const ratio={light:.8,fine:1,cinema:1.4,ultra:1.65}[this.state.quality];const scale=Math.min(devicePixelRatio,1.5)*ratio;
    const fitted=Math.min(scale,2200/Math.max(1,this.canvas.clientWidth),1600/Math.max(1,this.canvas.clientHeight));
    const width=Math.max(1,Math.round(this.canvas.clientWidth*fitted)),height=Math.max(1,Math.round(this.canvas.clientHeight*fitted));
    if(this.width===width&&this.height===height)return;this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();for(const texture of Object.values(this.targets||{}))texture.destroy();
    this.targets={scene:this.texture(width,height,'rgba16float'),depth:this.texture(width,height,'depth32float'),waterDepth:this.texture(width,height,'depth32float'),water:this.texture(width,height,'rgba16float'),blur:this.texture(width,height,'rgba16float'),smooth:this.texture(width,height,'rgba16float'),thickness:this.texture(width,height,'rgba16float')};
    const t=this.targets;
    this.filterGroups=[this.bind(this.filterPipeline,[{binding:1,resource:t.water.createView()},{binding:2,resource:{buffer:this.blurH}}]),this.bind(this.filterPipeline,[{binding:1,resource:t.blur.createView()},{binding:2,resource:{buffer:this.blurV}}]),this.bind(this.filterPipeline,[{binding:1,resource:t.smooth.createView()},{binding:2,resource:{buffer:this.blurH}}])];
    this.compositeGroup=this.bind(this.compositePipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:t.scene.createView()},{binding:2,resource:t.smooth.createView()},{binding:3,resource:t.thickness.createView()},{binding:4,resource:t.depth.createView()}]);
  }
  writeFrame(time){
    this.controls.update();this.camera.updateMatrixWorld();const vp=new Matrix4().multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);const inv=vp.clone().invert();
    const light=this.state.sun===1?new Vector3(-.6,.65,.5):new Vector3(-.45,.82,-.3);light.normalize();this.lightCamera.position.copy(light.clone().multiplyScalar(24).add(new Vector3(0,4,0)));this.lightCamera.lookAt(0,4,0);this.lightCamera.updateMatrixWorld();this.lightCamera.updateProjectionMatrix();const lvp=new Matrix4().multiplyMatrices(this.lightCamera.projectionMatrix,this.lightCamera.matrixWorldInverse);
    const a=this.frameData;a.set(vp.elements,0);a.set(this.camera.matrixWorldInverse.elements,16);a.set(inv.elements,32);a.set(lvp.elements,48);a.set([...this.camera.position.toArray(),0],64);a.set([...light.toArray(),this.state.sun===1?1.4:1.0],68);a.set([this.width,this.height,time,.169*Math.cbrt(16384/this.count)],72);a.set([this.state.exposure,this.state.mode,this.state.waterStyle||0,this.state.foam??.65],76);const m=this.camera.matrixWorld.elements;a.set([m[0],m[1],m[2],0],80);a.set([m[4],m[5],m[6],0],84);this.device.queue.writeBuffer(this.frameUniform,0,a);
  }
  simulate(encoder,substeps=2){
    this.updateSources();
    for(let sub=0;sub<substeps;sub++){
      for(let iter=0;iter<3;iter++){
        const slot=sub*3+iter;this.device.queue.writeBuffer(this.uniforms[slot],0,writeSimSlot(this.simData[slot],this.state,this.count,this.stats.steps+sub,iter,this.sourceCount,this.sourceFlow));
      }
      let pass=encoder.beginComputePass();pass.setPipeline(this.compute.prepare);pass.setBindGroup(0,this.simGroups[sub*3]);pass.dispatchWorkgroups(Math.ceil(this.count/128));pass.end();
      for(let iter=0;iter<3;iter++){
        encoder.clearBuffer(this.grid);pass=encoder.beginComputePass();pass.setBindGroup(0,this.simGroups[sub*3+iter]);
        pass.setPipeline(this.compute.p2g);pass.dispatchWorkgroups(Math.ceil(this.count/128));pass.setPipeline(this.compute.updateGrid);pass.dispatchWorkgroups(Math.ceil(GRID.reduce((a,b)=>a*b,1)/128));pass.setPipeline(this.compute.g2p);pass.dispatchWorkgroups(Math.ceil(this.count/128));pass.end();
      }
    }
    this.stats.steps+=substeps;this.frame++;
  }
  colorAttachment(texture,clear=[0,0,0,0]){return {view:texture.createView(),clearValue:clear,loadOp:'clear',storeOp:'store'};}
  render(encoder,outputTexture=null){
    const t=this.targets;
    if(this.shadowDirty){const pass=encoder.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:this.shadow.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});pass.setPipeline(this.shadowPipeline);pass.setBindGroup(0,this.shadowGroup);pass.setVertexBuffer(0,this.mesh);pass.draw(this.vertexCount);if(this.objectMesh){pass.setVertexBuffer(0,this.objectMesh);pass.draw(this.objectVertexCount);}pass.end();this.shadowDirty=false;}
    let pass=encoder.beginRenderPass({colorAttachments:[this.colorAttachment(t.scene)],depthStencilAttachment:{view:t.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});pass.setPipeline(this.skyPipeline);pass.setBindGroup(0,this.skyGroup);pass.draw(3);pass.setPipeline(this.scenePipeline);pass.setBindGroup(0,this.sceneGroup);pass.setVertexBuffer(0,this.mesh);pass.draw(this.vertexCount);if(this.objectMesh){pass.setVertexBuffer(0,this.objectMesh);pass.draw(this.objectVertexCount);}pass.end();
    encoder.copyTextureToTexture({texture:t.depth},{texture:t.waterDepth},[this.width,this.height]);
    pass=encoder.beginRenderPass({colorAttachments:[this.colorAttachment(t.water)],depthStencilAttachment:{view:t.waterDepth.createView(),depthLoadOp:'load',depthStoreOp:'store'}});pass.setPipeline(this.waterPipeline);pass.setBindGroup(0,this.waterGroup);pass.draw(6,this.count);pass.end();
    pass=encoder.beginRenderPass({colorAttachments:[this.colorAttachment(t.thickness)],depthStencilAttachment:{view:t.depth.createView(),depthLoadOp:'load',depthStoreOp:'store'}});pass.setPipeline(this.thicknessPipeline);pass.setBindGroup(0,this.thicknessGroup);pass.draw(6,this.count);pass.end();
    const rounds=Math.max(1,Math.min(3,Math.round(this.state.surfaceSmoothing??1)));
    for(let round=0;round<rounds;round++)for(let i=0;i<2;i++){pass=encoder.beginRenderPass({colorAttachments:[this.colorAttachment(i?t.smooth:t.blur)]});pass.setPipeline(this.filterPipeline);pass.setBindGroup(0,this.filterGroups[i?1:round?2:0]);pass.draw(3);pass.end();}
    pass=encoder.beginRenderPass({colorAttachments:[{view:(outputTexture||this.context.getCurrentTexture()).createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.compositePipeline);pass.setBindGroup(0,this.compositeGroup);pass.draw(3);pass.end();
  }
  async animate(now){if(this.stopped)return;const delta=Math.min((now-this.previous)/1000,.05);this.elapsed+=delta;this.previous=now;this.writeFrame(this.elapsed);const encoder=this.device.createCommandEncoder();if(!this.state.paused){this.accumulator=Math.min(this.accumulator+delta*this.state.speed,.05);const steps=Math.min(4,Math.floor(this.accumulator*120));if(steps){this.simulate(encoder,steps);this.accumulator-=steps/120;}}else this.accumulator=0;this.render(encoder);this.device.queue.submit([encoder.finish()]);await this.device.queue.onSubmittedWorkDone();this.fpsFrames++;if(now-this.fpsTime>700){this.stats.fps=Math.round(this.fpsFrames*1000/(now-this.fpsTime));this.fpsFrames=0;this.fpsTime=now;}requestAnimationFrame(this.animate);}
  setView(view){const positions={wide:[14,12,23],close:[7.5,7.5,11],top:[.2,24,5],side:[18,8,1]};this.camera.position.fromArray(positions[view]||positions.wide);this.controls.target.set(-.35,4.15,-.5);this.controls.update();}
  async readParticles(){const size=this.count*80;const read=this.buffer(size,U().COPY_DST|U().MAP_READ);const e=this.device.createCommandEncoder();e.copyBufferToBuffer(this.particles,0,read,0,size);this.device.queue.submit([e.finish()]);await read.mapAsync(GPUMapMode.READ);const result=new Float32Array(read.getMappedRange().slice(0));read.unmap();read.destroy();return result;}
  async screenshot(){const width=this.width,height=this.height;const bytesPerRow=Math.ceil(width*4/256)*256;const read=this.buffer(bytesPerRow*height,U().COPY_DST|U().MAP_READ);const texture=this.texture(width,height,this.format);const encoder=this.device.createCommandEncoder();this.render(encoder,texture);encoder.copyTextureToBuffer({texture},{buffer:read,bytesPerRow},[width,height]);this.device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ);const bytes=new Uint8Array(read.getMappedRange());const rgba=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)rgba.set(bytes.subarray(y*bytesPerRow,y*bytesPerRow+width*4),y*width*4);if(this.format.startsWith('bgra'))for(let i=0;i<rgba.length;i+=4){const b=rgba[i];rgba[i]=rgba[i+2];rgba[i+2]=b;}const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d').putImageData(new ImageData(rgba,width,height),0,0);read.unmap();read.destroy();texture.destroy();return new Promise(resolve=>c.toBlob(resolve,'image/png'));}
}
