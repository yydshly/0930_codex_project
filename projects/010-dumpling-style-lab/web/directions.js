import { createWorld, start, step, place, at, encode, restore, diagnose, TOOLS, COLS, ROWS } from './direction-factory-engine.js';
import { drawFactory, VIEW, cellFromPoint } from './direction-factory-render.js';
const $ = id => document.getElementById(id);
const canvas = $('factory-canvas'), ctx = canvas.getContext('2d'), STORAGE = 'world-play-direction-copper-v1';
let w = createWorld(), tool = 'belt', dir = 0, speed = 1, grid = false, flow = true, hover = null, dragging = false, pointerId = null, lastTile = '', guided = false, ready = false;
let previous = null, lastTime = 0, hudTime = 0, saveTime = 0, manualHint = '', hintUntil = 0, sounds = false, audio = null, oldShots = 0, oldKills = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const assets = {};
function say(message, duration = 3500) { manualHint = message; hintUntil = Date.now() + duration; $('hint').textContent = message; }
function save() {
  if (!ready) return;
  try { localStorage.setItem(STORAGE, encode(w)); $('save-status').textContent = '进度已保存在此浏览器'; }
  catch { $('save-status').textContent = '浏览器未允许保存，本轮仍可游玩'; }
}
try { previous = restore(localStorage.getItem(STORAGE)); } catch { $('save-status').textContent = '浏览器未允许保存，本轮仍可游玩'; }
if (previous) { w = previous; $('resume').hidden = false; }
function selectTool(next) {
  tool = next;
  document.querySelectorAll('[data-tool]').forEach(b => { const selected = b.dataset.tool === tool; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  $('tool-name').textContent = TOOLS[tool].name; $('tool-description').textContent = TOOLS[tool].description;
}
function turn() { dir = (dir + 1) % 4; $('direction').textContent = ['→ 向右', '↓ 向下', '← 向左', '↑ 向上'][dir]; }
function cancelDrag() { dragging = false; lastTile = ''; if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); pointerId = null; }
function reset(layout, run = false) {
  if (!ready) return;
  cancelDrag(); w = createWorld(layout); guided = layout === 'guided'; hover = guided ? [10, 5] : null; selectTool('belt'); dir = 0; $('direction').textContent = '→ 向右';
  oldShots = oldKills = 0; $('resume').hidden = true; previous = null;
  if (run) { start(w); say('示范产线已启动。八秒后开始来袭，也可以暂停并修改设施。', 5000); }
  else if (guided) { start(w, false); grid = true; $('grid').setAttribute('aria-pressed', 'true'); say('先点击发光地块，铺一格向右传送带，把工坊接到分流器。', 7000); }
  else { grid = true; $('grid').setAttribute('aria-pressed', 'true'); say('从铜矿床上的采矿机开始，连接工坊和炮塔；启动产线后再开始防守。', 6000); }
  updateHud(); save();
}
function audioReady() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) { sounds = false; $('sound').textContent = '声音不可用'; $('sound').disabled = true; return; }
  try { audio ||= new Audio(); if (audio.state === 'suspended') audio.resume().catch(() => {}); } catch { sounds = false; }
}
function tone(frequency, duration = .07, volume = .025) {
  if (!sounds || !audio || audio.state !== 'running') return;
  const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(frequency, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(frequency * .45, audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function build(x, y) {
  if (!ready || x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
  const result = place(w, tool, x, y, dir);
  if (result.ok) {
    tone(tool === 'erase' ? 180 : 440, .09);
    if (guided && at(w, 10, 5)?.type === 'belt') { guided = false; say('产线接通了。等待金色弹药进入两座炮塔，再点击“开始防守”。', 6000); }
    else say(`${TOOLS[tool].name}${tool === 'erase' ? '已拆除' : '已建造'}。${tool === 'belt' ? '按 R 改变下一格的方向。' : ''}`, 1400);
    save(); updateHud();
  } else if (!dragging || tool !== 'belt') say(result.reason, 2200);
}
function pointerCell(e) { const r = canvas.getBoundingClientRect(); return cellFromPoint((e.clientX - r.left) / r.width * VIEW.width, (e.clientY - r.top) / r.height * VIEW.height); }
canvas.addEventListener('pointerdown', e => {
  if (!ready || e.button !== 0) return;
  e.preventDefault(); canvas.focus({ preventScroll: true }); hover = pointerCell(e); dragging = tool === 'belt' || tool === 'erase'; pointerId = e.pointerId;
  canvas.setPointerCapture(pointerId); lastTile = hover.join(','); build(...hover);
});
canvas.addEventListener('pointermove', e => {
  hover = pointerCell(e);
  if (dragging && pointerId === e.pointerId && hover.join(',') !== lastTile) {
    let [x, y] = lastTile.split(',').map(Number);
    const tx = Math.max(0, Math.min(COLS - 1, hover[0])), ty = Math.max(0, Math.min(ROWS - 1, hover[1]));
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
      while (x !== tx) { x += Math.sign(tx - x); build(x, y); }
      while (y !== ty) { y += Math.sign(ty - y); build(x, y); }
    } else build(tx, ty);
    lastTile = [tx, ty].join(',');
  }
});
canvas.addEventListener('pointerup', cancelDrag); canvas.addEventListener('pointercancel', cancelDrag); canvas.addEventListener('lostpointercapture', () => { dragging = false; pointerId = null; });
canvas.addEventListener('pointerleave', () => { if (!dragging) hover = null; });
canvas.addEventListener('keydown', e => {
  if (!ready) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
    e.preventDefault(); hover ||= [10, 5]; const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code]; hover = [Math.max(0, Math.min(COLS - 1, hover[0] + d[0])), Math.max(0, Math.min(ROWS - 1, hover[1] + d[1]))];
  } else if (e.code === 'Enter') { e.preventDefault(); hover ||= [10, 5]; build(...hover); }
  else if (e.code === 'KeyR') { e.preventDefault(); turn(); }
  else if (e.code === 'Space') { e.preventDefault(); $('pause').click(); }
  else if (/^Digit[1-6]$/.test(e.code)) { e.preventDefault(); selectTool(Object.keys(TOOLS)[Number(e.code.slice(-1)) - 1]); }
});
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => selectTool(b.dataset.tool)));
$('rotate').addEventListener('click', turn);
$('demo').addEventListener('click', () => reset('demo', true)); $('guided').addEventListener('click', () => reset('guided')); $('blank').addEventListener('click', () => reset('empty')); $('retry').addEventListener('click', () => reset('guided'));
$('pause').addEventListener('click', () => { if (w.phase === 'ready') start(w, false); else if (!['won', 'lost'].includes(w.phase)) w.paused = !w.paused; updateHud(); save(); });
$('defend').addEventListener('click', () => { if (start(w)) { say('防守已开始，敌人将从南北两条通道来袭。', 4500); updateHud(); save(); } });
$('speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; $('speed').textContent = `速度 ×${speed}`; });
$('grid').addEventListener('click', () => { grid = !grid; $('grid').setAttribute('aria-pressed', String(grid)); });
$('flow').addEventListener('click', () => { flow = !flow; $('flow').setAttribute('aria-pressed', String(flow)); });
$('sound').addEventListener('click', () => { sounds = !sounds; if (sounds) audioReady(); $('sound').setAttribute('aria-pressed', String(sounds)); $('sound').textContent = sounds ? '声音开启' : '声音关闭'; if (sounds) tone(440, .12); });
$('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await canvas.parentElement.requestFullscreen(); } catch { say('浏览器没有开放全屏，可以继续在当前地图操作。'); } });
$('resume').addEventListener('click', () => { if (previous) { w = restore(encode(previous)); if (!['won', 'lost'].includes(w.phase)) { if (w.phase === 'ready') start(w, false); else w.paused = false; } previous = null; $('resume').hidden = true; say('已继续上次的矿区进度。'); updateHud(); } });
function backgroundPause() { cancelDrag(); if (!w.paused) { w.paused = true; say('页面暂离，产线与战斗已暂停。点击“继续运行”恢复。'); updateHud(); save(); } }
window.addEventListener('blur', backgroundPause); document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); }); window.addEventListener('pagehide', () => { cancelDrag(); save(); });
function setText(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
function updateHud() {
  setText('health', `${w.health}%`); setText('credits', w.credits); setText('ammo', w.stats.fabricated); setText('kills', w.stats.kills);
  setText('wave', w.phase === 'defense' ? w.wave ? `${w.wave} / 3` : `${Math.ceil(w.nextWave)} 秒` : w.phase === 'won' ? '已守住' : w.phase === 'lost' ? '失守' : '备料中');
  setText('pause', w.phase === 'ready' ? '启动产线' : w.paused ? '继续运行' : '暂停'); $('pause').disabled = !ready || ['won', 'lost'].includes(w.phase);
  $('defend').disabled = !ready || ['defense', 'won', 'lost'].includes(w.phase);
  setText('hint', Date.now() < hintUntil ? manualHint : previous ? '检测到上次进度。点击“继续上次”恢复；也可以选择一种新开局。' : w.phase === 'ready' ? '选择“直接看运行”，观察完整产线；或自己接通缺失的传送带。' : diagnose(w));
  if (hover) {
    const c = at(w, ...hover); setText('tile-info', c ? c.type === 'core' ? `指挥核心 · 完好度 ${w.health}%` : c.type === 'factory' ? `工坊 · 铜矿 ${c.ore} / 弹药 ${c.ammo}` : c.type === 'turret' ? `炮塔 · 弹药 ${c.ammo} / 射程 4.5 格` : `${TOOLS[c.type].name} · 待运物料 ${c.queue.length}` : `地块 ${hover[0] + 1} / ${hover[1] + 1} · ${TOOLS[tool].name}`);
  } else setText('tile-info', '将光标移到设施上查看状态');
  const ended = ['won', 'lost'].includes(w.phase); $('end-card').hidden = !ended;
  if (ended) { setText('end-kicker', w.phase === 'won' ? 'SECTOR SECURED' : 'TRY ANOTHER DESIGN'); setText('end-title', w.phase === 'won' ? '矿区守住了。' : '核心失守了。'); setText('end-detail', `击退 ${w.stats.kills} 辆敌车，生产 ${w.stats.fabricated} 份弹药，核心剩余 ${w.health}%。${w.phase === 'won' ? '现在可以尝试自己连接产线。' : '检查弹药供应与炮塔覆盖，再试一次。'}`); }
}
function frame(timestamp) {
  const dt = lastTime ? Math.min(.1, (timestamp - lastTime) / 1000) : 0; lastTime = timestamp;
  if (ready) {
    step(w, dt * speed); drawFactory(ctx, w, assets, { hover, tool, dir, grid, flow, guide: guided, reducedMotion });
    if (sounds) { if (w.stats.shots > oldShots) tone(160, .07, .02); if (w.stats.kills > oldKills) tone(80, .14, .03); } oldShots = w.stats.shots; oldKills = w.stats.kills;
    if (timestamp - hudTime > 150) { updateHud(); hudTime = timestamp; }
    if (timestamp - saveTime > 2500 && w.phase !== 'ready') { save(); saveTime = timestamp; }
  }
  requestAnimationFrame(frame);
}
const load = url => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('素材加载失败')); image.src = url; });
try {
  [assets.atlas, assets.terrain] = await Promise.all([load('assets/directions/factory/industrial-atlas.png'), load('assets/directions/factory/copper-basin.png')]); ready = true; $('load-status').hidden = true;
  if (!previous && new URLSearchParams(location.search).get('demo') === '1') reset('demo', true);
  updateHud(); requestAnimationFrame(frame);
} catch { $('load-status').textContent = '矿区素材未能加载，请刷新页面重试。下方仍可访问原作。'; ['demo', 'guided', 'blank', 'pause', 'defend'].forEach(id => $(id).disabled = true); }
