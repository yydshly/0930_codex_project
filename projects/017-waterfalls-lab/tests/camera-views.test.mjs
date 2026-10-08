import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveCameraView,removeCameraView,CAMERA_VIEW_LIMIT} from '../src/camera-views.js';
import {DEFAULT_SCENE,encodeProject,decodeProject} from '../src/project.js';
const camera=()=>({position:[7.5,7.5,11],target:[-.35,4.15,-.5]});

test('saved views own their camera arrays, preserve earlier views and generate readable names',()=>{
  const pose=camera(),first=saveCameraView([],pose,'  洞口  '),second=saveCameraView(first.views,pose,'');
  assert.equal(first.views[0].name,'洞口');assert.equal(second.views[1].name,'镜头 2');assert.equal(second.index,1);
  pose.position[0]=2;second.views[0].camera.target[1]=1;assert.equal(first.views[0].camera.position[0],7.5);assert.equal(first.views[0].camera.target[1],4.15);
  assert.equal(saveCameraView([],camera(),'a'.repeat(40)).views[0].name.length,32);
});
test('updating and removing a view preserve every other camera and do not mutate the original list',()=>{
  const first=saveCameraView([],camera(),'山谷'),second=saveCameraView(first.views,{position:[.2,24,5],target:[0,3,0]},'俯瞰');
  const updated=saveCameraView(second.views,{position:[18,8,1],target:[0,4,0]},'侧景',0);
  assert.equal(updated.views.length,2);assert.equal(updated.views[0].name,'侧景');assert.deepEqual(updated.views[1],second.views[1]);assert.equal(second.views[0].name,'山谷');
  const removed=removeCameraView(updated.views,0);assert.deepEqual(removed,[second.views[1]]);removed[0].camera.position[0]=5;assert.equal(second.views[1].camera.position[0],.2);
});
test('view capacity and invalid indices reject edits before touching saved views',()=>{
  const views=Array.from({length:CAMERA_VIEW_LIMIT},(_,i)=>({name:'镜头 '+i,camera:camera()})),before=structuredClone(views);
  assert.throws(()=>saveCameraView(views,camera(),'新镜头'),/8/);assert.throws(()=>saveCameraView(views,camera(),'更新',8));assert.throws(()=>removeCameraView(views,-1));assert.throws(()=>removeCameraView(views,null));assert.deepEqual(views,before);
  assert.equal(saveCameraView(views,camera(),'更新',7).views.length,8);
});
test('v2 project roundtrips keep named views and older works receive an independent empty list',()=>{
  const scene=structuredClone(DEFAULT_SCENE);scene.cameraViews=saveCameraView([],camera(),'我的近景').views;
  const text=encodeProject(scene,camera(),'我的作品'),decoded=decodeProject(text);assert.equal(JSON.parse(text).version,2);assert.deepEqual(decoded.scene.cameraViews,scene.cameraViews);
  const old=JSON.parse(text);delete old.scene.cameraViews;const a=decodeProject(JSON.stringify(old)),b=decodeProject(JSON.stringify(old));assert.deepEqual(a.scene.cameraViews,[]);a.scene.cameraViews.push(scene.cameraViews[0]);assert.deepEqual(b.scene.cameraViews,[]);assert.deepEqual(DEFAULT_SCENE.cameraViews,[]);
});
test('import rejects broken or excessive camera views while accepting all eight valid views',()=>{
  const scene=structuredClone(DEFAULT_SCENE);scene.cameraViews=Array.from({length:8},(_,i)=>({name:'镜头 '+i,camera:camera()}));const valid=JSON.parse(encodeProject(scene,camera()));
  assert.equal(decodeProject(JSON.stringify(valid)).scene.cameraViews.length,8);
  for(const mutate of [doc=>doc.scene.cameraViews.push(doc.scene.cameraViews[0]),doc=>doc.scene.cameraViews=null,doc=>doc.scene.cameraViews[0].name=null,doc=>doc.scene.cameraViews[0].camera.position[0]=Infinity,doc=>doc.scene.cameraViews[0].camera.target=[0,99,0]]){
    const broken=structuredClone(valid);mutate(broken);assert.throws(()=>decodeProject(JSON.stringify(broken)));
  }
});
