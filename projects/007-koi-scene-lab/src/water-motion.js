/*! Gerstner wave and optical shading integration, informed by Koi Pond Garden,
 * ©2026 Sourany Phomhome, MIT: web/upstream/KOI-LICENSE.txt. */
export const GRAVITY=9.81,STEEPNESS=.15;
export const WAVE_COMPONENTS=Object.freeze([
 {direction:[1,.3],k:5.46,amplitude:1},
 {direction:[-.3,1],k:11.02,amplitude:.52},
 {direction:[.6,-.8],k:20.27,amplitude:.24},
 {direction:[.8,.7],k:2.99,amplitude:.65},
].map(w=>{const length=Math.hypot(...w.direction);return Object.freeze({...w,direction:Object.freeze(w.direction.map(v=>v/length)),omega:Math.sqrt(GRAVITY*w.k)});}));
const f=n=>Number(n).toFixed(10);
export const GERSTNER_GLSL=`
void gerstner(vec2 p,out vec3 displacement,out vec3 tangentX,out vec3 tangentZ){
 displacement=vec3(0.);tangentX=vec3(1.,0.,0.);tangentZ=vec3(0.,0.,1.);
 float baseAmplitude=.003+wind*.009;
 ${WAVE_COMPONENTS.map(w=>`{
  vec2 D=vec2(${w.direction.map(f).join(',')});float k=${f(w.k)},A=baseAmplitude*${f(w.amplitude)};
  float phase=k*dot(D,p)-time*${f(w.omega)},s=sin(phase),c=cos(phase),Q=${f(STEEPNESS)};
  displacement+=vec3(Q*A*D.x*c,A*s,Q*A*D.y*c);
  tangentX+=vec3(-Q*A*k*D.x*D.x*s,A*k*D.x*c,-Q*A*k*D.x*D.y*s);
  tangentZ+=vec3(-Q*A*k*D.x*D.y*s,A*k*D.y*c,-Q*A*k*D.y*D.y*s);
 }`).join('\n')}
}
`;
// CPU and GPU share components; analytic sampling omits GPU ripple height.
export function sampleGerstner(x,z,time,wind){
 const displacement=[0,0,0],tangentX=[1,0,0],tangentZ=[0,0,1],base=.003+wind*.009;
 for(const w of WAVE_COMPONENTS){const [dx,dz]=w.direction,A=base*w.amplitude,phase=w.k*(dx*x+dz*z)-time*w.omega,s=Math.sin(phase),c=Math.cos(phase),q=STEEPNESS*A;
  displacement[0]+=q*dx*c;displacement[1]+=A*s;displacement[2]+=q*dz*c;
  tangentX[0]-=q*w.k*dx*dx*s;tangentX[1]+=A*w.k*dx*c;tangentX[2]-=q*w.k*dx*dz*s;
  tangentZ[0]-=q*w.k*dx*dz*s;tangentZ[1]+=A*w.k*dz*c;tangentZ[2]-=q*w.k*dz*dz*s;
 }
 const normal=[tangentZ[1]*tangentX[2]-tangentZ[2]*tangentX[1],tangentZ[2]*tangentX[0]-tangentZ[0]*tangentX[2],tangentZ[0]*tangentX[1]-tangentZ[1]*tangentX[0]],length=Math.hypot(...normal);
 return {displacement,tangentX,tangentZ,normal:normal.map(v=>v/length),position:[x+displacement[0],displacement[1],z+displacement[2]]};
}
export function surfaceSampleAt(x,z,time,wind){
 let px=x,pz=z;
 for(let i=0;i<4;i++){const s=sampleGerstner(px,pz,time,wind),ex=s.position[0]-x,ez=s.position[2]-z,a=s.tangentX[0],b=s.tangentZ[0],c=s.tangentX[2],d=s.tangentZ[2],det=a*d-b*c;
  px-=(d*ex-b*ez)/det;pz-=(-c*ex+a*ez)/det;
 }
 return {height:.02+sampleGerstner(px,pz,time,wind).displacement[1],x:px,z:pz};
}
export function surfaceHeightAt(x,z,time,wind){return surfaceSampleAt(x,z,time,wind).height;}
