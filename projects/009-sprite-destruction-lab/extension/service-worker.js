const ENDPOINT = 'https://api.mymemory.translated.net/get';
const LANGUAGES = new Set(['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar']);
const MENU_ID = 'forma-open-toolbox';
const NOTES_KEY = 'forma-toolbox-notes';
let notesMutationQueue = Promise.resolve();

function normalizeNote(note) {
  if (!note || typeof note.id !== 'string' || !note.id || note.id.length > 128 || typeof note.quote !== 'string' || !note.quote.trim() || note.quote.length > 3000 || typeof note.sourceTitle !== 'string' || note.sourceTitle.length > 300 || typeof note.sourceUrl !== 'string' || typeof note.createdAt !== 'string' || !Number.isFinite(Date.parse(note.createdAt))) throw new Error('摘录内容或来源格式无效。');
  let url;
  try { url = new URL(note.sourceUrl); } catch { throw new Error('摘录来源链接无效。'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('摘录来源只支持 HTTP / HTTPS 网页。');
  if (note.translation != null && (typeof note.translation !== 'string' || note.translation.length > 10000) || note.note != null && (typeof note.note !== 'string' || note.note.length > 1000)) throw new Error('摘录译文或备注超过长度限制。');
  return {id: note.id, quote: note.quote, translation: note.translation || '', sourceUrl: url.href, sourceTitle: note.sourceTitle, note: note.note || '', createdAt: note.createdAt, origin: note.origin === 'manual' ? 'manual' : 'selection'};
}

async function updateNotes(message) {
  const upsert = message.upsert ?? [], deleteIds = message.deleteIds ?? [];
  if (!Array.isArray(upsert) || !Array.isArray(deleteIds) || upsert.length > 200 || deleteIds.length > 200 || deleteIds.some(id => typeof id !== 'string' || !id || id.length > 128)) throw new Error('摘录更新格式无效。');
  const additions = upsert.map(normalizeNote);
  const mutation = notesMutationQueue.catch(() => {}).then(async () => {
    const stored = await chrome.storage.local.get(NOTES_KEY);
    const existing = Array.isArray(stored[NOTES_KEY]) ? stored[NOTES_KEY] : [];
    const records = new Map();
    for (const value of existing) {
      try { const note = normalizeNote(value); records.set(note.id, note); } catch { /* Skip corrupt old records without losing valid notes. */ }
    }
    for (const note of additions) records.set(note.id, note);
    for (const id of deleteIds) records.delete(id);
    if (records.size > 200) throw new Error('最多保存 200 条摘录，请先导出并删除部分内容。');
    const notes = [...records.values()];
    await chrome.storage.local.set({[NOTES_KEY]: notes});
    return notes;
  });
  notesMutationQueue = mutation;
  return mutation;
}

function validateTranslation(message) {
  if (!message || typeof message.q !== 'string' || !message.q.trim()) throw new Error('请选择需要翻译的文本。');
  if (new TextEncoder().encode(message.q).length > 500) throw new Error('单次翻译最多 500 字节，请分段选择。');
  if (typeof message.langpair !== 'string') throw new Error('缺少翻译语言。');
  const pair = message.langpair.split('|');
  if (pair.length !== 2 || pair.some(language => !LANGUAGES.has(language)) || pair[0] === pair[1]) throw new Error('不支持这个语言组合。');
  return {q: message.q, langpair: message.langpair};
}

async function requestTranslation(message) {
  const input = validateTranslation(message);
  const url = new URL(ENDPOINT);
  url.searchParams.set('q', input.q);
  url.searchParams.set('langpair', input.langpair);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {signal: controller.signal, credentials: 'omit', redirect: 'error'});
    if (!response.ok) throw new Error(`翻译服务响应 ${response.status}。`);
    const result = await response.json();
    if (!result || typeof result !== 'object' || !('responseData' in result)) throw new Error('翻译服务返回了无效结果。');
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['FORMA_TRANSLATE', 'FORMATOOLBOX_NOTES_UPDATE'].includes(message?.type)) return false;
  if (sender.id !== chrome.runtime.id || !sender.tab || !/^https?:\/\//.test(sender.tab.url || '')) {
    sendResponse({ok: false, error: '工具箱请求必须来自本扩展已打开的普通网页。'});
    return false;
  }
  if (message.type === 'FORMATOOLBOX_NOTES_UPDATE') {
    updateNotes(message).then(
      notes => sendResponse({ok: true, notes}),
      error => sendResponse({ok: false, error: error.message || '摘录保存失败。'})
    );
    return true;
  }
  requestTranslation(message).then(
    data => sendResponse({ok: true, data}),
    error => sendResponse({ok: false, error: error.name === 'AbortError' ? '翻译服务超时，请重试。' : error.message})
  );
  return true;
});

async function openToolbox(tab, selectionText = '', forceOpen = false) {
  if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) {
    if (tab?.id) await chrome.action.setTitle({tabId: tab.id, title: '请在普通 HTTP / HTTPS 网页中使用工具箱'});
    return;
  }
  try {
    if (forceOpen) {
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: () => { globalThis.__FORMA_EXTENSION_FORCE_OPEN__ = true; }
      });
    }
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content-loader.js']});
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: async () => await globalThis.__FORMA_EXTENSION_PROMISE__
    });
    if (result?.error) throw new Error(result.error);
    if (selectionText && result?.open) {
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: text => document.dispatchEvent(new CustomEvent('forma:selection', {detail: {text}})),
        args: [selectionText]
      });
    }
    await chrome.action.setBadgeText({tabId: tab.id, text: result?.open ? 'ON' : ''});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#296a59'});
    await chrome.action.setTitle({tabId: tab.id, title: result?.open ? '关闭 Forma 网页工具箱' : '打开 Forma 网页工具箱'});
  } catch (error) {
    await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#b24b36'});
    await chrome.action.setTitle({tabId: tab.id, title: `工具箱无法打开：${error.message}`});
    console.warn('Forma injection:', error.message);
  }
}

chrome.action.onClicked.addListener(tab => void openToolbox(tab));
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({id: MENU_ID, title: 'Forma：打开网页工具箱', contexts: ['page', 'selection']});
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) void openToolbox(tab, info.selectionText || '', true);
});
