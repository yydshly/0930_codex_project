import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSceneKeyboard} from '../src/scene-keyboard.js';

function fixture(){
 const classes=new Set(),events=new Map(),canvasEvents=new Map(),calls=[];
 const canvas={addEventListener:(type,fn)=>canvasEvents.set(type,fn),removeEventListener:type=>canvasEvents.delete(type),focus(options){doc.activeElement=this;calls.push(['focus',options]);}};
 const doc={activeElement:canvas,hidden:false,body:{classList:{remove:name=>classes.delete(name),toggle:name=>classes.has(name)?classes.delete(name):classes.add(name)}},querySelector:()=>dialog?{}:null,addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)};
 let tab='scene',dialog=false;
 const c={active:true,hasDynamics:true,settings:{paused:false},interaction:{mode:'idle',stop:restore=>calls.push(['stop',restore])},binding:{mode:null,pending:false,getState(){return {calibration:{pending:this.pending}};},cancelCalibration(){calls.push(['cancel']);},setMode:mode=>calls.push(['binding',mode])},feed:()=>calls.push(['feed']),stroke:()=>calls.push(['stroke']),updateSettings(value){Object.assign(this.settings,value);calls.push(['settings',value]);}};
 const dispose=bindSceneKeyboard({getCourtyard:()=>c,getCurrentTab:()=>tab,canvas,document:doc,prepareInteraction:()=>calls.push(['prepare']),setToolbarOpen:value=>calls.push(['toolbar',value])});
 function key(key,options={}){const event={key,target:canvas,preventDefault(){this.defaultPrevented=true;},...options};events.get('keydown')?.(event);return event;}
 return {c,doc,canvas,canvasEvents,calls,classes,key,dispose,setTab:value=>tab=value,setDialog:value=>dialog=value};
}

test('focused canvas supports one-shot feed, stroke, pause and clean view with no page scroll',()=>{
 const f=fixture();assert.equal(f.key('e').defaultPrevented,true);assert.equal(f.key('G').defaultPrevented,true);
 assert.deepEqual(f.calls.slice(0,4),[['prepare'],['feed'],['prepare'],['stroke']]);
 assert.equal(f.key(' ').defaultPrevented,true);assert.equal(f.c.settings.paused,true);
 f.key(' ');assert.equal(f.c.settings.paused,false);f.key('v');assert.ok(f.classes.has('clean-scene'));
 f.key('v',{repeat:true});assert.ok(f.classes.has('clean-scene'));
 assert.equal(f.key(' ',{repeat:true}).defaultPrevented,true);assert.equal(f.c.settings.paused,false);
});

test('browser modifiers, composition, repeat and consumed events cannot trigger scene actions',()=>{
 const f=fixture();
 for(const flag of ['ctrlKey','metaKey','altKey','isComposing','repeat','defaultPrevented'])for(const key of ['e','g','v',' ','Escape'])f.key(key,{[flag]:true});
 assert.deepEqual(f.calls,[]);assert.equal(f.classes.size,0);assert.equal(f.c.settings.paused,false);
});

test('typing, other control focus, dialogs, hidden tabs and lost rendering keep their own input',()=>{
 const f=fixture(),button={closest:()=>null},input={closest:()=>({})},nestedEditable={isContentEditable:true};
 for(const target of [button,input,nestedEditable]){f.doc.activeElement=target;f.key('e',{target});f.key(' ' ,{target});}
 f.doc.activeElement=f.canvas;f.setDialog(true);f.key('e');f.key('Escape');f.setDialog(false);
 f.setTab('tech');f.key('e');f.setTab('scene');f.doc.hidden=true;f.key('e');f.doc.hidden=false;
 f.c.active=false;f.key('e');f.key(' ');f.c.active=true;f.c.hasDynamics=false;f.key('e');f.key('g');
 assert.deepEqual(f.calls,[]);assert.equal(f.c.settings.paused,false);
});

test('Escape exits the current scene task in priority order without interfering with editors',()=>{
 const f=fixture();f.classes.add('clean-scene');f.c.binding.pending=true;f.c.binding.mode='outline';f.c.interaction.mode='feed';
 f.key('Escape');assert.deepEqual(f.calls,[['toolbar',false],['cancel']]);assert.equal(f.classes.size,0);
 f.calls.length=0;f.c.binding.pending=false;f.key('Escape');assert.deepEqual(f.calls,[['toolbar',false],['binding',null]]);
 f.calls.length=0;f.c.binding.mode=null;f.key('Escape');assert.deepEqual(f.calls,[['toolbar',false],['stop',true]]);
 f.calls.length=0;f.key('Escape',{target:{isContentEditable:true}});assert.deepEqual(f.calls,[]);
});

test('pointer focus does not scroll and binding cleanup removes both event handlers',()=>{
 const f=fixture();f.doc.activeElement=null;f.canvasEvents.get('pointerdown')();
 assert.equal(f.doc.activeElement,f.canvas);assert.deepEqual(f.calls,[['focus',{preventScroll:true}]]);
 f.dispose();f.key('e');assert.equal(f.canvasEvents.size,0);assert.equal(f.calls.length,1);
});
