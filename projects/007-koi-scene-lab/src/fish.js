/*! Locomotion formulas adapted from Koi Pond Garden, ©2026 Sourany Phomhome.
 * MIT: web/upstream/KOI-LICENSE.txt. Snapshot Boids and shoreline/collision integration: src/fish-steering.js. */
import * as THREE from 'three';
import {seeded} from './geometry.js';
import {createKoi} from './koi-material.js';
import {schoolSnapshot,boidsForces,createShoreline,signedShoreDistance,shorelineSteering,turnStep,resolveBodies,bodySpheres,obstacleSteering} from './fish-steering.js';
import {EXPERIMENT_DEFAULTS,validateExperiment} from './config.js';
import {validateHabitat,sampleHabitatSpawn,projectIntoHabitat,habitatClearance} from './habitat-geometry.js';
import {tailSource,surfaceWake} from './fish-wake.js';
import {FeedLedger} from './feed-ledger.js';
import {FishStartle,STARTLE_LIMITS} from './fish-startle.js';
const clamp=THREE.MathUtils.clamp,damp=THREE.MathUtils.damp;
export class KoiSchool {
 constructor(scene,water){this.group=new THREE.Group();scene.add(this.group);this.water=water;this.fish=[];this.surfaceDetail=true;this.feedUntil=0;this.feedPoint=new THREE.Vector3();this.strokeTarget=null;this.consumed=0;this.habitat=null;this.experiment={...EXPERIMENT_DEFAULTS};this.metrics={activeFish:0,alignment:0,cohesion:0,separation:0,turnRate:0,effort:0,neighbors:0,boundary:0,contacts:0,consumed:0,startleIntensity:0,alertFish:0,fleeingFish:0};const random=seeded(51);
  for(let i=0;i<20;i++){const f=createKoi(i),size=.53+random()*.24,angle=random()*Math.PI*2;
   f.group.scale.setScalar(size);f.group.position.set(-.5+Math.cos(angle)*(1.2+random()*1.5),-.20-random()*.12,Math.sin(angle)*(1+random()*.7));
   Object.assign(f,{id:i,heading:random()*Math.PI*2,speed:.10+random()*.09,seed:random()*10,phase:f.state.uPhase,amp:f.state.uAmp,turnRate:0,effort:.3,bend:0,spread:.5,bursting:true,cycleT:.6+random()*.8,random:seeded(1500+i)});f.cruise=f.spawnSpeed=f.speed;f.baseSpawn=f.group.position.clone();f.spawn=f.baseSpawn.clone();f.spawnHeading=f.heading;f.spawnCycle=f.cycleT;this.group.add(f.group);this.fish.push(f);}
  this.startle=new FishStartle();this.onStartleState=null;this.feeding=new FeedLedger();this.surfaceWakeCount=0;this.food=new THREE.Group();scene.add(this.food);const geometry=new THREE.SphereGeometry(.0023,10,8),material=new THREE.MeshStandardMaterial({color:'#82603b',roughness:.93});
  for(let i=0;i<24;i++){const pellet=new THREE.Mesh(geometry,material);pellet.scale.set(1,.8,1.3);pellet.visible=false;pellet.userData.particle=null;this.food.add(pellet);}this.nextFood=0;this.food.visible=false;
 }
 clearFood(){this.feeding.clear();this.nextFood=0;this.consumed=0;this.food.children.forEach(m=>{m.visible=false;m.userData.particle=null;});this.food.visible=false;for(const f of this.fish){f.lastBite=-100;f.consumed=0;}}
 get waterLevel(){return this.habitat?.waterLevel??.02;}
 get startleState(){return this.startle.state;}
 clearStartle(){this.startle.reset();this.strokeTarget=null;for(const f of this.fish)f.startleIntensity=0;Object.assign(this.metrics,{startleIntensity:0,alertFish:0,fleeingFish:0});}
 beginApproach(point,count,time){const fish=this.selectStroke(point,count);if(!fish||!this.startle.begin(point))return null;this.feedUntil=0;return fish;}
 updateApproach(point,time,dt){if(dt>0)this.startle.move(point);}
 endApproach(){this.startle.end();this.strokeTarget=null;}
 setSurfaceDetail(enabled){this.surfaceDetail=enabled!==false;for(const f of this.fish)f.state.uSurfaceDetail.value=this.surfaceDetail?1:0;return this.surfaceDetail;}
 setExperiment(values){this.experiment=validateExperiment(values,this.experiment);return {...this.experiment};}
 setHabitat(value){const habitat=value===null?null:validateHabitat(value),spawns=habitat?this.fish.map(f=>sampleHabitatSpawn(habitat,f.id,f.group.scale.x)):this.fish.map(f=>f.baseSpawn.clone());
  this.habitat=habitat;this.shoreline=habitat?{habitat:true,vertices:habitat.polygon.map(p=>({...p})),scale:null}:null;
  this.fish.forEach((f,i)=>f.spawn.set(spawns[i].x,spawns[i].y,spawns[i].z));this.reset({preserveHabitat:true,preserveExperiment:true});return this.habitat;}
 getHabitat(){return this.habitat?JSON.parse(JSON.stringify(this.habitat)):null;}
 reset(options={}){if(!options.preserveHabitat){this.habitat=null;this.shoreline=null;this.fish.forEach(f=>f.spawn.copy(f.baseSpawn));}if(!options.preserveExperiment)this.experiment={...EXPERIMENT_DEFAULTS};
  this.clearFood();this.clearStartle();this.surfaceWakeCount=0;this.feedUntil=this.feedStart=0;this.strokeTarget=this.inspectionFish=null;this.feedPoint.set(this.habitat?.feedPoint.x??0,this.habitat?.waterLevel??0,this.habitat?.feedPoint.z??0);
  for(const f of this.fish){f.group.position.copy(f.spawn);f.heading=f.spawnHeading;f.speed=f.spawnSpeed;f.turnRate=f.bend=0;f.effort=.3;f.spread=.5;f.bursting=true;f.cycleT=f.spawnCycle;f.thrust=0;f.random=seeded(1500+f.id);f.nextWake=0;f.pitch=0;f.targetPellet=null;f.mouthOpen=.06;
   f.nextSurfaceWake=f.id*.011;f.lastSurfaceWake=null;f.state.uMouth.value=.06;f.state.uGill.value=0;f.phase.value=f.id;f.amp.value=.04;if(f.state.uBend)f.state.uBend.value=0;if(f.state.uSpread)f.state.uSpread.value=f.spread;f.state.uFold.value=0;f.group.rotation.set(0,f.heading,0);f.debugBodies=bodySpheres(schoolSnapshot([f])[0]);f.debugForces=f.steeringDebug=null;}
  this.metrics={activeFish:0,alignment:0,cohesion:0,separation:0,turnRate:0,effort:0,neighbors:0,boundary:0,contacts:0,consumed:0,startleIntensity:0,alertFish:0,fleeingFish:0};}
 constrainHabitatBody(f){for(let step=0;step<6;step++){let moved=false;for(const sphere of bodySpheres(schoolSnapshot([f])[0])){const q=projectIntoHabitat(this.habitat,sphere,sphere.radius+.008),dx=q.x-sphere.x,dz=q.z-sphere.z;
    if(Math.hypot(dx,dz)>1e-6){f.group.position.x+=dx;f.group.position.z+=dz;moved=true;}}if(!moved)break;}
  if(bodySpheres(schoolSnapshot([f])[0]).some(s=>habitatClearance(this.habitat,s.x,s.z)<s.radius-.0001)){const p=sampleHabitatSpawn(this.habitat,f.id,f.group.scale.x);f.group.position.x=p.x;f.group.position.z=p.z;}}
 feed(time,point=new THREE.Vector3()){this.feedPoint.copy(point);this.feedUntil=time+16;this.feedStart=time;}
 releasePellet(time,origin,velocity,batchId=null){let m=this.food.children.find(m=>!m.userData.particle||m.userData.particle.eaten);
  if(!m){m=new THREE.Mesh(this.food.children[0].geometry,this.food.children[0].material);this.food.add(m);}this.nextFood++;
  m.userData.particle={origin:origin.clone(),velocity:velocity.clone(),time,landed:false,landTime:0,eaten:false,feedToken:this.feeding.release(batchId)};m.scale.set(1,.8,1.3);m.position.copy(origin);m.visible=true;this.food.visible=true;}
 mouthWorld(f,out=new THREE.Vector3()){const open=.055+.945*f.state.uMouth.value;f.group.updateWorldMatrix(true,false);return f.group.localToWorld(out.set(.5+.022*open,-.004,0));}
 selectStroke(point,count){const candidates=this.fish.slice(0,count);if(!candidates.length)return null;const fish=candidates.reduce((a,b)=>a.group.position.distanceTo(point)<b.group.position.distanceTo(point)?a:b);
  // Selection only positions the observer and the hand. The fish keeps its own
  // position and locomotion; no stroke attraction or hold target is installed.
  this.strokeTarget=null;return fish;}
 update(dt,time,settings){const active=this.fish.slice(0,settings.fishCount),feeding=time<this.feedUntil;
  if(!this.habitat&&(!this.shoreline||this.shoreline.scale!==settings.pondScale))this.shoreline=createShoreline(settings.pondScale);
  this.fish.forEach((f,i)=>f.group.visible=i<settings.fishCount);
  const snapshot=schoolSnapshot(active),previousPhase=this.startle.phase,startle=this.startle.advance(dt,snapshot,this.waterLevel);
  if(previousPhase!==startle.phase)this.onStartleState?.({startle,message:startle.phase==='alert'?'警觉：手靠近水面，附近锦鲤开始避让':startle.phase==='startled'?'受惊：附近锦鲤加速转向、下潜并向外分散':startle.phase==='recovering'?'恢复：刺激已结束，锦鲤正逐渐恢复巡游':'锦鲤已恢复平静巡游'});
  // Advance existing grains before fish choose targets; fish pursue actual landed grains.
  for(const [i,m]of this.food.children.entries()){const p=m.userData.particle;if(!p||p.eaten){m.visible=false;continue;}const age=time-p.time;
   if(p.swallow){const k=clamp((time-p.swallow.start)/.16,0,1),mouth=this.mouthWorld(p.swallow.fish);m.position.lerpVectors(p.swallow.from,mouth,k);m.scale.setScalar(1-k*.72);
    if(k>=1&&dt>0){p.eaten=true;this.feeding.consume(p.feedToken);this.consumed++;p.swallow.fish.consumed++;}m.visible=!p.eaten;continue;}
   if(!p.landed){m.position.copy(p.origin).addScaledVector(p.velocity,age);m.position.y-=4.905*age*age;
    const surface=(this.water.heightAt?.(m.position.x,m.position.z,time)??this.waterLevel)+.002;
    if(m.position.y<=surface&&dt>0){m.position.y=surface;p.landed=true;this.feeding.land(p.feedToken);p.landTime=time;p.anchor=this.water.floatAnchorAt?.(m.position.x,m.position.z,time);this.water.addRipple(m.position.x,m.position.z,time,.005);}}
   else{if(this.water.sampleAtRest){p.anchor??=this.water.floatAnchorAt(m.position.x,m.position.z,time);p.anchor=this.water.advanceFloater(p.anchor,dt,time);const s=this.water.sampleAtRest(p.anchor.x,p.anchor.z,time);m.position.set(s.x,s.y+.002,s.z);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...s.normal)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),i*.7+(time-p.landTime)*.10));}
    else m.position.y=(this.water.heightAt?.(m.position.x,m.position.z,time)??this.waterLevel)+.002;
    if(time-p.landTime>14&&dt>0){p.eaten=true;p.expired=true;this.feeding.expire(p.feedToken);}}
   m.scale.set(1,.8,1.3);if(!p.landed)m.rotation.set(age*2.5,i*.7+age*.6,age*1.2);m.visible=!p.eaten;
  }
  const grains=this.food.children.filter(m=>m.visible&&m.userData.particle?.landed&&!m.userData.particle.swallow),targets=new Map();
  if(feeding){const pairs=[];for(const [i,f]of active.entries()){if(this.startle.response(snapshot[i]).intensity>.025)continue;const head=this.mouthWorld(f);
    for(const grain of grains)pairs.push({fish:f,grain,distance:Math.hypot(head.x-grain.position.x,head.z-grain.position.z)});}
   pairs.sort((a,b)=>a.distance-b.distance);const claimed=new Set();for(const pair of pairs)if(!targets.has(pair.fish)&&!claimed.has(pair.grain)){targets.set(pair.fish,pair.grain);claimed.add(pair.grain);}}
  const metrics={activeFish:active.length,alignment:0,cohesion:0,separation:0,turnRate:0,effort:0,neighbors:0,boundary:0,contacts:0,consumed:this.consumed,startleIntensity:startle.intensity,alertFish:startle.alertFish,fleeingFish:startle.affectedFish};
  for(const [i,f]of active.entries()){const p=f.group.position,forces=boidsForces(snapshot,i,feeding?1:0);
   const response=this.startle.response(snapshot[i]),fear=response.intensity,alert=this.startle.alert(snapshot[i]),head=this.mouthWorld(f),targetGrain=targets.get(f)||null;f.startleIntensity=fear;
   f.targetPellet=targetGrain;const wander=Math.sin(time*.41+f.seed)*.38+Math.sin(time*.173+f.seed*2)*.22;
   const debug={separation:{x:forces.separation.x*this.experiment.separation,z:forces.separation.z*this.experiment.separation},alignment:{x:forces.alignment.x*this.experiment.alignment,z:forces.alignment.z*this.experiment.alignment},cohesion:{x:forces.cohesion.x*this.experiment.cohesion,z:forces.cohesion.z*this.experiment.cohesion},
    wander:{x:Math.cos(f.heading)+Math.cos(f.heading+wander)*.8,z:-Math.sin(f.heading)-Math.sin(f.heading+wander)*.8},target:{x:0,z:0},shore:{x:0,z:0},obstacle:{x:0,z:0}};
   let dx=debug.wander.x+debug.separation.x+debug.alignment.x+debug.cohesion.x,dz=debug.wander.z+debug.separation.z+debug.alignment.z+debug.cohesion.z;
   let goal=targetGrain?.position||this.feedPoint,distance=Infinity,targetSpeed=null;
   if(feeding&&fear<=.025){const gx=goal.x-p.x,gz=goal.z-p.z;distance=Math.hypot(gx,gz);const nose=f.group.scale.x*(.5+.022*f.mouthOpen),inv=1/Math.max(distance,.001);
    // Attraction dominates close to a grain; collisions still act after movement, so the mouth can converge.
    const sep=(targetGrain?.12:.34)*this.experiment.separation/EXPERIMENT_DEFAULTS.separation;debug.separation={x:forces.separation.x*sep,z:forces.separation.z*sep};debug.alignment={x:0,z:0};debug.cohesion={x:0,z:0};debug.wander={x:0,z:0};debug.target={x:gx*inv*5,z:gz*inv*5};dx=debug.target.x+debug.separation.x;dz=debug.target.z+debug.separation.z;
    targetSpeed=targetGrain?clamp((distance-nose)*1.5,-.055,.37):.28+f.cruise;}
   if(fear>.025||alert>0){const strength=fear||alert,source=this.startleState.source,gx=p.x-source.x,gz=p.z-source.z,inv=1/Math.max(.001,Math.hypot(gx,gz));
    const away=fear>.025?response:{x:gx*inv,z:gz*inv};debug.threat={x:away.x*(4.8*fear+2*alert),z:away.z*(4.8*fear+2*alert)};
    debug.separation={x:forces.separation.x*(this.experiment.separation+2.2*fear),z:forces.separation.z*(this.experiment.separation+2.2*fear)};
    debug.alignment.x*=1-.94*strength;debug.alignment.z*=1-.94*strength;debug.cohesion.x*=1-.94*strength;debug.cohesion.z*=1-.94*strength;
    dx=debug.wander.x*(1-.65*strength)+debug.separation.x+debug.alignment.x+debug.cohesion.x+debug.threat.x;dz=debug.wander.z*(1-.65*strength)+debug.separation.z+debug.alignment.z+debug.cohesion.z+debug.threat.z;
    if(fear>.025)targetSpeed=Math.min(STARTLE_LIMITS.maxSpeed,.22+.36*fear);
   }
   const shore=shorelineSteering(this.shoreline,snapshot[i]);dx+=shore.x;dz+=shore.z;debug.shore={x:shore.x,z:shore.z};f.shoreDistance=shore.distance;
   if(this.habitat){debug.obstacle=obstacleSteering(snapshot[i],this.habitat.obstacles);dx+=debug.obstacle.x;dz+=debug.obstacle.z;}
   debug.result=debug.combined={x:dx,z:dz};f.debugForces=f.steeringDebug=debug;
   const bearing=Math.atan2(-dz,dx),turn=turnStep(f.heading,f.turnRate,bearing,dt,{maxRate:fear>.025?STARTLE_LIMITS.maxTurnRate:feeding?3.4:.9+clamp(1-f.speed/.35,0,1),acceleration:fear>.025?STARTLE_LIMITS.maxTurnAcceleration:feeding?11.5:2.5,gain:fear>.025?4.8:feeding?4.4:1.4});
   f.heading=turn.heading;f.turnRate=turn.rate;
   const previousSpeed=f.speed;f.cycleT-=dt;if(dt>0&&f.cycleT<=0){f.bursting=!f.bursting;f.cycleT=f.bursting?.6+f.random()*.9:1+f.random()*2.2;f.thrust=.18+f.random()*.14;}
   let thrust=f.bursting?(f.thrust||.25):.015;
   if(targetSpeed!==null){f.speed+=clamp(targetSpeed-f.speed,-.85*dt,(fear>.025?STARTLE_LIMITS.maxAcceleration:.70)*dt);thrust=.06+Math.abs(f.speed)*.9;f.bursting=Math.abs(f.speed)>.075;}
   else{f.speed+=(thrust-1.2*f.speed-Math.abs(f.turnRate)*.12*f.speed)*dt;f.speed=clamp(f.speed,.018,Math.max(.32,previousSpeed-.85*dt));}
   f.effort=damp(f.effort,clamp(thrust/.45,0,1),4,dt);p.x+=Math.cos(f.heading)*f.speed*dt;p.z-=Math.sin(f.heading)*f.speed*dt;
   const lift=feeding&&fear<=.025&&Math.hypot(p.x-goal.x,p.z-goal.z)<.9,inspecting=this.inspectionFish===f;
   f.pitch=damp(f.pitch,fear>.025?-.16*fear:lift?.28:inspecting?.14:0,4,dt);const biteAge=time-(f.lastBite??-100),biting=biteAge<.46;
   let open=.06+Math.sin(time*2.4+f.seed)*.025;
   if(lift&&targetGrain){const mouthDistance=Math.hypot(head.x-goal.x,head.z-goal.z);open=mouthDistance<.13?.90:.25+Math.sin(time*4+i)*.08;}
   if(inspecting)open=.20+(1+Math.sin(time*2.4+f.seed))*.15;
   if(biting)open=biteAge<.15?.94:THREE.MathUtils.lerp(.94,.06,clamp((biteAge-.15)/.26,0,1));
   f.mouthOpen=damp(f.mouthOpen,open,biting?20:10,dt);f.state.uMouth.value=f.mouthOpen;f.state.uGill.value=.5+.5*Math.sin(time*4+f.seed);
   const foodHeight=targetGrain?.position.y??(this.water.heightAt?.(goal.x,goal.z,time)??this.waterLevel)+.002,
    mouthY=foodHeight-(Math.sin(f.pitch)*(.5+.022*f.mouthOpen)-.004*Math.cos(f.pitch))*f.group.scale.x;
   let depth=fear>.025?this.waterLevel-.24-STARTLE_LIMITS.maxDive*fear:lift?mouthY:inspecting?this.waterLevel-.105:feeding?this.waterLevel-.17:this.waterLevel-.24+Math.sin(time*.4+i)*.045;
   depth=clamp(depth,this.habitat?this.waterLevel-this.habitat.depth+f.group.scale.x*.11+.01:-.78+f.group.scale.x*.11+.01,this.waterLevel-.012);p.y=damp(p.y,depth,4,dt);
   const amp=.011+f.effort*.046+Math.min(.030,Math.abs(f.turnRate)*.015),frequency=(.52+f.effort*1.6)*Math.sqrt(.64/f.group.scale.x);
   f.phase.value+=dt*Math.PI*2*frequency;f.amp.value=damp(f.amp.value,amp,3.5,dt);f.bend=damp(f.bend,clamp(-f.turnRate*(feeding?.045:.055),-.16,.16),5,dt);
   const braking=dt>0?clamp((previousSpeed-f.speed)/dt*3,0,1):0;f.spread=damp(f.spread,clamp(1.1-Math.abs(f.speed)/.32+braking*.8,.12,1),3,dt);
   if(f.state.uBend)f.state.uBend.value=f.bend;if(f.state.uSpread)f.state.uSpread.value=f.spread;f.state.uFold.value=damp(f.state.uFold.value,0,5,dt);
   metrics.alignment+=Math.hypot(forces.alignment.x,forces.alignment.z);metrics.cohesion+=Math.hypot(forces.cohesion.x,forces.cohesion.z);metrics.separation+=Math.hypot(forces.separation.x,forces.separation.z);
   metrics.turnRate+=Math.abs(f.turnRate);metrics.effort+=f.effort;metrics.neighbors+=forces.neighbors;metrics.boundary=Math.max(metrics.boundary,Math.hypot(shore.x,shore.z));
  }
  // Resolve whole bodies after all fish move; this is symmetric and independent of update order.
  if(dt>0){const bodies=schoolSnapshot(active),collision=this.experiment.collision?resolveBodies(bodies,{iterations:3,maxCorrection:Math.min(.025,.012*dt*60)}):{contacts:0};metrics.contacts=collision.contacts;
   for(let i=0;i<active.length;i++){const f=active[i],p=f.group.position,q=bodies[i];p.set(q.x,q.y,q.z);
    if(this.habitat){this.constrainHabitatBody(f);const extent=f.group.scale.x*(.1+Math.abs(Math.sin(f.pitch))*.3)+.008;p.y=clamp(p.y,this.waterLevel-this.habitat.depth+extent,this.waterLevel-.012);}else{const shore=signedShoreDistance(this.shoreline,p.x,p.z),clearance=f.group.scale.x*.14+.035;
     if(shore.distance>-clearance){p.x-=shore.nx*(shore.distance+clearance);p.z-=shore.nz*(shore.distance+clearance);}}}
  }
  for(const [i,f]of active.entries()){const p=f.group.position,targetGrain=f.targetPellet,goal=targetGrain?.position||this.feedPoint,lift=feeding&&f.startleIntensity<=.025&&Math.hypot(p.x-goal.x,p.z-goal.z)<.9;
   f.group.rotation.set(0,f.heading,f.pitch+Math.sin(time*.6+i)*.008);
   f.debugBodies=bodySpheres(schoolSnapshot([f])[0]);
   const mouth=this.mouthWorld(f);
   if(dt>0&&feeding&&f.startleIntensity<=.025&&targetGrain&&!targetGrain.userData.particle.swallow&&f.mouthOpen>.60&&Math.hypot(mouth.x-goal.x,mouth.z-goal.z)<.042&&Math.abs(mouth.y-goal.y)<.035&&time-targetGrain.userData.particle.landTime>.16){
    targetGrain.userData.particle.swallow={fish:f,start:time,from:targetGrain.position.clone()};f.lastBite=time;this.water.addRipple(mouth.x,mouth.z,time,.009);}
   if(dt>0&&lift&&time>(f.nextWake||0)){this.water.addRipple(mouth.x,mouth.z,time,.004);f.nextWake=time+.9+i*.08;}
   if(dt>0&&settings.surfaceWakes!==false&&time>=(f.nextSurfaceWake??f.id*.011)){
    const pose={x:p.x,y:p.y,z:p.z,heading:f.heading,pitch:f.group.rotation.z,size:f.group.scale.x,speed:f.speed,phase:f.phase.value,amplitude:f.amp.value,bend:f.bend},tail=tailSource(pose),b=this.water.simulation?.bounds;
    const cell=b?Math.max(b.width,b.height)/this.water.simulation.size*(this.habitat?1:settings.pondScale):.09375;
    const wake=surfaceWake(pose,this.water.heightAt?.(tail.x,tail.z,time)??this.waterLevel,cell);
    if(wake){for(const q of wake.impulses)this.water.addRipple(q.x,q.z,time,q.amplitude,wake.radius);this.surfaceWakeCount++;f.lastSurfaceWake={...wake,time};}
    f.nextSurfaceWake=time+(wake?.interval??.20)+f.id*.001;
   }
  }
  for(const key of ['alignment','cohesion','separation','turnRate','effort','neighbors'])metrics[key]/=Math.max(1,active.length);metrics.consumed=this.consumed;this.metrics=metrics;
  this.food.visible=this.food.children.some(m=>m.visible);
 }
}
