import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { START, LANDMARKS, TOUR_ROUTE, WORLD_BOUNDS } from '../src/scene/exploration-map.js';
import { createTerrain } from '../src/scene/terrain.js';
import { createExplorationWorld } from '../src/scene/exploration-world.js';
import { createRideState, stepTour, createCollisionQuery } from '../src/scene/exploration-motion.js';
import { heightAt } from '../src/scene/math.js';
import { createRideSnapshot, decodeRideSnapshot, createTourStops, advanceTourStops, skipTourStop, TOUR_STOP_SECONDS } from '../src/scene/exploration-session.js';

test('ride save restores position, distance and allowed scenery settings without moving input or sound', () => {
  const snapshot = createRideSnapshot({ ...START, distance: 142 }, 32, { weather: 'sunset', fog: .7, wind: 8, sun: .4, sound: true, photo: true, rideMode: 'tour' });
  const restored = decodeRideSnapshot(JSON.stringify(snapshot));
  assert.deepEqual(restored.position, { x: START.x, z: START.z, yaw: 0 });
  assert.equal(restored.distance, 142); assert.equal(restored.time, 32);
  assert.equal(restored.settings.weather, 'sunset'); assert.equal(restored.settings.wind, 2);
  assert.equal('sound' in restored.settings, false); assert.equal('photo' in restored.settings, false);
});

test('malformed, out-of-world, non-finite and newly obstructed saved positions are rejected', () => {
  const valid = createRideSnapshot({ ...START, distance: 2 }, 3, {});
  for (const raw of ['not-json', '{}', JSON.stringify({ ...valid, position: { ...START, x: 900 } }), JSON.stringify({ ...valid, distance: null }), JSON.stringify({ ...valid, time: -1 })]) assert.equal(decodeRideSnapshot(raw), null);
  assert.equal(decodeRideSnapshot(JSON.stringify(valid), { queryColliders: () => [{ x: START.x, z: START.z, radius: 1 }] }), null);
  assert.equal(decodeRideSnapshot(JSON.stringify(valid), { heightAt: () => Infinity }), null);
});

test('tour stops once at each actual landmark and pause or dialogs freeze the countdown', () => {
  let stops = advanceTourStops(createTourStops(), LANDMARKS[0], .02);
  assert.equal(stops.active, 'creek'); assert.equal(stops.remaining, TOUR_STOP_SECONDS);
  assert.equal(advanceTourStops(stops, LANDMARKS[0], 5, true), stops);
  stops = advanceTourStops(stops, LANDMARKS[0], 3);
  assert.equal(stops.remaining, 9);
  stops = skipTourStop(stops);
  assert.equal(advanceTourStops(stops, LANDMARKS[0], 1).active, null);
  stops = advanceTourStops(stops, LANDMARKS[1], 1);
  assert.equal(stops.active, 'camp');
  stops = advanceTourStops(stops, LANDMARKS[1], 20);
  assert.equal(stops.active, null);
  stops = skipTourStop(advanceTourStops(stops, LANDMARKS[2], .02));
  assert.equal(stops.seen.length, 3);
  stops = advanceTourStops(stops, START, .02);
  assert.deepEqual(stops.seen, []);
});

test('the actual terrain circuit still completes with three timed stops and no teleports', () => {
  const scene = new THREE.Scene(), terrain = createTerrain(scene, { quality: 'low' });
  const world = createExplorationWorld(scene, { quality: 'low', loadAssets: false });
  const environment = { bounds: WORLD_BOUNDS, heightAt, queryColliders: createCollisionQuery([...terrain.colliders, ...world.colliders]) };
  const length = TOUR_ROUTE.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - TOUR_ROUTE[i].x, p.z - TOUR_ROUTE[i].z), 0);
  let state = createRideState(START), cursor = 1, stops = createTourStops();
  const encountered = [], dt = .05;
  for (let i = 0; i < 6000 && state.distance < length; i++) {
    const previous = state, previousStop = stops.active;
    stops = advanceTourStops(stops, state, dt);
    if (stops.active && !previousStop) encountered.push(stops.active);
    if (stops.active) state = { ...state, speed: 0, stepDistance: 0 };
    else ({ state, cursor } = stepTour(state, TOUR_ROUTE, cursor, dt, environment));
    assert.equal(state.blocked, false);
    assert.ok(Math.hypot(state.x - previous.x, state.z - previous.z) <= 4.2 * dt + 1e-7);
  }
  assert.deepEqual(encountered, ['creek', 'camp', 'lookout']);
  assert.ok(state.distance >= length && state.distance < length + .22);
  assert.ok(Math.hypot(state.x - START.x, state.z - START.z) < .22);
  terrain.dispose(); world.dispose();
});
