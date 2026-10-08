import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

// Check the actual shipped ZIPs, independently of the mocked renderer tests.
const {unzipSync} = createRequire(import.meta.url)('fflate');
const assetRoot = new URL('../web/assets/reference-plush/', import.meta.url);
const artifactUrl = new URL('../artifacts/reference-plush-asset-integrity.json', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await readFile(new URL('manifest.json', assetRoot));
const manifest = JSON.parse(manifestBytes);
const publicLodBytes = await readFile(new URL('../artifacts/reference-lod-meta.public.json', import.meta.url));
const publicLod = JSON.parse(publicLodBytes);
const sourceFirstMeta = JSON.parse(await readFile(new URL('../artifacts/reference-sog-meta.public.json', import.meta.url)));
const sourceRanges = new Map();
function collectFullResolution(node) {
  if (node.lods?.[0]) {
    const {file, offset, count} = node.lods[0], filename = publicLod.filenames[file];
    const ranges = sourceRanges.get(filename) ?? [];
    ranges.push({offset, count});sourceRanges.set(filename, ranges);
  }
  for (const child of node.children ?? []) collectFullResolution(child);
}
collectFullResolution(publicLod.tree);
assert.deepEqual(manifest.bounds, publicLod.tree.bound, 'Asset bounds differ from the public source LOD tree');
assert.equal(manifest.count, publicLod.counts[0], 'Manifest must retain all LOD0 splats');
assert.equal(manifest.chunks.length, sourceRanges.size, 'A full-resolution chunk is missing');
assert.equal(manifest.source, 'https://superspl.at/scene/ca6a4c9b');
assert.equal(manifest.author, 'abstrakt');assert.equal(manifest.license, 'CC BY 4.0');

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function zipDirectory(bytes) {
  let end = bytes.length - 22;
  const limit = Math.max(0, bytes.length - 65557);
  while (end >= limit && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  assert.ok(end >= limit, 'ZIP end-of-directory is absent');
  assert.equal(bytes.readUInt16LE(end + 4), 0, 'Split ZIPs are not supported');
  assert.equal(bytes.readUInt16LE(end + 6), 0);
  const count = bytes.readUInt16LE(end + 10), entries = [];
  let cursor = bytes.readUInt32LE(end + 16);
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, 'Invalid central-directory entry');
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    entries.push({name, crc32: bytes.readUInt32LE(cursor + 16), bytes: bytes.readUInt32LE(cursor + 24)});
    cursor += 46 + nameLength + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
  }
  assert.equal(cursor, end, 'Unexpected data between the central directory and its end');
  return entries;
}

const checkedChunks = [];
for (const chunk of manifest.chunks) {
  assert.match(chunk.file, /^0_[0-5]\.sog$/);
  const bytes = await readFile(new URL(chunk.file, assetRoot)), sha256 = hash(bytes);
  assert.equal(bytes.length, chunk.bytes, `${chunk.file} file length mismatch`);
  assert.equal(sha256, chunk.sha256, `${chunk.file} SHA-256 mismatch`);
  const directory = zipDirectory(bytes), unpacked = unzipSync(bytes);
  const meta = JSON.parse(new TextDecoder().decode(unpacked['meta.json']));
  assert.equal(meta.version, 2, `${chunk.file} must retain SOG2 metadata`);
  assert.equal(meta.count, chunk.count, `${chunk.file} internal count mismatch`);
  assert.equal(meta.shN?.bands, 3, `${chunk.file} must retain third-order SH`);
  assert.equal(meta.shN.bands, chunk.bands);
  if (chunk.file === '0_0.sog') assert.deepEqual(meta, sourceFirstMeta, 'First chunk metadata changed from its public source');
  const requiredEntries = ['meta.json', ...['means', 'scales', 'quats', 'sh0', 'shN'].flatMap(key => meta[key].files)].sort();
  assert.deepEqual(Object.keys(unpacked).sort(), requiredEntries, `${chunk.file} attribute files are incomplete`);
  assert.deepEqual(directory.map(entry => entry.name).sort(), requiredEntries);
  for (const entry of directory) {
    const data = unpacked[entry.name];
    assert.equal(data.length, entry.bytes, `${chunk.file}/${entry.name} uncompressed length mismatch`);
    assert.equal(crc32(data), entry.crc32, `${chunk.file}/${entry.name} CRC-32 mismatch`);
    if (entry.name.endsWith('.webp')) {
      const image = Buffer.from(data);
      assert.equal(image.subarray(0, 4).toString(), 'RIFF', `${entry.name} is not a RIFF image`);
      assert.equal(image.subarray(8, 12).toString(), 'WEBP', `${entry.name} is not a WebP image`);
      assert.equal(image.readUInt32LE(4) + 8, image.length, `${entry.name} WebP payload is truncated`);
    }
  }
  const sourceFile = chunk.file.replace('.sog', '/meta.json');
  const ranges = sourceRanges.get(sourceFile);
  assert.ok(ranges, `${chunk.file} is absent from the original LOD0 tree`);
  let rangeEnd = 0;
  for (const range of [...ranges].sort((a, b) => a.offset - b.offset)) {
    assert.equal(range.offset, rangeEnd, `${sourceFile} LOD0 ranges overlap or omit splats`);rangeEnd += range.count;
  }
  assert.equal(rangeEnd, meta.count, `${sourceFile} LOD0 source count mismatch`);
  assert.ok(chunk.source.endsWith('/' + sourceFile));
  checkedChunks.push({file: chunk.file, bytes: bytes.length, sha256, sha256Matches: true,
    sogVersion: meta.version, count: meta.count, sourceLod0Count: rangeEnd, shBands: meta.shN.bands,
    zipEntries: directory.map(entry => ({name: entry.name, bytes: entry.bytes, crc32Matches: true})),
    webpHeadersValid: true, firstChunkPublicMetadataMatches: chunk.file === '0_0.sog' ? true : null});
}
const totalCount = checkedChunks.reduce((total, chunk) => total + chunk.count, 0);
assert.equal(totalCount, manifest.count);
const result = {checkedAt: new Date().toISOString(), result: 'pass',
  command: 'node tooling/verify-reference-plush-assets.mjs',
  scope: 'Real local manifest, all six SOG ZIPs, SHA-256, ZIP CRC-32, embedded SOG2 counts, SH3 attribute files, WebP headers and independent public LOD0 ranges. This does not certify GPU decoding, frame rate or visual fidelity.',
  source: manifest.source, author: manifest.author, license: manifest.license,
  manifestSha256: hash(manifestBytes), publicLodMetaSha256: hash(publicLodBytes),
  fullResolutionCount: totalCount, sourceFullResolutionCount: publicLod.counts[0],
  totalBytes: checkedChunks.reduce((total, chunk) => total + chunk.bytes, 0),
  chunks: checkedChunks};
await writeFile(artifactUrl, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({result: result.result, fullResolutionCount: result.fullResolutionCount,
  totalBytes: result.totalBytes, chunks: result.chunks.length, artifact: fileURLToPath(artifactUrl)}));
