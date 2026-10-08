import { clamp } from './math.js';

export const RIDE_SPEED = 4.2;
export const SPRINT_SPEED = 6.3;
export const HORSE_RADIUS = .72;
const acceleration = 3.6, releaseBrake = 5.6, firmBrake = 10;
const wrapped = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createRideState(start) {
  return { x: start.x, z: start.z, yaw: start.yaw ?? 0, speed: 0, distance: 0, stepDistance: 0, blocked: false };
}

// The index contains actual tree trunks and camp props, never leaf canopies.
export function createCollisionQuery(colliders = [], cellSize = 12) {
  const cells = new Map();
  for (const collider of colliders) {
    const radius = collider.radius + HORSE_RADIUS;
    for (let x = Math.floor((collider.x - radius) / cellSize); x <= Math.floor((collider.x + radius) / cellSize); x++) {
      for (let z = Math.floor((collider.z - radius) / cellSize); z <= Math.floor((collider.z + radius) / cellSize); z++) {
        const key = `${x}:${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(collider);
      }
    }
  }
  return (x, z) => cells.get(`${Math.floor(x / cellSize)}:${Math.floor(z / cellSize)}`) ?? [];
}

function move(state, x, z, environment) {
  const { bounds, heightAt = () => 0, queryColliders = () => [] } = environment;
  const previousX = state.x, previousZ = state.z;
  if (bounds) {
    x = clamp(x, bounds.minX + HORSE_RADIUS, bounds.maxX - HORSE_RADIUS);
    z = clamp(z, bounds.minZ + HORSE_RADIUS, bounds.maxZ - HORSE_RADIUS);
  }
  for (let pass = 0; pass < 2; pass++) {
    for (const obstacle of queryColliders(x, z)) {
      const dx = x - obstacle.x, dz = z - obstacle.z;
      const separation = Math.hypot(dx, dz), clearance = obstacle.radius + HORSE_RADIUS;
      if (separation < clearance) {
        // Resolve contact tangentially so a grazing trunk does not trap a rider.
        const length = separation || Math.hypot(previousX - obstacle.x, previousZ - obstacle.z) || 1;
        const atCenter = !separation && previousX === obstacle.x && previousZ === obstacle.z;
        const normalX = separation ? dx / length : (previousX - obstacle.x) / length;
        const normalZ = atCenter ? 1 : separation ? dz / length : (previousZ - obstacle.z) / length;
        x = obstacle.x + normalX * clearance;
        z = obstacle.z + normalZ * clearance;
        state.blocked = true;
      }
    }
  }
  if (bounds) {
    x = clamp(x, bounds.minX + HORSE_RADIUS, bounds.maxX - HORSE_RADIUS);
    z = clamp(z, bounds.minZ + HORSE_RADIUS, bounds.maxZ - HORSE_RADIUS);
    // A solid prop on the edge cannot push a horse outside the terrain bounds.
    if (queryColliders(x, z).some(obstacle => Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + HORSE_RADIUS - 1e-7)) {
      state.blocked = true;
      return 0;
    }
  }
  const length = Math.hypot(x - previousX, z - previousZ);
  const rise = heightAt(x, z) - heightAt(previousX, previousZ);
  if (length > 1e-8 && Math.abs(rise) / length > (environment.maxSlope ?? .78)) {
    state.blocked = true;
    return 0;
  }
  state.x = x; state.z = z;
  state.stepDistance += length;
  state.distance += length;
  return length;
}

export function stepRide(previous, input, delta, environment = {}) {
  const state = { ...previous, stepDistance: 0, blocked: false };
  if (!(delta > 0) || environment.stopped) return { ...state, speed: 0 };
  const count = Math.ceil(delta * 120), dt = delta / count;
  for (let i = 0; i < count; i++) {
    const desiredSpeed = input.forward && !input.backward ? (input.sprint ? SPRINT_SPEED : RIDE_SPEED) : 0;
    const change = (desiredSpeed > state.speed ? acceleration : input.backward ? firmBrake : releaseBrake) * dt;
    const oldSpeed = state.speed;
    state.speed += clamp(desiredSpeed - state.speed, -change, change);
    const steer = Number(!!input.left) - Number(!!input.right);
    const turn = steer * (.7 + .65 * Math.min(state.speed / RIDE_SPEED, 1)) * dt;
    const heading = state.yaw + turn * .5;
    state.yaw = wrapped(state.yaw + turn);
    const length = (oldSpeed + state.speed) * .5 * dt;
    const travelled = move(state, state.x - Math.sin(heading) * length, state.z - Math.cos(heading) * length, environment);
    if (travelled < length * .15) state.speed = 0;
  }
  return state;
}

export function closestRouteCursor(position, route) {
  let best = Infinity, cursor = 1;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const distance = Math.hypot(position.x - a.x - dx * t, position.z - a.z - dz * t);
    if (distance < best) { best = distance; cursor = i; }
  }
  return cursor;
}

export function stepTour(previous, route, cursor, delta, environment = {}) {
  const state = { ...previous, stepDistance: 0, blocked: false };
  if (!(delta > 0) || environment.stopped || route.length < 2) return { state: { ...state, speed: 0 }, cursor };
  let remaining = RIDE_SPEED * delta, attempts = 0;
  while (remaining > 1e-7 && attempts++ < route.length + Math.ceil(delta * 120)) {
    const goal = route[cursor % route.length];
    const dx = goal.x - state.x, dz = goal.z - state.z, distance = Math.hypot(dx, dz);
    if (distance < .015) { cursor = (cursor + 1) % route.length; continue; }
    const length = Math.min(remaining, distance, RIDE_SPEED / 120);
    const targetYaw = Math.atan2(-dx, -dz);
    state.yaw = wrapped(state.yaw + wrapped(targetYaw - state.yaw) * (1 - Math.exp(-length / RIDE_SPEED * 8)));
    const travelled = move(state, state.x + dx / distance * length, state.z + dz / distance * length, environment);
    remaining -= length;
    if (travelled < length * .1) { state.blocked = true; break; }
  }
  state.speed = delta ? state.stepDistance / delta : 0;
  return { state, cursor };
}

export function updateDiscoveries(position, landmarks, discovered) {
  const next = new Set(discovered);
  for (const landmark of landmarks) {
    if (Math.hypot(position.x - landmark.x, position.z - landmark.z) <= landmark.radius) next.add(landmark.id);
  }
  return next;
}

export function nearestLandmark(position, landmarks) {
  let nearest = null;
  for (const landmark of landmarks) {
    const distance = Math.hypot(position.x - landmark.x, position.z - landmark.z);
    if (!nearest || distance < nearest.distance) nearest = { id: landmark.id, name: landmark.name, distance: Math.round(distance) };
  }
  return nearest;
}
