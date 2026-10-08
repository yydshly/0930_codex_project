import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditHistory} from '../src/edit-history.js';

const stamp = kind => ({kind, uv: [.25, .5], point: [0, 0, 1], radius: .24, value: .5, color: '#b66b8c'});
const snapshot = (edits = [], field = [], baked = '') => ({snapshot: baked, edits, field});
const commit = (history, before, after, label) => {history.begin(before);return history.commit(after, label);};

test('mixed paint and grooming undo in drag order without reverting earlier tools', () => {
  const history = createEditHistory(), a = snapshot(), b = snapshot([stamp('trim')]);
  const c = snapshot(b.edits, [[1, 0, 0]]), d = snapshot([...b.edits, stamp('restore')], c.field);
  assert.equal(commit(history, a, b, '修剪'), true);
  assert.equal(commit(history, b, c, '梳理'), true);
  assert.equal(commit(history, c, d, '恢复'), true);
  assert.deepEqual(history.undo(d), {snapshot: c, label: '恢复'});
  assert.deepEqual(history.undo(c), {snapshot: b, label: '梳理'});
  assert.deepEqual(history.undo(b), {snapshot: a, label: '修剪'});
  assert.equal(history.undo(a), null);
  assert.deepEqual(history.redo(a), {snapshot: b, label: '修剪'});
  assert.deepEqual(history.redo(b), {snapshot: c, label: '梳理'});
  assert.deepEqual(history.redo(c), {snapshot: d, label: '恢复'});
});

test('empty strokes retain redo while an actual new stroke clears it', () => {
  const history = createEditHistory(), a = snapshot(), b = snapshot([stamp('dye')]);
  commit(history, a, b, '染色');history.undo(b);
  assert.equal(commit(history, a, a, '空白'), false);
  assert.equal(history.canRedo, true);
  assert.equal(commit(history, a, snapshot([], [[0, 1, 0]]), '梳理'), true);
  assert.equal(history.canRedo, false);
});

test('snapshots own their nested arrays and omit appearance fields', () => {
  const history = createEditHistory(), a = snapshot([stamp('dye')], [[0, 1, 0]]);
  a.params = {length: .3};history.begin(a);
  a.edits[0].point[0] = 99;a.field[0][1] = 99;
  history.commit(snapshot(), '清除');
  const entry = history.undo(snapshot());
  assert.equal(entry.snapshot.edits[0].point[0], 0);assert.equal(entry.snapshot.field[0][1], 1);
  assert.equal('params' in entry.snapshot, false);
  entry.snapshot.edits[0].uv[0] = 99;
  const redo = history.redo(entry.snapshot);redo.snapshot.edits.push(stamp('trim'));
  assert.equal(history.undo(redo.snapshot).snapshot.edits[0].uv[0], 99);
});

test('bounded history keeps the newest strokes including undoable clears', () => {
  const history = createEditHistory(2), a = snapshot(), b = snapshot([stamp('trim')]), c = snapshot(b.edits, [[1, 0, 0]]);
  commit(history, a, b, '修剪');commit(history, b, c, '梳理');commit(history, c, a, '清除全部');
  assert.deepEqual(history.undo(a).snapshot, c);assert.deepEqual(history.undo(c).snapshot, b);
  assert.equal(history.canUndo, false);assert.equal(history.undo(b), null);
});

test('duplicate begin does not overwrite a stroke; cancel and clear discard pending state', () => {
  const history = createEditHistory(), a = snapshot(), b = snapshot([stamp('curl')]);
  assert.equal(history.commit(b), false);assert.equal(history.begin(a), true);assert.equal(history.begin(b), false);
  assert.equal(history.undo(b), null);assert.equal(history.commit(b, '卷曲'), true);
  assert.deepEqual(history.undo(b).snapshot, a);
  history.begin(a);history.cancel();assert.equal(history.commit(b), false);assert.equal(history.canRedo, true);
  history.begin(a);history.clear();assert.equal(history.canUndo, false);assert.equal(history.canRedo, false);
  assert.equal(history.commit(b), false);
});

test('undo and redo across a baked checkpoint restore both base coat and recent edit order', () => {
  const history = createEditHistory();
  const before = snapshot([stamp('trim'), stamp('dye')], [[.2, .3, .4]], 'lc1:earlier-base');
  const after = snapshot([stamp('restore')], before.field, 'lc1:base-with-earlier-edits');
  before.params = {length: .3};after.params = {length: .25};
  assert.equal(commit(history, before, after, '恢复'), true);
  const undone = history.undo(after);
  assert.deepEqual(undone, {snapshot: snapshot(before.edits, before.field, 'lc1:earlier-base'), label: '恢复'});
  assert.ok(!('params' in undone.snapshot));
  const redone = history.redo(undone.snapshot);
  assert.deepEqual(redone, {snapshot: snapshot(after.edits, after.field, 'lc1:base-with-earlier-edits'), label: '恢复'});
  assert.ok(!('params' in redone.snapshot));
});

test('old history snapshots default to an empty coat and do not create an empty transaction', () => {
  const history = createEditHistory(), old = {edits: [], field: []};
  assert.equal(commit(history, old, snapshot(), '兼容'), false);
  assert.equal(history.canUndo, false);
  assert.equal(commit(history, old, snapshot([], [], 'lc1:baked-coat'), '编辑'), true);
  assert.deepEqual(history.undo(snapshot([], [], 'lc1:baked-coat')).snapshot, snapshot());
});

test('a combined trim, groom and restore operation across a checkpoint undoes and redoes as one entry', () => {
  const history = createEditHistory();
  const before = snapshot([stamp('dye')], [[.1, 0, 0]], 'lc1:older-base');
  assert.equal(history.begin(before), true);
  const trimmed = snapshot([...before.edits, stamp('trim')], before.field, before.snapshot);
  const groomed = snapshot(trimmed.edits, [[.4, -.3, .1]], trimmed.snapshot);
  const restored = snapshot([stamp('restore')], groomed.field, 'lc1:trimmed-and-dyed-checkpoint');
  assert.equal(history.canUndo, false, 'intermediate drags do not create separate entries');
  assert.equal(history.commit(restored, '组合编辑'), true);
  assert.deepEqual(history.undo(restored), {snapshot: before, label: '组合编辑'});
  assert.equal(history.canUndo, false, 'one undo returns all three tools to the group start');
  assert.deepEqual(history.redo(before), {snapshot: restored, label: '组合编辑'});
  assert.equal(history.canRedo, false);
});

test('a combined operation with no changed snapshot does not occupy history or discard redo', () => {
  const history = createEditHistory(), before = snapshot(), after = snapshot([stamp('trim')]);
  commit(history, before, after, '修剪');
  assert.deepEqual(history.undo(after).snapshot, before);
  assert.equal(history.begin(before), true);
  assert.equal(history.commit(snapshot(), '组合编辑'), false);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.deepEqual(history.redo(before), {snapshot: after, label: '修剪'});
});
