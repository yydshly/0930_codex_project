import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-landscape-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const copy = value => structuredClone(value);
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
const fresh = () => { const w = E.createWorld(); assert.ok(E.act(w, 'pause', false).ok); return w; };
function apply(w, type, payload) { const result = E.act(w, type, payload); assert.ok(result.ok, `${type}: ${result.reason}`); return result; }
function sameAfterReject(w, type, payload) { const before = copy(w); assert.equal(E.act(w, type, payload).ok, false); assert.deepEqual(w, before); }
function invariants(w) {
  assert.equal(w.actions, w.ledger.length); assert.equal(w.board.length, w.deckIndex + 1); assert.equal(w.deckIndex, w.stats.placements);
  assert.equal(new Set(w.board.map(cell => `${cell.q},${cell.r}`)).size, w.board.length);
  assert.equal(w.score, w.board.reduce((sum, cell) => sum + cell.score, 0)); assert.ok(w.log.length <= 24);
  for (const cell of w.board) {
    assert.ok(Math.abs(cell.q) <= E.COORD_LIMIT && Math.abs(cell.r) <= E.COORD_LIMIT); assert.equal(cell.edges.length, 6);
    const model = cell.id === 'seed' ? E.SEED : E.DECK[Number(cell.id.slice(1)) - 1]; assert.equal(cell.tileId, model.id); assert.deepEqual(cell.edges, E.rotatedEdges(model, cell.rotation));
    for (let direction = 0; direction < 6; direction++) { const [dq, dr] = E.DIRS[direction], adjacent = w.board.find(next => next.q === cell.q + dq && next.r === cell.r + dr); if (adjacent) assert.equal(cell.edges[direction] === 'water', adjacent.edges[(direction + 3) % 6] === 'water'); }
  }
  for (const [terrain, objective] of Object.entries(w.objectives)) { assert.equal(objective.current, w.groups[terrain][0]?.size || 0); assert.equal(objective.complete, objective.current >= objective.target); for (const component of w.groups[terrain]) assert.equal(component.size, component.cells.length); }
}
function demo(w = fresh(), finish = true) {
  for (let i = 0; i < 160 && w.phase === 'arranging'; i++) {
    if (!finish && w.deckIndex === E.DECK.length) break;
    const before = copy(w), plan = E.demoPlanner(w); assert.ok(plan); assert.deepEqual(plan, E.demoPlanner(w)); assert.deepEqual(w, before);
    apply(w, plan.type, plan.payload); invariants(w); assert.ok(E.restore(E.serialize(w)));
  }
  assert.equal(w.deckIndex, 18); if (finish) { assert.equal(w.phase, 'finished'); assert.equal(w.paused, true); }
  return w;
}
const complete = demo();
playthroughs.push({ mode: 'ordinary shared-API heuristic demonstration', actionCount: complete.actions, score: complete.score, objectives: copy(complete.objectives), summary: copy(complete.summary), ledger: copy(complete.ledger), board: copy(complete.board) });

test('fresh independent world is paused with one seed and no unearned score', () => {
  const a = E.createWorld(), b = E.createWorld(); assert.equal(a.phase, 'arranging'); assert.equal(a.paused, true); assert.equal(a.deckIndex, 0); assert.equal(a.board.length, 1); assert.equal(a.board[0].tileId, E.SEED.id); assert.equal(a.score, 0); assert.equal(a.summary, null); assert.equal(a.actions, 0); assert.equal(a.selected, null); a.board[0].edges[0] = 'forest'; assert.equal(b.board[0].edges[0], 'water'); assert.ok(E.restore(E.serialize(b)));
});
test('authored eighteen-tile deck has immutable unique IDs and actual terrain ports', () => {
  assert.equal(E.DECK.length, 18); assert.equal(new Set(E.DECK.map(item => item.id)).size, 18); assert.ok(Object.isFrozen(E.DECK));
  for (const model of [E.SEED, ...E.DECK]) { assert.ok(Object.isFrozen(model) && Object.isFrozen(model.edges)); assert.equal(model.edges.length, 6); assert.ok(model.edges.every(value => Object.hasOwn(E.TERRAINS, value))); assert.ok(Object.hasOwn(E.TERRAINS, model.center)); }
});
test('axial directions match requested clockwise pointy-top edge centers', () => {
  assert.deepEqual(E.DIRS, [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]);
  E.DIRS.forEach(([q, r], i) => { const x = Math.sqrt(3) * (q + r / 2), y = 1.5 * r, angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; assert.ok(Math.abs(angle - i * 60) < 1e-8); });
});
test('opposite directions return to the original cell and rotate terrain clockwise', () => {
  E.DIRS.forEach(([q, r], i) => { const opposite = E.DIRS[(i + 3) % 6]; assert.equal(q + opposite[0], 0); assert.equal(r + opposite[1], 0); });
  const model = E.DECK[0]; for (let r = 0; r < 6; r++) for (let d = 0; d < 6; d++) assert.equal(E.rotatedEdges(model, r)[(d + r) % 6], model.edges[d]);
});
test('all unpaused gameplay actions are blocked while paused without mutations', () => {
  const w = E.createWorld(); for (const [type, payload] of [['select', { q: 1, r: 0 }], ['rotate', 1], ['orient', 2], ['place'], ['undo'], ['finish']]) sameAfterReject(w, type, payload); assert.equal(E.demoPlanner(w), null);
});
test('malformed values unknown actions and unwanted payload properties are atomic', () => {
  const w = fresh(); for (const [type, payload] of [['pause', 1], ['select', null], ['select', []], ['select', { q: 0, r: 1, fake: true }], ['select', { q: .5, r: 1 }], ['select', { q: Infinity, r: 0 }], ['select', { q: '1', r: 0 }], ['orient', 6], ['orient', -1], ['rotate', 6], ['rotate', .5], ['place', {}], ['undo', true], ['finish', 'win'], ['grant', 100]]) sameAfterReject(w, type, payload);
});
test('select allows bounded frontier coordinates but rejects occupied or isolated cells', () => {
  const w = fresh(); for (const cell of [{ q: 0, r: 0 }, { q: 2, r: 2 }, { q: 13, r: 0 }, { q: 0, r: -13 }]) sameAfterReject(w, 'select', cell); apply(w, 'select', { q: 1, r: 0 }); assert.deepEqual(w.selected, { q: 1, r: 0 });
});
test('frontier is unique adjacent empty geometry with no mutation or placed coordinates', () => {
  const w = fresh(), before = copy(w), open = E.frontier(w); assert.equal(open.length, 6); assert.equal(new Set(open.map(cell => `${cell.q},${cell.r}`)).size, 6); assert.ok(open.every(cell => cell.q !== 0 || cell.r !== 0)); assert.deepEqual(w, before);
  apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); const after = E.frontier(w); assert.equal(after.length, 8); assert.ok(!after.some(cell => cell.q === -1 && cell.r === 0));
});
test('selection and same orientation are harmless no-ops rather than ledger growth', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); const before = copy(w); assert.equal(apply(w, 'select', { q: -1, r: 0 }).changed, false); assert.equal(apply(w, 'orient', 0).changed, false); assert.equal(apply(w, 'rotate', 0).changed, false); assert.deepEqual(w, before);
});
test('rotate changes only current terrain orientation and does not move placed terrain', () => {
  const w = fresh(), seed = copy(w.board); apply(w, 'rotate', 1); assert.equal(w.rotation, 1); assert.deepEqual(E.status(w).currentTile.edges, E.rotatedEdges(E.DECK[0], 1)); apply(w, 'rotate', -2); assert.equal(w.rotation, 5); apply(w, 'orient', 2); assert.equal(w.rotation, 2); assert.deepEqual(w.board, seed);
});
test('preview is pure and explains no selection occupied cells isolated positions and bad orientations', () => {
  const w = fresh(), before = copy(w); assert.equal(E.preview(w).valid, false); for (const args of [[0, 0], [3, 0], [13, 0], [1, 0, 6]]) assert.equal(E.preview(w, ...args).valid, false); assert.deepEqual(w, before);
});
test('water-to-land incoming mismatch is forbidden and placement cannot change score or board', () => {
  const w = fresh(); apply(w, 'select', { q: 1, r: 0 }); apply(w, 'orient', 1); const p = E.preview(w); assert.equal(p.valid, false); assert.equal(p.connections.length, 1); assert.equal(p.connections[0].waterConflict, true); assert.match(p.reason, /水道与陆地/); sameAfterReject(w, 'place');
});
test('valid river preview scores its exact shared edge and reveals projected real water group', () => {
  const w = fresh(), before = copy(w), p = E.preview(w, -1, 0, 0); assert.equal(p.valid, true); assert.equal(p.matches, 1); assert.equal(p.contacts, 1); assert.equal(p.perfect, true); assert.equal(p.score, 22); assert.equal(p.objectives.water.current, 2); assert.equal(p.connections[0].direction, 0); assert.equal(p.connections[0].neighborTerrain, 'water'); assert.deepEqual(w, before);
});
test('explicit placement agrees with preview and consumes exactly one authored tile', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); const p = E.preview(w), result = apply(w, 'place'); assert.equal(w.deckIndex, 1); assert.equal(w.board.length, 2); assert.equal(result.placement.score, p.score); assert.equal(w.score, p.score); assert.deepEqual(w.objectives, p.objectives); assert.equal(w.selected, null); assert.equal(w.rotation, 0); assert.equal(E.status(w).remaining, 17); assert.equal(E.status(w).currentTile.id, E.DECK[1].id);
});
test('forest-village land mismatch remains legal and earns less than an exact edge', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); const different = E.preview(w, 1, -1, 0), exact = E.preview(w, 0, 1, 0); assert.equal(different.valid, true); assert.equal(different.mismatches, 1); assert.equal(different.matches, 0); assert.equal(different.perfect, false); assert.equal(exact.valid, true); assert.ok(different.score < exact.score); apply(w, 'select', { q: 1, r: -1 }); apply(w, 'place'); assert.equal(w.board.at(-1).score, different.score); assert.equal(w.objectives.forest.current, 1);
});
test('only equal shared terrain edges join a group even across touching cells', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); apply(w, 'select', { q: 1, r: -1 }); apply(w, 'place'); assert.equal(w.groups.forest.length, 2); assert.ok(w.groups.forest.every(group => group.size === 1)); assert.equal(w.objectives.forest.current, 1);
});
test('forest matching edge joins the exact real cells and reaches two before objective threshold', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); apply(w, 'select', { q: 0, r: 1 }); apply(w, 'place'); assert.equal(w.objectives.forest.current, 2); assert.equal(w.objectives.forest.complete, false); assert.deepEqual(w.groups.forest[0].cells.map(cell => [cell.q, cell.r]), [[0, 0], [0, 1]]);
});
test('connected component totals include each terrain-bearing cell at most once', () => {
  for (const [terrain, groups] of Object.entries(complete.groups)) { const cells = groups.flatMap(group => group.cells); assert.equal(new Set(cells.map(cell => `${cell.q},${cell.r}`)).size, cells.length); assert.equal(cells.length, complete.board.filter(cell => cell.center === terrain || cell.edges.includes(terrain)).length); }
});
test('every completed connection group is genuinely reachable over matching shared ports', () => {
  for (const [terrain, groups] of Object.entries(complete.groups)) for (const group of groups) {
    const visited = new Set(), todo = [group.cells[0]], wanted = new Set(group.cells.map(cell => `${cell.q},${cell.r}`));
    while (todo.length) { const item = todo.pop(), cellKey = `${item.q},${item.r}`; if (visited.has(cellKey)) continue; visited.add(cellKey); const cell = complete.board.find(c => c.q === item.q && c.r === item.r); E.DIRS.forEach(([dq, dr], direction) => { const q = cell.q + dq, r = cell.r + dr, adjacent = complete.board.find(c => c.q === q && c.r === r); if (cell.edges[direction] === terrain && adjacent?.edges[(direction + 3) % 6] === terrain && wanted.has(`${q},${r}`)) todo.push({ q, r }); }); }
    assert.equal(visited.size, group.size);
  }
});
test('placement contacts count only actual neighbors with transparent match scoring', () => {
  const w = fresh(); for (const entry of complete.ledger) { if (entry.type === 'finish') break; const p = entry.type === 'place' ? E.preview(w) : null; apply(w, entry.type, entry.payload); if (p) { const cell = w.board.at(-1); assert.equal(cell.matches, p.connections.filter(c => c.match).length); assert.equal(cell.contacts, p.connections.length); assert.equal(cell.score, Math.max(0, p.matches * 10 - p.mismatches * 3) + (p.perfect ? 12 : 0)); } }
});
test('undo cannot remove seed and returns last tile score deck and actual objectives', () => {
  const w = fresh(); sameAfterReject(w, 'undo'); const original = copy(w); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); apply(w, 'undo'); assert.deepEqual(w.board, original.board); assert.equal(w.deckIndex, 0); assert.equal(w.score, 0); assert.deepEqual(w.objectives, original.objectives); assert.equal(w.stats.placements, 0); assert.equal(w.stats.perfectPlacements, 0); assert.equal(w.stats.matchedEdges, 0); assert.equal(w.stats.undos, 1); assert.deepEqual(w.selected, { q: -1, r: 0 }); assert.ok(E.restore(E.serialize(w)));
});
test('undo preserves the removed orientation for a genuine subsequent replacement', () => {
  const w = fresh(); apply(w, 'select', { q: 0, r: -1 }); apply(w, 'orient', 2); const p = E.preview(w); assert.equal(p.valid, true); apply(w, 'place'); apply(w, 'undo'); assert.equal(w.rotation, 2); assert.equal(w.rotation, p.rotation); assert.deepEqual(w.selected, { q: p.q, r: p.r }); const again = apply(w, 'place').placement; assert.deepEqual(again.edges, p.edges); assert.equal(again.score, p.score);
});
test('undo retracts attained objectives and restores them only through replacement', () => {
  const w = fresh(); for (let n = 0; n < 80 && !w.objectives.water.complete; n++) { const action = E.demoPlanner(w); apply(w, action.type, action.payload); }
  const before = copy(w); assert.equal(w.objectives.water.current, 5); apply(w, 'undo'); assert.equal(w.deckIndex, before.deckIndex - 1); assert.ok(w.score < before.score); assert.equal(w.objectives.water.current, 4); assert.equal(w.objectives.water.complete, false); assert.equal(w.summary, null); assert.equal(w.phase, 'arranging'); apply(w, 'place'); assert.equal(w.deckIndex, before.deckIndex); assert.equal(w.score, before.score); assert.deepEqual(w.objectives, before.objectives); assert.equal(w.phase, 'arranging');
});
test('remaining queued previews are copies and cannot mutate authored deck or world', () => {
  const w = fresh(), before = copy(w), s = E.status(w); assert.equal(s.upcoming.length, 3); s.currentTile.edges[0] = 'village'; s.upcoming[0].edges[0] = 'water'; s.objectives.forest.current = 900; assert.deepEqual(w, before); assert.equal(E.DECK[0].edges[0], 'water'); assert.equal(E.DECK[1].edges[0], 'forest');
});
test('finish is rejected before all eighteen tiles and objective completion alone does not finish', () => {
  const w = fresh(); sameAfterReject(w, 'finish'); for (let n = 0; n < 80 && Object.values(w.objectives).some(item => !item.complete); n++) { const plan = E.demoPlanner(w); apply(w, plan.type, plan.payload); } assert.ok(Object.values(w.objectives).every(item => item.complete)); assert.ok(w.deckIndex < 18); assert.equal(w.phase, 'arranging'); sameAfterReject(w, 'finish');
});
test('eighteenth placement leaves an editable board and needs explicit finish', () => {
  const w = demo(fresh(), false); assert.equal(w.phase, 'arranging'); assert.equal(w.paused, false); assert.equal(w.summary, null); assert.equal(E.status(w).currentTile, null); assert.equal(E.status(w).remaining, 0); assert.equal(E.status(w).canFinish, true); sameAfterReject(w, 'place'); sameAfterReject(w, 'rotate', 1); sameAfterReject(w, 'select', E.frontier(w)[0]); assert.equal(E.demoPlanner(w).type, 'finish');
});
test('explicit finish summarizes actual score groups and success without bonus grants', () => {
  assert.equal(complete.phase, 'finished'); assert.equal(complete.paused, true); assert.equal(complete.summary.score, complete.score); assert.deepEqual(complete.summary.objectives, complete.objectives); assert.equal(complete.summary.placements, 18); assert.equal(complete.summary.completedObjectives, 3); assert.equal(complete.summary.matchedEdges, complete.stats.matchedEdges);
});
test('a legal low-connectivity arrangement finishes with genuine unmet goals instead of fake success', () => {
  const w = fresh();
  for (let placed = 0; placed < 18; placed++) {
    let chosen;
    for (const cell of E.frontier(w)) for (let rotation = 0; rotation < 6; rotation++) {
      const p = E.preview(w, cell.q, cell.r, rotation); if (!p.valid) continue;
      const value = Object.values(p.objectives).reduce((sum, item) => sum + item.current, 0) * 10000 + p.score + Math.max(Math.abs(cell.q), Math.abs(cell.r), Math.abs(cell.q + cell.r)) * 2;
      if (!chosen || value < chosen.value) chosen = { cell, rotation, value };
    }
    assert.ok(chosen); apply(w, 'orient', chosen.rotation); apply(w, 'select', chosen.cell); apply(w, 'place'); invariants(w);
  }
  const score = w.score, objectives = copy(w.objectives), count = Object.values(objectives).filter(item => item.complete).length;
  assert.ok(count < 3); apply(w, 'finish'); assert.equal(w.summary.completedObjectives, count); assert.equal(w.score, score); assert.deepEqual(w.summary.objectives, objectives); assert.ok(E.restore(E.serialize(w)));
  playthroughs.push({ mode: 'ordinary legal low-connectivity counterexample', actionCount: w.actions, score: w.score, objectives: copy(w.objectives), summary: copy(w.summary), ledger: copy(w.ledger), board: copy(w.board) });
});
test('terminal world rejects resume and all board mutations without losing its result', () => {
  const w = copy(complete); for (const [type, payload] of [['pause', false], ['select', { q: 2, r: 0 }], ['orient', 3], ['rotate', 1], ['place'], ['undo'], ['finish']]) sameAfterReject(w, type, payload); assert.equal(E.demoPlanner(w), null); assert.equal(E.status(w).canUndo, false); assert.equal(E.status(w).canFinish, false);
});
test('ordinary deterministic heuristic reaches all objectives using only accepted player actions', () => {
  const a = demo(), b = demo(); assert.deepEqual(a, b); assert.equal(a.deckIndex, 18); assert.equal(a.ledger.filter(entry => entry.type === 'place').length, 18); assert.ok(a.ledger.every(entry => ['select', 'orient', 'place', 'finish'].includes(entry.type))); assert.ok(a.objectives.forest.current >= 4 && a.objectives.village.current >= 3 && a.objectives.water.current >= 5); assert.equal(a.ledger.at(-1).type, 'finish');
});
test('heuristic can continue a legal manual detour and undo without replacing the board', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); apply(w, 'select', { q: 1, r: -1 }); apply(w, 'place'); apply(w, 'undo'); apply(w, 'select', { q: 0, r: 1 }); apply(w, 'place');
  const board = copy(w.board), final = demo(w); assert.deepEqual(final.board.slice(0, board.length), board); assert.equal(final.stats.undos, 1); assert.equal(final.summary.completedObjectives, 3);
});
test('paused planner returns no action while its live preview can still explain the map', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'pause', true); assert.equal(E.demoPlanner(w), null); assert.equal(E.preview(w).valid, true); assert.equal(E.status(w).canPlace, false); assert.equal(E.status(w).canUndo, false);
});
test('serialize is a deep normalized paused snapshot and never changes live state', () => {
  const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); const before = copy(w), saved = E.serialize(w); assert.equal(saved.paused, true); assert.equal(w.paused, false); saved.board[0].edges[0] = 'forest'; assert.deepEqual(w, before);
});
test('strict replay restores initial partial undone and completed worlds paused', () => {
  const states = [E.createWorld(), fresh(), copy(complete)]; const w = fresh(); apply(w, 'select', { q: -1, r: 0 }); apply(w, 'place'); apply(w, 'orient', 2); states.push(copy(w)); apply(w, 'undo'); states.push(copy(w)); for (const state of states) { const restored = E.restore(E.serialize(state)); assert.ok(restored); assert.equal(restored.paused, true); assert.deepEqual(restored, E.serialize(state)); assert.deepEqual(E.restore(JSON.stringify(E.serialize(state))), restored); }
});
test('forged derived score coordinates terrain objective stats log message phase and summary reject', () => {
  const alterations = [w => w.score++, w => w.board[1].q++, w => w.board[1].edges[0] = 'forest', w => w.board[1].rotation = 5, w => w.objectives.forest.current++, w => w.objectives.water.complete = false, w => w.stats.matchedEdges++, w => w.message = 'fake', w => w.log.push('fake'), w => w.phase = 'arranging', w => w.summary.score++, w => w.groups.forest[0].size++, w => w.actions++, w => w.deckIndex--, w => w.selected = { q: 10, r: 10 }, w => w.extra = 'invented'];
  for (const change of alterations) { const forged = copy(complete); change(forged); assert.equal(E.restore(forged), null); }
});
test('unknown malformed repetitive skipped or post-finish ledger records reject', () => {
  for (const ledger of [[{ type: 'grant', payload: 100 }], [{ type: 'pause', payload: false }], [{ type: 'orient', payload: 0 }], [{ type: 'select', payload: { q: -1, r: 0 }, extra: true }], [{ type: 'place' }], [...complete.ledger, { type: 'undo' }]]) { const forged = copy(complete); forged.ledger = ledger; assert.equal(E.restore(forged), null); }
});
test('malformed oversized cyclic wrong-version and non-object saves reject safely', () => {
  const cyclic = {}; cyclic.loop = cyclic; for (const input of [null, [], 0, '{}', '{bad', 'x'.repeat(E.MAX_SAVE_BYTES + 1), { ...E.serialize(complete), version: 2 }, cyclic]) assert.equal(E.restore(input), null);
});
test('legal action cap is genuinely reached by replayable rotations and prevents further mutation', () => {
  const w = fresh(); for (let n = 0; n < E.MAX_ACTIONS; n++) apply(w, 'rotate', 1); assert.equal(w.actions, E.MAX_ACTIONS); assert.ok(E.restore(E.serialize(w))); for (const [type, payload] of [['rotate', 1], ['select', { q: -1, r: 0 }], ['place']]) sameAfterReject(w, type, payload); assert.equal(E.demoPlanner(w), null); const forged = E.serialize(w); forged.ledger.push({ type: 'rotate', payload: 1 }); assert.equal(E.restore(forged), null);
});
test('complete source topology score and objectives meet all authoritative invariants', () => { invariants(complete); assert.equal(E.status(complete).completedObjectives, 3); assert.equal(E.status(complete).score, complete.score); });

const report = { date: '2026-10-06', direction: 'RIVERFOLD / 溪丘拼境', passed: failures.length === 0, checkCount: checks.length, checks, failures, playthroughs, limits: { actions: E.MAX_ACTIONS, saveBytes: E.MAX_SAVE_BYTES, coordinateLimit: E.COORD_LIMIT }, method: 'Actual exported production engine API and deterministic replay. No injected objective, score, victory, clock or grant action.' };
fs.mkdirSync(path.join(project, 'notes'), { recursive: true });
fs.writeFileSync(path.join(project, 'notes/direction-landscape-rules-20261006.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, failures, ordinaryDemo: { actions: complete.actions, score: complete.score, objectives: complete.objectives } }));
if (!report.passed) process.exitCode = 1;
