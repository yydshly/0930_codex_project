import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAtmosphere } from '../src/scene/atmosphere.js';

function setup(t) {
  const scene = new THREE.Scene();
  const atmosphere = createAtmosphere(scene, new THREE.PerspectiveCamera(), {}, { quality: 'low' });
  t.after(() => atmosphere.dispose());
  const sky = scene.getObjectByName('Atmosphere · procedural storm sky');
  // Sky and valley volume share this same integrated phase uniform.
  const phase = () => [sky.material.uniforms.uTime.value];
  return { atmosphere, sky, phase };
}

test('changing wind after 50 seconds preserves cloud position and changes only subsequent speed', t => {
  const { atmosphere, phase } = setup(t);
  atmosphere.update(50, { wind: 1 });
  const before = phase();
  assert.ok(before.every(value => value === 50));
  atmosphere.update(50, { wind: 2 });
  assert.deepEqual(phase(), before);
  atmosphere.update(51, { wind: 2 });
  assert.ok(phase().every(value => value === 52));
});

test('paused simulation freezes cloud drift while weather settings remain responsive', t => {
  const { atmosphere, sky, phase } = setup(t);
  atmosphere.update(50, { wind: 1 });
  const before = phase();
  const colorBefore = sky.material.uniforms.uHorizon.value.clone();
  for (let frame = 0; frame < 20; frame += 1) {
    atmosphere.update(50, { wind: 2, weather: 'sunset' });
  }
  assert.deepEqual(phase(), before);
  assert.ok(!sky.material.uniforms.uHorizon.value.equals(colorBefore));
});

test('the depth and volume passes restore the caller render target and clear state', t => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1.6, .1, 4000);
  camera.position.set(-2, 51, 20);
  const callerTarget = { name: 'caller target' };
  let currentTarget = callerTarget;
  const draws = [];
  const renderer = {
    autoClear: false,
    getDrawingBufferSize(size) { return size.set(800, 500); },
    getRenderTarget() { return currentTarget; },
    setRenderTarget(target) { currentTarget = target; },
    render(renderedScene) { draws.push({ scene: renderedScene, target: currentTarget }); },
  };
  const atmosphere = createAtmosphere(scene, camera, renderer, { quality: 'low' });
  t.after(() => atmosphere.dispose());
  atmosphere.render();
  assert.equal(draws.length, 2);
  assert.equal(draws[0].scene, scene);
  assert.equal(draws[0].target.width, 800);
  assert.equal(draws[0].target.height, 500);
  assert.ok(draws[0].target.depthTexture instanceof THREE.DepthTexture);
  assert.equal(draws[1].target, callerTarget);
  assert.equal(currentTarget, callerTarget);
  assert.equal(renderer.autoClear, false);
  const postUniforms = draws[1].scene.children[0].material.uniforms;
  assert.ok(postUniforms.uCameraWorld.value.equals(camera.matrixWorld));
  assert.equal(postUniforms.uTime, scene.getObjectByName('Atmosphere · procedural storm sky').material.uniforms.uTime);
  // A WebGL draw failure must still leave the caller state intact.
  renderer.render = () => { throw new Error('draw failure'); };
  assert.throws(() => atmosphere.render(), /draw failure/);
  assert.equal(currentTarget, callerTarget);
  assert.equal(renderer.autoClear, false);
});

test('reset clears accumulated drift and calm wind stops horizontal movement', t => {
  const { atmosphere, phase } = setup(t);
  atmosphere.update(50, { wind: 2 });
  assert.ok(phase().every(value => value === 100));
  atmosphere.update(0, { wind: 1 });
  assert.ok(phase().every(value => value === 0));
  atmosphere.update(1, { wind: 1 });
  assert.ok(phase().every(value => value === 1));
  atmosphere.update(5, { wind: 0 });
  assert.ok(phase().every(value => value === 1));
});
