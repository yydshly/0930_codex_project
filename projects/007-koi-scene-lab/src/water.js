import * as THREE from 'three';
import { pondShape } from './geometry.js';
import { pondBoundary, isInPond } from './config.js';
import { RippleSimulation } from './ripples.js';
import { GERSTNER_GLSL,surfaceSampleAt,sampleGerstner } from './water-motion.js';
import {waterTargetSizes} from './water-quality.js';
import {advanceFloatAnchor} from './floating-motion.js';
import {waterPassDecision} from './water-pass-policy.js';
import {pointInPolygon,signedPolygonDistance} from './habitat-geometry.js';

const waves=`
uniform float time,wind,pondScale,rippleAlpha;uniform vec4 rippleBounds;uniform sampler2D ripple,ripplePrevious;uniform vec4 drops[12];uniform bool gpuRipples;
vec2 rippleUV(vec2 p){return (p-rippleBounds.xy)/rippleBounds.zw;}
${GERSTNER_GLSL}
float rippleHeight(vec2 p){float h=0.;
  if(gpuRipples)h=mix(texture2D(ripplePrevious,rippleUV(p)).r,texture2D(ripple,rippleUV(p)).r,rippleAlpha);
  else for(int i=0;i<12;i++){float age=time-drops[i].z,d=length(p-drops[i].xy);
    if(age>0.&&age<4.)h+=sin(d*27.-age*16.)*exp(-abs(d-age*1.1)*6.-age)*drops[i].w;}
  return h;
}`;
const vertex=waves+`
uniform mat4 textureMatrix;varying vec3 vWorld;varying vec4 vMirror;varying vec2 vRestXZ;varying float vWaveHeight;
void main(){vec4 w=modelMatrix*vec4(position,1.);vRestXZ=w.xz;
  vec3 displacement,tx,tz;gerstner(vRestXZ,displacement,tx,tz);w.xyz+=displacement;w.y+=rippleHeight(vRestXZ);
  vWaveHeight=displacement.y+rippleHeight(vRestXZ);vWorld=w.xyz;vMirror=textureMatrix*w;gl_Position=projectionMatrix*viewMatrix*w;}`;
const fragment=waves+`
uniform sampler2D reflection,refraction,refractionDepth,bankMask;
uniform vec2 resolution;uniform mat4 inverseProjection,cameraWorld;
uniform float clarity,debugMode;uniform vec3 lightDirection,sunColor;
varying vec3 vWorld;varying vec4 vMirror;varying vec2 vRestXZ;varying float vWaveHeight;
float sunGGX(vec3 n,vec3 v,vec3 l,float rough){
  float nv=max(dot(n,v),.001),nl=max(dot(n,l),0.);if(nl<=0.)return 0.;
  vec3 h=normalize(v+l);float nh=max(dot(n,h),0.),vh=max(dot(v,h),0.),a2=pow(rough,4.);
  float denom=nh*nh*(a2-1.)+1.,D=a2/(3.14159265*denom*denom),k=rough*rough*.5;
  float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k)),F=.0204+.9796*pow(1.-vh,5.);
  return D*G*F/(4.*nv*nl)*nl;
}
void main(){vec2 bankUV=rippleUV(vWorld.xz);
  if(any(lessThan(bankUV,vec2(0.)))||any(greaterThan(bankUV,vec2(1.)))||texture2D(bankMask,bankUV).r<.5)discard;
  vec3 displacement,tx,tz;gerstner(vRestXZ,displacement,tx,tz);float e=.035;
  tx.y+=(rippleHeight(vRestXZ+vec2(e,0.))-rippleHeight(vRestXZ-vec2(e,0.)))/(2.*e);
  tz.y+=(rippleHeight(vRestXZ+vec2(0.,e))-rippleHeight(vRestXZ-vec2(0.,e)))/(2.*e);
  vec3 n=normalize(cross(tz,tx));
  vec3 v=normalize(cameraPosition-vWorld);float nv=max(dot(n,v),0.);float fresnel=.0204+.9796*pow(1.-nv,5.);
  vec2 baseUV=gl_FragCoord.xy/resolution;float baseDepth=texture2D(refractionDepth,baseUV).r;
  vec4 basePoint=inverseProjection*vec4(baseUV*2.-1.,baseDepth*2.-1.,1.);basePoint/=basePoint.w;
  float shallowPath=length((cameraWorld*basePoint).xyz-vWorld);
  // Surface-feeding fish stay continuous at the waterline; deeper objects distort more.
  vec2 uv=clamp(baseUV+n.xz*.013*smoothstep(.015,.42,shallowPath),.003,.997);
  float d=texture2D(refractionDepth,uv).r;vec4 q=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);q/=q.w;
  vec3 under=(cameraWorld*q).xyz;float path=clamp(length(under-vWorld),.02,3.);
  vec3 transmit=exp(-vec3(1.55,.55,.29)*path/max(clarity,.3));
  vec3 underwater=texture2D(refraction,uv).rgb*transmit+vec3(.018,.095,.065)*(1.-transmit);
  vec2 mirrorUV=clamp(vMirror.xy/max(vMirror.w,.001)+n.xz*.075,.003,.997);
  vec3 reflected=texture2D(reflection,mirrorUV).rgb;
  float rough=max(.075+wind*.055,length(fwidth(n))*.8);
  vec3 col=mix(underwater,reflected,fresnel)+sunColor*min(sunGGX(n,v,lightDirection,rough),8.);
  if(debugMode>.5)col=debugMode>1.5?n*.5+.5:mix(vec3(.06,.22,.72),vec3(.96,.33,.10),clamp(.5+vWaveHeight*12.5,0.,1.));
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function surfaceGrid(bounds={x:-6.5,z:-6.15,width:12,height:12}){const pos=[],uv=[],indices=[],n=104;
  // Keep every cell, including a one-cell margin for horizontal wave displacement.
  // Fragment clipping owns the shoreline: centroid pruning leaves triangular gaps.
  const pad=Math.max(bounds.width,bounds.height)/n;
  for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){pos.push(bounds.x-pad+x/n*(bounds.width+2*pad),0,bounds.z-pad+z/n*(bounds.height+2*pad));uv.push(x/n,z/n);}
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export class PondWater {
  constructor(renderer,scene,camera,floorMat,sunLight=null){this.renderer=renderer;this.scene=scene;this.camera=camera;this.sunLight=sunLight;this.scale=1;
    this.simulation=new RippleSimulation(renderer);this.target=new THREE.WebGLRenderTarget(512,384,{type:THREE.HalfFloatType});
    this.refractionTarget=new THREE.WebGLRenderTarget(512,384,{type:THREE.HalfFloatType});this.refractionTarget.depthTexture=new THREE.DepthTexture(512,384,THREE.UnsignedIntType);
    this.refCamera=new THREE.PerspectiveCamera();this.textureMatrix=new THREE.Matrix4();this.drops=Array.from({length:12},()=>new THREE.Vector4(0,0,-100,0));this.nextDrop=0;
    this.material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,depthWrite:true,side:THREE.DoubleSide,uniforms:{
      time:{value:0},wind:{value:.3},clarity:{value:1.45},pondScale:{value:1},rippleAlpha:{value:1},ripplePrevious:{value:this.simulation.texture},rippleBounds:{value:new THREE.Vector4(-6.5,-6.15,12,12)},debugMode:{value:0},gpuRipples:{value:this.simulation.enabled},ripple:{value:this.simulation.texture},bankMask:{value:this.simulation.mask},drops:{value:this.drops},
      textureMatrix:{value:this.textureMatrix},reflection:{value:this.target.texture},refraction:{value:this.refractionTarget.texture},refractionDepth:{value:this.refractionTarget.depthTexture},
      inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},resolution:{value:new THREE.Vector2()},lightDirection:{value:new THREE.Vector3()},sunColor:{value:new THREE.Color()}}});
    this.mesh=new THREE.Mesh(surfaceGrid(),this.material);this.mesh.position.y=.02;this.mesh.renderOrder=8;scene.add(this.mesh);
    const floorGeo=new THREE.ShapeGeometry(pondShape(),96);floorGeo.rotateX(-Math.PI/2);
    this.floor=new THREE.Mesh(floorGeo,floorMat.clone());this.floor.position.y=-.78;this.floor.receiveShadow=true;scene.add(this.floor);
    this.floor.material.onBeforeCompile=shader=>{shader.uniforms.uPondTime=this.material.uniforms.time;shader.uniforms.uClarity=this.material.uniforms.clarity;
      shader.vertexShader='varying vec3 vPondWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPondWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying vec3 vPondWorld;uniform float uPondTime,uClarity;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`vec2 p=vPondWorld.xz;
        float a=sin(p.x*10.+sin(p.y*8.+uPondTime*.7)*1.5+uPondTime),b=sin(p.y*12.+sin(p.x*7.-uPondTime*.8)*1.6-uPondTime*.8);
        float c=pow(max(0.,1.-abs(a+b)*.8),9.);gl_FragColor.rgb+=c*.019*clamp(uClarity,.3,2.);
        #include <dithering_fragment>`);
    };
    const pos=[],uv=[];for(let i=0;i<96;i++){const a=pondBoundary(i/96*Math.PI*2),b=pondBoundary((i+1)/96*Math.PI*2);
      for(const [p,y]of [[a,-.78],[b,-.78],[a,-.032],[b,-.78],[b,-.032],[a,-.032]]){pos.push(p.x,y,p.z);uv.push(p.x*.4,p.z*.4+y);}}
    const wallGeo=new THREE.BufferGeometry();wallGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));wallGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));wallGeo.computeVertexNormals();
    const wallMat=floorMat.clone();wallMat.side=THREE.DoubleSide;wallMat.color.set('#65776b');this.wall=new THREE.Mesh(wallGeo,wallMat);this.wall.receiveShadow=true;scene.add(this.wall);
    this.gardenGeometry={surface:this.mesh.geometry,floor:this.floor.geometry,wall:this.wall.geometry};this.habitat=null;this.passRevision=0;this.lastPass=null;this.passStats={updates:0,reason:'initial'};
  }
  addRipple(x,z,time,amplitude=.014,radius=.22){const p=this.floatAnchorAt(x,z,time);this.drops[this.nextDrop++%12].set(p.x,p.z,time,amplitude);
    this.simulation.impulse(this.habitat?p.x:(p.x+.5)/this.scale-.5,this.habitat?p.z:(p.z+.15)/this.scale-.15,amplitude,this.habitat?radius:radius/this.scale);}
  rippleAtRest(x,z,time){const rx=this.habitat?x:(x+.5)/this.scale-.5,rz=this.habitat?z:(z+.15)/this.scale-.15;
    let ripple=this.simulation.heightAt(rx,rz);if(!this.simulation.enabled)for(const d of this.drops){const age=time-d.z,dist=Math.hypot(x-d.x,z-d.y);if(age>0&&age<4)ripple+=Math.sin(dist*27-age*16)*Math.exp(-Math.abs(dist-age*1.1)*6-age)*d.w;}return ripple;}
  heightAt(x,z,time=this.material.uniforms.time.value){const s=surfaceSampleAt(x,z,time,this.material.uniforms.wind.value);return s.height+this.rippleAtRest(s.x,s.z,time)+(this.habitat?this.habitat.waterLevel-.02:0);}
  floatAnchorAt(x,z,time){const s=surfaceSampleAt(x,z,time,this.material.uniforms.wind.value);return {x:s.x,z:s.z};}
  sampleAtRest(x,z,time){const s=sampleGerstner(x,z,time,this.material.uniforms.wind.value),e=.035,dx=(this.rippleAtRest(x+e,z,time)-this.rippleAtRest(x-e,z,time))/(2*e),dz=(this.rippleAtRest(x,z+e,time)-this.rippleAtRest(x,z-e,time))/(2*e);
    const tx=s.tangentX,tz=s.tangentZ;tx[1]+=dx;tz[1]+=dz;const n=[tz[1]*tx[2]-tz[2]*tx[1],tz[2]*tx[0]-tz[0]*tx[2],tz[0]*tx[1]-tz[1]*tx[0]],length=Math.hypot(...n);
    return {x:s.position[0],y:(this.habitat?.waterLevel??.02)+s.displacement[1]+this.rippleAtRest(x,z,time),z:s.position[2],normal:n.map(v=>v/length)};}
  advanceFloater(anchor,dt,time){return advanceFloatAnchor(anchor,dt,this.material.uniforms.wind.value,(x,z)=>{const p=sampleGerstner(x,z,time,this.material.uniforms.wind.value).position;
    return this.habitat?pointInPolygon(this.habitat.polygon,p[0],p[2])&&this.habitat.obstacles.every(o=>Math.hypot(p[0]-o.x,p[2]-o.z)>o.radius):isInPond(p[0],p[2],this.scale);});}
  setDebugMode(mode){if(!['natural','height','normal'].includes(mode))throw new Error('未知水面观察模式');this.debugMode=mode;this.material.uniforms.debugMode.value={natural:0,height:1,normal:2}[mode];}
  setRenderInterpolation(alpha){const s=this.simulation,u=this.material.uniforms;u.rippleAlpha.value=Math.max(0,Math.min(1,alpha));u.ripplePrevious.value=s.enabled?s.targets[1-s.index].texture:s.texture;u.ripple.value=s.texture;}
  setHabitat(habitat){if(this.habitat){for(const key of ['mesh','floor','wall'])this[key].geometry.dispose();}
    this.habitat=habitat;
    if(!habitat){this.mesh.geometry=this.gardenGeometry.surface;this.floor.geometry=this.gardenGeometry.floor;this.wall.geometry=this.gardenGeometry.wall;this.simulation.setDomain({x:-6.5,z:-6.15,width:12,height:12},isInPond);this.reset();return;}
    const p=habitat.polygon,xs=p.map(q=>q.x),zs=p.map(q=>q.z),minX=Math.min(...xs),minZ=Math.min(...zs),width=Math.max(...xs)-minX,height=Math.max(...zs)-minZ;
    const span=Math.max(width,height);this.domain={x:minX+(width-span)/2,z:minZ+(height-span)/2,width:span,height:span};const inside=(x,z)=>pointInPolygon(p,x,z)&&habitat.obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.radius);
    this.simulation.setDomain(this.domain,inside);this.mesh.geometry=surfaceGrid(this.domain);
    const shape=new THREE.Shape();p.forEach((q,i)=>i?shape.lineTo(q.x,-q.z):shape.moveTo(q.x,-q.z));shape.closePath();
    for(const o of habitat.obstacles){if(signedPolygonDistance(p,o.x,o.z).distance>=-o.radius||habitat.obstacles.some(other=>other!==o&&Math.hypot(other.x-o.x,other.z-o.z)<=other.radius+o.radius))continue;const hole=new THREE.Path();hole.absarc(o.x,-o.z,o.radius,0,Math.PI*2,true);shape.holes.push(hole);}
    const floor=new THREE.ShapeGeometry(shape,48);floor.rotateX(-Math.PI/2);this.floor.geometry=floor;
    const wall=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];for(const [q,y]of [[a,-habitat.depth],[b,-habitat.depth],[a,-.012],[b,-habitat.depth],[b,-.012],[a,-.012]])wall.push(q.x,y,q.z);}
    const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));wg.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:wall.length/3*2},()=>0),2));wg.computeVertexNormals();this.wall.geometry=wg;this.reset();
  }
  update(time,settings,sunDirection,sunColor,dt=0){const u=this.material.uniforms;this.scale=settings.pondScale;u.time.value=time;u.wind.value=settings.wind;u.clarity.value=settings.clarity;u.pondScale.value=this.scale;
    // Keep the calibrated highlight range while following the scene's direct-light intensity.
    u.lightDirection.value.copy(sunDirection);u.sunColor.value.copy(sunColor).multiplyScalar(this.sunLight?this.sunLight.intensity/3.1:1);this.simulation.update(dt);u.ripple.value=this.simulation.texture;
    if(this.habitat){const h=this.habitat,b=this.domain;u.rippleBounds.value.set(b.x,b.z,b.width,b.height);for(const o of [this.mesh,this.floor,this.wall]){o.scale.set(1,1,1);o.position.set(0,h.waterLevel,0);}this.floor.position.y-=h.depth;}
    else {u.rippleBounds.value.set(-.5-6*this.scale,-.15-6*this.scale,12*this.scale,12*this.scale);for(const o of [this.mesh,this.floor,this.wall]){o.scale.set(this.scale,1,this.scale);o.position.set(.5*(this.scale-1),o===this.mesh?.02:o===this.floor?-.78:0,.15*(this.scale-1));}}this.material.wireframe=settings.wireframe;
    this.syncCamera();
  }
  syncCamera(){const u=this.material.uniforms;this.renderer.getDrawingBufferSize(u.resolution.value);this.camera.updateMatrixWorld();u.inverseProjection.value.copy(this.camera.projectionMatrixInverse);u.cameraWorld.value.copy(this.camera.matrixWorld);}
  invalidatePasses(){this.passRevision++;}
  passState(frame,{paused=false,content=null}={}){this.camera.updateMatrixWorld();const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());return {frame,width:size.x,height:size.y,world:[...this.camera.matrixWorld.elements],projection:[...this.camera.projectionMatrix.elements],altitude:this.camera.position.y-(this.habitat?.waterLevel??.02),revision:this.passRevision,paused,content};}
  passDecision(frame,context={}){return waterPassDecision(this.passState(frame,context),this.lastPass);}
  renderPasses(hiddenUnder=[],hiddenAbove=[],frame=0,reason='explicit',context={}){const renderer=this.renderer,cam=this.camera,refl=this.refCamera;cam.updateMatrixWorld();
    this.syncCamera();
    const sizes=waterTargetSizes(this.material.uniforms.resolution.value.x,cam.aspect,cam.position.y-(this.habitat?.waterLevel??.02),renderer.capabilities.maxTextureSize);
    for(const [name,target]of [['reflection',this.target],['refraction',this.refractionTarget]]){const s=sizes[name];if(target.width!==s.width||target.height!==s.height)target.setSize(s.width,s.height);}
    const level=this.habitat?.waterLevel??.02;refl.copy(cam,false);refl.position.copy(cam.position);refl.position.y=level*2-cam.position.y;const look=cam.getWorldDirection(new THREE.Vector3()).add(cam.position);look.y=level*2-look.y;
    refl.up.set(0,-1,0);refl.lookAt(look);refl.updateMatrixWorld();this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(refl.projectionMatrix).multiply(refl.matrixWorldInverse);
    const oldTarget=renderer.getRenderTarget(),oldClip=renderer.clippingPlanes,oldBG=this.scene.background,oldShadow=renderer.shadowMap.autoUpdate;
    const objects=[this.mesh,this.floor,this.wall,...hiddenUnder,...hiddenAbove],visibility=objects.map(o=>o.visible);
    try{renderer.shadowMap.autoUpdate=false;this.mesh.visible=false;this.floor.visible=this.wall.visible=false;hiddenUnder.forEach(o=>o.visible=false);
      renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-level-.005)];renderer.setRenderTarget(this.target);renderer.clear();renderer.render(this.scene,refl);
      objects.forEach((o,i)=>o.visible=visibility[i]);this.mesh.visible=false;hiddenAbove.forEach(o=>o.visible=false);
      renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),level+.004)];this.scene.background=new THREE.Color('#173e32');
      renderer.setRenderTarget(this.refractionTarget);renderer.clear();renderer.render(this.scene,cam);
    }finally{renderer.setRenderTarget(oldTarget);renderer.clippingPlanes=oldClip;renderer.shadowMap.autoUpdate=oldShadow;this.scene.background=oldBG;objects.forEach((o,i)=>o.visible=visibility[i]);}
    this.lastPass=this.passState(frame,context);this.passStats.updates++;this.passStats.reason=reason;
  }
  renderReflection(hidden=[]){this.renderPasses(hidden);}
  restoreContext(){this.simulation.restoreContext();this.setRenderInterpolation(1);this.lastPass=null;this.invalidatePasses();}
  reset(){this.simulation.reset();this.drops.forEach(v=>v.set(0,0,-100,0));this.nextDrop=0;this.invalidatePasses();}
}
export function createWaterfall() {
  const group = new THREE.Group(); group.position.set(-4.21,0,-2.03);
  const mat = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, side:THREE.DoubleSide,
    uniforms:{time:{value:0}}, vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float time;void main(){
      float bands=.5+.5*sin(vUv.x*95.+sin(vUv.y*7.-time*6.)*1.8);
      float drop=.5+.5*sin(vUv.y*30.+time*15.+vUv.x*9.);
      float a=(.18+pow(bands,5.)*.55+drop*.12)*smoothstep(0.,.06,vUv.x)*(1.0-smoothstep(.93,1.,vUv.x));
      gl_FragColor=vec4(vec3(.72,.87,.9)+drop*.2,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(.78,.95,24,30),mat); sheet.position.set(0,.57,.33); sheet.rotation.x=-.08;group.add(sheet);
  const positions=[]; const random=()=>Math.random();for(let i=0;i<120;i++)positions.push((random()-.5)*.9,random()*.22, .36+(random()-.5)*.45);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const splash=new THREE.Points(geo,new THREE.PointsMaterial({color:'#d3ebe7',size:.035,transparent:true,opacity:.6,depthWrite:false}));group.add(splash);
  return {group,get time(){return mat.uniforms.time.value;},update(t){mat.uniforms.time.value=t;const p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,.025+Math.abs(Math.sin(t*3.5+i*2.4))*.16);p.needsUpdate=true;}};
}
