import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createCalibration,validateCalibration,calibrationScale,modelDistance} from '../src/model-calibration.js';

const meta={name:'real-courtyard.glb',sha256:'a'.repeat(64),sourceSize:[10,4,8]},points=[{x:-2,y:2,z:4},{x:2,y:2,z:4}];
test('calibration computes absolute meters per original model unit independently of current wrapper scale',()=>{
 assert.equal(modelDistance(points),4);assert.equal(calibrationScale(points,8),2);
 const record=createCalibration(points,8,meta);assert.equal(record.modelScale,2);assert.equal(record.metersPerModelUnit,2);assert.equal(record.coordinateSystem,'centered-model-local');assert.deepEqual(record.points,points);
 assert.deepEqual(validateCalibration(JSON.parse(JSON.stringify(record)),meta,{modelScale:2}),record);
});
test('calibration rejects coincident, nonfinite and out-of-model points',()=>{
 for(const p of [[points[0],points[0]],[points[0],{...points[1],x:Infinity}],[points[0],{...points[1],y:NaN}],[points[0],{...points[1],x:6}]])assert.throws(()=>createCalibration(p,8,meta));
 assert.throws(()=>createCalibration([points[0]],8,meta));assert.throws(()=>createCalibration([{x:0,y:0,z:0},{x:1e-10,y:0,z:0}],1,meta));
});
test('known lengths and unsupported scales reject without clipping',()=>{
 for(const meters of [0,-1,NaN,Infinity,'8',.0009,1000.01,.1,21])assert.throws(()=>createCalibration(points,meters,meta));
 assert.equal(createCalibration(points,.2,meta).modelScale,.05);assert.equal(createCalibration(points,20,meta).modelScale,5);
});
test('calibration metadata must match the model, measured ratio and binding scale',()=>{
 const record=createCalibration(points,8,meta);
 for(const patch of [{format:'other'},{coordinateSystem:'world'},{modelSha256:'b'.repeat(64)},{modelScale:1},{metersPerModelUnit:1},{realDistanceMeters:7},{points:[points[0],{x:6,y:2,z:4}]}])assert.throws(()=>validateCalibration({...record,...patch},meta));
 assert.throws(()=>validateCalibration(record,meta,{modelScale:1}));assert.throws(()=>validateCalibration(record,{...meta,sha256:'b'.repeat(64)}));
 assert.equal(validateCalibration({...record,modelSha256:meta.sha256.toUpperCase()},meta).modelSha256,meta.sha256);
});

// Use the actual Three.js Raycaster and SceneBinding in memory. No GPU or bundle
// rebuild is needed to prove which surfaces provide the calibration points.
const nodeRequire=createRequire(new URL('../tooling/fixture.cjs',import.meta.url)),{build}=nodeRequire('esbuild');
const compiled=await build({stdin:{contents:"import * as THREE from 'three'; export {THREE}; export {SceneBinding} from './scene-binding.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'calibration-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,nodeRequire);
const {THREE,SceneBinding}=runtime.exports;
const habitat={polygon:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}],waterLevel:0,depth:.6,feedPoint:{x:0,y:0,z:0},obstacles:[]};
function fixture(scale=1){
 const owner={scene:new THREE.Scene(),settings:{modelScale:scale,autoTour:false},importedMeta:structuredClone(meta),interaction:{stops:0,stop(){this.stops++;}},status:[],fits:0,removes:0,onStatus(value){this.status.push(value);},fitModel(){this.fits++;},applyHabitat(value){this.habitat=value;},removeHabitat(){this.removes++;this.habitat=null;}};
 owner.imported=new THREE.Group();const mesh=new THREE.Mesh(new THREE.BoxGeometry(10,4,8),new THREE.MeshBasicMaterial());mesh.position.y=2;owner.imported.add(mesh);owner.imported.scale.setScalar(scale);owner.scene.add(owner.imported);
 // The dynamic scene contains a nearer surface. It cannot be a model baseline.
 const dynamic=new THREE.Mesh(new THREE.BoxGeometry(12,8,.1),new THREE.MeshBasicMaterial());dynamic.position.set(0,3,9);owner.scene.add(dynamic);
 owner.updateSettings=value=>{if(value.modelScale!==owner.settings.modelScale){owner.removeHabitat();owner.binding.clear();}owner.settings={...owner.settings,...value};owner.imported.scale.setScalar(owner.settings.modelScale);};
 owner.binding=new SceneBinding(owner);return owner;
}
function ray(x,scale=1){return new THREE.Ray(new THREE.Vector3(x*scale,2*scale,20*scale),new THREE.Vector3(0,0,-1));}
function pickBoth(owner){owner.binding.beginCalibration();owner.binding.pick(ray(-2,owner.settings.modelScale));owner.binding.pick(ray(2,owner.settings.modelScale));}
test('two-point selection uses real imported mesh intersections and stores unscaled model coordinates',()=>{
 for(const scale of [.05,1,2,5]){const owner=fixture(scale);pickBoth(owner);const state=owner.binding.getState();assert.deepEqual(state.calibration.points,points);assert.equal(state.calibration.modelDistance,4);assert.equal(state.calibration.worldDistance,4*scale);assert.equal(state.mode,null);assert.equal(owner.interaction.stops,1);}
});
test('a ray miss, invisible geometry or duplicate endpoint cannot supply a calibration point',()=>{
 const owner=fixture();owner.binding.beginCalibration();owner.binding.pick(ray(20));assert.equal(owner.binding.calibration.points.length,0);owner.imported.children[0].visible=false;owner.binding.pick(ray(-2));assert.equal(owner.binding.calibration.points.length,0);owner.imported.children[0].visible=true;
 const hidden=new THREE.Group();hidden.visible=false;const decoy=new THREE.Mesh(new THREE.BoxGeometry(10,4,1),new THREE.MeshBasicMaterial());decoy.position.set(0,2,10);hidden.add(decoy);owner.imported.add(hidden);
 owner.binding.pick(ray(-2));owner.binding.pick(ray(-2));assert.equal(owner.binding.calibration.points.length,1);assert.deepEqual(owner.binding.calibration.points[0],points[0]);assert.equal(owner.binding.mode,'calibration');
});
test('grouped meshes reject hidden material faces for picking and saved surface validation',()=>{
 for(const hidden of ['visibility','opacity']){const owner=fixture(),mesh=owner.imported.children[0];mesh.material=Array.from({length:6},()=>new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));if(hidden==='visibility')mesh.material[4].visible=false;else{mesh.material[4].transparent=true;mesh.material[4].opacity=0;}
  owner.imported.updateWorldMatrix(true,true);const raycaster=new THREE.Raycaster();raycaster.ray.copy(ray(-2));const actualHits=raycaster.intersectObject(mesh,false);assert.equal(actualHits[0].face.materialIndex,4,'Three.js itself still returns the hidden front face');
  owner.binding.beginCalibration();owner.binding.pick(ray(-2));owner.binding.pick(ray(2));assert.deepEqual(owner.binding.calibration.points,[{x:-2,y:2,z:-4},{x:2,y:2,z:-4}],'pick must skip the hidden front and choose the visible rear surface');
  const before=JSON.stringify({state:owner.binding.getState(),settings:owner.settings,fits:owner.fits});assert.throws(()=>owner.binding.importCalibration(createCalibration(points,6,meta)),/模型表面/);assert.equal(JSON.stringify({state:owner.binding.getState(),settings:owner.settings,fits:owner.fits}),before);
  const record=owner.binding.applyCalibration(6);assert.equal(record.modelScale,1.5);assert.ok(record.points.every(p=>p.z===-4));
 }
});
test('applying scale invalidates old world-space habitat and restores the valid model-space measurement',()=>{
 const owner=fixture(2);owner.binding.apply(habitat);pickBoth(owner);const record=owner.binding.applyCalibration(6);assert.equal(record.modelScale,1.5);assert.equal(owner.settings.modelScale,1.5);assert.equal(owner.binding.applied,null);assert.equal(owner.binding.draft.polygon.length,0);assert.deepEqual(owner.binding.calibration.points,points);assert.deepEqual(owner.binding.exportCalibration(),record);assert.equal(owner.fits,1);
 const markers=owner.binding.calibrationGroup.children.filter(child=>child.isMesh);assert.deepEqual(markers.map(m=>m.position.toArray()),points.map(p=>[p.x*1.5,p.y*1.5,p.z*1.5]));
 const line=owner.binding.calibrationGroup.children.find(child=>child.isLine),positions=line.geometry.getAttribute('position');assert.equal(Math.hypot(positions.getX(1)-positions.getX(0),positions.getY(1)-positions.getY(0),positions.getZ(1)-positions.getZ(0)),6);
});
test('invalid calibration import or application leaves scale, habitat, point selection and camera untouched',()=>{
 const owner=fixture(2);owner.binding.apply(habitat);pickBoth(owner);const snapshot=()=>JSON.stringify({settings:owner.settings,state:owner.binding.getState(),habitat:owner.habitat,fits:owner.fits,removes:owner.removes}),before=snapshot();
 for(const meters of [0,21,Infinity]){assert.throws(()=>owner.binding.applyCalibration(meters));assert.equal(snapshot(),before);}
 const valid=createCalibration(points,6,meta);for(const patch of [{modelSha256:'b'.repeat(64)},{modelScale:2},{points:[points[0],{x:6,y:2,z:4}]}]){assert.throws(()=>owner.binding.importCalibration({...valid,...patch}));assert.equal(snapshot(),before);}
 const inside=createCalibration([{x:-2,y:2,z:0},{x:2,y:2,z:0}],6,meta);assert.throws(()=>owner.binding.importCalibration(inside),/模型表面/);assert.equal(snapshot(),before);
});
test('calibration export/import roundtrips against the same model and refuses an unrelated GLB',()=>{
 const source=fixture(1);pickBoth(source);source.binding.applyCalibration(6);const json=JSON.parse(JSON.stringify(source.binding.exportCalibration())),target=fixture(2);target.binding.importCalibration(json);assert.equal(target.settings.modelScale,1.5);assert.deepEqual(target.binding.exportCalibration(),json);
 target.importedMeta.sha256='b'.repeat(64);const before=target.settings.modelScale;assert.throws(()=>target.binding.importCalibration(json));assert.equal(target.settings.modelScale,before);
});
test('binding metadata carries calibration while legacy binding files remain compatible',()=>{
 const source=fixture();pickBoth(source);source.binding.applyCalibration(6);source.binding.apply(habitat);const exported=source.binding.exportData();assert.ok(exported.calibration);const target=fixture(1.5);target.binding.importData(exported);assert.deepEqual(target.binding.exportData(),exported);
 const legacy=structuredClone(exported);delete legacy.calibration;target.binding.importData(legacy);assert.deepEqual(target.binding.calibration.record,exported.calibration);assert.deepEqual(target.binding.calibration.points,exported.calibration.points);assert.deepEqual(target.binding.applied,habitat);
 const bad=structuredClone(exported);bad.calibration.realDistanceMeters=5;const before=JSON.stringify(target.binding.getState());assert.throws(()=>target.binding.importData(bad));assert.equal(JSON.stringify(target.binding.getState()),before);
 const invalidLegacy=structuredClone(legacy);invalidLegacy.habitat.feedPoint.x=99;assert.throws(()=>target.binding.importData(invalidLegacy));assert.equal(JSON.stringify(target.binding.getState()),before);
});
test('legacy binding imports neither invent calibration nor retain a record for another model or scale',()=>{
 const source=fixture(1.5);source.binding.apply(habitat);const legacy=source.binding.exportData();assert.equal(legacy.calibration,undefined);const target=fixture(1.5);target.binding.importData(legacy);assert.equal(target.binding.calibration.record,null);assert.deepEqual(target.binding.calibration.points,[]);assert.equal(target.binding.exportData().calibration,undefined);
 pickBoth(target);target.binding.applyCalibration(6);target.binding.calibration.record.modelSha256='b'.repeat(64);target.binding.importData(legacy);assert.equal(target.binding.calibration.record,null);assert.deepEqual(target.binding.calibration.points,[]);
 pickBoth(target);target.binding.applyCalibration(6);target.binding.calibration.record.modelScale=2;target.binding.calibration.record.metersPerModelUnit=2;target.binding.calibration.record.realDistanceMeters=8;target.binding.importData(legacy);assert.equal(target.binding.calibration.record,null);assert.deepEqual(target.binding.calibration.points,[]);
});
test('manual scaling, model clearing and mutually exclusive editing discard stale calibration records',()=>{
 const owner=fixture();pickBoth(owner);const original=owner.binding.applyCalibration(6);owner.binding.setMode('outline');assert.equal(owner.binding.mode,'outline');owner.binding.beginCalibration();assert.equal(owner.binding.mode,'calibration');assert.deepEqual(owner.binding.calibration.record,original);assert.equal(owner.binding.calibration.pending,true);owner.binding.setMode(null);assert.equal(owner.binding.mode,null);assert.deepEqual(owner.binding.calibration.record,original);assert.equal(owner.binding.calibration.pending,false);
 pickBoth(owner);owner.binding.applyCalibration(6);owner.updateSettings({modelScale:2});assert.equal(owner.binding.calibration.record,null);assert.equal(owner.binding.calibration.points.length,0);assert.throws(()=>owner.binding.exportCalibration());owner.binding.clear();assert.equal(owner.binding.mode,null);
});
test('calibration endpoints remain visible while selecting and awaiting known length even when habitat markers are hidden',()=>{
 const owner=fixture();owner.binding.showMarkers(false);owner.binding.beginCalibration();owner.binding.pick(ray(-2));assert.equal(owner.binding.group.visible,true);owner.binding.pick(ray(2));assert.equal(owner.binding.group.visible,true);owner.binding.applyCalibration(6);assert.equal(owner.binding.group.visible,false);owner.binding.showMarkers(true);assert.equal(owner.binding.group.visible,true);
});
function calibratedOwner(){const owner=fixture();pickBoth(owner);owner.binding.applyCalibration(6);owner.binding.apply(habitat);return owner;}
function draftDifferentPoints(owner,count=2){owner.binding.beginCalibration();if(count>0)owner.binding.pick(ray(-1,owner.settings.modelScale));if(count>1)owner.binding.pick(ray(1,owner.settings.modelScale));}
test('cancel restores the active calibration and habitat with zero, one or two draft endpoints',()=>{
 for(const count of [0,1,2]){const owner=calibratedOwner(),original=owner.binding.exportCalibration(),beforeHabitat=structuredClone(owner.binding.applied),fits=owner.fits,removes=owner.removes;draftDifferentPoints(owner,count);const draft=owner.binding.getState().calibration;assert.equal(draft.pending,true);assert.equal(draft.collecting,count!==2);assert.equal(draft.points.length,count);assert.deepEqual(draft.record,original);assert.deepEqual(owner.binding.exportCalibration(),original);assert.deepEqual(owner.binding.exportData().calibration,original);
  assert.equal(owner.binding.cancelCalibration(),true);const restored=owner.binding.getState().calibration;assert.equal(restored.pending,false);assert.equal(restored.collecting,false);assert.deepEqual(restored.points,original.points);assert.deepEqual(restored.record,original);assert.deepEqual(owner.binding.applied,beforeHabitat);assert.equal(owner.settings.modelScale,1.5);assert.equal(owner.fits,fits);assert.equal(owner.removes,removes);assert.equal(owner.binding.cancelCalibration(),false);
 }
});
test('Escape-equivalent setMode(null) and switching habitat modes cancel completed or partial calibration drafts',()=>{
 for(const [mode,count] of [[null,1],[null,2],['outline',1],['feed',2],['obstacle',2]]){const owner=calibratedOwner(),original=owner.binding.exportCalibration();draftDifferentPoints(owner,count);owner.binding.setMode(mode);assert.equal(owner.binding.mode,mode);assert.equal(owner.binding.getState().calibration.pending,false);assert.deepEqual(owner.binding.calibration.points,original.points);assert.deepEqual(owner.binding.exportCalibration(),original);}
});
test('restarting a calibration draft keeps the original rollback record and exports only applied measurements',()=>{
 const owner=calibratedOwner(),original=owner.binding.exportCalibration(),binding=owner.binding.exportData();draftDifferentPoints(owner);assert.equal(owner.binding.getState().calibration.modelDistance,2);owner.binding.beginCalibration();assert.deepEqual(owner.binding.calibration.points,[]);owner.binding.pick(ray(0,owner.settings.modelScale));assert.deepEqual(owner.binding.exportCalibration(),original);assert.deepEqual(owner.binding.exportData(),binding);owner.binding.cancelCalibration();assert.deepEqual(owner.binding.calibration.points,original.points);assert.deepEqual(owner.binding.exportCalibration(),original);
});
test('invalid calibration applications and imports retain an editable pending draft and the old unit declaration',()=>{
 const owner=calibratedOwner(),original=owner.binding.exportCalibration();draftDifferentPoints(owner);const snapshot=()=>JSON.stringify({state:owner.binding.getState(),settings:owner.settings,habitat:owner.habitat,fits:owner.fits,removes:owner.removes}),before=snapshot();for(const meters of [0,11,NaN]){assert.throws(()=>owner.binding.applyCalibration(meters));assert.equal(snapshot(),before);assert.deepEqual(owner.binding.exportCalibration(),original);}
 assert.throws(()=>owner.binding.importCalibration({...original,modelSha256:'b'.repeat(64)}));assert.equal(snapshot(),before);const candidate=owner.binding.applyCalibration(4);assert.equal(candidate.modelScale,2);assert.equal(owner.binding.calibration.pending,false);assert.equal(owner.binding.calibration.backup,null);assert.equal(owner.binding.cancelCalibration(),false);assert.deepEqual(owner.binding.exportCalibration(),candidate);assert.equal(owner.binding.applied,null);
});
test('successful same-scale calibration and JSON import replace the record and cannot resurrect their backups',()=>{
 const owner=calibratedOwner(),original=owner.binding.exportCalibration();draftDifferentPoints(owner);const record=owner.binding.applyCalibration(3);assert.equal(record.modelScale,original.modelScale);assert.notDeepEqual(record.points,original.points);assert.deepEqual(owner.binding.applied,habitat);assert.equal(owner.binding.cancelCalibration(),false);assert.deepEqual(owner.binding.exportCalibration(),record);
 draftDifferentPoints(owner,1);owner.binding.importCalibration(original);assert.equal(owner.binding.calibration.pending,false);assert.equal(owner.binding.calibration.backup,null);assert.equal(owner.binding.cancelCalibration(),false);assert.deepEqual(owner.binding.exportCalibration(),original);
});
test('calibration clearing, model reset and manual scale changes discard pending backups permanently',()=>{
 for(const action of [owner=>owner.binding.clearCalibration(),owner=>owner.binding.clear(),owner=>owner.updateSettings({modelScale:2}),owner=>{owner.imported=null;owner.importedMeta=null;owner.binding.clear();}]){const owner=calibratedOwner();draftDifferentPoints(owner);action(owner);assert.equal(owner.binding.calibration.pending,false);assert.equal(owner.binding.calibration.backup,null);assert.deepEqual(owner.binding.calibration.points,[]);assert.equal(owner.binding.calibration.record,null);assert.equal(owner.binding.cancelCalibration(),false);assert.throws(()=>owner.binding.exportCalibration());}
 const changed=calibratedOwner();draftDifferentPoints(changed);changed.importedMeta.sha256='b'.repeat(64);changed.binding.cancelCalibration();assert.equal(changed.binding.calibration.record,null);assert.deepEqual(changed.binding.calibration.points,[]);
});
test('legacy binding imports use the old applied calibration during pending edits and terminate drafts only on success',()=>{
 const owner=calibratedOwner(),original=owner.binding.exportCalibration(),legacy=owner.binding.exportData();delete legacy.calibration;draftDifferentPoints(owner);const before=JSON.stringify(owner.binding.getState()),invalid=structuredClone(legacy);invalid.habitat.feedPoint.x=99;assert.throws(()=>owner.binding.importData(invalid));assert.equal(JSON.stringify(owner.binding.getState()),before);
 owner.binding.importData(legacy);assert.equal(owner.binding.calibration.pending,false);assert.equal(owner.binding.calibration.backup,null);assert.deepEqual(owner.binding.calibration.points,original.points);assert.deepEqual(owner.binding.exportCalibration(),original);
});
test('explicit binding metadata replaces pending calibration only after all data validates',()=>{
 const owner=calibratedOwner(),record=createCalibration([{x:-1,y:2,z:4},{x:1,y:2,z:4}],3,meta),binding=owner.binding.exportData();binding.calibration=record;draftDifferentPoints(owner,1);const before=JSON.stringify(owner.binding.getState()),invalid=structuredClone(binding);invalid.calibration.realDistanceMeters=2;assert.throws(()=>owner.binding.importData(invalid));assert.equal(JSON.stringify(owner.binding.getState()),before);owner.binding.importData(binding);assert.equal(owner.binding.calibration.pending,false);assert.deepEqual(owner.binding.exportCalibration(),record);assert.equal(owner.binding.cancelCalibration(),false);
});
test('draft cancellation without an older calibration remains uncalibrated and preserve-clear discards rollback state',()=>{
 const fresh=fixture();draftDifferentPoints(fresh);assert.equal(fresh.binding.getState().calibration.pending,true);assert.throws(()=>fresh.binding.exportCalibration());assert.equal(fresh.binding.exportData().calibration,undefined);fresh.binding.cancelCalibration();assert.deepEqual(fresh.binding.calibration.points,[]);assert.equal(fresh.binding.calibration.record,null);assert.equal(fresh.binding.calibration.pending,false);
 const owner=calibratedOwner(),original=owner.binding.exportCalibration();draftDifferentPoints(owner);owner.binding.clear({preserveCalibration:true});assert.equal(owner.binding.calibration.pending,false);assert.equal(owner.binding.calibration.backup,null);assert.deepEqual(owner.binding.calibration.points,original.points);assert.deepEqual(owner.binding.exportCalibration(),original);
});
test('successful habitat operations terminate pending calibration while retaining the applied unit declaration',()=>{
 for(const action of [owner=>owner.binding.setDraft(habitat),owner=>owner.binding.apply(habitat),owner=>owner.binding.disable()]){const owner=calibratedOwner(),original=owner.binding.exportCalibration();draftDifferentPoints(owner,1);action(owner);assert.equal(owner.binding.calibration.pending,false);assert.equal(owner.binding.calibration.backup,null);assert.deepEqual(owner.binding.calibration.points,original.points);assert.deepEqual(owner.binding.exportCalibration(),original);}
});
