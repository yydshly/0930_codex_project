import * as THREE from 'three';
import {EXPERIMENT_DEFAULTS,validateExperiment,experimentDuration,experimentFingerprint,trajectorySignature} from './experiment-config.js';

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const fields=[['separation','分离','#ed6a5e'],['alignment','对齐','#5293df'],['cohesion','聚集','#60bd8d'],['combined','最终方向','#e6ba45']];
const boundary='箭头显示当前已施加的转向向量；长度经缩放和截断，不代表真实牛顿力。碰撞球是算法近似；法线开关不改变鱼体形状。A/B 按同一起点、种子、场景设置与固定 1/60 秒步长重播。';

export class AlgorithmExperiment{
 constructor(c){
  this.c=c;this.parameters=validateExperiment();this.mode='current';this.baseline=null;this.current=null;
  this.results={baseline:null,current:null};this.duration=8;this.lastInvalidation=null;
  this.group=new THREE.Group();this.group.name='algorithm-experiment-overlays';this.group.userData.dynamicGeometry=true;this.group.renderOrder=100;this.group.visible=false;c.scene.add(this.group);
  const capacity=c.school.fish.length;
  this.lines=fields.map(([key,label,color])=>{
   const geometry=new THREE.BufferGeometry(),position=new THREE.BufferAttribute(new Float32Array(capacity*18),3).setUsage(THREE.DynamicDrawUsage);
   geometry.setAttribute('position',position);geometry.setDrawRange(0,0);
   const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false});
   const object=new THREE.LineSegments(geometry,material);object.name='steering-'+key;object.frustumCulled=false;this.group.add(object);return {key,label,color,object,position};
  });
  // Use batched lines rather than mesh spheres: SSAOPass excludes lines, so
  // diagnostic volumes cannot create fictitious solid-object occlusion.
  const unit=[];for(let plane=0;plane<3;plane++)for(let i=0;i<16;i++)for(const a of [i/16*Math.PI*2,(i+1)/16*Math.PI*2]){
   const cs=Math.cos(a),sn=Math.sin(a);unit.push(...(plane===0?[cs,sn,0]:plane===1?[cs,0,sn]:[0,cs,sn]));
  }
  this.unitSphereLines=new Float32Array(unit);const sphereGeometry=new THREE.BufferGeometry();
  this.spherePosition=new THREE.BufferAttribute(new Float32Array(capacity*3*unit.length),3).setUsage(THREE.DynamicDrawUsage);sphereGeometry.setAttribute('position',this.spherePosition);sphereGeometry.setDrawRange(0,0);
  const sphereMaterial=new THREE.LineBasicMaterial({color:'#e6ba45',transparent:true,opacity:.55,depthTest:false,depthWrite:false,toneMapped:false});
  this.spheres=new THREE.LineSegments(sphereGeometry,sphereMaterial);this.spheres.name='three-sphere-body-collision';this.spheres.frustumCulled=false;this.spheres.count=0;this.group.add(this.spheres);
  this._applyParameters(this.parameters);
 }
 _applyParameters(parameters){
  this.parameters=validateExperiment(parameters);
  const {separation,alignment,cohesion,collision,normalCorrection,waterDebug}=this.parameters;
  this.c.school.setExperiment?.({separation,alignment,cohesion,collision});
  for(const f of this.c.school.fish)if(f.state.uNormalCorrection)f.state.uNormalCorrection.value=normalCorrection?1:0;
  this.c.water.setDebugMode?.(waterDebug);
 }
 setParameters(patch){
  const previous=this.mode==='baseline'&&this.current?this.current.parameters:this.parameters;
  this._applyParameters(validateExperiment(patch,previous));this.mode='current';this.results.current=null;
  if(this.current)this.current.parameters=clone(this.parameters);
  this.update(0,this.c.time);return this.getState();
 }
 reset(){
  this.resetComparison();this._applyParameters(EXPERIMENT_DEFAULTS);
  if(this.c.hasDynamics!==false)this.c.resetExperimentRun?.();this.update(0,this.c.time);return this.getState();
 }
 resetComparison(reason=null){
  if(this.mode==='baseline'&&this.current)this._applyParameters(this.current.parameters);
  this.baseline=this.current=null;this.results={baseline:null,current:null};this.mode='current';this.lastInvalidation=reason;return this.getState();
 }
 _context(){return {modelSha256:this.c.importedMeta?.sha256??null,modelScale:this.c.settings.modelScale,habitat:clone(this.c.binding?.applied??null)};}
 _ensureAvailable(){if(this.c.hasDynamics===false)throw new Error('请先在导入模型中应用动态水域绑定，再运行算法对照。');}
 captureBaseline(){
  this._ensureAvailable();this.baseline={parameters:clone(this.parameters),settings:clone(this.c.settings),context:this._context(),camera:this._camera(),createdAt:new Date().toISOString()};
  this.current=null;this.results={baseline:null,current:null};this.mode='current';this.lastInvalidation=null;return this.getState();
 }
 _ensureBaseline(){
  this._ensureAvailable();if(!this.baseline)throw new Error('请先记录参考 A，再运行对照。');
  if(experimentFingerprint(this.baseline.context)!==experimentFingerprint(this._context())){
   const reason='模型、倍率或动态水域已变化，请重新记录参考 A。';this.resetComparison(reason);throw new Error(reason);
  }
 }
 compareBaseline(seconds=8){
  seconds=experimentDuration(seconds);this._ensureBaseline();
  if(this.mode!=='baseline')this.current={parameters:clone(this.parameters),savedSettings:clone(this.c.settings)};
  this.mode='baseline';this.duration=seconds;this.results.baseline=this._replay(this.baseline.parameters,seconds);return this.getState();
 }
 restoreCurrent(seconds=this.duration){
  seconds=experimentDuration(seconds);this._ensureBaseline();if(!this.current)throw new Error('请先运行参考 A；当前 B 参数会在运行 A 前保存。');
  this.mode='current';this.duration=seconds;this.results.current=this._replay(this.current.parameters,seconds);return this.getState();
 }
 _camera(){const c=this.c;return {position:c.camera.position.toArray(),quaternion:c.camera.quaternion.toArray(),target:c.controls.target.toArray(),fov:c.camera.fov};}
 _restoreCamera(camera){
  const c=this.c,controls=c.controls,damping=controls.enableDamping;c.transition=null;c.followFish=c.followAnimal=null;controls.autoRotate=false;
  // Flush residual orbit damping before restoring the recorded camera.
  controls.enableDamping=false;controls.update();c.camera.position.fromArray(camera.position);c.camera.quaternion.fromArray(camera.quaternion);controls.target.fromArray(camera.target);
  c.camera.fov=camera.fov;c.camera.updateProjectionMatrix();controls.update();controls.enableDamping=damping;
 }
 _replay(parameters,seconds){
  const c=this.c;if(typeof c.replayExperimentRun!=='function')throw new Error('当前场景没有固定步长重播接口。');
  this._applyParameters(parameters);c.updateSettings({...this.baseline.settings,autoTour:false,paused:false,sound:c.audio?.enabled??c.settings.sound});this._restoreCamera(this.baseline.camera);
  const replay=c.replayExperimentRun(seconds);this.update(0,c.time);
  let image=replay?.image;if(!image){c.renderCurrent?.();image=c.canvas.toDataURL('image/png');}
  const fish=c.school.fish.slice(0,c.settings.fishCount).map(f=>({id:f.id,position:f.group.position.toArray(),heading:f.heading,speed:f.speed,phase:f.phase.value,amp:f.amp.value}));
  return {parameters:clone(parameters),elapsed:replay?.time??c.time,step:1/60,settings:clone(this.baseline.settings),fish,positions:fish.map(f=>f.position.slice()),metrics:clone(c.school.metrics),history:clone(replay?.history??[]),signature:trajectorySignature(fish),image,viewport:[c.canvas.width,c.canvas.height]};
 }
 update(){
  if(this.baseline&&experimentFingerprint(this.baseline.context)!==experimentFingerprint(this._context()))this.resetComparison('模型、倍率或动态水域已变化，请重新记录参考 A。');
  const c=this.c,p=this.parameters,active=c.school.fish.slice(0,c.settings.fishCount);
  this.group.visible=c.hasDynamics!==false&&c.school.group.visible&&(p.overlay.vectors||p.overlay.collision);if(!this.group.visible)return;
  for(const line of this.lines){line.object.visible=p.overlay.vectors;if(!p.overlay.vectors)continue;let count=0;
   for(const f of active){const force=(f.steeringDebug||f.debugForces)?.[line.key],x=force?.x??0,z=force?.z??0,magnitude=Math.hypot(x,z);if(magnitude<1e-7)continue;
    const dx=x/magnitude,dz=z/magnitude,length=Math.min(.85,magnitude*.30),head=Math.min(.095,length*.32),ox=f.group.position.x,oy=f.group.position.y+f.group.scale.x*.17,oz=f.group.position.z,tx=ox+dx*length,tz=oz+dz*length;
    const values=[ox,oy,oz,tx,oy,tz,tx,oy,tz,tx-dx*head-dz*head*.5,oy,tz-dz*head+dx*head*.5,tx,oy,tz,tx-dx*head+dz*head*.5,oy,tz-dz*head-dx*head*.5];line.position.array.set(values,count*18);count++;
   }
   line.position.needsUpdate=true;line.object.geometry.setDrawRange(0,count*6);
  }
  this.spheres.visible=p.overlay.collision;this.spheres.material.color.set(p.collision?'#e6ba45':'#ed6a5e');let count=0;
  if(p.overlay.collision)for(const f of active)for(const b of f.debugBodies||[]){const source=this.unitSphereLines,target=this.spherePosition.array,offset=count*source.length;
   for(let i=0;i<source.length;i+=3){target[offset+i]=b.x+source[i]*b.radius;target[offset+i+1]=b.y+source[i+1]*b.radius;target[offset+i+2]=b.z+source[i+2]*b.radius;}count++;
  }
  this.spheres.count=count;this.spherePosition.needsUpdate=true;this.spheres.geometry.setDrawRange(0,count*this.unitSphereLines.length/3);
 }
 getState({includeImages=true}={}){
  const result=r=>r?{...r,parameters:clone(r.parameters),settings:clone(r.settings),fish:clone(r.fish),positions:clone(r.positions),metrics:clone(r.metrics),history:includeImages?clone(r.history??[]):null,image:includeImages?r.image:null}:null;
  const a=this.results.baseline,b=this.results.current;let difference=null;
  if(a&&b&&Math.abs(a.elapsed-b.elapsed)<1e-8&&a.positions.length===b.positions.length){
   const distances=a.positions.map((p,i)=>Math.hypot(...p.map((v,j)=>v-b.positions[i][j])));
   difference={meanPosition:distances.reduce((s,v)=>s+v,0)/Math.max(1,distances.length),maxPosition:Math.max(0,...distances),sameTrajectory:a.signature===b.signature,sameViewport:a.viewport[0]===b.viewport[0]&&a.viewport[1]===b.viewport[1]};
  }
  return {parameters:clone(this.parameters),mode:this.mode,baseline:clone(this.baseline),current:clone(this.current),results:{baseline:result(a),current:result(b)},duration:this.duration,difference,lastInvalidation:this.lastInvalidation,legend:fields.map(([key,label,color])=>({key,label,color})),boundary};
 }
 dispose(){this.group.removeFromParent();for(const line of this.lines){line.object.geometry.dispose();line.object.material.dispose();}this.spheres.geometry.dispose();this.spheres.material.dispose();}
}
