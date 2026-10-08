import {sanitizeLocalEdits} from './local-coat-field.js';
import {sanitizeLocalSnapshot} from './local-coat-snapshot.js';

export const COLLECTION_KEY = 'plush-lab-recipes-v1';
export const MAX_RECIPES = 12;
export const MAX_RECIPE_TOKEN_LENGTH = 524288;
export const MAX_COLLECTION_LENGTH = 6000000;

const COLORS = ['#7094ef', '#b5ce8c', '#ebc656', '#bc9adc', '#eda9ac', '#f0d9d2', '#ba8f6d', '#e8b759'];
const PARAMS = {
  length: [.025, .32, .09],
  density: [25, 120, 90],
  thickness: [.001, .006, .0026],
  curl: [0, 1, .35],
  gravity: [0, 1, .25],
  mess: [0, 1, .35],
  brightness: [.6, 1.4, 1],
  stiffness: [.1, 1, .6],
  roughness: [.2, 1, .9],
  groom: [0, 1, 0],
  wetness: [0, 1, 0],
};
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, finite(value, fallback)));
const choice = (value, options, fallback) => options.includes(value) ? value : fallback;
const roundField = value => Math.round(value * 10000) / 10000 || 0;

/** Only the renderer's fixed guide field is accepted; arbitrary nested arrays are discarded. */
function sanitizeField(value) {
  if (!Array.isArray(value) || value.length !== 32) return [];
  const field = [];
  for (let i = 0; i < 32; i++) {
    const vector = value[i];
    if (!Array.isArray(vector) || vector.length !== 3) return [];
    let clean = [finite(vector[0], 0), finite(vector[1], 0), finite(vector[2], 0)];
    // Divide first to keep the length calculation safe even for near-MAX_VALUE inputs.
    const largest = Math.max(...clean.map(Math.abs));
    if (largest > 0) {
      const direction = clean.map(component => component / largest);
      const directionLength = Math.hypot(...direction);
      if (largest > 1.5 / directionLength) {
        clean = direction.map(component => component * (1.5 / directionLength));
      }
    }
    clean = clean.map(roundField);
    const length = Math.hypot(...clean);
    // Rounding can nudge a boundary vector outside the bound by less than one decimal unit.
    if (length > 1.5) clean = clean.map(component => roundField(component * (1.4999 / length)));
    field.push(clean);
  }
  return field;
}

function sanitizeExperiment(value) {
  const input = isRecord(value) ? value : {};
  return {
    mode: choice(input.mode, ['off', 'shell', 'bundles', 'ftl'], 'off'),
    clump: roundField(clamp(input.clump, 0, 1, .65)),
    shadow: roundField(clamp(input.shadow, 0, 1, .45)),
    field: sanitizeField(input.field),
    coat: sanitizeLocalSnapshot(input.coat) || '',
    edits: sanitizeLocalEdits(input.edits),
    collision: input.collision === true,
    groomDynamics: input.groomDynamics === true,
  };
}

/** Copy only supported fields, so imported recipes cannot pass arbitrary state to the renderer. */
export function sanitizeRecipe(value) {
  const input = isRecord(value) ? value : {};
  const inputParams = isRecord(input.params) ? input.params : {};
  const character = Math.round(clamp(input.character, 0, 7, 2));
  const cleanName = typeof input.name === 'string'
    ? Array.from(input.name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()).slice(0, 24).join('')
    : '';
  const params = {shortPile: inputParams.shortPile !== false};
  for (const [key, [min, max, fallback]] of Object.entries(PARAMS)) {
    params[key] = clamp(inputParams[key], min, max, fallback);
  }
  params.density = Math.round(params.density);
  const fullTurn = Math.PI * 2;
  const rawYaw = finite(input.yaw, 0) % fullTurn;
  const recipe = {
    version: 1,
    name: cleanName || '我的毛绒',
    character,
    color: typeof input.color === 'string' && /^#[\da-f]{6}$/i.test(input.color) ? input.color.toLowerCase() : COLORS[character],
    params,
    experiment: sanitizeExperiment(input.experiment),
    light: choice(input.light, ['day', 'warm', 'night'], 'day'),
    backdrop: choice(input.backdrop, ['cream', 'sage', 'rose'], 'cream'),
    yaw: ((rawYaw + Math.PI + fullTurn) % fullTurn) - Math.PI,
    pitch: clamp(input.pitch, -.5, .5, 0),
    faceGuard: input.faceGuard === true,
  };
  if (typeof input.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(input.id)) recipe.id = input.id;
  if (typeof input.createdAt === 'number' && Number.isFinite(input.createdAt)) {
    recipe.createdAt = Math.max(0, Math.min(8.64e15, input.createdAt));
  }
  return recipe;
}

/** UTF-8 rather than Latin-1 keeps Chinese names intact in a URL-safe token. */
export function encodeRecipe(recipe) {
  const bytes = new TextEncoder().encode(JSON.stringify(sanitizeRecipe(recipe)));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRecipe(token) {
  if (typeof token !== 'string' || !token.length || token.length > MAX_RECIPE_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token) || token.length % 4 === 1) return null;
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (!isRecord(parsed) || parsed.version !== 1) return null;
    return sanitizeRecipe(parsed);
  } catch {
    return null;
  }
}

export function readCollection(storage) {
  try {
    const raw = storage.getItem(COLLECTION_KEY);
    if (!raw || typeof raw !== 'string' || raw.length > MAX_COLLECTION_LENGTH) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => isRecord(item) && item.version === 1).slice(0, MAX_RECIPES).map(sanitizeRecipe);
  } catch {
    return [];
  }
}

/** False lets the UI report quota/private-mode failures instead of claiming a save succeeded. */
export function saveCollection(storage, recipes) {
  if (!Array.isArray(recipes)) return false;
  try {
    const collection = recipes.filter(isRecord).slice(0, MAX_RECIPES).map(sanitizeRecipe);
    const serialized = JSON.stringify(collection);
    if (serialized.length > MAX_COLLECTION_LENGTH) return false;
    storage.setItem(COLLECTION_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
