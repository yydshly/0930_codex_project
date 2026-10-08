// A small prescribed wind current, not a solved fluid velocity field.
// Wave orbital movement is added separately by the shared Gerstner surface.
export function advanceFloatAnchor(anchor,dt,wind,allows=()=>true){
 if(!Number.isFinite(dt)||dt<0||!Number.isFinite(wind)||wind<0||wind>1)throw new Error('Invalid floating step');
 const length=Math.hypot(1,.3),distance=.01*wind*dt;
 const next={x:anchor.x+distance/length,z:anchor.z+distance*.3/length};
 return allows(next.x,next.z)?next:{x:anchor.x,z:anchor.z};
}
