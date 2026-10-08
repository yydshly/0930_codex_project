export const CAT_GROUND_Y=-.035;
export const CAT_ROUTE_DURATION=10.5;
export const CAT_ROUTE_BOUNDS={minX:2.45,maxX:4.15,minZ:6.3,maxZ:6.9};
export const catEase=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const ARC_SAMPLES=256,arc=[0];
let previous={x:2.45,z:6.6};
for(let i=1;i<=ARC_SAMPLES;i++){
 const angle=Math.PI+i/ARC_SAMPLES*Math.PI*2,p={x:3.3+.85*Math.cos(angle),z:6.6+.21*Math.sin(angle)};
 arc.push(arc[i-1]+Math.hypot(p.x-previous.x,p.z-previous.z));previous=p;
}
export const CAT_ROUTE_LENGTH=arc[ARC_SAMPLES];
export const CAT_STRIDE_LENGTH=.235;

// A fixed dry-land route in world metres. At each end of a patrol the speed
// eases to zero; the route tangent supplies heading rather than a snap turn.
export function catRoute(timer){
 const progress=catEase(timer/CAT_ROUTE_DURATION),angle=Math.PI+progress*Math.PI*2;
 const x=3.30+.85*Math.cos(angle),z=6.60+.21*Math.sin(angle);
 const dx=-.85*Math.sin(angle),dz=.21*Math.cos(angle);
 const sample=progress*ARC_SAMPLES,index=Math.min(ARC_SAMPLES-1,Math.floor(sample)),fraction=sample-index;
 const distance=arc[index]+(arc[index+1]-arc[index])*fraction,t=Math.max(0,Math.min(1,timer/CAT_ROUTE_DURATION));
 const speed=Math.hypot(dx,dz)*Math.PI*2*6*t*(1-t)/CAT_ROUTE_DURATION;
 return {x,y:CAT_GROUND_Y,z,heading:Math.atan2(-dz,dx),progress,distance,speed};
}
export function catGait(distance,offset){
 const cycle=((distance/CAT_STRIDE_LENGTH+offset)%1+1)%1,stance=.68,step=CAT_STRIDE_LENGTH*stance;
 // In a straight, steady walk, the backward stance displacement cancels the
 // travelled distance. The curved route still uses sagittal IK, an approximation.
 if(cycle<stance)return {x:step*.5-CAT_STRIDE_LENGTH*cycle,lift:0,stance:true};
 const swing=(cycle-stance)/(1-stance);
 return {x:step*(-.5+catEase(swing)),lift:Math.sin(swing*Math.PI)**2*.022,stance:false};
}

// Sagittal two-link inverse kinematics. The paw remains on the ground during
// stance while the shoulder follows the breathing / sitting torso pose.
export function solveCatLeg(hip,paw,upper,lower,bend){
 const dx=paw.x-hip.x,dy=paw.y-hip.y,d=Math.min(upper+lower-1e-6,Math.max(Math.abs(upper-lower)+1e-6,Math.hypot(dx,dy)));
 const ux=dx/(Math.hypot(dx,dy)||1),uy=dy/(Math.hypot(dx,dy)||1);
 const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const knee={x:hip.x+ux*along-uy*height*bend,y:hip.y+uy*along+ux*height*bend};
 const upperAngle=Math.atan2(knee.x-hip.x,-(knee.y-hip.y));
 const lowerAngle=Math.atan2(paw.x-knee.x,-(paw.y-knee.y));
 return {upperAngle,lowerAngle,knee};
}
