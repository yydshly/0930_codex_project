import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE, MAX_FURNITURE_PER_SCENE, WORLD_FLOOR_BOUNDS, sanitizeLayout, sanitizePose,
  layoutForScene, furnitureObstacles, sofaApproach, validateSeatAccess, addFurniture, updateFurniture, removeFurniture, isWalkable, isPathClear, planPath} from '../src/world-layout.js';
import {defaultWorld, sanitizeWorld, generateWorld, encodeWorld, decodeWorld, MAX_WORLD_TOKEN} from '../src/world-config.js';

const item = (id, type = 'plant', x = 1.8, z = -1.8, extra = {}) => ({id, type, x, z, rotation: 0, color: '#7e9b7a', ...extra});
const tokenFor = value => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
const validPath = (path, obstacles, options) => {
  assert.ok(path);
  for (const point of path) assert.equal(isWalkable(point, obstacles, options), true, `point ${point}`);
  for (let i = 1; i < path.length; i++) assert.equal(isPathClear(path[i - 1], path[i], obstacles, options), true, `segment ${path[i - 1]} to ${path[i]}`);
};

test('legacy v1 worlds still decode with appearance intact and empty fresh layout and standing pose', () => {
  const legacy = {version: 1, seed: 'before-layout', name: '旧作品 🧸', shape: 'bunny', material: 'teddy',
    furColor: '#b7ce98', accentColor: '#e2bc70', secondaryColor: '#f4eedf', hat: 'bow', outfit: 'poncho',
    accessory: 'satchel', scene: 'garden', lighting: 'day', personality: 'curious'};
  const restored = decodeWorld(tokenFor(legacy));
  for (const key of Object.keys(legacy)) assert.equal(restored[key], legacy[key]);
  assert.deepEqual(restored.layout, {room: [], garden: [], gallery: []});
  assert.deepEqual(restored.pose, {x: 0, z: 0, seatId: null});
  const a = defaultWorld(), b = defaultWorld();a.layout.room.push(item('plant-1'));a.pose.x = 1;
  assert.equal(b.layout.room.length, 0);assert.equal(b.pose.x, 0);
});

test('layouts and seat pose roundtrip in share token, scene switch preserves all three layouts', () => {
  const source = sanitizeWorld({...defaultWorld(), layout: {room: [item('sofa-1', 'sofa', 0, -1.8)],
    garden: [item('plant-1')], gallery: [item('lamp-1', 'lamp')]}, pose: {x: 0, z: -1.72, seatId: 'sofa-1'}});
  assert.deepEqual(decodeWorld(encodeWorld(source)), source);
  const garden = sanitizeWorld({...source, scene: 'garden'});
  assert.deepEqual(garden.layout, source.layout);assert.equal(garden.pose.seatId, null);
  assert.deepEqual(layoutForScene(garden), source.layout.garden);
  const generated = generateWorld('next-character', source);
  assert.deepEqual(generated.layout, source.layout);assert.notStrictEqual(generated.layout.room, source.layout.room);
  assert.deepEqual(generated.pose, {x: 0, z: 0, seatId: null});
});

test('layout rejects prototype IDs, duplicate IDs, malformed numbers, unsupported types and out of floor bounds', () => {
  const original = {room: [item('plant-1'), item('plant-1'), item('__proto__'), item('constructor'), item('prototype'),
    item('nan', 'plant', NaN), item('infinite', 'plant', Infinity), item('string', 'plant', '1'), item('outside', 'plant', 3),
    item('unknown', 'bed'), item('bad-rotation', 'plant', 1, 1, {rotation: NaN}), item('bad-color', 'plant', 1, 1, {color: 'red'}),
    item('lamp-2', 'lamp', 1.1, 1.2, {rotation: -Math.PI / 2, color: '#ABCDEF'})], garden: [item('plant-1')], gallery: []};
  const cleaned = sanitizeLayout(original);
  assert.deepEqual(cleaned.room.map(value => value.id), ['plant-1', 'lamp-2']);assert.deepEqual(cleaned.garden, []);
  assert.equal(cleaned.room[1].rotation, Math.PI * 1.5);assert.equal(cleaned.room[1].color, '#abcdef');
  assert.equal(original.room.length, 13);assert.notStrictEqual(cleaned.room[0], original.room[0]);
  assert.deepEqual(sanitizeLayout(Object.create({room: [item('inherited')]})), {room: [], garden: [], gallery: []});
  assert.equal(sanitizeLayout({room: [item('clipped-sofa', 'sofa', 2, 0)]}).room.length, 0);
});

test('per-scene item limits fit the expanded token budget without truncating other world fields', () => {
  assert.equal(MAX_FURNITURE_PER_SCENE, 8);assert.equal(MAX_WORLD_TOKEN, 131072);
  const layout = Object.fromEntries(['room', 'garden', 'gallery'].map(scene => [scene,
    Array.from({length: 10}, (_, i) => item(`${scene}-furniture-${i}`, 'lamp', 0.7, 0.8))]));
  const world = sanitizeWorld({...defaultWorld(), name: '房间 花园 展厅 🧸', layout});
  for (const scene of Object.keys(layout)) assert.equal(world.layout[scene].length, 8);
  assert.ok(encodeWorld(world).length < MAX_WORLD_TOKEN);assert.deepEqual(decodeWorld(encodeWorld(world)), world);
});

test('pose clamps finite positions and permits only sofas in the active scene as seats', () => {
  const layout = {room: [item('sofa-1', 'sofa', 0, -1.8), item('lamp-1', 'lamp')], garden: [item('sofa-2', 'sofa', 0, -1.8)]};
  assert.deepEqual(sanitizePose({x: 100, z: -100, seatId: 'sofa-1'}, layout, 'room'), {x: 2.65, z: -2.65, seatId: 'sofa-1'});
  for (const seatId of ['lamp-1', 'sofa-2', '__proto__', null]) assert.equal(sanitizePose({seatId}, layout, 'room').seatId, null);
  assert.deepEqual(sanitizePose({x: NaN, z: '1', seatId: 'missing'}, layout), {x: 0, z: 0, seatId: null});
});

test('adding, moving, rotating, recolouring and removing furniture preserve unrelated creation data', () => {
  const original = {...defaultWorld(), name: '我布置的房间', additional: 'untouched'};
  const added = addFurniture(original, 'sofa');
  assert.equal(added.error, null);assert.equal(added.item.id, 'sofa-1');assert.equal(original.layout.room.length, 0);
  assert.equal(added.world.name, original.name);assert.equal(added.world.seed, original.seed);assert.equal(added.world.additional, 'untouched');
  const moved = updateFurniture(added.world, 'sofa-1', {x: 0.2, z: -1.6, rotation: 0.2, color: '#ABCDEF'});
  assert.equal(moved.error, null);assert.equal(moved.item.color, '#abcdef');assert.equal(moved.item.x, 0.2);
  assert.equal(added.world.layout.room[0].x, 0);assert.equal(moved.world.additional, 'untouched');
  const switched = {...moved.world, scene: 'garden'};
  const garden = addFurniture(switched, 'sofa');assert.equal(garden.item.id, 'sofa-2');assert.equal(garden.world.layout.room.length, 1);
  const removed = removeFurniture({...garden.world, pose: {x: 0, z: -1.7, seatId: 'sofa-2'}}, 'sofa-2');
  assert.equal(removed.layout.garden.length, 0);assert.equal(removed.layout.room.length, 1);assert.equal(removed.pose.seatId, null);
  assert.equal(removed.additional, 'untouched');
});

test('automatic placement keeps the character clear; failed placement and edits preserve existing items', () => {
  let world = defaultWorld();
  for (const type of FURNITURE.map(value => value.id)) {
    const result = addFurniture(world, type);assert.equal(result.error, null);world = result.world;
    assert.equal(isWalkable([0, 0], furnitureObstacles(world)), true);
  }
  assert.equal(furnitureObstacles(world, world.layout.room[0].id).length, world.layout.room.length - 1);
  const before = JSON.stringify(world), invalid = updateFurniture(world, 'sofa-1', {x: NaN});
  assert.ok(invalid.error);assert.equal(JSON.stringify(invalid.world), before);
  const overCharacter = updateFurniture(world, 'sofa-1', {x: 0, z: 0});
  assert.ok(overCharacter.error);assert.deepEqual(overCharacter.world, world);
  const unknown = addFurniture(world, 'constructor');assert.ok(unknown.error);assert.deepEqual(unknown.world, world);
  const full = {...world, layout: {room: Array.from({length: 8}, (_, i) => item(`lamp-${i}`, 'lamp', 1.5, 1.5)), garden: [], gallery: []}};
  assert.ok(addFurniture(full, 'lamp').error);assert.equal(addFurniture(full, 'lamp').world.layout.room.length, 8);
});

test('path planning uses a direct route on a clear floor and rejects invalid endpoints', () => {
  assert.deepEqual(planPath([0, 0], [1, 1]), [[0, 0], [1, 1]]);
  assert.deepEqual(planPath([0, 0], [0, 0]), [[0, 0]]);
  for (const [start, target] of [[[NaN, 0], [1, 1]], [[0, 0], [Infinity, 1]], [[0, 0], [WORLD_FLOOR_BOUNDS + 0.01, 1]], [['0', 0], [1, 1]]]) {
    assert.equal(planPath(start, target), null);
  }
  assert.equal(planPath([0, 0], [1, 1], [{x: 0, z: 0, radius: '1'}]), null);
});

test('paths detour around circular and rotated rectangular obstacles and every segment clears body radius', () => {
  const circular = [{x: 0, z: 0, radius: 0.6}];
  const circlePath = planPath([-2, 0], [2, 0], circular);
  assert.ok(circlePath.length > 2);assert.deepEqual(circlePath[0], [-2, 0]);assert.deepEqual(circlePath.at(-1), [2, 0]);
  validPath(circlePath, circular);assert.deepEqual(planPath([-2, 0], [2, 0], circular), circlePath);
  const rectangles = [{x: 0, z: 0, width: 1.5, depth: 0.7, rotation: Math.PI / 4}];
  validPath(planPath([-2, 0], [2, 0], rectangles), rectangles);
  assert.equal(isPathClear([-2, 0], [2, 0], rectangles), false);
  assert.equal(isWalkable([0, 0], rectangles), false);
});

test('an unbroken wall makes the destination unreachable and narrow gaps obey character radius', () => {
  const wall = [{x: 0, z: 0, width: 0.5, depth: 6, rotation: 0}];
  assert.equal(planPath([-2, 0], [2, 0], wall), null);
  const gap = [{x: 0, z: -1.7, width: 0.5, depth: 2.5, rotation: 0}, {x: 0, z: 1.7, width: 0.5, depth: 2.5, rotation: 0}];
  assert.equal(planPath([-2, 0], [2, 0], gap, {radius: 0.55}), null);
  validPath(planPath([-2, 0], [2, 0], gap, {radius: 0.3}), gap, {radius: 0.3});
});

test('segment collision detects thin obstacles between endpoints without relying on sampling', () => {
  const thin = [{x: 0.0123, z: 0, width: 0.001, depth: 2, rotation: 0}];
  assert.equal(isPathClear([-1, 0], [1, 0], thin, {radius: 0}), false);
  assert.equal(isPathClear([-1, 1.2], [1, 1.2], thin, {radius: 0.1}), true);
  assert.equal(isPathClear([-1, 1.05], [1, 1.05], thin, {radius: 0.1}), false);
});

test('furniture suffixes advance past existing IDs after a lower-numbered item is deleted', () => {
  const world = {...defaultWorld(), layout: {room: [item('sofa-1', 'sofa', 0, -1.8)],
    garden: [item('sofa-2', 'sofa', 0, -1.8)], gallery: []}};
  const deleted = removeFurniture(world, 'sofa-1'), next = addFurniture(deleted, 'sofa');
  assert.equal(next.item.id, 'sofa-3');assert.equal(next.error, null);
  const huge = {...defaultWorld(), layout: {room: [], garden: [item('sofa-9007199254740991', 'sofa', 0, -1.8),
    item('sofa-9007199254740992', 'sofa', 0, 1.8)], gallery: []}};
  assert.equal(addFurniture(huge, 'sofa').item.id, 'sofa-1');
});

test('optional disk floor rejects rectangular corners and keeps detours within the round garden', () => {
  const options = {diskRadius: 2.5}, obstacles = [{x: 0, z: 0, radius: 0.6}];
  assert.equal(isWalkable([2, 2], [], options), false);
  assert.equal(planPath([0, 0], [2, 2], [], options), null);
  assert.equal(isPathClear([0, 0], [2, 2], [], options), false);
  assert.equal(isWalkable([2.5, 0], [], options), true);
  const path = planPath([-2, 0], [2, 0], obstacles, options);
  validPath(path, obstacles, options);
  for (const point of path) assert.ok(Math.hypot(...point) <= 2.5 + 1e-9);
  for (const diskRadius of [0, -1, NaN, Infinity, '2.5', null]) assert.equal(planPath([0, 0], [1, 0], [], {diskRadius}), null);
});

test('sofa approach follows local front with yaw and a readable sofa remains reachable', () => {
  const sofa = item('sofa-1', 'sofa', 0, -1.8), world = {...defaultWorld(), layout: {room: [sofa], garden: [], gallery: []}};
  assert.deepEqual(sofaApproach(sofa), [0, -0.6500000000000001]);
  const rotated = sofaApproach({...sofa, x: 1, z: 2, rotation: Math.PI / 2});
  assert.ok(Math.abs(rotated[0] - 2.15) < 1e-10);assert.ok(Math.abs(rotated[1] - 2) < 1e-10);
  assert.deepEqual(sofaApproach(sofa, 1.5), [0, -0.30000000000000004]);
  assert.equal(sofaApproach({...sofa, rotation: Infinity}), null);
  assert.equal(validateSeatAccess(world), null);
  assert.equal(validateSeatAccess(world, [], {diskRadius: 2.5}), null);
  assert.equal(validateSeatAccess(defaultWorld()), null);
});

test('sofas facing an outer wall or a round floor edge cannot be accepted as reachable seats', () => {
  const towardsBackWall = {...defaultWorld(), layout: {room: [item('sofa-1', 'sofa', 0, -1.8, {rotation: Math.PI})], garden: [], gallery: []}};
  assert.match(validateSeatAccess(towardsBackWall), /沙发前方/);
  const towardsFrontWall = {...defaultWorld(), layout: {room: [item('sofa-1', 'sofa', 0, 1.8)], garden: [], gallery: []}};
  assert.match(validateSeatAccess(towardsFrontWall), /沙发前方/);
  const garden = {...defaultWorld(), scene: 'garden', layout: {room: [], garden: [item('sofa-1', 'sofa', 1.2, 0.5, {rotation: Math.PI / 3})], gallery: []}};
  assert.equal(validateSeatAccess(garden), null);
  assert.match(validateSeatAccess(garden, [], {diskRadius: 2.1}), /沙发前方/);
});

test('a new table can block an existing sofa front and extra obstacles can cut its otherwise clear route', () => {
  const sofa = item('sofa-1', 'sofa', 0, -1.8), base = {...defaultWorld(), layout: {room: [sofa], garden: [], gallery: []}};
  assert.equal(validateSeatAccess(base), null);
  const blocked = {...base, layout: {...base.layout, room: [sofa, item('table-1', 'table', 0, -0.65)]}};
  assert.match(validateSeatAccess(blocked), /沙发前方/);
  const sideSeat = {...base, layout: {...base.layout, room: [{...sofa, x: 1.3}]}};
  assert.equal(validateSeatAccess(sideSeat), null);
  const separatingWall = [{x: 0.65, z: 0, width: 0.1, depth: 6, rotation: 0}];
  assert.match(validateSeatAccess(sideSeat, separatingWall), /通往沙发/);
});
