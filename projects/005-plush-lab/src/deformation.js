// Local, elastic indentation field; shared by skin vertices and fiber roots.
export function pressOffset(point, normal, center, depth, radius=.38, out=[0,0,0]) {
  const d2=point.reduce((sum,v,i)=>sum+(v-center[i])**2,0);
  const factor=-depth*Math.exp(-d2/(radius*radius));
  for(let i=0;i<3;i++)out[i]=normal[i]*factor;
  return out;
}
export const pressGLSL=`
uniform vec3 uPressCenter;
uniform float uPressDepth;
vec3 pressOffset(vec3 p, vec3 n) {
  vec3 delta=p-uPressCenter;
  return -n*uPressDepth*exp(-dot(delta,delta)/(.38*.38));
}
vec3 pressNormal(vec3 p, vec3 n) {
  vec3 delta=p-uPressCenter;
  float depth=uPressDepth*exp(-dot(delta,delta)/(.38*.38));
  vec3 gradient=(delta-n*dot(delta,n))*depth*2./(.38*.38);
  return normalize(n-gradient);
}`;
