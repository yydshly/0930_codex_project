import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-investigation-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
const copy = value => structuredClone(value);
const fresh = () => { const w = E.createWorld(); assert.ok(E.act(w, 'pause', false).ok); return w; };
function apply(w, type, payload) { const result = E.act(w, type, payload); assert.ok(result.ok, `${type}: ${result.reason}`); return result; }
function discover() { const w = fresh(); for (const scene of E.SCENES) { apply(w, 'scene', scene.id); for (const id of scene.clueIds) apply(w, 'inspect', id); } return w; }
function verify(w, id, reverse = false) { const model = E.CLAIMS[id]; apply(w, 'setHypothesis', { claimId: id, value: model.answer }); for (const clueId of reverse ? [...model.requiredEvidence].reverse() : model.requiredEvidence) apply(w, 'pin', { claimId: id, clueId }); const result = apply(w, 'verify', id); assert.equal(result.verified, true); }
function reconstructed(reverse = false) { const w = discover(); for (const id of Object.keys(E.CLAIMS)) verify(w, id, reverse); return w; }
function bad(w, change) { const forged = copy(w); change(forged); assert.equal(E.restore(JSON.stringify(forged)), null); }
function invariants(w) {
  assert.equal(w.actions, w.ledger.length); assert.equal(w.inspected.length, new Set(w.inspected).size); assert.equal(w.stats.inspections, w.inspected.length); assert.ok(w.inspected.every(id => Object.hasOwn(E.CLUES, id))); assert.ok(w.log.length <= 24); if (w.selectedClue) assert.ok(w.inspected.includes(w.selectedClue));
  for (const [id, h] of Object.entries(w.hypotheses)) { assert.ok(h.value === null || E.CLAIMS[id].options.some(option => option.value === h.value)); assert.ok(h.evidence.length <= 2); assert.equal(new Set(h.evidence).size, h.evidence.length); assert.ok(h.evidence.every(clueId => w.inspected.includes(clueId))); if (h.verified) { assert.equal(h.value, E.CLAIMS[id].answer); assert.deepEqual([...h.evidence].sort(), [...E.CLAIMS[id].requiredEvidence].sort()); } }
}
function demo(initial = fresh(), ending = null) {
  const w = initial;
  for (let i = 0; i < 100 && !w.paused; i++) { const before = E.serialize(w), plan = E.demoPlanner(w); assert.ok(plan); assert.deepEqual(plan, E.demoPlanner(w)); assert.equal(E.serialize(w), before); if (ending && plan.action === 'chooseEnding') plan.payload = ending; apply(w, plan.action, plan.payload); invariants(w); assert.ok(E.restore(E.serialize(w))); }
  assert.equal(w.phase, 'resolved'); assert.equal(w.paused, true); assert.equal(E.status(w).verified.length, 3); assert.equal(w.inspected.length, 9);
  playthroughs.push({ mode: 'ordinary same-API demonstration', ending: w.ending, actionCount: w.actions, inspected: copy(w.inspected), hypotheses: copy(w.hypotheses), stats: copy(w.stats), actions: copy(w.ledger) }); return w;
}
const solved = reconstructed(), reply = demo(), archive = demo(fresh(), 'archive');

test('fresh one-case world is paused independent and contains no discoveries or verified conclusions', () => {
  const a = E.createWorld(), b = E.createWorld(); assert.equal(a.phase, 'investigating'); assert.equal(a.paused, true); assert.equal(a.scene, 'station'); assert.deepEqual(a.inspected, []); assert.equal(a.selectedClue, null); assert.equal(a.ending, null); assert.equal(a.actions, 0); assert.equal(a.ledger.length, 0); for (const h of Object.values(a.hypotheses)) assert.deepEqual(h, { value: null, evidence: [], verified: false }); a.hypotheses.actor.evidence.push('dispatch'); assert.equal(b.hypotheses.actor.evidence.length, 0); assert.ok(E.restore(E.serialize(b)));
});
test('three scenes contain nine original unique clue records with consistent ownership', () => {
  assert.deepEqual(E.SCENES.map(scene => scene.id), ['station', 'office', 'quay']); const ids = E.SCENES.flatMap(scene => scene.clueIds); assert.equal(ids.length, 9); assert.equal(new Set(ids).size, 9); assert.deepEqual([...ids].sort(), Object.keys(E.CLUES).sort()); for (const scene of E.SCENES) { assert.equal(scene.clueIds.length, 3); for (const id of scene.clueIds) { assert.equal(E.CLUES[id].scene, scene.id); assert.ok(E.CLUES[id].hotspot.x > 0 && E.CLUES[id].hotspot.x < 1 && E.CLUES[id].hotspot.y > 0 && E.CLUES[id].hotspot.y < 1); assert.ok(Object.isFrozen(E.CLUES[id].hotspot)); } } assert.ok(Object.isFrozen(E.CLUES));
});
test('clock warehouse delivery and transport texts separate the case times and person roles', () => {
  assert.match(E.CLUES.clock.detail, /22:10.*未再运转/); assert.match(E.CLUES.timetable.detail, /21:40.*已开出.*西港/); assert.match(E.CLUES.timetable.text, /东岸支线已停开/); assert.match(E.CLUES.note.text, /东岸支线封闭/); assert.match(E.CLUES.bag.text, /22:30.*空邮袋/); assert.match(E.CLUES.bag.detail, /交付时封条完整.*现在袋中已无信件/); assert.match(E.CLUES.dispatch.text, /21:25.*林岚.*栈桥/); assert.match(E.CLUES.key.text, /21:00.*封存/); assert.match(E.CLUES.tide.text, /21:35.*出港/); assert.match(E.CLUES.receipt.text, /21:50.*东岸安置站.*周远/); assert.match(E.CLUES.letter.text, /报平安/);
});
test('paused investigation cannot discover select travel reason verify or submit', () => {
  const w = E.createWorld(), before = E.serialize(w); for (const [type, payload] of [['scene', 'office'], ['inspect', 'clock'], ['selectClue', 'clock'], ['setHypothesis', { claimId: 'actor', value: 'lin' }], ['pin', { claimId: 'actor', clueId: 'dispatch' }], ['verify', 'actor'], ['chooseEnding', 'reply'], ['submit']]) assert.equal(E.act(w, type, payload).ok, false); assert.equal(E.serialize(w), before); assert.equal(E.demoPlanner(w), null);
});
test('an undiscovered clue can only be inspected in its actual scene and cannot be granted', () => {
  const w = fresh(), before = E.serialize(w); for (const id of ['dispatch', 'receipt', 'unknown', '__proto__']) assert.equal(E.act(w, 'inspect', id).ok, false); assert.equal(E.act(w, 'grant', 'dispatch').ok, false); assert.equal(E.serialize(w), before); apply(w, 'scene', 'office'); const result = apply(w, 'inspect', 'dispatch'); assert.equal(result.clue.id, 'dispatch'); assert.deepEqual(w.inspected, ['dispatch']); assert.equal(w.selectedClue, 'dispatch');
});
test('discovery order is unique and repeated inspect leaves the entire world unchanged', () => {
  const w = fresh(); apply(w, 'inspect', 'bag'); apply(w, 'inspect', 'clock'); apply(w, 'inspect', 'timetable'); assert.deepEqual(w.inspected, ['bag', 'clock', 'timetable']); const before = E.serialize(w); assert.equal(E.act(w, 'inspect', 'clock').ok, false); assert.equal(E.serialize(w), before); assert.equal(w.stats.inspections, 3);
});
test('found evidence can be reread from another scene without travel or rediscovery', () => {
  const w = fresh(); apply(w, 'inspect', 'clock'); apply(w, 'scene', 'quay'); assert.equal(w.selectedClue, null); apply(w, 'selectClue', 'clock'); assert.equal(w.scene, 'quay'); assert.equal(w.selectedClue, 'clock'); assert.deepEqual(w.inspected, ['clock']); const before = E.serialize(w); assert.equal(E.act(w, 'selectClue', 'receipt').ok, false); assert.equal(E.serialize(w), before);
});
test('malformed action names scene IDs pause values and reasoning payloads fail atomically', () => {
  const w = fresh(), before = E.serialize(w); for (const [type, payload] of [['pause', 0], ['scene', 'tunnel'], ['scene', null], ['verify', 'constructor'], ['setHypothesis', null], ['setHypothesis', { claimId: 'actor', value: 'lin', extra: true }], ['setHypothesis', { claimId: 'actor', value: 'invented' }], ['pin', { claimId: 'actor', clueId: 'clock', extra: true }], ['pin', []], ['chooseEnding', 'secret'], ['invent-result', true]]) assert.equal(E.act(w, type, payload).ok, false); assert.equal(E.serialize(w), before);
});
test('each fact has three legal candidate values and its own two-record validation requirement', () => {
  assert.deepEqual(Object.keys(E.CLAIMS), ['actor', 'route', 'destination']); assert.deepEqual(E.CLAIMS.actor.options.map(option => option.value), ['lin', 'zhou', 'pei']); assert.deepEqual(E.CLAIMS.route.requiredEvidence, ['timetable', 'tide']); assert.deepEqual(E.CLAIMS.destination.requiredEvidence, ['bag', 'receipt']); for (const model of Object.values(E.CLAIMS)) { assert.equal(model.options.length, 3); assert.equal(model.requiredEvidence.length, 2); assert.equal(new Set(model.requiredEvidence).size, 2); }
});
test('unfound evidence cannot be associated and a pin does not itself verify a fact', () => {
  const w = fresh(), before = E.serialize(w); assert.equal(E.act(w, 'pin', { claimId: 'actor', clueId: 'dispatch' }).ok, false); assert.equal(E.serialize(w), before); apply(w, 'inspect', 'clock'); apply(w, 'pin', { claimId: 'actor', clueId: 'clock' }); assert.deepEqual(w.hypotheses.actor.evidence, ['clock']); assert.equal(w.hypotheses.actor.verified, false);
});
test('each fact rejects duplicate or third evidence without losing its current two pins', () => {
  const w = discover(); apply(w, 'pin', { claimId: 'actor', clueId: 'dispatch' }); apply(w, 'pin', { claimId: 'actor', clueId: 'note' }); const before = E.serialize(w); for (const clueId of ['dispatch', 'clock']) assert.equal(E.act(w, 'pin', { claimId: 'actor', clueId }).ok, false); assert.equal(E.serialize(w), before); assert.deepEqual(w.hypotheses.actor.evidence, ['dispatch', 'note']);
});
test('verification requires a candidate and exactly two discovered records before it can be attempted', () => {
  const w = discover(), initial = E.serialize(w); assert.equal(E.act(w, 'verify', 'actor').ok, false); assert.equal(E.serialize(w), initial); apply(w, 'setHypothesis', { claimId: 'actor', value: 'lin' }); apply(w, 'pin', { claimId: 'actor', clueId: 'dispatch' }); const before = E.serialize(w); assert.equal(E.act(w, 'verify', 'actor').ok, false); assert.equal(E.serialize(w), before); assert.equal(w.stats.verifications, 0);
});
test('correct evidence does not validate the wrong person and feedback does not name the answer', () => {
  const w = discover(); apply(w, 'setHypothesis', { claimId: 'actor', value: 'zhou' }); for (const clueId of ['dispatch', 'note']) apply(w, 'pin', { claimId: 'actor', clueId }); const result = apply(w, 'verify', 'actor'); assert.equal(result.verified, false); assert.equal(w.hypotheses.actor.verified, false); assert.equal(w.stats.failedVerifications, 1); assert.ok(!result.reason.includes('林岚')); assert.ok(!result.reason.includes('dispatch')); assert.ok(!result.reason.includes('note'));
});
test('correct candidate with irrelevant records fails and can be repaired through normal unpin pin verify', () => {
  const w = discover(); apply(w, 'setHypothesis', { claimId: 'route', value: 'ferry' }); for (const clueId of ['clock', 'key']) apply(w, 'pin', { claimId: 'route', clueId }); assert.equal(apply(w, 'verify', 'route').verified, false); for (const [oldId, newId] of [['clock', 'timetable'], ['key', 'tide']]) { apply(w, 'unpin', { claimId: 'route', clueId: oldId }); apply(w, 'pin', { claimId: 'route', clueId: newId }); } assert.equal(apply(w, 'verify', 'route').verified, true); assert.equal(w.stats.verifications, 2); assert.equal(w.stats.failedVerifications, 1);
});
test('two correct records validate regardless of pin order and never validate another fact implicitly', () => {
  const w = discover(); verify(w, 'destination', true); assert.equal(w.hypotheses.destination.verified, true); assert.equal(w.hypotheses.actor.verified, false); assert.equal(w.hypotheses.route.verified, false); assert.deepEqual(w.hypotheses.destination.evidence, ['receipt', 'bag']);
});
test('changing a verified candidate clears verification and any chosen ending immediately', () => {
  const w = copy(solved); apply(w, 'chooseEnding', 'archive'); apply(w, 'setHypothesis', { claimId: 'actor', value: 'pei' }); assert.equal(w.hypotheses.actor.verified, false); assert.equal(w.hypotheses.route.verified, true); assert.equal(w.ending, null); assert.equal(E.act(w, 'submit').ok, false); apply(w, 'setHypothesis', { claimId: 'actor', value: 'lin' }); assert.equal(w.hypotheses.actor.verified, false); assert.equal(apply(w, 'verify', 'actor').verified, true);
});
test('unpinning verified evidence requires revalidation even when the same evidence is later repinned', () => {
  const w = copy(solved); apply(w, 'chooseEnding', 'reply'); apply(w, 'unpin', { claimId: 'destination', clueId: 'bag' }); assert.equal(w.hypotheses.destination.verified, false); assert.equal(w.ending, null); apply(w, 'pin', { claimId: 'destination', clueId: 'bag' }); assert.equal(w.hypotheses.destination.verified, false); assert.equal(apply(w, 'verify', 'destination').verified, true);
});
test('same candidate selection and already verified confirmation are safe no-ops', () => {
  const w = copy(solved), before = E.serialize(w); const selection = apply(w, 'setHypothesis', { claimId: 'actor', value: 'lin' }), confirmation = apply(w, 'verify', 'actor'); assert.equal(selection.unchanged, true); assert.equal(confirmation.unchanged, true); assert.equal(confirmation.verified, true); assert.equal(E.serialize(w), before);
});
test('a candidate can be cleared without erasing found clues or silently keeping its validation', () => {
  const w = copy(solved), found = copy(w.inspected); apply(w, 'setHypothesis', { claimId: 'actor', value: null }); assert.equal(w.hypotheses.actor.value, null); assert.equal(w.hypotheses.actor.verified, false); assert.deepEqual(w.inspected, found); assert.equal(w.hypotheses.actor.evidence.length, 2); assert.equal(E.act(w, 'verify', 'actor').ok, false);
});
test('all three verified facts still need the actual letter before an ending can be selected', () => {
  const w = fresh(); for (const scene of E.SCENES) { apply(w, 'scene', scene.id); for (const id of scene.clueIds.filter(id => id !== 'letter')) apply(w, 'inspect', id); } for (const id of Object.keys(E.CLAIMS)) verify(w, id); assert.equal(E.status(w).readyToConclude, false); const before = E.serialize(w); assert.equal(E.act(w, 'chooseEnding', 'archive').ok, false); assert.equal(E.act(w, 'submit').ok, false); assert.equal(E.serialize(w), before); apply(w, 'inspect', 'letter'); assert.equal(E.status(w).readyToConclude, true); apply(w, 'chooseEnding', 'archive'); assert.equal(w.phase, 'investigating');
});
test('finding the letter alone cannot skip reconstruction or manufacture a resolution', () => {
  const w = fresh(); apply(w, 'scene', 'quay'); apply(w, 'inspect', 'letter'); const before = E.serialize(w); assert.equal(E.act(w, 'chooseEnding', 'reply').ok, false); assert.equal(E.act(w, 'submit').ok, false); assert.equal(E.serialize(w), before); assert.equal(w.phase, 'investigating');
});
test('ending selection is reversible while only explicit submit resolves and pauses the case', () => {
  const w = copy(solved); assert.equal(E.act(w, 'submit').ok, false); apply(w, 'chooseEnding', 'archive'); assert.equal(w.phase, 'investigating'); assert.equal(w.paused, false); apply(w, 'chooseEnding', 'reply'); assert.equal(w.ending, 'reply'); const before = E.serialize(w); assert.equal(E.act(w, 'submit', { grant: true }).ok, false); assert.equal(E.serialize(w), before); const result = apply(w, 'submit'); assert.equal(result.ending.id, 'reply'); assert.equal(w.phase, 'resolved'); assert.equal(w.paused, true);
});
test('ordinary complete manual reconstruction can reverse pin order and choose formal archive', () => {
  const w = reconstructed(true); apply(w, 'chooseEnding', 'archive'); apply(w, 'submit'); invariants(w); assert.equal(w.phase, 'resolved'); assert.equal(w.ending, 'archive'); assert.equal(w.stats.failedVerifications, 0); assert.ok(E.restore(E.serialize(w))); playthroughs.push({ mode: 'ordinary explicit manual actions with reversed evidence order', ending: w.ending, actionCount: w.actions, inspected: copy(w.inspected), hypotheses: copy(w.hypotheses), actions: copy(w.ledger) });
});
test('both ordinary demo endings resolve the same facts with distinct original narrative text', () => {
  assert.equal(reply.ending, 'reply'); assert.equal(archive.ending, 'archive'); assert.equal(reply.actions, 25); assert.equal(archive.actions, 25); assert.deepEqual(reply.hypotheses, archive.hypotheses); assert.notEqual(E.status(reply).ending.text, E.status(archive).ending.text); assert.match(E.status(reply).ending.text, /回信/); assert.match(E.status(archive).ending.text, /档案/); assert.equal(E.demoPlanner(reply), null);
});
test('planner repairs human wrong candidates and evidence using normal legal actions', () => {
  const w = discover(); apply(w, 'setHypothesis', { claimId: 'actor', value: 'zhou' }); for (const clueId of ['receipt', 'key']) apply(w, 'pin', { claimId: 'actor', clueId }); assert.equal(apply(w, 'verify', 'actor').verified, false); const completed = demo(w); assert.equal(completed.ending, 'reply'); assert.equal(completed.stats.failedVerifications, 1); assert.ok(completed.ledger.some(entry => entry.type === 'unpin'));
});
test('resolved case rejects further discoveries reasoning ending changes and resumption', () => {
  const w = copy(reply), before = E.serialize(w); for (const [type, payload] of [['pause', false], ['scene', 'station'], ['selectClue', 'clock'], ['setHypothesis', { claimId: 'actor', value: 'pei' }], ['chooseEnding', 'archive'], ['submit']]) assert.equal(E.act(w, type, payload).ok, false); assert.equal(E.serialize(w), before);
});
test('paused restore keeps the exact found order selection hypotheses evidence ending and logs', () => {
  const w = copy(solved); apply(w, 'selectClue', 'clock'); apply(w, 'chooseEnding', 'reply'); apply(w, 'pause', true); const saved = E.serialize(w), restored = E.restore(saved); assert.ok(restored); assert.deepEqual(restored, w); assert.equal(E.serialize(restored), saved); assert.equal(restored.paused, true); assert.equal(E.act(restored, 'submit').ok, false);
});
test('active restore is paused and normal continuation reproduces the same final ending', () => {
  const source = discover(), restored = E.restore(E.serialize(source)); assert.ok(restored); assert.equal(restored.paused, true); apply(restored, 'pause', false); const a = demo(source), b = demo(restored); assert.equal(E.serialize(a), E.serialize(b));
});
test('strict replay rejects fabricated discoveries selections fact evidence and verified flags', () => {
  for (const change of [w => w.inspected.pop(), w => w.inspected.push('clock'), w => w.inspected.reverse(), w => w.selectedClue = 'clock', w => w.hypotheses.actor.value = 'zhou', w => w.hypotheses.actor.evidence = ['receipt', 'note'], w => w.hypotheses.actor.verified = false, w => w.hypotheses.actor.evidence.reverse()]) bad(solved, change); const w = fresh(); bad(w, forged => forged.hypotheses.actor.verified = true);
});
test('strict replay rejects forged resolved state ending counters version and extra fields', () => {
  for (const change of [w => w.phase = 'resolved', w => w.ending = 'reply', w => w.actions++, w => w.stats.inspections++, w => w.stats.verifications++, w => w.scene = 'station', w => w.version++, w => w.extra = true, w => w.message = 'success']) bad(solved, change); bad(reply, w => w.ending = 'archive');
});
test('strict replay rejects missing reordered duplicate unknown and paused ledger actions', () => {
  for (const change of [w => w.ledger = [], w => w.ledger.reverse(), w => w.ledger.push(copy(w.ledger[0])), w => w.ledger[0].type = 'grant', w => w.ledger[0].type = 'pause', w => w.ledger[0].extra = true, w => w.ledger[0].payload = 'receipt', w => w.ledger = null]) bad(solved, change);
});
test('strict restore rejects malformed object inputs oversized UTF8 saves and invalid pause fields', () => {
  for (const input of [null, 123, '', '{', 'null', '[]', '{}', 'x'.repeat(1000001), JSON.stringify({ padding: '字'.repeat(400000) })]) assert.equal(E.restore(input), null); bad(solved, w => w.paused = 'yes');
});
test('a long legal investigation is bounded and the action-cap planner never proposes a rejected move', () => {
  const w = fresh(); while (w.actions < E.MAX_ACTIONS) apply(w, 'scene', w.scene === 'station' ? 'office' : 'station'); invariants(w); assert.equal(w.actions, 4096); assert.equal(w.log.length, 24); const saved = E.serialize(w); assert.ok(new TextEncoder().encode(saved).byteLength < E.MAX_SAVE_BYTES); assert.ok(E.restore(saved)); assert.equal(E.demoPlanner(w), null); assert.equal(E.act(w, 'inspect', 'clock').ok, false); assert.equal(E.serialize(w), saved);
});

const report = { date: '2026-10-05', direction: '夜港来信 / NIGHT POST', passed: failures.length === 0, count: checks.length, checks, failures, playthroughs, method: 'Pure DOM-independent production rule assertions. All solved cases discover actual scene-owned clues through inspect, then use explicit hypothesis/pin/verify/ending/submit actions; no synthetic discovery or outcome grants. Every demo intermediate state is checked through canonical legal-action replay. Restore recomputes all found order, verification, narrative and stats fields and normalizes paused=true; this validates deterministic history rather than authenticating a player identity.', command: 'D:/software/nodejs/node.exe tooling/check-direction-investigation-rules.mjs' };
fs.writeFileSync(path.join(project, 'notes/direction-investigation-rules-20261005.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${checks.length} investigation rule checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
