import { createPark, openPark, advance, place, facilityAt, TOOLS, connected, entry, satisfaction, status, nextDay, encode, restore, SIZE } from './direction-park-engine.js';
import { drawPark, VIEW, cellFromPoint, pickFacility } from './direction-park-render.js';
const $ = id => document.getElementById(id), canvas = $('park-canvas'), ctx = canvas.getContext('2d'), STORAGE = 'world-play-direction-park-v1';
let w = createPark(), previous = null, tool = 'road', inspect = false, inspected = null, hover = null, dragging = false, pointerId = null, lastTile = '', grid = false, bubbles = true, guided = false, speed = 1, ready = false;
let lastTime = 0, hudTime = 0, saveTime = 0, hintUntil = 0, manualHint = '';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches, assets = {};
try { previous = restore(localStorage.getItem(STORAGE)); if (previous) { w = previous; $('p-resume').hidden = false; } } catch { $('p-save-status').textContent = '浏览器未开放保存，仍可体验本轮乐园'; }
function say(text, duration = 4000) { manualHint = text; hintUntil = Date.now() + duration; $('p-hint').textContent = text; }
function save() { if (!ready) return; try { localStorage.setItem(STORAGE, encode(w)); $('p-save-status').textContent = '乐园进度已独立保存'; } catch { $('p-save-status').textContent = '浏览器未开放保存，仍可体验本轮乐园'; } }
function selectTool(type) {
  tool = type; inspect = false; $('p-inspect').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('[data-park-tool]').forEach(b => { const selected = b.dataset.parkTool === type; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  $('p-tool-name').textContent = TOOLS[type].name; $('p-description').textContent = TOOLS[type].description;
}
function cancelDrag() { dragging = false; lastTile = ''; if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); pointerId = null; }
function reset(layout, run = false) {
  if (!ready) return; cancelDrag(); w = createPark(layout); guided = layout === 'guided'; hover = guided ? [6, 7] : null; inspected = null; selectTool('road'); previous = null; $('p-resume').hidden = true;
  grid = layout !== 'demo'; $('p-grid').setAttribute('aria-pressed', String(grid));
  if (run || guided) openPark(w);
  say(layout === 'guided' ? '两座游乐设施还没有通路。铺上高亮地块的步道，让游客能去那里。' : layout === 'empty' ? '先从入口修步道，再放置设施。设施前方的金色地块也需要铺路。' : '园区开始迎客。游客会寻找喜欢的设施，排队、游玩，也会休息。', 6000);
  updateHud(); save();
}
function build(x, y) {
  if (!ready || x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const result = place(w, tool, x, y);
  if (result.ok) {
    if (guided && w.roads.includes('6,7')) { guided = false; say('步道接通了！摩天轮和过山车已经可以接待游客。', 6000); }
    else say(`${TOOLS[tool].name}${tool === 'erase' ? '已拆除' : '已建造'}。${tool !== 'road' && tool !== 'erase' ? '记得连接设施前的金色入口。' : ''}`, 2200);
    updateHud(); save();
  } else if (!dragging) say(result.reason, 2500);
}
function pointer(e) { const r = canvas.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * VIEW.width, sy = (e.clientY - r.top) / r.height * VIEW.height; return { tile: cellFromPoint(sx, sy), facility: pickFacility(w, sx, sy) }; }
canvas.addEventListener('pointerdown', e => {
  if (!ready || e.button !== 0) return; e.preventDefault(); canvas.focus({ preventScroll: true }); const p = pointer(e); hover = p.tile; inspected = p.facility?.id || facilityAt(w, ...hover)?.id || null;
  if (inspect) { updateHud(); return; }
  if (tool === 'erase' && p.facility && !facilityAt(w, ...hover)) hover = [p.facility.x, p.facility.y];
  dragging = tool === 'road'; pointerId = e.pointerId; lastTile = hover.join(','); canvas.setPointerCapture(pointerId); build(...hover);
});
canvas.addEventListener('pointermove', e => {
  const p = pointer(e); hover = p.tile; inspected = p.facility?.id || facilityAt(w, ...hover)?.id || null;
  if (dragging && pointerId === e.pointerId && hover.join(',') !== lastTile) {
    let [x, y] = lastTile.split(',').map(Number); const tx = Math.max(0, Math.min(SIZE - 1, hover[0])), ty = Math.max(0, Math.min(SIZE - 1, hover[1]));
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) { while (x !== tx) { x += Math.sign(tx - x); build(x, y); } while (y !== ty) { y += Math.sign(ty - y); build(x, y); } } else build(tx, ty);
    lastTile = [tx, ty].join(',');
  }
});
canvas.addEventListener('pointerup', cancelDrag); canvas.addEventListener('pointercancel', cancelDrag); canvas.addEventListener('lostpointercapture', () => { dragging = false; pointerId = null; }); canvas.addEventListener('pointerleave', () => { if (!dragging) { hover = null; inspected = null; } });
canvas.addEventListener('keydown', e => {
  if (!ready) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) { e.preventDefault(); hover ||= [6, 7]; const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code]; hover = [Math.max(0, Math.min(SIZE - 1, hover[0] + d[0])), Math.max(0, Math.min(SIZE - 1, hover[1] + d[1]))]; inspected = facilityAt(w, ...hover)?.id || null; }
  else if (e.code === 'Enter') { e.preventDefault(); hover ||= [6, 7]; if (!inspect) build(...hover); else updateHud(); }
  else if (e.code === 'Space') { e.preventDefault(); $('p-pause').click(); }
  else if (/^Digit[1-8]$/.test(e.code)) { e.preventDefault(); selectTool(Object.keys(TOOLS)[Number(e.code.slice(-1)) - 1]); }
});
document.querySelectorAll('[data-park-tool]').forEach(b => b.addEventListener('click', () => selectTool(b.dataset.parkTool)));
$('p-demo').addEventListener('click', () => reset('demo', true)); $('p-guided').addEventListener('click', () => reset('guided')); $('p-blank').addEventListener('click', () => reset('empty'));
$('p-open').addEventListener('click', () => { if (openPark(w)) { say('开园迎客。这个开放日接待 100 秒，然后让游客完成体验、离开园区。', 5000); updateHud(); save(); } });
$('p-pause').addEventListener('click', () => { if (w.phase === 'ready') openPark(w); else if (w.phase !== 'report') w.paused = !w.paused; updateHud(); save(); });
$('p-speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; $('p-speed').textContent = `速度 ×${speed}`; });
$('p-grid').addEventListener('click', () => { grid = !grid; $('p-grid').setAttribute('aria-pressed', String(grid)); });
$('p-bubbles').addEventListener('click', () => { bubbles = !bubbles; $('p-bubbles').setAttribute('aria-pressed', String(bubbles)); });
$('p-inspect').addEventListener('click', () => { inspect = !inspect; $('p-inspect').setAttribute('aria-pressed', String(inspect)); if (inspect) { say('查看模式：指向或点击设施，右侧显示状态。选择任一建造工具可返回建造。'); $('p-tool-name').textContent = '查看设施'; $('p-description').textContent = '观察接通状态、排队、服务人数与收入。'; } else selectTool(tool); });
$('p-fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await canvas.parentElement.requestFullscreen(); } catch { say('浏览器未开放全屏，可以继续在当前地图操作。'); } });
$('p-resume').addEventListener('click', () => { if (previous) { w = restore(encode(previous)); previous = null; $('p-resume').hidden = true; if (w.phase !== 'report') openPark(w); say('已继续上次的乐园进度，铜谷防线的保存保持独立。'); updateHud(); save(); } });
$('p-next-day').addEventListener('click', () => { if (nextDay(w)) { hover = null; inspected = null; say('布局与预算已保留。可以继续调整，准备好后再开园。', 6000); updateHud(); save(); } });
function backgroundPause() { cancelDrag(); if (!w.paused) { w.paused = true; say('页面暂离，园区已暂停。点击“继续运行”恢复。'); updateHud(); save(); } }
window.addEventListener('blur', backgroundPause); document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); }); window.addEventListener('pagehide', () => { cancelDrag(); save(); });
function setText(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
function updateHud() {
  setText('p-credits', w.credits); setText('p-visitors', w.visitors.length); setText('p-rides', w.stats.served); setText('p-mood', w.stats.entered ? `${satisfaction(w)}%` : '—');
  setText('p-clock', w.phase === 'ready' ? '准备中' : w.phase === 'report' ? '已结束' : w.phase === 'closing' ? '散场中' : `${Math.floor(w.time)} / 100 秒`);
  setText('p-pause', w.phase === 'ready' ? '开园运行' : w.paused ? '继续运行' : '暂停'); $('p-pause').disabled = !ready || w.phase === 'report'; $('p-open').disabled = !ready || w.phase !== 'ready';
  setText('p-hint', Date.now() < hintUntil ? manualHint : previous ? '检测到上次乐园进度。可以继续上次，也可以选择一种新开局。' : status(w));
  const f = w.facilities.find(f => f.id === inspected);
  if (f) setText('p-tile-info', `${TOOLS[f.type].name} · ${connected(w, f) ? '已接通' : '未接通'} · ${f.riders.length} 人体验 / ${f.queue.length} 人排队 · 已接待 ${f.served} 人 / 收入 ${f.earned}`);
  else if (hover) setText('p-tile-info', `地块 ${hover[0] + 1} / ${hover[1] + 1} · ${inspect ? '查看模式' : TOOLS[tool].name}`);
  else setText('p-tile-info', '选择“查看设施”可观察排队、收入与接通状态。');
  $('p-end-card').hidden = w.phase !== 'report';
  if (w.phase === 'report') setText('p-end-detail', `接待 ${w.stats.entered} 位游客，完成 ${w.stats.served} 次体验，收入 ${w.stats.earned}，满意度 ${satisfaction(w)}%。${w.stats.stranded ? `有 ${w.stats.stranded} 位游客因通路问题未能正常散场，值得检查布局。` : '布局与预算可以保留，继续尝试不同的空间设计。'}`);
}
function frame(timestamp) {
  const dt = lastTime ? Math.min(.1, (timestamp - lastTime) / 1000) : 0; lastTime = timestamp;
  if (ready) { advance(w, dt * speed); drawPark(ctx, w, assets, { hover: inspect ? null : hover, tool, grid, bubbles, inspected, guide: guided, reducedMotion }); if (timestamp - hudTime > 180) { updateHud(); hudTime = timestamp; } if (timestamp - saveTime > 2500 && w.phase !== 'ready') { save(); saveTime = timestamp; } }
  requestAnimationFrame(frame);
}
const load = url => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('素材加载失败')); image.src = url; });
try { [assets.atlas, assets.terrain, assets.visitors] = await Promise.all([load('assets/directions/park/park-atlas.png'), load('assets/directions/park/garden-terrain.png'), load('assets/directions/park/visitors-atlas.png')]); ready = true; $('p-load-status').hidden = true; if (!previous && new URLSearchParams(location.search).get('demo') === '1') reset('demo', true); updateHud(); requestAnimationFrame(frame); }
catch { $('p-load-status').textContent = '园区素材未能加载，请刷新重试。下方仍可打开原作参考。'; ['p-demo', 'p-guided', 'p-blank', 'p-open', 'p-pause'].forEach(id => $(id).disabled = true); }
