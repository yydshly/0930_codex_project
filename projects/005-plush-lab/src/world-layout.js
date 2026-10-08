const TAU = Math.PI * 2;
const SCENE_IDS = ['room', 'garden', 'gallery'];
export const MAX_FURNITURE_PER_SCENE = 8;
export const WORLD_FLOOR_BOUNDS = 2.65;
export const CHARACTER_RADIUS = 0.55;

/** Footprints use local x/z metres and match the visible furniture meshes. */
export const FURNITURE = Object.freeze([
  {id: 'sofa', label: '小沙发', width: 2.2, depth: 1.0},
  {id: 'table', label: '小圆桌', width: 1.1, depth: 1.1},
  {id: 'lamp', label: '落地灯', width: 0.56, depth: 0.56},
  {id: 'plant', label: '绿植', width: 0.64, depth: 0.64},
  {id: 'cushion', label: '软垫', width: 0.8, depth: 0.8},
].map(row => Object.freeze(row)));
const catalog = new Map(FURNITURE.map(row => [row.id, row]));
const unsafeIds = new Set(['constructor', 'prototype', '__proto__', 'tostring', 'hasownproperty']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const normalizedRotation = value => {
  const wrapped = (value % TAU + TAU) % TAU;
  return Math.abs(wrapped - TAU) < 1e-10 || Math.abs(wrapped) < 1e-10 ? 0 : wrapped;
};
const validId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(value)
  && !unsafeIds.has(value.toLowerCase());
const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const sceneId = world => SCENE_IDS.includes(world?.scene) ? world.scene : 'room';
const emptyLayout = () => ({room: [], garden: [], gallery: []});

function footprint(item) {
  const definition = catalog.get(item.type);
  return {id: item.id, x: item.x, z: item.z, width: definition.width, depth: definition.depth, rotation: item.rotation};
}

function contained(item) {
  const definition = catalog.get(item.type), cosine = Math.abs(Math.cos(item.rotation)), sine = Math.abs(Math.sin(item.rotation));
  const extentX = (definition.width * cosine + definition.depth * sine) / 2;
  const extentZ = (definition.width * sine + definition.depth * cosine) / 2;
  return Math.abs(item.x) + extentX <= WORLD_FLOOR_BOUNDS + 1e-9 && Math.abs(item.z) + extentZ <= WORLD_FLOOR_BOUNDS + 1e-9;
}

/** Missing legacy layout means empty. Malformed items are rejected, never coerced. */
export function sanitizeLayout(input) {
  const result = emptyLayout(), ids = new Set();
  if (!record(input)) return result;
  for (const scene of SCENE_IDS) {
    if (!own(input, scene) || !Array.isArray(input[scene])) continue;
    for (const value of input[scene]) {
      if (result[scene].length >= MAX_FURNITURE_PER_SCENE) break;
      if (!record(value) || !['id', 'type', 'x', 'z', 'rotation', 'color'].every(key => own(value, key))
        || !validId(value.id) || ids.has(value.id) || !catalog.has(value.type)
        || !finite(value.x) || !finite(value.z) || !finite(value.rotation) || !validColor(value.color)) continue;
      const item = {id: value.id, type: value.type, x: value.x, z: value.z,
        rotation: normalizedRotation(value.rotation), color: value.color.toLowerCase()};
      if (!contained(item)) continue;
      ids.add(item.id);result[scene].push(item);
    }
  }
  return result;
}

export function layoutForScene(world) {
  return sanitizeLayout(world?.layout)[sceneId(world)];
}

export function furnitureObstacles(world, excludeId = null) {
  return layoutForScene(world).filter(item => item.id !== excludeId).map(footprint);
}

/** Standing point in front of a sofa: Three.js yaw rotates local +z toward +x. */
export function sofaApproach(item, distance = 1.15) {
  if (!record(item) || !finite(item.x) || !finite(item.z) || !finite(item.rotation) || !finite(distance) || distance <= 0) return null;
  return [item.x + Math.sin(item.rotation) * distance, item.z + Math.cos(item.rotation) * distance];
}

/** Every sofa needs a clear front and a route from the character's starting area. */
export function validateSeatAccess(world, extraObstacles = [], options = {}) {
  const sofas = layoutForScene(world).filter(item => item.type === 'sofa');
  if (!sofas.length) return null;
  const obstacles = [...furnitureObstacles(world), ...(Array.isArray(extraObstacles) ? extraObstacles : [])];
  for (const sofa of sofas) {
    const approach = sofaApproach(sofa);
    if (!isWalkable(approach, obstacles, options)) return '沙发前方需要留出站立空间，请移动或旋转家具。';
    if (!planPath([0, 0], approach, obstacles, options)) return '通往沙发的路被挡住了，请为角色留出通道。';
  }
  return null;
}

/** Pose is independent of character appearance; old worlds begin standing at the origin. */
export function sanitizePose(input, layout, activeScene = 'room') {
  const result = {x: 0, z: 0, seatId: null};
  if (!record(input)) return result;
  for (const key of ['x', 'z']) if (finite(input[key])) result[key] = Math.max(-WORLD_FLOOR_BOUNDS, Math.min(WORLD_FLOOR_BOUNDS, input[key]));
  const items = sanitizeLayout(layout)[SCENE_IDS.includes(activeScene) ? activeScene : 'room'];
  if (validId(input.seatId) && items.some(item => item.id === input.seatId && item.type === 'sofa')) result.seatId = input.seatId;
  return result;
}

function overlap(a, b, padding = 0.06) {
  const axes = [[Math.cos(a.rotation), -Math.sin(a.rotation)], [Math.sin(a.rotation), Math.cos(a.rotation)],
    [Math.cos(b.rotation), -Math.sin(b.rotation)], [Math.sin(b.rotation), Math.cos(b.rotation)]];
  const aAxes = axes.slice(0, 2), bAxes = axes.slice(2);
  for (const axis of axes) {
    const projectedRadius = (shape, basis) => Math.abs(axis[0] * basis[0][0] + axis[1] * basis[0][1]) * shape.width / 2
      + Math.abs(axis[0] * basis[1][0] + axis[1] * basis[1][1]) * shape.depth / 2;
    if (Math.abs((a.x - b.x) * axis[0] + (a.z - b.z) * axis[1]) >= projectedRadius(a, aAxes) + projectedRadius(b, bAxes) + padding) return false;
  }
  return true;
}

const placements = {
  sofa: [[0, -1.8], [0, 1.8], [-1.4, 0], [1.4, 0]],
  table: [[1.7, -0.4], [-1.7, -0.4], [1.7, 1.6], [-1.7, 1.6]],
  lamp: [[-2.1, -1.9], [2.1, -1.9], [-2.1, 1.9], [2.1, 1.9]],
  plant: [[2.1, -1.9], [-2.1, -1.9], [2.1, 1.9], [-2.1, 1.9]],
  cushion: [[-1.6, 1.5], [1.6, 1.5], [-1.6, -0.2], [1.6, -0.2]],
};

function resultFor(world, layout, item, error = null) {
  return {world: {...world, layout}, item, error};
}

/** Changes only layout, leaving appearance, seed, pose and other supported fields intact. */
export function addFurniture(world, type) {
  const layout = sanitizeLayout(world?.layout), scene = sceneId(world), items = layout[scene];
  if (!catalog.has(type)) return resultFor(world, layout, null, '没有这种家具。');
  if (items.length >= MAX_FURNITURE_PER_SCENE) return resultFor(world, layout, null, '当前场景已放满 8 件家具，可以移动或移除已有家具。');
  const allIds = new Set(SCENE_IDS.flatMap(key => layout[key].map(item => item.id)));
  let number = 1;
  for (const id of allIds) {
    const match = id.match(new RegExp(`^${type}-(\\d+)$`));
    // Imported IDs may contain arbitrary digit suffixes. Keep newly assigned counters bounded.
    if (match && Number.isSafeInteger(Number(match[1])) && Number(match[1]) <= 1e9) number = Math.max(number, Number(match[1]) + 1);
  }
  while (allIds.has(`${type}-${number}`)) number++;
  const id = `${type}-${number}`, tint = validColor(world?.accentColor) ? world.accentColor.toLowerCase() : '#7e9b7a';
  const character = sanitizePose(world?.pose, layout, scene), obstacles = items.map(footprint);
  const candidates = [...placements[type]];
  for (let z = -2.1; z <= 2.11; z += 0.7) for (let x = -2.1; x <= 2.11; x += 0.7) candidates.push([x, z]);
  for (const [x, z] of candidates) {
    const item = {id, type, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, rotation: 0, color: tint};
    const bounds = footprint(item);
    if (!contained(item) || obstacles.some(other => overlap(bounds, other))
      || !isWalkable([character.x, character.z], [bounds], {radius: CHARACTER_RADIUS + 0.08})) continue;
    items.push(item);return resultFor(world, layout, {...item});
  }
  return resultFor(world, layout, null, '没有足够的空地，请先移动已有家具。');
}

export function updateFurniture(world, id, patch = {}) {
  const layout = sanitizeLayout(world?.layout), scene = sceneId(world), index = layout[scene].findIndex(item => item.id === id);
  if (index < 0) return resultFor(world, layout, null, '请选择当前场景里的家具。');
  const previous = layout[scene][index], candidate = {...previous};
  if (!record(patch)) return resultFor(world, layout, null, '家具参数无效。');
  for (const key of ['x', 'z', 'rotation']) {
    if (!own(patch, key)) continue;
    if (!finite(patch[key])) return resultFor(world, layout, null, '家具位置和角度需要是有效数字。');
    candidate[key] = key === 'rotation' ? normalizedRotation(patch[key]) : patch[key];
  }
  if (own(patch, 'color')) {
    if (!validColor(patch.color)) return resultFor(world, layout, null, '家具颜色无效。');
    candidate.color = patch.color.toLowerCase();
  }
  if (!contained(candidate)) return resultFor(world, layout, null, '家具需要留在场景地面内。');
  const bounds = footprint(candidate);
  if (layout[scene].some(item => item.id !== id && overlap(bounds, footprint(item)))) return resultFor(world, layout, null, '这里有其他家具，请换一个位置。');
  const character = sanitizePose(world?.pose, layout, scene);
  if (character.seatId !== id && !isWalkable([character.x, character.z], [bounds], {radius: CHARACTER_RADIUS + 0.02})) {
    return resultFor(world, layout, null, '这里是角色站立的位置，请先让它走开。');
  }
  layout[scene][index] = candidate;return resultFor(world, layout, {...candidate});
}

export function removeFurniture(world, id) {
  const layout = sanitizeLayout(world?.layout), scene = sceneId(world);
  layout[scene] = layout[scene].filter(item => item.id !== id);
  const pose = sanitizePose(world?.pose, layout, scene);
  return {...world, layout, ...(world?.pose ? {pose} : {})};
}

function navigationInput(start, target, obstacles, options) {
  const point = value => Array.isArray(value) && value.length === 2 && value.every(finite);
  const radius = options?.radius ?? CHARACTER_RADIUS, bounds = options?.bounds ?? WORLD_FLOOR_BOUNDS;
  const diskRadius = options?.diskRadius;
  if (!point(start) || !point(target) || !finite(radius) || radius < 0 || !finite(bounds) || bounds <= 0 || !Array.isArray(obstacles)) return null;
  if (diskRadius !== undefined && (!finite(diskRadius) || diskRadius <= 0)) return null;
  const validObstacles = [];
  for (const value of obstacles) {
    if (!record(value) || !finite(value.x) || !finite(value.z)) return null;
    if (finite(value.radius) && value.radius >= 0) validObstacles.push({x: value.x, z: value.z, radius: value.radius});
    else if (finite(value.width) && value.width > 0 && finite(value.depth) && value.depth > 0
      && (value.rotation === undefined || finite(value.rotation))) {
      validObstacles.push({x: value.x, z: value.z, width: value.width, depth: value.depth, rotation: value.rotation ?? 0});
    } else return null;
  }
  return {start, target, obstacles: validObstacles, radius, bounds, diskRadius};
}

function pointSegmentSquared(point, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length)) : 0;
  return (point[0] - a[0] - dx * t) ** 2 + (point[1] - a[1] - dz * t) ** 2;
}

function segmentSquared(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (abC * abD <= 0 && cdA * cdB <= 0
    && Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) + 1e-10
    && Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) + 1e-10) return 0;
  return Math.min(pointSegmentSquared(a, c, d), pointSegmentSquared(b, c, d), pointSegmentSquared(c, a, b), pointSegmentSquared(d, a, b));
}

function clearSegment(a, b, navigation) {
  if ([...a, ...b].some(value => Math.abs(value) > navigation.bounds + 1e-9)) return false;
  // A disk is convex, so endpoints inside it keep the entire straight segment inside.
  if (navigation.diskRadius !== undefined && [a, b].some(point => Math.hypot(...point) > navigation.diskRadius + 1e-9)) return false;
  for (const obstacle of navigation.obstacles) {
    if ('radius' in obstacle) {
      if (pointSegmentSquared([obstacle.x, obstacle.z], a, b) < (navigation.radius + obstacle.radius) ** 2 - 1e-10) return false;
      continue;
    }
    const cosine = Math.cos(obstacle.rotation), sine = Math.sin(obstacle.rotation);
    const local = p => [(p[0] - obstacle.x) * cosine - (p[1] - obstacle.z) * sine,
      (p[0] - obstacle.x) * sine + (p[1] - obstacle.z) * cosine];
    const p = local(a), q = local(b), x = obstacle.width / 2, z = obstacle.depth / 2;
    if ([p, q].some(v => Math.abs(v[0]) <= x && Math.abs(v[1]) <= z)) return false;
    const corners = [[-x, -z], [x, -z], [x, z], [-x, z]];
    for (let i = 0; i < 4; i++) {
      if (segmentSquared(p, q, corners[i], corners[(i + 1) % 4]) < navigation.radius ** 2 + 1e-10) return false;
    }
  }
  return true;
}

/** Bounds and optional diskRadius constrain the centre; obstacles expand by body radius. */
export function isWalkable(point, obstacles = [], options = {}) {
  const input = navigationInput(point, point, obstacles, options);
  return input !== null && clearSegment(point, point, input);
}

export function isPathClear(start, target, obstacles = [], options = {}) {
  const input = navigationInput(start, target, obstacles, options);
  return input !== null && clearSegment(start, target, input);
}

/** Deterministic floor-grid A* with exact segment checks and visibility simplification. */
export function planPath(start, target, obstacles = [], options = {}) {
  const input = navigationInput(start, target, obstacles, options);
  if (!input || !clearSegment(start, start, input) || !clearSegment(target, target, input)) return null;
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (distance(start, target) < 1e-8) return [[...start]];
  if (clearSegment(start, target, input)) return [[...start], [...target]];
  const divisions = Math.ceil(input.bounds * 2 / 0.22), size = divisions + 1, step = input.bounds * 2 / divisions;
  const points = Array.from({length: size * size}, (_, i) => [i % size * step - input.bounds, Math.floor(i / size) * step - input.bounds]);
  const free = points.map(point => clearSegment(point, point, input));
  const first = points.map((point, i) => ({i, distance: distance(start, point)}))
    .filter(row => free[row.i] && row.distance <= 0.8 && clearSegment(start, points[row.i], input))
    .sort((a, b) => a.distance - b.distance || a.i - b.i).slice(0, 8);
  if (!first.length) return null;
  const costs = new Float64Array(points.length).fill(Infinity), parents = new Int32Array(points.length).fill(-1), closed = new Uint8Array(points.length), open = new Set();
  for (const row of first) {costs[row.i] = row.distance;open.add(row.i);}
  const simplify = path => {
    const result = [path[0]];let index = 0;
    while (index < path.length - 1) {
      let next = path.length - 1;
      while (next > index + 1 && !clearSegment(path[index], path[next], input)) next--;
      result.push(path[next]);index = next;
    }
    return result.map(point => [...point]);
  };
  while (open.size) {
    let current = -1, score = Infinity;
    for (const i of open) {
      const candidate = costs[i] + distance(points[i], target);
      if (candidate < score) {score = candidate;current = i;}
    }
    open.delete(current);closed[current] = 1;
    if (clearSegment(points[current], target, input)) {
      const reversed = [target];let cursor = current;
      while (cursor !== -1) {reversed.push(points[cursor]);cursor = parents[cursor];}
      reversed.push(start);return simplify(reversed.reverse());
    }
    const x = current % size, z = Math.floor(current / size);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dz) || x + dx < 0 || x + dx >= size || z + dz < 0 || z + dz >= size) continue;
      const next = (z + dz) * size + x + dx;
      if (closed[next] || !free[next] || !clearSegment(points[current], points[next], input)) continue;
      const cost = costs[current] + distance(points[current], points[next]);
      if (cost >= costs[next]) continue;
      costs[next] = cost;parents[next] = current;open.add(next);
    }
  }
  return null;
}
