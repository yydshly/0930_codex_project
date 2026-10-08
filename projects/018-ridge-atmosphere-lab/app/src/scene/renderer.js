import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrain } from './terrain.js';
import { createAtmosphere } from './atmosphere.js';
import { createRider, HORSE_TRAVEL_SPEED } from './rider.js';

export function createRidgeScene(container, settings, onStats, onError, onCameraChange) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.domElement.setAttribute('aria-label', '实时三维山脊场景');
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(55, 1, .15, 5500);
  const quality = innerWidth < 700 ? 'low' : 'high';
  const terrain = createTerrain(scene, { quality });
  const atmosphere = createAtmosphere(scene, camera, renderer, { quality });
  const sunlight = atmosphere.sun;
  if (sunlight) {
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    Object.assign(sunlight.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 160 });
    sunlight.shadow.bias = -.00012;
    sunlight.shadow.normalBias = .025;
    sunlight.shadow.radius = 3;
    scene.add(sunlight.target);
  }
  const rider = createRider(scene);
  let shadowDirty = true;
  rider.ready.then(() => { shadowDirty = true; }).catch(e => onError(`马匹模型加载失败：${e.message}`));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2.8;
  controls.maxDistance = 350;
  controls.maxPolarAngle = Math.PI * .495;
  controls.enabled = false;
  let time = 0, progress = 0, prev = performance.now(), previousMode = 'follow', fpsTime = 0, frames = 0, disposed = false;
  const position = new THREE.Vector3(), target = new THREE.Vector3(), desired = new THREE.Vector3();
  const orbitPosition = new THREE.Vector3(), orbitDelta = new THREE.Vector3();
  const orbitDirection = new THREE.Vector3(), riderCenter = new THREE.Vector3();
  const savedPosition = new THREE.Vector3(), savedRotation = new THREE.Quaternion();
  const followRotation = new THREE.Quaternion(), lookMatrix = new THREE.Matrix4();
  const followOffset = new THREE.Vector3(), riderCenterOffset = new THREE.Vector3(0, 1.5, 0);
  const sunTargetOffset = new THREE.Vector3(0, 1, -4), sunOffset = new THREE.Vector3(-36, 68, 24);
  let initialized = false, returningToFollow = false;
  let lastShadowWind, lastShadowTerrain, lastShadowGrass;
  function initializeOrbit() {
    // Flush damping left by an earlier orbit without changing the current view.
    savedPosition.copy(camera.position);
    savedRotation.copy(camera.quaternion);
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    camera.position.copy(savedPosition);
    camera.quaternion.copy(savedRotation);
    camera.getWorldDirection(orbitDirection);
    riderCenter.copy(position).add(riderCenterOffset).sub(camera.position);
    const distance = Math.max(controls.minDistance, riderCenter.dot(orbitDirection));
    controls.target.copy(camera.position).addScaledVector(orbitDirection, distance);
    orbitPosition.copy(position);
  }
  function takeCameraControl() {
    if (settings.current.camera === 'orbit' && previousMode === 'orbit') return;
    initializeOrbit();
    previousMode = 'orbit';
    controls.enabled = true;
    if (settings.current.camera !== 'orbit') {
      // The ref changes synchronously for the first pointer event; React owns
      // the matching persistent setting so later renders cannot undo it.
      settings.current = { ...settings.current, camera: 'orbit' };
      onCameraChange?.('orbit');
    }
  }
  // Capture runs before OrbitControls checks enabled, including the very first
  // drag, wheel event or touch contact while the automatic camera is active.
  renderer.domElement.addEventListener('pointerdown', takeCameraControl, true);
  renderer.domElement.addEventListener('wheel', takeCameraControl, { capture: true, passive: true });
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    camera.aspect = width / height;
    // Keep both mountain landmarks visible when the app is in a narrow panel.
    camera.fov = camera.aspect < 1.35
      ? Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27.5)) * 1.35 / camera.aspect)))
      : 55;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const lost = e => { e.preventDefault(); onError('图形上下文已暂停，请刷新恢复场景。'); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  function animate(now) {
    if (disposed) return;
    const realDt = Math.min((now - prev) / 1000, .07);
    prev = now;
    const p = settings.current;
    const dt = p.paused ? 0 : realDt;
    time += dt;
    if (!p.paused) progress += dt * HORSE_TRAVEL_SPEED;
    if (progress > 390) { progress = 0; initialized = false; }
    const z = 12 - progress;
    const x = terrain.ridgeX(z);
    position.set(x, terrain.heightAt(x, z), z);
    const nextX = terrain.ridgeX(z - 2);
    const heading = Math.atan2(x - nextX, 2);
    rider.group.position.copy(position);
    const slope = Math.atan2(terrain.heightAt(nextX, z - 2) - position.y, Math.hypot(nextX - x, 2));
    rider.group.rotation.set(Math.max(-.12, Math.min(.12, slope)), heading, 0, 'YXZ');
    rider.update(time, dt, p.wind, !p.paused);
    if (p.camera === 'follow') {
      controls.enabled = false;
      if (previousMode !== 'follow') returningToFollow = true;
      followOffset.set(camera.aspect < 1 ? .1 : 1.15, 3.1, 7.8);
      desired.copy(position).add(followOffset);
      // Critically damped feeling without frame-rate dependent lerp.
      camera.position.lerp(desired, initialized ? 1 - Math.exp(-realDt * 3) : 1);
      target.set(terrain.ridgeX(z - 28), position.y - 1.4, z - 28);
      lookMatrix.lookAt(camera.position, target, camera.up);
      followRotation.setFromRotationMatrix(lookMatrix);
      if (initialized && returningToFollow) {
        camera.quaternion.slerp(followRotation, 1 - Math.exp(-realDt * 5));
        if (camera.quaternion.angleTo(followRotation) < .001) returningToFollow = false;
      } else camera.quaternion.copy(followRotation);
      initialized = true;
    } else {
      if (previousMode !== p.camera) {
        initializeOrbit();
      } else {
        // Carry the user's orbit and pan along with the horse, so its gait can
        // be inspected from the side without walking in place.
        orbitDelta.copy(position).sub(orbitPosition);
        camera.position.add(orbitDelta);
        controls.target.add(orbitDelta);
        orbitPosition.copy(position);
      }
      controls.enabled = true;
      controls.update();
      // Keep a close orbit above the real meadow rather than inside its slope.
      const groundClearance = terrain.heightAt(camera.position.x, camera.position.z) + .45;
      if (camera.position.y < groundClearance) {
        camera.position.y = groundClearance;
        camera.lookAt(controls.target);
      }
    }
    previousMode = p.camera;
    terrain.update(time, p);
    atmosphere.update(time, p);
    if (sunlight) {
      sunlight.target.position.copy(position).add(sunTargetOffset);
      sunlight.position.copy(sunlight.target.position).add(sunOffset);
      sunlight.target.updateMatrixWorld();
    }
    // A paused horse and meadow cast the same shadow while the user rotates
    // the view. Keep rendering interactions and weather, but reuse that map.
    renderer.shadowMap.needsUpdate = !p.paused || shadowDirty || p.wind !== lastShadowWind
      || p.layers?.terrain !== lastShadowTerrain || p.layers?.grass !== lastShadowGrass;
    shadowDirty = false;
    lastShadowWind = p.wind;
    lastShadowTerrain = p.layers?.terrain;
    lastShadowGrass = p.layers?.grass;
    renderer.toneMappingExposure = p.weather === 'sunset' ? 1.15 : 1.05;
    if (atmosphere.render) atmosphere.render();
    else renderer.render(scene, camera);
    frames++; fpsTime += realDt;
    if (fpsTime > 1) {
      onStats({ fps: Math.round(frames / fpsTime), triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, distance: Math.round(progress), ...terrain.stats, ...atmosphere.stats });
      frames = 0; fpsTime = 0;
    }
  }
  renderer.setAnimationLoop(animate);
  return {
    capture() {
      if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
      // Read immediately after drawing; no retained frame buffer is needed.
      if (atmosphere.render) atmosphere.render();
      else renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },
    reset() { progress = 0; time = 0; initialized = false; returningToFollow = false; shadowDirty = true; previousMode = 'follow'; rider.reset?.(); },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', takeCameraControl, true);
      renderer.domElement.removeEventListener('wheel', takeCameraControl, true);
      rider.dispose(); terrain.dispose(); atmosphere.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
