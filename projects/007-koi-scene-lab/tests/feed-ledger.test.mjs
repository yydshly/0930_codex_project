import test from 'node:test';
import assert from 'node:assert/strict';
import {FeedLedger} from '../src/feed-ledger.js';

test('pellet events distinguish release, water contact and final consumption without double counting', () => {
  const ledger = new FeedLedger(), id = ledger.begin(2, 3.5);
  const a = ledger.release(id), b = ledger.release(id);
  assert.deepEqual(a, {batchId: id, index: 0});
  assert.deepEqual(b, {batchId: id, index: 1});
  assert.equal(ledger.release(id), null);
  assert.equal(ledger.consume(a), false);
  assert.equal(ledger.expire(a), false);
  assert.equal(ledger.land(a), true);
  assert.equal(ledger.land(a), false);
  assert.equal(ledger.consume(a), true);
  assert.equal(ledger.consume(a), false);
  assert.equal(ledger.expire(a), false);
  assert.equal(ledger.land(a), false);
  assert.equal(ledger.land(b), true);
  assert.equal(ledger.end(id, 'completed'), true);
  assert.equal(ledger.latest().settled, false, 'the hand can finish before fish finish');
  assert.equal(ledger.consume(b), true);
  assert.deepEqual(ledger.latest(), {
    id, total: 2, startedAt: 3.5, released: 2, landed: 2, consumed: 2, expired: 0,
    handEnded: true, endReason: 'completed', pending: 0, unreleased: 0, settled: true,
  });
  assert.equal(ledger.end(id, 'stopped'), false);
  assert.equal(ledger.latest().endReason, 'completed');
});

test('a delayed bite from an older batch cannot be credited to a newly started hand', () => {
  const ledger = new FeedLedger(), oldId = ledger.begin(1), oldPellet = ledger.release(oldId);
  ledger.land(oldPellet);ledger.end(oldId, 'completed');
  const newId = ledger.begin(1, 4), newPellet = ledger.release(newId);
  ledger.land(newPellet);
  const before = ledger.latest();
  assert.equal(ledger.retainedBatchCount, 2);
  assert.equal(ledger.consume(oldPellet), true);
  assert.deepEqual(ledger.latest(), before);
  assert.equal(ledger.retainedBatchCount, 1);
  assert.equal(ledger.consume(newPellet), true);
  assert.equal(ledger.latest().consumed, 1);
});

test('expiration settles remaining food separately from successful consumption', () => {
  const ledger = new FeedLedger(), id = ledger.begin(2), a = ledger.release(id), b = ledger.release(id);
  ledger.land(a);ledger.land(b);ledger.end(id);
  ledger.consume(a);
  assert.equal(ledger.expire(b), true);
  assert.equal(ledger.expire(b), false);
  assert.equal(ledger.consume(b), false);
  const state = ledger.latest();
  assert.equal(state.landed, 2);
  assert.equal(state.consumed, 1);
  assert.equal(state.expired, 1);
  assert.equal(state.pending, 0);
  assert.equal(state.settled, true);
});

test('an early hand stop retains its partial batch until the released pellet settles', () => {
  const ledger = new FeedLedger(), id = ledger.begin(), pellet = ledger.release(id);
  assert.equal(ledger.end(id, 'stopped'), true);
  assert.equal(ledger.release(id), null);
  assert.equal(ledger.latest().released, 1);
  assert.equal(ledger.latest().unreleased, 5);
  assert.equal(ledger.latest().pending, 1);
  assert.equal(ledger.latest().settled, false);
  assert.equal(ledger.land(pellet), true, 'a pellet can hit water after the hand stops');
  assert.equal(ledger.consume(pellet), true);
  assert.equal(ledger.latest().settled, true);
  assert.equal(ledger.latest().unreleased, 5);
  assert.equal(ledger.latest().endReason, 'stopped');
});

test('clear invalidates old tokens and IDs without reusing an ID for the next batch', () => {
  const ledger = new FeedLedger(), oldId = ledger.begin(), oldPellet = ledger.release(oldId);
  ledger.land(oldPellet);ledger.clear();
  assert.equal(ledger.latest(), null);
  assert.equal(ledger.retainedBatchCount, 0);
  const id = ledger.begin(), before = ledger.latest();
  assert.ok(id > oldId);
  assert.equal(ledger.release(oldId), null);
  assert.equal(ledger.end(oldId), false);
  assert.equal(ledger.land(oldPellet), false);
  assert.equal(ledger.consume(oldPellet), false);
  assert.equal(ledger.expire(oldPellet), false);
  assert.deepEqual(ledger.latest(), before);
});

test('forged, foreign and malformed event tokens cannot mutate counters', () => {
  const ledger = new FeedLedger(), other = new FeedLedger(), id = ledger.begin(1), token = ledger.release(id);
  const foreign = other.release(other.begin(1)), before = ledger.latest();
  for (const invalid of [{...token}, foreign, null, undefined, 1, 'token', {}, []]) {
    assert.equal(ledger.land(invalid), false);
    assert.equal(ledger.consume(invalid), false);
    assert.equal(ledger.expire(invalid), false);
    assert.deepEqual(ledger.latest(), before);
  }
  assert.equal(ledger.release('1'), null);
  assert.equal(ledger.end('1'), false);
  assert.equal(ledger.land(token), true);
});

test('returned values are isolated from internal accounting', () => {
  const ledger = new FeedLedger(), id = ledger.begin(1), token = ledger.release(id), before = ledger.latest();
  const snapshot = ledger.latest();
  snapshot.consumed = 99;snapshot.total = 99;snapshot.handEnded = true;snapshot.pending = 0;
  assert.deepEqual(ledger.latest(), before);
  assert.throws(() => {token.batchId = 999;}, TypeError);
  assert.throws(() => {ledger.retainedBatchCount = 999;}, TypeError);
  assert.equal(ledger.land(token), true);
  assert.equal(ledger.consume(token), true);
  assert.equal(ledger.latest().consumed, 1);
});

test('settled old batches are recycled while the newest and unresolved batches remain', () => {
  const ledger = new FeedLedger(), unresolvedId = ledger.begin(1), unresolved = ledger.release(unresolvedId);
  ledger.land(unresolved);ledger.end(unresolvedId);
  let previous;
  for (let i = 0; i < 100; i++) {
    const id = ledger.begin(1), pellet = ledger.release(id);
    ledger.land(pellet);ledger.consume(pellet);ledger.end(id, 'completed');
    assert.equal(ledger.retainedBatchCount, 2, 'one unresolved batch plus the latest result');
    if (previous) assert.equal(ledger.consume(previous), false);
    previous = pellet;
  }
  assert.equal(ledger.consume(unresolved), true);
  assert.equal(ledger.retainedBatchCount, 1);
  assert.equal(ledger.latest().settled, true);
  const open = ledger.begin(1), empty = ledger.begin(1);
  assert.equal(ledger.retainedBatchCount, 2);
  ledger.end(open);
  assert.equal(ledger.retainedBatchCount, 1, 'an older zero-release hand is reclaimed when it ends');
  assert.equal(ledger.latest().id, empty);
});

test('invalid begin parameters and end reasons reject without changing an existing batch', () => {
  const ledger = new FeedLedger(), id = ledger.begin(1), before = ledger.latest();
  for (const total of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '6', null, true]) {
    assert.throws(() => ledger.begin(total), TypeError);
    assert.deepEqual(ledger.latest(), before);
  }
  for (const startedAt of [-1, NaN, Infinity, '0', null, true]) {
    assert.throws(() => ledger.begin(1, startedAt), TypeError);
    assert.deepEqual(ledger.latest(), before);
  }
  for (const reason of ['', ' ', null, 0, {}]) {
    assert.throws(() => ledger.end(id, reason), TypeError);
    assert.deepEqual(ledger.latest(), before);
  }
  assert.equal(ledger.begin(1), id + 1, 'rejected inputs do not consume IDs');
});
