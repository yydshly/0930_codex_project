/**
 * Sparse guide-strand contact approximation. All coordinates are in the same
 * frame as the strand. Collider formats:
 *   {type:'plane', point:[x,y,z], normal:[x,y,z]}       (outside is normal side)
 *   {type:'sphere', center:[x,y,z], radius:number}
 *   {type:'capsule', a:[x,y,z], b:[x,y,z], radius:number}
 *   {type:'ellipsoid', center:[x,y,z], radii:[rx,ry,rz]} (axis-aligned)
 *   {type:'surface', sample(point):{distance,normal}}   (signed outward distance)
 *
 * contactDistance writes an outward unit normal and returns signed distance.
 * The ellipsoid distance is a gradient-based estimate with the exact inside /
 * outside sign. A surface callback should provide a near-surface signed distance
 * and an outward gradient; arbitrary nonconvex surface contacts are approximate.
 *
 * projectStrandContact(parent, point, length, colliders, options={}, out=point)
 * rotates the point on the parent's fixed-length sphere. Each contact becomes a
 * tangent half-space; the sphere / half-space intersection keeps length exact.
 * Convex proxies examine the segment's closest interior point, so thin accessory
 * proxies are not skipped merely because both particle endpoints are outside.
 * options: margin=0, iterations=4 (1..12), normalOut, preferredDirection, stats.
 * Reuse one options object to retain scratch buffers. stats.contacts counts
 * constrained segments; stats.unresolved counts segments still penetrating after
 * the bounded passes. Infeasible fixed-root / obstacle arrangements preserve
 * length and report unresolved contact instead of silently stretching the hair.
 * This is not full mesh collision, continuous motion CCD or hair–hair collision.
 */

const EPS = 1e-10;
const TOLERANCE = 1e-8;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const component = (value, axis) => value?.[axis] ?? value?.[['x', 'y', 'z'][axis]] ?? 0;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function unitInto(value, out) {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < EPS || !Number.isFinite(length)) { out.fill(0); return false; }
  for (let axis = 0; axis < 3; axis++) out[axis] = value[axis] / length;
  return true;
}

function nearestAxisPoint(collider, point, out) {
  const ax = component(collider.a, 0), ay = component(collider.a, 1), az = component(collider.a, 2);
  const dx = component(collider.b, 0) - ax, dy = component(collider.b, 1) - ay, dz = component(collider.b, 2) - az;
  const denominator = dx * dx + dy * dy + dz * dz;
  const t = denominator > EPS ? clamp(((point[0] - ax) * dx + (point[1] - ay) * dy + (point[2] - az) * dz) / denominator, 0, 1) : 0;
  out[0] = ax + dx * t; out[1] = ay + dy * t; out[2] = az + dz * t;
}

export function contactDistance(collider, point, normalOut = new Float64Array(3)) {
  if (!collider) { normalOut.fill(0); return Infinity; }
  if (collider.type === 'plane') {
    normalOut[0] = component(collider.normal, 0); normalOut[1] = component(collider.normal, 1); normalOut[2] = component(collider.normal, 2);
    if (!unitInto(normalOut, normalOut)) return Infinity;
    return normalOut[0] * (point[0] - component(collider.point, 0))
      + normalOut[1] * (point[1] - component(collider.point, 1))
      + normalOut[2] * (point[2] - component(collider.point, 2));
  }
  if (collider.type === 'surface') {
    const sample = collider.sample?.(point);
    if (!sample || !Number.isFinite(sample.distance)) { normalOut.fill(0); return Infinity; }
    for (let axis = 0; axis < 3; axis++) normalOut[axis] = component(sample.normal, axis);
    if (!unitInto(normalOut, normalOut)) return Infinity;
    return sample.distance;
  }
  if (collider.type === 'capsule') nearestAxisPoint(collider, point, normalOut);
  else for (let axis = 0; axis < 3; axis++) normalOut[axis] = component(collider.center, axis);
  for (let axis = 0; axis < 3; axis++) normalOut[axis] = point[axis] - normalOut[axis];
  if (collider.type === 'ellipsoid') {
    const rx = Math.max(EPS, component(collider.radii, 0)), ry = Math.max(EPS, component(collider.radii, 1)), rz = Math.max(EPS, component(collider.radii, 2));
    const x = normalOut[0], y = normalOut[1], z = normalOut[2];
    const implicitRadius = Math.hypot(x / rx, y / ry, z / rz);
    normalOut[0] = x / (rx * rx); normalOut[1] = y / (ry * ry); normalOut[2] = z / (rz * rz);
    const gradientLength = Math.hypot(...normalOut);
    if (!unitInto(normalOut, normalOut)) return -Math.min(rx, ry, rz);
    return implicitRadius * (implicitRadius - 1) / gradientLength;
  }
  if (collider.type === 'sphere' || collider.type === 'capsule') {
    const distance = Math.hypot(...normalOut);
    unitInto(normalOut, normalOut);
    return distance - Math.max(0, Number.isFinite(collider.radius) ? collider.radius : 0);
  }
  normalOut.fill(0);
  return Infinity;
}

function segmentParameter(collider, parent, point) {
  const ux = point[0] - parent[0], uy = point[1] - parent[1], uz = point[2] - parent[2];
  if (collider.type === 'plane') {
    const toward = ux * component(collider.normal, 0) + uy * component(collider.normal, 1) + uz * component(collider.normal, 2);
    return toward < 0 ? 1 : 0;
  }
  if (collider.type === 'sphere' || collider.type === 'ellipsoid') {
    let denominator = 0, numerator = 0;
    for (let axis = 0; axis < 3; axis++) {
      const radius = collider.type === 'ellipsoid' ? Math.max(EPS, component(collider.radii, axis)) : 1;
      const direction = (point[axis] - parent[axis]) / radius;
      denominator += direction * direction;
      numerator += (component(collider.center, axis) - parent[axis]) / radius * direction;
    }
    return denominator > EPS ? clamp(numerator / denominator, 0, 1) : 1;
  }
  if (collider.type === 'capsule') {
    // Closest points of two finite segments (strand segment and capsule axis).
    const vx = component(collider.b, 0) - component(collider.a, 0), vy = component(collider.b, 1) - component(collider.a, 1), vz = component(collider.b, 2) - component(collider.a, 2);
    const wx = parent[0] - component(collider.a, 0), wy = parent[1] - component(collider.a, 1), wz = parent[2] - component(collider.a, 2);
    const a = ux * ux + uy * uy + uz * uz, b = ux * vx + uy * vy + uz * vz, c = vx * vx + vy * vy + vz * vz;
    const d = ux * wx + uy * wy + uz * wz, e = vx * wx + vy * wy + vz * wz;
    if (a <= EPS) return 1;
    if (c <= EPS) return clamp(-d / a, 0, 1);
    const denominator = a * c - b * b;
    let s = denominator > EPS * a * c ? clamp((b * e - c * d) / denominator, 0, 1) : 0;
    const t = (b * s + e) / c;
    if (t < 0) s = clamp(-d / a, 0, 1);
    else if (t > 1) s = clamp((b - d) / a, 0, 1);
    return s;
  }
  return 1;
}

function makeScratch() {
  return {normal: new Float64Array(3), point: new Float64Array(3), sum: new Float64Array(3), tangent: new Float64Array(3), fallback: new Float64Array(3)};
}

function sampleSegment(collider, parent, point, scratch) {
  let parameter = segmentParameter(collider, parent, point);
  if (collider.type === 'surface') {
    let minimum = Infinity;
    // A callback may describe a nonconvex surface. A few bounded samples are a
    // deliberate proxy; the analytic convex colliders need no such sampling.
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      for (let axis = 0; axis < 3; axis++) scratch.point[axis] = parent[axis] + (point[axis] - parent[axis]) * t;
      const distance = contactDistance(collider, scratch.point, scratch.normal);
      if (distance < minimum) { minimum = distance; parameter = t; }
    }
  }
  for (let axis = 0; axis < 3; axis++) scratch.point[axis] = parent[axis] + (point[axis] - parent[axis]) * parameter;
  const distance = contactDistance(collider, scratch.point, scratch.normal);
  if (Math.hypot(...scratch.normal) < EPS) {
    // The gradient at a sphere center or capsule axis is undefined. Prefer the
    // already accepted predecessor's outward direction rather than an arbitrary
    // normal that could make an otherwise feasible length constraint impossible.
    contactDistance(collider, parent, scratch.normal);
    if (Math.hypot(...scratch.normal) < EPS) scratch.normal.set([1, 0, 0]);
  }
  return {distance, parameter};
}

export function projectStrandContact(parent, point, length, colliders, options = {}, out = point) {
  const scratch = options._scratch || (options._scratch = makeScratch());
  const margin = Math.max(0, Number.isFinite(options.margin) ? options.margin : 0);
  const iterations = clamp(Math.round(Number.isFinite(options.iterations) ? options.iterations : 4), 1, 12);
  const tolerance = TOLERANCE;
  scratch.sum.fill(0);
  for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] = point[axis] - parent[axis];
  if (!unitInto(scratch.tangent, scratch.tangent)) {
    for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] = component(options.preferredDirection, axis);
    if (!unitInto(scratch.tangent, scratch.tangent)) scratch.tangent.set([0, 1, 0]);
  }
  for (let axis = 0; axis < 3; axis++) out[axis] = parent[axis] + scratch.tangent[axis] * length;
  let touched = false;
  for (let pass = 0; pass < iterations; pass++) {
    let projected = false;
    for (const collider of colliders || []) {
      const {distance, parameter} = sampleSegment(collider, parent, out, scratch);
      if (distance >= margin - tolerance) continue;
      touched = projected = true;
      for (let axis = 0; axis < 3; axis++) scratch.sum[axis] += scratch.normal[axis];
      if (parameter <= EPS) continue; // A pinned predecessor cannot be moved.
      for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] = (out[axis] - parent[axis]) / length;
      const alignment = dot(scratch.tangent, scratch.normal);
      const required = (margin - distance + dot(scratch.normal, scratch.point) - dot(scratch.normal, parent) + tolerance) / (length * parameter);
      const cosine = clamp(required, -1, 1);
      for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] -= scratch.normal[axis] * alignment;
      if (!unitInto(scratch.tangent, scratch.tangent)) {
        for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] = component(options.preferredDirection, axis);
        const preferredNormal = dot(scratch.tangent, scratch.normal);
        for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] -= scratch.normal[axis] * preferredNormal;
        if (!unitInto(scratch.tangent, scratch.tangent)) {
          const axis = Math.abs(scratch.normal[0]) < .8 ? [1, 0, 0] : [0, 1, 0];
          const alongNormal = dot(axis, scratch.normal);
          for (let a = 0; a < 3; a++) scratch.tangent[a] = axis[a] - scratch.normal[a] * alongNormal;
          unitInto(scratch.tangent, scratch.tangent);
        }
      }
      const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
      for (let axis = 0; axis < 3; axis++) scratch.tangent[axis] = scratch.normal[axis] * cosine + scratch.tangent[axis] * sine;
      unitInto(scratch.tangent, scratch.tangent);
      for (let axis = 0; axis < 3; axis++) out[axis] = parent[axis] + scratch.tangent[axis] * length;
    }
    if (!projected) break;
  }
  let unresolved = false;
  if (touched) for (const collider of colliders || []) {
    if (sampleSegment(collider, parent, out, scratch).distance < margin - tolerance * 2) { unresolved = true; break; }
  }
  if (options.normalOut) {
    if (!touched || !unitInto(scratch.sum, options.normalOut)) options.normalOut.fill(0);
  }
  if (options.stats) {
    options.stats.contacts = (options.stats.contacts || 0) + Number(touched);
    options.stats.unresolved = (options.stats.unresolved || 0) + Number(unresolved);
  }
  return out;
}
