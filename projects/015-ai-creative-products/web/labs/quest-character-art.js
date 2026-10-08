import {T,solid,box} from './four-playable-stage.js';
import {rounded,tube} from './games-art.js';

// Y sections form one clothed torso/head/sleeve surface. The recorder's quest
// choreography is kept below; visible spherical shoulder joints are removed.
function loft(sections,color,{sides=24,roughness=.9}={}){
 const p=[],idx=[];for(let i=0;i<sections.length;i++){const [y,rx,rz,z=0]=sections[i];for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;p.push(Math.cos(a)*rx,y,z+Math.sin(a)*rz);if(i<sections.length-1&&j<sides){const n=i*(sides+1)+j;idx.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return solid(g,color,{roughness});
}
function oval(rx,ry,rz,color,x,y,z){const m=solid(new T.SphereGeometry(1,24,16),color,{roughness:.86});m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
function recorderFace(index){
 const root=new T.Group(),eyes=[],brows=[],mouth=new T.Group();
 for(const side of [-1,1]){
  const eye=new T.Group();eye.position.set(side*.046,.275,.113);
  eye.add(oval(.023,.010,.006,'#d3c9b1',0,0,0));
  const iris=new T.Group();iris.position.z=.005;iris.add(oval(.008,.009,.003,'#535746',0,0,0),oval(.0034,.006,.002,'#222821',0,0,.002),oval(.0017,.0017,.001,'#efe4c8',-.002,.003,.004));eye.add(iris);root.add(eye);eyes.push({eye,iris});
  const brow=new T.Group();brow.position.set(side*.046,.297,.112);brow.add(tube([[-.024,-.002,-.001],[0,.002,.002],[.022,-.001,-.001]],.0036,'#514b3c'));root.add(brow);brows.push({brow,side});
  root.add(tube([[side*.023,.287,.113],[side*.045,.289,.118],[side*.068,.283,.105]],.003,'#af997c'));
 }
 mouth.position.set(0,.192,.111);mouth.add(tube([[-.029,.002,-.004],[-.014,-.003,0],[0,-.004,.001],[.014,-.003,0],[.029,.002,-.004]],.0028,'#78624f'));root.add(mouth);
 let expression='neutral',gaze='street',blink=0,smile=0,browPinch=0,gazeX=0,gazeY=0,eyeOpen=1;
 const ease=(a,b,dt)=>a+(b-a)*(1-Math.exp(-10*dt)),round=n=>+n.toFixed(4);
 function update({mode,live,time,delta,pulse},dt=0){
  expression=mode==='review'?'checking':mode==='confirm'||mode==='archived'?'confirmed':mode==='talking'?'listening':mode==='attentive'?'attentive':'neutral';gaze=mode==='review'?'record-board':live?'player':'street';
  const phase=(time+index*.81)%4.3;blink=Math.max(0,1-Math.abs(phase-.18)/.115);
  smile=ease(smile,expression==='confirmed'?.27+.22*pulse:expression==='listening'?.04:expression==='checking'?-.06:0,dt);browPinch=ease(browPinch,expression==='checking'?.22:expression==='confirmed'?-.10:0,dt);
  gazeX=ease(gazeX,gaze==='record-board'?-.004:Math.max(-.005,Math.min(.005,live?delta*.012:Math.sin(time*.42+index)*.002)),dt);gazeY=ease(gazeY,gaze==='record-board'?-.0045:0,dt);eyeOpen=ease(eyeOpen,expression==='confirmed'?.85:expression==='checking'?.88:1,dt);
  eyes.forEach(({eye,iris})=>{eye.scale.y=Math.max(.055,eyeOpen*(1-blink));iris.position.x=gazeX;iris.position.y=gazeY;});brows.forEach(({brow,side})=>{brow.rotation.z=side*browPinch;brow.position.y=.297+(expression==='listening'?.002:0);});mouth.scale.y=.25+Math.max(0,smile)*2.8;
 }
 function reset(){expression='neutral';gaze='street';blink=smile=browPinch=gazeX=gazeY=0;eyeOpen=1;eyes.forEach(({eye,iris})=>{eye.scale.y=1;iris.position.x=iris.position.y=0;});brows.forEach(({brow})=>{brow.rotation.z=0;brow.position.y=.297;});mouth.scale.y=.25;}
 const getState=()=>({expression,gaze,smile:round(smile),mouthCurve:round(mouth.scale.y),browPinch:round(browPinch),blink:round(blink),eyeOpen:round(Math.max(.055,eyeOpen*(1-blink))),pupil:{x:round(gazeX),y:round(gazeY)},model:'finite geometry poses from actual nearby quest events; no speech lip-sync'});
 reset();return {root,update,reset,getState};
}

export function createRecorder(site,index){
 const root=new T.Group(),body=new T.Group(),head=new T.Group(),arms=[],coat='#59685d',skin='#b9a183',face=recorderFace(index);root.name='tailored-field-recorder';root.position.set(site.x+2.7,0,site.z-.8);body.position.y=.94;root.add(body);
 body.add(loft([[-.11,.12,.085],[-.09,.165,.115],[.03,.18,.12],[.19,.191,.135],[.35,.218,.145],[.43,.219,.128],[.49,.145,.096],[.535,.074,.064]],coat));
 body.add(rounded(.33,.36,.16,.025,'#314239',0,.29,-.20),box(.33,.025,.02,'#303b31',0,-.055,.122));
 // Narrow collar, buttons and stitched pockets follow the garment front.
 for(const side of [-1,1]){
  const collar=rounded(.084,.10,.023,.008,'#77816d',side*.054,.490,.113);collar.rotation.z=side*.30;body.add(collar);
  body.add(rounded(.109,.10,.014,.009,'#536257',side*.108,.307,.132),box(.103,.006,.008,'#778271',side*.108,.351,.143));
  body.add(tube([[side*.165,.075,.119],[side*.187,.20,.131],[side*.187,.37,.12]],.002,'#72806e'));
 }
 for(const y of [.10,.21,.32,.405])body.add(oval(.006,.006,.003,'#9a9e83',0,y,.142));
 for(const side of [-1,1]){
  const leg=loft([[.135,.059,.072],[.26,.065,.075],[.44,.070,.076],[.60,.08,.083],[.80,.083,.092],[.86,.075,.085]],'#3b483f');leg.position.x=side*.099;root.add(leg,rounded(.162,.145,.31,.025,'#242d28',side*.10,.078,.046));
  const shoulder=new T.Group(),elbow=new T.Group();shoulder.position.set(side*.219,.416,0);elbow.position.y=-.26;
  shoulder.add(loft([[-.279,.061,.064],[-.245,.065,.071],[-.13,.076,.080],[0,.09,.086],[.07,.077,.072],[.092,.025,.028]],coat));
  elbow.add(loft([[-.198,.048,.051],[-.17,.052,.061],[-.085,.058,.065],[.005,.061,.065],[.055,.055,.059]],coat));
  elbow.add(rounded(.103,.025,.109,.01,'#414f44',0,-.183,.0));
  const hand=loft([[-.294,.036,.023,.018],[-.267,.048,.031,.020],[-.214,.045,.029,.017],[-.188,.039,.025,.008]],skin);elbow.add(hand);
  for(let finger=0;finger<4;finger++)elbow.add(oval(.010,.028,.014,skin,-.028+finger*.019,-.292,.024));elbow.add(oval(.019,.035,.018,skin,side*.045,-.257,.029));
  shoulder.add(elbow);body.add(shoulder);arms.push({side,shoulder,elbow});
 }
 head.position.set(0,.505,.007);body.add(head);
 head.add(loft([[-.035,.057,.050],[.025,.060,.052],[.075,.066,.058],[.109,.062,.065,.018],[.143,.087,.078,.015],[.21,.115,.098,.007],[.28,.119,.108],[.345,.111,.099,-.003],[.395,.095,.079,-.008],[.427,.023,.025,-.005]],skin,{sides:32,roughness:.92}));
 // An actual nose bridge projects out of the head surface; no colored cheek
 // patches, separate spherical jaw or exposed neck joint is used.
 head.add(loft([[.213,.011,.012,.109],[.231,.019,.018,.119],[.259,.011,.011,.113],[.283,.007,.007,.105]],skin,{sides:12}));
 for(const side of [-1,1])head.add(oval(.015,.031,.016,skin,side*.116,.245,.005));
 const cap=solid(new T.CylinderGeometry(.120,.131,.073,32),'#394b3f',{roughness:.95});cap.position.set(0,.405,-.007);cap.scale.z=.84;
 const brim=solid(new T.CylinderGeometry(1,1,.012,40),'#32463a',{roughness:.94});brim.scale.set(.150,1,.137);brim.position.set(0,.370,.019);head.add(cap,brim,face.root);
 const board=new T.Group();board.position.set(.015,-.22,.09);board.rotation.x=-.24;board.add(rounded(.23,.30,.027,.013,'#37483c'),box(.205,.251,.007,'#d2ccb3',0,-.006,.021),rounded(.074,.025,.014,.004,'#89917d',0,.137,.032));
 for(let n=0;n<4;n++)board.add(box(n===3?.09:.15,.004,.003,'#74816e',n===3?-.025:0,.059-n*.034,.027));const stamp=box(.033,.024,.005,'#6b9b68',.063,-.09,.029);stamp.userData.recorderStamp={visible:false};board.add(stamp);arms[0].elbow.add(board);
 const pen=solid(new T.CylinderGeometry(.007,.007,.14,8),'#a4aa92',{metalness:.2,roughness:.65});pen.position.set(0,-.26,.06);pen.rotation.x=-.55;arms[1].elbow.add(pen);
 const contact=new T.Mesh(new T.CircleGeometry(.28,32),new T.MeshBasicMaterial({color:'#15231b',transparent:true,opacity:.17,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.012;root.add(contact);root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 let mode='idle',age=0,near=false,desiredYaw=0,checked=false;const ease=(a,b,dt)=>a+(b-a)*(1-Math.exp(-8*dt));
 function update({time,player,playing,dialogue,response,done,completed},dt=0){
  const dx=player.x-root.position.x,dz=player.z-root.position.z;near=Math.hypot(dx,dz)<3.3;checked=done||completed;age=response?Math.max(0,time-response.at):0;const live=near&&(playing||completed),event=live&&response&&age<2.2;
  mode=completed?'archived':event&&response.kind==='confirm'?'confirm':event&&response.kind==='review'?'review':live&&dialogue?'talking':live?'attentive':'idle';desiredYaw=live?Math.atan2(dx,dz):0;const delta=Math.atan2(Math.sin(desiredYaw-root.rotation.y),Math.cos(desiredYaw-root.rotation.y));root.rotation.y+=delta*(1-Math.exp(-4.5*dt));
  const breath=Math.sin(time*1.65+index*.9),pulse=event?Math.sin(Math.PI*Math.min(1,age/2.2)):0;body.position.y=.94+breath*.006;body.rotation.z=breath*.005;body.rotation.x=ease(body.rotation.x,mode==='review'?.055:mode==='talking'?.018:0,dt);
  const headTarget=mode==='review'?.20:mode==='talking'?.025+Math.sin(time*4.2)*.035:mode==='confirm'||mode==='archived'?-pulse*.17:Math.sin(time*.8+index)*.025;head.rotation.x=ease(head.rotation.x,headTarget,dt);head.rotation.y=ease(head.rotation.y,mode==='review'?-.15:live?delta*.25:Math.sin(time*.65+index)*.05,dt);
  const left=arms[0],right=arms[1];left.shoulder.rotation.x=ease(left.shoulder.rotation.x,mode==='review'?-.55:checked?-.48:-.34,dt);left.shoulder.rotation.z=ease(left.shoulder.rotation.z,-.12,dt);left.elbow.rotation.x=ease(left.elbow.rotation.x,mode==='review'?-1.06:-.9,dt);
  let shoulder=-.055+breath*.025,elbow=-.1;if(mode==='talking'){shoulder=-.36;elbow=-.85+Math.sin(time*3.5)*.055;}if(mode==='review'){shoulder=-.58;elbow=-1.04;}if(mode==='confirm'||mode==='archived'){shoulder=-.15-pulse*.56;elbow=-.35-pulse*.75;}
  right.shoulder.rotation.x=ease(right.shoulder.rotation.x,shoulder,dt);right.shoulder.rotation.z=ease(right.shoulder.rotation.z,mode==='review'?-.13:.05,dt);right.elbow.rotation.x=ease(right.elbow.rotation.x,elbow,dt);face.update({mode,live,time,delta,pulse},dt);stamp.userData.recorderStamp.visible=checked;
 }
 function reset(){root.rotation.set(0,0,0);body.rotation.set(0,0,0);head.rotation.set(0,0,0);arms.forEach(a=>{a.shoulder.rotation.set(a.side<0?-.34:0,0,a.side<0?-.12:.05);a.elbow.rotation.set(a.side<0?-.9:-.1,0,0);});face.reset();mode='idle';age=0;near=checked=false;stamp.userData.recorderStamp.visible=false;}
 const getState=()=>({site:site.id,mode,near,checked,eventAge:+age.toFixed(3),yaw:+root.rotation.y.toFixed(3),targetYaw:+desiredYaw.toFixed(3),face:face.getState(),art:'continuous tailored torso, shaped head/neck and cloth sleeves',pose:{bodyY:+body.position.y.toFixed(4),headPitch:+head.rotation.x.toFixed(4),headYaw:+head.rotation.y.toFixed(4),rightShoulder:+arms[1].shoulder.rotation.x.toFixed(4),rightElbow:+arms[1].elbow.rotation.x.toFixed(4),leftShoulder:+arms[0].shoulder.rotation.x.toFixed(4)}});
 reset();return {root,update,reset,getState};
}
