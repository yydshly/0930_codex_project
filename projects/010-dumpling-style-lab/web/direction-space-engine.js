// Star Tide Routes: original planar space flight with real inertial navigation.
export const PORTS = Object.freeze([
  Object.freeze({ id: 'dawn', name: '曙光港', x: 0, z: 0, color: '#79d6df' }),
  Object.freeze({ id: 'forge', name: '赤砾矿站', x: 80, z: -65, color: '#efb479' }),
  Object.freeze({ id: 'verdant', name: '青湾商港', x: -80, z: -35, color: '#91d4a6' }),
]);
export const SURVEY = Object.freeze({ id: 'survey', name: '远域信标', x: 30, z: -130 });
export const PRICES = Object.freeze({ dawn: Object.freeze({ medicine: 20, ore: 24 }), forge: Object.freeze({ medicine: 60, ore: 12 }), verdant: Object.freeze({ medicine: 35, ore: 34 }) });
export const FLIGHT = Object.freeze({ maxSpeed: 22, acceleration: 10, boostMaxSpeed: 30, boostAcceleration: 14, turnRate: 1.75, brakeAcceleration: 14, fuelRate: 0.32, boostFuelRate: 0.58, dockRadius: 8, dockSpeed: 3, scanRadius: 15, scanSpeed: 4, scanSeconds: 5 });
export const REFUEL_PRICE = 1.2;
const SCHEMA = 1, INITIAL_CREDITS = 360;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const speed = ship => Math.hypot(ship.vx, ship.vz);
const result = (ok, reason) => ({ ok, reason });
const targetById = id => PORTS.find(p => p.id === id) || (id === SURVEY.id ? SURVEY : null);
const totalCargo = w => w.cargo.medicine + w.cargo.ore;
function log(w, text) { w.log.push({ time: w.time, text }); if (w.log.length > 80) w.log.shift(); }
function ledger(w, kind, data = {}) { w.ledger.push({ time: w.time, kind, ...data }); }
function complete(w) {
  if (w.phase !== 'completed' && w.courier.delivered && w.profit >= 40 && w.survey.settled) {
    w.phase = 'completed'; w.completedAt = w.time; w.completionTime = w.time; w.demoAuto = false; ledger(w, 'objective-complete', { profit: w.profit }); log(w, '运单、盈利与远域勘探均已完成。航路继续开放，自由飞行吧。');
  }
}
export function createWorld(scenario = 'courier') {
  scenario = ['courier', 'trade', 'survey'].includes(scenario) ? scenario : 'courier';
  return {
    schema: SCHEMA, mapId: 'star-tide-routes-v1', scenario,
    time: 0, paused: false, phase: 'playing', completedAt: null, completionTime: null, rescue: null, ship: { x: 0, z: 0, vx: 0, vz: 0, heading: 0, thrust: 0, boosting: false },
    docked: 'dawn', target: 'forge', autopilot: false, credits: INITIAL_CREDITS, fuel: 100,
    cargo: { medicine: 0, ore: 0 }, capacity: 6, tradeBasis: { medicine: [], ore: [] },
    courier: { accepted: false, delivered: false }, survey: { progress: 0, complete: false, settled: false }, profit: 0,
    demoAuto: scenario === 'courier', demo: { stage: 'prepare' },
    stats: { distance: 0, flightTime: 0, fuelBurned: 0, fuelPurchased: 0, buySpent: 0, sellEarned: 0, refuelSpent: 0, rescueSpent: 0, rescues: 0, buyUnits: 0, sellUnits: 0, dockings: 0, manualTakeovers: 0 },
    ledger: [], log: [{ time: 0, text: '停靠曙光港：接下两舱运输单，再购买一份医用品。' }],
  };
}
export function act(w, action, value) {
  if (!w || w.paused) return result(false, '现场已暂停，请先继续。');
  if (w.rescue) return result(false, '救援正在进行，六秒过场结束后再操作飞船。');
  if (action === 'rescue') {
    if (w.demoAuto) return result(false, '演示航程不使用救援；需要求援时请先接管。');
    if (w.docked) return result(false, '已经停靠港口，请使用港口补给。');
    if (w.fuel >= 1) return result(false, '燃料尚有一单位以上，先利用现有燃料返港。');
    const cost = Math.min(80, w.credits);
    w.credits -= cost; w.stats.rescueSpent += cost; w.stats.rescues++;
    ledger(w, 'rescue-request', { cost, fuelBefore: w.fuel });
    w.rescue = { remaining: 6 }; w.autopilot = false; w.demoAuto = false; w.target = 'dawn';
    w.ship.vx = 0; w.ship.vz = 0; w.ship.thrust = 0; w.ship.boosting = false;
    log(w, `救援已受理，支付${cost}信用点；六秒后拖回曙光港并提供20燃料。`);
    return result(true, `救援已受理，费用${cost}；船与货舱保留，等待六秒。`);
  }
  if (action === 'target') {
    const t = targetById(value); if (!t) return result(false, '没有这处航行目标。');
    w.target = t.id; return result(true, `已标记${t.name}。`);
  }
  if (action === 'autopilot') {
    if (value !== undefined && typeof value !== 'boolean') return result(false, '导航状态需要开或关。');
    const enabled = value === undefined ? !w.autopilot : value;
    if (enabled && !targetById(w.target)) return result(false, '请先选择航行目标。');
    if (enabled && w.fuel <= 0) return result(false, '燃料耗尽，无法启动导航推力。');
    if (enabled && w.docked) act(w, 'undock');
    w.autopilot = enabled;
    return result(true, enabled ? '自动导航已启动：逐帧转向、推力与制动。' : '自动导航已关闭。');
  }
  if (action === 'undock') {
    if (!w.docked) return result(false, '飞船已经在航行。');
    const port = PORTS.find(p => p.id === w.docked); w.docked = null;
    log(w, `离开${port.name}。`); return result(true, '已出港；保持方向后施加推力。');
  }
  if (action === 'dock') {
    const port = value === undefined ? (PORTS.find(p => p.id === w.target) || [...PORTS].sort((a, b) => distance(w.ship, a) - distance(w.ship, b))[0]) : PORTS.find(p => p.id === value);
    if (!port) return result(false, '信标不能泊船，请选择港口。');
    if (w.docked) return result(false, '已经停靠，请先出港。');
    if (distance(w.ship, port) >= FLIGHT.dockRadius) return result(false, '距离港口过远：需要进入八单位泊船范围。');
    if (speed(w.ship) >= FLIGHT.dockSpeed) return result(false, '速度过快：请制动到每秒三单位以下。');
    // Docking cancels the small permitted landing velocity, but never moves the ship.
    w.docked = port.id; w.autopilot = false; w.ship.vx = 0; w.ship.vz = 0; w.ship.thrust = 0; w.ship.boosting = false; w.stats.dockings++;
    log(w, `已停靠${port.name}。`); return result(true, `停靠${port.name}，可以办理任务、贸易与补给。`);
  }
  if (action === 'courier') {
    if (w.docked === 'dawn' && !w.courier.accepted) {
      if (totalCargo(w) + 2 > w.capacity) return result(false, '运单需要两舱空位。');
      w.courier.accepted = true; w.cargo.medicine += 2; ledger(w, 'courier-accept', { port: 'dawn' });
      log(w, '已装载两舱封签医用品，交付赤砾矿站可获得180信用点。'); return result(true, '运输单已接受，封签货物不可出售。');
    }
    if (w.docked === 'forge' && w.courier.accepted && !w.courier.delivered) {
      w.cargo.medicine -= 2; w.courier.delivered = true; w.credits += 180; ledger(w, 'courier-deliver', { port: 'forge', amount: 180 });
      log(w, '封签货物已交付，获得180信用点。'); complete(w); return result(true, '运单已交付，收入180信用点。');
    }
    return result(false, w.courier.delivered ? '这张运输单已完成，不会重复发放报酬。' : '在曙光港接单，在赤砾矿站交付。');
  }
  if (action === 'buy' || action === 'sell') {
    if (!w.docked) return result(false, '贸易需要先停靠港口。');
    if (!['medicine', 'ore'].includes(value)) return result(false, '市场没有这种货物。');
    const price = PRICES[w.docked][value], label = value === 'medicine' ? '医用品' : '矿石';
    if (action === 'buy') {
      if (totalCargo(w) >= w.capacity) return result(false, '货舱已满，上限为六舱。');
      if (w.credits < price) return result(false, '信用点不足，无法购买。');
      w.credits -= price; w.cargo[value]++; w.tradeBasis[value].push(price); w.stats.buySpent += price; w.stats.buyUnits++;
      ledger(w, 'buy', { port: w.docked, item: value, price }); log(w, `购买一舱${label}，支付${price}信用点。`);
      return result(true, `已购买${label}，支付${price}信用点。`);
    }
    if (!w.tradeBasis[value].length) return result(false, w.cargo[value] > 0 ? '剩余货物属于封签运单，不能出售。' : '没有可出售的这种货物。');
    const basis = w.tradeBasis[value].shift(); w.cargo[value]--; w.credits += price; w.profit += price - basis; w.stats.sellEarned += price; w.stats.sellUnits++;
    ledger(w, 'sell', { port: w.docked, item: value, price, basis }); log(w, `出售一舱${label}，收入${price}；该笔利润${price - basis}。`);
    complete(w); return result(true, `收入${price}信用点，实际贸易利润${price - basis}。`);
  }
  if (action === 'refuel') {
    if (!w.docked) return result(false, '燃料补给需要先停靠港口。');
    const amount = 100 - w.fuel, cost = Math.ceil(amount * REFUEL_PRICE - 1e-9);
    if (amount < 1e-8) return result(false, '燃料已经充足。');
    if (w.credits < cost) return result(false, `补满燃料需要${cost}信用点。`);
    w.credits -= cost; w.fuel = 100; w.stats.fuelPurchased += amount; w.stats.refuelSpent += cost;
    ledger(w, 'refuel', { port: w.docked, amount, cost }); log(w, `补给${amount.toFixed(1)}燃料，支付${cost}信用点。`);
    return result(true, `燃料补满，支付${cost}信用点。`);
  }
  if (action === 'survey' || action === 'settle') {
    if (w.docked !== 'dawn') return result(false, '勘探资料需要带回曙光港结算。');
    if (!w.survey.complete) return result(false, '还没有完成远域信标五秒扫描。');
    if (w.survey.settled) return result(false, '这份勘探资料已结算，不会重复奖励。');
    w.survey.settled = true; w.credits += 150; ledger(w, 'survey-settle', { port: 'dawn', amount: 150 });
    log(w, '远域勘探资料已结算，获得150信用点。'); complete(w); return result(true, '勘探已结算，收入150信用点。');
  }
  return result(false, '没有这项飞船操作。');
}

function pilotInput(w) {
  const target = targetById(w.target);
  if (!target) { w.autopilot = false; return {}; }
  const ship = w.ship, dx = target.x - ship.x, dz = target.z - ship.z, d = Math.hypot(dx, dz), s = speed(ship);
  if (d < 3.2 && s < 0.75) {
    if (target.id !== 'survey') act(w, 'dock', target.id);
    else if (s < 0.06) { w.autopilot = false; log(w, '已抵达远域信标，保持低速并持续扫描。'); }
    return { brake: true };
  }
  const desired = Math.atan2(dx, -dz), error = wrap(desired - ship.heading);
  const turn = clamp(error / 0.35, -1, 1), desiredSpeed = Math.min(21, Math.sqrt(2 * FLIGHT.brakeAcceleration * Math.max(0, d - 2)));
  const transverse = d > 0 ? Math.abs(ship.vx * (-dz / d) + ship.vz * (dx / d)) : 0;
  const brake = s > desiredSpeed + 0.15 || (Math.abs(error) > 0.7 && s > 2) || transverse > 3;
  return { turn, thrust: !brake && Math.abs(error) < 0.25 && s < desiredSpeed - 0.15 ? 1 : 0, brake };
}
function physics(w, dt, input) {
  const ship = w.ship;
  if (w.docked) { ship.thrust = 0; ship.boosting = false; return; }
  w.stats.flightTime += dt;
  const turn = finite(input.turn) ? clamp(input.turn, -1, 1) : 0;
  const throttle = finite(input.thrust) ? clamp(input.thrust, -1, 1) : 0;
  ship.heading = wrap(ship.heading + turn * FLIGHT.turnRate * dt);
  const oldSpeed = speed(ship);
  // Boost uses a stronger engine and a higher speed cap; release keeps existing inertia.
  const requested = input.boost && throttle >= 0 ? 1 : throttle;
  const thrust = w.fuel > 0 && !input.brake ? requested : 0;
  ship.thrust = thrust; ship.boosting = Boolean(input.boost && thrust > 0);
  if (input.brake) {
    const s = speed(ship), factor = s > 0 ? Math.max(0, s - FLIGHT.brakeAcceleration * dt) / s : 0;
    ship.vx *= factor; ship.vz *= factor;
  } else if (thrust) {
    const burn = Math.min(w.fuel, Math.abs(thrust) * (ship.boosting ? FLIGHT.boostFuelRate : FLIGHT.fuelRate) * dt);
    const usable = burn / (Math.abs(thrust) * (ship.boosting ? FLIGHT.boostFuelRate : FLIGHT.fuelRate) * dt);
    w.fuel -= burn; w.stats.fuelBurned += burn;
    const acceleration = ship.boosting ? FLIGHT.boostAcceleration : FLIGHT.acceleration;
    ship.vx += Math.sin(ship.heading) * thrust * acceleration * dt * usable;
    ship.vz -= Math.cos(ship.heading) * thrust * acceleration * dt * usable;
  }
  const limit = ship.boosting ? FLIGHT.boostMaxSpeed : Math.max(FLIGHT.maxSpeed, oldSpeed);
  const s = speed(ship); if (s > limit) { ship.vx *= limit / s; ship.vz *= limit / s; }
  const dx = ship.vx * dt, dz = ship.vz * dt; ship.x += dx; ship.z += dz; w.stats.distance += Math.hypot(dx, dz);
}
export function stepWorld(w, dt, input = {}) {
  if (!w || !finite(dt) || dt < 0 || dt > 5) return result(false, '时间步长无效。');
  if (!input || typeof input !== 'object' || ['turn', 'thrust'].some(k => input[k] !== undefined && !finite(input[k])) || ['brake', 'boost', 'scan'].some(k => input[k] !== undefined && typeof input[k] !== 'boolean')) return result(false, '飞行输入无效。');
  if (w.paused || dt === 0) return result(true, w.paused ? '已暂停，航行与任务保持不变。' : objective(w));
  const manual = (finite(input.turn) && Math.abs(input.turn) > 0.001) || (finite(input.thrust) && Math.abs(input.thrust) > 0.001) || input.brake || input.boost;
  if (manual && (w.autopilot || w.demoAuto)) { w.autopilot = false; w.demoAuto = false; w.stats.manualTakeovers++; }
  const count = Math.ceil(dt / 0.04), slice = dt / count;
  for (let n = 0; n < count; n++) {
    w.time += slice;
    if (w.rescue) {
      w.rescue.remaining = Math.max(0, w.rescue.remaining - slice);
      if (w.rescue.remaining < 1e-9) {
        const added = 20 - w.fuel; w.fuel = 20; w.stats.fuelPurchased += added;
        ledger(w, 'rescue-arrive', { destination: 'dawn', fuelAdded: added });
        w.ship.x = 0; w.ship.z = 0; w.ship.vx = 0; w.ship.vz = 0; w.ship.thrust = 0; w.ship.boosting = false;
        w.docked = 'dawn'; w.rescue = null; log(w, '救援抵达曙光港：货物、任务与勘探资料保留，燃料20。');
      }
      continue;
    }
    const controls = w.autopilot ? pilotInput(w) : input;
    physics(w, slice, controls);
    if (!w.survey.complete) {
      const canScan = !w.docked && distance(w.ship, SURVEY) < FLIGHT.scanRadius && speed(w.ship) < FLIGHT.scanSpeed;
      if (input.scan && canScan) {
        w.survey.progress = Math.min(5, w.survey.progress + slice);
        if (w.survey.progress >= 5 - 1e-9) { w.survey.progress = 5; w.survey.complete = true; ledger(w, 'survey-scan', { x: w.ship.x, z: w.ship.z, speed: speed(w.ship) }); log(w, '五秒扫描完成。把勘探资料带回曙光港。'); }
      } else w.survey.progress = 0;
    }
    complete(w);
  }
  return result(true, objective(w));
}
export function demoStep(w, dt) {
  if (!w || !finite(dt) || dt < 0 || dt > 5) return result(false, '时间步长无效。');
  if (w.paused || dt === 0 || !w.demoAuto || w.phase === 'completed') return stepWorld(w, dt);
  const command = (action, value) => { const answer = act(w, action, value); if (!answer.ok) { log(w, `演示暂停行动：${answer.reason}`); w.demoAuto = false; } return answer.ok; };
  switch (w.demo.stage) {
    case 'prepare':
      if (!command('courier') || !command('buy', 'medicine') || !command('target', 'forge') || !command('autopilot', true)) break;
      w.demo.stage = 'forge'; break;
    case 'forge':
      if (w.docked === 'forge') {
        if (!command('courier') || !command('sell', 'medicine') || !command('target', 'survey') || !command('autopilot', true)) break;
        w.demo.stage = 'survey';
      }
      break;
    case 'survey':
      if (!w.autopilot && distance(w.ship, SURVEY) < 15 && speed(w.ship) < 4) w.demo.stage = 'scan';
      break;
    case 'scan':
      if (w.survey.complete) { if (command('target', 'dawn') && command('autopilot', true)) w.demo.stage = 'return'; }
      break;
    case 'return':
      if (w.docked === 'dawn') { command('survey'); w.demo.stage = 'done'; }
      break;
  }
  return stepWorld(w, dt, w.demo.stage === 'scan' ? { scan: true } : {});
}
export function objective(w) {
  if (w.rescue) return `救援拖带中：${Math.ceil(w.rescue.remaining)}秒后抵达曙光港，货舱与任务保留。`;
  if (w.phase === 'completed') return '运输、盈利40与勘探结算均已完成；可以继续自由飞行。';
  if (!w.courier.accepted) return '在曙光港接受两舱运输单，购买一舱医用品。';
  if (!w.courier.delivered) return '前往赤砾矿站停靠，交付封签医用品。';
  if (w.profit < 40) return `出售实购货物，累计贸易利润达到40；目前${w.profit}。`;
  if (!w.survey.complete) return `前往远域信标，低速持续扫描五秒；目前${w.survey.progress.toFixed(1)}秒。`;
  if (!w.survey.settled) return '把远域勘探资料带回曙光港结算。';
  return '航路目标已完成。';
}
export function serializeWorld(w) { return JSON.stringify(w); }
export function restoreWorld(data) {
  try {
    const w = typeof data === 'string' ? JSON.parse(data) : JSON.parse(JSON.stringify(data));
    if (!w || w.schema !== SCHEMA || w.mapId !== 'star-tide-routes-v1' || !['courier', 'trade', 'survey'].includes(w.scenario) || !['playing', 'completed'].includes(w.phase)) return null;
    if (!finite(w.time) || w.time < 0 || typeof w.paused !== 'boolean' || typeof w.autopilot !== 'boolean' || typeof w.demoAuto !== 'boolean' || !targetById(w.target)) return null;
    if (w.docked !== null && !PORTS.some(p => p.id === w.docked)) return null;
    const ship = w.ship;
    if (!ship || !['x', 'z', 'vx', 'vz', 'heading', 'thrust'].every(k => finite(ship[k])) || Math.abs(ship.heading) > Math.PI + 1e-8 || Math.abs(ship.thrust) > 1 || speed(ship) > FLIGHT.boostMaxSpeed + 0.000001 || typeof ship.boosting !== 'boolean') return null;
    if (w.docked && (distance(ship, targetById(w.docked)) >= 8 || speed(ship) > 1e-8 || w.autopilot)) return null;
    if (!Number.isInteger(w.credits) || w.credits < 0 || w.credits > 10000000 || !finite(w.fuel) || w.fuel < -1e-8 || w.fuel > 100.000001 || w.capacity !== 6 || !w.cargo || !['medicine', 'ore'].every(i => Number.isInteger(w.cargo[i]) && w.cargo[i] >= 0) || totalCargo(w) > 6) return null;
    if (!w.courier || typeof w.courier.accepted !== 'boolean' || typeof w.courier.delivered !== 'boolean' || (w.courier.delivered && !w.courier.accepted)) return null;
    if (!w.survey || !finite(w.survey.progress) || w.survey.progress < 0 || w.survey.progress > 5 || typeof w.survey.complete !== 'boolean' || typeof w.survey.settled !== 'boolean' || (w.survey.complete !== (w.survey.progress === 5)) || (w.survey.settled && !w.survey.complete)) return null;
    if (!w.stats || !['distance', 'flightTime', 'fuelBurned', 'fuelPurchased'].every(k => finite(w.stats[k]) && w.stats[k] >= 0) || !['buySpent', 'sellEarned', 'refuelSpent', 'rescueSpent', 'rescues', 'buyUnits', 'sellUnits', 'dockings', 'manualTakeovers'].every(k => Number.isSafeInteger(w.stats[k]) && w.stats[k] >= 0 && w.stats[k] <= 10000000)) return null;
    if (w.stats.flightTime > w.time + 1e-6 || w.stats.distance > w.stats.flightTime * FLIGHT.boostMaxSpeed + 1e-5 || Math.hypot(ship.x, ship.z) > w.stats.distance + 1e-5 || Math.abs(100 + w.stats.fuelPurchased - w.stats.fuelBurned - w.fuel) > 1e-5 || w.stats.fuelBurned > w.stats.flightTime * FLIGHT.boostFuelRate + 1e-5) return null;
    if (!Array.isArray(w.ledger) || w.ledger.length > 4096 || !w.tradeBasis || !Array.isArray(w.tradeBasis.medicine) || !Array.isArray(w.tradeBasis.ore)) return null;
    let credits = 360, profit = 0, accepted = false, delivered = false, scanned = false, settled = false, completed = false, completionTime = null, buys = 0, sales = 0, spent = 0, earned = 0, refuelSpent = 0, rescueSpent = 0, rescues = 0, pendingRescue = null, fuelPurchased = 0, previousTime = 0;
    const basis = { medicine: [], ore: [] };
    for (const entry of w.ledger) {
      if (!entry || !finite(entry.time) || entry.time < previousTime || entry.time > w.time) return null; previousTime = entry.time;
      if (pendingRescue && entry.kind !== 'rescue-arrive') return null;
      if (entry.kind === 'courier-accept') { if (accepted || entry.port !== 'dawn') return null; accepted = true; }
      else if (entry.kind === 'courier-deliver') { if (!accepted || delivered || entry.port !== 'forge' || entry.amount !== 180) return null; delivered = true; credits += 180; }
      else if (entry.kind === 'survey-scan') { if (scanned || !finite(entry.x) || !finite(entry.z) || distance(entry, SURVEY) >= 15 || !finite(entry.speed) || entry.speed < 0 || entry.speed >= 4 || entry.time < 5) return null; scanned = true; }
      else if (entry.kind === 'survey-settle') { if (!scanned || settled || entry.port !== 'dawn' || entry.amount !== 150) return null; settled = true; credits += 150; }
      else if (entry.kind === 'buy' || entry.kind === 'sell') {
        if (!PORTS.some(p => p.id === entry.port) || !['medicine', 'ore'].includes(entry.item) || entry.price !== PRICES[entry.port][entry.item]) return null;
        if (entry.kind === 'buy') { if (credits < entry.price) return null; basis[entry.item].push(entry.price); credits -= entry.price; spent += entry.price; buys++; }
        else { const cost = basis[entry.item].shift(); if (cost === undefined || entry.basis !== cost) return null; credits += entry.price; profit += entry.price - cost; earned += entry.price; sales++; }
      } else if (entry.kind === 'refuel') {
        if (!PORTS.some(p => p.id === entry.port) || !finite(entry.amount) || entry.amount <= 0 || entry.amount > 100 || entry.cost !== Math.ceil(entry.amount * REFUEL_PRICE - 1e-9) || credits < entry.cost) return null;
        credits -= entry.cost; refuelSpent += entry.cost; fuelPurchased += entry.amount;
      } else if (entry.kind === 'rescue-request') {
        if (!finite(entry.fuelBefore) || entry.fuelBefore < 0 || entry.fuelBefore >= 1 || entry.cost !== Math.min(80, credits)) return null;
        credits -= entry.cost; rescueSpent += entry.cost; rescues++; pendingRescue = { time: entry.time, fuelBefore: entry.fuelBefore };
      } else if (entry.kind === 'rescue-arrive') {
        if (!pendingRescue || entry.destination !== 'dawn' || entry.time - pendingRescue.time < 6 - 0.00001 || !finite(entry.fuelAdded) || Math.abs(entry.fuelAdded - (20 - pendingRescue.fuelBefore)) > 1e-6) return null;
        fuelPurchased += entry.fuelAdded; pendingRescue = null;
      } else if (entry.kind === 'objective-complete') {
        if (completed || !delivered || profit < 40 || !settled || entry.profit !== profit) return null;
        completed = true; completionTime = entry.time;
      } else return null;
      const held = basis.medicine.length + basis.ore.length + (accepted && !delivered ? 2 : 0); if (held > 6) return null;
    }
    if (credits !== w.credits || profit !== w.profit || accepted !== w.courier.accepted || delivered !== w.courier.delivered || scanned !== w.survey.complete || settled !== w.survey.settled) return null;
    if (w.cargo.medicine !== basis.medicine.length + (accepted && !delivered ? 2 : 0) || w.cargo.ore !== basis.ore.length || JSON.stringify(basis) !== JSON.stringify(w.tradeBasis)) return null;
    if (buys !== w.stats.buyUnits || sales !== w.stats.sellUnits || spent !== w.stats.buySpent || earned !== w.stats.sellEarned || refuelSpent !== w.stats.refuelSpent || rescueSpent !== w.stats.rescueSpent || rescues !== w.stats.rescues || Math.abs(fuelPurchased - w.stats.fuelPurchased) > 1e-6) return null;
    if ((w.phase === 'completed') !== completed || w.completedAt !== completionTime || w.completionTime !== completionTime || (completionTime !== null && (!finite(completionTime) || completionTime < 0 || completionTime > w.time)) || (!completed && delivered && profit >= 40 && settled)) return null;
    if (pendingRescue) {
      if (!w.rescue || !finite(w.rescue.remaining) || w.rescue.remaining <= 0 || w.rescue.remaining > 6 || Math.abs(w.rescue.remaining - (6 - (w.time - pendingRescue.time))) > 1e-5 || w.autopilot || w.demoAuto || w.docked || speed(ship) > 1e-8 || Math.abs(w.fuel - pendingRescue.fuelBefore) > 1e-6) return null;
    } else if (w.rescue !== null) return null;
    if (!w.survey.complete && w.survey.progress > 0 && !w.rescue && !(w.docked === 'dawn' && rescues > 0) && (w.docked || distance(ship, SURVEY) >= 15 || speed(ship) >= 4 || w.time < w.survey.progress)) return null;
    if (!w.demo || !['prepare', 'forge', 'survey', 'scan', 'return', 'done'].includes(w.demo.stage) || !Array.isArray(w.log) || w.log.length > 80 || !w.log.every(e => e && finite(e.time) && e.time >= 0 && e.time <= w.time && typeof e.text === 'string' && e.text.length <= 300)) return null;
    w.paused = true; return w;
  } catch { return null; }
}
