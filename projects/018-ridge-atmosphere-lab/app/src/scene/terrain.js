import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, fbm, heightAt, lerp, noise2, ridgeX, seededRandom, smoothstep } from './math.js';

export { heightAt, ridgeX } from './math.js';

const terrainNoiseGLSL = /* glsl */`
  float ridgeHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float ridgeNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(ridgeHash(i), ridgeHash(i + vec2(1.,0.)), f.x),
      mix(ridgeHash(i + vec2(0.,1.)), ridgeHash(i + vec2(1.,1.)), f.x), f.y);
  }
  float ridgeFbm(vec2 p) {
    float value = 0.0;
    value += ridgeNoise(p) * .5;
    p = mat2(1.67, 1.21, -1.21, 1.67) * p + vec2(19.31, -12.74);
    value += ridgeNoise(p) * .25;
    p = mat2(1.67, 1.21, -1.21, 1.67) * p + vec2(19.31, -12.74);
    value += ridgeNoise(p) * .125;
    return value / .875;
  }
  float meadowCover(vec2 p) {
    vec2 warp = vec2(ridgeNoise(p * .024 + 17.3), ridgeNoise(p * .024 - 29.7));
    float broad = ridgeFbm((p + (warp - .5) * 18.0) * .075);
    return smoothstep(.28, .65, broad);
  }
`;

function surfaceMaterial(uniforms, { distant = false, snow = false } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.94, metalness: 0.025,
  });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', /* glsl */`
      #include <common>
      attribute float trailMask;
      attribute float trailOffset;
      varying vec3 vTerrainPosition;
      varying vec3 vTerrainNormal;
      varying float vTrailMask;
      varying float vTrailOffset;
    `).replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      vec4 terrainWorld = vec4(position, 1.0);
      vec3 terrainNormal = normal;
      #ifdef USE_INSTANCING
        terrainWorld = instanceMatrix * terrainWorld;
        terrainNormal = mat3(instanceMatrix) * terrainNormal;
      #endif
      vTerrainPosition = (modelMatrix * terrainWorld).xyz;
      vTerrainNormal = normalize(mat3(modelMatrix) * terrainNormal);
      vTrailMask = trailMask;
      vTrailOffset = trailOffset;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', /* glsl */`
      #include <common>
      varying vec3 vTerrainPosition;
      varying vec3 vTerrainNormal;
      varying float vTrailMask;
      varying float vTrailOffset;
      uniform float uWetness;
      uniform vec3 uGrassColor;
      uniform vec3 uRockColor;
      uniform sampler2D uGroundDiffuse;
      uniform sampler2D uGroundNormal;
      uniform sampler2D uGroundRoughness;
      uniform float uGroundMapMix;
      ${terrainNoiseGLSL}
    `).replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      vec3 surfaceNormal = normalize(vTerrainNormal);
      float slope = 1.0 - max(0.0, surfaceNormal.y);
      vec2 surfaceUv = vTerrainPosition.xz;
      float patches = ridgeFbm(surfaceUv * .15);
      float coarse = ridgeFbm(surfaceUv * .85);
      float grit = ridgeNoise(surfaceUv * 17.2);
      // Thin directional seams give wet exposed stone an eroded surface.
      float seams = pow(1.0 - abs(ridgeNoise(vec2(surfaceUv.x * .72 + patches * 4.0,
        surfaceUv.y * .18 + coarse * 3.0)) * 2.0 - 1.0), 17.0);
      float rockCoverage = smoothstep(.24, .55, slope + (patches - .46) * .44);
      float undergrowth = ridgeFbm(surfaceUv * 4.8);
      vec3 moss = uGrassColor * (.52 + patches * .58 + undergrowth * .39 + grit * .15);
      vec3 rock = uRockColor * (.76 + coarse * .37 + grit * .15);
      rock *= 1.0 - seams * .19;
      vec3 groundColor = mix(moss, rock, rockCoverage);
      float pebbles = smoothstep(.66, .8, ridgeNoise(surfaceUv * 9.5 + coarse * 3.0));
      float muddyPatches = ridgeFbm(surfaceUv * .9 + patches * 2.0);
      float wornPath = vTrailMask * (.79 + coarse * .21);
      vec3 earth = mix(vec3(.074, .084, .076), vec3(.128, .127, .106), muddyPatches);
      earth = mix(earth, vec3(.17, .18, .16), pebbles * .25);
      float hoofWear = exp(-pow((abs(vTrailOffset) - .43) / .14, 2.0));
      hoofWear *= smoothstep(.38, .66, ridgeFbm(surfaceUv * .35));
      earth *= 1.0 - hoofWear * .075;
      earth *= .8 + grit * .25;
      groundColor = mix(groundColor, earth, wornPath);
      vec2 groundUV = surfaceUv / 7.0;
      vec2 groundUV2 = mat2(.8, .6, -.6, .8) * groundUV * .87 + vec2(7.3, -3.1);
      float mapBlend = smoothstep(.32, .67, ridgeFbm(surfaceUv * .019));
      vec3 scanColor = mix(texture2D(uGroundDiffuse, groundUV).rgb,
        texture2D(uGroundDiffuse, groundUV2).rgb, mapBlend);
      scanColor *= mix(vec3(.65, .71, .65), vec3(.79, .82, .80), rockCoverage);
      // Short meadow growth continues into the soil beneath the visible tufts.
      // The scan still supplies its detail, without leaving brown halos around
      // every repeating green card or turning the broad slope into bare earth.
      float meadow = meadowCover(surfaceUv) * (1.0 - rockCoverage);
      float scanLuma = dot(scanColor, vec3(.2126, .7152, .0722));
      vec3 meadowTint = uGrassColor / max(.08, dot(uGrassColor, vec3(.2126, .7152, .0722)));
      scanColor = mix(scanColor, scanLuma * meadowTint, .24 + meadow * .18);
      float scanMix = uGroundMapMix * (1.0 - meadow * .16) * (1.0 - wornPath * .96);
      groundColor = mix(groundColor, scanColor, scanMix);
      ${!distant ? `
      float nearCover = 1.0 - smoothstep(18.0, 52.0, abs(vTrailOffset));
      float mossBed = nearCover * (1.0 - rockCoverage) * (1.0 - wornPath);
      groundColor = mix(groundColor, moss, mossBed * (.43 + meadow * .15));
      ` : ''}
      groundColor *= mix(1.0, .86, uWetness);
      ${snow ? `
        float snowEdge = 342.0 + ridgeFbm(surfaceUv * .023) * 58.0;
        float snowCoverage = smoothstep(snowEdge, snowEdge + 78.0, vTerrainPosition.y);
        float snowGullies = ridgeFbm(vec2(surfaceUv.x * .027 + surfaceUv.y * .005,
          surfaceUv.y * .008));
        snowCoverage *= smoothstep(.28, .72, surfaceNormal.y + snowGullies * .36);
        snowCoverage *= 1.0 - smoothstep(-85.0, 380.0, vTerrainPosition.x);
        snowCoverage *= smoothstep(.28, .57, snowGullies) * .85;
        vec3 snowColor = vec3(.47, .52, .52) * (.79 + coarse * .25);
        groundColor = mix(groundColor, snowColor, snowCoverage);
      ` : ''}
      ${distant ? 'groundColor = mix(groundColor, vec3(.29, .35, .35), .13);' : ''}
      diffuseColor.rgb *= groundColor;
    `).replace('#include <roughnessmap_fragment>', /* glsl */`
      #include <roughnessmap_fragment>
      roughnessFactor *= mix(1.0, .65, uWetness * rockCoverage);
      float scannedRoughness = texture2D(uGroundRoughness, groundUV).r;
      roughnessFactor = mix(roughnessFactor, clamp(scannedRoughness * .93, .6, 1.0), uGroundMapMix * .7);
    `).replace('#include <normal_fragment_maps>', /* glsl */`
      #include <normal_fragment_maps>
      // Screen-space derivatives supply sub-metre bump detail without image maps.
      float relief = ridgeNoise(vTerrainPosition.xz * 15.5) * .02
        + ridgeFbm(vTerrainPosition.xz * 2.9) * .035;
      vec3 q0 = dFdx(-vViewPosition);
      vec3 q1 = dFdy(-vViewPosition);
      vec3 sn = normalize(normal);
      vec3 r0 = cross(q1, sn), r1 = cross(sn, q0);
      float det = dot(q0, r0);
      vec3 surfaceGradient = sign(det) * (dFdx(relief) * r0 + dFdy(relief) * r1);
      normal = normalize(abs(det) * sn - surfaceGradient);
      vec3 scannedNormal = texture2D(uGroundNormal, groundUV).xyz * 2.0 - 1.0;
      vec3 worldTangent = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
      worldTangent = normalize(worldTangent - normal * dot(normal, worldTangent));
      vec3 worldBitangent = normalize(cross(worldTangent, normal));
      vec3 scanPerturbed = normalize(normal * max(.35, scannedNormal.z)
        + worldTangent * scannedNormal.x * .65 + worldBitangent * scannedNormal.y * .65);
      normal = normalize(mix(normal, scanPerturbed, uGroundMapMix * .86));
    `);
  };
  material.customProgramCacheKey = () => `ridge-surface-v6-${distant}-${snow}`;
  return material;
}

function heightfield({ xSegments, zSegments, xAt, zStart, zEnd, zAt, heightFn, curved = false, path = false }) {
  const count = (xSegments + 1) * (zSegments + 1);
  const positions = new Float32Array(count * 3);
  const trail = new Float32Array(count);
  const offsets = new Float32Array(count);
  const indices = [];
  let offset = 0;
  for (let zi = 0; zi <= zSegments; zi++) {
    const z = zAt ? zAt(zi / zSegments) : zStart + (zEnd - zStart) * zi / zSegments;
    const center = curved ? ridgeX(z) : 0;
    for (let xi = 0; xi <= xSegments; xi++) {
      const dx = xAt(xi / xSegments);
      const x = center + dx;
      positions[offset * 3] = x;
      positions[offset * 3 + 1] = heightFn(x, z);
      positions[offset * 3 + 2] = z;
      const width = .78 + noise2(z * .027 + 47, 8.3) * .4;
      const edge = width + (noise2(x * .39, z * .34) - .5) * .42;
      trail[offset] = path ? 1 - smoothstep(edge - .28, edge + .72, Math.abs(dx)) : 0;
      offsets[offset] = dx;
      offset++;
    }
  }
  for (let zi = 0; zi < zSegments; zi++) {
    for (let xi = 0; xi < xSegments; xi++) {
      const a = zi * (xSegments + 1) + xi;
      const b = a + xSegments + 1;
      // z decreases toward the mountains, so this winding faces upward.
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('trailMask', new THREE.BufferAttribute(trail, 1));
  geometry.setAttribute('trailOffset', new THREE.BufferAttribute(offsets, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function nearSample(t) {
  const v = t * 2 - 1;
  // Dense centre sampling gives a clean horse route and detailed grass shoulders.
  return Math.sign(v) * (Math.abs(v) * 11 + Math.pow(Math.abs(v), 3) * 539);
}

function farHeight(x, z) {
  const warpedX = x + (fbm(x * .0028 + 70, z * .0023 + 8, 4) - .5) * 105;
  const warpedZ = z + (fbm(x * .0023 + 15, z * .0026 - 19, 4) - .5) * 85;
  // A linked alpine crest has multiple unequal summits and a forward branch,
  // rather than one radial cone. The main summit remains inside the late-route
  // narrow-view framing, while its broad flank can continue beyond the edge.
  const summit = Math.pow(Math.max(0, 1 - Math.abs(warpedX + 400) / 1030), 1.05);
  const secondPeak = Math.pow(Math.max(0, 1 - Math.abs(warpedX - 125) / 470), 1.15);
  const westShoulder = Math.pow(Math.max(0, 1 - Math.abs(warpedX + 940) / 530), .95);
  const crestZ = -1850 + Math.abs(warpedX + 400) * .15
    + (noise2(warpedX * .0044 + 9, 32) - .5) * 125;
  const teeth = (noise2(warpedX * .009 + 71, 53) - .5) * 34;
  const crestHeight = 98 + Math.max(610 * summit, 440 * secondPeak, 310 * westShoulder) + teeth;
  const crossSection = Math.abs((warpedZ - crestZ) / (555 + summit * 95));
  const frontRange = (crestHeight + 80) * Math.exp(-Math.pow(crossSection, 1.42)) - 80;
  const spurZ = -1430 + (warpedX + 360) * .28;
  const spurHeight = 58 + 250 * summit + 75 * secondPeak;
  const spur = (spurHeight + 82) * Math.exp(-Math.pow(Math.abs((warpedZ - spurZ) / 280), 1.25)) - 82;
  const backCrestZ = -2650 + (noise2(warpedX * .0033 + 47, 21) - .5) * 570;
  const backHeight = 220 + fbm(warpedX * .005 + 35, 91, 4) * 175;
  const backRange = (backHeight + 90) * Math.exp(-Math.pow(Math.abs((warpedZ - backCrestZ) / 440), 1.3)) - 90;
  const mountainHeight = Math.max(frontRange, backRange, spur);
  const ribs = Math.pow(1 - Math.abs(noise2(x * .015 + z * .002, z * .006) * 2 - 1), 2) * 29;
  const erosion = (fbm(x * .026 + 53, z * .021 + 13, 6) - .5) * 34;
  return mountainHeight + (erosion - ribs) * smoothstep(-40, 200, mountainHeight);
}

function basinHeight(x, z) {
  // The same surface continues under the near ridge, including its side valleys.
  // A two-metre gap prevents z-fighting while retaining continuous silhouettes.
  const foreground = heightAt(x, z) - 2;
  return lerp(foreground, farHeight(x, z), smoothstep(650, 950, -z));
}

function farDepthSample(t) {
  // Spend most vertices on the visible mountains, and widen sparsely behind us.
  if (t < .2) return lerp(2500, -650, t / .2);
  if (t < .8) return lerp(-650, -3200, (t - .2) / .6);
  return lerp(-3200, -6200, (t - .8) / .2);
}

function farWidthSample(t) {
  const v = t * 2 - 1;
  return Math.sign(v) * (Math.abs(v) * 1200 + Math.pow(Math.abs(v), 3) * 4800);
}

function bladeGeometry(count, random) {
  const geometry = new THREE.BufferGeometry();
  const positions = [], indices = [];
  const blade = [-.019, 0, 0, .019, 0, 0, -.027, .3, .018, .027, .3, .018,
    -.011, .62, .063, .011, .62, .063, .003, .88, .14];
  // Fine curved leaves: all dimensions are scaled to the 8–25 cm tuft height.
  for (let leaf = 0; leaf < 4; leaf++) {
    const angle = leaf * 1.57 + .35;
    const scale = 1 - leaf * .08;
    for (let vertex = 0; vertex < 7; vertex++) {
      const x = blade[vertex * 3], y = blade[vertex * 3 + 1], z = blade[vertex * 3 + 2];
      positions.push(x * Math.cos(angle) + z * Math.sin(angle) + Math.cos(angle) * .026,
        y * scale, -x * Math.sin(angle) + z * Math.cos(angle) + Math.sin(angle) * .026);
    }
    for (const vertex of [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]) indices.push(leaf * 7 + vertex);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const phases = new Float32Array(count);
  const tints = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    phases[i] = random() * Math.PI * 2;
    tints[i] = random();
  }
  geometry.setAttribute('aBladePhase', new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute('aBladeTint', new THREE.InstancedBufferAttribute(tints, 1));
  return geometry;
}

function foliageCardGeometry(count, random) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const card = new THREE.PlaneGeometry([.66, .61, .64][i], [.32, .30, .31][i]);
    card.translate(0, .16, 0);
    card.rotateY([0, 1.19, 2.46][i]);
    card.translate([-.025, .017, .006][i], 0, [.012, -.025, .02][i]);
    parts.push(card);
  }
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  const phases = new Float32Array(count), tints = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    phases[i] = random() * Math.PI * 2; tints[i] = random();
  }
  geometry.setAttribute('aBladePhase', new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute('aBladeTint', new THREE.InstancedBufferAttribute(tints, 1));
  return geometry;
}

function grassMaterial(uniforms, { cards = false } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide,
    ...(cards ? { map: uniforms.uFoliageMap.value, alphaTest: .4, depthWrite: true } : {}),
  });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', /* glsl */`
      #include <common>
      attribute float aBladePhase;
      attribute float aBladeTint;
      uniform float uTime;
      uniform float uWind;
      varying float vBladeTint;
      varying float vBladeHeight;
      varying float vBladeMeadow;
      ${cards ? terrainNoiseGLSL : ''}
    `).replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      vec3 root = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
      float gust = sin(root.x * .055 + root.z * .027 - uTime * 1.35);
      float flutter = sin(uTime * 4.1 + aBladePhase + root.z * .13);
      float bend = position.y * position.y;
      transformed.x += bend * uWind * (.18 + gust * .18 + flutter * .045);
      transformed.z += bend * uWind * (.12 + gust * .11);
      vBladeTint = aBladeTint;
      vBladeHeight = position.y;
      vBladeMeadow = ${cards ? 'meadowCover(root.xz)' : '0.0'};
    `);
    if (cards) shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', /* glsl */`
      #include <uv_vertex>
      // Mirroring changes the exposed silhouette without cutting rectangular
      // holes through the alpha image or increasing the texture footprint.
      if (aBladePhase > 3.14159265) vMapUv.x = 1.0 - vMapUv.x;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', /* glsl */`
      #include <common>
      uniform vec3 uGrassColor;
      varying float vBladeTint;
      varying float vBladeHeight;
      varying float vBladeMeadow;
    `).replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      ${cards ? `
      float meadow = vBladeMeadow;
      float leafLuma = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
      vec3 meadowTint = uGrassColor / max(.08, dot(uGrassColor, vec3(.2126, .7152, .0722)));
      vec3 leafColor = mix(diffuseColor.rgb, leafLuma * meadowTint, .25);
      // Lift the dense root pixels instead of outlining every tuft in black.
      // Broad soil/leaf colour variation supplies depth between meadow patches.
      leafColor = mix(leafColor, sqrt(max(leafLuma, .001)) * .34 * meadowTint, .22);
      float patchTint = .84 + meadow * .075 + (vBladeTint - .5) * .09;
      float rootOcclusion = mix(.9, 1.0, smoothstep(.008, .14, vBladeHeight));
      diffuseColor.rgb = leafColor * patchTint * rootOcclusion;
      ` : `
      vec3 leafColor = uGrassColor * mix(.45, .73, vBladeTint);
      leafColor = mix(leafColor * .84, leafColor, smoothstep(0.0, .86, vBladeHeight));
      leafColor = mix(leafColor, vec3(.12, .132, .092), pow(vBladeTint, 5.0) * .25);
      diffuseColor.rgb *= leafColor;
      `}
    `).replace('#include <emissivemap_fragment>', /* glsl */`
      #include <emissivemap_fragment>
      ${cards ? 'totalEmissiveRadiance += diffuseColor.rgb * .025;' : 'totalEmissiveRadiance += vec3(.012, .026, .003) * (.6 + vBladeHeight * .2);'}
    `);
    if (cards) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      // A canopy normal avoids facing-dependent silver highlights on the crossed cards.
      normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    `);
  };
  material.customProgramCacheKey = () => `ridge-grass-v8-${cards}`;
  return material;
}

function makeGrass(quality, uniforms, { foliageCards = false, detail = false } = {}) {
  const count = detail ? (quality === 'low' ? 3500 : 16000)
    : foliageCards ? (quality === 'low' ? 19000 : 52000) : (quality === 'low' ? 22000 : 72000);
  const random = seededRandom(detail ? 662817 : 93419);
  const geometry = foliageCards ? foliageCardGeometry(count, random) : bladeGeometry(count, random);
  const grass = new THREE.InstancedMesh(geometry, grassMaterial(uniforms, { cards: foliageCards }), count);
  const transform = new THREE.Object3D();
  let accepted = 0;
  while (accepted < count) {
    const nearField = random() < (foliageCards ? .76 : .76);
    const z = detail ? 40 - random() * 490
      : foliageCards ? (nearField ? 40 - random() * 490 : 70 - random() * 620)
      : nearField ? 28 - Math.pow(random(), 1.6) * 160 : 70 - random() * 650;
    const side = random() > .43 ? 1 : -1;
    const coreCover = foliageCards && random() < .84;
    const d = detail ? side * (.76 + Math.pow(random(), 1.15) * 9)
      : side * (.66 + (nearField ? Math.pow(random(), foliageCards ? 1.1 : 1.4) : random())
      * (foliageCards ? (coreCover ? 11 : nearField ? 48 : 90) : nearField ? 28 : 65));
    const x = ridgeX(z) + d;
    const warpX = (noise2(x * .025 + 51, z * .025) - .5) * 18;
    const warpZ = (noise2(x * .025 - 37, z * .025 + 19) - .5) * 18;
    const patch = fbm((x + warpX) * .067 + 21, (z + warpZ) * .09, 3);
    const coverProbability = .22 + smoothstep(.28, .65, patch) * .78;
    if (random() > coverProbability) continue;
    const pathEdge = .82 + noise2(z * .027 + 47, 8.3) * .4;
    const shoulderCover = smoothstep(pathEdge - .28, pathEdge + 1.45, Math.abs(d));
    if (random() > shoulderCover) continue;
    const y = heightAt(x, z);
    const slope = Math.abs(heightAt(x + .5, z) - heightAt(x - .5, z));
    if (slope > 2.2) continue;
    const size = foliageCards ? .55 + random() * .34
      : .08 + random() * .17 + patch * .035;
    transform.position.set(x, y - (foliageCards ? .012 : .035), z);
    transform.rotation.set((random() - .5) * (foliageCards ? .04 : .16), random() * Math.PI * 2,
      (random() - .5) * (foliageCards ? .04 : .16));
    const spread = foliageCards ? 1.1 + random() * .4 : detail ? 1.22 + random() * .33 : .8 + random() * .35;
    transform.scale.set(size * spread, size,
      size * (foliageCards ? 1.08 + random() * .4 : detail ? 1.2 + random() * .32 : .8 + random() * .35));
    transform.updateMatrix();
    grass.setMatrixAt(accepted++, transform.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.computeBoundingSphere();
  grass.castShadow = false;
  grass.receiveShadow = true;
  grass.name = foliageCards ? 'low continuous meadow cover on crossed wind cards'
    : detail ? 'fine grass silhouettes among the low meadow cover' : 'GPU-wind alpine meadow tufts';
  grass.customDepthMaterial = foliageCards ? new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking, map: uniforms.uFoliageMap.value, alphaTest: .4, side: THREE.DoubleSide,
  }) : undefined;
  return grass;
}

function makeRocks(quality, uniforms) {
  const count = quality === 'low' ? 750 : 2100;
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const vertices = geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const displacement = .8 + noise2(x * 7 + 3, z * 9 + y * 5) * .35;
    vertices.setXYZ(i, x * displacement, y * displacement, z * displacement);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('trailMask', new THREE.Float32BufferAttribute(new Float32Array(vertices.count), 1));
  geometry.setAttribute('trailOffset', new THREE.Float32BufferAttribute(new Float32Array(vertices.count), 1));
  const rocks = new THREE.InstancedMesh(geometry, surfaceMaterial(uniforms), count);
  const random = seededRandom(4491);
  const transform = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const z = 92 - random() * 710;
    const gravel = random() < .52;
    const d = gravel ? (random() - .5) * 2.5 : (random() < .5 ? -1 : 1) * (3 + Math.pow(random(), 1.45) * 110);
    const x = ridgeX(z) + d;
    const scale = gravel ? .025 + random() * .055 : .10 + Math.pow(random(), 3.5) * .85;
    transform.position.set(x, heightAt(x, z) - scale * .32, z);
    transform.rotation.set(random(), random() * Math.PI * 2, random() * .6);
    transform.scale.set(scale * (1.4 + random()), scale * .38, scale);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rocks.name = 'wet ridge boulders';
  return rocks;
}

function makeForest(quality) {
  const parts = [];
  const plantRandom = seededRandom(342);
  function treePart(geometry, leaf = false) {
    const n = geometry.getAttribute('position').count;
    geometry.setAttribute('aLeaf', new THREE.Float32BufferAttribute(new Float32Array(n).fill(leaf ? 1 : 0), 1));
    const colors = [];
    const tint = leaf ? .73 + plantRandom() * .46 : .50;
    for (let i = 0; i < n; i++) colors.push(tint, tint, tint * (leaf ? .87 : .81));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    parts.push(geometry);
  }
  const trunk = new THREE.CylinderGeometry(.10, .17, 3.7, 6).toNonIndexed();
  trunk.translate(0, 1.85, 0);
  treePart(trunk);
  // Leaf groups overlap around branch ends, so the crown reads as a connected
  // volume in the middle distance while its outer silhouette stays irregular.
  const crowns = [];
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.39996 + plantRandom() * .5;
    const radius = i === 0 ? .16 : .65 + plantRandom() * .39;
    crowns.push(new THREE.Vector3(Math.cos(angle) * radius,
      i === 0 ? 3.78 : 2.55 + plantRandom() * .8, Math.sin(angle) * radius));
  }
  for (let i = 0; i < 110; i++) {
    const angle = plantRandom() * Math.PI * 2;
    const crown = crowns[i % crowns.length];
    const radius = Math.sqrt(plantRandom()) * .58;
    const height = crown.y + (plantRandom() - .5) * 1.22;
    const leaf = new THREE.PlaneGeometry(.49 + plantRandom() * .34, .51 + plantRandom() * .36).toNonIndexed();
    leaf.rotateX((plantRandom() - .5) * 2.45);
    leaf.rotateY(angle + plantRandom() * 2);
    leaf.rotateZ((plantRandom() - .5) * Math.PI);
    leaf.translate(crown.x + Math.cos(angle) * radius, height, crown.z + Math.sin(angle) * radius);
    treePart(leaf, true);
  }
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, vertexColors: true,
    side: THREE.DoubleSide, alphaTest: .35 });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute float aLeaf;
      varying float vLeaf;
      varying vec2 vLeafUV;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vLeaf = aLeaf; vLeafUV = uv;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying float vLeaf;
      varying vec2 vLeafUV;
    `).replace('#include <alphatest_fragment>', `
      #include <alphatest_fragment>
      vec2 leafShape = (vLeafUV - .5) * vec2(2.35, 2.0);
      float serration = sin(vLeafUV.y * 42.0) * .045;
      if (vLeaf > .5 && dot(leafShape, leafShape) > .94 + serration) discard;
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec3 canopyUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      if (vLeaf > .5) normal = normalize(normal * .48 + canopyUp * .74);
    `);
  };
  material.customProgramCacheKey = () => 'ridge-leafy-groves-v2';
  const count = quality === 'low' ? 440 : 1400;
  const forest = new THREE.InstancedMesh(geometry, material, count);
  const random = seededRandom(66110);
  const transform = new THREE.Object3D();
  const groves = [
    // Woodland follows the hillside in unequal groups, rather than evenly
    // scattered trees with exposed gaps between every pair of crowns.
    { d: 96, z: -230, r: 26 }, { d: 162, z: -312, r: 34 },
    { d: 270, z: -287, r: 42 }, { d: 116, z: -450, r: 31 },
    { d: 221, z: -536, r: 39 }, { d: 287, z: -648, r: 33 },
    { d: -112, z: -141, r: 25 }, { d: -204, z: -198, r: 37 },
    { d: -307, z: -182, r: 42 }, { d: -144, z: -298, r: 33 },
    { d: -355, z: -344, r: 44 }, { d: -245, z: -407, r: 35 },
    { d: -120, z: -493, r: 28 }, { d: -329, z: -531, r: 39 },
    { d: -191, z: -625, r: 37 }, { d: -388, z: -653, r: 34 },
  ];
  let i = 0;
  while (i < count) {
    // No miniature tree copies beside the road: they read as rows of balls.
    const rightGrove = random() < .43;
    const grove = groves[rightGrove ? Math.floor(random() * 6) : 6 + Math.floor(random() * 10)];
    const z = grove.z + (random() + random() - 1) * grove.r * 1.55;
    const d = grove.d + (random() + random() - 1) * grove.r;
    const x = ridgeX(z) + d;
    const y = heightAt(x, z);
    const clusters = fbm(x * .012 + 3, z * .015, 3);
    if (Math.abs(d) < 62 || random() > .45 + smoothstep(.3, .7, clusters) * .55
      || (!rightGrove && y > 36)) continue;
    const size = .82 + random() * 1.15;
    transform.position.set(x, y, z);
    transform.rotation.set(0, random() * Math.PI * 2, (random() - .5) * .09);
    transform.scale.set(size * (.8 + random() * .7), size * (.86 + random() * .37), size * (.8 + random() * .7));
    transform.updateMatrix();
    forest.setMatrixAt(i, transform.matrix);
    forest.setColorAt(i, new THREE.Color().setHSL(.28 + random() * .035, .17 + random() * .055,
      .073 + clusters * .028 + random() * .016));
    i++;
  }
  forest.instanceMatrix.needsUpdate = true;
  forest.computeBoundingSphere();
  forest.castShadow = false;
  forest.receiveShadow = true;
  forest.name = 'broken hillside groves and valley woodland';
  return forest;
}

function makeHeather(quality, uniforms) {
  const count = quality === 'low' ? 900 : 2600;
  const random = seededRandom(770132);
  const leafRandom = seededRandom(1813);
  const parts = [];
  for (let i = 0; i < 48; i++) {
    const angle = leafRandom() * Math.PI * 2;
    const height = .12 + leafRandom() * .82;
    const radius = Math.sqrt(leafRandom()) * (.73 - height * .34);
    const leaf = new THREE.PlaneGeometry(.075 + leafRandom() * .085, .13 + leafRandom() * .11).toNonIndexed();
    leaf.rotateX((leafRandom() - .5) * 1.8);
    leaf.rotateY(angle);
    leaf.rotateZ((leafRandom() - .5) * 1.3);
    leaf.translate(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    const tint = .6 + leafRandom() * .6;
    const tip = height > .73 && leafRandom() > .64;
    const color = tip ? [.15 * tint, .16 * tint, .065 * tint] : [.07 * tint, .11 * tint, .035 * tint];
    const colors = [];
    for (let j = 0; j < leaf.getAttribute('position').count; j++) colors.push(...color);
    leaf.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    parts.push(leaf);
  }
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) phases[i] = random() * Math.PI * 2;
  geometry.setAttribute('aShrubPhase', new THREE.InstancedBufferAttribute(phases, 1));
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1,
    vertexColors: true, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute float aShrubPhase;
      uniform float uTime;
      uniform float uWind;
      varying vec2 vHeatherUV;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float breeze = sin(uTime * 1.6 + aShrubPhase) * uWind * .055;
      transformed.x += position.y * position.y * breeze;
      vHeatherUV = uv;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec2 vHeatherUV;
    `).replace('#include <alphatest_fragment>', `
      #include <alphatest_fragment>
      vec2 leaf = (vHeatherUV - .5) * vec2(2.8, 2.0);
      if (dot(leaf, leaf) > .94) discard;
    `);
  };
  material.customProgramCacheKey = () => 'ridge-low-heather-v1';
  const heather = new THREE.InstancedMesh(geometry, material, count);
  const transform = new THREE.Object3D();
  let accepted = 0;
  while (accepted < count) {
    const close = accepted < count * .65;
    const z = close ? 30 - Math.pow(random(), 1.7) * 185 : -60 - random() * 495;
    const side = random() < .40 ? -1 : 1;
    const d = side * (1.55 + Math.pow(random(), 1.4) * (close ? 40 : 60));
    const x = ridgeX(z) + d;
    if (noise2(x * .12 + 64, z * .15) < .33) continue;
    if (Math.abs(d) < 2.6 && noise2(x * .57, z * .37) < .72) continue;
    const size = .26 + random() * .32;
    transform.position.set(x, heightAt(x, z) - .018, z);
    transform.rotation.set((random() - .5) * .1, random() * Math.PI * 2, (random() - .5) * .12);
    transform.scale.set(size * (.8 + random() * .5), size, size * (.8 + random() * .5));
    transform.updateMatrix();
    heather.setMatrixAt(accepted++, transform.matrix);
  }
  heather.instanceMatrix.needsUpdate = true;
  heather.computeBoundingSphere();
  heather.name = 'patches of fine-leaved alpine heather close to the worn trail';
  heather.receiveShadow = true;
  return heather;
}

/** Real geometry across a 1.1 km ridge and 4.4 km alpine range. No background images. */
export function createTerrain(scene, { quality = 'high', foliageCards = typeof document !== 'undefined' } = {}) {
  const group = new THREE.Group();
  group.name = 'alpine ridge terrain';
  const uniforms = {
    uTime: { value: 0 }, uWind: { value: 1 }, uWetness: { value: .87 },
    uGrassColor: { value: new THREE.Color(.119, .169, .102) },
    uRockColor: { value: new THREE.Color(.255, .28, .26) },
    uGroundDiffuse: { value: null }, uGroundNormal: { value: null },
    uGroundRoughness: { value: null }, uGroundMapMix: { value: 0 },
    uFoliageMap: { value: null },
  };
  const groundTextures = [];
  function solidTexture(pixel) {
    const texture = new THREE.DataTexture(new Uint8Array(pixel), 1, 1);
    texture.needsUpdate = true; groundTextures.push(texture); return texture;
  }
  uniforms.uGroundDiffuse.value = solidTexture([128, 128, 128, 255]);
  uniforms.uGroundNormal.value = solidTexture([128, 128, 255, 255]);
  uniforms.uGroundRoughness.value = solidTexture([240, 240, 240, 255]);
  uniforms.uFoliageMap.value = solidTexture([74, 95, 43, 0]);
  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    if (foliageCards) {
      const clump = loader.load('./assets/foliage-clump.png');
      clump.colorSpace = THREE.SRGBColorSpace;
      clump.anisotropy = 8;
      clump.premultiplyAlpha = true;
      uniforms.uFoliageMap.value = clump; groundTextures.push(clump);
    }
    let loaded = 0;
    for (const [uniform, filename, colorSpace] of [
      ['uGroundDiffuse', 'ground-diff.jpg', THREE.SRGBColorSpace],
      ['uGroundNormal', 'ground-nor_gl.jpg', THREE.NoColorSpace],
      ['uGroundRoughness', 'ground-rough.jpg', THREE.NoColorSpace],
    ]) {
      const texture = loader.load(`./assets/pbr/${filename}`, () => {
        loaded++; if (loaded === 3) uniforms.uGroundMapMix.value = .76;
      });
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = colorSpace; texture.anisotropy = 8;
      uniforms[uniform].value = texture; groundTextures.push(texture);
    }
  }
  const nearGeometry = heightfield({
    xSegments: quality === 'low' ? 128 : 224,
    zSegments: quality === 'low' ? 256 : 448,
    xAt: nearSample, zStart: 120, zEnd: -740,
    heightFn: heightAt, curved: true, path: true,
  });
  const near = new THREE.Mesh(nearGeometry, surfaceMaterial(uniforms));
  near.receiveShadow = true;
  near.name = 'broad inclined meadow with a worn contour trail';
  group.add(near);
  const farGeometry = heightfield({
    xSegments: quality === 'low' ? 192 : 384,
    zSegments: quality === 'low' ? 120 : 240,
    xAt: farWidthSample, zAt: farDepthSample,
    heightFn: basinHeight,
  });
  const far = new THREE.Mesh(farGeometry, surfaceMaterial(uniforms, { distant: true, snow: true }));
  far.name = 'eroded distant alpine range with altitude snow';
  group.add(far);
  const foundationGeometry = heightfield({
    xSegments: 32, zSegments: 32,
    xAt: t => (t - .5) * 30000, zStart: 15000, zEnd: -15000,
    heightFn: (x, z) => -160 + fbm(x * .0008 + 37, z * .0009 + 12, 3) * 25,
  });
  const foundation = new THREE.Mesh(foundationGeometry, surfaceMaterial(uniforms, { distant: true }));
  foundation.name = 'continuous valley floor beyond the mountain meshes';
  group.add(foundation);
  const rocks = makeRocks(quality, uniforms);
  const forest = makeForest(quality);
  const heather = makeHeather(quality, uniforms);
  const fineGrass = foliageCards ? makeGrass(quality, uniforms, { detail: true }) : null;
  const grass = makeGrass(quality, uniforms, { foliageCards });
  group.add(rocks, forest, heather);
  if (fineGrass) group.add(fineGrass);
  group.add(grass);
  scene.add(group);
  const stats = {
    terrainVertices: nearGeometry.getAttribute('position').count + farGeometry.getAttribute('position').count
      + foundationGeometry.getAttribute('position').count,
    grassBlades: foliageCards ? fineGrass.count * 4 : grass.count * 4,
    foliageCards: foliageCards ? grass.count * 3 : 0,
    grassTufts: grass.count + (fineGrass?.count || 0),
    rocks: rocks.count,
    trees: forest.count,
    shrubs: foliageCards ? 0 : heather.count,
    width: 1100,
    rangeWidth: 12000,
    ridgeLength: 860,
    drawCalls: 7,
  };
  return {
    heightAt, ridgeX, stats, group,
    update(time, params = {}) {
      uniforms.uTime.value = time;
      uniforms.uWind.value = clamp(params.wind ?? 1, 0, 2);
      const weather = params.weather ?? 'storm';
      uniforms.uWetness.value = weather === 'sunset' ? .25 : weather === 'mist' ? .68 : .92;
      const grassPalette = weather === 'sunset' ? [.185, .216, .122] : weather === 'mist' ? [.143, .193, .131] : [.119, .169, .102];
      uniforms.uGrassColor.value.setRGB(...grassPalette);
      const terrainVisible = params.layers?.terrain !== false;
      near.visible = terrainVisible;
      far.visible = terrainVisible;
      foundation.visible = terrainVisible;
      rocks.visible = terrainVisible;
      forest.visible = terrainVisible;
      grass.visible = params.layers?.grass !== false;
      if (fineGrass) fineGrass.visible = grass.visible;
      heather.visible = !foliageCards && params.layers?.grass !== false;
    },
    dispose() {
      scene.remove(group);
      groundTextures.forEach(texture => texture.dispose());
      group.traverse(object => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material?.dispose();
        object.customDepthMaterial?.dispose();
      });
    },
  };
}
