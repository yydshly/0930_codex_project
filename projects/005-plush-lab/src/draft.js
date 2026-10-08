import {sanitizeRecipe, MAX_RECIPE_TOKEN_LENGTH} from './recipes.js';

// Drafts are separate from named collection entries and never remove them.
export const DRAFT_KEY = 'plush-lab-draft-v1';
export const MAX_DRAFT_LENGTH = 1048576;
const MAX_TIMESTAMP = 8.64e15;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validTimestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMESTAMP;
const validBaseToken = value => typeof value === 'string' && value.length <= MAX_RECIPE_TOKEN_LENGTH &&
  (value === '' || /^[A-Za-z0-9_-]+$/.test(value));

function cleanDraftFields(value) {
  if (!isRecord(value) || !isRecord(value.recipe) || value.recipe.version !== 1 ||
    !validTimestamp(value.savedAt) || !validBaseToken(value.baseToken)) return null;
  return {recipe: sanitizeRecipe(value.recipe), savedAt: value.savedAt, baseToken: value.baseToken};
}

/** Corrupt, unsupported or inaccessible drafts are ignored without writing storage. */
export function readDraft(storage) {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (typeof raw !== 'string' || !raw.length || raw.length > MAX_DRAFT_LENGTH) return null;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;
    return cleanDraftFields(parsed);
  } catch {
    return null;
  }
}

/** Return the exact save time, or false; invalid attempts leave the old draft intact. */
export function saveDraft(storage, value, now = Date.now()) {
  try {
    if (!isRecord(value) || !isRecord(value.recipe) ||
      (value.recipe.version !== undefined && value.recipe.version !== 1) ||
      !validTimestamp(now) || !validBaseToken(value.baseToken)) return false;
    const draft = {version: 1, recipe: sanitizeRecipe(value.recipe), savedAt: now, baseToken: value.baseToken};
    const serialized = JSON.stringify(draft);
    if (serialized.length > MAX_DRAFT_LENGTH) return false;
    storage.setItem(DRAFT_KEY, serialized);
    return now;
  } catch {
    return false;
  }
}

export function clearDraft(storage) {
  try {
    storage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

/** A draft can augment only the link it came from; a different shared link wins. */
export function chooseStartupRecipe(options = {}) {
  try {
    const input = isRecord(options) ? options : {};
    const draft = cleanDraftFields(input.draft);
    const hasShared = isRecord(input.sharedRecipe) && input.sharedRecipe.version === 1 &&
      validBaseToken(input.sharedToken) && input.sharedToken.length > 0;
    if (hasShared) {
      if (draft && draft.baseToken === input.sharedToken) return {recipe: draft.recipe, source: 'draft'};
      return {recipe: sanitizeRecipe(input.sharedRecipe), source: 'shared'};
    }
    if (draft) return {recipe: draft.recipe, source: 'draft'};
  } catch {
    // The UI can report a malformed link independently while starting normally.
  }
  return {recipe: null, source: 'default'};
}
