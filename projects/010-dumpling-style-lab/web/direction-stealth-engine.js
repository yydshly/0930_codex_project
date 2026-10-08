// Moonshadow Archive — original, continuous top-down stealth rules.
// Coordinates are integer tile centres; drawing and every rule use the same map.
export const COLS = 24;
export const ROWS = 16;
export const VISION_RANGE = 7;
export const VISION_HALF_ANGLE = 0.61;
export const VISION_PROXIMITY = 1.2;
export const VISION_GAIN = 195;
export const EXIT = Object.freeze({ x: 3, y: 8 });
export const ARCHIVE = Object.freeze({ x: 21, y: 3 });
export const SURFACES = Object.freeze({
  stone: { name: '石板', color: '#676778', noise: 4.7 },
  wood: { name: '木地板', color: '#766052', noise: 3.2 },
  rug: { name: '旧地毯', color: '#574e6a', noise: 1.0 },
  grass: { name: '湿草', color: '#435c55', noise: 1.25 },
  metal: { name: '金属格栅', color: '#76858d', noise: 6.4 },
});
export const SWITCHES = Object.freeze([
  { id: 'gallery-switch', x: 5, y: 8, lampId: 'gallery', name: '长廊电闸' },
  { id: 'court-switch', x: 8, y: 3, lampId: 'court', name: '庭院电闸' },
  { id: 'yard-switch', x: 20, y: 12, lampId: 'yard', name: '货院电闸' },
]);
const LAMPS = [
  { id: 'court', x: 9, y: 2, on: true, radius: 3.8 },
  { id: 'gallery', x: 12, y: 7, on: true, radius: 7 },
  { id: 'yard', x: 14, y: 12, on: true, radius: 5.5 },
];
const GUARDS = [
  { id: 'rook', name: '庭院巡夜人', x: 13, y: 2, angle: 0, patrol: [{ x: 13, y: 2 }, { x: 17, y: 2 }], patrolIndex: 1 },
  { id: 'keeper', name: '长廊守卫', x: 8, y: 6, angle: 0, patrol: [{ x: 8, y: 6 }, { x: 16, y: 6 }], patrolIndex: 1 },
  { id: 'porter', name: '货院守卫', x: 15, y: 12, angle: Math.PI, patrol: [{ x: 11, y: 12 }, { x: 16, y: 12 }], patrolIndex: 0 },
];
const STANCES = { crouch: { speed: 0.82, sound: 0.24, visible: 0.42 }, walk: { speed: 1.85, sound: 1, visible: 0.9 }, run: { speed: 3.05, sound: 1.8, visible: 1.22 } };
const SCHEMA = 1;
const MAP_ID = 'moonshadow-archive-24x16-v1';
const clone = value => JSON.parse(JSON.stringify(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const key = p => `${Math.round(p.x)},${Math.round(p.y)}`;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const point = value => value && finite(value.x) && finite(value.y);
const result = (ok, reason) => ({ ok, reason });
const cell = (x, y) => Math.round(y) * COLS + Math.round(x);
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

function makeTiles() {
  const tiles = Array(COLS * ROWS).fill('#');
  const fill = (x0, y0, x1, y1, surface) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y * COLS + x] = surface;
  };
  fill(1, 1, 5, 14, 'stone'); fill(19, 1, 22, 14, 'stone');
  fill(7, 1, 17, 4, 'stone'); fill(7, 6, 17, 9, 'stone'); fill(7, 11, 17, 14, 'wood');
  for (const x of [6, 18]) for (const y of [3, 4, 8, 12]) tiles[y * COLS + x] = 'stone';
  fill(2, 7, 4, 9, 'wood'); fill(19, 2, 22, 4, 'rug');
  fill(7, 4, 17, 4, 'rug'); fill(7, 3, 17, 3, 'grass');
  fill(7, 8, 17, 8, 'rug'); fill(10, 7, 15, 7, 'metal');
  fill(7, 11, 17, 11, 'grass'); fill(7, 14, 17, 14, 'rug');
  fill(8, 13, 18, 13, 'metal');
  for (let y = 1; y <= 3; y++) tiles[y * COLS + 11] = '#';
  for (let x = 9; x <= 17; x++) if (x !== 12) tiles[13 * COLS + x] = '#';
  tiles[13 * COLS + 18] = '#';
  return tiles;
}
const TILES = makeTiles();

function log(w, text, kind = 'info') {
  w.log.push({ time: w.time, text, kind });
  if (w.log.length > 80) w.log.shift();
}
function event(w, type, x, y, extra = {}) {
  w.events.push({ type, x, y, age: 0, lifetime: 2, ...extra });
}
function allowed(w) {
  if (!w || w.phase !== 'playing') return result(false, '这一局已经结束，请重新开始。');
  if (w.paused) return result(false, '当前已暂停，请先继续。');
  return result(true, '可以行动。');
}

export function walkable(w, x, y) {
  if (!finite(x) || !finite(y)) return false;
  const cx = Math.round(x), cy = Math.round(y);
  return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && w.tiles[cy * COLS + cx] !== '#';
}
function bodyFits(w, x, y, radius = 0.19) {
  return [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]].every(([dx, dy]) => walkable(w, x + dx, y + dy));
}
export function route(w, start, end) {
  if (!point(start) || !point(end) || !walkable(w, start.x, start.y) || !walkable(w, end.x, end.y)) return [];
  const from = cell(start.x, start.y), to = cell(end.x, end.y);
  const parents = new Int16Array(COLS * ROWS).fill(-1), queue = [from];
  parents[from] = from;
  for (let n = 0; n < queue.length && parents[to] < 0; n++) {
    const i = queue[n], x = i % COLS, y = Math.floor(i / COLS);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= COLS || yy < 0 || yy >= ROWS) continue;
      const next = yy * COLS + xx;
      if (w.tiles[next] === '#' || parents[next] >= 0) continue;
      parents[next] = i; queue.push(next);
    }
  }
  if (parents[to] < 0) return [];
  const path = [];
  for (let i = to; ; i = parents[i]) {
    path.push({ x: i % COLS, y: Math.floor(i / COLS) });
    if (i === from) break;
  }
  return path.reverse();
}
export function lineOfSight(w, a, b) {
  if (!point(a) || !point(b) || !walkable(w, a.x, a.y) || !walkable(w, b.x, b.y)) return false;
  const steps = Math.max(1, Math.ceil(distance(a, b) * 18));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!walkable(w, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}
export function visibility(w, p = w.player) {
  let light = 0.085;
  for (const lamp of w.lamps) {
    const d = distance(p, lamp);
    if (lamp.on && d < lamp.radius && lineOfSight(w, lamp, p)) light += 0.88 * (1 - d / lamp.radius);
  }
  return clamp(light, 0, 1);
}
function noise(w, x, y, kind, radius) {
  w.noises.push({ id: ++w.noiseSerial, x, y, kind, radius, age: 0, lifetime: kind === 'stone' ? 3 : 1.25, heard: [] });
  if (w.noises.length > 40) w.noises.shift();
}
function pathFor(w, actor, target) {
  const path = route(w, actor, target);
  if (path.length && distance(actor, path[0]) < 0.06) path.shift();
  actor.path = path;
}
export function goTo(w, x, y) {
  const can = allowed(w); if (!can.ok) return can;
  if (!walkable(w, x, y)) return result(false, '那里是墙，无法到达。');
  const target = { x: Math.round(x), y: Math.round(y) }, path = route(w, w.player, target);
  if (!path.length) return result(false, '没有可通行的路线。');
  if (distance(w.player, path[0]) < 0.06) path.shift();
  w.player.path = path; w.player.destination = target;
  w.stats.commands++;
  return result(true, '已沿可通行地面规划路线。');
}
export function setStance(w, stance) {
  const can = allowed(w); if (!can.ok) return can;
  if (!Object.hasOwn(STANCES, stance)) return result(false, '没有这种姿态。');
  w.player.stance = stance; w.stats.commands++;
  return result(true, stance === 'crouch' ? '蹲行：更慢、更安静、更难被看见。' : stance === 'run' ? '奔跑：更快，但脚步更响。' : '步行：速度与声音适中。');
}
export function interact(w) {
  const can = allowed(w); if (!can.ok) return can;
  const nearby = p => distance(w.player, p) <= 1.35 && lineOfSight(w, w.player, p);
  if (!w.objective && nearby(ARCHIVE)) {
    w.objective = true; w.stats.archiveCollected = true; w.stats.pickupTime = w.time;
    event(w, 'pickup', ARCHIVE.x, ARCHIVE.y); log(w, '档案封印已取得。带它返回西侧出口。', 'objective'); w.stats.commands++;
    return result(true, '取得档案封印。现在返回出口。');
  }
  if (nearby(EXIT)) {
    if (!w.objective) return result(false, '还没有取得档案封印。');
    w.phase = 'won'; w.auto = false; w.player.path = []; w.player.moving = false; w.stats.exitTime = w.time;
    event(w, 'escape', EXIT.x, EXIT.y); log(w, '已带着档案封印撤离。', 'win'); w.stats.commands++;
    return result(true, '撤离成功。');
  }
  const sw = w.switches.find(nearby);
  if (sw) {
    const lamp = w.lamps.find(l => l.id === sw.lampId); lamp.on = !lamp.on;
    w.stats.lightsToggled++; w.lampToggles[lamp.id]++; w.stats.commands++;
    event(w, 'switch', sw.x, sw.y, { on: lamp.on });
    log(w, `${sw.name}：灯光${lamp.on ? '亮起' : '熄灭'}。`, 'light');
    return result(true, `${sw.name}已${lamp.on ? '开启' : '关闭'}，实际光照已改变。`);
  }
  return result(false, '靠近电闸、档案封印或出口后再交互。');
}
export function throwStone(w, x, y) {
  const can = allowed(w); if (!can.ok) return can;
  if (!finite(x) || !finite(y) || !walkable(w, x, y)) return result(false, '石子需要落在可通行地面。');
  const target = { x: Math.round(x), y: Math.round(y) };
  if (w.stones <= 0) return result(false, '石子已经用完，本局不会自动补充。');
  if (distance(w.player, target) > 7) return result(false, '太远了，石子的投掷范围是七格。');
  // A stone cannot pass through a wall: even its flight obeys scene geometry.
  if (!lineOfSight(w, w.player, target)) return result(false, '墙挡住了投掷轨迹。');
  w.stones--; w.stats.stonesThrown++; w.stats.commands++;
  w.projectiles.push({ x: w.player.x, y: w.player.y, from: { x: w.player.x, y: w.player.y }, target, age: 0, flight: 0.42 });
  log(w, '掷出石子，落地声音会沿门洞传播。', 'stone');
  return result(true, '石子已掷出。');
}

const move = (x, y) => ({ kind: 'move', x, y });
const stance = value => ({ kind: 'stance', value });
const use = { kind: 'interact' };
export const DEMO_PLANS = Object.freeze({
  shadow: [stance('crouch'), move(3, 4), move(7, 4), move(12, 4), move(17, 4), move(19, 4), move(21, 3), use,
    { kind: 'wait', seconds: 3.5 }, move(19, 4), move(17, 4), move(12, 4), move(7, 4), move(3, 4), move(3, 8), use],
  blackout: [stance('crouch'), move(5, 8), use, move(7, 8), move(17, 8), move(19, 8), move(19, 3), move(21, 3), use,
    { kind: 'wait', seconds: 3.5 }, move(19, 3), move(19, 8), move(17, 8), move(7, 8), move(3, 8), use],
  lure: [stance('crouch'), move(5, 12), move(7, 12), { kind: 'stone', x: 8, y: 14 }, move(7, 11),
    { kind: 'guardWait', id: 'porter', y: 13.5 }, stance('walk'), move(17, 11), move(17, 12), move(19, 12),
    stance('crouch'), move(19, 3), move(21, 3), use, move(19, 3), move(19, 12),
    { kind: 'stone', x: 20, y: 14 }, move(19, 10), { kind: 'guardWait', id: 'porter', y: 13.5 }, stance('walk'),
    move(19, 12), move(17, 12), move(17, 11), move(7, 11), move(7, 12), move(5, 12), stance('crouch'), move(3, 8), use],
});

export function createStealth(mode = 'demo', plan = 'shadow') {
  mode = mode === 'manual' ? 'manual' : 'demo'; plan = Object.hasOwn(DEMO_PLANS, plan) ? plan : 'shadow';
  const w = {
    schema: SCHEMA, mapId: MAP_ID, cols: COLS, rows: ROWS, tiles: [...TILES],
    mode, plan, auto: mode === 'demo', time: 0, paused: false, phase: 'playing', objective: false, stones: 3,
    player: { ...EXIT, angle: 0, stance: 'crouch', motionStance: 'crouch', moving: false, noise: 0, exposure: 0, path: [], destination: null, stepDistance: 0 },
    lamps: clone(LAMPS), switches: clone(SWITCHES),
    guards: GUARDS.map(g => ({ ...clone(g), mode: 'patrol', awareness: 0, target: null, searchTimer: 0, path: [], lastHeard: 0, lostSight: 0 })),
    lampToggles: { court: 0, gallery: 0, yard: 0 }, noises: [], noiseSerial: 0, events: [], projectiles: [], log: [],
    demo: { step: 0, elapsed: 0, issued: false }, trace: [{ ...EXIT, time: 0 }],
    stats: { distance: 0, footsteps: 0, stonesThrown: 0, lightsToggled: 0, alerts: 0, timeInLight: 0, maxExposure: 0, investigations: 0, commands: 0, archiveCollected: false, pickupTime: null, exitTime: null },
  };
  log(w, mode === 'demo' ? '演示使用普通移动与交互，可随时接管同一现场。' : '取得东北侧档案封印，再返回西侧出口。');
  return w;
}

function demoTick(w, dt) {
  const script = DEMO_PLANS[w.plan], action = script[w.demo.step];
  if (!action) { w.auto = false; return; }
  const done = () => { w.demo.step++; w.demo.elapsed = 0; w.demo.issued = false; };
  if (action.kind === 'move') {
    if (!w.demo.issued) {
      const answer = goTo(w, action.x, action.y);
      if (!answer.ok) { log(w, answer.reason, 'error'); w.auto = false; return; }
      w.demo.issued = true;
    }
    if (!w.player.path.length && distance(w.player, action) < 0.08) done();
  } else if (action.kind === 'wait') {
    w.demo.elapsed += dt; if (w.demo.elapsed >= action.seconds) done();
  } else if (action.kind === 'guardWait') {
    w.demo.elapsed += dt;
    const g = w.guards.find(g => g.id === action.id);
    if (g.y > action.y || w.demo.elapsed > 16) done();
  } else {
    const answer = action.kind === 'stance' ? setStance(w, action.value) : action.kind === 'stone' ? throwStone(w, action.x, action.y) : interact(w);
    if (!answer.ok) { log(w, `演示行动未完成：${answer.reason}`, 'error'); w.auto = false; return; }
    done();
  }
}
function actorMove(w, actor, dt, speed) {
  if (!actor.path.length) return 0;
  let budget = dt * speed, moved = 0;
  while (budget > 0 && actor.path.length) {
    const target = actor.path[0], d = distance(actor, target);
    if (d < 0.001) { actor.path.shift(); continue; }
    const step = Math.min(d, budget), dx = (target.x - actor.x) / d * step, dy = (target.y - actor.y) / d * step;
    if (!bodyFits(w, actor.x + dx, actor.y + dy)) { actor.path = []; break; }
    actor.x += dx; actor.y += dy; budget -= step; moved += step;
    const desired = Math.atan2(dy, dx);
    actor.angle = actor === w.player ? desired : actor.angle + clamp(wrap(desired - actor.angle), -dt * 4, dt * 4);
    if (step === d) actor.path.shift();
  }
  return moved;
}
function playerTick(w, dt, input) {
  const p = w.player;
  const dx = finite(input.moveX) ? clamp(input.moveX, -1, 1) : 0, dy = finite(input.moveY) ? clamp(input.moveY, -1, 1) : 0;
  const active = Math.hypot(dx, dy) > 0.001;
  let moved = 0;
  p.motionStance = input.run && active ? 'run' : p.stance;
  const speed = STANCES[input.run && active ? 'run' : p.stance].speed;
  if (active) {
    p.path = []; p.destination = null; w.auto = false; w.mode = 'manual';
    const size = Math.max(1, Math.hypot(dx, dy)), mx = dx / size * dt * speed, my = dy / size * dt * speed;
    const old = { x: p.x, y: p.y };
    if (bodyFits(w, p.x + mx, p.y)) p.x += mx;
    if (bodyFits(w, p.x, p.y + my)) p.y += my;
    moved = distance(p, old); p.angle = Math.atan2(dy, dx);
  } else moved = actorMove(w, p, dt, speed);
  p.moving = moved > 0.00001; p.noise = Math.max(0, p.noise - dt * 1.8);
  if (moved) {
    w.stats.distance += moved; p.stepDistance += moved;
    const last = w.trace[w.trace.length - 1];
    if (key(last) !== key(p)) { w.trace.push({ x: Math.round(p.x), y: Math.round(p.y), time: w.time }); if (w.trace.length > 1024) w.trace.shift(); }
    while (p.stepDistance >= 0.72) {
      p.stepDistance -= 0.72; w.stats.footsteps++;
      const surface = SURFACES[w.tiles[cell(p.x, p.y)]];
      const radius = surface.noise * STANCES[input.run && active ? 'run' : p.stance].sound;
      p.noise = clamp(radius / 10, 0, 1); noise(w, p.x, p.y, 'footstep', radius);
    }
  }
  if (visibility(w) > 0.3) w.stats.timeInLight += dt;
}
function investigate(w, g, n) {
  g.mode = 'investigate'; g.target = { x: Math.round(n.x), y: Math.round(n.y) }; g.searchTimer = 0;
  g.awareness = Math.max(g.awareness, n.kind === 'stone' ? 18 : 10); pathFor(w, g, g.target); g.lastHeard = n.id;
  w.stats.investigations++; event(w, 'heard', g.x, g.y, { guardId: g.id });
  if (n.kind === 'stone') log(w, `${g.name}听到落石，正在查探声音来源。`, 'investigate');
}
function guardTick(w, g, dt) {
  for (const n of w.noises) {
    if (n.heard.includes(g.id) || n.age > 0.15 || g.mode === 'chase') continue;
    n.heard.push(g.id);
    if (distance(g, n) > n.radius) continue;
    const path = route(w, g, n);
    if (path.length && path.length - 1 <= n.radius) investigate(w, g, n);
  }
  if (g.mode === 'search') {
    g.searchTimer -= dt; g.angle = wrap(g.angle + dt * 0.9);
    if (g.searchTimer <= 0) { g.mode = 'return'; g.target = clone(g.patrol[g.patrolIndex]); pathFor(w, g, g.target); log(w, `${g.name}未找到目标，返回巡逻。`, 'patrol'); }
  } else {
    if (g.mode === 'patrol' && !g.path.length) { g.target = clone(g.patrol[g.patrolIndex]); pathFor(w, g, g.target); }
    actorMove(w, g, dt, g.mode === 'chase' ? 2.25 : g.mode === 'investigate' ? 1.02 : 0.69);
    if (!g.path.length) {
      if (g.mode === 'patrol') g.patrolIndex = (g.patrolIndex + 1) % g.patrol.length;
      else if (g.mode === 'investigate') { g.mode = 'search'; g.searchTimer = 9; event(w, 'search', g.x, g.y, { guardId: g.id }); }
      else if (g.mode === 'return') { g.mode = 'patrol'; g.target = null; }
    }
  }
  const d = distance(g, w.player), angle = Math.atan2(w.player.y - g.y, w.player.x - g.x);
  const seen = d <= VISION_RANGE && lineOfSight(w, g, w.player) && (d < VISION_PROXIMITY || Math.abs(wrap(angle - g.angle)) < VISION_HALF_ANGLE);
  const light = visibility(w), stanceFactor = STANCES[w.player.motionStance].visible;
  if (seen) {
    const proximity = d < 1.3 ? 0.9 : clamp(1.1 - d / 10, 0.28, 1);
    g.awareness += dt * (d < 1.15 ? 70 : VISION_GAIN * light * stanceFactor * proximity);
    g.lostSight = 0;
  } else { g.awareness -= dt * 10; g.lostSight += dt; }
  g.awareness = clamp(g.awareness, 0, 100);
  if (g.awareness >= 62 && g.mode !== 'chase') {
    g.mode = 'chase'; g.target = { x: w.player.x, y: w.player.y }; pathFor(w, g, g.target);
    w.stats.alerts++; log(w, `${g.name}确认了人影，正在追捕！`, 'alert'); event(w, 'alert', g.x, g.y);
  }
  if (g.mode === 'chase') {
    if (seen && (key(g.target || g) !== key(w.player) || !g.path.length)) { g.target = { x: w.player.x, y: w.player.y }; pathFor(w, g, g.target); }
    if (!seen && g.lostSight > 2.4 && !g.path.length) { g.mode = 'search'; g.searchTimer = 9; }
  }
  if (g.awareness >= 100 || (g.mode === 'chase' && d < 0.66)) {
    w.phase = 'lost'; w.auto = false; w.player.path = []; w.player.moving = false;
    log(w, '暴露持续累积，守卫截住了你。调整路线后再试。', 'loss');
  }
}
export function advance(w, dt, input = {}) {
  if (!w || !finite(dt) || dt < 0 || dt > 5) return result(false, '时间步长无效。');
  if (w.paused || w.phase !== 'playing' || dt === 0) return result(true, w.paused ? '已暂停，现场保持不变。' : '现场保持不变。');
  const steps = Math.ceil(dt / 0.04), step = dt / steps;
  for (let i = 0; i < steps && w.phase === 'playing'; i++) {
    w.time += step;
    if (w.auto) demoTick(w, step);
    playerTick(w, step, input);
    for (const p of w.projectiles) {
      p.age += step; const t = clamp(p.age / p.flight, 0, 1);
      p.x = p.from.x + (p.target.x - p.from.x) * t; p.y = p.from.y + (p.target.y - p.from.y) * t;
      if (p.age >= p.flight && !p.landed) { p.landed = true; noise(w, p.target.x, p.target.y, 'stone', 12); event(w, 'stone', p.target.x, p.target.y); }
    }
    w.projectiles = w.projectiles.filter(p => !p.landed);
    for (const g of w.guards) { guardTick(w, g, step); if (w.phase !== 'playing') break; }
    w.player.exposure = Math.max(...w.guards.map(g => g.awareness));
    w.stats.maxExposure = Math.max(w.stats.maxExposure, w.player.exposure);
    for (const n of w.noises) n.age += step;
    for (const e of w.events) e.age += step;
    w.noises = w.noises.filter(n => n.age < n.lifetime); w.events = w.events.filter(e => e.age < e.lifetime);
  }
  return result(true, status(w));
}
export function status(w) {
  if (w.phase === 'won') return '档案封印已安全撤离。可以换一条路线再试。';
  if (w.phase === 'lost') return '守卫截住了你。重新开始，利用阴影、灯闸与声音。';
  if (w.paused) return '现场已暂停；继续后再行动。';
  if (w.player.exposure >= 62) return '守卫正在追捕！拐过墙角，离开视线。';
  if (w.player.exposure >= 25) return '守卫开始注意人影；退入阴影，等待警觉下降。';
  return w.objective ? '档案封印已取得：返回西侧出口并交互撤离。' : '目标：取得东北档案室的封印，再返回西侧出口。';
}
export function encode(w) { return JSON.stringify({ ...w, savedAt: 'moonshadow-local-v1' }); }

export function restore(serial) {
  try {
    const s = typeof serial === 'string' ? JSON.parse(serial) : clone(serial);
    if (!s || s.schema !== SCHEMA || s.mapId !== MAP_ID || s.cols !== COLS || s.rows !== ROWS) return null;
    if (!Array.isArray(s.tiles) || s.tiles.length !== TILES.length || s.tiles.some((v, i) => v !== TILES[i])) return null;
    if (!['demo', 'manual'].includes(s.mode) || !Object.hasOwn(DEMO_PLANS, s.plan) || typeof s.auto !== 'boolean' || typeof s.paused !== 'boolean') return null;
    if (!['playing', 'won', 'lost'].includes(s.phase) || typeof s.objective !== 'boolean' || !finite(s.time) || s.time < 0 || s.time > 3600) return null;
    if (!Number.isInteger(s.stones) || s.stones < 0 || s.stones > 3 || !s.stats || !s.player) return null;
    const stats = s.stats;
    for (const f of ['distance', 'timeInLight', 'maxExposure']) if (!finite(stats[f]) || stats[f] < 0) return null;
    for (const f of ['footsteps', 'stonesThrown', 'lightsToggled', 'alerts', 'investigations', 'commands']) if (!Number.isInteger(stats[f]) || stats[f] < 0) return null;
    if (stats.distance > s.time * STANCES.run.speed + 0.01 || stats.timeInLight > s.time + 0.01 || stats.maxExposure > 100 || stats.footsteps !== Math.floor((stats.distance + 1e-6) / 0.72)) return null;
    if (stats.stonesThrown !== 3 - s.stones || stats.lightsToggled > 256 || stats.alerts > 1000 || stats.investigations > stats.footsteps * 3 + stats.stonesThrown * 3 || stats.commands > 100000) return null;
    if (stats.archiveCollected !== s.objective || (s.objective && (!finite(stats.pickupTime) || stats.pickupTime < 0 || stats.pickupTime > s.time))) return null;
    if (s.objective && stats.distance < route(s, EXIT, ARCHIVE).length - 2.4) return null;
    if (!s.objective && stats.pickupTime !== null) return null;
    const validPosition = p => point(p) && bodyFits(s, p.x, p.y);
    const validPath = list => Array.isArray(list) && list.length <= COLS * ROWS && list.every(p => validPosition(p) && Number.isInteger(p.x) && Number.isInteger(p.y)) && list.every((p, i) => i === 0 || distance(p, list[i - 1]) === 1);
    const p = s.player;
    if (!validPosition(p) || !finite(p.angle) || !Object.hasOwn(STANCES, p.stance) || !Object.hasOwn(STANCES, p.motionStance) || typeof p.moving !== 'boolean' || !validPath(p.path) || (p.path.length && distance(p, p.path[0]) > 1.5)) return null;
    if (distance(p, EXIT) > stats.distance + 0.0001) return null;
    if (!finite(p.noise) || p.noise < 0 || p.noise > 1 || !finite(p.exposure) || p.exposure < 0 || p.exposure > 100 || !finite(p.stepDistance) || p.stepDistance < 0 || p.stepDistance >= 0.72) return null;
    if (Math.abs(p.stepDistance - (stats.distance - stats.footsteps * 0.72)) > 0.0001 || (p.destination !== null && !validPosition(p.destination))) return null;
    if (!Array.isArray(s.lamps) || s.lamps.length !== LAMPS.length || !s.lampToggles) return null;
    let toggles = 0;
    for (let i = 0; i < LAMPS.length; i++) {
      const l = s.lamps[i], original = LAMPS[i], count = s.lampToggles[original.id];
      if (!l || l.id !== original.id || l.x !== original.x || l.y !== original.y || l.radius !== original.radius || typeof l.on !== 'boolean' || !Number.isInteger(count) || count < 0 || count > 256 || l.on !== (count % 2 === 0)) return null;
      toggles += count;
    }
    if (toggles !== stats.lightsToggled || JSON.stringify(s.switches) !== JSON.stringify(SWITCHES)) return null;
    if (!Array.isArray(s.guards) || s.guards.length !== GUARDS.length) return null;
    for (let i = 0; i < GUARDS.length; i++) {
      const g = s.guards[i], original = GUARDS[i];
      if (!g || g.id !== original.id || g.name !== original.name || JSON.stringify(g.patrol) !== JSON.stringify(original.patrol) || !Number.isInteger(g.patrolIndex) || g.patrolIndex < 0 || g.patrolIndex >= original.patrol.length) return null;
      if (!validPosition(g) || !finite(g.angle) || !validPath(g.path) || (g.path.length && distance(g, g.path[0]) > 1.5) || !['patrol', 'investigate', 'search', 'return', 'chase'].includes(g.mode) || !finite(g.awareness) || g.awareness < 0 || g.awareness > 100) return null;
      if (distance(g, original) > s.time * 2.25 + 0.0001) return null;
      if (!finite(g.searchTimer) || g.searchTimer < -0.1 || g.searchTimer > 9.01 || !finite(g.lostSight) || g.lostSight < 0 || g.lostSight > 3601 || !Number.isInteger(g.lastHeard) || g.lastHeard < 0 || g.lastHeard > s.noiseSerial || (g.target !== null && !validPosition(g.target))) return null;
    }
    if (Math.abs(p.exposure - Math.max(...s.guards.map(g => g.awareness))) > 0.0001 || stats.maxExposure + 0.0001 < p.exposure) return null;
    if (s.phase === 'won' && (!s.objective || distance(p, EXIT) > 1.35 || !finite(stats.exitTime) || stats.exitTime < stats.pickupTime || stats.exitTime > s.time)) return null;
    if (s.phase !== 'won' && stats.exitTime !== null) return null;
    if (s.phase === 'lost' && !s.guards.some(g => g.awareness >= 99.99 || (g.mode === 'chase' && distance(g, p) < 0.7))) return null;
    if (!Number.isInteger(s.noiseSerial) || s.noiseSerial < 0 || s.noiseSerial !== stats.footsteps + stats.stonesThrown - s.projectiles?.length) return null;
    if (!Array.isArray(s.noises) || s.noises.length > 40 || !s.noises.every(n => validPosition(n) && ['footstep', 'stone'].includes(n.kind) && Number.isInteger(n.id) && n.id > 0 && n.id <= s.noiseSerial && finite(n.radius) && n.radius > 0 && n.radius <= 12 && finite(n.age) && n.age >= 0 && n.lifetime === (n.kind === 'stone' ? 3 : 1.25) && n.age < n.lifetime && Array.isArray(n.heard) && n.heard.length <= GUARDS.length && n.heard.every(id => GUARDS.some(g => g.id === id)))) return null;
    if (!Array.isArray(s.projectiles) || s.projectiles.length > 3 || !s.projectiles.every(v => validPosition(v.from) && validPosition(v.target) && finite(v.age) && v.age >= 0 && v.age < 0.42 && v.flight === 0.42 && point(v) && lineOfSight(s, v.from, v.target) && distance(v.from, v.target) <= 7)) return null;
    if (!s.demo || !Number.isInteger(s.demo.step) || s.demo.step < 0 || s.demo.step > DEMO_PLANS[s.plan].length || !finite(s.demo.elapsed) || s.demo.elapsed < 0 || s.demo.elapsed > 60 || typeof s.demo.issued !== 'boolean') return null;
    if (!Array.isArray(s.trace) || s.trace.length > 1024 || !s.trace.every(t => validPosition(t) && finite(t.time) && t.time >= 0 && t.time <= s.time)) return null;
    if (!Array.isArray(s.log) || s.log.length > 80 || !s.log.every(l => typeof l.text === 'string' && l.text.length <= 300 && finite(l.time) && l.time >= 0 && l.time <= s.time && typeof l.kind === 'string')) return null;
    if (!Array.isArray(s.events) || s.events.length > 200 || !s.events.every(e => point(e) && finite(e.age) && e.age >= 0 && finite(e.lifetime) && e.age < e.lifetime && typeof e.type === 'string')) return null;
    s.paused = true; return s;
  } catch { return null; }
}
