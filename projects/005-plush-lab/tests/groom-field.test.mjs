import test from 'node:test';
import assert from 'node:assert/strict';
import {paintGroomField, clearGroomField, readGroomField, applyGroomField, GUIDE_BRUSH_RADIUS} from '../src/groom-field.js';
import {shapePoint} from '../src/shapes.js';

const guide = (root = [0, 0, 0], normal = [0, 0, 1], style = [0, 0, 0]) => ({root, normal, style});
const clone = guides => structuredClone(guides);

test('combing changes only the soft local patch and keeps roots and normals fixed', () => {
  const guides = [guide(), guide([.19, 0, 0]), guide([.8, 0, 0], [0, 0, 1], [.2, .1, 0])];
  const before = clone(guides);
  assert.equal(paintGroomField(guides, [0, 0, 0], [.1, 0, 0]), true);
  assert.ok(guides[0].style[0] > guides[1].style[0]);
  assert.ok(guides[1].style[0] > 0);
  assert.deepEqual(guides[2].style, before[2].style);
  for (let i = 0; i < guides.length; i++) {
    assert.deepEqual(guides[i].root, before[i].root);
    assert.deepEqual(guides[i].normal, before[i].normal);
  }
});

test('styles follow the surface tangent even when pointer movement includes a normal component', () => {
  const normal = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
  const guides = [guide([0, 0, 0], normal, [0, 0, 1])];
  paintGroomField(guides, [0, 0, 0], [.1, -.03, .2]);
  assert.ok(Math.abs(guides[0].style.reduce((sum, value, i) => sum + value * normal[i], 0)) < 1e-12);
  const vertical = [guide()];
  assert.equal(paintGroomField(vertical, [0, 0, 0], [0, 0, .2]), false);
  assert.deepEqual(vertical[0].style, [0, 0, 0]);
});

test('equal drag distance produces equal grooming whether delivered in one segment or many events', () => {
  const coarse = [guide(), guide([.1, .1, 0])];
  const fine = clone(coarse);
  paintGroomField(coarse, [0, 0, 0], [.12, -.08, .04], .75);
  for (let i = 0; i < 40; i++) paintGroomField(fine, [0, 0, 0], [.12 / 40, -.08 / 40, .04 / 40], .75);
  for (let i = 0; i < coarse.length; i++) {
    for (let j = 0; j < 3; j++) assert.ok(Math.abs(coarse[i].style[j] - fine[i].style[j]) < 1e-12);
  }
});

test('zero displacement, zero strength and invalid inputs do not accumulate combing', () => {
  const guides = [guide()];
  for (let i = 0; i < 100; i++) assert.equal(paintGroomField(guides, [0, 0, 0], [0, 0, 0]), false);
  assert.equal(paintGroomField(guides, [0, 0, 0], [.1, 0, 0], 0), false);
  assert.equal(paintGroomField(guides, [NaN, 0, 0], [.1, 0, 0]), false);
  assert.equal(paintGroomField(guides, [0, 0, 0], [.1, 0, 0], 1, 0), false);
  assert.equal(paintGroomField(null, [0, 0, 0], [.1, 0, 0]), false);
  assert.deepEqual(guides[0].style, [0, 0, 0]);
});

test('strong repeated painting and extreme imported styles stay finite and below the style bound', () => {
  const guides = [guide([0, 0, 0], [0, 0, 10], [Number.MAX_VALUE, -Number.MAX_VALUE, NaN])];
  for (let i = 0; i < 100; i++) {
    paintGroomField(guides, [0, 0, 0], [Math.sin(i) * Number.MAX_VALUE, Math.cos(i) * Number.MAX_VALUE, 0], 1e100);
    assert.ok(guides[0].style.every(Number.isFinite));
    assert.ok(Math.hypot(...guides[0].style) <= 1.5 + 1e-12);
  }
  const field = readGroomField(guides);
  assert.ok(Math.hypot(...field[0]) <= 1.5);
});

test('field import and export make independent copies and preserve compact style values', () => {
  const guides = [guide(), guide([.2, 0, 0])];
  const source = [[.123456789, -.234567891, 0], [.2, .3, 0]];
  assert.equal(applyGroomField(guides, source), true);
  source[0][0] = 9;
  assert.equal(guides[0].style[0], .123456789);
  const field = readGroomField(guides);
  assert.deepEqual(field[0], [.1235, -.2346, 0]);
  field[1][0] = 9;
  assert.equal(guides[1].style[0], .2);
  const restored = [guide(), guide([.2, 0, 0])];
  assert.equal(applyGroomField(restored, readGroomField(guides)), true);
  assert.deepEqual(readGroomField(restored), readGroomField(guides));
});

test('malformed fields fail without partial mutation while numeric components are safely bounded', () => {
  const guides = [guide([0, 0, 0], [0, 0, 1], [.2, .3, 0]), guide()];
  const before = clone(guides);
  for (const field of [null, Array(2), [[0, 0, 0]], [[0, 0, 0], [0, 0]], [[0, 0, 0], {}]]) {
    assert.equal(applyGroomField(guides, field), false);
    assert.deepEqual(guides, before);
  }
  assert.equal(applyGroomField(guides, [[NaN, Infinity, '1'], [3, 4, 0]]), true);
  assert.deepEqual(guides[0].style, [0, 0, 0]);
  assert.ok(Math.abs(guides[1].style[0] - .9) < 1e-12);
  assert.ok(Math.abs(guides[1].style[1] - 1.2) < 1e-12);
  assert.equal(guides[1].style[2], 0);
});

test('explicit clearing and an empty legacy field restore styles without moving geometry', () => {
  const guides = [guide([.1, .2, .3], [0, 0, 1], [.2, .3, 0])];
  const root = guides[0].root;
  const normal = guides[0].normal;
  const style = guides[0].style;
  assert.equal(clearGroomField(guides), true);
  assert.equal(clearGroomField(guides), false);
  assert.equal(guides[0].style, style);
  assert.equal(guides[0].root, root);
  assert.equal(guides[0].normal, normal);
  assert.deepEqual(readGroomField(guides), [[0, 0, 0]]);
  paintGroomField(guides, root, [.1, 0, 0]);
  assert.equal(applyGroomField(guides, []), true);
  assert.deepEqual(readGroomField(guides), [[0, 0, 0]]);
});

test('the sparse 32-guide brush records strokes across every character front, including ear tips', () => {
  // The old .38 support missed patches on the cream character's belly; .55
  // still missed rabbit/bear ear tips. Probe real surface points, then exercise
  // painting rather than just checking distances or asserting the constant.
  const normalAt = (shape, theta, phi) => {
    const a = shapePoint(shape, Math.max(.0001, theta - .001), phi);
    const b = shapePoint(shape, Math.min(Math.PI - .0001, theta + .001), phi);
    const c = shapePoint(shape, theta, phi - .001);
    const d = shapePoint(shape, theta, phi + .001);
    const dt = b.map((value, i) => value - a[i]), dp = d.map((value, i) => value - c[i]);
    const cross = [dt[1] * dp[2] - dt[2] * dp[1], dt[2] * dp[0] - dt[0] * dp[2], dt[0] * dp[1] - dt[1] * dp[0]];
    const magnitude = Math.hypot(...cross);
    return cross.map(value => value / magnitude);
  };
  for (const shape of ['pear', 'bean', 'triangle', 'heart', 'egg', 'bunny', 'bear', 'star']) {
    const guides = Array.from({length: 32}, (_, i) => {
      const theta = Math.acos(1 - 2 * (i + .5) / 32), phi = i * Math.PI * (3 - Math.sqrt(5));
      return guide(shapePoint(shape, theta, phi), normalAt(shape, theta, phi));
    });
    const probes = [];
    // Uniform cos(theta) and phi sample the entire front hemisphere, not only
    // its central face. Sampling near the silhouette is essential for ears.
    for (let row = 0; row < 48; row++) for (let column = 0; column < 96; column++) {
      const theta = Math.acos(1 - 2 * (row + .5) / 48), phi = -Math.PI / 2 + (column + .5) * Math.PI / 96;
      probes.push(shapePoint(shape, theta, phi));
    }
    if (shape === 'triangle') probes.push([-.32560032296066616, -.2842868104868187, .6869139044960144]);
    if (shape === 'bunny') probes.push([.3672544727521676, 1.5160156823370234, .015104976538655454]);
    if (shape === 'bear') probes.push([.7129244302237541, 1.1908770165470706, .03502373138058549]);
    for (const point of probes) {
      // Fresh styles make a successful change proof that this individual
      // stroke was recorded, rather than that an earlier nearby stroke was.
      for (const item of guides) item.style.fill(0);
      const changed = paintGroomField(guides, point, [.018, -.008, .003], 1.6, GUIDE_BRUSH_RADIUS);
      assert.equal(changed, true, `${shape}: no brush response at ${point}`);
      assert.ok(guides.some(item => Math.hypot(...item.style) > 0), `${shape}: stroke left no style`);
    }
  }
});
