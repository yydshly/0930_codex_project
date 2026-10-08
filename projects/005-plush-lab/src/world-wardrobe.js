import * as THREE from 'three';

// Static, matte dress-up geometry. Cloth follows the resting body surface;
// it does not simulate fabric, yarn contact, or motion-dependent draping.
const TAU = Math.PI * 2;
const CLOTH_OFFSET = .13;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const color = (value, fallback) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
const vector = value => value?.isVector3 ? value.clone() : new THREE.Vector3(...value);

function roundedRectangle(width, height, radius) {
  const x = -width / 2, y = -height / 2, shape = new THREE.Shape();
  shape.moveTo(x + radius, y);shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

/** bounds.width/depth are full dimensions; all geometry uses body-local units. */
export function buildWardrobe(config = {}, {surface, normalAt, bounds = {}} = {}) {
  if (typeof surface !== 'function') throw new TypeError('Wardrobe needs a resting body surface');
  const group = new THREE.Group();group.name = 'world-wardrobe';
  const shape = config.shape, eared = shape === 'bunny' || shape === 'bear' || shape === 5 || shape === 6;
  const bunny = shape === 'bunny' || shape === 5;
  const width = clamp(finite(bounds.width, 2), .8, 3.4), depth = clamp(finite(bounds.depth, 1.5), .6, 2.8);
  const top = clamp(finite(bounds.top, 1.12), .6, 2), bottom = clamp(finite(bounds.bottom, -1.08), -1.8, -.5);
  const accent = color(config.accentColor, '#a77b68'), secondary = color(config.secondaryColor, '#eee0c7');
  const material = (shade, extras = {}) => new THREE.MeshStandardMaterial({color: shade, roughness: .96, metalness: 0, side: THREE.DoubleSide, ...extras});
  const cloth = material(accent), edge = material(secondary), yarn = material(new THREE.Color(accent).lerp(new THREE.Color(secondary), .23));
  const dark = material(new THREE.Color(accent).lerp(new THREE.Color('#343c39'), .8), {roughness: .8});
  const mesh = (geometry, mat = cloth, name = 'wardrobe-piece', parent = group) => {
    const object = new THREE.Mesh(geometry, mat);object.name = name;object.castShadow = object.receiveShadow = true;parent.add(object);return object;
  };
  const rawPoint = (theta, phi) => vector(surface(clamp(theta, 0, Math.PI), phi));
  const normal = (theta, phi) => {
    if (typeof normalAt === 'function') {
      const supplied = vector(normalAt(theta, phi));
      if (supplied.lengthSq() > 1e-12 && [supplied.x, supplied.y, supplied.z].every(Number.isFinite)) return supplied.normalize();
    }
    const epsilon = .002;
    const latitude = rawPoint(theta + epsilon, phi).sub(rawPoint(theta - epsilon, phi));
    const longitude = rawPoint(theta, phi + epsilon).sub(rawPoint(theta, phi - epsilon));
    const result = latitude.cross(longitude);
    return result.lengthSq() > 1e-12 ? result.normalize() : rawPoint(theta, phi).normalize();
  };
  const point = (theta, phi, offset = CLOTH_OFFSET) => rawPoint(theta, phi).addScaledVector(normal(theta, phi), offset);
  // Search the first downward crossing. Ear caps and star lobes can make y
  // non-monotonic near the poles, so one global binary search is insufficient.
  const thetaAtY = (y, phi) => {
    let previous = 0;
    if (rawPoint(previous, phi).y <= y) return previous;
    for (let step = 1; step <= 32; step++) {
      const current = step * Math.PI / 32;
      if (rawPoint(current, phi).y <= y) {
        let lower = previous, upper = current;
        for (let iteration = 0; iteration < 14; iteration++) {
          const middle = (lower + upper) / 2;
          if (rawPoint(middle, phi).y > y) lower = middle;else upper = middle;
        }
        return (lower + upper) / 2;
      }
      previous = current;
    }
    return Math.PI;
  };
  const frontPoint = (x, y, offset = .15) => {
    let lower = -Math.PI / 2, upper = Math.PI / 2;
    for (let iteration = 0; iteration < 20; iteration++) {
      const phi = (lower + upper) / 2;
      if (rawPoint(thetaAtY(y, phi), phi).x < x) lower = phi;else upper = phi;
    }
    const phi = (lower + upper) / 2, theta = thetaAtY(y, phi), result = rawPoint(theta, phi);
    result.z += offset;return result;
  };
  const curve = (points, radius, mat = edge, closed = false, name = 'cloth-piping') => {
    if (points.length < 2) return null;
    const path = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
    return mesh(new THREE.TubeGeometry(path, Math.max(12, points.length * 2), radius, 6, closed), mat, name);
  };
  const patch = (sample, rows, columns, mat = cloth, name = 'fitted-cloth') => {
    const positions = [], uv = [], indices = [];
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const p = sample(row / rows, column / columns);positions.push(p.x, p.y, p.z);uv.push(column / columns, row / rows);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));geometry.setIndex(indices);geometry.computeVertexNormals();
    return mesh(geometry, mat, name);
  };
  const clothSample = (topY, hemTheta, phiFrom, phiTo, folds = 0, offset = CLOTH_OFFSET) => (t, u) => {
    const phi = THREE.MathUtils.lerp(phiFrom, phiTo, u), start = thetaAtY(topY, phi);
    const theta = THREE.MathUtils.lerp(start, Math.max(start + .08, hemTheta), t);
    const p = point(theta, phi, offset + folds * Math.sin(phi * 8) * Math.sin(Math.PI * t));
    p.y = Math.min(p.y, -.305);return p;
  };
  const edgePoints = (sample, t, count = 48) => Array.from({length: count + 1}, (_, i) => sample(t, i / count));
  const sidePoints = (sample, u) => Array.from({length: 18}, (_, i) => sample(i / 17, u));
  const fittedCloth = (topY, hemTheta, phiFrom, phiTo, mat = cloth, folds = 0, name = 'fitted-cloth') => {
    const sample = clothSample(topY, hemTheta, phiFrom, phiTo, folds);
    patch(sample, 14, Math.max(12, Math.ceil((phiTo - phiFrom) * 9)), mat, name);
    const trim = clothSample(topY, hemTheta, phiFrom, phiTo, folds, CLOTH_OFFSET + .017);
    curve(edgePoints(trim, 0), .018, edge, false, `${name}-collar`);
    curve(edgePoints(trim, 1), .02, edge, false, `${name}-hem`);
    return {sample, trim};
  };

  if (config.outfit === 'poncho') {
    const {trim} = fittedCloth(-.33, 2.54, -Math.PI, Math.PI, cloth, .018, 'poncho');
    for (const phi of [-.06, .06]) curve(Array.from({length: 18}, (_, i) => trim(i / 17, (phi + Math.PI) / TAU)), .006, yarn, false, 'poncho-front-seam');
  } else if (config.outfit === 'vest') {
    const left = fittedCloth(-.34, 2.54, -1.42, -.075, cloth, .006, 'vest-left');
    const right = fittedCloth(-.34, 2.54, .075, 1.42, cloth, .006, 'vest-right');
    fittedCloth(-.34, 2.54, 1.42, TAU - 1.42, cloth, .006, 'vest-back');
    curve(sidePoints(left.trim, 1), .019, edge, false, 'vest-left-opening');curve(sidePoints(right.trim, 0), .019, edge, false, 'vest-right-opening');
    for (const y of [-.48, -.64, -.80]) {
      const phi = -.16, theta = thetaAtY(y, phi), position = point(theta, phi, CLOTH_OFFSET + .04);
      const button = mesh(new THREE.SphereGeometry(.027, 14, 10), edge, 'vest-button');button.scale.z = .5;button.position.copy(position);
      button.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal(theta, phi));
    }
  } else if (config.outfit === 'scarf') {
    const collar = (t, u) => {
      const phi = u * TAU, y = THREE.MathUtils.lerp(-.32, -.43, t), p = point(thetaAtY(y, phi), phi, CLOTH_OFFSET + .012);
      p.y = Math.min(p.y, -.305);return p;
    };
    patch(collar, 5, 56, cloth, 'scarf-collar');curve(edgePoints(collar, 0, 56), .025, edge, false, 'scarf-rolled-rim');
    curve(edgePoints(collar, 1, 56), .017, yarn, false, 'scarf-lower-rim');
    for (const [from, to, hem] of [[-.32, -.075, 2.56], [.105, .29, 2.40]]) {
      const {trim} = fittedCloth(-.41, hem, from, to, cloth, .008, 'scarf-tail');
      for (const t of [.72, .83]) curve(edgePoints(trim, t, 12), .01, edge, false, 'scarf-stripe');
      for (let i = 0; i < 7; i++) {
        const p = trim(1, (i + .5) / 7);curve([p, p.clone().add(new THREE.Vector3(.005, -.065, .013))], .008, edge, false, 'scarf-fringe');
      }
    }
  }

  const crownY = eared ? (bunny ? .86 : .85) : clamp(top - .14, .69, 1.06);
  const rim = phi => {
    if (eared) return new THREE.Vector3(Math.sin(phi) * (bunny ? .315 : .405), crownY, Math.cos(phi) * (bunny ? .405 : .465));
    const p = point(thetaAtY(crownY, phi), phi, .115);p.y = crownY;return p;
  };
  const rimPoints = Array.from({length: 48}, (_, i) => rim(i / 48 * TAU));
  const capHeight = eared ? .34 : .41;
  const capPoint = (t, u, extra = 0) => {
    const p = rim(u * TAU), angle = t * Math.PI / 2, r = Math.cos(angle);
    return new THREE.Vector3(p.x * r * (1 + extra), crownY + capHeight * Math.sin(angle), p.z * r * (1 + extra));
  };
  if (config.hat === 'beanie') {
    patch((t, u) => capPoint(t, u), 16, 48, cloth, 'knit-beanie');
    curve(rimPoints, .049, cloth, true, 'beanie-folded-rim');
    const lowerRim = rimPoints.map(p => p.clone().add(new THREE.Vector3(0, -.035, 0)));curve(lowerRim, .032, yarn, true, 'beanie-rim-stitch');
    for (let i = 0; i < 20; i++) curve(Array.from({length: 14}, (_, row) => capPoint(row / 14, i / 20, .015)), .008, yarn, false, 'beanie-knit-rib');
    for (const t of [.28, .48, .67]) curve(Array.from({length: 48}, (_, i) => capPoint(t, i / 48, .011)), .006, yarn, true, 'beanie-knit-row');
    const pom = mesh(new THREE.SphereGeometry(.095, 22, 16), edge, 'beanie-pom');pom.position.set(0, crownY + capHeight + .075, 0);pom.scale.y = .88;
  } else if (config.hat === 'beret') {
    let rx = 0, rz = 0;for (const p of rimPoints) {rx = Math.max(rx, Math.abs(p.x));rz = Math.max(rz, Math.abs(p.z));}
    const hat = mesh(new THREE.SphereGeometry(1, 40, 24), cloth, 'soft-beret');
    hat.scale.set(rx * 1.18, .18, rz * 1.13);hat.position.set(-rx * .12, crownY + .15, 0);hat.rotation.z = -.12;
    curve(rimPoints, .03, yarn, true, 'beret-band');
    const stem = mesh(new THREE.CylinderGeometry(.026, .031, .11, 12), cloth, 'beret-stem');stem.position.set(-rx * .14, crownY + .35, 0);stem.rotation.z = -.15;
    const seam = Array.from({length: 28}, (_, i) => {
      const phi = i / 28 * TAU;return new THREE.Vector3(Math.sin(phi) * rx * .95 - rx * .12, crownY + .265 - Math.sin(phi) * .04, Math.cos(phi) * rz * .90);
    });curve(seam, .006, yarn, true, 'beret-sewn-edge');
  } else if (config.hat === 'bow') {
    const bow = new THREE.Group();bow.name = 'fabric-bow';bow.position.set(0, crownY + .115, Math.min(.35, depth * .22));group.add(bow);
    const outline = new THREE.Shape();outline.moveTo(.025, -.025);
    outline.bezierCurveTo(.13, -.115, .36, -.22, .355, 0);outline.bezierCurveTo(.36, .22, .13, .115, .025, .025);outline.closePath();
    for (const sign of [-1, 1]) {
      const wing = mesh(new THREE.ExtrudeGeometry(outline, {depth: .065, bevelEnabled: true, bevelThickness: .022, bevelSize: .02, bevelSegments: 3, steps: 1, curveSegments: 18}), cloth, 'bow-wing', bow);
      wing.scale.x = sign;wing.rotation.z = sign * -.07;
      const crease = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sign * .06, 0, .088), new THREE.Vector3(sign * .17, sign * -.02, .095), new THREE.Vector3(sign * .29, 0, .084)]), 12, .009, 6, false), yarn, 'bow-fold', bow);
      crease.castShadow = true;
    }
    const knot = mesh(new THREE.SphereGeometry(1, 20, 14), edge, 'bow-knot', bow);knot.scale.set(.075, .092, .075);knot.position.z = .035;
  }

  if (config.accessory === 'glasses') {
    for (const sign of [-1, 1]) {
      const points = Array.from({length: 44}, (_, i) => {
        const angle = i / 44 * TAU;return frontPoint(sign * .30 + .22 * Math.cos(angle), .24 + .22 * Math.sin(angle), .15);
      });curve(points, .022, dark, true, 'glasses-frame');
      const sidePhi = sign * Math.PI / 2, side = point(thetaAtY(.24, sidePhi), sidePhi, .115);
      const outer = frontPoint(sign * .52, .24, .15);
      const back = side.clone();back.z = -.13;back.y -= .045;
      curve([outer, outer.clone().lerp(side, .6).add(new THREE.Vector3(0, .015, .025)), side, back], .014, dark, false, 'glasses-temple');
    }
    curve([frontPoint(-.08, .24, .15), frontPoint(0, .265, .16), frontPoint(.08, .24, .15)], .018, dark, false, 'glasses-bridge');
  } else if (config.accessory === 'satchel') {
    const bagX = width * .36 + .11, bagY = Math.max(-.70, bottom + .30);
    const near = frontPoint(Math.min(bagX, width * .39), bagY, .18);
    const bag = new THREE.Group();bag.name = 'side-satchel';bag.position.set(bagX, bagY, near.z - .025);bag.rotation.z = -.09;group.add(bag);
    mesh(new THREE.ExtrudeGeometry(roundedRectangle(.41, .34, .055), {depth: .105, bevelEnabled: true, bevelThickness: .026, bevelSize: .023, bevelSegments: 3, curveSegments: 12}), cloth, 'satchel-body', bag);
    const flap = mesh(new THREE.ExtrudeGeometry(roundedRectangle(.39, .19, .045), {depth: .015, bevelEnabled: true, bevelThickness: .01, bevelSize: .012, bevelSegments: 2, curveSegments: 10}), edge, 'satchel-flap', bag);flap.position.set(0, .065, .13);
    const clasp = mesh(new THREE.SphereGeometry(.026, 14, 10), dark, 'satchel-clasp', bag);clasp.position.set(0, -.005, .17);clasp.scale.z = .4;
    const strapPoints = Array.from({length: 22}, (_, i) => {
      const t = i / 21, x = THREE.MathUtils.lerp(-width * .34, bagX - .09, t), y = THREE.MathUtils.lerp(-.34, bagY + .135, t);
      const p = frontPoint(x, y, CLOTH_OFFSET + .064);if (t > .84) p.lerp(new THREE.Vector3(bagX - .09, bagY + .135, bag.position.z + .09), (t - .84) / .16);return p;
    });
    patch((t, u) => {
      const index = Math.min(strapPoints.length - 2, Math.floor(t * (strapPoints.length - 1))), blend = t * (strapPoints.length - 1) - index;
      const p = strapPoints[index].clone().lerp(strapPoints[index + 1], blend), tangent = strapPoints[index + 1].clone().sub(strapPoints[index]).normalize();
      const across = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();return p.addScaledVector(across, (u - .5) * .074);
    }, 32, 2, yarn, 'satchel-diagonal-strap');
    curve(strapPoints, .006, edge, false, 'satchel-strap-stitch');
  }

  // Unused materials have no meshes to traverse when the selection is empty.
  const used = new Set();group.traverse(object => {if (object.isMesh) for (const item of Array.isArray(object.material) ? object.material : [object.material]) used.add(item);});
  for (const item of [cloth, edge, yarn, dark]) if (!used.has(item)) item.dispose();
  group.userData.wardrobe = {hat: config.hat || 'none', outfit: config.outfit || 'none', accessory: config.accessory || 'none', clothOffset: CLOTH_OFFSET, staticCloth: true};
  return group;
}

/** Dispose shared resources once, including standard maps and shader uniforms. */
export function disposeObject(object) {
  if (!object?.traverse) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(child => {
    if (child.geometry) geometries.add(child.geometry);
    const list = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    for (const material of list) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      if (material.uniforms) for (const uniform of Object.values(material.uniforms)) {
        const values = Array.isArray(uniform?.value) ? uniform.value : [uniform?.value];
        for (const value of values) if (value?.isTexture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();for (const geometry of geometries) geometry.dispose();for (const material of materials) material.dispose();
}
