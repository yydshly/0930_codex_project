export const JOURNAL_KEY = 'plush-lab-project-journal-v1';
export const MAX_JOURNAL_ENTRIES = 120;

const MAX_TIMESTAMP = 8.64e15;
const MAX_STORED_LENGTH = 2000000;
const CATEGORIES = ['progress', 'changes', 'principles', 'roadmap'];
const LABELS = {progress: '当前进展', changes: '变更记录', principles: '实现原则', roadmap: '未来计划'};
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMESTAMP;
const text = (value, maximum, multiline = false) => typeof value === 'string'
  ? Array.from(value.replace(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g : /[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\r\n?/g, '\n').trim()).slice(0, maximum).join('')
  : '';
const sortEntries = entries => entries.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const damaged = entries => ({entries, ok: false, error: '项目记录格式损坏，已保留可读取的部分；原始存储未改写。'});

/** Copy supported fields only; preserve multiline notes and bound Unicode characters. */
export function sanitizeJournalEntry(raw) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(raw.id) ||
    !CATEGORIES.includes(raw.category) || typeof raw.title !== 'string' || typeof raw.body !== 'string' ||
    !timestamp(raw.createdAt) || !timestamp(raw.updatedAt) || raw.updatedAt < raw.createdAt) return null;
  const title = text(raw.title, 100), body = text(raw.body, 4000, true);
  if (!title) return null;
  return {id: raw.id, category: raw.category, title, body, createdAt: raw.createdAt, updatedAt: raw.updatedAt};
}

function collect(rawEntries) {
  const byId = new Map();
  let warning = rawEntries.length > MAX_JOURNAL_ENTRIES;
  for (const raw of rawEntries) {
    const entry = sanitizeJournalEntry(raw);
    if (!entry) {warning = true;continue;}
    if (['title', 'body'].some(key => entry[key] !== raw[key])) warning = true;
    const previous = byId.get(entry.id);
    if (previous) {
      warning = true;
      const newest = entry.updatedAt > previous.updatedAt ? entry : previous;
      byId.set(entry.id, {...newest, createdAt: Math.min(previous.createdAt, entry.createdAt)});
    } else byId.set(entry.id, entry);
  }
  return {entries: sortEntries([...byId.values()]).slice(0, MAX_JOURNAL_ENTRIES), warning};
}

/** Read without deleting or rewriting malformed data; ok=false retains the warning. */
export function readJournal(storage) {
  let raw;
  try {
    raw = storage.getItem(JOURNAL_KEY);
  } catch {
    return {entries: [], ok: false, error: '无法读取本机项目记录，请检查浏览器存储权限。'};
  }
  if (raw === null || raw === undefined) return {entries: [], ok: true};
  if (typeof raw !== 'string' || !raw.length || raw.length > MAX_STORED_LENGTH) return damaged([]);
  try {
    const parsed = JSON.parse(raw);
    // Accept a direct version-one array for callers that saved the initial list.
    const entries = Array.isArray(parsed) ? parsed : isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.entries) ? parsed.entries : null;
    if (!entries) return damaged([]);
    const result = collect(entries);
    return result.warning ? damaged(result.entries) : {entries: result.entries, ok: true};
  } catch {
    return damaged([]);
  }
}

/** Re-read immediately before every write so other pages' new entries survive. */
export function upsertJournalEntry(storage, raw) {
  const current = readJournal(storage);
  if (!current.ok) return current;
  const entry = sanitizeJournalEntry(raw);
  if (!entry) return {entries: current.entries, ok: false, error: '项目记录内容无效，请检查分类、标题和时间。'};
  const entries = [...current.entries], index = entries.findIndex(item => item.id === entry.id);
  if (index < 0 && entries.length >= MAX_JOURNAL_ENTRIES) return {entries: current.entries, ok: false, error: '已保存 120 条项目记录；可更新已有记录，当前补充尚未保存。'};
  if (index >= 0) {
    const previous = entries[index];
    entries[index] = {...entry, createdAt: previous.createdAt, updatedAt: Math.max(previous.updatedAt, entry.updatedAt, previous.createdAt)};
  } else entries.push(entry);
  sortEntries(entries);
  if (JSON.stringify(entries) === JSON.stringify(current.entries)) return {entries: current.entries, ok: true};
  try {
    storage.setItem(JOURNAL_KEY, JSON.stringify({version: 1, entries}));
    return {entries, ok: true};
  } catch {
    return {entries: current.entries, ok: false, error: '项目记录保存失败，可能是浏览器存储空间不足或权限受限；当前补充尚未保存。'};
  }
}

const markdownText = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|]/g, '\\$&').replace(/^(\s*)([-=])/gm, '$1\\$2');

function categoryList(raw) {
  const result = [], seen = new Set();
  const add = (id, label) => {
    if (!CATEGORIES.includes(id) || seen.has(id)) return;
    seen.add(id);result.push({id, label: text(label, 100) || LABELS[id]});
  };
  if (Array.isArray(raw)) for (const item of raw) {
    if (typeof item === 'string') add(item, LABELS[item]);
    else if (isRecord(item)) add(item.id, item.label || item.title || item.name);
  }
  else if (isRecord(raw)) for (const id of CATEGORIES) add(id, typeof raw[id] === 'string' ? raw[id] : raw[id]?.label || raw[id]?.title);
  for (const id of CATEGORIES) add(id, LABELS[id]);
  return result;
}

function linkMarkdown(raw) {
  const url = typeof raw === 'string' ? raw : isRecord(raw) ? raw.url || raw.href : '';
  if (typeof url !== 'string' || !url.trim() || /[\u0000-\u0020<>]/.test(url) || (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^https?:\/\//i.test(url))) return '';
  const label = isRecord(raw) ? text(raw.label || raw.title || raw.text, 100) : '';
  return `[${markdownText(label || url)}](${url.replace(/[\\()]/g, value => '%' + value.charCodeAt(0).toString(16).toUpperCase())})`;
}

/** Keep built-in evidence distinct from local notes and explicitly mark future plans. */
export function formatJournalMarkdown(builtins, customEntries, categories) {
  const groups = categoryList(categories), lines = ['# Plush Lab · 项目记录', '', '内置记录随项目提供；我的补充保存在当前浏览器。未来计划表示待实现方向。', ''];
  const builtinEntries = Array.isArray(builtins) ? builtins.filter(entry => isRecord(entry) && CATEGORIES.includes(entry.category) && text(entry.title, 100)).map(entry => ({
    category: entry.category, title: text(entry.title, 100), body: text(Array.isArray(entry.body) ? entry.body.join('\n') : entry.body, 4000, true),
    status: text(entry.status, 100), links: Array.isArray(entry.links) ? entry.links.map(linkMarkdown).filter(Boolean) : [],
  })) : [];
  const localEntries = collect(Array.isArray(customEntries) ? customEntries : []).entries;
  const section = (title, entries, local) => {
    lines.push(`## ${title}`, '');
    if (!entries.length) {lines.push('暂无记录。', '');return;}
    for (const {id, label} of groups) {
      const selected = entries.filter(entry => entry.category === id);
      if (!selected.length) continue;
      const heading = id === 'roadmap' && !/未来|计划|待实现/.test(label) ? `${label}（未来计划）` : label;
      lines.push(`### ${markdownText(heading)}`, '');
      for (const entry of selected) {
        lines.push(`#### ${markdownText(entry.title)}`, '');
        if (id === 'roadmap') lines.push('类型：未来计划', '');
        if (!local && entry.status) lines.push(`状态：${markdownText(entry.status)}`, '');
        if (local) lines.push(`创建：${new Date(entry.createdAt).toISOString()} · 更新：${new Date(entry.updatedAt).toISOString()}`, '');
        if (entry.body) lines.push(markdownText(entry.body), '');
        if (!local && entry.links.length) {lines.push('参考：');for (const link of entry.links) lines.push(`- ${link}`);lines.push('');}
      }
    }
  };
  section('内置项目记录', builtinEntries, false);section('我的补充', localEntries, true);
  return lines.join('\n').trimEnd() + '\n';
}
