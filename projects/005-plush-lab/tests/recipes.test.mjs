import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECTION_KEY, MAX_RECIPES, MAX_RECIPE_TOKEN_LENGTH, MAX_COLLECTION_LENGTH, sanitizeRecipe, encodeRecipe, decodeRecipe, readCollection, saveCollection} from '../src/recipes.js';
import {MAX_LOCAL_STAMPS} from '../src/local-coat-field.js';
import {encodeLocalSnapshot, MAX_COAT_SNAPSHOT_LENGTH} from '../src/local-coat-snapshot.js';

const defaultExperiment={mode:'off',clump:.65,shadow:.45,field:[],coat:'',edits:[],collision:false,groomDynamics:false};

function coatSnapshot(dense = true) {
  const data = new Float32Array(128 * 64 * 4), colors = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    data.set(dense ? [.5, .25, .5, 1] : [1, 0, 0, 1], i);
    colors.set(dense ? [.2, .3, .4, 1] : [0, 0, 0, 1], i);
  }
  return encodeLocalSnapshot(data, colors);
}

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem(key) { assert.equal(key, COLLECTION_KEY); return value; },
    setItem(key, next) { assert.equal(key, COLLECTION_KEY); value = next; },
  };
}

test('sharing round-trips Chinese names and every supported appearance setting', () => {
  const recipe = sanitizeRecipe({
    name: '抹茶的小午后 🧸', character: 1, color: '#8BAD6F',
    params: {shortPile: false, length: .28, density: 80, thickness: .004, curl: .7, gravity: .8, mess: .2, brightness: 1.3, stiffness: .25, roughness: .75, groom: .6, wetness: .4},
    light: 'warm', backdrop: 'sage', yaw: -1.2, pitch: .2, faceGuard: true,
    id: 'recipe_1690000000', createdAt: 1690000000000,
  });
  const token = encodeRecipe(recipe);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  const decoded = decodeRecipe(token);
  assert.equal(decoded.name, recipe.name);
  assert.deepEqual(decoded.params, recipe.params);
  assert.equal(decoded.color, '#8bad6f');
  assert.equal(decoded.id, recipe.id);
  assert.equal(decoded.createdAt, recipe.createdAt);
  assert.ok(Math.abs(decoded.yaw - recipe.yaw) < 1e-12);
  assert.deepEqual({...decoded, yaw: 0}, {...recipe, yaw: 0});
});

test('untrusted numeric settings are finite, bounded, and cannot add renderer fields', () => {
  const recipe = sanitizeRecipe({
    version: 99, name: '  测试\u0000名字  ', character: 99, color: 'url(javascript:alert(1))',
    params: {length: 100, density: -10, thickness: Infinity, curl: NaN, gravity: '0.3', mess: -8, brightness: 30, stiffness: -.5, roughness: 0, groom: -4, wetness: 8, shortPile: 'false', shaderCode: 'malicious'},
    light: 'invalid', backdrop: 'invalid', yaw: Infinity, pitch: 100, faceGuard: 'true', script: 'malicious', id: '../escape', createdAt: Infinity,
  });
  assert.equal(recipe.version, 1);
  assert.equal(recipe.name, '测试名字');
  assert.equal(recipe.character, 7);
  assert.equal(recipe.color, '#e8b759');
  assert.deepEqual(recipe.params, {shortPile: true, length: .32, density: 25, thickness: .0026, curl: .35, gravity: .25, mess: 0, brightness: 1.4, stiffness: .1, roughness: .2, groom: 0, wetness: 1});
  assert.equal(recipe.pitch, .5);
  assert.equal(recipe.yaw, 0);
  assert.equal(recipe.faceGuard, false);
  assert.equal(recipe.light, 'day');
  assert.equal(recipe.backdrop, 'cream');
  assert.ok(!('script' in recipe));
  assert.ok(!('id' in recipe));
  assert.ok(!('createdAt' in recipe));
});

test('new characters keep their identity and default colors through sharing', () => {
  for (const [character, color] of [[5, '#f0d9d2'], [6, '#ba8f6d'], [7, '#e8b759']]) {
    const recipe = sanitizeRecipe({character, name: `新伙伴 ${character}`, params: {groom: .8, wetness: .3}});
    assert.equal(recipe.character, character);
    assert.equal(recipe.color, color);
    assert.deepEqual(decodeRecipe(encodeRecipe(recipe)), recipe);
  }
});

test('old version-one recipes default to dry unstyled fur when new fields are missing', () => {
  const oldRecipe = {version: 1, character: 2, params: {length: .09, curl: .35}};
  const token = btoa(JSON.stringify(oldRecipe)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  for (const recipe of [sanitizeRecipe(oldRecipe), decodeRecipe(token), ...readCollection(memoryStorage(JSON.stringify([oldRecipe])))]) {
    assert.equal(recipe.params.groom, 0);
    assert.equal(recipe.params.wetness, 0);
    assert.equal(recipe.params.length, .09);
    assert.deepEqual(recipe.experiment, defaultExperiment);
  }
});

test('all experiment modes and local guide fields survive recipe links independently of appearance parameters', () => {
  const field = Array.from({length: 32}, (_, i) => [.123456789, -.234567891, i / 32]);
  for (const mode of ['off', 'shell', 'bundles', 'ftl']) {
    const source = {name: '实验小伙伴', params: {length: .13, groom: .6, experiment: 'ignored'}, experiment: {mode, clump: .7654321, shadow: .3456789, field}};
    const recipe = sanitizeRecipe(source);
    assert.equal(recipe.experiment.mode, mode);
    assert.equal(recipe.experiment.clump, .7654);
    assert.equal(recipe.experiment.shadow, .3457);
    assert.deepEqual(recipe.experiment.field[0], [.1235, -.2346, 0]);
    assert.equal(recipe.experiment.field.length, 32);
    assert.equal(recipe.params.length, .13);
    assert.equal(recipe.params.groom, .6);
    assert.ok(!('experiment' in recipe.params));
    assert.deepEqual(decodeRecipe(encodeRecipe(recipe)), recipe);
    assert.equal(field[0][0], .123456789);
  }
});

test('experiment defaults, modes and scalar controls reject untrusted values', () => {
  for (const input of [undefined, null, [], 'shell', {mode: 'shader-code'}]) {
    assert.deepEqual(sanitizeRecipe({experiment: input}).experiment, defaultExperiment);
  }
  for (const value of [NaN, Infinity, -Infinity, null, '1', {}]) {
    const recipe = sanitizeRecipe({experiment: {clump: value, shadow: value}});
    assert.equal(recipe.experiment.clump, .65);
    assert.equal(recipe.experiment.shadow, .45);
  }
  const recipe = sanitizeRecipe({experiment: {mode: 'shell', clump: -5, shadow: 20, shaderCode: 'ignored'}});
  assert.deepEqual(recipe.experiment, {...defaultExperiment,mode:'shell',clump:0,shadow:1});
});

test('guide fields require exactly 32 three-component arrays and discard oversized structures', () => {
  const valid = Array.from({length: 32}, () => [0, 0, 0]);
  const invalidFields = [undefined, null, 'field', {}, [], valid.slice(1), [...valid, [0, 0, 0]], Array(100000).fill([0, 0, 0])];
  for (const invalidVector of [null, {}, 'vector', [0, 0], [0, 0, 0, 0], Array(100000).fill(0)]) {
    invalidFields.push(valid.map((vector, i) => i === 12 ? invalidVector : vector));
  }
  for (const field of invalidFields) {
    assert.deepEqual(sanitizeRecipe({experiment: {field}}).experiment.field, []);
  }
});

test('guide vectors clear nonfinite components, limit vector magnitude and remain bounded after rounding', () => {
  const field = Array.from({length: 32}, () => [3, 4, 0]);
  field[0] = [NaN, Infinity, -Infinity];
  field[1] = ['1', null, undefined];
  field[2] = [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE];
  field[3] = [.123456789, -.00001, -.23456789];
  for (let i = 4; i < 32; i++) field[i] = [Math.sin(i) * 3, Math.cos(i) * 3, .333333];
  const clean = sanitizeRecipe({experiment: {field}}).experiment.field;
  assert.deepEqual(clean[0], [0, 0, 0]);
  assert.deepEqual(clean[1], [0, 0, 0]);
  assert.deepEqual(clean[3], [.1235, 0, -.2346]);
  for (const vector of clean) {
    assert.ok(vector.every(Number.isFinite));
    assert.ok(Math.hypot(...vector) <= 1.5);
    for (const value of vector) assert.ok(Math.abs(value * 10000 - Math.round(value * 10000)) < 1e-8);
  }
  assert.deepEqual(sanitizeRecipe({experiment: {field: clean}}).experiment.field, clean);
});

test('Unicode recipes with all 32 guide vectors fit the existing share-token limit', () => {
  const recipe = sanitizeRecipe({
    name: '🧸'.repeat(24), character: 7, id: 'r'.repeat(64), createdAt: 8.64e15,
    params: {shortPile: false, length: .123456789, groom: .87654321, wetness: .98765432},
    experiment: {mode: 'ftl', clump: .87654321, shadow: .987654321, field: Array.from({length: 32}, (_, i) => [-.7654321, .8765432, -i / 32])},
  });
  const token = encodeRecipe(recipe);
  assert.ok(token.length <= MAX_RECIPE_TOKEN_LENGTH, `Token length ${token.length} exceeds the share limit`);
  assert.deepEqual(decodeRecipe(token), recipe);
});

test('experiment state round-trips through collections while old items preserve the original renderer', () => {
  const storage = memoryStorage();
  const recipes = ['off', 'shell', 'bundles', 'ftl'].map(mode => ({
    name: `实验 ${mode}`, id: `experiment-${mode}`,
    experiment: {mode, clump: .8, shadow: .2, field: Array.from({length: 32}, () => [.25, -.5, .125])},
  }));
  recipes.push({version: 1, name: '旧收藏', id: 'old-recipe'});
  assert.equal(saveCollection(storage, recipes), true);
  assert.deepEqual(readCollection(storage), recipes.map(sanitizeRecipe));
  assert.deepEqual(readCollection(storage).at(-1).experiment, defaultExperiment);
});

test('styling and wetness reject nonfinite values and clamp numeric amounts', () => {
  for (const value of [NaN, Infinity, -Infinity, '1', null]) {
    const recipe = sanitizeRecipe({params: {groom: value, wetness: value}});
    assert.equal(recipe.params.groom, 0);
    assert.equal(recipe.params.wetness, 0);
  }
  const recipe = sanitizeRecipe({character: -5, params: {groom: 5, wetness: -2}});
  assert.equal(recipe.character, 0);
  assert.equal(recipe.params.groom, 1);
  assert.equal(recipe.params.wetness, 0);
});

test('names are bounded by Unicode characters and empty names get a usable default', () => {
  assert.equal(Array.from(sanitizeRecipe({name: '🧸'.repeat(40)}).name).length, 24);
  assert.equal(sanitizeRecipe({name: '\n\u0000  '}).name, '我的毛绒');
  assert.equal(sanitizeRecipe(null).character, 2);
  assert.equal(sanitizeRecipe([]).color, '#ebc656');
});

test('orientation wraps safely while preserving equivalent rotations', () => {
  for (const yaw of [-100, -Math.PI, 0, Math.PI, 200]) {
    const result = sanitizeRecipe({yaw}).yaw;
    assert.ok(result >= -Math.PI && result < Math.PI);
    assert.ok(Math.abs(Math.sin(result) - Math.sin(yaw)) < 1e-12);
    assert.ok(Math.abs(Math.cos(result) - Math.cos(yaw)) < 1e-12);
  }
  assert.equal(sanitizeRecipe({pitch: -5}).pitch, -.5);
});

test('malformed, oversized, non-object, unsupported-version, and invalid UTF-8 tokens are rejected', () => {
  const toToken = value => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  for (const token of [null, '', 'a', '%%%', 'a'.repeat(MAX_RECIPE_TOKEN_LENGTH+1), toToken('not json'), toToken('[]'), toToken('null'), toToken('{"version":2}'), '_w']) {
    assert.equal(decodeRecipe(token), null);
  }
});

test('a shared malicious payload is sanitized rather than trusted', () => {
  const token = btoa('{"version":1,"character":-5,"params":{"length":10000,"density":10000},"__proto__":{"polluted":true}}')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const recipe = decodeRecipe(token);
  assert.equal(recipe.character, 0);
  assert.equal(recipe.params.length, .32);
  assert.equal(recipe.params.density, 120);
  assert.equal({}.polluted, undefined);
  assert.ok(!Object.hasOwn(recipe, '__proto__'));
});

test('collection saves preserve identities and times without mutating source objects', () => {
  const storage = memoryStorage();
  const source = {name: '我的奶油', character: 2, params: {density: 999}, id: 'cream-1', createdAt: 1700000000000};
  assert.equal(saveCollection(storage, [source]), true);
  const [saved] = readCollection(storage);
  assert.equal(saved.name, source.name);
  assert.equal(saved.id, source.id);
  assert.equal(saved.createdAt, source.createdAt);
  assert.equal(saved.params.density, 120);
  assert.equal(source.params.density, 999);
});

test('collection size stays bounded and malformed stored entries are skipped', () => {
  const storage = memoryStorage();
  assert.equal(saveCollection(storage, Array.from({length: 20}, (_, i) => ({name: `作品 ${i}`, id: `id-${i}`}))), true);
  assert.equal(readCollection(storage).length, MAX_RECIPES);
  assert.equal(readCollection(storage).at(-1).id, 'id-11');
  const partiallyValid = memoryStorage(JSON.stringify([null, 9, [], {version: 2}, {version: 1, name: '保留'}]));
  assert.equal(readCollection(partiallyValid).length, 1);
  assert.equal(readCollection(partiallyValid)[0].name, '保留');
});

test('corrupt or inaccessible storage does not break startup and write failures are reported', () => {
  for (const initial of [null, '{', '{}', 'null', '"text"', 'x'.repeat(MAX_COLLECTION_LENGTH+1)]) assert.deepEqual(readCollection(memoryStorage(initial)), []);
  const failingStorage = {getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); }};
  assert.deepEqual(readCollection(failingStorage), []);
  assert.equal(saveCollection(failingStorage, [{}]), false);
  assert.equal(saveCollection(memoryStorage(), null), false);
  assert.equal(saveCollection(null, [{}]), false);
});

test('local edits and optional contact/groom dynamics are explicit and survive sharing',()=>{
  const stamp={kind:'dye',uv:[.25,.5],point:[0,0,.74],radius:.25,value:.8,color:'#AABBCC'};
  const recipe=sanitizeRecipe({experiment:{mode:'ftl',edits:[stamp],collision:true,groomDynamics:true}});
  assert.equal(recipe.experiment.collision,true);assert.equal(recipe.experiment.groomDynamics,true);
  assert.equal(recipe.experiment.edits[0].color,'#aabbcc');assert.deepEqual(decodeRecipe(encodeRecipe(recipe)),recipe);
  assert.equal(sanitizeRecipe({experiment:{collision:'true',groomDynamics:1}}).experiment.collision,false);
  assert.equal(sanitizeRecipe({experiment:{collision:'true',groomDynamics:1}}).experiment.groomDynamics,false);
  assert.equal(stamp.color,'#AABBCC');
});

test('local restore targets round-trip through links and collections alongside unchanged legacy edits',()=>{
  const base={uv:[.25,.5],point:[0,0,.74],radius:.25,value:.8,color:'#AABBCC'};
  const legacy=['trim','dye','curl'].map(kind=>({...base,kind}));
  const restore=['length','color','curl','all'].map(target=>({...base,kind:'restore',target}));
  const recipe=sanitizeRecipe({version:1,name:'局部恢复',experiment:{edits:[...legacy,...restore,{...base,kind:'restore',target:'invalid',value:undefined}]}});
  assert.equal(recipe.version,1);
  for(let i=0;i<legacy.length;i++)assert.deepEqual(recipe.experiment.edits[i],{...legacy[i],color:'#aabbcc'});
  for(let i=0;i<restore.length;i++)assert.equal(recipe.experiment.edits[i+legacy.length].target,restore[i].target);
  assert.equal(recipe.experiment.edits.at(-1).target,'all');assert.equal(recipe.experiment.edits.at(-1).value,1);
  assert.deepEqual(decodeRecipe(encodeRecipe(recipe)),recipe);
  const storage=memoryStorage();assert.equal(saveCollection(storage,[recipe]),true);
  assert.deepEqual(readCollection(storage),[recipe]);
  assert.equal(restore[0].color,'#AABBCC','source edits remain unchanged');
  const beforeRestore=sanitizeRecipe({...recipe,experiment:{...recipe.experiment,edits:recipe.experiment.edits.slice(0,legacy.length)}});
  assert.deepEqual(decodeRecipe(encodeRecipe(beforeRestore)).experiment.edits,recipe.experiment.edits.slice(0,legacy.length),'undo history can still be shared in the legacy edit format');
});

test('a dense baked coat plus 512 recent edits, guide field and Unicode name fits links and twelve collections',()=>{
  const coat = coatSnapshot();
  assert.equal(coat.length,MAX_COAT_SNAPSHOT_LENGTH);
  const recipe=sanitizeRecipe({
    name:'绒'+'🧸'.repeat(23),character:7,id:'r'.repeat(64),createdAt:8.64e15,
    params:{shortPile:false,length:.12345678901234568,density:120,thickness:.0031234567890123456,curl:1.2345678901234566e-200,gravity:1.2345678901234566e-200,mess:1.2345678901234566e-200,brightness:.6123456789012346,stiffness:.12345678901234568,roughness:.22345678901234567,groom:1.2345678901234566e-200,wetness:1.2345678901234566e-200},
    light:'night',backdrop:'cream',pitch:-.12345678901234568,yaw:-2.1234567890123456,
    experiment:{mode:'bundles',clump:.87654321,shadow:.98765432,collision:false,groomDynamics:false,coat,
      field:Array.from({length:32},()=>[-.7654321,-.8765432,-.9876543]),
      edits:Array.from({length:MAX_LOCAL_STAMPS},()=>({kind:'restore',target:'length',uv:[.987654321,.87654321],point:[-2.4567891,-2.3456789,-2.2345678],radius:.56789123,value:.87654321,color:'#ffffff'})),
    },
  });
  const token=encodeRecipe(recipe);
  assert.equal(recipe.experiment.edits.length,MAX_LOCAL_STAMPS);
  assert.equal(recipe.experiment.coat,coat);
  assert.equal(recipe.experiment.field.length,32);assert.match(recipe.name,/绒/);
  assert.ok(recipe.experiment.edits.every(stamp=>stamp.kind==='restore'&&stamp.target==='length'),'the largest edit format includes restore targets');
  assert.ok(token.length<=MAX_RECIPE_TOKEN_LENGTH,`Maximal recipe token is ${token.length} characters`);
  assert.deepEqual(decodeRecipe(token),recipe);
  const recipes=Array.from({length:MAX_RECIPES},(_,i)=>({...recipe,id:i.toString(16).padStart(64,'r')}));
  const serialized=JSON.stringify(recipes);
  assert.ok(serialized.length<=MAX_COLLECTION_LENGTH,`Maximal collection is ${serialized.length} characters`);
  const storage=memoryStorage();assert.equal(saveCollection(storage,recipes),true);
  const restored=readCollection(storage);assert.equal(restored.length,MAX_RECIPES);
  assert.deepEqual(restored,recipes.map(sanitizeRecipe));
});

test('baked coats and their remaining restore edits survive sharing without reordering',()=>{
  const coat=coatSnapshot(),edits=[{kind:'restore',target:'color',uv:[.25,.5],point:[0,0,.74],radius:.25,value:.6,color:'#ffffff'}];
  const clean=sanitizeRecipe({experiment:{coat,edits,groomDynamics:true}});
  assert.equal(clean.experiment.coat,coat);
  assert.deepEqual(decodeRecipe(encodeRecipe(clean)),clean);
  const storage=memoryStorage();assert.equal(saveCollection(storage,[clean]),true);
  assert.deepEqual(readCollection(storage),[clean]);
  assert.deepEqual(edits[0].target,'color');
});

test('absent, identity and malformed coat checkpoints fall back to the old empty base safely',()=>{
  assert.equal(coatSnapshot(false),'');
  for(const coat of [undefined,null,'',coatSnapshot(false),'lc1:bad','arbitrary shader',[],{},'x'.repeat(MAX_COAT_SNAPSHOT_LENGTH+1)]){
    assert.equal(sanitizeRecipe({version:1,experiment:{coat}}).experiment.coat,'');
  }
  const old={version:1,name:'旧配方',experiment:{edits:[{kind:'trim',uv:[.25,.5],point:[0,0,.74],radius:.25,value:.2,color:'#ffffff'}]}};
  const restored=decodeRecipe(encodeRecipe(old));
  assert.equal(restored.version,1);assert.equal(restored.experiment.coat,'');
  assert.equal(restored.experiment.edits.length,1);
});

test('recipe imports bound local stamp count and discard malformed brush centers',()=>{
  const stamp={kind:'trim',uv:[.25,.5],point:[0,0,.74],radius:.25,value:.2,color:'#ffffff'};
  const recipe=sanitizeRecipe({experiment:{edits:Array(10000).fill(stamp)}});
  assert.equal(recipe.experiment.edits.length,MAX_LOCAL_STAMPS);
  assert.deepEqual(sanitizeRecipe({experiment:{edits:[{...stamp,uv:[0,Infinity]},{...stamp,point:[0,0]}]}}).experiment.edits,[]);
});

test('old 64- and 256-stamp recipes retain all edits through links and collections',()=>{
  for(const count of [64,256]){
    const edits=Array.from({length:count},(_,i)=>({kind:'dye',uv:[.25,.5],point:[0,0,.74],radius:.25,value:.8,color:i%2?'#aabbcc':'#334455'}));
    const old=sanitizeRecipe({version:1,name:'旧创作',experiment:{edits}});
    const decoded=decodeRecipe(encodeRecipe(old));
    assert.equal(decoded.experiment.edits.length,count);assert.deepEqual(decoded.experiment.edits,edits);
    const storage=memoryStorage(JSON.stringify([old]));
    assert.deepEqual(readCollection(storage)[0].experiment.edits,edits);
  }
});

test('expanded token and collection bounds accept their configured edge and reject the next character',()=>{
  assert.equal(MAX_RECIPE_TOKEN_LENGTH,524288);assert.equal(MAX_COLLECTION_LENGTH,6000000);
  const base=JSON.stringify({version:1,name:'边界配方'});
  const bytesAtLimit=MAX_RECIPE_TOKEN_LENGTH*3/4;
  const jsonAtLimit=base+' '.repeat(bytesAtLimit-new TextEncoder().encode(base).length);
  const bytes=new TextEncoder().encode(jsonAtLimit);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  const token=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  assert.equal(token.length,MAX_RECIPE_TOKEN_LENGTH);
  assert.equal(decodeRecipe(token).name,'边界配方');
  assert.equal(decodeRecipe(token+'A'),null);
  const raw=JSON.stringify([{version:1,name:'边界收藏'}]);
  assert.equal(readCollection(memoryStorage(raw+' '.repeat(MAX_COLLECTION_LENGTH-raw.length))).length,1);
  assert.deepEqual(readCollection(memoryStorage(raw+' '.repeat(MAX_COLLECTION_LENGTH-raw.length+1))),[]);
});
