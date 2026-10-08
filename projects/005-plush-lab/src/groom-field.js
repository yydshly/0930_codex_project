const MAX_STYLE = 1.5;
// Support radius for the renderer's sparse 32-point guide field. This covers
// the longest ear tips as well as the body; it is not a visible brush size.
export const GUIDE_BRUSH_RADIUS = .72;
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const vector = value => Array.isArray(value) && value.length === 3
  ? [finite(value[0]), finite(value[1]), finite(value[2])] : [0, 0, 0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function unit(value) {
  const largest = Math.max(...value.map(Math.abs));
  if (!largest) return null;
  const scaled = value.map(component => component / largest);
  const length = Math.hypot(...scaled);
  return scaled.map(component => component / length);
}

function limit(value) {
  const clean = vector(value);
  const largest = Math.max(...clean.map(Math.abs));
  if (!largest) return clean;
  const scaled = clean.map(component => component / largest);
  const length = Math.hypot(...scaled);
  return largest > MAX_STYLE / length ? scaled.map(component => component * (MAX_STYLE / length)) : clean;
}

function writeStyle(guide, value) {
  if (!guide || typeof guide !== 'object') return false;
  if (!Array.isArray(guide.style) || guide.style.length !== 3) guide.style = [0, 0, 0];
  const changed = value.some((component, i) => component !== guide.style[i]);
  for (let i = 0; i < 3; i++) guide.style[i] = value[i];
  return changed;
}

/**
 * Paint a persistent tangent-space bend. Direction is the displacement of one drag segment,
 * so exponential blending accumulates by travelled distance rather than event count.
 * Radius is the brush's support radius; a Gaussian gives its soft falloff inside that patch.
 */
export function paintGroomField(guides, point, direction, strength = 1, radius = .38) {
  if (!Array.isArray(guides) || !Array.isArray(point) || point.length !== 3 ||
      !point.every(value => typeof value === 'number' && Number.isFinite(value))) return false;
  const movement = vector(direction);
  const movementUnit = unit(movement);
  const amount = Math.max(0, Math.min(1e6, finite(strength)));
  if (!movementUnit || !amount || typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) return false;
  const distance = Math.min(1e6, Math.hypot(...movement));
  const radiusSquared = radius * radius;
  let changed = false;
  for (const guide of guides) {
    if (!guide || !Array.isArray(guide.root) || guide.root.length !== 3 ||
        !guide.root.every(value => typeof value === 'number' && Number.isFinite(value))) continue;
    const normal = unit(vector(guide.normal));
    if (!normal) continue;
    const distanceSquared = guide.root.reduce((sum, component, i) => sum + (component - point[i]) ** 2, 0);
    if (distanceSquared >= radiusSquared) continue;
    const projection = dot(movementUnit, normal);
    const tangent = unit(movementUnit.map((component, i) => component - normal[i] * projection));
    if (!tangent || Math.hypot(...movementUnit.map((component, i) => component - normal[i] * projection)) < 1e-8) continue;
    const weight = Math.exp(-4.5 * distanceSquared / radiusSquared);
    const mix = -Math.expm1(-4 * distance * amount * weight / radius);
    const previous = limit(guide.style);
    const previousNormal = dot(previous, normal);
    const next = previous.map((component, i) =>
      (component - normal[i] * previousNormal) * (1 - mix) + tangent[i] * MAX_STYLE * mix);
    changed = writeStyle(guide, limit(next)) || changed;
  }
  return changed;
}

/** Transient pose resets do not call this: only an explicit grooming reset should. */
export function clearGroomField(guides) {
  if (!Array.isArray(guides)) return false;
  let changed = false;
  for (const guide of guides) changed = writeStyle(guide, [0, 0, 0]) || changed;
  return changed;
}

/** Independent, compact arrays for saved recipes; rounded boundary vectors stay bounded. */
export function readGroomField(guides) {
  if (!Array.isArray(guides)) return [];
  const round = value => Math.round(value * 10000) / 10000 || 0;
  return guides.map(guide => {
    let clean = limit(guide?.style).map(round);
    const length = Math.hypot(...clean);
    if (length > MAX_STYLE) clean = clean.map(component => round(component * (1.4999 / length)));
    return clean;
  });
}

/** Empty fields restore an unstyled coat; malformed nonempty fields leave the coat untouched. */
export function applyGroomField(guides, field) {
  if (!Array.isArray(guides) || !Array.isArray(field)) return false;
  if (!field.length) {
    clearGroomField(guides);
    return true;
  }
  if (field.length !== guides.length) return false;
  for (let i = 0; i < field.length; i++) if (!Array.isArray(field[i]) || field[i].length !== 3) return false;
  const clean = field.map(limit);
  for (let i = 0; i < guides.length; i++) writeStyle(guides[i], clean[i]);
  return true;
}
