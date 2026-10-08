import * as THREE from 'three';
import {SDFK as S,surfaceNets} from './sdf.js';

// Dimensions are metres. Field unions make the rib cage, shoulders and
// haunches continuous; the neck/head overlaps the shoulder at its joint.
export function catTorsoGeometry(){
 const field=p=>{
  let d=S.ellipsoid(p,[0,.255,0],[.215,.081,.068]);
  d=S.smin(d,S.ellipsoid(p,[-.155,.255,0],[.093,.097,.078]),.032);
  d=S.smin(d,S.ellipsoid(p,[.125,.28,0],[.079,.087,.068]),.025);
  d=S.smin(d,S.cone(p,[.145,.278,0],[.195,.333,0],.057,.049),.025);
  return d;
 };
 return surfaceNets(field,[-.29,.13,-.115],[.25,.4,.115],.005);
}
export function catHeadGeometry(){
 const field=p=>{
  let d=S.cone(p,[-.025,-.015,0],[.054,.065,0],.047,.046);
  d=S.smin(d,S.ellipsoid(p,[.075,.065,0],[.068,.055,.049]),.018);
  d=S.smin(d,S.ellipsoid(p,[.121,.039,0],[.040,.028,.033]),.014);
  for(const side of [-1,1]){
   d=S.smin(d,S.ellipsoid(p,[.142,.041,side*.017],[.028,.020,.023]),.010);
   d=S.smax(d,-S.ellipsoid(p,[.114,.077,side*.042],[.019,.014,.012]),.004);
  }
  d=S.smin(d,S.ellipsoid(p,[.132,.024,0],[.031,.014,.030]),.008);
  return d;
 };
 return surfaceNets(field,[-.085,-.075,-.075],[.185,.14,.075],.003);
}
export function catLegGeometry(length,upper,hind){
 const top=upper?(hind?.041:.031):.020,bottom=upper?.021:.012;
 const field=p=>S.cone(p,[0,.008,0],[0,-length,0],top,bottom);
 return surfaceNets(field,[-top-.012,-length-bottom-.012,-top-.012],[top+.012,top+.02,top+.012],.0035);
}
export function catPawGeometry(){
 const field=p=>{
  let d=S.ellipsoid(p,[.002,.019,0],[.034,.018,.024]);
  for(const z of [-.016,0,.016])d=S.smin(d,S.ellipsoid(p,[.023,.014,z],[.019,.013,.010]),.006);
  return d;
 };
 return surfaceNets(field,[-.045,-.01,-.039],[.057,.052,.039],.0025);
}
export function catCoatMaterial(kind='torso'){
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.91});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vCatSurface;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCatSurface=position;');
  shader.fragmentShader=`varying vec3 vCatSurface;
    float catHash(vec3 p){return fract(sin(dot(p,vec3(17.13,39.79,63.31)))*43758.5453);}
    float catNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(catHash(i),catHash(i+vec3(1,0,0)),f.x),mix(catHash(i+vec3(0,1,0)),catHash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(catHash(i+vec3(0,0,1)),catHash(i+vec3(1,0,1)),f.x),mix(catHash(i+vec3(0,1,1)),catHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `+shader.fragmentShader;
  const stripe=kind==='torso'?'vCatSurface.x*119.+vCatSurface.y*9.+abs(vCatSurface.z)*15.':kind==='head'?'vCatSurface.z*186.+vCatSurface.x*20.':'vCatSurface.y*136.+vCatSurface.x*17.';
  const underside=kind==='torso'?'1.-smoothstep(.17,.23,vCatSurface.y)':kind==='head'?'1.-smoothstep(.014,.045,vCatSurface.y)':'0.';
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float mottling=catNoise(vCatSurface*vec3(34.,51.,44.));
    float phase=${stripe}+mottling*3.1+sin(vCatSurface.y*57.+vCatSurface.z*31.)*.7;
    float filterWidth=max(fwidth(phase),.035);
    float stripe=smoothstep(.57-filterWidth*.35,.88+filterWidth*.35,sin(phase));
    stripe=mix(stripe,.18,smoothstep(.7,2.2,filterWidth));
    stripe*=mix(.48,1.,catNoise(vCatSurface*vec3(12.,61.,30.)));
    vec3 base=mix(vec3(.37,.305,.235),vec3(.47,.395,.31),mottling);
    vec3 coat=mix(base,base*.46,stripe);
    coat=mix(coat,vec3(.63,.58,.48),(${underside})*.52);
    vec3 furP=vCatSurface*vec3(2100.,660.,850.);
    float footprint=max(length(dFdx(furP)),length(dFdy(furP)));
    float grain=mix(catNoise(furP),.5,smoothstep(.45,1.5,footprint));
    diffuseColor.rgb*=coat*(.96+grain*.08);`);
 };
 material.customProgramCacheKey=()=>`courtyard-tabby-${kind}-v20`;
 return material;
}

// One watertight tapered tube, bound once. Animation moves the bone chain,
// so the existing render interpolation can restore the exact simulated pose.
export function catTail(material){
 const length=.36,boneCount=9,rings=33,sides=10,positions=[],indices=[],skinIndices=[],weights=[];
 for(let ring=0;ring<rings;ring++){
  const t=ring/(rings-1),radius=.020*(1-t*.88),bone=t*(boneCount-1),a=Math.min(boneCount-2,Math.floor(bone)),w=bone-a;
  for(let side=0;side<sides;side++){
   const angle=side/sides*Math.PI*2;
   positions.push(-t*length,Math.cos(angle)*radius,Math.sin(angle)*radius);
   skinIndices.push(a,a+1,0,0);weights.push(1-w,w,0,0);
  }
 }
 for(let ring=0;ring<rings-1;ring++)for(let side=0;side<sides;side++){
  const a=ring*sides+side,b=ring*sides+(side+1)%sides,c=b+sides,d=a+sides;
  indices.push(a,c,b,a,d,c);
 }
 for(const end of [0,1]){
  const center=positions.length/3,ring=end?(rings-1)*sides:0;
  positions.push(end?-length:0,0,0);skinIndices.push(end?boneCount-1:0,0,0,0);weights.push(1,0,0,0);
  for(let side=0;side<sides;side++){const a=ring+side,b=ring+(side+1)%sides;if(end)indices.push(center,b,a);else indices.push(center,a,b);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.SkinnedMesh(geometry,material),bones=[];
 for(let i=0;i<boneCount;i++){const bone=new THREE.Bone();bone.name=`cat-tail-${i}`;if(i){bone.position.x=-length/(boneCount-1);bones[i-1].add(bone);}bones.push(bone);}
 mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
 return {mesh,bones};
}
