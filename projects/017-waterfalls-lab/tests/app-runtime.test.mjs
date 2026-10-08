import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build,stop} from '../tooling/node_modules/esbuild/lib/main.js';
import {PerspectiveCamera,Vector3,WebGPUCoordinateSystem} from '../tooling/node_modules/three/build/three.module.js';
import {DEFAULT_SCENE,PROJECT_LIMITS,encodeProject,decodeProject} from '../src/project.js';
import {buildTerrainField,combineObjects} from '../src/voxel.js';

// Run the actual app's event handlers against small DOM/GPU doubles. This is
// command-level coverage, not browser layout, pointer capture, or WebGPU QA.
const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/app.js',import.meta.url))],bundle:true,platform:'node',format:'esm',target:'es2022',write:false,nodePaths:[fileURLToPath(new URL('../tooling/node_modules',import.meta.url))],logLevel:'silent',plugins:[{name:'mock-gpu',setup(builder){builder.onResolve({filter:/^\.\/gpu\.js$/},()=>({path:'gpu',namespace:'test'}));builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const WaterfallEngine=globalThis.__WaterfallEngine;',loader:'js'}));}}]});
stop();let run=0;
class Element {
  constructor(tag='div',attrs=''){
    this.tag=tag;this.listeners=new Map();this.dataset={};this.style={};this.options=[];this.children=[];this.value='';this.textContent='';this.hidden=/\bhidden\b/.test(attrs);this.disabled=/\bdisabled\b/.test(attrs);this.checked=/\bchecked\b/.test(attrs);
    const classes=new Set();this.classList={add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,force)=>{const on=force??!classes.has(v);on?classes.add(v):classes.delete(v);return on;},contains:v=>classes.has(v)};
    for(const match of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){const [,key,value]=match;if(key.startsWith('data-'))this.dataset[key.slice(5)]=value;else this[key]=value;}
  }
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  emit(type,patch={}){const event={type,target:this,button:0,pointerType:'mouse',pointerId:1,clientX:320,clientY:180,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false,key:'',preventDefault(){this.prevented=true;},...patch};for(const fn of this.listeners.get(type)||[])fn(event);return event;}
  click(){this.emit('click');}
  focus(){this.focused=true;}
  replaceChildren(...children){this.children=children;this.options=children;}
  append(...children){this.children.push(...children);this.options=this.children;}
  setAttribute(key,value){this[key]=String(value);}
  querySelector(){return new Element();}
  matches(){return ['input','select','textarea'].includes(this.tag);}
  getBoundingClientRect(){return {left:0,top:0,width:640,height:360};}
  setPointerCapture(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
}
async function runtime(scene,fn){
  const ids=new Map(),buttons=[];
  for(const match of html.matchAll(/<([\w-]+)([^>]*\bid="([^"]+)"[^>]*)>/g))ids.set(match[3],new Element(match[1],match[2]));
  for(const match of html.matchAll(/<button([^>]*\bdata-(?:tool|preset|light|view)="[^"]+"[^>]*)>/g))buttons.push(new Element('button',match[1]));
  for(const match of html.matchAll(/<select([^>]*)>([\s\S]*?)<\/select>/g)){
    const id=/\bid="([^"]+)"/.exec(match[1])?.[1];if(!id)continue;const el=ids.get(id);
    el.options=[...match[2].matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map(m=>new Element('option',m[1]));el.children=el.options;el.value=(el.options.find(o=>o.selected!==undefined)||el.options[0])?.value||'';
    const selected=/<option[^>]*value="([^"]*)"[^>]*\bselected\b/.exec(match[2]);if(selected)el.value=selected[1];
  }
  const body=new Element('body'),label=new Element(),doc=new Element('document');
  doc.body=body;doc.hidden=false;doc.createElement=tag=>new Element(tag);
  doc.querySelector=selector=>{if(selector.startsWith('#')){assert.ok(ids.has(selector.slice(1)),'unknown control '+selector);return ids.get(selector.slice(1));}if(selector==='dialog[open]')return [...ids.values()].find(e=>e.tag==='dialog'&&e.open)||null;if(selector==='.scene-label>span')return label;throw new Error('unsupported selector '+selector);};
  doc.querySelectorAll=selector=>{const key=/^\[data-([\w-]+)\]$/.exec(selector)?.[1];assert.ok(key);return buttons.filter(b=>b.dataset[key]!==undefined);};
  const timers=new Map(),intervals=[],storage=new Map([['waterfalls-lab:v2:autosave',encodeProject(scene,null,'事件验证')]]);let timerId=0,time=1000,engine;
  class MockEngine {
    constructor(canvas){engine=this;this.canvas=canvas;this.state=structuredClone(DEFAULT_SCENE);this.stats={fps:0};this.frame=0;this.meshUpdates=0;this.collisionUpdates=0;this.collisionHints=[];this.worldReady=0;this.worldVersion=0;}
    async init(){this.device={};this.camera=new PerspectiveCamera(43,640/360,.1,100);this.camera.coordinateSystem=WebGPUCoordinateSystem;this.camera.position.set(0,3,10);this.controls={target:new Vector3(0,3,0),mouseButtons:{},touches:{},addEventListener(){},update:()=>{this.camera.lookAt(this.controls.target);this.camera.updateMatrixWorld();this.camera.updateProjectionMatrix();}};this.controls.update();this.terrainField=buildTerrainField(this.state.preset,this.state.edits);this.collisionField=combineObjects(this.terrainField,this.state.objects);this.collisionRevision=1;}
    cameraState(){return {position:this.camera.position.toArray(),target:this.controls.target.toArray()};}
    restoreCamera(camera){if(camera){this.camera.position.fromArray(camera.position);this.controls.target.fromArray(camera.target);this.controls.update();}}
    rebuildWorld(){this.meshUpdates++;}
    updateObjects(indices=[]){this.collisionUpdates++;this.collisionHints.push([...indices]);const next=combineObjects(this.terrainField,this.state.objects);this.collisionField??=next;this.collisionField.set(next);this.collisionRevision=(this.collisionRevision||0)+1;}
    updateTerrain(){this.terrainField=buildTerrainField(this.state.preset,this.state.edits);this.updateObjects();}
    updateSources(){}
    reset(){this.updateTerrain();}
    resize(){}
    setView(){this.camera.position.set(14,12,23);this.controls.update();}
  }
  const win=new Element('window');
  const globals={document:doc,window:win,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Option:class extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;}},matchMedia:()=>({matches:false}),setTimeout:(f)=>{timers.set(++timerId,f);return timerId;},clearTimeout:id=>timers.delete(id),setInterval:f=>{intervals.push(f);return intervals.length;},performance:{now:()=>time},__WaterfallEngine:MockEngine};
  const previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  try{
    for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
    await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64')+'#'+(++run));
    assert.equal(body.dataset.status,'ready');const el=id=>ids.get(id),tool=value=>buttons.find(b=>b.dataset.tool===value).click();
    await fn({engine,el,tool,doc,win,tick:ms=>{time+=ms;},storage,timers,runIntervals:()=>intervals.forEach(f=>f())});
  }finally{for(const [key,descriptor] of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}
}
const scene=()=>{const s=structuredClone(DEFAULT_SCENE);s.objects=[{id:'rock',type:'rock',position:[0,3,0],scale:[.85,.7,.77],rotation:.6}];return s;};

test('actual selection and stationary drag leave scene and undo history unchanged',async()=>runtime(scene(),({engine,el,tool})=>{
  tool('move');el('world').emit('pointerdown',{clientX:332});el('world').emit('pointermove',{clientX:332});el('world').emit('pointerup',{clientX:332});
  assert.deepEqual(engine.state.objects[0].position,[0,3,0]);assert.equal(el('undo').disabled,true);assert.equal(engine.collisionUpdates,0);assert.equal(el('object-controls').hidden,false);
}));

test('actual drag commits its final sample as one undoable edit and refreshes position controls',async()=>runtime(scene(),({engine,el,tool,doc,tick})=>{
  tool('move');el('world').emit('pointerdown',{clientX:332});el('world').emit('pointermove',{clientX:342});tick(5);el('world').emit('pointerup',{clientX:352});
  const x=engine.state.objects[0].position[0],expected=20*2*Math.tan(43*Math.PI/360)*10/360;
  assert.ok(Math.abs(x-expected)<1e-6);assert.equal(el('object-pos-x').value,x.toFixed(2));assert.equal(el('undo').disabled,false);assert.equal(engine.collisionUpdates,2);
  doc.emit('keydown',{ctrlKey:true,key:'z'});assert.deepEqual(engine.state.objects[0].position,[0,3,0]);assert.equal(el('undo').disabled,true);assert.equal(el('redo').disabled,false);
  doc.emit('keydown',{ctrlKey:true,shiftKey:true,key:'z'});assert.ok(Math.abs(engine.state.objects[0].position[0]-expected)<1e-6);
}));

test('actual work switching clears stale object controls and full undo restores the work',async()=>runtime(scene(),({engine,el})=>{
  el('object-select').value='0';el('object-select').emit('change');assert.equal(el('object-controls').hidden,false);
  const before=structuredClone(engine.state);el('confluence-example').click();assert.equal(engine.state.objects.length,0);assert.equal(el('object-controls').hidden,true);assert.equal(el('work-name').value,'双瀑汇流');
  el('undo').click();assert.deepEqual(engine.state,before);assert.equal(el('work-name').value,'事件验证');assert.equal(el('object-controls').hidden,true);
}));

test('actual mirror buttons and Ctrl D preserve independent object and source configurations',async()=>{
  const s=scene();s.objects[0].position[0]=1;s.source=[1.5,8,-2];s.sourceConfig.yaw=37;s.sourceConfig.enabled=false;
  await runtime(s,({engine,el,tool,doc})=>{
    el('object-select').value='0';el('object-select').emit('change');el('mirror-object').click();assert.equal(engine.state.objects.length,2);assert.equal(engine.state.objects[1].position[0],-1);assert.equal(engine.state.objects[1].rotation,-.6);
    doc.emit('keydown',{ctrlKey:true,key:'d'});assert.equal(engine.state.objects.length,3);assert.equal(new Set(engine.state.objects.map(o=>o.id)).size,3);
    tool('spring');el('source-mirror').click();assert.equal(engine.state.extraSources.length,1);assert.deepEqual(engine.state.extraSources[0].position,[-1.5,8,-2]);assert.equal(engine.state.extraSources[0].yaw,-37);assert.equal(engine.state.extraSources[0].enabled,false);
    doc.emit('keydown',{ctrlKey:true,key:'d'});assert.equal(engine.state.extraSources.length,2);assert.equal(engine.state.extraSources[1].enabled,true);assert.equal(engine.state.extraSources[0].enabled,false);
  });
});

test('actual direction controls support snapped horizontal motion, Shift rebasing and touch elevation',async()=>{
  await runtime(scene(),({engine,el,tool})=>{
    engine.camera.position.set(0,7,10);engine.controls.update();tool('move');el('move-axis').value='x';el('move-snap').value='.25';
    el('world').emit('pointerdown',{clientX:332});el('world').emit('pointermove',{clientX:352});assert.deepEqual(engine.state.objects[0].position,[.5,3,0]);
    el('world').emit('pointermove',{clientX:352,clientY:170,shiftKey:true});assert.deepEqual(engine.state.objects[0].position,[.5,3,0]);
    el('world').emit('pointermove',{clientX:352,clientY:150,shiftKey:true});assert.deepEqual(engine.state.objects[0].position,[.5,3.25,0]);
    el('world').emit('pointermove',{clientX:400,clientY:150});el('world').emit('pointerup',{clientX:400,clientY:150});assert.deepEqual(engine.state.objects[0].position,[.5,3.25,0]);
    el('undo').click();assert.deepEqual(engine.state.objects[0].position,[0,3,0]);
  });
  await runtime(scene(),({engine,el,tool,timers})=>{
    tool('move');el('move-axis').value='y';el('move-snap').value='.1';el('world').emit('pointerdown',{pointerType:'touch',clientX:332});
    const [id,begin]=[...timers.entries()].at(-1);timers.delete(id);begin();
    el('world').emit('pointermove',{pointerType:'touch',clientX:332,clientY:160});el('world').emit('pointerup',{pointerType:'touch',clientX:332,clientY:160});
    assert.deepEqual(engine.state.objects[0].position,[0,3.4,0]);assert.equal(el('object-pos-y').value,'3.40');
  });
});

const groupScene=()=>{const s=scene();s.objects.push({...structuredClone(s.objects[0]),id:'second',position:[-2,3,0]});return s;};
test('actual named camera views restore exact poses and undo list edits without resetting liquid',async()=>runtime(scene(),({engine,el,storage,win})=>{
  engine.camera.position.set(7,8,9);engine.controls.target.set(0,4,0);engine.controls.update();const first=engine.cameraState();el('camera-view-name').value='洞口';el('camera-view-add').click();
  engine.camera.position.set(18,8,1);engine.controls.target.set(0,3,0);engine.controls.update();const second=engine.cameraState();el('camera-view-name').value='侧景';el('camera-view-add').click();assert.equal(engine.state.cameraViews.length,2);
  el('camera-view-select').value='0';el('camera-view-select').emit('change');assert.deepEqual(engine.cameraState(),first);assert.equal(el('camera-view-name').value,'洞口');
  engine.restoreCamera(second);el('camera-view-name').value='更新近景';el('camera-view-update').click();assert.deepEqual(engine.state.cameraViews[0].camera,second);assert.equal(engine.state.cameraViews[0].name,'更新近景');
  el('undo').click();assert.deepEqual(engine.state.cameraViews[0].camera,first);el('redo').click();assert.equal(engine.state.cameraViews[0].name,'更新近景');
  el('camera-view-select').value='1';el('camera-view-select').emit('change');el('camera-view-remove').click();assert.equal(engine.state.cameraViews.length,1);el('undo').click();assert.equal(engine.state.cameraViews.length,2);assert.equal(engine.collisionUpdates,0);
  win.emit('pagehide');assert.deepEqual(decodeProject(storage.get('waterfalls-lab:v2:autosave')).scene.cameraViews,engine.state.cameraViews);
}));
test('actual camera view capacity refuses an extra view without history and work switching resets the selected view',async()=>{
  const s=scene();s.cameraViews=Array.from({length:8},(_,i)=>({name:'镜头 '+i,camera:{position:[0,3,10],target:[0,3,0]}}));
  await runtime(s,({engine,el})=>{
    el('camera-view-add').click();assert.equal(engine.state.cameraViews.length,8);assert.equal(el('undo').disabled,true);assert.match(el('toast').textContent,/8/);
    el('camera-view-select').value='7';el('camera-view-select').emit('change');el('camera-view-name').value='第八镜头';el('camera-view-update').click();assert.equal(engine.state.cameraViews.length,8);
    el('confluence-example').click();assert.equal(engine.state.cameraViews.length,0);assert.equal(el('camera-view-update').disabled,true);el('undo').click();assert.equal(engine.state.cameraViews[7].name,'第八镜头');assert.equal(el('camera-view-select').value,'');
  });
});
test('actual immersive viewing exits by button or Escape and blocks hidden editing shortcuts',async()=>runtime(scene(),({engine,el,tool,doc})=>{
  tool('move');const before=structuredClone(engine.state);el('immersive-toggle').click();assert.equal(doc.body.classList.contains('clean'),true);assert.equal(doc.body.classList.contains('editing'),false);assert.equal(el('immersive-exit').hidden,false);assert.equal(el('immersive-exit').focused,true);
  for(const key of ['b','x','r','Delete'])doc.emit('keydown',{key});assert.deepEqual(engine.state,before);assert.equal(el('undo').disabled,true);
  doc.emit('keydown',{code:'Space'});assert.equal(engine.state.paused,true);doc.emit('keydown',{key:'Escape'});assert.equal(doc.body.classList.contains('clean'),false);assert.equal(doc.body.classList.contains('editing'),true);assert.equal(el('immersive-exit').hidden,true);
  doc.emit('keydown',{key:'h'});assert.equal(doc.body.classList.contains('clean'),true);el('immersive-exit').click();assert.equal(doc.body.classList.contains('clean'),false);assert.equal(el('immersive-toggle')['aria-pressed'],'false');
}));
test('actual jet preview refreshes after collisions change in the same reused field array',async()=>{
  const s=scene();s.source=[0,6,0];s.sourceConfig.pitch=-90;s.sourceConfig.speed=0;
  await runtime(s,({engine,el,tool,runIntervals})=>{
    tool('move');el('object-select').value='0';el('object-select').emit('change');tool('spring');runIntervals();const first=el('source-flight-status').textContent,field=engine.collisionField;
    assert.match(first,/预计首次触地/);tool('move');el('object-pos-x').valueAsNumber=2;el('object-pos-x').emit('change');assert.equal(engine.collisionField,field);tool('spring');runIntervals();const second=el('source-flight-status').textContent;assert.match(second,/预计首次触地/);assert.notEqual(second,first);
    el('undo').click();runIntervals();assert.equal(el('source-flight-status').textContent,first);
  });
});
test('actual source markers hide outside the camera viewport and return when a saved view brings them into sight',async()=>{
  const s=scene();s.source=[0,3,0];s.extraSources=[[5,3,4],[0,12,0]].map(position=>({...structuredClone(s.sourceConfig),position}));
  await runtime(s,({engine,el,tool,runIntervals})=>{
    tool('spring');runIntervals();const markers=el('source-markers').children;
    assert.deepEqual(markers.map(marker=>marker.hidden),[false,true,true]);
    engine.restoreCamera({position:[5,3,10],target:[5,3,0]});runIntervals();
    assert.equal(markers[1].hidden,false);assert.equal(markers[2].hidden,true);
    engine.restoreCamera({position:[0,3,10],target:[0,3,0]});runIntervals();
    assert.equal(markers[1].hidden,true);
  });
});
test('actual size, height, rotation, precise coordinates and grounding identify only the edited object',async()=>runtime(groupScene(),({engine,el})=>{
  el('object-select').value='0';el('object-select').emit('change');
  for(const [id,value] of [['obj-x','.7'],['obj-y','.5'],['obj-z','.6'],['obj-height','4'],['obj-rotation','45']]){el(id).value=value;el(id).emit('input');}
  el('object-pos-x').valueAsNumber=1.25;el('object-pos-x').emit('change');assert.equal(engine.state.objects[0].position[0],1.25);el('snap-ground').click();
  assert.equal(engine.collisionHints.length,7);assert.ok(engine.collisionHints.every(indices=>JSON.stringify(indices)==='[0]'));assert.deepEqual(engine.state.objects[1].position,[-2,3,0]);
}));
test('actual additive selection and group drag preserve spacing and form one undoable edit',async()=>runtime(groupScene(),({engine,el,tool,doc})=>{
  tool('move');el('world').emit('pointerdown',{ctrlKey:true});el('world').emit('pointerup');el('world').emit('pointerdown',{clientX:228,ctrlKey:true});el('world').emit('pointerup',{clientX:228});
  assert.deepEqual(engine.selection,[0,1]);assert.equal(el('object-properties').hidden,true);assert.equal(el('undo').disabled,true);
  el('world').emit('pointerdown');el('world').emit('pointermove',{clientX:340});el('world').emit('pointerup',{clientX:340});
  assert.equal(engine.state.objects[0].position[1],3);assert.ok(Math.abs(engine.state.objects[0].position[0]-engine.state.objects[1].position[0]-2)<1e-8);assert.ok(engine.state.objects[0].position[0]>.4);
  assert.ok(engine.collisionHints.length>0);assert.ok(engine.collisionHints.every(indices=>JSON.stringify(indices)==='[0,1]'));
  el('undo').click();assert.deepEqual(engine.state.objects.map(o=>o.position),[[0,3,0],[-2,3,0]]);assert.equal(el('undo').disabled,true);
  doc.emit('keydown',{ctrlKey:true,key:'a'});assert.deepEqual(engine.selection,[0,1]);el('selection-additive').checked=true;el('object-select').value='0';el('object-select').emit('change');assert.deepEqual(engine.selection,[1]);assert.equal(el('object-properties').hidden,false);
  el('selection-clear').click();assert.deepEqual(engine.selection,[]);assert.equal(el('object-controls').hidden,true);
}));

test('actual batch copy, mirror, deletion and ground placement each undo as a whole',async()=>runtime(groupScene(),({engine,el,tool})=>{
  tool('move');el('select-all').click();el('clone-object').click();assert.equal(engine.state.objects.length,4);assert.deepEqual(engine.selection,[2,3]);
  const copies=engine.state.objects.slice(2).map(o=>[...o.position]);assert.ok(Math.abs(copies[0][0]-copies[1][0]-2)<1e-8);
  el('mirror-object').click();assert.equal(engine.state.objects.length,6);assert.deepEqual(engine.selection,[4,5]);copies.forEach((p,i)=>assert.deepEqual(engine.state.objects[i+4].position,[-p[0],p[1],p[2]]));
  el('delete-object').click();assert.equal(engine.state.objects.length,4);el('undo').click();assert.equal(engine.state.objects.length,6);el('undo').click();assert.equal(engine.state.objects.length,4);el('undo').click();assert.equal(engine.state.objects.length,2);assert.equal(el('undo').disabled,true);
  el('select-all').click();el('snap-ground').click();assert.ok(engine.state.objects.every(o=>o.position[1]<1));el('undo').click();assert.ok(engine.state.objects.every(o=>o.position[1]===3));
}));

test('pagehide commits pending drag and visibility change saves the latest camera without the debounce delay',async()=>runtime(groupScene(),({engine,el,tool,doc,win,storage,tick})=>{
  const before=storage.get('waterfalls-lab:v2:autosave');tool('move');el('select-all').click();el('world').emit('pointerdown');el('world').emit('pointermove',{clientX:330});tick(5);el('world').emit('pointermove',{clientX:340});
  assert.equal(storage.get('waterfalls-lab:v2:autosave'),before);win.emit('pagehide');const saved=decodeProject(storage.get('waterfalls-lab:v2:autosave'));
  assert.deepEqual(saved.scene.objects.map(o=>o.position),engine.state.objects.map(o=>o.position));assert.ok(saved.scene.objects[0].position[0]>.4);assert.equal(el('autosave-state').textContent,'已自动保存');assert.equal(engine.collisionUpdates,2);
  engine.camera.position.x=1.5;engine.controls.update();doc.hidden=true;doc.emit('visibilitychange');assert.equal(decodeProject(storage.get('waterfalls-lab:v2:autosave')).camera.position[0],1.5);
}));

test('failed autosave preserves the last file, reports failure, retries, and skips failed initialization',async()=>runtime(scene(),({engine,el,doc,win,storage})=>{
  const key='waterfalls-lab:v2:autosave',before=storage.get(key),write=globalThis.localStorage.setItem;el('flow').value='2';el('flow').emit('input');globalThis.localStorage.setItem=()=>{throw new Error('quota');};
  win.emit('pagehide');assert.equal(storage.get(key),before);assert.equal(doc.body.dataset.saved,'failed');assert.equal(el('autosave-state').textContent,'保存失败，请导出作品文件');assert.equal(el('toast').textContent,'保存失败，请导出作品文件');
  globalThis.localStorage.setItem=write;win.emit('pagehide');assert.equal(decodeProject(storage.get(key)).scene.flow,2);assert.equal(doc.body.dataset.saved,'yes');
  const last=storage.get(key);doc.body.dataset.status='error';engine.state.flow=3;win.emit('pagehide');assert.equal(storage.get(key),last);
}));

test('export tracks the work name, invalidates old files after edits, and leaves text shortcuts native',async()=>runtime(scene(),({engine,el,doc,win,storage,tool})=>{
  el('work-name').value='带走的山谷';el('export-work').click();assert.equal(el('work-download').hidden,false);assert.equal(JSON.parse(decodeURIComponent(el('work-download').href.split(',').slice(1).join(','))).name,'带走的山谷');
  win.emit('pagehide');assert.equal(decodeProject(storage.get('waterfalls-lab:v2:autosave')).name,'带走的山谷');el('export-work').click();el('work-name').emit('input');assert.equal(el('work-download').hidden,true);
  el('export-work').click();el('flow').value='2';el('flow').emit('input');assert.equal(el('work-download').hidden,true);
  tool('move');el('select-all').click();el('clone-object').click();const count=engine.state.objects.length;
  for(const key of ['a','d','z']){const event=doc.emit('keydown',{target:el('object-pos-x'),ctrlKey:true,key});assert.equal(event.prevented,undefined);assert.equal(engine.state.objects.length,count);}
}));

test('batch duplication at the existing file capacity leaves the work and history unchanged',async()=>{
  const s=scene();s.objects=Array.from({length:PROJECT_LIMITS.objects},(_,i)=>({...structuredClone(s.objects[0]),id:'object-'+i}));
  await runtime(s,({engine,el,tool})=>{tool('move');el('select-all').click();el('clone-object').click();assert.equal(engine.state.objects.length,PROJECT_LIMITS.objects);assert.equal(el('undo').disabled,true);assert.equal(el('toast').textContent,'这组副本超过作品的 2,000 件容量，可减少选择后再复制。');});
});

test('additive mode drags selected groups directly, toggles taps, and keeps selection after constrained movement',async()=>runtime(groupScene(),({engine,el,tool})=>{
  tool('move');el('select-all').click();el('selection-additive').checked=true;
  el('world').emit('pointerdown');el('world').emit('pointermove',{clientX:340});el('world').emit('pointerup',{clientX:340});assert.deepEqual(engine.selection,[0,1]);assert.ok(engine.state.objects[0].position[0]>.4);
  el('world').emit('pointerdown',{clientX:340});el('world').emit('pointerup',{clientX:340});assert.deepEqual(engine.selection,[1]);
  el('select-all').click();el('move-axis').value='z';const positions=engine.state.objects.map(o=>[...o.position]);
  el('world').emit('pointerdown',{clientX:340});el('world').emit('pointermove',{clientX:360});el('world').emit('pointerup',{clientX:360});assert.deepEqual(engine.selection,[0,1]);assert.deepEqual(engine.state.objects.map(o=>o.position),positions);
  el('undo').click();assert.deepEqual(engine.state.objects.map(o=>o.position),[[0,3,0],[-2,3,0]]);assert.equal(el('undo').disabled,true);
}));
