(function () {
  const state = globalThis.__AVATAR_EXTENSION_STATE__ ||= {pending: false, instance: null};
  if (state.pending) return;
  state.pending = true;
  globalThis.__AVATAR_EXTENSION_PROMISE__ = (async () => {
    if (state.instance) {
      if (typeof state.instance.toggle === 'function') await state.instance.toggle();
      else await state.instance.show();
      return state.instance.getState();
    }
    const {mountAvatarAnywhere} = await import(chrome.runtime.getURL('assets/avatar-anywhere/controller.js'));
    const capture = async () => {
      const response = await chrome.runtime.sendMessage({type: 'AVATAR_CAPTURE'});
      if (!response?.ok || typeof response.dataUrl !== 'string') throw new Error(response?.error || '页面画面获取失败。');
      return response.dataUrl;
    };
    state.instance = await mountAvatarAnywhere({capture});
    globalThis.AvatarAnywhere = state.instance;
    return state.instance.getState();
  })().catch(error => ({error: error.message})).finally(() => {state.pending = false;});
})();
