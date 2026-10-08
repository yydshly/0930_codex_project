import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTour} from '../src/tour-ui.js';
import {bindPrinciples} from '../src/principles.js';
import {FeedLedger} from '../src/feed-ledger.js';

// Executes the shipped binders with controls that dispatch their actual callbacks.
// This verifies entry-point semantics; it does not substitute for browser layout.
function fixture(){
 const elements=new Map(),make=()=>({value:'',textContent:'',hidden:false,disabled:false,open:false,dataset:{},children:[],listeners:{},setAttribute(){},removeAttribute(){},addEventListener(k,v){this.listeners[k]=v;},append(v){this.children.push(v);},dispatchEvent(e){this.listeners[e.type]?.(e);},scrollIntoView(){},focus(){}});
 const $=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id);};
 globalThis.document={body:{dataset:{}},hidden:false,getElementById:$,createElement:make,querySelector:()=>make()};
 globalThis.IntersectionObserver=class{observe(){}};
 $('principle-select').value='feeding';
 let tab='scene',feeds=0,prepares=0;
 const c={settings:{fishCount:0,paused:false,autoTour:false},active:true,imported:null,hasDynamics:true,time:0,interaction:{mode:'idle',phase:'idle',stop(){this.mode=this.phase='idle';}},school:{feeding:new FeedLedger(),consumed:0,metrics:{}},experiment:{results:{baseline:null,current:null}},
  updateSettings(v){Object.assign(this.settings,v);},feed(){feeds++;this.school.feeding.begin(6);this.interaction.mode='feed';this.interaction.phase='approach';}};
 return {$,c,get feeds(){return feeds;},get prepares(){return prepares;},getCourtyard:()=>c,getCurrentTab:()=>tab,async selectTab(value){tab=value;},prepareInteraction(){prepares++;},refresh(){}};
}

test('the principle feeding demo keeps zero fish and presents the real no-fish state',async()=>{
 const f=fixture();bindPrinciples(f);
 await f.$('principle-demo').listeners.click();
 assert.equal(f.feeds,1);assert.equal(f.c.settings.fishCount,0);
 assert.match(f.$('principle-metrics').textContent,/当前无鱼/);
 assert.match(f.$('principle-metrics').textContent,/吞食 0 粒/);
});

test('the guided feeding step keeps zero fish instead of silently populating the pond',async()=>{
 const f=fixture();bindTour(f);
 await f.$('tour-start').listeners.click();
 await f.$('tour-steps').children[4].listeners.click();
 assert.equal(f.$('tour-action').disabled,false);
 await f.$('tour-action').listeners.click();
 assert.equal(f.feeds,1);assert.equal(f.c.settings.fishCount,0);
 assert.match(f.$('tour-status').textContent,/当前没有锦鲤/);
 assert.match(f.$('tour-live').textContent,/当前无鱼/);
});

test('the new startle principle demo delegates to the guarded stroke entry without adding fish',async()=>{
 const f=fixture();f.$('principle-select').value='startle';let attempts=0;
 f.c.stroke=()=>{attempts++;};f.c.school.startleState={phase:'idle',affectedFish:0,triggerCount:0,intensity:0};
 bindPrinciples(f);await f.$('principle-demo').listeners.click();
 assert.equal(attempts,1);assert.equal(f.c.settings.fishCount,0);
 assert.match(f.$('principle-metrics').textContent,/平静.*触发 0 次/);
 assert.match(f.$('principle-method').textContent,/转向加速度/);
});
