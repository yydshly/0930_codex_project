/** MiniMax's pre-generated local score is the only audio source and the stage clock. */
export type PerformanceAudio = {
  start(): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  time(): number;
  duration(): number;
  energy(): number;
  setMuted(muted: boolean): void;
  isRunning(): boolean;
  dispose(): void;
};

export const MUSIC_SRC = './audio/research-to-folio.mp3';
export const MUSIC_SECONDS = 24;

export function createPerformanceAudio(element: HTMLAudioElement): PerformanceAudio {
  let version = 0;
  let disposed = false;
  let wantsPlaying = false;
  let muted = false;
  let context: AudioContext | null = null;
  let source: MediaElementAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let output: GainNode | null = null;
  let spectrum: Uint8Array<ArrayBuffer> | null = null;
  let smoothEnergy = 0;
  let lastEnergyAt = 0;
  const duration = () => Number.isFinite(element.duration) && element.duration > 0 ? element.duration : MUSIC_SECONDS;
  const time = () => Math.max(0, Math.min(duration(), element.currentTime || 0));

  // Muting happens after the analyser: the real soundtrack remains measurable.
  function silence() {
    if (!output || !context || context.state === 'closed') return;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setValueAtTime(0, context.currentTime);
  }
  function applyVolume() {
    if (!output || !context || context.state === 'closed') return;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(muted || !wantsPlaying || disposed ? 0 : 0.82, context.currentTime, 0.015);
  }
  function suspend() {
    if (context && context.state !== 'closed') void context.suspend().catch(() => {});
  }
  function ensureGraph() {
    if (disposed) throw new Error('这次音乐演出已关闭，请刷新页面后重新播放。');
    if (context) {
      if (context.state === 'closed') throw new Error('音乐播放环境已关闭，请刷新页面后重新播放。');
      return context;
    }
    try {
      const audio = new AudioContext({latencyHint: 'interactive'});
      context = audio;
      // Created once per adapter/element and retained across every stop and replay.
      source = audio.createMediaElementSource(element);
      analyser = audio.createAnalyser();
      analyser.fftSize = 1024;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -18;
      analyser.smoothingTimeConstant = 0.70;
      spectrum = new Uint8Array(analyser.frequencyBinCount);
      output = audio.createGain();
      output.gain.value = 0;
      source.connect(analyser);
      analyser.connect(output);
      output.connect(audio.destination);
      // HTMLAudio muting would also silence the signal entering the analyser.
      element.muted = false;
      return audio;
    } catch {
      dispose();
      throw new Error('浏览器无法建立音乐分析通道，请刷新页面后重试。');
    }
  }

  function pause() {
    version += 1;
    wantsPlaying = false;
    smoothEnergy = 0;
    element.pause();
    silence();
    suspend();
  }
  function stop() {
    pause();
    if (!disposed) {
      try { element.currentTime = 0; } catch { /* Media is not loaded yet. */ }
    }
  }
  async function play() {
    if (disposed) throw new Error('这次音乐演出已关闭，请刷新页面后重新播放。');
    const current = ++version;
    const audio = ensureGraph();
    wantsPlaying = true;
    smoothEnergy = 0;
    lastEnergyAt = 0;
    try {
      await audio.resume();
      if (current !== version || disposed || !wantsPlaying) {
        if (!wantsPlaying || disposed) { element.pause(); silence(); suspend(); }
        return;
      }
      // No synthesized replacement: this media element is the only sound source.
      await element.play();
      if (current !== version || disposed || !wantsPlaying) {
        if (!wantsPlaying || disposed) { element.pause(); silence(); suspend(); }
        return;
      }
      applyVolume();
    } catch (error) {
      // A stopped or unmounted pending play is cancellation, not a visible error.
      if (current !== version || disposed || !wantsPlaying) {
        if (!wantsPlaying || disposed) { element.pause(); silence(); suspend(); }
        return;
      }
      wantsPlaying = false;
      element.pause();
      silence();
      suspend();
      const name = (error as Error).name;
      if (name === 'NotAllowedError') throw new Error('浏览器尚未允许播放音乐，请再次点击播放按钮。');
      if (name === 'NotSupportedError' || element.error) throw new Error('本地 MiniMax 配乐无法加载，请刷新页面后重试。');
      throw new Error((error as Error).message?.startsWith('浏览器无法建立')
        ? (error as Error).message : '配乐暂时无法播放，请重新播放或刷新页面。');
    }
  }
  async function start() {
    stop();
    await play();
  }

  function energy() {
    if (!context || !analyser || !spectrum || !wantsPlaying || element.paused || element.ended || context.state !== 'running') {
      smoothEnergy = 0;
      return 0;
    }
    analyser.getByteFrequencyData(spectrum);
    // Measure the useful body of the actual spectrum, roughly 45 Hz to 6 kHz.
    const binHz = context.sampleRate / analyser.fftSize;
    const from = Math.max(1, Math.ceil(45 / binHz));
    const until = Math.min(spectrum.length, Math.ceil(6000 / binHz));
    let sum = 0;
    for (let bin = from; bin < until; bin += 1) sum += (spectrum[bin] / 255) ** 2;
    const rms = Math.sqrt(sum / Math.max(1, until - from));
    const raw = Math.min(1, Math.pow(rms, 0.8) * 1.65);
    const now = context.currentTime;
    const elapsed = lastEnergyAt ? Math.max(0, Math.min(0.1, now - lastEnergyAt)) : 1 / 60;
    const response = raw > smoothEnergy ? 0.055 : 0.18;
    smoothEnergy += (raw - smoothEnergy) * (1 - Math.exp(-elapsed / response));
    lastEnergyAt = now;
    return Math.max(0, Math.min(1, smoothEnergy));
  }

  function dispose() {
    if (disposed) return;
    pause();
    disposed = true;
    source?.disconnect();
    analyser?.disconnect();
    output?.disconnect();
    source = null;
    analyser = null;
    output = null;
    spectrum = null;
    const audio = context;
    context = null;
    if (audio && audio.state !== 'closed') void audio.close().catch(() => {});
    element.removeAttribute('src');
    element.load();
  }

  return {start, pause, resume: play, stop, time, duration, energy, dispose,
    setMuted: (value) => {muted = value; element.muted = false; applyVolume();},
    isRunning: () => Boolean(!disposed && wantsPlaying && context?.state === 'running' && !element.paused && !element.ended && !element.error)};
}
