import { LANDMARKS, START, WORLD_BOUNDS } from './exploration-map.js';
import { HORSE_RADIUS } from './exploration-motion.js';

export const RIDE_SAVE_KEY = 'ridge-explorer.ride.v1';
export const TOUR_STOP_SECONDS = 12;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function savedSettings(params = {}) {
  return {
    weather: ['storm', 'mist', 'sunset'].includes(params.weather) ? params.weather : 'storm',
    fog: finite(params.fog) ? clamp(params.fog, 0, 1) : .58,
    wind: finite(params.wind) ? clamp(params.wind, 0, 2) : 1,
    sun: finite(params.sun) ? clamp(params.sun, 0, 1) : .32,
    photoFov: finite(params.photoFov) ? clamp(params.photoFov, 28, 80) : 55,
    photoLook: ['natural', 'warm', 'cool'].includes(params.photoLook) ? params.photoLook : 'natural',
  };
}

export function createRideSnapshot(ride, time, params, savedAt = Date.now()) {
  return { version: 1, savedAt, position: { x: ride.x, z: ride.z, yaw: ride.yaw },
    distance: ride.distance, time, settings: savedSettings(params) };
}

export function decodeRideSnapshot(raw, environment = {}) {
  try {
    if (typeof raw !== 'string' || raw.length > 20000) return null;
    const value = JSON.parse(raw), p = value?.position;
    if (value?.version !== 1 || !p || ![p.x, p.z, p.yaw, value.distance, value.time].every(finite)) return null;
    const b = environment.bounds ?? WORLD_BOUNDS;
    if (p.x < b.minX + HORSE_RADIUS || p.x > b.maxX - HORSE_RADIUS
      || p.z < b.minZ + HORSE_RADIUS || p.z > b.maxZ - HORSE_RADIUS
      || value.distance < 0 || value.distance > 1e9 || value.time < 0 || value.time > 1e9) return null;
    if (environment.heightAt && !finite(environment.heightAt(p.x, p.z))) return null;
    if (environment.queryColliders?.(p.x, p.z).some(c => Math.hypot(p.x - c.x, p.z - c.z) < c.radius + HORSE_RADIUS - .001)) return null;
    return { ...createRideSnapshot({ ...p, distance: value.distance }, value.time, value.settings, value.savedAt),
      position: { x: p.x, z: p.z, yaw: Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw)) } };
  } catch { return null; }
}

export const createTourStops = () => ({ seen: [], active: null, remaining: 0 });
export function advanceTourStops(previous, position, delta, frozen = false) {
  if (frozen) return previous;
  let next = { ...previous, seen: [...previous.seen] };
  if (next.active) {
    next.remaining = Math.max(0, next.remaining - Math.max(0, delta));
    if (!next.remaining) next.active = null;
    return next;
  }
  // A new lap can stop again, but remaining beside a landmark cannot retrigger it.
  if (next.seen.length === LANDMARKS.length && Math.hypot(position.x - START.x, position.z - START.z) < 2) next.seen = [];
  const nearby = LANDMARKS.find(point => !next.seen.includes(point.id) && Math.hypot(position.x - point.x, position.z - point.z) <= 2);
  if (nearby) next = { seen: [...next.seen, nearby.id], active: nearby.id, remaining: TOUR_STOP_SECONDS };
  return next;
}
export const skipTourStop = previous => ({ ...previous, active: null, remaining: 0 });
