import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Canvas, Image } from 'file:///C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/node_modules/skia-canvas/lib/index.mjs';
import { COLS, ROWS, DEMO_PLANS, createStealth, advance, goTo, setStance, interact, visibility, encode } from '../web/direction-stealth-engine.js';
import { VIEW, point, cellFromPoint, drawStealth } from '../web/direction-stealth-render.js';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(project, 'assets/directions/stealth-qa');
fs.mkdirSync(out, { recursive: true });
assert.equal(VIEW.width, 1440); assert.equal(VIEW.height, 960);
const sources = {}, assets = {};
for (const [key, file] of Object.entries({ materials: 'materials-atlas.png', props: 'estate-props.png', actors: 'covert-actors.png', scene: 'moonlit-estate.png', states: 'state-variants.png' })) {
  const bytes = fs.readFileSync(path.join(project, 'web/assets/directions/stealth', file));
  const im = new Image(); im.src = bytes; await im.decode(); assets[key] = im;
  sources[key] = { file: `web/assets/directions/stealth/${file}`, width: im.width, height: im.height, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

let mappings = 0;
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  assert.deepEqual(cellFromPoint(...point(x, y)), [x, y]); mappings++;
}
assert.equal(mappings, 384);
assert.equal(cellFromPoint(VIEW.x - 1, VIEW.y), null);
assert.equal(cellFromPoint(VIEW.x + COLS * VIEW.tile, VIEW.y), null);
assert.equal(cellFromPoint(VIEW.x, VIEW.y - 1), null);
assert.equal(cellFromPoint(VIEW.x, VIEW.y + ROWS * VIEW.tile), null);
assert.deepEqual(point(0, 0), [145, 95]);
assert.deepEqual(point(23, 15), [1295, 845]);

const canvas = new Canvas(VIEW.width, VIEW.height), ctx = canvas.getContext('2d'), frames = [];
const dt = 0.04;
function run(w, seconds) { for (let n = 0; n < Math.ceil(seconds / dt) && w.phase === 'playing'; n++) advance(w, dt); }
function until(w, predicate, seconds = 120) {
  for (let n = 0; n < Math.ceil(seconds / dt) && w.phase === 'playing' && !predicate(w); n++) advance(w, dt);
  assert.ok(predicate(w), `actual state not reached at ${w.time.toFixed(2)}s (${w.phase})`);
}
async function render(name, w, coverage, options = {}) {
  const before = encode(w);
  drawStealth(ctx, w, assets, { showVision: true, selectedGuard: 'keeper', ...options });
  assert.equal(encode(w), before, 'production draw must not modify actual gameplay state');
  const file = `assets/directions/stealth-qa/${name}.png`;
  await canvas.toFile(path.join(project, file));
  const bytes = fs.readFileSync(path.join(project, file));
  assert.equal(bytes.readUInt32BE(16), 1440); assert.equal(bytes.readUInt32BE(20), 960);
  frames.push({ file, coverage, width: 1440, height: 960, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    modelUnchangedByDraw: true, time: Number(w.time.toFixed(2)), mode: w.mode, plan: w.plan, phase: w.phase, paused: w.paused,
    objective: w.objective, stones: w.stones, visibility: visibility(w), player: structuredClone(w.player),
    lamps: structuredClone(w.lamps), guards: structuredClone(w.guards), projectiles: structuredClone(w.projectiles),
    noises: structuredClone(w.noises), stats: structuredClone(w.stats), lastLog: structuredClone(w.log.slice(-5)) });
}

const opening = createStealth('demo', 'shadow'); opening.paused = true;
await render('01-opening', opening, 'The original shared scene, paused before any movement.');

const shadow = createStealth('demo', 'shadow');
until(shadow, w => w.player.x > 11.5 && w.player.y === 4);
await render('02-shadow-detour', shadow, 'Actual crouched travel on the upper rug below the solid screen, with guard patrols and wall-clipped vision.', { showRoutes: true, selectedGuard: 'rook' });

const blackout = createStealth('demo', 'blackout');
const lit = visibility(blackout, { x: 12, y: 8 });
until(blackout, w => !w.lamps.find(l => l.id === 'gallery').on);
assert.equal(blackout.stats.lightsToggled, 1);
assert.ok(lit - visibility(blackout, { x: 12, y: 8 }) > 0.7);
await render('03-gallery-lamp-extinguished', blackout, 'The ordinary E interaction has actually turned off the gallery lamp; the middle corridor uses the changed light state.');

const lure = createStealth('demo', 'lure');
until(lure, w => w.projectiles.length > 0);
run(lure, 0.16); assert.ok(lure.projectiles.length > 0 && lure.projectiles[0].age < lure.projectiles[0].flight);
await render('04-real-stone-flight', lure, 'One of the three finite stones is in its actual 0.42 second flight; no impact or investigation has been granted.', { selectedGuard: 'porter', aim: { x: 8, y: 14 } });
until(lure, w => w.guards.find(g => g.id === 'porter').mode === 'investigate', 3);
assert.ok(lure.noises.some(n => n.kind === 'stone'));
await render('05-guard-investigates-impact', lure, 'The real stone landed and its traversable sound distance caused the porter to investigate the actual impact tile.', { showRoutes: true, selectedGuard: 'porter' });
until(lure, w => w.guards.find(g => g.id === 'porter').mode === 'search', 16);
await render('06-guard-searches-sound-alcove', lure, 'The porter physically reached the impact and started the limited search timer while the infiltrator uses the grass lane.', { showRoutes: true, selectedGuard: 'porter' });

until(shadow, w => w.objective);
assert.equal(shadow.stats.archiveCollected, true); assert.equal(shadow.phase, 'playing');
await render('07-archive-collected', shadow, 'The infiltrator reached the archive and used ordinary interaction to collect the seal, before returning to the exit.');
until(shadow, w => w.phase === 'won');
assert.ok(shadow.stats.distance >= 45 && shadow.stats.exitTime > shadow.stats.pickupTime);
await render('08-seal-returned-victory', shadow, 'Ordinary travel back to the west exit and ordinary interaction completed this run.');

const failure = createStealth('manual', 'blackout'); let uses = 0;
for (const action of DEMO_PLANS.blackout) {
  if (failure.phase !== 'playing') break;
  if (action.kind === 'move') {
    assert.ok(goTo(failure, action.x, action.y).ok);
    for (let n = 0; n < 2400 && failure.phase === 'playing' && failure.player.path.length; n++) advance(failure, dt);
  } else if (action.kind === 'stance') assert.ok(setStance(failure, action.value).ok);
  else if (action.kind === 'wait') run(failure, action.seconds);
  else if (action.kind === 'interact') { if (uses > 0) interact(failure); uses++; }
}
assert.equal(failure.phase, 'lost'); assert.equal(failure.stats.lightsToggled, 0); assert.ok(failure.stats.alerts > 0);
await render('09-gallery-left-lit-capture', failure, 'Counterfactual ordinary middle crossing omits the lamp toggle and is caught through accumulated real exposure.', { showRoutes: true });

const report = {
  passed: true,
  method: 'Production drawStealth Canvas2D calls rendered through Skia using the production engine and actual ordinary demo/manual commands. These are generated renderer frames, not browser screenshots. This verifies Canvas output and shared model geometry; it makes no browser DOM, browser input, GPU/WebGL or screenshot claim.',
  coordinateChecks: { passed: true, mappingCount: mappings, cols: COLS, rows: ROWS, view: VIEW, firstCellCentre: point(0, 0), lastCellCentre: point(23, 15), outsideBoundaryChecks: 4 },
  renderingPurity: 'encode(world) compared before and after every production draw; every model was unchanged.',
  simulation: { stepSeconds: dt, noTeleports: true, noSyntheticObjectiveOrPhaseAwards: true, sourcePlans: ['shadow', 'blackout', 'lure'], counterfactual: 'manual middle route without its ordinary lamp interaction' },
  sources, frames,
};
fs.writeFileSync(path.join(project, 'notes/direction-stealth-frames-20261005.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Rendered ${frames.length} production stealth frames at 1440x960; ${mappings} coordinate mappings and model purity passed.`);
