// Local, deterministic threat response. Distances are scene metres and time is
// simulation time: no wall clock, randomness or pose teleporting enters here.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=k=>{k=clamp(k,0,1);return k*k*(3-2*k);};
const point=p=>({x:p.x,y:p.y,z:p.z});
export const STARTLE_LIMITS=Object.freeze({alertRadius:1.15,closeRadius:.56,spreadRadius:2.5,duration:4.5,burstDuration:.9,maxSpeed:.58,maxAcceleration:1.25,maxTurnRate:4.4,maxTurnAcceleration:12.5,maxDive:.16});

export class FishStartle {
 constructor(){this.reset();}
 reset(){this.approach=null;this.responses=new Map();this.elapsed=0;this.source=null;this.triggerCount=0;this.phase='idle';this.alertFish=0;this.affectedFish=0;this.intensity=0;}
 begin(source){if(this.responses.size)return false;this.approach={source:point(source),triggered:false};return true;}
 move(source){if(this.approach&&!this.approach.triggered)this.approach.source=point(source);}
 end(){this.approach=null;this.alertFish=0;if(!this.responses.size)this.phase='idle';}
 get state(){return {phase:this.phase,source:this.source?point(this.source):this.approach?point(this.approach.source):null,affectedFish:this.affectedFish,alertFish:this.alertFish,triggerCount:this.triggerCount,intensity:this.intensity,remaining:this.responses.size?Math.max(0,STARTLE_LIMITS.duration-this.elapsed):0};}
 advance(dt,snapshot,waterLevel){
  if(!(dt>0))return this.state;
  const active=new Set(snapshot.map(f=>f.id));for(const id of this.responses.keys())if(!active.has(id))this.responses.delete(id);
  if(this.responses.size){this.elapsed+=dt;this.intensity=1-smooth((this.elapsed-STARTLE_LIMITS.burstDuration)/(STARTLE_LIMITS.duration-STARTLE_LIMITS.burstDuration));
   if(this.elapsed>=STARTLE_LIMITS.duration){this.responses.clear();this.source=null;this.intensity=0;this.affectedFish=0;this.phase='idle';}
   else this.phase=this.elapsed<STARTLE_LIMITS.burstDuration?'startled':'recovering';
  }else{this.source=null;this.intensity=0;this.affectedFish=0;this.phase='idle';}
  this.alertFish=0;
  if(!snapshot.length){this.end();return this.state;}
  if(this.approach&&!this.approach.triggered){const source=this.approach.source,above=source.y-waterLevel;
   if(above<.28){const near=snapshot.filter(f=>Math.hypot(f.x-source.x,f.z-source.z)<STARTLE_LIMITS.alertRadius);this.alertFish=near.length;
    if(near.length&&!this.responses.size)this.phase='alert';
    // A silhouette close to the water is already a stimulus. Contact with a
    // deeply swimming fish is not fabricated just to trigger an animation.
    if(above<.085&&near.some(f=>Math.hypot(f.x-source.x,f.z-source.z)<STARTLE_LIMITS.closeRadius)){
     this.source=point(source);this.elapsed=0;this.triggerCount++;this.approach.triggered=true;
     for(const f of snapshot){const distance=Math.hypot(f.x-source.x,f.z-source.z);if(distance>=STARTLE_LIMITS.spreadRadius)continue;
      this.responses.set(f.id,{strength:.25+.75*(1-smooth(distance/STARTLE_LIMITS.spreadRadius))});}
     this.intensity=1;this.affectedFish=this.responses.size;this.phase='startled';
    }
   }
  }
  this.affectedFish=this.responses.size;return this.state;
 }
 response(f){const memory=this.responses.get(f.id),source=this.source;if(!memory||!source)return {intensity:0,x:0,z:0};
  let dx=f.x-source.x,dz=f.z-source.z,distance=Math.hypot(dx,dz);
  if(distance<1e-7){const a=(f.id+1)*2.399963229728653;dx=Math.cos(a);dz=Math.sin(a);distance=1;}
  dx/=distance;dz/=distance;
  // Slightly different outward headings split a school without attracting fish
  // to fixed escape destinations. The radial dot product remains positive.
  const spread=Math.sin((f.id+1)*2.399963229728653)*.42,normal=Math.hypot(1,spread),intensity=this.intensity*memory.strength;
  return {intensity,x:(dx-dz*spread)/normal,z:(dz+dx*spread)/normal};
 }
 alert(f){if(!this.approach||this.approach.triggered||this.phase!=='alert')return 0;const p=this.approach.source;
  return clamp(1-Math.hypot(f.x-p.x,f.z-p.z)/STARTLE_LIMITS.alertRadius,0,1)*.22;}
}
