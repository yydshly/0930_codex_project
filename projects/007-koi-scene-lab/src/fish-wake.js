import {spineOffset} from './koi-motion.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// A source on the upper caudal peduncle follows the same spine shear as the mesh.
// The resulting impulses approximate surface disturbance, not fluid/body forces.
export function tailSource(f){
 const x=-.49*f.size,y=.026*f.size,z=spineOffset(-.49,f.phase,f.amplitude,f.bend)*f.size;
 const cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),ch=Math.cos(f.heading),sh=Math.sin(f.heading),px=cp*x-sp*y;
 return {x:f.x+ch*px+sh*z,y:f.y+sp*x+cp*y,z:f.z-sh*px+ch*z};
}

export function surfaceWake(f,surfaceHeight,cellSize){
 const source=tailSource(f),depth=Math.max(0,surfaceHeight-source.y),speed=Math.abs(f.speed);
 if(speed<=.025||depth>=.28)return null;
 const coupling=Math.exp(-depth/.12)*(1-smooth(.18,.28,depth));
 const strength=.006*smooth(.025,.32,speed)*coupling;
 if(strength<.00004)return null;
 const offset=Math.max(.10*f.size,cellSize*.9),radius=Math.max(.17*f.size,cellSize*1.6);
 const side={x:Math.sin(f.heading),z:Math.cos(f.heading)},stroke=Math.sin(f.phase-.49*7);
 return {source,depth,strength,radius,interval:.20-.07*clamp(speed/.32,0,1),
  impulses:[-1,1].map(sign=>({x:source.x+side.x*offset*sign,z:source.z+side.z*offset*sign,amplitude:sign*strength*stroke}))};
}
