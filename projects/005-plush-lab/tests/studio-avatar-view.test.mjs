import test from 'node:test';
import assert from 'node:assert/strict';
import {mountStudioAvatarView,ORIGINAL_PLUSH_VIEWER} from '../src/studio-avatar-view.js';

class ElementStub {
  constructor(dataset={}) {
    this.dataset=dataset;this.hidden=false;this.disabled=false;this.tabIndex=0;
    this.attributes=new Map();this.writes=[];this.listeners=new Map();
    this.textContent='';this.value='';this.focused=false;
  }
  setAttribute(name,value){this.attributes.set(name,String(value));this.writes.push([name,String(value)]);}
  getAttribute(name){return this.attributes.get(name)??null;}
  addEventListener(type,handler){const handlers=this.listeners.get(type)||[];handlers.push(handler);this.listeners.set(type,handlers);}
  dispatch(type,packet={}){for(const handler of this.listeners.get(type)||[])handler(packet);}
  focus(){this.focused=true;}
}

function fixture(hash='') {
  const ids=['avatar-panel-companion','avatar-panel-reference','dress-link','reference-credit-link',
    'avatar-view-note','studio-reference-viewer','studio-reference-stage','studio-reference-status',
    'studio-reference-reload','studio-reference-fullscreen','studio-reference-exit','companion-world',
    'chat-input','panel-notes','panel-chat','agent-result'];
  const elements=new Map(ids.map(id=>['#'+id,new ElementStub()]));
  const tabs=['companion','reference'].map(view=>new ElementStub({avatarView:view}));
  const deskTabs=['chat','notes'].map(tab=>new ElementStub({tab}));
  tabs[0].setAttribute('aria-selected','true');tabs[1].setAttribute('aria-selected','false');tabs[1].tabIndex=-1;
  elements.get('#avatar-panel-reference').hidden=true;
  const card=new ElementStub(),stage=elements.get('#studio-reference-stage');stage.closest=selector=>selector==='.world-card'?card:null;
  const root=new ElementStub();root.querySelector=selector=>{
    const element=elements.get(selector);assert.ok(element,'Unexpected DOM lookup: '+selector);return element;
  };
  root.querySelectorAll=selector=>selector==='[data-avatar-view]'?tabs:selector==='[data-tab]'?deskTabs:[];
  stage.requestFullscreen=async()=>{root.fullscreenElement=stage;root.dispatch('fullscreenchange');};
  root.exitFullscreen=async()=>{root.fullscreenElement=null;root.dispatch('fullscreenchange');};
  const browser=new ElementStub();browser.location={hash,pathname:'/web/studio.html',search:'?fixture=1'};
  browser.history={calls:[],replaceState(state,title,path){this.calls.push(path);browser.location.hash=path.includes('#')?'#'+path.split('#')[1]:'';}};
  const previous=globalThis.window;globalThis.window=browser;
  return {root,tabs,deskTabs,elements,card,browser,restore(){if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}};
}

test('direct original-view entry mounts without an early callback reading the controller',()=>{
  const f=fixture('#reference');
  try {
    let notifications=0;
    const view=mountStudioAvatarView({root:f.root,onViewChange:()=>{notifications++;view.canInteract();}});
    assert.equal(notifications,0);
    assert.equal(view.view(),'reference');assert.equal(view.canInteract(),false);
    assert.equal(f.elements.get('#avatar-panel-companion').hidden,true);
    assert.equal(f.elements.get('#studio-reference-viewer').getAttribute('src'),ORIGINAL_PLUSH_VIEWER);
    assert.equal(f.browser.history.calls.length,0);
  } finally {f.restore();}
});

test('the original is loaded only on selection and both iframe identities survive repeated switches',()=>{
  const f=fixture();
  try {
    const ownFrame=f.elements.get('#companion-world'),reference=f.elements.get('#studio-reference-viewer');
    ownFrame.setAttribute('src','world.html?companion=1#world=saved-draft');
    const view=mountStudioAvatarView({root:f.root});
    assert.equal(reference.getAttribute('src'),null);
    for(let i=0;i<4;i++){view.select('reference');view.select('companion');}
    assert.deepEqual(reference.writes,[['src',ORIGINAL_PLUSH_VIEWER]]);
    assert.deepEqual(ownFrame.writes,[['src','world.html?companion=1#world=saved-draft']]);
    assert.equal(f.elements.get('#companion-world'),ownFrame);
    assert.equal(f.elements.get('#studio-reference-viewer'),reference);
  } finally {f.restore();}
});

test('late world readiness cannot make the original view interactive',()=>{
  const f=fixture('#reference');
  try {
    let worldReady=false;
    const controls=Array.from({length:5},()=>new ElementStub());
    const refreshActions=()=>{for(const control of controls)control.disabled=!worldReady||!view.canInteract();};
    const view=mountStudioAvatarView({root:f.root,onViewChange:refreshActions});
    refreshActions();assert.ok(controls.every(control=>control.disabled));
    worldReady=true;refreshActions();assert.ok(controls.every(control=>control.disabled));
    view.select('companion');assert.ok(controls.every(control=>!control.disabled));
    view.select('reference');assert.ok(controls.every(control=>control.disabled));
    worldReady=false;view.select('companion');assert.ok(controls.every(control=>control.disabled));
  } finally {f.restore();}
});

test('display switches preserve the draft, selected desk tab and existing Agent result',()=>{
  const f=fixture();
  try {
    const draft=f.elements.get('#chat-input'),result=f.elements.get('#agent-result');
    draft.value='还没保存的想法';result.textContent='已完成的本地任务结果';
    f.deskTabs[0].setAttribute('aria-selected','false');f.deskTabs[1].setAttribute('aria-selected','true');
    f.elements.get('#panel-chat').hidden=true;f.elements.get('#panel-notes').hidden=false;
    const view=mountStudioAvatarView({root:f.root});view.select('reference');view.select('companion');
    assert.equal(draft.value,'还没保存的想法');assert.equal(result.textContent,'已完成的本地任务结果');
    assert.equal(f.deskTabs[1].getAttribute('aria-selected'),'true');
    assert.equal(f.elements.get('#panel-chat').hidden,true);assert.equal(f.elements.get('#panel-notes').hidden,false);
  } finally {f.restore();}
});

test('avatar keyboard navigation moves only within its own tab list',()=>{
  const f=fixture();
  try {
    const view=mountStudioAvatarView({root:f.root});
    let prevented=0;const key=(tab,key)=>tab.dispatch('keydown',{key,preventDefault(){prevented++;}});
    key(f.tabs[0],'ArrowRight');assert.equal(view.view(),'reference');assert.equal(f.tabs[1].focused,true);
    assert.equal(f.tabs[1].tabIndex,0);assert.equal(f.tabs[0].tabIndex,-1);
    key(f.tabs[1],'Home');assert.equal(view.view(),'companion');
    key(f.tabs[0],'End');assert.equal(view.view(),'reference');
    key(f.tabs[1],'ArrowLeft');assert.equal(view.view(),'companion');
    key(f.tabs[0],'ArrowUp');assert.equal(view.view(),'companion');assert.equal(prevented,4);
    assert.ok(f.deskTabs.every(tab=>tab.listeners.size===0&&!tab.focused));
  } finally {f.restore();}
});

test('hash navigation changes only display mode and the original author credit follows the mode',()=>{
  const f=fixture();
  try {
    const view=mountStudioAvatarView({root:f.root});
    f.browser.location.hash='#reference';f.browser.dispatch('hashchange');
    assert.equal(view.view(),'reference');assert.equal(f.card.dataset.avatarView,'reference');
    assert.equal(f.elements.get('#dress-link').hidden,true);assert.equal(f.elements.get('#reference-credit-link').hidden,false);
    f.browser.location.hash='';f.browser.dispatch('hashchange');
    assert.equal(view.view(),'companion');assert.equal(f.elements.get('#dress-link').hidden,false);
    assert.equal(f.elements.get('#reference-credit-link').hidden,true);assert.equal(f.browser.history.calls.length,0);
  } finally {f.restore();}
});
