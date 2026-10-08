import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalibration} from '../src/model-calibration.js';
import {calibrationStatusText} from '../src/calibration-status.js';
const meta={name:'test.glb',sha256:'a'.repeat(64),sourceSize:[10,4,8]},points=[{x:-2,y:2,z:4},{x:2,y:2,z:4}],record=createCalibration(points,8,meta);

test('pending display separates fresh point distance from the older physical calibration',()=>{
 const fresh=[{x:0,y:1,z:0},{x:1,y:1,z:0}];
 const text=calibrationStatusText({points:fresh,record,pending:true},2);
 assert.match(text,/草稿距离 1\.0000 模型单位/);assert.match(text,/旧校准 8\.000 米保持生效/);
 assert.ok(!text.includes('1.0000 模型单位 → 8.000 米'));
});
test('committed display derives length from the record points, never a stale draft metric',()=>{
 const text=calibrationStatusText({points:[{x:0,y:0,z:0},{x:1,y:0,z:0}],record,modelDistance:1,pending:false},2);
 assert.match(text,/4\.0000 模型单位 → 8\.000 米/);assert.match(text,/2\.00000 米\/模型单位/);
});
test('unapplied selections describe scene units and cancellation rather than physical meters',()=>{
 const text=calibrationStatusText({points,record:null,pending:true},2);
 assert.match(text,/尚未应用尺寸校准/);assert.match(text,/取消可回退/);
 assert.equal(calibrationStatusText({points:[],record:null,pending:false},2),'当前倍率尚无尺寸校准记录；可先选取两点。');
});
