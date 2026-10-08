import {sanitizeLayout, sanitizePose} from './world-layout.js';
import {sanitizeReferenceFur} from './reference-plush-fur.js';

const options = rows => Object.freeze(rows.map(([id, label]) => Object.freeze({id, label})));

export const SHAPES = options([
  ['pear', '梨梨'], ['bean', '豆豆'], ['triangle', '奶油'], ['heart', '桃心'],
  ['egg', '蛋仔'], ['bunny', '兔兔'], ['bear', '团熊'], ['star', '星仔'],
]);
export const MATERIALS = options([['cloud', '柔软短绒'], ['velvet', '细密丝绒'], ['teddy', '蓬松卷绒']]);
export const ACTOR_ASSETS = options([['procedural', '自由创作角色'], ['reference-plush', '原作卷绒星仔']]);
export const HATS = options([['none', '不戴帽子'], ['beret', '贝雷帽'], ['beanie', '针织帽'], ['bow', '蝴蝶结']]);
export const OUTFITS = options([['none', '不穿外搭'], ['scarf', '围巾'], ['poncho', '披肩'], ['vest', '马甲']]);
export const ACCESSORIES = options([['none', '不带配饰'], ['glasses', '圆眼镜'], ['satchel', '小挎包']]);
export const SCENES = options([['room', '柔软房间'], ['garden', '花园角落'], ['gallery', '小小展厅']]);
export const LIGHTING = options([['day', '日光'], ['warm', '暖光'], ['moon', '月光']]);
export const PERSONALITIES = options([['calm', '安静'], ['curious', '好奇'], ['playful', '活泼']]);
export const PALETTES = Object.freeze([
  {id: 'cream', label: '奶油草地', furColor: '#edce79', accentColor: '#7e9b7a', secondaryColor: '#f5eee0'},
  {id: 'matcha', label: '抹茶晨光', furColor: '#b7ce98', accentColor: '#e2bc70', secondaryColor: '#f4eedf'},
  {id: 'sky', label: '晴空奶蓝', furColor: '#96b7df', accentColor: '#e7c57b', secondaryColor: '#f0f3ef'},
  {id: 'lavender', label: '葡萄云朵', furColor: '#bba5d1', accentColor: '#799b85', secondaryColor: '#eee6f4'},
  {id: 'peach', label: '蜜桃花园', furColor: '#e5aaa1', accentColor: '#8ea383', secondaryColor: '#f6e5d2'},
  {id: 'cocoa', label: '可可燕麦', furColor: '#aa846b', accentColor: '#a3b49b', secondaryColor: '#ebd8ba'},
].map(palette => Object.freeze(palette)));

export const MAX_WORLD_TOKEN = 131072;
const DEFAULT_SEED = 'soft-001';
const base = Object.freeze({version: 1, seed: DEFAULT_SEED, name: '奶油豆豆', shape: 'bean', material: 'cloud', actorAsset: 'procedural', actorTint: null, actorScale: 1,
  furColor: PALETTES[0].furColor, accentColor: PALETTES[0].accentColor, secondaryColor: PALETTES[0].secondaryColor,
  hat: 'bow', outfit: 'scarf', accessory: 'none', scene: 'room', lighting: 'warm', personality: 'calm'});
const catalogs = {shape: SHAPES, material: MATERIALS, actorAsset: ACTOR_ASSETS, hat: HATS, outfit: OUTFITS, accessory: ACCESSORIES,
  scene: SCENES, lighting: LIGHTING, personality: PERSONALITIES};
const allowed = Object.fromEntries(Object.entries(catalogs).map(([key, list]) => [key, new Set(list.map(option => option.id))]));
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const shortText = (value, maximum, fallback) => {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
  return Array.from(cleaned).slice(0, maximum).join('') || fallback;
};

/** The new world is separate from the existing character recipe and coat draft. */
export function defaultWorld(seed = DEFAULT_SEED) {
  return {...base, seed: shortText(seed, 40, DEFAULT_SEED), actorFur: sanitizeReferenceFur(), layout: sanitizeLayout(), pose: sanitizePose()};
}

/** Copy only supported fields. Unsupported schemas and values fall back safely. */
export function sanitizeWorld(input) {
  const result = defaultWorld();
  if (!isRecord(input) || input.version !== undefined && input.version !== 1) return result;
  result.seed = shortText(input.seed, 40, result.seed);
  result.name = shortText(input.name, 24, result.name);
  for (const key of Object.keys(catalogs)) if (allowed[key].has(input[key])) result[key] = input[key];
  for (const key of ['furColor', 'accentColor', 'secondaryColor']) {
    if (typeof input[key] === 'string' && /^#[0-9a-f]{6}$/i.test(input[key])) result[key] = input[key].toLowerCase();
  }
  if (typeof input.actorTint === 'string' && /^#[0-9a-f]{6}$/i.test(input.actorTint)) result.actorTint = input.actorTint.toLowerCase();
  if (typeof input.actorScale === 'number' && Number.isFinite(input.actorScale)) result.actorScale = Math.min(1.35, Math.max(.65, input.actorScale));
  result.actorFur = sanitizeReferenceFur(isRecord(input.actorFur) ? input.actorFur : undefined);
  result.layout = sanitizeLayout(input.layout);
  result.pose = sanitizePose(input.pose, result.layout, result.scene);
  return result;
}

function randomFor(seed) {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.codePointAt(0), 16777619);
  return () => {
    state = state + 0x6d2b79f5 | 0;
    let mixed = Math.imul(state ^ state >>> 15, 1 | state);
    mixed = mixed ^ mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
  };
}
const paletteScenes = {room: ['cream', 'peach', 'cocoa', 'lavender'], garden: ['matcha', 'cream', 'sky', 'peach'], gallery: ['sky', 'lavender', 'cocoa', 'cream']};
const palettePersonalities = {calm: ['cream', 'matcha', 'lavender', 'cocoa'], curious: ['cream', 'matcha', 'sky'], playful: ['peach', 'lavender', 'sky']};
const sceneLights = {room: ['warm', 'warm', 'day'], garden: ['day', 'day', 'warm'], gallery: ['warm', 'moon', 'day']};
const wardrobe = {
  room: {
    calm: {hats: ['none', 'bow', 'beanie'], outfits: ['scarf', 'poncho', 'none'], accessories: ['none']},
    curious: {hats: ['beret', 'bow', 'none'], outfits: ['vest', 'scarf'], accessories: ['glasses', 'none']},
    playful: {hats: ['bow', 'beanie'], outfits: ['poncho', 'scarf'], accessories: ['none', 'glasses']},
  },
  garden: {
    calm: {hats: ['none', 'bow', 'beanie'], outfits: ['scarf', 'poncho'], accessories: ['none', 'satchel']},
    curious: {hats: ['none', 'bow', 'beret'], outfits: ['poncho', 'vest'], accessories: ['satchel']},
    playful: {hats: ['bow', 'none'], outfits: ['poncho', 'none'], accessories: ['satchel', 'none']},
  },
  gallery: {
    calm: {hats: ['beret', 'none'], outfits: ['vest', 'scarf'], accessories: ['glasses', 'none']},
    curious: {hats: ['beret', 'bow'], outfits: ['vest'], accessories: ['glasses', 'satchel']},
    playful: {hats: ['bow', 'beret'], outfits: ['poncho', 'vest'], accessories: ['satchel', 'glasses']},
  },
};

/** Locks preserve complete groups; manually selected high-ear hats remain valid. */
export function generateWorld(seed, current = null, locks = {}) {
  const world = defaultWorld(seed), previous = sanitizeWorld(current), random = randomFor(world.seed);
  // Asset selection is deliberate; a random scene must not replace the imported actor.
  for (const key of ['actorAsset', 'actorTint', 'actorScale', 'actorFur']) world[key] = previous[key];
  const pick = values => values[Math.floor(random() * values.length)];
  const locked = group => isRecord(current) && isRecord(locks) && locks[group] === true;
  world.shape = locked('shape') ? previous.shape : pick(SHAPES).id;
  world.material = locked('material') ? previous.material : pick(MATERIALS).id;
  if (locked('scene')) {world.scene = previous.scene;world.lighting = previous.lighting;}
  else {world.scene = pick(SCENES).id;world.lighting = pick(sceneLights[world.scene]);}
  world.personality = locked('personality') ? previous.personality : pick(PERSONALITIES).id;
  const availablePalettes = PALETTES.filter(palette => paletteScenes[world.scene].includes(palette.id) && palettePersonalities[world.personality].includes(palette.id));
  const palette = pick(availablePalettes);
  for (const key of ['furColor', 'accentColor', 'secondaryColor']) world[key] = locked('palette') ? previous[key] : palette[key];
  if (locked('wardrobe')) {
    for (const key of ['hat', 'outfit', 'accessory']) world[key] = previous[key];
  } else {
    const profile = wardrobe[world.scene][world.personality];
    const hats = ['bunny', 'bear'].includes(world.shape) ? profile.hats.filter(hat => hat !== 'beanie' && hat !== 'beret') : profile.hats;
    // A gallery beret-only profile still has an ear-friendly alternative.
    world.hat = pick(hats.length ? hats : ['none']);world.outfit = pick(profile.outfits);world.accessory = pick(profile.accessories);
  }
  world.name = isRecord(current) ? previous.name : shortText(palette.label.slice(0, 2) + SHAPES.find(shape => shape.id === world.shape).label, 24, base.name);
  world.layout = sanitizeLayout(previous.layout);
  // Changing a generated character or scene starts it standing; every scene's furniture remains intact.
  world.pose = sanitizePose();
  return world;
}

function bytesToToken(bytes) {
  let binary = '';for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function encodeWorld(input) {
  const token = bytesToToken(new TextEncoder().encode(JSON.stringify(sanitizeWorld(input))));
  if (token.length > MAX_WORLD_TOKEN) throw new TypeError('世界分享内容过长。');
  return token;
}

/** Malformed URLs fail explicitly so the caller can retain the current scene. */
export function decodeWorld(token) {
  if (typeof token !== 'string' || !token.length || token.length > MAX_WORLD_TOKEN || !/^[A-Za-z0-9_-]+$/.test(token) || token.length % 4 === 1) {
    throw new TypeError('世界分享代码无效或过长。');
  }
  try {
    const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - token.length % 4) % 4));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (bytesToToken(bytes) !== token) throw new TypeError();
    const input = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (!isRecord(input) || input.version !== 1) throw new TypeError();
    return sanitizeWorld(input);
  } catch {
    throw new TypeError('世界分享代码格式无效。');
  }
}
