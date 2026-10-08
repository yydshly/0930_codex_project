import * as THREE from 'three';
import {catTorsoGeometry,catHeadGeometry,catLegGeometry,catPawGeometry,catCoatMaterial,catTail} from './cat-anatomy.js';
import {CAT_GROUND_Y,CAT_ROUTE_DURATION,CAT_STRIDE_LENGTH,catEase,catRoute,catGait,solveCatLeg} from './cat-motion.js';
import {catObservationView} from './cat-view.js';

function mesh(parent,geometry,material,position=[0,0,0]){
 const part=new THREE.Mesh(geometry,material);part.position.set(...position);part.castShadow=part.receiveShadow=true;parent.add(part);return part;
}
function tube(parent,points,radius,material){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,radius,5,false),material);}
const shortest=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*catEase(t);

export class CourtyardCat{
 constructor(parent){
  this.root=new THREE.Group();this.root.name='courtyard-cat';this.root.userData.actor='cat';parent.add(this.root);
  this.torso=new THREE.Group();this.root.add(this.torso);this.body=mesh(this.torso,catTorsoGeometry(),catCoatMaterial());
  this.neck=new THREE.Group();this.neck.position.set(.165,.29,0);this.torso.add(this.neck);
  this.head=mesh(this.neck,catHeadGeometry(),catCoatMaterial('head'));
  const pink=new THREE.MeshStandardMaterial({color:'#906d69',roughness:.92}),dark=new THREE.MeshStandardMaterial({color:'#2b211c',roughness:.85}),cream=new THREE.MeshStandardMaterial({color:'#c4b69e',roughness:.95});
  this.ears=[];this.eyes=[];
  for(const side of [-1,1]){
   const ear=new THREE.Group();ear.position.set(.065,.102,side*.042);this.neck.add(ear);
   const outer=mesh(ear,new THREE.ConeGeometry(.031,.077,5,3),catCoatMaterial('head'),[.009,.027,0]);outer.scale.set(.72,1,.47);outer.rotation.z=-.17;
   const inset=mesh(ear,new THREE.ConeGeometry(.022,.057,3,1),pink,[.022,.026,0]);inset.scale.set(.25,1,.53);inset.rotation.z=-.17;this.ears.push({node:ear,side});
   const eye=new THREE.Group();eye.position.set(.116,.077,side*.042);eye.rotation.y=-side*.78;this.neck.add(eye);
   const iris=mesh(eye,new THREE.SphereGeometry(.013,20,14),new THREE.MeshPhysicalMaterial({color:'#8eac58',roughness:.22,clearcoat:.75}),[0,0,0]);iris.scale.set(.72,1,.78);
   const pupil=mesh(eye,new THREE.SphereGeometry(.009,12,10),dark,[.008,0,0]);pupil.scale.set(.25,1.05,.19);
   mesh(eye,new THREE.SphereGeometry(.002,8,6),new THREE.MeshBasicMaterial({color:'#eee7d2'}),[.009,.004,side*.002]);this.eyes.push(eye);
   for(let i=0;i<4;i++)tube(this.neck,[[.151,.045-i*.003,side*.023],[.154-i*.003,.051-i*.008,side*.061],[.143-i*.01,.061-i*.010,side*(.103+i*.004)]],.00055,cream);
   tube(this.neck,[[.174,.034,0],[.162,.026,side*.011],[.144,.028,side*.024]],.0012,dark);
  }
  const noseGeometry=new THREE.BufferGeometry();noseGeometry.setAttribute('position',new THREE.Float32BufferAttribute([.175,.051,-.010,.175,.051,.010,.177,.038,0,.171,.049,0],3));noseGeometry.setIndex([0,2,1,0,1,3,1,2,3,2,0,3]);noseGeometry.computeVertexNormals();mesh(this.neck,noseGeometry,new THREE.MeshStandardMaterial({color:'#6c4b48',roughness:.75}));
  tube(this.neck,[[.177,.038,0],[.175,.033,0],[.174,.030,0]],.0009,dark);
  this.legs=[];const pawGeometry=catPawGeometry(),legMaterial=catCoatMaterial('leg');
  for(const hind of [false,true])for(const side of [-1,1]){
   const upperLength=hind?.156:.132,lowerLength=hind?.143:.132,hip=new THREE.Group(),lower=new THREE.Group(),paw=new THREE.Group();
   this.root.add(hip);hip.add(lower);this.root.add(paw);lower.position.y=-upperLength;
   mesh(hip,catLegGeometry(upperLength,true,hind),legMaterial);mesh(lower,catLegGeometry(lowerLength,false,hind),legMaterial);mesh(paw,pawGeometry,legMaterial);
   this.legs.push({hip,lower,paw,hind,side,upperLength,lowerLength,anchor:new THREE.Vector3(hind?-.16:.125,.267,side*.063)});
  }
  const tail=catTail(catCoatMaterial('leg'));this.tail=tail.mesh;this.tailBones=tail.bones;this.tail.position.set(-.236,.27,0);this.torso.add(this.tail);
  this.skeletons=[this.tail.skeleton];this.reset();
 }
 activate(){if(this.state==='sit')return '庭院猫正在坐下，停稳后可再次巡游';if(this.state==='walk'||this.state==='stand')return '庭院猫正在干地巡游';this.state='stand';this.timer=0;this.headingFrom=this.heading;return '庭院猫起身，在前景砾石上巡游';}
 reset(){this.state='observe';this.timer=0;this.time=0;this.patrolCount=0;this.heading=1.985;this.headingFrom=this.heading;this.worldPosition={x:2.45,y:CAT_GROUND_Y,z:6.6};this.update(0,0);}
 update(dt,time){
  // The caller's simulation clock freezes on pause. A zero step can still
  // rebuild local matrices after the pond's parent scale has changed.
  if(dt>0){this.time=time;this.timer+=dt;
   if(this.state==='observe'&&this.timer>=16){this.state='stand';this.timer-=16;this.headingFrom=this.heading;}
   if(this.state==='stand'&&this.timer>=1.1){this.state='walk';this.timer-=1.1;}
   if(this.state==='walk'&&this.timer>=CAT_ROUTE_DURATION){this.state='sit';this.timer-=CAT_ROUTE_DURATION;this.patrolCount++;this.headingFrom=this.heading;}
   if(this.state==='sit'&&this.timer>=1.2){this.state='observe';this.timer-=1.2;this.heading=1.985;}
  }
  const walking=this.state==='walk',route=catRoute(walking?this.timer:0),sit=this.state==='observe'?1:this.state==='stand'?1-catEase(this.timer/1.1):this.state==='sit'?catEase(this.timer/1.2):0;
  if(walking){this.worldPosition={x:route.x,y:CAT_GROUND_Y,z:route.z};this.heading=route.heading;}
  else{this.worldPosition={x:2.45,y:CAT_GROUND_Y,z:6.6};this.heading=this.state==='stand'?shortest(this.headingFrom,catRoute(0).heading,this.timer/1.1):this.state==='sit'?shortest(this.headingFrom,1.985,this.timer/1.2):this.heading;}
  this.root.parent?.updateWorldMatrix(true,false);
  const world=new THREE.Matrix4().compose(new THREE.Vector3(this.worldPosition.x,this.worldPosition.y,this.worldPosition.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.heading),new THREE.Vector3(1,1,1));
  this.root.matrixAutoUpdate=false;this.root.matrix.copy(this.root.parent?.matrixWorld??new THREE.Matrix4()).invert().multiply(world);this.root.matrix.decompose(this.root.position,this.root.quaternion,this.root.scale);this.root.matrixWorldNeedsUpdate=true;
  const weight=walking?catEase(route.speed/.13):0,stridePhase=route.distance/CAT_STRIDE_LENGTH*Math.PI*2,theta=.42*sit;
  const breath=Math.sin(this.time*2.2)*.0014,bob=Math.sin(stridePhase*2)*.0016*weight;
  // Rotate about the shoulders, keeping seated forelegs below the chest. An
  // origin pivot pulls the shoulders backward and makes the paws reach forward.
  this.torso.position.set(.125-.125*Math.cos(theta)+.267*Math.sin(theta),.267-.125*Math.sin(theta)-.267*Math.cos(theta)-.008*sit+breath+bob,Math.sin(stridePhase)*.0015*weight);
  this.torso.rotation.set(Math.sin(stridePhase)*.012*weight,0,theta);this.torso.scale.set(1,1+Math.sin(this.time*2.2)*.006,1+Math.sin(this.time*2.2)*.004);this.torso.updateMatrix();
  this.neck.rotation.set(0,Math.sin(this.time*.43)*.16*(walking?.35:1),-.85*theta+Math.sin(this.time*.75)*.016);
  this.ears.forEach(({node,side})=>node.rotation.set(side*(.08+Math.sin(this.time*.65+side)*.028),side*Math.sin(this.time*.29)*.12,0));
  const blink=Math.max(0,Math.sin(this.time*1.19+.9))**60;this.eyes.forEach(eye=>eye.scale.set(1,1-.91*blink,1));
  for(let i=0;i<this.legs.length;i++){
   const leg=this.legs[i],gait=walking?catGait(route.distance,[0,.5,.75,.25][i]):{x:0,lift:0};
   const hip=leg.anchor.clone().applyMatrix4(this.torso.matrix),restX=leg.hind?THREE.MathUtils.lerp(leg.anchor.x,hip.x-.04,sit):hip.x+.004;
   const pawX=restX+gait.x*weight,lift=gait.lift*weight,target=new THREE.Vector3(pawX,.024+lift,leg.side*(.064+.005*sit));
   leg.hip.position.copy(hip);const solved=solveCatLeg(hip,target,leg.upperLength,leg.lowerLength,leg.hind?1:-1);
   leg.hip.rotation.set(0,0,solved.upperAngle);leg.lower.rotation.set(0,0,solved.lowerAngle-solved.upperAngle);leg.paw.position.set(pawX,lift,target.z);leg.paw.rotation.set(0,0,0);
  }
  for(let i=0;i<this.tailBones.length;i++){
   const bone=this.tailBones[i];bone.rotation.set(0,(.038+Math.sin(this.time*1.25-i*.35)*.023)*(i?1:.4),i===0?THREE.MathUtils.lerp(-.53,-.45,sit):.035*Math.sin(i*.65+this.time*.7)-.012*(1-sit));
  }
  this.updateSkeletons();
 }
 updateSkeletons(){this.root.updateWorldMatrix(true,false);this.root.updateMatrixWorld(true);this.skeletons.forEach(skeleton=>skeleton.update());}
 poseNodes(){return [this.root,this.torso,this.neck,...this.ears.map(e=>e.node),...this.eyes,...this.legs.flatMap(l=>[l.hip,l.lower,l.paw]),...this.tailBones];}
 poseUniforms(){return [];}
 bounds(){
  this.updateSkeletons();const box=new THREE.Box3(),point=new THREE.Vector3();
  // Mesh caches are valid for rigid parts. A skinned tail needs its current
  // bone pose, so include its transformed vertices rather than bind-pose box.
  this.root.traverse(part=>{if(!part.isMesh)return;if(part.isSkinnedMesh){const positions=part.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i);part.applyBoneTransform(i,point);box.expandByPoint(point.applyMatrix4(part.matrixWorld));}}
   else{if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));}});
  return box;
 }
 getView(aspect=1){
  return catObservationView(this.bounds().getBoundingSphere(new THREE.Sphere()),aspect);
 }
}
