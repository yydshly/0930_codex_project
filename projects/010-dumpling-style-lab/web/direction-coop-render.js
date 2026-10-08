import { COLS, ROWS, TILE, at, TOOLS } from './direction-coop-engine.js';
export const VIEW = { width: 1440, height: 900, x: 144, y: 185 };
export const point = (x, y) => [VIEW.x + (x + .5) * TILE, VIEW.y + (y + .5) * TILE];
export const cellFromPoint = (x, y) => [Math.floor((x - VIEW.x) / TILE), Math.floor((y - VIEW.y) / TILE)];
const FONT = '"Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
function label(ctx, text, x, y, size = 14, color = '#dfecf3', align = 'left') { ctx.fillStyle = color; ctx.font = `500 ${size}px ${FONT}`; ctx.textAlign = align; ctx.fillText(text, x, y); }
const PROP_CROPS = [[49, 94, 413, 350], [49, 94, 413, 350], [49, 24, 412, 488], [52, 211, 413, 203], [130, 0, 257, 457], [40, 0, 435, 480]];
function sprite(ctx, atlas, index, x, bottom, width, height, columns = 3) { const sw = atlas.width / columns, sh = atlas.height / 2, crop = columns === 3 ? PROP_CROPS[index].map((n, i) => n * (i % 2 ? sh : sw) / 512) : [0, 0, sw, sh]; ctx.drawImage(atlas, index % columns * sw + crop[0], Math.floor(index / columns) * sh + crop[1], crop[2], crop[3], x, bottom - height, width, height); }
function glow(ctx, x, y, size, color) { const gradient = ctx.createRadialGradient(x, y, 0, x, y, size); gradient.addColorStop(0, color); gradient.addColorStop(1, '#efcb7600'); ctx.fillStyle = gradient; ctx.fillRect(x - size, y - size, size * 2, size * 2); }
export function drawCoop(ctx, w, assets, options = {}) {
  const { editing = false, hover = null, tool = 'stone', active = 0, mode = 'solo', reducedMotion = false } = options, map = w.map;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height); ctx.drawImage(assets.background, 0, 0, VIEW.width, VIEW.height);
  const shade = ctx.createLinearGradient(0, 200, 0, 900); shade.addColorStop(0, '#09152300'); shade.addColorStop(.6, '#071a3040'); shade.addColorStop(1, '#071626bc'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 1440, 900);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const type = at(map, x, y), sx = VIEW.x + x * TILE, bottom = VIEW.y + (y + 1) * TILE;
    if (type === 'stone' || type === 'ice') {
      ctx.fillStyle = type === 'ice' ? '#59a7cdd0' : '#283c51'; ctx.fillRect(sx, bottom - TILE, TILE, TILE);
      sprite(ctx, assets.props, type === 'ice' ? 1 : 0, sx - 1, bottom + 1, TILE + 2, TILE + 2);
      if (at(map, x, y - 1) === 'empty' || !['stone', 'ice'].includes(at(map, x, y - 1))) { ctx.strokeStyle = type === 'ice' ? '#a8eeff' : '#a5b4bc9c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, bottom - TILE); ctx.lineTo(sx + TILE, bottom - TILE); ctx.stroke(); }
    } else if (type === 'plate') {
      if (w.pressed && !editing) glow(ctx, sx + 24, bottom - 9, 75, '#ffc55c55');
      sprite(ctx, assets.props, 3, sx - 2, bottom + 1, 52, 33); label(ctx, w.pressed && !editing ? '已开门' : '开门踏板', sx + 24, bottom - 39, 11, '#f8d598', 'center');
    } else if (type === 'gate') {
      // One tall art object covers a contiguous vertical gate column; every gate tile still collides.
      if (at(map, x, y + 1) === 'gate') continue;
      let rows = 1; while (at(map, x, y - rows) === 'gate') rows++;
      const opened = !editing && w.gateTimer > 0;
      ctx.save(); if (opened) ctx.globalAlpha = .24; sprite(ctx, assets.props, 2, sx - 7, bottom + 2, TILE + 14, rows * TILE + 12); ctx.restore();
      if (opened) { glow(ctx, sx + 24, bottom - 64, 55, '#ffc55c35'); label(ctx, `${w.gateTimer.toFixed(1)} 秒`, sx + 24, bottom - rows * TILE - 14, 11, '#ffdd9f', 'center'); }
    } else if (type === 'checkpoint') { glow(ctx, sx + 24, bottom - 47, 70, '#f2bd5b44'); sprite(ctx, assets.props, 4, sx - 12, bottom + 2, 72, 92); label(ctx, '营灯', sx + 24, bottom - 101, 11, '#efd6a6', 'center'); }
    else if (type === 'exit') { glow(ctx, sx + 24, bottom - 65, 110, '#f2bf5b50'); sprite(ctx, assets.props, 5, sx - 27, bottom + 5, 102, 133); label(ctx, '共同抵达', sx + 24, bottom - 142, 12, '#ffdfa5', 'center'); }
  }
  if (editing) {
    ctx.strokeStyle = '#d1e7f224'; ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(VIEW.x + x * TILE, VIEW.y); ctx.lineTo(VIEW.x + x * TILE, VIEW.y + ROWS * TILE); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(VIEW.x, VIEW.y + y * TILE); ctx.lineTo(VIEW.x + COLS * TILE, VIEW.y + y * TILE); ctx.stroke(); }
    if (hover && hover[0] >= 0 && hover[0] < COLS && hover[1] >= 0 && hover[1] < ROWS) { ctx.fillStyle = '#f9cf7450'; ctx.fillRect(VIEW.x + hover[0] * TILE, VIEW.y + hover[1] * TILE, TILE, TILE); }
  }
  const players = editing ? map.starts.map((start, id) => ({ id, x: (start[0] + .5) * TILE, y: (start[1] + 1) * TILE, vx: 0, grounded: true, frozen: false, facing: 1 })) : w.players;
  for (const p of players) {
    const x = VIEW.x + p.x, y = VIEW.y + p.y, frame = !p.grounded && !p.frozen ? 3 : Math.abs(p.vx) > 1 && !reducedMotion ? 1 + Math.floor(w.time * 10) % 2 : 0;
    ctx.fillStyle = '#07192868'; ctx.beginPath(); ctx.ellipse(x, y + 4, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    glow(ctx, x + p.facing * 10, y - 32, p.frozen ? 43 : 36, p.frozen ? '#7be1ff55' : '#ffc76e44');
    ctx.save(); ctx.translate(x, y); ctx.scale(p.facing, 1); sprite(ctx, assets.people, p.id * 4 + frame, -36, 3, 72, 96, 4); ctx.restore();
    if (p.frozen) { ctx.fillStyle = '#88dcff35'; ctx.strokeStyle = '#adeeffbf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 29, y); ctx.lineTo(x - 35, y - 38); ctx.lineTo(x - 17, y - 72); ctx.lineTo(x + 15, y - 80); ctx.lineTo(x + 34, y - 30); ctx.lineTo(x + 24, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const text = p.frozen ? '靠近救援' : p.arrived ? '等你一起' : editing ? p.id ? '赭起点' : '青起点' : p.id === active && mode === 'solo' ? '正在操控' : p.id ? '赭色同伴' : '青色同伴';
    const color = p.id ? '#f0b582' : '#99dcd5', near = Math.abs(players[0].x - players[1].x) < 80 && Math.abs(players[0].y - players[1].y) < 30, lift = near && p.id === 0 ? 26 : 0;
    ctx.fillStyle = '#132537dc'; ctx.fillRect(x - 35, y - 125 - lift, 70, 23); label(ctx, text, x, y - 109 - lift, 11, color, 'center');
  }
  if (!reducedMotion) {
    ctx.fillStyle = '#e2edf855'; for (let i = 0; i < 34; i++) { const x = (i * 83.3 + w.time * (8 + i % 5)) % 1440, y = (i * 43.5 + w.time * 9) % 640; ctx.fillRect(x, y, 1.4, 1.4); }
  }
  label(ctx, 'MIST RIDGE  /  TOGETHER, TO THE LIGHT', 75, 63, 14, '#d3e5ed');
  label(ctx, editing ? `正在设计 · ${TOOLS[tool]} · 当前设计第 ${map.revision} 版` : map.title, 1365, 63, 13, '#c9dce6', 'right');
  ctx.fillStyle = '#0b1c2bdc'; ctx.fillRect(120, 794, 1200, 50);
  const message = editing ? '踏板会打开所有机械门；寒冰会困住角色；营灯记录落脚点。修改后点击「立即试玩」。' : w.messageTime ? w.message : w.players.some(p => p.frozen) ? '靠近被冻住的同伴，按 F 或 Enter 救援；两人都冻住时，可以返回营灯。' : '青色：A / D 移动 · W 跳跃 · F 救援      赭色：← / → 移动 · ↑ 跳跃 · Enter 救援';
  label(ctx, message, 720, 825, 13, '#e3dcc8', 'center');
}
