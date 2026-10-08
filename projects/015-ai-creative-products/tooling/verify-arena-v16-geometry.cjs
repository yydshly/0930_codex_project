const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),T=require(path.join(root,'web/demo/runtime/vendor/three-r160.min.js')),checks=[];
const check=(name,passed,detail)=>{checks.push({name,passed:Boolean(passed),detail});if(!passed)throw Error(name);};
const canvasContext=new Proxy({createLinearGradient(){return {addColorStop(){}};}},{get(target,key){return key in target?target[key]:()=>{};},set(target,key,value){target[key]=value;return true;}});
const context=vm.createContext({console,Float32Array,Uint16Array,Uint32Array,Math,document:{createElement(type){if(type!=='canvas')throw Error('Unexpected DOM dependency '+type);return {width:1,height:1,getContext(){return canvasContext;}};}}});
const cache=new Map();
async function load(id){
 id=path.resolve(id);if(cache.has(id))return cache.get(id);
 const pending=(async()=>{let module;
 if(id.endsWith('four-playable-stage.js'))module=new vm.SyntheticModule(['T','solid','box','label'],function(){this.setExport('T',T);this.setExport('solid',(g,color,options={})=>new T.Mesh(g,new T.MeshStandardMaterial({color,...options})));this.setExport('box',()=>{throw Error('Unexpected legacy stage box');});this.setExport('label',()=>{throw Error('Unexpected legacy text plane');});},{context,identifier:id});
 else if(id.endsWith('three-module.js'))module=new vm.SyntheticModule(Object.keys(T),function(){for(const [k,v] of Object.entries(T))this.setExport(k,v);},{context,identifier:id});
 else if(id.endsWith('visual-materials.js')){
  const rounded=await load(path.join(root,'web/labs/assets/RoundedBoxGeometry.js'));await rounded.evaluate();
  module=new vm.SyntheticModule(['pbrMaterial','photoEnvironment','roundedBoxGeometry'],function(){this.setExport('pbrMaterial',(_name,{repeat,normal,onLoad,...opts}={})=>new T.MeshPhysicalMaterial(opts));this.setExport('photoEnvironment',()=>({dispose(){}}));this.setExport('roundedBoxGeometry',(w,h,d,r)=>new rounded.namespace.RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2)));},{context,identifier:id});
 }else module=new vm.SourceTextModule(fs.readFileSync(id,'utf8'),{context,identifier:id});
 await module.link((specifier,referencing)=>load(path.resolve(path.dirname(referencing.identifier),specifier)));return module;})();cache.set(id,pending);return pending;
}
(async()=>{
 const art=await load(path.join(root,'web/labs/soccer-art.js'));await art.evaluate();const stage={scene:new T.Scene(),renderer:{toneMappingExposure:1},draw(){}};art.namespace.buildCoveredRallyArena(stage);const car=art.namespace.makeRallyCoupe();
 const counts={meshes:0,vertices:0,triangles:0,invalidCoordinates:0},seats=[];
 stage.scene.traverse(m=>{if(!m.isMesh)return;counts.meshes++;for(const value of m.geometry.attributes.position.array)if(!Number.isFinite(value))counts.invalidCoordinates++;counts.vertices+=m.geometry.attributes.position.count;counts.triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;if(m.userData.seating)seats.push(m.userData.seating);m.geometry.computeBoundingBox();});
 check('All real Three.js stadium vertices are finite',counts.invalidCoordinates===0,counts);
 check('Both seating tiers have 24 authored rows',seats.length===24&&seats.filter(x=>x.tier===1).length===11&&seats.filter(x=>x.tier===2).length===13,seats.map(x=>({tier:x.tier,row:x.row,visibleSegments:x.visibleSegments,fullRingSegments:x.fullRingSegments})));
 check('Every crowd row has actual missing faces at aisles',seats.every(x=>x.visibleSegments<x.fullRingSegments&&x.visibleSegments>x.fullRingSegments*.75),seats.map(x=>x.fullRingSegments-x.visibleSegments));
 const arena=stage.scene.userData.rallyArena;
 const centerX=arena.innerHalfWidth-arena.cornerRadius,centerZ=arena.innerHalfLength-arena.cornerRadius,cornerDistance=Math.hypot(20-centerX,27-centerZ);check('Entire unchanged 40 x 54 playable rectangle fits inside the decorative rounded barrier',cornerDistance<arena.cornerRadius,{playableCorner:[20,27],cornerCenter:[centerX,centerZ],cornerDistance,barrierRadius:arena.cornerRadius});
 check('Continuous canopy has deep radial trusses and lamp clusters',arena.radialTrusses>=28&&arena.floodlightClusters===arena.radialTrusses&&arena.roofInnerHeight>15,arena);
 const design=car.userData.design;
 check('Wheel count, radius and longitudinal centers retain v15 gameplay proportions',car.userData.wheels.length===4&&design.wheelRadius===.38&&design.wheelCenters[0]===-1.04&&design.wheelCenters[1]===1.02,design);
 const turf=[];stage.scene.traverse(m=>{if(m.isMesh&&m.material.customProgramCacheKey?.()==='rally-continuous-mown-turf-v16')turf.push(m);});
 check('Field uses one continuous turf rather than layered half-field boxes',turf.length===1,turf.length);
 const shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>'};turf[0].material.onBeforeCompile(shader);check('Turf shader injects world position, soft mowing and home-zone blend',shader.vertexShader.includes('vRallyGround=')&&shader.fragmentShader.includes('smoothstep(12.7,18.3')&&shader.fragmentShader.includes('grassLuma'),{vertexPosition:shader.vertexShader.includes('modelMatrix'),blendedHome:true});
 const bounds=new T.Box3().setFromObject(stage.scene);check('Scenery bounds fit the actual camera far plane',bounds.max.z<50&&bounds.min.z>-50&&bounds.max.x<42&&bounds.min.x>-42,{min:bounds.min.toArray(),max:bounds.max.toArray()});
 const result={version:16,scope:'Actual Three.js CPU geometry, indices, wheel proportions and shader-string checks. Canvas drawing is stubbed; no browser, WebGL shader compilation, live controls or visual quality certified by this record.',checks,counts,arena};
 fs.mkdirSync(path.join(root,'notes'),{recursive:true});fs.writeFileSync(path.join(root,'notes/case-10-v16-geometry.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:checks.length,counts,arena},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
