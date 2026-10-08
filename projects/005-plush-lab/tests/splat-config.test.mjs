import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SPLAT_CONFIG,encodeSplatConfig,decodeSplatConfig,sanitizeSplatConfig,SPLAT_CONFIG_KEY} from '../src/splat-config.js';
test('Gaussian recipe preserves a Unicode seed and editable parameters',()=>{
  const config={...DEFAULT_SPLAT_CONFIG,seed:'蓝莓与星星',hat:false,softness:0.8,count:50000};
  assert.deepEqual(decodeSplatConfig(encodeSplatConfig(config)),config);
  assert.equal(SPLAT_CONFIG_KEY,'plush-gaussian-lab-v1');
});
test('malformed or unbounded recipes are rejected before replacing the displayed asset',()=>{
  for(const patch of [{version:2},{count:900000},{softness:NaN},{hat:'yes'},{seed:''},{color:'<script>'},{shape:'unknown'}]){
    assert.throws(()=>sanitizeSplatConfig({...DEFAULT_SPLAT_CONFIG,...patch}));
  }
  assert.throws(()=>decodeSplatConfig('%broken'));
  assert.throws(()=>decodeSplatConfig('a'.repeat(2001)));
});
test('close-up quality and all earlier saved quality levels survive sharing',()=>{
  for(const count of [18000,32000,50000,80000]){
    const config={...DEFAULT_SPLAT_CONFIG,count};
    assert.deepEqual(decodeSplatConfig(encodeSplatConfig(config)),config);
  }
});
