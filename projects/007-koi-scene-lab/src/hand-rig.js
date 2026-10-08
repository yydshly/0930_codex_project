/*! Hand mesh derived from @webxr-input-profiles/assets 1.0.20.
 * Copyright (c) 2019 Amazon. MIT: web/assets/HAND-LICENSE.txt.
 * Sleeve construction adapted from Koi Pond Garden, © 2026 Sourany Phomhome.
 * MIT: web/upstream/KOI-LICENSE.txt. */
import * as THREE from 'three';
import topology from './hand-topology.json';
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const skinNoise=`
float handHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float handNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(handHash(i),handHash(i+vec3(1,0,0)),f.x),mix(handHash(i+vec3(0,1,0)),handHash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(handHash(i+vec3(0,0,1)),handHash(i+vec3(1,0,1)),f.x),mix(handHash(i+vec3(0,1,1)),handHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float crease(float x,float center,float width){return exp(-pow((x-center)/width,2.));}
vec3 handTex(vec3 p){vec3 w=pow(abs(vHandRestNormal),vec3(6.));w/=max(dot(w,vec3(1.)),.0001);
 return texture2D(uHandSkin,p.yz*16.6667).rgb*w.x+texture2D(uHandSkin,p.xz*16.6667).rgb*w.y+texture2D(uHandSkin,p.xy*16.6667).rgb*w.z;}
float handHeight(vec3 p){float h=(handNoise(p*1300.)-.5)*.000022+(dot(handTex(p),vec3(.2126,.7152,.0722))-.4)*.00005;
 float front=smoothstep(.060,.085,p.x),back=smoothstep(-.003,.004,p.y);
 float joint=crease(p.x,.134,.0011)+crease(p.x,.158,.0009)+crease(p.x,.127,.0010)+crease(p.x,.108,.0011);
 h-=joint*.00007*front*(.35+.65*back);
 // Three wrist folds and shallow palm creases.
 float palm=1.-back;
 h-=palm*.00009*(crease(p.x,-.005,.0012)+crease(p.x,.004,.0010)+crease(p.x,.012,.0012));
 h-=palm*smoothstep(.015,.025,p.x)*(1.-smoothstep(.082,.095,p.x))*.00010*(crease(p.z,.008+sin(p.x*32.)*.018,.0012)+crease(p.x,.065+p.z*.28,.0010));
 return h;}`;
function skinMaterial(){const texture=new THREE.TextureLoader().load('./assets/hand-skin-albedo-v3.png');texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
 const wet={value:0},m=new THREE.MeshPhysicalMaterial({color:'#c4967d',roughness:.66,metalness:0,clearcoat:.025,clearcoatRoughness:.6,sheen:.07,sheenColor:new THREE.Color('#d9a095'),sheenRoughness:.8,specularIntensity:.55});
 m.onBeforeCompile=s=>{s.uniforms.uHandWet=wet;s.uniforms.uHandSkin={value:texture};s.vertexShader='varying vec3 vHandRest;varying vec3 vHandRestNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHandRest=position;vHandRestNormal=normal;');
  s.fragmentShader='varying vec3 vHandRest;varying vec3 vHandRestNormal;uniform float uHandWet;uniform sampler2D uHandSkin;\n'+skinNoise+'\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 hp=vHandRest;float mott=handNoise(hp*160.)*.5+handNoise(hp*490.)*.5;
    diffuseColor.rgb*=mix(vec3(1.),clamp(handTex(hp)/vec3(.63,.37,.24),vec3(.65),vec3(1.35)),.55);
    float flush=smoothstep(.08,.17,hp.x)*.055+exp(-pow((hp.x-.09)/.013,2.))*.055;
    diffuseColor.rgb*=vec3(1.+flush,(.97-flush*.32),(.94-flush*.20))*(.94+mott*.12);
    float vein=exp(-pow((hp.z-(-.018+sin(hp.x*27.)*.004))/.0015,2.))*smoothstep(-.18,-.08,hp.x)*(1.-smoothstep(.042,.060,hp.x))*smoothstep(.001,.006,hp.y);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.91,.96,.95),vein*.23);
    diffuseColor.rgb*=1.-uHandWet*.035;`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=mix(.66,.43,uHandWet)+(.5-handNoise(vHandRest*750.))*.08;`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float bump=handHeight(vHandRest);vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
    vec3 r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
    normal=normalize(abs(det)*normal-sign(det)*(dFdx(bump)*r1+dFdy(bump)*r2));`);
  s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>',`// A small warm wrap approximates skin transmission; not a diffusion solver.
    float rim=pow(1.-max(dot(normal,normalize(vViewPosition)),0.),3.);
    gl_FragColor.rgb+=diffuseColor.rgb*vec3(.08,.018,.009)*rim;
    #include <dithering_fragment>`);
 };m.customProgramCacheKey=()=> 'hand-skin-v3-textured';m.userData.wet=wet;m.userData.skinTexture=texture;return m;}
function linenMaterial(){const m=new THREE.MeshPhysicalMaterial({color:'#43565e',roughness:.96,sheen:.5,sheenColor:new THREE.Color('#83908b'),sheenRoughness:.9});
 m.onBeforeCompile=s=>{s.vertexShader='varying vec3 vCloth;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCloth=position;');
  s.fragmentShader='varying vec3 vCloth;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float weave=sin(vCloth.x*1600.)*sin(vCloth.y*1500.+vCloth.z*1700.);diffuseColor.rgb*=.95+.05*weave;`);};return m;}
export function createHandRig(){const root=new THREE.Group();root.userData.dynamicGeometry=true;root.visible=false;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(topology.position,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(topology.skinIndex,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(topology.skinWeight,4));geometry.setIndex(topology.index);geometry.computeVertexNormals();
 const bones=topology.bones.map(d=>{const b=new THREE.Bone();b.name=d.name;return b;});const forearm=new THREE.Bone();forearm.name='forearm';bones.push(forearm);
 const rest=topology.bones.map(d=>new THREE.Matrix4().compose(new THREE.Vector3(...d.position),new THREE.Quaternion(...d.quaternion),new THREE.Vector3(1,1,1)));
 rest.push(new THREE.Matrix4());
 const names=new Map(bones.map((b,i)=>[b.name,i])),parents=[];
 for(let i=0;i<25;i++){const name=bones[i].name;let parent;
  if(name==='wrist')parent=25;else if(name.endsWith('metacarpal'))parent=0;
  else if(name.endsWith('proximal'))parent=names.get(name.replace('phalanx-proximal','metacarpal'));
  else if(name.endsWith('intermediate'))parent=names.get(name.replace('intermediate','proximal'));
  else if(name.endsWith('distal'))parent=names.get(name.replace('distal',name.startsWith('thumb')?'proximal':'intermediate'));
  else parent=names.get(name.replace('tip','phalanx-distal'));
  parents[i]=parent;const local=rest[parent].clone().invert().multiply(rest[i]);local.decompose(bones[i].position,bones[i].quaternion,bones[i].scale);bones[parent].add(bones[i]);
  bones[i].userData.restQ=bones[i].quaternion.clone();bones[i].userData.restWorldQ=new THREE.Quaternion().setFromRotationMatrix(rest[i]);
 }
 const material=skinMaterial(),hand=new THREE.SkinnedMesh(geometry,material);hand.add(forearm);hand.bind(new THREE.Skeleton(bones));hand.castShadow=hand.receiveShadow=true;hand.frustumCulled=false;root.add(hand);
 const J={},tips={};for(const f of ['thumb','index','middle','ring','pinky']){const prefix=f==='thumb'?'thumb':f+'-finger';
  J[f]=[bones[names.get(prefix+'-metacarpal')],bones[names.get(prefix+'-phalanx-proximal')],...(f==='thumb'?[]:[bones[names.get(prefix+'-phalanx-intermediate')]]),bones[names.get(prefix+'-phalanx-distal')]];tips[f]=bones[names.get(prefix+'-tip')];}
 const rig={root,J,tips,bones,mesh:hand,palm:bones[0],material,rest,wet:0,pinchGap:1};
 // Sample the lower palm for surface contact. These remain skinned mesh vertices.
 const pos=geometry.attributes.position,norm=geometry.attributes.normal,candidates=[];
 for(let i=0;i<pos.count;i++)if(pos.getX(i)>.015&&pos.getX(i)<.083&&Math.abs(pos.getZ(i))<.025&&norm.getY(i)<-.35)candidates.push(i);
 rig.palmSamples=candidates.filter((_,i)=>i%Math.max(1,Math.ceil(candidates.length/64))===0);
 addPads(rig);addNails(rig);addSleeve(root);return rig;
}
function addPads(rig){const source=new THREE.Mesh(rig.mesh.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();source.updateMatrixWorld(true);rig.pads={};
 for(const [name,chain]of Object.entries(rig.J)){const distal=chain.at(-1),di=rig.bones.indexOf(distal),ti=rig.bones.indexOf(rig.tips[name]),a=new THREE.Vector3().setFromMatrixPosition(rig.rest[di]),b=new THREE.Vector3().setFromMatrixPosition(rig.rest[ti]),along=b.clone().sub(a).normalize();
  const up=new THREE.Vector3(0,1,0).addScaledVector(along,-along.y).normalize(),p=a.clone().lerp(b,.73);ray.set(p.clone().addScaledVector(up,-.035),up);const hit=ray.intersectObject(source)[0];
  if(hit)p.copy(hit.point).addScaledVector(up,-.0001);else p.addScaledVector(up,-.005);
  const pad=new THREE.Object3D();pad.name=name+'-contact-pad';pad.position.copy(p.applyMatrix4(rig.rest[di].clone().invert()));distal.add(pad);rig.pads[name]=pad;
 }source.material.dispose();}
function addNails(rig){const source=new THREE.Mesh(rig.mesh.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster(),mat=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.38,clearcoat:.25,clearcoatRoughness:.32,specularIntensity:.65});source.updateMatrixWorld(true);rig.nails=[];
 const pa=source.geometry.attributes.position,si=source.geometry.attributes.skinIndex,sw=source.geometry.attributes.skinWeight;
 for(const [name,chain]of Object.entries(rig.J)){const distal=chain.at(-1),di=rig.bones.indexOf(distal),ti=rig.bones.indexOf(rig.tips[name]),a=new THREE.Vector3().setFromMatrixPosition(rig.rest[di]),b=new THREE.Vector3().setFromMatrixPosition(rig.rest[ti]),along=b.clone().sub(a).normalize();
  const up=new THREE.Vector3(0,1,0).addScaledVector(along,-along.y).normalize(),across=new THREE.Vector3().crossVectors(along,up);const length=a.distanceTo(b)*1.08,width=name==='thumb'?.0062:name==='pinky'?.0038:.0047;
  const center=a.clone().lerp(b,.48),position=[],colors=[],uv=[],index=[],skinIndex=[],skinWeight=[],rows=12,cols=10;
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const u=i/rows,v=j/cols*2-1,w=width*(.65+.35*Math.sin(u*Math.PI));const p=center.clone().addScaledVector(along,(u-.5)*length).addScaledVector(across,v*w);
    ray.set(p.clone().addScaledVector(up,.035),up.clone().negate());const hit=ray.intersectObject(source)[0],weights={};
    if(hit){p.copy(hit.point).addScaledVector(up,.00035);
     const ids=[hit.face.a,hit.face.b,hit.face.c],pts=ids.map(id=>new THREE.Vector3().fromBufferAttribute(pa,id)),bc=THREE.Triangle.getBarycoord(hit.point,...pts,new THREE.Vector3()).toArray();
     ids.forEach((id,k)=>{for(let q=0;q<4;q++){const bone=si.array[id*4+q],weight=sw.array[id*4+q]*bc[k];weights[bone]=(weights[bone]||0)+weight;}});
    }else{p.addScaledVector(up,.0055);weights[di]=1;}
    // Share the surface weights: a rigid plate can sink into skin when joints bend.
    const top=Object.entries(weights).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((a,[,v])=>a+v,0);
    for(let q=0;q<4;q++){skinIndex.push(q<top.length?Number(top[q][0]):0);skinWeight.push(q<top.length?top[q][1]/sum:0);}
    position.push(...p.toArray());const lun=(1-THREE.MathUtils.smoothstep(u,0,.22))*.25,free=THREE.MathUtils.smoothstep(u,.91,1)*.18;
    const color=new THREE.Color().setRGB(.53+lun*.12+free*.16,.31+lun*.18+free*.21,.27+lun*.17+free*.20);colors.push(color.r,color.g,color.b);uv.push(u,v*.5+.5);
  }
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;index.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));g.setIndex(index);g.computeVertexNormals();
  const nail=new THREE.SkinnedMesh(g,mat);nail.bind(rig.mesh.skeleton,rig.mesh.bindMatrix);nail.castShadow=true;nail.frustumCulled=false;rig.root.add(nail);rig.nails.push(nail);
 }source.material.dispose();}
function addSleeve(root){const material=linenMaterial(),rings=26,segments=48,position=[],uv=[],index=[];
 for(let i=0;i<=rings;i++){const t=i/rings,x=-.20-t*.49,ry=.034+t*.020,rz=.050+t*.029;
  for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,wrinkle=Math.sin(a*5+x*47)*.0018+Math.sin(a*9-x*22)*.0009;
   position.push(x,-.006+Math.cos(a)*(ry+wrinkle),Math.sin(a)*(rz+wrinkle));uv.push(t,j/segments);}}
 for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;index.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();const sleeve=new THREE.Mesh(g,material);sleeve.castShadow=sleeve.receiveShadow=true;root.add(sleeve);
 const cuff=new THREE.Mesh(new THREE.TorusGeometry(.034,.0035,12,64),material);cuff.rotation.y=Math.PI/2;cuff.scale.set(1.5,1,1);cuff.position.set(-.202,-.006,0);cuff.castShadow=true;root.add(cuff);
 // A stitched cuff seam follows the ellipse, with no rigid metallic ring.
 const stitches=[];for(let i=0;i<80;i++){const a=i/80*Math.PI*2,b=a+.026;stitches.push(-.208,-.006+Math.cos(a)*.034,Math.sin(a)*.051,-.208,-.006+Math.cos(b)*.034,Math.sin(b)*.051);}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(stitches,3));root.add(new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:'#7b8d89'})));
}
const zAxis=new THREE.Vector3(0,0,1),yAxis=new THREE.Vector3(0,1,0),q=new THREE.Quaternion();
function rotateRest(b,axis,angle){const local=axis.clone().applyQuaternion(b.userData.restWorldQ.clone().invert());b.quaternion.copy(b.userData.restQ).multiply(q.setFromAxisAngle(local,angle));}
function resetPose(rig){for(const b of rig.bones)if(b.userData.restQ)b.quaternion.copy(b.userData.restQ);}
function fingerCurl(rig,name,angles,splay=0){const chain=rig.J[name];chain.forEach((b,i)=>rotateRest(b,zAxis,-angles[i]));if(splay){const b=chain[0],axis=yAxis.clone().applyQuaternion(b.userData.restWorldQ.clone().invert());b.quaternion.multiply(q.setFromAxisAngle(axis,splay));}}
export function solveTip(rig,name,target,iterations=7,strength=1,usePad=false){const chain=rig.J[name],tip=usePad?rig.pads[name]:rig.tips[name];rig.root.updateMatrixWorld(true);const worldTarget=target.clone().applyMatrix4(rig.root.matrixWorld);
 for(let pass=0;pass<iterations;pass++)for(let i=chain.length-1;i>=0;i--){const b=chain[i],p=b.getWorldPosition(new THREE.Vector3()),from=tip.getWorldPosition(new THREE.Vector3()).sub(p).normalize(),to=worldTarget.clone().sub(p).normalize();
  const delta=new THREE.Quaternion().setFromUnitVectors(from,to),angle=2*Math.acos(clamp(delta.w,-1,1));if(angle<.0001)continue;
  delta.slerp(new THREE.Quaternion(),1-Math.min(1,.14/angle)*strength);const world=delta.multiply(b.getWorldQuaternion(new THREE.Quaternion()));const parent=b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();b.quaternion.copy(parent.multiply(world));rig.root.updateMatrixWorld(true);
 }
}
export function poseHand(rig,pinch,rub,t){resetPose(rig);const breath=Math.sin(t*1.6)*.006;
 fingerCurl(rig,'index',[.015,.32+pinch*.10,.25+pinch*.22,.08+pinch*.18],-.012);
 fingerCurl(rig,'middle',[.010,.25,.28,.14],.015);fingerCurl(rig,'ring',[.015,.30,.33,.15],.030);fingerCurl(rig,'pinky',[.015,.38,.40,.20],.045);
 fingerCurl(rig,'thumb',[-.06,.04,.08]);const thumb=rig.J.thumb[0],axis=yAxis.clone().applyQuaternion(thumb.userData.restWorldQ.clone().invert());thumb.quaternion.multiply(q.setFromAxisAngle(axis,-.50*pinch));
 const along=new THREE.Vector3().setFromMatrixPosition(rig.rest[rig.bones.indexOf(rig.tips.thumb)]).sub(new THREE.Vector3().setFromMatrixPosition(rig.rest[rig.bones.indexOf(thumb)])).normalize().applyQuaternion(thumb.userData.restWorldQ.clone().invert());
 thumb.quaternion.multiply(q.setFromAxisAngle(along,1.85*pinch));rotateRest(rig.palm,zAxis,breath-.018);rig.root.updateMatrixWorld(true);
 if(pinch>.10){const center=new THREE.Vector3(.113,-.028,-.045),offset=Math.sin(t*11)*rub*.0008,normal=new THREE.Vector3(.32,.9,-.25).normalize(),gap=.008+(1-pinch)*.046;
  solveTip(rig,'index',center.clone().addScaledVector(normal,gap*.5+offset),12,1,true);
  solveTip(rig,'thumb',center.clone().addScaledVector(normal,-gap*.5),12,1,true);
 }
 rig.root.updateMatrixWorld(true);rig.pinchGap=rig.pads.index.getWorldPosition(new THREE.Vector3()).distanceTo(rig.pads.thumb.getWorldPosition(new THREE.Vector3()));
}
export function poseHandFlat(rig,k,t){resetPose(rig);const br=Math.sin(t*1.6)*.010;
 fingerCurl(rig,'index',[.005,.035+br,.05,.03],-.018);fingerCurl(rig,'middle',[.0,.025,.035,.022]);fingerCurl(rig,'ring',[.008,.045-br,.06,.035],.015);fingerCurl(rig,'pinky',[.02,.09,.11,.06],.03);
 fingerCurl(rig,'thumb',[-.04,.05,.09]);rotateRest(rig.palm,zAxis,-.025+br);rig.root.updateMatrixWorld(true);
}
export function setHandWet(rig,wet,dt){rig.wet=THREE.MathUtils.damp(rig.wet,wet,4,dt);rig.material.userData.wet.value=rig.wet;}
export function fingertip(rig,name='index'){rig.root.updateMatrixWorld(true);return rig.tips[name].getWorldPosition(new THREE.Vector3());}
export function padPoint(rig,name='index'){rig.root.updateMatrixWorld(true);return rig.pads[name].getWorldPosition(new THREE.Vector3());}
