import * as THREE from 'three';
import {pressGLSL,pressOffset} from './deformation.js';
import { FIXED_STEP, GUIDE_COUNT, stiffnessFor, stepSpring, tangentialForce } from './physics.js';
import {createStrand,stepStrand,resetStrand,makeGroomRestShape} from './strand-dynamics.js';
import {paintGroomField,clearGroomField,readGroomField,applyGroomField,GUIDE_BRUSH_RADIUS} from './groom-field.js';
import {LocalCoatField,surfaceUV} from './local-coat-field.js';

// Separate, stateless randomness keeps clump layout stable without shifting legacy fibers.
function clumpHash(row, column, channel) {
  let value = (Math.imul(row + 1, 0x9e3779b1) ^ Math.imul(column + 1, 0x85ebca77) ^
    Math.imul(channel + 1, 0xc2b2ae3d) ^ 0x68bc21eb) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function localTexture(data,field) {
  const texture=new THREE.DataTexture(data,field.width,field.height,THREE.RGBAFormat,THREE.FloatType);
  texture.minFilter=texture.magFilter=THREE.NearestFilter;
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.flipY=false;texture.needsUpdate=true;return texture;
}

function copyContacts(colliders) {
  if(!Array.isArray(colliders))return [];
  const vector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)?value.slice():null;
  const radius=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?Math.max(.001,Math.min(3,value)):null;
  const result=[];
  for(const value of colliders){
    if(result.length===8)break;
    if(!value||typeof value!=='object')continue;
    if(value.type==='capsule'){
      const a=vector(value.a),b=vector(value.b),r=radius(value.radius);
      if(a&&b&&r)result.push({type:'capsule',a,b,radius:r});
    }else if(value.type==='sphere'){
      const center=vector(value.center),r=radius(value.radius);
      if(center&&r)result.push({type:'sphere',center,radius:r});
    }else if(value.type==='ellipsoid'){
      const center=vector(value.center),radii=vector(value.radii);
      if(center&&radii&&radii.every(r=>r>0))result.push({type:'ellipsoid',center,radii:radii.map(radius)});
    }
  }
  return result;
}

const vertexShader = /* glsl */`
${pressGLSL}
attribute vec3 aRoot;
attribute vec3 aNormal;
attribute vec4 aSeed;
attribute vec3 aGuides;
attribute vec4 aClumpRoot;
attribute vec2 aSurfaceUV;
uniform vec3 uGuides[32];
uniform vec3 uGroomField[32];
uniform sampler2D uStrands;
uniform float uResearch;
uniform float uFTL;
uniform float uPhysicalGroom;
uniform float uCollision;
uniform float uContactCount;
uniform float uContactKind[8];
uniform vec3 uContactA[8];
uniform vec3 uContactB[8];
uniform float uContactRadius[8];
uniform sampler2D uLocalField;
uniform sampler2D uLocalColor;
uniform vec2 uLocalResolution;
uniform float uLocalEdits;
uniform float uClump;
uniform float uShortPile;
uniform vec3 uGravity;
uniform vec3 uInertia;
uniform float uLength;
uniform float uFaceGuard;
uniform float uThickness;
uniform vec2 uViewport;
uniform float uCurl;
uniform float uMess;
uniform float uStiffness;
uniform float uGroom;
uniform float uWetness;
varying float vSide;
varying float vLength;
varying float vVariation;
varying float vCoverageScale;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec4 vCoatTint;
vec4 contactReachA=vec4(0.);
vec4 contactReachB=vec4(0.);
bool hasContactReach=false;

vec3 tangentAxis(vec3 normal) {
  return normalize(cross(normal, abs(normal.y) < .93 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
}
// Manual bilinear filtering also works on devices without float-linear filtering.
vec4 sampleLocal(sampler2D field,vec2 uv) {
  vec2 pixel=vec2(fract(uv.x),clamp(uv.y,0.,1.))*uLocalResolution-.5;
  vec2 base=floor(pixel),blend=fract(pixel);
  vec2 a=(vec2(mod(base.x,uLocalResolution.x),clamp(base.y,0.,uLocalResolution.y-1.))+.5)/uLocalResolution;
  vec2 b=(vec2(mod(base.x+1.,uLocalResolution.x),clamp(base.y,0.,uLocalResolution.y-1.))+.5)/uLocalResolution;
  vec2 c=(vec2(mod(base.x,uLocalResolution.x),clamp(base.y+1.,0.,uLocalResolution.y-1.))+.5)/uLocalResolution;
  vec2 d=(vec2(mod(base.x+1.,uLocalResolution.x),clamp(base.y+1.,0.,uLocalResolution.y-1.))+.5)/uLocalResolution;
  return mix(mix(texture2D(field,a),texture2D(field,b),blend.x),mix(texture2D(field,c),texture2D(field,d),blend.x),blend.y);
}
vec3 directionAt(float t, vec3 n, vec3 tangent, vec3 side, vec3 bend,float curlDelta) {
  float angle = aSeed.x * 6.2831853;
  // Individual curl + a shared low-frequency groom direction create soft clumps.
  vec3 curl = tangent * sin(t * 5.8 + angle) + side * cos(t * 5.8 + angle);
  vec3 disorder = tangent * sin(angle * 3.7) + side * cos(angle * 2.3);
  vec3 groom = tangent * sin(aRoot.y * 17. + aRoot.z * 13.) + side * cos(aRoot.x * 19. + aRoot.y * 11.);
  vec3 flow=vec3(.18,-1.,.04);flow-=n*dot(flow,n);
  float styling=uGroom*1.6+uWetness*.9;
  vec3 original=n + bend*t*t + flow*styling*t + curl*uCurl*t*.85*(1.-uWetness*.7) + (disorder*.28+groom*.22)*uMess*t*(1.-max(uGroom,uWetness)*.75);
  if(uLocalEdits>.5)original+=curl*(clamp(uCurl+curlDelta,0.,1.)-uCurl)*t*.85*(1.-uWetness*.7);
  if(uPhysicalGroom>.5)original-=flow*styling*t;
  if(uResearch<.5&&uFTL<.5)return normalize(original);
  vec3 field=mix(uGroomField[int(aGuides.x)],uGroomField[int(aGuides.y)],aGuides.z);
  field-=n*dot(field,n);
  vec3 group=aClumpRoot.xyz-aRoot;group-=n*dot(group,n);
  if(uFTL>.5){
    float segment=min(floor(t*6.),5.);
    vec3 da=texture2D(uStrands,vec2((segment+.5)/6.,(aGuides.x+.5)/32.)).xyz;
    vec3 db=texture2D(uStrands,vec2((segment+.5)/6.,(aGuides.y+.5)/32.)).xyz;
    vec3 simulated=n+mix(da,db,aGuides.z);
    original+=simulated-n-bend*t*t;
  }
  // Keep outward stems; only the tips gather, with a weaker pull on dense short plush.
  group/=max(uLength*aSeed.y,.025);
  group*=min(1.,.9/max(length(group),.0001));
  float tipGather=smoothstep(.35,1.,t);
  float clumpScale=uShortPile>.5?.95:1.65;
  float renderField=uPhysicalGroom>.5||uResearch<.5?0.:1.;
  return normalize(original+field*t*2.4*renderField+group*uClump*aClumpRoot.w*tipGather*tipGather*clumpScale);
}
// Restrict a direction to the intersection of a contact half-space and its exact
// segment-length sphere. This is a bounded node proxy, not mesh/self collision.
vec3 contactDirection(vec3 direction,vec3 normal,float minimumDot) {
  float current=dot(direction,normal),target=clamp(minimumDot,-1.,1.);
  if(current>=target)return direction;
  vec3 tangent=direction-normal*current;
  if(dot(tangent,tangent)<.00000001)tangent=tangentAxis(normal);
  return normal*target+normalize(tangent)*sqrt(max(0.,1.-target*target));
}
vec4 accessoryContact(int index,vec3 point,vec3 fallback) {
  vec3 normal=fallback;
  float distance=0.;
  if(uContactKind[index]<1.5){
    vec3 radii=max(uContactB[index],vec3(.001));
    vec3 delta=point-uContactA[index],q=delta/radii;
    vec3 gradient=delta/(radii*radii);
    normal=dot(gradient,gradient)>.00000001?normalize(gradient):fallback;
    float qLength=length(q);
    distance=qLength>.00001?qLength*(qLength-1.)/max(length(gradient),.00001):-min(radii.x,min(radii.y,radii.z));
  }else{
    vec3 axis=uContactB[index]-uContactA[index];
    float alpha=clamp(dot(point-uContactA[index],axis)/max(dot(axis,axis),.00000001),0.,1.);
    vec3 delta=point-(uContactA[index]+axis*alpha);
    float magnitude=length(delta);normal=magnitude>.00001?delta/magnitude:fallback;
    distance=magnitude-uContactRadius[index];
  }
  return vec4(normal,distance);
}
void prepareContactReachability(vec3 root,float strandLength) {
  hasContactReach=false;contactReachA=vec4(0.);contactReachB=vec4(0.);
  for(int i=0;i<8;i++){
    if(float(i)>=uContactCount)continue;
    vec3 delta=vec3(0.);float bound=0.;
    if(uContactKind[i]<1.5){
      delta=root-uContactA[i];
      bound=max(uContactB[i].x,max(uContactB[i].y,uContactB[i].z))+strandLength;
    }else{
      vec3 axis=uContactB[i]-uContactA[i];
      float alpha=clamp(dot(root-uContactA[i],axis)/max(dot(axis,axis),.00000001),0.,1.);
      delta=root-(uContactA[i]+axis*alpha);bound=uContactRadius[i]+strandLength;
    }
    bool reachable=dot(delta,delta)<=bound*bound;
    if(i<4)contactReachA[i]=reachable?1.:0.;else contactReachB[i-4]=reachable?1.:0.;
    hasContactReach=hasContactReach||reachable;
  }
}
vec3 contactPoint(vec3 parent,vec3 candidate,float segmentLength,vec3 root,vec3 rootNormal) {
  vec3 direction=normalize(candidate-parent);
  vec3 result=candidate;
  // Two alternating rounds retain arc length after every correction. Deep or
  // conflicting proxies may remain unresolved; CPU guides report those cases.
  if(hasContactReach){
    for(int pass=0;pass<2;pass++){
      direction=contactDirection(direction,rootNormal,-dot(parent-root,rootNormal)/segmentLength);
      result=parent+direction*segmentLength;
      for(int i=0;i<8;i++){
        if(float(i)>=uContactCount)break;
        float reachable=i<4?contactReachA[i]:contactReachB[i-4];
        if(reachable<.5)continue;
        vec4 contact=vec4(rootNormal,0.);contact=accessoryContact(i,result,rootNormal);
        if(contact.w<0.){
          float minimumDot=(dot(result-parent,contact.xyz)-contact.w)/segmentLength;
          direction=contactDirection(direction,contact.xyz,minimumDot);
          result=parent+direction*segmentLength;
        }
      }
    }
  }else{
    direction=contactDirection(direction,rootNormal,-dot(parent-root,rootNormal)/segmentLength);
    result=parent+direction*segmentLength;
  }
  return result;
}
vec3 strandPoint(float f, vec3 n, vec3 tangent, vec3 side, vec3 bend, float len,float curlDelta) {
  vec3 point = aRoot;
  vec3 rootOffset=pressOffset(aRoot,normalize(aNormal));
  // Integrate normalized directions: each subsegment has a constant rest length.
  for (int i = 0; i < 6; i++) {
    float start = float(i) / 6.;
    float stepLength = clamp(f - start, 0., 1. / 6.);
    vec3 candidate=point+directionAt(start+.5*stepLength,n,tangent,side,bend,curlDelta)*len*stepLength;
    if(uCollision>.5&&stepLength>.000001&&len>.000001)
      point=contactPoint(point+rootOffset,candidate+rootOffset,len*stepLength,aRoot+rootOffset,n)-rootOffset;
    else point=candidate;
  }
  return point+rootOffset;
}
void main() {
  hasContactReach=false;contactReachA=vec4(0.);contactReachB=vec4(0.);
  float f = position.y;
  vec3 n = pressNormal(aRoot,normalize(aNormal));
  vec3 tangent = tangentAxis(n);
  vec3 side = normalize(cross(n, tangent));
  vec3 guide = mix(uGuides[int(aGuides.x)], uGuides[int(aGuides.y)], aGuides.z);
  vec3 gravity = uGravity - n * dot(uGravity, n);
  vec3 inertia = uInertia - n * dot(uInertia, n);
  vec3 bend = guide + gravity * (uLength * 9.) / (1. + uStiffness * 3.) + inertia;
  float len = uLength * aSeed.y;
  vec4 local=vec4(1.,0.,0.,1.);vCoatTint=vec4(0.);
  if(uLocalEdits>.5){
    local=sampleLocal(uLocalField,aSurfaceUV);
    len*=clamp(local.r,.08,1.);
    vCoatTint=vec4(sampleLocal(uLocalColor,aSurfaceUV).rgb,clamp(local.b,0.,1.));
  }
  // Feathered facial exclusion region, not a full accessory collision solver.
  float eyeDistance=length(vec2((abs(aRoot.x)-.33)/.34,(aRoot.y-.18)/.34));
  float faceMask=(1.-smoothstep(.8,1.2,eyeDistance))*smoothstep(.35,.65,aRoot.z);
  len *= 1.-uFaceGuard*faceMask*.88;
  if(uCollision>.5)prepareContactReachability(aRoot+pressOffset(aRoot,normalize(aNormal)),len);
  vec3 center = strandPoint(f, n, tangent, side, bend, len,local.g);
  vec3 localTangent = directionAt(f, n, tangent, side, bend,local.g);
  vec3 worldCenter = (modelMatrix * vec4(center, 1.)).xyz;
  vec3 worldTangent = normalize(mat3(modelMatrix) * localTangent);
  vec3 viewDirection = normalize(cameraPosition - worldCenter);
  vec3 ribbonSide = cross(worldTangent, viewDirection);
  if (dot(ribbonSide, ribbonSide) < .0001) ribbonSide = cross(viewDirection, vec3(0., 1., .001));
  ribbonSide = normalize(ribbonSide);
  float width = uThickness * (.8 + aSeed.z * .4) * pow(max(1. - f, .03), .65)*(1.-uWetness*.28);
  // Width is in local scene units, including the character's scale.
  float scale = length(modelMatrix[0].xyz);
  vec3 viewCenter = (viewMatrix * vec4(worldCenter, 1.)).xyz;
  float worldPerPixel = 2. * abs(viewCenter.z) / (projectionMatrix[1][1] * max(uViewport.y, 1.));
  float actualWidth = width * scale;
  // Analytic prefilter: widen subpixel fibers and preserve their integrated opacity.
  float rasterWidth = max(actualWidth, worldPerPixel * .7);
  vCoverageScale = actualWidth / rasterWidth;
  vec3 world = worldCenter + ribbonSide * position.x * rasterWidth;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
  vWorld = world;
  vNormal = normalize(mat3(modelMatrix) * n);
  vTangent = worldTangent;
  vSide = position.x;
  vLength = f;
  vVariation = aSeed.w;
}
`;

const fragmentShader = /* glsl */`
uniform vec3 uColor;
uniform vec3 uKeyDirection;
uniform vec3 uKeyColor;
uniform vec3 uFillDirection;
uniform vec3 uFillColor;
uniform vec3 uRimDirection;
uniform vec3 uRimColor;
uniform float uRoughness;
uniform float uShortPile;
uniform float uDensity;
uniform float uWetness;
uniform float uShadow;
varying float vSide;
varying float vLength;
varying float vVariation;
varying float vCoverageScale;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec4 vCoatTint;

void main() {
  float edge = 1. - abs(vSide);
  float coverage = uShortPile > .5 ? .82 : smoothstep(0., .75, edge) * vCoverageScale * .72;
  coverage *= 1. - smoothstep(.93, 1., vLength);
  if (coverage < .0005) discard;
  vec3 N = normalize(vNormal), T = normalize(vTangent), V = normalize(cameraPosition - vWorld);
  // Restore the reference's dense, softly lit short pile. Broad light is stable
  // under motion; no individual bright fiber glints or dark root-to-tip bands.
  vec3 lightTint = (uKeyColor * .45 + uFillColor * .25 + uRimColor * .2 + vec3(.1)) / .83;
  float diffuse = .48 + .52 * max(dot(N, normalize(uKeyDirection)), 0.);
  float variation = mix(.84, 1., vVariation);
  vec3 coatColor=uColor;
  if(vCoatTint.a>0.)coatColor=uColor*(1.-vCoatTint.a)+vCoatTint.rgb;
  vec3 color = coatColor * diffuse * variation * mix(.96, 1.04, vLength) * lightTint*(1.-uWetness*.25);
  vec3 H = normalize(normalize(uKeyDirection) + V);
  // Broad, shared highlights make long-fiber roughness visible without tiny glints.
  color += coatColor * pow(max(dot(N, H), 0.), 8.) * (1. - uRoughness) * (uShortPile > .5 ? .012 : .12);
  // Depth-based root occlusion proxy, independently switchable from legacy light.
  if(uShadow>0.)color*=1.-uShadow*.42*pow(1.-vLength,1.5);
  gl_FragColor = vec4(color, coverage);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class FurCoat {
  constructor(surface, normalAt, color, params) {
    this.shortPile=params.shortPile!==false;
    this.params={...params};this.collision=false;this.groomDynamics=false;this.contacts=[];
    this.surface = surface;
    this.normalAt = normalAt;
    this.localField=new LocalCoatField(surface);
    this.localTexture=localTexture(this.localField.data,this.localField);
    this.localColorTexture=localTexture(this.localField.colorData,this.localField);
    this.accumulator = 0;
    this.guideData = [];
    for (let i = 0; i < GUIDE_COUNT; i++) {
      const theta = Math.acos(1 - 2 * (i + .5) / GUIDE_COUNT);
      const phi = i * Math.PI * (3 - Math.sqrt(5));
      const root = surface(theta, phi), normal = normalAt(theta, phi);
      this.guideData.push({root, normal, uv:surfaceUV(theta,phi),position:[0,0,0], velocity:[0,0,0], touch:[0,0,0]});
    }
    this.groomGuides=this.guideData.map(g=>({root:g.root.toArray(),normal:g.normal.toArray(),style:[0,0,0]}));
    this.strands=this.guideData.map(g=>createStrand(g.root.toArray(),g.normal.toArray(),params.length,6));
    this.strandRoots=this.guideData.map(g=>new Float64Array(g.root.toArray()));
    this.strandNormals=this.guideData.map(g=>new Float64Array(g.normal.toArray()));
    this.restShapes=this.guideData.map(()=>new Float64Array(21));
    this.restScratch=new Float64Array(21);this.dirtyRest=new Set();
    this.rootPlanes=this.guideData.map((g,i)=>({type:'plane',point:this.strandRoots[i],normal:this.strandNormals[i]}));
    this.contactSets=this.rootPlanes.map(plane=>[plane]);
    this.strandLength=params.length;
    this.strandPixels=new Float32Array(6*GUIDE_COUNT*4);
    this.strandTexture=new THREE.DataTexture(this.strandPixels,6,GUIDE_COUNT,THREE.RGBAFormat,THREE.FloatType);
    this.strandTexture.minFilter=this.strandTexture.magFilter=THREE.NearestFilter;this.strandTexture.needsUpdate=true;
    this.experimentMode='off';
    this.uniforms = {
      uGuides:{value:this.guideData.map(() => new THREE.Vector3())},
      uGroomField:{value:this.guideData.map(()=>new THREE.Vector3())},uStrands:{value:this.strandTexture},
      uResearch:{value:0},uFTL:{value:0},uClump:{value:0},uShadow:{value:0},
      uPhysicalGroom:{value:0},uCollision:{value:0},uContactCount:{value:0},
      uContactKind:{value:new Float32Array(8)},uContactA:{value:Array.from({length:8},()=>new THREE.Vector3())},
      uContactB:{value:Array.from({length:8},()=>new THREE.Vector3(1,1,1))},uContactRadius:{value:new Float32Array(8)},
      uLocalField:{value:this.localTexture},uLocalColor:{value:this.localColorTexture},uLocalEdits:{value:0},
      uLocalResolution:{value:new THREE.Vector2(this.localField.width,this.localField.height)},
      uPressCenter:{value:new THREE.Vector3()},uPressDepth:{value:0},uFaceGuard:{value:0},
      uGravity:{value:new THREE.Vector3()},uInertia:{value:new THREE.Vector3()},
      uLength:{value:params.length},uThickness:{value:params.thickness},uViewport:{value:new THREE.Vector2(1280,900)},
      uCurl:{value:params.curl},uMess:{value:params.mess},uStiffness:{value:params.stiffness},
      uGroom:{value:params.groom||0},uWetness:{value:params.wetness||0},
      uShortPile:{value:this.shortPile?1:0},uRoughness:{value:params.roughness},uDensity:{value:params.density/100},
      uColor:{value:new THREE.Color(color)},
      uKeyDirection:{value:new THREE.Vector3(-3,5,4).normalize()},uKeyColor:{value:new THREE.Color()},
      uFillDirection:{value:new THREE.Vector3(1,0,4).normalize()},uFillColor:{value:new THREE.Color()},
      uRimDirection:{value:new THREE.Vector3(3,2,-2).normalize()},uRimColor:{value:new THREE.Color()},
    };
    this.material = new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:this.uniforms,
      side:THREE.DoubleSide,alphaToCoverage:false,depthWrite:this.shortPile,transparent:true,forceSinglePass:true});
    this.mesh = this.shortPile?new THREE.LineSegments(this.buildGeometry(params.density),this.material):new THREE.Mesh(this.buildGeometry(params.density),this.material);
    this.material.linewidth=1;this.mesh.frustumCulled = false;this.mesh.renderOrder=2;
  }
  buildGeometry(density) {
    const geom = new THREE.InstancedBufferGeometry();
    const segments = 6, vertices=[],indices=[];
    if(this.shortPile){for(let i=0;i<segments;i++)vertices.push(0,i/segments,0,0,(i+1)/segments,0);}
    else {for(let i=0;i<=segments;i++){vertices.push(-1,i/segments,0,1,i/segments,0);if(i<segments){const o=i*2;indices.push(o,o+1,o+2,o+1,o+3,o+2)}}}
    geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));if(!this.shortPile)geom.setIndex(indices);
    const count=Math.round(density*1000),roots=new Float32Array(count*3),normals=new Float32Array(count*3),seeds=new Float32Array(count*4),guides=new Float32Array(count*3),clumpRoots=new Float32Array(count*4),surfaceUVs=new Float32Array(count*2);
    let seed=1257;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    // Weight parameter-space samples by Jacobian so density is closer to uniform area.
    const candidates=[];let totalArea=0;const resolution=56;
    for(let y=0;y<resolution;y++)for(let x=0;x<resolution*2;x++){
      const t=(y+.5)*Math.PI/resolution,p=(x+.5)*Math.PI/resolution;
      const dt=this.surface(t+.001,p).sub(this.surface(t-.001,p));
      const dp=this.surface(t,p+.001).sub(this.surface(t,p-.001));
      totalArea+=dt.cross(dp).length();candidates.push({t,p,area:totalArea});
    }
    const clumpRows=24,clumpColumns=48,clumpStepT=Math.PI/clumpRows,clumpStepP=2*Math.PI/clumpColumns;
    const clumpCenters=[];
    for(let row=0;row<clumpRows;row++)for(let column=0;column<clumpColumns;column++){
      const t=(row+.15+.7*clumpHash(row,column,0))*clumpStepT;
      const p=(column+.15+.7*clumpHash(row,column,1))*clumpStepP;
      clumpCenters.push({root:this.surface(t,p),normal:this.normalAt(t,p),strength:.55+.45*clumpHash(row,column,2)});
    }
    for(let i=0;i<count;i++){
      const area=random()*totalArea;let lo=0,hi=candidates.length-1;
      while(lo<hi){const mid=(lo+hi)>>1;if(candidates[mid].area<area)lo=mid+1;else hi=mid}
      const cell=candidates[lo],t=THREE.MathUtils.clamp(cell.t+(random()-.5)*Math.PI/resolution,.0001,Math.PI-.0001),p=cell.p+(random()-.5)*Math.PI/resolution;
      const root=this.surface(t,p),n=this.normalAt(t,p);root.toArray(roots,i*3);n.toArray(normals,i*3);
      surfaceUVs.set(surfaceUV(t,p),i*2);
      const row=Math.min(clumpRows-1,Math.floor(t/clumpStepT));
      const column=((Math.floor(p/clumpStepP)%clumpColumns)+clumpColumns)%clumpColumns;
      let nearest=null,fallback=null,bestDistance=Infinity,fallbackDistance=Infinity;
      // Jittered Voronoi patches replace the repeated latitude/longitude assignment.
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        const r=Math.max(0,Math.min(clumpRows-1,row+dr)),c=(column+dc+clumpColumns)%clumpColumns;
        const center=clumpCenters[r*clumpColumns+c],distance=root.distanceToSquared(center.root);
        if(distance<fallbackDistance){fallback=center;fallbackDistance=distance;}
        if(n.dot(center.normal)>.35&&distance<bestDistance){nearest=center;bestDistance=distance;}
      }
      const center=nearest||fallback;
      center.root.toArray(clumpRoots,i*4);clumpRoots[i*4+3]=center.strength;
      // Retain every legacy RNG draw, including the currently unused kind.
      const phase=random(),kind=random(),clump=.94+.1*Math.sin(root.x*19+Math.sin(root.y*17)+root.z*13);
      const faceSoftening=root.z>.4?Math.exp(-Math.pow((Math.abs(root.x)-.31)/.22,2)-Math.pow((root.y-.25)/.25,2)):0;
      const len=(.55+random()*.7)*(1-.22*faceSoftening)*clump;
      seeds.set([phase,len,random(),random()],i*4);
      let a=0,b=0,d1=Infinity,d2=Infinity;
      for(let j=0;j<GUIDE_COUNT;j++){const d=root.distanceToSquared(this.guideData[j].root);if(d<d1){b=a;d2=d1;a=j;d1=d}else if(d<d2){b=j;d2=d}}
      guides.set([a,b,d1/(d1+d2+.000001)],i*3);
    }
    geom.setAttribute('aRoot',new THREE.InstancedBufferAttribute(roots,3));
    geom.setAttribute('aNormal',new THREE.InstancedBufferAttribute(normals,3));
    geom.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));
    geom.setAttribute('aGuides',new THREE.InstancedBufferAttribute(guides,3));
    geom.setAttribute('aClumpRoot',new THREE.InstancedBufferAttribute(clumpRoots,4));
    geom.setAttribute('aSurfaceUV',new THREE.InstancedBufferAttribute(surfaceUVs,2));
    geom.instanceCount=count;return geom;
  }
  updateParams(params) {
    this.params={...params};
    if(this.shortPile!==(params.shortPile!==false)){
      this.shortPile=params.shortPile!==false;this.uniforms.uShortPile.value=this.shortPile?1:0;this.material.depthWrite=this.shortPile;
      const old=this.mesh,parent=old.parent;old.geometry.dispose();if(parent)parent.remove(old);
      this.mesh=this.shortPile?new THREE.LineSegments(this.buildGeometry(params.density),this.material):new THREE.Mesh(this.buildGeometry(params.density),this.material);
      this.mesh.frustumCulled=false;this.mesh.renderOrder=2;if(parent)parent.add(this.mesh);
    }
    this.material.linewidth=1;
    for(const [name,key] of [['uLength','length'],['uThickness','thickness'],['uCurl','curl'],['uMess','mess'],['uStiffness','stiffness'],['uRoughness','roughness']])this.uniforms[name].value=params[key];
    this.uniforms.uDensity.value=params.density/100;
    this.uniforms.uGroom.value=params.groom||0;this.uniforms.uWetness.value=params.wetness||0;
    this.prepareStrands();
    if(this.mesh.geometry.instanceCount!==Math.round(params.density*1000)){const old=this.mesh.geometry;this.mesh.geometry=this.buildGeometry(params.density);old.dispose()}
  }
  setViewport(width,height){this.uniforms.uViewport.value.set(width,height)}
  setLighting(key,fill,rim) {
    this.uniforms.uKeyColor.value.copy(key.color).multiplyScalar(key.intensity*.25);
    this.uniforms.uFillColor.value.copy(fill.color).multiplyScalar(fill.intensity*.20);
    this.uniforms.uRimColor.value.copy(rim.color).multiplyScalar(rim.intensity*.25);
  }
  touch(point, direction, strength=1) {
    for(const guide of this.guideData){const falloff=Math.exp(-guide.root.distanceToSquared(point)/.22);const tangent=tangentialForce(direction.toArray(),guide.normal.toArray());for(let a=0;a<3;a++)guide.touch[a]+=tangent[a]*falloff*strength*20}
  }
  usesStrands(){return this.experimentMode==='ftl'||this.groomDynamics||this.collision;}
  usesGroomRest(){return this.experimentMode==='ftl'||this.groomDynamics;}
  setExperiment(experiment){
    const usedStrands=this.usesStrands();
    this.experimentMode=experiment.mode;
    this.collision=experiment.collision===true;this.groomDynamics=experiment.groomDynamics===true;
    this.uniforms.uResearch.value=this.experimentMode!=='off'||this.groomDynamics?1:0;
    this.uniforms.uFTL.value=this.usesStrands()?1:0;
    this.uniforms.uPhysicalGroom.value=this.usesGroomRest()?1:0;
    this.uniforms.uCollision.value=this.collision?1:0;
    this.uniforms.uClump.value=this.experimentMode==='bundles'?experiment.clump:0;
    this.uniforms.uShadow.value=this.experimentMode==='bundles'?experiment.shadow:0;
    this.prepareStrands();
    if(usedStrands!==this.usesStrands())for(let i=0;i<GUIDE_COUNT;i++)this.dirtyRest.add(i);
    this.writeStrands();
  }
  setContacts(colliders){
    this.contacts=copyContacts(colliders);
    this.uniforms.uContactCount.value=this.contacts.length;
    this.contacts.forEach((contact,i)=>{
      const capsule=contact.type==='capsule';
      this.uniforms.uContactKind.value[i]=capsule?2:1;
      this.uniforms.uContactA.value[i].fromArray(capsule?contact.a:contact.center);
      const radii=contact.type==='sphere'?[contact.radius,contact.radius,contact.radius]:contact.radii;
      this.uniforms.uContactB.value[i].fromArray(capsule?contact.b:radii);
      this.uniforms.uContactRadius.value[i]=capsule?contact.radius:0;
    });
    this.contactSets=this.rootPlanes.map(plane=>[plane,...this.contacts]);
  }
  prepareStrands(){
    const params=this.params,center=this.uniforms.uPressCenter.value.toArray(),depth=this.uniforms.uPressDepth.value;
    const offset=[0,0,0],physicalGroom=this.usesGroomRest();
    for(let i=0;i<GUIDE_COUNT;i++){
      const guide=this.groomGuides[i],baseRoot=guide.root,baseNormal=guide.normal;
      pressOffset(baseRoot,baseNormal,center,depth,.38,offset);
      for(let axis=0;axis<3;axis++)this.strandRoots[i][axis]=baseRoot[axis]+offset[axis];
      const delta=baseRoot.map((value,axis)=>value-center[axis]);
      const localDepth=depth*Math.exp(-delta.reduce((sum,value)=>sum+value*value,0)/(.38*.38));
      const normalDot=delta.reduce((sum,value,axis)=>sum+value*baseNormal[axis],0);
      const normal=baseNormal.map((value,axis)=>value-(delta[axis]-value*normalDot)*localDepth*2/(.38*.38));
      const magnitude=Math.hypot(...normal);
      for(let axis=0;axis<3;axis++)normal[axis]/=magnitude;
      this.strandNormals[i].set(normal);
      const local=this.localField.baseSnapshot||this.localField.stamps.length?this.localField.sample(...this.guideData[i].uv):{lengthScale:1};
      const length=params.length*Math.max(.08,Math.min(1,local.lengthScale));
      if(Math.abs(this.strands[i].length-length)>1e-10){
        this.strands[i]=createStrand(this.strandRoots[i],normal,length,6);
        this.dirtyRest.add(i);
      }
      this.strands[i].normal.set(normal);
      let bend=[0,0,0];
      if(physicalGroom){
        const flow=[.18,-1,.04],flowNormal=flow.reduce((sum,value,axis)=>sum+value*normal[axis],0);
        const styling=(params.groom||0)*1.6+(params.wetness||0)*.9;
        bend=guide.style.map((value,axis)=>value*2.4+(flow[axis]-normal[axis]*flowNormal)*styling);
        const bendNormal=bend.reduce((sum,value,axis)=>sum+value*normal[axis],0);
        bend=bend.map((value,axis)=>value-normal[axis]*bendNormal);
      }
      makeGroomRestShape(normal,bend,length,6,this.restScratch);
      if(this.restScratch.some((value,axis)=>Math.abs(value-this.restShapes[i][axis])>1e-10)){
        this.restShapes[i].set(this.restScratch);this.dirtyRest.add(i);
      }
    }
    this.strandLength=params.length;
  }
  refreshLocal(){
    this.uniforms.uLocalEdits.value=this.localField.baseSnapshot||this.localField.stamps.length?1:0;
    this.localTexture.needsUpdate=true;this.localColorTexture.needsUpdate=true;
    this.prepareStrands();this.writeStrands();
  }
  applyLocalEdits(edits){const changed=this.localField.replay(edits);this.refreshLocal();return changed;}
  applyLocalState(state){const changed=this.localField.replayState(state);this.refreshLocal();return changed;}
  getLocalState(){return this.localField.getState();}
  paintLocal(raw){const changed=this.localField.stamp(raw);if(changed)this.refreshLocal();return changed;}
  getLocalPaintResult(){return {...this.localField.lastPaintResult};}
  clearLocal(){const changed=this.localField.clear();if(changed)this.refreshLocal();return changed;}
  getLocalEdits(){return this.localField.stamps.map(stamp=>({...stamp,uv:stamp.uv.slice(),point:stamp.point.slice()}));}
  syncGroom(){
    this.groomGuides.forEach((g,i)=>this.uniforms.uGroomField.value[i].fromArray(g.style));
    this.prepareStrands();
  }
  groom(point,direction,strength=1){const changed=paintGroomField(this.groomGuides,point.toArray(),direction.toArray(),strength,GUIDE_BRUSH_RADIUS);if(changed)this.syncGroom();return changed;}
  getGroomField(){const field=readGroomField(this.groomGuides);return field.some(v=>Math.hypot(...v)>.0001)?field:[]}
  setGroomField(field){const changed=applyGroomField(this.groomGuides,field);if(changed)this.syncGroom();return changed;}
  clearGroom(){const changed=clearGroomField(this.groomGuides);if(changed)this.syncGroom();return changed;}
  getContactStats(){return {enabled:this.collision,count:this.collision?this.strands.reduce((sum,s)=>sum+(s.contactCount||0),0):0,unresolved:this.collision?this.strands.reduce((sum,s)=>sum+(s.unresolvedContacts||0),0):0,colliders:this.contacts.length};}
  writeStrands(){for(let j=0;j<GUIDE_COUNT;j++){const s=this.strands[j],n=this.strandNormals[j];for(let i=0;i<6;i++){const at=(j*6+i)*4;for(let a=0;a<3;a++)this.strandPixels[at+a]=(s.positions[(i+1)*3+a]-s.positions[i*3+a])/s.segmentLength-n[a];}}this.strandTexture.needsUpdate=true;}
  reset(){
    for(const guide of this.guideData){guide.position.fill(0);guide.velocity.fill(0);guide.touch.fill(0)}
    for(const guide of this.uniforms.uGuides.value)guide.set(0,0,0);
    this.prepareStrands();
    this.strands.forEach((strand,i)=>{resetStrand(strand,{root:this.strandRoots[i],restShape:this.restShapes[i]});strand.contactCount=0;strand.unresolvedContacts=0;});
    this.dirtyRest.clear();
    this.writeStrands();this.uniforms.uInertia.value.set(0,0,0);this.accumulator=0;
  }
  update(dt,time,params,wind,inertia,rotation) {
    const inverse=rotation.clone().invert(),localGravity=new THREE.Vector3(0,-params.gravity,0).applyQuaternion(inverse);
    const localWind=new THREE.Vector3(wind*(1+.22*Math.sin(time*2.1)),wind*.2*Math.sin(time*1.3),wind*.4*Math.cos(time*.9)).applyQuaternion(inverse);
    const localInertia=inertia.clone().applyQuaternion(inverse);
    this.uniforms.uGravity.value.copy(localGravity);this.uniforms.uInertia.value.copy(localInertia);
    const useStrands=this.usesStrands();if(useStrands)this.prepareStrands();
    // A paused parameter edit/import still needs a visible static target. An
    // unchanged paused coat keeps its existing pose instead of snapping to rest.
    if(useStrands&&dt===0&&this.dirtyRest.size){
      for(const i of this.dirtyRest){
        const strand=this.strands[i];resetStrand(strand,{root:this.strandRoots[i],restShape:this.restShapes[i]});
        if(this.collision){
          stepStrand(strand,{root:this.strandRoots[i],restShape:this.restShapes[i],colliders:this.contactSets[i],contactIterations:6,stiffness:0,damping:0,gravity:[0,0,0],force:[0,0,0]});
          strand.velocities.fill(0);
        }
      }
      this.dirtyRest.clear();
    }
    if(useStrands&&dt===0){
      // A frozen pose still follows its attachment if the skin indentation is
      // edited; translating the whole chain keeps its shape and arc length.
      this.strands.forEach((strand,i)=>{
        const target=this.strandRoots[i],delta=Array.from(target,(value,axis)=>value-strand.root[axis]);
        if(delta.some(value=>value!==0)){
          for(let point=0;point<=strand.segments;point++)for(let axis=0;axis<3;axis++)strand.positions[point*3+axis]+=delta[axis];
          strand.root.set(target);strand.positions.set(target,0);
        }
      });
    }
    this.accumulator=Math.min(this.accumulator+dt,.1);
    const k=stiffnessFor(params.length,params.stiffness);
    let stepped=false;
    while(this.accumulator>=FIXED_STEP){
      stepped=true;
      for(let i=0;i<GUIDE_COUNT;i++){
        const guide=this.guideData[i],turbulence=.75+.25*Math.sin(time*2.6+guide.root.y*3+guide.root.x*2);
        const force=localWind.clone().multiplyScalar(35*turbulence).toArray();
        for(let a=0;a<3;a++){force[a]+=guide.touch[a];guide.touch[a]*=Math.exp(-FIXED_STEP*9)}
        if(useStrands)stepStrand(this.strands[i],{root:this.strandRoots[i],restShape:this.restShapes[i],colliders:this.collision?this.contactSets[i]:undefined,contactIterations:6,friction:.15,gravity:localGravity.clone().multiplyScalar(5).toArray(),force:force.map((v,a)=>v*.18+localInertia.getComponent(a)*5),stiffness:45+params.stiffness*160,damping:8,correction:1});
        else stepSpring(guide.position,guide.velocity,tangentialForce(force,guide.normal.toArray()),k);
      }
      this.accumulator-=FIXED_STEP;
    }
    if(useStrands&&stepped)this.dirtyRest.clear();
    for(let i=0;i<GUIDE_COUNT;i++)this.uniforms.uGuides.value[i].fromArray(this.guideData[i].position);
    if(useStrands)this.writeStrands();
  }
  dispose(){this.mesh.geometry.dispose();this.material.dispose();this.strandTexture.dispose();this.localTexture.dispose();this.localColorTexture.dispose();}
}
