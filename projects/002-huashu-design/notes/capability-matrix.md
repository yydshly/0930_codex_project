# 16 项能力矩阵

本文件与展示页共用 web/data.js，由 scripts/generate-reference.cjs 生成。固定版本：0830494ecb1c117e25b313a8114fe55a6bf2b125。条目是研究归纳，不是上游原有的能力计数。源码/文档存在不代表完整链路已实测。

| 编号 | 能力 | 分组 | 主要产物 |
| --- | --- | --- | --- |
| 1 | 交互原型 | 视觉产出 | HTML 原型，移动设备外框，页面切换、弹窗、标签页等前端状态。 |
| 2 | 浏览器幻灯片 | 视觉产出 | 多文件 HTML deck 与概览墙；简单共享状态场景可用单文件 deck-stage。 |
| 3 | PDF 文档导出 | 导出与交付 | 多页 PDF；文本通常可搜索，实际效果取决于页面内容。 |
| 4 | 可编辑 PPTX | 导出与交付 | PowerPoint 文本框、形状、图片；路线 B 可以继承模板母版。 |
| 5 | 时间轴动画 | 视觉产出 | 可在浏览器播放、暂停和定位的 HTML 动画。 |
| 6 | MP4 / GIF 与透明素材 | 导出与交付 | MP4、GIF；HyperFrames 文档还提供带 alpha 的 MOV、WebM 和 PNG 序列。 |
| 7 | 配音、字幕与长解说 | 导出与交付 | 分段音频、voiceover.mp3、timeline.json，以及带字幕的动画和成片。 |
| 8 | 背景音乐与动作音效 | 导出与交付 | 含背景音乐、动作音效或解说的音视频文件。 |
| 9 | 信息图与数据可视化 | 视觉产出 | 信息图网页、截图或 PDF；单独 SVG 需图形本身具有对应结构。 |
| 10 | 多方向设计探索 | 设计流程 | 多个可见初稿、选择记录与后续深化方向。 |
| 11 | 品牌资产与事实协议 | 设计流程 | brand-spec.md、素材路径、CSS 变量及必要事实记录。 |
| 12 | Tweaks 实时调参 | 设计流程 | 页面内调节面板；当前浏览器可保存参数。 |
| 13 | 设计评审 | 检查与评审 | 概念判断、分项评分、Keep / Fix / Quick Wins。 |
| 14 | HTML 与视频验证 | 检查与评审 | 截图、控制台记录、媒体参数检查结果。 |
| 15 | AI 看片评审 | 检查与评审 | 模型生成的结构化看片报告。 |
| 16 | 风格、组件与案例复用 | 设计流程 | 适配任务的参考方案、设备框、幻灯片壳和动画部件。 |

## 1. 交互原型

把产品想法变成可点击的多屏界面，验证信息结构和操作流程。

| 项目 | 说明 |
| --- | --- |
| 输入 | 目标用户、核心流程、真实内容、品牌素材、屏幕清单。 |
| 输出 | HTML 原型，移动设备外框，页面切换、弹窗、标签页等前端状态。 |
| 实现 | 由 Agent 编写 HTML / React 状态机，复用 ios_frame 等组件；浏览器处理布局与事件。 |
| 边界 | 按钮能点击不代表存在真实后台；登录、支付、数据库、权限与服务可靠性不由此自动实现。 |
| 验收 | 逐个点击关键路径；核对返回、关闭、切换；检查窄屏和控制台；标注模拟数据。 |

证据：[SKILL.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SKILL.md)、[references/app-prototype.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/app-prototype.md)、[assets/ios_frame.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/ios_frame.jsx)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 2. 浏览器幻灯片

将内容组织为可演讲的多页作品，支持概览与键盘翻页。

| 项目 | 说明 |
| --- | --- |
| 输入 | 受众、讲述目标、页数、逐页内容、比例、品牌规范。 |
| 输出 | 多文件 HTML deck 与概览墙；简单共享状态场景可用单文件 deck-stage。 |
| 实现 | deck_index.html 用清单组织页面；deck_stage.js 提供缩放、导航和演讲辅助。 |
| 边界 | 浏览器交互不会自动变成 PowerPoint 动画；多文件需要随附件一同交付。主文档对单文件页数阈值有不同表述。 |
| 验收 | 逐页检查内容、字号、裁切；测试首尾翻页、概览选择及目标投屏尺寸。 |

证据：[assets/deck_index.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/deck_index.html)、[assets/deck_stage.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/deck_stage.js)、[references/slide-decks.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/slide-decks.md)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 3. PDF 文档导出

将浏览器页面打印并合并为便于分享的 PDF。

| 项目 | 说明 |
| --- | --- |
| 输入 | 已完成 HTML 页面、画布尺寸、页序、可用字体和图片。 |
| 输出 | 多页 PDF；文本通常可搜索，实际效果取决于页面内容。 |
| 实现 | export_deck_pdf.mjs 遍历 HTML，调用 page.pdf()，使用 pdf-lib 合并；单文件 deck 另有脚本。 |
| 边界 | 固定尺寸、图片分辨率、字体加载仍影响结果；矢量 PDF 不等于所有元素都是矢量，也不是排版软件工程文件。 |
| 验收 | 检查页数、文字可选取性、图像、页序与实际打印效果。 |

证据：[scripts/export_deck_pdf.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_pdf.mjs)、[scripts/export_deck_stage_pdf.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_stage_pdf.mjs)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 4. 可编辑 PPTX

把 HTML 中的文字和形状转换成可编辑幻灯片对象。

| 项目 | 说明 |
| --- | --- |
| 输入 | HTML 与输出尺寸；需要保留企业母版时提供 .pptx 模板。 |
| 输出 | PowerPoint 文本框、形状、图片；路线 B 可以继承模板母版。 |
| 实现 | 路线 A：Playwright 测量 DOM → html2pptx.js → pptxgenjs。路线 B：渲染后元素清单 → pptx_from_rendered.py → python-pptx。 |
| 边界 | 两条路线都有对象映射限制。路线 B 的 SVG / canvas 会截图为图片；CSS 效果和网页动画不保证保留。 |
| 验收 | 在目标 PowerPoint / WPS 中打开；核对文字、行距、图形和母版修改；不能只验缩略图。 |

证据：[scripts/html2pptx.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/html2pptx.js)、[scripts/pptx_from_rendered.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/pptx_from_rendered.py)、[references/editable-pptx.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/editable-pptx.md)、[references/pptx-from-rendered-html.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/pptx-from-rendered-html.md)。

## 5. 时间轴动画

通过时间函数控制元素出现、移动、缩放和透明度。

| 项目 | 说明 |
| --- | --- |
| 输入 | 叙事、分镜、关键帧、时长、文字与素材。 |
| 输出 | 可在浏览器播放、暂停和定位的 HTML 动画。 |
| 实现 | Stage 提供全局秒数；Sprite 提供片段局部进度；interpolate 与 Easing 将时间映射为视觉属性。 |
| 边界 | 自研轻量引擎不提供完整三维、物理或视频剪辑环境；不是扩散式视频生成模型。 |
| 验收 | 检查首帧、关键帧、字幕阅读时间、结尾和重复播放行为。 |

证据：[assets/animations.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/animations.jsx)、[references/animations.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animations.md)、[references/storyboard-basics.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/storyboard-basics.md)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 6. MP4 / GIF 与透明素材

把 HTML 动画转成可分发的视频，按场景选择渲染路线。

| 项目 | 说明 |
| --- | --- |
| 输入 | 动画页面、时长、帧率、音轨及所需后端环境。 |
| 输出 | MP4、GIF；HyperFrames 文档还提供带 alpha 的 MOV、WebM 和 PNG 序列。 |
| 实现 | 旧路线实时录制 WebM 后编码；seek 路线冻结 Stage 时钟逐帧截图；新项目默认 HyperFrames + GSAP 时间轴。 |
| 边界 | 逐帧 seek 要求动画受同一时钟驱动；独立 CSS 动画不会自动同步。透明输出、3D 和 shader 能力来自外部后端，本站未实测。 |
| 验收 | 校验时长、帧率、分辨率、音轨、首尾黑帧；对透明素材叠色底检查。 |

证据：[scripts/render-video.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video.js)、[scripts/render-video-seek.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video-seek.js)、[scripts/convert-formats.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/convert-formats.sh)、[references/hyperframes-backend.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hyperframes-backend.md)、[scripts/verify-video.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify-video.sh)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 7. 配音、字幕与长解说

先生成解说音频，再根据测得的时长驱动画面与字幕。

| 项目 | 说明 |
| --- | --- |
| 输入 | 带 scene 和 cue 标记的 Markdown 解说稿、音色、配音服务配置。 |
| 输出 | 分段音频、voiceover.mp3、timeline.json，以及带字幕的动画和成片。 |
| 实现 | narrate-pipeline.mjs 分段调用 TTS，用音频时长定位 cue；NarrationStage 使用统一时间轴。 |
| 边界 | TTS 将文本发往服务商，需用户凭据与显式同意；字级时间戳不可用时会降级，不能保证卡拉 OK 字幕。 |
| 验收 | 逐句听音、核对数字专名、检查字幕断行、cue 对齐和人声响度。 |

证据：[scripts/narrate-pipeline.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/narrate-pipeline.mjs)、[scripts/cloud/tts-doubao.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/cloud/tts-doubao.mjs)、[assets/narration_stage.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/narration_stage.jsx)、[references/voiceover-pipeline.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/voiceover-pipeline.md)。

## 8. 背景音乐与动作音效

使用音乐建立节奏，用音效对应点击、转场、落位和反馈。

| 项目 | 说明 |
| --- | --- |
| 输入 | 画面成片、音乐、音效清单与时间点、目标音量。 |
| 输出 | 含背景音乐、动作音效或解说的音视频文件。 |
| 实现 | add-music.sh、sfx-cues.sh、mix-voiceover.sh 调用媒体工具进行裁切、混合与音量处理。 |
| 边界 | 仓库音频素材不等于任意外部商业音乐的授权；音乐、旁白与音效可能互相遮盖，需试听。 |
| 验收 | 检查对白清晰、音效时点、过载、静音及整体响度。 |

证据：[scripts/add-music.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/add-music.sh)、[scripts/sfx-cues.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/sfx-cues.sh)、[scripts/mix-voiceover.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/mix-voiceover.sh)、[references/audio-design-rules.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/audio-design-rules.md)、[references/sfx-library.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/sfx-library.md)。

## 9. 信息图与数据可视化

用图形、层级和排版将数据与复杂概念组织为易读内容。

| 项目 | 说明 |
| --- | --- |
| 输入 | 真实数据、单位、时间范围、来源、对比目的。 |
| 输出 | 信息图网页、截图或 PDF；单独 SVG 需图形本身具有对应结构。 |
| 实现 | 浏览器 Grid 与排版能力组织内容，SVG 或绘图库表达图表；数据可由 Agent 写入或由应用读取。 |
| 边界 | 不会自动保证数据准确、统计方法正确或地图可信；PNG 的像素数与印刷尺寸需单独计算。 |
| 验收 | 检查来源、单位、轴线、比例、标签、小屏可读性和色觉可辨性。 |

证据：[references/design-styles.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/design-styles.md)、[demos/c5-infographic.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c5-infographic.html)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 10. 多方向设计探索

为同一内容做差异化初稿，让选择建立在真实视觉上。

| 项目 | 说明 |
| --- | --- |
| 输入 | 目标、受众、素材、约束、尺寸与参考。 |
| 输出 | 多个可见初稿、选择记录与后续深化方向。 |
| 实现 | 三套探索逻辑：打破惯性的风格抽样、真实优秀案例参照、设计师方法推演。宿主支持时可由子代理分别执行。 |
| 边界 | 设计师名字是方法参照，不代表本人参与或质量背书；三版并行会增加模型消耗。新版默认所有新视觉任务先过此流程，文档存在部分例外表述冲突。 |
| 验收 | 同内容、同尺寸比较；布局骨架有实质差异；记录用户选定内容。 |

证据：[SKILL.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SKILL.md)、[references/multi-perspective-parallel-case-study.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/multi-perspective-parallel-case-study.md)、[assets/design_canvas.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/design_canvas.jsx)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 11. 品牌资产与事实协议

从真实 logo、产品截图和规范开始，减少凭记忆设计。

| 项目 | 说明 |
| --- | --- |
| 输入 | 品牌资料、产品事实、官方资源与禁区。 |
| 输出 | brand-spec.md、素材路径、CSS 变量及必要事实记录。 |
| 实现 | 收集需求、查官方渠道、取得资产、校验真实性、写入规范，再让后续设计引用。 |
| 边界 | 自动提取的高频颜色不一定是品牌主色；公开可下载不自动等于任意用途授权。 |
| 验收 | 核对 logo 版本、素材出处、字体可用性、色彩和内容事实。 |

证据：[SKILL.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SKILL.md)、[references/brand-asset-protocol.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/brand-asset-protocol.md)、[scripts/fetch_images.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/fetch_images.py)。

## 12. Tweaks 实时调参

不用修改代码即可对比颜色、字号、密度和其他参数。

| 项目 | 说明 |
| --- | --- |
| 输入 | 提前定义的参数、默认值和可调范围。 |
| 输出 | 页面内调节面板；当前浏览器可保存参数。 |
| 实现 | 前端状态驱动 CSS 变量或组件属性，localStorage 保存偏好。 |
| 边界 | 只影响被参数化的部分；浏览器保存不是源码回写，也不是跨设备同步或多人协作。 |
| 验收 | 刷新后仍保留合法值；可以重置；存储受限时仍能使用。 |

证据：[references/tweaks-system.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/tweaks-system.md)、[demos/c4-tweaks.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c4-tweaks.html)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 13. 设计评审

按设计目标分析优点、问题和优先修改项。

| 项目 | 说明 |
| --- | --- |
| 输入 | 可见设计、目标受众、使用场景与选择的设计方向。 |
| 输出 | 概念判断、分项评分、Keep / Fix / Quick Wins。 |
| 实现 | 评审指南在五项执行指标之前新增概念/立意维度；概念不足时限制整体评价。 |
| 边界 | 模型评分不是独立专家共识，也不是客观审美测量；需真实用户反馈和一致的评价口径。 |
| 验收 | 每项问题关联可见证据；改进建议具体；复评使用同一标准。 |

证据：[references/critique-guide.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/critique-guide.md)、[demos/c6-expert-review.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c6-expert-review.html)。

对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。

## 14. HTML 与视频验证

检查页面能否正常运行，并对导出的媒体做技术校验。

| 项目 | 说明 |
| --- | --- |
| 输入 | HTML 或视频、目标尺寸、页数、期望时长。 |
| 输出 | 截图、控制台记录、媒体参数检查结果。 |
| 实现 | verify.py 使用 Playwright；verify-video.sh 检查视频参数、音频、黑帧及响度。 |
| 边界 | verify.py 本身不执行完整业务路径；它主要截图和收集错误，console error/warning 不一定使进程失败。不能把退出码为零当作视觉合格。 |
| 验收 | 补充真实点击断言、视觉检查及多尺寸测试；输出清晰的通过/失败范围。 |

证据：[scripts/verify.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify.py)、[scripts/verify-video.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify-video.sh)、[references/verification.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/verification.md)。

## 15. AI 看片评审

让视频理解模型辅助发现死段、黑帧、叙事与音效问题。

| 项目 | 说明 |
| --- | --- |
| 输入 | 已渲染视频、上下文说明、用户自己的 API 配置。 |
| 输出 | 模型生成的结构化看片报告。 |
| 实现 | 脚本压缩分段后将视频发往火山方舟官方接口；有 --yes / 环境变量同意门。 |
| 边界 | 会传输视频内容且产生服务费用；模型可能漏检或误判。未配置 key 不能产出真实评审。 |
| 验收 | 报告对照实际片段复核；调用失败需明确失败；保留人工看片。 |

证据：[scripts/cloud/ai-review-video.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/cloud/ai-review-video.py)、[references/ai-video-review.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/ai-video-review.md)、[SECURITY.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SECURITY.md)。

## 16. 风格、组件与案例复用

用可阅读的配方与现成基础组件减少重复设计。

| 项目 | 说明 |
| --- | --- |
| 输入 | 媒介、内容、品牌、表达气质和允许的实现方式。 |
| 输出 | 适配任务的参考方案、设备框、幻灯片壳和动画部件。 |
| 实现 | references 按任务加载；assets 存起手组件与 8 场景 × 3 风格的预制 HTML/PNG；demos 展示能力。 |
| 边界 | 风格库里的还原度百分比是作者估计，不是本站测评；预制样例不是为本次需求新生成的成果。 |
| 验收 | 先核对内容和品牌适配性；必要时重做布局；记录来源与许可。 |

证据：[references/design-styles.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/design-styles.md)、[assets/showcases/INDEX.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/INDEX.md)、[SKILL.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SKILL.md)。


[返回研究入口](../README.md)

