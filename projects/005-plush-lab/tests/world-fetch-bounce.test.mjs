import test from 'node:test';
import assert from 'node:assert/strict';
import {createActor, stepActor} from '../src/world-actor.js';
import {createFetchGame, startFetchGame, stepFetchGame, cancelFetchGame, isFetchBusy,
  FETCH_BALL_RADIUS} from '../src/world-fetch.js';

const floorY = -1.1;
const floorHeight = floorY + FETCH_BALL_RADIUS;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ~= ${expected}`);
const tick = (game, actor, dt = 1 / 60, speed = 1.3) => {
  stepActor(actor, dt, {speed}); stepFetchGame(game, actor, dt);
};
function launch(target = [2, 0], outbound = [[0, 0], target.slice()]) {
  const actor = createActor(), game = createFetchGame();
  assert.equal(startFetchGame(game, actor, {origin: [0, 0], target, outbound,
    inbound: outbound.slice().reverse(), floorY}), true);
  for (let frame = 0; frame < 120 && game.phase !== 'bouncing'; frame++) tick(game, actor);
  assert.equal(game.phase, 'bouncing');
  return {actor, game};
}
function advance(game, actor, elapsed, speed = 1.3) {
  let remaining = elapsed;
  while (remaining > 1e-9) {
    const dt = Math.min(.01, remaining);
    tick(game, actor, dt, speed); remaining -= dt;
  }
}

test('first impact starts the chase and three visible rebounds decay before a short roll settles', () => {
  const {actor, game} = launch();
  assert.equal(actor.status, 'walking'); close(actor.x, 0); close(game.ball.x, 1.6);
  close(game.ball.y, floorHeight);
  let previousTime = 0, previousX = game.ball.x;
  const samples = [[.25, .42], [.5, 0], [.67, .2], [.84, 0], [.955, .08], [1.07, 0], [1.2, 0], [1.42, 0]];
  for (const [time, height] of samples) {
    advance(game, actor, time - previousTime); previousTime = time;
    close(game.ball.y, floorHeight + height);
    assert.ok(game.ball.x > previousX, 'forward travel remains visible through the roll');
    assert.ok(game.ball.x <= 2); previousX = game.ball.x;
  }
  assert.equal(game.phase, 'chasing'); close(game.ball.x, 2); close(game.ball.z, 0);
  assert.ok(actor.x > 0); assert.ok(game.ball.rotationX > 0); assert.ok(game.ball.rotationZ < 0);
});

test('rebound motion follows only the last route segment, including repeated endpoints', () => {
  const target = [2, 0], previous = [1.8, .2];
  const {actor, game} = launch(target, [[0, 0], [1, 1], previous, target, target.slice()]);
  const initial = [game.ball.x, game.ball.z];
  assert.ok(Math.hypot(initial[0] - target[0], initial[1] - target[1]) <= .4);
  for (let frame = 0; frame < 100 && game.phase === 'bouncing'; frame++) {
    tick(game, actor);
    const along = (game.ball.x - previous[0]) / (target[0] - previous[0]);
    assert.ok(along >= 0 && along <= 1 + 1e-6);
    close(game.ball.z, previous[1] + (target[1] - previous[1]) * along);
    assert.ok(game.ball.y >= floorHeight - 1e-6);
  }
  assert.equal(game.phase, 'chasing'); close(game.ball.x, target[0]); close(game.ball.z, target[1]);
});

test('a character reaching a nearby ball waits for all rebounds before picking it up', () => {
  const {actor, game} = launch([.32, 0]);
  advance(game, actor, .1, 10);
  assert.equal(actor.status, 'idle'); close(actor.x, .32);
  assert.equal(game.phase, 'bouncing'); assert.ok(game.ball.y > floorHeight);
  close(game.pickBlend, 0); assert.equal(game.completed, 0);
  advance(game, actor, 1.32, 10); assert.equal(game.phase, 'chasing');
  tick(game, actor); assert.equal(game.phase, 'picking');
});

test('pausing during a rebound freezes ball position and spin, then resumes from the same point', () => {
  const {actor, game} = launch(); advance(game, actor, .2);
  const before = structuredClone(game), beforeActor = structuredClone(actor);
  for (let frame = 0; frame < 60; frame++) tick(game, actor, 0);
  assert.deepEqual(game, before); assert.deepEqual(actor, beforeActor);
  tick(game, actor);
  assert.ok(game.ball.x > before.ball.x); assert.notEqual(game.ball.rotationZ, before.ball.rotationZ);
});

test('cancel during bouncing clears the ball and stops the simultaneous chase', () => {
  const {actor, game} = launch(); advance(game, actor, .2);
  const position = [actor.x, actor.z]; assert.equal(actor.status, 'walking');
  assert.equal(cancelFetchGame(game), true); assert.equal(game.ball, null); assert.equal(isFetchBusy(game), false);
  for (let frame = 0; frame < 120; frame++) tick(game, actor);
  close(actor.x, position[0]); close(actor.z, position[1]);
  assert.equal(actor.status, 'idle'); assert.equal(game.completed, 0);
});

test('spin stops once the ball settles and remains fixed while picked up and carried home', () => {
  const {actor, game} = launch(); advance(game, actor, 1.42);
  assert.equal(game.phase, 'chasing');
  const rotation = [game.ball.rotationX, game.ball.rotationZ];
  for (let frame = 0; frame < 600 && isFetchBusy(game); frame++) {
    tick(game, actor);
    close(game.ball.rotationX, rotation[0]); close(game.ball.rotationZ, rotation[1]);
  }
  assert.equal(game.phase, 'ready'); assert.equal(game.completed, 1);
  const ball = structuredClone(game.ball); advance(game, actor, 1);
  assert.deepEqual(game.ball, ball);
});

test('bounce position and spin remain bounded across suspended frames', () => {
  const first = launch(), second = launch();
  tick(first.game, first.actor, 20); tick(second.game, second.actor, .1);
  assert.deepEqual(first.game, second.game); assert.deepEqual(first.actor, second.actor);
});
