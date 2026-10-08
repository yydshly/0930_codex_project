(() => {
  'use strict';
  const subjects = {
    character: ['围绕演唱者编排画面', '人物负责唱歌和情绪，背景、文字、图形与镜头配合人物及歌词。makevoid 默认路线更接近这种角色主导的分层动效制作。'],
    scene: ['先确定故事空间，再安排人物', '先选车厢、街道、房间等空间和镜头，再决定人物的位置、坐姿与动作。可以分层、整体生成、后做嘴型或采用绑定动画，主体选择不会自动限定技术路线。']
  };
  const routes = {
    layered: ['人物表演 + 本地场景编排', '模型先生成单独的人物表演，本地代码制作背景、文字、镜头与合成。人物姿态仍需与计划中的场景匹配。', '当前证据：已实测 5 秒 H3 表演、抠像和全曲插入。'],
    whole: ['完整构图 → 整体生成镜头', '先审查完整场景关键帧，再生成该镜头中的人物与场景运动。人物接触物体可以在同一镜头里生成；家具与背景是否稳定需要实际检查。', '当前证据：已做构图参考；完整场景 H3 尚未实测。'],
    lipsync: ['先做好视频，再单独处理嘴型', '先确定视频中的坐姿、动作与场景，再用专门工具根据歌曲调整嘴部。需要真实的嘴型处理，给视频换音轨不会实现这个效果。', '当前证据：新增研究路线，专门口型工具尚未接入或实测。'],
    performance: ['真人表演 → 驱动虚拟角色', '拍摄一段表演，把动作与表情迁移到角色参考。具体工具和参考是图片还是视频，会影响能控制身体、镜头与环境的范围。', '当前证据：新增研究路线，表演迁移工具尚未接入或实测。'],
    rig: ['角色绑定 → 动作与嘴形轨道', '给 2D / 3D 角色建立可控制的动画结构，安排身体姿态、物体接触与镜头。音频可辅助生成嘴形，再按动画轨道调整。', '当前证据：新增研究路线，角色绑定与动画工程尚未搭建。'],
    story: ['用故事与画面组织歌曲', '演唱者可以不出镜，用风景、故事画面、图片运镜和文字构建整曲。歌词字幕若要精确出现，仍需真实唱词时间。', '当前证据：已有完整图片镜头版与代码动画版，尚无精确歌词字幕。']
  };
  for (const [attribute, data, ids] of [
    ['subject', subjects, ['subject-title', 'subject-description']],
    ['route', routes, ['route-title', 'route-description', 'route-status']]
  ]) {
    const controls = document.querySelectorAll('[data-' + attribute + ']');
    for (const control of controls) {
      control.addEventListener('click', () => {
        const content = data[control.dataset[attribute]];
        ids.forEach((id, i) => { document.getElementById(id).textContent = content[i]; });
        for (const item of controls) item.setAttribute('aria-pressed', String(item === control));
      });
    }
  }
  const stagingContent = {
    camera: ['1 · 机位与人物朝向先一致', '这张图是从人物侧前方看过去，人物朝左，窗光从左侧进入。需要在这个构图下制作演唱关键帧；当前正面近景的角度和景别不同，缩放和平移不能把它变成这张图的姿态。'],
    seat: ['2 · 坐姿与遮挡一起表达“坐在这里”', '椅背位于人物后方，腰腿的一部分被桌面挡住。分层制作时，人物本来就要有对应的坐姿；再把椅背放后面，桌沿按需要放前面。现在的窗景合成没有这些关系，所以尚未形成列车里的坐姿。'],
    contact: ['3 · 手、杯子、桌面需要接触关系', '手要握住杯子，手肘要接到桌面，物体不能在动作中穿透或滑走。轻微表演可预先固定姿态与接触点；持续的物理互动更适合考虑一个完整场景短镜头。当前 H3 近景没有生成这套手部与桌面关系。']
  };
  const stagingMarkers = document.querySelectorAll('[data-staging]');
  for (const marker of stagingMarkers) {
    marker.addEventListener('click', () => {
      const [title, body] = stagingContent[marker.dataset.staging];
      document.getElementById('staging-title').textContent = title;
      document.getElementById('staging-body').textContent = body;
      for (const item of stagingMarkers) item.setAttribute('aria-pressed', String(item === marker));
    });
  }
  const switches = document.querySelectorAll('[data-layer-toggle]');
  for (const control of switches) {
    const target = document.getElementById(control.dataset.layerToggle);
    const update = () => { target.hidden = !control.checked; };
    control.addEventListener('change', update);
    update();
  }
  document.getElementById('layer-reset').addEventListener('click', () => {
    for (const control of switches) {
      control.checked = control.dataset.default === 'true';
      control.dispatchEvent(new Event('change'));
    }
  });

  const slider = document.getElementById('song-frame');
  const cursor = document.getElementById('song-cursor');
  const status = document.getElementById('time-status');
  const seconds = document.getElementById('song-seconds');
  const frameOut = document.getElementById('song-frame-value');
  const sceneOut = document.getElementById('scene-seconds');
  const actorOut = document.getElementById('actor-frame');
  const player = document.getElementById('technical-clip');
  const inspect = document.getElementById('inspect-frame');
  let pendingSeek = null;
  const seek = () => {
    if (pendingSeek === null || player.readyState < 1) return;
    player.currentTime = Math.min(pendingSeek, Math.max(0, player.duration - 1 / 24));
    pendingSeek = null;
  };
  player.addEventListener('loadedmetadata', seek);
  function updateTime() {
    const frame = Number(slider.value);
    const t = frame / 24;
    const active = frame >= 240 && frame < 360;
    seconds.value = t.toFixed(3) + ' s';
    frameOut.value = String(frame);
    sceneOut.value = active ? ((frame - 240) / 24).toFixed(3) + ' s' : '—';
    actorOut.value = active ? String(frame - 240) : '无 H3 帧';
    cursor.style.left = (100 * frame / 3051).toFixed(5) + '%';
    slider.setAttribute('aria-valuetext', '歌曲第 ' + t.toFixed(3) + ' 秒，第 ' + frame + ' 帧');
    inspect.disabled = !active;
    status.textContent = active
      ? '当前在真实 H3 演唱区间：[240,360)。人物第 ' + (frame - 240) + ' 帧，对应原歌曲第 ' + t.toFixed(3) + ' 秒；背景与人物共享这个时间，人物没有变速。'
      : '当前是原图片 MV 区间，没有该位置的 H3 演唱素材。末尾第 3050 帧覆盖到 127.125 秒，比音频结束多约 0.007 秒。';
  }
  slider.addEventListener('input', updateTime);
  for (const button of document.querySelectorAll('[data-song-frame]')) {
    button.addEventListener('click', () => {
      slider.value = button.dataset.songFrame;
      updateTime();
    });
  }
  inspect.addEventListener('click', () => {
    player.pause();
    pendingSeek = (Number(slider.value) - 240) / 24;
    if (player.readyState < 1) player.load();
    seek();
  });
  updateTime();
})();
