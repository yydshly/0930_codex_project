(function () {
  const state = globalThis.__FORMA_EXTENSION_STATE__ ||= {pending: false};
  if (state.pending) return;
  state.pending = true;
  globalThis.__FORMA_EXTENSION_PROMISE__ = (async () => {
    const forceOpen = Boolean(globalThis.__FORMA_EXTENSION_FORCE_OPEN__);
    delete globalThis.__FORMA_EXTENSION_FORCE_OPEN__;
    if (globalThis.FormaToolbox?.isMounted?.()) {
      if (forceOpen) return {open: true};
      globalThis.FormaToolbox.unmount();
      return {open: false};
    }
    if (!state.loaded) {
      const [translation, data, css] = await Promise.all([
        import(chrome.runtime.getURL('assets/translation.js')),
        import(chrome.runtime.getURL('assets/data.js')),
        fetch(chrome.runtime.getURL('assets/toolbox.css')).then(response => {
          if (!response.ok) throw new Error('工具箱样式读取失败。');
          return response.text();
        })
      ]);
      globalThis.FormaTranslate = translation;
      globalThis.FormaToolboxData = data;
      state.css = css;
      await import(chrome.runtime.getURL('assets/toolbox.js'));
      state.loaded = true;
    }
    const transport = async (q, source, target, signal) => {
      if (signal?.aborted) throw new DOMException('翻译已取消。', 'AbortError');
      const TranslationError = globalThis.FormaTranslate.TranslationError;
      const allowed = new Set(['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar']);
      if (typeof q !== 'string' || !q.trim() || new TextEncoder().encode(q).length > 500) throw new TranslationError('单次翻译需要 1 至 500 UTF-8 字节的文本。', 'INVALID_TEXT');
      if (!allowed.has(source) || !allowed.has(target) || source === target) throw new TranslationError('不支持这个语言组合。', 'INVALID_LANGUAGE');
      const url = new URL('https://api.mymemory.translated.net/get');
      url.searchParams.set('q', q);
      url.searchParams.set('langpair', `${source}|${target}`);
      try {
        // Content-script fetch follows the current page's origin and CORS.
        // Prefer the service's public CORS endpoint; do not retry quota errors.
        const response = await fetch(url, {signal, credentials: 'omit', redirect: 'error'});
        if (!response.ok) throw new TranslationError(`翻译服务响应 ${response.status}。未生成译文。`, 'HTTP_ERROR');
        return await response.json();
      } catch (error) {
        if (signal?.aborted || error.name === 'AbortError' || error instanceof TranslationError) throw error;
        if (!(error instanceof TypeError)) throw new TranslationError('翻译服务返回了无效结果。', 'INVALID_RESPONSE');
        // A CORS/network exception can use the permission-scoped background.
      }
      const response = await chrome.runtime.sendMessage({type: 'FORMA_TRANSLATE', q, langpair: `${source}|${target}`});
      if (signal?.aborted) throw new DOMException('翻译已取消。', 'AbortError');
      if (!response?.ok) throw new TranslationError(response?.error || '翻译服务没有返回结果。未生成译文。', 'TRANSPORT_FAILED');
      return response.data;
    };
    const updateNotes = async change => {
      const response = await chrome.runtime.sendMessage({type: 'FORMATOOLBOX_NOTES_UPDATE', upsert: change?.upsert || [], deleteIds: change?.deleteIds || []});
      if (!response?.ok || !Array.isArray(response.notes)) throw new Error(response?.error || '本地摘录更新失败。');
      return response.notes;
    };
    const storage = {
      async load() {
        const value = await chrome.storage.local.get('forma-toolbox-notes');
        return value['forma-toolbox-notes'] || [];
      },
      async save(notes) {
        // Compatibility saves merge by ID; explicit deletes use update().
        return updateNotes({upsert: notes});
      },
      update: updateNotes
    };
    const instance = globalThis.FormaToolbox.mount({
      root: document.body,
      sourceUrl: location.href,
      sourceTitle: document.title,
      mode: 'extension',
      cssText: state.css,
      transport,
      storage
    });
    if (instance?.ready) await instance.ready;
    return {open: true};
  })().catch(error => ({open: false, error: error.message})).finally(() => { state.pending = false; });
})();
