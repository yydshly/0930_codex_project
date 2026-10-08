import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../tooling/node_modules/three/build/three.module.js';
import {createReferencePlushBrush, referencePlushProxyHit, referencePlushSourceRay} from '../src/reference-plush-brush.js';
import {paintReferenceGroom, sampleReferenceGroom} from '../src/reference-plush-fur.js';

const close = (actual, expected) => actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-8));

test('source proxy picks the front, back and side arm without a Gaussian raycast', () => {
  close(referencePlushProxyHit([0, -1, -3], [0, 0, 1]).point, [0, -1, -.93]);
  close(referencePlushProxyHit([0, -1, 3], [0, 0, -1]).point, [0, -1, .93]);
  const arm = referencePlushProxyHit([3, -1.02, 0], [-1, 0, 0]);
  close(arm.point, [1.17, -1.02, 0]);
  close(arm.normal, [1, 0, 0]);
  assert.ok(referencePlushProxyHit([-.42, -.1, -3], [0, 0, 1]));
});

test('the proxy brush reaches the decoded front coat depth instead of painting an interior field', () => {
  const hit = referencePlushProxyHit([0, -1, -3], [0, 0, 1]);
  const groom = paintReferenceGroom({}, hit.point, [.08, 0, 0], .26, 1);
  const front = sampleReferenceGroom(groom, [0, -1, -.94]);
  assert.ok(front[0] > .015);
  close(sampleReferenceGroom(groom, [0, -1, .94]), [0, 0, 0]);
});

test('rounded silhouette rejects empty corners and ray directions away from the body', () => {
  assert.equal(referencePlushProxyHit([1.1, -.3, -3], [0, 0, 1]), null);
  assert.equal(referencePlushProxyHit([0, -1, -3], [0, 0, -1]), null);
  assert.equal(referencePlushProxyHit([0, -1, -3], [0, 0, 0]), null);
  assert.equal(referencePlushProxyHit([NaN, -1, -3], [0, 0, 1]), null);
});

test('beret and front eyes block fur behind them while the back stays brushable', () => {
  assert.equal(referencePlushProxyHit([0, -2.2, -3], [0, 0, 1]), null);
  assert.equal(referencePlushProxyHit([.42, -1.92, -3], [0, 0, 1]), null);
  assert.equal(referencePlushProxyHit([-.225, -1.40, -3], [0, 0, 1]), null);
  assert.equal(referencePlushProxyHit([.225, -1.40, -3], [0, 0, 1]), null);
  assert.equal(referencePlushProxyHit([-.29, -1.44, -3], [0, 0, 1]), null);
  assert.equal(referencePlushProxyHit([.29, -1.44, -3], [0, 0, 1]), null);
  assert.ok(referencePlushProxyHit([.29, -1.44, 3], [0, 0, -1]));
  assert.ok(referencePlushProxyHit([0, -1.44, -3], [0, 0, 1]));
});

test('raw picking follows centered mesh coordinates through X π, actor yaw, scale and placement', () => {
  const scene = new THREE.Scene(), actor = new THREE.Group(), group = new THREE.Group();
  const centered = new THREE.Group(), mesh = new THREE.Group();
  actor.position.set(3, 2, -4); actor.rotation.y = .73; actor.scale.setScalar(1.3);
  group.rotation.x = Math.PI; group.scale.setScalar(.873);
  centered.position.set(-.0026, 1.2347, .0032);
  scene.add(actor); actor.add(group); group.add(centered); centered.add(mesh);
  scene.updateMatrixWorld(true);
  const origin = new THREE.Vector3(.11, -.94, -3).applyMatrix4(mesh.matrixWorld);
  const direction = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  const raw = referencePlushSourceRay(THREE, {group, meshes: [mesh]}, {origin, direction});
  close(raw.origin, [.11, -.94, -3]); close(raw.direction, [0, 0, 1]);
  assert.ok(referencePlushProxyHit(raw.origin, raw.direction));
  assert.equal(referencePlushSourceRay(THREE, null, {origin, direction}), null);
  group.scale.setScalar(0);
  assert.equal(referencePlushSourceRay(THREE, {group, meshes: [mesh]}, {origin, direction}), null);
});

function brushFixture() {
  const listeners = new Map(), captured = new Set();
  const canvas = {style: {cursor: 'grab', touchAction: 'pan-y'},
    getBoundingClientRect: () => ({left: 0, top: 0, width: 400, height: 400}),
    addEventListener(type, listener, options) {
      const rows = listeners.get(type) ?? [];
      rows.push({listener, capture: options === true || options?.capture === true}); listeners.set(type, rows);
    },
    removeEventListener(type, listener) { listeners.set(type, (listeners.get(type) ?? []).filter(row => row.listener !== listener)); },
    setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id),
    releasePointerCapture(id) { captured.delete(id); emit('lostpointercapture', {pointerId: id}); }};
  function emit(type, extra = {}) {
    const event = {type, clientX: 200, clientY: 200, pointerId: 1, isPrimary: true, button: 0,
      prevented: false, stopped: false, preventDefault() {this.prevented = true;},
      stopImmediatePropagation() {this.stopped = true;}, ...extra};
    const rows = [...(listeners.get(type) ?? [])].sort((a, b) => Number(b.capture) - Number(a.capture));
    for (const row of rows) { row.listener(event); if (event.stopped) break; }
    return event;
  }
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 10);
  camera.position.set(0, -1, -3); camera.lookAt(0, -1, 0); camera.updateMatrixWorld(true);
  const group = new THREE.Group(), mesh = new THREE.Group(); group.add(mesh);
  const calls = {start: [], change: [], finish: [], mode: [], navigation: 0};
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) canvas.addEventListener(type, () => calls.navigation++);
  let active = true, style = {length: 1, curl: 0, groom: []};
  const brush = createReferencePlushBrush({THREE, canvas, camera, getAsset: () => ({group, meshes: [mesh]}),
    isActive: () => active, getStyle: () => style, onStart: value => calls.start.push(value),
    onChange: value => {style = value; calls.change.push(value);}, onFinish: value => calls.finish.push(value),
    onModeChange: value => calls.mode.push(value)});
  const pixels = point => {
    const p = new THREE.Vector3(...point).project(camera);
    return {clientX: (p.x + 1) * 200, clientY: (1 - p.y) * 200};
  };
  return {brush, canvas, calls, emit, pixels, setActive: value => {active = value;}};
}

test('a captured drag paints source-space motion and finishes once when capture is released', () => {
  const fx = brushFixture(); fx.brush.setEnabled(true);
  assert.equal(fx.emit('pointerdown').prevented, true);
  fx.emit('pointermove', fx.pixels([.18, -1, 0]));
  fx.emit('pointermove', fx.pixels([.32, -1, 0]));
  fx.emit('pointerup', fx.pixels([.32, -1, 0]));
  assert.equal(fx.calls.start.length, 1); assert.ok(fx.calls.change.length > 0);
  assert.ok(fx.calls.change.at(-1).groom.length > 0);
  assert.equal(fx.calls.finish.length, 1); assert.equal(fx.calls.finish[0].changed, true);
  assert.equal(fx.calls.finish[0].reason, 'up'); assert.equal(fx.calls.navigation, 0);
  assert.equal(fx.canvas.hasPointerCapture(1), false);
  fx.brush.dispose(); assert.equal(fx.canvas.style.cursor, 'grab'); assert.equal(fx.canvas.style.touchAction, 'pan-y');
});

test('a miss reports no change and cannot trigger navigation or a second finish', () => {
  const fx = brushFixture(); fx.brush.setEnabled(true);
  fx.emit('pointerdown', {clientX: 0, clientY: 0}); fx.emit('pointermove'); fx.emit('wheel'); fx.emit('pointerup');
  assert.equal(fx.calls.start.length, 0); assert.equal(fx.calls.change.length, 0);
  assert.equal(fx.calls.finish.length, 1); assert.equal(fx.calls.finish[0].changed, false);
  assert.equal(fx.calls.finish[0].reason, 'miss'); assert.equal(fx.calls.navigation, 0);
  fx.brush.setEnabled(false); fx.emit('pointerdown'); assert.equal(fx.calls.navigation, 1);
  fx.brush.dispose();
});

test('mode disabling and inactive views close a stroke without leaving capture or duplicate history', () => {
  const fx = brushFixture(); fx.brush.setEnabled(true); fx.emit('pointerdown'); fx.brush.setEnabled(false);
  assert.equal(fx.calls.finish.length, 1); assert.equal(fx.calls.finish[0].reason, 'disabled');
  assert.equal(fx.canvas.hasPointerCapture(1), false); assert.deepEqual(fx.calls.mode, [true, false]);
  fx.brush.setEnabled(true); fx.emit('pointerdown'); fx.setActive(false); fx.emit('pointermove');
  assert.equal(fx.calls.finish.length, 2); assert.equal(fx.calls.finish[1].reason, 'inactive');
  assert.equal(fx.canvas.hasPointerCapture(1), false); fx.emit('pointerup'); assert.equal(fx.calls.finish.length, 2);
  fx.brush.dispose();
});
