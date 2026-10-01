import * as THREE from 'three';
import {createIdentityWorld} from './identity-world.js';
import {teamRoles,teamState,teamSignals} from './team-cues.mjs';

export function createTeamWorld(scene){
  const cast=createIdentityWorld(scene,{roles:teamRoles,stateAt:teamState,signalsAt:teamSignals,showBrand:false});
  const room=new THREE.Group();scene.add(room);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=440;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const board=new THREE.Mesh(new THREE.PlaneGeometry(8.2,3.52),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));
  board.position.set(0,2.65,-1.4);room.add(board);
  const table=new THREE.Mesh(new THREE.BoxGeometry(7,.12,1.7),new THREE.MeshStandardMaterial({color:0x37434d,roughness:.85}));table.position.set(0,-.06,-.4);room.add(table);
  for(const x of [-2.8,2.8]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,.55,1),new THREE.MeshStandardMaterial({color:0x19242e}));leg.position.set(x,-.39,-.4);room.add(leg);}
  const windowFrame=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.3,.06),new THREE.MeshBasicMaterial({color:0x345064,transparent:true,opacity:.25}));windowFrame.position.set(-5,2.6,-3);room.add(windowFrame);
  const plant=new THREE.Group();const pot=new THREE.Mesh(new THREE.CylinderGeometry(.24,.17,.4,16),new THREE.MeshStandardMaterial({color:0xb3957c}));plant.add(pot);
  for(let i=0;i<4;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),new THREE.MeshStandardMaterial({color:0x648b74}));leaf.scale.set(.5,2,.5);leaf.position.set(Math.sin(i)*.17,.35+i*.08,0);leaf.rotation.z=(i-1.5)*.3;plant.add(leaf);}plant.position.set(4.4,0,-.6);room.add(plant);
  const box=(x,y,w,h,color,r=14)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  const text=(s,x,y,size=24,color='#263d4b')=>{ctx.font=`500 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.fillText(s,x,y);};
  let last='';
  function paint(phase){
    ctx.clearRect(0,0,1024,440);box(0,0,1024,440,'#e8ece6',24);
    text('拾光工作室 / 周一 09:30',36,49,22,'#61746d');text('第一次产品评审',36,112,39);
    text('项目：让爸妈也能独立完成预约',36,157,25);
    box(36,191,550,200,'#dce3dd');
    const copy={brief:['欢迎林夏，加入我们的第一周。','今天一起解决一个小问题。'],complex:['阿澈：功能齐全，才更方便？','林夏：但我妈妈，会从哪里开始？'],simple:['林夏：先给她一个清楚的入口。','阿澈：好，把其他功能往后放。'],prototype:['周野：这个版本，我来做出来。','一起检查：看得懂，按得下去。'],ready:['三个不同的人，完成同一件事。','保留各自特点，让事情更简单。']}[phase];
    copy.forEach((s,i)=>text(s,57,244+i*44,24));
    text(phase==='ready'?'✓ 第一版，可以开始试用了。':'同一个目标 / 更少的犹豫',57,361,22,phase==='ready'?'#29705b':'#718278');
    box(640,30,320,380,'#253d48',30);box(655,53,290,335,'#f7f8f1',22);
    text('预约服务',678,105,28);text('为你留一个清楚的开始',678,142,18,'#75857e');
    if(phase==='complex'){
      ['在线预约','服务查询','更多工具'].forEach((s,i)=>{box(675,170+i*60,250,48,['#bfaad9','#b2ced1','#ddd0ad'][i]);text(s,727,202+i*60,21);});
    }else{box(675,195,250,68,phase==='brief'?'#d7dfd8':'#9ed7be');text(phase==='brief'?'我们先画一张草图':'开始预约',726,238,phase==='brief'?18:26);text(phase==='ready'?'✓ 原型已准备好':'一次，只做一件事',710,330,19,'#5b7c70');}
    texture.needsUpdate=true;
  }
  function update(visible,beat,camera){
    room.visible=visible;cast.update(visible,beat,camera);if(!visible)return;
    const state=teamState(beat);if(state.board!==last){last=state.board;paint(last);}
    board.position.y=2.65;board.rotation.y=0;
  }
  return {update};
}
