# 016 · Chippytea Lab · 功能、角色与音乐的共同编排

Chippytea 是一个 Mac 清理应用，也将功能成果延伸成手绘角色、收集动画、短音效和可参与的歌曲场景。本项目研究它如何把功能、图像、动作与音乐组织为同一段体验，并扩展为三个原创互动小世界。

**我们的理解：功能提供含义，图像建立角色与世界，动画表达过程和回应，音乐组织节奏与情绪；用户参与后，结果在世界里留下变化。** 源库提供可研究的完整产品实现，这套表达仍需要原创角色、旋律、动作与业务含义的共同设计。

![从 Chippytea 到我们的声画产品：能力、价值、原理、原创样式与扩展产品](assets/chippytea-understanding-map-v1.png)

[引导图原图](assets/chippytea-understanding-map-v1.png) · [图的生成说明](notes/understanding-map-generation-v1.txt) · [运行说明](web/README.md) · [发布摘要](notes/publication-summary.md)

## 全部阅读与演示入口

网页默认进入理解总览。三场原创演出、原作对照、真实回执和历史纸墨实验都保留独立直达入口。

| 入口 | 可以看到什么 |
| --- | --- |
| [理解总览](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/) | 上面的原有引导图、源库能力、价值、原理、三个样式与六个产品方向 |
| [引力花园](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/?view=experience&scene=gravity&v=10) | 风精灵与石头园丁接力星种、选位种植、连续生长与 MiniMax 配乐 |
| [月亮修补铺](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/?view=experience&scene=moon&v=10) | 裁缝追月亮、拖动拉线、补丁飞行与三针缝合；当前静音 |
| [影子排练场](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/?view=experience&scene=shadow&v=10) | 追光、连续旋身、镜像共舞、保存当下姿势与 MiniMax 配乐 |
| [原作案例对照](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/?view=source) | 模拟清理、种子墨线、收集反馈、逐词歌词与原作互动歌曲 |
| [资料与研究回执](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/?view=research&mode=records) | 实际资料、检查依据及构建时只读快照；本机服务可重新核验与入册 |
| [历史纸墨实验](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/?view=folio) | 笔记归整、批注、装订和真实编号落印的 24 秒静音预演 |
| [完整研究笔记](notes/research.md) | 源文件依据、实现细节、原生运行条件、许可与历史记录 |
| [原创场景设计](notes/original-worlds.md) | 角色关系、四幕故事、世界规则、互动与素材设计 |
| [验证记录](design-qa.md) | 当前 v10 的通过项、证据类型和未完成验收 |

当前效果另有离线视频：[花园带配乐](assets/worlds-v10-qa/gravity-32s-with-music-offline.mp4) · [修补铺静音](assets/worlds-v10-qa/moon-32s-interaction-offline.mp4) · [影子带配乐](assets/worlds-v10-qa/shadow-32s-with-music-offline.mp4)。它们由网页共享渲染器按脚本互动导出，32 秒、12 fps；配乐版读取实际 MP3 的离线 FFT 近似并合入真实音乐，属于离线预览，不是浏览器操作录屏。

## 源库的能力

源库有两层：原生应用负责真实文件工作，官网将产品及成果编排成可观看、可点按的声画体验。它不是通用动画或音乐 SDK。

| 层次 | 能力与边界 |
| --- | --- |
| 发现空间占用 | 在选定位置识别开发依赖、构建产物、已知工具缓存、应用缓存、日志、下载和较大/较旧的个人文件，展示估算与原因 |
| 审阅与操作 | 按类别复核归属、活动和内容，用户选择保留、移入 Trash 或永久清理合适的开发产物；个人文件仍需用户判断 |
| 成果记账 | 符合条件的永久操作完成后保守核算空间，每 100 MB 计一个 chip，余量累计；估算与 Trash 不计奖，成功操作也可能核算为零 |
| 原生系统整合 | SwiftUI 界面、Rust 有界扫描和 SQLite 索引、Finder/Trash、位置权限、本地历史与账本；无需账号 |
| 网页表达 | React、SVG、Canvas、CSS 与 Web Audio；纸张墨线、统一手绘组件、角色关系、收集动画与短音效、歌词和段落同步、用户投放互动 |

本项目清理组件采用上游虚构数据与预设结果，没有在访客电脑扫描或删除文件。Mac 应用与 Rust 引擎未在本轮实机运行，原生能力不会随静态网页变成 Windows/Linux 清理工具。事实依据为 [源码快照 f245695](https://github.com/richiemcilroy/chippytea/tree/f245695)，官网观察记录于 2026-10-02。

## 原理与对我们的价值

编排的因果链是 **功能事件 → 确认结果 → 声画编排 → 用户参与 → 世界积累**。真实结果决定何时展示完成；角色和世界解释这次结果；动作、字幕与音乐围绕共同含义发生。比如将来接入知识收藏时，应先确认收藏成功，再让种子落地、生长并配合乐句回应，最后留下可见记录。这个业务映射尚未接入当前三个小世界。

上游用稳定种子噪声和曲线形成墨线，循环三个种子产生低帧率重绘感。歌曲以实际播放时间同步歌词与段落，Canvas 根据段落编排角色和点击反馈，音频能量补充节奏细节。本地花园与影子用 `HTMLAudio.currentTime` 统一四幕，`AnalyserNode` 的低频、高频和能量影响细节；即兴动作与收藏有独立时钟，暂停也能完成反馈。频谱响应不等于自动理解乐句或逐音符编舞。

| 价值 | 对我们意味着什么 |
| --- | --- |
| 让结果可感知 | 用过程、角色回应和留下的变化表达一次完成，适合抽象的收藏、整理与创作结果 |
| 建立原创辨识度 | 角色性格、关系和世界规则形成属于产品的视觉与声音语言 |
| 沉淀可复用编排 | 共享绘图、媒体主钟、段落脚本、交互阶段与失败回退，减少重复实现 |
| 让重复使用有积累 | 用户每次行动可以改变世界，形成可以回看和继续参与的痕迹；真实留存效果仍需测试 |

精彩程度取决于创意、音乐、动作与节奏的匹配。完成率、传播、付费与商业收益尚未测量。

## 三个原创扩展样式

共同风格是纸底墨线、水彩质感、两个有性格的角色、一条世界规则、32 秒四幕故事和可参与表演。每幕 8 秒，29 个独立 PNG 构成背景、人物、道具及动作变体；没有套用原作猫、鱼或食品元素。

| 样式 | 角色与动作 | 参与和积累 | 配乐状态 |
| --- | --- | --- | --- |
| 引力花园 | 懒石头园丁 × 急性子风精灵；吹种、旋流、接力、落土与生长 | 拖风、点按接力、选择岛面落点；本机保存最近四株真实位置 | MiniMax Music3 已生成并接入 |
| 月亮修补铺 | 严肃裁缝 × 淘气月亮；追逐、拉线、飞补丁、三针缝合 | 拖线、点击反应；收藏在月亮上留下补丁和本机计数 | 一次生成请求因配额拒绝，待生成 |
| 影子排练场 | 夸张影子 × 害羞光团；追光倾身、连续旋身、共舞与谢幕 | 拖灯、点按换动作；保存最近三个实际姿势与参数，前排最多五位观众 | MiniMax Music3 已生成并接入 |

| 引力花园 | 月亮修补铺 | 影子排练场 |
| --- | --- | --- |
| ![引力花园概念关键帧](assets/concepts/gravity.png) | ![月亮修补铺概念关键帧](assets/concepts/moon.png) | ![影子排练场概念关键帧](assets/concepts/shadow.png) |

以上是创意方向参考图；实际演出由拆分素材构成。默认无声，点击花园或影子配乐开关才播放。两首实际文件均处理为 32 秒，原始 WAV 与生成回执保留，没有变速或合成替代：花园原曲 35.027 秒，裁切并末秒淡出；影子原曲约 29.94 秒，淡出并补尾部静音。月亮没有音乐文件，不播放其他场的曲子。见 [配乐提示](notes/world-music-briefs.json)、[花园/月亮回执](notes/world-music-generation-v10.json)和[影子回执](notes/world-music-generation-v9.json)。

三个小世界只保存本浏览器 `localStorage` 的有限世界状态，未连接真实业务完成事件、不保存实际研究内容、不增加研究回执。资料页的本机核验与持久回执是另一条真实工作流程；公开静态站只能查看构建时快照。

## 可以扩展哪些产品

下列是可继续建设的产品方向，尚未接入业务；每个方向都需要先确定可信的功能结果，再设计对应声画表达。

| 产品方向 | 真实功能可以怎样转为体验 |
| --- | --- |
| 知识收藏 / 研究归档 | 一份收藏成功 → 一颗种子落地生长，保留发现的积累 |
| 任务 / 习惯 / 专注 | 一次任务完成或专注结束 → 角色合作完成一幕，世界逐步成长 |
| 文件 / 素材整理 | 一次真实分类、整理或清理 → 物件归位、空间舒展；文件引擎及平台权限另行实现 |
| 创作成果 / 品牌展示 | 真实作品与产品能力 → 可玩的故事、角色演出和音乐段落 |
| 互动课程 / 新手引导 | 练习结果或学习步骤 → 角色回应、剧情进展与明确的进度反馈 |
| 音乐叙事编辑器 | 原创或授权音乐、素材、词级时间与场景脚本 → 可编辑的互动演出；当前没有完整编辑器 |

相关研究：[004 · Rhythm Drop（已归档）](../004-rhythm-drop/README.md) 的音乐叙事、[008 · CellMotion](../008-cellmotion/README.md) 的文字动效、[010 · Dumpling Style Lab](../010-dumpling-style-lab/README.md) 的手绘品牌、[015 · AI Creative Products](../015-ai-creative-products/README.md) 的创作成果。它们是结合方向，当前没有因此完成跨项目集成。

## 运行与验证

静态网站可查看全部页面、三场演出、两首本地配乐、离线视频与资料快照；真实资料重新核验和保存需要本机 Python 服务。首次在仓库根目录安装、构建并启动：

```powershell
npm --prefix projects/016-chippytea-lab/tooling ci
python projects/016-chippytea-lab/tooling/research_snapshot.py
node projects/016-chippytea-lab/tooling/build.mjs
python scripts/build_site.py
python projects/016-chippytea-lab/tooling/research_server.py
```

本机入口为 `http://127.0.0.1:8977/projects/016-chippytea-lab/`。资料服务只读取清单固定材料，写入本项目 `notes/research-collection.json`：一项目一回执，重复核验不增数，资料变化更新原回执，失败不返回保存成功。结构检查不认证研究结论或页面质量。操作、键盘、存储和 API 详见 [Web README](web/README.md)。

| 证据 | 可以支持的结论 |
| --- | --- |
| v10 离线渲染与行为检查 | 160 帧、133 条探针、32 张联系图、59 项共享渲染检查通过；29 个 PNG 指纹一致 |
| v10 Host / 音频模拟 | 67 项逻辑模拟通过，覆盖切场、计时、暂停、错误回退、落点和姿势保存等规则 |
| 实际音频文件 | 花园与影子 MP3 解码为 32 秒、来源与文件 SHA 可追溯；离线 FFT 已核验 |
| 历史真实研究入册 | 保存、去重、更新、刷新保留、缺项阻止及导出曾有浏览器证据；不代表三个新场景全部验收 |
| 2026-10-08 本次浏览器验收 | 60 项真实 Chromium 检查通过，72 个运行资源大小/SHA核对通过；桌面/手机、画面、互动、两首实际配乐/频谱、暂停、保存重载、下载、全文档案均有检查记录。详见 [本机检查](notes/publication-local-checks.json)；人工听感与实机兼容另验 |

原生 Mac 应用、真实删除、空间释放、完整无障碍、全浏览器兼容及商业收益未验证。历史过程和旧版预览继续保存在 [研究笔记](notes/research.md)、[原创设计](notes/original-worlds.md)与[设计记录](design-qa.md)，当前结论优先。

## 来源与许可

- [原作官网](https://www.chippytea.com/) · [上游仓库](https://github.com/richiemcilroy/chippytea) · [研究快照 f245695](https://github.com/richiemcilroy/chippytea/tree/f245695)。
- 复用代码与绘图路径遵循上游 MIT；已保留 [许可证](CHIPPYTEA-LICENSE.txt)和[网页来源声明](web/source-notice.html)。原作截图用于有来源的研究记录。
- 原作歌曲 **Save Your Mac with chippytea** 仅从官网远程播放，未下载归档。歌曲权益独立于代码 MIT；原创 MiniMax 音乐也不能沿用原代码许可结论。
- 新世界的原图、素材与生成来源均留在项目资料中；公开网页不包含服务密钥。

[返回总索引](../../README.md#项目索引)


## 正式上线与公网验收

2026-10-08 内容提交 [665c0c68](https://github.com/yydshly/0930_codex_project/commit/665c0c687631c1087123743128b0303e9f5114c1) 的 [Pages 检查、构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37803483007)成功。2026-10-09 公网62项真实浏览器检查通过；72个公共文件大小及SHA-256匹配发布清单，原图字节不变，14个既有项目入口均HTTP200。验证包括原图下载、三视频解码、三世界实际Canvas与互动、两曲真实播放/频谱/画面时间、暂停、存档重载、桌面/手机、只读回执和全文档案。早期加载与下载等待超时保留在检查记录中，延长有界等待后通过；此前成功的资源校验仅在清单完全不变时复用。

[在线总览](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/) · [全部效果](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/#entries) · [完整档案](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/research.html) · [公网检查](notes/publication-online-checks.json) · [发布记录](notes/deployment-summary.json)。这是静态体验与软件浏览器验证，人工听感、Mac原生引擎、真实业务与收益另验。
