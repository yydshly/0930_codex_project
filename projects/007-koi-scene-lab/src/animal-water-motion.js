import {pondBoundary} from './config.js';
import {projectIntoHabitat,signedPolygonDistance} from './habitat-geometry.js';

// Prescribed kinematics, not buoyancy, body-water pressure or flexible stems.
export const TURTLE_ORBIT_DURATION=Math.PI*2/.22;
export const TURTLE_RADIUS=.32,TURTLE_BANK_MARGIN=.08;
const garden={polygon:Array.from({length:256},(_,i)=>pondBoundary(i/256*Math.PI*2)),obstacles:[]};
export const ease=v=>{const k=Math.max(0,Math.min(1,v));return k*k*(3-2*k);};
export function pondLocalToWorld(p,scale){return {x:(p.x+.5)*scale-.5,y:p.y,z:(p.z+.15)*scale-.15};}
export function pondWorldToLocal(p,scale){return {x:(p.x+.5)/scale-.5,y:p.y,z:(p.z+.15)/scale-.15};}

// Keep the full local affine matrix. Decomposing it to TRS would discard the
// shear needed to cancel a nonuniform parent scale beneath a tilted leaf.
export function worldPoseToPondMatrix(world,scale){
  const local=Array.from(world);
  for(let column=0;column<3;column++){local[column*4]/=scale;local[column*4+2]/=scale;}
  local[12]=(world[12]+.5)/scale-.5;local[14]=(world[14]+.15)/scale-.15;
  return local;
}
export function landingArc(from,to,k,height=.43){
  k=Math.max(0,Math.min(1,k));
  const f=ease(k),arc=16*k*k*(1-k)*(1-k)*height;
  return {x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f+arc,z:from.z+(to.z-from.z)*f};
}
export function blendHeading(from,to,k){const angle=Math.atan2(Math.sin(to-from),Math.cos(to-from));return from+angle*ease(k);}
export function turtleShoreClearance(worldPoint,scale){const p=pondWorldToLocal(worldPoint,scale);return -signedPolygonDistance(garden.polygon,p.x,p.z).distance*scale;}
export function turtleRoute(timer,scale){
  const angle=Math.max(0,Math.min(TURTLE_ORBIT_DURATION,timer))*.22;
  const proposed={x:-2.85+Math.sin(angle),z:1.15+.75*(1-Math.cos(angle))};
  const safe=projectIntoHabitat(garden,proposed,TURTLE_RADIUS+TURTLE_BANK_MARGIN);
  return pondLocalToWorld(safe,scale);
}
export function turtleRouteHeading(timer,scale){
  const wrap=t=>(t%TURTLE_ORBIT_DURATION+TURTLE_ORBIT_DURATION)%TURTLE_ORBIT_DURATION;
  const before=turtleRoute(wrap(timer-.01),scale),after=turtleRoute(wrap(timer+.01),scale);
  return Math.atan2(-(after.z-before.z),after.x-before.x);
}
