import test from 'node:test';
import assert from 'node:assert/strict';
import {filterJournalEntries} from '../src/project-journal-search.js';

const builtin = {
  id: 'builtin-trim', category: 'changes', title: '修剪与染色', body: '使用 Float32 检查点保存局部毛流。',
  status: '已完成', custom: false, links: [{label: 'FTL 论文', url: 'https://hidden.example/paper-secret'}],
};
const custom = {
  id: 'my-draft', category: 'progress', title: '我的草稿观察', body: '检查修剪恢复后 Float32 的毛流。',
  custom: true, links: [{label: '本机笔记', url: 'https://hidden.example/local-secret'}],
};
const planned = {id: 'next-shell', category: 'roadmap', title: 'Shell 下一步', body: '计划改善曲面笔触。', status: '待实现'};
const entries = [builtin, custom, planned];

test('Chinese and case-insensitive terms use AND across displayed fields and full-width spaces', () => {
  assert.deepEqual(filterJournalEntries(entries, {query: '  修剪　　fLoAt32 \t 已完成  '}), [builtin]);
  assert.deepEqual(filterJournalEntries(entries, {query: '修剪 毛流'}), [builtin, custom]);
  assert.deepEqual(filterJournalEntries(entries, {query: '修剪 曲面'}), []);
});

test('source and search filters combine without excluding builtins missing the custom marker', () => {
  assert.deepEqual(filterJournalEntries(entries, {query: 'Float32', source: 'builtin'}), [builtin]);
  assert.deepEqual(filterJournalEntries(entries, {query: 'Float32', source: 'custom'}), [custom]);
  assert.deepEqual(filterJournalEntries(entries, {query: '下一步', source: 'builtin'}), [planned]);
  assert.deepEqual(filterJournalEntries(entries, {source: 'custom'}), [custom]);
  assert.deepEqual(filterJournalEntries(entries, {source: 'builtin'}), [builtin, planned]);
});

test('Chinese category labels and link labels are searchable, URLs and hidden metadata are not', () => {
  assert.deepEqual(filterJournalEntries(entries, {query: '修改记录'}), [builtin]);
  assert.deepEqual(filterJournalEntries(entries, {query: '项目进展'}), [custom]);
  assert.deepEqual(filterJournalEntries(entries, {query: '未来方向'}), [planned]);
  assert.deepEqual(filterJournalEntries(entries, {query: 'ftl 论文'}), [builtin]);
  for (const query of ['hidden.example', 'paper-secret', 'local-secret', 'builtin-trim', 'next-shell', 'roadmap']) {
    assert.deepEqual(filterJournalEntries(entries, {query}), [], query);
  }
});

test('empty and invalid queries preserve the selected source, and unknown sources fall back to all', () => {
  assert.deepEqual(filterJournalEntries(entries), entries);
  assert.deepEqual(filterJournalEntries(entries, {query: '　 \n\t '}), entries);
  for (const query of [null, undefined, 12, {}, ['修剪']]) {
    assert.deepEqual(filterJournalEntries(entries, {query, source: 'custom'}), [custom]);
  }
  assert.deepEqual(filterJournalEntries(entries, {query: '不存在的效果'}), []);
  assert.deepEqual(filterJournalEntries(entries, {source: 'unknown'}), entries);
});

test('punctuation and HTML-looking text are literal search terms, not regular expressions', () => {
  const literal = {title: '[trim] (原长)', body: '<b>修剪</b> a+b? .*'};
  const unrelated = {title: 'trim 原长', body: '普通修剪'};
  for (const query of ['[trim]', '(原长)', '<b>修剪</b>', 'a+b?', '.*']) {
    assert.deepEqual(filterJournalEntries([literal, unrelated], {query}), [literal], query);
  }
  assert.deepEqual(filterJournalEntries([literal, unrelated], {query: '['}), [literal]);
});

test('missing or invalid displayed fields do not throw or expose stringified metadata', () => {
  const blank = {}, wrongTypes = {title: 12, body: {secret: '不要搜索'}, status: false, links: [null, {}, {label: 13}]};
  const categoryOnly = {category: 'principles'}, labelOnly = {links: [{label: '光照参考'}]};
  const unusual = [blank, wrongTypes, categoryOnly, labelOnly, null, undefined, '修剪', 2, []];
  assert.deepEqual(filterJournalEntries(unusual), [blank, wrongTypes, categoryOnly, labelOnly]);
  assert.deepEqual(filterJournalEntries(unusual, {query: '实现原理'}), [categoryOnly]);
  assert.deepEqual(filterJournalEntries(unusual, {query: '光照'}), [labelOnly]);
  assert.deepEqual(filterJournalEntries(unusual, {query: 'secret'}), []);
  assert.deepEqual(filterJournalEntries(unusual, {query: '[object'}), []);
  assert.deepEqual(filterJournalEntries(null, {query: '修剪'}), []);
});

test('only the Boolean true custom marker denotes a personal record', () => {
  const stringMarker = {title: '旧记录', custom: 'true'};
  assert.deepEqual(filterJournalEntries([custom, stringMarker], {source: 'custom'}), [custom]);
  assert.deepEqual(filterJournalEntries([custom, stringMarker], {source: 'builtin'}), [stringMarker]);
});

test('queries are bounded to 200 Unicode characters without splitting a surrogate pair', () => {
  const title = 'a'.repeat(199) + '🧸';
  const record = {title};
  assert.deepEqual(filterJournalEntries([record], {query: `　${title}ignored　`}), [record]);
  assert.deepEqual(filterJournalEntries([{title: 'b'.repeat(200)}], {query: 'b'.repeat(200) + 'ignored'}), [{title: 'b'.repeat(200)}]);
});

test('filtering produces a separate array with the original object references and no mutations', () => {
  const frozen = entries.map(entry => Object.freeze({...entry, links: entry.links ? Object.freeze(entry.links.map(link => Object.freeze({...link}))) : undefined}));
  Object.freeze(frozen);
  const before = JSON.stringify(frozen);
  const selected = filterJournalEntries(frozen, {query: '修剪', source: 'all'});
  assert.notStrictEqual(selected, frozen);
  assert.strictEqual(selected[0], frozen[0]);
  assert.strictEqual(selected[1], frozen[1]);
  assert.equal(JSON.stringify(frozen), before);
  assert.deepEqual(frozen.map(entry => entry.id), ['builtin-trim', 'my-draft', 'next-shell']);
  assert.notStrictEqual(filterJournalEntries(frozen), frozen);
});
