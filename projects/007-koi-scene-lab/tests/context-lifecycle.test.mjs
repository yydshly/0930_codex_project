import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {FeedLedger} from '../src/feed-ledger.js';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url)),{build}=require('esbuild');
const compiled=await build({stdin:{contents:"export * as THREE from 'three'; export {Courtyard,ViewportSSAOPass} from './scene.js'; export {RippleSimulation} from './ripples.js'; export {SimulationClock} from './simulation-clock.js'; export {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'context-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,Courtyard,ViewportSSAOPass,RippleSimulation,SimulationClock,EffectComposer}=runtime.exports;

function lifecycleFixture(){
 const c=Object.create(Courtyard.prototype),events=[],counts={clock:0,restore:0,renderSize:0,composerSize:0};
 c.simulationClock=new SimulationClock();c.clock={getDelta(){counts.clock++;return 90;}};c.settings={paused:true,autoTour:false};c.active=true;c.time=12;
 c.canvas={parentElement:{clientWidth:390,clientHeight:600}};c.camera=new THREE.PerspectiveCamera(51,1,.08,120);c.sun=new THREE.DirectionalLight();
 c.renderer={shadowMap:{enabled:true},getPixelRatio(){return 1.5;},setSize(){counts.renderSize++;}};c.composer={setSize(){counts.composerSize++;}};
 c.water={lastPass:{content:'kept'},restoreContext(){counts.restore++;this.lastPass=null;}};c.lastPausedShadowContent='kept';c.onStatus=status=>events.push(status);
 c.school={feeding:new FeedLedger()};const batch=c.school.feeding.begin(6,c.time),token=c.school.feeding.release(batch);c.school.feeding.land(token);
 c.interaction={mode:'feed',timer:1.9,feedBatch:batch};c.imported={name:'kept.glb'};c.poseHistory={current:{time:c.time}};
 c.updateDynamics=()=>{throw new Error('A lost context must not advance or refresh simulation.');};return {c,events,counts};
}

test('production context loss gates rendering and recovery retains active paused scene and feeding records',()=>{
 const {c,events,counts}=lifecycleFixture(),record=c.school.feeding.latest(),interaction=c.interaction,model=c.imported,pose=c.poseHistory.current,settings=c.settings;
 c.simulationClock.accumulator=.01;let prevented=0;c.handleContextLost({preventDefault(){prevented++;}});c.handleContextLost({preventDefault(){prevented++;}});
 assert.equal(prevented,2);assert.equal(c.active,false);assert.equal(c._active,true);assert.equal(events.length,1);assert.equal(c.simulationClock.accumulator,0);
 assert.equal(c.advanceFrame(90,{allowInactive:true}).steps,0);c.renderCurrent();c.renderInterpolated(1);assert.equal(c.time,12);
 c.handleContextRestored();c.handleContextRestored();assert.equal(counts.restore,1);assert.equal(c.active,true);assert.equal(c.settings,settings);assert.equal(c.settings.paused,true);
 assert.equal(c.interaction,interaction);assert.equal(c.imported,model);assert.equal(c.poseHistory.current,pose);assert.deepEqual(c.school.feeding.latest(),record);
 assert.equal(c.water.lastPass,null);assert.equal(c.lastPausedShadowContent,null);assert.equal(c.renderer.shadowMap.needsUpdate,true);assert.equal(c.sun.shadow.needsUpdate,true);assert.equal(c.discardNextFrame,true);
 assert.equal(counts.renderSize,1);assert.equal(counts.composerSize,1);assert.deepEqual(events.map(e=>e.context),['lost','restored']);
});

test('context recovery honors page changes and user pause changes made while the context is lost',()=>{
 const {c}=lifecycleFixture();c.settings.paused=false;c.handleContextLost({preventDefault(){}});c.active=false;c.settings.paused=true;c.handleContextRestored();
 assert.equal(c.active,false);assert.equal(c.settings.paused,true);c.active=true;assert.equal(c.active,true);assert.equal(c.discardNextFrame,true);
 c.handleContextLost({preventDefault(){}});c.active=false;c.active=true;c.settings.paused=false;c.handleContextRestored();assert.equal(c.active,true);assert.equal(c.settings.paused,false);assert.equal(c.simulationClock.accumulator,0);
});

test('the first production loop after restoration discards elapsed lost time before the next active tick',()=>{
 const {c}=lifecycleFixture();c.settings.paused=false;c.imported=null;c.renderer.info={render:{calls:0,triangles:0}};c.frames=0;c.avgMs=16.7;c.frameIndex=0;c.lastPerf=performance.now();c.renderInterpolated=()=>{};c.updateDynamics=dt=>{c.time+=dt;};
 const previousDocument=globalThis.document,previousRAF=globalThis.requestAnimationFrame;globalThis.document={hidden:false};globalThis.requestAnimationFrame=()=>{};
 try{c.handleContextLost({preventDefault(){}});c.loop();assert.equal(c.time,12);c.handleContextRestored();c.loop();assert.equal(c.time,12);assert.equal(c.simulationClock.totalSteps,0);c.loop();assert.ok(c.time>12&&c.time<12.21);assert.equal(c.simulationClock.totalSteps,12);}
 finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;if(previousRAF===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previousRAF;}
});

function rippleFixture(){
 let target={name:'previous-target'};const draws=[],disposals={textures:0,materials:0};
 const renderer={capabilities:{isWebGL2:true},extensions:{has(){return true;}},getRenderTarget(){return target;},setRenderTarget(value){target=value;},getClearColor(out){return out.set('#123456');},getClearAlpha(){return .4;},setClearColor(){},clear(){},render(scene){const material=scene.children[0].material,texture=material.uniforms.state.value;draws.push({target,texture,pixels:[...texture.image.data]});texture.addEventListener('dispose',()=>disposals.textures++);if(draws.length%2===1)material.addEventListener('dispose',()=>disposals.materials++);}};
 const simulation=new RippleSimulation(renderer,4);simulation.field.height.set(Array.from({length:16},(_,i)=>(i-8)*.005));simulation.field.velocity.set(Array.from({length:16},(_,i)=>i*.002));simulation.field.nextHeight.set(Array.from({length:16},(_,i)=>(8-i)*.004));simulation.field.nextVelocity.fill(-.01);
 simulation.index=1;simulation.texture=simulation.targets[1].texture;simulation.queue.push(new THREE.Vector4(.3,.4,.1,.03));simulation.stepCount=42;simulation.accumulator=.007;
 return {simulation,renderer,draws,disposals,originalTarget:target};
}

test('GPU context recovery seeds current and previous ripple targets from their CPU time levels without resetting state',()=>{
 const {simulation:s,renderer,draws,disposals,originalTarget}=rippleFixture(),field=s.field,material=s.material,mask=s.mask,queue=s.queue[0];
 const before=[...field.height],previous=[...field.nextHeight];s.restoreContext();assert.equal(draws.length,2);assert.equal(draws[0].target,s.targets[1]);assert.equal(draws[1].target,s.targets[0]);
 for(let i=0;i<16;i++){assert.equal(draws[0].pixels[i*4],THREE.DataUtils.toHalfFloat(before[i]));assert.equal(draws[0].pixels[i*4+1],THREE.DataUtils.toHalfFloat(field.velocity[i]));assert.equal(draws[1].pixels[i*4],THREE.DataUtils.toHalfFloat(previous[i]));assert.equal(draws[1].pixels[i*4+1],THREE.DataUtils.toHalfFloat(field.nextVelocity[i]));}
 assert.equal(s.field,field);assert.equal(s.mask,mask);assert.deepEqual([...field.height],before);assert.deepEqual([...field.nextHeight],previous);assert.equal(s.queue[0],queue);assert.equal(s.index,1);assert.equal(s.stepCount,42);assert.equal(s.accumulator,.007);assert.equal(s.texture,s.targets[1].texture);
 assert.equal(s.scene.children[0].material,material);assert.equal(renderer.getRenderTarget(),originalTarget);assert.deepEqual(disposals,{textures:2,materials:1});
 s.restoreContext();assert.equal(draws.length,4);assert.deepEqual(disposals,{textures:4,materials:2});assert.equal(s.stepCount,42);
});

test('ripple recovery releases temporary GPU inputs and restores renderer state when a copy fails',()=>{
 const {simulation:s,renderer,draws,disposals,originalTarget}=rippleFixture(),render=renderer.render;renderer.render=scene=>{render(scene);throw new Error('copy failed');};
 const material=s.material;assert.throws(()=>s.restoreContext(),/copy failed/);assert.equal(renderer.getRenderTarget(),originalTarget);assert.equal(s.scene.children[0].material,material);assert.equal(draws[0].texture.version,1);assert.deepEqual(disposals,{textures:1,materials:1});
});

test('production resize keeps the original SSAO cap and avoids all target reallocations at equal viewport sizes',()=>{
 const {c,counts}=lifecycleFixture();c.imported=null;c.renderer.getSize=out=>out.set(390,600);c.ssao=new ViewportSSAOPass(new THREE.Scene(),c.camera,1.5);c.composer=new EffectComposer(c.renderer);c.composer.addPass(c.ssao);
 const targets=[c.composer.renderTarget1,c.composer.renderTarget2,c.ssao.normalRenderTarget,c.ssao.ssaoRenderTarget,c.ssao.blurRenderTarget],disposed=[];targets.forEach((target,i)=>target.addEventListener('dispose',()=>disposed.push(i)));
 c.resize();assert.equal(c.camera.aspect,390/600);assert.equal(c.composer.renderTarget1.width,585);assert.equal(c.ssao.width,390);assert.equal(c.ssao.height,480);assert.equal(counts.renderSize,1);
 const after=disposed.length;c.resize();c.resize();assert.equal(counts.renderSize,1);assert.equal(disposed.length,after);
 c.canvas.parentElement.clientWidth=1280;c.canvas.parentElement.clientHeight=800;c.resize();assert.equal(c.camera.aspect,1.6);assert.equal(c.composer.renderTarget1.width,1920);assert.equal(c.ssao.width,720);assert.equal(c.ssao.height,480);
 assert.deepEqual(disposed.slice(after).sort(),[0,1,2,3,4]);const current=disposed.length;c.resize();assert.equal(disposed.length,current);assert.equal(counts.renderSize,2);
 c.canvas.parentElement.clientWidth=1600;c.resize();assert.deepEqual(disposed.slice(current).sort(),[0,1]);assert.equal(c.ssao.width,720);assert.equal(c.ssao.height,480);
 c.handleContextLost({preventDefault(){}});const lost=disposed.length;c.canvas.parentElement.clientHeight=600;c.resize();assert.equal(disposed.length,lost);assert.equal(counts.renderSize,3);
 c.handleContextRestored();assert.equal(c.camera.aspect,1600/600);assert.equal(counts.renderSize,4);assert.equal(c.ssao.height,480);
});

test('production status handler clears the context error overlay only after a restored notification',async()=>{
 const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8'),statusSource=source.slice(source.indexOf('function onStatus('),source.indexOf('function loadOriginal('));
 const loader={hidden:true,textContent:''},onStatus=new Function('$',`const courtyard=null,principlePanel=null,experimentPanel=null,bindingPanel=null,calibrationPanel=null,jsonPanel=null,tourPanel=null,feedingPanel=null,wildlifePanel=null;function toast(){};${statusSource}return onStatus;`)(id=>{assert.equal(id,'scene-loader');return loader;});
 onStatus({context:'lost',error:'context lost'});assert.equal(loader.hidden,false);assert.equal(loader.textContent,'context lost');onStatus({message:'still waiting'});assert.equal(loader.hidden,false);
 onStatus({context:'restored'});assert.equal(loader.hidden,true);assert.equal(loader.textContent,'');onStatus({error:'different error'});assert.equal(loader.hidden,false);
});
