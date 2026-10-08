import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_COAT_SNAPSHOT_LENGTH, encodeLocalSnapshot, sanitizeLocalSnapshot, applyLocalSnapshot} from '../src/local-coat-snapshot.js';

const TEXELS=128*64,RECORD_BYTES=26;
const identity=()=>{
  const data=new Float32Array(TEXELS*4),colorData=new Float32Array(TEXELS*4);
  for(let offset=0;offset<data.length;offset+=4){data[offset]=1;data[offset+3]=colorData[offset+3]=1;}
  return {data,colorData};
};
const bytesOf=array=>new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
const tokenFromBytes=bytes=>{
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return 'lc1:'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const bytesFromToken=token=>{
  const value=token.slice(4).replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(value.padEnd(Math.ceil(value.length/4)*4,'=')),char=>char.charCodeAt(0));
};
function rawSnapshot(records,count=records.length){
  const bytes=new Uint8Array(2+records.length*RECORD_BYTES),view=new DataView(bytes.buffer);
  view.setUint16(0,count,true);
  records.forEach(([index,values],record)=>{
    const offset=2+record*RECORD_BYTES;view.setUint16(offset,index,true);
    values.forEach((value,channel)=>view.setFloat32(offset+2+channel*4,value,true));
  });
  return tokenFromBytes(bytes);
}
const validValues=[.5,-.25,.75,.125,.25,.5];

test('missing and explicit identity checkpoints canonicalize to an empty string',()=>{
  const {data,colorData}=identity();assert.equal(encodeLocalSnapshot(data,colorData),'');
  for(const raw of [undefined,null,'',rawSnapshot([]),rawSnapshot([[3,[1,0,0,0,0,0]]])]){
    assert.equal(sanitizeLocalSnapshot(raw),'');
    data[0]=.5;colorData[0]=.2;
    assert.equal(applyLocalSnapshot(raw,data,colorData),true);assert.deepEqual(data,identity().data);assert.deepEqual(colorData,identity().colorData);
  }
});

test('sparse checkpoints preserve exact Float32 bits, extrema and negative zero',()=>{
  const {data,colorData}=identity();
  const records=[[0,[Math.fround(.08),-1,1,1,0,.125]],[4312,[.7654321,.23456789,.456789,.12345,.23456,.34567]],[8191,[1,-0,0,-0,0,0]]];
  for(const [index,values] of records){data.set(values.slice(0,3),index*4);colorData.set(values.slice(3),index*4);}
  const token=encodeLocalSnapshot(data,colorData);assert.match(token,/^lc1:[A-Za-z0-9_-]+$/);
  const bytes=bytesFromToken(token),view=new DataView(bytes.buffer);
  assert.equal(view.getUint16(0,true),3);assert.equal(bytes.length,2+3*RECORD_BYTES);
  assert.equal(view.getUint16(2,true),0);assert.equal(view.getFloat32(4,true),Math.fround(.08));
  assert.equal(sanitizeLocalSnapshot(token),token);
  const restored=identity();assert.equal(applyLocalSnapshot(token,restored.data,restored.colorData),true);
  assert.deepEqual(bytesOf(restored.data),bytesOf(data));assert.deepEqual(bytesOf(restored.colorData),bytesOf(colorData));
  assert.ok(Object.is(restored.data[8191*4+1],-0));assert.ok(Object.is(restored.colorData[8191*4],-0));
  assert.equal(encodeLocalSnapshot(restored.data,restored.colorData),token);
});

test('dense checkpoints fit the exact maximum and retain every texel without quantization',()=>{
  const {data,colorData}=identity();
  for(let index=0;index<TEXELS;index++){
    const offset=index*4,coverage=(index%997+1)/998;
    data.set([.08+.9*(index/TEXELS),index%2?.87654321:-.7654321,coverage],offset);
    colorData.set([coverage*.123456789,coverage*.456789123,coverage*.987654321],offset);
  }
  const token=encodeLocalSnapshot(data,colorData);
  assert.equal(token.length,MAX_COAT_SNAPSHOT_LENGTH);assert.equal(sanitizeLocalSnapshot(token),token);
  const restored=identity();assert.equal(applyLocalSnapshot(token,restored.data,restored.colorData),true);
  assert.deepEqual(bytesOf(restored.data),bytesOf(data));assert.deepEqual(bytesOf(restored.colorData),bytesOf(colorData));
});

test('canonical snapshots strip redundant identity records and normalize unused base64 bits',()=>{
  const raw=rawSnapshot([[0,[1,0,0,0,0,0]],[9,validValues]]),canonical=rawSnapshot([[9,validValues]]);
  assert.equal(sanitizeLocalSnapshot(raw),canonical);
  const zero='lc1:AAB';assert.equal(sanitizeLocalSnapshot(zero),'','unused bits in the final base64 character do not change its two decoded zero bytes');
  const restored=identity();assert.equal(applyLocalSnapshot(raw,restored.data,restored.colorData),true);
  assert.equal(encodeLocalSnapshot(restored.data,restored.colorData),canonical);
});

test('small Float32 bound rounding is retained rather than clamped',()=>{
  const coverage=Math.fround(.2),rgb=Math.fround(coverage+5e-8);
  const raw=rawSnapshot([[0,[Math.fround(.08),0,coverage,rgb,0,0]]]);
  assert.equal(sanitizeLocalSnapshot(raw),raw);
  const target=identity();assert.equal(applyLocalSnapshot(raw,target.data,target.colorData),true);
  assert.equal(target.data[0],Math.fround(.08));assert.equal(target.colorData[0],rgb);assert.ok(target.colorData[0]>target.data[2]);
});

test('malformed tokens, counts, lengths, ordering and indices reject before mutating either array',()=>{
  const good=rawSnapshot([[1,validValues],[5,validValues]]),bytes=bytesFromToken(good);
  const truncated=tokenFromBytes(bytes.slice(0,-1)),trailing=new Uint8Array(bytes.length+1);trailing.set(bytes);
  const invalid=[0,[],{},true,'lc2:AAA','lc1:','lc1:%','lc1:A','lc1:AA=','lc1:AA+','lc1:AAA/',
    'lc1:'+'A'.repeat(MAX_COAT_SNAPSHOT_LENGTH),tokenFromBytes(new Uint8Array([1])),
    rawSnapshot([],8193),rawSnapshot([[1,validValues]],2),truncated,tokenFromBytes(trailing),
    rawSnapshot([[1,validValues],[1,validValues]]),rawSnapshot([[5,validValues],[1,validValues]]),
    rawSnapshot([[8192,validValues]]),rawSnapshot([[65535,validValues]])];
  const target=identity();applyLocalSnapshot(good,target.data,target.colorData);
  const beforeData=target.data.slice(),beforeColor=target.colorData.slice();
  for(const raw of invalid){
    assert.equal(sanitizeLocalSnapshot(raw),null);assert.equal(applyLocalSnapshot(raw,target.data,target.colorData),false);
    assert.deepEqual(target.data,beforeData);assert.deepEqual(target.colorData,beforeColor);
  }
});

test('all six numeric channels reject nonfinite and materially out-of-range values',()=>{
  const target=identity(),beforeData=target.data.slice(),beforeColor=target.colorData.slice();
  const invalid=[];
  for(let channel=0;channel<6;channel++)for(const value of [NaN,Infinity,-Infinity]){
    const values=[...validValues];values[channel]=value;invalid.push(values);
  }
  for(const [channel,value] of [[0,.0799],[0,1.01],[1,-1.01],[1,1.01],[2,-.01],[2,1.01],[3,-.01],[4,1],[5,.75001]]){
    const values=[...validValues];values[channel]=value;invalid.push(values);
  }
  for(const values of invalid){
    const raw=rawSnapshot([[1,validValues],[5,values]]);
    assert.equal(sanitizeLocalSnapshot(raw),null);assert.equal(applyLocalSnapshot(raw,target.data,target.colorData),false);
    assert.deepEqual(target.data,beforeData);assert.deepEqual(target.colorData,beforeColor,'even a malformed final record cannot partially apply the valid first record');
  }
});

test('encoder and target shape checks reject unsupported arrays and leave inputs intact',()=>{
  const {data,colorData}=identity();
  assert.throws(()=>encodeLocalSnapshot(new Float32Array(4),colorData),TypeError);
  assert.throws(()=>encodeLocalSnapshot(Array.from(data),colorData),TypeError);
  data[0]=NaN;assert.throws(()=>encodeLocalSnapshot(data,colorData),RangeError);assert.ok(Number.isNaN(data[0]));
  data[0]=1;const short=new Float32Array([.2,.3]);
  assert.equal(applyLocalSnapshot('',short,colorData),false);assert.deepEqual(short,new Float32Array([.2,.3]));
  assert.equal(applyLocalSnapshot('',data,data),false,'overlapping outputs cannot hold two independently reconstructed textures');
});
