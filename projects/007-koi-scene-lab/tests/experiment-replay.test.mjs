import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from '../tooling/node_modules/esbuild/lib/main.js';
import * as THREE from '../tooling/node_modules/three/build/three.module.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundled=await build({entryPoints:[root+'src/experiment.js'],bundle:true,format:'esm',write:false,nodePaths:[root+'tooling/node_modules']});
const {AlgorithmExperiment}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
function fixture(){
 const fish={id:0,group:{position:new THREE.Vector3(),scale:new THREE.Vector3(1,1,1)},heading:0,speed:.1,phase:{value:0},amp:{value:.04},state:{uNormalCorrection:{value:1}},steeringDebug:{separation:{x:1,z:0},alignment:{x:0,z:1},cohesion:{x:0,z:0},combined:{x:1,z:1}},debugBodies:[{x:.3,y:0,z:0,radius:.1},{x:0,y:0,z:0,radius:.1},{x:-.3,y:0,z:0,radius:.1}]};
 const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(1,2,3);
 const c={school:{fish:[fish],group:{visible:true},metrics:{alignment:.5},setExperiment(p){this.experiment={...p};}},scene:{add(){}},camera,controls:{target:new THREE.Vector3(),enableDamping:true,update(){}},settings:{fishCount:1,wind:.32,modelScale:1,hour:16.3,paused:false},binding:{applied:null},hasDynamics:true,audio:{enabled:false},water:{setDebugMode(mode){this.mode=mode;}},canvas:{width:400,height:400},time:0,updateSettings(p){this.settings={...this.settings,...p};},resetExperimentRun(){this.time=0;fish.group.position.set(0,0,0);fish.phase.value=0;},replayExperimentRun(seconds){this.resetExperimentRun();for(let i=0;i<Math.round(seconds*60);i++){fish.group.position.x+=this.school.experiment.separation/60;fish.phase.value+=1/60;this.time+=1/60;}this.settings.paused=true;return {time:this.time,image:'data:image/png;base64,mocked-render-result'};}};
 c.experiment=new AlgorithmExperiment(c);return c;
}
test('A and B use a common captured scenario while retaining changed B parameters',()=>{
 const c=fixture(),e=c.experiment;e.captureBaseline();e.setParameters({separation:0,normalCorrection:false});c.settings.wind=.8;c.camera.position.set(8,9,10);
 const a=e.compareBaseline(2);assert.equal(a.mode,'baseline');assert.equal(c.school.experiment.separation,2.4);assert.equal(c.settings.wind,.32);assert.deepEqual(c.camera.position.toArray(),[1,2,3]);assert.equal(a.current.savedSettings.wind,.8);
 const b=e.restoreCurrent(2);assert.equal(b.mode,'current');assert.equal(c.school.experiment.separation,0);assert.equal(c.school.fish[0].state.uNormalCorrection.value,0);assert.equal(c.settings.wind,.32);assert.ok(b.difference.meanPosition>4);assert.equal(b.difference.sameTrajectory,false);
 assert.equal(e.getState({includeImages:false}).results.current.image,null);e.dispose();
});
test('same parameters reproduce the same trajectory signature and endpoint',()=>{
 const c=fixture(),e=c.experiment;e.captureBaseline();e.compareBaseline(2);const b=e.restoreCurrent(2);
 assert.deepEqual(b.results.baseline.positions,b.results.current.positions);assert.equal(b.difference.sameTrajectory,true);assert.equal(b.difference.maxPosition,0);e.dispose();
});
test('overlays draw applied directions and all three physical approximation spheres independently',()=>{
 const c=fixture(),e=c.experiment;e.setParameters({overlay:{vectors:true,collision:true},collision:false});
 assert.equal(e.group.visible,true);assert.equal(e.lines[0].object.geometry.drawRange.count,6);assert.equal(e.lines[2].object.geometry.drawRange.count,0);assert.equal(e.spheres.count,3);assert.equal(e.parameters.collision,false);
 e.setParameters({overlay:{vectors:false}});assert.equal(e.lines[0].object.visible,false);assert.equal(e.spheres.visible,true);
 e.setParameters({overlay:{collision:false}});assert.equal(e.group.visible,false);e.dispose();
});
test('changed habitat invalidates comparisons and unbound model rejects replay capture',()=>{
 const c=fixture(),e=c.experiment;e.captureBaseline();e.setParameters({alignment:0});e.compareBaseline(2);c.binding.applied={waterLevel:1};e.update();
 assert.equal(e.getState().baseline,null);assert.equal(e.parameters.alignment,0);assert.ok(e.getState().lastInvalidation.includes('变化'));
 c.hasDynamics=false;assert.throws(()=>e.captureBaseline(),/绑定/);e.setParameters({cohesion:0});assert.equal(e.parameters.cohesion,0);e.dispose();
});
