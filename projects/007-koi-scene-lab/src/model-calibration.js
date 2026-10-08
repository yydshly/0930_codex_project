// Calibration measures the imported model before its wrapper scale. The loader
// recenters the model but does not change its length units, so a distance in this
// coordinate system is the same distance as in the original GLB.
export const CALIBRATION_FORMAT='koi-model-calibration/v1';
export const CALIBRATION_COORDINATES='centered-model-local';
export const CALIBRATION_METERS_RANGE=Object.freeze([.001,1000]);
export const CALIBRATION_SCALE_RANGE=Object.freeze([.05,5]);
const minimumLength=1e-9;
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function modelPoint(value){
 if(!isRecord(value)||!['x','y','z'].every(key=>finite(value[key])&&Math.abs(value[key])<=1e9))throw new Error('校准点需要有限的模型坐标');
 return {x:value.x,y:value.y,z:value.z};
}
export function modelDistance(points){
 if(!Array.isArray(points)||points.length!==2)throw new Error('请先在模型表面选择两个校准点');
 const [a,b]=points.map(modelPoint),distance=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 if(!Number.isFinite(distance)||distance<=minimumLength)throw new Error('两个校准点太近，请选择不同的模型位置');
 return distance;
}
export function calibrationScale(points,realDistanceMeters){
 if(!finite(realDistanceMeters)||realDistanceMeters<CALIBRATION_METERS_RANGE[0]||realDistanceMeters>CALIBRATION_METERS_RANGE[1])throw new Error('已知距离应为0.001–1000米');
 const scale=realDistanceMeters/modelDistance(points);
 if(!finite(scale)||scale<CALIBRATION_SCALE_RANGE[0]||scale>CALIBRATION_SCALE_RANGE[1])throw new Error('校准倍率超出0.05–5；请在建模软件中先调整模型单位后重新导入');
 return scale;
}
function fingerprint(meta){
 if(!isRecord(meta)||typeof meta.sha256!=='string'||!/^[0-9a-f]{64}$/i.test(meta.sha256))throw new Error('当前模型缺少有效指纹');
 return meta.sha256.toLowerCase();
}
export function assertPointsInModel(points,meta){
 if(!Array.isArray(meta?.sourceSize)||meta.sourceSize.length!==3||!meta.sourceSize.every(v=>finite(v)&&v>=0))throw new Error('当前模型缺少有效尺寸');
 const [x,y,z]=meta.sourceSize,tolerance=Math.max(1e-7,Math.hypot(x,y,z)*1e-6);
 for(const point of points){const p=modelPoint(point);if(Math.abs(p.x)>x/2+tolerance||p.y< -tolerance||p.y>y+tolerance||Math.abs(p.z)>z/2+tolerance)throw new Error('校准点超出当前模型范围');}
}
export function createCalibration(points,realDistanceMeters,meta){
 const modelScale=calibrationScale(points,realDistanceMeters),cleanPoints=points.map(modelPoint);assertPointsInModel(cleanPoints,meta);
 return {format:CALIBRATION_FORMAT,coordinateSystem:CALIBRATION_COORDINATES,modelSha256:fingerprint(meta),modelName:String(meta.name||'model.glb'),points:cleanPoints,realDistanceMeters,metersPerModelUnit:modelScale,modelScale};
}
export function validateCalibration(data,meta,{modelScale}={}){
 if(!isRecord(data)||data.format!==CALIBRATION_FORMAT||data.coordinateSystem!==CALIBRATION_COORDINATES)throw new Error('不是本页的模型尺度校准文件');
 if(typeof data.modelSha256!=='string'||data.modelSha256.toLowerCase()!==fingerprint(meta))throw new Error('校准文件与当前 GLB 不匹配，请载入对应模型');
 const clean=createCalibration(data.points,data.realDistanceMeters,meta),close=(a,b)=>finite(a)&&Math.abs(a-b)<=Math.max(1e-10,Math.abs(b)*1e-9);
 if(!close(data.metersPerModelUnit,clean.modelScale)||!close(data.modelScale,clean.modelScale))throw new Error('校准文件的比例与两点距离不一致');
 if(modelScale!==undefined&&!close(modelScale,clean.modelScale))throw new Error('校准记录与当前模型倍率不同，请重新校准');
 return clean;
}
