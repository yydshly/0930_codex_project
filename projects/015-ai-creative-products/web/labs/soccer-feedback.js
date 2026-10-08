import {T,clamp} from './four-playable-stage.js';

// This is a visual suspension rig over the lab's simplified contact model.
// Grounded tire centers stay at their radius; only the sprung body leans.
export function createSoccerFeedback(car){
 const wheels=car.userData.wheels||[],body=new T.Group();
 for(const child of [...car.children])if(!wheels.includes(child))body.add(child);
 car.add(body);
 const wheelPivots=wheels.map(wheel=>{const pivot=new T.Group();pivot.position.copy(wheel.position);pivot.position.y=.38-.65;wheel.position.set(0,0,0);pivot.add(wheel);car.add(pivot);return {wheel,pivot,front:pivot.position.z<0};});
 const axleMaterial=new T.MeshStandardMaterial({color:'#728a91',metalness:.65,roughness:.35}),up=new T.Vector3(0,1,0);
 const links=wheelPivots.map(({pivot:wheel})=>{const rod=new T.Mesh(new T.CylinderGeometry(.033,.033,1,8),axleMaterial);car.add(rod);return {wheel,rod,anchor:new T.Vector3(Math.sign(wheel.position.x)*.57,-.12,wheel.position.z),a:new T.Vector3(),delta:new T.Vector3()};});
 let pitch=0,roll=0,heave=0,pitchV=0,rollV=0,heaveV=0,grounded=true,tireBottom=0,landingCount=0,contactCount=0,lastLandingSpeed=0,lastLandingCompression=0,lastContactImpulse=0,lastContactPitchKick=0,lastContactRollKick=0,contactAge=Infinity,landingAge=Infinity,brakeAge=Infinity,brakeCount=0,lastBrakeSpeedDelta=0,lastBrakeMinPitch=0;
 const spring=(value,velocity,target,dt,k,damping)=>{velocity+=((target-value)*k-velocity*damping)*dt;return [value+velocity*dt,velocity];};
 function reset(clearHistory=false){pitch=roll=heave=pitchV=rollV=heaveV=0;grounded=true;tireBottom=0;if(clearHistory){landingCount=contactCount=brakeCount=0;lastLandingSpeed=lastLandingCompression=lastContactImpulse=lastContactPitchKick=lastContactRollKick=lastBrakeSpeedDelta=lastBrakeMinPitch=0;}contactAge=landingAge=brakeAge=Infinity;draw();}
 function step({car:c,forwardAcceleration,lateralAcceleration,landed,landingSpeed,impulse,impulseForward,impulseSide,brakeDelta=0},dt){
  grounded=c.y<=.6501&&c.vy<=0;
  tireBottom=c.y-.65;
  if(landed){landingCount++;lastLandingSpeed=landingSpeed;lastLandingCompression=0;landingAge=0;heaveV-=Math.min(1.2,landingSpeed*.11);}
  if(impulse>0){contactCount++;lastContactImpulse=impulse;contactAge=0;lastContactPitchKick=clamp(-impulseForward*.04,-.45,.45);lastContactRollKick=clamp(-impulseSide*.04,-.4,.4);pitchV+=lastContactPitchKick;rollV+=lastContactRollKick;heaveV-=Math.min(.24,impulse*.014);}
  if(brakeDelta){brakeCount++;brakeAge=0;lastBrakeSpeedDelta=brakeDelta;lastBrakeMinPitch=0;pitchV+=clamp(brakeDelta*.12,-1.1,1.1);}
  contactAge+=dt;landingAge+=dt;brakeAge+=dt;
  const pitchTarget=grounded?clamp(forwardAcceleration*.0035,-.085,.085):clamp(c.vy*.012,-.12,.12);
  const rollTarget=grounded?clamp(lateralAcceleration*.004,-.1,.1):0;
  [pitch,pitchV]=spring(pitch,pitchV,pitchTarget,dt,50,10);
  [roll,rollV]=spring(roll,rollV,rollTarget,dt,105,18);
  [heave,heaveV]=spring(heave,heaveV,grounded?0:.035,dt,65,11);
  heave=clamp(heave,-.13,.065);pitch=clamp(pitch,-.19,.19);roll=clamp(roll,-.17,.17);
  if(landingAge<1)lastLandingCompression=Math.min(lastLandingCompression,heave);
  if(brakeAge<1)lastBrakeMinPitch=Math.min(lastBrakeMinPitch,pitch);
 }
 function draw(wheelAngle=0,turn=0){body.position.y=heave;body.rotation.x=pitch;body.rotation.z=roll;for(const {wheel,pivot,front} of wheelPivots){wheel.rotation.x=wheelAngle;wheel.rotation.y=0;pivot.rotation.y=front?-turn*.26:0;}for(const link of links){link.a.copy(link.anchor).applyEuler(body.rotation).add(body.position);link.delta.copy(link.wheel.position).sub(link.a);link.rod.position.copy(link.a).addScaledVector(link.delta,.5);link.rod.scale.y=link.delta.length();link.rod.quaternion.setFromUnitVectors(up,link.delta.normalize());}}
 function getState(){let maxLinkError=0;for(const {wheel,anchor,a,rod} of links){a.copy(anchor).applyEuler(body.rotation).add(body.position);const tip=new T.Vector3(0,.5*rod.scale.y,0).applyQuaternion(rod.quaternion).add(rod.position),base=new T.Vector3(0,-.5*rod.scale.y,0).applyQuaternion(rod.quaternion).add(rod.position);maxLinkError=Math.max(maxLinkError,tip.distanceTo(wheel.position),base.distanceTo(a));}let maxWheelAxisVertical=0;for(const {wheel} of wheelPivots)maxWheelAxisVertical=Math.max(maxWheelAxisVertical,Math.abs(new T.Vector3(1,0,0).applyQuaternion(wheel.getWorldQuaternion(new T.Quaternion())).y));const front=new T.Vector3(0,0,-1.575).applyEuler(body.rotation).add(body.position),rear=new T.Vector3(0,0,1.575).applyEuler(body.rotation).add(body.position),left=new T.Vector3(-.9,0,0).applyEuler(body.rotation).add(body.position),right=new T.Vector3(.9,0,0).applyEuler(body.rotation).add(body.position);return {grounded,frontMinusRearHeight:+(front.y-rear.y).toFixed(4),rightMinusLeftHeight:+(right.y-left.y).toFixed(4),bodyPitch:+pitch.toFixed(4),bodyRoll:+roll.toFixed(4),bodyHeave:+heave.toFixed(4),tireRadius:.38,maxWheelAxisVertical:+maxWheelAxisVertical.toFixed(6),tireBottom:+tireBottom.toFixed(4),suspensionLinkMaxError:+maxLinkError.toFixed(6),brakeCount,lastBrakeSpeedDelta:+lastBrakeSpeedDelta.toFixed(3),lastBrakeMinPitch:+lastBrakeMinPitch.toFixed(4),landingCount,lastLandingSpeed:+lastLandingSpeed.toFixed(3),lastLandingCompression:+lastLandingCompression.toFixed(4),contactCount,lastContactImpulse:+lastContactImpulse.toFixed(3),lastContactPitchKick:+lastContactPitchKick.toFixed(4),lastContactRollKick:+lastContactRollKick.toFixed(4),contactAge:Number.isFinite(contactAge)?+contactAge.toFixed(3):null,scope:'Visual spring response from actual acceleration, contact impulse and landing velocity; simplified vehicle contact remains unchanged.'};}
 return {step,draw,reset,getState};
}

// Retain the previous RAF timestamp. Hidden time never advances the match.
export function createSoccerLoop(update,draw,needed){
 let raf=0,last=0,active=true,disposed=false;const ctrl=new AbortController();
 function tick(t){raf=0;if(disposed||!active||document.hidden||!needed())return;const dt=Math.max(0,(t-last)/1000);last=t;update(dt);draw();if(!disposed&&active&&!document.hidden&&needed())raf=requestAnimationFrame(tick);else last=0;}
 function start(){if(!raf&&!disposed&&active&&!document.hidden&&needed()){last=performance.now();raf=requestAnimationFrame(tick);}}
 function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start(),{signal:ctrl.signal});
 return {start,stop,get active(){return active&&!document.hidden&&!disposed;},setActive(v){active=Boolean(v);if(active)start();else stop();},dispose(){disposed=true;active=false;stop();ctrl.abort();}};
}
