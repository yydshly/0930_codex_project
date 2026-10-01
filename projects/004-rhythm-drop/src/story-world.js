import * as THREE from 'three';
import { storyPointAt } from './stories.mjs';

function wordSprite(text,color='#fff0d2',size=4.6){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font='600 72px "Microsoft YaHei", sans-serif';c.fillText(text,512,128,950);
  const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(size,size/4,1);return sprite;
}
export function createStoryWorld(scene){
  const roots=[new THREE.Group(),new THREE.Group(),new THREE.Group()];roots.forEach(r=>scene.add(r));
  const city=[],books=[],lanterns=[];
  const blockGeo=new THREE.BoxGeometry(1.5,1,1.4),windowGeo=new THREE.PlaneGeometry(.24,.33);
  const wall=new THREE.MeshStandardMaterial({color:0x1d3540,roughness:.8});
  for(let i=0;i<64;i+=2){for(const side of [-1,1]){
    const p=storyPointAt(0,i),height=2.2+(Math.sin(i*2.7+side)+1)*1.7;
    const b=new THREE.Mesh(blockGeo,wall);b.scale.y=height;b.position.set(p.x+side*(5.3+Math.sin(i)*1.1),p.y+height/2-2.8,p.z);roots[0].add(b);
    const mat=new THREE.MeshBasicMaterial({color:0xffd494,transparent:true,opacity:.035}),windows=new THREE.InstancedMesh(windowGeo,mat,12),windowPose=new THREE.Object3D();
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      windowPose.position.set(b.position.x+(col-1)*.44,b.position.y-height*.3+row*.55,b.position.z+.71);windowPose.updateMatrix();windows.setMatrixAt(row*3+col,windowPose.matrix);
    }
    roots[0].add(windows);city.push({index:i,mat});
  }}
  const poleGeo=new THREE.CylinderGeometry(.028,.045,.85,8),poleMat=new THREE.MeshStandardMaterial({color:0x779191});
  for(let i=0;i<=64;i++){
    const p=storyPointAt(0,i),g=new THREE.Group();g.position.set(p.x+1,p.y,p.z);
    const pole=new THREE.Mesh(poleGeo,poleMat);pole.position.y=.43;g.add(pole);
    const mat=new THREE.MeshStandardMaterial({color:0x82754e,emissive:0xffda8e,emissiveIntensity:.02});
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),mat);lamp.position.y=.94;g.add(lamp);roots[0].add(g);lanterns.push({index:i,mat});
  }
  const sun=new THREE.Mesh(new THREE.SphereGeometry(4.5,32,24),new THREE.MeshBasicMaterial({color:0xffd195}));roots[0].add(sun);
  const dawnText=wordSprite('天快亮了。', '#fff2d6',7);roots[0].add(dawnText);

  const bookGeo=new THREE.BoxGeometry(1.9,.16,1.45),coverMat=new THREE.MeshStandardMaterial({color:0x588377,roughness:.65});
  const pageMat=new THREE.MeshStandardMaterial({color:0xe9d9b4,roughness:.85});
  for(let i=0;i<=64;i+=3){
    const p=storyPointAt(1,i),g=new THREE.Group();g.position.set(p.x,p.y-.2,p.z);
    const cover=new THREE.Mesh(bookGeo,coverMat);g.add(cover);
    for(const side of [-1,1]){const page=new THREE.Mesh(new THREE.BoxGeometry(.91,.1,1.34),pageMat);page.position.set(side*.47,.13,0);page.rotation.z=side*-.08;g.add(page);}
    roots[1].add(g);books.push(g);
  }
  // An original folded-paper sculpture, carried along by the memory sequence.
  const plane=new THREE.Group(),paperGeo=new THREE.BufferGeometry();
  paperGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.9,-.7,0,.6,0,.12,.35,0,0,-.9,0,.12,.35,.7,0,.6,0,0,-.9,0,-.17,.6,0,.12,.35],3));paperGeo.computeVertexNormals();
  plane.add(new THREE.Mesh(paperGeo,new THREE.MeshStandardMaterial({color:0xffebc2,side:THREE.DoubleSide,roughness:.9})));roots[1].add(plane);
  const goal=storyPointAt(1,64),gate=new THREE.Group();gate.position.set(goal.x,goal.y,goal.z-1);
  const gateMat=new THREE.MeshStandardMaterial({color:0xc8a268,metalness:.3,roughness:.5});
  for(const x of [-3.5,3.5]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.26,6,.35),gateMat);pillar.position.set(x,2.8,0);gate.add(pillar);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(7.4,.28,.4),gateMat);beam.position.y=5.8;gate.add(beam);
  const gateWord=wordSprite('下一站，世界', '#ffedc8',6);gateWord.position.y=4.7;gate.add(gateWord);roots[1].add(gate);

  const confettiGeo=new THREE.BufferGeometry(),confettiPositions=new Float32Array(180*3);
  const confetti=new THREE.Points(confettiGeo.setAttribute('position',new THREE.BufferAttribute(confettiPositions,3)),new THREE.PointsMaterial({color:0xffe7ba,size:.12,transparent:true,opacity:.85}));roots[1].add(confetti);
  // Four sculpted blades become an aperture: a single idea has found its form.
  const logo=new THREE.Group();logo.position.set(0,1,0);roots[2].add(logo);
  const blades=[];
  for(let i=0;i<4;i++){
    const shape=new THREE.Shape();shape.moveTo(.15,.42);shape.lineTo(.68,1.7);shape.lineTo(1.58,.78);shape.lineTo(.68,.18);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelSize:.04,bevelThickness:.035,bevelSegments:2,steps:1});
    const blade=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:i%2?0x95dccd:0xd2fff0,emissive:0x65baa9,emissiveIntensity:.45,metalness:.6,roughness:.22}));blade.rotation.z=i*Math.PI/2;logo.add(blade);blades.push(blade);
  }
  const halo=new THREE.Mesh(new THREE.RingGeometry(2.2,2.215,120),new THREE.MeshBasicMaterial({color:0xa8e8d5,transparent:true,opacity:.28,side:THREE.DoubleSide}));logo.add(halo);
  let brandWord=wordSprite('LUMA','#e0fff2',6);brandWord.position.y=-2.8;logo.add(brandWord);
  const energyPositions=new Float32Array(700*3),energyGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(energyPositions,3));
  const energy=new THREE.Points(energyGeo,new THREE.PointsMaterial({color:0xcbb8ff,size:.045,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));roots[2].add(energy);
  const satellites=[];
  for(let i=0;i<12;i++){
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.09+(i%3)*.025,16,12),new THREE.MeshBasicMaterial({color:i%2?0xc1a3ff:0xaee9dc}));roots[2].add(orb);satellites.push(orb);
  }
  const signalRings=[];
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.008,6,128),new THREE.MeshBasicMaterial({color:0x9771eb,transparent:true,opacity:.3}));roots[2].add(ring);signalRings.push(ring);
  }
  const friends=[];
  for(let i=0;i<5;i++){
    const friend=new THREE.Group();const m=new THREE.Mesh(new THREE.SphereGeometry(.3,20,16),new THREE.MeshStandardMaterial({color:[0xddb899,0x9bbbb7,0xc6b0d5,0xcfc79c,0xc39f92][i],roughness:.45}));friend.add(m);
    const hat=new THREE.Mesh(new THREE.BoxGeometry(.55,.04,.55),new THREE.MeshStandardMaterial({color:0x27353a}));hat.position.y=.34;friend.add(hat);friend.position.set(goal.x+(i-2)*1.1,goal.y+.35,goal.z+1);roots[1].add(friend);friends.push(friend);
  }
  function setBrand(name){logo.remove(brandWord);brandWord.material.map.dispose();brandWord.material.dispose();brandWord=wordSprite(name||'LUMA','#e0fff2',6);brandWord.position.y=-2.8;logo.add(brandWord);}
  function update(story,beat,pose){
    roots.forEach((r,i)=>r.visible=i===story);
    if(story===0){
      const dawn=THREE.MathUtils.smoothstep(beat,48,64);city.forEach(b=>b.mat.opacity=pose.travel>=b.index?.8:.015);lanterns.forEach(l=>l.mat.emissiveIntensity=pose.travel>=l.index?1.9:.02);
      const end=storyPointAt(0,64);sun.position.set(end.x-7,end.y-4+dawn*9,end.z-16);sun.visible=beat>=48;
      dawnText.visible=false;
    }else if(story===1){
      plane.position.set(pose.x+Math.sin(beat*.25)*2,pose.y+1.2,pose.z-3);plane.rotation.set(Math.sin(beat*.5)*.2,Math.sin(beat*.2)*.25,-.22);
      books.forEach(b=>b.visible=false);gate.visible=beat>=40;confetti.visible=beat>=58;friends.forEach((f,i)=>{f.visible=beat>=48;f.position.y=goal.y+.35+Math.max(0,Math.sin((beat-58)*1.5+i))*.45;});
      for(let i=0;i<180;i++){const f=(beat*.11+i*.073)%1;confettiPositions[i*3]=goal.x+Math.sin(i*7.31)*6;confettiPositions[i*3+1]=goal.y+8-f*8;confettiPositions[i*3+2]=goal.z+Math.cos(i*2.1)*6;}
      confettiGeo.attributes.position.needsUpdate=true;
    }else if(story===2){
      const gather=THREE.MathUtils.smoothstep(beat,32,52),reveal=THREE.MathUtils.smoothstep(beat,52,58);
      logo.visible=beat>=50;logo.scale.setScalar(.7+.3*reveal);logo.rotation.y=(1-reveal)*.55;
      blades.forEach((blade,i)=>{const angle=i*Math.PI/2;blade.position.set(Math.cos(angle)*(1-reveal)*1.8,Math.sin(angle)*(1-reveal)*1.8,0);blade.material.emissiveIntensity=.35+reveal*.3;});
      brandWord.material.opacity=THREE.MathUtils.smoothstep(beat,58,62);halo.material.opacity=reveal*.25;
      satellites.forEach((orb,i)=>{const appear=THREE.MathUtils.smoothstep(beat,8+i*.75,12+i*.75),angle=i*Math.PI/6+beat*.035,radius=(3.8+i%3)*(1-gather)+.1*gather;orb.visible=beat<53;orb.scale.setScalar(appear);orb.position.set(Math.cos(angle)*radius,1+Math.sin(angle)*radius*.6,Math.sin(i)*1.2*(1-gather));});
      signalRings.forEach((r,i)=>{const phase=(beat/8+i/3)%1;r.visible=beat>=8&&beat<48;r.position.set(0,1,-1-i*.5);r.scale.setScalar(1+phase*7);r.material.opacity=(1-phase)*.16;});
      energy.material.opacity=beat<8?.1:beat>58?.12:.65;
      for(let i=0;i<700;i++){
        const angle=i*2.399+beat*.035,r=(2+((i*13)%100)/10)*(1-gather)+.17*gather;
        energyPositions[i*3]=Math.cos(angle)*r;energyPositions[i*3+1]=1+Math.sin(angle)*r*.62;energyPositions[i*3+2]=Math.sin(i*4.73)*r*.35;
      }energyGeo.attributes.position.needsUpdate=true;

    }
  }
  return {update,setBrand};
}
