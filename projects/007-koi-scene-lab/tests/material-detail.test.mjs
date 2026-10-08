import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from '../tooling/node_modules/esbuild/lib/main.js';
import * as THREE from '../tooling/node_modules/three/build/three.module.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const bundled=await build({stdin:{contents:"export {KoiSchool} from './src/fish.js';export {createVegetation} from './src/vegetation.js';export {createMaterials} from './src/materials.js';",resolveDir:root},bundle:true,write:false,format:'esm',nodePaths:[root+'tooling/node_modules']});
const {KoiSchool,createVegetation,createMaterials}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
// This fixture checks Three material wiring and shader chunk compatibility, not
// raster colour or GLSL compilation. Browser rendering covers those separately.
function withDOM(callback){
 const old=globalThis.document;
 const ctx={fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){},putImageData(){},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}};
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return ctx;}};},createElementNS(){return {addEventListener(){},removeEventListener(){},src:''};}};
 try{return callback();}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
}
const patch=(material)=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader);return shader;};

test('surface detail toggles every fish without changing anatomy, animation or seven styles',()=>withDOM(()=>{
 const school=new KoiSchool(new THREE.Scene(),{}),styles=new Set(school.fish.map(f=>f.style));assert.equal(styles.size,7);assert.equal(school.surfaceDetail,true);
 const poses=school.fish.map(f=>({matrix:f.group.matrix.clone(),geometry:f.body.geometry,phase:f.phase.value,normal:f.state.uNormalCorrection.value}));
 for(const enabled of [false,true,false]){assert.equal(school.setSurfaceDetail(enabled),enabled);school.fish.forEach((f,i)=>{assert.equal(f.state.uSurfaceDetail.value,enabled?1:0);assert.equal(f.body.geometry,poses[i].geometry);assert.deepEqual(f.group.matrix.elements,poses[i].matrix.elements);assert.equal(f.phase.value,poses[i].phase);assert.equal(f.state.uNormalCorrection.value,poses[i].normal);});}
 school.reset();assert.ok(school.fish.every(f=>f.state.uSurfaceDetail.value===0));
 assert.equal(school.fish.filter(f=>f.state.uGold.value===1).length,3);assert.equal(school.fish[2].style,'山吹黄金');
}));

test('r160 physical shader expands skin detail after motion normals and before lighting',()=>withDOM(()=>{
 const school=new KoiSchool(new THREE.Scene(),{}),fish=school.fish[0],body=patch(fish.body.material),fin=patch(fish.fins.material);
 assert.equal(body.uniforms.uSurfaceDetail,fish.state.uSurfaceDetail);assert.equal(body.uniforms.uSkinSeed,fish.state.uSkinSeed);
 assert.ok(body.vertexShader.includes('objectNormal=koiSpineNormal(objectNormal,position.x)'));assert.ok(fin.vertexShader.includes('koiPoseFin(position,objectNormal,posed,posedNormal)'));
 for(const name of ['koiSkinRelief(vKoiUv)','roughnessFactor=mix(originalRough,skinRough','metalnessFactor=mix(metalnessFactor','material.clearcoat=mix(material.clearcoat'])assert.ok(body.fragmentShader.includes(name));
 assert.ok(body.fragmentShader.indexOf('material.clearcoat=mix')<body.fragmentShader.indexOf('#include <lights_fragment_begin>'));
 assert.ok(body.fragmentShader.includes('if(uSurfaceDetail>0.)clearcoatNormal=normalize(mix(clearcoatNormal,normal,.45*clamp(uSurfaceDetail,0.,1.)*scales))'));
 assert.ok(body.fragmentShader.indexOf('clearcoatNormal=normalize(mix')<body.fragmentShader.indexOf('#include <lights_physical_fragment>'));
 assert.ok(body.fragmentShader.includes('1.-smoothstep(.27,.88,footprint)'));assert.ok(body.fragmentShader.includes('1.-smoothstep(.18,.60,footprint)'));
 school.setSurfaceDetail(false);assert.equal(body.uniforms.uSurfaceDetail.value,0);school.setSurfaceDetail(true);assert.equal(body.uniforms.uSurfaceDetail.value,1);
}));

test('stone and foliage shader patches use existing r160 UV chunks with derivative filtering',()=>withDOM(()=>{
 const mats=createMaterials();for(const name of ['stone','slab','pondFloor']){const shader=patch(mats[name]);assert.ok(shader.fragmentShader.includes('stonePores=mix(.5,stoneNoise(stoneP)'));assert.ok(shader.fragmentShader.includes('vMapUv*42.'));assert.equal(mats[name].map.name,'stone-albedo.png');}
 const garden=createVegetation(mats,{value:0}),leaves=garden.children.find(o=>o.isInstancedMesh&&o.count>5000),shader=patch(leaves.material);
 assert.ok(shader.fragmentShader.includes('fwidth(leafPhase)'));assert.ok(shader.vertexShader.includes('vGardenVariant=.5+.5*sin'));
 for(const mesh of garden.children.filter(o=>o.isInstancedMesh)){assert.ok(mesh.instanceColor);for(let i=0;i<mesh.count*3;i++)assert.ok(mesh.instanceColor.array[i]>0&&mesh.instanceColor.array[i]<=1);}
}));

test('appearance variation preserves all seven original floating support anchors and scale',()=>{
 const mats=Object.fromEntries(['green','red','trunk'].map(x=>[x,new THREE.MeshStandardMaterial()]));
 const a=createVegetation(mats,{value:0}),b=createVegetation(mats,{value:0}),pads=a.getObjectByName('water-lilies').children;
 const expected=[[-1.8502423048135825,1.4708026851760225,.15604044090723618,4.541670083701611],[-2.07348195099039,1.341397307009902,.2177442105661612,1.756174251800403],[-1.933835358847864,1.5130611668340863,.17239553056424484,4.608908306872473],[-1.494561059831176,1.4061615368817002,.18961273353779687,3.2010452084802092],[-1.8403115720953793,1.2052928425371647,.15153133712592534,3.0900989491213116],[-1.5895687733078376,1.7374803097569385,.18678401287179439,6.084818893382326],[-1.3881924915709534,1.7431961619528011,.19497541806777008,5.068298676805571]];
 assert.equal(pads.length,7);pads.forEach((p,i)=>{assert.deepEqual([p.userData.anchor.x,p.userData.anchor.z,p.scale.x,p.userData.yaw],expected[i]);assert.deepEqual(p.scale.toArray(),[expected[i][2],expected[i][2],expected[i][2]]);});
 const left=a.children.filter(o=>o.isInstancedMesh),right=b.children.filter(o=>o.isInstancedMesh);assert.equal(left.length,right.length);
 left.forEach((m,i)=>{assert.equal(m.count,right[i].count);assert.deepEqual(m.instanceMatrix.array,right[i].instanceMatrix.array);assert.deepEqual(m.instanceColor.array,right[i].instanceColor.array);});
});
