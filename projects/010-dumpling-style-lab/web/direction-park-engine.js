export const SIZE = 12, VERSION = 1, GATE = [10, 11], DAY_LENGTH = 100;
export const key = (x, y) => `${x},${y}`;
export const inside = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < SIZE && y < SIZE;
export const TOOLS = {
  road: { name: '园区步道', cost: 4, description: '游客只沿连接入口的步道行走。设施前的金色地块是入口。' },
  wheel: { name: '摩天轮', cost: 280, w: 2, h: 2, cap: 4, duration: 15, price: 8, fun: 22, description: '缓慢观景，适合喜欢舒缓体验的游客。占地 2 × 2。' },
  carousel: { name: '旋转木马', cost: 180, w: 2, h: 2, cap: 4, duration: 10, price: 6, fun: 19, description: '轻松的旋转体验，可同时接待四位游客。占地 2 × 2。' },
  coaster: { name: '过山车', cost: 360, w: 3, h: 2, cap: 4, duration: 12, price: 12, fun: 25, description: '适合喜欢刺激的游客，别让入口排队太长。占地 3 × 2。' },
  cafe: { name: '花园咖啡', cost: 100, w: 1, h: 1, cap: 2, duration: 6, price: 4, fun: 5, description: '游客饿了会寻找咖啡店，消费后恢复状态。占地 1 × 1。' },
  fountain: { name: '观景喷泉', cost: 60, w: 1, h: 1, cap: 5, duration: 5, price: 0, fun: 6, description: '短暂观赏与休憩，让园区形成不同的停留空间。占地 1 × 1。' },
  garden: { name: '林荫休憩', cost: 60, w: 1, h: 1, cap: 2, duration: 7, price: 0, fun: 5, description: '疲惫的游客可以休息，恢复精力后再继续游玩。占地 1 × 1。' },
  erase: { name: '拆除', cost: 0, description: '回收造价的 65%。入口不能拆除，拆路会影响游客通行。' },
};
export const entry = f => [f.x + Math.floor(f.w / 2), f.y + f.h];
export const facilityAt = (w, x, y) => w.facilities.find(f => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h);
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function route(w, from, to) {
  const roads = new Set(w.roads), origin = key(...from), goal = key(...to);
  if (!roads.has(origin) || !roads.has(goal)) return null;
  const queue = [from], parents = new Map([[origin, null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], pk = key(...p);
    if (pk === goal) {
      const result = []; let k = goal;
      while (k !== null) { result.unshift(k.split(',').map(Number)); k = parents.get(k); }
      return result;
    }
    for (const [dx, dy] of directions) { const next = [p[0] + dx, p[1] + dy], nk = key(...next); if (roads.has(nk) && !parents.has(nk)) { parents.set(nk, pk); queue.push(next); } }
  }
  return null;
}
export const connected = (w, f) => !!route(w, GATE, entry(f));
export function canPlace(w, type, x, y) {
  if (!inside(x, y)) return '请选择园区内的地块';
  if (w.phase === 'report') return '开放日已结束，可以调整园区后再开一天';
  if (type === 'erase') return key(x, y) === key(...GATE) ? '园区入口不能拆除' : facilityAt(w, x, y) || w.roads.includes(key(x, y)) ? '' : '这里没有设施或步道';
  const spec = TOOLS[type]; if (!spec) return '请选择一种设施';
  if (w.credits < spec.cost) return '建造预算不足，可以先接待游客积累收入';
  if (type === 'road') return facilityAt(w, x, y) ? '设施地块不能铺路' : w.roads.includes(key(x, y)) ? '这里已有步道' : '';
  if (!inside(x + spec.w - 1, y + spec.h) || key(x, y) === key(...GATE)) return '设施和前方入口都需要留在园区内';
  for (let dx = 0; dx < spec.w; dx++) for (let dy = 0; dy < spec.h; dy++) {
    if (facilityAt(w, x + dx, y + dy) || w.roads.includes(key(x + dx, y + dy))) return '占地与已有设施或步道重叠';
  }
  if (facilityAt(w, x + Math.floor(spec.w / 2), y + spec.h)) return '设施入口不能被另一座设施挡住';
  for (const f of w.facilities) { const [ex, ey] = entry(f); if (ex >= x && ex < x + spec.w && ey >= y && ey < y + spec.h) return '这里需要留给已有设施的入口'; }
  return '';
}
function detach(w, v) {
  for (const f of w.facilities) { f.queue = f.queue.filter(id => id !== v.id); f.riders = f.riders.filter(id => id !== v.id); }
  v.destination = 0; v.path = []; v.index = 0; v.wait = 0; v.state = 'idle'; v.think = .2;
}
export function place(w, type, x, y) {
  const reason = canPlace(w, type, x, y); if (reason) return { ok: false, reason };
  if (type === 'erase') {
    const f = facilityAt(w, x, y);
    if (f) {
      for (const v of w.visitors) if (v.destination === f.id) { detach(w, v); v.happiness = Math.max(0, v.happiness - 5); v.message = '换个地方吧'; v.messageTime = 3; }
      w.facilities.splice(w.facilities.indexOf(f), 1); w.credits += Math.floor(TOOLS[f.type].cost * .65);
    } else { w.roads.splice(w.roads.indexOf(key(x, y)), 1); w.credits += 2; }
  } else if (type === 'road') { w.roads.push(key(x, y)); w.credits -= TOOLS.road.cost; }
  else {
    const s = TOOLS[type]; w.facilities.push({ id: w.sequence++, type, x, y, w: s.w, h: s.h, queue: [], riders: [], remaining: 0, served: 0, earned: 0 }); w.credits -= s.cost;
  }
  return { ok: true };
}
export function createPark(layout = 'demo') {
  const w = { version: VERSION, phase: 'ready', paused: true, time: 0, credits: 1500, sequence: 1, nextGuest: 1, spawnClock: 0, roads: [key(...GATE)], facilities: [], visitors: [],
    stats: { entered: 0, departed: 0, served: 0, rides: 0, earned: 0, abandoned: 0, stranded: 0, satisfactionTotal: 0 } };
  if (layout !== 'empty') {
    const roads = [];
    for (let x = 4; x <= 10; x++) roads.push([x, 9]);
    for (let y = 9; y <= 10; y++) roads.push([10, y]);
    for (let y = 3; y <= 9; y++) roads.push([6, y]);
    for (let x = 4; x <= 6; x++) roads.push([x, 5]);
    for (let x = 6; x <= 8; x++) roads.push([x, 3]);
    roads.push([9, 8], [5, 8]);
    for (const [x, y] of roads) if (!w.roads.includes(key(x, y)) && !(layout === 'guided' && x === 6 && y === 7)) place(w, 'road', x, y);
    for (const [type, x, y] of [['wheel', 3, 3], ['carousel', 8, 6], ['coaster', 7, 1], ['cafe', 4, 8], ['fountain', 7, 8], ['garden', 5, 7]]) {
      const result = place(w, type, x, y); if (!result.ok) throw new Error(result.reason);
    }
  }
  return w;
}
export function openPark(w) { if (w.phase === 'report') return false; if (w.phase === 'ready') w.phase = 'open'; w.paused = false; return true; }
function depart(w, v) {
  w.stats.departed++; w.stats.satisfactionTotal += v.happiness;
  w.visitors.splice(w.visitors.indexOf(v), 1);
}
function setPath(v, path, destination = 0) { v.path = path; v.index = path.length > 1 ? 1 : 0; v.destination = destination; v.state = destination ? 'walking' : 'leaving'; v.wait = 0; }
function decide(w, v) {
  const from = [Math.round(v.x), Math.round(v.y)], roads = new Set(w.roads);
  if (!roads.has(key(...from))) {
    const neighbor = directions.map(([dx, dy]) => [from[0] + dx, from[1] + dy]).find(p => roads.has(key(...p)));
    if (neighbor) { v.path = [[v.x, v.y], neighbor]; v.index = 1; v.destination = -1; v.state = 'recovering'; return; }
    v.state = 'idle'; v.think = 1; v.message = '路断了'; v.messageTime = 1; return;
  }
  if (w.phase === 'closing' || v.visited.length >= 4 || v.happiness < 28) {
    const exit = route(w, from, GATE);
    if (exit) setPath(v, exit); else { v.state = 'idle'; v.think = 1; v.message = '找不到出口'; v.messageTime = 1; }
    return;
  }
  const choices = [];
  const preference = [ { wheel: 25, carousel: 12, coaster: -8 }, { wheel: 8, carousel: 25, coaster: 8 }, { wheel: -4, carousel: 8, coaster: 30 } ][v.taste];
  for (const f of w.facilities) {
    if (v.visited.includes(f.id) || f.queue.length >= 10) continue;
    const path = route(w, from, entry(f)); if (!path) continue;
    let score = 26 + (preference[f.type] || 0) - path.length * .65 - f.queue.length * 5;
    if (f.type === 'cafe') score = v.hunger - 18 - path.length * .5;
    if (f.type === 'garden') score = 64 - v.energy - path.length * .5;
    if (f.type === 'fountain') score = 8 - path.length * .4;
    choices.push({ f, path, score });
  }
  choices.sort((a, b) => b.score - a.score || a.f.id - b.f.id);
  if (choices.length) { const choice = choices[0]; setPath(v, choice.path, choice.f.id); }
  else {
    if (!v.visited.length) { v.happiness = Math.max(0, v.happiness - 18); v.message = '没有能去的设施'; v.messageTime = 4; }
    const exit = route(w, from, GATE); if (exit) setPath(v, exit); else { v.state = 'idle'; v.think = 1; }
  }
}
function arrive(w, v) {
  if (v.state === 'recovering') { v.state = 'idle'; v.destination = 0; v.think = 0; return; }
  if (v.state === 'leaving') { depart(w, v); return; }
  const f = w.facilities.find(f => f.id === v.destination);
  if (!f || !connected(w, f)) { detach(w, v); return; }
  v.state = 'queue'; v.path = []; v.index = 0; v.wait = 0;
  if (!f.queue.includes(v.id)) f.queue.push(v.id);
}
function visitors(w, dt) {
  if (w.phase === 'open') {
    w.spawnClock -= dt;
    if (w.spawnClock <= 0 && w.visitors.length < 36) {
      const id = w.nextGuest++;
      w.visitors.push({ id, x: GATE[0], y: GATE[1], taste: id % 3, skin: id % 4, state: 'idle', destination: 0, path: [], index: 0, wait: 0, think: .1, age: 0,
        hunger: 22 + id % 4 * 9, energy: 88, happiness: 62, visited: [], message: '开始逛逛', messageTime: 3 });
      w.stats.entered++; w.spawnClock = 2.6;
    }
  }
  for (const v of [...w.visitors]) {
    v.age += dt; v.hunger = Math.min(100, v.hunger + dt * .28); v.energy = Math.max(0, v.energy - dt * .25); v.messageTime = Math.max(0, v.messageTime - dt);
    if (v.hunger > 80) v.happiness = Math.max(0, v.happiness - dt * .1);
    if (v.state === 'idle') { v.think -= dt; if (v.think <= 0) decide(w, v); }
    else if (['walking', 'leaving', 'recovering'].includes(v.state)) {
      if (v.state !== 'recovering' && v.path.slice(v.index).some(p => !w.roads.includes(key(...p)))) { v.state = 'idle'; v.think = 0; continue; }
      const target = v.path[v.index]; if (!target) { arrive(w, v); continue; }
      const dx = target[0] - v.x, dy = target[1] - v.y, dist = Math.hypot(dx, dy), move = dt * 1.45;
      if (dist <= move) { [v.x, v.y] = target; v.index++; if (v.index >= v.path.length) arrive(w, v); }
      else { v.x += dx / dist * move; v.y += dy / dist * move; }
    } else if (v.state === 'queue') {
      v.wait += dt; v.happiness = Math.max(0, v.happiness - dt * .3);
      const f = w.facilities.find(f => f.id === v.destination);
      if (!f || !connected(w, f) || v.wait > 26) { if (v.wait > 26) { v.visited.push(v.destination); w.stats.abandoned++; v.message = '排队有点久'; v.messageTime = 4; } detach(w, v); }
    }
  }
}
function service(w, dt) {
  for (const f of w.facilities) {
    const spec = TOOLS[f.type]; f.queue = f.queue.filter(id => w.visitors.some(v => v.id === id && v.state === 'queue' && v.destination === f.id));
    if (f.riders.length) {
      f.remaining = Math.max(0, f.remaining - dt);
      if (f.remaining <= 0) {
        for (const id of f.riders) {
          const v = w.visitors.find(v => v.id === id); if (!v) continue;
          v.happiness = Math.min(100, v.happiness + spec.fun + (f.type === ['wheel', 'carousel', 'coaster'][v.taste] ? 6 : 0));
          if (f.type === 'cafe') v.hunger = Math.max(0, v.hunger - 60);
          if (f.type === 'garden' || f.type === 'fountain') v.energy = Math.min(100, v.energy + 35);
          v.visited.push(f.id); v.state = 'idle'; v.destination = 0; v.think = .3; v.message = f.type === 'cafe' ? '精神好多了' : f.type === 'garden' ? '歇一会真好' : '玩得很开心'; v.messageTime = 4;
          f.served++; f.earned += spec.price; w.credits += spec.price; w.stats.earned += spec.price; w.stats.served++; if (['wheel', 'carousel', 'coaster'].includes(f.type)) w.stats.rides++;
        }
        f.riders = [];
      }
    }
    if (!f.riders.length && f.queue.length && connected(w, f)) {
      f.riders = f.queue.splice(0, spec.cap); f.remaining = spec.duration;
      for (const id of f.riders) { const v = w.visitors.find(v => v.id === id); v.state = 'riding'; v.wait = 0; }
    }
  }
}
export function advance(w, seconds) {
  if (w.paused || !['open', 'closing'].includes(w.phase) || !Number.isFinite(seconds) || seconds <= 0) return;
  let left = Math.min(seconds, 1);
  while (left > .00001 && !w.paused) {
    const dt = Math.min(left, .05); left -= dt; w.time += dt;
    if (w.phase === 'open' && w.time >= DAY_LENGTH) w.phase = 'closing';
    visitors(w, dt); service(w, dt);
    if (w.phase === 'closing' && (!w.visitors.length || w.time >= DAY_LENGTH + 70)) {
      for (const v of [...w.visitors]) { v.happiness = Math.max(0, v.happiness - 15); w.stats.stranded++; depart(w, v); }
      for (const f of w.facilities) { f.queue = []; f.riders = []; f.remaining = 0; }
      w.phase = 'report'; w.paused = true;
    }
  }
}
export function satisfaction(w) {
  const total = w.stats.satisfactionTotal + w.visitors.reduce((n, v) => n + v.happiness, 0);
  return w.stats.entered ? Math.round(total / w.stats.entered) : 0;
}
export function status(w) {
  if (w.phase === 'report') return `开放日结束。接待 ${w.stats.entered} 位游客，完成 ${w.stats.rides} 次游玩，满意度 ${satisfaction(w)}%。`;
  const isolated = w.facilities.filter(f => !connected(w, f));
  if (isolated.length) return `${isolated.length} 座设施还没有接通入口。把步道连接到设施前的金色地块。`;
  if (!w.facilities.length) return '先修步道，再建一座游乐设施。每座设施前方都需要留出入口。';
  if (w.phase === 'closing') return '停止入园，游客正在完成最后的体验并离开。';
  if (w.facilities.some(f => f.queue.length >= 6)) return '有设施排队较长，可以增建同类设施分担客流。';
  return '游客会依照偏好选择设施；步道连接、排队时间与休憩空间都影响体验。';
}
export function nextDay(w) {
  if (w.phase !== 'report') return false;
  w.phase = 'ready'; w.paused = true; w.time = 0; w.spawnClock = 0; w.nextGuest = 1; w.visitors = [];
  w.stats = { entered: 0, departed: 0, served: 0, rides: 0, earned: 0, abandoned: 0, stranded: 0, satisfactionTotal: 0 };
  for (const f of w.facilities) { f.queue = []; f.riders = []; f.remaining = 0; f.served = 0; f.earned = 0; }
  return true;
}
export const encode = w => JSON.stringify({ ...w, paused: true });
export function restore(raw) {
  try {
    const w = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw), finite = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
    if (!w || w.version !== VERSION || !['ready', 'open', 'closing', 'report'].includes(w.phase) || !finite(w.time, 0, 171) || !Number.isInteger(w.credits) || !finite(w.credits, 0, 1e7) || !Number.isInteger(w.sequence) || !finite(w.sequence, 1, 1e7) || !Number.isInteger(w.nextGuest) || !finite(w.nextGuest, 1, 1000) || !finite(w.spawnClock, -10, 3)) return null;
    if (!Array.isArray(w.roads) || w.roads.length > SIZE * SIZE || !w.roads.includes(key(...GATE)) || new Set(w.roads).size !== w.roads.length || w.roads.some(p => !/^\d+,\d+$/.test(p) || !inside(...p.split(',').map(Number)))) return null;
    if (!Array.isArray(w.facilities) || w.facilities.length > 100 || !Array.isArray(w.visitors) || w.visitors.length > 36) return null;
    const occupied = new Set(w.roads), ids = new Set();
    for (const f of w.facilities) {
      const s = TOOLS[f.type]; if (!s?.w || !Number.isInteger(f.id) || !finite(f.id, 1, w.sequence - 1) || ids.has(f.id) || !inside(f.x, f.y) || f.w !== s.w || f.h !== s.h || !inside(f.x + f.w - 1, f.y + f.h) || !finite(f.remaining, 0, s.duration) || !Number.isInteger(f.served) || !finite(f.served, 0, 1e7) || !Number.isInteger(f.earned) || !finite(f.earned, 0, 1e7) || !Array.isArray(f.queue) || f.queue.length > 36 || !Array.isArray(f.riders) || f.riders.length > s.cap) return null;
      ids.add(f.id);
      for (let x = f.x; x < f.x + f.w; x++) for (let y = f.y; y < f.y + f.h; y++) { if (occupied.has(key(x, y))) return null; occupied.add(key(x, y)); }
    }
    for (const f of w.facilities) if (facilityAt(w, ...entry(f))) return null;
    const guestIds = new Set();
    for (const v of w.visitors) {
      if (!Number.isInteger(v.id) || !finite(v.id, 1, w.nextGuest - 1) || guestIds.has(v.id) || !finite(v.x, 0, SIZE - 1) || !finite(v.y, 0, SIZE - 1) || ![0, 1, 2].includes(v.taste) || ![0, 1, 2, 3].includes(v.skin) || !['idle', 'walking', 'leaving', 'recovering', 'queue', 'riding'].includes(v.state) || !Number.isInteger(v.destination) || !finite(v.destination, -1, w.sequence - 1) || !Array.isArray(v.path) || v.path.length > SIZE * SIZE || v.path.some(p => !Array.isArray(p) || p.length !== 2 || !finite(p[0], 0, SIZE - 1) || !finite(p[1], 0, SIZE - 1)) || !Number.isInteger(v.index) || !finite(v.index, 0, v.path.length) || !finite(v.wait, 0, 30) || !finite(v.think, -1, 2) || !finite(v.age, 0, 171) || !finite(v.hunger, 0, 100) || !finite(v.energy, 0, 100) || !finite(v.happiness, 0, 100) || !Array.isArray(v.visited) || v.visited.length > 144 || v.visited.some(id => !Number.isInteger(id) || !finite(id, 1, w.sequence - 1)) || !finite(v.messageTime, 0, 5) || typeof v.message !== 'string' || v.message.length > 50) return null;
      guestIds.add(v.id);
      if (['walking', 'queue', 'riding'].includes(v.state) && !ids.has(v.destination)) return null;
      if (['leaving', 'recovering'].includes(v.state) && !v.path.length) return null;
    }
    const queued = new Set();
    for (const f of w.facilities) for (const [state, list] of [['queue', f.queue], ['riding', f.riders]]) for (const id of list) {
      const v = w.visitors.find(v => v.id === id); if (!v || queued.has(id) || v.state !== state || v.destination !== f.id) return null; queued.add(id);
    }
    if (w.visitors.some(v => ['queue', 'riding'].includes(v.state) && !queued.has(v.id))) return null;
    const names = ['entered', 'departed', 'served', 'rides', 'earned', 'abandoned', 'stranded', 'satisfactionTotal'];
    if (!w.stats || !names.every(n => finite(w.stats[n], 0, 1e7)) || names.slice(0, -1).some(n => !Number.isInteger(w.stats[n])) || w.stats.entered !== w.stats.departed + w.visitors.length || w.stats.satisfactionTotal > w.stats.departed * 100) return null;
    w.paused = true; return w;
  } catch { return null; }
}
