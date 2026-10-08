# Web 演示部署

本站采用 GitHub Pages，统一托管各子项目的静态演示。

## 已验证入口

- [研究集首页](https://yydshly.github.io/0930_codex_project/)
- [witr 研究与交互演示](https://yydshly.github.io/0930_codex_project/projects/001-witr/)
- [Huashu Design 能力研究与真实成果](https://yydshly.github.io/0930_codex_project/projects/002-huashu-design/)
- [Huashu Design 能力、原理、场景与扩展全景图](https://yydshly.github.io/0930_codex_project/projects/002-huashu-design/capability-map.html)

2026-09-29：witr 首页、子页面、全景引导图、脚本和样式均已验证 HTTP 200；GitHub Actions 的检查与部署成功。网页为模拟教学，不扫描访客电脑。

## Agent 工作流程课程研究

2026-10-01：[Learn Harness Engineering 阅读网页](https://yydshly.github.io/0930_codex_project/projects/003-learn-harness-engineering/)已发布，[能力引导图](https://yydshly.github.io/0930_codex_project/projects/003-learn-harness-engineering/#map)可在线查看和下载。内容定位为学习 AI Agent 工作流程的课程与实践资料，附 Skill、模板及辅助工具；网页说明何时使用、采用价值、能力边界和扩展方向。

本地阅读页面 52 项检查通过；公开网页、脚本、样式、索引、记录、PNG/SVG 共 8 个资源返回 HTTP 200 并与发布文件一致，研究集首页摘要与封面也已核对。详见 [线上验证记录](../projects/003-learn-harness-engineering/notes/deployment-checks.json)。

2026-10-01：Huashu Design 公开网页、全景引导图、六类成果、12 张 PDF/PPT 逐页预览与下载通过 40 项检查。PDF/PPTX/MP4 的 SHA-256 与本地实测原件一致；检查与 Pages 发布成功。记录见 [部署检查](../projects/002-huashu-design/notes/deployment-checks.json)。

## 音乐型声音与视听体验研究

2026-10-01：[Rhythm Drop 公开研究摘要](https://yydshly.github.io/0930_codex_project/projects/004-rhythm-drop/)已发布。首页说明最初研究音乐型声音，效果来源为 Gorden Sun 的 X 演示，以注明作者的原网页截图做引导图；源码、v0.1–v0.11 研究沿革与冻结实验一并提交。产品价值尚未验证的结论保留在摘要中。

音乐剧场、声音身份、团队场景、声音种植、成长合成及 42 秒原创声景可以在线体验。Python / SQLite 的真实录音社区仍为本机服务，未在 Pages 开放真人录音、漂流与回应。

GitHub Actions 的构建、47 项检查与部署成功；45 个在线资源返回 HTTP 200。图片二进制哈希精确一致，文本内容按 Linux 发布换行核对一致；已有 001–003 入口也已检查。详见 [线上校验记录](../projects/004-rhythm-drop/notes/deployment-checks.json)。

## 毛绒实验室完整发布

2026-10-08：[毛绒实验室总览](https://yydshly.github.io/0930_codex_project/projects/005-plush-lab/)作为统一入口，沿用已有的能力与原理引导图。说明包括研究背景、能力、实际实现原理、使用场景、个人意义、方法依据与限制。

发布保留 `projects/005-plush-lab/` 原有结构：6 个工作台网页、4 个研究 / 来源网页及新增工程档案均接入总览。完整 6 块原作 SOG、manifest、研究样片、参数、日志、冻结生成脚本、源码和许可随站发布。54 个 `.blend` 约 3.6 GB 保留在原本机；公开工程入口显示文件清单及 SHA-256，不提供虚假下载。

真实 AI 后端尚未启用，公网工作室不会探测访客的 `127.0.0.1` 服务。笔记、成长和固定任务使用浏览器本地存储，提醒需页面运行；原作嵌入查看器依赖外部服务。部署到 GitHub Pages 后是新的浏览器存储来源，本机已有作品不会自动迁移，应在本机页面先导出，再在支持导入的对应工作台恢复；陪伴记录目前只有导出备份，没有恢复导入入口。

005 的打包由 `scripts/plush_publish.py` 完成：保留目录和相对链接，排除隐藏配置、依赖、原生大工程，将历史本机页面地址转为公开相对入口，并将 `.blend` 下载改为档案入口。`_site/projects/005-plush-lab/notes/publication-manifest.json` 记录实际发布范围。其他项目沿用原有打包方法。

## 视觉创作能力图谱发布范围

2026-10-08：第 006 项增加研究摘要入口，沿用既有十项目技术引导图。逐项说明源库的能力、范围、原理和场景，汇总我们的探索、意义、可复用技术以及未完成的部分。保留完整理解、MV 与网页宣传片技术页之间的导航。

公开版展示整曲图片 MV、五秒 MiniMax H3 绿幕与合成、24 秒六幕网页宣传片等选定自制结果。原作者的媒体和游戏提供来源入口，本机研究副本继续保留；原始 MP3/WAV、私密配置、凭据和未选中间文件不随站发布。本次整理与部署没有提交新的生成任务。

`scripts/atlas_publish.py` 仅发布 `projects/006-ai-visual-atlas/publication/manifest.json` 登记的文件，在复制前验证路径、大小和 SHA-256。引导图、技术说明、选定媒体和脱敏证据保持相对路径；发布结果中的 `publication-manifest.json` 可核对公开范围。001–005 的条目和发布方法保留。

发布已验证：[研究摘要入口](https://yydshly.github.io/0930_codex_project/projects/006-ai-visual-atlas/)。98 个公开文件均返回 HTTP 200，大小及 SHA-256 与清单一致；总首页、001–006 入口和发布清单共 8 个入口检查通过。Pages 构建及部署成功，记录见 [006 部署验证](../projects/006-ai-visual-atlas/notes/deployment-checks.json)。

2026-10-08 效果展示补全：新增 [完整效果展厅](https://yydshly.github.io/0930_codex_project/projects/006-ai-visual-atlas/effects.html)与署名页，理解页首屏显示十项目研究、两项深入实作、三项自制代表结果。新增九支已核对许可的 Lemo 原作视频、动态字体 GIF/接触表、角色动画 WebP、两张原作者游戏截图；其他游戏和原作提供明确入口。公开快照增至 144 项，保留完整许可证与逐片 CREDITS，无新增生成调用。

## 锦鲤庭院研究发布

2026-10-08：[Koi Scene Lab 在线体验](https://yydshly.github.io/0930_codex_project/projects/007-koi-scene-lab/)已发布，保留原作体验、按图构造和原理与价值三个入口。首页引导使用已有[技术与个人价值总览图](https://yydshly.github.io/0930_codex_project/projects/007-koi-scene-lab/assets/library-value-map-v21.png)，摘要说明当前能力及其原理、使用场景、个人价值、可扩展方向与边界。

Three.js、原作、贴图、WebXR手模型、GLB/绑定示例与许可均本地托管；打包采用007资源白名单，CI执行锁定依赖安装、278项场景检查和构建。原作源码保持固定版本，场景仍沿用v20；照片自动参数化、制造输出、实物交付和完整一致性验收未接入。

Pages构建与部署成功。35个线上入口和资源HTTP 200及SHA-256核对通过，含总首页、001–006既有入口；12项公网阅读、桌面/手机布局、下载与返回首页检查通过。原作和当前庭院另以Low/SwiftShader软件环境验证初始化/按钮和猫流程，不作为真实硬件性能或照片级质量验收。原作首次截图超时保留失败记录。详见[007发布验收](../projects/007-koi-scene-lab/notes/publication-validation-20261008.json)。

## Combination Soup Studio 完整交互与产品展示

2026-10-08：011 整理为完整静态发布：研究首页、文字理解、全景图查看页、产品目标工作台、选配与交付工作台、马桶/耳机展示页共 6 个页面。首页显著显示已有全景图、5 效果、4 技能、3 场景、产品案例、查询模板和独立交付入口。全景图使用原有 2800 × 9581 PNG，保留 2026-10-03 的研究快照。

`scripts/soup_publish.py` 打包全部运行模块、素材、字体、许可与 5 支实际场景录像，生成可核对路径、大小和 SHA-256 的 `publication-manifest.json`。在线模型只在本机地址启用，公开静态站不探测访客本机服务；示例与本地规则继续可用。PNG、JSON、简报与 ZIP 由浏览器当前状态生成。

相关研究保留完整理解，但只为已部署项目提供网页链接；未发布项目明确标为本机研究。汤碗视频依赖原站外部资源，加载失败有提示。原站公开源码与开源许可未确认；任意产品生成、完整自动质量闭环与真实商业服务仍待建设。

正式发布已验证：[完整在线入口](https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/) · [全景图](https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/understanding-map.html) · [理解汇总](https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/understanding.html)。首次发布提交 `30de87156e75d445225ad7e72e2a2af946db4595` 的 [Pages 构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37731603242)及目录检查均成功。6 个页面、94 个文件和 68 个地址通过真实 HTTPS 检查；公开文件大小、SHA-256 与线上清单一致，引导图与既有 PNG 完全一致。10 项线上浏览器检查全部通过，包括桌面/手机入口、马桶与耳机非空实时模型、实际 PNG/ZIP 下载及无本机模型请求。详情见 [文件检查](../projects/011-combination-soup-studio/notes/deployment-checks.json)、[浏览器检查](../projects/011-combination-soup-studio/notes/publication-online-browser.json)和[发布记录](../projects/011-combination-soup-studio/notes/deployment-summary.json)。

## CellMotion 完整动效研究发布

2026-10-08：[完整入口与原作展厅](https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/) · [原创动效实验室](https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/workshop.html) · [理解总览与原图](https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/summary.html)。研究集首页显著提供三个入口、全部 37 项已完成动效目录、3 支成片案例、AI 日报扩展方案、原站与研究资料；摘要按定位、能力、效果、原理、场景、价值、Remotion / HeyGen 比较、扩展和边界展开。使用原有 1600 × 1760 理解总览 PNG，内容和 SHA-256 保持一致。

通过既有静态打包流程完整发布三个网页及 15 个公共文件；原作媒体、封面与按需编辑器仍从原作者网站加载。源库能力保留 2026-10-02 的固定版本研究范围。实验室是原创 JS + Canvas 2D，实现四种演示、图片替换、时间控制、需求生成及 PNG/JSON 保存与恢复；AI、配音、视频编码、整片和自动日报尚未接入。

首次内容提交 [643537e2](https://github.com/yydshly/0930_codex_project/commit/643537e2ac736866bfa2700ae05fd78307cd6137) 的 [Pages 检查、构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37734271754)成功。全部 15 个公共文件通过 HTTP 200 和 SHA-256 核对，42 项公网浏览器检查通过；实际验证原作视频与三支成片播放、原编辑器打开、导出与配方恢复、PNG/SVG 原图下载、全部内部链接与锚点及桌面/手机布局。13 个研究与既有项目入口、99 个原站媒体和编辑器地址可访问；地址检查不等同所有编辑器功能回归。详情见 [发布记录](../projects/008-cellmotion/notes/deployment-summary.json)、[文件核对](../projects/008-cellmotion/notes/deployment-checks.json)和[浏览器记录](../projects/008-cellmotion/notes/publication-browser-online.json)。

## 自动发布流程

工作流为 `.github/workflows/pages.yml`，推送 `main` 或手动运行时：

1. 检查项目清单与首页一致性。
2. 运行 Python 清单、打包与声音社区测试，witr / Rhythm Drop 的 JavaScript 语法及声音机制测试。
3. 安装毛绒实验室的锁定依赖，运行完整测试并重建 6 个工作台模块。
4. 执行 `python scripts/build_site.py`，汇总已登记项目中的静态演示。
5. 上传 `_site/` 并部署到 GitHub Pages。

仓库 Pages 发布来源已设为 GitHub Actions。所有子项目共用一个工作流，避免互相覆盖站点。不要把本地预览地址填入 `projects.json`；公开地址验证后才填写 `demo`。

## 本地运行

直接运行 witr 演示：

```powershell
python -m http.server 8937 --bind 127.0.0.1 --directory projects/001-witr/web
```

访问 `http://127.0.0.1:8937/`。该命令只提供静态文件，不运行上游 witr。

验证打包后的总入口与子路径：

```powershell
python scripts/build_site.py
python -m http.server 8938 --bind 127.0.0.1 --directory _site
```

访问 `http://127.0.0.1:8938/` 或 `/projects/001-witr/`。

## 新增静态演示

- 在已登记子项目的 `web/` 下提供 `index.html` 和相对引用的资源。
- 在 `projects.json` 中设置摘要、状态和引导图。源库链接标签由原仓库路径自动生成。
- `build_site.py` 复制公共静态资源与指定引导图，不复制 README、隐藏配置或 node_modules。
- 构建结果位于忽略追踪的 `_site/`；源码和需要的图片应保留在子项目中。
- 若引入框架，应补充对应依赖锁定和构建步骤；当前 witr 演示无第三方运行依赖。

## 后端扩展

GitHub Pages 不运行 Python、Node.js 等后端，也不能从浏览器直接枚举访客系统进程。真实 witr Web 面板需另建本地后端，受控调用 witr 并解析 JSON；持续历史数据、存储与告警也需要额外实现。服务端密钥不能写进静态前端资源。


## Dumpling 游戏方向研究完整发布

2026-10-08：[完整游戏探索入口](https://yydshly.github.io/0930_codex_project/projects/010-dumpling-style-lab/) · [探索沉淀](https://yydshly.github.io/0930_codex_project/projects/010-dumpling-style-lab/research.html) · [原有全景引导图](https://yydshly.github.io/0930_codex_project/projects/010-dumpling-style-lab/assets/project-overview-20261006.jpg)。研究集首页与项目首页同时提供能力摘要、六类入口、实机效果预览、十五个独立方向、原有九款和历史画风。摘要按定位、能力、展示、原理、参考、价值、扩展和边界整理，说明 116 = 107 + 9、15 另列，十二项后续方向未启动。使用既有 2400 × 9344 JPEG，图像字节保持不变。

完整发布 23 个当前与历史页面、2,686 个公共运行文件（285,083,336 字节），包含模型、纹理、声音、模块、来源许可和历史版本；每份公网文件大小与 SHA-256 均通过检查，公开清单与跨平台构建一致。247 个 JavaScript 语法检查及 71 套既有回归在 [Pages 工作流](https://github.com/yydshly/0930_codex_project/actions/runs/37740060422) 中通过。21 项代表性公网浏览器检查覆盖目录入口、桌面与手机、三维驾驶、横版移动、制图撤销、原作启动画面及公开服务范围，未据此声称所有样例达到商业成品质量。

深蓝议会提供场景预览；月湾接力支持真实路线制图。房间同步、投票和异步接棒仍依赖本机后端，公开页不调用访客本机服务。原作与官方参考继续使用外部链接；浏览器原有本机存档不会自动跨域迁移。源码、网页、研究说明、验收材料和 108 份引用或回归所需原素材已提交；未引用的原始下载、模型与制作中间文件留在本机，并记录路径、大小和哈希，不影响公开网页资源完整性。

详情：[发布记录](../projects/010-dumpling-style-lab/notes/deployment-summary.json)、[全量文件核对](../projects/010-dumpling-style-lab/notes/publication-online-checks-20261008.json)、[浏览器检查](../projects/010-dumpling-style-lab/notes/publication-online-browser-20261008.json)与[原素材范围](../projects/010-dumpling-style-lab/notes/publication-source-scope-20261008.json)。
