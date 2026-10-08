import * as THREE from 'three';
function stoneSurface(material) {
  // Colour still comes from the existing albedo/bump asset. Pores only vary the
  // microfacet width; derivative filtering merges them before the distant shimmer.
  material.onBeforeCompile = shader => {
    shader.fragmentShader = `
      float stoneHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float stoneNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
       return mix(mix(stoneHash(i),stoneHash(i+vec2(1.,0.)),f.x),mix(stoneHash(i+vec2(0.,1.)),stoneHash(i+vec2(1.)),f.x),f.y);}
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      #ifdef USE_MAP
       vec2 stoneP=vMapUv*42.;float stoneFootprint=max(length(dFdx(stoneP)),length(dFdy(stoneP)));
       float stonePores=mix(.5,stoneNoise(stoneP),1.-smoothstep(.35,1.25,stoneFootprint));
       float stoneGrain=stoneNoise(vMapUv*5.7);
       roughnessFactor=clamp(roughnessFactor-.085+(stoneGrain-.5)*.09+(stonePores-.5)*.11,.72,1.);
      #endif`);
  };
  material.customProgramCacheKey = () => 'garden-stone-surface-v11';
}
export function createMaterials() {
  const load = (name, repeat = 1) => {
    const t = new THREE.TextureLoader().load('./assets/' + name);t.name=name;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const stoneTex = load('stone-albedo.png');
  const woodTex = load('wood-albedo.png');
  const gravelTex = load('gravel-albedo.png', 27);
  const roofTex = load('roof-albedo.png',1);
  const standard = (color, roughness = 0.8, other = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...other });
  const materials = {
    stone: standard('#cac7b9', 0.93, { map: stoneTex, bumpMap: stoneTex, bumpScale: 0.015 }),
    slab: standard('#898e86', 0.88, { map: stoneTex, bumpMap: stoneTex, bumpScale: 0.018 }),
    moss: standard('#526524', 1),
    gravel: standard('#eee4d2', 0.95, { map: gravelTex, bumpMap: gravelTex, bumpScale: 0.019 }),
    wood: standard('#c9cccf', 0.63, { map: woodTex }),
    timber: standard('#72604e', 0.7, { map: woodTex }),
    plaster: standard('#f1edde', 0.94),
    roof: standard('#929c9e', 0.78, {map:roofTex,bumpMap:roofTex,bumpScale:.009}), roofEdge: standard('#666962', 0.8),
    trunk: standard('#574634', 0.99, { map: woodTex }),
    green: standard('#3c6825', 0.86, { side: THREE.DoubleSide }),
    red: standard('#ad2920', 0.82, { side: THREE.DoubleSide }),
    pondFloor: standard('#7a8571', 1, { map: stoneTex, bumpMap: stoneTex, bumpScale: 0.025 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#78674e', roughness: 0.08, metalness: 0.1,
      transmission: 0, transparent: true, opacity: 0.38, depthWrite: false }),
    interior: standard('#dbc4a5', 0.92),
    cushion: standard('#e1d0b6', 1),
    lamp: standard('#ffe9b8', 0.55, { emissive: '#ffb95c', emissiveIntensity: 1.9 }),
    koiWhite: standard('#eee7d7', 0.3), koiRed: standard('#f16627', 0.27), koiBlack: standard('#252a27', 0.33),
    eye: standard('#0f1512', 0.07),
  };
  for (const name of ['stone', 'slab', 'pondFloor']) stoneSurface(materials[name]);
  for(const [name,material]of Object.entries(materials))material.name=name;
  return materials;
}
export function disposeObject(object) {
  // The caller owns this entire detached import. Resources shared within that
  // import are released once; resources in another live object must not be here.
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  const images = new Set(), visitedArrays = new Set(), visitedUniformValues = new Set();
  const collectTextures = (value, structured = false) => {
    if (!value || typeof value !== 'object') return;
    if (value.isTexture) { textures.add(value); return; }
    const visited = structured ? visitedUniformValues : visitedArrays;
    if (visited.has(value)) return;
    if (Array.isArray(value)) {
      visited.add(value); value.forEach(item => collectTextures(item, structured));
    } else if (structured && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
      visited.add(value); Object.values(value).forEach(item => collectTextures(item, true));
    }
  };
  const collectImages = value => {
    if (Array.isArray(value)) { value.forEach(collectImages); return; }
    // A close() method alone also matches videos and application objects.
    if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) images.add(value);
  };
  object.traverse(o => { if (o.geometry) geometries.add(o.geometry);
    if (o.skeleton) skeletons.add(o.skeleton);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); });
  materials.forEach(m => {
    for (const [key, value] of Object.entries(m)) {
      if (key === 'uniforms') for (const uniform of Object.values(value || {})) collectTextures(uniform?.value, true);
      else collectTextures(value);
    }
  });
  textures.forEach(texture => collectImages(texture.source?.data ?? texture.image));
  geometries.forEach(g => g.dispose());
  skeletons.forEach(skeleton => {
    // Skeleton.dispose owns its bone texture, including a texture also present
    // in the material collection. Do not dispose that texture a second time.
    const boneTexture = skeleton.boneTexture; skeleton.dispose(); textures.delete(boneTexture);
  });
  textures.forEach(texture => texture.dispose());
  images.forEach(image => image.close());
  materials.forEach(material => material.dispose());
}
