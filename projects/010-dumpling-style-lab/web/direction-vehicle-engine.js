// RIDGE WORKS is an original, bounded engineering sample. Metres, seconds and kilograms.
export const VERSION = 1;
export const MAP_BOUNDS = Object.freeze({ minX: -54, maxX: 54, minZ: -54, maxZ: 54 });
export const WAYPOINTS = Object.freeze([
  Object.freeze({ id: 'garage', name: '岚谷车库', x: -32, z: -32, radius: 3.5 }),
  Object.freeze({ id: 'depot', name: '北坡料站', x: -32, z: 32, radius: 3.5 }),
  Object.freeze({ id: 'destination', name: '桥东工地', x: 32, z: 32, radius: 3.5 })
]);
export const ROAD_POINTS = Object.freeze([
  Object.freeze({ id: 'garage', x: -32, z: -32 }), Object.freeze({ id: 'depot', x: -32, z: 32 }),
  Object.freeze({ id: 'destination', x: 32, z: 32 }), Object.freeze({ id: 'bend', x: 32, z: -32 })
]);
export const OBSTACLES = Object.freeze([
  Object.freeze({ id: 'garage-building', x: -43, z: -33, radius: 5.3, height: 5 }),
  Object.freeze({ id: 'depot-building', x: -43, z: 34, radius: 4.8, height: 4.3 }),
  Object.freeze({ id: 'site-building', x: 44, z: 35, radius: 5.2, height: 5.5 }),
  Object.freeze({ id: 'west-rock', x: -15, z: -4, radius: 3.4, height: 3.1 }),
  Object.freeze({ id: 'east-rock', x: 14, z: 6, radius: 3.1, height: 2.8 })
]);
export const VEHICLE = Object.freeze({ mass: 1250, wheelbase: 2.9, track: 1.76, tireRadius: .34, springRest: .48, mountOffset: .32, radius: 1.55, maxSpeed: 11, maxReverse: 3.2 });
export const TUNES = Object.freeze({ comfort: Object.freeze({ name: '舒适', spring: 22500, damper: 2800 }), firm: Object.freeze({ name: '紧致', spring: 38000, damper: 4400 }) });
const G = 9.81, FIXED_STEP = 1 / 120, STOP_SPEED = .55, CARGO_UNITS = 4, CARGO_MASS = 320;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = a => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const point = id => WAYPOINTS.find(p => p.id === id);
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function segmentDistance(x, z, a, b) { const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - a.x - t * dx, z - a.z - t * dz); }
function roadDistance(x, z) { return Math.min(...ROAD_POINTS.map((p, i) => segmentDistance(x, z, p, ROAD_POINTS[(i + 1) % 4]))); }
function baseHeight(x, z) { return .3 + 1.7 * smooth((z - 4) / 28) + .14 * Math.sin(x * .053); }
export function terrainType(x, z) {
  if (x < -54 || x > 54 || z < -54 || z > 54) return 'boundary';
  if (Math.abs(x - 32) < 4.3 && z > -12 && z < 12) return 'bridge';
  if (Math.abs(z - 32) < 4.5 && x > -22 && x < 23) return 'corrugation';
  if (roadDistance(x, z) < 4.5 || WAYPOINTS.some(p => Math.hypot(x - p.x, z - p.z) < 9)) return z > 5 && z < 29 ? 'slope' : 'dirt';
  return 'grass';
}
export function terrainHeight(x, z) {
  const base = baseHeight(x, z), d = roadDistance(x, z), offroad = smooth((d - 4) / 4);
  const waves = .019 * Math.sin(x * 1.1 + z * .63) + .018 * Math.sin(z * 1.37);
  const rough = .24 * Math.sin(x * .29) * Math.sin(z * .27) + .11 * Math.cos(x * .59 + z * .31);
  const corr = .095 * Math.sin(x * 2.45) + .04 * Math.sin(x * 4.8);
  const corrWeight = (1 - smooth((Math.abs(z - 32) - 2.6) / 2)) * smooth((x + 24) / 4) * (1 - smooth((x - 21) / 4));
  const bridgeWeight = (1 - smooth((Math.abs(x - 32) - 3.4) / 1.4)) * smooth((z + 15) / 5) * (1 - smooth((z - 10) / 5));
  const deck = .58 * smooth((z + 15) / 4) * (1 - smooth((z - 11) / 4));
  return base + waves * (1 - bridgeWeight) * (1 - corrWeight) + rough * offroad + corr * corrWeight + deck * bridgeWeight;
}
export function terrainNormal(x, z) { const h = .12, dx = (terrainHeight(x + h, z) - terrainHeight(x - h, z)) / (2 * h), dz = (terrainHeight(x, z + h) - terrainHeight(x, z - h)) / (2 * h), length = Math.hypot(dx, 1, dz); return { x: -dx / length, y: 1 / length, z: -dz / length }; }
function wheelPoint(v, localX, localZ) { return { x: v.x + Math.cos(v.heading) * localX + Math.sin(v.heading) * localZ, z: v.z - Math.sin(v.heading) * localX + Math.cos(v.heading) * localZ }; }
function pushLog(w, text) { w.message = text; w.log.push({ time: w.time, text }); if (w.log.length > 20) w.log.shift(); }
function record(w, kind, extra = {}) { w.ledger.push({ kind, time: w.time, x: w.vehicle.x, z: w.vehicle.z, speed: w.vehicle.speed, ...extra }); }
function wheelTelemetry(w, dt = 0, previous = null) {
  const v = w.vehicle, tune = TUNES[w.tune];
  return [['fl', -.88, 1.45], ['fr', .88, 1.45], ['rl', -.88, -1.45], ['rr', .88, -1.45]].map(([id, localX, localZ], index) => {
    const p = wheelPoint(v, localX, localZ), groundHeight = terrainHeight(p.x, p.z);
    const mountY = v.y - VEHICLE.mountOffset + Math.sin(v.pitch) * localZ + Math.sin(v.roll) * localX;
    const compression = clamp(VEHICLE.springRest - (mountY - groundHeight - VEHICLE.tireRadius), 0, .43);
    const groundVelocity = previous && dt ? clamp((groundHeight - previous[index].groundHeight) / dt, -2.8, 2.8) : 0;
    const mountVelocity = v.heaveVelocity + v.pitchVelocity * localZ + v.rollVelocity * localX;
    const force = compression > 0 ? clamp(tune.spring * compression - tune.damper * (mountVelocity - groundVelocity), 0, tune.spring * .43 + tune.damper * 2.8) : 0;
    return { id, localX, localZ, ...p, groundHeight, centerY: compression > 0 ? groundHeight + VEHICLE.tireRadius : mountY - VEHICLE.springRest, compression, force, contact: compression > 0, groundVelocity };
  });
}
export function createWorld() {
  const x = -32, z = -32, mass = VEHICLE.mass, y = terrainHeight(x, z) + 1.14 - mass * G / (4 * TUNES.comfort.spring);
  const w = { version: VERSION, phase: 'playing', paused: true, stage: 'dispatch', time: 0, tune: 'comfort', cargo: { units: 0, mass: 0 }, vehicle: { x, z, y, heading: 0, speed: 0, yawRate: 0, heaveVelocity: 0, pitch: 0, roll: 0, pitchVelocity: 0, rollVelocity: 0, steer: 0, wheelSpin: 0, mass, acceleration: 0, verticalAcceleration: 0, wheels: [] }, route: { active: false, target: null, points: [], index: 0 }, checkpoints: { depot: false, destination: false, bridge: false, garage: false }, stats: { distance: 0, loaded: 0, delivered: 0, collisions: 0, maxCompression: 0, bodyAccelSquared: 0, suspensionSamples: 0, elapsedMoving: 0 }, ledger: [], log: [], message: '', completedAt: null };
  w.vehicle.wheels = wheelTelemetry(w); pushLog(w, '空车停在岚谷车库。领取试车单，去北坡料站装载，再送往桥东工地。'); return w;
}
function stoppedAt(w, id) { const p = point(id); return p && dist(w.vehicle, p) <= p.radius && Math.abs(w.vehicle.speed) <= STOP_SPEED; }
function expectedRoute(w, target) {
  const destination = point(target); if (!destination) return null;
  if (target === 'garage' && w.stage === 'return') return [{ ...ROAD_POINTS[3] }, { ...ROAD_POINTS[0] }];
  const nearest = ROAD_POINTS.reduce((a, b) => dist(w.vehicle, a) < dist(w.vehicle, b) ? a : b), start = ROAD_POINTS.indexOf(nearest), end = ROAD_POINTS.findIndex(p => p.id === target);
  if (dist(w.vehicle, destination) < 8) return [{ ...destination }];
  const clockwise = (end - start + 4) % 4, counter = (start - end + 4) % 4, dir = clockwise <= counter ? 1 : -1;
  const points = dist(w.vehicle, nearest) > 10 ? [{ ...nearest }] : [];
  for (let i = start; i !== end;) { i = (i + dir + 4) % 4; points.push({ ...ROAD_POINTS[i] }); }
  if (!points.length) points.push({ ...destination }); return points;
}
export function act(w, action, payload) {
  const fail = reason => ({ ok: false, reason });
  if (!w || typeof action !== 'string') return fail('操作无效。');
  if (action === 'pause') { if (typeof payload !== 'boolean') return fail('暂停状态无效。'); if (w.phase === 'complete' && payload === false) return fail('本轮已经完成。'); w.paused = payload; return { ok: true, reason: payload ? '试车已暂停。' : '试车继续。' }; }
  if (action === 'cancel-assist') { if (w.paused) return fail('先继续试车，再接管驾驶辅助。'); w.route = { active: false, target: null, points: [], index: 0 }; return { ok: true, reason: '已接管方向与踏板。' }; }
  if (w.phase !== 'playing') return fail('本轮已经完成，请开始新的试车。');
  if (w.paused) return fail('先继续试车，再执行操作。');
  if (action === 'tune') {
    if (typeof payload !== 'string' || !Object.hasOwn(TUNES, payload)) return fail('请选择舒适或紧致调校。');
    if (Math.abs(w.vehicle.speed) > STOP_SPEED) return fail('调校悬挂前请停车。');
    if (w.tune === payload) return { ok: true, reason: '已经使用这套调校。' };
    if (w.ledger.length >= 120) return fail('本轮调校记录已满。');
    w.tune = payload; w.vehicle.wheels = wheelTelemetry(w); record(w, 'tune', { tune: payload }); pushLog(w, `切换${TUNES[payload].name}调校：四角弹簧与阻尼参数已更新。`); return { ok: true, reason: w.message };
  }
  if (action === 'assist') {
    if (typeof payload !== 'string' || !point(payload)) return fail('请选择车库、料站或工地。');
    if (w.stage === 'dispatch') return fail('先在车库领取试车单。');
    w.route = { active: true, target: payload, points: expectedRoute(w, payload), index: 0 }; return { ok: true, reason: `驾驶辅助前往${point(payload).name}，随时用方向与踏板接管。` };
  }
  const stages = { dispatch: ['dispatch', 'garage'], load: ['load', 'depot'], deliver: ['deliver', 'destination'], finish: ['return', 'garage'] };
  const requirement = stages[action]; if (!requirement) return fail('没有这个操作。');
  if (payload !== undefined) return fail('装卸与试车单使用固定规格，不接受额外参数。');
  if (w.stage !== requirement[0]) return fail('请按试车单顺序完成装载、送达与回库。');
  if (!stoppedAt(w, requirement[1])) return fail(`请驶入${point(requirement[1]).name}标记内并停车（速度低于 2 km/h）。`);
  if (action === 'finish' && !w.checkpoints.bridge) return fail('回库前请沿东侧道路完成桥面测试。');
  record(w, action); w.route = { active: false, target: null, points: [], index: 0 };
  if (action === 'dispatch') { w.stage = 'load'; pushLog(w, '试车单已领取。沿西侧缓坡到北坡料站，停车装载 320 kg 建材。'); }
  if (action === 'load') { w.cargo = { units: CARGO_UNITS, mass: CARGO_MASS }; w.vehicle.mass = VEHICLE.mass + CARGO_MASS; w.stats.loaded = CARGO_UNITS; w.checkpoints.depot = true; w.stage = 'deliver'; pushLog(w, '4 件建材已装车，载重增加 320 kg。观察车身下沉与加速变化，横穿搓板路到工地。'); }
  if (action === 'deliver') { w.cargo = { units: 0, mass: 0 }; w.vehicle.mass = VEHICLE.mass; w.stats.delivered = CARGO_UNITS; w.checkpoints.destination = true; w.stage = 'return'; pushLog(w, '建材已送达。空车沿东侧跨桥，再经南侧道路返回车库。'); }
  if (action === 'finish') { w.vehicle.speed = 0; w.vehicle.yawRate = 0; w.vehicle.acceleration = 0; w.stage = 'complete'; w.phase = 'complete'; w.paused = true; w.completedAt = w.time; w.checkpoints.garage = true; pushLog(w, '配送与回库完成。四角悬挂、载重搓板路和桥面测试已记录，本轮自动暂停。'); }
  return { ok: true, reason: w.message };
}
export function contextualAction(w) { if (w.phase !== 'playing') return null; const action = { dispatch: 'dispatch', load: 'load', deliver: 'deliver', return: 'finish' }[w.stage], id = { dispatch: 'garage', load: 'depot', deliver: 'destination', return: 'garage' }[w.stage]; return stoppedAt(w, id) ? action : null; }
export function objective(w) { return ({ dispatch: '领取试车单', load: '去北坡料站 · 停车装载', deliver: '载重通过搓板路 · 送达工地', return: '空车跨桥 · 返回车库', complete: '配送完成 · 测试已记录' })[w.stage]; }
export function status(w) { return w.phase === 'complete' ? w.message : w.paused ? '试车暂停 · 车身、悬挂与路线全部冻结' : w.route.active ? `驾驶辅助 → ${point(w.route.target).name} · 方向或踏板可随时接管` : objective(w); }
export function driveTo(w, target) {
  if (!w || w.paused || w.phase !== 'playing' || !point(target)) return { throttle: 0, steer: 0, brake: 0, reverse: false };
  const path = w.route.active && w.route.target === target ? w.route.points : expectedRoute(w, target), index = w.route.active && w.route.target === target ? w.route.index : 0;
  const next = path[Math.min(index, path.length - 1)], last = index >= path.length - 1, v = w.vehicle, distance = dist(v, next);
  const angle = wrap(Math.atan2(next.x - v.x, next.z - v.z) - v.heading);
  const steer = clamp(angle * 1.45, -1, 1);
  const cornerSpeed = Math.abs(angle) > 1.05 ? 2.7 : Math.abs(angle) > .52 ? 4.5 : 7.8;
  const targetSpeed = last ? Math.min(cornerSpeed, Math.sqrt(2 * 2.4 * Math.max(0, distance - 1.7))) : Math.min(cornerSpeed, distance < 10 ? 5 : 7.8);
  return { throttle: clamp((targetSpeed - v.speed) * .78, 0, 1), steer, brake: clamp((v.speed - targetSpeed) * .45, 0, 1), reverse: false };
}
export function demoStep(w) {
  const idle = { input: { throttle: 0, steer: 0, brake: 0, reverse: false } };
  if (!w || w.paused || w.phase !== 'playing') return idle;
  const action = contextualAction(w); if (action) return { ...idle, action };
  const target = { load: 'depot', deliver: 'destination', return: 'garage' }[w.stage];
  if (!target) return idle;
  if (!w.route.active || w.route.target !== target) return { ...idle, action: 'assist', payload: target };
  return { input: driveTo(w, target) };
}
function validInput(input) { return input && !Array.isArray(input) && typeof input === 'object' && Object.keys(input).every(k => ['throttle', 'steer', 'brake', 'reverse'].includes(k)) && ['throttle', 'steer', 'brake'].every(k => input[k] === undefined || typeof input[k] === 'number' && Number.isFinite(input[k]) && input[k] >= (k === 'steer' ? -1 : 0) && input[k] <= 1) && (input.reverse === undefined || typeof input.reverse === 'boolean'); }
function integrate(w, dt, input) {
  const v = w.vehicle, before = { x: v.x, z: v.z }, oldWheels = v.wheels;
  const throttle = clamp(input.throttle || 0, 0, 1), brake = clamp(input.brake || 0, 0, 1), reverse = input.reverse === true, surface = terrainType(v.x, v.z);
  const desiredSteer = clamp(input.steer || 0, -1, 1) * .57;
  v.steer += clamp(desiredSteer - v.steer, -dt * 2.5, dt * 2.5);
  const forwardX = Math.sin(v.heading), forwardZ = Math.cos(v.heading), slope = (terrainHeight(v.x + forwardX * .5, v.z + forwardZ * .5) - terrainHeight(v.x - forwardX * .5, v.z - forwardZ * .5));
  const engineForce = throttle * 4050 * (reverse ? -1 : 1) * (1 - Math.min(Math.abs(v.speed) / (reverse ? 4 : 16), .75));
  const resistance = (surface === 'grass' ? 310 : 115) * Math.sign(v.speed) + 5.8 * v.speed * Math.abs(v.speed);
  let acceleration = (engineForce - resistance) / v.mass - G * slope;
  const braking = brake * 7.3;
  if (braking > 0 && Math.abs(v.speed) < braking * dt && throttle === 0) { v.speed = 0; acceleration = 0; }
  else acceleration -= braking * Math.sign(v.speed);
  if (Math.abs(v.speed) < .025 && throttle === 0 && brake > .1) { v.speed = 0; acceleration = 0; }
  v.acceleration = clamp(acceleration, -10, 5); v.speed = clamp(v.speed + v.acceleration * dt, -VEHICLE.maxReverse, VEHICLE.maxSpeed);
  v.yawRate = v.speed / VEHICLE.wheelbase * Math.tan(v.steer); v.heading = wrap(v.heading + v.yawRate * dt);
  v.x += Math.sin(v.heading) * v.speed * dt; v.z += Math.cos(v.heading) * v.speed * dt;
  let hit = false;
  const bounds = { minX: MAP_BOUNDS.minX + VEHICLE.radius, maxX: MAP_BOUNDS.maxX - VEHICLE.radius, minZ: MAP_BOUNDS.minZ + VEHICLE.radius, maxZ: MAP_BOUNDS.maxZ - VEHICLE.radius };
  const boundedX = clamp(v.x, bounds.minX, bounds.maxX), boundedZ = clamp(v.z, bounds.minZ, bounds.maxZ);
  if (boundedX !== v.x || boundedZ !== v.z) { v.x = boundedX; v.z = boundedZ; hit = true; }
  for (const obstacle of OBSTACLES) { const dx = v.x - obstacle.x, dz = v.z - obstacle.z, d = Math.hypot(dx, dz), min = obstacle.radius + VEHICLE.radius; if (d < min) { const length = d || 1, nx = d ? dx / length : 1, nz = d ? dz / length : 0; v.x = obstacle.x + nx * min; v.z = obstacle.z + nz * min; hit = true; } }
  if (hit) { if (Math.abs(v.speed) > .8) w.stats.collisions++; v.speed = 0; v.acceleration = 0; v.yawRate = 0; }
  v.wheelSpin = wrap(v.wheelSpin + dist(before, v) / VEHICLE.tireRadius * Math.sign(v.speed));
  const wheels = wheelTelemetry(w, dt, oldWheels), total = wheels.reduce((sum, wheel) => sum + wheel.force, 0);
  const pitchTorque = wheels.reduce((sum, wheel) => sum + wheel.force * wheel.localZ, 0) + v.mass * v.acceleration * .32;
  const rollTorque = wheels.reduce((sum, wheel) => sum + wheel.force * wheel.localX, 0) - v.mass * v.speed * v.yawRate * .26;
  const verticalAcceleration = clamp(total / v.mass - G, -G, 30);
  v.heaveVelocity = clamp(v.heaveVelocity + verticalAcceleration * dt, -3, 3); v.y += v.heaveVelocity * dt;
  v.pitchVelocity = clamp(v.pitchVelocity + pitchTorque / (v.mass * 1.05) * dt, -1.2, 1.2); v.pitch = clamp(v.pitch + v.pitchVelocity * dt, -.28, .28);
  v.rollVelocity = clamp(v.rollVelocity + rollTorque / (v.mass * .58) * dt, -1.2, 1.2); v.roll = clamp(v.roll + v.rollVelocity * dt, -.28, .28);
  if (Math.abs(v.pitch) >= .28) v.pitchVelocity = 0; if (Math.abs(v.roll) >= .28) v.rollVelocity = 0;
  const meanGround = wheels.reduce((sum, wheel) => sum + wheel.groundHeight, 0) / 4, boundedY = clamp(v.y, meanGround + .62, meanGround + 1.5);
  if (boundedY !== v.y) { v.y = boundedY; v.heaveVelocity = 0; }
  v.verticalAcceleration = verticalAcceleration; v.wheels = wheelTelemetry(w, dt, oldWheels);
  w.time += dt; w.stats.distance += dist(before, v); if (Math.abs(v.speed) > .2) w.stats.elapsedMoving += dt;
  w.stats.maxCompression = Math.max(w.stats.maxCompression, ...v.wheels.map(wheel => wheel.compression)); w.stats.bodyAccelSquared += verticalAcceleration * verticalAcceleration * dt; w.stats.suspensionSamples += dt;
  if (w.route.active) { const next = w.route.points[w.route.index], final = w.route.index === w.route.points.length - 1; if (!final && dist(v, next) < 6.5) w.route.index++; }
  if (w.stage === 'return' && !w.checkpoints.bridge && Math.abs(v.x - 32) < 3.6 && Math.abs(v.z) < 9) { w.checkpoints.bridge = true; record(w, 'bridge'); pushLog(w, '东侧桥面测试已通过。沿南侧道路回库，停车提交试车记录。'); }
}
export function stepWorld(w, dt, input = {}) {
  if (!w || w.paused || w.phase !== 'playing' || typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0 || dt > .5 || !validInput(input)) return w;
  let remaining = dt; while (remaining > 1e-9) { const step = Math.min(FIXED_STEP, remaining); integrate(w, step, input); remaining -= step; }
  return w;
}
export function serialize(w) { return JSON.stringify({ ...w, paused: true }); }
export const serializeWorld = serialize;
export function restore(text) {
  try {
    if (typeof text !== 'string' || text.length > 80000) return null;
    const w = JSON.parse(text), n = (a, lo, hi) => typeof a === 'number' && Number.isFinite(a) && a >= lo && a <= hi, integer = (a, lo, hi) => Number.isSafeInteger(a) && n(a, lo, hi), near = (a, b, e = 1e-5) => Math.abs(a - b) <= e;
    if (!w || w.version !== VERSION || !['playing', 'complete'].includes(w.phase) || typeof w.paused !== 'boolean' || !['dispatch', 'load', 'deliver', 'return', 'complete'].includes(w.stage) || !n(w.time, 0, 86400) || !Object.hasOwn(TUNES, w.tune)) return null;
    const v = w.vehicle; if (!v || !n(v.x, -52.45, 52.45) || !n(v.z, -52.45, 52.45) || !n(v.y, -2, 8) || !n(v.heading, -Math.PI, Math.PI) || !n(v.speed, -3.2, 11) || !n(v.yawRate, -2.5, 2.5) || !n(v.steer, -.57, .57) || !n(v.wheelSpin, -Math.PI, Math.PI) || !n(v.heaveVelocity, -3, 3) || !n(v.pitch, -.28, .28) || !n(v.roll, -.28, .28) || !n(v.pitchVelocity, -1.2, 1.2) || !n(v.rollVelocity, -1.2, 1.2) || !n(v.acceleration, -10, 5) || !n(v.verticalAcceleration, -G, 30)) return null;
    if (OBSTACLES.some(o => dist(v, o) < o.radius + VEHICLE.radius - 1e-6)) return null;
    if (!w.cargo || ![0, CARGO_UNITS].includes(w.cargo.units) || w.cargo.mass !== (w.cargo.units ? CARGO_MASS : 0) || v.mass !== VEHICLE.mass + w.cargo.mass || (w.stage === 'deliver') !== (w.cargo.units === CARGO_UNITS)) return null;
    if (!Array.isArray(v.wheels) || v.wheels.length !== 4) return null;
    const expected = wheelTelemetry(w);
    if (v.wheels.some((wheel, i) => {
      if (!wheel || wheel.id !== expected[i].id || wheel.localX !== expected[i].localX || wheel.localZ !== expected[i].localZ || !near(wheel.x, expected[i].x) || !near(wheel.z, expected[i].z) || !near(wheel.groundHeight, expected[i].groundHeight) || !near(wheel.centerY, expected[i].centerY) || !near(wheel.compression, expected[i].compression) || wheel.contact !== expected[i].contact || !n(wheel.groundVelocity, -2.8, 2.8) || !n(wheel.force, 0, TUNES[w.tune].spring * .43 + TUNES[w.tune].damper * 2.8)) return true;
      const tune = TUNES[w.tune], mountVelocity = v.heaveVelocity + v.pitchVelocity * wheel.localZ + v.rollVelocity * wheel.localX;
      const force = wheel.compression > 0 ? clamp(tune.spring * wheel.compression - tune.damper * (mountVelocity - wheel.groundVelocity), 0, tune.spring * .43 + tune.damper * 2.8) : 0;
      return !near(wheel.force, force, .001);
    })) return null;
    const mean = expected.reduce((sum, wheel) => sum + wheel.groundHeight, 0) / 4; if (!n(v.y, mean + .62 - 1e-6, mean + 1.5 + 1e-6)) return null;
    const stats = w.stats; if (!stats || !n(stats.distance, 0, w.time * 11 + .001) || stats.distance + .001 < dist(v, point('garage')) || ![0, 4].includes(stats.loaded) || ![0, 4].includes(stats.delivered) || !integer(stats.collisions, 0, 1000000) || !n(stats.maxCompression, 0, .43) || !n(stats.bodyAccelSquared, 0, w.time * 900 + .001) || !near(stats.suspensionSamples, w.time, .0001) || !n(stats.elapsedMoving, 0, w.time + .001)) return null;
    if (!Array.isArray(w.ledger) || w.ledger.length > 125) return null;
    let stage = 'dispatch', tune = 'comfort', previousTime = 0, previousPoint = point('garage'), loaded = 0, delivered = 0, bridge = false, completedAt = null;
    for (const e of w.ledger) {
      if (!e || !['dispatch', 'load', 'deliver', 'bridge', 'finish', 'tune'].includes(e.kind) || !n(e.time, previousTime, w.time) || !n(e.x, -52.45, 52.45) || !n(e.z, -52.45, 52.45) || !n(e.speed, -3.2, 11) || dist(e, previousPoint) > (e.time - previousTime) * 11 + .05) return null;
      if (e.kind === 'tune') { if (Math.abs(e.speed) > STOP_SPEED || !Object.hasOwn(TUNES, e.tune) || e.tune === tune) return null; tune = e.tune; }
      else if (e.kind === 'bridge') { if (stage !== 'return' || bridge || Math.abs(e.x - 32) >= 3.6 || Math.abs(e.z) >= 9) return null; bridge = true; }
      else {
        const requirement = { dispatch: ['dispatch', 'garage', 'load'], load: ['load', 'depot', 'deliver'], deliver: ['deliver', 'destination', 'return'], finish: ['return', 'garage', 'complete'] }[e.kind];
        if (stage !== requirement[0] || Math.abs(e.speed) > STOP_SPEED || dist(e, point(requirement[1])) > 3.5 || e.kind === 'finish' && !bridge) return null;
        stage = requirement[2]; if (e.kind === 'load') loaded = 4; if (e.kind === 'deliver') delivered = 4; if (e.kind === 'finish') completedAt = e.time;
      }
      previousTime = e.time; previousPoint = e;
    }
    if (stage !== w.stage || tune !== w.tune || stats.loaded !== loaded || stats.delivered !== delivered || dist(v, previousPoint) > (w.time - previousTime) * 11 + .05 || w.completedAt !== completedAt || (w.phase === 'complete') !== (w.stage === 'complete') || w.phase === 'complete' && (w.time !== w.completedAt || v.speed !== 0 || v.yawRate !== 0 || v.acceleration !== 0)) return null;
    if (!w.checkpoints || w.checkpoints.depot !== (loaded === 4) || w.checkpoints.destination !== (delivered === 4) || w.checkpoints.bridge !== bridge || w.checkpoints.garage !== (stage === 'complete')) return null;
    const r = w.route; if (!r || typeof r.active !== 'boolean' || !Array.isArray(r.points) || r.points.length > 5 || !integer(r.index, 0, Math.max(0, r.points.length - 1))) return null;
    if (r.active) { if (!point(r.target) || !r.points.length || r.points.some(p => !p || !ROAD_POINTS.some(q => p.id === q.id && p.x === q.x && p.z === q.z)) || r.points.at(-1).id !== r.target || w.stage === 'dispatch' || w.stage === 'complete') return null; }
    else if (r.target !== null || r.points.length || r.index !== 0) return null;
    if (!Array.isArray(w.log) || !w.log.length || w.log.length > 20 || typeof w.message !== 'string' || w.message.length > 400 || w.log.at(-1).text !== w.message) return null;
    let logTime = 0; for (const e of w.log) { if (!e || !n(e.time, logTime, w.time) || typeof e.text !== 'string' || e.text.length > 400) return null; logTime = e.time; }
    w.paused = true; return structuredClone(w);
  } catch { return null; }
}
export const restoreWorld = restore;
