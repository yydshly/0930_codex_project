import test from 'node:test';
import assert from 'node:assert/strict';
import {newEditStroke, recordEditResult, editStrokeFeedback, toolNames} from '../src/editor-feedback.js';

const result = (reason, changed = 0, affected = changed) => ({reason, changed, affected});
const successWords = /已完成|正在局部|已修改的部分保留/;

test('pressing and releasing empty stage never reports a successful edit', () => {
  const stroke = newEditStroke('trim');
  recordEditResult(stroke, result('miss'));
  for (const phase of ['drawing', 'finished']) {
    const feedback = editStrokeFeedback(stroke, {phase});
    assert.match(feedback, /命中角色身体/);
    assert.doesNotMatch(feedback, successWords);
  }
  assert.equal(stroke.changed, 0);
});

test('repeat trimming explains the original-length target without calling it success', () => {
  const stroke = newEditStroke('trim');
  recordEditResult(stroke, result('unchanged', 0, 42));
  const feedback = editStrokeFeedback(stroke, {value: .35});
  assert.match(feedback, /未进一步修剪/);
  assert.match(feedback, /原毛长的 35%/);
  assert.match(feedback, /调低保留比例/);
  assert.doesNotMatch(feedback, successWords);
  assert.equal(stroke.affected, 42);
  assert.equal(stroke.changed, 0);
});

test('repeating the minimum trim offers a different region or undo instead of a lower value', () => {
  const stroke = newEditStroke('trim');
  recordEditResult(stroke, result('unchanged', 0, 42));
  for (const value of [.08, 0]) {
    const feedback = editStrokeFeedback(stroke, {value});
    assert.match(feedback, /最低修剪比例/);
    assert.match(feedback, /原毛长的 8%/);
    assert.match(feedback, /换一个区域或撤销恢复/);
    assert.doesNotMatch(feedback, /调低|剪得更短|已完成/);
  }
});

test('an unchanged stamp covering no field pixels does not claim hair is already short', () => {
  const stroke = newEditStroke('trim');
  recordEditResult(stroke, result('unchanged', 0, 0));
  assert.equal(stroke.lastReason, 'miss');
  assert.equal(stroke.misses, 1);
  assert.equal(stroke.unchanged, 0);
  for (const phase of ['drawing', 'finished']) {
    const feedback = editStrokeFeedback(stroke, {phase, value: .08});
    assert.match(feedback, /命中角色身体/);
    assert.doesNotMatch(feedback, /已不高于目标|调低保留比例|已完成/);
  }
});

test('full capacity is kept visible for both down and up without false success', () => {
  const stroke = newEditStroke('dye');
  recordEditResult(stroke, result('full'));
  // Later misses must not erase the actionable reason why the stroke failed.
  recordEditResult(stroke, result('miss'));
  for (const phase of ['drawing', 'finished']) {
    const feedback = editStrokeFeedback(stroke, {phase, limit: 64});
    assert.match(feedback, /已满（64 条）/);
    assert.match(feedback, /未进行局部染色/);
    assert.doesNotMatch(feedback, successWords);
  }
});

test('a full imported recipe offers clearing when it has no undo history', () => {
  const imported = newEditStroke('trim');
  recordEditResult(imported, result('full'));
  const noHistory = editStrokeFeedback(imported, {canUndo: false});
  assert.match(noHistory, /清除局部创作后继续/);
  assert.doesNotMatch(noHistory, /撤销/);
  assert.match(editStrokeFeedback(imported, {canUndo: true}), /撤销一笔/);

  // A partial new stroke will acquire its own undo entry when it ends.
  const partial = newEditStroke('trim');
  recordEditResult(partial, result('changed', 3, 8));
  recordEditResult(partial, result('full'));
  assert.match(editStrokeFeedback(partial, {canUndo: false}), /撤销这一笔/);
});

test('a stroke that changes hair before filling capacity says the changed part is kept', () => {
  const stroke = newEditStroke('curl');
  assert.equal(recordEditResult(stroke, result('changed', 8, 20)), stroke);
  recordEditResult(stroke, result('changed', 11, 24));
  recordEditResult(stroke, result('full'));
  recordEditResult(stroke, result('unchanged', 0, 12));
  assert.equal(stroke.changed, 19);
  assert.equal(stroke.affected, 56);
  for (const phase of ['drawing', 'finished']) {
    const feedback = editStrokeFeedback(stroke, {phase, limit: 12});
    assert.match(feedback, /局部卷曲已修改的部分保留/);
    assert.match(feedback, /已满（12 条）/);
    assert.match(feedback, /撤销这一笔/);
  }
});

test('actual edits name each selected tool during drawing and when completed', () => {
  for (const [tool, name] of Object.entries(toolNames)) {
    const stroke = newEditStroke(tool);
    recordEditResult(stroke, result('changed', 6, 15));
    assert.match(editStrokeFeedback(stroke, {phase: 'drawing'}), new RegExp(`正在局部${name}`));
    assert.match(editStrokeFeedback(stroke), new RegExp(`局部${name}已完成`));
  }
});

test('invalid, absent and zero-change results never manufacture success', () => {
  for (const raw of [null, {}, result('invalid', 4, 20), result('changed', 0, 12)]) {
    const stroke = newEditStroke('dye');
    recordEditResult(stroke, raw);
    assert.equal(stroke.changed, 0);
    assert.doesNotMatch(editStrokeFeedback(stroke), successWords);
  }
  assert.doesNotMatch(editStrokeFeedback(newEditStroke('curl')), successWords);
});

test('leaving the body during a changed stroke preserves honest drawing and completion feedback', () => {
  const stroke = newEditStroke('trim');
  recordEditResult(stroke, result('changed', 4, 9));
  recordEditResult(stroke, result('miss'));
  assert.match(editStrokeFeedback(stroke, {phase: 'drawing'}), /已修剪的部分保留/);
  assert.match(editStrokeFeedback(stroke, {phase: 'drawing'}), /移回角色身体上/);
  assert.match(editStrokeFeedback(stroke), /局部修剪已完成/);
});

test('unchanged restore reports its actual result without claiming completion or further trimming', () => {
  const stroke = newEditStroke('restore');recordEditResult(stroke, result('unchanged', 0, 20));
  assert.match(editStrokeFeedback(stroke), /没有新的恢复变化/);
  assert.doesNotMatch(editStrokeFeedback(stroke), /已完成|剪得更短/);
});

test('grouped edits explain whole-group undo instead of promising an independent stroke', () => {
  const stroke = newEditStroke('dye');recordEditResult(stroke, result('changed', 20, 40));
  for (const phase of ['drawing', 'finished']) {
    assert.match(editStrokeFeedback(stroke, {phase, grouped: true}), /组合步骤/);
    assert.doesNotMatch(editStrokeFeedback(stroke, {phase, grouped: true}), /撤销这一笔/);
  }
  recordEditResult(stroke, result('miss'));
  assert.match(editStrokeFeedback(stroke, {phase: 'drawing', grouped: true}), /完成组合后整组撤销/);
});
