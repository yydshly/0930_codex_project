export const COLS = 24, ROWS = 14, VERSION = 1;
export const ROLES = [{ id: 'engineer', name: '林禾', title: '工程', color: '#86d6c5' }, { id: 'medic', name: '周砚', title: '医护', color: '#edb3a1' }, { id: 'dispatcher', name: '叶宁', title: '调度', color: '#e8c890' }];
export const ROOMS = [{ name: '动力舱', x: 1, y: 2, w: 6, h: 5, art: 0 }, { name: '医疗舱', x: 10, y: 2, w: 6, h: 5, art: 1 }, { name: '调度室', x: 19, y: 2, w: 5, h: 5, art: 2 }, { name: '补给舱', x: 1, y: 9, w: 7, h: 4, art: 3 }, { name: '接驳舱', x: 16, y: 9, w: 8, h: 4, art: 4 }];
export const EQUIPMENT = [{ id: 'reactor', name: '动力核心', x: 3, y: 3, art: 0 }, { id: 'seal', name: '泄漏管段', x: 5, y: 5, art: 1 }, { id: 'console', name: '调度终端', x: 21, y: 3, art: 2 }, { id: 'bed', name: '医疗设备', x: 11, y: 3, art: 3 }, { id: 'beacon', name: '接驳信标', x: 20, y: 11, art: 4 }, { id: 'fire', name: '通道短路', x: 14, y: 7, art: 5 }];
export const TASKS = {
  seal: { role: 'engineer', name: '封住泄漏', target: 'seal', duration: 3.5 }, reactor: { role: 'engineer', name: '修复动力核心', target: 'reactor', duration: 5 }, beacon: { role: 'engineer', name: '修复接驳信标', target: 'beacon', duration: 3.5 }, fire: { role: 'engineer', name: '处理通道短路', target: 'fire', duration: 3 },
  isolate: { role: 'dispatcher', name: '隔离故障电路', target: 'console', duration: 1 }, connect: { role: 'dispatcher', name: '恢复站内供电', target: 'console', duration: 1 }, vent: { role: 'dispatcher', name: '启动循环通风', target: 'console', duration: 1 }, evacuate: { role: 'dispatcher', name: '安排伤员撤离', target: 'console', duration: 1.5 }, board: { role: 'dispatcher', name: '全员登船', target: 'console', duration: 1 }
};
const clone = value => structuredClone(value), key = (x, y) => `${x},${y}`, inside = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < COLS && y < ROWS;
const floor = new Set(); for (const r of ROOMS) for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) floor.add(key(x, y)); for (let x = 1; x < 24; x++) for (const y of [7, 8]) floor.add(key(x, y));
export const isFloor = (x, y) => floor.has(key(x, y));
export function walkable(w, x, y) { return isFloor(x, y) && !EQUIPMENT.some(e => e.id !== 'fire' && e.x === x && e.y === y) && !(w.fire && y === 7 && [14, 15].includes(x)); }
export function route(w, from, goal) {
  const start = [Math.round(from[0]), Math.round(from[1])], dest = [Math.round(goal[0]), Math.round(goal[1])]; if (!inside(...start) || !walkable(w, ...dest)) return null;
  const queue = [start], parents = new Map([[key(...start), null]]); let found = false;
  for (let i = 0; i < queue.length; i++) { const p = queue[i]; if (p[0] === dest[0] && p[1] === dest[1]) { found = true; break; } for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const n = [p[0] + dx, p[1] + dy], k = key(...n); if (walkable(w, ...n) && !parents.has(k)) { parents.set(k, key(...p)); queue.push(n); } } }
  if (!found) return null; const path = []; let k = key(...dest); while (k !== null) { path.unshift(k.split(',').map(Number)); k = parents.get(k); } return path;
}
export function task(w, id) {
  if (TASKS[id]) return TASKS[id]; const match = /^care([0-3])$/.exec(id), patient = match && w.patients[Number(match[1])];
  return patient ? { role: 'medic', name: patient.stable ? `治疗${patient.name}` : `稳住${patient.name}`, target: id, duration: patient.stable ? 4.5 : 2.8 } : null;
}
export function target(w, id) { if (id.startsWith('care')) { const p = w.patients[Number(id.slice(4))]; return p ? { id, x: p.x, y: p.y, name: p.name } : null; } return EQUIPMENT.find(e => e.id === id) || null; }
export const powered = w => w.reactor && w.bus && !w.isolated;
function log(w, role, message) { w.log.push({ time: w.time, role, message }); if (w.log.length > 18) w.log.shift(); w.message = message; w.messageTime = 5; }
function agent(id, x, y) { return { id, x, y, path: [], index: 0, job: null, progress: 0, duration: 0, goal: null, state: 'idle', boarded: false }; }
export function createShift(scenario = 'standard') {
  scenario = scenario === 'pressure' ? 'pressure' : 'standard';
  const places = [[14, 3], [3, 10], [18, 10], [6, 11]], names = ['陈述', '闻夏', '许舟', '方青'], count = scenario === 'pressure' ? 4 : 3;
  const w = { version: VERSION, scenario, phase: 'playing', paused: true, time: 0, limit: scenario === 'pressure' ? 150 : 210, oxygen: scenario === 'pressure' ? 72 : 82, kits: count, isolated: false, bus: true, reactor: false, leak: true, ventilation: false, beacon: false, fire: false, fireResolved: false, fireAt: scenario === 'pressure' ? 16 : 22, eventFired: false, evacuation: false, boarding: false, crew: [agent('engineer', 4, 4), agent('medic', 12, 4), agent('dispatcher', 20, 4)], patients: places.slice(0, count).map(([x, y], i) => ({ ...agent('patient' + i, x, y), name: names[i], stable: false, health: scenario === 'pressure' ? 52 : 62 })), stats: { repairs: 0, stabilized: 0, treated: 0, orders: 0 }, log: [], message: '', messageTime: 0 };
  log(w, '站点', '一轮夜班被突发故障打断：失去主供电，管段泄漏，有乘员受伤。'); return w;
}
export function reason(w, id, role) {
  const t = task(w, id); if (!t) return '没有这项任务'; if (t.role !== role) return `这项工作需要${ROLES.find(r => r.id === t.role).title}角色`; if (w.phase !== 'playing') return '本轮事件已经结束';
  if (w.boarding) return '全员正在登船';
  if (id === 'seal' && !w.leak || id === 'reactor' && w.reactor || id === 'beacon' && w.beacon || id === 'fire' && !w.fire || id === 'isolate' && w.isolated || id === 'connect' && powered(w) || id === 'vent' && w.ventilation || id === 'evacuate' && w.evacuation) return '这项工作目前不需要重复';
  if (id === 'reactor' && !w.isolated) return '先让调度隔离故障电路，再进行动力维修';
  if (id === 'connect' && !w.reactor) return '动力核心尚未修复，暂时无法恢复供电';
  if (id === 'isolate' && w.reactor) return '动力已修复，无需再次隔离';
  if (id === 'vent' && !powered(w)) return '循环通风需要站内供电';
  if (id.startsWith('care')) { const p = w.patients[Number(id.slice(4))]; if (p.boarded || p.health >= 90) return '这位乘员已经恢复'; if (!p.stable && w.kits <= 0) return '急救包已经用完'; if (p.stable && !powered(w)) return '完成治疗需要供电；先稳定其他伤员或协调恢复供电'; }
  if (id === 'evacuate') { if (!powered(w)) return '先恢复站内供电'; if (!w.beacon) return '先修复接驳信标'; if (w.oxygen < 65) return '空气状态尚不适合撤离，先封漏并启动通风'; if (w.patients.some(p => p.health < 90)) return '还有伤员未完成治疗，先让医护继续照顾他们'; }
  if (id === 'board' && (!w.evacuation || w.patients.some(p => !p.boarded))) return '等待所有乘员走到接驳舱，再安排全员登船';
  return '';
}
function shortest(w, a, t) { const choices = [[t.x - 1, t.y], [t.x + 1, t.y], [t.x, t.y - 1], [t.x, t.y + 1]].map(goal => ({ goal, path: route(w, [a.x, a.y], goal) })).filter(v => v.path); choices.sort((a, b) => a.path.length - b.path.length); return choices[0] || null; }
export function order(w, role, id) {
  const why = reason(w, id, role); if (why) return { ok: false, reason: why };
  const a = w.crew.find(a => a.id === role), t = task(w, id), spot = target(w, t.target), trip = shortest(w, a, spot); if (!trip) return { ok: false, reason: '当前没有通路，可以先处理通道短路' };
  Object.assign(a, { job: id, progress: 0, duration: t.duration, path: trip.path, index: 1, goal: trip.goal, state: trip.path.length > 1 ? 'walking' : 'working' }); w.stats.orders++; log(w, ROLES.find(r => r.id === role).title, `${ROLES.find(r => r.id === role).name}开始${t.name}。`); return { ok: true };
}
export function move(w, role, x, y) { if (w.phase !== 'playing' || w.boarding) return false; const a = w.crew.find(a => a.id === role), path = a && route(w, [a.x, a.y], [x, y]); if (!path) return false; Object.assign(a, { path, index: 1, job: null, progress: 0, duration: 0, goal: [x, y], state: path.length > 1 ? 'walking' : 'idle' }); return true; }
function motion(w, a, dt, speed) {
  if (a.state === 'waiting' && !a.path.length) { const path = a.goal && route(w, [a.x, a.y], a.goal); if (!path) return false; a.path = path; a.index = 1; }
  if (a.index >= a.path.length) return true;
  let next = a.path[a.index];
  if (!walkable(w, ...next)) { const path = route(w, [a.x, a.y], a.goal); if (!path) { a.state = 'waiting'; return false; } a.path = path; a.index = 1; next = path[1]; if (!next) return true; }
  const dx = next[0] - a.x, dy = next[1] - a.y, distance = Math.hypot(dx, dy), step = speed * dt;
  if (distance <= step) { a.x = next[0]; a.y = next[1]; a.index++; } else { a.x += dx / distance * step; a.y += dy / distance * step; }
  return a.index >= a.path.length;
}
const patientDocks = [[17, 11], [18, 11], [21, 11], [22, 11]], crewDocks = [[17, 10], [18, 10], [19, 10]];
function startTrip(w, a, goal) { const path = route(w, [a.x, a.y], goal); Object.assign(a, { path: path || [], index: 1, goal, job: null, progress: 0, duration: 0, state: path ? 'walking' : 'waiting' }); }
function finish(w, a) {
  const id = a.job, t = task(w, id); if (id === 'isolate') { w.isolated = true; w.bus = false; } else if (id === 'connect') { w.bus = true; w.isolated = false; } else if (id === 'vent') w.ventilation = true;
  else if (id === 'seal') { w.leak = false; w.stats.repairs++; } else if (id === 'reactor') { w.reactor = true; w.stats.repairs++; } else if (id === 'beacon') { w.beacon = true; w.stats.repairs++; } else if (id === 'fire') { w.fire = false; w.fireResolved = true; w.stats.repairs++; }
  else if (id.startsWith('care')) { const p = w.patients[Number(id.slice(4))]; if (!p.stable) { p.stable = true; p.health = Math.max(p.health, 65); w.kits--; w.stats.stabilized++; } else { p.health = 100; w.stats.treated++; } }
  else if (id === 'evacuate') { w.evacuation = true; w.patients.forEach((p, i) => startTrip(w, p, patientDocks[i])); }
  log(w, ROLES.find(r => r.id === a.id).title, `${t.name}完成。`); Object.assign(a, { job: null, progress: 0, duration: 0, state: 'idle', path: [], index: 0, goal: null });
  if (id === 'board') { w.boarding = true; w.crew.forEach((p, i) => startTrip(w, p, crewDocks[i])); }
}
function update(w, dt) {
  w.time += dt; w.messageTime = Math.max(0, w.messageTime - dt);
  if (!w.eventFired && w.time >= w.fireAt) { w.eventFired = true; w.fire = true; log(w, '站点', '主通道发生短路。人员会绕行，工程可以处理故障。'); }
  w.oxygen = Math.max(0, Math.min(100, w.oxygen + dt * (w.leak ? -.32 : powered(w) && w.ventilation ? .9 : -.04)));
  for (const p of w.patients) { if (!p.stable) p.health = Math.max(0, p.health - dt * (w.oxygen < 65 ? .9 : .2)); if (w.evacuation && !p.boarded) { if (p.state === 'waiting') startTrip(w, p, patientDocks[w.patients.indexOf(p)]); if (motion(w, p, dt, 1.8)) { p.boarded = true; p.state = 'boarded'; log(w, '乘员', `${p.name}已经抵达接驳舱。`); } } }
  for (const a of w.crew) {
    if (a.boarded) continue;
    if (a.state === 'walking' || a.state === 'waiting') { if (!motion(w, a, dt, 3)) continue; a.state = w.boarding ? 'boarded' : a.job ? 'working' : 'idle'; if (w.boarding) { a.boarded = true; continue; } }
    if (a.state === 'working') {
      const why = reason(w, a.job, a.id); if (why) { log(w, ROLES.find(r => r.id === a.id).title, why); Object.assign(a, { job: null, state: 'idle', progress: 0, duration: 0 }); continue; }
      a.progress += dt; if (a.progress + 1e-7 >= a.duration) finish(w, a);
    }
  }
  if (w.boarding && w.crew.every(a => a.boarded) && w.patients.every(p => p.boarded)) { w.phase = 'won'; w.paused = true; log(w, '站点', '所有乘员与值守人员已登船。这轮夜班由三种职责共同完成。'); }
  else if (w.time >= w.limit || w.oxygen <= 0 || w.patients.some(p => p.health <= 0)) { w.phase = 'lost'; w.paused = true; log(w, '站点', w.time >= w.limit ? '撤离窗口已经关闭，调整职责顺序后可以重试。' : '乘员或空气状态恶化，这次救援未能完成。'); }
}
export function advance(w, seconds) { if (w.paused || w.phase !== 'playing') return; let left = Math.max(0, Math.min(.5, seconds)); while (left > 1e-8 && w.phase === 'playing') { const dt = Math.min(.025, left); update(w, dt); left -= dt; } }
export function demonstration(w) {
  if (w.paused || w.phase !== 'playing' || w.boarding) return;
  const tryRole = (role, candidates) => { const a = w.crew.find(a => a.id === role); if (a.job || a.state === 'walking') return; for (const id of candidates) if (!reason(w, id, role) && order(w, role, id).ok) return; };
  tryRole('dispatcher', ['isolate', 'connect', 'vent', 'evacuate', 'board']);
  tryRole('engineer', ['seal', 'reactor', 'fire', 'beacon']);
  const care = w.patients.map((p, i) => ({ p, id: 'care' + i })).sort((a, b) => Number(a.p.stable) - Number(b.p.stable)); tryRole('medic', care.map(c => c.id));
}
export function tasksFor(w, role) { return role === 'medic' ? w.patients.map((p, i) => 'care' + i) : Object.keys(TASKS).filter(id => TASKS[id].role === role); }
export function status(w) { if (w.phase === 'won') return '全员已安全登船。可以查看每种职责怎样帮助了其他人。'; if (w.phase === 'lost') return w.message; if (w.boarding) return '乘员已经抵达，三位值守人员正在登船。'; if (w.evacuation) return '健康乘员正在沿真实通道走向接驳舱。'; if (!w.isolated && !w.reactor) return '调度先隔离电路，工程封漏并修复动力；医护可以同时稳定伤员。'; if (!powered(w)) return '动力修好后，让调度恢复供电，医疗与通风才能工作。'; if (w.patients.some(p => p.health < 90)) return '医护继续治疗；工程修复信标，调度维持空气状态。'; return '准备就绪，让调度安排伤员撤离，再等待全员登船。'; }
export function encode(w) { return JSON.stringify({ ...w, paused: true }); }
export function restore(text) {
  try {
    if (typeof text !== 'string' || text.length > 40000) return null; const w = JSON.parse(text), number = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    if (!w || w.version !== VERSION || !['standard', 'pressure'].includes(w.scenario) || !['playing', 'won', 'lost'].includes(w.phase) || !number(w.time, 0, 211) || w.limit !== (w.scenario === 'pressure' ? 150 : 210) || w.fireAt !== (w.scenario === 'pressure' ? 16 : 22) || !number(w.oxygen, 0, 100) || !Number.isInteger(w.kits) || w.kits < 0 || w.kits > 4 || ['isolated', 'bus', 'reactor', 'leak', 'ventilation', 'beacon', 'fire', 'fireResolved', 'eventFired', 'evacuation', 'boarding'].some(k => typeof w[k] !== 'boolean') || w.isolated && w.bus || w.fire && (!w.eventFired || w.fireResolved)) return null;
    if (!Array.isArray(w.crew) || w.crew.length !== 3 || !Array.isArray(w.patients) || w.patients.length !== (w.scenario === 'pressure' ? 4 : 3)) return null;
    for (const [i, a] of [...w.crew, ...w.patients].entries()) {
      if (!a || a.id !== (i < 3 ? ROLES[i].id : 'patient' + (i - 3)) || !number(a.x, 0, 23) || !number(a.y, 0, 13) || !isFloor(Math.round(a.x), Math.round(a.y)) || !Array.isArray(a.path) || a.path.length > 336 || a.path.some(v => !Array.isArray(v) || v.length !== 2 || !inside(...v) || !isFloor(...v)) || !Number.isInteger(a.index) || a.index < 0 || a.index > a.path.length + 1 || !number(a.progress, 0, 6) || !number(a.duration, 0, 6) || !['idle', 'walking', 'working', 'waiting', 'boarded'].includes(a.state) || typeof a.boarded !== 'boolean' || a.goal !== null && (!Array.isArray(a.goal) || a.goal.length !== 2 || !inside(...a.goal))) return null;
      if (a.job !== null && (!task(w, a.job) || task(w, a.job).role !== a.id)) return null;
      if (i >= 3 && (typeof a.name !== 'string' || a.name.length > 12 || typeof a.stable !== 'boolean' || !number(a.health, 0, 100))) return null;
    }
    if (!w.stats || ['repairs', 'stabilized', 'treated', 'orders'].some(k => !Number.isSafeInteger(w.stats[k]) || w.stats[k] < 0) || w.kits + w.stats.stabilized !== w.patients.length || w.stats.treated > w.stats.stabilized || !Array.isArray(w.log) || w.log.length > 18 || w.log.some(e => !number(e.time, 0, w.time) || typeof e.role !== 'string' || e.role.length > 12 || typeof e.message !== 'string' || e.message.length > 120) || typeof w.message !== 'string' || w.message.length > 120 || !number(w.messageTime, 0, 5) || w.phase === 'won' && (!w.crew.every(a => a.boarded) || !w.patients.every(p => p.boarded))) return null;
    if (w.stats.stabilized !== w.patients.filter(p => p.stable).length || w.stats.treated !== w.patients.filter(p => p.health >= 90).length || w.stats.repairs !== Number(!w.leak) + Number(w.reactor) + Number(w.beacon) + Number(w.fireResolved) || w.ventilation && !w.reactor || w.boarding && !w.evacuation || w.evacuation && (!w.beacon || !powered(w) || w.patients.some(p => p.health < 90))) return null;
    for (const [i, a] of [...w.crew, ...w.patients].entries()) { if (a.state === 'working' && !a.job || a.boarded !== (a.state === 'boarded') || a.path.some((v, j) => j > 0 && Math.abs(v[0] - a.path[j - 1][0]) + Math.abs(v[1] - a.path[j - 1][1]) !== 1)) return null; if (a.boarded) { const dock = i < 3 ? crewDocks[i] : patientDocks[i - 3]; if (a.x !== dock[0] || a.y !== dock[1]) return null; } }
    if (w.phase === 'won' && !w.boarding) return null;
    w.paused = true; return clone(w);
  } catch { return null; }
}
