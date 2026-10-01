# Huashu Design 详细研究报告

2026-09-30 实测补充：[研选真实场景](real-case.md)已经产出交互原型、六页 HTML/PDF/PPTX 与 20 秒 MP4，包含成功范围和遇到的兼容问题。

研究日期：2026-09-29。固定版本：[0830494](https://github.com/alchaincyf/huashu-design/commit/0830494ecb1c117e25b313a8114fe55a6bf2b125)。下文区分代码/文档事实、作者主张和研究判断；完整端到端生成质量未实测。

## 1. 它究竟是什么

项目将设计规则、专项配方、基础组件、素材与导出工具组合成 Agent 技能。SKILL.md 负责路由和决策顺序，references 提供任务细节，assets 提供起手部件，scripts 执行转换与检查，demos 用来展示能力。根依赖包含 Playwright、pptxgenjs、pdf-lib、sharp 等。

没有新模型训练过程，也没有完整设计平台的服务端。模型负责理解内容、提出方案和写代码，浏览器与脚本负责执行。它的价值来自工作流约束和可复用工具共同作用。[主文档](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SKILL.md)、[依赖声明](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/package.json)

## 2. “初步目标”与最终交付

| 目标 | 主要覆盖 | 仍需另外处理 |
| --- | --- | --- |
| 软件产品 | 视觉稿、点击流程、状态模拟与演示 | 数据库、权限、交易、后台、上线和可靠性 |
| 演讲汇报 | 内容排版、HTML deck、PDF/PPTX | 事实准确、目标软件显示、现场可读性 |
| 信息图 | 数据表达、层级、布局与静态输出 | 数据来源、统计方法、解释是否成立 |
| 宣传视频 | 分镜、HTML 动画、媒体渲染与音频 | 素材授权、品牌审核、叙事及最终试听 |
| 团队生产平台 | 可借用规范、组件、脚本 | 身份、协作、存储、隔离、队列与费用管理 |

对软件而言，它主要帮助把想法转成可以讨论的原型；对设计物料而言，幻灯片、信息图和视频本身就可能是成品。不要把可点击界面当成完整软件，也不要把所有视觉产物都称为“只能做初稿”。

## 3. 能力的三个层次

**输出能力**包括原型、幻灯片、信息图与动画，以及 PDF、PPTX、MP4/GIF 等格式。**设计方法**包括品牌资产协议、多方向探索、早期展示、风格参考和专家评审。**执行工具**包括设备框、演讲壳、时间轴、截图、格式转换、媒体检查和混音。

区别这三层很重要：存在设计指令，不等于每次模型都遵守；存在转换脚本，不等于所有输入都兼容；存在作者案例，不等于相同效果能够稳定复现。完整输入、机制、边界和验收详见 [能力矩阵](capability-matrix.md)。

## 4. 底层数据流

~~~text
需求 + 真实内容 + 品牌资产
           ↓
Agent + 主技能 + 当前任务参考
           ↓
规范 / 设计方向 / 页面结构或分镜
           ↓
HTML + CSS + JavaScript + 素材
           ↓
浏览器：执行、布局、绘制、交互
     ┌─────┼─────────┐
     ↓     ↓         ↓
 浏览/打印 DOM 测量  时间轴采样
     ↓     ↓         ↓
HTML/PNG/PDF PPT 对象  图像帧/录屏
                     ↓
                 编码与混音
                     ↓
                   视频/GIF
~~~

### 4.1 文档驱动的任务路由

不同任务会加载不同资料。例如品牌任务取得真实 logo 与产品素材；幻灯片先选择页面组织与输出；动画读分镜、镜头和后端约定；长解说读音频时间轴路线。按需加载降低无关上下文，但每个宿主仍需具备相应读写、执行和浏览器能力。

### 4.2 品牌资产固化

将 logo、产品图、UI、字体、配色和禁区整理为 brand-spec.md，让多个页面共用同一份上下文。它减少凭记忆猜品牌的情况，但自动取得素材不等于完成真实性与授权核验；高频色值也不一定是品牌主色。[资产协议](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/brand-asset-protocol.md)

### 4.3 HTML 作为通用中间产物

浏览器已有成熟的字体、排版、图形、事件和可编程测量能力。模型能够生成代码，开发工具能够版本化保存，因此 HTML 很适合连接内容表达、交互与媒体输出。代价是格式转换存在语义差异：网页流式布局不等于 PPT 的固定坐标，视频不能保留原型行为。

### 4.4 动画：时间映射为视觉属性

animations.jsx 的 Stage 管全局时间，Sprite 管片段局部进度，interpolate 与 Easing 计算位置、大小和透明度。普通播放采用 requestAnimationFrame；seek 模式由外部 __seek(t) 指定时间。第 n 帧对应 t=n/fps，只要同一时间产生同一画面，就可以确定性渲染。独立 CSS keyframes、随机数和第二套时钟需要适配。[动画组件](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/animations.jsx)、[逐帧脚本](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video-seek.js)

新项目默认 HyperFrames，使用暂停的 GSAP 时间轴逐帧定位，并提供 3D、shader、透明通道的扩展入口。弱环境、既有 Stage 项目、纯交互与长解说另有路线。复杂能力来自外部框架及适配，不能认为自研 Stage 已内置专业三维系统。[后端边界](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hyperframes-backend.md)

### 4.5 PPT：测量并重新表达对象

路线 A 的 html2pptx.js 实际启动 Chromium，读取位置、尺寸与 computedStyle，再用 pptxgenjs 写对象；要求输入结构符合约束。路线 B 的 pptx_from_rendered.py 使用渲染后的元素结果和 python-pptx，可继承已有母版，SVG/canvas 以图片进入 PPT。

因此，路线 B 文档“路线 A 只读源码”的说法与当前源码不符。两者都依赖浏览器，真正区别是结构校验、元素映射、输出库与模板支持。[A 源码](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/html2pptx.js)、[B 源码](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/pptx_from_rendered.py)

### 4.6 解说：先测音频，再排画面

narrate-pipeline.mjs 解析带 scene 和 cue 的 Markdown，分段调用 TTS，用音频真实时长形成 timeline.json，并拼接 voiceover.mp3。可用时保留字级时间戳；失败时降级，不保证卡拉 OK 字幕。画面和字幕通过 NarrationStage 使用统一时间轴。[管线源码](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/narrate-pipeline.mjs)

### 4.7 Tweaks：参数化前端状态

调节面板只改变预先暴露的属性，状态写入 localStorage。它使颜色、字号、密度便于比较，但不是任意编辑器，也不会把选择自动写回源码或同步到他人设备。[调参配方](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/tweaks-system.md)

## 5. 设计方法的作用与代价

| 机制 | 解决的问题 | 代价或边界 |
| --- | --- | --- |
| 品牌规范 | 页面理解漂移、素材凭空画 | 素材准备与核对需要时间 |
| 三方向初稿 | 在抽象风格词里盲选 | 增加模型消耗，不保证三版都好 |
| 代表页先行 | 批量页面方向错误 | 仍需全稿检查 |
| 分镜与时间轴 | 动作堆叠、节奏随意 | 内容与导演判断仍依赖模型/人 |
| 基础组件 | 重复实现与重复问题 | 组合后仍可能发生布局错误 |
| 评审规则 | 反馈只有好看/不好看 | 主观评分不是独立质量测量 |
| 技术脚本 | 白屏、缺音轨、格式错误 | 不能覆盖全部审美与业务问题 |

研究判断：最值得借鉴的不是某一种风格，而是让设计决策、失败案例和验收标准显性化。实际是否节省时间，应统计准备、生成、修改、导出和验收的总耗时。

## 6. 本轮效果证据

| 等级 | 内容 | 可以说明什么 |
| --- | --- | --- |
| 阅读核对 | 主文档、关键实现、专项资料 | 存在对应流程/实现及其具体约束 |
| 上游本地复现 | 三个固定版本预制封面 | 这些静态样例可在当前浏览器渲染 |
| 原创教学实验 | 六个交互原理实验 | 能帮助理解状态、时间和参数机制 |
| 待实测 | 完整 Agent 生成、PPT/视频导出、云能力 | 当前不能宣称其成功率、耗时或质量提升 |

191 个文件都有目录索引，但不是逐文件完整审计。三份封面使用离线字体回退，字形可能与作者原图不同；其“3.2x”等文字是上游样例内容，不是本项目统计。六个教学实验不是调用该 Skill 为本次任务生成的成果。

公开案例包括 [鹦鹉专题页](https://www.huasheng.ai/parrots/) 和 [聊聊 Skill 演讲稿](https://skill-huasheng.vercel.app/)。精选案例展示可能达到的效果，不能代替重复测试。

## 7. 验证工具与评审的局限

verify.py 主要截图、收集 console 与 pageerror；幻灯片模式按左右键翻页。退出值主要取决于 pageerror，console error/warning 本身不一定使进程失败。它不自带任意产品的关键路径断言，也不会自动判断布局美感。[verify.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify.py)

媒体检查覆盖帧率、时长、黑帧、音轨等技术项；云端 AI 看片是额外能力。test-prompts.json 只有六条描述性提示与期望，部分仍采用旧路线，不能据此认为存在完整回归测试体系。[提示样例](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/test-prompts.json)

评审指南在五项执行指标前增加概念/立意，并规定概念不足时总评封顶。评分仍由模型/评审者判断，不是客观质量函数。本站评审实验使用明确标注的简化平均，未冒充上游唯一算法。[评审指南](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/critique-guide.md)

## 8. 文档演进中的差异

1. README 把三方向描述为模糊需求 fallback；新主文档默认所有新视觉任务先做方向探索，例外与紧急任务条款存在不同表述。
2. 旧动画边界不能直接代表 HyperFrames 的外部扩展能力。
3. “五维”之外新增概念维度；仅看标题会漏掉重要规则。
4. 单文件 deck 的主路由、组件表与旧提示案例对页数口径不同。
5. 两条 PPT 路线都使用浏览器测量，并非一个只读源码。
6. 动画默认推广水印可按用户要求移除；它是输出偏好，不能与 MIT 的许可声明义务混淆。
7. “弱 runtime”对不同宿主/模型的分类是作者经验假设，不是本研究对产品能力的比较测试。

使用建议：固定版本、按实际目标选路线，遇到冲突时记录取舍，避免混用不同阶段的工作流。

## 9. 依赖、数据流与成本

部分路线依赖 Node、Python、Bash、浏览器、FFmpeg/ffprobe；根 npm 依赖不覆盖全部环境。文档中有 macOS 命令与字体假设，Windows 需逐项适配。

“本地导出”不等于整个过程离线。宿主模型、素材检索、字体/CDN、包安装都可能联网；TTS 上传解说文本，AI 看片上传压缩视频片段，两者有凭据与显式同意门。本轮没有执行这些调用。[数据流声明](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SECURITY.md)

费用应计入模型调用、多方向探索、媒体服务、机器渲染和人工返工。MIT 许可不代表 API、字体或外部素材免费，README 中制作分钟数也不构成当前环境下的承诺。

## 10. 扩展潜力与对当前项目的意义

品牌、任务模板、组件、数据适配、导出路线和验证规则均可逐层扩展。团队平台与生产系统需要额外工程，不是增加提示词即可完成。[扩展指南](extension-guide.md)

结合本仓库持续研究开源项目的用途，可以把同一份经过核查的资料表达成可交互解释、演讲稿、架构信息图和短演示。内容事实可以复用，每种媒介的布局与验收仍应分别处理。

更长远的价值是沉淀自己的规范：哪些内容必须保留、哪些例子清楚、哪些图表有效、哪些导出兼容。把认可的作品与修改经验写回模板，比每次随机换风格更有复利。

## 11. 后续实验建议

| 实验 | 固定条件 | 观察指标 |
| --- | --- | --- |
| 四屏原型 | 同素材、同模型、同流程 | 关键路径成功率、内容错误、修改次数 |
| 六页汇报 | 同文案、模板和目标软件 | 可编辑对象、字体兼容、总耗时 |
| 十五秒动画 | 同分镜、帧率和机器 | 首尾帧、节奏、音轨、渲染时间 |
| 多媒介表达 | 同一个数据来源 | 内容一致性、理解效果、维护成本 |
| 版本对照 | 相同任务与验收标准 | 回归问题、流程变化、结果差异 |

应保存输入、版本、耗时、产物和缺陷记录，不预设提升比例。完整证据目录见 [源码导航](source-map.md)，本轮真实运行记录见 [reproduction.md](reproduction.md)。

[返回研究入口](../README.md)
