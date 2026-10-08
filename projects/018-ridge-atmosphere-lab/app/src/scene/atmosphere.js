import * as THREE from 'three';
import { createVolumetricFog } from './volumetric-fog.js';
import { seededRandom } from './math.js';

const noiseGLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * .3183099 + vec3(.13, .31, .19));
    p *= 17.;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float value = 0., amplitude = .5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec3(13.2, 7.1, 19.7);
      amplitude *= .5;
    }
    return value;
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    gl_Position = clip.xyww;
  }
`;

const skyFragment = /* glsl */ `
  precision highp float;
  varying vec3 vDirection;
  uniform float uTime, uClouds, uSun;
  uniform vec3 uZenith, uHorizon, uCloudLight, uCloudDark;
  ${noiseGLSL}
  void main() {
    vec3 ray = normalize(vDirection);
    float elevation = max(ray.y, 0.);
    vec3 base = mix(uHorizon, uZenith, pow(elevation, .6));
    // Diffuse blue-grey cover has restrained structure like the reference.
    vec2 projected = ray.xz / max(ray.y + .42, .28);
    vec3 p = vec3(projected * .8, .36);
    p.x += uTime * .0025;
    p.y += uTime * .0007;
    float broad = fbm(p);
    float detail = fbm(p * 2.4 + broad);
    float underside = smoothstep(.22, .75, broad * .7 + detail * .4);
    vec3 cloud = mix(uCloudLight, uCloudDark, underside * .74);
    cloud += (detail - .5) * .023;
    vec3 color = mix(base, cloud, uClouds * smoothstep(-.1, .22, ray.y) * .72);
    float glow = pow(max(dot(ray, normalize(vec3(-.6, .31, -1.))), 0.), 5.);
    color += glow * uSun * vec3(.045, .041, .029);
    color = mix(color, uHorizon, (1. - smoothstep(0., .17, abs(ray.y))) * .5);
    // Sky radiance alone is lower: meadow lighting and pale fog stay intact.
    gl_FragColor = vec4(color * .78, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const fleckVertex = /* glsl */ `
  uniform float uTime, uViewportHeight;
  attribute float aSize;
  varying float vOpacity;
  void main() {
    vec3 p = position;
    p.x = mod(p.x + uTime * .72 + 20., 40.) - 20.;
    p.z = mod(p.z + uTime * .24 + 20., 40.) - 20.;
    p.y = mod(p.y - uTime * .12 + 8., 18.) - 8.;
    vec4 view = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(aSize * projectionMatrix[1][1] * uViewportHeight / max(-view.z, .1), .8, 3.1);
    float distance = length(view.xyz);
    vOpacity = smoothstep(1., 4., distance) * (1. - smoothstep(18., 37., distance));
  }
`;
const fleckFragment = /* glsl */ `
  varying float vOpacity;
  void main() {
    vec2 q = (gl_PointCoord - .5) * vec2(1.2, .85);
    float alpha = (1. - smoothstep(.11, .25, dot(q, q))) * vOpacity * .29;
    if (alpha < .008) discard;
    gl_FragColor = vec4(vec3(.77, .83, .85), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createFlecks(scene, camera, renderer, phase, quality) {
  const count = quality === 'low' ? 28 : 72;
  const random = seededRandom(210607);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = random() * 40 - 20;
    positions[i * 3 + 1] = random() * 18 - 8;
    positions[i * 3 + 2] = random() * 40 - 20;
    sizes[i] = .022 + random() * .025;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: fleckVertex, fragmentShader: fleckFragment,
    uniforms: { uTime: phase, uViewportHeight: { value: 1080 } },
    transparent: true, depthWrite: false, depthTest: true, fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'Atmosphere · sparse windborne flecks';
  points.frustumCulled = false;
  points.renderOrder = 10;
  scene.add(points);
  const viewport = new THREE.Vector2();
  let initialized = false;
  return {
    update(delta) {
      // The field catches up slowly with the moving camera. A stopped simulation
      // freezes its origin and phase, even while the free camera is rotated.
      if (delta < 0 || (!initialized && camera.position.lengthSq() > 0)) {
        points.position.copy(camera.position);
        initialized = true;
      } else if (delta > 0) {
        points.position.lerp(camera.position, 1. - Math.exp(-Math.min(delta, .1) * .35));
      }
      if (renderer.getDrawingBufferSize) {
        renderer.getDrawingBufferSize(viewport);
        material.uniforms.uViewportHeight.value = viewport.y;
      }
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

const WEATHER = {
  storm: {
    zenith: '#617680', horizon: '#7b939a', light: '#81939b', dark: '#647d86',
    fog: '#9eb3c0', cloud: '#a4b6bd', hemiSky: '#c4d3db', ground: '#69705f',
    sun: '#d0ddd5', density: .00057, key: 1.12, fill: 2.2,
  },
  mist: {
    zenith: '#9cabb6', horizon: '#c0ced2', light: '#c1cdd0', dark: '#9dafb7',
    fog: '#b0c5cf', cloud: '#c3d4dc', hemiSky: '#d7e3e6', ground: '#707461',
    sun: '#e0e3d7', density: .00099, key: 1.27, fill: 2.3,
  },
  sunset: {
    zenith: '#8197a9', horizon: '#c3bbb0', light: '#cbc0af', dark: '#97a0a4',
    fog: '#a8b9c0', cloud: '#c4cbc7', hemiSky: '#cad2d7', ground: '#756854',
    sun: '#f0d3a9', density: .00057, key: 1.85, fill: 1.8,
  },
};

/** Restrained overcast light and depth-clipped 3D pockets of valley mist. */
export function createAtmosphere(scene, camera, renderer, { quality = 'high' } = {}) {
  const phase = { value: 0 };
  const skyUniforms = {
    uTime: phase, uClouds: { value: 1 }, uSun: { value: .32 },
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uCloudLight: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() },
  };
  const skyGeometry = new THREE.SphereGeometry(5200, quality === 'low' ? 24 : 32, 16);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms, vertexShader: skyVertex, fragmentShader: skyFragment,
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.name = 'Atmosphere · procedural storm sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);
  const volume = createVolumetricFog(scene, camera, renderer, { quality, phase });
  const flecks = createFlecks(scene, camera, renderer, phase, quality);

  const hemi = new THREE.HemisphereLight(0xc4d3db, 0x69705f, 2.2);
  hemi.name = 'Atmosphere · overcast diffuse light';
  const key = new THREE.DirectionalLight(0xd0ddd5, 1.1);
  key.name = 'Atmosphere · concealed sun';
  key.position.set(-120, 170, -80);
  key.target.position.set(0, 0, -100);
  // The renderer owns the moving rider shadow frustum and shadow enable state.
  key.castShadow = quality !== 'low';
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 24;
  key.shadow.camera.bottom = -24;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 350;
  key.shadow.bias = -.00012;
  key.shadow.normalBias = .15;
  key.shadow.radius = 3;
  scene.add(hemi, key, key.target);

  const previousFog = scene.fog;
  const fog = new THREE.FogExp2(0x9eb3c0, .00057);
  scene.fog = fog;
  const color = new THREE.Color();
  const smooth = (target, value, delta) => target.lerp(color.set(value), delta);
  let disposed = false;
  let previousSimulationTime = 0;
  let driftTime = 0;

  function update(time = 0, params = {}) {
    if (disposed) return;
    const simulationDelta = time - previousSimulationTime;
    const delta = Math.min(Math.max(simulationDelta, .016), .1);
    const blend = 1 - Math.exp(-delta * 3.0);
    const weather = WEATHER[params.weather] || WEATHER.storm;
    const fogAmount = THREE.MathUtils.clamp(params.fog ?? .58, 0, 1);
    const wind = THREE.MathUtils.clamp(params.wind ?? 1, 0, 2);
    // Wind modifies velocity, never accumulated displacement. Pausing freezes
    // this shared phase in the sky and the 3D density texture together.
    driftTime = simulationDelta < 0 ? 0 : driftTime + simulationDelta * wind;
    previousSimulationTime = time;
    phase.value = driftTime;
    flecks.update(simulationDelta);
    const sun = THREE.MathUtils.clamp(params.sun ?? .32, 0, 1);
    const fogEnabled = params.layers?.fog !== false;
    const cloudsEnabled = params.layers?.clouds !== false;
    sky.position.copy(camera.position);
    skyUniforms.uClouds.value = cloudsEnabled ? 1 : 0;
    skyUniforms.uSun.value = sun;
    smooth(skyUniforms.uZenith.value, weather.zenith, blend);
    smooth(skyUniforms.uHorizon.value, weather.horizon, blend);
    smooth(skyUniforms.uCloudLight.value, weather.light, blend);
    smooth(skyUniforms.uCloudDark.value, weather.dark, blend);
    smooth(fog.color, weather.fog, blend);
    const density = fogEnabled ? weather.density * (.36 + fogAmount * .83) : 0;
    fog.density = THREE.MathUtils.lerp(fog.density, density, blend);
    volume.uniforms.uEnabled.value = cloudsEnabled ? 1 : 0;
    volume.uniforms.uFog.value = fogAmount;
    volume.uniforms.uSun.value = sun;
    smooth(volume.uniforms.uColor.value, weather.cloud, blend);
    smooth(hemi.color, weather.hemiSky, blend);
    smooth(hemi.groundColor, weather.ground, blend);
    smooth(key.color, weather.sun, blend);
    hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, weather.fill, blend);
    key.intensity = THREE.MathUtils.lerp(key.intensity, weather.key * (.6 + sun * .6), blend);
  }

  const initial = WEATHER.storm;
  skyUniforms.uZenith.value.set(initial.zenith);
  skyUniforms.uHorizon.value.set(initial.horizon);
  skyUniforms.uCloudLight.value.set(initial.light);
  skyUniforms.uCloudDark.value.set(initial.dark);
  volume.uniforms.uColor.value.set(initial.cloud);
  update(0);

  return {
    update,
    render: volume.render,
    sun: key,
    stats: { cloudLayers: 0, volumeSteps: quality === 'low' ? 16 : 28, procedural: true, skyPasses: 1, fog: 'depth-clipped volumetric valley' },
    dispose() {
      if (disposed) return;
      disposed = true;
      [sky, hemi, key, key.target].forEach(object => scene.remove(object));
      skyGeometry.dispose();
      skyMaterial.dispose();
      volume.dispose();
      flecks.dispose();
      key.shadow.map?.dispose();
      if (scene.fog === fog) scene.fog = previousFog;
    },
  };
}
