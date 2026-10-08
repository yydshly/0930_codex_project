import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSceneLoader} from '../src/lazy-scene.js';

test('concurrent scene loads share one initialization and retain the same scene', async () => {
  let release, calls=0;
  const value={model:'kept.glb'},load=createSceneLoader(()=>{
    calls++;
    return new Promise(resolve=>{release=resolve;});
  });
  const first=load(),second=load();
  assert.equal(first,second);
  await Promise.resolve();
  assert.equal(calls,1);
  release(value);
  assert.equal(await first,value);
  assert.equal(await second,value);
  assert.equal(await load(),value);
  assert.equal(calls,1);
});

test('failed initialization releases its slot so a later shared attempt can succeed', async () => {
  let calls=0;
  const value={ready:true},load=createSceneLoader(()=>{
    calls++;
    if(calls===1)throw new Error('WebGL unavailable');
    return value;
  });
  const first=load(),sameAttempt=load();
  assert.equal(first,sameAttempt);
  await assert.rejects(first,/WebGL unavailable/);
  const retry=load(),sharedRetry=load();
  assert.equal(retry,sharedRetry);
  assert.equal(await retry,value);
  assert.equal(calls,2);
});

// Exercise the actual selectTab implementation, with a controlled paint boundary
// and a minimal DOM. This catches stale activation/hash writes in main.js itself.
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const selectionSource=main.slice(main.indexOf('const ensureCourtyard='),main.indexOf("\nfor(const b of all('[data-tab]'))"));
assert.ok(selectionSource.includes('async function selectTab('));
function fixture({failFirst=false}={}) {
  const panels=['original','scene','tech'].map(id=>({id,hidden:true})),tabs=panels.map(panel=>({dataset:{tab:panel.id},attributes:{},setAttribute(key,value){this.attributes[key]=value;}}));
  const elements={'original-frame':{src:'about:blank'},'scene-loader':{hidden:false,textContent:''},'scene-canvas':{}};
  const raf=[],hashWrites=[],activations=[],errors=[];
  let constructors=0,statuses=0,panelUpdates=0,api;
  class Courtyard {
    constructor(){constructors++;if(failFirst&&constructors===1)throw new Error('WebGL unavailable');this._active=false;this.settings={paused:true};this.time=18.7;this.imported={name:'kept.glb'};this.phase='release';this.resizeCount=0;}
    set active(value){this._active=value;activations.push({value,visible:!panels.find(panel=>panel.id==='scene').hidden});}
    get active(){return this._active;}
    resize(){this.resizeCount++;}
    reset(){throw new Error('Navigation must not reset the scene.');}
  }
  const deps={
    $:id=>elements[id],all:selector=>selector==='main>section'?panels:tabs,
    Courtyard,onStatus(){statuses++;},loadOriginal(){elements['original-frame'].src='upstream/koi-pond.html';},
    requestAnimationFrame:callback=>raf.push(callback),clearInterval(){},
    location:{hash:''},history:{replaceState(a,b,hash){deps.location.hash=hash;hashWrites.push(hash);}},
    console:{error:error=>errors.push(error.message)},panel:{update(){panelUpdates++;}},
  };
  api=new Function('createSceneLoader','deps',`
    const {$,all,Courtyard,onStatus,loadOriginal,requestAnimationFrame,clearInterval,location,history,console}=deps;
    let courtyard=null,currentTab=null,originalPoll=null;
    const principlePanel=deps.panel,experimentPanel=deps.panel,bindingPanel=deps.panel,calibrationPanel=deps.panel,tourPanel=deps.panel,feedingPanel=deps.panel,wildlifePanel=deps.panel;
    ${selectionSource}
    return {selectTab,getState:()=>({courtyard,currentTab})};
  `)(createSceneLoader,deps);
  return {...api,panels,elements,hashWrites,activations,errors,
    get constructors(){return constructors;},get statuses(){return statuses;},get panelUpdates(){return panelUpdates;},
    async paint(){await Promise.resolve();const pending=raf.splice(0);assert.equal(pending.length,1,'one initializer owns the paint wait');pending.forEach(callback=>callback());},
  };
}

test('an older first scene request cannot activate the hidden scene or overwrite the latest page hash', async () => {
  const f=fixture(),pending=f.selectTab('scene');
  await f.selectTab('original');
  await f.paint();await pending;
  assert.equal(f.constructors,1);
  assert.equal(f.getState().currentTab,'original');
  assert.equal(f.getState().courtyard.active,false);
  assert.equal(f.panels.find(panel=>panel.id==='scene').hidden,true);
  assert.equal(f.panels.find(panel=>panel.id==='original').hidden,false);
  assert.deepEqual(f.hashWrites,['#scene','#original']);
  assert.ok(f.activations.every(entry=>!entry.value||entry.visible));
});

test('scene, another page, then scene reuse the pending constructor and honor the newest selection', async () => {
  const f=fixture(),older=f.selectTab('scene');
  await f.selectTab('tech');
  const newer=f.selectTab('scene');
  await f.paint();await Promise.all([older,newer]);
  assert.equal(f.constructors,1);
  assert.equal(f.getState().currentTab,'scene');
  assert.equal(f.getState().courtyard.active,true);
  assert.equal(f.getState().courtyard.resizeCount,1);
  assert.deepEqual(f.hashWrites,['#scene','#tech','#scene']);
  assert.ok(f.activations.every(entry=>!entry.value||entry.visible));
});

test('a failed first scene attempt can retry even when its page remains selected', async () => {
  const f=fixture({failFirst:true}),failed=f.selectTab('scene');
  await f.paint();await failed;
  assert.equal(f.getState().courtyard,null);
  assert.match(f.elements['scene-loader'].textContent,/WebGL unavailable/);
  const retry=f.selectTab('scene');
  await f.paint();await retry;
  assert.equal(f.constructors,2);
  assert.equal(f.getState().courtyard.active,true);
  assert.equal(f.elements['scene-loader'].hidden,true);
  assert.deepEqual(f.errors,['WebGL unavailable']);
});

test('later page navigation retains the existing imported scene and simulation state', async () => {
  const f=fixture(),initial=f.selectTab('scene');
  await f.paint();await initial;
  const c=f.getState().courtyard,model=c.imported,settings=c.settings;
  await f.selectTab('original');await f.selectTab('scene');
  assert.equal(f.constructors,1);
  assert.equal(f.getState().courtyard,c);
  assert.equal(c.imported,model);
  assert.equal(c.settings,settings);
  assert.equal(c.settings.paused,true);
  assert.equal(c.time,18.7);
  assert.equal(c.phase,'release');
  assert.equal(c.active,true);
});
