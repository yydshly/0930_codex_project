import * as THREE from './vendor/showcase/three.module.js';
import { GLTFLoader } from './vendor/showcase/GLTFLoader.js';
import { PORTS, SURVEY } from './direction-space-engine.js';

// The models are unchanged Kenney CC0 GLBs. Planets use original painted UV maps.
// World x/z and headings are shared with the flight rules; neither camera changes them.
const ROOT = new URL('./assets/directions/space/', import.meta.url);
const asset = name => new URL(name, ROOT).href;
const clamp = THREE.MathUtils.clamp;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.15, 'rgba(255,255,255,.6)');
  g.addColorStop(.4, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function normalized(template, length) {
  const g = template.clone(true), box = new THREE.Box3().setFromObject(g), size = box.getSize(v(0, 0, 0));
  const center = box.getCenter(v(0, 0, 0));
  g.position.sub(center); const wrapper = new THREE.Group(); wrapper.add(g);
  wrapper.scale.setScalar(length / Math.max(size.x, size.y, size.z));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return wrapper;
}
function atmosphere(radius, color) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec3 n; varying vec3 eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 tint; varying vec3 n; varying vec3 eye; void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),3.);gl_FragColor=vec4(tint,rim*.46);}'
  }));
}
export async function createSpaceRenderer(canvas, { onProgress = () => {} } = {}) {
  onProgress('正在创建三维航区…');
  let gpu;
  try { gpu = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (error) { throw new Error('当前浏览器未能创建 WebGL 三维场景。请重新加载或使用支持 WebGL 的浏览器。', { cause: error }); }
  gpu.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
  gpu.outputColorSpace = THREE.SRGBColorSpace; gpu.toneMapping = THREE.ACESFilmicToneMapping; gpu.toneMappingExposure = 1.18;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(51, 1, .2, 2400);
  const textures = new THREE.TextureLoader(), gltf = new GLTFLoader();
  onProgress('正在载入飞船、空间站与原创行星纹理…');
  let loaded;
  try {
    loaded = await Promise.all([
      ...['nebula.png', 'planet-ocean.png', 'planet-arid.png'].map(n => textures.loadAsync(asset(n))),
      ...['craft_cargoB.glb', 'craft_speederB.glb', 'hangar_roundGlass.glb', 'satelliteDish_detailed.glb', 'meteor_detailed.glb'].map(n => gltf.loadAsync(asset(n)))
    ]);
  } catch (error) { gpu.dispose(); throw new Error('三维素材未能完整载入，请重试。', { cause: error }); }
  const [sky, ocean, arid, shipData, trafficData, hangarData, dishData, meteorData] = loaded;
  for (const tex of [sky, ocean, arid]) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, gpu.capabilities.getMaxAnisotropy()); }
  sky.mapping = THREE.EquirectangularReflectionMapping; scene.background = sky;
  scene.backgroundIntensity = .19;
  const pmrem = new THREE.PMREMGenerator(gpu), environment = pmrem.fromEquirectangular(sky);
  scene.environment = environment.texture; pmrem.dispose();
  for (const template of [hangarData.scene, dishData.scene, trafficData.scene]) {
    template.traverse(o => {
      if (!o.isMesh || !o.material?.isMeshStandardMaterial) return;
      o.material.roughness = .48; o.material.metalness = .42;
      if (/dark/i.test(o.material.name)) { o.material.roughness = .23; o.material.metalness = .62; }
    });
  }
  meteorData.scene.traverse(o => { if (o.isMesh && o.material?.isMeshStandardMaterial) { o.material.metalness = .05; o.material.roughness = .94; } });
  scene.add(new THREE.HemisphereLight(0x8fc7e4, 0x122039, 2.3));
  const sun = new THREE.DirectionalLight(0xffdfb0, 3.8); sun.position.set(-150, 190, 90); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x5a8bff, 2.4); rim.position.set(150, 30, -220); scene.add(rim);

  // Distant stars are actual 3D points; the nebula is a separate environment bitmap.
  const starPositions = [], starColors = []; let seed = 7253;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 6500; i++) {
    const u = random() * Math.PI * 2, h = random() * 2 - 1, r = 950 + random() * 400;
    starPositions.push(Math.sqrt(1 - h * h) * Math.cos(u) * r, h * r, Math.sqrt(1 - h * h) * Math.sin(u) * r);
    const b = .45 + random() * .55; starColors.push(b * .75, b * .86, b);
  }
  const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: 1.15, vertexColors: true, transparent: true, opacity: .95, depthWrite: false })));

  const planet = new THREE.Mesh(new THREE.SphereGeometry(64, 80, 56), new THREE.MeshStandardMaterial({ map: ocean, roughness: .82, metalness: .08 }));
  planet.position.set(110, -8, -245); planet.rotation.set(.15, .85, -.22); scene.add(planet);
  const blueAtmosphere = atmosphere(65.4, 0x6cbaee); blueAtmosphere.position.copy(planet.position); scene.add(blueAtmosphere);
  const desert = new THREE.Mesh(new THREE.SphereGeometry(44, 64, 40), new THREE.MeshStandardMaterial({ map: arid, roughness: 1 }));
  desert.position.set(-250, 20, -430); desert.rotation.y = 1.6; scene.add(desert);
  // A planet-only fill makes the continental detail readable without flattening metal hulls.
  planet.layers.enable(1); desert.layers.enable(1);
  const planetFill = new THREE.DirectionalLight(0xd2e8ff, 2.6); planetFill.position.set(10, 100, 280); planetFill.layers.set(1); scene.add(planetFill);
  const desertAtmosphere = atmosphere(44.6, 0xe0a16e); desertAtmosphere.position.copy(desert.position); scene.add(desertAtmosphere);

  const hull = normalized(shipData.scene, 8.4), ship = new THREE.Group(); ship.add(hull); scene.add(ship);
  hull.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone(); o.material.roughness = .48; o.material.metalness = .38;
    if (/metalRed/i.test(o.material.name)) { o.material.color.set('#d58b39'); o.material.metalness = .3; }
    if (/^dark$/i.test(o.material.name)) { o.material.color.set('#123341'); o.material.emissive.set('#2ea0bf'); o.material.emissiveIntensity = .18; }
  });
  const glowTexture = radialTexture(), thrusters = [];
  for (const x of [-1.7, 1.7]) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.62, 4, 16), new THREE.MeshBasicMaterial({ color: 0x89e9ff, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    flame.rotation.x = Math.PI / 2; flame.position.set(x, .1, 5.3); ship.add(flame);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0x74dfff, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(x, .1, 3.4); glow.scale.set(4, 4, 1); ship.add(glow); thrusters.push({ flame, glow });
  }
  const exhaustLight = new THREE.PointLight(0x48cdff, 8, 14, 2); exhaustLight.position.set(0, 0, 4); ship.add(exhaustLight);

  const stationRings = [], traffic = [];
  const metal = new THREE.MeshStandardMaterial({ color: '#384e64', metalness: .65, roughness: .4 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#192e45', metalness: .55, roughness: .6 });
  const panel = new THREE.MeshStandardMaterial({ color: '#153c68', metalness: .55, roughness: .28 });
  for (let index = 0; index < PORTS.length; index++) {
    const port = PORTS[index], group = new THREE.Group(), color = new THREE.Color(port.color);
    group.position.set(port.x, -3, port.z); scene.add(group);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(15, .85, 8, 72), metal); ring.rotation.x = Math.PI / 2; group.add(ring);
    const signal = new THREE.Mesh(new THREE.TorusGeometry(14.1, .13, 6, 72), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .75 }));
    signal.rotation.x = Math.PI / 2; signal.position.y = 1.1; group.add(signal); stationRings.push({ port, signal });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, hab = normalized(hangarData.scene, 10);
      hab.position.set(Math.sin(a) * 15, .7, Math.cos(a) * 15); hab.rotation.y = a; group.add(hab);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 7), darkMetal);
      arm.position.set(Math.sin(a) * 11, 0, Math.cos(a) * 11); arm.rotation.y = a; group.add(arm);
    }
    const dish = normalized(dishData.scene, 7.5); dish.position.set(0, 5, -17); group.add(dish);
    for (const x of [-24, 24]) {
      const solar = new THREE.Mesh(new THREE.BoxGeometry(14, .35, 8), panel); solar.position.set(x, -2, 0); group.add(solar);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(14, .15, .2), metal); rib.position.copy(solar.position); rib.position.y += .3; group.add(rib);
      for (let i = -2; i <= 2; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.12, .15, 8), metal); bar.position.set(x + i * 2.6, -1.65, 0); group.add(bar); }
    }
    const beaconGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true, opacity: .5 }));
    beaconGlow.position.set(0, 8, -17); beaconGlow.scale.set(7, 7, 1); group.add(beaconGlow);
    const visitor = normalized(trafficData.scene, 3.7); scene.add(visitor); traffic.push({ port, visitor, index });
  }
  const surveyGroup = new THREE.Group(); surveyGroup.position.set(SURVEY.x, 4, SURVEY.z); scene.add(surveyGroup);
  const surveyDish = normalized(dishData.scene, 7); surveyDish.rotation.x = .25; surveyGroup.add(surveyDish);
  const surveyHalo = new THREE.Mesh(new THREE.TorusGeometry(5, .12, 6, 64), new THREE.MeshBasicMaterial({ color: 0xc0acff, transparent: true, opacity: .7 }));
  surveyHalo.rotation.x = Math.PI / 2; surveyGroup.add(surveyHalo);
  const asteroids = [];
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2, radius = 12 + random() * 22;
    const rock = normalized(meteorData.scene, 1.2 + random() * 4);
    rock.position.set(155 + Math.cos(a) * radius, -8 + random() * 20, -90 + Math.sin(a) * radius);
    rock.rotation.set(random() * 3, random() * 3, random() * 3); scene.add(rock); asteroids.push(rock);
  }
  const navGeometry = new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]);
  const navLine = new THREE.Line(navGeometry, new THREE.LineDashedMaterial({ color: 0x79d6df, transparent: true, opacity: .4, dashSize: 2, gapSize: 2 }));
  scene.add(navLine);
  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(7.5, .12, 6, 64), new THREE.MeshBasicMaterial({ color: 0xb2edf4, transparent: true, opacity: .6, depthWrite: false }));
  targetRing.rotation.x = Math.PI / 2; scene.add(targetRing);
  const velocityGeometry = new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]);
  const velocityLine = new THREE.Line(velocityGeometry, new THREE.LineBasicMaterial({ color: 0xddd2a9, transparent: true, opacity: .6 })); scene.add(velocityLine);
  const aim = v(0, 0, 0), wantedCamera = v(0, 0, 0), wantedAim = v(0, 0, 0);
  // Screen-space labels follow the projected 3D locations, so lettering stays legible.
  const labelLayer = document.createElement('div'); labelLayer.setAttribute('aria-hidden', 'true');
  Object.assign(labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
  canvas.parentElement.append(labelLayer);
  const worldTags = [...PORTS, { ...SURVEY, color: '#cbb9f5' }].map(point => {
    const tag = document.createElement('span'); tag.textContent = point.name;
    Object.assign(tag.style, { position: 'absolute', color: point.color, font: '500 12px/1.4 "Microsoft YaHei", sans-serif', background: 'rgba(4,13,25,.78)', border: '1px solid rgba(139,191,216,.28)', borderRadius: '3px', padding: '4px 8px', whiteSpace: 'nowrap', transform: 'translate(-50%,-100%)' });
    labelLayer.append(tag); return { point, tag };
  });
  let disposed = false, lastView, lastWidth = 0, lastHeight = 0;
  function resize() {
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    if (width === lastWidth && height === lastHeight) return;
    lastWidth = width; lastHeight = height; gpu.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function render(w, { view = 'chase', dt = 1 / 60 } = {}) {
    if (disposed) return; resize(); const s = w.ship, speed = Math.hypot(s.vx, s.vz), time = w.time;
    const manualTurnBank = clamp((s.vx * Math.cos(s.heading) + s.vz * Math.sin(s.heading)) / 22, -.5, .5);
    ship.position.set(s.x, 4 + Math.sin(time * .7) * .08, s.z); ship.rotation.set(0, -s.heading, -manualTurnBank * .26);
    const thrust = typeof s.thrust === 'number' ? clamp(s.thrust, 0, 1) : 0;
    for (const t of thrusters) { t.flame.visible = thrust > .02 && !w.docked; t.flame.scale.y = .35 + thrust * (1.3 + Math.sin(time * 43) * .08); t.glow.material.opacity = w.docked ? .08 : .2 + thrust * .65; }
    exhaustLight.intensity = w.docked ? .4 : 2 + thrust * 12;
    const target = [...PORTS, SURVEY].find(p => p.id === w.target);
    if (target) {
      const positions = navGeometry.attributes.position; positions.setXYZ(0, s.x, .8, s.z); positions.setXYZ(1, target.x, .8, target.z); positions.needsUpdate = true;
      navLine.computeLineDistances(); navLine.visible = view === 'sector' || w.autopilot;
      targetRing.visible = !w.docked || w.docked !== target.id; targetRing.position.set(target.x, 1.5, target.z);
      targetRing.material.opacity = .45 + Math.sin(time * 2) * .12;
    }
    const vel = velocityGeometry.attributes.position; vel.setXYZ(0, s.x, 4.5, s.z); vel.setXYZ(1, s.x + s.vx * 1.4, 4.5, s.z + s.vz * 1.4); vel.needsUpdate = true;
    velocityLine.visible = view === 'sector' && speed > 1;
    for (const { port, signal } of stationRings) signal.material.opacity = w.docked === port.id ? .95 : .45 + Math.sin(time * 1.5) * .1;
    for (const { port, visitor, index } of traffic) {
      const a = time * .05 + index * 2; visitor.position.set(port.x + Math.sin(a) * 32, 5 + index, port.z + Math.cos(a) * 32); visitor.rotation.y = -a - Math.PI / 2;
    }
    surveyHalo.rotation.z = time * .1; surveyHalo.material.color.set(w.survey.complete ? 0x8df6be : 0xc0acff);
    surveyHalo.scale.setScalar(1 + (w.survey.progress || 0) * .08);
    planet.rotation.y = .85 + time * .001; desert.rotation.y = 1.6 + time * .0007;
    asteroids.forEach((rock, i) => { rock.rotation.y += (w.paused ? 0 : Math.min(dt, .1)) * (.03 + i * .001); });
    if (view === 'sector') {
      const narrow = camera.aspect < 1; wantedCamera.set(0, narrow ? 240 : 155, narrow ? 190 : 140); wantedAim.set(0, 0, -55);
    } else {
      const behind = camera.aspect < 1 ? 36 : 26, elevation = camera.aspect < 1 ? 19 : 13;
      wantedCamera.set(s.x - Math.sin(s.heading) * behind, elevation + 4, s.z + Math.cos(s.heading) * behind);
      wantedAim.set(s.x + Math.sin(s.heading) * 13, 4.5, s.z - Math.cos(s.heading) * 13);
    }
    if (lastView !== view) { camera.position.copy(wantedCamera); aim.copy(wantedAim); lastView = view; }
    else { const k = 1 - Math.exp(-clamp(dt, .001, .1) * 5); camera.position.lerp(wantedCamera, k); aim.lerp(wantedAim, k); }
    camera.lookAt(aim); camera.updateMatrixWorld();
    for (const { point, tag } of worldTags) {
      const p = v(point.x, point.id === 'survey' ? 11 : 13, point.z).project(camera);
      const distance = Math.hypot(point.x - s.x, point.z - s.z), x = (p.x + 1) * lastWidth / 2, y = (1 - p.y) * lastHeight / 2;
      const visible = p.z > -1 && p.z < 1 && x > 45 && x < lastWidth - 45 && y > 25 && y < lastHeight - 20 && (view === 'sector' || (distance > 38 && distance < 160));
      tag.style.display = visible ? 'block' : 'none'; tag.style.left = `${x.toFixed(1)}px`; tag.style.top = `${y.toFixed(1)}px`;
    }
    gpu.render(scene, camera);
  }
  function dispose() {
    if (disposed) return; disposed = true;
    const geometries = new Set(), materials = new Set(), maps = new Set([sky, ocean, arid, glowTexture]);
    scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) { materials.add(m); for (const val of Object.values(m)) if (val?.isTexture) maps.add(val); } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); maps.forEach(t => t.dispose()); environment.dispose(); labelLayer.remove(); gpu.dispose();
  }
  onProgress('三维航区已就绪'); resize();
  return { ready: true, render, resize, dispose };
}
