import {T,clamp} from './four-playable-stage.js';

// Only presentation belongs here. The centre-camera Raycaster still decides hits.
export function makeShotFeedback(stage,gun){
 const muzzleLocal=new T.Vector3().copy(gun.userData.muzzle),base={...gun.userData.viewBase},charge=gun.userData.charge,duration=.42;
 let lastShot=null,lastTime=0,pose={kick:0,return:0},serial=0;
 const muzzle=new T.Group();muzzle.position.copy(muzzleLocal);gun.add(muzzle);
 const flareMaterial=new T.MeshBasicMaterial({color:'#d9f8ed',transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending});
 const flare=new T.Mesh(new T.ConeGeometry(.025,.13,5,1,true),flareMaterial);flare.rotation.x=-Math.PI/2;flare.position.z=-.055;muzzle.add(flare);
 const collar=new T.Mesh(new T.TorusGeometry(.025,.004,6,20),flareMaterial);muzzle.add(collar);muzzle.visible=false;
 const tracer=new T.Group();stage.scene.add(tracer);
 const traceCore=new T.Mesh(new T.CylinderGeometry(.004,.007,1,6),new T.MeshBasicMaterial({color:'#d0fff0',transparent:true,opacity:.9,depthWrite:false}));
 const traceGlow=new T.Mesh(new T.CylinderGeometry(.012,.016,1,6),new T.MeshBasicMaterial({color:'#79d9ca',transparent:true,opacity:.2,depthWrite:false,blending:T.AdditiveBlending}));tracer.add(traceCore,traceGlow);tracer.visible=false;
 const impact=new T.Group();stage.scene.add(impact);impact.visible=false;
 const sparkMaterial=new T.MeshBasicMaterial({color:'#b7f0d5',transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending});
 const sparkCore=new T.Mesh(new T.SphereGeometry(.024,10,6),sparkMaterial);impact.add(sparkCore);
 const impactRing=new T.Mesh(new T.TorusGeometry(.035,.004,6,20),sparkMaterial);impactRing.position.z=.003;impact.add(impactRing);
 const sparks=[],sparkBatch=new T.InstancedMesh(new T.CylinderGeometry(.002,.004,.055,4),sparkMaterial,7),sparkMatrix=new T.Matrix4(),unitScale=new T.Vector3(1,1,1),sparkOffset=new T.Vector3();sparkBatch.instanceMatrix.setUsage(T.DynamicDrawUsage);sparkBatch.frustumCulled=false;impact.add(sparkBatch);
 for(let i=0;i<7;i++){const angle=i*Math.PI*2/7+.21,dir=new T.Vector3(Math.cos(angle),Math.sin(angle),.35+(i%3)*.16).normalize(),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir);sparks.push({dir,rotation});}
 function update(clock,elapsed=0,ammo=12){lastTime=clock;const age=lastShot?Math.max(0,clock-lastShot.clock):duration;
  const kick=age<duration?Math.exp(-age*12)*(1+.14*Math.sin(age*34)):0;
  const returning=age<duration?Math.sin(Math.min(1,age/duration)*Math.PI)*Math.exp(-age*7):0;pose={kick,return:returning};
  gun.position.set(base.x+kick*.008,base.y+Math.sin(elapsed*6)*.006-kick*.014,base.z+kick*.045-returning*.008);
  gun.rotation.set(kick*.065-returning*.012,kick*-.012,kick*-.025);charge.material.emissiveIntensity=.18+.65*ammo/12;
  muzzle.visible=Boolean(lastShot)&&age<.075;flareMaterial.opacity=.85*clamp(1-age/.075,0,1);muzzle.scale.setScalar(.8+clamp(age/.075,0,1)*.7);
  tracer.visible=Boolean(lastShot)&&age<.095;traceCore.material.opacity=.8*clamp(1-age/.095,0,1);traceGlow.material.opacity=.22*clamp(1-age/.095,0,1);
  impact.visible=Boolean(lastShot?.surfacePoint)&&age<.28;sparkMaterial.opacity=clamp(1-age/.28,0,1);sparkCore.scale.setScalar(1-clamp(age/.28,0,1)*.5);impactRing.scale.setScalar(1+Math.min(age,.28)*7);
  if(impact.visible){sparks.forEach((s,i)=>{sparkOffset.copy(s.dir).multiplyScalar(.02+age*(lastShot?.surface==='robot'?.95:.65));sparkMatrix.compose(sparkOffset,s.rotation,unitScale);sparkBatch.setMatrixAt(i,sparkMatrix);});sparkBatch.instanceMatrix.needsUpdate=true;}
  return pose;
 }
 function fire({clock,elapsed,ammo,result,point,normal,surface,enemyId,distance}){
  lastShot={serial:++serial,clock,result,surface,enemyId:enemyId??null,distance:+distance.toFixed(3),target:{x:+point.x.toFixed(3),y:+point.y.toFixed(3),z:+point.z.toFixed(3)},surfacePoint:surface==='air'?null:{x:+point.x.toFixed(3),y:+point.y.toFixed(3),z:+point.z.toFixed(3)},surfaceNormal:surface==='air'?null:{x:+normal.x.toFixed(3),y:+normal.y.toFixed(3),z:+normal.z.toFixed(3)},origin:null};
  update(clock,elapsed,ammo);lastShot.weaponPose={position:{x:gun.position.x,y:gun.position.y,z:gun.position.z},rotation:{x:gun.rotation.x,y:gun.rotation.y,z:gun.rotation.z}};stage.scene.updateMatrixWorld(true);
  const origin=gun.localToWorld(muzzleLocal.clone()),delta=point.clone().sub(origin);lastShot.origin={x:+origin.x.toFixed(3),y:+origin.y.toFixed(3),z:+origin.z.toFixed(3)};
  tracer.position.copy(origin.clone().add(point).multiplyScalar(.5));tracer.scale.y=delta.length();tracer.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  if(lastShot.surfacePoint){impact.position.copy(point).addScaledVector(normal,.008);impact.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);sparkMaterial.color.set(surface==='robot'?'#b8efd7':'#e8c18a');}
  return snapshot();
 }
 function snapshot(){return {clock:'active-wall-clock',duration,muzzleLocal:{...gun.userData.muzzle},weaponScale:gun.scale.x,age:lastShot?+Math.max(0,lastTime-lastShot.clock).toFixed(3):null,recoil:{kick:+pose.kick.toFixed(4),return:+pose.return.toFixed(4),position:{x:+gun.position.x.toFixed(4),y:+gun.position.y.toFixed(4),z:+gun.position.z.toFixed(4)},rotation:{x:+gun.rotation.x.toFixed(4),y:+gun.rotation.y.toFixed(4),z:+gun.rotation.z.toFixed(4)},affectsAim:false},visible:{muzzle:muzzle.visible,tracer:tracer.visible,impact:impact.visible},lastShot:lastShot?{...lastShot}:null};}
 function reset(){lastShot=null;serial=0;update(lastTime,0,12);}
 return {fire,update,getState:snapshot,reset};
}
