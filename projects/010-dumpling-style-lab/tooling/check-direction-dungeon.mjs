import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as engine from '../web/direction-dungeon-engine.js';

const { COLS, ROWS, HEART, ENTRY, ROOMS, createDungeon, advance, dig, buildRoom, recruit, setJob, possess, leavePossession, startAssault, encode, restore, walkable, route, lineOfSight } = engine;
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [];
function test(name, fn) { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message, stack: error.stack }); console.error(`${name}: ${error.message}`); } }
function fresh(layout = 'demo') { const w = createDungeon(layout); w.paused = false; return w; }
function run(w, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds / .05) && w.phase === 'playing'; i++) advance(w, .05, input); return w; }
function until(w, predicate, seconds = 180, input = {}) { for (let i = 0; i < Math.ceil(seconds / .05) && w.phase === 'playing' && !predicate(w); i++) advance(w, .05, input); assert.ok(predicate(w), `condition not reached by time ${w.time}, phase ${w.phase}`); return w; }
const tile = (w, x, y) => w.tiles[y * COLS + x];
const roomType = r => r.type;
function availableFloor(w) { for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (walkable(w, x, y) && !w.rooms.some(r => r.x === x && r.y === y) && !w.traps.some(r => r.x === x && r.y === y) && !(x === HEART[0] && y === HEART[1]) && !(x === ENTRY[0] && y === ENTRY[1])) return [x, y]; return null; }
function accounts(w, base) {
  assert.ok(Number.isFinite(w.gold) && w.gold >= 0);
  assert.equal(w.gold + w.stats.expenses - w.stats.income, base.money, 'gold must match earned income less actual purchases');
  assert.equal(w.charges + w.stats.trapChargesUsed - w.stats.trapChargesProduced, base.charges, 'workshop charges cannot be created or disappear');
  assert.ok(w.heart >= 0 && w.heart <= 180);
  for (const g of w.guards) { assert.ok(g.hp >= 0 && g.hp <= g.maxHp); assert.ok(walkable(w, Math.round(g.x), Math.round(g.y)), 'guard must remain on excavated ground'); }
}
const baseAccounts = w => ({ money: w.gold + w.stats.expenses - w.stats.income, charges: w.charges + w.stats.trapChargesUsed - w.stats.trapChargesProduced });
function firstRoomSite(w, type) { for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (walkable(w, x, y) && buildRoom(structuredClone(w), type, x, y).ok) return [x, y]; return null; }
function connectBlank(w) { for (let x = 7; x <= 17; x++) assert.ok(dig(w, x, 7).ok); until(w, z => Boolean(route(z, HEART, ENTRY)), 70); }

test('openings have independent state and preserve the intended tunnel difference', () => {
  const demo = createDungeon('demo'), guided = createDungeon('guided'), blank = createDungeon('blank');
  assert.equal(COLS, 22); assert.equal(ROWS, 14); assert.equal(demo.tiles.length, COLS * ROWS);
  assert.ok(demo.paused && guided.paused && blank.paused);
  assert.ok(walkable(demo, 9, 5)); assert.equal(walkable(guided, 9, 5), false);
  assert.notDeepEqual(demo.tiles, blank.tiles);
  const before = guided.tiles.slice(); demo.tiles[0] = 'f'; assert.deepEqual(guided.tiles, before);
});
test('pause freezes workers, production, training and assault state', () => {
  const w = fresh(); run(w, 7); w.paused = true; const before = encode(w);
  run(w, 15, { forward: 1, attack: true }); assert.equal(encode(w), before);
});
test('invalid map and room requests cannot consume budget or alter tunnels', () => {
  const w = fresh('blank'), before = encode(w);
  for (const [x, y] of [[-1, 2], [22, 3], [4, 14], [1.5, 2], [NaN, 3]]) { assert.equal(dig(w, x, y).ok, false); assert.equal(buildRoom(w, 'workshop', x, y).ok, false); }
  assert.equal(buildRoom(w, 'invented-room', ...HEART).ok, false); assert.equal(encode(w), before);
});
test('the ordinary demo survives three actual AI assault waves without granted kills', () => {
  const w = fresh(), base = baseAccounts(w); let sawArrival = false, sawFighting = false;
  for (let i = 0; i < 2400 && w.phase === 'playing'; i++) { advance(w, .05); accounts(w, base); if (w.enemies.some(e => e.x < ENTRY[0] - .3)) sawArrival = true; if (w.stats.kills > 0) sawFighting = true; }
  assert.equal(w.phase, 'won'); assert.equal(w.wave, 3); assert.equal(w.totalSpawned, 12); assert.equal(w.stats.kills, 12); assert.equal(w.enemies.length, 0); assert.ok(sawArrival && sawFighting); assert.ok(w.heart > 0); assert.ok(restore(encode(w)));
});
test('guided excavation requires worker travel and 2.4 seconds at an adjacent face', () => {
  const w = fresh('guided'), base = baseAccounts(w), initialGold = w.gold;
  assert.ok(dig(w, 9, 5).ok); assert.equal(w.gold, initialGold - 8); assert.equal(tile(w, 9, 5), 'r');
  advance(w, .05); assert.ok(w.miners.some(m => m.task)); assert.ok(w.miners.filter(m => m.task).every(m => m.timer === 0)); assert.equal(tile(w, 9, 5), 'r');
  let sawWorkingFace = false, timeAtFace = 0;
  while (!walkable(w, 9, 5) && w.time < 20) { for (const m of w.miners.filter(m => m.task?.x === 9 && m.task?.y === 5)) if (m.timer > 0) { sawWorkingFace = true; assert.ok(Math.hypot(m.x - m.task.stand.x, m.y - m.task.stand.y) < .09); timeAtFace = Math.max(timeAtFace, m.timer); } advance(w, .05); accounts(w, base); }
  assert.ok(walkable(w, 9, 5)); assert.ok(sawWorkingFace && timeAtFace >= 2.3); assert.ok(w.time > 2.4); assert.equal(w.queue.length, 0); assert.equal(w.stats.dug, 1); assert.ok(route(w, HEART, [9, 3]));
});
test('mined gold is earned only when the real ore tile is excavated', () => {
  const w = fresh('guided'), base = baseAccounts(w), income = w.stats.income;
  assert.equal(tile(w, 6, 3), 'g'); assert.ok(dig(w, 6, 3).ok); advance(w, .05); assert.equal(w.stats.mined, 0); assert.equal(w.stats.income, income);
  until(w, z => walkable(z, 6, 3), 20); assert.equal(w.stats.mined, 1); assert.equal(w.stats.income - income, 60); assert.equal(w.stats.dug, 1); accounts(w, base);
});
test('duplicate and disconnected dig requests are rejected without duplicate charges', () => {
  const w = fresh('blank'); assert.ok(dig(w, 7, 7).ok); const before = encode(w); assert.equal(dig(w, 7, 7).ok, false); assert.equal(dig(w, 13, 3).ok, false); assert.equal(encode(w), before); assert.equal(w.queue.length, 1);
});
test('blank layout requires a physically excavated entry connection before assault', () => {
  const w = fresh('blank'), base = baseAccounts(w); assert.equal(route(w, HEART, ENTRY), null); assert.equal(startAssault(w).ok, false); assert.equal(w.assault, false);
  connectBlank(w); assert.equal(w.stats.dug, 11); assert.equal(w.stats.expenses, 11 * 8); assert.ok(route(w, HEART, ENTRY)); assert.ok(startAssault(w).ok); advance(w, .05); assert.equal(w.wave, 1); assert.equal(w.totalSpawned, 3); accounts(w, base);
});
test('room construction requires a connected excavated tile and charges its listed cost', () => {
  const w = fresh('blank'), base = baseAccounts(w); assert.equal(buildRoom(w, 'workshop', 18, 6).ok, false); assert.equal(buildRoom(w, 'training', 10, 10).ok, false); assert.equal(buildRoom(w, 'sanctuary', ...HEART).ok, false);
  const site = firstRoomSite(w, 'workshop'); assert.ok(site); const before = w.gold; assert.ok(buildRoom(w, 'workshop', ...site).ok); assert.equal(w.gold, before - ROOMS.workshop.cost); assert.equal(w.rooms.at(-1).type, 'workshop'); const snapshot = encode(w); assert.equal(buildRoom(w, 'training', ...site).ok, false); assert.equal(encode(w), snapshot); accounts(w, base);
});
test('workshop production costs gold, fills a bounded stock and pays nothing once full', () => {
  const w = fresh('blank'), base = baseAccounts(w), site = firstRoomSite(w, 'workshop'); assert.ok(buildRoom(w, 'workshop', ...site).ok); const gold = w.gold;
  run(w, 4.8); assert.equal(w.charges, 0); run(w, .3); assert.equal(w.charges, 1); assert.equal(w.gold, gold - 4); run(w, 70); assert.equal(w.charges, 12); assert.equal(w.stats.trapChargesProduced, 12); const fullGold = w.gold; run(w, 20); assert.equal(w.gold, fullGold); accounts(w, base);
});
test('trap building consumes one real workshop component and refuses missing stock', () => {
  const w = fresh('guided'), base = baseAccounts(w); const siteWithoutStock = firstRoomSite(w, 'trap'); assert.equal(siteWithoutStock, null); const before = encode(w); assert.equal(buildRoom(w, 'trap', 13, 7).ok, false); assert.equal(encode(w), before);
  run(w, 5.1); const site = firstRoomSite(w, 'trap'); assert.ok(site); const gold = w.gold, charges = w.charges, consumed = w.stats.trapChargesUsed;
  assert.ok(buildRoom(w, 'trap', ...site).ok); assert.equal(w.gold, gold - ROOMS.trap.cost); assert.equal(w.charges, charges - 1); assert.equal(w.stats.trapChargesUsed, consumed + 1); assert.equal(w.traps.length, consumed + 1); accounts(w, base);
});
test('recruiting costs budget and connected treasury increases the live guard cap', () => {
  const w = fresh('blank'), base = baseAccounts(w), gold = w.gold;
  assert.ok(recruit(w).ok); assert.ok(recruit(w).ok); assert.equal(w.gold, gold - 180); assert.equal(w.guards.length, 3); const before = encode(w); assert.equal(recruit(w).ok, false); assert.equal(encode(w), before);
  const site = firstRoomSite(w, 'treasury'); assert.ok(site); assert.ok(buildRoom(w, 'treasury', ...site).ok); assert.ok(recruit(w).ok); assert.ok(recruit(w).ok); assert.equal(w.guards.length, 5); assert.equal(recruit(w).ok, false); assert.equal(new Set(w.guards.map(g => g.id)).size, 5); accounts(w, base);
});
test('disconnected training cannot progress and repairing the route enables paid training', () => {
  const w = fresh('guided'), base = baseAccounts(w), g = w.guards[2]; assert.equal(setJob(w, g.id, 'train').ok, false); run(w, 9); assert.equal(g.level, 1); assert.equal(g.xp, 0);
  assert.ok(dig(w, 9, 5).ok); until(w, z => walkable(z, 9, 5), 20); assert.ok(setJob(w, 1, 'train').ok); const traveling = w.guards[0], xp = traveling.xp; run(w, 1); assert.equal(traveling.xp, xp); assert.ok(traveling.moving); until(w, z => z.guards[0].level >= 2, 30); assert.ok(Math.hypot(traveling.x - 9, traveling.y - 3) < .8); accounts(w, base);
});
test('missing jobs and nonexistent actors cannot change the guard roster', () => {
  const w = fresh('blank'), before = encode(w); assert.equal(setJob(w, 1, 'train').ok, false); assert.equal(setJob(w, 1, 'rest').ok, false); assert.equal(setJob(w, 1, 'invented').ok, false); assert.equal(setJob(w, 99, 'guard').ok, false); assert.equal(possess(w, 99).ok, false); assert.equal(encode(w), before);
});
test('possession keeps the same guard and map; collision limits movement at solid rock', () => {
  const w = fresh('guided'), g = w.guards[0], before = [g.x, g.y], tiles = w.tiles.slice(); assert.ok(possess(w, g.id).ok); assert.equal(w.view, 'possession'); assert.equal(w.controlled, g.id); assert.deepEqual([g.x, g.y], before); assert.deepEqual(w.tiles, tiles);
  run(w, 5, { forward: 1 }); assert.ok(g.x > before[0]); assert.ok(g.x < 20.5); assert.ok(walkable(w, Math.round(g.x), Math.round(g.y))); const blocked = [g.x, g.y]; run(w, 1, { forward: 1 }); assert.deepEqual([g.x, g.y], blocked);
  leavePossession(w); assert.equal(w.view, 'management'); assert.equal(w.controlled, null); assert.deepEqual([g.x, g.y], blocked); assert.deepEqual(w.tiles, tiles); run(w, 1); assert.ok(g.x < blocked[0]);
});
test('line of sight follows actual excavated tunnels and is blocked by intact rock', () => {
  const w = fresh('guided'); assert.equal(lineOfSight(w, { x: 3, y: 7 }, { x: 18, y: 7 }), true); assert.equal(lineOfSight(w, { x: 9, y: 3 }, { x: 9, y: 7 }), false);
  assert.ok(dig(w, 9, 5).ok); until(w, z => walkable(z, 9, 5), 20); assert.equal(lineOfSight(w, { x: 9, y: 3 }, { x: 9, y: 7 }), true);
});
test('an undefended connected heart can be lost through ordinary movement and enemy attacks', () => {
  const w = fresh('blank'), base = baseAccounts(w); connectBlank(w); assert.ok(possess(w, 1).ok); run(w, 1, { forward: -1 }); assert.ok(w.guards[0].x < 3); assert.ok(startAssault(w).ok);
  until(w, z => z.phase === 'lost', 120); assert.equal(w.heart, 0); assert.equal(w.stats.kills, 0); assert.ok(w.enemies.some(e => Math.hypot(e.x - HEART[0], e.y - HEART[1]) < 1)); assert.ok(w.paused); accounts(w, base); assert.ok(restore(encode(w)));
});
test('possession attack obeys range, facing and a cooldown against normally spawned enemies', () => {
  const distant = fresh('guided'); assert.ok(possess(distant, 1).ok); startAssault(distant); advance(distant, .05, { attack: true }); assert.equal(distant.stats.manualHits, 0);
  const facingAway = fresh('guided'); possess(facingAway, 1); run(facingAway, 6 / 2.6, { forward: 1 }); run(facingAway, Math.PI / 2, { turn: 1 }); startAssault(facingAway); advance(facingAway, .05, { attack: true }); assert.equal(facingAway.stats.manualHits, 0);
  const w = fresh('guided'), base = baseAccounts(w); possess(w, 1); run(w, 6 / 2.6, { forward: 1 }); startAssault(w); advance(w, .05, { attack: true }); assert.equal(w.stats.manualHits, 1); assert.ok(w.enemies.some(e => e.hp < e.maxHp)); const hits = w.stats.manualHits;
  run(w, .3, { attack: true }); assert.equal(w.stats.manualHits, hits); run(w, .1, { turn: 1 }); until(w, z => z.stats.manualHits >= 2, 3, { attack: true }); assert.ok(w.stats.kills >= 1); accounts(w, base);
});
test('a wounded guard must return to the actual sanctuary before health can recover', () => {
  const w = fresh('blank'), base = baseAccounts(w); connectBlank(w); assert.ok(dig(w, 12, 6).ok); until(w, z => walkable(z, 12, 6), 20); assert.ok(buildRoom(w, 'sanctuary', 12, 6).ok); assert.ok(setJob(w, 1, 'rest').ok); until(w, z => Math.hypot(z.guards[0].x - 12, z.guards[0].y - 6) < .6, 15); startAssault(w);
  const g = w.guards[0]; let previous = g.hp, sawDamage = false, sawRecovery = false;
  for (let i = 0; i < 1200 && w.phase === 'playing'; i++) { advance(w, .05); if (g.hp < previous) sawDamage = true; if (g.hp > previous + 1e-8) { assert.ok(Math.hypot(g.x - 12, g.y - 6) < .8); if (sawDamage) sawRecovery = true; } previous = g.hp; accounts(w, base); if (sawRecovery) break; }
  assert.ok(sawDamage && sawRecovery);
});
test('budget exhaustion blocks further hires, construction and digging without overdraft', () => {
  const hires = fresh('blank'); for (const type of ['workshop', 'treasury', 'training', 'sanctuary']) assert.ok(buildRoom(hires, type, ...firstRoomSite(hires, type)).ok); for (let i = 0; i < 3; i++) assert.ok(recruit(hires).ok); assert.equal(hires.guards.length, 4); assert.equal(hires.gold, 60); const hireSnapshot = encode(hires); assert.equal(recruit(hires).ok, false); assert.equal(encode(hires), hireSnapshot);
  const w = fresh('blank'), base = baseAccounts(w); assert.ok(buildRoom(w, 'workshop', ...firstRoomSite(w, 'workshop')).ok); assert.ok(buildRoom(w, 'treasury', ...firstRoomSite(w, 'treasury')).ok); for (let i = 0; i < 4; i++) assert.ok(recruit(w).ok); assert.ok(buildRoom(w, 'training', ...firstRoomSite(w, 'training')).ok);
  assert.ok(w.gold < ROOMS.sanctuary.cost); const floor = [5, 5], before = w.gold; assert.equal(buildRoom(w, 'sanctuary', ...floor).ok, false); assert.equal(w.gold, before);
  for (let x = 7; x <= 13; x++) assert.ok(dig(w, x, 7).ok); assert.equal(w.gold, 4); const snapshot = encode(w); assert.equal(dig(w, 14, 7).ok, false); assert.equal(encode(w), snapshot); accounts(w, base);
});
test('paid queued excavations finish at zero budget and unaffordable training remains saveable', () => {
  const w = fresh('blank'), base = baseAccounts(w); for (const type of ['workshop', 'treasury', 'training']) assert.ok(buildRoom(w, type, ...firstRoomSite(w, type)).ok); for (let i = 0; i < 4; i++) assert.ok(recruit(w).ok); for (let x = 7; x <= 13; x++) assert.ok(dig(w, x, 7).ok); assert.equal(w.gold, 4); run(w, 5.1); assert.equal(w.gold, 0); assert.ok(setJob(w, 1, 'train').ok);
  run(w, 35); assert.equal(w.gold, 0); assert.equal(w.charges, 1); assert.equal(w.stats.dug, 7); assert.equal(w.queue.length, 0); assert.ok(w.guards[0].trainingTimer <= 3.01); assert.equal(w.guards[0].level, 1); assert.equal(w.guards[0].xp, 0); accounts(w, base); assert.ok(restore(encode(w)));
});
test('save restoration pauses and deterministically continues pending excavation and combat', () => {
  const w = fresh('guided'); assert.ok(dig(w, 9, 5).ok); run(w, 1); assert.ok(startAssault(w).ok); run(w, 12); const other = restore(encode(w)); assert.ok(other?.paused); assert.deepEqual(other, { ...w, effects: [], paused: true }); other.paused = false;
  run(w, 90); run(other, 90); assert.deepEqual(other, w); assert.equal(w.phase, 'won');
});
test('save validation rejects impossible budget, stock, actor positions, identities and wins', () => {
  const w = fresh('guided'), bad = mutate => { const data = structuredClone(w); mutate(data); assert.equal(restore(JSON.stringify(data)), null); };
  bad(z => z.gold++); bad(z => z.charges++); bad(z => z.stats.kills++); bad(z => z.phase = 'won'); bad(z => z.guards[0].x = -5); bad(z => z.guards[1].id = z.guards[0].id); bad(z => z.miners[0].task = { x: 9, y: 5, stand: { x: 3, y: 7 } }); bad(z => z.tiles[0] = 'f'); bad(z => z.view = 'possession'); bad(z => z.rooms[0].type = 'invented'); bad(z => z.totalSpawned = 3); assert.equal(restore('{}'), null); assert.equal(restore('not json'), null);
});
test('save validation binds mining, paid construction and wave counters to actual world history', () => {
  const ore = createDungeon('guided'); Object.assign(ore.stats, { mined: 1, dug: 1, income: 60 }); ore.gold = 760; assert.equal(restore(encode(ore)), null, 'unchanged ore cannot provide invented mining income');
  const room = createDungeon('guided'); room.rooms.push({ type: 'workshop', x: 12, y: 7, timer: 0 }); assert.equal(restore(encode(room)), null, 'a room cannot be inserted without its construction expense');
  const wave = createDungeon('guided'); startAssault(wave); advance(wave, .05); wave.assault = false; assert.equal(restore(encode(wave)), null, 'spawned enemies cannot exist before an assault starts');
  const ground = createDungeon('guided'); ground.tiles[7 * COLS + 7] = 'r'; assert.equal(restore(encode(ground)), null, 'already open tunnels cannot become invented rock');
  const freeLevel = createDungeon('guided'); freeLevel.guards[0].level = 2; assert.equal(restore(encode(freeLevel)), null, 'guard levels require paid training');
});

const report = { passed: failures.length === 0, checks, failures, method: 'Production dungeon simulation using normal excavation, room construction, recruiting, scheduling and possession inputs. Checks cover actual path-dependent operations, gold and trap-stock accounts, three assault waves, collisions, pauses and strict save restoration.' };
fs.writeFileSync(path.join(project, 'notes/direction-dungeon-rules-20261005.json'), JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
console.log(`${checks.length} dungeon rules checks passed; ${failures.length} failed`);
