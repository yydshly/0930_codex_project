import {DEFAULT_SOURCE_CONFIG} from './sources.js';
import {CAMERA_VIEW_LIMIT} from './camera-views.js';
export const DEFAULT_SOURCE=[-.7,9.8,-3.35];
export const PROJECT_LIMITS={bytes:5_000_000,objects:2000,sources:256,edits:16384};
export const DEFAULT_SCENE={preset:0,season:'summer',flow:1,gravity:9.8,viscosity:.025,exposure:1.05,mode:0,paused:false,quality:'fine',sun:0,speed:1,source:DEFAULT_SOURCE,sourceConfig:DEFAULT_SOURCE_CONFIG,extraSources:[],waterStyle:0,foam:.65,surfaceSmoothing:2,objects:[],edits:[],cameraViews:[]};
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
function number(v,a,b,def,label){if(v===undefined&&def!==undefined)return def;if(!finite(v,a,b))throw new Error(label+'超出可读取范围。');return v;}
function vector(value,bounds,label){if(!Array.isArray(value)||value.length!==3||!value.every((v,i)=>finite(v,...bounds[i])))throw new Error(label+'必须是有效的三维坐标。');return [...value];}
function sourceConfig(input={}){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('水源设置无效。');if(input.enabled!==undefined&&typeof input.enabled!=='boolean')throw new Error('水源开关必须是布尔值。');return {enabled:input.enabled!==false,...Object.fromEntries([['power',0,3],['radius',.15,1.2],['yaw',-180,180],['pitch',-90,75],['speed',0,6]].map(([key,a,b])=>[key,number(input[key],a,b,DEFAULT_SOURCE_CONFIG[key],key)]))};}
function cameraPose(input,label='相机'){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error(label+'无效。');return {position:vector(input.position,[[-55,55],[-55,55],[-55,55]],label),target:vector(input.target,[[-15,15],[-5,20],[-15,15]],label+'目标')};}
export function decodeProject(text){
  if(typeof text!=='string'||text.length>PROJECT_LIMITS.bytes)throw new Error('作品文件过大或不是文本。');
  let doc;try{doc=JSON.parse(text);}catch{throw new Error('作品不是有效的 JSON 文件。');}
  if(doc?.format!=='waterfalls-lab'||doc.version!==2||!doc.scene||typeof doc.scene!=='object')throw new Error('请导入 Waterfalls Lab v2 作品文件。');
  const input=doc.scene,scene={...DEFAULT_SCENE};
  scene.preset=number(input.preset,0,2,0,'场景');if(!Number.isInteger(scene.preset))throw new Error('场景编号无效。');scene.season=scene.preset===1?'autumn':'summer';
  if(input.quality!==undefined&&!['light','fine','cinema','ultra'].includes(input.quality))throw new Error('画质档位无效。');scene.quality=input.quality||'fine';
  for(const [key,a,b] of [['flow',0,3],['gravity',2,20],['viscosity',0,.2],['exposure',.6,1.8],['sun',0,1],['speed',.2,2],['mode',0,2]])scene[key]=number(input[key],a,b,DEFAULT_SCENE[key],key);
  scene.paused=input.paused===true;scene.source=input.source?vector(input.source,[[-5.5,5.5],[.2,12.8],[-4.8,4.8]],'水源'): [...DEFAULT_SOURCE];
  scene.sourceConfig=sourceConfig(input.sourceConfig);
  if(input.extraSources!==undefined&&(!Array.isArray(input.extraSources)||input.extraSources.length>=PROJECT_LIMITS.sources))throw new Error('水源列表无效或过大。');
  scene.extraSources=(input.extraSources||[]).map(s=>{if(!s||typeof s!=='object')throw new Error('水源数据无效。');return {...sourceConfig(s),position:vector(s.position,[[-5.5,5.5],[.2,12.8],[-4.8,4.8]],'水源位置')};});
  scene.waterStyle=number(input.waterStyle,0,2,0,'水面外观');if(!Number.isInteger(scene.waterStyle))throw new Error('水面外观无效。');scene.foam=number(input.foam,0,1,.65,'泡沫');
  scene.surfaceSmoothing=number(input.surfaceSmoothing,1,3,1,'水面柔化');if(!Number.isInteger(scene.surfaceSmoothing))throw new Error('水面柔化档位无效。');
  if(!Array.isArray(input.objects)||input.objects.length>PROJECT_LIMITS.objects)throw new Error('物体列表无效或作品过大。');
  scene.objects=input.objects.map((o,i)=>{if(!o||!['rock','mound'].includes(o.type))throw new Error('物体类型无效。');return {id:'object-'+i,type:o.type,position:vector(o.position,[[-5.6,5.6],[.05,12.8],[-4.9,4.9]],'物体位置'),scale:vector(o.scale,[[.12,3],[.12,3],[.12,3]],'物体大小'),rotation:number(o.rotation,-Math.PI*2,Math.PI*2,0,'旋转')};});
  if(!Array.isArray(input.edits)||input.edits.length>PROJECT_LIMITS.edits)throw new Error('地形编辑列表无效或作品过大。');
  scene.edits=input.edits.map(e=>{if(!e||!['add','cut','restore','smooth','flatten'].includes(e.op))throw new Error('地形操作无效。');const edit={op:e.op,center:vector(e.center,[[-5.6,5.6],[.05,12.8],[-4.9,4.9]],'笔刷位置'),radius:number(e.radius,.25,2.4,undefined,'笔刷半径')};if(['smooth','flatten'].includes(e.op))edit.strength=number(e.strength,.1,1,.65,'笔刷强度');if(e.op==='flatten')edit.level=number(e.level,.05,12.8,undefined,'削平高度');return edit;});
  if(input.cameraViews!==undefined&&(!Array.isArray(input.cameraViews)||input.cameraViews.length>CAMERA_VIEW_LIMIT))throw new Error('镜头收藏无效或超过 8 个。');
  scene.cameraViews=(input.cameraViews||[]).map((view,i)=>{if(!view||typeof view.name!=='string')throw new Error('镜头名称无效。');return {name:view.name.trim().slice(0,32)||'镜头 '+(i+1),camera:cameraPose(view.camera,'收藏镜头')};});
  let camera=null;if(doc.camera)camera=cameraPose(doc.camera);
  return {name:typeof doc.name==='string'?doc.name.slice(0,80):'我的山谷',scene,camera};
}
export function encodeProject(scene,camera,name='我的山谷'){
  return JSON.stringify({format:'waterfalls-lab',version:2,name,updated:new Date().toISOString(),scene:{...scene,objects:scene.objects.map(({id,...o})=>o),edits:scene.edits.map(e=>({...e,center:[...e.center]}))},camera},null,2);
}
export function editSnapshot(scene){return structuredClone({preset:scene.preset,season:scene.season,objects:scene.objects,edits:scene.edits,source:scene.source,sourceConfig:scene.sourceConfig,extraSources:scene.extraSources});}
export function historySnapshot(scene,name,camera,full=false){const entry={scene:full?structuredClone(scene):editSnapshot(scene),name,full};if(full)entry.camera=structuredClone(camera);return entry;}
