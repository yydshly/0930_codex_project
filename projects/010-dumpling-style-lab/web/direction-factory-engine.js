export const COLS = 19, ROWS = 11, VERSION = 1;
export const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const ORES = [[6, 5], [8, 6], [15, 5]];
export const TOOLS = {
  belt: { name: '传送带', cost: 8, description: '沿箭头运送矿石或弹药' },
  mine: { name: '采矿机', cost: 50, description: '放在蓝绿色矿床上，持续开采铜矿' },
  factory: { name: '弹药工坊', cost: 90, description: '每份铜矿加工成三份弹药' },
  turret: { name: '防御炮塔', cost: 80, description: '收到弹药后，自动攻击范围内的敌人' },
  splitter: { name: '分流器', cost: 18, description: '向箭头两侧交替输出，分配到两条产线' },
  erase: { name: '拆除', cost: 0, description: '回收设施造价的 65%，核心不能拆除' },
};
export const key = (x, y) => `${x},${y}`;
export const inside = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < COLS && y >= 0 && y < ROWS;
export const paths = [2, 8].map(y => [...Array.from({ length: 15 }, (_, i) => [18 - i, y]), [4, y === 2 ? 3 : 7], [4, y === 2 ? 4 : 6], [3, y === 2 ? 4 : 6], [2, y === 2 ? 4 : 6], [2, 5]]);
const road = new Set(paths.flat().map(([x, y]) => key(x, y)));
export const isRoad = (x, y) => road.has(key(x, y));
export const isOre = (x, y) => ORES.some(p => p[0] === x && p[1] === y);
export const at = (w, x, y) => w.cells.find(c => c.x === x && c.y === y);
export function canPlace(w, type, x, y) {
  if (!inside(x, y)) return '请选择矿区内的地块';
  if (w.phase === 'won' || w.phase === 'lost') return '本轮已结束，可以重新开局';
  if (type === 'erase') return at(w, x, y)?.type === 'core' ? '指挥核心不能拆除' : at(w, x, y) ? '' : '这里没有设施';
  if (!TOOLS[type]) return '请选择设施';
  if (at(w, x, y)) return '这里已有设施，先拆除才能更换';
  if (isRoad(x, y)) return '袭击通道不能建造，请利用通道两侧';
  if (type === 'mine' && !isOre(x, y)) return '采矿机需要放在蓝绿色矿床上';
  if (type !== 'mine' && isOre(x, y)) return '矿床留给采矿机';
  if (w.credits < TOOLS[type].cost) return '建造预算不足，击退敌人可获得补给';
  return '';
}
const cell = (type, x, y, dir = 0) => ({ type, x, y, dir, queue: [], ore: 0, ammo: 0, production: 0, transfer: 0, cooldown: 0, branch: 0, aim: -Math.PI / 2 });
export function place(w, type, x, y, dir = 0) {
  const reason = canPlace(w, type, x, y);
  if (reason) return { ok: false, reason };
  if (type === 'erase') {
    const c = at(w, x, y); w.cells.splice(w.cells.indexOf(c), 1);
    w.credits += Math.floor(TOOLS[c.type].cost * .65);
  } else {
    w.cells.push(cell(type, x, y, ((dir % 4) + 4) % 4)); w.credits -= TOOLS[type].cost;
  }
  return { ok: true };
}
export function createWorld(layout = 'demo') {
  const w = { version: VERSION, phase: 'ready', paused: true, time: 0, credits: 700, health: 100, wave: 0, spawnRemaining: 0, spawnClock: 0, nextWave: 8, sequence: 1,
    cells: [cell('core', 2, 5)], enemies: [], bullets: [], packets: [], impacts: [], stats: { mined: 0, fabricated: 0, shots: 0, kills: 0, leaks: 0 } };
  if (layout !== 'empty') {
    const plan = [['mine', 6, 5, 0], ['belt', 7, 5, 0], ['factory', 8, 5, 0], ['belt', 9, 5, 0], ['belt', 10, 5, 0], ['splitter', 11, 5, 0], ['belt', 11, 4, 3], ['turret', 11, 3, 0], ['belt', 11, 6, 1], ['turret', 11, 7, 0]];
    for (const [type, x, y, dir] of plan) if (!(layout === 'guided' && x === 10 && y === 5)) place(w, type, x, y, dir);
  }
  return w;
}
export function start(w, defense = true) {
  if (w.phase === 'won' || w.phase === 'lost') return false;
  if (defense && w.phase !== 'defense') { w.phase = 'defense'; w.nextWave = 8; }
  else if (w.phase === 'ready') w.phase = 'production';
  w.paused = false; return true;
}
const capacity = c => c.type === 'factory' ? 10 : c.type === 'turret' ? 18 : 4;
const accepts = (c, item) => c && c.type !== 'core' && c.type !== 'mine' && (c.type !== 'factory' || item === 'ore') && (c.type !== 'turret' || item === 'ammo');
const contents = c => c.type === 'factory' ? c.ore : c.type === 'turret' ? c.ammo : c.queue.length;
const output = c => c.type === 'factory' ? c.ammo > 0 ? 'ammo' : null : c.type === 'turret' || c.type === 'core' ? null : c.queue[0] || null;
const deposit = (c, item) => c.type === 'factory' ? c.ore++ : c.type === 'turret' ? c.ammo++ : c.queue.push(item);
const withdraw = c => c.type === 'factory' ? c.ammo-- : c.queue.shift();
function production(w, dt) {
  for (const c of w.cells) {
    if (c.type === 'mine') {
      c.production += dt;
      if (c.production >= 1.25 && c.queue.length < 4) { c.production = 0; c.queue.push('ore'); w.stats.mined++; }
    } else if (c.type === 'factory') {
      if (c.ore > 0 && c.ammo <= 12) {
        c.production += dt;
        if (c.production >= 1.1) { c.production = 0; c.ore--; c.ammo += 3; w.stats.fabricated += 3; }
      } else c.production = 0;
    }
    c.transfer = Math.min(.34, c.transfer + dt);
  }
  const moves = [], reserved = new Map();
  for (const c of w.cells) {
    const item = output(c);
    if (!item || c.transfer < .34) continue;
    const dirs = c.type === 'splitter' ? c.branch % 2 ? [(c.dir + 1) % 4, (c.dir + 3) % 4] : [(c.dir + 3) % 4, (c.dir + 1) % 4] : [c.dir];
    for (const d of dirs) {
      const [dx, dy] = DIRECTIONS[d], dest = at(w, c.x + dx, c.y + dy);
      if (!accepts(dest, item) || contents(dest) + (reserved.get(dest) || 0) >= capacity(dest)) continue;
      moves.push({ c, dest, item }); reserved.set(dest, (reserved.get(dest) || 0) + 1); break;
    }
  }
  for (const { c, dest, item } of moves) {
    withdraw(c); deposit(dest, item); c.transfer = 0; c.branch++;
    w.packets.push({ x: c.x, y: c.y, tx: dest.x, ty: dest.y, item, age: 0 });
  }
}
function spawn(w) {
  const heavy = w.wave === 3 && w.spawnRemaining % 3 === 0;
  const lane = w.sequence % 2, path = paths[lane], hp = heavy ? 130 : 68 + w.wave * 4;
  w.enemies.push({ id: w.sequence++, lane, point: 1, x: path[0][0], y: path[0][1], hp, maxHP: hp, speed: heavy ? .62 : .83, heavy });
}
function battle(w, dt) {
  if (w.spawnRemaining > 0) {
    w.spawnClock -= dt;
    if (w.spawnClock <= 0) { spawn(w); w.spawnRemaining--; w.spawnClock = 1.75; }
  } else if (w.enemies.length === 0) {
    if (w.wave === 3) { w.phase = 'won'; w.paused = true; return; }
    w.nextWave -= dt;
    if (w.nextWave <= 0) { w.wave++; w.spawnRemaining = [0, 4, 6, 8][w.wave]; w.spawnClock = 0; w.nextWave = 6; if (w.wave > 1) w.credits += 60; }
  }
  for (const e of w.enemies) {
    const p = paths[e.lane][e.point], dx = p[0] - e.x, dy = p[1] - e.y, dist = Math.hypot(dx, dy), movement = dt * e.speed;
    if (dist <= movement) {
      [e.x, e.y] = p; e.point++;
      if (e.point === paths[e.lane].length) { e.hp = -1; w.health = Math.max(0, w.health - (e.heavy ? 22 : 14)); w.stats.leaks++; w.impacts.push({ x: 2, y: 5, age: 0, big: true }); }
    } else { e.x += dx / dist * movement; e.y += dy / dist * movement; }
  }
  for (const c of w.cells.filter(c => c.type === 'turret')) {
    c.cooldown = Math.max(0, c.cooldown - dt);
    const target = w.enemies.filter(e => e.hp > 0 && Math.hypot(c.x - e.x, c.y - e.y) < 4.5).sort((a, b) => b.point - a.point || a.hp - b.hp)[0];
    if (target) c.aim = Math.atan2(target.y - c.y, target.x - c.x);
    if (target && c.ammo > 0 && c.cooldown <= 0) {
      c.ammo--; c.cooldown = .8; w.stats.shots++; w.bullets.push({ x: c.x, y: c.y, target: target.id, age: 0 });
    }
  }
  for (const b of w.bullets) {
    b.age += dt; const e = w.enemies.find(e => e.id === b.target && e.hp > 0);
    if (!e) { b.age = 10; continue; }
    const dx = e.x - b.x, dy = e.y - b.y, distance = Math.hypot(dx, dy);
    if (distance <= dt * 12 + .1) {
      e.hp -= 38; b.age = 10; w.impacts.push({ x: e.x, y: e.y, age: 0, big: e.hp <= 0 });
      if (e.hp <= 0) { w.stats.kills++; w.credits += e.heavy ? 12 : 7; }
    } else { b.x += dx / distance * dt * 12; b.y += dy / distance * dt * 12; }
  }
  w.enemies = w.enemies.filter(e => e.hp > 0); w.bullets = w.bullets.filter(b => b.age < 3);
  if (w.health <= 0) { w.phase = 'lost'; w.paused = true; }
}
export function step(w, seconds) {
  if (w.paused || !['production', 'defense'].includes(w.phase) || !Number.isFinite(seconds) || seconds <= 0) return;
  let remaining = Math.min(seconds, 1);
  while (remaining > .00001 && !w.paused) {
    const dt = Math.min(remaining, .05); remaining -= dt; w.time += dt;
    w.packets.forEach(p => p.age += dt); w.packets = w.packets.filter(p => p.age < .34);
    w.impacts.forEach(p => p.age += dt); w.impacts = w.impacts.filter(p => p.age < .7);
    production(w, dt); if (w.phase === 'defense') battle(w, dt);
  }
}
export function diagnose(w) {
  const mine = w.cells.some(c => c.type === 'mine'), factory = w.cells.find(c => c.type === 'factory'), turrets = w.cells.filter(c => c.type === 'turret');
  if (!mine) return '先在蓝绿色矿床上放置采矿机。';
  if (!factory) return '矿石需要经过弹药工坊加工。';
  if (factory.ore === 0 && w.time > 10 && w.stats.fabricated === 0) return '矿石还没送进工坊，检查采矿机到工坊的箭头与连接。';
  if (!turrets.length) return '在袭击通道旁部署炮塔，并连接弹药产线。';
  if (w.stats.fabricated > 9 && turrets.every(c => c.ammo === 0) && w.stats.shots === 0) return '工坊已加工弹药，但还没到炮塔。检查分流器和出口箭头。';
  if (w.phase === 'production') return '产线正在备料，弹药送到炮塔后可以开始防守。';
  if (w.phase === 'won') return '三波袭击全部结束。试着改变布局，看看同样的设施还能怎样运转。';
  if (w.phase === 'lost') return '核心失守。检查炮塔覆盖范围和弹药供应，再试一次。';
  return '铜矿 → 工坊 → 弹药 → 分流器 → 两侧炮塔。你可以随时调整布局。';
}
export function encode(w) { return JSON.stringify({ ...w, paused: true, packets: [], impacts: [] }); }
export function restore(raw) {
  try {
    const w = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw);
    const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
    if (!w || w.version !== VERSION || !['ready', 'production', 'defense', 'won', 'lost'].includes(w.phase) || !Array.isArray(w.cells) || w.cells.length > COLS * ROWS) return null;
    if (!finite(w.time, 0, 1e7) || !finite(w.credits, 0, 1e7) || !finite(w.health, 0, 100) || !Number.isInteger(w.wave) || !finite(w.wave, 0, 3) || !Number.isInteger(w.spawnRemaining) || !finite(w.spawnRemaining, 0, 8) || !finite(w.spawnClock, -1, 2) || !finite(w.nextWave, -1, 8) || !Number.isInteger(w.sequence) || !finite(w.sequence, 1, 1e7)) return null;
    const seen = new Set(); let cores = 0;
    for (const c of w.cells) {
      if (!inside(c.x, c.y) || seen.has(key(c.x, c.y)) || !['core', 'mine', 'factory', 'turret', 'splitter', 'belt'].includes(c.type) || !Number.isInteger(c.dir) || !finite(c.dir, 0, 3)) return null;
      seen.add(key(c.x, c.y));
      if (c.type === 'core') { if (c.x !== 2 || c.y !== 5) return null; cores++; }
      else if (isRoad(c.x, c.y) || (c.type === 'mine' ? !isOre(c.x, c.y) : isOre(c.x, c.y))) return null;
      if (!Array.isArray(c.queue) || c.queue.length > 4 || c.queue.some(v => !['ore', 'ammo'].includes(v)) || !Number.isInteger(c.ore) || !finite(c.ore, 0, 10) || !Number.isInteger(c.ammo) || !finite(c.ammo, 0, 18) || !finite(c.production, 0, 1e7) || !finite(c.transfer, 0, .35) || !finite(c.cooldown, 0, .81) || !Number.isInteger(c.branch) || !finite(c.branch, 0, 1e7) || !finite(c.aim, -Math.PI, Math.PI)) return null;
    }
    if (cores !== 1 || !w.stats || Object.values(w.stats).some(v => !Number.isInteger(v) || !finite(v, 0, 1e7)) || !['mined', 'fabricated', 'shots', 'kills', 'leaks'].every(k => k in w.stats)) return null;
    if (!Array.isArray(w.enemies) || w.enemies.length > 18 || !Array.isArray(w.bullets) || w.bullets.length > 300) return null;
    const ids = new Set();
    for (const e of w.enemies) {
      if (!Number.isInteger(e.id) || !finite(e.id, 1, w.sequence - 1) || ids.has(e.id) || ![0, 1].includes(e.lane) || !Number.isInteger(e.point) || !finite(e.point, 1, paths[e.lane].length - 1) || !finite(e.x, 0, COLS - 1) || !finite(e.y, 0, ROWS - 1) || !finite(e.maxHP, 1, 200) || !finite(e.hp, 1, e.maxHP) || !finite(e.speed, .1, 2) || typeof e.heavy !== 'boolean') return null;
      ids.add(e.id);
    }
    for (const b of w.bullets) if (!finite(b.x, 0, COLS - 1) || !finite(b.y, 0, ROWS - 1) || !Number.isInteger(b.target) || !finite(b.target, 1, w.sequence - 1) || !finite(b.age, 0, 3)) return null;
    w.paused = true; w.packets = []; w.impacts = []; return w;
  } catch { return null; }
}
