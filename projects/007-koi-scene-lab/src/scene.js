import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createMaterials, disposeObject } from './materials.js';
import { createArchitecture, createDeck, createBridge, createLantern, createLandscape, groundGeometry } from './geometry.js';
import { createVegetation } from './vegetation.js';
import { PondWater, createWaterfall } from './water.js';
import { KoiSchool } from './fish.js';
import { GardenAudio } from './audio.js';
import { GardenAnimals } from './animals.js';
import { HandInteraction } from './interaction.js';
import { DEFAULTS, VIEWS, validateSettings, isInPond } from './config.js';
import {SceneBinding} from './scene-binding.js';
import {AlgorithmExperiment} from './experiment.js';
import {pointInPolygon} from './habitat-geometry.js';
import {sphereFitDistance} from './camera-framing.js';
import {SimulationClock} from './simulation-clock.js';
import {PoseHistory,poseSnapshotSignature} from './pose-history.js';
import {frameBlend,updateOrbitControls} from './camera-time.js';
import {isRenderVisible} from './visible-picking.js';
import {bindCanvasGestures,exitCameraAutomation} from './canvas-gestures.js';
// Composer supplies physical pixels; retain the existing CSS-sized SSAO cap
// without resizing its targets to the full viewport first.
export class ViewportSSAOPass extends SSAOPass{
  constructor(scene,camera,pixelRatio){super(scene,camera,640,426);this.viewportPixelRatio=pixelRatio;}
  setSize(width,height){super.setSize(Math.min(width/this.viewportPixelRatio,720),Math.min(height/this.viewportPixelRatio,480));}
}
export class Courtyard {
  get active(){return !!this._active&&!this.contextLost;}
  set active(value){const next=!!value;if(this._active!==next)this.suspendRendering();this._active=next;}
  suspendRendering(){this.simulationClock?.suspend();this.discardNextFrame=true;this.clock?.getDelta();}
  constructor(canvas, onStatus) {
    this.canvas=canvas;this.onStatus=onStatus;this.settings={...DEFAULTS};this.simulationClock=new SimulationClock();this.poseHistory=new PoseHistory();this.active=false;this.time=0;this.fishShot='whole';this.inspectionId=0;this.clock=new THREE.Clock();
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.info.autoReset=false;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),10000)];
    this.renderer.toneMappingExposure=this.settings.exposure;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c5d2d4');this.scene.fog=new THREE.FogExp2('#c5d2d4',.011);
    this.camera=new THREE.PerspectiveCamera(51,1,.08,120);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.075;
    this.controls.minDistance=.18;this.controls.maxDistance=30;this.controls.maxPolarAngle=Math.PI*.495;
    this.controls.target.set(0,1,-1);this.setView('reference',true);
    this.hemi=new THREE.HemisphereLight('#d7edff','#8b7955',2.3);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#ffe8b9',3.1);this.sun.position.set(-10,14,10);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:1,far:55});
    this.sun.shadow.bias=-.00018;this.sun.shadow.normalBias=.008;this.scene.add(this.sun);this.sun.target.position.set(0,0,-2);this.scene.add(this.sun.target);
    const mat=this.materials=createMaterials();this.root=new THREE.Group();this.scene.add(this.root);
    this.architecture=createArchitecture(mat);batchStatics(this.architecture);this.root.add(this.architecture);
    this.deck=createDeck(mat);batchStatics(this.deck);this.root.add(this.deck);
    this.landscape=createLandscape(mat);batchStatics(this.landscape.stones);batchStatics(this.landscape.waterfallRocks);
    batchStatics(this.landscape.group);this.root.add(this.landscape.group);
    const bridge=createBridge(mat);batchStatics(bridge);this.root.add(bridge);
    const lantern=createLantern(mat);batchStatics(lantern);this.root.add(lantern);
    this.vegetation=createVegetation(mat,{get value(){return this.owner?.time||0;},owner:this});batchStatics(this.vegetation);this.root.add(this.vegetation);
    this.water=new PondWater(this.renderer,this.scene,this.camera,mat.pondFloor,this.sun);
    this.lilies=this.vegetation.getObjectByName('water-lilies');
    this.waterfall=createWaterfall();this.root.add(this.waterfall.group);
    this.school=new KoiSchool(this.scene,this.water);this.school.onStartleState=status=>this.onStatus(status);
    this.audio=new GardenAudio();this.imported=null;
    this.animals=new GardenAnimals(this.root,this.water,this.audio,mat.stone);this.interaction=new HandInteraction(this);this.binding=new SceneBinding(this);this.experiment=new AlgorithmExperiment(this);
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.ssao=new ViewportSSAOPass(this.scene,this.camera,this.renderer.getPixelRatio());this.ssao.kernelRadius=.85;this.ssao.minDistance=.001;this.ssao.maxDistance=.12;
    this.composer.addPass(this.ssao);
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.17,.45,1.2);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    bindCanvasGestures({canvas,controls:this.controls,onNavigate:()=>exitCameraAutomation(this),onTap:e=>{
      const rect=canvas.getBoundingClientRect();const pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      const ray=new THREE.Raycaster();ray.setFromCamera(pointer,this.camera);const p=new THREE.Vector3();
      if(this.binding.pick(ray.ray,this.binding.obstacleRadius||.35))return;
      if(!this.imported){const actor=this.animals.pick(ray);if(actor){const message=this.animals.activate(actor,this.time);if(message)this.onStatus({message});return;}}
      if(this.hasDynamics&&ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-this.waterLevel),p)&&(this.school.habitat?pointInPolygon(this.school.habitat.polygon,p.x,p.z):isInPond(p.x,p.z,this.settings.pondScale)))
        this.water.addRipple(p.x,p.z,this.time,.035);
    }});
    canvas.addEventListener('webglcontextlost',e=>this.handleContextLost(e));
    canvas.addEventListener('webglcontextrestored',()=>this.handleContextRestored());
    document.addEventListener('visibilitychange',()=>{this.simulationClock.suspend();this.discardNextFrame=true;this.clock.getDelta();});
    new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);
    this.frames=0;this.lastPerf=performance.now();this.avgMs=16.7;this.frameIndex=0;this.resize();this.updateSettings(this.settings);this.updateDynamics(0);
    window.__courtyard=this;this.loop();
  }
  handleContextLost(event){event.preventDefault();if(this.contextLost)return;this.contextLost=true;this.suspendRendering();this.onStatus({context:'lost',error:'显卡上下文暂时丢失，正在等待恢复；场景与投喂记录已保留。'});}
  handleContextRestored(){if(!this.contextLost)return;
    // Three has already rebuilt its GL objects before this listener runs.
    try{this.water.restoreContext();this.lastPausedShadowContent=null;this.renderer.shadowMap.needsUpdate=true;this.sun.shadow.needsUpdate=true;this.suspendRendering();this.contextLost=false;this.resize(true);
      this.onStatus({context:'restored',message:'显卡上下文已恢复，继续保留当前场景与投喂记录。'});
    }catch(error){this.contextLost=true;this.onStatus({context:'lost',error:'显卡上下文恢复未完成，请刷新页面。'});console.error(error);}
  }
  resize(force=false){if(this.contextLost)return;const w=this.canvas.parentElement.clientWidth,h=this.canvas.parentElement.clientHeight;if(w<1||h<1)return;
    const ratio=this.renderer.getPixelRatio();if(!force&&this.viewportSize?.[0]===w&&this.viewportSize[1]===h&&this.viewportSize[2]===ratio)return;
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.ssao)this.ssao.viewportPixelRatio=ratio;this.composer?.setSize(w,h);this.viewportSize=[w,h,ratio];
    if(this.followFish&&this.fishShot==='whole'){const target=this.transition?.toTarget??this.fishObservationTarget(this.followFish),position=this.transition?.to??this.camera.position,offset=position.clone().sub(this.transition?.toTarget??this.controls.target),distance=sphereFitDistance(this.followFish.group.scale.x*.74,this.transition?.fov??this.camera.fov,this.camera.aspect);if(offset.length()<distance){position.copy(target).add(offset.normalize().multiplyScalar(distance));if(!this.transition){this.controls.target.copy(target);this.controls.update();}}}}
  setView(name,instant=false){if(this.imported&&['frog','turtle','dragonfly','cat'].includes(name))name='model';if(name==='fish'){this.inspectFish();return;}if(name==='model'&&this.imported){this.fitModel();return;}this.interaction?.stop();this.followFish=null;if(this.school)this.school.inspectionFish=null;this.followAnimal=['frog','turtle','dragonfly','cat'].includes(name)?name:null;
    if(this.imported)this.followAnimal=null;
    let view=this.followAnimal?this.animals.getView(name,this.camera.aspect):VIEWS[name]||VIEWS.reference;
    if(this.imported&&this.school.habitat){const h=this.school.habitat,p=h.polygon,cx=p.reduce((v,q)=>v+q.x,0)/p.length,cz=p.reduce((v,q)=>v+q.z,0)/p.length,r=Math.max(...p.map(q=>Math.hypot(q.x-cx,q.z-cz)));
      view=name==='shoal'?{position:[cx,h.waterLevel+Math.max(3,r*1.25),cz+r*.6],target:[cx,h.waterLevel,cz],fov:48}:name==='pond'?{position:[cx,h.waterLevel+1,cz+r+1],target:[cx,h.waterLevel,cz],fov:56}:{position:[cx+r,h.waterLevel+r*1.5+1,cz+r],target:[cx,h.waterLevel,cz],fov:49};}
    this.settings.autoTour=false;this.onStatus({tour:false,view:name});
    if(instant){this.transition=null;this.camera.position.set(...view.position);this.controls.target.set(...view.target);this.camera.fov=view.fov;this.camera.updateProjectionMatrix();this.controls.update();}
    else {this.moveCamera(view);if(!this.imported&&['frog','turtle','dragonfly','cat'].includes(name))this.followAnimal=name;}
  }
  moveCamera(view){this.followAnimal=null;this.followFish=null;if(this.school)this.school.inspectionFish=null;this.transition={from:this.camera.position.clone(),to:new THREE.Vector3(...view.position),fromTarget:this.controls.target.clone(),toTarget:new THREE.Vector3(...view.target),fov:view.fov,t:0};}
  updateSettings(input){const previous=this.settings;this.settings=validateSettings({...previous,...input});const s=this.settings;
    if(previous.paused!==s.paused){this.simulationClock.suspend();this.discardNextFrame=true;}
    if(this.followFish&&this.followFish.id>=s.fishCount){this.followFish=null;this.school.inspectionFish=null;}
    this.school?.setSurfaceDetail?.(s.fishDetail);
    if(this.imported&&previous.modelScale!==s.modelScale){this.removeHabitat();this.binding.clear();this.onStatus({message:'模型倍率已改变，请重新标记水域或导入对应倍率的绑定文件',binding:true});}
    if(previous.pondScale!==s.pondScale){this.interaction?.stop();this.landscape.floor.geometry.dispose();this.landscape.floor.geometry=groundGeometry(s.pondScale);this.landscape.stones.scale.set(s.pondScale,1,s.pondScale);this.landscape.stones.position.set(.5*(s.pondScale-1),0,.15*(s.pondScale-1));}
    this.architecture.scale.y=s.houseScale;this.deck.scale.z=s.deckScale;
    this.renderer.toneMappingExposure=s.exposure;this.bloom.strength=s.weather==='dusk'?.28:.13;
    const angle=(s.hour-6)/14*Math.PI, strength=Math.max(.06,Math.sin(angle));
    this.sun.position.set(-10*Math.sin(angle),5+13*strength,8*Math.cos(angle*.65));
    const dusk=s.weather==='dusk'||s.hour>17.5;this.sun.color.set(dusk?'#ffd09a':'#fff0d1');
    this.sun.intensity=s.weather==='rain'?.75:2.4*strength+1.0;
    this.hemi.intensity=s.weather==='dusk'?.85:s.weather==='rain'?1.7:1.35;
    const bg=s.weather==='dusk'?'#767d84':s.weather==='rain'?'#9eb3b5':'#c8d8de';
    this.scene.background.set(bg);this.scene.fog.color.set(bg);this.scene.fog.density=s.weather==='rain'?.022:.01;
    this.sunDirection=new THREE.Vector3().subVectors(this.sun.position,this.sun.target.position).normalize();
    if(this.imported)this.imported.scale.setScalar(s.modelScale);
    this.water?.invalidatePasses();
    this.onStatus({settings:s});
  }
  async toggleSound(){const enabled=!this.audio.enabled;await this.audio.setEnabled(enabled);this.settings.sound=enabled;return enabled;}
  feed(){this.interaction.start('feed');}
  stroke(){this.interaction.start('stroke');}
  inspectHand(){this.interaction.start('inspect');}
  fishObservationTarget(fish){return this.fishShot==='whole'?fish.group.localToWorld(new THREE.Vector3(-.10,0,0)):this.school.mouthWorld(fish).lerp(fish.group.position,.35);}
  inspectFish(shot=this.fishShot,id=this.inspectionId){if(!this.hasDynamics)return;if(!this.settings.fishCount){this.onStatus({message:'先增加锦鲤数量，再查看近景'});return;}
    this.fishShot=shot==='detail'?'detail':'whole';this.inspectionId=THREE.MathUtils.clamp(Math.round(id)||0,0,this.settings.fishCount-1);
    this.interaction.stop();this.updateSettings({paused:false,autoTour:false});const fish=this.school.fish[this.inspectionId],p=fish.group.position,forward=new THREE.Vector3(Math.cos(fish.heading),0,-Math.sin(fish.heading)),side=new THREE.Vector3(-forward.z,0,forward.x);
    let target,camera;
    if(this.fishShot==='whole'){fish.group.updateWorldMatrix(true,false);target=this.fishObservationTarget(fish);const distance=sphereFitDistance(fish.group.scale.x*.74,45,this.camera.aspect),direction=forward.clone().multiplyScalar(.32).addScaledVector(side,.62).add(new THREE.Vector3(0,.90,0)).normalize();camera=target.clone().addScaledVector(direction,distance);}
    else{target=p.clone().addScaledVector(forward,.25);camera=p.clone().addScaledVector(forward,.55).addScaledVector(side,.34);camera.y=this.waterLevel+.41;target.y=this.waterLevel-.04;}
    this.moveCamera({position:camera.toArray(),target:target.toArray(),fov:45});this.followFish=fish;this.school.inspectionFish=fish;this.onStatus({view:'fish',message:this.fishShot==='whole'?'整鱼观察：跟随当前锦鲤，拖动看摆尾与展鳍；可切换鱼头特写或另一条鱼':'鱼头特写：拖动观察鱼嘴、眼睛和鳃；投喂可看张嘴吞食'});}
  observe(name){if(this.imported)return;this.updateSettings({paused:false,autoTour:false});this.setView(name,true);this.followAnimal=name;const message=this.animals.activate(name,this.time);if(message)this.onStatus({message});}
  screenshot(){const a=document.createElement('a');a.download='koi-courtyard-'+Date.now()+'.png';a.href=this.canvas.toDataURL('image/png');a.click();}
  async importGLB(file){
    if(!file||!file.name.toLowerCase().endsWith('.glb'))throw new Error('请选择包含模型和纹理的单文件 .glb');
    if(file.size>150*1024*1024)throw new Error('模型超过150MB，请先压缩或分块。');
    const bytes=await file.arrayBuffer();const view=new DataView(bytes);
    if(bytes.byteLength<20||view.getUint32(0,true)!==0x46546c67)throw new Error('文件不是有效GLB。');
    const jsonLen=view.getUint32(12,true);const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonLen)).trim());
    for(const item of [...json.buffers||[],...json.images||[]])if(item.uri&&!item.uri.startsWith('data:'))throw new Error('请导出内嵌纹理和缓冲区的GLB，不支持外部资源。');
    if(json.extensionsRequired?.some(e=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(e)))
      throw new Error('请先导出不使用Draco、Meshopt或KTX2压缩的标准GLB。');
    const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
    const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.length())||size.length()<.001){disposeObject(gltf.scene);throw new Error('模型没有可见几何体。');}
    let sha256;try{sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}catch(error){disposeObject(gltf.scene);throw error;}
    const wrapper=new THREE.Group();gltf.scene.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));wrapper.add(gltf.scene);
    wrapper.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
    // Commit the feeding boundary only after the candidate model is accepted.
    this.clearFeedingContext();this.removeHabitat();if(this.imported){this.scene.remove(this.imported);disposeObject(this.imported);}
    this.interaction.stop();this.followAnimal=null;this.followFish=null;this.school.inspectionFish=null;this.imported=wrapper;wrapper.scale.setScalar(this.settings.modelScale);this.scene.add(wrapper);this.root.visible=false;this.water.mesh.visible=this.water.floor.visible=this.water.wall.visible=this.school.group.visible=this.school.food.visible=false;
    this.importedMeta={name:file.name,sha256,sourceSize:size.toArray()};this.binding.clear();this.experiment.resetComparison();this.water.invalidatePasses?.();
    this.fitModel();
    this.onStatus({message:'已导入 '+file.name+' · '+size.x.toFixed(2)+' × '+size.y.toFixed(2)+' × '+size.z.toFixed(2)+' 模型单位',model:file.name});
  }
  fitModel(){if(!this.imported)return;this.interaction.stop();this.transition=null;this.followFish=this.followAnimal=null;if(this.school)this.school.inspectionFish=null;this.settings.autoTour=false;this.controls.autoRotate=false;
    this.imported.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(this.imported),sphere=box.getBoundingSphere(new THREE.Sphere());this.camera.fov=50;
    const vertical=THREE.MathUtils.degToRad(25),horizontal=Math.atan(Math.tan(vertical)*this.camera.aspect),distance=sphere.radius/Math.sin(Math.min(vertical,horizontal))*1.12;
    this.controls.enableDamping=false;this.controls.update();this.controls.target.copy(sphere.center);this.camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(.75,.62,1).normalize(),distance);this.camera.near=Math.max(.002,distance/1000);this.camera.far=Math.max(120,distance+sphere.radius*10);this.camera.updateProjectionMatrix();this.controls.maxDistance=Math.max(30,distance*4);this.controls.update();this.controls.enableDamping=true;this.onStatus({view:'model',tour:false,message:'已按当前倍率显示模型全貌'});
  }
  clearFeedingContext(){this.interaction.reset();this.school.clearFood();this.school.clearStartle?.();this.school.feedUntil=this.school.feedStart=0;for(const fish of this.school.fish)fish.targetPellet=null;if(this.school.metrics)this.school.metrics.consumed=0;}
  clearModel(){if(!this.imported)return;this.clearFeedingContext();this.removeHabitat();this.scene.remove(this.imported);disposeObject(this.imported);this.imported=null;this.importedMeta=null;this.binding.clear();this.experiment.resetComparison();
    this.camera.near=.08;this.camera.far=120;this.controls.maxDistance=30;this.root.visible=true;this.water.mesh.visible=this.water.floor.visible=this.water.wall.visible=this.school.group.visible=true;this.water.invalidatePasses?.();this.setView('reference');this.onStatus({model:null,message:'已返回按图构造的庭院'});}
  get hasDynamics(){return !this.imported||!!this.school?.habitat;}
  get waterLevel(){return this.school?.habitat?.waterLevel??.02;}
  applyHabitat(h){
    // setHabitat validates the polygon and every fish spawn before committing.
    // A rejected measurement must not interrupt the hand or move the camera.
    const habitat=this.school.setHabitat(h);
    this.interaction.stop();this.water.setHabitat(habitat);this.experiment.resetComparison();this.school.group.visible=this.water.mesh.visible=this.water.floor.visible=this.water.wall.visible=true;this.school.food.visible=false;this.updateDynamics(0);this.setView('aerial');this.updateSettings({paused:false,autoTour:false});}
  removeHabitat(){this.interaction?.stop();if(this.school?.habitat){this.school.setHabitat(null);this.water.setHabitat(null);}this.followFish=this.followAnimal=null;this.experiment?.resetComparison();if(this.imported){this.school.group.visible=this.school.food.visible=this.water.mesh.visible=this.water.floor.visible=this.water.wall.visible=false;}}
  reset(){this.interaction.reset();this.animals.reset();this.water.reset();this.clearModel();this.school.reset();this.time=0;this.simulationClock.reset();this.experiment.reset();this.updateSettings({...DEFAULTS});this.updateDynamics(0);this.setView('reference');}
  resetExperimentRun(){if(!this.hasDynamics)throw new Error('导入模型需要先应用动态水域绑定');if(this.imported)this.binding.setMode(null);else this.binding.cancelCalibration({silent:true});this.interaction.reset();this.school.reset({preserveHabitat:true,preserveExperiment:true});this.animals.reset();this.water.reset();this.time=0;this.simulationClock.reset();this.transition=null;this.followFish=this.followAnimal=null;this.controls.autoRotate=false;this.updateSettings({autoTour:false,paused:false});this.updateDynamics(0);}
  replayExperimentRun(seconds=8){if(!Number.isFinite(seconds)||seconds<1||seconds>20)throw new Error('对照时长应为1–20秒');this.resetExperimentRun();const steps=Math.round(seconds*60),history=[],snapshot=()=>({time:this.time,positions:this.school.fish.slice(0,this.settings.fishCount).map(f=>f.group.position.toArray())});history.push(snapshot());for(let i=0;i<steps;i++){this.updateDynamics(1/60);if((i+1)%15===0||i+1===steps)history.push(snapshot());}this.updateSettings({paused:true});this.renderCurrent();return {time:this.time,image:this.canvas.toDataURL('image/png'),history};}
  renderCurrent(renderDt=1/60){if(this.contextLost)return;this.renderer.info.reset();this.renderFollowTargets(renderDt);this.water.setRenderInterpolation(1);const context=this.hasDynamics?this.waterPassContext():null;if(context)this.water.renderPasses([this.school.group,this.school.food,this.experiment.group,this.binding.group],[this.waterfall.group,this.interaction.rig.root,this.experiment.group,this.binding.group],this.frameIndex,'explicit',context);this.composer.render();this.syncPausedShadows(context);}
  poseNodes(){const a=this.animals,h=this.interaction;return [...this.school.fish.map(f=>f.group),...this.school.food.children,this.school.food,h.rig.root,...h.rig.bones,h.grain,...h.grain.children,...this.lilies.children,...a.pads,a.frog.root,a.frog.body,...a.frog.eyes,a.turtle.root,a.turtle.head,...a.turtle.limbs.map(l=>l.pivot),...a.dragonflies.flatMap(d=>[d.root,...d.wings.map(w=>w.pivot)]),...(a.cat?.poseNodes?.()??[])];}
  poseUniforms(){return [this.water.material.uniforms.time,this.interaction.rig.material.userData.wet,...this.school.fish.flatMap(f=>['uMouth','uGill','uPhase','uAmp','uBend','uSpread','uFold'].map(key=>f.state[key])),...(this.animals.cat?.poseUniforms?.()??[])];}
  recordPose(reset=false){this.poseHistory.record(this.poseNodes(),this.poseUniforms(),this.time,reset);}
  waterPassContext(){if(!this.settings.paused)return {paused:false};
    // The live scene catches parent/visibility changes and scalar material inputs
    // outside pose interpolation (normal correction, loaded textures and lights).
    // Buffer upload versions are deliberately omitted: dt=0 rewrites waterfalls.
    const state=scenePassState(this.scene,[this.water.mesh,this.experiment.group,this.binding.group]);
    const fish=this.school.fish.map(f=>Object.keys(f.state).sort().map(key=>[key,passValue(f.state[key]?.value)]));
    return {paused:true,content:poseSnapshotSignature(this.poseHistory.current,[state,fish,this.waterfall.time,materialPassState(this.water.material,waterDerivedUniforms),this.renderer.toneMapping,this.renderer.toneMappingExposure])};
  }
  syncPausedShadows(context){if(!context?.paused){this.lastPausedShadowContent=null;return;}
    // Water passes reuse the preceding main-render shadow map. After a new frozen
    // pose/light state, capture once more with the map the composer just updated.
    if(this.renderer.shadowMap.enabled&&context.content!==this.lastPausedShadowContent){this.lastPausedShadowContent=context.content;this.water.invalidatePasses();}
  }
  advanceFrame(seconds,{allowInactive=false}={}){if(this.contextLost)return this.simulationClock.suspend();const enabled=!this.settings.paused&&(allowInactive||(this.active&&!document.hidden));const result=this.simulationClock.advance(seconds,dt=>this.updateDynamics(dt),{enabled});if(!enabled||(!this.poseHistory.current))this.updateDynamics(0);return result;}
  updateDynamics(dt){this.time+=dt;if(!this.hasDynamics){this.experiment.update(dt,this.time);this.recordPose(dt===0);return;}this.water.update(this.time,this.settings,this.sunDirection,this.sun.color,dt);this.interaction.update(dt,this.time);this.school.update(dt,this.time,this.settings);if(!this.imported){this.updateLilies();this.animals.update(dt,this.time,this.settings);this.waterfall.update(this.time);}
    this.water.mesh.visible=true;this.experiment.update(dt,this.time);this.recordPose(dt===0);}
  updateLilies(){const up=new THREE.Vector3(0,1,0),s=this.settings.pondScale;
    for(const pad of this.lilies.children){const a=pad.userData.anchor,p=this.water.sampleAtRest((a.x+.5)*s-.5,(a.z+.15)*s-.15,this.time);pad.position.set(p.x,p.y+.006,p.z);pad.quaternion.setFromUnitVectors(up,new THREE.Vector3(...p.normal)).multiply(new THREE.Quaternion().setFromAxisAngle(up,pad.userData.yaw));}}
  renderInterpolated(alpha,renderDt=1/60){if(this.contextLost)return;this.renderer.info.reset();try{return this.poseHistory.withInterpolated(alpha,time=>{this.lastRenderedTime=time;this.water.setRenderInterpolation(alpha);this.renderFollowTargets(renderDt);
      let context=null;if(this.hasDynamics){context=this.waterPassContext();const reason=this.water.passDecision(this.frameIndex,context);if(reason!=='reuse')this.water.renderPasses([this.school.group,this.school.food,this.experiment.group,this.binding.group],[this.waterfall.group,this.interaction.rig.root,this.experiment.group,this.binding.group],this.frameIndex,reason,context);}this.composer.render();this.syncPausedShadows(context);});
    }finally{this.water.setRenderInterpolation(1);this.scene.updateMatrixWorld(true);this.interaction.rig.mesh.skeleton.update();this.animals.cat?.updateSkeletons?.();}}
  renderFollowTargets(renderDt=1/60){if(this.imported||!isRenderVisible(this.root))this.followAnimal=null;
    if(this.followFish&&!this.transition){const fish=this.followFish;if(!isRenderVisible(fish.group)){this.followFish=null;this.school.inspectionFish=null;}else{
      fish.group.updateWorldMatrix(true,false);const target=this.fishObservationTarget(fish),delta=target.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(target);this.lastRenderedFishTarget=target.clone();}}
    if(this.followAnimal&&!this.transition){const view=this.animals.getView(this.followAnimal,this.camera.aspect),blend=frameBlend(renderDt);this.camera.position.lerp(new THREE.Vector3(...view.position),blend);this.controls.target.lerp(new THREE.Vector3(...view.target),blend);}
    updateOrbitControls(this.controls,renderDt);}
  loop(){requestAnimationFrame(()=>this.loop());const raw=this.clock.getDelta();
    if(!this.active||document.hidden){this.simulationClock.suspend();this.discardNextFrame=true;return;}const elapsed=this.discardNextFrame?0:raw;this.discardNextFrame=false;const dt=Math.min(elapsed,.1);
    if(this.transition){const t=this.transition; t.t=Math.min(1,t.t+dt/1.35);const k=t.t*t.t*(3-2*t.t);
      this.camera.position.lerpVectors(t.from,t.to,k);this.controls.target.lerpVectors(t.fromTarget,t.toTarget,k);
      this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,t.fov,frameBlend(elapsed,.1));this.camera.updateProjectionMatrix();if(t.t>=1)this.transition=null;}
    if(this.settings.autoTour){const a=performance.now()*.00006;this.camera.position.set(Math.sin(a)*7.3,3.1+Math.sin(a*.7)*.5,Math.cos(a)*4.3+5.5);this.controls.target.set(0,1,-1.1);}
    const tick=this.advanceFrame(elapsed);this.renderInterpolated(this.settings.paused?1:tick.alpha,elapsed);this.frameIndex++;this.frames++;
    const now=performance.now();this.avgMs=THREE.MathUtils.lerp(this.avgMs,raw*1000,.08);
    if(now-this.lastPerf>1000){const fps=this.frames*1000/(now-this.lastPerf);this.onStatus({fps,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles});this.frames=0;this.lastPerf=now;}
  }
}
const waterDerivedUniforms=new Set(['reflection','refraction','refractionDepth','textureMatrix','inverseProjection','cameraWorld','resolution']);
function passValue(value){if(value==null||['number','boolean','string'].includes(typeof value))return value??null;
  if(value.isTexture)return [value.id,value.version,value.source?.version,value.wrapS,value.wrapT,value.minFilter,value.magFilter,value.anisotropy,value.colorSpace,value.flipY,value.offset.toArray(),value.repeat.toArray(),value.center.toArray(),value.rotation];
  if(Array.isArray(value))return value.map(passValue);if(typeof value.toArray==='function')return value.toArray();return null;
}
function materialPassState(material,ignoredUniforms=new Set()){if(Array.isArray(material))return material.map(m=>materialPassState(m,ignoredUniforms));if(!material)return null;
  // Three increments Material.version twice whenever a transparent DoubleSide
  // material is drawn in two passes. Compare semantic inputs, not compile/upload
  // bookkeeping; texture/source versions still identify genuinely new images.
  const values=Object.keys(material).sort().filter(key=>!['uniforms','userData','version','uniformsNeedUpdate'].includes(key)&&typeof material[key]!=='function').map(key=>[key,['defines','extensions','defaultAttributeValues'].includes(key)?Object.keys(material[key]).sort().map(name=>[name,passValue(material[key][name])]):passValue(material[key])]);
  const uniforms=Object.keys(material.uniforms??{}).sort().filter(key=>!ignoredUniforms.has(key)).map(key=>[key,passValue(material.uniforms[key].value)]);
  return [material.id,values,uniforms];
}
function scenePassState(scene,excluded){scene.updateMatrixWorld(true);const objects=[],materials=new Map();
  const visit=object=>{if(excluded.includes(object))return;const list=Array.isArray(object.material)?object.material:object.material?[object.material]:[];for(const material of list)if(!materials.has(material.id))materials.set(material.id,materialPassState(material));
    objects.push([object.id,object.parent?.id,object.visible,object.matrixWorld.toArray(),object.geometry?.id,list.map(m=>m.id),object.count,object.morphTargetInfluences,object.isLight?[passValue(object.color),passValue(object.groundColor),object.intensity,object.distance,object.decay,object.angle,object.penumbra]:null]);object.children.forEach(visit);};visit(scene);
  return [objects,[...materials.values()],passValue(scene.background),scene.fog?[passValue(scene.fog.color),scene.fog.density,scene.fog.near,scene.fog.far]:null];
}
function batchStatics(group) {
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(), batches=new Map(), originals=[];
  group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.dynamicGeometry||Array.isArray(o.material))return;
    if(o!==group&&hasInstancedAncestor(o,group))return;
    let geo=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(geo.index)geo=geo.toNonIndexed();
    for(const key of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(key))geo.deleteAttribute(key);
    if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
    const arr=batches.get(o.material)||[];arr.push(geo);batches.set(o.material,arr);originals.push(o);
  });
  originals.forEach(o=>o.parent.remove(o));
  for(const [mat,geos]of batches){const geo=mergeGeometries(geos);if(!geo)throw new Error('静态几何合并失败');
    const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;group.add(m);geos.forEach(g=>g.dispose());}
  group.userData.staticBatch=true;
}
function hasInstancedAncestor(o,root){for(let p=o.parent;p&&p!==root;p=p.parent)if(p.isInstancedMesh||p.userData.dynamicGeometry||p.userData.staticBatch)return true;return false;}
