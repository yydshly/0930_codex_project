/** Counts actual pellet events by feeding batch, independently of hand animation. */
export class FeedLedger {
  #nextId = 1;
  #latestId = null;
  #batches = new Map();
  #tokens = new WeakMap();

  // Read-only diagnostic for bounded retention; no mutable records are exposed.
  get retainedBatchCount() { return this.#batches.size; }

  begin(total = 6, startedAt = 0) {
    if (!Number.isSafeInteger(total) || total <= 0) {
      throw new TypeError('Pellet total must be a positive safe integer.');
    }
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt) || startedAt < 0) {
      throw new TypeError('Batch start time must be a nonnegative finite number.');
    }
    if (!Number.isSafeInteger(this.#nextId)) throw new TypeError('Feeding batch ID capacity exceeded.');
    const id = this.#nextId++;
    this.#batches.set(id, {
      id, total, startedAt, released: 0, landed: 0, consumed: 0, expired: 0,
      handEnded: false, endReason: null,
    });
    this.#latestId = id;
    this.#prune();
    return id;
  }

  release(id) {
    const batch = this.#batches.get(id);
    if (!batch || batch.handEnded || batch.released >= batch.total) return null;
    const token = Object.freeze({batchId: id, index: batch.released});
    this.#tokens.set(token, {batch, phase: 'released'});
    batch.released++;
    return token;
  }

  land(token) {
    const state = this.#state(token);
    if (!state || state.phase !== 'released') return false;
    state.phase = 'landed';
    state.batch.landed++;
    return true;
  }

  consume(token) { return this.#finish(token, 'consumed'); }
  expire(token) { return this.#finish(token, 'expired'); }

  end(id, reason = 'stopped') {
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new TypeError('Batch end reason must be a nonempty string.');
    }
    const batch = this.#batches.get(id);
    if (!batch || batch.handEnded) return false;
    batch.handEnded = true;
    batch.endReason = reason;
    this.#prune();
    return true;
  }

  clear() {
    this.#batches.clear();
    this.#tokens = new WeakMap();
    this.#latestId = null;
  }

  latest() {
    const batch = this.#batches.get(this.#latestId);
    if (!batch) return null;
    const pending = batch.released - batch.consumed - batch.expired;
    return {
      ...batch,
      pending,
      unreleased: batch.total - batch.released,
      settled: batch.handEnded && pending === 0,
    };
  }

  #state(token) {
    const state = this.#tokens.get(token);
    return state && this.#batches.get(state.batch.id) === state.batch ? state : null;
  }

  #finish(token, terminal) {
    const state = this.#state(token);
    if (!state || state.phase !== 'landed') return false;
    state.phase = terminal;
    state.batch[terminal]++;
    this.#prune();
    return true;
  }

  #prune() {
    for (const [id, batch] of this.#batches) {
      if (id !== this.#latestId && batch.handEnded && batch.released === batch.consumed + batch.expired) {
        this.#batches.delete(id);
      }
    }
  }
}
