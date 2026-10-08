import test from 'node:test';
import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {defaultWorld, sanitizeWorld, encodeWorld, decodeWorld} from '../src/world-config.js';
import {addFurniture, layoutForScene, furnitureObstacles, sofaApproach,
  isWalkable, isPathClear, planPath, CHARACTER_RADIUS, WORLD_FLOOR_BOUNDS} from '../src/world-layout.js';
import {createActor, restoreActorPose, stepActor} from '../src/world-actor.js';
import {createFetchGame, startFetchGame, stepFetchGame, isFetchBusy, FETCH_BALL_RADIUS} from '../src/world-fetch.js';

// Use the same installed Three.js dependency and real scene builders as the app.
let threeUrl;
for (const path of ['../tooling/node_modules/three/build/three.module.js', '../../004-rhythm-drop/tooling/node_modules/three/build/three.module.js']) {
  const candidate = new URL(path, import.meta.url);
  try {await access(candidate); threeUrl = candidate.href; break;} catch { /* next installed dependency */ }
}
if (!threeUrl) throw new Error('Fetch integration checks require the installed Three.js build dependency.');
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
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ~= ${expected}`);

function prepare(t, scene, mode) {
  const legacy = {...defaultWorld(`fetch-${scene}-${mode}`), scene, shape: 'heart', material: 'teddy',
    hat: 'beret', outfit: 'scarf', accessory: 'glasses', lighting: 'moon'};
  delete legacy.layout; delete legacy.pose;
  const beforeLegacy = structuredClone(legacy);
  let model = sanitizeWorld(legacy);
  assert.deepEqual(legacy, beforeLegacy, 'reading an old world does not modify the original creation');
  if (mode !== 'legacy') {
    const added = addFurniture(model, 'sofa');
    assert.equal(added.error, null); model = added.world;
    if (mode === 'seated') {
      const sofa = layoutForScene(model)[0];
      model = sanitizeWorld({...model, pose: {x: sofa.x, z: sofa.z + .08, seatId: sofa.id}});
    }
  } else assert.deepEqual(model.layout, {room: [], garden: [], gallery: []});
  const scenery = buildWorldScene(model);
  const furniture = buildFurniture(layoutForScene(model), {floorY: scenery.floorY,
    accentColor: model.accentColor, secondaryColor: model.secondaryColor});
  t.after(() => {disposeObject(furniture.group); disposeObject(scenery.group);});
  const seats = furniture.seats.map(seat => ({...seat, elevation: seat.position[1] - scenery.floorY,
    approach: sofaApproach(layoutForScene(model).find(item => item.id === seat.id))}));
  const fixed = [['low-table', .64], ['plant', .46], ['garden-tree', .37], ['flowerbed', .55],
    ['mushrooms', .42], ['orb-plinth', .4], ['sculpture', .42]].flatMap(([name, radius]) => {
    const object = scenery.group.getObjectByName(name);
    return object ? [{x: object.position.x, z: object.position.z, radius}] : [];
  });
  if (scene === 'room') fixed.push({x: -1.7, z: -1.55, radius: .4}, {x: -2.12, z: -1.75, radius: .4});
  assert.equal(fixed.length, {room: 4, garden: 3, gallery: 2}[scene]);
  return {legacy, beforeLegacy, model, scenery, furniture, seats,
    obstacles: [...fixed, ...furnitureObstacles(model)],
    options: {radius: CHARACTER_RADIUS, bounds: WORLD_FLOOR_BOUNDS, ...(scene === 'garden' ? {diskRadius: 2.5} : {})}};
}

function findReachableThrow(origin, fixture) {
  let fallback = null;
  for (let zi = -6; zi <= 6; zi++) for (let xi = -6; xi <= 6; xi++) {
    const target = [xi * .4, zi * .4];
    if (Math.hypot(target[0] - origin[0], target[1] - origin[1]) < 1 ||
      !isWalkable(target, fixture.obstacles, fixture.options)) continue;
    const outbound = planPath(origin, target, fixture.obstacles, fixture.options);
    const inbound = planPath(target, origin, fixture.obstacles, fixture.options);
    if (!outbound || !inbound) continue;
    const result = {origin: origin.slice(), target, outbound, inbound, floorY: fixture.scenery.floorY};
    // Prefer a route that actually bends around scenery whenever one is reachable.
    if (outbound.length > 2) return result;
    fallback ??= result;
  }
  assert.ok(fallback, `${fixture.model.scene} must have a reachable throwing destination`);
  return fallback;
}

function verifyLoop(actor, game, fixture, request, rate = 60) {
  for (const path of [request.outbound, request.inbound]) {
    for (let index = 1; index < path.length; index++) {
      assert.equal(isPathClear(path[index - 1], path[index], fixture.obstacles, fixture.options), true,
        'each full route segment clears the fixed scenery and placed furniture');
    }
  }
  const phases = new Set([game.phase]), statuses = new Set([actor.status]);
  let checkedWalkingFrames = 0;
  for (let frame = 0; frame < rate * 30 && isFetchBusy(game); frame++) {
    stepActor(actor, 1 / rate);
    if (actor.status === 'walking') {
      checkedWalkingFrames++;
      assert.equal(isWalkable([actor.x, actor.z], fixture.obstacles, fixture.options), true,
        `${fixture.model.scene} actor collided during ${game.phase} at ${actor.x}, ${actor.z}`);
    }
    stepFetchGame(game, actor, 1 / rate);
    fixture.scenery.update(frame / rate, 1 / rate);
    phases.add(game.phase); statuses.add(actor.status);
    assert.ok(Object.values(game.ball ?? {}).every(Number.isFinite), 'ball coordinates remain finite');
    if (game.phase === 'bouncing') {
      assert.equal(isWalkable([game.ball.x, game.ball.z], fixture.obstacles, fixture.options), true,
        'the bouncing ball remains on the final clear route segment');
      assert.ok(game.ball.y >= fixture.scenery.floorY + FETCH_BALL_RADIUS - 1e-6);
    }
    if (game.phase === 'chasing' || game.phase === 'picking') {
      close(game.ball.x, request.target[0]); close(game.ball.z, request.target[1]);
      close(game.ball.y, fixture.scenery.floorY + FETCH_BALL_RADIUS);
    }
  }
  assert.equal(game.phase, 'ready', 'the fetched ball returns within 30 seconds');
  assert.equal(game.completed, 1); assert.equal(isFetchBusy(game), false);
  assert.ok(checkedWalkingFrames > 0); assert.ok(statuses.has('walking'));
  for (const phase of ['starting', 'throwing', 'bouncing', 'chasing', 'picking', 'returning', 'celebrating', 'ready']) {
    assert.ok(phases.has(phase), `observed ${phase}`);
  }
  close(actor.x, request.origin[0]); close(actor.z, request.origin[1]); close(actor.elevation, 0);
  assert.equal(actor.status, 'idle'); assert.equal(actor.seatId, null);
  close(game.ball.y, fixture.scenery.floorY + FETCH_BALL_RADIUS);
  return {phases, statuses};
}

for (const scene of ['room', 'garden', 'gallery']) {
  for (const mode of ['legacy', 'sofa', 'seated']) {
    test(`${scene}: ${mode} world completes fetch without crossing scenery or changing the creation`, t => {
      const fixture = prepare(t, scene, mode), beforeWorld = structuredClone(fixture.model);
      const savedToken = encodeWorld(fixture.model), actor = createActor(), game = createFetchGame();
      assert.equal(restoreActorPose(actor, fixture.model.pose, fixture.seats), true);
      const origin = mode === 'seated' ? fixture.seats[0].approach.slice() : [actor.x, actor.z];
      assert.equal(isWalkable(origin, fixture.obstacles, fixture.options), true);
      const request = findReachableThrow(origin, fixture);
      assert.equal(startFetchGame(game, actor, request), true);
      if (mode === 'seated') {
        assert.equal(actor.status, 'standing'); assert.equal(game.phase, 'starting'); close(actor.elevation, .55);
        for (let frame = 0; frame < 15; frame++) {
          stepActor(actor, 1 / 60); stepFetchGame(game, actor, 1 / 60);
          assert.equal(game.phase, 'starting', 'the ball is held until the character finishes standing');
          close(game.ball.y, fixture.scenery.floorY + actor.elevation + .64);
        }
      }
      const result = verifyLoop(actor, game, fixture, request);
      if (mode === 'seated') assert.ok(result.statuses.has('standing'));
      assert.deepEqual(fixture.model, beforeWorld, 'play leaves appearance, wardrobe, all layouts and saved pose untouched');
      assert.deepEqual(fixture.legacy, fixture.beforeLegacy, 'the original legacy creation remains intact');
      assert.equal(encodeWorld(fixture.model), savedToken, 'play does not add temporary game state to a shared world');
      assert.deepEqual(decodeWorld(savedToken), beforeWorld, 'a saved creation still restores identically after play');
    });
  }
}
