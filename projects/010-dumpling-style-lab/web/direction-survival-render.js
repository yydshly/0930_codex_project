import { MAP } from './direction-survival-engine.js';

// Original bitmap materials and alpha sprites; this scene is a 2D painterly world.
const ART = './assets/directions/survival/';
const TILE_W = 60, TILE_H = 49;
const texIndex = { grass: 0, path: 1, mud: 2, rock: 3, bridge: 4, river: 5, wall: 6 };
const names = { tree: 0, cabin: 1, wreck: 2, pump: 3, radio: 4, fire: 5, shelter: 6, wood: 7, purifier: 8, empty: 9, stump: 10, rock: 11 };
const pointAt = (x, y) => ({ x: (x + .5) * TILE_W, y: (y + .5) * TILE_H });
const hash = (x, y) => Math.abs(Math.sin(x * 29.31 + y * 87.17) * 43758.2) % 1;
function loadImage(name) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法装载美术：${name}。请检查服务后重试。`));
    image.src = ART + name;
  });
}

// Alpha bounds are sprite draw coordinates, not edited or regenerated assets.
function cells(image, columns, rows) {
  const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const frames = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const x0 = Math.round(col * c.width / columns), x1 = Math.round((col + 1) * c.width / columns);
    const y0 = Math.round(row * c.height / rows), y1 = Math.round((row + 1) * c.height / rows);
    let left = x1, top = y1, right = x0, bottom = y0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (data[(y * c.width + x) * 4 + 3] > 20) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right <= left || bottom <= top) throw new Error('角色或物件图集缺少可见帧。');
    frames.push({ x: left, y: top, w: right - left + 1, h: bottom - top + 1 });
  }
  return frames;
}

export async function createSurvivalRenderer(canvas, { onProgress = () => {} } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法创建二维画布。');
  let count = 0, disposed = false;
  const art = await Promise.all(['valley.png', 'ground-atlas.png', 'props-atlas.png', 'actors-atlas.png'].map(async name => {
    const image = await loadImage(name); onProgress(`美术已装载 ${++count}/4`); return image;
  }));
  const [valley, ground, props, actors] = art;
  // The generated props have uneven row gutters; these measured alpha bounds
  // keep whole roofs, tree bases and poles intact without changing the PNG.
  const propCells = [
    [44, 8, 272, 388], [368, 44, 356, 352], [748, 120, 328, 272], [1132, 108, 296, 280],
    [84, 400, 200, 336], [376, 508, 316, 224], [728, 432, 380, 296], [1132, 472, 296, 228],
    [84, 756, 188, 264], [400, 748, 272, 276], [724, 776, 364, 248], [1120, 748, 312, 288],
  ].map(([x, y, w, h]) => ({ x, y, w, h }));
  const actorCells = cells(actors, 4, 2);
  const groundCache = document.createElement('canvas'); groundCache.width = MAP.width * TILE_W; groundCache.height = MAP.height * TILE_H;
  const gc = groundCache.getContext('2d');
  const tw = ground.width / 4, th = ground.height / 2;
  for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) {
    const kind = MAP.terrain[y][x], index = ['path', 'mud'].includes(kind) ? 0 : texIndex[kind] ?? 7;
    gc.save(); gc.translate((x + .5) * TILE_W, (y + .5) * TILE_H);
    if (!['bridge', 'river', 'path'].includes(kind)) gc.scale(hash(x, y) > .5 ? -1 : 1, hash(y, x) > .6 ? -1 : 1);
    gc.drawImage(ground, index % 4 * tw + 1, Math.floor(index / 4) * th + 1, tw - 2, th - 2, -TILE_W / 2, -TILE_H / 2, TILE_W + .6, TILE_H + .6);
    gc.restore();
    const tint = hash(x + 2, y + 7) * .07;
    gc.fillStyle = `rgba(28,43,34,${tint})`; gc.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
  }
  for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) {
    const kind = MAP.terrain[y][x]; if (!['path', 'mud'].includes(kind)) continue;
    const index = texIndex[kind], xx = x * TILE_W, yy = y * TILE_H;
    gc.save(); gc.beginPath(); gc.roundRect(xx + 4, yy + 3, TILE_W - 8, TILE_H - 6, kind === 'mud' ? 20 : 13);
    if (MAP.terrain[y]?.[x - 1] === kind) gc.rect(xx - 2, yy + 3, 18, TILE_H - 6);
    if (MAP.terrain[y]?.[x + 1] === kind) gc.rect(xx + TILE_W - 16, yy + 3, 18, TILE_H - 6);
    if (MAP.terrain[y - 1]?.[x] === kind) gc.rect(xx + 4, yy - 2, TILE_W - 8, 16);
    if (MAP.terrain[y + 1]?.[x] === kind) gc.rect(xx + 4, yy + TILE_H - 14, TILE_W - 8, 16);
    gc.clip(); gc.globalAlpha = kind === 'mud' ? .85 : .9;
    gc.drawImage(ground, index % 4 * tw + 2, Math.floor(index / 4) * th + 2, tw - 4, th - 4, xx - 2, yy - 2, TILE_W + 4, TILE_H + 4); gc.restore();
  }
  let view = { width: 1440, height: 960, scale: 1, cx: groundCache.width / 2, cy: groundCache.height / 2, cssScale: 1 };
  function sprite(key, x, y, width, height, opacity = 1) {
    const f = propCells[names[key]], p = pointAt(x, y); if (!f) return;
    ctx.save(); ctx.globalAlpha = opacity;
    ctx.drawImage(props, f.x, f.y, f.w, f.h, p.x - width / 2, p.y - height + 10, width, height);
    ctx.restore();
  }
  function label(text, x, y, color = '#d0ddcb', emphasis = false) {
    const p = pointAt(x, y), font = (emphasis ? 13 : 11) / (view.scale * view.cssScale);
    ctx.save(); ctx.font = `${emphasis ? 600 : 400} ${font}px system-ui, sans-serif`; ctx.textAlign = 'center';
    const width = ctx.measureText(text).width + font * 1.1;
    ctx.fillStyle = emphasis ? '#202b23ed' : '#17211bc9'; ctx.fillRect(p.x - width / 2, p.y + 17, width, font * 1.7);
    ctx.fillStyle = color; ctx.fillText(text, p.x, p.y + 17 + font * 1.16); ctx.restore();
  }
  function glow(x, y, radius, inner, outer = 'rgba(242,159,65,0)') {
    const p = pointAt(x, y), gradient = ctx.createRadialGradient(p.x, p.y - 10, 0, p.x, p.y - 10, radius);
    gradient.addColorStop(0, inner); gradient.addColorStop(1, outer); ctx.fillStyle = gradient;
    ctx.fillRect(p.x - radius, p.y - radius - 10, radius * 2, radius * 2);
  }
  function render(w, { selected = null, showLabels = true } = {}) {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (!rect.width || !rect.height) return;
    const pxW = Math.round(rect.width * dpr), pxH = Math.round(rect.height * dpr);
    if (canvas.width !== pxW || canvas.height !== pxH) { canvas.width = pxW; canvas.height = pxH; }
    const width = 1440, height = 1440 * rect.height / rect.width, cssScale = rect.width / width;
    const mobile = rect.width < 600;
    const scale = Math.min((width - 82) / groundCache.width, (height - 90) / groundCache.height) * (mobile ? 1.65 : 1);
    const p = pointAt(w.player.x, w.player.y);
    view = { width, height, scale, cx: mobile ? p.x : groundCache.width / 2, cy: mobile ? p.y : groundCache.height / 2, cssScale };
    ctx.setTransform(pxW / width, 0, 0, pxW / width, 0, 0);
    const ratio = Math.max(width / valley.width, height / valley.height);
    ctx.drawImage(valley, (width - valley.width * ratio) / 2, (height - valley.height * ratio) / 2, valley.width * ratio, valley.height * ratio);
    ctx.fillStyle = '#101b1deb'; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(width / 2, height / 2 + 12); ctx.scale(scale, scale); ctx.translate(-view.cx, -view.cy);
    ctx.shadowColor = '#000a'; ctx.shadowBlur = 28; ctx.drawImage(groundCache, 0, 0); ctx.shadowBlur = 0;
    // The river highlights move only with simulation time, and do not change collision rules.
    ctx.save(); ctx.beginPath();
    for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) if (MAP.terrain[y][x] === 'river') ctx.rect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
    ctx.clip(); ctx.strokeStyle = '#a9d8cf29'; ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) { const yy = (i * 37 + w.time * 7) % groundCache.height; ctx.beginPath(); ctx.moveTo(18 * TILE_W, yy); ctx.bezierCurveTo(19 * TILE_W, yy - 12, 20 * TILE_W, yy + 16, 21 * TILE_W, yy - 3); ctx.stroke(); }
    ctx.restore();
    if (w.target) {
      const points = [{ x: w.player.x, y: w.player.y }, ...(w.path || []), w.target];
      ctx.strokeStyle = '#c7cfa690'; ctx.lineWidth = 1.5 / (scale * cssScale); ctx.setLineDash([6, 8]); ctx.beginPath();
      points.forEach((v, i) => { const q = pointAt(v.x, v.y); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); ctx.setLineDash([]);
      const q = pointAt(w.target.x, w.target.y); ctx.strokeStyle = '#e4d3a3'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 15, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const queue = [];
    for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) {
      const kind = MAP.terrain[y][x];
      if (kind === 'rock') queue.push({ y, run: () => sprite('rock', x, y, 68, 59) });
      else if (kind === 'wall') queue.push({ y, run: () => sprite('rock', x, y, 73, 74) });
      else if (kind === 'grass' && ((x <= 1 && y % 2 === 0) || (y === 0 && x % 2 === 1))) queue.push({ y, run: () => sprite('tree', x, y, 92, 150, .88) });
    }
    for (const obj of w.objects) queue.push({ y: obj.y, run: () => {
      if (obj.kind === 'tree') sprite(obj.depleted ? 'stump' : 'wood', obj.x, obj.y, obj.depleted ? 82 : 94, obj.depleted ? 58 : 67);
      else if (obj.kind === 'cabin') { sprite('cabin', obj.x, obj.y, 159, 153); if (obj.depleted) sprite('empty', obj.x + .7, obj.y + .22, 41, 37); }
      else if (obj.kind === 'wreck') { sprite('wreck', obj.x, obj.y, 136, 103); if (obj.depleted) sprite('empty', obj.x + .75, obj.y + .3, 38, 32); }
      else if (obj.kind === 'pump') sprite('pump', obj.x, obj.y, 88, 91);
      else if (obj.kind === 'radio') { sprite('radio', obj.x, obj.y, 83, 131); if (w.signal.repaired) glow(obj.x, obj.y - 2, 18, '#a0d8b370', '#a0d8b300'); }
    }});
    const c = w.camp;
    queue.push({ y: c.y - .1, run: () => {
      if (c.shelter) sprite('shelter', c.x - 1.2, c.y - .25, 150, 103);
      else { const q = pointAt(c.x - 1, c.y); ctx.strokeStyle = '#c8d6a04d'; ctx.setLineDash([4, 6]); ctx.strokeRect(q.x - 48, q.y - 34, 96, 55); ctx.setLineDash([]); }
      if (c.purifier) sprite('purifier', c.x + .85, c.y, 44, 60);
      if (c.fire) sprite('fire', c.x + .1, c.y + .25, 77, 55);
    }});
    const frame = w.player.moving ? Math.floor(w.time * 6) % 4 : 0;
    const heading = w.player.heading || 0;
    const facesUp = Math.sin(heading) < -.2;
    queue.push({ y: w.player.y + .35, run: () => {
      const f = actorCells[frame + (facesUp ? 4 : 0)], q = pointAt(w.player.x, w.player.y);
      ctx.fillStyle = '#07141175'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 1, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(actors, f.x, f.y, f.w, f.h, q.x - 23, q.y - 76, 46, 78);
    }});
    queue.sort((a, b) => a.y - b.y).forEach(item => item.run());
    const night = ['night', 'storm'].includes(w.weather.id) ? .28 : w.weather.id === 'dawn' ? .02 : .11;
    ctx.fillStyle = `rgba(8,25,36,${night})`; ctx.fillRect(0, 0, groundCache.width, groundCache.height);
    if (c.fire && c.fuel > 0) {
      const flicker = .92 + Math.sin(w.time * 11) * .06;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; glow(c.x + .1, c.y + .25, 102 * flicker, '#dd7c3560'); ctx.restore();
      const q = pointAt(c.x + .1, c.y + .25);
      for (let i = 0; i < 7; i++) {
        const phase = (w.time * 1.5 + i / 7) % 1;
        ctx.fillStyle = i % 2 ? '#f6c474' : '#e9903f'; ctx.globalAlpha = (1 - phase) * .85;
        ctx.beginPath(); ctx.ellipse(q.x + Math.sin(i * 4 + w.time * 3) * 9, q.y - 10 - phase * 28, 3.5 * (1 - phase) + .5, 6 * (1 - phase) + 1, -.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (showLabels) {
      for (const obj of w.objects) {
        const selectedObj = selected === obj.id || selected?.id === obj.id;
        const close = Math.hypot(obj.x - w.player.x, obj.y - w.player.y) < 2;
        if (mobile && !selectedObj && !close) continue;
        const state = obj.kind === 'radio' ? (w.signal.sent ? ' · 已发信' : w.signal.repaired ? ' · 已修复' : ' · 待修复') : obj.depleted ? ' · 已搜空' : '';
        label(obj.label + state, obj.x, obj.y, obj.depleted ? '#a3aa98' : selectedObj ? '#f3d59c' : '#d0ddcb', selectedObj);
      }
      label(c.shelter ? '你的营地 · 已搭棚' : '营地 · 搭棚避雨', c.x, c.y + 1, '#e4c48c', true);
    }
    ctx.restore();
    // Weather is drawn above the same live terrain and sprites, never as a replacement scene.
    const rain = Math.max(0, Math.min(1, Number(w.weather.rain) || 0));
    if (rain > 0) {
      ctx.strokeStyle = `rgba(175,203,214,${.12 + rain * .14})`; ctx.lineWidth = 1;
      for (let i = 0; i < Math.floor(130 * rain); i++) {
        const x = hash(i, 5) * width, y = (hash(i, 9) * height + w.time * (260 + hash(i, 3) * 150)) % height;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 24); ctx.stroke();
      }
    }
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .2, width / 2, height / 2, Math.max(width, height) * .64);
    vignette.addColorStop(0, '#06100d00'); vignette.addColorStop(1, '#06100da8'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    ctx.font = `${11 / cssScale}px system-ui, sans-serif`; ctx.fillStyle = '#bdd0b6'; ctx.textAlign = 'right';
    ctx.fillText('雾松山谷 / ' + w.weather.label, width - 17 / cssScale, height - 16 / cssScale); ctx.textAlign = 'left';
    if (mobile) { ctx.font = `${10 / cssScale}px system-ui, sans-serif`; ctx.fillStyle = '#9aac9e'; ctx.fillText('跟随视野 · 选择地点寻路', 17 / cssScale, height - 16 / cssScale); }
  }
  function point(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width * view.width, sy = (clientY - rect.top) / rect.height * view.height;
    const wx = (sx - view.width / 2) / view.scale + view.cx, wy = (sy - view.height / 2 - 12) / view.scale + view.cy;
    return { x: wx / TILE_W - .5, y: wy / TILE_H - .5 };
  }
  canvas.dataset.engine = 'canvas2d-original-bitmap';
  return { ready: true, render, point, dispose() { disposed = true; groundCache.width = groundCache.height = 1; } };
}
