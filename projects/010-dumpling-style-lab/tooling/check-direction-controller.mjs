// Production callbacks with a minimal DOM adapter. This is not a browser test.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Canvas, Image as SkiaImage } from 'skia-canvas';
const p = path.dirname(path.dirname(fileURLToPath(import.meta.url))), elements = new Map(), stored = new Map(), checks = [], windowEvents = new Map(), documentEvents = new Map();
let raf;
class Element {
  constructor(id) { this.id = id; this.listeners = new Map(); this.textContent = ''; this.hidden = false; this.disabled = false; this.attrs = new Map(); this.dataset = {}; this.classes = new Set(); this.classList = { toggle: (key, value) => value ? this.classes.add(key) : this.classes.delete(key) }; if (id === 'factory-canvas') this.surface = new Canvas(1440, 900); }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  emit(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn({ preventDefault() {}, button: 0, pointerId: 1, ...event }); }
  click() { if (!this.disabled) this.emit('click'); }
  setAttribute(key, value) { this.attrs.set(key, value); }
  getContext() { const ctx = this.surface.getContext('2d'); if (!ctx.wrapped) { const native = ctx.drawImage.bind(ctx); ctx.drawImage = (image, ...args) => native(image.source || image, ...args); ctx.wrapped = true; } return ctx; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1440, height: 900 }; }
  focus() {}
  setPointerCapture(id) { this.pointer = id; }
  hasPointerCapture(id) { return this.pointer === id; }
  releasePointerCapture(id) { this.pointer = null; }
}
const html = fs.readFileSync(path.join(p, 'web/directions.html'), 'utf8');
for (const m of html.matchAll(/id="([^"]+)"/g)) elements.set(m[1], new Element(m[1]));
const tools = [...html.matchAll(/data-tool="([^"]+)"/g)].map(m => { const e = new Element(); e.dataset.tool = m[1]; return e; });
globalThis.document = { hidden: false, fullscreenElement: null, getElementById: id => { assert.ok(elements.has(id), 'real HTML must contain ' + id); return elements.get(id); }, querySelectorAll: query => { assert.equal(query, '[data-tool]'); return tools; }, addEventListener: (type, fn) => documentEvents.set(type, fn) };
globalThis.window = { addEventListener: (type, fn) => windowEvents.set(type, fn) };
globalThis.localStorage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) };
globalThis.matchMedia = () => ({ matches: false }); globalThis.requestAnimationFrame = fn => { raf = fn; };
globalThis.location = new URL('http://127.0.0.1:8962/directions.html');
globalThis.Image = class { set src(value) { this.source = new SkiaImage(); this.source.src = fs.readFileSync(path.join(p, 'web', value)); this.source.decode().then(() => this.onload()); } };
await import('../web/directions.js');
const el = id => elements.get(id), test = (name, fn) => { fn(); checks.push(name); }, key = 'world-play-direction-copper-v1';
test('production HTML IDs match every controller dependency', () => { assert.ok(raf); assert.equal(el('load-status').hidden, true); assert.equal(el('pause').disabled, false); });
test('demo button starts actual three-wave simulation', () => { el('demo').click(); const w = JSON.parse(stored.get(key)); assert.equal(w.phase, 'defense'); assert.equal(w.cells.length, 11); assert.equal(el('pause').textContent, '暂停'); });
test('pause button freezes clock and changes control label', () => { el('pause').click(); assert.equal(el('pause').textContent, '继续运行'); const before = stored.get(key); for (let i = 1; i <= 3; i++) raf(i * 3000); assert.equal(JSON.parse(stored.get(key)).time, JSON.parse(before).time); });
test('guided button and real map pointer fill the intended supply gap', () => { el('guided').click(); let w = JSON.parse(stored.get(key)); assert.ok(!w.cells.find(c => c.x === 10 && c.y === 5)); el('factory-canvas').emit('pointerdown', { clientX: 783, clientY: 459 }); el('factory-canvas').emit('pointerup'); w = JSON.parse(stored.get(key)); assert.ok(w.cells.find(c => c.x === 10 && c.y === 5 && c.type === 'belt' && c.dir === 0)); assert.match(el('hint').textContent, /产线接通/); assert.equal(el('factory-canvas').hasPointerCapture(1), false); });
test('real controls select tools, rotate and change view flags', () => { tools[3].click(); assert.equal(el('tool-name').textContent, '防御炮塔'); el('rotate').click(); assert.equal(el('direction').textContent, '↓ 向下'); el('speed').click(); assert.equal(el('speed').textContent, '速度 ×2'); el('flow').click(); assert.equal(el('flow').attrs.get('aria-pressed'), 'false'); });
test('blank mode keeps core, resets resources and keyboard can construct', () => { el('blank').click(); assert.equal(JSON.parse(stored.get(key)).cells.length, 1); el('factory-canvas').emit('keydown', { code: 'Enter' }); assert.equal(JSON.parse(stored.get(key)).cells.length, 2); });
test('a fast horizontal belt drag fills every skipped map cell', () => { el('blank').click(); el('factory-canvas').emit('pointerdown', { clientX: 783, clientY: 459 }); el('factory-canvas').emit('pointermove', { clientX: 969, clientY: 459 }); el('factory-canvas').emit('pointerup'); const w = JSON.parse(stored.get(key)); for (const x of [10, 11, 12, 13]) assert.ok(w.cells.find(c => c.x === x && c.y === 5 && c.type === 'belt')); });
test('background blur releases drag and saves paused simulation', () => { el('pause').click(); el('factory-canvas').emit('pointerdown', { clientX: 845, clientY: 459 }); windowEvents.get('blur')(); assert.equal(el('factory-canvas').hasPointerCapture(1), false); assert.equal(JSON.parse(stored.get(key)).paused, true); assert.equal(el('pause').textContent, '继续运行'); });
test('ordinary page controls reach actual end state and show completion panel', () => { el('demo').click(); for (let i = 1; i < 2400; i++) raf(20000 + i * 100); assert.equal(el('end-card').hidden, false); assert.equal(el('end-title').textContent, '矿区守住了。'); assert.equal(el('pause').disabled, true); assert.equal(JSON.parse(stored.get(key)).stats.kills, 18); });
assert.deepEqual([...stored.keys()], [key]);
fs.writeFileSync(path.join(p, 'notes/direction-controller-checks-20261005.json'), JSON.stringify({ passed: true, checks, method: 'Actual production page module and callbacks with DOM/Canvas adapter. Not browser CSS, pointer platform, fullscreen or localStorage acceptance.' }, null, 2));
console.log(`${checks.length} controller checks passed; only the new dedicated storage key was touched`);
