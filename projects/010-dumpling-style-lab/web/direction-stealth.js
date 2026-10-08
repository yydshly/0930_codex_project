import { COLS, ROWS, createStealth, advance, visibility, goTo, setStance, interact, throwStone, status, encode, restore } from './direction-stealth-engine.js';
import { VIEW, cellFromPoint, drawStealth } from './direction-stealth-render.js';

const $ = id => document.getElementById(id), canvas = $('stealth-canvas'), ctx = canvas.getContext('2d'), STORAGE = 'world-play-direction-stealth-v1';
const plans = { shadow: { title: '借影绕行', description: '优先利用阴影和草地。蹲伏会降低暴露与脚步声；地毯比金属地面更安静。' }, blackout: { title: '切断灯光', description: '铜制开关控制附近灯具。靠近开关按 E 熄灯，观察光照指标降低后穿过通道。' }, lure: { title: '投石引开', description: '选择“瞄准投石”后点击落点，或用空格投向当前瞄准点。守卫会去声源调查；借这段时间穿过。' } };
const guardModes = { patrol: '巡逻', investigate: '调查声源', search: '搜索附近', return: '返回路线', chase: '追踪你' }, surfaces = { stone: '石板', wood: '木地板', rug: '地毯', grass: '草地', metal: '金属' };
const planButtons = [...document.querySelectorAll('[data-stealth-plan]')], stanceButtons = [...document.querySelectorAll('[data-stealth-stance]')], toolButtons = [...document.querySelectorAll('[data-stealth-tool]')], touchButtons = [...document.querySelectorAll('[data-stealth-input]')];
const keys = new Set(), touches = new Map(), guardViews = new Map(), assets = {}, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let w = createStealth('demo', 'shadow'), ready = false, previous = false, selectedPlan = 'shadow', tool = 'move', selectedGuard = w.guards[0]?.id ?? null, showVision = true, showRoutes = false, aim = null, mapPointer = null, rosterOrder = '', lastTime = 0, hudTime = 0, saveTime = 0, hintUntil = 0, manualHint = '';
w.paused = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
  const recovered = saved?.version === 1 && restore(saved.world);
  if (recovered) {
    w = recovered; w.paused = true; previous = true;
    selectedPlan = Object.hasOwn(plans, saved.selectedPlan) ? saved.selectedPlan : w.plan;
    if (!Object.hasOwn(plans, selectedPlan)) selectedPlan = 'shadow';
    tool = saved.tool === 'stone' ? 'stone' : 'move'; showVision = saved.showVision !== false; showRoutes = saved.showRoutes === true;
    selectedGuard = w.guards.some(g => g.id === saved.selectedGuard) ? saved.selectedGuard : w.guards[0]?.id ?? null;
    if (saved.aim && Number.isFinite(saved.aim.x) && Number.isFinite(saved.aim.y) && saved.aim.x >= 0 && saved.aim.y >= 0 && saved.aim.x < COLS && saved.aim.y < ROWS) aim = { x: saved.aim.x, y: saved.aim.y };
    $('m-resume').hidden = false;
  }
} catch { /* An invalid or unavailable save leaves the original paused opening. */ }

function text(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
function say(value, duration = 5000) { if (!value) return; manualHint = value; hintUntil = Date.now() + duration; text('m-hint', value); }
function save() {
  if (!ready) return;
  try { localStorage.setItem(STORAGE, JSON.stringify({ version: 1, world: encode(w), selectedPlan, selectedGuard, tool, showVision, showRoutes, aim })); text('m-save-status', '现场、灯光与守卫已独立保存'); }
  catch { text('m-save-status', '浏览器未开放保存，可继续本次潜入'); }
}
function releaseMapPointer() {
  const id = mapPointer; mapPointer = null;
  if (id !== null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
}
function clearInput() {
  keys.clear(); releaseMapPointer();
  const held = [...touches]; touches.clear();
  for (const [id, value] of held) { value.button.setAttribute('aria-pressed', 'false'); if (value.button.hasPointerCapture?.(id)) value.button.releasePointerCapture(id); }
}
function available() { return ready && w.phase === 'playing' && !w.paused; }
function acknowledgeProgress() { previous = false; $('m-resume').hidden = true; }
function manualMode(resume = false) {
  if (!ready || w.phase !== 'playing') return false;
  w.mode = 'manual'; w.auto = false;
  if (resume) w.paused = false;
  acknowledgeProgress();
  return true;
}
function revealStage() {
  if (document.fullscreenElement) return;
  const rect = $('m-stage').getBoundingClientRect(), lead = Math.max(12, (window.innerHeight - rect.height) / 2);
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - lead), behavior: reducedMotion ? 'auto' : 'instant' });
}
function takeover() {
  clearInput();
  if (!manualMode(true)) return;
  revealStage(); canvas.focus({ preventScroll: true }); say('已接管当前现场。灯光、守卫与档案进度都保留；WASD 移动，E 操作，空格投向瞄准点。', 6500); updateHud(); save();
}
function changed(result) {
  if (result?.ok) { acknowledgeProgress(); say(result.reason, 3600); updateHud(); save(); return true; }
  say(result?.reason || '目前无法进行这项操作。'); updateHud(); save(); return false;
}
function command(action) {
  if (!ready || w.phase !== 'playing') return;
  if (w.paused) { say('现场已暂停。先点击“继续行动”，再移动或操作物件。'); return; }
  manualMode(); changed(action());
}
function targetAim() {
  if (aim) return aim;
  return { x: Math.max(0, Math.min(COLS - 1, Math.round(w.player.x + Math.cos(w.player.angle || 0) * 3))), y: Math.max(0, Math.min(ROWS - 1, Math.round(w.player.y + Math.sin(w.player.angle || 0) * 3))) };
}
function toss() { const at = targetAim(); command(() => throwStone(w, at.x, at.y)); }
function selectPlan(value) {
  if (!Object.hasOwn(plans, value)) return;
  selectedPlan = value; updateHud(); save();
  say(`已选择“${plans[value].title}”。点击“观看所选方案”或“开始亲自潜入”使用这个开局；当前现场继续保留。`, 6000);
}
function selectTool(value) { if (!['move', 'stone'].includes(value)) return; releaseMapPointer(); tool = value; updateHud(); save(); }
function changeStance(value) {
  if (!ready || w.phase !== 'playing') return;
  if (w.paused) { say('先继续行动，再调整姿态。'); return; }
  manualMode(); changed(setStance(w, value));
}
function reset(mode, userInitiated = false) {
  if (!ready) return;
  clearInput(); w = createStealth(mode, selectedPlan); w.paused = false; previous = false; $('m-resume').hidden = true; aim = null; tool = 'move'; selectedGuard = w.guards[0]?.id ?? null; lastTime = 0;
  if (userInitiated) revealStage();
  if (mode === 'manual') canvas.focus({ preventScroll: true });
  say(mode === 'demo' ? `正在示范“${plans[selectedPlan].title}”：使用真实移动、光照与守卫感知，取得档案后从西门撤离。你随时可以接管。` : '潜入开始。先取得东侧书桌上的档案，再回到西门按 E 撤离。观察光照、脚步声与守卫怀疑度。', 8500);
  updateHud(); save();
}
function mapCell(e) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return cellFromPoint((e.clientX - r.left) / r.width * VIEW.width, (e.clientY - r.top) / r.height * VIEW.height);
}
function setAimFromPointer(e) { const p = mapCell(e); if (p && p[0] >= 0 && p[0] < COLS && p[1] >= 0 && p[1] < ROWS) { aim = { x: p[0], y: p[1] }; return p; } return null; }
function observeGuard(x, y) {
  const guard = w.guards.find(g => Math.hypot(g.x - x, g.y - y) < .75);
  if (!guard) return false;
  selectedGuard = guard.id; updateHud(); save(); say(`正在观察${guard.name || `守卫 ${guard.id}`}：${guardModes[guard.mode] || guard.mode}。选择守卫只查看情报，不改变他的行动。`, 3500); return true;
}
canvas.addEventListener('pointerdown', e => {
  if (!ready || e.button !== 0 || mapPointer !== null) return;
  e.preventDefault(); canvas.focus({ preventScroll: true });
  mapPointer = e.pointerId; canvas.setPointerCapture?.(mapPointer);
  const cell = setAimFromPointer(e); if (!cell) return;
  if (tool === 'move' && observeGuard(...cell)) return;
  command(() => tool === 'stone' ? throwStone(w, ...cell) : goTo(w, ...cell));
});
canvas.addEventListener('pointermove', e => { if (mapPointer === null || mapPointer === e.pointerId) setAimFromPointer(e); });
const releaseCanvas = e => { if (mapPointer === e.pointerId) releaseMapPointer(); };
canvas.addEventListener('pointerup', releaseCanvas); canvas.addEventListener('pointercancel', releaseCanvas); canvas.addEventListener('lostpointercapture', e => { if (mapPointer === e.pointerId) mapPointer = null; });

function input() {
  const held = action => [...touches.values()].some(v => v.action === action), key = code => keys.has(code);
  return { moveX: Number(key('KeyD') || key('ArrowRight') || held('right')) - Number(key('KeyA') || key('ArrowLeft') || held('left')), moveY: Number(key('KeyS') || key('ArrowDown') || held('down')) - Number(key('KeyW') || key('ArrowUp') || held('up')), run: key('ShiftLeft') || key('ShiftRight') || w.player.stance === 'run' };
}
touchButtons.forEach(button => {
  const action = button.dataset.stealthInput;
  button.addEventListener('pointerdown', e => {
    if (!available()) return;
    e.preventDefault(); manualMode(); touches.set(e.pointerId, { action, button }); button.setPointerCapture?.(e.pointerId); button.setAttribute('aria-pressed', 'true'); updateHud(); save();
  });
  const release = e => { const held = touches.get(e.pointerId); if (!held || held.button !== button) return; touches.delete(e.pointerId); if (button.hasPointerCapture?.(e.pointerId)) button.releasePointerCapture(e.pointerId); button.setAttribute('aria-pressed', String([...touches.values()].some(v => v.button === button))); };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});
const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight'];
function interactiveFocus(e) { const origin = e.target, active = document.activeElement; return /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(origin?.tagName || '') || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(active?.tagName || '') || origin?.closest?.('button,input,textarea,select,a,[contenteditable="true"]') || origin?.isContentEditable; }
window.addEventListener('keydown', e => {
  if (!ready || interactiveFocus(e)) return;
  if (movementKeys.includes(e.code)) { if (!available()) return; e.preventDefault(); manualMode(); keys.add(e.code); return; }
  if (!['KeyC', 'KeyE', 'Space', 'KeyP', 'Digit1', 'Digit2'].includes(e.code) || e.repeat) return;
  e.preventDefault();
  if (e.code === 'KeyP') $('m-pause').click();
  else if (e.code === 'KeyC') changeStance(w.player.stance === 'crouch' ? 'walk' : 'crouch');
  else if (e.code === 'KeyE') command(() => interact(w));
  else if (e.code === 'Space') toss();
  else selectTool(e.code === 'Digit1' ? 'move' : 'stone');
});
window.addEventListener('keyup', e => { keys.delete(e.code); });
planButtons.forEach(b => b.addEventListener('click', () => selectPlan(b.dataset.stealthPlan)));
toolButtons.forEach(b => b.addEventListener('click', () => selectTool(b.dataset.stealthTool)));
stanceButtons.forEach(b => b.addEventListener('click', () => changeStance(b.dataset.stealthStance)));
$('m-demo').addEventListener('click', () => reset('demo', true)); $('m-manual').addEventListener('click', () => reset('manual', true)); $('m-retry').addEventListener('click', () => reset('manual', true)); $('m-rewatch').addEventListener('click', () => reset('demo', true));
$('m-takeover').addEventListener('click', takeover); $('m-stage-takeover').addEventListener('click', takeover);
$('m-interact').addEventListener('click', () => command(() => interact(w))); $('m-toss').addEventListener('click', toss);
$('m-pause').addEventListener('click', () => { if (!ready || w.phase !== 'playing') return; clearInput(); acknowledgeProgress(); w.paused = !w.paused; lastTime = 0; updateHud(); save(); });
$('m-stage-pause').addEventListener('click', () => $('m-pause').click());
$('m-vision').addEventListener('click', () => { showVision = !showVision; updateHud(); save(); }); $('m-routes').addEventListener('click', () => { showRoutes = !showRoutes; updateHud(); save(); });
$('m-guard-select').addEventListener('change', () => { const guard = w.guards.find(g => String(g.id) === $('m-guard-select').value); if (guard) { selectedGuard = guard.id; updateHud(); save(); } });
async function fullscreen(exitOnly = false) {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (!exitOnly) await $('m-stage').requestFullscreen(); }
  catch { say('当前浏览器未开放全屏，可以继续在这里潜入。'); }
}
$('m-fullscreen').addEventListener('click', () => fullscreen()); $('m-stage-exit').addEventListener('click', () => fullscreen(true));
$('m-resume').addEventListener('click', () => { if (!ready || !previous || w.phase !== 'playing') return; clearInput(); acknowledgeProgress(); w.paused = false; lastTime = 0; canvas.focus({ preventScroll: true }); say('已继续上次的现场。灯光、守卫、档案与瞄准点都已恢复。'); updateHud(); save(); });
function backgroundPause() { clearInput(); if (ready && w.phase === 'playing') { w.paused = true; lastTime = 0; say('页面暂离，潜入已暂停。点击“继续行动”恢复现场。'); updateHud(); save(); } }
window.addEventListener('blur', backgroundPause); document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); }); window.addEventListener('pagehide', () => { backgroundPause(); save(); });

function updateHud() {
  const light = Math.max(0, Math.min(100, Math.round(visibility(w) * 100))), noise = Math.max(0, Math.min(100, Math.round((w.player.noise || 0) * 100))), alert = Math.max(0, Math.min(100, Math.round(Math.max(0, ...w.guards.map(g => g.awareness || 0))))), surface = w.tiles[Math.round(w.player.y) * COLS + Math.round(w.player.x)];
  text('m-light', `${light}%`); text('m-noise', `${noise}%`); text('m-alert', `${alert}%`); $('m-light-meter').style.width = `${light}%`; $('m-noise-meter').style.width = `${noise}%`; $('m-alert-meter').style.width = `${alert}%`;
  text('m-stage-light', `${light}%`); text('m-stage-noise', `${noise}%`); text('m-stage-alert', `${alert}%`);
  text('m-light-state', light < 25 ? '藏在阴影' : light < 60 ? '部分暴露' : '灯下显眼'); text('m-surface', surfaces[surface] || '地面'); text('m-alert-state', w.guards.some(g => g.mode === 'chase') ? '正在追踪' : alert >= 35 ? '提高警觉' : w.guards.some(g => g.mode !== 'patrol') ? '调查中' : '巡逻中');
  const objectiveLabel = w.phase === 'won' ? '档案已带出' : w.phase === 'lost' ? '被守卫发现' : w.objective ? '返回西门' : '取得档案';
  text('m-objective', objectiveLabel); text('m-objective-detail', w.phase === 'won' ? '已安全撤离 · 可以更换方案再试' : w.phase === 'lost' ? '现场已结束 · 重新潜入尝试另一条路' : w.objective ? '回到西门附近，按 E 撤离' : '东侧档案室 → 西门撤离'); $('m-goal-archive').classList.toggle('done', Boolean(w.objective)); $('m-goal-exit').classList.toggle('done', w.phase === 'won');
  text('m-stage-objective', objectiveLabel);
  const elapsed = Math.max(0, Math.floor(w.time)); text('m-time', `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`);
  const pauseLabel = w.paused ? w.time ? '继续行动' : '开始行动' : '暂停'; text('m-pause', pauseLabel); text('m-stage-pause', pauseLabel); $('m-pause').disabled = !ready || w.phase !== 'playing'; $('m-stage-pause').disabled = $('m-pause').disabled;
  const watch = w.mode === 'demo', modeState = w.phase === 'won' ? ' · 已完成' : w.phase === 'lost' ? ' · 被发现' : w.paused ? ' · 已暂停' : ''; text('m-mode', `${watch ? '方案示范' : '亲自潜入'}${modeState} · ${plans[w.plan]?.title || plans[selectedPlan].title}`); $('m-takeover').hidden = !watch || w.phase !== 'playing'; $('m-stage-takeover').hidden = $('m-takeover').hidden; $('m-takeover').disabled = !ready; $('m-stage-takeover').disabled = !ready;
  text('m-hint', Date.now() < hintUntil ? manualHint : previous ? '上次现场已经恢复并暂停。继续上次，或重新选择一种方案开局。' : status(w)); text('m-stones', w.stones);
  planButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stealthPlan === selectedPlan))); stanceButtons.forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.stealthStance === w.player.stance)); b.disabled = !available(); }); toolButtons.forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.stealthTool === tool)); b.disabled = !ready || w.phase !== 'playing'; }); touchButtons.forEach(b => { b.disabled = !available(); });
  $('m-interact').disabled = !available(); $('m-toss').disabled = !available() || w.stones <= 0; $('m-resume').disabled = w.phase !== 'playing'; $('m-vision').setAttribute('aria-pressed', String(showVision)); $('m-routes').setAttribute('aria-pressed', String(showRoutes));
  text('m-plan-title', `所选方案 · ${plans[selectedPlan].title}`); text('m-plan-description', plans[selectedPlan].description); const at = targetAim(); text('m-aim', `瞄准点：${Math.round(at.x) + 1}, ${Math.round(at.y) + 1} · ${tool === 'stone' ? '点击即投石' : '点击地面行走'}`); text('m-stage-hint', w.phase === 'won' ? '档案已安全带出 · 重新潜入或观看另一种方案' : w.phase === 'lost' ? '潜入被发现 · 重新开始，避开灯光或引开守卫' : w.paused ? '现场已暂停 · 继续行动后可操作' : `${tool === 'stone' ? '地图：点击落点投石' : '地图：点击地面行走'} · WASD · C · E · 空格 · P`);
  if (!w.guards.some(g => g.id === selectedGuard)) selectedGuard = w.guards[0]?.id ?? null;
  const nextOrder = w.guards.map(g => g.id).join(',');
  const cards = w.guards.map(g => {
    let view = guardViews.get(g.id);
    if (!view) { const button = document.createElement('button'), number = document.createElement('span'), copy = document.createElement('span'), title = document.createElement('b'), info = document.createElement('small'); button.className = 'guard-card'; number.className = 'guard-number'; number.textContent = String(w.guards.indexOf(g) + 1).padStart(2, '0'); copy.append(title, info); button.append(number, copy); button.addEventListener('click', () => { selectedGuard = g.id; updateHud(); save(); }); view = { button, title, info }; guardViews.set(g.id, view); }
    view.button.setAttribute('aria-pressed', String(g.id === selectedGuard)); view.title.textContent = g.name || `守卫 ${g.id}`; view.info.textContent = `${guardModes[g.mode] || g.mode} · ${Math.round(g.awareness || 0)}% · ${Math.round(g.x) + 1},${Math.round(g.y) + 1}`; return view.button;
  });
  if (rosterOrder !== nextOrder) { $('m-roster').replaceChildren(...cards); const options = w.guards.map(g => { const option = document.createElement('option'); option.value = String(g.id); option.textContent = g.name || `守卫 ${g.id}`; return option; }); $('m-guard-select').replaceChildren(...options); rosterOrder = nextOrder; }
  if (document.activeElement !== $('m-guard-select')) $('m-guard-select').value = String(selectedGuard);
  const guard = w.guards.find(g => g.id === selectedGuard); text('m-guard-name', guard?.name || (guard ? `守卫 ${guard.id}` : '暂无守卫')); text('m-guard-detail', guard ? `${guardModes[guard.mode] || guard.mode} · 现场位置 ${Math.round(guard.x) + 1}, ${Math.round(guard.y) + 1}。${guard.target ? `正在前往 ${Math.round(guard.target.x) + 1}, ${Math.round(guard.target.y) + 1}。` : '沿固定路线巡逻，注意光照与脚步声。'}` : '选择地图上的守卫查看实时状态。'); const awareness = Math.round(guard?.awareness || 0); text('m-guard-awareness', `${awareness}%`); $('m-guard-meter').style.width = `${awareness}%`;
  text('m-log', w.log.slice(-5).map(e => `${Math.floor(e.time)}s · ${e.text}`).join('\n'));
  $('m-end-card').hidden = w.phase === 'playing';
  if (w.phase !== 'playing') { clearInput(); text('m-end-tag', w.phase === 'won' ? 'ARCHIVE RECOVERED' : 'THE NIGHT WAS BROKEN'); text('m-end-title', w.phase === 'won' ? '档案，已带出宅邸。' : '守卫发现了你。'); text('m-end-detail', `${w.phase === 'won' ? '已经取得档案并从西门撤离。' : w.objective ? '档案已取得，撤离途中被发现。' : '本次未能带出档案。'}用时 ${Math.round(w.time)} 秒，操作灯光 ${w.stats.lightsToggled || 0} 次，投出 ${w.stats.stonesThrown || 0} 颗石子，触发调查 ${w.stats.investigations || 0} 次。${w.phase === 'won' ? '可以换一种方案，重新读懂这座宅邸。' : '试试蹲伏、避开灯光，或把守卫引向另一条路。'}`); }
}
function frame(timestamp) {
  const dt = lastTime ? Math.min(.1, Math.max(0, (timestamp - lastTime) / 1000)) : 0; lastTime = timestamp;
  if (ready) { advance(w, dt, input()); drawStealth(ctx, w, assets, { aim: targetAim(), showVision, showRoutes, selectedGuard, reducedMotion, embedded: true }); if (timestamp - hudTime > 180) { updateHud(); hudTime = timestamp; } if (timestamp - saveTime > 1600) { save(); saveTime = timestamp; } }
  requestAnimationFrame(frame);
}
const load = file => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('月影档案美术加载失败')); image.src = 'assets/directions/stealth/' + file; });
try {
  [assets.materials, assets.props, assets.actors, assets.scene, assets.states] = await Promise.all(['materials-atlas.png', 'estate-props.png', 'covert-actors.png', 'moonlit-estate.png', 'state-variants.png'].map(load));
  ready = true; $('m-load-status').hidden = true;
  if (!previous && new URLSearchParams(location.search).get('demo') === '1') reset('demo');
  updateHud(); save(); requestAnimationFrame(frame);
} catch {
  text('m-load-status', '宅邸美术未能装载，请刷新重试。下方仍可查看方向说明与参考。');
  ['m-demo', 'm-manual', 'm-pause', 'm-stage-pause', 'm-takeover', 'm-stage-takeover', 'm-interact', 'm-toss', 'm-retry', 'm-rewatch', 'm-resume'].forEach(id => $(id).disabled = true);
  [...stanceButtons, ...toolButtons, ...touchButtons].forEach(button => button.disabled = true);
}
