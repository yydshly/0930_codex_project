import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const HORSE_SCALE = .0095;
export const HORSE_GAIT_SECONDS = 1.0;
// Match translation to the supplied canter's measured grounded-hoof sweep.
// This clip has an airborne phase; it is not a four-beat walking animation.
export const HORSE_TRAVEL_SPEED = 4.2;

// The original narrow tail starts above the hindquarters. In the rest mesh,
// rear body/leg vertices stay below y=120 here, while the projecting tail is
// y=128..148. Clip the same tail-root boundary in colour and shadow passes.
const discardLegacyTail = position => `if (${position}.z < -103. && ${position}.y > 122.) discard;`;

// The ROME mesh is a closed 494-vertex surface with colour/UV seam duplicates.
// Weld the seams, then apply one Loop subdivision to every animation pose as
// well as the rest mesh. This softens the outline without losing the gait.
export function smoothHorseGeometry(source) {
  const position = source.attributes.position, colour = source.attributes.color;
  const targets = source.morphAttributes.position;
  const channels = [position, ...targets, colour];
  const unique = [], remap = [], keys = new Map();
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
    if (!keys.has(key)) {
      keys.set(key, unique.length);
      unique.push(channels.map(a => [a.getX(i), a.getY(i), a.getZ(i)]));
    }
    remap[i] = keys.get(key);
  }
  const faces = [], edges = new Map(), neighbours = unique.map(() => new Set());
  const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  const connect = (a, b, opposite) => {
    neighbours[a].add(b); neighbours[b].add(a);
    const key = edgeKey(a, b);
    if (!edges.has(key)) edges.set(key, { a, b, opposite: [] });
    edges.get(key).opposite.push(opposite);
  };
  const indices = source.index.array;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [remap[indices[i]], remap[indices[i + 1]], remap[indices[i + 2]]];
    if (a === b || b === c || c === a) continue;
    faces.push([a, b, c]); connect(a, b, c); connect(b, c, a); connect(c, a, b);
  }
  const blend = (weights) => channels.map((_, channel) => [0, 1, 2].map(axis => weights.reduce((n, [index, w]) => n + unique[index][channel][axis] * w, 0)));
  const output = unique.map((_, i) => {
    const adjacent = [...neighbours[i]], n = adjacent.length;
    const boundary = adjacent.filter(j => edges.get(edgeKey(i, j)).opposite.length === 1);
    if (boundary.length === 2) return blend([[i, .75], ...boundary.map(j => [j, .125])]);
    const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
    return blend([[i, 1 - n * beta], ...adjacent.map(j => [j, beta])]);
  });
  for (const edge of edges.values()) {
    edge.index = output.length;
    output.push(edge.opposite.length === 2
      ? blend([[edge.a, 3 / 8], [edge.b, 3 / 8], ...edge.opposite.map(i => [i, 1 / 8])])
      : blend([[edge.a, .5], [edge.b, .5]]));
  }
  const newIndices = [];
  for (const [a, b, c] of faces) {
    const ab = edges.get(edgeKey(a, b)).index, bc = edges.get(edgeKey(b, c)).index, ca = edges.get(edgeKey(c, a)).index;
    newIndices.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  const attr = channel => new THREE.Float32BufferAttribute(output.flatMap(v => v[channel]), 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(newIndices);
  geometry.setAttribute('position', attr(0));
  geometry.setAttribute('color', attr(channels.length - 1));
  geometry.morphAttributes.position = targets.map((_, i) => attr(i + 1));
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  geometry.computeVertexNormals();
  // Original GLB has only position morphs; animate normals too, so shoulders and
  // flexing legs do not retain the lighting of the first pose.
  const absolute = geometry.clone();
  const normals = geometry.attributes.normal;
  geometry.morphAttributes.normal = geometry.morphAttributes.position.map(target => {
    const posed = Float32Array.from(geometry.attributes.position.array, (v, i) => v + target.array[i]);
    absolute.setAttribute('position', new THREE.BufferAttribute(posed, 3));
    absolute.computeVertexNormals();
    return new THREE.BufferAttribute(Float32Array.from(absolute.attributes.normal.array, (v, i) => v - normals.array[i]), 3);
  });
  absolute.dispose();
  geometry.computeBoundingSphere();
  return geometry;
}

function garmentMaterial(colour, roughness = .9) {
  const material = new THREE.MeshStandardMaterial({ color: colour, roughness });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFabricPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFabricPosition = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFabricPosition;').replace('#include <color_fragment>', `#include <color_fragment>
      float weave = sin(vFabricPosition.x * 360.) * sin(vFabricPosition.y * 310.);
      float crease = sin(vFabricPosition.y * 61. + vFabricPosition.x * 18.);
      diffuseColor.rgb *= .96 + weave * .032 + crease * .035;`);
  };
  return material;
}

function curvedTube(points, radii, sides = 9, segments = 16) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
  const frames = curve.computeFrenetFrames(segments, false), p = geometry.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, ri = t * (radii.length - 1), index = Math.floor(ri);
    const radius = THREE.MathUtils.lerp(radii[index], radii[Math.min(index + 1, radii.length - 1)], ri - index);
    const center = curve.getPointAt(t);
    for (let j = 0; j <= sides; j++) {
      const theta = j / sides * Math.PI * 2, vertex = i * (sides + 1) + j;
      const v = center.clone().addScaledVector(frames.normals[i], -Math.cos(theta) * radius).addScaledVector(frames.binormals[i], Math.sin(theta) * radius);
      p.setXYZ(vertex, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Keep curves and buffers alive for the entire ride. The sleeve and rein
// surfaces share this small updater instead of allocating a new curve every
// frame or rebuilding all triangle normals after moving their centerline.
function movingTube(points, radii, sides = 9, segments = 16) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geometry = curvedTube(points, radii, sides, segments);
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  const radius = new Float32Array(segments + 1);
  const slope = new Float32Array(segments + 1);
  const cosine = new Float32Array(sides + 1), sine = new Float32Array(sides + 1);
  const center = new THREE.Vector3(), tangent = new THREE.Vector3();
  const across = new THREE.Vector3(), normal = new THREE.Vector3(), radial = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const r = i / segments * (radii.length - 1), index = Math.min(Math.floor(r), radii.length - 2);
    radius[i] = THREE.MathUtils.lerp(radii[index], radii[index + 1], r - index);
    slope[i] = (radii[index + 1] - radii[index]) * (radii.length - 1);
  }
  for (let j = 0; j <= sides; j++) {
    cosine[j] = Math.cos(j / sides * Math.PI * 2);
    sine[j] = Math.sin(j / sides * Math.PI * 2);
  }
  return { geometry, points: curve.points, update() {
    const p = geometry.attributes.position, n = geometry.attributes.normal;
    const length = Math.max(.001, curve.points[0].distanceTo(curve.points[1]) + curve.points[1].distanceTo(curve.points[2]));
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      curve.getPoint(t, center); curve.getTangent(t, tangent);
      across.crossVectors(tangent, THREE.Object3D.DEFAULT_UP).normalize();
      normal.crossVectors(across, tangent).normalize();
      for (let j = 0; j <= sides; j++) {
        const vertex = i * (sides + 1) + j;
        radial.copy(across).multiplyScalar(cosine[j]).addScaledVector(normal, sine[j]);
        p.setXYZ(vertex, center.x + radius[i] * radial.x, center.y + radius[i] * radial.y, center.z + radius[i] * radial.z);
        radial.addScaledVector(tangent, -slope[i] / length).normalize();
        n.setXYZ(vertex, radial.x, radial.y, radial.z);
      }
    }
    p.needsUpdate = true; n.needsUpdate = true;
  } };
}

function torsoGeometry() {
  const rings = 15, sides = 28, positions = [], indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, y = .14 + t * .51;
    const width = .155 + Math.sin(t * Math.PI) * .021 + t * .045;
    const depth = .105 + Math.sin(t * Math.PI) * .014;
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      const fold = 1 + Math.sin(a * 7 + t * 8) * .019 + Math.sin(a * 11 - t * 13) * .012;
      positions.push(Math.cos(a) * width * fold, y, -.055 - t * .115 + Math.sin(a) * depth * fold);
      if (i < rings && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function drapedMantle() {
  const rows = 18, columns = 30, positions = [], indices = [];
  // Close to the back at the waist, with a shorter left edge and a loose right
  // panel. The earlier bell-shaped hem hid the figure inside a round poncho.
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    for (let j = 0; j <= columns; j++) {
      const u = j / columns * 2 - 1, a = u * 1.88;
      const radius = .16 + Math.sin(t * Math.PI * .9) * .10;
      // The back center ends at the shoulders, exposing the dark tunic. Side
      // folds continue down, with the right fold substantially longer.
      const lowerEdge = .55 - THREE.MathUtils.smoothstep(Math.abs(u), .08, .70) * (.32 + .10 * u) + .028 * Math.sin(u * 4 + .4);
      const y = .65 + (lowerEdge - .65) * t;
      const fold = Math.sin(u * 17 + t * 3) * (.006 + t * .015);
      positions.push(Math.sin(a) * (radius + fold), y, -.16 + t * .10 + Math.cos(a) * (radius + fold));
      if (i < rows && j < columns) {
        const k = i * (columns + 1) + j;
        indices.push(k, k + 1, k + columns + 1, k + 1, k + columns + 2, k + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function saddleClothGeometry() {
  const across = 22, along = 18, positions = [], indices = [];
  for (let i = 0; i <= along; i++) {
    const t = i / along, v = t * 2 - 1;
    for (let j = 0; j <= across; j++) {
      const u = j / across * 2 - 1, a = u * 1.59;
      const radius = .325 - Math.abs(v) ** 4 * .045;
      positions.push(Math.sin(a) * radius, .014 - (1 - Math.cos(a)) * .265 - Math.abs(v) ** 3 * .02, .045 + v * (.345 - Math.abs(u) ** 3 * .045));
      if (i < along && j < across) {
        const k = i * (across + 1) + j;
        indices.push(k, k + across + 1, k + 1, k + 1, k + across + 1, k + across + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function createRider(scene, options = {}) {
  const group = new THREE.Group();
  group.name = 'Rider and animated horse';
  scene.add(group);
  const materials = new Set(), geometries = new Set();
  const material = m => { materials.add(m); return m; };
  const leather = material(new THREE.MeshStandardMaterial({ color: '#32291f', roughness: .76 }));
  const bootLeather = material(new THREE.MeshStandardMaterial({ color: '#23272a', roughness: .69 }));
  const pants = material(garmentMaterial('#42454a'));
  const shirt = material(garmentMaterial('#4a504e'));
  const ochre = material(garmentMaterial('#a68b49'));
  const mantleMaterial = material(garmentMaterial('#9d8248'));
  mantleMaterial.side = THREE.DoubleSide;
  const skin = material(new THREE.MeshStandardMaterial({ color: '#8b7661', roughness: .86 }));
  const metal = material(new THREE.MeshStandardMaterial({ color: '#525453', roughness: .5, metalness: .45 }));
  const hair = material(new THREE.MeshStandardMaterial({ color: '#24231f', roughness: .74 }));
  const add = (parent, geometry, mat, position = [0, 0, 0], scale) => {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const ellipsoid = (parent, mat, position, scale) => add(parent, new THREE.SphereGeometry(1, 18, 12), mat, position, scale);
  const mounted = new THREE.Group(); mounted.name = 'Saddle and seated rider'; group.add(mounted);
  mounted.position.set(0, 1.4, .18);
  const blanket = add(mounted, saddleClothGeometry(), ochre);
  blanket.name = 'Curved saddle cloth';
  ellipsoid(mounted, leather, [0, .007, .045], [.255, .078, .29]);
  ellipsoid(mounted, leather, [0, .10, .24], [.225, .065, .06]);
  ellipsoid(mounted, leather, [0, .082, -.24], [.25, .072, .055]);
  // Pommel, rolled travel blanket, and tied straps provide readable saddle detail.
  ellipsoid(mounted, leather, [0, .13, -.22], [.07, .09, .045]);
  const roll = add(mounted, new THREE.CylinderGeometry(.075, .075, .38, 14), pants, [0, -.006, .39]); roll.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    add(mounted, curvedTube([[side * .19, .1, .32], [side * .19, .145, .36], [side * .19, .075, .44]], [.011, .011]), leather);
  }
  const upper = new THREE.Group(); upper.name = 'Rider upper body'; mounted.add(upper);
  ellipsoid(upper, pants, [0, .12, .055], [.195, .13, .135]);
  add(upper, torsoGeometry(), shirt);
  ellipsoid(upper, shirt, [0, .625, -.162], [.19, .055, .113]);
  add(upper, new THREE.CylinderGeometry(.082, .09, .15, 14), shirt, [0, .706, -.19]);
  // Head is forward of the shoulders, with a tied hood and distinct jaw/profile.
  ellipsoid(upper, skin, [0, .859, -.228], [.114, .145, .108]);
  ellipsoid(upper, skin, [0, .811, -.276], [.093, .074, .065]);
  ellipsoid(upper, shirt, [0, .902, -.205], [.127, .109, .12]);
  ellipsoid(upper, leather, [0, .968, -.212], [.124, .035, .124]);
  const scarf = ellipsoid(upper, ochre, [0, .727, -.192], [.13, .067, .13]);
  scarf.rotation.z = -.07;
  const mantle = add(upper, drapedMantle(), mantleMaterial); mantle.name = 'Draped travelling mantle';
  mantle.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  mantle.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  const mantleBase = Float32Array.from(mantle.geometry.attributes.position.array);
  // A narrow harness and a restrained diagonal travel case break up the broad
  // fabric silhouette. They move with the chest rather than floating behind it.
  add(upper, curvedTube([[-.17, .60, .014], [-.08, .40, .14], [.14, .205, .16]], [.014, .013, .014], 7, 18), leather);
  add(upper, curvedTube([[.18, .61, .008], [.08, .43, .15], [-.15, .235, .16]], [.012, .012, .013], 7, 18), leather);
  const travelCase = add(upper, curvedTube([[.205, .17, .19], [.035, .43, .19], [-.21, .765, .095]], [.027, .028, .025], 9, 18), bootLeather);
  travelCase.name = 'Diagonal travel case';
  ellipsoid(upper, leather, [-.205, .765, .093], [.039, .049, .04]);
  add(mounted, curvedTube([[-.29, .07, .06], [-.33, -.17, .19], [-.345, -.34, .29]], [.022, .021, .014], 8, 14), leather);
  for (const side of [-1, 1]) {
    ellipsoid(upper, shirt, [side * .211, .584, -.149], [.096, .072, .124]);
  }
  const armData = [];
  for (const side of [-1, 1]) {
    // Every limb changes direction at an anatomical knee/elbow; hands meet the
    // reins, heels sit below toes, and thighs wrap around rather than through the horse.
    const sleeve = movingTube([[side * .208, .58, -.17], [side * .29, .45, -.33], [side * .285, .397, -.37]], [.095, .086, .08]);
    const forearm = movingTube([[side * .285, .397, -.37], [side * .22, .28, -.49], [side * .145, .272, -.55]], [.075, .068, .052]);
    const upperSleeve = add(upper, sleeve.geometry, shirt), lowerSleeve = add(upper, forearm.geometry, ochre);
    upperSleeve.name = `${side < 0 ? 'Left' : 'Right'} upper sleeve`; lowerSleeve.name = `${side < 0 ? 'Left' : 'Right'} forearm sleeve`;
    upperSleeve.frustumCulled = false; lowerSleeve.frustumCulled = false;
    const glove = ellipsoid(upper, leather, [side * .133, .267, -.571], [.056, .052, .074]);
    glove.name = `${side < 0 ? 'Left' : 'Right'} rein hand`;
    armData.push({ side, sleeve, forearm, glove, wrist: new THREE.Vector3(), elbow: new THREE.Vector3() });
    add(mounted, curvedTube([[side * .15, .12, .07], [side * .29, -.02, -.12], [side * .34, -.23, -.21]], [.114, .104, .095]), pants);
    add(mounted, curvedTube([[side * .34, -.23, -.21], [side * .345, -.40, -.04], [side * .335, -.59, .015]], [.075, .065, .058]), bootLeather);
    const foot = ellipsoid(mounted, bootLeather, [side * .335, -.615, -.068], [.072, .065, .148]); foot.rotation.x = -.11;
    add(mounted, curvedTube([[side * .29, -.06, -.16], [side * .36, -.36, -.08], [side * .355, -.61, -.06]], [.01, .01]), leather);
    const stirrup = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * .355 - .06, -.60, -.055), new THREE.Vector3(side * .355 - .065, -.715, -.055),
      new THREE.Vector3(side * .355 + .065, -.715, -.055), new THREE.Vector3(side * .355 + .06, -.60, -.055),
      new THREE.Vector3(side * .355, -.56, -.055)
    ], true);
    add(mounted, new THREE.TubeGeometry(stirrup, 26, .009, 6, true), metal);
  }
  // Thin tubular reins deform between the moving hands and actual morphed head.
  const reinData = [];
  for (const side of [-1, 1]) {
    const tube = movingTube([[side * .133, 1.65, -.57], [side * .16, 1.51, -.88], [side * .083, 1.40, -1.2]], [.0045, .0045], 6, 24);
    const mesh = add(group, tube.geometry, leather); mesh.name = `${side < 0 ? 'Left' : 'Right'} rein`;
    mesh.frustumCulled = false;
    reinData.push({ side, tube });
  }
  const tail = new THREE.Group(); tail.name = 'Flowing tail hair'; group.add(tail);
  const tailData = [];
  for (let strand = 0; strand < 11; strand++) {
    const offset = (strand - 5) * .007, length = .82 + Math.sin(strand * 1.7 + .5) * .105;
    const points = [[offset, 0, 0], [offset * 1.3, -.17, .13], [offset * 1.7, -.43, .24], [offset * 2.1, -.79 * length, .31 + Math.sin(strand * 2.3) * .026]];
    const geometry = curvedTube(points, [.028, .024, .016, .0015], 6, 18);
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    const mesh = add(tail, geometry, hair); mesh.frustumCulled = false;
    const base = Float32Array.from(geometry.attributes.position.array);
    tailData.push({ geometry, base, baseNormals: Float32Array.from(geometry.attributes.normal.array), strand });
  }
  const contactMaterial = material(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { opacity: { value: .22 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv; uniform float opacity; void main(){float a=1.-smoothstep(.15,.50,length((vUv-.5)*vec2(1.,1.)));gl_FragColor=vec4(.016,.019,.014,a*opacity);}'
  }));
  const contact = add(group, new THREE.PlaneGeometry(1.05, 2.55), contactMaterial, [0, .015, .1]);
  contact.name = 'Soft ground contact'; contact.castShadow = false; contact.receiveShadow = false; contact.rotation.x = -Math.PI / 2;

  let mixer, action, sourceMesh, sourcePositions, sourceMorphs, alive = true, model, gaitTime = 0, lastWind = 0;
  const hoofIndices = [];
  let lastBackY, lastBackVelocity = 0, lastBackPitch, clothLift = 0, clothSweep = 0;
  const measurements = { originalFront: '+Z', front: '-Z', scale: HORSE_SCALE, gaitSeconds: HORSE_GAIT_SECONDS, travelSpeed: HORSE_TRAVEL_SPEED };
  const baseUrl = import.meta.env?.BASE_URL ?? '/';
  const loadHorse = options.loadHorse ?? (url => new GLTFLoader().loadAsync(url));
  const ready = loadHorse(`${baseUrl}assets/horse.glb`).then(gltf => {
    model = gltf.scene;
    if (!alive) { model.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); return; }
    model.name = 'Animated horse facing forward';
    const bounds = new THREE.Box3().setFromObject(model, true);
    measurements.originalBounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
    model.scale.setScalar(HORSE_SCALE);
    model.rotation.y = Math.PI; // The supplied asset's head faces +Z, route front is -Z.
    model.position.y = .055; // Lowest original foot in all poses is -4.2 units.
    model.traverse(o => {
      if (!o.isMesh) return;
      sourceMesh = o;
      sourcePositions = o.geometry.attributes.position;
      sourceMorphs = o.geometry.morphAttributes.position;
      // Vertices that enter the hoof-contact band in any supplied pose. Use
      // their actual blended height, including the clip's genuine flight phase.
      const hoofKeys = new Set();
      for (let i = 0; i < sourcePositions.count; i++) {
        let lowest = sourcePositions.getY(i);
        for (const target of sourceMorphs) lowest = Math.min(lowest, sourcePositions.getY(i) + target.getY(i));
        if (lowest >= 12) continue;
        const key = `${sourcePositions.getX(i)},${sourcePositions.getY(i)},${sourcePositions.getZ(i)}`;
        if (!hoofKeys.has(key)) { hoofKeys.add(key); hoofIndices.push(i); }
      }
      const original = o.geometry;
      o.geometry = smoothHorseGeometry(original); geometries.add(o.geometry); original.dispose();
      const colours = o.geometry.attributes.color;
      for (let i = 0; i < colours.count; i++) {
        const luminosity = colours.getX(i) * .2126 + colours.getY(i) * .7152 + colours.getZ(i) * .0722;
        const coat = .028 + luminosity * .23;
        colours.setXYZ(i, coat * 1.07, coat * .97, coat * .89);
      }
      o.material.dispose();
      o.material = material(new THREE.MeshPhysicalMaterial({
        color: '#d2cdc3', vertexColors: true, roughness: .63,
        clearcoat: .22, clearcoatRoughness: .59
      }));
      o.material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoatPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoatPosition = position;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoatPosition;').replace('#include <color_fragment>', `#include <color_fragment>
          // Replace the legacy polygonal horizontal tail with flowing hair.
          ${discardLegacyTail('vCoatPosition')}
          float grain = sin(vCoatPosition.x * 7.7 + sin(vCoatPosition.y * 8.)) * sin(vCoatPosition.z * 5.8);
          diffuseColor.rgb *= .97 + grain * .045;`);
      };
      o.customDepthMaterial = material(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
      o.customDepthMaterial.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTailCutPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTailCutPosition = position;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTailCutPosition;').replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${discardLegacyTail('vTailCutPosition')}`);
      };
      o.castShadow = true; o.receiveShadow = true;
    });
    group.add(model);
    mixer = new THREE.AnimationMixer(model);
    action = mixer.clipAction(gltf.animations[0]).setDuration(HORSE_GAIT_SECONDS).play();
    measurements.renderTriangles = sourceMesh.geometry.index.count / 3;
    measurements.renderBounds = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3()).toArray();
    update(0, 0, 0, false);
    return measurements;
  });
  const sample = (index, out) => {
    out.fromBufferAttribute(sourcePositions, index);
    for (let i = 0; i < sourceMorphs.length; i++) {
      const weight = sourceMesh.morphTargetInfluences[i];
      if (weight) { const a = sourceMorphs[i]; out.x += a.getX(index) * weight; out.y += a.getY(index) * weight; out.z += a.getZ(index) * weight; }
    }
    out.multiplyScalar(HORSE_SCALE); out.x *= -1; out.z *= -1; out.y += .055;
    return out;
  };
  const rear = new THREE.Vector3(), forward = new THREE.Vector3(), muzzle = new THREE.Vector3(), hand = new THREE.Vector3();
  const croup = new THREE.Vector3(), hoof = new THREE.Vector3(), localMuzzle = new THREE.Vector3(), neutralMuzzle = new THREE.Vector3();
  const inverseMounted = new THREE.Matrix4(), inverseUpper = new THREE.Matrix4();
  const wristDelta = new THREE.Vector3();
  let neutralMuzzleSet = false;
  let poseDirty = true;
  function update(time, dt, wind, moving) {
    // Paused frames reuse the last pose rather than upload identical dynamic
    // tail, rein and cloth geometry on every render.
    if (mixer && !moving && !poseDirty && wind === lastWind) return;
    if (mixer) poseDirty = false;
    lastWind = wind;
    if (mixer) {
      const step = moving ? dt : 0;
      gaitTime += step; mixer.update(step);
      // Mid-back vertices 67 / 334 follow the actual morph-target spine.
      sample(67, rear); sample(334, forward);
      mounted.position.copy(rear).lerp(forward, .32); mounted.position.y += .052;
      mounted.rotation.x = Math.atan2(forward.y - rear.y, rear.z - forward.z) * .75;
      if (step > 0 && lastBackY !== undefined) {
        const velocity = (mounted.position.y - lastBackY) / step;
        const acceleration = (velocity - lastBackVelocity) / step;
        const response = 1 - Math.exp(-step * 8);
        clothLift = THREE.MathUtils.lerp(clothLift, THREE.MathUtils.clamp(-acceleration * .006, -.045, .045), response);
        clothSweep = THREE.MathUtils.lerp(clothSweep, THREE.MathUtils.clamp((mounted.rotation.x - lastBackPitch) / step * .025, -.035, .035), response);
        lastBackVelocity = velocity;
      }
      lastBackY = mounted.position.y;
      lastBackPitch = mounted.rotation.x;
      // setDuration changes timeScale; action.time is still measured against the
      // source clip duration. Normalize against that clip to avoid a discontinuity
      // in the seated body when the horse animation loops.
      const phase = action.time / action.getClip().duration * Math.PI * 2;
      // The hips remain attached to the saddle while the chest absorbs some
      // back pitch. A smaller residual rise keeps the rider seated in side view.
      upper.rotation.x = -.10 - mounted.rotation.x * .40 + Math.sin(phase - .55) * .026;
      upper.rotation.y = Math.sin(phase - .4) * .012;
      upper.rotation.z = Math.sin(phase + .5) * .018;
      upper.position.y = .012 + Math.cos(phase - .3) * .013;
      upper.position.z = Math.sin(phase - .7) * .009;
      let clearance = Infinity;
      for (const index of hoofIndices) clearance = Math.min(clearance, sample(index, hoof).y - .012);
      const flight = THREE.MathUtils.smoothstep(clearance, .045, .33);
      contactMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(.27, .12, flight);
      contact.scale.set(1 + flight * .23, 1 + flight * .16, 1);
      measurements.hoofClearance = clearance;
      sample(115, muzzle);
      sample(68, croup); tail.position.copy(croup); tail.position.y -= .095; tail.position.z += .15;
      tail.rotation.x = -.18 + Math.sin(phase - .5) * .12;
      tail.rotation.z = Math.sin(gaitTime * 2.7) * .055;
      for (const { geometry, base, baseNormals, strand } of tailData) {
        const p = geometry.attributes.position, n = geometry.attributes.normal;
        for (let i = 0; i < p.count; i++) {
          const t = Math.min(1, Math.max(0, -base[i * 3 + 1] / .8));
          const sway = gaitTime * 4.2 - t * 2.8, flutter = gaitTime * 6 - t * 3 + strand * .7, lift = gaitTime * 4 - t * 2.7;
          p.setXYZ(i, base[i * 3] + Math.sin(sway) * t * .05 + Math.sin(flutter) * t * .008, base[i * 3 + 1], base[i * 3 + 2] + Math.sin(lift) * t * .027);
          // Inverse transpose of x += f(y), z += g(y), preserving the original
          // strand normals without eleven triangle-normal rebuilds per frame.
          const derivative = t > 0 && t < 1 ? -1 / .8 : 0;
          const dx = derivative * ((Math.sin(sway) - t * 2.8 * Math.cos(sway)) * .05 + (Math.sin(flutter) - t * 3 * Math.cos(flutter)) * .008);
          const dz = derivative * (Math.sin(lift) - t * 2.7 * Math.cos(lift)) * .027;
          const nx = baseNormals[i * 3], nz = baseNormals[i * 3 + 2], ny = baseNormals[i * 3 + 1] - dx * nx - dz * nz;
          const magnitude = Math.hypot(nx, ny, nz) || 1;
          n.setXYZ(i, nx / magnitude, ny / magnitude, nz / magnitude);
        }
        p.needsUpdate = true; n.needsUpdate = true;
      }
      mounted.updateMatrix(); upper.updateMatrix();
      inverseMounted.copy(mounted.matrix).invert(); inverseUpper.copy(upper.matrix).invert();
      localMuzzle.copy(muzzle).applyMatrix4(inverseMounted);
      if (!neutralMuzzleSet) { neutralMuzzle.copy(localMuzzle); neutralMuzzleSet = true; }
      for (const { side, sleeve, forearm, glove, wrist, elbow } of armData) {
        // Hands follow a small fraction of the real head motion in saddle space;
        // elbows flex to compensate for chest pitch rather than rigidly swinging
        // the complete arm through the same rotation as the torso.
        hand.set(side * .133, .26 + THREE.MathUtils.clamp((localMuzzle.y - neutralMuzzle.y) * .12, -.026, .026), -.59 + THREE.MathUtils.clamp((localMuzzle.z - neutralMuzzle.z) * .10, -.032, .032));
        wrist.copy(hand).applyMatrix4(inverseUpper);
        glove.position.copy(wrist);
        elbow.set(side * .285, .397, -.37).addScaledVector(wristDelta.set(wrist.x - side * .133, wrist.y - .267, wrist.z + .571), .40);
        sleeve.points[1].set(side * .29, .45, -.33).addScaledVector(wristDelta, .23);
        sleeve.points[2].copy(elbow); sleeve.update();
        forearm.points[0].copy(elbow);
        forearm.points[1].set(side * .22, .28, -.49).addScaledVector(wristDelta, .70);
        forearm.points[2].copy(wrist); forearm.points[2].z += .021; forearm.update();
      }
      for (let index = 0; index < reinData.length; index++) {
        const { side, tube } = reinData[index];
        tube.points[0].copy(armData[index].glove.position).applyMatrix4(upper.matrix).applyMatrix4(mounted.matrix);
        tube.points[2].copy(muzzle); tube.points[2].x += side * .083; tube.points[2].y -= .035; tube.points[2].z -= .018;
        tube.points[1].copy(tube.points[0]).lerp(tube.points[2], .45); tube.points[1].x += side * .025; tube.points[1].y -= .105; tube.points[1].z += .06;
        tube.update();
      }
    }
    const a = mantle.geometry.attributes.position.array;
    // Frozen while paused: wind intensity changes amplitude, not simulation phase.
    for (let i = 0; i < a.length; i += 3) {
      const lower = Math.max(0, (.65 - mantleBase[i + 1]) / .55), edge = Math.abs(mantleBase[i]) / .26;
      a[i] = mantleBase[i] + Math.sin(gaitTime * 3.2 + mantleBase[i] * 15) * lower * .012 * wind;
      a[i + 1] = mantleBase[i + 1] + lower * clothLift + Math.sin(gaitTime * 5 + mantleBase[i] * 10) * lower * edge * .010 * wind;
      a[i + 2] = mantleBase[i + 2] + lower * (clothSweep + (.018 + Math.sin(gaitTime * 4 - lower * 5 + mantleBase[i] * 13) * .021) * wind);
    }
    mantle.geometry.attributes.position.needsUpdate = true; mantle.geometry.computeVertexNormals();
    contact.position.y = .012;
  }
  return {
    group, ready, measurements, update,
    reset() {
      poseDirty = true;
      gaitTime = 0;
      neutralMuzzleSet = false;
      lastBackY = undefined; lastBackPitch = undefined; lastBackVelocity = 0; clothLift = 0; clothSweep = 0;
      mixer?.setTime(0);
      update(0, 0, lastWind, false);
    },
    dispose() {
      alive = false; mixer?.stopAllAction();
      for (const geometry of geometries) geometry.dispose();
      for (const m of materials) m.dispose();
      scene.remove(group);
    }
  };
}
