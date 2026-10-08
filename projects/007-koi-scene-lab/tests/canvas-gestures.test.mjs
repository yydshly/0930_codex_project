import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {bindCanvasGestures,exitCameraAutomation} from '../src/canvas-gestures.js';
import {FeedLedger} from '../src/feed-ledger.js';

const require=createRequire(new URL('../tooling/fixture.cjs',import.meta.url));
const {build}=require('esbuild');
const compiled=await build({stdin:{contents:"export * as THREE from 'three'; export {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'; export {HandInteraction} from './interaction.js';",resolveDir:fileURLToPath(new URL('../src/',import.meta.url)),sourcefile:'canvas-gestures-fixture.js'},bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[fileURLToPath(new URL('../tooling/node_modules/',import.meta.url))],logLevel:'silent'});
const runtime={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(runtime,runtime.exports,require);
const {THREE,OrbitControls,HandInteraction}=runtime.exports;

// A DOM event surface with capture-before-bubble ordering. The installed r160
// OrbitControls handles these real pointer/wheel events and changes the camera;
// only native layout and WebGL rendering are outside this fixture's scope.
class Canvas{
 constructor(){this.style={};this.clientWidth=800;this.clientHeight=600;this.listeners=new Map();this.captured=new Set();}
 addEventListener(type,listener,options){const entries=this.listeners.get(type)||[];entries.push({listener,capture:options===true||!!options?.capture});this.listeners.set(type,entries);}
 removeEventListener(type,listener,options){const capture=options===true||!!options?.capture;this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.listener!==listener||entry.capture!==capture));}
 setPointerCapture(id){this.captured.add(id);}
 releasePointerCapture(id){this.captured.delete(id);}
 dispatch(type,values={}){const event={type,pointerId:1,pointerType:'mouse',button:0,clientX:100,clientY:100,pageX:100,pageY:100,ctrlKey:false,metaKey:false,shiftKey:false,deltaY:100,preventDefault(){this.defaultPrevented=true;},...values};
  event.pageX=event.clientX;event.pageY=event.clientY;
  const previousWindow=globalThis.window;if(type==='wheel'&&previousWindow===undefined)globalThis.window={devicePixelRatio:1};
  try{for(const capture of [true,false])for(const entry of [...this.listeners.get(type)||[]])if(entry.capture===capture&&(this.listeners.get(type)||[]).includes(entry))entry.listener(event);}
  finally{if(type==='wheel'&&previousWindow===undefined)delete globalThis.window;}
 }
}
function fixture(mode='feed'){
 const canvas=new Canvas(),camera=new THREE.PerspectiveCamera(51,4/3,.08,120);camera.position.set(0,2,5);
 const controls=new OrbitControls(camera,canvas),school={feeding:new FeedLedger(),inspectionFish:{id:0},strokeTarget:{}};
 const events=[],c={controls,camera,school,settings:{autoTour:true},followAnimal:'turtle',followFish:school.inspectionFish,transition:{active:true},onStatus:status=>events.push(status)};
 const interaction=Object.create(HandInteraction.prototype);Object.assign(interaction,{owner:c,mode,phase:'approach',rig:{root:new THREE.Group()},grain:new THREE.Group(),previous:null,feedBatch:mode==='feed'?school.feeding.begin(6,0):null});c.interaction=interaction;
 let starts=0,navigations=0,taps=0;controls.addEventListener('start',()=>starts++);
 const dispose=bindCanvasGestures({canvas,controls,onNavigate(){navigations++;exitCameraAutomation(c);},onTap(){taps++;}});
 return {canvas,c,controls,camera,events,dispose,get starts(){return starts;},get navigations(){return navigations;},get taps(){return taps;}};
}
function assertPreserved(f){assert.equal(f.c.interaction.mode,'feed');assert.equal(f.c.school.feeding.latest().handEnded,false);assert.equal(f.c.followAnimal,'turtle');assert.ok(f.c.followFish);assert.ok(f.c.school.inspectionFish);assert.equal(f.c.settings.autoTour,true);assert.ok(f.c.transition);assert.equal(f.navigations,0);}
function assertReleased(f){assert.equal(f.c.interaction.mode,'idle');assert.equal(f.c.school.feeding.latest().handEnded,true);assert.equal(f.c.school.feeding.latest().unreleased,6);assert.equal(f.c.followAnimal,null);assert.equal(f.c.followFish,null);assert.equal(f.c.school.inspectionFish,null);assert.equal(f.c.settings.autoTour,false);assert.equal(f.c.transition,null);}

test('real OrbitControls starts on mouse press, but a stationary pond click preserves feeding and camera automation',()=>{
 const f=fixture();f.canvas.dispatch('pointerdown');assert.equal(f.starts,1);assertPreserved(f);f.canvas.dispatch('pointerup');assertPreserved(f);assert.equal(f.taps,1);f.dispose();f.controls.dispose();
});

test('real one-finger touch at the 6px boundary remains a tap and keeps the feeding batch',()=>{
 const f=fixture();f.canvas.dispatch('pointerdown',{pointerType:'touch'});assert.equal(f.starts,1);f.canvas.dispatch('pointermove',{pointerType:'touch',clientX:106});f.canvas.dispatch('pointerup',{pointerType:'touch',clientX:106});assertPreserved(f);assert.equal(f.taps,1);f.controls.dispose();
});

test('dragging beyond 6px releases actual hand interaction and follow targets before OrbitControls updates the camera',()=>{
 const f=fixture(),before=f.camera.position.clone();let exitedBeforeOrbit=false;f.controls.addEventListener('change',()=>{exitedBeforeOrbit=f.c.interaction.mode==='idle';});
 f.canvas.dispatch('pointerdown');f.canvas.dispatch('pointermove',{clientX:107});assertReleased(f);assert.equal(f.navigations,1);assert.equal(exitedBeforeOrbit,true);assert.ok(f.camera.position.distanceTo(before)>0);f.canvas.dispatch('pointerup',{clientX:107});assert.equal(f.taps,0);f.controls.dispose();
});

test('a drag returning to its starting point never becomes a tap and exits only once',()=>{
 const f=fixture();f.canvas.dispatch('pointerdown');f.canvas.dispatch('pointermove',{clientX:120});f.canvas.dispatch('pointermove');f.canvas.dispatch('pointerup');assertReleased(f);assert.equal(f.navigations,1);assert.equal(f.taps,0);f.controls.dispose();
});

test('wheel zoom releases feeding and camera automation while installed OrbitControls still zooms',()=>{
 const f=fixture(),before=f.camera.position.length();f.canvas.dispatch('wheel');assertReleased(f);assert.equal(f.navigations,1);assert.ok(Math.abs(f.camera.position.length()-before)>1e-8);assert.equal(f.taps,0);f.controls.dispose();
});

test('two-finger pinch releases feeding once and neither finger release creates a false tap',()=>{
 const f=fixture(),before=f.camera.position.length();f.canvas.dispatch('pointerdown',{pointerType:'touch'});assertPreserved(f);
 f.canvas.dispatch('pointerdown',{pointerId:2,pointerType:'touch',clientX:200});assertReleased(f);f.canvas.dispatch('pointermove',{pointerId:2,pointerType:'touch',clientX:240});assert.ok(Math.abs(f.camera.position.length()-before)>1e-8);
 f.canvas.dispatch('pointerup',{pointerId:2,pointerType:'touch',clientX:240});f.canvas.dispatch('pointerup',{pointerType:'touch'});assert.equal(f.navigations,1);assert.equal(f.taps,0);f.controls.dispose();
});

test('cancelled pointer cannot generate a stale click; a new pointer session works normally',()=>{
 const f=fixture();f.canvas.dispatch('pointerdown');f.canvas.dispatch('pointercancel');f.canvas.dispatch('pointerup');assert.equal(f.taps,0);assertPreserved(f);
 f.canvas.dispatch('pointerdown',{pointerId:2});f.canvas.dispatch('pointerup',{pointerId:2});assert.equal(f.taps,1);assertPreserved(f);f.controls.dispose();
});

test('cancelling one finger blocks a later false click from the remaining finger',()=>{
 const f=fixture();f.canvas.dispatch('pointerdown',{pointerType:'touch'});f.canvas.dispatch('pointerdown',{pointerId:2,pointerType:'touch',clientX:200});
 f.canvas.dispatch('pointercancel',{pointerId:2,pointerType:'touch',clientX:200});f.canvas.dispatch('pointerup',{pointerType:'touch'});assertReleased(f);assert.equal(f.taps,0);f.controls.dispose();
});

test('a wrong pointer id and a secondary mouse click cannot pick the pond',()=>{
 const f=fixture();f.canvas.dispatch('pointerdown');f.canvas.dispatch('pointerup',{pointerId:2});assert.equal(f.taps,0);f.canvas.dispatch('pointerup');assert.equal(f.taps,1);
 f.canvas.dispatch('pointerdown',{button:2});f.canvas.dispatch('pointerup',{button:2});assert.equal(f.taps,1);assertPreserved(f);f.controls.dispose();
});

test('manual dragging and wheel keep hand inspection visible while releasing automated camera movement',()=>{
 const f=fixture('inspect');f.canvas.dispatch('pointerdown');f.canvas.dispatch('pointermove',{clientX:120});f.canvas.dispatch('pointerup',{clientX:120});f.canvas.dispatch('wheel');
 assert.equal(f.c.interaction.mode,'inspect');assert.equal(f.c.interaction.rig.root.visible,true);assert.equal(f.c.followAnimal,null);assert.equal(f.c.followFish,null);assert.equal(f.c.settings.autoTour,false);assert.equal(f.c.transition,null);assert.equal(f.taps,0);f.controls.dispose();
});
