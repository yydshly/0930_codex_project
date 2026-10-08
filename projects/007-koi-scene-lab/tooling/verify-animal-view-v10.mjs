import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']}),checks=[],errors=[],evidence=[];
const candidate=process.argv.includes('--candidate');
const check=(name,ok)=>{checks.push({name,passed:!!ok});console.log((ok?'PASS ':'FAIL ')+name);};let fatal=null;
try{
 const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:8947/?validation=animal-view-v10#scene',{timeout:90000});await page.waitForFunction(()=>window.__courtyard?.frameIndex>2,null,{timeout:120000});await page.evaluate(()=>window.__courtyard.active=false);
 const fixture=await build({stdin:{contents:'import * as THREE from "three";import {GardenAnimals} from "../src/animals.js";window.__animalViewMath={THREE,getView:GardenAnimals.prototype.getView};',resolveDir:root+'tooling'},nodePaths:[root+'tooling/node_modules'],bundle:true,write:false,format:'iife'});await page.addScriptTag({content:fixture.outputFiles[0].text});
 if(candidate)await page.evaluate(()=>{const c=window.__courtyard;c.animals.pads[0].userData.anchor={x:-1.65,z:2.15};c.animals.pads[1].userData.anchor={x:-1,z:2.65};c.animals.getView=function(name){return window.__animalViewMath.getView.call(this,name,c.camera.aspect);};});
 for(const device of ['desktop','mobile']){
  await page.setViewportSize(device==='desktop'?{width:1536,height:1120}:{width:390,height:844});await page.evaluate(()=>window.__courtyard.resize());
  for(const scale of [.65,1,1.25])for(const subject of ['frog','turtle','dragonfly']){
   const states=subject==='frog'?['rest','jump','landed']:subject==='turtle'?['bask','swim']:['perch'];
   for(const state of states){
    const record=await page.evaluate(({subject,state,scale,device,candidate})=>{
     const c=window.__courtyard,{THREE}=window.__animalViewMath;c.reset();c.active=false;c.updateSettings({pondScale:scale,wind:.65,autoTour:false,paused:false});c.updateDynamics(0);c.animals.frog.nextJump=c.animals.turtle.nextSwim=1e9;
     const advance=steps=>{for(let i=0;i<steps;i++)c.advanceFrame(1/60,{allowInactive:true});};
     if(subject==='frog'&&state!=='rest'){c.animals.activate('frog',c.time);advance(state==='jump'?26:60);}
     if(subject==='turtle'&&state==='swim'){c.animals.activate('turtle',c.time);advance(144);
     // The real path can pass beneath opaque vegetation/stepping stones. Pick
     // the first visible swimming stage for each scale, rather than teleporting.
     const turtlePoints=[[0,.072,0],[.09,.062,0],[-.09,.055,0],[0,.06,.075],[0,.06,-.075],[.145,.046,0],[.16,.036,.018],[.16,.036,-.018]],a=c.animals,rocks=[c.landscape.group,...a.group.children.filter(n=>n.isMesh&&!n.userData.actor&&n.name!=='animal-landing-lily')],opaque=[...rocks,c.lilies,...a.pads];
     for(let seek=0;seek<120;seek++){c.setView('turtle',true);c.transition=null;c.scene.updateMatrixWorld(true);c.camera.updateMatrixWorld();const clear=turtlePoints.every(p=>{const world=new THREE.Vector3(...p).applyMatrix4(a.turtle.root.matrixWorld),delta=world.clone().sub(c.camera.position),ray=new THREE.Raycaster(c.camera.position,delta.normalize(),.001,c.camera.position.distanceTo(world)-.003),vertical=new THREE.Raycaster(world.clone().add(new THREE.Vector3(0,.4,0)),new THREE.Vector3(0,-1,0),.001,.397);return !ray.intersectObjects(opaque,true).length&&!vertical.intersectObjects(rocks,true).length;});if(clear)break;advance(6);}}
     if(subject==='dragonfly'){const d=c.animals.dragonflies[0];for(let i=0;i<650&&!(d.state==='perch'&&d.timer>=.9);i++)advance(1);}
     c.setView(subject,true);c.transition=null;if(!candidate)c.renderCurrent();c.scene.updateMatrixWorld(true);c.camera.updateMatrixWorld();
     const a=c.animals,actor=subject==='frog'?a.frog.root:subject==='turtle'?a.turtle.root:a.dragonflies[0].root;
     const projectMeshes=nodes=>{let count=0,outside=0,maxX=0,maxY=0,depthMin=Infinity,depthMax=-Infinity;const outsideSamples=[],p=new THREE.Vector3();for(const node of nodes)node.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;const position=mesh.geometry.getAttribute('position');for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(c.camera);count++;maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));depthMin=Math.min(depthMin,p.z);depthMax=Math.max(depthMax,p.z);if(Math.abs(p.x)>=.98||Math.abs(p.y)>=.98||p.z<=-1||p.z>=1){outside++;if(outsideSamples.length<10)outsideSamples.push(p.toArray());}}});return {count,outside,outsideSamples,maxX,maxY,depthMin,depthMax};};
     const support=subject==='frog'?a.pads[a.frog.pad]:subject==='dragonfly'&&a.dragonflies[0].state==='perch'?a.pads[0]:null,actorProjection=projectMeshes([actor]),supportProjection=support?projectMeshes([actor,support]):actorProjection;
     const points=subject==='frog'?[[0,.025,0],[.043,.033,0],[-.025,.019,0],[.043,.003,.026],[.043,.003,-.026],[-.025,.007,.043],[-.025,.007,-.043]]:subject==='turtle'?[[0,.072,0],[.09,.062,0],[-.09,.055,0],[0,.06,.075],[0,.06,-.075],[.145,.046,0],[.16,.036,.018],[.16,.036,-.018]]:[[.005,.005,0],[-.05,0,0]];
     // Include stepping slabs as well as shore rocks: both can hide an animal.
     const rocks=[c.landscape.group,...a.group.children.filter(n=>n.isMesh&&!n.userData.actor&&n.name!=='animal-landing-lily')],opaque=[...rocks,c.lilies,...a.pads];
     const occlusion=points.map((p,index)=>{const world=new THREE.Vector3(...p).applyMatrix4(actor.matrixWorld),direction=world.clone().sub(c.camera.position),distance=direction.length(),ray=new THREE.Raycaster(c.camera.position,direction.normalize(),.001,Math.max(.001,distance-.003)),hits=ray.intersectObjects(opaque,true),vertical=new THREE.Raycaster(world.clone().add(new THREE.Vector3(0,.4,0)),new THREE.Vector3(0,-1,0),.001,.397).intersectObjects(rocks,true);return {index,point:world.toArray(),distance,clear:!hits.length,verticalClear:!vertical.length,nearest:hits[0]?{distance:hits[0].distance,point:hits[0].point.toArray()}:null,verticalNearest:vertical[0]?vertical[0].point.toArray():null};});
     const viewport=document.getElementById('viewport'),toast=document.getElementById('scene-toast'),thumb=document.getElementById('reference-thumb'),vr=viewport.getBoundingClientRect(),tr=toast.getBoundingClientRect(),ui={observing:viewport.dataset.observing,thumbnailHidden:getComputedStyle(thumb).display==='none',toastTop:tr.top-vr.top,toastBottom:tr.bottom-vr.top};
     return {ui,device,scale,subject,state,actualState:subject==='frog'?a.frog.state:subject==='turtle'?a.turtle.state:a.dragonflies[0].state,time:c.time,view:a.getView(subject,c.camera.aspect),canvas:[c.canvas.width,c.canvas.height],actor:actorProjection,actorAndSupport:supportProjection,occlusion};
    },{subject,state,scale,device,candidate});evidence.push(record);
    const label=`${device} ${subject}/${state} ×${scale}`;
    check(label+' 主体实际顶点完整进入画幅',record.actor.outside===0);
    if(subject!=='turtle')check(label+' 主体与落脚叶片实际顶点完整进入画幅',record.actorAndSupport.outside===0);
    check(label+' 头部与身体关键视线没有被石块或不透明睡莲挡住',(subject==='turtle'?record.occlusion:record.occlusion.slice(0,subject==='frog'?3:2)).every(p=>p.clear));
    if(!candidate)check(label+' 动物观察浮层避开主体',record.ui.observing==='animal'&&record.ui.thumbnailHidden&&(device==='desktop'||record.ui.toastTop>=47&&record.ui.toastTop<=51&&record.ui.toastBottom<104));
    check(label+' 垂直静态射线确认身体未嵌入步石',record.occlusion.every(p=>p.verticalClear));
    if(!candidate&&scale===1.25){await page.waitForTimeout(4800);await page.evaluate(()=>window.__courtyard.renderer.getContext().finish());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('#scene-canvas').screenshot({path:root+`assets/animal-view-${subject}-${state}-${device}-v10.png`,timeout:90000});}
   }
  }
 }
 check('实际浏览器无页面或着色器错误',!errors.length);
}catch(e){fatal=e.stack??String(e);console.error(fatal);}finally{
 await browser.close();const hash=createHash('sha256').update(await readFile(root+'web/app.js')).digest('hex');await writeFile(root+`notes/animal-view-v10${candidate?'-candidate':''}-validation.json`,JSON.stringify({status:!fatal&&checks.every(c=>c.passed)?'passed':'failed',candidate,bundleSha256:hash,checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),errors,fatal,evidence,limitations:candidate?'Current source getView and candidate anchors applied to the actual scene; no app rebuild or screenshots.':'Ray tests inspect opaque stones and all nine water lilies; real WebGL screenshots verify the composed frame. CPU-side rays do not reproduce shader deformation or refraction.'},null,2));if(fatal||checks.some(c=>!c.passed))process.exitCode=1;
}
