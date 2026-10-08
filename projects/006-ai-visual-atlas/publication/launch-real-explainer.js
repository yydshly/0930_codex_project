(() => {
  'use strict';
  const video = document.getElementById('real-launch-video');
  const title = document.getElementById('real-beat-title');
  const fact = document.getElementById('real-beat-fact');
  const choice = document.getElementById('real-beat-choice');
  const execution = document.getElementById('real-beat-execution');
  const time = document.getElementById('real-beat-time');
  const buttons = [...document.querySelectorAll('[data-real-chapter]')];
  const chapters = [
    ['第一幕：把想法变成作品', '首页标题是“从一句想法，到一段可见的作品。”', '把标题改写成两行短句，使用大字揭示、旋转图形和品牌色，先建立观看目标。', '按 t 计算文字位置和图形角度，浏览器绘制；编码器不决定文案与构图。'],
    ['第二幕：十个项目汇聚为四个方向', '本地项目数据确有十个项目，分类为视频与动画、3D 游戏、创作工具、灵感与资料。', '先展示真实项目名称，再让十张卡片汇聚成四个分类；用聚合动作表达“地图”。', '计算卡片坐标、透明度与缓动；数字来自已检查的输入，运动方式来自本次场景代码。'],
    ['第三幕：展示已有真实产物', '制作页已有 H3 五秒演唱试验、整曲图片 MV、较早的网页宣传片。', '三张作品卡片依次进入；第一张展示实际 H3 画面的连续帧，其余使用已有本机图片。', '读取已有片段导出的 12fps 纹理，按时间选帧；没有进行新的角色或口型生成。'],
    ['第四幕：说明输入到成片的过程', '技术页已记录输入、分镜、动画代码、浏览器绘制与编码。', '用五个节点逐个强调制作阶段；此幕是宣传片中的原理表达。', '按 t 改变节点和线条的高亮，绘制模型写好的图形。节点推进不是外部生成任务的运行状态。'],
    ['第五幕：两条研究路线', '首页有“歌曲 → MV”与“网页 → 宣传短片”两个研究入口。', '让左右两张大卡片分别承载演唱摘取和内容到图形的变形，表达两项研究方向。', '左侧播放已有试验纹理；右侧按代码插值改变条块的坐标与尺寸。'],
    ['第六幕：行动入口', '能力图谱已经存在，可打开、查看效果与技术。', '收束为一个行动句和一个入口，保持品牌色与开场图形的呼应。', '按时间绘制字形与旋转标记，结束在完整画面；成片里没有可点击的网页按钮。']
  ];
  let selected = -1;
  function update(index) {
    index = Math.max(0, Math.min(5, index));
    if (index === selected) return;
    selected = index;
    [title.textContent, fact.textContent, choice.textContent, execution.textContent] = chapters[index];
    time.textContent = `${index * 4}–${index * 4 + 4} 秒 · 帧 ${index * 96}–${index * 96 + 95}`;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }
  for (const button of buttons) button.addEventListener('click', () => {
    const index = Number(button.dataset.realChapter);
    video.pause(); video.currentTime = index * 4 + (index === 1 ? 2.8 : 1.5); update(index);
  });
  video.addEventListener('timeupdate', () => update(Math.floor(video.currentTime / 4)));
  video.addEventListener('seeked', () => update(Math.floor(video.currentTime / 4)));
  video.addEventListener('loadedmetadata', () => update(Math.floor(video.currentTime / 4)));
  update(0);
})();
