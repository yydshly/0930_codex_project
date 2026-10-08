import {T} from './three-stage.js';
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const up=new T.Vector3(0,1,0);
/** Case 06: score-derived contact, connected limbs and world-space support. */
export function createPerformance({keys,robot,cat,arms,feet,tail}){
 const keyFor=midi=>keys.find(key=>key.userData.midi===midi),robotLegs=robot.userData.legs||[],catLegs=cat.userData.legs||[];
 let result={performer:null,midi:null,contactDistance:null,pressedKeys:[]},cachedSequence,anchors,events;
 function prepare(sequence){
  if(cachedSequence===sequence||cachedSequence?.join(',')===sequence.join(','))return;
  cachedSequence=sequence.slice();events={robot:[],cat:[],catBlack:[],catWhite:[]};
  sequence.forEach((midi,index)=>{const role=midi<=67?'robot':'cat',key=keyFor(midi);if(!key)return;events[role].push(index);if(role==='cat')events[key.userData.baseY>1.7?'catBlack':'catWhite'].push(index);});
  anchors={};for(const role of ['robot','cat']){let last=keyFor(sequence[events[role][0]??0]);anchors[role]=sequence.map((midi,index)=>{if(events[role].includes(index))last=keyFor(midi);return last;});}
 }
 function segment(object,a,b){object.position.copy(a).add(b).multiplyScalar(.5);object.scale.y=a.distanceTo(b);object.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());}
 function armPose(arm,worldTarget){
  const local=arm.worldToLocal(worldTarget.clone()),origin=new T.Vector3(),elbow=local.clone().multiplyScalar(.48);elbow.x+=arm.userData.side*.1;elbow.z+=.18;
  segment(arm.userData.upper,origin,elbow);segment(arm.userData.fore,elbow,local);arm.userData.joint.position.copy(elbow);arm.userData.hand.position.copy(local);arm.userData.hand.rotation.set(0,0,0);
 }
 function legPose(leg,root){
  const target=leg.group.worldToLocal(leg.foot.getWorldPosition(new T.Vector3())),origin=new T.Vector3(),knee=target.clone().multiplyScalar(.5);knee.z+=root===robot?.075:.055;
  segment(leg.upper,origin,knee);segment(leg.lower,knee,target);leg.joint.position.copy(knee);
  if(root===robot)segment(leg.upper,origin,target);
  leg.skin?.userData.update(target,knee);
 }
 function eventWeight(list,beat,release=.32){let weight=0;for(const index of list)weight=Math.max(weight,ease((beat-index+.3)/.385)*(1-ease((beat-index-.60)/release)));return weight;}
 function posePoint(key,contactHeight,lift=.12){const black=key.userData.baseY>1.7;return new T.Vector3(key.position.x,key.userData.baseY+(black?.11:.1)+contactHeight+lift,black?.405:.97);}
 // Hold a stance foot in world space; the next short step follows a smooth arc.
 function step(root,leg,index,stride,moving){
  const origin=root===robot?-1.9:1.4,phase=root===robot?index*.5:index*.25,u=(root.position.x-origin)/stride+phase,n=Math.floor(u),q=u-n,swing=root===robot?.36:.20;
  const x=T.MathUtils.clamp(origin+(n-phase)*stride+leg.hipX+(q<swing?ease(q/swing)*stride:stride),-4.05,4.06),lift=q<swing?Math.sin(Math.PI*q/swing)**2*(root===robot?.075:.065)*moving:0;
  const z=root===robot?.90:(leg.hipZ<0?.67:.97),height=leg.foot.userData.contactHeight;
  const supportKey=keys.filter(key=>key.userData.baseY<1.7).reduce((a,b)=>Math.abs(a.position.x-x)<Math.abs(b.position.x-x)?a:b),surface=supportKey.position.y+.1;
  const world=new T.Vector3(x,surface+height+lift,z);leg.foot.position.copy(root.worldToLocal(world));leg.foot.rotation.set(0,0,0);
  return {name:leg.foot.name,stance:q>=swing,grounded:lift<1e-6,lift,surface,worldPosition:world.toArray()};
 }
 function update(sequence,progress,engaged){
  prepare(sequence);keys.forEach(key=>{key.position.y=key.userData.baseY;key.material.color.set(key.userData.color);});
  robot.position.set(-1.9,1.82,.63);robot.rotation.set(0,0,0);cat.position.set(1.4,1.79,.7);cat.rotation.set(0,0,0);tail.rotation.set(0,0,0);
  arms.forEach(arm=>arm.rotation.set(0,0,0));
  let press=0,index=-1,fraction=0,midi=null,beat=0,activeKey,role=null;
  if(engaged){beat=Math.min(sequence.length-.00001,Math.max(0,progress)*sequence.length);index=Math.floor(beat);fraction=beat-index;midi=sequence[index];role=midi<=67?'robot':'cat';activeKey=keyFor(midi);press=fraction<.085?ease(fraction/.085):fraction<.60?1:1-ease((fraction-.60)/.32);}
  const current=Math.max(0,index),previous=Math.max(0,current-1),next=Math.min(sequence.length-1,current+1),arrive=ease(fraction/.085),anticipate=engaged?ease((fraction-.60)/.40)*.85:0;
  const motion=(a,b,c)=>T.MathUtils.lerp(T.MathUtils.lerp(T.MathUtils.lerp(a,b,.85),b,arrive),c,anticipate);
  // Keep the partner's latest useful position across melody handovers.
  for(const [name,root,offset]of [['robot',robot,.41],['cat',cat,-.43]])root.position.x=motion(anchors[name][previous].position.x-offset,anchors[name][current].position.x-offset,anchors[name][next].position.x-offset);
  const depressed=activeKey?[activeKey]:[];if(activeKey&&index%4===0)depressed.push(keyFor(midi-12));
  depressed.filter(Boolean).forEach(key=>{key.position.y=key.userData.baseY-.09*press;key.material.color.set(key===activeKey?'#f3ce87':'#c7a767');});
  tail.rotation.x=engaged?Math.sin(beat*.85)*.14:0;
  for(const [name,root,partner,offset]of [['robot',robot,cat,.41],['cat',cat,robot,-.43]])if(root.userData.head){const weight=engaged?eventWeight(events[name],beat):0,aim=T.MathUtils.lerp(partner.position.x,root.position.x+offset,weight)-root.position.x-root.userData.head.position.x;root.userData.head.rotation.set(engaged?.07*weight:.015,T.MathUtils.clamp(aim*.14,-.14,.14),engaged?.012*Math.sin(beat*Math.PI):0);}
  robot.updateMatrixWorld(true);cat.updateMatrixWorld(true);
  const locomotion=name=>!engaged?0:clamp(Math.abs(anchors[name][current].position.x-anchors[name][previous].position.x)/.34*(fraction<.085?Math.sin(Math.PI*fraction/.085):0)+Math.abs(anchors[name][next].position.x-anchors[name][current].position.x)/.34*(fraction>.60?Math.sin(Math.PI*(fraction-.60)/.40):0));
  const support={robot:robotLegs.map((leg,i)=>step(robot,leg,i,.34,locomotion('robot'))),cat:catLegs.map((leg,i)=>step(cat,leg,i,.29,locomotion('cat')))};
  if(!catLegs.length)feet.forEach((foot,i)=>{foot.position.set(i<2?-.3:.29,.14,i%2?.15:-.15);foot.rotation.set(0,0,0);});
  robot.updateMatrixWorld(true);cat.updateMatrixWorld(true);
  const targetFor=(name,height)=>{
   const a=posePoint(anchors[name][previous],height),b=posePoint(anchors[name][current],height),c=posePoint(anchors[name][next],height);
   const point=a.lerp(b,.85).lerp(b,arrive).lerp(c,anticipate);
   if(role===name)point.y-=.21*press*(1-anticipate);
   return point;
  };
  arms.forEach((arm,i)=>{
   const shoulder=arm.getWorldPosition(new T.Vector3()),rest=shoulder.clone().add(new T.Vector3(i?-.07:.07,-.61,.25));
   const weight=i&&engaged?eventWeight(events.robot,beat):0;armPose(arm,rest.lerp(targetFor('robot',.055),weight));
  });
  if(engaged)for(const [pawIndex,eventName]of [[2,'catBlack'],[3,'catWhite']]){
   const paw=feet[pawIndex],weight=eventWeight(events[eventName],beat,.10),height=paw.userData.contactHeight??.17;
   if(weight){const resting=paw.getWorldPosition(new T.Vector3()),aim=targetFor('cat',height);paw.position.copy(cat.worldToLocal(resting.lerp(aim,weight)));support.cat[pawIndex]&&Object.assign(support.cat[pawIndex],{stance:false,performing:true});}
  }
  robot.updateMatrixWorld(true);cat.updateMatrixWorld(true);robotLegs.forEach(leg=>legPose(leg,robot));catLegs.forEach(leg=>legPose(leg,cat));
  for(const [name,legs]of [['robot',robotLegs],['cat',catLegs]])legs.forEach((leg,i)=>support[name][i].worldPosition=leg.foot.getWorldPosition(new T.Vector3()).toArray());
  if(activeKey){
   const black=activeKey.userData.baseY>1.7,top=activeKey.position.y+(black?.11:.1),z=black?.405:.97,effector=role==='robot'?arms[1].userData.hand:feet[black?2:3],height=role==='robot'?.055:effector.userData.contactHeight??.17,measured=effector.getWorldPosition(new T.Vector3());
   result={performer:role,midi,keyPosition:{x:activeKey.position.x,y:top,z},effectorPosition:{x:measured.x,y:measured.y-height,z:measured.z},contactDistance:Math.hypot(measured.x-activeKey.position.x,measured.y-height-top,measured.z-z),pressure:press,pressedKeys:keys.filter(k=>k.position.y<k.userData.baseY-.001).map(k=>k.userData.midi),index,support};
  }else result={performer:null,midi:null,contactDistance:null,pressure:0,pressedKeys:[],index:-1,support};
  return result;
 }
 return {update,getState:()=>structuredClone(result)};
}
