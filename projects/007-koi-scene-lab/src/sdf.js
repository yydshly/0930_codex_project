/*! Adapted from Koi Pond Garden, © 2026 Sourany Phomhome, MIT.
 * Upstream commit 18213ec590e987f605cce6564471e6c0f9451d37.
 * License: web/upstream/KOI-LICENSE.txt. */
import * as THREE from 'three';
export const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
export const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const SDFK = {
  len: (x, y, z) => Math.sqrt(x * x + y * y + z * z),
  smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); },
  smax(a, b, k) { return -SDFK.smin(-a, -b, k); },
  sphere(p, c, r) { return SDFK.len(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r; },
  ellipsoid(p, c, r) {
    const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2];
    const k0 = Math.sqrt(x * x + y * y + z * z), k1 = Math.sqrt(x * x / (r[0] * r[0]) + y * y / (r[1] * r[1]) + z * z / (r[2] * r[2]));
    return k0 * (k0 - 1) / (k1 || 1e-6);
  },
  // capsule with linearly varying radius between a and b (Quilez round cone, approximated per segment)
  cone(p, a, b, ra, rb) {
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = p[0] - a[0], pay = p[1] - a[1], paz = p[2] - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    return SDFK.len(pax - bax * h, pay - bay * h, paz - baz * h) - lerp(ra, rb, h);
  },
  roundBox(p, c, h, r) {
    const qx = Math.abs(p[0] - c[0]) - h[0] + r, qy = Math.abs(p[1] - c[1]) - h[1] + r, qz = Math.abs(p[2] - c[2]) - h[2] + r;
    return SDFK.len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
  },
};
// Naive surface nets: one vertex per sign-changing cell (mean of edge crossings), quads across sign-changing edges,
// normals from the field gradient. Returns an indexed BufferGeometry.
export function surfaceNets(f, min, max, cell) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const V = new Float32Array(nx * ny * nz), id = (i, j, k) => (k * ny + j) * nx + i, P3 = [0, 0, 0];
  // coarse pass (every 4th node); fine evaluation only inside a narrow band around the surface
  const C = 4, cx = Math.ceil((nx - 1) / C) + 1, cy = Math.ceil((ny - 1) / C) + 1, cz = Math.ceil((nz - 1) / C) + 1, VC = new Float32Array(cx * cy * cz), band = cell * C * 2.5;
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) { P3[0] = min[0] + i * C * cell; P3[1] = min[1] + j * C * cell; P3[2] = min[2] + k * C * cell; VC[(k * cy + j) * cx + i] = f(P3); }
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = VC[(Math.round(k / C) * cy + Math.round(j / C)) * cx + Math.round(i / C)];
    if (Math.abs(c) > band) { V[id(i, j, k)] = c; continue; }
    P3[0] = min[0] + i * cell; P3[1] = min[1] + j * cell; P3[2] = min[2] + k * cell; V[id(i, j, k)] = f(P3);
  }
  const vert = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8), co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { cv[c] = V[id(i + co[c][0], j + co[c][1], k + co[c][2])]; if (cv[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += co[a][0] + (co[b][0] - co[a][0]) * t; sy += co[a][1] + (co[b][1] - co[a][1]) * t; sz += co[a][2] + (co[b][2] - co[a][2]) * t; n++;
    }
    vert[id(i, j, k)] = pos.length / 3;
    pos.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell);
  }
  const idx = [], nor = new Float32Array(pos.length), e = cell * 0.5, Q = [0, 0, 0];
  for (let v = 0; v < pos.length / 3; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const g = (dx, dy, dz) => { Q[0] = x + dx; Q[1] = y + dy; Q[2] = z + dz; return f(Q); };
    let gx = g(e, 0, 0) - g(-e, 0, 0), gy = g(0, e, 0) - g(0, -e, 0), gz = g(0, 0, e) - g(0, 0, -e); const l = Math.hypot(gx, gy, gz) || 1;
    nor[v * 3] = gx / l; nor[v * 3 + 1] = gy / l; nor[v * 3 + 2] = gz / l;
  }
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    // orient by the field gradient
    const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
    const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    if (fx * (nor[a * 3] + nor[c * 3]) + fy * (nor[a * 3 + 1] + nor[c * 3 + 1]) + fz * (nor[a * 3 + 2] + nor[c * 3 + 2]) >= 0) idx.push(a, b, c, a, c, d);
    else idx.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = V[id(i, j, k)] < 0;
    if (s0 !== (V[id(i + 1, j, k)] < 0)) quad(vert[id(i, j - 1, k - 1)], vert[id(i, j, k - 1)], vert[id(i, j, k)], vert[id(i, j - 1, k)]);
    if (s0 !== (V[id(i, j + 1, k)] < 0)) quad(vert[id(i - 1, j, k - 1)], vert[id(i, j, k - 1)], vert[id(i, j, k)], vert[id(i - 1, j, k)]);
    if (s0 !== (V[id(i, j, k + 1)] < 0)) quad(vert[id(i - 1, j - 1, k)], vert[id(i, j - 1, k)], vert[id(i, j, k)], vert[id(i - 1, j, k)]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}


