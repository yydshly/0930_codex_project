import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import assert from 'node:assert/strict';

const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const checks=[],errors=[],requests=[],evidence={};let fatal=null;
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name);};
try{
  const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
  await page.goto('http://127.0.0.1:8947/?validation=runtime-v10#scene',{timeout:90000});
  await page.waitForFunction(()=>window.__courtyard?.frameIndex>2,null,{timeout:120000});
  await page.evaluate(()=>window.__courtyard.active=false);
  const fixture=await build({stdin:{contents:'import * as THREE from "three";import {seeded} from "../src/geometry.js";import {isInPond} from "../src/config.js";import {turtleShoreClearance} from "../src/animal-water-motion.js";window.__runtimeMath={THREE,seeded,isInPond,turtleShoreClearance};',resolveDir:root+'tooling'},nodePaths:[root+'tooling/node_modules'],bundle:true,write:false,format:'iife'});
  await page.addScriptTag({content:fixture.outputFiles[0].text});
  check('实际 WebGL 场景提供统一帧推进入口和模拟时钟',await page.evaluate(()=>typeof window.__courtyard.advanceFrame==='function'&&!!window.__courtyard.simulationClock&&!window.__courtyard.renderer.getContext().isContextLost()));

  // The explicit allowInactive option isolates the production frame entry point from
  // the continuously scheduled browser RAF; the simulation itself is never mocked.
  evidence.schedules=await page.evaluate(()=>{
    const c=window.__courtyard,advance=dt=>c.advanceFrame(dt,{allowInactive:true}),runs=[];
    for(const hz of [20,60,120]){
      c.reset();c.active=false;c.updateSettings({surfaceWakes:false});c.interaction.random=window.__runtimeMath.seeded(452);c.feed();
      const dts=[],emissions=[],bites=[],samples=[];let previousEmitted=0,previousConsumed=0,previousSample=0;
      const original=c.updateDynamics;c.updateDynamics=function(dt){
        original.call(this,dt);if(dt>0){dts.push(dt);if(this.interaction.emitted!==previousEmitted){emissions.push({time:this.time,count:this.interaction.emitted});previousEmitted=this.interaction.emitted;}
          if(this.school.consumed!==previousConsumed){bites.push({time:this.time,count:this.school.consumed});previousConsumed=this.school.consumed;}
          const index=Math.round(this.time*60);if(index%60===0&&index!==previousSample){previousSample=index;samples.push({step:index,fish:this.school.fish.slice(0,this.settings.fishCount).map(f=>[...f.group.position.toArray(),f.heading,f.speed,f.phase.value,f.mouthOpen]),animals:{frog:[this.animals.frog.state,this.animals.frog.timer,...this.animals.frog.root.position.toArray()],turtle:[this.animals.turtle.state,this.animals.turtle.timer,...this.animals.turtle.root.position.toArray()],dragonflies:this.animals.dragonflies.map(d=>[d.state,d.timer,...d.root.position.toArray(),...d.root.quaternion.toArray()])},food:this.school.food.children.filter(m=>m.userData.particle).map(m=>[...m.position.toArray(),m.userData.particle.landed,m.userData.particle.eaten])});}
        }};
      let totalSteps=0,minAlpha=1,maxAlpha=0;try{for(let i=0;i<hz*10;i++){const r=advance(1/hz);totalSteps+=r.steps;minAlpha=Math.min(minAlpha,r.alpha);maxAlpha=Math.max(maxAlpha,r.alpha);}}finally{c.updateDynamics=original;}
      runs.push({hz,time:c.time,totalSteps,callbackSteps:dts.length,minDt:Math.min(...dts),maxDt:Math.max(...dts),minAlpha,maxAlpha,emissions,bites,samples,consumed:c.school.consumed,emitted:c.interaction.emitted,clock:JSON.parse(JSON.stringify(c.simulationClock))});
    }return runs;
  });
  check('20/60/120Hz 都推进600次固定1/60秒模拟',evidence.schedules.every(r=>r.totalSteps===600&&r.callbackSteps===600&&Math.abs(r.time-10)<1e-9&&Math.abs(r.minDt-1/60)<1e-12&&Math.abs(r.maxDt-1/60)<1e-12));
  check('不同渲染频率的每秒真实鱼群轨迹完全一致',evidence.schedules.every(r=>JSON.stringify(r.samples)===JSON.stringify(evidence.schedules[0].samples)));
  check('不同渲染频率的实际释放和吞食时刻完全一致',evidence.schedules.every(r=>r.emitted===6&&r.consumed===6&&JSON.stringify(r.emissions)===JSON.stringify(evidence.schedules[0].emissions)&&JSON.stringify(r.bites)===JSON.stringify(evidence.schedules[0].bites)));
  check('固定步返回的插值系数处于0到1之间',evidence.schedules.every(r=>r.minAlpha>=0&&r.maxAlpha<1));

  evidence.framePolicy=await page.evaluate(()=>{
    const c=window.__courtyard,advance=dt=>c.advanceFrame(dt,{allowInactive:true});c.reset();c.active=false;
    const state=()=>JSON.stringify({time:c.time,fish:c.school.fish.map(f=>[f.group.position.toArray(),f.phase.value]),frog:c.animals.frog.root.position.toArray(),turtle:c.animals.turtle.root.position.toArray(),food:c.school.food.children.map(m=>[m.position.toArray(),m.quaternion.toArray()]),leaves:[...c.lilies.children,...c.animals.pads].map(m=>[m.position.toArray(),m.quaternion.toArray()]),height:Array.from(c.water.simulation.field.height)});
    const half=advance(1/120),before=state();c.updateSettings({paused:true});let pauseSteps=0;for(let i=0;i<20;i++)pauseSteps+=advance(.5).steps;const frozen=before===state();c.updateSettings({paused:false});const resumed=advance(1/60),resumeTime=c.time;
    const beforeInactive=state(),inactive=c.advanceFrame(20),inactiveFrozen=beforeInactive===state(),afterInactive=advance(1/60);
    c.reset();c.active=false;const large=advance(20),largeTime=c.time;advance(1/120);c.reset();c.active=false;const resetHalf=advance(1/120);
    return {half,pauseSteps,frozen,resumed,resumeTime,inactive,inactiveFrozen,afterInactive,large,largeTime,resetHalf,clock:JSON.parse(JSON.stringify(c.simulationClock))};
  });
  check('半个步长只累积时间并返回0.5插值系数',evidence.framePolicy.half.steps===0&&Math.abs(evidence.framePolicy.half.alpha-.5)<1e-10);
  check('暂停冻结鱼、动物、九片叶片和实际CPU波场',evidence.framePolicy.pauseSteps===0&&evidence.framePolicy.frozen);
  check('恢复暂停只推进当前一步且丢弃暂停前半步余量',evidence.framePolicy.resumed.steps===1&&Math.abs(evidence.framePolicy.resumeTime-1/60)<1e-10&&evidence.framePolicy.resumed.alpha<1e-10);
  check('非活动帧不积累隐藏时间且恢复只推进当前一步',evidence.framePolicy.inactive.steps===0&&evidence.framePolicy.inactiveFrozen&&evidence.framePolicy.afterInactive.steps===1);
  check('20秒卡顿受12步追赶预算限制并报告丢弃时间',evidence.framePolicy.large.steps===12&&evidence.framePolicy.largeTime<=.200000001&&evidence.framePolicy.large.droppedSeconds>=19.79);
  check('reset清除上一帧的累计余量',evidence.framePolicy.resetHalf.steps===0&&Math.abs(evidence.framePolicy.resetHalf.alpha-.5)<1e-10);

  check('场景提供只在渲染期间应用的姿态插值入口',await page.evaluate(()=>typeof window.__courtyard.renderInterpolated==='function'));
  evidence.interpolation=await page.evaluate(()=>{
    const c=window.__courtyard;c.reset();c.active=false;c.updateSettings({pondScale:.65});c.updateDynamics(0);c.setView('shoal',true);c.feed();for(let i=0;i<120;i++)c.advanceFrame(1/60,{allowInactive:true});
    const snapshot=()=>{c.scene.updateMatrixWorld(true);return {time:c.time,waterTime:c.water.material.uniforms.time.value,fish:c.school.fish.map(f=>({position:f.group.position.toArray(),quaternion:f.group.quaternion.toArray(),matrix:f.group.matrix.elements.slice(),uniforms:Object.fromEntries(Object.entries(f.state).filter(([k,v])=>k.startsWith('u')&&typeof v?.value==='number').map(([k,v])=>[k,v.value]))})),hand:{position:c.interaction.rig.root.position.toArray(),quaternion:c.interaction.rig.root.quaternion.toArray(),bones:c.interaction.rig.mesh.skeleton.bones.map(b=>[b.position.toArray(),b.quaternion.toArray(),b.matrix.elements.slice()])},animals:[c.animals.frog.root,c.animals.turtle.root,...c.animals.dragonflies.map(d=>d.root)].map(m=>[m.position.toArray(),m.quaternion.toArray(),m.matrix.elements.slice()]),leaves:[...c.lilies.children,...c.animals.pads].map(m=>[m.position.toArray(),m.quaternion.toArray(),m.matrix.elements.slice()]),food:c.school.food.children.map(m=>[m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),m.visible])};};
    const from=snapshot();c.advanceFrame(1/60,{allowInactive:true});const to=snapshot(),original=c.composer.render;let seen=null;
    c.composer.render=function(...args){seen=snapshot();return original.apply(this,args);};try{c.renderInterpolated(.5);}finally{c.composer.render=original;}
    const restored=snapshot(),m=c.animals.pads[0].matrix.elements,{THREE}=window.__runtimeMath,shear=Math.abs(new THREE.Vector3(m[0],m[1],m[2]).normalize().dot(new THREE.Vector3(m[4],m[5],m[6]).normalize()));return {from,to,seen,restoredExactly:JSON.stringify(restored)===JSON.stringify(to),animalLeafLocalShear:shear,fishMoved:Math.hypot(...from.fish[0].position.map((v,i)=>v-to.fish[0].position[i])),midpointError:seen?Math.max(...seen.fish[0].position.map((v,i)=>Math.abs(v-(from.fish[0].position[i]+to.fish[0].position[i])/2))):Infinity};
  });
  check('真正composer渲染观察到两步之间的锦鲤姿态',!!evidence.interpolation.seen&&evidence.interpolation.fishMoved>1e-6&&evidence.interpolation.midpointError<1e-9);
  check('渲染插值后鱼、骨骼、动物、叶片、饲料、uniform和模拟时间完整恢复',evidence.interpolation.restoredExactly);
  check('实际非均匀父缩放叶片含剪切且插值后原矩阵完整保留',evidence.interpolation.animalLeafLocalShear>1e-5&&evidence.interpolation.restoredExactly);
  check('解析波面渲染时间与鱼姿态使用同一插值时刻',Math.abs(evidence.interpolation.seen.waterTime-(evidence.interpolation.from.waterTime+evidence.interpolation.to.waterTime)/2)<1e-9);
  await page.locator('#scene-canvas').screenshot({path:root+'assets/runtime-interpolation-v10.png',timeout:90000});

  evidence.gpuInterpolation=await page.evaluate(()=>{
    const c=window.__courtyard,{THREE}=window.__runtimeMath;c.reset();c.active=false;c.updateSettings({fishCount:0,surfaceWakes:false});c.water.addRipple(-.8,.7,c.time,.04);c.advanceFrame(1/60,{allowInactive:true});
    const w=c.water,s=w.simulation,size=32,probe=new THREE.WebGLRenderTarget(size,size,{type:THREE.FloatType,depthBuffer:false,stencilBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}),scene=new THREE.Scene();
    // Execute the runtime water material's exact rippleHeight() GLSL function.
    // G/B independently expose the actual previous/current texture samples.
    const prefix=w.material.fragmentShader.split('uniform sampler2D reflection')[0],material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{...w.material.uniforms,origin:{value:new THREE.Vector2(-1.55,-.05)},extent:{value:new THREE.Vector2(1.5,1.5)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:prefix+'\nvarying vec2 vUv;uniform vec2 origin,extent;void main(){vec2 p=origin+vUv*extent;gl_FragColor=vec4(rippleHeight(p),texture2D(ripplePrevious,rippleUV(p)).r,texture2D(ripple,rippleUV(p)).r,1.);}'}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);
    const previous=c.renderer.getRenderTarget(),frames=[];let maxBlendError=0,maxTextureChange=0,maxCpuError=0;
    try{for(const alpha of [0,.5,1]){w.setRenderInterpolation(alpha);const pixels=new Float32Array(size*size*4);c.renderer.setRenderTarget(probe);c.renderer.render(scene,new THREE.Camera());c.renderer.readRenderTargetPixels(probe,0,0,size,size,pixels);let peak=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,mixed=pixels[k],before=pixels[k+1],after=pixels[k+2];maxBlendError=Math.max(maxBlendError,Math.abs(mixed-(before*(1-alpha)+after*alpha)));maxTextureChange=Math.max(maxTextureChange,Math.abs(after-before));peak=Math.max(peak,Math.abs(mixed));const wx=-1.55+(x+.5)/size*1.5,wz=-.05+(y+.5)/size*1.5;maxCpuError=Math.max(maxCpuError,Math.abs(after-s.heightAt(wx,wz)));}frames.push({alpha,peak});}}
    finally{w.setRenderInterpolation(1);c.renderer.setRenderTarget(previous);probe.dispose();mesh.geometry.dispose();material.dispose();}
    return {enabled:s.enabled,samples:size*size*frames.length,frames,maxBlendError,maxTextureChange,maxCpuError,previousDifferent:w.material.uniforms.ripplePrevious.value!==w.material.uniforms.ripple.value};
  });
  check('实际水面GLSL对两张GPU波场在alpha=0/.5/1执行正确混合',evidence.gpuInterpolation.enabled&&evidence.gpuInterpolation.previousDifferent&&evidence.gpuInterpolation.samples===3072&&evidence.gpuInterpolation.maxTextureChange>.005&&evidence.gpuInterpolation.maxBlendError<1e-7);
  check('插值GPU探针的当前波场与真实CPU镜像误差小于0.5毫米',evidence.gpuInterpolation.maxCpuError<.0005&&evidence.gpuInterpolation.frames[2].peak>.005);

  evidence.ecology=await page.evaluate(()=>{
    const c=window.__courtyard,{THREE,turtleShoreClearance}=window.__runtimeMath,runs=[],worldPosition=node=>node.getWorldPosition(new THREE.Vector3()),relative=(node,pad)=>{c.animals.group.updateMatrixWorld(true);return pad.matrixWorld.clone().invert().multiply(node.matrixWorld).elements.slice();},delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i]))),advance=dt=>c.advanceFrame(dt,{allowInactive:true});
    for(const scale of [.65,1,1.25]){
      c.reset();c.active=false;c.updateSettings({pondScale:scale,wind:.95,fishCount:0,surfaceWakes:false});c.updateDynamics(0);
      const leaves=[...c.lilies.children,...c.animals.pads],record={scale,leafCount:leaves.length,leafSamples:0,leafHeightError:0,leafHorizontalError:0,leafNormalError:0,leafMinCurvature:Infinity,frogRestRelativeError:0,frogRestHeightChange:0,frogJump:{states:[],maxStep:0,peak:0,rippleCount:0,landingRelativeError:0},turtle:{states:[],maxStep:0,maxTurn:0,minShoreClearance:Infinity,minRelativeDepth:Infinity,maxRelativeDepth:-Infinity,swimSamples:0,splashes:0},dragonfly:{perchSamples:0,maxRelativeError:0}};
      for(const leaf of leaves){const p=leaf.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getY(i));hi=Math.max(hi,p.getY(i));}record.leafMinCurvature=Math.min(record.leafMinCurvature,hi-lo);}
      const sampleLeaves=()=>{c.scene.updateMatrixWorld(true);for(const pad of leaves){const a=pad.userData.anchor,s=c.water.sampleAtRest((a.x+.5)*scale-.5,(a.z+.15)*scale-.15,c.time),p=worldPosition(pad),normal=new THREE.Vector3(0,1,0).applyMatrix3(new THREE.Matrix3().getNormalMatrix(pad.matrixWorld)).normalize(),offset=pad.userData.waterPose?s.normal.map(n=>n*.006):[0,.006,0];record.leafSamples++;record.leafHeightError=Math.max(record.leafHeightError,Math.abs(p.y-s.y-offset[1]));record.leafHorizontalError=Math.max(record.leafHorizontalError,Math.hypot(p.x-s.x-offset[0],p.z-s.z-offset[2]));record.leafNormalError=Math.max(record.leafNormalError,Math.abs(1-normal.dot(new THREE.Vector3(...s.normal))));}};
      const f=c.animals.frog,firstRelative=relative(f.root,c.animals.pads[f.pad]),firstHeight=worldPosition(f.root).y;
      for(let i=0;i<120;i++){advance(1/60);record.frogRestRelativeError=Math.max(record.frogRestRelativeError,delta(firstRelative,relative(f.root,c.animals.pads[f.pad])));record.frogRestHeightChange=Math.max(record.frogRestHeightChange,Math.abs(worldPosition(f.root).y-firstHeight));if(i%8===0)sampleLeaves();}
      const originalRipple=c.water.addRipple;c.water.addRipple=function(x,z,time,strength,...rest){if(Math.abs(strength-.028)<1e-12)record.frogJump.rippleCount++;if(Math.abs(strength-.035)<1e-12)record.turtle.splashes++;return originalRipple.call(this,x,z,time,strength,...rest);};
      try{
        c.animals.activate('frog',c.time);let previous=worldPosition(f.root);
        for(let i=0;i<75;i++){advance(1/60);const now=worldPosition(f.root);record.frogJump.maxStep=Math.max(record.frogJump.maxStep,now.distanceTo(previous));record.frogJump.peak=Math.max(record.frogJump.peak,now.y-c.water.heightAt(now.x,now.z,c.time));if(record.frogJump.states.at(-1)!==f.state)record.frogJump.states.push(f.state);previous=now;if(i%8===0)sampleLeaves();}
        const landingRelative=relative(f.root,c.animals.pads[f.pad]);for(let i=0;i<30;i++){advance(1/60);record.frogJump.landingRelativeError=Math.max(record.frogJump.landingRelativeError,delta(landingRelative,relative(f.root,c.animals.pads[f.pad])));}f.nextJump=1e9;
        const t=c.animals.turtle;c.animals.activate('turtle',c.time);let previousT=worldPosition(t.root),previousQ=t.root.getWorldQuaternion(new THREE.Quaternion());const previousPerches=new Map();
        for(let i=0;i<2400;i++){
          advance(1/60);c.scene.updateMatrixWorld(true);const p=worldPosition(t.root),q=t.root.getWorldQuaternion(new THREE.Quaternion());record.turtle.maxStep=Math.max(record.turtle.maxStep,p.distanceTo(previousT));record.turtle.maxTurn=Math.max(record.turtle.maxTurn,q.angleTo(previousQ));previousT=p;previousQ=q;if(record.turtle.states.at(-1)!==t.state)record.turtle.states.push(t.state);
          if(t.state==='swim'){record.turtle.swimSamples++;const depth=c.water.heightAt(p.x,p.z,c.time)-p.y;record.turtle.minRelativeDepth=Math.min(record.turtle.minRelativeDepth,depth);record.turtle.maxRelativeDepth=Math.max(record.turtle.maxRelativeDepth,depth);record.turtle.minShoreClearance=Math.min(record.turtle.minShoreClearance,turtleShoreClearance(p,scale));}
          for(const d of c.animals.dragonflies){if(d.state==='perch'&&d.timer>.85){const current=relative(d.root,c.animals.pads[d.index%2]),before=previousPerches.get(d);if(before)record.dragonfly.maxRelativeError=Math.max(record.dragonfly.maxRelativeError,delta(before,current));previousPerches.set(d,current);record.dragonfly.perchSamples++;}else previousPerches.delete(d);}
          if(i%30===0)sampleLeaves();
        }
      }finally{c.water.addRipple=originalRipple;}
      runs.push(record);
    }return runs;
  });
  check('三种池塘倍率中九片睡莲都采用真实曲面几何',evidence.ecology.every(r=>r.leafCount===9&&r.leafMinCurvature>.008&&r.leafSamples>500));
  check('九片睡莲的实际世界位置与共同波面锚点一致',evidence.ecology.every(r=>r.leafHeightError<1e-8&&r.leafHorizontalError<1e-8));
  check('非均匀父缩放下九片叶片世界法线仍贴合共同波面',evidence.ecology.every(r=>r.leafNormalError<1e-8));
  check('青蛙停驻时随叶片起伏和倾斜且叶片局部姿态稳定',evidence.ecology.every(r=>r.frogRestRelativeError<1e-7&&r.frogRestHeightChange>.0001));
  check('青蛙真实跳跃连续并落回正在浮动的叶片',evidence.ecology.every(r=>JSON.stringify(r.frogJump.states)==='["jump","rest"]'&&r.frogJump.maxStep<.08&&r.frogJump.peak>.3&&r.frogJump.landingRelativeError<1e-7));
  check('青蛙每次落地只产生一次实际涟漪',evidence.ecology.every(r=>r.frogJump.rippleCount===1));
  check('乌龟完成进水游泳回岸状态且每次入水只产生一次涟漪',evidence.ecology.every(r=>JSON.stringify(r.turtle.states)==='["enter","swim","exit","bask"]'&&r.turtle.splashes===1&&r.turtle.swimSamples>1600));
  check('乌龟在三种倍率中保留整身岸距并采样相对水深',evidence.ecology.every(r=>r.turtle.minShoreClearance>=.39*r.scale-1e-5&&r.turtle.minRelativeDepth>.06&&r.turtle.maxRelativeDepth<.20));
  check('乌龟进出状态边界的真实位置和朝向没有瞬移',evidence.ecology.every(r=>r.turtle.maxStep<.05&&r.turtle.maxTurn<.15));
  check('蜻蜓真实停栖段持续跟随动态叶片的局部坐标系',evidence.ecology.every(r=>r.dragonfly.perchSamples>100&&r.dragonfly.maxRelativeError<1e-7));
  await page.evaluate(()=>{const c=window.__courtyard;c.setView('frog',true);c.renderCurrent();});await page.locator('#scene-canvas').screenshot({path:root+'assets/runtime-ecology-v10.png',timeout:90000});

  evidence.loop=await page.evaluate(()=>{const c=window.__courtyard;c.reset();c.active=false;c.__runtimeLoopFrames=[];c.__runtimeRawDurations=[];const original=c.advanceFrame;c.__runtimeAdvanceFrame=original;c.__runtimeGetDelta=c.clock.getDelta;c.advanceFrame=function(...args){const result=original.apply(this,args);this.__runtimeLoopFrames.push({seconds:args[0],steps:result.steps});return result;};c.active=true;let rawCalls=0;c.clock.getDelta=()=>{const raw=rawCalls++===0?20:1/60;c.__runtimeRawDurations.push(raw);return raw;};return c.frameIndex;});
  await page.waitForFunction(first=>window.__courtyard.frameIndex>first+1,evidence.loop,{timeout:120000});
  evidence.loop=await page.evaluate(()=>{const c=window.__courtyard;const frames=c.__runtimeLoopFrames,rawDurations=c.__runtimeRawDurations.slice();c.clock.getDelta=c.__runtimeGetDelta;c.active=false;c.advanceFrame=c.__runtimeAdvanceFrame;delete c.__runtimeAdvanceFrame;delete c.__runtimeGetDelta;delete c.__runtimeLoopFrames;delete c.__runtimeRawDurations;return {frames,rawDurations,time:c.time};});
  check('正式requestAnimationFrame循环调用同一个固定步入口',evidence.loop.frames.length>=2&&evidence.loop.time>0);
  check('真实非活动RAF恢复后的首帧丢弃20秒间隔且下一帧只推进一步',evidence.loop.rawDurations[0]===20&&evidence.loop.frames[0].seconds===0&&evidence.loop.frames[0].steps===0&&evidence.loop.frames[1].seconds===1/60&&evidence.loop.frames[1].steps===1);
  await page.evaluate(()=>{const c=window.__courtyard;c.reset();c.active=false;c.setView('shoal',true);for(let i=0;i<120;i++)c.advanceFrame(1/60,{allowInactive:true});c.renderCurrent();});
  await page.locator('#scene-canvas').screenshot({path:root+'assets/runtime-shoal-v10.png',timeout:90000});
  check('运行验证没有脚本或着色器错误',errors.length===0);
  check('运行资源全部从本地加载',requests.every(u=>u.startsWith('http://127.0.0.1:8947/')||u.startsWith('blob:')||u.startsWith('data:')));
}catch(e){fatal=e.stack||e.message;console.error(fatal);}
finally{
  await writeFile(root+'notes/runtime-v10-validation.json',JSON.stringify({clientDate:'2026-10-02',timeZone:'Asia/Shanghai',bundleSha256:createHash('sha256').update(await readFile(root+'web/app.js')).digest('hex'),checks,errors,fatal,evidence,method:'Real Chromium/SwiftShader. Production advanceFrame is driven at three frame frequencies with identical explicit initial conditions; updateDynamics callbacks record actual release, consumption and trajectory state. Browser RAF is separately observed to call the same entry point. Screenshots render the real composer. No hardware performance or photorealism claim.'},null,2));await browser.close();
}
console.log(JSON.stringify({passed:checks.length,errors,fatal}));assert.ok(!fatal&&errors.length===0,'v10 runtime validation failed');
