# 012 · Black Hole Lab · 黑洞原理与成像实验室

独立实现黑洞外部成像效果：暗影、外部热气体形成的亮盘、弯光形成的背面亮弧与频移明暗。再用可暂停的动态过程连接「黑洞是什么」「大质量恒星为何向内塌缩」「这些光如何成为所见影像」，配有 10 章 / 30 段、约 13 分 3 秒的 MiniMax 完整中文旁白。

后续讨论整理了时空、可测的时间差、固有时与身体衰老、引力影响与实际意义，并明确区分已获观测支持的外部效应、理论旅行例子、未知的内部结构及网页的简化范围。适合科普、课堂、展览与游戏效果研究；实时画面采用无自旋外部时空和简化薄盘，形成与气体输运的一部分为机制示意。

## 公开网页与全部入口

[全部展示入口](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/#overview) · [实时效果与完整课程](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/#experiment) · [我们的理解总结](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/#understanding) · [完整研究档案](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/research.html) · [相关来源与链接](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/#references)。

[沿用的总览图 PNG](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/assets/understanding-map.png) · [可编辑 SVG](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/assets/understanding-map.svg) · [完整 MiniMax 旁白 MP3](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/audio/narration/full-course.mp3)。

[时空与光钟交互实验](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/time-and-light.html)：沿用讨论中的事件坐标、不同半径的理想静止时钟、视界内外光路与高速光钟动画。引力时钟与运动光钟分别说明假设；光钟用于测量时间，不是衰老的光源。

本地网页入口为 [web/index.html](web/index.html#overview)，完整档案为 [web/research.html](web/research.html)。档案保留 UNDERSTANDING、SCIENCE、PRINCIPLES、NARRATION、CONSTRUCTION 与 research 六份文档的完整正文、全部已保存验证记录与 GitHub 原始资料链接；当前科学说明与模型放在前面，旧版着色器构造记录明确标为历史。引导图使用之前生成的总览图，不重新生成。

网页新增 [理解总结](web/index.html#understanding)：一张可下载的总览图串起黑洞效果、形成机制、时空影响、固有时与身体衰老、证据和未知。图下有适合手机及辅助阅读的完整文字版，保留“真实时间差 / 普通环境影响 / 收到的光似乎停住”三种情况的区分。

[总览 PNG](web/assets/understanding-map.png) · [总览 SVG](web/assets/understanding-map.svg) · [整理依据与科学边界](notes/UNDERSTANDING.md)。图中的黑洞画面来自本项目的温度伪彩模式；“自身一年 / 地球十年”是理论例子，不是本页的数值行程或已实现的人类旅行。

## 运行

在研究集根目录运行：

```powershell
python -m http.server 8972 --bind 127.0.0.1 --directory projects/012-black-hole-lab/web
```

打开 <http://127.0.0.1:8972/>；端口占用时换用空闲端口。前端没有第三方运行依赖。科学图解使用 Canvas 2D，逐像素成像需要 WebGL 2。没有 WebGL 时，图解仍可操作，成像区显示限制。

## 看什么、怎么操作

点击「播放完整讲解」，观看 10 章、30 段的完整流程。MiniMax 预生成旁白总长约 13 分 3 秒，覆盖定义、形成原因、过程、成像与最终结果。播放器在每段音频实际播完后推进；暂停续播保留位置，也支持单章讲解、拖动当前段进度、倍速与完整 MP3 下载。短字幕、当前朗读内容和展开的完整原稿均可查看。

| 章 | 展示 | 要理解的因果 |
| --- | --- | --- |
| 00 | 最终黑洞影像与部位说明 | 黑洞、周围热气体、弯曲光路是三件相关的事 |
| 01 | 向内引力与向外压力梯度 | 恒星有支撑时，暂时不会继续塌缩 |
| 02 | 晚期核心支撑不足 | 核心失稳会触发向中心的收缩 |
| 03 | 计算的自由落体、随落时钟与远方信号 | 物质可在有限自身时间越过参考尺度；外部收到的光逐渐延迟、变暗 |
| 04 | 视界内、视界上、视界外的径向光线 | 事件视界是向外传递信号的因果边界 |
| 05 | 带角动量的气体与输运箭头 | 绕行、耗散和角动量输运使气体成盘并逐步吸积 |
| 06 | 计算的盘温度与光谱峰值 | 释放的轨道能量使外部气体发光，颜色取决于频段 |
| 07 | 计算的光路与对应亮弧 | 背面盘光绕行抵达相机，盘本身仍近似平面 |
| 08 | 频移与明暗对照 | 气体运动和重力改变接收到的频率与亮度 |
| 09 | 完整结果与自由观察 | 旋转、改变参数、回顾因果并导出画面 |

恒星部分展示**一条恒星质量黑洞的形成路线**。气体、发光、弯光和频移是随后拆开讲解的观测机制，并不在自然中按章节次序开关。

## 「真实」指什么

物理定义与因果来自天体物理资料；部分可用简化模型计算的关系直接计算：

- **实际计算**：Schwarzschild 外部时空中的自由落体、径向光线、弯曲光轨道、重力与运动频移；选定稳态薄盘模型的温度和可见波段黑体辐射。
- **机制示意**：恒星压力箭头、气体粒子如何集中、角动量向外输运。没有求解整颗恒星或磁流体。
- **显示处理**：有限步长、有限像素和波长采样、程序化背景与盘纹理、曝光及色调映射。温度伪彩模式有明确标注。

默认质量为 10 M☉：视界参考半径约 29.53 km。默认吸积率为 10⁻⁹ M☉/年，选定模型的盘温峰值约 194.6 万 K，局部黑体的波长峰值约 1.49 nm，主要落在软 X 射线。默认可见光模式显示所选频段的计算结果；暖橙伪彩是温度与亮度的可视化，不能当作肉眼照片。

本项目采用无自旋、无电荷的静态外部模型，没有计算动态视界位置、超新星、恒星内部、中微子、磁场或完整辐射流体。公式正确与一整套真实天体模拟是不同层次。具体假设和数值边界见 [科学说明](notes/SCIENCE.md)与 [成像实现](notes/PRINCIPLES.md)。

## 场景与扩展

| 场景 | 当前用途 | 有意义的下一步 |
| --- | --- | --- |
| 科普、课堂、展览 | 同步解释画面、回放与受控对照 | 恒星结局分支、学习反馈、多语言旁白 |
| 太空游戏 | 实时弯光、可旋转的探索地标 | 场景物体成像、飞船动力学、引擎移植 |
| 科学可视化 | 可核对公式与数值的外部模型 | Kerr 自旋、相对论薄盘、真实观测带通与收敛测试 |

## 实现与验证

公开打包保留 `web/` 中的演示页面、脚本、样式、图像与全部 31 个 MP3（30 段及合并录音）；完整研究以可直接阅读的 HTML 发布，原始 notes、工具和 JSON 回执保留在源码仓库。网页运行不调用 MiniMax API，也不携带密钥或依赖目录。

从仓库根目录重新生成完整档案并打包：

```powershell
python projects/012-black-hole-lab/tooling/build-research.py
python scripts/build_site.py
```

档案生成只使用 Python 标准库，读取既有正文与验证记录，保留原说明的研究日期；公开整理日期为 2026-10-08（Asia/Shanghai）。验证记录是各次检查的快照，须按记录日期和范围解读。

[完整旁白及制作记录](notes/NARRATION.md) · [流程和文件职责](notes/CONSTRUCTION.md) · [科学定义与资料](notes/SCIENCE.md) · [计算公式与近似](notes/PRINCIPLES.md) · [运行和验收命令](web/README.md)。

模型检查入口为 `tooling/verify-model.cjs`，报告为 [model-validation.json](notes/model-validation.json)；浏览器检查入口为 `tooling/verify.cjs`，报告为 [validation.json](notes/validation.json)。请以报告的时间、检查项和结果为准。浏览器自动验收采用 Chromium/SwiftShader，手机检查是视口模拟，未作为硬件 GPU 基准。完整 30 段课程的顺序和收缩连续性见 [story-validation.json](notes/story-validation.json)，可用 tooling/verify-story.cjs 重现。实际音频解码、逐段播放结束、续播、字幕与错误恢复见 [audio-validation.json](notes/audio-validation.json)，可用 tooling/verify-audio.cjs 重现。页面滚动继续播放；浏览器标签隐藏时暂停并保留位置。历史 construction 报告对应早期着色器分层版本。

视觉起点是 [VOLDR_dev 的 Reddit shader](https://www.reddit.com/r/SoloDevelopment/comments/1wr6jr4/my_black_hole_shader_for_my_game/)，代码为独立实现。科学来源使用 NASA、原始论文和作者资料，见各说明中的链接。
