// After the Rain: an original, finite survival world. All demo actions use the same rules as a player.
const VERSION = 1, MAP_ID = 'after-the-rain-v1', SPEED = 3, REACH = 1.2, RADIUS = 0.18;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const answer = (ok, reason) => ({ ok, reason });
const clone = value => JSON.parse(JSON.stringify(value));
const terrain = Array.from({ length: 15 }, (_, y) => Array.from({ length: 21 }, (_, x) => x >= 18 ? (y === 8 ? 'bridge' : 'river') : 'grass'));
for (const [x, y] of [[2, 3], [3, 3], [4, 3], [11, 2], [12, 5], [3, 12], [4, 12], [15, 12], [16, 12]]) terrain[y][x] = 'rock';
for (const [x, y] of [[8, 5], [9, 5], [10, 5], [8, 6], [10, 6], [8, 7], [10, 7]]) terrain[y][x] = 'wall';
for (const [x, y] of [[5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [9, 9], [9, 8], [9, 7], [9, 6], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [17, 8]]) terrain[y][x] = 'path';
for (const [x, y] of [[16, 6], [17, 6], [16, 7], [17, 7], [16, 8]]) terrain[y][x] = 'mud';
export const MAP = Object.freeze({ width: 21, height: 15, terrain: Object.freeze(terrain.map(row => Object.freeze(row))) });
export const ITEMS = Object.freeze({ wood: Object.freeze({ label: '木材' }), cloth: Object.freeze({ label: '布料' }), scrap: Object.freeze({ label: '废金属' }), dirty: Object.freeze({ label: '浑水' }), clean: Object.freeze({ label: '净水' }), food: Object.freeze({ label: '食物' }) });
export const RECIPES = Object.freeze({
  shelter: Object.freeze({ label: '遮雨棚', cost: Object.freeze({ wood: 3, cloth: 2 }) }),
  fire: Object.freeze({ label: '营火', cost: Object.freeze({ wood: 2, scrap: 1 }) }),
  purifier: Object.freeze({ label: '滤水器', cost: Object.freeze({ cloth: 1, scrap: 1 }) }),
  boil: Object.freeze({ label: '烧净水', cost: Object.freeze({ dirty: 1 }), seconds: 3, fuel: 8 }),
});
const POIS = Object.freeze([
  { id: 'wood-west', kind: 'tree', label: '西侧倒木', x: 6, y: 4, loot: { wood: 9 } },
  { id: 'wood-east', kind: 'tree', label: '东侧倒木', x: 13, y: 3, loot: { wood: 9 } },
  { id: 'cabin', kind: 'cabin', label: '旧林间屋', x: 9, y: 6, loot: { cloth: 5, food: 3 } },
  { id: 'wreck', kind: 'wreck', label: '遗弃货车', x: 14, y: 9, loot: { scrap: 5, food: 1 } },
  { id: 'water', kind: 'pump', label: '河边水泵', x: 17, y: 7, loot: {} },
  { id: 'radio', kind: 'radio', label: '应急电台', x: 14, y: 4, loot: {} },
]);
const emptyInventory = () => Object.fromEntries(Object.keys(ITEMS).map(key => [key, 0]));
function writeLog(w, text) { w.log.push({ time: w.time, text }); if (w.log.length > 80) w.log.shift(); }
function record(w, kind, data = {}) { w.ledger.push({ time: w.time, kind, x: w.player.x, y: w.player.y, ...data }); }
function weatherAt(time) {
  const phase = time % 140, cycle = Math.floor(time / 140);
  const spec = phase < 25 ? ['dry', '云隙 · 干燥', 0, 36.9] : phase < 55 ? ['rain', '绵雨 · 潮湿', 0.55, 36.5] : phase < 80 ? ['storm', '风暴 · 低温', 1, 35.8] : phase < 100 ? ['night', '夜色 · 余寒', 0, 35.7] : ['dawn', '雨后 · 天明', 0, 37];
  return { id: spec[0], label: spec[1], rain: spec[2], cold: spec[3], phase, cycle };
}
function blocked(x, y) {
  const tx = Math.floor(x + 0.5), ty = Math.floor(y + 0.5);
  return tx < 0 || ty < 0 || tx >= MAP.width || ty >= MAP.height || ['rock', 'wall', 'river'].includes(MAP.terrain[ty][tx]);
}
function walkable(x, y) { return finite(x) && finite(y) && ![[0, 0], [-RADIUS, -RADIUS], [RADIUS, -RADIUS], [-RADIUS, RADIUS], [RADIUS, RADIUS]].some(([dx, dy]) => blocked(x + dx, y + dy)); }
const atCamp = w => distance(w.player, w.camp) <= REACH;
const isActiveFire = w => w.camp.fire && w.camp.fuel > 0;
const healthy = w => w.player.health >= 60 && w.player.temperature >= 35 && w.player.hydration >= 30 && w.player.hunger >= 25 && w.player.wetness <= 60;
function complete(w) {
  if (w.completedAt === null && !w.failed && w.time >= 100 && w.weather.id === 'dawn' && w.signal.sent && w.camp.shelter && isActiveFire(w) && atCamp(w) && healthy(w)) {
    w.completedAt = w.time; record(w, 'complete', { health: w.player.health, temperature: w.player.temperature, hydration: w.player.hydration, hunger: w.player.hunger, wetness: w.player.wetness }); writeLog(w, '雨停天亮。求救信号已送达，你在有火的营地守住了这一夜。世界仍可继续探索。');
  }
}
export function createWorld({ mode = 'manual' } = {}) {
  mode = mode === 'demo' ? 'demo' : 'manual';
  return {
    version: VERSION, mapId: MAP_ID, mode, running: false, time: 0,
    player: { x: 5, y: 10, heading: -Math.PI / 2, moving: false, health: 100, temperature: 37, hydration: 80, hunger: 85, wetness: 0 },
    inventory: emptyInventory(), objects: POIS.map(o => ({ ...clone(o), depleted: false, nextAt: 0 })),
    camp: { x: 5, y: 10, shelter: false, fire: false, purifier: false, fuel: 0 }, signal: { repaired: false, sent: false },
    target: null, path: [], selected: null, pending: null, weather: weatherAt(0), completedAt: null, failed: false,
    demo: { stage: 0 }, stats: { distance: 0, fuelAdded: 0, fuelBurned: 0, boilFuel: 0, waterCollected: 0, boiled: 0, drinks: 0, meals: 0 },
    ledger: [], log: [{ time: 0, text: '林间营地尚无补给。先找倒木、旧屋与货车，搭棚生火，再净水并修复电台。' }],
  };
}
export function nearestObject(w) {
  if (!w?.player || !Array.isArray(w.objects)) return null;
  const object = [...w.objects].sort((a, b) => distance(w.player, a) - distance(w.player, b))[0];
  return object ? { ...object, distance: distance(w.player, object) } : null;
}
export function targetPoint(w, x, y) {
  if (!w || !walkable(x, y)) return answer(false, '这格是河道、石块或墙面。请沿通路或桥面行走。');
  if (w.failed) return answer(false, '体力已经耗尽，请重新开始。');
  const start = [Math.floor(w.player.x + 0.5), Math.floor(w.player.y + 0.5)], goal = [Math.floor(x + 0.5), Math.floor(y + 0.5)];
  const key = (a, b) => `${a},${b}`, queue = [start], parent = new Map([[key(...start), null]]);
  let head = 0;
  while (head < queue.length && !parent.has(key(...goal))) {
    const [cx, cy] = queue[head++];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
      if (!parent.has(k) && walkable(nx, ny)) { parent.set(k, [cx, cy]); queue.push([nx, ny]); }
    }
  }
  if (!parent.has(key(...goal))) return answer(false, '那里没有可达通路。');
  const route = []; let cursor = goal;
  while (cursor) { route.push({ x: cursor[0], y: cursor[1] }); cursor = parent.get(key(...cursor)); }
  route.reverse(); if (distance(w.player, route[0]) < 0.01) route.shift();
  if (!route.length || distance(route[route.length - 1], { x, y }) > 1e-9) route.push({ x, y });
  w.target = { x, y }; w.path = route; w.selected = w.objects.find(o => distance(o, { x, y }) <= 0.45)?.id || null;
  return answer(true, '已规划可达路线；靠近地点后按 E 互动。');
}
function spend(w, cost) { for (const [item, amount] of Object.entries(cost)) w.inventory[item] -= amount; }
function shortage(w, cost) { return Object.entries(cost).filter(([item, amount]) => w.inventory[item] < amount).map(([item, amount]) => `${ITEMS[item].label}${amount - w.inventory[item]}`).join('、'); }
export function act(w, action, payload) {
  if (!w || !w.running) return answer(false, '现场已暂停，先开始或继续，再进行互动。');
  if (w.failed) return answer(false, '体力已耗尽，请重新开始。');
  if (w.pending) return answer(false, '净水正在加热，完成这三秒工序后再操作。');
  if (action === 'interact') {
    const id = typeof payload === 'string' ? payload : payload?.id;
    const object = id ? w.objects.find(o => o.id === id) : (w.objects.find(o => o.id === w.selected && distance(w.player, o) <= REACH) || w.objects.find(o => o.id === nearestObject(w)?.id));
    if (!object || distance(w.player, object) > REACH) return answer(false, '距离太远。走到地点一格左右，再按 E 互动。');
    if (object.kind === 'radio') return act(w, w.signal.repaired ? 'send' : 'repair');
    if (object.kind === 'pump') {
      if (w.time + 1e-7 < object.nextAt) return answer(false, `水泵还在回流，约 ${(object.nextAt - w.time).toFixed(1)} 秒后可再接水。`);
      w.inventory.dirty++; object.nextAt = w.time + 4; w.stats.waterCollected++; record(w, 'water'); writeLog(w, '接到一份浑水；需在燃烧的营火旁用滤水器烧净。');
      return answer(true, '获得浑水1。四秒后可以再次接水。');
    }
    if (object.depleted) return answer(false, '这里已搜尽，资源耗尽状态会随存档保留。');
    for (const [item, amount] of Object.entries(object.loot)) w.inventory[item] += amount;
    w.objects.find(o => o.id === object.id).depleted = true; record(w, 'scavenge', { id: object.id });
    const loot = Object.entries(object.loot).map(([item, amount]) => `${ITEMS[item].label}${amount}`).join('、');
    writeLog(w, `${object.label}：找到${loot}。`); return answer(true, `获得${loot}；这里的资源已经耗尽。`);
  }
  if (action === 'craft') {
    const recipe = typeof payload === 'string' ? payload : payload?.recipe;
    if (typeof recipe !== 'string' || !Object.hasOwn(RECIPES, recipe)) return answer(false, '没有这种配方。');
    if (!atCamp(w)) return answer(false, '建造与烧水需要回到营地附近。');
    if (recipe !== 'boil' && w.camp[recipe]) return answer(false, `${RECIPES[recipe].label}已经建好，无需重复消耗材料。`);
    if (recipe === 'boil' && (!isActiveFire(w) || !w.camp.purifier)) return answer(false, '需要已搭建的滤水器和燃烧中的营火。');
    if (recipe === 'boil' && w.camp.fuel < 11) return answer(false, '燃料不足：烧水消耗8秒燃料，还需留出三秒加热时间。先添柴。');
    const missing = shortage(w, RECIPES[recipe].cost); if (missing) return answer(false, `材料不足，还缺${missing}。`);
    spend(w, RECIPES[recipe].cost); record(w, 'craft', { recipe });
    if (recipe === 'boil') { w.camp.fuel -= 8; w.stats.boilFuel += 8; w.pending = { recipe: 'boil', remaining: 3 }; writeLog(w, '开始过滤并煮水：浑水1、燃料8，等待三秒。'); }
    else { w.camp[recipe] = true; writeLog(w, `${RECIPES[recipe].label}已建成。${recipe === 'fire' ? '需要添柴才能燃烧。' : ''}`); }
    return answer(true, recipe === 'boil' ? '烧水已开始，三秒后产出净水1。' : `${RECIPES[recipe].label}建成。`);
  }
  if (action === 'fuel') {
    if (!atCamp(w) || !w.camp.fire) return answer(false, '先在营地建好营火，再到火边添柴。');
    if (w.camp.fuel > 90) return answer(false, '火中木柴充足，降到90秒以下再添。');
    if (w.inventory.wood < 1) return answer(false, '没有木材可添柴，去倒木处收集。');
    w.inventory.wood--; w.camp.fuel += 45; w.stats.fuelAdded += 45; record(w, 'fuel'); writeLog(w, '添柴木材1，营火增加45秒燃料。'); return answer(true, '已添柴：木材1 → 燃料45秒。');
  }
  if (action === 'drink' || action === 'eat') {
    const item = action === 'drink' ? 'clean' : 'food';
    if (w.inventory[item] < 1) return answer(false, action === 'drink' ? '没有净水。接浑水后，回营地过滤煮沸。' : '没有食物，旧屋和货车可能有储粮。');
    w.inventory[item]--; const key = action === 'drink' ? 'hydration' : 'hunger'; w.player[key] = Math.min(100, w.player[key] + 30); w.stats[action === 'drink' ? 'drinks' : 'meals']++;
    record(w, action); writeLog(w, action === 'drink' ? '喝下一份净水，口渴缓解。' : '吃下一份储粮，饥饿缓解。'); return answer(true, `${ITEMS[item].label}消耗1，${key === 'hydration' ? '水分' : '饱腹'}恢复30。`);
  }
  if (action === 'repair' || action === 'send') {
    const radio = w.objects.find(o => o.id === 'radio');
    if (distance(w.player, radio) > REACH) return answer(false, '请走到应急电台旁，再修复或发送信号。');
    if (action === 'repair') {
      if (w.signal.repaired) return answer(false, '电台已经修好，按 E 发送求救信号。');
      const cost = { scrap: 2, cloth: 1 }, missing = shortage(w, cost); if (missing) return answer(false, `修复电台还缺${missing}。`);
      spend(w, cost); w.signal.repaired = true; record(w, 'repair'); writeLog(w, '消耗废金属2、布料1，电台恢复通电。'); return answer(true, '电台已修复。再按 E 发送求救信号。');
    }
    if (!w.signal.repaired) return answer(false, '电台还没修复，需要废金属2与布料1。');
    if (w.signal.sent) return answer(false, '求救信号已经送出，回到有火与遮雨棚的营地等待天明。');
    w.signal.sent = true; record(w, 'send'); writeLog(w, '求救信号发送成功。回营地，守住火与体温，等待雨后天明。'); return answer(true, '信号已发出；回营地守到100秒后的天明。');
  }
  return answer(false, '未知操作，请选择互动、配方、添柴、饮水或进食。');
}
function move(w, dt, input) {
  let dx = finite(input.dx) ? clamp(input.dx, -1, 1) : ((input.right || input.d) ? 1 : 0) - ((input.left || input.a) ? 1 : 0);
  let dy = finite(input.dy) ? clamp(input.dy, -1, 1) : ((input.down || input.s) ? 1 : 0) - ((input.up || input.w) ? 1 : 0);
  if (dx || dy) { w.mode = 'manual'; w.path = []; w.target = null; }
  else if (w.path.length) {
    while (w.path.length && distance(w.player, w.path[0]) < 0.001) w.path.shift();
    if (w.path.length) { dx = w.path[0].x - w.player.x; dy = w.path[0].y - w.player.y; }
    else w.target = null;
  }
  const length = Math.hypot(dx, dy); w.player.moving = false;
  if (!length || w.pending) return;
  const amount = Math.min(SPEED * dt, w.path.length ? length : SPEED * dt); dx = dx / length * amount; dy = dy / length * amount;
  const old = { x: w.player.x, y: w.player.y };
  if (walkable(w.player.x + dx, w.player.y)) w.player.x += dx;
  if (walkable(w.player.x, w.player.y + dy)) w.player.y += dy;
  const traveled = distance(old, w.player); w.stats.distance += traveled; w.player.moving = traveled > 1e-9;
  if (w.player.moving) w.player.heading = Math.atan2(dy, dx);
  if (w.path.length && distance(w.player, w.path[0]) < 0.001) w.path.shift();
  if (!w.path.length) w.target = null;
}
export function stepWorld(w, dt, input = {}) {
  if (!w || !w.running || w.failed || !finite(dt) || dt <= 0 || dt > 5 || !input || typeof input !== 'object' || Array.isArray(input)) return w;
  if (['dx', 'dy'].some(key => input[key] !== undefined && !finite(input[key])) || ['up', 'down', 'left', 'right', 'w', 'a', 's', 'd'].some(key => input[key] !== undefined && typeof input[key] !== 'boolean')) return w;
  let remaining = dt;
  while (remaining > 1e-9 && !w.failed) {
    const tick = Math.min(remaining, 0.05); remaining -= tick;
    const previousWeather = w.weather.id; w.time += tick; w.weather = weatherAt(w.time);
    if (w.weather.id !== previousWeather) writeLog(w, `天气变化：${w.weather.label}。`);
    move(w, tick, input);
    const sheltered = atCamp(w) && w.camp.shelter, warm = atCamp(w) && isActiveFire(w);
    if (w.camp.fuel > 0) { const burned = Math.min(tick, w.camp.fuel); w.camp.fuel -= burned; w.stats.fuelBurned += burned; if (w.camp.fuel < 1e-7) w.camp.fuel = 0; }
    const p = w.player;
    p.wetness = clamp(p.wetness + (warm ? -3 : sheltered ? -0.6 : w.weather.rain > 0 ? w.weather.rain : -0.12) * tick, 0, 100);
    const temperatureTarget = warm ? 37.2 : sheltered ? 36.8 : w.weather.cold - p.wetness * 0.012;
    p.temperature = clamp(p.temperature + (temperatureTarget - p.temperature) * tick * 0.08, 30, 40);
    p.hydration = clamp(p.hydration - tick * (p.moving ? 0.18 : 0.12), 0, 100); p.hunger = clamp(p.hunger - tick * (p.moving ? 0.11 : 0.075), 0, 100);
    const harm = (p.temperature < 35 ? (35 - p.temperature) * 1.5 : 0) + (p.hydration <= 0 ? 1.2 : 0) + (p.hunger <= 0 ? 0.6 : 0);
    p.health = clamp(p.health - harm * tick, 0, 100);
    if (w.pending) {
      w.pending.remaining = Math.max(0, w.pending.remaining - tick);
      if (w.pending.remaining <= 1e-7) { w.pending = null; w.inventory.clean++; w.stats.boiled++; record(w, 'boiled'); writeLog(w, '三秒加热完成，获得净水1。'); }
    }
    if (p.health <= 0) { w.failed = true; w.running = false; p.moving = false; w.target = null; w.path = []; writeLog(w, '体力耗尽。重新开始，再安排补给与遮雨路线。'); }
    complete(w);
  }
  return w;
}
const DEMO_ROUTE = ['wood-west', 'cabin', 'wreck', 'water', 'radio', 'wood-east', 'camp'];
// Planning only: the controller calls stepWorld exactly once after this function.
export function demoStep(w, _dt) {
  if (!w || !w.running || w.failed || w.mode !== 'demo' || w.pending) return w;
  if (w.completedAt !== null) return w;
  const stage = w.demo.stage;
  if (stage < DEMO_ROUTE.length) {
    const id = DEMO_ROUTE[stage], object = id === 'camp' ? w.camp : w.objects.find(o => o.id === id);
    if (distance(w.player, object) > 0.08) { if (!w.path.length) targetPoint(w, object.x, object.y); return w; }
    if (id === 'camp') { w.demo.stage++; return w; }
    if (id === 'radio') { if (!w.signal.repaired) act(w, 'repair'); else if (!w.signal.sent) act(w, 'send'); else w.demo.stage++; }
    else { const done = id === 'water' ? w.stats.waterCollected > 0 : object.depleted; if (done) w.demo.stage++; else act(w, 'interact', id); }
    return w;
  }
  if (!w.camp.shelter) act(w, 'craft', 'shelter');
  else if (!w.camp.fire) act(w, 'craft', 'fire');
  else if (!w.camp.purifier) act(w, 'craft', 'purifier');
  else if (w.camp.fuel < 14 && w.inventory.wood > 0) act(w, 'fuel');
  else if (w.stats.boiled === 0 && w.inventory.dirty > 0) act(w, 'craft', 'boil');
  else if (w.inventory.clean > 0 && w.stats.drinks === 0) act(w, 'drink');
  else if (w.inventory.food > 0 && w.stats.meals === 0) act(w, 'eat');
  return w;
}
export function objective(w) {
  if (w.failed) return '体力已耗尽。重新开始，准备遮雨棚、净水与火。';
  if (w.completedAt !== null) return '雨后余生已达成。天明记录保留，世界继续开放。';
  if (!w.camp.shelter) return '搜寻倒木与旧屋：木材3 + 布料2，在营地搭遮雨棚。';
  if (!w.camp.fire) return '收集木材2 + 废金属1，在营地搭营火，再添一份木材。';
  if (!isActiveFire(w)) return '营火熄灭了。回营地添柴：木材1可燃烧45秒。';
  if (!w.camp.purifier) return '用布料1 + 废金属1搭滤水器，接浑水并烧净。';
  if (!w.signal.repaired) return '带废金属2 + 布料1去电台，按 E 修复。';
  if (!w.signal.sent) return '电台已修好：走近后再按 E，发送求救信号。';
  if (!atCamp(w)) return '信号已发出。回到有棚、有火的营地等待天明。';
  if (w.weather.id !== 'dawn') return `守住火与身体状态，等待${w.time < 100 ? '' : '下一次'}天明：还需${Math.ceil(w.weather.phase < 100 ? 100 - w.weather.phase : 240 - w.weather.phase)}秒。`;
  return '天明已到。保持体温35℃、水分30、饱腹25、健康60以上，营地有棚且火在燃烧。';
}
export function serializeWorld(w) { return JSON.stringify(w); }
function validWorld(w) {
  const number = (n, min = 0, max = Infinity) => finite(n) && n >= min && n <= max;
  const bool = n => typeof n === 'boolean';
  if (!w || w.version !== VERSION || w.mapId !== MAP_ID || !['manual', 'demo'].includes(w.mode) || !bool(w.running) || !number(w.time)) return false;
  const p = w.player;
  if (!p || !walkable(p.x, p.y) || !number(p.heading, -Math.PI, Math.PI) || !bool(p.moving) || !number(p.health, 0, 100) || !number(p.temperature, 30, 40) || !number(p.hydration, 0, 100) || !number(p.hunger, 0, 100) || !number(p.wetness, 0, 100)) return false;
  // Conservative reachability bounds reject impossible instant refills, heat or death.
  const earliestColdHarm = Math.log(5) / 0.08, coldTime = Math.max(0, w.time - earliestColdHarm);
  const coldHarm = 1.5 * (0.5 * coldTime - (2.5 / 0.08) * (Math.exp(-0.08 * earliestColdHarm) - Math.exp(-0.08 * Math.max(w.time, earliestColdHarm))));
  const minimumHealth = Math.max(0, 100 - coldHarm - 1.2 * Math.max(0, w.time - 80 / 0.18) - 0.6 * Math.max(0, w.time - 85 / 0.11));
  const currentPhase = w.time % 140, maximumRain = Math.floor(w.time / 140) * 41.5 + Math.max(0, Math.min(currentPhase, 55) - 25) * 0.55 + Math.max(0, Math.min(currentPhase, 80) - 55);
  if (p.temperature > 37.2 + 0.000001 || p.temperature < 34.5 + 2.5 * Math.exp(-0.08 * w.time) - 0.02 || p.wetness > Math.min(100, maximumRain) + 0.051 || p.health < minimumHealth - 0.1) return false;
  if (!w.inventory || Object.keys(w.inventory).sort().join() !== Object.keys(ITEMS).sort().join() || Object.values(w.inventory).some(n => !Number.isSafeInteger(n) || n < 0)) return false;
  if (!Array.isArray(w.objects) || w.objects.length !== POIS.length) return false;
  for (let i = 0; i < POIS.length; i++) {
    const o = w.objects[i], base = POIS[i];
    if (!o || Object.keys(base).some(k => JSON.stringify(o[k]) !== JSON.stringify(base[k])) || !bool(o.depleted) || !number(o.nextAt) || o.nextAt > w.time + 4.000001 || (o.kind !== 'pump' && o.nextAt !== 0) || (['pump', 'radio'].includes(o.kind) && o.depleted)) return false;
  }
  const c = w.camp, s = w.signal;
  if (!c || c.x !== 5 || c.y !== 10 || !bool(c.shelter) || !bool(c.fire) || !bool(c.purifier) || !number(c.fuel, 0, 135) || (!c.fire && c.fuel !== 0) || !s || !bool(s.repaired) || !bool(s.sent) || (s.sent && !s.repaired)) return false;
  if (!bool(w.failed) || w.failed !== (p.health === 0) || (w.failed && w.running) || !w.demo || !Number.isInteger(w.demo.stage) || w.demo.stage < 0 || w.demo.stage > DEMO_ROUTE.length) return false;
  if (w.completedAt !== null && (!number(w.completedAt, 100, w.time) || !c.shelter || !c.fire || !s.sent)) return false;
  if (JSON.stringify(w.weather) !== JSON.stringify(weatherAt(w.time))) return false;
  if (!Array.isArray(w.path) || w.path.length > MAP.width * MAP.height + 1 || w.path.some(point => !point || !walkable(point.x, point.y))) return false;
  if (w.target !== null && (!w.target || !walkable(w.target.x, w.target.y))) return false;
  if (!!w.path.length !== (w.target !== null) || (w.target && distance(w.target, w.path[w.path.length - 1]) > 0.001)) return false;
  let previousPoint = p;
  for (const point of w.path) { if (distance(previousPoint, point) > 1.45) return false; previousPoint = point; }
  if (w.selected !== null && !POIS.some(o => o.id === w.selected)) return false;
  if (w.pending !== null && (!w.pending || w.pending.recipe !== 'boil' || !number(w.pending.remaining, 0.0000001, 3) || !c.purifier || !c.fire || !atCamp(w))) return false;
  if (!w.stats || Object.keys(w.stats).sort().join() !== ['distance', 'fuelAdded', 'fuelBurned', 'boilFuel', 'waterCollected', 'boiled', 'drinks', 'meals'].sort().join() || Object.values(w.stats).some(n => !number(n))) return false;
  if (w.stats.distance > w.time * SPEED + 0.001 || w.stats.fuelBurned > w.time + 0.001) return false;
  for (const key of ['waterCollected', 'boiled', 'drinks', 'meals']) if (!Number.isSafeInteger(w.stats[key])) return false;
  if (!Array.isArray(w.log) || w.log.length > 80 || !w.log.length) return false;
  let previous = -1;
  for (const entry of w.log) { if (!entry || !number(entry.time, 0, w.time) || entry.time < previous || typeof entry.text !== 'string' || !entry.text.length || entry.text.length > 400) return false; previous = entry.time; }
  if (!Array.isArray(w.ledger)) return false;
  const inv = emptyInventory(), built = { shelter: false, fire: false, purifier: false }, looted = new Set();
  let water = 0, boils = 0, drinks = 0, meals = 0, fuelAdded = 0, boilFuel = 0, repaired = false, sent = false, pendingAt = null, pendingPoint = null, waterAt = null, completedAt = null, replayFuel = 0, replayBurned = 0, replayTime = 0, lowerDistance = 0;
  let hydrationLow = 80, hydrationHigh = 80, hungerLow = 85, hungerHigh = 85;
  const depleteBody = elapsed => { hydrationLow = Math.max(0, hydrationLow - 0.18 * elapsed); hydrationHigh = Math.max(0, hydrationHigh - 0.12 * elapsed); hungerLow = Math.max(0, hungerLow - 0.11 * elapsed); hungerHigh = Math.max(0, hungerHigh - 0.075 * elapsed); };
  let replayPoint = { x: 5, y: 10 };
  previous = -1;
  for (const entry of w.ledger) {
    if (!entry || !number(entry.time, 0, w.time) || entry.time < previous || !walkable(entry.x, entry.y)) return false;
    previous = entry.time;
    const location = { x: entry.x, y: entry.y };
    const traveled = distance(replayPoint, location), elapsed = entry.time - replayTime;
    if (traveled > SPEED * elapsed + 0.00001 || (pendingAt !== null && distance(pendingPoint, location) > 0.000001)) return false;
    lowerDistance += traveled; depleteBody(elapsed);
    const burned = Math.min(replayFuel, elapsed); replayFuel -= burned; replayBurned += burned; replayTime = entry.time; replayPoint = location;
    if (pendingAt !== null && entry.kind !== 'boiled' && entry.kind !== 'complete') return false;
    if (entry.kind === 'scavenge') {
      const o = POIS.find(item => item.id === entry.id);
      if (!o || ['radio', 'pump'].includes(o.kind) || looted.has(o.id) || distance(location, o) > REACH + 0.000001) return false;
      looted.add(o.id); for (const [item, amount] of Object.entries(o.loot)) inv[item] += amount;
    } else if (entry.kind === 'water') {
      if (distance(location, POIS.find(o => o.id === 'water')) > REACH + 0.000001 || (waterAt !== null && entry.time < waterAt + 4 - 0.000001)) return false;
      inv.dirty++; water++; waterAt = entry.time;
    } else if (entry.kind === 'craft') {
      if (typeof entry.recipe !== 'string' || !Object.hasOwn(RECIPES, entry.recipe) || distance(location, c) > REACH + 0.000001 || (entry.recipe !== 'boil' && built[entry.recipe])) return false;
      if (entry.recipe === 'boil') { if (!built.fire || !built.purifier || pendingAt !== null || replayFuel < 11 - 0.000001) return false; pendingAt = entry.time; pendingPoint = location; boilFuel += 8; replayFuel -= 8; }
      else built[entry.recipe] = true;
      for (const [item, amount] of Object.entries(RECIPES[entry.recipe].cost)) inv[item] -= amount;
    } else if (entry.kind === 'boiled') {
      if (pendingAt === null || entry.time < pendingAt + 3 - 0.000001 || distance(location, c) > REACH + 0.000001) return false;
      pendingAt = null; pendingPoint = null; inv.clean++; boils++;
    } else if (entry.kind === 'fuel') {
      if (!built.fire || distance(location, c) > REACH + 0.000001 || replayFuel > 90 + 0.000001) return false; inv.wood--; fuelAdded += 45; replayFuel += 45;
    } else if (entry.kind === 'drink') { inv.clean--; drinks++; hydrationLow = Math.min(100, hydrationLow + 30); hydrationHigh = Math.min(100, hydrationHigh + 30); }
    else if (entry.kind === 'eat') { inv.food--; meals++; hungerLow = Math.min(100, hungerLow + 30); hungerHigh = Math.min(100, hungerHigh + 30); }
    else if (entry.kind === 'repair') { if (repaired || distance(location, POIS.find(o => o.id === 'radio')) > REACH + 0.000001) return false; inv.scrap -= 2; inv.cloth--; repaired = true; }
    else if (entry.kind === 'send') { if (!repaired || sent || distance(location, POIS.find(o => o.id === 'radio')) > REACH + 0.000001) return false; sent = true; }
    else if (entry.kind === 'complete') { if (completedAt !== null || entry.time < 100 || weatherAt(entry.time).id !== 'dawn' || !sent || !built.shelter || !built.fire || replayFuel <= 0 || distance(location, c) > REACH + 0.000001 || !number(entry.health, 60, 100) || !number(entry.temperature, 35, 40) || !number(entry.hydration, 30, 100) || !number(entry.hunger, 25, 100) || !number(entry.wetness, 0, 60)) return false; completedAt = entry.time; }
    else return false;
    if (Object.values(inv).some(n => n < 0)) return false;
  }
  lowerDistance += distance(replayPoint, p); depleteBody(w.time - replayTime);
  if (distance(replayPoint, p) > SPEED * (w.time - replayTime) + 0.00001 || (pendingAt !== null && distance(pendingPoint, p) > 0.000001) || w.stats.distance < lowerDistance - 0.00001 || p.hydration < hydrationLow - 0.00001 || p.hydration > hydrationHigh + 0.00001 || p.hunger < hungerLow - 0.00001 || p.hunger > hungerHigh + 0.00001) return false;
  const finalBurn = Math.min(replayFuel, w.time - replayTime); replayFuel -= finalBurn; replayBurned += finalBurn;
  if (Object.keys(inv).some(item => inv[item] !== w.inventory[item]) || Object.keys(built).some(item => built[item] !== c[item]) || w.objects.some(o => o.depleted !== looted.has(o.id)) || repaired !== s.repaired || sent !== s.sent || completedAt !== w.completedAt) return false;
  if (w.stats.waterCollected !== water || w.stats.boiled !== boils || w.stats.drinks !== drinks || w.stats.meals !== meals || w.stats.fuelAdded !== fuelAdded || w.stats.boilFuel !== boilFuel) return false;
  if (Math.abs(c.fuel - (fuelAdded - w.stats.fuelBurned - boilFuel)) > 0.00001 || Math.abs(c.fuel - replayFuel) > 0.00001 || Math.abs(w.stats.fuelBurned - replayBurned) > 0.00001) return false;
  if (w.objects.find(o => o.id === 'water').nextAt !== (waterAt === null ? 0 : waterAt + 4)) return false;
  if ((pendingAt !== null) !== (w.pending !== null) || (w.pending && Math.abs(w.pending.remaining - (3 - (w.time - pendingAt))) > 0.00001)) return false;
  return true;
}
export function restoreWorld(raw) {
  try { const w = typeof raw === 'string' ? JSON.parse(raw) : clone(raw); if (!validWorld(w)) return null; w.running = false; w.player.moving = false; return w; }
  catch { return null; }
}
