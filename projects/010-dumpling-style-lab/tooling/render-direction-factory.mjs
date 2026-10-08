import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Canvas, Image } from 'file:///C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/node_modules/skia-canvas/lib/index.mjs';
import { createWorld, start, step } from '../web/direction-factory-engine.js';
import { drawFactory, VIEW } from '../web/direction-factory-render.js';
const p = path.dirname(path.dirname(fileURLToPath(import.meta.url))), out = path.join(p, 'assets/directions/qa'); fs.mkdirSync(out, { recursive: true });
const load = async name => { const image = new Image(); image.src = fs.readFileSync(path.join(p, 'web/assets/directions/factory', name)); await image.decode(); return image; };
const assets = { atlas: await load('industrial-atlas.png'), terrain: await load('copper-basin.png') };
const canvas = new Canvas(VIEW.width, VIEW.height), ctx = canvas.getContext('2d'), frames = [];
async function render(name, w, options = {}) { const before = JSON.stringify(w); drawFactory(ctx, w, assets, options); assert.equal(JSON.stringify(w), before); await canvas.toFile(path.join(out, `${name}.png`)); frames.push({ name, file: `assets/directions/qa/${name}.png`, phase: w.phase, wave: w.wave, stats: w.stats }); }
const run = (w, seconds) => { for (let i = 0; i < seconds * 20; i++) step(w, .05); };
await render('ready', createWorld());
const demo = createWorld(); start(demo); run(demo, 12); await render('battle', demo); run(demo, 150); await render('won', demo);
const guided = createWorld('guided'); start(guided, false); run(guided, 5); await render('guided', guided, { guide: true, grid: true, hover: [10, 5] });
fs.writeFileSync(path.join(p, 'notes/direction-factory-frames-20261005.json'), JSON.stringify({ method: 'Production Canvas2D renderer and production simulation rendered through Skia. These are not browser screenshots and do not verify CSS/touch/fullscreen.', frames }, null, 2));
console.log(`Rendered ${frames.length} production factory frames`);
