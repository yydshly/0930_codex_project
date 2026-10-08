import {createRequire} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const revision=process.argv.includes('--v10')?'v10':process.argv.includes('--v9')?'v9':process.argv.includes('--v8')?'v8':process.argv.includes('--v7')?'v7':process.argv.includes('--v6')?'v6':'v4';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const checks=[],failures=[],errors=[],requests=[],evidence={};
const check=(name,passed)=>{(passed?checks:failures).push(name);console.log((passed?'PASS ':'FAIL ')+name);};
let fatal=null;

function glb(){
 const positions=new Float32Array([-1,0,0,1,0,0,0,2,0]),bin=Buffer.from(positions.buffer);
 const data={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],
  materials:[{doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.3,.6,.4,1],roughnessFactor:1}}],buffers:[{byteLength:bin.length}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:bin.length}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-1,0,0],max:[1,2,0]}]};
 const json=Buffer.from(JSON.stringify(data)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
 const result=Buffer.alloc(12+8+padded.length+8+bin.length);result.writeUInt32LE(0x46546c67);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);
 result.writeUInt32LE(padded.length,12);result.writeUInt32LE(0x4e4f534a,16);padded.copy(result,20);const offset=20+padded.length;
 result.writeUInt32LE(bin.length,offset);result.writeUInt32LE(0x004e4942,offset+4);bin.copy(result,offset+8);return result;
}

try{
 const page=await browser.newPage({viewport:{width:1536,height:1120}});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:8947/#scene',{timeout:90000});
 await page.waitForFunction(()=>window.__courtyard?.frameIndex>2,null,{timeout:120000});
 await page.evaluate(()=>window.__courtyard.active=false);
 const advance=seconds=>page.evaluate(seconds=>{const c=window.__courtyard;for(let t=0;t<seconds-1e-8;t+=.025)c.updateDynamics(Math.min(.025,seconds-t));},seconds);
 const fixtureMath=await build({stdin:{contents:'import {Raycaster,Vector3} from "three";window.__KoiValidationMath={Raycaster,Vector3};',resolveDir:fileURLToPath(new URL('./',import.meta.url))},bundle:true,write:false,format:'iife'});
 await page.addScriptTag({content:fixtureMath.outputFiles[0].text});

 evidence.anatomy=await page.evaluate(()=>{
  const c=window.__courtyard,f=c.school.fish[0],g=f.body.geometry,p=g.attributes.position,lip=g.attributes.aLip;
  let outer=0,interior=0,depth=0,barbelsLeft=0,barbelsRight=0,valid=true;
  for(let i=0;i<p.count;i++){
   valid&&=Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i));
   if(lip.getX(i)>1.5){interior++;depth=Math.max(depth,.5-p.getX(i));}
   if(lip.getX(i)===1)outer++;
   // Slim appendages below and beside the lips are separate from the body rings.
   if(lip.getX(i)===.5&&p.getX(i)>.455&&p.getY(i)<-.011&&Math.abs(p.getZ(i))>.012){if(p.getZ(i)>0)barbelsLeft++;else barbelsRight++;}
  }
  const fin=f.fins.geometry.attributes.aFin,types={};for(let i=0;i<fin.count;i++)types[fin.getX(i)]=(types[fin.getX(i)]||0)+1;
  // Raycaster from the outside of each eye should hit its eyeball/pupil before the head.
  f.group.updateWorldMatrix(true,true);
  const eyeHits=f.eyes.map(eye=>{
   const globe=eye.children[0],center=globe.getWorldPosition(f.group.position.clone());
   const axis=eye.localToWorld(eye.position.clone().set(0,0,1)).sub(eye.getWorldPosition(f.group.position.clone())).normalize();
   const origin=center.clone().addScaledVector(axis,.12),ray=new window.__KoiValidationMath.Raycaster(origin,axis.clone().negate()),first=ray.intersectObject(f.group,true)[0];
   return {center:center.toArray(),axis:axis.toArray(),globeVertices:globe.geometry.attributes.position.count,pupilVertices:eye.children[1].geometry.attributes.position.count,visibleFromOutside:first?.object.parent===eye};
  });
  return {valid,bodyVertices:p.count,outerLipVertices:outer,interiorVertices:interior,recessMeters:depth,barbelsLeft,barbelsRight,finTypes:types,eyeHits,styles:[...new Set(c.school.fish.map(f=>f.style))]};
 });
 check('鱼体包含真实凹入口腔及可变形唇缘',evidence.anatomy.valid&&evidence.anatomy.outerLipVertices>40&&evidence.anatomy.interiorVertices>40&&evidence.anatomy.recessMeters>=.035);
 check('鱼嘴两侧均有立体口须',evidence.anatomy.barbelsLeft>50&&evidence.anatomy.barbelsRight>50);
 check('七类鱼鳍具有细分网格',Object.keys(evidence.anatomy.finTypes).length===7&&Object.values(evidence.anatomy.finTypes).every(n=>n>60));
 check('两侧眼球和瞳孔均为独立立体几何',evidence.anatomy.eyeHits.length===2&&evidence.anatomy.eyeHits.every(e=>e.globeVertices>200&&e.pupilVertices>100));
 check('双眼在头部外侧没有被鱼体遮埋',evidence.anatomy.eyeHits.every(e=>e.visibleFromOutside));
 check('池中有七种锦鲤花纹',evidence.anatomy.styles.length===7);

 await page.locator('#compare').evaluate(e=>e.value='100');await page.locator('#compare').dispatchEvent('input');
 await page.locator('#fish-inspect').click();
 check('锦鲤近景按钮清除参考图并建立观察对象',await page.evaluate(()=>!!window.__courtyard.followFish&&window.__courtyard.school.inspectionFish===window.__courtyard.followFish&&document.querySelector('#reference-overlay').hidden));
 await page.evaluate(()=>{const c=window.__courtyard,t=c.transition;c.camera.position.copy(t.to);c.controls.target.copy(t.toTarget);c.camera.fov=t.fov;c.camera.updateProjectionMatrix();c.transition=null;c.controls.update();c.active=true;});
 const frame=await page.evaluate(()=>window.__courtyard.frameIndex);await page.waitForFunction(n=>window.__courtyard.frameIndex>n+1,frame,{timeout:90000});
 evidence.near=await page.evaluate(revision=>{const c=window.__courtyard;c.active=false;const f=c.followFish,w=revision==='v10'&&c.lastRenderedFishTarget?c.lastRenderedFishTarget:c.fishObservationTarget(f);return {targetError:w.distanceTo(c.controls.target),mouthOpen:f.mouthOpen,refraction:[c.water.refractionTarget.width,c.water.refractionTarget.height],offset:c.camera.position.clone().sub(c.controls.target).toArray()};},revision);
 check('近景真实动画帧跟随当前观察目标',evidence.near.targetError<.001);
 check('近景水下折射使用1024像素宽缓冲',evidence.near.refraction[0]===1024);
 await page.evaluate(()=>window.__courtyard.controls.dispatchEvent({type:'start'}));
 check('近景拖动相机后保持锦鲤跟随',await page.evaluate(()=>!!window.__courtyard.followFish&&window.__courtyard.school.inspectionFish===window.__courtyard.followFish));
 await page.locator('#view-select').selectOption('aerial');
 check('切换普通镜头退出锦鲤跟随',await page.evaluate(()=>!window.__courtyard.followFish&&!window.__courtyard.school.inspectionFish));

 await page.locator('#reset').click();
 evidence.nearest=await page.evaluate(()=>{
  const c=window.__courtyard;c.updateSettings({fishCount:20});const s=c.school,V=window.__KoiValidationMath.Vector3,point=new V(0,.028,0);
  for(const [i,f]of s.fish.entries()){f.heading=0;f.pitch=0;f.group.rotation.set(0,0,0);f.group.position.set(i===19?-.5*f.group.scale.x-.09:2,-.10,i===19?0:-1);}
  s.feed(c.time,point);s.releasePellet(c.time,point,new V());const grain=s.food.children.find(m=>m.userData.particle);grain.userData.particle.landed=true;grain.userData.particle.landTime=c.time-1;
  const distances=s.fish.map(f=>Math.hypot(s.mouthWorld(f).x-point.x,s.mouthWorld(f).z-point.z));s.update(0,c.time,c.settings);
  return {distances,claimed:s.fish.flatMap((f,i)=>f.targetPellet===grain?[i]:[])};
 });
 check('仅尾号19锦鲤靠近饲料时由它获得目标',evidence.nearest.claimed.length===1&&evidence.nearest.claimed[0]===19&&evidence.nearest.distances[19]<.12&&evidence.nearest.distances.slice(0,19).every(d=>d>2));
 await page.locator('#reset').click();await page.locator('#feed').click();await advance(1.60);
 evidence.beforeRelease=await page.evaluate(()=>{const c=window.__courtyard;return {emitted:c.interaction.emitted,held:c.interaction.grain.children.filter(m=>m.visible).length,particles:c.school.food.children.filter(m=>m.userData.particle).length};});
 check('伸手捏持六粒有限饲料且没有提前掉落',evidence.beforeRelease.emitted===0&&evidence.beforeRelease.held===6&&evidence.beforeRelease.particles===0);
 evidence.feed=await page.evaluate(()=>{
  const c=window.__courtyard,release=[],bites=[],swallows=[],finished=[],opening=[],seen=new Set(),done=new Set();
  let lastEmitted=c.interaction.emitted,maxConsumed=0,lastHeld=6,heldMonotone=true,heldConserved=true;
  for(let step=0;step<480;step++){
   c.updateDynamics(.025);
   if(c.interaction.mode==='feed'){
    const held=c.interaction.grain.children.filter(m=>m.visible).length;
    heldMonotone&&=held<=lastHeld;heldConserved&&=held+c.interaction.emitted===6;lastHeld=held;
   }
   if(c.interaction.emitted>lastEmitted){release.push({at:c.time,emitted:c.interaction.emitted,held:c.interaction.grain.children.filter(m=>m.visible).length});lastEmitted=c.interaction.emitted;}
   opening.push(Math.max(...c.school.fish.map(f=>f.mouthOpen)));maxConsumed=Math.max(maxConsumed,c.school.consumed);
   for(const [i,m]of c.school.food.children.entries()){
    const p=m.userData.particle;if(!p)continue;
    if(p.swallow&&!seen.has(i)){
     seen.add(i);const mouth=c.school.mouthWorld(p.swallow.fish);
     bites.push({grain:i,at:c.time,landed:p.landed,delay:c.time-p.landTime,mouthOpen:p.swallow.fish.mouthOpen,planarDistance:Math.hypot(mouth.x-m.position.x,mouth.z-m.position.z),verticalDistance:Math.abs(mouth.y-m.position.y)});
    }
    if(p.swallow&&!p.eaten)swallows.push({grain:i,at:c.time,mouthDistance:m.position.distanceTo(c.school.mouthWorld(p.swallow.fish)),progress:(c.time-p.swallow.start)/.16});
    if(p.eaten&&!done.has(i)){done.add(i);finished.push({grain:i,at:c.time,expired:!!p.expired,visible:m.visible,swallow:!!p.swallow});}
   }
  }
  return {release,bites,swallows,finished,heldMonotone,heldConserved,maxConsumed,consumed:c.school.consumed,fishConsumed:c.school.fish.reduce((n,f)=>n+f.consumed,0),particles:c.school.food.children.filter(m=>m.userData.particle).length,
   maxMouthOpen:Math.max(...opening),finalEmitted:c.interaction.emitted,finalHeld:c.interaction.grain.children.filter(m=>m.visible).length,mode:c.interaction.mode};
 });
 console.log('Feeding evidence '+JSON.stringify({...evidence.feed,swallows:evidence.feed.swallows.length}));
 check('整次投喂只释放六粒且持有数量递减',evidence.feed.finalEmitted===6&&evidence.feed.particles===6&&evidence.feed.heldMonotone&&evidence.feed.heldConserved&&evidence.feed.finalHeld===0);
 check('锦鲤在自然追食路径中实际吞食',evidence.feed.consumed>0&&evidence.feed.bites.length>0);
 check('只有已落水且到达真实嘴边的饲料开始吞食',evidence.feed.bites.length>0&&evidence.feed.bites.every(b=>b.landed&&b.delay>.15&&b.mouthOpen>.60&&b.planarDistance<.043&&b.verticalDistance<.036));
 check('吞食包含进入鱼嘴的连续可见过程',evidence.feed.swallows.length>0&&evidence.feed.swallows.some(s=>s.progress>.4&&s.progress<1)&&evidence.feed.finished.some(f=>f.swallow&&!f.visible&&!f.expired));
 check('吞食计数只来自吞下饲料且不会超过六粒',evidence.feed.consumed===evidence.feed.fishConsumed&&evidence.feed.consumed===evidence.feed.finished.filter(f=>f.swallow&&!f.expired).length&&evidence.feed.maxConsumed<=6);
 check('投喂完成后手自然退场',evidence.feed.mode==='idle');
 check('追食张嘴达到可见开口',evidence.feed.maxMouthOpen>.75);

 // After feeding ends, the same fish must close its mouth again instead of remaining open.
 const fedFish=await page.evaluate(()=>window.__courtyard.school.fish.findIndex(f=>f.consumed>0));
 await advance(5.5);evidence.closed=await page.evaluate(i=>{const c=window.__courtyard,f=c.school.fish[i<0?0:i];return {time:c.time,feedUntil:c.school.feedUntil,mouthOpen:f.mouthOpen,uniform:f.state.uMouth.value};},fedFish);
 check('吞食结束后的嘴部恢复闭合并同步材质',evidence.closed.time>evidence.closed.feedUntil&&evidence.closed.mouthOpen<.12&&evidence.closed.uniform===evidence.closed.mouthOpen);

 await page.locator('#feed').click();await advance(2.025);
 await page.locator('#pause-toggle').click();
 const frozen=await page.evaluate(()=>{const c=window.__courtyard;c.active=true;return {frame:c.frameIndex,time:c.time,timer:c.interaction.timer,mouth:c.school.fish.map(f=>f.mouthOpen),food:c.school.food.children.map(m=>({visible:m.visible,position:m.position.toArray(),eaten:!!m.userData.particle?.eaten})),consumed:c.school.consumed};});
 await page.waitForFunction(n=>window.__courtyard.frameIndex>n,frozen.frame,{timeout:90000});
 evidence.pause=await page.evaluate(()=>{const c=window.__courtyard;c.active=false;return {paused:c.settings.paused,time:c.time,timer:c.interaction.timer,mouth:c.school.fish.map(f=>f.mouthOpen),food:c.school.food.children.map(m=>({visible:m.visible,position:m.position.toArray(),eaten:!!m.userData.particle?.eaten})),consumed:c.school.consumed};});
 check('真实暂停帧冻结鱼嘴、空中饲料和吞食计数',evidence.pause.paused&&evidence.pause.time===frozen.time&&evidence.pause.timer===frozen.timer&&JSON.stringify(evidence.pause.mouth)===JSON.stringify(frozen.mouth)&&JSON.stringify(evidence.pause.food)===JSON.stringify(frozen.food)&&evidence.pause.consumed===frozen.consumed);
 await page.locator('#pause-toggle').click();await advance(.15);
 check('解除暂停后饲料继续下落',await page.evaluate(food=>window.__courtyard.school.food.children.some((m,i)=>m.visible&&Math.abs(m.position.y-food[i].position[1])>1e-4),frozen.food));

 // Keep fish away for this repeat-feed case so legitimate eating cannot hide accidental deletion.
 await page.locator('[data-setting="fishCount"]').evaluate(e=>e.value='0');await page.locator('[data-setting="fishCount"]').dispatchEvent('input');
 await page.locator('#stop-interaction').click();
 evidence.repeatBefore=await page.evaluate(()=>{
  const s=window.__courtyard.school,live=s.food.children.filter(m=>m.userData.particle&&!m.userData.particle.eaten);
  window.__previousKoiGrains=live.filter(m=>!m.userData.particle.swallow).map(m=>({mesh:m,particle:m.userData.particle}));
  return {live:live.length,preserved:window.__previousKoiGrains.length,pendingSwallow:live.filter(m=>m.userData.particle.swallow).length,consumed:s.consumed};
 });
 await page.locator('#feed').click();
 evidence.repeatStart=await page.evaluate(()=>{const s=window.__courtyard.school;return {retained:window.__previousKoiGrains.filter(p=>p.mesh.userData.particle===p.particle&&!p.particle.eaten).length,consumed:s.consumed};});
 check('重复投喂开始时保留上一把活颗粒和累计吞食统计',evidence.repeatBefore.live>0&&evidence.repeatStart.retained===evidence.repeatBefore.preserved&&evidence.repeatStart.consumed===evidence.repeatBefore.consumed&&evidence.repeatStart.consumed>0);
 await advance(2.05);
 evidence.repeatReleased=await page.evaluate(()=>{const c=window.__courtyard,s=c.school;return {retained:window.__previousKoiGrains.filter(p=>p.mesh.userData.particle===p.particle&&!p.particle.eaten).length,live:s.food.children.filter(m=>m.userData.particle&&!m.userData.particle.eaten).length,emitted:c.interaction.emitted,consumed:s.consumed};});
 const consumedDelta=evidence.repeatReleased.consumed-evidence.repeatBefore.consumed;
 check('下一把六粒与上一把共存且不覆盖活颗粒',evidence.repeatReleased.retained===evidence.repeatBefore.preserved&&evidence.repeatReleased.live+consumedDelta===evidence.repeatBefore.live+6&&evidence.repeatReleased.emitted===6&&consumedDelta>=0&&consumedDelta<=evidence.repeatBefore.pendingSwallow);

 await page.locator('#reset').click();evidence.reset=await page.evaluate(()=>{const c=window.__courtyard;return {time:c.time,feedUntil:c.school.feedUntil,consumed:c.school.consumed,particles:c.school.food.children.filter(m=>m.userData.particle).length,visible:c.school.food.visible,follow:!!c.followFish,inspection:!!c.school.inspectionFish,handMode:c.interaction.mode};});
 check('恢复默认清除饲料、吞食统计及近景状态',evidence.reset.time===0&&evidence.reset.feedUntil===0&&evidence.reset.consumed===0&&evidence.reset.particles===0&&!evidence.reset.visible&&!evidence.reset.follow&&!evidence.reset.inspection&&evidence.reset.handMode==='idle');
 await page.locator('[data-setting="fishCount"]').evaluate(e=>e.value='0');await page.locator('[data-setting="fishCount"]').dispatchEvent('input');
 await page.locator('#fish-inspect').click();
 check('没有锦鲤时近景给出明确反馈',await page.evaluate(()=>!window.__courtyard.followFish&&document.querySelector('#scene-toast').textContent.includes('先增加锦鲤数量')));
 await page.locator('#reset').click();
 await page.locator('.settings details summary').click();
 await page.locator('#model-file').setInputFiles({name:'koi-check-triangle.glb',mimeType:'model/gltf-binary',buffer:glb()});
 await page.waitForFunction(()=>!!window.__courtyard.imported,null,{timeout:30000});
 check('GLB展示模式禁用锦鲤近景和投喂',await page.locator('#fish-inspect').isDisabled()&&await page.locator('#feed').isDisabled());
 await page.locator('#clear-model').click();
 check('退出GLB后恢复锦鲤近景入口',!await page.locator('#fish-inspect').isDisabled());
 check('锦鲤材质着色器与页面脚本无错误',errors.length===0);
 check('验证期间资产均从本地加载',requests.every(u=>u.startsWith('http://127.0.0.1:8947/')||u.startsWith('blob:')||u.startsWith('data:')));
}catch(e){fatal=e.stack||e.message;console.error(fatal);}
finally{
 await writeFile(root+'notes/koi-'+revision+'-validation.json',JSON.stringify({date:new Date().toISOString(),bundleSha256:createHash('sha256').update(await readFile(root+'web/app.js')).digest('hex'),clientDate:'2026-10-02',timeZone:'Asia/Shanghai',checks,failures,evidence,errors,fatal,
  method:'Real headless Chromium / SwiftShader browser. UI buttons start actions. After >2 rendered frames, active=false and 0.025s updateDynamics steps advance simulated feeding; actual rendered frames verify near-camera follow and paused animation. Geometry inspections establish actual mouth cavity and independent eyes/fins; swallowing events record real world mouth distance. Synthetic embedded-triangle GLB verifies mode restrictions. No hardware performance or photorealism claim.'},null,2));
 await browser.close();
}
console.log(JSON.stringify({passed:checks.length,failures,errors,fatal}));
assert.ok(!fatal&&failures.length===0,'锦鲤专项验证失败，详见 notes/koi-v4-validation.json');
