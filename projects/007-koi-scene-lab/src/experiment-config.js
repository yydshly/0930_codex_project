export const EXPERIMENT_DEFAULTS=Object.freeze({
 separation:2.4,alignment:.4,cohesion:.22,collision:true,normalCorrection:true,
 overlay:Object.freeze({vectors:false,collision:false}),waterDebug:'natural'
});
const weights=['separation','alignment','cohesion'],toggles=['collision','normalCorrection'];
export function validateExperiment(patch={},current=EXPERIMENT_DEFAULTS){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('实验参数必须为对象');
 const result={...current,overlay:{...current.overlay}};
 for(const key of Object.keys(patch))if(!Object.hasOwn(EXPERIMENT_DEFAULTS,key))throw new Error('未知实验参数：'+key);
 for(const key of weights)if(Object.hasOwn(patch,key)){
  const v=patch[key];if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>5)throw new Error(key+' 需要为 0 到 5 的有限数值');result[key]=v;
 }
 for(const key of toggles)if(Object.hasOwn(patch,key)){
  if(typeof patch[key]!=='boolean')throw new Error(key+' 需要为开关值');result[key]=patch[key];
 }
 if(Object.hasOwn(patch,'waterDebug')){
  if(!['natural','height','normal'].includes(patch.waterDebug))throw new Error('无效水面观察模式');result.waterDebug=patch.waterDebug;
 }
 if(Object.hasOwn(patch,'overlay')){
  const overlay=patch.overlay;if(!overlay||typeof overlay!=='object'||Array.isArray(overlay))throw new Error('叠加观察参数必须为对象');
  for(const key of Object.keys(overlay)){
   if(!['vectors','collision'].includes(key)||typeof overlay[key]!=='boolean')throw new Error('无效叠加观察开关：'+key);
   result.overlay[key]=overlay[key];
  }
 }
 return result;
}
export function experimentDuration(value=8){
 if(typeof value!=='number'||!Number.isFinite(value)||value<1||value>20)throw new Error('对照时长需要为 1 到 20 秒');return value;
}
export function experimentFingerprint(context){return JSON.stringify(context);}
export function trajectorySignature(fish){
 const text=JSON.stringify(fish.map(f=>({position:f.position.map(v=>Number(v.toFixed(10))),heading:Number(f.heading.toFixed(10)),speed:Number(f.speed.toFixed(10)),phase:Number(f.phase.toFixed(10))})));
 let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);}
 // Compact deterministic comparison label, not a cryptographic integrity hash.
 return (hash>>>0).toString(16).padStart(8,'0');
}
