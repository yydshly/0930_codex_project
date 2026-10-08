import test from 'node:test';
import assert from 'node:assert/strict';
import {bindWildlife} from '../src/wildlife-ui.js';

function fixture(){
 const steps=['idle','alert','startled','recovering'].map(phase=>({dataset:{reactionPhase:phase},attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}}));
 const elements=Object.fromEntries(['startle-feedback','startle-status','startle-counts','cat-status'].map(id=>[id,{textContent:'',hidden:false,dataset:{},querySelectorAll:()=>steps}]));
 const c={hasDynamics:true,imported:null,settings:{paused:false},interaction:{mode:'idle'},animals:{cat:{state:'observe'}},school:{startleState:{phase:'idle',triggerCount:0,affectedFish:0,remaining:0}}};
 let current=c;const panel=bindWildlife({getCourtyard:()=>current,document:{getElementById:id=>elements[id]}});
 return {c,elements,steps,panel,select(value){current=value;}};
}

test('cat status remains available while the untouched fish panel is hidden',()=>{
 const f=fixture();assert.equal(f.elements['startle-feedback'].hidden,true);
 f.c.animals.cat.state='walk';f.panel.update();
 assert.equal(f.elements['cat-status'].dataset.state,'walk');assert.match(f.elements['cat-status'].textContent,/干地巡游/);
});

test('reaction feedback follows one current phase and never increments simulation counters',()=>{
 const f=fixture();Object.assign(f.c.school.startleState,{phase:'startled',triggerCount:1,affectedFish:4});f.panel.update();
 assert.equal(f.elements['startle-feedback'].hidden,false);
 assert.equal(f.steps.filter(s=>s.attributes['aria-current']).length,1);
 assert.equal(f.steps[2].attributes['aria-current'],'step');assert.match(f.elements['startle-counts'].textContent,/当前响应 4 条.*触发 1 次/);
 Object.assign(f.c.school.startleState,{phase:'recovering',remaining:3.2});f.panel.update();
 assert.equal(f.steps[2].attributes['aria-current'],undefined);assert.equal(f.steps[3].attributes['aria-current'],'step');
 assert.match(f.elements['startle-counts'].textContent,/3.2 模拟秒/);assert.equal(f.c.school.startleState.triggerCount,1);
 Object.assign(f.c.school.startleState,{phase:'idle',affectedFish:0});f.panel.update();assert.match(f.elements['startle-counts'].textContent,/当前响应 0 条.*触发 1 次/);
});

test('pause presents frozen reaction and cat state without advancing remaining time',()=>{
 const f=fixture();Object.assign(f.c.school.startleState,{phase:'recovering',triggerCount:1,remaining:2});f.c.settings.paused=true;
 for(let i=0;i<3;i++)f.panel.update();
 assert.match(f.elements['startle-status'].textContent,/已暂停/);assert.match(f.elements['cat-status'].textContent,/已暂停/);
 assert.equal(f.c.school.startleState.remaining,2);
});

test('reset and unbound imported model suppress stale reaction feedback',()=>{
 const f=fixture();Object.assign(f.c.school.startleState,{phase:'idle',triggerCount:1});f.panel.update();assert.equal(f.elements['startle-feedback'].hidden,false);
 f.c.school.startleState.triggerCount=0;f.panel.update();assert.equal(f.elements['startle-feedback'].hidden,true);
 f.c.imported={};f.c.hasDynamics=false;f.c.interaction.mode='stroke';f.panel.update();
 assert.equal(f.elements['startle-feedback'].hidden,true);assert.equal(f.elements['cat-status'].dataset.state,'unavailable');
 f.select(null);f.panel.update();assert.equal(f.elements['startle-feedback'].hidden,true);
});
