import {encodeLocalSnapshot, sanitizeLocalSnapshot, applyLocalSnapshot} from './local-coat-snapshot.js';

// A replayable surface field for local fur edits. Recent strokes stay small;
// lossless checkpoints preserve older edits without a runtime paint limit.
export const LOCAL_COAT_WIDTH = 128;
export const LOCAL_COAT_HEIGHT = 64;
// Recent-stroke cache budget, rather than a lifetime limit on editing.
export const MAX_LOCAL_STAMPS = 512;

const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, finite(value, fallback)));
const round = value => Math.round(value * 10000) / 10000 || 0;
const wrap = value => {const remainder = value % 1;return remainder < 0 ? remainder + 1 : remainder;};
const vector = (value, count) => Array.isArray(value) && value.length === count && value.every(component => typeof component === 'number' && Number.isFinite(component));
const kinds = ['trim', 'dye', 'curl', 'restore'];
const restoreTargets = ['length', 'color', 'curl', 'all'];
// Residuals smaller than a visible texture contribution return to the exact
// identity. Repeated restoring can then become a true Float32 no-op.
const RESTORE_EPSILON = 1e-5;

// Matches THREE.SphereGeometry UVs after main.js maps its vertices to shapePoint.
// The procedural surface uses x=sin(phi), z=cos(phi), not SphereGeometry's phi.
export function surfaceUV(theta, phi) {
  return [wrap((phi + Math.PI / 2) / (Math.PI * 2)), Math.max(0, Math.min(1, 1 - theta / Math.PI))];
}
export function surfaceParameters(u, v) {
  return [Math.PI * (1 - Math.max(0, Math.min(1, v))), Math.PI * 2 * wrap(u) - Math.PI / 2];
}

/** Discard malformed centers; copy and bound all supported scalar fields. */
export function sanitizeLocalEdits(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const raw of value.slice(0, MAX_LOCAL_STAMPS)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !kinds.includes(raw.kind) || !vector(raw.uv, 2) || !vector(raw.point, 3)) continue;
    const limits = raw.kind === 'trim' ? [.08, 1, .5] : raw.kind === 'curl' ? [-1, 1, .4] : [0, 1, raw.kind === 'restore' ? 1 : .75];
    const stamp = {
      kind: raw.kind,
      uv: [wrap(round(wrap(raw.uv[0]))), round(clamp(raw.uv[1], 0, 1, .5))],
      point: raw.point.map(component => round(clamp(component, -2.5, 2.5, 0))),
      radius: round(clamp(raw.radius, .05, .6, .2)),
      value: round(clamp(raw.value, ...limits)),
      color: typeof raw.color === 'string' && /^#[\da-f]{6}$/i.test(raw.color) ? raw.color.toLowerCase() : '#d87d91',
    };
    // Older edit kinds retain their original serialized format.
    if (raw.kind === 'restore') stamp.target = restoreTargets.includes(raw.target) ? raw.target : 'all';
    result.push(stamp);
  }
  return result;
}

function linearRGB(color) {
  return [1, 3, 5].map(start => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
}
const lerp = (a, b, weight) => a + (b - a) * weight;
const coords = point => Array.isArray(point) || ArrayBuffer.isView(point) ? point : [point.x, point.y, point.z];

export class LocalCoatField {
  constructor(surface) {
    if (typeof surface !== 'function') throw new TypeError('LocalCoatField needs a resting surface function');
    this.width = LOCAL_COAT_WIDTH;this.height = LOCAL_COAT_HEIGHT;
    this.data = new Float32Array(this.width * this.height * 4);
    this.colorData = new Float32Array(this.data.length);
    this.roots = new Float32Array(this.width * this.height * 3);
    this.baseSnapshot = '';
    this.stamps = [];
    this.lastPaintResult = {reason: 'unchanged', affected: 0, changed: 0, full: false};
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      const [theta, phi] = surfaceParameters((x + .5) / this.width, (y + .5) / this.height);
      const point = coords(surface(theta, phi));
      if (point.length !== 3 || !point.every(Number.isFinite)) throw new TypeError('Surface roots must be finite three-component points');
      this.roots.set(point, (y * this.width + x) * 3);
    }
    this.resetPixels();
  }
  resetPixels() {
    this.data.fill(0);this.colorData.fill(0);
    for (let i = 0; i < this.data.length; i += 4) {this.data[i] = 1;this.data[i + 3] = this.colorData[i + 3] = 1;}
  }
  apply(stamp) {
    const radius = stamp.radius, [px, py, pz] = stamp.point, color = linearRGB(stamp.color);
    let affected = 0, changed = 0;
    // Three-dimensional distance, not wrapped UV distance, decides influence.
    // This keeps the longitude seam continuous and prevents painting the back
    // just because its UV coordinates happen to sit close to a visible point.
    for (let i = 0; i < this.width * this.height; i++) {
      const r = i * 3, offset = i * 4;
      const distance = Math.hypot(this.roots[r] - px, this.roots[r + 1] - py, this.roots[r + 2] - pz);
      if (distance >= radius) continue;
      affected++;
      const t = 1 - distance / radius, weight = t * t * (3 - 2 * t);
      // Scissors can only remove length. A lighter later stroke does not grow
      // hair back; a restore stroke or undo/replay returns previous length.
      if (stamp.kind === 'trim') {
        const previous = this.data[offset];
        this.data[offset] = Math.min(previous, lerp(1, stamp.value, weight));
        // Compare the stored Float32 value, not a more precise intermediate.
        // Revisiting already cut fur must not consume another saved stamp.
        if (this.data[offset] !== previous) changed++;
      }
      else if (stamp.kind === 'curl') {
        const previous = this.data[offset + 1];
        this.data[offset + 1] = lerp(previous, stamp.value, weight);
        if (this.data[offset + 1] !== previous) changed++;
      }
      else if (stamp.kind === 'restore') {
        const alpha = weight * stamp.value;
        if (alpha <= 0) continue;
        let pixelChanged = false;
        if (stamp.target === 'length' || stamp.target === 'all') {
          const previous = this.data[offset], next = lerp(previous, 1, alpha);
          this.data[offset] = 1 - next <= RESTORE_EPSILON ? 1 : next;
          if (this.data[offset] !== previous) pixelChanged = true;
        }
        if (stamp.target === 'curl' || stamp.target === 'all') {
          const previous = this.data[offset + 1], next = previous * (1 - alpha);
          this.data[offset + 1] = Math.abs(next) <= RESTORE_EPSILON ? 0 : next;
          if (this.data[offset + 1] !== previous) pixelChanged = true;
        }
        if (stamp.target === 'color' || stamp.target === 'all') {
          const previous = this.data[offset + 2], next = previous * (1 - alpha);
          const clearColor = next <= RESTORE_EPSILON;
          this.data[offset + 2] = clearColor ? 0 : next;
          if (this.data[offset + 2] !== previous) pixelChanged = true;
          // Fade premultiplied RGB with coverage to preserve its hue. At the
          // identity all four dye components clear together, without a fringe.
          for (let axis = 0; axis < 3; axis++) {
            const previousColor = this.colorData[offset + axis];
            this.colorData[offset + axis] = clearColor ? 0 : previousColor * (1 - alpha);
            if (this.colorData[offset + axis] !== previousColor) pixelChanged = true;
          }
        }
        if (pixelChanged) changed++;
      }
      else {
        const alpha = weight * stamp.value, previous = this.data[offset + 2], coverage = alpha + previous * (1 - alpha);
        if (coverage <= 0) continue;
        let pixelChanged = false;
        for (let axis = 0; axis < 3; axis++) {
          const previousColor = this.colorData[offset + axis];
          this.colorData[offset + axis] = color[axis] * alpha + previousColor * (1 - alpha);
          if (this.colorData[offset + axis] !== previousColor) pixelChanged = true;
        }
        this.data[offset + 2] = coverage;
        if (pixelChanged || this.data[offset + 2] !== previous) changed++;
      }
    }
    return {affected, changed};
  }
  /** Boolean compatibility is retained; detailed feedback reflects actual texel changes.
   * Only changed paint is cached. Baking the cache preserves every Float32 value
   * while freeing recent-stroke space; full remains false for older callers.
   */
  stamp(raw) {
    const [clean] = sanitizeLocalEdits([raw]);
    if (!clean) {
      this.lastPaintResult = {reason: 'invalid', affected: 0, changed: 0, full: false};
      return false;
    }
    const {affected, changed} = this.apply(clean);
    this.lastPaintResult = {reason: changed ? 'changed' : 'unchanged', affected, changed, full: false};
    if (!changed) return false;
    this.stamps.push(clean);
    if (this.stamps.length >= MAX_LOCAL_STAMPS) {
      this.baseSnapshot = encodeLocalSnapshot(this.data, this.colorData);
      this.stamps = [];
    }
    return true;
  }
  paint(raw) {return this.stamp(raw);}
  getState() {
    return {snapshot: this.baseSnapshot, edits: this.stamps.map(stamp => ({...stamp, uv: [...stamp.uv], point: [...stamp.point]}))};
  }
  replayState(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
    const snapshot = sanitizeLocalSnapshot(state.snapshot), edits = sanitizeLocalEdits(state.edits);
    if (snapshot === null) return false;
    if (snapshot === this.baseSnapshot && JSON.stringify(edits) === JSON.stringify(this.stamps)) return false;
    if (!applyLocalSnapshot(snapshot, this.data, this.colorData)) return false;
    this.baseSnapshot = snapshot;this.stamps = edits;for (const stamp of edits) this.apply(stamp);
    this.lastPaintResult = {reason: 'unchanged', affected: 0, changed: 0, full: false};
    return true;
  }
  replay(raw) {return this.replayState({snapshot: '', edits: raw});}
  clear() {
    if (!this.baseSnapshot && !this.stamps.length) return false;
    this.baseSnapshot = '';this.stamps = [];this.resetPixels();
    this.lastPaintResult = {reason: 'unchanged', affected: 0, changed: 0, full: false};
    return true;
  }
  sample(u, v) {
    const px = wrap(finite(u, 0)) * this.width - .5, py = clamp(v, 0, 1, .5) * this.height - .5;
    const x = Math.floor(px), y = Math.floor(py), tx = px - x, ty = py - y;
    const index = (ix, iy) => (Math.max(0, Math.min(this.height - 1, iy)) * this.width + (ix + this.width) % this.width) * 4;
    const a = index(x, y), b = index(x + 1, y), c = index(x, y + 1), d = index(x + 1, y + 1);
    const read = (data, channel) => lerp(lerp(data[a + channel], data[b + channel], tx), lerp(data[c + channel], data[d + channel], tx), ty);
    const colorMix = read(this.data, 2);
    // The RGB texture is premultiplied by dye coverage; unpainted texels do not
    // inject white at the edge. sample() returns its unpremultiplied color.
    const color = [0, 1, 2].map(axis => colorMix > 0 ? read(this.colorData, axis) / colorMix : 1);
    return {lengthScale: read(this.data, 0), curlDelta: read(this.data, 1), colorMix, color};
  }
}
