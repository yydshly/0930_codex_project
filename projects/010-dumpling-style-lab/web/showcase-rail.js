import {THREE,modelsAt,fitModel,surface3D,instanceStatics,projectPoint} from './showcase-3d-kit.js';
import {clamp,action,safeSaved} from './showcase-core.js';

const LENGTH=240,SPAWNS=[10,23,37,52,90,105,120,135,171,186,202,216];
const route=d=>({x:Math.sin(d/33)*3.4,y:2.25+Math.sin(d/41)*.16,z:-d});
const defaults={version:1,distance:0,elapsed:0,hp:100,ammo:9,reload:0,aim:{x:560,y:315},enemies:SPAWNS.map((at,id)=>({id,at,hp:2,active:false,timer:1.8,age:0,escaped:false})),bolts:[],shots:0,hits:0,kills:0,missed:0,reloads:0,dodged:0,score:0,cover:0,checkpoint:null,phase:'ride',won:false};
export async function createRail({host,input,saved,notify,sfx}){
 const [station,space,blaster]=await Promise.all([modelsAt('assets/showcase/station/',['floor-panel','wall-pillar','wall-door-wide','container-wide','container-tall','pipe','table-display-planet']),modelsAt('assets/game-forms/pilot/',['craft_speederD','machine_generator','hangar_roundGlass']),modelsAt('assets/showcase/blaster/',['blaster-e'])]);
 const world=surface3D(host,{fov:59,far:320,background:'#071824',shadows:true}),{scene,camera,element}=world;let s=safeSaved(saved,defaults),shootCD=0,flash=0,hitmark=0,traces=[],lastPointer=null;
 element.setAttribute('aria-label','轨道射击：镜头自动推进，移动鼠标瞄准，点击或J开火，R换弹，空格躲避红色弹道。');
 const sky=await new THREE.TextureLoader().loadAsync('assets/game-forms/pilot/sky.webp');sky.mapping=THREE.EquirectangularReflectionMapping;sky.colorSpace=THREE.SRGBColorSpace;scene.background=sky;scene.environment=sky;
 // Tint only this factory's loaded copies; existing station art stays intact.
 for(const model of Object.values(station))model.scene.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set('#416473');o.material.metalness=.45;o.material.roughness=.52}});
 scene.fog=new THREE.Fog('#071824',25,115);scene.add(new THREE.HemisphereLight(0x9cbacd,0x171b2f,.85));const sun=new THREE.DirectionalLight(0xc9eff3,1.1);sun.position.set(3,15,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-15;sun.shadow.camera.right=sun.shadow.camera.top=15;sun.shadow.camera.far=65;sun.shadow.bias=-.002;scene.add(sun,sun.target);
 const statics=[],panels=[],lamps=[];
 function put(model,x,y,z,size,axis='y',rotation=0){const object=fitModel(model,size,axis);object.position.set(x,y,z);object.rotation.y=rotation;scene.add(object);statics.push(object);return object}
 for(let d=0;d<=260;d+=10){const p=route(d);put(station['floor-panel'],p.x,-.35,p.z,10,'x');for(const side of [-1,1]){put(station['wall-pillar'],p.x+side*6,3,p.z,6,'y');if(d%20===0)put(station['container-wide'],p.x+side*5,.65,p.z-3,1.6,'y',side>0?Math.PI/2:0);else put(station['container-tall'],p.x+side*5.1,1.3,p.z-1,2.5,'y');put(station.pipe,p.x+side*6.4,4.9,p.z,5.5,'x',Math.PI/2);const strip=new THREE.Mesh(new THREE.BoxGeometry(.075,.08,9.8),new THREE.MeshBasicMaterial({color:d<80?0x6bdae8:d<160?0xefb064:0xaaa4fb}));strip.position.set(p.x+side*3.9,.68,p.z);scene.add(strip);panels.push(strip)}
  if(d%20===0){const color=d<80?0x71d9e9:d<160?0xf1ac71:0xb2a0ef,l=new THREE.PointLight(color,35,16,2);l.position.set(p.x,5,p.z);scene.add(l);lamps.push({light:l,at:d});const rail=new THREE.Mesh(new THREE.BoxGeometry(12,.15,.3),new THREE.MeshStandardMaterial({color:0x425b6b,metalness:.5,roughness:.34}));rail.position.set(p.x,6,p.z);scene.add(rail)}}
 for(const d of [80,160]){const p=route(d);const arch=put(station['wall-door-wide'],p.x,2.8,p.z,5.5,'y');arch.scale.x*=1.55}
 for(const d of [50,133,215]){const p=route(d);put(space.machine_generator,p.x-6,1,p.z,2,'y');put(station['table-display-planet'],p.x+6.6,1.3,p.z-6,2,'y');put(space.hangar_roundGlass,p.x+22,7,p.z-15,28,'x',-.6)}
 instanceStatics(scene,statics);
 const glass=new THREE.Mesh(new THREE.PlaneGeometry(650,400),new THREE.MeshBasicMaterial({color:0x182e4c,transparent:true,opacity:.5,side:THREE.DoubleSide}));glass.position.set(0,50,-300);scene.add(glass);
 const enemies=s.enemies.map(e=>{const object=new THREE.Group();object.add(fitModel(space.craft_speederD,1.8,'x'));object.userData.enemy=e.id;object.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.emissive=new THREE.Color('#631f1b');n.material.emissiveIntensity=.25}});const core=new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshStandardMaterial({color:0xffb088,emissive:0xff6a42,emissiveIntensity:1.4,roughness:.25}));object.add(core);scene.add(object);return object});
 const weapon=fitModel(blaster['blaster-e'],.38,'y');camera.add(weapon);scene.add(camera);weapon.position.set(.29,-.31,-.68);weapon.rotation.y=Math.PI;
 const boltMaterial=new THREE.MeshBasicMaterial({color:0xff755d}),boltGeo=new THREE.SphereGeometry(.08,8,8),boltObjects=[];
 const hud=document.createElement('div');hud.className='rail-hud';hud.innerHTML='<div class="nav-brand"><small>RAIL / PATROL</small><b>回廊巡航</b><span></span></div><div class="rail-counter"><b></b><span></span></div><div class="rail-reticle"><i></i><b>×</b></div><div class="rail-cover" hidden>已压低镜头 · 躲避弹道</div><div class="rail-track"><i><em></em></i><span></span></div><div class="nav-end" hidden><b></b><p></p></div>';host.append(hud);
 const caster=new THREE.Raycaster();
 function position(e){const p=route(e.at+17);return {x:p.x+(e.id%2?2.5:-2.5)+Math.sin(e.age*1.1)*.6,y:2.5+(e.id%3)*.36+Math.sin(e.age*2)*.12,z:p.z}}
 function checkpoint(){return {distance:s.distance,elapsed:s.elapsed,hp:s.hp,ammo:s.ammo,enemies:structuredClone(s.enemies),kills:s.kills,score:s.score,hits:s.hits,shots:s.shots,missed:s.missed}}
 function reload(){if(s.reload>0||s.ammo===9||s.phase!=='ride')return;s.reload=1.05;s.reloads++;sfx('reload')}
 function cover(){if(s.cover>0||s.phase!=='ride')return;s.cover=1.05;sfx('turn')}
 function shoot(){
  if(shootCD>0||s.reload>0||s.phase!=='ride')return;if(s.ammo<=0){reload();return}s.ammo--;s.shots++;shootCD=.17;flash=.08;sfx('shot');sync();
  caster.setFromCamera(new THREE.Vector2(s.aim.x/1120*2-1,1-s.aim.y/630*2),camera);const visible=enemies.filter((o,i)=>s.enemies[i].active&&s.enemies[i].hp>0),hits=caster.intersectObjects(visible,true);let dest=caster.ray.origin.clone().addScaledVector(caster.ray.direction,45);
  if(hits.length){let object=hits[0].object;while(object&&object.userData.enemy===undefined)object=object.parent;if(object){const e=s.enemies[object.userData.enemy];e.hp=Math.max(0,e.hp-1);s.hits++;hitmark=.18;dest=hits[0].point;if(e.hp===0){s.kills++;s.score+=200;object.visible=false;sfx('pickup')}}}
  const start=weapon.getWorldPosition(new THREE.Vector3()),geometry=new THREE.BufferGeometry().setFromPoints([start,dest]),material=new THREE.LineBasicMaterial({color:0xb5f5ef,transparent:true,opacity:.9}),beam=new THREE.Line(geometry,material);scene.add(beam);traces.push({beam,life:.08});
 }
 function retry(){const cp=s.checkpoint;s=structuredClone(defaults);if(cp)Object.assign(s,structuredClone(cp));s.hp=100;s.ammo=9;s.checkpoint=cp?safeSaved(cp,{}):null;shootCD=0;notify('返回本段入口，继续观察目标与红色弹道。');sync()}
 function restart(){s=structuredClone(defaults);shootCD=flash=hitmark=0;sync()}
 function tick(dt){
  shootCD=Math.max(0,shootCD-dt);flash=Math.max(0,flash-dt);hitmark=Math.max(0,hitmark-dt);s.cover=Math.max(0,s.cover-dt);for(const t of traces){t.life-=dt;t.beam.material.opacity=t.life/.08}for(const t of traces.filter(t=>t.life<=0)){scene.remove(t.beam);t.beam.geometry.dispose();t.beam.material.dispose()}traces=traces.filter(t=>t.life>0);
  if(s.phase!=='ride')return;s.elapsed+=dt;const previous=s.distance;s.distance=Math.min(LENGTH,s.distance+4.25*dt);
  if(!s.checkpoint||Math.floor(previous/80)!==Math.floor(s.distance/80)){s.checkpoint=checkpoint();notify(['外港廊桥','能源通道','星幕机房'][Math.min(2,Math.floor(s.distance/80))]+' · 镜头继续推进。')}
  if(input.hover){if(!lastPointer||Math.abs(input.hover.x-lastPointer.x)>.1||Math.abs(input.hover.y-lastPointer.y)>.1)s.aim={x:input.hover.x,y:input.hover.y};lastPointer={...input.hover}}else lastPointer=null;if(input.x||input.y)s.aim={x:clamp(s.aim.x+input.x*390*dt,12,1108),y:clamp(s.aim.y+input.y*390*dt,12,618)};
  if(input.pressed.has('KeyR'))reload();if(input.pressed.has('Space')||input.pressed.has('KeyC'))cover();if(s.reload>0){s.reload=Math.max(0,s.reload-dt);if(s.reload===0)s.ammo=9}
  sync();for(const pt of input.pointers){s.aim={x:pt.x,y:pt.y};shoot()}if(input.keys.has('KeyJ'))shoot();
  for(const e of s.enemies){if(e.hp<=0)continue;if(!e.active&&s.distance>=e.at)e.active=true;if(!e.active)continue;e.age+=dt;e.timer-=dt;const p=position(e);
   if(e.timer<=0){const dest=route(s.distance+1),v=new THREE.Vector3(dest.x-p.x,2.25-p.y,dest.z-p.z).normalize().multiplyScalar(10);s.bolts.push({x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,life:3});e.timer=2.5;sfx('shot')}
   if(s.distance>e.at+25){e.hp=0;e.escaped=true;s.missed++;s.hp=Math.max(0,s.hp-5)}
  }
  const player=route(s.distance);for(const b of s.bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.life-=dt;if(Math.hypot(b.x-player.x,b.y-2.25,b.z-player.z)<.7){b.life=0;if(s.cover>0)s.dodged++;else{s.hp=Math.max(0,s.hp-5);sfx('hurt')}}}s.bolts=s.bolts.filter(b=>b.life>0);
  if(s.hp<=0){s.phase='down';notify('巡航中断，可返回本段入口。')}else if(s.distance>=LENGTH){s.won=s.kills>=9;s.phase=s.won?'won':'ended';s.score+=Math.round(s.hp*10);notify(s.won?'三个场景已通过，巡航训练完成。':'场景巡航结束。下次至少命中九台无人机。');sfx(s.won?'success':'hurt')}sync();
 }
 function sync(){
  const p=route(s.distance),look=route(s.distance+15);camera.position.set(p.x,p.y-(s.cover>0?1.12:0),p.z);camera.lookAt(look.x,look.y-.04,look.z);camera.updateMatrixWorld(true);weapon.position.z=-.68+(flash>0?.065:0);weapon.rotation.z=s.reload>0?-Math.sin(s.reload/1.05*Math.PI)*.75:0;
  sun.position.set(p.x+3,14,p.z+8);sun.target.position.set(p.x,0,p.z-12);for(const lamp of lamps)lamp.light.visible=Math.abs(lamp.at-s.distance)<34;
  s.enemies.forEach((e,i)=>{const object=enemies[i],point=position(e);object.position.set(point.x,point.y,point.z);object.rotation.y=s.elapsed*.12;object.rotation.z=Math.sin(e.age)*.12;object.visible=e.active&&e.hp>0;object.traverse(n=>{if(n.isMesh)n.material.emissiveIntensity=e.timer<.8?1.4:.22});object.updateMatrixWorld(true)});
  while(boltObjects.length<s.bolts.length){const object=new THREE.Mesh(boltGeo,boltMaterial);scene.add(object);boltObjects.push(object)}boltObjects.forEach((o,i)=>{const b=s.bolts[i];o.visible=!!b;if(b)o.position.set(b.x,b.y,b.z)});
  hud.querySelector('.nav-brand span').textContent=['外港廊桥','能源通道','星幕机房'][Math.min(2,Math.floor(s.distance/80))]+' · 船舱 '+Math.round(s.hp)+'%';hud.querySelector('.rail-counter b').textContent=s.reload>0?'换弹中':s.ammo+' / 9';hud.querySelector('.rail-counter span').textContent='停机 '+s.kills+'/12';hud.querySelector('.rail-track em').style.width=s.distance/LENGTH*100+'%';hud.querySelector('.rail-track span').textContent='镜头自动推进 · '+Math.round(s.distance)+' / 240 m';const reticle=hud.querySelector('.rail-reticle');reticle.style.left=s.aim.x/1120*100+'%';reticle.style.top=s.aim.y/630*100+'%';reticle.classList.toggle('hit',hitmark>0);hud.querySelector('.rail-cover').hidden=s.cover<=0;const end=hud.querySelector('.nav-end');end.hidden=s.phase==='ride';if(!end.hidden){end.querySelector('b').textContent=s.won?'回廊巡航完成':s.phase==='down'?'巡航中断':'巡航结束';end.querySelector('p').textContent='停机 '+s.kills+'/12 · 命中 '+s.hits+' · '+s.score+' 分'}
 }
 sync();return {tick,draw(){sync();world.draw()},getState:()=>({...structuredClone(s),length:LENGTH,enemies:s.enemies.map(e=>({...e,position:position(e),screen:projectPoint(camera,position(e))})),cameraPosition:camera.position.toArray()}),getStatus:()=>({goal:s.won?'三个场景巡航完成':s.phase==='down'?'返回本段入口':s.phase==='ended'?'巡航结束，重试命中目标':'随镜头巡航，击停至少九台无人机',message:'镜头沿三维回廊自动推进。鼠标移动瞄准，点击或按住 J 射击，方向键也可移动准星。R 换弹；目标闪红后会发射实际弹道，空格短暂压低镜头避开它们。',stats:['船舱 '+Math.round(s.hp)+'%','弹药 '+s.ammo+'/9','停机 '+s.kills+'/12','命中 '+s.hits+'/'+s.shots,'避弹 '+s.dodged],actions:s.won||s.phase==='ended'?[action('再次巡航',restart)]:s.phase==='down'?[action('返回本段入口',retry),action('再次巡航',restart)]:[action('射击 · J',shoot,s.reload>0),action('换弹 · R',reload,s.reload>0||s.ammo===9),action('压低镜头 · 空格',cover,s.cover>0)]}),dispose(){hud.remove();world.dispose()}};
}
