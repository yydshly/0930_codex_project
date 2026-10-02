// Native geometry/projection verification. No browser or WebGL is controlled.
import * as THREE from 'three';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {directEpisode,noteMotion} from '../src/echo-direction.mjs';
import {filmAt,filmScore} from '../src/echo-story.mjs';
import {emotionAt,emotionScore,directEmotion,EMOTION_DURATION} from '../src/echo-emotion.mjs';

class SvgElement{
  constructor(name){this.name=name;this.style={};this.attributes={};this.childNodes=[];}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  appendChild(element){if(element.parentNode)element.parentNode.removeChild(element);this.childNodes.push(element);element.parentNode=this;return element;}
  removeChild(element){this.childNodes.splice(this.childNodes.indexOf(element),1);element.parentNode=null;}get firstChild(){return this.childNodes[0];}
  toString(){return '<'+this.name+Object.entries(this.attributes).map(([k,v])=>' '+k+'="'+v.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"').join('')+'>'+this.childNodes.map(String).join('')+'</'+this.name+'>';}
}
globalThis.document={createElementNS:(_,name)=>new SvgElement(name)};

const characterSource=(await readFile(new URL('../src/echo-characters.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replaceAll('export const ','const ').replaceAll('export function ','function ');
const createCharacter=new Function('THREE',characterSource+'\nreturn createEchoCharacter;')(THREE);
const stageSource=(await readFile(new URL('../src/echo-stage.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function ','function ');
const snapshots=[];
function harness(width,height,emotional=false){
  let rendered;
  class Renderer{
    constructor(){this.shadowMap={};this.domElement={getBoundingClientRect:()=>({left:0,top:0,width,height})};}
    setPixelRatio(){}setSize(){}dispose(){}
    render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);rendered={scene,camera};}
  }
  class Observer{observe(){}disconnect(){}}
  const createStage=new Function('THREE','createEchoCharacter','directEpisode','noteMotion','directEmotion','ResizeObserver','devicePixelRatio',stageSource+'\nreturn createEchoStage;')({...THREE,WebGLRenderer:Renderer},id=>createCharacter(id,{textured:false}),directEpisode,noteMotion,directEmotion,Observer,1);
  const stage=createStage({append(){},getBoundingClientRect:()=>({width,height})});
  function frame(time){
    const direction=emotional?emotionAt(time):filmAt(time),last={kong:-100,zhe:-100,dong:-100,su:-100};let tree=-100;
    for(const note of emotional?emotionScore:filmScore){if(note.at>time)continue;if(note.source==='tree'||!emotional&&note.pan===-.5)tree=note.at;else if(!['score','step'].includes(note.source))last[note.voice]=note.at;}
    const noteAges=Object.fromEntries(Object.entries(last).map(([id,at])=>[id,time-at])),pulses=Object.fromEntries(Object.entries(noteAges).map(([id,age])=>[id,Math.max(0,1-age/.6)]));
    stage.update({mode:'episode',direction:emotional?'emotion':'simple',time,phase:direction.phase,elapsed:direction.elapsed,pulses,noteAges,treeAge:time-tree,treePulse:Math.max(0,1-(time-tree)/.6),notePulses:[0,0,0]});
    return rendered;
  }
  return {frame,stage};
}
function bounds(root,camera){
  const box=new THREE.Box3();
  root.traverseVisible(o=>{if(!o.geometry)return;o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});
  const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
  return points;
}
let checks=0;
for(const emotional of [false,true])for(const [width,height] of [[1116,540],[341,430],[286,400]]){
  const h=harness(width,height,emotional);
  for(let step=0;step<=(emotional?EMOTION_DURATION:20)/.04;step++){
    const time=step*.04,{scene,camera}=h.frame(time);
    if(emotional&&Math.abs(time-22)<.01){const ear=scene.getObjectByName('listening-tab'),base=ear.localToWorld(new THREE.Vector3()),tip=ear.localToWorld(new THREE.Vector3(0,.65,0));assert.ok(tip.x<base.x&&tip.z<base.z,'The listening tab still tilts toward the tree after the body turns away');}
    if(Math.abs(time-(emotional?48.8:18.6))<.01)for(const id of ['kong','zhe'])assert.equal(scene.getObjectByName(id).getObjectByName('voice-mouth').visible,true,'Both audible partners open their mouths');
    for(const id of ['kong','zhe']){
      const root=scene.getObjectByName(id);if(!root.visible)continue;
      const points=bounds(root,camera);assert.ok(points.every(p=>p.toArray().every(Number.isFinite)));
      assert.ok(points.every(p=>Math.abs(p.x)<.98&&Math.abs(p.y)<.96),`${width}px ${time.toFixed(2)}s ${id} stays framed`);checks++;
    }
    if(!emotional&&time>=11.3&&time<=13.9){
      for(let i=0;i<3;i++){
        const stone=scene.getObjectByName('sound-stone-'+i),p=stone.getWorldPosition(new THREE.Vector3()).project(camera),screenX=(p.x+1)*width/2,screenY=(1-p.y)*height/2;
        assert.ok(bounds(stone,camera).every(point=>Math.abs(point.x)<.98&&(1-point.y)*height/2<height-92),`${width}px ${time.toFixed(2)}s stone ${i}: y=${screenY.toFixed(1)}, subtitle starts at ${height-92}`);assert.equal(h.stage.pick(screenX,screenY),i,'Sound stones remain raycastable');checks++;
      }
    }
    if(emotional&&width===1116&&[3,8.6,14,20,27,33,37,42.6,49.2].some(t=>Math.abs(time-t)<.01)){
      const {SVGRenderer}=await import('three/addons/renderers/SVGRenderer.js');
      const renderer=new SVGRenderer();renderer.setSize(650,315);renderer.overdraw=.01;renderer.render(scene,camera);
      snapshots.push({time,content:String(renderer.domElement).replace(/^<svg[^>]*>|<\/svg>$/g,'')});
    }
  }
  h.stage.dispose();
}
const cast=Object.fromEntries(['kong','zhe','dong','su'].map(id=>[id,createCharacter(id,{textured:false})]));
for(let i=0;i<5;i++){const normals=cast.zhe.root.getObjectByName('fold-facet-'+i).geometry.getAttribute('normal');for(let j=0;j<normals.count;j++)assert.ok(normals.getZ(j)>0,'Folded front facets must face the viewer');}
const ray=new THREE.Raycaster(new THREE.Vector3(.012,.965,3),new THREE.Vector3(0,0,-1));cast.kong.root.updateMatrixWorld(true);assert.equal(ray.intersectObject(cast.kong.torso).length,0);
ray.set(new THREE.Vector3(.012,.965,-3),new THREE.Vector3(0,0,1));assert.equal(ray.intersectObject(cast.kong.torso).length,0);
for(const c of Object.values(cast)){for(const emotion of ['curious','attentive','eager','embarrassed','calm','hopeful','surprised','glad','uncertain','hurt','defensive','guarded','flustered','vulnerable','relieved','shy']){c.animate(2,{emotion,pulse:.7,noteAge:.2});c.root.updateMatrixWorld(true);c.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}c.dispose();}
console.log(`Native geometry: ${checks} actor/stone projection checks at three sizes; cavity and expressive poses passed.`);
if(snapshots.length){
  const output=new URL('../../../build/',import.meta.url);await mkdir(output,{recursive:true});
  const labels=['都想靠近','错过同一拍','听错沉默','走开也在等','追出半句话','转回来','留出后半句','彼此改写','关系刚开始'],height=Math.ceil(snapshots.length/2)*345;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="${height}" viewBox="0 0 1300 ${height}"><rect width="1300" height="${height}" fill="#f3eedf"/>`+snapshots.map((shot,i)=>`<g transform="translate(${(i%2)*650+325},${Math.floor(i/2)*345+158})">${shot.content}</g><text x="${(i%2)*650+24}" y="${Math.floor(i/2)*345+335}" font-size="15" fill="#637450">${labels[i]} · ${shot.time.toFixed(1)}s · native geometry only</text>`).join('')+'</svg>';
  await writeFile(new URL('echo-story-v3-offline.svg',output),svg);
}
