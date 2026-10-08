import {modelDistance} from './model-calibration.js';
const distance=points=>{try{return modelDistance(points);}catch{return null;}};
const number=(value,digits)=>Number.isFinite(value)?value.toFixed(digits):'—';

// A pending selection may coexist with an older effective record. Never pair
// the draft's distance with the committed record's known physical length.
export function calibrationStatusText(state,modelScale){
 const s=state||{points:[],record:null},record=s.record,points=s.points||[];
 if(s.pending){const draft=points.length===2?` · 草稿距离 ${number(distance(points),4)} 模型单位`:'';
  const previous=record?` · 旧校准 ${number(record.realDistanceMeters,3)} 米保持生效`:' · 尚未应用尺寸校准';
  return `校准草稿 · 已选 ${points.length}/2 点${draft}${previous}；应用后替换，取消可回退。`;
 }
 if(record)return `已校准 · 原始距离 ${number(distance(record.points),4)} 模型单位 → ${number(record.realDistanceMeters,3)} 米 · 比例 ${number(record.metersPerModelUnit,5)} 米/模型单位`;
 if(points.length===2)return `已选两点 · 原始距离 ${number(distance(points),4)} 模型单位 · 当前显示距离 ${number(distance(points)*modelScale,3)} 场景单位；输入已知实际直线长度后应用。`;
 return '当前倍率尚无尺寸校准记录；可先选取两点。';
}
