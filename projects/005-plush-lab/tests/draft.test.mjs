import test from 'node:test';
import assert from 'node:assert/strict';
import {DRAFT_KEY, MAX_DRAFT_LENGTH, readDraft, saveDraft, clearDraft, chooseStartupRecipe} from '../src/draft.js';
import {COLLECTION_KEY, MAX_RECIPE_TOKEN_LENGTH, sanitizeRecipe, encodeRecipe} from '../src/recipes.js';
import {MAX_LOCAL_STAMPS} from '../src/local-coat-field.js';
import {encodeLocalSnapshot, MAX_COAT_SNAPSHOT_LENGTH} from '../src/local-coat-snapshot.js';

const now = 1790830000123;
const recipe = overrides => sanitizeRecipe({name: '莓果奶油 🧸', character: 2, ...overrides});
function denseCoatSnapshot() {
  const data = new Float32Array(128 * 64 * 4), colors = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    data.set([.5, .25, .5, 1], i);colors.set([.2, .3, .4, 1], i);
  }
  return encodeLocalSnapshot(data, colors);
}
function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  let writes = 0, removes = 0;
  return {
    getItem(key) {return values.has(key) ? values.get(key) : null;},
    setItem(key, value) {values.set(key, value);writes++;},
    removeItem(key) {values.delete(key);removes++;},
    get writes() {return writes;}, get removes() {return removes;},
  };
}
const storedDraft = (overrides = {}) => JSON.stringify({version: 1, recipe: recipe(), savedAt: now, baseToken: '', ...overrides});

test('drafts round-trip Chinese names, local edits and their original shared token', () => {
  const storage = memoryStorage();
  const source = recipe({name: '局部修剪的奶油 🍓', experiment: {groomDynamics: true, edits: [
    {kind: 'trim', uv: [.25, .5], point: [0, 0, .8], radius: .24, value: .08, color: '#b66b8c'},
    {kind: 'dye', uv: [.3, .5], point: [.1, 0, .8], radius: .24, value: .8, color: '#aabbcc'},
  ]}});
  const baseToken = encodeRecipe(recipe({name: '原来的分享'}));
  assert.equal(saveDraft(storage, {recipe: source, baseToken}, now), now);
  assert.deepEqual(readDraft(storage), {recipe: source, savedAt: now, baseToken});
  const serialized = JSON.parse(storage.getItem(DRAFT_KEY));
  assert.equal(serialized.version, 1);
});

test('saving and clearing a draft leave all named collection entries untouched', () => {
  const collection = '[{"version":1,"name":"已收藏作品"}]';
  const storage = memoryStorage({[COLLECTION_KEY]: collection});
  assert.notEqual(DRAFT_KEY, COLLECTION_KEY);
  assert.equal(saveDraft(storage, {recipe: recipe(), baseToken: ''}, now), now);
  assert.equal(clearDraft(storage), true);
  assert.equal(readDraft(storage), null);
  assert.equal(storage.getItem(COLLECTION_KEY), collection);
});

test('bad data, old schemas and oversized stored drafts are ignored without rewriting or deleting', () => {
  const bad = [null, '', '{', 'null', '[]', '{}', storedDraft({version: 0}), storedDraft({version: 2}),
    storedDraft({recipe: {version: 0}}), storedDraft({recipe: {version: 2}}), storedDraft({recipe: null}),
    'x'.repeat(MAX_DRAFT_LENGTH + 1)];
  for (const raw of bad) {
    const storage = memoryStorage({[DRAFT_KEY]: raw});
    assert.equal(readDraft(storage), null);
    assert.equal(storage.getItem(DRAFT_KEY), raw);
    assert.equal(storage.writes, 0);
    assert.equal(storage.removes, 0);
  }
});

test('timestamp and token validation reject invalid saves without overwriting a previous draft', () => {
  const original = storedDraft();
  const badTimes = [-1, NaN, Infinity, 1.5, 8.64e15 + 1, '1790830000123'];
  const badTokens = [null, undefined, 4, 'a+b', 'a/b', 'a=', 'a b', '奶油', 'a'.repeat(MAX_RECIPE_TOKEN_LENGTH + 1)];
  for (const time of badTimes) {
    const storage = memoryStorage({[DRAFT_KEY]: original});
    assert.equal(saveDraft(storage, {recipe: recipe(), baseToken: ''}, time), false);
    assert.equal(storage.getItem(DRAFT_KEY), original);
    assert.equal(readDraft(memoryStorage({[DRAFT_KEY]: storedDraft({savedAt: time})})), null);
  }
  for (const baseToken of badTokens) {
    const storage = memoryStorage({[DRAFT_KEY]: original});
    assert.equal(saveDraft(storage, {recipe: recipe(), baseToken}, now), false);
    assert.equal(storage.getItem(DRAFT_KEY), original);
    assert.equal(readDraft(memoryStorage({[DRAFT_KEY]: storedDraft({baseToken})})), null);
  }
  for (const invalid of [null, [], {}, {recipe: null, baseToken: ''}, {recipe: {version: 2}, baseToken: ''}]) {
    const storage = memoryStorage({[DRAFT_KEY]: original});
    assert.equal(saveDraft(storage, invalid, now), false);
    assert.equal(storage.getItem(DRAFT_KEY), original);
  }
});

test('zero and the last representable Date timestamp are returned exactly instead of conflated with false', () => {
  for (const savedAt of [0, 8.64e15]) {
    const storage = memoryStorage();
    assert.equal(saveDraft(storage, {recipe: recipe(), baseToken: ''}, savedAt), savedAt);
    assert.equal(readDraft(storage).savedAt, savedAt);
  }
});

test('quota and security failures report failure without throwing at startup or clearing', () => {
  const failing = {
    getItem() {throw new Error('SecurityError');},
    setItem() {throw new Error('QuotaExceededError');},
    removeItem() {throw new Error('SecurityError');},
  };
  for (const storage of [failing, null, {}]) {
    assert.equal(readDraft(storage), null);
    assert.equal(saveDraft(storage, {recipe: recipe(), baseToken: ''}, now), false);
    assert.equal(clearDraft(storage), false);
  }
});

test('legacy version-one recipes receive new defaults when safely restored from a draft', () => {
  const old = {version: 1, name: '旧版奶油', character: 2, params: {length: .09}};
  const restored = readDraft(memoryStorage({[DRAFT_KEY]: storedDraft({recipe: old})}));
  assert.equal(restored.recipe.name, '旧版奶油');
  assert.deepEqual(restored.recipe.experiment.edits, []);
  assert.equal(restored.recipe.experiment.collision, false);
  assert.equal(restored.recipe.experiment.groomDynamics, false);
});

test('different shared links win over an older draft even when the draft was saved recently', () => {
  const first = recipe({name: '原分享'}), second = recipe({name: '新分享', character: 1});
  const draft = {recipe: recipe({name: '原分享的修改'}), savedAt: now, baseToken: encodeRecipe(first)};
  const chosen = chooseStartupRecipe({sharedRecipe: second, sharedToken: encodeRecipe(second), draft});
  assert.deepEqual(chosen, {recipe: second, source: 'shared'});
});

test('refreshing the same shared link restores local edits instead of replacing them with link contents', () => {
  const original = recipe({name: '原分享'}), sharedToken = encodeRecipe(original);
  const edited = recipe({name: '未分享的修剪', params: {length: .25}, experiment: {edits: [
    {kind: 'trim', uv: [.25, .5], point: [0, 0, .8], radius: .24, value: .08, color: '#ffffff'},
  ]}});
  const draft = {recipe: edited, savedAt: now, baseToken: sharedToken};
  assert.deepEqual(chooseStartupRecipe({sharedRecipe: original, sharedToken, draft}), {recipe: edited, source: 'draft'});
  assert.equal(original.name, '原分享');
});

test('a normal entry or a malformed link can still restore a valid draft', () => {
  const draft = {recipe: recipe(), savedAt: now, baseToken: encodeRecipe(recipe({name: '此前链接'}))};
  assert.deepEqual(chooseStartupRecipe({draft}), {recipe: draft.recipe, source: 'draft'});
  assert.deepEqual(chooseStartupRecipe({sharedRecipe: null, sharedToken: '%%%invalid', draft}), {recipe: draft.recipe, source: 'draft'});
  assert.deepEqual(chooseStartupRecipe({sharedRecipe: {version: 2}, sharedToken: 'valid_shape', draft}), {recipe: draft.recipe, source: 'draft'});
  assert.deepEqual(chooseStartupRecipe(), {recipe: null, source: 'default'});
  assert.deepEqual(chooseStartupRecipe({draft: {...draft, savedAt: -1}}), {recipe: null, source: 'default'});
  assert.deepEqual(chooseStartupRecipe({sharedRecipe: recipe(), sharedToken: encodeRecipe(recipe())}), {recipe: recipe(), source: 'shared'});
});

test('stored-length and base-token boundaries are accepted at their limit and rejected above it', () => {
  const raw = storedDraft();
  const atLimit = raw + ' '.repeat(MAX_DRAFT_LENGTH - raw.length);
  assert.equal(readDraft(memoryStorage({[DRAFT_KEY]: atLimit})).recipe.name, '莓果奶油 🧸');
  assert.equal(readDraft(memoryStorage({[DRAFT_KEY]: atLimit + ' '})), null);
  const storage = memoryStorage();
  const baseToken = 'a'.repeat(MAX_RECIPE_TOKEN_LENGTH);
  assert.equal(saveDraft(storage, {recipe: recipe(), baseToken}, now), now);
  assert.equal(readDraft(storage).baseToken.length, MAX_RECIPE_TOKEN_LENGTH);
});

test('a dense checkpoint, 512 restore strokes and maximum shared base token fit the draft bound', () => {
  const coat=denseCoatSnapshot();
  const edits = Array.from({length: MAX_LOCAL_STAMPS}, () => ({kind: 'restore', target: 'length', uv: [.9876, .8765],
    point: [-2.4567, -2.3456, -2.2345], radius: .5678, value: .8765, color: '#ffffff'}));
  const large = recipe({name: '🧸'.repeat(24), id: 'r'.repeat(64),
    params: {shortPile: false, length: .12345678901234568, thickness: .0031234567890123456,
      curl: 1.2345678901234566e-200, gravity: 1.2345678901234566e-200, mess: 1.2345678901234566e-200,
      brightness: .6123456789012346, stiffness: .12345678901234568, roughness: .22345678901234567,
      groom: 1.2345678901234566e-200, wetness: 1.2345678901234566e-200},
    experiment: {coat, edits, field: Array.from({length: 32}, () => [-.7654, -.8765, -.9876])}});
  const baseToken = 'a'.repeat(MAX_RECIPE_TOKEN_LENGTH);
  const storage = memoryStorage();
  const serializedLength = JSON.stringify({version: 1, recipe: large, savedAt: now, baseToken}).length;
  assert.equal(MAX_LOCAL_STAMPS, 512);
  assert.equal(MAX_RECIPE_TOKEN_LENGTH, 524288);
  assert.equal(large.experiment.edits.length, 512);
  assert.equal(large.experiment.coat.length, MAX_COAT_SNAPSHOT_LENGTH);
  assert.ok(large.experiment.edits.every(stamp => stamp.target === 'length'));
  assert.ok(serializedLength > 280000, 'the baked draft exceeds the previous draft storage bound');
  assert.ok(serializedLength <= MAX_DRAFT_LENGTH);
  assert.equal(saveDraft(storage, {recipe: large, baseToken}, now), now);
  assert.deepEqual(readDraft(storage), {recipe: large, savedAt: now, baseToken});
});

test('same-link startup retains a baked base and recent edits while a different link replaces both',()=>{
  const original=recipe({name:'来源分享'}),sharedToken=encodeRecipe(original);
  const edited=recipe({name:'压缩后的草稿',experiment:{coat:denseCoatSnapshot(),edits:[{
    kind:'restore',target:'length',uv:[.25,.5],point:[0,0,.74],radius:.25,value:.6,color:'#ffffff',
  }]}});
  const storage=memoryStorage();assert.equal(saveDraft(storage,{recipe:edited,baseToken:sharedToken},now),now);
  const draft=readDraft(storage);
  assert.deepEqual(chooseStartupRecipe({sharedRecipe:original,sharedToken,draft}),{recipe:edited,source:'draft'});
  const newShared=recipe({name:'另一份分享'});
  assert.deepEqual(chooseStartupRecipe({sharedRecipe:newShared,sharedToken:encodeRecipe(newShared),draft}),{recipe:newShared,source:'shared'});
});

test('old 256-stroke drafts and their 65536-character base tokens remain readable unchanged', () => {
  const old = recipe({name: '旧草稿', experiment: {edits: Array.from({length: 256}, () => ({
    kind: 'restore', target: 'length', uv: [.9876, .8765], point: [-2.4567, -2.3456, -2.2345],
    radius: .5678, value: .8765, color: '#ffffff',
  }))}});
  const baseToken = 'a'.repeat(65536), raw = storedDraft({recipe: old, baseToken});
  assert.ok(raw.length <= 140000);
  const storage = memoryStorage({[DRAFT_KEY]: raw});
  assert.deepEqual(readDraft(storage), {recipe: old, savedAt: now, baseToken});
  assert.equal(storage.writes, 0);
});

test('unsupported renderer fields are removed and input objects stay unchanged', () => {
  const input = {name: '不变', params: {length: 999, shader: 'ignored'}, experiment: {shader: 'ignored'}};
  const before = structuredClone(input), storage = memoryStorage();
  assert.equal(saveDraft(storage, {recipe: input, baseToken: ''}, now), now);
  const restored = readDraft(storage);
  assert.equal(restored.recipe.params.length, .32);
  assert.ok(!('shader' in restored.recipe.params));
  assert.ok(!('shader' in restored.recipe.experiment));
  assert.deepEqual(input, before);
});
