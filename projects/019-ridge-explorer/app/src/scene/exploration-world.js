import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { heightAt, noise2, seededRandom } from './math.js';
import { LANDMARKS, TRAILS, samplePolyline } from './exploration-map.js';

/** Real paths and landmarks sit on the same height field used by the horse. */
export function createExplorationWorld(scene, { quality = 'high', onError, loadAssets = typeof window !== 'undefined' } = {}) {
  const group = new THREE.Group();
  group.name = 'connected ridge exploration routes and landmarks';
  scene.add(group);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const colliders = [], markerMaterials = new Map();
  let disposed = false;
  const time = { value: 0 }, wind = { value: 1 };
  const ownGeometry = geometry => (geometries.add(geometry), geometry);
  const ownMaterial = material => (materials.add(material), material);
  const stone = ownMaterial(new THREE.MeshStandardMaterial({ color: new THREE.Color(.16, .18, .15), roughness: 1 }));
  const timber = ownMaterial(new THREE.MeshStandardMaterial({ color: new THREE.Color(.084, .057, .033), roughness: .94 }));
  const endgrain = ownMaterial(new THREE.MeshStandardMaterial({ color: new THREE.Color(.19, .133, .078), roughness: .95 }));

  function mesh(geometry, material, position, rotation = null) {
    const object = new THREE.Mesh(ownGeometry(geometry), material);
    if (position) object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true; object.receiveShadow = true;
    group.add(object); return object;
  }
  const beam = (a, b, thickness = .1, material = timber) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const object = mesh(new THREE.CylinderGeometry(thickness, thickness * 1.08, start.distanceTo(end), 7), material,
      start.clone().add(end).multiplyScalar(.5).toArray());
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return object;
  };

  function ribbon(points, width, material, { offset = .045, across = 4 } = {}) {
    const path = samplePolyline(points, quality === 'low' ? 2.4 : 1.5);
    const positions = [], colors = [], uv = [], indices = [];
    let length = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i], a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      if (i) length += Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z);
      const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz) || 1;
      const w = width * (.9 + noise2(p.x * .18, p.z * .18) * .2);
      for (let j = 0; j <= across; j++) {
        const side = j / across - .5, x = p.x - dz / n * w * side, z = p.z + dx / n * w * side;
        positions.push(x, heightAt(x, z) + offset, z);
        const variation = .79 + noise2(x * 1.7, z * 1.7) * .32;
        colors.push(variation, variation, variation * .97);
        uv.push(j / across, length / 2.4);
        if (i && j) {
          const q = i * (across + 1) + j;
          indices.push(q, q - 1, q - across - 1, q - 1, q - across - 2, q - across - 1);
        }
      }
    }
    const geometry = ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const object = new THREE.Mesh(geometry, material);
    object.receiveShadow = true; object.name = 'terrain-conforming ribbon'; group.add(object);
    return object;
  }

  const pathMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    color: new THREE.Color(.11, .114, .093), vertexColors: true, roughness: .91, metalness: .035,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  for (const trail of TRAILS.slice(1)) {
    const path = ribbon(trail.points, 2.25, pathMaterial);
    path.name = `worn connecting path: ${trail.id}`;
  }

  // The clearing retains the terrain beneath it, rather than painting a disk
  // of featureless path colour over the entire camp.
  const soilSize = 128, soilPixels = new Uint8Array(soilSize * soilSize * 4);
  for (let y = 0; y < soilSize; y++) for (let x = 0; x < soilSize; x++) {
    const coarse = noise2(x * .043, y * .043), grit = noise2(x * .71 + 29, y * .71 + 17);
    const grain = noise2(x * 3.17 + 6, y * 2.91 + 21);
    const tint = .67 + coarse * .15 + grit * .12 + grain * .075;
    const index = (y * soilSize + x) * 4;
    soilPixels[index] = Math.round(tint * 255);
    soilPixels[index + 1] = Math.round(tint * .96 * 255);
    soilPixels[index + 2] = Math.round(tint * .87 * 255);
    soilPixels[index + 3] = 255;
  }
  const soilTexture = new THREE.DataTexture(soilPixels, soilSize, soilSize, THREE.RGBAFormat);
  soilTexture.wrapS = soilTexture.wrapT = THREE.RepeatWrapping;
  soilTexture.magFilter = THREE.LinearFilter; soilTexture.minFilter = THREE.LinearMipmapLinearFilter;
  soilTexture.generateMipmaps = true; soilTexture.needsUpdate = true; textures.add(soilTexture);
  const clearingMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    color: new THREE.Color(.111, .101, .079), map: soilTexture, bumpMap: soilTexture, bumpScale: .026,
    roughness: .93, metalness: .02, transparent: true, opacity: .9, alphaTest: .012, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  clearingMaterial.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec2 patchUV;
      varying vec2 vPatchUV;
      varying vec2 vPatchWorld;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vPatchUV = patchUV;
      vPatchWorld = (modelMatrix * vec4(position, 1.0)).xz;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec2 vPatchUV;
      varying vec2 vPatchWorld;
      float clearingHash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float clearingNoise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(clearingHash(cell), clearingHash(cell + vec2(1.,0.)), f.x),
          mix(clearingHash(cell + vec2(0.,1.)), clearingHash(cell + vec2(1.,1.)), f.x), f.y);
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      float radial = length(vPatchUV * 2.0 - 1.0);
      float edgeVariation = (clearingNoise(vPatchWorld * .58) - .5) * .14;
      float softEdge = 1.0 - smoothstep(.66 + edgeVariation, .99 + edgeVariation, radial);
      float wear = .37 + smoothstep(.25, .74, clearingNoise(vPatchWorld * .53 + 12.0)) * .43;
      diffuseColor.a *= softEdge * wear;
    `);
  };
  clearingMaterial.customProgramCacheKey = () => 'ridge-explorer-soft-ground-clearing-v1';

  function groundPatch(center, radius, material) {
    const points = [], uv = [], patchUV = [], indices = [], sectors = 48;
    const rings = Math.ceil(radius / 1.1);
    const vertex = (x, z) => {
      points.push(x, heightAt(x, z) + .046, z);
      uv.push(x / 2.7, z / 2.7);
      patchUV.push(.5 + (x - center.x) / (radius * 2), .5 + (z - center.z) / (radius * 2));
    };
    vertex(center.x, center.z);
    for (let ring = 1; ring <= rings; ring++) for (let i = 0; i < sectors; i++) {
      const angle = i / sectors * Math.PI * 2;
      const r = radius * (.93 + noise2(i, radius) * .14) * ring / rings;
      vertex(center.x + Math.cos(angle) * r, center.z + Math.sin(angle) * r);
      const current = 1 + (ring - 1) * sectors + i, next = 1 + (ring - 1) * sectors + (i + 1) % sectors;
      if (ring === 1) indices.push(0, next, current);
      else {
        const inner = current - sectors, innerNext = next - sectors;
        indices.push(inner, next, current, inner, innerNext, next);
      }
    }
    const geometry = ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('patchUV', new THREE.Float32BufferAttribute(patchUV, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const object = new THREE.Mesh(geometry, material); object.receiveShadow = true;
    object.name = `soft worn clearing: ${center.id}`; group.add(object);
  }

  // A narrow shallow brook descends toward the left valley, with an actual ford.
  const creek = LANDMARKS[0];
  const brook = [-117, -105, -92, -78, -62, -48, -33].map(z => ({
    x: creek.x - (z + 78) * .55 + Math.sin((z + 78) * .13) * 1.7, z,
  }));
  const bankMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    color: new THREE.Color(.082, .104, .096), vertexColors: true, roughness: .85, metalness: .06,
  }));
  ribbon(brook, 4.7, bankMaterial, { offset: .065 });
  const waterMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(.09, .17, .17), roughness: .24, metalness: .16, transparent: true,
    opacity: .83, depthWrite: false, clearcoat: .55, clearcoatRoughness: .2,
  }));
  waterMaterial.onBeforeCompile = shader => {
    shader.uniforms.uBrookTime = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      varying vec2 vBrookUV;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vBrookUV = uv;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform float uBrookTime;
      varying vec2 vBrookUV;
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      float flow = sin(vBrookUV.y * 8.0 - uBrookTime * 2.5 + sin(vBrookUV.x * 13.0));
      float wave = sin(vBrookUV.y * 21.0 - uBrookTime * 3.1 + vBrookUV.x * 17.0);
      float edge = smoothstep(.28, .49, abs(vBrookUV.x - .5));
      diffuseColor.rgb *= .88 + flow * .12 + wave * .035;
      diffuseColor.rgb += vec3(.15, .18, .17) * edge * smoothstep(.77, .98, flow);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      normal.xy += vec2(flow, wave) * .05;
      normal = normalize(normal);
    `);
  };
  waterMaterial.customProgramCacheKey = () => 'ridge-explorer-brook-v1';
  const water = ribbon(brook, 2.8, waterMaterial, { offset: .105, across: 6 });
  water.name = 'flowing shallow creek';
  const random = seededRandom(29181);
  for (let i = 0; i < (quality === 'low' ? 38 : 64); i++) {
    const z = -115 + random() * 80;
    const x = creek.x - (z + 78) * .55 + Math.sin((z + 78) * .13) * 1.7 + (random() < .5 ? -1 : 1) * (1.5 + random() * .8);
    const rock = mesh(new THREE.IcosahedronGeometry(.15 + random() * .22, 1), stone,
      [x, heightAt(x, z) + .06, z]);
    rock.scale.set(1.5, .45, 1.1); rock.rotation.set(random(), random() * Math.PI, random());
  }
  for (let i = -2; i <= 2; i++) {
    const x = creek.x + i * .56, z = creek.z + i * .48;
    const rock = mesh(new THREE.IcosahedronGeometry(.42, 1), stone, [x, heightAt(x, z) + .04, z]);
    rock.scale.set(1.18, .18, 1); rock.rotation.y = i;
  }

  function levelDeck(x, z, width, depth) {
    const top = Math.max(...[-1, 1].flatMap(sx => [-1, 1].map(sz => heightAt(x + sx * width / 2, z + sz * depth / 2)))) + .17;
    const n = Math.ceil(width / .32);
    for (let i = 0; i < n; i++) {
      const xx = x - width / 2 + (i + .5) * width / n;
      mesh(new THREE.BoxGeometry(width / n - .018, .13, depth), i % 4 ? timber : endgrain, [xx, top, z]);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const xx = x + sx * (width / 2 - .18), zz = z + sz * (depth / 2 - .18), y = heightAt(xx, zz);
      beam([xx, y - .05, zz], [xx, top + .04, zz], .09);
    }
    return top + .065;
  }

  const camp = LANDMARKS[1];
  groundPatch(camp, 9.7, clearingMaterial);
  const tentPos = { x: camp.x - 5.2, z: camp.z - 1.5 };
  const tentFloor = levelDeck(tentPos.x, tentPos.z, 3.9, 3.5);
  colliders.push({ x: tentPos.x, z: tentPos.z, radius: 2.35, kind: 'tent' });
  const firePos = { x: camp.x + 4.6, z: camp.z - 2.3 };
  const fireY = heightAt(firePos.x, firePos.z) + .06;
  colliders.push({ ...firePos, radius: .86, kind: 'fire' });
  const flameMaterial = ownMaterial(new THREE.MeshBasicMaterial({
    color: 0xe9a352, transparent: true, opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const coreMaterial = ownMaterial(new THREE.MeshBasicMaterial({
    color: 0xffdda0, transparent: true, opacity: .82, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const flame = mesh(new THREE.ConeGeometry(.2 - i * .024, .59 - i * .07, 5), i === 3 ? coreMaterial : flameMaterial,
      [firePos.x + (i % 2 ? .12 : -.08), fireY + .27, firePos.z + (i - 2) * .065]);
    flame.castShadow = false; flames.push(flame);
  }
  const fireLight = new THREE.PointLight(0xe7ac63, 3.5, 8, 2);
  fireLight.position.set(firePos.x, fireY + .55, firePos.z); group.add(fireLight);
  const smokeSize = 64, smokePixels = new Uint8Array(smokeSize * smokeSize * 4);
  for (let y = 0; y < smokeSize; y++) for (let x = 0; x < smokeSize; x++) {
    const xx = (x + .5) / smokeSize * 2 - 1, yy = (y + .5) / smokeSize * 2 - 1;
    const falloff = Math.max(0, Math.exp(-(xx * xx + yy * yy) * 5.2) - Math.exp(-5.2));
    const index = (y * smokeSize + x) * 4;
    smokePixels[index] = smokePixels[index + 1] = smokePixels[index + 2] = 255;
    smokePixels[index + 3] = Math.round(falloff * 255);
  }
  const smokeTexture = new THREE.DataTexture(smokePixels, smokeSize, smokeSize, THREE.RGBAFormat);
  smokeTexture.magFilter = THREE.LinearFilter; smokeTexture.minFilter = THREE.LinearFilter;
  smokeTexture.needsUpdate = true; textures.add(smokeTexture);
  const smokeGeometry = ownGeometry(new THREE.PlaneGeometry(1, 1.6));
  const cameraOrientation = new THREE.Quaternion(), parentOrientation = new THREE.Quaternion();
  const smoke = [];
  for (let i = 0; i < 5; i++) {
    const smokeMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: 0x929b91, map: smokeTexture,
      transparent: true, opacity: .035, depthWrite: false, alphaTest: .001, blending: THREE.NormalBlending }));
    const puff = mesh(smokeGeometry, smokeMaterial, [firePos.x, fireY + .7 + i * .46, firePos.z]);
    puff.name = `soft drifting camp smoke: ${i}`; puff.castShadow = false; puff.receiveShadow = false;
    puff.onBeforeRender = (_renderer, _scene, camera) => {
      camera.getWorldQuaternion(cameraOrientation);
      puff.parent.getWorldQuaternion(parentOrientation);
      puff.quaternion.copy(parentOrientation).invert().multiply(cameraOrientation);
      puff.updateMatrixWorld();
    };
    smoke.push(puff);
  }

  const lookout = LANDMARKS[2];
  groundPatch(lookout, 6.8, clearingMaterial);
  const deckPos = { x: lookout.x + 5.8, z: lookout.z - 2.8 };
  const deckY = levelDeck(deckPos.x, deckPos.z, 5.7, 4.0);
  colliders.push({ ...deckPos, radius: 3.4, kind: 'lookout-deck' });
  const frontZ = deckPos.z - 1.8;
  for (const x of [deckPos.x - 2.65, deckPos.x, deckPos.x + 2.65])
    beam([x, deckY - .05, frontZ], [x, deckY + .92, frontZ], .065);
  for (const y of [deckY + .47, deckY + .88]) beam([deckPos.x - 2.65, y, frontZ], [deckPos.x + 2.65, y, frontZ], .055);
  for (const sx of [-1, 1]) {
    const x = deckPos.x + sx * 2.65;
    beam([x, deckY, deckPos.z + 1.7], [x, deckY + .92, deckPos.z + 1.7], .065);
    beam([x, deckY + .88, frontZ], [x, deckY + .88, deckPos.z + 1.7], .055);
  }
  const cairnPos = { x: lookout.x - 4.7, z: lookout.z - 2.0 };
  const cairnY = heightAt(cairnPos.x, cairnPos.z);
  colliders.push({ ...cairnPos, radius: .86, kind: 'cairn' });
  for (let i = 0; i < 6; i++) {
    const rock = mesh(new THREE.IcosahedronGeometry(.7 - i * .079, 1), stone,
      [cairnPos.x + Math.sin(i * 1.8) * .07, cairnY + .15 + i * .245, cairnPos.z + Math.cos(i) * .07]);
    rock.scale.set(1, .35, .84); rock.rotation.y = i * .81;
  }

  function flag(landmark) {
    const flagOffset = landmark.id === 'lookout' ? [-3.8, .5] : landmark.id === 'camp' ? [6, .2] : [5.1, -1.8];
    const x = landmark.x + flagOffset[0], z = landmark.z + flagOffset[1], y = heightAt(x, z);
    beam([x, y, z], [x, y + 2.7, z], .043);
    colliders.push({ x, z, radius: .15, kind: 'marker' });
    const material = ownMaterial(new THREE.MeshStandardMaterial({ color: new THREE.Color(.44, .36, .2), roughness: 1,
      side: THREE.DoubleSide }));
    markerMaterials.set(landmark.id, material);
    material.onBeforeCompile = shader => {
      shader.uniforms.uFlagTime = time; shader.uniforms.uFlagWind = wind;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        #include <common>
        uniform float uFlagTime;
        uniform float uFlagWind;
      `).replace('#include <begin_vertex>', `
        #include <begin_vertex>
        transformed.z += sin(position.x * 7.0 - uFlagTime * 2.6) * uv.x * .12 * uFlagWind;
      `);
    };
    material.customProgramCacheKey = () => 'ridge-explorer-landmark-cloth-v1';
    const cloth = mesh(new THREE.PlaneGeometry(.85, .43, 9, 3), material, [x + .41, y + 2.34, z]);
    cloth.name = `physical landmark pennant: ${landmark.id}`;
  }
  LANDMARKS.forEach(flag);

  function sign(junction, label, direction) {
    const x = junction.x + 2.15, z = junction.z + 1.7, y = heightAt(x, z);
    beam([x, y, z], [x, y + 1.7, z], .055);
    const board = mesh(new THREE.BoxGeometry(1.25, .27, .10), endgrain, [x + direction * .36, y + 1.47, z]);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#554231'; ctx.fillRect(0, 0, 384, 96); ctx.fillStyle = '#ded8ba';
        ctx.font = '500 35px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${direction < 0 ? '← ' : ''}${label}${direction > 0 ? ' →' : ''}`, 192, 49);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
        const material = ownMaterial(new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
        mesh(new THREE.PlaneGeometry(1.23, .26), material, [board.position.x, board.position.y, z + .055]);
      }
    }
    colliders.push({ x, z, radius: .18, kind: 'signpost' });
  }
  sign(TRAILS[1].points[0], '溪流 · 营地', -1);
  sign(TRAILS[2].points[0], '雪峰观景台', 1);

  const modelPalette = name => name === 'colorRed' ? [.29, .28, .21] : name === 'stone' ? [.16, .18, .15]
    : name === 'woodInner' ? [.2, .145, .085] : name === 'woodBark' ? [.068, .048, .030] : [.10, .071, .043];
  const loader = new GLTFLoader();
  async function model(name, size, position, rotation = 0) {
    const gltf = await loader.loadAsync(`./assets/exploration/${name}.glb`);
    const object = gltf.scene;
    object.traverse(child => {
      if (!child.isMesh) return;
      geometries.add(child.geometry);
      const list = Array.isArray(child.material) ? child.material : [child.material];
      list.forEach(material => {
        materials.add(material); material.color.setRGB(...modelPalette(material.name));
        material.metalness = 0; material.roughness = .95;
      });
      child.castShadow = true; child.receiveShadow = true;
    });
    object.scale.setScalar(size); object.rotation.y = rotation;
    const box = new THREE.Box3().setFromObject(object);
    object.position.set(position.x, position.y - box.min.y, position.z);
    object.name = `licensed Kenney Nature model: ${name}`;
    if (disposed) {
      object.traverse(child => {
        child.geometry?.dispose();
        const list = Array.isArray(child.material) ? child.material : [child.material];
        list.filter(Boolean).forEach(material => material.dispose());
      });
      return null;
    }
    group.add(object); return object;
  }
  const ready = loadAssets ? Promise.all([
    model('tent_detailedOpen', 4.1, { ...tentPos, y: tentFloor }, -.12),
    model('campfire_stones', 2.2, { ...firePos, y: fireY }),
    model('log', 3.4, { x: camp.x + 4.6, z: camp.z + 2.2, y: heightAt(camp.x + 4.6, camp.z + 2.2) }, Math.PI / 2),
  ]).catch(error => { onError?.(`营地资源加载失败：${error.message}`); throw error; }) : Promise.resolve();
  colliders.push({ x: camp.x + 4.6, z: camp.z + 2.2, radius: 1.12, kind: 'log' });

  return {
    group, colliders, ready,
    update(now, params = {}, visited = []) {
      time.value = now; wind.value = params.wind ?? 1;
      group.visible = params.layers?.terrain !== false;
      for (const [id, material] of markerMaterials) {
        const discovered = visited instanceof Set ? visited.has(id) : visited.includes(id);
        material.color.setRGB(...(discovered ? [.55, .47, .29] : [.44, .36, .2]));
      }
      flames.forEach((flame, i) => {
        const flicker = .86 + Math.sin(now * 7.2 + i * 2.3) * .12 + Math.sin(now * 13.0 + i) * .07;
        flame.scale.set(1 / Math.sqrt(flicker), flicker, 1 / Math.sqrt(flicker));
        flame.rotation.z = Math.sin(now * 3.4 + i) * .1 + wind.value * .12;
      });
      fireLight.intensity = 3.2 + Math.sin(now * 8.3) * .3;
      smoke.forEach((puff, i) => {
        const age = (now * .16 + i / smoke.length) % 1, rise = .16 + age * 2.45;
        const fadeIn = THREE.MathUtils.smoothstep(age, 0, .2), fadeOut = 1 - THREE.MathUtils.smoothstep(age, .57, 1);
        puff.position.set(firePos.x + rise * wind.value * .18, fireY + .65 + rise,
          firePos.z + Math.sin(now * .6 + i) * rise * .06);
        puff.scale.setScalar(.32 + age * .5);
        puff.material.opacity = .052 * fadeIn * fadeOut;
      });
    },
    dispose() {
      disposed = true; scene.remove(group);
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
      group.clear();
    },
  };
}
