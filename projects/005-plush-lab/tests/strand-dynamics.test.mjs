import test from 'node:test';
import assert from 'node:assert/strict';
import {createStrand, stepStrand, resetStrand, STRAND_FIXED_STEP, makeGroomRestShape, setGroomRestShape} from '../src/strand-dynamics.js';

function assertLengths(strand, epsilon = 2e-12) {
  const {positions, segmentLength, segments} = strand;
  assert.deepEqual([...positions.slice(0, 3)], [...strand.root]);
  let arc = 0;
  for (let i = 1; i <= segments; i++) {
    const k = i * 3;
    const length = Math.hypot(positions[k] - positions[k - 3], positions[k + 1] - positions[k - 2], positions[k + 2] - positions[k - 1]);
    assert.ok(Math.abs(length - segmentLength) < epsilon, `segment ${i}: ${length} ≠ ${segmentLength}`);
    arc += length;
  }
  assert.ok(Math.abs(arc - strand.length) < epsilon * segments);
}

function restError(strand) {
  return Math.hypot(...strand.positions.map((value, i) => value - strand.root[i % 3] - strand.restShape[i]));
}

test('DFTL fixes the root and preserves every segment through moving attachments and wind', () => {
  const strand = createStrand([.25, -.4, .3], [.3, .7, .1], .28);
  for (let i = 0; i < 600; i++) {
    stepStrand(strand, {root: [.25 + Math.sin(i / 30) * .04, -.4, .3], wind: [2, -.6, .3], gravity: 4});
    assertLengths(strand);
    assert.deepEqual([...strand.velocities.slice(0, 3)], [0, 0, 0]);
  }
});

test('an unloaded rest strand remains still without time-dependent noise', () => {
  const strand = createStrand([0, 0, 0], [1, 0, 0], .3);
  const original = strand.positions.slice();
  for (let i = 0; i < 1200; i++) stepStrand(strand, {stiffness: 0, damping: 0});
  for (let i = 0; i < original.length; i++) assert.ok(Math.abs(strand.positions[i] - original[i]) < 1e-12);
  assert.ok(Math.hypot(...strand.velocities) < 1e-12);
});

test('gravity bends a horizontal free strand downward without stretching it', () => {
  const strand = createStrand([0, 0, 0], [1, 0, 0], .3);
  for (let i = 0; i < 180; i++) stepStrand(strand, {gravity: [0, -9.81, 0], stiffness: 0, damping: 2});
  const tip = strand.positions.length - 3;
  assert.ok(strand.positions[tip + 1] < -.25);
  assert.ok(Math.abs(strand.positions[tip]) < .12);
  assertLengths(strand);
});

test('strong changing forces stay finite, length-bounded and speed-limited', () => {
  const strand = createStrand([.1, .2, -.3], [0, 1, 0], .28);
  const maxSpeed = 20;
  for (let i = 0; i < 2000; i++) {
    stepStrand(strand, {force: [Math.sin(i) * 1e6, Math.cos(i * .7) * 1e6, Math.cos(i) * 1e6], maxSpeed});
    assert.ok(strand.positions.every(Number.isFinite));
    assert.ok(strand.velocities.every(Number.isFinite));
    assertLengths(strand);
    for (let point = 1; point <= strand.segments; point++) {
      const k = point * 3;
      assert.ok(Math.hypot(...strand.velocities.slice(k, k + 3)) <= maxSpeed + 1e-10);
      const radius = Math.hypot(...strand.positions.slice(k, k + 3).map((value, axis) => value - strand.root[axis]));
      assert.ok(radius <= strand.length + 1e-12);
    }
  }
});

test('rest attraction and damping recover after a sustained touch force is released', () => {
  const strand = createStrand([0, 0, 0], [0, 1, 0], .28);
  for (let i = 0; i < 80; i++) stepStrand(strand, {force: [18, 0, 0], stiffness: 90, damping: 12});
  const disturbed = restError(strand);
  assert.ok(disturbed > .05);
  for (let i = 0; i < 1200; i++) stepStrand(strand, {stiffness: 90, damping: 12});
  assert.ok(restError(strand) < disturbed * .001);
  assert.ok(Math.hypot(...strand.velocities) < 1e-5);
  assertLengths(strand);
});

test('the next-point projection contributes the DFTL equation (9) velocity correction', () => {
  const strand = createStrand([0, 0, 0], [1, 0, 0], .2, 2);
  // Only the tip receives a lateral impulse. Its projection correction must affect
  // the preceding point's velocity, even though that point did not move this step.
  const accelerations = new Float64Array(strand.positions.length);
  accelerations[7] = 100;
  const parentBefore = strand.positions[3];
  stepStrand(strand, {forces: accelerations, stiffness: 0, damping: 0});
  assert.equal(strand.positions[3], parentBefore);
  assert.ok(strand.velocities[3] > 0);
  const tipPredictionY = 100 * STRAND_FIXED_STEP ** 2;
  const tipCorrectionY = strand.positions[7] - tipPredictionY;
  assert.ok(Math.abs(strand.velocities[4] + tipCorrectionY / STRAND_FIXED_STEP) < 1e-12);
});

test('reset restores a groomed rest shape at a new root and clears all motion', () => {
  const strand = createStrand([0, 0, 0], [0, 1, 0], .24, 4);
  const rest = new Float64Array(strand.restShape.length);
  for (let i = 1; i <= 4; i++) {
    rest[i * 3] = i * .035;
    rest[i * 3 + 1] = i * .04;
  }
  stepStrand(strand, {restShape: rest, wind: [8, 0, 0]});
  for (let i = 0; i < 20; i++) stepStrand(strand, {wind: [8, 0, 0]});
  resetStrand(strand, {root: [1, 2, 3]});
  assert.ok(restError(strand) < 1e-12);
  assert.equal(Math.hypot(...strand.velocities), 0);
  assertLengths(strand);
  resetStrand(strand, {normal: [0, 0, 1]});
  assert.deepEqual([...strand.positions.slice(-3)], [1, 2, 3.24]);
});

test('invalid construction and rest layouts produce clear errors', () => {
  assert.throws(() => createStrand([0, 0, 0], [0, 0, 0], .2), /direction/);
  assert.throws(() => createStrand([0, 0, 0], [0, 1, 0], 0), /positive/);
  assert.throws(() => createStrand([0, 0, 0], [0, 1, 0], .2, 1.5), /integer/);
  const strand = createStrand([0, 0, 0], [0, 1, 0], .2);
  assert.throws(() => stepStrand(strand, {restShape: [0, 0, 0]}), /layout/);
});

test('groom rest shapes bend progressively while keeping every segment length exact', () => {
  const strand = createStrand([.2, -.1, .3], [0, 1, 0], .28);
  const offsets = makeGroomRestShape([0, 1, 0], [2.4, 7, -.8], .28);
  // A normal-direction brush component is removed rather than stretching hair.
  const tangentOnly = makeGroomRestShape([0, 1, 0], [2.4, 0, -.8], .28);
  assert.deepEqual(offsets, tangentOnly);
  assert.ok(offsets[offsets.length - 3] > .12);
  assert.ok(offsets[4] > 0);
  resetStrand(strand, {restShape: offsets});
  assertLengths(strand);
});

test('a changed groom becomes the physical equilibrium without resetting current motion', () => {
  const strand = createStrand([0, 0, 0], [0, 1, 0], .28);
  stepStrand(strand, {wind: [8, 0, 0]});
  const positionBefore = strand.positions.slice(), velocityBefore = strand.velocities.slice();
  setGroomRestShape(strand, [2, 0, 0]);
  assert.deepEqual(strand.positions, positionBefore);
  assert.deepEqual(strand.velocities, velocityBefore);
  for (let i = 0; i < 1200; i++) stepStrand(strand, {stiffness: 100, damping: 12});
  assert.ok(restError(strand) < 1e-6);
  assert.ok(strand.positions[strand.positions.length - 3] > .1);
  assertLengths(strand);
});
