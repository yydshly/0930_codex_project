import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Canvas, Image } from 'file:///C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/node_modules/skia-canvas/lib/index.mjs';
import { createPark, openPark, advance, place } from '../web/direction-park-engine.js';
import { drawPark, VIEW, point, cellFromPoint } from '../web/direction-park-render.js';
const p = path.dirname(path.dirname(fileURLToPath(import.meta.url))), out = path.join(p, 'assets/directions/park-qa'); fs.mkdirSync(out, { recursive: true });
const load = async name => { const image = new Image(); image.src = fs.readFileSync(path.join(p, 'web/assets/directions/park', name)); await image.decode(); return image; };
const assets = { atlas: await load('park-atlas.png'), terrain: await load('garden-terrain.png'), visitors: await load('visitors-atlas.png') }, canvas = new Canvas(VIEW.width, VIEW.height), ctx = canvas.getContext('2d'), frames = [];
for (let x = 0; x < 12; x++) for (let y = 0; y < 12; y++) assert.deepEqual(cellFromPoint(...point(x, y)), [x, y]);
const run = (w, time) => { for (let i = 0; i < time * 20; i++) advance(w, .05); };
async function render(name, w, options = {}) { const before = JSON.stringify(w); drawPark(ctx, w, assets, options); assert.equal(JSON.stringify(w), before); await canvas.toFile(path.join(out, name + '.png')); frames.push({ name, file: `assets/directions/park-qa/${name}.png`, phase: w.phase, time: w.time, stats: structuredClone(w.stats) }); }
const demo = createPark(); await render('ready', demo); openPark(demo); run(demo, 45); await render('open-day', demo); run(demo, 135); await render('finished', demo);
const guided = createPark('guided'); openPark(guided); run(guided, 25); await render('disconnected', guided, { guide: true, grid: true }); place(guided, 'road', 6, 7); run(guided, 30); await render('reconnected', guided);
fs.writeFileSync(path.join(p, 'notes/direction-park-frames-20261005.json'), JSON.stringify({ method: 'Actual production Canvas2D renderer and park simulation via Skia. Not browser screenshots; CSS, touch and fullscreen acceptance remain separate.', frames }, null, 2));
console.log(`Rendered ${frames.length} production park frames; isometric pointer mapping verified`);
