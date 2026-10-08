import * as THREE from 'three';
import { surfaceNets } from './sdf.js';
import { frogGeometry,turtleShellSDF,turtleHeadSDF,turtleLegSDF,turtleTailSDF } from './animal-anatomy.js';
import { seeded } from './geometry.js';
import {lilyGeometry,lilyHeightAt} from './lily-geometry.js';
import {sphereFitDistance} from './camera-framing.js';
import {pickVisibleActor} from './visible-picking.js';
import {CourtyardCat} from './cat.js';
import {ease,pondLocalToWorld,worldPoseToPondMatrix,landingArc,blendHeading,turtleRoute,turtleRouteHeading,turtleShoreClearance,TURTLE_ORBIT_DURATION,TURTLE_RADIUS,TURTLE_BANK_MARGIN} from './animal-water-motion.js';
const phase=(timer,duration)=>timer>=duration-1e-9?1:Math.max(0,timer/duration);

function addMesh(parent,geo,mat,p=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...p);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function patterned(kind){const m=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.42,clearcoat:.6,clearcoatRoughness:.22});
  m.onBeforeCompile=s=>{s.vertexShader='varying vec3 vAnimal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAnimal=position;');
    s.fragmentShader='varying vec3 vAnimal;\n'+s.fragmentShader;
    const pattern=kind==='frog'?`float spots=smoothstep(.7,.9,sin(vAnimal.x*420.+sin(vAnimal.z*230.))*sin(vAnimal.z*370.));
      vec3 col=mix(vec3(.20,.37,.045),vec3(.055,.095,.021),spots*.8);col=mix(vec3(.63,.65,.31),col,smoothstep(.006,.021,vAnimal.y));`:
      kind==='shell'?`vec2 p=vAnimal.xz*vec2(44.,57.);p.y+=mod(floor(p.x),2.)*.5;vec2 g=abs(fract(p)-.5);
        float seam=smoothstep(.40,.49,max(g.x,g.y));float ring=.85+.15*sin(min(.5-g.x,.5-g.y)*115.);
        vec3 col=mix(vec3(.18,.21,.07)*ring,vec3(.045,.057,.023),seam);col+=vec3(.14,.10,.025)*pow(max(0.,1.-g.x*7.),4.);`:
      `float stripe=smoothstep(.65,.9,.5+.5*sin(atan(vAnimal.z,vAnimal.y+.004)*9.+vAnimal.x*37.));vec3 col=mix(vec3(.05,.075,.027),vec3(.53,.49,.16),stripe);`;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+pattern+'\ndiffuseColor.rgb*=col;');};m.customProgramCacheKey=()=>kind;return m;
}
function lily(parent,x,z,geometry,material){const leaf=addMesh(parent,geometry,material,[x,.038,z]);
  leaf.scale.setScalar(.25);leaf.castShadow=leaf.receiveShadow=false;leaf.userData.anchor={x,z};leaf.userData.dynamicGeometry=true;leaf.name='animal-landing-lily';return leaf;
}
function wingTexture(){const c=document.createElement('canvas');c.width=256;c.height=96;const g=c.getContext('2d');g.fillStyle='rgba(214,235,237,.25)';g.fillRect(0,0,256,96);g.strokeStyle='rgba(93,122,127,.8)';g.lineWidth=1;
  for(let x=10;x<250;x+=14){g.beginPath();g.moveTo(x,0);g.lineTo(x+20,96);g.stroke();}for(let y=12;y<90;y+=12){g.beginPath();g.moveTo(0,y);g.lineTo(256,y+4);g.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function wingGeometry(){const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.012,.02,.007,.059);shape.quadraticCurveTo(.002,.080,-.008,.061);shape.quadraticCurveTo(-.018,.030,0,0);
  const g=new THREE.ShapeGeometry(shape,16);g.rotateX(Math.PI/2);return g;}
export class GardenAnimals {
  constructor(parent,water,audio,stoneMaterial){this.group=new THREE.Group();this.group.userData.dynamicGeometry=true;parent.add(this.group);this.water=water;this.audio=audio;this.scale=1;this.random=seeded(734);
    const leafGeometry=lilyGeometry(),leafMaterial=new THREE.MeshStandardMaterial({color:'#638139',roughness:.58,side:THREE.DoubleSide,vertexColors:true});
    this.pads=[lily(this.group,-1.65,2.15,leafGeometry,leafMaterial),lily(this.group,-1.0,2.65,leafGeometry,leafMaterial)];this.perchHeight=lilyHeightAt(leafGeometry,-.48,.14);this.time=0;this.landingEvents=0;this.splashEvents=0;
    const root=new THREE.Group();root.userData.actor='frog';this.group.add(root);root.position.set(-1.65,.043,2.15);root.scale.setScalar(1.65);root.rotation.y=-.55;
    const body=addMesh(root,frogGeometry(false),patterned('frog'));const leapGeo=frogGeometry(true);const eyes=[];
    for(const side of [-1,1]){const e=addMesh(root,new THREE.SphereGeometry(.0067,20,14),new THREE.MeshPhysicalMaterial({color:'#c9a248',roughness:.18,clearcoat:1}),[.031,.0402,side*.014]);
      const pupil=addMesh(e,new THREE.SphereGeometry(.004,12,8),new THREE.MeshBasicMaterial({color:'#10160c'}),[.001,.001,side*.004]);pupil.scale.set(1,.32,.7);eyes.push(e);}
    this.frog={root,body,idleGeo:body.geometry,leapGeo,eyes,state:'rest',timer:0,pad:0,heading:-.55,from:root.position.clone(),to:root.position.clone(),nextJump:17};
    const rock=addMesh(this.group,new THREE.SphereGeometry(1,20,12),stoneMaterial,[-3.45,-.05,1.25]);rock.scale.set(.44,.24,.36);
    const turtle=new THREE.Group();turtle.userData.actor='turtle';turtle.scale.setScalar(1.5);this.group.add(turtle);turtle.position.set(-3.45,.19,1.25);turtle.rotation.y=-.4;
    const shell=addMesh(turtle,surfaceNets(turtleShellSDF(),[-.126,-.002,-.096],[.126,.084,.096],.003),patterned('shell'));
    const skin=patterned('skin'),head=new THREE.Group();head.position.set(.083,.024,0);turtle.add(head);addMesh(head,surfaceNets(turtleHeadSDF(),[-.054,-.019,-.021],[.102,.027,.021],.002),skin);
    for(const side of [-1,1]){const e=addMesh(head,new THREE.SphereGeometry(.0044,12,8),new THREE.MeshPhysicalMaterial({color:'#bdb366',roughness:.18}),[.0765,.0132,side*.0112]);addMesh(e,new THREE.SphereGeometry(.0029,12,8),new THREE.MeshBasicMaterial({color:'#0c1008'}),[.001,.001,side*.0025]);}
    const limbs=[];for(const hind of [false,true]){const geo=surfaceNets(turtleLegSDF(hind),[-.034,-.021,-.036],[.082,.02,.036],.002);
      for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(hind?-.066:.066,.019,side*(hind?.047:.05));pivot.rotation.y=side*(hind?2.35:1.03);turtle.add(pivot);addMesh(pivot,geo,skin);limbs.push({pivot,side,hind,rest:pivot.rotation.y});}}
    const tail=addMesh(turtle,surfaceNets(turtleTailSDF(),[-.024,-.013,-.012],[.046,.011,.012],.002),skin,[-.098,.017,0]);tail.rotation.y=Math.PI;
    this.turtle={root:turtle,shell,head,limbs,state:'bask',timer:0,heading:-.4,bask:new THREE.Vector3(-3.45,.19,1.25),entry:new THREE.Vector3(-2.85,-.12,1.15),nextSwim:25};
    this.dragonflies=[];const wmat=new THREE.MeshPhysicalMaterial({map:wingTexture(),color:'#d9ecdf',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false,roughness:.25});
    for(let i=0;i<3;i++){const r=new THREE.Group();r.userData.actor='dragonfly';this.group.add(r);const mat=new THREE.MeshStandardMaterial({color:['#3894a1','#b85638','#797c2b'][i],roughness:.35,metalness:.15});
      for(let j=0;j<9;j++){const part=addMesh(r,new THREE.SphereGeometry(j<2?.011:.0055,10,6),mat,[-j*.010,0,0]);part.scale.x=1.35;part.castShadow=false;}
      for(const side of [-1,1])addMesh(r,new THREE.SphereGeometry(.009,12,8),new THREE.MeshStandardMaterial({color:'#405b43',roughness:.15}),[.012,.005,side*.008]);
      const wings=[];for(const x of [-.017,-.031])for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(x,.003,0);r.add(pivot);
        const w=addMesh(pivot,wingGeometry(),wmat);w.scale.z=side;w.rotation.y=side*(x===-.017?.25:-.2);w.castShadow=false;wings.push({pivot,side});}
      const legs=[];for(let j=0;j<3;j++)for(const side of [-1,1])legs.push(-.012-j*.009,-.004,side*.004,-.008-j*.007,-.021,side*.025);
      const legGeo=new THREE.BufferGeometry();legGeo.setAttribute('position',new THREE.Float32BufferAttribute(legs,3));r.add(new THREE.LineSegments(legGeo,new THREE.LineBasicMaterial({color:'#22261a'})));
      r.position.set(-1+i*.6,.55+i*.15,.8+i*.2);this.dragonflies.push({root:r,wings,state:'fly',timer:0,index:i,heading:0,from:r.position.clone(),target:r.position.clone(),duration:2});this.newFlight(this.dragonflies[i]);
    }
    this.cat=new CourtyardCat(this.group);
    this.update(0,0,{pondScale:1});
  }
  newFlight(d){d.from.copy(d.root.getWorldPosition(new THREE.Vector3()));d.fromQuaternion=d.worldQuaternion?.clone()??this.rotation(new THREE.Vector3(0,1,0),d.heading);const p=pondLocalToWorld({x:-2+this.random()*4,y:.35+this.random()*.8,z:.4+this.random()*2.2},this.scale);d.target.set(p.x,p.y,p.z);d.timer=0;d.duration=2+this.random()*2;d.state='fly';d.contact=null;}
  activate(name,time){if(name==='frog'&&this.frog.state==='rest'){const f=this.frog;f.state='jump';f.timer=0;f.from.copy(f.root.getWorldPosition(new THREE.Vector3()));f.fromQuaternion=f.worldQuaternion.clone();f.headingFrom=f.heading;f.pad=1-f.pad;const p=this.frogLandingPose(f.pad);f.to.copy(p.position);f.headingTo=Math.atan2(-(f.to.z-f.from.z),f.to.x-f.from.x);return '青蛙跃向另一片睡莲';}
    if(name==='turtle'){const t=this.turtle;if(t.state==='bask'){t.state='enter';t.timer=0;return '乌龟从晒台滑入池塘';}return '乌龟正在游泳，稍后回到晒台';}
    if(name==='dragonfly'){this.dragonflies.forEach(d=>this.newFlight(d));return '蜻蜓重新起飞';}if(name==='cat')return this.cat.activate();return null;}
  pick(ray){return pickVisibleActor(ray,this.group,{passThrough:[this.water.mesh]});}
  rotation(normal,heading){return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),heading));}
  setWorldPose(object,position,quaternion,dimensions){const world=new THREE.Matrix4().compose(position,quaternion,dimensions);object.matrixAutoUpdate=false;object.matrix.fromArray(worldPoseToPondMatrix(world.elements,this.scale));object.matrix.decompose(object.position,object.quaternion,object.scale);object.matrixWorldNeedsUpdate=true;}
  surfaceAtWorld(x,z,time){const a=this.water.floatAnchorAt(x,z,time),p=this.water.sampleAtRest(a.x,a.z,time);return {position:new THREE.Vector3(x,p.y,z),normal:new THREE.Vector3(...p.normal)};}
  updatePads(time){this.padPoses=this.pads.map(pad=>{const a=pondLocalToWorld(pad.userData.anchor,this.scale),p=this.water.sampleAtRest(a.x,a.z,time),normal=new THREE.Vector3(...p.normal),position=new THREE.Vector3(p.x,p.y,p.z).addScaledVector(normal,.006),quaternion=this.rotation(normal,0),radius=.25*this.scale;
      this.setWorldPose(pad,position,quaternion,new THREE.Vector3(radius,radius,radius));pad.userData.waterPose={sample:[p.x,p.y,p.z],normal:p.normal,offset:.006};return {position,normal,quaternion,radius};});}
  frogLandingPose(index){const p=this.padPoses[index];return {position:p.position.clone().addScaledVector(p.normal,p.radius*.012+.002),normal:p.normal};}
  dragonflyLandingPose(d){const p=this.padPoses[d.index%2],offset=new THREE.Vector3(-.48*p.radius,this.perchHeight*p.radius+.023,.14*p.radius).applyQuaternion(p.quaternion);return {position:p.position.clone().add(offset),normal:p.normal,quaternion:this.rotation(p.normal,d.heading)};}
  turtleSwimPose(timer,time){const p=turtleRoute(timer,this.scale),surface=this.surfaceAtWorld(p.x,p.z,time),heading=turtleRouteHeading(timer,this.scale);
    return {position:surface.position.clone().add(new THREE.Vector3(0,-.15,0)),normal:surface.normal,quaternion:this.rotation(surface.normal,heading)};}
  turtleBaskPose(){const p=pondLocalToWorld(this.turtle.bask,this.scale);return {position:new THREE.Vector3(p.x,p.y,p.z),quaternion:this.rotation(new THREE.Vector3(0,1,0),-.4)};}
  update(dt,time,settings){this.time=time;this.scale=settings.pondScale;this.group.scale.set(this.scale,1,this.scale);this.group.position.set(.5*(this.scale-1),0,.15*(this.scale-1));this.group.updateWorldMatrix(true,false);this.updatePads(time);
    const f=this.frog;f.timer+=dt;f.body.scale.y=1+Math.sin(time*3)*.025;f.eyes.forEach(e=>e.scale.y=1-.85*Math.max(0,Math.sin(time*1.7+1.4))**32);
    if(dt>0&&f.state==='rest'&&f.timer>f.nextJump)this.activate('frog',time);
    const landing=this.frogLandingPose(f.pad);let frogPosition=landing.position,frogQuaternion=this.rotation(landing.normal,f.heading);
    if(f.state==='jump'){const k=phase(f.timer,.85);f.body.geometry=k>.12&&k<.83?f.leapGeo:f.idleGeo;f.to.copy(landing.position);const arc=landingArc(f.from,f.to,k);frogPosition=new THREE.Vector3(arc.x,arc.y,arc.z);f.heading=blendHeading(f.headingFrom,f.headingTo,k);frogQuaternion=f.fromQuaternion.clone().slerp(this.rotation(landing.normal,f.headingTo),ease(k));
      if(k===1){f.state='rest';f.timer=0;f.nextJump=17+this.random()*12;this.landingEvents++;this.water.addRipple(frogPosition.x,frogPosition.z,time,.028);this.audio.event('frog');}}
    f.worldQuaternion=frogQuaternion.clone();this.setWorldPose(f.root,frogPosition,frogQuaternion,new THREE.Vector3(1.65*this.scale,1.65,1.65*this.scale));f.contact=f.state==='rest'?landing.position.toArray():null;
    const t=this.turtle;t.timer+=dt;
    if(dt>0&&t.state==='bask'&&t.timer>t.nextSwim)this.activate('turtle',time);
    let turtlePose=this.turtleBaskPose(),shouldSplash=false;
    if(t.state==='enter'){const k=phase(t.timer,2.4),swim=this.turtleSwimPose(0,time),f=ease(k);turtlePose={position:turtlePose.position.lerp(swim.position,f),quaternion:turtlePose.quaternion.slerp(swim.quaternion,f)};
      if(k===1){t.state='swim';t.timer=0;shouldSplash=true;}}
    if(t.state==='swim'){turtlePose=this.turtleSwimPose(t.timer,time);if(t.timer>=TURTLE_ORBIT_DURATION-1e-9){t.state='exit';t.timer=0;}}
    if(t.state==='exit'){const k=phase(t.timer,3),swim=this.turtleSwimPose(TURTLE_ORBIT_DURATION,time),bask=this.turtleBaskPose(),f=ease(k);turtlePose={position:swim.position.lerp(bask.position,f),quaternion:swim.quaternion.slerp(bask.quaternion,f)};if(k===1){t.state='bask';t.timer=0;t.nextSwim=25;}}
    this.setWorldPose(t.root,turtlePose.position,turtlePose.quaternion,new THREE.Vector3(1.5*this.scale,1.5,1.5*this.scale));if(shouldSplash)this.splash(t,time);
    const swimWeight=t.state==='enter'?ease(phase(t.timer,.4)):t.state==='exit'?1-ease(phase(t.timer,3)):t.state==='swim'?1:0;
    // Quaternion interpolation/restoration may express rear yaw as XYZ with
    // x/z=pi. Author the whole rotation so a zero-step update stays idempotent.
    t.limbs.forEach((l,i)=>{const resting=Math.sin(time+i*Math.PI)*.025,swimming=Math.sin(time*5+i*Math.PI)*.42;l.pivot.rotation.set(0,l.rest+THREE.MathUtils.lerp(resting,swimming,swimWeight),0);});t.head.rotation.y=Math.sin(time*.6)*.08;
    for(const d of this.dragonflies){d.timer+=dt;const k=phase(d.timer,d.duration);let position,quaternion=this.rotation(new THREE.Vector3(0,1,0),d.heading);
      if(d.state==='fly'){position=d.from.clone().lerp(d.target,ease(k));position.y+=Math.sin(k*Math.PI)*.14;const v=d.target.clone().sub(d.from);d.heading=Math.atan2(-v.z,v.x);quaternion=d.fromQuaternion.clone().slerp(this.rotation(new THREE.Vector3(0,1,0),d.heading),ease(Math.min(1,d.timer/.3)));if(k===1){d.state='hover';d.timer=0;d.duration=1.2+this.random()*2;}}
      else if(d.state==='hover'){position=d.target.clone();position.y+=Math.sin(time*5+d.index)*.018*ease(Math.min(1,d.timer/.35));if(k===1){d.state='perch';d.timer=0;d.duration=2.2;d.from.copy(position);d.fromQuaternion=quaternion.clone();}}
      else{const landing=this.dragonflyLandingPose(d),arrival=ease(phase(d.timer,.8));d.target.copy(landing.position);position=d.from.clone().lerp(landing.position,arrival);quaternion=d.fromQuaternion.clone().slerp(landing.quaternion,arrival);d.contact=d.timer>=.8-1e-9?landing.position.toArray():null;}
      d.worldQuaternion=quaternion.clone();this.setWorldPose(d.root,position,quaternion,new THREE.Vector3(this.scale,1,this.scale));if(d.state==='perch'&&d.timer>=d.duration)this.newFlight(d);
      for(const w of d.wings)w.pivot.rotation.x=w.side*(d.state==='perch'&&d.timer>.8?.04:Math.sin(time*170+d.index)*.55);
    }
    this.cat.update(dt,time);
  }
  splash(t,time){const p=t.root.getWorldPosition(new THREE.Vector3());this.splashEvents++;this.water.addRipple(p.x,p.z,time,.035);this.audio.event('splash');}
  getView(name,aspect=1){if(name==='cat')return this.cat.getView(aspect);const actor=name==='frog'?this.frog.root:name==='turtle'?this.turtle.root:this.dragonflies[0].root;this.group.updateMatrixWorld(true);
    // Geometry bounding boxes are cached; their transformed corners give a
    // conservative sphere without scanning every SDF vertex on each frame.
    const s=this.scale,fov=48,body=new THREE.Box3().setFromObject(actor).getBoundingSphere(new THREE.Sphere()),target=body.center.clone();let radius=body.radius;
    const pad=name==='frog'?this.pads[this.frog.pad]:name==='dragonfly'&&this.dragonflies[0].state==='perch'?this.pads[0]:null;
    if(pad){const leaf=pad.getWorldPosition(new THREE.Vector3());target.lerp(leaf,.5);radius=Math.max(body.center.distanceTo(target)+body.radius,leaf.distanceTo(target)+.27*s);}
    const offset=name==='dragonfly'?new THREE.Vector3(.55*s,1.1,-.35*s):name==='frog'?new THREE.Vector3(.65*s,1.15,-.30*s):this.turtle.state==='bask'?new THREE.Vector3(.85*s,.78,.30*s):new THREE.Vector3(.95*s,.80,-.15*s),distance=Math.max(sphereFitDistance(Math.max(radius,.08),fov,aspect),name==='turtle'?offset.length():0);
    return {position:target.clone().addScaledVector(offset.normalize(),distance).toArray(),target:target.toArray(),fov};}
  debugPose(){this.group.updateWorldMatrix(true,true);const position=o=>o.getWorldPosition(new THREE.Vector3()).toArray(),up=o=>new THREE.Vector3(0,1,0).applyMatrix3(new THREE.Matrix3().getNormalMatrix(o.matrixWorld)).normalize().toArray(),p=position(this.turtle.root),surface=this.surfaceAtWorld(p[0],p[2],this.time);
    return {time:this.time,scale:this.scale,landingEvents:this.landingEvents,splashEvents:this.splashEvents,pads:this.pads.map((pad,i)=>({position:position(pad),normal:up(pad),water:pad.userData.waterPose,radius:this.padPoses[i].radius})),frog:{state:this.frog.state,pad:this.frog.pad,position:position(this.frog.root),normal:up(this.frog.root),contact:this.frog.contact,target:this.frogLandingPose(this.frog.pad).position.toArray()},dragonflies:this.dragonflies.map(d=>({state:d.state,timer:d.timer,position:position(d.root),normal:up(d.root),contact:d.contact,target:this.dragonflyLandingPose(d).position.toArray()})),turtle:{state:this.turtle.state,timer:this.turtle.timer,position:p,surfaceHeight:surface.position.y,depth:surface.position.y-p[1],shoreClearance:turtleShoreClearance({x:p[0],z:p[2]},this.scale),bodyRadius:TURTLE_RADIUS*this.scale,bankMargin:TURTLE_BANK_MARGIN*this.scale}};}
  reset(){this.random=seeded(734);this.landingEvents=this.splashEvents=0;this.group.scale.set(this.scale,1,this.scale);this.group.position.set(.5*(this.scale-1),0,.15*(this.scale-1));this.group.updateWorldMatrix(true,false);const f=this.frog;f.state='rest';f.timer=0;f.pad=0;f.heading=-.55;f.nextJump=17;f.body.geometry=f.idleGeo;const t=this.turtle;t.state='bask';t.timer=0;t.nextSwim=25;
    for(const d of this.dragonflies){const p=pondLocalToWorld({x:-1+d.index*.6,y:.55+d.index*.15,z:.8+d.index*.2},this.scale);d.worldQuaternion=this.rotation(new THREE.Vector3(0,1,0),0);this.setWorldPose(d.root,new THREE.Vector3(p.x,p.y,p.z),d.worldQuaternion,new THREE.Vector3(this.scale,1,this.scale));d.heading=0;this.newFlight(d);}this.cat.reset();this.update(0,0,{pondScale:this.scale});}
}
