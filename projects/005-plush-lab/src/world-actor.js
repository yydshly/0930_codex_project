// Scene-independent actor movement. Rendering consumes the public pose only.
const internal = new WeakMap();
const TRANSITION_TIME = .65;
const MAX_STEP = .1;
const EPSILON = 1e-8;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const coordinate = value => finite(value) && Math.abs(value) <= 10000;
const point = value => Array.isArray(value) && value.length === 2 && value.every(coordinate);
const smooth = value => value * value * (3 - 2 * value);
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));

function normalizeSeat(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id.trim() ||
    !Array.isArray(value.position) || value.position.length !== 3 || !value.position.every(coordinate) ||
    !point(value.approach) || !finite(value.yaw)) return null;
  // position is in world coordinates; elevation is relative to the room floor.
  const elevation = value.elevation ?? value.position[1];
  if (!finite(elevation) || elevation < 0 || elevation > 100) return null;
  return {id: value.id, position: value.position.slice(), approach: value.approach.slice(),
    elevation, yaw: wrapAngle(value.yaw)};
}

function snapshot(actor) {
  return {x: actor.x, z: actor.z, elevation: actor.elevation, yaw: actor.yaw,
    gait: actor.gait, sitBlend: actor.sitBlend, status: actor.status, seatId: actor.seatId};
}

function clearState(actor) {
  const state = internal.get(actor);
  state.route = [];
  state.seat = null;
  state.transition = null;
  state.pending = null;
  state.phase = 0;
  actor.gait = 0;
  actor.sitBlend = 0;
  actor.elevation = 0;
  actor.seatId = null;
  actor.status = 'idle';
}

export function createActor({x = 0, z = 0, y = 0, yaw = 0} = {}) {
  const actor = {x: coordinate(x) ? x : 0, z: coordinate(z) ? z : 0,
    elevation: finite(y) && y >= 0 ? y : 0, yaw: finite(yaw) ? wrapAngle(yaw) : 0,
    gait: 0, sitBlend: 0, status: 'idle', seatId: null};
  internal.set(actor, {route: [], seat: null, transition: null, pending: null, phase: 0});
  return actor;
}

function beginRoute(actor, task) {
  const state = internal.get(actor);
  state.route = task.route;
  state.seat = task.seat;
  state.transition = null;
  state.pending = null;
  actor.seatId = null;
  actor.status = 'walking';
}

function beginTransition(actor, status, seat) {
  const state = internal.get(actor);
  state.transition = {elapsed: 0, from: snapshot(actor), seat};
  state.route = [];
  state.seat = seat;
  actor.status = status;
  actor.seatId = seat.id;
  actor.gait = 0;
}

export function walkActor(actor, path, {seat = null} = {}) {
  if (!internal.has(actor) || !Array.isArray(path) || !path.length || path.length > 256 ||
    !path.every(point)) return false;
  const targetSeat = seat === null ? null : normalizeSeat(seat);
  if (seat !== null && !targetSeat) return false;
  const route = path.map(item => item.slice());
  if (targetSeat) {
    const last = route[route.length - 1];
    if (Math.hypot(last[0] - targetSeat.approach[0], last[1] - targetSeat.approach[1]) > EPSILON) {
      route.push(targetSeat.approach.slice());
    }
  }
  const task = {route, seat: targetSeat};
  const state = internal.get(actor);
  if (actor.status === 'seated' || actor.status === 'sitting') {
    beginTransition(actor, 'standing', state.seat);
    state.pending = task;
  } else if (actor.status === 'standing') state.pending = task;
  else beginRoute(actor, task);
  return true;
}

export function standActor(actor) {
  if (!internal.has(actor)) return false;
  const state = internal.get(actor);
  if (actor.status === 'standing') {
    const hadPendingWalk = Boolean(state.pending);
    state.pending = null;
    return hadPendingWalk;
  }
  if (actor.status !== 'seated' && actor.status !== 'sitting') return false;
  state.pending = null;
  beginTransition(actor, 'standing', state.seat);
  return true;
}

function advanceTransition(actor, duration) {
  const state = internal.get(actor), transition = state.transition;
  const used = Math.min(duration, TRANSITION_TIME - transition.elapsed);
  transition.elapsed += used;
  const amount = smooth(Math.min(1, transition.elapsed / TRANSITION_TIME));
  const {from, seat} = transition;
  const sitting = actor.status === 'sitting';
  const destination = sitting ? [seat.position[0], seat.position[2]] : seat.approach;
  actor.x = from.x + (destination[0] - from.x) * amount;
  actor.z = from.z + (destination[1] - from.z) * amount;
  actor.elevation = from.elevation + ((sitting ? seat.elevation : 0) - from.elevation) * amount;
  actor.sitBlend = from.sitBlend + ((sitting ? 1 : 0) - from.sitBlend) * amount;
  actor.yaw = wrapAngle(from.yaw + angleDelta(from.yaw, seat.yaw) * amount);
  if (transition.elapsed >= TRANSITION_TIME - EPSILON) {
    state.transition = null;
    if (sitting) {
      actor.status = 'seated';
      actor.elevation = seat.elevation;
      actor.sitBlend = 1;
    } else {
      const pending = state.pending;
      clearState(actor);
      if (pending) beginRoute(actor, pending);
    }
  }
  return used;
}

export function stepActor(actor, dt, {speed = 1.3} = {}) {
  if (!internal.has(actor)) return null;
  if (!finite(dt) || dt <= 0) return snapshot(actor);
  let remaining = Math.min(dt, MAX_STEP);
  const velocity = finite(speed) ? Math.max(0, Math.min(10, speed)) : 1.3;
  const state = internal.get(actor);
  while (remaining > EPSILON) {
    if (actor.status === 'sitting' || actor.status === 'standing') {
      remaining -= advanceTransition(actor, remaining);
      continue;
    }
    if (actor.status !== 'walking') {actor.gait = 0; break;}
    if (!state.route.length) {
      actor.gait = 0;
      if (state.seat) beginTransition(actor, 'sitting', state.seat);
      else actor.status = 'idle';
      continue;
    }
    const [targetX, targetZ] = state.route[0];
    const dx = targetX - actor.x, dz = targetZ - actor.z, distance = Math.hypot(dx, dz);
    if (distance <= EPSILON) {actor.x = targetX; actor.z = targetZ; state.route.shift(); continue;}
    if (!velocity) break;
    const used = Math.min(remaining, distance / velocity), traveled = velocity * used;
    actor.x += dx / distance * traveled;
    actor.z += dz / distance * traveled;
    const direction = Math.atan2(dx, dz);
    actor.yaw = wrapAngle(actor.yaw + angleDelta(actor.yaw, direction) * (1 - Math.exp(-12 * used)));
    state.phase = (state.phase + traveled * 10) % (Math.PI * 2);
    actor.gait = Math.sin(state.phase);
    remaining -= used;
    if (traveled >= distance - EPSILON) {
      actor.x = targetX; actor.z = targetZ; state.route.shift();
    }
  }
  // Resolve a route ending exactly at this frame boundary without an extra idle frame.
  if (actor.status === 'walking' && !state.route.length) {
    actor.gait = 0;
    if (state.seat) beginTransition(actor, 'sitting', state.seat);
    else actor.status = 'idle';
  }
  return snapshot(actor);
}

export function restoreActorPose(actor, pose, seats = []) {
  if (!internal.has(actor) || !pose || typeof pose !== 'object' || !coordinate(pose.x) || !coordinate(pose.z) ||
    (pose.seatId !== null && pose.seatId !== undefined && typeof pose.seatId !== 'string') || !Array.isArray(seats)) return false;
  const seat = pose.seatId ? normalizeSeat(seats.find(item => item?.id === pose.seatId)) : null;
  clearState(actor);
  actor.x = seat ? seat.position[0] : pose.x;
  actor.z = seat ? seat.position[2] : pose.z;
  if (seat) {
    const state = internal.get(actor);
    state.seat = seat;
    actor.yaw = seat.yaw;
    actor.elevation = seat.elevation;
    actor.sitBlend = 1;
    actor.status = 'seated';
    actor.seatId = seat.id;
  }
  return true;
}

export function resetActor(actor, {x = 0, z = 0, yaw = 0} = {}) {
  if (!internal.has(actor) || !coordinate(x) || !coordinate(z) || !finite(yaw)) return false;
  clearState(actor);
  actor.x = x; actor.z = z; actor.yaw = wrapAngle(yaw);
  return true;
}
