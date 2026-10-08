import * as THREE from 'three';
import {validateHabitat,pointInPolygon,signedPolygonDistance} from './habitat-geometry.js';
import {createCalibration,validateCalibration,modelDistance,modelPoint} from './model-calibration.js';
const visibleCalibrationMaterial=material=>!!material&&material.visible!==false&&(!material.transparent||material.opacity>0);
// Mesh.raycast can return triangles whose individual material is hidden. For a
// grouped mesh, visibility must be checked using the hit face's material index.
const visibleCalibrationHit=hit=>visibleCalibrationMaterial(Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material);
const emptyCalibration=()=>({points:[],record:null,pending:false,backup:null});

export class SceneBinding {
 constructor(owner){this.owner=owner;this.group=new THREE.Group();this.group.name='scene-binding-markers';owner.scene.add(this.group);this.clear();}
 clear({preserveCalibration=false}={}){this.mode=null;this.applied=null;this.markersVisible??=true;this.draft={polygon:[],waterLevel:0,depth:.65,feedPoint:null,obstacles:[]};this.calibration=preserveCalibration?this.verifiedCalibration(this.calibration?.record):emptyCalibration();this.redraw();}
 setMode(mode){if(!this.owner.imported)throw new Error('先导入 GLB 或加载程序示例');if(mode!==null&&!['outline','feed','obstacle'].includes(mode))throw new Error('无效标记模式');this.owner.interaction.stop();if(this.calibration.pending)this.cancelCalibration({silent:true});this.mode=this.mode===mode?null:mode;this.redraw();this.owner.onStatus({binding:true});}
 showMarkers(value){this.markersVisible=!!value;this.redraw();this.owner.onStatus({binding:true});}
 verifiedCalibration(record){if(!this.owner.imported||!record)return emptyCalibration();try{const verified=validateCalibration(record,this.owner.importedMeta,{modelScale:this.owner.settings.modelScale});this.assertCalibrationSurfaces(verified);return {points:structuredClone(verified.points),record:verified,pending:false,backup:null};}catch{return emptyCalibration();}}
 beginCalibration(){if(!this.owner.imported)throw new Error('先导入 GLB 或加载程序示例');this.owner.interaction.stop();this.owner.followAnimal=this.owner.followFish=null;this.owner.transition=null;this.owner.settings.autoTour=false;const previous=this.calibration.pending?this.calibration.backup:this.verifiedCalibration(this.calibration.record);this.calibration={points:[],record:structuredClone(previous?.record??null),pending:true,backup:structuredClone(previous??emptyCalibration())};this.mode='calibration';this.redraw();this.owner.onStatus({binding:true,message:'尺度校准：依次点击模型表面的两个已知距离端点；取消可保留原校准'});}
 cancelCalibration({silent=false}={}){if(!this.calibration.pending)return false;this.calibration=this.verifiedCalibration(this.calibration.backup?.record);if(this.mode==='calibration')this.mode=null;if(!silent){this.redraw();this.owner.onStatus({binding:true,message:this.calibration.record?'已取消本次校准，恢复原校准与端点':'已取消本次校准，当前模型倍率保留'});}return true;}
 clearCalibration(){this.calibration=emptyCalibration();if(this.mode==='calibration')this.mode=null;this.redraw();this.owner.onStatus({binding:true,message:'已清除校准点与记录，当前模型倍率保留'});}
 calibrationMeshes(){const imported=this.owner.imported;if(!imported)return [];imported.updateWorldMatrix(true,true);const meshes=[];
  imported.traverseVisible(object=>{if(object.isMesh){const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(visibleCalibrationMaterial))meshes.push(object);}});
  return meshes;
 }
 assertCalibrationSurfaces(candidate){const imported=this.owner.imported,meshes=this.calibrationMeshes(),diagonal=Math.hypot(...this.owner.importedMeta.sourceSize)*this.owner.settings.modelScale,tolerance=Math.max(1e-7,diagonal*1e-6),axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)],raycaster=new THREE.Raycaster();raycaster.far=tolerance*4;
  for(const point of candidate.points){const world=imported.localToWorld(new THREE.Vector3(point.x,point.y,point.z)),onSurface=axes.some(axis=>{raycaster.set(world.clone().addScaledVector(axis,tolerance*2),axis.clone().negate());return raycaster.intersectObjects(meshes,false).some(hit=>visibleCalibrationHit(hit)&&hit.point.distanceTo(world)<=tolerance);});if(!onSurface)throw new Error('校准点不在当前模型表面，请重新选择两个真实端点');}
 }
 pickCalibration(ray){const imported=this.owner.imported;if(!imported)return true;const meshes=this.calibrationMeshes();
  const raycaster=new THREE.Raycaster();raycaster.ray.copy(ray);const hit=raycaster.intersectObjects(meshes,false).find(visibleCalibrationHit);
  if(!hit){this.owner.onStatus({message:'未选中模型表面，请点击可见的模型几何体'});return true;}
  const point=modelPoint(imported.worldToLocal(hit.point.clone()));if(this.calibration.points.length===1){try{modelDistance([this.calibration.points[0],point]);}catch(e){this.owner.onStatus({message:e.message});return true;}}
  this.calibration.points.push(point);if(this.calibration.points.length===2)this.mode=null;this.redraw();this.owner.onStatus({binding:true,message:this.calibration.points.length===2?'两点已选择，请输入它们的真实距离（米）':'第一个点已选择，请点击第二个模型表面端点'});return true;
 }
 applyCalibration(realDistanceMeters){if(!this.owner.imported)throw new Error('当前没有 GLB');const candidate=createCalibration(this.calibration.points,realDistanceMeters,this.owner.importedMeta);this.assertCalibrationSurfaces(candidate);return this.commitCalibration(candidate);}
 commitCalibration(candidate){
  // updateSettings invalidates world-space habitat marks on a scale change. Keep
  // this fully validated model-space measurement outside that reset, then restore.
  this.owner.updateSettings({modelScale:candidate.modelScale});this.calibration={points:structuredClone(candidate.points),record:structuredClone(candidate),pending:false,backup:null};this.mode=null;this.redraw();this.owner.fitModel();this.owner.onStatus({binding:true,message:'尺度已校准：1 场景单位 = 1 米；请按当前尺度设置水位与水域'});return structuredClone(candidate);
 }
 exportCalibration(){if(!this.owner.imported||!this.calibration.record)throw new Error('请先完成模型尺度校准');return validateCalibration(this.calibration.record,this.owner.importedMeta,{modelScale:this.owner.settings.modelScale});}
 importCalibration(data){if(!this.owner.imported)throw new Error('当前没有 GLB');const candidate=validateCalibration(data,this.owner.importedMeta);this.assertCalibrationSurfaces(candidate);return this.commitCalibration(candidate);}
 removePoint(index){if(!Number.isInteger(index)||index<0||index>=this.draft.polygon.length)return;this.draft.polygon.splice(index,1);this.redraw();this.owner.onStatus({binding:true});}
 removeObstacle(index){if(!Number.isInteger(index)||index<0||index>=this.draft.obstacles.length)return;this.draft.obstacles.splice(index,1);this.redraw();this.owner.onStatus({binding:true});}
 setDraft(value){const draft=structuredClone(value);if(this.calibration.pending)this.cancelCalibration({silent:true});this.draft=draft;this.mode=null;this.redraw();this.owner.onStatus({binding:true});}
 updateWater(level,depth){if(!Number.isFinite(level)||level< -10||level>10||!Number.isFinite(depth)||depth<.2||depth>3)throw new Error('水位应为−10到10，水深应为0.2到3');this.draft.waterLevel=level;this.draft.depth=depth;if(this.draft.feedPoint)this.draft.feedPoint.y=level;this.redraw();this.owner.onStatus({binding:true});}
 pick(ray,radius=.35){if(!this.mode||!this.owner.imported)return false;if(this.mode==='calibration')return this.pickCalibration(ray);const p=new THREE.Vector3();
  if(!ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-this.draft.waterLevel),p))return true;
  if(Math.abs(p.x)>100||Math.abs(p.z)>100){this.owner.onStatus({message:'标记超出范围，请靠近模型再点击'});return true;}
  if(this.mode==='outline'){if(this.draft.polygon.length>=32){this.owner.onStatus({message:'水域轮廓最多32个点'});return true;}this.draft.polygon.push({x:p.x,z:p.z});}
  else if(this.mode==='feed'){this.draft.feedPoint={x:p.x,y:this.draft.waterLevel,z:p.z};this.mode=null;}
  else {if(this.draft.obstacles.length>=16){this.owner.onStatus({message:'最多16个障碍'});return true;}this.draft.obstacles.push({x:p.x,z:p.z,radius});}
  this.redraw();this.owner.onStatus({binding:true});return true;
 }
 undoPoint(){this.draft.polygon.pop();this.redraw();this.owner.onStatus({binding:true});}
 clearOutline(){this.draft.polygon=[];this.redraw();this.owner.onStatus({binding:true});}
 clearObstacles(){this.draft.obstacles=[];this.redraw();this.owner.onStatus({binding:true});}
 apply(value=this.draft){if(!this.owner.imported)throw new Error('绑定需要当前 GLB 模型');const candidate=structuredClone(value);
  if(!candidate.feedPoint){const vertices=candidate.polygon;if(vertices.length<3)throw new Error('至少标记三个水域轮廓点');let best=null,score=-Infinity;
   const xs=vertices.map(p=>p.x),zs=vertices.map(p=>p.z),loX=Math.min(...xs),loZ=Math.min(...zs),w=Math.max(...xs)-loX,h=Math.max(...zs)-loZ;
   for(let i=0;i<20;i++)for(let j=0;j<20;j++){const x=loX+(i+.5)*w/20,z=loZ+(j+.5)*h/20;if(!pointInPolygon(vertices,x,z))continue;
    const margin=Math.min(-signedPolygonDistance(vertices,x,z).distance,...candidate.obstacles.map(o=>Math.hypot(x-o.x,z-o.z)-o.radius));if(margin>score){score=margin;best={x,y:candidate.waterLevel,z};}}
   if(!best)throw new Error('水域没有可用投喂点，请重新标记');candidate.feedPoint=best;
  }
  const habitat=validateHabitat(candidate);this.owner.applyHabitat(habitat);if(this.calibration.pending)this.cancelCalibration({silent:true});this.applied=habitat;this.draft=structuredClone(habitat);this.mode=null;this.redraw();this.owner.onStatus({binding:true,message:'动态水域已绑定：可以投喂、观察鱼群或进行算法实验'});return habitat;
 }
 disable(){this.owner.removeHabitat();if(this.calibration.pending)this.cancelCalibration({silent:true});this.applied=null;this.mode=null;this.redraw();this.owner.onStatus({binding:true,message:'已关闭动态绑定，保留模型与标记草稿'});}
 exportData(){if(!this.owner.imported)throw new Error('当前没有 GLB');const data={format:'koi-scene-binding/v1',coordinateSystem:'centered-model-world',modelSha256:this.owner.importedMeta.sha256,modelName:this.owner.importedMeta.name,modelScale:this.owner.settings.modelScale,habitat:structuredClone(this.applied||this.draft)};if(this.calibration.record)data.calibration=this.exportCalibration();return data;}
 importData(data){if(data?.format!=='koi-scene-binding/v1'||data.coordinateSystem!=='centered-model-world')throw new Error('不是本页的场景绑定文件');
  if(!this.owner.imported||data.modelSha256!==this.owner.importedMeta.sha256)throw new Error('绑定文件与当前 GLB 不匹配，请载入对应模型');
  if(!Number.isFinite(data.modelScale)||Math.abs(data.modelScale-this.owner.settings.modelScale)>1e-7)throw new Error('模型倍率与绑定文件不同，请先设置为 '+data.modelScale);
  let calibration=null;
  if(data.calibration!==undefined){calibration=validateCalibration(data.calibration,this.owner.importedMeta,{modelScale:data.modelScale});this.assertCalibrationSurfaces(calibration);}
  else if(this.calibration.record){
   // Legacy habitat files do not carry a unit declaration. They may retain an
   // existing verified measurement for this exact model and scale, never create one.
   try{calibration=validateCalibration(this.calibration.record,this.owner.importedMeta,{modelScale:this.owner.settings.modelScale});this.assertCalibrationSurfaces(calibration);}catch{calibration=null;}
  }
  const habitat=this.apply(data.habitat);this.calibration=calibration?{points:structuredClone(calibration.points),record:calibration,pending:false,backup:null}:emptyCalibration();this.redraw();this.owner.onStatus({binding:true});return habitat;
 }
 getState(){const points=structuredClone(this.calibration.points);let distance=null;try{distance=modelDistance(points);}catch{}return {mode:this.mode,draft:this.draft,applied:this.applied,model:this.owner.importedMeta,markersVisible:this.markersVisible,calibration:{points,record:structuredClone(this.calibration.record),modelDistance:distance,worldDistance:distance===null?null:distance*this.owner.settings.modelScale,pending:this.calibration.pending,collecting:this.mode==='calibration'}};}
 redraw(){for(const child of [...this.group.children]){this.group.remove(child);child.traverse(object=>{object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose();});}this.group.visible=!!this.owner.imported&&(this.markersVisible||!!this.mode||this.calibration.pending);
  const d=this.draft,y=d.waterLevel+.035,material=color=>new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.9}),line=(points,color)=>this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material(color)));
  if(d.polygon.length>1){const points=d.polygon.map(p=>new THREE.Vector3(p.x,y,p.z));if(d.polygon.length>2)points.push(points[0]);line(points,'#e0b44c');}
  for(const p of d.polygon){const dot=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:'#f1c961',depthTest:false}));dot.position.set(p.x,y,p.z);this.group.add(dot);}
  for(const o of d.obstacles){const points=Array.from({length:65},(_,i)=>new THREE.Vector3(o.x+Math.cos(i/64*Math.PI*2)*o.radius,y,o.z+Math.sin(i/64*Math.PI*2)*o.radius));line(points,'#ef8578');}
  if(d.feedPoint){const p=d.feedPoint;line([new THREE.Vector3(p.x-.13,y,p.z),new THREE.Vector3(p.x+.13,y,p.z)],'#9ce4cb');line([new THREE.Vector3(p.x,y,p.z-.13),new THREE.Vector3(p.x,y,p.z+.13)],'#9ce4cb');}
  if(this.owner.imported&&this.calibration.points.length){this.owner.imported.updateWorldMatrix(true,true);const points=this.calibration.points.map(p=>this.owner.imported.localToWorld(new THREE.Vector3(p.x,p.y,p.z))),radius=Math.max(1e-6,Math.min(.15,Math.hypot(...this.owner.importedMeta.sourceSize)*this.owner.settings.modelScale*.004));this.calibrationGroup=new THREE.Group();this.calibrationGroup.name='model-calibration-markers';this.group.add(this.calibrationGroup);
   if(points.length===2){const segment=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material('#71e4ed'));segment.renderOrder=1001;this.calibrationGroup.add(segment);}
   points.forEach((p,i)=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(radius,14,10),new THREE.MeshBasicMaterial({color:i?'#b8f4ac':'#71e4ed',depthTest:false,depthWrite:false}));dot.position.copy(p);dot.renderOrder=1002;dot.name='calibration-point-'+(i+1);this.calibrationGroup.add(dot);});
  }else this.calibrationGroup=null;
 }
}
