import test from 'node:test';
import assert from 'node:assert/strict';
import {exportGaussianPly, parseGaussianPly, SH_C0, MAX_PLY_BYTES, MAX_PLY_SPLATS} from '../src/gaussian-ply.js';
import {createPlushSplats} from '../src/gaussian-plush.js';

const names=['x','y','z','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3'];
const row=[1,2,-3,0,1,-1,0,Math.log(.2),Math.log(.03),Math.log(.7),Math.SQRT1_2,0,Math.SQRT1_2,0];
const encoder=new TextEncoder();
const ascii=(values=row,extra='',count=1,properties=names.map(name => `property double ${name}`)) => encoder.encode(`ply\nformat ascii 1.0\nelement vertex ${count}\n${properties.join('\n')}\n${extra}end_header\n${values.join(' ')}\n`);
const close=(a,b,tolerance=2e-7) => assert.ok(Math.abs(a-b) < tolerance,`${a} ~= ${b}`);
const source={splats:[
  {position:[.123,-.5,3],scale:[.02,.1,.007],rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],color:[.01,.32,.94],opacity:.87},
  {position:[-1.2,4.5,-.3],scale:[.4,.04,.01],rotation:[-.3,.4,0,-Math.sqrt(.75)],color:[1,0,.5],opacity:.03},
],meta:{source:'test'}};

function headerEnd(bytes) {
  const marker=encoder.encode('end_header\n');
  for (let i=0;i<bytes.length-marker.length;i++) if (marker.every((v,j) => bytes[i+j] === v)) return i+marker.length;
  throw new Error('missing header');
}

test('standard binary PLY roundtrip preserves positions, covariance orientation, linear DC color and logits', () => {
  const original=structuredClone(source), bytes=exportGaussianPly(source), decoded=parseGaussianPly(bytes);
  assert.ok(bytes instanceof Uint8Array); assert.deepEqual(source,original);
  assert.equal(decoded.meta.format,'binary_little_endian'); assert.equal(decoded.meta.degree0Only,true);
  assert.equal(decoded.meta.ignoredSHProperties,0);
  const offset=headerEnd(bytes), view=new DataView(bytes.buffer,bytes.byteOffset+offset);
  close(view.getFloat32(6*4,true),(.01-.5)/SH_C0);
  close(view.getFloat32(10*4,true),Math.log(.02));
  close(view.getFloat32(13*4,true),Math.SQRT1_2); // rot_0 is W.
  close(view.getFloat32(15*4,true),Math.SQRT1_2); // rot_2 is Y.
  for (let i=0;i<source.splats.length;i++) {
    for (const field of ['position','scale','rotation','color']) {
      source.splats[i][field].forEach((value,axis) => close(decoded.splats[i][field][axis],value));
    }
    close(decoded.splats[i].opacity,source.splats[i].opacity);
  }
  const buffer=new Uint8Array(bytes.length+20); buffer.set(bytes,11);
  assert.deepEqual(parseGaussianPly(buffer.subarray(11,11+bytes.length)),decoded,'byte offset is respected');
  assert.deepEqual(parseGaussianPly(bytes.buffer),decoded);
});

test('ASCII parsing accepts scalar ordering, double precision, SH extras and preserves source coordinates', () => {
  const reversed=[...names].reverse(), values=[...row].reverse();
  const text=ascii([...values,.125], '',1,[...reversed.map(name => `property double ${name}`),'property float f_rest_0']);
  const dataset=parseGaussianPly(text), splat=dataset.splats[0];
  assert.deepEqual(splat.position,[1,2,-3]);
  splat.scale.forEach((value,axis) => close(value,[.2,.03,.7][axis]));
  splat.rotation.forEach((value,axis) => close(value,[0,Math.SQRT1_2,0,Math.SQRT1_2][axis]));
  close(splat.color[0],.5); close(splat.color[1],.5+SH_C0); close(splat.color[2],.5-SH_C0);
  assert.equal(splat.opacity,.5); assert.equal(dataset.meta.ignoredSHProperties,1);
  assert.equal(dataset.meta.shDegree,0);
  const mixed=names.map(name => `property ${['x','y','z','rot_1','rot_3'].includes(name) ? 'int' : 'double'} ${name}`);
  assert.deepEqual(parseGaussianPly(ascii(row,'',1,mixed)).splats[0].position,[1,2,-3]);
  const crlf=encoder.encode(new TextDecoder().decode(ascii()).replaceAll('\n','\r\n'));
  assert.deepEqual(parseGaussianPly(crlf).splats,parseGaussianPly(ascii()).splats);
});

test('binary parser reads mixed scalar types and normalizes WXYZ quaternion', () => {
  const properties=names.map(name => ({name,type: name === 'x' ? 'short' : name === 'rot_3' ? 'uchar' : 'double'}));
  const header=encoder.encode(`ply\nformat binary_little_endian 1.0\nelement vertex 1\n${properties.map(p => `property ${p.type} ${p.name}`).join('\n')}\nend_header\n`);
  const payload=new Uint8Array(2+1+(names.length-2)*8), view=new DataView(payload.buffer);
  let offset=0;
  properties.forEach((property,i) => {
    if (property.type === 'short') {view.setInt16(offset,row[i],true); offset+=2;}
    else if (property.type === 'uchar') {view.setUint8(offset,row[i]); offset++;}
    else {view.setFloat64(offset,row[i]*(property.name.startsWith('rot_') ? 3 : 1),true); offset+=8;}
  });
  const bytes=new Uint8Array(header.length+payload.length); bytes.set(header); bytes.set(payload,header.length);
  const parsed=parseGaussianPly(bytes);
  assert.deepEqual(parsed.splats[0].position,[1,2,-3]);
  close(Math.hypot(...parsed.splats[0].rotation),1);
  close(parsed.splats[0].rotation[1],Math.SQRT1_2);
});

test('opacity endpoints stay finite, out-of-range SH DC is reported and clamped', () => {
  const dataset={splats:[{...source.splats[0],opacity:0},{...source.splats[1],opacity:1}]};
  const result=parseGaussianPly(exportGaussianPly(dataset));
  close(result.splats[0].opacity,0); close(result.splats[1].opacity,1);
  const oversized=[...row]; oversized[3]=100;
  const clipped=parseGaussianPly(ascii(oversized));
  assert.equal(clipped.splats[0].color[0],1); assert.equal(clipped.meta.clippedColorCount,1);
});

test('PLY rejects malformed, unsupported, truncated, nonfinite and oversized input atomically', () => {
  assert.throws(() => parseGaussianPly('ply'),/ArrayBuffer/);
  assert.throws(() => parseGaussianPly(encoder.encode('ply')),/过短/);
  assert.throws(() => parseGaussianPly(new Uint8Array(MAX_PLY_BYTES+1)),/32 MiB/);
  assert.throws(() => parseGaussianPly(ascii(row,'',MAX_PLY_SPLATS+1)),/120000/);
  assert.throws(() => parseGaussianPly(ascii(row,'',0)),/至少一个/);
  assert.throws(() => parseGaussianPly(ascii(row.slice(1))),/数据/);
  assert.throws(() => parseGaussianPly(ascii([...row,42])),/数量/);
  assert.throws(() => parseGaussianPly(ascii(row,'property double x\n')),/重复/);
  assert.throws(() => parseGaussianPly(ascii(row,'property list uchar float extra\n')),/list/);
  assert.throws(() => parseGaussianPly(ascii(row,'element face 1\n')),/vertex/);
  const text=new TextDecoder().decode(ascii());
  assert.throws(() => parseGaussianPly(encoder.encode(text.replace('format ascii','format binary_big_endian'))),/little_endian/);
  assert.throws(() => parseGaussianPly(encoder.encode(text.replace('property double scale_2\n',''))),/缺少/);
  for (const value of [NaN,Infinity,-Infinity]) {
    const bad=[...row]; bad[2]=value;
    assert.throws(() => parseGaussianPly(ascii(bad)),/数值/);
  }
  const zeroQuaternion=[...row]; zeroQuaternion.splice(10,4,0,0,0,0);
  assert.throws(() => parseGaussianPly(ascii(zeroQuaternion)),/四元数/);
  const badScale=[...row]; badScale[7]=10000;
  assert.throws(() => parseGaussianPly(ascii(badScale)),/scale/);
  badScale[7]=-10000; assert.throws(() => parseGaussianPly(ascii(badScale)),/scale/);
  assert.throws(() => parseGaussianPly(ascii([...row,'NaN'],'',1,[...names.map(name => `property float ${name}`),'property float f_rest_0'])),/数值/,'ignored SH still must be finite');
  const bytes=exportGaussianPly(source);
  assert.throws(() => parseGaussianPly(bytes.subarray(0,-1)),/长度/);
  const badBinary=bytes.slice(); new DataView(badBinary.buffer).setFloat32(headerEnd(badBinary),Infinity,true);
  assert.throws(() => parseGaussianPly(badBinary),/Infinity/);
});

test('export rejects invalid values before emitting bytes and a procedural asset roundtrips completely', () => {
  for (const override of [{scale:[.1,0,.1]},{color:[0,2,0]},{position:[NaN,0,0]},{rotation:[0,0,0,0]},{opacity:1.1}]) {
    assert.throws(() => exportGaussianPly({splats:[{...source.splats[0],...override}]}));
  }
  assert.throws(() => exportGaussianPly({splats:[]}),/有效高斯/);
  const generated=createPlushSplats({count:2000}), bytes=exportGaussianPly(generated), decoded=parseGaussianPly(bytes);
  assert.equal(decoded.splats.length,generated.splats.length);
  for (let i=0;i<decoded.splats.length;i++) {
    decoded.splats[i].scale.forEach((value,axis) => close(value,generated.splats[i].scale[axis]));
    decoded.splats[i].rotation.forEach((value,axis) => close(value,generated.splats[i].rotation[axis]));
  }
});
