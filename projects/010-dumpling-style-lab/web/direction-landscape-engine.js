// RIVERFOLD: one original finite landscape puzzle. Pointy-top axial geometry.
export const VERSION = 1;
export const MAX_ACTIONS = 4096;
export const MAX_SAVE_BYTES = 1000000;
export const COORD_LIMIT = 12;
export const DIRS = Object.freeze([[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]].map(Object.freeze));
export const TERRAINS = Object.freeze({ meadow: Object.freeze({ id: 'meadow', name: '草甸' }), forest: Object.freeze({ id: 'forest', name: '林地' }), village: Object.freeze({ id: 'village', name: '村落' }), water: Object.freeze({ id: 'water', name: '水道' }) });
const tile = (id, name, center, edges) => Object.freeze({ id, name, center, edges: Object.freeze(edges) });
const pure = terrain => Array(6).fill(terrain);
const river = (a, b, land = 'meadow') => Array.from({ length: 6 }, (_, i) => i === a || i === b ? 'water' : land);
export const SEED = tile('seed', '溪丘起点', 'meadow', ['water', 'forest', 'village', 'water', 'forest', 'village']);
export const DECK = Object.freeze([
  tile('river-01', '长溪 · 一', 'water', river(0, 3)),
  tile('forest-01', '针叶林 · 一', 'forest', pure('forest')),
  tile('village-01', '红瓦聚落 · 一', 'village', pure('village')),
  tile('river-02', '长溪 · 二', 'water', river(0, 3)),
  tile('forest-02', '针叶林 · 二', 'forest', pure('forest')),
  tile('village-02', '红瓦聚落 · 二', 'village', pure('village')),
  tile('river-03', '溪湾 · 一', 'water', river(0, 1)),
  tile('forest-03', '针叶林 · 三', 'forest', pure('forest')),
  tile('river-04', '长溪 · 三', 'water', river(0, 3)),
  tile('meadow-01', '花间草甸', 'meadow', pure('meadow')),
  tile('village-03', '林边小村', 'village', ['village', 'village', 'forest', 'village', 'meadow', 'village']),
  tile('forest-04', '草甸林缘', 'forest', ['forest', 'forest', 'meadow', 'forest', 'forest', 'meadow']),
  tile('river-05', '溪湾 · 二', 'water', river(0, 2)),
  tile('meadow-02', '缓坡草甸', 'meadow', ['meadow', 'meadow', 'forest', 'meadow', 'meadow', 'village']),
  tile('forest-05', '深林', 'forest', pure('forest')),
  tile('village-04', '溪岸村落', 'village', ['village', 'village', 'meadow', 'village', 'forest', 'meadow']),
  tile('river-06', '长溪 · 四', 'water', river(0, 3)),
  tile('meadow-03', '归途草甸', 'meadow', ['meadow', 'forest', 'village', 'meadow', 'forest', 'meadow'])
]);
const TARGETS = Object.freeze({ forest: 4, village: 3, water: 5 });
const mod = n => ((n % 6) + 6) % 6;
const clone = value => structuredClone(value);
const key = (q, r) => `${q},${r}`;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const coordinates = (q, r) => Number.isSafeInteger(q) && Number.isSafeInteger(r) && Math.abs(q) <= COORD_LIMIT && Math.abs(r) <= COORD_LIMIT;
const radius = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
export function rotatedEdges(model, rotation = 0) { return model.edges.map((_, direction) => model.edges[mod(direction - rotation)]); }
function rotatedTile(model, rotation = 0) { return { ...model, edges: rotatedEdges(model, rotation), rotation }; }
function groupsOf(board) {
  const byCoord = new Map(board.map(item => [key(item.q, item.r), item]));
  const groups = {};
  for (const terrain of Object.keys(TARGETS)) {
    const visited = new Set(), components = [];
    for (const item of board) {
      const firstKey = key(item.q, item.r);
      if (visited.has(firstKey) || !(item.center === terrain || item.edges.includes(terrain))) continue;
      const pending = [item], cells = []; visited.add(firstKey);
      while (pending.length) {
        const cell = pending.pop(); cells.push({ q: cell.q, r: cell.r, id: cell.id });
        for (let direction = 0; direction < 6; direction++) {
          if (cell.edges[direction] !== terrain) continue;
          const [dq, dr] = DIRS[direction], next = byCoord.get(key(cell.q + dq, cell.r + dr));
          if (!next || next.edges[mod(direction + 3)] !== terrain || visited.has(key(next.q, next.r))) continue;
          visited.add(key(next.q, next.r)); pending.push(next);
        }
      }
      cells.sort((a, b) => a.q - b.q || a.r - b.r); components.push({ size: cells.length, cells });
    }
    components.sort((a, b) => b.size - a.size || a.cells[0].q - b.cells[0].q || a.cells[0].r - b.cells[0].r);
    groups[terrain] = components;
  }
  return groups;
}
function objectivesOf(groups) { return Object.fromEntries(Object.entries(TARGETS).map(([terrain, target]) => { const current = groups[terrain][0]?.size || 0; return [terrain, { current, target, complete: current >= target }]; })); }
function sync(w) {
  w.score = w.board.reduce((sum, item) => sum + item.score, 0);
  w.groups = groupsOf(w.board); w.objectives = objectivesOf(w.groups);
  w.actions = w.ledger.length;
  w.stats.placements = w.deckIndex;
  w.stats.perfectPlacements = w.board.filter(item => item.id !== 'seed' && item.perfect).length;
  w.stats.matchedEdges = w.board.reduce((sum, item) => sum + item.matches, 0);
}
function message(w, text) { w.message = text; w.log.push(text); if (w.log.length > 24) w.log.shift(); }
function event(w, type, payload) { const entry = { type }; if (payload !== undefined) entry.payload = clone(payload); w.ledger.push(entry); }
export function createWorld() {
  const w = { version: VERSION, phase: 'arranging', paused: true, board: [{ id: 'seed', q: 0, r: 0, tileId: SEED.id, center: SEED.center, edges: [...SEED.edges], rotation: 0, score: 0, matches: 0, contacts: 0, perfect: false }], deckIndex: 0, rotation: 0, selected: null, score: 0, objectives: {}, groups: {}, stats: { placements: 0, perfectPlacements: 0, matchedEdges: 0, rotations: 0, undos: 0 }, actions: 0, ledger: [], log: [], summary: null, message: '从溪丘起点向外拼接。先选相邻空地，再旋转地块；水道边只能连接水道边。' };
  sync(w); return w;
}
export function frontier(w) {
  if (!w || !Array.isArray(w.board)) return [];
  const occupied = new Set(w.board.map(item => key(item.q, item.r))), open = new Map();
  for (const item of w.board) for (const [dq, dr] of DIRS) {
    const q = item.q + dq, r = item.r + dr, cellKey = key(q, r);
    if (coordinates(q, r) && !occupied.has(cellKey)) open.set(cellKey, { q, r });
  }
  return [...open.values()].sort((a, b) => radius(a.q, a.r) - radius(b.q, b.r) || a.r - b.r || a.q - b.q);
}
export function preview(w, q = w?.selected?.q, r = w?.selected?.r, rotation = w?.rotation ?? 0) {
  const model = DECK[w?.deckIndex], result = { valid: false, reason: '', q: q ?? null, r: r ?? null, tileId: model?.id || null, rotation, edges: model && Number.isSafeInteger(rotation) && rotation >= 0 && rotation < 6 ? rotatedEdges(model, rotation) : [], center: model?.center || null, contacts: 0, matches: 0, mismatches: 0, perfect: false, score: 0, connections: [], objectives: clone(w?.objectives || {}) };
  if (!w || w.phase !== 'arranging') { result.reason = '本轮拼境已经结束。'; return result; }
  if (!model) { result.reason = '十八块地形已全部落位，请审阅并完成拼境。'; return result; }
  if (!coordinates(q, r)) { result.reason = '请选择地图上可用的相邻空地。'; return result; }
  if (!Number.isSafeInteger(rotation) || rotation < 0 || rotation > 5) { result.reason = '旋转方向需要在六个朝向之内。'; return result; }
  if (w.board.some(item => item.q === q && item.r === r)) { result.reason = '这块位置已经有地形。'; return result; }
  const occupied = new Map(w.board.map(item => [key(item.q, item.r), item]));
  for (let direction = 0; direction < 6; direction++) {
    const [dq, dr] = DIRS[direction], neighbor = occupied.get(key(q + dq, r + dr));
    if (!neighbor) continue;
    const terrain = result.edges[direction], neighborTerrain = neighbor.edges[mod(direction + 3)], match = terrain === neighborTerrain, waterConflict = (terrain === 'water') !== (neighborTerrain === 'water');
    result.connections.push({ direction, terrain, neighborTerrain, match, waterConflict, neighbor: { q: neighbor.q, r: neighbor.r } });
    result.contacts++; if (match) result.matches++; else result.mismatches++;
  }
  if (!result.contacts) { result.reason = '地形必须与已有地图相邻。'; return result; }
  if (result.connections.some(item => item.waterConflict)) { result.reason = '水道与陆地边不能相接，请旋转地块或换一处空地。'; return result; }
  result.valid = true; result.perfect = result.matches === result.contacts;
  result.score = Math.max(0, result.matches * 10 - result.mismatches * 3) + (result.perfect ? 12 : 0);
  result.objectives = objectivesOf(groupsOf([...w.board, { id: `p${w.deckIndex + 1}`, q, r, edges: result.edges, center: result.center }]));
  result.reason = result.perfect ? `全部 ${result.contacts} 条接壤边吻合，获得 ${result.score} 分。` : `${result.matches} 条吻合、${result.mismatches} 条陆地差异，获得 ${result.score} 分。`;
  return result;
}
export function status(w) {
  const model = DECK[w.deckIndex], p = preview(w);
  return { phase: w.phase, paused: w.paused, placements: w.deckIndex, tilesPlaced: w.deckIndex, tilesTotal: DECK.length, remaining: DECK.length - w.deckIndex, score: w.score, currentTile: model ? rotatedTile(model, w.rotation) : null, nextTile: model ? rotatedTile(model, w.rotation) : null, upcoming: DECK.slice(w.deckIndex + 1, w.deckIndex + 4).map(item => rotatedTile(item)), rotation: w.rotation, selected: clone(w.selected), objectives: clone(w.objectives), groups: clone(w.groups), completedObjectives: Object.values(w.objectives).filter(item => item.complete).length, canFinish: w.phase === 'arranging' && w.deckIndex === DECK.length && !w.paused, canUndo: w.phase === 'arranging' && w.deckIndex > 0 && !w.paused, canPlace: !w.paused && p.valid, preview: p, summary: clone(w.summary), message: w.message, actions: w.actions };
}
export function act(w, type, payload) {
  const reject = reason => ({ ok: false, changed: false, reason });
  if (!w || w.version !== VERSION || typeof type !== 'string') return reject('无法识别此操作。');
  if (type === 'pause') {
    if (typeof payload !== 'boolean') return reject('暂停状态必须明确为真或假。');
    if (!payload && w.phase !== 'arranging') return reject('本轮拼境已经结束。');
    const changed = w.paused !== payload; w.paused = payload; return { ok: true, changed };
  }
  if (w.phase !== 'arranging') return reject('本轮拼境已经结束，请开始新的拼境。');
  if (w.paused) return reject('请先开始或继续拼境。');
  if (!['select', 'rotate', 'orient', 'place', 'undo', 'finish'].includes(type)) return reject('未知拼境操作。');
  if (w.ledger.length >= MAX_ACTIONS) return reject('本轮操作已达到保存上限，请开始新的拼境。');
  if (type === 'select') {
    if (!plain(payload) || Object.keys(payload).sort().join(',') !== 'q,r' || !coordinates(payload.q, payload.r)) return reject('请选择有效的地图位置。');
    if (!DECK[w.deckIndex]) return reject('所有地形已落位。');
    if (!frontier(w).some(item => item.q === payload.q && item.r === payload.r)) return reject('只能选择地图边缘的相邻空地。');
    if (w.selected?.q === payload.q && w.selected?.r === payload.r) return { ok: true, changed: false };
    w.selected = { q: payload.q, r: payload.r }; event(w, type, payload); sync(w); return { ok: true, changed: true };
  }
  if (type === 'rotate' || type === 'orient') {
    if (!DECK[w.deckIndex]) return reject('所有地形已落位。');
    if (!Number.isSafeInteger(payload) || (type === 'rotate' && (payload < -5 || payload > 5)) || (type === 'orient' && (payload < 0 || payload > 5))) return reject('请选择六个朝向之一。');
    const rotation = type === 'rotate' ? mod(w.rotation + payload) : payload;
    if (rotation === w.rotation) return { ok: true, changed: false };
    w.rotation = rotation; w.stats.rotations++; event(w, type, payload); sync(w); return { ok: true, changed: true };
  }
  if (payload !== undefined) return reject('此操作不接受额外参数。');
  if (type === 'place') {
    const p = preview(w); if (!p.valid) return reject(p.reason);
    w.board.push({ id: `p${w.deckIndex + 1}`, q: p.q, r: p.r, tileId: p.tileId, rotation: p.rotation, center: p.center, edges: [...p.edges], score: p.score, matches: p.matches, contacts: p.contacts, perfect: p.perfect });
    w.deckIndex++; w.rotation = 0; w.selected = null; event(w, type); sync(w);
    message(w, w.deckIndex === DECK.length ? `十八块地形已全部落位，当前 ${w.score} 分。可以撤回调整，也可以明确完成拼境。` : `第 ${w.deckIndex} 块地形落位，${p.reason}`);
    return { ok: true, changed: true, placement: clone(w.board.at(-1)) };
  }
  if (type === 'undo') {
    if (!w.deckIndex) return reject('起点不能撤回。');
    const removed = w.board.pop(); w.deckIndex--; w.rotation = removed.rotation; w.selected = { q: removed.q, r: removed.r }; w.stats.undos++; event(w, type); sync(w); message(w, '已撤回上一块地形，得分与连通目标同时还原。');
    return { ok: true, changed: true, removed: clone(removed) };
  }
  if (w.deckIndex !== DECK.length) return reject('请先落位全部十八块地形。');
  event(w, type); sync(w); w.phase = 'finished'; w.paused = true;
  w.summary = { score: w.score, placements: w.deckIndex, objectives: clone(w.objectives), completedObjectives: Object.values(w.objectives).filter(item => item.complete).length, perfectPlacements: w.stats.perfectPlacements, matchedEdges: w.stats.matchedEdges };
  message(w, `本轮拼境完成：${w.score} 分，${w.summary.completedObjectives}/3 项连通目标达成。`);
  return { ok: true, changed: true, summary: clone(w.summary) };
}
export function demoPlanner(w) {
  if (!w || w.phase !== 'arranging' || w.paused || w.ledger.length >= MAX_ACTIONS) return null;
  if (w.deckIndex === DECK.length) return { type: 'finish' };
  let best = null;
  for (const cell of frontier(w)) for (let rotation = 0; rotation < 6; rotation++) {
    const p = preview(w, cell.q, cell.r, rotation); if (!p.valid) continue;
    let value = p.score * 3 - radius(cell.q, cell.r) * 2;
    for (const terrain of Object.keys(TARGETS)) {
      const before = w.objectives[terrain], after = p.objectives[terrain], gain = after.current - before.current;
      value += gain * (before.complete ? 22 : 220);
      if (!before.complete && after.complete) value += 100;
    }
    if (!best || value > best.value) best = { cell, rotation, value };
  }
  if (!best) return null;
  if (w.rotation !== best.rotation) return { type: 'orient', payload: best.rotation };
  if (w.selected?.q !== best.cell.q || w.selected?.r !== best.cell.r) return { type: 'select', payload: { ...best.cell } };
  return { type: 'place' };
}
export function serialize(w) { const save = clone(w); save.paused = true; return save; }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map(name => `${JSON.stringify(name)}:${canonical(value[name])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function restore(input) {
  try {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) return null;
    const saved = JSON.parse(text);
    if (!plain(saved) || saved.version !== VERSION || !Array.isArray(saved.ledger) || saved.ledger.length > MAX_ACTIONS || typeof saved.paused !== 'boolean') return null;
    const replay = createWorld(); replay.paused = false;
    for (const entry of saved.ledger) {
      if (!plain(entry) || !['select', 'rotate', 'orient', 'place', 'undo', 'finish'].includes(entry.type) || Object.keys(entry).some(name => !['type', 'payload'].includes(name))) return null;
      const result = act(replay, entry.type, entry.payload);
      if (!result.ok || !result.changed) return null;
    }
    replay.paused = true; saved.paused = true;
    return canonical(replay) === canonical(saved) ? replay : null;
  } catch { return null; }
}
