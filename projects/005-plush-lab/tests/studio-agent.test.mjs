import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPANION_KEY, createCompanionStore} from '../src/companion-store.js';
import {STUDIO_AGENT_TASKS, runStudioAgentTask} from '../src/studio-agent.js';

const NOW = Date.UTC(2026, 9, 2, 8, 0, 0, 123);
const immediately = async () => {};
const empty = () => ({version: 1, notes: [], reminders: [], messages: [], memories: []});
function fixture() {
  const values = new Map(), writes = [];let clock = NOW, sequence = 0;
  const storage = {getItem: key => values.get(key) ?? null, setItem(key, value) {writes.push({key, value});values.set(key, value);}};
  const store = createCompanionStore(storage, {now: () => clock, id: () => `record-${++sequence}`});
  const add = operation => {const result = store.mutate(operation);assert.equal(result.ok, true, result.error);return result;};
  return {store, storage, values, writes, add, advance(ms) {clock += ms;return clock;}, note(title = '创作想法', body = '第一段\n第二段', shareWithAI = false) {
    return add({type: 'note.upsert', title, body, shareWithAI}).data.notes[0];
  }, reminder(title, dueAt) {return add({type: 'reminder.upsert', title, dueAt}).data.reminders.find(item => item.title === title);}};
}
const run = (taskId, readStore, options = {}) => runStudioAgentTask({taskId, readStore, now: NOW, yieldControl: immediately, ...options});
const rejection = code => error => error.code === code;

test('the three task definitions expose three immutable visible tool steps', () => {
  assert.deepEqual(STUDIO_AGENT_TASKS.map(item => item.id), ['notes_digest', 'reminders_check', 'studio_overview']);
  for (const task of STUDIO_AGENT_TASKS) {
    assert.equal(task.steps.length, 3);assert.equal(Object.isFrozen(task), true);
    assert.deepEqual(task.steps.map(item => item.id), ['read_records', 'organize_records', 'build_result']);
    assert.ok(task.steps.every(item => item.title && item.tool && Object.isFrozen(item)));
  }
});

test('notes_digest reads actual local notes once and returns a draft without storage or network writes', async () => {
  const f = fixture();f.note('私密想法', '想做毛绒外套', false);f.advance(1000);f.note('公开想法', '想搭配房间灯光', true);
  f.values.set('plush-lab-draft-v1', 'old creation');f.values.set('plush-world-collection-v1', 'old worlds');
  const raw = f.values.get(COMPANION_KEY), writeCount = f.writes.length;let reads = 0, network = 0;
  const originalFetch = globalThis.fetch;globalThis.fetch = () => {network++;throw Error('No network allowed');};
  let result;
  try {result = await run('notes_digest', () => {reads++;return f.store.read();});} finally {globalThis.fetch = originalFetch;}
  assert.equal(reads, 1);assert.equal(network, 0);assert.equal(f.writes.length, writeCount);assert.equal(f.values.get(COMPANION_KEY), raw);
  assert.equal(f.values.get('plush-lab-draft-v1'), 'old creation');assert.equal(f.values.get('plush-world-collection-v1'), 'old worlds');
  assert.match(result.body, /私密想法/);assert.match(result.body, /想做毛绒外套/);assert.match(result.body, /公开想法/);
  assert.match(result.summary, /共有 2 条笔记/);assert.match(result.summary, /1 条允许 AI 使用/);
  assert.equal(result.body, result.noteDraft.body);assert.match(result.noteDraft.title, /2026-10-02/);
  assert.match(result.body, /本地固定流程/);assert.match(result.body, /未进行 AI 推理/);assert.match(result.body, /2026-10-02T08:00:00\.123Z/);
  assert.ok(result.body.indexOf('公开想法') < result.body.indexOf('私密想法'));
});

test('a new run sees notes added or deleted by another tab instead of reusing a cached report', async () => {
  const f = fixture(), first = f.note('第一个记录');
  const before = await run('notes_digest', f.store.read);assert.match(before.body, /第一个记录/);
  const another = createCompanionStore(f.storage, {now: () => NOW, id: () => 'other-tab'});
  assert.equal(another.mutate({type: 'note.remove', id: first.id}).ok, true);
  assert.equal(another.mutate({type: 'note.upsert', title: '另页新记录', body: '最新内容', shareWithAI: false}).ok, true);
  const after = await run('notes_digest', f.store.read);assert.match(after.body, /另页新记录/);assert.doesNotMatch(after.body, /第一个记录/);
});

test('one run retains its copied snapshot when source data changes after the read step', async () => {
  const f = fixture(), saved = f.note('读取时的标题', '读取时的正文'), source = f.store.read();let reads = 0;
  const result = await run('notes_digest', () => {reads++;return source;}, {onEvent(event) {
    if (event.type === 'step' && event.stepId === 'read_records' && event.status === 'completed') {
      source.data.notes[0].title = '回调修改标题';f.add({type: 'note.remove', id: saved.id});
    }
  }});
  assert.equal(reads, 1);assert.match(result.body, /读取时的标题/);assert.doesNotMatch(result.body, /回调修改标题/);assert.equal(f.store.read().data.notes.length, 0);
});

test('reminders_check classifies the exact due boundary, claimed pending, future and completed records', async () => {
  const f = fixture();f.reminder('正好到期', NOW);const notified = f.reminder('已提示还没完成', NOW - 1000);
  f.add({type: 'reminder.claim', id: notified.id});f.reminder('很久以后', NOW + 86400001);f.reminder('明天以内', NOW + 60000);
  const complete = f.reminder('提前已完成', NOW + 1000);f.add({type: 'reminder.complete', id: complete.id});
  const raw = f.values.get(COMPANION_KEY), writes = f.writes.length, result = await run('reminders_check', f.store.read);
  assert.match(result.summary, /到期未完成 2 条（其中已提示 1 条），未来 2 条，已完成 1 条/);
  assert.match(result.body, /未来 24 小时内：1/);assert.match(result.body, /到期 · 尚未提示（1 条）/);
  assert.match(result.body, /到期 · 已提示但未完成（1 条）/);assert.match(result.body, /未来 · 待完成（2 条）/);
  assert.match(result.body, /已完成（1 条）/);assert.equal(f.values.get(COMPANION_KEY), raw);assert.equal(f.writes.length, writes);
  assert.equal(f.store.read().data.reminders.find(item => item.title === '正好到期').firedAt, null);
});

test('snoozing and completing reminders changes the next report according to actual store semantics', async () => {
  const f = fixture(), item = f.reminder('喝水', NOW - 10);f.add({type: 'reminder.claim', id: item.id});
  assert.match((await run('reminders_check', f.store.read)).summary, /到期未完成 1 条（其中已提示 1 条）/);
  f.add({type: 'reminder.snooze', id: item.id, dueAt: NOW + 60000});
  assert.match((await run('reminders_check', f.store.read)).summary, /到期未完成 0 条（其中已提示 0 条），未来 1 条/);
  f.add({type: 'reminder.complete', id: item.id});
  assert.match((await run('reminders_check', f.store.read)).summary, /未来 0 条，已完成 1 条/);
});

test('studio_overview counts saved activity and milestone growth without including chat contents', async () => {
  const f = fixture();f.note('今天的记录');f.add({type: 'message.add', role: 'user', text: '此对话正文不应进概览'});
  f.add({type: 'message.add', role: 'assistant', text: '伙伴的对话正文也不应进概览'});
  f.add({type: 'memory.add', kind: 'hello', title: '第一次打招呼', eventId: 'hello-1'});
  f.add({type: 'memory.add', kind: 'play', title: '一起玩球', eventId: 'play-1'});
  const result = await run('studio_overview', f.store.read);
  assert.match(result.summary, /1 条笔记、0 条提醒、2 条对话和 2 条回忆/);assert.match(result.summary, /共同成长/);
  assert.match(result.body, /相遇 1、玩耍 1、笔记 0、完成提醒 0/);assert.match(result.body, /用户 1 条，伙伴 1 条/);
  assert.match(result.body, /\[x\] 第一次相遇/);assert.match(result.body, /一起玩球/);assert.doesNotMatch(result.body, /此对话正文不应进概览|伙伴的对话正文也不应进概览/);
  assert.match(result.body, /不统计或改写旧毛绒创作/);
});

test('empty valid storage produces truthful empty reports for all three local tasks', async () => {
  for (const task of STUDIO_AGENT_TASKS) {
    const result = await run(task.id, () => ({ok: true, data: empty()}));
    assert.equal(result.taskId, task.id);assert.ok(result.body.length);assert.ok(result.noteDraft.body.length);
    assert.doesNotMatch(result.body, /\[x\]/);
  }
});

test('a failed real store read stops at the reading step and preserves damaged bytes', async () => {
  const f = fixture();f.values.set(COMPANION_KEY, '{broken JSON');const events = [], writes = f.writes.length;
  await assert.rejects(run('notes_digest', f.store.read, {onEvent: event => events.push(event)}), rejection('read_failed'));
  assert.equal(f.values.get(COMPANION_KEY), '{broken JSON');assert.equal(f.writes.length, writes);
  assert.deepEqual(events.map(event => event.type), ['started', 'step', 'step', 'failed']);
  assert.equal(events[2].status, 'failed');assert.equal(events[2].stepId, 'read_records');assert.equal(events[3].errorCode, 'read_failed');
  assert.ok(events.every(event => event.type !== 'completed'));
});

test('throwing or asynchronously rejecting reads fail without interpreting records as empty', async () => {
  for (const readStore of [() => {throw Error('storage permission denied');}, async () => {throw Error('read rejected');}, () => ({ok: false, data: empty(), error: '权限受限'})]) {
    await assert.rejects(run('studio_overview', readStore), rejection('read_failed'));
  }
});

test('malformed successful read data is rejected instead of producing an empty or partial report', async () => {
  const cases = [undefined, null, {}, {...empty(), version: 2}, {...empty(), notes: null}, {...empty(), reminders: [{id: 'fake', title: 'bad'}]},
    {...empty(), notes: Array.from({length: 501}, () => ({}))}];
  for (const data of cases) await assert.rejects(run('studio_overview', () => ({ok: true, data})), rejection('invalid_data'));
});

test('invalid task ids and input functions fail before any record read', async () => {
  let reads = 0;const events = [], readStore = () => {reads++;return {ok: true, data: empty()};};
  await assert.rejects(run('not-a-task', readStore, {onEvent: event => events.push(event)}), rejection('unknown_task'));
  assert.equal(reads, 0);assert.deepEqual(events.map(event => event.type), ['failed']);
  await assert.rejects(runStudioAgentTask({taskId: 'notes_digest'}), rejection('invalid_input'));
  await assert.rejects(run('notes_digest', readStore, {yieldControl: null}), rejection('invalid_input'));
  await assert.rejects(run('notes_digest', readStore, {signal: {aborted: false}}), rejection('invalid_input'));
  assert.equal(reads, 0);
});

test('the clock is captured once, is validated and uses ISO UTC for deterministic reports', async () => {
  const f = fixture();f.note();let clocks = 0;
  const one = await run('notes_digest', f.store.read, {now: () => {clocks++;return NOW;}});
  const two = await run('notes_digest', f.store.read, {now: NOW});assert.deepEqual(one, two);assert.equal(clocks, 1);
  for (const now of [NaN, Infinity, -1, 1.5, 8.64e15 + 1, 'today']) await assert.rejects(run('notes_digest', f.store.read, {now}), rejection('invalid_time'));
  assert.match((await run('studio_overview', () => ({ok: true, data: empty()}), {now: 8.64e15})).body, /\+275760-09-13/);
});

test('successful event order matches visible task steps and yields exactly twice with transition details', async () => {
  const events = [], yields = [];
  const result = await run('notes_digest', () => ({ok: true, data: empty()}), {onEvent: event => events.push(event), yieldControl: async transition => yields.push(transition)});
  assert.deepEqual(events.map(event => event.type), ['started', 'step', 'step', 'step', 'step', 'step', 'step', 'completed']);
  assert.deepEqual(events.filter(event => event.type === 'step').map(event => [event.stepId, event.status]), [
    ['read_records', 'running'], ['read_records', 'completed'], ['organize_records', 'running'], ['organize_records', 'completed'], ['build_result', 'running'], ['build_result', 'completed']]);
  assert.deepEqual(yields, [{taskId: 'notes_digest', completedStepId: 'read_records', nextStepId: 'organize_records'},
    {taskId: 'notes_digest', completedStepId: 'organize_records', nextStepId: 'build_result'}]);
  for (const event of events.filter(event => event.type === 'step')) assert.equal(event.tool, STUDIO_AGENT_TASKS[0].steps.find(step => step.id === event.stepId).tool);
  assert.equal(events.at(-1).summary, result.summary);assert.ok(events.every(event => event.taskId === 'notes_digest'));
});

test('a pre-aborted task never starts or reads records and emits only cancelled', async () => {
  const controller = new AbortController();controller.abort();const events = [];let reads = 0;
  await assert.rejects(run('notes_digest', () => {reads++;return {ok: true, data: empty()};}, {signal: controller.signal, onEvent: event => events.push(event)}), error => error.name === 'AbortError' && error.code === 'cancelled');
  assert.equal(reads, 0);assert.deepEqual(events.map(event => event.type), ['cancelled']);
});

test('cancelling in any running step fails that step and prevents later steps or final completion', async () => {
  for (const cancelledStep of ['read_records', 'organize_records', 'build_result']) {
    const controller = new AbortController(), events = [];let reads = 0;
    await assert.rejects(run('notes_digest', () => {reads++;return {ok: true, data: empty()};}, {signal: controller.signal, onEvent(event) {
      events.push(event);if (event.type === 'step' && event.stepId === cancelledStep && event.status === 'running') controller.abort();
    }}), error => error.name === 'AbortError');
    assert.equal(events.at(-1).type, 'cancelled');assert.equal(events.at(-2).status, 'failed');assert.equal(events.at(-2).stepId, cancelledStep);
    assert.equal(reads, cancelledStep === 'read_records' ? 0 : 1);assert.ok(events.every(event => event.type !== 'completed'));
    const index = STUDIO_AGENT_TASKS[0].steps.findIndex(step => step.id === cancelledStep);
    assert.ok(events.filter(event => event.type === 'step').every(event => STUDIO_AGENT_TASKS[0].steps.findIndex(step => step.id === event.stepId) <= index));
  }
});

test('cancellation after an asynchronous read aborts before organizing, including an unresolved read', async () => {
  const controller = new AbortController(), events = [];
  await assert.rejects(run('notes_digest', async () => {controller.abort();return {ok: true, data: empty()};}, {signal: controller.signal, onEvent: event => events.push(event)}), error => error.name === 'AbortError');
  assert.ok(events.every(event => event.stepId !== 'organize_records'));
  const waiting = new AbortController();let finishRead;
  const pending = run('notes_digest', () => new Promise(resolve => {finishRead = resolve;}), {signal: waiting.signal});
  waiting.abort();await assert.rejects(pending, error => error.name === 'AbortError');finishRead({ok: true, data: empty()});
});

test('manual stepping waits at actual step boundaries and can cancel an unresolved yield', async () => {
  const controller = new AbortController(), events = [];let resume;
  const pending = run('notes_digest', () => ({ok: true, data: empty()}), {signal: controller.signal, onEvent: event => events.push(event), yieldControl: () => new Promise(resolve => {resume = resolve;})});
  for (let index = 0; index < 8 && !resume; index++) await Promise.resolve();
  assert.equal(typeof resume, 'function');assert.equal(events.at(-1).stepId, 'read_records');assert.equal(events.at(-1).status, 'completed');
  controller.abort();await assert.rejects(pending, error => error.name === 'AbortError');resume();
  assert.ok(events.every(event => event.stepId !== 'organize_records'));assert.equal(events.at(-1).type, 'cancelled');
});

test('synchronous callback cancellation handles a returned rejected promise without an orphan rejection', async () => {
  const readAbort = new AbortController();
  await assert.rejects(run('notes_digest', () => {readAbort.abort();return Promise.reject(Error('cancelled read'));}, {signal: readAbort.signal}), error => error.name === 'AbortError');
  const yieldAbort = new AbortController();
  await assert.rejects(run('notes_digest', () => ({ok: true, data: empty()}), {signal: yieldAbort.signal, yieldControl() {
    yieldAbort.abort();return Promise.reject(Error('cancelled yield'));
  }}), error => error.name === 'AbortError');
  await new Promise(resolve => setTimeout(resolve, 0));
});

test('cancelling after the final step event still suppresses the final report event', async () => {
  const controller = new AbortController(), events = [];
  await assert.rejects(run('notes_digest', () => ({ok: true, data: empty()}), {signal: controller.signal, onEvent(event) {
    events.push(event);if (event.type === 'step' && event.stepId === 'build_result' && event.status === 'completed') controller.abort();
  }}), error => error.name === 'AbortError');
  assert.ok(events.every(event => event.type !== 'completed'));assert.equal(events.at(-1).type, 'cancelled');
});

test('a throwing event listener or yield fails truthfully and does not return a completed result', async () => {
  const events = [];
  await assert.rejects(run('notes_digest', () => ({ok: true, data: empty()}), {onEvent(event) {
    events.push(event);if (event.type === 'step' && event.status === 'running') throw Error('UI callback failed');
  }}), rejection('event_failed'));
  assert.equal(events.at(-1).type, 'failed');assert.ok(events.every(event => event.type !== 'completed'));
  await assert.rejects(run('notes_digest', () => ({ok: true, data: empty()}), {yieldControl: async () => {throw Error('yield failed');}}), rejection('task_failed'));
});

test('large note digests disclose selection, escape Markdown and retain complete Unicode characters within storage limits', async () => {
  const f = fixture();
  for (let index = 0; index < 30; index++) {f.advance(1);f.note(`标题${index} ` + '🧸'.repeat(90), '<script>alert(1)</script>\n# 注入标题\n[链接](https://example.com) ' + '🌈'.repeat(800));}
  const result = await run('notes_digest', f.store.read);
  assert.match(result.body, /选取最近 20 \/ 30 条/);assert.match(result.body, /正文片段最多 120 个字符/);assert.match(result.body, /…/);
  assert.doesNotMatch(result.body, /<script>/);assert.match(result.body, /&lt;script&gt;/);assert.doesNotMatch(result.body, /\n# 注入标题/);
  assert.ok(result.body.length <= 9000);assert.ok(result.summary.length <= 240);assert.ok(result.noteDraft.title.length <= 100);
  assert.equal(result.body.isWellFormed(), true);assert.equal(result.noteDraft.title.isWellFormed(), true);
  const saved = f.add({type: 'note.upsert', ...result.noteDraft, shareWithAI: false});assert.equal(saved.ok, true);
});

test('a legal 100-emoji title and 120-emoji excerpt use the same character count as the store', async () => {
  const f = fixture(), title = '🧸'.repeat(100), body = '🌈'.repeat(120);f.note(title, body);
  const result = await run('notes_digest', f.store.read);
  assert.ok(result.body.includes(title));assert.ok(result.body.includes(body));assert.match(result.body, /emoji 算一个字符/);
  f.note('更长的正文', '🌈'.repeat(121));
  assert.ok((await run('notes_digest', f.store.read)).body.includes('正文片段：' + '🌈'.repeat(119) + '…'));
});

test('large reminder reports disclose omitted rows and the final output ceiling instead of implying a complete list', async () => {
  const f = fixture();
  for (let index = 0; index < 52; index++) {
    const title = `${index} ` + '<'.repeat(95), item = f.reminder(title, index < 26 ? NOW - index - 1 : NOW + index + 1);
    if (index >= 13 && index < 26) f.add({type: 'reminder.claim', id: item.id});
    if (index >= 39) f.add({type: 'reminder.complete', id: item.id});
  }
  const result = await run('reminders_check', f.store.read);
  assert.match(result.body, /提醒总数：52/);assert.match(result.body, /选取 12 \/ 13 条/);assert.match(result.body, /正文达到显示上限，后续内容未展示/);
  assert.ok(result.body.length <= 9000);assert.equal(result.body.isWellFormed(), true);
});

test('same-time records have deterministic id ordering without changing the input arrays', async () => {
  const f = fixture();f.note('记录一');f.note('记录二');const read = f.store.read(), original = JSON.stringify(read.data);
  read.data.notes.reverse();const reversed = JSON.stringify(read.data);
  const first = await run('notes_digest', () => read), second = await run('notes_digest', f.store.read);
  assert.deepEqual(first, second);assert.equal(JSON.stringify(read.data), reversed);assert.notEqual(reversed, original);
});
