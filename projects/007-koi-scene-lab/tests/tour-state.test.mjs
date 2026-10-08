import test from 'node:test';
import assert from 'node:assert/strict';
import {TOUR_STEPS, TourState} from '../src/tour-state.js';

test('a closed route does not count as visited until it is shown', () => {
  const tour = new TourState();
  assert.deepEqual(tour.getState(), {
    active: false, index: 0, step: 'original', visited: [],
  });
  assert.deepEqual(tour.start(), {
    active: true, index: 0, step: 'original', visited: ['original'],
  });
  assert.deepEqual(tour.start().visited, ['original']);
});

test('exit and continue retain position and visits, while restart creates a fresh route', () => {
  const tour = new TourState();
  tour.start();
  tour.next();
  tour.next();
  const before = tour.getState();
  assert.deepEqual(tour.exit(), {...before, active: false});
  assert.deepEqual(tour.exit(), {...before, active: false});
  assert.deepEqual(tour.start(), before);
  assert.equal(tour.previous().step, 'construction');
  assert.deepEqual(tour.restart(), {
    active: true, index: 0, step: 'original', visited: ['original'],
  });
});

test('forward and backward controls stop at the route edges', () => {
  const tour = new TourState();
  tour.start();
  const beginning = tour.getState();
  assert.deepEqual(tour.previous(), beginning);
  const encountered = [tour.getState().step];
  for (let i = 0; i < 4; i++) encountered.push(tour.next().step);
  assert.deepEqual(encountered, ['original', 'construction', 'water', 'fish', 'feeding']);
  const end = tour.getState();
  assert.deepEqual(tour.next(), end);
  assert.equal(tour.previous().step, 'fish');
  assert.deepEqual(tour.getState().visited, [...TOUR_STEPS]);
});

test('jumping records only displayed steps and supplies no verification or completion flag', () => {
  const tour = new TourState();
  tour.start();
  tour.go('feeding');
  tour.go(2);
  const state = tour.getState();
  assert.equal(state.step, 'water');
  assert.deepEqual(state.visited, ['original', 'water', 'feeding']);
  assert.equal(Object.hasOwn(state, 'completed'), false);
  assert.equal(Object.hasOwn(state, 'verified'), false);
});

test('invalid jumps preserve the active step and all previous visits', () => {
  const tour = new TourState();
  tour.start();
  tour.go('fish');
  const before = tour.getState();
  const invalid = [
    -1, 5, 1.5, NaN, Infinity, '3', '', 'Water', 'unknown',
    undefined, null, true, {}, [], new Number(2),
  ];
  for (const target of invalid) {
    assert.throws(() => tour.go(target), {name: typeof target === 'string'
      || (typeof target === 'number' && Number.isInteger(target))
      ? 'RangeError' : 'TypeError'});
    assert.deepEqual(tour.getState(), before);
  }
});

test('navigation while exited cannot silently resume or record an unseen step', () => {
  const tour = new TourState();
  tour.start();
  tour.go('construction');
  const stopped = tour.exit();
  for (const navigate of [() => tour.next(), () => tour.previous(), () => tour.go('water')]) {
    assert.throws(navigate, /Start the tour/);
    assert.deepEqual(tour.getState(), stopped);
  }
  assert.equal(tour.start().step, 'construction');
  assert.equal(tour.next().step, 'water');
});

test('consumer edits to snapshots cannot alter current or future navigation', () => {
  const tour = new TourState();
  const snapshot = tour.start();
  snapshot.active = false;
  snapshot.index = 4;
  snapshot.step = 'feeding';
  snapshot.visited.push('feeding');
  assert.equal(tour.next().step, 'construction');
  assert.deepEqual(tour.getState().visited, ['original', 'construction']);
  assert.throws(() => TOUR_STEPS.push('extra'), TypeError);
  assert.equal(tour.go('feeding').index, 4);
});
