import * as THREE from 'three';

const TAU = Math.PI * 2;
const TYPES = new Set(['sofa', 'table', 'lamp', 'plant', 'cushion']);
const RADII = { sofa: 1.2, table: .55, lamp: .28, plant: .32, cushion: .4 };
const LABELS = { sofa: '柔软沙发', table: '圆圆小桌', lamp: '暖光落地灯', plant: '盆栽绿植', cushion: '软软坐垫' };
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const color = (value, fallback) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;

// Project a subdivided box onto a rounded cuboid. Its normals stay continuous
// across the original box faces, so soft furniture needs no imported assets.
function roundedBox(width, height, depth, radius) {
  const r = Math.min(radius, width / 2, height / 2, depth / 2);
  const geometry = new THREE.BoxGeometry(width, height, depth, 8, 8, 8);
  const positions = geometry.attributes.position, normals = geometry.attributes.normal;
  const inner = new THREE.Vector3(width / 2 - r, height / 2 - r, depth / 2 - r);
  const point = new THREE.Vector3(), core = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    core.set(
      THREE.MathUtils.clamp(point.x, -inner.x, inner.x),
      THREE.MathUtils.clamp(point.y, -inner.y, inner.y),
      THREE.MathUtils.clamp(point.z, -inner.z, inner.z),
    );
    normal.copy(point).sub(core).normalize();
    point.copy(core).addScaledVector(normal, r);
    positions.setXYZ(i, point.x, point.y, point.z);
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Added furniture lives alongside the existing procedural scenery. Coordinates
 * are world x/z units, rotation is a Y-axis angle, and local +z is the front.
 * The caller owns placement validation and can dispose the group with
 * world-wardrobe.disposeObject(). No live lights or external assets are added.
 */
export function buildFurniture(items = [], { floorY = -1.1, accentColor, secondaryColor } = {}) {
  const group = new THREE.Group();
  group.name = 'world-placed-furniture';
  const interactables = [], obstacles = [], seats = [];
  const accent = color(accentColor, '#8b9f7c'), secondary = color(secondaryColor, '#e5d8c3');
  const materials = new Map();
  const ground = finite(floorY, -1.1);
  const shade = (tint, options = {}) => {
    const key = `${tint}:${JSON.stringify(options)}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color: tint, roughness: .94, metalness: 0, ...options,
    }));
    return materials.get(key);
  };
  const mesh = (parent, geometry, tint, position, name, options) => {
    const object = new THREE.Mesh(geometry, shade(tint, options));
    object.name = name;
    object.position.fromArray(position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const softBox = (parent, dimensions, tint, position, radius, name) => mesh(parent, roundedBox(...dimensions, radius), tint, position, name);
  const cylinder = (parent, top, bottom, height, tint, position, name, options) => mesh(parent, new THREE.CylinderGeometry(top, bottom, height, 32), tint, position, name, options);
  const ball = (parent, tint, position, scale, name) => {
    const object = mesh(parent, new THREE.SphereGeometry(1, 24, 16), tint, position, name);
    object.scale.fromArray(scale);
    return object;
  };
  const branch = (parent, start, end, radius, tint, name) => {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const object = cylinder(parent, radius, radius * 1.08, a.distanceTo(b), tint, a.clone().add(b).multiplyScalar(.5).toArray(), name);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  };
  const uniqueIds = new Set();

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !TYPES.has(item.type) || typeof item.id !== 'string' || !item.id || uniqueIds.has(item.id)) continue;
    uniqueIds.add(item.id);
    const object = new THREE.Group();
    object.name = `placed-${item.type}-${item.id}`;
    object.position.set(finite(item.x, 0), ground, finite(item.z, 0));
    object.rotation.y = finite(item.rotation, 0);
    object.userData.placedItemId = item.id;
    object.userData.furnitureType = item.type;
    group.add(object);
    const tint = color(item.color, item.type === 'cushion' ? secondary : accent);
    const seam = new THREE.Color(tint).lerp(new THREE.Color('#f5eee1'), .34).getStyle();

    if (item.type === 'sofa') {
      for (const x of [-.84, .84]) for (const z of [-.31, .31]) {
        cylinder(object, .045, .055, .19, '#ab9177', [x, .095, z], 'sofa-wood-leg');
      }
      softBox(object, [2.1, .25, .95], tint, [0, .315, 0], .095, 'sofa-base');
      softBox(object, [1.79, .17, .76], secondary, [0, .475, .045], .07, 'sofa-seat');
      const back = softBox(object, [2.04, .63, .21], tint, [0, .735, -.36], .085, 'sofa-back');
      back.rotation.x = -.045;
      for (const sign of [-1, 1]) {
        softBox(object, [.27, .51, .92], tint, [sign * .965, .535, .015], .11, 'sofa-armrest');
        const pillow = softBox(object, [.34, .34, .16], sign === -1 ? secondary : seam, [sign * .7, .76, -.19], .065, 'sofa-pillow');
        pillow.rotation.set(-.13, 0, sign * -.12);
      }
      // A thin sewn edge adds structure without noisy highlights or animation.
      softBox(object, [1.70, .015, .018], seam, [0, .45, .432], .007, 'sofa-seat-seam');
      const rotated = z => [object.position.x + Math.sin(object.rotation.y) * z, object.position.z + Math.cos(object.rotation.y) * z];
      const seat = rotated(.08), approach = rotated(.95);
      seats.push({ id: item.id, position: [seat[0], ground + .55, seat[1]], approach, yaw: object.rotation.y });
    } else if (item.type === 'table') {
      cylinder(object, .48, .48, .075, '#c3a58a', [0, .575, 0], 'table-top');
      cylinder(object, .485, .485, .018, '#d0b69c', [0, .616, 0], 'table-soft-rim');
      for (let i = 0; i < 3; i++) {
        const angle = i * TAU / 3 + .25;
        branch(object, [Math.sin(angle) * .32, .035, Math.cos(angle) * .32], [Math.sin(angle) * .26, .54, Math.cos(angle) * .26], .038, '#aa8e72', 'table-leg');
      }
      cylinder(object, .084, .064, .12, '#f7f0e2', [.15, .688, .08], 'table-cup');
      cylinder(object, .067, .067, .007, '#937862', [.15, .752, .08], 'table-tea');
      const handle = mesh(object, new THREE.TorusGeometry(.046, .012, 8, 20), '#f7f0e2', [.23, .692, .08], 'table-cup-handle');
      handle.rotation.y = Math.PI / 2;
    } else if (item.type === 'lamp') {
      cylinder(object, .21, .23, .065, '#69715f', [0, .033, 0], 'lamp-base');
      cylinder(object, .018, .018, 1.02, '#a68d73', [0, .575, 0], 'lamp-stem');
      cylinder(object, .15, .26, .31, tint, [0, 1.15, 0], 'lamp-shade');
      cylinder(object, .264, .264, .018, secondary, [0, 1.001, 0], 'lamp-shade-piping');
      ball(object, '#fff2ce', [0, 1.025, 0], [.09, .055, .09], 'lamp-bulb');
    } else if (item.type === 'plant') {
      cylinder(object, .185, .145, .28, tint, [0, .14, 0], 'plant-pot');
      cylinder(object, .19, .19, .035, seam, [0, .284, 0], 'plant-pot-rim');
      cylinder(object, .163, .163, .008, '#89765f', [0, .301, 0], 'plant-soil');
      for (let i = 0; i < 5; i++) {
        const angle = i * 2.399963;
        const tip = [Math.sin(angle) * .15, .48 + (i % 3) * .085, Math.cos(angle) * .15];
        branch(object, [0, .3, 0], tip, .012, '#718865', 'plant-stem');
        const leaf = ball(object, i % 2 ? '#91aa7d' : '#728d64', tip, [.082, .175, .028], 'plant-leaf');
        leaf.rotation.set(Math.cos(angle) * -.5, angle, Math.sin(angle) * -.5);
      }
    } else {
      const cushion = softBox(object, [.69, .23, .62], tint, [0, .14, 0], .105, 'floor-cushion');
      cushion.rotation.y = .04;
      for (const x of [-.16, .16]) for (const z of [-.13, .13]) ball(object, seam, [x, .253, z], [.021, .004, .021], 'cushion-tuft');
    }

    object.traverse(part => { part.userData.placedItemId = item.id; });
    object.userData.worldInteraction = `furniture-${item.id}`;
    interactables.push({ id: `furniture-${item.id}`, label: LABELS[item.type], object, action: item.type === 'sofa' ? 'sit' : 'inspect', itemId: item.id });
    obstacles.push({ id: item.id, x: object.position.x, z: object.position.z, radius: RADII[item.type] });
  }
  group.updateMatrixWorld(true);
  return { group, interactables, obstacles, seats };
}
