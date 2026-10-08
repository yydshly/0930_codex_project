import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

// Use the same installed Three.js as the build, including the workspace's
// shared tooling checkout when this subproject has no private node_modules.
let threeUrl;
for (const path of ['../tooling/node_modules/three/build/three.module.js', '../../004-rhythm-drop/tooling/node_modules/three/build/three.module.js']) {
  const candidate = new URL(path, import.meta.url);
  try { await access(candidate); threeUrl = candidate.href; break; } catch { /* next installed runtime */ }
}
if (!threeUrl) throw new Error('Furniture checks require the installed Three.js build dependency.');
const THREE = await import(threeUrl);
const load = async path => {
  const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replace("from 'three'", `from '${threeUrl}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
};
const { buildFurniture } = await load('../src/world-furniture.js');
const { disposeObject } = await load('../src/world-wardrobe.js');
const item = (type, extra = {}) => ({ id: `my-${type}`, type, x: 0, z: 0, rotation: 0, ...extra });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} differs from ${expected}`);

test('all five furniture types expose matching interaction IDs and stable collision footprints', () => {
  const rows = ['sofa', 'table', 'lamp', 'plant', 'cushion'].map(type => item(type));
  const before = structuredClone(rows), result = buildFurniture(rows);
  assert.equal(result.group.children.length, 5);
  assert.equal(result.interactables.length, 5);
  assert.deepEqual(result.obstacles.map(row => row.radius), [1.2, .55, .28, .32, .4]);
  assert.deepEqual(result.interactables.map(row => row.action), ['sit', 'inspect', 'inspect', 'inspect', 'inspect']);
  assert.equal(result.seats.length, 1);
  result.group.children.forEach((object, index) => {
    assert.equal(result.interactables[index].object, object);
    assert.equal(result.interactables[index].itemId, rows[index].id);
    assert.equal(result.interactables[index].id, `furniture-${rows[index].id}`);
    object.traverse(part => assert.equal(part.userData.placedItemId, rows[index].id));
  });
  assert.deepEqual(rows, before);
  disposeObject(result.group);
});

test('the sofa seat and front approach rotate together in world coordinates at any floor height', () => {
  for (const rotation of [0, Math.PI / 2, Math.PI, -.73]) {
    const { group, seats } = buildFurniture([item('sofa', { x: 1.2, z: -1.3, rotation })], { floorY: -2 });
    const seat = seats[0];
    assert.equal(seat.id, 'my-sofa'); assert.equal(seat.yaw, rotation);
    close(seat.position[0], 1.2 + Math.sin(rotation) * .08);
    close(seat.position[1], -1.45);
    close(seat.position[2], -1.3 + Math.cos(rotation) * .08);
    close(seat.approach[0], 1.2 + Math.sin(rotation) * .95);
    close(seat.approach[1], -1.3 + Math.cos(rotation) * .95);
    close(Math.hypot(seat.approach[0] - 1.2, seat.approach[1] + 1.3), .95);
    disposeObject(group);
  }
});

test('furniture geometry and normals remain finite, fit the catalog footprint, and rest above the floor', () => {
  const sizes = { sofa: [2.2, 1], table: [1.1, 1.1], lamp: [.56, .56], plant: [.64, .64], cushion: [.8, .8] };
  for (const type of Object.keys(sizes)) {
    const { group } = buildFurniture([item(type)], { floorY: -1.1 });
    const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.x <= sizes[type][0] + .015, `${type} width ${size.x}`);
    assert.ok(size.z <= sizes[type][1] + .015, `${type} depth ${size.z}`);
    assert.ok(bounds.min.y >= -1.101, `${type} clips the floor`);
    group.traverse(object => {
      if (!object.isMesh) return;
      for (const attribute of ['position', 'normal']) assert.ok([...object.geometry.attributes[attribute].array].every(Number.isFinite));
    });
    disposeObject(group);
  }
});

test('recursive world raycasting reaches a rotated sofa and retains its placed-item identity', () => {
  const rotation = .73, x = 1.1, z = -.8, floorY = -1.1;
  const { group, interactables } = buildFurniture([item('sofa', { x, z, rotation })], { floorY });
  const front = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
  const origin = new THREE.Vector3(x, floorY + .6, z).addScaledVector(front, 3);
  const hits = new THREE.Raycaster(origin, front.clone().negate()).intersectObjects(interactables.map(row => row.object), true);
  assert.ok(hits.length > 0);
  assert.equal(hits[0].object.userData.placedItemId, 'my-sofa');
  disposeObject(group);
});

test('shared materials and every geometry dispose once and invalid or duplicate entries add no orphan groups', () => {
  const rows = [item('sofa'), item('sofa'), item('lamp'), { id: 'unknown', type: 'book' }, null, item('plant', { color: '<bad>', x: NaN, z: Infinity })];
  const { group, obstacles } = buildFurniture(rows, { floorY: Infinity });
  assert.equal(group.children.length, 3); assert.equal(obstacles.length, 3);
  assert.deepEqual(obstacles.at(-1), { id: 'my-plant', x: 0, z: 0, radius: .32 });
  const resources = new Set(), disposals = new Map();
  group.traverse(object => { if (object.isMesh) { resources.add(object.geometry); resources.add(object.material); } });
  for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, (disposals.get(resource) || 0) + 1));
  disposeObject(group);
  assert.equal(disposals.size, resources.size);
  for (const count of disposals.values()) assert.equal(count, 1);
  assert.equal(buildFurniture(null).group.children.length, 0);
});
