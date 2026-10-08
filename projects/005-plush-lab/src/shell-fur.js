import * as THREE from 'three';
import {pressGLSL} from './deformation.js';
import {FIXED_STEP, stiffnessFor, stepSpring} from './physics.js';
import {SHELL_LAYERS, shellLayers, shellVolumeSlice} from './shell-model.js';

// Experimental shell component inspired by Lengyel et al., I3D 2001,
// https://www.hhoppe.com/fur.pdf . This implements layered volume samples and
// shell shearing only; it does not implement lapped patches or silhouette fins.
const vertexShader = /* glsl */`
${pressGLSL}
attribute float aLayer;
uniform float uLength;
uniform float uFaceGuard;
uniform float uGroom;
uniform float uWetness;
uniform float uCurl;
uniform float uMess;
uniform float uStiffness;
uniform vec3 uGravity;
uniform vec3 uBend;
uniform vec3 uInertia;
uniform vec3 uTouchCenter;
uniform vec3 uTouchBend;
varying float vLayer;
varying vec3 vRoot;
varying vec3 vNormal;
varying vec3 vLocalNormal;
void main() {
  vec3 n=pressNormal(position,normal);
  vec3 flow=vec3(.18,-1.,.04);flow-=n*dot(flow,n);
  vec3 bend=uBend+uInertia+uGravity*(uLength*4.)/(1.+uStiffness*3.);
  bend-=n*dot(bend,n);
  bend+=flow*(uGroom*.9+uWetness*.55);
  vec3 delta=position-uTouchCenter;
  vec3 touch=uTouchBend*exp(-dot(delta,delta)/.22);
  touch-=n*dot(touch,n);
  bend+=touch;
  vec3 tangent=normalize(cross(n,abs(n.y)<.95?vec3(0.,1.,0.):vec3(1.,0.,0.)));
  vec3 side=cross(n,tangent);
  float phase=position.x*11.+position.y*7.+position.z*9.;
  bend+=(tangent*sin(phase+aLayer*5.)+side*cos(phase+aLayer*5.))*uCurl*.3*(1.-uWetness*.7);
  bend+=tangent*sin(phase*2.1)*uMess*.15;
  float eyeDistance=length(vec2((abs(position.x)-.33)/.34,(position.y-.18)/.34));
  float faceMask=(1.-smoothstep(.8,1.2,eyeDistance))*smoothstep(.35,.65,position.z);
  float length=uLength*(1.-uFaceGuard*faceMask*.88);
  // Normalize the shell-offset field so extreme shearing cannot inflate the
  // fur envelope. It remains a layer approximation, not arc-length strands.
  vec3 offset=normalize(n+bend*aLayer)*length*aLayer;
  vec3 point=position+pressOffset(position,normal)+offset;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.);
  vRoot=position;vLayer=aLayer;vLocalNormal=normal;vNormal=normalize(mat3(modelMatrix)*n);
}
`;
const fragmentShader = /* glsl */`
uniform sampler2D uVolume;
uniform vec3 uColor;
uniform vec3 uKeyDirection;
uniform vec3 uKeyColor;
uniform vec3 uFillColor;
uniform vec3 uRimColor;
uniform float uDensity;
uniform float uWetness;
varying float vLayer;
varying vec3 vRoot;
varying vec3 vNormal;
varying vec3 vLocalNormal;
vec2 fiberCoverage(vec2 uv) {
  vec4 texel=texture2D(uVolume,uv);
  float radius=.39*pow(max(1.-vLayer,0.),.45)*(1.-uWetness*.25);
  vec2 dx=dFdx(uv*512.),dy=dFdy(uv*512.);
  float footprint=max(length(dx),length(dy));
  float edge=max(.025,footprint/8.*.32);
  float alpha=1.-smoothstep(radius-edge,radius+edge,texel.r);
  float alive=1.-smoothstep(texel.g-.055,texel.g+.015,vLayer);
  // Integrate unresolved fibers into their area coverage instead of turning
  // them into blinking subpixel dots; no temporal/dither noise is used.
  float mean=3.14159265*radius*radius;
  // A cell spans eight texture texels. Retain its visible cross-section until
  // an entire cell approaches a pixel, instead of blurring half-cell features.
  float unresolved=smoothstep(6.,12.,footprint);
  alpha=mix(alpha,mean,unresolved);
  alive=mix(alive,clamp((1.-vLayer)/.4,0.,1.),unresolved);
  return vec2(alpha*alive,texel.b);
}
void main() {
  vec3 weights=pow(abs(normalize(vLocalNormal)),vec3(8.));
  weights/=max(weights.x+weights.y+weights.z,.0001);
  // Local object coordinates lock the texture to the skin under rotations.
  // Triplanar mapping avoids stretched polar UVs without a lapped atlas.
  float scale=mix(28.,60.,clamp(uDensity,0.,1.5)/1.5)/64.;
  vec2 x=fiberCoverage(vRoot.yz*scale),y=fiberCoverage(vRoot.xz*scale),z=fiberCoverage(vRoot.xy*scale);
  float alpha=(x.x*weights.x+y.x*weights.y+z.x*weights.z)*.62;
  if(alpha<.004)discard;
  float tint=x.y*weights.x+y.y*weights.y+z.y*weights.z;
  vec3 n=normalize(vNormal);
  float diffuse=.48+.52*max(dot(n,normalize(uKeyDirection)),0.);
  // Root occlusion is a stable depth ramp, not a light transport solver.
  float occlusion=mix(.62,1.,pow(vLayer,.55));
  vec3 lightTint=(uKeyColor*.45+uFillColor*.25+uRimColor*.2+vec3(.1))/.83;
  vec3 color=uColor*diffuse*occlusion*mix(.78,1.,clamp((tint-.82)/.18,0.,1.))*lightTint*(1.-uWetness*.25);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class ShellFurCoat {
  constructor(surface,normalAt,color,params) {
    this.surface=surface;this.normalAt=normalAt;this.accumulator=0;
    this.position=[0,0,0];this.velocity=[0,0,0];
    this.volume=new THREE.DataTexture(shellVolumeSlice(),512,512,THREE.RGBAFormat);
    this.volume.wrapS=this.volume.wrapT=THREE.RepeatWrapping;
    this.volume.minFilter=this.volume.magFilter=THREE.LinearFilter;
    this.volume.generateMipmaps=false;this.volume.needsUpdate=true;
    this.uniforms={
      uVolume:{value:this.volume},uColor:{value:new THREE.Color(color)},
      uLength:{value:params.length},uDensity:{value:params.density/100},
      uGroom:{value:params.groom||0},uWetness:{value:params.wetness||0},
      uCurl:{value:params.curl},uMess:{value:params.mess},uStiffness:{value:params.stiffness},
      uGravity:{value:new THREE.Vector3()},uBend:{value:new THREE.Vector3()},uInertia:{value:new THREE.Vector3()},
      uTouchCenter:{value:new THREE.Vector3()},uTouchBend:{value:new THREE.Vector3()},
      uPressCenter:{value:new THREE.Vector3()},uPressDepth:{value:0},uFaceGuard:{value:0},
      uKeyDirection:{value:new THREE.Vector3(-3,5,4).normalize()},
      uKeyColor:{value:new THREE.Color()},uFillColor:{value:new THREE.Color()},uRimColor:{value:new THREE.Color()},
    };
    this.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:this.uniforms,
      transparent:true,depthWrite:false,side:THREE.FrontSide});
    this.mesh=new THREE.Mesh(this.buildGeometry(),this.material);
    this.mesh.frustumCulled=false;this.mesh.renderOrder=2;
    this.mesh.userData.shellLayers=SHELL_LAYERS;
  }
  buildGeometry() {
    const geometry=new THREE.InstancedBufferGeometry(),positions=[],normals=[],indices=[];
    const rows=64,columns=112;
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++) {
      const theta=Math.PI*y/rows,phi=Math.PI*2*x/columns;
      this.surface(theta,phi).toArray(positions,positions.length);
      this.normalAt(Math.min(Math.PI-.00001,Math.max(.00001,theta)),phi).toArray(normals,normals.length);
      if(y<rows&&x<columns){const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    // The parametric convention runs clockwise, so its usual quad order is
    // outward for all existing and extended bodies.
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('aLayer',new THREE.InstancedBufferAttribute(new Float32Array(shellLayers()),1));
    geometry.setIndex(indices);geometry.instanceCount=SHELL_LAYERS;return geometry;
  }
  updateParams(params) {
    for(const [uniform,key] of [['uLength','length'],['uCurl','curl'],['uMess','mess'],['uStiffness','stiffness']])this.uniforms[uniform].value=params[key];
    this.uniforms.uDensity.value=params.density/100;
    this.uniforms.uGroom.value=params.groom||0;this.uniforms.uWetness.value=params.wetness||0;
  }
  setViewport(){} // Coverage uses fragment derivatives rather than pixel size.
  setLighting(key,fill,rim) {
    this.uniforms.uKeyColor.value.copy(key.color).multiplyScalar(key.intensity*.25);
    this.uniforms.uFillColor.value.copy(fill.color).multiplyScalar(fill.intensity*.20);
    this.uniforms.uRimColor.value.copy(rim.color).multiplyScalar(rim.intensity*.25);
  }
  touch(point,direction,strength=1) {
    this.uniforms.uTouchCenter.value.copy(point);
    this.uniforms.uTouchBend.value.addScaledVector(direction,strength*3).clampLength(0,1.4);
  }
  reset() {
    this.position.fill(0);this.velocity.fill(0);this.accumulator=0;
    for(const name of ['uBend','uInertia','uTouchBend'])this.uniforms[name].value.set(0,0,0);
  }
  update(dt,time,params,wind,inertia,rotation) {
    const inverse=rotation.clone().invert();
    this.uniforms.uGravity.value.set(0,-params.gravity,0).applyQuaternion(inverse);
    this.uniforms.uInertia.value.copy(inertia).applyQuaternion(inverse);
    const force=new THREE.Vector3(wind*18*(1+.22*Math.sin(time*2.1)),wind*3*Math.sin(time*1.3),wind*7*Math.cos(time*.9)).applyQuaternion(inverse).toArray();
    this.accumulator=Math.min(this.accumulator+dt,.1);
    const k=stiffnessFor(params.length,params.stiffness);
    while(this.accumulator>=FIXED_STEP){stepSpring(this.position,this.velocity,force,k);this.accumulator-=FIXED_STEP;}
    this.uniforms.uBend.value.fromArray(this.position);
    this.uniforms.uTouchBend.value.multiplyScalar(Math.exp(-Math.max(0,dt)*4));
  }
  dispose(){this.mesh.geometry.dispose();this.material.dispose();this.volume.dispose();}
}
