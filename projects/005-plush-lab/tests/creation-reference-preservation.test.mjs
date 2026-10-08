import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sanitizeRecipe} from '../src/recipes.js';

const mainSource=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

// Run the production functions without booting WebGL or the page's startup code.
// Their unindented top-level declarations delimit them; the bodies stay intact.
function productionFunction(name){
  const start=new RegExp(`^function ${name}\\(`,'m').exec(mainSource);
  assert.ok(start,`Missing production function: ${name}`);
  const tail=mainSource.slice(start.index),next=/^(?:function|const|let|class)\s/m.exec(tail.slice(1));
  return next?tail.slice(0,next.index+1):tail;
}

function button(dataset){
  return {dataset,attributes:{},classList:{toggle(){}},setAttribute(name,value){this.attributes[name]=value;}};
}

function fixture(nativeViewActive){
  const fields=new Map(),stage={style:{background:nativeViewActive?'previous native backdrop':'#080a0c'}};
  const characterButtons=[button({character:'0'}),button({character:'1'})];
  const backdropButtons=['cream','sage','rose'].map(backdrop=>button({backdrop}));
  const lightButtons=['day','warm','night'].map(light=>button({light}));
  const vector=()=>({set(){}});
  class Group{
    constructor(){this.visible=true;this.rotation={set(pitch,yaw,z){this.value=[pitch,yaw,z];}};}
  }
  const referenceActor={visible:!nativeViewActive},oldCreature=new Group();
  const scene={children:[oldCreature,referenceActor],add(group){this.children.push(group);},remove(group){this.children=this.children.filter(item=>item!==group);}};
  const builds=[];
  const context=vm.createContext({
    THREE:{Group},nativeViewActive,referenceSavedCamera:{background:'previous native backdrop',position:{x:1},quaternion:{w:1}},
    scene,creature:oldCreature,referenceActor,characters:[{name:'Old',desc:'old character',color:'#abcdef'},{name:'New',desc:'new character',color:'#fedcba'}],
    $:selector=>{
      if(selector==='.stage')return stage;
      if(!fields.has(selector))fields.set(selector,{value:'',textContent:''});
      return fields.get(selector);
    },
    document:{querySelectorAll(selector){
      if(selector==='[data-character]')return characterButtons;
      if(selector==='[data-backdrop]')return backdropButtons;
      if(selector==='[data-light]')return lightButtons;
      return [];
    }},
    activityEnd:0,shakeStart:0,greetingStart:0,drag:{},pointer:vector(),furImpulse:vector(),index:0,squeezing:true,pressDemoStart:0,
    pressPosition:[1,2,3],pressVelocity:[1,2,3],lastPressDepth:1,rebuildTimer:null,clearTimeout(){},yaw:0,pitch:0,lastHit:{},
    springPosition:[1,2,3],springVelocity:[1,2,3],jumpHeight:1,jumpVelocity:1,backdropMode:'cream',
    disposeCreature(){scene.remove(context.creature);},
    buildBody(){builds.push({part:'body',visible:context.creature.visible});},
    buildEyes(){builds.push({part:'eyes',visible:context.creature.visible});},
    accessories(){builds.push({part:'accessories',visible:context.creature.visible});},
    buildFur(){builds.push({part:'fur',visible:context.creature.visible});},syncFaceGuard(){},
    sanitizeRecipe,clearMotion(){},sleeping:true,faceGuard:false,experiment:{},params:{},editBatch:true,editBatchCount:1,
    editHistory:{clear(){}},setColor(color){fields.get('#fur-color').value=color;},lightMode:'day',motion:{x:0,y:0},
    syncControls(){},syncPresetButtons(){},updateLight(){},syncEffects(){},syncResearch(){},syncEditor(){},renderDirty:false,
    feedback(){},productMessage(){},
  });
  vm.runInContext(['selectCharacter','setBackdrop','applyRecipe'].map(productionFunction).join('\n'),context,{filename:'main.js production preservation functions'});
  return {context,fields,stage,builds,oldCreature,referenceActor,characterButtons,backdropButtons};
}

test('a character rebuilt while the reference is active stays hidden throughout assembly',()=>{
  const f=fixture(false);f.context.selectCharacter(1);
  assert.equal(f.context.creature.visible,false);
  assert.equal(f.referenceActor.visible,true);
  assert.ok(f.builds.every(build=>build.visible===false));
  assert.equal(f.context.scene.children.includes(f.oldCreature),false);
  assert.equal(f.context.scene.children.includes(f.context.creature),true);
  assert.equal(f.fields.get('#recipe-name').value,'New');
  assert.equal(f.characterButtons[1].attributes['aria-pressed'],'true');
});

test('a character rebuilt in native creation remains visible',()=>{
  const f=fixture(true);f.context.selectCharacter(1);
  assert.equal(f.context.creature.visible,true);
  assert.ok(f.builds.every(build=>build.visible===true));
  assert.equal(f.referenceActor.visible,false);
});

test('a reference-time backdrop change updates the native restore value without changing its stage or camera',()=>{
  const f=fixture(false),saved=f.context.referenceSavedCamera,position=saved.position,quaternion=saved.quaternion;
  f.context.setBackdrop('sage');
  assert.equal(f.stage.style.background,'#080a0c');
  assert.equal(saved.background,'radial-gradient(ellipse at 50% 50%,#f4faf3 0%,#dce8d9 80%)');
  assert.equal(saved.position,position);assert.equal(saved.quaternion,quaternion);
  assert.equal(f.context.backdropMode,'sage');
  assert.equal(f.backdropButtons[1].attributes['aria-pressed'],'true');
  assert.equal(f.backdropButtons[0].attributes['aria-pressed'],'false');
});

test('native backdrop changes update the visible creation stage',()=>{
  const f=fixture(true);f.context.setBackdrop('rose');
  assert.equal(f.stage.style.background,'radial-gradient(ellipse at 50% 50%,#fff8f5 0%,#f0dedb 80%)');
  assert.equal(f.context.referenceSavedCamera.background,'previous native backdrop');
  assert.equal(f.context.backdropMode,'rose');
});

test('applying an incoming recipe behind the reference preserves its visible asset while retaining the new recipe',()=>{
  const f=fixture(false),value={name:'Recovered artwork',character:1,color:'#aabbcc',params:{length:.12},light:'warm',backdrop:'rose',yaw:.2,pitch:.1};
  const expected=sanitizeRecipe(value);f.context.applyRecipe(value);
  assert.equal(f.context.creature.visible,false);assert.equal(f.referenceActor.visible,true);
  assert.equal(f.stage.style.background,'#080a0c');
  assert.equal(f.context.referenceSavedCamera.background,'radial-gradient(ellipse at 50% 50%,#fff8f5 0%,#f0dedb 80%)');
  assert.equal(f.fields.get('#recipe-name').value,expected.name);
  assert.equal(f.fields.get('#fur-color').value,expected.color);
  assert.equal(f.context.index,expected.character);assert.equal(f.context.params.length,expected.params.length);
  assert.equal(f.context.lightMode,expected.light);assert.equal(f.context.yaw,expected.yaw);assert.equal(f.context.pitch,expected.pitch);
  assert.deepEqual(Array.from(f.context.creature.rotation.value),[expected.pitch,expected.yaw,0]);
});
