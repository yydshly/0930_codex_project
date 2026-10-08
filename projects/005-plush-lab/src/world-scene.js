import * as THREE from 'three';

const FLOOR_Y = -1.1;
const TAU = Math.PI * 2;

function seededRandom(value) {
  const text = String(value ?? 1);
  let state = 2166136261;
  for (let i = 0; i < text.length; i++) {
    state = Math.imul(state ^ text.charCodeAt(i), 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function color(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

/** Small, deterministic sets with a clear central area for the plush character. */
export function buildWorldScene(config = {}) {
  const scene = ['room', 'garden', 'gallery'].includes(config.scene) ? config.scene : 'room';
  const lighting = ['day', 'warm', 'moon'].includes(config.lighting) ? config.lighting : 'day';
  const accent = color(config.accentColor, '#b9c4a3');
  const secondary = color(config.secondaryColor, '#e3b7a7');
  const random = seededRandom(config.seed);
  const jitter = (range) => (random() - 0.5) * 2 * range;
  const group = new THREE.Group();
  group.name = `plush-world-${scene}`;
  const interactables = [];
  const motions = [];
  const materials = new Map();
  const palette = {
    cream: '#f0ede4', white: '#faf7ee', wood: '#c3a78c', dark: '#696d61',
    leaf: '#718f66', leafLight: '#94aa78', grass: '#b0c59a', stem: '#718b63',
  };

  function material(tint, options = {}) {
    const key = `${tint}:${JSON.stringify(options)}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshStandardMaterial({
        color: tint, roughness: 0.96, metalness: 0, ...options,
      }));
    }
    return materials.get(key);
  }

  function mesh(parent, geometry, tint, position = [0, 0, 0], options = {}) {
    const item = new THREE.Mesh(geometry, material(tint, options));
    item.position.fromArray(position);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  function box(parent, size, tint, position, options) {
    return mesh(parent, new THREE.BoxGeometry(...size), tint, position, options);
  }

  function ball(parent, radius, tint, position, scale = [1, 1, 1]) {
    const item = mesh(parent, new THREE.SphereGeometry(radius, 24, 16), tint, position);
    item.scale.fromArray(scale);
    return item;
  }

  function cylinder(parent, top, bottom, height, tint, position, segments = 32) {
    return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), tint, position);
  }

  function branch(parent, start, end, radius, tint) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const item = cylinder(parent, radius * 0.82, radius, a.distanceTo(b), tint, a.clone().add(b).multiplyScalar(0.5).toArray(), 12);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return item;
  }

  function part(name, position, parent = group) {
    const item = new THREE.Group();
    item.name = name;
    item.position.fromArray(position);
    parent.add(item);
    return item;
  }

  function clickable(id, label, object) {
    object.userData.worldInteraction = id;
    interactables.push({ id, label, object });
  }

  function sway(object, amplitude, speed, phase = 0, axis = 'z') {
    motions.push({ object, amplitude, speed, phase, axis, base: object.rotation[axis] });
  }

  function leaf(parent, position, tint, size, rotation) {
    const item = ball(parent, size, tint, position, [0.48, 1, 0.15]);
    item.rotation.z = rotation;
    return item;
  }

  function plant(position, size = 1) {
    const pot = part('plant', position);
    pot.scale.setScalar(size);
    cylinder(pot, 0.24, 0.18, 0.32, secondary, [0, 0.16, 0]);
    cylinder(pot, 0.225, 0.225, 0.035, '#827264', [0, 0.326, 0]);
    const foliage = part('plant-leaves', [0, 0.33, 0], pot);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.39996 + random() * 0.24;
      const height = 0.42 + random() * 0.34;
      const end = [Math.cos(angle) * 0.22, height, Math.sin(angle) * 0.22];
      branch(foliage, [0, 0, 0], end, 0.014, palette.stem);
      const blade = leaf(foliage, end, i % 2 ? palette.leaf : palette.leafLight, 0.24, -Math.cos(angle) * 0.65);
      blade.rotation.y = -angle;
    }
    sway(foliage, 0.045, 0.9, random() * TAU);
    return pot;
  }

  function flower(parent, position, tint, height = 0.42, scale = 1) {
    const item = part('flower', position, parent);
    item.scale.setScalar(scale);
    branch(item, [0, 0, 0], [0.035, height, 0], 0.018, palette.stem);
    leaf(item, [0.05, height * 0.42, 0], palette.leaf, 0.12, -0.85);
    const head = part('flower-head', [0.035, height, 0], item);
    head.rotation.x = -0.24;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      ball(head, 0.1, tint, [Math.cos(a) * 0.105, Math.sin(a) * 0.105, 0], [1, 0.9, 0.45]);
    }
    ball(head, 0.065, '#e6ce83', [0, 0, 0.04], [1, 1, 0.48]);
    sway(item, 0.075, 1.05, random() * TAU);
    return item;
  }

  let description;
  let background;

  if (scene === 'room') {
    background = lighting === 'moon' ? '#374851' : '#e7e6dd';
    description = lighting === 'moon' ? '月光暖房：窗边的盆栽轻轻摇晃，矮桌上留着一盏小灯。' : '奶白暖房：窗光、软地毯、矮桌和绿植围出一小块舒适空间。';
    box(group, [6.2, 0.16, 6.2], palette.cream, [0, FLOOR_Y - 0.08, 0]);
    box(group, [6.2, 3.7, 0.12], palette.white, [0, FLOOR_Y + 1.85, -3.05]);
    box(group, [0.12, 3.7, 6.2], '#e7e5dc', [-3.05, FLOOR_Y + 1.85, 0]);
    box(group, [6.05, 0.1, 0.045], '#d5d4c9', [0, FLOOR_Y + 0.05, -2.972]);
    box(group, [0.045, 0.1, 6.05], '#d5d4c9', [-2.972, FLOOR_Y + 0.05, 0]);
    for (let i = 0; i < 9; i++) {
      box(group, [0.006, 0.002, 6], '#e1dfd5', [-2.7 + i * 0.67, FLOOR_Y + 0.002, 0]);
    }
    const rug = cylinder(group, 1.5, 1.5, 0.024, accent, [0, FLOOR_Y + 0.012, 0.12], 72);
    rug.scale.z = 0.82;
    const border = mesh(group, new THREE.TorusGeometry(1.45, 0.012, 6, 80), '#d8decc', [0, FLOOR_Y + 0.026, 0.12]);
    border.rotation.x = -Math.PI / 2;
    border.scale.y = 0.82;

    const window = part('window', [-0.45 + jitter(0.12), 0.68, -2.97]);
    box(window, [2.28, 1.55, 0.025], lighting === 'moon' ? '#9bbcca' : '#c5d6d0', [0, 0, 0.023], { emissive: lighting === 'moon' ? '#223f50' : '#64796b', emissiveIntensity: 0.13 });
    for (const x of [-1.2, 0, 1.2]) box(window, [0.065, 1.7, 0.1], palette.white, [x, 0, 0.055]);
    for (const y of [-0.82, 0, 0.82]) box(window, [2.46, 0.065, 0.1], palette.white, [0, y, 0.055]);
    box(window, [2.65, 0.09, 0.28], '#ddd8ca', [0, -0.89, 0.12]);
    for (const x of [-1.39, 1.39]) {
      const curtain = box(window, [0.27, 1.8, 0.065], '#deded0', [x, 0.05, 0.09]);
      for (let i = 0; i < 3; i++) box(curtain, [0.035, 1.79, 0.025], '#e8e7dc', [-0.08 + i * 0.08, 0, 0.04]);
    }
    const patchColor = lighting === 'moon' ? '#bed8df' : '#fff1c9';
    const patch = part('window-light', [0.9, FLOOR_Y + 0.007, -1.12]);
    patch.rotation.y = -0.27;
    for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) {
      const pane = box(patch, [0.7, 0.004, 0.83], patchColor, [(x - 0.5) * 0.76, 0, (z - 0.5) * 0.91], { transparent: true, opacity: lighting === 'moon' ? 0.18 : 0.35, depthWrite: false });
      pane.castShadow = false;
    }

    const table = part('low-table', [-2.06 + jitter(0.1), FLOOR_Y, -0.05 + jitter(0.16)]);
    const top = cylinder(table, 0.56, 0.56, 0.075, palette.wood, [0, 0.59, 0], 48);
    top.scale.z = 0.9;
    for (const [x, z] of [[-0.33, -0.25], [0.33, -0.25], [0, 0.29]]) {
      branch(table, [x * 1.12, 0.03, z * 1.12], [x, 0.57, z], 0.045, '#b1957b');
    }
    const cup = part('cup', [0.2, 0.64, 0.12], table);
    cylinder(cup, 0.095, 0.074, 0.15, palette.white, [0, 0.075, 0]);
    cylinder(cup, 0.076, 0.076, 0.006, '#99816b', [0, 0.153, 0]);
    const handle = mesh(cup, new THREE.TorusGeometry(0.065, 0.018, 8, 20), palette.white, [0.093, 0.083, 0]);
    handle.rotation.y = Math.PI / 2;
    const lamp = part('lamp', [-0.22, 0.64, -0.08], table);
    cylinder(lamp, 0.14, 0.16, 0.035, palette.dark, [0, 0.018, 0]);
    cylinder(lamp, 0.018, 0.018, 0.39, palette.dark, [0, 0.21, 0], 12);
    cylinder(lamp, 0.11, 0.23, 0.23, secondary, [0, 0.44, 0]);
    const lampGlow = ball(lamp, 0.078, '#fff0c8', [0, 0.36, 0], [1, 0.5, 1]);
    lampGlow.material = material('#fff0c8', { emissive: '#ffcc72', emissiveIntensity: lighting === 'day' ? 0.1 : 0.55 });
    clickable('lamp', '桌上的小灯', lamp);
    const roomPlant = plant([2.12 + jitter(0.1), FLOOR_Y, -1.48 + jitter(0.12)], 1.2);
    clickable('plant', '窗边绿植', roomPlant);
    const cushion = ball(group, 0.4, secondary, [-1.7 + jitter(0.09), FLOOR_Y + 0.17, -1.55 + jitter(0.08)], [1, 0.4, 0.92]);
    cushion.rotation.y = -0.28;
    const smallCushion = ball(group, 0.33, '#d8d7c9', [-2.12, FLOOR_Y + 0.14, -1.75], [1, 0.4, 0.88]);
    smallCushion.rotation.y = 0.22;
  } else if (scene === 'garden') {
    background = lighting === 'moon' ? '#344b54' : '#dce7db';
    description = lighting === 'moon' ? '月色花园：圆草坪、石子小径和安静的小蘑菇，花朵随风轻摆。' : '口袋花园：一圈柔软草地，树荫、花朵和石子小径陪着小伙伴。';
    cylinder(group, 3.05, 2.92, 0.25, '#8fa881', [0, FLOOR_Y - 0.125, 0], 80);
    cylinder(group, 3.015, 3.015, 0.035, palette.grass, [0, FLOOR_Y - 0.008, 0], 80);
    const clearing = cylinder(group, 1.4, 1.4, 0.008, '#bacba2', [0, FLOOR_Y + 0.014, 0.03], 64);
    clearing.scale.z = 0.87;
    const tree = part('garden-tree', [-1.91 + jitter(0.08), FLOOR_Y, -1.68 + jitter(0.08)]);
    branch(tree, [0, 0, 0], [0.06, 1.35, 0], 0.105, '#a0876d');
    branch(tree, [0.03, 0.75, 0], [-0.4, 1.42, 0.05], 0.044, '#a0876d');
    branch(tree, [0.045, 1, 0], [0.42, 1.51, -0.08], 0.041, '#a0876d');
    const crown = part('tree-crown', [0, 1.42, 0], tree);
    ball(crown, 0.65, '#9aaf81', [0, 0.17, 0], [1, 1.06, 0.85]);
    ball(crown, 0.46, '#a6bb8e', [-0.4, 0.02, 0.08], [1, 1.03, 0.9]);
    ball(crown, 0.46, '#8fa774', [0.4, 0.03, -0.05], [1, 1, 0.9]);
    sway(crown, 0.025, 0.7, random() * TAU);
    for (let i = 0; i < 8; i++) {
      const z = 2.42 - i * 0.55;
      const x = -1.72 + Math.sin(i * 0.55) * 0.13;
      const stone = ball(group, 0.21 + random() * 0.065, i % 2 ? '#d4d4bf' : '#e0ddce', [x, FLOOR_Y + 0.045, z], [1.16, 0.18, 0.8]);
      stone.rotation.y = random() * TAU;
    }
    const flowerbed = part('flowerbed', [1.98 + jitter(0.09), FLOOR_Y + 0.02, -0.98 + jitter(0.15)]);
    const flowerColors = [accent, secondary, '#f5e3b8'];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39996;
      const r = i === 0 ? 0 : 0.19 + random() * 0.31;
      flower(flowerbed, [Math.cos(a) * r, 0, Math.sin(a) * r], flowerColors[i % 3], 0.32 + random() * 0.2, 0.82 + random() * 0.2);
    }
    clickable('flower', '会摇摆的花丛', flowerbed);
    const mushrooms = part('mushrooms', [2.05, FLOOR_Y, 1.12]);
    for (let i = 0; i < 3; i++) {
      const size = i === 0 ? 1 : 0.58 + random() * 0.12;
      const mushroom = part('mushroom', [i === 0 ? 0 : (i === 1 ? -0.24 : 0.26), 0, i === 0 ? 0 : 0.12], mushrooms);
      mushroom.scale.setScalar(size);
      cylinder(mushroom, 0.055, 0.075, 0.23, '#ede9d4', [0, 0.115, 0], 16);
      ball(mushroom, 0.19, secondary, [0, 0.245, 0], [1, 0.52, 1]);
      for (let j = 0; j < 4; j++) {
        const a = j * TAU / 4 + 0.2;
        ball(mushroom, 0.023, '#f6efdf', [Math.cos(a) * 0.1, 0.321, Math.sin(a) * 0.1], [1, 0.3, 1]);
      }
    }
    clickable('mushroom', '三只小蘑菇', mushrooms);
    for (let i = 0; i < 28; i++) {
      const a = random() * TAU;
      const r = 2.58 + random() * 0.3;
      const tuft = part('grass-tuft', [Math.cos(a) * r, FLOOR_Y + 0.015, Math.sin(a) * r]);
      for (let j = 0; j < 3; j++) {
        const blade = mesh(tuft, new THREE.ConeGeometry(0.028, 0.15 + random() * 0.12, 3), i % 2 ? '#99b581' : '#a2ba89', [(j - 1) * 0.035, 0.09, 0]);
        blade.rotation.z = (j - 1) * 0.24;
      }
      tuft.rotation.y = a;
    }
  } else {
    background = lighting === 'moon' ? '#3c4651' : '#e4e4df';
    description = '柔软展厅：小伙伴站在圆形展台上，背后是拱门，两侧摆着可触碰的小雕塑。';
    box(group, [6.2, 0.14, 6.2], '#e8e7df', [0, FLOOR_Y - 0.26, 0]);
    box(group, [6.2, 3.6, 0.12], '#f0eee7', [0, FLOOR_Y + 1.48, -3.05]);
    cylinder(group, 1.35, 1.35, 0.2, '#f5f2e8', [0, FLOOR_Y - 0.1, 0], 72);
    cylinder(group, 1.355, 1.355, 0.025, accent, [0, FLOOR_Y - 0.182, 0], 72);
    const arch = mesh(group, new THREE.TorusGeometry(1.75, 0.16, 16, 64, Math.PI), accent, [0, FLOOR_Y - 0.17, -2]);
    arch.castShadow = true;
    for (const x of [-1.75, 1.75]) cylinder(group, 0.23, 0.26, 0.14, '#dadbd1', [x, FLOOR_Y - 0.16, -2], 32);
    const plinth = part('orb-plinth', [2.12 + jitter(0.09), FLOOR_Y - 0.19, -0.75 + jitter(0.15)]);
    cylinder(plinth, 0.36, 0.38, 0.5, '#d9dad2', [0, 0.25, 0]);
    cylinder(plinth, 0.39, 0.39, 0.045, palette.white, [0, 0.523, 0]);
    const orb = part('orb', [0, 0.89, 0], plinth);
    ball(orb, 0.34, secondary, [0, 0, 0]);
    const orbit = mesh(orb, new THREE.TorusGeometry(0.42, 0.027, 8, 48), '#999e90', [0, 0, 0]);
    orbit.rotation.x = 0.62;
    orbit.rotation.y = -0.3;
    sway(orb, 0.05, 0.65, random() * TAU, 'y');
    clickable('orb', '圆球雕塑', orb);
    const sculpture = part('sculpture', [-2.16 + jitter(0.09), FLOOR_Y - 0.19, -0.55 + jitter(0.15)]);
    cylinder(sculpture, 0.36, 0.4, 0.17, '#d9dad2', [0, 0.085, 0]);
    const lower = ball(sculpture, 0.3, secondary, [0, 0.35, 0], [1, 0.62, 1]);
    lower.rotation.z = 0.15;
    const upper = ball(sculpture, 0.24, accent, [0.025, 0.67, 0], [0.85, 1.3, 0.85]);
    upper.rotation.z = -0.2;
    ball(sculpture, 0.105, '#f6e5bb', [0.065, 1.055, 0]);
    clickable('sculpture', '叠石雕塑', sculpture);
    // Two small wall cards face the viewer, with geometric marks rather than text.
    for (const x of [-2.28, 2.28]) {
      const card = part('exhibit-card', [x, 0.46, -2.967]);
      box(card, [0.46, 0.56, 0.025], palette.white, [0, 0, 0]);
      const mark = mesh(card, new THREE.CircleGeometry(0.105, 24), x < 0 ? secondary : accent, [0, 0.055, 0.014]);
      mark.castShadow = false;
      box(card, [0.24, 0.012, 0.005], '#bfc3b7', [0, -0.15, 0.017]);
      box(card, [0.17, 0.01, 0.005], '#d4d7cd', [0, -0.192, 0.017]);
    }
  }

  group.updateMatrixWorld(true);
  return {
    group,
    floorY: FLOOR_Y,
    target: new THREE.Vector3(0, 0, 0),
    background,
    description,
    interactables,
    update(t, dt) {
      const time = Number.isFinite(t) ? t : 0;
      for (const motion of motions) {
        motion.object.rotation[motion.axis] = motion.base + Math.sin(time * motion.speed + motion.phase) * motion.amplitude;
      }
    },
  };
}
