import {COMPANION_LIMITS, exportCompanion, growthSummary} from './companion-store.js';

const MAX_TIME = 8.64e15;
const BODY_LIMIT = 9000;
const SUMMARY_LIMIT = 240;
const NOTE_ROWS = 20;
const REMINDER_ROWS = 12;
const steps = tool => Object.freeze([
  Object.freeze({id: 'read_records', title: '读取真实陪伴记录', tool: 'companionStore.read'}),
  Object.freeze({id: 'organize_records', title: '按固定规则整理与计算', tool}),
  Object.freeze({id: 'build_result', title: '构造可保存的结果草稿', tool: 'local.result.compose'}),
]);

export const STUDIO_AGENT_TASKS = Object.freeze([
  Object.freeze({id: 'notes_digest', title: '整理我的笔记', description: '读取本机笔记，列出最近修改的内容片段及授权数量。', steps: steps('local.notes.digest')}),
  Object.freeze({id: 'reminders_check', title: '检查提醒安排', description: '依据真实时间和完成状态，区分到期、已提示、未来及已完成事项。', steps: steps('local.reminders.classify')}),
  Object.freeze({id: 'studio_overview', title: '生成工作室概览', description: '统计本机笔记、提醒、对话和回忆，并展示已有成长里程碑。', steps: steps('local.studio.stats')}),
]);

const errorWithCode = (message, code) => Object.assign(new Error(message), {code});
const cancelled = () => Object.assign(new Error('本地任务已取消，未保存结果。'), {name: 'AbortError', code: 'cancelled'});
const validTime = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME;
const iso = time => new Date(time).toISOString();
const compareId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const recentNotes = notes => notes.slice().sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || compareId(a, b));
const nextReminders = reminders => reminders.slice().sort((a, b) => a.dueAt - b.dueAt || compareId(a, b));
const recentMemories = memories => memories.slice().sort((a, b) => b.createdAt - a.createdAt || compareId(a, b));
const defaultYield = () => new Promise(resolve => setTimeout(resolve, 0));

// Count UTF-16 units for textarea/storage limits, without cutting an emoji in half.
function clip(value, limit) {
  if (value.length <= limit) return value;
  let result = '';
  for (const character of value) {
    if (result.length + character.length > limit - 1) break;
    result += character;
  }
  return result + '…';
}

function clipCharacters(value, limit) {
  const characters = Array.from(value);
  return characters.length <= limit ? value : characters.slice(0, limit - 1).join('') + '…';
}

const markdown = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[\\`*_{}\[\]()#+.!|]/g, '\\$&');
const displayTitle = value => markdown(clipCharacters(value, 100));
const excerpt = value => markdown(clipCharacters(value.replace(/\s+/g, ' ').trim(), 120));

function checkedSnapshot(read) {
  if (!read || read.ok !== true) {
    const detail = typeof read?.error === 'string' ? clip(read.error.trim(), 180) : '无法读取陪伴记录。';
    throw errorWithCode(detail || '无法读取陪伴记录。', 'read_failed');
  }
  try {
    // Reuse the store's strict validator; never let growthSummary's empty fallback
    // reinterpret damaged data as an empty studio. Copy to retain one snapshot.
    const data = read.data;
    if (!data || ['notes', 'reminders', 'messages', 'memories'].some(key => !Array.isArray(data[key]) || data[key].length > COMPANION_LIMITS[key])) throw Error('invalid');
    return JSON.parse(exportCompanion(data));
  } catch {
    throw errorWithCode('陪伴记录格式无效，任务已停止；原始记录未改写。', 'invalid_data');
  }
}

function classifyReminders(reminders, time) {
  const groups = {due: [], notified: [], upcoming: [], completed: []};
  for (const item of reminders) {
    if (item.status === 'completed') groups.completed.push(item);
    else if (item.dueAt > time) groups.upcoming.push(item);
    else if (item.firedAt !== null) groups.notified.push(item);
    else groups.due.push(item);
  }
  for (const key of ['due', 'notified', 'upcoming']) groups[key] = nextReminders(groups[key]);
  groups.completed.sort((a, b) => b.completedAt - a.completedAt || compareId(a, b));
  return groups;
}

function organize(taskId, data, time) {
  const groups = classifyReminders(data.reminders, time);
  if (taskId === 'notes_digest') return {notes: recentNotes(data.notes).slice(0, NOTE_ROWS), total: data.notes.length, allowed: data.notes.filter(item => item.shareWithAI).length};
  if (taskId === 'reminders_check') return {groups, total: data.reminders.length, soon: groups.upcoming.filter(item => item.dueAt - time <= 86400000).length};
  return {groups, growth: growthSummary(data), notes: recentNotes(data.notes).slice(0, 5), memories: recentMemories(data.memories).slice(0, 8),
    allowed: data.notes.filter(item => item.shareWithAI).length, userMessages: data.messages.filter(item => item.role === 'user').length};
}

function reminderSection(title, items) {
  const selected = items.slice(0, REMINDER_ROWS);
  const lines = [`## ${title}（${items.length} 条）`, `选取 ${selected.length} / ${items.length} 条；正文达到显示上限时会省略后续内容。标题超过 100 个字符时以 … 标明。`];
  if (!items.length) lines.push('暂无事项。');
  for (const item of selected) lines.push(`- ${displayTitle(item.title)} · ${iso(item.dueAt)}（UTC）${item.status === 'completed' ? ` · 完成于 ${iso(item.completedAt)}（UTC）` : ''}`);
  return lines.join('\n');
}

function compose(task, data, time, arranged) {
  const lines = [`# ${task.title}`, '', `来源：当前浏览器的陪伴记录；采集于 ${iso(time)}（UTC）。`,
    '执行方式：本地固定流程，无外部请求、未进行 AI 推理；使用一次读取快照。',
    '结果仅为可保存草稿；此任务没有新增、删除、完成或改写任何记录。', ''];
  let summary;
  if (task.id === 'notes_digest') {
    summary = `共有 ${arranged.total} 条笔记，选取最近修改的 ${arranged.notes.length} 条；${arranged.allowed} 条允许 AI 使用。正文达到显示上限时会省略后续内容。`;
    lines.push(`笔记总数：${arranged.total}；允许 AI 使用：${arranged.allowed}；未授权：${arranged.total - arranged.allowed}。`,
      `整理范围：按修改时间排序，选取最近 ${arranged.notes.length} / ${arranged.total} 条；正文达到显示上限时会省略后续内容。标题最多展示 100 个字符，正文片段最多 120 个字符；emoji 算一个字符，超长内容以 … 标明。`,
      '这是原文片段列表，没有推断主题、情绪或未记录的事项。此本地任务可整理未授权给 AI 的笔记，内容没有发送到外部。', '');
    if (!arranged.total) lines.push('当前快照暂无笔记。');
    for (const item of arranged.notes) lines.push(`## ${displayTitle(item.title)}`, `最后修改：${iso(item.updatedAt)}（UTC） · AI 使用：${item.shareWithAI ? '允许' : '未授权'}`,
      `正文片段：${item.body ? excerpt(item.body) : '（暂无正文）'}`, '');
  } else if (task.id === 'reminders_check') {
    const {groups} = arranged, overdue = groups.due.length + groups.notified.length;
    summary = `到期未完成 ${overdue} 条（其中已提示 ${groups.notified.length} 条），未来 ${groups.upcoming.length} 条，已完成 ${groups.completed.length} 条。`;
    lines.push(`提醒总数：${arranged.total}；到期未完成：${overdue}；未来 24 小时内：${arranged.soon}；已完成：${groups.completed.length}。`,
      '时间规则：待完成且到期时间 ≤ 采集时间为到期事项。“已提示”只表示曾显示提醒，仍需用户完成；此检查不会触发、完成或延后提醒。', '',
      reminderSection('到期 · 尚未提示', groups.due), '', reminderSection('到期 · 已提示但未完成', groups.notified), '',
      reminderSection('未来 · 待完成', groups.upcoming), '', reminderSection('已完成', groups.completed));
  } else {
    const {groups, growth} = arranged;
    summary = `本机保存 ${data.notes.length} 条笔记、${data.reminders.length} 条提醒、${data.messages.length} 条对话和 ${data.memories.length} 条回忆；成长阶段：${growth.label}。`;
    lines.push('## 本机记录统计', `- 笔记：${data.notes.length} 条；允许 AI 使用 ${arranged.allowed} 条，未授权 ${data.notes.length - arranged.allowed} 条。`,
      `- 提醒：${data.reminders.length} 条；到期未完成 ${groups.due.length + groups.notified.length} 条（已提示 ${groups.notified.length} 条），未来 ${groups.upcoming.length} 条，已完成 ${groups.completed.length} 条。`,
      `- 保留的对话：${data.messages.length} 条；用户 ${arranged.userMessages} 条，伙伴 ${data.messages.length - arranged.userMessages} 条。这里只统计数量，未读取对话内容到报告。`,
      `- 共同回忆：${data.memories.length} 条；相遇 ${growth.counts.hello}、玩耍 ${growth.counts.play}、笔记 ${growth.counts.note}、完成提醒 ${growth.counts.reminder}。`, '',
      `## 成长阶段 · ${growth.label}`, '阶段依据已保存记录和实际共同活动，不计算连续签到或缺席惩罚。');
    for (const milestone of growth.milestones) lines.push(`- [${milestone.done ? 'x' : ' '}] ${milestone.label}`);
    lines.push(`下一步：${growth.next}。`, '', `## 最近修改的笔记（选取 ${arranged.notes.length} / ${data.notes.length} 条）`, '只展示标题；超过 100 个字符时以 … 标明。正文达到显示上限时会省略后续内容。');
    if (!arranged.notes.length) lines.push('当前快照暂无笔记。');
    for (const item of arranged.notes) lines.push(`- ${displayTitle(item.title)} · ${iso(item.updatedAt)}（UTC）`);
    lines.push('', `## 最近共同回忆（选取 ${arranged.memories.length} / ${data.memories.length} 条）`, '只展示已保存事件；超过 100 个字符的标题以 … 标明。正文达到显示上限时会省略后续内容。');
    const labels = {hello: '相遇', play: '玩耍', note: '笔记', reminder: '完成提醒'};
    if (!arranged.memories.length) lines.push('当前快照暂无共同回忆。');
    for (const item of arranged.memories) lines.push(`- ${labels[item.kind]} · ${displayTitle(item.title)} · ${iso(item.createdAt)}（UTC）`);
    lines.push('', '范围说明：这里只统计本机陪伴记录，不统计或改写旧毛绒创作、小世界布局、收藏及工程记录。');
  }
  let body = lines.join('\n').trim();
  if (body.length > BODY_LIMIT) {
    const disclosure = '\n\n正文达到显示上限，后续内容未展示；完整源记录仍保留，可在笔记、提醒或回忆页面查看。';
    body = clip(body, BODY_LIMIT - disclosure.length) + disclosure;
  }
  summary = clip(summary, SUMMARY_LIMIT);
  const title = clip(`${task.title} · ${iso(time).slice(0, 10)}`, COMPANION_LIMITS.title);
  return {taskId: task.id, title: task.title, summary, body, noteDraft: {title, body}};
}

/** Visible, deterministic local tools only. onEvent is synchronous; runs never save or send a result. */
export async function runStudioAgentTask({taskId, readStore, now = () => Date.now(), signal, onEvent = () => {}, yieldControl = defaultYield} = {}) {
  let task, activeStep = null, currentStep = null;
  const checkAbort = () => {if (signal?.aborted) throw cancelled();};
  const emit = event => {
    try {onEvent({taskId, ...event});} catch {throw errorWithCode('任务进度显示失败，已停止执行，原始记录未改写。', 'event_failed');}
  };
  const notifyFailure = event => {try {if (typeof onEvent === 'function') onEvent({taskId, ...event});} catch { /* Keep the original failure. */ }};
  const wait = async value => {
    // A callback may synchronously abort and return a rejecting promise. Attach
    // its rejection handler before checking the signal to avoid an orphan error.
    const pending = Promise.resolve(value);pending.catch(() => {});
    checkAbort();
    if (!signal) {const result = await pending;checkAbort();return result;}
    let abort;
    const interruption = new Promise((_, reject) => {abort = () => reject(cancelled());signal.addEventListener('abort', abort, {once: true});});
    try {const result = await Promise.race([pending, interruption]);checkAbort();return result;}
    finally {signal.removeEventListener('abort', abort);}
  };
  try {
    task = STUDIO_AGENT_TASKS.find(item => item.id === taskId);
    if (!task) throw errorWithCode('本地任务不存在，请选择有效任务。', 'unknown_task');
    if (typeof readStore !== 'function' || typeof onEvent !== 'function' || typeof yieldControl !== 'function' ||
      (signal && (typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function'))) {
      throw errorWithCode('本地任务参数无效，未读取或修改记录。', 'invalid_input');
    }
    checkAbort();emit({type: 'started', title: task.title});checkAbort();
    let data, time, arranged, result;
    for (let index = 0; index < task.steps.length; index++) {
      const step = task.steps[index];currentStep = step;activeStep = step;
      checkAbort();emit({type: 'step', stepId: step.id, status: 'running', tool: step.tool, detail: step.title});checkAbort();
      let detail;
      if (index === 0) {
        let read;
        try {read = await wait(readStore());} catch (error) {
          if (signal?.aborted || error?.name === 'AbortError') throw cancelled();
          throw errorWithCode('无法读取陪伴记录，任务已停止；原始记录未改写。', 'read_failed');
        }
        checkAbort();time = typeof now === 'function' ? now() : now;
        if (!validTime(time)) throw errorWithCode('当前采集时间无效，任务已停止。', 'invalid_time');
        data = checkedSnapshot(read);
        detail = `已读取 ${data.notes.length} 条笔记、${data.reminders.length} 条提醒、${data.messages.length} 条对话和 ${data.memories.length} 条回忆；采集时间 ${iso(time)}（UTC）。`;
      } else if (index === 1) {
        arranged = organize(task.id, data, time);
        await wait(Promise.resolve());
        detail = task.id === 'notes_digest' ? `已按修改时间整理 ${data.notes.length} 条笔记，选取最近 ${arranged.notes.length} 条原文片段。` :
          task.id === 'reminders_check' ? `已按真实状态分类 ${data.reminders.length} 条提醒；已提示仍属于未完成。` : '已统计本机记录数量和现有成长里程碑。';
      } else {
        result = compose(task, data, time, arranged);
        await wait(Promise.resolve());
        detail = '已构造结果草稿，等待用户选择是否保存。';
      }
      checkAbort();activeStep = null;emit({type: 'step', stepId: step.id, status: 'completed', tool: step.tool, detail});checkAbort();
      if (index + 1 < task.steps.length) {
        await wait(yieldControl({taskId, completedStepId: step.id, nextStepId: task.steps[index + 1].id}));
        checkAbort();
      }
    }
    checkAbort();emit({type: 'completed', title: task.title, summary: result.summary});
    return result;
  } catch (error) {
    const wasCancelled = signal?.aborted || error?.name === 'AbortError';
    const failure = wasCancelled ? cancelled() : error?.code ? error : errorWithCode('本地任务执行失败，原始记录未改写。', 'task_failed');
    if (activeStep) notifyFailure({type: 'step', stepId: activeStep.id, status: 'failed', tool: activeStep.tool, detail: failure.message});
    notifyFailure(wasCancelled ? {type: 'cancelled', ...(currentStep ? {stepId: currentStep.id} : {})} :
      {type: 'failed', ...(currentStep ? {stepId: currentStep.id} : {}), error: failure.message, errorCode: failure.code});
    throw failure;
  }
}
