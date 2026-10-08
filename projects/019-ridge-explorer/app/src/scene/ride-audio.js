import { LANDMARKS } from './exploration-map.js';
import { RIDE_SPEED } from './exploration-motion.js';
import { clamp, smoothstep, seededRandom } from './math.js';

// Procedural ambience, not field recordings. The supplied horse has a one-second
// canter at 4.2 m/s, so three soft contacts repeat over the same travelled metres.
export const HOOF_CYCLE_DISTANCE = RIDE_SPEED;
export const AUDIO_MASTER_GAIN = .18;
const beats = [.13, .36, .60];
const creek = LANDMARKS.find(point => point.id === 'creek');
const camp = LANDMARKS.find(point => point.id === 'camp');
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export function landmarkAudibility(position, landmark, near = 6, far = 45) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return 0;
  const distance = Math.hypot(position.x - landmark.x, position.z - landmark.z);
  return 1 - smoothstep(near, far, distance);
}

export function rideAudioMix({ position, wind = 1, weather = 'storm', time = 0 } = {}) {
  const strength = clamp(finite(wind, 1), 0, 2);
  const weatherFactor = weather === 'storm' ? 1.12 : weather === 'mist' ? .72 : .88;
  const t = finite(time);
  return {
    wind: (.025 + strength * .065) * weatherFactor * (.94 + .06 * Math.sin(t * .37)),
    creek: landmarkAudibility(position, creek, 7, 70) * .26 * (.94 + .06 * Math.sin(t * .83)),
    fire: landmarkAudibility(position, camp, 5, 38) * .18 * (.78 + .13 * Math.sin(t * 3.1) + .09 * Math.sin(t * 7.7)),
    windCutoff: 200 + strength * 180,
  };
}

// Phase is measured in metres. Fractions locate contacts within this frame's
// travelled distance; changing the render rate cannot add or remove hoofbeats.
export function advanceHoofCadence(phase, stepDistance, audible = true) {
  if (!audible) return { phase: 0, hits: [] };
  const start = ((finite(phase) % HOOF_CYCLE_DISTANCE) + HOOF_CYCLE_DISTANCE) % HOOF_CYCLE_DISTANCE;
  const distance = Math.max(0, finite(stepDistance));
  if (!distance) return { phase: start, hits: [] };
  // A reposition or a long background stall should never replay a backlog.
  if (distance > HOOF_CYCLE_DISTANCE * 4) return { phase: 0, hits: [] };
  const end = start + distance, hits = [];
  for (let cycle = 0; cycle <= Math.floor(end / HOOF_CYCLE_DISTANCE); cycle++) {
    for (let index = 0; index < beats.length; index++) {
      const contact = (cycle + beats[index]) * HOOF_CYCLE_DISTANCE;
      if (contact > start + 1e-8 && contact <= end + 1e-8) {
        hits.push({ fraction: clamp((contact - start) / distance, 0, 1), index, strength: index === 1 ? .77 : 1 });
      }
    }
  }
  return { phase: end % HOOF_CYCLE_DISTANCE, hits };
}

function defaultContext() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}

function noiseBuffer(context, seconds, seed, colored) {
  const length = Math.ceil(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0), random = seededRandom(seed);
  let low = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    low += (white - low) * .055;
    data[i] = colored ? clamp(low * 2.5 + white * .15, -.8, .8) : white * .65;
  }
  // Join the loop at a shared sample value before filtering, without a click.
  const join = Math.min(Math.floor(context.sampleRate * .04), length - 1);
  for (let i = 0; i < join; i++) {
    const blend = smoothstep(0, join - 1, i);
    data[length - join + i] = data[length - join + i] * (1 - blend) + data[0] * blend;
  }
  return buffer;
}

function createGraph(context) {
  const nodes = [], sources = [];
  const track = node => { nodes.push(node); return node; };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const source of sources) { try { source.stop(); } catch { /* Already stopped, or construction did not finish. */ } }
    for (const node of nodes) { try { node.disconnect(); } catch { /* A missing device cannot block scene cleanup. */ } }
  };
  try {
    const master = track(context.createGain());
    master.gain.value = 0;
    master.connect(context.destination);
    const colored = noiseBuffer(context, 4, 19003, true);
    const white = noiseBuffer(context, 2, 19019, false);
    const filteredNoise = (buffer, filters, offset) => {
      const source = track(context.createBufferSource());
      sources.push(source);
      source.buffer = buffer; source.loop = true;
      let previous = source;
      const chain = [];
      for (const [type, frequency, q] of filters) {
        const filter = track(context.createBiquadFilter());
        filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
        previous.connect(filter); previous = filter; chain.push(filter);
      }
      const gain = track(context.createGain());
      gain.gain.value = 0;
      previous.connect(gain); gain.connect(master);
      source.start(0, offset);
      return { gain: gain.gain, filters: chain };
    };
    const wind = filteredNoise(colored, [['lowpass', 380, .35]], 0);
    const water = filteredNoise(colored, [['highpass', 110, .5], ['lowpass', 1650, .45]], .73);
    const fire = filteredNoise(colored, [['highpass', 95, .45], ['lowpass', 950, .4]], 1.37);
    const hoofNoise = filteredNoise(white, [['lowpass', 700, .6]], .29);
    const tone = track(context.createOscillator());
    sources.push(tone); tone.type = 'sine'; tone.frequency.value = 95;
    const hoofTone = track(context.createGain());
    hoofTone.gain.value = 0;
    tone.connect(hoofTone); hoofTone.connect(master); tone.start();
    return { master: master.gain, wind, water, fire, hoofNoise: hoofNoise.gain, hoofTone: hoofTone.gain, tone: tone.frequency, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

export function createRideAudio({ createContext = defaultContext } = {}) {
  let context = null, graph = null, resumeTask = null, wanted = false, disposed = false;
  let phase = 0, last = {}, muted = true;
  const targets = new Map(), closed = new WeakSet();
  function closeContext(candidate) {
    if (!candidate || closed.has(candidate)) return;
    closed.add(candidate);
    try { Promise.resolve(candidate.close?.()).catch(() => {}); } catch { /* Device shutdown is best-effort. */ }
  }
  function release() {
    graph?.dispose(); graph = null;
    const previous = context; context = null;
    targets.clear(); phase = 0; muted = true;
    closeContext(previous);
  }
  function target(parameter, value, seconds = .12) {
    if (targets.get(parameter) === value) return;
    parameter.setTargetAtTime(value, context.currentTime, seconds);
    targets.set(parameter, value);
  }
  function silenceHooves() {
    phase = 0;
    if (!graph) return;
    const now = context.currentTime;
    for (const gain of [graph.hoofTone, graph.hoofNoise]) {
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(0, now, .015);
    }
  }
  function applyAmbience(values) {
    const blocked = values.paused || values.hidden;
    const audible = wanted && !disposed && context?.state === 'running' && !blocked;
    if (graph) {
      target(graph.master, audible ? AUDIO_MASTER_GAIN : 0, audible ? .18 : .025);
      if (audible) {
        const mix = rideAudioMix(values);
        target(graph.wind.gain, mix.wind);
        target(graph.water.gain, mix.creek);
        target(graph.fire.gain, mix.fire, .045);
        target(graph.wind.filters[0].frequency, mix.windCutoff, .2);
      }
    }
    if (!audible && !muted) silenceHooves();
    if (!audible) phase = 0;
    muted = !audible;
    return audible;
  }

  async function setEnabled(enabled) {
    if (disposed) return false;
    wanted = !!enabled;
    if (!wanted) {
      try { applyAmbience(last); silenceHooves(); } catch { release(); }
      return false;
    }
    try {
      if (context?.state === 'closed') release();
      if (!context) {
        context = createContext();
        if (!context) { wanted = false; return false; }
        graph = createGraph(context);
      }
      const activeContext = context;
      if (activeContext.state !== 'running') {
        if (!resumeTask) {
          // This call stays directly inside the user's activation event.
          const pending = Promise.resolve(activeContext.resume());
          resumeTask = pending;
          pending.finally(() => { if (resumeTask === pending) resumeTask = null; }).catch(() => {});
        }
        await resumeTask;
      }
      // A mute or unmount while resume was pending cannot revive the sound.
      if (disposed || !wanted || context !== activeContext || activeContext.state !== 'running') return false;
      applyAmbience(last);
      return true;
    } catch {
      wanted = false;
      release();
      return false;
    }
  }

  function update(values = {}) {
    if (disposed) return;
    last = values;
    try {
      const audible = applyAmbience(values);
      const distance = values.speed > .02 && values.delta > 0 && values.delta <= .25
        ? Math.max(0, finite(values.stepDistance)) : 0;
      const cadence = advanceHoofCadence(phase, distance, audible);
      phase = cadence.phase;
      if (!audible || !cadence.hits.length) return;
      const now = context.currentTime + .008;
      const duration = Math.min(finite(values.delta), .1);
      const force = .62 + .38 * clamp(finite(values.speed) / 6.3, 0, 1);
      for (const hit of cadence.hits) {
        const at = now + hit.fraction * duration, power = force * hit.strength;
        for (const [gain, level, decay] of [[graph.hoofTone, .34, .072], [graph.hoofNoise, .19, .049]]) {
          gain.setValueAtTime(.0001, at);
          gain.linearRampToValueAtTime(level * power, at + .003);
          gain.exponentialRampToValueAtTime(.0001, at + decay);
          gain.setValueAtTime(0, at + decay + .006);
        }
        graph.tone.setValueAtTime(112 - hit.index * 9, at);
        graph.tone.exponentialRampToValueAtTime(58, at + .062);
      }
    } catch {
      // Audio is optional; a lost output device must never stop the world.
      wanted = false;
      release();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true; wanted = false;
    if (graph) {
      try {
        graph.master.cancelScheduledValues(context.currentTime);
        graph.master.setValueAtTime(0, context.currentTime);
      } catch { /* The context may already be closed by the browser. */ }
    }
    release();
    last = {};
  }
  return { setEnabled, update, dispose };
}
