import test from 'node:test';
import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {defaultWorld, sanitizeWorld, encodeWorld, decodeWorld} from '../src/world-config.js';
import {addFurniture, updateFurniture, layoutForScene, furnitureObstacles, sofaApproach,
  isWalkable, planPath, CHARACTER_RADIUS, WORLD_FLOOR_BOUNDS} from '../src/world-layout.js';
import {createActor, walkActor, stepActor, restoreActorPose} from '../src/world-actor.js';

let threeUrl;
for (const path of ['../tooling/node_modules/three/build/three.module.js', '../../004-rhythm-drop/tooling/node_modules/three/build/three.module.js']) {
  const candidate = new URL(path, import.meta.url);
  try {await access(candidate); threeUrl = candidate.href; break;} catch { /* next installed dependency */ }
}
if (!threeUrl) throw new Error('World integration checks require the installed Three.js build dependency.');
const load = async path => {
  const url = new URL(path, import.meta.url);
  const source = (await readFile(url, 'utf8'))
    .replace(/from\s+(['"])three\1/g, `from '${threeUrl}'`)
    .replace(/from\s+(['"])(\.[^'"]+)\1/g, (_, quote, specifier) => `from '${new URL(specifier, url).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
};
const {buildFurniture} = await load('../src/world-furniture.js');
const {buildWorldScene} = await load('../src/world-scene.js');
const {disposeObject} = await load('../src/world-wardrobe.js');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ~= ${expected}`);

function prepare(t, scene = 'room', existing = null) {
  const added = existing ? {world: existing} : addFurniture(sanitizeWorld({...defaultWorld(), scene}), 'sofa');
  assert.equal(added.error ?? null, null);
  const model = added.world, scenery = buildWorldScene(model);
  const furniture = buildFurniture(layoutForScene(model), {floorY: scenery.floorY,
    accentColor: model.accentColor, secondaryColor: model.secondaryColor});
  t.after(() => {disposeObject(furniture.group); disposeObject(scenery.group);});
  // The app adapts the renderer's world-Y seat to the actor's floor-relative pose.
  const seats = furniture.seats.map(seat => ({...seat, elevation: seat.position[1] - scenery.floorY,
    approach: sofaApproach(layoutForScene(model).find(item => item.id === seat.id))}));
  const fixed = [['low-table', .64], ['plant', .46], ['garden-tree', .37], ['flowerbed', .55],
    ['mushrooms', .42], ['orb-plinth', .4], ['sculpture', .42]].flatMap(([name, radius]) => {
    const object = scenery.group.getObjectByName(name);
    return object ? [{x: object.position.x, z: object.position.z, radius}] : [];
  });
  return {model, scenery, furniture, seats, obstacles: [...fixed, ...furnitureObstacles(model)],
    options: {radius: CHARACTER_RADIUS, bounds: WORLD_FLOOR_BOUNDS, ...(scene === 'garden' ? {diskRadius: 2.5} : {})}};
}

function finishJourney(actor, targetStatus, fixture, rate = 60) {
  const observed = new Set([actor.status]);
  for (let frame = 0; frame < rate * 15 && actor.status !== targetStatus; frame++) {
    stepActor(actor, 1 / rate); observed.add(actor.status);
    if (actor.status === 'walking') assert.equal(isWalkable([actor.x, actor.z], fixture.obstacles, fixture.options), true,
      `walking actor collided at ${actor.x}, ${actor.z}`);
  }
  assert.equal(actor.status, targetStatus, 'journey must reach its intended state within 15 seconds');
  return observed;
}

test('a default sofa stays reachable in all three real scenes and supports walking then sitting', t => {
  for (const scene of ['room', 'garden', 'gallery']) {
    const fixture = prepare(t, scene), seat = fixture.seats[0], actor = createActor();
    assert.equal(fixture.furniture.interactables.find(item => item.itemId === seat.id).action, 'sit');
    assert.equal(isWalkable(seat.approach, fixture.obstacles, fixture.options), true);
    const path = planPath([actor.x, actor.z], seat.approach, fixture.obstacles, fixture.options);
    assert.ok(path?.length, `${scene} default sofa must have a route from the carpet`);
    assert.equal(walkActor(actor, path, {seat}), true);
    const states = finishJourney(actor, 'seated', fixture);
    assert.ok(states.has('walking')); assert.ok(states.has('sitting'));
    assert.equal(actor.seatId, seat.id); close(actor.x, seat.position[0]); close(actor.z, seat.position[2]);
    close(actor.elevation, .55); close(fixture.scenery.floorY + actor.elevation, seat.position[1]);
    assert.equal(actor.sitBlend, 1);
  }
});

test('returning from the rendered sofa stands to its clear approach before walking back to the carpet', t => {
  const fixture = prepare(t), seat = fixture.seats[0], actor = createActor();
  restoreActorPose(actor, {x: seat.position[0], z: seat.position[2], seatId: seat.id}, fixture.seats);
  const path = planPath(seat.approach, [0, 0], fixture.obstacles, fixture.options);
  assert.ok(path);
  assert.equal(walkActor(actor, path), true);
  assert.equal(actor.status, 'standing'); close(actor.elevation, .55);
  const states = finishJourney(actor, 'idle', fixture);
  assert.ok(states.has('standing')); assert.ok(states.has('walking'));
  close(actor.x, 0); close(actor.z, 0); assert.equal(actor.elevation, 0);
  assert.equal(actor.sitBlend, 0); assert.equal(actor.seatId, null);
});

test('encoded furniture and seated pose rebuild the same raised seat after a reload and wardrobe edit', t => {
  const fixture = prepare(t), seat = fixture.seats[0], actor = createActor();
  const path = planPath([0, 0], seat.approach, fixture.obstacles, fixture.options);
  walkActor(actor, path, {seat}); finishJourney(actor, 'seated', fixture);
  const saved = sanitizeWorld({...fixture.model, pose: {x: actor.x, z: actor.z, seatId: actor.seatId}});
  const loaded = decodeWorld(encodeWorld(saved));
  assert.deepEqual(loaded.layout, saved.layout); assert.deepEqual(loaded.pose, saved.pose);
  const changed = sanitizeWorld({...loaded, hat: 'beret', outfit: 'vest', accessory: 'satchel'});
  assert.deepEqual(changed.pose, saved.pose); assert.deepEqual(changed.layout, saved.layout);
  const rebuilt = prepare(t, changed.scene, changed), restored = createActor();
  assert.equal(restoreActorPose(restored, changed.pose, rebuilt.seats), true);
  assert.equal(restored.status, 'seated'); assert.equal(restored.seatId, actor.seatId);
  close(restored.x, actor.x); close(restored.z, actor.z); close(restored.elevation, actor.elevation);
  stepActor(restored, 1 / 60); assert.equal(restored.status, 'seated'); close(restored.elevation, .55);
});

test('saved seat identity follows a sofa relocation instead of leaving the character at stale coordinates', t => {
  const fixture = prepare(t), seat = fixture.seats[0];
  const saved = sanitizeWorld({...fixture.model, pose: {x: seat.position[0], z: seat.position[2], seatId: seat.id}});
  const moved = updateFurniture(saved, seat.id, {z: -1.45});
  assert.equal(moved.error, null);
  const loaded = decodeWorld(encodeWorld(moved.world)), rebuilt = prepare(t, loaded.scene, loaded), actor = createActor();
  restoreActorPose(actor, loaded.pose, rebuilt.seats);
  assert.equal(actor.status, 'seated'); assert.equal(actor.seatId, seat.id);
  close(actor.z, -1.45 + .08); assert.notEqual(actor.z, saved.pose.z);
  close(actor.elevation, .55); assert.equal(isWalkable(rebuilt.seats[0].approach, rebuilt.obstacles, rebuilt.options), true);
});
