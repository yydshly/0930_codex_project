import * as THREE from 'three';
import { seeded, beamBetween, mesh } from './geometry.js';
import { pondBoundary } from './config.js';
import { lilyGeometry } from './lily-geometry.js';
function leafGeometry(maple = false) {
  const outline = maple ? [[0, 1], [.16, .45], [.48, .68], [.36, .25], [.84, .27], [.45, -.05],
    [.66, -.3], [.28, -.25], [.18, -.57], [0, -.4], [-.18, -.57], [-.28, -.25], [-.66, -.3],
    [-.45, -.05], [-.84, .27], [-.36, .25], [-.48, .68], [-.16, .45]]
    : [[0, 1], [.2, .65], [.28, .1], [.19, -.5], [0, -1], [-.19, -.5], [-.28, .1], [-.2, .65]];
  const pos = [], uv = [];
  for (let i = 0; i < outline.length; i++) for (const [x, y] of [[0, 0], outline[i], outline[(i + 1) % outline.length]]) {
    pos.push(x, y, 0.13 * Math.abs(x) - 0.035 * y * y); uv.push((x + 1) / 2, (y + 1) / 2);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals(); return geo;
}
function patchLeaves(mat, time) {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uGardenTime = time;
    shader.vertexShader = 'uniform float uGardenTime;varying vec2 vGardenLeafUv;varying float vGardenVariant;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vGardenLeafUv=uv;vGardenVariant=.5;
      #ifdef USE_INSTANCING
        float phase = instanceMatrix[3].x * 1.9 + instanceMatrix[3].z * 2.7;
        vGardenVariant=.5+.5*sin(phase*7.13+instanceMatrix[3].y*11.7);
        // A mild cup and an asymmetric tip distinguish repeated leaf geometry.
        transformed.z+=sin(uv.x*3.14159)*sin(uv.y*3.14159)*(.010+.030*vGardenVariant);
        transformed.x+=(vGardenVariant-.5)*.05*uv.y*uv.y;
        transformed.z += sin(uGardenTime * 1.6 + phase + uv.y * 3.0) * 0.045 * uv.y;
      #endif
    `);
    shader.fragmentShader = 'varying vec2 vGardenLeafUv;varying float vGardenVariant;\n'+shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float leafPhase=abs(vGardenLeafUv.x-.5)*40.-vGardenLeafUv.y*27.;
      float leafVeins=mix(.5,.5+.5*cos(leafPhase),1.-smoothstep(.50,2.2,fwidth(leafPhase)));
      float leafMidrib=1.-smoothstep(.008,.008+max(fwidth(vGardenLeafUv.x)*1.3,.005),abs(vGardenLeafUv.x-.5));
      diffuseColor.rgb*=.97+.035*leafVeins+.035*leafMidrib;
      diffuseColor.rgb*=.94+.06*vGardenVariant+.05*vGardenLeafUv.y;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
      gl_FragColor.rgb += vec3(0.02, 0.025, 0.006) * max(0.0, 1.0 - abs(vNormal.z));
      #include <dithering_fragment>
    `);
  };
  mat.customProgramCacheKey=()=> 'garden-leaves-v11';
}
export function createVegetation(mat, time) {
  // Keep the existing layout RNG consumption unchanged: appearance is a separate
  // stream so foliage refinements cannot move banks, branches or floating pads.
  const group = new THREE.Group(), random = seeded(29), appearance = seeded(29011), dummy = new THREE.Object3D();
  const redMat = mat.red.clone(), greenMat = mat.green.clone();
  patchLeaves(redMat, time); patchLeaves(greenMat, time);
  const redGeo = leafGeometry(true), greenGeo = leafGeometry(false);
  const red = new THREE.InstancedMesh(redGeo, redMat, 6600), green = new THREE.InstancedMesh(greenGeo, greenMat, 39000);
  let ri = 0, gi = 0;
  const leaf = (kind, pos, scale = 0.13) => {
    dummy.position.set(...pos); dummy.rotation.set(random() * 3, random() * 6.28, random() * 6.28);
    const size=scale * (0.7 + random() * 0.6);
    dummy.scale.set(size*(.83+appearance()*.34),size*(.80+appearance()*.42),size*(.82+appearance()*.34)); dummy.updateMatrix();
    const target = kind === 'red' ? red : green;
    const index = kind === 'red' ? ri++ : gi++; if (index < target.instanceMatrix.count) {
      target.setMatrixAt(index, dummy.matrix);
      const hue=random(),light=random(),cluster=Math.sin(pos[0]*1.7+pos[2]*.7)*Math.cos(pos[1]*2.2-pos[2]*.4);
      target.setColorAt(index, new THREE.Color().setHSL(kind === 'red' ? .016+hue*.036+cluster*.005 : .23+hue*.060+cluster*.014,
        kind === 'red' ? .60+appearance()*.12 : .39+appearance()*.14, .56+light*.34+cluster*.044));
    }
  };
  const cloud = (kind, center, extents, count, scale) => {
    for (let i = 0; i < count; i++) {
      const a = random() * 6.28, b = Math.acos(2 * random() - 1), r = Math.pow(random(), 0.3);
      leaf(kind, [center[0] + Math.sin(b) * Math.cos(a) * r * extents[0],
        center[1] + Math.cos(b) * r * extents[1], center[2] + Math.sin(b) * Math.sin(a) * r * extents[2]], scale);
    }
  };
  const tree = (kind, x, z, h, spread, count) => {
    beamBetween([x, 0, z], [x + 0.18, h * 0.6, z - 0.1], 0.14, mat.trunk, group, 0.08);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4 + random(), r = spread * (0.45 + random() * 0.55);
      const base = [x + 0.08, h * (0.32 + random() * 0.3), z - 0.08];
      const mid = [x + Math.cos(a) * r * 0.52, h * (0.62 + random() * 0.16), z + Math.sin(a) * r * 0.52];
      const end = [x + Math.cos(a) * r, h * (0.7 + random() * 0.22), z + Math.sin(a) * r];
      beamBetween(base, mid, 0.065, mat.trunk, group, 0.032); beamBetween(mid, end, 0.033, mat.trunk, group, 0.011);
      for (let j = 0; j < 4; j++) {
        const tip = [end[0] + (random() - 0.5) * 0.7, end[1] + random() * 0.35, end[2] + (random() - 0.5) * 0.7];
        beamBetween(end, tip, 0.012, mat.trunk, group, 0.004);
      }
      cloud(kind, end, [spread * 0.45, 0.36 + spread * 0.1, spread * 0.39], Math.floor(count / 11), kind === 'red' ? 0.105 : 0.115);
    }
  };
  tree('red', -5.8, 0.4, 4.9, 2.65, 5900);
  tree('green', 4.3, -3.3, 4.1, 1.25, 3000);
  tree('green', -6.3, -6.1, 5.0, 1.1, 1500);
  for (let i = 0; i < 7; i++) tree('green', -11 + i * 3.7, -10.4 - random() * 0.5, 6.9 + random() * 1.4, 2.25, 3900);
  const bambooMat = new THREE.MeshStandardMaterial({ color: '#687143', roughness: 0.88 });
  const bambooNode = new THREE.MeshStandardMaterial({ color: '#8b8b5b', roughness: 0.9 });
  for (let i = 0; i < 29; i++) {
    const x = -6.6 + (random() - .5) * 2.1, z = -3.95 + (random() - .5) * 2.1, h = 3.5 + random() * 2.4;
    const top = [x + (random() - 0.5) * 0.5, h, z + (random() - 0.5) * 0.25];
    beamBetween([x, 0, z], top, 0.03 + random() * 0.018, bambooMat, group, 0.022);
    for (let k = 1; k < h / 0.42; k++) {
      const y = k * 0.42, f = y / h, bx = THREE.MathUtils.lerp(x, top[0], f), bz = THREE.MathUtils.lerp(z, top[2], f);
      mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.045, 8), bambooNode, group, [bx, y, bz]);
      if (y > 2.2) {
        const a = random() * 6.28, end = [bx + Math.cos(a) * 0.6, y + 0.18, bz + Math.sin(a) * 0.6];
        beamBetween([bx, y, bz], end, 0.008, bambooMat, group, 0.002);
        cloud('green', end, [0.5, 0.25, 0.4], 12, 0.19);
      }
    }
  }
  for (let i = 0; i < 43; i++) {
    const t = i / 43 * 6.28, p = pondBoundary(t);
    const x = p.x + Math.cos(t) * (0.45 + random() * 0.5), z = p.z + Math.sin(t) * (0.5 + random() * 0.4);
    if (x > 3.6 && z < 2.5 || z < -3.35) continue;
    cloud('green', [x, 0.22, z], [0.45, 0.2, 0.45], 85, 0.085);
  }
  const blades = new THREE.InstancedMesh(bladeGeometry(), greenMat, 3200); let bi = 0;
  const grassPatch = (x, z, size, count) => {
    for (let i = 0; i < count; i++) {
      const a = random() * 6.28, r = random() * size * 0.35;
      dummy.position.set(x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r); dummy.rotation.set(0, random() * 6.28, 0);
      dummy.scale.set(size * (0.55 + random() * .55), size * (0.65 + random() * .6), size); dummy.updateMatrix();
      if (bi < 3200){blades.setMatrixAt(bi, dummy.matrix);blades.setColorAt(bi++,new THREE.Color().setHSL(.225+appearance()*.055,.30+appearance()*.16,.71+appearance()*.22));}
    }
  };
  for (let i = 0; i < 31; i++) {
    const t = i / 31 * 6.28, p = pondBoundary(t), x = p.x + Math.cos(t) * 0.55, z = p.z + Math.sin(t) * 0.6;
    if (x > 3.5 && z < 2.5 || z < -3.35) continue;
    grassPatch(x, z, 0.48 + random() * 0.35, 58);
  }
  for (const [x, z] of [[-5.8, 5.2], [-6.4, 6.5], [-5.8, 3.9], [4.0, 3.5], [2.7, 3.7], [5.0, -3.5], [-7, 2]]) grassPatch(x, z, 0.75, 85);
  blades.count = bi; blades.castShadow = blades.receiveShadow = true; group.add(blades);
  red.count = Math.min(ri, 6600); green.count = Math.min(gi, 39000);
  red.castShadow = red.receiveShadow = green.receiveShadow = true;green.castShadow=false;
  const fernGeo=fernGeometry(),ferns=new THREE.InstancedMesh(fernGeo,greenMat,48);let fi=0;
  for(let i=0;i<37;i++){
    const t=i/37*6.28,p=pondBoundary(t),x=p.x+Math.cos(t)*.70,z=p.z+Math.sin(t)*.62;
    if(x>3.6&&z<2.4||z<-3.4)continue;
    dummy.position.set(x,.035,z);dummy.rotation.set(0,random()*6.28,0);const size=.65+random()*.55;dummy.scale.set(size*(.88+appearance()*.24),size*(.86+appearance()*.28),size*(.90+appearance()*.20));dummy.updateMatrix();ferns.setMatrixAt(fi,dummy.matrix);ferns.setColorAt(fi++,new THREE.Color().setHSL(.23+appearance()*.045,.31+appearance()*.10,.76+appearance()*.16));
  }
  for(const [x,z]of [[-5.4,5.2],[-6.3,3.8],[3.65,4.15],[4.4,4.35]]){
    dummy.position.set(x,.035,z);dummy.rotation.y=random()*6.28;dummy.scale.setScalar(.62);dummy.updateMatrix();ferns.setMatrixAt(fi,dummy.matrix);ferns.setColorAt(fi++,new THREE.Color().setHSL(.23+appearance()*.045,.31+appearance()*.10,.76+appearance()*.16));
  }
  ferns.count=fi;ferns.castShadow=ferns.receiveShadow=true;ferns.name='curved-fern-fronds';ferns.material=greenMat.clone();ferns.material.vertexColors=true;ferns.material.color.set('#668344');patchLeaves(ferns.material,time);
  const pads=new THREE.Group(),padMaterial=new THREE.MeshStandardMaterial({color:'#638139',roughness:.58,side:THREE.DoubleSide,vertexColors:true}),padGeometry=lilyGeometry();
  pads.name='water-lilies';pads.userData.dynamicGeometry=true;
  for(let i=0;i<7;i++){
    const pad=mesh(padGeometry,padMaterial,pads,[-2.1+random()*.75,.03,1.1+random()*.65]);
    pad.userData.anchor={x:pad.position.x,z:pad.position.z};pad.userData.yaw=random()*6.28;
    pad.scale.setScalar(.15+random()*.075);pad.castShadow=pad.receiveShadow=false;
  }
  group.add(red,green,ferns,pads);return group;
}
function fernGeometry(){
  const positions=[],uvs=[],colors=[],random=seeded(307);
  const triangle=(a,b,c,t,tone)=>{for(const p of [a,b,c]){positions.push(...p);uvs.push(.5,t);colors.push(.75*tone,tone,.58*tone);}};
  // Narrow paired pinnae grow along a curved rachis. Smaller curved fans replace
  // the former large flat triangles; UV height anchors wind at the root.
  for(let f=0;f<9;f++){
    const angle=f*2.39996+.1*random(),length=.52+random()*.23;
    const transform=(x,y,z)=>[Math.cos(angle)*z+Math.sin(angle)*x,y,Math.sin(angle)*z-Math.cos(angle)*x];
    const center=t=>[0,Math.sin(t*2.6)*length*.58,t*length];
    for(let k=1;k<=14;k++){
      const t=k/16,base=center(t),extent=Math.sin(t*Math.PI)*length*.23+.012,tone=.72+random()*.26;
      for(const side of [-1,1]){
        const root=[side*.005,base[1],base[2]],tip=[side*extent,base[1]-.018-t*.014,base[2]+.052*(1-t*.5)],edge=[];
        for(let j=0;j<8;j++){const a=j/8*Math.PI*2,u=(1-Math.cos(a))*.5,w=Math.sin(a)*.011*(1-t*.45);edge.push(transform(root[0]+(tip[0]-root[0])*u,root[1]+(tip[1]-root[1])*u+.008*Math.sin(u*Math.PI),root[2]+(tip[2]-root[2])*u+w));}
        const mid=transform((root[0]+tip[0])*.5,(root[1]+tip[1])*.5+.012,(root[2]+tip[2])*.5);
        for(let j=0;j<8;j++)triangle(mid,edge[j],edge[(j+1)%8],t,tone);
      }
      const next=center(Math.min(1,t+.065)),a=transform(-.0025,base[1]+.003,base[2]),b=transform(.0025,base[1]+.003,base[2]),c=transform(-.0015,next[1]+.003,next[2]),d=transform(.0015,next[1]+.003,next[2]);triangle(a,b,c,t,tone);triangle(b,d,c,t,tone);
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
function bladeGeometry() {
  const vertices = [], uvs = [];
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const f0 = i / steps, f1 = (i + 1) / steps;
    const row = f => ({ y: Math.sin(f * 1.45) * 0.65, z: f * f * 0.55, w: 0.026 * (1 - f) });
    const a = row(f0), b = row(f1);
    for (const [x, y, z, u, v] of [[-a.w,a.y,a.z,0,f0],[a.w,a.y,a.z,1,f0],[-b.w,b.y,b.z,0,f1],
      [a.w,a.y,a.z,1,f0],[b.w,b.y,b.z,1,f1],[-b.w,b.y,b.z,0,f1]]) { vertices.push(x,y,z); uvs.push(u,v); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.computeVertexNormals(); return geo;
}
