import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRider, HORSE_GAIT_SECONDS, HORSE_TRAVEL_SPEED } from '../src/scene/rider.js';

async function loadRealHorse() {
  const buffer = await readFile(new URL('../public/assets/horse.glb', import.meta.url));
  return new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
}

test('real horse faces route direction and keeps every animated pose with morphed normals', async () => {
  const scene = new THREE.Scene();
  const rider = createRider(scene, { loadHorse: loadRealHorse });
  const measurements = await rider.ready;
  const horse = rider.group.getObjectByName('Animated horse facing forward');
  const mesh = horse.children[0];
  assert.equal(measurements.originalFront, '+Z');
  assert.ok(Math.abs(horse.rotation.y - Math.PI) < 1e-8);
  assert.equal(mesh.geometry.morphAttributes.position.length, 15);
  assert.equal(mesh.geometry.morphAttributes.normal.length, 15);
  assert.equal(mesh.geometry.index.count / 3, 3936);
  assert.ok(mesh.material.vertexColors, 'coat shading preserves the asset colour detail');
  assert.ok(mesh.geometry.attributes.position.count > 1500, 'outline has been subdivided');
  horse.updateMatrix();
  const vertex = new THREE.Vector3(), highHead = [];
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.getVertexPosition(i, vertex).applyMatrix4(horse.matrix);
    if (vertex.y > 1.68) highHead.push(vertex.z);
  }
  assert.ok(highHead.length > 5 && highHead.every(z => z < -.65), 'real ears/head must face forward along -Z');
  const saddleCloth = rider.group.getObjectByName('Curved saddle cloth');
  saddleCloth.geometry.computeBoundingBox();
  assert.ok(saddleCloth.geometry.boundingBox.max.y - saddleCloth.geometry.boundingBox.min.y > .25, 'saddle cloth drapes down the flanks');
  rider.dispose();
  assert.equal(scene.children.length, 0);
});

test('saddle follows actual horse spine during the gait and a paused frame freezes it', async () => {
  const rider = createRider(new THREE.Scene(), { loadHorse: loadRealHorse });
  await rider.ready;
  const saddle = rider.group.getObjectByName('Saddle and seated rider');
  const start = saddle.position.clone();
  rider.update(.3, .3, .5, true);
  assert.ok(saddle.position.distanceTo(start) > .035, 'saddle must move with the morphing back');
  const paused = saddle.position.clone(), pitch = saddle.rotation.x;
  rider.update(5, .7, .5, false);
  assert.ok(saddle.position.distanceTo(paused) < 1e-9);
  assert.equal(saddle.rotation.x, pitch);
  const horse = rider.group.getObjectByName('Animated horse facing forward'), mesh = horse.children[0], vertex = new THREE.Vector3();
  let lowestContact = Infinity, highestFlight = -Infinity;
  for (let i = 0; i < 40; i++) {
    rider.update(i * HORSE_GAIT_SECONDS / 40, HORSE_GAIT_SECONDS / 40, .5, true);
    assert.ok(Number.isFinite(saddle.position.y));
    assert.ok(saddle.position.y > 1.25 && saddle.position.y < 1.68, `unphysical saddle height ${saddle.position.y}`);
    assert.ok(Math.abs(saddle.rotation.x) < .45, 'mounted rider remains seated along the back');
    let lowest = Infinity;
    for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
      mesh.getVertexPosition(j, vertex);
      lowest = Math.min(lowest, vertex.y * horse.scale.y + horse.position.y);
    }
    lowestContact = Math.min(lowestContact, lowest); highestFlight = Math.max(highestFlight, lowest);
  }
  assert.ok(lowestContact >= .012 && lowestContact < .07, `hoof contact must reach the surface without clipping: ${lowestContact}`);
  assert.ok(highestFlight > .3 && highestFlight < .5, `true airborne gallop poses are preserved: ${highestFlight}`);
  rider.dispose();
});

test('reset restores the original horse pose, seated body and cloth phase deterministically', async () => {
  const rider = createRider(new THREE.Scene(), { loadHorse: loadRealHorse });
  await rider.ready;
  rider.update(0, 0, .7, false);
  const saddle = rider.group.getObjectByName('Saddle and seated rider');
  const upper = rider.group.getObjectByName('Rider upper body');
  const tail = rider.group.getObjectByName('Flowing tail hair');
  const mantle = rider.group.getObjectByName('Draped travelling mantle');
  const contact = rider.group.getObjectByName('Soft ground contact');
  const horse = rider.group.getObjectByName('Animated horse facing forward').children[0];
  const armNames = ['Left rein hand', 'Right rein hand', 'Left upper sleeve', 'Right upper sleeve', 'Left forearm sleeve', 'Right forearm sleeve', 'Left rein', 'Right rein'];
  const snapshot = () => ({
    saddle: [...saddle.position.toArray(), ...saddle.rotation.toArray()],
    upper: [...upper.position.toArray(), ...upper.rotation.toArray()],
    tail: [...tail.position.toArray(), ...tail.rotation.toArray(), ...tail.children[0].geometry.attributes.position.array, ...tail.children[0].geometry.attributes.normal.array],
    mantle: [...mantle.geometry.attributes.position.array, ...mantle.geometry.attributes.normal.array],
    arms: armNames.map(name => {
      const object = rider.group.getObjectByName(name);
      return [...object.position.toArray(), ...object.geometry.attributes.position.array, ...object.geometry.attributes.normal.array];
    }),
    contact: [...contact.scale.toArray(), contact.material.uniforms.opacity.value],
    horse: [...horse.morphTargetInfluences]
  });
  const initial = snapshot();
  rider.update(2.81, 2.81, .7, true);
  assert.notDeepEqual(snapshot(), initial, 'moving must visibly change the horse and seated rider');
  rider.reset();
  assert.deepEqual(snapshot(), initial, 'reset must synchronize model animation, rider and cloth');
  rider.update(18, .65, .7, false);
  assert.deepEqual(snapshot(), initial, 'pause after reset must preserve exactly that frame');
  rider.dispose();
});

test('contact shade weakens and spreads during the real airborne poses', async () => {
  const rider = createRider(new THREE.Scene(), { loadHorse: loadRealHorse });
  await rider.ready;
  const horse = rider.group.getObjectByName('Animated horse facing forward');
  const mesh = horse.children[0], vertex = new THREE.Vector3();
  const contact = rider.group.getObjectByName('Soft ground contact');
  let grounded, airborne;
  for (let frame = 0; frame < 60; frame++) {
    if (frame) rider.update(frame / 60, HORSE_GAIT_SECONDS / 60, .7, true);
    let clearance = Infinity;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, vertex);
      clearance = Math.min(clearance, vertex.y * horse.scale.y + horse.position.y);
    }
    const pose = { clearance, opacity: contact.material.uniforms.opacity.value, width: contact.scale.x };
    if (!grounded || clearance < grounded.clearance) grounded = pose;
    if (!airborne || clearance > airborne.clearance) airborne = pose;
  }
  assert.ok(grounded.clearance < .05 && airborne.clearance > .35, 'verify contact against the rendered morph surface');
  assert.ok(grounded.opacity > airborne.opacity * 1.8, 'flight must weaken the local contact shade');
  assert.ok(airborne.width > grounded.width * 1.15, 'flight must spread the shade rather than keep a planted footprint');
  rider.dispose();
});

test('flexing arms keep both reins attached to the hands with finite surface normals', async () => {
  const scene = new THREE.Scene(), rider = createRider(scene, { loadHorse: loadRealHorse });
  await rider.ready;
  const handPosition = new THREE.Vector3(), center = new THREE.Vector3(), vertex = new THREE.Vector3();
  const start = rider.group.getObjectByName('Left rein hand').position.clone();
  let wristFlex = 0;
  for (let frame = 0; frame < 45; frame++) {
    if (frame) rider.update(frame / 45, HORSE_GAIT_SECONDS / 45, .7, true);
    scene.updateMatrixWorld(true);
    for (const side of ['Left', 'Right']) {
      const hand = rider.group.getObjectByName(`${side} rein hand`);
      const rein = rider.group.getObjectByName(`${side} rein`);
      hand.getWorldPosition(handPosition); center.set(0, 0, 0);
      // Average the six distinct vertices in the first tube ring; the seventh
      // closes its seam. This checks the visible endpoint in scene coordinates.
      for (let i = 0; i < 6; i++) center.add(vertex.fromBufferAttribute(rein.geometry.attributes.position, i).applyMatrix4(rein.matrixWorld));
      center.multiplyScalar(1 / 6);
      assert.ok(center.distanceTo(handPosition) < 1e-6, 'rein endpoint must remain inside the moving palm');
      for (const name of [`${side} upper sleeve`, `${side} forearm sleeve`, `${side} rein`]) {
        const normals = rider.group.getObjectByName(name).geometry.attributes.normal;
        for (let i = 0; i < normals.count; i++) {
          const magnitude = vertex.fromBufferAttribute(normals, i).length();
          assert.ok(Number.isFinite(magnitude) && Math.abs(magnitude - 1) < 1e-5, 'moving surface normals must remain unit length');
        }
      }
    }
    wristFlex = Math.max(wristFlex, rider.group.getObjectByName('Left rein hand').position.distanceTo(start));
  }
  assert.ok(wristFlex > .015 && wristFlex < .15, 'elbows absorb chest movement within a restrained mounted posture');
  rider.dispose();
});

test('route translation matches the real canter grounded-hoof sweep', async () => {
  const rider = createRider(new THREE.Scene(), { loadHorse: loadRealHorse });
  await rider.ready;
  const horse = rider.group.getObjectByName('Animated horse facing forward');
  const mesh = horse.children[0], vertex = new THREE.Vector3();
  const dt = HORSE_GAIT_SECONDS / 270;
  let previous = [], signedSpeed = 0, absoluteSpeed = 0, contacts = 0;
  for (let frame = 0; frame <= 270; frame++) {
    if (frame) rider.update(frame * dt, dt, .5, true);
    const current = [];
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, vertex);
      const y = vertex.y * horse.scale.y + horse.position.y;
      const z = -vertex.z * horse.scale.z;
      current.push({ y, z });
      if (frame && y < .11 && previous[i].y < .11) {
        // Root translation is toward -Z, while a contacting hoof sweeps +Z.
        const worldSpeed = (z - previous[i].z) / dt - HORSE_TRAVEL_SPEED;
        signedSpeed += worldSpeed; absoluteSpeed += Math.abs(worldSpeed); contacts++;
      }
    }
    previous = current;
  }
  assert.ok(contacts > 3000, 'sample actual grounded geometry throughout the complete clip');
  assert.ok(Math.abs(signedSpeed / contacts) / HORSE_TRAVEL_SPEED < .05, `persistent forward skating: ${signedSpeed / contacts} m/s`);
  // The supplied morph clip has variable stance velocity. Permit its residual
  // phase-level slip, while rejecting the previous 4.2 m/s / 1.35 s mismatch.
  assert.ok(absoluteSpeed / contacts / HORSE_TRAVEL_SPEED < .35, `excessive stance sliding: ${absoluteSpeed / contacts} m/s`);
  rider.dispose();
});
