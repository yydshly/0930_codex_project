import {JOURNAL_CATEGORIES} from './project-journal-data.js';

const categoryLabels = new Map(JOURNAL_CATEGORIES.map(({id, label}) => [id, label]));
const isEntry = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const visibleText = value => typeof value === 'string' ? value : '';

function searchText(entry) {
  const labels = Array.isArray(entry.links) ? entry.links.map(link => visibleText(link?.label)) : [];
  return [visibleText(entry.title), visibleText(entry.body), visibleText(entry.status),
    categoryLabels.get(entry.category) || '', ...labels].join('\n').toLowerCase();
}

/** Search displayed words only, while preserving caller-owned entry objects. */
export function filterJournalEntries(entries, {query = '', source = 'all'} = {}) {
  if (!Array.isArray(entries)) return [];
  const normalized = typeof query === 'string' ? Array.from(query.trim()).slice(0, 200).join('').toLowerCase() : '';
  const tokens = normalized.split(/\s+/u).filter(Boolean);
  return entries.filter(entry => {
    if (!isEntry(entry)) return false;
    const custom = entry.custom === true;
    if (source === 'builtin' && custom || source === 'custom' && !custom) return false;
    if (!tokens.length) return true;
    const text = searchText(entry);
    return tokens.every(token => text.includes(token));
  });
}
