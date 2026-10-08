import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bindFeeding} from '../src/feeding-ui.js';
import {FeedLedger} from '../src/feed-ledger.js';

const ids=['feeding-feedback','feeding-status','feeding-counts','feeding-note','feeding-pause','feeding-stop','feeding-again'];
const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
for(const id of ids)assert.ok(html.includes(`id="${id}"`),`shipped HTML contains ${id}`);

// Executes the production UI binder with event-capable DOM controls. This checks
// state and action semantics, not native rendering, focus or mobile geometry.
function fixture(){
 const elements=Object.fromEntries(ids.map(id=>[id,{hidden:false,disabled:false,textContent:'',attributes:{},listeners:{},focus(){globalThis.document.activeElement=this;},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){this.listeners[k]=v;}}]));
 globalThis.document={hidden:false,getElementById:id=>elements[id]};
 const feeding=new FeedLedger(),interaction={mode:'idle',phase:'idle',stop(){feeding.end(this.batch,'stopped');this.mode=this.phase='idle';}};
 let preparations=0,feeds=0;
 const c={hasDynamics:true,active:true,school:{feeding,consumed:0},interaction,settings:{paused:false},updateSettings(value){Object.assign(this.settings,value);},feed(){feeds++;interaction.batch=feeding.begin(6,0);interaction.mode='feed';interaction.phase='approach';this.settings.paused=false;}};
 let current=c,panel;
 panel=bindFeeding({getCourtyard:()=>current,prepareInteraction(){preparations++;},refresh(){panel.update();}});
 return {elements,c,feeding,interaction,panel,select(value){current=value;},click(id){elements[id].listeners.click();},get preparations(){return preparations;},get feeds(){return feeds;}};
}

test('feeding feedback starts hidden and records a real round independently of cumulative swallow count',()=>{
 const f=fixture();assert.equal(f.elements['feeding-feedback'].hidden,true);
 f.c.school.consumed=12;f.c.feed();f.panel.update();
 assert.equal(f.elements['feeding-feedback'].hidden,false);
 assert.match(f.elements['feeding-counts'].textContent,/本轮释放 0\/6/);
 assert.match(f.elements['feeding-counts'].textContent,/场景累计吞食 12/);
 assert.equal(f.elements['feeding-again'].disabled,true);
});

test('pause and resume keep the current batch and toggle truthful pressed state',()=>{
 const f=fixture();f.c.feed();const id=f.feeding.latest().id;
 f.click('feeding-pause');assert.equal(f.c.settings.paused,true);
 assert.match(f.elements['feeding-status'].textContent,/模拟已暂停/);
 assert.equal(f.elements['feeding-pause'].attributes['aria-pressed'],'true');
 assert.equal(f.elements['feeding-pause'].textContent,'继续动态');
 f.click('feeding-pause');assert.equal(f.c.settings.paused,false);
 assert.equal(f.feeding.latest().id,id);
});

test('stop finishes only the hand and already released particles remain pending',()=>{
 const f=fixture();f.c.feed();f.feeding.release(f.interaction.batch);f.feeding.release(f.interaction.batch);
 f.click('feeding-stop');const round=f.feeding.latest();
 assert.equal(round.released,2);assert.equal(round.pending,2);assert.equal(round.unreleased,4);
 assert.equal(round.handEnded,true);assert.equal(f.elements['feeding-stop'].hidden,true);
 assert.equal(f.elements['feeding-again'].disabled,false);
 assert.match(f.elements['feeding-status'].textContent,/提前停止/);
});

test('repeat prepares an actual new feed and late old particles never appear in the new count',()=>{
 const f=fixture();f.c.feed();const old=f.feeding.release(f.interaction.batch);f.feeding.land(old);f.click('feeding-stop');
 f.click('feeding-again');assert.equal(f.feeds,2);assert.equal(f.preparations,1);
 f.feeding.consume(old);f.panel.update();
 assert.equal(f.feeding.latest().consumed,0);assert.match(f.elements['feeding-counts'].textContent,/本轮释放 0\/6/);
});

test('inspect and inactive-page observation retain the most recent round without claiming simulation runs',()=>{
 const f=fixture();f.c.feed();f.click('feeding-stop');const id=f.feeding.latest().id;
 f.interaction.mode='inspect';f.interaction.phase='inspect';f.c.active=false;f.panel.update();
 assert.equal(f.feeding.latest().id,id);assert.equal(f.elements['feeding-feedback'].hidden,false);
 assert.match(f.elements['feeding-status'].textContent,/当前页签未运行模拟/);
});

test('reset, missing scene and unbound model hide the panel and stale actions cannot trigger feed',()=>{
 const f=fixture();f.c.feed();f.click('feeding-stop');f.feeding.clear();f.panel.update();
 assert.equal(f.elements['feeding-feedback'].hidden,true);
 f.c.hasDynamics=false;f.panel.update();const feeds=f.feeds;
 f.click('feeding-again');f.click('feeding-pause');assert.equal(f.feeds,feeds);
 f.select(null);f.panel.update();f.click('feeding-stop');f.click('feeding-again');
 assert.equal(f.elements['feeding-feedback'].hidden,true);
});

test('natural hand completion moves focus before its stop button is hidden',()=>{
 const f=fixture();f.c.feed();f.panel.update();f.elements['feeding-stop'].focus();
 f.interaction.stop();f.panel.update();
 assert.equal(f.elements['feeding-stop'].hidden,true);
 assert.equal(document.activeElement,f.elements['feeding-pause']);
 // A mouse user reading another control must not have focus stolen.
 f.c.feed();f.panel.update();f.elements['feeding-again'].focus();
 f.interaction.stop();f.panel.update();
 assert.equal(document.activeElement,f.elements['feeding-again']);
});
