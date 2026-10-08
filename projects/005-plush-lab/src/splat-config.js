export const SPLAT_CONFIG_KEY = 'plush-gaussian-lab-v1';
export const DEFAULT_SPLAT_CONFIG = Object.freeze({version:1,seed:'soft-star-2026',shape:'star',color:'#8bacee',softness:0.55,count:80000,hat:true});

export function sanitizeSplatConfig(value){
  if(!value || typeof value!=='object' || Array.isArray(value) || value.version!==1) throw new Error('搭配格式不支持，请使用此页导出的搭配链接。');
  const seed=typeof value.seed==='string'?value.seed.trim():'';
  if(!seed || seed.length>40 || /[\u0000-\u001f]/u.test(seed)) throw new Error('种子需要 1–40 个字符。');
  if(!['star','cloud','orb'].includes(value.shape)) throw new Error('请选择支持的角色轮廓。');
  if(!/^#[0-9a-f]{6}$/i.test(value.color)) throw new Error('毛色需要有效的六位颜色。');
  if(![18000,32000,50000,80000].includes(value.count)) throw new Error('请选择支持的毛簇精细度。');
  if(!Number.isFinite(value.softness) || value.softness<0.15 || value.softness>0.85) throw new Error('毛簇蓬松度超出范围。');
  if(typeof value.hat!=='boolean') throw new Error('帽饰设置无效。');
  return {version:1,seed,shape:value.shape,color:value.color.toLowerCase(),softness:value.softness,count:value.count,hat:value.hat};
}

export function encodeSplatConfig(config){return encodeURIComponent(JSON.stringify(sanitizeSplatConfig(config)));}
export function decodeSplatConfig(encoded){
  if(typeof encoded!=='string' || encoded.length>2000) throw new Error('搭配链接过长或无效。');
  try{return sanitizeSplatConfig(JSON.parse(decodeURIComponent(encoded)));}
  catch(error){if(error instanceof SyntaxError || error instanceof URIError) throw new Error('无法读取这组搭配链接。');throw error;}
}
