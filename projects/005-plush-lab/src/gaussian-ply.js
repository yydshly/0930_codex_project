/** Uncompressed, degree-zero 3D Gaussian Splatting PLY interoperability.
 * Internal rotations: XYZW; standard 3DGS PLY rotations: WXYZ.
 * Internal linear RGB -> SH DC, standard deviations -> logarithms, alpha ->
 * logits. Additional f_rest_* values are validated then deliberately ignored.
 * Coordinates are preserved; centering and fitting belong to the viewer. */
export const SH_C0 = .28209479177387814;
export const MAX_PLY_SPLATS = 120000;
export const MAX_PLY_BYTES = 32 * 1024 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;
const MAX_PROPERTIES = 256;
const FLOAT32_MAX = 3.4028234663852886e38;
const REQUIRED = ['x','y','z','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3'];
const EXPORTED = ['x','y','z','nx','ny','nz','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3'];
const TYPES = Object.freeze({
  char:{size:1,get:'getInt8',min:-128,max:127,integer:true}, int8:{size:1,get:'getInt8',min:-128,max:127,integer:true},
  uchar:{size:1,get:'getUint8',min:0,max:255,integer:true}, uint8:{size:1,get:'getUint8',min:0,max:255,integer:true},
  short:{size:2,get:'getInt16',min:-32768,max:32767,integer:true}, int16:{size:2,get:'getInt16',min:-32768,max:32767,integer:true},
  ushort:{size:2,get:'getUint16',min:0,max:65535,integer:true}, uint16:{size:2,get:'getUint16',min:0,max:65535,integer:true},
  int:{size:4,get:'getInt32',min:-2147483648,max:2147483647,integer:true}, int32:{size:4,get:'getInt32',min:-2147483648,max:2147483647,integer:true},
  uint:{size:4,get:'getUint32',min:0,max:4294967295,integer:true}, uint32:{size:4,get:'getUint32',min:0,max:4294967295,integer:true},
  float:{size:4,get:'getFloat32'}, float32:{size:4,get:'getFloat32'}, double:{size:8,get:'getFloat64'}, float64:{size:8,get:'getFloat64'},
});
const clamp = v => Math.max(0,Math.min(1,v));
const fail = message => {throw new Error(message);};

function inputBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError('PLY 输入必须是 ArrayBuffer 或 Uint8Array。');
}

function decodeText(bytes, message) {
  try {return new TextDecoder('utf-8',{fatal:true}).decode(bytes);} catch {return fail(message);}
}

function readHeader(bytes) {
  let offset=0, lineStart=0, headerEnd=-1;
  while (offset < bytes.length && offset < MAX_HEADER_BYTES) {
    if (bytes[offset++] !== 10) continue;
    let end=offset-1;
    if (bytes[end-1] === 13) end--;
    if (end-lineStart === 10 && decodeText(bytes.subarray(lineStart,end),'PLY 头部编码无效。') === 'end_header') {headerEnd=offset; break;}
    lineStart=offset;
  }
  if (headerEnd < 0) fail('PLY 头部不完整，或超过 64 KiB。');
  const lines=decodeText(bytes.subarray(0,headerEnd),'PLY 头部编码无效。').split(/\r?\n/);
  if (lines.shift() !== 'ply') fail('文件不是标准 PLY。');
  let format=null, element=null, vertex=null;
  const elements=[];
  for (const raw of lines) {
    const line=raw.trim();
    if (!line || line === 'end_header' || line.startsWith('comment ') || line === 'comment' || line.startsWith('obj_info ')) continue;
    const parts=line.split(/\s+/), kind=parts[0];
    if (kind === 'format') {
      if (format || parts.length !== 3 || parts[2] !== '1.0') fail('PLY 格式声明无效。');
      format=parts[1];
      if (!['ascii','binary_little_endian'].includes(format)) fail('仅支持未压缩 ASCII 或 binary_little_endian 3DGS PLY。');
    } else if (kind === 'element') {
      if (parts.length !== 3 || !/^\d+$/.test(parts[2])) fail('PLY 元素数量无效。');
      const count=Number(parts[2]);
      if (!Number.isSafeInteger(count) || count > MAX_PLY_SPLATS) fail('PLY 高斯数量超过 120000 上限。');
      if (elements.some(item => item.name === parts[1])) fail('PLY 元素名称重复。');
      element={name:parts[1],count,properties:[],stride:0}; elements.push(element);
      if (element.name === 'vertex') vertex=element;
      else if (count > 0) fail('仅支持 vertex 高斯点；不支持网格、压缩块或其他元素。');
    } else if (kind === 'property') {
      if (!element) fail('PLY 属性缺少元素声明。');
      if (parts[1] === 'list') fail('不支持 PLY list 属性；请选择未压缩高斯点 PLY。');
      if (parts.length !== 3 || !Object.hasOwn(TYPES,parts[1]) || !/^[\w]+$/.test(parts[2])) fail('PLY 属性类型或名称无效。');
      if (element.properties.some(property => property.name === parts[2])) fail('PLY 属性名称重复。');
      if (element.properties.length >= MAX_PROPERTIES) fail('PLY 属性超过 256 项上限。');
      const type=TYPES[parts[1]];
      element.properties.push({name:parts[2],type,offset:element.stride}); element.stride+=type.size;
    } else fail('PLY 头部包含不支持的声明。');
  }
  if (!format || !vertex || vertex.count < 1) fail('PLY 必须包含至少一个 vertex 高斯点。');
  if (!REQUIRED.every(name => vertex.properties.some(property => property.name === name))) fail('缺少标准 3DGS 属性：需要坐标、f_dc、opacity、scale 和 rot。不支持普通点云或压缩 PLY。');
  const byteCount=vertex.count*vertex.stride;
  if (!Number.isSafeInteger(byteCount) || byteCount > MAX_PLY_BYTES) fail('PLY 解码数据超过 32 MiB 上限。');
  return {...vertex,format,headerEnd};
}

function toSplat(values, index, stats) {
  const position=['x','y','z'].map(name => values[name]);
  const scale=[0,1,2].map(axis => Math.exp(values[`scale_${axis}`]));
  if (scale.some(value => !Number.isFinite(value) || value <= 0)) fail(`第 ${index+1} 个高斯的 scale 指数溢出或无效。`);
  const rotation=[values.rot_1,values.rot_2,values.rot_3,values.rot_0], norm=Math.hypot(...rotation);
  if (!Number.isFinite(norm) || norm < 1e-12) fail(`第 ${index+1} 个高斯的四元数无效。`);
  for (let axis=0;axis<4;axis++) rotation[axis]/=norm;
  const rawColor=[0,1,2].map(axis => .5+SH_C0*values[`f_dc_${axis}`]);
  if (rawColor.some(v => v < 0 || v > 1)) stats.clippedColorCount++;
  const color=rawColor.map(clamp), logit=values.opacity;
  const opacity=logit >= 0 ? 1/(1+Math.exp(-logit)) : Math.exp(logit)/(1+Math.exp(logit));
  return {position,scale,rotation,color,opacity};
}

/** Parse standard point Gaussians, with float/double and ordinary scalar types.
 * Higher-order SH is intentionally ignored and reported in metadata. Input is
 * validated completely before a dataset is returned; parsing never mutates it. */
export function parseGaussianPly(input) {
  const bytes=inputBytes(input);
  if (bytes.byteLength > MAX_PLY_BYTES) fail('PLY 文件超过 32 MiB 上限。');
  if (bytes.byteLength < 16) fail('PLY 文件过短或不完整。');
  const header=readHeader(bytes), {properties,count,stride,headerEnd,format}=header;
  const stats={clippedColorCount:0}, splats=new Array(count);
  let text, cursor=0, view;
  if (format === 'binary_little_endian') {
    if (bytes.byteLength-headerEnd !== count*stride) fail('PLY 二进制数据长度与 vertex 数量不一致。');
    view=new DataView(bytes.buffer,bytes.byteOffset+headerEnd,bytes.byteLength-headerEnd);
  } else text=decodeText(bytes.subarray(headerEnd),'PLY ASCII 数据编码无效。');
  const numeric=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  const nextNumber=(type) => {
    while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
    const start=cursor;
    while (cursor < text.length && !/\s/.test(text[cursor])) cursor++;
    const token=text.slice(start,cursor);
    if (!numeric.test(token)) fail('PLY ASCII 数据缺失或包含无效数值。');
    const value=Number(token);
    if (type.integer && (!Number.isInteger(value) || value < type.min || value > type.max)) fail('PLY ASCII 整数属性超出类型范围。');
    if (type.size === 4 && type.get === 'getFloat32' && Math.abs(value) > FLOAT32_MAX) fail('PLY ASCII float 属性超出范围。');
    return value;
  };
  for (let i=0;i<count;i++) {
    const values=Object.create(null);
    for (const property of properties) {
      const value=view ? view[property.type.get](i*stride+property.offset,true) : nextNumber(property.type);
      if (!Number.isFinite(value)) fail(`第 ${i+1} 个高斯包含 NaN、Infinity 或溢出数值。`);
      values[property.name]=value;
    }
    splats[i]=toSplat(values,i,stats);
  }
  if (text && text.slice(cursor).trim()) fail('PLY ASCII 数据数量与 vertex 声明不一致。');
  const ignoredSHProperties=properties.filter(property => /^f_rest_\d+$/.test(property.name)).length;
  return {splats,meta:{source:'ply',format,count,shDegree:0,degree0Only:true,ignoredSHProperties,
    clippedColorCount:stats.clippedColorCount,colorSpace:'linear-rgb',rotationOrder:'xyzw',scaleEncoding:'standard-deviation'}};
}

function vector(value, length, label, index) {
  if (!Array.isArray(value) || value.length !== length || value.some(v => !Number.isFinite(v))) fail(`第 ${index+1} 个高斯的 ${label} 必须包含 ${length} 个有限数值。`);
  return value;
}

function exportValues(splat, index) {
  if (!splat || typeof splat !== 'object') fail(`第 ${index+1} 个高斯无效。`);
  const p=vector(splat.position,3,'position',index), s=vector(splat.scale,3,'scale',index);
  const q=vector(splat.rotation,4,'rotation',index), rgb=vector(splat.color,3,'color',index);
  if (p.some(value => Math.abs(value) > FLOAT32_MAX)) fail(`第 ${index+1} 个高斯的坐标超出 float32 范围。`);
  if (s.some(value => value <= 0)) fail(`第 ${index+1} 个高斯的 scale 必须大于零。`);
  if (rgb.some(value => value < 0 || value > 1)) fail(`第 ${index+1} 个高斯的线性颜色必须介于 0 与 1。`);
  const norm=Math.hypot(...q);
  if (!Number.isFinite(norm) || norm < 1e-12) fail(`第 ${index+1} 个高斯的四元数无效。`);
  if (!Number.isFinite(splat.opacity) || splat.opacity < 0 || splat.opacity > 1) fail(`第 ${index+1} 个高斯的 opacity 必须介于 0 与 1。`);
  // Finite logits cannot encode exact zero and one. Endpoint alpha is clamped
  // to 1e-7 and 1-1e-7; all other values preserve their standard 3DGS meaning.
  const alpha=Math.max(1e-7,Math.min(1-1e-7,splat.opacity));
  return [...p,0,0,0,...rgb.map(value => (value-.5)/SH_C0),Math.log(alpha/(1-alpha)),
    ...s.map(Math.log),q[3]/norm,q[0]/norm,q[1]/norm,q[2]/norm];
}

/** Return an interoperable binary_little_endian PLY, with zero normal fields
 * and degree-zero SH only. Input data is neither normalized nor modified. */
export function exportGaussianPly(dataset) {
  if (!dataset || !Array.isArray(dataset.splats) || dataset.splats.length < 1 || dataset.splats.length > MAX_PLY_SPLATS) fail('导出需要 1–120000 个有效高斯。');
  const count=dataset.splats.length;
  const text=`ply\nformat binary_little_endian 1.0\ncomment Plush Lab uncompressed degree-zero Gaussian splats\nelement vertex ${count}\n${EXPORTED.map(name => `property float ${name}`).join('\n')}\nend_header\n`;
  const header=new TextEncoder().encode(text), length=header.byteLength+count*EXPORTED.length*4;
  if (length > MAX_PLY_BYTES) fail('PLY 导出超过 32 MiB 上限。');
  // Validate every entry before allocating or emitting any binary payload.
  for (let i=0;i<count;i++) exportValues(dataset.splats[i],i);
  const bytes=new Uint8Array(length), view=new DataView(bytes.buffer); bytes.set(header);
  let offset=header.byteLength;
  for (let i=0;i<count;i++) {
    for (const value of exportValues(dataset.splats[i],i)) {view.setFloat32(offset,value,true); offset+=4;}
  }
  return bytes;
}
