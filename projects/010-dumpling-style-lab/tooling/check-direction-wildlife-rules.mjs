import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-wildlife-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
const copy = value => structuredClone(value);
const fresh = (seed = E.DEFAULT_SEED) => { const w = E.createWorld(seed); assert.ok(E.act(w, 'pause', false).ok); return w; };
function apply(w, type, payload) { const result = E.act(w, type, payload); assert.ok(result.ok, `${type}: ${result.reason}`); return result; }
function wait(w, seconds) { let ticks = Math.round(seconds * 1000000); while (ticks > 0 && !w.paused) { const next = Math.min(250000, ticks); assert.ok(E.stepWorld(w, next / 1000000)); ticks -= next; } }
function aim(w, id, zoom) {
  apply(w, 'select', id);
  while (Math.abs(w.camera.zoom - zoom) > .000001) apply(w, 'zoom', Math.max(-.4, Math.min(.4, Number((zoom - w.camera.zoom).toFixed(9)))));
  const bounds = E.cameraBounds(zoom), target = Math.max(bounds.min, Math.min(bounds.max, w.subjects.find(item => item.id === id).x));
  while (Math.abs(w.camera.x - target) > .000001) apply(w, 'pan', Math.max(-.2, Math.min(.2, Number((target - w.camera.x).toFixed(9)))));
}
function bad(w, change) { const forged = copy(w); change(forged); assert.equal(E.restore(JSON.stringify(forged)), null); }
function invariants(w) {
  const bounds = E.cameraBounds(w.camera.zoom); assert.ok(w.camera.x >= bounds.min - 1e-9 && w.camera.x <= bounds.max + 1e-9); assert.equal(w.camera.y, .5); assert.ok(w.camera.zoom >= 1 && w.camera.zoom <= 2.8); assert.ok(w.time >= 0 && w.time <= 120); assert.equal(w.time, w.tick / 1000000); assert.ok(w.photos.length <= 12); assert.equal(new Set(w.photos.map(item => item.id)).size, w.photos.length);
  assert.deepEqual(w.subjects, E.subjectsAt(w.seed, w.time));
  for (const model of E.SPECIES) if (w.bestPhotoIds[model.id]) { const best = w.photos.find(photo => photo.id === w.bestPhotoIds[model.id]); assert.ok(best && best.qualified && best.speciesId === model.id); assert.equal(best.score, w.best[model.id]); }
}
function demo(seed = E.DEFAULT_SEED, dt = .1, actionEvery = .35) {
  const w = fresh(seed); let next = 0, frames = 0;
  while (!w.paused && frames++ < Math.ceil(120 / dt) + 3) {
    if (w.time + 1e-9 >= next) { const before = E.serialize(w), plan = E.demoPlanner(w); assert.deepEqual(plan, E.demoPlanner(w)); assert.equal(E.serialize(w), before); next = w.time + actionEvery; if (plan) apply(w, plan.action, plan.payload); }
    E.stepWorld(w, dt); invariants(w);
  }
  assert.equal(w.phase, 'complete'); assert.equal(w.paused, true); assert.ok(w.photos.every(photo => photo.qualified)); assert.equal(w.photos.length, 3); assert.ok(E.restore(E.serialize(w)));
  playthroughs.push({ mode: 'ordinary same-API timed demo', seed, frameDt: dt, actionEvery, observationSeconds: w.time, actionCount: w.ledger.length, shots: w.photos.map(photo => ({ id: photo.id, speciesId: photo.speciesId, time: photo.time, camera: photo.camera, score: photo.score, qualified: photo.qualified, components: photo.components })) }); return w;
}
const finished = demo(), stable = fresh(); aim(stable, 'heron', 1.65); wait(stable, .6); const actual = apply(stable, 'shutter', 'heron').photo;

test('fresh observation is independent paused and empty with a finite 120 second clock', () => {
  const a = E.createWorld(), b = E.createWorld(); assert.equal(a.paused, true); assert.equal(a.phase, 'observing'); assert.deepEqual(a.camera, { x: .5, y: .5, zoom: 1 }); assert.equal(a.photos.length, 0); assert.equal(a.nextPhoto, 1); assert.equal(a.stableFor, 0); assert.equal(a.time, 0); assert.equal(a.limit, 120); assert.deepEqual(a.best, { heron: 0, kingfisher: 0, deer: 0 }); a.camera.x = .9; assert.equal(b.camera.x, .5); assert.ok(E.restore(E.serialize(b)));
});
test('three visible subjects use the actual cropped natural aspects in a 16 by 9 frame', () => {
  assert.deepEqual(E.SPECIES.map(item => [item.id, item.name]), [['heron', '苍鹭'], ['kingfisher', '翠鸟'], ['deer', '林鹿']]); assert.deepEqual(E.SPECIES.map(item => item.aspect), [.77397, .90269, .80282]); assert.equal(E.SPECIES[1].flyingAspect, 1.06765);
  for (const subject of E.createWorld().subjects) { const p = E.projectSubject({ x: .5, y: .5, zoom: 1 }, subject); assert.ok(p.inFrame); assert.ok(Math.abs(p.width * 1600 / (p.height * 900) - subject.aspect) < 1e-10); }
});
test('deterministic seeded motion changes with actual time and respects wetland placements', () => {
  assert.deepEqual(E.subjectsAt(12345, 4), E.subjectsAt(12345, 4)); assert.notDeepEqual(E.subjectsAt(12345, 4), E.subjectsAt(98765, 4)); assert.notDeepEqual(E.subjectsAt(12345, 4), E.subjectsAt(12345, 5));
  for (let t = 0; t <= 120; t += .25) for (const s of E.subjectsAt(12345, t)) { assert.ok(s.x - s.width / 2 >= 0 && s.x + s.width / 2 <= 1); assert.ok(s.y - s.height / 2 >= 0 && s.y + s.height / 2 <= 1); if (s.id === 'deer') { assert.ok(s.x >= .88 && s.x <= .916); assert.ok(s.y + s.height / 2 > .56 && s.y + s.height / 2 < .57); } }
});
test('kingfisher really moves on finite flights and returns to its branch without a position jump', () => {
  const positions = Array.from({ length: 561 }, (_, i) => E.subjectsAt(12, i / 20)[1]); const perched = positions.filter(s => s.state === 'perched'), flying = positions.filter(s => s.state === 'flying'); assert.ok(perched.length && flying.length); assert.equal(new Set(perched.map(s => s.x)).size, 1); assert.ok(new Set(flying.map(s => s.x)).size > 10); assert.ok(flying.every(s => s.aspect === 1.06765)); assert.ok(perched.every(s => s.aspect === .90269)); for (let i = 1; i < positions.length; i++) assert.ok(Math.abs(positions[i].x - positions[i - 1].x) < .01);
});
test('shared projection translates and scales both sprite bounds and judged photo coordinates', () => {
  const subject = E.subjectsAt(1, 0)[0], p = E.projectSubject({ x: .4, y: .5, zoom: 2 }, subject); assert.equal(p.x, (subject.x - .4) * 2 + .5); assert.equal(p.y, (subject.y - .5) * 2 + .5); assert.equal(p.height, subject.height * 2); assert.equal(p.left, p.x - p.width / 2); assert.deepEqual(E.projectAnimal({ x: .4, y: .5, zoom: 2 }, subject), p);
});
test('paused time camera animals stability photos and ledger stay frozen under physical input', () => {
  const w = E.createWorld(), before = E.serialize(w); for (const dt of [.016, .1, .25]) assert.equal(E.stepWorld(w, dt), false); for (const [type, payload] of [['pan', .1], ['zoom', .2], ['shutter', 'heron']]) assert.equal(E.act(w, type, payload).ok, false); assert.equal(E.serialize(w), before); assert.equal(E.demoPlanner(w), null);
});
test('bounded zoom and pan keep the authored landscape filling the actual view', () => {
  const w = fresh(); const before = E.serialize(w); assert.equal(E.act(w, 'pan', -.1).ok, false); assert.equal(E.serialize(w), before); aim(w, 'deer', 2.8); for (let i = 0; i < 8; i++) E.act(w, 'pan', .2); assert.ok(Math.abs(w.camera.x - E.cameraBounds(2.8).max) < 1e-9); for (let i = 0; i < 8; i++) E.act(w, 'zoom', -.4); assert.deepEqual(w.camera, { x: .5, y: .5, zoom: 1 }); invariants(w);
});
test('invalid camera shutter target and pause payloads fail atomically', () => {
  const w = fresh(), before = E.serialize(w); for (const [type, payload] of [['pan', NaN], ['pan', Infinity], ['pan', .21], ['pan', '0.1'], ['pan', 0], ['zoom', .41], ['zoom', null], ['zoom', []], ['pause', 'false'], ['select', '__proto__'], ['shutter', 'fox'], ['grant', 'heron']]) assert.equal(E.act(w, type, payload).ok, false); assert.equal(E.serialize(w), before);
});
test('invalid and oversized time steps do not simulate hidden elapsed time', () => {
  const w = fresh(), before = E.serialize(w); for (const dt of [0, -.1, .251, 10, Infinity, NaN, null, '.1', .0000001]) assert.equal(E.stepWorld(w, dt), false); assert.equal(E.serialize(w), before); assert.equal(E.stepWorld(w, .016667), true); assert.equal(w.tick, 16667); assert.equal(w.time, .016667);
});
test('camera movement restarts the actual 0.6 second stability window', () => {
  const w = fresh(); aim(w, 'heron', 1.65); wait(w, .599999); assert.equal(E.scoreSubject(w).qualified, false); assert.ok(E.scoreSubject(w).reasons.some(reason => reason.includes('稳定'))); wait(w, .000001); assert.equal(E.scoreSubject(w).qualified, true); apply(w, 'pan', .01); assert.equal(w.stableFor, 0); wait(w, .6); assert.equal(E.scoreSubject(w).qualified, true); apply(w, 'zoom', .01); assert.equal(w.stableFor, 0);
});
test('clamped no-op camera input does not destroy already earned stability', () => {
  const w = fresh(); wait(w, 1); const before = E.serialize(w); assert.equal(E.act(w, 'pan', .1).ok, false); assert.equal(E.act(w, 'zoom', -.1).ok, false); assert.equal(E.serialize(w), before); assert.equal(w.stableFor, 1);
});
test('selecting a subject is an observation choice and never automatically aims the camera', () => {
  const w = fresh(), camera = copy(w.camera); wait(w, .7); apply(w, 'select', 'deer'); assert.deepEqual(w.camera, camera); assert.equal(w.stableFor, .7); assert.equal(w.photos.length, 0); assert.equal(E.scoreSubject(w).speciesId, 'deer');
});
test('small bird at wide focal length fails with an explicit occupancy explanation', () => {
  const w = fresh(); wait(w, .6); const photo = apply(w, 'shutter', 'kingfisher').photo; assert.equal(photo.qualified, false); assert.ok(photo.reasons.some(reason => reason.includes('太小'))); assert.equal(w.best.kingfisher, 0); assert.equal(w.stats.failed, 1); assert.equal(w.photos.length, 1);
});
test('an immediate shutter records an actual failed frame rather than delaying or granting a photo', () => {
  const w = fresh(); aim(w, 'heron', 1.65); const photo = apply(w, 'shutter').photo; assert.equal(photo.time, 0); assert.equal(photo.stableFor, 0); assert.equal(photo.qualified, false); assert.equal(photo.components.stability, 0); assert.ok(photo.reasons.some(reason => reason.includes('稳定'))); assert.equal(w.best.heron, 0);
});
test('a cropped animal is judged on its full sprite rectangle and cannot qualify', () => {
  const w = fresh(); aim(w, 'heron', 2.8); wait(w, .6); const photo = apply(w, 'shutter').photo; assert.ok(photo.projection.bottom > 1); assert.equal(photo.projection.inFrame, false); assert.equal(photo.components.framing, 0); assert.equal(photo.qualified, false); assert.ok(photo.reasons.some(reason => reason.includes('完整入框')));
});
test('small and oversized subjects are gated even when other quality components are high', () => {
  const camera = { x: .5, y: .5, zoom: 2.8 }, subject = { x: .5, y: .5, height: .25, aspect: .8 }; assert.ok(E.projectSubject(camera, subject).height > E.PHOTO_RULES.maxScreenHeight); const w = fresh(); wait(w, .6); const quality = E.scoreSubject(w, 'kingfisher'); assert.ok(quality.score > 70); assert.equal(quality.qualified, false); assert.ok(quality.projection.height < E.PHOTO_RULES.minScreenHeight);
});
test('composition credit responds to actual horizontal camera alignment', () => {
  const w = fresh(); aim(w, 'heron', 1.65); wait(w, .6); const aligned = E.scoreSubject(w).components.centering; apply(w, 'pan', .2); wait(w, .6); assert.ok(E.scoreSubject(w).components.centering < aligned); assert.ok(E.scoreSubject(w).projection.x < .5);
});
test('a qualified photograph records its exact shutter time camera animal and shared bounds', () => {
  assert.equal(actual.id, 'p1'); assert.equal(actual.time, .6); assert.deepEqual(actual.camera, stable.camera); assert.deepEqual(actual.subject, E.subjectsAt(stable.seed, .6)[0]); assert.deepEqual(actual.projection, E.projectSubject(actual.camera, actual.subject)); assert.equal(actual.score, Math.round(Object.values(actual.components).reduce((a, b) => a + b, 0))); assert.equal(actual.qualified, true); assert.deepEqual(actual.reasons, []); assert.equal(stable.bestPhotoIds.heron, 'p1');
});
test('returned photo metadata is detached from authoritative history and live animal state', () => {
  const w = fresh(); aim(w, 'heron', 1.65); wait(w, .6); const result = apply(w, 'shutter'); result.photo.camera.x = .99; result.photo.subject.x = .99; result.photo.score = 999; assert.notEqual(w.photos[0].camera.x, .99); assert.notEqual(w.photos[0].subject.x, .99); assert.notEqual(w.best.heron, 999); apply(w, 'pan', .01); wait(w, .1); assert.notDeepEqual(w.photos[0].camera, w.camera);
});
test('repeated photos have unique IDs and cannot count one species as three completed species', () => {
  const w = fresh(); aim(w, 'heron', 1.65); wait(w, .6); for (let i = 0; i < 4; i++) apply(w, 'shutter'); assert.equal(w.phase, 'observing'); assert.equal(w.photos.length, 4); assert.equal(w.stats.qualified, 4); assert.equal(E.status(w).qualifiedSpecies.length, 1); assert.deepEqual(w.photos.map(photo => photo.id), ['p1', 'p2', 'p3', 'p4']);
});
test('the twelve-photo archive preserves actual best captures while evicting older non-best frames', () => {
  const w = copy(stable), best = w.bestPhotoIds.heron; for (let i = 0; i < 18; i++) apply(w, 'shutter', 'kingfisher'); assert.equal(w.photos.length, 12); assert.ok(w.photos.some(photo => photo.id === best)); assert.equal(w.stats.shots, 19); assert.equal(w.nextPhoto, 20); assert.equal(w.photos.at(-1).id, 'p19'); assert.equal(w.log.length, 19); invariants(w); assert.ok(E.restore(E.serialize(w)));
});
test('ordinary manual zoom pan wait shutter actions can finish all three species', () => {
  const w = fresh(); for (const [id, zoom] of [['heron', 1.65], ['kingfisher', 2.8], ['deer', 2.6]]) { aim(w, id, zoom); wait(w, .6); const photo = apply(w, 'shutter', id).photo; assert.equal(photo.qualified, true); }
  assert.equal(w.phase, 'complete'); assert.equal(w.paused, true); assert.equal(E.status(w).qualifiedSpecies.length, 3); assert.ok(Object.values(w.best).every(value => value >= 70)); playthroughs.push({ mode: 'ordinary explicit manual controls', observationSeconds: w.time, actionCount: w.ledger.length, scores: copy(w.best), shots: copy(w.photos) });
});
test('timed demonstration issues ordinary legal actions and wins with three genuine scored photographs', () => {
  assert.equal(finished.phase, 'complete'); assert.equal(finished.stats.shots, 3); assert.equal(finished.stats.failed, 0); assert.ok(finished.ledger.every(record => ['select', 'zoom', 'pan', 'shutter'].includes(record.type))); assert.ok(finished.time < 120); assert.equal(E.demoStep(finished), null);
});
test('the same visible planner completes varied seeds and ordinary frame rates', () => {
  for (const [seed, dt] of [[1, 1 / 60], [4294967295, .25], [12345, .1], [987654321, .2]]) demo(seed, dt, .4);
});
test('completed observation parks time and rejects further physical actions or resumption', () => {
  const w = copy(finished), before = E.serialize(w); assert.equal(E.stepWorld(w, .25), false); for (const [type, payload] of [['pause', false], ['shutter', 'deer'], ['pan', -.1], ['zoom', -.1]]) assert.equal(E.act(w, type, payload).ok, false); assert.equal(E.serialize(w), before);
});
test('the finite observation window ends exactly at 120 seconds without granting missing photos', () => {
  const w = fresh(); for (let i = 0; i < 480; i++) assert.equal(E.stepWorld(w, .25), true); assert.equal(w.time, 120); assert.equal(w.phase, 'report'); assert.equal(w.paused, true); assert.equal(w.photos.length, 0); assert.equal(w.ledger.length, 0); assert.deepEqual(w.best, { heron: 0, kingfisher: 0, deer: 0 }); assert.equal(E.demoPlanner(w), null); assert.ok(E.restore(E.serialize(w)));
});
test('native 60 frame per second observation has a bounded sparse save instead of frame events', () => {
  const w = fresh(); for (let i = 0; i < 7200 && !w.paused; i++) E.stepWorld(w, 1 / 60); assert.equal(w.time, 120); assert.equal(w.ledger.length, 0); assert.ok(E.serialize(w).length < 5000); assert.ok(E.restore(E.serialize(w)));
});
test('paused restore keeps the exact observed camera subjects IDs photos and best records', () => {
  const source = copy(stable); apply(source, 'pause', true); const saved = E.serialize(source), restored = E.restore(saved); assert.ok(restored); assert.equal(restored.paused, true); assert.deepEqual(restored, source); assert.equal(E.serialize(restored), saved); assert.equal(E.stepWorld(restored, .25), false);
});
test('active save restores paused and legal continuation reproduces the same next photograph', () => {
  const source = copy(stable), restored = E.restore(E.serialize(source)); assert.ok(restored); assert.equal(restored.paused, true); apply(restored, 'pause', false); wait(source, .4); wait(restored, .4); const a = apply(source, 'shutter'), b = apply(restored, 'shutter'); assert.deepEqual(a.photo, b.photo); assert.equal(E.serialize(source), E.serialize(restored));
});
test('strict replay rejects forged scores cameras animals stable time and photograph IDs', () => {
  for (const change of [w => w.photos[0].score = 100, w => w.photos[0].camera.x += .1, w => w.photos[0].subject.x += .1, w => w.photos[0].stableFor += 1, w => w.photos[0].id = 'p999', w => w.photos[0].projection.width += .1, w => w.photos[0].qualified = false, w => w.photos[0].components.occupancy += 1]) bad(stable, change);
});
test('strict replay rejects granted best status time selection counters and unknown fields', () => {
  for (const change of [w => w.best.deer = 100, w => w.bestPhotoIds.heron = 'p999', w => w.phase = 'complete', w => w.time += .1, w => w.selected = 'deer', w => w.stats.shots++, w => w.nextPhoto++, w => w.camera.y = .6, w => w.subjects[0].x += .1, w => w.extra = true]) bad(stable, change);
});
test('strict replay rejects malformed reordered future duplicated and non-legal action records', () => {
  for (const change of [w => w.ledger[0].at = -1, w => w.ledger[0].at = w.tick + 1, w => w.ledger[0].type = 'grant', w => w.ledger[0].payload = 99, w => w.ledger[0].extra = 1, w => w.ledger.push(copy(w.ledger.at(-1))), w => w.ledger.reverse(), w => w.ledger = [], w => w.ledger[0].at = .5]) bad(stable, change);
});
test('strict restore rejects unknown versions invalid seeds malformed objects and oversized input', () => {
  for (const input of ['', '{', 'null', '[]', '{}', 'x'.repeat(2000001), null, 123]) assert.equal(E.restore(input), null); for (const change of [w => w.version++, w => w.seed = 0, w => w.seed = 4294967296, w => w.tick = 120000001, w => w.paused = 1, w => w.ledger = null]) bad(stable, change); assert.equal(E.createWorld(0).seed, E.DEFAULT_SEED); assert.equal(E.createWorld(NaN).seed, E.DEFAULT_SEED);
});
test('every intermediate genuine demo save restores the same canonical state', () => {
  const w = fresh(11); for (let i = 0; i < 1200 && !w.paused; i++) { const plan = E.demoPlanner(w); if (plan) apply(w, plan.action, plan.payload); E.stepWorld(w, .1); const restored = E.restore(E.serialize(w)); assert.ok(restored); assert.equal(E.serialize(restored), E.serialize(w)); }
  assert.equal(w.phase, 'complete');
});
test('legal record-cap boundary refuses extra actions and offers no impossible demo plan', () => {
  const w = fresh(); apply(w, 'zoom', .4); while (w.ledger.length < E.MAX_ACTIONS) apply(w, 'pan', w.ledger.length % 2 ? .001 : -.001); const before = E.serialize(w); assert.equal(w.ledger.length, E.MAX_ACTIONS); assert.equal(E.demoPlanner(w), null); assert.equal(E.act(w, 'shutter').ok, false); assert.equal(E.serialize(w), before); assert.ok(E.restore(before)); assert.ok(before.length < 2000000);
});

const report = { date: '2026-10-05', direction: '芦湾观鸟 / REEDLIGHT', passed: failures.length === 0, count: checks.length, checks, failures, playthroughs, method: 'Pure DOM-independent deterministic rule assertions. Every completion uses public pan/zoom/select/shutter actions and ordinary bounded time steps. Restore replays sparse legal actions at integer timestamps and compares all canonical camera/subject/photo/score/history fields; it does not authenticate browser PNG bytes, which are separately bound by photo ID in controller/browser checks.', command: 'D:/software/nodejs/node.exe tooling/check-direction-wildlife-rules.mjs' };
fs.writeFileSync(path.join(project, 'notes/direction-wildlife-rules-20261005.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${checks.length} wildlife rule checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
