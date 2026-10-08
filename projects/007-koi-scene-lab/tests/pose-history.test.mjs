import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PoseHistory,poseSnapshotSignature} from '../src/pose-history.js';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const THREE=require('three');
const near=(a,b,epsilon=1e-10)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('display interpolation blends pose and uniforms while restoring the current simulation',()=>{
 const history=new PoseHistory(),node=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),uniform={value:0};
 history.record([node],[uniform],0);
 const oldGeometry=node.geometry;
 node.position.set(4,2,-6);node.scale.set(3,2,1);node.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);node.geometry=new THREE.SphereGeometry();node.visible=false;uniform.value=8;
 history.record([node],[uniform],2);
 const current={position:node.position.toArray(),quaternion:node.quaternion.toArray(),scale:node.scale.toArray(),matrix:node.matrix.toArray(),geometry:node.geometry};
 const result=history.withInterpolated(.5,time=>{
  near(time,1);assert.deepEqual(node.position.toArray(),[2,1,-3]);assert.deepEqual(node.scale.toArray(),[2,1.5,1]);near(node.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4)),0,1e-7);
  near(uniform.value,4);assert.equal(node.visible,true);assert.equal(node.geometry,oldGeometry);return 'rendered';
 });
 assert.equal(result,'rendered');assert.deepEqual(node.position.toArray(),current.position);assert.deepEqual(node.quaternion.toArray(),current.quaternion);assert.deepEqual(node.scale.toArray(),current.scale);assert.deepEqual(node.matrix.toArray(),current.matrix);assert.equal(node.geometry,current.geometry);assert.equal(node.visible,false);near(uniform.value,8);
});

test('world interpolation under nonuniform parents preserves affine shear and restores its exact matrix',()=>{
 for(const pondScale of [.65,1.25]){
  const history=new PoseHistory(),parent=new THREE.Group(),leaf=new THREE.Object3D();parent.add(leaf);parent.position.set(.5*(pondScale-1),0,.15*(pondScale-1));parent.scale.set(pondScale,1,pondScale);parent.updateWorldMatrix(true,false);leaf.matrixAutoUpdate=false;
  const dimensions=new THREE.Vector3(.25*pondScale,.25*pondScale,.25*pondScale);
  const pose=(position,angle)=>{
   const world=new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle),dimensions);
   leaf.matrix.copy(parent.matrixWorld).invert().multiply(world);leaf.matrix.decompose(leaf.position,leaf.quaternion,leaf.scale);leaf.matrixWorldNeedsUpdate=true;
  };
  pose(new THREE.Vector3(-2,.03,1),.2);history.record([leaf],[],0);
  pose(new THREE.Vector3(-1,.07,2),.4);history.record([leaf],[],1);
  const current=leaf.matrix.toArray(),columns=[new THREE.Vector3().setFromMatrixColumn(leaf.matrix,0),new THREE.Vector3().setFromMatrixColumn(leaf.matrix,1)];assert.ok(Math.abs(columns[0].dot(columns[1]))>1e-4);
  for(const alpha of [0,.37,1]){
   history.withInterpolated(alpha,()=>{
    leaf.updateWorldMatrix(true,false);const expected=new THREE.Matrix4().compose(new THREE.Vector3(-2+alpha,.03+.04*alpha,1+alpha),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.2+.2*alpha),dimensions);
    leaf.matrixWorld.elements.forEach((v,i)=>near(v,expected.elements[i]));
    assert.equal(leaf.matrixAutoUpdate,false);
   });
   assert.deepEqual(leaf.matrix.toArray(),current);assert.equal(leaf.matrixAutoUpdate,false);
  }
  assert.throws(()=>history.withInterpolated(.37,()=>{throw new Error('affine render failed');}),/affine render failed/);
  assert.deepEqual(leaf.matrix.toArray(),current);
 }
});

test('a failed render restores simulation poses and leaves reset history without an old transition',()=>{
 const history=new PoseHistory(),node=new THREE.Object3D(),uniform={value:2};history.record([node],[uniform],0);
 node.position.x=3;uniform.value=6;history.record([node],[uniform],1);
 assert.throws(()=>history.withInterpolated(.25,()=>{near(node.position.x,.75);throw new Error('render failed');}),/render failed/);
 near(node.position.x,3);near(uniform.value,6);
 node.position.x=10;uniform.value=9;history.record([node],[uniform],5,true);
 history.withInterpolated(0,time=>{near(node.position.x,10);near(uniform.value,9);near(time,5);});
});

test('frozen signatures compare content rather than newly allocated snapshot maps or buffer upload versions',()=>{
 const history=new PoseHistory(),node=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),uniform={value:3};history.record([node],[uniform],4,true);
 const signature=poseSnapshotSignature(history.current,['extra']);node.geometry.attributes.position.needsUpdate=true;history.record([node],[uniform],4,true);
 assert.equal(poseSnapshotSignature(history.current,['extra']),signature);assert.notEqual(poseSnapshotSignature(history.current,['changed']),signature);assert.equal(poseSnapshotSignature(null),null);
});

test('frozen signatures preserve node and geometry identity, visibility, transforms and scalar uniforms',()=>{
 const history=new PoseHistory(),node=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),uniform={value:3};
 const signature=()=>{history.record([node],[uniform],4,true);return poseSnapshotSignature(history.current);};let previous=signature();
 for(const mutate of [()=>node.position.x++,()=>node.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),.2),()=>node.scale.y=2,()=>node.visible=false,()=>node.geometry=node.geometry.clone(),()=>uniform.value=7]){mutate();const next=signature();assert.notEqual(next,previous);previous=next;}
 const replacement=new THREE.Mesh(node.geometry,node.material);replacement.copy(node);history.record([replacement],[uniform],4,true);assert.notEqual(poseSnapshotSignature(history.current),previous);
});

test('frozen signatures detect raw affine matrix and snapshot time changes without changing their inputs',()=>{
 const history=new PoseHistory(),node=new THREE.Object3D();node.matrixAutoUpdate=false;node.matrix.elements[4]=.17;history.record([node],[],1,true);
 const first=history.current,signature=poseSnapshotSignature(first);node.matrix.elements[4]=.18;history.record([node],[],1,true);assert.notEqual(poseSnapshotSignature(history.current),signature);
 assert.equal(poseSnapshotSignature(first),signature);history.record([node],[],2,true);assert.notEqual(poseSnapshotSignature(history.current),poseSnapshotSignature({...history.current,time:1}));
});
