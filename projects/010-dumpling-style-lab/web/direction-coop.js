import { template, blankMap, edit, createWorld, advance, demonstrationInputs, encode, restore, validateMap, designIssues, regroup, TOOLS, ROOM_NAMES, COLS, ROWS, TILE } from './direction-coop-engine.js';
import { drawCoop, VIEW, cellFromPoint } from './direction-coop-render.js';
const $ = id => document.getElementById(id), canvas = $('coop-canvas'), ctx = canvas.getContext('2d'), STORAGE = 'world-play-direction-cooperation-v1';
const assets = {}, keys = new Set(), touches = new Map(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let w = createWorld(), room = 0, mode = 'solo', active = 0, editing = false, draft = null, history = [], tool = 'stone', hover = null, pointerId = null, lastTile = null, stroke = null, dirtyStroke = false;
let demo = false, eligible = true, ready = false, previous = false, records = [], lastTime = 0, hudTime = 0, saveTime = 0, lastWon = null, hint = '', hintUntil = 0;
const copy = value => structuredClone(value), signature = map => JSON.stringify([map.cells, map.starts]);
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE) || 'null'), recovered = restore(JSON.stringify(raw?.world));
  if (raw?.version === 1 && recovered && Number.isInteger(raw.room) && raw.room >= 0 && raw.room <= 2 && ['solo', 'duo'].includes(raw.mode)) {
    w = recovered; room = raw.room; mode = raw.mode; eligible = raw.eligible === true; draft = validateMap(raw.draft); previous = true; $('c-resume').hidden = false;
    records = Array.isArray(raw.records) ? raw.records.filter(r => r && typeof r.signature === 'string' && r.signature.length < 5000 && typeof r.seconds === 'number' && Number.isFinite(r.seconds) && r.seconds >= 0 && r.seconds < 1e8).slice(-20) : [];
  }
} catch { $('c-save').textContent = '当前浏览器未开放保存，仍可试玩'; }
function say(text, duration = 4500) { hint = text; hintUntil = Date.now() + duration; $('c-hint').textContent = text; }
function save() { if (!ready) return; try { localStorage.setItem(STORAGE, JSON.stringify({ version: 1, room, mode, eligible, world: JSON.parse(encode(w)), draft, records })); $('c-save').textContent = '旅程与设计已独立保存'; } catch { $('c-save').textContent = '当前浏览器未开放保存，仍可试玩'; } }
function clearInput() { keys.clear(); for (const [id, value] of touches) { value.button.setAttribute('aria-pressed', 'false'); if (value.button.hasPointerCapture(id)) value.button.releasePointerCapture(id); } touches.clear(); if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); pointerId = null; lastTile = null; }
function fresh(index, selectedMode = mode, showDemo = false) {
  if (!ready) return; finishStroke(); clearInput(); room = Math.max(0, Math.min(2, index)); mode = selectedMode; editing = false; demo = showDemo; eligible = !demo; active = 0; previous = false; $('c-resume').hidden = true; w = createWorld(template(room), { frozenStart: room === 1 }); w.paused = false; lastWon = null;
  say(demo ? '示范通过真实按键输入开路与救援，示范成绩不计入自己的记录。可以暂停观察。' : mode === 'solo' ? '单人模式：Tab 切换角色，另一人会等待。先让一人踩住踏板，再操作另一人过门。' : '双人同屏：青色使用 A/D、W、F；赭色使用方向键、↑、Enter。'); updateHud(); save(); canvas.focus({ preventScroll: true });
}
function selectTool(type) { tool = type; document.querySelectorAll('[data-coop-tool]').forEach(b => { const on = b.dataset.coopTool === type; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }); }
function startEditing() { if (!ready) return; clearInput(); demo = false; w.paused = true; draft ||= copy(w.map); editing = true; hover ||= [6, 9]; say('在格子中设计地形和机关，再点击“立即试玩”。当前旅程保留，返回时可以继续。'); updateHud(); save(); }
function beginStroke() { if (!stroke) { stroke = copy(draft); dirtyStroke = false; } }
function paint(x, y) { if (!editing || !draft) return; const result = edit(draft, tool, x, y); if (result.ok) { dirtyStroke = true; updateHud(); } else if (pointerId === null) say(result.reason, 2200); }
function finishStroke() { if (stroke && dirtyStroke) { history.push(stroke); if (history.length > 30) history.shift(); save(); } stroke = null; dirtyStroke = false; }
function mapPointer(e) { const r = canvas.getBoundingClientRect(); return cellFromPoint((e.clientX - r.left) / r.width * VIEW.width, (e.clientY - r.top) / r.height * VIEW.height); }
canvas.addEventListener('pointerdown', e => {
  if (!ready || e.button !== 0) return; e.preventDefault(); canvas.focus({ preventScroll: true }); hover = mapPointer(e);
  if (!editing) { if (mode === 'solo' && !demo) { const x = (hover[0] + .5) * TILE; active = Math.abs(w.players[0].x - x) < Math.abs(w.players[1].x - x) ? 0 : 1; updateHud(); } return; }
  beginStroke(); pointerId = e.pointerId; lastTile = hover; canvas.setPointerCapture(pointerId); paint(...hover);
});
canvas.addEventListener('pointermove', e => {
  hover = mapPointer(e); if (pointerId !== e.pointerId || !editing || !lastTile) return;
  const tx = Math.max(0, Math.min(COLS - 1, hover[0])), ty = Math.max(0, Math.min(ROWS - 1, hover[1])); let [x, y] = lastTile;
  if (x >= 0 && x < COLS && y >= 0 && y < ROWS) { while (x !== tx) { x += Math.sign(tx - x); paint(x, y); } while (y !== ty) { y += Math.sign(ty - y); paint(x, y); } } else paint(tx, ty);
  lastTile = [tx, ty];
});
function endPointer() { finishStroke(); if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); pointerId = null; lastTile = null; }
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer); canvas.addEventListener('lostpointercapture', () => { finishStroke(); pointerId = null; lastTile = null; });
canvas.addEventListener('keydown', e => {
  if (!ready || e.code === 'Tab' && e.shiftKey) return;
  const known = ['KeyA', 'KeyD', 'KeyW', 'KeyF', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Space', 'Tab', 'KeyP']; if (known.includes(e.code) || /^Digit[1-9]$/.test(e.code)) e.preventDefault();
  if (e.repeat && ['Tab', 'KeyP', 'Enter'].includes(e.code)) return;
  if (editing) {
    if (/^Digit[1-9]$/.test(e.code)) selectTool(Object.keys(TOOLS)[Number(e.code.at(-1)) - 1]);
    else if (e.code.startsWith('Arrow')) { hover ||= [6, 9]; const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code]; hover = [Math.max(0, Math.min(COLS - 1, hover[0] + d[0])), Math.max(0, Math.min(ROWS - 1, hover[1] + d[1]))]; }
    else if (e.code === 'Enter') { beginStroke(); paint(...(hover || [6, 9])); finishStroke(); }
    return;
  }
  if (e.code === 'Tab') { if (mode === 'solo' && !demo) { active = 1 - active; keys.clear(); updateHud(); } }
  else if (e.code === 'KeyP') $('c-pause').click();
  else if (!demo) keys.add(e.code);
});
canvas.addEventListener('keyup', e => keys.delete(e.code));
canvas.addEventListener('blur', clearInput); window.addEventListener('keyup', e => keys.delete(e.code));
document.querySelectorAll('[data-coop-tool]').forEach(b => b.addEventListener('click', () => selectTool(b.dataset.coopTool)));
document.querySelectorAll('[data-player]').forEach(button => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('pointerdown', e => { if (!ready || editing || demo || w.paused) return; e.preventDefault(); touches.set(e.pointerId, { player: Number(button.dataset.player), control: button.dataset.control, button }); button.setAttribute('aria-pressed', 'true'); button.setPointerCapture(e.pointerId); });
  const release = e => { touches.delete(e.pointerId); button.setAttribute('aria-pressed', 'false'); if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId); };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', e => { touches.delete(e.pointerId); button.setAttribute('aria-pressed', 'false'); });
});
function inputs() {
  if (demo) return w.time < 1.4 ? [{}, {}] : demonstrationInputs(w);
  const result = [{ move: 0, jump: false, action: false }, { move: 0, jump: false, action: false }];
  const read = (i, left, right, jump, action) => { result[i].move += Number(keys.has(right)) - Number(keys.has(left)); result[i].jump ||= keys.has(jump); result[i].action ||= keys.has(action); };
  if (mode === 'solo') { read(active, 'KeyA', 'KeyD', 'KeyW', 'KeyF'); read(active, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Enter'); result[active].jump ||= keys.has('Space'); } else { read(0, 'KeyA', 'KeyD', 'KeyW', 'KeyF'); read(1, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Enter'); result[0].jump ||= keys.has('Space'); }
  for (const { player, control } of touches.values()) { if (control === 'left') result[player].move--; if (control === 'right') result[player].move++; if (control === 'jump') result[player].jump = true; if (control === 'action') result[player].action = true; }
  return result;
}
$('c-demo').addEventListener('click', () => fresh(1, 'solo', true)); $('c-solo').addEventListener('click', () => fresh(room, 'solo')); $('c-duo').addEventListener('click', () => fresh(room, 'duo'));
$('c-room-select').addEventListener('change', () => { if (editing) { finishStroke(); draft = template(Number($('c-room-select').value)); history = []; updateHud(); save(); } else fresh(Number($('c-room-select').value)); });
$('c-pause').addEventListener('click', () => { if (!ready || editing || w.phase === 'won') return; clearInput(); w.paused = !w.paused; updateHud(); save(); });
$('c-switch').addEventListener('click', () => { if (mode === 'solo' && !demo && !editing) { active = 1 - active; clearInput(); updateHud(); } });
$('c-regroup').addEventListener('click', () => { if (!editing) { clearInput(); regroup(w); demo = false; eligible = false; w.paused = false; lastWon = null; say('两人回到各自营灯。本次使用了重新集结，不计最快完成记录。'); updateHud(); save(); } });
$('c-edit').addEventListener('click', startEditing);
$('c-test').addEventListener('click', () => { finishStroke(); const issues = designIssues(draft); if (issues.length) { say(issues.join('；')); return; } clearInput(); w = createWorld(draft); w.paused = false; editing = false; demo = false; eligible = true; lastWon = null; previous = false; $('c-resume').hidden = true; say('当前设计已经用于真实碰撞与机关规则。两人一起到达出口，验证这份布局。'); updateHud(); save(); canvas.focus({ preventScroll: true }); });
$('c-undo').addEventListener('click', () => { finishStroke(); if (history.length) { draft = history.pop(); updateHud(); save(); } });
$('c-blank').addEventListener('click', () => { finishStroke(); history.push(copy(draft)); draft = blankMap(); updateHud(); save(); });
$('c-return').addEventListener('click', () => { finishStroke(); clearInput(); editing = false; say('已返回保留的旅程。点击继续运行，接着走。'); updateHud(); save(); });
$('c-resume').addEventListener('click', () => { if (previous) { previous = false; $('c-resume').hidden = true; demo = false; if (w.phase !== 'won') w.paused = false; updateHud(); save(); } });
$('c-next').addEventListener('click', () => fresh((room + 1) % 3, mode)); $('c-again').addEventListener('click', () => { const map = copy(w.map); clearInput(); w = createWorld(map); w.paused = false; demo = false; eligible = true; lastWon = null; updateHud(); save(); });
$('c-fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await canvas.parentElement.requestFullscreen(); canvas.focus({ preventScroll: true }); } catch { say('当前浏览器未开放全屏，仍可以在地图中操作。'); } });
$('c-export').addEventListener('click', () => { finishStroke(); const map = editing ? draft : w.map, blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'mist-ridge-level.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); say('已导出当前关卡设计。对方导入后，可以用同样的碰撞与机关规则试玩。'); });
$('c-import').addEventListener('change', async () => { const file = $('c-import').files?.[0]; if (!file) return; try { if (file.size > 30000) throw new Error(); const map = validateMap(JSON.parse(await file.text())); if (!map) throw new Error(); startEditing(); history.push(copy(draft)); draft = map; say('关卡已导入设计区。先查看布局，再点击“立即试玩”。'); updateHud(); save(); } catch { say('这份文件不是有效的雾岭关卡，请导入本页导出的关卡文件。'); } finally { $('c-import').value = ''; } });
function backgroundPause() { finishStroke(); clearInput(); if (!w.paused) { w.paused = true; say('页面暂离，旅程已暂停。回来后点击继续运行。'); } updateHud(); save(); }
window.addEventListener('blur', backgroundPause); window.addEventListener('pagehide', backgroundPause); document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); });
function text(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
function updateHud() {
  text('c-room', editing ? '设计中' : w.map.title === ROOM_NAMES[room] ? `${room + 1} / 3` : '自制关卡'); text('c-time', `${w.time.toFixed(1)} 秒`); text('c-rescues', w.stats.rescues); text('c-falls', w.stats.falls); text('c-gate', w.gateTimer > 0 ? '已打开' : '关闭');
  text('c-pause', w.paused ? '继续运行' : '暂停'); $('c-pause').disabled = !ready || editing || w.phase === 'won'; $('c-switch').disabled = mode !== 'solo' || demo || editing; $('c-regroup').disabled = editing;
  text('c-active', editing ? `设计工具 · ${TOOLS[tool]}` : demo ? '正在演示真实配合' : mode === 'duo' ? '双人同屏 · 两套独立操作' : active ? '正在操控赭色同伴' : '正在操控青色同伴');
  text('c-panel-title', editing ? '设计你们的挑战' : '一起走过雾岭'); text('c-mode-description', editing ? '点击或拖动绘制，整笔撤销。方向键＋Enter 也可设计。' : mode === 'duo' ? '青色 A/D、W、F。赭色方向键、↑、Enter。' : 'Tab 切换角色，另一人留在原地；触控可分别操作两位同伴。');
  text('c-status', editing ? '修改只更新设计区，点击立即试玩才会应用。' : w.players.some(p => p.frozen) ? '靠近冻结的同伴后，按 F 或 Enter 救援。' : w.players.some(p => p.arrived) ? '一人已到出口，等待另一人一起抵达。' : '踩踏板开门、跳过寒冰，营灯记录最近的落脚点。');
  const best = records.find(r => r.signature === signature(editing ? draft : w.map)); text('c-best', best ? `此布局自己的最快完成：${best.seconds.toFixed(1)} 秒` : '此布局还没有自己的完成记录');
  $('c-editor').hidden = !editing; $('c-undo').disabled = !history.length; $('c-edit').disabled = !ready || editing; $('c-end').hidden = editing || w.phase !== 'won';
  if (!editing) $('c-room-select').value = String(room);
  if (editing) { const issues = designIssues(draft); text('c-design-status', issues.length ? issues.join('；') : '基础配置齐全；能否通关仍需两人实际试玩。'); }
  if (w.phase === 'won') { text('c-end-title', demo ? '这就是一次配合。' : '两个人，都到了。'); text('c-end-detail', `${w.time.toFixed(1)} 秒 · ${w.stats.rescues} 次救援 · ${w.stats.falls} 次失足。${demo ? '示范成绩不计入自己的完成记录，可以亲自再走一次。' : '可以继续下一段，也可以编辑并分享这个关卡。'}`); text('c-next', room === 2 ? '回到第一段' : '下一段旅程'); }
  text('c-hint', Date.now() < hintUntil ? hint : previous ? '已找到上次旅程和设计，可以继续上次。' : editing ? '设计区与当前旅程分别保留。完成后立即试玩，也可以下载关卡交给朋友。' : demo ? '示范正在通过真实移动、跳跃和救援规则完成关卡。点击暂停可观察配合。' : mode === 'solo' ? 'Tab 切换角色；P 暂停。靠近同伴按 F / Enter 救援，两人一起到出口。' : '两人使用独立按键，同时开路、接应、救援，再一起抵达出口。');
}
function frame(timestamp) {
  const dt = lastTime ? Math.min(.05, (timestamp - lastTime) / 1000) : 0; lastTime = timestamp;
  if (ready) {
    if (!editing) advance(w, dt * (demo ? .5 : 1), inputs());
    if (w.phase === 'won' && lastWon !== w) { lastWon = w; if (!demo && eligible) { const sig = signature(w.map), old = records.find(r => r.signature === sig); if (!old || w.time < old.seconds) { records = records.filter(r => r.signature !== sig); records.push({ signature: sig, seconds: w.time }); records = records.slice(-20); } } updateHud(); save(); }
    drawCoop(ctx, editing ? { ...w, map: draft } : w, assets, { editing, hover, tool, active, mode, reducedMotion });
    if (timestamp - hudTime > 180) { updateHud(); hudTime = timestamp; } if (timestamp - saveTime > 2000) { save(); saveTime = timestamp; }
  }
  requestAnimationFrame(frame);
}
const load = url => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error()); image.src = url; });
try {
  [assets.background, assets.props, assets.people] = await Promise.all([load('assets/directions/cooperation/mist-ridge.png'), load('assets/directions/cooperation/props-atlas.png'), load('assets/directions/cooperation/explorers-atlas.png')]); ready = true; $('c-load').hidden = true;
  if (!previous && new URLSearchParams(location.search).get('demo') === '1') fresh(1, 'solo', true); updateHud(); requestAnimationFrame(frame);
} catch { $('c-load').textContent = '素材未能加载，请刷新重试；下方仍可打开原作参考。'; ['c-demo', 'c-solo', 'c-duo', 'c-edit', 'c-pause'].forEach(id => $(id).disabled = true); }
