import {filterJournalEntries} from './project-journal-search.js';

// The overview reads the complete journal; it never truncates or rewrites it.
export function collectOverviewRecords(builtins, supplements = []) {
  return [...supplements.map(entry => ({...entry, custom: true})),
    ...builtins.map(entry => ({...entry, custom: false}))];
}

export function filterOverviewRecords(entries, {query = '', category = 'all'} = {}) {
  return filterJournalEntries(entries, {query}).filter(entry => category === 'all' || entry.category === category);
}
