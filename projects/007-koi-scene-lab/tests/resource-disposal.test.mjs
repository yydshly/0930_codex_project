import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../tooling/fixture.cjs', import.meta.url));
const { build } = require('esbuild');
const compiled = await build({ stdin: { contents: "export * as THREE from 'three'; export {disposeObject} from './materials.js';", resolveDir: fileURLToPath(new URL('../src/', import.meta.url)) }, bundle: true, write: false, platform: 'node', format: 'cjs', nodePaths: [fileURLToPath(new URL('../tooling/node_modules/', import.meta.url))], logLevel: 'silent' });
const runtime = { exports: {} }; new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(runtime, runtime.exports, require);
const { THREE, disposeObject } = runtime.exports;
const countDisposals = resource => { let count = 0; resource.addEventListener('dispose', () => count++); return () => count; };
function tree(meshes) { const root = new THREE.Group(); root.add(...meshes); return root; }

// This Node fixture verifies ImageBitmap ownership and type guards. It does not
// decode a native image or measure browser/GPU memory; browser QA is separate.
function withImageBitmap(callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'ImageBitmap');
  class FixtureImageBitmap { constructor() { this.width = this.height = 1; this.closed = 0; } close() { this.closed++; } }
  Object.defineProperty(globalThis, 'ImageBitmap', { configurable: true, value: FixtureImageBitmap });
  try { return callback(FixtureImageBitmap); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'ImageBitmap', descriptor); else delete globalThis.ImageBitmap; }
}

test('a detached import disposes shared geometry, material arrays and repeated texture slots once', () => {
  const geometry = new THREE.BoxGeometry(), texture = new THREE.Texture({ width: 1, height: 1 });
  const a = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture }), b = new THREE.MeshStandardMaterial({ map: texture, roughnessMap: texture });
  const counts = [geometry, a, b, texture].map(countDisposals);
  disposeObject(tree([new THREE.Mesh(geometry, [a, b, a]), new THREE.Mesh(geometry, b), new THREE.Mesh(geometry, a)]));
  assert.deepEqual(counts.map(count => count()), [1, 1, 1, 1]);
});

test('shared Three skeleton disposal releases its actual bone texture once and clears it', () => {
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial(), skeleton = new THREE.Skeleton([new THREE.Bone()]);
  skeleton.computeBoneTexture(); const boneTexture = skeleton.boneTexture, boneCount = countDisposals(boneTexture);
  let skeletonCount = 0; const dispose = skeleton.dispose; skeleton.dispose = function () { skeletonCount++; return dispose.call(this); };
  // A repeated material slot must not produce a second bone texture disposal.
  material.map = boneTexture;
  const meshes = [new THREE.SkinnedMesh(geometry, material), new THREE.SkinnedMesh(geometry, material)];
  meshes.forEach(mesh => mesh.bind(skeleton));
  disposeObject(tree(meshes));
  assert.equal(skeletonCount, 1); assert.equal(boneCount(), 1); assert.equal(skeleton.boneTexture, null);
});

test('texture clones, separate texture sources and cube faces close each owned ImageBitmap once', () => withImageBitmap(ImageBitmap => {
  const image = new ImageBitmap(), second = new ImageBitmap();
  const a = new THREE.Texture(image), b = a.clone(), c = new THREE.Texture(image), cube = new THREE.CubeTexture([image, second, image]);
  assert.equal(a.source, b.source); assert.notEqual(a.source, c.source);
  const material = new THREE.MeshStandardMaterial({ map: a, bumpMap: b, roughnessMap: c, envMap: cube });
  const counts = [a, b, c, cube].map(countDisposals);
  disposeObject(tree([new THREE.Mesh(new THREE.BoxGeometry(), material)]));
  assert.deepEqual(counts.map(count => count()), [1, 1, 1, 1]); assert.equal(image.closed, 1); assert.equal(second.closed, 1);
}));

test('only confirmed ImageBitmap instances are closed, never video, canvas or objects spoofing its name', () => withImageBitmap(() => {
  const sources = [{ tagName: 'VIDEO' }, { tagName: 'CANVAS' }, { tagName: 'IMG' }, { isImageBitmap: true, constructor: { name: 'ImageBitmap' }, [Symbol.toStringTag]: 'ImageBitmap' }];
  sources.forEach(source => { source.closed = 0; source.close = () => source.closed++; });
  const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture(sources[0]), bumpMap: new THREE.Texture(sources[1]), normalMap: new THREE.Texture(sources[2]), envMap: new THREE.CubeTexture([sources[3]]) });
  disposeObject(tree([new THREE.Mesh(new THREE.BoxGeometry(), material)]));
  assert.deepEqual(sources.map(source => source.closed), [0, 0, 0, 0]);
}));

test('texture arrays and structured shader uniforms are released without traversing arbitrary material metadata', () => {
  const texture = new THREE.Texture(), second = new THREE.Texture(), metadataTexture = new THREE.Texture();
  const structured = { layers: [texture, { texture: second }] }; structured.self = structured;
  const material = new THREE.ShaderMaterial({ uniforms: { direct: { value: texture }, structured: { value: structured } } });
  material.textureLayers = [texture, second, texture]; material.userData = { externalTexture: metadataTexture };
  const counts = [texture, second, metadataTexture].map(countDisposals);
  disposeObject(tree([new THREE.Mesh(new THREE.BoxGeometry(), material)]));
  assert.deepEqual(counts.map(count => count()), [1, 1, 0]);
});

test('later disposal calls release newly assigned resources instead of retaining a global disposed registry', () => withImageBitmap(ImageBitmap => {
  const first = new ImageBitmap(), second = new ImageBitmap(), geometry = new THREE.BoxGeometry(), texture = new THREE.Texture(first), material = new THREE.MeshStandardMaterial({ map: texture });
  const root = tree([new THREE.Mesh(geometry, material)]), counts = [geometry, texture, material].map(countDisposals);
  disposeObject(root); texture.image = second; disposeObject(root);
  assert.deepEqual(counts.map(count => count()), [2, 2, 2]); assert.equal(first.closed, 1); assert.equal(second.closed, 1);
}));

test('environments without ImageBitmap still release textures and preserve unrecognized image data', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'ImageBitmap'); delete globalThis.ImageBitmap;
  const image = { width: 1, height: 1, closed: 0, close() { this.closed++; } }, texture = new THREE.Texture(image), count = countDisposals(texture);
  try { disposeObject(tree([new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: texture }))])); assert.equal(count(), 1); assert.equal(image.closed, 0); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'ImageBitmap', descriptor); }
});
