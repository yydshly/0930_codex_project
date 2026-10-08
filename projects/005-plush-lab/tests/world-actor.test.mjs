import test from 'node:test';
import assert from 'node:assert/strict';
import {createActor, walkActor, standActor, stepActor, restoreActorPose, resetActor} from '../src/world-actor.js';

const seat = () => ({id: 'sofa-1', position: [2, -.55, -1], elevation: .55, approach: [2, .2], yaw: 0});
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ~= ${expected}`);
const simulate = (actor, seconds, rate = 60, options) => {
  for (let frame = 0; frame < Math.round(seconds * rate); frame++) stepActor(actor, 1 / rate, options);
  return actor;
};

test('actor creation has a finite public floor pose with isolated state', () => {
  const actor = createActor({x: 1, z: -2, yaw: Math.PI * 3});
  assert.deepEqual(Object.keys(actor), ['x', 'z', 'elevation', 'yaw', 'gait', 'sitBlend', 'status', 'seatId']);
  assert.equal(actor.x, 1); assert.equal(actor.z, -2); close(Math.abs(actor.yaw), Math.PI);
  assert.equal(actor.status, 'idle'); assert.equal(actor.seatId, null);
  const fallback = createActor({x: Infinity, z: NaN, yaw: NaN, y: -3});
  assert.ok(Object.values(fallback).filter(value => typeof value === 'number').every(Number.isFinite));
  assert.equal(fallback.elevation, 0);
  walkActor(actor, [[4, 0]]); simulate(actor, 1);
  assert.deepEqual(fallback, createActor());
});

test('route follows corners and does not cut through the obstacle between them', () => {
  const actor = createActor();
  assert.equal(walkActor(actor, [[0, 1], [1, 1], [1, 2]]), true);
  stepActor(actor, .1, {speed: 1}); close(actor.x, 0); close(actor.z, .1);
  simulate(actor, 1.4, 60, {speed: 1}); close(actor.z, 1); close(actor.x, .5);
  simulate(actor, 2, 60, {speed: 1}); close(actor.x, 1); close(actor.z, 2);
  assert.equal(actor.status, 'idle'); assert.equal(actor.gait, 0);
});

test('30, 60 and 120 Hz share walking position, turn and gait at equal time', () => {
  const samples = [30, 60, 120].map(rate => {
    const actor = createActor({yaw: -1});
    walkActor(actor, [[0, 1], [2, 1], [2, -2]]);
    return simulate(actor, 1.6, rate);
  });
  for (const value of samples.slice(1)) {
    for (const key of ['x', 'z', 'yaw', 'gait']) close(value[key], samples[0][key]);
    assert.equal(value.status, 'walking');
  }
});

test('seat entry finishes at the same exact pose across frame rates', () => {
  const samples = [30, 60, 120].map(rate => {
    const actor = createActor(); walkActor(actor, [[0, .2], [2, .2]], {seat: seat()});
    return simulate(actor, 4, rate);
  });
  for (const actor of samples) {
    assert.equal(actor.status, 'seated'); assert.equal(actor.seatId, 'sofa-1');
    close(actor.x, 2); close(actor.z, -1); close(actor.elevation, .55); close(actor.yaw, 0);
    assert.equal(actor.sitBlend, 1); assert.equal(actor.gait, 0);
  }
});

test('sit and stand move continuously between the approach and raised seat', () => {
  const actor = createActor({x: 2, z: .2});
  walkActor(actor, [[2, .2]], {seat: seat()});
  simulate(actor, .3);
  assert.equal(actor.status, 'sitting'); assert.ok(actor.elevation > 0 && actor.elevation < .55);
  assert.ok(actor.z < .2 && actor.z > -1); assert.ok(actor.sitBlend > 0 && actor.sitBlend < 1);
  simulate(actor, .4); assert.equal(actor.status, 'seated');
  assert.equal(standActor(actor), true);
  const before = structuredClone(actor);
  stepActor(actor, 1 / 60);
  assert.equal(actor.status, 'standing'); assert.ok(actor.elevation < before.elevation && actor.elevation > .5);
  assert.ok(actor.z > before.z && actor.z < -.9);
  simulate(actor, .7); assert.equal(actor.status, 'idle'); close(actor.x, 2); close(actor.z, .2);
  assert.equal(actor.elevation, 0); assert.equal(actor.sitBlend, 0); assert.equal(actor.seatId, null);
});

test('a new destination from a seat stands first then walks without snapping to the floor', () => {
  const actor = createActor(); restoreActorPose(actor, {x: 0, z: 0, seatId: 'sofa-1'}, [seat()]);
  assert.equal(walkActor(actor, [[2, .2], [-1, .2]]), true);
  assert.equal(actor.status, 'standing'); close(actor.elevation, .55); close(actor.z, -1);
  simulate(actor, .3); assert.ok(actor.elevation > 0); assert.ok(actor.z < .2);
  simulate(actor, .4); assert.equal(actor.status, 'walking'); assert.equal(actor.elevation, 0);
  simulate(actor, 3); assert.equal(actor.status, 'idle'); close(actor.x, -1); close(actor.z, .2);
});

test('an interrupted sit reverses smoothly and an explicit stand cancels queued walking', () => {
  const actor = createActor({x: 2, z: .2}); walkActor(actor, [[2, .2]], {seat: seat()});
  simulate(actor, .3); const elevation = actor.elevation;
  standActor(actor); close(actor.elevation, elevation); simulate(actor, .7);
  assert.equal(actor.status, 'idle'); close(actor.z, .2);
  restoreActorPose(actor, {x: 2, z: -1, seatId: 'sofa-1'}, [seat()]);
  walkActor(actor, [[4, 0]]); assert.equal(standActor(actor), true);
  simulate(actor, 2); assert.equal(actor.status, 'idle'); close(actor.x, 2); close(actor.z, .2);
});

test('invalid routes and seats leave a moving actor and its active route intact', () => {
  const actor = createActor(); walkActor(actor, [[2, 0]]);
  stepActor(actor, .1); const previous = structuredClone(actor);
  for (const route of [null, [], [[NaN, 0]], [[0]], [[0, 0, 0]], [[Infinity, 0]], Array(257).fill([0, 0])]) {
    assert.equal(walkActor(actor, route), false); assert.deepEqual(actor, previous);
  }
  for (const badSeat of [{}, {...seat(), elevation: -1}, {...seat(), position: [NaN, 0, 0]}, {...seat(), yaw: Infinity}]) {
    assert.equal(walkActor(actor, [[0, 0]], {seat: badSeat}), false); assert.deepEqual(actor, previous);
  }
  simulate(actor, 2); close(actor.x, 2); assert.equal(actor.status, 'idle');
});

test('suspended frames are bounded and invalid time cannot poison the actor', () => {
  const actor = createActor(); walkActor(actor, [[5, 0]]);
  stepActor(actor, 100); close(actor.x, .13);
  const previous = structuredClone(actor);
  for (const dt of [NaN, Infinity, -1, 0, '1']) {stepActor(actor, dt); assert.deepEqual(actor, previous);}
  stepActor(actor, .1, {speed: 0}); assert.deepEqual(actor, previous);
  stepActor(actor, .1, {speed: Infinity}); close(actor.x, .26);
});

test('saved pose restores a valid seat and recovers safely from a removed seat', () => {
  const actor = createActor();
  assert.equal(restoreActorPose(actor, {x: 2, z: -1, seatId: 'sofa-1'}, [seat()]), true);
  assert.equal(actor.status, 'seated'); close(actor.elevation, .55); assert.equal(actor.seatId, 'sofa-1');
  simulate(actor, 1); close(actor.elevation, .55);
  assert.equal(restoreActorPose(actor, {x: 1, z: -2, seatId: 'deleted-seat'}, [seat()]), true);
  assert.equal(actor.status, 'idle'); close(actor.x, 1); close(actor.z, -2); assert.equal(actor.elevation, 0);
  const previous = structuredClone(actor);
  assert.equal(restoreActorPose(actor, {x: NaN, z: 0, seatId: null}), false); assert.deepEqual(actor, previous);
  assert.equal(resetActor(actor, {x: -1, z: 2, yaw: .5}), true);
  close(actor.x, -1); close(actor.z, 2); close(actor.yaw, .5); assert.equal(actor.status, 'idle');
});

test('caller-owned routes and seat definitions cannot alter an active journey', () => {
  const actor = createActor(), route = [[2, .2]], chair = seat();
  walkActor(actor, route, {seat: chair}); route[0][0] = -99; chair.position[0] = 99; chair.elevation = 90;
  simulate(actor, 4); close(actor.x, 2); close(actor.elevation, .55); assert.equal(actor.status, 'seated');
  const result = stepActor(actor, 0); result.x = 900; close(actor.x, 2);
});

test('unrecognized actor handles fail safely', () => {
  assert.equal(walkActor({}, [[0, 0]]), false); assert.equal(standActor({}), false);
  assert.equal(stepActor({}, .1), null); assert.equal(restoreActorPose({}, {x: 0, z: 0}), false);
  assert.equal(resetActor({}, {}), false);
});
