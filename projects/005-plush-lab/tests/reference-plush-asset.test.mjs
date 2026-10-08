import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../tooling/node_modules/three/build/three.module.js';
import {createReferencePlushLoader} from '../src/reference-plush-asset.js';

const manifest = () => ({title: 'ChatGPT dots - Felipe', author: 'abstrakt',
  source: 'https://superspl.at/scene/ca6a4c9b', license: 'CC BY 4.0', count: 7,
  bounds: {min: [-1, -2, -1], max: [1, 0, 1]},
  chunks: [{file: '0_0.sog', count: 3, bands: 3, bytes: 30}, {file: '0_1.sog', count: 4, bands: 3, bytes: 40}]});

function fixture({data = manifest(), failChunk, getBands, initialize} = {}) {
  const renderers = [], sources = [], meshes = [], fetches = [];
  class MockSpark extends THREE.Group {
    constructor(options) { super(); this.options = options; this.disposeCount = 0; renderers.push(this); }
    dispose() { this.disposeCount++; }
  }
  class MockSplat extends THREE.Group {
    constructor(options) {
      super(); this.options = options; this.recolor = new THREE.Color(1, 1, 1); this.disposeCount = 0;
      meshes.push(this);
      if (options.splats) {
        this.splats = options.splats;
        this.initialized = Promise.resolve(this);
      } else {
        const index = sources.length % data.chunks.length;
        this.extSplats = {disposeCount: 0, maxSh: 3, prepareFetchSplat() {},
          getNumSplats: () => data.chunks[index].count,
          hasRgbDir: () => true, getNumSh: () => getBands?.(index) ?? 3,
          setMaxSh(value) { this.maxSh = value; }, fetchSplat: value => value,
          forEachSplat() { throw new Error('Do not enumerate/rewrite source attributes.'); },
          dispose() { this.disposeCount++; }};
        this.splats = this.extSplats;
        sources.push(this.extSplats);
        options.onProgress({loaded: 10});
        this.initialized = failChunk === index ? Promise.reject(new Error('decode failed')) :
          Promise.resolve(initialize?.(index)).then(() => this);
      }
    }
    dispose() { this.disposeCount++; this.splats?.dispose(); }
  }
  const ensure = createReferencePlushLoader({manifestUrl: 'https://local.example/assets/reference/manifest.json',
    fetchAsset: async url => { fetches.push(url); return {ok: true, json: async () => data}; },
    loadEngine: async () => ({THREE, SparkRenderer: MockSpark, SplatMesh: MockSplat})});
  return {ensure, renderers, sources, meshes, fetches};
}

test('full SOG chunks and SH3 attach to the existing scene without rewriting native objects', async () => {
  const fx = fixture(), scene = new THREE.Scene(), renderer = {};
  const native = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial());
  native.position.set(2, 3, 4); scene.add(native);
  const geometry = native.geometry, events = [];
  const asset = await fx.ensure({scene, renderer, onProgress: event => events.push(event)});
  assert.equal(asset.count, 7);
  assert.equal(fx.meshes.filter(mesh => mesh.options.url).length, 2);
  assert.deepEqual(fx.meshes.filter(mesh => mesh.options.url).map(mesh => mesh.options.url),
    ['https://local.example/assets/reference/0_0.sog', 'https://local.example/assets/reference/0_1.sog']);
  for (const mesh of fx.meshes) {
    assert.equal(mesh.maxSh, 3);
    assert.equal(mesh.options.lod, false);
    assert.equal(mesh.options.enableLod, false);
  }
  assert.ok(fx.meshes.filter(mesh => mesh.options.url).every(mesh => mesh.options.extSplats));
  assert.equal(fx.renderers[0].options.renderer, renderer);
  assert.equal(fx.renderers[0].options.accumExtSplats, true);
  assert.equal(fx.renderers[0].options.enableLod, false);
  assert.equal(fx.renderers[0].options.sortRadial, false);
  assert.equal(fx.renderers[0].options.focalAdjustment, 2);
  assert.equal(native.parent, scene);
  assert.equal(native.geometry, geometry);
  assert.deepEqual(native.position.toArray(), [2, 3, 4]);
  assert.equal(asset.group.parent, scene);
  assert.equal(events.at(-1).phase, 'ready');
  assert.equal(events.at(-1).loaded, 70);
  assert.equal(events.at(-1).count, 7);
  assert.equal(asset.group.userData.referencePlush.author, 'abstrakt');
  assert.equal(asset.group.userData.referencePlush.license, 'CC BY 4.0');
  asset.dispose();
});

test('concurrent ensure calls share one download, decode and SparkRenderer', async () => {
  const fx = fixture(), scene = new THREE.Scene(), renderer = {}, secondEvents = [];
  const first = fx.ensure({scene, renderer});
  const second = fx.ensure({scene, renderer, onProgress: event => secondEvents.push(event)});
  assert.equal(first, second);
  const asset = await first;
  assert.equal(await fx.ensure({scene, renderer}), asset);
  assert.equal(fx.fetches.length, 1);
  assert.equal(fx.sources.length, 2);
  assert.equal(fx.renderers.length, 1);
  assert.equal(secondEvents.at(-1).phase, 'ready');
  await assert.rejects(fx.ensure({renderer, scene: new THREE.Scene()}), /同一个 scene/);
  asset.dispose();
});

test('centering and uniform normalization preserve a ready instance across hide/show', async () => {
  const fx = fixture(), scene = new THREE.Scene(), asset = await fx.ensure({scene, renderer: {}});
  assert.equal(asset.group.rotation.x, Math.PI);
  assert.deepEqual(asset.group.scale.toArray(), [1.1, 1.1, 1.1]);
  assert.deepEqual(asset.group.children[0].position.toArray(), [-0, 1, -0]);
  const references = [...asset.meshes];
  asset.group.visible = false; asset.group.visible = true;
  assert.deepEqual(asset.meshes, references);
  assert.equal(fx.fetches.length, 1);
  asset.dispose();
});

test('instances reuse all source attributes while tint, pose and disposal stay independent', async () => {
  const fx = fixture(), scene = new THREE.Scene(), asset = await fx.ensure({scene, renderer: {}});
  const parent = new THREE.Group(); scene.add(parent);
  const clone = asset.createInstance({parent, position: [3, 2, 1], height: 1.1});
  assert.equal(clone.group.parent, parent);
  assert.deepEqual(clone.group.position.toArray(), [3, 2, 1]);
  assert.deepEqual(clone.group.scale.toArray(), [.55, .55, .55]);
  assert.equal(clone.meshes[0].splats, asset.meshes[0].splats);
  clone.setTint('#ff0000');
  assert.ok(clone.meshes.every(mesh => mesh.recolor.equals(new THREE.Color('#ff0000'))));
  assert.ok(asset.meshes.every(mesh => mesh.recolor.equals(new THREE.Color(1, 1, 1))));
  clone.resetTint();
  assert.ok(clone.meshes.every(mesh => mesh.recolor.equals(new THREE.Color(1, 1, 1))));
  clone.dispose(); clone.dispose();
  assert.equal(clone.group.parent, null);
  assert.ok(fx.sources.every(source => source.disposeCount === 0));
  assert.equal(fx.renderers[0].disposeCount, 0);
  assert.equal(asset.group.parent, scene);
  asset.dispose(); asset.dispose();
  assert.ok(fx.sources.every(source => source.disposeCount === 1));
  assert.equal(fx.renderers[0].disposeCount, 1);
  assert.throws(() => asset.createInstance(), /已释放/);
});

test('disposal removes only owned objects and a later ensure creates a fresh renderer', async () => {
  const fx = fixture(), scene = new THREE.Scene(), renderer = {}, native = new THREE.Group(); scene.add(native);
  const asset = await fx.ensure({scene, renderer});
  asset.createInstance();
  asset.dispose();
  assert.deepEqual(scene.children, [native]);
  const another = await fx.ensure({scene, renderer});
  assert.notEqual(another, asset);
  assert.equal(fx.renderers.length, 2);
  assert.equal(fx.fetches.length, 2);
  assert.equal(another.group.parent, scene);
  assert.equal(native.parent, scene);
  another.dispose();
});

test('optional world yaw retains the asset coordinate conversion', async () => {
  const fx = fixture(), scene = new THREE.Scene(), asset = await fx.ensure({scene, renderer: {}});
  const rotation = [0, Math.PI / 3, 0], clone = asset.createInstance({rotation});
  const expected = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation))
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)));
  assert.ok(clone.group.quaternion.angleTo(expected) < 1e-7);
  asset.dispose();
});

test('incomplete SH data fails visibly, releases decoded chunks and never attaches a partial asset', async () => {
  const fx = fixture({getBands: index => index === 1 ? 2 : 3}), scene = new THREE.Scene(), native = new THREE.Group();
  scene.add(native);
  await assert.rejects(fx.ensure({scene, renderer: {}}), /球谐数据不完整/);
  assert.deepEqual(scene.children, [native]);
  assert.equal(fx.renderers.length, 0);
  assert.ok(fx.sources.every(source => source.disposeCount === 1));
});

test('a decode failure does not destroy native content or leak already loaded chunks', async () => {
  const fx = fixture({failChunk: 1}), scene = new THREE.Scene();
  await assert.rejects(fx.ensure({scene, renderer: {}}), /decode failed/);
  assert.equal(scene.children.length, 0);
  assert.ok(fx.sources.every(source => source.disposeCount === 1));
});

test('manifest totals and bounds are verified before decoding or attaching the asset', async () => {
  const data = manifest(); data.count++;
  const fx = fixture({data}), scene = new THREE.Scene();
  await assert.rejects(fx.ensure({scene, renderer: {}}), /清单无效/);
  assert.equal(fx.meshes.length, 0);
  assert.equal(fx.renderers.length, 0);
  assert.equal(scene.children.length, 0);
});

test('on-demand render receives dirty callbacks after load, tint and renderer sorting', async () => {
  const fx = fixture(), scene = new THREE.Scene(); let dirty = 0;
  const asset = await fx.ensure({scene, renderer: {}, onDirty: () => { dirty++; }});
  const afterLoad = dirty;
  asset.setTint('#8080ff'); asset.resetTint();
  fx.renderers[0].options.onDirty();
  assert.equal(dirty, afterLoad + 3);
  asset.dispose();
});
