let captureBusy = false;
let lastCaptureAt = -Infinity;
const openingTabs = new Set();

function validateSender(sender) {
  if (sender?.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id) || !Number.isInteger(sender.tab?.windowId) || sender.frameId !== 0 || !/^https?:\/\//.test(sender.tab.url || '')) throw new Error('截图请求必须来自本扩展打开的普通网页。');
}

async function requireCurrentTab(sender) {
  const [active] = await chrome.tabs.query({active: true, windowId: sender.tab.windowId});
  if (!active || active.id !== sender.tab.id) throw new Error('请保持需要互动的网页为当前标签页。');
  const window = await chrome.windows.get(sender.tab.windowId);
  if (!window?.focused) throw new Error('请先切换到需要互动的浏览器窗口。');
}

async function captureCurrentPage(sender) {
  validateSender(sender);
  if (captureBusy) throw new Error('正在获取页面画面，请稍后重试。');
  if (Date.now() - lastCaptureAt < 500) throw new Error('截图调用过于频繁，请稍后重试。');
  captureBusy = true;
  try {
    await requireCurrentTab(sender);
    lastCaptureAt = Date.now();
    const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'});
    // Discard a result if the user switched tabs/windows while capture ran.
    await requireCurrentTab(sender);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) throw new Error('浏览器没有返回有效页面截图。');
    return dataUrl;
  } finally {
    captureBusy = false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'AVATAR_CAPTURE') return false;
  captureCurrentPage(sender).then(
    dataUrl => sendResponse({ok: true, dataUrl}),
    error => sendResponse({ok: false, error: error.message || '页面截图失败。'})
  );
  return true;
});

async function openAvatar(tab) {
  if (!Number.isInteger(tab?.id) || !/^https?:\/\//.test(tab.url || '')) {
    if (Number.isInteger(tab?.id)) await chrome.action.setTitle({tabId: tab.id, title: '请在普通 HTTP / HTTPS 网页中打开角色'});
    return;
  }
  if (openingTabs.has(tab.id)) return;
  openingTabs.add(tab.id);
  try {
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['assets/vendor/matter.min.js', 'content-loader.js']});
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: async () => await globalThis.__AVATAR_EXTENSION_PROMISE__
    });
    if (result?.error) throw new Error(result.error);
    const visible = result?.open !== false;
    await chrome.action.setBadgeText({tabId: tab.id, text: visible ? 'ON' : ''});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#356c7a'});
    await chrome.action.setTitle({tabId: tab.id, title: visible ? '收起网页角色' : '显示网页角色'});
  } catch (error) {
    await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
    await chrome.action.setBadgeBackgroundColor({tabId: tab.id, color: '#aa593d'});
    await chrome.action.setTitle({tabId: tab.id, title: `角色无法打开：${error.message}`});
    console.warn('Avatar Anywhere:', error.message);
  } finally {
    openingTabs.delete(tab.id);
  }
}

chrome.action.onClicked.addListener(tab => void openAvatar(tab));
