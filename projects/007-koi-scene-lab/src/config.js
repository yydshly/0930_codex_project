export const DEFAULTS = Object.freeze({
  hour: 16.3, clarity: 1.45, wind: 0.32, fishCount: 7, exposure: 1.12,
  pondScale: 1, deckScale: 1, houseScale: 1, weather: 'sunny', modelScale: 1,
  autoTour: false, paused: false, wireframe: false, sound: false, surfaceWakes: true, fishDetail: true,
});
// Experiments are deliberately separate from persisted scene settings.
export const EXPERIMENT_DEFAULTS=Object.freeze({separation:2.4,alignment:.4,cohesion:.22,collision:true});
export function validateExperiment(input={},base=EXPERIMENT_DEFAULTS){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('无效的原理实验参数');
  const result={...base};
  for(const key of Object.keys(input)){
    if(!Object.hasOwn(EXPERIMENT_DEFAULTS,key))throw new Error('未知的原理实验参数：'+key);
    const value=input[key];
    if(key==='collision'){if(typeof value!=='boolean')throw new Error('碰撞实验开关必须为布尔值');}
    else if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>5)throw new Error('实验权重须在0到5之间：'+key);
    result[key]=value;
  }
  return result;
}
export const REFERENCE_CAMERA = { position: [0.5, 3.6, 9.8], target: [0, 0.0, -1.6], fov: 53 };
export const VIEWS = {
  reference: REFERENCE_CAMERA,
  aerial: { position: [10, 13, 12], target: [0, 0, -1], fov: 49 },
  pond: { position: [0, 1.0, 5.3], target: [-0.5, 0.02, -1.1], fov: 56 },
  shoal: { position: [0,4.7,5.6],target: [-.5,.02,.4],fov: 45 },
  deck: { position: [6.0, 1.9, 3.0], target: [-0.4, 0.8, -2], fov: 54 },
};
export function validateSettings(input) {
  const result = { ...DEFAULTS };
  const ranges = { hour: [6, 20], clarity: [0.3, 2], wind: [0, 1], fishCount: [0, 20],
    exposure: [0.5, 1.8], pondScale: [0.65, 1.25], deckScale: [0.7, 1.4], houseScale: [0.8, 1.3], modelScale: [0.05, 5] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < min || input[key] > max)
        throw new Error('无效的场景参数：' + key);
      result[key] = key === 'fishCount' ? Math.round(input[key]) : input[key];
    }
  }
  for (const key of ['autoTour', 'paused', 'wireframe', 'sound', 'surfaceWakes', 'fishDetail']) if (typeof input[key] === 'boolean') result[key] = input[key];
  if (input.weather !== undefined) {
    if (!['sunny', 'dusk', 'rain'].includes(input.weather)) throw new Error('未知的天气');
    result.weather = input.weather;
  }
  return result;
}
export function pondBoundary(theta, scale = 1) {
  const irregular = 1 + 0.055 * Math.sin(theta * 3 + 0.8) + 0.035 * Math.sin(theta * 5);
  return { x: -0.5 + Math.cos(theta) * 4.55 * irregular * scale, z: -0.15 + Math.sin(theta) * (Math.sin(theta)>0?4.65:3.02) * irregular * scale };
}
export function isInPond(x, z, scale = 1) {
  const nx=(x+0.5)/(4.55*scale),nz=(z+0.15)/((z>-.15?4.65:3.02)*scale),theta=Math.atan2(nz,nx);
  const radius=1+0.055*Math.sin(theta*3+0.8)+0.035*Math.sin(theta*5)-0.02;
  return Math.hypot(nx,nz)<radius;
}
