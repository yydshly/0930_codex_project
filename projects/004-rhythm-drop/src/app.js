import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { beatAt, formatTime } from './timeline.mjs';
import { stories as baseStories, STORY_BEATS, chapterAt, storyPointAt, storyBeat, narrativeAt, scoreFor } from './stories.mjs';
import { createStoryWorld } from './story-world.js';
import { createRainWorld } from './rain-world.js';
import { directedPose, ease } from './direction.mjs';
import {defaultWork,validateWork,applyWork,workNarrative,parseLibrary,serializeLibrary} from './works.mjs';
import {examples} from './examples.mjs';
import {createIdentityWorld} from './identity-world.js';
import {identityState,identityRoles} from './identity-cues.mjs';
import {createTeamWorld} from './team-world.js';
import {teamState,teamRoles} from './team-cues.mjs';

const $ = id => document.getElementById(id);
let selectedStory=0,stories=baseStories.map(s=>({...s})),activeWork=null,activeWorkId='';
const storageKey='rhythm-drop.library.v3',pendingEdits=new Map();let library=[],storageIssue='';
try{library=parseLibrary(localStorage.getItem(storageKey)??localStorage.getItem('rhythm-drop.library.v2')??localStorage.getItem('rhythm-drop.library.v1'));}catch{storageIssue='旧作品档案暂时无法读取。为保留旧记录，当前只支持预览和导出。';}
const isBrand=index=>index===2||index===4;
const isCast=index=>index===4||index===5;

const makeThemes=story=>stories[story].chapters.map((c,i)=>({...c,title:c.name,en:`CHAPTER 0${i+1}`,ring:c.accent,ball:story===2?0xdfd8ff:story===4?0xf0e5d2:0xf0e3bc}));
let themes=makeThemes(0);
let bpm=stories[0].bpm,height=2.1,automatic=true,cameraMode='follow',playing=false,elapsed=0,anchor=0,activeScene=-1,muted=false,volume=.65;
let reverb,noiseBuffer;
let ctx,master,buffer=null,source=null,scheduledBeat=0,uploadToken=0;
let cameraSnap=true;
const voices=new Set();
const secondsNow = () => playing ? Math.min(getDuration(),elapsed+ctx.currentTime-anchor) : elapsed;
const getDuration = () => buffer?.duration ?? STORY_BEATS*60/bpm;
const path=index=>storyPointAt(selectedStory,index);
const beatSeconds=beat=>buffer?beat/STORY_BEATS*buffer.duration:beat*60/bpm;

const stage=$('stage'), scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(43,1,.1,180);
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch { $('loading').textContent='当前浏览器无法启动 WebGL，请启用硬件加速后重试。'; $('engine-status').textContent='WebGL 不可用'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
stage.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','随剧情与配乐展开的实时 3D 短片');
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.55,.45,1.15);
composer.addPass(bloom);composer.addPass(new OutputPass());
const hemi=new THREE.HemisphereLight(0xd9ffff,0x163137,2.5);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-6,15,8);scene.add(key);
const rim=new THREE.DirectionalLight(0x77efda,2);rim.position.set(7,4,-10);scene.add(rim);
const ballLight=new THREE.PointLight(0xb9ffda,3,12,2);scene.add(ballLight);
const sphere=new THREE.SphereGeometry(.54,36,24), eyeGeo=new THREE.SphereGeometry(.07,16,12);
const bodyMaterial=new THREE.MeshStandardMaterial({color:0xf1e6b6,roughness:.23,metalness:.22});
const ball=new THREE.Group(),body=new THREE.Mesh(sphere,bodyMaterial);ball.add(body);scene.add(ball);
const dark=new THREE.MeshStandardMaterial({color:0x183735,roughness:.7});
for(const x of [-.18,.18]){const eye=new THREE.Mesh(eyeGeo,dark);eye.position.set(x,.09,.49);ball.add(eye);const glint=new THREE.Mesh(new THREE.SphereGeometry(.021,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));glint.position.set(x-.017,.115,.548);ball.add(glint);}
const smile=new THREE.Mesh(new THREE.TorusGeometry(.12,.018,8,20,Math.PI),dark);smile.rotation.z=Math.PI;smile.position.set(0,-.1,.53);ball.add(smile);
const cap=new THREE.Mesh(new THREE.ConeGeometry(.26,.48,5),new THREE.MeshStandardMaterial({color:0x719f78,roughness:.6}));cap.position.y=.67;cap.rotation.z=-.2;ball.add(cap);
const capStar=new THREE.Mesh(new THREE.OctahedronGeometry(.085),new THREE.MeshBasicMaterial({color:0xf0ffc7}));capStar.position.set(.05,.95,0);ball.add(capStar);
const gradCap=new THREE.Group();const gradTop=new THREE.Mesh(new THREE.BoxGeometry(.85,.055,.85),dark);gradTop.position.y=.59;gradTop.rotation.y=.25;gradCap.add(gradTop);
const tassel=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.34,6),new THREE.MeshStandardMaterial({color:0xe7bd65}));tassel.position.set(.4,.48,.19);gradCap.add(tassel);ball.add(gradCap);
const identityMark=new THREE.Group(),identityGlow=new THREE.MeshBasicMaterial({color:identityRoles.self.color,transparent:true,opacity:.75});
const signature=new THREE.Mesh(new THREE.TorusGeometry(.565,.023,10,96,Math.PI*1.45),identityGlow);signature.rotation.z=.55;identityMark.add(signature);
for(let i=0;i<2;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.04,10,8),identityGlow);dot.position.set(-.35+i*.14,.49,.19);identityMark.add(dot);}
ball.add(identityMark);

// Recycle a short stretch of scenery around the current beat.
const platforms=[];
const bookStepGeo=new THREE.BoxGeometry(1.9,.16,1.45),pageGeo=new THREE.BoxGeometry(1.8,.055,1.34);
const discGeo=new THREE.CylinderGeometry(1.28,1.05,.24,48),stemGeo=new THREE.CylinderGeometry(.14,.3,2.8,12),ringGeo=new THREE.TorusGeometry(1.29,.035,8,64);
const leafGeo=new THREE.SphereGeometry(.18,12,8),boxGeo=new THREE.BoxGeometry(.4,.7,.4),coneGeo=new THREE.ConeGeometry(.36,.7,5);
for(let slot=0;slot<26;slot++){
  const group=new THREE.Group();scene.add(group);
  const mat=new THREE.MeshStandardMaterial({color:0x294c4c,roughness:.5,metalness:.4});
  const disc=new THREE.Mesh(discGeo,mat);disc.position.y=-.12;group.add(disc);
  const page=new THREE.Mesh(pageGeo,new THREE.MeshStandardMaterial({color:0xf0e5c9,roughness:.85}));page.position.y=-.01;group.add(page);
  const ringMat=new THREE.MeshStandardMaterial({color:0x92f9dd,emissive:0x92f9dd,emissiveIntensity:.4,roughness:.3});
  const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.035;group.add(ring);
  const stem=new THREE.Mesh(stemGeo,mat);stem.position.y=-1.65;group.add(stem);
  const island=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),mat);island.scale.set(1.14,.68,1.14);island.position.y=-.7;group.add(island);
  const decor=[];
  for(let type=0;type<3;type++){
    const set=new THREE.Group();group.add(set);decor.push(set);
    for(let j=0;j<3;j++){
      const m=new THREE.Mesh(type===0?leafGeo:type===1?boxGeo:coneGeo,new THREE.MeshStandardMaterial({color:type===0?0x90bc86:type===1?0x8360b1:0xc78351,roughness:.6}));
      const angle=j*2.094+slot*.5;m.position.set(Math.cos(angle)*.92,type===0?.15:.28,Math.sin(angle)*.92);
      if(type===0){m.scale.set(.65,1.6,.65);m.rotation.z=.4;}else if(type===1){m.scale.set(.4,1,.4);m.rotation.y=angle;}set.add(m);
    }
  }
  const rippleMat=new THREE.MeshBasicMaterial({color:0xaff4cc,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
  const ripple=new THREE.Mesh(new THREE.RingGeometry(1.25,1.32,64),rippleMat);ripple.rotation.x=-Math.PI/2;ripple.position.y=.06;group.add(ripple);
  platforms.push({group,mat,disc,page,ringMat,ring,stem,island,decor,ripple});
}
const starPositions=[];for(let i=0;i<480;i++){const n=i*12.9898;starPositions.push(Math.sin(n)*32,Math.cos(n*1.2)*25,Math.sin(n*2.9)*58-28);}
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)),new THREE.PointsMaterial({color:0xa9dccc,size:.065,transparent:true,opacity:.65}));scene.add(stars);
const arches=new THREE.Group();scene.add(arches);
for(let i=0;i<7;i++){const arch=new THREE.Mesh(new THREE.TorusGeometry(9+i*.3,.028,8,80),new THREE.MeshBasicMaterial({color:0x46756e,transparent:true,opacity:.12}));arch.position.set(Math.sin(i)*3,-i*4,-i*9-8);arches.add(arch);}
const trail=[];for(let i=0;i<14;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.065,8,8),new THREE.MeshBasicMaterial({color:0xd6ffd1,transparent:true,opacity:1-i/14}));scene.add(dot);trail.push(dot);}
const world=createStoryWorld(scene),rainWorld=createRainWorld(scene),identityWorld=createIdentityWorld(scene),teamWorld=createTeamWorld(scene);
const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x06101d)},bottom:{value:new THREE.Color(0x263440)}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 vDirection;void main(){float h=smoothstep(-0.4,0.7,normalize(vDirection).y);gl_FragColor=vec4(mix(bottom,top,h),1.0);}'});
const sky=new THREE.Mesh(new THREE.SphereGeometry(120,24,16),skyMaterial);sky.renderOrder=-1;scene.add(sky);

function applyTheme(index){
  activeScene=index;const t=themes[index];scene.background=new THREE.Color(t.bg);scene.fog=new THREE.FogExp2(t.bg,.012);
  skyMaterial.uniforms.top.value.setHex(t.bg).multiplyScalar(isBrand(selectedStory)||isCast(selectedStory)?.12:.48);skyMaterial.uniforms.bottom.value.setHex(t.bg).lerp(new THREE.Color(t.accent),isBrand(selectedStory)||isCast(selectedStory)?.008:index===3?.13:.075);
  bodyMaterial.color.setHex(t.ball);ballLight.color.setHex(t.accent);rim.color.setHex(t.accent);stars.material.color.setHex(t.accent);
  cap.material.color.setHex(t.base);bloom.strength=selectedStory===2?.65:.35;
  for(const p of platforms){p.mat.color.setHex(t.base);p.ringMat.color.setHex(t.ring);p.ringMat.emissive.setHex(t.ring);p.ripple.material.color.setHex(t.ring);p.stem.visible=selectedStory===0;p.island.visible=selectedStory===0;p.disc.visible=selectedStory!==2;p.disc.geometry=selectedStory===1?bookStepGeo:discGeo;p.page.visible=selectedStory===1;p.ring.visible=selectedStory===0;p.ripple.visible=selectedStory===0;p.decor.forEach((g,j)=>g.visible=selectedStory===0&&j===0);}
  cap.visible=capStar.visible=selectedStory===0;gradCap.visible=selectedStory===1;ball.children.forEach(c=>{if(c!==body&&c!==cap&&c!==capStar&&c!==gradCap)c.visible=selectedStory!==2;});bodyMaterial.emissive.setHex(selectedStory===2?0xaba0ff:0x000000);bodyMaterial.emissiveIntensity=selectedStory===2?.7:0;document.querySelector('.preview').dataset.story=stories[selectedStory].id;
  identityMark.visible=isCast(selectedStory);if(isCast(selectedStory))ballLight.color.setHex(identityRoles.self.color);
  $('scene-label').textContent=`0${index+1} / ${t.name}`;$('chapter').textContent=t.en;$('stage-title').textContent=t.title;
  $('stage-subtitle').textContent=t.subtitle;
  if(!buffer)$('track-label').textContent=stories[selectedStory].music;
  document.querySelectorAll('[data-story]').forEach(b=>{const on=+b.dataset.story===selectedStory||(selectedStory===4&&+b.dataset.story===2);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
  document.querySelectorAll('[data-chapter]').forEach((b,i)=>{b.classList.toggle('current',i===index);b.setAttribute('aria-current',i===index?'step':'false');});
}
function resize(){const {width,height:h}=stage.getBoundingClientRect();if(!width||!h)return;camera.aspect=width/h;camera.updateProjectionMatrix();renderer.setSize(width,h);composer.setSize(width,h);}
new ResizeObserver(resize).observe(stage);resize();
function audio(){
  if(ctx)return;ctx=new AudioContext();master=ctx.createGain();master.gain.value=muted?0:volume;
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;master.connect(limiter);limiter.connect(ctx.destination);
  reverb=ctx.createConvolver();const impulse=ctx.createBuffer(2,ctx.sampleRate*1.8,ctx.sampleRate);
  for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);let seed=17+channel;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/1073741824-1)*Math.pow(1-i/data.length,3)*.35;}}
  reverb.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.23;reverb.connect(wet);wet.connect(master);
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate);const noise=noiseBuffer.getChannelData(0);let seed=31;for(let i=0;i<noise.length;i++){seed=(seed*16807)%2147483647;noise[i]=seed/1073741824-1;}
}
function stopVoices(){for(const v of voices){try{v.stop();}catch{} }voices.clear();if(source){try{source.stop();}catch{}source=null;}}
function tone(midi,time,length,gain=.13,type='piano',panPosition=null){
  const osc=ctx.createOscillator(),env=ctx.createGain();
  if(type==='bell')osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(8),new Float32Array([0,1,0,.22,0,.06,0,.012])));
  else if(type==='piano')osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(8),new Float32Array([0,1,.34,.17,.08,.025,.012,.005])));
  else osc.type=type==='pad'?'sawtooth':type;
  osc.frequency.value=440*2**((midi-69)/12);
  const attack=type==='pad'?Math.min(.24,length*.2):.008;
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+attack);env.gain.exponentialRampToValueAtTime(.0001,time+length);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(type==='pad'?650:4200,time);filter.frequency.exponentialRampToValueAtTime(type==='pad'?1200:900,time+Math.max(.05,length));const pan=ctx.createStereoPanner();pan.pan.value=panPosition??Math.max(-.5,Math.min(.5,(midi-64)/35));osc.connect(filter);filter.connect(env);env.connect(pan);pan.connect(master);env.connect(reverb);osc.start(time);osc.stop(time+length+.02);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();filter.disconnect();env.disconnect();pan.disconnect();};
}
function percussion(i,at,step){
  if(selectedStory===3){
    for(const note of scoreFor(3,i))if(note.type==='bell'){
      const time=at+note.offset*step,drop=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();drop.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=800+note.midi*10;filter.Q.value=2;
      env.gain.setValueAtTime(.014,time);env.gain.exponentialRampToValueAtTime(.0001,time+.12);drop.connect(filter);filter.connect(env);env.connect(master);env.connect(reverb);drop.start(time);drop.stop(time+.13);voices.add(drop);drop.onended=()=>{voices.delete(drop);drop.disconnect();filter.disconnect();env.disconnect();};
    }return;
  }
  if(selectedStory!==2||i<16||i>=50||(i>=46&&i<48))return;
  if(i%2===0){const kick=ctx.createOscillator(),env=ctx.createGain();kick.frequency.setValueAtTime(110,at);kick.frequency.exponentialRampToValueAtTime(36,at+.18);env.gain.setValueAtTime(.24,at);env.gain.exponentialRampToValueAtTime(.0001,at+.24);kick.connect(env);env.connect(master);kick.start(at);kick.stop(at+.25);voices.add(kick);kick.onended=()=>{voices.delete(kick);kick.disconnect();env.disconnect();};}
  const ticks=i>=32?2:1;
  for(let n=0;n<ticks;n++){const time=at+n*step/2,noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();noise.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=7000;env.gain.setValueAtTime(i>=40?.025:.015,time);env.gain.exponentialRampToValueAtTime(.0001,time+.055);noise.connect(filter);filter.connect(env);env.connect(master);noise.start(time);noise.stop(time+.06);voices.add(noise);noise.onended=()=>{voices.delete(noise);noise.disconnect();filter.disconnect();env.disconnect();};}
}
function schedule(){
  if(!playing||buffer)return;
  const now=secondsNow(),step=60/bpm;
  while(scheduledBeat<STORY_BEATS&&scheduledBeat*step<now+.14){
    const i=scheduledBeat++,eventTime=anchor+i*step-elapsed;
    if(eventTime<ctx.currentTime-.02)continue;
    const at=Math.max(ctx.currentTime,eventTime);
    percussion(i,at,step);
    for(const n of scoreFor(selectedStory,i))tone(n.midi,at+n.offset*step,n.beats*step,n.gain,n.type,n.role?(selectedStory===5?teamRoles:identityRoles)[n.role].pan:null);
  }
}
setInterval(schedule,25);
async function play(){
  try{audio();await ctx.resume();if(elapsed>=getDuration()-.011)elapsed=0;anchor=ctx.currentTime;playing=true;
    scheduledBeat=Math.ceil(beatAt(elapsed,bpm)-1e-6);
    if(buffer){source=ctx.createBufferSource();source.buffer=buffer;source.connect(master);source.start(0,elapsed);}else schedule();
    $('play').textContent='Ⅱ 暂停播放';$('engine-status').textContent='正在播放';
  }catch{$('music-help').textContent='音频无法启动，请重新点击播放或检查浏览器音频权限。';pause();}
}
function pause(){if(playing)elapsed=secondsNow();playing=false;stopVoices();$('play').textContent=elapsed>0?'▶ 继续播放':'▶ 开始播放';$('engine-status').textContent='已暂停';}
function seek(seconds){const resume=playing;pause();elapsed=Math.min(getDuration(),Math.max(0,seconds));cameraSnap=true;if(resume)void play();else $('play').textContent=elapsed>=getDuration()-.011?'▶ 再播一次':elapsed>0?'▶ 继续故事':'▶ 播放故事';}
$('play').onclick=()=>playing?pause():void play();
$('watch').onclick=()=>void play();
$('reset').onclick=()=>{seek(0);};
$('seek').oninput=e=>seek(+e.target.value);
$('bpm').oninput=e=>{const was=playing;const pos=secondsNow(),old=bpm;pause();bpm=+e.target.value;elapsed=buffer?pos:pos*old/bpm;$('bpm-value').innerHTML=`${bpm} <small>BPM</small>`;$('work-bpm').value=bpm;pendingEdits.set(selectedStory,readWork());clearExport();workStatus('试听速度已更新。另存版本或导出可保留这个速度。');if(was)void play();};
$('height').oninput=e=>{height=+e.target.value;$('height-value').textContent=height<1.7?'轻盈':height<3?'适中':'高跳';};
function selectStory(index,work=null,workId=''){
  document.querySelector('.live-label').textContent=work?'RHYTHM DROP / YOUR STORY':index===5?'SHIGUANG / WELCOME FILM':index===4?'RHYTHM DROP / EXPERIMENT B':'RHYTHM DROP / ORIGINAL FILM';
  activeWork=work?validateWork(work):null;activeWorkId=workId;stories[index]=activeWork?applyWork(activeWork):baseStories[index];
  pause();uploadToken++;buffer=null;elapsed=0;selectedStory=index;bpm=stories[index].bpm;themes=makeThemes(index);activeScene=-1;automatic=true;cameraSnap=true;$('auto-scene').checked=true;
  $('bpm').disabled=false;$('bpm').value=bpm;$('bpm-value').innerHTML=`${bpm} <small>BPM</small>`;$('music').value='';$('builtin').hidden=true;
  $('story-name').textContent=stories[index].name;$('story-occasion').textContent=stories[index].occasion;$('story-synopsis').textContent=stories[index].synopsis;
  document.querySelector('label[for=height]').textContent=index===3?'浮动幅度':'弹跳高度';
  $('music-help').textContent=index===3?'雨滴钟琴的每次落音，对应水面上的一圈涟漪。':'每段故事有独立配乐；点击播放可听完整发展。';$('brand-field').hidden=index!==2;
  $('brand-field').hidden=!isBrand(index);$('brand-versions').hidden=!isBrand(index);$('identity-cast').hidden=index!==4;
  $('team-context').hidden=index!==5;$('team-cast').hidden=index!==5;
  document.querySelectorAll('[data-brand-version]').forEach(button=>button.setAttribute('aria-pressed',String(+button.dataset.brandVersion===index)));
  document.querySelectorAll('[data-chapter]').forEach((b,i)=>b.textContent=`0${i+1} · ${stories[index].chapters[i].name}`);
  $('ending-title').textContent=activeWork?activeWork.ending:index===2?'让一个想法发光':stories[index].ending;
  if(index===2){$('brand-name').value=activeWork?.brand||'LUMA';world.setBrand($('brand-name').value);}
  if(index===4){$('brand-name').value=activeWork?.brand||'LUMA';identityWorld.setBrand($('brand-name').value);}
  const url=new URL(location.href);url.searchParams.set('story',stories[index].id);if(workId)url.searchParams.set('work',workId);else url.searchParams.delete('work');history.replaceState(null,'',url);
  camera.position.set(5,5,11);cameraMode='follow';document.querySelectorAll('[data-camera]').forEach(b=>{const on=b.dataset.camera==='follow';b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('play').textContent='▶ 播放故事';$('engine-status').textContent='故事已就绪';applyTheme(0);populateEditor(activeWork||pendingEdits.get(index)||defaultWork(index));renderLibrary();
}
document.querySelectorAll('[data-story]').forEach(button=>button.onclick=()=>selectStory(+button.dataset.story));
document.querySelectorAll('[data-brand-version]').forEach(button=>button.onclick=()=>selectStory(+button.dataset.brandVersion));
document.querySelectorAll('[data-chapter]').forEach(button=>button.onclick=()=>seek(beatSeconds(+button.dataset.chapter*16)));
$('brand-name').oninput=e=>{if(selectedStory===4)identityWorld.setBrand(e.target.value);else world.setBrand(e.target.value);$('story-occasion').textContent=`虚构品牌 ${e.target.value||'LUMA'} / ${selectedStory===4?'同频叙事实验':'新品发布开场'}`;$('ending-title').textContent=activeWork?.ending||(selectedStory===4?stories[4].ending:'让一个想法发光');};
$('auto-scene').onchange=e=>automatic=e.target.checked;
document.querySelectorAll('[data-camera]').forEach(button=>button.onclick=()=>{cameraMode=button.dataset.camera;automatic=false;$('auto-scene').checked=false;document.querySelectorAll('[data-camera]').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});});
function setVolume(){if(master)master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.02);$('volume-value').textContent=`${Math.round(volume*100)}%`;$('mute').textContent=muted?'♩':'♫';$('mute').setAttribute('aria-pressed',String(muted));$('mute').setAttribute('aria-label',muted?'取消静音':'静音');}
$('volume').oninput=e=>{volume=+e.target.value/100;setVolume();};$('mute').onclick=()=>{muted=!muted;setVolume();};
$('music').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;const token=++uploadToken;
  if(file.size>80*1024*1024){$('music-help').textContent='请选择小于 80 MB 的音频文件。';return;}
  pause();$('music-help').textContent='正在读取音乐…';
  try{audio();const decoded=await ctx.decodeAudioData(await file.arrayBuffer());if(token!==uploadToken)return;pause();buffer=decoded;elapsed=0;$('track-label').textContent=file.name;$('music-help').textContent='自定义试听：剧情按音频时长展开，不自动识别节拍。故事原配乐可一键恢复。';$('bpm').disabled=true;$('builtin').hidden=false;$('play').textContent='▶ 播放故事';}
  catch{if(token===uploadToken)$('music-help').textContent='无法解码该音频，请尝试 MP3、WAV 或 OGG 文件。';}
};
$('builtin').onclick=()=>selectStory(selectedStory,activeWork,activeWorkId);
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.preview').requestFullscreen();}catch{$('engine-status').textContent='当前浏览器不支持全屏';}};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','TEXTAREA','SELECT','SUMMARY','A'].includes(e.target.tagName)){e.preventDefault();playing?pause():void play();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('loading').hidden=false;$('loading').textContent='图形上下文已中断，请刷新页面恢复。';});

const cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3();let previousTime=performance.now(),uiTick=0;
function render(now){
  const dt=Math.min((now-previousTime)/1000,.05);previousTime=now;
  const seconds=secondsNow(),beat=storyBeat(seconds,bpm,buffer?.duration),narrative=activeWork?workNarrative(activeWork,beat):narrativeAt(selectedStory,beat),themeIndex=narrative.chapter;
  const pose=directedPose(selectedStory,beat,height);
  if(themeIndex!==activeScene)applyTheme(themeIndex);
  for(let slot=0;slot<platforms.length;slot++){
    const index=Math.max(0,pose.index-7)+slot,p=platforms[slot],point=path(index);p.group.position.set(point.x,point.y,point.z);p.group.visible=selectedStory<2&&index<=64&&!(selectedStory===1&&index>=31&&index<=32);
    const age=pose.travel-index,pulse=age>=0&&age<1?Math.exp(-age*7):0;
    p.ringMat.emissiveIntensity=(index<=pose.travel?.55:.08)+pulse*3.5;p.ring.scale.setScalar(1+pulse*.045);
    p.ripple.material.opacity=age>=0&&age<.7?(1-age/.7)*.55:0;p.ripple.scale.setScalar(1+Math.max(0,Math.min(age,.7))*2.4);
    p.group.scale.y=1-pulse*.09;
  }
  ball.position.set(pose.x,pose.y,pose.z);
  const squash=Math.exp(-pose.phase*15)*.13;ball.scale.set(1+squash,1-squash,1+squash);
  const center=isBrand(selectedStory)?{x:0,y:0,z:0}:path(pose.travel);cameraTarget.set(center.x*.45,center.y+.2,center.z-1);
  if(cameraMode==='follow')desiredCamera.set(center.x+8,center.y+8,center.z+15);
  else if(cameraMode==='wide')desiredCamera.set(center.x+14,center.y+13,center.z+24);
  else desiredCamera.set(center.x+.01,center.y+26,center.z+6);
  if(automatic){
    const end=path(64),outro=ease((beat-54)/10);
    if(selectedStory===5){
      desiredCamera.set(0,2.8,10.8);cameraTarget.set(0,1.7,0);camera.fov=43;
    }else if(selectedStory===4){
      const pull=ease((beat-10)/16),formation=ease((beat-48)/10);
      desiredCamera.set(-2.25*(1-pull),2+formation*.45,5.5+pull*5);
      cameraTarget.set(-2.25*(1-pull),1+formation*.1,0);camera.fov=43;
    }else if(selectedStory===2){
      const pull=ease((beat-6)/12),reveal=ease((beat-48)/10);
      desiredCamera.set((1-reveal)*Math.sin(beat*.03)*1.3,1.4+(1-reveal)*.5,6+pull*8-reveal*2);
      cameraTarget.set(0,beat>=50?.4:1,0);
      camera.fov=beat<8?38:43;
    }else if(selectedStory===3){
      const opening=ease((beat-40)/20),pull=ease((beat-10)/18);
      desiredCamera.set(pose.x+4-opening*2,3+pull*.8,pose.z+9+opening*5);
      cameraTarget.set(pose.x*.65,1+opening*1.2,pose.z-2-opening*4);camera.fov=43;
    }else{
      const opening=ease((beat-4)/8),turn=selectedStory===1&&beat>=30&&beat<36;
      desiredCamera.set(center.x+3+opening*3,center.y+3+opening*3,center.z+8+opening*6);
      if(turn){desiredCamera.set(center.x+10,center.y+4,center.z+8);cameraTarget.set(center.x,center.y+1,center.z-3);}
      desiredCamera.lerp(new THREE.Vector3(end.x+(selectedStory===0?8:2),end.y+(selectedStory===0?6:4),end.z+(selectedStory===0?21:15)),outro);
      cameraTarget.lerp(new THREE.Vector3(end.x+(selectedStory===0?-2:0),end.y+3,end.z-2),outro);camera.fov=43;
    }
    camera.updateProjectionMatrix();
  }
  if(cameraSnap){camera.position.copy(desiredCamera);cameraSnap=false;}else camera.position.lerp(desiredCamera,1-Math.exp(-dt*4));camera.lookAt(cameraTarget);ball.lookAt(camera.position);
  sky.position.copy(camera.position);
  ball.visible=selectedStory!==2||beat<52;
  if(selectedStory===2)ball.scale.setScalar(1-ease((beat-48)/4));
  if(selectedStory===4){const state=identityState(beat);ball.scale.setScalar(1+state.pulses.self*.035);ball.rotation.z=state.tilt;identityGlow.opacity=.65+state.pulses.self*.35;}
  if(selectedStory===5){const state=teamState(beat);ball.scale.setScalar(1+state.pulses.self*.035);ball.rotation.z=state.tilt;identityGlow.opacity=.65+state.pulses.self*.35;}
  smile.scale.y=selectedStory===4?1-.7*ease((beat-20)/3)*(1-ease((beat-27)/3)):1;
  gradCap.position.y=selectedStory===1?Math.sin(Math.max(0,Math.min(1,(beat-60)/4))*Math.PI)*2:0;
  world.update(selectedStory,beat,pose);rainWorld.update(selectedStory===3,beat,pose);
  identityWorld.update(selectedStory===4,beat,camera);
  teamWorld.update(selectedStory===5,beat,camera);
  if(selectedStory===3){ball.scale.setScalar(1);key.color.setHex(beat>=48?0xffe4bb:0xc6ddf0);ballLight.intensity=1.5;}else{key.color.setHex(0xffffff);ballLight.intensity=3;}
  ballLight.position.copy(ball.position).add(new THREE.Vector3(0,1,1));
  stars.visible=selectedStory<2;arches.visible=false;
  stars.position.set(0,center.y,center.z);stars.rotation.z=beat*.003;arches.position.set(0,center.y,center.z);
  trail.forEach((dot,i)=>{const p=directedPose(selectedStory,Math.max(0,beat-i*.028),height);dot.position.set(p.x,p.y,p.z);dot.visible=selectedStory<2&&playing&&beat>6&&beat<64;});
  $('watch').hidden=playing||seconds>0;
  $('ending').classList.toggle('visible',beat>=64);
  $('ending').setAttribute('aria-hidden',String(beat<64));
  if(now-uiTick>90){uiTick=now;$('elapsed').textContent=formatTime(seconds);$('duration').textContent=formatTime(getDuration());$('seek').max=getDuration();$('seek').value=seconds;$('beat-label').textContent=`BEAT ${String(pose.index+1).padStart(2,'0')}`;
    $('story-line').textContent=narrative.line;
    $('story-line').hidden=beat>=64;
    $('quip').classList.toggle('show',!isBrand(selectedStory)&&narrative.age<2&&beat>1&&beat<60);$('quip').textContent=narrative.line;
    $('beat-label').textContent=beat>=64?'THE END':`故事 ${Math.round(beat/64*100)}%`;
  }
  composer.render();
  if(playing&&seconds>=getDuration()){pause();elapsed=getDuration();$('play').textContent='▶ 再播一次';$('engine-status').textContent='播放完成';}
  requestAnimationFrame(render);
}
function workStatus(message,error=false){$('work-status').textContent=message;$('work-status').classList.toggle('work-error',error);}
function readWork(){
  return {format:'rhythm-drop-work',version:1,storyId:baseStories[selectedStory].id,title:$('work-title').value,occasion:$('work-occasion').value,ending:$('work-ending').value,bpm:Number($('work-bpm').value),brand:isBrand(selectedStory)?$('brand-name').value:'LUMA',chapters:Array.from({length:4},(_,i)=>({title:$(`work-chapter-${i}`).value,line:$(`work-line-${i}`).value}))};
}
function checkedWork(){if(!$('story-editor').reportValidity())return null;try{return validateWork(readWork());}catch(error){workStatus(error.message,true);return null;}}
let exportURL='';
function clearExport(){if(exportURL)URL.revokeObjectURL(exportURL);exportURL='';$('work-export-panel').hidden=true;}
function populateEditor(work){
  clearExport();
  $('work-title').value=work.title;$('work-occasion').value=work.occasion;$('work-ending').value=work.ending;$('work-bpm').value=work.bpm;
  if(isBrand(selectedStory))$('brand-name').value=work.brand;
  work.chapters.forEach((c,i)=>{$(`work-chapter-${i}`).value=c.title;$(`work-line-${i}`).value=c.line;});
  $('story-editor').dataset.dirty='false';$('work-context').textContent=activeWork?`当前预览：${activeWork.title}${activeWorkId?' · 已保存版本':' · 尚未保存'}`:'当前播放原始故事。可以改写文案，预览后另存为版本。';
  workStatus(storageIssue||'原始故事始终保留；每次保存都会新增一个版本。',!!storageIssue);
}
function renderLibrary(){
  const select=$('saved-works');select.replaceChildren(new Option(`选择本机作品（${library.length}）…`,''));
  [...library].reverse().forEach((entry,i)=>{const time=new Date(entry.createdAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});select.add(new Option(`${entry.work.title} · v${library.length-i} · ${time}`,entry.id));});select.value=activeWorkId;
}
function persistWork(work){
  if(storageIssue)throw new Error(storageIssue);
  const entry={id:crypto.randomUUID(),createdAt:new Date().toISOString(),work:validateWork(work)},next=[...library,entry];
  try{localStorage.setItem(storageKey,serializeLibrary(next));}catch{throw new Error('本机保存未成功，旧版本保留。请导出作品文件保留这次改写。');}
  library=next;return entry;
}
function openWork(work,id=''){
  const valid=validateWork(work),index=baseStories.findIndex(s=>s.id===valid.storyId);pendingEdits.delete(index);selectStory(index,valid,id);
}
$('story-editor').onsubmit=e=>e.preventDefault();
$('story-editor').addEventListener('input',e=>{if(e.target.id==='work-import')return;clearExport();pendingEdits.set(selectedStory,readWork());$('story-editor').dataset.dirty='true';$('work-context').textContent='文案已修改。点击“预览改写”查看效果，点击“保存为新版本”保留。';workStatus('修改尚未保存。切换故事时暂存文案，刷新前请保存或导出。');});
$('work-preview').onclick=()=>{const work=checkedWork();if(!work)return;openWork(work);workStatus('已应用改写；点击播放观看。这个版本尚未保存。');};
$('work-save').onclick=()=>{const work=checkedWork();if(!work)return;try{const entry=persistWork(work);openWork(entry.work,entry.id);workStatus(`已保存为新版本。当前共有 ${library.length} 个版本；旧作品和原始故事均保留。`);}catch(error){workStatus(error.message,true);}};
$('work-export').onclick=()=>{
  const work=checkedWork();if(!work)return;clearExport();const json=JSON.stringify(work,null,2)+'\n';exportURL=URL.createObjectURL(new Blob([json],{type:'application/json'}));$('work-json').value=json;$('work-download').href=exportURL;$('work-download').download=`rhythm-drop-${work.storyId}-${Date.now()}.json`;$('work-export-panel').hidden=false;workStatus('作品文件已就绪。下载 JSON，或复制下方文本保存为 .json 文件，之后可导入。');
};
$('work-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('work-json').value);workStatus('作品文本已复制。粘贴到文本文件并保存为 .json，即可迁移或备份。');}catch{$('work-json').focus();$('work-json').select();workStatus('请使用 Ctrl+C（Mac 使用 ⌘C）复制已选中的作品文本。');}};
$('work-import').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>65536)throw new Error('作品文件应小于 64 KB。');const work=validateWork(JSON.parse(await file.text()));
    try{const entry=persistWork(work);openWork(entry.work,entry.id);workStatus('作品已导入并另存为新版本，原有记录保留。');}catch(error){openWork(work);workStatus(`作品已导入预览，但未保存：${error.message}`,true);}
  }catch(error){workStatus(`无法导入：${error.message} 原有作品保留。`,true);}finally{e.target.value='';}
};
$('saved-works').onchange=e=>{const entry=library.find(item=>item.id===e.target.value);if(entry){openWork(entry.work,entry.id);workStatus('已打开保存的版本。继续改写时，可再另存一个版本。');}};
examples.forEach((work,i)=>$('work-example').add(new Option(work.title,String(i))));
$('work-example').onchange=e=>{if(e.target.value==='')return;openWork(examples[Number(e.target.value)]);e.target.value='';workStatus('已打开创作示例，尚未另存。可直接播放，也可以改写后保存为你的版本。');};
$('work-original').onclick=()=>{pendingEdits.set(selectedStory,readWork());selectStory(selectedStory);workStatus('已恢复原始故事的画面和文案。你的保存版本仍在作品列表中。');};
const initialWorkId=new URLSearchParams(location.search).get('work');
camera.position.set(5,5,11);selectStory(Math.max(0,stories.findIndex(s=>s.id===new URLSearchParams(location.search).get('story'))));$('loading').hidden=true;$('play').disabled=false;
const initialWork=library.find(entry=>entry.id===initialWorkId);if(initialWork)openWork(initialWork.work,initialWork.id);
else if(initialWorkId)workStatus('这个版本不在当前浏览器的作品档案中。请导入对应的作品 JSON 文件；当前展示原始故事。',true);
requestAnimationFrame(render);
