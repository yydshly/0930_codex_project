import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-vehicle-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
const copy = w => structuredClone(w), fresh = () => { const w = E.createWorld(); assert.ok(E.act(w, 'pause', false).ok); return w; };
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function run(w, seconds, input = {}, dt = .02) { for (let left = seconds; left > 1e-8;) { const tick = Math.min(dt, left); E.stepWorld(w, tick, input); left -= tick; } }
function travel(w, target, dt = .02) {
  assert.ok(E.act(w, 'assist', target).ok);
  for (let i = 0; i < 7000; i++) { E.stepWorld(w, dt, E.driveTo(w, target)); if (distance(w.vehicle, E.WAYPOINTS.find(p => p.id === target)) <= 3.5 && Math.abs(w.vehicle.speed) <= .55) return; }
  assert.fail(`ordinary driving failed to reach ${target}`);
}
function atDepot() { const w = fresh(); assert.ok(E.act(w, 'dispatch').ok); travel(w, 'depot'); run(w, 1, { brake: 1 }); return w; }
function loaded() { const w = atDepot(); assert.ok(E.act(w, 'load').ok); return w; }
function demo(dt = .02, tune = 'comfort', verify = true) {
  const w = fresh(); E.act(w, 'tune', tune); let corrSq = 0, corrN = 0, maxStep = 0, springsDiffered = false;
  for (let i = 0; i < Math.ceil(120 / dt) && w.phase === 'playing'; i++) {
    const before = copy(w.vehicle), plan = E.demoStep(w);
    if (plan.action) assert.ok(E.act(w, plan.action, plan.payload).ok);
    E.stepWorld(w, dt, plan.input);
    const step = distance(before, w.vehicle); maxStep = Math.max(maxStep, step); assert.ok(step <= E.VEHICLE.maxSpeed * dt + 1e-7, 'planner must never teleport');
    if (w.stage === 'deliver' && w.vehicle.x > -20 && w.vehicle.x < 20) { corrSq += w.vehicle.verticalAcceleration ** 2; corrN++; }
    if (Math.max(...w.vehicle.wheels.map(s => s.compression)) - Math.min(...w.vehicle.wheels.map(s => s.compression)) > .02) springsDiffered = true;
    if (verify && i % 100 === 0) assert.ok(E.restore(E.serialize(w)), `in-flight save rejected at ${w.time}`);
  }
  assert.equal(w.phase, 'complete'); assert.equal(w.paused, true); assert.equal(w.stats.delivered, 4); assert.equal(w.stats.collisions, 0); assert.ok(w.time < 90);
  const result = { mode: 'demo ordinary controls', dt, tune, seconds: w.time, distanceMetres: w.stats.distance, collisions: w.stats.collisions, cargoDelivered: w.stats.delivered, maxStep, corrugationBodyRms: Math.sqrt(corrSq / corrN), springsDiffered, ledger: copy(w.ledger) };
  playthroughs.push(result); return { w, result };
}
function bad(w, change) { const forged = copy(w); change(forged); assert.equal(E.restore(JSON.stringify(forged)), null); }
const comfort = demo(), firm = demo(.02, 'firm'), depot = atDepot(), cargo = loaded();

test('fresh worlds are paused empty garage bodies with independent mutable state', () => {
  const a = E.createWorld(), b = E.createWorld(); assert.equal(a.paused, true); assert.equal(a.stage, 'dispatch'); assert.equal(a.time, 0); assert.deepEqual([a.vehicle.x, a.vehicle.z, a.vehicle.heading, a.vehicle.speed], [-32, -32, 0, 0]); assert.deepEqual(a.cargo, { units: 0, mass: 0 }); assert.equal(a.vehicle.mass, 1250); assert.equal(a.stats.delivered, 0);
  a.vehicle.wheels[0].force = 0; a.log[0].text = 'changed'; a.route.points.push({}); assert.notDeepEqual(a.vehicle.wheels, b.vehicle.wheels); assert.notEqual(a.log[0].text, b.log[0].text); assert.equal(b.route.points.length, 0); assert.ok(E.restore(E.serialize(b)));
});
test('the finite 108 metre map exposes real dirt slope corrugation bridge and grass surfaces', () => {
  assert.equal(E.MAP_BOUNDS.maxX - E.MAP_BOUNDS.minX, 108); assert.equal(E.terrainType(-32, -20), 'dirt'); assert.equal(E.terrainType(-32, 20), 'slope'); assert.equal(E.terrainType(0, 32), 'corrugation'); assert.equal(E.terrainType(32, 0), 'bridge'); assert.equal(E.terrainType(0, 0), 'grass'); assert.equal(E.terrainType(55, 0), 'boundary');
  assert.ok(E.terrainHeight(-32, 30) - E.terrainHeight(-32, 0) > 1.5); assert.ok(E.terrainHeight(32, 0) - E.terrainHeight(30, -20) > .4);
});
test('terrain heights normals and transition gradients stay finite across the bounded map', () => {
  for (let x = -54; x <= 54; x += 1.7) for (let z = -54; z <= 54; z += 1.7) { const h = E.terrainHeight(x, z), n = E.terrainNormal(x, z); assert.ok(Number.isFinite(h)); assert.ok(Math.abs(Math.hypot(n.x, n.y, n.z) - 1) < 1e-8); assert.ok(n.y > .65); assert.ok(Math.abs(E.terrainHeight(x + .01, z) - h) < .015); }
});
test('wheel centres use four real axle offsets and current terrain contact height', () => {
  const w = E.createWorld(); assert.equal(w.vehicle.wheels.length, 4); assert.equal(w.vehicle.wheels[0].localZ - w.vehicle.wheels[2].localZ, 2.9); assert.equal(w.vehicle.wheels[1].localX - w.vehicle.wheels[0].localX, 1.76);
  for (const wheel of w.vehicle.wheels) { assert.equal(wheel.groundHeight, E.terrainHeight(wheel.x, wheel.z)); assert.ok(Math.abs(wheel.centerY - wheel.groundHeight - .34) < 1e-8); assert.ok(wheel.force > 0); assert.equal(wheel.contact, true); }
});
test('paused stepping actions and planner preserve the complete body and objective state exactly', () => {
  const w = E.createWorld(), before = E.serialize(w); E.stepWorld(w, .5, { throttle: 1, steer: 1 }); const plan = E.demoStep(w); assert.deepEqual(plan.input, { throttle: 0, steer: 0, brake: 0, reverse: false }); for (const action of ['dispatch', 'load', 'deliver', 'finish', 'tune', 'assist']) assert.equal(E.act(w, action, action === 'tune' ? 'firm' : undefined).ok, false); assert.equal(E.serialize(w), before);
});
test('normal W input continuously accelerates toward positive z without position grants', () => {
  const w = fresh(); for (let i = 0; i < 100; i++) { const z = w.vehicle.z; E.stepWorld(w, .02, { throttle: 1 }); assert.ok(Math.abs(w.vehicle.z - z) <= .22); } assert.ok(w.vehicle.z > -28); assert.ok(w.vehicle.speed > 4); assert.ok(Math.abs(w.vehicle.x + 32) < 1e-8); assert.ok(w.stats.distance > 4); assert.ok(E.restore(E.serialize(w)));
});
test('reverse input drives backward with a bounded reverse speed', () => {
  const w = fresh(); run(w, 7, { throttle: 1, reverse: true }); assert.ok(w.vehicle.z < -37); assert.ok(w.vehicle.speed >= -3.2); assert.ok(w.vehicle.speed < -2); assert.ok(E.restore(E.serialize(w)));
});
test('brake pressure physically stops the vehicle and holds it on the slope', () => {
  const w = fresh(); run(w, 3, { throttle: 1 }); const initial = w.vehicle.speed; run(w, 2, { brake: 1 }); assert.ok(initial > 5); assert.equal(w.vehicle.speed, 0); const p = copy(w.vehicle); run(w, 2, { brake: 1 }); assert.equal(w.vehicle.x, p.x); assert.equal(w.vehicle.z, p.z);
  const slope = copy(depot); run(slope, 5, { brake: 1 }); assert.equal(slope.vehicle.speed, 0);
});
test('left and right steering rotate real forward headings symmetrically', () => {
  const a = fresh(), b = fresh(); run(a, 2, { throttle: 1, steer: -1 }); run(b, 2, { throttle: 1, steer: 1 }); assert.ok(a.vehicle.heading < -.5); assert.ok(b.vehicle.heading > .5); assert.ok(a.vehicle.x < -33); assert.ok(b.vehicle.x > -31); assert.ok(a.vehicle.steer < 0 && b.vehicle.steer > 0);
});
test('four corner spring damper forces integrate genuine heave pitch roll and different compression', () => {
  assert.ok(comfort.result.springsDiffered); const w = fresh(); run(w, 2, { throttle: 1, steer: .5 }); assert.ok(Math.abs(w.vehicle.pitch) > .003); assert.ok(Math.abs(w.vehicle.roll) > .004); assert.ok(Math.abs(w.vehicle.heaveVelocity) > .001); assert.ok(w.vehicle.wheels.some(wheel => Math.abs(wheel.force - 1250 * 9.81 / 4) > 200)); assert.ok(E.restore(E.serialize(w)));
});
test('suspension settles under gravity instead of using canned idle bounce', () => {
  const w = fresh(); run(w, 15, { brake: 1 }); const mean = w.vehicle.wheels.reduce((sum, wheel) => sum + wheel.force, 0); assert.ok(Math.abs(mean - w.vehicle.mass * 9.81) < 1); assert.ok(Math.abs(w.vehicle.heaveVelocity) < .0001); assert.ok(Math.abs(w.vehicle.pitchVelocity) < .0001); assert.ok(Math.abs(w.vehicle.rollVelocity) < .0001);
});
test('body orientation suspension compression and forces stay bounded during a long rough drive', () => {
  const w = fresh(); run(w, 90, { throttle: 1, steer: .48 }); assert.ok(Number.isFinite(w.vehicle.y)); assert.ok(Math.abs(w.vehicle.pitch) <= .28); assert.ok(Math.abs(w.vehicle.roll) <= .28); assert.ok(Math.abs(w.vehicle.heaveVelocity) <= 3); assert.ok(w.vehicle.wheels.every(wheel => wheel.compression >= 0 && wheel.compression <= .43 && Number.isFinite(wheel.force))); assert.ok(E.restore(E.serialize(w)));
});
test('continuous collision bounds contain a held forward throttle at the map edge', () => {
  const w = fresh(); run(w, 25, { throttle: 1 }); assert.ok(w.vehicle.z <= 52.45); assert.ok(w.vehicle.z > 50); assert.equal(w.vehicle.speed, 0); assert.ok(w.stats.collisions >= 1); assert.ok(E.restore(E.serialize(w)));
});
test('building and rock circles block real manual movement without tunnelling', () => {
  const w = fresh(); run(w, 1.8, { throttle: 1, steer: -1 }); run(w, 12, { throttle: 1 }); assert.ok(E.OBSTACLES.every(o => distance(w.vehicle, o) >= o.radius + E.VEHICLE.radius - 1e-6)); assert.ok(w.stats.collisions > 0); assert.ok(E.restore(E.serialize(w)));
});
test('long permitted frames are subdivided and cannot jump through boundaries', () => {
  const w = fresh(); for (let i = 0; i < 50; i++) E.stepWorld(w, .5, { throttle: 1 }); assert.ok(w.vehicle.z <= 52.45); assert.ok(Math.abs(w.vehicle.pitch) <= .28); assert.ok(E.restore(E.serialize(w)));
});
test('invalid nonfinite negative excessive timesteps are atomically rejected', () => {
  const w = fresh(), before = E.serialize(w); for (const dt of [0, -1, NaN, Infinity, .51, 100]) E.stepWorld(w, dt, { throttle: 1 }); assert.equal(E.serialize(w), before);
});
test('malformed and unknown physical controls are atomically rejected', () => {
  const w = fresh(), before = E.serialize(w); for (const input of [null, [], { throttle: NaN }, { steer: Infinity }, { brake: 'yes' }, { reverse: 1 }, { throttle: -1 }, { throttle: 2 }, { steer: -2 }, { teleport: true }]) E.stepWorld(w, .02, input); assert.equal(E.serialize(w), before);
});
test('unknown grant teleport and time override actions never change state', () => {
  const w = fresh(), before = E.serialize(w); for (const action of ['grant', 'teleport', 'complete', 'time', '__proto__', null, 1]) assert.equal(E.act(w, action, { x: 32, z: 32, units: 999 }).ok, false); assert.equal(E.serialize(w), before);
});
test('dispatch requires garage proximity and rejects a moving vehicle', () => {
  const w = fresh(); run(w, 1, { throttle: 1 }); const before = E.serialize(w); assert.equal(E.act(w, 'dispatch').ok, false); assert.equal(E.serialize(w), before); run(w, 2, { brake: 1 }); assert.ok(E.act(w, 'dispatch').ok); assert.equal(E.act(w, 'dispatch').ok, false);
});
test('load delivery and finish reject wrong route stages atomically', () => {
  const w = fresh(), before = E.serialize(w); for (const action of ['load', 'deliver', 'finish']) assert.equal(E.act(w, action).ok, false); assert.equal(E.serialize(w), before); E.act(w, 'dispatch'); assert.equal(E.act(w, 'deliver').ok, false); assert.equal(E.act(w, 'load').ok, false); assert.equal(w.cargo.units, 0);
});
test('fixed payload actions reject forged quantity and location parameters', () => {
  const w = copy(depot), before = E.serialize(w); for (const payload of [{ units: 20 }, '4', 4, null, { x: 32, z: 32 }]) assert.equal(E.act(w, 'load', payload).ok, false); assert.equal(E.serialize(w), before);
});
test('depot loading is available only after a real stopped trip and uses 320 kg', () => {
  assert.ok(depot.stats.distance > 60); assert.equal(E.contextualAction(depot), 'load'); const w = copy(depot); assert.ok(E.act(w, 'load').ok); assert.equal(w.cargo.units, 4); assert.equal(w.cargo.mass, 320); assert.equal(w.vehicle.mass, 1570); assert.equal(w.stats.loaded, 4); assert.equal(w.checkpoints.depot, true); assert.equal(w.stage, 'deliver'); assert.equal(E.act(w, 'load').ok, false); assert.ok(E.restore(E.serialize(w)));
});
test('actual cargo increases static spring compression and lowers the chassis', () => {
  const empty = copy(depot), full = copy(cargo); run(empty, 4, { brake: 1 }); run(full, 4, { brake: 1 }); const emptyCompression = empty.vehicle.wheels.reduce((sum, wheel) => sum + wheel.compression, 0) / 4, fullCompression = full.vehicle.wheels.reduce((sum, wheel) => sum + wheel.compression, 0) / 4; assert.ok(full.vehicle.y < empty.vehicle.y - .025); assert.ok(fullCompression > emptyCompression + .025); assert.ok(Math.abs(fullCompression - emptyCompression - 320 * 9.81 / (4 * 22500)) < .001);
});
test('actual loaded mass reduces throttle acceleration on the same terrain', () => {
  const empty = copy(depot), full = copy(cargo); run(empty, 1.5, { throttle: 1 }); run(full, 1.5, { throttle: 1 }); assert.ok(full.vehicle.speed < empty.vehicle.speed - .35); assert.ok(full.stats.distance < empty.stats.distance); assert.ok(E.restore(E.serialize(full)));
});
test('moving vehicles cannot change spring or damper tuning', () => {
  const w = fresh(); run(w, 1, { throttle: 1 }); const before = E.serialize(w); assert.equal(E.act(w, 'tune', 'firm').ok, false); assert.equal(E.serialize(w), before);
});
test('stopped tuning changes actual constants without granting cargo or moving the vehicle', () => {
  const w = fresh(), p = copy(w.vehicle); assert.ok(E.act(w, 'tune', 'firm').ok); assert.equal(w.vehicle.x, p.x); assert.equal(w.vehicle.z, p.z); assert.equal(w.vehicle.y, p.y); assert.equal(w.vehicle.mass, p.mass); assert.equal(w.tune, 'firm'); assert.ok(w.vehicle.wheels[0].force > p.wheels[0].force); run(w, 3, { brake: 1 }); assert.ok(w.vehicle.y > p.y + .03); assert.ok(E.restore(E.serialize(w)));
});
test('invalid inherited and nonstring tuning modes are atomically rejected', () => {
  const w = fresh(), before = E.serialize(w); for (const tune of ['sport', '__proto__', 'constructor', {}, 1, null]) assert.equal(E.act(w, 'tune', tune).ok, false); assert.equal(E.serialize(w), before);
});
test('comfort absorbs less corrugation body acceleration than the firm tune', () => { assert.ok(comfort.result.corrugationBodyRms > 1); assert.ok(firm.result.corrugationBodyRms > comfort.result.corrugationBodyRms * 1.15); assert.ok(E.TUNES.firm.spring > E.TUNES.comfort.spring); assert.ok(E.TUNES.firm.damper > E.TUNES.comfort.damper); });
test('planner is read-only and returns ordinary input and action intentions', () => {
  const w = fresh(), before = E.serialize(w), plan = E.demoStep(w); assert.equal(plan.action, 'dispatch'); assert.equal(E.serialize(w), before); E.act(w, 'dispatch'); const secondBefore = E.serialize(w), second = E.demoStep(w); assert.equal(second.action, 'assist'); assert.equal(second.payload, 'depot'); assert.equal(E.serialize(w), secondBefore); E.act(w, second.action, second.payload); const thirdBefore = E.serialize(w), third = E.demoStep(w); assert.ok(third.input.throttle > 0); assert.equal(E.serialize(w), thirdBefore);
});
test('assist target validation requires the real dispatch and a known station', () => {
  const w = fresh(); assert.equal(E.act(w, 'assist', 'depot').ok, false); E.act(w, 'dispatch'); const before = E.serialize(w); for (const id of ['anywhere', { x: 32, z: 32 }, null, '__proto__']) assert.equal(E.act(w, 'assist', id).ok, false); assert.equal(E.serialize(w), before); assert.ok(E.act(w, 'assist', 'depot').ok);
});
test('cancel assist leaves the physical vehicle cargo and progress untouched', () => {
  const w = fresh(); E.act(w, 'dispatch'); E.act(w, 'assist', 'depot'); run(w, 1, E.driveTo(w, 'depot')); const body = copy(w.vehicle), stats = copy(w.stats), stage = w.stage; assert.ok(E.act(w, 'cancel-assist').ok); assert.deepEqual(w.vehicle, body); assert.deepEqual(w.stats, stats); assert.equal(w.stage, stage); assert.deepEqual(w.route, { active: false, target: null, points: [], index: 0 });
});
test('paused active assist cannot change its route or body before resuming', () => {
  const w = fresh(); E.act(w, 'dispatch'); E.act(w, 'assist', 'depot'); run(w, 1, E.driveTo(w, 'depot')); E.act(w, 'pause', true); const before = E.serialize(w); assert.equal(E.act(w, 'cancel-assist').ok, false); assert.equal(E.act(w, 'assist', 'destination').ok, false); E.stepWorld(w, .1, { throttle: 1 }); assert.equal(E.serialize(w), before); assert.ok(E.act(w, 'pause', false).ok); assert.ok(E.act(w, 'cancel-assist').ok);
});
test('ordinary demo runs the ordered real depot cargo delivery bridge return sequence', () => {
  assert.deepEqual(comfort.w.ledger.map(e => e.kind), ['dispatch', 'load', 'deliver', 'bridge', 'finish']); assert.deepEqual(comfort.w.checkpoints, { depot: true, destination: true, bridge: true, garage: true }); assert.equal(comfort.w.cargo.units, 0); assert.ok(comfort.w.stats.distance > 240); assert.ok(comfort.w.stats.distance < 280); assert.ok(comfort.w.completedAt < 90); assert.ok(E.restore(E.serialize(comfort.w)));
});
test('demo remains an ordinary complete loop under 50 millisecond frames', () => { const { w } = demo(.05); assert.ok(w.time < 90); assert.ok(E.restore(E.serialize(w))); });
test('double speed sized 100 millisecond frames complete and preserve suspension stability', () => { const { w } = demo(.1); assert.ok(w.time < 90); assert.ok(w.vehicle.wheels.every(s => s.compression <= .43)); assert.ok(E.restore(E.serialize(w))); });
test('manual pointer assist plus contextual actions complete without invoking demoStep', () => {
  const w = fresh(); E.act(w, 'dispatch'); travel(w, 'depot'); assert.ok(E.act(w, 'load').ok); travel(w, 'destination'); assert.ok(E.act(w, 'deliver').ok); travel(w, 'garage'); assert.ok(E.act(w, 'finish').ok); assert.equal(w.phase, 'complete'); assert.ok(w.checkpoints.bridge); assert.equal(w.stats.collisions, 0); playthroughs.push({ mode: 'manual pointer assist and contextual handoffs', seconds: w.time, distanceMetres: w.stats.distance, ledger: copy(w.ledger) }); assert.ok(E.restore(E.serialize(w)));
});
test('completion freezes bodies route cargo clock and statistics permanently', () => {
  const w = copy(comfort.w); assert.equal(w.vehicle.speed, 0); assert.equal(w.vehicle.yawRate, 0); assert.equal(w.vehicle.acceleration, 0); const before = E.serialize(w); run(w, 10, { throttle: 1, steer: 1 }); E.demoStep(w); assert.equal(E.act(w, 'pause', false).ok, false); assert.equal(E.act(w, 'load').ok, false); assert.equal(E.serialize(w), before); const restored = E.restore(before); assert.ok(restored); assert.equal(restored.vehicle.speed, 0); assert.equal(E.serialize(restored), before);
});
test('restoring in-flight loaded saves preserves the exact world and forces paused state', () => {
  const w = copy(cargo); E.act(w, 'assist', 'destination'); run(w, 2, E.driveTo(w, 'destination')); const saved = E.serialize(w), restored = E.restore(saved); assert.ok(restored); assert.equal(restored.paused, true); assert.equal(E.serialize(restored), saved); E.stepWorld(restored, .1, { throttle: 1 }); assert.equal(E.serialize(restored), saved); assert.deepEqual(restored.vehicle.wheels, w.vehicle.wheels); assert.equal(restored.cargo.mass, 320);
});
test('saved loaded runs resume ordinary delivery bridge crossing and garage completion', () => {
  const w = E.restore(E.serialize(cargo)); assert.ok(w); E.act(w, 'pause', false); for (let i = 0; i < 5000 && w.phase === 'playing'; i++) { const plan = E.demoStep(w); if (plan.action) E.act(w, plan.action, plan.payload); E.stepWorld(w, .02, plan.input); } assert.equal(w.phase, 'complete'); assert.equal(w.stats.delivered, 4);
});
test('strict saves reject unsupported version malformed data and oversized text', () => { for (const text of [null, 2, '', '{', 'null', '[]', 'x'.repeat(80001)]) assert.equal(E.restore(text), null); bad(cargo, w => w.version = 2); bad(cargo, w => w.phase = 'won'); bad(cargo, w => w.paused = 1); });
test('strict saves reject nonfinite out of range and relocated bodies', () => { bad(cargo, w => w.vehicle.x = 100); bad(cargo, w => w.vehicle.z = NaN); bad(cargo, w => w.vehicle.y = 7); bad(cargo, w => w.vehicle.heading = 9); bad(cargo, w => w.vehicle.speed = 20); bad(cargo, w => w.vehicle.pitch = 1); bad(cargo, w => w.vehicle.heaveVelocity = 20); bad(cargo, w => w.vehicle.yawRate = 12); bad(E.createWorld(), w => w.vehicle.z += 2); });
test('strict saves reject wheel offset contact ground height compression and force forgery', () => { bad(cargo, w => w.vehicle.wheels.pop()); bad(cargo, w => w.vehicle.wheels[0].localX = 2); bad(cargo, w => w.vehicle.wheels[0].groundHeight += .1); bad(cargo, w => w.vehicle.wheels[0].centerY += .1); bad(cargo, w => w.vehicle.wheels[0].compression += .1); bad(cargo, w => w.vehicle.wheels[0].force += 10); bad(cargo, w => w.vehicle.wheels[0].contact = false); });
test('strict saves reject invented loads detached mass and forged output counters', () => { bad(cargo, w => w.cargo.units = 20); bad(cargo, w => w.cargo.mass = 3200); bad(cargo, w => w.vehicle.mass = 1250); bad(cargo, w => w.stats.loaded = 0); bad(cargo, w => w.stats.delivered = 4); bad(cargo, w => w.stage = 'return'); bad(depot, w => { w.cargo = { units: 4, mass: 320 }; w.vehicle.mass = 1570; }); });
test('strict saves reject missing reordered remote moving or future handoff records', () => { bad(cargo, w => w.ledger.pop()); bad(cargo, w => w.ledger.reverse()); bad(cargo, w => w.ledger[1].x = 0); bad(cargo, w => w.ledger[1].speed = 3); bad(cargo, w => w.ledger[1].time = w.time + 1); bad(cargo, w => w.ledger[0].time = -1); bad(cargo, w => w.ledger[1].kind = 'grant'); });
test('strict saves reject false bridge checkpoints and forged completion records', () => { bad(cargo, w => w.checkpoints.bridge = true); bad(comfort.w, w => w.ledger = w.ledger.filter(e => e.kind !== 'bridge')); bad(comfort.w, w => w.ledger.find(e => e.kind === 'bridge').x = 0); bad(comfort.w, w => w.completedAt++); bad(comfort.w, w => w.phase = 'playing'); bad(comfort.w, w => w.checkpoints.garage = false); bad(comfort.w, w => w.vehicle.speed = .4); bad(comfort.w, w => w.vehicle.yawRate = .01); bad(comfort.w, w => w.vehicle.acceleration = .1); });
test('strict saves reject detached tune changed moving tune and unknown tune records', () => { bad(cargo, w => w.tune = 'firm'); const w = fresh(); E.act(w, 'tune', 'firm'); bad(w, w => w.ledger[0].speed = 2); bad(w, w => w.ledger[0].tune = 'sport'); bad(w, w => w.tune = '__proto__'); assert.ok(E.restore(E.serialize(w))); });
test('strict saves reject invalid route target waypoint list index or inactive path', () => { const w = copy(cargo); E.act(w, 'assist', 'destination'); bad(w, w => w.route.target = 'missing'); bad(w, w => w.route.points[0].x = 0); bad(w, w => w.route.index = 20); bad(w, w => w.route.active = false); bad(w, w => w.route.points = []); assert.ok(E.restore(E.serialize(w))); });
test('strict saves reject impossible distance time roughness and counter statistics', () => { bad(cargo, w => w.stats.distance = 0); bad(cargo, w => w.stats.distance = w.time * 11 + 2); bad(cargo, w => w.stats.suspensionSamples++); bad(cargo, w => w.stats.maxCompression = 1); bad(cargo, w => w.stats.collisions = -1); bad(cargo, w => w.stats.bodyAccelSquared = -1); bad(cargo, w => w.stats.elapsedMoving = w.time + 1); bad(cargo, w => w.time = -1); });
test('strict saves reject nonfinite future reordered oversized and detached log entries', () => { bad(cargo, w => w.log[0].time = NaN); bad(cargo, w => w.log[0].time = w.time + 1); bad(cargo, w => w.log.reverse()); bad(cargo, w => w.log[0].text = 'x'.repeat(401)); bad(cargo, w => w.message = 'detached'); bad(cargo, w => w.log = []); });

const report = { date: '2026-10-05', passed: failures.length === 0, count: checks.length, checks, failures, playthroughs, method: 'Production continuous x/z bicycle driving at ordinary throttle/steer/brake values. Four independent terrain-contact springs and dampers integrate chassis heave/pitch/roll in at-most 1/120 second substeps. All objective playthroughs begin at the paused empty garage, drive the real 254 metre loop, perform stopped proximity handoffs, carry the fixed 320 kg payload, cross the bridge, and stop back at the garage. Demo planner returns intentions without mutating physics, inventory, objectives or time. No route teleports, supplies grants, objective overrides or simulation time overrides. Paused exact restoration, mass-dependent acceleration and spring compression, tune-dependent measured corrugation response, collisions, finite boundaries, and versioned body/action/load/ledger validation are exercised.', commands: ['node tooling/check-direction-vehicle-rules.mjs'] };
fs.writeFileSync(path.join(project, 'notes/direction-vehicle-rules-20261005.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${checks.length} vehicle rules checks passed; ${failures.length} failed`); if (failures.length) process.exitCode = 1;
