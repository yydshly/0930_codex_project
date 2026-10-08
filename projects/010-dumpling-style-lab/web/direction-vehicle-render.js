import * as THREE from './vendor/showcase/three.module.js';
import { GLTFLoader } from './vendor/showcase/GLTFLoader.js';
import { WAYPOINTS, ROAD_POINTS, OBSTACLES, VEHICLE, terrainHeight } from './direction-vehicle-engine.js';

// Original painted terrain and an unchanged CC0 truck. All wheel/contact positions
// come from the same metre-scale world used by the rules, rather than an animation.
const ROOT = new URL('./assets/directions/vehicle/', import.meta.url);
const asset = name => new URL(name, ROOT).href;
const vector = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp;

function roadDistance(x, z) {
  return Math.min(...ROAD_POINTS.map((a, i) => {
    const b = ROAD_POINTS[(i + 1) % 4], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
  }));
}
function textureQuarter(image, column, row, anisotropy) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768;
  canvas.getContext('2d').drawImage(image, image.width * column / 2, image.height * row / 2, image.width / 2, image.height / 2, 0, 0, 768, 768);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy; return texture;
}
function cloneModel(template, size) {
  const clone = template.clone(true), bounds = new THREE.Box3().setFromObject(clone);
  const extent = bounds.getSize(vector()), center = bounds.getCenter(vector());
  clone.position.set(-center.x, -bounds.min.y, -center.z);
  const group = new THREE.Group(); group.add(clone); group.scale.setScalar(size / Math.max(extent.x, extent.y, extent.z));
  clone.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  return group;
}
function signTexture(title, subtitle) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 176;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#162e32'; ctx.fillRect(0, 0, 512, 176);
  ctx.fillStyle = '#daa978'; ctx.fillRect(0, 0, 8, 176); ctx.font = 'bold 41px sans-serif'; ctx.fillText(title, 32, 70);
  ctx.fillStyle = '#d0dad5'; ctx.font = '22px sans-serif'; ctx.fillText(subtitle, 34, 125);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export async function createVehicleRenderer(canvas, { onProgress = () => {} } = {}) {
  onProgress('正在创建三维试车场…');
  let gpu;
  try { gpu = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (error) { throw new Error('当前浏览器无法创建 WebGL 场景，请使用支持 WebGL 的浏览器。', { cause: error }); }
  gpu.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
  gpu.outputColorSpace = THREE.SRGBColorSpace; gpu.toneMapping = THREE.ACESFilmicToneMapping; gpu.toneMappingExposure = 1.13;
  gpu.shadowMap.enabled = true; gpu.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#9abac3'); scene.fog = new THREE.FogExp2('#aab9ae', .0045);
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 600), loader = new GLTFLoader(), texLoader = new THREE.TextureLoader();
  onProgress('正在载入车辆、山谷与地面材质…');
  let loaded;
  try {
    loaded = await Promise.all([
      texLoader.loadAsync(asset('landscape.png')), texLoader.loadAsync(asset('terrain-atlas.png')),
      ...['truck-flat.glb', 'wheel-truck.glb', 'box.glb', 'cone.glb', 'debris-drivetrain-axle.glb', 'nature/tree_pineTallA_detailed.glb', 'nature/rock_largeA.glb'].map(name => loader.loadAsync(asset(name)))
    ]);
  } catch (error) { gpu.dispose(); throw new Error('三维车辆素材未能完整载入，请点击重试。', { cause: error }); }
  const [landscape, atlas, truckData, wheelData, boxData, coneData, axleData, treeData, rockData] = loaded;
  const anisotropy = Math.min(8, gpu.capabilities.getMaxAnisotropy());
  for (const texture of [landscape, atlas]) { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy; }
  const gravel = textureQuarter(atlas.image, 0, 0, anisotropy), grass = textureQuarter(atlas.image, 1, 0, anisotropy);
  const rock = textureQuarter(atlas.image, 1, 1, anisotropy);
  scene.add(new THREE.HemisphereLight('#c6e2e4', '#777553', 2.1));
  const sun = new THREE.DirectionalLight('#ffe1b0', 3.3); sun.position.set(-35, 75, -45);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -72;
  sun.shadow.camera.right = sun.shadow.camera.top = 72; sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
  sun.shadow.bias = -.00035; sun.shadow.normalBias = .025; scene.add(sun);
  const rim = new THREE.DirectionalLight('#d2e8ec', .65); rim.position.set(60, 30, 50); scene.add(rim);

  // A painted mountain backdrop surrounds an actual heightfield. Cropping the
  // texture in UV space keeps the image's foreground out of the drivable ground.
  const backdropGeometry = new THREE.CylinderGeometry(160, 160, 116, 96, 1, true);
  const backdropUV = backdropGeometry.attributes.uv;
  for (let i = 0; i < backdropUV.count; i++) backdropUV.setY(i, .62 + backdropUV.getY(i) * .38);
  const backdrop = new THREE.Mesh(backdropGeometry, new THREE.MeshBasicMaterial({ map: landscape, side: THREE.BackSide, color: '#ced9d1' }));
  backdrop.position.y = 49; backdrop.rotation.y = Math.PI * .25; scene.add(backdrop);

  const groundGeometry = new THREE.PlaneGeometry(170, 170, 340, 340); groundGeometry.rotateX(-Math.PI / 2);
  const positions = groundGeometry.attributes.position, uv = groundGeometry.attributes.uv, masks = [], colors = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i); let height = terrainHeight(x, z);
    if (Math.max(Math.abs(x), Math.abs(z)) > 54) height += Math.pow((Math.max(Math.abs(x), Math.abs(z)) - 54) / 10, 1.4);
    positions.setY(i, height); uv.setXY(i, x / 7.5, z / 7.5);
    const d = Math.min(roadDistance(x, z), ...WAYPOINTS.map(p => Math.hypot(x - p.x, z - p.z) - 4.3));
    masks.push(1 - THREE.MathUtils.smoothstep(d, 3.3, 5.7));
    const shade = .92 + .045 * Math.sin(x * .16 + z * .34); colors.push(shade, shade, shade * .94);
  }
  groundGeometry.setAttribute('roadMask', new THREE.Float32BufferAttribute(masks, 1));
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); groundGeometry.computeVertexNormals();
  const groundMaterial = new THREE.MeshStandardMaterial({ map: gravel, vertexColors: true, roughness: .98, metalness: 0 });
  groundMaterial.onBeforeCompile = shader => {
    shader.uniforms.grassMap = { value: grass };
    shader.vertexShader = 'attribute float roadMask; varying float vRoadMask;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadMask=roadMask;');
    shader.fragmentShader = 'uniform sampler2D grassMap; varying float vRoadMask;\n' + shader.fragmentShader.replace('#include <map_fragment>', 'vec4 dirtColor=texture2D(map,vMapUv);vec4 grassColor=texture2D(grassMap,vMapUv);diffuseColor*=mix(grassColor,dirtColor,clamp(vRoadMask,0.,1.));');
  };
  const ground = new THREE.Mesh(groundGeometry, groundMaterial); ground.receiveShadow = true; scene.add(ground);
  // Coarse surrounding slopes hide the finite heightfield's square edge in the
  // overview. The playable 108 m area still uses the dense exact physics surface.
  const outsideGeometry = new THREE.PlaneGeometry(420, 420, 84, 84); outsideGeometry.rotateX(-Math.PI / 2);
  const outsidePositions = outsideGeometry.attributes.position, outsideUV = outsideGeometry.attributes.uv;
  for (let i = 0; i < outsidePositions.count; i++) {
    const x = outsidePositions.getX(i), z = outsidePositions.getZ(i), radius = Math.max(Math.abs(x), Math.abs(z));
    outsidePositions.setY(i, terrainHeight(x, z) + Math.pow(Math.max(0, radius - 54) / 10, 1.4)); outsideUV.setXY(i, x / 7.5, z / 7.5);
  }
  const outsideIndices = [], oldIndices = outsideGeometry.index;
  for (let i = 0; i < oldIndices.count; i += 3) {
    const a = oldIndices.getX(i), b = oldIndices.getX(i + 1), c = oldIndices.getX(i + 2);
    const cx = (outsidePositions.getX(a) + outsidePositions.getX(b) + outsidePositions.getX(c)) / 3;
    const cz = (outsidePositions.getZ(a) + outsidePositions.getZ(b) + outsidePositions.getZ(c)) / 3;
    if (Math.abs(cx) >= 85 || Math.abs(cz) >= 85) outsideIndices.push(a, b, c);
  }
  outsideGeometry.setIndex(outsideIndices); outsideGeometry.computeVertexNormals();
  const outside = new THREE.Mesh(outsideGeometry, new THREE.MeshStandardMaterial({ map: grass, color: '#f4f4ed', roughness: 1 })); outside.receiveShadow = true; scene.add(outside);
  const steel = new THREE.MeshStandardMaterial({ color: '#3d5557', metalness: .65, roughness: .51 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#273b3d', metalness: .55, roughness: .62 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#c88e55', metalness: .48, roughness: .44 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#aaa993', roughness: .96 });
  const wood = new THREE.MeshStandardMaterial({ color: '#9f875d', map: gravel, roughness: .91 });
  const roof = new THREE.MeshStandardMaterial({ color: '#67776c', metalness: .45, roughness: .54 });
  const meshBox = (width, height, depth, material, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  function beam(a, b, width = .12, material = steel, parent = scene) {
    const offset = b.clone().sub(a), mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, offset.length(), 8), material);
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(vector(0, 1, 0), offset.normalize());
    mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function workshop(obstacle, label, detail) {
    const group = new THREE.Group(); group.position.set(obstacle.x, terrainHeight(obstacle.x, obstacle.z), obstacle.z);
    group.rotation.y = obstacle.x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(group);
    const depth = 7.8, width = 8.2, h = obstacle.height;
    meshBox(width, .28, depth, concrete, 0, .02, 0, group);
    for (const x of [-3.7, 3.7]) for (const z of [-3.4, 3.4]) meshBox(.22, h, .22, steel, x, h / 2, z, group);
    meshBox(.18, h * .75, depth, roof, -4, h * .38, 0, group);
    meshBox(.18, h * .75, depth, roof, 4, h * .38, 0, group);
    meshBox(width, h * .75, .18, roof, 0, h * .38, -3.8, group);
    for (let i = -4; i <= 4; i++) meshBox(.76, .14, depth + .8, roof, i * .92, h + Math.sin((i + 4) / 8 * Math.PI) * .3, 0, group);
    for (const z of [-3.4, 3.4]) beam(vector(-3.7, h, z), vector(3.7, h, z), .12, steel, group);
    for (const x of [-3.6, 3.6]) beam(vector(x, .15, -3.4), vector(x, h - .15, 3.4), .065, bronze, group);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 2.03), new THREE.MeshStandardMaterial({ map: signTexture(label, detail), roughness: .82 }));
    sign.position.set(0, h - 1, 3.99); group.add(sign);
    for (let i = 0; i < 3; i++) { const crate = cloneModel(boxData.scene, 1.2); crate.position.set(-2.4 + i * 1.25, .19, .1); group.add(crate); }
    return group;
  }
  workshop(OBSTACLES[0], 'RIDGE WORKS', 'FIELD GARAGE  /  01');
  workshop(OBSTACLES[1], 'NORTH DEPOT', 'BUILDING MATERIAL  /  02');
  workshop(OBSTACLES[2], 'EAST SITE', 'VALLEY RESTORATION  /  03');
  for (const obstacle of OBSTACLES.slice(3)) {
    const stone = cloneModel(rockData.scene, obstacle.radius * 2); stone.position.set(obstacle.x, terrainHeight(obstacle.x, obstacle.z) - .25, obstacle.z); scene.add(stone);
  }
  let seed = 72911; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 105; i++) {
    const x = (random() - .5) * 151, z = (random() - .5) * 151;
    if (roadDistance(x, z) < 8.5 || WAYPOINTS.some(p => Math.hypot(x - p.x, z - p.z) < 13) || OBSTACLES.some(p => Math.hypot(x - p.x, z - p.z) < p.radius + 3) || Math.abs(x) < 46 && Math.abs(z) < 46) continue;
    const tree = cloneModel(treeData.scene, 6 + random() * 7); tree.rotation.y = random() * Math.PI * 2;
    tree.position.set(x, terrainHeight(x, z) + (Math.max(Math.abs(x), Math.abs(z)) > 54 ? Math.pow((Math.max(Math.abs(x), Math.abs(z)) - 54) / 10, 1.4) : 0), z); scene.add(tree);
  }
  // Small stones sit outside the playable area; only the two declared rocks and
  // the declared workshops are collision obstacles, with matching visible bounds.
  for (let i = 0; i < 17; i++) {
    const x = -49 + i * 6.1, z = 53 + random() * 8, stone = cloneModel(rockData.scene, 1 + random() * 2.5);
    stone.position.set(x, terrainHeight(x, z), z); stone.rotation.y = random() * 6; scene.add(stone);
  }
  const waypointRings = [];
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const p = WAYPOINTS[i], ring = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.27, 80), new THREE.MeshBasicMaterial({ color: '#e6bc82', transparent: true, opacity: .68, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, terrainHeight(p.x, p.z) + .09, p.z); scene.add(ring); waypointRings.push(ring);
    for (const dx of [-4.1, 4.1]) for (const dz of [-3.2, 3.2]) {
      const cone = cloneModel(coneData.scene, .9); cone.position.set(p.x + dx, terrainHeight(p.x + dx, p.z + dz), p.z + dz); scene.add(cone);
    }
  }
  // Deck planks follow the exact height sampled by the physics, including ramps.
  for (let z = -12; z <= 12; z += .65) {
    meshBox(7.25, .045, .59, wood, 32, terrainHeight(32, z) + .018, z);
    if (Math.round((z + 12) / .65) % 4 === 0) for (const x of [28.1, 35.9]) {
      const y = terrainHeight(x, z); meshBox(.17, 1.18, .17, steel, x, y + .58, z);
    }
  }
  for (const x of [28.1, 35.9]) for (let z = -12; z < 12; z += 2.6) {
    for (const y of [.62, 1.17]) beam(vector(x, terrainHeight(x, z) + y, z), vector(x, terrainHeight(x, z + 2.6) + y, z + 2.6), .055, steel);
  }
  for (const x of [-30, 30]) for (let z = -49; z <= 49; z += 14) {
    if (Math.abs(x - 32) < 3 && Math.abs(z) < 16) continue;
    const y = terrainHeight(x, z); meshBox(.1, 1.05, .1, darkSteel, x, y + .52, z);
    meshBox(.45, .25, .08, bronze, x, y + 1, z);
  }
  const routeGeometry = new THREE.BufferGeometry();
  const routePositions = new THREE.BufferAttribute(new Float32Array(512 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const routeDistances = new THREE.BufferAttribute(new Float32Array(512), 1).setUsage(THREE.DynamicDrawUsage);
  routeGeometry.setAttribute('position', routePositions); routeGeometry.setAttribute('lineDistance', routeDistances); routeGeometry.setDrawRange(0, 0);
  const routeLine = new THREE.Line(routeGeometry, new THREE.LineDashedMaterial({ color: '#f1c289', transparent: true, opacity: .63, dashSize: .9, gapSize: .75, depthWrite: false }));
  routeLine.frustumCulled = false; scene.add(routeLine);

  const truck = new THREE.Group(), body = new THREE.Group(); truck.add(body); scene.add(truck);
  const model = truckData.scene.clone(true); model.children.filter(node => /wheel/i.test(node.name)).forEach(node => model.remove(node));
  // Match the authored chassis to the rules' 1.76 m track and 2.9 m wheelbase.
  // Keeping the body narrow exposes the independently moving physical wheels.
  model.scale.set(1.25, 1.55, 2); model.position.set(0, -1.12, -.145);
  model.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.material = mesh.material.clone(); mesh.material.roughness = .61; mesh.material.metalness = .12; } });
  body.add(model);
  const glass = new THREE.MeshStandardMaterial({ color: '#173f4e', metalness: .38, roughness: .22, emissive: '#16323a', emissiveIntensity: .13 });
  const pane = (width, height, x, y, z, rotation = 0) => {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glass); window.position.set(x, y, z); window.rotation.y = rotation; body.add(window); return window;
  };
  pane(.76, .32, 0, .58, -.007, Math.PI);
  for (const x of [-.605, .605]) pane(.74, .33, x, .57, .52, Math.sign(x) * Math.PI / 2);
  pane(.77, .34, 0, .56, 1.16).rotation.x = -.16;
  // Added vehicle markings are mesh details; the licensed source GLB stays intact.
  for (const x of [-.95, .95]) meshBox(.013, .065, 2.6, bronze, x, .13, -1.25, body);
  const load = new THREE.Group(); body.add(load);
  for (const x of [-.43, .43]) for (const z of [-1.8, -.83]) {
    const crate = cloneModel(boxData.scene, .8); crate.position.set(x, .13, z); load.add(crate);
    const strap = meshBox(.055, .82, .85, darkSteel, x, .54, z, load); strap.castShadow = false;
  }
  const wheels = [], springs = [], axles = [];
  for (const id of ['fl', 'fr', 'rl', 'rr']) {
    const pivot = new THREE.Group(), spin = new THREE.Group(); pivot.add(spin); scene.add(pivot);
    const wheel = wheelData.scene.clone(true); wheel.scale.setScalar(VEHICLE.tireRadius / .3);
    wheel.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } }); spin.add(wheel); wheels.push({ id, pivot, spin });
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 10), bronze); coil.castShadow = true; scene.add(coil); springs.push(coil);
  }
  for (const z of [1.45, -1.45]) {
    const axle = cloneModel(axleData.scene, 1.8); scene.add(axle); axles.push({ axle, z });
  }
  const labelLayer = document.createElement('div'); labelLayer.setAttribute('aria-hidden', 'true');
  Object.assign(labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' }); canvas.parentElement.append(labelLayer);
  const tags = WAYPOINTS.map(p => {
    const tag = document.createElement('span'); tag.textContent = p.name;
    Object.assign(tag.style, { position: 'absolute', color: '#f3e5cd', background: '#173032d9', border: '1px solid #dbc09955', borderRadius: '3px', padding: '5px 8px', font: '500 11px/1.4 sans-serif', whiteSpace: 'nowrap', transform: 'translate(-50%,-100%)' }); labelLayer.append(tag); return { p, tag };
  });
  const cameraAim = vector(), wantedAim = vector(), wantedCamera = vector(); let lastMode = null, width = 0, height = 0, disposed = false;
  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect(), nextWidth = Math.max(1, Math.round(rect.width)), nextHeight = Math.max(1, Math.round(rect.height));
    if (nextWidth !== width || nextHeight !== height) { width = nextWidth; height = nextHeight; gpu.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement); resize();
  onProgress('岚谷试车场已就绪');
  function render(w, { cameraMode = 'chase', showTelemetry = true, dt = 1 / 60 } = {}) {
    if (disposed) return; resize(); const car = w.vehicle, forward = vector(Math.sin(car.heading), 0, Math.cos(car.heading));
    truck.position.set(car.x, car.y, car.z); truck.rotation.y = car.heading; body.rotation.set(-car.pitch, 0, car.roll, 'YXZ'); load.visible = w.cargo.units > 0;
    for (let i = 0; i < wheels.length; i++) {
      const telemetry = car.wheels[i], wheel = wheels[i]; wheel.pivot.position.set(telemetry.x, telemetry.centerY, telemetry.z);
      wheel.pivot.rotation.y = car.heading + (telemetry.id.startsWith('f') ? car.steer : 0); wheel.spin.rotation.x = car.wheelSpin;
      const mount = vector(telemetry.localX, -.32, telemetry.localZ).applyEuler(body.rotation).applyAxisAngle(vector(0, 1, 0), car.heading).add(truck.position);
      const end = wheel.pivot.position.clone(), delta = mount.clone().sub(end), spring = springs[i];
      spring.position.copy(mount).add(end).multiplyScalar(.5); spring.scale.y = Math.max(.08, delta.length()); spring.quaternion.setFromUnitVectors(vector(0, 1, 0), delta.normalize()); spring.visible = showTelemetry;
    }
    for (let i = 0; i < axles.length; i++) {
      const a = car.wheels[i * 2], b = car.wheels[i * 2 + 1]; axles[i].axle.position.set((a.x + b.x) / 2, (a.centerY + b.centerY) / 2, (a.z + b.z) / 2);
      axles[i].axle.rotation.set(0, car.heading, Math.atan2(b.centerY - a.centerY, VEHICLE.track));
    }
    const target = { dispatch: 'garage', load: 'depot', deliver: 'destination', return: 'garage' }[w.stage];
    WAYPOINTS.forEach((p, i) => { waypointRings[i].material.opacity = p.id === target ? .83 : .35; });
    routeLine.visible = showTelemetry && w.route.active;
    if (routeLine.visible) {
      const points = [vector(car.x, terrainHeight(car.x, car.z) + .15, car.z)]; let previous = car;
      for (const next of w.route.points.slice(w.route.index)) {
        const count = Math.max(1, Math.ceil(Math.hypot(next.x - previous.x, next.z - previous.z) / 1.3));
        for (let i = 1; i <= count; i++) { const x = THREE.MathUtils.lerp(previous.x, next.x, i / count), z = THREE.MathUtils.lerp(previous.z, next.z, i / count); points.push(vector(x, terrainHeight(x, z) + .15, z)); } previous = next;
      }
      const count = Math.min(points.length, routePositions.count); let travelled = 0;
      for (let i = 0; i < count; i++) { const p = points[i]; if (i) travelled += p.distanceTo(points[i - 1]); routePositions.setXYZ(i, p.x, p.y, p.z); routeDistances.setX(i, travelled); }
      routePositions.needsUpdate = true; routeDistances.needsUpdate = true; routeGeometry.setDrawRange(0, count);
    }
    const narrow = width / height < .95;
    wantedAim.set(car.x, car.y + .7, car.z).addScaledVector(forward, cameraMode === 'chase' ? 5 : 0);
    if (cameraMode === 'survey') { wantedCamera.set(60, narrow ? 117 : 78, -60); wantedAim.set(0, 0, 0); }
    else if (cameraMode === 'orbit') { const angle = car.heading + 2.35; wantedCamera.set(car.x + Math.sin(angle) * 9, car.y + 3.0, car.z + Math.cos(angle) * 9); }
    else { wantedCamera.copy(vector(car.x, car.y + (narrow ? 5.3 : 3.8), car.z)).addScaledVector(forward, narrow ? -14 : -11); wantedCamera.x += Math.cos(car.heading) * 2.2; wantedCamera.z -= Math.sin(car.heading) * 2.2; }
    const blend = lastMode !== cameraMode ? 1 : 1 - Math.exp(-clamp(dt, 0, .1) * 6);
    camera.position.lerp(wantedCamera, blend); cameraAim.lerp(wantedAim, blend); camera.lookAt(cameraAim); lastMode = cameraMode;
    for (const { p, tag } of tags) {
      const projected = vector(p.x, terrainHeight(p.x, p.z) + 2.5, p.z).project(camera), distance = Math.hypot(p.x - car.x, p.z - car.z);
      tag.hidden = !showTelemetry || projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > .96 || Math.abs(projected.y) > .85 || (cameraMode !== 'survey' && distance > 38);
      tag.style.left = `${(projected.x + 1) * width / 2}px`; tag.style.top = `${(1 - projected.y) * height / 2}px`;
    }
    gpu.render(scene, camera);
  }
  function dispose() {
    if (disposed) return; disposed = true; observer.disconnect(); labelLayer.remove();
    const geometries = new Set(), materials = new Set(), textures = new Set([landscape, atlas, gravel, grass, rock]);
    for (const root of [scene, truckData.scene, wheelData.scene, boxData.scene, coneData.scene, axleData.scene, treeData.scene, rockData.scene]) root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) { materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); }
    });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose()); gpu.dispose();
  }
  return { ready: true, render, dispose };
}
