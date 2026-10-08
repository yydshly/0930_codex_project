import * as THREE from 'three';
import { createHandRig,poseHand,poseHandFlat,setHandWet,padPoint } from './hand-rig.js';
import { seeded } from './geometry.js';
const ease=k=>{k=THREE.MathUtils.clamp(k,0,1);return k*k*(3-2*k);};
const xAxis=new THREE.Vector3(1,0,0),zAxis=new THREE.Vector3(0,0,1);
export class HandInteraction {
 constructor(courtyard){this.owner=courtyard;this.rig=createHandRig();courtyard.scene.add(this.rig.root);this.mode=this.phase='idle';this.timer=0;this.released=false;this.contact=false;this.random=seeded(452);
  this.totalPellets=6;this.grain=new THREE.Group();const geometry=new THREE.SphereGeometry(.0023,10,8),material=new THREE.MeshStandardMaterial({color:'#82603b',roughness:.93});
  for(let i=0;i<this.totalPellets;i++){const m=new THREE.Mesh(geometry,material);m.position.set((i%3-1)*.0046,0,(Math.floor(i/3)-.5)*.0048);m.scale.set(1,.8,1.3);this.grain.add(m);}this.rig.root.add(this.grain);this.grain.visible=false;}
 start(mode){const c=this.owner;if(!c.hasDynamics)return;const previousInspect=this.mode==='inspect'?this.previous:null;if(this.mode==='inspect')this.stop();
  if(this.mode!=='idle'){c.onStatus({message:'当前动作进行中；可点击“结束互动”或拖动镜头退出'});return;}
  if(mode==='stroke'&&!c.settings.fishCount){c.onStatus({message:'先增加锦鲤数量，再观察轻触惊散'});return;}
  if(mode==='stroke'&&c.school.startleState?.remaining>0){c.onStatus({message:'鱼群仍在恢复；等它们平静后再靠近'});return;}
  c.binding.mode=null;c.binding.redraw();c.updateSettings({paused:false,autoTour:false});const scale=c.settings.pondScale;
  const level=c.waterLevel;this.point=c.school.habitat?new THREE.Vector3(c.school.habitat.feedPoint.x,level,c.school.habitat.feedPoint.z):new THREE.Vector3(-.4,.02,-.15+3.15*scale);
  if(mode==='stroke'){this.fish=c.school.selectStroke(this.point,c.settings.fishCount);if(!this.fish)return;this.point.set(this.fish.group.position.x,level,this.fish.group.position.z);}
  this.mode=mode;this.timer=0;this.released=false;this.contact=false;this.touching=false;this.touchAnnounced=false;this.emitted=0;this.exitFrom=null;this.phase='approach';this.withdrawTime=null;this.nextRipple=0;
  this.previous=previousInspect||{position:c.camera.position.clone(),target:c.controls.target.clone(),fov:c.camera.fov,maxPolarAngle:c.controls.maxPolarAngle};
  if(mode==='inspect')c.controls.maxPolarAngle=Math.PI*.70;
  this.direction=new THREE.Vector3(-.15,0,-1).normalize();const up=new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(this.direction,up);
  this.baseQuaternion=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.direction,up,side));this.rig.root.quaternion.copy(this.baseQuaternion);
  this.end=this.point.clone().addScaledVector(this.direction,mode==='stroke'?-.085:-.14);this.end.y=level+(mode==='inspect'?.37:mode==='stroke'?.060:.18);
  this.begin=this.end.clone().add(new THREE.Vector3(.25,.13,.55));this.rig.root.position.copy(mode==='inspect'?this.end:this.begin);this.rig.root.visible=true;
  const shot=mode==='inspect'?{position:[this.point.x-.18,level+.84,this.point.z+.36],target:[this.point.x-.035,level+.36,this.point.z-.045],fov:44}:
   mode==='feed'?{position:[this.point.x-.62,level+.68,this.point.z+.85],target:[this.point.x,level+.055,this.point.z-.08],fov:46}:
   {position:[this.point.x+.6,level+.98,this.point.z+1.1],target:this.point.toArray(),fov:49};c.moveCamera(shot);
  if(mode==='feed'){this.feedBatch=c.school.feeding.begin(this.totalPellets,c.time);c.school.feed(c.time,this.point);}
  if(mode==='stroke')c.school.beginApproach(this.approachSource(),c.settings.fishCount,c.time);
  c.onStatus({interaction:mode,message:mode==='feed'?(c.settings.fishCount?'捏住一小撮饲料，伸手后松指落下':'当前没有锦鲤，本轮仅观察饲料释放与落水'):mode==='stroke'?'手短暂靠近水面，观察锦鲤警觉、惊散与恢复':'观察手部：拖动可看手背、掌心和关节；可直接切换投喂或轻触惊散'});
 }
 stop(restore=false,reason='stopped'){const c=this.owner;if(this.mode==='feed')c.school.feeding.end(this.feedBatch,reason);if(this.mode==='stroke')c.school.endApproach();this.feedBatch=null;this.mode=this.phase='idle';this.rig.root.visible=false;this.grain.visible=false;this.contact=this.touching=false;c.school.strokeTarget=null;
  if(this.previous?.maxPolarAngle)c.controls.maxPolarAngle=this.previous.maxPolarAngle;
  if(restore&&this.previous)c.moveCamera({position:this.previous.position.toArray(),target:this.previous.target.toArray(),fov:this.previous.fov});c.onStatus({interaction:'idle'});}
 reset(){this.stop();this.random=seeded(452);this.timer=0;this.emitted=0;this.released=false;this.previous=null;}
 placeGrain(){const center=padPoint(this.rig,'index').add(padPoint(this.rig,'thumb')).multiplyScalar(.5);
  this.grain.position.copy(this.rig.root.worldToLocal(center));this.grain.visible=this.mode==='inspect'?this.rig.pinchGap<.024:this.emitted<this.totalPellets;
  this.grain.children.forEach((m,i)=>m.visible=this.mode==='inspect'||i>=this.emitted);this.rig.root.updateMatrixWorld(true);return this.rig.root.localToWorld(this.grain.position.clone());}
 update(dt,time){if(this.mode==='idle'||!(dt>0))return;this.timer+=dt;const c=this.owner,H=this.rig,t=this.timer;
  if(this.mode==='inspect'){const cycle=t%7.2,pinch=cycle<2?0:cycle<2.9?ease((cycle-2)/.9):cycle<4.1?1:cycle<5?1-ease((cycle-4.1)/.9):0;
   H.root.quaternion.copy(this.baseQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(xAxis,Math.sin(t*.5)*.12));
   if(pinch>.01){poseHand(H,pinch,.08,time);this.placeGrain();}else{poseHandFlat(H,1,time);this.grain.visible=false;}
   this.phase=pinch>.8?'pinch':'inspect';setHandWet(H,0,dt);return;}
  if(this.mode==='feed'){
   const reach=ease(t/1.2),withdraw=ease((t-2.75)/1.20);H.root.position.lerpVectors(this.begin,this.end,reach*(1-withdraw));H.root.position.y+=Math.sin(reach*Math.PI)*.035+Math.sin(withdraw*Math.PI)*.045;
   const release=ease((t-1.68)/.50),pinch=THREE.MathUtils.lerp(1,.12,release);H.root.position.y-=release*(1-withdraw)*.012;
   H.root.quaternion.copy(this.baseQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(xAxis,THREE.MathUtils.lerp(.46,.26,withdraw)+release*.035)).multiply(new THREE.Quaternion().setFromAxisAngle(zAxis,-release*.075));
   poseHand(H,pinch,0,time);this.placeGrain();this.phase=t<1.20?'approach':t<1.74?'pinch':t<2.20?'release':t<2.75?'relax':'withdraw';
   if(t>=1.74&&t<2.75&&dt>0){const want=Math.min(this.totalPellets,Math.floor((t-1.74)/.045+1e-6)+1);while(this.emitted<want){const held=this.grain.children[this.emitted],origin=held.getWorldPosition(new THREE.Vector3());
     const velocity=this.direction.clone().multiplyScalar(.045+this.random()*.045);velocity.x+=(this.random()-.5)*.06;velocity.z+=(this.random()-.5)*.06;velocity.y=-.025-this.random()*.025;
     c.school.releasePellet(time,origin,velocity,this.feedBatch);held.visible=false;this.emitted++;}
    if(!this.released){this.released=true;c.audio.event('feed');c.onStatus({message:c.settings.fishCount?'饲料从指间落下，可观察锦鲤追食与水面反馈':'饲料从指间落下；当前没有锦鲤，可观察落水与涟漪'});}}
   this.grain.visible=this.emitted<this.totalPellets;setHandWet(H,0,dt);if(t>4.0)this.stop(false,'complete');
  }else{
   if(!this.fish.group.visible){this.stop();return;}this.grain.visible=false;
   // Aim once at the selected fish's initial location. A fleeing fish does not
   // become a moving hand target, and no fish is pulled to this position.
   if(this.withdrawTime===null){H.root.position.lerpVectors(this.begin,this.end,ease(t/1.15));poseHandFlat(H,.95,time);this.phase=t<1.15?'approach':'near-water';
    c.school.updateApproach(this.approachSource(),time,dt);
    const state=c.school.startleState;
    if(state.phase==='startled'||state.phase==='recovering'||t>1.8){this.withdrawTime=t;this.exitFrom=H.root.position.clone();c.school.endApproach();
     c.onStatus({message:state.phase==='startled'||state.phase==='recovering'?'鱼已避开，手及时收回，等待鱼群恢复':'手已收回；附近鱼未进入近距离刺激范围'});}
   }else{const age=t-this.withdrawTime,k=ease(age/.75);this.phase='withdraw';this.touching=false;
    H.root.position.lerpVectors(this.exitFrom,this.begin,k);H.root.position.y+=Math.sin(k*Math.PI)*.045;poseHandFlat(H,1,time);if(age>=.75)this.stop(false,'complete');}
   setHandWet(H,0,dt);
  }
 }
 approachSource(){this.rig.root.updateMatrixWorld(true);return this.rig.root.localToWorld(new THREE.Vector3(.070,.003,0));}
}
