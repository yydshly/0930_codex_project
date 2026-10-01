export const TOTAL_BEATS = 64;
export function duration(bpm, trackDuration = null) { return trackDuration ?? TOTAL_BEATS * 60 / bpm; }
export function beatAt(seconds, bpm) { return Math.max(0, seconds) * bpm / 60; }
export function pointAt(index) {
  return { x: Math.sin(index * 0.66) * 3.4, y: -index * 0.72, z: -index * 2.7 };
}
export function ballAt(beat, height = 2.4, path = pointAt) {
  const index = Math.floor(beat), phase = beat - index;
  const a = path(index), b = path(index + 1);
  const hop = 4 * height * phase * (1 - phase);
  return { x: a.x + (b.x - a.x) * phase, y: a.y + (b.y - a.y) * phase + hop + 0.62, z: a.z + (b.z - a.z) * phase, index, phase };
}
export function sceneAt(beat, manual, automatic) { return automatic ? (manual + Math.floor(beat / 16)) % 3 : manual; }
export function formatTime(seconds) { const s = Math.floor(Math.max(0, seconds)); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }
