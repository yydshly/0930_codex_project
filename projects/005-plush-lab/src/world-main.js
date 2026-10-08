import * as THREE from 'three';
import {companionCommand} from './companion-bridge.js';
import {createEmbeddedDraftSession} from './world-draft-session.js';
import {mountPlushReferenceView} from './plush-reference-view.js';
import {ensureReferencePlush} from './reference-plush-asset.js';
import {sanitizeReferenceFur} from './reference-plush-fur.js';
import {createReferencePlushBrush} from './reference-plush-brush.js';
import {FurCoat} from './fur.js';
import {shapePoint} from './shapes.js';
import {stepBounce} from './physics.js';
import {buildWardrobe,disposeObject} from './world-wardrobe.js';
import {buildWorldScene} from './world-scene.js';
import {buildFurniture} from './world-furniture.js';
import {FURNITURE,MAX_FURNITURE_PER_SCENE,layoutForScene,addFurniture,updateFurniture,removeFurniture,furnitureObstacles,isWalkable,planPath,sofaApproach,validateSeatAccess} from './world-layout.js';
import {createActor,walkActor,stepActor,restoreActorPose,resetActor} from './world-actor.js';
import {createFetchGame,startFetchGame,stepFetchGame,cancelFetchGame,isFetchBusy,FETCH_BALL_RADIUS} from './world-fetch.js';
import {SHAPES,MATERIALS,HATS,OUTFITS,ACCESSORIES,SCENES,LIGHTING,PERSONALITIES,PALETTES,defaultWorld,sanitizeWorld,generateWorld,encodeWorld,decodeWorld} from './world-config.js';

const $=selector=>document.querySelector(selector);
const companionEmbed=new URLSearchParams(location.search).get('companion')==='1';
let nativeViewActive=true;
let referenceView=null,referenceAsset=null,referenceLoad=null,creatureGeneration=0,referenceSpinning=false,referenceBrush=null,referenceBrushBefore=null;
const hasReferenceActor=()=>state.actorAsset==='reference-plush';
let companionReady=false,companionError=null,draftConflict=false;
const DRAFT_CONFLICT_MESSAGE='小世界已在另一个页面更新。当前画面保留，请前往小世界查看最新创作。';
const companionSession=globalThis.crypto?.randomUUID?.()||String(Date.now());
let companionEventNumber=0;
if(companionEmbed)document.documentElement.classList.add('companion-embed');
function companionPost(packet){if(companionEmbed&&window.parent!==window)window.parent.postMessage(packet,location.origin);}
function announceCompanion(){
  if(companionError){companionPost({type:'plush:error',message:companionError});return;}
  if(!companionReady)return;
  if(draftConflict){companionPost({type:'plush:draft-stale',message:DRAFT_CONFLICT_MESSAGE});return;}
  companionPost({type:'plush:ready',companion:{name:state.name,personality:state.personality},worldCode:encodeWorld(state)});
}
function sharedActivity(kind,title){companionPost({type:'plush:event',kind,title:title.slice(0,100),eventId:companionSession+'-'+(++companionEventNumber)});}
window.addEventListener('message',event=>{
  if(!companionEmbed||event.origin!==location.origin||event.source!==window.parent)return;
  const packet=companionCommand(event.data);if(!packet)return;
  if(packet.type==='plush:hello'){announceCompanion();return;}
  if(!companionReady)return;
  if(packet.action==='greet')greet();
  else if(packet.action==='jump')jump();
  else if(packet.action==='fetch')throwFetchBall();
  else if(packet.action==='cancel')cancelFetchPlay('玩具已收起，');
});
const DRAFT_KEY='plush-world-draft-v1',COLLECTION_KEY='plush-world-collection-v1';
const materialParams={
  cloud:{length:.09,density:80,thickness:.0026,curl:.35,gravity:.25,mess:.35,brightness:1,stiffness:.6,roughness:.9,groom:0,wetness:0},
  velvet:{length:.045,density:90,thickness:.0022,curl:.06,gravity:.2,mess:.1,brightness:1,stiffness:.8,roughness:.72,groom:0,wetness:0},
  teddy:{shortPile:false,length:.075,density:75,thickness:.0038,curl:1,gravity:.2,mess:.28,brightness:1,stiffness:.8,roughness:1,groom:0,wetness:0},
};
let storage=null;try{storage=window.localStorage}catch{}
let state=defaultWorld(),collection=[],undo=[],redo=[],locks={},renderDirty=true;
let collectionWritable=true,collectionIssue='',nameDirty=false,seedDirty=false,colorGesture=null;
let layoutMode=false,selectedFurniture=null,selectionHelper=null,furnished=null,actorSavedStatus='idle';
const actor=createActor({yaw:.34});
const fetchGame=createFetchGame();
let aiming=false,fetchVisual=null,fetchFloor=null;
const token=new URLSearchParams(location.hash.slice(1)).get('world');
let startupMessage='修改后自动保存最近小世界。',draftSnapshot;
try{
  if(token){state=decodeWorld(token);startupMessage='已打开链接中的小世界。';if(companionEmbed){try{draftSnapshot=storage?.getItem(DRAFT_KEY)??null;}catch{}}}
  else {const saved=storage?.getItem(DRAFT_KEY);draftSnapshot=saved??null;if(saved){state=decodeWorld(saved);startupMessage='已恢复最近小世界。'}}
}catch{startupMessage=token?'链接格式有误，已打开默认小世界。':'最近小世界无法读取，已打开默认搭配。';}
let embeddedDraft=companionEmbed?createEmbeddedDraftSession(storage,{key:DRAFT_KEY,stored:draftSnapshot,initial:encodeWorld(state)}):null;
function readWorldCollection(){
  try{
    if(!storage)throw Error();const raw=storage.getItem(COLLECTION_KEY),saved=raw===null?[]:JSON.parse(raw);
    if(!Array.isArray(saved))throw Error();const entries=[];let ok=saved.length<=8;
    for(const item of saved){try{entries.push(decodeWorld(item));}catch{ok=false;}}
    return {entries,ok,error:ok?'':'收藏包含损坏或超出容量的内容；可读取作品保留，新增和移除已暂停，原始存储未改写。'};
  }catch{return {entries:[],ok:false,error:'本机收藏无法读取；新增和移除已暂停，原始存储未改写。可生成链接保留当前作品。'};}
}
const initialCollection=readWorldCollection();collection=initialCollection.entries;collectionWritable=initialCollection.ok;collectionIssue=initialCollection.error;
if(collectionIssue)startupMessage+=' '+collectionIssue;

const label=(options,id)=>options.find(option=>option.id===id)?.label||id;
function feedback(message){$('#world-feedback').textContent=message;}
function saveDraft(){
  const encoded=encodeWorld(state);
  if(embeddedDraft){
    const result=embeddedDraft.save(encoded);draftConflict=result.conflict;
    $('#world-storage-status').textContent=result.conflict?DRAFT_CONFLICT_MESSAGE:!result.ok?result.error:result.changed?'最近小世界已自动保存 · 仅此浏览器':'当前画面保留 · 没有新的修改';
  }else{
    try{if(!storage)throw Error();storage.setItem(DRAFT_KEY,encoded);$('#world-storage-status').textContent='最近小世界已自动保存 · 仅此浏览器'+(collectionIssue?' · '+collectionIssue:'');}
    catch{$('#world-storage-status').textContent='本机保存失败，可生成链接带走当前小世界。';}
  }
  // Compact state in the current page URL also makes a refresh reproducible.
  try{history.replaceState(null,'','#world='+encoded);}catch{}
  $('#world-share-box').hidden=true;invalidatePhoto();
  announceCompanion();
}
function remember(previous){undo.push(previous);if(undo.length>20)undo.shift();redo=[];}
function finishColorGesture(){
  if(!colorGesture)return false;const previous=colorGesture.before,referenceStyle=['actorTint','actorScale','actorFur'].includes(colorGesture.key);colorGesture=null;
  const changed=JSON.stringify(previous)!==JSON.stringify(state);if(changed)remember(previous);
  sync();saveDraft();if(changed)feedback(referenceStyle?'原作样式已记住，整次调整可一步撤销。':'配色已更新，可撤销这次调色。');return changed;
}
function previewColor(key,value){
  if(colorGesture&&colorGesture.key!==key)finishColorGesture();
  const next=sanitizeWorld({...state,[key]:value});if(JSON.stringify(next[key])===JSON.stringify(state[key]))return;
  if(!colorGesture)colorGesture={before:state,key};
  const previous=state;state=next;applyVisual(previous);sync();saveDraft();feedback(['actorTint','actorScale','actorFur'].includes(key)?'正在预览原作样式，结束调整后记为一步。':'正在预览配色，结束调色后记为一步。');
}
function commit(changes,message){
  finishColorGesture();captureActorPose();const next=sanitizeWorld({...state,...changes});if(JSON.stringify(next)===JSON.stringify(state)){sync();return;}
  const previous=state;remember(previous);state=next;applyVisual(previous);sync();saveDraft();if(message)feedback(message);
}
function replaceWorld(next,message,record=true,preservePlay=false){
  if(!preservePlay)stopFetchPlay();
  finishColorGesture();next=sanitizeWorld(next);const previous=state;if(record&&JSON.stringify(next)!==JSON.stringify(state))remember(previous);
  state=next;applyVisual(previous);sync();saveDraft();feedback(message);
}
function randomSeed(){const bytes=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);else bytes[0]=Date.now()>>>0;return 'soft-'+bytes[0].toString(36);}
function drawOptions(selector,options,key){const container=$(selector);for(const option of options){const button=document.createElement('button');button.type='button';button.dataset.value=option.id;button.textContent=option.label;button.addEventListener('click',()=>commit({[key]:option.id,...(key==='scene'?{pose:{x:0,z:0,seatId:null}}:{})},'已换成'+option.label+'。'));container.append(button);}}
drawOptions('#shape-options',SHAPES,'shape');drawOptions('#material-options',MATERIALS,'material');drawOptions('#personality-options',PERSONALITIES,'personality');drawOptions('#scene-options',SCENES,'scene');drawOptions('#lighting-options',LIGHTING,'lighting');
for(const [selector,options] of [['#world-hat',HATS],['#world-outfit',OUTFITS],['#world-accessory',ACCESSORIES]]){for(const option of options){const element=document.createElement('option');element.value=option.id;element.textContent=option.label;$(selector).append(element);}}
for(const palette of PALETTES){const button=document.createElement('button');button.type='button';button.className='palette';button.title=palette.label;button.setAttribute('aria-label',palette.label);button.dataset.palette=palette.id;const colors=document.createElement('span');for(const color of [palette.furColor,palette.accentColor,palette.secondaryColor]){const swatch=document.createElement('i');swatch.style.background=color;colors.append(swatch);}button.append(colors,document.createTextNode(palette.label));button.addEventListener('click',()=>commit({...(hasReferenceActor()?{}:{furColor:palette.furColor}),accentColor:palette.accentColor,secondaryColor:palette.secondaryColor},'已应用'+palette.label+(hasReferenceActor()?'场景配色。':'配色。')));$('#palette-options').append(button);}
function sync(){
  $('#world-name').textContent=state.name;if(!nameDirty)$('#world-name-input').value=state.name;if(!seedDirty)$('#world-seed').value=state.seed;
  $('#scene-label').textContent=label(SCENES,state.scene)+' / '+label(LIGHTING,state.lighting);
  const reference=hasReferenceActor();
  $('#world-summary').textContent=reference?['原作卷绒星仔','本地三维资产',label(PERSONALITIES,state.personality)].join(' · '):[label(SHAPES,state.shape),label(MATERIALS,state.material),label(OUTFITS,state.outfit),label(PERSONALITIES,state.personality)].join(' · ');
  for(const [selector,key] of [['#shape-options','shape'],['#material-options','material'],['#personality-options','personality'],['#scene-options','scene'],['#lighting-options','lighting']])for(const button of $(selector).children){const active=button.dataset.value===state[key];button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
  for(const [selector,key] of [['#world-hat','hat'],['#world-outfit','outfit'],['#world-accessory','accessory'],['#world-fur-color','furColor'],['#world-accent-color','accentColor'],['#world-secondary-color','secondaryColor']])$(selector).value=state[key];
  for(const button of $('#palette-options').children){const palette=PALETTES.find(p=>p.id===button.dataset.palette);button.setAttribute('aria-pressed',String(['furColor','accentColor','secondaryColor'].every(key=>palette[key]===state[key])));}
  const previewChanged=colorGesture&&colorGesture.before[colorGesture.key]!==state[colorGesture.key];
  $('#world-undo').disabled=!undo.length&&!previewChanged;$('#world-redo').disabled=!redo.length||Boolean(previewChanged);
  $('#world-random-wardrobe').disabled=reference||locks.wardrobe===true;
  for(const selector of ['#shape-options','#material-options'])for(const button of $(selector).children){button.disabled=reference;button.title=reference?'原作形体和毛绒已包含在资产中；切回自由创作角色可编辑。':'';}
  for(const selector of ['#world-hat','#world-outfit','#world-accessory','#world-fur-color']){$(selector).disabled=reference;$(selector).title=reference?'原作自带着装和毛色保留；可在原作面板整体调色。':'';}
  let assetHint=$('#world-asset-hint');
  if(!assetHint){assetHint=document.createElement('p');assetHint.id='world-asset-hint';assetHint.className='help';$('#world-random-wardrobe').after(assetHint);}
  assetHint.hidden=!reference;assetHint.textContent='原作星仔已使用本地三维资产，可行走、轻触弹跳、坐沙发和捡球。它的黑帽子已在原作中，暂不能独立换装；切回自由创作角色继续编辑原来的衣橱。';
  referenceView?.select(reference?'reference':'native',{notify:false});
  referenceView?.setStyle({tint:state.actorTint??'#ffffff',size:state.actorScale,fur:state.actorFur});
  referenceView?.setHistory({undo:undo.length>0||Boolean(previewChanged),redo:redo.length>0&&!previewChanged});
  if(!reference)referenceBrush?.setEnabled(false);
  if(renderer)syncPlay();
  renderLayoutEditor();
}
for(const checkbox of document.querySelectorAll('[data-lock]'))checkbox.addEventListener('change',()=>{locks[checkbox.dataset.lock]=checkbox.checked;sync();feedback(checkbox.checked?'已锁定这部分，下次随机会保留。':'已解锁，下次随机可以变化。');});
$('#world-random').addEventListener('click',()=>{seedDirty=false;replaceWorld(generateWorld(randomSeed(),state,locks),'遇见新搭配了。喜欢哪一部分，就把它锁住。');});
$('#world-generate').addEventListener('click',()=>{const seed=$('#world-seed').value.trim();if(!seed){feedback('先写一个生成种子。');$('#world-seed').focus();return;}seedDirty=false;replaceWorld(generateWorld(seed,state,locks),'已按种子生成，锁定部分保留。');});
$('#world-seed').addEventListener('input',event=>{seedDirty=event.target.value!==state.seed;});
$('#world-seed').addEventListener('keydown',event=>{if(event.key==='Enter')$('#world-generate').click();});
$('#world-name-input').addEventListener('input',event=>{nameDirty=event.target.value!==state.name;});
function submitName(){const name=$('#world-name-input').value;nameDirty=false;commit({name},'名字已记住。');}
$('#world-name-input').addEventListener('change',submitName);
$('#world-name-input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();submitName();}});
for(const [selector,key] of [['#world-hat','hat'],['#world-outfit','outfit'],['#world-accessory','accessory']])$(selector).addEventListener('change',event=>commit({[key]:event.target.value},'着装已更新。'));
for(const [selector,key] of [['#world-fur-color','furColor'],['#world-accent-color','accentColor'],['#world-secondary-color','secondaryColor']]){
  $(selector).addEventListener('input',event=>previewColor(key,event.target.value));
  $(selector).addEventListener('change',event=>{previewColor(key,event.target.value);finishColorGesture();});
  $(selector).addEventListener('blur',finishColorGesture);
}
$('#world-random-wardrobe').addEventListener('click',()=>{
  if(hasReferenceActor()||locks.wardrobe===true)return;
  const clothingKeys=['hat','outfit','accessory'];let next;
  for(let attempt=0;attempt<8;attempt++){
    next=generateWorld(randomSeed(),state,{shape:true,material:true,palette:true,scene:true,personality:true});
    if(clothingKeys.some(key=>next[key]!==state[key]))break;
  }
  if(clothingKeys.every(key=>next[key]===state[key]))next.outfit=OUTFITS[(OUTFITS.findIndex(item=>item.id===state.outfit)+1)%OUTFITS.length].id;
  captureActorPose();replaceWorld({...next,seed:state.seed,pose:state.pose},'换好新衣服了。',true,true);
});
$('#world-undo').addEventListener('click',()=>{finishColorGesture();if(!undo.length)return;redo.push(state);replaceWorld(undo.pop(),'已撤销这次修改。',false);});
$('#world-redo').addEventListener('click',()=>{finishColorGesture();if(!redo.length)return;undo.push(state);replaceWorld(redo.pop(),'已重做这次修改。',false);});
function setTab(id,focus=false){for(const button of document.querySelectorAll('[data-tab]')){const selected=button.dataset.tab===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('#world-panel-'+button.dataset.tab).hidden=!selected;if(selected&&focus)button.focus();}}
const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach((button,i)=>{button.addEventListener('click',()=>setTab(button.dataset.tab));button.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=(i+1)%tabs.length;if(event.key==='ArrowLeft')target=(i+tabs.length-1)%tabs.length;if(event.key==='Home')target=0;if(event.key==='End')target=tabs.length-1;if(target!==undefined){event.preventDefault();setTab(tabs[target].dataset.tab,true);}});});

function captureActorPose(){
  const pose={x:Math.round(actor.x*10000)/10000,z:Math.round(actor.z*10000)/10000,seatId:actor.status==='seated'?actor.seatId:null};
  state=sanitizeWorld({...state,pose});
}
function navigationOptions(){return {radius:.55*(hasReferenceActor()?state.actorScale:1),bounds:2.65,...(state.scene==='garden'?{diskRadius:2.5}:{})};}
function baselineObstacles(){
  if(!world)return [];
  const obstacles=[['low-table',.64],['plant',.46],['garden-tree',.37],['flowerbed',.55],['mushrooms',.42],['orb-plinth',.4],['sculpture',.42]].flatMap(([name,radius])=>{
    const object=world.group.getObjectByName(name);return object?[{id:'fixed-'+name,x:object.position.x,z:object.position.z,radius}]:[];
  });
  if(state.scene==='room')obstacles.push({id:'fixed-cushion-1',x:-1.7,z:-1.55,radius:.4},{id:'fixed-cushion-2',x:-2.12,z:-1.75,radius:.4});
  return obstacles;
}
function navigationObstacles(){return [...baselineObstacles(),...furnitureObstacles(state)];}
function validFurniturePosition(item,candidateWorld){
  const definition=FURNITURE.find(row=>row.id===item.type),footprint={...item,width:definition.width,depth:definition.depth};
  if(!isWalkable([0,0],[footprint],{radius:.65}))return '为小伙伴留一点地毯上的空地。';
  if(baselineObstacles().some(obstacle=>!isWalkable([obstacle.x,obstacle.z],[footprint],{radius:obstacle.radius+.08})))return '这里有场景物件，请换一个位置。';
  if(state.scene==='garden'){
    const c=Math.cos(item.rotation),s=Math.sin(item.rotation);
    for(const x of [-definition.width/2,definition.width/2])for(const z of [-definition.depth/2,definition.depth/2])if(Math.hypot(item.x+x*c+z*s,item.z-x*s+z*c)>3)return '家具需要留在花园的圆形草地内。';
  }
  return validateSeatAccess(candidateWorld,baselineObstacles(),navigationOptions());
}
function activeFurniture(){return layoutForScene(state).find(item=>item.id===selectedFurniture);}
function clearSelectionHelper(){if(!selectionHelper)return;scene?.remove(selectionHelper);selectionHelper.geometry.dispose();selectionHelper.material.dispose();selectionHelper=null;}
function updateSelectionHelper(){
  clearSelectionHelper();if(!layoutMode||!selectedFurniture||!furnished||!scene)return;
  const object=furnished.group.children.find(child=>child.userData.placedItemId===selectedFurniture);
  if(object){selectionHelper=new THREE.BoxHelper(object,'#719873');selectionHelper.material.transparent=true;selectionHelper.material.opacity=.65;scene.add(selectionHelper);}renderDirty=true;
}
function renderLayoutEditor(){
  const items=layoutForScene(state),selected=items.find(item=>item.id===selectedFurniture);
  if(!selected)selectedFurniture=null;
  $('#world-furniture-count').textContent=items.length+' / '+MAX_FURNITURE_PER_SCENE;
  $('#world-mode-play').setAttribute('aria-pressed',String(!layoutMode));$('#world-mode-layout').setAttribute('aria-pressed',String(layoutMode));
  for(const button of $('#world-furniture-add').children)button.disabled=items.length>=MAX_FURNITURE_PER_SCENE;
  const list=$('#world-furniture-list');list.replaceChildren();
  for(const [index,item] of items.entries()){
    const button=document.createElement('button');button.textContent=label(FURNITURE,item.type)+' '+(index+1);button.style.setProperty('--furniture-color',item.color);button.setAttribute('aria-pressed',String(item.id===selectedFurniture));button.addEventListener('click',()=>selectFurniture(item.id));list.append(button);
  }
  $('#world-furniture-editor').hidden=!selected;
  if(selected){$('#world-furniture-name').textContent=label(FURNITURE,selected.type);$('#world-furniture-position').textContent=`${selected.x.toFixed(2)}, ${selected.z.toFixed(2)} · ${Math.round(selected.rotation*180/Math.PI)}°`;$('#world-furniture-color').value=selected.color;$('#world-sit').hidden=selected.type!=='sofa';}
  const interactions=$('#world-furniture-interactions');interactions.replaceChildren();
  for(const [index,item] of items.entries())if(item.type==='sofa'){
    const button=document.createElement('button');button.textContent='坐到沙发 '+(index+1);button.addEventListener('click',()=>sitOnFurniture(item.id));interactions.append(button);
  }
  $('#world-canvas').classList.toggle('is-arranging',layoutMode);updateSelectionHelper();
}
function setLayoutMode(active){
  stopFetchPlay();
  layoutMode=active;if(active){captureActorPose();restoreActor();saveDraft();}
  renderLayoutEditor();feedback(active?'布置模式：选家具后拖动，或用方向按钮微调。':'陪伴模式：点击沙发入座，点击空地行走。');
}
function selectFurniture(id){selectedFurniture=id;renderLayoutEditor();feedback('已选中'+label(FURNITURE,activeFurniture()?.type)+'，可以调整位置、朝向和颜色。');}
function changeFurniture(patch){
  captureActorPose();const result=updateFurniture(state,selectedFurniture,patch);
  const error=result.error||(result.item&&validFurniturePosition(result.item,result.world));if(error){feedback(error);return;}
  commit({layout:result.world.layout},'家具已调整，可撤销这一步。');
}
for(const definition of FURNITURE){
  const button=document.createElement('button');button.textContent='+ '+definition.label;button.addEventListener('click',()=>{
    captureActorPose();let result=addFurniture(state,definition.id);if(result.error){feedback(result.error);return;}
    if(validFurniturePosition(result.item,result.world)){
      let alternative=null;
      for(let z=-2.1;z<=2.11&&!alternative;z+=.35)for(let x=-2.1;x<=2.11&&!alternative;x+=.35){const candidate=updateFurniture(result.world,result.item.id,{x:Math.round(x*100)/100,z:Math.round(z*100)/100});if(!candidate.error&&!validFurniturePosition(candidate.item,candidate.world))alternative=candidate;}
      if(!alternative){feedback('没有合适的空地，先挪动一件家具再添加。');return;}result=alternative;
    }
    selectedFurniture=result.item.id;layoutMode=true;commit({layout:result.world.layout},'已添置'+definition.label+'。调好位置后，切换陪伴模式。');
  });$('#world-furniture-add').append(button);
}
$('#world-mode-play').addEventListener('click',()=>setLayoutMode(false));$('#world-mode-layout').addEventListener('click',()=>setLayoutMode(true));
for(const button of document.querySelectorAll('[data-nudge]'))button.addEventListener('click',()=>{const item=activeFurniture();if(!item)return;const [dx,dz]=button.dataset.nudge.split(',').map(Number);changeFurniture({x:Math.round((item.x+dx)*100)/100,z:Math.round((item.z+dz)*100)/100});});
$('#world-furniture-rotate').addEventListener('click',()=>{const item=activeFurniture();if(item)changeFurniture({rotation:item.rotation+Math.PI/4});});
$('#world-furniture-color').addEventListener('change',event=>changeFurniture({color:event.target.value}));
$('#world-furniture-remove').addEventListener('click',()=>{if(!selectedFurniture)return;const id=selectedFurniture,next=removeFurniture(state,id);selectedFurniture=null;commit({layout:next.layout,pose:state.pose.seatId===id?{x:0,z:0,seatId:null}:next.pose},'家具已移除，可撤销恢复。');});
$('#world-sit').addEventListener('click',()=>sitOnFurniture(selectedFurniture));
$('#world-stand').addEventListener('click',()=>moveActorTo([0,0],null,'小伙伴正回到地毯。'));
function restoreActor(){
  const seats=furnished?.seats??[];restoreActorPose(actor,state.pose,seats);
  if(!actor.seatId&&!isWalkable([actor.x,actor.z],navigationObstacles(),navigationOptions())){
    let free=isWalkable([0,0],navigationObstacles(),navigationOptions())?[0,0]:null;
    for(let z=-2;z<=2&&!free;z+=.4)for(let x=-2;x<=2&&!free;x+=.4)if(isWalkable([x,z],navigationObstacles(),navigationOptions()))free=[x,z];
    resetActor(actor,{x:free?.[0]??0,z:free?.[1]??0,yaw:.34});
  }
  actorSavedStatus=actor.status;updateActorActivity();renderDirty=true;
}
function updateActorActivity(){const messages={idle:'在地毯上陪你',walking:'正在走过去…',sitting:'轻轻坐下来…',seated:'坐在沙发上陪你',standing:'慢慢站起来…'};const play={starting:'准备一起玩球…',throwing:'球飞出去了！',bouncing:'小球弹跳着，它追过去了！',chasing:'追球中…',picking:'找到球，轻轻捡起…',returning:'带着球回来…',celebrating:'捡回来了，回应你！'};$('#world-activity').textContent=play[fetchGame.phase]??(aiming?'等你选择丢球落点…':messages[actor.status]??messages.idle);}
function moveActorTo(target,seat=null,message='小伙伴正走向这块空地。'){
  stopFetchPlay();
  const currentSeat=furnished?.seats.find(item=>item.id===actor.seatId),start=currentSeat?currentSeat.approach:[actor.x,actor.z];
  const path=planPath(start,target,navigationObstacles(),navigationOptions());
  if(!path){feedback('这条路被物件挡住了，请挪开一些家具或换一块空地。');return false;}
  if(!walkActor(actor,path,{seat})){feedback('暂时无法走到这里，请重试。');return false;}
  layoutMode=false;yaw=0;jumpHeight=jumpVelocity=0;resume();renderLayoutEditor();updateActorActivity();feedback(message);return true;
}
function sitOnFurniture(id){
  const seat=furnished?.seats.find(item=>item.id===id);if(!seat)return;
  stopFetchPlay();
  if(actor.status==='seated'&&actor.seatId===id){feedback(state.name+'已经坐在这张沙发上了。');return;}
  moveActorTo(seat.approach,seat,state.name+'正走到沙发，坐下陪你。');
}
function characterScale(){return (layoutForScene(state).length ? .65 : .8)*(hasReferenceActor()?state.actorScale:1);}
function buildPlacedFurniture(){
  clearSelectionHelper();if(furnished){scene.remove(furnished.group);disposeObject(furnished.group);}
  furnished=buildFurniture(layoutForScene(state),{floorY:world.floorY,accentColor:state.accentColor,secondaryColor:state.secondaryColor});
  // Leave enough space in front for the actor's body before the sit transition.
  furnished.seats=furnished.seats.map(seat=>({...seat,elevation:.55,approach:sofaApproach(layoutForScene(state).find(item=>item.id===seat.id))}));
  if(state.scene==='gallery'&&(layoutForScene(state).length||hasReferenceActor())){const floor=softMesh(new THREE.BoxGeometry(6,.035,6),world.background);floor.position.y=world.floorY-.028;furnished.group.add(floor);}
  scene.add(furnished.group);if(bounds)baseY=world.floorY-bounds.bottom*characterScale()+.025;updateSelectionHelper();renderDirty=true;
}

function syncFetchPlay(){
  const busy=isFetchBusy(fetchGame),phase=fetchGame.phase;
  const messages={starting:'先站好，准备接住你的邀请。',throwing:'球飞出去了！落地后会弹跳、滚动。',bouncing:'小球弹了起来，慢慢滚向落点；它已经出发追球。',chasing:'小球停稳了，它正绕开物件追过去。',picking:'找到球了，俯下身轻轻捡起。',returning:'带着球回到刚才出发的地方。',celebrating:'把球带回来了，开心地回应你！'};
  $('#world-fetch-status').textContent=(paused&&busy?'已暂停 · ':'')+(aiming?'点击画面里的空地选择落点；Esc 或再次点按钮可取消。':messages[phase]??(fetchGame.ball?'捡回来了！可以再丢一次，或收起玩具。':'丢一颗球，让它带着小惊喜回来。'));
  $('#world-fetch-count').textContent='本次已捡回 '+fetchGame.completed+' 次';
  const waiting=hasReferenceActor()&&referenceAsset?.group.parent!==creature;
  $('#world-fetch-throw').disabled=busy||waiting;
  $('#world-fetch-aim').disabled=busy||waiting;
  $('#world-fetch-aim').textContent=aiming?'取消选择落点':'自己选落点';
  $('#world-fetch-aim').setAttribute('aria-pressed',String(aiming));
  $('#world-fetch-cancel').disabled=!busy&&!aiming&&!fetchGame.ball;
  const order=['throwing','bouncing','chasing','picking','returning','celebrating'],index=order.indexOf(phase);
  for(const step of document.querySelectorAll('[data-fetch-phase]')){const position=order.indexOf(step.dataset.fetchPhase);if(position===index)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');step.classList.toggle('is-complete',index>position||phase==='ready'&&Boolean(fetchGame.ball));}
  $('#world-canvas').classList.toggle('is-aiming',aiming);updateActorActivity();
}
function clearFetchFloor(){if(!fetchFloor)return;scene?.remove(fetchFloor);disposeObject(fetchFloor);fetchFloor=null;}
function ensureFetchFloor(){
  if(!scene||state.scene!=='gallery'||layoutForScene(state).length||hasReferenceActor()){clearFetchFloor();return;}
  if(!fetchFloor){fetchFloor=softMesh(new THREE.BoxGeometry(6,.035,6),world.background);fetchFloor.name='temporary-play-floor';fetchFloor.position.y=world.floorY-.028;scene.add(fetchFloor);}
  fetchFloor.material.color.set(world.background);
}
function ensureFetchVisual(){
  if(fetchVisual||!scene)return;
  const group=new THREE.Group(),ball=new THREE.Group();
  const sphere=softMesh(new THREE.SphereGeometry(FETCH_BALL_RADIUS,28,20),'#d6917a');sphere.material.roughness=.62;ball.add(sphere);
  for(const rotation of [0,Math.PI/2]){const stripe=softMesh(new THREE.TorusGeometry(FETCH_BALL_RADIUS*.995,.009,8,40),'#fff2d6');stripe.rotation.y=rotation;ball.add(stripe);}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.2,32),new THREE.MeshBasicMaterial({color:'#344239',transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.22,.255,48),new THREE.MeshBasicMaterial({color:'#789675',transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.visible=false;
  group.add(ball,shadow,ring);scene.add(group);fetchVisual={group,ball,shadow,ring};
}
function stopFetchPlay(){
  const active=aiming||isFetchBusy(fetchGame)||Boolean(fetchGame.ball);aiming=false;cancelFetchGame(fetchGame);
  if(fetchVisual){fetchVisual.group.visible=false;fetchVisual.ring.visible=false;}clearFetchFloor();
  if(active){actorSavedStatus=actor.status;syncFetchPlay();renderDirty=true;}return active;
}
function cancelFetchPlay(message){stopFetchPlay();captureActorPose();saveDraft();feedback(message+(actor.status==='standing'?'小伙伴会先平稳站到沙发前。':'小伙伴留在当前的位置。'));}
function fetchOrigin(){return furnished?.seats.find(seat=>seat.id===actor.seatId)?.approach??[actor.x,actor.z];}
function fetchRoutes(target){
  const origin=fetchOrigin(),obstacles=navigationObstacles(),options=navigationOptions();
  if(Math.hypot(target[0]-origin[0],target[1]-origin[1])<.65||!isWalkable(target,obstacles,options))return null;
  const outbound=planPath(origin,target,obstacles,options),inbound=planPath(target,origin,obstacles,options);
  return outbound&&inbound?{origin,target,outbound,inbound,floorY:world.floorY}:null;
}
function throwFetchBall(target=null){
  if(!renderer){feedback('场景未绘制，暂时无法一起捡球。');return false;}if(isFetchBusy(fetchGame))return false;
  if(hasReferenceActor()&&referenceAsset?.group.parent!==creature){feedback('原作星仔正在加载，加载完成后就可以一起玩球。');return false;}
  let routes=target?fetchRoutes(target):null;
  if(!target){const origin=fetchOrigin(),phase=Math.random()*Math.PI*2;
    for(let attempt=0;attempt<32&&!routes;attempt++){const angle=phase+attempt*Math.PI*(3-Math.sqrt(5)),distance=1.15+attempt%4*.25;routes=fetchRoutes([origin[0]+Math.cos(angle)*distance,origin[1]+Math.sin(angle)*distance]);}
    for(let z=-2.1;z<=2.1&&!routes;z+=.35)for(let x=-2.1;x<=2.1&&!routes;x+=.35)routes=fetchRoutes([x,z]);
  }
  if(!routes){feedback(target?'这里太近、超出地面或被物件挡住了，请换一块空地。':'暂时找不到可往返的空地，试着挪开一件家具。');return false;}
  if(!startFetchGame(fetchGame,actor,routes)){feedback('这次没能出发，请等它站好再试。');return false;}
  aiming=false;layoutMode=false;yaw=0;jumpHeight=jumpVelocity=0;petting=false;ensureFetchVisual();ensureFetchFloor();fetchVisual.group.visible=true;
  renderLayoutEditor();resume();syncFetchPlay();feedback(state.name+'收到邀请，准备一起捡球！');return true;
}
$('#world-fetch-throw').addEventListener('click',()=>throwFetchBall());
$('#world-fetch-aim').addEventListener('click',()=>{
  if(!renderer){feedback('场景未绘制，暂时无法选择丢球落点。');return;}
  if(isFetchBusy(fetchGame))return;if(aiming){stopFetchPlay();feedback('已取消选择落点。');return;}
  stopFetchPlay();captureActorPose();restoreActor();layoutMode=false;petting=false;aiming=true;ensureFetchVisual();ensureFetchFloor();fetchVisual.group.visible=true;fetchVisual.ball.visible=false;fetchVisual.shadow.visible=false;
  renderLayoutEditor();syncPlay();syncFetchPlay();$('#world-canvas').focus();renderDirty=true;feedback('请点击画面里的空地，选择一个丢球落点。');
});
$('#world-fetch-cancel').addEventListener('click',()=>cancelFetchPlay('玩具已收起，'));

let renderer,scene,camera,key,fill,rim,world,creature,body,coat,wardrobe,eyes=[],bounds;
let params=materialParams[state.material],yaw=0,baseY=0,jumpHeight=0,jumpVelocity=0,greetStart=-100;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,petting=false,wind=false,closeup=false,time=0,lastFrame=performance.now(),blinkAt=2.8,drag=null,frameCount=0,frameTime=0;
const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster(),impulse=new THREE.Vector3(),shadowGroup=new THREE.Group();
function surface(theta,phi){return new THREE.Vector3().fromArray(shapePoint(state.shape,theta,phi));}
function normalAt(t,p){return surface(Math.min(Math.PI-.0001,t+.001),p).sub(surface(Math.max(.0001,t-.001),p)).cross(surface(t,p+.001).sub(surface(t,p-.001))).normalize();}
function softMesh(geometry,color){return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9}));}
function placeCreature(){if(!creature||!bounds)return;baseY=(world?.floorY??-1.1)-bounds.bottom*characterScale()+.025;creature.position.set(actor.x,baseY+actor.elevation,actor.z);creature.scale.setScalar(characterScale());renderDirty=true;}
function clearCreature(){
  if(!creature)return;
  // The Spark source belongs to the shared loader. Never traverse-dispose it with our meshes.
  referenceAsset?.group.removeFromParent();
  if(coat){creature.remove(coat.mesh);coat.dispose();coat=null;}
  scene.remove(creature);disposeObject(creature);wardrobe=null;body=null;eyes=[];
}
function referenceProgress(progress){
  if(!hasReferenceActor())return;
  const percent=progress.total>0?Math.min(100,Math.round(progress.loaded/progress.total*100)):0;
  const message=progress.phase==='manifest'?'正在读取本地原作资产…':progress.phase==='ready'?'原作资产已解码，正在加入小世界…':`正在加载本地卷绒星仔 ${percent}% · ${progress.chunksLoaded}/${progress.chunksTotal} 块`;
  referenceView?.status(message,{ready:false});$('#world-activity').textContent=message;
}
function setReferenceProxy(nextBounds){
  bounds=nextBounds;
  if(body){creature.remove(body);disposeObject(body);}
  // A non-rendering volume supplies reliable hit testing, while Spark supplies all visible pixels.
  body=new THREE.Mesh(new THREE.BoxGeometry(bounds.width,bounds.top-bounds.bottom,bounds.depth),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
  body.name='reference-plush-touch-volume';body.position.y=(bounds.top+bounds.bottom)/2;creature.add(body);placeCreature();
}
async function attachReferenceCreature(generation){
  try{
    if(!referenceLoad)referenceLoad=ensureReferencePlush({renderer,scene,onProgress:referenceProgress,onDirty:()=>{renderDirty=true;}}).then(asset=>{referenceAsset=asset;asset.group.removeFromParent();return asset;}).catch(error=>{referenceLoad=null;throw error;});
    const asset=await referenceLoad;
    if(generation!==creatureGeneration||!hasReferenceActor())return;
    const size=asset.bounds.getSize(new THREE.Vector3()),normalized=2.2/size.y;
    setReferenceProxy({top:1.1,bottom:-1.1,width:size.x*normalized,depth:size.z*normalized});
    creature.add(asset.group);asset.group.visible=true;
    if(state.actorTint)asset.setTint(state.actorTint);else asset.resetTint();
    asset.setFur(state.actorFur);
    renderDirty=true;syncPlay();updateActorActivity();
    referenceView?.status('本地原作已加入小世界 · 全量 3,493,379 高斯点 / SH3 · 点击空地行走，轻触星仔弹跳。',{ready:true});
    feedback('原作星仔已来到这个小世界，可以行走、坐沙发和一起捡球。');
  }catch(error){
    if(generation!==creatureGeneration||!hasReferenceActor())return;
    const message='原作加载失败：'+error.message+' 切回自由创作角色可继续原来的作品。';
    referenceView?.status(message,{ready:false});feedback(message);$('#world-activity').textContent='原作资产未能加载';syncPlay();
  }
}
function buildCreature(){
  clearCreature();const generation=++creatureGeneration;
  creature=new THREE.Group();scene.add(creature);eyes=[];yaw=0;jumpHeight=jumpVelocity=0;impulse.set(0,0,0);greetStart=-100;drag=null;
  if(hasReferenceActor()){
    creature.name='world-reference-actor';petting=false;wind=false;
    setReferenceProxy({top:1.1,bottom:-1.1,width:2.2,depth:1.5});
    referenceView?.status('正在加载本地卷绒星仔…',{ready:false});void attachReferenceCreature(generation);return;
  }
  creature.name='world-procedural-actor';referenceSpinning=false;
  const geometry=new THREE.SphereGeometry(1,64,48),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){const point=new THREE.Vector3().fromBufferAttribute(positions,i);const value=surface(Math.acos(THREE.MathUtils.clamp(point.y,-1,1)),Math.atan2(point.x,point.z));positions.setXYZ(i,value.x,value.y,value.z);}geometry.computeVertexNormals();geometry.computeBoundingBox();
  const box=geometry.boundingBox;bounds={top:box.max.y,bottom:box.min.y,width:box.max.x-box.min.x,depth:box.max.z-box.min.z};
  body=softMesh(geometry,new THREE.Color(state.furColor).multiplyScalar(.9));creature.add(body);params={...materialParams[state.material]};coat=new FurCoat(surface,normalAt,state.furColor,params);creature.add(coat.mesh);coat.setLighting(key,fill,rim);coat.setViewport(renderer.domElement.width,renderer.domElement.height);
  // Front-facing features use the actual surface depth for each body shape.
  const eyeY=.24,theta=Math.acos(eyeY/(state.shape==='triangle'?1.17:state.shape==='egg'?1.15:1));
  for(const sign of [-1,1]){const eye=new THREE.Group();const point=surface(theta,sign*.3);eye.position.set(sign*.3,eyeY,point.z+.12);const pupil=softMesh(new THREE.SphereGeometry(1,24,16),'#28322d');pupil.scale.set(.085,.12,.055);pupil.material.roughness=.18;eye.add(pupil);const glint=softMesh(new THREE.SphereGeometry(1,12,8),'#ffffff');glint.position.set(-.018,.035,.047);glint.scale.set(.018,.023,.008);pupil.add(glint);creature.add(eye);eyes.push({group:eye,pupil});}
  const smile=softMesh(new THREE.TorusGeometry(.065,.011,8,24,Math.PI),'#5e6356');smile.rotation.z=Math.PI;smile.scale.y=.65;smile.position.set(0,-.035,surface(Math.PI*.52,0).z+.1);creature.add(smile);
  for(const sign of [-1,1]){const cheek=softMesh(new THREE.SphereGeometry(1,16,12),'#dea899');cheek.position.set(sign*.47,.015,surface(Math.PI*.495,sign*.48).z+.09);cheek.scale.set(.09,.035,.012);creature.add(cheek);}
  buildClothes();placeCreature();
}
function buildClothes(){if(!creature)return;if(wardrobe){creature.remove(wardrobe);disposeObject(wardrobe);wardrobe=null;}if(hasReferenceActor())return;wardrobe=buildWardrobe(state,{surface,normalAt,bounds});creature.add(wardrobe);}
function buildScene(){
  if(world){scene.remove(world.group);disposeObject(world.group);}world=buildWorldScene(state);scene.add(world.group);scene.background=new THREE.Color(world.background);$('#scene-description').textContent=world.description;
  $('#scene-interactions').replaceChildren();for(const item of world.interactables){const button=document.createElement('button');button.textContent=item.label;button.addEventListener('click',()=>interactScene(item));$('#scene-interactions').append(button);}
  buildPlacedFurniture();
  if(bounds)baseY=world.floorY-bounds.bottom*characterScale()+.025;
  if(shadowGroup.children.length){shadowGroup.position.y=world.floorY+.008;}renderDirty=true;
}
function updateLighting(){
  // Spark outputs baked splat colors directly; ACES continues to grade the lit furniture and floor.
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const settings={day:['#fffaf2','#dbe6ff',4.5,2.5],warm:['#ffe3bb','#f5d8c9',4.3,2],moon:['#c3d8ff','#c6b7ee',3.3,2.4]}[state.lighting];key.color.set(settings[0]);key.intensity=settings[2];rim.color.set(settings[1]);rim.intensity=settings[3];fill.intensity=2;coat?.setLighting(key,fill,rim);renderDirty=true;
}
function applyVisual(previous){if(!renderer)return;const full=previous.actorAsset!==state.actorAsset||!hasReferenceActor()&&(previous.shape!==state.shape||previous.material!==state.material);
  const sceneChanged=previous.scene!==state.scene||previous.lighting!==state.lighting||previous.seed!==state.seed||previous.accentColor!==state.accentColor||previous.secondaryColor!==state.secondaryColor;
  const layoutChanged=JSON.stringify(previous.layout)!==JSON.stringify(state.layout);
  if(full||previous.scene!==state.scene||previous.seed!==state.seed||layoutChanged||JSON.stringify(previous.pose)!==JSON.stringify(state.pose))stopFetchPlay();
  if(sceneChanged)buildScene();else if(layoutChanged||previous.actorAsset!==state.actorAsset)buildPlacedFurniture();
  if(full)buildCreature();else if(hasReferenceActor()){
    if(previous.actorTint!==state.actorTint){if(state.actorTint)referenceAsset?.setTint(state.actorTint);else referenceAsset?.resetTint();}
    if(JSON.stringify(previous.actorFur)!==JSON.stringify(state.actorFur))referenceAsset?.setFur(state.actorFur);
    if(previous.actorScale!==state.actorScale)placeCreature();
  }else {if(previous.furColor!==state.furColor){body.material.color.set(state.furColor).multiplyScalar(.9);coat.uniforms.uColor.value.set(state.furColor);}if(['hat','outfit','accessory','accentColor','secondaryColor'].some(key=>previous[key]!==state[key]))buildClothes();}
  if(previous.scene!==state.scene||previous.seed!==state.seed||layoutChanged||JSON.stringify(previous.pose)!==JSON.stringify(state.pose))restoreActor();
  updateLighting();renderDirty=true;
  if(aiming||fetchGame.ball)ensureFetchFloor();
}
function resize(){const {width,height}=$('.world-stage').getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();coat?.setViewport(renderer.domElement.width,renderer.domElement.height);renderDirty=true;}
function syncPlay(){
  for(const [id,active] of [['#world-pause',paused],['#world-pet',petting],['#world-wind',wind],['#world-view',closeup]])$(id).setAttribute('aria-pressed',String(active));
  $('#world-pause').textContent=paused?'继续动画':'暂停动画';$('#world-view').textContent=closeup?'看看全景':'走近一点';
  const reference=hasReferenceActor(),waiting=reference&&referenceAsset?.group.parent!==creature;
  $('#world-pet').textContent=reference?'轻触回应':'抚摸绒毛';$('#world-pet').title=reference?'轻触会回应和弹跳；要整理绒毛，请点「开启梳理」再拖动。':'';
  for(const selector of ['#world-jump','#world-greet','#world-pet'])$(selector).disabled=waiting;
  $('#world-wind').disabled=reference;$('#world-wind').title=reference?'原作毛绒为捕获的高斯资产，暂没有独立毛发风力变形。':'';
  referenceView?.setSpinning(referenceSpinning);syncFetchPlay();
}
function resume(){referenceBrush?.setEnabled(false);paused=false;syncPlay();renderDirty=true;}
function jump(){if(hasReferenceActor()&&referenceAsset?.group.parent!==creature){feedback('等原作星仔加载完成，再一起跳一下。');return;}stopFetchPlay();if(actor.status==='seated'||actor.status==='sitting'){moveActorTo([0,0],null,'先回到地毯，再点「跳一下」玩耍。');return;}if(actor.status!=='idle'){feedback('等小伙伴走好，再一起跳一下。');return;}resume();jumpVelocity=2.7;jumpHeight=Math.max(jumpHeight,.001);impulse.y=-.5;feedback(state.name+'跳起来了！');}
function greet(){resume();greetStart=time;feedback(state.name+'向你打招呼。');sharedActivity('hello','和'+state.name+'打了个招呼');}
function interactScene(item){resume();greetStart=time;if(item.id==='lamp'){commit({lighting:state.lighting==='warm'?'moon':'warm'},'灯光换了个时间。');}else if(item.id==='flower'||item.id==='mushroom'){jump();feedback('花园里的小惊喜，让'+state.name+'开心地跳一下。');}else {impulse.set(.5,.15,0);feedback(item.label+' · '+state.name+'好奇地看了看。');}}
$('#world-jump').addEventListener('click',jump);$('#world-greet').addEventListener('click',greet);
$('#world-pet').addEventListener('click',()=>{stopFetchPlay();petting=!petting;resume();syncPlay();feedback(petting?(hasReferenceActor()?'轻触回应已开启，点击星仔让它打招呼和弹跳。':'抚摸已开启，按住角色轻轻拖过绒毛。'):'拖动旋转角色，点击它弹跳。');});
$('#world-wind').addEventListener('click',()=>{wind=!wind;resume();syncPlay();feedback(wind?'一阵轻风吹进小世界。':'风停了，绒毛慢慢回弹。');});
function frontView(){referenceSpinning=false;yaw=actor.status==='seated'?-actor.yaw:.34-actor.yaw;pointer.set(0,0);renderDirty=true;syncPlay();feedback('已回到正面。');}
$('#world-front').addEventListener('click',frontView);
$('#world-pause').addEventListener('click',()=>{paused=!paused;syncPlay();renderDirty=true;feedback(paused?(hasReferenceActor()?'动画已暂停，仍然可以旋转和布置场景。':'动画已暂停，仍然可以换装和旋转。'):'继续陪伴。');});
$('#world-view').addEventListener('click',()=>{closeup=!closeup;syncPlay();renderDirty=true;feedback(closeup?'走近看一看毛绒与衣服。':'回到小世界全景。');});
function animate(now){requestAnimationFrame(animate);const realDt=Math.max(0,(now-lastFrame)/1000),dt=Math.min(realDt,.04);lastFrame=now;if(document.hidden||!nativeViewActive)return;if(paused&&!renderDirty)return;renderDirty=false;if(!paused)time+=dt;
  const editingFur=hasReferenceActor()&&referenceBrush?.enabled();
  stepActor(actor,paused||editingFur?0:dt);
  const phase=fetchGame.phase,completed=fetchGame.completed;stepFetchGame(fetchGame,actor,paused?0:dt);
  if(phase!==fetchGame.phase){syncFetchPlay();if(fetchGame.completed>completed){captureActorPose();saveDraft();feedback(state.name+'把球带回来了！本次已捡回 '+fetchGame.completed+' 次。');sharedActivity('play',state.name+'捡回了一颗球');}}
  if(actorSavedStatus!==actor.status){actorSavedStatus=actor.status;updateActorActivity();if(!isFetchBusy(fetchGame)&&(actor.status==='idle'||actor.status==='seated')){captureActorPose();saveDraft();feedback(actor.status==='seated'?state.name+'坐好了，座位已记住。':state.name+'走到了，位置已记住。');}}
  const scale=characterScale(),bounce=paused?{height:jumpHeight,velocity:jumpVelocity,impact:0}:stepBounce(jumpHeight,jumpVelocity,dt);jumpHeight=bounce.height;jumpVelocity=bounce.velocity;
  if(referenceSpinning&&!paused&&hasReferenceActor())yaw+=dt*.35;
  const curious=!editingFur&&state.personality==='curious',playful=!editingFur&&state.personality==='playful',greeting=editingFur?0:Math.max(0,1-(time-greetStart)/2.2)*Math.sin((time-greetStart)*9);
  const breathing=paused||editingFur?0:Math.sin(time*(playful?2.1:1.4))*.007;
  const vertical=1+breathing-actor.sitBlend*.15-fetchGame.pickBlend*.08-(bounce.impact||0)*.007,lateral=1/Math.sqrt(Math.max(.8,vertical));
  // Spark renders a uniform average scale. Match the picking matrix to that visible scale.
  const actorStretch=hasReferenceActor()?(2*lateral+vertical)/3:vertical;
  if(hasReferenceActor())creature.scale.setScalar(scale*actorStretch);else creature.scale.set(scale*lateral,scale*vertical,scale*lateral);
  creature.position.set(actor.x,baseY+actor.elevation+jumpHeight+bounds.bottom*scale*(1-actorStretch)+Math.abs(actor.gait)*.035+fetchGame.celebrateBlend*.12,actor.z);
  creature.rotation.set((curious?Math.sin(time*.6)*.035:0)-actor.sitBlend*.035+fetchGame.pickBlend*.45,actor.yaw+yaw+(curious?Math.sin(time*.45)*.04:0),greeting*.14+(playful?Math.sin(time*2)*.025:0)+actor.gait*.025+fetchGame.celebrateBlend*Math.sin(time*12)*.08);
  if(fetchVisual&&fetchGame.ball){const ball=fetchGame.ball,height=Math.max(0,ball.y-world.floorY-FETCH_BALL_RADIUS);fetchVisual.group.visible=true;fetchVisual.ball.visible=true;fetchVisual.shadow.visible=true;fetchVisual.ball.position.set(ball.x,ball.y,ball.z);fetchVisual.ball.rotation.set(ball.rotationX,0,ball.rotationZ);fetchVisual.shadow.position.set(ball.x,world.floorY+.013,ball.z);fetchVisual.shadow.material.opacity=.18*Math.exp(-height*1.6);fetchVisual.shadow.scale.setScalar(1+height*.35);fetchVisual.ring.visible=isFetchBusy(fetchGame);if(fetchGame.target)fetchVisual.ring.position.set(fetchGame.target[0],world.floorY+.015,fetchGame.target[1]);fetchVisual.ring.material.color.set('#789675');}
  if(time>blinkAt+.18)blinkAt=time+3.1+Math.abs(Math.sin(time*1.73))*2;const blink=time>=blinkAt?Math.max(.08,Math.abs((time-blinkAt-.09)/.09)):1;
  for(const eye of eyes){eye.group.scale.y=blink;eye.pupil.position.x=pointer.x*.023;eye.pupil.position.y=pointer.y*.02;}
  impulse.multiplyScalar(Math.exp(-dt*4));coat?.update(paused?0:dt,time,params,wind?.24:0,impulse,creature.quaternion);if(!paused)world.update?.(time,dt);
  const distance=(camera.aspect<.85?8.5:7.1)*(closeup?.72:1),targetX=closeup?actor.x:0,targetZ=closeup?actor.z:0;camera.position.set(targetX+distance*.38,distance*.26,targetZ+distance*.86);camera.lookAt(targetX,.25+actor.elevation*.25,targetZ);
  shadowGroup.position.x=actor.x;shadowGroup.position.z=actor.z;
  const shadow=shadowGroup.children[0];if(shadow){shadow.material.opacity=.22*Math.exp(-(jumpHeight+actor.elevation)*1.6);shadow.scale.setScalar(1+jumpHeight*.2);}renderer.render(scene,camera);
  if(!paused){frameCount++;frameTime+=realDt;if(frameTime>1){$('#world-fps').textContent=Math.round(frameCount/frameTime)+' FPS';frameCount=0;frameTime=0;}}else $('#world-fps').textContent='已暂停';
}
try{
  renderer=new THREE.WebGLRenderer({canvas:$('#world-canvas'),antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,60);scene.add(new THREE.HemisphereLight('#fffef5','#b9c6a8',2));
  key=new THREE.DirectionalLight('#fffaf2',4.5);key.position.set(-3,5,4);scene.add(key);fill=new THREE.DirectionalLight('#ffffff',2);fill.position.set(1,0,4);scene.add(fill);rim=new THREE.DirectionalLight('#dbe6ff',2.5);rim.position.set(3,2,-2);scene.add(rim);
  const image=document.createElement('canvas');image.width=image.height=128;const ctx=image.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(58,67,44,1)');gradient.addColorStop(.3,'rgba(58,67,44,.6)');gradient.addColorStop(1,'rgba(58,67,44,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(image),transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadowGroup.add(shadow);scene.add(shadowGroup);
  buildScene();buildCreature();restoreActor();updateLighting();resize();new ResizeObserver(resize).observe($('.world-stage'));syncPlay();
  if(embeddedDraft){captureActorPose();embeddedDraft=createEmbeddedDraftSession(storage,{key:DRAFT_KEY,stored:draftSnapshot,initial:encodeWorld(state)});}
  companionReady=true;announceCompanion();requestAnimationFrame(animate);
  const canvas=$('#world-canvas');
  const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-world.floorY);
  function hitAt(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);camera.updateMatrixWorld();scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(body)[0];}
  function floorHit(){floorPlane.constant=-world.floorY;return raycaster.ray.intersectPlane(floorPlane,new THREE.Vector3());}
  function furnitureHit(bodyHit){const hit=raycaster.intersectObjects(furnished?.group.children??[],true)[0];return hit&&(!bodyHit||hit.distance<bodyHit.distance)?hit.object.userData.placedItemId??null:null;}
  canvas.addEventListener('pointerdown',event=>{
    if(!nativeViewActive)return;
    if(!event.isPrimary||event.button!==0)return;const hit=hitAt(event),itemId=furnitureHit(hit);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startYaw:yaw,moved:false,hit:Boolean(hit),point:hit?creature.worldToLocal(hit.point.clone()):null};
    if(aiming){drag.aim=true;canvas.setPointerCapture(event.pointerId);return;}
    if(layoutMode&&itemId){captureActorPose();restoreActor();selectedFurniture=itemId;renderLayoutEditor();drag.furniture=itemId;drag.before=state;drag.floorStart=floorHit();drag.original=activeFurniture();}
    canvas.setPointerCapture(event.pointerId);if(!drag.furniture&&hit&&petting&&!layoutMode){resume();if(hasReferenceActor())greet();else {coat.touch(drag.point,new THREE.Vector3(.3,.1,0),.5);feedback('轻轻抚摸，绒毛跟着指尖弯曲。');}}
  });
  canvas.addEventListener('pointermove',event=>{
    if(!nativeViewActive)return;
    const hit=hitAt(event);renderDirty=true;
    if(aiming){const point=floorHit(),blocked=hit||furnitureHit(hit)||world.interactables.some(item=>raycaster.intersectObject(item.object,true).length);fetchVisual.ring.visible=Boolean(point&&!blocked);if(point){fetchVisual.ring.position.set(point.x,world.floorY+.015,point.z);fetchVisual.ring.material.color.set(fetchRoutes([point.x,point.z])?'#789675':'#b96e61');}return;}
    if(!drag||drag.id!==event.pointerId||drag.aim)return;
    const distance=Math.hypot(event.clientX-drag.x,event.clientY-drag.y);if(distance>5)drag.moved=true;
    if(drag.furniture){const floor=floorHit();if(!floor||!drag.floorStart)return;const original=drag.original;
      const result=updateFurniture(drag.before,drag.furniture,{x:Math.round((original.x+floor.x-drag.floorStart.x)*100)/100,z:Math.round((original.z+floor.z-drag.floorStart.z)*100)/100});
      const error=result.error||(result.item&&validFurniturePosition(result.item,result.world));if(error){feedback(error);return;}state=sanitizeWorld(result.world);buildPlacedFurniture();restoreActor();renderLayoutEditor();feedback('正在摆放，松手后记为一步。');return;
    }
    if(layoutMode)return;
    if(petting&&drag.hit&&!hasReferenceActor()){if(hit){const point=creature.worldToLocal(hit.point.clone());if(drag.point)coat.touch(point,point.clone().sub(drag.point),3);drag.point=point;resume();}}else {referenceSpinning=false;yaw=drag.startYaw+(event.clientX-drag.x)*.008;}
  });
  function endPointer(event,cancel=false){
    if(!drag||drag.id!==event.pointerId)return;const current=drag;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(current.aim){if(cancel||!aiming)return;const hit=hitAt(event),point=floorHit();if(hit||furnitureHit(hit)||world.interactables.some(item=>raycaster.intersectObject(item.object,true).length)){feedback('这是角色或物件，请点击旁边的空地选择落点。');return;}if(point)throwFetchBall([point.x,point.z]);else feedback('请选择画面里的地面。');return;}
    if(current.furniture){if(cancel){state=current.before;buildPlacedFurniture();restoreActor();renderLayoutEditor();feedback('已取消这次拖动。');}else if(JSON.stringify(current.before.layout)!==JSON.stringify(state.layout)){remember(current.before);captureActorPose();sync();saveDraft();feedback('家具位置已记住，整次拖动可一步撤销。');}return;}
    if(cancel||current.moved)return;const hit=hitAt(event),itemId=furnitureHit(hit);
    if(itemId){if(layoutMode)selectFurniture(itemId);else {const item=layoutForScene(state).find(row=>row.id===itemId);if(item?.type==='sofa')sitOnFurniture(itemId);else {greet();feedback(state.name+'看了看'+label(FURNITURE,item?.type)+'。');}}return;}
    if(layoutMode)return;if(hit){if(!petting||hasReferenceActor())jump();return;}
    for(const item of world.interactables)if(raycaster.intersectObject(item.object,true).length){interactScene(item);return;}
    if(layoutForScene(state).length||fetchGame.ball||hasReferenceActor()){const point=floorHit();if(point)moveActorTo([point.x,point.z]);}
  }
  canvas.addEventListener('pointerup',event=>endPointer(event));canvas.addEventListener('pointercancel',event=>endPointer(event,true));canvas.addEventListener('lostpointercapture',event=>endPointer(event,true));canvas.addEventListener('pointerleave',()=>{if(!drag)pointer.set(0,0);if(aiming&&fetchVisual)fetchVisual.ring.visible=false;});
  canvas.addEventListener('keydown',event=>{if(!nativeViewActive)return;if(event.key==='ArrowLeft'){yaw-=.15;renderDirty=true;}else if(event.key==='ArrowRight'){yaw+=.15;renderDirty=true;}else if(event.key===' '||event.key==='Enter')jump();else return;event.preventDefault();});
}catch(error){
  companionReady=false;companionError='小世界暂时无法绘制，请重新打开小世界或使用支持 WebGL 的浏览器。';
  $('#world-error').hidden=false;$('#world-error').textContent=companionEmbed?companionError:'小世界暂时无法绘制。'+error.message;
  announceCompanion();
}
window.addEventListener('keydown',event=>{if(nativeViewActive&&event.key==='Escape'&&(aiming||isFetchBusy(fetchGame)||fetchGame.ball)){event.preventDefault();cancelFetchPlay('已取消玩球，');}});

function renderCollection(){
  const list=$('#world-collection');list.replaceChildren();$('#world-collection-count').textContent=collection.length+' / 8';$('#world-save').disabled=!collectionWritable||collection.length>=8;
  if(!collection.length){const empty=document.createElement('p');empty.className='collection-empty';empty.textContent='第一份偶遇，等你留下。保存后可以随时回来继续搭配。';list.append(empty);return;}
  collection.forEach(item=>{const identity=encodeWorld(item),card=document.createElement('div');card.className='collection-card';const icon=document.createElement('span');icon.textContent=item.shape==='bunny'?'♧':item.shape==='star'?'✦':'•ᴗ•';icon.style.background=item.furColor;const info=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=item.name;detail.textContent=label(SCENES,item.scene)+' · '+label(OUTFITS,item.outfit);info.append(name,detail);const open=document.createElement('button');open.textContent='打开';open.setAttribute('aria-label','打开作品 '+item.name);open.addEventListener('click',()=>replaceWorld(item,'已打开收藏，可以继续自由搭配。'));const remove=document.createElement('button');remove.textContent='×';remove.disabled=!collectionWritable;remove.setAttribute('aria-label','移除作品 '+item.name);remove.addEventListener('click',()=>{if(writeCollection(latest=>{const index=latest.findIndex(entry=>encodeWorld(entry)===identity);if(index<0)return null;latest.splice(index,1);return latest;}))feedback('已移除这份收藏，当前画面仍保留。');});card.append(icon,info,open,remove);list.append(card);});
}
function writeCollection(update){
  finishColorGesture();const current=readWorldCollection();collection=current.entries;collectionWritable=current.ok;collectionIssue=current.error;renderCollection();
  if(!current.ok){$('#world-storage-status').textContent=current.error;feedback(current.error);return false;}
  const next=update(current.entries.slice());if(!next){feedback('这份收藏已被另一个页面移除，作品列表已更新。');return false;}
  if(next.length>8){feedback('收藏已满 8 个，请先移除一份作品。');return false;}
  try{storage.setItem(COLLECTION_KEY,JSON.stringify(next.map(encodeWorld)));collection=next;renderCollection();$('#world-storage-status').textContent='作品收藏已保存 · 仅此浏览器';return true;}
  catch{$('#world-storage-status').textContent='收藏保存失败；已保存作品保留，可生成链接保留当前作品。';return false;}
}
$('#world-save').addEventListener('click',()=>{captureActorPose();saveDraft();if(writeCollection(latest=>[...latest,sanitizeWorld(state)]))feedback('小世界已收藏，家具和角色位置一起留下。');});
window.addEventListener('storage',event=>{
  if(event.storageArea!==storage)return;
  if(event.key===COLLECTION_KEY||event.key===null){
    const current=readWorldCollection();collection=current.entries;collectionWritable=current.ok;collectionIssue=current.error;renderCollection();
    const message=current.ok?'作品列表已与另一个页面同步，当前小世界和输入保留。':current.error;
    $('#world-storage-status').textContent=message;feedback(message);
  }
  if(embeddedDraft&&(event.key===DRAFT_KEY||event.key===null)){
    const current=embeddedDraft.inspect();
    if(current.ok&&current.conflict){draftConflict=true;$('#world-storage-status').textContent=DRAFT_CONFLICT_MESSAGE;feedback(DRAFT_CONFLICT_MESSAGE);announceCompanion();}
  }
});
window.addEventListener('pagehide',()=>{if(companionEmbed&&!companionReady)return;finishColorGesture();captureActorPose();saveDraft();});
$('#world-share').addEventListener('click',()=>{finishColorGesture();captureActorPose();saveDraft();const url=new URL(location.href);url.hash='world='+encodeWorld(state);$('#world-share-output').value=url.href;$('#world-share-box').hidden=false;feedback('小世界链接已生成，包含形象、着装、家具布置和角色位置。');});
$('#world-copy').addEventListener('click',async()=>{const output=$('#world-share-output');try{await navigator.clipboard.writeText(output.value);feedback('链接已复制。');}catch{output.focus();output.select();feedback('请复制已选中的链接。');}});
$('#world-load').addEventListener('click',()=>{const input=$('#world-import').value.trim();try{const hash=input.includes('#')?input.slice(input.indexOf('#')+1):input;const code=hash.startsWith('world=')?new URLSearchParams(hash).get('world'):hash;replaceWorld(decodeWorld(code),'已导入小世界。');}catch{feedback('小世界代码格式有误，请粘贴完整链接或 world= 后面的代码。');}});
let photoUrl=null,photoRequest=0;
function invalidatePhoto(){photoRequest++;if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}$('#world-download').hidden=true;}
function exportWorldPhoto({download=false}={}){if(!renderer){feedback('场景未绘制，暂时无法拍照。');return;}invalidatePhoto();const request=photoRequest,name=state.name;renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(request!==photoRequest)return;if(!blob){feedback('照片生成失败，请重试。');return;}photoUrl=URL.createObjectURL(blob);const link=$('#world-download');link.href=photoUrl;link.download=name.replace(/[\\/:*?"<>|]/g,'_')+'-小世界.png';link.hidden=false;if(download)link.click();feedback(download?'已导出包含本地原作与家具的场景 PNG。':'场景照片已准备好，点击下载 PNG 照片。');},'image/png');}
$('#world-export').addEventListener('click',()=>exportWorldPhoto());
window.addEventListener('pagehide',()=>{if(photoUrl)URL.revokeObjectURL(photoUrl);});
sync();renderCollection();$('#world-storage-status').textContent=startupMessage;
if(!companionEmbed){
  referenceView=mountPlushReferenceView({
    stage:$('.world-stage'),nativeStage:$('#world-native-stage'),nativeControls:$('#world-native-controls'),
    context:'world',nativeLabel:'创作与互动',keepNativeControls:true,
    onViewChange(view){
      if(view==='native')referenceBrush?.setEnabled(false);
      nativeViewActive=true;lastFrame=performance.now();frameCount=frameTime=0;renderDirty=true;
      commit({actorAsset:view==='reference'?'reference-plush':'procedural'},view==='reference'?'正在请原作星仔来到本地小世界。':'已回到原来的自由创作角色。');
      $('#world-fps').textContent=paused?'已暂停':'— FPS';
    },
    onAction(action,value){
      if(action==='front')frontView();
      else if(action==='spin'){resume();referenceSpinning=!referenceSpinning;syncPlay();feedback(referenceSpinning?'星仔正在慢慢转身。':'星仔停下了。');}
      else if(action==='bounce')jump();
      else if(action==='png')exportWorldPhoto({download:true});
      else if(action==='tint')previewColor('actorTint',value);
      else if(action==='size')previewColor('actorScale',Number(value));
      else if(action==='fur-length'||action==='fur-curl')previewColor('actorFur',sanitizeReferenceFur({...state.actorFur,[action.slice(4)]:value}));
      else if(action==='finish')finishColorGesture();
      else if(action==='groom')referenceBrush?.setEnabled(!referenceBrush.enabled());
      else if(action==='clear-groom')commit({actorFur:{...state.actorFur,groom:[]}},'已清除梳理方向，可撤销。');
      else if(action==='undo')$('#world-undo').click();
      else if(action==='redo')$('#world-redo').click();
      else if(action==='reset'){
        referenceSpinning=false;closeup=false;commit({actorTint:null,actorScale:1,actorFur:sanitizeReferenceFur()},'已恢复原作毛色、绒毛与大小，家具与位置保留。');frontView();
        if(hasReferenceActor()&&!referenceAsset&&!referenceLoad)buildCreature();
      }
    },
  });
  if(renderer&&camera)referenceBrush=createReferencePlushBrush({THREE,canvas:renderer.domElement,camera,getAsset:()=>referenceAsset,isActive:()=>hasReferenceActor(),getStyle:()=>state.actorFur,
    onStart(){finishColorGesture();stopFetchPlay();captureActorPose();referenceBrushBefore=state;referenceSpinning=false;},
    onChange(fur){state=sanitizeWorld({...state,actorFur:fur});referenceAsset?.setFur(state.actorFur);renderDirty=true;referenceView.setStyle({tint:state.actorTint??'#ffffff',size:state.actorScale,fur:state.actorFur});},
    onFinish({changed}){if(changed&&referenceBrushBefore)remember(referenceBrushBefore);referenceBrushBefore=null;sync();saveDraft();feedback(changed?'梳理方向已记住，整次拖动可一步撤销。':'请按住蓝色绒毛拖动梳理。');},
    onModeChange(enabled){referenceSpinning=false;if(enabled){stopFetchPlay();captureActorPose();restoreActor();jumpHeight=jumpVelocity=0;layoutMode=false;petting=false;syncPlay();renderDirty=true;}referenceView.setGrooming(enabled);feedback(enabled?'梳理已开启：按住蓝色绒毛拖动，关闭后继续行走。':'梳理已关闭，可继续与星仔互动。');}
  });
  window.addEventListener('pagehide',event=>{if(!event.persisted)referenceBrush?.dispose();});
  for(const selector of ['#plush-view-world-tint','#plush-view-world-size']){
    $(selector)?.addEventListener('change',finishColorGesture);$(selector)?.addEventListener('blur',finishColorGesture);
  }
  // An explicit mode link chooses an asset. Otherwise restore the asset saved with this world.
  const requested=new URLSearchParams(location.search).get('plushView');
  if(requested==='reference'||requested==='native'){
    const actorAsset=requested==='reference'?'reference-plush':'procedural';
    if(actorAsset!==state.actorAsset)commit({actorAsset},requested==='reference'?'正在加载本地原作星仔。':'已打开自由创作角色。');
  }
  sync();nativeViewActive=true;
  if(hasReferenceActor())referenceView.status(referenceAsset?.group.parent===creature?'本地原作已加入小世界 · 点击空地行走，轻触星仔弹跳。':'正在加载本地卷绒星仔…',{ready:referenceAsset?.group.parent===creature});
}
