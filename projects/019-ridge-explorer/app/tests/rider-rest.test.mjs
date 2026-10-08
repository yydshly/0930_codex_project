import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRider } from '../src/scene/rider.js';

test('a released airborne canter settles as a connected rider, while photography preserves the exact pose', async () => {
  const buffer = await readFile(new URL('../public/assets/horse.glb', import.meta.url));
  const scene = new THREE.Scene();
  const rider = createRider(scene, { loadHorse: () => new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '') });
  await rider.ready;
  let airborne = false;
  for (let i = 0; i < 60; i++) {
    rider.update(i / 60, 1 / 60, .7, true);
    if (rider.measurements.hoofClearance > .3) { airborne = true; break; }
  }
  assert.ok(airborne, 'test uses a true airborne frame from the supplied clip');
  const body = rider.group.getObjectByName('Groundable horse and mounted rider');
  rider.settleToGround(0, true);
  assert.equal(body.position.y, 0, 'paused flight is a frozen photograph, not a forced grounding');
  const horse = rider.group.getObjectByName('Animated horse facing forward'), mesh = horse.children[0], vertex = new THREE.Vector3();
  const flightPose = [...mesh.morphTargetInfluences];
  rider.settleToGround(1, true);
  assert.notDeepEqual(mesh.morphTargetInfluences, flightPose, 'release must return to a real grounded rest pose rather than lower tucked legs');
  scene.updateMatrixWorld(true);
  let lowest = Infinity;
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
    lowest = Math.min(lowest, vertex.y);
  }
  assert.ok(lowest >= .006 && lowest < .09, `released horse remains suspended or sinks: ${lowest}`);
  const hand = rider.group.getObjectByName('Left rein hand'), rein = rider.group.getObjectByName('Left rein');
  const center = new THREE.Vector3(), palm = hand.getWorldPosition(new THREE.Vector3());
  for (let i = 0; i < 6; i++) center.add(vertex.fromBufferAttribute(rein.geometry.attributes.position, i).applyMatrix4(rein.matrixWorld));
  assert.ok(center.multiplyScalar(1 / 6).distanceTo(palm) < 1e-6, 'grounding keeps the reins attached to the moving hand');
  const restingPose = [...mesh.morphTargetInfluences];
  rider.settleToGround(0, false); assert.deepEqual(mesh.morphTargetInfluences, restingPose);
  rider.reset(); assert.equal(body.position.y, 0);
  rider.dispose(); assert.equal(scene.children.length, 0);
});
