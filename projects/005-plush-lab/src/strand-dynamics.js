/**
 * Small CPU guide-strand solver inspired by Dynamic Follow-The-Leader (DFTL).
 * Source: Müller, Kim & Chentanez, Fast Simulation of Inextensible Hair and Fur,
 * VRIPHYS 2012, sections 3.1–3.3, especially equation (9):
 * https://matthias-research.github.io/pages/publications/FTLHairFur.pdf
 *
 * This is an additive browser approximation, not a reproduction of the full paper.
 * It implements the one-pass length projection and the next-particle velocity
 * correction. Rest-shape attraction, exponential drag and a velocity safety cap
 * are application additions. Optional contacts use sparse convex proxy geometry;
 * this does not implement mesh collision or hair–hair interaction.
 *
 * API:
 * createStrand(root, normal, length, segments = 6)
 *   root / normal: [x,y,z], typed arrays, or objects with x/y/z properties.
 *   length: total arc length, positive, in the caller's coordinate units.
 *   Returned positions / velocities: flat Float64Array, (segments + 1) * 3 values;
 *   point i begins at i * 3. Point zero is pinned to strand.root.
 *   restShape: flat root-relative offsets, including a zero first point.
 *
 * stepStrand(strand, options = {}) advances exactly STRAND_FIXED_STEP seconds.
 *   root: optionally update the attachment while retaining the free-point motion.
 *   restShape: optionally replace the root-relative rest offsets (same layout as
 *     positions). The offsets are projected to the strand's exact segment length.
 *   gravity / wind / force: acceleration vectors in the strand coordinate frame;
 *     gravity may also be a positive scalar, interpreted as downward acceleration.
 *   forces: optional flat per-point accelerations; entry zero is ignored.
 *   stiffness: rest-shape attraction in 1/s², default 80; use 0 for a free chain.
 *   damping: additional velocity drag in 1/s, default 8.
 *   correction: DFTL equation (9) coefficient in [0,1], default 1. Values near 1
 *     remove the static-FTL uneven-mass artifact; this introduces numerical damping.
 *   maxSpeed: numerical guard in units/s, default max(1, length / fixedStep).
 *   All vector forces are accelerations (unit particle mass); they add together.
 *   colliders: optional array of plane/sphere/capsule/ellipsoid/surface proxies
 *     described in strand-contact.js. Omitting them keeps the original FTL path.
 *   contactIterations: bounded contact passes, default 4 (1..12).
 *   contactMargin: positive clearance in scene units, default 0; do not use a
 *     positive body-plane margin if it would place the fixed root inside it.
 *   friction: tangential velocity loss on contact in [0,1], default .15.
 *   contactCount / unresolvedContacts report constrained / infeasible segments.
 *
 * resetStrand(strand, {root, normal, restShape} = {}) restores the current rest
 * shape, pins the root and clears velocities. Supplying normal builds a new
 * straight rest shape, unless an explicit restShape is supplied as well.
 */

import {projectStrandContact} from './strand-contact.js';

export const STRAND_FIXED_STEP = 1 / 120;

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

function vector(value, label) {
  const result = value && typeof value === 'object' && 'x' in value
    ? [value.x, value.y, value.z]
    : value && [value[0], value[1], value[2]];
  if (!result || !result.every(Number.isFinite)) throw new TypeError(`${label} must contain three finite numbers`);
  return result;
}

function unitNormal(value) {
  const normal = vector(value, 'normal');
  const magnitude = Math.hypot(...normal);
  if (magnitude < 1e-12) throw new RangeError('normal must have a direction');
  return normal.map(value => value / magnitude);
}

function straightRest(strand) {
  for (let i = 0; i <= strand.segments; i++) {
    for (let axis = 0; axis < 3; axis++) {
      strand.restShape[i * 3 + axis] = strand.normal[axis] * strand.segmentLength * i;
    }
  }
}

/**
 * Build a groom's exact-length root-relative pose. bend is an already-scaled
 * tangent bend, e.g. localStyle*2.4 + globalFlow*(groom*1.6 + wetness*.9).
 * Neither this helper nor the solver adds curl/noise; those remain renderer details.
 */
export function makeGroomRestShape(normal, bend, length, segments = 6, out) {
  if (!Number.isFinite(length) || length <= 0) throw new RangeError('length must be finite and positive');
  if (!Number.isInteger(segments) || segments < 1 || segments > 64) throw new RangeError('segments must be an integer from 1 to 64');
  const n = unitNormal(normal), groom = vector(bend, 'bend');
  const alongNormal = groom.reduce((sum, value, axis) => sum + value * n[axis], 0);
  for (let axis = 0; axis < 3; axis++) groom[axis] -= n[axis] * alongNormal;
  const result = out || new Float64Array((segments + 1) * 3);
  if (result.length !== (segments + 1) * 3) throw new RangeError('out must match the flat strand layout');
  result.fill(0, 0, 3);
  for (let i = 1; i <= segments; i++) {
    const t = (i - .5) / segments;
    const dx = n[0] + groom[0] * t, dy = n[1] + groom[1] * t, dz = n[2] + groom[2] * t;
    const scale = length / segments / Math.hypot(dx, dy, dz), k = i * 3;
    result[k] = result[k - 3] + dx * scale;
    result[k + 1] = result[k - 2] + dy * scale;
    result[k + 2] = result[k - 1] + dz * scale;
  }
  return result;
}

/** Change the material's rest pose while retaining its current position and velocity. */
export function setGroomRestShape(strand, bend) {
  makeGroomRestShape(strand.normal, bend, strand.length, strand.segments, strand.restShape);
  return strand.restShape;
}

function setRestShape(strand, offsets) {
  if (!offsets || offsets.length !== strand.restShape.length) throw new RangeError('restShape must match the flat positions layout');
  for (const value of offsets) if (!Number.isFinite(value)) throw new TypeError('restShape must contain finite offsets');
  // Project once so a requested groom has a reachable, inextensible rest pose.
  strand.restShape.fill(0, 0, 3);
  for (let i = 1; i <= strand.segments; i++) {
    const k = i * 3, parent = k - 3;
    let dx = offsets[k] - strand.restShape[parent];
    let dy = offsets[k + 1] - strand.restShape[parent + 1];
    let dz = offsets[k + 2] - strand.restShape[parent + 2];
    let magnitude = Math.hypot(dx, dy, dz);
    if (magnitude < 1e-12) {
      [dx, dy, dz] = strand.normal;
      magnitude = 1;
    }
    const scale = strand.segmentLength / magnitude;
    strand.restShape[k] = strand.restShape[parent] + dx * scale;
    strand.restShape[k + 1] = strand.restShape[parent + 1] + dy * scale;
    strand.restShape[k + 2] = strand.restShape[parent + 2] + dz * scale;
  }
}

export function createStrand(root, normal, length, segments = 6) {
  if (!Number.isFinite(length) || length <= 0) throw new RangeError('length must be finite and positive');
  if (!Number.isInteger(segments) || segments < 1 || segments > 64) throw new RangeError('segments must be an integer from 1 to 64');
  const size = (segments + 1) * 3;
  const strand = {
    root: new Float64Array(vector(root, 'root')),
    normal: new Float64Array(unitNormal(normal)),
    length,
    segments,
    segmentLength: length / segments,
    positions: new Float64Array(size),
    velocities: new Float64Array(size),
    restShape: new Float64Array(size),
    // Retained scratch arrays avoid per-step particle allocations.
    _previous: new Float64Array(size),
    _predicted: new Float64Array(size),
    _corrections: new Float64Array(size + 3),
    _contactNormals: new Float64Array(size),
    _contactParent: new Float64Array(3),
    _contactPoint: new Float64Array(3),
    _contactNormal: new Float64Array(3),
    _contactOptions: {stats: {contacts: 0, unresolved: 0}},
    contactCount: 0,
    unresolvedContacts: 0,
  };
  straightRest(strand);
  return resetStrand(strand);
}

export function resetStrand(strand, options = {}) {
  if (options.root) strand.root.set(vector(options.root, 'root'));
  if (options.normal) {
    strand.normal.set(unitNormal(options.normal));
    straightRest(strand);
  }
  if (options.restShape) setRestShape(strand, options.restShape);
  for (let i = 0; i <= strand.segments; i++) {
    for (let axis = 0; axis < 3; axis++) strand.positions[i * 3 + axis] = strand.root[axis] + strand.restShape[i * 3 + axis];
  }
  strand.velocities.fill(0);
  strand._previous.set(strand.positions);
  strand._predicted.set(strand.positions);
  strand._corrections.fill(0);
  strand._contactNormals.fill(0);
  strand.contactCount = strand.unresolvedContacts = 0;
  return strand;
}

export function stepStrand(strand, options = {}) {
  const dt = STRAND_FIXED_STEP;
  if (options.root) strand.root.set(vector(options.root, 'root'));
  if (options.restShape) setRestShape(strand, options.restShape);
  const gravity = typeof options.gravity === 'number'
    ? [0, -Math.abs(finite(options.gravity, 0)), 0]
    : vector(options.gravity || [0, 0, 0], 'gravity');
  const wind = vector(options.wind || [0, 0, 0], 'wind');
  const force = vector(options.force || [0, 0, 0], 'force');
  const forces = options.forces;
  if (forces && forces.length !== strand.positions.length) throw new RangeError('forces must match the flat positions layout');
  const stiffness = clamp(finite(options.stiffness, 80), 0, 10000);
  const drag = Math.exp(-clamp(finite(options.damping, 8), 0, 1000) * dt);
  const correction = clamp(finite(options.correction, 1), 0, 1);
  const maxSpeed = Math.max(1e-6, finite(options.maxSpeed, Math.max(1, strand.length / dt)));
  const colliders = Array.isArray(options.colliders) && options.colliders.length ? options.colliders : null;
  const contactOptions = strand._contactOptions;
  contactOptions.stats.contacts = contactOptions.stats.unresolved = 0;
  contactOptions.margin = Math.max(0, finite(options.contactMargin, 0));
  contactOptions.iterations = finite(options.contactIterations, 4);
  contactOptions.normalOut = strand._contactNormal;
  contactOptions.preferredDirection = strand.normal;
  const friction = clamp(finite(options.friction, .15), 0, 1);
  strand._contactNormals.fill(0);
  strand.contactCount = strand.unresolvedContacts = 0;
  const {positions, velocities, root, restShape, _previous: previous, _predicted: predicted, _corrections: corrections} = strand;
  previous.set(positions);
  corrections.fill(0);
  positions.set(root, 0);
  predicted.set(root, 0);

  // Equation (1): symplectic prediction, with application rest attraction / drag.
  for (let i = 1; i <= strand.segments; i++) {
    const k = i * 3;
    for (let axis = 0; axis < 3; axis++) {
      const acceleration = gravity[axis] + wind[axis] + force[axis]
        + finite(forces && forces[k + axis], 0)
        + stiffness * (root[axis] + restShape[k + axis] - previous[k + axis]);
      predicted[k + axis] = previous[k + axis] + velocities[k + axis] * drag * dt + acceleration * dt * dt;
    }
  }

  // Static FTL: predecessor stays fixed; put the next point on its length sphere.
  // Store d_i = p_i - predicted_i before advancing to the next constraint.
  for (let i = 1; i <= strand.segments; i++) {
    const k = i * 3, parent = k - 3;
    let dx = predicted[k] - positions[parent];
    let dy = predicted[k + 1] - positions[parent + 1];
    let dz = predicted[k + 2] - positions[parent + 2];
    let magnitude = Math.hypot(dx, dy, dz);
    if (magnitude < 1e-12 || !Number.isFinite(magnitude)) {
      dx = restShape[k] - restShape[parent];
      dy = restShape[k + 1] - restShape[parent + 1];
      dz = restShape[k + 2] - restShape[parent + 2];
      magnitude = Math.hypot(dx, dy, dz);
    }
    const scale = strand.segmentLength / magnitude;
    positions[k] = positions[parent] + dx * scale;
    positions[k + 1] = positions[parent + 1] + dy * scale;
    positions[k + 2] = positions[parent + 2] + dz * scale;
    if (colliders) {
      for (let axis = 0; axis < 3; axis++) {strand._contactParent[axis] = positions[parent + axis];strand._contactPoint[axis] = positions[k + axis];}
      projectStrandContact(strand._contactParent, strand._contactPoint, strand.segmentLength, colliders, contactOptions);
      for (let axis = 0; axis < 3; axis++) {positions[k + axis] = strand._contactPoint[axis];strand._contactNormals[k + axis] = strand._contactNormal[axis];}
    }
    for (let axis = 0; axis < 3; axis++) corrections[k + axis] = positions[k + axis] - predicted[k + axis];
  }

  // DFTL equation (9). Using only (p_i - x_i)/dt is static FTL in a dynamic
  // integrator and gives the uneven-mass artifact discussed in the paper.
  velocities.fill(0, 0, 3);
  for (let i = 1; i <= strand.segments; i++) {
    const k = i * 3, next = k + 3;
    for (let axis = 0; axis < 3; axis++) {
      velocities[k + axis] = (positions[k + axis] - previous[k + axis] - correction * corrections[next + axis]) / dt;
    }
    if (colliders) {
      const nx = strand._contactNormals[k], ny = strand._contactNormals[k + 1], nz = strand._contactNormals[k + 2];
      if (nx || ny || nz) {
        const alongNormal = velocities[k] * nx + velocities[k + 1] * ny + velocities[k + 2] * nz;
        const outward = Math.max(0, alongNormal);
        velocities[k] = (velocities[k] - nx * alongNormal) * (1 - friction) + nx * outward;
        velocities[k + 1] = (velocities[k + 1] - ny * alongNormal) * (1 - friction) + ny * outward;
        velocities[k + 2] = (velocities[k + 2] - nz * alongNormal) * (1 - friction) + nz * outward;
      }
    }
    const speed = Math.hypot(velocities[k], velocities[k + 1], velocities[k + 2]);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      for (let axis = 0; axis < 3; axis++) velocities[k + axis] *= scale;
    }
  }
  strand.contactCount = contactOptions.stats.contacts;
  strand.unresolvedContacts = contactOptions.stats.unresolved;
  return strand;
}
