import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../tooling/node_modules/three/build/three.module.js';
import {dyno, ExtSplats} from '../tooling/node_modules/@sparkjsdev/spark/dist/spark.module.js';
import {REFERENCE_FUR_BOUNDS, REFERENCE_GROOM_GRID, REFERENCE_GROOM_LIMIT, sanitizeReferenceFur,
  paintReferenceGroom, clearReferenceGroom, sampleReferenceGroom, referenceFurMask, deformReferenceSplat,
  createReferenceFurModifier} from '../src/reference-plush-fur.js';

const coat = () => ({center: [.1, -.7, .75], scales: [.003, .009, .001], quaternion: [0, 0, 0, 1],
  baseColor: [.05, .3, .8], color: [.12, .4, .95], opacity: .72, index: 19});
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const cells = REFERENCE_GROOM_GRID.reduce((a, b) => a * b, 1);

test('default/reset styling reproduces the original Gaussian attributes exactly', () => {
  const splat = coat(), snapshot = structuredClone(splat);
  assert.deepEqual(sanitizeReferenceFur(), {length: 1, curl: 0, groom: []});
  assert.deepEqual(deformReferenceSplat(splat), splat);
  const styled = deformReferenceSplat(splat, {length: 1.65, curl: 1});
  assert.notDeepEqual(styled.center, splat.center);
  assert.notDeepEqual(styled.scales, splat.scales);
  assert.notDeepEqual(styled.quaternion, splat.quaternion);
  assert.deepEqual(deformReferenceSplat(splat, sanitizeReferenceFur()), snapshot);
  assert.deepEqual(splat, snapshot, 'Styling must not rewrite the source input');
});

test('stable original DC color protects black eyes, beret and non-coat Gaussians', () => {
  const style = {length: 1.65, curl: 1};
  const eye = {...coat(), baseColor: [.015, .022, .03], color: [.02, .2, .8]};
  const hat = {...coat(), center: [0, -2.2, .2], baseColor: [.05, .07, .16]};
  for (const splat of [eye, hat]) {
    assert.equal(referenceFurMask(splat.center, splat.baseColor), 0);
    assert.deepEqual(deformReferenceSplat(splat, style), splat);
  }
  const differentView = {...coat(), color: [1.1, 1.2, 1.3]};
  assert.deepEqual(deformReferenceSplat(differentView, style).center, deformReferenceSplat(coat(), style).center);
  assert.equal(referenceFurMask([20, 0, 0], [.05, .3, .8]), 0);
});

test('length stretches surface microstructure rather than scaling the body or moving its pose', () => {
  const source = coat(), styled = deformReferenceSplat(source, {length: 1.65});
  assert.equal(styled.scales[0], source.scales[0]);
  assert.equal(styled.scales[2], source.scales[2]);
  assert.equal(styled.scales[1], source.scales[1] * 1.65);
  assert.ok(distance(styled.center, source.center) <= .012 * .65 + 1e-12);
  assert.equal(styled.opacity, source.opacity);
  assert.deepEqual(styled.color, source.color);
  assert.equal(styled.index, source.index);
});

test('sanitization clamps imported styles, keeps all voxel cells, rounds compactly and owns its arrays', () => {
  for (const value of [null, [], 0, 'hair']) assert.deepEqual(sanitizeReferenceFur(value), {length: 1, curl: 0, groom: []});
  const input = {length: 100, curl: -9, groom: [[-1, 1, 1, 1], [cells, 1, 0, 0], [7, 1e300, -1e300, 0],
    [8, .0123456789, -.00001234567, 0], [9, NaN, 0, 0]]};
  const clean = sanitizeReferenceFur(input);
  assert.equal(clean.length, 1.65); assert.equal(clean.curl, 0);
  assert.deepEqual(clean.groom.map(entry => entry[0]), [7, 8]);
  assert.ok(Math.hypot(...clean.groom[0].slice(1)) <= REFERENCE_GROOM_LIMIT);
  assert.deepEqual(clean.groom[1], [8, .01235, -.00001, 0]);
  clean.groom[1][1] = 1;
  assert.equal(input.groom[3][1], .0123456789);
  const full = sanitizeReferenceFur({groom: Array.from({length: cells}, (_, index) => [index, .09, -.09, .09])});
  assert.equal(full.groom.length, 1344);
  assert.deepEqual(sanitizeReferenceFur(full), full);
});

test('continuous brushing remains local, reversible and usable beyond a stamp count', () => {
  const source = coat(), initial = sanitizeReferenceFur();
  let style = paintReferenceGroom(initial, source.center, [.1, 0, 0]);
  assert.ok(style.groom.length > 0 && style.groom.length < 40);
  assert.ok(sampleReferenceGroom(style, source.center)[0] > 0);
  assert.deepEqual(sampleReferenceGroom(style, [-.9, -.7, -.7]), [0, 0, 0]);
  assert.ok(distance(deformReferenceSplat(source, style).center, source.center) > 0);
  const remote = {...source, center: [-.9, -.7, -.7]};
  assert.deepEqual(deformReferenceSplat(remote, style), remote);
  for (let i = 0; i < 1500; i++) style = paintReferenceGroom(style, source.center, [.003, .001, 0]);
  const after = paintReferenceGroom(style, source.center, [-.1, 0, 0]);
  assert.notDeepEqual(after.groom, style.groom, 'A later brush stroke remains usable');
  assert.ok(after.groom.every(entry => Math.hypot(...entry.slice(1)) <= REFERENCE_GROOM_LIMIT));
  assert.deepEqual(clearReferenceGroom(style), initial);
  assert.deepEqual(initial.groom, [], 'Painting must not mutate a saved recipe');
});

test('invalid and stationary brushes preserve existing styles', () => {
  const style = {length: 1.2, curl: .3, groom: [[100, .02, .03, 0]]}, clean = sanitizeReferenceFur(style);
  for (const [point, delta, radius, strength] of [
    [[NaN, 0, 0], [1, 0, 0], .24, 1], [[0, 0, 0], [0, 0, 0], .24, 1],
    [[0, 0, 0], [1, 0, 0], 0, 1], [[0, 0, 0], [1, 0, 0], .24, 0],
    [[50, 0, 0], [1, 0, 0], .24, 1]]) {
    assert.deepEqual(paintReferenceGroom(style, point, delta, radius, strength), clean);
  }
});

test('extreme styling keeps geometry finite, opacity intact and quaternion rotations normalized', () => {
  const groom = Array.from({length: cells}, (_, index) => [index, 1e200, -1e200, 1e200]);
  for (let i = 0; i < 100; i++) {
    const source = {...coat(), center: [Math.sin(i) * .8, -1 + Math.cos(i * .7) * .8, Math.cos(i) * .7]};
    const styled = deformReferenceSplat(source, {length: 1e200, curl: 1e200, groom});
    assert.ok([...styled.center, ...styled.scales, ...styled.quaternion].every(Number.isFinite));
    assert.ok(distance(styled.center, source.center) <= .012 * .65 + .018 * Math.sqrt(3) + .16 + 1e-10);
    assert.ok(Math.abs(Math.hypot(...styled.quaternion) - 1) < 1e-10);
    assert.equal(styled.opacity, source.opacity);
    assert.ok(styled.scales.every(n => n > 0));
  }
});

test('real Spark graph compiles DC masking, one 3D lookup, independent uniforms and ownership', () => {
  const source = new ExtSplats({maxSplats: 2048});
  source.pushSplat(new THREE.Vector3(.1, -.7, .75), new THREE.Vector3(.003, .009, .001),
    new THREE.Quaternion(), .72, new THREE.Color(.05, .3, .8));
  const calls = [], fetchSplat = source.fetchSplat.bind(source);
  source.fetchSplat = options => { calls.push(options); return fetchSplat(options); };
  const before = source.extArrays.map(array => array.slice());
  let dirty = 0;
  const first = createReferenceFurModifier({dyno, THREE, source, onDirty: () => dirty++});
  const second = createReferenceFurModifier({dyno, THREE, source});
  const graph = dyno.dynoBlock({index: 'int'}, {gsplat: dyno.Gsplat}, ({index}) =>
    first.modifier.apply({gsplat: source.fetchSplat({index})}));
  const template = new dyno.DynoProgramTemplate(`precision highp float;\n{{ GLOBALS }}\nvoid main() {\n{{ STATEMENTS }}\n}`);
  const program = new dyno.DynoProgram({graph, inputs: {index: '0'}, outputs: {gsplat: 'result'}, template});
  assert.ok(calls.length >= 2);
  assert.ok(calls.every(call => !Object.hasOwn(call, 'viewOrigin')));
  assert.ok(program.shader.includes('refFurMask'));
  assert.ok(program.shader.includes('.center +='));
  assert.ok(program.shader.includes('.scales *='));
  assert.equal((program.shader.match(/field = texture\(/g) ?? []).length, 1);
  const textures = Object.values(program.uniforms).map(u => u.value).filter(value => value instanceof THREE.Data3DTexture);
  assert.equal(textures.length, 1);
  const texture = textures[0], textureVersion = texture.version;
  assert.equal(texture.type, THREE.HalfFloatType);
  assert.equal(first.setStyle(), false);
  assert.equal(first.setStyle({length: 1.4, curl: .7, groom: [[100, .04, .01, 0]]}), true);
  assert.equal(dirty, 1);
  program.update();
  assert.ok(Object.values(program.uniforms).some(u => u.value === 1.4));
  assert.ok(Object.values(program.uniforms).some(u => u.value === .7));
  assert.ok(texture.version > textureVersion);
  assert.ok(texture.image.data.some(n => n !== 0));
  assert.equal(first.setStyle({length: 1.4, curl: .7, groom: [[100, .04, .01, 0]]}), false);
  assert.equal(second.setStyle(), false, 'The second instance still has original defaults');
  assert.equal(first.setStyle(), true);
  assert.ok(texture.image.data.every(n => n === 0));
  let disposals = 0; texture.addEventListener('dispose', () => disposals++);
  first.dispose(); first.dispose(); second.dispose();
  assert.equal(disposals, 1);
  assert.equal(first.setStyle({length: 1.5}), false);
  assert.deepEqual(source.extArrays, before, 'GPU styling leaves source arrays untouched');
  assert.equal(source.getNumSplats(), 1);
  source.dispose();
});
