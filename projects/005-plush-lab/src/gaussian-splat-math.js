// Covariance projection follows Kerbl et al., 3D Gaussian Splatting (2023),
// https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/ . This is an original
// forward-renderer implementation, without CUDA training or spherical harmonics.

// The 2D pixel filter from Yu et al., Mip-Splatting (CVPR 2024), Eq. 10
// and Sec. 6.1. We use only its forward 2D filter, not its 3D training filter.
// https://www.cvlibs.net/publications/Yu2024CVPR.pdf
export const MIN_PIXEL_VARIANCE = .1;
export const GAUSSIAN_SIGMA_EXTENT = 3;
const MAX_PIXEL_VARIANCE = 1e12;
const elements = matrix => matrix.elements || matrix;

/** Symmetric covariance packed as [xx, xy, xz, yy, yz, zz]. Scales are stddev. */
export function covarianceFromScaleRotation(scale, rotation) {
  let [x, y, z, w] = rotation;
  const norm = Math.hypot(x, y, z, w);
  if (!(norm > 0) || !Number.isFinite(norm)) throw new RangeError('Gaussian rotation must be a nonzero finite quaternion.');
  [x, y, z, w] = [x / norm, y / norm, z / norm, w / norm];
  const rows = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  const variances = scale.map(value => value * value);
  const at = (i, j) => rows[i].reduce((sum, value, k) => sum + value * rows[j][k] * variances[k], 0);
  return [at(0, 0), at(0, 1), at(0, 2), at(1, 1), at(1, 2), at(2, 2)];
}

const covarianceProduct = (covariance, a, b) => {
  const [xx, xy, xz, yy, yz, zz] = covariance;
  return a[0] * (xx * b[0] + xy * b[1] + xz * b[2])
    + a[1] * (xy * b[0] + yy * b[1] + yz * b[2])
    + a[2] * (xz * b[0] + yz * b[1] + zz * b[2]);
};

/** Convolve a packed [xx, xy, yy] Gaussian with a normalized pixel filter.
 * The peak-alpha multiplier preserves its integral: sqrt(det(C)/det(C+sI)).
 * Expanding a footprint without this multiplier is dilation, and makes fine
 * subpixel fibers cover far more screen area than their original covariance.
 */
export function filterCovariance2D(covariance, variance = MIN_PIXEL_VARIANCE) {
  const [a, cross, c] = covariance;
  if (![a, cross, c, variance].every(Number.isFinite) || a < 0 || c < 0 || variance <= 0) {
    throw new RangeError('Pixel filtering requires finite covariance and a positive filter variance.');
  }
  // Repair tiny PSD roundoff before computing the determinant. Normalizing
  // keeps both products finite even for imported covariances with large scale.
  const scale = Math.max(a, c, variance);
  const normalizedA = a / scale, normalizedC = c / scale;
  const crossLimit = Math.sqrt(normalizedA * normalizedC);
  const normalizedCross = Math.max(-crossLimit, Math.min(crossLimit, cross / scale));
  const determinant = Math.max(0, normalizedA * normalizedC - normalizedCross * normalizedCross);
  const filter = variance / scale;
  const filteredDeterminant = determinant + filter * (normalizedA + normalizedC) + filter * filter;
  const opacityScale = Math.sqrt(Math.max(0, Math.min(1, determinant / filteredDeterminant)));
  return {covariance: [a + variance, normalizedCross * scale, c + variance], opacityScale};
}

/** A C A^T, including nonuniform object scale; matrix is column-major 4x4. */
export function transformCovariance(covariance, matrix) {
  const m = elements(matrix);
  const rows = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]];
  const at = (i, j) => covarianceProduct(covariance, rows[i], rows[j]);
  return [at(0, 0), at(0, 1), at(0, 2), at(1, 1), at(1, 2), at(2, 2)];
}

export function transformPoint(position, matrix) {
  const m = elements(matrix), [x, y, z] = position;
  return [m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]];
}

/** CPU reference of the shader's local perspective-Jacobian ellipse projection. */
export function projectGaussian({position, covariance, modelView, projection, viewport,
  near = .01, far = Infinity, minVariance = MIN_PIXEL_VARIANCE}) {
  const [width, height] = viewport;
  if (![width, height, minVariance].every(Number.isFinite) || width <= 0 || height <= 0 || minVariance <= 0) {
    throw new RangeError('Gaussian projection requires a positive viewport and pixel variance.');
  }
  const viewPosition = transformPoint(position, modelView), depth = -viewPosition[2];
  if (!viewPosition.every(Number.isFinite) || !(depth > Math.max(near, 1e-4)) || !(depth < far)) return null;
  const p = elements(projection), [x, y, z] = viewPosition;
  const clip = [0, 1, 2, 3].map(row => p[row] * x + p[4 + row] * y + p[8 + row] * z + p[12 + row]);
  if (!clip.every(Number.isFinite) || !(clip[3] > 1e-6)) return null;
  const ndc = clip.slice(0, 3).map(value => value / clip[3]);
  // Like the paper's guarded frustum Jacobian, clamp only the derivative's
  // offscreen center. The actual projected center is never moved into view.
  const guardedNdc = ndc.slice(0, 2).map(value => Math.max(-1.3, Math.min(1.3, value)));
  const jx = [0, 1, 2].map(i => (p[i * 4] - guardedNdc[0] * p[i * 4 + 3]) * width * .5 / clip[3]);
  const jy = [0, 1, 2].map(i => (p[i * 4 + 1] - guardedNdc[1] * p[i * 4 + 3]) * height * .5 / clip[3]);
  const viewCovariance = transformCovariance(covariance, modelView);
  const clampVariance = value => Math.min(MAX_PIXEL_VARIANCE, Math.max(0, value));
  const rawA = clampVariance(covarianceProduct(viewCovariance, jx, jx));
  const rawC = clampVariance(covarianceProduct(viewCovariance, jy, jy));
  const rawCross = covarianceProduct(viewCovariance, jx, jy);
  if (![rawA, rawCross, rawC].every(Number.isFinite)) return null;
  const filtered = filterCovariance2D([rawA, rawCross, rawC], minVariance);
  const [a, b, c] = filtered.covariance;
  const midpoint = .5 * (a + c), discriminant = Math.hypot(.5 * (a - c), b);
  const eigenvalues = [Math.max(minVariance, midpoint + discriminant), Math.max(minVariance, midpoint - discriminant)];
  let axis = [b, eigenvalues[0] - a];
  if (Math.hypot(...axis) < 1e-5) axis = [eigenvalues[0] - c, b];
  const length = Math.hypot(...axis);
  const majorAxis = length > 1e-5 ? axis.map(value => value / length) : [1, 0];
  const maxStdDev = Math.max(width, height) * 2 / GAUSSIAN_SIGMA_EXTENT;
  const stdDev = eigenvalues.map(value => Math.min(Math.sqrt(value), maxStdDev));
  const center = [(ndc[0] + 1) * width * .5, (ndc[1] + 1) * height * .5];
  return {center, depth, viewPosition, covariance: [a, b, c], opacityScale: filtered.opacityScale, eigenvalues,
    axes: [majorAxis, [-majorAxis[1], majorAxis[0]]], stdDev};
}

/** Stable back-to-front camera-space center order; centers is a flat xyz array. */
export function sortVisibleSplatIndices(centers, modelView, near = .01, far = Infinity) {
  const m = elements(modelView), indices = [], depths = new Float64Array(centers.length / 3);
  for (let i = 0; i < depths.length; i++) {
    const offset = i * 3;
    const depth = -(m[2] * centers[offset] + m[6] * centers[offset + 1] + m[10] * centers[offset + 2] + m[14]);
    depths[i] = depth;
    if (Number.isFinite(depth) && depth > Math.max(near, 1e-4) && depth < far) indices.push(i);
  }
  indices.sort((a, b) => depths[b] - depths[a] || a - b);
  return indices;
}
