import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {covarianceFromScaleRotation, transformCovariance, projectGaussian,
  sortVisibleSplatIndices, filterCovariance2D, MIN_PIXEL_VARIANCE} from '../src/gaussian-splat-math.js';

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const perspective = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1.002002, -1, 0, 0, -.2002002, 0];
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ~= ${expected}`);
const project = (changes = {}) => projectGaussian({position: [0, 0, -4], covariance: [1, 0, 0, .25, 0, .04],
  modelView: identity, projection: perspective, viewport: [800, 800], near: .1, far: 100, ...changes});

// src and tooling are siblings. Bundle an isolated fixture against the same
// pinned Three.js as the app rather than changing package layout for the tests.
let rendererFixture, fixtureDirectory;
function loadRenderer() {
  return rendererFixture ||= (async () => {
    const require = createRequire(new URL('../tooling/package.json', import.meta.url));
    const {build} = require('esbuild');
    const toolingDirectory = fileURLToPath(new URL('../tooling/', import.meta.url));
    fixtureDirectory = await mkdtemp(join(tmpdir(), 'plush-gaussian-renderer-test-'));
    const outfile = join(fixtureDirectory, 'fixture.mjs');
    await build({stdin: {contents: "export {GaussianSplatMesh} from '../src/gaussian-splat-renderer.js'; export * as THREE from 'three';",
      resolveDir: toolingDirectory, sourcefile: 'renderer-test-fixture.js'},
      nodePaths: [join(toolingDirectory, 'node_modules')], bundle: true,
      platform: 'node', format: 'esm', outfile, logLevel: 'silent'});
    return import(pathToFileURL(outfile).href);
  })();
}
after(async () => {
  if (!fixtureDirectory) return;
  const target = resolve(fixtureDirectory);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(basename(target).startsWith('plush-gaussian-renderer-test-'));
  await rm(target, {recursive: true, force: true});
});
const splat = (position, changes = {}) => ({position, scale: [.2, .1, .03], rotation: [0, 0, 0, 1],
  color: [.2, .4, .6], opacity: .7, ...changes});
const dataset = (...splats) => ({splats, meta: {source: 'renderer-test'}});

test('3D covariance preserves standard-deviation squares and quaternion orientation', () => {
  assert.deepEqual(covarianceFromScaleRotation([2, 1, .5], [0, 0, 0, 1]), [4, 0, 0, 1, 0, .25]);
  const angle = Math.PI / 4;
  const rotated = covarianceFromScaleRotation([2, 1, .5], [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)]);
  [2.5, 1.5, 0, 2.5, 0, .25].forEach((value, i) => close(rotated[i], value));
  const same = covarianceFromScaleRotation([2, 1, .5], [0, 0, -Math.sin(angle / 2), -Math.cos(angle / 2)]);
  same.forEach((value, i) => close(value, rotated[i]));
  const towardCamera = covarianceFromScaleRotation([2, 1, .5], [0, Math.SQRT1_2, 0, Math.SQRT1_2]);
  [.25, 0, 0, 1, 0, 4].forEach((value, i) => close(towardCamera[i], value));
});

test('object nonuniform scale and rotation act on covariance as A C A^T', () => {
  // 90-degree rotation about z following scale(3, 2, 1).
  const matrix = [0, 3, 0, 0, -2, 0, 0, 0, 0, 0, 1, 0, 7, 9, -2, 1];
  assert.deepEqual(transformCovariance([4, 0, 0, 1, 0, .25], matrix), [4, 0, 0, 36, 0, .25]);
  const scaled = project({modelView: [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]});
  close(scaled.covariance[0], 40000 + MIN_PIXEL_VARIANCE);
  close(scaled.covariance[2], 22500 + MIN_PIXEL_VARIANCE);
});

test('perspective projection creates an ellipse with the expected focal length and depth dependence', () => {
  const footprint = project();
  close(footprint.covariance[0], 10000 + MIN_PIXEL_VARIANCE);
  close(footprint.covariance[1], 0);
  close(footprint.covariance[2], 2500 + MIN_PIXEL_VARIANCE);
  assert.deepEqual(footprint.center, [400, 400]);
  const distant = project({position: [0, 0, -8]});
  close((footprint.covariance[0] - MIN_PIXEL_VARIANCE) / (distant.covariance[0] - MIN_PIXEL_VARIANCE), 4);
  assert.ok(footprint.stdDev[0] > footprint.stdDev[1] * 1.99);
});

test('rotated 3D anisotropy becomes a rotated screen ellipse', () => {
  const rotation = [0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)];
  const footprint = project({covariance: covarianceFromScaleRotation([1, .2, .1], rotation)});
  close(Math.abs(footprint.axes[0][0]), Math.SQRT1_2);
  close(Math.abs(footprint.axes[0][1]), Math.SQRT1_2);
  assert.ok(footprint.covariance[1] > 0);
  close(footprint.eigenvalues[0], 10000 + MIN_PIXEL_VARIANCE);
  close(footprint.eigenvalues[1], 400 + MIN_PIXEL_VARIANCE);
});

test('perspective Jacobian includes the depth covariance of off-axis Gaussians', () => {
  const centered = project({covariance: [0, 0, 0, 0, 0, 1]});
  const offAxis = project({position: [2, 0, -4], covariance: [0, 0, 0, 0, 0, 1]});
  close(centered.covariance[0], MIN_PIXEL_VARIANCE);
  close(offAxis.covariance[0], 2500 + MIN_PIXEL_VARIANCE);
  close(offAxis.covariance[2], MIN_PIXEL_VARIANCE);
});

test('pixel covariance floor protects tiny splats and guarded projection stays finite', () => {
  const tiny = project({covariance: [1e-20, 0, 0, 1e-20, 0, 1e-20]});
  close(tiny.eigenvalues[0], MIN_PIXEL_VARIANCE);
  close(tiny.eigenvalues[1], MIN_PIXEL_VARIANCE);
  const enormousOffscreen = project({position: [1e9, 1e9, -.101], covariance: [1e15, 0, 0, 1e15, 0, 1e15]});
  assert.ok([...enormousOffscreen.covariance, ...enormousOffscreen.stdDev, ...enormousOffscreen.axes.flat()].every(Number.isFinite));
  assert.ok(enormousOffscreen.stdDev.every(value => value * 3 <= 1600));
  for (const z of [1, 0, -.01, -.1, -100, -101, NaN]) assert.equal(project({position: [0, 0, z]}), null);
});

test('sorting uses transformed camera depth, excludes near/behind/far, and retains stable ties', () => {
  const centers = [0, 0, -3, 0, 0, -8, 0, 0, 2, 0, 0, -.05, 0, 0, -8, 0, 0, -101];
  assert.deepEqual(sortVisibleSplatIndices(centers, identity, .1, 100), [1, 4, 0]);
  // A view rotation makes x, not original z, the camera depth coordinate.
  const view = [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1];
  assert.deepEqual(sortVisibleSplatIndices([-2, 0, -100, -5, 0, 100, 3, 0, 0], view, .1, 100), [1, 0]);
});

test('orthographic covariance projection has no artificial perspective depth scaling', () => {
  const orthographic = [.5, 0, 0, 0, 0, .5, 0, 0, 0, 0, -.02, 0, 0, 0, -1, 1];
  const closeSplat = project({projection: orthographic}), farSplat = project({projection: orthographic, position: [0, 0, -50]});
  assert.deepEqual(closeSplat.covariance, farSplat.covariance);
  close(closeSplat.covariance[0], 40000 + MIN_PIXEL_VARIANCE);
});

test('normalized pixel filtering preserves a Gaussian alpha integral instead of dilating it', () => {
  // A one-pixel sensor's Gaussian approximation; Mip-Splatting Sec. 6.1.
  assert.equal(MIN_PIXEL_VARIANCE, .1);
  const original = [4, 0, .01], alpha = .8;
  const filtered = filterCovariance2D(original);
  const determinant = covariance => covariance[0] * covariance[2] - covariance[1] ** 2;
  const integratedAlpha = (covariance, peak) => 2 * Math.PI * Math.sqrt(determinant(covariance)) * peak;
  close(integratedAlpha(filtered.covariance, alpha * filtered.opacityScale), integratedAlpha(original, alpha));
  close(filtered.opacityScale, Math.sqrt((4 / 4.1) * (.01 / .11)));
  assert.ok(integratedAlpha(filtered.covariance, alpha) > integratedAlpha(original, alpha) * 3);
});

test('pixel-filter compensation is rotation invariant and does not change principal directions', () => {
  const aligned = filterCovariance2D([4, 0, .01]);
  const rotated = filterCovariance2D([2.005, 1.995, 2.005]);
  close(rotated.opacityScale, aligned.opacityScale);
  close(rotated.covariance[0], 2.105); close(rotated.covariance[1], 1.995); close(rotated.covariance[2], 2.105);
  const footprint = project({covariance: covarianceFromScaleRotation([.02, .002, .001], [0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)])});
  close(Math.abs(footprint.axes[0][0]), Math.SQRT1_2);
  close(Math.abs(footprint.axes[0][1]), Math.SQRT1_2);
  assert.ok(footprint.opacityScale > 0 && footprint.opacityScale < 1);
});

test('unresolved thin fibers lose peak opacity while resolved splats remain essentially unchanged', () => {
  const thin = filterCovariance2D([.16, 0, .0064]);
  close(thin.opacityScale, Math.sqrt((.16 * .0064) / (.26 * .1064)));
  assert.ok(thin.opacityScale < .2);
  const resolved = filterCovariance2D([1e6, 0, 1e6]);
  assert.ok(resolved.opacityScale > .999999);
  const rankOne = filterCovariance2D([1, 1, 1]);
  assert.equal(rankOne.opacityScale, 0);
  const tiny = filterCovariance2D([1e-20, 0, 1e-20]);
  assert.ok(Number.isFinite(tiny.opacityScale) && tiny.opacityScale < 1e-18);
  const huge = filterCovariance2D([1e200, 0, 1e200]);
  assert.equal(huge.opacityScale, 1);
  for (const [covariance, variance] of [[[1, 0, 1], 0], [[-1, 0, 1], .1], [[1, NaN, 1], .1]]) {
    assert.throws(() => filterCovariance2D(covariance, variance), RangeError);
  }
});

test('screen-space filtering compensation approaches unity on zoom without modifying 3D covariance', () => {
  const covariance = [.0004, 0, 0, .000004, 0, .000001], original = [...covariance];
  const distant = project({covariance, position: [0, 0, -8]});
  const near = project({covariance, position: [0, 0, -1]});
  assert.ok(near.opacityScale > distant.opacityScale);
  assert.deepEqual(covariance, original);
  const determinant = footprint => footprint.covariance[0] * footprint.covariance[2] - footprint.covariance[1] ** 2;
  const distantMass = Math.sqrt(determinant(distant)) * distant.opacityScale;
  const nearMass = Math.sqrt(determinant(near)) * near.opacityScale;
  close(nearMass / distantMass, 64);
});

test('Mesh packs full anisotropic covariance and color in sorted instance order', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  const angle = Math.PI / 4;
  const mesh = new GaussianSplatMesh(dataset(splat([0, 0, -2], {color: [1, 0, 0]}),
    splat([0, 0, -5], {rotation: [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)], color: [0, 1, 0]}),
    splat([0, 0, 2]), splat([0, 0, -.03])));
  try {
    const camera = new THREE.PerspectiveCamera(50, 4 / 3, .1, 50);
    assert.ok(mesh instanceof THREE.Mesh);
    assert.equal(mesh.geometry.instanceCount, 0);
    assert.equal(mesh.update(camera, 800, 600), mesh);
    assert.deepEqual(mesh.sortedIndices, [1, 0]);
    assert.equal(mesh.geometry.instanceCount, 2);
    assert.equal(mesh.userData.visibleSplatCount, 2);
    assert.equal(mesh.splatCount, 4);
    assert.deepEqual(Array.from(mesh.geometry.attributes.aCenter.array.slice(0, 6)), [0, 0, -5, 0, 0, -2]);
    assert.deepEqual(Array.from(mesh.geometry.attributes.aColor.array.slice(0, 3)), [0, 1, 0]);
    [.025, .015, 0].forEach((value, i) => close(mesh.geometry.attributes.aCovA.array[i], value, 1e-7));
    [.025, 0, .0009].forEach((value, i) => close(mesh.geometry.attributes.aCovB.array[i], value, 1e-7));
    assert.equal(mesh.material.blending, THREE.NormalBlending);
    assert.equal(mesh.material.depthTest, true); assert.equal(mesh.material.depthWrite, false);
    assert.equal(mesh.material.transparent, true); assert.equal(mesh.material.toneMapped, true);
    assert.equal(mesh.material.uniforms.uMinVariance.value, .1);
    assert.equal(mesh.material.uniforms.uOpacityCompensation.value, 1);
    assert.equal(mesh.frustumCulled, false);
  } finally { mesh.dispose(); }
});

test('Mesh caches unchanged view sorting while viewport and projection can change', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  const mesh = new GaussianSplatMesh(dataset(splat([0, 0, -2]), splat([0, 0, -5])));
  try {
    const camera = new THREE.PerspectiveCamera(50, 4 / 3, .1, 50);
    mesh.update(camera, 800, 600);
    const order = mesh.sortedIndices, version = mesh.geometry.attributes.aCenter.version;
    mesh.update(camera, 1600, 1200);
    assert.equal(mesh.userData.sortCount, 1);
    assert.equal(mesh.sortedIndices, order);
    assert.equal(mesh.geometry.attributes.aCenter.version, version);
    assert.deepEqual(mesh.material.uniforms.uViewport.value.toArray(), [1600, 1200]);
    camera.fov = 65; camera.updateProjectionMatrix();
    mesh.update(camera, 1600, 1200);
    assert.equal(mesh.userData.sortCount, 1);
    camera.position.z = 2; mesh.update(camera, 1600, 1200);
    assert.equal(mesh.userData.sortCount, 2);
    mesh.position.z = 1; mesh.update(camera, 1600, 1200);
    assert.equal(mesh.userData.sortCount, 3);
    camera.near = 3; camera.updateProjectionMatrix(); mesh.update(camera, 1600, 1200);
    assert.equal(mesh.userData.sortCount, 4);
    assert.deepEqual(mesh.sortedIndices, [1]);
    camera.far = 5; camera.updateProjectionMatrix(); mesh.update(camera, 1600, 1200);
    assert.equal(mesh.geometry.instanceCount, 0);
    assert.equal(mesh.material.uniforms.uNear.value, 3); assert.equal(mesh.material.uniforms.uFar.value, 5);
    mesh.update(camera, 1600, 1200);
    assert.equal(mesh.userData.sortCount, 5);
  } finally { mesh.dispose(); }
});

test('Mesh incorporates parent transforms and nonuniform object scale into view covariance', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  const mesh = new GaussianSplatMesh(dataset(splat([0, 0, 0]), splat([0, 0, .5]), splat([0, 0, -.5])));
  try {
    const objectParent = new THREE.Group();
    objectParent.position.z = -4; objectParent.rotation.z = Math.PI / 2; objectParent.scale.set(3, 2, 1);
    objectParent.add(mesh); mesh.scale.set(2, .5, 4); mesh.position.set(.2, .3, 0);
    const cameraParent = new THREE.Group(), camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
    cameraParent.position.z = 3; camera.position.z = 1; cameraParent.add(camera);
    mesh.update(camera, 900, 900);
    assert.deepEqual(mesh.sortedIndices, [2, 0, 1]);
    [0, 6, 0, -1, 0, 0, 0, 0, 4].forEach((value, i) => close(mesh.material.uniforms.uViewLinear.value.elements[i], value));
    const expectedView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    assert.deepEqual(mesh.material.uniforms.uViewLinear.value.elements, new THREE.Matrix3().setFromMatrix4(expectedView).elements);
    const projected = projectGaussian({position: [0, 0, 0], covariance: [.04, 0, 0, .01, 0, .0009],
      modelView: expectedView, projection: camera.projectionMatrix, viewport: [900, 900], near: camera.near, far: camera.far});
    assert.ok(projected && projected.stdDev.every(Number.isFinite));
    assert.ok(projected.eigenvalues[0] > projected.eigenvalues[1] * 50);
    objectParent.rotation.z = 0; mesh.update(camera, 900, 900);
    assert.equal(mesh.userData.sortCount, 2);
    [6, 0, 0, 0, 1, 0, 0, 0, 4].forEach((value, i) => close(mesh.material.uniforms.uViewLinear.value.elements[i], value));
  } finally { mesh.dispose(); }
});

test('Mesh updates inherited camera rotation before computing camera-depth order', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  const mesh = new GaussianSplatMesh(dataset(splat([-2, 0, -100]), splat([-5, 0, 100]), splat([3, 0, 0])));
  try {
    const parent = new THREE.Group(), camera = new THREE.PerspectiveCamera(50, 1, .1, 200);
    parent.rotation.y = Math.PI / 2; parent.add(camera);
    mesh.update(camera, 800, 800);
    assert.deepEqual(mesh.sortedIndices, [1, 0]);
    parent.rotation.y = -Math.PI / 2;
    mesh.update(camera, 800, 800);
    assert.deepEqual(mesh.sortedIndices, [2]);
    assert.equal(mesh.userData.sortCount, 2);
  } finally { mesh.dispose(); }
});

test('dataset replacement releases old geometry and failed replacement preserves the rendered state', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  const original = dataset(splat([0, 0, -3])), mesh = new GaussianSplatMesh(original);
  try {
    const camera = new THREE.PerspectiveCamera(50, 1, .1, 50);
    mesh.update(camera, 800, 800);
    const oldGeometry = mesh.geometry, oldMaterial = mesh.material, oldOrder = mesh.sortedIndices;
    let oldGeometryDisposals = 0, materialDisposals = 0;
    oldGeometry.addEventListener('dispose', () => oldGeometryDisposals++);
    oldMaterial.addEventListener('dispose', () => materialDisposals++);
    assert.throws(() => mesh.setDataset(dataset(splat([0, 0, -4], {scale: [0, .1, .1]}))), RangeError);
    assert.equal(mesh.dataset, original); assert.equal(mesh.geometry, oldGeometry);
    assert.equal(mesh.sortedIndices, oldOrder); assert.equal(mesh.geometry.instanceCount, 1);
    assert.equal(oldGeometryDisposals, 0);
    mesh.update(camera, 800, 800); assert.equal(mesh.userData.sortCount, 1);
    mesh.material.uniforms.uDebug.value = 1;
    const replacement = dataset(splat([0, 0, -6]), splat([0, 0, -8]));
    assert.equal(mesh.setDataset(replacement), mesh);
    assert.equal(oldGeometryDisposals, 1); assert.equal(materialDisposals, 0);
    assert.equal(mesh.material, oldMaterial); assert.equal(mesh.material.uniforms.uDebug.value, 1);
    assert.equal(mesh.geometry.instanceCount, 0); assert.equal(mesh.splatCount, 2);
    mesh.update(camera, 800, 800);
    assert.deepEqual(mesh.sortedIndices, [1, 0]);
    assert.equal(mesh.userData.sortCount, 2);
    assert.equal(mesh.geometry.instanceCount, 2);
  } finally { mesh.dispose(); }
});

test('Mesh disposal is idempotent and rejects subsequent update/replacement', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  const mesh = new GaussianSplatMesh(dataset(splat([0, 0, -3])));
  let geometryDisposals = 0, materialDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  mesh.material.addEventListener('dispose', () => materialDisposals++);
  mesh.dispose(); mesh.dispose();
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  assert.throws(() => mesh.update(new THREE.PerspectiveCamera(), 800, 600), /disposed/);
  assert.throws(() => mesh.setDataset(dataset()), /disposed/);
});

test('Mesh rejects malformed schema and Float32 overflow before those values reach the shader', async () => {
  const {GaussianSplatMesh, THREE} = await loadRenderer();
  for (const invalid of [{splats: {}}, dataset(splat([Infinity, 0, 0])),
    dataset(splat([0, 0, -3], {scale: [-1, .1, .1]})), dataset(splat([0, 0, -3], {rotation: [0, 0, 0, 0]})),
    dataset(splat([0, 0, -3], {rotation: [0, 0, 0, 2]})), dataset(splat([0, 0, -3], {color: [1.1, 0, 0]})),
    dataset(splat([0, 0, -3], {opacity: NaN})), dataset(splat([1e50, 0, -3])),
    dataset(splat([0, 0, -3], {scale: [1e50, .1, .1]}))]) assert.throws(() => new GaussianSplatMesh(invalid));
  const mesh = new GaussianSplatMesh(dataset());
  try {
    const camera = new THREE.PerspectiveCamera();
    assert.throws(() => mesh.update({}, 800, 600), /camera/);
    assert.throws(() => mesh.update(camera, 0, 600), /viewport/);
    assert.throws(() => mesh.update(camera, 800, NaN), /viewport/);
    mesh.update(camera, 800, 600);
    assert.equal(mesh.geometry.instanceCount, 0);
  } finally { mesh.dispose(); }
});
