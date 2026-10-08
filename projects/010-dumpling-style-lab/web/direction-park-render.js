import { SIZE, GATE, TOOLS, entry, connected, facilityAt, canPlace, route } from './direction-park-engine.js';
export const VIEW = { width: 1440, height: 900, x: 720, y: 135, dx: 52, dy: 26 };
export const point = (x, y) => [VIEW.x + (x - y) * VIEW.dx, VIEW.y + (x + y) * VIEW.dy];
export function cellFromPoint(sx, sy) { const x = (sx - VIEW.x) / VIEW.dx, y = (sy - VIEW.y) / VIEW.dy; return [Math.floor((x + y) / 2 + .5), Math.floor((y - x) / 2 + .5)]; }
const FONT = '"Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
function label(ctx, text, x, y, size = 13, color = '#344c38', align = 'center') { ctx.fillStyle = color; ctx.font = `500 ${size}px ${FONT}`; ctx.textAlign = align; ctx.fillText(text, x, y); }
function tile(ctx, x, y, fill, stroke = null, inset = 0) {
  const [sx, sy] = point(x, y); ctx.beginPath(); ctx.moveTo(sx, sy - VIEW.dy + inset); ctx.lineTo(sx + VIEW.dx - inset, sy); ctx.lineTo(sx, sy + VIEW.dy - inset); ctx.lineTo(sx - VIEW.dx + inset, sy); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
export function facilityBounds(f) {
  const [x, y] = point(f.x + (f.w - 1) / 2, f.y + (f.h - 1) / 2), size = f.type === 'coaster' ? 302 : ['wheel', 'carousel'].includes(f.type) ? 230 : 135;
  const bottom = y + (f.w + f.h) * VIEW.dy / 2;
  return { x: x - size / 2, y: bottom - size, width: size, height: size, cx: x, bottom };
}
export function pickFacility(w, sx, sy) {
  return [...w.facilities].sort((a, b) => b.x + b.y - a.x - a.y).find(f => { const r = facilityBounds(f); return sx >= r.x && sx <= r.x + r.width && sy >= r.y && sy <= r.y + r.height; }) || null;
}
const spriteIndex = { wheel: 0, carousel: 1, coaster: 2, cafe: 3, fountain: 4, garden: 5 };
function facility(ctx, atlas, f, alpha = 1) {
  const r = facilityBounds(f), index = spriteIndex[f.type], sw = atlas.width / 3, sh = atlas.height / 2;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(atlas, index % 3 * sw, Math.floor(index / 3) * sh, sw, sh, r.x, r.y, r.width, r.height); ctx.restore();
}
function visitor(ctx, atlas, v, w, time, bubbles) {
  if (v.state === 'riding') return;
  let x = v.x, y = v.y;
  if (v.state === 'queue') {
    const f = w.facilities.find(f => f.id === v.destination);
    if (f) { const p = route(w, GATE, entry(f)), prev = p?.[p.length - 2], index = f.queue.indexOf(v.id); if (prev) { x += (prev[0] - x) * Math.min(.95, index * .18); y += (prev[1] - y) * Math.min(.95, index * .18); } }
  }
  let [sx, sy] = point(x, y); sx += (v.id % 3 - 1) * 7;
  const walking = ['walking', 'leaving', 'recovering'].includes(v.state), next = v.path[v.index], back = next && next[0] + next[1] < x + y;
  const sw = atlas.width / 4, sh = atlas.height / 2, size = 51, bob = walking ? Math.sin(time * 10 + v.id) * 1.5 : 0;
  ctx.save(); ctx.fillStyle = '#34453730'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(atlas, v.skin * sw, back ? sh : 0, sw, sh, sx - size * .375, sy - size + bob, size * .75, size); ctx.restore();
  if (bubbles && v.messageTime > 0 && v.id % 4 === 0) {
    ctx.font = `12px ${FONT}`; const width = ctx.measureText(v.message).width + 16;
    ctx.fillStyle = '#fcf7eae8'; ctx.fillRect(sx - width / 2, sy - 73, width, 21); label(ctx, v.message, sx, sy - 58, 12, '#435d44');
  } else if (v.state === 'queue' && v.wait > 12) { label(ctx, '…', sx, sy - 54, 17, '#9a663a'); }
}
export function drawPark(ctx, w, assets, options = {}) {
  const { hover = null, tool = 'road', grid = false, bubbles = true, inspected = null, guide = false, reducedMotion = false } = options;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height); ctx.drawImage(assets.terrain, 0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f3ebcb0b'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const vignette = ctx.createRadialGradient(720, 450, 300, 720, 450, 860); vignette.addColorStop(0, '#213a1900'); vignette.addColorStop(1, '#1c341c55'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (grid) for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) tile(ctx, x, y, null, '#edf3c540', 1);
  for (const road of w.roads) {
    const [x, y] = road.split(',').map(Number); tile(ctx, x, y, '#f0dcb1', '#b8a887', 0);
    const [sx, sy] = point(x, y); ctx.save(); ctx.strokeStyle = '#b7a98c69'; ctx.lineWidth = 1;
    for (const t of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(sx + t * 50 - 25, sy + t * 26 - 13); ctx.lineTo(sx + t * 50 + 25, sy + t * 26 + 13); ctx.stroke(); }
    ctx.restore();
  }
  const [gx, gy] = point(...GATE); tile(ctx, ...GATE, '#d5c294', '#a99e77');
  ctx.fillStyle = '#344d3cd9'; ctx.fillRect(gx - 44, gy + 27, 88, 24); label(ctx, '园区入口', gx, gy + 44, 12, '#fff0c8');
  for (const f of w.facilities) { const [x, y] = entry(f); tile(ctx, x, y, connected(w, f) ? '#eccd8566' : '#e6a867aa', connected(w, f) ? '#b5aa65' : '#a27244', 3); }
  if (hover && hover[0] >= 0 && hover[1] >= 0 && hover[0] < SIZE && hover[1] < SIZE) {
    const spec = TOOLS[tool], reason = canPlace(w, tool, ...hover);
    const width = spec.w || 1, height = spec.h || 1;
    for (let x = hover[0]; x < hover[0] + width; x++) for (let y = hover[1]; y < hover[1] + height; y++) if (x < SIZE && y < SIZE) tile(ctx, x, y, reason ? '#df8c6860' : '#e8f5c257', reason ? '#dd8665' : '#f5f0bd');
    if (spec.w && !reason) { facility(ctx, assets.atlas, { type: tool, x: hover[0], y: hover[1], w: spec.w, h: spec.h }, .45); tile(ctx, hover[0] + Math.floor(spec.w / 2), hover[1] + spec.h, '#e8c27380', '#aa854c', 3); }
  }
  const time = reducedMotion ? 0 : w.time;
  const scene = [...w.facilities.map(f => ({ type: 'facility', f, depth: f.x + f.y + (f.w + f.h) / 2 })), ...w.visitors.filter(v => v.state !== 'riding').map(v => ({ type: 'visitor', v, depth: v.x + v.y + .3 }))].sort((a, b) => a.depth - b.depth || (a.type === 'facility' ? -1 : 1));
  for (const object of scene) {
    if (object.type === 'visitor') { visitor(ctx, assets.visitors, object.v, w, time, bubbles); continue; }
    const f = object.f, r = facilityBounds(f); facility(ctx, assets.atlas, f);
    if (f.type === 'fountain' && !reducedMotion) {
      ctx.save(); ctx.strokeStyle = '#ccedfba8'; ctx.lineWidth = 1.2; const t = time % 2 / 2; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.ellipse(r.cx, r.bottom - 57, 8 + t * 23, 3 + t * 9, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (f.riders.length && !reducedMotion) {
      ctx.save(); ctx.globalAlpha = .45 + .2 * Math.sin(time * 3); ctx.fillStyle = '#fff5b1'; ctx.shadowColor = '#f8cc6f'; ctx.shadowBlur = 11;
      const lights = f.type === 'wheel' ? 9 : 5;
      for (let i = 0; i < lights; i++) { const a = i / lights * Math.PI * 2 + time * .25; const xx = r.cx + Math.cos(a) * r.width * .23, yy = r.y + r.height * .45 + Math.sin(a) * r.height * .26; ctx.beginPath(); ctx.arc(xx, yy, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (!connected(w, f) || f.queue.length || f.riders.length || inspected === f.id) {
      const name = !connected(w, f) ? '未接通步道' : f.riders.length ? `${f.riders.length} 人游玩 · ${f.queue.length} 人排队` : `${f.queue.length} 人排队`;
      const width = 124, y = r.y - 10; ctx.fillStyle = connected(w, f) ? '#314f3ae8' : '#8c633de8'; ctx.fillRect(r.cx - width / 2, y - 19, width, 25); label(ctx, name, r.cx, y - 2, 11, '#ffefcb');
      if (f.riders.length) { ctx.fillStyle = '#e6c787'; ctx.fillRect(r.cx - width / 2, y + 6, width * (1 - f.remaining / TOOLS[f.type].duration), 3); }
    }
  }
  if (inspected) {
    const f = w.facilities.find(f => f.id === inspected); if (f) { const [x, y] = entry(f); tile(ctx, x, y, '#ffffce70', '#fff2a5', 2); }
  }
  if (guide) {
    tile(ctx, 6, 7, '#fff0bd70', '#fff4c6', 2); const [x, y] = point(6, 7);
    ctx.strokeStyle = '#fff3b6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x, y - 8); ctx.stroke();
    ctx.fillStyle = '#294833f0'; ctx.fillRect(x - 92, y - 63, 184, 29); label(ctx, '铺路，接通两座设施', x, y - 43, 14, '#fff4cf');
  }
  label(ctx, 'WINDHAVEN  /  GARDEN PARK', 75, 64, 14, '#faf0d0', 'left'); label(ctx, '步道连接  ·  游客选择  ·  排队与评价', 1365, 64, 13, '#f5edcf', 'right');
}
