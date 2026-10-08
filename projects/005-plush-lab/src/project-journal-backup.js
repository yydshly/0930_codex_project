import {JOURNAL_KEY, MAX_JOURNAL_ENTRIES, readJournal, sanitizeJournalEntry} from './project-journal-store.js';

export const MAX_JOURNAL_BACKUP_BYTES = 2 * 1024 * 1024;
const FORMAT = 'plush-lab-project-journal';
const MAX_TIMESTAMP = 8.64e15;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMESTAMP;
const sortEntries = entries => entries.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const sameContent = (a, b) => ['id', 'category', 'title', 'body', 'createdAt'].every(key => a[key] === b[key]);
const byteLength = text => new TextEncoder().encode(text).byteLength;
const atMostCharacters = (text, maximum) => {
  if (typeof text !== 'string') return false;
  let count = 0;for (const character of text) {if (++count > maximum) return false;}
  return true;
};

function inspectEntries(rawEntries) {
  if (!Array.isArray(rawEntries) || rawEntries.length > MAX_JOURNAL_ENTRIES) return {ok: false, entries: [], error: '备份记录数量无效或超过 120 条，整个文件未导入。'};
  const byId = new Map();
  for (const raw of rawEntries) {
    // Unlike a form save, importing must not silently shorten or normalize text.
    if (!isRecord(raw) || !atMostCharacters(raw.title, 100) || !atMostCharacters(raw.body, 4000)) return {ok: false, entries: [], error: '备份包含无效或过长的标题/正文，整个文件未导入。'};
    const entry = sanitizeJournalEntry(raw);
    if (!entry || entry.title !== raw.title || entry.body !== raw.body) return {ok: false, entries: [], error: '备份包含格式不完整或无效的记录，整个文件未导入。'};
    const previous = byId.get(entry.id);
    if (previous && !sameContent(previous, entry)) return {ok: false, entries: [], error: '备份内同一 ID 存在不同内容，整个文件未导入；请先核对这些记录。'};
    if (!previous || entry.updatedAt > previous.updatedAt) byId.set(entry.id, entry);
  }
  return {ok: true, entries: sortEntries([...byId.values()])};
}

/** Only custom notes are exported. Unsupported fields do not enter the backup. */
export function encodeJournalBackup(entries, {now = Date.now()} = {}) {
  if (!timestamp(now)) throw new TypeError('备份导出时间无效。');
  const result = inspectEntries(entries);
  if (!result.ok) throw new TypeError(result.error);
  const encoded = JSON.stringify({format: FORMAT, version: 1, exportedAt: now, entries: result.entries}, null, 2) + '\n';
  if (byteLength(encoded) > MAX_JOURNAL_BACKUP_BYTES) throw new RangeError('备份超过 2 MiB，无法导出。');
  return encoded;
}

/** Validate the complete package, including UTF-8 size, before accepting any row. */
export function inspectJournalBackup(rawString) {
  if (typeof rawString !== 'string' || !rawString.length) return {ok: false, entries: [], error: '请选择包含项目记录的 JSON 备份文件。'};
  if (rawString.length > MAX_JOURNAL_BACKUP_BYTES || byteLength(rawString) > MAX_JOURNAL_BACKUP_BYTES) return {ok: false, entries: [], error: '备份超过 2 MiB，整个文件未导入。'};
  try {
    const parsed = JSON.parse(rawString.replace(/^\uFEFF/, ''));
    if (!isRecord(parsed) || parsed.format !== FORMAT || parsed.version !== 1 || !timestamp(parsed.exportedAt)) return {ok: false, entries: [], error: '备份格式、版本或导出时间无效，整个文件未导入。'};
    return inspectEntries(parsed.entries);
  } catch {
    return {ok: false, entries: [], error: '无法解析 JSON 备份，整个文件未导入。'};
  }
}

/** Merge once against the latest local state; conflicts always keep local notes. */
export function mergeJournalBackup(storage, rawString) {
  const current = readJournal(storage);
  const result = {ok: false, entries: current.entries, added: 0, duplicates: 0, conflicts: 0};
  if (!current.ok) return {...result, error: current.error};
  const backup = inspectJournalBackup(rawString);
  if (!backup.ok) return {...result, error: backup.error};
  const byId = new Map(current.entries.map(entry => [entry.id, entry])), additions = [];
  for (const entry of backup.entries) {
    const previous = byId.get(entry.id);
    if (!previous) additions.push(entry);
    else if (sameContent(previous, entry)) result.duplicates++;
    else result.conflicts++;
  }
  if (current.entries.length + additions.length > MAX_JOURNAL_ENTRIES) return {...result, error: '合并后将超过 120 条项目记录，整个文件未导入；本机记录保持原样。'};
  if (!additions.length) return {...result, ok: true};
  const entries = sortEntries([...current.entries, ...additions]);
  try {
    storage.setItem(JOURNAL_KEY, JSON.stringify({version: 1, entries}));
    return {...result, ok: true, entries, added: additions.length};
  } catch {
    return {...result, error: '备份导入保存失败，可能是浏览器空间不足或权限受限；本机记录未被替换。'};
  }
}
