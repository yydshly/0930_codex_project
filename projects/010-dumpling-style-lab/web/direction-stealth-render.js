import { COLS, ROWS, EXIT, ARCHIVE, VISION_RANGE, VISION_HALF_ANGLE, VISION_PROXIMITY, walkable, route, visibility } from './direction-stealth-engine.js';

export const VIEW = Object.freeze({ width: 1440, height: 960, x: 120, y: 70, tile: 50 });
export const point = (x, y) => [VIEW.x + (x + .5) * VIEW.tile, VIEW.y + (y + .5) * VIEW.tile];
export function cellFromPoint(x, y) {
  const cx = Math.floor((x - VIEW.x) / VIEW.tile), cy = Math.floor((y - VIEW.y) / VIEW.tile);
  return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS ? [cx, cy] : null;
}
const materialCell = { stone: 0, wood: 1, rug: 2, grass: 3, metal: 4, '#': 5 };
const font = '"Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';
function text(ctx, value, x, y, size = 12, color = '#d9d7e3', align = 'center') { ctx.font = `500 ${size}px ${font}`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(value, x, y); }
function sprite(ctx, image, cell, x, y, width, height, cols = 3, rows = 2) {
  if (!image) return;
  const sw = image.width / cols, sh = image.height / rows;
  ctx.drawImage(image, (cell % cols) * sw, Math.floor(cell / cols) * sh, sw, sh, x, y, width, height);
}
function outline(ctx, x, y, size, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.stroke(); }
function reach(w, origin, angle, range) {
  let d = 0;
  for (; d < range; d += .06) if (!walkable(w, origin.x + Math.cos(angle) * d, origin.y + Math.sin(angle) * d)) break;
  return Math.max(0, Math.min(range, d - .025));
}
function fan(ctx, w, origin, start, end, range, rays = 70) {
  const [x, y] = point(origin.x, origin.y); ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) { const a = start + (end - start) * i / rays, d = reach(w, origin, a, range); const [px, py] = point(origin.x + Math.cos(a) * d, origin.y + Math.sin(a) * d); ctx.lineTo(px, py); }
  ctx.closePath();
}
function drawGround(ctx, w, assets, o) {
  const t = VIEW.tile;
  ctx.fillStyle = '#10151f'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.save(); ctx.shadowColor = '#01060e'; ctx.shadowBlur = 40; ctx.fillStyle = '#101722'; ctx.fillRect(VIEW.x - 10, VIEW.y - 10, COLS * t + 20, ROWS * t + 20); ctx.restore();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const value = w.tiles[y * COLS + x], px = VIEW.x + x * t, py = VIEW.y + y * t;
    sprite(ctx, assets.materials, materialCell[value] ?? 0, px, py, t, t);
    ctx.fillStyle = value === '#' ? '#09121aa8' : '#10224030'; ctx.fillRect(px, py, t, t);
    if (value === '#') {
      if (walkable(w, x, y + 1)) { ctx.fillStyle = '#0b0d19'; ctx.fillRect(px, py + t - 8, t, 8); ctx.fillStyle = '#a0a8b94d'; ctx.fillRect(px, py + t - 10, t, 2); }
      if (walkable(w, x + 1, y)) { ctx.fillStyle = '#090f1cb0'; ctx.fillRect(px + t - 5, py, 5, t); }
    } else if (o.grid) { ctx.strokeStyle = '#abb8d412'; ctx.lineWidth = 1; ctx.strokeRect(px, py, t, t); }
  }
  // Light geometry uses the same wall grid as perception, not a painted night filter.
  for (const lamp of w.lamps) if (lamp.on) {
    const [x, y] = point(lamp.x, lamp.y), r = lamp.radius * t;
    ctx.save(); fan(ctx, w, lamp, 0, Math.PI * 2, lamp.radius, 120); ctx.clip();
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r); gradient.addColorStop(0, '#f5d29b70'); gradient.addColorStop(.48, '#d7af7430'); gradient.addColorStop(1, '#edcf9e00');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  ctx.strokeStyle = '#6d7a934f'; ctx.lineWidth = 1; ctx.strokeRect(VIEW.x - 7, VIEW.y - 7, COLS * t + 14, ROWS * t + 14);
}
function drawVision(ctx, w, o) {
  if (!o.showVision) return;
  for (const guard of w.guards) {
    const [x, y] = point(guard.x, guard.y), range = VISION_RANGE, half = VISION_HALF_ANGLE;
    const alert = guard.mode === 'chase' || guard.awareness >= 62;
    ctx.save(); fan(ctx, w, guard, 0, Math.PI * 2, VISION_PROXIMITY, 48); ctx.fillStyle = alert ? '#d85c541c' : '#e4cf8810'; ctx.fill(); ctx.strokeStyle = '#cbbd8a24'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, range * VIEW.tile); gradient.addColorStop(0, alert ? '#d85c543b' : '#e4cf8840'); gradient.addColorStop(1, alert ? '#d85c5408' : '#d8c58008');
    ctx.save(); fan(ctx, w, guard, guard.angle - half, guard.angle + half, range); ctx.fillStyle = gradient; ctx.fill(); ctx.strokeStyle = alert ? '#dc7d674d' : '#d7cda62b'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
}
function routeLine(ctx, path, color) {
  if (!path?.length) return; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 7]); ctx.beginPath();
  path.forEach((p, i) => { const [x, y] = point(p.x, p.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
}
function prop(ctx, assets, cell, x, y, width, height, alternate = false) { const [px, py] = point(x, y); ctx.save(); ctx.shadowColor = '#03091599'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5; sprite(ctx, alternate ? assets.states : assets.props, cell, px - width / 2, py - height + 18, width, height); ctx.restore(); }
function drawFacilities(ctx, w, assets) {
  // Architectural furniture sits on the solid walls; it cannot secretly block a floor tile.
  for (const [x, y] of [[6, 1], [6, 6], [6, 11], [18, 1], [18, 6], [18, 11], [11, 1]]) prop(ctx, assets, 3, x, y, 45, 71);
  for (const [x, y] of [[8, 5], [15, 5], [8, 10], [15, 10]]) prop(ctx, assets, 4, x, y, 77, 56);
  prop(ctx, assets, 0, ARCHIVE.x, ARCHIVE.y, 100, 101, w.objective);
  const [ax, ay] = point(ARCHIVE.x, ARCHIVE.y); if (!w.objective) { ctx.save(); ctx.shadowColor = '#a8bbef'; ctx.shadowBlur = 10; outline(ctx, ax, ay - 14, 17, '#c2d5ffb0', 1.5); ctx.restore(); }
  else { text(ctx, '已取回', ax, ay + 32, 10, '#b7cbdc'); }
  prop(ctx, assets, 5, EXIT.x, EXIT.y, 82, 98);
  for (const lamp of w.lamps) prop(ctx, assets, 1, lamp.x, lamp.y, 56, 82, !lamp.on);
  for (const sw of w.switches) { const on = w.lamps.find(l => l.id === sw.lampId)?.on; prop(ctx, assets, 2, sw.x, sw.y, 41, 65, !on); const [x, y] = point(sw.x, sw.y); ctx.fillStyle = on ? '#e1b56c' : '#8eadd5'; ctx.beginPath(); ctx.arc(x + 15, y + 10, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const [x, y, label] of [[3, 6.6, '西侧出口'], [21, 1.5, '档案封印'], [5, 9.4, '长廊电闸'], [12.8, 5.5, '巡逻长廊'], [14, 10.3, '南侧货院']]) {
    const [px, py] = point(x, y); ctx.fillStyle = '#101824d9'; const width = label.length * 12 + 18; ctx.fillRect(px - width / 2, py - 12, width, 21); text(ctx, label, px, py + 3, 11, '#c1c8d8');
  }
}
const direction = angle => { const n = (Math.round(angle / (Math.PI / 2)) + 4) % 4; return [1, 2, 3, 0][n]; };
function actor(ctx, assets, value, row, w, selected = false) {
  const [x, y] = point(value.x, value.y), size = row ? 56 : value.stance === 'crouch' ? 48 : 56, bob = value.moving ? Math.sin(w.time * 12) * 1.1 : 0;
  ctx.fillStyle = '#030912a6'; ctx.beginPath(); ctx.ellipse(x, y + 8, size * .28, size * .13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); if (row) ctx.filter = 'brightness(1.14)'; sprite(ctx, assets.actors, row * 4 + direction(value.angle), x - size / 2, y - size / 2 - 8 + bob, size, size, 4, 2); ctx.restore();
  if (!row) {
    outline(ctx, x, y + 9, 17, '#b1d1f2c0', 1.5); ctx.fillStyle = '#a6c8f1'; ctx.beginPath(); ctx.moveTo(x + Math.cos(value.angle) * 26, y + Math.sin(value.angle) * 26); ctx.lineTo(x + Math.cos(value.angle + .28) * 19, y + Math.sin(value.angle + .28) * 19); ctx.lineTo(x + Math.cos(value.angle - .28) * 19, y + Math.sin(value.angle - .28) * 19); ctx.fill();
    if (value.exposure > 1) { ctx.strokeStyle = '#eb9078'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, value.exposure / 100)); ctx.stroke(); }
  } else {
    if (selected) outline(ctx, x, y + 9, 21, '#a6bfda8a', 1.5);
    const modes = { patrol: '巡逻', investigate: '查声', search: '搜索', return: '归队', chase: '追踪' };
    if (value.mode !== 'patrol' || selected) { ctx.fillStyle = '#101825ed'; ctx.fillRect(x - 30, y - 49, 60, 19); text(ctx, modes[value.mode] || value.mode, x, y - 35, 10, value.awareness > 62 ? '#ecab92' : '#e4cea2'); }
    if (value.awareness > 1) { ctx.fillStyle = '#101522'; ctx.fillRect(x - 22, y + 18, 44, 4); ctx.fillStyle = '#e0a57b'; ctx.fillRect(x - 22, y + 18, 44 * Math.min(1, value.awareness / 100), 4); }
  }
}
function drawNoises(ctx, w) {
  for (const n of w.noises) {
    const [x, y] = point(n.x, n.y), progress = Math.min(1, n.age / n.lifetime), large = n.kind === 'stone';
    ctx.save(); ctx.globalAlpha = (1 - progress) * (large ? .75 : .23); ctx.strokeStyle = large ? '#b9d3f0' : '#d1b390'; ctx.lineWidth = large ? 2 : 1; ctx.beginPath(); ctx.arc(x, y, (large ? 10 + progress * n.radius * VIEW.tile : 4 + progress * 44), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (large && progress < .75) { ctx.fillStyle = '#172134df'; ctx.fillRect(x - 33, y - 12, 66, 21); text(ctx, '石子声响', x, y + 3, 10, '#bad0eb'); }
  }
  for (const p of w.projectiles || []) { const f = Math.min(1, p.age / p.flight), [x, y] = point(p.from.x + (p.target.x - p.from.x) * f, p.from.y + (p.target.y - p.from.y) * f); ctx.fillStyle = '#dce5ee'; ctx.beginPath(); ctx.arc(x, y - Math.sin(Math.PI * f) * 28, 3.5, 0, Math.PI * 2); ctx.fill(); }
}
export function drawStealth(ctx, w, assets, o = {}) {
  ctx.save(); ctx.clearRect(0, 0, VIEW.width, VIEW.height); drawGround(ctx, w, assets, o); drawVision(ctx, w, o);
  if (o.showRoutes) {
    routeLine(ctx, [{ x: w.player.x, y: w.player.y }, ...(w.player.path || [])], '#a6c7e29c');
    for (const g of w.guards) {
      const patrol = g.patrol.flatMap((p, i) => route(w, p, g.patrol[(i + 1) % g.patrol.length]));
      routeLine(ctx, patrol, '#e5bd865b');
      if (g.mode !== 'patrol') routeLine(ctx, [{ x: g.x, y: g.y }, ...(g.path || [])], '#e5bd869c');
    }
  }
  drawFacilities(ctx, w, assets); drawNoises(ctx, w);
  [...w.guards.map(g => ({ ...g, row: 1 })), { ...w.player, row: 0 }].sort((a, b) => a.y - b.y).forEach(a => actor(ctx, assets, a, a.row, w, a.id === o.selectedGuard));
  if (o.aim && w.phase === 'playing') { const [x, y] = point(o.aim.x, o.aim.y); outline(ctx, x, y, 12, '#abc5e76b', 1); ctx.fillStyle = '#bdd4eb'; ctx.fillRect(x - 2, y - 2, 4, 4); }
  if (!o.embedded) { text(ctx, 'MOONSHADOW / OBSERVE · ALTER · ESCAPE', 120, 42, 13, '#c0cbe1', 'left'); text(ctx, `封印 ${w.objective ? '已取得' : '待取回'}  ·  受光 ${Math.round(visibility(w) * 100)}%  ·  石子 ${w.stones}  ·  ${Math.floor(w.time)} 秒`, 1320, 42, 12, '#b9c2d3', 'right'); text(ctx, 'WASD 行动 · C 蹲行 · E 交互 · Space 投掷 · 点击地面规划路径', 720, 920, 12, '#acb6c9'); }
  const side = [['COURT', 2.5], ['GALLERY', 7.7], ['YARD', 12.2]]; side.forEach(([label, y]) => { ctx.save(); const [, py] = point(0, y); ctx.translate(76, py); ctx.rotate(-Math.PI / 2); text(ctx, label, 0, 0, 10, '#8291ad'); ctx.restore(); });
  ctx.restore();
}
