// Actual production callbacks using a minimal DOM adapter. Rendering is verified separately.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { point } from '../web/direction-park-render.js';
import { connected } from '../web/direction-park-engine.js';
const p = path.dirname(path.dirname(fileURLToPath(import.meta.url))), elements = new Map(), stored = new Map(), checks = [], windowEvents = new Map(), documentEvents = new Map();
let raf;
const context = new Proxy({}, { get: (obj, name) => name in obj ? obj[name] : name === 'createLinearGradient' || name === 'createRadialGradient' ? () => ({ addColorStop() {} }) : name === 'measureText' ? value => ({ width: String(value).length * 7 }) : () => {}, set: (obj, name, value) => { obj[name] = value; return true; } });
class Element {
  constructor(id) { this.id = id; this.listeners = new Map(); this.textContent = ''; this.hidden = false; this.disabled = false; this.attrs = new Map(); this.dataset = {}; this.classes = new Set(); this.classList = { toggle: (key, value) => value ? this.classes.add(key) : this.classes.delete(key) }; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  emit(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn({ preventDefault() {}, button: 0, pointerId: 1, ...event }); }
  click() { if (!this.disabled) this.emit('click'); }
  setAttribute(key, value) { this.attrs.set(key, value); }
  getContext() { return context; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1440, height: 900 }; }
  focus() {}
  setPointerCapture(id) { this.pointer = id; }
  hasPointerCapture(id) { return this.pointer === id; }
  releasePointerCapture(id) { this.pointer = null; }
}
const html = fs.readFileSync(path.join(p, 'web/direction-park.html'), 'utf8');
for (const m of html.matchAll(/id="([^"]+)"/g)) elements.set(m[1], new Element(m[1]));
const tools = [...html.matchAll(/data-park-tool="([^"]+)"/g)].map(m => { const e = new Element(); e.dataset.parkTool = m[1]; return e; });
globalThis.document = { hidden: false, fullscreenElement: null, getElementById: id => { assert.ok(elements.has(id), 'real HTML must contain ' + id); return elements.get(id); }, querySelectorAll: query => { assert.equal(query, '[data-park-tool]'); return tools; }, addEventListener: (type, fn) => documentEvents.set(type, fn) };
globalThis.window = { addEventListener: (type, fn) => windowEvents.set(type, fn) };
globalThis.localStorage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) };
globalThis.matchMedia = () => ({ matches: false }); globalThis.requestAnimationFrame = fn => { raf = fn; };
globalThis.location = new URL('http://127.0.0.1:8962/direction-park.html');
globalThis.Image = class { width = 1536; height = 1024; set src(value) { assert.ok(fs.existsSync(path.join(p, 'web', value))); queueMicrotask(() => this.onload()); } };
await import('../web/direction-park.js');
const el = id => elements.get(id), test = (name, fn) => { fn(); checks.push(name); }, key = 'world-play-direction-park-v1', state = () => JSON.parse(stored.get(key));
const clickMap = (x, y) => { const [clientX, clientY] = point(x, y); el('park-canvas').emit('pointerdown', { clientX, clientY }); el('park-canvas').emit('pointerup'); };
test('production HTML IDs and assets match every controller dependency', () => { assert.ok(raf); assert.equal(el('p-load-status').hidden, true); assert.equal(el('p-open').disabled, false); });
test('demo controls open the actual six-facility park', () => { el('p-demo').click(); assert.equal(state().phase, 'open'); assert.equal(state().facilities.length, 6); assert.equal(el('p-pause').textContent, '暂停'); });
test('pause freezes model time while page frames continue', () => { el('p-pause').click(); const before = state().time; for (let i = 1; i <= 4; i++) raf(i * 3000); assert.equal(state().time, before); assert.equal(el('p-pause').textContent, '继续运行'); });
test('guided map pointer repairs exactly the disconnected road tile', () => { el('p-guided').click(); assert.equal(state().facilities.filter(f => !connected(state(), f)).length, 2); clickMap(6, 7); assert.ok(state().roads.includes('6,7')); assert.equal(state().facilities.filter(f => !connected(state(), f)).length, 0); assert.match(el('p-hint').textContent, /步道接通/); assert.equal(el('park-canvas').hasPointerCapture(1), false); });
test('inspection is read-only and exposes real facility service information', () => { const before = stored.get(key); el('p-inspect').click(); clickMap(3, 3); assert.equal(stored.get(key), before); assert.match(el('p-tile-info').textContent, /已接通.*排队.*收入/); assert.equal(el('p-inspect').attrs.get('aria-pressed'), 'true'); });
test('tool selection exits inspection and view controls change state', () => { tools[1].click(); assert.equal(el('p-tool-name').textContent, '摩天轮'); assert.equal(el('p-inspect').attrs.get('aria-pressed'), 'false'); el('p-speed').click(); assert.equal(el('p-speed').textContent, '速度 ×2'); el('p-bubbles').click(); assert.equal(el('p-bubbles').attrs.get('aria-pressed'), 'false'); });
test('blank layout resets and keyboard construction is available', () => { el('p-blank').click(); assert.equal(state().facilities.length, 0); assert.equal(state().roads.length, 1); el('park-canvas').emit('keydown', { code: 'Enter' }); assert.equal(state().roads.length, 2); });
test('fast road drag fills skipped grid tiles and releases capture', () => { el('p-blank').click(); const a = point(8, 9), b = point(10, 9); el('park-canvas').emit('pointerdown', { clientX: a[0], clientY: a[1] }); el('park-canvas').emit('pointermove', { clientX: b[0], clientY: b[1] }); el('park-canvas').emit('pointerup'); assert.ok(['8,9', '9,9', '10,9'].every(k => state().roads.includes(k))); assert.equal(el('park-canvas').hasPointerCapture(1), false); });
test('background blur pauses park and releases an active drag', () => { el('p-open').click(); const a = point(10, 10); el('park-canvas').emit('pointerdown', { clientX: a[0], clientY: a[1] }); windowEvents.get('blur')(); assert.equal(el('park-canvas').hasPointerCapture(1), false); assert.equal(el('p-pause').textContent, '继续运行'); assert.equal(state().paused, true); });
test('normal frame callbacks complete a day; next day retains the earned budget and layout', () => { el('p-demo').click(); for (let i = 1; i < 1000; i++) raf(20000 + i * 100); assert.equal(state().phase, 'report'); assert.equal(el('p-end-card').hidden, false); assert.equal(state().stats.entered, state().stats.departed); assert.ok(state().stats.rides > 15); assert.match(el('p-end-detail').textContent, /接待.*满意度/); const before = state(); el('p-next-day').click(); assert.equal(state().phase, 'ready'); assert.equal(el('p-end-card').hidden, true); assert.equal(state().credits, before.credits); assert.deepEqual(state().roads, before.roads); assert.equal(state().stats.served, 0); assert.equal(el('p-open').disabled, false); });
assert.deepEqual([...stored.keys()], [key]);
fs.writeFileSync(path.join(p, 'notes/direction-park-controller-20261005.json'), JSON.stringify({ passed: true, checks, method: 'Actual production page callbacks with minimal DOM/no-op Canvas adapter; image drawing separately verified in five production Skia frames. Not browser CSS, pointer platform, fullscreen, touch or refresh storage acceptance.' }, null, 2));
console.log(`${checks.length} park controller checks passed; only the dedicated park save key was touched`);
