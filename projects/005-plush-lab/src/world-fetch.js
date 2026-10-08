import {walkActor} from './world-actor.js';

// A transient play session: it never writes character recipes or room layouts.
const sessions = new WeakMap();
const MAX_STEP = .1;
const EPSILON = 1e-6;
const THROW_TIME = .8;
// A readable, deterministic bounce animation rather than a rigid-body solver.
const BOUNCES = [{duration: .5, height: .42}, {duration: .34, height: .2}, {duration: .23, height: .08}];
const ROLL_TIME = .35;
const SETTLE_TIME = BOUNCES.reduce((total, bounce) => total + bounce.duration, ROLL_TIME);
const PICK_TIME = .45;
const CELEBRATE_TIME = .85;
export const FETCH_BALL_RADIUS = .14;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const coordinate = value => finite(value) && Math.abs(value) <= 10000;
const point = value => Array.isArray(value) && value.length === 2 && value.every(coordinate);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const actorPoint = actor => [actor.x, actor.z];
const actorPose = actor => actor && coordinate(actor.x) && coordinate(actor.z) &&
  finite(actor.yaw) && finite(actor.elevation) && actor.elevation >= 0;
const route = value => Array.isArray(value) && value.length > 0 && value.length <= 256 && value.every(point);
const samePoint = (a, b) => distance(a, b) <= EPSILON;
const progress = (elapsed, duration) => Math.min(1, elapsed / duration);

function firstImpact(outbound, target) {
  // The final planned segment is already clear of scenery. Keep the entire
  // ground motion on that segment, including short routes and duplicate ends.
  const previous = outbound.findLast(value => !samePoint(value, target));
  const length = distance(previous, target), travel = Math.min(.4, length * .8);
  return [target[0] - (target[0] - previous[0]) / length * travel,
    target[1] - (target[1] - previous[1]) / length * travel];
}

function bounceHeight(elapsed) {
  let remaining = elapsed;
  for (const bounce of BOUNCES) {
    if (remaining < bounce.duration) {
      const amount = progress(remaining, bounce.duration);
      return 4 * bounce.height * amount * (1 - amount);
    }
    remaining -= bounce.duration;
  }
  return 0;
}

export function createFetchGame() {
  const game = {phase: 'ready', ball: null, origin: null, target: null, completed: 0, pickBlend: 0, celebrateBlend: 0};
  sessions.set(game, null);
  return game;
}

export function isFetchBusy(game) {
  return sessions.has(game) && sessions.get(game) !== null;
}

function carryBall(game, actor, floorY) {
  game.ball.x = actor.x + Math.sin(actor.yaw) * .72;
  game.ball.y = floorY + actor.elevation + .64;
  game.ball.z = actor.z + Math.cos(actor.yaw) * .72;
}

export function startFetchGame(game, actor, options) {
  if (!sessions.has(game) || isFetchBusy(game) || !actorPose(actor) || !options || typeof options !== 'object') return false;
  const {origin, target, outbound, inbound, floorY} = options;
  if (!point(origin) || !point(target) || !coordinate(floorY) || !route(outbound) || !route(inbound) ||
    distance(origin, target) < .3 || !samePoint(outbound[0], origin) || !samePoint(outbound.at(-1), target) ||
    !samePoint(inbound[0], target) || !samePoint(inbound.at(-1), origin)) return false;
  // A floor actor starts from its actual position. A seated actor first goes to
  // its seat approach, as handled continuously by walkActor's standing transition.
  if (!['seated', 'sitting', 'standing'].includes(actor.status) && !samePoint(actorPoint(actor), origin)) return false;
  if (!walkActor(actor, [origin.slice()])) return false;
  const state = {actor, origin: origin.slice(), target: target.slice(),
    outbound: outbound.map(value => value.slice()), inbound: inbound.map(value => value.slice()),
    floorY, elapsed: 0, launch: null, impact: firstImpact(outbound, target)};
  sessions.set(game, state);
  game.phase = 'starting';
  game.origin = origin.slice();
  game.target = target.slice();
  game.ball = {x: actor.x, y: floorY + FETCH_BALL_RADIUS, z: actor.z, rotationX: 0, rotationZ: 0};
  game.pickBlend = 0;
  game.celebrateBlend = 0;
  carryBall(game, actor, floorY);
  return true;
}

function enter(game, state, phase) {
  game.phase = phase;
  state.elapsed = 0;
}

export function stepFetchGame(game, actor, dt) {
  if (!sessions.has(game)) return null;
  const state = sessions.get(game);
  if (!state || state.actor !== actor || !finite(dt) || dt <= 0) return game;
  if (!actorPose(actor)) {cancelFetchGame(game); return game;}
  const duration = Math.min(dt, MAX_STEP);
  if (game.phase === 'starting') {
    carryBall(game, actor, state.floorY);
    if (actor.status !== 'idle' || !samePoint(actorPoint(actor), state.origin)) return game;
    state.launch = {...game.ball};
    enter(game, state, 'throwing');
  }
  if (game.phase === 'throwing') {
    state.elapsed += duration;
    const amount = progress(state.elapsed, THROW_TIME);
    game.ball.x = state.launch.x + (state.impact[0] - state.launch.x) * amount;
    game.ball.z = state.launch.z + (state.impact[1] - state.launch.z) * amount;
    game.ball.y = state.launch.y + (state.floorY + FETCH_BALL_RADIUS - state.launch.y) * amount +
      4 * 1.05 * amount * (1 - amount);
    game.ball.rotationX += duration * 7;
    game.ball.rotationZ += duration * 3;
    if (amount >= 1) {
      if (!walkActor(actor, state.outbound)) {cancelFetchGame(game); return game;}
      enter(game, state, 'bouncing');
    }
  } else if (game.phase === 'bouncing') {
    state.elapsed += duration;
    const amount = progress(state.elapsed, SETTLE_TIME);
    const travel = 1 - (1 - amount) ** 2;
    const previousX = game.ball.x, previousZ = game.ball.z;
    game.ball.x = state.impact[0] + (state.target[0] - state.impact[0]) * travel;
    game.ball.z = state.impact[1] + (state.target[1] - state.impact[1]) * travel;
    game.ball.y = state.floorY + FETCH_BALL_RADIUS + bounceHeight(state.elapsed);
    game.ball.rotationX += (game.ball.z - previousZ) / FETCH_BALL_RADIUS;
    game.ball.rotationZ -= (game.ball.x - previousX) / FETCH_BALL_RADIUS;
    if (amount >= 1) {
      game.ball.x = state.target[0]; game.ball.z = state.target[1];
      game.ball.y = state.floorY + FETCH_BALL_RADIUS;
      enter(game, state, 'chasing');
    }
  } else if (game.phase === 'chasing') {
    if (actor.status === 'idle' && samePoint(actorPoint(actor), state.target)) enter(game, state, 'picking');
  } else if (game.phase === 'picking') {
    state.elapsed += duration;
    const amount = progress(state.elapsed, PICK_TIME);
    game.pickBlend = Math.sin(Math.PI * amount);
    if (amount >= 1) {
      game.pickBlend = 0;
      if (!walkActor(actor, state.inbound)) {cancelFetchGame(game); return game;}
      carryBall(game, actor, state.floorY);
      enter(game, state, 'returning');
    }
  } else if (game.phase === 'returning') {
    carryBall(game, actor, state.floorY);
    if (actor.status === 'idle' && samePoint(actorPoint(actor), state.origin)) enter(game, state, 'celebrating');
  } else if (game.phase === 'celebrating') {
    state.elapsed += duration;
    game.celebrateBlend = Math.sin(Math.PI * progress(state.elapsed, CELEBRATE_TIME));
    carryBall(game, actor, state.floorY);
    if (state.elapsed >= CELEBRATE_TIME) {
      game.ball.y = state.floorY + FETCH_BALL_RADIUS;
      game.celebrateBlend = 0;
      game.completed += 1;
      game.phase = 'ready';
      sessions.set(game, null);
    }
  }
  return game;
}

export function cancelFetchGame(game) {
  if (!sessions.has(game)) return false;
  const state = sessions.get(game);
  // Do not snap a standing transition back down. Its queued route only reaches
  // the seat approach. A chase or return can safely stop at its current floor pose.
  if (state && ['bouncing', 'chasing', 'returning'].includes(game.phase) && actorPose(state.actor)) {
    walkActor(state.actor, [actorPoint(state.actor)]);
  }
  sessions.set(game, null);
  game.phase = 'ready';
  game.ball = null;
  game.origin = null;
  game.target = null;
  game.pickBlend = 0;
  game.celebrateBlend = 0;
  return true;
}
