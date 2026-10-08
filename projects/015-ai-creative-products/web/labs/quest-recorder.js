import {T,solid,box} from './four-playable-stage.js';
import {rounded,tube} from './games-art.js';
import {createRecorderFace} from './quest-recorder-face.js';

function sphere(rx,ry,rz,color,x=0,y=0,z=0,options={}){const m=solid(new T.SphereGeometry(1,16,12),color,options);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}

// Keep each joint's transform, but draw identical parts with GPU instances.
// The batch belongs solely to this mounted quest, never the shared street batch.
export function batchRecorders(scene,actors){
 const buckets=new Map();
 function geometryKey(g){let hash=2166136261;for(const key of ['position','normal','uv'])for(const n of g.attributes[key]?.array||[]){hash^=Math.round(n*1e6);hash=Math.imul(hash,16777619);}return g.type+'|'+g.attributes.position.count+'|'+(g.index?.count||0)+'|'+(hash>>>0);}
 actors.forEach(actor=>actor.root.traverse(o=>{if(!o.isMesh)return;const m=o.material,key=geometryKey(o.geometry)+'|'+[m.type,m.color.getHex(),m.roughness,m.metalness,m.opacity,m.transparent,m.depthWrite,m.side].join('|');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);o.visible=false;}));
 const batches=[...buckets.values()].map(parts=>{const mesh=new T.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;scene.add(mesh);return {mesh,parts};});
 const hidden=new T.Matrix4().makeTranslation(0,-1000,0);
 return {count:batches.length,update(){scene.updateMatrixWorld(true);batches.forEach(({mesh,parts})=>{parts.forEach((part,i)=>mesh.setMatrixAt(i,part.userData.recorderStamp&&!part.userData.recorderStamp.visible?hidden:part.matrixWorld));mesh.instanceMatrix.needsUpdate=true;});}};
}

// Case 02 only: connected, stylized joints driven by actual quest events.
// This is our response choreography; the source game's animation method is unknown.
export function createRecorder(site,index){
 const root=new T.Group(),body=new T.Group(),head=new T.Group(),arms=[],coat='#657c70',skin='#c7b397',face=createRecorderFace(skin,index);
 root.position.set(site.x+2.7,0,site.z-.8);body.position.y=.94;root.add(body);
 body.add(sphere(.24,.39,.17,coat,0,.19,0,{roughness:.85}),rounded(.37,.36,.19,.05,'#263e35',0,.36,-.23),box(.32,.04,.02,'#273d33',0,-.03,.17),box(.027,.25,.024,'#a7aea0',0,.26,.192),rounded(.11,.17,.025,.012,'#324c40',0,.48,.148),rounded(.047,.043,.012,.005,'#9b9e83',0,-.03,.189,{metalness:.5,roughness:.55}));
 for(const s of [-1,1]){
  root.add(sphere(.1,.31,.11,'#2b3c39',s*.13,.46,0),rounded(.2,.15,.4,.04,'#20302d',s*.13,.082,.08));
  body.add(rounded(.1,.1,.024,.012,'#263e35',s*.12,.35,.184));
  const lapel=rounded(.12,.17,.025,.015,'#92a08a',s*.075,.465,.16);lapel.rotation.z=s*.32;body.add(lapel,box(.103,.008,.008,'#a8b198',s*.12,.394,.201),sphere(.009,.009,.005,'#b7b9a0',s*.12,.363,.202));
  const shoulder=new T.Group(),elbow=new T.Group();shoulder.position.set(s*.245,.44,0);elbow.position.y=-.26;
  shoulder.add(sphere(.085,.09,.095,coat),sphere(.078,.16,.086,coat,0,-.13,0));
  elbow.add(sphere(.072,.074,.078,coat),sphere(.066,.14,.075,coat,0,-.11,0),sphere(.069,.085,.058,skin,0,-.255,.018));
  elbow.add(rounded(.133,.037,.145,.015,'#415b4b',0,-.181,.002));
  for(let finger=0;finger<4;finger++)elbow.add(sphere(.012,.039,.019,skin,-.036+finger*.023,-.288,.035));
  elbow.add(sphere(.023,.042,.021,skin,s*.061,-.253,.041));
  shoulder.add(elbow);body.add(shoulder);arms.push({side:s,shoulder,elbow});
 }
 head.position.set(0,.59,.02);body.add(head);
 head.add(sphere(.064,.105,.065,skin,0,.025,0,{roughness:.9}),sphere(.143,.165,.122,skin,0,.247,.01,{roughness:.88}),sphere(.1,.075,.087,skin,0,.152,.022,{roughness:.9}),sphere(.018,.032,.028,skin,0,.23,.128),sphere(.141,.07,.11,'#4c5747',0,.349,-.007));
 const hat=solid(new T.CylinderGeometry(.135,.151,.085,24),'#3d5347',{roughness:.9});hat.position.set(0,.394,-.005);hat.scale.z=.84;const brim=solid(new T.CylinderGeometry(1,1,.016,32),'#344b3d',{roughness:.85});brim.scale.set(.177,1,.155);brim.position.set(0,.354,.038);head.add(hat,brim,box(.035,.018,.009,'#a0a88e',0,.388,.111),face.root);
 for(const s of [-1,1])head.add(sphere(.024,.038,.022,skin,s*.139,.24,.01),sphere(.009,.022,.012,'#a28c70',s*.152,.241,.02));
 const board=new T.Group();board.position.set(.015,-.22,.09);board.rotation.x=-.24;
 board.add(rounded(.25,.32,.035,.02,'#384c41'),box(.215,.267,.01,'#d2d2b5',0,-.006,.024),rounded(.09,.033,.018,.007,'#879586',0,.145,.038));
 for(let n=0;n<4;n++)board.add(box(n===3?.1:.16,.006,.005,'#748474',n===3?-.025:0,.064-n*.038,.032));
 const stamp=box(.042,.029,.008,'#6b9b68',.071,-.102,.035);stamp.userData.recorderStamp={visible:false};board.add(stamp);arms[0].elbow.add(board);
 const pen=solid(new T.CylinderGeometry(.009,.009,.15,8),'#a8af99',{metalness:.25,roughness:.55});pen.position.set(0,-.267,.065);pen.rotation.x=-.55;arms[1].elbow.add(pen);
 const contact=new T.Mesh(new T.CircleGeometry(.31,24),new T.MeshBasicMaterial({color:'#15231b',transparent:true,opacity:.17,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.012;root.add(contact);
 // Static street shadows stay batched. Soft foot contact anchors the moving actor.
 root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 let mode='idle',age=0,near=false,desiredYaw=0,checked=false;
 const ease=(from,to,dt)=>from+(to-from)*(1-Math.exp(-8*dt));
 function update({time,player,playing,dialogue,response,done,completed},dt=0){
  const dx=player.x-root.position.x,dz=player.z-root.position.z,distance=Math.hypot(dx,dz);
  near=distance<3.3;checked=done||completed;age=response?Math.max(0,time-response.at):0;
  const live=near&&(playing||completed),event=live&&response&&age<2.2;
  mode=completed?'archived':event&&response.kind==='confirm'?'confirm':event&&response.kind==='review'?'review':live&&dialogue?'talking':live?'attentive':'idle';
  desiredYaw=live?Math.atan2(dx,dz):0;
  const delta=Math.atan2(Math.sin(desiredYaw-root.rotation.y),Math.cos(desiredYaw-root.rotation.y));
  root.rotation.y+=delta*(1-Math.exp(-4.5*dt));
  const breath=Math.sin(time*1.65+index*.9),pulse=event?Math.sin(Math.PI*Math.min(1,age/2.2)):0;
  body.position.y=.94+breath*.008;body.rotation.z=breath*.008;
  body.rotation.x=ease(body.rotation.x,mode==='review'?.055:mode==='talking'?.018:0,dt);
  const headTarget=mode==='review'?.20:mode==='talking'?.025+Math.sin(time*4.2)*.035:mode==='confirm'||mode==='archived'?-pulse*.17:Math.sin(time*.8+index)*.025;
  head.rotation.x=ease(head.rotation.x,headTarget,dt);head.rotation.y=ease(head.rotation.y,mode==='review'?-.15:live?delta*.25:Math.sin(time*.65+index)*.05,dt);
  const left=arms[0],right=arms[1];
  left.shoulder.rotation.x=ease(left.shoulder.rotation.x,mode==='review'?-.55:checked?-.48:-.34,dt);
  left.shoulder.rotation.z=ease(left.shoulder.rotation.z,-.12,dt);left.elbow.rotation.x=ease(left.elbow.rotation.x,mode==='review'?-1.06:-.9,dt);
  let shoulder=-.055+breath*.025,elbow=-.1;
  if(mode==='talking'){shoulder=-.36;elbow=-.85+Math.sin(time*3.5)*.055;}
  if(mode==='review'){shoulder=-.58;elbow=-1.04;}
  if(mode==='confirm'||mode==='archived'){shoulder=-.15-pulse*.56;elbow=-.35-pulse*.75;}
  right.shoulder.rotation.x=ease(right.shoulder.rotation.x,shoulder,dt);right.shoulder.rotation.z=ease(right.shoulder.rotation.z,mode==='review'?-.13:.05,dt);right.elbow.rotation.x=ease(right.elbow.rotation.x,elbow,dt);
  face.update({mode,live,time,delta,pulse},dt);
  stamp.userData.recorderStamp.visible=checked;
 }
 function reset(){root.rotation.set(0,0,0);body.rotation.set(0,0,0);head.rotation.set(0,0,0);arms.forEach(a=>{a.shoulder.rotation.set(a.side<0?-.34:0,0,a.side<0?-.12:.05);a.elbow.rotation.set(a.side<0?-.9:-.1,0,0);});face.reset();mode='idle';age=0;near=checked=false;stamp.userData.recorderStamp.visible=false;}
 function getState(){return {site:site.id,mode,near,checked,eventAge:+age.toFixed(3),yaw:+root.rotation.y.toFixed(3),targetYaw:+desiredYaw.toFixed(3),face:face.getState(),pose:{bodyY:+body.position.y.toFixed(4),headPitch:+head.rotation.x.toFixed(4),headYaw:+head.rotation.y.toFixed(4),rightShoulder:+arms[1].shoulder.rotation.x.toFixed(4),rightElbow:+arms[1].elbow.rotation.x.toFixed(4),leftShoulder:+arms[0].shoulder.rotation.x.toFixed(4)}};}
 reset();return {root,update,reset,getState};
}
