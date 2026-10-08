import * as THREE from 'three';
import { seeded, mesh } from './geometry.js';
import { isInPond, pondBoundary } from './config.js';
export class KoiSchool {
  constructor(scene, water) {
    this.group = new THREE.Group(); scene.add(this.group);this.water=water;this.fish=[];this.feedUntil=0;this.feedPoint=new THREE.Vector3();this.strokeTarget=null;
    const random=seeded(51);
    for(let i=0;i<20;i++) {
      const group = new THREE.Group(),size=.52+random()*.3, phase={value:random()*6.28},amp={value:.05};
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');
      c.fillStyle=i%5===4?'#e9ac4f':'#f1eee3';c.fillRect(0,0,256,128);
      for(let k=0;k<5;k++) {c.fillStyle=k===4&&i%3===0?'#222822':'#ef642c';
        c.beginPath();c.ellipse(35+random()*176,12+random()*95,10+random()*25,12+random()*15,random()*2,0,Math.PI*2);c.fill();}
      c.strokeStyle='rgba(60,45,24,.16)';c.lineWidth=.5;
      for(let x=15;x<245;x+=9)for(let y=5;y<128;y+=8){c.beginPath();c.arc(x+(y%16?4:0),y,4,0,Math.PI);c.stroke();}
      const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
      const material=new THREE.MeshStandardMaterial({map:tex,roughness:.32,metalness:.08});
      material.onBeforeCompile=shader=>{shader.uniforms.uFishPhase=phase;shader.uniforms.uFishAmp=amp;
        shader.vertexShader='uniform float uFishPhase;uniform float uFishAmp;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float tailK = smoothstep(.05,.51,-position.x);
          transformed.z += sin(uFishPhase - position.x*8.0)*uFishAmp*tailK;`);
      };
      const body=mesh(bodyGeometry(),material,group);body.castShadow=false;body.receiveShadow=true;
      const finMat=new THREE.MeshStandardMaterial({color:i%5===4?'#e4b478':'#ece3cb',roughness:.4,side:THREE.DoubleSide,transparent:true,opacity:.8});
      const tail=mesh(finGeometry(true),finMat,group,[-.48,0,0]);tail.castShadow=false;
      const fins=[];
      for(const side of [-1,1]){const fin=mesh(finGeometry(false),finMat,group,[.14,-.015,side*.085]);fin.rotation.x=side*.6;fin.rotation.y=side*.85;fin.scale.set(.5,.5,.5);fin.castShadow=false;fins.push(fin);}
      const dorsal=mesh(finGeometry(false),finMat,group,[-.06,.073,0]);dorsal.rotation.x=Math.PI/2;dorsal.scale.set(.6,.6,.6);dorsal.castShadow=false;
      const eyeMat=new THREE.MeshStandardMaterial({color:'#111912',roughness:.15});
      for(const side of [-1,1])mesh(new THREE.SphereGeometry(.012,10,8),eyeMat,group,[.33,.022,side*.045]).castShadow=false;
      group.scale.setScalar(size);const a=random()*6.28;
      group.position.set(-.5+Math.cos(a)*(1.2+random()*1.5),-.17-random()*.12,Math.sin(a)*(1+random()*.7));
      this.group.add(group);this.fish.push({group,tail,fins,dorsal,phase,amp,heading:random()*6.28,speed:.09+random()*.1,seed:random()*10});
    }
    this.food = new THREE.Group();scene.add(this.food);
    const geo=new THREE.SphereGeometry(.005,8,6), mat=new THREE.MeshStandardMaterial({color:'#a27a47',roughness:.95});
    for(let i=0;i<24;i++){const m=mesh(geo,mat,this.food);m.scale.set(1,.85,1.25);m.visible=false;m.userData.particle=null;}
    this.nextFood=0;
    this.food.visible=false;
  }
  feed(time,point=new THREE.Vector3()) {this.feedPoint.copy(point);this.feedUntil=time+11;this.feedStart=time;this.nextFood=0;this.food.children.forEach(m=>{m.visible=false;m.userData.particle=null;});}
  releasePellet(time,origin,velocity){const m=this.food.children[this.nextFood++%this.food.children.length];m.userData.particle={origin:origin.clone(),velocity:velocity.clone(),time,landed:false,landTime:0,eaten:false};m.position.copy(origin);m.visible=true;this.food.visible=true;}
  selectStroke(point,count){const candidates=this.fish.slice(0,count);if(!candidates.length)return null;
    const fish=candidates.reduce((a,b)=>a.group.position.distanceTo(point)<b.group.position.distanceTo(point)?a:b);
    this.feedUntil=0;this.strokeTarget={fish,point:point.clone(),heading:Math.PI/2};return fish;}
  update(dt,time,settings) {
    const active=this.fish.slice(0,settings.fishCount);const feeding=time<this.feedUntil;
    this.fish.forEach((f,i)=>f.group.visible=i<settings.fishCount);
    for(const [i,f] of active.entries()) {
      const p=f.group.position;
      if(!isInPond(p.x,p.z,settings.pondScale)){
        const angle=Math.atan2((p.z+.15)/(p.z>-.15?4.65:3.02),(p.x+.5)/4.55),edge=pondBoundary(angle,settings.pondScale);
        p.x=-.5+(edge.x+.5)*.88;p.z=-.15+(edge.z+.15)*.88;
      }
      let dx=Math.cos(f.heading),dz=-Math.sin(f.heading);
      dx+=Math.cos(time*.17+f.seed)*.42;dz+=Math.sin(time*.21+f.seed)*.42;
      for(const o of active)if(o!==f){const d=p.distanceTo(o.group.position);
        if(d<.55&&d>.001){dx+=(p.x-o.group.position.x)/d*.45;dz+=(p.z-o.group.position.z)/d*.45;}}
      const r=((p.x+.5)/(3.8*settings.pondScale))**2+(p.z/(2.4*settings.pondScale))**2;
      if(r>.65){dx-=(p.x+.5)*Math.max(0,r-.65)*1.8;dz-=p.z*Math.max(0,r-.65)*1.8;}
      if(feeding){const px=p.x-this.feedPoint.x,pz=p.z-this.feedPoint.z,dist=Math.hypot(px,pz)+.1;dx-=px/dist*3.8;dz-=pz/dist*3.8;}
      const stroking=this.strokeTarget?.fish===f;
      if(stroking){const point=this.strokeTarget.point;dx=(point.x-p.x)*8;dz=(point.z-p.z)*8;}
      const target=Math.atan2(-dz,dx),diff=Math.atan2(Math.sin(target-f.heading),Math.cos(target-f.heading));
      f.heading+=THREE.MathUtils.clamp(diff,-(stroking?3:1.2)*dt,(stroking?3:1.2)*dt);
      const speed=feeding? .22+f.speed : f.speed*(.65+.4*Math.sin(time*.9+f.seed)**2);
      p.x+=Math.cos(f.heading)*speed*dt;p.z-=Math.sin(f.heading)*speed*dt;
      if(stroking){const point=this.strokeTarget.point,distance=Math.hypot(p.x-point.x,p.z-point.z);
        p.x=THREE.MathUtils.damp(p.x,point.x,1.5,dt);p.z=THREE.MathUtils.damp(p.z,point.z,1.5,dt);
        if(distance<.2)f.heading=THREE.MathUtils.damp(f.heading,this.strokeTarget.heading,3,dt);
        p.y=THREE.MathUtils.damp(p.y,-.018,2,dt);
      }else p.y=feeding? -.068 : -.18+Math.sin(time*.4+i)*.055;
      f.group.rotation.set(0,f.heading,Math.sin(time*.6+i)*.025);
      f.phase.value+=dt*(feeding?8:4.2);f.amp.value=feeding?.075:.045;
      f.tail.rotation.y=Math.sin(f.phase.value+3.8)*.38;
      f.fins.forEach((fin,k)=>fin.rotation.z=Math.sin(time*3+k+i)*.2);
      f.dorsal.scale.y=THREE.MathUtils.damp(f.dorsal.scale.y,stroking?.22:.6,5,dt);
      if(dt>0&&(feeding||stroking)&&time>(f.nextWake||0)){this.water.addRipple(p.x,p.z,time,.006);f.nextWake=time+.75+i*.07;}
    }
    let foodVisible=false;
    this.food.children.forEach((m,i)=>{const p=m.userData.particle;if(!p||p.eaten){m.visible=false;return;}const age=time-p.time;
      if(!p.landed){m.position.copy(p.origin).addScaledVector(p.velocity,age);m.position.y-=4.905*age*age;
        if(m.position.y<=.029){m.position.y=.029;p.landed=true;p.landTime=time;this.water.addRipple(m.position.x,m.position.z,time,.006);}}
      else{m.position.y=.030+Math.sin(time*2.1+i)*.0015;
        if(time-p.landTime>.35){for(const f of active){const head=f.group.position.clone().add(new THREE.Vector3(Math.cos(f.heading)*f.group.scale.x*.31,0,-Math.sin(f.heading)*f.group.scale.x*.31));
          if(Math.hypot(head.x-m.position.x,head.z-m.position.z)<.11){p.eaten=true;break;}}}
        if(time-p.landTime>8)p.eaten=true;}
      m.rotation.set(age*2.5,i*.7+age*.6,age*1.2);m.visible=!p.eaten;foodVisible||=m.visible;
    });this.food.visible=foodVisible;
  }
}
function bodyGeometry() {
  const pos=[],uv=[],indices=[];const rings=48,segs=24;
  for(let i=0;i<=rings;i++){const s=i/rings,x=.5-s;
    const width=.005+.104*Math.sin(Math.PI*Math.pow(s,.7))*(1-.78*Math.pow(s,4));
    for(let j=0;j<=segs;j++){const a=j/segs*6.28;pos.push(x,Math.cos(a)*width*.85,Math.sin(a)*width);uv.push(s,j/segs);}}
  for(let i=0;i<rings;i++)for(let j=0;j<segs;j++){const a=i*(segs+1)+j,b=a+segs+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function finGeometry(tail) {
  const geo=new THREE.BufferGeometry();
  const verts=tail?[0,0,0,-.22,.01,-.145,-.16,0,0,0,0,0,-.16,0,0,-.22,.01,.145]
    :[0,0,0,-.08,-.05,.29,-.22,-.04,.21,0,0,0,-.22,-.04,.21,-.14,0,0];
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();return geo;
}
