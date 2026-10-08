import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-space-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const copy = w => structuredClone(w);
const speed = w => Math.hypot(w.ship.vx, w.ship.vz);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
function run(w, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds / 0.04); i++) E.stepWorld(w, 0.04, input); }
function until(w, predicate, seconds = 110) { for (let i = 0; i < Math.ceil(seconds / 0.04) && !predicate(w); i++) E.stepWorld(w, 0.04); assert.ok(predicate(w), `condition missing at ${w.time.toFixed(2)}s`); }
function fly(w, target) { assert.ok(E.act(w, 'target', target).ok); assert.ok(E.act(w, 'autopilot', true).ok); until(w, z => !z.autopilot); if (target !== 'survey') assert.equal(w.docked, target); }
function fresh() { const w = E.createWorld(); w.demoAuto = false; return w; }
function demo(dt = 0.04) { const w = E.createWorld(); for (let i = 0; i < Math.ceil(110 / dt) && w.phase !== 'completed'; i++) E.demoStep(w, dt); return w; }

test('world starts at the real dawn port with independent inventories and legal targets', () => {
  const a = E.createWorld(), b = E.createWorld(); assert.equal(a.docked, 'dawn'); assert.equal(a.credits, 360); assert.equal(a.fuel, 100); assert.equal(a.capacity, 6);
  assert.deepEqual([a.ship.x, a.ship.z, a.ship.vx, a.ship.vz], [0, 0, 0, 0]); assert.equal(typeof E.objective(a), 'string');
  a.cargo.ore = 2; a.log[0].text = 'modified'; assert.equal(b.cargo.ore, 0); assert.notEqual(b.log[0].text, 'modified');
  for (const target of [...E.PORTS, E.SURVEY]) assert.ok(E.act(b, 'target', target.id).ok);
  assert.equal(E.PORTS.length, 3); assert.equal(E.SURVEY.z, -130);
});
test('heading zero applies acceleration along negative z and release retains physical inertia', () => {
  const w = fresh(); E.act(w, 'undock'); run(w, 1, { thrust: 1 });
  assert.ok(Math.abs(w.ship.vx) < 1e-8); assert.ok(Math.abs(w.ship.vz + 10) < 1e-8); const z = w.ship.z, v = w.ship.vz;
  run(w, 1); assert.ok(Math.abs(w.ship.vz - v) < 1e-8); assert.ok(Math.abs((z - w.ship.z) - 10) < 1e-8);
});
test('positive turning changes heading and forward thrust, while negative thrust reverses velocity', () => {
  const w = fresh(); E.act(w, 'undock'); run(w, 0.4, { turn: 1 }); assert.ok(w.ship.heading > 0.65);
  run(w, 0.4, { thrust: 1 }); assert.ok(w.ship.vx > 2 && w.ship.vz < 0); run(w, 0.4, { thrust: -1 }); assert.ok(speed(w) < 1e-7);
  run(w, 0.2, { thrust: -1 }); assert.ok(w.ship.vx < 0 && w.ship.vz > 0);
});
test('braking lowers speed to zero without inventing reverse motion', () => {
  const w = fresh(); E.act(w, 'undock'); run(w, 1, { thrust: 1 }); const z = w.ship.z;
  run(w, 0.2, { brake: true }); assert.ok(speed(w) < 7.3 && speed(w) > 7); run(w, 2, { brake: true }); assert.equal(speed(w), 0); assert.ok(w.ship.z < z);
  const stopped = w.ship.z; run(w, 1); assert.equal(w.ship.z, stopped);
});
test('boost genuinely raises acceleration14 and maximum30 while ordinary flight remains10 and22', () => {
  for (const boost of [false, true]) {
    const w = fresh(); E.act(w, 'undock'); run(w, 1, { thrust: 1, boost }); assert.ok(Math.abs(speed(w) - (boost ? 14 : 10)) < 1e-8);
    run(w, 10, { thrust: 1, boost }); assert.ok(speed(w) <= (boost ? 30 : 22) + 0.000001); assert.ok(speed(w) > (boost ? 29.9 : 21.9));
    if (boost) { const v = speed(w); run(w, 0.5); assert.ok(Math.abs(speed(w) - v) < 1e-8, 'releasing boost keeps real inertia'); }
  }
  const w = fresh(); E.act(w, 'undock'); run(w, 0.5, { boost: true }); assert.ok(speed(w) > 6.9); assert.equal(w.ship.boosting, true); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('ordinary autopilot turns and moves every frame, brakes and docks without teleportation', () => {
  const w = fresh(); E.act(w, 'target', 'forge'); E.act(w, 'autopilot', true); let turning = false, cruising = false, slowing = false, oldSpeed = 0;
  for (let i = 0; i < 1500 && w.autopilot; i++) {
    const p = copy(w.ship); E.stepWorld(w, 0.04); const s = speed(w);
    assert.ok(distance(w.ship, p) <= 22 * 0.04 + 1e-8); if (Math.abs(w.ship.heading) > 0.2) turning = true;
    if (s > 15) cruising = true; if (oldSpeed > 10 && s < oldSpeed) slowing = true; oldSpeed = s;
  }
  assert.equal(w.docked, 'forge'); assert.ok(turning && cruising && slowing); assert.ok(w.stats.distance > 100);
  assert.ok(distance(w.ship, E.PORTS[1]) < 8); assert.equal(speed(w), 0); assert.notDeepEqual([w.ship.x, w.ship.z], [80, -65]);
});
test('manual controls interrupt both demonstration and autopilot immediately', () => {
  const w = E.createWorld(); E.demoStep(w, 0.04); assert.equal(w.autopilot, true);
  E.stepWorld(w, 0.04, { turn: -1 }); assert.equal(w.autopilot, false); assert.equal(w.demoAuto, false); assert.equal(w.stats.manualTakeovers, 1);
  const before = w.ship.heading; E.demoStep(w, 0.2); assert.equal(w.ship.heading, before);
});
test('docking requires strict distance and speed limits and never moves the model', () => {
  const w = fresh(); E.act(w, 'undock'); w.ship.x = 8; assert.equal(E.act(w, 'dock', 'dawn').ok, false);
  w.ship.x = 7.9; w.ship.vx = 3; assert.equal(E.act(w, 'dock', 'dawn').ok, false);
  w.ship.vx = 2.9; const x = w.ship.x; assert.ok(E.act(w, 'dock', 'dawn').ok); assert.equal(w.ship.x, x); assert.equal(speed(w), 0);
  assert.equal(E.act(w, 'dock', 'survey').ok, false); assert.equal(E.act(w, 'undock').ok, true);
});
test('courier cargo occupies two real slots and cannot be sold as free stock or accepted twice', () => {
  const w = fresh(); assert.ok(E.act(w, 'courier').ok); assert.equal(w.cargo.medicine, 2); assert.equal(w.credits, 360);
  const before = E.serializeWorld(w); assert.equal(E.act(w, 'sell', 'medicine').ok, false); assert.equal(E.act(w, 'courier').ok, false); assert.equal(E.serializeWorld(w), before);
  for (let i = 0; i < 4; i++) assert.ok(E.act(w, 'buy', 'ore').ok); assert.equal(w.cargo.medicine + w.cargo.ore, 6);
  assert.equal(E.act(w, 'buy', 'medicine').ok, false); assert.equal(w.credits, 264);
});
test('transport reward is paid only after real forge docking and is separate from trade profit', () => {
  const w = fresh(); E.act(w, 'courier'); E.act(w, 'buy', 'medicine'); assert.equal(w.credits, 340);
  assert.equal(E.act(w, 'courier').ok, false); fly(w, 'forge'); assert.ok(E.act(w, 'courier').ok);
  assert.equal(w.credits, 520); assert.equal(w.cargo.medicine, 1); assert.equal(w.profit, 0); assert.equal(E.act(w, 'courier').ok, false);
  assert.ok(E.act(w, 'sell', 'medicine').ok); assert.equal(w.credits, 580); assert.equal(w.profit, 40); assert.equal(w.cargo.medicine, 0);
});
test('ordinary ore trade uses forge and verdant prices and consumes actual stock', () => {
  const w = fresh(); fly(w, 'forge'); E.act(w, 'buy', 'ore'); assert.equal(w.credits, 348); fly(w, 'verdant'); E.act(w, 'sell', 'ore');
  assert.equal(w.credits, 382); assert.equal(w.profit, 22); assert.equal(w.cargo.ore, 0); assert.equal(E.act(w, 'sell', 'ore').ok, false);
});
test('prices and cost-basis accounting include losing trades and reject unknown or airborne market actions', () => {
  const w = fresh(); const before = E.serializeWorld(w); assert.equal(E.act(w, 'buy', 'gold').ok, false); assert.equal(E.serializeWorld(w), before);
  fly(w, 'forge'); E.act(w, 'buy', 'medicine'); E.act(w, 'undock'); const airborne = E.serializeWorld(w);
  assert.equal(E.act(w, 'sell', 'medicine').ok, false); assert.equal(E.serializeWorld(w), airborne); fly(w, 'dawn'); E.act(w, 'sell', 'medicine');
  assert.equal(w.profit, -40); assert.equal(w.credits, 320); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('survey needs low speed, real proximity and a continuous five-second scan', () => {
  const w = fresh(); E.act(w, 'undock'); run(w, 6, { scan: true }); assert.equal(w.survey.progress, 0);
  fly(w, 'survey'); run(w, 4.92, { scan: true }); assert.ok(w.survey.progress > 4.8 && !w.survey.complete);
  E.stepWorld(w, 0.04); assert.equal(w.survey.progress, 0); run(w, 5, { scan: true }); assert.equal(w.survey.progress, 5); assert.equal(w.survey.complete, true);
  assert.equal(E.act(w, 'survey').ok, false); assert.equal(w.survey.settled, false); fly(w, 'dawn'); const credits = w.credits;
  assert.ok(E.act(w, 'survey').ok); assert.equal(w.credits, credits + 150); assert.equal(E.act(w, 'survey').ok, false);
});
test('scanning at excessive speed or outside the beacon radius cannot accumulate progress', () => {
  const w = fresh(); fly(w, 'survey'); w.ship.vx = 4; E.stepWorld(w, 0.04, { scan: true }); assert.equal(w.survey.progress, 0);
  w.ship.vx = 0; w.ship.x = E.SURVEY.x + 15; w.ship.z = E.SURVEY.z; E.stepWorld(w, 0.04, { scan: true }); assert.equal(w.survey.progress, 0);
});
test('fuel burns with actual engine work, empty tanks cannot accelerate, and paid refuel conserves credits', () => {
  const w = fresh(); E.act(w, 'undock'); run(w, 1, { thrust: 1 }); assert.ok(Math.abs(w.fuel - 99.68) < 1e-8); const fuel = w.fuel; run(w, 1); assert.equal(w.fuel, fuel);
  fly(w, 'dawn'); const cost = Math.ceil((100 - w.fuel) * 1.2 - 1e-9), credits = w.credits; assert.ok(E.act(w, 'refuel').ok); assert.equal(w.fuel, 100); assert.equal(w.credits, credits - cost); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  const empty = fresh(); E.act(empty, 'undock'); empty.fuel = 0; run(empty, 1, { thrust: 1, boost: true }); assert.equal(speed(empty), 0); assert.equal(E.act(empty, 'autopilot', true).ok, false);
});
test('ordinary demo completes within110 simulated seconds using continuous flights and finite cargo', () => {
  const w = E.createWorld(); let sawCargo = false, scanned = false;
  for (let n = 0; n < 2750 && w.phase !== 'completed'; n++) {
    const before = copy(w.ship), time = w.time; E.demoStep(w, 0.04); assert.ok(Math.abs(w.time - time - 0.04) < 1e-8, 'one physics step per demo call');
    assert.ok(distance(w.ship, before) <= 22 * 0.04 + 1e-8, 'demo cannot teleport'); assert.ok(w.cargo.medicine + w.cargo.ore <= 6);
    if (w.cargo.medicine === 3) sawCargo = true; if (w.survey.progress > 0 && !w.survey.complete) scanned = true;
  }
  assert.equal(w.phase, 'completed'); assert.ok(w.time <= 110 && sawCargo && scanned); assert.equal(w.credits, 730); assert.equal(w.profit, 40);
  assert.ok(w.courier.delivered && w.survey.settled); assert.equal(w.docked, 'dawn'); assert.ok(w.stats.distance > 300); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  playthroughs.push({ kind: 'ordinary demo', seconds: w.time, credits: w.credits, profit: w.profit, stats: w.stats });
});
test('manual ordinary commands reproduce the same transport, sale, scan and return solution', () => {
  const w = fresh(); E.act(w, 'courier'); E.act(w, 'buy', 'medicine'); fly(w, 'forge'); E.act(w, 'courier'); E.act(w, 'sell', 'medicine'); fly(w, 'survey'); run(w, 5, { scan: true }); fly(w, 'dawn'); E.act(w, 'survey');
  assert.equal(w.phase, 'completed'); assert.equal(w.credits, 730); assert.equal(w.profit, 40); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  playthroughs.push({ kind: 'ordinary manual commands', seconds: w.time, credits: w.credits, profit: w.profit, stats: w.stats });
});
test('completion permits further flight and losing trades without revoking the recorded achievement', () => {
  const w = demo(); const completedAt = w.completedAt; assert.equal(completedAt, w.completionTime); fly(w, 'forge'); E.act(w, 'buy', 'medicine'); fly(w, 'dawn'); E.act(w, 'sell', 'medicine');
  assert.equal(w.profit, 0); assert.equal(w.phase, 'completed'); assert.equal(w.completedAt, completedAt); assert.equal(w.completionTime, completedAt); assert.ok(w.time > completedAt); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('normal long sessions remain restorable beyond7200 seconds without an arbitrary expiry', () => {
  const w = fresh(); for (let i = 0; i < 1441; i++) E.stepWorld(w, 5);
  assert.ok(w.time > 7200); assert.ok(E.restoreWorld(E.serializeWorld(w))); assert.equal(w.credits, 360);
});
test('explicit rescue waits six seconds without moving, preserves cargo and tasks, then returns to dawn with20 fuel', () => {
  const w = fresh(); E.act(w, 'courier'); E.act(w, 'buy', 'medicine'); E.act(w, 'undock'); run(w, 173, { boost: true }); assert.ok(w.fuel < 1);
  const before = copy(w), credits = w.credits; assert.ok(E.act(w, 'rescue').ok); assert.equal(w.credits, credits - 80); assert.equal(w.rescue.remaining, 6);
  for (const action of ['target', 'autopilot', 'courier', 'buy', 'refuel', 'rescue']) assert.equal(E.act(w, action, 'forge').ok, false);
  run(w, 1, { thrust: 1, turn: 1 }); assert.equal(w.ship.x, before.ship.x); assert.equal(w.ship.z, before.ship.z); assert.equal(w.rescue.remaining.toFixed(1), '5.0');
  assert.ok(E.restoreWorld(E.serializeWorld(w))); w.paused = true; const frozen = E.serializeWorld(w); E.stepWorld(w, 5); assert.equal(E.serializeWorld(w), frozen); w.paused = false;
  run(w, 5); assert.equal(w.rescue, null); assert.equal(w.docked, 'dawn'); assert.equal(w.fuel, 20); assert.equal(speed(w), 0); assert.deepEqual([w.ship.x, w.ship.z], [0, 0]);
  assert.deepEqual(w.cargo, before.cargo); assert.deepEqual(w.courier, before.courier); assert.deepEqual(w.survey, before.survey); assert.equal(w.profit, before.profit); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  assert.equal(E.act(w, 'rescue').ok, false, 'no repeated fuel grants while docked');
  const finished = demo(), achievement = finished.completedAt, survey = copy(finished.survey);
  E.act(finished, 'undock'); run(finished, 173, { boost: true }); assert.ok(E.act(finished, 'rescue').ok); run(finished, 6);
  assert.deepEqual(finished.survey, survey); assert.equal(finished.completedAt, achievement); assert.equal(finished.profit, 40); assert.equal(finished.phase, 'completed'); assert.ok(E.restoreWorld(E.serializeWorld(finished)));
});
test('low-credit and zero-credit rescue charges only available credits and records all fuel and fee changes', () => {
  const w = fresh();
  for (const units of [4, 3, 1]) { fly(w, 'forge'); for (let i = 0; i < units; i++) E.act(w, 'buy', 'medicine'); fly(w, 'dawn'); for (let i = 0; i < units; i++) E.act(w, 'sell', 'medicine'); }
  assert.equal(w.credits, 40); assert.equal(w.profit, -320); E.act(w, 'undock'); run(w, 173, { boost: true }); assert.ok(E.act(w, 'rescue').ok); assert.equal(w.credits, 0); run(w, 6);
  assert.equal(w.stats.rescueSpent, 40); assert.equal(w.fuel, 20); E.act(w, 'undock'); run(w, 35, { boost: true }); assert.ok(E.act(w, 'rescue').ok); run(w, 6);
  assert.equal(w.credits, 0); assert.equal(w.stats.rescueSpent, 40); assert.equal(w.stats.rescues, 2); assert.equal(w.fuel, 20); assert.equal(w.profit, -320); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('rescue is unavailable in demonstrations or with fuel, and forged rescue or completion records are rejected', () => {
  const w = E.createWorld(); assert.equal(E.act(w, 'rescue').ok, false); w.demoAuto = false; E.act(w, 'undock'); assert.equal(E.act(w, 'rescue').ok, false);
  const bad = change => { const s = copy(w); change(s); assert.equal(E.restoreWorld(JSON.stringify(s)), null); };
  bad(s => s.rescue = { remaining: 6 }); bad(s => s.completedAt = 100); bad(s => s.stats.rescueSpent = 80); bad(s => s.ledger.push({ kind: 'rescue-arrive', time: 0, destination: 'dawn', fuelAdded: 20 }));
  run(w, 173, { boost: true }); E.act(w, 'rescue'); const forged = copy(w); forged.rescue.remaining = 2; assert.equal(E.restoreWorld(JSON.stringify(forged)), null);
});
test('pause freezes navigation, scan progress, time, demo actions and market spending', () => {
  const w = E.createWorld(); E.demoStep(w, 2); w.paused = true; const before = E.serializeWorld(w);
  E.demoStep(w, 5); E.stepWorld(w, 5, { thrust: 1, scan: true }); for (const action of ['undock', 'courier', 'buy', 'autopilot', 'survey']) assert.equal(E.act(w, action, 'medicine').ok, false);
  assert.equal(E.serializeWorld(w), before);
});
test('midflight and partial-scan saves restore paused and resume deterministic ordinary navigation', () => {
  const w = E.createWorld(); for (let n = 0; n < 250; n++) E.demoStep(w, 0.04); const other = E.restoreWorld(E.serializeWorld(w)); assert.ok(other?.paused);
  const frozen = E.serializeWorld(other); E.demoStep(other, 1); assert.equal(E.serializeWorld(other), frozen); other.paused = false;
  while (w.phase !== 'completed') E.demoStep(w, 0.04); while (other.phase !== 'completed') E.demoStep(other, 0.04); assert.equal(E.serializeWorld(other), E.serializeWorld(w));
  const scan = fresh(); fly(scan, 'survey'); run(scan, 2, { scan: true }); assert.ok(E.restoreWorld(E.serializeWorld(scan)));
});
test('all demo stages and common frame intervals maintain valid legal saves', () => {
  for (const dt of [1 / 60, 0.04, 0.1, 0.25]) {
    const w = E.createWorld(); for (let n = 0; n < Math.ceil(110 / dt) && w.phase !== 'completed'; n++) { E.demoStep(w, dt); if (n % 19 === 0) assert.ok(E.restoreWorld(E.serializeWorld(w))); }
    assert.equal(w.phase, 'completed'); assert.ok(w.time <= 110); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  }
});
test('strict saves reject schema, nonfinite motion, forged cash, cargo, profit, fuel, tasks and ledgers', () => {
  const source = fresh(), bad = change => { const w = copy(source); change(w); assert.equal(E.restoreWorld(JSON.stringify(w)), null); };
  bad(w => w.schema = 2); bad(w => w.mapId = 'other'); bad(w => w.scenario = 'unknown'); bad(w => w.target = 'missing'); bad(w => w.docked = 'survey');
  bad(w => w.ship.x = NaN); bad(w => w.ship.vx = Infinity); bad(w => w.ship.vz = 23); bad(w => w.ship.heading = 9); bad(w => w.credits++); bad(w => w.cargo.ore = 1);
  bad(w => w.profit = 40); bad(w => w.fuel = 99); bad(w => w.capacity = 99); bad(w => w.courier.delivered = true); bad(w => w.survey.progress = 5); bad(w => w.phase = 'completed');
  bad(w => w.tradeBasis.ore = [12]); bad(w => w.stats.distance = 50); bad(w => w.ledger.push({ kind: 'survey-settle', time: 0, port: 'dawn', amount: 150 }));
  assert.equal(E.restoreWorld('{}'), null); assert.equal(E.restoreWorld('malformed'), null);
});
test('invalid actions and invalid time steps cannot mutate the production world', () => {
  const w = fresh(), before = E.serializeWorld(w); for (const dt of [-1, NaN, Infinity, 6]) assert.equal(E.stepWorld(w, dt).ok, false);
  for (const input of [null, { turn: NaN }, { thrust: Infinity }, { scan: 'yes' }]) assert.equal(E.stepWorld(w, 0.04, input).ok, false);
  assert.equal(E.act(w, 'target', 'fake').ok, false); assert.equal(E.act(w, 'autopilot', 'yes').ok, false); assert.equal(E.act(w, 'fly-magic').ok, false); assert.equal(E.serializeWorld(w), before);
});

fs.writeFileSync(path.join(project, 'notes/direction-space-rules-20261005.json'), `${JSON.stringify({ passed: failures.length === 0, checks, failures, playthroughs, method: 'Production inertial flight and automatic steering/thrust/braking. Ordinary demonstration and manually repeated port actions have no position teleports, free cargo sales, synthetic task rewards or awarded completion. Explicit user-requested rescue alone waits six seconds then transports the vessel to dawn with ledger-accounted fees/fuel. Dedicated fixtures are limited to exact docking and scanning boundary assertions.', flight: E.FLIGHT, ports: E.PORTS, survey: E.SURVEY }, null, 2)}\n`);
console.log(`${checks.length} space rules checks passed${failures.length ? `; ${failures.length} failed` : ''}`); if (failures.length) process.exitCode = 1;
