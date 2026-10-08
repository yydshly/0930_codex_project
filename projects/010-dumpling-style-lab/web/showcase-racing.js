import * as THREE from './vendor/showcase/three.module.js';
import {GLTFLoader} from './vendor/showcase/GLTFLoader.js';
import {clamp,action,safeSaved} from './showcase-core.js';

const LENGTH=1800,HALF_ROAD=5;
const defaults={distance:0,speed:0,lateral:-1.8,integrity:100,boost:100,elapsed:0,checkpoint:0,collisions:0,offroadTime:0,passed:[],camera:'chase',won:false,phase:'active',rivals:[{id:0,d:35,l:1.9,v:24},{id:1,d:90,l:-1.8,v:26},{id:2,d:145,l:1.8,v:28},{id:3,d:210,l:-1.8,v:25}]};
const center=d=>new THREE.Vector3(22*Math.sin(d/130)+11*Math.sin(d/57),1.2*Math.sin(d/100),-d);
function frameAt(d){const p=center(d),t=center(d+1).sub(p).normalize(),right=new THREE.Vector3(-t.z,0,t.x).normalize();return {p,t,right}}
function location(d,l=0){const f=frameAt(d);return f.p.addScaledVector(f.right,l)}
function ribbon(a,b,color,height=0){
 const positions=[],colors=[],indices=[];
 for(let i=0;i<=Math.ceil(LENGTH/6);i++){const d=Math.min(LENGTH,i*6),f=frameAt(d),c=new THREE.Color(typeof color==='function'?color(i):color);for(const l of [a,b]){const p=f.p.clone().addScaledVector(f.right,l);positions.push(p.x,p.y+height,p.z);colors.push(c.r,c.g,c.b)}if(i){const n=i*2;indices.push(n-2,n-1,n,n-1,n+1,n)}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,side:THREE.DoubleSide}));mesh.receiveShadow=true;return mesh;
}
function cloneModel(gltf,height){const group=new THREE.Group(),object=gltf.scene.clone(true),box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),middle=box.getCenter(new THREE.Vector3());object.position.set(-middle.x,-box.min.y,-middle.z);group.add(object);group.scale.setScalar(height/size.y);object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});return group}

export async function createRacing({host,input,saved,notify,sfx}){
 const loader=new GLTFLoader(),names=['raceCarOrange','raceCarRed','raceCarWhite','raceCarGreen','treeLarge','treeSmall','grandStand','pitsGarage','overhead','flagCheckers','rail','bannerTowerRed'],models={};
 await Promise.all(names.map(async n=>models[n]=await loader.loadAsync('assets/game-forms/coast/'+n+'.glb')));
 await Promise.all(['tree_palmDetailedTall','tree_pineRoundA','rock_largeA','rock_tallA'].map(async n=>models[n]=await loader.loadAsync('assets/showcase/nature/'+n+'.glb')));
 const s=safeSaved(saved,defaults);s.rivals=defaults.rivals.map(r=>({...r,...s.rivals?.find(old=>old.id===r.id)}));s.passed=Array.isArray(s.passed)?s.passed:[];
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b9dde2');scene.fog=new THREE.Fog('#b9dde2',100,310);
 const camera=new THREE.PerspectiveCamera(57,16/9,.1,650),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(1120,630,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const element=renderer.domElement;element.className='play-canvas';element.tabIndex=0;element.setAttribute('aria-label','真实三维海岸赛道，方向键驾驶，空格加速，E切换车后与车头镜头');host.append(element);
 scene.add(new THREE.HemisphereLight(0xe4f7ff,0x71836d,1.25));const sun=new THREE.DirectionalLight(0xffe0b6,2.1);sun.position.set(-30,55,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-35;sun.shadow.camera.right=sun.shadow.camera.top=35;sun.shadow.camera.far=160;sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(2600,3600),new THREE.MeshStandardMaterial({color:0x318f9c,roughness:.36,metalness:.22}));sea.rotation.x=-Math.PI/2;sea.position.set(0,-7,-850);scene.add(sea);
 scene.add(ribbon(-23,23,'#d5c49c',-.17),ribbon(-13,13,'#bba978',-.08),ribbon(-HALF_ROAD,HALF_ROAD,'#46555a',0));
 scene.add(ribbon(-5.35,-5,i=>i%4<2?'#f2ede0':'#ca775e',.025),ribbon(5,5.35,i=>i%4<2?'#f2ede0':'#ca775e',.025));
 scene.add(ribbon(-4.5,-4.4,'#e7e1cf',.035),ribbon(4.4,4.5,'#e7e1cf',.035));
 const dashGeometry=new THREE.PlaneGeometry(.14,3),dashMaterial=new THREE.MeshStandardMaterial({color:0xffe3a4,roughness:.8});
 const dashes=new THREE.InstancedMesh(dashGeometry,dashMaterial,Math.ceil(LENGTH/9)),dummy=new THREE.Object3D();
 for(let i=0;i<dashes.count;i++){const d=i*9,f=frameAt(d);dummy.position.copy(f.p);dummy.position.y+=.04;dummy.rotation.set(-Math.PI/2,0,Math.atan2(f.t.x,-f.t.z));dummy.updateMatrix();dashes.setMatrixAt(i,dummy.matrix)}scene.add(dashes);
 const decorations=[];
 function put(name,d,l,height,rotation=0){const object=cloneModel(models[name],height),f=frameAt(d);object.position.copy(location(d,l));object.rotation.y=Math.atan2(f.t.x,f.t.z)+rotation;scene.add(object);decorations.push({object,d});return object}
 for(let d=10;d<LENGTH;d+=18){const side=Math.floor(d/18)%2?-1:1;put(Math.floor(d/18)%3?'tree_palmDetailedTall':'tree_pineRoundA',d,side*(10+Math.sin(d)*2),5.5+Math.sin(d/11));if(d%54<18)put('rail',d,-6.3,.55,Math.PI/2);if(d%36<18)put('rock_largeA',d+7,side*18,3.5+Math.sin(d/17))}
 for(const d of [55,650,1225]){put('grandStand',d,14,4.5,Math.PI/2);put('pitsGarage',d+18,15,3.4,Math.PI/2);put('bannerTowerRed',d-8,7.8,5)}
 for(const d of [0,600,1200,LENGTH-8]){const object=put('overhead',d,0,4.8,0);object.position.y-=.06;put('flagCheckers',d+2,-6.3,3.5)}
 // Far island silhouettes are separate scenery and the road remains fully three dimensional.
 for(let i=0;i<18;i++){const island=cloneModel(models.rock_tallA,32+(i%4)*12);island.position.set(i%2?100:-105,-7,-i*110);island.scale.x*=1.6;island.scale.z*=1.7;island.rotation.y=i;scene.add(island)}
 const cloudTexture=await new THREE.TextureLoader().loadAsync('assets/game-forms/skyline/cloud.webp');cloudTexture.colorSpace=THREE.SRGBColorSpace;const cloudMaterial=new THREE.MeshBasicMaterial({map:cloudTexture,transparent:true,opacity:.65,depthWrite:false,fog:true}),cloudGeometry=new THREE.PlaneGeometry(50,35);
 for(let i=0;i<14;i++){const cloud=new THREE.Mesh(cloudGeometry,cloudMaterial);cloud.position.set(i%2?-60:80,45+(i%3)*9,-i*150-120);scene.add(cloud)}
 const car=cloneModel(models.raceCarOrange,.92);scene.add(car);
 car.traverse(n=>{if(n.isMesh){n.material=n.material.clone();if(n.material.name==='pylon'){n.material.color.set('#e97741');n.material.metalness=.2;n.material.roughness=.38}if(n.material.name==='carTire')n.material.color.set('#18272c');if(n.material.name==='glass'){n.material.color.set('#193b49');n.material.metalness=.35;n.material.roughness=.2}}});
 const rivalObjects=s.rivals.map((r,i)=>{const object=cloneModel(models[['raceCarRed','raceCarWhite','raceCarGreen','raceCarRed'][i]],.92);scene.add(object);return object});
 const hud=document.createElement('div');hud.className='racing-hud';hud.innerHTML='<div class="race-route"><small>COAST / CIRCUIT</small><b>海岸疾驰</b><span class="race-progress"></span><i><em></em></i></div><div class="race-instruments"><strong>0</strong><small>KM/H</small><div class="race-position"></div></div><div class="race-boost"><span></span><i><em></em></i></div><div class="race-cue"></div><svg class="race-map" viewBox="0 0 100 150" aria-hidden="true"><path/><circle r="4"/></svg><div class="race-end" hidden><small></small><b></b><span></span></div>';host.append(hud);
 const progress=hud.querySelector('.race-progress'),meter=hud.querySelector('.race-route em'),speedText=hud.querySelector('.race-instruments strong'),place=hud.querySelector('.race-position'),boostText=hud.querySelector('.race-boost span'),boostMeter=hud.querySelector('.race-boost em'),cue=hud.querySelector('.race-cue'),end=hud.querySelector('.race-end');
 const mapPath=hud.querySelector('.race-map path');mapPath.setAttribute('d',Array.from({length:61},(_,i)=>{const d=i*LENGTH/60,p=center(d);return (i?'L':'M')+(50+p.x*.7).toFixed(1)+','+(138-d/LENGTH*125).toFixed(1)}).join(' '));
 let hitCD=0,boostLatch=0,shake=0,engineTick=0,lastStage=s.checkpoint,viewReady=false;
 const resize=()=>{const w=host.clientWidth||1120,h=host.clientHeight||630;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(host);
 function boost(){if(s.boost>15&&s.phase==='active'&&!s.won)boostLatch=1}
 function switchCamera(){s.camera=s.camera==='chase'?'hood':'chase';viewReady=false;sfx('turn')}
 function retry(){if(s.phase!=='down')return;s.distance=s.checkpoint;s.lateral=-1.8;s.speed=0;s.integrity=100;s.phase='active';hitCD=2;viewReady=false;notify('返回最近赛段标记。按住向前加速，沿弯道转向。')}
 function restart(){Object.assign(s,structuredClone(defaults));hitCD=boostLatch=shake=engineTick=lastStage=0;viewReady=false;syncWorld();notify('新的海岸赛段开始了，按住 W 或向前加速。')}
 function tick(dt){
  hitCD=Math.max(0,hitCD-dt);shake=Math.max(0,shake-dt);boostLatch=Math.max(0,boostLatch-dt);if(s.won||s.phase==='down')return;s.elapsed+=dt;
  if(input.pressed.has('KeyE'))switchCamera();const boosting=(input.keys.has('Space')||boostLatch>0)&&s.boost>0&&s.speed>5,throttle=input.keys.has('KeyW')||input.keys.has('ArrowUp'),brake=input.keys.has('KeyS')||input.keys.has('ArrowDown');
  s.boost=clamp(s.boost+(boosting?-23:7)*dt,0,100);const offroad=Math.abs(s.lateral)>HALF_ROAD-.6,max=offroad?23:boosting?64:44;
  s.speed=clamp(s.speed+((throttle?23:boosting?27:-9)-(brake?52:0))*dt,0,max);
  const p=s.distance,curve=-22/(130*130)*Math.sin(p/130)-11/(57*57)*Math.sin(p/57);
  s.lateral=clamp(s.lateral+input.x*(2+s.speed*.15)*dt-curve*s.speed*s.speed*.24*dt,-11,11);
  s.distance=Math.min(LENGTH,s.distance+s.speed*dt);if(offroad){s.offroadTime+=dt;if(s.speed>12)s.integrity=Math.max(0,s.integrity-dt*1.5)}
  for(const r of s.rivals){r.d=Math.min(LENGTH,r.d+r.v*dt);if(s.distance>r.d+3&&!s.passed.includes(r.id)){s.passed.push(r.id);sfx('pickup');notify('完成一次超越。保持速度，下一段弯道正在接近。')}if(Math.abs(s.distance-r.d)<3&&Math.abs(s.lateral-r.l)<1.45&&hitCD===0){s.speed*=.55;s.integrity=Math.max(0,s.integrity-15);s.lateral+=s.lateral>r.l?1.1:-1.1;s.collisions++;hitCD=1.3;shake=.24;sfx('hurt')}}
  s.checkpoint=Math.min(1200,Math.floor(s.distance/600)*600);if(s.checkpoint>lastStage){lastStage=s.checkpoint;notify('赛段标记已通过，当前进度已保存。');sfx('door')}
  if(s.integrity<=0){s.phase='down';notify('车辆需要维修，可返回最近赛段。')}else if(s.distance>=LENGTH){s.won=true;sfx('success');notify('海岸赛段完成。时间 '+s.elapsed.toFixed(1)+' 秒，完成超越 '+s.passed.length+' 次。')}
  engineTick-=dt;if(s.speed>5&&engineTick<=0){sfx(boosting?'engineBoost':'engine',s.speed);engineTick=.22}syncWorld(dt,boosting,offroad);
 }
 function syncWorld(dt=0,boosting=false,offroad=false){
  const f=frameAt(s.distance),position=location(s.distance,s.lateral);car.position.copy(position);car.rotation.y=Math.atan2(f.t.x,f.t.z)+input.x*.09;car.rotation.z=-input.x*.028;car.visible=s.camera==='chase';
  s.rivals.forEach((r,i)=>{const object=rivalObjects[i],f=frameAt(r.d);object.position.copy(location(r.d,r.l));object.rotation.y=Math.atan2(f.t.x,f.t.z);object.visible=Math.abs(r.d-s.distance)<240});
  for(const d of decorations)d.object.visible=Math.abs(d.d-s.distance)<235;
  const eye=position.clone(),look=location(s.distance+(s.camera==='hood'?35:18),s.lateral*.65);
  if(s.camera==='chase'){eye.addScaledVector(f.t,-8.7-s.speed*.023);eye.y+=4.1}else{eye.addScaledVector(f.t,.7);eye.y+=1.05}
  if(shake>0){eye.x+=(Math.random()-.5)*.13;eye.y+=(Math.random()-.5)*.1}look.y+=.9;
  if(!viewReady||!dt)camera.position.copy(eye);else camera.position.lerp(eye,Math.min(1,dt*8));camera.lookAt(look);viewReady=true;camera.fov=57+(boosting?7:s.speed/44*2);camera.updateProjectionMatrix();
  sun.position.copy(position).add(new THREE.Vector3(-30,55,20));sun.target.position.copy(position);
  progress.textContent=(s.distance/1000).toFixed(2)+' / 1.80 KM';meter.style.width=s.distance/LENGTH*100+'%';speedText.textContent=Math.round(s.speed*3.6);place.textContent='位置 '+(1+s.rivals.filter(r=>r.d>s.distance).length)+' / 5';boostText.textContent='加速能量 '+Math.round(s.boost)+'%';boostMeter.style.width=s.boost+'%';
  cue.textContent=s.won?'赛段完成':s.phase==='down'?'车辆需要维修':offroad?'离开路面 · 减速返回':boosting?'加速推进':s.speed<2?'按住 W / ↑ 加速 · A/D 转向':Math.abs(Math.sin(s.distance/57))>.65?'弯道接近 · 留意转向':'海岸直道 · 寻找超车路线';
  const mp=center(s.distance);hud.querySelector('.race-map circle').setAttribute('cx',50+mp.x*.7);hud.querySelector('.race-map circle').setAttribute('cy',138-s.distance/LENGTH*125);
  end.hidden=!(s.won||s.phase==='down');if(!end.hidden){end.querySelector('small').textContent=s.won?'FINISH / COAST':'PIT / REPAIR';end.querySelector('b').textContent=s.won?'海岸赛段完成':'返回赛段，再出发';end.querySelector('span').textContent=s.won?s.elapsed.toFixed(1)+' 秒 · 超越 '+s.passed.length+' 次 · 车况 '+Math.round(s.integrity)+'%':'点击下方「返回最近赛段」'}
 }
 syncWorld();
 function dispose(){observer.disconnect();hud.remove();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss();element.remove()}
 return {tick,draw:()=>{if(!viewReady)syncWorld();renderer.render(scene,camera)},getState:()=>structuredClone(s),getStatus:()=>({goal:s.won?'海岸赛段完成':s.phase==='down'?'返回最近赛段':'沿海岸弯道驶过 1.80 KM',message:'W / ↑ 加速，S / ↓ 刹车，A/D 转向。空格消耗能量加速，E 切换车后 / 车头镜头。驶出路面会减速。',stats:['车况 '+Math.round(s.integrity)+'%','超越 '+s.passed.length+' 次','赛段 '+Math.min(3,Math.floor(s.distance/600)+1)+'/3','时间 '+s.elapsed.toFixed(1)+' 秒'],actions:s.phase==='down'?[action('返回最近赛段',retry)]:s.won?[action('再跑一次',restart)]:[action('加速推进 · 空格',boost,s.boost<15),action('镜头：'+(s.camera==='chase'?'车后':'车头')+' · E',switchCamera)]}),dispose};
}
