// Layer-shell sampling, not an explicit strand solver. The inner/outer samples
// stay ordered so the same fiber-volume texture can be composited coherently.
export const SHELL_LAYERS = 32;
export function shellLayers(count = SHELL_LAYERS) {
  if (!Number.isInteger(count) || count < 2 || count > 64) throw new RangeError('Shell count must be an integer from 2 to 64');
  return Array.from({length: count}, (_, i) => (i + 1) / count);
}
export function shellRadius(layer, wetness = 0) {
  return .39 * Math.pow(Math.max(0, 1 - layer), .45) * (1 - Math.max(0, Math.min(1, wetness)) * .25);
}
// Fixed-seed, periodic cross-sections. RGBA stores distance, fiber height and
// tint. No frame number enters this texture; deformation moves its root frame.
export function shellVolumeSlice(size = 512, cells = 64) {
  if (!Number.isInteger(size) || !Number.isInteger(cells) || size < cells || cells < 2 || size % cells) throw new RangeError('Texture size must be a multiple of the cell count');
  let seed = 12001;
  const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
  const fibers = Array.from({length: cells * cells}, () => [.16 + random() * .68, .16 + random() * .68, .6 + random() * .4, .82 + random() * .18]);
  const data = new Uint8Array(size * size * 4), texels = size / cells;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x + .5) / texels, py = (y + .5) / texels, cx = Math.floor(px), cy = Math.floor(py);
    let distance = Infinity, fiber;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const sample = fibers[((cy + dy + cells) % cells) * cells + (cx + dx + cells) % cells];
      const d = Math.hypot(px - cx - dx - sample[0], py - cy - dy - sample[1]);
      if (d < distance) {distance = d; fiber = sample;}
    }
    const i = (y * size + x) * 4;
    data[i] = Math.round(Math.min(1, distance) * 255);
    data[i + 1] = Math.round(fiber[2] * 255);
    data[i + 2] = Math.round(fiber[3] * 255);
    data[i + 3] = 255;
  }
  return data;
}
