import * as THREE from 'three';
import {covarianceFromScaleRotation, sortVisibleSplatIndices, MIN_PIXEL_VARIANCE} from './gaussian-splat-math.js';

// Original forward-renderer implementation of the anisotropic covariance
// projection and Gaussian alpha in Kerbl et al., 3D Gaussian Splatting (2023),
// https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/ . This does not include
// reconstruction/training, the CUDA tile rasterizer, or SH directional lighting.
// Pixel filtering additionally follows Yu et al., Mip-Splatting (CVPR 2024),
// Eq. 10: https://www.cvlibs.net/publications/Yu2024CVPR.pdf . Our implementation
// includes the 2D forward filter only, without the training-time 3D filter.
const vertexShader = /* glsl */`
attribute vec3 aCenter;
attribute vec3 aCovA;
attribute vec3 aCovB;
attribute vec4 aColor;
uniform mat3 uViewLinear;
uniform vec2 uViewport;
uniform float uNear;
uniform float uFar;
uniform float uMinVariance;
uniform float uOpacityCompensation;
varying vec2 vGaussian;
varying vec4 vColor;
varying float vOpacityScale;
void main() {
  vColor=aColor;
  vOpacityScale=1.;
  vGaussian=position.xy*3.;
  vec4 viewCenter=modelViewMatrix*vec4(aCenter,1.);
  vec4 clip=projectionMatrix*viewCenter;
  // Centers behind/through the near plane are rejected before dividing by w.
  // A Gaussian is locally linearized at its center, not intersected in 3D.
  if (!(-viewCenter.z>uNear) || !(-viewCenter.z<uFar) || !(clip.w>1.e-6)) {
    gl_Position=vec4(2.,2.,2.,1.);vColor.a=0.;return;
  }
  mat3 covariance=mat3(aCovA.x,aCovA.y,aCovA.z,
    aCovA.y,aCovB.x,aCovB.y,aCovA.z,aCovB.y,aCovB.z);
  mat3 viewCovariance=uViewLinear*covariance*transpose(uViewLinear);
  vec2 ndc=clip.xy/clip.w;
  // Guard the off-frustum derivative, retaining the true center for clipping.
  vec2 guardedNdc=clamp(ndc,vec2(-1.3),vec2(1.3));
  vec3 rowW=vec3(projectionMatrix[0][3],projectionMatrix[1][3],projectionMatrix[2][3]);
  vec3 jx=(vec3(projectionMatrix[0][0],projectionMatrix[1][0],projectionMatrix[2][0])-guardedNdc.x*rowW)*(uViewport.x*.5/clip.w);
  vec3 jy=(vec3(projectionMatrix[0][1],projectionMatrix[1][1],projectionMatrix[2][1])-guardedNdc.y*rowW)*(uViewport.y*.5/clip.w);
  float rawA=clamp(dot(jx,viewCovariance*jx),0.,1.e12);
  float rawC=clamp(dot(jy,viewCovariance*jy),0.,1.e12);
  float covarianceScale=max(max(rawA,rawC),uMinVariance);
  vec2 normalizedDiagonal=vec2(rawA,rawC)/covarianceScale;
  float crossLimit=sqrt(normalizedDiagonal.x*normalizedDiagonal.y);
  float normalizedCross=clamp(dot(jx,viewCovariance*jy)/covarianceScale,-crossLimit,crossLimit);
  float determinant=max(0.,normalizedDiagonal.x*normalizedDiagonal.y-normalizedCross*normalizedCross);
  float pixelFilter=uMinVariance/covarianceScale;
  float filteredDeterminant=determinant+pixelFilter*(normalizedDiagonal.x+normalizedDiagonal.y)+pixelFilter*pixelFilter;
  // Convolution expands the ellipse and reduces its peak alpha, preserving
  // the individual Gaussian's integrated opacity rather than dilating it.
  float compensation=sqrt(clamp(determinant/filteredDeterminant,0.,1.));
  vOpacityScale=mix(1.,compensation,clamp(uOpacityCompensation,0.,1.));
  float a=rawA+uMinVariance,c=rawC+uMinVariance,b=normalizedCross*covarianceScale;
  float mid=.5*(a+c);
  float disc=length(vec2(.5*(a-c),b));
  vec2 eigenvalues=max(vec2(mid+disc,mid-disc),vec2(uMinVariance));
  vec2 axis=vec2(b,eigenvalues.x-a);
  if(dot(axis,axis)<1.e-10)axis=vec2(eigenvalues.x-c,b);
  if(dot(axis,axis)<1.e-10)axis=vec2(1.,0.);
  axis=normalize(axis);
  // A numerical guard for enormous imported Gaussians/near-plane footprints.
  // It bounds each three-sigma axis to twice the largest viewport dimension.
  float maxStdDev=2.*max(uViewport.x,uViewport.y)/3.;
  vec2 stdDev=min(sqrt(eigenvalues),vec2(maxStdDev));
  vec2 offset=(axis*stdDev.x*vGaussian.x+vec2(-axis.y,axis.x)*stdDev.y*vGaussian.y);
  vec2 radius=3.*(abs(axis)*stdDev.x+abs(vec2(-axis.y,axis.x))*stdDev.y);
  vec2 pixelCenter=(ndc*.5+.5)*uViewport;
  if(any(lessThan(pixelCenter+radius,vec2(0.))) || any(greaterThan(pixelCenter-radius,uViewport))) {
    gl_Position=vec4(2.,2.,2.,1.);vColor.a=0.;return;
  }
  clip.xy+=offset*2./uViewport*clip.w;
  gl_Position=clip;
}
`;
const fragmentShader = /* glsl */`
uniform float uDebug;
varying vec2 vGaussian;
varying vec4 vColor;
varying float vOpacityScale;
void main() {
  float radiusSquared=dot(vGaussian,vGaussian);
  if(radiusSquared>9.)discard;
  float alpha=min(.99,vColor.a*vOpacityScale*exp(-.5*radiusSquared));
  vec3 color=vColor.rgb;
  if(uDebug>.5) {
    float radius=sqrt(radiusSquared);
    float ring=smoothstep(2.55,2.7,radius)*(1.-smoothstep(2.85,3.,radius));
    alpha=min(.65,vColor.a*(.04*exp(-.5*radiusSquared)+.55*ring));
    color=mix(color,vec3(.08,.8,1.),ring);
  }
  if(alpha<1./255.)discard;
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const finiteTuple = (value, length, name) => {
  if ((!Array.isArray(value) && !ArrayBuffer.isView(value)) || value.length !== length
    || !Array.from(value).every(Number.isFinite)) throw new TypeError(`Gaussian ${name} must contain ${length} finite numbers.`);
};

function packDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.splats)) throw new TypeError('Gaussian dataset must contain a splats array.');
  const count = dataset.splats.length;
  const centers = new Float32Array(count * 3), covariance = new Float32Array(count * 6), colors = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const splat = dataset.splats[i];
    if (!splat) throw new TypeError(`Gaussian ${i} is missing.`);
    finiteTuple(splat.position, 3, 'position'); finiteTuple(splat.scale, 3, 'scale');
    finiteTuple(splat.rotation, 4, 'rotation'); finiteTuple(splat.color, 3, 'linear color');
    if (!Array.from(splat.scale).every(value => value > 0)) throw new RangeError('Gaussian standard deviations must be positive.');
    if (Math.abs(Math.hypot(...splat.rotation) - 1) > 1e-3) throw new RangeError('Gaussian rotation must be a normalized quaternion.');
    if (!Array.from(splat.color).every(value => value >= 0 && value <= 1)
      || !Number.isFinite(splat.opacity) || splat.opacity < 0 || splat.opacity > 1) {
      throw new RangeError('Gaussian linear colors and opacity must lie in [0, 1].');
    }
    centers.set(splat.position, i * 3);
    covariance.set(covarianceFromScaleRotation(Array.from(splat.scale), splat.rotation), i * 6);
    colors.set([...splat.color, splat.opacity], i * 4);
  }
  // Float32 overflow must never reach the shader, even from a finite JSON value.
  if (!centers.every(Number.isFinite) || !covariance.every(Number.isFinite)) throw new RangeError('Gaussian geometry exceeds the Float32 rendering range.');
  return {centers, covariance, colors, count};
}

function makeGeometry(count) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [name, itemSize] of [['aCenter', 3], ['aCovA', 3], ['aCovB', 3], ['aColor', 4]]) {
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(count * itemSize), itemSize).setUsage(THREE.DynamicDrawUsage));
  }
  geometry.instanceCount = 0;
  return geometry;
}

/**
 * Anisotropic 3D Gaussians rendered as projected three-sigma elliptical quads.
 * Dataset colors are LINEAR RGB. Call update after changing camera/object
 * transforms; viewport dimensions must be drawing-buffer pixels (not CSS px).
 * Whole-splat CPU center-depth sorting approximates intersecting Gaussian order.
 * uMinVariance controls the positive pixel-filter variance (default .1px^2).
 * uOpacityCompensation=1 preserves each filtered Gaussian's alpha integral;
 * set it to 0 only when comparing with legacy uncompensated screen dilation.
 */
export class GaussianSplatMesh extends THREE.Mesh {
  constructor(dataset) {
    const material = new THREE.ShaderMaterial({vertexShader, fragmentShader,
      uniforms: {uViewLinear: {value: new THREE.Matrix3()}, uViewport: {value: new THREE.Vector2(1, 1)},
        uNear: {value: .01}, uFar: {value: 1e30}, uMinVariance: {value: MIN_PIXEL_VARIANCE},
        uOpacityCompensation: {value: 1}, uDebug: {value: 0}},
      transparent: true, blending: THREE.NormalBlending, depthTest: true, depthWrite: false,
      toneMapped: true, side: THREE.DoubleSide});
    super(makeGeometry(0), material);
    this.name = 'Gaussian splats';
    this.frustumCulled = false;
    this._modelView = new THREE.Matrix4();
    this._lastView = null;
    this._disposed = false;
    this.sortedIndices = [];
    this.userData.sortCount = 0;
    this.setDataset(dataset);
  }

  setDataset(dataset) {
    if (this._disposed) throw new Error('GaussianSplatMesh has been disposed.');
    const packed = packDataset(dataset), geometry = makeGeometry(packed.count);
    const previousGeometry = this.geometry;
    this.geometry = geometry;
    this._packed = packed;
    this.dataset = dataset;
    this.splatCount = packed.count;
    this.sortedIndices = [];
    this._lastView = null;
    this.userData.gaussianSplatCount = packed.count;
    this.userData.visibleSplatCount = 0;
    previousGeometry.dispose();
    return this;
  }

  update(camera, viewportWidth, viewportHeight) {
    if (this._disposed) throw new Error('GaussianSplatMesh has been disposed.');
    if (!camera?.isCamera) throw new TypeError('GaussianSplatMesh.update requires a Three.js camera.');
    if (![viewportWidth, viewportHeight].every(Number.isFinite) || viewportWidth <= 0 || viewportHeight <= 0) {
      throw new RangeError('GaussianSplatMesh viewport dimensions must be positive pixels.');
    }
    camera.updateWorldMatrix(true, false);
    this.updateWorldMatrix(true, false);
    this._modelView.multiplyMatrices(camera.matrixWorldInverse, this.matrixWorld);
    const uniforms = this.material.uniforms;
    uniforms.uViewport.value.set(viewportWidth, viewportHeight);
    uniforms.uViewLinear.value.setFromMatrix4(this._modelView);
    const near = Math.max(Number.isFinite(camera.near) ? camera.near : .01, 1e-4);
    const far = Number.isFinite(camera.far) ? camera.far : 1e30;
    uniforms.uNear.value = near;
    uniforms.uFar.value = far;
    const view = this._modelView.elements;
    if (this._lastView && this._lastNear === near && this._lastFar === far && view.every((value, i) => value === this._lastView[i])) return this;
    const {centers, covariance, colors} = this._packed;
    const indices = sortVisibleSplatIndices(centers, view, near, far);
    const attributes = this.geometry.attributes;
    const centerOut = attributes.aCenter.array, covarianceAOut = attributes.aCovA.array;
    const covarianceBOut = attributes.aCovB.array, colorOut = attributes.aColor.array;
    for (let drawIndex = 0; drawIndex < indices.length; drawIndex++) {
      const sourceIndex = indices[drawIndex];
      const src3 = sourceIndex * 3, src6 = sourceIndex * 6, src4 = sourceIndex * 4;
      const out3 = drawIndex * 3, out4 = drawIndex * 4;
      // Avoid allocating four typed-array views for every splat on every orbit.
      for (let component = 0; component < 3; component++) {
        centerOut[out3 + component] = centers[src3 + component];
        covarianceAOut[out3 + component] = covariance[src6 + component];
        covarianceBOut[out3 + component] = covariance[src6 + 3 + component];
        colorOut[out4 + component] = colors[src4 + component];
      }
      colorOut[out4 + 3] = colors[src4 + 3];
    }
    for (const name of ['aCenter', 'aCovA', 'aCovB', 'aColor']) attributes[name].needsUpdate = true;
    this.geometry.instanceCount = indices.length;
    this.sortedIndices = indices;
    this.userData.visibleSplatCount = indices.length;
    this.userData.sortCount++;
    this._lastView = view.slice();
    this._lastNear = near; this._lastFar = far;
    return this;
  }

  dispose() {
    if (this._disposed) return;
    this.geometry.dispose();
    this.material.dispose();
    this._disposed = true;
  }
}
