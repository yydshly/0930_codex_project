import * as THREE from 'three';
import {rainCues} from './rain-cues.mjs';

export function createRainWorld(scene){
  const root=new THREE.Group();scene.add(root);root.visible=false;
  const waterMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},opening:{value:0},hits:{value:Array.from({length:8},()=>new THREE.Vector4(0,0,0,0))}},
    vertexShader:'varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader:`varying vec3 vWorld;uniform float time;uniform float opening;uniform vec4 hits[8];
      void main(){vec2 p=vWorld.xz;float waves=sin(p.x*3.+p.y*1.7+time*.5)*sin(p.y*2.5-time*.3);float rings=0.;
        for(int i=0;i<8;i++){vec4 h=hits[i];float d=length(p-h.xy);rings+=exp(-pow((d-h.z*1.35)*9.,2.))*h.w;}
        vec3 cold=mix(vec3(.027,.085,.13),vec3(.12,.26,.29),.5+.2*waves);
        float reflection=exp(-pow((p.x-1.3)/(1.+abs(p.y+10.)*.09),2.))*(1.-smoothstep(-14.,9.,p.y));
        float glint=pow(.5+.5*sin(p.y*13.+waves*2.),12.);
        vec3 c=cold+vec3(.18,.4,.48)*rings*.7+opening*reflection*(vec3(.45,.29,.12)+glint*vec3(.7,.52,.24));
        gl_FragColor=vec4(c,1.);}`});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(100,100),waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=-.04;root.add(water);
  const rainPositions=new Float32Array(650*6),rainGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xb2d4e7,transparent:true,opacity:.35,depthWrite:false}));root.add(rain);
  const clouds=[];
  for(let side of [-1,1]){const cloud=new THREE.Group();root.add(cloud);
    for(let i=0;i<8;i++){const puff=new THREE.Mesh(new THREE.SphereGeometry(1.7,16,12),new THREE.MeshStandardMaterial({color:0x405364,roughness:1,transparent:true,opacity:.92}));puff.position.set(side*(i*.85),Math.sin(i*2)*.45,-i*.35);puff.scale.set(1.6,.6,1);cloud.add(puff);}cloud.position.set(side*2,5.2,-9);clouds.push({cloud,side});
  }
  const sun=new THREE.Mesh(new THREE.SphereGeometry(1.6,32,24),new THREE.MeshBasicMaterial({color:0xffe3af}));sun.position.set(1.3,4.1,-15);root.add(sun);
  const light=new THREE.PointLight(0xffd5a0,0,35,2);light.position.set(1.3,5,-10);root.add(light);
  const umbrella=new THREE.Group();root.add(umbrella);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.95,8,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xe9be72,side:THREE.DoubleSide,roughness:.6,flatShading:true}));canopy.scale.y=.4;canopy.position.y=.35;umbrella.add(canopy);
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.3,8),new THREE.MeshStandardMaterial({color:0xa5b7bd,metalness:.5,roughness:.3}));stick.position.y=-.3;umbrella.add(stick);
  for(let i=0;i<8;i++){const points=[];for(let j=0;j<=12;j++){const t=j/12*Math.PI/2,a=i*Math.PI/4;points.push(new THREE.Vector3(Math.sin(t)*.96*Math.cos(a),.35+Math.cos(t)*.385,Math.sin(t)*.96*Math.sin(a)));}umbrella.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffe6a9})));}
  const reflectedLight=new THREE.Mesh(new THREE.CircleGeometry(.54,40),new THREE.MeshBasicMaterial({color:0xf2deaa,transparent:true,opacity:.28,depthWrite:false}));reflectedLight.rotation.x=-Math.PI/2;root.add(reflectedLight);
  const wake=[];
  for(let i=0;i<6;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,80),new THREE.MeshBasicMaterial({color:0xe9cd96,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;root.add(ring);wake.push(ring);}
  function update(active,beat,pose){
    root.visible=active;if(!active)return;const cues=rainCues(beat);
    waterMaterial.uniforms.time.value=beat;waterMaterial.uniforms.opening.value=cues.opening;
    waterMaterial.uniforms.hits.value.forEach((v,i)=>{const p=cues.impacts[i];v.set(p?.x??0,p?.z??0,p?.age??0,p?(1-p.age/3)*p.strength:0);});
    rain.visible=cues.rain>.005;rain.material.opacity=cues.rain*.38;
    for(let i=0;i<650;i++){const x=Math.sin(i*7.31)*14,z=Math.cos(i*3.13)*13,y=12-((beat*5+i*.71)%12);rainPositions.set([x,y,z,x-.09,y-.32,z+.02],i*6);}rainGeo.attributes.position.needsUpdate=true;
    clouds.forEach(({cloud,side})=>{cloud.position.x=side*(2+cues.opening*7);cloud.position.y=5.2+cues.opening;cloud.children.forEach(p=>p.material.color.setHex(cues.opening>.6?0x99aaa5:0x405364));});
    sun.visible=beat>=40;sun.scale.setScalar(.8+cues.opening*.2);light.intensity=cues.opening*18;
    umbrella.position.set(pose.x,pose.y+.75+cues.release*1.5,pose.z);umbrella.rotation.z=-.08+cues.release*.6;umbrella.scale.setScalar(1-cues.release*.9);umbrella.visible=beat<58;
    reflectedLight.position.set(pose.x,.01,pose.z);reflectedLight.scale.setScalar(1+cues.pulse*.4);reflectedLight.material.opacity=.2+cues.opening*.2;
    wake.forEach((ring,i)=>{const phase=(beat/4+i/6)%1;ring.position.set(pose.x,.015+i*.001,pose.z);ring.scale.setScalar(.7+phase*2.2);ring.material.opacity=(1-phase)*(.08+cues.pulse*.18)*(beat<64?1:.4);});
  }
  return {update};
}
