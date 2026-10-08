/*! Spine normal correction follows KOI_VS_NORMAL from Koi Pond Garden,
 * ©2026 Sourany Phomhome, MIT: web/upstream/KOI-LICENSE.txt.
 * Fixed upstream: 18213ec590e987f605cce6564471e6c0f9451d37.
 * The envelope below preserves this scene's anterior/head geometry. */

const START=.02, END=.52, FREQUENCY=7;
function envelope(x){
 const t=Math.max(0,Math.min(1,(-x-START)/(END-START)));
 return {k:t*t*(3-2*t),derivative:-6*t*(1-t)/(END-START)};
}

// x is the undeformed longitudinal coordinate; phase and amplitude are per fish.
// z' = z + wave(x) + bend*k(x)^2. The positive-x head stays undeformed.
export function spineOffset(x,phase,amplitude,bend=0){
 const {k}=envelope(x);
 // Increasing phase moves an equal-phase crest toward negative x (head -> tail).
 return Math.sin(phase+x*FREQUENCY)*amplitude*k+bend*k*k;
}
export function spineSlope(x,phase,amplitude,bend=0){
 const {k,derivative}=envelope(x),angle=phase+x*FREQUENCY;
 return amplitude*(Math.sin(angle)*derivative+FREQUENCY*Math.cos(angle)*k)+2*bend*k*derivative;
}
export function spineNormal(normal,x,phase,amplitude,bend=0,correction=1){
 const slope=spineSlope(x,phase,amplitude,bend),enabled=Math.max(0,Math.min(1,correction));
 const result=[normal[0]-enabled*slope*normal[2],normal[1],normal[2]],length=Math.hypot(...result)||1;
 return result.map(v=>v/length);
}

// CPU checks and both GPU materials use the same constants and analytic formula.
export const KOI_SPINE_GLSL=/* glsl */`
uniform float uPhase;
uniform float uAmp;
uniform float uBend;
uniform float uNormalCorrection;
vec2 koiEnvelope(float x){
 float t=clamp((-x-${START.toFixed(2)})/${(END-START).toFixed(2)},0.,1.);
 return vec2(t*t*(3.-2.*t),-6.*t*(1.-t)/${(END-START).toFixed(2)});
}
float koiSpineOffset(float x){
 float k=koiEnvelope(x).x;
 return sin(uPhase+x*${FREQUENCY.toFixed(1)})*uAmp*k+uBend*k*k;
}
float koiSpineSlope(float x){
 vec2 e=koiEnvelope(x);float a=uPhase+x*${FREQUENCY.toFixed(1)};
 return uAmp*(sin(a)*e.y+${FREQUENCY.toFixed(1)}*cos(a)*e.x)+2.*uBend*e.x*e.y;
}
vec3 koiSpineNormal(vec3 n,float x){
 // Inverse transpose of the shear Jacobian for z'=z+offset(x).
 vec3 corrected=vec3(n.x-koiSpineSlope(x)*n.z,n.y,n.z);
 return normalize(mix(n,corrected,clamp(uNormalCorrection,0.,1.)));
}
`;
