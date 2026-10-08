import test from 'node:test';
import assert from 'node:assert/strict';
import { createRideState, stepRide, stepTour, createCollisionQuery, updateDiscoveries, RIDE_SPEED, SPRINT_SPEED, HORSE_RADIUS } from '../src/scene/exploration-motion.js';

test('held forward and steering behave consistently at different frame rates', () => {
  const simulate = fps => {
    let state = createRideState({ x: 0, z: 0 });
    for (let i = 0; i < fps * 6; i++) state = stepRide(state, { forward: true, left: i >= fps * 3 }, 1 / fps);
    return state;
  };
  const a = simulate(30), b = simulate(144);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < .025);
  assert.ok(Math.abs(a.distance - b.distance) < .001);
  assert.equal(a.speed, RIDE_SPEED);
  assert.ok(a.x < -2, 'left steering turns the actual horse toward -X');
});

test('release, brake, pause and blocked dialogs cannot leave a horse moving', () => {
  let state = createRideState({ x: 0, z: 0 });
  state = stepRide(state, { forward: true, sprint: true }, 3);
  assert.equal(state.speed, SPRINT_SPEED);
  const coast = stepRide(state, {}, 2);
  assert.equal(coast.speed, 0);
  const brake = stepRide(state, { backward: true }, 1);
  assert.equal(brake.speed, 0);
  assert.ok(brake.distance < coast.distance);
  const paused = stepRide(state, { forward: true }, 1, { stopped: true });
  assert.equal(paused.speed, 0);
  assert.equal(paused.x, state.x); assert.equal(paused.z, state.z); assert.equal(paused.stepDistance, 0);
  assert.deepEqual(stepRide(paused, {}, 1), paused);
});

test('world edges, steep terrain and solid props prevent clipping while allowing travel beside them', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  let state = stepRide(createRideState({ x: 0, z: 0 }), { forward: true }, 6, { bounds });
  assert.ok(state.z >= -10 + HORSE_RADIUS);
  const slope = stepRide(createRideState({ x: 0, z: 0 }), { forward: true }, 3, { heightAt: (x, z) => -z * 1.2 });
  assert.equal(slope.z, 0); assert.ok(slope.blocked);
  const queryColliders = createCollisionQuery([{ x: 0, z: -3, radius: 1 }]);
  state = stepRide(createRideState({ x: 0, z: 0 }), { forward: true }, 3, { queryColliders });
  assert.ok(Math.hypot(state.x, state.z + 3) >= 1 + HORSE_RADIUS - 1e-8);
  const beside = stepRide(createRideState({ x: 3, z: 0 }), { forward: true }, 3, { queryColliders });
  assert.ok(beside.z < -8, 'a nearby obstacle should not block the whole trail');
  const edgeQuery = createCollisionQuery([{ x: 0, z: -8, radius: 2 }]);
  const edge = stepRide(createRideState({ x: 0, z: -4 }), { forward: true }, 5, { bounds, queryColliders: edgeQuery });
  assert.ok(edge.z >= bounds.minZ + HORSE_RADIUS && edge.z <= bounds.maxZ - HORSE_RADIUS);
  assert.ok(Math.hypot(edge.x, edge.z + 8) >= 2 + HORSE_RADIUS - 1e-7);
  const overlap = stepRide(createRideState({ x: 0, z: -3 }), { forward: true }, .1, { queryColliders });
  assert.ok(Math.hypot(overlap.x, overlap.z + 3) >= 1 + HORSE_RADIUS - 1e-7);
});

test('tour spends a frame distance across junctions without teleporting', () => {
  const route = [{ x: 0, z: 0 }, { x: 0, z: -2 }, { x: 3, z: -2 }, { x: 0, z: 0 }];
  let state = createRideState(route[0]), cursor = 1;
  for (let i = 0; i < 100; i++) {
    const previous = state;
    ({ state, cursor } = stepTour(state, route, cursor, .02));
    assert.ok(state.stepDistance <= RIDE_SPEED * .02 + 1e-8);
    assert.ok(Math.hypot(state.x - previous.x, state.z - previous.z) <= RIDE_SPEED * .02 + 1e-8);
    assert.ok(Number.isFinite(state.yaw));
  }
  assert.ok(state.distance > 8);
  const paused = stepTour(state, route, cursor, 1, { stopped: true });
  assert.equal(paused.state.distance, state.distance);
});

test('discoveries use actual proximity, retain saved visits and ignore distant targets', () => {
  const landmarks = [{ id: 'camp', name: '营地', x: 10, z: 0, radius: 5 }, { id: 'creek', x: 90, z: -10, radius: 6 }];
  assert.deepEqual([...updateDiscoveries({ x: 0, z: 0 }, landmarks, [])], []);
  assert.deepEqual([...updateDiscoveries({ x: 6, z: 0 }, landmarks, ['creek'])], ['creek', 'camp']);
});
