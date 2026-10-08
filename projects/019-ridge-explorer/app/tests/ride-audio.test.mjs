import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDMARKS } from '../src/scene/exploration-map.js';
import { createRideAudio, landmarkAudibility, rideAudioMix, advanceHoofCadence, HOOF_CYCLE_DISTANCE, AUDIO_MASTER_GAIN } from '../src/scene/ride-audio.js';

class MockParameter {
  value = 0;
  events = [];
  setTargetAtTime(value, at, duration) { this.value = value; this.events.push({ method: 'target', value, at, duration }); }
  setValueAtTime(value, at) { this.value = value; this.events.push({ method: 'value', value, at }); }
  linearRampToValueAtTime(value, at) { this.value = value; this.events.push({ method: 'linear', value, at }); }
  exponentialRampToValueAtTime(value, at) { this.value = value; this.events.push({ method: 'exponential', value, at }); }
  cancelScheduledValues(at) { this.events.push({ method: 'cancel', at }); }
}

function mockContext({ resume } = {}) {
  const context = {
    state: 'suspended', currentTime: 0, sampleRate: 8000, nodes: [], resumeCalls: 0, closeCalls: 0,
    destination: { kind: 'destination' },
    createBuffer(channels, length) { const samples = new Float32Array(length); return { getChannelData: () => samples }; },
    makeNode(kind) {
      const node = {
        kind, outputs: [], starts: 0, stops: 0, disconnects: 0,
        gain: new MockParameter(), frequency: new MockParameter(), Q: new MockParameter(),
        connect(other) { this.outputs.push(other); },
        disconnect() { this.disconnects++; }, start() { this.starts++; }, stop() { this.stops++; },
      };
      this.nodes.push(node); return node;
    },
    createGain() { return this.makeNode('gain'); },
    createBufferSource() { return this.makeNode('bufferSource'); },
    createBiquadFilter() { return this.makeNode('filter'); },
    createOscillator() { return this.makeNode('oscillator'); },
    async resume() { this.resumeCalls++; if (resume) return resume(this); this.state = 'running'; },
    async close() { this.closeCalls++; this.state = 'closed'; },
  };
  return context;
}
const masterOf = context => context.nodes.find(node => node.outputs.includes(context.destination)).gain;
const sourcesOf = context => context.nodes.filter(node => ['bufferSource', 'oscillator'].includes(node.kind));
const hoofEnvelopeCount = context => context.nodes.reduce((count, node) => count + node.gain.events.filter(event => event.method === 'linear').length, 0);
const frame = (overrides = {}) => ({ time: 1, delta: .1, position: { x: 0, z: 0 }, stepDistance: .7, speed: 6.3, wind: 1, weather: 'storm', paused: false, hidden: false, ...overrides });

test('creek and camp fall off smoothly with actual world distance, with quiet weather-dependent wind', () => {
  const creek = LANDMARKS.find(point => point.id === 'creek');
  const camp = LANDMARKS.find(point => point.id === 'camp');
  assert.equal(landmarkAudibility(creek, creek), 1);
  assert.equal(landmarkAudibility({ x: creek.x + 45, z: creek.z }, creek), 0);
  const near = landmarkAudibility({ x: creek.x + 7, z: creek.z }, creek);
  const far = landmarkAudibility({ x: creek.x + 30, z: creek.z }, creek);
  assert.ok(near > far && far > 0);
  assert.equal(landmarkAudibility({ x: NaN, z: 0 }, creek), 0);
  assert.ok(rideAudioMix({ position: creek }).creek > .2);
  assert.ok(rideAudioMix({ position: camp }).fire > .1);
  const distant = rideAudioMix({ position: { x: creek.x + 500, z: creek.z + 500 } });
  assert.equal(distant.creek, 0); assert.equal(distant.fire, 0);
  assert.ok(rideAudioMix({ weather: 'storm' }).wind > rideAudioMix({ weather: 'mist' }).wind);
  for (const weather of ['storm', 'mist', 'sunset']) for (const wind of [0, 1, 2, NaN, 50]) {
    const mix = rideAudioMix({ position: creek, weather, wind });
    assert.ok(mix.wind >= 0 && mix.wind <= .18);
    assert.ok(Number.isFinite(mix.windCutoff));
  }
  assert.ok(AUDIO_MASTER_GAIN <= .25);
});

test('three-beat canter follows travelled metres at different frame rates and drops muted backlog', () => {
  const simulate = frames => {
    let phase = 0, distance = 0; const contacts = [];
    const step = HOOF_CYCLE_DISTANCE * 3 / frames;
    for (let i = 0; i < frames; i++) {
      const result = advanceHoofCadence(phase, step);
      for (const hit of result.hits) contacts.push(distance + hit.fraction * step);
      phase = result.phase; distance += step;
    }
    return contacts;
  };
  const low = simulate(90), high = simulate(432);
  assert.equal(low.length, 9); assert.equal(high.length, 9);
  low.forEach((contact, index) => assert.ok(Math.abs(contact - high[index]) < 1e-7));
  assert.deepEqual(advanceHoofCadence(1.1, 50, false), { phase: 0, hits: [] });
  const invalid = advanceHoofCadence(1.1, Infinity);
  assert.ok(Math.abs(invalid.phase - 1.1) < 1e-8); assert.deepEqual(invalid.hits, []);
  assert.deepEqual(advanceHoofCadence(0, 500), { phase: 0, hits: [] });
  assert.equal(advanceHoofCadence(0, .1).hits.length, 0);
});

test('audio is created only by activation, reuses its voices and fades off without footfalls', async () => {
  const context = mockContext(); let creations = 0;
  const audio = createRideAudio({ createContext: () => { creations++; return context; } });
  for (let i = 0; i < 20; i++) audio.update(frame());
  assert.equal(creations, 0);
  assert.equal(await audio.setEnabled(false), false); assert.equal(creations, 0);
  assert.equal(await audio.setEnabled(true), true);
  assert.equal(creations, 1); assert.equal(context.resumeCalls, 1);
  assert.equal(masterOf(context).value, AUDIO_MASTER_GAIN);
  const nodeCount = context.nodes.length;
  for (let i = 0; i < 40; i++) { context.currentTime += .1; audio.update(frame({ time: i / 10 })); }
  assert.ok(hoofEnvelopeCount(context) > 10, 'travelling makes short gain envelopes on existing voices');
  assert.equal(context.nodes.length, nodeCount, 'no source or oscillator is constructed per hoofbeat');
  assert.equal(await audio.setEnabled(false), false);
  assert.equal(masterOf(context).value, 0);
  const contacts = hoofEnvelopeCount(context);
  audio.update(frame({ stepDistance: 10 }));
  assert.equal(hoofEnvelopeCount(context), contacts);
  assert.equal(await audio.setEnabled(true), true);
  assert.equal(creations, 1); assert.equal(context.nodes.length, nodeCount);
  assert.equal(context.resumeCalls, 1);
  audio.dispose(); audio.dispose();
  assert.equal(context.closeCalls, 1);
  assert.ok(sourcesOf(context).every(node => node.starts === 1 && node.stops === 1));
  assert.ok(context.nodes.every(node => node.disconnects === 1));
  assert.equal(masterOf(context).value, 0);
  assert.equal(await audio.setEnabled(true), false);
});

test('pause, photograph-style pause, hidden tabs and suspended output cannot accumulate a replay', async () => {
  const context = mockContext(); const audio = createRideAudio({ createContext: () => context });
  await audio.setEnabled(true);
  audio.update(frame({ stepDistance: .4 }));
  assert.equal(hoofEnvelopeCount(context), 0);
  for (const reason of [{ paused: true }, { hidden: true }]) {
    audio.update(frame({ ...reason, stepDistance: 100 }));
    assert.equal(masterOf(context).value, 0);
    const before = hoofEnvelopeCount(context);
    audio.update(frame({ stepDistance: .3 }));
    assert.equal(hoofEnvelopeCount(context), before, 'unmuting starts a new metre phase, not a queued contact');
    audio.update(frame({ stepDistance: .3 }));
    assert.equal(hoofEnvelopeCount(context), before + 2, 'one canter contact uses the tone and noise envelopes');
  }
  context.state = 'suspended';
  audio.update(frame({ stepDistance: 100 }));
  assert.equal(masterOf(context).value, 0);
  assert.equal(context.resumeCalls, 1, 'updates never bypass the browser gesture requirement');
  assert.equal(await audio.setEnabled(true), true);
  const before = hoofEnvelopeCount(context);
  audio.update(frame({ stepDistance: .3 }));
  assert.equal(hoofEnvelopeCount(context), before);
  audio.dispose();
});

test('missing devices and activation failures stay optional and clean up a failed graph', async () => {
  const missing = createRideAudio({ createContext: () => null });
  assert.equal(await missing.setEnabled(true), false);
  assert.doesNotThrow(() => missing.update(frame())); missing.dispose();
  const throwing = createRideAudio({ createContext: () => { throw new Error('unsupported'); } });
  assert.equal(await throwing.setEnabled(true), false); throwing.dispose();
  const context = mockContext({ resume: () => { throw new Error('output unavailable'); } });
  const failed = createRideAudio({ createContext: () => context });
  assert.equal(await failed.setEnabled(true), false);
  assert.equal(context.closeCalls, 1);
  assert.ok(sourcesOf(context).every(node => node.stops === 1));
  assert.ok(context.nodes.every(node => node.disconnects === 1));
  assert.doesNotThrow(() => failed.update(frame()));
  failed.dispose(); assert.equal(context.closeCalls, 1);
});

test('a late resume cannot revive a muted or disposed scene', async () => {
  let resolveResume;
  const context = mockContext({ resume: () => new Promise(resolve => { resolveResume = resolve; }) });
  const audio = createRideAudio({ createContext: () => context });
  const enabling = audio.setEnabled(true);
  assert.equal(context.resumeCalls, 1);
  await audio.setEnabled(false);
  context.state = 'running'; resolveResume();
  assert.equal(await enabling, false);
  assert.equal(masterOf(context).value, 0);
  assert.equal(await audio.setEnabled(true), true);
  audio.dispose();

  let resolveLate;
  const lateContext = mockContext({ resume: () => new Promise(resolve => { resolveLate = resolve; }) });
  const lateAudio = createRideAudio({ createContext: () => lateContext });
  const first = lateAudio.setEnabled(true), second = lateAudio.setEnabled(true);
  assert.equal(lateContext.resumeCalls, 1, 'concurrent activation shares one pending resume');
  lateAudio.dispose(); lateAudio.dispose(); resolveLate();
  assert.deepEqual(await Promise.all([first, second]), [false, false]);
  assert.equal(lateContext.closeCalls, 1);
  assert.equal(masterOf(lateContext).value, 0);
  assert.ok(sourcesOf(lateContext).every(node => node.stops === 1));
  assert.equal(await lateAudio.setEnabled(true), false);
});
