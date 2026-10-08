import {movingContracts as ORDERS} from './moving-contracts.js?v=3';
import {createMovingArt} from './moving-art.js?v=6';
import {createMovingInterface} from './moving-interface.js?v=9';
/* A small, original side-view moving game. Physics uses logical canvas pixels. */
const W = 960, H = 600, FLOOR = 510;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has = (set, ...names) => names.some(n => set?.has?.(n));
function newState(index = 0, completed = 0, records = [], journal = []) {
  const o = ORDERS[index];
  return {
    version: 3, orderIndex: index, completedOrders: completed, records, time: 0, elapsed: 0, recoveries: 0, recoveringUntil: 0, phase: 'briefing', liftUntil: 0, jumpQueuedUntil: 0,
    player: { x: 105, y: FLOOR, vx: 0, vy: 0, facing: 1, grounded: true, phase: 0 },
    cargo: o.cargo.map(c => ({ ...c, y: FLOOR - c.h / 2, vx: 0, vy: 0, delivered: false, broken: false, rest: 0, angle: 0 })),
    holding: null, auto: null, failed: false, orderDone: false,
    bumps: 0, throws: 0, deliveries: 0, shake: 0,
    message: o.summary,
    journal: [...journal, '委托 '+o.chapter+' · '+o.client+' / '+o.place].slice(-15), particles: [],
  };
}

export function createMoversGame({ mount, saved, onEvent = () => {} }) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.tabIndex = 0;
  canvas.className = 'game-canvas movers-canvas';
  canvas.setAttribute('aria-label', '搬家日：移动搬运者，把生活物件安全送到货车' );
  canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.style.display = 'block'; canvas.style.touchAction = 'none';
  mount.append(canvas);
  let state = newState(),disposed=false;
  if ([1,3].includes(saved?.version) && Number.isInteger(saved.orderIndex) && saved.orderIndex >= 0 && saved.orderIndex < 3) {
    const records=Array.isArray(saved.records)?saved.records.filter(r=>Number.isInteger(r?.order)&&r.order>=0&&r.order<3&&Number.isFinite(r.score)&&Number.isFinite(r.time)).map(r=>({...r,score:clamp(r.score,55,100),time:Math.max(0,r.time),thanks:ORDERS[r.order].thanks})):[];
    const fresh = newState(saved.orderIndex, clamp(Number(saved.completedOrders) || 0, 0, 3), records);
    if (saved.player && Array.isArray(saved.cargo)) {
      state = { ...fresh, ...saved, records, version:3, particles: [], auto: null, shake: 0 };
      if(saved.version===1){state.phase=saved.orderDone?'result':'playing';state.message=ORDERS[saved.orderIndex].summary;state.journal=['旧版已装车的货物保留，继续完成这一份委托。'];}
      state.player = { ...fresh.player, ...saved.player, x: clamp(saved.player.x || 105, 30, 921), y: clamp(saved.player.y || FLOOR, 100, FLOOR) };
      state.cargo = fresh.cargo.map(c => ({ ...c, ...(saved.cargo.find(item => item.id === c.id) || {}), vx: 0, vy: 0, name:c.name, detail:c.detail }));
      state.holding = state.cargo.some(c => c.id === saved.holding && !c.broken && !c.delivered) ? saved.holding : null;
      state.journal = Array.isArray(saved.journal) ? saved.version===3?saved.journal.slice(-15):state.journal : fresh.journal;
    }
  }

  const art = createMovingArt(canvas,()=>{if(!disposed)draw()});
  const productUI = createMovingInterface({container:mount.closest('#game-view')||mount,canvas,command:id=>{if(document.querySelector('#game-pause')?.getAttribute('aria-pressed')!=='true')command(id)}});
  art.ready.then(()=>draw());
  let coyote=.12;
  const order = () => ORDERS[state.orderIndex];
  const held = () => state.cargo.find(c => c.id === state.holding);
  function note(message, record = false) {
    state.message = message;
    if (record && state.journal.at(-1) !== message) state.journal = [...state.journal, message].slice(-15);
  }
  function burst(x, y, word = '', color = '#ffbf45', count = 8) {
    for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: Math.cos(i * 2.4) * (50 + i * 8), vy: -90 - i * 9, age: 0, life: .65 + i * .03, color, word: i === 0 ? word : '' });
  }
  function surface(x) {
    const o = order();
    if (x >= 728 && x < 955) return o.floor;
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
    state.holding = c.id; state.auto = null; state.liftUntil=state.time+.2; carryPosition();
    note(c.type === 'fragile' ? `${c.name}需要保护：从斜坡走上车，轻放；投掷或高处落下会损坏包装。` : c.mass > 3 ? `${c.name}很重，移动与跳跃会变慢。借助斜坡稳稳送上车。` : `${c.name}较轻，移动更灵活。装车后请等它落稳。`);
    burst(c.x, c.y - c.h / 2, '拿稳！', '#ffe362', 4); onEvent('soft'); return true;
  }
  function drop(throwIt = false) {
    const c = held(); if (!c || state.failed || state.orderDone) return;
    carryPosition(); state.holding = null; state.auto = null;
    c.x = clamp(c.x, c.w / 2 + 4, W - c.w / 2 - 5);
    c.vx = throwIt ? state.player.facing * (c.mass > 3 ? 255 : 485) : state.player.vx * .22;
    c.vy = throwIt ? -230 : 0; c.rest = 0;
    if (throwIt) {
      state.throws++; note(c.type === 'fragile' ? `${c.name}被抛出，注意保护层是否受损。` : c.mass > 3 ? '重家具只能抛出一小段。' : '纸箱会弹跳，请留意落点。');
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
    if (state.failed || state.orderDone) return;
    if(!p.grounded&&coyote<=0){state.jumpQueuedUntil=state.time+.12;return}
    p.vy = held()?.mass > 3 ? -455 : held()?.type==='fragile'?-490:-580; p.grounded = false;coyote=0;state.jumpQueuedUntil=0;
    burst(p.x, p.y - 2, '', '#fff8bd', 4); onEvent('soft');
  }
  function fail(c, impact) {
    if (state.failed || c.broken) return;
    c.broken = true; state.failed = true; state.auto = null; state.holding = null; state.shake = 11;
    note('包装受到了大冲击。先检查并补好保护层，已经装车的货物会保留。', true);
    burst(c.x, c.y, '啪嚓！', '#ff6b68', 16); onEvent('bump');
  }
  function deliver(c) {
    c.delivered = true; c.vx = c.vy = 0; state.deliveries++;
    const count = state.cargo.filter(item => item.delivered).length;
    burst(c.x, c.y - c.h / 2, '稳稳送到', '#fbe568', 9); onEvent('success');
    note(`${c.name}完整装车。${count < 3 ? `还差 ${3 - count} 件，先看清路，再继续。` : '所有货物都到了，收件人给搬运者送来了一封感谢信。'}`, true);
    if (count === 3) {
      state.orderDone = true; state.phase='result';state.completedOrders = Math.max(state.completedOrders, state.orderIndex + 1);
      const score=Math.max(55,100-state.recoveries*12-Math.min(10,state.throws*2)),previous=state.records.find(r=>r.order===state.orderIndex);
      if(!previous||score>previous.score||score===previous.score&&state.elapsed<previous.time)state.records=[...state.records.filter(r=>r.order!==state.orderIndex),{order:state.orderIndex,score,time:state.elapsed,thanks:order().thanks}];
      state.auto = null;
      state.journal.push(order().thanks);
    }
  }
  function command(id) {
    if(id.startsWith('order-')&&state.orderDone){const i=Number(id.slice(6));if(!Number.isInteger(i)||i<0||i>=ORDERS.length||!state.records.some(r=>r.order===i))return;state=newState(i,state.completedOrders,state.records,state.journal);coyote=.12;return;}
    if(id==='reload-art'){art.load().then(()=>draw());return}
    if(id==='records'&&state.records.length&&!state.failed){state.phase='records';state.auto=null;return}
    if(id==='return'&&art.status.ready&&!state.failed){state.phase=state.orderDone?'result':'playing';return}
    if(id==='brief'&&!state.failed&&!state.orderDone){state.phase='briefing';state.auto=null;return}
    if(id==='start'&&art.status.ready&&!state.failed&&!state.orderDone){state.phase='playing';note(state.holding?`正在搬运${held().name}。到达车厢后轻放，也可以点货车辅助送达。`:`先走近${state.cargo.find(c=>!c.delivered)?.name||'货物'}。点选货物会走近拿起，再点货车可辅助送达。`);draw();return}
    if(id==='repair'&&state.failed&&!state.recoveringUntil){state.recoveringUntil=state.time+1.2;onEvent('soft');return}
    if(id==='replay'&&state.orderDone){state=newState(0,0,state.records,state.journal);coyote=.12;return}
    if (id === 'retry') { const i=state.orderIndex;state=newState(i,state.completedOrders,state.records,state.journal);state.phase='playing';coyote=.12;return; }
    if (id === 'next-order' && state.orderDone && state.orderIndex < 2) { state=newState(state.orderIndex+1,state.completedOrders,state.records,state.journal);coyote=.12;onEvent('success');return; }
    if (state.failed || state.orderDone ||state.phase!=='playing'||!art.status.ready) return;
    if (id === 'jump') jump();
    if (id === 'interact' || id === 'near') interact();
    if (id === 'throw') drop(true);
    if (id === 'truck' && state.holding) {
      state.auto = { x: 810-(29+held().w/2), mode: 'deliver', cargoId: state.holding };
      note('正在辅助搬运。方向键可以接手；到达车厢后会稳稳放下。');
    }
    if (id.startsWith('cargo-')) {
      const c = state.cargo.find(item => item.id === id.slice(6));
      if (!c || c.delivered || c.broken) return;
      if (state.holding) { note('手里已经有一件了，先放下或装进货车。'); return; }
      const side = c.x >= state.player.x ? -1 : 1;
      state.auto = { x: clamp(c.x + side * (c.w / 2 + 27), 33, 920), mode: 'take', cargoId: c.id };
      note(`正在走近${c.name}。${c.detail}`);
    }
  }

  function resolvePlayer(dt, horizontal) {
    const p = state.player, c = held(), obstacle = order().obstacle;
    const speed = c?.mass > 3 ? 166 : c?.type === 'fragile' ? 206 : 270;
    const accel = p.grounded ? 1550 : 820;
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
    if (c.rest > .28 && c.x - c.w / 2 > 728 && c.x + c.w / 2 < 890 && Math.abs(c.y + c.h / 2 - order().floor) < 5) deliver(c);
  }
  function tick(dt, input = {}) {
    dt = clamp(Number(dt) || 0, 0, .1); state.time += dt;
    if(state.failed&&state.recoveringUntil&&state.time>=state.recoveringUntil){const broken=state.cargo.find(c=>c.broken),fresh=order().cargo.find(c=>c.id===broken?.id);if(broken&&fresh)Object.assign(broken,{x:fresh.x,y:FLOOR-fresh.h/2,vx:0,vy:0,broken:false,rest:0});state.failed=false;state.recoveringUntil=0;state.recoveries++;state.elapsed+=12;state.player.x=105;state.player.y=FLOOR;state.player.vx=state.player.vy=0;state.player.grounded=true;note('保护层已经补好。已装车货物保留，从货物旁继续。',true);onEvent('soft');}
    if(state.phase==='playing'&&!state.failed&&!state.orderDone&&art.status.ready)state.elapsed+=dt;
    state.shake *= Math.exp(-dt * 14);
    for (const p of state.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 270 * dt; }
    state.particles = state.particles.filter(p => p.age < p.life);
    if (state.failed || state.orderDone||state.phase!=='playing'||!art.status.ready) { carryPosition(); return; }
    coyote=state.player.grounded?.12:Math.max(0,coyote-dt);if(state.jumpQueuedUntil>state.time&&state.player.grounded)jump();
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

  function draw() { if(disposed)return;art.draw(state,order()); productUI.update(state,order(),art.status); }
  function getUI() {
    const n=state.cargo.filter(c=>c.delivered).length,playing=state.phase==='playing'&&art.status.ready;
    const actions=state.failed?[{id:'repair',label:state.recoveringUntil?'正在补包装…':'补好保护层，继续',disabled:!!state.recoveringUntil,primary:true},{id:'retry',label:'重试当前委托'}]:state.orderDone?[{id:state.orderIndex<2?'next-order':'replay',label:state.orderIndex<2?'接下一份委托':'从第一单再出发',primary:true},{id:'retry',label:'练习当前委托'},...state.records.filter(r=>r.order!==state.orderIndex).map(r=>({id:'order-'+r.order,label:'重访 · '+ORDERS[r.order].client}))]:!playing?[{id:'start',label:'接下委托，开始搬运',disabled:!art.status.ready,primary:true}]:[{id:'interact',label:state.holding?'轻放 · E':'拿起 · E',primary:true},{id:'jump',label:'跳跃 · 空格'},{id:'truck',label:'辅助送到货车',disabled:!state.holding},{id:'throw',label:'投掷 · F',disabled:!state.holding}];
    return {title:'搬家日 · Moving Day',goal:state.failed?'补好包装，继续完成这份委托。':state.orderDone?order().thanks:`把${state.cargo.filter(c=>!c.delivered).map(c=>c.name).join('、')}稳稳送到货车。`,message:state.message,progress:`委托 ${state.orderIndex+1}/3 · 安全装车 ${n}/3`,actions,inventory:state.holding?[held()?.name,held()?.detail]:['双手空着'],journal:[...state.journal,...state.records.map(r=>ORDERS[r.order].client+' · 最佳评价 '+r.score+' / '+(r.score===100?'无投掷、无补包装交付':'下一次可挑战无投掷、无补包装交付'))],complete:state.completedOrders===3,controls:'AD / ← → 移动 · 空格跳跃 · E拿起/轻放 · F投掷。易碎物请走斜坡；点击货物与货车可辅助搬运。'};
  }
  function getState() {
    const { particles, auto, shake, ...serial } = state;
    return JSON.parse(JSON.stringify({ ...serial, player: { ...serial.player, vx: 0, vy: 0 } }));
  }
  function getTargets() {
    if(state.phase!=='playing'||state.failed||state.orderDone)return [];

    return [
      ...state.cargo.filter(c => !c.delivered && !c.broken && c.id !== state.holding).map(c => ({ id: `cargo-${c.id}`, x: c.x, y: c.y })),
      { id: 'truck', x: 822, y: order().floor - 59 },
    ];
  }
  function pointer(event) {
    if (event.button !== undefined && event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    const bounds = canvas.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width * W, y = (event.clientY - bounds.top) / bounds.height * H;
    if (state.failed || state.orderDone||state.phase!=='playing'||!art.status.ready) return;
    for (const c of state.cargo.slice().sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))) {const hit=Math.max(15,(44*W/bounds.width-c.w)/2);if (!c.broken && !c.delivered && c.id !== state.holding && Math.abs(x-c.x)<=c.w/2+hit&&Math.abs(y-c.y)<=c.h/2+hit){command(`cargo-${c.id}`);return}}
    if (x > 728 && y > order().floor - 160 && y < order().floor + 15 && state.holding) { command('truck'); return; }
    state.auto = { x: clamp(x, 29, 920), mode: 'walk' };
    note('正在走过去。方向键可以随时接手。');
  }
  canvas.addEventListener('pointerup', pointer);
  draw();
  return { element: canvas, tick, draw, command, getUI, getState, getTargets, dispose() { disposed=true;productUI.dispose();canvas.removeEventListener('pointerup', pointer); canvas.remove(); } };
}
