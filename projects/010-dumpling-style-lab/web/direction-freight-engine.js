export const COLS = 22, ROWS = 14, VERSION = 1;
export const CARGO = { logs: { name: '原木', color: '#bc9a72', art: 0 }, boards: { name: '建材', color: '#d28c72', art: 1 }, grain: { name: '粮食', color: '#dfbd70', art: 2 } };
export const STATIONS = [
  { id: 'forest', name: '松岭林场', x: 3, y: 3, art: 0, produces: 'logs', accepts: [], description: '生产原木，送到木厂加工。' },
  { id: 'mill', name: '溪口木厂', x: 10, y: 3, art: 1, produces: 'boards', accepts: ['logs'], description: '每 2 份原木加工 1 份建材。' },
  { id: 'town', name: '港湾新城', x: 18, y: 7, art: 2, accepts: ['boards'], description: '需要建材，为居民建设新街区。' },
  { id: 'farm', name: '谷地粮仓', x: 3, y: 10, art: 3, produces: 'grain', accepts: [], description: '生产粮食，可以直送或先运到中转站。' },
  { id: 'market', name: '南岸集市', x: 15, y: 10, art: 4, accepts: ['grain'], description: '需要粮食，完成地区补给订单。' },
  { id: 'hub', name: '中央货站', x: 10, y: 8, art: 5, accepts: ['logs', 'boards', 'grain'], description: '货物暂存后，由另一条线路接力配送。' }
];
export const dock = station => [station.x, station.y + 1];
const key = (x, y) => `${x},${y}`, validCell = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const footprint = (x, y) => STATIONS.some(s => Math.abs(s.x - x) <= 1 && y <= s.y && y >= s.y - 1);
export const terrainBlocked = (x, y) => y === 13 || x >= 17 && y <= 2 || x <= 1 && y <= 1;
export const water = (x, y) => x === 7 && validCell(x, y);
export const bridgeSite = (x, y) => water(x, y) && [4, 9].includes(y);
export const closed = (w, x, y) => w.time >= 45 && w.time < 58 && x === 7 && y === 9;
export const traversable = (w, x, y) => w.roads.includes(key(x, y)) && !closed(w, x, y);
export function route(w, from, to) {
  if (!from || !to || !validCell(...from) || !traversable(w, ...to)) return null;
  const q = [from], parents = new Map([[key(...from), null]]); let found = false;
  for (let i = 0; i < q.length; i++) { const a = q[i]; if (a[0] === to[0] && a[1] === to[1]) { found = true; break; } for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = [a[0] + dx, a[1] + dy], k = key(...n); if (traversable(w, ...n) && !parents.has(k)) { q.push(n); parents.set(k, key(...a)); } } }
  if (!found) return null; const path = []; let k = key(...to); while (k !== null) { path.unshift(k.split(',').map(Number)); k = parents.get(k); } return path;
}
export function seededRoads() {
  const roads = new Set(STATIONS.map(s => key(...dock(s))));
  const line = (x1, y1, x2, y2) => { let x = x1, y = y1; roads.add(key(x, y)); while (x !== x2 || y !== y2) { if (x !== x2) x += Math.sign(x2 - x); else y += Math.sign(y2 - y); roads.add(key(x, y)); } };
  line(3, 4, 12, 4); line(5, 9, 12, 9); line(5, 4, 5, 11); line(12, 4, 12, 11); line(12, 8, 18, 8); line(3, 11, 5, 11); line(12, 11, 15, 11); return [...roads];
}
function log(w, message) { w.log.push({ time: w.time, message }); if (w.log.length > 14) w.log.shift(); w.message = message; }
export function createFreight(layout = 'guided') {
  layout = ['demo', 'guided', 'blank'].includes(layout) ? layout : 'guided';
  const w = { version: VERSION, layout, phase: 'playing', paused: true, time: 0, limit: 180, credits: 1800, roads: layout === 'blank' ? STATIONS.map(s => key(...dock(s))) : seededRoads(), stations: STATIONS.map(s => ({ id: s.id, stock: { logs: s.id === 'forest' ? 10 : 0, boards: 0, grain: s.id === 'farm' ? 10 : 0 }, timer: 0 })), lines: [], trucks: [], nextLine: 1, nextTruck: 1, goal: { boards: 16, grain: 20 }, delivered: { boards: 0, grain: 0 }, stats: { revenue: 0, expenses: 0, producedLogs: 10, producedGrain: 10, processedBoards: 0, transfers: 0, trips: 0, built: 0 }, incident: false, reopened: false, log: [], message: '' };
  if (layout !== 'blank') { createLine(w, 'forest', 'mill', 'logs'); addTruck(w, 1); createLine(w, 'mill', 'town', 'boards'); addTruck(w, 2); createLine(w, 'farm', 'hub', 'grain'); createLine(w, 'hub', 'market', 'grain'); }
  if (layout === 'guided') w.roads = w.roads.filter(k => k !== '6,4' && k !== '7,9');
  log(w, layout === 'blank' ? '六座站点等待你的线路。前场道路已经保留，先把它们连起来。' : layout === 'guided' ? '北路缺少一段路，南桥尚未建设。接通道路后，现有车队就能开始运输。' : '车队准备出发：林场到木厂，再送建材到新城；粮食经过中央货站接力送达。'); return w;
}
export function build(w, tool, x, y) {
  if (w.phase !== 'playing' || !validCell(x, y)) return { ok: false, reason: '请选择地图内的地块' };
  const k = key(x, y), exists = w.roads.includes(k);
  if (tool === 'erase') { if (!exists) return { ok: false, reason: '这里没有道路' }; if (STATIONS.some(s => key(...dock(s)) === k)) return { ok: false, reason: '站点前场需要保留' }; if (w.trucks.some(v => Math.round(v.x) === x && Math.round(v.y) === y)) return { ok: false, reason: '这里有车辆，等车辆通过后再拆除' }; w.roads.splice(w.roads.indexOf(k), 1); const refund = water(x, y) ? 70 : 4; w.credits += refund; w.stats.expenses -= refund; return { ok: true, reason: '已拆除，车辆会重新寻找路线' }; }
  if (exists) return { ok: false, reason: '这里已经接通' };
  if (footprint(x, y)) return { ok: false, reason: '站点建筑所在的位置不能铺路；连接建筑南侧前场' };
  if (terrainBlocked(x, y)) return { ok: false, reason: '这里是海岸或山地，请选择平坦地块' };
  if (water(x, y) && (tool !== 'bridge' || !bridgeSite(x, y))) return { ok: false, reason: '河上需要桥梁，桥址在北路与南路两处高亮位置' };
  if (tool === 'bridge' && !bridgeSite(x, y)) return { ok: false, reason: '桥梁只能建在两处指定河岸桥址' };
  if (!['road', 'bridge'].includes(tool)) return { ok: false, reason: '没有这个建造工具' };
  const cost = tool === 'bridge' ? 140 : 8; if (w.credits < cost) return { ok: false, reason: '预算不足，先等待运输收入' };
  w.credits -= cost; w.stats.expenses += cost; w.stats.built++; w.roads.push(k); return { ok: true, reason: tool === 'bridge' ? '桥梁已接通' : '道路已铺设' };
}
export function lineReason(w, from, to, cargo) {
  const a = STATIONS.find(s => s.id === from), b = STATIONS.find(s => s.id === to);
  if (w.phase !== 'playing') return '本轮运输已经结束'; if (!a || !b || !CARGO[cargo] || from === to) return '选择两个不同站点和一种货物';
  if (a.id !== 'hub' && a.produces !== cargo) return '出发站不会生产这种货物，可从中转站继续接驳';
  if (!b.accepts.includes(cargo)) return '到达站不接收这种货物'; if (w.lines.length >= 10) return '本样例最多建立 10 条线路'; if (w.lines.some(l => l.from === from && l.to === to && l.cargo === cargo)) return '已有相同线路，可以增派车辆'; if (w.credits < 140) return '预算不足，建立线路需要购买首辆货车'; return '';
}
export function createLine(w, from, to, cargo) { const why = lineReason(w, from, to, cargo); if (why) return { ok: false, reason: why }; const id = w.nextLine++; w.lines.push({ id, from, to, cargo, enabled: true, delivered: 0, revenue: 0, trips: 0 }); addTruck(w, id); log(w, `${STATIONS.find(s => s.id === from).name} → ${STATIONS.find(s => s.id === to).name}：${CARGO[cargo].name}线路已建立。`); return { ok: true, id }; }
export function addTruck(w, lineId) { const line = w.lines.find(l => l.id === lineId); if (!line || w.phase !== 'playing') return { ok: false, reason: '先选择一条线路' }; if (w.credits < 140 || w.trucks.length >= 12) return { ok: false, reason: w.trucks.length >= 12 ? '车队已达到 12 辆上限' : '购买货车需要 140 预算' }; const [x, y] = dock(STATIONS.find(s => s.id === line.from)); w.trucks.push({ id: w.nextTruck++, lineId, x, y, stage: 'load', cargo: 0, timer: 0, path: [], index: 0, heading: [1, 0], blocked: false, trips: 0 }); w.credits -= 140; w.stats.expenses += 140; return { ok: true }; }
export function toggleLine(w, id) { const l = w.lines.find(l => l.id === id); if (!l || w.phase !== 'playing') return false; l.enabled = !l.enabled; return true; }
export function connected(w, line) { return route(w, dock(STATIONS.find(s => s.id === line.from)), dock(STATIONS.find(s => s.id === line.to))); }
function startPath(w, v, dest) { const path = route(w, [Math.round(v.x), Math.round(v.y)], dock(STATIONS.find(s => s.id === dest))); v.path = path || []; v.index = 1; v.blocked = !path; return Boolean(path); }
function travel(w, v, to, dt) {
  if (!v.path.length && !startPath(w, v, to)) return false;
  if (v.index >= v.path.length) return true;
  let next = v.path[v.index]; if (!traversable(w, ...next)) { if (!startPath(w, v, to)) return false; next = v.path[v.index]; if (!next) return true; }
  const dx = next[0] - v.x, dy = next[1] - v.y, distance = Math.hypot(dx, dy), step = Math.min(distance, dt * 2.6); v.heading = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
  const nx = distance ? v.x + dx / distance * step : next[0], ny = distance ? v.y + dy / distance * step : next[1];
  const ahead = w.trucks.some(o => o.id !== v.id && ['out', 'back'].includes(o.stage) && o.heading[0] === v.heading[0] && o.heading[1] === v.heading[1] && Math.hypot(o.x - nx, o.y - ny) < 1.15 && ((o.x - v.x) * v.heading[0] + (o.y - v.y) * v.heading[1] > .03 || Math.hypot(o.x - v.x, o.y - v.y) < .08 && o.id < v.id));
  if (ahead) { v.blocked = true; return false; } v.blocked = false;
  if (distance <= dt * 2.6) { v.x = next[0]; v.y = next[1]; v.index++; } else { v.x = nx; v.y = ny; }
  return v.index >= v.path.length;
}
function update(w, dt) {
  w.time += dt;
  if (!w.incident && w.time >= 45) { w.incident = true; log(w, '南桥进入 13 秒检修。车队寻找北桥绕行，没有替代道路的车辆会等待。'); }
  if (!w.reopened && w.time >= 58) { w.reopened = true; log(w, '南桥检修结束，车队可以重新通行。'); }
  for (const s of w.stations) { s.timer += dt; const type = s.id === 'forest' ? 'logs' : s.id === 'farm' ? 'grain' : null, interval = type === 'logs' ? 2.8 : 4;
    if (type && s.timer >= interval) { const amount = Math.min(2, 48 - s.stock[type]); s.stock[type] += amount; w.stats[type === 'logs' ? 'producedLogs' : 'producedGrain'] += amount; s.timer -= interval; }
    else if (s.id === 'mill' && s.timer >= 2 && s.stock.logs >= 2 && s.stock.boards < 32) { s.stock.logs -= 2; s.stock.boards++; w.stats.processedBoards++; s.timer -= 2; }
    s.timer = Math.min(s.timer, type ? interval : 2);
  }
  for (const v of w.trucks) { const l = w.lines.find(l => l.id === v.lineId), src = w.stations.find(s => s.id === l.from), dst = w.stations.find(s => s.id === l.to);
    if (v.stage === 'load') { v.blocked = false; if (!l.enabled || src.stock[l.cargo] < 1 || w.credits < 2) continue; const path = connected(w, l); if (!path) { v.blocked = true; continue; } v.timer += dt; if (v.timer >= 1) { v.cargo = Math.min(4, src.stock[l.cargo]); src.stock[l.cargo] -= v.cargo; w.credits -= 2; w.stats.expenses += 2; v.stage = 'out'; v.timer = 0; v.path = path; v.index = 1; } }
    else if (v.stage === 'out' || v.stage === 'back') { if (travel(w, v, v.stage === 'out' ? l.to : l.from, dt)) { v.stage = v.stage === 'out' ? 'unload' : 'load'; v.timer = 0; v.path = []; v.index = 0; } }
    else if (v.stage === 'unload') { v.timer += dt; if (v.timer < 1) continue; v.timer = 0; const final = ['town', 'market'].includes(l.to), max = l.to === 'mill' ? 32 : 48, amount = final ? v.cargo : Math.min(v.cargo, max - dst.stock[l.cargo]); v.blocked = amount === 0;
      if (amount) { v.cargo -= amount; l.delivered += amount; if (final) { const revenue = amount * (l.cargo === 'boards' ? 42 : 22); w.delivered[l.cargo] += amount; w.credits += revenue; w.stats.revenue += revenue; l.revenue += revenue; log(w, `${STATIONS.find(s => s.id === l.to).name}收到 ${amount} 份${CARGO[l.cargo].name}，运输收入 +${revenue}。`); } else { dst.stock[l.cargo] += amount; if (l.to === 'hub') w.stats.transfers += amount; } }
      if (v.cargo === 0) { v.trips++; l.trips++; w.stats.trips++; v.stage = 'back'; v.path = []; v.index = 0; v.blocked = false; }
    }
  }
  if (w.delivered.boards >= w.goal.boards && w.delivered.grain >= w.goal.grain) { w.phase = 'won'; w.paused = true; log(w, '建材与粮食订单都已送达。这片地区由你的线路连接起来了。'); }
  else if (w.time >= w.limit) { w.phase = 'report'; w.paused = true; log(w, '本轮运输窗口结束。可以调整道路、接驳与车辆配置后再试。'); }
}
export function advance(w, seconds) { if (w.paused || w.phase !== 'playing') return; let left = Math.max(0, Math.min(.5, seconds)); while (left > 1e-8 && w.phase === 'playing') { const dt = Math.min(.025, left); update(w, dt); left -= dt; } }
export function truckStatus(w, v) { const l = w.lines.find(l => l.id === v.lineId); return v.stage === 'load' ? !l.enabled ? '暂停发车' : v.blocked ? '等待通路' : w.credits < 2 ? '等待预算' : !w.stations.find(s => s.id === l.from).stock[l.cargo] ? '等待货物' : '正在装车' : v.stage === 'unload' ? v.blocked ? '货站已满' : '正在卸货' : v.blocked ? v.path.length ? '等待前车' : '等待通路' : v.stage === 'back' ? '空车返回' : '载货运输'; }
export function status(w) { if (w.phase !== 'playing') return w.message; if (w.layout === 'guided' && !w.roads.includes('6,4') && !w.roads.includes('7,9')) return '北路缺口在高亮地块。铺一段道路，或建设南桥，现有线路即可开始运转。'; if (!w.lines.length) return '先铺道路与桥梁，把站点南侧前场连起来，再选择起点、终点和货物建立线路。'; if (w.time >= 45 && w.time < 58) return '南桥检修中。观察车辆的北桥绕行路线；另一座桥能让运输更有韧性。'; if (w.delivered.boards < w.goal.boards) return '原木要先运到木厂才能加工成建材。检查两段线路的连接与车队配置。'; return '建材订单已完成。检查粮食的直接运输或中转接驳，让集市收到补给。'; }
export function encode(w) { return JSON.stringify({ ...w, paused: true }); }
export function restore(text) {
  try {
    if (typeof text !== 'string' || text.length > 70000) return null; const w = JSON.parse(text), num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi, integer = (v, lo, hi) => Number.isSafeInteger(v) && num(v, lo, hi);
    if (!w || w.version !== VERSION || !['demo', 'guided', 'blank'].includes(w.layout) || !['playing', 'won', 'report'].includes(w.phase) || !num(w.time, 0, 181) || w.limit !== 180 || !num(w.credits, 0, 100000) || w.goal?.boards !== 16 || w.goal?.grain !== 20 || typeof w.incident !== 'boolean' || typeof w.reopened !== 'boolean') return null;
    if (!Array.isArray(w.roads) || w.roads.length > COLS * ROWS || new Set(w.roads).size !== w.roads.length || w.roads.some(k => typeof k !== 'string' || !/^\d+,\d+$/.test(k) || !validCell(...k.split(',').map(Number)) || footprint(...k.split(',').map(Number)) || water(...k.split(',').map(Number)) && !bridgeSite(...k.split(',').map(Number))) || STATIONS.some(s => !w.roads.includes(key(...dock(s))))) return null;
    if (!Array.isArray(w.stations) || w.stations.length !== 6 || w.stations.some((s, i) => s.id !== STATIONS[i].id || !s.stock || Object.keys(CARGO).some(k => !integer(s.stock[k], 0, 48)) || !num(s.timer, 0, 4))) return null;
    if (!Array.isArray(w.lines) || w.lines.length > 10 || new Set(w.lines.map(l => l.id)).size !== w.lines.length || w.lines.some(l => !integer(l.id, 1, 100) || !STATIONS.some(s => s.id === l.from && (s.id === 'hub' || s.produces === l.cargo)) || !STATIONS.some(s => s.id === l.to && s.id !== l.from && s.accepts.includes(l.cargo)) || typeof l.enabled !== 'boolean' || ['delivered', 'revenue', 'trips'].some(k => !integer(l[k], 0, 100000)))) return null;
    if (!Array.isArray(w.trucks) || w.trucks.length > 12 || new Set(w.trucks.map(v => v.id)).size !== w.trucks.length || w.trucks.some(v => !integer(v.id, 1, 100) || !w.lines.some(l => l.id === v.lineId) || !num(v.x, 0, COLS - 1) || !num(v.y, 0, ROWS - 1) || !['load', 'out', 'unload', 'back'].includes(v.stage) || !integer(v.cargo, 0, 4) || !num(v.timer, 0, 1.1) || !Array.isArray(v.path) || v.path.length > COLS * ROWS || v.path.some((c, i) => !Array.isArray(c) || c.length !== 2 || !validCell(...c) || i > 0 && Math.abs(c[0] - v.path[i - 1][0]) + Math.abs(c[1] - v.path[i - 1][1]) !== 1) || !integer(v.index, 0, v.path.length + 1) || !Array.isArray(v.heading) || v.heading.length !== 2 || Math.abs(v.heading[0]) + Math.abs(v.heading[1]) !== 1 || typeof v.blocked !== 'boolean' || !integer(v.trips, 0, 1000) || ['load', 'back'].includes(v.stage) && v.cargo !== 0)) return null;
    if (!integer(w.nextLine, 1, 100) || !integer(w.nextTruck, 1, 100) || w.lines.some(l => l.id >= w.nextLine) || w.trucks.some(v => v.id >= w.nextTruck) || !w.delivered || ['boards', 'grain'].some(k => !integer(w.delivered[k], 0, 1000)) || !w.stats || ['revenue', 'producedLogs', 'producedGrain', 'processedBoards', 'transfers', 'trips', 'built'].some(k => !integer(w.stats[k], 0, 100000)) || !integer(w.stats.expenses, -10000, 100000) || w.credits !== 1800 + w.stats.revenue - w.stats.expenses || w.stats.revenue !== w.lines.reduce((n, l) => n + l.revenue, 0) || w.stats.trips !== w.trucks.reduce((n, v) => n + v.trips, 0) || w.stats.trips !== w.lines.reduce((n, l) => n + l.trips, 0)) return null;
    for (const cargo of Object.keys(CARGO)) { const stored = w.stations.reduce((n, s) => n + s.stock[cargo], 0) + w.trucks.reduce((n, v) => n + (w.lines.find(l => l.id === v.lineId).cargo === cargo ? v.cargo : 0), 0); if (cargo === 'logs' && stored + 2 * w.stats.processedBoards !== w.stats.producedLogs || cargo === 'boards' && stored + w.delivered.boards !== w.stats.processedBoards || cargo === 'grain' && stored + w.delivered.grain !== w.stats.producedGrain) return null; }
    if (w.stats.revenue !== w.delivered.boards * 42 + w.delivered.grain * 22 || w.delivered.boards !== w.lines.filter(l => l.to === 'town').reduce((n, l) => n + l.delivered, 0) || w.delivered.grain !== w.lines.filter(l => l.to === 'market').reduce((n, l) => n + l.delivered, 0)) return null;
    if (!Array.isArray(w.log) || w.log.length > 14 || w.log.some(e => !num(e.time, 0, w.time) || typeof e.message !== 'string' || e.message.length > 160) || typeof w.message !== 'string' || w.message.length > 160 || w.phase === 'won' && (w.delivered.boards < 16 || w.delivered.grain < 20)) return null;
    w.paused = true; return structuredClone(w);
  } catch { return null; }
}
