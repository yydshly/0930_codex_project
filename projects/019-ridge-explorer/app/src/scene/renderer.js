import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrain } from './terrain.js';
import { createAtmosphere } from './atmosphere.js';
import { createRider, HORSE_TRAVEL_SPEED } from './rider.js';
import { createExplorationWorld } from './exploration-world.js';
import { START, LANDMARKS, TOUR_ROUTE, WORLD_BOUNDS } from './exploration-map.js';
import { createRideState, stepRide, stepTour, closestRouteCursor, createCollisionQuery, updateDiscoveries, nearestLandmark } from './exploration-motion.js';
import { createRideAudio } from './ride-audio.js';
import { RIDE_SAVE_KEY, createRideSnapshot, decodeRideSnapshot, createTourStops, advanceTourStops, skipTourStop } from './exploration-session.js';

export function createRidgeScene(container, settings, onStats, onError, onCameraChange, onRestore) {
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
  const world = createExplorationWorld(scene, { quality, onError });
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
  world.ready?.then(() => { shadowDirty = true; }).catch(e => onError(`探索场景加载失败：${e.message}`));
  let ride = createRideState(START), tourCursor = 1, previousRideMode = 'manual';
  let tourStops = createTourStops(), pendingLandmarkFrame = null, saveTime = 0, savedRide = null;
  const audio = createRideAudio();
  const input = { forward: false, backward: false, left: false, right: false, sprint: false };
  const clearInput = () => { for (const key of Object.keys(input)) input[key] = false; };
  const validLandmarks = new Set(LANDMARKS.map(point => point.id));
  let visited = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem('ridge-explorer.visited.v1') ?? '[]');
    if (Array.isArray(stored)) visited = new Set(stored.filter(id => validLandmarks.has(id)));
  } catch { /* An unavailable browser store never prevents exploration. */ }
  const environment = { bounds: WORLD_BOUNDS, heightAt: terrain.heightAt, queryColliders: createCollisionQuery([...(terrain.colliders ?? []), ...(world.colliders ?? [])]) };
  try { savedRide = decodeRideSnapshot(localStorage.getItem(RIDE_SAVE_KEY), environment); } catch { /* Riding remains available without storage. */ }
  if (world.ready) world.ready.then(() => {
    environment.queryColliders = createCollisionQuery([...(terrain.colliders ?? []), ...(world.colliders ?? [])]);
  }).catch(() => {});
  function saveRide() {
    // Returning to the origin must not erase the last explored position.
    if (ride.distance < 1 || disposed) return;
    const snapshot = createRideSnapshot(ride, time, settings.current);
    try { localStorage.setItem(RIDE_SAVE_KEY, JSON.stringify(snapshot)); savedRide = snapshot; } catch { /* A full or disabled store is optional. */ }
  }
  const onBlur = () => {
    saveRide(); clearInput(); ride.speed = 0;
    // Audio runs independently of RAF, which can stop in a hidden tab.
    audio.update({ paused: true, hidden: document.hidden });
  };
  const onVisibility = () => { if (document.hidden) onBlur(); };
  window.addEventListener('blur', onBlur);
  window.addEventListener('pagehide', saveRide);
  document.addEventListener('visibilitychange', onVisibility);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2.8;
  controls.maxDistance = 350;
  controls.maxPolarAngle = Math.PI * .495;
  controls.enabled = false;
  let time = 0, prev = performance.now(), previousMode = 'follow', fpsTime = 0, statsTime = 0, frames = 0, measuredFps = 0, disposed = false;
  const position = new THREE.Vector3(), target = new THREE.Vector3(), desired = new THREE.Vector3();
  const orbitPosition = new THREE.Vector3(), orbitDelta = new THREE.Vector3();
  const orbitDirection = new THREE.Vector3(), riderCenter = new THREE.Vector3();
  const savedPosition = new THREE.Vector3(), savedRotation = new THREE.Quaternion();
  const followRotation = new THREE.Quaternion(), lookMatrix = new THREE.Matrix4();
  const followOffset = new THREE.Vector3(), riderCenterOffset = new THREE.Vector3(0, 1.5, 0);
  const sunTargetOffset = new THREE.Vector3(0, 1, -4), sunOffset = new THREE.Vector3(-36, 68, 24);
  let initialized = false, returningToFollow = false, previousPhoto = false;
  let lastShadowWind, lastShadowTerrain, lastShadowGrass;
  const up = new THREE.Vector3(0, 1, 0);
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
  function configureLens(params = settings.current) {
    // Keep both mountain landmarks visible when the app is in a narrow panel.
    const fov = params.photo ? THREE.MathUtils.clamp(params.photoFov ?? 55, 28, 80) : camera.aspect < 1.35
      ? Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27.5)) * 1.35 / camera.aspect)))
      : 55;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    configureLens();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const lost = e => { e.preventDefault(); onError('图形上下文已暂停，请刷新恢复场景。'); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  function animate(now) {
    if (disposed) return;
    const elapsed = (now - prev) / 1000;
    const realDt = Math.min(elapsed, .07);
    prev = now;
    const p = settings.current;
    const dt = p.paused || p.photo || document.hidden ? 0 : realDt;
    time += dt;
    const stopped = p.paused || p.photo || p.inputBlocked || document.hidden;
    if (stopped) clearInput();
    if (previousRideMode !== p.rideMode) { clearInput(); tourCursor = closestRouteCursor(ride, TOUR_ROUTE); tourStops = createTourStops(); }
    environment.stopped = stopped;
    if (p.rideMode === 'tour') {
      tourStops = advanceTourStops(tourStops, ride, dt, stopped);
      if (tourStops.active) ride = { ...ride, speed: 0, stepDistance: 0, blocked: false };
      else ({ state: ride, cursor: tourCursor } = stepTour(ride, TOUR_ROUTE, tourCursor, dt, environment));
    }
    else ride = stepRide(ride, input, dt, environment);
    previousRideMode = p.rideMode;
    const { x, z, yaw: heading } = ride;
    position.set(x, terrain.heightAt(x, z), z);
    const nextX = x - Math.sin(heading) * 2, nextZ = z - Math.cos(heading) * 2;
    rider.group.position.copy(position);
    const slope = Math.atan2(terrain.heightAt(nextX, nextZ) - position.y, 2);
    const rightX = Math.cos(heading), rightZ = -Math.sin(heading);
    const bank = Math.atan2(terrain.heightAt(x + rightX, z + rightZ) - terrain.heightAt(x - rightX, z - rightZ), 2);
    rider.group.rotation.set(THREE.MathUtils.clamp(slope, -.42, .42), heading, THREE.MathUtils.clamp(bank, -.2, .2), 'YXZ');
    // The supplied canter advances with actual travelled metres, including
    // acceleration and obstacles. A stopped horse never canters in place.
    rider.update(time, ride.stepDistance / HORSE_TRAVEL_SPEED, p.wind, ride.stepDistance > .00001);
    rider.settleToGround?.(stopped ? 0 : dt, ride.speed < .02);
    audio.update({ time, delta: realDt, position: { x, z }, stepDistance: ride.stepDistance,
      speed: ride.speed, wind: p.wind, weather: p.weather, paused: stopped || !p.sound, hidden: document.hidden });
    saveTime += realDt;
    if (saveTime >= 2 && !document.hidden) { saveRide(); saveTime = 0; }
    const discovered = updateDiscoveries(ride, LANDMARKS, visited);
    if (discovered.size !== visited.size) {
      visited = discovered;
      try { localStorage.setItem('ridge-explorer.visited.v1', JSON.stringify([...visited])); } catch { /* Session discoveries still work. */ }
    }
    configureLens(p);
    if (p.photo && !previousPhoto) {
      initializeOrbit();
      // Photography explicitly centres the subject. A narrow lens can then
      // frame the whole mounted rider instead of cropping it below the view.
      controls.target.copy(position).add(riderCenterOffset);
      previousMode = 'orbit';
    }
    if (p.photo && pendingLandmarkFrame) {
      const landmark = LANDMARKS.find(point => point.id === pendingLandmarkFrame);
      const offsets = { creek: [11, 5, 14], camp: [1, 4.7, 13], lookout: [15, 5, 8] };
      const offset = offsets[landmark.id];
      const centerX = landmark.x + (landmark.id === 'lookout' ? 4 : 0);
      const centerZ = landmark.z - (landmark.id === 'creek' ? 0 : 2);
      controls.target.set(centerX, terrain.heightAt(centerX, centerZ) + (landmark.id === 'creek' ? .25 : .9), centerZ);
      camera.position.set(landmark.x + offset[0], terrain.heightAt(landmark.x, landmark.z) + offset[1], landmark.z + offset[2]);
      camera.position.y = Math.max(camera.position.y, terrain.heightAt(camera.position.x, camera.position.z) + .8);
      controls.enableDamping = false; controls.update(); controls.enableDamping = true;
      camera.lookAt(controls.target); orbitPosition.copy(position);
      pendingLandmarkFrame = null; previousMode = 'orbit';
    }
    previousPhoto = !!p.photo;
    if (p.camera === 'follow') {
      controls.enabled = false;
      if (previousMode !== 'follow') returningToFollow = true;
      followOffset.set(camera.aspect < 1 ? .1 : 1.15, 3.1, 7.8);
      followOffset.applyAxisAngle(up, heading);
      desired.copy(position).add(followOffset);
      // Critically damped feeling without frame-rate dependent lerp.
      camera.position.lerp(desired, initialized ? 1 - Math.exp(-realDt * 3) : 1);
      target.set(x - Math.sin(heading) * 28, position.y - 1.4, z - Math.cos(heading) * 28);
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
    world.update(time, p, visited);
    atmosphere.update(time, p);
    if (sunlight) {
      sunlight.target.position.copy(position).add(sunTargetOffset);
      sunlight.position.copy(sunlight.target.position).add(sunOffset);
      sunlight.target.updateMatrixWorld();
    }
    // A paused horse and meadow cast the same shadow while the user rotates
    // the view. Keep rendering interactions and weather, but reuse that map.
    renderer.shadowMap.needsUpdate = dt > 0 || shadowDirty || p.wind !== lastShadowWind
      || p.layers?.terrain !== lastShadowTerrain || p.layers?.grass !== lastShadowGrass;
    shadowDirty = false;
    lastShadowWind = p.wind;
    lastShadowTerrain = p.layers?.terrain;
    lastShadowGrass = p.layers?.grass;
    renderer.toneMappingExposure = p.weather === 'sunset' ? 1.15 : 1.05;
    if (atmosphere.render) atmosphere.render();
    else renderer.render(scene, camera);
    frames++; fpsTime += elapsed; statsTime += realDt;
    if (fpsTime > 1) {
      measuredFps = Math.round(frames / fpsTime);
      frames = 0; fpsTime = 0;
    }
    if (statsTime > .25) {
      onStats({ fps: measuredFps, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
        distance: Math.round(ride.distance), speed: ride.speed, x, z, heading, visited: [...visited],
        nearest: nearestLandmark(ride, LANDMARKS), blocked: ride.blocked, hasSavedRide: !!savedRide,
        tourStop: tourStops.active ? { id: tourStops.active, name: LANDMARKS.find(point => point.id === tourStops.active).name, remaining: Math.ceil(tourStops.remaining) } : null,
        ...terrain.stats, ...atmosphere.stats });
      statsTime = 0;
    }
  }
  renderer.setAnimationLoop(animate);
  return {
    capture() {
      configureLens(settings.current);
      atmosphere.update(time, settings.current);
      if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
      // Read immediately after drawing; no retained frame buffer is needed.
      if (atmosphere.render) atmosphere.render();
      else renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },
    setInput(action, pressed) {
      if (!(action in input)) return;
      const p = settings.current;
      input[action] = !!pressed && !p.paused && !p.photo && !p.inputBlocked && p.rideMode !== 'tour';
    },
    clearInput,
    setSound(enabled) { return audio.setEnabled(enabled); },
    skipTourStop() { tourStops = skipTourStop(tourStops); },
    frameLandmark(id) {
      const landmark = LANDMARKS.find(point => point.id === id);
      if (!landmark || Math.hypot(ride.x - landmark.x, ride.z - landmark.z) > landmark.radius + 4) return false;
      clearInput(); pendingLandmarkFrame = id; return true;
    },
    restoreRide() {
      const snapshot = savedRide && decodeRideSnapshot(JSON.stringify(savedRide), environment);
      if (!snapshot) return false;
      clearInput(); ride = { ...createRideState(snapshot.position), distance: snapshot.distance };
      time = snapshot.time; tourCursor = closestRouteCursor(ride, TOUR_ROUTE); tourStops = createTourStops();
      pendingLandmarkFrame = null; initialized = false; previousPhoto = false; returningToFollow = false;
      previousMode = 'follow'; previousRideMode = 'manual'; shadowDirty = true; rider.reset?.();
      settings.current = { ...settings.current, ...snapshot.settings, rideMode: 'manual', photo: false, paused: false, camera: 'follow' };
      onRestore?.(snapshot.settings); return true;
    },
    reset() { saveRide(); clearInput(); ride = createRideState(START); tourCursor = 1; tourStops = createTourStops(); pendingLandmarkFrame = null; previousRideMode = 'manual'; time = 0; initialized = false; returningToFollow = false; previousPhoto = false; shadowDirty = true; previousMode = 'follow'; rider.reset?.(); },
    dispose() {
      saveRide();
      disposed = true;
      audio.dispose();
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', saveRide);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('pointerdown', takeCameraControl, true);
      renderer.domElement.removeEventListener('wheel', takeCameraControl, true);
      rider.dispose(); terrain.dispose(); world.dispose(); atmosphere.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
