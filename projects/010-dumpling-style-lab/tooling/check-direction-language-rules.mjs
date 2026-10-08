import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-language-engine.js';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const test = (name, fn) => {
  try { fn(); checks.push(name); }
  catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); }
};
const copy = value => structuredClone(value);
function accepted(w, action) {
  assert.equal(E.act(w, action), true, `Action rejected: ${JSON.stringify(action)}`);
  invariants(w);
  return w.lastResult;
}
function denied(w, action) {
  const before = JSON.stringify(w);
  assert.equal(E.act(w, action), false, 'Malformed or gated action was accepted');
  assert.equal(JSON.stringify(w), before, 'Rejected actions must be atomic');
}
function live() { const w = E.fresh(); accepted(w, { type: 'pause', paused: false }); return w; }
function observe(w, ids) { for (const id of ids) accepted(w, { type: 'observe', id }); }
function confirm(w, glyph) {
  accepted(w, { type: 'guess', glyph, meaning: glyph });
  assert.equal(accepted(w, { type: 'validate', glyph }).success, true);
}
function market(w = live(), reverse = false) {
  observe(w, reverse ? ['m-water', 'm-gift', 'm-lamp', 'm-welcome'] : E.SCENES[0].evidenceIds);
  for (const glyph of reverse ? ['lamp', 'give', 'person'] : ['person', 'give', 'lamp']) confirm(w, glyph);
  return w;
}
function harbor(w = market(), skipSign = false) {
  accepted(w, { type: 'respond', answer: 'lantern' });
  accepted(w, { type: 'visit', scene: 'harbor' });
  observe(w, E.SCENES[1].evidenceIds.filter(id => !skipSign || id !== 'h-sign'));
  for (const glyph of ['water', 'door', 'open']) confirm(w, glyph);
  return w;
}
function lighthouse(w = harbor()) {
  accepted(w, { type: 'respond', answer: 'wheel' });
  accepted(w, { type: 'visit', scene: 'lighthouse' });
  return w;
}
function invariants(w) {
  assert.equal(w.actions, w.ledger.length);
  assert.equal(w.observed.length, new Set(w.observed).size);
  assert.equal(w.solved.length, new Set(w.solved).size);
  assert.equal(w.unlockedScenes.length, new Set(w.unlockedScenes).size);
  assert.equal(w.stats.observations, w.observed.length);
  assert.equal(w.stats.confirmations, Object.values(w.dictionary).filter(item => item.confirmed).length);
  assert.equal(w.score, 10 * w.observed.length + 20 * w.stats.confirmations + 30 * w.solved.length);
  assert.ok(w.stats.wrongVerifications <= w.stats.validations);
  assert.ok(w.stats.wrongResponses <= w.stats.responses);
  assert.ok(w.log.length <= 24);
  assert.ok(w.unlockedScenes.includes(w.scene));
  if (w.currentEvidence) assert.ok(w.observed.includes(w.currentEvidence));
  for (const glyph of E.GLYPHS) {
    const entry = w.dictionary[glyph.id];
    if (entry.confirmed) {
      assert.equal(entry.guess, glyph.id);
      assert.ok(w.observed.filter(id => E.EVIDENCES.find(item => item.id === id).words.includes(glyph.id)).length >= 2);
    }
  }
  if (w.phase === 'complete') {
    assert.equal(w.paused, true);
    assert.equal(w.solved.length, 3);
    assert.equal(w.stats.confirmations, 6);
  }
}
function replay(w) {
  const raw = E.serialize(w), restored = E.deserialize(raw);
  assert.ok(restored, 'Accepted history failed to replay');
  assert.equal(restored.paused, true);
  assert.deepEqual(restored, { ...copy(w), paused: true });
  assert.equal(E.serialize(restored), raw);
  invariants(restored);
  return restored;
}
function manual(reverse = false) {
  const w = live();
  if (!reverse) {
    market(w); harbor(w); lighthouse(w);
    observe(w, E.SCENES[2].evidenceIds);
    accepted(w, { type: 'respond', answer: 'water' });
  } else {
    observe(w, ['m-water', 'm-gift', 'm-lamp', 'm-welcome']);
    accepted(w, { type: 'guess', glyph: 'give', meaning: 'sleep' });
    assert.equal(accepted(w, { type: 'validate', glyph: 'give' }).success, false);
    for (const glyph of ['lamp', 'give', 'person']) confirm(w, glyph);
    accepted(w, { type: 'respond', answer: 'stone' });
    accepted(w, { type: 'respond', answer: 'lantern' });
    accepted(w, { type: 'visit', scene: 'harbor' });
    observe(w, ['h-lock', 'h-open', 'h-sign', 'h-door', 'h-water']);
    for (const glyph of ['open', 'door', 'water']) confirm(w, glyph);
    accepted(w, { type: 'respond', answer: 'rope' });
    accepted(w, { type: 'respond', answer: 'wheel' });
    accepted(w, { type: 'visit', scene: 'lighthouse' });
    observe(w, ['l-return', 'l-cup', 'l-request']);
    accepted(w, { type: 'respond', answer: 'lantern' });
    accepted(w, { type: 'respond', answer: 'water' });
  }
  assert.equal(w.phase, 'exploring');
  assert.equal(w.paused, false);
  assert.equal(E.status(w).canFinish, true);
  accepted(w, { type: 'finish' });
  assert.equal(w.score, 330);
  return w;
}
function demo(w = E.fresh()) {
  const snapshots = [];
  for (let step = 0; step < 120 && w.phase !== 'complete'; step++) {
    const before = JSON.stringify(w), action = E.demoPlanner(w);
    assert.ok(action, 'Planner stalled on a reachable world');
    assert.deepEqual(action, E.demoPlanner(w));
    assert.equal(JSON.stringify(w), before, 'Planner must not mutate the world');
    accepted(w, action);
    replay(w);
    snapshots.push({ action: copy(action), phase: w.phase, scene: w.scene, score: w.score, success: w.lastResult.success });
  }
  assert.equal(w.phase, 'complete');
  assert.equal(w.observed.length, 12);
  assert.equal(w.score, 330);
  return { w, snapshots };
}

test('fresh world starts paused at only the unlocked market with empty dictionary and history', () => {
  const w = E.fresh();
  assert.equal(w.phase, 'exploring'); assert.equal(w.paused, true); assert.equal(w.scene, 'market');
  assert.deepEqual(w.unlockedScenes, ['market']); assert.deepEqual(w.observed, []); assert.deepEqual(w.solved, []);
  assert.equal(w.currentEvidence, null); assert.equal(w.score, 0); assert.deepEqual(w.ledger, []); assert.deepEqual(w.log, []); assert.equal(w.lastResult, null);
  for (const item of Object.values(w.dictionary)) assert.deepEqual(item, { guess: null, confirmed: false });
  replay(w);
});
test('public metadata contains six signs eight candidate meanings and no answer fields', () => {
  assert.deepEqual(E.GLYPHS.map(item => item.id), ['person', 'give', 'lamp', 'water', 'door', 'open']);
  assert.deepEqual(E.MEANINGS.map(item => item.label), ['人', '给', '灯', '水', '门', '开', '石', '睡']);
  assert.deepEqual(E.MEANINGS.slice(-2).map(item => item.id), ['stone', 'sleep']);
  for (const collection of [E.GLYPHS, E.MEANINGS, E.SCENES, E.EVIDENCES, E.QUESTS]) {
    assert.ok(Object.isFrozen(collection));
    assert.ok(!JSON.stringify(collection).includes('"answer"'));
    for (const item of collection) assert.ok(Object.isFrozen(item));
  }
  for (const glyph of E.status(E.fresh()).glyphs) { assert.equal(glyph.label, null); assert.equal(glyph.guess, null); assert.equal(glyph.candidates.length, 8); }
});
test('the twelve exact context signatures are unique and belong to four five and three scene observations', () => {
  const expected = {
    'm-welcome': ['person'], 'm-lamp': ['lamp'], 'm-gift': ['person', 'give', 'lamp'], 'm-water': ['person', 'give', 'water'],
    'h-water': ['water'], 'h-door': ['door'], 'h-sign': ['water', 'door'], 'h-open': ['open', 'door'], 'h-lock': ['open'],
    'l-request': ['person', 'give', 'water'], 'l-cup': ['water'], 'l-return': ['lamp', 'open']
  };
  assert.equal(E.EVIDENCES.length, 12); assert.equal(new Set(E.EVIDENCES.map(item => item.id)).size, 12);
  assert.deepEqual(E.SCENES.map(item => item.evidenceIds.length), [4, 5, 3]);
  for (const evidence of E.EVIDENCES) {
    assert.deepEqual(evidence.words, expected[evidence.id]);
    assert.ok(E.SCENES.find(scene => scene.id === evidence.scene).evidenceIds.includes(evidence.id));
    assert.ok(evidence.text.length > 25);
    assert.ok(!/表示|意为|意思是|读作|对应/.test(evidence.text), 'Observations cannot directly assign meanings');
  }
});
test('all gameplay actions are blocked atomically while paused', () => {
  const w = E.fresh();
  for (const action of [{ type: 'visit', scene: 'market' }, { type: 'observe', id: 'm-gift' }, { type: 'guess', glyph: 'person', meaning: 'person' }, { type: 'validate', glyph: 'person' }, { type: 'respond', answer: 'lantern' }, { type: 'finish' }]) denied(w, action);
});
test('malformed extra symbolic inherited and accessor fields are rejected atomically', () => {
  const w = live();
  const symbolExtra = { type: 'finish', [Symbol('extra')]: true };
  const hiddenExtra = { type: 'finish' }; Object.defineProperty(hiddenExtra, 'extra', { value: true });
  const getter = { get type() { throw new Error('must not read getter'); } };
  const bad = [null, 2, [], {}, { type: 'grant', score: 330 }, { type: 'observe', id: 'm-gift', extra: 1 }, { type: 'guess', glyph: 'person' }, { type: 'pause', paused: 0 }, { type: 'finish', payload: null }, symbolExtra, hiddenExtra, getter, Object.create({ type: 'finish' })];
  for (const action of bad) denied(w, action);
});
test('pause requires an explicit boolean records accepted actions and prevents subsequent gameplay', () => {
  const w = live(); denied(w, { type: 'pause', paused: 'false' });
  accepted(w, { type: 'pause', paused: true }); assert.equal(w.paused, true);
  denied(w, { type: 'observe', id: 'm-welcome' });
  accepted(w, { type: 'pause', paused: false }); assert.equal(w.ledger.length, 3); assert.equal(w.score, 0);
  replay(w);
});
test('harbor and lighthouse remain inaccessible until their preceding requests are solved', () => {
  const w = live(); denied(w, { type: 'visit', scene: 'harbor' }); denied(w, { type: 'visit', scene: 'lighthouse' });
  assert.deepEqual(w.unlockedScenes, ['market']);
  market(w); denied(w, { type: 'visit', scene: 'harbor' });
  accepted(w, { type: 'respond', answer: 'lantern' }); accepted(w, { type: 'visit', scene: 'harbor' }); denied(w, { type: 'visit', scene: 'lighthouse' });
});
test('a new observation requires its actual current scene and unknown IDs never grant evidence', () => {
  const w = live();
  for (const id of ['h-water', 'l-cup', 'unknown', '__proto__']) denied(w, { type: 'observe', id });
  assert.equal(w.observed.length, 0);
});
test('unknown glyphs unknown candidate meanings and null hypotheses are rejected', () => {
  const w = live();
  for (const [glyph, meaning] of [['ghost', 'person'], ['constructor', 'person'], ['person', 'unknown'], ['person', '__proto__'], ['person', null]]) denied(w, { type: 'guess', glyph, meaning });
});
test('a correct hypothesis alone neither awards points nor confirms a sign', () => {
  const w = live(); accepted(w, { type: 'guess', glyph: 'person', meaning: 'person' });
  assert.equal(w.dictionary.person.confirmed, false); assert.equal(w.score, 0); assert.equal(E.status(w).glyphs[0].label, null);
});
test('zero-context validation accepts a failed attempt without disclosing whether a guess is right', () => {
  const right = live(), wrong = live();
  accepted(right, { type: 'guess', glyph: 'person', meaning: 'person' }); accepted(wrong, { type: 'guess', glyph: 'person', meaning: 'sleep' });
  const a = accepted(right, { type: 'validate', glyph: 'person' }), b = accepted(wrong, { type: 'validate', glyph: 'person' });
  assert.equal(a.success, false); assert.equal(a.insufficientEvidence, true); assert.deepEqual(a, b);
  assert.equal(right.stats.validations, 1); assert.equal(wrong.stats.wrongVerifications, 0); assert.equal(right.score, 0);
});
test('repeating the same observation cannot manufacture a second distinct validation context', () => {
  const w = live(); observe(w, ['m-welcome', 'm-welcome', 'm-welcome']);
  accepted(w, { type: 'guess', glyph: 'person', meaning: 'person' });
  assert.equal(accepted(w, { type: 'validate', glyph: 'person' }).success, false);
  assert.equal(E.status(w).glyphs[0].evidenceCount, 1); assert.equal(w.score, 10); assert.equal(w.observed.length, 1);
});
test('unrelated observations cannot serve as proof for a sign they do not contain', () => {
  const w = live(); observe(w, ['m-welcome', 'm-lamp', 'm-gift']);
  accepted(w, { type: 'guess', glyph: 'give', meaning: 'give' });
  assert.equal(accepted(w, { type: 'validate', glyph: 'give' }).success, false);
  assert.equal(E.status(w).glyphs.find(item => item.id === 'give').evidenceCount, 1);
});
test('even two correct contexts require explicit validation and never automatically confirm', () => {
  const w = live(); observe(w, ['m-welcome', 'm-gift']); accepted(w, { type: 'guess', glyph: 'person', meaning: 'person' });
  assert.equal(w.dictionary.person.confirmed, false); assert.equal(w.score, 20);
  confirm(w, 'person'); assert.equal(w.dictionary.person.confirmed, true); assert.equal(w.score, 40);
});
test('all six signs are confirmed only after at least two actual distinct containing contexts', () => {
  const w = harbor();
  const expected = { person: ['m-welcome', 'm-gift', 'm-water'], give: ['m-gift', 'm-water'], lamp: ['m-lamp', 'm-gift'], water: ['m-water', 'h-water', 'h-sign'], door: ['h-door', 'h-sign', 'h-open'], open: ['h-open', 'h-lock'] };
  for (const item of E.status(w).glyphs) { assert.equal(item.confirmed, true); assert.deepEqual(item.evidenceIds, expected[item.id]); assert.ok(item.evidenceCount >= 2); }
  assert.equal(w.stats.confirmations, 6);
});
test('a decoy hypothesis with sufficient evidence produces an honest failure and remains editable', () => {
  const w = live(); observe(w, ['m-gift', 'm-water']); accepted(w, { type: 'guess', glyph: 'give', meaning: 'sleep' });
  const failure = accepted(w, { type: 'validate', glyph: 'give' });
  assert.equal(failure.success, false); assert.equal(w.stats.wrongVerifications, 1); assert.equal(w.stats.validations, 1); assert.equal(w.score, 20);
  assert.equal(w.dictionary.give.guess, 'sleep'); assert.equal(w.dictionary.give.confirmed, false); assert.ok(!failure.reason.includes('给'));
  confirm(w, 'give'); assert.equal(w.stats.wrongVerifications, 1); assert.equal(w.score, 40);
});
test('a wrong nondecoy candidate also fails rather than confusing two real signs', () => {
  const w = live(); observe(w, ['m-lamp', 'm-gift']); accepted(w, { type: 'guess', glyph: 'lamp', meaning: 'person' });
  assert.equal(accepted(w, { type: 'validate', glyph: 'lamp' }).success, false); assert.equal(w.stats.wrongVerifications, 1); assert.equal(w.dictionary.person.confirmed, false);
  confirm(w, 'lamp'); assert.equal(E.status(w).glyphs.find(item => item.id === 'lamp').label, '灯');
});
test('validation without a hypothesis is rejected without a failure counter or history entry', () => {
  const w = live(); observe(w, ['m-welcome', 'm-gift']); denied(w, { type: 'validate', glyph: 'person' });
  assert.equal(w.stats.validations, 0); assert.equal(w.stats.wrongVerifications, 0);
});
test('revisiting observations selects current evidence without new evidence or points', () => {
  const w = live(); observe(w, ['m-welcome', 'm-gift']); const count = w.stats.observations, score = w.score;
  const result = accepted(w, { type: 'observe', id: 'm-welcome' });
  assert.equal(result.unchanged, true); assert.equal(w.currentEvidence, 'm-welcome'); assert.equal(w.stats.observations, count); assert.equal(w.score, score);
});
test('a previously observed context can be reread across scenes without moving the response scene', () => {
  const w = harbor(); const score = w.score;
  accepted(w, { type: 'observe', id: 'm-gift' });
  assert.equal(w.scene, 'harbor'); assert.equal(w.currentEvidence, 'm-gift'); assert.equal(w.score, score);
  assert.equal(E.status(w).quest.scene, 'harbor');
});
test('visiting an unlocked scene clears selected evidence while retaining the notebook', () => {
  const w = harbor(); assert.ok(w.currentEvidence); const observed = [...w.observed];
  accepted(w, { type: 'visit', scene: 'market' }); assert.equal(w.currentEvidence, null); assert.deepEqual(w.observed, observed);
});
test('a confirmed sign cannot be changed to a false meaning but identical reselection is safe', () => {
  const w = market(); denied(w, { type: 'guess', glyph: 'person', meaning: 'stone' });
  const score = w.score; assert.equal(accepted(w, { type: 'guess', glyph: 'person', meaning: 'person' }).unchanged, true); assert.equal(w.score, score);
});
test('revalidating a known sign cannot repeat its twenty-point reward or confirmation counter', () => {
  const w = market(); const score = w.score, count = w.stats.confirmations, validations = w.stats.validations;
  assert.equal(accepted(w, { type: 'validate', glyph: 'give' }).unchanged, true);
  assert.equal(w.score, score); assert.equal(w.stats.confirmations, count); assert.equal(w.stats.validations, validations);
});
test('market response is unavailable until all three request signs are confirmed from evidence', () => {
  const w = live(); denied(w, { type: 'respond', answer: 'lantern' });
  observe(w, E.SCENES[0].evidenceIds); confirm(w, 'person'); confirm(w, 'give');
  assert.equal(E.status(w).quest.canRespond, false); denied(w, { type: 'respond', answer: 'lantern' });
  confirm(w, 'lamp'); assert.equal(E.status(w).quest.canRespond, true);
});
test('missing gift observation blocks the giving proof and therefore the market request', () => {
  const w = live(); observe(w, ['m-welcome', 'm-lamp', 'm-water']);
  accepted(w, { type: 'guess', glyph: 'give', meaning: 'give' }); assert.equal(accepted(w, { type: 'validate', glyph: 'give' }).success, false);
  denied(w, { type: 'respond', answer: 'lantern' }); assert.equal(w.solved.length, 0);
});
test('the right market response unlocks harbor once and leaves explicit travel to the player', () => {
  const w = market(); const score = w.score;
  accepted(w, { type: 'respond', answer: 'lantern' });
  assert.deepEqual(w.solved, ['market']); assert.deepEqual(w.unlockedScenes, ['market', 'harbor']); assert.equal(w.scene, 'market'); assert.equal(w.score, score + 30);
  denied(w, { type: 'respond', answer: 'lantern' }); denied(w, { type: 'visit', scene: 'lighthouse' });
});
test('valid wrong choices in all three scenes preserve progress with honest response failures', () => {
  const w = market();
  for (const [scene, answer] of [['market', 'water'], ['harbor', 'rope'], ['lighthouse', 'stone']]) {
    if (scene === 'harbor') harbor(w);
    if (scene === 'lighthouse') { lighthouse(w); observe(w, ['l-request']); }
    const before = { scene: w.scene, score: w.score, solved: [...w.solved], unlocked: [...w.unlockedScenes], dictionary: copy(w.dictionary) };
    const result = accepted(w, { type: 'respond', answer }); assert.equal(result.success, false);
    assert.equal(w.scene, before.scene); assert.equal(w.score, before.score); assert.deepEqual(w.solved, before.solved); assert.deepEqual(w.unlockedScenes, before.unlocked); assert.deepEqual(w.dictionary, before.dictionary);
    assert.ok(!/纸灯|闸轮|水杯/.test(result.reason));
  }
  assert.equal(w.stats.wrongResponses, 3); assert.equal(w.stats.responses, 5);
});
test('response candidates are scoped to the current scene and invented answers are atomic rejects', () => {
  const w = market(); for (const answer of ['wheel', 'rope', 'unknown', '__proto__', null]) denied(w, { type: 'respond', answer });
  assert.equal(w.stats.responses, 0); assert.equal(w.stats.wrongResponses, 0);
});
test('harbor requires the observed two-sign route plaque even when all six signs are known', () => {
  const w = harbor(undefined, true); assert.equal(w.stats.confirmations, 6); assert.equal(E.status(w).quest.canRespond, false);
  denied(w, { type: 'respond', answer: 'wheel' }); observe(w, ['h-sign']); assert.equal(E.status(w).quest.canRespond, true); accepted(w, { type: 'respond', answer: 'wheel' });
});
test('one latch context cannot confirm open or advance harbor without the gate demonstration', () => {
  const w = market(); accepted(w, { type: 'respond', answer: 'lantern' }); accepted(w, { type: 'visit', scene: 'harbor' });
  observe(w, ['h-water', 'h-door', 'h-sign', 'h-lock']); confirm(w, 'water'); confirm(w, 'door'); accepted(w, { type: 'guess', glyph: 'open', meaning: 'open' });
  assert.equal(accepted(w, { type: 'validate', glyph: 'open' }).success, false); denied(w, { type: 'respond', answer: 'wheel' });
  observe(w, ['h-open']); confirm(w, 'open'); accepted(w, { type: 'respond', answer: 'wheel' });
});
test('the right harbor response unlocks lighthouse without teleporting or finishing', () => {
  const w = harbor(); accepted(w, { type: 'respond', answer: 'wheel' });
  assert.deepEqual(w.unlockedScenes, ['market', 'harbor', 'lighthouse']); assert.equal(w.scene, 'harbor'); assert.equal(w.phase, 'exploring'); assert.equal(w.paused, false);
});
test('lighthouse arrival has all six proved signs but still requires its actual keeper observation', () => {
  const w = lighthouse(); assert.equal(w.stats.confirmations, 6);
  for (const item of E.status(w).glyphs) { assert.equal(item.confirmed, true); assert.ok(item.evidenceCount >= 2); }
  denied(w, { type: 'respond', answer: 'water' }); assert.equal(E.status(w).quest.canRespond, false);
  observe(w, ['l-cup', 'l-return']); denied(w, { type: 'respond', answer: 'water' }); observe(w, ['l-request']); assert.equal(E.status(w).quest.canRespond, true);
});
test('all solved requests leave the world exploring until an explicit finish action', () => {
  const w = lighthouse(); observe(w, E.SCENES[2].evidenceIds); accepted(w, { type: 'respond', answer: 'water' });
  assert.equal(w.phase, 'exploring'); assert.equal(w.paused, false); assert.equal(E.status(w).canFinish, true); assert.equal(w.solved.length, 3);
  accepted(w, { type: 'visit', scene: 'market' }); assert.equal(w.phase, 'exploring'); accepted(w, { type: 'finish' }); assert.equal(w.phase, 'complete');
});
test('finish cannot skip observations vocabulary proof or any of the three requests', () => {
  const w = live(); denied(w, { type: 'finish' }); market(w); denied(w, { type: 'finish' }); harbor(w); denied(w, { type: 'finish' }); lighthouse(w); denied(w, { type: 'finish' });
});
test('ordinary full manual solution records twelve observations six confirmations three responses and 330 points', () => {
  const w = manual(); replay(w);
  assert.equal(w.stats.observations, 12); assert.equal(w.stats.confirmations, 6); assert.equal(w.stats.validations, 6); assert.equal(w.stats.wrongVerifications, 0); assert.equal(w.stats.responses, 3); assert.equal(w.stats.wrongResponses, 0);
  playthroughs.push({ mode: 'manual forward observation and confirmation order', score: w.score, stats: copy(w.stats), actions: copy(w.ledger) });
});
test('a second manual order repairs a wrong word and three wrong replies through the same API for 330 points', () => {
  const w = manual(true); replay(w);
  assert.equal(w.stats.wrongVerifications, 1); assert.equal(w.stats.wrongResponses, 3); assert.equal(w.stats.responses, 6); assert.equal(w.stats.validations, 7);
  const first = playthroughs[0].actions; assert.notDeepEqual(w.ledger, first); assert.equal(w.observed[0], 'm-water');
  playthroughs.push({ mode: 'manual reverse contexts with repaired hypothesis and wrong replies', score: w.score, stats: copy(w.stats), actions: copy(w.ledger) });
});
test('terminal completion pauses the world and rejects every action without state leakage', () => {
  const w = manual();
  for (const action of [{ type: 'pause', paused: false }, { type: 'pause', paused: true }, { type: 'visit', scene: 'harbor' }, { type: 'observe', id: 'm-gift' }, { type: 'guess', glyph: 'person', meaning: 'person' }, { type: 'validate', glyph: 'person' }, { type: 'respond', answer: 'lantern' }, { type: 'finish' }]) denied(w, action);
  assert.equal(E.demoPlanner(w), null); assert.equal(E.status(w).canFinish, false); assert.equal(E.status(w).quest.canRespond, false); replay(w);
});
test('ordinary demonstration uses fresh legal actions and replays every intermediate state to 330 points', () => {
  const { w, snapshots } = demo(); assert.equal(w.stats.wrongResponses, 0); assert.equal(w.stats.wrongVerifications, 0);
  assert.equal(w.ledger.filter(action => action.type === 'observe').length, 12); assert.equal(w.ledger.filter(action => action.type === 'validate').length, 6); assert.equal(w.ledger.filter(action => action.type === 'respond').length, 3);
  assert.equal(w.ledger.at(-1).type, 'finish');
  playthroughs.push({ mode: 'ordinary planner actions with every intermediate legal-history replay', score: w.score, stats: copy(w.stats), actions: copy(w.ledger), snapshots });
});
test('the planner repairs a partial human guess failed validation paused save and nondefault scene', () => {
  const w = harbor(); accepted(w, { type: 'visit', scene: 'market' }); accepted(w, { type: 'observe', id: 'm-water' });
  // This second reachable partial run includes an editable false hypothesis before confirmation.
  const partial = live(); observe(partial, ['m-gift', 'm-water']); accepted(partial, { type: 'guess', glyph: 'give', meaning: 'stone' }); accepted(partial, { type: 'validate', glyph: 'give' });
  const restored = replay(partial); const { w: solved } = demo(restored); assert.equal(solved.stats.wrongVerifications, 1);
  assert.equal(demo(w).w.phase, 'complete');
});
test('planner proposals are deterministic pure and legal while fresh paused and midstory', () => {
  for (const w of [E.fresh(), market(), harbor(), lighthouse()]) {
    const before = JSON.stringify(w), plan = E.demoPlanner(w); assert.ok(plan); assert.deepEqual(plan, E.demoPlanner(w)); assert.equal(JSON.stringify(w), before); accepted(w, plan);
  }
});
test('accepted wrong validations wrong replies revisits and pause actions all survive exact replay', () => {
  const w = live(); observe(w, ['m-gift', 'm-water']); accepted(w, { type: 'guess', glyph: 'give', meaning: 'stone' }); accepted(w, { type: 'validate', glyph: 'give' }); replay(w);
  market(w); accepted(w, { type: 'respond', answer: 'stone' }); accepted(w, { type: 'observe', id: 'm-gift' }); accepted(w, { type: 'pause', paused: true });
  const restored = replay(w); assert.equal(restored.stats.wrongVerifications, 1); assert.equal(restored.stats.wrongResponses, 1); assert.equal(restored.currentEvidence, 'm-gift');
  assert.deepEqual(restored.ledger, w.ledger);
});
test('restoring an active world is always paused and ordinary continuation remains possible', () => {
  const w = market(), restored = replay(w); assert.equal(restored.paused, true); denied(restored, { type: 'respond', answer: 'lantern' });
  accepted(restored, { type: 'pause', paused: false }); accepted(restored, { type: 'respond', answer: 'lantern' }); assert.deepEqual(restored.solved, ['market']); replay(restored);
});
test('save format stores only engine version and accepted actions without world or objective grants', () => {
  const w = market(), saved = JSON.parse(E.serialize(w)); assert.deepEqual(Object.keys(saved).sort(), ['actions', 'version']); assert.equal(saved.version, E.VERSION); assert.deepEqual(saved.actions, w.ledger);
  for (const key of ['phase', 'score', 'dictionary', 'observed', 'solved', 'objective', 'world']) assert.equal(E.deserialize(JSON.stringify({ ...saved, [key]: {} })), null);
});
test('replay rejects malformed top-level saves version changes missing fields and nonarray action lists', () => {
  for (const raw of [null, 3, '', '{', 'null', '[]', '{}', JSON.stringify({ version: E.VERSION }), JSON.stringify({ actions: [] }), JSON.stringify({ version: E.VERSION + 1, actions: [] }), JSON.stringify({ version: E.VERSION, actions: {} }), JSON.stringify({ version: String(E.VERSION), actions: [] })]) assert.equal(E.deserialize(raw), null);
});
test('replay rejects invented unknown extra malformed and illegally gated actions', () => {
  const raw = actions => JSON.stringify({ version: E.VERSION, actions });
  for (const action of [{ type: 'finish' }, { type: 'observe', id: 'm-gift' }, { type: 'pause', paused: 'false' }, { type: 'pause', paused: false, extra: 1 }, { type: 'grant', score: 330 }]) assert.equal(E.deserialize(raw([action])), null);
  for (const action of [{ type: 'visit', scene: 'lighthouse' }, { type: 'guess', glyph: 'person', meaning: 'secret' }, { type: 'respond', answer: 'lantern' }, { type: 'observe', id: 'h-door' }]) assert.equal(E.deserialize(raw([{ type: 'pause', paused: false }, action])), null);
});
test('replay preserves pause barriers and rejects appended actions after terminal finish', () => {
  const base = [{ type: 'pause', paused: false }, { type: 'pause', paused: true }, { type: 'observe', id: 'm-welcome' }];
  assert.equal(E.deserialize(JSON.stringify({ version: E.VERSION, actions: base })), null);
  const saved = JSON.parse(E.serialize(manual())); saved.actions.push({ type: 'pause', paused: false }); assert.equal(E.deserialize(JSON.stringify(saved)), null);
});
test('malformed UTF16 surrogate inputs and oversized UTF8 saves are rejected', () => {
  const valid = E.serialize(E.fresh());
  assert.equal(E.deserialize(valid + '\ud800'), null); assert.equal(E.deserialize(valid + '\udc00'), null);
  assert.equal(E.deserialize(JSON.stringify({ version: E.VERSION, actions: [{ type: 'pause', paused: false, value: '\ud800' }] })), null);
  assert.equal(E.deserialize('x'.repeat(E.MAX_SAVE_BYTES + 1)), null);
  const multibyte = JSON.stringify({ version: E.VERSION, actions: [], padding: '字'.repeat(Math.ceil(E.MAX_SAVE_BYTES / 3)) });
  assert.ok(multibyte.length < E.MAX_SAVE_BYTES); assert.ok(new TextEncoder().encode(multibyte).byteLength > E.MAX_SAVE_BYTES); assert.equal(E.deserialize(multibyte), null);
});
test('accepted action history is capped and the longest legal history still fits its save budget', () => {
  const w = live();
  while (w.actions < E.MAX_ACTIONS) accepted(w, { type: 'visit', scene: 'market' });
  assert.equal(w.actions, E.MAX_ACTIONS); assert.equal(w.log.length, 24); assert.equal(E.demoPlanner(w), null);
  denied(w, { type: 'pause', paused: true }); denied(w, { type: 'observe', id: 'm-welcome' });
  const saved = E.serialize(w); assert.ok(new TextEncoder().encode(saved).byteLength < E.MAX_SAVE_BYTES); replay(w);
  const forged = JSON.parse(saved); forged.actions.push({ type: 'visit', scene: 'market' }); assert.equal(E.deserialize(JSON.stringify(forged)), null);
});
test('fresh worlds and copied status views are isolated from each other and engine state', () => {
  const a = live(), b = E.fresh(); observe(a, ['m-gift']); assert.deepEqual(b.observed, []);
  const view = E.status(a), before = JSON.stringify(a); view.observed[0].words.push('ghost'); view.glyphs[0].candidates[0].label = '伪'; view.glyphs[0].evidenceIds.push('ghost'); view.quest.options[0].label = '伪'; view.log.push({ text: '伪' }); view.unlockedScenes.push('ghost');
  assert.equal(JSON.stringify(a), before); assert.equal(E.status(a).observed[0].words.includes('ghost'), false);
});
test('mutating an action object after acceptance cannot alter its recorded replay', () => {
  const w = live(), action = { type: 'guess', glyph: 'person', meaning: 'stone' };
  accepted(w, action); action.meaning = 'person'; action.extra = true;
  assert.deepEqual(w.ledger.at(-1), { type: 'guess', glyph: 'person', meaning: 'stone' }); assert.equal(w.dictionary.person.guess, 'stone'); replay(w);
});
test('forged copied or externally mutated worlds cannot validate grant state or serialize injection', () => {
  const copied = copy(E.fresh()); denied(copied, { type: 'pause', paused: false }); assert.equal(E.status(copied), null); assert.equal(E.serialize(copied), null);
  const mutated = live(); mutated.observed.push('m-welcome', 'm-gift'); mutated.dictionary.person.guess = 'person'; denied(mutated, { type: 'validate', glyph: 'person' }); assert.equal(E.serialize(mutated), null);
  const forged = E.fresh(); forged.phase = 'complete'; forged.score = 330; assert.equal(E.status(forged), null); assert.equal(E.demoPlanner(forged), null);
});
test('custom serialization getters and hidden fields cannot conceal fabricated engine state', () => {
  const w = live(), original = copy(w);
  w.observed.push('m-welcome', 'm-gift'); w.dictionary.person.guess = 'person'; w.toJSON = () => original;
  assert.equal(E.act(w, { type: 'validate', glyph: 'person' }), false); assert.equal(E.serialize(w), null);
  const getter = live(); Object.defineProperty(getter.dictionary.person, 'guess', { get() { throw new Error('must not run'); }, enumerable: true });
  assert.equal(E.act(getter, { type: 'pause', paused: true }), false); assert.equal(E.status(getter), null);
  const hidden = live(); Object.defineProperty(hidden, 'secret', { value: true }); assert.equal(E.serialize(hidden), null);
});
test('status score counts current evidence summary and feedback reflect actual accepted actions', () => {
  const w = live(); observe(w, ['m-gift', 'm-water']); confirm(w, 'give');
  const s = E.status(w); assert.equal(s.score, 40); assert.equal(s.counts.observed, 2); assert.equal(s.counts.confirmed, 1); assert.equal(s.counts.actions, w.ledger.length); assert.equal(s.currentEvidence.id, 'm-water'); assert.equal(s.currentEvidence.text, E.EVIDENCES.find(item => item.id === 'm-water').text); assert.equal(s.summary, '观察 2/12 · 译出 1/6 · 回应 0/3'); assert.equal(s.lastResult.reason, w.message); assert.deepEqual(s.stats, w.stats);
});
test('a completed replay restores all original evidence order six meanings and narrative without auto resume', () => {
  const w = manual(true), restored = replay(w); assert.equal(restored.phase, 'complete'); assert.equal(restored.paused, true); assert.equal(E.demoPlanner(restored), null);
  assert.deepEqual(restored.observed, w.observed); assert.deepEqual(E.status(restored).glyphs.map(item => item.label), ['人', '给', '灯', '水', '门', '开']); assert.equal(restored.message, w.message);
});

const report = {
  date: '2026-10-06', direction: '灯市译语 / LANTERN LEXICON', passed: failures.length === 0, count: checks.length, checks, failures, playthroughs,
  method: 'DOM-independent production-engine assertions. Two manual action orders and the ordinary demo discover twelve actual contexts, explicitly guess and cross-validate six signs, respond to three scene-bound requests, then explicitly finish. No prebuilt solved state or synthetic evidence grants are used. Every demo intermediate is restored from strict accepted-action replay, including failed attempts in separate replay tests. Restore always pauses; save validation is deterministic legal-history replay, not player authentication.',
  command: 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe tooling/check-direction-language-rules.mjs'
};
fs.writeFileSync(path.join(project, 'notes/direction-language-rules-20261006.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${checks.length} language rule checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
