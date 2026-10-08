import {paintReferenceGroom, sanitizeReferenceFur} from './reference-plush-fur.js';

export const REFERENCE_BRUSH_RADIUS = .26;

// A small rounded-star volume in the original SOG coordinates. Picking this
// proxy avoids enumerating/raycasting the 3.5 million individual Gaussians.
// Decoded blue-coat centers reach Z ±.95; the front body is about -.84 to -.94.
// Keep this depth in source units so the .26 brush can reach the visible coat.
const BODY = [
  {center: [0, -1, 0], radius: [.80, .89, .93]},
  {center: [-.76, -1.02, 0], radius: [.41, .37, .70]},
  {center: [.76, -1.02, 0], radius: [.41, .37, .70]},
  {center: [-.42, -.40, 0], radius: [.35, .37, .75]},
  {center: [.42, -.40, 0], radius: [.35, .37, .75]},
  {center: [-.42, -1.64, 0], radius: [.37, .32, .75]},
  {center: [.42, -1.64, 0], radius: [.37, .32, .75]},
];
// Reject an accessory in front of the body, instead of hitting fur behind it.
// The rendering modifier independently protects accessories by original color.
const ACCESSORIES = [
  {center: [0, -2.17, 0], radius: [.91, .35, .99]},
  {center: [-.225, -1.40, -.875], radius: [.075, .11, .12]},
  {center: [.225, -1.40, -.875], radius: [.075, .11, .12]},
];
const vector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

function ellipsoidHit(origin, direction, shape) {
  const offset = origin.map((value, i) => (value - shape.center[i]) / shape.radius[i]);
  const ray = direction.map((value, i) => value / shape.radius[i]);
  const a = ray.reduce((sum, value) => sum + value * value, 0);
  if (a < 1e-16) return null;
  const b = 2 * ray.reduce((sum, value, i) => sum + value * offset[i], 0);
  const c = offset.reduce((sum, value) => sum + value * value, 0) - 1;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant), near = (-b - root) / (2 * a), far = (-b + root) / (2 * a);
  const t = near >= 0 ? near : far >= 0 ? far : null;
  if (t === null) return null;
  const point = origin.map((value, i) => value + direction[i] * t);
  const normal = point.map((value, i) => (value - shape.center[i]) / shape.radius[i] ** 2);
  const size = Math.hypot(...normal);
  return {point, normal: normal.map(value => value / size), t};
}

/** Source-space body hit, or null for empty space, the beret and visible eyes. */
export function referencePlushProxyHit(origin, direction) {
  if (!vector(origin) || !vector(direction)) return null;
  let body = null;
  for (const shape of BODY) {
    const hit = ellipsoidHit(origin, direction, shape);
    if (hit && (!body || hit.t < body.t)) body = hit;
  }
  if (!body || body.point[1] < -2.05) return null;
  for (const shape of ACCESSORIES) {
    const hit = ellipsoidHit(origin, direction, shape);
    if (hit && hit.t <= body.t + 1e-6) return null;
  }
  return {...body, distance: distance(origin, body.point)};
}

/** Undo every display/actor transform, including the centered child and X π. */
export function referencePlushSourceRay(THREE, asset, ray) {
  if (!asset?.group || !ray?.origin || !ray?.direction) return null;
  const source = asset.meshes?.[0] ?? asset.group.children?.[0] ?? asset.group;
  asset.group.updateWorldMatrix(true, true);
  if (!source.matrixWorld || Math.abs(source.matrixWorld.determinant()) < 1e-12) return null;
  const inverse = new THREE.Matrix4().copy(source.matrixWorld).invert();
  const origin = ray.origin.clone().applyMatrix4(inverse).toArray();
  const direction = ray.direction.clone().transformDirection(inverse).toArray();
  return vector(origin) && vector(direction) ? {origin, direction} : null;
}

/** Shared capture-phase interaction for creation, studio, world and splat views. */
export function createReferencePlushBrush({THREE, canvas, camera, getAsset,
  isActive = () => true, getStyle = () => ({}), onStart, onChange, onFinish, onModeChange} = {}) {
  if (!THREE?.Raycaster || !canvas?.addEventListener || !camera || typeof getAsset !== 'function') {
    throw new TypeError('Reference grooming needs a Three.js camera, canvas and asset getter.');
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let mode = false, disposed = false, gesture = null, previousCursor, previousTouchAction;
  const active = () => !disposed && mode && Boolean(isActive());
  const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  const hitAt = event => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2);
    camera.updateWorldMatrix(true, false);
    raycaster.setFromCamera(pointer, camera);
    const sourceRay = referencePlushSourceRay(THREE, getAsset(), raycaster.ray);
    return sourceRay && referencePlushProxyHit(sourceRay.origin, sourceRay.direction);
  };
  const capture = id => { try { canvas.setPointerCapture?.(id); } catch {} };
  const release = id => {
    try { if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch {}
  };
  function finish(reason) {
    if (!gesture) return;
    const finished = gesture;
    // Clear first: releasePointerCapture can synchronously dispatch lostcapture.
    gesture = null;
    release(finished.id);
    if (finished.started) onFinish?.({changed: finished.changed, started: true,
      reason, pointerId: finished.id, point: finished.lastPoint?.slice() ?? null});
  }
  function start(event) {
    if (!active()) return;
    consume(event);
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0) || gesture) return;
    const hit = hitAt(event);
    gesture = {id: event.pointerId, started: Boolean(hit), changed: false,
      lastPoint: hit?.point.slice() ?? null, direction: null, style: sanitizeReferenceFur(getStyle())};
    capture(event.pointerId);
    if (hit) onStart?.({point: hit.point.slice(), radius: REFERENCE_BRUSH_RADIUS, pointerId: event.pointerId});
    else onFinish?.({changed: false, started: false, reason: 'miss', pointerId: event.pointerId, point: null});
  }
  function paint(event) {
    if (!active()) {
      if (gesture) finish('inactive');
      return;
    }
    consume(event);
    if (!gesture?.started || gesture.id !== event.pointerId) return;
    const hit = hitAt(event), stroke = gesture;
    if (!hit) { stroke.lastPoint = null; stroke.direction = null; return; }
    const point = hit.point;
    if (!stroke.lastPoint) { stroke.lastPoint = point; return; }
    const delta = point.map((value, i) => value - stroke.lastPoint[i]), travelled = Math.hypot(...delta);
    // Ignore jitter; never bridge a jump across the character or a missed patch.
    if (travelled < REFERENCE_BRUSH_RADIUS * .01) return;
    if (travelled > REFERENCE_BRUSH_RADIUS * 2.5) {
      stroke.lastPoint = point; stroke.direction = null; return;
    }
    const blend = -Math.expm1(-travelled / (REFERENCE_BRUSH_RADIUS * .18));
    let direction = delta.map((value, i) => stroke.direction
      ? stroke.direction[i] * (1 - blend) + value / travelled * blend : value / travelled);
    const size = Math.hypot(...direction);
    direction = size > 1e-8 ? direction.map(value => value / size) : delta.map(value => value / travelled);
    // Sampling by travelled distance gives fast drags a continuous soft patch.
    const steps = Math.ceil(travelled / (REFERENCE_BRUSH_RADIUS * .22));
    const segment = direction.map(value => value * travelled / steps);
    let next = stroke.style;
    for (let step = 1; step <= steps; step++) {
      const sample = stroke.lastPoint.map((value, i) => value + delta[i] * step / steps);
      next = paintReferenceGroom(next, sample, segment, REFERENCE_BRUSH_RADIUS, 1);
    }
    next = sanitizeReferenceFur(next);
    const changed = JSON.stringify(next) !== JSON.stringify(stroke.style);
    stroke.lastPoint = point; stroke.direction = direction; stroke.style = next;
    if (changed) {
      stroke.changed = true;
      onChange?.(next, {point: point.slice(), delta: delta.slice(), radius: REFERENCE_BRUSH_RADIUS});
    }
  }
  function end(event) {
    if (active()) consume(event);
    if (gesture?.id === event.pointerId) finish(event.type === 'pointerup' ? 'up' : 'cancel');
  }
  function lost(event) {
    if (active()) consume(event);
    if (gesture?.id === event.pointerId) finish('lostcapture');
  }
  const blockNavigation = event => { if (active()) consume(event); };
  const listeners = [['pointerdown', start], ['pointermove', paint], ['pointerup', end],
    ['pointercancel', end], ['lostpointercapture', lost], ['wheel', blockNavigation],
    ['contextmenu', blockNavigation], ['dblclick', blockNavigation]];
  for (const [type, listener] of listeners) canvas.addEventListener(type, listener, {capture: true, passive: false});
  function setEnabled(value) {
    const next = !disposed && Boolean(value);
    if (next === mode) return;
    if (!next) finish('disabled');
    mode = next;
    if (canvas.style) {
      if (next) {
        previousCursor = canvas.style.cursor; previousTouchAction = canvas.style.touchAction;
        canvas.style.cursor = 'crosshair'; canvas.style.touchAction = 'none';
      } else {
        canvas.style.cursor = previousCursor; canvas.style.touchAction = previousTouchAction;
      }
    }
    onModeChange?.(mode);
  }
  return {setEnabled, enabled: () => mode,
    dispose() {
      if (disposed) return;
      setEnabled(false); disposed = true;
      for (const [type, listener] of listeners) canvas.removeEventListener(type, listener, true);
    }};
}
