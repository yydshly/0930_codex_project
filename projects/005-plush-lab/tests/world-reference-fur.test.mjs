import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_WORLD_TOKEN, defaultWorld, sanitizeWorld, generateWorld, encodeWorld, decodeWorld} from '../src/world-config.js';

const tokenFor = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const groomedWorld = () => sanitizeWorld({version: 1, seed: 'groomed-reference', name: '梳过毛的星仔',
  actorAsset: 'reference-plush', actorTint: '#AABBCC', actorScale: 1.15,
  actorFur: {length: 1.35, curl: .62, groom: [[200, .02, .01, 0], [300, -.01, .02, .01]]}});

test('legacy world shares gain neutral reference fur without changing existing work', () => {
  const legacy = defaultWorld('old-world');delete legacy.actorFur;
  legacy.name = '保存的团熊';legacy.shape = 'bear';legacy.material = 'teddy';
  legacy.hat = 'beanie';legacy.outfit = 'vest';legacy.accessory = 'glasses';
  legacy.layout.room.push({id: 'cushion-old', type: 'cushion', x: -1.4, z: 1.4, rotation: 0, color: '#abcdef'});
  legacy.pose = {x: .8, z: .5, seatId: null};
  const before = structuredClone(legacy), restored = decodeWorld(tokenFor(legacy));
  assert.deepEqual(restored.actorFur, {length: 1, curl: 0, groom: []});
  for (const [key, value] of Object.entries(legacy)) assert.deepEqual(restored[key], value, key);
  assert.deepEqual(legacy, before);
});

test('every default world owns fresh reference fur and groom storage', () => {
  const first = defaultWorld(), second = defaultWorld();
  assert.deepEqual(first.actorFur, {length: 1, curl: 0, groom: []});
  assert.notStrictEqual(first.actorFur, second.actorFur);
  assert.notStrictEqual(first.actorFur.groom, second.actorFur.groom);
  first.actorFur.length = 1.5;first.actorFur.groom.push([200, .02, 0, 0]);
  assert.deepEqual(second.actorFur, {length: 1, curl: 0, groom: []});
  assert.deepEqual(defaultWorld().actorFur, second.actorFur);
});

test('world loading sanitizes reference fur bounds and rejects malformed state', () => {
  for (const actorFur of [null, [], 'long', 2, {length: Infinity, curl: NaN, groom: 'bad'}]) {
    assert.deepEqual(sanitizeWorld({actorFur}).actorFur, {length: 1, curl: 0, groom: []});
  }
  assert.deepEqual(sanitizeWorld({actorFur: {length: -4, curl: 5, groom: []}}).actorFur,
    {length: .65, curl: 1, groom: []});
  assert.deepEqual(sanitizeWorld({actorFur: {length: 8, curl: -2, groom: []}}).actorFur,
    {length: 1.65, curl: 0, groom: []});
  const input = {actorAsset: 'reference-plush', actorFur: {length: '1.2', curl: '.4', groom: [], injected: true}};
  const before = structuredClone(input), result = sanitizeWorld(input);
  assert.deepEqual(result.actorFur, {length: 1, curl: 0, groom: []});
  assert.deepEqual(input, before);
});

test('world sharing restores fur length, curl and persistent local comb changes', () => {
  const source = groomedWorld(), before = structuredClone(source);
  assert.equal(source.actorFur.groom.length, 2);
  const token = encodeWorld({...source, actorFur: {...source.actorFur, privateDetail: 'discard'}});
  const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  assert.deepEqual(payload.actorFur, source.actorFur);
  assert.deepEqual(decodeWorld(token), source);
  assert.deepEqual(source, before);
  const restored = decodeWorld(token);restored.actorFur.groom[0][1] = .1;
  assert.deepEqual(source, before);
});

test('a fully combed reference fur field remains shareable without discarding cells', () => {
  const precise = -.000012345678901234567;
  const groom = Array.from({length: 12 * 14 * 8}, (_, cell) => [cell, precise, precise, precise]);
  const source = sanitizeWorld({actorAsset: 'reference-plush', actorFur: {length: 1.65, curl: 1, groom}});
  assert.equal(source.actorFur.groom.length, groom.length);
  const token = encodeWorld(source);
  assert.ok(token.length > 16384);assert.ok(token.length <= MAX_WORLD_TOKEN);
  assert.deepEqual(decodeWorld(token), source);
});

test('random worlds preserve reference fur and comb work across scene and character changes', () => {
  const source = groomedWorld(), before = structuredClone(source), scenes = new Set(), shapes = new Set();
  for (let index = 0; index < 50; index++) {
    const generated = generateWorld(`combed-world-${index}`, source);
    for (const key of ['actorAsset', 'actorTint', 'actorScale', 'actorFur']) assert.deepEqual(generated[key], source[key], key);
    assert.deepEqual(generated.layout, source.layout);
    assert.notStrictEqual(generated.actorFur, source.actorFur);
    assert.notStrictEqual(generated.actorFur.groom, source.actorFur.groom);
    scenes.add(generated.scene);shapes.add(generated.shape);
  }
  assert.equal(scenes.size, 3);assert.ok(shapes.size > 1);
  assert.deepEqual(source, before);
});

test('sanitized and generated worlds have independent comb tuples', () => {
  const source = groomedWorld(), before = structuredClone(source);
  const copied = sanitizeWorld(source), generated = generateWorld('independent-comb', source);
  for (const result of [copied, generated]) {
    assert.notStrictEqual(result.actorFur.groom[0], source.actorFur.groom[0]);
    result.actorFur.length = .8;result.actorFur.groom[0][1] = .12;
    result.actorFur.groom.push([400, .01, 0, 0]);
  }
  assert.deepEqual(source, before);
  assert.deepEqual(generateWorld('independent-comb', source).actorFur, before.actorFur);
});
