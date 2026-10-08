import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const records=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8947/?validation=turtle-camera-candidate#scene',{timeout:90000});await page.waitForFunction(()=>window.__courtyard?.frameIndex>2,null,{timeout:120000});await page.evaluate(()=>window.__courtyard.active=false);
 const fixture=await build({stdin:{contents:'import * as THREE from "three";import {GardenAnimals} from "../src/animals.js";window.__turtleViewMath={THREE,getView:GardenAnimals.prototype.getView};',resolveDir:root+'tooling'},nodePaths:[root+'tooling/node_modules'],bundle:true,write:false,format:'iife'});await page.addScriptTag({content:fixture.outputFiles[0].text});
 await page.evaluate(()=>{window.__courtyard.animals.getView=function(name,aspect){return window.__turtleViewMath.getView.call(this,name,aspect);};});
 for(const device of ['desktop','mobile']){
  await page.setViewportSize(device==='desktop'?{width:1536,height:1120}:{width:390,height:844});await page.evaluate(()=>window.__courtyard.resize());
  for(const scale of [.65,1,1.25])for(const state of ['bask','swim']){
   const record=await page.evaluate(({device,scale,state})=>{
    const c=window.__courtyard,{THREE}=window.__turtleViewMath;c.reset();c.active=false;c.updateSettings({pondScale:scale,wind:.65,autoTour:false,paused:false});c.updateDynamics(0);c.animals.frog.nextJump=c.animals.turtle.nextSwim=1e9;
    const advance=steps=>{for(let i=0;i<steps;i++)c.advanceFrame(1/60,{allowInactive:true});};if(state==='swim'){c.animals.activate('turtle',c.time);advance(144);
     // The real path can pass beneath opaque vegetation/stepping stones. Pick
     // the first visible swimming stage for each scale, rather than teleporting.
     const turtlePoints=[[0,.072,0],[.09,.062,0],[-.09,.055,0],[0,.06,.075],[0,.06,-.075],[.145,.046,0],[.16,.036,.018],[.16,.036,-.018]],a=c.animals,rocks=[c.landscape.group,...a.group.children.filter(n=>n.isMesh&&!n.userData.actor&&n.name!=='animal-landing-lily')],opaque=[...rocks,c.lilies,...a.pads];
     for(let seek=0;seek<120;seek++){c.setView('turtle',true);c.transition=null;c.scene.updateMatrixWorld(true);c.camera.updateMatrixWorld();const clear=turtlePoints.every(p=>{const world=new THREE.Vector3(...p).applyMatrix4(a.turtle.root.matrixWorld),delta=world.clone().sub(c.camera.position),ray=new THREE.Raycaster(c.camera.position,delta.normalize(),.001,c.camera.position.distanceTo(world)-.003),vertical=new THREE.Raycaster(world.clone().add(new THREE.Vector3(0,.4,0)),new THREE.Vector3(0,-1,0),.001,.397);return !ray.intersectObjects(opaque,true).length&&!vertical.intersectObjects(rocks,true).length;});if(clear)break;advance(6);}}
    c.setView('turtle',true);c.transition=null;c.renderCurrent();c.scene.updateMatrixWorld(true);c.camera.updateMatrixWorld();
    const a=c.animals,actor=a.turtle.root,leaves=[c.lilies,...a.pads],rocks=[c.landscape.group,...a.group.children.filter(n=>n.isMesh&&!n.userData.actor&&n.name!=='animal-landing-lily')];
    const points=[[0,.072,0],[.09,.062,0],[-.09,.055,0],[0,.06,.075],[0,.06,-.075],[.145,.046,0],[.16,.036,.018],[.16,.036,-.018]];
    const rays=points.map(p=>{const world=new THREE.Vector3(...p).applyMatrix4(actor.matrixWorld),delta=world.clone().sub(c.camera.position),ray=new THREE.Raycaster(c.camera.position,delta.clone().normalize(),.001,delta.length()-.003),leaf=ray.intersectObjects(leaves,true),rock=ray.intersectObjects(rocks,true),vertical=new THREE.Raycaster(world.clone().add(new THREE.Vector3(0,.4,0)),new THREE.Vector3(0,-1,0),.001,.397).intersectObjects(rocks,true);return {point:world.toArray(),leafClear:!leaf.length,stoneClear:!rock.length,verticalClear:!vertical.length,stoneHit:rock[0]?{point:rock[0].point.toArray(),distance:rock[0].distance}:null,hit:leaf[0]?{name:leaf[0].object.name,distance:leaf[0].distance,point:leaf[0].point.toArray()}:null};});
    let outside=0,count=0;actor.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;const p=new THREE.Vector3(),position=mesh.geometry.getAttribute('position');for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(c.camera);count++;if(Math.abs(p.x)>=.98||Math.abs(p.y)>=.98||p.z<=-1||p.z>=1)outside++;}});
    return {time:c.time,timer:a.turtle.timer,device,scale,state,actualState:a.turtle.state,view:a.getView('turtle',c.camera.aspect),count,outside,rays};
   },{device,scale,state});records.push(record);console.log(`${record.rays.every(p=>p.leafClear&&p.stoneClear&&p.verticalClear)&&record.outside===0?'PASS':'FAIL'} ${device} turtle/${state} scale${scale}: leafBlocked=${record.rays.filter(p=>!p.leafClear).length} stoneBlocked=${record.rays.filter(p=>!p.stoneClear).length} outside=${record.outside} verticalBlocked=${record.rays.filter(p=>!p.verticalClear).length} time=${record.time}`);
   if(scale===1.25){await page.waitForTimeout(4800);await page.evaluate(()=>window.__courtyard.renderer.getContext().finish());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('#scene-canvas').screenshot({path:root+`assets/turtle-camera-candidate-${state}-${device}-v10.png`,timeout:90000});}
  }
 }
}finally{await browser.close();await writeFile(root+'notes/turtle-view-v10-candidate-validation.json',JSON.stringify({status:!errors.length&&records.length===12&&records.every(r=>r.outside===0&&r.rays.every(p=>p.leafClear&&p.stoneClear&&p.verticalClear))?'passed':'failed',candidate:true,errors,records},null,2));}
