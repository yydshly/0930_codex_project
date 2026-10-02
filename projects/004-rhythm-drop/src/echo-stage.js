import * as THREE from 'three';
import {createEchoCharacter} from './echo-characters.js';
import {directEpisode,noteMotion} from './echo-direction.mjs';
import {directEmotion} from './echo-emotion.mjs';

export function createEchoStage(mount){
  const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;mount.append(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-7,7,4,-4,.1,60);
  scene.add(new THREE.HemisphereLight(0xfff5df,0xb5b69c,2));
  const sun=new THREE.DirectionalLight(0xffe3bf,2.8);sun.position.set(-4,7,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:28});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xddebe5,.7);fill.position.set(5,4,-3);scene.add(fill);
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:1});
  const mesh=(g,m,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  const world=new THREE.Group();scene.add(world);
  const earth=mesh(new THREE.CylinderGeometry(5.55,5.65,.2,96),mat(0xdfd3b8),world,0,-.14,-.5);earth.scale.z=.69;
  const ground=mesh(new THREE.CylinderGeometry(5.47,5.48,.035,96),mat(0xeae3ce),world,0,-.026,-.5);ground.scale.z=.69;
  const tree=new THREE.Group();tree.position.set(-3.1,-.03,-1.25);world.add(tree);
  const trunk=new THREE.Shape();trunk.moveTo(-.46,0);trunk.quadraticCurveTo(-.31,1.3,-.42,2.1);trunk.lineTo(.32,2.1);trunk.quadraticCurveTo(.25,.9,.52,0);trunk.closePath();
  const treeHole=new THREE.Path();treeHole.absellipse(0,.85,.24,.37,0,Math.PI*2,true);trunk.holes.push(treeHole);
  const tg=new THREE.ExtrudeGeometry(trunk,{depth:.55,bevelEnabled:true,bevelSize:.065,bevelThickness:.06,bevelSegments:3,curveSegments:24});tg.translate(0,0,-.3);mesh(tg,mat(0xb39873),tree);
  const inside=mesh(new THREE.CircleGeometry(.25,48),new THREE.MeshBasicMaterial({color:0x715847}),tree,0,.85,-.34);inside.scale.y=1.45;
  const voiceGlow=mesh(new THREE.RingGeometry(.24,.263,64),new THREE.MeshBasicMaterial({color:0xefb6a0,transparent:true,opacity:0,depthWrite:false}),tree,0,.85,.335);voiceGlow.scale.y=1.45;
  for(const [x,y,z,r] of [[0,2.55,0,1.02],[-.69,2.2,.04,.70],[.67,2.2,-.03,.73]]){const o=mesh(new THREE.SphereGeometry(r,32,20),mat(0xb5c0a0),tree,x,y,z);o.scale.set(1.1,.82,.76);}
  const pebbles=[];
  [[-1.8,.85],[-.65,1.0],[.5,.85]].forEach(([x,z],i)=>{const o=mesh(new THREE.SphereGeometry(.34,32,16),mat([0xd2b78b,0xaebdaf,0xd7b3a5][i]),world,x,.07,z);o.scale.set(1.3,.19,.85);o.name='sound-stone-'+i;pebbles.push(o);});
  for(const [x,z,s] of [[3.65,-1.6,.7],[4,1.05,.45],[-4.1,1.1,.43],[-.9,-2.8,.4]]){
    const stone=mesh(new THREE.SphereGeometry(s,24,14),mat(0xd8d4bd),world,x,s*.2-.02,z);stone.scale.set(1,.4,.7);
    for(let i=0;i<3;i++){const leaf=mesh(new THREE.SphereGeometry(.10,12,8),mat(0xaeb993),world,x+.16*Math.cos(i*2),.13,z+.13*Math.sin(i*2));leaf.scale.set(.4,1.8,.7);leaf.rotation.z=(i-1)*.4;}
  }
  const connection=new THREE.Group();world.add(connection);
  for(let i=0;i<5;i++){
    const leaf=mesh(new THREE.SphereGeometry(.075,16,10),new THREE.MeshStandardMaterial({color:0x9dad85,emissive:0xedd296,roughness:1}),connection,-.35+i*.28,.025,.69+Math.sin(i)*.08);
    leaf.scale.set(1.30,.24,.70);leaf.rotation.y=i*.65;
  }
  const stream=color=>Array.from({length:7},()=>{const o=mesh(new THREE.SphereGeometry(.040,12,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false}),world);o.castShadow=o.receiveShadow=false;return o;});
  const incoming=stream(0xebb39b),outgoing=stream(0xf5d599),answering=stream(0xe7b599);
  const curve=new THREE.CubicBezierCurve3();
  function flow(beads,from,to,age){
    curve.v0.copy(from);curve.v3.copy(to);curve.v1.copy(from).lerp(to,.32);curve.v2.copy(from).lerp(to,.70);curve.v1.y+=.36;curve.v2.y+=.22;
    beads.forEach((bead,i)=>{const u=(age-i*.045)/.65;bead.visible=u>=0&&u<1;bead.material.opacity=bead.visible?Math.sin(u*Math.PI)*.72:0;if(bead.visible){curve.getPoint(u,bead.position);bead.scale.setScalar(.55+Math.sin(u*Math.PI)*.55);}});
  }
  const plate=mesh(new THREE.CylinderGeometry(1.45,1.50,.13,80),mat(0xe3d8bf),scene,0,-.09,0);plate.visible=false;
  const cast=Object.fromEntries(['kong','zhe','dong','su'].map(id=>{const c=createEchoCharacter(id);scene.add(c.root);return [id,c];}));
  const shadows={};
  for(const id of Object.keys(cast)){const o=mesh(new THREE.CircleGeometry(id==='dong'?.7:.48,48),new THREE.MeshBasicMaterial({color:0x81765d,transparent:true,opacity:.12,depthWrite:false}),scene);o.rotation.x=-Math.PI/2;o.position.y=.008;o.castShadow=o.receiveShadow=false;shadows[id]=o;}
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),treeSource=new THREE.Vector3(-3.1,.82,-.89),kongSource=new THREE.Vector3(),friendSource=new THREE.Vector3();
  let current={mode:'episode',view:'front'},aspect=2,cameraFrame=[-1.35,1.30,-.35,5.25],lastTime=null;
  function projection(){const h=current.mode==='character'?4.25:cameraFrame[3];camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();}
  function resize(){const r=mount.getBoundingClientRect();aspect=Math.max(.1,r.width/Math.max(1,r.height));projection();renderer.setSize(r.width,r.height,false);}
  function update(s){
    const character=s.mode==='character',changed=s.mode!==current.mode||s.direction!==current.direction,emotional=s.direction==='emotion',direction=emotional?directEmotion({phase:s.phase,elapsed:s.elapsed,reducedMotion:s.reducedMotion}):directEpisode({phase:s.phase,elapsed:s.elapsed,friendProgress:s.friendProgress,holding:s.holding,reducedMotion:s.reducedMotion});
    const cut=emotional&&s.phase!==current.phase&&['call-back','return'].includes(s.phase),delta=lastTime===null?0:Math.min(.05,Math.max(0,s.time-lastTime));lastTime=s.time;current=s;world.visible=!character;plate.visible=character;
    const target=[...direction.camera];
    if(aspect<1.15){
      const includeTree=['intro','question','listening'].includes(s.phase)||s.reducedMotion;
      target[3]=Math.max(target[3],(emotional?direction.span:includeTree||s.phase==='accepted'?5.6:4.4)/aspect);if(includeTree&&!emotional)target[0]=-1.7;
    }
    const damping=changed||cut||s.reducedMotion?1:1-Math.exp(-delta*4.5);
    cameraFrame=cameraFrame.map((value,i)=>value+(target[i]-value)*damping);
    if(character){camera.position.set(0,2.1,10);camera.lookAt(0,s.selected==='su'?1.72:1.43,0);}
    else{camera.position.set(cameraFrame[0]+.75,cameraFrame[1]+2.7,cameraFrame[2]+12);camera.lookAt(...cameraFrame.slice(0,3));}
    projection();
    for(const [id,c] of Object.entries(cast)){
      const visible=character?id===s.selected:id==='kong'?(direction.kongVisible??true):id==='zhe'&&(s.friendVisible??direction.friendVisible);c.root.visible=shadows[id].visible=visible;if(!visible)continue;
      const pulse=s.pulses?.[id]??0,noteAge=s.noteAges?.[id]??100,motion=noteMotion(noteAge,{height:id==='dong'?.13:.24,reducedMotion:s.reducedMotion});
      const acting=character?{mode:s.pose??'waiting',look:0}:id==='kong'?direction.kong:direction.zhe;
      const walking=acting.walking&&!s.reducedMotion,hop=walking?Math.abs(Math.sin(acting.walkCycle??s.time*10))*.035:motion.y;
      const x=character?0:id==='kong'?direction.kongPosition?.[0]??-.65:direction.friend.x,z=character?0:id==='kong'?direction.kongPosition?.[1]??.60:direction.friend.z;
      c.root.position.set(x,-.01+hop,z);c.root.rotation.y=character?({front:0,side:Math.PI/2,back:Math.PI}[s.view]??0):id==='kong'?direction.kongYaw:direction.zheYaw??-.18;
      // A sounding voice opens its mouth even while the social pose is attentive.
      c.animate(s.time,{...acting,mode:pulse>.13?'replying':acting.mode,walking,pulse,noteAge,squash:motion.squash,lean:(acting.lean??0)+motion.lean,reducedMotion:s.reducedMotion});
      shadows[id].position.set(x,.009,z);shadows[id].scale.setScalar(1-hop*.38);shadows[id].material.opacity=.13-hop*.20;
    }
    const glow=s.treePulse??0;voiceGlow.material.opacity=glow*.9;voiceGlow.scale.set(1+glow*.35,1.45*(1+glow*.35),1);
    const mood=direction.mood??1;renderer.toneMappingExposure=1.03*mood;fill.intensity=.7*(emotional?mood:1);
    pebbles.forEach((o,i)=>{o.visible=s.phase==='reply';o.material.emissive.setHex(0xffdfae);o.material.emissiveIntensity=(s.notePulses?.[i]??0)*.45+(i===s.hint?.12:0);});
    connection.visible=direction.connection>0;connection.children.forEach(leaf=>{leaf.scale.y=.24*direction.connection;leaf.material.emissiveIntensity=direction.connection*.22+(s.pulses?.kong??0)*.18;});
    kongSource.copy(cast.kong.root.position).add(new THREE.Vector3(0,.965,.24));friendSource.copy(cast.zhe.root.position).add(new THREE.Vector3(0,1.18,.32));
    flow(incoming,treeSource,kongSource,character||s.reducedMotion?100:s.treeAge??100);
    flow(outgoing,kongSource,direction.friendVisible?friendSource:treeSource,character||s.reducedMotion?100:s.noteAges?.kong??100);
    flow(answering,friendSource,kongSource,character||s.reducedMotion||!cast.zhe.root.visible?100:s.noteAges?.zhe??100);
    renderer.render(scene,camera);
  }
  function pick(x,y){if(current.phase!=='reply')return -1;const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pebbles)[0];return hit?pebbles.indexOf(hit.object):-1;}
  const observer=new ResizeObserver(resize);observer.observe(mount);resize();
  return {canvas:renderer.domElement,update,pick,dispose(){observer.disconnect();Object.values(cast).forEach(c=>c.dispose());world.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});Object.values(shadows).forEach(o=>{o.geometry.dispose();o.material.dispose();});plate.geometry.dispose();plate.material.dispose();renderer.dispose();}};
}
