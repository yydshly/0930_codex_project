import { ROOMS, EQUIPMENT, ROLES, powered, task, isFloor, COLS, ROWS } from './direction-shift-engine.js';
export const VIEW = { width: 1440, height: 900, x: 150, y: 135, tile: 46 };
export const point = (x, y) => [VIEW.x + (x + .5) * VIEW.tile, VIEW.y + (y + .5) * VIEW.tile];
export const cellFromPoint = (x, y) => [Math.floor((x - VIEW.x) / VIEW.tile), Math.floor((y - VIEW.y) / VIEW.tile)];
const FONT = '"Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
function label(ctx, text, x, y, size = 12, color = '#cfdee3', align = 'center') { ctx.fillStyle = color; ctx.font = `500 ${size}px ${FONT}`; ctx.textAlign = align; ctx.fillText(text, x, y); }
function sprite(ctx, atlas, n, x, y, width, height, columns = 3) { const sw = atlas.width / columns, sh = atlas.height / 2; ctx.drawImage(atlas, n % columns * sw, Math.floor(n / columns) * sh, sw, sh, x, y, width, height); }
function deck(ctx, atlas, x, y, width, height) { const sw = atlas.width / 3, sh = atlas.height / 2; ctx.drawImage(atlas, 2 * sw + sw * .07, sh + sh * .055, sw * .86, sh * .83, x, y, width, height); }
function glow(ctx, x, y, radius, color) { const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius); gradient.addColorStop(0, color); gradient.addColorStop(1, '#67cfc500'); ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); }
function person(ctx, a, art, w, assets, color, caption, selected, reducedMotion) {
  const [x, y] = point(a.x, a.y), walking = a.state === 'walking';
  ctx.save(); ctx.fillStyle = '#030c1b80'; ctx.beginPath(); ctx.ellipse(x, y + 10, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  const bob = walking && !reducedMotion ? Math.sin(w.time * 11) * 1.5 : 0; sprite(ctx, assets.people, art, x - 25, y - 49 + bob, 50, 66, 4);
  if (selected) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 11, 21, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function annotation(ctx, a, caption, color, boxes) {
  const [x, y] = point(a.x, a.y), width = Math.max(a.boarded ? 36 : 54, caption.length * 10 + 12), height = a.state === 'working' ? 28 : 20;
  const rect = { x: x - width / 2, y: y - 71, w: width, h: height };
  const overlaps = b => rect.x < b.x + b.w + 4 && rect.x + rect.w + 4 > b.x && rect.y < b.y + b.h + 4 && rect.y + rect.h + 4 > b.y;
  if (boxes.some(overlaps)) { rect.y = y + 24; if (boxes.some(overlaps)) { rect.y = y - 71; for (let i = 0; i < 8; i++) { const collision = boxes.find(overlaps); if (!collision) break; rect.y = collision.y - height - 5; } } }
  boxes.push(rect);
  if (rect.y < y - 76 || rect.y > y) { ctx.strokeStyle = color + '66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, rect.y > y ? rect.y : rect.y + height); ctx.lineTo(x, rect.y > y ? y + 17 : y - 43); ctx.stroke(); }
  ctx.fillStyle = '#0d2031ee'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); label(ctx, caption, x, rect.y + 14, 10, color);
  if (a.state === 'working') { ctx.fillStyle = '#253b4f'; ctx.fillRect(rect.x + 4, rect.y + 21, width - 8, 4); ctx.fillStyle = color; ctx.fillRect(rect.x + 4, rect.y + 21, (width - 8) * a.progress / a.duration, 4); }
}
export function drawShift(ctx, w, assets, options = {}) {
  const { active = 'engineer', paths = true, hover = null, reducedMotion = false } = options, t = VIEW.tile, boxes = [];
  ctx.clearRect(0, 0, VIEW.width, VIEW.height); ctx.drawImage(assets.background, 0, 0, VIEW.width, VIEW.height); ctx.fillStyle = '#06162555'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Painted room panels form the scene; the rule engine owns their connected walkable cells.
  for (const room of ROOMS) {
    const x = VIEW.x + room.x * t - 10, y = VIEW.y + room.y * t - 10, width = room.w * t + 20, height = room.h * t + 20;
    ctx.shadowColor = '#020913'; ctx.shadowBlur = 22; sprite(ctx, assets.rooms, room.art, x, y, width, height); ctx.shadowBlur = 0;
    if (!powered(w) && room.art < 3) { ctx.fillStyle = '#06172670'; ctx.fillRect(x + 22, y + 20, width - 44, height - 40); }
  }
  for (let x = 1; x < 24; x += 4) deck(ctx, assets.rooms, VIEW.x + x * t, VIEW.y + 7 * t, Math.min(4, 24 - x) * t + 1, 2 * t);
  // Floor sections overlap the low cutaway walls at traversable room openings.
  for (const x of [4, 12, 20]) deck(ctx, assets.rooms, VIEW.x + x * t, VIEW.y + 6.5 * t, t, t);
  for (const x of [4, 19]) deck(ctx, assets.rooms, VIEW.x + x * t, VIEW.y + 8.3 * t, t, t);
  for (const room of ROOMS) { const x = VIEW.x + room.x * t + 10, y = room.y < 7 ? VIEW.y + room.y * t - 37 : VIEW.y + (room.y + room.h) * t + 4; ctx.fillStyle = '#0c1e30ed'; ctx.fillRect(x, y, 142, 25); boxes.push({ x, y, w: 142, h: 25 }); label(ctx, room.name, x + 13, y + 17, 12, '#dfe3d0', 'left'); }
  if (paths) {
    for (const a of [...w.crew, ...w.patients]) {
      if (a.path.length < 2 || a.boarded || !['walking', 'waiting'].includes(a.state)) continue;
      const color = ROLES.find(r => r.id === a.id)?.color || '#a5cbd8'; ctx.strokeStyle = color + '88'; ctx.lineWidth = a.id === active ? 2 : 1; ctx.setLineDash([4, 5]); ctx.beginPath(); const [sx, sy] = point(a.x, a.y); ctx.moveTo(sx, sy); for (const p of a.path.slice(a.index)) { const [x, y] = point(...p); ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    }
  }
  for (const e of EQUIPMENT) {
    if (e.id === 'fire' && !w.fire) continue;
    const [x, y] = point(e.x, e.y), size = e.id === 'fire' ? 94 : e.id === 'console' ? 90 : 76;
    if (e.id === 'fire') glow(ctx, x, y - 13, 90, '#f2a36577'); else if (e.id === 'beacon' && w.beacon || e.id === 'reactor' && powered(w)) glow(ctx, x, y - 18, 65, '#84e8da48');
    sprite(ctx, assets.equipment, e.art, x - size / 2, y - size * .7, size, size);
    const done = e.id === 'reactor' ? w.reactor : e.id === 'seal' ? !w.leak : e.id === 'beacon' ? w.beacon : null;
    const text = e.id === 'reactor' ? powered(w) ? '供电恢复' : w.reactor ? '待接通' : '核心故障' : e.id === 'seal' ? w.leak ? '泄漏中' : '已封漏' : e.id === 'beacon' ? w.beacon ? '信标就绪' : '信标故障' : e.name;
    if (!(e.id === 'beacon' && w.boarding)) { const ly = y - size * .7 - 23; ctx.fillStyle = '#102337ee'; ctx.fillRect(x - 42, ly, 84, 21); boxes.push({ x: x - 42, y: ly, w: 84, h: 21 }); label(ctx, text, x, y - size * .7 - 8, 10, done ? '#a5e5c7' : e.id === 'console' || e.id === 'bed' ? '#d2e2e2' : '#efbf88'); }
  }
  const scene = [...w.crew.map((a, i) => ({ a, art: i * 2 + Number(a.state === 'walking'), color: ROLES[i].color, caption: `${ROLES[i].title} · ${ROLES[i].name}` })), ...w.patients.map(p => ({ a: p, art: p.health >= 90 ? 7 : 6, color: p.health >= 90 ? '#b2ddc9' : p.stable ? '#dac596' : '#e6aa9a', caption: `${p.name} · ${p.boarded ? '已抵达' : p.health >= 90 ? '可撤离' : p.stable ? '已稳定' : '待急救'}` }))].sort((a, b) => a.a.y - b.a.y || a.a.x - b.a.x);
  for (const s of scene) person(ctx, s.a, s.art, w, assets, s.color, s.a.boarded ? ROLES.find(r => r.id === s.a.id)?.name || s.a.name : s.caption, s.a.id === active, reducedMotion);
  for (const s of scene) annotation(ctx, s.a, s.a.boarded ? ROLES.find(r => r.id === s.a.id)?.name || s.a.name : s.caption, s.color, boxes);
  if (hover && hover[0] >= 0 && hover[0] < COLS && hover[1] >= 0 && hover[1] < ROWS && isFloor(...hover)) { ctx.strokeStyle = '#ffdaa699'; ctx.lineWidth = 1.5; ctx.strokeRect(VIEW.x + hover[0] * t + 3, VIEW.y + hover[1] * t + 3, t - 6, t - 6); }
  label(ctx, 'WAYPOINT / THE NIGHT SHIFT', 75, 64, 14, '#d0e5e3', 'left'); label(ctx, w.scenario === 'pressure' ? '紧急值守 · 四位伤员 · 较短撤离窗口' : '标准夜班 · 三位伤员 · 三种职责', 1365, 64, 12, '#dfd6c2', 'right');
  const current = w.crew.find(a => a.id === active); const currentText = w.phase === 'won' ? '所有乘员与值守人员已登船。工程、医护与调度共同完成了这一班。' : current.job ? `${ROLES.find(r => r.id === active).title}：${task(w, current.job).name}${current.state === 'walking' ? ' · 前往现场' : ' · 工作中'}` : w.boarding ? '三位值守人员正在前往接驳舱' : '选择角色，再点击设备、伤员或右侧任务。已下达的工作会继续进行。';
  ctx.fillStyle = '#0a1e30ed'; ctx.fillRect(140, 790, 1160, 49); label(ctx, currentText, 720, 820, 13, '#e4dfcb');
}
