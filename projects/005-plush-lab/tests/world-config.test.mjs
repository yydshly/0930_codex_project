import test from 'node:test';
import assert from 'node:assert/strict';
import {SHAPES, MATERIALS, ACTOR_ASSETS, HATS, OUTFITS, ACCESSORIES, SCENES, LIGHTING, PERSONALITIES, PALETTES,
  MAX_WORLD_TOKEN, defaultWorld, sanitizeWorld, generateWorld, encodeWorld, decodeWorld} from '../src/world-config.js';

const tokenFor = value => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const groups = {shape: ['shape'], material: ['material'], palette: ['furColor', 'accentColor', 'secondaryColor'],
  wardrobe: ['hat', 'outfit', 'accessory'], scene: ['scene', 'lighting'], personality: ['personality']};
const current = () => sanitizeWorld({version: 1, seed: 'before', name: '我的团熊 🧸', shape: 'bear', material: 'teddy',
  furColor: '#123456', accentColor: '#abcdef', secondaryColor: '#fedcba', hat: 'beanie', outfit: 'vest',
  accessory: 'glasses', scene: 'garden', lighting: 'moon', personality: 'curious'});

test('option catalogs have unique stable IDs and labels for every supported world field', () => {
  assert.deepEqual(SHAPES.map(row => row.id), ['pear', 'bean', 'triangle', 'heart', 'egg', 'bunny', 'bear', 'star']);
  assert.deepEqual(MATERIALS.map(row => row.id), ['cloud', 'velvet', 'teddy']);
  for (const rows of [SHAPES, MATERIALS, ACTOR_ASSETS, HATS, OUTFITS, ACCESSORIES, SCENES, LIGHTING, PERSONALITIES, PALETTES]) {
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
    for (const row of rows) {assert.equal(typeof row.id, 'string');assert.ok(row.label.trim());}
  }
  for (const palette of PALETTES) for (const key of groups.palette) assert.match(palette[key], /^#[a-f0-9]{6}$/);
});

test('default world is a fresh warm room with a soft bean and coordinated cream palette', () => {
  const world = defaultWorld();
  assert.equal(world.version, 1);assert.equal(world.seed, 'soft-001');
  assert.equal(world.scene, 'room');assert.equal(world.lighting, 'warm');
  assert.equal(world.shape, 'bean');assert.equal(world.material, 'cloud');
  assert.equal(world.hat, 'bow');assert.equal(world.outfit, 'scarf');
  for (const key of groups.palette) assert.equal(world[key], PALETTES[0][key]);
  assert.notStrictEqual(world, defaultWorld());world.name = 'temporary';assert.notEqual(defaultWorld().name, world.name);
  assert.equal(defaultWorld('　定制世界 🧸　').seed, '定制世界 🧸');
});

test('sanitization copies only whitelisted fields and defaults malformed or unsupported values', () => {
  const malicious = {version: 1, seed: Infinity, name: {}, shape: '<script>', material: 'plastic', scene: NaN,
    lighting: 'laser', personality: false, hat: ['bow'], outfit: undefined, accessory: {},
    furColor: 'javascript:bad', accentColor: '#aabbcc00', secondaryColor: '#fff', injected: true};
  assert.deepEqual(sanitizeWorld(malicious), defaultWorld());
  for (const input of [null, [], Infinity, 'world', {version: 2, shape: 'star'}, {version: 0}, {version: '1'}]) {
    assert.deepEqual(sanitizeWorld(input), defaultWorld());
  }
  const source = {shape: 'star', name: '星星', furColor: '#ABCDEF', extra: {private: 1}};
  const before = structuredClone(source), result = sanitizeWorld(source);
  assert.equal(result.shape, 'star');assert.equal(result.furColor, '#abcdef');assert.ok(!('extra' in result));
  assert.deepEqual(source, before);assert.notStrictEqual(result, source);
});

test('Unicode names and seeds are bounded by characters, control text is removed, manual ear hats remain allowed', () => {
  const world = sanitizeWorld({seed: '  ' + '🧸'.repeat(41) + '  ', name: '\u0000' + '兔'.repeat(23) + '🧸尾', shape: 'bunny', hat: 'beret'});
  assert.equal(Array.from(world.seed).length, 40);assert.equal(Array.from(world.name).length, 24);
  assert.equal(world.name, '兔'.repeat(23) + '🧸');assert.equal(world.hat, 'beret');
  assert.equal(sanitizeWorld({name: '\n\t  ', seed: '\u0000'}).name, defaultWorld().name);
  assert.equal(sanitizeWorld({name: '\n\t  ', seed: '\u0000'}).seed, defaultWorld().seed);
});

test('identical seeds produce identical complete worlds and multiple seeds give useful variety', () => {
  assert.deepEqual(generateWorld('花园 🧸'), generateWorld('花园 🧸'));
  const worlds = Array.from({length: 200}, (_, index) => generateWorld(`world-${index}`));
  assert.ok(new Set(worlds.map(world => world.shape)).size >= 6);
  assert.equal(new Set(worlds.map(world => world.scene)).size, 3);
  assert.equal(new Set(worlds.map(world => world.material)).size, 3);
  assert.equal(new Set(worlds.map(world => world.personality)).size, 3);
  for (const world of worlds) {
    assert.deepEqual(sanitizeWorld(world), world);
    assert.ok(PALETTES.some(palette => groups.palette.every(key => palette[key] === world[key])));
    if (['bunny', 'bear'].includes(world.shape)) assert.ok(!['beanie', 'beret'].includes(world.hat));
  }
});

test('each lock preserves every field of its group and does not mutate the current world', () => {
  const previous = Object.freeze(current()), before = JSON.stringify(previous);
  for (const [group, fields] of Object.entries(groups)) {
    const next = generateWorld('different', previous, {[group]: true});
    for (const field of fields) assert.equal(next[field], previous[field], `${group}.${field}`);
    assert.equal(next.name, previous.name);assert.equal(next.seed, 'different');
    assert.notStrictEqual(next, previous);
  }
  assert.equal(JSON.stringify(previous), before);
  const locks = Object.freeze(Object.fromEntries(Object.keys(groups).map(group => [group, true])));
  assert.deepEqual(generateWorld('all-locked', previous, locks), {...previous, seed: 'all-locked'});
});

test('locks require explicit Boolean true and no current world does not lock defaults', () => {
  const previous = current();
  assert.deepEqual(generateWorld('explicit', previous, {shape: 'true', material: 1, scene: false}), generateWorld('explicit', previous));
  const all = Object.fromEntries(Object.keys(groups).map(group => [group, true]));
  assert.deepEqual(generateWorld('no-current', null, all), generateWorld('no-current'));
  assert.deepEqual(generateWorld('invalid-locks', previous, null), generateWorld('invalid-locks', previous));
});

test('locked scene and personality guide new wardrobe choices while locked manual wardrobe takes priority', () => {
  const garden = sanitizeWorld({...current(), scene: 'garden', personality: 'curious'});
  const gallery = sanitizeWorld({...current(), scene: 'gallery', personality: 'curious'});
  for (let index = 0; index < 50; index++) {
    const a = generateWorld(`profile-${index}`, garden, {scene: true, personality: true, shape: true});
    const b = generateWorld(`profile-${index}`, gallery, {scene: true, personality: true, shape: true});
    assert.equal(a.accessory, 'satchel');assert.ok(['poncho', 'vest'].includes(a.outfit));
    assert.equal(b.outfit, 'vest');assert.ok(['glasses', 'satchel'].includes(b.accessory));
    assert.ok(!['beret', 'beanie'].includes(a.hat));assert.ok(!['beret', 'beanie'].includes(b.hat));
  }
  const manual = generateWorld('manual', garden, {shape: true, wardrobe: true});
  assert.equal(manual.shape, 'bear');assert.equal(manual.hat, 'beanie');
});

test('world share round-trip handles Chinese and emoji with browser-safe unpadded base64url', () => {
  const source = sanitizeWorld({...current(), seed: '世界 🧸 一', name: '花园里的团熊 🧸'});
  const token = encodeWorld(source);
  assert.match(token, /^[A-Za-z0-9_-]+$/);assert.ok(token.length <= MAX_WORLD_TOKEN);
  assert.deepEqual(decodeWorld(token), source);
  assert.deepEqual(decodeWorld(encodeWorld({...source, unknown: 'not exported', furColor: '#ABCDEF'})), {...source, furColor: '#abcdef'});
  assert.deepEqual(decodeWorld(tokenFor({version: 1, shape: 'invalid', outfit: Infinity, name: '世界'})), {...defaultWorld(), name: '世界'});
});

test('malformed, oversized, unsupported and noncanonical share tokens explicitly throw TypeError', () => {
  const invalid = [null, undefined, 4, '', 'a', 'abc=', 'ab+c', 'ab/c', 'abc\n', '!@#', 'x'.repeat(MAX_WORLD_TOKEN + 1),
    tokenFor(null), tokenFor([]), tokenFor({}), tokenFor({version: 2}), tokenFor('world'), btoa('{broken').replace(/=+$/, ''), '_w'];
  for (const token of invalid) assert.throws(() => decodeWorld(token), TypeError, String(token).slice(0, 80));
  const canonical = tokenFor({version: 1});
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  // An alternate final sextet with nonzero unused bits decodes to the same bytes.
  const index = alphabet.indexOf(canonical.at(-1));
  if (canonical.length % 4 !== 0) assert.throws(() => decodeWorld(canonical.slice(0, -1) + alphabet[index + 1]), TypeError);
});

test('legacy worlds retain their wardrobe, furniture and pose with a procedural actor', () => {
  const legacy = current();delete legacy.actorAsset;delete legacy.actorTint;delete legacy.actorScale;
  legacy.layout.room.push({id: 'cushion-legacy', type: 'cushion', x: -1.4, z: 1.4, rotation: 0, color: '#abcdef'});
  legacy.pose = {x: .8, z: .5, seatId: null};
  const restored = decodeWorld(tokenFor(legacy));
  assert.equal(restored.actorAsset, 'procedural');assert.equal(restored.actorTint, null);assert.equal(restored.actorScale, 1);
  for (const key of ['name', 'shape', 'material', 'hat', 'outfit', 'accessory', 'layout', 'pose']) assert.deepEqual(restored[key], legacy[key]);
});

test('reference actor choice, tint and size persist through sharing and scene generation', () => {
  const source = sanitizeWorld({...current(), actorAsset: 'reference-plush', actorTint: '#ABCDEF', actorScale: 1.2});
  assert.deepEqual(decodeWorld(encodeWorld(source)), source);
  for (let index = 0; index < 20; index++) {
    const generated = generateWorld(`reference-${index}`, source);
    for (const key of ['actorAsset', 'actorTint', 'actorScale']) assert.equal(generated[key], source[key]);
    assert.deepEqual(generated.layout, source.layout);
  }
  assert.equal(sanitizeWorld({...source, actorAsset: 'https://untrusted.example/model.sog'}).actorAsset, 'procedural');
});

test('reference adjustments reject malformed values and bound valid size without modifying input', () => {
  for (const actorTint of ['#abc', 'red', 'javascript:bad', {}, 0]) assert.equal(sanitizeWorld({actorTint}).actorTint, null);
  for (const actorScale of [NaN, Infinity, '1.2', {}, null]) assert.equal(sanitizeWorld({actorScale}).actorScale, 1);
  assert.equal(sanitizeWorld({actorScale: 20}).actorScale, 1.35);
  assert.equal(sanitizeWorld({actorScale: -2}).actorScale, .65);
  const input = {actorAsset: 'reference-plush', actorTint: '#AABBCC', actorScale: 1.1};
  const before = structuredClone(input);sanitizeWorld(input);assert.deepEqual(input, before);
});
