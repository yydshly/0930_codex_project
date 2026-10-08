// Native Three.js integration of the credited, full-resolution Felipe asset.
// Spark 2.3.1 supplies SOG decoding, SH evaluation and worker-backed sorting.
// Source buffers stay intact; optional coat edits are reversible GPU modifiers.
import {createReferenceFurModifier,sanitizeReferenceFur} from './reference-plush-fur.js';
const defaultManifestPath = './assets/reference-plush/manifest.json';
const defaultLoadEngine = async () => {
  const [THREE, spark] = await Promise.all([import('three'), import('@sparkjsdev/spark')]);
  return {THREE, SparkRenderer: spark.SparkRenderer, SplatMesh: spark.SplatMesh,dyno:spark.dyno};
};

function readManifest(value) {
  const validVector = vector => Array.isArray(vector) && vector.length === 3 && vector.every(Number.isFinite);
  if (!value || !Array.isArray(value.chunks) || !value.chunks.length ||
      !validVector(value.bounds?.min) || !validVector(value.bounds?.max) ||
      !value.bounds.max.every((number, index) => number > value.bounds.min[index]) ||
      !Number.isSafeInteger(value.count) || value.count < 1 ||
      !value.chunks.every(chunk => typeof chunk.file === 'string' && chunk.file.length > 0 &&
        Number.isSafeInteger(chunk.count) && chunk.count > 0 && Number.isInteger(chunk.bands) && chunk.bands >= 0 && chunk.bands <= 3) ||
      value.chunks.reduce((total, chunk) => total + chunk.count, 0) !== value.count) {
    throw new Error('原作资产清单无效；没有改变已有创作。');
  }
  return value;
}

// SplatMesh.dispose() disposes its source even when that source is shared.
// A borrowed SplatSource delegates every operation except ownership/disposal.
function borrowSource(source) {
  return {
    dispose() {},
    prepareFetchSplat: () => source.prepareFetchSplat(),
    getNumSplats: () => source.getNumSplats(),
    hasRgbDir: () => source.hasRgbDir(),
    getNumSh: () => source.getNumSh(),
    setMaxSh: maxSh => source.setMaxSh(maxSh),
    fetchSplat: options => source.fetchSplat(options),
    forEachSplat: callback => source.forEachSplat(callback)
  };
}

/**
 * Create an isolated asset cache. Production uses the singleton exported below;
 * tests can inject Spark constructors without needing a browser/WebGL context.
 */
export function createReferencePlushLoader({loadEngine = defaultLoadEngine,
  fetchAsset = (...args) => globalThis.fetch(...args), manifestUrl,
  targetHeight = 2.2, rendererOptions = {}} = {}) {
  const entries = new WeakMap();

  return function ensureReferencePlush({renderer, scene, onProgress, onDirty} = {}) {
    if (!renderer || !scene?.add) return Promise.reject(new Error('原作资产需要已有的 Three.js renderer 和 scene。'));
    if (!Number.isFinite(targetHeight) || targetHeight <= 0) return Promise.reject(new Error('原作显示高度必须大于零。'));
    let entry = entries.get(renderer);
    if (entry) {
      if (entry.scene !== scene) return Promise.reject(new Error('同一个 renderer 的原作资产须使用同一个 scene。'));
      if (typeof onProgress === 'function') entry.progress.add(onProgress);
      if (typeof onDirty === 'function') entry.dirty.add(onDirty);
      if (entry.status && typeof onProgress === 'function') onProgress({...entry.status});
      return entry.promise;
    }

    entry = {scene, progress: new Set(), dirty: new Set(), status: null, promise: null};
    if (typeof onProgress === 'function') entry.progress.add(onProgress);
    if (typeof onDirty === 'function') entry.dirty.add(onDirty);
    entries.set(renderer, entry);
    const emit = status => {
      entry.status = Object.freeze({...status});
      for (const callback of entry.progress) callback({...status});
    };
    const markDirty = () => {
      for (const callback of entry.dirty) callback();
    };

    entry.promise = (async () => {
      const url = new URL(manifestUrl ?? defaultManifestPath,
        globalThis.document?.baseURI ?? 'http://localhost/');
      emit({phase: 'manifest', loaded: 0, total: 0, chunksLoaded: 0, chunksTotal: 0});
      const response = await fetchAsset(url.href);
      if (!response.ok) throw new Error(`原作资产清单加载失败（${response.status}）。`);
      const manifest = readManifest(await response.json());
      const {THREE, SparkRenderer, SplatMesh,dyno} = await loadEngine();
      const sourceMeshes = [], borrowedSources = [], instances = new Set();
      let spark = null, disposed = false;
      const bounds = new THREE.Box3(new THREE.Vector3(...manifest.bounds.min), new THREE.Vector3(...manifest.bounds.max));
      const center = bounds.getCenter(new THREE.Vector3());
      const height = manifest.bounds.max[1] - manifest.bounds.min[1];
      const bytes = manifest.chunks.map(chunk => Math.max(0, Number(chunk.bytes) || 0));
      const totalBytes = bytes.reduce((total, count) => total + count, 0);
      let loadedBytes = 0;

      try {
        // Decode sequentially to avoid six simultaneous temporary SOG/SH buffers.
        for (let index = 0; index < manifest.chunks.length; index++) {
          const chunk = manifest.chunks[index];
          const sourceMesh = new SplatMesh({
            url: new URL(chunk.file, url).href,
            extSplats: true, lod: false, enableLod: false, editable: false,
            onProgress: event => emit({phase: 'loading', loaded: loadedBytes + Math.min(bytes[index] || event.loaded || 0, event.loaded || 0),
              total: totalBytes, chunksLoaded: index, chunksTotal: manifest.chunks.length})
          });
          sourceMeshes.push(sourceMesh);
          sourceMesh.maxSh = 3;
          await sourceMesh.initialized;
          const source = sourceMesh.splats ?? sourceMesh.extSplats ?? sourceMesh.packedSplats;
          if (!source || source.getNumSplats() !== chunk.count || source.getNumSh() < chunk.bands) {
            throw new Error(`原作第 ${index + 1} 块数量或球谐数据不完整；未降级显示。`);
          }
          borrowedSources.push(borrowSource(source));
          loadedBytes += bytes[index];
          emit({phase: 'loading', loaded: loadedBytes, total: totalBytes,
            chunksLoaded: index + 1, chunksTotal: manifest.chunks.length});
        }

        spark = new SparkRenderer({renderer, ...rendererOptions,
          // Extended accumulation avoids re-quantizing fine fur positions.
          accumExtSplats: true, enableLod: false, sortRadial: false,
          focalAdjustment: 2, onDirty: markDirty});
        spark.name = 'reference-plush-spark-renderer';
        scene.add(spark);

        function createInstance({parent = scene, position, rotation, scale = 1,
          height: displayHeight = targetHeight, visible = true} = {}) {
          if (disposed) throw new Error('原作资产已释放，须重新加载。');
          if (!Number.isFinite(displayHeight) || displayHeight <= 0 || !Number.isFinite(scale) || scale <= 0) {
            throw new Error('原作实例需要有效的正数高度和等比缩放。');
          }
          const group = new THREE.Group(), centered = new THREE.Group();
          group.name = 'reference-plush-felipe';
          group.rotation.x = Math.PI;
          group.scale.setScalar(displayHeight / height * scale);
          group.visible = visible;
          if (position) group.position.fromArray(position);
          // Optional rotations describe a world pose, on top of the fixed
          // OpenCV-to-OpenGL conversion, so a yaw cannot turn Felipe upside down.
          if (rotation) group.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));
          centered.position.copy(center).multiplyScalar(-1);
          group.add(centered);
          const furEditors=[];
          const meshes = borrowedSources.map(source => {
            const mesh = new SplatMesh({splats: source, lod: false, enableLod: false, editable: false});
            mesh.maxSh = 3;
            if(dyno){const editor=createReferenceFurModifier({THREE,dyno,source});furEditors.push(editor);mesh.objectModifier=editor.modifier;mesh.updateGenerator();}
            centered.add(mesh);
            return mesh;
          });
          group.userData.referencePlush = {title: manifest.title, author: manifest.author,
            source: manifest.source, license: manifest.license, count: manifest.count, bands: 3};
          parent?.add(group);
          let instanceDisposed = false;
          const instance = {
            group, meshes,
            setFur(style) {
              if(instanceDisposed)return;
              const clean=sanitizeReferenceFur(style);
              furEditors.forEach((editor,index)=>{if(editor.setStyle(clean))meshes[index].needsUpdate=true;});
              markDirty();
            },
            resetFur(){this.setFur(sanitizeReferenceFur());},
            setTint(color) {
              if (instanceDisposed) return;
              const tint = new THREE.Color(color);
              for (const mesh of meshes) mesh.recolor.copy(tint);
              markDirty();
            },
            resetTint() {
              if (instanceDisposed) return;
              for (const mesh of meshes) mesh.recolor.setRGB(1, 1, 1);
              markDirty();
            },
            dispose() {
              if (instanceDisposed) return;
              instanceDisposed = true;
              group.removeFromParent();
              for(const editor of furEditors)editor.dispose();
              for (const mesh of meshes) mesh.dispose();
              instances.delete(instance);
              markDirty();
            }
          };
          instances.add(instance);
          return instance;
        }

        const primary = createInstance();
        const controller = {
          ...primary, spark, manifest, bounds: bounds.clone(), count: manifest.count,
          createInstance,
          dispose() {
            if (disposed) return;
            disposed = true;
            for (const instance of [...instances]) instance.dispose();
            spark.removeFromParent();
            spark.dispose();
            for (const source of sourceMeshes) source.dispose();
            entries.delete(renderer);
            entry.progress.clear();
            entry.dirty.clear();
          }
        };
        emit({phase: 'ready', loaded: totalBytes, total: totalBytes,
          chunksLoaded: manifest.chunks.length, chunksTotal: manifest.chunks.length, count: manifest.count});
        markDirty();
        return controller;
      } catch (error) {
        for (const instance of [...instances]) instance.dispose();
        spark?.removeFromParent();
        spark?.dispose();
        for (const source of sourceMeshes) source.dispose();
        throw error;
      }
    })().catch(error => {
      if (entries.get(renderer) === entry) entries.delete(renderer);
      entry.progress.clear();
      entry.dirty.clear();
      throw error;
    });
    return entry.promise;
  };
}

export const ensureReferencePlush = createReferencePlushLoader();
