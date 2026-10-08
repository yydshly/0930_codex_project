// Fixed-resolution, lossless checkpoints for the six editable Float32 channels.
// lc1: stores a uint16 count, then sorted uint16 texel indices and six Float32
// values in little-endian order. Alpha stays the field's constant identity (1).
const TEXELS = 128 * 64;
const CHANNELS = TEXELS * 4;
const RECORD_BYTES = 2 + 6 * 4;
const PREFIX = 'lc1:';
const FLOAT32_EPSILON = 1e-7;
export const MAX_COAT_SNAPSHOT_LENGTH = PREFIX.length + Math.ceil((2 + TEXELS * RECORD_BYTES) * 4 / 3);

const validArray = value => value instanceof Float32Array && value.length === CHANNELS;
const isIdentity = values => values[0] === 1 && values.slice(1).every(value => Object.is(value, 0));
const validValues = values => values.every(Number.isFinite) &&
  values[0] >= .08 - FLOAT32_EPSILON && values[0] <= 1 &&
  values[1] >= -1 && values[1] <= 1 && values[2] >= 0 && values[2] <= 1 &&
  values.slice(3).every(value => value >= 0 && value <= values[2] + FLOAT32_EPSILON);

function encodeBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(raw) {
  if (raw === undefined || raw === null || raw === '') return {bytes: new Uint8Array(2), records: []};
  if (typeof raw !== 'string' || raw.length > MAX_COAT_SNAPSHOT_LENGTH || !raw.startsWith(PREFIX)) return null;
  const token = raw.slice(PREFIX.length);
  if (!token.length || !/^[A-Za-z0-9_-]+$/.test(token) || token.length % 4 === 1) return null;
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    if (binary.length < 2) return null;
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const view = new DataView(bytes.buffer), count = view.getUint16(0, true);
    if (count > TEXELS || bytes.length !== 2 + count * RECORD_BYTES) return null;
    const records = [];
    let previousIndex = -1;
    for (let record = 0; record < count; record++) {
      const offset = 2 + record * RECORD_BYTES, index = view.getUint16(offset, true);
      if (index <= previousIndex || index >= TEXELS) return null;
      const values = Array.from({length: 6}, (_, channel) => view.getFloat32(offset + 2 + channel * 4, true));
      if (!validValues(values)) return null;
      previousIndex = index;
      if (!isIdentity(values)) records.push({index, values, offset});
    }
    return {bytes, records};
  } catch {
    return null;
  }
}

function canonical(decoded) {
  if (!decoded.records.length) return '';
  const bytes = new Uint8Array(2 + decoded.records.length * RECORD_BYTES);
  new DataView(bytes.buffer).setUint16(0, decoded.records.length, true);
  for (let record = 0; record < decoded.records.length; record++) {
    const {offset} = decoded.records[record];
    bytes.set(decoded.bytes.subarray(offset, offset + RECORD_BYTES), 2 + record * RECORD_BYTES);
  }
  return PREFIX + encodeBytes(bytes);
}

/** Encode the field without quantization. Malformed dimensions/channels throw. */
export function encodeLocalSnapshot(data, colorData) {
  if (!validArray(data) || !validArray(colorData)) throw new TypeError('Coat snapshots need two 128x64 RGBA Float32 arrays');
  const records = [];
  for (let index = 0; index < TEXELS; index++) {
    const offset = index * 4;
    const values = [data[offset], data[offset + 1], data[offset + 2], colorData[offset], colorData[offset + 1], colorData[offset + 2]];
    if (!validValues(values)) throw new RangeError('Coat snapshot channels are outside the supported finite range');
    if (!isIdentity(values)) records.push({index, values});
  }
  if (!records.length) return '';
  const bytes = new Uint8Array(2 + records.length * RECORD_BYTES), view = new DataView(bytes.buffer);
  view.setUint16(0, records.length, true);
  for (let record = 0; record < records.length; record++) {
    const {index, values} = records[record], offset = 2 + record * RECORD_BYTES;
    view.setUint16(offset, index, true);
    for (let channel = 0; channel < 6; channel++) view.setFloat32(offset + 2 + channel * 4, values[channel], true);
  }
  return PREFIX + encodeBytes(bytes);
}

/** Missing/identity becomes ''; valid data is canonical; invalid data is null. */
export function sanitizeLocalSnapshot(raw) {
  const decoded = decode(raw);
  return decoded ? canonical(decoded) : null;
}

/** Validate the entire checkpoint before changing either target array. */
export function applyLocalSnapshot(raw, data, colorData) {
  if (!validArray(data) || !validArray(colorData)) return false;
  if (data.buffer === colorData.buffer && data.byteOffset < colorData.byteOffset + colorData.byteLength && colorData.byteOffset < data.byteOffset + data.byteLength) return false;
  const decoded = decode(raw);
  if (!decoded) return false;
  data.fill(0);colorData.fill(0);
  for (let offset = 0; offset < CHANNELS; offset += 4) {data[offset] = 1;data[offset + 3] = colorData[offset + 3] = 1;}
  for (const {index, values} of decoded.records) {
    const offset = index * 4;
    data.set(values.slice(0, 3), offset);colorData.set(values.slice(3), offset);
  }
  return true;
}
