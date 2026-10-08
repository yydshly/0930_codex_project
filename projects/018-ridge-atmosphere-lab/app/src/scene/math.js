export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, value) {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function seededRandom(seed = 777) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const u = x - ix, v = y - iy;
  const sx = u * u * u * (u * (u * 6 - 15) + 10);
  const sy = v * v * v * (v * (v * 6 - 15) + 10);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), sx),
    lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy);
}
export function fbm(x, y, octaves = 5) {
  let sum = 0, amplitude = .5, total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise2(x, y); total += amplitude;
    const nextX = 1.67 * x - 1.21 * y + 19.31;
    y = 1.21 * x + 1.67 * y - 12.74; x = nextX; amplitude *= .49;
  }
  return sum / total;
}

// The trail bends into the right hillside; the meadow is not a narrow ridge spine.
export function ridgeX(z) {
  return 66 * smoothstep(35, 470, -z)
    + (noise2(z * .004 + 5.1, 7.93) - noise2(5.1, 7.93)) * 15;
}
export function ridgeHeight(z) {
  return 47 + 14 * smoothstep(30, 440, -z)
    + (noise2(z * .011 + 19.3, 3.2) - .5) * 1.2;
}
export function heightAt(x, z) {
  const center = ridgeX(z);
  const d = x - center;
  const leftDrop = 45 * (1 - Math.exp(-Math.pow(Math.max(0, -d) / 145, 1.32)));
  const rightDrop = 42 * (1 - Math.exp(-Math.pow(Math.max(0, d - 220) / 240, 1.5)));
  const meadowTilt = Math.max(-90, Math.min(d, 190)) * .047;
  // The mountain shoulder builds beyond a broad meadow apron. Its 150-metre
  // rise transition leaves the trail on a continuous slope instead of a ditch.
  const hillSection = Math.exp(-Math.pow((z + 390) / 190, 2));
  const hill = 64 * hillSection * Math.exp(-Math.pow((d - 175) / 220, 2))
    * smoothstep(35, 185, d);
  const flank = (fbm(x * .006 + 48, z * .008 + 7, 4)
    - fbm(center * .006 + 48, z * .008 + 7, 4)) * 13;
  const erosion = (fbm(x * .077 + 12, z * .061, 4)
    - fbm(center * .077 + 12, z * .061, 4)) * .7;
  const swales = (Math.sin(z * .019 + d * .012) - Math.sin(z * .019)) * .9
    + (noise2(x * .021 + 5, z * .019 + 3) - noise2(center * .021 + 5, z * .019 + 3)) * 2.3;
  const trailRuts = (noise2(x * .78 + 10, z * .38) - .5) * .10;
  return ridgeHeight(z) - leftDrop - rightDrop + meadowTilt + hill
    + erosion + flank + swales + trailRuts;
}
