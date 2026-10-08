import { WAYPOINTS, TUNES, createWorld, stepWorld, act, demoStep, driveTo, contextualAction, objective, status, serialize, restore } from './direction-vehicle-engine.js';

export const VEHICLE_STORAGE_KEY = 'world-play-direction-vehicle-v1';
const defaultRenderer = async (canvas, options) => (await import('./direction-vehicle-render.js')).createVehicleRenderer(canvas, options);
const actionLabels = { dispatch: '领取运输任务', load: '北坡装载建材', deliver: '桥东卸货交付', finish: '返回车库验收' };
const stageTarget = stage => ({ dispatch: 'depot', load: 'depot', deliver: 'destination', return: 'garage', complete: 'garage' })[stage] ?? 'depot';
const cameras = ['chase', 'survey', 'orbit'], cameraNames = { chase: '3D 追尾视角', survey: '3D 试车场总览', orbit: '3D 环绕检视' };

export function createVehicleController(options = {}) {
  const doc = options.document ?? globalThis.document, win = options.window ?? globalThis.window, storage = options.storage ?? globalThis.localStorage;
  const requestFrame = options.requestFrame ?? win.requestAnimationFrame.bind(win), cancelFrame = options.cancelFrame ?? win.cancelAnimationFrame?.bind(win), now = options.now ?? (() => Date.now()), rendererFactory = options.rendererFactory ?? defaultRenderer;
  const $ = id => doc.getElementById(id), canvas = $('vehicle-canvas'), stage = $('vehicle-stage'), keys = new Set(), touches = new Map(), subscriptions = [];
  const actionButtons = [...doc.querySelectorAll('[data-vehicle-act]')], touchButtons = [...doc.querySelectorAll('[data-vehicle-input]')], wheelRows = [...doc.querySelectorAll('[data-vehicle-wheel]')];
  const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  let w = createWorld(), cameraMode = 'chase', showTelemetry = true, timescale = 1, selectedTarget = 'depot', demoMode = false, previous = false;
  let ready = false, loading = false, disposed = false, renderer = null, frameId = null, lastTime = null, hudTime = 0, saveTime = 0, hintUntil = 0, manualHint = '', loadAttempt = 0, openingApplied = false;
  try {
    const saved = JSON.parse(storage.getItem(VEHICLE_STORAGE_KEY) || 'null'), recovered = saved?.version === 1 && restore(saved.world);
    if (recovered) { w = recovered; previous = true; demoMode = saved.demoMode === true && w.phase !== 'complete'; cameraMode = cameras.includes(saved.cameraMode) ? saved.cameraMode : 'chase'; showTelemetry = saved.showTelemetry !== false; timescale = saved.timescale === 2 ? 2 : 1; selectedTarget = WAYPOINTS.some(p => p.id === saved.selectedTarget) ? saved.selectedTarget : stageTarget(w.stage); }
  } catch { /* Invalid or unavailable storage starts at the paused garage. */ }
  const queryDemo = new URLSearchParams(options.search ?? win.location?.search ?? '').get('demo') === '1' && !previous;
  function on(element, type, callback) { element.addEventListener(type, callback); subscriptions.push(() => element.removeEventListener?.(type, callback)); }
  function text(id, value) { const e = $(id); if (e.textContent !== String(value)) e.textContent = String(value); }
  function say(value, duration = 5000) { if (!value) return; manualHint = value; hintUntil = now() + duration; text('vehicle-hint', value); }
  function save() {
    if (!ready || disposed) return;
    try { storage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify({ version: 1, world: serialize(w), cameraMode, showTelemetry, timescale, selectedTarget, demoMode })); text('vehicle-save-status', '车辆、货物与试车记录已保存'); }
    catch { text('vehicle-save-status', '浏览器未开放保存，可继续本次驾驶'); }
  }
  function refreshTouches() { touchButtons.forEach(button => button.setAttribute('aria-pressed', String([...touches.values()].some(item => item.button === button)))); }
  function clearInput() {
    keys.clear(); const held = [...touches]; touches.clear(); refreshTouches();
    for (const [id, item] of held) if (item.button.hasPointerCapture?.(id)) item.button.releasePointerCapture(id);
  }
  function acknowledge() { previous = false; $('vehicle-resume').hidden = true; }
  function available() { return ready && !disposed && !w.paused && w.phase === 'playing'; }
  function manualMode(cancelAssist = false) { demoMode = false; acknowledge(); if (cancelAssist) act(w, 'cancel-assist'); }
  function revealStage() {
    if (doc.fullscreenElement) return;
    const rect = stage.getBoundingClientRect(), lead = Math.max(12, (win.innerHeight - rect.height) / 2);
    win.scrollTo?.({ top: Math.max(0, win.scrollY + rect.top - lead), behavior: reducedMotion ? 'auto' : 'instant' });
  }
  function changed(result) { say(result?.reason || '当前无法执行这项操作。'); updateHud(); save(); return Boolean(result?.ok); }
  function perform(action, value) {
    if (!ready) return false;
    manualMode(true); const result = act(w, action, value);
    if (result.ok && action !== 'tune') selectedTarget = stageTarget(w.stage);
    if (w.phase === 'complete') clearInput();
    return changed(result);
  }
  function fresh(mode, initiated = true) {
    if (!ready) return;
    clearInput(); w = createWorld(); w.paused = false; demoMode = mode === 'demo'; selectedTarget = 'depot'; acknowledge(); lastTime = null; $('vehicle-panel').scrollTop = 0; $('vehicle-stage-controls')?.scrollTo?.({ top: 0 });
    if (initiated) revealStage(); canvas.focus({ preventScroll: true });
    say(demoMode ? '完整试车：领取任务，实际驶上缓坡，装载 320 kg 建材，经过搓板路交付，再空车跨桥回库。可随时接管同一辆车。' : '已从岚谷车库开始。先选悬架并领取任务，再驶往北坡料站。W 油门、S 倒车、AD 转向、B 制动。', 8000); updateHud(); save();
  }
  function takeover() {
    if (!ready || w.phase !== 'playing') return;
    clearInput(); w.paused = false; manualMode(true); lastTime = null; revealStage(); canvas.focus({ preventScroll: true });
    say('已接管同一辆车：位置、速度、载重和四轮状态均保留。方向与踏板由你操纵。', 6500); updateHud(); save();
  }
  function pause() { if (!ready || w.phase !== 'playing') return; clearInput(); acknowledge(); act(w, 'pause', !w.paused); lastTime = null; updateHud(); revealStage(); save(); }
  function changeCamera() { cameraMode = cameras[(cameras.indexOf(cameraMode) + 1) % cameras.length]; renderer?.resize?.(); updateHud(); save(); }
  function assist() {
    if (!available()) { say(w.phase === 'complete' ? '这一轮试车已经完成，可以开启新一轮。' : '先继续驾驶，再开启驾驶辅助。'); return; }
    const stop = w.route.active; clearInput(); manualMode(); changed(act(w, stop ? 'cancel-assist' : 'assist', stop ? undefined : selectedTarget)); canvas.focus({ preventScroll: true });
  }
  function context() { perform(contextualAction(w) ?? ({ dispatch: 'dispatch', load: 'load', deliver: 'deliver', return: 'finish' })[w.stage]); }
  async function fullscreen(exitOnly = false) {
    try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (!exitOnly) await stage.requestFullscreen(); renderer?.resize?.(); }
    catch { say('浏览器未开放全屏，可以继续在当前舞台驾驶。'); }
  }
  function backgroundPause() { clearInput(); if (ready) { if (w.phase === 'playing') act(w, 'pause', true); lastTime = null; say('页面暂离，车辆与悬架已暂停。点击“继续驾驶”恢复。'); updateHud(); save(); } }
  function input() {
    const held = action => [...touches.values()].some(item => item.action === action), pressed = code => keys.has(code), reverse = pressed('KeyS') || pressed('ArrowDown') || held('reverse');
    return { throttle: Number(pressed('KeyW') || pressed('ArrowUp') || held('throttle') || reverse), reverse, steer: Number(pressed('KeyD') || pressed('ArrowRight') || held('right')) - Number(pressed('KeyA') || pressed('ArrowLeft') || held('left')), brake: Number(pressed('KeyB') || held('brake')) };
  }
  function preview(action, value) { return act(structuredClone(w), action, value); }
  function updateHud() {
    const v = w.vehicle, contacts = v.wheels.filter(wheel => wheel.contact).length, target = WAYPOINTS.find(p => p.id === selectedTarget) ?? WAYPOINTS[1], distance = Math.hypot(v.x - target.x, v.z - target.z), near = WAYPOINTS.find(p => Math.hypot(v.x - p.x, v.z - p.z) < p.radius + 2), complete = w.phase === 'complete';
    text('vehicle-speed', Math.abs(v.speed * 3.6).toFixed(1)); text('vehicle-cargo', w.cargo.mass); text('vehicle-pitch', (v.pitch * 180 / Math.PI).toFixed(1)); text('vehicle-roll', (v.roll * 180 / Math.PI).toFixed(1)); text('vehicle-contact', `${contacts} / 4`); text('vehicle-task', objective(w));
    text('vehicle-camera-name', cameraNames[cameraMode]); text('vehicle-camera', cameraMode === 'chase' ? '试车场总览 · C' : cameraMode === 'survey' ? '环绕检视 · C' : '追尾驾驶 · C'); text('vehicle-mode', complete ? '试车完成 · 已暂停' : previous ? '存档已恢复 · 暂停' : w.paused ? '试车暂停' : demoMode ? '完整试车示范' : w.route.active ? '驾驶辅助中' : v.speed < -.1 ? '手动倒车' : '手动驾驶'); text('vehicle-location', near?.name ?? '岚谷试车道路');
    text('vehicle-drive-target', `驶向 / ${target.name}`); text('vehicle-drive-distance', `${Math.round(distance)} m`); text('vehicle-target-detail', `${target.name} · 距离 ${Math.round(distance)} m。${target.id === 'depot' ? '沿西侧缓坡抵达，停稳后装载 320 kg 建材。' : target.id === 'destination' ? '横穿北侧搓板路，停稳后卸货交付。' : '回库验收前需沿东侧跨过桥面。'}`);
    if (demoMode && w.route.target && doc.activeElement !== $('vehicle-target') && doc.activeElement !== $('vehicle-stage-target')) selectedTarget = w.route.target;
    for (const id of ['vehicle-target', 'vehicle-stage-target']) { if (doc.activeElement !== $(id)) $(id).value = selectedTarget; $(id).disabled = !ready || complete; }
    text('vehicle-terminal-state', near?.name ?? `${Math.abs(v.speed * 3.6).toFixed(1)} km/h · 道路上`); text('vehicle-tune-name', w.tune === 'firm' ? '紧致悬架' : '舒适悬架'); text('vehicle-tune-detail', `每轮弹簧 ${Math.round(TUNES[w.tune].spring / 1000)} kN/m · 阻尼 ${Math.round(TUNES[w.tune].damper)} N·s/m。当前压缩由地面高度与车身姿态共同计算。`); text('vehicle-mass', `${v.mass.toLocaleString('en-US')} kg`); text('vehicle-cargo-state', w.cargo.units ? `${w.cargo.units} 件 · ${w.cargo.mass} kg` : w.stats.delivered ? '已交付 · 空载' : '空载'); text('vehicle-cargo-detail', w.stage === 'dispatch' ? '在车库领取任务，然后去北坡料站装载 320 kg 建材。' : w.stage === 'load' ? '实际驶入北坡料站并停稳后，装载 4 件建材。' : w.stage === 'deliver' ? '4 件建材在车上，实际质量已增加。驶向桥东工地停稳交付。' : w.stage === 'return' ? '货物已交付。空车沿东侧跨桥，再回车库验收。' : '4 件建材全部交付，桥面测试与回库记录已完成。');
    text('vehicle-distance', `${Math.round(w.stats.distance)} m`); text('vehicle-max-compression', `${Math.round(w.stats.maxCompression * 1000)} mm`); text('vehicle-mean-contact', `${contacts} / 4`);
    for (const [index, row] of wheelRows.entries()) { const wheel = v.wheels[index]; if (!wheel) continue; row.dataset.contact = String(wheel.contact); row.dataset.compression = String(wheel.compression); const meter = row.querySelector('i > i'), label = row.querySelector('b'); if (meter) meter.style.width = `${Math.min(100, wheel.compression / .43 * 100)}%`; if (label) label.textContent = `${Math.round(wheel.compression * 1000)} mm${wheel.contact ? '' : ' · 离地'}`; }
    $('vehicle-springs').hidden = !showTelemetry; $('vehicle-telemetry').setAttribute('aria-pressed', String(showTelemetry)); text('vehicle-telemetry', showTelemetry ? '隐藏悬架读数' : '显示悬架读数'); $('vehicle-timescale').setAttribute('aria-pressed', String(timescale === 2)); text('vehicle-timescale', `时间 ×${timescale}`);
    const sequence = ['dispatch', 'load', 'deliver', 'return', 'complete'], stageIndex = sequence.indexOf(w.stage);
    for (const [index, id] of ['dispatch', 'load', 'deliver', 'finish'].entries()) $('vehicle-stop-' + id).dataset.state = stageIndex > index ? 'done' : stageIndex === index ? 'current' : 'pending';
    actionButtons.forEach(button => { const action = button.dataset.vehicleAct, value = button.dataset.vehicleValue, result = preview(action, value); button.disabled = !ready || !result.ok; button.title = result.reason; if (action === 'tune') button.setAttribute('aria-pressed', String(w.tune === value)); });
    const expected = ({ dispatch: 'dispatch', load: 'load', deliver: 'deliver', return: 'finish' })[w.stage], result = expected && preview(expected);
    $('vehicle-context').disabled = !ready || !result?.ok; text('vehicle-context', complete ? '试车已完成' : `${actionLabels[expected]} · E`); text('vehicle-action-reason', result?.ok ? `已停稳，可以${actionLabels[expected]}。` : result?.reason || '任务与测试已完成。');
    $('vehicle-assist').disabled = !available() || w.stage === 'dispatch'; $('vehicle-assist').setAttribute('aria-pressed', String(w.route.active)); text('vehicle-assist', w.route.active ? '停止驾驶辅助' : '开启驾驶辅助'); $('vehicle-pause').disabled = !ready || complete; text('vehicle-pause', complete ? '试车已完成' : w.paused ? w.time ? '继续驾驶' : '开始驾驶' : '暂停驾驶'); $('vehicle-takeover').hidden = !demoMode || complete; $('vehicle-takeover').disabled = !ready;
    text('vehicle-control-hint', !ready ? '三维场景准备中，车辆保持静止。' : complete ? '本轮配送与试车完成 · 已暂停保存 · 可开始新一轮' : w.paused ? '试车已暂停 · 车辆、悬架与路线保持不动' : '点击画面：W 油门 · S 倒车 · AD 转向 · B 制动 · E 操作 · 空格暂停');
    text('vehicle-hint', complete ? '建材已交付，桥面与回库测试已完成。本轮已暂停保存，可查看读数或开启新的试车。' : now() < hintUntil ? manualHint : previous ? '上次车辆已恢复并暂停。继续上次，或开始新一轮试车。' : status(w)); text('vehicle-log', w.log.slice(-5).map(item => `${Math.floor(item.time)}s · ${item.text}`).join('\n'));
    $('vehicle-report').hidden = !complete; if (complete) text('vehicle-report-detail', `用时 ${Math.round(w.completedAt)} 秒，实际行驶 ${Math.round(w.stats.distance)} m，交付 ${w.stats.delivered} 件建材。最大悬架压缩 ${Math.round(w.stats.maxCompression * 1000)} mm，碰撞 ${w.stats.collisions} 次。车辆已在车库停稳并保存。`);
    ['vehicle-demo', 'vehicle-manual', 'vehicle-retry'].forEach(id => $(id).disabled = !ready); $('vehicle-resume').hidden = !previous; $('vehicle-resume').disabled = !ready || complete; ['vehicle-camera', 'vehicle-telemetry', 'vehicle-timescale', 'vehicle-fullscreen', 'vehicle-fullscreen-exit'].forEach(id => $(id).disabled = !ready);
  }
  function rendererFailed(error) {
    clearInput(); if (w.phase === 'playing') w.paused = true; lastTime = null; save(); ready = false; cancelFrame?.(frameId); frameId = null; renderer?.dispose?.(); renderer = null; $('vehicle-load-status').hidden = false; $('vehicle-load-status').dataset.state = 'error'; $('vehicle-load-retry').hidden = false; text('vehicle-load-title', '3D 画面暂时中断'); text('vehicle-load-message', `车辆已暂停并保留。点击重试重新创建试车场。${error?.message ? `（${error.message}）` : ''}`); updateHud();
  }
  function frame(timestamp) {
    if (!ready || disposed) return;
    const realDt = lastTime === null ? 0 : Math.min(.1, Math.max(0, (timestamp - lastTime) / 1000)), dt = realDt * timescale; lastTime = timestamp;
    if (!w.paused && w.phase === 'playing') {
      let controls = input();
      if (demoMode) { const plan = demoStep(w); if (plan.action) { act(w, plan.action, plan.payload); selectedTarget = stageTarget(w.stage); } controls = plan.input; }
      else if (w.route.active) controls = driveTo(w, w.route.target);
      stepWorld(w, dt, controls);
      if (w.phase === 'complete') { clearInput(); demoMode = false; updateHud(); save(); }
    }
    try { renderer.render(w, { cameraMode, showTelemetry, dt: realDt }); } catch (error) { rendererFailed(error); return; }
    if (timestamp - hudTime >= 150 || realDt === 0) { updateHud(); hudTime = timestamp; }
    if (timestamp - saveTime >= 1800) { save(); saveTime = timestamp; }
    frameId = requestFrame(frame);
  }
  async function startRenderer() {
    if (loading || disposed) return false;
    loading = true; ready = false; clearInput(); w.paused = true; lastTime = null; cancelFrame?.(frameId); frameId = null;
    const attempt = ++loadAttempt; $('vehicle-load-status').hidden = false; $('vehicle-load-status').dataset.state = 'loading'; $('vehicle-load-retry').hidden = true; text('vehicle-load-title', '正在准备试车场'); text('vehicle-load-message', '正在装载三维车辆与山谷…'); updateHud();
    try {
      renderer?.dispose?.(); renderer = null;
      const result = await rendererFactory(canvas, { onProgress: value => { if (attempt === loadAttempt && !disposed) text('vehicle-load-message', typeof value === 'string' ? value : value?.message || '正在装载三维车辆与地面纹理…'); } });
      if (disposed || attempt !== loadAttempt) { result.dispose?.(); return false; }
      renderer = result; if (!renderer || typeof renderer.render !== 'function') throw new Error('3D 渲染器尚未就绪'); ready = true; loading = false; $('vehicle-load-status').hidden = true; lastTime = null;
      if (queryDemo && !openingApplied && !previous && w.time === 0) fresh('demo', false); else { updateHud(); save(); }
      openingApplied = true; renderer.resize?.(); if (win.location?.hash === '#play') revealStage(); frameId = requestFrame(frame); return true;
    } catch (error) {
      loading = false; ready = false; w.paused = true; clearInput(); renderer?.dispose?.(); renderer = null;
      if (disposed) return false;
      $('vehicle-load-status').hidden = false; $('vehicle-load-status').dataset.state = 'error'; $('vehicle-load-retry').hidden = false; text('vehicle-load-title', '3D 试车场尚未能开启'); text('vehicle-load-message', `WebGL 或三维资源未能就绪。请开启浏览器硬件加速后重试。${error?.message ? `（${error.message}）` : ''}`); updateHud(); return false;
    }
  }
  for (const id of ['vehicle-target', 'vehicle-stage-target']) {
    $(id).replaceChildren(...WAYPOINTS.map(point => { const e = doc.createElement('option'); e.value = point.id; e.textContent = point.name; return e; }));
    on($(id), 'change', () => { if (!WAYPOINTS.some(p => p.id === $(id).value)) return; selectedTarget = $(id).value; manualMode(true); updateHud(); save(); });
  }
  actionButtons.forEach(button => on(button, 'click', () => perform(button.dataset.vehicleAct, button.dataset.vehicleValue)));
  touchButtons.forEach(button => {
    on(button, 'pointerdown', event => { if (!available() || event.button !== undefined && event.button !== 0) return; event.preventDefault(); manualMode(true); touches.set(event.pointerId, { button, action: button.dataset.vehicleInput }); button.setPointerCapture?.(event.pointerId); refreshTouches(); updateHud(); });
    const release = event => { if (touches.get(event.pointerId)?.button !== button) return; touches.delete(event.pointerId); if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId); refreshTouches(); };
    on(button, 'pointerup', release); on(button, 'pointercancel', release); on(button, 'lostpointercapture', release);
  });
  const editable = event => /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(event.target?.tagName || '') || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(doc.activeElement?.tagName || '') || event.target?.closest?.('button,input,textarea,select,a,summary,[contenteditable="true"]') || event.target?.isContentEditable;
  const holdKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyB', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  on(win, 'keydown', event => {
    if (!ready || editable(event) || doc.activeElement !== canvas && event.target !== canvas) return;
    if (holdKeys.includes(event.code)) { if (!available()) return; event.preventDefault(); manualMode(true); keys.add(event.code); return; }
    if (!['Space', 'KeyE', 'KeyC'].includes(event.code) || event.repeat) return; event.preventDefault(); if (event.code === 'Space') pause(); else if (event.code === 'KeyE') context(); else changeCamera();
  });
  on(win, 'keyup', event => keys.delete(event.code)); on(canvas, 'pointerdown', event => { if (event.button === 0) canvas.focus({ preventScroll: true }); });
  on($('vehicle-demo'), 'click', () => fresh('demo')); on($('vehicle-manual'), 'click', () => fresh('manual')); on($('vehicle-retry'), 'click', () => fresh('manual')); on($('vehicle-pause'), 'click', pause); on($('vehicle-takeover'), 'click', takeover); on($('vehicle-context'), 'click', context); on($('vehicle-assist'), 'click', assist); on($('vehicle-camera'), 'click', changeCamera);
  on($('vehicle-telemetry'), 'click', () => { showTelemetry = !showTelemetry; updateHud(); save(); }); on($('vehicle-timescale'), 'click', () => { timescale = timescale === 1 ? 2 : 1; updateHud(); save(); }); on($('vehicle-fullscreen'), 'click', () => fullscreen()); on($('vehicle-fullscreen-exit'), 'click', () => fullscreen(true));
  on(doc, 'fullscreenchange', () => renderer?.resize?.()); on(win, 'resize', () => renderer?.resize?.()); on($('vehicle-stage-terminal'), 'toggle', () => { renderer?.resize?.(); revealStage(); });
  on($('vehicle-resume'), 'click', () => { if (!ready || !previous || w.phase !== 'playing') return; clearInput(); acknowledge(); w.paused = false; lastTime = null; $('vehicle-panel').scrollTop = 0; revealStage(); canvas.focus({ preventScroll: true }); say('已继续上次试车，车辆位置、速度、载重、调校与路线均已保留。'); updateHud(); save(); });
  on(win, 'blur', backgroundPause); on(doc, 'visibilitychange', () => { if (doc.hidden) backgroundPause(); }); on(win, 'pagehide', backgroundPause);
  on(canvas, 'webglcontextlost', event => { event.preventDefault(); rendererFailed(new Error('WebGL 上下文丢失，现场已保留')); }); on($('vehicle-load-retry'), 'click', () => { void startRenderer(); });
  const readyPromise = startRenderer();
  return { readyPromise, frame, save, retryRenderer: startRenderer, getWorld: () => w, getCamera: () => cameraMode, getTimescale: () => timescale, getSelected: () => selectedTarget, getDemoMode: () => demoMode, get ready() { return ready && !disposed; }, dispose() { if (disposed) return; clearInput(); save(); disposed = true; ready = false; loadAttempt++; cancelFrame?.(frameId); subscriptions.forEach(remove => remove()); renderer?.dispose?.(); renderer = null; } };
}
if (typeof document !== 'undefined' && document.getElementById('vehicle-canvas')) window.vehicleDirection = createVehicleController();
