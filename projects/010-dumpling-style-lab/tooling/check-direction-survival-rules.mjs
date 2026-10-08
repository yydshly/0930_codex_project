import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-survival-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const copy = w => structuredClone(w), dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
function fresh(mode = 'manual') { const w = E.createWorld({ mode }); w.running = true; return w; }
function run(w, seconds, input = {}, dt = 0.04) { let left = seconds; while (left > 1e-8 && !w.failed) { const tick = Math.min(dt, left); E.stepWorld(w, tick, input); left -= tick; } }
function go(w, id) {
  const o = id === 'camp' ? w.camp : w.objects.find(o => o.id === id); assert.ok(E.targetPoint(w, o.x, o.y).ok);
  for (let i = 0; i < 1000 && w.path.length; i++) E.stepWorld(w, 0.04);
  assert.ok(dist(w.player, o) < 0.001, `walk to ${id} failed`); assert.ok(E.restoreWorld(E.serializeWorld(w)), `save invalid at ${id}`);
}
function gather(w) { for (const id of ['wood-west', 'cabin', 'wreck', 'water', 'wood-east']) { go(w, id); assert.ok(E.act(w, 'interact', id).ok); } }
function campReady(w) { go(w, 'camp'); for (const recipe of ['shelter', 'fire', 'purifier']) assert.ok(E.act(w, 'craft', recipe).ok); assert.ok(E.act(w, 'fuel').ok); }
function prepared() { const w = fresh(); gather(w); campReady(w); return w; }
function demo(dt = 0.04, until = 110) {
  const w = fresh('demo'); for (let i = 0; i < Math.ceil(until / dt) && w.completedAt === null; i++) { E.demoStep(w, dt); E.stepWorld(w, dt); } return w;
}
function bad(source, change) { const w = copy(source); change(w); assert.equal(E.restoreWorld(JSON.stringify(w)), null); }

test('new worlds start paused at the real camp without free supplies and own independent arrays', () => {
  const a = E.createWorld(), b = E.createWorld({ mode: 'demo' }); assert.equal(a.running, false); assert.equal(a.mode, 'manual'); assert.equal(b.mode, 'demo');
  assert.deepEqual([a.player.x, a.player.y, a.time], [5, 10, 0]); assert.ok(Object.values(a.inventory).every(n => n === 0));
  assert.equal(a.camp.fire, false); assert.equal(a.camp.shelter, false); assert.equal(a.signal.sent, false); assert.equal(a.pending, null);
  a.objects[0].depleted = true; a.log[0].text = 'modified'; assert.equal(b.objects[0].depleted, false); assert.notEqual(b.log[0].text, 'modified'); assert.ok(E.restoreWorld(E.serializeWorld(b)));
});
test('the finite map exposes21by15 terrain, a river boundary, a bridge, cabin walls and reachable fixed resources', () => {
  assert.equal(E.MAP.width, 21); assert.equal(E.MAP.height, 15); assert.equal(E.MAP.terrain.length, 15); assert.ok(E.MAP.terrain.every(row => row.length === 21));
  for (let y = 0; y < 15; y++) for (let x = 18; x < 21; x++) assert.equal(E.MAP.terrain[y][x], y === 8 ? 'bridge' : 'river');
  assert.equal(E.MAP.terrain[5][9], 'wall'); const w = fresh(); for (const id of w.objects.map(o => o.id)) go(w, id);
});
test('paused step, demo and actions preserve time, bodies, resources and depletion', () => {
  const w = E.createWorld({ mode: 'demo' }), before = E.serializeWorld(w); E.demoStep(w, 0.04); E.stepWorld(w, 1, { dx: 1 }); assert.equal(E.act(w, 'craft', 'shelter').ok, false); assert.equal(E.serializeWorld(w), before);
});
test('manual WASD motion is three tiles per second and diagonal motion is normalized', () => {
  const a = fresh(), b = fresh(); run(a, 1, { dx: 1 }); run(b, 1, { dx: 1, dy: -1 }); assert.ok(Math.abs(a.player.x - 8) < 1e-8); assert.ok(Math.abs(dist(b.player, { x: 5, y: 10 }) - 3) < 1e-8);
  assert.ok(a.player.moving); run(a, 0.04); assert.equal(a.player.moving, false); assert.ok(E.restoreWorld(E.serializeWorld(a)));
});
test('pointer targets use continuous BFS walking around cabin walls instead of teleporting', () => {
  const w = fresh(); E.targetPoint(w, 9, 6); assert.ok(w.path.some(p => p.x === 9 && p.y === 7));
  const start = copy(w.player); for (let i = 0; i < 200 && w.path.length; i++) { const before = copy(w.player); E.stepWorld(w, 0.04); assert.ok(dist(before, w.player) <= 0.12 + 1e-8); }
  assert.ok(dist(w.player, { x: 9, y: 6 }) < 0.001); assert.ok(w.stats.distance > dist(start, w.player) + 1); assert.equal(w.selected, 'cabin');
});
test('fractional pointer destinations preserve an exact final waypoint and valid in-flight saves', () => {
  const w = fresh(); assert.ok(E.targetPoint(w, 6.005, 10).ok); assert.deepEqual(w.path.at(-1), w.target); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  while (w.path.length) { E.stepWorld(w, 0.04); assert.ok(E.restoreWorld(E.serializeWorld(w))); }
  assert.ok(Math.abs(w.player.x - 6.005) < 0.001); assert.equal(w.target, null);
});
test('river, rock, walls and world edges block bodies even under long held movement', () => {
  const w = fresh(); go(w, 'water'); run(w, 2, { dx: 1 }); assert.ok(w.player.x <= 17.32 + 1e-8); assert.equal(E.targetPoint(w, 18, 7).ok, false);
  assert.ok(E.targetPoint(w, 17, 8).ok); run(w, 1); run(w, 3, { dx: 1 }); assert.ok(w.player.x > 20 && w.player.x <= 20.32 + 1e-8); assert.equal(E.targetPoint(w, 21, 8).ok, false);
  const cabin = fresh(); go(cabin, 'cabin'); run(cabin, 2, { dy: -1 }); assert.ok(cabin.player.y >= 5.68 - 1e-8); run(cabin, 2, { dx: -1 }); assert.ok(cabin.player.x >= 8.68 - 1e-8);
  assert.equal(E.targetPoint(cabin, 2, 3).ok, false); assert.ok(E.restoreWorld(E.serializeWorld(cabin)));
});
test('manual input immediately takes over demonstration and cancels its pointer route', () => {
  const w = fresh('demo'); E.demoStep(w, 0.04); assert.ok(w.path.length); E.stepWorld(w, 0.04, { dy: 1 }); assert.equal(w.mode, 'manual'); assert.equal(w.path.length, 0); assert.equal(w.target, null);
  const before = E.serializeWorld(w); E.demoStep(w, 0.04); assert.equal(E.serializeWorld(w), before);
});
test('interactions require actual proximity and failed actions are atomic', () => {
  const w = fresh(), before = E.serializeWorld(w); for (const action of [['interact', 'cabin'], ['repair'], ['send'], ['fuel'], ['drink'], ['eat'], ['craft', 'shelter'], ['craft', 'magic'], ['grant']]) assert.equal(E.act(w, ...action).ok, false);
  assert.equal(E.serializeWorld(w), before); assert.match(E.act(w, 'interact', 'cabin').reason, /距离/); assert.ok(E.nearestObject(w).distance > 1.2);
});
test('each fixed supply is looted exactly once and depletion survives save restoration', () => {
  const w = fresh(); gather(w); assert.deepEqual(w.inventory, { wood: 18, cloth: 5, scrap: 5, dirty: 1, clean: 0, food: 4 });
  const restored = E.restoreWorld(E.serializeWorld(w)); assert.ok(restored); restored.running = true; go(restored, 'cabin'); const before = E.serializeWorld(restored); assert.equal(E.act(restored, 'interact', 'cabin').ok, false); assert.equal(E.serializeWorld(restored), before);
  assert.equal(restored.objects.filter(o => o.depleted).length, 4);
});
test('keyboard nearest-object interaction updates the actual water cooldown, not a detached view', () => {
  const w = fresh(); go(w, 'water'); w.selected = null; assert.equal(E.nearestObject(w).id, 'water'); assert.ok(E.act(w, 'interact').ok);
  assert.equal(w.inventory.dirty, 1); assert.equal(w.objects.find(o => o.id === 'water').nextAt, w.time + 4); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('water replenishes only after four real seconds and still requires the pump vicinity', () => {
  const w = fresh(); go(w, 'water'); E.act(w, 'interact', 'water'); const before = E.serializeWorld(w); assert.equal(E.act(w, 'interact', 'water').ok, false); assert.equal(E.serializeWorld(w), before);
  run(w, 3.9); assert.equal(E.act(w, 'interact', 'water').ok, false); run(w, 0.1); assert.ok(E.act(w, 'interact', 'water').ok); assert.equal(w.inventory.dirty, 2); assert.equal(w.stats.waterCollected, 2);
  go(w, 'camp'); run(w, 4); assert.equal(E.act(w, 'interact', 'water').ok, false); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('shelter, fire and purifier consume their exact real materials and cannot be built twice', () => {
  const w = prepared(); assert.deepEqual(w.inventory, { wood: 12, cloth: 2, scrap: 3, dirty: 1, clean: 0, food: 4 }); assert.equal(w.camp.fuel, 45);
  assert.deepEqual(E.RECIPES.shelter.cost, { wood: 3, cloth: 2 }); assert.deepEqual(E.RECIPES.fire.cost, { wood: 2, scrap: 1 }); assert.deepEqual(E.RECIPES.purifier.cost, { cloth: 1, scrap: 1 });
  for (const recipe of ['shelter', 'fire', 'purifier']) { const before = E.serializeWorld(w); assert.equal(E.act(w, 'craft', recipe).ok, false); assert.equal(E.serializeWorld(w), before); }
});
test('construction is restricted to the camp and incomplete supplies do not partly spend', () => {
  const w = fresh(); go(w, 'wood-west'); E.act(w, 'interact', 'wood-west'); assert.equal(E.act(w, 'craft', 'fire').ok, false); go(w, 'camp'); const before = E.serializeWorld(w);
  assert.equal(E.act(w, 'craft', 'shelter').ok, false); assert.equal(E.act(w, 'craft', 'fire').ok, false); assert.equal(E.serializeWorld(w), before);
});
test('inherited, nonstring and unknown recipe names are rejected atomically with useful guidance', () => {
  const w = fresh(), before = E.serializeWorld(w); for (const recipe of ['toString', 'constructor', '__proto__', 'magic', ['boil'], {}]) assert.match(E.act(w, 'craft', { recipe }).reason, /没有这种配方/);
  assert.equal(E.serializeWorld(w), before);
});
test('building a fire supplies no free fuel, wood feeds45seconds and fuel burns with real time', () => {
  const w = fresh(); gather(w); go(w, 'camp'); E.act(w, 'craft', 'fire'); assert.equal(w.camp.fuel, 0); const wood = w.inventory.wood; assert.ok(E.act(w, 'fuel').ok); assert.equal(w.inventory.wood, wood - 1);
  run(w, 10); assert.ok(Math.abs(w.camp.fuel - 35) < 1e-8); assert.ok(Math.abs(w.stats.fuelBurned - 10) < 1e-8); assert.equal(w.stats.fuelAdded, 45); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('fuel expires at zero, remains extinguished and cannot be piled above the allowed feed boundary', () => {
  const w = prepared(); run(w, 46); assert.equal(w.camp.fuel, 0); const burned = w.stats.fuelBurned; run(w, 3); assert.equal(w.stats.fuelBurned, burned);
  for (let i = 0; i < 3; i++) assert.ok(E.act(w, 'fuel').ok); assert.equal(w.camp.fuel, 135); const before = E.serializeWorld(w); assert.equal(E.act(w, 'fuel').ok, false); assert.equal(E.serializeWorld(w), before); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('boiling needs camp, a lit fire, a purifier, dirty water and eleven fuel seconds', () => {
  const w = fresh(); gather(w); go(w, 'camp'); assert.equal(E.act(w, 'craft', 'boil').ok, false); E.act(w, 'craft', 'fire'); E.act(w, 'fuel'); assert.equal(E.act(w, 'craft', 'boil').ok, false);
  E.act(w, 'craft', 'purifier'); run(w, 35); const before = E.serializeWorld(w); assert.equal(E.act(w, 'craft', 'boil').ok, false); assert.equal(E.serializeWorld(w), before);
  E.act(w, 'fuel'); go(w, 'water'); assert.equal(E.act(w, 'craft', 'boil').ok, false); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('boil reserves one dirty water and eight fuel, holds movement and produces no water before three seconds', () => {
  const w = prepared(), fuel = w.camp.fuel; assert.ok(E.act(w, 'craft', 'boil').ok); assert.equal(w.inventory.dirty, 0); assert.equal(w.inventory.clean, 0); assert.equal(w.camp.fuel, fuel - 8);
  assert.equal(w.pending.remaining, 3); const before = E.serializeWorld(w); assert.equal(E.act(w, 'drink').ok, false); assert.equal(E.act(w, 'fuel').ok, false); assert.equal(E.serializeWorld(w), before);
  const position = copy(w.player); run(w, 2.9, { dx: 1 }); assert.equal(w.inventory.clean, 0); assert.ok(w.pending); assert.deepEqual([w.player.x, w.player.y], [position.x, position.y]);
  run(w, 0.1); assert.equal(w.pending, null); assert.equal(w.inventory.clean, 1); assert.equal(w.stats.boiled, 1); assert.ok(Math.abs(w.camp.fuel - (fuel - 11)) < 1e-8); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('an unfinished boil survives an exact paused save and resumes only its remaining real duration', () => {
  const w = prepared(); E.act(w, 'craft', 'boil'); run(w, 1.2); const r = E.restoreWorld(E.serializeWorld(w)); assert.ok(r); assert.equal(r.running, false); assert.ok(Math.abs(r.pending.remaining - 1.8) < 1e-8);
  const clock = r.time; E.stepWorld(r, 3); assert.equal(r.time, clock); assert.equal(r.inventory.clean, 0); r.running = true; run(r, 1.7); assert.equal(r.inventory.clean, 0); run(r, 0.1); assert.equal(r.inventory.clean, 1); assert.equal(r.pending, null); assert.ok(E.restoreWorld(E.serializeWorld(r)));
});
test('drinking and eating consume one real item each, restore30 and clamp body meters to100', () => {
  const w = prepared(); E.act(w, 'craft', 'boil'); run(w, 3); const water = w.player.hydration, hunger = w.player.hunger, food = w.inventory.food;
  assert.ok(E.act(w, 'drink').ok); assert.equal(w.player.hydration, Math.min(100, water + 30)); assert.equal(w.inventory.clean, 0); assert.equal(E.act(w, 'drink').ok, false);
  assert.ok(E.act(w, 'eat').ok); assert.equal(w.inventory.food, food - 1); assert.equal(w.player.hunger, Math.min(100, hunger + 30)); assert.equal(w.stats.drinks, 1); assert.equal(w.stats.meals, 1); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('radio repair consumes scrap2cloth1 once, then a separate nearby send establishes the signal', () => {
  const w = fresh(); gather(w); go(w, 'radio'); const scrap = w.inventory.scrap, cloth = w.inventory.cloth; assert.equal(E.act(w, 'send').ok, false);
  assert.ok(E.act(w, 'interact', 'radio').ok); assert.equal(w.inventory.scrap, scrap - 2); assert.equal(w.inventory.cloth, cloth - 1); assert.equal(w.signal.sent, false);
  assert.ok(E.act(w, 'interact', 'radio').ok); assert.equal(w.signal.sent, true); const before = E.serializeWorld(w); assert.equal(E.act(w, 'repair').ok, false); assert.equal(E.act(w, 'send').ok, false); assert.equal(E.serializeWorld(w), before);
  go(w, 'camp'); assert.equal(E.act(w, 'send').ok, false); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('weather follows the published dry, rain, storm, night, dawn schedule and later repeats', () => {
  const w = fresh(); assert.equal(w.weather.id, 'dry'); run(w, 25.01); assert.equal(w.weather.id, 'rain'); run(w, 30); assert.equal(w.weather.id, 'storm'); run(w, 25); assert.equal(w.weather.id, 'night'); run(w, 20); assert.equal(w.weather.id, 'dawn'); run(w, 40); assert.equal(w.weather.id, 'dry'); assert.equal(w.weather.cycle, 1); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('rain raises wetness outdoors while a real shelter keeps its camper dry', () => {
  const wet = fresh(), dry = fresh(); gather(dry); go(dry, 'camp'); E.act(dry, 'craft', 'shelter'); const finish = Math.max(wet.time, dry.time) + 45;
  run(wet, finish - wet.time); run(dry, finish - dry.time); assert.ok(wet.player.wetness > 10); assert.equal(dry.player.wetness, 0); assert.ok(dry.player.temperature > wet.player.temperature); assert.ok(E.restoreWorld(E.serializeWorld(dry)));
});
test('a fueled campfire warms and dries only a player within the actual camp radius', () => {
  const warm = prepared(), cold = copy(warm); go(cold, 'radio'); const final = cold.time + 35; run(warm, final - warm.time); run(cold, final - cold.time); assert.ok(warm.player.temperature > cold.player.temperature); assert.equal(warm.player.wetness, 0); assert.ok(cold.player.wetness > 10); assert.ok(E.restoreWorld(E.serializeWorld(cold)));
});
test('ordinary demo planning never advances time and physics advances exactly once per call', () => {
  const w = fresh('demo'); let sawBoil = false, sawRain = false, sawStorm = false, sawNight = false;
  for (let i = 0; i < 2800 && w.completedAt === null; i++) { const p = copy(w.player), time = w.time; E.demoStep(w, 0.04); assert.equal(w.time, time); E.stepWorld(w, 0.04); assert.ok(Math.abs(w.time - time - 0.04) < 1e-8); assert.ok(dist(w.player, p) <= 0.12 + 1e-8); sawBoil ||= !!w.pending; sawRain ||= w.weather.id === 'rain'; sawStorm ||= w.weather.id === 'storm'; sawNight ||= w.weather.id === 'night'; }
  assert.ok(w.completedAt !== null && sawBoil && sawRain && sawStorm && sawNight); assert.ok(w.time >= 100 && w.time < 101); assert.ok(w.stats.distance > 45); assert.equal(w.stats.drinks, 1); assert.equal(w.stats.meals, 1); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  playthroughs.push({ kind: 'ordinary demonstration', time: w.time, completedAt: w.completedAt, player: w.player, inventory: w.inventory, camp: w.camp, signal: w.signal, stats: w.stats, ledger: w.ledger });
});
test('ordinary manual walking, scavenging, recipes, signal and tending reproduce dawn completion', () => {
  const w = prepared(); E.act(w, 'craft', 'boil'); run(w, 3); E.act(w, 'drink'); E.act(w, 'eat'); go(w, 'radio'); E.act(w, 'repair'); E.act(w, 'send'); go(w, 'camp');
  while (w.time < 100.1) { if (w.camp.fuel < 14) assert.ok(E.act(w, 'fuel').ok); E.stepWorld(w, 0.04); }
  assert.ok(w.completedAt !== null); assert.equal(w.signal.sent, true); assert.equal(w.camp.shelter, true); assert.ok(w.camp.fuel > 0); assert.equal(w.player.health, 100); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  playthroughs.push({ kind: 'ordinary manual commands', time: w.time, completedAt: w.completedAt, player: w.player, inventory: w.inventory, camp: w.camp, signal: w.signal, stats: w.stats, ledger: w.ledger });
});
test('a manual late return during the next storm must tend real fire and wait for the following dawn', () => {
  const w = prepared(); go(w, 'radio'); E.act(w, 'repair'); E.act(w, 'send'); run(w, 198 - w.time); assert.equal(w.completedAt, null); go(w, 'camp'); assert.equal(w.weather.id, 'storm'); assert.ok(E.act(w, 'fuel').ok);
  E.stepWorld(w, 0.04); assert.equal(w.completedAt, null); assert.match(E.objective(w), /下一次天明/); assert.ok(w.camp.shelter && w.camp.fuel > 0 && w.player.health >= 60 && w.player.temperature >= 35 && w.player.hydration >= 30 && w.player.hunger >= 25 && w.player.wetness <= 60);
  bad(w, invalid => { invalid.completedAt = invalid.time; invalid.ledger.push({ time: invalid.time, kind: 'complete', x: invalid.player.x, y: invalid.player.y, health: invalid.player.health, temperature: invalid.player.temperature, hydration: invalid.player.hydration, hunger: invalid.player.hunger, wetness: invalid.player.wetness }); });
  while (w.completedAt === null && w.time < 241) { if (w.camp.fuel < 14) assert.ok(E.act(w, 'fuel').ok); E.stepWorld(w, 0.04); }
  assert.ok(w.completedAt >= 240 && w.completedAt < 240.1); assert.equal(w.weather.id, 'dawn'); assert.equal(w.weather.cycle, 1); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  playthroughs.push({ kind: 'ordinary late-cycle manual return', time: w.time, completedAt: w.completedAt, player: w.player, inventory: w.inventory, camp: w.camp, signal: w.signal, stats: w.stats, ledger: w.ledger });
});
test('dawn alone, camp alone or signal alone does not award completion', () => {
  const bare = fresh(); run(bare, 110); assert.equal(bare.completedAt, null); const camp = prepared(); while (camp.time < 110) { if (camp.camp.fuel < 14) E.act(camp, 'fuel'); E.stepWorld(camp, 0.04); } assert.equal(camp.completedAt, null);
  const signal = fresh(); gather(signal); go(signal, 'radio'); E.act(signal, 'repair'); E.act(signal, 'send'); go(signal, 'camp'); run(signal, 110 - signal.time); assert.equal(signal.completedAt, null);
});
test('completion requires actual camp proximity and adequate hydration, then remains sticky during further play', () => {
  const w = prepared(); go(w, 'radio'); E.act(w, 'repair'); E.act(w, 'send'); while (w.time < 100.1) E.stepWorld(w, 0.04); assert.equal(w.completedAt, null);
  go(w, 'camp'); assert.equal(w.completedAt, null); assert.ok(E.act(w, 'fuel').ok); E.stepWorld(w, 0.04); assert.ok(w.completedAt !== null); const stamp = w.completedAt;
  go(w, 'radio'); run(w, 50); assert.equal(w.completedAt, stamp); assert.ok(w.time > stamp); assert.ok(E.restoreWorld(E.serializeWorld(w)));
  const thirsty = demo(); thirsty.completedAt = null; thirsty.ledger = thirsty.ledger.filter(e => e.kind !== 'complete'); thirsty.player.hydration = 29; E.stepWorld(thirsty, 0.04); assert.equal(thirsty.completedAt, null);
});
test('untended bodies eventually fail, stop the clock and retain a valid failure save', () => {
  const w = fresh(); run(w, 1800); assert.equal(w.failed, true); assert.equal(w.player.health, 0); assert.equal(w.running, false); const before = E.serializeWorld(w); E.stepWorld(w, 1, { dx: 1 }); assert.equal(E.act(w, 'drink').ok, false); assert.equal(E.serializeWorld(w), before); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('normal frame intervals keep every demo stage and pending craft restorable', () => {
  for (const dt of [1 / 60, 0.04, 0.1, 0.25]) { const w = fresh('demo'); for (let i = 0; i < Math.ceil(112 / dt) && w.completedAt === null; i++) { E.demoStep(w, dt); E.stepWorld(w, dt); if (i % 11 === 0) assert.ok(E.restoreWorld(E.serializeWorld(w)), `invalid${dt} t${w.time}`); } assert.ok(w.completedAt !== null); assert.ok(w.time < 112); }
});
test('save restoration preserves routes, inventory, structures, time and objective but always pauses', () => {
  const w = prepared(); E.targetPoint(w, 14, 4); run(w, 0.2); const r = E.restoreWorld(E.serializeWorld(w)); assert.ok(r); assert.equal(r.running, false); assert.equal(r.player.moving, false); assert.deepEqual(r.path, w.path); assert.deepEqual(r.inventory, w.inventory); assert.deepEqual(r.objects, w.objects); assert.equal(r.time, w.time); assert.equal(E.objective(r), E.objective(w));
});
test('paused completed saves retain the exact achievement and are still playable after resume', () => {
  const w = demo(); w.running = false; const r = E.restoreWorld(E.serializeWorld(w)); assert.ok(r); assert.equal(r.running, false); assert.equal(r.completedAt, w.completedAt); r.running = true; go(r, 'cabin'); assert.equal(r.completedAt, w.completedAt); assert.ok(E.restoreWorld(E.serializeWorld(r)));
});
test('strict saves reject malformed input, wrong version, wrong map, illegal modes and nonfinite time or body values', () => {
  const w = fresh(); for (const value of ['malformed', '{}', 'null', '[]']) assert.equal(E.restoreWorld(value), null);
  for (const edit of [w => w.version = 2, w => w.mapId = 'other', w => w.mode = 'magic', w => w.time = -1, w => w.time = Infinity, w => w.player.x = NaN, w => w.player.temperature = 100, w => w.player.hydration = -1, w => w.player.health = 101, w => w.player.heading = 8, w => w.running = 'yes']) bad(w, edit);
});
test('strict saves reject impossible instant body refills, heat, wetness or death without ordinary causes', () => {
  const w = fresh(); run(w, 5); bad(w, w => w.player.hydration = 100); bad(w, w => w.player.hunger = 100); bad(w, w => w.player.temperature = 40); bad(w, w => w.player.wetness = 10); bad(w, w => { w.player.health = 0; w.failed = true; w.running = false; });
  assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('strict saves reject invented inventory, missing item keys, forged loot, locations and depletion', () => {
  const w = prepared(); for (const edit of [w => w.inventory.wood++, w => w.inventory.clean++, w => delete w.inventory.food, w => w.inventory.magic = 1, w => w.inventory.wood = 1.5, w => w.objects[0].loot.wood++, w => w.objects[0].x++, w => w.objects[0].depleted = false, w => w.objects.push(copy(w.objects[0])), w => w.objects[4].depleted = true]) bad(w, edit);
});
test('strict saves replay actual recipe and supply costs and reject free structures, fuel or repaired signals', () => {
  const empty = fresh(), full = prepared(); bad(empty, w => w.camp.shelter = true); bad(empty, w => w.camp.fire = true); bad(empty, w => w.signal.repaired = true); bad(empty, w => w.signal.sent = true);
  bad(full, w => w.camp.fuel++); bad(full, w => w.stats.fuelAdded += 45); bad(full, w => { w.camp.fuel++; w.stats.fuelBurned--; }); bad(full, w => w.camp.x++); bad(full, w => w.ledger.splice(w.ledger.findIndex(e => e.kind === 'fuel'), 1));
});
test('strict saves reject fabricated actions, remotely looted resources and same-time teleports in the ledger', () => {
  const w = prepared(); bad(w, w => w.ledger.push({ time: w.time, kind: 'grant', x: 5, y: 10 })); bad(w, w => w.ledger[0].y = 10); bad(w, w => w.ledger[0].time = 0); bad(w, w => w.ledger[1].time = w.ledger[0].time);
  bad(w, w => w.ledger[0].time = Infinity); bad(w, w => w.ledger.reverse()); bad(w, w => w.player.x = 14); bad(w, w => w.stats.distance = w.time * 3 + 1); bad(w, w => w.stats.distance = 0);
});
test('strict saves reject forged water cooldowns, outputs, consumption and unfinished craft duration', () => {
  const w = prepared(); bad(w, w => w.objects.find(o => o.id === 'water').nextAt++); bad(w, w => w.stats.waterCollected++); bad(w, w => w.stats.boiled++); bad(w, w => w.stats.drinks++); bad(w, w => w.stats.meals++);
  E.act(w, 'craft', 'boil'); run(w, 1); bad(w, w => w.pending.remaining = 3); bad(w, w => w.pending = null); bad(w, w => w.pending.recipe = 'free-water'); bad(w, w => w.stats.boilFuel = 0);
});
test('strict saves cannot relocate the player or the completed output during an immobilized boil', () => {
  const w = prepared(); E.act(w, 'craft', 'boil'); run(w, 1); bad(w, w => { w.player.x += 0.6; w.stats.distance += 0.6; });
  run(w, 2); bad(w, w => { w.player.x += 0.6; w.stats.distance += 0.6; w.ledger.find(e => e.kind === 'boiled').x += 0.6; }); assert.ok(E.restoreWorld(E.serializeWorld(w)));
});
test('strict saves reject blocked paths, detached targets, invalid weather, completion and failure flags', () => {
  const w = fresh(); bad(w, w => w.path = [{ x: 18, y: 7 }]); bad(w, w => w.target = { x: 9, y: 9 }); bad(w, w => w.selected = 'missing'); bad(w, w => w.weather.id = 'dawn'); bad(w, w => w.weather.phase = NaN); bad(w, w => w.completedAt = 100); bad(w, w => w.failed = true); bad(w, w => w.demo.stage = 99);
  const done = demo(); bad(done, w => w.completedAt++); bad(done, w => w.signal.sent = false); bad(done, w => w.ledger = w.ledger.filter(e => e.kind !== 'complete'));
});
test('strict log validation rejects nonfinite, out-of-order, future or oversized entries', () => {
  const w = prepared(); bad(w, w => w.log[0].time = NaN); bad(w, w => w.log[0].time = -1); bad(w, w => w.log[0].time = w.time + 1); bad(w, w => w.log.reverse()); bad(w, w => w.log[0].text = 'x'.repeat(401)); bad(w, w => w.log[0].text = 99); bad(w, w => w.log = []);
});
test('invalid finite targets, unknown actions and nonpositive or nonfinite time steps preserve the world', () => {
  const w = fresh(), before = E.serializeWorld(w); for (const point of [[Infinity, 4], [NaN, 4], [-5, 4], [18, 7], [9, 5]]) assert.equal(E.targetPoint(w, ...point).ok, false);
  for (const dt of [0, -1, NaN, Infinity, 6]) E.stepWorld(w, dt); for (const input of [null, [], { dx: NaN }, { dy: Infinity }, { up: 'yes' }]) E.stepWorld(w, 0.04, input); assert.equal(E.act(w, 'magic').ok, false); assert.equal(E.serializeWorld(w), before);
});

const report = { passed: failures.length === 0, count: checks.length, checks, failures, playthroughs, method: 'Production 21 by 15 collision map, continuous movement at three tiles per second, ordinary fixed-resource scavenging and same-action demo/manual playthroughs. No granted supplies, teleports, time overrides or forced objective completion. Dedicated body boundary fixtures are limited to the explicit hydration threshold and forged-save assertions. Weather, finite supplies, real fuel conservation, three-second boil, depletion, dawn-only sticky completion and strict versioned ledger save validation are exercised.', commands: ["& 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' tooling/check-direction-survival-rules.mjs"] };
fs.writeFileSync(path.join(project, 'notes/direction-survival-rules-20261005.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${checks.length} survival rules checks passed${failures.length ? `; ${failures.length} failed` : ''}`); if (failures.length) process.exitCode = 1;
