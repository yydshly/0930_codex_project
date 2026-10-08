import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GaussianSplatMesh} from './gaussian-splat-renderer.js';
import {createPlushSplats} from './gaussian-plush.js';
import {exportGaussianPly,parseGaussianPly} from './gaussian-ply.js';
import {DEFAULT_SPLAT_CONFIG,SPLAT_CONFIG_KEY,sanitizeSplatConfig,encodeSplatConfig,decodeSplatConfig} from './splat-config.js';
import {initProjectJournal} from './project-journal.js';
import {mountPlushReferenceView} from './plush-reference-view.js';
import {ensureReferencePlush} from './reference-plush-asset.js';
import {sanitizeReferenceFur} from './reference-plush-fur.js';
import {createReferencePlushBrush} from './reference-plush-brush.js';
import {createEditHistory} from './edit-history.js';

const $=selector=>document.querySelector(selector);
const canvas=$('#splat-canvas'),stage=$('.splat-stage'),errorBox=$('#splat-error');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let config={...DEFAULT_SPLAT_CONFIG},dataset=null,mesh=null,renderer=null,controls=null;
let imported=false,dirty=true,spinning=false,bounceStart=null,frame=0,disposed=false;
let closeup=false;
let generateTimer=0,generation=0,importRequest=0,downloadUrls=new Set();
let down=null,applyView=()=>{},applyReferenceAction=()=>{};
let nativeLoadError=null;
let referenceAsset=null,referencePromise=null,referenceSize=1,referenceTint='#ffffff',importedName=null;
let referenceFur=sanitizeReferenceFur(),referenceBrush=null;
const referenceStyleKey='plush-reference-splat-v1',referenceHistory=createEditHistory(24),referenceStyle=()=>({tint:referenceTint,size:referenceSize,fur:referenceFur}),referenceSnapshot=()=>({snapshot:JSON.stringify(referenceStyle())});
try{const saved=JSON.parse(localStorage.getItem(referenceStyleKey)||'null');if(/^#[0-9a-f]{6}$/i.test(saved?.tint))referenceTint=saved.tint;if(Number.isFinite(saved?.size))referenceSize=THREE.MathUtils.clamp(saved.size,.65,1.35);referenceFur=sanitizeReferenceFur(saved?.fur);}catch{}
function feedback(message){$('#splat-feedback').textContent=message;}
function showError(message){errorBox.textContent=message;errorBox.hidden=false;}
function clearError(){errorBox.hidden=true;errorBox.textContent='';}
function controlsFromConfig(selected=config){
  document.querySelectorAll('[name=shape]').forEach(input=>{input.checked=input.value===selected.shape;});
  $('#splat-color').value=selected.color;$('#splat-softness').value=Math.round(selected.softness*100);
  $('#splat-softness-value').textContent=`${Math.round(selected.softness*100)}%`;
  $('#splat-hat').checked=selected.hat;$('#splat-quality').value=String(selected.count);$('#splat-seed').value=selected.seed;
  document.querySelectorAll('[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===selected.color)));
}
function readControls(){return sanitizeSplatConfig({version:1,seed:$('#splat-seed').value,shape:document.querySelector('[name=shape]:checked').value,color:$('#splat-color').value,softness:Number($('#splat-softness').value)/100,count:Number($('#splat-quality').value),hat:$('#splat-hat').checked});}
function download(bytes,type,name){
  const url=URL.createObjectURL(new Blob([bytes],{type}));downloadUrls.add(url);
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>{URL.revokeObjectURL(url);downloadUrls.delete(url);},10000);
}
function slug(){return config.seed.replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,36)||'plush';}
function setProceduralButtons(enabled){for(const id of ['splat-save','splat-share'])$( `#${id}`).disabled=!enabled;}

try{
  const saved=localStorage.getItem(SPLAT_CONFIG_KEY);
  if(saved)config=sanitizeSplatConfig(JSON.parse(saved));
  else if(innerWidth<=700)config.count=32000;
}catch{ $('#splat-save-status').textContent='本机搭配无法读取，先显示默认样例；点击“记住”后才会保存新搭配。';}
if(location.hash.startsWith('#splat=')){
  try{config=decodeSplatConfig(location.hash.slice(7));$('#splat-save-status').textContent='已打开链接中的搭配，尚未保存到本机。';}
  catch(error){feedback(error.message);$('#splat-save-status').textContent='链接无效，保留本机搭配并显示；已有作品未改变。';}
}
controlsFromConfig();initProjectJournal();
const referenceView=mountPlushReferenceView({
  stage,nativeStage:$('.plush-native-stage'),nativeControls:$('.plush-native-controls'),
  nativeExtras:[$('#splat-native-footer')],context:'splat',nativeLabel:'高斯创作',
  onViewChange:view=>applyView(view),
  onAction:(action,value)=>applyReferenceAction(action,value)
});
const isReference=()=>referenceView.view()==='reference';
referenceView.setStyle(referenceStyle());
$('#splat-original-open').addEventListener('click',()=>referenceView.select('reference'));
$('#splat-research-open').addEventListener('click',event=>{
  event.preventDefault();$('#project-journal-open').click();
  const source=$('#journal-source');source.value='builtin';source.dispatchEvent(new Event('change',{bubbles:true}));
  const query=$('#journal-query');query.value='高斯';query.dispatchEvent(new Event('input',{bubbles:true}));
  $('#journal-tab-principles').click();
});

try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,0.05,100);
  function backdrop(colors){
    const tile=document.createElement('canvas');tile.width=256;tile.height=256;
    const context=tile.getContext('2d'),gradient=context.createRadialGradient(128,102,10,128,102,180);
    gradient.addColorStop(0,colors[0]);gradient.addColorStop(.67,colors[1]);gradient.addColorStop(1,colors[2]);
    context.fillStyle=gradient;context.fillRect(0,0,256,256);
    const texture=new THREE.CanvasTexture(tile);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  const dayBackdrop=backdrop(['#fffdf6','#f4f1e7','#e9e9df']),nightBackdrop=backdrop(['#292929','#222222','#191919']);
  scene.background=$('#splat-night').checked?nightBackdrop:dayBackdrop;
  // Composite splats in linear color, then encode the complete image once.
  const target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType});
  const composer=new EffectComposer(renderer,target),renderPass=new RenderPass(scene,camera),outputPass=new OutputPass();
  composer.addPass(renderPass);composer.addPass(outputPass);
  const actor=new THREE.Group();scene.add(actor);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.1;
  controls.enabled=referenceView.canInteract();
  controls.enablePan=false;controls.minDistance=3.4;controls.maxDistance=18;controls.minPolarAngle=.28;controls.maxPolarAngle=Math.PI-.28;
  controls.addEventListener('change',()=>{dirty=true;});
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(42,52,39,.22)');gradient.addColorStop(.45,'rgba(42,52,39,.1)');gradient.addColorStop(1,'rgba(42,52,39,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);shadowTexture.colorSpace=THREE.SRGBColorSpace;
  const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:$('#splat-night').checked?.25:.75});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.7),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.36;scene.add(shadow);
  const bufferSize=new THREE.Vector2();
  let fitted=false,viewportWidth=0,viewportHeight=0;
  function fitView(reset=false){
    if(!referenceView.canInteract())return;
    const rect=stage.getBoundingClientRect(),intro=$('.splat-intro').getBoundingClientRect(),caption=$('.splat-caption').getBoundingClientRect();
    const top=closeup?rect.height*.05:intro.bottom-rect.top+22,bottom=closeup?rect.height*.93:caption.top-rect.top-22,availableHeight=Math.max(180,bottom-top),availableWidth=rect.width*(closeup?.86:.83);
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5);
    const distance=Math.max(closeup?4.2:6.4,rect.height*2.7/(2*tangent*Math.min(availableWidth,availableHeight)));
    const pixelsPerUnit=rect.height/(2*tangent*distance),targetY=((top+bottom)*.5-rect.height*.5)/pixelsPerUnit;
    const direction=reset||!fitted?new THREE.Vector3(0,.005,1):camera.position.clone().sub(controls.target).normalize();
    fitted=true;
    controls.target.set(0,targetY,0);camera.position.copy(controls.target).add(direction.multiplyScalar(distance));controls.update();dirty=true;
  }
  function resize(){if(!referenceView.canInteract())return;const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;viewportWidth=rect.width;viewportHeight=rect.height;renderer.setSize(rect.width,rect.height,false);composer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();fitView();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  function setCloseup(enabled){closeup=enabled;stage.classList.toggle('closeup',enabled);$('#splat-closeup').setAttribute('aria-pressed',String(enabled));$('#splat-closeup').textContent=enabled?'回到完整角色':'靠近看毛绒';}
  function front(){setCloseup(false);fitView(true);}
  front();resize();
  const intro=$('.splat-intro'),originalIntro=intro.innerHTML;
  let nativeCloseup=false;
  function updateCaption(){
    if(isReference()){
      $('#splat-name').textContent='蓝绒星仔 · Felipe';
      $('#splat-source').textContent='本地完整资产 · 3D 高斯';
      $('#splat-stats').textContent=referenceAsset?`${referenceAsset.count.toLocaleString('zh-CN')} 个高斯 · 拖动环绕 / 滚轮缩放`:'正在载入完整毛绒角色…';
    }else{
      const names={star:'蓝莓星仔',cloud:'软软云团',orb:'圆圆团子'};
      $('#splat-name').textContent=importedName||names[config.shape];
      $('#splat-source').textContent=imported?'导入资产 · 3D 高斯':'程序生成 · 3D 高斯';
      $('#splat-stats').textContent=dataset?`${dataset.splats.length.toLocaleString('zh-CN')} 个高斯 · 拖动环绕 / 滚轮缩放`:'正在准备毛绒…';
    }
  }
  function resetPose(){bounceStart=null;actor.position.y=0;actor.scale.setScalar(isReference()?referenceSize:1);shadow.scale.setScalar(1);dirty=true;}
  function showSelectedAsset(){
    if(mesh)mesh.visible=!isReference();
    if(referenceAsset){referenceAsset.group.visible=isReference();referenceAsset.spark.visible=isReference();}
    updateCaption();dirty=true;
  }
  function loadReference(){
    if(referenceAsset){referenceView.status('完整角色已载入，可环绕、弹跳、调整色调和保存图片。');return Promise.resolve(referenceAsset);}
    if(referencePromise)return referencePromise;
    referenceView.status('正在载入本地完整毛绒角色…',{ready:false});
    referencePromise=ensureReferencePlush({renderer,scene,onDirty:()=>{dirty=true;},onProgress:progress=>{
      if(disposed)return;
      const {phase,loaded,total,chunksLoaded,chunksTotal}=progress;
      const percentage=total?` · ${Math.min(100,Math.round(loaded/total*100))}%`:'';
      referenceView.status(phase==='manifest'?'正在读取本地资产清单…':phase==='ready'?'正在准备完整角色显示…':`正在载入角色 ${chunksLoaded}/${chunksTotal} 块${percentage}`,{ready:false});
    }}).then(asset=>{
      if(disposed){asset.dispose();return null;}
      referenceAsset=asset;actor.add(asset.group);asset.setTint(referenceTint);asset.setFur(referenceFur);
      showSelectedAsset();resetPose();
      referenceView.status('完整角色已载入，可环绕、弹跳、调整色调和保存图片。');
      if(isReference()){clearError();fitView(true);feedback('蓝绒星仔已进入展示台。拖动旋转，点点它让它弹一下。');}
      return asset;
    }).catch(error=>{
      referenceView.status(`角色未能载入：${error.message}。可切回高斯创作，已有作品保留。`,{ready:false});
      if(isReference())showError(`毛绒角色未能载入：${error.message}。可切回高斯创作后重试。`);
      return null;
    }).finally(()=>{referencePromise=null;});
    return referencePromise;
  }
  applyView=view=>{
    if(view==='native')referenceBrush?.setEnabled(false);
    down=null;controls.enabled=!referenceBrush?.enabled();
    if(view==='reference'){
      nativeCloseup=closeup;setCloseup(false);
      intro.querySelector('h1').textContent='让蓝绒星仔，走进创作。';
      intro.querySelector('p').textContent='细密卷绒、眼睛和帽子，在同一座展台里转一转。';
      loadReference();
    }else{
      intro.innerHTML=originalIntro;setCloseup(nativeCloseup);clearError();
    }
    showSelectedAsset();resetPose();resize();fitView(true);
    if(view==='native'){
      if(nativeLoadError)feedback(nativeLoadError);
      else if(dataset&&mesh)feedback(imported?'已回到导入的高斯资产。拖动环绕，继续观察或导出。':`已回到程序生成的${$('#splat-name').textContent}。拖动旋转，或继续调整搭配。`);
    }
  };
  function display(next,{fileName=null,generatedConfig=null}={}){
    // Construct and validate the new GPU asset before disposing the previous one.
    const replacement=new GaussianSplatMesh(next);
    let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const splat of next.splats){const radius=Math.max(...splat.scale)*3;for(let i=0;i<3;i++){min[i]=Math.min(min[i],splat.position[i]-radius);max[i]=Math.max(max[i],splat.position[i]+radius);}}
    const extent=Math.max(...max.map((v,i)=>v-min[i])),scale=2.7/Math.max(.00001,extent);
    replacement.scale.setScalar(scale);replacement.position.set(...min.map((v,i)=>-(v+max[i])*.5*scale));
    if(replacement.material.uniforms.uDebug)replacement.material.uniforms.uDebug.value=$('#splat-structure').checked?1:0;
    actor.add(replacement);const previous=mesh;mesh=replacement;if(previous){actor.remove(previous);previous.dispose();}
    if(generatedConfig)config=generatedConfig;
    dataset=next;imported=Boolean(fileName);importedName=fileName;nativeLoadError=null;
    showSelectedAsset();setProceduralButtons(!imported);
    if(!isReference()){resetPose();clearError();front();}
  }
  function generate({random=false,reference=false}={}){
    const version=++generation;importRequest++;clearTimeout(generateTimer);
    let candidate;
    try{candidate=readControls();}catch(error){nativeLoadError=error.message;feedback(nativeLoadError);setProceduralButtons(Boolean(dataset)&&!imported);return;}
    if(random){const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);candidate.seed=`soft-${bytes[0].toString(36)}`;}
    controlsFromConfig(candidate);setProceduralButtons(false);if(!isReference())feedback('正在把这组灵感变成毛绒…');
    generateTimer=setTimeout(()=>{
      if(disposed||version!==generation)return;
      try{const next=createPlushSplats(candidate);display(next,{generatedConfig:candidate});if(!isReference()){if(reference){setCloseup(true);fitView(true);}feedback('新搭配已生成。拖动转一转，或点点角色让它弹一下。');}}
      catch(error){controlsFromConfig();setProceduralButtons(Boolean(dataset)&&!imported);nativeLoadError=`生成未完成：${error.message}，保留当前显示。`;feedback(nativeLoadError);}
    },30);
  }
  function queueGenerate(){clearTimeout(generateTimer);setProceduralButtons(false);$('#splat-softness-value').textContent=`${$('#splat-softness').value}%`;generateTimer=setTimeout(()=>generate(),150);}
  $('#splat-form').addEventListener('submit',event=>{event.preventDefault();generate();});
  for(const selector of ['[name=shape]','#splat-hat','#splat-quality'])document.querySelectorAll(selector).forEach(el=>el.addEventListener('change',()=>generate()));
  $('#splat-color').addEventListener('input',queueGenerate);$('#splat-softness').addEventListener('input',queueGenerate);
  document.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>{$('#splat-color').value=button.dataset.color;generate();}));
  $('#splat-random').addEventListener('click',()=>generate({random:true}));
  $('#splat-example').addEventListener('click',()=>generate());
  $('#splat-reference').addEventListener('click',()=>{
    controlsFromConfig({...DEFAULT_SPLAT_CONFIG,count:innerWidth<=700?32000:80000});
    $('#splat-night').checked=true;$('#splat-night').dispatchEvent(new Event('change'));
    generate({reference:true});
  });
  $('#splat-front').addEventListener('click',()=>{front();feedback('回到正面，可以继续环绕观察。');});
  $('#splat-closeup').addEventListener('click',()=>{setCloseup(!closeup);fitView();feedback(closeup?'靠近观察细毛和毛根明暗。仍可拖动环绕，点击“回到完整角色”退出特写。':'回到完整角色，可以继续环绕观察。');});
  function toggleSpin(){spinning=!spinning;controls.autoRotate=spinning;controls.autoRotateSpeed=1.2;$('#splat-spin').setAttribute('aria-pressed',String(spinning));$('#splat-spin').textContent=spinning?'停止转台':'转台观察';referenceView.setSpinning(spinning);dirty=true;feedback(spinning?'正在环绕展示，随时可以停止。':'转台已停止。');}
  $('#splat-spin').addEventListener('click',toggleSpin);
  function bounce(){if(!referenceView.canInteract()||(isReference()?!referenceAsset:!mesh))return;if(reducedMotion){feedback('你好，毛绒伙伴向你打个招呼。');return;}bounceStart=performance.now();dirty=true;feedback('轻轻弹一下，和你打个招呼。');}
  $('#splat-bounce').addEventListener('click',bounce);
  canvas.addEventListener('pointerdown',event=>{if(referenceView.canInteract()&&event.isPrimary)down={x:event.clientX,y:event.clientY,time:performance.now()};});
  canvas.addEventListener('pointerup',event=>{const start=down;down=null;if(!referenceView.canInteract()||!start||Math.hypot(start.x-event.clientX,start.y-event.clientY)>5||performance.now()-start.time>450)return;const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;if(x>.2&&x<.8&&y>.25&&y<.76)bounce();});
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('keydown',event=>{
    if(!referenceView.canInteract())return;
    if(event.key===' '){event.preventDefault();bounce();return;}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(event.key)){
      event.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
      if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;
      if(event.key==='ArrowUp')spherical.phi-=.12;if(event.key==='ArrowDown')spherical.phi+=.12;
      if(event.key==='+'||event.key==='=')spherical.radius*=.9;if(event.key==='-')spherical.radius*=1.1;
      spherical.phi=THREE.MathUtils.clamp(spherical.phi,.28,Math.PI-.28);spherical.radius=THREE.MathUtils.clamp(spherical.radius,3.4,18);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();dirty=true;
    }
  });
  $('#splat-structure').addEventListener('change',()=>{if(mesh?.material.uniforms.uDebug)mesh.material.uniforms.uDebug.value=$('#splat-structure').checked?1:0;dirty=true;feedback($('#splat-structure').checked?'椭圆边界显示每个三维高斯的投影，旋转可观察方向变化。':'回到柔软的毛绒外观。');});
  $('#splat-night').addEventListener('change',()=>{stage.classList.toggle('night',$('#splat-night').checked);scene.background=$('#splat-night').checked?nightBackdrop:dayBackdrop;shadowMaterial.opacity=$('#splat-night').checked?.25:.75;dirty=true;});
  $('#splat-save').addEventListener('click',()=>{try{localStorage.setItem(SPLAT_CONFIG_KEY,JSON.stringify(config));if(location.hash.startsWith('#splat=')){const url=new URL(location.href);url.hash=`splat=${encodeSplatConfig(config)}`;history.replaceState(null,'',url.href);}$('#splat-save-status').textContent='这组搭配已记住，下次回到此页会恢复。原有毛绒作品保留。';}catch{$('#splat-save-status').textContent='当前浏览器无法保存，可以复制搭配链接或导出 PLY 留存。';}});
  $('#splat-share').addEventListener('click',async()=>{
    const url=new URL(location.href);url.hash=`splat=${encodeSplatConfig(config)}`;
    try{await navigator.clipboard.writeText(url.href);$('#splat-save-status').textContent='搭配链接已复制，打开后可重现这组参数。';}
    catch{const input=$('#splat-share-fallback');input.hidden=false;input.value=url.href;input.focus();input.select();$('#splat-save-status').textContent='链接已准备好，请手动复制。';}
  });
  $('#splat-ply').addEventListener('click',()=>{if(isReference()||!referenceView.canInteract()||!dataset)return;try{download(exportGaussianPly(dataset),'application/octet-stream',`plush-${slug()}.ply`);feedback('已生成高斯 PLY 下载，可带到其他高斯编辑器继续创作。');}catch(error){feedback(`导出失败：${error.message}`);}});
  function savePng(){if(!referenceView.canInteract()||(isReference()?!referenceAsset:!mesh))return;draw();const name=isReference()?'plush-felipe.png':`plush-splat-${slug()}.png`,photo=document.createElement('canvas');photo.width=canvas.width;photo.height=canvas.height;const context=photo.getContext('2d');context.fillStyle=$('#splat-night').checked?'#222222':'#f6f4ee';context.fillRect(0,0,photo.width,photo.height);context.drawImage(canvas,0,0);photo.toBlob(blob=>{if(blob){download(blob,'image/png',name);feedback('照片已准备好下载。');}else feedback('当前浏览器无法导出图片。');},'image/png');}
  $('#splat-png').addEventListener('click',savePng);
  function applyReferenceStyle(){referenceAsset.setTint(referenceTint);referenceAsset.setFur(referenceFur);referenceView.setStyle(referenceStyle());referenceView.setHistory({undo:referenceHistory.canUndo,redo:referenceHistory.canRedo});resetPose();try{localStorage.setItem(referenceStyleKey,JSON.stringify(referenceStyle()));}catch{feedback('本机保存失败，画面仍保留。');}}
  function finishReferenceChange(){const changed=referenceHistory.commit(referenceSnapshot(),'星仔绒毛修改');referenceView.setHistory({undo:referenceHistory.canUndo,redo:referenceHistory.canRedo});return changed;}
  applyReferenceAction=(action,value)=>{
    if(!isReference()||!referenceAsset)return;
    if(action==='finish'){finishReferenceChange();return;}
    if(['tint','size','fur-length','fur-curl'].includes(action))referenceHistory.begin(referenceSnapshot());
    if(action==='front')front();
    else if(action==='spin'){referenceBrush?.setEnabled(false);toggleSpin();}
    else if(action==='bounce'){referenceBrush?.setEnabled(false);bounce();}
    else if(action==='png')savePng();
    else if(action==='tint'){referenceTint=value;applyReferenceStyle();}
    else if(action==='size'){const size=Number(value);if(Number.isFinite(size)){referenceSize=THREE.MathUtils.clamp(size,.65,1.35);applyReferenceStyle();}}
    else if(action==='fur-length'||action==='fur-curl'){referenceFur=sanitizeReferenceFur({...referenceFur,[action.slice(4)]:value});applyReferenceStyle();}
    else if(action==='groom')referenceBrush?.setEnabled(!referenceBrush.enabled());
    else if(action==='clear-groom'||action==='reset'){finishReferenceChange();referenceHistory.begin(referenceSnapshot());referenceFur=action==='reset'?sanitizeReferenceFur():{...referenceFur,groom:[]};if(action==='reset'){referenceTint='#ffffff';referenceSize=1;}applyReferenceStyle();finishReferenceChange();if(action==='reset')front();}
    else if(action==='undo'||action==='redo'){finishReferenceChange();const restored=referenceHistory[action](referenceSnapshot());if(restored){const style=JSON.parse(restored.snapshot.snapshot);referenceTint=style.tint;referenceSize=style.size;referenceFur=style.fur;applyReferenceStyle();feedback(action==='undo'?'已撤销整次修改。':'已重做整次修改。');}}
  };
  referenceBrush=createReferencePlushBrush({THREE,canvas,camera,getAsset:()=>referenceAsset,isActive:isReference,getStyle:()=>referenceFur,
    onStart(){finishReferenceChange();referenceHistory.begin(referenceSnapshot());spinning=false;controls.autoRotate=false;referenceView.setSpinning(false);resetPose();},
    onChange(fur){referenceFur=fur;applyReferenceStyle();},
    onFinish({changed}){finishReferenceChange();feedback(changed?'梳理已留下，整次拖动可一步撤销。':'请按住蓝色绒毛拖动梳理。');},
    onModeChange(enabled){if(enabled){spinning=false;controls.autoRotate=false;referenceView.setSpinning(false);resetPose();}controls.enabled=!enabled;referenceView.setGrooming(enabled);feedback(enabled?'梳理已开启，按住蓝色绒毛拖动。':'梳理已关闭，可以继续旋转观察。');}
  });
  $('#splat-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;const ticket=++importRequest;++generation;clearTimeout(generateTimer);
    setProceduralButtons(false);feedback('正在本机读取高斯资产…');
    try{if(file.size>32*1024*1024)throw new Error('文件超过 32 MiB，请先在高斯编辑器中简化。');const bytes=await file.arrayBuffer();if(disposed||ticket!==importRequest)return;const next=parseGaussianPly(bytes);display(next,{fileName:file.name.slice(0,60)});feedback(`已载入 ${file.name}。当前显示常数颜色，导出也仅保留此处支持的数据。`);}
    catch(error){if(ticket===importRequest){setProceduralButtons(Boolean(dataset)&&!imported);nativeLoadError=`导入失败：${error.message}。当前显示与旧作品保留。`;feedback(nativeLoadError);}}
    finally{event.target.value='';}
  });
  function draw(){if(disposed||!referenceView.canInteract()||(isReference()?!referenceAsset:!mesh))return;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);dirty=false;if(isReference()){renderer.render(scene,camera);}else{renderer.getDrawingBufferSize(bufferSize);mesh.update(camera,bufferSize.x,bufferSize.y);composer.render();}}
  let last=performance.now();
  function animate(now){if(disposed)return;if(!referenceView.canInteract()){last=now;frame=requestAnimationFrame(animate);return;}const dt=Math.min(.05,(now-last)/1000);last=now;controls.update(dt);
    if(bounceStart!==null){const t=Math.min(1,(now-bounceStart)/1050),height=Math.sin(Math.PI*t)*.48,squash=Math.sin(2*Math.PI*t)*.035,size=isReference()?referenceSize:1;actor.position.y=height;actor.scale.set(size*(1-squash*.5),size*(1+squash),size*(1-squash*.5));shadow.scale.setScalar(1-height*.22);dirty=true;if(t===1){resetPose();feedback('稳稳落地，继续看看它的毛簇。');}}
    if(dirty||spinning)draw();frame=requestAnimationFrame(animate);
  }
  applyView(referenceView.view());
  frame=requestAnimationFrame(animate);generate({reference:new URLSearchParams(location.search).get('view')==='reference'});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();showError('绘图上下文暂时丢失。请刷新页面恢复；保存的搭配与旧作品仍在。');});
  window.addEventListener('pageshow',()=>{dirty=true;});
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;cancelAnimationFrame(frame);clearTimeout(generateTimer);resizeObserver.disconnect();referenceBrush?.dispose();controls.dispose();referenceAsset?.dispose();mesh?.dispose();shadow.geometry.dispose();shadowMaterial.dispose();shadowTexture.dispose();dayBackdrop.dispose();nightBackdrop.dispose();renderPass.dispose();outputPass.dispose();composer.dispose();renderer.dispose();for(const url of downloadUrls)URL.revokeObjectURL(url);});
}catch(error){showError(`高斯展台未能启动：${error.message}。请使用支持 WebGL 的浏览器，原有创作入口仍可打开。`);referenceView.status(`展示台未能启动：${error.message}`,{ready:false});for(const id of ['splat-save','splat-share','splat-bounce','splat-spin','splat-front','splat-closeup','splat-reference','splat-png','splat-ply','splat-random'])$(`#${id}`).disabled=true;}
