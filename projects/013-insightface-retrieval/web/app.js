'use strict';
(() => {
  const image = document.getElementById('overview');
  if (image) {
    const fit = document.getElementById('fit');
    const actual = document.getElementById('actual');
    const zoom = document.getElementById('zoom');
    const label = document.getElementById('zoom-value');
    function setScale(value) {
      image.style.width = value === null ? '100%' : `${2400 * value / 100}px`;
      fit.setAttribute('aria-pressed', String(value === null));
      actual.setAttribute('aria-pressed', String(value === 100));
      label.textContent = value === null ? '适应宽度' : `${value}%`;
      if (value !== null) zoom.value = String(value);
    }
    fit.addEventListener('click', () => setScale(null));
    actual.addEventListener('click', () => setScale(100));
    zoom.addEventListener('input', () => setScale(Number(zoom.value)));
  }

  const tasks = {
    identity: ['找参考人物的其他照片', '尽量保留稳定身份，减少表情、光线与背景影响。', '疑似同人的图片与人物出现线索；姓名需登记映射。', '人脸身份相同，不能独立确定是哪一部作品或哪一个镜头。'],
    frame: ['找到截图的原视频与位置', '保留具体画面的姿态、纹理、光影、构图与局部对应。', '已收录视频候选与时间位置；可在候选附近进一步匹配。', '没有清晰人脸也可能找到原画面；是否收录和抽帧覆盖很关键。'],
    semantic: ['找到内容相关的素材', '关注场景、物体、动作与内容的相关性。', '相似图片或视频片段；不保证是原始截图出处。', '“同类场景”与“同一画面”不同，语义相关不能直接证明来源。']
  };
  document.querySelectorAll('[data-task]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-task]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      ['task-target','task-feature','task-output','task-warning'].forEach((id,index) => {
        document.getElementById(id).textContent = tasks[button.dataset.task][index];
      });
    });
  });

  const threshold = document.getElementById('threshold');
  if (!threshold) return;
  const remove = document.getElementById('remove-target');
  const samples = [
    {name:'A · 样本 1',identity:'A',vector:[0.98,0.16,0.08]},
    {name:'A · 样本 2',identity:'A',vector:[0.87,0.40,0.05]},
    {name:'B · 样本 1',identity:'B',vector:[0.73,0.68,0.03]},
    {name:'C · 样本 1',identity:'C',vector:[0.23,0.41,0.88]}
  ];
  const q = [1,0,0];
  const norm = vector => Math.sqrt(vector.reduce((sum,value) => sum + value*value,0));
  const cosine = vector => q.reduce((sum,value,index) => sum + value*vector[index],0) / (norm(q)*norm(vector));
  function render() {
    const cutoff = Number(threshold.value);
    document.getElementById('threshold-value').textContent = cutoff.toFixed(2);
    const ranked = samples.filter(sample => !remove.checked || sample.identity !== 'A').map(sample => ({...sample,score:cosine(sample.vector)})).sort((a,b) => b.score-a.score);
    const body = document.getElementById('vector-results');
    body.replaceChildren();
    ranked.forEach((sample,index) => {
      const row = document.createElement('tr');
      const accepted = sample.score >= cutoff;
      const cells = [String(index+1),sample.name,`[${sample.vector.map(value => value.toFixed(2)).join(', ')}]`,sample.score.toFixed(3),accepted?'保留为候选':'低于教学阈值'];
      cells.forEach((value,cellIndex) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (cellIndex === 4) cell.className = accepted?'score-pass':'score-low';
        row.append(cell);
      });
      body.append(row);
    });
    const kept = ranked.filter(sample => sample.score >= cutoff);
    document.getElementById('vector-status').textContent = kept.length ? `当前教学阈值下保留 ${kept.length} 个候选。${remove.checked?'A 的样本已不在库内，接纳其他候选会产生错误关联。':'假定身份只作教学；候选相似不等于身份已确认。'}` : '没有可靠匹配：现有候选均低于当前教学阈值。目标未收录时，系统应允许返回无匹配。';
  }
  threshold.addEventListener('input', render);
  remove.addEventListener('change', render);
  render();
})();
