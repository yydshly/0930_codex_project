import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ensureReferencePlush} from './reference-plush-asset.js';
import {sanitizeReferenceFur} from './reference-plush-fur.js';
import {createReferencePlushBrush} from './reference-plush-brush.js';
import {FurCoat} from './fur.js';
import {stepSpring,stepBounce} from './physics.js';
import {pressOffset} from './deformation.js';
import {shapePoint} from './shapes.js';
import {ShellFurCoat} from './shell-fur.js';
import {sanitizeRecipe,encodeRecipe,decodeRecipe,readCollection,saveCollection,MAX_RECIPES,COLLECTION_KEY} from './recipes.js';
import {MAX_LOCAL_STAMPS} from './local-coat-field.js';
import {newEditStroke,recordEditResult,editStrokeFeedback,toolNames} from './editor-feedback.js';
import {createEditHistory} from './edit-history.js';
import {readDraft,saveDraft,clearDraft,chooseStartupRecipe,DRAFT_KEY} from './draft.js';
import {initProjectJournal} from './project-journal.js';
import {mountPlushReferenceView} from './plush-reference-view.js';

const $ = s => document.querySelector(s);
let nativeViewActive=true;
let referenceAsset=null,referenceActor=null,referenceOrbit=null,referenceLoading=null,referenceSpin=false,referenceJump=0,referenceVelocity=0,referenceSavedCamera=null;
const referenceStyleKey='plush-reference-creation-v1';
let referenceStyle={tint:'#ffffff',size:1,fur:sanitizeReferenceFur()},referenceBrush=null;
const referenceHistory=createEditHistory(24),referenceSnapshot=()=>({snapshot:JSON.stringify(referenceStyle)});
try{const saved=JSON.parse(window.localStorage.getItem(referenceStyleKey)||'null');if(/^#[0-9a-f]{6}$/i.test(saved?.tint))referenceStyle.tint=saved.tint;if(Number.isFinite(saved?.size))referenceStyle.size=THREE.MathUtils.clamp(saved.size,.65,1.35);referenceStyle.fur=sanitizeReferenceFur(saved?.fur);}catch{}
const characters = [
  {name:'蓝莓',desc:'有一点害羞的浪漫艺术家',color:'#7094ef',shape:'pear',accessory:'beret'},
  {name:'抹茶',desc:'慢半拍，但总是很开心',color:'#b5ce8c',shape:'bean',accessory:'sprout'},
  {name:'奶油',desc:'今天也要做个优雅的绅士',color:'#ebc656',shape:'triangle',accessory:'glasses'},
  {name:'葡萄',desc:'心里装着一整个奇妙宇宙',color:'#bc9adc',shape:'heart',accessory:'stars'},
  {name:'蜜桃',desc:'软软的，喜欢每一个拥抱',color:'#eda9ac',shape:'egg',accessory:'headphones'},
  {name:'兔兔',desc:'长耳朵，装着一点点好奇心',color:'#f0d9d2',shape:'bunny',accessory:'rabbit'},
  {name:'团熊',desc:'像一杯暖可可，陪你慢慢来',color:'#ba8f6d',shape:'bear',accessory:'bear'},
  {name:'星仔',desc:'一颗落到怀里的软软小星星',color:'#e8b759',shape:'star',accessory:'starface'},
];
const presets = {
  cloud:{length:.09,density:90,thickness:.0026,curl:.35,gravity:.25,mess:.35,brightness:1,stiffness:.6,roughness:.9},
  velvet:{length:.045,density:110,thickness:.0022,curl:.06,gravity:.2,mess:.1,brightness:1,stiffness:.8,roughness:.72},
  wild:{shortPile:false,length:.28,density:80,thickness:.0022,curl:.45,gravity:.65,mess:.65,brightness:1,stiffness:.25,roughness:.75},
  wool:{shortPile:false,length:.13,density:110,thickness:.0031,curl:.95,gravity:.5,mess:.18,brightness:1,stiffness:.55,roughness:.92},
};
Object.assign(presets,{
  silk:{shortPile:false,length:.27,density:90,thickness:.0025,curl:.06,gravity:.45,mess:.08,brightness:1,stiffness:.4,roughness:.8,groom:.8,wetness:0},
  teddy:{shortPile:false,length:.075,density:115,thickness:.0038,curl:1,gravity:.2,mess:.28,brightness:1,stiffness:.8,roughness:1,groom:0,wetness:0},
  dandelion:{shortPile:false,length:.21,density:105,thickness:.0028,curl:.18,gravity:.12,mess:.85,brightness:1,stiffness:.7,roughness:.95,groom:0,wetness:0},
  rain:{shortPile:false,length:.18,density:90,thickness:.003,curl:.12,gravity:.65,mess:.1,brightness:1,stiffness:.38,roughness:.45,groom:.7,wetness:.9},
});
for(const preset of Object.values(presets)){preset.groom??=0;preset.wetness??=0}
const materialNames={cloud:'☁ 云朵绒',velvet:'✦ 短天鹅绒',wild:'〰 小炸毛',wool:'❋ 卷羊毛',silk:'↓ 顺滑长毛',teddy:'♧ 泰迪卷绒',dandelion:'✳ 蒲公英绒',rain:'☂ 雨后湿绒'};
$('.presets').replaceChildren();
for(const [id,label] of Object.entries(materialNames)){const b=document.createElement('button');b.dataset.preset=id;b.textContent=label;b.classList.toggle('active',id==='cloud');b.setAttribute('aria-pressed',String(id==='cloud'));$('.presets').append(b)}
const miniClasses=['blue','green','yellow','purple','pink','rabbit-mini','bear-mini','star-mini'];
const charLabels=['蓝莓，蓝色艺术家','抹茶，绿色小伙伴','奶油，黄色绅士','葡萄，紫色小精灵','蜜桃，粉色小团子','兔兔，长耳小兔','团熊，圆耳小熊','星仔，五角小星星'];
$('.picker').replaceChildren();
characters.forEach((c,i)=>{const b=document.createElement('button');b.dataset.character=i;b.title=c.name;b.setAttribute('aria-label',charLabels[i]);b.setAttribute('aria-pressed',String(i===2));b.classList.toggle('selected',i===2);const mini=document.createElement('span');mini.className='mini '+miniClasses[i];mini.style.background=c.color;mini.textContent=i===2?'◎ ◎':'• •';b.append(mini);$('.picker').append(b)});
let params = {...presets.cloud}, index = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaultExperiment=()=>({mode:'off',clump:.65,shadow:.45,field:[],coat:'',edits:[],collision:false,groomDynamics:false});
let experiment=defaultExperiment(),persistentBrush=false;
const editor={tool:null,selected:'trim',radius:.24,value:.35,values:{trim:.35,dye:1,curl:.7,restore:1},color:'#b66b8c',restoreTarget:'all'};
const editHistory=createEditHistory();
let editStrokeActive=false,editStrokeLabel='',editStrokeBefore=null,editStrokeChanged=false,lastEditPoint=null,editStrokeOutcome=null,editorHit=null;
let editBatch=false,editBatchCount=0,editBatchStart='';
let windDemoEnd=-100;
let scene, renderer, camera, creature, eyes=[], fur, body, keyLight, rimLight, fillLight, shadow;
let yaw=0,pitch=0,drag=null,dragged=false,lastFrame=performance.now(),elapsed=0,blinkAt=3;
const pointer=new THREE.Vector2(), raycaster=new THREE.Raycaster();
const motion = {x:0,y:0};
let rebuildTimer;
let coat,windEnabled=false,brushMode=false,turntable=false,closeup=false;
let windStrength=.5,shakeStart=-100,jumpHeight=0,jumpVelocity=0,impact=0;
let springPosition=[0,0,0],springVelocity=[0,0,0],bodyAccumulator=0;
let lastHit=null,furImpulse=new THREE.Vector3();
let frameCount=0,fpsTime=0,renderDirty=true;
const pressCenter=new THREE.Vector3();let pressPosition=[0,0,0],pressVelocity=[0,0,0],lastPressDepth=0,pressDemoStart=-100;
let faceGuard=false;
let squeezeMode=false,squeezing=false,sleeping=false,greetingStart=-100,captureUrl=null;
let backdropMode='cream',activityEnd=-100,activityDone='',currentView='dress',quality='balanced';
let collection=[],removedRecipe=null;
let storage=null;try{storage=window.localStorage}catch{}
let draftBaseToken='',draftSignature='',draftTimer=null,draftDirty=false,draftReady=false;
const pointScratch=[0,0,0],normalScratch=[0,0,0],offsetScratch=[0,0,0];
const definitions=[['groom','梳理程度','GROOM',0,1,.01],['wetness','湿润程度','WET',0,1,.01],['length','毛发长度','LENGTH',.025,.32,.005],['density','绒毛密度','DENSITY',25,120,1],['thickness','纤维粗细','FIBER',.001,.006,.0001],['curl','卷曲程度','CURL',0,1,.01],['gravity','重力垂落','GRAVITY',0,1,.01],['mess','蓬松程度','FLUFF',0,1,.01],['stiffness','弯曲刚度','STIFFNESS',.1,1,.01],['roughness','纤维粗糙','ROUGHNESS',.2,1,.01],['brightness','光照亮度','LIGHT',.6,1.4,.01]];
for(const [id,label,en,min,max,step] of definitions){
  const row=document.createElement('div');row.className='control';
  row.innerHTML=`<label for="${id}"><span>${label}<small>${en}</small></span><output for="${id}" id="${id}-value"></output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${params[id]}">`;
  $('#controls').append(row);
  row.querySelector('input').addEventListener('input',e=>{params[id]=Number(e.target.value);syncControls();document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});if(id==='brightness')updateLight();else if(id==='density'){clearTimeout(rebuildTimer);rebuildTimer=setTimeout(buildFur,100)}else buildFur()});
}
function syncControls(){const shell=experiment.mode==='shell';for(const [id,,,min,max] of definitions){$(`#${id}`).value=params[id];$(`#${id}-value`).value=id==='density'?`${params[id]}${shell?'%':'k'}`:id==='thickness'?(params[id]*1000).toFixed(1):params[id].toFixed(2);if(id==='thickness'||id==='roughness'){$(`#${id}`).disabled=shell||params.shortPile!==false;$(`#${id}`).title=shell?'层壳实验使用固定截面与整体哑光':params.shortPile!==false?'密实短绒保持固定宽度与哑光，长毛预设可调':'';if(shell||params.shortPile!==false)$(`#${id}-value`).value=id==='thickness'?'固定':'哑光'}$(`#${id}`).style.setProperty('--fill',`${(params[id]-min)/(max-min)*100}%`)}$('#density').closest('.control').querySelector('label>span').firstChild.textContent=shell?'纹理密度':'绒毛密度';}
syncControls();
function mesh(geometry,color,roughness=.5){return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness,metalness:roughness<.2?.08:0}))}
function sphere(color,x,y,z,sx,sy=sx,sz=sx,parent=creature){const obj=mesh(new THREE.SphereGeometry(1,32,24),color);obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);parent.add(obj);return obj}
function surface(theta,phi){return new THREE.Vector3().fromArray(shapePoint(characters[index].shape,theta,phi))}
function normalAt(t,p){const a=surface(Math.max(.0001,t-.001),p),b=surface(Math.min(Math.PI-.0001,t+.001),p),c=surface(t,p-.001),d=surface(t,p+.001);return b.sub(a).cross(d.sub(c)).normalize()}
function buildBody(){const geom=new THREE.SphereGeometry(1,80,56);const pos=geom.attributes.position;for(let i=0;i<pos.count;i++){const v=new THREE.Vector3().fromBufferAttribute(pos,i);const t=Math.acos(THREE.MathUtils.clamp(v.y,-1,1)),p=Math.atan2(v.x,v.z);const out=surface(t,p);pos.setXYZ(i,out.x,out.y,out.z)}geom.computeVertexNormals();body=mesh(geom,new THREE.Color(characters[index].color).multiplyScalar(.9),1);body.userData.rest=geom.attributes.position.array.slice();body.userData.normals=geom.attributes.normal.array.slice();creature.add(body)}
function buildFur(){
  renderDirty=true;if(!renderer)return;
  if(coat&&((experiment.mode==='shell')!==(coat instanceof ShellFurCoat))){experiment.field=coat.getGroomField?.()||experiment.field;readLocalState();creature.remove(coat.mesh);coat.dispose();coat=null;}
  if(coat){coat.updateParams(params)}
  else {coat=experiment.mode==='shell'?new ShellFurCoat(surface,normalAt,$('#fur-color').value,params):new FurCoat(surface,normalAt,$('#fur-color').value,params);coat.setGroomField?.(experiment.field);coat.applyLocalState?.({snapshot:experiment.coat||'',edits:experiment.edits||[]});coat.setContacts?.(accessoryContacts());creature.add(coat.mesh)}
  fur=coat.mesh;coat.setExperiment?.(experiment);
  coat.uniforms.uFaceGuard.value=faceGuard&&index===2?1:0;
  coat.setLighting(keyLight,fillLight,rimLight);coat.setViewport(renderer.domElement.width,renderer.domElement.height);
  $('#status').textContent=experiment.mode==='shell'?'32 层壳 · 固定体纹理 / 切向剪切':`${Math.round(params.density)}k 根纤维 · ${experiment.collision?'32 根导向链 / 简化接触':experiment.groomDynamics?'32 根导向链 / 毛流随动':experiment.mode==='ftl'?'32 根保长导向链':experiment.mode==='bundles'?'毛束聚集 / 根部遮蔽':'毛根固定 / 弹性回弹'}`;
}
function ring(radius,tube,color,x,y,z,rotation=0){const obj=mesh(new THREE.TorusGeometry(radius,tube,12,64),color,.3);obj.position.set(x,y,z);obj.rotation.z=rotation;creature.add(obj);return obj}
function rod(a,b,r,color){const diff=new THREE.Vector3().subVectors(b,a),obj=mesh(new THREE.CylinderGeometry(r,r,diff.length(),12),color);obj.position.copy(a).add(b).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());creature.add(obj);return obj}
function buildEyes(){
  eyes=[];const formal=index===2;const eyeY=formal?.18:.27,spacing=formal?.33:.3;
  for(const sign of [-1,1]){
    const group=new THREE.Group();group.position.set(sign*spacing,eyeY,formal?.83:.91);creature.add(group);
    if(formal){sphere('#fffdf3',0,0,0,.235,.25,.13,group)}
    const pupil=sphere('#20242b',0,0,formal?.12:.015,formal?.106:.112,formal?.125:.165,.075,group);pupil.material.roughness=.12;
    sphere('#ffffff',-.028,.045,.067,.032,.036,.016,pupil);
    sphere('#ffffff',.036,-.033,.064,.012,.012,.006,pupil);
    eyes.push({group,pupil});
  }
  if(index===4||index===5||index===7){for(const sign of [-1,1])sphere('#dc7f89',sign*.5,-.03,.84,.14,.065,.022)}
  if(index!==0){const mouth=mesh(new THREE.TorusGeometry(.065,.012,8,24,Math.PI),'#454443');mouth.rotation.z=Math.PI;mouth.position.set(0,index===2?-.18:-.12,.98);mouth.scale.y=.65;creature.add(mouth);}
}
function accessories(){
  const type=characters[index].accessory;
  if(type==='beret'){const hat=sphere('#353736',-.15,1.05,0,.99,.18,.72);hat.rotation.z=.28;hat.material.roughness=1;sphere('#353736',-.33,1.27,-.03,.13,.12,.12);}
  if(type==='sprout'){rod(new THREE.Vector3(0,.86,0),new THREE.Vector3(.04,1.3,0),.024,'#637449');const leaf=sphere('#7d9856',.21,1.26,0,.26,.08,.1);leaf.rotation.z=.35;const leaf2=sphere('#92aa64',-.14,1.15,0,.22,.07,.11);leaf2.rotation.z=-.4;}
  if(type==='glasses'){
    for(const sign of [-1,1]){ring(.27,.018,'#55544c',sign*.33,.18,.99);rod(new THREE.Vector3(sign*.59,.2,.99),new THREE.Vector3(sign*.86,.23,.55),.014,'#55544c')}
    rod(new THREE.Vector3(-.065,.22,.99),new THREE.Vector3(.065,.22,.99),.018,'#55544c');
    for(const sign of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.14,.1,.26,.13);shape.quadraticCurveTo(.3,0,.26,-.13);shape.quadraticCurveTo(.14,-.1,0,0);const bow=mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:10}),'#303432',.6);bow.scale.x=sign;bow.position.set(0,-.72,.91);creature.add(bow)}sphere('#303432',0,-.72,.96,.065,.075,.04);
  }
  if(type==='stars'){for(const sign of [-1,1]){rod(new THREE.Vector3(sign*.53,.78,-.03),new THREE.Vector3(sign*.67,1.35,0),.016,'#a08cb4');const star=mesh(new THREE.OctahedronGeometry(.12),'#e8d9a2',.4);star.position.set(sign*.67,1.35,0);star.rotation.z=.5;creature.add(star)}}
  if(type==='rabbit'){sphere('#c88e91',0,.05,.94,.05,.036,.03)}
  if(type==='bear'){sphere('#e6c6a5',0,-.12,.78,.32,.23,.13);sphere('#493d34',0,.04,.94,.08,.05,.035);const scarf=mesh(new THREE.TorusGeometry(.85,.045,12,64),'#b26153',.9);scarf.rotation.x=Math.PI/2;scarf.position.y=-.48;scarf.scale.z=.83;creature.add(scarf)}
  if(type==='headphones'){const band=mesh(new THREE.TorusGeometry(.97,.05,12,64,Math.PI),'#776778');band.position.set(0,.16,-.1);band.scale.y=1.15;creature.add(band);for(const sign of [-1,1]){sphere('#776778',sign*.94,.16,0,.16,.32,.26);sphere('#d9c6ce',sign*1.025,.16,.01,.095,.23,.20)}}
}
function accessoryContacts(){
  const ellipsoid=(center,radii)=>({type:'ellipsoid',center,radii});
  const capsule=(a,b,radius)=>({type:'capsule',a,b,radius});
  const type=characters[index].accessory;
  if(type==='beret')return [ellipsoid([-.15,1.05,0],[.99,.18,.72]),ellipsoid([-.33,1.27,-.03],[.13,.12,.12])];
  if(type==='glasses'){
    const frames=[];for(const sign of [-1,1])for(let j=0;j<4;j++){
      const a=j*Math.PI/2,b=(j+1)*Math.PI/2;
      frames.push(capsule([sign*.33+.27*Math.cos(a),.18+.27*Math.sin(a),.99],[sign*.33+.27*Math.cos(b),.18+.27*Math.sin(b),.99],.024));
    }return frames;
  }
  if(type==='sprout')return [capsule([0,.86,0],[.04,1.3,0],.028),ellipsoid([.21,1.26,0],[.26,.11,.1]),ellipsoid([-.14,1.15,0],[.22,.1,.11])];
  if(type==='stars')return [-1,1].flatMap(sign=>[capsule([sign*.53,.78,-.03],[sign*.67,1.35,0],.022),ellipsoid([sign*.67,1.35,0],[.12,.12,.12])]);
  if(type==='headphones'){
    const contacts=[ellipsoid([-.94,.16,0],[.16,.32,.26]),ellipsoid([.94,.16,0],[.16,.32,.26])];
    for(let j=0;j<6;j++){const a=j*Math.PI/6,b=(j+1)*Math.PI/6;contacts.push(capsule([.97*Math.cos(a),.16+1.115*Math.sin(a),-.1],[.97*Math.cos(b),.16+1.115*Math.sin(b),-.1],.055));}return contacts;
  }
  if(type==='bear'){
    const contacts=[ellipsoid([0,-.12,.78],[.32,.23,.13])];
    for(let j=0;j<6;j++){const a=j*Math.PI/3,b=(j+1)*Math.PI/3;contacts.push(capsule([.85*Math.cos(a),-.48,.7055*Math.sin(a)],[.85*Math.cos(b),-.48,.7055*Math.sin(b)],.05));}return contacts;
  }
  if(type==='rabbit')return [ellipsoid([0,.05,.94],[.05,.036,.03])];
  return [];
}
function disposeCreature(){if(!creature)return;if(coat){creature.remove(coat.mesh);coat.dispose();coat=null}scene.remove(creature);creature.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose()}});fur=null;}
function selectCharacter(i){activityEnd=-100;shakeStart=greetingStart=-100;drag=null;pointer.set(0,0);furImpulse.set(0,0,0);index=i;squeezing=false;pressDemoStart=-100;pressPosition.fill(0);pressVelocity.fill(0);lastPressDepth=0;$('#fur-color').value=characters[i].color;clearTimeout(rebuildTimer);disposeCreature();creature=new THREE.Group();creature.visible=nativeViewActive;scene.add(creature);buildBody();buildEyes();accessories();buildFur();yaw=pitch=0;lastHit=null;springPosition.fill(0);springVelocity.fill(0);jumpHeight=0;jumpVelocity=0;$('#char-name').textContent=characters[i].name;$('#recipe-name').value=characters[i].name;$('#char-desc').textContent=characters[i].desc;$('#char-number').textContent=`${String(i+1).padStart(2,'0')} / ${String(characters.length).padStart(2,'0')}`;document.querySelectorAll('[data-character]').forEach(b=>{const active=Number(b.dataset.character)===i;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});syncFaceGuard()}
let lightMode='day';
function updateLight(){renderDirty=true;if(!keyLight)return;const settings={day:['#fffaf2','#dbe6ff',4.5,2.5],warm:['#ffe3a8','#f7cbd6',4.7,2.0],night:['#c2d6ff','#b1abed',3.5,3.4]}[lightMode];keyLight.color.set(settings[0]);rimLight.color.set(settings[1]);keyLight.intensity=settings[2]*params.brightness;rimLight.intensity=settings[3]*params.brightness;fillLight.intensity=2*params.brightness;renderer.toneMappingExposure=1;coat?.setLighting(keyLight,fillLight,rimLight);}
function bounce(){jumpVelocity=3.1;jumpHeight=Math.max(jumpHeight,.001);springVelocity[1]-=1.8;furImpulse.y=-.7}
function resize(){renderDirty=true;const {width,height}=$('.stage').getBoundingClientRect();renderer.setSize(width,height,false);coat?.setViewport(renderer.domElement.width,renderer.domElement.height);camera.aspect=width/height;if(nativeViewActive){camera.position.set(0,.35,camera.aspect<.8?6.7:5.4);camera.lookAt(0,0,0);}camera.updateProjectionMatrix()}
function animate(now){
  requestAnimationFrame(animate);const realDt=Math.max(0,(now-lastFrame)/1000),dt=Math.min(realDt,.05);lastFrame=now;
  if(!nativeViewActive){
    if(referenceActor){
      const landing=stepBounce(referenceJump,referenceVelocity,dt);referenceJump=landing.height;referenceVelocity=landing.velocity;
      if(referenceSpin)referenceActor.rotation.y+=dt*.35;
      referenceActor.scale.setScalar(referenceStyle.size);
      referenceActor.position.y=-1.04+1.1*referenceStyle.size+referenceJump;
      shadow.material.opacity=.2*Math.exp(-referenceJump*1.3);shadow.scale.setScalar(referenceStyle.size+referenceJump*.35);
    }
    referenceOrbit?.update();renderer.render(scene,camera);
    frameCount++;fpsTime+=realDt;if(fpsTime>1){$('#fps').textContent=referenceAsset?`${Math.round(frameCount/fpsTime)} FPS · 349 万点`:'加载角色…';frameCount=0;fpsTime=0;}
    return;
  }
  const desiredDistance=(camera.aspect<.8?6.7:5.4)*(closeup?.72:1);
  const poseSettled=Math.abs(creature.rotation.y-(yaw+(brushMode||squeezeMode||editor.tool?0:motion.x*.12)))<.003&&Math.abs(creature.rotation.x-(pitch-(brushMode||squeezeMode||editor.tool?0:motion.y*.04)))<.003;
  if(paused&&!renderDirty&&poseSettled&&Math.abs(camera.position.z-desiredDistance)<.003&&Math.abs(pointer.x-motion.x)<.003&&Math.abs(pointer.y-motion.y)<.003)return;
  renderDirty=false;
  if(!paused)elapsed+=dt;
  const t=elapsed,lerp=1-Math.exp(-dt*8);
  if(windDemoEnd>=0&&t>=windDemoEnd){windEnabled=false;windDemoEnd=-100;syncEffects()}
  if(activityEnd>=0&&t>=activityEnd){feedback(activityDone);activityEnd=-100}
  motion.x+=(pointer.x-motion.x)*lerp;motion.y+=(pointer.y-motion.y)*lerp;
  const shakeAge=t-shakeStart,shake=shakeAge>=0&&shakeAge<1.4?Math.sin(shakeAge*30)*Math.exp(-shakeAge*2):0;
  if(!paused){
    bodyAccumulator=Math.min(bodyAccumulator+dt,.1);
    while(bodyAccumulator>=1/120){
      const landing=stepBounce(jumpHeight,jumpVelocity);jumpHeight=landing.height;jumpVelocity=landing.velocity;
      if(landing.impact){impact=landing.impact;springVelocity[1]-=impact*.55;furImpulse.y=impact*.18}
      stepSpring(springPosition,springVelocity,[0,0,0],115);
      stepSpring(pressPosition,pressVelocity,[squeezing||(t-pressDemoStart>=0&&t-pressDemoStart<2)?24:0,0,0],110);
      bodyAccumulator-=1/120;
    }
    if(turntable)yaw+=dt*.38;
  }
  const pressDepth=THREE.MathUtils.clamp(pressPosition[0],0,.24);
  if(Math.abs(pressDepth-lastPressDepth)>.00001||squeezing){
    const pos=body.geometry.attributes.position,rest=body.userData.rest,normals=body.userData.normals;
    const center=pressCenter.toArray();
    for(let i=0;i<pos.count;i++){for(let a=0;a<3;a++){pointScratch[a]=rest[i*3+a];normalScratch[a]=normals[i*3+a]}const off=pressOffset(pointScratch,normalScratch,center,pressDepth,.38,offsetScratch);pos.setXYZ(i,rest[i*3]+off[0],rest[i*3+1]+off[1],rest[i*3+2]+off[2])}
    pos.needsUpdate=true;body.geometry.computeVertexNormals();lastPressDepth=pressDepth;
  }
  coat.uniforms.uPressCenter.value.copy(pressCenter);coat.uniforms.uPressDepth.value=pressDepth;
  const pressure=Math.round(pressDepth/.24*100);$('#press-meter').value=pressure;$('#press-value').value=pressure+'%';
  const marker=$('#touch-marker');marker.hidden=pressDepth<.02;
  if(!marker.hidden){creature.updateMatrixWorld();const projected=creature.localToWorld(pressCenter.clone()).project(camera);marker.style.left=`${(projected.x+1)*50}%`;marker.style.top=`${(1-projected.y)*50}%`;marker.style.opacity=String(Math.min(1,pressDepth*6))}
  const contactY=-1.04-surface(Math.PI-.0001,0).y*.8+params.length*.8*.7;
  creature.position.set(.12,contactY+(paused?0:Math.sin(t*1.5)*.006)+jumpHeight,0);
  creature.rotation.y+=(yaw+(brushMode||squeezeMode||editor.tool?0:motion.x*.12)-creature.rotation.y)*lerp;
  creature.rotation.x+=(pitch-(brushMode||squeezeMode||editor.tool?0:motion.y*.04)-creature.rotation.x)*lerp;
  const greetingAge=t-greetingStart,greeting=greetingAge>=0&&greetingAge<2?Math.sin(greetingAge*11)*Math.sin(Math.PI*greetingAge/2):0;
  creature.rotation.z=shake*.13+greeting*.18+(paused?0:Math.sin(t*.8)*.008);
  const squash=THREE.MathUtils.clamp(springPosition[1],-.16,.12);
  // Nearly constant volume: lateral scale compensates vertical compression.
  const vertical=1+squash+(sleeping?.012*Math.sin(t*1.8):0),lateral=1/Math.sqrt(vertical);
  creature.scale.set(.8*lateral,.8*vertical,.8*lateral);
  creature.position.y+=surface(Math.PI-.0001,0).y*.8*(1-vertical);
  if(t>blinkAt+.2)blinkAt=t+2.8+Math.random()*3;
  const blink=sleeping?.07:t>=blinkAt&&t<=blinkAt+.2?Math.max(.08,Math.abs((t-blinkAt-.1)/.1)):1;
  for(const eye of eyes){eye.group.scale.y=blink;eye.group.position.z=index===2?.79+params.length*.45:.83+params.length*.65;eye.pupil.position.x=motion.x*.035;eye.pupil.position.y=motion.y*.035}
  if(!paused){furImpulse.x+=shake*dt*8;furImpulse.multiplyScalar(Math.exp(-dt*4))}
  coat?.update(paused?0:dt,t,params,windEnabled?windStrength:0,furImpulse,creature.quaternion);
  shadow.material.opacity=.2*Math.exp(-jumpHeight*1.3);shadow.scale.setScalar(1+jumpHeight*.35);
  const targetDistance=(camera.aspect<.8?6.7:5.4)*(closeup?.72:1);
  camera.position.z+=(targetDistance-camera.position.z)*lerp;
  camera.lookAt(.1,-.02,0);
  renderer.render(scene,camera);
  if(!paused){frameCount++;fpsTime+=realDt;if(fpsTime>1){$('#fps').textContent=`${Math.round(frameCount/fpsTime)} FPS`;frameCount=0;fpsTime=0;}}
}

try{
  renderer=new THREE.WebGLRenderer({canvas:$('#scene'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(39,1,.1,50);
  scene.add(new THREE.HemisphereLight('#ffffff','#bcc4b7',2));
  keyLight=new THREE.DirectionalLight('#fffaf2',4.5);keyLight.position.set(-3,5,4);scene.add(keyLight);
  rimLight=new THREE.DirectionalLight('#dbe6ff',2.5);rimLight.position.set(3,2,-2);scene.add(rimLight);
  fillLight=new THREE.DirectionalLight('#fff',2);fillLight.position.set(1,0,4);scene.add(fillLight);
  const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(55,65,42,1)');gradient.addColorStop(.35,'rgba(55,65,42,.65)');gradient.addColorStop(1,'rgba(55,65,42,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(texCanvas),transparent:true,opacity:.14,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(.12,-1.04,0);scene.add(shadow);
  selectCharacter(2);resize();updateLight();new ResizeObserver(resize).observe($('.stage'));requestAnimationFrame(animate);
  const canvas=$('#scene');
  // Paint roots on the visible body. At the silhouette, allow picking nearby
  // roots through the fur envelope so a visible tip is not an empty-space miss.
  function pickEditSurface(){
    creature.updateMatrixWorld();camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObject(body)[0];
    if(hit?.uv)return {uv:hit.uv,point:surface(Math.PI*(1-hit.uv.y),Math.PI*2*hit.uv.x-Math.PI/2),world:hit.point};
    const r=canvas.getBoundingClientRect(),positions=body.geometry.attributes.position,normals=body.geometry.attributes.normal,uvs=body.geometry.attributes.uv;
    const world=new THREE.Vector3(),normal=new THREE.Vector3(),view=new THREE.Vector3(),screen=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(body.matrixWorld);
    const pixels=r.height/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(1,camera.position.distanceTo(creature.position)));
    const reach=Math.max(3,params.length*creature.scale.x*1.25*pixels);
    let best=-1,distance=reach*reach,bestWorld;
    for(let i=0;i<positions.count;i++){
      world.fromBufferAttribute(positions,i).applyMatrix4(body.matrixWorld);
      normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();view.subVectors(camera.position,world);
      if(normal.dot(view)<0)continue;
      screen.copy(world).project(camera);if(screen.z<-1||screen.z>1)continue;
      const dx=(screen.x-pointer.x)*r.width/2,dy=(screen.y-pointer.y)*r.height/2,d=dx*dx+dy*dy;
      if(d<distance){distance=d;best=i;bestWorld=world.clone()}
    }
    if(best<0)return null;
    const uv=new THREE.Vector2().fromBufferAttribute(uvs,best);
    return {uv,point:surface(Math.PI*(1-uv.y),Math.PI*2*uv.x-Math.PI/2),world:bestWorld};
  }
  function updatePointer(e){
    renderDirty=true;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
    const marker=$('#edit-marker');marker.hidden=!editor.tool;editorHit=editor.tool?pickEditSurface():null;
    if(editor.tool){
      const projected=editorHit?.world.clone().project(camera),distance=editorHit?camera.position.distanceTo(editorHit.world):camera.position.z-.6;
      const diameter=editor.radius*creature.scale.x*r.height/(Math.tan(camera.fov*Math.PI/360)*Math.max(1,distance));
      marker.style.left=`${projected?(projected.x+1)*r.width/2:e.clientX-r.left}px`;marker.style.top=`${projected?(1-projected.y)*r.height/2:e.clientY-r.top}px`;
      marker.style.width=marker.style.height=`${diameter}px`;marker.style.borderColor=editor.tool==='dye'?editor.color:'#77936d';marker.classList.toggle('invalid',!editorHit);
    }
  }
  function reportEdit(result){
    if(!editStrokeOutcome)return;
    recordEditResult(editStrokeOutcome,result);
    feedback(editStrokeFeedback(editStrokeOutcome,{phase:'drawing',value:editor.value,limit:MAX_LOCAL_STAMPS,canUndo:editHistory.canUndo||editStrokeChanged,grouped:editBatch}));
  }
  function paintEdit(){
    const hit=editorHit;
    if(!hit){lastEditPoint=null;reportEdit({reason:'miss',affected:0,changed:0});return}
    const point=hit.point,spacing=Math.max(.035,editor.radius*.3);
    if(lastEditPoint&&point.distanceTo(lastEditPoint)<spacing)return;
    const steps=lastEditPoint?Math.min(12,Math.ceil(point.distanceTo(lastEditPoint)/spacing)):1;
    for(let i=1;i<=steps;i++){
      const position=lastEditPoint?lastEditPoint.clone().lerp(point,i/steps):point;
      const changed=coat.paintLocal?.({kind:editor.tool,target:editor.restoreTarget,uv:[hit.uv.x,hit.uv.y],point:position.toArray(),radius:editor.radius,value:editor.value,color:editor.color});
      const result=coat.getLocalPaintResult?.()||{reason:changed?'changed':'invalid',affected:changed?1:0,changed:changed?1:0};
      if(changed){editStrokeChanged=true;readLocalState();renderDirty=true;scheduleDraft();}
      reportEdit(result);if(result.reason==='full')break;
    }
    lastEditPoint=point;syncEditor();
  }
  function groom(){
    creature.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(body)[0];
    if(hit){const point=creature.worldToLocal(hit.point.clone());
      const direction=lastHit?point.clone().sub(lastHit).multiplyScalar(9):new THREE.Vector3(.1,-.2,.04);
      direction.clampLength(0,1.2);if(persistentBrush&&drag&&lastHit){if(coat.groom?.(point,point.clone().sub(lastHit),1.6)){editStrokeChanged=true;experiment.field=coat.getGroomField?.()||[];renderDirty=true;scheduleDraft();}syncGroomCount()}else if(!persistentBrush)coat.touch(point,direction,drag?1.8:.5);lastHit=point;
    }else lastHit=null;
  }
  canvas.addEventListener('pointermove',e=>{if(!nativeViewActive)return;if(drag&&e.pointerId!==drag.pointerId)return;updatePointer(e);
    if(editor.tool&&drag)paintEdit();
    if(brushMode){if(paused)resume();groom();}
    if(squeezing){creature.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(body)[0];if(hit)pressCenter.copy(creature.worldToLocal(hit.point.clone()))}
    if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)dragged=true;
      if(!brushMode&&!squeezeMode&&!editor.tool){yaw=drag.yaw+dx*.009;pitch=THREE.MathUtils.clamp(drag.pitch+dy*.005,-.5,.5);furImpulse.x=THREE.MathUtils.clamp(dx*.002,-.4,.4)}
    }
  });
  canvas.addEventListener('pointerdown',e=>{if(!nativeViewActive)return;if(drag)return;updatePointer(e);drag={x:e.clientX,y:e.clientY,yaw,pitch,pointerId:e.pointerId};dragged=false;if(persistentBrush)lastHit=null;canvas.setPointerCapture(e.pointerId);if(editor.tool||persistentBrush)beginEditStroke(editor.tool?toolNames[editor.tool]:'梳理');if(editor.tool){editStrokeOutcome=newEditStroke(editor.tool);activityEnd=-100;paintEdit()}if(squeezeMode){creature.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);const pressHit=raycaster.intersectObject(body)[0];squeezing=!!pressHit;if(pressHit)pressCenter.copy(creature.worldToLocal(pressHit.point.clone()));if(squeezing){resume();feedback('正在轻捏：毛根随表面移动，松手恢复。')}}if(brushMode){resume();groom();feedback(persistentBrush?(editBatch?'按住身体拖动梳理，本笔会加入组合步骤。':'按住身体拖动梳理，松手后可撤销这一笔。'):'正在拨动绒毛，松手后慢慢回弹。')}});
  canvas.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pointerId)return;const outcome=editStrokeOutcome,changed=finishEditStroke();if(outcome)feedback(editStrokeFeedback(outcome,{phase:'finished',value:editor.value,limit:MAX_LOCAL_STAMPS,canUndo:editHistory.canUndo,grouped:editBatch}));if(!dragged&&!brushMode&&!squeezeMode&&!editor.tool){updatePointer(e);raycaster.setFromCamera(pointer,camera);if(raycaster.intersectObject(body).length){resume();bounce();feedback('跳一下！落地时轻轻回弹。')}}if(squeezing){furImpulse.y=.5;feedback('松手了，凹陷正在恢复。')}else if(brushMode)feedback(persistentBrush?(changed?(editBatch?'梳理已留下，已加入组合步骤。':'梳理已留下，可撤销这一笔或收藏配方。'):'这一笔没有改变梳理方向，请在身体表面按住拖动。'):'拨毛结束，绒毛正在回弹。');squeezing=false;drag=null;lastHit=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);scheduleDraft();flushDraft();});
  canvas.addEventListener('pointercancel',e=>{if(!drag||e.pointerId!==drag.pointerId)return;finishEditStroke();squeezing=false;drag=null;lastHit=null});canvas.addEventListener('pointerleave',()=>{if(!drag)pointer.set(0,0);lastHit=null;$('#edit-marker').hidden=true});

}catch(error){console.error(error);$('#error').hidden=false;$('#error').textContent='无法启动 3D 渲染。请使用支持 WebGL 的浏览器，并开启硬件加速后刷新页面。';$('#status').textContent='3D 渲染不可用'}

function feedback(message){$('#action-feedback').textContent=message}
function productMessage(message){$('#product-status').textContent=message}
function focusStage(){if(matchMedia('(max-width:700px)').matches)$('.stage').scrollIntoView({behavior:'smooth',block:'start'})}
function resume(){if(paused){paused=false;syncPause()}}
function oneShot(message,duration,done){resume();focusStage();feedback(message);activityEnd=elapsed+duration;activityDone=done}
function syncPause(){renderDirty=true;frameCount=0;fpsTime=0;if(paused)$('#fps').textContent='已暂停';$('#pause').textContent=paused?'继续动画':'暂停动画';$('#pause').setAttribute('aria-pressed',String(paused));$('#play-help').textContent=paused?'动画已暂停。拨毛或按压时触碰角色，会继续动画。':'按钮开启模式后，在角色身上操作。短绒响应轻柔，长毛更明显。'}
function syncFaceGuard(){const available=index===2;$('#face-guard').disabled=!available;$('#face-help').textContent=available?'眼镜避让适用于奶油角色，长毛下更明显。':'当前角色没有眼镜。选择奶油后可开启眼镜避让。';if(coat)coat.uniforms.uFaceGuard.value=available&&faceGuard?1:0}
function syncEffects(){
  renderDirty=true;
  $('#groom-paint').classList.toggle('active',persistentBrush);$('#groom-paint').setAttribute('aria-pressed',String(persistentBrush));
  for(const [id,state] of [['wind',windEnabled],['brush',brushMode&&!persistentBrush],['spin',turntable],['closeup',closeup],['squeeze',squeezeMode],['sleep',sleeping],['face-guard',faceGuard&&index===2]]){const b=$('#'+id);b.classList.toggle('active',state);b.setAttribute('aria-pressed',String(state))}
  $('.stage').classList.toggle('closeup',closeup);$('#scene').classList.toggle('brushing',brushMode||squeezeMode||!!editor.tool);
  $('#interaction-hint').textContent=editBatch?'✎ 组合中 · 可换笔刷 · 完成后整组撤销':editor.tool?`✎ 按住局部${toolNames[editor.tool]} · 松手后可撤销`:squeezeMode?'♡ 按住角色轻捏 · 松手恢复':persistentBrush?'✎ 按住拖动梳理 · 毛流保留':brushMode?'✋ 在角色身上拖动拨毛 · 松手回弹':turntable?'↻ 正在自动旋转 · 再点转台停止':'↔ 拖动旋转 · 点击角色弹跳';
  syncFaceGuard();syncEditor();
}
function frontView(){yaw=pitch=0;pointer.set(0,0);motion.x=motion.y=0;creature.rotation.set(0,0,0);turntable=false;renderDirty=true;syncEffects()}
function clearMotion(){
  finishEditStroke();editor.tool=null;
  windEnabled=brushMode=turntable=squeezing=squeezeMode=persistentBrush=false;
  shakeStart=greetingStart=pressDemoStart=activityEnd=-100;
  windDemoEnd=-100;
  drag=lastHit=null;jumpHeight=jumpVelocity=bodyAccumulator=0;
  springPosition.fill(0);springVelocity.fill(0);pressPosition.fill(0);pressVelocity.fill(0);lastPressDepth=-1;
  furImpulse.set(0,0,0);coat?.reset();renderDirty=true;syncEffects();syncEditor();
}
function setColor(color){$('#fur-color').value=color;body.material.color.set(color).multiplyScalar(.9);coat.uniforms.uColor.value.set(color);renderDirty=true}
function setBackdrop(mode){
  backdropMode=mode;const colors={cream:['#ffffff','#f3f4ed'],sage:['#f4faf3','#dce8d9'],rose:['#fff8f5','#f0dedb']}[mode];
  const background=`radial-gradient(ellipse at 50% 50%,${colors[0]} 0%,${colors[1]} 80%)`;
  // A recipe may arrive through the URL while the local reference asset is visible.
  if(nativeViewActive)$('.stage').style.background=background;
  else if(referenceSavedCamera)referenceSavedCamera.background=background;
  document.querySelectorAll('[data-backdrop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.backdrop===mode)));
}
function syncPresetButtons(){document.querySelectorAll('[data-preset]').forEach(b=>{const p=presets[b.dataset.preset],active=(p.shortPile!==false)===(params.shortPile!==false)&&Object.keys(p).filter(k=>k!=='shortPile').every(k=>p[k]===params[k]);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
function setView(view,focus=false){if(view!=='create'&&editBatch)finishEditBatch();if(view!=='create'&&editor.tool){finishEditStroke();editor.tool=null;syncEffects()}currentView=view;document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('#panel-'+b.dataset.view).hidden=!active;if(active&&focus)b.focus()});syncEditor()}
function applyRecipe(value){
  const recipe=sanitizeRecipe(value);clearMotion();sleeping=false;faceGuard=recipe.faceGuard;
  experiment=recipe.experiment;editBatch=false;editBatchCount=0;editHistory.clear();params={...recipe.params};selectCharacter(recipe.character);setColor(recipe.color);$('#recipe-name').value=recipe.name;$('#char-name').textContent=recipe.name;
  lightMode=recipe.light;setBackdrop(recipe.backdrop);syncControls();syncPresetButtons();updateLight();
  document.querySelectorAll('[data-light]').forEach(b=>{const active=b.dataset.light===lightMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  yaw=recipe.yaw;pitch=recipe.pitch;pointer.set(0,0);motion.x=motion.y=0;creature.rotation.set(pitch,yaw,0);syncEffects();syncResearch();syncEditor();renderDirty=true;
  feedback(`已换成「${recipe.name}」，点一下陪它玩。`);productMessage(`已应用「${recipe.name}」的角色、颜色、材质和姿态。`);
}
function currentRecipe(){experiment.field=coat?.getGroomField?.()||experiment.field;readLocalState();return sanitizeRecipe({name:$('#recipe-name').value||characters[index].name,character:index,color:$('#fur-color').value,params,experiment,light:lightMode,backdrop:backdropMode,yaw,pitch,faceGuard:faceGuard&&index===2})}
function renderCollection(){
  $('#collection-count').textContent=`${collection.length} / ${MAX_RECIPES}`;const list=$('#collection');list.replaceChildren();
  if(!collection.length){const empty=document.createElement('p');empty.className='collection-empty';empty.textContent='还没有收藏。调好喜欢的模样，点「收藏当前配方」就能留住它。';list.append(empty)}
  collection.forEach((recipe,position)=>{const row=document.createElement('div');row.className='recipe-row';const load=document.createElement('button');load.className='recipe-load';load.setAttribute('aria-label',`应用收藏：${recipe.name}`);const swatch=document.createElement('span');swatch.className='recipe-swatch';swatch.style.background=recipe.color;swatch.textContent='••';const text=document.createElement('span');text.textContent=recipe.name;const small=document.createElement('small');small.textContent=`${characters[recipe.character].name} · ${recipe.params.shortPile?'密实短绒':'蓬松长毛'}`;text.append(small);load.append(swatch,text);load.addEventListener('click',()=>{applyRecipe(recipe);focusStage()});
    const remove=document.createElement('button');remove.className='recipe-remove';remove.textContent='移除';remove.setAttribute('aria-label',`移除收藏：${recipe.name}`);remove.addEventListener('click',()=>{const latest=readCollection(storage),target=recipe.id||encodeRecipe(recipe),at=latest.findIndex(r=>(r.id||encodeRecipe(r))===target);if(at<0){collection=latest;renderCollection();productMessage('这份配方已在其他页面移除。');return}const next=latest.filter((_,i)=>i!==at);if(!saveCollection(storage,next)){productMessage('收藏无法写入，请用配方链接带走。');return}removedRecipe={recipe,position:at};collection=next;$('#undo-remove').hidden=false;renderCollection();productMessage(`已移除「${recipe.name}」，可撤销。`)});row.append(load,remove);list.append(row)})
}
const starters=[
  {name:'柠檬云朵',character:2,color:'#ebc656',params:{...presets.cloud},light:'day',backdrop:'cream',label:'密实短绒 · 日光下的一点暖黄'},
  {name:'森系小团子',character:1,color:'#a6c695',params:{...presets.velvet},light:'day',backdrop:'sage',label:'短天鹅绒 · 鼠尾草舞台'},
  {name:'桃雾软糖',character:4,color:'#eda9ac',params:{...presets.cloud},light:'warm',backdrop:'rose',label:'柔和短绒 · 暖阳与桃雾'},
  {name:'奶糖长耳兔',character:5,color:'#f0d9d2',params:{...presets.cloud},light:'day',backdrop:'rose',label:'长耳造型 · 密实奶糖短绒'},
  {name:'可可泰迪',character:6,color:'#ba8f6d',params:{...presets.teddy},light:'warm',backdrop:'cream',label:'圆耳团熊 · 紧密卷绒'},
  {name:'蒲公英小星',character:7,color:'#e8b759',params:{...presets.dandelion},light:'day',backdrop:'cream',label:'五角轮廓 · 蓬松蒲公英绒'},
];
starters.forEach(recipe=>{const b=document.createElement('button');b.className='starter-recipe';const swatch=document.createElement('span');swatch.className='recipe-swatch';swatch.style.background=recipe.color;swatch.textContent='••';const text=document.createElement('span');text.textContent=recipe.name;const small=document.createElement('small');small.textContent=recipe.label;text.append(small);b.append(swatch,text);b.addEventListener('click',()=>{applyRecipe(recipe);focusStage()});$('#starter-recipes').append(b)});
collection=readCollection(storage);renderCollection();
document.querySelectorAll('[data-view]').forEach((b,i)=>{b.addEventListener('click',()=>setView(b.dataset.view));b.addEventListener('keydown',e=>{const views=['dress','play','library','create','research'];let n=i;if(e.key==='ArrowRight')n=(i+1)%5;else if(e.key==='ArrowLeft')n=(i+4)%5;else if(e.key==='Home')n=0;else if(e.key==='End')n=4;else return;e.preventDefault();setView(views[n],true)})});
document.querySelectorAll('[data-character]').forEach(b=>b.addEventListener('click',()=>{if(!scene)return;clearMotion();sleeping=false;experiment.field=[];experiment.coat='';experiment.edits=[];editBatch=false;editBatchCount=0;editHistory.clear();selectCharacter(Number(b.dataset.character));syncEffects();syncResearch();syncEditor();feedback(`你好，我是${characters[index].name}。点一下我吧。`)}));
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{params={...presets[b.dataset.preset]};syncControls();clearTimeout(rebuildTimer);buildFur();updateLight();syncPresetButtons();feedback(`已换成${b.textContent.trim()}。`)}));
document.querySelectorAll('[data-light]').forEach(b=>b.addEventListener('click',()=>{lightMode=b.dataset.light;updateLight();document.querySelectorAll('[data-light]').forEach(a=>{a.classList.toggle('active',a===b);a.setAttribute('aria-pressed',String(a===b))});feedback(`已切换${b.textContent}。`)}));
document.querySelectorAll('[data-backdrop]').forEach(b=>b.addEventListener('click',()=>{setBackdrop(b.dataset.backdrop);feedback(`舞台换成${b.textContent}。`)}));
$('#recipe-name').addEventListener('input',()=>{$('#char-name').textContent=$('#recipe-name').value.trim()||characters[index].name});
$('#fur-color').addEventListener('input',e=>setColor(e.target.value));
$('#quality').addEventListener('change',e=>{quality=e.target.value;renderer.setPixelRatio(Math.min(devicePixelRatio,{light:1,balanced:1.7,fine:2}[quality]));resize();productMessage(`画面已切换为${e.target.selectedOptions[0].textContent}模式。`)});
$('#front').addEventListener('click',()=>{frontView();feedback('已回到正面，自动转台已停止。')});
$('#pause').addEventListener('click',()=>{if(!nativeViewActive)return;paused=!paused;syncPause();feedback(paused?'动画已暂停。触碰拨毛或按压会继续。':'动画继续了。')});
$('#bounce').addEventListener('click',()=>{if(!nativeViewActive)return;bounce();oneShot('跳一下！落地时轻轻回弹。',1.6,'落地了，再玩一会儿吧。')});
$('#scene').addEventListener('keydown',e=>{if(!nativeViewActive)return;if(e.key===' '||e.key==='Enter'){e.preventDefault();$('#bounce').click()}});
$('#wind').addEventListener('click',()=>{windEnabled=!windEnabled;if(windEnabled){if(windStrength<=0){windStrength=.5;$('#wind-strength').value=windStrength;$('#wind-value').value=windStrength.toFixed(2)}resume();focusStage()}syncEffects();feedback(windEnabled?'正在吹风，长毛的摆动会更明显。':'风停了，绒毛正在回弹。')});
$('#wind-strength').addEventListener('input',e=>{windStrength=Number(e.target.value);$('#wind-value').value=windStrength.toFixed(2);windEnabled=windStrength>0;if(windEnabled)resume();syncEffects();feedback(windEnabled?`风的力度：${windStrength.toFixed(2)}`:'风的力度为零，已停风。')});
$('#brush').addEventListener('click',()=>{brushMode=persistentBrush||!brushMode;persistentBrush=false;squeezeMode=squeezing=false;turntable=false;lastHit=null;if(brushMode){resume();focusStage()}syncEffects();feedback(brushMode?'拨毛已开启：在角色身上轻轻拖动。':'拨毛已关闭，可以拖动旋转。')});
$('#squeeze').addEventListener('click',()=>{squeezeMode=!squeezeMode;squeezing=false;brushMode=turntable=persistentBrush=false;if(squeezeMode){resume();focusStage()}syncEffects();feedback(squeezeMode?'按压已开启：按住角色，再慢慢松手。':'按压已关闭，可以拖动旋转。')});
$('#spin').addEventListener('click',()=>{turntable=!turntable;if(turntable){brushMode=squeezeMode=squeezing=persistentBrush=false;resume();focusStage()}syncEffects();feedback(turntable?'自动转台已开启，再点一次停止。':'自动转台已停止。')});
$('#closeup').addEventListener('click',()=>{closeup=!closeup;syncEffects();feedback(closeup?'已放大绒毛，可以观察毛流。':'已恢复完整视角。')});
$('#shake').addEventListener('click',()=>{sleeping=false;shakeStart=elapsed;furImpulse.set(.5,.1,0);syncEffects();oneShot('抖抖毛，松一口气。',1.4,'抖毛结束，绒毛慢慢平复。')});
$('#greet').addEventListener('click',()=>{sleeping=false;greetingStart=elapsed;syncEffects();oneShot('你好呀！很高兴见到你。',2,'招呼打完了，轮到你摸摸它。')});
$('#sleep').addEventListener('click',()=>{sleeping=!sleeping;if(sleeping)clearMotion();resume();syncEffects();focusStage();feedback(sleeping?'睡着了，正在慢慢呼吸。再点小憩唤醒。':'醒来了，又可以一起玩。')});
$('#calm').addEventListener('click',()=>{clearMotion();sleeping=false;syncEffects();feedback('已恢复平静，外观配方为你保留。');focusStage()});
$('#face-guard').addEventListener('click',()=>{if(index!==2)return;faceGuard=!faceGuard;syncEffects();feedback(faceGuard?'眼镜周围已使用短毛避让区。':'眼镜避让已关闭。')});
$('#press-demo').addEventListener('click',()=>{frontView();sleeping=false;brushMode=squeezeMode=squeezing=persistentBrush=false;pressCenter.set(.55,-.15,.62);pressDemoStart=elapsed;syncEffects();oneShot('正在轻按右侧，白色圆环标出触碰位置。',3.5,'松手了，局部凹陷已恢复。')});
$('#reset').addEventListener('click',()=>{clearMotion();sleeping=faceGuard=closeup=false;experiment=defaultExperiment();editBatch=false;editBatchCount=0;editHistory.clear();coat.clearGroom?.();coat.clearLocal?.();params={...presets.cloud};buildFur();syncControls();syncPresetButtons();syncResearch();syncEditor();lightMode='day';updateLight();document.querySelectorAll('[data-light]').forEach(b=>{const active=b.dataset.light==='day';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});setColor(characters[index].color);setBackdrop('cream');$('#recipe-name').value=characters[index].name;$('#char-name').textContent=characters[index].name;windStrength=.5;$('#wind-strength').value=.5;$('#wind-value').value='0.50';frontView();syncEffects();$('#capture-link').hidden=true;$('#share-box').hidden=true;if(captureUrl){URL.revokeObjectURL(captureUrl);captureUrl=null}$('#capture-status').textContent='生成后可预览并下载。';feedback('已恢复当前角色的默认外观与互动。');productMessage('重置完成。已收藏的配方仍然保留。')});
$('#save-recipe').addEventListener('click',()=>{collection=readCollection(storage);renderCollection();if(collection.length>=MAX_RECIPES){setView('library');productMessage('收藏已满 12 个，请先移除一份配方。');return}const recipe={...currentRecipe(),id:crypto.randomUUID(),createdAt:Date.now()};const next=[recipe,...collection];if(!saveCollection(storage,next)){productMessage('浏览器暂时无法保存收藏，请生成配方链接带走。');return}collection=next;renderCollection();setView('library');productMessage(`已收藏「${recipe.name}」，刷新后仍可在这里找到。`);feedback(`「${recipe.name}」已加入收藏。`)});
$('#undo-remove').addEventListener('click',()=>{if(!removedRecipe)return;collection=readCollection(storage);renderCollection();if(collection.some(r=>r.id&&r.id===removedRecipe.recipe.id)){removedRecipe=null;$('#undo-remove').hidden=true;productMessage('这份配方已在收藏中。');return}if(collection.length>=MAX_RECIPES){productMessage('收藏已满，请先空出一个位置再撤销。');return}const next=collection.slice();next.splice(Math.min(removedRecipe.position,next.length),0,removedRecipe.recipe);if(!saveCollection(storage,next)){productMessage('撤销保存失败，请稍后重试。');return}collection=next;removedRecipe=null;$('#undo-remove').hidden=true;renderCollection();productMessage('已恢复刚才移除的配方。')});
$('#share-recipe').addEventListener('click',()=>{const url=new URL(location.href);url.hash='recipe='+encodeRecipe(currentRecipe());$('#share-output').value=url.href;$('#share-box').hidden=false;productMessage('配方链接已生成。链接包含外观与姿态，不需要账号。')});
$('#copy-recipe').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#share-output').value);productMessage('配方链接已复制。')}catch{$('#share-output').focus();$('#share-output').select();productMessage('自动复制不可用，链接已选中，可手动复制。')}});
function importToken(input){const text=input.trim();try{if(text.includes('#'))return new URLSearchParams(text.slice(text.indexOf('#')+1)).get('recipe')||'';return text.replace(/^recipe=/,'')}catch{return ''}}
$('#load-import').addEventListener('click',()=>{const recipe=decodeRecipe(importToken($('#import-recipe').value));if(!recipe){productMessage('这份配方无法识别，请检查代码是否完整。');return}applyRecipe(recipe);focusStage();productMessage(`已导入「${recipe.name}」。点收藏即可留在本机。`)});
function draftMessage(message){$('#draft-status').textContent=message;}
function savedDraftMessage(savedAt,restored=false){const time=new Date(savedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});draftMessage(`${restored?'已恢复最近草稿':'草稿已自动保存'} · ${time} · 仅此浏览器`);$('#draft-clear').hidden=false;}
function scheduleDraft(){
  if(!draftReady||!renderer)return;draftDirty=true;clearTimeout(draftTimer);draftTimer=setTimeout(flushDraft,450);
}
function flushDraft(){
  clearTimeout(draftTimer);draftTimer=null;if(!draftReady||!draftDirty||!renderer)return;
  const recipe=currentRecipe(),signature=encodeRecipe(recipe);draftDirty=false;
  if(signature===draftSignature)return;
  const savedAt=saveDraft(storage,{recipe,baseToken:draftBaseToken});
  if(savedAt===false){draftDirty=true;draftMessage('草稿保存失败，可用收藏或配方链接留住作品。');return;}
  draftSignature=signature;savedDraftMessage(savedAt);
}
function startWithDraft(){
  const token=new URLSearchParams(location.hash.slice(1)).get('recipe')||'',sharedRecipe=decodeRecipe(token),draft=readDraft(storage);
  const startup=chooseStartupRecipe({sharedRecipe,sharedToken:token,draft});
  if(startup.recipe&&renderer)applyRecipe(startup.recipe);
  draftBaseToken=sharedRecipe?token:startup.source==='draft'?draft.baseToken:'';
  if(startup.source==='draft'){savedDraftMessage(draft.savedAt,true);feedback(`已恢复「${startup.recipe.name}」的草稿，局部创作与梳理记录都在。`);}
  else {draftMessage(storage?'修改后自动保存最近草稿 · 仅此浏览器':'浏览器存储不可用，可生成配方链接保存作品。');$('#draft-clear').hidden=!draft;}
  if(token&&!sharedRecipe)productMessage(`链接中的配方无效，${startup.source==='draft'?'已恢复本机草稿。':'已保留当前小伙伴。'}`);
  draftSignature=encodeRecipe(currentRecipe());draftReady=true;
}
window.addEventListener('hashchange',()=>{
  const token=new URLSearchParams(location.hash.slice(1)).get('recipe')||'',recipe=decodeRecipe(token);
  if(!recipe){productMessage(token?'链接中的配方无效，已保留当前小伙伴。':'配方链接已移除，当前小伙伴保留。');return;}
  flushDraft();draftReady=false;applyRecipe(recipe);setView('dress');draftBaseToken=token;
  draftSignature=encodeRecipe(currentRecipe());draftReady=true;draftMessage('已打开配方 · 修改后自动保存最近草稿');
});
$('#draft-clear').addEventListener('click',()=>{
  clearTimeout(draftTimer);draftDirty=false;
  if(!clearDraft(storage)){draftMessage('草稿无法清除，请稍后重试。');return;}
  draftSignature=encodeRecipe(currentRecipe());$('#draft-clear').hidden=true;draftMessage('草稿已清除，当前作品保留；下次修改后重新保存。');
});
// Observe completed UI mutations, rather than animation frames, so an idle
// comparison tab cannot overwrite the actively edited tab's draft.
for(const event of ['input','change','click'])document.addEventListener(event,e=>{if(e.target.closest('#draft-clear, #project-journal, #project-journal-open, .plush-view-tabs, .plush-reference-panel, .plush-reference-details'))return;scheduleDraft();});
initProjectJournal({storage});
window.addEventListener('pagehide',flushDraft);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushDraft();});
window.addEventListener('storage',e=>{if(e.storageArea===storage&&(e.key===COLLECTION_KEY||e.key===null)){collection=readCollection(storage);renderCollection();productMessage('收藏已与另一个页面同步。')}});
window.addEventListener('storage',e=>{if(e.storageArea===storage&&e.key===DRAFT_KEY){$('#draft-clear').hidden=!readDraft(storage);draftMessage(e.newValue?'另一个页面保存了最近草稿；当前画面保留。':'草稿已在另一个页面清除；当前作品保留。');}});
$('#snapshot').addEventListener('click',()=>{
  if(!nativeViewActive)return;
  if(!renderer){productMessage('3D 渲染暂不可用，无法生成图片。');return}renderer.render(scene,camera);
  const image=document.createElement('canvas'),card=$('#export-kind').value==='card';image.width=card?1280:renderer.domElement.width;image.height=card?1600:renderer.domElement.height;const ctx=image.getContext('2d');
  if(card){const colors={cream:['#ffffff','#f3f4ed'],sage:['#f4faf3','#dce8d9'],rose:['#fff8f5','#f0dedb']}[backdropMode];const gradient=ctx.createLinearGradient(0,0,0,1600);gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,1600);ctx.fillStyle='#788c71';ctx.font='24px sans-serif';ctx.fillText('PLUSH LAB / MY SOFT FRIEND',80,100);const scale=Math.min(1200/renderer.domElement.width,1180/renderer.domElement.height);const w=renderer.domElement.width*scale,h=renderer.domElement.height*scale;ctx.drawImage(renderer.domElement,(1280-w)/2,160+(1180-h)/2,w,h);ctx.fillStyle='#364334';ctx.font='56px sans-serif';const cardName=currentRecipe().name,nameWidth=ctx.measureText(cardName).width;if(nameWidth>1120)ctx.font=`${Math.floor(56*1120/nameWidth)}px sans-serif`;ctx.fillText(cardName,80,1430);ctx.fillStyle='#87957d';ctx.font='25px sans-serif';ctx.fillText('留住一点柔软。',80,1490)}else ctx.drawImage(renderer.domElement,0,0);
  image.toBlob(blob=>{if(!blob){productMessage('图片生成失败，请再试一次。');return}if(captureUrl)URL.revokeObjectURL(captureUrl);captureUrl=URL.createObjectURL(blob);const a=$('#capture-link');a.href=captureUrl;a.download=`plush-${card?'card':'friend'}-${index+1}.png`;$('#capture-preview').src=captureUrl;a.hidden=false;a.click();$('#capture-status').textContent=`${card?'1280 × 1600 小伙伴卡片':'透明角色'}已生成，点击预览也可保存。`;productMessage('PNG 已生成，可在下方预览。')});
});
syncPause();syncEffects();startWithDraft();syncResearch();syncEditor();

function styleCoat(changes,message){Object.assign(params,changes);syncControls();buildFur();syncPresetButtons();feedback(message);productMessage('毛流与湿润参数可随当前配方一起收藏。');focusStage()}
$('#comb').addEventListener('click',()=>styleCoat({groom:1},'已沿身体向下梳顺。梳理方向会随配方保存。'));
$('#fluff').addEventListener('click',()=>styleCoat({groom:0,wetness:0,mess:.8},'已吹干并蓬起绒毛，轮廓恢复柔软。'));
$('#mist').addEventListener('click',()=>styleCoat({wetness:.9,groom:.65},'湿绒已贴伏、略微变深。点吹干蓬松恢复。'));

function syncGroomCount(){const field=coat?.getGroomField?.()||experiment.field,count=field.filter(v=>Math.hypot(...v)>.001).length;$('#groom-count').textContent=`毛流记录：${count} / 32 导向点`;$('#editor-groom-count').textContent=`梳理记录：${count} / 32 导向区域`;$('#editor-groom-clear').disabled=experiment.mode==='shell'||!count;}
function syncResearch(){
  const descriptions={
    off:['原有模式','熟悉的柔软','保留原来的线段短绒与渐细毛束，八种材质继续照常使用。','','局部毛流保留在配方里，重新开启实验时可继续使用。'],
    shell:['LENGYEL ET AL. · 2001','层壳短绒','32 层带透明纤维截面的曲面叠出绒毛厚度。纹理固定在身体上，可观察风吹剪切与按压。','https://www.hhoppe.com/proj/fur/','实现论文的层壳部分，未实现轮廓 fins 和 lapped textures。适合短绒，长毛可能显出层间间隙。'],
    bundles:['FEI ET AL. · 2017 / GROOM GUIDES','毛束聚集与遮蔽','让邻近毛尖向共同毛束中心聚拢，湿润外观可配合长毛使用；根部遮蔽增加绒毛层次。','https://www.cs.columbia.edu/cg/liquidhair/','参考湿毛聚集现象与导向毛制作。当前是几何聚拢和深度遮蔽近似，未求解液桥、液体或真实自阴影。'],
    ftl:['MÜLLER ET AL. · 2012','保长毛束动力学','32 根导向链受风与重力作用，每段先做定长投影，再修正速度；渲染毛随导向链弯曲。','https://matthias-research.github.io/pages/publications/FTLHairFur.pdf','实现动态 Follow-The-Leader 核心投影与速度修正，并加入回弹阻尼。渲染采用稀疏导向插值，没有逐根碰撞求解。'],
  };
  const [tag,title,description,href,limit]=descriptions[experiment.mode];$('#research-tag').textContent=tag;$('#research-title').textContent=title;$('#research-description').textContent=description;$('#paper-source').hidden=!href;if(href)$('#paper-source').href=href;$('#research-limit').textContent=limit;
  document.querySelectorAll('[data-experiment]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.experiment===experiment.mode)));
  $('#clump-strength').value=experiment.clump;$('#clump-value').value=experiment.clump.toFixed(2);$('#root-shadow').value=experiment.shadow;$('#root-shadow-value').value=experiment.shadow.toFixed(2);
  $('#clump-strength').disabled=$('#root-shadow').disabled=experiment.mode!=='bundles';$('#research-control-help').textContent=experiment.mode==='bundles'?'这两个参数只作用于毛束聚集实验。':'聚集与遮蔽参数在毛束聚集实验中可调。';
  $('#research-demo').disabled=$('#research-motion').disabled=experiment.mode==='off';const canPaint=experiment.mode!=='shell'&&(experiment.mode==='bundles'||experiment.mode==='ftl'||experiment.groomDynamics);$('#groom-paint').disabled=!canPaint;$('#groom-clear').disabled=!canPaint;$('#groom-help').textContent=canPaint?'按住角色拖动，毛流会保留并随配方收藏。创作面板也可梳理与清除。':'开启毛束聚集、保长动力学或创作面板的毛流随动后，可记录梳理方向。';syncGroomCount();
}
function setExperiment(mode){if(editBatch)finishEditBatch();experiment.field=coat.getGroomField?.()||experiment.field;clearMotion();experiment.mode=mode;buildFur();syncControls();syncResearch();syncEditor();feedback(mode==='off'?'已回到原有渲染，八种材质照常可用。':'论文实验已开启，可应用示例或观察当前材质。');}
document.querySelectorAll('[data-experiment]').forEach(b=>b.addEventListener('click',()=>setExperiment(b.dataset.experiment)));
for(const [id,key,output] of [['clump-strength','clump','clump-value'],['root-shadow','shadow','root-shadow-value']])$('#'+id).addEventListener('input',e=>{experiment[key]=Number(e.target.value);$('#'+output).value=experiment[key].toFixed(2);buildFur();});
$('#research-demo').addEventListener('click',()=>{clearMotion();params=experiment.mode==='shell'?{...presets.cloud,length:.11,curl:.12,mess:.15}:experiment.mode==='bundles'?{...presets.rain,length:.24,wetness:.7,groom:.35,mess:.2}:{...presets.silk,length:.28,gravity:.85,stiffness:.25,groom:.3};syncControls();syncPresetButtons();buildFur();updateLight();feedback('已应用实验示例材质，可以继续微调或收藏。');focusStage();});
$('#research-motion').addEventListener('click',()=>{clearMotion();windEnabled=true;windStrength=.8;$('#wind-strength').value=.8;$('#wind-value').value='0.80';windDemoEnd=elapsed+2.5;syncEffects();oneShot('先吹风，再停风观察毛束回弹。',5,'演示结束，风已停。可以继续梳理或收藏。');});
$('#groom-paint').addEventListener('click',()=>{const enabled=!persistentBrush;clearMotion();persistentBrush=brushMode=enabled;if(enabled)editor.selected='groom';lastHit=null;resume();syncEffects();feedback(enabled?'按住角色拖动，局部毛流会保留。':'已停止记录，毛流为你保留。');focusStage();});
$('#groom-clear').addEventListener('click',clearGroomEdits);

function readLocalState(){const state=coat?.getLocalState?.();if(state){experiment.coat=state.snapshot;experiment.edits=state.edits;}return {snapshot:experiment.coat||'',edits:experiment.edits||[]};}
function editSnapshot(){return {...readLocalState(),field:coat?.getGroomField?.()||experiment.field||[]}}
function beginEditStroke(label){finishEditStroke();editStrokeBefore=editSnapshot();if(!editBatch)editHistory.begin(editStrokeBefore);editStrokeActive=true;editStrokeLabel=label;editStrokeChanged=false;lastEditPoint=null;}
function finishEditStroke(){
  let changed=false;
  if(editStrokeActive){const current=editSnapshot();changed=JSON.stringify(editStrokeBefore)!==JSON.stringify(current);if(editBatch){if(changed)editBatchCount++;}else changed=editHistory.commit(current,editStrokeLabel);}
  editStrokeActive=false;editStrokeBefore=null;editStrokeChanged=false;lastEditPoint=null;editStrokeOutcome=null;syncEditor();
  if(changed)scheduleDraft();return changed;
}
function finishEditBatch(){
  if(!editBatch)return false;finishEditStroke();const changed=editHistory.commit(editSnapshot(),'组合编辑');editBatch=false;editBatchCount=0;editBatchStart='';syncEffects();if(changed)scheduleDraft();return changed;
}
function syncEditor(){
  const shell=experiment.mode==='shell';
  if(shell)editor.tool=null;
  if(!editor.tool)$('#edit-marker').hidden=true;
  const state=readLocalState(),hasLocal=!!state.snapshot||state.edits.length>0;
  const tool=editor.tool||(persistentBrush?'groom':editor.selected);
  const instructions={trim:'修剪按原毛长计算。保留比例越低，剪得越短；同一比例不会反复变短。',dye:'染色只作用于刷过的毛发，可调整颜色和强度。',curl:'卷曲变化叠加到当前材质，可增加或减少卷度。',restore:'只恢复刷过区域的原毛长、原毛色或原卷度；全部外观会恢复这三项。梳理方向保留，可单独撤销。',groom:'按住角色拖动梳理，方向会留下并参与回弹。梳理与其他笔刷共用步骤历史。'};
  $('#editor-help').textContent=shell?'层壳实验暂不支持局部创作。切回纤维渲染后可编辑，已有效果会保留。':`${editBatch?'组合进行中：可连续换笔刷，完成组合后整组撤销。':''}${editor.tool?`当前：局部${toolNames[tool]}。按住毛绒身体操作。`:persistentBrush?'当前：局部梳理。':'选择笔刷，在毛绒身体上操作。'}${instructions[tool]}`;
  document.querySelectorAll('[data-edit-tool]').forEach(b=>{b.disabled=shell;b.setAttribute('aria-pressed',String(editor.tool===b.dataset.editTool))});
  $('#editor-comb').disabled=shell;$('#editor-comb').setAttribute('aria-pressed',String(persistentBrush));
  $('#editor-stop').disabled=!editor.tool&&!persistentBrush;$('#editor-fiber').hidden=!shell;
  $('#restore-options').hidden=tool!=='restore';$('#restore-target').disabled=shell;$('#restore-target').value=editor.restoreTarget;
  const label=tool==='trim'?'保留原毛长':tool==='dye'?'染色强度':tool==='restore'?'恢复力度':tool==='groom'?'方向由拖动决定':'卷曲变化';
  $('#edit-radius').disabled=shell||tool==='groom';$('#edit-radius').value=editor.radius;$('#edit-radius-value').value=tool==='groom'?'柔和毛流':editor.radius.toFixed(2);
  $('#edit-value-label').textContent=label;$('#edit-value').min=tool==='trim'?.08:tool==='curl'?-1:0;$('#edit-value').max=1;$('#edit-value').value=editor.value;$('#edit-value').disabled=shell||tool==='groom';
  $('#edit-value-output').value=tool==='groom'?'—':tool==='trim'||tool==='dye'||tool==='restore'?Math.round(editor.value*100)+'%':(editor.value>0?'+':'')+editor.value.toFixed(2);
  $('#edit-color').disabled=shell||editor.tool!=='dye';$('#edit-color').value=editor.color;
  const batchChanged=editBatch&&editBatchStart!==JSON.stringify({...state,field:coat?.getGroomField?.()||experiment.field||[]});
  $('#edit-undo').disabled=shell||!(editHistory.canUndo||batchChanged);$('#edit-redo').disabled=shell||editBatch||!editHistory.canRedo;$('#edit-clear').disabled=shell||!hasLocal;
  $('#editor-groom-clear').disabled=shell||!(coat?.getGroomField?.()||experiment.field).some(v=>Math.hypot(...v)>.001);
  $('#edit-count').textContent='局部效果可持续叠加 · 最近 24 步可撤销';
  $('#edit-batch').disabled=shell;$('#edit-batch').setAttribute('aria-pressed',String(editBatch));$('#edit-batch').textContent=editBatch?'完成组合 · 合并为一步':'组合步骤 · 多次操作一起撤销';
  $('#edit-batch-status').textContent=editBatch?`组合进行中 · 已加入 ${editBatchCount} 次操作。可切换笔刷或旋转到另一面；点完成组合后整组撤销。`:'默认每次拖动为一步。开启组合，可把多次修剪、染色、恢复与梳理合为一步。';
  for(const [id,key] of [['groom-dynamics','groomDynamics'],['contact-mode','collision']]){const b=$('#'+id);b.disabled=shell;b.setAttribute('aria-pressed',String(!shell&&!!experiment[key]));}
  $('#contact-demo').disabled=shell;
  $('#contact-help').textContent=shell?'层壳实验保持原有剪切响应，毛流随动和接触在纤维渲染中可开启。':experiment.collision?`接触已开启：根部局部表面与${accessoryContacts().length}个配饰简化形体。长毛与吹风下更明显；尚无毛发互相碰撞。`:'毛流随动让梳后的方向成为回弹目标。接触使用简化形体，长毛下更明显。';
  syncGroomCount();
}
document.querySelectorAll('[data-edit-tool]').forEach(b=>b.addEventListener('click',()=>{
  const tool=b.dataset.editTool;if(editor.tool!==tool)clearMotion();editor.tool=editor.selected=tool;editor.value=editor.values[tool];activityEnd=-100;
  syncEditor();syncEffects();feedback(`当前为局部${toolNames[tool]}，在毛绒身体上按住操作。${editBatch?'本笔会加入组合步骤。':''}${tool==='trim'?`保留原毛长 ${Math.round(editor.value*100)}%，数值越低剪得越短。`:''}`);focusStage();
}));
$('#editor-stop').addEventListener('click',()=>{finishEditStroke();editor.tool=null;persistentBrush=brushMode=false;syncEditor();syncEffects();feedback(editBatch?'已停止涂画，组合仍在进行；可旋转后继续，或点完成组合。':'已停止涂画，可以拖动旋转到另一面。')});
$('#edit-batch').addEventListener('click',()=>{if(editBatch){const changed=finishEditBatch();feedback(changed?'组合已完成，可一次撤销或重做整组操作。':'组合没有新的变化，原有撤销与重做保留。');}else{finishEditStroke();const before=editSnapshot();editHistory.begin(before);editBatchStart=JSON.stringify(before);editBatch=true;editBatchCount=0;syncEffects();feedback('组合已开启：可以连续换笔刷、多次操作，完成后一起撤销。');}});
function clearGroomEdits(){beginEditStroke('清除梳理');coat.clearGroom?.();experiment.field=[];const changed=finishEditStroke();renderDirty=true;feedback(changed?(editBatch?'梳理记录已清除，已加入组合步骤。':'梳理记录已清除，可撤销恢复；其他笔触保留。'):'没有需要清除的梳理记录。');}
$('#editor-groom-clear').addEventListener('click',clearGroomEdits);
$('#editor-comb').addEventListener('click',()=>{if(!persistentBrush){clearMotion();experiment.groomDynamics=true;buildFur();persistentBrush=brushMode=true;}editor.selected='groom';activityEnd=-100;resume();syncEditor();syncResearch();syncEffects();feedback('当前为局部梳理：按住拖动，毛流会留下并参与回弹。');focusStage()});
$('#editor-fiber').addEventListener('click',()=>{setExperiment('off');syncEditor();feedback('已切回纤维渲染，局部创作已可使用。')});
$('#edit-radius').addEventListener('input',e=>{editor.radius=Number(e.target.value);syncEditor()});
$('#edit-value').addEventListener('input',e=>{editor.value=Number(e.target.value);if(editor.selected!=='groom')editor.values[editor.selected]=editor.value;syncEditor()});
$('#edit-color').addEventListener('input',e=>{editor.color=e.target.value});
$('#restore-target').addEventListener('change',e=>{editor.restoreTarget=e.target.value;syncEditor();feedback(`恢复笔刷：${e.target.selectedOptions[0].textContent}，按住已编辑区域涂画。`);});
function restoreEditSnapshot(snapshot){experiment.coat=snapshot.snapshot;experiment.edits=snapshot.edits;experiment.field=snapshot.field;coat.applyLocalState?.(snapshot);coat.setGroomField?.(snapshot.field);renderDirty=true;syncEditor();syncResearch();scheduleDraft();}
$('#edit-undo').addEventListener('click',()=>{if(editBatch)finishEditBatch();else finishEditStroke();const entry=editHistory.undo(editSnapshot());if(!entry)return;restoreEditSnapshot(entry.snapshot);feedback(`已撤销「${entry.label}」，整体材质保留。`)});
$('#edit-redo').addEventListener('click',()=>{finishEditStroke();const entry=editHistory.redo(editSnapshot());if(!entry)return;restoreEditSnapshot(entry.snapshot);feedback(`已重做「${entry.label}」。`)});
$('#edit-clear').addEventListener('click',()=>{beginEditStroke('清除局部创作');coat.clearLocal?.();experiment.coat='';experiment.edits=[];finishEditStroke();renderDirty=true;syncEditor();feedback(editBatch?'局部创作已清除，已加入当前组合；梳理方向保留。':'局部创作已清除，可撤销恢复；梳理方向保留。')});
for(const [id,key] of [['groom-dynamics','groomDynamics'],['contact-mode','collision']])$('#'+id).addEventListener('click',()=>{
  clearMotion();experiment[key]=!experiment[key];buildFur();syncEditor();syncResearch();resume();feedback(key==='collision'?(experiment.collision?'身体与配饰接触已开启，可吹风观察长毛。':'接触已关闭。'):(experiment.groomDynamics?'毛流随动已开启：梳理方向会成为回弹目标。':'毛流随动已关闭，已有梳理记录保留。'));
});
$('#contact-demo').addEventListener('click',()=>{
  clearMotion();experiment.collision=experiment.groomDynamics=true;params={...presets.wild,length:.31,curl:.12,mess:.12,groom:.65};
  syncControls();syncPresetButtons();buildFur();syncEditor();syncResearch();frontView();windEnabled=true;windStrength=.8;windDemoEnd=elapsed+2.5;$('#wind-strength').value=.8;$('#wind-value').value='0.80';syncEffects();oneShot('接触示例：先吹风，再观察毛束回弹。',5,'示例已停风，接触与毛流随动继续开启。');
});

function referenceFront(){
  referenceSpin=false;creationView.setSpinning(false);
  if(referenceActor)referenceActor.rotation.y=0;
  camera.position.set(0,.25,camera.aspect<.8?5.8:4.5);camera.lookAt(0,.05,0);
  referenceOrbit?.target.set(0,.05,0);referenceOrbit?.update();
}
function applyReferenceStyle(){
  if(referenceAsset){referenceAsset.setTint(referenceStyle.tint);referenceAsset.setFur(referenceStyle.fur);referenceActor.scale.setScalar(referenceStyle.size);}
  creationView.setStyle(referenceStyle);
  creationView.setHistory({undo:referenceHistory.canUndo,redo:referenceHistory.canRedo});
  try{window.localStorage.setItem(referenceStyleKey,JSON.stringify(referenceStyle));}catch{}
}
async function loadCreationReference(){
  if(referenceLoading)return referenceLoading;
  creationView.status('正在加载完整本地高斯资产…',{ready:false});
  referenceLoading=ensureReferencePlush({renderer,scene,onProgress:progress=>{
    if(progress.phase!=='ready')creationView.status(`加载角色 ${progress.chunksLoaded||0} / ${progress.chunksTotal||6} 块 · ${(progress.loaded/1048576||0).toFixed(1)} MB`,{ready:false});
  }}).then(asset=>{
    referenceAsset=asset;referenceActor=new THREE.Group();referenceActor.name='creation-reference-actor';referenceActor.add(asset.group);scene.add(referenceActor);
    referenceActor.visible=!nativeViewActive;applyReferenceStyle();
    creationView.status('本地角色已就绪 · 完整 3,493,379 高斯点 · 可旋转、弹跳与保存');
    return asset;
  }).catch(error=>{console.error(error);creationView.status('角色加载失败：'+error.message+' 点击切回创作可继续原来的作品。',{ready:false});referenceLoading=null;});
  return referenceLoading;
}
function setCreationAsset(view){
  const nextNative=view==='native';
  if(nextNative===nativeViewActive&&referenceOrbit)return;
  if(!nextNative){
    finishEditStroke();drag=null;squeezing=false;
    if(nativeViewActive)referenceSavedCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone(),background:$('.stage').style.background};
    if(!referenceOrbit){referenceOrbit=new OrbitControls(camera,renderer.domElement);referenceOrbit.enableDamping=true;referenceOrbit.minDistance=2.4;referenceOrbit.maxDistance=9;referenceOrbit.enablePan=false;}
    referenceOrbit.enabled=!referenceBrush?.enabled();nativeViewActive=false;creature.visible=false;referenceFront();
    renderer.toneMapping=THREE.NoToneMapping;$('.stage').style.background='radial-gradient(ellipse at 50% 48%,#333943,#20242b 80%)';
    $('#edit-marker').hidden=$('#touch-marker').hidden=true;
    if(referenceActor)referenceActor.visible=true;loadCreationReference();
  }else{
    referenceBrush?.setEnabled(false);nativeViewActive=true;creature.visible=true;if(referenceActor)referenceActor.visible=false;if(referenceOrbit)referenceOrbit.enabled=false;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    if(referenceSavedCamera){camera.position.copy(referenceSavedCamera.position);camera.quaternion.copy(referenceSavedCamera.quaternion);$('.stage').style.background=referenceSavedCamera.background;}else resize();
  }
  lastFrame=performance.now();frameCount=fpsTime=0;renderDirty=true;$('#fps').textContent=nextNative?(paused?'已暂停':'— FPS'):'加载角色…';
}
function creationReferenceAction(action,value){
  if(!referenceAsset)return;
  if(action==='finish'){finishReferenceChange();return;}
  if(['tint','size','fur-length','fur-curl'].includes(action))referenceHistory.begin(referenceSnapshot());
  if(action==='front')referenceFront();
  if(action==='spin'){referenceBrush?.setEnabled(false);referenceSpin=!referenceSpin;creationView.setSpinning(referenceSpin);}
  if(action==='bounce'){referenceBrush?.setEnabled(false);referenceVelocity=3.1;referenceJump=Math.max(referenceJump,.001);}
  if(action==='tint'){referenceStyle.tint=value;applyReferenceStyle();}
  if(action==='size'){referenceStyle.size=THREE.MathUtils.clamp(value,.65,1.35);applyReferenceStyle();}
  if(action==='fur-length'||action==='fur-curl'){referenceStyle.fur=sanitizeReferenceFur({...referenceStyle.fur,[action.slice(4)]:value});applyReferenceStyle();}
  if(action==='groom')referenceBrush?.setEnabled(!referenceBrush.enabled());
  if(action==='clear-groom'||action==='reset'){finishReferenceChange();referenceHistory.begin(referenceSnapshot());referenceStyle=action==='reset'?{tint:'#ffffff',size:1,fur:sanitizeReferenceFur()}:{...referenceStyle,fur:{...referenceStyle.fur,groom:[]}};applyReferenceStyle();finishReferenceChange();if(action==='reset')referenceFront();}
  if(action==='undo'||action==='redo'){finishReferenceChange();const restored=referenceHistory[action](referenceSnapshot());if(restored){referenceStyle=JSON.parse(restored.snapshot.snapshot);applyReferenceStyle();creationView.status(action==='undo'?'已撤销整次修改。':'已重做整次修改。');}}
  if(action==='png'){
    renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(!blob){creationView.status('图片未能生成，请重试');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='felipe-plush-creation.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);creationView.status('图片已保存 · 原作署名与授权见页面底部');},'image/png');
  }
}
function finishReferenceChange(){const changed=referenceHistory.commit(referenceSnapshot(),'星仔绒毛修改');creationView.setHistory({undo:referenceHistory.canUndo,redo:referenceHistory.canRedo});return changed;}
const creationView=mountPlushReferenceView({
  stage:$('.stage'),nativeStage:$('#creation-native-stage'),nativeControls:$('#creation-native-controls'),
  nativeExtras:[$('#bounce'),$('#pause'),$('#status')],context:'creation',nativeLabel:'绒毛创作',
  onViewChange:setCreationAsset,onAction:creationReferenceAction,
});
creationView.setStyle(referenceStyle);
if(renderer&&camera)referenceBrush=createReferencePlushBrush({THREE,canvas:renderer.domElement,camera,getAsset:()=>referenceAsset,isActive:()=>!nativeViewActive,getStyle:()=>referenceStyle.fur,
  onStart(){finishReferenceChange();referenceHistory.begin(referenceSnapshot());referenceSpin=false;creationView.setSpinning(false);},
  onChange(fur){referenceStyle.fur=fur;applyReferenceStyle();},
  onFinish({changed}){finishReferenceChange();creationView.status(changed?'梳理已留下，整次拖动可一步撤销。':'请按住蓝色绒毛拖动梳理。');},
  onModeChange(enabled){if(enabled){referenceSpin=false;referenceJump=referenceVelocity=0;creationView.setSpinning(false);renderDirty=true;}if(referenceOrbit)referenceOrbit.enabled=!enabled&&!nativeViewActive;creationView.setGrooming(enabled);creationView.status(enabled?'梳理已开启 · 按住蓝色绒毛拖动，眼睛和帽子保留。':'梳理已关闭 · 可拖动画面旋转。');}
});
if(renderer&&scene)setCreationAsset(creationView.view());
let referencePointer=null;
renderer?.domElement.addEventListener('pointerdown',event=>{if(!nativeViewActive)referencePointer={id:event.pointerId,x:event.clientX,y:event.clientY};});
renderer?.domElement.addEventListener('pointerup',event=>{
  const start=referencePointer;referencePointer=null;if(nativeViewActive||!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5||!referenceActor)return;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,camera);
  referenceActor.updateMatrixWorld(true);const bounds=new THREE.Box3(new THREE.Vector3(-1.1,-1.1,-.9),new THREE.Vector3(1.1,1.1,.9)).applyMatrix4(referenceActor.matrixWorld);
  if(raycaster.ray.intersectsBox(bounds))creationReferenceAction('bounce');
});
renderer?.domElement.addEventListener('pointercancel',()=>{referencePointer=null;});
window.addEventListener('pagehide',event=>{if(event.persisted)return;referenceBrush?.dispose();referenceAsset?.dispose();referenceOrbit?.dispose();});
