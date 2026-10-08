(() => {
  'use strict';
  const slider = document.getElementById('launch-frame');
  const preview = document.getElementById('launch-preview');
  const frameOutput = document.getElementById('launch-frame-number');
  const timeOutput = document.getElementById('launch-time');
  const beat = document.getElementById('launch-beat');
  const names = ['提出需求', '项目与分类', '效果体验', '制作机制', '行动入口'];
  let loaded = false;
  function update() {
    const frame = Number(slider.value);
    const seconds = frame / 24;
    frameOutput.value = String(frame);
    timeOutput.value = seconds.toFixed(3) + ' s';
    const chapter = Math.min(4, Math.floor(frame / 120));
    beat.textContent = '当前第 ' + (chapter + 1) + ' 幕：' + names[chapter] + '。frame / 24 = ' + seconds.toFixed(3) + ' 秒。';
    slider.setAttribute('aria-valuetext', '第 ' + frame + ' 帧，' + seconds.toFixed(3) + ' 秒');
    if (loaded) preview.contentWindow.postMessage({ type: 'atlas-film-seek', seconds }, window.location.origin);
  }
  preview.addEventListener('load', () => { loaded = true; update(); });
  slider.addEventListener('input', update);
  for (const button of document.querySelectorAll('[data-launch-frame]')) {
    button.addEventListener('click', () => { slider.value = button.dataset.launchFrame; update(); });
  }
  // The iframe may have finished loading before this script attached its listener.
  if (preview.contentDocument?.readyState === 'complete' && typeof preview.contentWindow.__seek === 'function') loaded = true;
  update();
})();
