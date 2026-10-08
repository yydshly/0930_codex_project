// The bridge contract is local and inert until an external provider is authorized.
// This module contains no external request or credential access.
const ACTIONS = new Set(['none', 'greet', 'jump', 'fetch']);
const PERSONALITIES = new Set(['calm', 'curious', 'playful']);

export class CompanionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CompanionError';
    this.status = status;
    this.code = code;
  }
}
const invalid = message => { throw new CompanionError(400, 'invalid_request', message); };
const invalidReply = () => { throw new CompanionError(502, 'invalid_ai_reply', 'AI 返回的内容格式不完整，请重试。'); };
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value, keys) => plainObject(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
function boundedText(value, min, max, onError) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) onError();
  return value.trim();
}

// Date.parse alone silently normalizes dates such as February 30.
export function parseOffsetTimestamp(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  if (year < 2000 || year > 2100 || hour > 23 || minute > 59 || second > 59) return null;
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, Number((match[7] ?? '').padEnd(3, '0')));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1
      || calendar.getUTCDate() !== day) return null;
  if (match[8] !== 'Z' && (Number(match[10]) > 14 || Number(match[11]) > 59
      || (Number(match[10]) === 14 && Number(match[11]) !== 0))) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateChatRequest(value) {
  if (!hasKeys(value, ['messages', 'companion', 'memories', 'now', 'timezone'])) invalid('对话请求格式不正确。');
  if (!Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 20) invalid('请发送 1 至 20 条对话。');
  let totalMessageChars = 0;
  const messages = value.messages.map(message => {
    if (!hasKeys(message, ['role', 'text']) || !['user', 'assistant'].includes(message.role)) invalid('对话角色不正确。');
    const text = boundedText(message.text, 1, 2000, () => invalid('每条对话应为 1 至 2,000 字。'));
    totalMessageChars += text.length;
    return {role: message.role, text};
  });
  if (messages.at(-1).role !== 'user' || totalMessageChars > 16_000) invalid('请以用户消息结束对话，总长度不超过 16,000 字。');
  if (!hasKeys(value.companion, ['name', 'personality']) || !PERSONALITIES.has(value.companion.personality)) invalid('伙伴信息不正确。');
  const companion = {
    name: boundedText(value.companion.name, 1, 80, () => invalid('伙伴名字应为 1 至 80 字。')),
    personality: value.companion.personality,
  };
  if (!Array.isArray(value.memories) || value.memories.length > 12) invalid('一次最多分享 12 条记忆。');
  let totalMemoryChars = 0;
  const memories = value.memories.map(memory => {
    if (!hasKeys(memory, ['title', 'body'])) invalid('记忆格式不正确。');
    const title = boundedText(memory.title, 1, 120, () => invalid('记忆标题应为 1 至 120 字。'));
    const body = boundedText(memory.body, 0, 1000, () => invalid('每条记忆正文最多 1,000 字。'));
    totalMemoryChars += title.length + body.length;
    return {title, body};
  });
  if (totalMemoryChars > 8000) invalid('分享记忆的总长度不超过 8,000 字。');
  if (parseOffsetTimestamp(value.now) === null) invalid('当前时间需要完整日期、时间和时区。');
  if (typeof value.timezone !== 'string' || value.timezone.length > 80) invalid('时区格式不正确。');
  try { new Intl.DateTimeFormat('zh-CN', {timeZone: value.timezone}).format(); }
  catch { invalid('请使用有效的地区时区。'); }
  return {messages, companion, memories, now: value.now, timezone: value.timezone};
}

export function aiConfiguration() {
  return {ready: false, model: null, message: '外部 AI 接入尚未启用；可以先使用本地笔记、提醒和成长记录。'};
}

export const COMPANION_REPLY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    reply: {type: 'string'},
    action: {type: 'string', enum: [...ACTIONS]},
    suggestion: {anyOf: [
      {type: 'null'},
      {type: 'object', additionalProperties: false,
        properties: {
          kind: {type: 'string', enum: ['note', 'reminder']},
          title: {type: 'string'}, body: {type: 'string'},
          dueAt: {type: ['string', 'null']},
        }, required: ['kind', 'title', 'body', 'dueAt']},
    ]},
  }, required: ['reply', 'action', 'suggestion'],
};

export function validateCompanionReply(value, nowMs = Date.now()) {
  if (!hasKeys(value, ['reply', 'action', 'suggestion']) || !ACTIONS.has(value.action)) invalidReply();
  const reply = boundedText(value.reply, 1, 2000, invalidReply);
  let suggestion = null;
  if (value.suggestion !== null) {
    const candidate = value.suggestion;
    if (!hasKeys(candidate, ['kind', 'title', 'body', 'dueAt']) || !['note', 'reminder'].includes(candidate.kind)) invalidReply();
    const title = boundedText(candidate.title, 1, 120, invalidReply);
    const body = boundedText(candidate.body, 0, 1000, invalidReply);
    let dueAt = null;
    if (candidate.dueAt !== null) {
      const timestamp = parseOffsetTimestamp(candidate.dueAt);
      if (candidate.kind !== 'reminder' || timestamp === null || timestamp <= nowMs) invalidReply();
      dueAt = new Date(timestamp).toISOString();
    }
    suggestion = {kind: candidate.kind, title, body, dueAt};
  }
  return {reply, action: value.action, suggestion};
}

export async function requestCompanionReply(request) {
  validateChatRequest(request);
  throw new CompanionError(503, 'ai_not_enabled', aiConfiguration().message);
}
