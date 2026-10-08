import test from 'node:test';
import assert from 'node:assert/strict';
import {SHELL_LAYERS,shellLayers,shellRadius,shellVolumeSlice} from '../src/shell-model.js';

test('shells are evenly ordered from skin to envelope with no zero layer',()=>{
  const layers=shellLayers();assert.equal(layers.length,SHELL_LAYERS);
  assert.equal(layers.at(-1),1);assert.equal(layers[0],1/SHELL_LAYERS);
  for(let i=1;i<layers.length;i++)assert.equal(layers[i]-layers[i-1],1/SHELL_LAYERS);
  for(const count of [1,65,2.5,NaN])assert.throws(()=>shellLayers(count),RangeError);
});
test('fiber cross-sections taper toward tips and narrow when wet',()=>{
  let previous=Infinity;
  for(const layer of shellLayers()){const radius=shellRadius(layer);assert.ok(radius>=0&&radius<previous);previous=radius;assert.ok(shellRadius(layer,1)<=radius);}
  assert.equal(shellRadius(1),0);assert.equal(shellRadius(0,2),shellRadius(0,1));
});
test('fixed-seed periodic volume samples are reproducible and retain height variation',()=>{
  const a=shellVolumeSlice(64,8),b=shellVolumeSlice(64,8);assert.deepEqual(a,b);assert.equal(a.length,64*64*4);
  const heights=new Set();
  for(let i=0;i<a.length;i+=4){assert.ok(a[i]>=0&&a[i]<=255);assert.ok(a[i+1]>=153);assert.ok(a[i+2]>=209);assert.equal(a[i+3],255);heights.add(a[i+1]);}
  assert.ok(heights.size>10);assert.throws(()=>shellVolumeSlice(63,8),RangeError);
});
