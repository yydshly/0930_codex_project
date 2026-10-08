/*! Koi anatomy animation adapted from Koi Pond Garden, ©2026 Sourany Phomhome.
 * MIT: web/upstream/KOI-LICENSE.txt. */
import * as THREE from 'three';
import {seeded} from './geometry.js';
import {koiBodyGeo,koiFinGeo,koiSection,KOI_EYE} from './koi-anatomy.js';
import {KOI_SPINE_GLSL} from './koi-motion.js';
const styles=[
 {name:'红白',base:'#ddd9ce',red:'#c84822',black:false},
 {name:'大正三色',base:'#ddd9ce',red:'#cb4c24',black:true},
 {name:'山吹黄金',base:'#d9a12f',red:null,black:false,gold:true},
 {name:'昭和三色',base:'#d5d0c5',red:'#ba3d20',black:true},
 {name:'丹顶',base:'#dedbd2',red:'#bf3927',black:false,tancho:true},
 {name:'白写',base:'#d7d4cc',red:null,black:true},
 {name:'浅黄',base:'#7e9198',red:'#bf623c',black:false,asagi:true}
];
let bodyGeo,finGeo;
const skinFunctions=`
float koiScale(vec2 uv){vec2 p=uv*vec2(42.,24.);float footprint=max(length(dFdx(p)),length(dFdy(p)));
 p.x+=mod(floor(p.y),2.)*.5;vec2 q=fract(p)-.5;float ellipse=length(q*vec2(1.,1.12)),edge=max(.06,min(.30,footprint*.5));
 float detail=(1.-smoothstep(.45-edge,.45+edge,ellipse))*smoothstep(-.5,.35,q.x);
 return mix(.35,detail,1.-smoothstep(.30,.90,footprint));}
float koiRelief(vec2 uv){return koiScale(uv)*.00016*smoothstep(.18,.26,uv.x)*(1.-smoothstep(.92,1.,uv.x));}
// UV.y wraps around the fish. Periodic row hashes keep the dorsal seam continuous.
float koiCellHash(vec2 cell){return fract(sin(dot(vec2(cell.x,mod(cell.y,24.)),vec2(127.1,311.7))+uSkinSeed*17.13)*43758.5453);}
float koiSurfaceCloud(vec2 uv){float a=uv.y*6.2831853;return .5+.25*sin(uv.x*17.+sin(a)*2.+uSkinSeed)+.25*cos(uv.x*31.-cos(a)*3.+uSkinSeed*.7);}
float koiScaleDetail(vec2 uv){
 vec2 p=uv*vec2(42.,24.);float footprint=max(length(dFdx(p)),length(dFdy(p)));
 p.x+=mod(floor(p.y),2.)*.5;vec2 cell=floor(p),q=fract(p)-.5;float seed=koiCellHash(cell);
 q.x+=.028*sin(mod(cell.y,24.)*1.9+uSkinSeed);float ellipse=length(q*vec2(1.,1.09+(seed-.5)*.10));
 float edge=clamp(footprint*.6,.065,.34),plate=(1.-smoothstep(.44-edge,.44+edge,ellipse))*smoothstep(-.49,.32,q.x);
 return mix(.35,plate*(.85+.30*seed),1.-smoothstep(.27,.88,footprint));
}
float koiSkinRelief(vec2 uv){
 float body=smoothstep(.18,.26,uv.x)*(1.-smoothstep(.92,1.,uv.x));
 // Pores vanish before they become subpixel; no unfiltered high-frequency bump noise.
 vec2 p=uv*vec2(151.,96.);float footprint=max(length(dFdx(p)),length(dFdy(p)));
 float pore=sin(p.x*6.2831853+uSkinSeed)*cos(p.y*6.2831853),fade=1.-smoothstep(.18,.60,footprint);
 return body*(koiScaleDetail(uv)*.00017+pore*.000012*fade);
}
`;
const finPoseGLSL=/* glsl */`
vec3 koiRotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
vec3 koiRotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
void koiPoseFin(vec3 p,vec3 n,out vec3 posed,out vec3 posedNormal){
 vec3 q=p-aPivot;float type=aFin.x,u=aFin.y;
 if(type>.5&&type<4.5){
  float side=(type<1.5||(type>2.5&&type<3.5))?1.:-1.,spread=clamp(uSpread,0.,1.);
  float fold=-side*(1.-spread)*(type<2.5?1.05:.60);
  q=koiRotY(q,fold);n=koiRotY(n,fold);
  float flap=side*(sin(uPhase*.60+side*.8)*.24*(.35+.65*spread)-.08);
  // Keep the preceding scene's flap direction; rotate its normal by the same angle.
  q=koiRotX(q,-flap);n=koiRotX(n,-flap);
  q.y+=sin(uPhase*.8+aFin.z*2.5)*.004*u;
 }else if(type>5.5){q.z+=sin(uPhase-1.1-u*2.4)*(uAmp*.45+.004)*u;}
 else{q.z+=sin(uPhase*.9-aFin.z*5.)*.006*u;if(type<.5){q.x-=u*.065*uFold;q.y-=u*.067*uFold;}}
 posed=aPivot+q;posedNormal=n;
 // Paired-fin rotations and the following spine shear use transformed normals.
 // Small membrane ripples and dorsal folding retain an approximate rest normal.
}
`;
function patternTexture(style,index){const random=seeded(800+index*171),canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 c.fillStyle=style.base;c.fillRect(0,0,W,H);
 const patch=(cx,cy,rx,ry,color)=>{const points=Array.from({length:24},(_,j)=>{const a=j/24*Math.PI*2,r=.80+random()*.32;return [cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r];});
  for(const wrap of [-H,0,H]){const mid=(a,b)=>[(a[0]+b[0])*.5,(a[1]+b[1])*.5+wrap];c.beginPath();c.moveTo(...mid(points.at(-1),points[0]));
   for(let j=0;j<points.length;j++){const p=points[j],end=mid(p,points[(j+1)%points.length]);c.quadraticCurveTo(p[0],p[1]+wrap,...end);}c.closePath();c.fillStyle=color;c.fill();}};
 if(style.tancho)patch(W*.072,0,W*.045,H*.095,style.red);
 else if(style.red){for(let k=0;k<3;k++){const u=.085+k*.27+random()*.075;patch(u*W,style.asagi?H*.22:0,W*(.09+random()*.055),H*(style.asagi?.065:.18+random()*.06),style.red);
   if(!style.asagi)patch((u+.025)*W,H*.93,W*.115,H*.12,style.red);}}
 if(style.black)for(let k=0;k<7;k++)patch(W*(.14+random()*.68),H*(random()<.5?.08:.9),W*(.025+random()*.055),H*(.025+random()*.09),'#202524');
 const pixels=c.getImageData(0,0,W,H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4,v=y/H,belly=Math.exp(-(((v-.5)/.16)**2)),tone=.975+random()*.045;
  for(let q=0;q<3;q++)pixels.data[k+q]=pixels.data[k+q]*tone*(1-belly*.18)+[224,216,199][q]*belly*.18;}
 c.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return texture;
}
function bodyMaterial(style,index,state){const m=new THREE.MeshPhysicalMaterial({map:patternTexture(style,index),roughness:.48,metalness:style.gold?.10:0,clearcoat:.18,clearcoatRoughness:.30,specularIntensity:.7});
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,state);s.vertexShader='attribute float aLip;uniform float uMouth;uniform float uGill;varying float vMouthIn;varying vec2 vKoiUv;\n'+KOI_SPINE_GLSL+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   objectNormal=koiSpineNormal(objectNormal,position.x);`);
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vMouthIn=step(1.5,aLip);vKoiUv=uv;float open=.055+.945*uMouth;
   if(aLip>.25){vec2 mc=vec2(-.004,0.);if(aLip>.75)transformed.yz=mc+(transformed.yz-mc)*open;
    else transformed.yz=mc+(transformed.yz-mc)*(1.+.3*open);transformed.x+=.022*open*(aLip>.75?1.:.6);}
   float gill=exp(-pow(((.5-position.x)-.19)/.03,2.))*step(position.y,.035);transformed.yz*=1.+gill*.018*uGill;
   transformed.z+=koiSpineOffset(transformed.x);`);
  s.fragmentShader='varying float vMouthIn;varying vec2 vKoiUv;uniform float uSurfaceDetail;uniform float uSkinSeed;uniform float uGold;\n'+skinFunctions+'\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float scales=smoothstep(.18,.26,vKoiUv.x),scale=koiScale(vKoiUv);
   float detail=clamp(uSurfaceDetail,0.,1.),detailScale=koiScaleDetail(vKoiUv),cloud=koiSurfaceCloud(vKoiUv);
   float oldTone=1.-scales*(1.-scale)*.065,newTone=(1.-scales*(1.-detailScale)*.040)*(1.+(cloud-.5)*.055*scales);
   diffuseColor.rgb*=mix(oldTone,newTone,detail);
   float a=vKoiUv.y*6.2831853,side=1.-smoothstep(.18,.65,abs(cos(a)));
   float slit=exp(-pow((vKoiUv.x-(.212-.016*cos(a)))/.0028,2.));diffuseColor.rgb*=1.-slit*side*.42;
   float nos=min(length(vec2((vKoiUv.x-.047)/.006,(a-.62)/.08)),length(vec2((vKoiUv.x-.047)/.006,(a-5.66)/.08)));
   diffuseColor.rgb*=1.-(1.-smoothstep(.5,1.,nos))*.4;
   diffuseColor.rgb*=mix(vec3(1.),vec3(1.,.90,.85),(1.-smoothstep(0.,.025,vKoiUv.x))*.6);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.072,.024,.020),vMouthIn);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float h=mix(koiRelief(vKoiUv),koiSkinRelief(vKoiUv),clamp(uSurfaceDetail,0.,1.));vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
   normal=normalize(abs(det)*normal-sign(det)*(dFdx(h)*r1+dFdy(h)*r2));`);
  s.fragmentShader=s.fragmentShader.replace('#include <clearcoat_normal_fragment_begin>',`#include <clearcoat_normal_fragment_begin>
   #ifdef USE_CLEARCOAT
    // The wet layer smooths, but does not completely erase, body-scale relief.
    if(uSurfaceDetail>0.)clearcoatNormal=normalize(mix(clearcoatNormal,normal,.45*clamp(uSurfaceDetail,0.,1.)*scales));
   #endif`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float roughBody=smoothstep(.12,.24,vKoiUv.x),roughCloud=koiSurfaceCloud(vKoiUv),roughScale=koiScaleDetail(vKoiUv);
   float originalRough=mix(.30,.40+.10*(1.-koiScale(vKoiUv)),roughBody);
   float skinRough=mix(.30+.045*roughCloud,.38+.12*(1.-roughScale)+.07*roughCloud,roughBody);
   skinRough=mix(skinRough,mix(.275,.31+.10*(1.-roughScale)+.04*roughCloud,roughBody),uGold);
   roughnessFactor=mix(originalRough,skinRough,clamp(uSurfaceDetail,0.,1.));`);
  s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
   metalnessFactor=mix(metalnessFactor,uGold*(.14+.07*koiScaleDetail(vKoiUv)),clamp(uSurfaceDetail,0.,1.));`);
  s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
   #ifdef USE_CLEARCOAT
    float wetHead=1.-smoothstep(.12,.26,vKoiUv.x),wetCloud=koiSurfaceCloud(vKoiUv);
    material.clearcoat=mix(material.clearcoat,.08+.07*wetHead+.03*wetCloud,clamp(uSurfaceDetail,0.,1.));
    material.clearcoatRoughness=mix(material.clearcoatRoughness,min(1.,.36-.045*wetHead+.035*wetCloud+geometryRoughness),clamp(uSurfaceDetail,0.,1.));
   #endif`);
 };m.customProgramCacheKey=()=> 'koi-body-v11';return m;}
function finMaterial(style,state){const m=new THREE.MeshPhysicalMaterial({color:style.gold?'#d8b766':'#d2cebc',roughness:.48,clearcoat:.08,side:THREE.DoubleSide,transparent:true,opacity:.77,depthWrite:false});
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,state);s.vertexShader='attribute vec4 aFin;attribute vec3 aPivot;uniform float uFold;uniform float uSpread;varying vec2 vFinUv;\n'+KOI_SPINE_GLSL+finPoseGLSL+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   {vec3 posed,posedNormal;koiPoseFin(position,objectNormal,posed,posedNormal);objectNormal=koiSpineNormal(mix(objectNormal,posedNormal,clamp(uNormalCorrection,0.,1.)),posed.x);}`);
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vFinUv=uv;vec3 posed,unusedNormal;koiPoseFin(transformed,normal,posed,unusedNormal);
   transformed=posed;transformed.z+=koiSpineOffset(transformed.x);`);
  s.fragmentShader='varying vec2 vFinUv;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float phase=vFinUv.y*100.,ray=pow(.5+.5*cos(phase),10.);
   ray=mix(ray,.1762,smoothstep(.65,3.14159,fwidth(phase)));diffuseColor.rgb*=.89+.11*ray;
   diffuseColor.a*=mix(.96,.50,smoothstep(.65,1.,vFinUv.x));`);
 };m.customProgramCacheKey=()=> 'koi-fins-v8';return m;}
export function createKoi(index){bodyGeo??=koiBodyGeo();finGeo??=koiFinGeo();const style=styles[index%styles.length],group=new THREE.Group(),state={uMouth:{value:.03},uGill:{value:0},uPhase:{value:index},uAmp:{value:.04},uBend:{value:0},uSpread:{value:1},uFold:{value:0},uNormalCorrection:{value:1},uSurfaceDetail:{value:1},uSkinSeed:{value:index*.739+1.37},uGold:{value:style.gold?1:0}};
 const body=new THREE.Mesh(bodyGeo,bodyMaterial(style,index,state));body.castShadow=false;body.receiveShadow=true;body.name='koi-body-with-mouth';group.add(body);
 const fins=new THREE.Mesh(finGeo,finMaterial(style,state));fins.castShadow=false;fins.name='koi-seven-fins';group.add(fins);
 const eyes=[];for(const side of [-1,1]){const [y,z]=koiSection(KOI_EYE.s,Math.PI/2-.42),eye=new THREE.Group();eye.position.set(.5-KOI_EYE.s,y+.002,side*(Math.abs(z)-.006));
  const outward=new THREE.Vector3(.2,.34,side).normalize();eye.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),outward);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(.014,20,16),new THREE.MeshPhysicalMaterial({color:'#735f30',roughness:.3,clearcoat:.6}));globe.scale.z=.53;eye.add(globe);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.0081,16,12),new THREE.MeshPhysicalMaterial({color:'#101812',roughness:.13,clearcoat:.8}));pupil.position.z=.005;pupil.scale.set(.88,1,.43);eye.add(pupil);group.add(eye);eyes.push(eye);}
 return {group,body,fins,eyes,state,style:style.name,mouthOpen:.03,consumed:0,pitch:0};
}
