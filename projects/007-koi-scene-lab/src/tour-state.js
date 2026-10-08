export const TOUR_STEPS = Object.freeze([
  'original', 'construction', 'water', 'fish', 'feeding',
]);

/**
 * Tracks which route step is being shown, never whether an effect was verified.
 * Call start() before navigation. Exiting keeps the position for a later start().
 * Every public method returns a detached state snapshot; visited contains step IDs.
 */
export class TourState {
  #active = false;
  #index = 0;
  #visited = new Set();

  getState() {
    return {
      active: this.#active,
      index: this.#index,
      step: TOUR_STEPS[this.#index],
      visited: TOUR_STEPS.filter(step => this.#visited.has(step)),
    };
  }

  start() {
    this.#active = true;
    this.#visited.add(TOUR_STEPS[this.#index]);
    return this.getState();
  }

  restart() {
    this.#index = 0;
    this.#visited.clear();
    return this.start();
  }

  exit() {
    this.#active = false;
    return this.getState();
  }

  next() {
    this.#requireActive();
    return this.go(Math.min(this.#index + 1, TOUR_STEPS.length - 1));
  }

  previous() {
    this.#requireActive();
    return this.go(Math.max(this.#index - 1, 0));
  }

  /** Accepts an integer route index or an exact step ID; values are not coerced. */
  go(target) {
    let index;
    if (typeof target === 'string') {
      index = TOUR_STEPS.indexOf(target);
      if (index < 0) throw new RangeError('Unknown tour step.');
    } else {
      if (typeof target !== 'number' || !Number.isInteger(target)) {
        throw new TypeError('Tour target must be an integer index or a step ID.');
      }
      index = target;
      if (index < 0 || index >= TOUR_STEPS.length) {
        throw new RangeError('Tour index is outside the route.');
      }
    }
    this.#requireActive();
    this.#index = index;
    this.#visited.add(TOUR_STEPS[index]);
    return this.getState();
  }

  #requireActive() {
    if (!this.#active) throw new Error('Start the tour before navigating.');
  }
}
