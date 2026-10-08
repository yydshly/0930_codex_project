/*! Adapted from Koi Pond Garden, © 2026 Sourany Phomhome, MIT.
 * Upstream commit 18213ec590e987f605cce6564471e6c0f9451d37.
 * License: web/upstream/KOI-LICENSE.txt. */
import * as THREE from 'three';
import {SDFK,surfaceNets,clamp,lerp,smoothstep} from './sdf.js';
const physical=params=>new THREE.MeshPhysicalMaterial(params);
function createLinen(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#324052';x.fillRect(0,0,128,128);
 for(let i=0;i<128;i+=2){x.strokeStyle=i%4?'#344759':'#405162';x.lineWidth=1;x.beginPath();x.moveTo(i,0);x.lineTo(i,128);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(128,i);x.stroke();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function createHandRig() {
  const linen=createLinen();
  const joints = [];
  const skin = physical({vertexColors:true,roughness:.52,sheen:.22,sheenColor:new THREE.Color('#ffc7ae'),clearcoat:.05});
  const nailMat = physical({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.25, clearcoat: 0.85, clearcoatRoughness: 0.15, sheen: 0.3, sheenColor: new THREE.Color(0xffe0d8) }, { key: 'skinnail' });
  const sleeveMat = physical({ map: linen, bumpMap: linen, bumpScale: .0002, roughness: 0.88, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x8aa0c8), side: THREE.DoubleSide }, { key: 'sleeve' });
  linen.repeat.set(5, 2); linen.repeat.set(5, 2);
  // ---- rig (rest pose)
  const X = new THREE.Vector3(1, 0, 0), rootBone = new THREE.Bone(), palmBone = new THREE.Bone(), bones = [rootBone, palmBone], segs = [];
  rootBone.add(palmBone);                        // wrist: the palm flexes on the forearm
  const FING = [['index', [0.081, 0.004, 0.03], 0.07, [0.043, 0.026, 0.021], [0.0088, 0.0081, 0.0074, 0.0066]],
    ['middle', [0.085, 0.004, 0.009], 0.0, [0.047, 0.029, 0.022], [0.0092, 0.0085, 0.0077, 0.0068]],
    ['ring', [0.081, 0.003, -0.012], -0.06, [0.044, 0.027, 0.021], [0.0085, 0.0079, 0.0072, 0.0064]],
    ['pinky', [0.073, 0.001, -0.031], -0.14, [0.034, 0.021, 0.018], [0.0074, 0.0068, 0.0062, 0.0056]]];
  const REST = [0.12, 0.16, 0.1];
  const J = {}, tips = {};
  const chain = (name, base, restQ, L, R) => {
    const b0 = new THREE.Bone(); b0.position.fromArray(base); b0.quaternion.copy(restQ); palmBone.add(b0);
    const b1 = new THREE.Bone(); b1.position.set(L[0], 0, 0); b0.add(b1);
    const b2 = new THREE.Bone(); b2.position.set(L[1], 0, 0); b1.add(b2);
    const tip = new THREE.Object3D(); tip.position.set(L[2], 0, 0); b2.add(tip);
    bones.push(b0, b1, b2); J[name] = [b0, b1, b2]; tips[name] = tip;
    return [b0, b1, b2];
  };
  for (const [name, base, splay, L, R] of FING) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, splay, -REST[0], 'YZX'));
    const [b0, b1, b2] = chain(name, base, q, L, R);
    b1.rotation.z = -REST[1]; b2.rotation.z = -REST[2];
    b0.userData = { restQ: q.clone(), L, R }; b1.userData = { L, R }; b2.userData = { L, R };
  }
  const tq = new THREE.Quaternion().setFromUnitVectors(X, new THREE.Vector3(0.62, -0.32, 0.72).normalize());
  const thumb = chain('thumb', [0.006, -0.009, 0.027], tq, [0.042, 0.032, 0.027], [0.0128, 0.011, 0.0098, 0.0088]);
  thumb[0].userData = { restQ: tq.clone() }; thumb[1].rotation.z = -0.15; thumb[2].rotation.z = -0.12;
  rootBone.updateMatrixWorld(true);
  for (const name of ['index', 'middle', 'ring', 'pinky', 'thumb']) for (let k = 0; k < 3; k++) joints.push(new THREE.Vector3().setFromMatrixPosition(J[name][k].matrixWorld));
  const wp = (o, x = 0) => new THREE.Vector3(x, 0, 0).applyMatrix4(o.matrixWorld).toArray();
  for (const [name, , , L, R] of FING) { const c = J[name]; for (let k = 0; k < 3; k++) segs.push({ bone: c[k], a: wp(c[k]), b: wp(c[k], L[k]), ra: R[k], rb: R[k + 1], finger: true }); }
  { const L = [0.042, 0.032, 0.027], R = [0.0128, 0.011, 0.0098, 0.0088]; for (let k = 0; k < 3; k++) segs.push({ bone: thumb[k], a: wp(thumb[k]), b: wp(thumb[k], L[k]), ra: R[k], rb: R[k + 1], finger: true }); }
  const armA = [-0.004, 0.002, 0], armB = [-0.62, 0.02, 0];
  // ---- field
  const f = (p) => {
    let d = SDFK.roundBox(p, [0.037, 0.0, 0.0], [0.046, 0.0125, 0.043], 0.011);
    d = SDFK.smin(d, SDFK.cone([p[0], p[1], p[2] * 0.8], armA, armB, 0.027, 0.037), 0.016);
    d = SDFK.smin(d, SDFK.ellipsoid(p, [0.014, -0.009, 0.029], [0.036, 0.016, 0.02]), 0.01);
    d = SDFK.smin(d, SDFK.ellipsoid(p, [0.022, -0.007, -0.031], [0.036, 0.013, 0.014]), 0.01);
    let fd = 1e9;
    for (const s of segs) {
      let sd = SDFK.cone(p, s.a, s.b, s.ra, s.rb);
      fd = SDFK.smin(fd, sd, 0.0035);
    }
    d = SDFK.smin(d, fd, 0.008);
    for (const [, base] of FING) d = SDFK.smin(d, SDFK.sphere(p, [base[0] - 0.002, base[1] + 0.006, base[2]], 0.0082), 0.005);   // knuckles
    // extensor tendons fanning from the wrist to each knuckle, standing just proud of the back of the hand
    for (const [, base] of FING) d = SDFK.smin(d, SDFK.cone(p, [-0.006, 0.0112, base[2] * 0.45], [base[0] - 0.012, base[1] + 0.0112, base[2]], 0.0024, 0.0021), 0.0035);
    d = SDFK.smin(d, SDFK.sphere(p, [-0.03, 0.004, -0.03], 0.0068), 0.006);                     // ulnar styloid at the wrist
    return d;
  };
  const geo = surfaceNets(f, [-0.64, -0.058, -0.068], [0.21, 0.056, 0.1], 0.0030);
  // ---- skin weights (inverse distance to each bone's segment, top four) and vertex tint
  const pa = geo.attributes.position, nV = pa.count, si = new Uint16Array(nV * 4), sw = new Float32Array(nV * 4), col = new Float32Array(nV * 3);
  const segD = (p, a, b) => { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]; const h = clamp(((p[0] - a[0]) * bx + (p[1] - a[1]) * by + (p[2] - a[2]) * bz) / (bx * bx + by * by + bz * bz), 0, 1); return [SDFK.len(p[0] - a[0] - bx * h, p[1] - a[1] - by * h, p[2] - a[2] - bz * h), h]; };
  const P = [0, 0, 0];
  for (let v = 0; v < nV; v++) {
    P[0] = pa.getX(v); P[1] = pa.getY(v); P[2] = pa.getZ(v);
    const cand = [];
    const [dr] = segD(P, [-0.4, 0, 0], [-0.012, 0, 0]), [dp] = segD(P, [-0.012, 0, 0], [0.07, 0, 0]);
    cand.push([0, Math.max(dr - 0.03, 0.0008)]); cand.push([1, Math.max(dp - 0.03, 0.0008)]);
    let tipK = 0;
    segs.forEach((s) => { const [d, h] = segD(P, s.a, s.b); cand.push([bones.indexOf(s.bone), Math.max(d - lerp(s.ra, s.rb, h), 0.0008)]); if (s.bone.children.some((c) => !c.isBone) && d < 0.013) tipK = Math.max(tipK, smoothstep(0.5, 1.0, h)); });
    cand.sort((a, b) => a[1] - b[1]);
    let sum = 0; const top = cand.slice(0, 4).map(([b, d]) => { const w = 1 / Math.pow(d, 3); sum += w; return [b, w]; });
    top.forEach(([b, w], k) => { si[v * 4 + k] = b; sw[v * 4 + k] = w / sum; });
    // colour: fingertips and knuckles flush pinker, palm side paler
    const palmSide = smoothstep(0.0, -0.012, P[1]) * smoothstep(-0.05, 0.02, P[0]);
    const knuck = FING.reduce((m, [, b]) => Math.max(m, 1 - smoothstep(0.004, 0.014, SDFK.len(P[0] - b[0], P[1] - b[1] - 0.008, P[2] - b[2]))), 0);
    const base = [0.88, 0.62, 0.5];
    col[v * 3] = base[0] * (1 + 0.06 * palmSide) * (1 + 0.04 * tipK + 0.03 * knuck);
    col[v * 3 + 1] = base[1] * (1 + 0.1 * palmSide) * (1 - 0.1 * tipK - 0.08 * knuck);
    col[v * 3 + 2] = base[2] * (1 + 0.12 * palmSide) * (1 - 0.08 * tipK - 0.08 * knuck);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col.map((c) => Math.pow(c, 2.2)), 3));
  // planar-ish UVs for the pore normal map
  const uvs = new Float32Array(nV * 2); for (let v = 0; v < nV; v++) { uvs[v * 2] = pa.getX(v) * 18; uvs[v * 2 + 1] = (pa.getZ(v) + pa.getY(v)) * 18; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const hand = new THREE.SkinnedMesh(geo, skin);
  hand.add(rootBone);
  hand.bind(new THREE.Skeleton(bones));
  hand.castShadow = hand.receiveShadow = true; hand.frustumCulled = false;
  const root = new THREE.Group();
  root.add(hand);
  // nails on the distal bones
  for (const name of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
    const b = J[name][2], L = name === 'thumb' ? 0.027 : FING.find((x) => x[0] === name)[3][2], R = name === 'thumb' ? 0.0098 : FING.find((x) => x[0] === name)[4][2];
    // nail plate: a thin curved shell set into the fingertip; lunula, pink nail bed, whiter free edge (vertex colours)
    const nu = 10, nw = 8, npos = [], ncol = [], nidx = [], Ln = L * 0.62, Wn = R * 0.78;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nw; j++) {
      const u = i / nu, v = j / nw * 2 - 1, w = Wn * (u < 0.15 ? 0.82 + u * 1.2 : 1) * (u > 0.9 ? Math.sqrt(1 - ((u - 0.9) / 0.1) ** 2) * 0.3 + 0.7 : 1);
      const x = L * 0.4 + u * Ln, z = v * w, y = R * 0.9 - (z * z) / (R * 2.4) - (u - 0.5) ** 2 * R * 0.12 + (u > 0.88 ? (u - 0.88) * R * 0.25 : 0);
      npos.push(x, y, z);
      const lun = (1 - smoothstep(0.1, 0.22, Math.hypot(u, v * 0.35))), free = smoothstep(0.84, 0.92, u);
      const c = [lerp(lerp(0.86, 0.95, lun), 0.97, free), lerp(lerp(0.62, 0.86, lun), 0.95, free), lerp(lerp(0.6, 0.84, lun), 0.9, free)];
      ncol.push(Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2));
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nw; j++) { const a = i * (nw + 1) + j, c2 = a + nw + 1; nidx.push(a, a + 1, c2, a + 1, c2 + 1, c2); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(npos, 3)); ng.setAttribute('color', new THREE.Float32BufferAttribute(ncol, 3)); ng.setIndex(nidx); ng.computeVertexNormals();
    const nm = new THREE.Mesh(ng, nailMat); nm.castShadow = true; b.add(nm);
  }
  // sleeve with a rolled cuff and a closed far end
  const sl = new THREE.CylinderGeometry(0.052, 0.064, 0.7, 32, 10, true); sl.rotateZ(Math.PI / 2); sl.translate(-0.66, 0.016, 0);
  const sp = sl.attributes.position;
  for (let i = 0; i < sp.count; i++) { const a = Math.atan2(sp.getZ(i), sp.getY(i) - 0.016); sp.setY(i, sp.getY(i) + 0.004 * Math.sin(a * 5 + sp.getX(i) * 30)); sp.setZ(i, sp.getZ(i) * 1.12); }
  sl.computeVertexNormals();
  const cuff = new THREE.TorusGeometry(0.056, 0.012, 12, 40); cuff.rotateY(Math.PI / 2); cuff.scale(1, 1, 1.12); { const cp = cuff.attributes.position; for (let i = 0; i < cp.count; i++) { const a = Math.atan2(cp.getZ(i), cp.getY(i)); cp.setX(i, cp.getX(i) + 0.003 * Math.sin(a * 7)); } cuff.computeVertexNormals(); } cuff.translate(-0.31, 0.016, 0);   // rolled-up cuff
  const cap = new THREE.CircleGeometry(0.066, 24); cap.rotateY(-Math.PI / 2); cap.scale(1, 1, 1.12); cap.translate(-1.01, 0.016, 0);
  for (const g of [sl, cuff, cap]) { const m = new THREE.Mesh(g, sleeveMat); m.castShadow = m.receiveShadow = true; root.add(m); }
  root.visible=false;root.userData.dynamicGeometry=true;return {root,J,tips,palm:palmBone,mesh:hand,bones};
}
const _tq = new THREE.Quaternion(), _tq2 = new THREE.Quaternion(), _ty = new THREE.Vector3(0, 1, 0), _tz = new THREE.Vector3(0, 0, 1);
export function poseHand(rig, pinch, rub, t) {
  const J = rig.J, o = Math.sin(t * 18) * rub;
  const curl = (name, a, b, c) => {
    const j = J[name];
    _tq.setFromAxisAngle(_tz, -a + 0.12); j[0].quaternion.copy(j[0].userData.restQ).multiply(_tq);
    j[1].rotation.z = -b; j[2].rotation.z = -c;
  };
  curl('index', lerp(0.2, 0.72, pinch) + o * 0.1, lerp(0.2, 0.8, pinch) + o * 0.14, lerp(0.12, 0.45, pinch));
  curl('middle', lerp(0.22, 0.78, pinch) - o * 0.08, lerp(0.22, 0.82, pinch), lerp(0.12, 0.45, pinch));
  curl('ring', lerp(0.3, 1.0, pinch), lerp(0.3, 1.05, pinch), lerp(0.15, 0.65, pinch));
  curl('pinky', lerp(0.38, 1.1, pinch), lerp(0.35, 1.1, pinch), lerp(0.2, 0.7, pinch));
  const th = J.thumb;
  _tq.setFromAxisAngle(_ty, -0.55 * pinch + o * 0.18); _tq2.setFromAxisAngle(_tz, -0.25 * pinch);
  th[0].quaternion.copy(th[0].userData.restQ).multiply(_tq).multiply(_tq2);
  th[1].rotation.z = -(0.15 + pinch * 0.3); th[2].rotation.z = -(0.12 + pinch * 0.3 + o * 0.15);
}
// Relaxed open hand for stroking: fingers long and nearly straight, a little apart, softly following the curve below
export function poseHandFlat(rig,k,t) {
  const J = rig.J, br = Math.sin(t * 1.3) * 0.02;
  const set = (name, a, b, c, sp) => {
    const j = J[name];
    _tq.setFromAxisAngle(_tz, -a); _tq2.setFromAxisAngle(_ty, sp); j[0].quaternion.copy(j[0].userData.restQ).multiply(_tq2).multiply(_tq);
    j[1].rotation.z = -b; j[2].rotation.z = -c;
  };
  set('index', 0.02 + br, lerp(0.14, 0.06, k), lerp(0.1, 0.05, k), 0.06);
  set('middle', 0.03, lerp(0.16, 0.07, k), lerp(0.11, 0.05, k), 0.0);
  set('ring', 0.05 - br, lerp(0.2, 0.1, k), lerp(0.13, 0.07, k), -0.05);
  set('pinky', 0.08, lerp(0.26, 0.14, k), lerp(0.16, 0.09, k), -0.12);
  const th = J.thumb;
  _tq.setFromAxisAngle(_ty, 0.1); _tq2.setFromAxisAngle(_tz, 0.05);
  th[0].quaternion.copy(th[0].userData.restQ).multiply(_tq).multiply(_tq2);
  th[1].rotation.z = -0.08; th[2].rotation.z = -0.06;
}
