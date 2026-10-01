import * as THREE from 'three';
import {identityRoles,identityState,identitySignals} from './identity-cues.mjs';

function word(text,color,width=2){
  const canvas=document.createElement('canvas'),label=text.length<=2;canvas.width=label?256:1024;canvas.height=label?128:256;
  const ctx=canvas.getContext('2d');ctx.font=`500 ${label?58:76}px "Microsoft YaHei", sans-serif`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,canvas.height/2,canvas.width-24);
  const map=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthTest:false}));sprite.scale.set(width,width*canvas.height/canvas.width,1);return sprite;
}
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.32,metalness:.25,emissive:color,emissiveIntensity:.12});}
function face(group,z=.36){for(const x of [-.12,.12]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.044,10,8),new THREE.MeshBasicMaterial({color:0x1c2331}));eye.position.set(x,.09,z);group.add(eye);}}

export function createIdentityWorld(scene,{roles=identityRoles,stateAt=identityState,signalsAt=identitySignals,showBrand=true}={}){
  const root=new THREE.Group();scene.add(root);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(7,96),new THREE.MeshStandardMaterial({color:0x101b2a,roughness:1,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.35;root.add(floor);
  const horizon=new THREE.Mesh(new THREE.TorusGeometry(6.1,.018,8,128),new THREE.MeshBasicMaterial({color:0x445776,transparent:true,opacity:.3}));horizon.rotation.x=Math.PI/2;horizon.position.y=-.32;root.add(horizon);
  const dustPositions=[];for(let i=0;i<110;i++)dustPositions.push(Math.sin(i*13.7)*7,Math.cos(i*1.6)*2+2,Math.sin(i*4.9)*4-3);
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3)),new THREE.PointsMaterial({color:0x778da4,size:.023,transparent:true,opacity:.4}));root.add(dust);
  const reply=new THREE.Group(),replyBody=new THREE.Mesh(new THREE.OctahedronGeometry(.48),material(roles.reply.color));reply.add(replyBody);face(reply,.3);root.add(reply);
  const replyRing=new THREE.Mesh(new THREE.TorusGeometry(.57,.015,8,64),new THREE.MeshBasicMaterial({color:roles.reply.color}));replyRing.rotation.x=.3;reply.add(replyRing);
  const bass=new THREE.Group(),bassBody=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.38,8,20),material(roles.bass.color));bass.add(bassBody);face(bass,.32);root.add(bass);
  const belt=new THREE.Mesh(new THREE.TorusGeometry(.325,.025,8,48),new THREE.MeshBasicMaterial({color:0xd4fff0}));belt.rotation.x=Math.PI/2;belt.position.y=-.1;bass.add(belt);
  const visitor=new THREE.Mesh(new THREE.IcosahedronGeometry(.32,0),new THREE.MeshStandardMaterial({color:identityRoles.visitor.color,roughness:.5,transparent:true}));root.add(visitor);
  const labels={self:word(roles.self.name,'#ffcc8d',1.5),reply:word(roles.reply.name,'#d3c2ff',1.5),bass:word(roles.bass.name,'#a4efe0',1.5)};Object.values(labels).forEach(label=>root.add(label));
  let brand=word('LUMA','#ecede3',4);brand.position.set(0,-1.05,0);root.add(brand);
  const connectors=['reply','bass'].map(role=>{const positions=new Float32Array(6),geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3));const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:roles[role].color,transparent:true,opacity:0}));root.add(line);return {role,line,positions,geometry};});
  const waves=[];
  for(const role of ['self','reply','bass'])for(let slot=0;slot<4;slot++){
    const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.565,80),new THREE.MeshBasicMaterial({color:roles[role].color,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));root.add(ring);waves.push({role,slot,ring});
  }
  function setBrand(name){root.remove(brand);brand.material.map.dispose();brand.material.dispose();brand=word(name||'LUMA','#ecede3',4);brand.position.set(0,-1.05,0);root.add(brand);}
  function update(visible,beat,camera){
    root.visible=visible;if(!visible)return;
    const state=stateAt(beat),points={self:state.hero,reply:state.reply,bass:state.bass};
    reply.position.set(state.reply.x,state.reply.y,state.reply.z);bass.position.set(state.bass.x,state.bass.y,state.bass.z);
    reply.visible=state.replyArrives>0;bass.visible=state.bassArrives>0;reply.scale.setScalar(state.replyArrives*(1+state.pulses.reply*.06));bass.scale.set(state.bassArrives*(1+state.pulses.bass*.06),state.bassArrives*(1-state.pulses.bass*.025),state.bassArrives);
    reply.lookAt(camera.position);bass.lookAt(camera.position);replyBody.material.emissiveIntensity=.12+state.pulses.reply*.8;bassBody.material.emissiveIntensity=.12+state.pulses.bass*.65;
    visitor.visible=state.visitor.opacity>0;visitor.position.set(state.visitor.x,state.visitor.y,state.visitor.z);visitor.material.opacity=state.visitor.opacity;visitor.rotation.set(state.beat*.12,state.beat*.16,0);
    for(const [role,label] of Object.entries(labels)){const p=points[role];label.position.set(p.x,p.y-.85,p.z);label.visible=role==='self'||(role==='reply'?state.answered>0:state.supported>0);}
    brand.visible=showBrand;brand.material.opacity=state.word;
    connectors.forEach(({role,line,positions,geometry})=>{const p=points[role],a=points.self;positions.set([a.x,a.y,a.z,p.x,p.y,p.z]);geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();line.material.opacity=(role==='reply'?state.answered:state.supported)*(.16+.17*state.formation);});
    // Each wave uses an onset from the same score used by Web Audio.
    for(const {role,slot,ring} of waves){
      const p=points[role],signal=signalsAt(role,state.beat)[slot],age=signal?.age??0;
      ring.visible=!!signal;
      ring.position.set(p.x,p.y,p.z-.1);ring.lookAt(camera.position);ring.scale.setScalar(1+Math.max(0,age)*1.8);ring.material.opacity=ring.visible?(1-age)*.22:0;
    }
  }
  return {update,setBrand};
}
