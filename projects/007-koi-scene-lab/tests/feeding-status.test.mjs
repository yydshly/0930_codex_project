import test from 'node:test';
import assert from 'node:assert/strict';
import {feedingPresentation} from '../src/feeding-status.js';

const round = patch => ({id: 1, total: 6, startedAt: 0, released: 0, landed: 0, consumed: 0, expired: 0, pending: 0, unreleased: 6, handEnded: false, endReason: null, settled: false, ...patch});

test('a cumulative scene count cannot become a round that never started', () => {
  const result = feedingPresentation({cumulative: 18});
  assert.equal(result.status, '尚未投喂');
  assert.equal(result.counts, '尚无本轮记录；场景累计吞食 18 粒');
  assert.doesNotMatch(result.status, /所有饲料已吞食|本轮已结束/);
});

test('the hand reports its actual approach, pinch, release and withdrawal phases', () => {
  for (const [phase, label] of [['approach', '伸手'], ['pinch', '捏持'], ['release', '松指'], ['withdraw', '收回']]) {
    assert.equal(feedingPresentation({round: round(), mode: 'feed', phase}).status, `手部阶段：${label}`);
  }
});

test('released, landed, consumed, pending and expired counts remain distinct from the cumulative total', () => {
  const result = feedingPresentation({round: round({released: 5, landed: 4, consumed: 2, pending: 2, expired: 1, unreleased: 1}), cumulative: 11});
  assert.equal(result.counts, '本轮释放 5/6 粒 · 实际落水 4 粒 · 吞食 2 粒 · 尚在场景 2 粒 · 过期 1 粒；场景累计吞食 11 粒');
});

test('a paused hand retains its phase and counts while explicitly reporting stopped simulation', () => {
  const current = round({released: 2, landed: 1, pending: 2, unreleased: 4});
  const running = feedingPresentation({round: current, mode: 'feed', phase: 'release'});
  const paused = feedingPresentation({round: current, mode: 'feed', phase: 'release', paused: true});
  assert.match(paused.status, /模拟已暂停.*当前停步/);
  assert.match(paused.status, /手部阶段：松指/);
  assert.equal(paused.counts, running.counts);
});

test('an inactive page retains outstanding food without claiming simulation is advancing', () => {
  const current = round({released: 6, landed: 6, consumed: 1, pending: 5, unreleased: 0, handEnded: true});
  const inactive = feedingPresentation({round: current, simulationActive: false});
  const resumed = feedingPresentation({round: current});
  assert.match(inactive.status, /当前页签未运行模拟.*当前停步/);
  assert.match(inactive.status, /等待 5 粒/);
  assert.doesNotMatch(resumed.status, /当前停步/);
  assert.equal(inactive.counts, resumed.counts);
});

test('paused and inactive conditions are both reported even before a round exists', () => {
  const result = feedingPresentation({paused: true, simulationActive: false, cumulative: 6});
  assert.match(result.status, /模拟已暂停，当前页签也未运行.*当前停步.*尚未投喂/);
  assert.equal(result.counts, '尚无本轮记录；场景累计吞食 6 粒');
});

test('ending the hand does not imply the released pellets have been consumed', () => {
  const result = feedingPresentation({round: round({released: 6, landed: 6, consumed: 2, pending: 4, unreleased: 0, handEnded: true})});
  assert.match(result.status, /手部动作已结束.*等待 4 粒/);
  assert.doesNotMatch(result.status, /所有饲料已吞食|本轮已结束/);
  assert.match(result.note, /已撒出的颗粒继续在场景中模拟/);
});

test('early hand cancellation reports unreleased pellets and preserves outstanding feedback', () => {
  const result = feedingPresentation({round: round({released: 2, landed: 1, pending: 2, unreleased: 4, handEnded: true, endReason: 'cancelled'})});
  assert.match(result.status, /等待 2 粒.*提前停止，4 粒未释放/);
  assert.doesNotMatch(result.status, /所有饲料已吞食/);
  assert.match(result.note, /只停止尚未释放的颗粒/);
});

test('consuming every released pellet after early stopping is not consuming the entire planned round', () => {
  const result = feedingPresentation({round: round({released: 2, landed: 2, consumed: 2, pending: 0, unreleased: 4, handEnded: true, endReason: 'cancelled', settled: true})});
  assert.match(result.status, /本轮已结束.*吞食 2 粒.*4 粒未释放/);
  assert.doesNotMatch(result.status, /所有饲料已吞食/);
});

test('all pellets are described as consumed only after actual complete consumption', () => {
  const result = feedingPresentation({round: round({released: 6, landed: 6, consumed: 6, pending: 0, unreleased: 0, handEnded: true, settled: true})});
  assert.equal(result.status, '本轮所有饲料已吞食');
  assert.match(result.counts, /吞食 6 粒.*尚在场景 0 粒.*过期 0 粒/);
});

test('expired food settles a round without being counted as swallowed food', () => {
  const result = feedingPresentation({round: round({released: 6, landed: 6, consumed: 4, pending: 0, expired: 2, unreleased: 0, handEnded: true, settled: true}), cumulative: 9});
  assert.match(result.status, /本轮已结束.*吞食 4 粒.*2 粒过期/);
  assert.doesNotMatch(result.status, /所有饲料已吞食/);
  assert.match(result.counts, /吞食 4 粒.*过期 2 粒；场景累计吞食 9 粒/);
});

test('presentation is read-only and explains that retained records advance only after resuming', () => {
  const current = round({released: 3, landed: 2, consumed: 1, pending: 2, unreleased: 3, handEnded: true});
  const snapshot = structuredClone(current);
  const result = feedingPresentation({round: current, paused: true});
  assert.deepEqual(current, snapshot);
  assert.match(result.note, /暂停或切换页签会保留本轮记录，恢复运行后才继续推进/);
});

test('feeding with zero fish explicitly observes release and landing without changing the zero-fish setting', () => {
  const current = round({released: 2, landed: 1, pending: 2, unreleased: 4});
  const result = feedingPresentation({round: current, mode: 'feed', phase: 'release', fishCount: 0});
  assert.match(result.status, /当前无鱼.*仅观察落料\/落水.*手部阶段：松指/);
  assert.match(result.counts, /本轮释放 2\/6 粒.*实际落水 1 粒.*吞食 0 粒/);
  assert.match(result.note, /保持当前0鱼设置/);
  assert.doesNotMatch(result.note, /自动.*增加.*鱼|补.*7.*鱼/);
});

test('zero fish with pending food distinguishes new pursuit from a previously started swallow', () => {
  const result = feedingPresentation({round: round({released: 6, landed: 6, consumed: 1, pending: 5, unreleased: 0, handEnded: true}), fishCount: 0});
  assert.match(result.status, /等待 5 粒.*当前无鱼/);
  assert.match(result.note, /没有鱼发起新的追食，已经开始的吸入仍可能完成/);
  assert.match(result.note, /未吞颗粒随模拟推进自然过期/);
  assert.doesNotMatch(result.note, /吞食.*绝不会变化|吞食.*不会增加/);
  assert.doesNotMatch(result.status, /所有饲料已吞食/);
});

test('switching to zero fish preserves a past fully consumed round and its counts', () => {
  const current = round({released: 6, landed: 6, consumed: 6, pending: 0, unreleased: 0, handEnded: true, settled: true});
  const before = feedingPresentation({round: current, fishCount: 7, cumulative: 12});
  const after = feedingPresentation({round: current, fishCount: 0, cumulative: 12});
  assert.match(after.status, /本轮所有饲料已吞食.*当前无鱼/);
  assert.equal(after.counts, before.counts);
  assert.match(after.note, /已有吞食记录保留/);
  assert.doesNotMatch(after.status, /失败|等待|过期/);
});

test('a zero-fish hand still withdrawing keeps both its phase and completed ingestion history', () => {
  const result = feedingPresentation({round: round({released: 6, landed: 6, consumed: 6, pending: 0, unreleased: 0}), mode: 'feed', phase: 'withdraw', fishCount: 0});
  assert.match(result.status, /当前无鱼.*仅观察落料\/落水.*手部阶段：收回.*所有饲料已吞食/);
  assert.match(result.counts, /吞食 6 粒.*尚在场景 0 粒/);
});

test('omitted, null and positive fish counts preserve the previous presentation exactly', () => {
  const input = {round: round({released: 3, landed: 2, pending: 3, unreleased: 3}), mode: 'feed', phase: 'pinch', cumulative: 4};
  const previous = feedingPresentation(input);
  assert.deepEqual(feedingPresentation({...input, fishCount: null}), previous);
  assert.deepEqual(feedingPresentation({...input, fishCount: 7}), previous);
  assert.deepEqual(feedingPresentation({...input, fishCount: undefined}), previous);
  assert.doesNotMatch(previous.status, /当前无鱼/);
});

test('zero-fish feedback keeps paused and inactive stop prefixes plus the current hand phase', () => {
  const current = round({released: 4, landed: 3, pending: 4, unreleased: 2});
  const running = feedingPresentation({round: current, mode: 'feed', phase: 'withdraw', fishCount: 0});
  const stopped = feedingPresentation({round: current, mode: 'feed', phase: 'withdraw', fishCount: 0, paused: true, simulationActive: false});
  assert.match(stopped.status, /^模拟已暂停，当前页签也未运行.*当前停步.*当前无鱼.*手部阶段：收回/);
  assert.equal(stopped.counts, running.counts);
});

test('zero-fish expiry remains separate from previously consumed food', () => {
  const result = feedingPresentation({round: round({released: 6, landed: 6, consumed: 2, pending: 0, expired: 4, unreleased: 0, handEnded: true, settled: true}), fishCount: 0, cumulative: 8});
  assert.match(result.status, /本轮已结束.*吞食 2 粒.*4 粒过期.*当前无鱼/);
  assert.match(result.counts, /吞食 2 粒.*过期 4 粒；场景累计吞食 8 粒/);
  assert.doesNotMatch(result.status, /所有饲料已吞食/);
});

test('zero fish before any round does not relabel earlier scene ingestion as the latest round', () => {
  const result = feedingPresentation({fishCount: 0, cumulative: 6});
  assert.match(result.status, /尚未投喂.*当前无鱼.*仅观察落料\/落水/);
  assert.equal(result.counts, '尚无本轮记录；场景累计吞食 6 粒');
  assert.doesNotMatch(result.status, /所有饲料已吞食/);
});
