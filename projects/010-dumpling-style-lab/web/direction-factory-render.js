import { COLS, ROWS, ORES, paths, DIRECTIONS, at, canPlace } from './direction-factory-engine.js';
export const VIEW = { width: 1440, height: 900, x: 132, y: 118, cell: 62 };
export const point = (x, y) => [VIEW.x + (x + .5) * VIEW.cell, VIEW.y + (y + .5) * VIEW.cell];
export function cellFromPoint(x, y) { return [Math.floor((x - VIEW.x) / VIEW.cell), Math.floor((y - VIEW.y) / VIEW.cell)]; }
const FONT = '"Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
function text(ctx, label, x, y, size = 15, color = '#efe5ce', align = 'center') {
  ctx.font = `500 ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(label, x, y);
}
function sprite(ctx, atlas, index, x, y, size, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const sw = atlas.width / 3, sh = atlas.height / 2;
  ctx.drawImage(atlas, index % 3 * sw, Math.floor(index / 3) * sh, sw, sh, -size / 2, -size / 2, size, size); ctx.restore();
}
function arrow(ctx, x, y, dir, color, size = 6) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir * Math.PI / 2); ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-size, -size); ctx.lineTo(0, 0); ctx.lineTo(-size, size); ctx.stroke(); ctx.restore();
}
function belt(ctx, c, time) {
  const [x, y] = point(c.x, c.y); ctx.save(); ctx.translate(x, y); ctx.rotate(c.dir * Math.PI / 2);
  ctx.shadowColor = '#15232390'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#273a3d'; ctx.fillRect(-32, -17, 64, 34); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#14272a'; ctx.fillRect(-31, -12, 62, 24);
  ctx.strokeStyle = '#73897e'; ctx.lineWidth = 3; ctx.strokeRect(-31, -16, 62, 32);
  ctx.strokeStyle = '#607470'; ctx.lineWidth = 2;
  for (let i = -40; i < 50; i += 11) { const dx = i + (time * 25 % 11); if (dx > -31 && dx < 31) { ctx.beginPath(); ctx.moveTo(dx, -10); ctx.lineTo(dx, 10); ctx.stroke(); } }
  ctx.fillStyle = '#a4b8a3'; for (const xx of [-25, 25]) for (const yy of [-16, 16]) { ctx.beginPath(); ctx.arc(xx, yy, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); arrow(ctx, x + DIRECTIONS[c.dir][0] * 20, y + DIRECTIONS[c.dir][1] * 20, c.dir, '#e8c88c', 5);
}
export function drawFactory(ctx, w, assets, options = {}) {
  const { atlas, terrain } = assets, { hover = null, tool = 'belt', dir = 0, grid = false, flow = true, reducedMotion = false } = options;
  const time = w.paused || reducedMotion ? 0 : w.time;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height); ctx.drawImage(terrain, 0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#102c322c'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const vignette = ctx.createRadialGradient(720, 430, 260, 720, 450, 850); vignette.addColorStop(0, '#09272c00'); vignette.addColorStop(1, '#0a1c27ad'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1440, 900);
  for (const path of paths) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); path.forEach(([x, y], i) => { const p = point(x, y); i ? ctx.lineTo(...p) : ctx.moveTo(...p); });
    ctx.strokeStyle = '#25282066'; ctx.lineWidth = 31; ctx.stroke(); ctx.strokeStyle = '#d9bf8425'; ctx.lineWidth = 26; ctx.stroke();
    ctx.save(); ctx.setLineDash([6, 20]); ctx.lineDashOffset = -time * 6; ctx.strokeStyle = '#dec39155'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  if (grid) {
    ctx.strokeStyle = '#d8e6cf35'; ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(VIEW.x + x * 62, VIEW.y); ctx.lineTo(VIEW.x + x * 62, VIEW.y + ROWS * 62); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(VIEW.x, VIEW.y + y * 62); ctx.lineTo(VIEW.x + COLS * 62, VIEW.y + y * 62); ctx.stroke(); }
  }
  for (const [x, y] of ORES) { const p = point(x, y); sprite(ctx, atlas, 5, ...p, 71); if (!at(w, x, y)) text(ctx, '铜矿床', p[0], p[1] + 46, 12, '#b4e0cc'); }
  for (const c of w.cells) if (c.type === 'belt') belt(ctx, c, time);
  for (const c of w.cells) {
    const [x, y] = point(c.x, c.y);
    if (c.type === 'splitter') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(c.dir * Math.PI / 2); ctx.shadowColor = '#142e2ab0'; ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(-20, -20, 25, 25); g.addColorStop(0, '#6e9a8e'); g.addColorStop(1, '#233e3e'); ctx.fillStyle = g; ctx.fillRect(-24, -24, 48, 48); ctx.shadowBlur = 0; ctx.strokeStyle = '#b1b299'; ctx.lineWidth = 3; ctx.strokeRect(-24, -24, 48, 48);
      ctx.strokeStyle = '#d7bb78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(0, 0); ctx.moveTo(0, -24); ctx.lineTo(0, 24); ctx.stroke(); ctx.restore();
      arrow(ctx, x, y, (c.dir + 1) % 4, '#f6d38b', 6); arrow(ctx, x, y, (c.dir + 3) % 4, '#f6d38b', 6);
    } else if (c.type !== 'belt') {
      const index = { mine: 0, factory: 1, turret: 2, core: 3 }[c.type];
      const size = c.type === 'core' ? 126 : c.type === 'turret' ? 85 : 90;
      sprite(ctx, atlas, index, x, y - 5, size, c.type === 'turret' ? c.aim + Math.PI / 2 : 0);
      if (c.type === 'factory' && c.production > 0 && !w.paused) {
        const g = ctx.createRadialGradient(x, y + 14, 0, x, y + 14, 42); g.addColorStop(0, '#ffb23b55'); g.addColorStop(1, '#ffb23b00'); ctx.fillStyle = g; ctx.fillRect(x - 42, y - 28, 84, 84);
      }
      if (c.type === 'core') {
        text(ctx, '指挥核心', x, y - 75, 16); ctx.fillStyle = '#172c32'; ctx.fillRect(x - 34, y + 61, 68, 6); ctx.fillStyle = w.health > 40 ? '#97d7b2' : '#f17d58'; ctx.fillRect(x - 34, y + 61, 68 * w.health / 100, 6);
      } else {
        const count = c.type === 'turret' ? c.ammo : c.type === 'factory' ? c.ammo : c.queue.length;
        ctx.fillStyle = '#142c30e6'; ctx.fillRect(x - 28, y + 34, 56, 19); text(ctx, c.type === 'turret' ? `${count} 弹药` : c.type === 'factory' ? `${c.ore} → ${count}` : `${count} 矿石`, x, y + 48, 11, count ? '#f6d18b' : '#acbcae');
        if (c.type !== 'turret') arrow(ctx, x + DIRECTIONS[c.dir][0] * 44, y + DIRECTIONS[c.dir][1] * 44, c.dir, '#f4d89b', 6);
      }
    }
  }
  if (flow) for (const p of w.packets) {
    const t = Math.min(1, p.age / .34), [x, y] = point(p.x + (p.tx - p.x) * t, p.y + (p.ty - p.y) * t);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.shadowColor = p.item === 'ore' ? '#7de0c7' : '#ffe09b'; ctx.shadowBlur = 8; ctx.fillStyle = p.item === 'ore' ? '#9bddce' : '#ffc875'; ctx.fillRect(-4, -4, 8, 8); ctx.shadowBlur = 0; ctx.strokeStyle = '#102a2a'; ctx.lineWidth = 1; ctx.strokeRect(-4, -4, 8, 8); ctx.restore();
  }
  for (const e of w.enemies) {
    const [x, y] = point(e.x, e.y), target = paths[e.lane][e.point];
    sprite(ctx, atlas, 4, x, y, e.heavy ? 64 : 48, Math.atan2(target[1] - e.y, target[0] - e.x) + Math.PI / 2);
    ctx.fillStyle = '#273036'; ctx.fillRect(x - 19, y - 33, 38, 4); ctx.fillStyle = e.heavy ? '#ffcf78' : '#eb8f71'; ctx.fillRect(x - 19, y - 33, 38 * e.hp / e.maxHP, 4);
  }
  for (const b of w.bullets) {
    const [x, y] = point(b.x, b.y); ctx.save(); ctx.shadowColor = '#ffcf72'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff1be'; ctx.beginPath(); ctx.arc(x, y, 3.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (!reducedMotion) for (const p of w.impacts) {
    const [x, y] = point(p.x, p.y), t = p.age / .7; ctx.save(); ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#f9d29a'; ctx.lineWidth = (1 - t) * 4; ctx.beginPath(); ctx.arc(x, y, (p.big ? 36 : 17) * t, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = i * 6.28 / 7; ctx.fillStyle = i % 2 ? '#fedba4' : '#de8555'; ctx.fillRect(x + Math.cos(a) * t * 35, y + Math.sin(a) * t * 35, 3, 3); } ctx.restore();
  }
  for (const y of [2, 8]) { const [x, yy] = point(18, y); ctx.strokeStyle = '#f7aa7666'; ctx.lineWidth = 2; ctx.strokeRect(x - 23, yy - 23, 46, 46); arrow(ctx, x + 5, yy, 2, '#ffb285', 8); }
  text(ctx, '北侧袭击通道', ...point(16, 1), 12, '#f6d0a6'); text(ctx, '南侧袭击通道', ...point(16, 9), 12, '#f6d0a6');
  text(ctx, 'COPPER BASIN  /  SECTOR 07', 96, 73, 14, '#e9ddbd', 'left');
  text(ctx, '采矿  →  加工  →  输送  →  防守', 1344, 73, 13, '#e8e3cd', 'right');
  if (hover) {
    const [hx, hy] = hover, [x, y] = point(hx, hy), c = at(w, hx, hy), reason = canPlace(w, tool, hx, hy);
    if (hx >= 0 && hx < COLS && hy >= 0 && hy < ROWS) {
      if (c?.type === 'turret') { ctx.strokeStyle = '#cfe4b97a'; ctx.fillStyle = '#cfedb610'; ctx.beginPath(); ctx.arc(x, y, 4.5 * 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = reason ? '#fd9876' : '#d4edbe'; ctx.lineWidth = 2; ctx.fillStyle = reason ? '#ee927d16' : '#dbf1bb20'; ctx.fillRect(x - 31, y - 31, 62, 62); ctx.strokeRect(x - 30, y - 30, 60, 60);
      if (!c && !reason && !['belt', 'splitter', 'erase'].includes(tool)) { ctx.save(); ctx.globalAlpha = .55; sprite(ctx, atlas, { mine: 0, factory: 1, turret: 2 }[tool], x, y - 5, 85); ctx.restore(); }
      if (!c && !reason && tool === 'belt') arrow(ctx, x, y, dir, '#f5e6b9', 12);
    }
  }
  if (options.guide) {
    const [x, y] = point(10, 5); ctx.save(); ctx.strokeStyle = '#f4dda5'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(x - 29, y - 29, 58, 58); ctx.restore(); text(ctx, '在此铺一格向右传送带', x, y - 44, 14, '#fff0c6');
  }
}
