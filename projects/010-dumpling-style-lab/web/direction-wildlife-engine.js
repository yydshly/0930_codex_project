// REEDLIGHT: an original finite wetland observation, with one shared photo projection.
export const VERSION = 1;
export const DEFAULT_SEED = 20261005;
export const TIME_LIMIT = 120;
export const MAX_PHOTOS = 12;
export const MAX_ACTIONS = 8192;
export const FRAME_ASPECT = 16 / 9;
export const SPECIES = Object.freeze([
  Object.freeze({ id: 'heron', name: '苍鹭', baseHeight: .22, aspect: .77397, description: '浅水中缓步觅食。' }),
  Object.freeze({ id: 'kingfisher', name: '翠鸟', baseHeight: .085, aspect: .90269, flyingAspect: 1.06765, description: '在落枝停留与短程飞行之间交替。' }),
  Object.freeze({ id: 'deer', name: '林鹿', baseHeight: .21, aspect: .80282, description: '在右岸停步张望。' })
]);
export const PHOTO_RULES = Object.freeze({ threshold: 70, stableSeconds: .6, minScreenHeight: .18, maxScreenHeight: .65, idealMinHeight: .25, idealMaxHeight: .60, minZoom: 1, maxZoom: 2.8, cameraY: .5, maxPanDelta: .2, maxZoomDelta: .4 });
const MICROS = 1000000, END_TICK = TIME_LIMIT * MICROS;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, places = 9) => Math.round(value * 10 ** places) / 10 ** places;
const validSeed = seed => Number.isSafeInteger(seed) && seed >= 1 && seed <= 4294967295;
const speciesById = id => SPECIES.find(item => item.id === id);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const clone = value => structuredClone(value);
function seeded(seed, salt) { let x = (seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }
export function cameraBounds(zoom) { const half = .5 / clamp(zoom, 1, 2.8); return { min: half, max: 1 - half }; }
export function subjectsAt(seed, time) {
  if (!validSeed(seed) || !Number.isFinite(time) || time < 0 || time > TIME_LIMIT) return [];
  return SPECIES.map((model, index) => {
    const phase = seeded(seed, index + 1) * Math.PI * 2;
    let x, y, activity, state, speed, aspect = model.aspect;
    if (model.id === 'heron') {
      x = .205 + .025 * Math.sin(time * .16 + phase); y = .615 + .003 * Math.sin(time * .3 + phase);
      speed = Math.abs(.004 * Math.cos(time * .16 + phase)); state = speed > .0022 ? 'wading' : 'watching'; activity = state === 'wading' ? '涉水觅食' : '驻足观察';
    } else if (model.id === 'kingfisher') {
      const cycle = (time + seeded(seed, 8) * 3) % 14, perchX = .52 + .018 * Math.sin(phase);
      state = cycle < 7 ? 'perched' : 'flying'; activity = state === 'perched' ? '落枝停留' : '短程飞行';
      const flight = (cycle - 7) / 7;
      x = state === 'perched' ? perchX : perchX + .16 * Math.sin(flight * Math.PI * 2);
      y = state === 'perched' ? .545 : .545 - .065 * Math.sin(flight * Math.PI);
      speed = state === 'perched' ? 0 : Math.hypot(.16 * 2 * Math.PI / 7 * Math.cos(flight * Math.PI * 2), .065 * Math.PI / 7 * Math.cos(flight * Math.PI));
      aspect = state === 'flying' ? model.flyingAspect : model.aspect;
    } else {
      x = .898 + .018 * Math.sin(time * .12 + phase); y = .46 + .002 * Math.sin(time * .24 + phase);
      speed = Math.abs(.00216 * Math.cos(time * .12 + phase)); state = speed > .0014 ? 'walking' : 'grazing'; activity = state === 'walking' ? '草岸缓步' : '草岸驻足';
    }
    return { id: model.id, name: model.name, x: round(x), y: round(y), height: model.baseHeight, width: round(model.baseHeight * aspect / FRAME_ASPECT), aspect, state, activity, speed: round(speed) };
  });
}
export function projectSubject(camera, subject) {
  const x = (subject.x - camera.x) * camera.zoom + .5, y = (subject.y - camera.y) * camera.zoom + .5;
  const width = subject.height * subject.aspect / FRAME_ASPECT * camera.zoom, height = subject.height * camera.zoom;
  const left = x - width / 2, right = x + width / 2, top = y - height / 2, bottom = y + height / 2;
  return { x, y, width, height, left, right, top, bottom, inFrame: left >= -1e-9 && right <= 1 + 1e-9 && top >= -1e-9 && bottom <= 1 + 1e-9 };
}
export const projectAnimal = projectSubject;
function sync(w) {
  w.time = w.tick / MICROS;
  w.stableFor = Math.min(2, (w.tick - w.cameraChangedAt) / MICROS);
  w.subjects = subjectsAt(w.seed, w.time);
  w.stats.secondsObserved = w.time;
}
function message(w, text) { w.message = text; w.log.push({ time: w.time, text }); if (w.log.length > 24) w.log.shift(); }
export function createWorld(seed = DEFAULT_SEED) {
  if (!validSeed(seed)) seed = DEFAULT_SEED;
  const w = { version: VERSION, seed, tick: 0, time: 0, limit: TIME_LIMIT, phase: 'observing', paused: true, camera: { x: .5, y: .5, zoom: 1 }, cameraChangedAt: 0, stableFor: 0, selected: 'heron', subjects: [], photos: [], nextPhoto: 1, best: { heron: 0, kingfisher: 0, deer: 0 }, bestPhotoIds: { heron: null, kingfisher: null, deer: null }, stats: { shots: 0, qualified: 0, failed: 0, panMoves: 0, zoomMoves: 0, secondsObserved: 0 }, ledger: [], log: [], message: '先调焦，再左右取景。让主体完整入框，稳住相机 0.6 秒后按快门。', lastPhotoId: null };
  sync(w); return w;
}
export function scoreSubject(w, id = w.selected) {
  const subject = w.subjects.find(item => item.id === id);
  if (!subject) return null;
  const projection = projectSubject(w.camera, subject);
  const distance = Math.hypot(projection.x - .5, (projection.y - .5) * .65);
  const height = projection.height;
  let sizeFactor = 1;
  if (height < .25) sizeFactor = clamp((height - .08) / .17, 0, 1);
  else if (height > .60) sizeFactor = clamp((.85 - height) / .25, 0, 1);
  const components = { framing: projection.inFrame ? 20 : 0, centering: round(30 * clamp(1 - distance / .5, 0, 1), 1), occupancy: round(25 * sizeFactor, 1), stability: round(25 * clamp(w.stableFor / .6, 0, 1), 1) };
  const score = Math.round(Object.values(components).reduce((sum, value) => sum + value, 0));
  const reasons = [];
  if (!projection.inFrame) reasons.push('主体未完整入框');
  if (height < .18) reasons.push('主体太小：请拉近焦距');
  if (height > .65) reasons.push('主体太大：请拉远焦距');
  if (w.stableFor < .6) reasons.push('相机尚未稳定：停下操作约 0.6 秒');
  if (score < 70 && projection.inFrame && height >= .18 && height <= .65 && w.stableFor >= .6) reasons.push('主体偏离画面中心：调整水平取景');
  const qualified = reasons.length === 0 && score >= 70;
  return { speciesId: id, score, qualified, reasons, projection, components, subject: clone(subject), stableFor: w.stableFor };
}
function event(w, type, payload) { const record = { type, at: w.tick }; if (payload !== undefined) record.payload = payload; w.ledger.push(record); }
export function act(w, type, payload) {
  if (!w || typeof type !== 'string') return { ok: false, reason: '无法识别此操作。' };
  if (type === 'pause') {
    if (typeof payload !== 'boolean') return { ok: false, reason: '暂停操作需要明确的布尔值。' };
    if (!payload && w.phase !== 'observing') return { ok: false, reason: '本次观察已结束，请开始新的观察。' };
    w.paused = payload; return { ok: true };
  }
  if (!['pan', 'zoom', 'select', 'shutter'].includes(type)) return { ok: false, reason: '无法识别此操作。' };
  if (w.phase !== 'observing') return { ok: false, reason: '本次观察已结束，请开始新的观察。' };
  if (w.ledger.length >= MAX_ACTIONS) return { ok: false, reason: '本轮操作记录已达上限，请开始新的观察。' };
  if (type !== 'select' && w.paused) return { ok: false, reason: '请先继续观察。' };
  if (type === 'select') {
    if (!speciesById(payload)) return { ok: false, reason: '请选择苍鹭、翠鸟或林鹿。' };
    if (w.selected === payload) return { ok: true, unchanged: true };
    w.selected = payload; event(w, type, payload); return { ok: true };
  }
  if (type === 'pan' || type === 'zoom') {
    const limit = type === 'pan' ? .2 : .4;
    if (!Number.isFinite(payload) || typeof payload !== 'number' || payload === 0 || Math.abs(payload) > limit) return { ok: false, reason: `单次${type === 'pan' ? '平移' : '调焦'}幅度无效。` };
    const before = { ...w.camera };
    if (type === 'zoom') w.camera.zoom = round(clamp(w.camera.zoom + payload, 1, 2.8));
    const bounds = cameraBounds(w.camera.zoom);
    w.camera.x = round(clamp(w.camera.x + (type === 'pan' ? payload : 0), bounds.min, bounds.max));
    if (w.camera.x === before.x && w.camera.zoom === before.zoom) return { ok: false, reason: type === 'pan' && w.camera.zoom === 1 ? '先调焦，再左右取景。' : '已经到达取景边界。' };
    w.cameraChangedAt = w.tick; w.stableFor = 0; w.stats[type === 'pan' ? 'panMoves' : 'zoomMoves']++; event(w, type, payload); return { ok: true };
  }
  const id = payload === undefined ? w.selected : payload;
  if (!speciesById(id)) return { ok: false, reason: '快门目标不是本片湿地的物种。' };
  const evaluation = scoreSubject(w, id);
  const photo = { id: `p${w.nextPhoto++}`, speciesId: id, time: w.time, camera: clone(w.camera), subject: evaluation.subject, projection: evaluation.projection, stableFor: w.stableFor, components: evaluation.components, score: evaluation.score, qualified: evaluation.qualified, reasons: evaluation.reasons };
  w.photos.push(photo);
  w.lastPhotoId = photo.id; w.stats.shots++; w.stats[photo.qualified ? 'qualified' : 'failed']++;
  if (photo.qualified && photo.score > w.best[id]) { w.best[id] = photo.score; w.bestPhotoIds[id] = photo.id; }
  if (w.photos.length > MAX_PHOTOS) w.photos.splice(w.photos.findIndex(item => !Object.values(w.bestPhotoIds).includes(item.id)), 1);
  event(w, type, payload);
  message(w, `${photo.subject.name} · ${photo.score} 分${photo.qualified ? ' · 合格观察照片' : ` · ${photo.reasons.join('；')}`}`);
  if (SPECIES.every(model => w.best[model.id] >= 70)) { w.phase = 'complete'; w.paused = true; message(w, '三种物种都已留下合格照片。本次芦湾观察完成，时间已暂停。'); }
  return { ok: true, photoId: photo.id, photo: clone(photo) };
}
export function stepWorld(w, dt) {
  if (!w || w.paused || w.phase !== 'observing' || typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0 || dt > .25) return false;
  const ticks = Math.round(dt * MICROS); if (ticks < 1) return false;
  w.tick = Math.min(END_TICK, w.tick + ticks); sync(w);
  if (w.tick === END_TICK) { w.phase = 'report'; w.paused = true; message(w, '120 秒观察窗口结束。已保留实际照片与评分，可开启新的观察再尝试。'); }
  return true;
}
export function objective(w) { return `记录三种物种：${SPECIES.filter(model => w.best[model.id] >= 70).length} / 3 合格（每种至少 70 分）`; }
export function status(w) { return { phase: w.phase, paused: w.paused, complete: w.phase === 'complete', remaining: Math.max(0, TIME_LIMIT - w.time), qualifiedSpecies: SPECIES.filter(model => w.best[model.id] >= 70).map(model => model.id), objective: objective(w) }; }
export function demoPlanner(w) {
  if (!w || w.paused || w.phase !== 'observing' || w.ledger.length >= MAX_ACTIONS) return null;
  const model = SPECIES.find(item => w.best[item.id] < 70); if (!model) return null;
  if (w.selected !== model.id) return { action: 'select', payload: model.id };
  const subject = w.subjects.find(item => item.id === model.id);
  const zoom = { heron: 1.65, kingfisher: 2.8, deer: 2.6 }[model.id];
  if (Math.abs(w.camera.zoom - zoom) > .001) return { action: 'zoom', payload: clamp(round(zoom - w.camera.zoom), -.4, .4) };
  const bounds = cameraBounds(zoom), aim = clamp(subject.x, bounds.min, bounds.max), delta = aim - w.camera.x;
  if (Math.abs(delta) > .02) return { action: 'pan', payload: clamp(round(delta), -.2, .2) };
  if (model.id === 'kingfisher' && subject.state === 'flying') return null;
  const evaluation = scoreSubject(w, model.id);
  if (evaluation.qualified) return { action: 'shutter', payload: model.id };
  return null;
}
export const demoStep = demoPlanner;
// The sparse ledger replays legal actions at integer microsecond timestamps. Photo
// metadata is recomputed, not trusted. Browser PNG bytes are owned by the controller.
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function serialize(w) { return JSON.stringify({ ...w, paused: true }); }
function advanceTo(w, target) { while (w.tick < target && w.phase === 'observing') if (!stepWorld(w, Math.min(250000, target - w.tick) / MICROS)) return false; return w.tick === target; }
export function restore(saved) {
  try {
    if (typeof saved !== 'string' || saved.length > 2000000) return null;
    const data = JSON.parse(saved);
    if (!plain(data) || data.version !== VERSION || !validSeed(data.seed) || typeof data.paused !== 'boolean' || !Number.isSafeInteger(data.tick) || data.tick < 0 || data.tick > END_TICK || !Array.isArray(data.ledger) || data.ledger.length > MAX_ACTIONS) return null;
    const w = createWorld(data.seed); w.paused = false;
    for (const record of data.ledger) {
      if (!plain(record) || !['pan', 'zoom', 'select', 'shutter'].includes(record.type) || !Number.isSafeInteger(record.at) || record.at < w.tick || record.at > data.tick || Object.keys(record).some(key => !['type', 'at', 'payload'].includes(key))) return null;
      if (!advanceTo(w, record.at) || !act(w, record.type, record.payload).ok) return null;
    }
    if (!advanceTo(w, data.tick)) return null;
    w.paused = true;
    if (canonical(w) !== canonical({ ...data, paused: true })) return null;
    return clone(w);
  } catch { return null; }
}
