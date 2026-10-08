import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { pondBoundary } from './config.js';
export function seeded(seed = 7) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function mesh(geo, mat, parent, pos = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m); return m;
}
export function box(w, h, d, mat, parent, pos) {
  const geo=mat.name==='cushion'?new RoundedBoxGeometry(w,h,d,3,Math.min(.065,h*.3)):new THREE.BoxGeometry(w,h,d);
  if(mat.map?.name==='wood-albedo.png'){
    const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,offset=(pos?.[2]||0)*.43;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      uv.setXY(i,(Math.abs(n.getX(i))>.5?z:x)*.35+.5,(Math.abs(n.getY(i))>.5?z:y)*.35+.5+offset);
    }
  }
  return mesh(geo,mat,parent,pos);
}
export function beamBetween(a, b, radius, material, group, r2 = radius * 0.8) {
  const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b), dir = pb.clone().sub(pa);
  const m = mesh(new THREE.CylinderGeometry(r2, radius, dir.length(), 7), material, group);
  m.position.copy(pa.add(pb).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); return m;
}
export function rockGeometry(seed = 1, detail = 2) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.075 * Math.sin(x * 13 + y * 4 + seed) * Math.cos(z * 11 - y * 7 + seed * 2)
      + 0.04 * Math.sin(x * 23 + z * 8 + seed);
    p.setXYZ(i, x * n, y * n, z * n); }
  g.computeVertexNormals(); return g;
}
export function pondShape(scale = 1) {
  const shape = new THREE.Shape(); for (let i = 0; i <= 96; i++) { const p = pondBoundary(i / 96 * Math.PI * 2, scale);
    if (i === 0) shape.moveTo(p.x, -p.z); else shape.lineTo(p.x, -p.z); } return shape;
}
export function groundGeometry(scale=1) {
  const shape=new THREE.Shape();shape.moveTo(-11,-10);shape.lineTo(11,-10);shape.lineTo(11,11);shape.lineTo(-11,11);shape.closePath();
  shape.holes.push(new THREE.Path(pondShape(scale).getPoints(96)));
  const geo=new THREE.ShapeGeometry(shape),p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+11)/22,(p.getY(i)+10)/21);
  return geo;
}
export function tileRoof(group, mat, w, d, y = 3.05, h = 1.08) {
  const half = d / 2, slope = Math.atan2(h, half), length = Math.hypot(half, h);
  for (const side of [-1, 1]) {
    const roof = box(w + 0.5, 0.12, length + 0.3, mat.roof, group, [0, y + h / 2, side * half / 2]);
    roof.rotation.x = side * slope;
    const tileGeo = new THREE.CylinderGeometry(0.092, 0.105, 0.33, 8, 1, true, Math.PI/2, Math.PI);
    tileGeo.rotateX(Math.PI / 2); tileGeo.translate(0, 0.028, 0);
    const cols = Math.ceil((w + 0.5) / 0.195), rows = Math.ceil(length / 0.27), tileCount = cols * rows;
    const inst = new THREE.InstancedMesh(tileGeo, mat.roof, tileCount); const dummy = new THREE.Object3D();
    let i = 0;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const along = (row + 0.5) / rows * half;
      dummy.position.set(-w / 2 - 0.2 + col * 0.195, y + h * (1 - along / half) + 0.07, side * along);
      dummy.rotation.set(side * slope, 0, 0); dummy.updateMatrix(); inst.setMatrixAt(i++, dummy.matrix);
    }
    inst.castShadow = inst.receiveShadow = true; group.add(inst);
    box(w + 0.7, 0.14, 0.16, mat.timber, group, [0, y - 0.055, side * (half + 0.07)]);
    for (let col = 0; col < cols; col++) {
      const end = mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.055, 10), mat.roofEdge, group,
        [-w / 2 - 0.2 + col * 0.195, y + 0.08, side * (half + 0.05)]); end.rotation.x = Math.PI / 2;
    }
  }
  box(w + 0.8, 0.15, 0.26, mat.roofEdge, group, [0, y + h + 0.09, 0]);
  for (const side of [-1, 1]) for (const x of [-w / 2 - 0.2, w / 2 + 0.2])
    beamBetween([x, y, side * d / 2], [x, y + h, 0], 0.06, mat.roofEdge, group, 0.06);
}
export function createArchitecture(mat) {
  const architecture = new THREE.Group();
  const house = new THREE.Group(); house.position.set(0, 0.05, -6.5); architecture.add(house);
  const w = 14.2, d = 3.1;
  box(w, 0.22, d + 0.7, mat.slab, house, [0, 0.13, 0]);
  box(w, 2.65, 0.16, mat.plaster, house, [0, 1.56, -d / 2]);
  box(0.18, 2.65, d, mat.plaster, house, [-w / 2, 1.56, 0]);
  box(0.18, 2.65, d, mat.plaster, house, [w / 2, 1.56, 0]);
  box(w, 0.32, 0.2, mat.plaster, house, [0, 2.84, d / 2]);
  box(1.4, 2.64, 0.18, mat.plaster, house, [-6.2, 1.56, d / 2]);
  for (let i = 0; i <= 8; i++) {
    const x = -5.35 + i * 1.45;
    box(0.115, 2.65, 0.16, mat.timber, house, [x, 1.56, d / 2 + 0.015]);
    if (i < 8) {
      box(1.33, 2.34, 0.016, mat.glass, house, [x + 0.72, 1.52, d / 2]);
      box(1.38, 0.08, 0.12, mat.timber, house, [x + 0.72, 0.35, d / 2]);
      box(1.38, 0.08, 0.12, mat.timber, house, [x + 0.72, 2.73, d / 2]);
    }
  }
  box(w - 0.2, 0.06, d - 0.2, mat.wood, house, [0, 0.27, 0]);
  box(w - 0.3, 0.12, d, mat.interior, house, [0, 2.82, 0]);
  for (const x of [-3.6, 0.2, 4.2]) {
    box(2.05, 0.25, 0.7, mat.cushion, house, [x, 0.59, -0.85]);
    box(2.05, 0.57, 0.18, mat.cushion, house, [x, 0.94, -1.1]);
    const table = box(0.95, 0.08, 0.7, mat.wood, house, [x + 0.15, 0.58, 0.25]);
    for (const dx of [-0.36, 0.36]) box(0.055, 0.27, 0.5, mat.timber, house, [x + 0.15 + dx, 0.42, 0.25]);
    box(0.28, 0.37, 0.28, mat.lamp, house, [x + 0.5, 2.3, -0.3]);
    beamBetween([x + 0.5, 2.49, -0.3], [x + 0.5, 2.84, -0.3], 0.015, mat.timber, house);
    const l = new THREE.PointLight('#ffc579', 8, 5, 2); l.position.set(x, 1.5, -0.3); house.add(l);
  }
  tileRoof(house, mat, w, d + 1.5, 3.05, 1.04);
  for(const x of [-2.1,2.3]){
    box(1.0,1.55,.32,mat.timber,house,[x,1.05,-1.27]);
    for(let row=0;row<3;row++){
      box(.86,.39,.35,mat.interior,house,[x,.52+row*.45,-1.20]);
      for(let k=0;k<7;k++)box(.075,.25+(k%3)*.025,.13,k%2?mat.roofEdge:mat.cushion,house,[x-.32+k*.1,.48+row*.45,-.995]);
    }
  }
  for(let i=0;i<11;i++)box(.09,.13,d,mat.timber,house,[-6.5+i*1.28,2.72,0]);
  const wing = new THREE.Group(); wing.position.set(7.45, 0.05, -3.2); wing.rotation.y = -Math.PI / 2;
  const ww = 8.7, wd = 3.15; architecture.add(wing);
  box(ww, 0.22, wd + 0.65, mat.slab, wing, [0, 0.13, 0]);
  box(ww, 2.65, 0.18, mat.plaster, wing, [0, 1.56, -wd / 2]);
  box(ww, 0.35, 0.2, mat.plaster, wing, [0, 2.8, wd / 2]);
  box(ww - 0.3, 0.07, wd - 0.2, mat.wood, wing, [0, 0.3, 0]);
  box(0.18, 2.65, wd, mat.plaster, wing, [ww / 2, 1.56, 0]);
  for (let i = 0; i < 7; i++) {
    const x = -ww / 2 + 0.5 + i * 1.25;
    box(0.13, 2.65, 0.14, mat.timber, wing, [x, 1.55, wd / 2]);
    if (i < 6) box(1.12, 2.3, 0.018, mat.glass, wing, [x + 0.625, 1.54, wd / 2]);
  }
  for (const x of [-2.6, 1.3]) {
    box(1.7, 0.27, 0.65, mat.cushion, wing, [x, 0.65, -0.8]);
    box(1.7, 0.5, 0.17, mat.cushion, wing, [x, 0.95, -1.05]);
    box(0.28, 0.45, 0.28, mat.lamp, wing, [x + 0.8, 0.9, -0.6]);
    const light = new THREE.PointLight('#ffcf86', 5, 4, 2); light.position.set(x, 1.5, 0); wing.add(light);
  }
  tileRoof(wing, mat, ww, wd + 1.2, 3.05, 1.0);
  return architecture;
}
export function createDeck(mat) {
  const group = new THREE.Group(); group.position.set(5.55, 0, 0.7);
  box(4.35, 0.22, 3.4, mat.timber, group, [0, 0.45, 0]);
  for (let i = 0; i < 28; i++) box(4.4, 0.075, 0.105, mat.wood, group, [0, 0.595, -1.65 + i * 0.122]);
  for (const x of [-1.7, 1.7]) for (const z of [-1.25, 1.25]) box(0.22, 0.58, 0.22, mat.timber, group, [x, 0.29, z]);
  box(1.72, 0.11, 0.9, mat.wood, group, [0.65, 1.0, 0.3]);
  for (const x of [-0.65, 0.65]) for (const z of [-0.3, 0.3]) box(0.08, 0.35, 0.08, mat.timber, group, [x + 0.65, 0.78, z + 0.3]);
  for (const x of [-0.7, 1.5]) box(0.72, 0.14, 0.7, mat.cushion, group, [x, 0.73, 0.15]);
  const teapot = mesh(new THREE.SphereGeometry(0.095, 16, 10), mat.timber, group, [0.6, 1.17, 0.3]); teapot.scale.y = 0.9;
  beamBetween([0.66, 1.18, 0.3], [0.78, 1.25, 0.3], 0.024, mat.timber, group);
  for (const x of [0.2, 1.0]) mesh(new THREE.CylinderGeometry(0.044, 0.034, 0.044, 12), mat.plaster, group, [x, 1.08, 0.18]);
  return group;
}
export function createBridge(mat) {
  const group = new THREE.Group(); group.position.set(-0.55, 0, -2.45);
  for (let i = 0; i < 35; i++) {
    const x = -2.9 + i * 0.17, y = 0.35 + 0.19 * Math.cos(x / 3 * Math.PI / 2);
    box(0.156, 0.06, 0.67, mat.wood, group, [x, y, 0]);
  }
  for (const z of [-0.35, 0.35]) {
    const pts = [];
    for (let i = 0; i <= 30; i++) { const x = -3 + i * 0.2; pts.push(new THREE.Vector3(x, 0.82 + 0.17 * Math.cos(x / 3 * Math.PI / 2), z)); }
    const rail = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.035, 6, false), mat.timber, group);
    for (const x of [-2.8, -1.35, 0, 1.35, 2.8]) box(0.07, 0.48, 0.07, mat.timber, group, [x, 0.66, z]);
  }
  return group;
}
export function createLantern(mat) {
  const group = new THREE.Group(); group.position.set(3.75, 0, 3.75);group.scale.setScalar(.72);
  const base = mesh(rockGeometry(72), mat.stone, group, [0, 0.12, 0]); base.scale.set(0.48, 0.22, 0.45);
  mesh(new THREE.CylinderGeometry(0.18, 0.27, 0.63, 8), mat.stone, group, [0, 0.53, 0]);
  box(0.63, 0.09, 0.63, mat.stone, group, [0, 0.87, 0]);
  box(0.38, 0.37, 0.38, mat.lamp, group, [0, 1.10, 0]);
  for (const x of [-0.26, 0.26]) for (const z of [-0.26, 0.26]) box(0.085, 0.43, 0.085, mat.stone, group, [x, 1.09, z]);
  mesh(new THREE.ConeGeometry(0.53, 0.3, 4), mat.stone, group, [0, 1.46, 0]).rotation.y = Math.PI / 4;
  mesh(new THREE.SphereGeometry(0.095, 12, 8), mat.stone, group, [0, 1.68, 0]);
  const lamp = new THREE.PointLight('#ffbd67', 7, 3.5, 2); lamp.position.set(0, 1.05, 0); group.add(lamp);
  return group;
}
export function createLandscape(mat) {
  const group = new THREE.Group(), random = seeded(11);
  const floor=mesh(groundGeometry(),mat.gravel,group,[0,-0.035,0]);floor.rotation.x=-Math.PI/2;
  floor.userData.dynamicGeometry=true;
  box(0.22, 2.65, 13.3, mat.plaster, group, [-8.3, 1.30, -1.6]);
  box(17, 2.5, 0.2, mat.plaster, group, [0, 1.2, -8.25]);
  const stones = new THREE.Group(); group.add(stones);
  for (let i = 0; i < 49; i++) {
    const t = (i + (random()-.5)*.32) / 49 * Math.PI * 2, p = pondBoundary(t);
    const stone = mesh(rockGeometry(i), mat.stone, stones, [p.x, 0.15 + random() * 0.08, p.z]);
    stone.scale.set(0.30 + random() * 0.38, 0.14 + random() * 0.29, 0.28 + random() * 0.37);
    stone.rotation.set(random() * 0.5, random() * 6.28, random() * 0.3);
    if (i % 3 === 0) { const m = mesh(rockGeometry(i + 101, 1), mat.moss, stones, [p.x + 0.06, 0.16, p.z + 0.1]); m.scale.set(0.3, 0.11, 0.32); }
  }
  for (let i = 0; i < 10; i++) {
    const z = 7.1 - i * 0.80, x = -1.2 - i*.36 + Math.sin(i * 0.55) * 0.12;
    const slab = mesh(rockGeometry(i + 400), mat.slab, group, [x, 0.032, z]); slab.scale.set(0.6 + random() * 0.12, 0.075, 0.4 + random() * 0.12); slab.rotation.y = random() * 2;
  }
  const waterfallRocks = new THREE.Group(); waterfallRocks.position.set(-4.05, 0, -2.12); group.add(waterfallRocks);
  for (let i = 0; i < 19; i++) {
    const x = (random() - 0.5) * 2, z = (random() - 0.5) * 1.2, y = 0.15 + Math.max(0, -z) * 1.5;
    const stone = mesh(rockGeometry(i + 80), i % 5 === 0 ? mat.moss : mat.stone, waterfallRocks, [x, y, z]);
    stone.scale.set(0.32 + random() * 0.35, 0.35 + random() * 0.3, 0.33 + random() * 0.28);
  }
  const top = mesh(rockGeometry(234), mat.stone, waterfallRocks, [-0.2, 1.0, -0.25]); top.scale.set(0.85, 0.18, 0.6);
  return { group, stones, waterfallRocks, floor };
}
