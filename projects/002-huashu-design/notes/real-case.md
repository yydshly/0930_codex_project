# 真实场景实测：研选工作台

实测日期：2026-09-30。上游固定提交：0830494ecb1c117e25b313a8114fe55a6bf2b125。目标是用同一份真实研究材料，分别完成原型、浏览器幻灯片、PDF、可编辑 PPT、时间轴动画和 MP4，让不同交付形式的能力可以直接体验。

## 1. 先看成果

[打开真实场景展厅](../web/cases/research-desk/index.html)。本地服务启动后也可访问 http://127.0.0.1:8766/web/cases/research-desk/ 。

补充整理：[我们的理解](understanding.md)总结定位、完成度、采用价值和证据范围。PDF/PPT 可通过网页阅读器直接翻页：[阅读 PDF](../web/cases/research-desk/reader.html?format=pdf)、[阅读 PPT](../web/cases/research-desk/reader.html?format=pptx)。阅读器展示实际文件的渲染图片，不是在线编辑器，原文件内容未修改。

| 成果 | 内容与入口 | 适合用来判断什么 |
| --- | --- | --- |
| 响应式交互原型 | [研选工作台](../web/cases/research-desk/prototype.html)，5 个页面、3 个详情页签 | 能否表达真实流程，点击后状态是否合理 |
| 移动设备展示 | [手机框原型](../web/cases/research-desk/mobile.html)，真实 IosFrame 组件 | 移动端布局、滚动与设备展示效果 |
| 浏览器幻灯片 | [六页方案演讲稿](../web/cases/research-desk/deck.html)，真实 deck-stage | 键盘翻页、自动缩放和浏览器演讲 |
| PDF | [六页定稿](../web/cases/research-desk/downloads/research-desk.pdf) | 固定排版、文字提取、阅读与归档 |
| PPTX | [六页可编辑汇报](../web/cases/research-desk/downloads/research-desk.pptx) | 标题/正文后续修改，图片与文本的编辑边界 |
| 时间轴动画 | [20 秒可控动画](../web/cases/research-desk/animation.html) | 播放、暂停、任意时间跳转及画面编排 |
| MP4 | [20 秒成片](../web/cases/research-desk/downloads/research-desk.mp4) | 实际编码视频的质量、时长、体积与播放 |

页面与文件全部已生成，按钮链接真实目标。PDF/PPTX/MP4 不是点击后临时生成，也不会调用云服务。当前只在本地交付，没有发布本轮网站更新。

## 2. 为什么选这个场景

用户正在建设开源项目研究集，因此选用“个人研究者评估项目是否值得试用”的任务。样本来自现有两个研究项目：Huashu Design 与 witr。它们解决不同问题，不构造虚假的竞品评分、用户量、收益或效率提升数字。

“研选”是为本次演示设计的产品概念，不是已经运营的平台。场景假设是：资料多、证据分散、采用理由容易丢失。它没有经过用户访谈验证。

业务路径：项目库搜索和用途筛选，进入项目详情，核对固定版本来源，阅读使用边界，记录采用判断，下载 Markdown 留档。桌面与手机使用同一份响应式前端。

## 3. 建议按这个顺序操作

1. 在项目库搜索“设计”，确认只剩 Huashu Design。将用途改成“本地排障”，观察组合筛选空态，再恢复全部用途。
2. 打开 Huashu Design，依次切换“采用摘要”“源码证据”“使用边界”。证据链接指向固定提交，不是浮动的 main。
3. 收藏项目，刷新后确认状态保留。写一段自己的采用理由，保存后刷新，再下载 Markdown 验证内容。
4. 打开手机框，直接滚动和操作同一个页面。也可缩窄桌面原型窗口，比较响应式效果。
5. 打开六页演讲稿，用方向键、空格、Home、End 翻页；下载 PDF 对照页序与内容。
6. 打开 PPTX，尝试修改封面标题或正文。截图里的界面文字属于图片；这是有意保留的效果图，不是漏掉的可编辑业务组件。
7. 在时间轴页面暂停，点击不同位置，观察四段镜头。再播放 MP4，比较网页动画与导出成片。

## 4. 实际复用了什么

| 层次 | 本次使用方式 | 证据与边界 |
| --- | --- | --- |
| 内容、布局和业务交互 | 当前任务根据真实资料编写 HTML/CSS/JS | 不是仓库内现成的“研选”产品，也不把普通页面逻辑归功于组件 |
| 移动设备框 | 原始 ios_frame.jsx 编译后运行 | 仅 JSX 转译，业务界面来自 iframe |
| 幻灯片外壳 | 原始 deck_stage.js 直接运行 | 缩放、键盘导航、页码和备注机制来自上游 |
| 时间轴 | animations.jsx 中 Stage、Sprite、useSprite、useTime、interpolate | 应用统一时间函数，编译时加入录制视口适配 |
| PDF | export_deck_pdf.mjs | Playwright 打印六个 HTML，pdf-lib 合并 |
| PPTX | export_deck_pptx.mjs 与 html2pptx.js | 测量 DOM 后生成原生文字等对象，补讲者备注和完整性检查 |
| MP4 | render-video-seek.js | 600 次 seek 截图，FFmpeg 编码 H.264 |

原始上游文件保留于 vendor/huashu-design，8 份源码/文档取得时都通过 Git blob SHA 核对。实际运行版本在 build/case 生成；前端转译文件在 web/cases/research-desk/vendor。随附 MIT 与 React 许可。

本次没有把上游 SKILL.md 安装成技能，也没有运行其完整访谈、视觉方向选择、评审闭环。**本轮验证的是具体组件和导出路径的可用性，不能据此宣称完整 Skill 一次自动生成成功或所有模型质量一致。**

## 5. 六种目标为什么需要不同适配

原型需要浏览器状态、表单和交互，采用响应式布局。PPT 则必须从页面编写之初遵守转换器约束：1280×720 固定画布，文字放在 p/h 标签，装饰放在外层，不使用 CSS 渐变或 background-image。否则“已有网页直接转 PPT”容易失败。

六页汇报的文本源只维护一份，由生成器写出独立 HTML 和 deck-stage 内容。PDF 与 PPTX 都来自这组页面。浏览器演讲适合导航，PDF 固定阅读，PPTX 便于继续编辑，三者不保留原型的业务交互。

视频并非录制鼠标操作。四个镜头使用真实原型截图和预设光标运动，所有过渡都由 Stage 的统一时间驱动。MP4 渲染器向页面传入 t = 帧序号 / 30，等待布局稳定后截图，再编码。它展示的是操作流程的表达方式，不是假装已经操纵后台。

## 6. 实测参数与结果

| 项目 | 结果 |
| --- | --- |
| 交互与文件检查 | 83/83 通过，记录于 real-case-checks.json |
| PDF | 6 页，16:9，403,411 字节；各页中文标题可提取 |
| PPTX | 6 页，311,987 字节；原生文字对象分别为 6、10、5、5、5、8，共 39 个 |
| PPT 备注 | 6 页均有讲者备注，相关页含来源链接 |
| PPT 完整性 | 结构、几何和独立导入检查通过；未在 Microsoft PowerPoint 中实机打开 |
| PPT 视觉 | 从实际 PPTX 导入后重新渲染六页，逐页检查；未用 HTML 截图冒充 PPT 渲染 |
| MP4 | H.264，1280×720，30fps，600 帧，20.000 秒，1,017,398 字节 |
| 视频音轨 | 无；没有调用 TTS 或放入未经验证的配音 |
| 视频检查 | 完整解码无错误，浏览器实际播放成功，未检出持续 0.1 秒以上黑屏，检查四段关键画面 |
| 时间一致性 | 跳到 6 秒、离开再返回 6 秒，场景截图一致 |
| 浏览器 | Chrome 153.0.8010.53；390px 与桌面视口检查 |

[可携带验证记录](../web/cases/research-desk/validation.json)还包含文件 SHA-256，便于确认下载的是同一版成果。哈希仅用于文件身份核对，不表示内容正确性认证。

## 7. 实际遇到的兼容问题

1. 上游脚本用字符串拼接 file:// 路径。在 Windows 下改用 pathToFileURL，并对 PPT 图片路径使用 fileURLToPath 解码。
2. 上游默认启动 Playwright 自带 Chromium；本机使用已安装 Chrome，显式传入 executablePath。没有修改全局浏览器配置。
3. Stage 即使隐藏控件仍扣除 56px 高度，录制会出现不必要留白。编译副本仅在 __recording 模式停止扣除；正常浏览仍保留控件区域。
4. 上游 PPT 导出允许部分页面失败后仍交付。这里改为任一页失败即退出，避免把缺页文件交给用户。
5. 导出包装声明了 slideMaster2 到 slideMaster6，但文件内只有实际使用的母版。独立结构检查发现后，移除 5 个无目标的 Content Types 声明。先确认没有关系引用它们，修复未改变任何幻灯片或备注 XML。尚未隔离出该现象来自上游调用方式还是本机 pptxgenjs 版本，因此不归咎于其中某一方。
6. 中文字体采用本机 Microsoft YaHei。PDF 实际渲染通过；PPT 在其他软件/机器上仍可能因字体度量而改变换行。

[前端和导出适配清单](../web/cases/research-desk/vendor/adaptations.json)逐条列出源字符串、替换字符串与理由；文件包装修复记录随验证 JSON 一并提供。

## 8. 本地复现

浏览已经交付的结果无需安装依赖。重新生成需要 Python Playwright、pypdf、Node.js、React 18.3.1、Babel 7.28.4、Node Playwright 1.62.1、pptxgenjs 4.0.1、pdf-lib 1.17.1、Chrome 与 FFmpeg。本次使用 FFmpeg 6.1.3；PowerPoint 文件独立渲染使用本机提供的演示文稿工具，属于验证工具而非上游依赖。

在研究仓库根目录，先准备依赖。tooling/package-lock.json 固定 JSX 运行和编译依赖；导出依赖由 HUASHU_NODE_MODULES 指向已安装的模块目录，浏览器由 HUASHU_CHROME 指定。默认路径记录的是本机环境，换机器时必须调整。

~~~powershell
npm ci --prefix projects/002-huashu-design/tooling --ignore-scripts
node projects/002-huashu-design/scripts/prepare-case.cjs
python projects/002-huashu-design/scripts/capture-case.py
python projects/002-huashu-design/scripts/build-case.py
node projects/002-huashu-design/scripts/compile-case.cjs
node projects/002-huashu-design/build/case/export_deck_pdf.mjs --slides projects/002-huashu-design/web/cases/research-desk/slides --out projects/002-huashu-design/web/cases/research-desk/downloads/research-desk.pdf --width 1280 --height 720
node projects/002-huashu-design/build/case/export_deck_pptx.mjs --slides projects/002-huashu-design/web/cases/research-desk/slides --out projects/002-huashu-design/web/cases/research-desk/downloads/research-desk.pptx
python projects/002-huashu-design/scripts/normalize-case-pptx.py
node projects/002-huashu-design/build/case/render-video-seek.js projects/002-huashu-design/web/cases/research-desk/animation.html --duration=20 --fps=30 --width=1280 --height=720 --concurrency=4 --settle=2
~~~

视频脚本会输出 animation.mp4；确认成功后复制到 downloads/research-desk.mp4。scripts/render-case-pptx.mjs 和 finalize-case-pptx.mjs 记录本机独立 PPT 检查方式，依赖本机技能工具路径。它们不会把原生 PPT 转成图片式 PPT。完成后运行 scripts/check-real-case.py，重新生成真实场景检查记录。生成器会覆盖本案例对应同名文件，先保存自己的修改。

## 9. 对你的意义与下一步选择

如果目标是让团队看懂一个开源项目，现有研究材料可以变成原型、说明稿与视频，这些都是可实际交付的成果。你无需为每种媒介重新整理一次事实，但仍需要为不同媒介调整结构。

如果目标是长期使用的研究平台，本次原型已经可以讨论流程；下一步是补数据模型和后端，而不是继续把原型的视觉完成度当成工程完成度。

如果目标是稳定批量生产，先把你认可的品牌样式、章节、素材来源和验收标准保存为模板，再用第二个真实任务检查复用效果。本轮没有对时间节省、批量稳定性或成本收益做对照实验。

未验证：企业 PPT 母版继承、云配音、字幕对齐、音效混音、AI 看片、HyperFrames、3D/shader、GIF、透明素材及跨宿主模型对比。需求涉及这些目标时应另做对应任务实测。
