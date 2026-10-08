// Reversible styling of the original Gaussians. No source attributes are written.
// This is a reconstructed coat: the asset contains ellipsoids, not strand roots.
export const REFERENCE_FUR_BOUNDS = Object.freeze({
  min: Object.freeze([-1.246532, -2.494541, -1.021106]),
  max: Object.freeze([1.251745, .02498846, 1.01459])
});
export const REFERENCE_GROOM_GRID = Object.freeze([12, 14, 8]);
export const REFERENCE_GROOM_LIMIT = .16;
const CELLS = REFERENCE_GROOM_GRID.reduce((a, b) => a * b, 1);
const BODY_CENTER = [0, -.94, 0];
const finite = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const vec = v => Array.isArray(v) && v.length === 3 ? v.map(n => finite(n)) : [0, 0, 0];
const validVec = v => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n));
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = v => {
  const largest = Math.max(...v.map(Math.abs));
  if (!largest) return [0, 0, 0];
  const scaled = v.map(n => n / largest), size = Math.hypot(...scaled);
  return scaled.map(n => n / size);
};
const limit = v => {
  const values = vec(v), largest = Math.max(...values.map(Math.abs));
  if (!largest) return values;
  const scaled = values.map(n => n / largest), size = Math.hypot(...scaled);
  return largest > REFERENCE_GROOM_LIMIT / size ? scaled.map(n => n * REFERENCE_GROOM_LIMIT / size) : values;
};
const smooth = (lo, hi, x) => { const t = clamp((x - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
const indexOf = (x, y, z) => x + REFERENCE_GROOM_GRID[0] * (y + REFERENCE_GROOM_GRID[1] * z);
const cellPoint = (x, y, z) => [x, y, z].map((n, i) => REFERENCE_FUR_BOUNDS.min[i] +
  (n + .5) / REFERENCE_GROOM_GRID[i] * (REFERENCE_FUR_BOUNDS.max[i] - REFERENCE_FUR_BOUNDS.min[i]));

/** Sparse [cellIndex, dx, dy, dz] entries; storage is bounded by the fixed grid. */
export function sanitizeReferenceFur(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const cells = new Map();
  if (Array.isArray(input?.groom)) for (const entry of input.groom) {
    if (!Array.isArray(entry) || entry.length !== 4 || !Number.isInteger(entry[0]) || entry[0] < 0 || entry[0] >= CELLS) continue;
    let value = limit(entry.slice(1)).map(n => Math.round(n * 1e5) / 1e5 || 0);
    // Rounding an exactly bounded vector can put it just outside the sphere.
    if (Math.hypot(...value) > REFERENCE_GROOM_LIMIT) value = value.map(n =>
      Math.trunc(n * (REFERENCE_GROOM_LIMIT - 1e-5) / Math.hypot(...value) * 1e5) / 1e5 || 0);
    if (Math.hypot(...value) > 1e-7) cells.set(entry[0], value);
    else cells.delete(entry[0]);
  }
  return {length: clamp(finite(input?.length, 1), .65, 1.65), curl: clamp(finite(input?.curl), 0, 1),
    groom: [...cells].sort((a, b) => a[0] - b[0]).map(([index, value]) => [index, ...value])};
}

export function clearReferenceGroom(style) {
  return {...sanitizeReferenceFur(style), groom: []};
}

/** Blend toward the drag direction by travelled distance, without accumulating stamps. */
export function paintReferenceGroom(style, sourcePoint, sourceDelta, radius = .24, strength = 1) {
  const next = sanitizeReferenceFur(style);
  if (!validVec(sourcePoint) || !validVec(sourceDelta) || !Number.isFinite(radius) || radius <= 0 ||
      !Number.isFinite(strength) || strength <= 0) return next;
  const movement = unit(sourceDelta), travelled = Math.min(10, Math.hypot(...sourceDelta));
  if (!travelled || !Math.hypot(...movement)) return next;
  const cells = new Map(next.groom.map(([index, ...value]) => [index, value]));
  const reach = clamp(radius, .04, .8), amount = clamp(strength, 0, 10);
  const ranges = REFERENCE_GROOM_GRID.map((size, i) => {
    const extent = REFERENCE_FUR_BOUNDS.max[i] - REFERENCE_FUR_BOUNDS.min[i];
    return [Math.max(0, Math.floor((sourcePoint[i] - reach - REFERENCE_FUR_BOUNDS.min[i]) / extent * size)),
      Math.min(size - 1, Math.ceil((sourcePoint[i] + reach - REFERENCE_FUR_BOUNDS.min[i]) / extent * size))];
  });
  for (let z = ranges[2][0]; z <= ranges[2][1]; z++) for (let y = ranges[1][0]; y <= ranges[1][1]; y++)
    for (let x = ranges[0][0]; x <= ranges[0][1]; x++) {
      const point = cellPoint(x, y, z), distance = Math.hypot(...point.map((n, i) => n - sourcePoint[i]));
      if (distance >= reach) continue;
      const weight = (1 - (distance / reach) ** 2) ** 2;
      const blend = -Math.expm1(-8 * travelled * amount * weight / reach);
      const index = indexOf(x, y, z), previous = cells.get(index) ?? [0, 0, 0];
      cells.set(index, limit(previous.map((n, i) => n * (1 - blend) + movement[i] * REFERENCE_GROOM_LIMIT * blend)));
    }
  return sanitizeReferenceFur({...next, groom: [...cells].map(([index, value]) => [index, ...value])});
}

/** Same texel-center interpolation as the linearly filtered GPU volume. */
export function sampleReferenceGroom(style, point) {
  if (!validVec(point)) return [0, 0, 0];
  const cells = new Map(sanitizeReferenceFur(style).groom.map(([index, ...value]) => [index, value]));
  const axes = REFERENCE_GROOM_GRID.map((size, i) => {
    const value = clamp((point[i] - REFERENCE_FUR_BOUNDS.min[i]) /
      (REFERENCE_FUR_BOUNDS.max[i] - REFERENCE_FUR_BOUNDS.min[i]), 0, 1) * size - .5;
    const base = Math.floor(value);
    return {a: clamp(base, 0, size - 1), b: clamp(base + 1, 0, size - 1), t: value - base};
  });
  const result = [0, 0, 0];
  for (let z = 0; z < 2; z++) for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const corners = [x, y, z], indices = axes.map((axis, i) => corners[i] ? axis.b : axis.a);
    const weight = axes.reduce((w, axis, i) => w * (corners[i] ? axis.t : 1 - axis.t), 1);
    const value = cells.get(indexOf(...indices)) ?? [0, 0, 0];
    for (let i = 0; i < 3; i++) result[i] += value[i] * weight;
  }
  return result;
}

/** Original DC blue selects the coat; SH highlights never alter this mask. */
export function referenceFurMask(point, baseColor) {
  const p = vec(point), rgb = vec(baseColor);
  const blue = smooth(.025, .12, rgb[2] - Math.max(rgb[0], rgb[1]) * .96) * smooth(.08, .23, rgb[2]);
  const body = smooth(-2.18, -1.92, p[1]) * (1 - smooth(.025, .12, p[1]));
  const inside = p.every((n, i) => n >= REFERENCE_FUR_BOUNDS.min[i] - .01 && n <= REFERENCE_FUR_BOUNDS.max[i] + .01);
  return inside ? blue * body : 0;
}

const quatVec = (q, v) => {
  const t = cross(q.slice(0, 3), v).map(n => n * 2), c = cross(q.slice(0, 3), t);
  return v.map((n, i) => n + q[3] * t[i] + c[i]);
};
const quatMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const axisQuat = (axis, angle) => [...axis.map(n => n * Math.sin(angle / 2)), Math.cos(angle / 2)];

/** CPU mirror for checking identity, accessory protection and spatial locality. */
export function deformReferenceSplat(splat, input) {
  const style = sanitizeReferenceFur(input), point = vec(splat.center), scales = vec(splat.scales);
  let q = Array.isArray(splat.quaternion) && splat.quaternion.length === 4 ? splat.quaternion.slice() : [0, 0, 0, 1];
  const result = {...splat, center: point.slice(), scales: scales.slice(), quaternion: q.slice()};
  if (style.length === 1 && style.curl === 0 && !style.groom.length) return result;
  const mask = referenceFurMask(point, splat.baseColor ?? splat.color);
  if (mask <= 1e-5) return result;
  let normal = unit(point.map((n, i) => n - BODY_CENTER[i]));
  if (!Math.hypot(...normal)) normal = [0, 1, 0];
  const largest = scales[0] >= scales[1] && scales[0] >= scales[2] ? 0 : scales[1] >= scales[2] ? 1 : 2;
  const axis = [0, 0, 0]; axis[largest] = 1;
  let fiber = quatVec(q, axis);
  if (dot(fiber, normal) < 0) fiber = fiber.map(n => -n);
  const micro = clamp(scales[largest] * 1.8, .0004, .012);
  const phase = [point[0] * 31 + point[1] * 7, point[1] * 43 + point[2] * 5, point[2] * 37 + point[0] * 9];
  const swirl = [Math.sin(phase[1]), Math.cos(phase[2]), Math.sin(phase[0])];
  const tangent = swirl.map((n, i) => n - normal[i] * dot(swirl, normal));
  const field = sampleReferenceGroom(style, point), groom = field.map((n, i) => n - normal[i] * dot(field, normal));
  result.center = point.map((n, i) => n + mask * ((style.length - 1) * micro * fiber[i] +
    .018 * style.curl * tangent[i] + groom[i]));
  result.scales[largest] *= 1 + mask * (style.length - 1);
  if (style.curl) q = quatMul(axisQuat(normal, style.curl * mask * .75 * Math.sin(phase[0])), q);
  const groomSize = Math.hypot(...groom);
  if (groomSize > 1e-7) q = quatMul(axisQuat(unit(cross(normal, groom)), mask * .85 * clamp(groomSize / REFERENCE_GROOM_LIMIT, 0, 1)), q);
  result.quaternion = q;
  return result;
}

const GLSL_HELPERS = `
vec3 refFurQuatVec(vec4 q, vec3 v) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}
vec4 refFurQuatMul(vec4 a, vec4 b) {
  return vec4(a.w*b.xyz + b.w*a.xyz + cross(a.xyz,b.xyz), a.w*b.w-dot(a.xyz,b.xyz));
}
vec4 refFurAxisQuat(vec3 axis, float angle) { return vec4(axis*sin(angle*.5),cos(angle*.5)); }
float refFurMask(vec3 p, vec3 rgb) {
  float blue = smoothstep(.025,.12,rgb.b-max(rgb.r,rgb.g)*.96)*smoothstep(.08,.23,rgb.b);
  float body = smoothstep(-2.18,-1.92,p.y)*(1.0-smoothstep(.025,.12,p.y));
  bool inside = all(greaterThanEqual(p,vec3(-1.256532,-2.504541,-1.031106))) &&
    all(lessThanEqual(p,vec3(1.261745,.03498846,1.02459)));
  return inside ? blue*body : 0.0;
}`;

/** Spark object-space modifier, with independently owned uniforms and groom volume. */
export function createReferenceFurModifier({dyno, THREE, source, onDirty} = {}) {
  if (!dyno?.Dyno || !THREE?.Data3DTexture || !source?.fetchSplat) throw new Error('原作绒毛编辑需要 Spark dyno、Three.js 和原始 SplatSource。');
  const data = new Uint16Array(CELLS * 4);
  const texture = new THREE.Data3DTexture(data, ...REFERENCE_GROOM_GRID);
  texture.format = THREE.RGBAFormat;
  // Half float filtering is available in WebGL2 without float-linear extensions.
  texture.type = THREE.HalfFloatType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const length = new dyno.DynoFloat({value: 1}), curl = new dyno.DynoFloat({value: 0});
  const groomActive = new dyno.DynoFloat({value: 0}), groomTexture = new dyno.DynoSampler3D({value: texture});
  let style = sanitizeReferenceFur(), disposed = false;
  const deform = new dyno.Dyno({
    inTypes: {gsplat: dyno.Gsplat, baseRgb: 'vec3', length: 'float', curl: 'float', groomActive: 'float', groomTexture: 'sampler3D'},
    outTypes: {gsplat: dyno.Gsplat}, inputs: {length, curl, groomActive, groomTexture},
    globals: () => [dyno.defineGsplat, GLSL_HELPERS],
    statements: ({inputs: u, outputs}) => {
      const s = outputs.gsplat;
      return [`${s} = ${u.gsplat};`, `
if (abs(${u.length}-1.0)>0.000001 || ${u.curl}>0.000001 || ${u.groomActive}>.5) {
  vec3 p = ${s}.center;
  float mask = refFurMask(p, ${u.baseRgb});
  if (mask > .00001) {
    vec3 radial = p - vec3(0.0,-.94,0.0);
    vec3 normal = length(radial)>.000001 ? normalize(radial) : vec3(0,1,0);
    vec3 scales = ${s}.scales;
    vec3 axis = scales.x>=scales.y && scales.x>=scales.z ? vec3(1,0,0) :
      (scales.y>=scales.z ? vec3(0,1,0) : vec3(0,0,1));
    vec3 fiber = refFurQuatVec(${s}.quaternion,axis);
    if (dot(fiber,normal)<0.0) fiber = -fiber;
    float micro = clamp(dot(scales,axis)*1.8,.0004,.012);
    vec3 phase = vec3(p.x*31.0+p.y*7.0,p.y*43.0+p.z*5.0,p.z*37.0+p.x*9.0);
    vec3 swirl = vec3(sin(phase.y),cos(phase.z),sin(phase.x));
    vec3 tangent = swirl-normal*dot(swirl,normal);
    vec3 field = vec3(0.0);
    if (${u.groomActive}>.5) {
      vec3 uvw = clamp((p-vec3(-1.246532,-2.494541,-1.021106))/vec3(2.498277,2.51952946,2.035696),0.0,1.0);
      field = texture(${u.groomTexture},uvw).xyz;
    }
    vec3 groom = field-normal*dot(field,normal);
    ${s}.center += mask*((${u.length}-1.0)*micro*fiber+.018*${u.curl}*tangent+groom);
    ${s}.scales *= vec3(1.0)+axis*mask*(${u.length}-1.0);
    if (${u.curl}>0.0) ${s}.quaternion = refFurQuatMul(refFurAxisQuat(normal,${u.curl}*mask*.75*sin(phase.x)),${s}.quaternion);
    float groomSize = length(groom);
    if (groomSize>.0000001) {
      vec3 bendAxis = normalize(cross(normal,groom));
      ${s}.quaternion = refFurQuatMul(refFurAxisQuat(bendAxis,mask*.85*clamp(groomSize/.16,0.0,1.0)),${s}.quaternion);
    }
  }
}`];
    }
  });
  const modifier = dyno.dynoBlock({gsplat: dyno.Gsplat}, {gsplat: dyno.Gsplat}, ({gsplat}) => {
    const index = dyno.splitGsplat(gsplat).outputs.index;
    // Re-read DC without viewOrigin. The display gsplat keeps its full SH color.
    const base = source.fetchSplat({index});
    return deform.apply({gsplat, baseRgb: dyno.splitGsplat(base).outputs.rgb});
  });
  return {
    modifier,
    setStyle(input) {
      if (disposed) return false;
      const next = sanitizeReferenceFur(input);
      const fieldChanged = JSON.stringify(next.groom) !== JSON.stringify(style.groom);
      if (!fieldChanged && next.length === style.length && next.curl === style.curl) return false;
      if (fieldChanged) {
        data.fill(0);
        for (const [index, ...value] of next.groom) for (let i = 0; i < 3; i++) {
          data[index * 4 + i] = THREE.DataUtils.toHalfFloat(value[i]);
        }
        texture.needsUpdate = true;
      }
      length.value = next.length; curl.value = next.curl; groomActive.value = next.groom.length ? 1 : 0;
      style = next;
      onDirty?.();
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      texture.dispose();
    }
  };
}
