import * as THREE from 'three';
import {BPM,END_BEAT,DURATION,chapters,chapterAt,childState,score} from './children-story.mjs';

const $=id=>document.getElementById(id),step=60/BPM;
let playing=false,elapsed=0,anchor=0,audio,master,reverb,noteIndex=0,volume=.65,activeChapter=-1;
const voices=new Set();
const roles={mumu:{name:'木木',color:0xe79858,skin:0xf2caac,hair:0x493329,pan:-.35},he:{name:'小禾',color:0xd47777,skin:0xf6d3b8,hair:0x3b302d,pan:.35},mai:{name:'阿麦',color:0x6d9b88,skin:0xe8bb94,hair:0x403226,pan:0},dou:{name:'豆豆',color:0xe4bd59,skin:0xf7d6b9,hair:0x694a36,pan:-.55}};
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;$('stage').append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-8,8,4.5,-4.5,.1,100);camera.position.set(5.3,8.8,14);camera.lookAt(0,.45,-.2);
scene.add(new THREE.HemisphereLight(0xfffbef,0xb5ad97,2.0));
const sun=new THREE.DirectionalLight(0xffe4c7,3);sun.position.set(-5,10,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:35});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.radius=4;scene.add(sun);
const fill=new THREE.DirectionalLight(0xd7e4ee,.7);fill.position.set(6,4,-5);scene.add(fill);
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
const skinMats={},materials={cream:mat(0xf3e9d8),white:mat(0xfaf4e8),wood:mat(0xb88e65),trunk:mat(0xa88763),leaf:mat(0xb9c4a0),leaf2:mat(0xa8b897),ink:mat(0x423d34)};
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,material,x,y,z,r,sx=1,sy=1,sz=1){const m=mesh(new THREE.SphereGeometry(r,32,20),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function roundedShape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function roundedBox(parent,w,h,d,r,material,x=0,y=0,z=0){const g=new THREE.ExtrudeGeometry(roundedShape(w,h,r),{depth:d,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1,curveSegments:8});g.translate(0,0,-d/2);return mesh(g,material,parent,x,y,z);}
const ground=mesh(new THREE.CylinderGeometry(6.4,6.5,.25,100),mat(0xe7dbc2),scene,0,-.19,-.7);ground.scale.z=.76;
const lawn=mesh(new THREE.CylinderGeometry(6.05,6.1,.045,100),mat(0xebe4d2),scene,0,-.044,-.7);lawn.scale.z=.75;
const tiles=[],tilePlaces=[[0,2.1],[0,1.05],[-.58,0],[.58,0],[0,-1.1],[-.58,-2.2],[.58,-2.2]];
tilePlaces.forEach(([x,z],index)=>{
  const tile=roundedBox(scene,1.04,.86,.04,.12,mat([0xe3b69d,0xc4d2b7,0xbcced4,0xe8c2ba,0xe1d09c,0xc4bdd2,0xc1d3c2][index]),x,.015,z);tile.rotation.x=-Math.PI/2;
  const c=document.createElement('canvas');c.width=256;c.height=256;const cctx=c.getContext('2d');cctx.font='500 105px Georgia';cctx.textAlign='center';cctx.fillStyle='#fff9ec';cctx.fillText(String(index+1),128,157);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const label=mesh(new THREE.PlaneGeometry(.72,.72),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}),scene,x,.083,z);label.rotation.x=-Math.PI/2;label.castShadow=false;
  tiles.push(tile);
});
// A real playground gives the musical metaphor somewhere to happen.
function tree(x,z,size){const tree=new THREE.Group();tree.position.set(x,0,z);scene.add(tree);mesh(new THREE.CylinderGeometry(.11,.15,1.65,12),materials.trunk,tree,0,.79,0);sphere(tree,materials.leaf,0,1.9,0,.7,1.15,.9,1);sphere(tree,materials.leaf2,-.42,1.65,.08,.5);sphere(tree,materials.leaf,.43,1.68,-.13,.53);tree.scale.setScalar(size);}
tree(-4.35,-2.7,1.05);tree(3.9,-3,.86);
const bench=new THREE.Group();bench.position.set(3.1,.01,-1.3);bench.rotation.y=-.15;scene.add(bench);for(const x of [-.7,.7]){mesh(new THREE.BoxGeometry(.1,.58,.5),materials.wood,bench,x,.28,0);mesh(new THREE.BoxGeometry(.1,.7,.1),materials.wood,bench,x,.8,-.21);}roundedBox(bench,1.85,.12,.56,.04,mat(0xc4ad8d),0,.55,0);roundedBox(bench,1.85,.35,.06,.045,mat(0xcfb797),0,.97,-.27);
for(let i=0;i<13;i++){const x=-3.3+i*.51,z=-3.8;const post=mesh(new THREE.CapsuleGeometry(.065,.62,4,12),mat([0xdcb8a0,0xb8c7ad,0xc5c3cf][i%3]),scene,x,.39,z);post.castShadow=false;}
mesh(new THREE.BoxGeometry(6.3,.07,.08),materials.white,scene,-.24,.45,-3.8);
for(const [x,z]of [[-3.9,1.3],[4,.8],[-3.5,-3.3],[3.7,-2.8]])for(let i=0;i<6;i++){const angle=i*2.4;const leaf=sphere(scene,materials.leaf2,x+Math.cos(angle)*.15,.16+i*.01,z+Math.sin(angle)*.15,.12,.42,1.8,.55);leaf.rotation.z=Math.sin(angle)*.4;}
const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=230;const signCtx=signCanvas.getContext('2d');signCtx.fillStyle='#f6eee0';signCtx.beginPath();signCtx.roundRect(0,0,1024,230,38);signCtx.fill();signCtx.fillStyle='#7a8064';signCtx.font='500 44px "Microsoft YaHei",sans-serif';signCtx.textAlign='center';signCtx.fillText('每个人，都有自己的节拍。',512,102);signCtx.font='24px Georgia';signCtx.fillText('A LITTLE ROOM FOR EVERYONE',512,158);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;mesh(new THREE.PlaneGeometry(3.55,.8),new THREE.MeshBasicMaterial({map:signTexture,transparent:true,toneMapped:false}),scene,-1.6,1.18,-3.76);

function createChild(role){
  const config=roles[role],root=new THREE.Group(),body=new THREE.Group();root.add(body);scene.add(root);
  const skin=mat(config.skin,.8),clothes=mat(config.color),hair=mat(config.hair),cheek=mat(0xe8a797),shoe=mat(role==='he'?0x935f54:0x5a635a);skinMats[role]=skin;
  const torso=mesh(new THREE.CapsuleGeometry(.255,.34,8,24),clothes,body,0,.76,0);torso.scale.z=.83;
  sphere(body,materials.white,0,1.02,.04,.15,1,.5,.7);
  const shorts=roundedBox(body,.48,.25,.33,.075,role==='he'?clothes:mat(0x8f8f79),0,.42,0);
  const head=new THREE.Group();head.position.set(0,1.48,0);body.add(head);
  sphere(head,skin,0,0,0,.46,1.06,1.05,.9);
  for(const side of [-1,1]){sphere(head,skin,side*.45,-.005,0,.105,.65,1,.65);sphere(head,cheek,side*.285,-.065,.331,.085,1,.55,.16);}
  sphere(head,skin,0,-.015,.425,.072,.7,.65,.65);
  const cap=mesh(new THREE.SphereGeometry(.468,32,24,0,Math.PI*2,0,Math.PI*.43),hair,head,0,.02,-.04);cap.scale.set(1.09,1.025,.99);
  if(role==='he')for(const side of [-1,1]){sphere(head,hair,side*.39,.29,-.025,.20);sphere(head,clothes,side*.42,.25,.13,.08,1,.7,.5);}
  else for(let i=0;i<4;i++){const fringe=sphere(head,hair,(i-1.5)*.12,.29+Math.sin(i)*.01,.275,.145,.8,.55,.65);fringe.rotation.z=-.3;}
  const eyes=new THREE.Group();head.add(eyes);
  const brows=[];for(const side of [-1,1]){sphere(eyes,materials.ink,side*.17,.045,.399,.052,.8,1.25,.52);sphere(eyes,materials.white,side*.17-.01,.06,.43,.016);const brow=mesh(new THREE.CapsuleGeometry(.012,.075,3,8),hair,head,side*.17,.16,.388);brow.rotation.z=Math.PI/2;brows.push(brow);}
  const mouthCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.075,.02,0),new THREE.Vector3(0,-.055,.02),new THREE.Vector3(.075,.02,0));const mouth=mesh(new THREE.TubeGeometry(mouthCurve,20,.011,6,false),mat(0x9d6457),head,0,-.14,.412);
  // Limbs have joints and independent gestures, so pauses read as choices.
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.29,.91,0);body.add(arm);mesh(new THREE.CapsuleGeometry(.09,.19,5,16),role==='he'?materials.white:clothes,arm,0,-.16,0);sphere(arm,skin,0,-.35,.015,.09);arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.14,.39,0);body.add(leg);mesh(new THREE.CapsuleGeometry(.085,.19,5,16),skin,leg,0,-.14,0);mesh(new THREE.CylinderGeometry(.087,.089,.09,16),materials.white,leg,0,-.25,0);sphere(leg,shoe,0,-.315,.065,.12,.86,.65,1.45);sphere(leg,materials.white,0,-.36,.065,.12,.88,.18,1.5);legs.push(leg);
  }
  if(role==='mumu'||role==='dou'){
    const bag=roundedBox(body,.39,.43,.17,.10,mat(role==='mumu'?0x829d83:0xb18d6d),0,.78,-.25);
    for(const side of [-1,1]){const strap=mesh(new THREE.CapsuleGeometry(.027,.34,4,10),mat(0xf2d5a6),body,side*.15,.77,.21);strap.rotation.z=side*.1;}
    roundedBox(body,.14,.11,.07,.025,materials.cream,.06,.67,.265);
  }else{
    for(const side of [-1,1])mesh(new THREE.BoxGeometry(.048,.36,.035),clothes,body,side*.15,.91,.226);
    for(const side of [-1,1])sphere(body,materials.white,side*.13,.82,.25,.024);
  }
  if(role==='dou'){const hat=mesh(new THREE.SphereGeometry(.485,32,16,0,Math.PI*2,0,Math.PI*.43),mat(0xd8b866),head,0,.04,0);sphere(head,mat(0xd8b866),0,.215,.27,.25,1,.16,1.05);}
  const shadow=mesh(new THREE.CircleGeometry(.40,48),new THREE.MeshBasicMaterial({color:0x8b8066,transparent:true,opacity:.16,depthWrite:false}),scene);shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;shadow.castShadow=false;shadow.receiveShadow=false;
  const ring=mesh(new THREE.RingGeometry(.36,.385,64),new THREE.MeshBasicMaterial({color:config.color,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),scene);ring.rotation.x=-Math.PI/2;ring.position.y=.09;ring.castShadow=false;
  return {root,body,head,eyes,brows,mouth,arms,legs,shadow,ring};
}
const cast=Object.fromEntries(Object.keys(roles).map(role=>[role,createChild(role)]));
function updateChild(role,beat){const c=cast[role],state=childState(role,beat);c.root.visible=c.shadow.visible=c.ring.visible=state.visible;if(!state.visible)return;
  c.root.position.set(state.x,state.y+.09,state.z);c.root.rotation.y=state.beckon?-.22:.08;c.body.scale.y=1-state.pulse*.035+state.y*.045;
  c.body.rotation.z=state.worried?-.10:Math.sin(beat*Math.PI)*state.y*.05;
  c.head.rotation.z=state.worried?.15:state.beckon?-.12:Math.sin(beat*.8)*.025;c.head.rotation.x=state.worried?.18:0;
  const blink=(beat+(role==='he'?1.2:role==='mai'?2.6:0))%7;c.eyes.scale.y=blink>6.65&&blink<6.85?.15:1;
  c.brows.forEach((b,i)=>b.rotation.z=Math.PI/2+(state.worried?(i===0?-.23:.23):0));c.mouth.scale.y=state.worried?-.6:state.celebrate?1.3:1;
  c.arms.forEach((arm,i)=>{const side=i===0?-1:1;arm.rotation.z=side*(state.celebrate?.88:state.y>.03?.42:.11);arm.rotation.x=state.walking?Math.sin(beat*5+i*Math.PI)*.35:0;});
  if(state.beckon){c.arms[0].rotation.z=-1.15+Math.sin(beat*4)*.1;c.arms[0].rotation.x=-.25;}
  if(state.worried)c.arms.forEach((arm,i)=>{arm.rotation.x=-.28;arm.rotation.z=(i===0?-1:1)*.2;});
  c.legs.forEach((leg,i)=>{leg.rotation.x=state.walking?Math.sin(beat*5+i*Math.PI)*.30:state.y>.05?-.16:.04;leg.rotation.z=(i===0?-1:1)*(state.y>.05?.11:0);});
  c.shadow.position.x=state.x;c.shadow.position.z=state.z;c.shadow.scale.setScalar(1-state.y*.25);c.shadow.material.opacity=.15-state.y*.12;
  c.ring.position.x=state.x;c.ring.position.z=state.z;c.ring.scale.setScalar(1+(1-state.pulse)*.65);c.ring.material.opacity=state.pulse*.55;
  document.querySelector(`[data-role="${role}"]`).classList.toggle('sounding',state.pulse>.25);
}
function now(){return playing?Math.min(DURATION,elapsed+audio.currentTime-anchor):elapsed;}
function audioInit(){if(audio)return;audio=new AudioContext();master=audio.createGain();master.gain.value=volume;const compressor=audio.createDynamicsCompressor();compressor.threshold.value=-20;compressor.ratio.value=3;master.connect(compressor);compressor.connect(audio.destination);
  reverb=audio.createConvolver();const buffer=audio.createBuffer(2,audio.sampleRate*1.8,audio.sampleRate);let seed=123;for(let channel=0;channel<2;channel++){const a=buffer.getChannelData(channel);for(let i=0;i<a.length;i++){seed=seed*16807%2147483647;a[i]=(seed/1073741824-1)*Math.exp(-i/(audio.sampleRate*.45))*.2;}}reverb.buffer=buffer;const wet=audio.createGain();wet.gain.value=.17;reverb.connect(wet);wet.connect(master);
}
function tone(note,at){const duration=note.length*step,freq=440*2**((note.midi-69)/12),gain=audio.createGain(),pan=audio.createStereoPanner();pan.pan.value=roles[note.role].pan;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(note.type==='bell'?4500:note.type==='pad'?1300:3500,at);filter.frequency.exponentialRampToValueAtTime(note.type==='pad'?800:1200,at+Math.max(.1,duration));
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(note.gain,at+(note.type==='pad'?.16:.009));gain.gain.exponentialRampToValueAtTime(Math.max(.0002,note.gain*.20),at+Math.max(.12,duration*.45));gain.gain.exponentialRampToValueAtTime(.0001,at+duration+.22);filter.connect(gain);gain.connect(pan);pan.connect(master);pan.connect(reverb);
  const partials=note.type==='bell'?[[1,1],[2.01,.19],[3.98,.06]]:note.type==='pad'?[[1,1],[2,.14]]:[[1,1],[2,.26],[3,.12],[4,.05]];let remaining=partials.length;
  for(const [ratio,level]of partials){const oscillator=audio.createOscillator(),part=audio.createGain();oscillator.type='sine';oscillator.frequency.value=freq*ratio;part.gain.value=level;oscillator.connect(part);part.connect(filter);oscillator.start(at);oscillator.stop(at+duration+.25);voices.add(oscillator);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();part.disconnect();if(--remaining===0){filter.disconnect();gain.disconnect();pan.disconnect();}};}
}
function stopVoices(){for(const voice of voices)try{voice.stop();}catch{}voices.clear();}
function schedule(){if(!playing)return;const current=now();while(noteIndex<score.length&&score[noteIndex].beat*step<current+.15){const note=score[noteIndex++],at=anchor+note.beat*step-elapsed;if(at>=audio.currentTime-.025)tone(note,Math.max(audio.currentTime,at));}}
async function play(){try{audioInit();await audio.resume();if(elapsed>=DURATION-.01)elapsed=0;anchor=audio.currentTime;noteIndex=score.findIndex(n=>n.beat*step>=elapsed-.01);if(noteIndex<0)noteIndex=score.length;playing=true;$('watch').hidden=true;$('play').textContent='Ⅱ 暂停';$('play').setAttribute('aria-pressed','true');$('status').textContent='原创合成配乐 · 音乐与动作共用时间轴';schedule();}catch{$('status').textContent='声音未能开启，请再点击播放。';}}
function pause(){if(playing)elapsed=now();playing=false;stopVoices();$('play').textContent=elapsed>=DURATION?'↻ 再看一次':elapsed>0?'▶ 继续':'▶ 播放';$('play').setAttribute('aria-pressed','false');}
function seek(time){const resume=playing;pause();elapsed=Math.min(DURATION,Math.max(0,time));$('watch').hidden=elapsed>0;if(resume)void play();}
function resize(){const box=$('stage').getBoundingClientRect(),aspect=box.width/box.height,h=aspect<1.1?10.5:7.4;camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(box.width,box.height,false);}
new ResizeObserver(resize).observe($('stage'));
function render(){requestAnimationFrame(render);const time=now(),beat=time/step;for(const role of Object.keys(roles))updateChild(role,beat);
  const index=Math.min(4,Math.floor(beat/16));if(index!==activeChapter){activeChapter=index;const c=chapterAt(beat);$('chapter').textContent=c.detail;$('line').textContent=c.line;$('social').textContent=c.social;document.querySelectorAll('[data-chapter]').forEach((button,i)=>button.setAttribute('aria-current',i===index?'step':'false'));}
  $('seek').value=time;$('clock').textContent=String(Math.floor(time)).padStart(2,'0')+' / 50 秒';$('progress').style.width=(time/DURATION*100)+'%';
  const close=beat>=20&&beat<32?.30:0;camera.zoom=1+close;camera.updateProjectionMatrix();camera.lookAt(beat>=20&&beat<32?-.5:0,.52,-.3);
  if(playing&&time>=DURATION){pause();$('status').textContent='给别人留一拍，也给自己一个位置。';$('line').textContent='被接住的木木，也学会了接住别人。';}
  renderer.render(scene,camera);
}
$('play').onclick=()=>playing?pause():void play();$('watch').onclick=()=>void play();$('replay').onclick=()=>{pause();elapsed=0;void play();};$('seek').oninput=event=>seek(Number(event.target.value));
$('volume').oninput=event=>{volume=Number(event.target.value)/100;if(master)master.gain.setTargetAtTime(volume,audio.currentTime,.04);};
document.querySelectorAll('[data-chapter]').forEach(button=>button.onclick=()=>seek(Number(button.dataset.chapter)*16*step));
document.addEventListener('keydown',event=>{if(event.code==='Space'&&document.activeElement.tagName!=='INPUT'&&(document.fullscreenElement||!['BUTTON','A'].includes(document.activeElement.tagName))){event.preventDefault();playing?pause():void play();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});window.addEventListener('pagehide',()=>{pause();audio?.close();});
$('fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void $('film').requestFullscreen();};
resize();render();$('status').textContent='50 秒原创音乐故事 · 点击播放开启声音';$('play').disabled=false;$('watch').disabled=false;
