import test from 'node:test';
import assert from 'node:assert/strict';
import {contactDistance, projectStrandContact} from '../src/strand-contact.js';
import {createStrand, stepStrand} from '../src/strand-dynamics.js';

const lengthBetween = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
function assertLengths(strand) {
  assert.deepEqual([...strand.positions.slice(0, 3)], [...strand.root]);
  for (let i = 1; i <= strand.segments; i++) {
    const distance = lengthBetween([...strand.positions.slice(i * 3, i * 3 + 3)], [...strand.positions.slice(i * 3 - 3, i * 3)]);
    assert.ok(Math.abs(distance - strand.segmentLength) < 1e-12, `segment ${i} stretched to ${distance}`);
  }
}
function assertSegmentOutside(parent, point, collider, tolerance = 3e-8) {
  for (let i = 0; i <= 200; i++) {
    const sample = parent.map((value, axis) => value + (point[axis] - value) * i / 200);
    const distance = contactDistance(collider, sample);
    assert.ok(distance >= -tolerance, `segment penetrated ${collider.type}: ${distance} at ${sample}`);
  }
}

test('proxy distance signs and normals are consistent for planes, spheres, capsules and ellipsoids', () => {
  const normal = new Float64Array(3);
  assert.equal(contactDistance({type: 'plane', point: [0, 0, 0], normal: [0, 2, 0]}, [0, -1, 0], normal), -1);
  assert.deepEqual([...normal], [0, 1, 0]);
  assert.ok(contactDistance({type: 'sphere', center: [0, 0, 0], radius: .2}, [.1, 0, 0], normal) < 0);
  assert.deepEqual([...normal], [1, 0, 0]);
  const capsule = {type: 'capsule', a: [0, -.2, 0], b: [0, .2, 0], radius: .1};
  assert.ok(Math.abs(contactDistance(capsule, [.25, .1, 0], normal) - .15) < 1e-12);
  assert.ok(lengthBetween([...normal], [1, 0, 0]) < 1e-12);
  const ellipsoid = {type: 'ellipsoid', center: [0, 0, 0], radii: [.2, .3, .4]};
  assert.equal(contactDistance(ellipsoid, [.2, 0, 0], normal), 0);
  assert.ok(contactDistance(ellipsoid, [0, .1, 0], normal) < 0);
  assert.ok(contactDistance(ellipsoid, [0, 0, .5], normal) > 0);
});

test('a grazing contact rotates a point onto the half-space without extending its segment', () => {
  const parent = [0, 0, 0], point = [.04, -.03, 0], normalOut = new Float64Array(3), stats = {};
  const floor = {type: 'plane', point: [0, 0, 0], normal: [0, 1, 0]};
  projectStrandContact(parent, point, .05, [floor], {normalOut, stats});
  assert.ok(point[0] > .04999);
  assert.ok(point[1] >= 0);
  assert.ok(Math.abs(lengthBetween(parent, point) - .05) < 1e-12);
  assert.deepEqual([...normalOut], [0, 1, 0]);
  assert.equal(stats.contacts, 1);
  assert.equal(stats.unresolved, 0);
});

test('thin sphere contact is detected inside a segment whose endpoints are both outside', () => {
  const parent = [-.2, 0, 0], point = [.2, 0, 0], length = .4;
  const sphere = {type: 'sphere', center: [0, 0, 0], radius: .05};
  assert.ok(contactDistance(sphere, parent) > 0);
  assert.ok(contactDistance(sphere, point) > 0);
  const stats = {};
  projectStrandContact(parent, point, length, [sphere], {iterations: 8, stats});
  assert.ok(Math.abs(lengthBetween(parent, point) - length) < 1e-12);
  assertSegmentOutside(parent, point, sphere);
  assert.equal(stats.contacts, 1);
  assert.equal(stats.unresolved, 0);
});

test('capsule accessory contact avoids both its shaft and rounded ends without stretching', () => {
  for (const height of [0, .09, .115]) {
    const parent = [-.2, height, 0], point = [.2, height, 0], length = .4;
    const capsule = {type: 'capsule', a: [0, -.1, 0], b: [0, .1, 0], radius: .03};
    const stats = {};
    projectStrandContact(parent, point, length, [capsule], {iterations: 8, stats});
    assert.ok(Math.abs(lengthBetween(parent, point) - length) < 1e-12);
    assertSegmentOutside(parent, point, capsule);
    assert.equal(stats.unresolved, 0);
  }
});

test('ellipsoid body contact keeps the entire guide segment outside its implicit surface', () => {
  const parent = [-.2, 0, 0], point = [.2, 0, 0], length = .4;
  const ellipsoid = {type: 'ellipsoid', center: [0, 0, 0], radii: [.05, .09, .08]}, stats = {};
  projectStrandContact(parent, point, length, [ellipsoid], {iterations: 8, stats});
  assert.ok(Math.abs(lengthBetween(parent, point) - length) < 1e-12);
  assertSegmentOutside(parent, point, ellipsoid);
  assert.equal(stats.unresolved, 0);
});

test('an optional body surface callback uses outward distance while preserving length', () => {
  const parent = [0, 0, 0], point = [.03, -.04, 0];
  const body = {type: 'surface', sample: point => ({distance: point[1], normal: [0, 1, 0]})};
  projectStrandContact(parent, point, .05, [body]);
  assert.ok(point[1] >= 0);
  assert.ok(Math.abs(lengthBetween(parent, point) - .05) < 1e-12);
});

test('infeasible obstacles report remaining contact instead of changing the fixed root or length', () => {
  const parent = [0, 0, 0], point = [.05, 0, 0], originalParent = parent.slice(), stats = {};
  const enclosingObstacle = {type: 'sphere', center: [0, 0, 0], radius: .2};
  projectStrandContact(parent, point, .05, [enclosingObstacle], {stats});
  assert.deepEqual(parent, originalParent);
  assert.ok(Math.abs(lengthBetween(parent, point) - .05) < 1e-12);
  assert.equal(stats.unresolved, 1);
});

test('a loaded chain can slide along a root tangent plane and never gains arc length', () => {
  const strand = createStrand([0, 0, 0], [1, .4, 0], .3);
  const floor = {type: 'plane', point: [0, 0, 0], normal: [0, 1, 0]};
  let contacts = 0;
  for (let i = 0; i < 300; i++) {
    stepStrand(strand, {force: [8, -25, 0], colliders: [floor], stiffness: 0, damping: 5, friction: .03});
    contacts += strand.contactCount;
    assertLengths(strand);
    for (let point = 0; point <= strand.segments; point++) assert.ok(strand.positions[point * 3 + 1] >= -3e-8);
    assert.equal(strand.unresolvedContacts, 0);
  }
  assert.ok(contacts > 0);
  assert.ok(strand.positions[strand.positions.length - 3] > .28);
});

test('contact friction reduces tangential motion while permitting sliding', () => {
  const run = friction => {
    const strand = createStrand([0, 0, 0], [1, 0, 0], .3);
    const floor = {type: 'plane', point: [0, 0, 0], normal: [0, 1, 0]};
    for (let i = 0; i < 24; i++) stepStrand(strand, {force: [0, -20, 12], stiffness: 0, damping: 1, colliders: [floor], friction});
    assertLengths(strand);
    return strand.positions[strand.positions.length - 1];
  };
  const slipping = run(0), dragging = run(.7);
  assert.ok(dragging > 0);
  assert.ok(dragging < slipping, `friction did not slow sliding: ${dragging} >= ${slipping}`);
});

test('large changing contact loads stay finite, pinned, nonpenetrating and exactly inextensible', () => {
  const strand = createStrand([0, 0, 0], [0, 1, 0], .28);
  const floor = {type: 'plane', point: [0, 0, 0], normal: [0, 1, 0]};
  for (let i = 0; i < 600; i++) {
    stepStrand(strand, {colliders: [floor], force: [Math.sin(i) * 1e6, -1e6, Math.cos(i) * 1e6]});
    assertLengths(strand);
    assert.ok(strand.positions.every(Number.isFinite));
    assert.ok(strand.velocities.every(Number.isFinite));
    assert.equal(strand.unresolvedContacts, 0);
    for (let point = 0; point <= strand.segments; point++) assert.ok(strand.positions[point * 3 + 1] >= -3e-8);
  }
});

test('disabled contact options preserve the existing FTL position and velocity path exactly', () => {
  const legacy = createStrand([.1, .2, -.3], [1, .3, .1], .28);
  const disabled = createStrand([.1, .2, -.3], [1, .3, .1], .28);
  for (let i = 0; i < 360; i++) {
    const options = {gravity: 2, force: [Math.sin(i / 40), .2, .1], stiffness: 80, damping: 8};
    stepStrand(legacy, options);
    stepStrand(disabled, {...options, colliders: [], contactMargin: .1, contactIterations: 12, friction: 1});
    assert.deepEqual(disabled.positions, legacy.positions);
    assert.deepEqual(disabled.velocities, legacy.velocities);
  }
});
