import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPlushReferenceView,plushViewFromUrl,plushViewUrl,ORIGINAL_PLUSH_PAGE} from '../src/plush-reference-view.js';

class NodeStub {
  constructor(tagName='div') {
    this.tagName=tagName.toUpperCase();this.children=[];this.parentElement=null;
    this.attributes=new Map();this.attributeWrites=[];this.listeners=new Map();
    this.dataset={};this.className='';this.id='';this.textContent='';this.value='';
    this.hidden=false;this.inert=false;this.disabled=false;this.tabIndex=0;this.focused=false;
    this.classList={add:(name)=>{this.className=[this.className,name].filter(Boolean).join(' ');}};
  }
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  prepend(child){child.parentElement=this;this.children.unshift(child);}
  insertBefore(child,before){const index=this.children.indexOf(before);assert.ok(index>=0);child.parentElement=this;this.children.splice(index,0,child);}
  setAttribute(name,value){this.attributes.set(name,String(value));this.attributeWrites.push([name,String(value)]);}
  getAttribute(name){return this.attributes.get(name)??null;}
  addEventListener(type,handler){const handlers=this.listeners.get(type)||[];handlers.push(handler);this.listeners.set(type,handlers);}
  dispatch(type,event={}){return Promise.all((this.listeners.get(type)||[]).map(handler=>handler(event)));}
  focus(){this.focused=true;}
}

const descendants=node=>[node,...node.children.flatMap(descendants)];
const byClass=(node,name)=>descendants(node).find(item=>item.className.split(' ').includes(name));

function fixture(href='http://localhost:8875/projects/005-plush-lab/web/index.html?v=run#recipe=eyJzYXZlZCI6MX0') {
  const stage=new NodeStub('section'),nativeStage=new NodeStub('div'),nativeControls=new NodeStub('div');
  const canvas=new NodeStub('canvas'),slider=new NodeStub('input'),importDraft=new NodeStub('textarea');
  slider.value='0.72';importDraft.value='未提交的配方';nativeStage.append(canvas);nativeControls.append(slider,importDraft);
  const aside=new NodeStub('aside');aside.append(nativeControls);stage.append(nativeStage);
  const root=new NodeStub('document');root.createElement=tag=>new NodeStub(tag);
  const browser=new NodeStub('window');browser.location={href};
  browser.history={state:{returnTo:'existing-artwork'},calls:[],replaceState(state,title,next){this.state=state;this.calls.push({state,title,href:next});browser.location.href=next;}};
  const hiddenExtra=new NodeStub(),visibleExtra=new NodeStub();hiddenExtra.hidden=true;
  return {root,browser,stage,nativeStage,nativeControls,aside,canvas,slider,importDraft,hiddenExtra,visibleExtra,
    mount(options={}){return mountPlushReferenceView({stage,nativeStage,nativeControls,root,browser,...options});},
    tabs(){return byClass(stage,'plush-view-tabs').children;},
    action(name){return descendants(aside).find(node=>node.dataset.plushAction===name);},
    field(type){return descendants(aside).find(node=>node.tagName==='INPUT'&&node.type===type);}};
}

test('both asset choices retain the same interactive canvas without mounting an iframe',async()=>{
  const f=fixture(),view=f.mount();let pointerEvents=0;
  f.canvas.addEventListener('pointerdown',()=>pointerEvents++);
  assert.equal(view.view(),'native');assert.equal(view.canInteract(),true);
  view.select('reference');await f.canvas.dispatch('pointerdown');
  for(let index=0;index<4;index++){view.select('native');view.select('reference');}
  await f.canvas.dispatch('pointerdown');
  assert.equal(pointerEvents,2);assert.equal(view.canInteract(),true);
  assert.equal(f.nativeStage.hidden,false);assert.equal(f.nativeStage.inert,false);
  assert.deepEqual(descendants(f.stage).filter(node=>node.tagName==='CANVAS'),[f.canvas]);
  assert.equal(descendants(f.stage).some(node=>node.tagName==='IFRAME'),false);
  for(const tab of f.tabs())assert.equal(tab.getAttribute('aria-controls'),f.nativeStage.id);
  assert.equal(f.nativeStage.getAttribute('aria-labelledby'),f.tabs()[1].id);
});

test('initial reference query mounts without a callback that reads an uninitialized controller',()=>{
  const f=fixture('http://localhost:8875/web/world.html?plushView=reference#world=existing-world');let notifications=0;
  const view=f.mount({context:'world',onViewChange:()=>{notifications++;view.canInteract();}});
  assert.equal(notifications,0);assert.equal(view.view(),'reference');assert.equal(view.canInteract(),true);
  assert.equal(f.nativeStage.hidden,false);assert.equal(f.nativeStage.inert,false);assert.equal(f.browser.history.calls.length,0);
  assert.equal(f.browser.location.href,'http://localhost:8875/web/world.html?plushView=reference#world=existing-world');
});

test('switching displays preserves native scene assets, controls and an unfinished import draft',()=>{
  const f=fixture(),view=f.mount(),nativeChildren=[...f.nativeStage.children],controlChildren=[...f.nativeControls.children];
  const sourceAsset={id:'uploaded-own-splat',positions:new Float32Array([1,2,3])};f.canvas.sourceAsset=sourceAsset;
  for(let index=0;index<3;index++){view.select('reference');assert.equal(f.nativeStage.inert,false);assert.equal(f.nativeControls.inert,true);view.select('native');}
  assert.deepEqual(f.nativeStage.children,nativeChildren);assert.deepEqual(f.nativeControls.children,controlChildren);
  assert.equal(f.canvas.sourceAsset,sourceAsset);assert.equal(f.slider.value,'0.72');assert.equal(f.importDraft.value,'未提交的配方');
  assert.equal(f.nativeStage.hidden,false);assert.equal(f.nativeControls.hidden,false);
  assert.equal(f.nativeStage.inert,false);assert.equal(f.nativeControls.inert,false);
});

test('view query changes retain each artwork fragment and unrelated query values and history state',()=>{
  for(const [page,fragment] of [['index.html','#recipe=abc-_123'],['world.html','#world=abc-_456'],['splat.html','#splat=abc-_789']]){
    const href='http://localhost:8875/web/'+page+'?v=run&filter=blue%20hat&flag=1'+fragment;
    const expectedQuery=new URL(href).searchParams,f=fixture(href),historyState=f.browser.history.state,view=f.mount();
    view.select('reference');let url=new URL(f.browser.location.href);
    assert.equal(url.hash,fragment);assert.equal(url.searchParams.get('plushView'),'reference');
    for(const [key,value] of expectedQuery)assert.equal(url.searchParams.get(key),value);
    view.select('native');url=new URL(f.browser.location.href);
    assert.equal(url.hash,fragment);assert.equal(url.searchParams.has('plushView'),false);
    for(const [key,value] of expectedQuery)assert.equal(url.searchParams.get(key),value);
    assert.equal(f.browser.history.state,historyState);
  }
});

test('URL helpers handle only the exact reference query while preserving the native artwork fragment',()=>{
  const href='http://localhost:8875/web/index.html?v=1#recipe=exact-token';
  assert.equal(plushViewFromUrl(href),'native');
  assert.equal(plushViewFromUrl(href.replace('?v=1','?plushView=unknown')),'native');
  const reference=plushViewUrl(href,'reference');assert.equal(plushViewFromUrl(reference),'reference');
  assert.equal(new URL(reference).hash,'#recipe=exact-token');assert.equal(new URL(plushViewUrl(reference,'native')).hash,'#recipe=exact-token');
});

test('invalid display modes leave controls, source loading and the existing URL untouched',()=>{
  const f=fixture(),view=f.mount();const href=f.browser.location.href;let notifications=0;
  const observerFixture=fixture();const observer=observerFixture.mount({onViewChange:()=>notifications++});
  for(const invalid of ['other','Reference','',null,undefined,{},0]){view.select(invalid);observer.select(invalid);}
  assert.equal(view.view(),'native');assert.equal(descendants(f.stage).some(node=>node.tagName==='IFRAME'),false);
  assert.equal(f.nativeStage.hidden,false);assert.equal(f.nativeControls.hidden,false);
  assert.equal(f.browser.location.href,href);assert.equal(f.browser.history.calls.length,0);assert.equal(notifications,0);
});

test('keyboard navigation is scoped to the newly mounted display tabs',async()=>{
  const f=fixture(),otherTab=new NodeStub('button');otherTab.setAttribute('aria-selected','true');
  f.nativeControls.append(otherTab);const view=f.mount(),[own,original]=f.tabs();let prevented=0;
  const key=(tab,key)=>tab.dispatch('keydown',{key,preventDefault(){prevented++;}});
  await key(own,'ArrowRight');assert.equal(view.view(),'reference');assert.equal(original.focused,true);
  assert.equal(own.tabIndex,-1);assert.equal(original.tabIndex,0);
  await key(original,'Home');assert.equal(view.view(),'native');
  await key(own,'End');assert.equal(view.view(),'reference');
  await key(original,'ArrowLeft');assert.equal(view.view(),'native');
  await key(own,'ArrowUp');assert.equal(view.view(),'native');assert.equal(prevented,4);
  assert.equal(otherTab.listeners.size,0);assert.equal(otherTab.focused,false);assert.equal(otherTab.getAttribute('aria-selected'),'true');
});

test('popstate follows the URL query without rewriting a newly restored world hash',async()=>{
  const f=fixture('http://localhost:8875/web/world.html?v=1#world=first'),changes=[];
  const view=f.mount({context:'world',onViewChange:value=>changes.push(value)});
  f.browser.location.href='http://localhost:8875/web/world.html?v=2&plushView=reference#world=restored';
  await f.browser.dispatch('popstate');assert.equal(view.view(),'reference');assert.equal(new URL(f.browser.location.href).hash,'#world=restored');
  f.browser.location.href='http://localhost:8875/web/world.html?v=2#world=latest';
  await f.browser.dispatch('popstate');assert.equal(view.view(),'native');assert.equal(new URL(f.browser.location.href).hash,'#world=latest');
  assert.equal(f.browser.history.calls.length,0);assert.deepEqual(changes,['reference','native']);
});

test('original display keeps author credit visible and distinguishes our native scene adaptations',()=>{
  const f=fixture(),view=f.mount({context:'splat',nativeLabel:'我的高斯作品'});view.select('reference');
  const panel=byClass(f.stage,'plush-reference-panel'),credit=byClass(panel,'plush-reference-credit');
  assert.equal(panel.hidden,false);assert.ok(credit);assert.equal(credit.hidden,false);
  const links=credit.children.filter(child=>child.tagName==='A');
  assert.equal(links[0].href,ORIGINAL_PLUSH_PAGE);assert.match(links[0].textContent,/abstrakt/);
  assert.equal(links[1].href,'https://creativecommons.org/licenses/by/4.0/');assert.equal(links[1].textContent,'CC BY 4.0');
  assert.ok(links.every(link=>link.target==='_blank'&&link.rel==='noopener noreferrer'));
  const sidebar=byClass(f.aside,'plush-reference-details');assert.equal(sidebar.hidden,false);
  const scope=byClass(sidebar,'plush-reference-scope').textContent;
  assert.match(scope,/资产由 abstrakt 制作/);assert.match(scope,/本项目增加坐标适配、场景与互动/);
  assert.match(scope,/原作没有独立毛发曲线/);assert.match(scope,/绒毛高斯的形变/);assert.match(scope,/逐根修剪请切回「我的高斯作品」/);
  view.select('native');assert.equal(panel.hidden,true);assert.equal(sidebar.hidden,true);
});

test('only a real mode change invokes the native-render callback',()=>{
  const f=fixture(),changes=[],view=f.mount({onViewChange:value=>changes.push(value)});
  view.select('native');view.select('reference');view.select('reference');view.select('native');
  assert.deepEqual(changes,['reference','native']);
});

test('native extra visibility returns to its state before entering the author view',()=>{
  const f=fixture(),view=f.mount({nativeExtras:[f.hiddenExtra,f.visibleExtra]});
  view.select('reference');assert.equal(f.hiddenExtra.hidden,true);assert.equal(f.visibleExtra.hidden,true);
  view.select('native');assert.equal(f.hiddenExtra.hidden,true);assert.equal(f.visibleExtra.hidden,false);
  // Native UI can change visibility after mount; toggling must not resurrect stale overlays.
  f.hiddenExtra.hidden=false;f.visibleExtra.hidden=true;
  view.select('native');
  assert.equal(f.hiddenExtra.hidden,false);assert.equal(f.visibleExtra.hidden,true);
  view.select('reference');view.select('native');
  assert.equal(f.hiddenExtra.hidden,false);assert.equal(f.visibleExtra.hidden,true);
});

test('loading and error states disable original actions while asset switching and the canvas stay usable',async()=>{
  const f=fixture(),calls=[],view=f.mount({onAction:(...args)=>calls.push(args)});
  const controls=[...descendants(f.aside).filter(node=>node.dataset.plushAction&&!['undo','redo'].includes(node.dataset.plushAction)),...descendants(f.aside).filter(node=>node.tagName==='INPUT'&&node.id.startsWith('plush-view-'))];
  const exercise=async()=>{for(const control of controls)await control.dispatch(control.tagName==='INPUT'?'input':'click');};
  assert.ok(controls.every(control=>control.disabled));await exercise();assert.deepEqual(calls,[]);
  for(const message of ['正在加载 3 / 6…','资产读取失败，请重试']){
    view.status(message,{ready:false});view.select('reference');await exercise();
    assert.equal(byClass(f.aside,'plush-reference-load').textContent,message);
    assert.ok(controls.every(control=>control.disabled));assert.ok(f.tabs().every(tab=>!tab.disabled));
    await f.tabs()[0].dispatch('click');assert.equal(view.view(),'native');
    assert.equal(view.canInteract(),true);assert.equal(f.nativeStage.inert,false);
  }
  assert.deepEqual(calls,[]);
  view.status('完整资产已载入',{ready:true});assert.ok(controls.every(control=>!control.disabled));
  assert.equal(f.action('undo').disabled,true);assert.equal(f.action('redo').disabled,true);
  await f.action('bounce').dispatch('click');assert.deepEqual(calls,[['bounce']]);
  view.status('渲染错误',{ready:false});await f.action('bounce').dispatch('click');assert.equal(calls.length,1);
});

test('fur controls synchronize values, finalize one adjustment and gate grooming history by loading state',async()=>{
  const f=fixture(),calls=[],view=f.mount({onAction:(...args)=>calls.push(args)});
  const length=descendants(f.aside).find(node=>node.id==='plush-view-creation-fur-length');
  const curl=descendants(f.aside).find(node=>node.id==='plush-view-creation-fur-curl');
  view.setStyle({fur:{length:1.35,curl:.42}});view.setHistory({undo:true});
  assert.equal(length.value,1.35);assert.equal(curl.value,.42);assert.equal(f.action('undo').disabled,true);
  view.status('已加载',{ready:true});assert.equal(f.action('undo').disabled,false);assert.equal(f.action('redo').disabled,true);
  length.value=1.45;await length.dispatch('input');await length.dispatch('change');
  curl.value=.6;await curl.dispatch('input');await curl.dispatch('blur');
  await f.action('groom').dispatch('click');view.setGrooming(true);
  assert.equal(f.action('groom').textContent,'结束梳理');assert.equal(f.stage.dataset.plushGrooming,'true');
  assert.deepEqual(calls,[['fur-length',1.45],['finish'],['fur-curl',.6],['finish'],['groom']]);
  await f.action('undo').dispatch('click');view.setHistory({redo:true});await f.action('redo').dispatch('click');
  assert.equal(calls.at(-2)[0],'undo');assert.equal(calls.at(-1)[0],'redo');
  view.status('加载失败',{ready:false});await f.action('redo').dispatch('click');assert.equal(calls.length,7);
  view.status('已加载',{ready:true});await f.action('reset').dispatch('click');
  assert.equal(length.value,1);assert.equal(curl.value,0);assert.equal(f.field('color').value,'#ffffff');
});

test('ready native asset controls send values, synchronize spin and reset without early callbacks',async()=>{
  const f=fixture('http://localhost:8875/web/splat.html?plushView=reference#splat=own'),calls=[];
  const view=f.mount({onAction:(...args)=>calls.push(args)});
  view.setStyle({tint:'#aabbcc',size:1.18});view.setSpinning(true);view.status('已加载',{ready:true});
  assert.deepEqual(calls,[]);assert.equal(f.field('color').value,'#aabbcc');assert.equal(Number(f.field('range').value),1.18);
  assert.equal(f.action('spin').getAttribute('aria-pressed'),'true');
  await f.field('color').dispatch('input');await f.field('range').dispatch('input');
  for(const action of ['front','spin','bounce','png'])await f.action(action).dispatch('click');
  assert.equal(f.action('spin').getAttribute('aria-pressed'),'false');
  await f.action('reset').dispatch('click');
  assert.deepEqual(calls,[['tint','#aabbcc'],['size',1.18],['front'],['spin'],['bounce'],['png'],['reset']]);
  assert.equal(f.field('color').value,'#ffffff');assert.equal(Number(f.field('range').value),1);
});

test('world mode can retain native furniture controls, listeners and an unfinished draft',async()=>{
  const f=fixture('http://localhost:8875/web/world.html?plushView=reference#world=own-layout');
  const furnitureButton=new NodeStub('button');let furnitureClicks=0;
  furnitureButton.addEventListener('click',()=>furnitureClicks++);f.nativeControls.append(furnitureButton);
  const view=f.mount({context:'world',keepNativeControls:true,nativeExtras:[f.hiddenExtra,f.visibleExtra]});
  assert.equal(f.nativeControls.hidden,false);assert.equal(f.nativeControls.inert,false);
  await furnitureButton.dispatch('click');view.status('加载中',{ready:false});view.select('native');view.select('reference');
  await furnitureButton.dispatch('click');
  assert.equal(furnitureClicks,2);assert.equal(f.nativeControls.hidden,false);assert.equal(f.nativeControls.inert,false);
  assert.equal(f.slider.value,'0.72');assert.equal(f.importDraft.value,'未提交的配方');
  assert.equal(new URL(f.browser.location.href).hash,'#world=own-layout');
  assert.match(byClass(f.aside,'plush-reference-guide').children[1].textContent,/家具和角色在同一个场景/);
});
