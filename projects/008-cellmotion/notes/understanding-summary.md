# CellMotion：我们的理解汇总

日期：2026-10-02。源库研究固定在 `bee7ddfc2b1f487e08aa79a3b91af7628f040eb1`，平台比较按当天的官方说明核对。

[网页总览](../web/summary.html) · [原作展厅](../web/index.html) · [原创实验室](../web/workshop.html) · [PNG 总览图](../assets/understanding-map.png) · [SVG 矢量图](../web/assets/understanding-map.svg)

![源库能力、效果、技术原理、工具区别、个人价值与 AI 日报流程总览](../assets/understanding-map.png)

## 我们确认的核心理解

代码定义运动规则，参数控制这次运动的表现，时间编排决定动作的顺序和持续时间。内容与时间共同决定画面中的一帧。将相同规则保存为模板后，可以不断替换内容、调整参数和重现画面。

这解释了为什么文字、图片、标题、信息卡片等重复制作适合用代码组织，也解释了怎样向制作方提出需求：描述元素、动作、时刻、样式、交付与验收，再把它们转换为算法和参数。

## 源库的能力是什么

CellMotion 是一组可编辑动效与对应工作台。研究版本目录有 69 条记录，其中 37 个 ready、32 个 pending；19 个 ready 条目带原作视频预览，官网有三支成片案例。数量是固定版本快照。

支持的范围依具体编辑器而不同：

- 文案、中文与多语种文字、字体、字号、字距、位置、对齐和逐行内容。
- 内置图标或上传图片、GIF；部分工作台还支持视频、背景与裁剪。
- 速度、停留、阶段时长与效果专用参数。
- 画幅、预览，以及所支持的 PNG、GIF、MP4 和配置出口。

已有“用于 AI”菜单和配置输出，不代表已接入大模型或自动视频生产线。研究版本以单动效编辑为主，视频拼接器尚未开放，通用网页组件标为规划中；接入配置消费与消息桥接仍需逐项核验。

依据：[固定版本目录](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-catalog.json)、[案例页面](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion.html)、[工作台说明](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-editors.html)、[组件页](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-components.html)。

## 效果是什么

| 形式 | 看到的变化 | 可表达的内容 |
| --- | --- | --- |
| 字符迁移与重组 | 相同字迁移、旧字缩小、新字增长 | 概念交接、口号变化、动态标题 |
| 逐字强调与关键帧 | 字符依次改变大小、位置与相对关系 | 重点词、章节、信息节奏 |
| 图标与图文接力 | 文字、图标或支持的媒体轮流成为重点 | 产品卖点、功能与流程 |
| 图片对比与翻转 | 前后对比、快门、翻面与空间切换 | 作品效果、商品与照片展示 |

这些描述概括视觉形式，实际原作在展厅播放；原创实验室的四种演示独立编写，没有复刻全部上游效果。

## 技术原理是什么

```text
内容与参数 → 字符/素材单元 → 测量与排版
运动规则 + 当前时间 → 位置/大小/透明度等状态
元素状态 → Canvas 2D 或 p5.js / WebGL → 当前完整一帧
```

具体到字融：根据 token key 匹配未占用的目标字符；相同字位插值迁移，删除项缩小淡出，新增项放大淡入。字阶使用字形框关键帧与阶段时间映射。不同效果需要不同算法，不能把字融理解成所有文字逐笔画变形。

用一个匀速例子理解插值：一个字两秒内从 x=100 移到 x=300，位置由 `x = 100 + (300 - 100) × p` 得出。p 为 0、0.5、1 时，位置分别为 100、200、300。缓动改变进度到位置的映射，从而改变起步、收尾与过冲感。

预览按当前时间绘制。视频导出按 `t = 帧号 / fps` 取样，再把像素交给编码器；4 秒、30 fps 对应 120 帧。字融源码有 PNG、GIF、H.264 MP4 的导出路径。本轮实测中文修改和 PNG，GIF / MP4 只核对源码。

依据：[字融源码](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/glyphmorph.js)、[字阶源码](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/letterpulse.js)。详细证据见 [research.md](research.md)。

## 和 Remotion、HeyGen 对比

| 维度 | CellMotion | Remotion | HeyGen |
| --- | --- | --- | --- |
| 定位 | 动效与对应编辑器集合 | 代码视频框架和渲染工具 | 云端 AI 视频产品与服务 |
| 技术入口 | 自行编写 JS 动效算法，用 Canvas 等绘制 | JS / TS、React 与当前帧号 | 平台和接口的制作与生成能力 |
| 控制重点 | 文案、字位、媒体与所选运动参数 | 场景组件、布局、逐帧状态、时序与渲染 | 脚本、人物、声音、背景、素材及开放的制作字段 |
| 交付范围 | 单动效预览与编辑器支持的导出 | 网页预览、图像序列、渲染后的视频等 | 口播素材、生成素材或平台制作的完整视频 |
| 可在日报里负责 | 片头、标题交接、关键词、图片切换 | 组织整片场景、素材、时序与输出 | 生成主播口播，或采用其自动视频制作流程 |

Remotion 提供按帧计算的 React 场景与渲染工具；具体动效仍需编写或复用。当前实验室与它共享“内容、规则与时间决定画面”的思路，但没有使用 Remotion。使用同一种语言，不意味着同一种封装范围；接入 Canvas 效果仍需适配时间和资源载入。

HeyGen 既有数字人配置，也提供自动视频制作功能。可以用它制作口播素材，再放进自己掌控的整片流程；也可以采用其平台流程。精细控制范围应按具体功能核验，本研究没有核验服务内部模型架构或执行实际生成。

依据：[Remotion 帧驱动原理](https://www.remotion.dev/docs/the-fundamentals)、[Remotion 渲染 API](https://www.remotion.dev/docs/renderer)、[HeyGen 脚本与场景配置](https://help.heygen.com/en/articles/11381771-how-to-write-scripts-in-the-ai-studio)、[HeyGen 自动视频制作](https://www.heygen.com/tool/ai-video-generator)。日报分工是根据这些能力推导的方案建议。

## 使用场景与对你的意义

场景可以是品牌活动标题、产品卖点、作品前后对比、课程章节、每日信息与 AI 日报。适合将内容变化与视觉规则分开管理：每天输入新文案、日期、配图和摘要，沿用已经确定的排版与运动节奏。

对你的意义有三点：

1. **指导创作**：用画面语言提出要求，再检查某个时刻的某个元素是否达到预期。
2. **复用制作**：把稳定设计变成配置与模板，内容可以反复替换，参数可以保存和恢复。
3. **逐层扩展**：先改参数，再组合动作，再增加新算法，最后接入数据、配音、整片与批量输出。

以上是制作方式的价值判断，未实测效率或商业收益。原库根许可为 [CC BY-NC-SA 4.0](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/LICENSE)，第三方资源另有许可。商业使用需按具体代码和素材核对；独立实现思路与直接使用上游资产的许可判断需要分别处理。

## 现有网页能力汇总

| 页面 | 已经提供 | 当前范围 |
| --- | --- | --- |
| [原作展厅](../web/index.html) | 原作视频、分类目录、三支案例、原编辑器、源码说明、原理时间轴与场景 | 在线原作需联网；实测字融中文修改及 PNG，未全量执行每个编辑器的导出 |
| [原创实验室](../web/workshop.html) | 文字匹配、逐字打入、放大接力、碎片聚合；文本、图片、样式、时间参数；播放与拖动；阶段算式；需求生成；PNG/JSON 保存与载入 | 独立 JS + Canvas 2D，37 项交互检查通过；没有 AI 调用、视频编码或平台接入 |
| [理解总览](../web/summary.html) | 六部分总览图及 PNG/SVG 下载，能力效果、原理、三者比较、网页盘点、价值与日报流程 | 16 项导航、下载与布局检查通过；日报流程为扩展构想 |

现有功能与原库能力分别注明，避免将原创实验室的功能算成上游功能。图片替换和配方恢复在本地完成，配方 JSON 可携带图片；没有上传素材。

## AI 日报怎么扩展

```text
新闻数据与来源 → AI 辅助整理标题、摘要和脚本
                         ↓
                内容与视觉模板
                         ↓
        配音 / 可选 HeyGen 数字人口播素材
                         ↓
     整片时间轴、素材合成与编码，可采用 Remotion
                         ↓
                  验收与版本管理
```

完整流程还需数据接入、内容核对、音频、场景时序、字幕、编码与输出管理。当前实验室示范了局部动效和配方，没有已经接通的自动日报生产线；批量生产还需数据字段、命名规则和失败恢复。

可以这样驱动下一步制作：

> 请做一个可复用的 AI 日报模板：输入日期、三条新闻的标题、摘要、配图和来源。先做可拖动时间轴的网页预览，让标题逐次出现、关键词放大强调、图片保持比例；开放颜色、画幅和每条时长。先用明确标注的示例数据验收，再接入真实数据、配音与 MP4 输出。

完整需求交代内容、动作、时间、样式、输出、验收。第二轮反馈指出具体时刻、元素和期望变化，保存配方后再增加其他模块。更多提问示例与扩展层次见 [workshop.md](workshop.md)。

## 核对与交付

- 一张总览图：[可分享 PNG](../assets/understanding-map.png) 和 [可编辑 SVG](../web/assets/understanding-map.svg)。
- [汇总页验证](summary-verification.json)：图文范围、完整下载、页面导航、手机图表滚动和无脚本错误。
- 原库证据与验证：[research.md](research.md)、[verification.json](verification.json)、[layout-verification.json](layout-verification.json)。
- 实验室交互验证：[workshop-verification.json](workshop-verification.json)。

2026-10-08 已将本次完整研究纳入仓库既有 GitHub Pages 发布流程：[原作展厅](https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/)、[原创实验室](https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/workshop.html)和[理解总览](https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/summary.html)同时发布，研究集入口沿用已生成的总览图，并逐项说明摘要和边界。全部 15 个公共文件 HTTP 200 / SHA-256 及 42 项线上浏览器检查通过，13 个研究和既有项目入口可访问；公开地址与记录见项目 README、deployment-checks.json 和 publication-browser-online.json。没有调用外部视频生成服务，AI 日报流程仍是扩展方案。
