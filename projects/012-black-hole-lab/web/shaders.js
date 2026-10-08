/* Schwarzschild null geodesics, static observer tetrad, thin-disk Planck emission. Finite-step numerical renderer. */
window.BlackHoleShaders = Object.freeze({
  vertex: `#version 300 es
layout(location = 0) in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`,
  fragment: `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec3 uCamera;
uniform float uTime;
uniform float uThickness;
uniform float uExposure;
uniform float uLensing;
uniform float uDoppler;
uniform float uDisk;
uniform float uSky;
uniform float uHorizon;
uniform float uTexture;
uniform float uGrid;
uniform int uSteps;
uniform float uTemperatureScale;
uniform float uFalseColor;
const float PI = 3.14159265359;
const float INNER = 3.05;
const float OUTER = 8.7;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
                 mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                 mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float sum = 0.0, weight = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += weight * noise3(p);
    p = p * 2.07 + vec3(3.1, 7.2, 1.9);
    weight *= 0.5;
  }
  return sum;
}
vec3 sky(vec3 direction) {
  vec3 d = normalize(direction);
  float cloud = fbm(d * 4.3 + vec3(3.4, 6.2, 8.1));
  float detail = fbm(d * 15.0 + vec3(7.0));
  float mist = pow(clamp(cloud * 1.25, 0.0, 1.0), 3.0);
  vec3 color = vec3(0.007, 0.012, 0.022);
  color += vec3(0.042, 0.060, 0.086) * mist;
  color += vec3(0.018, 0.023, 0.031) * detail * mist;
  // Stars use a directional 3D grid, avoiding a longitude texture seam.
  vec3 cell = floor(d * 260.0);
  vec3 f = fract(d * 260.0) - 0.5;
  float seed = hash31(cell);
  float star = exp(-dot(f, f) * 125.0) * step(0.985, seed);
  color += star * mix(vec3(0.48, 0.62, 0.95), vec3(1.0, 0.82, 0.56), hash31(cell + 7.3)) * 1.8;
  if (uGrid > 0.5) {
    vec2 sphere = vec2(atan(d.z, d.x) / (2.0 * PI), asin(clamp(d.y, -1.0, 1.0)) / PI);
    vec2 line = abs(fract(sphere * vec2(24.0, 12.0) + 0.5) - 0.5);
    float grid = 1.0 - smoothstep(0.004, 0.012, min(line.x, line.y));
    color += grid * vec3(0.030, 0.070, 0.080);
  }
  return color;
}

vec3 acceleration(vec3 p, float angularMomentum2) {
  float r2 = max(dot(p, p), 0.8);
  // Exact spatial null-geodesic equation in pseudo-Cartesian Schwarzschild
  // coordinates with affine parameter. Initial data must satisfy the null constraint.
  return -1.5 * uLensing * angularMomentum2 * p / (r2 * r2 * sqrt(r2));
}


float gaussian(float wavelength, float center, float left, float right) {
  float t = (wavelength - center) * (wavelength < center ? left : right);
  return exp(-0.5 * t * t);
}
vec3 cie(float w) {
  return vec3(
    1.056*gaussian(w,599.8,.0264,.0323)+.362*gaussian(w,442.0,.0624,.0374)-.065*gaussian(w,501.1,.0490,.0382),
    .821*gaussian(w,568.8,.0213,.0247)+.286*gaussian(w,530.9,.0613,.0322),
    1.217*gaussian(w,437.0,.0845,.0278)+.681*gaussian(w,459.0,.0385,.0725));
}
vec3 visibleBlackbody(float temperature) {
  if (temperature < 100.0) return vec3(0.0);
  vec3 xyz=vec3(0.0);
  // Planck B_lambda, 12 wavelength bins, CIE analytic fit. Common units cancel.
  for(int i=0;i<12;i++){
    float wavelength=395.0+30.0*float(i), um=wavelength*.001;
    float spectral=1.0/(pow(um,5.0)*(exp(min(80.0,14387.77/(um*temperature)))-1.0));
    xyz += spectral*cie(wavelength)*.03/250.0;
  }
  return max(vec3(0.0),vec3(
    dot(vec3(3.2406,-1.5372,-.4986),xyz),
    dot(vec3(-.9689,1.8758,.0415),xyz),
    dot(vec3(.0557,-.2040,1.0570),xyz)));
}
void sampleDisk(vec3 p, vec3 tangent, float pathLength, inout vec3 light, inout float transmittance) {
  float radius=length(p.xz);
  if(radius<INNER||radius>OUTER)return;
  float f=1.0-1.0/length(p);
  float angle=atan(p.z,p.x);
  // Schwarzschild circular angular velocity. Playback second = 18 r_s/c.
  float flowAngle=angle+uTime*18.0/sqrt(2.0*radius*radius*radius);
  float eddies=sin(flowAngle*7.0+radius*2.7)*.45+sin(flowAngle*13.0-radius*5.2)*.17;
  float bands=.5+.5*sin(radius*34.0+eddies*4.0);
  float wisps=.5+.5*sin(flowAngle*19.0+radius*9.0);
  float density=mix(1.0,.45+.55*bands,uTexture);
  float edge=smoothstep(INNER,INNER+.13,radius)*(1.0-smoothstep(OUTER-.7,OUTER,radius));
  // Zero-torque thin-disk temperature approximation (Newtonian flux profile).
  float temperature=uTemperatureScale*pow(max(0.0,(1.0-sqrt(3.0/radius))/pow(radius,3.0)),.25);
  temperature*=mix(1.0,.96+.08*wisps,uTexture);
  vec3 radial=normalize(p);
  vec3 localBackward=tangent+radial*dot(tangent,radial)*(inversesqrt(f)-1.0);
  vec3 velocityDirection=normalize(vec3(-p.z,0.0,p.x));
  float beta=sqrt(.5/(radius-1.0)); // Local circular speed, stable disk starts at 3 r_s.
  float towardObserver=dot(velocityDirection,-normalize(localBackward));
  float D=sqrt(1.0-beta*beta)/(1.0-beta*towardObserver);
  float g=sqrt(f/(1.0-1.0/length(uCamera)))*mix(1.0,D,uDoppler);
  vec3 emission=visibleBlackbody(temperature*g);
  if(uFalseColor>.5){
    float relative=clamp(temperature/(uTemperatureScale*.214023),0.0,1.0);
    vec3 palette=mix(vec3(.9,.14,.018),vec3(1.8,1.3,.65),relative);
    // False-color bolometric map uses the correct integrated-radiance g^4 law.
    emission=palette*pow(temperature*g/(uTemperatureScale*.214023),4.0)*3.8;
  }
  float incidence=max(.07,abs(normalize(localBackward).y));
  float alpha=edge*(1.0-exp(-density*(uThickness/.16)*12.0/incidence));
  light+=transmittance*alpha*emission*uDisk;
  transmittance*=1.0-alpha;
}

void main() {
  if (uSky < 0.001 && uDisk < 0.001) { outColor = vec4(0.016, 0.024, 0.040, 1.0); return; }
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / uResolution.y;
  vec3 forward = normalize(-uCamera);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = normalize(cross(right, forward));
  float projection = 0.405 * max(1.0, 1.02 * uResolution.y / uResolution.x);
  vec3 direction = normalize(forward + projection * (uv.x * right + uv.y * up));
  vec3 p = uCamera;
  vec3 radialCamera=normalize(p);
  float fCamera=1.0-1.0/length(p);
  vec3 v=direction+radialCamera*dot(direction,radialCamera)*(sqrt(fCamera)-1.0);
  if(uLensing<.001)v=direction; // Nonphysical straight projection, labeled comparison only.
  vec3 angular = cross(p, v);
  float angularMomentum2 = dot(angular, angular);
  vec3 light=vec3(0.0);
  float transmittance=1.0;
  bool captured=false;
  bool escaped=false;
  {
    for (int i = 0; i < 980; i++) {
      if (i >= uSteps) break;
      float radius = length(p);
      if (radius < 1.002) { captured = true; break; }
      if (radius > 60.0 && dot(p, v) > 0.0) {escaped=true;break;}
      float spatialStep = clamp((radius - 0.95) * 0.075, 0.009, 0.30);
      float dt = spatialStep / max(length(v), 0.5);
      vec3 a = acceleration(p, angularMomentum2);
      vec3 nextP = p + v * dt + 0.5 * a * dt * dt;
      vec3 nextV = v + 0.5 * (a + acceleration(nextP, angularMomentum2)) * dt;
      if (uDisk > 0.001) {
        vec3 localTangent = (v + nextV) * 0.5;
        // Optically thick, geometrically thin emitting surface: sample crossings only.
        if (p.y * nextP.y < 0.0) {
          float t = p.y / (p.y - nextP.y);
          vec3 crossing = mix(p, nextP, t);
          float incidence = max(0.10, abs(normalize(localTangent).y));
          float surfaceDepth = clamp(uThickness * 3.2 / incidence, 0.20, 2.8);
          sampleDisk(crossing, localTangent, surfaceDepth, light, transmittance);
        }
      }
      p = nextP;
      v = nextV;
      if (transmittance < 0.006) break;
    }
  }
  light += transmittance * sky(v) * uSky * (captured ? 1.0 - uHorizon : (escaped ? 1.0 : 0.0));
  // Unfinished rays are purple diagnostics, never silently classified as shadow.
  if(!captured && !escaped && transmittance>.006) light+=transmittance*vec3(.07,.015,.09);
  // Exponential exposure mapping plus display gamma.
  vec3 mapped = 1.0 - exp(-light * uExposure);
  mapped = pow(max(mapped, vec3(0.0)), vec3(1.0 / 2.2));
  float vignette = 1.0 - 0.18 * smoothstep(0.4, 1.8, length(uv));
  outColor = vec4(mapped * vignette, 1.0);
}
`
});
