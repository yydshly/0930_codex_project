import test from 'node:test';
import assert from 'node:assert/strict';
import {createActor, restoreActorPose, stepActor} from '../src/world-actor.js';
import {createFetchGame, startFetchGame, stepFetchGame, cancelFetchGame, isFetchBusy, FETCH_BALL_RADIUS} from '../src/world-fetch.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ~= ${expected}`);
const options = (origin = [0, 0]) => ({origin, target: [1, 1],
  outbound: [origin.slice(), [0, 1], [1, 1]], inbound: [[1, 1], [1, 0], origin.slice()], floorY: -1.1});
const tick = (game, actor, dt = 1 / 60) => {stepActor(actor, dt); stepFetchGame(game, actor, dt);};
const until = (game, actor, phase, maxFrames = 1200) => {
  for (let frame = 0; frame < maxFrames && game.phase !== phase; frame++) tick(game, actor);
  assert.equal(game.phase, phase);
};

test('new games are isolated and ready without a ball', () => {
  const game = createFetchGame();
  assert.deepEqual(game, {phase: 'ready', ball: null, origin: null, target: null, completed: 0, pickBlend: 0, celebrateBlend: 0});
  assert.equal(isFetchBusy(game), false);
  startFetchGame(game, createActor(), options());
  assert.deepEqual(createFetchGame(), {phase: 'ready', ball: null, origin: null, target: null, completed: 0, pickBlend: 0, celebrateBlend: 0});
});

test('throw, bounce, chase, pick, return and response form a complete playable loop', () => {
  const actor = createActor(), game = createFetchGame();
  assert.equal(startFetchGame(game, actor, options()), true);
  assert.equal(game.phase, 'starting'); assert.equal(isFetchBusy(game), true);
  until(game, actor, 'throwing'); const initialHeight = game.ball.y;
  for (let frame = 0; frame < 20; frame++) tick(game, actor);
  assert.ok(game.ball.y > initialHeight); close(actor.x, 0); close(actor.z, 0);
  until(game, actor, 'chasing'); close(game.ball.x, 1); close(game.ball.z, 1);
  close(game.ball.y, -1.1 + FETCH_BALL_RADIUS);
  until(game, actor, 'picking'); close(actor.x, 1); close(actor.z, 1);
  for (let frame = 0; frame < 10; frame++) tick(game, actor);
  assert.ok(game.pickBlend > .8);
  until(game, actor, 'returning'); close(game.ball.y, -1.1 + .64);
  tick(game, actor); close(Math.hypot(game.ball.x - actor.x, game.ball.z - actor.z), .72);
  until(game, actor, 'celebrating'); close(actor.x, 0); close(actor.z, 0);
  for (let frame = 0; frame < 20; frame++) tick(game, actor);
  assert.ok(game.celebrateBlend > .8);
  until(game, actor, 'ready'); assert.equal(game.completed, 1); assert.equal(isFetchBusy(game), false);
  close(game.ball.y, -1.1 + FETCH_BALL_RADIUS); assert.equal(game.pickBlend, 0); assert.equal(game.celebrateBlend, 0);
  assert.equal(startFetchGame(game, actor, options()), true);
  until(game, actor, 'ready'); assert.equal(game.completed, 2);
});

test('a seated player stands at the seat approach before the ball launches', () => {
  const actor = createActor(), game = createFetchGame();
  const seat = {id: 'sofa', position: [0, -.55, -1.8], approach: [0, -.65], elevation: .55, yaw: 0};
  restoreActorPose(actor, {x: 0, z: -1.8, seatId: 'sofa'}, [seat]);
  assert.equal(startFetchGame(game, actor, options([0, -.65])), true);
  assert.equal(actor.status, 'standing'); assert.equal(game.phase, 'starting'); close(actor.elevation, .55);
  for (let frame = 0; frame < 20; frame++) tick(game, actor);
  assert.equal(game.phase, 'starting'); assert.ok(actor.elevation > 0);
  close(game.ball.y, -1.1 + actor.elevation + .64);
  until(game, actor, 'throwing'); close(actor.z, -.65); close(actor.elevation, 0); assert.equal(actor.status, 'idle');
  until(game, actor, 'ready'); close(actor.z, -.65); assert.equal(game.completed, 1); assert.equal(actor.seatId, null);
});

test('invalid input and path endpoints cannot change game or actor', () => {
  const actor = createActor(), game = createFetchGame(), beforeGame = structuredClone(game), beforeActor = structuredClone(actor);
  const valid = options();
  const invalid = [null, {}, {...valid, floorY: NaN}, {...valid, floorY: Infinity}, {...valid, origin: [NaN, 0]},
    {...valid, target: [1, Infinity]}, {...valid, target: [0, 0]}, {...valid, outbound: []},
    {...valid, outbound: [[0, 0], [NaN, 1], [1, 1]]}, {...valid, outbound: [[0, 0], [1]]},
    {...valid, outbound: Array(257).fill([0, 0])}, {...valid, inbound: null},
    {...valid, outbound: [[.4, 0], [1, 1]]}, {...valid, outbound: [[0, 0], [1, .5]]},
    {...valid, inbound: [[1, .5], [0, 0]]}, {...valid, inbound: [[1, 1], [.5, 0]]}, options([.5, 0])];
  for (const input of invalid) {
    assert.equal(startFetchGame(game, actor, input), false);
    assert.deepEqual(game, beforeGame); assert.deepEqual(actor, beforeActor);
  }
  assert.equal(startFetchGame({}, actor, valid), false);
  assert.equal(startFetchGame(game, {}, valid), false);
  assert.equal(startFetchGame(game, {...actor}, valid), false);
  assert.deepEqual(game, beforeGame); assert.deepEqual(actor, beforeActor);
});

test('reentry is rejected without restarting any active phase', () => {
  const actor = createActor(), game = createFetchGame(); startFetchGame(game, actor, options());
  for (const phase of ['starting', 'throwing', 'bouncing', 'chasing', 'picking', 'returning', 'celebrating']) {
    until(game, actor, phase); const previous = structuredClone(game), previousActor = structuredClone(actor);
    assert.equal(startFetchGame(game, actor, options()), false);
    assert.deepEqual(game, previous); assert.deepEqual(actor, previousActor);
  }
});

test('zero, negative and nonfinite time pause without changing phase or ball', () => {
  const actor = createActor(), game = createFetchGame(); startFetchGame(game, actor, options());
  for (const phase of ['starting', 'throwing', 'bouncing', 'chasing', 'picking', 'returning', 'celebrating']) {
    until(game, actor, phase); const previous = structuredClone(game), previousActor = structuredClone(actor);
    for (const dt of [0, -1, NaN, Infinity, '1']) stepFetchGame(game, actor, dt);
    assert.deepEqual(game, previous); assert.deepEqual(actor, previousActor);
  }
  assert.equal(stepFetchGame({}, actor, .1), null);
});

test('long suspended frames are bounded to the actor step duration', () => {
  const actor = createActor(), game = createFetchGame(); startFetchGame(game, actor, options()); until(game, actor, 'throwing');
  const otherActor = createActor(), other = createFetchGame(); startFetchGame(other, otherActor, options()); until(other, otherActor, 'throwing');
  tick(game, actor, 50); tick(other, otherActor, .1);
  assert.deepEqual(game, other); assert.deepEqual(actor, otherActor);
});

test('cancel clears temporary play and stops a floor route while preserving successes', () => {
  const actor = createActor(), game = createFetchGame(); startFetchGame(game, actor, options()); until(game, actor, 'ready');
  startFetchGame(game, actor, options()); until(game, actor, 'chasing');
  for (let frame = 0; frame < 5; frame++) tick(game, actor);
  const pointBefore = [actor.x, actor.z];
  assert.equal(cancelFetchGame(game), true); assert.equal(game.phase, 'ready'); assert.equal(game.ball, null);
  assert.equal(game.completed, 1); assert.equal(isFetchBusy(game), false);
  for (let frame = 0; frame < 100; frame++) tick(game, actor);
  close(actor.x, pointBefore[0]); close(actor.z, pointBefore[1]); assert.equal(actor.status, 'idle');
  assert.equal(cancelFetchGame(game), true); assert.equal(game.completed, 1); assert.equal(cancelFetchGame({}), false);
});

test('cancelling while standing does not snap a seated actor to the floor', () => {
  const actor = createActor(), game = createFetchGame();
  const seat = {id: 'sofa', position: [0, -.55, -1.8], approach: [0, -.65], elevation: .55, yaw: 0};
  restoreActorPose(actor, {x: 0, z: -1.8, seatId: 'sofa'}, [seat]);
  startFetchGame(game, actor, options([0, -.65])); tick(game, actor);
  const previous = structuredClone(actor); cancelFetchGame(game); assert.deepEqual(actor, previous);
  for (let frame = 0; frame < 100; frame++) tick(game, actor);
  close(actor.z, -.65); close(actor.elevation, 0); assert.equal(game.ball, null); assert.equal(game.completed, 0);
});

test('copied routes and options keep recipe and world data intact', () => {
  const actor = createActor(), game = createFetchGame();
  const world = {name: '保留创作', layout: {room: [{id: 'sofa-1', type: 'sofa', x: 0, z: -1.8}]},
    pose: {x: 0, z: 0, seatId: null}, params: {length: .28}, playOptions: options()};
  const saved = structuredClone(world);
  startFetchGame(game, actor, world.playOptions); until(game, actor, 'ready'); assert.deepEqual(world, saved);
  const input = options(); startFetchGame(game, actor, input);
  input.outbound[1][0] = 999; input.inbound[1][0] = 999; input.target[0] = 999; input.origin[0] = 999; input.floorY = 999;
  until(game, actor, 'ready'); close(actor.x, 0); close(actor.z, 0); close(game.ball.y, -1.1 + FETCH_BALL_RADIUS);
});

test('a different actor cannot step or steal an active game', () => {
  const actor = createActor(), game = createFetchGame(); startFetchGame(game, actor, options());
  const previous = structuredClone(game); stepFetchGame(game, createActor(), .1); assert.deepEqual(game, previous);
  until(game, actor, 'ready'); assert.equal(game.completed, 1);
});
