import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalCoatField,LOCAL_COAT_WIDTH,LOCAL_COAT_HEIGHT,MAX_LOCAL_STAMPS,surfaceUV,surfaceParameters,sanitizeLocalEdits} from '../src/local-coat-field.js';

const sphere = (theta,phi) => [Math.sin(theta)*Math.sin(phi),Math.cos(theta),Math.sin(theta)*Math.cos(phi)];
const makeStamp = (kind='dye',uv=[.25,.5],extras={}) => ({kind,uv,point:sphere(...surfaceParameters(...uv)),radius:.3,value:kind==='trim'?.25:kind==='curl'?.6:1,color:'#808080',...extras});

test('UV conversion matches the mapped SphereGeometry longitude and latitude',()=>{
  for(const [u,v] of [[0,0],[.125,.3],[.5,.75],[1,1]]){
    const [theta,phi]=surfaceParameters(u,v),actual=surfaceUV(theta,phi);
    assert.ok(Math.abs(actual[0]-(u%1))<1e-12);assert.ok(Math.abs(actual[1]-v)<1e-12);
    const point=sphere(theta,phi);
    assert.ok(Math.abs(point[0]+Math.cos(u*2*Math.PI)*Math.sin(theta))<1e-12);
    assert.ok(Math.abs(point[2]-Math.sin(u*2*Math.PI)*Math.sin(theta))<1e-12);
  }
});

test('untouched field is an identity for old recipes and keeps stable texture references',()=>{
  const field=new LocalCoatField(sphere),data=field.data,colorData=field.colorData;
  assert.equal(field.width,LOCAL_COAT_WIDTH);assert.equal(field.height,LOCAL_COAT_HEIGHT);
  assert.deepEqual(field.sample(.3,.6),{lengthScale:1,curlDelta:0,colorMix:0,color:[1,1,1]});
  assert.equal(field.clear(),false);assert.equal(field.replay([]),false);
  field.stamp(makeStamp('trim'));assert.equal(field.clear(),true);
  assert.equal(field.data,data);assert.equal(field.colorData,colorData);
  assert.deepEqual(field.sample(.25,.5),{lengthScale:1,curlDelta:0,colorMix:0,color:[1,1,1]});
});

test('brush centers and scalar settings are sanitized without mutating input',()=>{
  const raw=makeStamp('trim',[-5.25,20],{point:[20,-20,.123456789],radius:9,value:-9,color:'#AABBCC',shader:'ignored'});
  const [clean]=sanitizeLocalEdits([raw]);
  assert.deepEqual(clean,{kind:'trim',uv:[.75,1],point:[2.5,-2.5,.1235],radius:.6,value:.08,color:'#aabbcc'});
  assert.equal(raw.point[0],20);assert.ok(!('shader' in clean));
  for(const invalid of [null,{},[],{...raw,kind:'custom-shader'},{...raw,uv:[NaN,0]},{...raw,point:[1,2]},{...raw,point:[0,Infinity,0]}])assert.deepEqual(sanitizeLocalEdits([invalid]),[]);
  const [fallback]=sanitizeLocalEdits([makeStamp('curl',[.25,.5],{radius:Infinity,value:NaN,color:'url(x)'})]);
  assert.equal(fallback.radius,.2);assert.equal(fallback.value,.4);assert.equal(fallback.color,'#d87d91');
  const rounded=sanitizeLocalEdits([makeStamp('trim',[.987654321,.123456789])]);
  assert.deepEqual(rounded[0].uv,[.9877,.1235]);assert.deepEqual(sanitizeLocalEdits(rounded),rounded);
});

test('restore has bounded strength and explicit targets while old stamp formats stay unchanged',()=>{
  for(const target of ['length','color','curl','all']){
    const raw=makeStamp('restore',[.25,.5],{target,value:.654321}),[clean]=sanitizeLocalEdits([raw]);
    assert.equal(clean.target,target);assert.equal(clean.value,.6543);
    assert.deepEqual(sanitizeLocalEdits([clean]),[clean]);assert.equal(raw.value,.654321);
  }
  for(const target of [undefined,'shader',null,[]]){
    const [clean]=sanitizeLocalEdits([makeStamp('restore',[.25,.5],{target,value:undefined})]);
    assert.equal(clean.target,'all');assert.equal(clean.value,1);
  }
  for(const [value,expected] of [[-5,0],[5,1],[NaN,1],[Infinity,1]]){
    assert.equal(sanitizeLocalEdits([makeStamp('restore',[.25,.5],{value})])[0].value,expected);
  }
  for(const kind of ['trim','dye','curl'])assert.ok(!('target' in sanitizeLocalEdits([makeStamp(kind,[.25,.5],{target:'all'})])[0]));
});

test('trim and curl edit only the local resting surface and leave the opposite side unchanged',()=>{
  const field=new LocalCoatField(sphere);
  field.stamp(makeStamp('trim'));field.stamp(makeStamp('curl',[.25,.5],{value:-.6}));
  const front=field.sample(.25,.5),back=field.sample(.75,.5);
  assert.ok(front.lengthScale>=.25&&front.lengthScale<.28);assert.ok(front.curlDelta<-.57&&front.curlDelta>=-.6);
  assert.deepEqual(back,{lengthScale:1,curlDelta:0,colorMix:0,color:[1,1,1]});
  field.stamp(makeStamp('trim',[.25,.5],{value:.8}));
  assert.equal(field.sample(.25,.5).lengthScale,front.lengthScale,'a lighter trim cannot regrow cut fibers');
});

test('dye is linear RGB with premultiplied texture coverage and no white boundary contamination',()=>{
  const field=new LocalCoatField(sphere),uv=[(32.5)/128,(32.5)/64];
  field.stamp(makeStamp('dye',uv,{value:.5,color:'#808080'}));
  const sample=field.sample(...uv),linear=((128/255+.055)/1.055)**2.4;
  assert.ok(sample.colorMix>.49&&sample.colorMix<=.5);
  for(const color of sample.color)assert.ok(Math.abs(color-linear)<1e-6);
  const offset=(32*128+32)*4;
  assert.ok(Math.abs(field.colorData[offset]-linear*field.data[offset+2])<1e-6);
  const edge=field.sample(uv[0]+.025,uv[1]);
  assert.ok(edge.colorMix>0&&edge.colorMix<sample.colorMix);
  for(const color of edge.color)assert.ok(Math.abs(color-linear)<1e-6);
  field.stamp(makeStamp('dye',uv,{value:.5,color:'#ff0000'}));
  const over=field.sample(...uv);assert.ok(over.colorMix>.74&&over.colorMix<=.75);
  assert.ok(over.color[0]>over.color[1]*5);assert.ok(Math.abs(over.color[1]-over.color[2])<1e-6);
});

test('world-space influence is continuous across the UV seam and converges at the pole',()=>{
  const field=new LocalCoatField(sphere);field.stamp(makeStamp('dye',[0,.5]));
  const a=field.sample(.001,.5),b=field.sample(.999,.5);
  assert.ok(a.colorMix>.9&&b.colorMix>.9);assert.ok(Math.abs(a.colorMix-b.colorMix)<1e-6);
  field.stamp(makeStamp('curl',[.25,1],{radius:.2}));
  const values=[0,.25,.5,.75,1].map(u=>field.sample(u,1).curlDelta);
  for(const value of values)assert.ok(value>.56&&value<=.6);
  assert.ok(Math.max(...values)-Math.min(...values)<1e-6);
});

test('ordered stamp replay reproduces texture data exactly and supports history restoration',()=>{
  const first=new LocalCoatField(sphere),second=new LocalCoatField(sphere);
  const raw=[makeStamp('trim'),makeStamp('curl',[.3,.55]),makeStamp('dye',[.25,.5],{color:'#2756bb'})];
  for(const stamp of raw)assert.equal(first.stamp(stamp),true);
  assert.equal(second.replay(raw),true);assert.deepEqual(second.data,first.data);assert.deepEqual(second.colorData,first.colorData);
  assert.equal(second.replay(raw),false);
  assert.equal(second.replay(raw.slice(0,2)),true);assert.equal(second.sample(.25,.5).colorMix,0);
  second.replay(raw);assert.deepEqual(second.data,first.data);assert.deepEqual(second.colorData,first.colorData);
});

test('a legacy full cache does not bake on no-op or invalid paint and continues on changed paint',()=>{
  const field=new LocalCoatField(sphere),raw=Array.from({length:MAX_LOCAL_STAMPS},()=>makeStamp('trim'));
  assert.equal(field.replay(raw),true);const data=field.data.slice(),stamps=JSON.stringify(field.stamps);
  assert.equal(field.stamp(makeStamp('trim')),false);assert.equal(field.lastPaintResult.reason,'unchanged');
  assert.equal(field.stamp(null),false);assert.equal(field.lastPaintResult.reason,'invalid');
  assert.equal(field.baseSnapshot,'');assert.equal(JSON.stringify(field.stamps),stamps);assert.deepEqual(field.data,data);
  const expected=new LocalCoatField(sphere);expected.replay(raw);expected.apply(sanitizeLocalEdits([makeStamp('restore')])[0]);
  assert.equal(field.stamp(makeStamp('restore')),true);assert.equal(field.lastPaintResult.reason,'changed');assert.equal(field.lastPaintResult.full,false);
  assert.ok(field.baseSnapshot);assert.equal(field.stamps.length,0);
  assert.deepEqual(field.data,expected.data);assert.deepEqual(field.colorData,expected.colorData);
  assert.equal(sanitizeLocalEdits([...raw,makeStamp('dye')]).length,MAX_LOCAL_STAMPS);
});

test('revisiting an already trimmed region reports no actual change and consumes no extra capacity',()=>{
  const field=new LocalCoatField(sphere),stamp=makeStamp('trim');
  assert.equal(field.stamp(stamp),true);
  assert.equal(field.lastPaintResult.reason,'changed');
  assert.ok(field.lastPaintResult.affected>0);assert.ok(field.lastPaintResult.changed>0);
  const data=field.data.slice(),colorData=field.colorData.slice();
  for(let i=0;i<300;i++){
    assert.equal(field.paint(stamp),false);
    assert.equal(field.lastPaintResult.reason,'unchanged');
    assert.ok(field.lastPaintResult.affected>0);assert.equal(field.lastPaintResult.changed,0);
    assert.equal(field.lastPaintResult.full,false);
  }
  assert.equal(field.stamps.length,1);
  assert.deepEqual(field.data,data);assert.deepEqual(field.colorData,colorData);
  assert.equal(field.stamp(makeStamp('trim',[.25,.5],{value:.08})),true,'a genuinely shorter trim is still recorded');
});

test('paint result counts changed texels rather than channels or attempted brush events',()=>{
  const field=new LocalCoatField(sphere);
  for(const kind of ['trim','curl','dye','restore']){
    const before=field.data.slice(),beforeColor=field.colorData.slice();
    assert.equal(field.stamp(makeStamp(kind)),true);
    let actual=0;
    for(let offset=0;offset<field.data.length;offset+=4){
      let changed=false;
      for(let axis=0;axis<4;axis++)if(field.data[offset+axis]!==before[offset+axis]||field.colorData[offset+axis]!==beforeColor[offset+axis])changed=true;
      if(changed)actual++;
    }
    assert.equal(field.lastPaintResult.changed,actual);
    assert.ok(actual>0);assert.ok(field.lastPaintResult.affected>=actual);
  }
});

test('zero-strength, identity and off-surface attempts do not append misleading saved edits',()=>{
  const field=new LocalCoatField(sphere),data=field.data.slice(),colorData=field.colorData.slice();
  for(const stamp of [makeStamp('trim',[.25,.5],{value:1}),makeStamp('curl',[.25,.5],{value:0}),makeStamp('dye',[.25,.5],{value:0}),makeStamp('restore')]){
    assert.equal(field.stamp(stamp),false);assert.equal(field.lastPaintResult.reason,'unchanged');
    assert.ok(field.lastPaintResult.affected>0);assert.equal(field.lastPaintResult.changed,0);
  }
  assert.equal(field.stamp(makeStamp('trim',[.25,.5],{point:[2.5,2.5,2.5],radius:.05})),false);
  assert.deepEqual(field.lastPaintResult,{reason:'unchanged',affected:0,changed:0,full:false});
  assert.equal(field.stamp({kind:'trim',point:[0,Infinity,0]}),false);
  assert.deepEqual(field.lastPaintResult,{reason:'invalid',affected:0,changed:0,full:false});
  assert.equal(field.stamps.length,0);assert.deepEqual(field.data,data);assert.deepEqual(field.colorData,colorData);
});

test('the complete cache bakes without changing pixels and later paint continues',()=>{
  const field=new LocalCoatField(sphere),expected=new LocalCoatField(sphere);
  assert.equal(MAX_LOCAL_STAMPS,512);
  for(let i=0;i<MAX_LOCAL_STAMPS;i++){
    const raw=makeStamp('dye',[.25,.5],{color:i%2?'#1155ee':'#ee5511'});
    assert.equal(field.stamp(raw),true);expected.apply(sanitizeLocalEdits([raw])[0]);
    assert.equal(field.lastPaintResult.reason,'changed');assert.ok(field.lastPaintResult.changed>0);
  }
  assert.equal(field.stamps.length,0);assert.ok(field.baseSnapshot);
  assert.deepEqual(field.data,expected.data);assert.deepEqual(field.colorData,expected.colorData);
  const snapshot=field.baseSnapshot;
  assert.equal(field.stamp(makeStamp('trim')),true);expected.apply(sanitizeLocalEdits([makeStamp('trim')])[0]);
  assert.equal(field.stamps.length,1);assert.equal(field.baseSnapshot,snapshot);assert.equal(field.lastPaintResult.full,false);
  assert.deepEqual(field.data,expected.data);assert.deepEqual(field.colorData,expected.colorData);
  assert.equal(field.clear(),true);
  assert.equal(field.baseSnapshot,'');assert.equal(field.stamps.length,0);
  assert.equal(field.stamp(makeStamp('trim')),true,'clearing frees capacity for new edits');
});

test('legacy 64-, 256- and 512-stamp replay retains every edit and permits continuing restore',()=>{
  for(const count of [64,256,512]){
    const field=new LocalCoatField(sphere),old=Array.from({length:count},(_,i)=>makeStamp('dye',[.25,.5],{color:i%2?'#112233':'#334455'}));
    assert.equal(field.replay(old),true);assert.equal(field.stamps.length,count);
    assert.deepEqual(field.stamps,sanitizeLocalEdits(old));
    const expected=new LocalCoatField(sphere);expected.replay(old);expected.apply(sanitizeLocalEdits([makeStamp('restore')])[0]);
    assert.equal(field.stamp(makeStamp('restore')),true);assert.equal(field.stamps.length,count<MAX_LOCAL_STAMPS?count+1:0);
    assert.equal(field.lastPaintResult.reason,'changed');assert.equal(field.lastPaintResult.full,false);
    assert.deepEqual(field.data,expected.data);assert.deepEqual(field.colorData,expected.colorData);
    if(count<MAX_LOCAL_STAMPS)assert.deepEqual(field.stamps.slice(0,count),sanitizeLocalEdits(old));else assert.ok(field.baseSnapshot);
    assert.equal(field.stamp(makeStamp('trim')),true);assert.equal(field.stamps.length,count<MAX_LOCAL_STAMPS?count+2:1);
  }
});

test('each restore target changes only its own channel and fading dye keeps premultiplied hue',()=>{
  for(const target of ['length','curl','color']){
    const field=new LocalCoatField(sphere);
    for(const kind of ['trim','curl','dye'])field.stamp(makeStamp(kind,[.25,.5],{color:'#2756bb'}));
    const before=field.data.slice(),beforeColor=field.colorData.slice(),sample=field.sample(.25,.5);
    assert.equal(field.stamp(makeStamp('restore',[.25,.5],{target,value:.5})),true);
    for(let offset=0;offset<field.data.length;offset+=4){
      for(const [channel,owner] of [[0,'length'],[1,'curl'],[2,'color']])if(target!==owner)assert.equal(field.data[offset+channel],before[offset+channel]);
      assert.equal(field.data[offset+3],before[offset+3]);assert.equal(field.colorData[offset+3],beforeColor[offset+3]);
    }
    const restored=field.sample(.25,.5);
    if(target==='length')assert.ok(restored.lengthScale>sample.lengthScale&&restored.lengthScale<1);
    if(target==='curl')assert.ok(restored.curlDelta>0&&restored.curlDelta<sample.curlDelta);
    if(target==='color'){
      assert.ok(restored.colorMix>0&&restored.colorMix<sample.colorMix);
      for(let axis=0;axis<3;axis++)assert.ok(Math.abs(restored.color[axis]-sample.color[axis])<1e-6);
      for(let offset=0;offset<field.data.length;offset+=4)if(field.data[offset+2]>0){
        const coverageRatio=field.data[offset+2]/before[offset+2];
        for(let axis=0;axis<3;axis++)assert.ok(Math.abs(field.colorData[offset+axis]-beforeColor[offset+axis]*coverageRatio)<1e-7);
      }
    }
    else assert.deepEqual(field.colorData,beforeColor);
  }
});

test('default full-strength restore returns the brush center to every identity channel',()=>{
  const field=new LocalCoatField(sphere),uv=[32.5/LOCAL_COAT_WIDTH,32.5/LOCAL_COAT_HEIGHT];
  for(const kind of ['trim','curl','dye'])assert.equal(field.stamp(makeStamp(kind,uv)),true);
  assert.equal(field.stamp(makeStamp('restore',uv,{value:undefined})),true);
  assert.equal(field.stamps.at(-1).target,'all');assert.equal(field.stamps.at(-1).value,1);
  assert.deepEqual(field.sample(...uv),{lengthScale:1,curlDelta:0,colorMix:0,color:[1,1,1]});
  const offset=(32*LOCAL_COAT_WIDTH+32)*4;
  assert.deepEqual(Array.from(field.colorData.slice(offset,offset+4)),[0,0,0,1]);
});

test('repeated restore converges to exact identity and later attempts do not consume capacity',()=>{
  const field=new LocalCoatField(sphere),identity=new LocalCoatField(sphere);
  for(const kind of ['trim','curl','dye'])field.stamp(makeStamp(kind));
  const restore=makeStamp('restore',[.25,.5],{radius:.6});
  let passes=0;
  while(field.stamp(restore)){
    passes++;assert.ok(passes<40,'the larger restore support should clear all previously edited texels');
  }
  assert.ok(passes>1);assert.deepEqual(field.data,identity.data);assert.deepEqual(field.colorData,identity.colorData);
  const count=field.stamps.length;
  for(let i=0;i<100;i++){
    assert.equal(field.stamp(restore),false);assert.equal(field.lastPaintResult.reason,'unchanged');
    assert.equal(field.lastPaintResult.changed,0);assert.ok(field.lastPaintResult.affected>0);
  }
  assert.equal(field.stamps.length,count);
});

test('zero-strength restore leaves even small existing residuals and history unchanged',()=>{
  const field=new LocalCoatField(sphere);
  field.stamp(makeStamp('trim'));field.stamp(makeStamp('curl'));field.stamp(makeStamp('dye'));
  const data=field.data.slice(),colorData=field.colorData.slice(),count=field.stamps.length;
  assert.equal(field.stamp(makeStamp('restore',[.25,.5],{value:0})),false);
  assert.equal(field.lastPaintResult.reason,'unchanged');assert.equal(field.lastPaintResult.changed,0);
  assert.deepEqual(field.data,data);assert.deepEqual(field.colorData,colorData);assert.equal(field.stamps.length,count);
});

test('restore follows surface distance across seams and cannot erase the opposite side',()=>{
  const field=new LocalCoatField(sphere);
  for(const uv of [[.25,.5],[.75,.5]])for(const kind of ['trim','curl','dye'])field.stamp(makeStamp(kind,uv));
  const back=field.sample(.75,.5),front=field.sample(.25,.5);
  assert.equal(field.stamp(makeStamp('restore',[.25,.5],{uv:[.75,.5]})),true,'point, rather than misleading UV metadata, controls contact');
  assert.deepEqual(field.sample(.75,.5),back);assert.ok(field.sample(.25,.5).lengthScale>front.lengthScale);
  const seam=new LocalCoatField(sphere);
  for(const kind of ['trim','curl','dye'])seam.stamp(makeStamp(kind,[0,.5]));
  const before=seam.sample(.001,.5);seam.stamp(makeStamp('restore',[0,.5],{value:.7}));
  const a=seam.sample(.001,.5),b=seam.sample(.999,.5);
  assert.ok(a.lengthScale>before.lengthScale);assert.ok(a.curlDelta<before.curlDelta);assert.ok(a.colorMix<before.colorMix);
  for(const key of ['lengthScale','curlDelta','colorMix'])assert.ok(Math.abs(a[key]-b[key])<1e-6);
});

test('restoring is ordered and undo replay recreates both the edited and restored fields exactly',()=>{
  const field=new LocalCoatField(sphere),replayed=new LocalCoatField(sphere);
  for(const kind of ['trim','curl','dye'])field.stamp(makeStamp(kind));
  const paintedHistory=structuredClone(field.stamps),paintedData=field.data.slice(),paintedColor=field.colorData.slice();
  field.stamp(makeStamp('restore',[.25,.5],{target:'length',value:.7}));
  field.stamp(makeStamp('restore',[.25,.5],{target:'color',value:.5}));
  const restoredHistory=structuredClone(field.stamps),restoredData=field.data.slice(),restoredColor=field.colorData.slice();
  assert.equal(replayed.replay(restoredHistory),true);assert.deepEqual(replayed.data,restoredData);assert.deepEqual(replayed.colorData,restoredColor);
  assert.equal(replayed.replay(paintedHistory),true);assert.deepEqual(replayed.data,paintedData);assert.deepEqual(replayed.colorData,paintedColor);
  assert.equal(replayed.replay(restoredHistory),true);assert.deepEqual(replayed.data,restoredData);assert.deepEqual(replayed.colorData,restoredColor);
  assert.equal(replayed.replay(restoredHistory),false);
});

test('multiple cache checkpoints preserve the exact unbaked result of mixed tools',()=>{
  const field=new LocalCoatField(sphere),unbaked=new LocalCoatField(sphere);
  const total=MAX_LOCAL_STAMPS*2+132;
  for(let i=0;i<total;i++){
    const kind=['trim','dye','curl','restore'][i%4];
    const raw=makeStamp(kind,[.25,.5],{value:kind==='trim'?.15:kind==='curl'?(i%8===2?.6:-.6):kind==='restore'?.4:.75,color:i%8<4?'#c4572b':'#2b57c4'});
    assert.equal(field.stamp(raw),true);unbaked.apply(sanitizeLocalEdits([raw])[0]);
    assert.equal(field.lastPaintResult.full,false);
  }
  assert.ok(field.baseSnapshot);assert.equal(field.stamps.length,total%MAX_LOCAL_STAMPS);
  assert.deepEqual(field.data,unbaked.data);assert.deepEqual(field.colorData,unbaked.colorData);
  const state=field.getState(),replayed=new LocalCoatField(sphere),data=replayed.data,colorData=replayed.colorData;
  assert.equal(replayed.replayState(state),true);assert.deepEqual(replayed.data,unbaked.data);assert.deepEqual(replayed.colorData,unbaked.colorData);
  assert.equal(replayed.data,data);assert.equal(replayed.colorData,colorData);assert.equal(replayed.replayState(state),false);
  assert.equal(state.snapshot,field.baseSnapshot);
  state.edits[0].point[0]=2.5;state.edits[0].uv[0]=.9;
  assert.notEqual(field.stamps[0].point[0],2.5);assert.notEqual(field.stamps[0].uv[0],.9,'getState must not expose mutable recent edit vectors');
});

test('undo and redo cross a checkpoint and clearing removes baked and recent edits',()=>{
  const field=new LocalCoatField(sphere),states=[],pixels=[];
  for(let i=0;i<MAX_LOCAL_STAMPS+2;i++){
    field.stamp(makeStamp('dye',[.25,.5],{color:i%2?'#aa2200':'#0022aa'}));
    if(i>=MAX_LOCAL_STAMPS-2){states.push(field.getState());pixels.push([field.data.slice(),field.colorData.slice()]);}
  }
  assert.equal(states[0].snapshot,'');assert.equal(states[0].edits.length,MAX_LOCAL_STAMPS-1);
  assert.ok(states[1].snapshot);assert.equal(states[1].edits.length,0);
  for(const index of [0,1,3,2,0,3]){
    assert.equal(field.replayState(states[index]),true);
    assert.deepEqual(field.data,pixels[index][0]);assert.deepEqual(field.colorData,pixels[index][1]);
  }
  const before=field.getState(),data=field.data.slice(),colorData=field.colorData.slice();
  assert.equal(field.replayState({snapshot:'lc1:bad',edits:[]}),false);
  assert.deepEqual(field.getState(),before);assert.deepEqual(field.data,data);assert.deepEqual(field.colorData,colorData);
  assert.equal(field.clear(),true);assert.deepEqual(field.getState(),{snapshot:'',edits:[]});
  assert.deepEqual(field.data,new LocalCoatField(sphere).data);assert.equal(field.clear(),false);
  assert.equal(field.replayState(states[1]),true);assert.equal(field.replay([]),true,'legacy replay explicitly starts from identity rather than keeping the baked base');
  assert.deepEqual(field.getState(),{snapshot:'',edits:[]});
});

test('seam continuity and opposite-side isolation survive baked snapshots plus recent restore',()=>{
  const field=new LocalCoatField(sphere);
  for(let i=0;i<MAX_LOCAL_STAMPS;i++)field.stamp(makeStamp('dye',[0,.5],{color:i%2?'#c4572b':'#2b57c4'}));
  assert.ok(field.baseSnapshot);assert.equal(field.stamps.length,0);
  field.stamp(makeStamp('restore',[0,.5],{target:'color',value:.5}));
  const restored=new LocalCoatField(sphere);restored.replayState(field.getState());
  assert.deepEqual(restored.data,field.data);assert.deepEqual(restored.colorData,field.colorData);
  const a=restored.sample(.001,.5),b=restored.sample(.999,.5);
  assert.ok(a.colorMix>0&&a.colorMix<1);assert.ok(Math.abs(a.colorMix-b.colorMix)<1e-6);
  for(let axis=0;axis<3;axis++)assert.ok(Math.abs(a.color[axis]-b.color[axis])<1e-6);
  assert.deepEqual(restored.sample(.5,.5),{lengthScale:1,curlDelta:0,colorMix:0,color:[1,1,1]});
});
