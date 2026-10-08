import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const checks=[],failures=[],errors=[],requests=[],evidence={topics:{},demos:{},captures:[]};
const applicationBundleSHA256=createHash('sha256').update(await readFile(root+'web/app.js')).digest('hex');
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
 const freeze=()=>page.evaluate(()=>window.__courtyard.active=false);
 const advance=seconds=>page.evaluate(seconds=>{const c=window.__courtyard;for(let t=0;t<seconds-1e-8;t+=.025)c.updateDynamics(Math.min(.025,seconds-t));},seconds);
 const refresh=()=>page.locator('#principle-select').dispatchEvent('change');
 const reset=async()=>{await page.locator('#reset').click();await freeze();};
 const select=async key=>{await page.locator('#principle-select').selectOption(key);};
 const demo=async key=>{await select(key);await page.locator('#principle-demo').click();await freeze();};
 const render=async()=>{
  await page.evaluate(()=>{const c=window.__courtyard;c.active=false;c.renderer.info.reset();
   if(c.transition){const t=c.transition;c.camera.position.copy(t.to);c.controls.target.copy(t.toTarget);c.camera.fov=t.fov;c.camera.updateProjectionMatrix();c.transition=null;}
   if(c.followFish){const target=c.school.mouthWorld(c.followFish).lerp(c.followFish.group.position,.35),delta=target.clone().sub(c.controls.target);c.camera.position.add(delta);c.controls.target.copy(target);}
   c.controls.update();if(!c.imported){c.water.update(c.time,c.settings,c.sunDirection,c.sun.color,0);
    c.water.renderPasses([c.school.group,c.school.food],[c.waterfall.group,c.interaction.rig.root]);}c.composer.render();
  });await refresh();
 };
 const fullCapture=async name=>{await page.screenshot({path:root+'assets/'+name+'.png',fullPage:true,timeout:90000});evidence.captures.push(name+'.png');};
 await freeze();
 evidence.initial=await page.evaluate(()=>({frames:window.__courtyard.frameIndex,selectValues:[...document.querySelector('#principle-select').options].map(o=>o.value)}));
 check('学习面板提供七个效果主题',JSON.stringify(evidence.initial.selectValues)===JSON.stringify(['fish','motion','water','feeding','geometry','lighting','performance']));

 const words={fish:/Boids/,motion:/解析求导/,water:/128².*1\/60.*Gerstner.*Fresnel.*Beer–Lambert.*GGX/,feeding:/26 骨骼.*CCD.*状态机/,geometry:/SDF.*Surface Nets/,lighting:/屏幕空间.*ACES/,performance:/实例化.*合并/};
 for(const [key,word]of Object.entries(words)){
  await select(key);const text=await page.evaluate(()=>({effect:document.querySelector('#principle-effect').textContent,method:document.querySelector('#principle-method').textContent,boundary:document.querySelector('#principle-boundary').textContent,metrics:document.querySelector('#principle-metrics').textContent}));
  evidence.topics[key]=text;check('切换 '+key+' 显示对应算法、观察点和近似边界',word.test(text.method)&&text.effect.length>15&&text.boundary.length>20&&text.metrics.length>15);
 }
 check('说明区分骨骼手、近似法线与CPU浮料',evidence.topics.feeding.boundary.includes('WebXR')&&evidence.topics.feeding.boundary.includes('原作是 SDF')&&evidence.topics.motion.boundary.includes('口唇')&&evidence.topics.water.boundary.includes('不回读 GPU 涟漪'));
 check('性能说明准确保留鱼的独立网格边界',evidence.topics.performance.boundary.includes('独立网格')&&evidence.topics.performance.boundary.includes('未迁移'));

 await reset();await page.locator('#pause-toggle').click();await freeze();
 await demo('fish');await advance(.25);await refresh();
 evidence.demos.fish=await page.evaluate(()=>{const c=window.__courtyard;return {paused:c.settings.paused,autoTour:c.settings.autoTour,to:c.transition?.to.toArray(),fishCount:c.settings.fishCount,metrics:c.school.metrics,line:document.querySelector('#principle-metrics').textContent};});
 check('鱼群示范解除暂停并切换池边观察',!evidence.demos.fish.paused&&!evidence.demos.fish.autoTour&&evidence.demos.fish.fishCount>0&&evidence.demos.fish.to?.[1]===1&&evidence.demos.fish.line.includes('模拟运行中'));
 check('鱼群说明的数值来自当前行为统计',Number.isFinite(evidence.demos.fish.metrics.alignment)&&Number.isFinite(evidence.demos.fish.metrics.cohesion)&&evidence.demos.fish.line.includes(evidence.demos.fish.metrics.alignment.toFixed(2)));

 await reset();await demo('motion');await advance(.25);await render();
 evidence.demos.motion=await page.evaluate(()=>{const c=window.__courtyard,f=c.followFish,bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  f.group.updateWorldMatrix(true,true);c.camera.updateMatrixWorld();for(const mesh of [f.body,f.fins]){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
   for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=mesh.position.clone().set(x,y,z).applyMatrix4(mesh.matrixWorld).project(c.camera);bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minY=Math.min(bounds.minY,p.y);bounds.maxY=Math.max(bounds.maxY,p.y);}}
  return {follow:!!f,inspection:c.school.inspectionFish===f,amp:f?.amp.value,bend:f?.state.uBend?.value,spread:f?.state.uSpread?.value,waterWidth:c.water.refractionTarget.width,baseGeometryClipBounds:bounds,line:document.querySelector('#principle-metrics').textContent};});
 check('形变示范建立真实鱼头跟随和新着色器参数',evidence.demos.motion.follow&&evidence.demos.motion.inspection&&Number.isFinite(evidence.demos.motion.bend)&&Number.isFinite(evidence.demos.motion.spread)&&evidence.demos.motion.waterWidth===1024);
 const motionBounds=evidence.demos.motion.baseGeometryClipBounds;
 check('形变示范将整条鱼体和尾鳍基础包围盒纳入画面',motionBounds.minX>-.99&&motionBounds.maxX<.99&&motionBounds.minY>-.99&&motionBounds.maxY<.99);
 await page.evaluate(()=>document.body.classList.add('clean-scene'));
 await page.locator('#scene-canvas').screenshot({path:root+'assets/koi-motion-v5.png',timeout:90000});evidence.captures.push('koi-motion-v5.png');
 await page.evaluate(()=>document.body.classList.remove('clean-scene'));

 await reset();const waterBefore=await page.evaluate(()=>{const w=window.__courtyard.water;return {drops:w.nextDrop,queue:w.simulation.queue.length,steps:w.simulation.stepCount,enabled:w.simulation.enabled};});
 await demo('water');evidence.demos.water=await page.evaluate(()=>{const c=window.__courtyard,w=c.water;return {drops:w.nextDrop,queue:w.simulation.queue.length,steps:w.simulation.stepCount,enabled:w.simulation.enabled,lastDrop:w.drops[(w.nextDrop-1)%12].toArray()};});
 check('水面示范向真实涟漪系统添加扰动',evidence.demos.water.drops>waterBefore.drops&&evidence.demos.water.lastDrop[3]===.035&&(!waterBefore.enabled||evidence.demos.water.queue>waterBefore.queue));
 await advance(.20);await render();evidence.demos.water.after=await page.evaluate(()=>({steps:window.__courtyard.water.simulation.stepCount,queue:window.__courtyard.water.simulation.queue.length,line:document.querySelector('#principle-metrics').textContent}));
 check('GPU差分波固定步长推进并消耗真实扰动队列',waterBefore.enabled?evidence.demos.water.after.steps>=waterBefore.steps+10&&evidence.demos.water.after.queue===0:evidence.demos.water.after.line.includes('解析涟漪回退'));

 await reset();await demo('feeding');
 evidence.demos.feeding=await page.evaluate(()=>{const h=window.__courtyard.interaction;return {mode:h.mode,total:h.totalPellets,rootVisible:h.rig.root.visible};});
 check('投喂示范调用真实手部动作及六粒有限量',evidence.demos.feeding.mode==='feed'&&evidence.demos.feeding.total===6&&evidence.demos.feeding.rootVisible);
 await advance(2.30);await refresh();evidence.demos.feeding.after=await page.evaluate(()=>{const c=window.__courtyard,h=c.interaction;return {mode:h.mode,phase:h.phase,emitted:h.emitted,held:h.grain.children.filter(m=>m.visible).length,particles:c.school.food.children.filter(m=>m.userData.particle).length,line:document.querySelector('#principle-metrics').textContent};});
 check('投喂状态推进后六粒全部释放且说明同步数量',evidence.demos.feeding.after.emitted===6&&evidence.demos.feeding.after.held===0&&evidence.demos.feeding.after.particles===6&&evidence.demos.feeding.after.line.includes('6/6'));

 await reset();const frogBefore=await page.evaluate(()=>window.__courtyard.animals.frog.root.position.toArray());await demo('geometry');
 evidence.demos.geometry=await page.evaluate(()=>({follow:window.__courtyard.followAnimal,state:window.__courtyard.animals.frog.state}));await advance(.25);
 evidence.demos.geometry.after=await page.evaluate(()=>window.__courtyard.animals.frog.root.position.toArray());
 check('几何示范切换青蛙近景并执行真实跳跃',evidence.demos.geometry.follow==='frog'&&evidence.demos.geometry.state==='jump'&&evidence.demos.geometry.after[1]>frogBefore[1]+.1);

 await reset();await demo('lighting');await render();
 evidence.demos.lighting=await page.evaluate(()=>{const c=window.__courtyard;return {weather:c.settings.weather,hour:c.settings.hour,sun:c.sun.color.getHexString(),bloom:c.bloom.strength,line:document.querySelector('#principle-metrics').textContent};});
 check('光照示范应用18.3时黄昏并同步真实光照',evidence.demos.lighting.weather==='dusk'&&evidence.demos.lighting.hour===18.3&&evidence.demos.lighting.sun==='ffd09a'&&evidence.demos.lighting.bloom===.28&&evidence.demos.lighting.line.includes('18.3'));
 evidence.demos.lighting.sunIntensity=await page.evaluate(()=>{const c=window.__courtyard,result={};for(const weather of ['sunny','rain']){c.updateSettings({weather,hour:16.3});c.water.update(c.time,c.settings,c.sunDirection,c.sun.color,0);result[weather]={hour:c.settings.hour,intensity:c.sun.intensity,color:c.sun.color.toArray(),waterUniform:c.water.material.uniforms.sunColor.value.toArray()};}return result;});
 const sunIntensity=evidence.demos.lighting.sunIntensity,ratio=sunIntensity.rain.intensity/sunIntensity.sunny.intensity;
 check('相同时刻雨后水面GGX高光按真实太阳强度减弱',sunIntensity.sunny.hour===sunIntensity.rain.hour&&sunIntensity.rain.intensity<sunIntensity.sunny.intensity&&sunIntensity.rain.waterUniform.every((v,i)=>v<sunIntensity.sunny.waterUniform[i]&&Math.abs(v/sunIntensity.sunny.waterUniform[i]-ratio)<1e-6));

 await reset();await demo('performance');const perfTo=await page.evaluate(()=>window.__courtyard.transition?.to.toArray());await render();
 evidence.demos.performance=await page.evaluate(()=>{const c=window.__courtyard;let instances=0;c.scene.traverseVisible(o=>{if(o.isInstancedMesh)instances++;});return {instances,calls:c.renderer.info.render.calls,triangles:c.renderer.info.render.triangles,camera:c.camera.position.toArray(),line:document.querySelector('#principle-metrics').textContent};});
 check('性能示范切换俯瞰视角',perfTo?.[1]===13&&evidence.demos.performance.camera[1]===13);
 check('性能文本显示实际渲染通道统计与实例对象数',evidence.demos.performance.instances>0&&evidence.demos.performance.calls>0&&evidence.demos.performance.triangles>10000&&evidence.demos.performance.line.includes(String(evidence.demos.performance.calls))&&evidence.demos.performance.line.includes(evidence.demos.performance.triangles.toLocaleString('zh-CN')));

 await demo('water');await advance(.20);await render();
 evidence.desktop=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,metrics:document.querySelector('#principle-metrics').textContent,panelWidth:document.querySelector('.principle-panel').getBoundingClientRect().width}));
 check('桌面动态水面说明无横向溢出',evidence.desktop.width===evidence.desktop.scrollWidth&&evidence.desktop.metrics.includes('128²'));
 await fullCapture('scene-principles-v5');
 await page.locator('#principle-more').click();await freeze();
 evidence.tech=await page.evaluate(()=>({hash:location.hash,visible:!document.querySelector('#tech').hidden,rows:document.querySelectorAll('.effect-map tbody tr').length,details:document.querySelectorAll('.tech-list details').length,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 check('完整技术对照按钮切换到技术页面',evidence.tech.hash==='#tech'&&evidence.tech.visible);
 check('技术页提供七行对照并保留六项详情',evidence.tech.rows===7&&evidence.tech.details===6);
 check('桌面技术对照无横向溢出',evidence.tech.width===evidence.tech.scrollWidth);
 await fullCapture('tech-principles-v5');

 await page.setViewportSize({width:390,height:844});await page.locator('[data-tab=scene]').click();await freeze();await select('water');await render();
 evidence.mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,panelWidth:document.querySelector('.principle-panel').getBoundingClientRect().width,metricsWidth:document.querySelector('#principle-metrics').getBoundingClientRect().width,metrics:document.querySelector('#principle-metrics').textContent}));
 check('390像素移动动态水面说明保持可读且无溢出',evidence.mobile.width===evidence.mobile.scrollWidth&&evidence.mobile.panelWidth<=390&&evidence.mobile.metricsWidth<evidence.mobile.panelWidth&&evidence.mobile.metrics.includes('128²'));
 await page.locator('.principle-panel').screenshot({path:root+'assets/scene-principles-mobile-v5.png',timeout:90000});evidence.captures.push('scene-principles-mobile-v5.png');
 await demo('water');await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#scene-toast')).opacity)>.95,null,{timeout:3000});
 evidence.mobileToast=await page.evaluate(()=>{const t=document.querySelector('#scene-toast'),r=t.getBoundingClientRect(),thumb=document.querySelector('#reference-thumb').getBoundingClientRect();return {height:r.height,text:t.textContent,bottom:getComputedStyle(t).bottom,viewportHeight:document.querySelector('#viewport').getBoundingClientRect().height,avoidsReferenceThumb:r.right<thumb.left};});
 check('移动互动提示按内容定高且避开参考图缩略图',evidence.mobileToast.height>20&&evidence.mobileToast.height<95&&evidence.mobileToast.bottom==='113px'&&evidence.mobileToast.text.includes('扰动')&&evidence.mobileToast.avoidsReferenceThumb);
 await page.locator('#viewport').screenshot({path:root+'assets/scene-toast-mobile-v5.png',timeout:90000});evidence.captures.push('scene-toast-mobile-v5.png');
 await page.locator('#principle-more').click();await freeze();evidence.mobileTech=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 check('390像素移动技术对照无横向溢出',evidence.mobileTech.width===evidence.mobileTech.scrollWidth);

 await page.setViewportSize({width:1536,height:1120});await page.locator('[data-tab=scene]').click();await freeze();
 await page.locator('.settings details summary').click();await page.locator('#model-file').setInputFiles({name:'principles-check-triangle.glb',mimeType:'model/gltf-binary',buffer:glb()});
 await page.waitForFunction(()=>!!window.__courtyard.imported,null,{timeout:30000});await select('performance');await render();
 evidence.imported=await page.evaluate(()=>{const c=window.__courtyard;let instances=0;c.scene.traverseVisible(o=>{if(o.isInstancedMesh)instances++;});return {model:!!c.imported,instances,line:document.querySelector('#principle-metrics').textContent};});
 check('导入GLB后可见实例统计排除隐藏庭院',evidence.imported.model&&evidence.imported.instances===0&&evidence.imported.line.includes('可见实例化对象 0'));
 await select('water');check('导入模型时禁用庭院示范并说明返回路径',await page.locator('#principle-demo').isDisabled()&&(await page.locator('#principle-metrics').textContent()).includes('返回庭院'));
 await page.locator('#clear-model').click();await refresh();check('退出GLB后恢复庭院示范',!await page.locator('#principle-demo').isDisabled());
 check('新算法真实绘制与页面运行无错误',errors.length===0);
 check('学习面板与场景资源均从本地加载',requests.every(u=>u.startsWith('http://127.0.0.1:8947/')||u.startsWith('blob:')||u.startsWith('data:')));
}catch(e){fatal=e.stack||e.message;console.error(fatal);}
finally{
 await writeFile(root+'notes/principles-v5-validation.json',JSON.stringify({date:new Date().toISOString(),clientDate:'2026-10-02',timeZone:'Asia/Shanghai',applicationBundleSHA256,checks,failures,evidence,errors,fatal,
  method:'Real Chromium / SwiftShader. Initial >2 RAF frames establish rendering. Native UI selects all seven topics and triggers all seven demonstrations; active=false immediately freezes RAF to avoid unnecessary software rendering. Real updateDynamics advances 0.025-second steps, including GPU ripple updates, fish behavior and skeletal feeding. Manual calls to actual water renderPasses and composer render produce scene screenshots and renderer statistics. Synthetic one-triangle GLB verifies hidden-parent instance exclusion and mode restrictions. Counts are actual rendering counters, not hardware performance benchmarks. No fabricated imagery or v4 asset replacement.'},null,2));
 await browser.close();
}
console.log(JSON.stringify({passed:checks.length,failures,errors,fatal}));
assert.ok(!fatal&&failures.length===0,'技术说明与示范验证失败，详见 notes/principles-v5-validation.json');
