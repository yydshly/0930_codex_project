export const COMPANION_KEY = 'plush-companion-studio-v1';
export const COMPANION_LIMITS = Object.freeze({notes: 500, reminders: 500, messages: 100, memories: 500, title: 100, body: 10000, message: 12000});

const MAX_TIME = 8.64e15;
const MAX_STORAGE = 20000000;
const KINDS = ['hello', 'play', 'note', 'reminder'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validTime = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME;
const validDateTime = value => Number.isSafeInteger(value) && Math.abs(value) <= MAX_TIME;
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const empty = () => ({version: 1, notes: [], reminders: [], messages: [], memories: []});
const ok = data => ({ok: true, data});
const fail = (data, error) => ({ok: false, data, error});
const copy = value => JSON.parse(JSON.stringify(value));
const recordError = (message, errorCode) => Object.assign(new Error(message), {errorCode});

// Reject oversized input instead of quietly dropping the user's text.
function checkedText(value, maximum, {allowEmpty = false, multiline = false} = {}) {
  if (typeof value !== 'string') throw new Error('请输入文本内容。');
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  const controls = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/;
  if (controls.test(normalized)) throw new Error('内容包含无法保存的控制字符。');
  if ((!allowEmpty && !normalized) || Array.from(normalized).length > maximum) throw new Error(`内容不能为空且不能超过 ${maximum} 个字符。`);
  return normalized;
}

function storedText(value, maximum, options) {
  try {return checkedText(value, maximum, options) === value;} catch {return false;}
}

function validData(data) {
  if (!record(data) || data.version !== 1) return false;
  for (const key of ['notes', 'reminders', 'messages', 'memories']) {
    if (!Array.isArray(data[key]) || data[key].length > COMPANION_LIMITS[key]) return false;
    const seen = new Set();
    for (const item of data[key]) {
      if (!record(item) || !validId(item.id) || seen.has(item.id) || !validTime(item.createdAt)) return false;
      seen.add(item.id);
      if (key === 'messages') {
        if (!['user', 'assistant'].includes(item.role) || !storedText(item.text, COMPANION_LIMITS.message, {multiline: true})) return false;
      } else {
        if (!storedText(item.title, COMPANION_LIMITS.title)) return false;
        if (key === 'memories') {
          if (!KINDS.includes(item.kind) || (item.eventId !== null && !storedText(item.eventId, 200))) return false;
        } else {
          if (!validTime(item.updatedAt) || item.updatedAt < item.createdAt) return false;
          if (key === 'notes') {
            if (!storedText(item.body, COMPANION_LIMITS.body, {allowEmpty: true, multiline: true}) || typeof item.shareWithAI !== 'boolean') return false;
          } else {
            if (!validDateTime(item.dueAt) || !['pending', 'completed'].includes(item.status) ||
              (item.firedAt !== null && !validTime(item.firedAt)) || (item.completedAt !== null && !validTime(item.completedAt))) return false;
            if ((item.status === 'pending') !== (item.completedAt === null) || (item.firedAt !== null && item.firedAt < item.dueAt)) return false;
            if ((item.firedAt !== null && item.firedAt > item.updatedAt) ||
              (item.completedAt !== null && (item.completedAt < item.createdAt || item.completedAt > item.updatedAt))) return false;
          }
        }
      }
    }
    if (key === 'memories') {
      const events = data.memories.map(item => item.eventId).filter(value => value !== null);
      if (new Set(events).size !== events.length) return false;
    }
  }
  return true;
}

/** Personal records use their own key. Every read is side effect free. */
export function createCompanionStore(storage, {now = () => Date.now(), id = () => globalThis.crypto.randomUUID()} = {}) {
  const read = () => {
    let raw;
    try {raw = storage.getItem(COMPANION_KEY);} catch {return fail(empty(), '无法读取陪伴记录，请检查浏览器存储权限。');}
    if (raw === null || raw === undefined) return ok(empty());
    if (typeof raw !== 'string' || !raw.length || raw.length > MAX_STORAGE) return fail(empty(), '陪伴记录格式损坏，原始数据已保留，未改写。');
    try {
      const data = JSON.parse(raw);
      if (!validData(data)) throw new Error('damaged');
      return ok(data);
    } catch {return fail(empty(), '陪伴记录格式损坏，原始数据已保留，未改写。');}
  };

  const mutateOperation = operation => {
    // Re-read immediately before writing, including for callbacks from older tabs.
    const current = read();
    if (!current.ok) return current;
    const data = copy(current.data);
    try {
      if (!record(operation) || typeof operation.type !== 'string') throw new Error('记录操作无效。');
      const time = now();
      if (!validTime(time)) throw new Error('当前时间无效，记录尚未保存。');
      const requiredId = () => {if (!validId(operation.id)) throw new Error('记录编号无效。');return operation.id;};
      const newId = key => {
        const value = operation.id === undefined ? id() : requiredId();
        if (!validId(value) || data[key].some(item => item.id === value)) throw new Error('记录编号无效或重复。');
        return value;
      };
      const existing = key => {
        const value = requiredId(), index = data[key].findIndex(item => item.id === value);
        if (index < 0) throw recordError('这条记录已被删除或已不存在，已删除状态保留；表单输入仍保留，可将内容另存为新记录。', 'record_missing');
        return {item: data[key][index], index};
      };
      const checkExpected = (previous, key) => {
        if (!Object.prototype.hasOwnProperty.call(operation, 'expected')) return;
        const expected = operation.expected;
        // Compare editable values, even for same-millisecond changes. Reminder
        // claims only update firedAt/updatedAt and do not invalidate an open form.
        const fields = key === 'notes' ? ['title', 'body', 'shareWithAI'] : ['title', 'dueAt', 'status'];
        const valid = record(expected) && storedText(expected.title, COMPANION_LIMITS.title) &&
          (key === 'notes' ? storedText(expected.body, COMPANION_LIMITS.body, {allowEmpty: true, multiline: true}) && typeof expected.shareWithAI === 'boolean' :
            validDateTime(expected.dueAt) && ['pending', 'completed'].includes(expected.status));
        if (!previous || !valid) throw recordError('编辑时的原记录无效，记录没有改写，表单输入仍保留；请重新打开记录，或将内容另存为新记录。', 'record_conflict');
        if (fields.some(field => expected[field] !== previous[field])) throw recordError('这条记录已在另一个页面修改，最新记录保持原样，表单输入仍保留；请查看最新记录，或将内容另存为新记录。', 'record_conflict');
      };
      const capacity = key => {if (data[key].length >= COMPANION_LIMITS[key]) throw new Error(`已保存 ${COMPANION_LIMITS[key]} 条记录；请更新已有记录或先导出备份。`);};
      const due = () => {if (!validDateTime(operation.dueAt)) throw new Error('提醒时间无效，请选择有效日期。');return operation.dueAt;};
      const updated = item => Math.max(item.updatedAt, item.createdAt, time);
      switch (operation.type) {
        case 'note.upsert': {
          const {item: previous, index} = operation.id === undefined ? {item: null, index: -1} : existing('notes');
          checkExpected(previous, 'notes');
          const title = checkedText(operation.title, COMPANION_LIMITS.title);
          const body = checkedText(operation.body, COMPANION_LIMITS.body, {allowEmpty: true, multiline: true});
          if (typeof operation.shareWithAI !== 'boolean') throw new Error('请选择是否允许 AI 使用这条笔记。');
          if (!previous) capacity('notes');
          const note = {id: previous?.id ?? newId('notes'), title, body, shareWithAI: operation.shareWithAI, createdAt: previous?.createdAt ?? time, updatedAt: previous ? updated(previous) : time};
          if (previous) data.notes.splice(index, 1);
          data.notes.unshift(note);
          data.notes.sort((a, b) => b.updatedAt - a.updatedAt);
          break;
        }
        case 'note.remove': {const {index} = existing('notes');data.notes.splice(index, 1);break;}
        case 'reminder.upsert': {
          const {item: previous, index} = operation.id === undefined ? {item: null, index: -1} : existing('reminders');
          checkExpected(previous, 'reminders');
          const title = checkedText(operation.title, COMPANION_LIMITS.title), dueAt = due();
          if (!previous) capacity('reminders');
          const unchangedDue = previous?.dueAt === dueAt;
          const reminder = {id: previous?.id ?? newId('reminders'), title, dueAt, status: unchangedDue ? previous.status : 'pending',
            createdAt: previous?.createdAt ?? time, updatedAt: previous ? updated(previous) : time,
            firedAt: unchangedDue ? previous.firedAt : null, completedAt: unchangedDue ? previous.completedAt : null};
          if (previous) data.reminders.splice(index, 1);
          data.reminders.push(reminder);
          data.reminders.sort((a, b) => a.dueAt - b.dueAt);
          break;
        }
        case 'reminder.complete': {
          const {item} = existing('reminders');
          if (item.status === 'completed') return current;
          item.status = 'completed';item.completedAt = Math.max(time, item.createdAt);item.updatedAt = updated(item);
          break;
        }
        case 'reminder.snooze': {
          const {item} = existing('reminders');
          item.dueAt = due();item.status = 'pending';item.firedAt = null;item.completedAt = null;item.updatedAt = updated(item);
          data.reminders.sort((a, b) => a.dueAt - b.dueAt);
          break;
        }
        case 'reminder.remove': {const {index} = existing('reminders');data.reminders.splice(index, 1);break;}
        case 'reminder.claim': {
          const {item} = existing('reminders');
          if (item.status !== 'pending' || item.dueAt > time || item.firedAt !== null) return current;
          item.firedAt = time;item.updatedAt = updated(item);
          break;
        }
        case 'message.add': {
          if (!['user', 'assistant'].includes(operation.role)) throw new Error('对话角色无效。');
          const text = checkedText(operation.text, COMPANION_LIMITS.message, {multiline: true});
          data.messages.push({id: newId('messages'), role: operation.role, text, createdAt: Math.max(time, data.messages.at(-1)?.createdAt ?? 0)});
          // The conversation window deliberately retains the latest 100 messages.
          data.messages = data.messages.slice(-COMPANION_LIMITS.messages);
          break;
        }
        case 'message.clear': data.messages = [];break;
        case 'memory.add': {
          if (!KINDS.includes(operation.kind)) throw new Error('回忆类型无效。');
          const title = checkedText(operation.title, COMPANION_LIMITS.title);
          const eventId = operation.eventId === undefined || operation.eventId === null ? null : checkedText(operation.eventId, 200);
          if (eventId !== null && data.memories.some(item => item.eventId === eventId)) return current;
          capacity('memories');
          data.memories.unshift({id: newId('memories'), kind: operation.kind, title, eventId, createdAt: time});
          data.memories.sort((a, b) => b.createdAt - a.createdAt);
          break;
        }
        case 'memory.remove': {const {index} = existing('memories');data.memories.splice(index, 1);break;}
        default: throw new Error('暂不支持这项记录操作。');
      }
      const serialized = JSON.stringify(data);
      if (serialized === JSON.stringify(current.data)) return current;
      if (serialized.length > MAX_STORAGE) throw new Error('陪伴记录超过本机容量，请先导出备份。');
      try {storage.setItem(COMPANION_KEY, serialized);} catch {return fail(current.data, '陪伴记录保存失败，可能是存储空间不足或权限受限；本次修改尚未保存。');}
      return {...ok(data), changed: true};
    } catch (error) {
      const result = fail(current.data, error instanceof Error ? error.message : '记录操作失败，本次修改尚未保存。');
      return error instanceof Error && ['record_conflict', 'record_missing'].includes(error.errorCode) ? {...result, errorCode: error.errorCode} : result;
    }
  };
  return {read, mutate: operation => ({changed: false, ...mutateOperation(operation)})};
}

/** Milestones use shared activities, without login streaks or missed-day penalties. */
export function growthSummary(data) {
  const source = validData(data) ? data : empty();
  const counts = {notes: source.notes.length, reminders: source.reminders.length, completedReminders: source.reminders.filter(item => item.status === 'completed').length, memories: source.memories.length};
  for (const kind of KINDS) counts[kind] = source.memories.filter(item => item.kind === kind).length;
  const milestones = [
    {id: 'hello', label: '第一次相遇', done: counts.hello > 0},
    {id: 'note', label: '保存第一条笔记', done: counts.notes > 0 || counts.note > 0},
    {id: 'shared', label: '一起玩耍或完成提醒', done: counts.play > 0 || counts.reminder > 0 || counts.completedReminders > 0},
  ];
  const level = 1 + milestones.filter(item => item.done).length;
  const label = ['初次相遇', '开始认识', '日常伙伴', '共同成长'][level - 1];
  return {level, label, milestones, counts, next: milestones.find(item => !item.done)?.label ?? '继续积累共同回忆'};
}

export function exportCompanion(data) {
  if (!validData(data)) throw new Error('陪伴记录无效，无法导出。');
  return JSON.stringify(data, null, 2) + '\n';
}

const markdown = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|]/g, '\\$&').replace(/^(\s*)([-=])/gm, '$1\\$2');
const date = time => new Date(time).toISOString();

export function companionMarkdown(data) {
  if (!validData(data)) throw new Error('陪伴记录无效，无法导出。');
  const lines = ['# 毛绒伙伴 · 陪伴记录', '', '记录保存在当前浏览器；AI 仅可使用你明确授权的笔记。', '', '## 我的笔记', ''];
  if (!data.notes.length) lines.push('暂无笔记。', '');
  for (const note of data.notes) lines.push(`### ${markdown(note.title)}`, '', `更新：${date(note.updatedAt)} · AI 使用：${note.shareWithAI ? '允许' : '未授权'}`, '', markdown(note.body), '');
  lines.push('## 提醒', '');
  if (!data.reminders.length) lines.push('暂无提醒。', '');
  for (const reminder of data.reminders) lines.push(`- [${reminder.status === 'completed' ? 'x' : ' '}] ${markdown(reminder.title)} · ${date(reminder.dueAt)}${reminder.completedAt !== null ? ` · 完成：${date(reminder.completedAt)}` : ''}`);
  lines.push('', '## 共同回忆', '');
  if (!data.memories.length) lines.push('暂无回忆。', '');
  const labels = {hello: '相遇', play: '玩耍', note: '笔记', reminder: '完成提醒'};
  for (const memory of data.memories) lines.push(`- ${date(memory.createdAt)} · ${labels[memory.kind]} · ${markdown(memory.title)}`);
  return lines.join('\n').trimEnd() + '\n';
}
