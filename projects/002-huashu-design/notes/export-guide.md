# 导出路线与交付验收

已运行实例：[真实场景实测报告](real-case.md)提供 PDF、PPTX、MP4 成品及本机实际命令；下文为更广的路线说明。

固定版本：[0830494](https://github.com/alchaincyf/huashu-design/tree/0830494ecb1c117e25b313a8114fe55a6bf2b125)。本文件解释上游路线；命令示例不是本轮成功执行记录。执行前准备对应依赖，在上游工作副本根目录使用，并保护已有同名输出。

## 1. 先用交付目的选择路线

| 目的 | 建议产物与路径 | 主要约束 |
| --- | --- | --- |
| 让人操作产品流程 | HTML 原型 | 没有自动生成真实后端 |
| 浏览器演讲 | HTML deck | 多文件页面和素材需要完整交付 |
| 定稿分享/打印 | HTML→PDF | 字体、分页与图片分辨率 |
| 从零做可编辑 PPT | 受约束 HTML→html2pptx.js→pptxgenjs | 必须从开始遵守结构/样式要求 |
| 已有 HTML 或企业母版 | 渲染坐标→pptx_from_rendered.py | SVG/canvas 等转图片；目标软件复核 |
| 新动画成片 | HTML/GSAP→HyperFrames | 外部后端依赖与确定性约定 |
| 已有 Stage 动画 | render-video-seek.js 或旧录制路线 | 所有时间行为是否受 Stage 控制 |
| 长配音解说 | 解说稿→TTS→timeline→NarrationStage | 云服务、声音质量与时间戳 |
| 透明剪辑素材 | HyperFrames→MOV/WebM/PNG 序列 | alpha、编码、剪辑软件兼容 |

## 2. HTML 原型与演讲稿

HTML 是可修改源文件，交互在浏览器运行。原型的状态切换不等于真实接口；需要明确标注模拟内容。默认复杂 deck 以多文件加概览组织，单文件用于更简单或共享状态的场景。主文档对单文件页数有不同表述，实际按内容与壳的约束选择。

验收：关键路径、首尾翻页、概览点击、刷新状态、图片加载、浏览器错误、窄屏与投屏字号。若交付离线文件，需确认所有远程字体、脚本和图像的处理方式。

## 3. PDF

多文件路线使用 Playwright 为每页 HTML 打印 PDF，再用 pdf-lib 合并；单文件 deck-stage 有专用脚本以处理页面组织。文件名排序决定多文件页序，应采用补零编号。

~~~text
node scripts/export_deck_pdf.mjs --slides slides --out deck.pdf --width 1920 --height 1080
~~~

字体和文本通常可以保留可搜索形式，位图图片仍然是位图。不能简单承诺“零视觉损失”或“所有内容矢量”。复杂浏览器效果、字体未加载和打印尺寸都要检查。

验收：页数与顺序、标题正文、文字可搜索性、图片分辨率、分页裁切、链接和预期打印尺寸。

来源：[PDF 脚本](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_pdf.mjs)。

## 4. PPTX 两路线

### A：从零规划

html2pptx.js 通过真实浏览器测量 DOM，再转为可编辑 PPT 对象。输入结构需符合文本标签、容器装饰、图片与尺寸等约束。比如某些 CSS 渐变、背景图或结构组合无法直接进入输出，必须在设计阶段选择支持的表达。

尺寸按物理单位理解：默认推荐的 960pt × 540pt 对应 13.333 × 7.5 英寸，而不是把 HTML 像素越设越大就能提高 PPT 质量。

### B：已有视觉稿或企业模板

~~~text
python scripts/pptx_from_rendered.py deck.html -o deck.pptx --selector ".slide"
python scripts/pptx_from_rendered.py deck.html -o deck.pptx --template company-template.pptx --layout "内页" --skip-class logo
~~~

该路线可从现有模板开始，保留母版、主题与版式。让 logo 等公共元素由母版提供，避免在页面内容层重复绘制。画布尺寸以模板为准，脚本按比例映射。

SVG/canvas 在该实现中截图为图片；图片圆角可被烘焙进透明通道。文本、简单形状可编辑不意味着复杂图表数据与节点全部可编辑，也不保留网页交互。

### PPT 必须单独验收

- 在最终使用的 PowerPoint/WPS 打开，不能只看缩略图。
- 逐页核对文字、图像、字体、行距、换行和层叠。
- 修改一处文本和一处母版元素，验证编辑体验。
- 对比源内容与 PPT 文本、图片数量，发现遗漏。
- 准备已知正确模板作为对照，先确认渲染工具没有字体问题。

来源：[A 约束](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/editable-pptx.md)、[B 指南](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/pptx-from-rendered-html.md)。

## 5. 视频渲染

| 路线 | 机制 | 合适情形 | 关键问题 |
| --- | --- | --- | --- |
| render-video.js | 实时浏览器录制→WebM→FFmpeg | 旧项目、非统一 seek 动画 | 初始化空帧、录制时序、帧率 |
| render-video-seek.js | 冻结 Stage，按时间截图→编码 | Stage/NarrationStage 统一时钟 | 独立 CSS 动画不会自动跟随 |
| HyperFrames | 暂停 GSAP 时间轴，框架逐帧渲染 | 新动画、复杂外部能力 | 确定性、适配、后端版本 |

~~~text
node scripts/render-video-seek.js animation.html --duration=15 --fps=60 --width=1920 --height=1080
~~~

真 60fps 是 60 个时间点的真实渲染；25fps 再插到 60fps 是估算中间画面，两者不同。GIF 通常无音频且有色彩限制，不适合替代所有成片场景。

HyperFrames 需在它自己的项目中使用对应版本命令；上游文档记录过 0.7.61 的验证，不能据此把当前最新版本视为已测试。初始化还可能安装该框架的额外技能文档，需了解其行为。本研究没有执行该初始化。

验收：分辨率、时长、帧率、音轨、首尾帧、文字停留、运动节奏、字幕与品牌素材。技术检查通过后仍需完整看一遍。

来源：[后端选型](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hyperframes-backend.md)、[seek 实现](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video-seek.js)。

## 6. 解说与音频

解说稿以 scene 与 cue 组织，TTS 生成分段音频，ffprobe 等工具测量时长，再写 timeline.json。NarrationStage 使用时间轴组织画面与字幕，最后混入人声、背景音乐和动作音效。

仅在确认可以把解说文本发送给对应服务商后，运行带 --yes 的配音命令；AI 看片同理，但上传的是视频片段。本项目不含真实凭据，也没有执行这些付费调用。

验收：专有名词、数字、停顿、字幕换行、cue 同步、人声清晰度、混音响度。音轨存在不等于内容和混音正确。

## 7. 图片、SVG 与透明素材

PNG 的清晰度取决于像素尺寸；印刷“300dpi”需要把最终物理尺寸与像素数对应起来。修改 DPI 元数据不会创造更多细节。SVG 适合原生矢量图形，不能假设整页任意 HTML 都能自动变成可编辑 SVG。

透明 MOV/WebM/PNG 序列属于 HyperFrames 后端文档提供的路线。验收时把素材叠在彩色背景上看边缘和阴影，并确认目标剪辑软件支持的编码。本轮未实测。

## 8. 交付包清单

建议包含源文件、必要素材、内容与品牌规范、版本记录、最终文件、运行方法和检查记录。标注模拟数据、字体依赖、外部来源与未验证项。不要仅交截图却声称可编辑，也不要将格式转换成功等同于内容正确。

[返回研究入口](../README.md)
