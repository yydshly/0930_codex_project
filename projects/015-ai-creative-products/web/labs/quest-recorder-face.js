import {T,solid} from './four-playable-stage.js';
import {tube} from './games-art.js';

// Case 02's finite facial poses follow quest events, not speech recognition.
// Every moving part stays inside the recorder's own instanced hierarchy.
const round=n=>+n.toFixed(4);
function oval(rx,ry,rz,color,x,y,z){const m=solid(new T.SphereGeometry(1,16,12),color,{roughness:.8});m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
export function createRecorderFace(skin,index){
 const root=new T.Group(),eyes=[],brows=[],mouth=new T.Group();
 for(const side of [-1,1]){
  const eye=new T.Group();eye.position.set(side*.049,.269,.128);
  eye.add(oval(.029,.015,.008,'#ece7d8',0,0,0));
  const iris=new T.Group();iris.position.z=.008;
  iris.add(oval(.011,.012,.004,'#54604c',0,0,0),oval(.0048,.007,.003,'#202d27',0,0,.003),oval(.0025,.0025,.001,'#fff5d6',-.003,.004,.006));eye.add(iris);
  root.add(eye);eyes.push({eye,iris});
  root.add(oval(.033,.005,.01,skin,side*.049,.286,.13),oval(.025,.003,.007,'#927c62',side*.049,.251,.131),oval(.031,.016,.003,'#beaa8d',side*.066,.227,.117));
  const brow=new T.Group();brow.position.set(side*.049,.302,.123);
  brow.add(tube([[-.026,-.002,0],[0,.004,.003],[.025,0,0]],.005,'#5b6250'));root.add(brow);brows.push({brow,side});
 }
 mouth.position.set(0,.191,.132);mouth.add(tube([[-.034,.004,-.002],[-.018,-.004,.001],[0,-.007,.002],[.018,-.004,.001],[.034,.004,-.002]],.0035,'#715b48'));root.add(mouth);
 root.add(oval(.024,.009,.01,skin,0,.174,.121));
 let expression='neutral',gaze='street',blink=0,smile=0,browPinch=0,gazeX=0,gazeY=0,eyeOpen=1;
 const ease=(a,b,dt)=>a+(b-a)*(1-Math.exp(-10*dt));
 function update({mode,live,time,delta,pulse},dt=0){
  expression=mode==='review'?'checking':mode==='confirm'||mode==='archived'?'confirmed':mode==='talking'?'listening':mode==='attentive'?'attentive':'neutral';
  gaze=mode==='review'?'record-board':live?'player':'street';
  const phase=(time+index*.81)%4.3,closing=Math.max(0,1-Math.abs(phase-.18)/.115);
  blink=closing;
  const targetSmile=expression==='confirmed'?.27+.22*pulse:expression==='listening'?.04:expression==='checking'?-.06:0;
  smile=ease(smile,targetSmile,dt);browPinch=ease(browPinch,expression==='checking'?.3:expression==='confirmed'?-.12:0,dt);
  gazeX=ease(gazeX,gaze==='record-board'?-.005:Math.max(-.007,Math.min(.007,live?delta*.015:Math.sin(time*.42+index)*.003)),dt);
  gazeY=ease(gazeY,gaze==='record-board'?-.006:0,dt);
  eyeOpen=ease(eyeOpen,expression==='confirmed'?.81:expression==='checking'?.87:1,dt);
  eyes.forEach(({eye,iris})=>{eye.scale.y=Math.max(.055,eyeOpen*(1-blink));iris.position.x=gazeX;iris.position.y=gazeY;});
  brows.forEach(({brow,side})=>{brow.rotation.z=side*browPinch;brow.position.y=.302+(expression==='listening'?.003:0);});
  mouth.scale.y=.2+Math.max(0,smile)*3.2;
 }
 function reset(){expression='neutral';gaze='street';blink=smile=browPinch=gazeX=gazeY=0;eyeOpen=1;eyes.forEach(({eye,iris})=>{eye.scale.y=1;iris.position.x=iris.position.y=0;});brows.forEach(({brow})=>{brow.rotation.z=0;brow.position.y=.302;});mouth.scale.y=.2;}
 function getState(){return {expression,gaze,smile:round(smile),mouthCurve:round(mouth.scale.y),browPinch:round(browPinch),blink:round(blink),eyeOpen:round(Math.max(.055,eyeOpen*(1-blink))),pupil:{x:round(gazeX),y:round(gazeY)},model:'finite geometry poses from actual nearby quest events; no speech lip-sync'};}
 reset();return {root,update,reset,getState};
}
