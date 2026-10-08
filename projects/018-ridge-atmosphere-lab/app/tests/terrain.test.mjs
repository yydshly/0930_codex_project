import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTerrain, heightAt, ridgeX } from '../src/scene/terrain.js';

test('ridge route stays finite and continuous for the entire horse journey', () => {
  let previousHeight = heightAt(ridgeX(40), 40);
  let previousX = ridgeX(40);
  for (let z = 39; z >= -450; z--) {
    const x = ridgeX(z);
    const height = heightAt(x, z);
    assert.ok(Number.isFinite(height));
    assert.ok(height > 39 && height < 65, `route height ${height} at ${z}`);
    assert.ok(Math.abs(height - previousHeight) < .5, `height change at ${z}`);
    assert.ok(Math.abs(x - previousX) < .5, `curve change at ${z}`);
    assert.ok(Number.isFinite(heightAt(x + 75, z)), `right slope at ${z}`);
    assert.ok(heightAt(x - 75, z) < height - 12, `meadow slopes toward the left valley at ${z}`);
    assert.ok(heightAt(x + 75, z) - height < 24, `right hillside becomes a cliff at ${z}`);
    const shoulderAverage = (heightAt(x - 3, z) + heightAt(x + 3, z)) * .5;
    assert.ok(shoulderAverage - height < .18, `trail is carved below both shoulders at ${z}`);
    previousHeight = height;
    previousX = x;
  }
});

test('terrain is real finite geometry and respects individual layer toggles', () => {
  const scene = new THREE.Scene();
  const terrain = createTerrain(scene, { quality: 'low' });
  assert.equal(scene.children.length, 1);
  assert.equal(terrain.stats.grassBlades, 88000);
  assert.equal(terrain.stats.grassTufts, 22000);
  assert.ok(terrain.stats.terrainVertices > 40000);
  const basin = terrain.group.children[1].geometry.getAttribute('position');
  assert.equal(basin.getZ(0), 2500, 'valley continues behind the orbit camera');
  assert.equal(basin.getX(0), -6000, 'valley covers the outer ridge edges');
  const overlapVertex = 24 * 193 + 96;
  assert.ok(Math.abs(basin.getY(overlapVertex) - (heightAt(0, -650) - 2)) < .0001,
    'basin continues the foreground surface below the near mesh');
  assert.equal(terrain.group.children[2].geometry.getAttribute('position').getX(0), -15000,
    'a valley floor spans beyond the visible terrain edges');
  for (const object of terrain.group.children) {
    const array = object.geometry.getAttribute('position').array;
    assert.ok(Array.from(array).every(Number.isFinite));
  }
  const grass = terrain.group.children.at(-1);
  const localBounds = new THREE.Box3().setFromBufferAttribute(grass.geometry.getAttribute('position'));
  const matrix = new THREE.Matrix4(), size = new THREE.Vector3();
  for (let i = 0; i < grass.count; i += 251) {
    grass.getMatrixAt(i, matrix);
    localBounds.clone().applyMatrix4(matrix).getSize(size);
    assert.ok(size.y < .31, `tuft ${i} exceeds alpine cover height: ${size.y}`);
    assert.ok(Math.max(size.x, size.z) < .16, `tuft ${i} spreads like an oversized leaf card`);
  }
  terrain.update(10, { wind: 2, layers: { grass: false, terrain: true } });
  assert.equal(terrain.group.children.at(-1).visible, false);
  assert.equal(terrain.group.children[0].visible, true);
  terrain.update(11, { wind: 0, layers: { grass: true, terrain: false } });
  assert.equal(terrain.group.children.at(-1).visible, true);
  assert.equal(terrain.group.children[0].visible, false);
  terrain.dispose();
  assert.equal(scene.children.length, 0);
});

test('image-derived foliage clumps keep physical scale and cover the full horse journey', () => {
  const scene = new THREE.Scene();
  const terrain = createTerrain(scene, { quality: 'low', foliageCards: true });
  const clumps = terrain.group.children.at(-1);
  assert.ok(clumps.count >= 15000 && clumps.count < 24000, 'cover stays inside the narrow-screen instance budget');
  assert.equal(clumps.geometry.index.count / 3, 6, 'three crossed cards use six triangles per clump');
  assert.equal(clumps.material.alphaTest, .4);
  assert.equal(clumps.material.depthWrite, true);
  assert.equal(clumps.material.side, THREE.DoubleSide);
  const local = new THREE.Box3().setFromBufferAttribute(clumps.geometry.getAttribute('position'));
  const matrix = new THREE.Matrix4(), size = new THREE.Vector3(), position = new THREE.Vector3();
  const routeSections = [0, 0, 0, 0];
  for (let i = 0; i < clumps.count; i += 17) {
    clumps.getMatrixAt(i, matrix);
    local.clone().applyMatrix4(matrix).getSize(size);
    assert.ok(size.y > .15 && size.y < .34, `clump ${i} height exceeds low meadow cover size`);
    assert.ok(Math.max(size.x, size.z) < 1.10, `clump ${i} has an oversized flat card`);
    position.setFromMatrixPosition(matrix);
    if (position.z <= 40 && position.z > -420 && Math.abs(position.x - ridgeX(position.z)) < 14)
      routeSections[Math.min(3, Math.floor((40 - position.z) / 115))]++;
  }
  assert.ok(routeSections.every(count => count > 120), `cover becomes sparse mid-journey: ${routeSections}`);
  const fineGrass = terrain.group.children.find(object => object.name.startsWith('fine grass'));
  assert.ok(fineGrass, 'fine grass adds a broken silhouette among the crossed cards');
  const grassTriangles = clumps.count * clumps.geometry.index.count / 3
    + fineGrass.count * fineGrass.geometry.index.count / 3;
  assert.ok(grassTriangles < 192000, `low-detail cover exceeds its meadow budget: ${grassTriangles}`);
  const forest = terrain.group.children.find(object => object.name === 'broken hillside groves and valley woodland');
  const forestPosition = new THREE.Vector3();
  for (let i = 0; i < forest.count; i += 17) {
    forest.getMatrixAt(i, matrix);
    forestPosition.setFromMatrixPosition(matrix);
    assert.ok(Math.abs(forestPosition.x - ridgeX(forestPosition.z)) > 55,
      'a miniature woodland tree is being used as a roadside shrub');
  }
  terrain.update(4, { layers: { grass: false } });
  assert.equal(clumps.visible, false);
  assert.equal(fineGrass.visible, false);
  terrain.dispose();
  assert.equal(scene.children.length, 0);
});
