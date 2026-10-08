import * as THREE from 'three';
import { createHandRig,poseHand,poseHandFlat,solveTip,setHandWet,fingertip } from './hand-rig-v3.js';
import { seeded } from './geometry.js';
const ease=k=>{k=THREE.MathUtils.clamp(k,0,1);return k*k*(3-2*k);};
const xAxis=new THREE.Vector3(1,0,0),zAxis=new THREE.Vector3(0,0,1);
export class HandInteraction {
 constructor(courtyard){this.owner=courtyard;this.rig=createHandRig();courtyard.scene.add(this.rig.root);this.mode=this.phase='idle';this.timer=0;this.released=false;this.contact=false;this.random=seeded(452);
  this.grain=new THREE.Mesh(new THREE.SphereGeometry(.004,10,8),new THREE.MeshStandardMaterial({color:'#9d753e',roughness:.94}));this.grain.scale.set(1,.82,1.25);this.rig.root.add(this.grain);this.grain.visible=false;}
 start(mode){const c=this.owner;if(c.imported)return;const previousInspect=this.mode==='inspect'?this.previous:null;if(this.mode==='inspect')this.stop();
  if(this.mode!=='idle'){c.onStatus({message:'当前动作进行中；可点击“结束互动”或拖动镜头退出'});return;}
  if(mode==='stroke'&&!c.settings.fishCount){c.onStatus({message:'先增加锦鲤数量，再开始抚摸'});return;}
  c.updateSettings({paused:false,autoTour:false});const scale=c.settings.pondScale;
  this.point=new THREE.Vector3(-.4,.02,-.15+3.15*scale);this.mode=mode;this.timer=0;this.released=false;this.contact=false;this.touching=false;this.touchAnnounced=false;this.emitted=0;this.exitFrom=null;this.phase='approach';
  this.previous=previousInspect||{position:c.camera.position.clone(),target:c.controls.target.clone(),fov:c.camera.fov,maxPolarAngle:c.controls.maxPolarAngle};
  if(mode==='inspect')c.controls.maxPolarAngle=Math.PI*.70;
  this.direction=new THREE.Vector3(-.15,0,-1).normalize();const up=new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(this.direction,up);
  this.baseQuaternion=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.direction,up,side));this.rig.root.quaternion.copy(this.baseQuaternion);
  this.end=this.point.clone().addScaledVector(this.direction,-.14);this.end.y=mode==='inspect'?.39:.20;
  this.begin=this.end.clone().add(new THREE.Vector3(.25,.13,.55));this.rig.root.position.copy(mode==='inspect'?this.end:this.begin);this.rig.root.visible=true;
  const shot=mode==='inspect'?{position:[this.point.x-.18,.86,this.point.z+.36],target:[this.point.x-.035,.38,this.point.z-.045],fov:44}:
   {position:[.20,1.0,-.15+4.25*scale],target:this.point.toArray(),fov:49};c.moveCamera(shot);
  if(mode==='stroke'){this.fish=c.school.selectStroke(this.point,c.settings.fishCount);c.school.strokeTarget.heading=Math.atan2(-this.direction.z,this.direction.x);}
  c.onStatus({interaction:mode,message:mode==='feed'?'捏起饲料，伸手后分次撒入池塘':mode==='stroke'?'等待锦鲤靠近，再轻抚鱼背':'观察手部：拖动可看手背、掌心和关节；可直接切换投喂或抚摸'});
 }
 stop(restore=false){const c=this.owner;this.mode=this.phase='idle';this.rig.root.visible=false;this.grain.visible=false;this.contact=this.touching=false;c.school.strokeTarget=null;
  if(this.previous?.maxPolarAngle)c.controls.maxPolarAngle=this.previous.maxPolarAngle;
  if(restore&&this.previous)c.moveCamera({position:this.previous.position.toArray(),target:this.previous.target.toArray(),fov:this.previous.fov});c.onStatus({interaction:'idle'});}
 placeGrain(){const index=fingertip(this.rig,'index'),thumb=fingertip(this.rig,'thumb'),center=index.add(thumb).multiplyScalar(.5);
  this.grain.position.copy(this.rig.root.worldToLocal(center));this.grain.visible=this.rig.pinchGap<.023;return this.rig.root.localToWorld(this.grain.position.clone());}
 update(dt,time){if(this.mode==='idle')return;this.timer+=dt;const c=this.owner,H=this.rig,t=this.timer;
  if(this.mode==='inspect'){const cycle=t%7.2,pinch=cycle<2?0:cycle<2.9?ease((cycle-2)/.9):cycle<4.1?1:cycle<5?1-ease((cycle-4.1)/.9):0;
   H.root.quaternion.copy(this.baseQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(xAxis,Math.sin(t*.5)*.12));
   if(pinch>.01){poseHand(H,pinch,.08,time);this.placeGrain();}else{poseHandFlat(H,1,time);this.grain.visible=false;}
   this.phase=pinch>.8?'pinch':'inspect';setHandWet(H,0,dt);return;}
  if(this.mode==='feed'){
   const reach=ease(t/1.25),withdraw=ease((t-3.9)/1.15);H.root.position.lerpVectors(this.begin,this.end,reach*(1-withdraw));H.root.position.y+=Math.sin(reach*Math.PI)*.036+Math.sin(withdraw*Math.PI)*.045;
   const cycle=THREE.MathUtils.clamp((t-1.55)/.68,0,3),fraction=cycle%1;
   const release=t>=1.55&&t<3.59,pinch=release?1-ease(fraction/.60)*.84:t<1.55?.97:.13;
   H.root.quaternion.copy(this.baseQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(xAxis,-.11*ease((t-1.1)/.65)+Math.sin(cycle*Math.PI*2)*.025));
   poseHand(H,pinch,release?.10:0,time);const origin=this.placeGrain();this.grain.visible=this.grain.visible&&t<3.59&&(!release||fraction<.22);
   this.phase=t<1.25?'approach':t<1.55?'pinch':t<3.9?'release':'withdraw';
   if(t>=1.55&&!this.released){this.released=true;c.school.feed(time,this.point);c.audio.event('feed');c.onStatus({message:'指尖松开，饲料落水，锦鲤正在靠近'});}
   if(t>=1.55&&t<3.9&&dt>0){const want=Math.min(18,Math.floor((t-1.55)*9+1e-6));while(this.emitted<want){this.emitted++;const velocity=this.direction.clone().multiplyScalar(.08+this.random()*.08);
     velocity.x+=(this.random()-.5)*.14;velocity.z+=(this.random()-.5)*.14;velocity.y=-.03-this.random()*.06;
     c.school.releasePellet(time,origin.clone().add(new THREE.Vector3((this.random()-.5)*.006,-.006,(this.random()-.5)*.006)),velocity);}}
   setHandWet(H,0,dt);if(t>5.1)this.stop();
  }else{
   if(!this.fish.group.visible){this.stop();return;}this.grain.visible=false;const p=this.fish.group.position,distance=Math.hypot(p.x-this.point.x,p.z-this.point.z);
   if(!this.contact){H.root.position.lerpVectors(this.begin,this.end,ease(t/1.4));poseHandFlat(H,.8,time);this.phase='waiting';
    if(t>1.4&&distance<.18){this.contact=true;this.contactTime=t;}}
   else{const age=t-this.contactTime;
    if(age<4.8){const pass=(1-Math.cos(age*2.0))*.5,offset=THREE.MathUtils.lerp(-.135,-.075,pass),desired=p.clone().addScaledVector(this.direction,offset);
     desired.y=this.bodyTop(p)+.024;H.root.position.lerp(desired,1-Math.exp(-dt*8));H.root.quaternion.copy(this.baseQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(xAxis,Math.sin(age*1.7)*.035));
     poseHandFlat(H,1,time);this.conformFingers();this.fitPalm();this.phase=age<.65?'lower':'contact';this.touching=age>=.65;
     if(this.touching&&!this.touchAnnounced){this.touchAnnounced=true;c.audio.event('stroke');c.onStatus({message:'手掌轻贴鱼背，顺着鳞片方向缓慢抚摸'});}
     if(dt>0&&this.touching&&time>(this.nextRipple||0)){this.nextRipple=time+.5;c.water.addRipple(p.x,p.z,time,.005);}
    }else{this.phase='withdraw';this.touching=false;this.exitFrom??=H.root.position.clone();H.root.position.lerpVectors(this.exitFrom,this.begin,ease((age-4.8)/1));H.root.position.y+=Math.sin(ease((age-4.8)/1)*Math.PI)*.03;poseHandFlat(H,1,time);if(age>5.8)this.stop();}
   }
   setHandWet(H,this.touching?.8:0,dt);if(t>16)this.stop();
  }
 }
 bodyTop(point){const f=this.fish,g=f.group;g.updateWorldMatrix(true,false);const local=g.worldToLocal(point.clone()),s=THREE.MathUtils.clamp(.5-local.x,0,1),width=.005+.104*Math.sin(Math.PI*Math.pow(s,.7))*(1-.78*Math.pow(s,4));
  return g.position.y+width*.85*Math.sqrt(Math.max(0,1-(local.z/Math.max(width,.008))**2))*g.scale.y;
 }
 conformFingers(){const H=this.rig;H.root.updateMatrixWorld(true);for(const name of ['index','middle','ring','pinky']){
   const tip=fingertip(H,name),local=this.fish.group.worldToLocal(tip.clone());if(Math.abs(local.x)>.36||Math.abs(local.z)>.095)continue;
   const target=tip.clone();target.y=this.bodyTop(tip)+.0045;solveTip(H,name,H.root.worldToLocal(target),4,.6);}
 }
 fitPalm(){const H=this.rig,g=this.fish.group;H.root.updateMatrixWorld(true);H.mesh.skeleton.update();let gap=Infinity;
  for(const index of H.palmSamples){const p=H.mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(H.mesh.matrixWorld),local=g.worldToLocal(p.clone());
   const s=THREE.MathUtils.clamp(.5-local.x,0,1),width=.005+.104*Math.sin(Math.PI*Math.pow(s,.7))*(1-.78*Math.pow(s,4));
   if(Math.abs(local.x)>.44||Math.abs(local.z)>width*.92)continue;gap=Math.min(gap,p.y-this.bodyTop(p));}
  const lift=Math.max(0,.0015-gap);if(Number.isFinite(gap)){H.root.position.y+=lift;H.root.updateMatrixWorld(true);H.contactClearance=gap+lift;}else H.contactClearance=null;
 }
}
