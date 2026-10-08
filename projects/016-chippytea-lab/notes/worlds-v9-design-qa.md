# 三个原创小世界 · v9 连续动作与真实影子配乐

2026-10-03。v9 实现与离线、模拟检查已完成；完整浏览器设计验收 blocked。CUA getState 返回 `node_repl kernel exited unexpectedly`、`windows sandbox failed: helper_unknown_error: setup refresh had errors`，没有新版网页截图或真实交互/声音证据。

## 修复与剩余验证

- P2 收藏幼苗偏小且落点低：首次 native Canvas 比较发现手机上难以看清，幼苗宽度从 43/49 调至 82/94，根部从 y874 调至 y800/812，种子落点同步移回岛面。修改后在相同 t5、count4 状态重导出并打开比较图，幼苗可见且落点与根部相邻。
- 已处理的表现单一：星种拆为吹出、旋流、接力和落地；补丁沿弧线带短尾迹、分三拍缝合；影子连续缩放翻转旋身，叠加最多两层 .14/.07 残影。分阶段联系图与探针证实状态有变化，最终终幕同刻比较变化较少，不能用终幕帧证明动态提升。
- 仍缺的验收条件：真实网页字体/控件布局、手机遮挡、DOM 对白、物理指针与键盘事件、焦点与 Esc、浏览器保存重载、自动播放策略、实时频谱和实际听感。此轮没有将这些标为通过。

## 实现及音乐

保留 32 秒四幕、29 个独立 PNG，本轮没有新增角色素材。收藏最多四株幼苗、补丁与纸影四幕可见；动作与收藏独立时钟使暂停仍能参与。新增三个世界有限连演，每场终幕至少停留 3.5 秒，等待拖动结束、动作/收藏与对白结束，再换场。手动切场、跳转、重演取消连演，减少动态禁用。

影子配乐通过 [MiniMax Music3 官方 Space](https://huggingface.co/spaces/MiniMaxAI/MiniMax-Music3) 实际提交一次并获得非静音 WAV。35 秒是请求上限，实际音频约 29.94 秒；保留原文件，淡出并补静音至 32 秒 MP3。未变速，未合成替代，未声称四个乐句精确对应四幕。点击“开启影子配乐”后 HTMLAudio.currentTime 驱动演出，AnalyserNode 能量/低高频传入 renderer，暂停或结束时归零。其他两场尚未提交音乐。生成回执、模型来源与 SHA 见 notes/world-music-generation-v9.json。

## 比较证据

源视觉方向为 assets/concepts/gravity.png、moon.png、shadow.png；继承的生产舞台基线为 assets/worlds-v8-qa/。原作气质是启发，当前是已选原创角色方向的连续动作迭代，不要求逐像素复刻原网站。

实施浏览器 screenshot path：unavailable。离线替代证据 assets/worlds-v9-qa/ 不含网页文字和控件，使用真实 WorldScenes.ts 与 @napi-rs/canvas，不能叫网页截图。桌面原生帧 1536×1024，手机舞台帧 390×260；没有 CSS viewport 或 browser deviceScaleFactor。v8/v9 终幕比较双方 t29、count1、strength50、pointer(.64,.5)、age100、无活动收藏；各归一至 768×512，合成 1536×544 输入，顶部32像素仅为QA标注。三个同刻比较已共同打开，身份、构图、纸纹与收尾延续；动态需看序列。

![幼苗修复同状态离线比较](assets/worlds-v9-qa/gravity-growth-fix-offline-comparison.jpg)

![影子同刻离线比较](assets/worlds-v9-qa/shadow-v8-v9-offline-comparison.jpg)

已打开完整桌面幼苗修复以及手机缝补、旋身序列作为聚焦证据。缝补取 captureAge1.76/2.12/2.28/2.58，旋身取 actionAge.45/.68/.85/1.2/1.55/1.9/2.15；手机序列有原生缩小的细线，但未进行真实页面比例判断。早期探针错误采样2.05导致未包含第二针，修正采样为2.12后重新输出；未改缝补动作以迁就检查。

## 已完成的核验

- 136 场景帧、24 联系图、109 行为探针、46 项检查全部通过；角色可见透明包围框无越界，29 个素材 SHA 与最终源一致。
- 生产 renderer SHA256：063ffc21244ce41e9e6853dc8ed125dd66217bebed11bf3667ee44f9fa277117。主组件及音频源另在 notes/host-behavior-verification-v9.json 记录指纹。
- 37 项 mocked 主组件/音频检查通过，涵盖媒体主钟、频谱范围、暂停/继续/跳转/重演、静音回退、切场、后台、减少动态、过期 play Promise 与连演终幕。mock 的 HTMLAudio、AudioContext、React、DOM 与 RAF 不证明实际浏览器播放通过。
- 实际 MP3 完整解码、文件 SHA 和非静音已核验。离线 FFT1024/Hann 读取实际 MP3，后两秒音量信号为零；这是浏览器 FFT 的近似，有窗函数和 smoothing 差异。
- 三段静音离线预览为 640×426、384 帧、12 fps、32 秒；影子另有同长度 H.264/AAC 配乐预览。动作预设3.5/10.5/18.5/26.5秒，收藏5/13/21/29秒，输入为脚本状态。不是浏览器录屏。影子带声视频反映实际音频的离线频谱近似，不能证明实时浏览器音画同步。
- 当前文件、媒体及最终 HTTP 检查见 notes/worlds-visual-verification.json；没有调用研究入册 POST。

## 五项验收表面

- 字体与文字：保留 KaiTi/STKaiti 与衬线 fallback；音乐开关和状态文案已检查源码。实际字体命中、字重、字号、换行、截断与抗锯齿 blocked。
- 间距与布局：3:2 舞台、独立图层保持，角色包围框检查通过；幼苗比例与落点已在同状态比较修复。新增连演/音乐控制实际占用、专注与手机对话避位 blocked。
- 色彩与 token：同刻对照可见奶油纸/苔绿、靛蓝/琥珀与炭黑/薰衣草延续，残影保持低透明度。网页按钮及状态色实际对比度 blocked。
- 图片与素材：29 张原始 raster 角色/道具/背景沿用，未以 SVG、CSS、div 或程序人物替代；alpha 与文件指纹通过。连续变形用于旋身，没有声称新角色动画逐帧绘制。
- 文案与内容：按钮分别标出开启/关闭影子配乐，其它场景明确静音待生成；默认无声，失败回退提示在专注模式也保留；收藏注明本机。音乐的实际时长与模型结果如实记录。实际 DOM 密度和阅读 blocked。

## 验收边界

v8 设计 QA 与 JSON 已归档 notes/worlds-v8-design-qa.md、notes/worlds-v8-visual-verification.json；更早浏览器与离线证据保留。它们不能替代新版浏览器验收。

规则来源：[design-qa SKILL.md](D:/codex/home/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md)：“If browser-rendered evidence is missing, final result is blocked.” 本轮缺少新版实施截图，按此规则保留 blocked，不把离线帧和模拟测试标为完整验收。

final result: blocked
