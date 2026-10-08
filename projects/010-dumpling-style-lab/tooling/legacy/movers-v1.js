/* A small, original side-view moving game. Physics uses logical canvas pixels. */
const W = 960, H = 600, FLOOR = 510;
const INK = '#202945';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has = (set, ...names) => names.some(n => set?.has?.(n));
const ORDERS = [
  {
    title: '第一单 · 把新家送到', floor: 455, ramp: [657, 782],
    obstacle: { x: 505, y: 475, w: 46, h: 35 },
    cargo: [
      { id: 'parcel', type: 'box', name: '轻纸箱', x: 205, w: 44, h: 44, mass: 1 },
      { id: 'fridge', type: 'fridge', name: '大冰箱', x: 330, w: 49, h: 86, mass: 3.4 },
      { id: 'vase', type: 'fragile', name: '易碎花瓶箱', x: 420, w: 48, h: 52, mass: 1.4 },
    ],
  },
  {
    title: '第二单 · 沙发也有脾气', floor: 430, ramp: [625, 782],
    obstacle: { x: 477, y: 454, w: 77, h: 56 },
    cargo: [
      { id: 'sofa', type: 'sofa', name: '长沙发', x: 247, w: 104, h: 49, mass: 3.7 },
      { id: 'parcel', type: 'box', name: '玩具纸箱', x: 145, w: 44, h: 44, mass: 1 },
      { id: 'vase', type: 'fragile', name: '纪念花瓶箱', x: 389, w: 48, h: 52, mass: 1.4 },
    ],
  },
];

function newState(index = 0, completed = 0) {
  const o = ORDERS[index];
  return {
    version: 1, orderIndex: index, completedOrders: completed, time: 0,
    player: { x: 105, y: FLOOR, vx: 0, vy: 0, facing: 1, grounded: true, phase: 0 },
    cargo: o.cargo.map(c => ({ ...c, y: FLOOR - c.h / 2, vx: 0, vy: 0, delivered: false, broken: false, rest: 0, angle: 0 })),
    holding: null, auto: null, failed: false, orderDone: false,
    bumps: 0, throws: 0, deliveries: 0, shake: 0,
    message: '小橘开工！点一件货物走过去，靠近按 E 拿起。货车在右边。',
    journal: ['接到第一单：把三件货物完整送进货车。'], particles: [],
  };
}

export function createMoversGame({ mount, saved, onEvent = () => {} }) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.tabIndex = 0;
  canvas.className = 'game-canvas movers-canvas';
  canvas.setAttribute('aria-label', '淘气搬家公司，控制小橘搬运纸箱、冰箱与易碎家具到货车');
  canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.style.display = 'block'; canvas.style.touchAction = 'none';
  mount.append(canvas);
  const ctx = canvas.getContext('2d');
  let state = newState();
  if (saved?.version === 1 && Number.isInteger(saved.orderIndex) && saved.orderIndex >= 0 && saved.orderIndex < 2) {
    const fresh = newState(saved.orderIndex, clamp(saved.completedOrders || 0, 0, 2));
    if (saved.player && Array.isArray(saved.cargo)) {
      state = { ...fresh, ...saved, particles: [], auto: null, shake: 0 };
      state.player = { ...fresh.player, ...saved.player, x: clamp(saved.player.x || 105, 30, 921), y: clamp(saved.player.y || FLOOR, 100, FLOOR) };
      state.cargo = fresh.cargo.map(c => ({ ...c, ...(saved.cargo.find(item => item.id === c.id) || {}), vx: 0, vy: 0 }));
      state.holding = state.cargo.some(c => c.id === saved.holding && !c.broken && !c.delivered) ? saved.holding : null;
      state.journal = Array.isArray(saved.journal) ? saved.journal.slice(-8) : fresh.journal;
    }
  }

  const order = () => ORDERS[state.orderIndex];
  const held = () => state.cargo.find(c => c.id === state.holding);
  function note(message, record = false) {
    state.message = message;
    if (record && state.journal.at(-1) !== message) state.journal = [...state.journal, message].slice(-8);
  }
  function burst(x, y, word = '', color = '#ffbf45', count = 8) {
    for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: Math.cos(i * 2.4) * (50 + i * 8), vy: -90 - i * 9, age: 0, life: .65 + i * .03, color, word: i === 0 ? word : '' });
  }
  function surface(x) {
    const o = order();
    if (x >= 782 && x < 955) return o.floor;
    if (x >= o.ramp[0] && x < o.ramp[1]) return FLOOR - (FLOOR - o.floor) * (x - o.ramp[0]) / (o.ramp[1] - o.ramp[0]);
    return FLOOR;
  }
  function carryPosition() {
    const c = held(); if (!c) return;
    c.x = state.player.x + state.player.facing * (29 + c.w / 2);
    c.y = state.player.y - Math.max(45, c.h / 2 + 12);
    c.vx = c.vy = 0; c.angle = Math.sin(state.player.phase) * .028;
  }
  function take(c) {
    if (!c || c.broken || c.delivered || state.holding || state.failed || state.orderDone) return false;
    const p = state.player;
    if (Math.abs(c.x - p.x) > c.w / 2 + 52 || Math.abs(c.y + c.h / 2 - p.y) > 85) return false;
    state.holding = c.id; state.auto = null; carryPosition();
    note(c.type === 'fragile' ? '花瓶怕摔：慢慢放进货车，投掷或从高处落下会碎。' : c.mass > 3 ? `${c.name}很重，走慢了！上坡省力，跳跃要提早。` : '轻纸箱很听话，也可以按 F 抛过去试试。');
    burst(c.x, c.y - c.h / 2, '拿稳！', '#ffe362', 4); onEvent('soft'); return true;
  }
  function drop(throwIt = false) {
    const c = held(); if (!c || state.failed || state.orderDone) return;
    carryPosition(); state.holding = null; state.auto = null;
    c.x = clamp(c.x, c.w / 2 + 4, W - c.w / 2 - 5);
    c.vx = throwIt ? state.player.facing * (c.mass > 3 ? 255 : 485) : state.player.vx * .22;
    c.vy = throwIt ? -230 : 0; c.rest = 0;
    if (throwIt) {
      state.throws++; note(c.type === 'fragile' ? '糟糕！花瓶飞出去了，快看它会落在哪里……' : c.mass > 3 ? '嘿——重家具只能抛出一小段！' : '纸箱飞起来了！它会弹跳，试着预判落点。');
      burst(c.x, c.y, '嘿！', '#fff3a0', 5); onEvent('soft');
    } else note('轻轻放下。货物完整落稳在车厢里，就能装车。');
  }
  function nearestCargo() {
    const p = state.player;
    return state.cargo.filter(c => !c.delivered && !c.broken).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  }
  function interact() {
    if (state.holding) drop();
    else if (!take(nearestCargo())) note('再靠近货物一点。点击货物也能走过去拿起。');
  }
  function jump() {
    const p = state.player;
    if (!p.grounded || state.failed || state.orderDone) return;
    p.vy = held()?.mass > 3 ? -455 : -580; p.grounded = false;
    burst(p.x, p.y - 2, '', '#fff8bd', 4); onEvent('soft');
  }
  function fail(c, impact) {
    if (state.failed || c.broken) return;
    c.broken = true; state.failed = true; state.auto = null; state.holding = null; state.shake = 11;
    note('啪嚓！花瓶受到了大冲击。这一单要重新打包；把易碎物搬上坡后再轻放。', true);
    burst(c.x, c.y, '啪嚓！', '#ff6b68', 16); onEvent('bump');
  }
  function deliver(c) {
    c.delivered = true; c.vx = c.vy = 0; state.deliveries++;
    const count = state.cargo.filter(item => item.delivered).length;
    burst(c.x, c.y - c.h / 2, '到家啦！', '#fbe568', 9); onEvent('success');
    note(`${c.name}完整装车。${count < 3 ? `还差 ${3 - count} 件，加油！` : '所有货物都到了，收件人给小橘送来了一封感谢信。'}`, true);
    if (count === 3) {
      state.orderDone = true; state.completedOrders = Math.max(state.completedOrders, state.orderIndex + 1);
      state.auto = null;
      state.journal.push(state.orderIndex === 0 ? '收到感谢信：“冰箱和花瓶都好好的！下一单是一张特别长的沙发。”' : '第二家写道：“沙发终于进家门了，我们为小橘留了靠窗的位置。”');
    }
  }
  function command(id) {
    if (id === 'retry') {
      const i = state.orderIndex, complete = state.completedOrders;
      state = newState(i, complete);
      if (i === 1) { state.message = '重新打包好了。这次先看清台阶和上车坡道，易碎箱请轻放。'; state.journal = ['第二单：长沙发、玩具纸箱和纪念花瓶。']; }
      return;
    }
    if (id === 'next-order' && state.orderDone && state.orderIndex === 0) {
      state = newState(1, 1); state.message = '第二家有张长沙发！台阶更高，斜坡也变了，先规划怎么搬。'; state.journal = ['第一单完整交付，解锁了第二位客户。', '第二单：长沙发、玩具纸箱和纪念花瓶。']; onEvent('success'); return;
    }
    if (state.failed || state.orderDone) return;
    if (id === 'jump') jump();
    if (id === 'interact' || id === 'near') interact();
    if (id === 'throw') drop(true);
    if (id === 'truck' && state.holding) {
      state.auto = { x: 805, mode: 'deliver', cargoId: state.holding };
      note('小橘正搬向货车。到车厢旁边后轻轻放下。');
    }
    if (id.startsWith('cargo-')) {
      const c = state.cargo.find(item => item.id === id.slice(6));
      if (!c || c.delivered || c.broken) return;
      if (state.holding) { note('手里已经有一件了，先放下或装进货车。'); return; }
      const side = c.x >= state.player.x ? -1 : 1;
      state.auto = { x: clamp(c.x + side * (c.w / 2 + 27), 33, 920), mode: 'take', cargoId: c.id };
      note(`小橘正在走近${c.name}……`);
    }
  }

  function resolvePlayer(dt, horizontal) {
    const p = state.player, c = held(), obstacle = order().obstacle;
    const speed = c?.mass > 3 ? 142 : c?.type === 'fragile' ? 194 : 247;
    const accel = p.grounded ? 1350 : 690;
    const target = horizontal * speed;
    p.vx += clamp(target - p.vx, -accel * dt, accel * dt);
    if (Math.abs(horizontal) > .1) p.facing = horizontal > 0 ? 1 : -1;
    const oldX = p.x, oldY = p.y;
    p.x = clamp(p.x + p.vx * dt, 28, 925);
    if (p.y > obstacle.y + 5 && p.y - 61 < obstacle.y + obstacle.h && p.x + 17 > obstacle.x && p.x - 17 < obstacle.x + obstacle.w) {
      if (oldX + 17 <= obstacle.x + 2) p.x = obstacle.x - 17;
      else if (oldX - 17 >= obstacle.x + obstacle.w - 2) p.x = obstacle.x + obstacle.w + 17;
      p.vx *= .25;
      if (state.auto && p.grounded) jump();
    }
    p.vy += 1280 * dt; p.y += p.vy * dt; p.grounded = false;
    let ground = surface(p.x);
    if (p.x + 14 > obstacle.x && p.x - 14 < obstacle.x + obstacle.w && oldY <= obstacle.y + 7) ground = Math.min(ground, obstacle.y);
    const uphill = surface(oldX) - surface(p.x);
    if (p.y >= ground && (oldY <= ground + Math.max(10, uphill + 7) || p.vy >= 0)) {
      const impact = p.vy;
      p.y = ground; p.vy = 0; p.grounded = true;
      if (impact > 620 && c?.type === 'fragile') {
        fail(c, impact);
      } else if (impact > 500) { state.shake = Math.max(state.shake, 3); burst(p.x, p.y, '咚', '#f7d680', 5); }
    }
    p.phase += Math.abs(p.vx) * dt * .057;
    carryPosition();
  }
  function resolveCargo(c, dt) {
    if (c.delivered || c.broken || c.id === state.holding) return;
    const obstacle = order().obstacle;
    const oldX = c.x, oldBottom = c.y + c.h / 2;
    c.vy += 1280 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
    let impact = 0;
    if (c.x < c.w / 2 + 4 || c.x > W - c.w / 2 - 4) {
      impact = Math.abs(c.vx); c.x = clamp(c.x, c.w / 2 + 4, W - c.w / 2 - 4); c.vx *= -.24;
    }
    const bottom = c.y + c.h / 2;
    let ground = surface(c.x);
    if (c.x + c.w / 2 > obstacle.x && c.x - c.w / 2 < obstacle.x + obstacle.w) {
      if (oldBottom <= obstacle.y + 5) ground = Math.min(ground, obstacle.y);
      else if (bottom > obstacle.y + 3 && c.y - c.h / 2 < obstacle.y + obstacle.h) {
        if (oldX + c.w / 2 <= obstacle.x + 4) c.x = obstacle.x - c.w / 2;
        else if (oldX - c.w / 2 >= obstacle.x + obstacle.w - 4) c.x = obstacle.x + obstacle.w + c.w / 2;
        impact = Math.max(impact, Math.abs(c.vx)); c.vx *= -.23;
      }
    }
    if (bottom >= ground && c.vy >= 0) {
      impact = Math.max(impact, Math.hypot(c.vy, c.vx * .85));
      c.y = ground - c.h / 2;
      c.vy = Math.abs(c.vy) > 130 ? -c.vy * (c.type === 'box' ? .27 : .08) : 0;
      c.vx *= Math.exp(-dt * (c.mass > 3 ? 7 : 4));
      if (Math.abs(c.vx) < 3) c.vx = 0;
      if (impact > 260 && c.type !== 'fragile' && c.rest <= 0) { state.bumps++; state.shake = Math.max(state.shake, Math.min(5, impact / 150)); burst(c.x, ground - 5, c.mass > 3 ? '咚！' : '弹！', '#ffd466', 4); onEvent('bump'); }
    }
    if (c.type === 'fragile' && impact > 405) { fail(c, impact); return; }
    if (Math.abs(c.vy) < 5 && Math.abs(c.vx) < 15) c.rest += dt; else c.rest = 0;
    c.angle *= Math.exp(-dt * 9);
    if (c.rest > .28 && c.x - c.w / 2 > 785 && c.x + c.w / 2 < 953 && Math.abs(c.y + c.h / 2 - order().floor) < 5) deliver(c);
  }
  function tick(dt, input = {}) {
    dt = clamp(Number(dt) || 0, 0, .1); state.time += dt;
    state.shake *= Math.exp(-dt * 14);
    for (const p of state.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 270 * dt; }
    state.particles = state.particles.filter(p => p.age < p.life);
    if (state.failed || state.orderDone) { carryPosition(); return; }
    const pressed = input.pressed;
    if (has(pressed, 'Space', ' ', 'ArrowUp', 'KeyW', 'w', 'W')) jump();
    if (has(pressed, 'KeyE', 'e', 'E', 'Enter')) interact();
    if (has(pressed, 'KeyF', 'f', 'F')) drop(true);
    let horizontal = clamp(Number(input.x) || 0, -1, 1);
    if (!horizontal && has(input.keys, 'ArrowLeft', 'KeyA', 'a', 'A')) horizontal = -1;
    if (!horizontal && has(input.keys, 'ArrowRight', 'KeyD', 'd', 'D')) horizontal = 1;
    if (Math.abs(horizontal) > .01) state.auto = null;
    if (state.auto) {
      const distance = state.auto.x - state.player.x;
      // A return jump can reach the cargo's X while the worker is still above it.
      // Keep the approach pending until landing, rather than losing the pickup.
      if (Math.abs(distance) < 5 && Math.abs(state.player.vx) < 32 && state.player.grounded) {
        const action = state.auto; state.auto = null;
        if (action.mode === 'take') {
          const cargo = state.cargo.find(c => c.id === action.cargoId);
          if (!take(cargo) && cargo && !cargo.delivered && !cargo.broken) {
            const side = cargo.x >= state.player.x ? -1 : 1;
            state.auto = { ...action, x: clamp(cargo.x + side * (cargo.w / 2 + 27), 33, 920) };
          }
        }
        if (action.mode === 'deliver' && state.holding === action.cargoId) { state.player.facing = 1; drop(); }
      } else horizontal = Math.abs(distance) < 5 ? 0 : Math.sign(distance);
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
    for (let i = 0; i < steps && !state.failed && !state.orderDone; i++) {
      resolvePlayer(step, horizontal);
      for (const c of state.cargo) resolveCargo(c, step);
    }
  }

  function shape(fn, fill, stroke = INK, width = 3) { ctx.beginPath(); fn(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); } }
  function rect(x, y, w, h, fill, r = 0, stroke = INK, sw = 3) { shape(() => ctx.roundRect(x, y, w, h, r), fill, stroke, sw); }
  function ellipse(x, y, rx, ry, fill, stroke = INK, sw = 3) { shape(() => ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), fill, stroke, sw); }
  function line(x, y, x2, y2, color = INK, width = 3) { shape(() => { ctx.moveTo(x, y); ctx.lineTo(x2, y2); }, null, color, width); }
  function text(str, x, y, size = 20, color = INK, align = 'left', weight = 800) { ctx.font = `${weight} ${size}px "Microsoft YaHei", system-ui, sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, x, y); }
  function dots(x, y, w, h, color, gap = 13) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); for (let yy = y; yy < y + h; yy += gap) for (let xx = x; xx < x + w; xx += gap) ellipse(xx + ((Math.floor(yy / gap) % 2) * gap / 2), yy, 1.5, 1.5, color, null); ctx.restore(); }
  function cloud(x, y, scale = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); shape(() => { ctx.moveTo(-46, 16); ctx.bezierCurveTo(-73, 7, -57, -15, -38, -12); ctx.bezierCurveTo(-34, -47, 15, -40, 22, -16); ctx.bezierCurveTo(49, -33, 77, 4, 47, 16); ctx.closePath(); }, '#fffbe7', INK, 2); ctx.restore(); }
  function background() {
    ctx.fillStyle = '#8bdce0'; ctx.fillRect(0, 0, W, H);
    dots(0, 0, W, 220, '#72cacf', 17);
    cloud(368 + Math.sin(state.time * .05) * 8, 88, 1.05); cloud(703, 61, .72); cloud(903, 116, .63);
    ellipse(593, 106, 43, 43, '#ffd468', INK, 3); ellipse(584, 101, 3, 4, INK, null); ellipse(604, 101, 3, 4, INK, null); shape(() => ctx.arc(594, 110, 10, .1, Math.PI - .1), null, INK, 2);
    for (let i = 0; i < 12; i++) { const x = i * 92 - 30, h = 57 + (i % 4) * 24; rect(x, 329 - h, 80, h, i % 2 ? '#62b3b7' : '#75c5c7', 8, null); for (let j = 0; j < 3; j++) rect(x + 12 + j * 22, 285 - h, 11, 17, '#a9e0d2', 2, null); }
    shape(() => { ctx.moveTo(0, 342); ctx.bezierCurveTo(280, 288, 505, 374, 960, 333); ctx.lineTo(960, 510); ctx.lineTo(0, 510); ctx.closePath(); }, '#f5c57b', null);
    rect(15, 169, 394, 332, '#ffe186', 15, INK, 5);
    rect(28, 181, 370, 55, '#ff9275', 9, INK, 3); dots(32, 182, 359, 47, '#ea765e', 10);
    text('橘子搬家公司', 213, 218, 29, '#202945', 'center');
    rect(120, 274, 195, 230, '#ac6953', 9, INK, 4);
    for (let i = 0; i < 8; i++) line(125, 291 + i * 25, 309, 291 + i * 25, '#855342', 3);
    rect(134, 317, 167, 185, '#795350', 4, INK, 3);
    for (let i = 0; i < 6; i++) rect(145 + (i % 3) * 50, 450 - Math.floor(i / 3) * 45, 44, 43, '#c49661', 1, '#66483e', 2);
    rect(50, 290, 57, 73, '#e9f8ec', 5); text('小橘', 79, 317, 15, INK, 'center'); text('在岗 ✓', 79, 343, 13, INK, 'center');
    line(17, 238, 407, 238, INK, 3);
    for (let i = 0; i < 10; i++) { const x = 22 + i * 39; shape(() => { ctx.moveTo(x, 239); ctx.lineTo(x + 18, 263); ctx.lineTo(x + 35, 239); ctx.closePath(); }, i % 2 ? '#3ea8c5' : '#ff776a', INK, 2); }
    // Foreman: a small dog who cheers rather than giving another menu.
    ellipse(71, 477, 24, 9, '#cb9c6a', null); rect(54, 423, 33, 51, '#3c91bc', 10, INK, 3); ellipse(70, 412, 25, 23, '#ead2af'); ellipse(49, 416, 9, 18, '#976f52'); ellipse(90, 416, 9, 18, '#976f52'); ellipse(63, 411, 2.8, 3.5, INK, null); ellipse(76, 411, 2.8, 3.5, INK, null); ellipse(70, 420, 6, 4, INK, null); rect(76, 436, 26, 32, '#f8eed0', 3, INK, 2); line(81, 444, 97, 444, '#c4a97b', 2); line(81, 451, 94, 451, '#c4a97b', 2);
    text(state.orderDone ? '干得漂亮！' : state.failed ? '再来一次！' : '稳稳地搬～', 68, 382, 14, INK, 'center');
    // Ground and loading ramp are visible physical geometry.
    rect(0, FLOOR, W, H - FLOOR, '#eeb36b', 0, null); line(0, FLOOR, W, FLOOR, INK, 5);
    for (let i = 0; i < 22; i++) { const x = i * 49; line(x, 558, x + 28, 558, '#fce7a5', 5); }
    const o = order();
    shape(() => { ctx.moveTo(o.ramp[0], FLOOR); ctx.lineTo(782, o.floor); ctx.lineTo(782, FLOOR); ctx.closePath(); }, '#83aeb8', INK, 4);
    for (let x = o.ramp[0] + 12; x < 778; x += 16) { const y = surface(x); line(x, y + 5, x + 4, y + 21, '#587d8a', 2); }
    const b = o.obstacle; rect(b.x, b.y, b.w, b.h, '#eab16e', 4, INK, 4); line(b.x + 7, b.y + 7, b.x + b.w - 7, b.y + b.h - 7, '#a27348', 3); line(b.x + b.w - 7, b.y + 7, b.x + 7, b.y + b.h - 7, '#a27348', 3);
    text(state.orderIndex === 0 ? '小台阶' : '这次更高！', b.x + b.w / 2, b.y - 10, 14, INK, 'center');
  }
  function truck() {
    const top = order().floor, t = state.time;
    rect(779, 274 - (455 - top), 172, top - 264 + (455 - top), '#f37568', 14, INK, 5);
    rect(793, 294 - (455 - top), 145, top - 299 + (455 - top), '#88515b', 3, INK, 3);
    rect(789, top - 8, 165, 15, '#ffe183', 2, INK, 4);
    dots(802, top - 131, 129, 113, '#995964', 12);
    text('把货物轻放在这里', 865, top - 144, 15, '#ffecd4', 'center');
    text('小 橘 快 搬', 865, 288 - (455 - top), 20, '#fff7d4', 'center');
    rect(925, 334 - (455 - top), 56, top - 332 + (455 - top), '#f37568', 12, INK, 4);
    rect(935, 348 - (455 - top), 42, 39, '#b7e8e0', 9, INK, 3);
    ellipse(820, top + 24, 28, 28, INK, '#202945', 3); ellipse(820, top + 24, 14, 14, '#eef2cf', INK, 3);
    ellipse(926, top + 24, 28, 28, INK, '#202945', 3); ellipse(926, top + 24, 14, 14, '#eef2cf', INK, 3);
    // Waiting recipient: a pigeon with a tiny moving hat.
    ellipse(904, 251 - (455 - top) + Math.sin(t * 2) * 2, 20, 17, '#c5d8e8', INK, 3);
    ellipse(915, 236 - (455 - top) + Math.sin(t * 2) * 2, 12, 13, '#d8e6ee', INK, 3);
    ellipse(918, 233 - (455 - top), 2.2, 2.8, INK, null);
    shape(() => { ctx.moveTo(926, 237 - (455 - top)); ctx.lineTo(937, 241 - (455 - top)); ctx.lineTo(926, 245 - (455 - top)); ctx.closePath(); }, '#ffce62', INK, 2);
    rect(905, 220 - (455 - top), 24, 6, '#ffce62', 3, INK, 2);
  }
  function drawCargo(c, mini = false) {
    if (c.broken) {
      for (let i = 0; i < 5; i++) { const x = c.x - 20 + i * 10; shape(() => { ctx.moveTo(x, c.y + c.h / 2 - 2); ctx.lineTo(x + 4, c.y + c.h / 2 - 11 - (i % 2) * 4); ctx.lineTo(x + 9, c.y + c.h / 2 - 2); ctx.closePath(); }, '#b0e8e5', INK, 2); } return;
    }
    ctx.save();
    if (c.delivered) {
      const slot = state.cargo.findIndex(item => item.id === c.id);
      // Loaded goods sit a little deeper inside the van, leaving all three visible.
      ctx.translate([817, 869, 922][slot], order().floor - c.h * .31 - 3);
      ctx.scale(.62, .62);
    } else ctx.translate(c.x, c.y);
    ctx.rotate(c.angle || 0);
    const w = c.w, h = c.h;
    ellipse(0, h / 2 + 5, w * .47, 5, '#744e5630', null);
    if (c.type === 'box') {
      rect(-w / 2, -h / 2, w, h, '#dbad75', 4, INK, 3);
      rect(-6, -h / 2, 12, h, '#f7d99c', 0, null); line(-w / 2, -h / 2 + 10, w / 2, -h / 2 + 10, '#a0774e', 2);
      text('↑', -13, 12, 21, INK, 'center'); text('↑', 13, 12, 21, INK, 'center');
    } else if (c.type === 'fridge') {
      rect(-w / 2, -h / 2, w, h - 4, '#e9f4eb', 7, INK, 3);
      rect(-w / 2 + 3, -h / 2 + 3, w - 6, 29, '#b8deda', 4, null);
      line(-w / 2 + 2, -h / 2 + 33, w / 2 - 2, -h / 2 + 33, INK, 2);
      rect(w / 2 - 12, -h / 2 + 11, 4, 12, INK, 1, null); rect(w / 2 - 12, -h / 2 + 44, 4, 20, INK, 1, null);
      ellipse(-9, 13, 2, 3, INK, null); ellipse(0, 13, 2, 3, INK, null); shape(() => ctx.arc(-4, 18, 5, .15, Math.PI - .15), null, INK, 2);
      rect(-17, h / 2 - 4, 9, 7, '#4d6670', 1, null); rect(9, h / 2 - 4, 9, 7, '#4d6670', 1, null);
      rect(-19, -h / 2 + 41, 17, 15, '#ffbd66', 2, INK, 1); text('冷', -10, -h / 2 + 52, 10, INK, 'center');
    } else if (c.type === 'fragile') {
      rect(-w / 2, -h / 2, w, h, '#f3c37d', 4, INK, 3);
      rect(-w / 2 + 6, -h / 2 + 7, w - 12, h - 15, '#d6f3e9', 4, '#b78656', 2);
      shape(() => { ctx.moveTo(-7, -13); ctx.lineTo(6, -13); ctx.lineTo(4, -4); ctx.bezierCurveTo(19, 6, 11, 17, 0, 17); ctx.bezierCurveTo(-12, 17, -17, 5, -4, -4); ctx.closePath(); }, '#7cd7d7', INK, 2);
      line(-2, -2, -1, 10, '#d4ffff', 2); rect(-27, -h / 2 + 1, 24, 17, '#ff786b', 2, INK, 1.5); text('易碎', -15, -h / 2 + 13, 10, '#fff8e7', 'center');
    } else {
      rect(-w / 2 + 8, -h / 2, w - 16, h - 13, '#9586c9', 9, INK, 3);
      rect(-w / 2 + 4, 0, w - 8, 17, '#b3a2e4', 5, INK, 3);
      line(0, -h / 2 + 5, 0, 0, '#665a98', 2);
      rect(-w / 2, -h / 2 + 9, 14, h - 8, '#c3b2ed', 7, INK, 3); rect(w / 2 - 14, -h / 2 + 9, 14, h - 8, '#c3b2ed', 7, INK, 3);
      rect(-w / 2 + 12, h / 2 - 2, 9, 8, '#6c5060', 2, null); rect(w / 2 - 21, h / 2 - 2, 9, 8, '#6c5060', 2, null);
      ellipse(-9, -7, 2, 3, INK, null); ellipse(9, -7, 2, 3, INK, null); line(-4, 2, 4, 2, INK, 2);
    }
    if (c.delivered) { ellipse(w / 2 - 1, -h / 2 + 2, 10, 10, '#b8ee92', INK, 2); text('✓', w / 2 - 1, -h / 2 + 7, 15, INK, 'center'); }
    ctx.restore();
  }
  function cat() {
    const p = state.player, walking = Math.abs(p.vx) > 12, sway = walking && p.grounded ? Math.sin(p.phase) : 0, c = held();
    ellipse(p.x, surface(p.x) + 3, 26, 7, '#79595338', null);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
    // Tail, feet and body stay readable even when the long sofa covers the paws.
    shape(() => { ctx.moveTo(-13, -26); ctx.bezierCurveTo(-48, -19, -37, -62 + sway * 5, -49, -57); }, null, INK, 15);
    shape(() => { ctx.moveTo(-13, -26); ctx.bezierCurveTo(-48, -19, -37, -62 + sway * 5, -49, -57); }, null, '#ee9b51', 10);
    line(-48, -52, -43, -49, '#b76b41', 5);
    line(-9, -18, -10 - sway * 10, -5, INK, 11); line(8, -18, 9 + sway * 10, -5, INK, 11);
    ellipse(-11 - sway * 10, -3, 11, 5, '#466179', INK, 2); ellipse(11 + sway * 10, -3, 11, 5, '#466179', INK, 2);
    rect(-16, -45 + Math.abs(sway), 33, 31, '#ffcc55', 10, INK, 3);
    rect(-14, -39 + Math.abs(sway), 30, 23, '#4a9fb5', 5, INK, 2);
    line(-9, -44, -7, -17, '#f8e572', 5); line(9, -44, 7, -17, '#f8e572', 5);
    if (c) { line(-8, -36, 24, -37, INK, 12); line(-8, -36, 24, -37, '#f4ac68', 8); ellipse(25, -38, 6, 6, '#f4ac68', INK, 2); }
    else { line(-12, -37, -23 + sway * 7, -20, INK, 10); line(-12, -37, -23 + sway * 7, -20, '#f4ac68', 7); line(11, -37, 20 - sway * 7, -22, INK, 10); line(11, -37, 20 - sway * 7, -22, '#f4ac68', 7); }
    const headY = -61 + Math.abs(sway) * 1.3;
    shape(() => { ctx.moveTo(-22, headY - 10); ctx.lineTo(-22, headY - 35); ctx.lineTo(-3, headY - 23); ctx.lineTo(19, headY - 34); ctx.lineTo(23, headY - 6); ctx.closePath(); }, '#f4ac68', INK, 3);
    ellipse(0, headY - 2, 26, 22, '#f4ac68', INK, 3);
    shape(() => { ctx.moveTo(-18, headY - 23); ctx.lineTo(-18, headY - 29); ctx.lineTo(-8, headY - 23); ctx.closePath(); }, '#ec8c7b', null);
    shape(() => { ctx.moveTo(13, headY - 25); ctx.lineTo(18, headY - 29); ctx.lineTo(18, headY - 21); ctx.closePath(); }, '#ec8c7b', null);
    ellipse(3, headY + 6, 17, 10, '#fff0ce', null);
    const blink = Math.sin(state.time * 1.3) > .997;
    if (state.failed) { line(-10, headY - 6, -4, headY, INK, 2); line(-4, headY - 6, -10, headY, INK, 2); line(8, headY - 6, 14, headY, INK, 2); line(14, headY - 6, 8, headY, INK, 2); }
    else if (blink || state.orderDone) { shape(() => ctx.arc(-7, headY - 1, 4, Math.PI, 2 * Math.PI), null, INK, 2); shape(() => ctx.arc(12, headY - 1, 4, Math.PI, 2 * Math.PI), null, INK, 2); }
    else { ellipse(-7, headY - 3, 3, 4.5, INK, null); ellipse(12, headY - 3, 3, 4.5, INK, null); }
    ellipse(4, headY + 5, 4, 3, '#9a5546', null); shape(() => ctx.arc(4, headY + 9, 6, .1, Math.PI - .1), null, INK, 2);
    line(-22, headY + 4, -12, headY + 6, '#a56845', 1.5); line(-21, headY + 10, -12, headY + 9, '#a56845', 1.5);
    // Helmet, with ears sticking through.
    shape(() => { ctx.moveTo(-24, headY - 15); ctx.bezierCurveTo(-20, headY - 40, 20, headY - 37, 24, headY - 15); ctx.closePath(); }, '#ffe45d', INK, 3); rect(-27, headY - 18, 55, 7, '#ffcb42', 3, INK, 2);
    line(0, headY - 34, 0, headY - 20, '#f5b637', 5);
    if (c?.mass > 3 && Math.sin(state.time * 4) > 0) { ellipse(-29, headY - 8, 2.5, 5, '#8cddd9', INK, 1); }
    ctx.restore();
  }
  function overlays() {
    rect(22, 21, 313, 76, '#fff6cf', 13, INK, 3);
    text(order().title, 39, 49, 19); text(`完整装车  ${state.cargo.filter(c => c.delivered).length} / 3`, 39, 79, 17, '#516072');
    rect(741, 23, 196, 45, '#fff6cf', 12, INK, 3); text(state.holding ? `手里：${held()?.name || ''}` : '点货物 · 走过去拿', 839, 52, 15, INK, 'center');
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      if (p.word) { ctx.save(); ctx.translate(p.x, p.y - 14); ctx.rotate(-.13); text(p.word, 0, 0, 21, INK, 'center'); ctx.restore(); }
      else { shape(() => { ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x + 4, p.y); ctx.lineTo(p.x, p.y + 5); ctx.lineTo(p.x - 4, p.y); ctx.closePath(); }, p.color, INK, 1); }
    }
    ctx.globalAlpha = 1;
    if (!state.failed && !state.orderDone) {
      const nearest = nearestCargo();
      if (!state.holding && nearest && Math.abs(nearest.x - state.player.x) < 79) { rect(nearest.x - 37, nearest.y - nearest.h / 2 - 35, 74, 26, '#fff8d8', 8, INK, 2); text('E 拿起', nearest.x, nearest.y - nearest.h / 2 - 17, 13, INK, 'center'); }
    }
    if (state.failed || state.orderDone) {
      ctx.fillStyle = '#20294533'; ctx.fillRect(0, 0, W, H);
      rect(235, 119, 490, 220, '#fff6cf', 19, INK, 5);
      text(state.failed ? '哎呀，花瓶碎啦！' : state.orderIndex === 0 ? '第一位客户收到新家了！' : '两单完成，小橘收工！', 480, 167, 27, INK, 'center');
      text(state.failed ? '试试走斜坡，易碎物搬到车厢再轻放。' : state.orderIndex === 0 ? '“花瓶完好无损。还有张沙发要拜托你！”' : '“谢谢你！靠窗的沙发位置，留给小橘。”', 480, 212, 17, '#6b5960', 'center', 600);
      rect(365, 251, 230, 54, state.failed ? '#ff9377' : '#b9e8a4', 12, INK, 3);
      text(state.failed ? '重新打包这一单' : state.orderIndex === 0 ? '接下沙发这一单 →' : '再玩第二单', 480, 285, 18, INK, 'center');
    }
  }
  function draw() {
    ctx.save(); const shake = state.shake > .3 ? Math.sin(state.time * 80) * state.shake : 0; ctx.translate(shake, 0);
    background(); truck();
    for (const c of state.cargo.filter(c => c.id !== state.holding)) drawCargo(c);
    cat(); if (held()) drawCargo(held());
    ctx.restore(); overlays();
  }
  function getUI() {
    const n = state.cargo.filter(c => c.delivered).length;
    const actions = state.failed ? [{ id: 'retry', label: '重新打包这一单', primary: true }] : state.orderDone ? state.orderIndex === 0 ? [{ id: 'next-order', label: '接下沙发这一单', primary: true }] : [{ id: 'retry', label: '再玩第二单' }] : [
      { id: 'interact', label: state.holding ? '轻轻放下 · E' : '拿起货物 · E', primary: true },
      { id: 'jump', label: '跳一下 · 空格' },
      { id: 'throw', label: '抛出去 · F', disabled: !state.holding },
      { id: 'truck', label: '搬向货车', disabled: !state.holding },
    ];
    return {
      title: '淘气搬家公司', goal: state.failed ? '把这一单重新打包，再试一次。' : state.orderDone ? state.orderIndex === 0 ? '第一单完成，第二位客户等着你。' : '两家人的新生活，都已送到。' : `把${state.cargo.filter(c => !c.delivered && !c.broken).map(c => c.name).join('、')}完整搬进右侧货车。`,
      message: state.message, progress: `${state.orderIndex + 1} / 2 单 · ${n} / 3 件已装车`, actions,
      inventory: state.holding ? [`正在搬：${held()?.name}`, held()?.mass > 3 ? '重物让行走和跳跃变慢' : held()?.type === 'fragile' ? '易碎，请轻放' : '纸箱能弹跳'] : ['双手空着'],
      journal: state.journal.slice(-6), complete: state.completedOrders === 2,
      controls: 'A/D 或 ←/→ 行走 · W/↑/空格跳跃 · E 拿起/轻放 · F 投掷。也可点货物走过去拿，拿着货物点车厢自动走过去轻放。',
    };
  }
  function getState() {
    const { particles, auto, shake, ...serial } = state;
    return JSON.parse(JSON.stringify({ ...serial, player: { ...serial.player, vx: 0, vy: 0 } }));
  }
  function getTargets() {
    if (state.failed) return [{ id: 'retry', x: 480, y: 278 }];
    if (state.orderDone) return [{ id: state.orderIndex === 0 ? 'next-order' : 'retry', x: 480, y: 278 }];
    return [
      ...state.cargo.filter(c => !c.delivered && !c.broken && c.id !== state.holding).map(c => ({ id: `cargo-${c.id}`, x: c.x, y: c.y })),
      { id: 'truck', x: 865, y: order().floor - 59 },
    ];
  }
  function pointer(event) {
    if (event.button !== undefined && event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    const bounds = canvas.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width * W, y = (event.clientY - bounds.top) / bounds.height * H;
    if ((state.failed || state.orderDone) && x > 365 && x < 595 && y > 251 && y < 305) { command(state.failed || state.orderIndex === 1 ? 'retry' : 'next-order'); return; }
    if (state.failed || state.orderDone) return;
    for (const c of state.cargo) if (!c.broken && !c.delivered && c.id !== state.holding && Math.abs(x - c.x) <= c.w / 2 + 15 && Math.abs(y - c.y) <= c.h / 2 + 15) { command(`cargo-${c.id}`); return; }
    if (x > 782 && y > order().floor - 160 && y < order().floor + 15 && state.holding) { command('truck'); return; }
    state.auto = { x: clamp(x, 29, 920), mode: 'walk' };
    note('小橘正在走过去。键盘或方向按钮可以随时接手。');
  }
  canvas.addEventListener('pointerup', pointer);
  draw();
  return { element: canvas, tick, draw, command, getUI, getState, getTargets, dispose() { canvas.removeEventListener('pointerup', pointer); canvas.remove(); } };
}
