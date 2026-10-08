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
    if(state==='swim'){c.animals.activate('turtle',c.time);for(let i=0;i<330;i++)c.advanceFrame(1/60,{allowInactive:true});}
    c.setView('turtle',true);c.transition=null;c.renderCurrent();c.scene.updateMatrixWorld(true);c.camera.updateMatrixWorld();
    const a=c.animals,actor=a.turtle.root,leaves=[c.lilies,...a.pads],rocks=[c.landscape.group,...a.group.children.filter(n=>n.isMesh&&!n.userData.actor&&n.name!=='animal-landing-lily')];
    const points=[[0,.072,0],[.09,.062,0],[-.09,.055,0],[0,.06,.075],[0,.06,-.075],[.145,.046,0],[.16,.036,.018],[.16,.036,-.018]];
    const probe=()=>points.map(p=>{const world=new THREE.Vector3(...p).applyMatrix4(actor.matrixWorld),delta=world.clone().sub(c.camera.position),ray=new THREE.Raycaster(c.camera.position,delta.clone().normalize(),.001,delta.length()-.003),leaf=ray.intersectObjects(leaves,true),rock=ray.intersectObjects(rocks,true);return {point:world.toArray(),leafClear:!leaf.length,stoneClear:!rock.length,hit:leaf[0]?{name:leaf[0].object.name,distance:leaf[0].distance,point:leaf[0].point.toArray()}:null};});
    const base=a.getView('turtle',c.camera.aspect),target=new THREE.Vector3(...base.target),sphere=new THREE.Box3().setFromObject(actor).getBoundingSphere(new THREE.Sphere()),vertical=48*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*c.camera.aspect),distance=sphere.radius/Math.sin(Math.min(vertical,horizontal))*1.12,options=[],search=[];
    if(state==='bask')options.push([.85,.78,.30]);else for(const h of [.65,.85,1.1,1.4,1.8,2.4])for(const y of [.12,.16,.22,.30,.42,.55,.75])for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6)options.push([Math.cos(angle)*h,y,Math.sin(angle)*h]);

    for(const option of options){const offset=new THREE.Vector3(option[0]*scale,option[1],option[2]*scale),d=Math.max(distance,offset.length());c.camera.position.copy(target).addScaledVector(offset.normalize(),d);c.controls.target.copy(target);c.controls.update();c.camera.updateMatrixWorld();const rr=probe();search.push({option,position:c.camera.position.toArray(),leafBlocked:rr.filter(p=>!p.leafClear).length,stoneBlocked:rr.filter(p=>!p.stoneClear).length,aboveWater:c.camera.position.y>=c.water.heightAt(c.camera.position.x,c.camera.position.z,c.time)+.025});}
    const clear=search.filter(p=>p.leafBlocked===0&&p.stoneBlocked===0&&p.aboveWater);clear.sort((a,b)=>Math.atan2(b.option[1],Math.hypot(b.option[0],b.option[2])*scale)-Math.atan2(a.option[1],Math.hypot(a.option[0],a.option[2])*scale));const selected=clear[0]??search[0];c.camera.position.set(...selected.position);c.controls.target.copy(target);c.controls.update();c.camera.updateMatrixWorld();c.renderCurrent();const rays=probe();
    let outside=0,count=0;actor.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;const p=new THREE.Vector3(),position=mesh.geometry.getAttribute('position');for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(c.camera);count++;if(Math.abs(p.x)>=.98||Math.abs(p.y)>=.98||p.z<=-1||p.z>=1)outside++;}});
    return {device,scale,state,actualState:a.turtle.state,view:{...base,position:c.camera.position.toArray()},count,outside,rays,selected,search};
   },{device,scale,state});records.push(record);console.log(`${record.rays.every(p=>p.leafClear&&p.stoneClear)&&record.outside===0?'PASS':'FAIL'} ${device} turtle/${state} scale${scale}: selected=${JSON.stringify(record.selected.option)} leafBlocked=${record.rays.filter(p=>!p.leafClear).length} stoneBlocked=${record.rays.filter(p=>!p.stoneClear).length} outside=${record.outside}`);
   if(scale===1.25){await page.waitForTimeout(4800);await page.evaluate(()=>window.__courtyard.renderer.getContext().finish());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('#scene-canvas').screenshot({path:root+`assets/turtle-camera-grid-${state}-${device}-v10.png`,timeout:90000});}
  }
 }
}finally{await browser.close();await writeFile(root+'notes/turtle-view-v10-grid-validation.json',JSON.stringify({candidate:true,errors,records},null,2));}
