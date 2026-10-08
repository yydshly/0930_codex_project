// Six original geometric signs. Public shapes contain no dictionary answers.
export const GLYPH_PATHS = Object.freeze({
  person: 'M12 8 L30 26 L48 8 M12 52 L30 34 L48 52 M10 30 H50',
  give: 'M30 7 L49 30 L30 53 L11 30 Z M8 12 L20 24 M40 36 L52 48',
  lamp: 'M12 12 H48 V48 H12 Z M12 30 H48 M30 12 V48 M22 22 L38 38',
  water: 'M10 12 H43 L31 24 H49 M11 30 H34 L22 42 H48 M11 50 H30',
  door: 'M11 49 V11 H49 V49 M21 21 H39 V39 H21 Z M11 30 H21 M39 30 H49',
  open: 'M10 13 L30 33 L50 13 M10 30 L30 50 L50 30 M30 7 V19'
});
export function createGlyphSVG(doc, id, label = '尚未译出的刻记') {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 60 60'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label);
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', GLYPH_PATHS[id] || ''); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '3.3'); path.setAttribute('stroke-linecap', 'square'); path.setAttribute('stroke-linejoin', 'miter'); svg.append(path); return svg;
}
export function atlasRect(image, index) {
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  const cellWidth = width / 4, cellHeight = height / 2;
  return { x: (index % 4) * cellWidth, y: Math.floor(index / 4) * cellHeight, width: cellWidth, height: cellHeight };
}
export function fitRect(sourceWidth, sourceHeight, target, mode = 'contain') {
  const scale = mode === 'cover' ? Math.max(target.width / sourceWidth, target.height / sourceHeight) : Math.min(target.width / sourceWidth, target.height / sourceHeight);
  const width = sourceWidth * scale, height = sourceHeight * scale;
  return { x: target.x + (target.width - width) / 2, y: target.y + (target.height - height) / 2, width, height };
}
export function drawAtlas(ctx, image, index, target, rotation = 0, flip = false) {
  const source = atlasRect(image, index), dest = fitRect(source.width, source.height, target);
  ctx.save();
  if (rotation || flip) { ctx.translate(dest.x + dest.width / 2, dest.y + dest.height / 2); if (rotation) ctx.rotate(rotation); if (flip) ctx.scale(-1, 1); ctx.drawImage(image, source.x, source.y, source.width, source.height, -dest.width / 2, -dest.height / 2, dest.width, dest.height); }
  else ctx.drawImage(image, source.x, source.y, source.width, source.height, dest.x, dest.y, dest.width, dest.height);
  ctx.restore(); return { source, dest };
}
export function sceneLayout(width, height) {
  return { width, height, traveler: { x: width * .63, y: height * .34, width: width * .21, height: height * .55 }, host: { x: width * .16, y: height * .31, width: width * .23, height: height * .59 }, transfer: { from: width * .34, to: width * .65, y: height * .48 }, gate: { x: width * .44, y: height * .47, width: width * .20, height: height * .37 } };
}
function line(ctx, points) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
function glyph(ctx, id, x, y, size) {
  const d = GLYPH_PATHS[id]; if (!d) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 60, size / 60); ctx.strokeStyle = '#314b43'; ctx.lineWidth = 3.3; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'; ctx.beginPath();
  const tokens = d.match(/[MLHVZ]|-?\d+(?:\.\d+)?/g); let i = 0, command, px = 0, py = 0;
  while (i < tokens.length) { if (/^[MLHVZ]$/.test(tokens[i])) command = tokens[i++]; if (command === 'Z') { ctx.closePath(); command = null; continue; } if (command === 'M' || command === 'L') { px = Number(tokens[i++]); py = Number(tokens[i++]); command === 'M' ? ctx.moveTo(px, py) : ctx.lineTo(px, py); if (command === 'M') command = 'L'; } else if (command === 'H') { px = Number(tokens[i++]); ctx.lineTo(px, py); } else if (command === 'V') { py = Number(tokens[i++]); ctx.lineTo(px, py); } else break; }
  ctx.stroke(); ctx.restore();
}
function roundRect(ctx, x, y, w, h, radius) { ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + w - radius, y); ctx.quadraticCurveTo(x + w, y, x + w, y + radius); ctx.lineTo(x + w, y + h - radius); ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h); ctx.lineTo(x + radius, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); }
export function createLanguageRenderer(canvas, assets, options = {}) {
  const ctx = canvas.getContext('2d'), ratio = options.ratio || (() => globalThis.devicePixelRatio || 1);
  let signature = '', started = 0, layout = sceneLayout(canvas.width, canvas.height), lastFrame = null;
  function resize() { const box = canvas.getBoundingClientRect(), dpr = Math.min(2, Math.max(1, Number(typeof ratio === 'function' ? ratio() : ratio) || 1)), width = Math.max(1, Math.round((box.width || 900) * dpr)), height = Math.max(1, Math.round((box.height || (box.width || 900) * 2 / 3) * dpr)); if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; } layout = sceneLayout(width, height); return layout; }
  function draw(view, { time = 0, reducedMotion = false } = {}) {
    if (!ctx || !view) return false; resize();
    const { width: W, height: H } = layout, evidence = view.currentEvidence?.id || '', solved = view.solved || [], key = `${view.scene}|${evidence}|${solved.join(',')}`;
    if (key !== signature) { signature = key; started = time; }
    const elapsed = Math.max(0, time - started), u = reducedMotion ? 1 : Math.min(1, elapsed / 1400), ease = u * u * (3 - 2 * u), pulse = reducedMotion ? .5 : (Math.sin(time / 600) + 1) / 2;
    ctx.clearRect(0, 0, W, H); const background = assets[view.scene], bg = fitRect(background.naturalWidth || background.width, background.naturalHeight || background.height, { x: 0, y: 0, width: W, height: H }, 'cover'); ctx.drawImage(background, bg.x, bg.y, bg.width, bg.height);
    const shade = ctx.createLinearGradient(0, H * .35, 0, H); shade.addColorStop(0, '#183f4100'); shade.addColorStop(1, '#15394045'); ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
    const actor = view.scene === 'lighthouse' ? 2 : 1;
    const shadow = (box) => { ctx.save(); ctx.fillStyle = '#173c3c3a'; ctx.beginPath(); ctx.ellipse(box.x + box.width / 2, box.y + box.height * .91, box.width * .32, box.height * .045, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
    shadow(layout.host); shadow(layout.traveler); drawAtlas(ctx, assets.props, actor, layout.host, 0, actor === 2); drawAtlas(ctx, assets.props, 0, layout.traveler, 0, true);
    if (view.scene === 'market') {
      const transfer = ['m-gift', 'm-water'].includes(evidence), sprite = evidence === 'm-water' ? 3 : 4;
      if (transfer) { drawAtlas(ctx, assets.props, 6, { x: W * .35, y: H * .45, width: W * .28, height: H * .15 }); drawAtlas(ctx, assets.props, sprite, { x: layout.transfer.from + (layout.transfer.to - layout.transfer.from) * ease - W * .045, y: layout.transfer.y - H * .035 - Math.sin(ease * Math.PI) * H * .035, width: W * .09, height: H * .16 }); }
      else drawAtlas(ctx, assets.props, 4, { x: W * .44, y: H * .18, width: W * .075, height: H * .16 });
      if (evidence === 'm-welcome') { ctx.save(); ctx.strokeStyle = '#e5c985'; ctx.lineWidth = W * .002; line(ctx, [[W * .26, H * .38], [W * .28, H * .35], [W * .30, H * .36]]); ctx.restore(); }
      if (solved.includes('market')) { ctx.save(); ctx.fillStyle = '#fae2a843'; ctx.beginPath(); ctx.arc(W * .68, H * .50, W * .075, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    if (view.scene === 'harbor') {
      ctx.save(); ctx.strokeStyle = '#a9d1c380'; ctx.lineWidth = H * .0025;
      for (let i = 0; i < 7; i++) { const drift = reducedMotion ? 0 : (time / 6000) % 1; const x = ((i / 7 + drift) % 1) * W; line(ctx, [[x - W * .08, H * .85 + (i % 3) * H * .025], [x, H * .844 + (i % 3) * H * .025], [x + W * .06, H * .85 + (i % 3) * H * .025]]); } ctx.restore();
      const gateDrawing = drawAtlas(ctx, assets.props, 5, layout.gate);
      // A movable foreground grate makes both the small demonstration and the real opening visible.
      const opening = solved.includes('harbor') || evidence === 'h-open', lift = opening ? ease : 0, gate = gateDrawing.dest, gx = gate.x + gate.width * .285, gy = gate.y + gate.height * .235, gw = gate.width * .43, gh = gate.height * .64, archRise = gate.height * .15;
      ctx.save(); ctx.fillStyle = '#163d42'; ctx.beginPath(); ctx.moveTo(gx, gy + archRise); ctx.quadraticCurveTo(gx, gy, gx + gw / 2, gy); ctx.quadraticCurveTo(gx + gw, gy, gx + gw, gy + archRise); ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx, gy + gh); ctx.closePath(); ctx.fill(); ctx.clip(); ctx.strokeStyle = '#c6b781'; ctx.lineWidth = W * .0035;
      for (let i = 0; i <= 6; i++) line(ctx, [[gx + gw * i / 6, gy - gh * lift], [gx + gw * i / 6, gy + gh * (1 - lift)]]);
      for (let i = 0; i <= 3; i++) line(ctx, [[gx, gy + gh * (i / 3 - lift)], [gx + gw, gy + gh * (i / 3 - lift)]]); ctx.restore();
      if (evidence === 'h-lock') drawAtlas(ctx, assets.props, 7, { x: W * .40, y: H * .33, width: W * .16, height: H * .20 }, ease * Math.PI * .65);
      if (opening) { ctx.save(); ctx.strokeStyle = '#dac58b'; ctx.lineWidth = W * .002; line(ctx, [[gx - W * .015, gy + gh * .85], [gx - W * .015, gy + gh * .15], [gx - W * .025, gy + gh * .25]]); ctx.restore(); }
    }
    if (view.scene === 'lighthouse') {
      const received = solved.includes('lighthouse');
      drawAtlas(ctx, assets.props, 3, { x: received ? W * .31 : W * .50, y: H * .52, width: W * .08, height: H * .13 });
      if (evidence === 'l-cup') { ctx.save(); ctx.strokeStyle = '#a5d3df'; ctx.lineWidth = W * .004; line(ctx, [[W * .538, H * .46], [W * .538, H * (.49 + .06 * ease)]]); ctx.restore(); }
      if (received || evidence === 'l-return') { ctx.save(); const glow = ctx.createRadialGradient(W * .73, H * .21, 0, W * .73, H * .21, W * .3); glow.addColorStop(0, `rgba(255,227,155,${.6 + pulse * .16})`); glow.addColorStop(.2, '#edc37140'); glow.addColorStop(1, '#edc37100'); ctx.fillStyle = glow; ctx.fillRect(W * .40, 0, W * .60, H * .52); ctx.fillStyle = '#f5d28a24'; ctx.beginPath(); ctx.moveTo(W * .73, H * .20); ctx.lineTo(W, H * .09); ctx.lineTo(W, H * .45); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    const words = view.currentEvidence?.words || view.quest?.words || [], bubbleWidth = Math.max(W * .13, words.length * W * .048 + W * .036), bx = W * .45 - bubbleWidth / 2, by = H * .13, bh = H * .095;
    ctx.save(); ctx.fillStyle = '#f4ecd9ed'; ctx.strokeStyle = '#bcb786'; ctx.lineWidth = W * .001; roundRect(ctx, bx, by, bubbleWidth, bh, W * .007); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f4ecd9ed'; ctx.beginPath(); ctx.moveTo(bx + bubbleWidth * .35, by + bh); ctx.lineTo(bx + bubbleWidth * .35 + W * .012, by + bh + H * .024); ctx.lineTo(bx + bubbleWidth * .35 + W * .025, by + bh); ctx.closePath(); ctx.fill(); words.forEach((id, i) => glyph(ctx, id, bx + W * .014 + i * W * .048, by + H * .012, W * .039)); ctx.restore();
    const active = !reducedMotion && !view.paused && view.phase !== 'complete' && (u < 1 || view.scene === 'harbor' || view.scene === 'lighthouse' && (solved.includes('lighthouse') || evidence === 'l-return'));
    lastFrame = { scene: view.scene, evidence, opening: solved.includes('harbor') || evidence === 'h-open', transfer: ['m-gift', 'm-water'].includes(evidence), beacon: view.scene === 'lighthouse' && (solved.includes('lighthouse') || evidence === 'l-return'), progress: ease, animated: active };
    return active;
  }
  return { draw, resize, getLayout: () => ({ ...layout }), getLastFrame: () => lastFrame && { ...lastFrame } };
}
