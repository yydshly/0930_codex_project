import * as THREE from 'three';
import { noise2 } from './math.js';

const vertex = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  in vec2 vUv;
  uniform sampler2D uScene, uDepth;
  uniform sampler3D uNoise;
  uniform mat4 uInverseProjection, uCameraWorld;
  uniform vec3 uCamera, uColor, uGrade;
  uniform float uTime, uFog, uEnabled, uSun;
  out vec4 outputColor;
  #define gl_FragColor outputColor

  float pocket(vec3 point, vec3 center, vec3 radius) {
    vec3 q = (point - center) / radius;
    return exp(-dot(q, q) * 1.75);
  }
  float densityAt(vec3 p) {
    // Separate weather pockets inhabit the left basin and the higher right
    // shoulder. No horizontal sheets or silhouette-shaped backdrop planes.
    float field = pocket(p, vec3(-170., 27., -220.), vec3(220., 12., 180.)) * .82;
    field += pocket(p, vec3(-265., 6., -490.), vec3(280., 17., 250.)) * .65;
    field += pocket(p, vec3(-500., -14., -950.), vec3(540., 24., 440.)) * .66;
    field += pocket(p, vec3(150., 63., -245.), vec3(210., 8., 185.)) * .88;
    field += pocket(p, vec3(325., 38., -760.), vec3(270., 15., 350.)) * .35;
    field += pocket(p, vec3(-300., 38., -1450.), vec3(700., 18., 530.)) * .27;
    vec3 drift = vec3(uTime * 1.9, uTime * .09, uTime * .6);
    vec3 domain = (p + drift) * vec3(.00145, .0038, .0016);
    float billow = texture(uNoise, domain).r;
    float curl = texture(uNoise, domain * 4.2 + vec3(.23, .44, .76)).r;
    float mass = smoothstep(.37, .73, billow * .77 + curl * .33);
    // Small eddies break up each pocket while preserving open meadow and trail.
    float nearbyClear = smoothstep(20., 70., length(p.xz - uCamera.xz));
    float trailX = mix(0., 67., smoothstep(-20., 490., -p.z));
    float trailClear = mix(.1, 1., smoothstep(26., 78., abs(p.x - trailX)));
    return field * mass * nearbyClear * trailClear * .013 * uFog;
  }
  vec2 intersectBox(vec3 origin, vec3 ray) {
    vec3 invRay = 1. / (ray + vec3(.000001));
    vec3 a = (vec3(-2000., -105., -2500.) - origin) * invRay;
    vec3 b = (vec3(1600., 145., 160.) - origin) * invRay;
    vec3 lo = min(a, b), hi = max(a, b);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
  }
  void main() {
    vec3 base = texture(uScene, vUv).rgb;
    float sceneDepth = texture(uDepth, vUv).r;
    vec4 viewPoint = uInverseProjection * vec4(vUv * 2. - 1., sceneDepth * 2. - 1., 1.);
    viewPoint.xyz /= viewPoint.w;
    vec3 ray = normalize(mat3(uCameraWorld) * viewPoint.xyz);
    float surfaceDistance = sceneDepth > .999999 ? 8000. : length(viewPoint.xyz);
    vec2 bounds = intersectBox(uCamera, ray);
    float start = max(bounds.x, 0.);
    // The exact scene depth terminates integration at opaque terrain, horse,
    // rider and vegetation. Fog never leaks through a mountain silhouette.
    float end = min(bounds.y, surfaceDistance);
    vec3 accumulated = vec3(0.);
    float transmittance = 1.;
    if (uEnabled > .5 && end > start) {
      float stepLength = (end - start) / float(FOG_STEPS);
      float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      for (int i = 0; i < FOG_STEPS; i++) {
        vec3 p = uCamera + ray * (start + (float(i) + .25 + jitter * .5) * stepLength);
        float density = densityAt(p);
        float alpha = 1. - exp(-density * stepLength);
        // Diffuse cold skylight; a slight height falloff gives volume and soft
        // self-shading without an expensive second light ray per sample.
        float illumination = .87 + .16 * smoothstep(-30., 85., p.y) + uSun * .035;
        accumulated += transmittance * alpha * uColor * illumination;
        transmittance *= 1. - alpha;
        if (transmittance < .025) break;
      }
    }
    outputColor = vec4((base * transmittance + accumulated) * uGrade, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function makeNoiseTexture() {
  const size = 48;
  const data = new Uint8Array(size ** 3);
  // Tileable smooth noise is built once on the CPU. A hardware 3D texture costs
  // far less than hashing several FBM octaves for every raymarch sample.
  const random = new Float32Array(12 ** 3);
  for (let z = 0; z < 12; z++) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    random[x + y * 12 + z * 144] = noise2(x * 11.137 + z * 3.211, y * 7.793 + z * 21.811);
  }
  const sample = (x, y, z) => random[((x + 12) % 12) + ((y + 12) % 12) * 12 + ((z + 12) % 12) * 144];
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const ix = x >> 2, iy = y >> 2, iz = z >> 2;
    const fade = f => f * f * (3 - 2 * f);
    const fx = fade((x % 4) / 4), fy = fade((y % 4) / 4), fz = fade((z % 4) / 4);
    const mix = (a, b, t) => a + (b - a) * t;
    const a = mix(mix(sample(ix, iy, iz), sample(ix + 1, iy, iz), fx), mix(sample(ix, iy + 1, iz), sample(ix + 1, iy + 1, iz), fx), fy);
    const b = mix(mix(sample(ix, iy, iz + 1), sample(ix + 1, iy, iz + 1), fx), mix(sample(ix, iy + 1, iz + 1), sample(ix + 1, iy + 1, iz + 1), fx), fy);
    data[x + y * size + z * size * size] = Math.round(mix(a, b, fz) * 255);
  }
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** One scene pass with a real depth buffer, followed by a bounded volume pass. */
export function createVolumetricFog(scene, camera, renderer, { quality, phase }) {
  const uniforms = {
    uTime: phase, uFog: { value: .64 }, uEnabled: { value: 1 }, uSun: { value: .32 },
    uColor: { value: new THREE.Color('#b4c5ce') }, uCamera: { value: camera.position },
    uGrade: { value: new THREE.Vector3(1, 1, 1) },
    uScene: { value: null }, uDepth: { value: null }, uNoise: { value: makeNoiseTexture() },
    uInverseProjection: { value: new THREE.Matrix4() }, uCameraWorld: { value: new THREE.Matrix4() },
  };
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, fragmentShader: fragment,
    defines: { FOG_STEPS: quality === 'low' ? 16 : 28 }, glslVersion: THREE.GLSL3,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  quad.name = 'Atmosphere · depth-clipped valley volume';
  const postScene = new THREE.Scene();
  postScene.add(quad);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();
  let target;
  let disposed = false;
  return {
    uniforms,
    render() {
      if (disposed) return;
      renderer.getDrawingBufferSize(size);
      if (!target) {
        target = new THREE.WebGLRenderTarget(size.x, size.y, {
          type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          depthBuffer: true, samples: quality === 'low' ? 0 : 2,
        });
        target.depthTexture = new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType);
        uniforms.uScene.value = target.texture;
        uniforms.uDepth.value = target.depthTexture;
      } else if (target.width !== size.x || target.height !== size.y) {
        target.setSize(size.x, size.y);
      }
      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      const previousInfoAutoReset = renderer.info?.autoReset;
      camera.updateMatrixWorld();
      uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
      uniforms.uCameraWorld.value.copy(camera.matrixWorld);
      try {
        renderer.autoClear = true;
        if (renderer.info) {
          renderer.info.autoReset = false;
          renderer.info.reset();
        }
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(previousTarget);
        renderer.render(postScene, postCamera);
      } finally {
        renderer.setRenderTarget(previousTarget);
        renderer.autoClear = previousAutoClear;
        if (renderer.info) renderer.info.autoReset = previousInfoAutoReset;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      target?.dispose();
      geometry.dispose();
      material.dispose();
      uniforms.uNoise.value.dispose();
    },
  };
}
