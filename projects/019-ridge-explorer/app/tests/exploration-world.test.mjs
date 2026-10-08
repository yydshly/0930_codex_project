import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createExplorationWorld } from '../src/scene/exploration-world.js';
import { createTerrain } from '../src/scene/terrain.js';
import { heightAt } from '../src/scene/math.js';
import { createRideState, createCollisionQuery, stepTour, updateDiscoveries } from '../src/scene/exploration-motion.js';
import { START, WORLD_BOUNDS, LANDMARKS, TRAILS, TOUR_ROUTE, distanceToTrail,
  distanceToSegment, samplePolyline, isExplorationClearing } from '../src/scene/exploration-map.js';

test('all landmarks have actual connected trails and a closed tour inside covered terrain', () => {
  assert.equal(LANDMARKS.length, 3);
  assert.deepEqual(new Set(LANDMARKS.map(p => p.id)), new Set(['creek', 'camp', 'lookout']));
  const main = TRAILS[0].points;
  for (const trail of TRAILS.slice(1)) for (const endpoint of [trail.points[0], trail.points.at(-1)]) {
    assert.ok(main.some(p => Math.hypot(p.x - endpoint.x, p.z - endpoint.z) < 1e-8), `${trail.id} has an unconnected junction`);
  }
  assert.deepEqual(TOUR_ROUTE[0], { x: START.x, z: START.z });
  assert.deepEqual(TOUR_ROUTE.at(-1), TOUR_ROUTE[0]);
  const tour = samplePolyline(TOUR_ROUTE, .75);
  for (const landmark of LANDMARKS) assert.ok(tour.some(p => Math.hypot(p.x - landmark.x, p.z - landmark.z) < 1), `${landmark.id} cannot be discovered on the tour`);
  for (const p of tour) {
    assert.ok(p.x > WORLD_BOUNDS.minX && p.x < WORLD_BOUNDS.maxX && p.z > WORLD_BOUNDS.minZ && p.z < WORLD_BOUNDS.maxZ);
    assert.ok(distanceToTrail(p.x, p.z) < 1e-6, `tour shortcuts off actual paths at ${JSON.stringify(p)}`);
    const slope = Math.hypot(heightAt(p.x + .5, p.z) - heightAt(p.x - .5, p.z), heightAt(p.x, p.z + .5) - heightAt(p.x, p.z - .5));
    assert.ok(slope < .55, `tour slope becomes unrideable: ${slope}`);
  }
});

test('trail proximity measures segments, clamps endpoints and clears props around branches', () => {
  assert.equal(distanceToSegment(0, 3, { x: -4, z: 0 }, { x: 4, z: 0 }), 3);
  assert.equal(distanceToSegment(7, 4, { x: -4, z: 0 }, { x: 4, z: 0 }), 5);
  assert.equal(distanceToSegment(4, 3, { x: 0, z: 0 }, { x: 0, z: 0 }), 5);
  for (const trail of TRAILS) for (const p of samplePolyline(trail.points, 2)) assert.ok(distanceToTrail(p.x, p.z) < 1e-7);
  for (const landmark of LANDMARKS) assert.equal(isExplorationClearing(landmark.x, landmark.z, 2), true);
  assert.equal(isExplorationClearing(-160, 30), false);
  assert.ok(distanceToTrail(-160, 30) > 100);
});

test('branch surfaces face upward, use the horse height field and dispose their resources', async () => {
  const scene = new THREE.Scene(), world = createExplorationWorld(scene, { quality: 'low', loadAssets: false });
  await world.ready;
  const paths = world.group.children.filter(object => object.name.startsWith('worn connecting path'));
  assert.equal(paths.length, 2);
  assert.ok(world.group.children.some(object => object.name === 'flowing shallow creek'));
  for (const object of paths) {
    const position = object.geometry.getAttribute('position'), normals = object.geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      assert.ok(Number.isFinite(position.getY(i)));
      assert.ok(Math.abs(position.getY(i) - heightAt(position.getX(i), position.getZ(i)) - .045) < .0001);
      assert.ok(normals.getY(i) > .8, `path normal points downward at ${i}: ${normals.getY(i)}`);
    }
  }
  const actualGeometries = new Set(), actualMaterials = new Set();
  let geometryDisposals = 0, materialDisposals = 0;
  world.group.traverse(object => {
    if (object.geometry && !actualGeometries.has(object.geometry)) {
      actualGeometries.add(object.geometry); object.geometry.addEventListener('dispose', () => geometryDisposals++);
    }
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) if (material && !actualMaterials.has(material)) {
      actualMaterials.add(material); material.addEventListener('dispose', () => materialDisposals++);
    }
  });
  world.update(5, { wind: 2, layers: { terrain: false } }, ['creek']);
  assert.equal(world.group.visible, false);
  world.update(5, { wind: 0, layers: { terrain: true } }, new Set(['camp']));
  assert.equal(world.group.visible, true);
  world.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(geometryDisposals, actualGeometries.size);
  assert.equal(materialDisposals, actualMaterials.size);
});

test('worn clearings keep detailed terrain visible and interpolate its surface at physical scale', () => {
  const scene = new THREE.Scene(), world = createExplorationWorld(scene, { quality: 'low', loadAssets: false });
  const clearings = world.group.children.filter(object => object.name.startsWith('soft worn clearing:'));
  assert.equal(clearings.length, 2);
  const trailMaterial = world.group.children.find(object => object.name.startsWith('worn connecting path:')).material;
  for (const clearing of clearings) {
    assert.notEqual(clearing.material, trailMaterial, 'clearing transparency must not alter the connecting paths');
    assert.equal(clearing.material.transparent, true);
    assert.equal(clearing.material.depthWrite, false);
    assert.ok(clearing.material.bumpScale > 0 && clearing.material.bumpScale < .05);
    assert.equal(clearing.material.map, clearing.material.bumpMap, 'one microtexture supplies soil detail without another asset');
    const position = clearing.geometry.getAttribute('position'), normals = clearing.geometry.getAttribute('normal');
    assert.ok(position.count > 300 && position.count < 500, 'clearings need small terrain cells rather than a coarse fan');
    assert.equal(clearing.geometry.getAttribute('uv').count, position.count);
    const uv = clearing.geometry.getAttribute('patchUV');
    assert.equal(uv.count, position.count);
    assert.equal(uv.getX(0), .5); assert.equal(uv.getY(0), .5);
    for (let i = 0; i < position.count; i++) {
      assert.ok(Math.abs(position.getY(i) - heightAt(position.getX(i), position.getZ(i)) - .046) < .0001);
      assert.ok(normals.getY(i) > .8, 'clearing must face above the hillside');
    }
    const soil = clearing.material.map.image;
    assert.equal(soil.width, 128); assert.equal(soil.height, 128);
    const samples = Array.from({ length: soil.width * soil.height }, (_, i) => soil.data[i * 4]);
    assert.ok(Math.max(...samples) - Math.min(...samples) > 30, 'wet soil must retain fine variation');
  }
  world.dispose();
});

test('thin smoke uses a shared Gaussian mask, fades with age and faces the actual camera', () => {
  const scene = new THREE.Scene(), world = createExplorationWorld(scene, { quality: 'low', loadAssets: false });
  const puffs = world.group.children.filter(object => object.name.startsWith('soft drifting camp smoke:'));
  assert.equal(puffs.length, 5, 'smoke must stay inside its original draw-call budget');
  const mask = puffs[0].material.map, data = mask.image.data;
  assert.equal(mask.image.width, 64); assert.equal(mask.image.height, 64);
  const alpha = (x, y) => data[(y * 64 + x) * 4 + 3];
  assert.equal(alpha(0, 0), 0); assert.equal(alpha(63, 63), 0);
  assert.ok(alpha(31, 31) > alpha(40, 31) && alpha(40, 31) > alpha(50, 31) && alpha(50, 31) > alpha(60, 31),
    'the opacity mask must fade outward instead of showing a hard disk');
  const cameraParent = new THREE.Group(), camera = new THREE.PerspectiveCamera();
  cameraParent.rotation.set(.14, .73, -.11); camera.rotation.set(.23, -.5, .08); cameraParent.add(camera); scene.add(cameraParent);
  world.group.rotation.y = .32; scene.updateMatrixWorld(true);
  const cameraRotation = camera.getWorldQuaternion(new THREE.Quaternion()), puffRotation = new THREE.Quaternion();
  for (const puff of puffs) {
    assert.equal(puff.geometry, puffs[0].geometry); assert.equal(puff.geometry.type, 'PlaneGeometry');
    assert.equal(puff.geometry.index.count, 6); assert.equal(puff.material.map, mask);
    assert.equal(puff.castShadow, false); assert.equal(puff.material.depthWrite, false);
    puff.onBeforeRender(null, scene, camera);
    assert.ok(puff.getWorldQuaternion(puffRotation).angleTo(cameraRotation) < 1e-7, 'a transformed camera must still see the face of every plume');
  }
  world.update(1.23, { wind: 2 });
  const paused = puffs.map(puff => [...puff.position.toArray(), ...puff.scale.toArray(), puff.material.opacity]);
  assert.ok(puffs.every(puff => puff.material.opacity >= 0 && puff.material.opacity <= .052));
  world.update(1.23, { wind: 2 });
  assert.deepEqual(puffs.map(puff => [...puff.position.toArray(), ...puff.scale.toArray(), puff.material.opacity]), paused,
    'a paused world must retain exactly the same smoke');
  world.update(2.1, { wind: 0 });
  assert.notDeepEqual(puffs.map(puff => [...puff.position.toArray(), ...puff.scale.toArray(), puff.material.opacity]), paused);
  let maskDisposals = 0, geometryDisposals = 0;
  mask.addEventListener('dispose', () => maskDisposals++);
  puffs[0].geometry.addEventListener('dispose', () => geometryDisposals++);
  world.dispose();
  assert.equal(maskDisposals, 1); assert.equal(geometryDisposals, 1, 'shared smoke geometry must be owned and disposed exactly once');
});

test('physical obstacles leave the full tour clear for a mounted horse', () => {
  const scene = new THREE.Scene(), terrain = createTerrain(scene, { quality: 'low' });
  const world = createExplorationWorld(scene, { quality: 'low', loadAssets: false });
  const colliders = [...terrain.colliders, ...world.colliders];
  assert.ok(terrain.colliders.some(c => c.kind === 'tree'));
  assert.ok(world.colliders.some(c => c.kind === 'tent'));
  for (const p of samplePolyline(TOUR_ROUTE, .6)) for (const obstacle of colliders) {
    const gap = Math.hypot(p.x - obstacle.x, p.z - obstacle.z) - obstacle.radius;
    assert.ok(gap > .8, `horse intersects ${obstacle.kind} at ${JSON.stringify(p)}, gap=${gap}`);
  }
  terrain.dispose(); world.dispose();
});

test('actual tour motion completes a full connected circuit and discovers all three places', () => {
  const scene = new THREE.Scene(), terrain = createTerrain(scene, { quality: 'low' });
  const world = createExplorationWorld(scene, { quality: 'low', loadAssets: false });
  const environment = { bounds: WORLD_BOUNDS, heightAt,
    queryColliders: createCollisionQuery([...terrain.colliders, ...world.colliders]) };
  const length = TOUR_ROUTE.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - TOUR_ROUTE[i].x, p.z - TOUR_ROUTE[i].z), 0);
  let state = createRideState(START), cursor = 1, discovered = new Set(), previousDistance = 0;
  const steps = Math.ceil(length / 4.2 / .05);
  for (let i = 0; i < steps; i++) {
    ({ state, cursor } = stepTour(state, TOUR_ROUTE, cursor, .05, environment));
    discovered = updateDiscoveries(state, LANDMARKS, discovered);
    assert.equal(state.blocked, false, `tour stops on a slope or prop at step ${i}, ${state.x},${state.z}`);
    assert.ok(state.distance > previousDistance + .2, `tour stalls at step ${i}`);
    previousDistance = state.distance;
  }
  assert.deepEqual(discovered, new Set(LANDMARKS.map(p => p.id)));
  assert.ok(state.distance >= length && state.distance < length + .22);
  assert.ok(Math.hypot(state.x - START.x, state.z - START.z) < .22, 'the tour does not return to its starting point');
  assert.equal(cursor, 1, 'the completed tour must resume continuously along its first segment');
  terrain.dispose(); world.dispose();
});

test('licensed real camp models have physical dimensions matching decks and collision space', async () => {
  const loader = new GLTFLoader();
  const load = async name => {
    const bytes = await readFile(new URL(`../public/assets/exploration/${name}.glb`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  };
  const tent = await load('tent_detailedOpen'); tent.scene.scale.setScalar(4.1);
  const size = new THREE.Box3().setFromObject(tent.scene).getSize(new THREE.Vector3());
  assert.ok(size.x > 3.4 && size.x < 3.9, `tent width ${size.x} does not fit its deck`);
  assert.ok(size.z > 2.4 && size.z < 3.5, `tent depth ${size.z} does not fit its deck`);
  assert.ok(size.y > 2 && size.y < 2.5, `tent height ${size.y} is implausible`);
  const license = await readFile(new URL('../public/assets/exploration/License.txt', import.meta.url), 'utf8');
  assert.match(license, /Kenney/); assert.match(license, /CC0/);
  for (const model of [tent, await load('campfire_stones'), await load('log')]) model.scene.traverse(object => {
    object.geometry?.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).forEach(m => m.dispose());
  });
});
