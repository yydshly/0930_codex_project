import { PORTS, SURVEY, PRICES, createWorld, stepWorld, act, demoStep, serializeWorld, restoreWorld, objective } from './direction-space-engine.js';
import { createSpaceRenderer } from './direction-space-render.js';

export const SPACE_STORAGE_KEY = 'world-play-direction-space-v1';

export function createSpaceController(options = {}) {
  const doc = options.document ?? globalThis.document, win = options.window ?? globalThis.window, storage = options.storage ?? globalThis.localStorage;
  const requestFrame = options.requestFrame ?? win.requestAnimationFrame.bind(win), cancelFrame = options.cancelFrame ?? win.cancelAnimationFrame?.bind(win), now = options.now ?? (() => Date.now()), rendererFactory = options.rendererFactory ?? createSpaceRenderer;
  const $ = id => doc.getElementById(id), canvas = $('space-canvas'), destinations = [...PORTS, SURVEY], touches = new Map(), keys = new Set(), subscriptions = [];
  const touchButtons = [...doc.querySelectorAll('[data-space-input]')], actionButtons = [...doc.querySelectorAll('[data-space-act]')], priceViews = [...doc.querySelectorAll('[data-space-price]')];
  const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  let w = createWorld(), ready = false, loading = false, disposed = false, renderer = null, frameId = null, view = 'chase', selectedTarget = 'forge', previous = false, scanRequested = false, lastTime = null, hudTime = 0, saveTime = 0, hintUntil = 0, manualHint = '', loadAttempt = 0, openingApplied = false;
  w.paused = true; w.demoAuto = false;
  try {
    const saved = JSON.parse(storage.getItem(SPACE_STORAGE_KEY) || 'null'), recovered = saved?.version === 1 && restoreWorld(saved.world);
    if (recovered) { w = recovered; w.paused = true; previous = true; view = saved.view === 'sector' ? 'sector' : 'chase'; selectedTarget = destinations.some(p => p.id === saved.selectedTarget) ? saved.selectedTarget : w.target; if (!destinations.some(p => p.id === selectedTarget)) selectedTarget = 'forge'; $('space-resume').hidden = false; }
  } catch { /* Invalid or unavailable storage leaves a fresh paused vessel. */ }
  const queryDemo = new URLSearchParams(options.search ?? win.location?.search ?? '').get('demo') === '1' && !previous;

  function on(element, type, handler) { element.addEventListener(type, handler); subscriptions.push(() => element.removeEventListener?.(type, handler)); }
  function text(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
  function say(value, duration = 5000) { if (!value) return; manualHint = value; hintUntil = now() + duration; text('space-hint', value); }
  function save() {
    if (!ready || disposed) return;
    try { storage.setItem(SPACE_STORAGE_KEY, JSON.stringify({ version: 1, world: serializeWorld(w), selectedTarget, view })); text('space-save-status', '航程、速度与货舱已独立保存'); }
    catch { text('space-save-status', '浏览器未开放保存，可继续本次航行'); }
  }
  function clearInput() {
    keys.clear(); scanRequested = false;
    const held = [...touches]; touches.clear();
    for (const [id, item] of held) { item.button.setAttribute('aria-pressed', 'false'); if (item.button.hasPointerCapture?.(id)) item.button.releasePointerCapture(id); }
  }
  function acknowledge() { previous = false; $('space-resume').hidden = true; }
  function manualMode(stopNavigation = false) { w.demoAuto = false; acknowledge(); if (stopNavigation) act(w, 'autopilot', false); }
  function available() { return ready && !w.paused && !w.rescue && !disposed; }
  function revealStage() {
    if (doc.fullscreenElement) return;
    const rect = $('space-stage').getBoundingClientRect(), lead = Math.max(12, (win.innerHeight - rect.height) / 2);
    win.scrollTo?.({ top: Math.max(0, win.scrollY + rect.top - lead), behavior: reducedMotion ? 'auto' : 'instant' });
  }
  function changed(result) { say(result?.reason || '当前无法完成这项操作。'); updateHud(); save(); return Boolean(result?.ok); }
  function perform(action, value) {
    if (!ready) return false;
    if (w.paused) { say('航程已暂停。先继续航行，再操作飞船或港站。'); return false; }
    if (w.rescue) { say('救援正在接应，飞船操纵与港站操作暂时锁定。'); return false; }
    if (action === 'rescue') clearInput();
    manualMode(); return changed(act(w, action, value));
  }
  function fresh(mode, userInitiated = true) {
    if (!ready) return;
    clearInput(); w = createWorld(); w.paused = false; w.demoAuto = mode === 'demo'; selectedTarget = 'forge'; acknowledge(); lastTime = null;
    $('space-panel').scrollTop = 0;
    if (userInitiated) revealStage(); canvas.focus({ preventScroll: true });
    say(mode === 'demo' ? '完整航程：曙光接单并购入药品，飞往矿站交付与交易，扫描远域信标，再回曙光结算。每段航行使用真实推力与导航规则，可随时接管。' : '自由驾驶从曙光港开始。先接收运输委托，选矿站为目标并开启自动导航，或离港后亲自驾驶。', 8500);
    updateHud(); save();
  }
  function takeover() {
    if (!ready) return;
    clearInput(); w.paused = false; manualMode(true); lastTime = null; revealStage(); canvas.focus({ preventScroll: true });
    say('已接管同一艘飞船：当前位置、速度、燃料与货舱都保留。W 推力、AD 转向、S 制动；也可重新开启自动导航。', 7000); updateHud(); save();
  }
  function pause() { if (!ready) return; clearInput(); acknowledge(); w.paused = !w.paused; lastTime = null; updateHud(); revealStage(); save(); }
  function changeView() { view = view === 'chase' ? 'sector' : 'chase'; renderer?.resize(); updateHud(); revealStage(); save(); }
  function navigate() {
    if (!available()) { say('先继续航行，再开启自动导航。'); return; }
    clearInput(); manualMode();
    const next = !w.autopilot; if (next) { const targetResult = act(w, 'target', selectedTarget); if (!targetResult.ok) { changed(targetResult); return; } }
    changed(act(w, 'autopilot', next)); canvas.focus({ preventScroll: true });
  }
  function dock() { perform(w.docked ? 'undock' : 'dock'); }
  function toggleScan() { if (!available()) return; manualMode(); scanRequested = !scanRequested; say(scanRequested ? '扫描已开启。靠近远域信标并减速，保持扫描至完成；再次点击停止。' : '扫描已停止。'); updateHud(); save(); }
  async function fullscreen(exitOnly = false) {
    try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (!exitOnly) await $('space-stage').requestFullscreen(); renderer?.resize(); }
    catch { say('当前浏览器未开放全屏，可以继续在这里驾驶。'); }
  }
  function backgroundPause() { clearInput(); if (ready) { w.paused = true; lastTime = null; say('页面暂离，航程已暂停。点击“继续航行”恢复。'); updateHud(); save(); } }
  function input() {
    const held = action => [...touches.values()].some(item => item.action === action), pressed = code => keys.has(code);
    return { turn: Number(pressed('KeyD') || pressed('ArrowRight') || held('right')) - Number(pressed('KeyA') || pressed('ArrowLeft') || held('left')), thrust: Number(pressed('KeyW') || pressed('ArrowUp') || held('thrust')), brake: pressed('KeyS') || pressed('ArrowDown') || held('brake'), boost: pressed('ShiftLeft') || pressed('ShiftRight') || held('boost'), scan: scanRequested || pressed('KeyF') };
  }

  function updateHud() {
    const speed = Math.hypot(w.ship.vx, w.ship.vz), cargo = w.cargo.medicine + w.cargo.ore, target = destinations.find(p => p.id === w.target), selected = destinations.find(p => p.id === selectedTarget) ?? PORTS[0], port = PORTS.find(p => p.id === w.docked), prices = port && PRICES[port.id], scanProgress = Math.min(100, Math.max(0, w.survey.progress / 5 * 100));
    text('space-speed', speed.toFixed(1)); text('space-fuel', `${Math.max(0, Math.round(w.fuel))}%`); $('space-fuel-meter').style.width = `${Math.max(0, Math.min(100, w.fuel))}%`; text('space-credits', Math.floor(w.credits).toLocaleString('en-US')); text('space-cargo', `${cargo} / ${w.capacity}`); text('space-task', w.rescue ? `救援接应 · ${Math.ceil(w.rescue.remaining)}秒` : w.phase === 'completed' ? '委托与探索已完成' : objective(w));
    text('space-view-name', view === 'chase' ? '3D 追尾视角' : '3D 航区总览'); text('space-view', view === 'chase' ? '航区总览 · C' : '追尾驾驶 · C'); $('space-view').setAttribute('aria-pressed', String(view === 'sector')); text('space-mode', `${w.demoAuto ? '完整航程示范' : '自由驾驶'}${w.paused ? ' · 已暂停' : w.autopilot ? ' · 自动导航' : ''}`);
    text('space-location', port ? `靠泊 · ${port.name}` : `深空 · ${w.ship.x.toFixed(0)}, ${w.ship.z.toFixed(0)}`); text('space-flight-target', `航向 / ${target?.name || selected.name}`); text('space-flight-distance', port ? '靠泊中' : target ? `${Math.round(Math.hypot(w.ship.x - target.x, w.ship.z - target.z))} u` : '自由航行');
    const pauseLabel = w.paused ? w.time ? '继续航行' : '开始航行' : '暂停'; text('space-pause', pauseLabel); $('space-pause').disabled = !ready; $('space-takeover').hidden = !w.demoAuto; $('space-takeover').disabled = !ready; text('space-nav', w.autopilot ? '停止自动导航' : '自动导航'); $('space-nav').disabled = !available(); text('space-dock', port ? '离开港站 · E' : '低速泊船 · E'); $('space-dock').disabled = !available();
    text('space-scan', scanRequested || keys.has('KeyF') ? '停止扫描 · F' : '开始扫描 · F'); $('space-scan').setAttribute('aria-pressed', String(scanRequested || keys.has('KeyF'))); $('space-scan').disabled = !available() || Boolean(w.docked) || w.survey.complete; touchButtons.forEach(button => button.disabled = !available());
    text('space-control-hint', !ready ? '3D 航区准备中，飞船保持静止。' : w.paused ? '航程已暂停 · 继续后操纵飞船' : w.rescue ? `救援接应中 · ${Math.ceil(w.rescue.remaining)}秒后返回曙光港，操纵暂时锁定` : w.phase === 'completed' ? '本轮目标完成 · 仍可自由飞行、贸易与补给' : '点击画面：W 推力 · AD 转向 · S 制动 · Shift 加速 · E 泊船 · 按住 F 扫描');
    if (w.demoAuto && doc.activeElement !== $('space-target') && doc.activeElement !== $('space-stage-target') && target) selectedTarget = target.id;
    for (const id of ['space-target', 'space-stage-target']) { if (doc.activeElement !== $(id)) $(id).value = selectedTarget; $(id).disabled = !ready || Boolean(w.rescue); }
    text('space-target-detail', `${selected.name} · 坐标 ${selected.x}, ${selected.z} · 距离 ${Math.round(Math.hypot(w.ship.x - selected.x, w.ship.z - selected.z))} u。${selected.id === SURVEY.id ? '靠近后低速扫描，完成后回曙光结算。' : '自动导航会减速靠泊；手动驾驶时低速按 E 泊船。'}`);
    text('space-port-name', port ? port.name : '深空航行'); text('space-terminal-location', port ? port.name : '未靠泊'); text('space-dock-state', port ? '已靠泊' : '港站未连接'); text('space-port-detail', port ? `本港报价：药品 ${prices.medicine} CR，矿石 ${prices.ore} CR。每次交易 1 舱；运输委托药品会保留。` : '靠近港站并放慢航速，按 E 泊船。交易与补给需要实际靠泊。');
    text('space-hold-capacity', `${cargo} / ${w.capacity} 舱`); text('space-medicine', w.cargo.medicine); text('space-ore', w.cargo.ore); text('space-reserved', w.courier.accepted && !w.courier.delivered ? '2 舱药品属于运输委托，将在矿站交付，不能自由出售。' : '货舱总容量 6 舱。自由交易与运输委托共用货舱。');
    text('space-courier-state', w.courier.delivered ? '已在矿站交付' : w.courier.accepted ? '运往矿站 · 2 舱' : '曙光港待接单'); text('space-survey-state', w.survey.settled ? '已在曙光结算' : w.survey.complete ? '扫描完成 · 待结算' : `${Math.round(scanProgress)}%`); $('space-survey-meter').style.width = `${scanProgress}%`; text('space-profit', `${Math.round(w.profit)} CR`);
    priceViews.forEach(element => element.textContent = prices ? `${prices[element.dataset.spacePrice]} CR / 舱` : '靠泊后报价');
    actionButtons.forEach(button => {
      const action = button.dataset.spaceAct, value = button.dataset.spaceValue, reserved = w.courier.accepted && !w.courier.delivered ? 2 : 0;
      let enabled = available() && Boolean(port);
      if (action === 'rescue') { const stranded = w.fuel < 1 && !w.docked; button.hidden = !stranded && !w.rescue; enabled = available() && stranded; button.textContent = w.rescue ? `救援接应 · ${Math.ceil(w.rescue.remaining)}秒` : `请求救援 · ${Math.min(80, w.credits)} CR`; }
      else if (action === 'courier') { enabled &&= !w.courier.accepted && w.docked === 'dawn' || w.courier.accepted && !w.courier.delivered && w.docked === 'forge'; button.textContent = w.courier.delivered ? '运输委托已交付' : w.courier.accepted ? '在矿站交付委托' : '接收运输委托 · 2 舱'; }
      else if (action === 'buy') enabled &&= cargo < w.capacity && w.credits >= (prices?.[value] ?? Infinity);
      else if (action === 'sell') enabled &&= w.cargo[value] > (value === 'medicine' ? reserved : 0);
      else if (action === 'refuel') { enabled &&= w.fuel < 99.99; button.textContent = port && w.fuel < 99.99 ? `补满燃料 · ${Math.ceil((100 - w.fuel) * 1.2)} CR` : '燃料已充足'; }
      else if (action === 'survey') { enabled &&= w.docked === 'dawn' && w.survey.complete && !w.survey.settled; button.textContent = w.survey.settled ? '探索报酬已结算' : '返回曙光结算探索'; }
      button.disabled = !enabled;
    });
    text('space-hint', w.rescue ? `救援接应中，预计${Math.ceil(w.rescue.remaining)}秒后返回曙光港。货舱与任务保留，飞船操纵暂时锁定。` : w.phase === 'completed' ? '这一轮委托、贸易与探索已完成。你可以继续自由航行，或开启新的航程。' : now() < hintUntil ? manualHint : previous ? '上次航程已恢复并暂停。继续上次，或开始新的航程。' : objective(w)); text('space-log', w.log.slice(-5).map(item => `${Math.floor(item.time)}s · ${item.text}`).join('\n'));
    $('space-report').hidden = w.phase !== 'completed'; if (w.phase === 'completed') text('space-report-detail', `用时 ${Math.round(w.completedAt ?? w.completionTime ?? w.time)} 秒，运输委托已交付，信标扫描已结算，贸易净收益 ${Math.round(w.profit)} CR。飞船和货舱继续保留，可以继续自由飞行与交易。`);
    ['space-demo', 'space-manual', 'space-retry', 'space-resume'].forEach(id => $(id).disabled = !ready);
  }

  function frame(timestamp) {
    if (!ready || disposed) return;
    const dt = lastTime === null ? 0 : Math.min(.1, Math.max(0, (timestamp - lastTime) / 1000)); lastTime = timestamp;
    if (!w.paused) { if (w.demoAuto) demoStep(w, dt); else stepWorld(w, dt, input()); }
    renderer.render(w, { view, dt });
    if (timestamp - hudTime >= 150 || dt === 0) { updateHud(); hudTime = timestamp; }
    if (timestamp - saveTime >= 1800) { save(); saveTime = timestamp; }
    frameId = requestFrame(frame);
  }
  async function startRenderer() {
    if (loading || disposed) return false;
    loading = true; ready = false; clearInput(); w.paused = true; lastTime = null;
    const attempt = ++loadAttempt; $('space-load-status').hidden = false; $('space-load-status').dataset.state = 'loading'; $('space-load-retry').hidden = true; text('space-load-title', '正在准备 3D 航区'); text('space-load-message', '正在创建 WebGL 渲染器…'); updateHud();
    try {
      renderer?.dispose(); renderer = null;
      const result = await rendererFactory(canvas, { onProgress: message => { if (attempt === loadAttempt && !disposed) text('space-load-message', typeof message === 'string' ? message : message?.message || '正在装载三维模型与纹理…'); } });
      if (disposed || attempt !== loadAttempt) { result.dispose(); return false; }
      renderer = result; if (!renderer?.ready) throw new Error('3D 渲染器尚未就绪');
      ready = true; loading = false; $('space-load-status').hidden = true; lastTime = null;
      if (queryDemo && !openingApplied && !previous && w.time === 0) fresh('demo', false); else { updateHud(); save(); }
      openingApplied = true;
      renderer.resize(); frameId = requestFrame(frame); return true;
    } catch (error) {
      loading = false; ready = false; w.paused = true; clearInput(); renderer?.dispose(); renderer = null;
      if (disposed) return false;
      $('space-load-status').hidden = false; $('space-load-status').dataset.state = 'error'; $('space-load-retry').hidden = false; text('space-load-title', '3D 航区尚未能开启'); text('space-load-message', `WebGL 或三维资源未能就绪。请开启浏览器硬件加速后重试，或换用支持 WebGL 的浏览器。${error?.message ? `（${error.message}）` : ''}`); updateHud(); return false;
    }
  }

  for (const id of ['space-target', 'space-stage-target']) {
    $(id).replaceChildren(...destinations.map(port => { const option = doc.createElement('option'); option.value = port.id; option.textContent = `${port.name}${port.id === SURVEY.id ? ' · 探索' : ' · 港站'}`; return option; }));
    on($(id), 'change', () => { if (!destinations.some(port => port.id === $(id).value)) return; selectedTarget = $(id).value; if (available()) { manualMode(); changed(act(w, 'target', selectedTarget)); } else { updateHud(); save(); } });
  }
  actionButtons.forEach(button => on(button, 'click', () => perform(button.dataset.spaceAct, button.dataset.spaceValue)));
  touchButtons.forEach(button => {
    const action = button.dataset.spaceInput;
    on(button, 'pointerdown', event => { if (!available()) return; event.preventDefault(); manualMode(); touches.set(event.pointerId, { button, action }); button.setPointerCapture?.(event.pointerId); button.setAttribute('aria-pressed', 'true'); updateHud(); save(); });
    const release = event => { const held = touches.get(event.pointerId); if (!held || held.button !== button) return; touches.delete(event.pointerId); if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId); button.setAttribute('aria-pressed', String([...touches.values()].some(item => item.button === button))); };
    on(button, 'pointerup', release); on(button, 'pointercancel', release); on(button, 'lostpointercapture', release);
  });
  const editable = event => /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target?.tagName || '') || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(doc.activeElement?.tagName || '') || event.target?.closest?.('button,input,textarea,select,a,[contenteditable="true"]') || event.target?.isContentEditable;
  const holdKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight', 'KeyF'];
  on(win, 'keydown', event => {
    if (!ready || editable(event) || doc.activeElement !== canvas && event.target !== canvas) return;
    if (holdKeys.includes(event.code)) { if (!available()) return; event.preventDefault(); manualMode(); keys.add(event.code); return; }
    if (!['Space', 'KeyE', 'KeyC'].includes(event.code) || event.repeat) return;
    event.preventDefault(); if (event.code === 'Space') pause(); else if (event.code === 'KeyE') dock(); else changeView();
  });
  on(win, 'keyup', event => keys.delete(event.code)); on(canvas, 'pointerdown', event => { if (event.button === 0) canvas.focus({ preventScroll: true }); });
  on($('space-demo'), 'click', () => fresh('demo')); on($('space-manual'), 'click', () => fresh('manual')); on($('space-retry'), 'click', () => fresh('manual')); on($('space-pause'), 'click', pause); on($('space-takeover'), 'click', takeover); on($('space-view'), 'click', changeView); on($('space-nav'), 'click', navigate); on($('space-dock'), 'click', dock); on($('space-scan'), 'click', toggleScan);
  on($('space-fullscreen'), 'click', () => fullscreen()); on($('space-fullscreen-exit'), 'click', () => fullscreen(true)); on(doc, 'fullscreenchange', () => renderer?.resize()); on(win, 'resize', () => renderer?.resize());
  on($('space-resume'), 'click', () => { if (!ready || !previous) return; clearInput(); acknowledge(); w.paused = false; lastTime = null; $('space-panel').scrollTop = 0; revealStage(); canvas.focus({ preventScroll: true }); say('已继续上次航程，飞船位置、速度、导航、资金与货舱均已恢复。'); updateHud(); save(); });
  on(win, 'blur', backgroundPause); on(doc, 'visibilitychange', () => { if (doc.hidden) backgroundPause(); }); on(win, 'pagehide', backgroundPause);
  on(canvas, 'webglcontextlost', event => { event.preventDefault(); backgroundPause(); ready = false; cancelFrame?.(frameId); frameId = null; $('space-load-status').hidden = false; $('space-load-status').dataset.state = 'error'; $('space-load-retry').hidden = false; text('space-load-title', '3D 画面暂时中断'); text('space-load-message', 'WebGL 上下文丢失，航程已暂停。点击重试重新创建三维画面，现场会保留。'); updateHud(); });
  on($('space-load-retry'), 'click', () => { void startRenderer(); });

  const readyPromise = startRenderer();
  return { readyPromise, frame, retryRenderer: startRenderer, save, getWorld: () => w, getView: () => view, get ready() { return ready && !disposed; }, dispose() { if (disposed) return; clearInput(); save(); disposed = true; ready = false; loadAttempt++; cancelFrame?.(frameId); subscriptions.forEach(remove => remove()); renderer?.dispose(); renderer = null; } };
}

if (typeof document !== 'undefined' && document.getElementById('space-canvas')) window.spaceDirection = createSpaceController();
