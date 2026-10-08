const PHASE_LABELS = {
  idle: '待机',
  approach: '伸手',
  pinch: '捏持',
  release: '松指',
  relax: '放松',
  withdraw: '收回',
  lower: '降手',
  waiting: '等待',
  contact: '接触',
  inspect: '观察',
};

const NOTE = '结束手部动作只停止尚未释放的颗粒；已撒出的颗粒继续在场景中模拟。暂停或切换页签会保留本轮记录，恢复运行后才继续推进。';
const ZERO_FISH_NOTE = '当前无鱼，仅观察落料和落水；没有鱼发起新的追食，已经开始的吸入仍可能完成。已有吞食记录保留，未吞颗粒随模拟推进自然过期；保持当前0鱼设置。';
const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function feedingPresentation({round = null, mode = 'idle', phase = 'idle', paused = false, simulationActive = true, cumulative = 0, fishCount = null} = {}) {
  const stopped = paused && !simulationActive
    ? '模拟已暂停，当前页签也未运行 · 当前停步'
    : paused ? '模拟已暂停 · 当前停步'
    : !simulationActive ? '当前页签未运行模拟 · 当前停步' : '';
  const statusWithStop = status => stopped ? `${stopped}；${status}` : status;
  const accumulated = count(cumulative);
  const noFish = fishCount === 0, note = noFish ? `${NOTE} ${ZERO_FISH_NOTE}` : NOTE;
  if (!round) return {
    status: statusWithStop(noFish ? '尚未投喂 · 当前无鱼，投喂仅观察落料/落水' : '尚未投喂'),
    counts: `尚无本轮记录；场景累计吞食 ${accumulated} 粒`,
    note,
  };

  const total = count(round.total), released = count(round.released), landed = count(round.landed);
  const consumed = count(round.consumed), expired = count(round.expired), pending = count(round.pending);
  const unreleased = count(round.unreleased ?? Math.max(0, total - released));
  const allConsumed = total > 0 && consumed === total && unreleased === 0 && expired === 0 && pending === 0;
  let status;
  if (mode === 'feed' && !round.handEnded) {
    status = `手部阶段：${PHASE_LABELS[phase] || '投喂中'}`;
    if (allConsumed) status += ' · 所有饲料已吞食';
  } else if (round.handEnded && pending > 0) {
    status = `手部动作已结束 · 等待 ${pending} 粒在场景中的饲料反馈`;
    if (unreleased > 0) status += ` · 提前停止，${unreleased} 粒未释放`;
  } else if (allConsumed) {
    status = '本轮所有饲料已吞食';
  } else if (round.settled) {
    status = `本轮已结束 · 吞食 ${consumed} 粒`;
    if (expired > 0) status += ` · ${expired} 粒过期`;
    if (unreleased > 0) status += ` · 提前停止，${unreleased} 粒未释放`;
  } else if (round.handEnded) {
    status = unreleased > 0
      ? `手部动作已结束 · 提前停止，${unreleased} 粒未释放`
      : '手部动作已结束 · 等待本轮记录结算';
  } else {
    status = pending > 0 ? `本轮还有 ${pending} 粒饲料在场景中` : '本轮投喂记录保留';
  }
  if (noFish) status = mode === 'feed' && !round.handEnded
    ? `当前无鱼 · 仅观察落料/落水 · ${status}`
    : `${status} · 当前无鱼`;
  return {
    status: statusWithStop(status),
    counts: `本轮释放 ${released}/${total} 粒 · 实际落水 ${landed} 粒 · 吞食 ${consumed} 粒 · 尚在场景 ${pending} 粒 · 过期 ${expired} 粒；场景累计吞食 ${accumulated} 粒`,
    note,
  };
}
