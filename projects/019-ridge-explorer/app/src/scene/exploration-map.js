import { ridgeX } from './math.js';

const ridge = z => ({ x: ridgeX(z), z });
const shoulder = (z, offset) => ({ x: ridgeX(z) + offset, z });
export const START = Object.freeze({ ...ridge(12), yaw: 0 });
export const WORLD_BOUNDS = Object.freeze({ minX: -205, maxX: 295, minZ: -620, maxZ: 45 });

export const LANDMARKS = Object.freeze([
  { id: 'creek', name: '薄雾溪流', description: '穿过浅水石滩，沿溪声走进山谷。', ...shoulder(-78, -49), radius: 11 },
  { id: 'camp', name: '林边营地', description: '松林边的旧帐篷，火光在风中轻轻摇动。', ...shoulder(-170, -85), radius: 12 },
  { id: 'lookout', name: '雪峰观景台', description: '登上山肩，在木栏旁望见云雾中的雪峰。', ...shoulder(-270, 66), radius: 12 },
].map(Object.freeze));

const main = [45, 40, 30, 20, 12, 0, ...Array.from({ length: 62 }, (_, i) => -(i + 1) * 10)].map(ridge);
const valley = [ridge(-40), shoulder(-46, -13), shoulder(-59, -30), LANDMARKS[0],
  shoulder(-99, -69), shoulder(-125, -91), LANDMARKS[1], shoulder(-195, -67),
  shoulder(-215, -36), ridge(-230)];
const shoulderLoop = [ridge(-150), shoulder(-172, 18), shoulder(-212, 40),
  shoulder(-242, 58), LANDMARKS[2], shoulder(-300, 54), shoulder(-319, 25), ridge(-340)];
export const TRAILS = Object.freeze([
  { id: 'ridge', name: '山脊小径', points: main },
  { id: 'valley', name: '溪流与营地', points: valley },
  { id: 'shoulder', name: '雪峰支线', points: shoulderLoop },
].map(trail => Object.freeze({ ...trail, points: Object.freeze(trail.points.map(point => Object.freeze({ x: point.x, z: point.z }))) })));

// A continuous loop: the two branches share their junctions with the ridge.
const ridgeBetween = (from, to) => main.filter(p => p.z <= Math.max(from, to) && p.z >= Math.min(from, to))
  .sort((a, b) => from > to ? b.z - a.z : a.z - b.z);
export const TOUR_ROUTE = Object.freeze([
  ...ridgeBetween(12, -40), ...valley.slice(1), ...ridgeBetween(-230, -340).slice(1),
  ...[...shoulderLoop].reverse().slice(1), ...ridgeBetween(-150, 12).slice(1),
].map(point => Object.freeze({ x: point.x, z: point.z })));

export function distanceToSegment(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}

export function distanceToTrail(x, z) {
  let nearest = Infinity;
  for (const trail of TRAILS) for (let i = 1; i < trail.points.length; i++)
    nearest = Math.min(nearest, distanceToSegment(x, z, trail.points[i - 1], trail.points[i]));
  return nearest;
}

export function isExplorationClearing(x, z, clearance = 1.8) {
  for (const landmark of LANDMARKS) {
    const radius = landmark.id === 'camp' ? 10 : landmark.id === 'lookout' ? 7 : 5;
    if (Math.hypot(x - landmark.x, z - landmark.z) < radius + clearance) return true;
  }
  for (const trail of TRAILS.slice(1)) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i];
    if (x < Math.min(a.x, b.x) - clearance || x > Math.max(a.x, b.x) + clearance
      || z < Math.min(a.z, b.z) - clearance || z > Math.max(a.z, b.z) + clearance) continue;
    if (distanceToSegment(x, z, a, b) < clearance) return true;
  }
  return false;
}

export function samplePolyline(points, step = 2) {
  const samples = [{ x: points[0].x, z: points[0].z }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let j = 1; j <= n; j++) samples.push({ x: a.x + (b.x - a.x) * j / n, z: a.z + (b.z - a.z) * j / n });
  }
  return samples;
}
