import { ITEMS, RECIPES, createWorld, stepWorld, act, demoStep, serializeWorld, restoreWorld, objective, nearestObject, targetPoint } from './direction-survival-engine.js';

export const SURVIVAL_STORAGE_KEY = 'world-play-direction-survival-v1';
const defaultRendererFactory = (...args) => import('./direction-survival-render.js').then(module => module.createSurvivalRenderer(...args));
const clone = value => JSON.parse(JSON.stringify(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function createSurvivalController(options = {}) {
  const doc = options.document ?? globalThis.document, win = options.window ?? globalThis.window, storage = options.storage ?? globalThis.localStorage;
  const requestFrame = options.requestFrame ?? win.requestAnimationFrame.bind(win), cancelFrame = options.cancelFrame ?? win.cancelAnimationFrame?.bind(win), now = options.now ?? (() => Date.now()), rendererFactory = options.rendererFactory ?? defaultRendererFactory;
  const $ = id => doc.getElementById(id), canvas = $('survival-canvas'), stage = $('survival-stage'), keys = new Set(), touches = new Map(), subscriptions = [];
  const actionButtons = [...doc.querySelectorAll('[data-surv-act]')], reasonViews = [...doc.querySelectorAll('[data-surv-reason]')], touchButtons = [...doc.querySelectorAll('[data-surv-input]')], goButtons = [...doc.querySelectorAll('[data-surv-go]')], resetButtons = [...doc.querySelectorAll('[data-surv-reset]')];
  const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  let w = createWorld(), renderer = null, ready = false, loading = false, disposed = false, frameId = null, lastTime = null, hudTime = 0, saveTime = 0, attempt = 0, openingApplied = false, previous = false, speed = 1, showLabels = true, selected = 'wood-west', hint = '', hintUntil = 0;
  try {
    const saved = JSON.parse(storage.getItem(SURVIVAL_STORAGE_KEY) || 'null'), recovered = saved?.version === 1 && restoreWorld(saved.world);
    if (recovered) { w = recovered; w.running = false; previous = true; speed = saved.speed === 2 ? 2 : 1; showLabels = saved.showLabels !== false; selected = saved.selected === 'camp' || w.objects.some(o => o.id === saved.selected) ? saved.selected : 'camp'; $('surv-resume').hidden = false; }
  } catch { /* Invalid or unavailable storage starts with a fresh, paused valley. */ }
  const destinations = [{ id: 'camp', label: '林间营地', x: w.camp.x, y: w.camp.y }, ...w.objects];
  const queryDemo = new URLSearchParams(options.search ?? win.location?.search ?? '').get('demo') === '1' && !previous;
  function on(element, type, fn) { element.addEventListener(type, fn); subscriptions.push(() => element.removeEventListener?.(type, fn)); }
  function text(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = String(value); }
  function say(value, duration = 5200) { if (!value) return; hint = value; hintUntil = now() + duration; text('surv-hint', value); }
  function save() {
    if (!ready || disposed) return;
    try { storage.setItem(SURVIVAL_STORAGE_KEY, JSON.stringify({ version: 1, world: serializeWorld(w), selected, speed, showLabels })); text('surv-save-status', '背包、营地与搜寻痕迹已保存'); text('surv-stage-save', '背包、营地与搜寻痕迹已保存'); }
    catch { text('surv-save-status', '本次可继续，浏览器暂未开放保存'); text('surv-stage-save', '浏览器暂未开放保存'); }
  }
  function clearInput() {
    keys.clear(); const held = [...touches]; touches.clear();
    for (const [id, item] of held) { item.button.setAttribute('aria-pressed', 'false'); if (item.button.hasPointerCapture?.(id)) item.button.releasePointerCapture(id); }
  }
  function acknowledge() { previous = false; $('surv-resume').hidden = true; }
  function manualMode() { w.mode = 'manual'; acknowledge(); }
  function available() { return ready && w.running && !w.failed && !disposed; }
  function revealStage() {
    if (doc.fullscreenElement) return;
    const rect = stage.getBoundingClientRect(), lead = Math.max(12, (win.innerHeight - rect.height) / 2);
    win.scrollTo?.({ top: Math.max(0, win.scrollY + rect.top - lead), behavior: reducedMotion ? 'auto' : 'instant' });
  }
  function currentObject() {
    const picked = w.objects.find(o => o.id === w.selected && distance(w.player, o) <= 1.2), nearest = picked ? { ...picked, distance: distance(w.player, picked) } : nearestObject(w);
    return nearest?.distance <= 1.2 ? nearest : null;
  }
  function changed(result) { say(result?.reason || '当前无法完成这项操作。'); updateHud(); save(); revealStage(); return Boolean(result?.ok); }
  function perform(action, value) {
    if (!ready) return false;
    if (!w.running) { say('现场已暂停。先继续探索，再进行搜寻或制作。'); return false; }
    manualMode(); return changed(act(w, action, value));
  }
  function interact() {
    if (!available()) return false;
    const object = currentObject();
    if (!object && distance(w.player, w.camp) <= 1.2) { $('surv-stage-terminal').open = true; say('你在营地。打开背包与营地制作，搭棚、生火或处理饮水。'); revealStage(); return true; }
    return perform('interact', object?.id);
  }
  function fresh(mode, userInitiated = true) {
    if (!ready) return;
    clearInput(); w = createWorld({ mode }); w.running = true; selected = 'wood-west'; acknowledge(); lastTime = null; $('surv-panel').scrollTop = 0; $('surv-stage-terminal').open = false;
    if (userInitiated) { revealStage(); canvas.focus({ preventScroll: true }); }
    say(mode === 'demo' ? '完整旅程使用实际步行、搜寻与制作：收集木材、布料与零件，接水修电台，回营地搭棚生火、净水补给，守到天明。可随时接管这片现场。' : '从林间营地出发。先去倒木与旧屋搜寻，再找货车零件；回营地搭棚生火，接水净化，并修复山坡上的无线电。', 8500);
    updateHud(); save();
  }
  function takeover() {
    if (!ready || w.failed) return;
    clearInput(); manualMode(); w.running = true; lastTime = null; revealStage(); canvas.focus({ preventScroll: true });
    say('已接管当前现场：位置、背包、营地、天气与制作进度都保留。点击地点或用 WASD 移动，走近对象按 E。', 7000); updateHud(); save();
  }
  function pause() { if (!ready || w.failed) return; clearInput(); acknowledge(); if (!w.running && w.mode === 'demo' && w.completedAt !== null) manualMode(); w.running = !w.running; lastTime = null; updateHud(); revealStage(); save(); }
  function backgroundPause() { clearInput(); if (ready) { w.running = false; lastTime = null; say('页面暂离，天气、身体状态与制作已暂停。点击“继续探索”恢复。'); updateHud(); save(); } }
  function go() {
    if (!available()) { say('先继续探索，再步行前往选中的地点。'); return false; }
    const destination = destinations.find(o => o.id === selected); if (!destination) return false;
    clearInput(); manualMode(); const ok = changed(targetPoint(w, destination.x, destination.y)); canvas.focus({ preventScroll: true }); return ok;
  }
  async function fullscreen(exitOnly = false) {
    try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (!exitOnly) await stage.requestFullscreen(); }
    catch { say('当前浏览器未开放全屏，可以在这里继续探索。'); }
  }
  function input() {
    const held = action => [...touches.values()].some(item => item.action === action), pressed = code => keys.has(code);
    return { dx: Number(pressed('KeyD') || pressed('ArrowRight') || held('right')) - Number(pressed('KeyA') || pressed('ArrowLeft') || held('left')), dy: Number(pressed('KeyS') || pressed('ArrowDown') || held('down')) - Number(pressed('KeyW') || pressed('ArrowUp') || held('up')) };
  }
  function costText(cost) { return Object.entries(cost).map(([item, amount]) => `${ITEMS[item].label} ${amount}`).join(' · '); }
  function actionPreview(action, value) { return act(clone(w), action, value); }
  function updateHud() {
    const p = w.player, campDistance = distance(p, w.camp), near = currentObject(), nearest = nearestObject(w), atCamp = campDistance <= 1.2, burning = w.camp.fire && w.camp.fuel > 0;
    for (const key of ['health', 'hydration', 'hunger', 'wetness']) { text(`surv-${key}`, `${Math.round(p[key])}${key === 'wetness' ? '%' : ''}`); $(`surv-${key}-meter`).style.width = `${p[key]}%`; }
    text('surv-temperature', `${p.temperature.toFixed(1)}°`); text('surv-time', clock(w.time)); text('surv-weather', w.weather.label); text('surv-objective', objective(w));
    text('surv-mode', `${w.mode === 'demo' ? '完整生存旅程' : '亲自探索'}${w.running ? '' : ' · 已暂停'} · ×${speed}`); text('surv-location', `${atCamp ? '营地' : '山谷'} / ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`);
    text('surv-pending', w.pending ? `净水正在加热 · 剩余 ${w.pending.remaining.toFixed(1)} 秒${w.running ? '' : ' · 已暂停'}` : w.path.length ? `正在步行前往${destinations.find(o => o.id === selected)?.label || '选中地点'} · 走近后按 E` : '点击地点步行前往；走近后按 E。');
    text('surv-near', near?.label || (atCamp ? '林间营地' : '暂无可互动对象'));
    const context = near ? actionPreview('interact', near.id) : null;
    text('surv-near-detail', near ? context.reason : atCamp ? '在这里搭棚、生火、添柴与处理饮水。' : `最近：${nearest?.label || '营地'} · ${nearest?.distance.toFixed(1) || '—'} 格；走到 1.2 格内可互动。`);
    text('surv-context', near ? near.kind === 'radio' ? w.signal.sent ? '信号已发送' : w.signal.repaired ? '发送求救 · E' : '修复电台 · E' : near.kind === 'pump' ? '接一份脏水 · E' : near.depleted ? '这里已搜尽' : '搜寻物资 · E' : atCamp ? '营地制作 · E' : '走近后互动 · E');
    $('surv-context').disabled = !available() || Boolean(w.pending) || (near ? !context.ok : !atCamp);
    text('surv-pause', w.running ? '暂停 · 空格' : w.time ? '继续探索' : '开始探索'); $('surv-pause').disabled = !ready || w.failed; $('surv-takeover').hidden = w.mode !== 'demo'; $('surv-takeover').disabled = !ready || w.failed;
    text('surv-speed', `时间 ×${speed}`); $('surv-speed').setAttribute('aria-pressed', String(speed === 2)); $('surv-speed').disabled = !ready; $('surv-labels').setAttribute('aria-pressed', String(showLabels)); $('surv-labels').disabled = !ready;
    const effectiveSelection = w.mode === 'demo' ? w.selected || (w.target && distance(w.target, w.camp) < .1 ? 'camp' : selected) : selected;
    if (destinations.some(o => o.id === effectiveSelection)) selected = effectiveSelection;
    for (const id of ['surv-target', 'surv-stage-target']) { if (doc.activeElement !== $(id)) $(id).value = selected; $(id).disabled = !ready || w.failed; }
    const destination = destinations.find(o => o.id === selected), actualObject = w.objects.find(o => o.id === selected);
    text('surv-target-detail', destination ? `${destination.label} · 距离 ${distance(p, destination).toFixed(1)} 格。${selected === 'camp' ? '营地制作与烧水需在 1.2 格内。' : actualObject?.depleted ? '已搜尽，痕迹保留。' : selected === 'water' ? '接到脏水后，回营地净化。' : selected === 'radio' ? '零件 2 + 布料 1，修复后发送求救。' : `可找到：${costText(actualObject?.loot || {})}。`}` : '选择一个地点。');
    for (const item of Object.keys(ITEMS)) text(`surv-${item}`, w.inventory[item]);
    text('surv-stage-inventory', Object.keys(ITEMS).map(item => `${ITEMS[item].label} ${w.inventory[item]}`).join(' · '));
    const campText = `${w.camp.shelter ? '庇护所已搭建' : '庇护所未搭建'} · ${burning ? '营火燃烧中' : w.camp.fire ? '营火等待添柴' : '尚未生火'} · ${w.camp.purifier ? '净水器就绪' : '净水器未制作'}`;
    text('surv-camp-state', campText); text('surv-stage-camp', burning ? `营火余量 ${Math.ceil(w.camp.fuel)} 秒` : w.camp.shelter ? '庇护所已搭建' : '未搭建营地'); text('surv-camp-distance', atCamp ? '就在身边' : `距离 ${campDistance.toFixed(1)} 格`); text('surv-fuel', `${Math.ceil(w.camp.fuel)} 秒`); $('surv-fuel-meter').style.width = `${Math.min(100, w.camp.fuel / 135 * 100)}%`;
    text('surv-signal-state', w.signal.sent ? '求救已发送' : w.signal.repaired ? '已修复 · 待发送' : '等待修复');
    const previews = new Map();
    for (const button of actionButtons) {
      const action = button.dataset.survAct, value = button.dataset.survValue, key = value || action;
      if (!previews.has(key)) previews.set(key, actionPreview(action, value));
      const result = previews.get(key); button.disabled = !ready || !result.ok; button.title = result.reason;
    }
    const successText = { shelter: costText(RECIPES.shelter.cost), fire: costText(RECIPES.fire.cost), purifier: costText(RECIPES.purifier.cost), boil: '脏水 1 · 燃料 8 秒 · 加热 3 秒', fuel: '木材 1 → 燃料 45 秒', drink: '净水 1 → 水分 +30', eat: '口粮 1 → 饱腹 +30', repair: '零件 2 · 布料 1', send: '修复后的无线电 · 回营地等天明' };
    for (const view of reasonViews) { const key = view.dataset.survReason, result = previews.get(key); view.textContent = !ready ? '场景准备中' : result?.ok ? successText[key] : result?.reason || successText[key]; }
    touchButtons.forEach(button => button.disabled = !available() || Boolean(w.pending)); goButtons.forEach(button => button.disabled = !available() || Boolean(w.pending)); resetButtons.forEach(button => button.disabled = !ready);
    for (const id of ['surv-demo', 'surv-manual', 'surv-resume']) $(id).disabled = !ready;
    text('surv-control-hint', !ready ? '山谷准备中，天气与身体状态保持静止。' : w.failed ? '体力耗尽 · 重新探索，安排补给与回程。' : !w.running ? '现场已暂停 · 继续后移动、搜寻与制作。' : w.pending ? '净水加热中 · 完成后可继续移动与操作。' : '点击画面：WASD / 方向键移动 · E 互动 · 空格暂停');
    const log = w.log.slice(-6).map(entry => `${clock(entry.time)} · ${entry.text}`).join('\n'); text('surv-log', log); text('surv-stage-log', w.log.slice(-3).map(entry => `${clock(entry.time)} · ${entry.text}`).join('\n'));
    text('surv-hint', now() < hintUntil ? hint : previous ? '上次现场已恢复并暂停。继续上次，或重新开始一段探索。' : objective(w));
    const ended = w.failed || w.completedAt !== null, title = w.failed ? '这一夜，还需要更好的准备。' : '山谷，又亮起来了。';
    const detail = w.failed ? '重新探索，带回材料，给营地留住火与净水。' : `第 ${Math.round(w.completedAt || w.time)} 秒：求救已发送，营地有棚、有火，身体状态安全。现场保留，仍可继续探索。`;
    $('surv-report').hidden = !ended; $('surv-stage-result').hidden = !ended; text('surv-report-title', title); text('surv-stage-result-title', title); text('surv-report-detail', detail); text('surv-stage-result-detail', detail);
  }
  function frame(timestamp) {
    if (!ready || disposed) return;
    const dt = lastTime === null ? 0 : Math.min(.1, Math.max(0, (timestamp - lastTime) / 1000)) * speed; lastTime = timestamp;
    const before = { completedAt: w.completedAt, failed: w.failed, pending: Boolean(w.pending), weather: w.weather.id };
    if (w.running && !doc.hidden) { if (w.mode === 'demo') demoStep(w, dt); stepWorld(w, dt, input()); }
    if (w.mode === 'demo' && w.completedAt !== null && w.running) { w.running = false; clearInput(); lastTime = null; save(); }
    try { renderer.render(w, { selected, showLabels, dt: w.running ? dt : 0 }); }
    catch (error) { renderFailure(error); return; }
    if (timestamp - hudTime >= 150 || dt === 0 || before.completedAt !== w.completedAt || before.failed !== w.failed || before.pending !== Boolean(w.pending) || before.weather !== w.weather.id) { updateHud(); hudTime = timestamp; }
    if (timestamp - saveTime >= 1600) { save(); saveTime = timestamp; }
    frameId = requestFrame(frame);
  }
  function renderFailure(error) {
    backgroundPause(); ready = false; loading = false; cancelFrame?.(frameId); frameId = null; renderer?.dispose?.(); renderer = null;
    $('surv-load-status').hidden = false; $('surv-load-status').dataset.state = 'error'; $('surv-load-retry').hidden = false; text('surv-load-title', '山谷画面暂时未能开启'); text('surv-load-message', `场景或资源未能就绪，现场已暂停并保留。请重试加载。${error?.message ? `（${error.message}）` : ''}`); updateHud();
  }
  async function startRenderer() {
    if (loading || disposed) return false;
    loading = true; ready = false; clearInput(); w.running = false; lastTime = null; cancelFrame?.(frameId); frameId = null;
    const currentAttempt = ++attempt; $('surv-load-status').hidden = false; $('surv-load-status').dataset.state = 'loading'; $('surv-load-retry').hidden = true; text('surv-load-title', '正在准备雨中的山谷'); text('surv-load-message', '正在装载山谷场景与生存物件…'); updateHud();
    try {
      renderer?.dispose?.(); renderer = null;
      const result = await rendererFactory(canvas, { onProgress: progress => { if (currentAttempt === attempt && !disposed) text('surv-load-message', typeof progress === 'string' ? progress : progress?.message || '正在准备山谷…'); } });
      if (disposed || currentAttempt !== attempt) { result?.dispose?.(); return false; }
      if (!result || typeof result.render !== 'function' || typeof result.point !== 'function') throw new Error('场景接口尚未就绪');
      renderer = result; ready = true; loading = false; $('surv-load-status').hidden = true; lastTime = null;
      if (queryDemo && !openingApplied && !previous && w.time === 0) fresh('demo', false); else { updateHud(); save(); }
      openingApplied = true; if ((options.hash ?? win.location?.hash) === '#play') revealStage(); frameId = requestFrame(frame); return true;
    } catch (error) { if (!disposed && currentAttempt === attempt) renderFailure(error); return false; }
  }
  for (const id of ['surv-target', 'surv-stage-target']) {
    $(id).replaceChildren(...destinations.map(destination => { const option = doc.createElement('option'); option.value = destination.id; option.textContent = destination.label; return option; }));
    on($(id), 'change', () => { if (!destinations.some(o => o.id === $(id).value)) return; selected = $(id).value; if (w.mode === 'demo') manualMode(); updateHud(); save(); });
  }
  actionButtons.forEach(button => on(button, 'click', () => perform(button.dataset.survAct, button.dataset.survValue))); goButtons.forEach(button => on(button, 'click', go)); resetButtons.forEach(button => on(button, 'click', () => fresh(button.dataset.survReset)));
  touchButtons.forEach(button => {
    const action = button.dataset.survInput;
    on(button, 'pointerdown', event => { if (!available() || w.pending) return; event.preventDefault(); manualMode(); touches.set(event.pointerId, { button, action }); button.setPointerCapture?.(event.pointerId); button.setAttribute('aria-pressed', 'true'); updateHud(); save(); canvas.focus({ preventScroll: true }); });
    const release = event => { const item = touches.get(event.pointerId); if (!item || item.button !== button) return; touches.delete(event.pointerId); if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId); button.setAttribute('aria-pressed', String([...touches.values()].some(held => held.button === button))); };
    on(button, 'pointerup', release); on(button, 'pointercancel', release); on(button, 'lostpointercapture', release);
  });
  const editable = event => /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target?.tagName || '') || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(doc.activeElement?.tagName || '') || event.target?.closest?.('button,input,textarea,select,a,[contenteditable="true"]') || event.target?.isContentEditable;
  const holdKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  on(win, 'keydown', event => {
    if (!ready || editable(event) || doc.activeElement !== canvas && event.target !== canvas) return;
    if (holdKeys.includes(event.code)) { event.preventDefault(); if (!available() || w.pending) return; manualMode(); keys.add(event.code); updateHud(); return; }
    if (!['Space', 'KeyE'].includes(event.code) || event.repeat) return; event.preventDefault(); if (event.code === 'Space') pause(); else interact();
  });
  on(win, 'keyup', event => keys.delete(event.code));
  on(canvas, 'pointerdown', event => {
    if (event.button !== 0) return; event.preventDefault(); canvas.focus({ preventScroll: true });
    if (!available() || w.pending) return;
    const point = renderer.point(event.clientX, event.clientY); if (!point) return; clearInput(); manualMode(); const result = targetPoint(w, point.x, point.y);
    if (result.ok) selected = w.selected || (distance(point, w.camp) < .6 ? 'camp' : selected); changed(result);
  });
  on($('surv-demo'), 'click', () => fresh('demo')); on($('surv-manual'), 'click', () => fresh('manual')); on($('surv-pause'), 'click', pause); on($('surv-takeover'), 'click', takeover); on($('surv-context'), 'click', interact);
  on($('surv-speed'), 'click', () => { if (!ready) return; speed = speed === 1 ? 2 : 1; updateHud(); save(); revealStage(); }); on($('surv-labels'), 'click', () => { if (!ready) return; showLabels = !showLabels; updateHud(); save(); revealStage(); });
  on($('surv-fullscreen'), 'click', () => fullscreen()); on($('surv-fullscreen-exit'), 'click', () => fullscreen(true));
  on($('surv-stage-terminal'), 'toggle', revealStage);
  on($('surv-resume'), 'click', () => { if (!ready || !previous || w.failed) return; clearInput(); acknowledge(); if (w.mode === 'demo' && w.completedAt !== null) manualMode(); w.running = true; lastTime = null; revealStage(); canvas.focus({ preventScroll: true }); say('继续上次现场：搜寻痕迹、背包、营地与身体状态保留。'); updateHud(); save(); });
  on(win, 'blur', backgroundPause); on(win, 'pagehide', backgroundPause); on(doc, 'visibilitychange', () => { if (doc.hidden) backgroundPause(); });
  on(canvas, 'webglcontextlost', event => { event.preventDefault(); renderFailure(new Error('画面上下文中断，重试后继续同一片现场')); });
  on($('surv-load-retry'), 'click', () => { void startRenderer(); });
  const readyPromise = startRenderer();
  return { readyPromise, frame, retryRenderer: startRenderer, save, getWorld: () => w, getSpeed: () => speed, getSelected: () => selected, get ready() { return ready && !disposed; }, dispose() { if (disposed) return; clearInput(); save(); disposed = true; ready = false; attempt++; cancelFrame?.(frameId); frameId = null; subscriptions.forEach(remove => remove()); renderer?.dispose?.(); renderer = null; } };
}

if (typeof document !== 'undefined' && document.getElementById('survival-canvas')) window.survivalDirection = createSurvivalController();
