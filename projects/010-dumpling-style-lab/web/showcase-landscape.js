import * as THREE from './vendor/showcase/three.module.js';
import {clamp,action,safeSaved} from './showcase-core.js';
import {roomBase,loadModels,put,light,sign,batchStatic,hasBridge} from './showcase-spatial.js';

const cellKey=(x,z)=>Math.round(x)+':'+Math.round(z);
const shore=[1,3,4,4,4,3,4,4,4,4,4,4,4,4,4,4,4,4,4,3,1];
const gemsAt=[[-5,0,-2],[2,0,3],[7,1.25,-3]];

export async function createLandscape({host,input,saved,notify,sfx,mode='expedition'}) {
  const builder=mode==='builder',world=roomBase(host,false),{scene,camera}=world;
  const [art,nature]=await Promise.all([
    loadModels('platform3d',['block-grass-low','jewel','character-oopi','star','crate','flag']),
    loadModels('nature',['ground_grass','cliff_block_rock','tree_oak','tree_pineRoundA','tree_palm','rock_largeA','rock_largeC','rock_tallA','plant_bush','grass_large','flower_yellowA','flower_purpleA','tent_smallOpen','campfire_stones','log_stack','statue_column','statue_columnDamaged','statue_ring','statue_obelisk','path_stone','bridge_center_wood','canoe','sign'])
  ]);
  const s=safeSaved(saved,{x:-7,z:0,py:0,vy:0,camYaw:.65,camDistance:10.2,camPitch:.546,stones:[],blocks:{},stock:8,removed:0,selected:{x:0,z:0},won:false,checkpoint:{x:-7,z:0},falls:0,visited:[]});
  scene.background=new THREE.Color(builder?'#b5dfe1':'#bdceda');scene.fog=new THREE.Fog(scene.background,18,52);
  const actor=put(scene,art['character-oopi'],s.x,s.py,s.z,1.5),mixer=new THREE.AnimationMixer(actor);
  const clips=Object.fromEntries(art['character-oopi'].animations.map(c=>[c.name,mixer.clipAction(c)]));
  let animation='',time=0,footstep=0;
  function play(name){if(animation===name||!clips[name])return;clips[animation]?.fadeOut(.18);clips[name].reset().fadeIn(.18).play();animation=name}
  play('idle');
  const terrain=new Map(),stones=[],decor=[],colliders=[];
  function land(x,z) {
    if(x<-10||x>10||Math.abs(z)>(shore[x+10]??0))return -8;
    if(builder&&x>=0&&x<=2)return s.blocks[cellKey(x,z)]?0:-8;
    if(!builder&&x>=5&&z<=-2)return 1.25;
    if(!builder&&x===4&&z<=-2)return .3;
    return 0;
  }
  function bridge(x,z) {
    const o=put(scene,nature.bridge_center_wood,x,-.23,z,1);
    o.rotation.y=Math.PI/2;terrain.set(cellKey(x,z),o);return o;
  }
  for(let x=-10;x<=10;x++)for(let z=-4;z<=4;z++) {
    const h=land(x,z);if(h<-5)continue;
    if(builder&&x>=0&&x<=2){bridge(x,z);continue}
    const cliff=put(scene,nature.cliff_block_rock,x,h-2,z,1);cliff.scale.y=2;
    const grass=put(scene,nature.ground_grass,x,h+.006,z,1);
    decor.push(cliff,grass);
    if(z===0)decor.push(put(scene,nature.path_stone,x,h+.015,z,.8));
  }
  const trees=[[-9,-2.5],[-8,-3.7],[-6.7,-3.8],[-3.5,-3.7],[4,-3.7],[8.8,-3.7],[-9,2.6],[9.4,2.5]];
  trees.forEach(([x,z],i)=>{
    const h=land(Math.round(x),Math.round(z));if(h<-5)return;
    decor.push(put(scene,nature[builder&&i%3===0?'tree_palm':i%3===1?'tree_pineRoundA':'tree_oak'],x,h,z,2.5+(i%2)*.5,i*.7));
    colliders.push({x,z,r:.38});
  });
  for(const [i,[x,z]] of [[-8.5,-1.3],[-4,3],[4,3.3],[9,-1.5],[-9.5,.6],[5,-3.8]].entries()) {
    const h=land(Math.round(x),Math.round(z));if(h<-5)continue;
    decor.push(put(scene,nature[i%2?'rock_largeC':'rock_largeA'],x,h,z,1.6,i));
  }
  // Authored plants form clusters around the shore, leaving the walking trail readable.
  for(let i=0;i<45;i++) {
    const x=-9+(i*7%19),z=(i%2?1:-1)*(2.8+(i%3)*.35),h=land(Math.round(x),Math.round(z));
    if(h<-5||gemsAt.some(p=>Math.hypot(p[0]-x,p[2]-z)<1.2))continue;
    decor.push(put(scene,nature[i%5===0?'flower_purpleA':i%3===0?'flower_yellowA':i%2?'plant_bush':'grass_large'],x,h,z,i%2?.6:1,i*.3));
  }
  decor.push(put(scene,nature.tent_smallOpen,-8,0,1.8,2.4,Math.PI/2),put(scene,nature.log_stack,-8.3,0,2.8,1.4),put(scene,nature.campfire_stones,-6.2,0,2.2,1.5));
  const campLight=light(scene,-6.2,.5,2.2,0xffa253,3,4);
  decor.push(put(scene,nature.canoe,-9.2,-.75,4.1,2,Math.PI/3));
  for(const [x,z,broken] of [[6,-3.5,false],[8.1,-3.5,false],[5.5,-1.9,true]])decor.push(put(scene,nature[broken?'statue_columnDamaged':'statue_column'],x,Math.max(0,land(Math.round(x),Math.round(z))),z,2.3));
  const gate=put(scene,nature.statue_ring,8,0,1,3.2),obelisk=put(scene,nature.statue_obelisk,9,0,.4,2.5);
  decor.push(gate,obelisk);
  const beacon=put(scene,art.star,8,2.6,1,.5),gateGlow=light(scene,8,2.7,1,0xffdb8a,1,7);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(130,130,28,28),new THREE.MeshStandardMaterial({color:builder?0x4ca7ad:0x51849c,metalness:.25,roughness:.3,transparent:true,opacity:.93}));
  sea.rotation.x=-Math.PI/2;sea.position.y=-1.15;scene.add(sea);
  const waterPositions=sea.geometry.attributes.position,waterBase=Float32Array.from(waterPositions.array);
  // Background cliffs use the same imported meshes as the playable island.
  for(const [x,z,scale] of [[-21,-15,9],[-13,-22,12],[7,-24,14],[24,-17,10]]) {
    decor.push(put(scene,nature.rock_largeA,x,-1.3,z,scale),put(scene,nature.rock_largeC,x+scale*.2,-1.3,z+2,scale*.7),put(scene,nature.tree_pineRoundA,x,-1.3+scale*.23,z,scale*.3));
  }
  if(!builder)gemsAt.forEach((pos,i)=> {
    const gem=put(scene,art.jewel,pos[0],pos[1]+.9,pos[2],1.1);gem.userData.index=i;gem.visible=!s.stones.includes(i);stones.push(gem);
    decor.push(put(scene,nature.statue_columnDamaged,pos[0],pos[1],pos[2],.7));
  });
  decor.push(put(scene,nature.sign,-6.4,0,-1.1,1.5),put(scene,nature.sign,7.2,0,1.8,1.4));
  batchStatic(scene,decor);
  const selection=put(scene,art['block-grass-low'],0,.03,0,1);
  selection.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.transparent=true;n.material.opacity=.5;n.material.color.set('#d4fbe9')}});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(22,10),new THREE.MeshBasicMaterial({visible:false}));plane.rotation.x=-Math.PI/2;scene.add(plane);
  const hud=document.createElement('div');hud.className='scene-hud landscape-hud';host.append(hud);
  const map=document.createElement('canvas');map.width=224;map.height=108;map.className='island-map';map.setAttribute('aria-label','岛屿地图，显示道路、目标与当前位置');host.append(map);const mapCtx=map.getContext('2d');

  function build() {
    if(!builder||s.won)return;const {x,z}=s.selected,k=cellKey(x,z);
    if(x<0||x>2||Math.abs(z)>4){notify('选择两岸之间的水面格子。');return}
    if(s.blocks[k]){notify('这里已有桥面，可以回收再调整。');return}
    if(!s.stock){notify('木料不足。回收不需要的桥面，可以继续修路。');return}
    s.blocks[k]=true;s.stock--;bridge(x,z);sfx('build');
    notify(hasBridge(s.blocks)?'桥已接通两岸。沿桥走到灯塔，按 E 点亮它。':'桥面已经落稳。还需要连续连接到对岸。');
  }
  function mine() {
    if(!builder||s.won)return;const k=cellKey(s.selected.x,s.selected.z);
    if(!s.blocks[k]){notify('只能回收你放置的桥面。');return}
    delete s.blocks[k];s.stock++;s.removed++;scene.remove(terrain.get(k));terrain.delete(k);sfx('pickup');
  }
  function selectNext() {
    const x=s.selected.x>=2?0:Math.max(0,s.selected.x+1);s.selected={x,z:s.selected.z};
  }
  function interact() {
    if(Math.hypot(s.x-8,s.z-1)>=2){notify('走到归航门旁边，再按 E。');return}
    if(builder?hasBridge(s.blocks):s.stones.length===3){s.won=true;gateGlow.intensity=16;sfx('success');notify(builder?'桥面承住了你的脚步。灯塔亮起，海上的人终于看见回家的方向。':'三处遗址的灯石汇聚在这里。海上的归航灯，亮了。')}
    else notify(builder?'灯塔需要一条真实连接两岸的路。':'归航门还在等另外的灯石。地图上金色的标记是未找到的遗址。');
  }
  function syncView() {
    const connected=builder?hasBridge(s.blocks):s.stones.length===3;
    gateGlow.intensity=s.won?16:connected?10:1;beacon.visible=connected;beacon.rotation.y=time;
    selection.visible=builder&&!s.won;selection.position.set(s.selected.x,s.blocks[cellKey(s.selected.x,s.selected.z)]?.09:-.02,s.selected.z);
    camera.position.set(s.x+Math.sin(s.camYaw)*s.camDistance,1+Math.tan(s.camPitch)*s.camDistance+s.py*.45,s.z+Math.cos(s.camYaw)*s.camDistance);camera.lookAt(s.x,1+s.py*.25,s.z);
    actor.position.set(s.x,s.py,s.z);
    hud.textContent=s.won?'归航灯已亮起':builder?'木料 '+s.stock+' · '+(connected?'桥已接通，前往灯塔':'点击水面选择 · 建造 / 回收'):'灯石 '+s.stones.length+'/3 · '+(s.x>=4?'东岸 · 高台遗址':s.z>1.5?'南岸 · 临海祭坛':'西岸 · 露营旧路');
    mapCtx.clearRect(0,0,224,108);mapCtx.fillStyle='#102536dc';mapCtx.fillRect(0,0,224,108);
    for(let x=-10;x<=10;x++)for(let z=-4;z<=4;z++)if(land(x,z)>-5){mapCtx.fillStyle=builder&&x>=0&&x<=2?'#d6b585':!builder&&land(x,z)>.5?'#afbea3':'#657f68';mapCtx.fillRect(7+(x+10)*10,10+(z+4)*9,9,8)}
    if(!builder)gemsAt.forEach((p,i)=>{mapCtx.fillStyle=s.stones.includes(i)?'#a8b5a7':'#ffd77c';mapCtx.beginPath();mapCtx.arc(11+(p[0]+10)*10,14+(p[2]+4)*9,3,0,Math.PI*2);mapCtx.fill()});
    mapCtx.fillStyle='#fff2bf';mapCtx.fillRect(7+18*10,10+5*9,7,7);
    mapCtx.fillStyle='#78edf0';mapCtx.beginPath();mapCtx.arc(11+(s.x+10)*10,14+(s.z+4)*9,4,0,Math.PI*2);mapCtx.fill();
  }
  syncView();
  return {...world,getState:()=>s,getStatus:()=>({
    goal:s.won?'归航灯已亮起':builder?'造桥连接两岸，亲自走到灯塔':'寻找三枚灯石，攀上遗址高台，点亮归航门',
    message:s.won?'海上的人看见了这束光。你走过的路留在岛上。':builder?'木桥会真实承重。点击水面或使用「选择下一格」，建好后沿桥走向东岸。':'地图上的金色标记是灯石。空格跳跃可以登上东岸高台，落水会回到最近的营地。',
    stats:builder?['木料 '+s.stock,'桥面 '+Object.keys(s.blocks).length,'连接 '+(hasBridge(s.blocks)?'已接通':'待完成'),'落水 '+s.falls+' 次']:['灯石 '+s.stones.length+' / 3','遗址 '+s.visited.length+' / 3','落水 '+s.falls+' 次'],
    actions:[...(builder?[action('建造方块',build,s.stock<=0||s.won),action('挖回方块',mine,s.won),action('选择下一格',selectNext,s.won),action('激活灯塔 E',interact,s.won)]:[action('激活归航门 E',interact,s.won)]),action('拉近镜头',()=>s.camDistance=clamp(s.camDistance-1.5,6,16)),action('拉远镜头',()=>s.camDistance=clamp(s.camDistance+1.5,6,16)),action('镜头复位',()=>{s.camYaw=.65;s.camDistance=10.2;s.camPitch=.546})]
  }),tick(dt) {
    time+=dt;campLight.intensity=3+Math.sin(time*9)*.3;mixer.update(dt);
    if(s.won){syncView();return}
    s.camYaw-=input.look.x*.004;s.camPitch=clamp(s.camPitch+input.look.y*.003,.25,1.05);
    const dx=Math.cos(s.camYaw)*input.x+Math.sin(s.camYaw)*input.y,dz=-Math.sin(s.camYaw)*input.x+Math.cos(s.camYaw)*input.y,norm=Math.hypot(dx,dz)||1;
    const nx=s.x+dx/norm*3.3*dt,nz=s.z+dz/norm*3.3*dt,nh=land(Math.round(nx),Math.round(nz));
    if(nh<=s.py+.4&&!colliders.some(c=>Math.hypot(nx-c.x,nz-c.z)<c.r+.18)){s.x=clamp(nx,-10.6,10.6);s.z=clamp(nz,-4.8,4.8)}
    const h=land(Math.round(s.x),Math.round(s.z)),grounded=s.py<=h+.02&&s.vy<=0;
    if(input.pressed.has('Space')&&grounded){s.vy=7.6;sfx('jump')}
    s.vy-=15*dt;s.py+=s.vy*dt;if(s.py<h){s.py=h;s.vy=0}
    if(s.py<-5){s.x=s.checkpoint.x;s.z=s.checkpoint.z;s.py=0;s.vy=0;s.falls++;notify('回到最近的营地。取得的灯石和搭好的桥面都保留。');sfx('hurt')}
    if(dx||dz){actor.rotation.y=Math.atan2(dx,dz);footstep+=dt;if(grounded&&footstep>.37){footstep=0;sfx('step')}}
    play(!grounded?(s.vy>0?'jump':'fall'):(dx||dz)?'walk':'idle');
    if(s.x>3&&s.py<.1)s.checkpoint={x:4,z:0};
    for(const gem of stones) {
      const i=gem.userData.index;gem.visible=!s.stones.includes(i);gem.rotation.y=time;gem.position.y=gemsAt[i][1]+.9+Math.sin(time*2+i)*.13;
      if(gem.visible&&Math.hypot(s.x-gem.position.x,s.z-gem.position.z)<.8&&Math.abs(s.py+1-gem.position.y)<1){s.stones.push(i);if(!s.visited.includes(i))s.visited.push(i);notify(['西岸灯石：这条旧路曾送回许多人。','南岸灯石：潮水仍记得靠岸的船。','高台灯石：最后一束光等待着你。'][i]);sfx('pickup')}
    }
    if(input.pressed.has('KeyE'))interact();
    if(input.pointers.length&&builder) {
      const p=input.pointers.at(-1),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(p.x/1120*2-1,-p.y/630*2+1),camera);
      const hit=ray.intersectObject(plane)[0];if(hit)s.selected={x:clamp(Math.round(hit.point.x),-10,10),z:clamp(Math.round(hit.point.z),-4,4)};
    }
    for(let i=0;i<waterPositions.count;i++)waterPositions.setZ(i,Math.sin(waterBase[i*3]*.5+time)*.035+Math.cos(waterBase[i*3+1]*.4+time*.6)*.035);
    waterPositions.needsUpdate=true;syncView();
  },draw:world.draw,dispose(){hud.remove();map.remove();world.dispose()}};
}
