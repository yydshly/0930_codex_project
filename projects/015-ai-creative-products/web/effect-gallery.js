/* Original works: local posters first, remote media only after a play action. */
(() => {
  'use strict';
  if (window.EffectGallery) return;

  const states = new Set();
  const slowDelay = 15000;
  const number = id => String(id).padStart(2, '0');

  function duration(seconds) {
    if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return '时长未公开';
    const total = Math.round(Number(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function safeUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, document.baseURI);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function sourceCases() {
    const research = new Map((window.RESEARCH_DATA?.cases || []).map(item => [Number(item.id), item]));
    return (window.SOURCE_DATA?.cases || []).map(source => ({
      ...source,
      ...(research.get(Number(source.id)) || {}),
      id: Number(source.id)
    }));
  }

  function pauseOtherVideos(current) {
    document.querySelectorAll('video').forEach(video => {
      if (video !== current && !video.paused) video.pause();
    });
  }

  // Capture also covers the existing case-detail player's native controls.
  document.addEventListener('play', event => {
    if (event.target?.tagName === 'VIDEO') pauseOtherVideos(event.target);
  }, true);

  function clearSlowTimer(state) {
    window.clearTimeout(state.slowTimer);
    state.slowTimer = null;
  }

  function setStatus(state, phase, message, retry = false) {
    if (state.disposed) return;
    state.phase = phase;
    state.card.dataset.mediaState = phase;
    state.status.textContent = message;
    state.retry.hidden = !retry;
  }

  function awaitMedia(state, phase, message) {
    clearSlowTimer(state);
    setStatus(state, phase, message);
    state.slowTimer = window.setTimeout(() => {
      state.slowTimer = null;
      if (!state.disposed && ['loading', 'buffering'].includes(state.phase)) {
        setStatus(state, state.phase, '视频连接较慢，可稍候、重试或查看原帖。', true);
      }
    }, slowDelay);
  }

  function releasePlayer(state) {
    clearSlowTimer(state);
    state.videoAbort?.abort();
    state.videoAbort = null;
    if (!state.video) return;
    const video = state.video;
    state.video = null;
    video.pause();
    video.removeAttribute('src');
    video.querySelectorAll('source').forEach(source => source.remove());
    video.load();
    video.remove();
  }

  function dispose(state) {
    if (state.disposed) return;
    state.disposed = true;
    state.cardAbort.abort();
    releasePlayer(state);
    viewportObserver?.unobserve(state.card);
    states.delete(state);
  }

  function releaseWithin(container) {
    if (!container?.contains) return;
    [...states].forEach(state => {
      if (state.card === container || container.contains(state.card)) dispose(state);
    });
  }

  function fail(state, video) {
    if (state.disposed || state.video !== video) return;
    clearSlowTimer(state);
    setStatus(state, 'error', '视频暂时无法加载，可重试或在原帖查看。', true);
  }

  function play(state) {
    if (state.disposed) return;
    const url = safeUrl(state.item.videoUrl);
    if (!url) {
      setStatus(state, 'error', '该来源暂无可用视频地址，请查看原帖。');
      return;
    }
    releasePlayer(state);
    const video = node('video', 'effect-gallery-video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.poster = safeUrl(state.item.poster);
    video.setAttribute('aria-label', `${state.item.title}：原作者视频`);
    video.setAttribute('playsinline', '');
    video.tabIndex = 0;
    state.video = video;
    state.videoAbort = new AbortController();
    const signal = state.videoAbort.signal;
    const current = () => !state.disposed && state.video === video;
    const listen = (event, handler) => video.addEventListener(event, () => {
      if (current()) handler();
    }, {signal});

    listen('loadstart', () => awaitMedia(state, 'loading', '正在连接原作视频…'));
    listen('playing', () => {
      clearSlowTimer(state);
      setStatus(state, 'playing', '正在播放原作者视频。');
    });
    listen('waiting', () => awaitMedia(state, 'buffering', '正在缓冲原作视频…'));
    listen('stalled', () => {
      if (video.readyState < 3) awaitMedia(state, 'buffering', '正在等待原作媒体响应…');
    });
    listen('canplay', () => {
      clearSlowTimer(state);
      if (video.paused && state.phase !== 'error') {
        setStatus(state, 'paused', '视频已加载，可使用播放器继续播放。');
      }
    });
    listen('pause', () => {
      clearSlowTimer(state);
      if (!video.ended && state.phase !== 'error') {
        setStatus(state, 'paused', '已暂停，可使用播放器继续播放。');
      }
    });
    listen('ended', () => {
      clearSlowTimer(state);
      setStatus(state, 'ended', '播放结束，可使用播放器再次播放。');
    });
    listen('error', () => fail(state, video));

    state.stage.replaceChildren(video);
    awaitMedia(state, 'loading', '正在连接原作视频…');
    pauseOtherVideos(video);
    // Assigning the remote source happens exclusively in this user-action handler.
    video.src = url;
    video.focus({preventScroll: true});
    const attempt = video.play();
    if (attempt?.catch) attempt.catch(error => {
      if (!current() || error?.name === 'AbortError') return;
      if (error?.name === 'NotAllowedError') {
        clearSlowTimer(state);
        setStatus(state, 'paused', '请使用播放器中的播放按钮继续。');
      } else {
        fail(state, video);
      }
    });
  }

  const viewportObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) return;
      const state = [...states].find(item => item.card === entry.target);
      if (state?.video && !state.video.paused) state.video.pause();
    });
  }, {threshold: 0}) : null;

  function makeCard(item, headingTag = 'h3') {
    const card = node('article', 'effect-gallery-card');
    card.dataset.effectCase = String(item.id);
    card.dataset.mediaState = 'idle';
    card.setAttribute('role', 'listitem');

    const stage = node('div', 'effect-gallery-stage');
    const poster = node('img', 'effect-gallery-poster');
    poster.src = safeUrl(item.poster);
    poster.alt = `${item.title}的原作视频封面`;
    poster.loading = 'lazy';
    poster.decoding = 'async';
    poster.width = 1280;
    poster.height = 720;
    const playButton = node('button', 'effect-gallery-play');
    playButton.type = 'button';
    playButton.dataset.effectPlay = String(item.id);
    playButton.setAttribute('aria-label', `播放${item.title}的原作者视频`);
    const icon = node('span', 'effect-gallery-play__icon', '▶');
    icon.setAttribute('aria-hidden', 'true');
    const caption = node('span', 'effect-gallery-play__caption', '播放原作视频');
    playButton.append(icon, caption);
    stage.append(poster, playButton);

    const body = node('div', 'effect-gallery-card__body');
    const meta = node('div', 'effect-gallery-card__meta');
    meta.append(node('b', 'effect-gallery-card__number', `CASE ${number(item.id)}`));
    meta.append(node('span', 'effect-gallery-card__category', item.category || '展示'));
    meta.append(node('span', 'effect-gallery-card__duration', duration(item.duration)));
    const title = node(headingTag, 'effect-gallery-card__title', item.title || `案例 ${number(item.id)}`);
    const authorName = String(item.author || '').replace(/^@/, '');
    const author = node('p', 'effect-gallery-card__author', authorName ? `原作者 @${authorName}` : '原作者见来源链接');
    const summary = node('p', 'effect-gallery-card__summary', item.ability || '查看原作效果，再阅读来源事实与制作思路。');
    const status = node('p', 'effect-gallery-status', '点击播放后加载原作者媒体。');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const actions = node('div', 'effect-gallery-card__actions');
    const analysis = node('button', 'effect-gallery-analysis', '查看制作思路');
    analysis.type = 'button';
    analysis.dataset.effectAnalysis = String(item.id);
    const productDemo = node('button', 'effect-gallery-analysis', '操作对应产品演示');
    productDemo.type = 'button';
    productDemo.dataset.demoId = String(item.id);
    const retry = node('button', 'effect-gallery-retry', '重试播放');
    retry.type = 'button';
    retry.dataset.effectRetry = String(item.id);
    retry.hidden = true;
    actions.append(productDemo, analysis, retry);
    const originalUrl = safeUrl(item.url);
    if (originalUrl) {
      const original = node('a', 'effect-gallery-source', '查看原帖 ↗');
      original.href = originalUrl;
      original.target = '_blank';
      original.rel = 'noreferrer noopener';
      actions.append(original);
    }
    body.append(meta, title, author, summary, status, actions);
    card.append(stage, body);

    const state = {
      item, card, stage, status, retry, video: null, videoAbort: null,
      slowTimer: null, phase: 'idle', disposed: false,
      mounted: false, cardAbort: new AbortController()
    };
    playButton.addEventListener('click', () => play(state), {signal: state.cardAbort.signal});
    retry.addEventListener('click', () => play(state), {signal: state.cardAbort.signal});
    if (!safeUrl(item.videoUrl)) {
      playButton.disabled = true;
      setStatus(state, 'unavailable', '该来源暂无可用视频地址，请查看原帖。');
    }
    states.add(state);
    return state;
  }

  function renderInto(element, caseIds) {
    if (!(element instanceof Element)) return 0;
    releaseWithin(element);
    const all = sourceCases();
    const requested = caseIds === undefined ? all.map(item => item.id)
      : (typeof caseIds === 'string' ? caseIds.split(',') : caseIds);
    const ids = [...new Set((Array.isArray(requested) ? requested : []).map(Number))];
    const byId = new Map(all.map(item => [item.id, item]));
    const selected = ids.map(id => byId.get(id)).filter(Boolean);
    element.classList.add('effect-gallery-grid');
    element.classList.toggle('effect-gallery-grid--product', element.id === 'product-effect-gallery');
    element.setAttribute('role', 'list');
    element.setAttribute('aria-label', '原作视频效果');
    element.dataset.effectCaseIds = selected.map(item => item.id).join(',');
    const fragment = document.createDocumentFragment();
    const rendered = selected.map(item => makeCard(item, element.id === 'effect-gallery' ? 'h3' : 'h4'));
    rendered.forEach(state => fragment.append(state.card));
    if (!selected.length) fragment.append(node('p', 'effect-gallery-empty', '暂无关联原作效果，可查看案例来源。'));
    element.replaceChildren(fragment);
    rendered.forEach(state => {
      state.mounted = state.card.isConnected;
      viewportObserver?.observe(state.card);
    });
    return rendered.length;
  }

  // Keep the public API available before DOMContentLoaded for product/comparison renderers.
  window.EffectGallery = Object.freeze({renderInto, releaseWithin});

  // External parent re-renders may remove cards without calling the explicit release API.
  if ('MutationObserver' in window) {
    new MutationObserver(() => {
      [...states].forEach(state => {
        if (state.card.isConnected) state.mounted = true;
        else if (state.mounted) dispose(state);
      });
    }).observe(document.documentElement, {childList: true, subtree: true});
  }

  function initialize() {
    const main = document.querySelector('#effect-gallery');
    if (main) renderInto(main);
    const product = document.querySelector('#product-effect-gallery');
    if (product) renderInto(product, product.dataset.caseIds || '');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
