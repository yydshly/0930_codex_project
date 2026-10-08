import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPANION_KEY, COMPANION_LIMITS, createCompanionStore, growthSummary, exportCompanion, companionMarkdown} from '../src/companion-store.js';

const NOW = 1790830000123;
const blank = () => ({version: 1, notes: [], reminders: [], messages: [], memories: []});
function storage(initial = {}) {
  const values = new Map(Object.entries(initial)), reads = [], writes = [];
  return {getItem(key) {reads.push(key);return values.has(key) ? values.get(key) : null;}, setItem(key, value) {writes.push({key, value});values.set(key, value);}, peek(key) {return values.get(key);}, reads, writes};
}
function fixture(initial = {}) {
  const memory = storage(initial);let clock = NOW, sequence = 0;
  const store = createCompanionStore(memory, {now: () => clock, id: () => `record-${++sequence}`});
  return {memory, store, advance(ms = 1000) {clock += ms;return clock;}};
}
const note = overrides => ({type: 'note.upsert', title: ' 今天的想法 ', body: ' 第一段\r\n第二段 ', shareWithAI: false, ...overrides});
const reminder = overrides => ({type: 'reminder.upsert', title: '检查方案', dueAt: NOW + 1000, ...overrides});
const noteBaseline = ({title, body, shareWithAI}) => ({title, body, shareWithAI});
const reminderBaseline = ({title, dueAt, status}) => ({title, dueAt, status});

test('personal records never read or overwrite existing works or engineering records', () => {
  const originals = {'plush-lab-draft-v1': 'old draft', 'plush-world-collection-v1': 'old world', 'plush-lab-project-journal-v1': 'engineering'};
  const {memory, store} = fixture(originals);
  assert.deepEqual(store.read(), {ok: true, data: blank()});
  assert.equal(memory.writes.length, 0);
  const result = store.mutate(note());assert.equal(result.ok, true);assert.equal(result.changed, true);
  assert.ok(memory.reads.every(key => key === COMPANION_KEY));assert.ok(memory.writes.every(item => item.key === COMPANION_KEY));
  for (const [key, value] of Object.entries(originals)) assert.equal(memory.peek(key), value);
});

test('notes persist trimmed paragraphs, consent, creation time and independent returned objects', () => {
  const {memory, store, advance} = fixture();
  const first = store.mutate(note()).data.notes[0];assert.equal(first.title, '今天的想法');assert.equal(first.body, '第一段\n第二段');assert.equal(first.shareWithAI, false);
  advance();const second = store.mutate(note({id: first.id, title: '另一条想法', shareWithAI: true}));
  assert.equal(second.data.notes[0].createdAt, NOW);assert.equal(second.data.notes[0].updatedAt, NOW + 1000);assert.equal(second.data.notes[0].shareWithAI, true);
  second.data.notes[0].title = 'only in memory';assert.equal(store.read().data.notes[0].title, '另一条想法');
  assert.equal(JSON.parse(memory.peek(COMPANION_KEY)).notes[0].shareWithAI, true);
  assert.equal(store.mutate({type: 'note.remove', id: first.id}).data.notes.length, 0);
});

test('each write reads current storage so independent tabs preserve one another’s records', () => {
  const memory = storage(), first = createCompanionStore(memory, {now: () => NOW, id: () => 'tab-one'}), second = createCompanionStore(memory, {now: () => NOW + 1, id: () => 'tab-two'});
  first.read();second.read();first.mutate(note({title: 'first'}));second.mutate(note({title: 'second'}));
  const result = first.mutate(note({id: 'tab-one', title: 'first edited', shareWithAI: true}));
  assert.equal(result.data.notes.length, 2);assert.equal(result.data.notes.find(item => item.id === 'tab-two').title, 'second');
  assert.equal(result.data.notes.find(item => item.id === 'tab-one').createdAt, NOW);
});

test('an explicit missing note or reminder id never creates a replacement record', () => {
  const {memory, store} = fixture();store.mutate(note());store.mutate(reminder());
  const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
  for (const operation of [note({id: 'unknown'}), reminder({id: 'unknown'})]) {
    const result = store.mutate(operation);
    assert.equal(result.ok, false);assert.equal(result.changed, false);assert.equal(result.errorCode, 'record_missing');
    assert.equal(memory.peek(COMPANION_KEY), original);
  }
  assert.equal(memory.writes.length, writes);
});

test('saving stale forms after another tab deletes a record does not resurrect it', () => {
  for (const kind of ['note', 'reminder']) {
    const {memory, store} = fixture(), key = kind === 'note' ? 'notes' : 'reminders';
    const saved = store.mutate(kind === 'note' ? note() : reminder()).data[key][0];
    const anotherTab = createCompanionStore(memory, {now: () => NOW, id: () => 'another'});
    assert.equal(anotherTab.mutate({type: `${kind}.remove`, id: saved.id}).ok, true);
    const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
    const expected = kind === 'note' ? noteBaseline(saved) : reminderBaseline(saved);
    const operation = kind === 'note' ? note({id: saved.id, title: '旧页面的修改', expected}) : reminder({id: saved.id, title: '旧页面的修改', expected});
    const result = store.mutate(operation);
    assert.equal(result.errorCode, 'record_missing');assert.equal(result.changed, false);assert.equal(result.data[key].length, 0);
    assert.equal(memory.peek(COMPANION_KEY), original);assert.equal(memory.writes.length, writes);
    // Explicitly creating a separate copy is still available without the old id/baseline.
    assert.equal(store.mutate(kind === 'note' ? note({title: '另存副本'}) : reminder({title: '另存副本'})).ok, true);
  }
});

test('note baselines detect title, paragraph and AI consent changes within the same millisecond', () => {
  for (const change of [{title: '另页的新标题'}, {body: '另页的新正文'}, {shareWithAI: true}]) {
    const {memory, store} = fixture(), saved = store.mutate(note()).data.notes[0], expected = noteBaseline(saved);
    const anotherTab = createCompanionStore(memory, {now: () => NOW, id: () => 'another'});
    const latest = anotherTab.mutate({...noteBaseline(saved), type: 'note.upsert', id: saved.id, ...change});
    assert.equal(latest.data.notes[0].updatedAt, saved.updatedAt);
    const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
    const result = store.mutate(note({id: saved.id, title: '旧表单保存', expected}));
    assert.equal(result.ok, false);assert.equal(result.changed, false);assert.equal(result.errorCode, 'record_conflict');
    assert.deepEqual(result.data.notes, latest.data.notes);assert.equal(memory.peek(COMPANION_KEY), original);assert.equal(memory.writes.length, writes);
    assert.deepEqual(expected, noteBaseline(saved));
  }
});

test('reminder baselines protect changed title, date and completion status in another tab', () => {
  for (const change of [{title: '另页的新提醒'}, {dueAt: NOW + 60000}, {complete: true}]) {
    const {memory, store} = fixture(), saved = store.mutate(reminder()).data.reminders[0], expected = reminderBaseline(saved);
    const anotherTab = createCompanionStore(memory, {now: () => NOW, id: () => 'another'});
    const latest = anotherTab.mutate(change.complete ? {type: 'reminder.complete', id: saved.id} : reminder({id: saved.id, ...change}));
    assert.equal(latest.data.reminders[0].updatedAt, saved.updatedAt);
    const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
    const result = store.mutate(reminder({id: saved.id, title: '旧表单保存', expected}));
    assert.equal(result.ok, false);assert.equal(result.changed, false);assert.equal(result.errorCode, 'record_conflict');
    assert.deepEqual(result.data.reminders, latest.data.reminders);assert.equal(memory.peek(COMPANION_KEY), original);assert.equal(memory.writes.length, writes);
  }
});

test('malformed edit baselines are rejected without changing the existing record', () => {
  for (const kind of ['note', 'reminder']) {
    const {memory, store} = fixture(), saved = store.mutate(kind === 'note' ? note() : reminder()).data[kind === 'note' ? 'notes' : 'reminders'][0];
    const baseline = kind === 'note' ? noteBaseline(saved) : reminderBaseline(saved);
    const invalid = [null, undefined, false, [], {}, {...baseline, title: ''}, {...baseline, title: ' 不规范 '},
      ...(kind === 'note' ? [{...baseline, body: null}, {...baseline, body: 'x'.repeat(10001)}, {...baseline, shareWithAI: 'true'}] :
        [{...baseline, dueAt: NaN}, {...baseline, dueAt: 'tomorrow'}, {...baseline, status: 'unknown'}])];
    const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
    for (const expected of invalid) {
      const operation = kind === 'note' ? note({id: saved.id, title: '未保存', expected}) : reminder({id: saved.id, title: '未保存', expected});
      const result = store.mutate(operation);assert.equal(result.errorCode, 'record_conflict');assert.equal(result.changed, false);
      assert.equal(memory.peek(COMPANION_KEY), original);
    }
    assert.equal(memory.writes.length, writes);
  }
});

test('a claimed reminder can still save a title edit with its opening baseline', () => {
  const {memory, store, advance} = fixture(), saved = store.mutate(reminder({dueAt: NOW})).data.reminders[0], expected = reminderBaseline(saved);
  advance();const claimed = store.mutate({type: 'reminder.claim', id: saved.id}).data.reminders[0];
  assert.notEqual(claimed.updatedAt, saved.updatedAt);assert.equal(claimed.firedAt, NOW + 1000);
  const edited = store.mutate(reminder({id: saved.id, dueAt: NOW, title: '只改标题', expected}));
  assert.equal(edited.ok, true);assert.equal(edited.changed, true);assert.equal(edited.data.reminders[0].title, '只改标题');
  assert.equal(edited.data.reminders[0].firedAt, claimed.firedAt);assert.equal(edited.data.reminders[0].status, 'pending');
  assert.equal(store.mutate({type: 'reminder.claim', id: saved.id}).changed, false);
  assert.equal(JSON.parse(memory.peek(COMPANION_KEY)).reminders[0].firedAt, claimed.firedAt);
});

test('matching editable baselines ignore metadata updates and keep unrelated newer records', () => {
  const {memory, store, advance} = fixture(), saved = store.mutate(note()).data.notes[0], expected = noteBaseline(saved);
  advance();store.mutate({type: 'note.upsert', id: saved.id, ...expected});
  store.mutate(note({title: '另页新增的笔记'}));
  const edited = store.mutate(note({id: saved.id, title: '允许保存', expected}));
  assert.equal(edited.ok, true);assert.equal(edited.data.notes.length, 2);assert.ok(edited.data.notes.some(item => item.title === '另页新增的笔记'));
  assert.equal(edited.data.notes.find(item => item.id === saved.id).createdAt, saved.createdAt);
  assert.equal(memory.writes.at(-1).key, COMPANION_KEY);
});

test('ordinary existing-id edits remain compatible while creation cannot carry an edit baseline', () => {
  const {memory, store} = fixture(), saved = store.mutate(note()).data.notes[0];
  assert.equal(store.mutate(note({id: saved.id, title: '兼容旧调用'})).ok, true);
  const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
  const result = store.mutate(note({title: '意外创建', expected: noteBaseline(saved)}));
  assert.equal(result.errorCode, 'record_conflict');assert.equal(memory.peek(COMPANION_KEY), original);assert.equal(memory.writes.length, writes);
});

test('malformed, oversized, duplicate or incompatible storage is preserved byte for byte', () => {
  const validNote = {id: 'saved', title: '保存', body: '', shareWithAI: false, createdAt: NOW, updatedAt: NOW};
  const badValues = ['', '{broken', 'null', '[]', JSON.stringify({...blank(), version: 2}), JSON.stringify({...blank(), notes: null}),
    JSON.stringify({...blank(), notes: [validNote, validNote]}), JSON.stringify({...blank(), notes: [{...validNote, shareWithAI: 'yes'}]}),
    JSON.stringify({...blank(), notes: [{...validNote, body: 'x'.repeat(COMPANION_LIMITS.body + 1)}]}), 'x'.repeat(20000001)];
  for (const raw of badValues) {
    const {memory, store} = fixture({[COMPANION_KEY]: raw});
    assert.equal(store.read().ok, false);const mutation = store.mutate(note());assert.equal(mutation.ok, false);assert.equal(mutation.changed, false);
    assert.match(mutation.error, /已保留/);assert.equal(memory.peek(COMPANION_KEY), raw);assert.equal(memory.writes.length, 0);
  }
});

test('invalid or oversized mutation text is rejected without silently truncating', () => {
  const {memory, store} = fixture();store.mutate(note());const original = memory.peek(COMPANION_KEY), writes = memory.writes.length;
  for (const op of [note({title: ''}), note({title: '🧸'.repeat(101)}), note({body: 'x'.repeat(10001)}), note({body: '\u0000'}), note({shareWithAI: undefined}), note({id: '../bad'}),
    {type: 'message.add', role: 'system', text: 'hidden prompt'}, {type: 'message.add', role: 'user', text: 'a'.repeat(12001)}, {type: 'memory.add', kind: 'unknown', title: 'wrong'}, {type: 'unsupported'}]) {
    const result = store.mutate(op);assert.equal(result.ok, false);assert.equal(result.changed, false);assert.equal(memory.peek(COMPANION_KEY), original);
  }
  assert.equal(memory.writes.length, writes);
  assert.equal(store.mutate(note({title: '🧸'.repeat(100), body: ''})).ok, true);
});

test('due reminder claims are persisted once across tabs and never fire early', () => {
  const {memory, store, advance} = fixture();const saved = store.mutate(reminder()).data.reminders[0];
  assert.equal(store.mutate({type: 'reminder.claim', id: saved.id}).changed, false);assert.equal(store.read().data.reminders[0].firedAt, null);
  advance();const claim = store.mutate({type: 'reminder.claim', id: saved.id});assert.equal(claim.changed, true);assert.equal(claim.data.reminders[0].firedAt, NOW + 1000);
  const anotherTab = createCompanionStore(memory, {now: () => NOW + 1001, id: () => 'another'});
  assert.equal(anotherTab.mutate({type: 'reminder.claim', id: saved.id}).changed, false);assert.equal(anotherTab.read().data.reminders[0].firedAt, NOW + 1000);
});

test('snooze clears a previous claim; complete is idempotent and suppresses future claims', () => {
  const {store, advance} = fixture();const saved = store.mutate(reminder({dueAt: NOW})).data.reminders[0];store.mutate({type: 'reminder.claim', id: saved.id});
  const snoozed = store.mutate({type: 'reminder.snooze', id: saved.id, dueAt: NOW + 60000}).data.reminders[0];assert.equal(snoozed.status, 'pending');assert.equal(snoozed.firedAt, null);
  assert.equal(store.mutate({type: 'reminder.claim', id: saved.id}).changed, false);
  advance(60000);assert.equal(store.mutate({type: 'reminder.claim', id: saved.id}).changed, true);
  const completed = store.mutate({type: 'reminder.complete', id: saved.id});assert.equal(completed.data.reminders[0].completedAt, NOW + 60000);
  advance();assert.equal(store.mutate({type: 'reminder.complete', id: saved.id}).changed, false);assert.equal(store.mutate({type: 'reminder.claim', id: saved.id}).changed, false);
  assert.equal(store.mutate({type: 'reminder.remove', id: saved.id}).data.reminders.length, 0);
});

test('editing a title preserves reminder completion; changing its date schedules a new occurrence', () => {
  const {store} = fixture();const saved = store.mutate(reminder({dueAt: NOW})).data.reminders[0];store.mutate({type: 'reminder.claim', id: saved.id});store.mutate({type: 'reminder.complete', id: saved.id});
  const sameDate = store.mutate(reminder({id: saved.id, title: '改标题', dueAt: NOW})).data.reminders[0];assert.equal(sameDate.status, 'completed');assert.equal(sameDate.firedAt, NOW);
  const changedDate = store.mutate(reminder({id: saved.id, dueAt: NOW + 10000})).data.reminders[0];assert.equal(changedDate.status, 'pending');assert.equal(changedDate.firedAt, null);assert.equal(changedDate.completedAt, null);
  assert.equal(changedDate.createdAt, NOW);
});

test('reminder date validation accepts real Date boundaries and rejects noninteger or invalid dates', () => {
  const {store} = fixture();
  for (const dueAt of [NaN, Infinity, 1.5, 'tomorrow', null, 8.64e15 + 1, -8.64e15 - 1]) assert.equal(store.mutate(reminder({dueAt})).ok, false);
  for (const dueAt of [-8.64e15, -1, 0, 8.64e15]) assert.equal(store.mutate(reminder({dueAt})).ok, true);
});

test('memory events dedupe and milestones reflect shared activity without streak requirements', () => {
  const {store, advance} = fixture();assert.equal(growthSummary(store.read().data).level, 1);
  const greeting = {type: 'memory.add', kind: 'hello', title: '第一次打招呼', eventId: 'hello:first'};
  assert.equal(store.mutate(greeting).changed, true);assert.equal(store.mutate(greeting).changed, false);assert.equal(growthSummary(store.read().data).level, 2);
  const saved = store.mutate(note()).data.notes[0];store.mutate({type: 'memory.add', kind: 'note', title: '保存了一条笔记', eventId: `note:${saved.id}`});
  assert.equal(growthSummary(store.read().data).level, 3);store.mutate({type: 'note.remove', id: saved.id});assert.equal(growthSummary(store.read().data).level, 3);
  advance(1000 * 60 * 60 * 24 * 120);store.mutate({type: 'memory.add', kind: 'play', title: '一起玩球', eventId: 'play:first'});
  const growth = growthSummary(store.read().data);assert.equal(growth.level, 4);assert.ok(growth.milestones.every(item => item.done));assert.equal(growth.counts.play, 1);
  const id = store.read().data.memories.find(item => item.kind === 'play').id;store.mutate({type: 'memory.remove', id});assert.equal(store.read().data.memories.some(item => item.id === id), false);
});

test('completed reminders can satisfy the shared activity milestone', () => {
  const {store} = fixture();const saved = store.mutate(reminder()).data.reminders[0];store.mutate({type: 'reminder.complete', id: saved.id});
  const summary = growthSummary(store.read().data);assert.equal(summary.counts.completedReminders, 1);assert.equal(summary.milestones.find(item => item.id === 'shared').done, true);
});

test('conversation keeps only the latest 100 messages in chronological order and can clear independently', () => {
  const {store, advance} = fixture();store.mutate(note());
  for (let index = 0; index < 103; index++) {advance(1);assert.equal(store.mutate({type: 'message.add', role: index % 2 ? 'assistant' : 'user', text: `message ${index}`}).ok, true);}
  const messages = store.read().data.messages;assert.equal(messages.length, 100);assert.equal(messages[0].text, 'message 3');assert.equal(messages.at(-1).text, 'message 102');
  assert.ok(messages.every((item, index) => !index || item.createdAt >= messages[index - 1].createdAt));
  const cleared = store.mutate({type: 'message.clear'});assert.equal(cleared.data.messages.length, 0);assert.equal(cleared.data.notes.length, 1);assert.equal(store.mutate({type: 'message.clear'}).changed, false);
});

test('capacity never removes personal notes; existing notes remain editable at capacity', () => {
  const notes = Array.from({length: 500}, (_, index) => ({id: `saved-${index}`, title: `note ${index}`, body: '', shareWithAI: false, createdAt: NOW, updatedAt: NOW}));
  const {memory, store} = fixture({[COMPANION_KEY]: JSON.stringify({...blank(), notes})});const original = memory.peek(COMPANION_KEY);
  const full = store.mutate(note());assert.equal(full.ok, false);assert.match(full.error, /500/);assert.equal(memory.peek(COMPANION_KEY), original);
  const update = store.mutate(note({id: 'saved-0', title: 'updated'}));assert.equal(update.ok, true);assert.equal(update.data.notes.length, 500);
});

test('read and quota failures report truthful failure with no apparent unsaved changes', () => {
  const inaccessible = createCompanionStore({getItem() {throw new Error('denied');}});assert.equal(inaccessible.read().ok, false);assert.equal(inaccessible.mutate(note()).changed, false);
  const raw = JSON.stringify(blank());const full = createCompanionStore({getItem() {return raw;}, setItem() {throw new Error('quota');}}, {now: () => NOW, id: () => 'new'});
  const result = full.mutate(note());assert.equal(result.ok, false);assert.equal(result.changed, false);assert.deepEqual(result.data, blank());assert.match(result.error, /尚未保存/);
});

test('backups preserve full data, Markdown escapes user HTML and records sharing consent', () => {
  const {store} = fixture();store.mutate(note({title: '<script>标题</script>', body: '待办\n- 一点想法'}));store.mutate(reminder());store.mutate({type: 'memory.add', kind: 'hello', title: '第一次相遇'});
  const data = store.read().data;assert.deepEqual(JSON.parse(exportCompanion(data)), data);
  const text = companionMarkdown(data);assert.match(text, /AI 使用：未授权/);assert.ok(text.includes('&lt;script&gt;'));assert.ok(!text.includes('<script>'));assert.match(text, /\[ \] 检查方案/);assert.match(text, /第一次相遇/);
  assert.throws(() => exportCompanion({version: 2}));assert.throws(() => companionMarkdown(null));
});
