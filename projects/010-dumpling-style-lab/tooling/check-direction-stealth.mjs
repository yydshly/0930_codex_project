import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-stealth-engine.js';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const copy = value => structuredClone(value);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
function run(w, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds / 0.04) && w.phase === 'playing'; i++) E.advance(w, 0.04, input); return w; }
function until(w, predicate, seconds = 180) {
  for (let i = 0; i < Math.ceil(seconds / 0.04) && w.phase === 'playing' && !predicate(w); i++) E.advance(w, 0.04);
  assert.ok(predicate(w), `condition not reached at ${w.time.toFixed(2)}s (${w.phase})`); return w;
}
function fixture(player, guard) {
  const w = E.createStealth('manual'); Object.assign(w.player, player);
  if (guard) {
    const g = w.guards[1]; Object.assign(g, guard);
    g.patrol = guard.patrol || [{ x: g.x, y: g.y }, { x: g.x, y: g.y }]; g.patrolIndex = 0; g.path = [];
    w.guards = [g];
  }
  return w;
}
function moveTo(w, x, y) { assert.ok(E.goTo(w, x, y).ok); until(w, z => z.player.path.length === 0 && dist(z.player, { x, y }) < 0.08, 90); }
function replay(plan) {
  const w = E.createStealth('manual', plan);
  for (const action of E.DEMO_PLANS[plan]) {
    assert.equal(w.auto, false);
    if (action.kind === 'move') moveTo(w, action.x, action.y);
    else if (action.kind === 'stance') assert.ok(E.setStance(w, action.value).ok);
    else if (action.kind === 'stone') assert.ok(E.throwStone(w, action.x, action.y).ok);
    else if (action.kind === 'interact') assert.ok(E.interact(w).ok);
    else if (action.kind === 'wait') run(w, action.seconds);
    else if (action.kind === 'guardWait') until(w, z => z.guards.find(g => g.id === action.id).y > action.y, 16);
  }
  return w;
}

test('the shared 24 by 16 map, surfaces and props are legal and independently allocated', () => {
  const a = E.createStealth(), b = E.createStealth('manual');
  assert.equal(E.COLS, 24); assert.equal(E.ROWS, 16); assert.equal(a.tiles.length, 384);
  for (const item of [...a.guards, ...a.lamps, ...a.switches, E.EXIT, E.ARCHIVE]) assert.ok(E.walkable(a, item.x, item.y));
  for (const type of Object.keys(E.SURFACES)) assert.ok(a.tiles.includes(type));
  a.tiles[0] = 'rug'; a.lamps[0].on = false; assert.equal(b.tiles[0], '#'); assert.equal(b.lamps[0].on, true);
  assert.equal(a.auto, true); assert.equal(b.auto, false); assert.equal(typeof E.status(b), 'string');
});
test('all three automatic plans win through continuous travel and real pickup and exit actions', () => {
  for (const plan of ['shadow', 'blackout', 'lure']) {
    const w = E.createStealth('demo', plan); let pickup = false, peakGuardTravel = 0;
    const initialGuards = copy(w.guards);
    for (let i = 0; i < 5000 && w.phase === 'playing'; i++) {
      const before = copy(w.player); E.advance(w, 0.04);
      assert.ok(dist(before, w.player) <= 3.05 * 0.04 + 0.000001, 'player may never teleport');
      assert.ok(E.walkable(w, w.player.x, w.player.y));
      if (!pickup && w.objective) { assert.ok(dist(w.player, E.ARCHIVE) <= 1.35); pickup = true; }
      peakGuardTravel = Math.max(peakGuardTravel, ...w.guards.map((g, n) => dist(g, initialGuards[n])));
    }
    assert.equal(w.phase, 'won'); assert.ok(pickup && peakGuardTravel > 3); assert.ok(dist(w.player, E.EXIT) <= 1.35);
    assert.ok(w.stats.distance >= 45 && w.time >= 60 && w.time < 120); assert.equal(w.stats.alerts, 0);
    assert.ok(E.restore(E.encode(w)), 'ordinary winning state must restore');
    const lane = plan === 'shadow' ? 4 : plan === 'blackout' ? 8 : 11;
    assert.ok(w.trace.some(p => p.x === 12 && p.y === lane));
    if (plan === 'shadow') { assert.equal(w.stats.stonesThrown, 0); assert.equal(w.stats.lightsToggled, 0); }
    if (plan === 'blackout') { assert.equal(w.lamps.find(l => l.id === 'gallery').on, false); assert.equal(w.stats.lightsToggled, 1); }
    if (plan === 'lure') { assert.equal(w.stats.stonesThrown, 2); assert.ok(w.stats.investigations >= 2); }
    playthroughs.push({ plan, mode: 'demo', phase: w.phase, seconds: Number(w.time.toFixed(2)), ...w.stats });
  }
});
test('the same three solutions complete in manual mode by replaying ordinary exported commands', () => {
  for (const plan of ['shadow', 'blackout', 'lure']) {
    const w = replay(plan); assert.equal(w.phase, 'won'); assert.equal(w.mode, 'manual');
    assert.equal(w.auto, false); assert.equal(w.objective, true); assert.ok(w.stats.commands > 10);
    playthroughs.push({ plan, mode: 'manual command replay', phase: w.phase, seconds: Number(w.time.toFixed(2)), ...w.stats });
  }
});
test('the middle and lower demonstrated crossings fail if their light or sound intervention is omitted', () => {
  for (const plan of ['blackout', 'lure']) {
    const w = E.createStealth('manual', plan); let uses = 0;
    for (const action of E.DEMO_PLANS[plan]) {
      if (w.phase !== 'playing') break;
      if (action.kind === 'move') {
        assert.ok(E.goTo(w, action.x, action.y).ok);
        for (let i = 0; i < 2400 && w.phase === 'playing' && w.player.path.length; i++) E.advance(w, 0.04);
      } else if (action.kind === 'stance') E.setStance(w, action.value);
      else if (action.kind === 'wait') run(w, action.seconds);
      else if (action.kind === 'interact') { if (plan !== 'blackout' || uses > 0) E.interact(w); uses++; }
      // Skip stones and their corresponding guard wait; ordinary movement still runs.
    }
    assert.equal(w.phase, 'lost'); assert.ok(w.stats.alerts > 0); assert.equal(w.stats.stonesThrown, 0); assert.equal(w.stats.lightsToggled, 0);
  }
});
test('continuous movement collides with wall edges instead of entering or tunnelling through them', () => {
  const w = fixture({ x: 4, y: 5 }); E.setStance(w, 'run'); run(w, 0.9, { moveX: 1 });
  assert.ok(w.player.x > 5 && w.player.x <= 5.31); assert.equal(w.player.y, 5); assert.equal(E.walkable(w, 6, 5), false);
  const before = E.encode(w); assert.equal(E.goTo(w, 6, 5).ok, false); assert.equal(E.encode(w), before);
});
test('click-to-path walks through actual doorways and around the top stone screen', () => {
  const w = E.createStealth('manual'), path = E.route(w, E.EXIT, { x: 12, y: 4 });
  assert.ok(path.length > 10); assert.ok(path.every(p => E.walkable(w, p.x, p.y)));
  assert.ok(path.some(p => p.x === 11 && p.y === 4)); moveTo(w, 12, 4);
  assert.ok(w.stats.distance >= 13); assert.ok(w.stats.footsteps > 10);
  assert.equal(E.route(w, E.EXIT, { x: 11, y: 2 }).length, 0);
});
test('keyboard movement takes over a demo and cancels an existing click path', () => {
  const w = E.createStealth(); E.goTo(w, 5, 8); E.advance(w, 0.04, { moveY: -1 });
  assert.equal(w.auto, false); assert.equal(w.mode, 'manual'); assert.deepEqual(w.player.path, []); assert.ok(w.player.y < 8);
});
test('crouch, walk and run have different actual speeds and material-dependent footsteps', () => {
  const moved = {}, noise = {};
  for (const stance of ['crouch', 'walk', 'run']) {
    const w = fixture({ x: 8, y: 8 }, { x: 2, y: 2, angle: 0 }); E.setStance(w, stance); run(w, 0.8, { moveX: 1 });
    moved[stance] = w.player.x - 8; noise[stance] = Math.max(...w.noises.map(n => n.radius), 0);
  }
  assert.ok(moved.crouch < moved.walk && moved.walk < moved.run); assert.ok(noise.crouch < noise.walk && noise.walk < noise.run);
  const rug = fixture({ x: 8, y: 8 }, { x: 2, y: 2, angle: 0 }), metal = fixture({ x: 10, y: 7 }, { x: 2, y: 2, angle: 0 });
  E.setStance(rug, 'walk'); E.setStance(metal, 'walk'); run(rug, 0.8, { moveX: 1 }); run(metal, 0.8, { moveX: 1 });
  assert.ok(metal.noises.at(-1).radius > rug.noises.at(-1).radius * 4);
});
test('held run uses run exposure and noise while preserving the selected crouch stance', () => {
  const w = fixture({ x: 8, y: 8 }, { x: 2, y: 2, angle: 0 }); run(w, 0.8, { moveX: 1, run: true });
  assert.equal(w.player.stance, 'crouch'); assert.equal(w.player.motionStance, 'run'); assert.ok(w.player.x > 10);
  assert.ok(w.noises.some(n => n.radius >= 1.8)); E.advance(w, 0.04); assert.equal(w.player.motionStance, 'crouch');
});
test('switch interaction changes actual light while opaque walls block lamp contribution', () => {
  const w = E.createStealth('manual'), lit = E.visibility(w, { x: 12, y: 8 });
  assert.equal(E.lineOfSight(w, { x: 9, y: 2 }, { x: 12, y: 2 }), false);
  assert.ok(E.visibility(w, { x: 12, y: 2 }) < 0.1); moveTo(w, 5, 8); assert.ok(E.interact(w).ok);
  assert.ok(lit - E.visibility(w, { x: 12, y: 8 }) > 0.7); assert.equal(w.stats.lightsToggled, 1);
  assert.equal(w.lamps.find(l => l.id === 'court').on, true);
  const before = E.encode(w); moveTo(w, 3, 6); assert.equal(E.interact(w).ok, false); assert.notEqual(E.encode(w), before);
});
test('guard sight respects facing, range and wall occlusion', () => {
  const front = fixture({ x: 13, y: 8 }, { x: 9, y: 8, angle: 0 }); run(front, 1);
  const back = fixture({ x: 7, y: 8 }, { x: 9, y: 8, angle: 0 }); run(back, 1);
  const blocked = fixture({ x: 12, y: 2 }, { x: 9, y: 2, angle: 0 }); run(blocked, 1);
  const far = fixture({ x: 20, y: 8 }, { x: 9, y: 8, angle: 0 }); run(far, 1);
  assert.ok(front.player.exposure > 15); assert.equal(back.player.exposure, 0); assert.equal(blocked.player.exposure, 0); assert.equal(far.player.exposure, 0);
});
test('sustained illuminated exposure captures while crouch delays the same observation', () => {
  const exposed = fixture({ x: 11, y: 8, stance: 'walk' }, { x: 8, y: 8, angle: 0 });
  const crouched = fixture({ x: 11, y: 8, stance: 'crouch' }, { x: 8, y: 8, angle: 0 });
  run(exposed, 1); run(crouched, 1); assert.equal(exposed.phase, 'lost'); assert.equal(crouched.phase, 'playing');
  assert.ok(exposed.stats.alerts > 0 && crouched.stats.maxExposure < exposed.stats.maxExposure);
  run(crouched, 6); assert.equal(crouched.phase, 'lost', 'crouch cannot grant immunity in direct sustained light');
});
test('a real stone impact makes a guard travel to investigate, search and return to patrol', () => {
  const w = fixture({ x: 2, y: 5 }, { x: 5, y: 8, angle: Math.PI / 2, patrol: [{ x: 5, y: 8 }, { x: 5, y: 10 }] });
  assert.ok(E.throwStone(w, 5, 5).ok); E.advance(w, 0.2); assert.equal(w.guards[0].mode, 'patrol');
  until(w, z => z.guards[0].mode === 'investigate', 2); assert.ok(w.guards[0].target.y === 5);
  until(w, z => z.guards[0].mode === 'search', 8); assert.ok(dist(w.guards[0], { x: 5, y: 5 }) < 0.05);
  until(w, z => z.guards[0].mode === 'return', 12); until(w, z => z.guards[0].mode === 'patrol', 10);
  assert.equal(w.stones, 2); assert.equal(w.stats.stonesThrown, 1); assert.ok(w.stats.investigations >= 1);
});
test('sound distance follows traversable doorways instead of crossing a nearby solid wall', () => {
  const w = fixture({ x: 13, y: 4 }, { x: 12, y: 6, angle: -Math.PI / 2 });
  const target = { x: 12, y: 4 }; assert.ok(dist(w.guards[0], target) < 3); assert.ok(E.route(w, w.guards[0], target).length - 1 > 12);
  assert.ok(E.throwStone(w, target.x, target.y).ok); run(w, 1); assert.equal(w.guards[0].mode, 'patrol'); assert.equal(w.stats.investigations, 0);
});
test('footsteps, without any thrown stone, cause a nearby listening guard to investigate', () => {
  const w = fixture({ x: 3, y: 8 }, { x: 5, y: 10, angle: Math.PI / 2 }); E.setStance(w, 'run'); run(w, 0.4, { moveY: -1 });
  assert.equal(w.stats.stonesThrown, 0); assert.ok(w.stats.footsteps >= 1); assert.ok(w.stats.investigations >= 1); assert.equal(w.guards[0].mode, 'investigate');
});
test('stone inventory is finite, rejects far or blocked throws and never refills on impact', () => {
  const w = E.createStealth('manual'); const before = E.encode(w);
  assert.equal(E.throwStone(w, 20, 8).ok, false); assert.equal(E.throwStone(w, 6, 5).ok, false); assert.equal(E.encode(w), before);
  for (let i = 0; i < 3; i++) assert.ok(E.throwStone(w, 4, 8).ok);
  assert.equal(w.stones, 0); assert.equal(w.stats.stonesThrown, 3); assert.ok(E.restore(E.encode(w)), 'in-flight stones are legal saves');
  const empty = E.encode(w); assert.equal(E.throwStone(w, 4, 8).ok, false); assert.equal(E.encode(w), empty); run(w, 1); assert.equal(w.stones, 0);
  const blocked = fixture({ x: 9, y: 2 }); assert.equal(E.throwStone(blocked, 12, 2).ok, false);
});
test('pickup requires physical proximity and winning requires a later return to the exit', () => {
  const w = E.createStealth('manual'); assert.equal(E.interact(w).ok, false); assert.equal(w.objective, false); assert.equal(w.phase, 'playing');
  moveTo(w, 3, 4); moveTo(w, 19, 4); moveTo(w, 21, 3); assert.ok(E.interact(w).ok);
  assert.equal(w.phase, 'playing'); assert.equal(w.objective, true); assert.ok(dist(w.player, E.EXIT) > 10);
  moveTo(w, 19, 4); moveTo(w, 3, 4); moveTo(w, 3, 8); assert.ok(E.interact(w).ok); assert.equal(w.phase, 'won');
});
test('pause freezes time, guards, noise, projectiles, demo steps and all command spending', () => {
  const w = E.createStealth(); run(w, 6); E.throwStone(w, 4, 4); w.paused = true; const before = E.encode(w);
  E.advance(w, 5, { moveX: 1, run: true });
  for (const answer of [E.goTo(w, 5, 8), E.setStance(w, 'run'), E.interact(w), E.throwStone(w, 4, 4)]) assert.equal(answer.ok, false);
  assert.equal(E.encode(w), before);
});
test('a paused legal save resumes the same investigation and deterministic demo without state grants', () => {
  const w = E.createStealth('demo', 'lure'); run(w, 13); const other = E.restore(E.encode(w));
  assert.ok(other && other.paused); const frozen = E.encode(other); E.advance(other, 2); assert.equal(E.encode(other), frozen);
  other.paused = false; run(w, 100); run(other, 100); assert.equal(w.phase, 'won'); assert.equal(E.encode(other), E.encode(w));
});
test('legal saves work during movement, held running, stone flight and all final phases', () => {
  for (const plan of ['shadow', 'blackout', 'lure']) {
    const w = E.createStealth('demo', plan);
    for (let i = 0; i < 2500 && w.phase === 'playing'; i++) { E.advance(w, 0.04); if (i % 47 === 0) assert.ok(E.restore(E.encode(w)), `${plan} save at ${w.time}`); }
    assert.ok(E.restore(E.encode(w)));
  }
  const runWorld = E.createStealth('manual'); E.advance(runWorld, 0.4, { moveX: 1, run: true }); assert.ok(E.restore(E.encode(runWorld)));
  const w = E.createStealth('manual'); E.setStance(w, 'walk'); moveTo(w, 5, 8); E.goTo(w, 12, 7); until(w, z => z.phase === 'lost', 30); assert.ok(E.restore(E.encode(w)));
});
test('restore rejects forged map, enums, positions, paths, lamps, inventory, budgets and objectives', () => {
  const source = E.createStealth('manual'); const bad = mutate => { const value = copy(source); mutate(value); assert.equal(E.restore(JSON.stringify(value)), null); };
  bad(s => s.tiles[5] = 'rug'); bad(s => s.schema = 9); bad(s => s.mapId = 'other-map'); bad(s => s.mode = 'cheat'); bad(s => s.plan = 'fake');
  bad(s => s.player.x = 6); bad(s => s.player.y = NaN); bad(s => s.player.stance = 'invisible'); bad(s => s.player.path = [{ x: 3, y: 8 }, { x: 10, y: 8 }]);
  bad(s => s.guards[0].mode = 'sleep'); bad(s => s.guards[0].patrol[0].x = 5); bad(s => s.guards[0].awareness = Infinity);
  bad(s => s.lamps[1].on = false); bad(s => s.switches[0].x = 3); bad(s => s.stones = 4); bad(s => s.stones = 2);
  bad(s => s.stats.distance = 100); bad(s => s.stats.footsteps = 40); bad(s => s.stats.maxExposure = 101); bad(s => s.stats.timeInLight = 10);
  bad(s => { s.objective = true; s.stats.archiveCollected = true; s.stats.pickupTime = 0; }); bad(s => s.phase = 'won'); bad(s => s.phase = 'lost');
  bad(s => s.demo.step = 500); bad(s => s.time = -1); assert.equal(E.restore('{}'), null); assert.equal(E.restore('broken json'), null);
});
test('invalid time steps and unsupported command arguments leave the world unchanged', () => {
  const w = E.createStealth('manual'), before = E.encode(w);
  for (const dt of [-1, 6, NaN, Infinity]) assert.equal(E.advance(w, dt).ok, false);
  assert.equal(E.goTo(w, NaN, 8).ok, false); assert.equal(E.setStance(w, 'fly').ok, false); assert.equal(E.throwStone(w, NaN, 1).ok, false);
  assert.equal(E.encode(w), before);
});

const report = { passed: failures.length === 0, checks, failures, playthroughs, method: 'Fixed production scene and continuous physics. All three automatic plans plus the same exported actions in manual mode. No teleports, fake pickups, awarded wins, unlimited inventory or AI state shortcuts in playthroughs. Counterfactual middle/lower crossings without their interventions are caught. Small isolated fixtures only for focused LOS, collision and hearing assertions.', map: { cols: E.COLS, rows: E.ROWS, exit: E.EXIT, archive: E.ARCHIVE }, ruleConstants: { visionRange: E.VISION_RANGE, visionHalfAngle: E.VISION_HALF_ANGLE, visionGain: E.VISION_GAIN, stepSeconds: 0.04 } };
fs.writeFileSync(path.join(project, 'notes/direction-stealth-rules-20261005.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${checks.length} stealth rules checks passed${failures.length ? `; ${failures.length} failed` : ''}`);
if (failures.length) process.exitCode = 1;
