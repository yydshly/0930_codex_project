export const COLS = 24, ROWS = 12, TILE = 48, VERSION = 1;
export const TOOLS = { stone: '石台', ice: '寒冰', plate: '开门踏板', gate: '机械门', checkpoint: '营灯', exit: '共同出口', start1: '青色起点', start2: '赭色起点', erase: '擦除' };
export const ROOM_NAMES = ['一道门，两个人', '寒冰上的接应', '为同伴留一条路'];
const clone = value => structuredClone(value);
export const inside = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const at = (map, x, y) => inside(x, y) ? map.cells[y * COLS + x] : 'empty';
export function template(index = 0) {
  index = Math.max(0, Math.min(2, index));
  const map = { version: VERSION, title: ROOM_NAMES[index], revision: 1, cells: Array(COLS * ROWS).fill('empty'), starts: [[2, 9], [3, 9]] };
  const put = (x, y, type) => map.cells[y * COLS + x] = type;
  for (let x = 0; x < COLS; x++) if (index === 0 || index === 1 && ![8, 9].includes(x) || index === 2 && ![8, 15].includes(x)) { put(x, 10, 'stone'); put(x, 11, 'stone'); }
  const gx = [10, 13, 18][index], px = [6, 5, 12][index]; put(px, 9, 'plate'); put(gx, 9, 'gate'); put(gx, 8, 'gate'); put(22, 9, 'exit'); put([13, 11, 10][index], 9, 'checkpoint');
  for (const x of index === 0 ? [17] : index === 1 ? [17, 19] : [6, 14]) put(x, 10, 'ice');
  if (index === 1) { put(4, 10, 'ice'); map.starts[1] = [4, 9]; }
  if (index === 2) { for (let x = 9; x < 13; x++) put(x, 7, 'stone'); }
  return map;
}
export function blankMap() { const map = template(0); map.title = '我的雾岭关卡'; map.cells.fill('empty'); for (let x = 0; x < COLS; x++) map.cells[10 * COLS + x] = 'stone'; map.cells[9 * COLS + 22] = 'exit'; return map; }
export function edit(map, type, x, y) {
  if (!inside(x, y) || !TOOLS[type]) return { ok: false, reason: '请选择画布内的地块' };
  if (type.startsWith('start')) {
    if (['stone', 'ice', 'gate'].includes(at(map, x, y))) return { ok: false, reason: '起点需要留出角色空间' };
    if (map.starts[Number(type.slice(-1)) - 1].join(',') === [x, y].join(',')) return { ok: false, reason: '起点已在这里' };
    map.starts[Number(type.slice(-1)) - 1] = [x, y];
  } else {
    if (map.starts.some(p => p[0] === x && p[1] === y) && ['stone', 'ice', 'gate'].includes(type)) return { ok: false, reason: '不能把角色起点封在实体中' };
    const value = type === 'erase' ? 'empty' : type;
    if (at(map, x, y) === value) return { ok: false, reason: '这一格没有变化' };
    if (type === 'exit') map.cells = map.cells.map(cell => cell === 'exit' ? 'empty' : cell);
    map.cells[y * COLS + x] = value;
  }
  map.revision++; return { ok: true };
}
export function validateMap(raw) {
  if (!raw || raw.version !== VERSION || !Number.isInteger(raw.revision) || raw.revision < 1 || raw.revision > 1000000 || typeof raw.title !== 'string' || raw.title.length > 40 || !Array.isArray(raw.cells) || raw.cells.length !== COLS * ROWS || raw.cells.some(t => !['empty', 'stone', 'ice', 'plate', 'gate', 'checkpoint', 'exit'].includes(t)) || !Array.isArray(raw.starts) || raw.starts.length !== 2 || raw.starts.some(p => !Array.isArray(p) || p.length !== 2 || !inside(...p) || ['stone', 'ice', 'gate'].includes(at(raw, ...p)))) return null;
  return { version: VERSION, title: raw.title, revision: raw.revision, cells: [...raw.cells], starts: clone(raw.starts) };
}
export function designIssues(map) {
  const issues = [];
  if (map.cells.filter(c => c === 'exit').length !== 1) issues.push('需要一个共同出口');
  for (let i = 0; i < 2; i++) if (!['stone', 'ice'].includes(at(map, map.starts[i][0], map.starts[i][1] + 1))) issues.push(`${i ? '赭色' : '青色'}起点下方需要落脚地形`);
  if (map.cells.includes('gate') && !map.cells.includes('plate')) issues.push('机械门需要至少一个开门踏板');
  return issues;
}
function player(id, start) { return { id, x: (start[0] + .5) * TILE, y: (start[1] + 1) * TILE, vx: 0, vy: 0, facing: 1, grounded: false, frozen: false, immunity: 0, jumpHeld: false, coyote: 0, buffer: 0, checkpoint: [...start], arrived: false }; }
export function createWorld(map = template(), options = {}) {
  const valid = validateMap(map); if (!valid) throw new Error('Invalid map');
  const w = { version: VERSION, map: valid, players: valid.starts.map((s, i) => player(i, s)), time: 0, phase: 'playing', paused: true, gateTimer: 0, pressed: false, stats: { rescues: 0, falls: 0, gateActivations: 0, checkpoints: 0 }, message: '', messageTime: 0 };
  for (const p of w.players) { const floor = at(valid, Math.floor(p.x / TILE), Math.floor(p.y / TILE)); p.grounded = ['stone', 'ice'].includes(floor); p.frozen = p.grounded && floor === 'ice'; }
  if (options.frozenStart) { w.players[1].x = 4.5 * TILE; w.players[1].frozen = true; }
  return w;
}
function say(w, message) { w.message = message; w.messageTime = 4; }
export const solid = (w, x, y) => ['stone', 'ice'].includes(at(w.map, x, y)) || at(w.map, x, y) === 'gate' && w.gateTimer <= 0;
const overlaps = (p, x, y) => p.x + 13 > x * TILE && p.x - 13 < (x + 1) * TILE && p.y > y * TILE && p.y - 58 < (y + 1) * TILE;
function collision(w, p) { const hits = []; for (let x = Math.floor((p.x - 13) / TILE); x <= Math.floor((p.x + 13) / TILE); x++) for (let y = Math.floor((p.y - 58) / TILE); y <= Math.floor((p.y - .01) / TILE); y++) if (solid(w, x, y) && overlaps(p, x, y)) hits.push([x, y]); return hits; }
function respawn(w, p) { const keep = p.checkpoint, fresh = player(p.id, keep); Object.assign(p, fresh, { checkpoint: keep, immunity: 2 }); w.stats.falls++; say(w, '失足后回到最近营灯。同伴的进度会保留。'); }
export function regroup(w) { for (const p of w.players) { const fresh = player(p.id, p.checkpoint); Object.assign(p, fresh, { immunity: 2 }); } w.phase = 'playing'; say(w, '两人回到各自最近的营灯，可以重新配合。'); }
function update(w, dt, inputs) {
  w.time += dt; w.messageTime = Math.max(0, w.messageTime - dt); w.gateTimer = Math.max(0, w.gateTimer - dt);
  for (let i = 0; i < 2; i++) {
    const p = w.players[i], input = inputs[i] || {};
    p.immunity = Math.max(0, p.immunity - dt); p.coyote = Math.max(0, p.coyote - dt); p.buffer = Math.max(0, p.buffer - dt);
    if (input.jump && !p.jumpHeld) p.buffer = .15; p.jumpHeld = Boolean(input.jump);
    if (p.frozen) { p.vx = 0; continue; }
    if (input.action) {
      const other = w.players[1 - i];
      if (other.frozen && Math.abs(other.x - p.x) < 92 && Math.abs(other.y - p.y) < 84) { other.frozen = false; other.immunity = 3; w.stats.rescues++; say(w, '同伴已解冻。短暂保暖时间里，尽快离开冰面。'); }
    }
    p.vx = Math.max(-1, Math.min(1, Number(input.move) || 0)) * 235;
    if (p.vx) p.facing = Math.sign(p.vx);
    if (p.buffer > 0 && (p.grounded || p.coyote > 0)) { p.vy = -495; p.grounded = false; p.buffer = 0; p.coyote = 0; }
    p.x += p.vx * dt; p.x = Math.max(14, Math.min(COLS * TILE - 14, p.x));
    const direction = Math.sign(p.vx), horizontalHits = collision(w, p);
    for (const [x] of horizontalHits) { const left = direction > 0 || !direction && p.x < (x + .5) * TILE; p.x = left ? Math.min(p.x, x * TILE - 13) : Math.max(p.x, (x + 1) * TILE + 13); }
    if (horizontalHits.length) p.vx = 0;
    p.vy = Math.min(900, p.vy + 1280 * dt); p.y += p.vy * dt; const wasGrounded = p.grounded, verticalHits = collision(w, p); p.grounded = false;
    for (const [x, y] of verticalHits) { if (p.vy >= 0) { p.y = Math.min(p.y, y * TILE); p.grounded = true; p.coyote = .1; } else p.y = Math.max(p.y, (y + 1) * TILE + 58); }
    if (verticalHits.length) p.vy = 0;
    if (wasGrounded && !p.grounded) p.coyote = Math.max(p.coyote, .08);
    if (p.y > (ROWS + 2) * TILE) { respawn(w, p); continue; }
    const gx = Math.floor(p.x / TILE), gy = Math.floor((p.y - 2) / TILE);
    if (p.grounded && at(w.map, gx, Math.floor((p.y + 1) / TILE)) === 'ice' && !p.immunity) { p.frozen = true; p.vx = 0; say(w, '寒冰困住了同伴。靠近后按救援键，可以帮他解冻。'); }
    if (p.grounded && at(w.map, gx, gy) === 'checkpoint' && p.checkpoint.join(',') !== [gx, gy].join(',')) { p.checkpoint = [gx, gy]; w.stats.checkpoints++; say(w, '营灯已记录落脚位置，失足后能从这里重试。'); }
    p.arrived = !p.frozen && p.grounded && at(w.map, gx, gy) === 'exit';
  }
  const pressed = w.players.some(p => !p.frozen && p.grounded && at(w.map, Math.floor(p.x / TILE), Math.floor((p.y - 2) / TILE)) === 'plate');
  if (pressed) { w.gateTimer = 5; if (!w.pressed) { w.stats.gateActivations++; say(w, '踏板打开了机械门。离开后仍有 5 秒通行时间。'); } }
  w.pressed = pressed;
  if (w.players.every(p => p.arrived)) { w.phase = 'won'; w.paused = true; say(w, '两个人都到了。这段旅程由你们一起完成。'); }
}
export function advance(w, seconds, inputs = [{}, {}]) { if (w.paused || w.phase !== 'playing') return; let left = Math.max(0, Math.min(.5, seconds)); while (left > 1e-8 && w.phase === 'playing') { const dt = Math.min(1 / 120, left); update(w, dt, inputs); left -= dt; } }
function travelInput(w, p, target) {
  const dir = Math.abs(target - p.x) < 9 ? 0 : Math.sign(target - p.x), gx = Math.floor((p.x + dir * 32) / TILE), groundY = Math.round(p.y / TILE), ahead = at(w.map, gx, groundY);
  const risky = !solid(w, gx, groundY) || ahead === 'ice' || solid(w, gx, Math.floor((p.y - 28) / TILE));
  return { move: dir, jump: Boolean(dir && p.grounded && risky && !p.jumpHeld), action: true };
}
export function demonstrationInputs(w) {
  const inputs = [{}, {}], frozen = w.players.find(p => p.frozen);
  if (frozen) {
    const helper = w.players[1 - frozen.id]; inputs[helper.id] = travelInput(w, helper, frozen.x + (helper.x < frozen.x ? -56 : 56)); inputs[helper.id].action = true; return inputs;
  }
  const gateCells = w.map.cells.map((v, i) => v === 'gate' ? [i % COLS, Math.floor(i / COLS)] : null).filter(Boolean), nextGate = gateCells.find(([x]) => w.players.some(p => p.x < (x + 1) * TILE + 10));
  const exitIndex = w.map.cells.indexOf('exit'), exitX = (exitIndex % COLS + .5) * TILE;
  let holder = -1, plateX = 0;
  if (nextGate && w.players.every(p => p.x < (nextGate[0] + 1) * TILE + 10)) {
    const plates = w.map.cells.map((v, i) => v === 'plate' ? [i % COLS, Math.floor(i / COLS)] : null).filter(Boolean).filter(([x]) => x < nextGate[0]);
    if (plates.length) { holder = 0; plateX = (plates.at(-1)[0] + .5) * TILE; }
  }
  for (const p of w.players) inputs[p.id] = travelInput(w, p, p.id === holder ? plateX : exitX);
  return inputs;
}
export function encode(w) { return JSON.stringify({ ...w, paused: true }); }
export function restore(text) {
  try {
    if (typeof text !== 'string' || text.length > 30000) return null;
    const raw = JSON.parse(text), map = validateMap(raw.map), finite = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    if (!map || raw.version !== VERSION || !['playing', 'won'].includes(raw.phase) || !finite(raw.time, 0, 1e8) || !finite(raw.gateTimer, 0, 5) || typeof raw.pressed !== 'boolean' || !Array.isArray(raw.players) || raw.players.length !== 2 || typeof raw.message !== 'string' || raw.message.length > 100 || !finite(raw.messageTime, 0, 4)) return null;
    for (let i = 0; i < 2; i++) {
      const p = raw.players[i]; if (!p || p.id !== i || !finite(p.x, 0, COLS * TILE) || !finite(p.y, -TILE * 3, (ROWS + 2) * TILE + 10) || !finite(p.vx, -235, 235) || !finite(p.vy, -600, 900) || ![1, -1].includes(p.facing) || ['grounded', 'frozen', 'jumpHeld', 'arrived'].some(k => typeof p[k] !== 'boolean') || !finite(p.immunity, 0, 3) || !finite(p.coyote, 0, .15) || !finite(p.buffer, 0, .15) || !Array.isArray(p.checkpoint) || p.checkpoint.length !== 2 || !inside(...p.checkpoint)) return null;
    }
    if (!raw.stats || ['rescues', 'falls', 'gateActivations', 'checkpoints'].some(k => !Number.isSafeInteger(raw.stats[k]) || raw.stats[k] < 0) || raw.phase === 'won' && !raw.players.every(p => p.arrived)) return null;
    return { version: VERSION, map, players: clone(raw.players), time: raw.time, phase: raw.phase, paused: true, gateTimer: raw.gateTimer, pressed: raw.pressed, stats: clone(raw.stats), message: raw.message, messageTime: raw.messageTime };
  } catch { return null; }
}
