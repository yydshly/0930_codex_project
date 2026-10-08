# Web 演示部署

## 山脊场景、骑马探索与完整理解发布

2026-10-09：018 与 019 已正式上线：[完整理解与全部入口](https://yydshly.github.io/0930_codex_project/projects/019-ridge-explorer/understanding.html) · [019 自由骑马探索](https://yydshly.github.io/0930_codex_project/projects/019-ridge-explorer/) · [018 保存的风景基线](https://yydshly.github.io/0930_codex_project/projects/018-ridge-atmosphere-lab/)。总首页摘要完整说明定位、能力、原理、实际展示、用途、价值、扩展和边界；场景、基线、图库、源码、下载和许可均有明显链接。引导使用我们的真实营地效果，十张选定实拍、PNG 导出和版本对照保留原有内容及历史日期。

完整网页说明从风景布局、骑手与拖动修整，到“先保存 018、再独立扩展 019”的过程。当前能力包括真实三维地形、体积雾和植被、自由骑行、连通小径、三处发现、12 秒巡游停留、地点观察、摄影、可选合成环境音和浏览器续骑。场景编辑器、完整四肢 IK、任务剧情、影片导出和云协作明确为后续方向。公网与本机属于不同存储来源，旧骑行不会自动迁移。

内容提交 [`2df8e326`](https://github.com/yydshly/0930_codex_project/commit/2df8e32629d7c7a6b0a183c48496ca36c5e569f3) 的 [Pages 构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37819977961)成功。33 个 019 公共资源、14 个 018 运行资源以及全部 18 个演示入口均 HTTP 200。公开清单大小和 SHA-256 全部一致；32 个 019 资源与 Git 源字节相同，重新构建的 index.html 标签、属性及正文一致。总目录仅有换行差异，远端原 16 项完整保留。

018 的只读恢复包含 105 个文件、30,828,413 字节，SHA-256 为 `b00777aab6da43248644f415f8f23eeca44750ad02fa4d91a82b9b66741a5c7d`；固定哈希、逐文件内容与 CRC 均通过。下载不含依赖安装目录、私有环境文件或访客骑行存档。公网桌面与窄屏布局、实际三维渲染、地图、PNG 预览及场景往返均已检查；这不代表实体手机性能或人工音质评审，也不声称本次捕获了浏览器下载事件。

详见 [发布说明](../projects/019-ridge-explorer/notes/publication.md)、[公网文件检查](../projects/019-ridge-explorer/notes/deployment-checks.json)、[本机网页检查](../projects/019-ridge-explorer/notes/publication-local-browser.json)与[公网网页检查](../projects/019-ridge-explorer/notes/publication-online-browser.json)。`scripts/ridge_publish.py` 按固定白名单发布，完整源码、历史实拍及验证资料保存在 GitHub。

## Waterfalls Lab 完整理解与交互发布

2026-10-09：第 017 项已正式上线：[互动水景工作室](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/) · [完整理解与全部入口](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/understanding.html) · [EA 二维原版对照](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/upstream/)。总首页摘要按定位、能力、原理、展示、场景、价值和边界说明；工作室、完整理解、真实效果、六类产品、原图、来源许可和 GitHub 源码均有明显入口。

沿用已有 1800 × 3400 [理解引导图](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/research-assets/understanding-map.png)，不重新生成。公开包包含完整工作室、理解页、来源许可、EA 全部 WGSL / 模块 / 场景 / 图像、实机截图、PNG / SVG、两个可导入设计示例与冻结 STUDIO 09 基础 ZIP；发布清单记录 61 项文件大小与 SHA-256。它是独立浏览器三维造景基础，Waterfalls Dream 为创意参考，EA PB-MPM 与 Breakpoint 为技术参考；公共 SDK、动态刚体、任意模型、录像、云协作与工程精度仍待按业务建设。

内容提交 [`760dd8ee`](https://github.com/yydshly/0930_codex_project/commit/760dd8ee653979cdcbc1ec767a7ff5de3bacddc7) 的 [Pages 构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37814158820)成功。全部 61 个公网文件 HTTP 200、实际字节与本地及公共清单一致；原 PNG / SVG 和冻结 ZIP 固定哈希保持不变，其他 15 个已登记演示入口均 HTTP 200。本地及公网各 37 项浏览器检查通过，含无 JS 阅读、真实图像下载、工作室暂停 / 镜头 / 沉浸 / PNG 输出，以及 Intel gen-12lp 硬件适配器上的 WebGPU 粒子诊断。桌面窄屏检查不等于实体手机、统一帧率或长期稳定性验收。

详见 [发布说明](../projects/017-waterfalls-lab/notes/publication.md)、[公网文件检查](../projects/017-waterfalls-lab/notes/deployment-checks.json)、[公网浏览器](../projects/017-waterfalls-lab/notes/publication-online-browser.json)与[部署摘要](../projects/017-waterfalls-lab/notes/deployment-summary.json)。本机和公网作品存储来源不同，已有作品请先导出 JSON 再在公网导入；静态站没有云同步。

## 黑洞效果与完整理解发布

2026-10-08：第 012 项整理为[全部展示与阅读入口](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/)与[完整研究档案](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/research.html)。总首页与项目首页都显著提供完整黑洞效果、10 章中文讲解、理解总结、原有总览图、完整旁白、场景扩展、原帖与科学依据。摘要说明效果、实际实现原理、时空与衰老认知、个人价值、扩展及边界。

`scripts/black_hole_publish.py` 完整发布 44 个运行文件：主入口、全文档案与时空实验三个网页、样式与六个脚本、三张图、30 段 MiniMax 音频与完整 MP3；生成逐文件大小与 SHA-256 的清单。旁白约 782.82 秒，网页无需合成密钥。时空实验保留讨论中的事件坐标、静止引力时钟比较、视界光路与光钟动画；区分引力钟差与高速运动示例。全文档案保留六份完整正文和八份原有验收报告，当前科学与模型说明优先，历史版本注明范围；源码、原稿、制作与测试记录另可从 GitHub 查阅。

引导使用 2026-10-02 已生成的 1800 × 2240 PNG / SVG，不重新生成。PNG SHA-256 为 `73a859b1ad6a710c4aa19706ba1828849b49169a368a57ff65cf6d4779908c54`。图内为本项目温度伪彩成像，不是天文观测照片；1:10 年龄对照是理论说明例子，未求解人体旅行。

本地既有 50 项浏览器检查、31 项数值检查与新增完整发布检查通过。检查覆盖实际音频播放、13 分钟 MP3 解码、完整效果直达、PNG 保存、原图下载、全文和锚点、1280 / 390 / 320 px 布局及既有网页入口。软件渲染与手机视口检查不等于实机性能和人工音质评审；外部无自旋模型不求解内部或完整恒星坍缩。

正式发布已核对：[完整入口](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/) · [完整效果](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/?view=effect#experiment) · [时空与光钟实验](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/time-and-light.html) · [全文档案](https://yydshly.github.io/0930_codex_project/projects/012-black-hole-lab/research.html)。内容提交 `8f0c934f4cd3df65c98634faedc020a0244cd78a` 的 [Pages 构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37774343152)成功。44 个公共文件均 HTTP 200，大小与 SHA-256 符合公开清单，文本按 Git 的 LF 换行核对源文件；图与 MP3 二进制完全一致。43 项公网检查通过，涵盖实际音频播放、完整 MP3 解码、真实黑洞像素与 PNG 保存、原图下载、全部本页锚点、静止时钟与光钟输出、桌面 / 手机布局及既有页面入口。详情见 [公网检查](../projects/012-black-hole-lab/notes/publication-online-checks.json)、[本机检查](../projects/012-black-hole-lab/notes/publication-local-checks.json)、[讨论图实测](../projects/012-black-hole-lab/notes/time-experiments-checks.json)与[正式发布记录](../projects/012-black-hole-lab/notes/deployment-summary.json)。公开清单为网页的 `publication-manifest.json`。

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


## 网页破坏交互研究完整发布

2026-10-08：[完整研究与全部演示入口](https://yydshly.github.io/0930_codex_project/projects/009-sprite-destruction-lab/#entries)已发布。研究集首页按定位、能力、产物、原理、场景、价值、扩展和边界显示摘要，沿用已有 3600 × 3800 [完整研究图](https://yydshly.github.io/0930_codex_project/projects/009-sprite-destruction-lab/research/overview.png)，图像内容与 SHA-256 均不变。

九个页面完整发布：总览、六效果 / 三场景、头像出逃、跨站实录、本页无引擎样本、六类产品原型、独立工具箱、安装说明与许可。入口前置六组实际预览，逐个提供六项产品、四项工具、两个扩展包、录像、原作、源码和完整研究文档。原作游戏、本地独立引擎、角色 / 浏览器适配与另建工具分别说明；原作公开破坏 SDK 未确认。

`scripts/sprite_publish.py`保留全部运行资源、实际 GitHub 录像和两个审阅过的扩展包，生成公开文件清单。Pages 检查、构建与部署成功；62 个公开文件 HTTP 200，大小及 SHA-256 与构建结果一致。22 项公网研究页检查、11 项实际体验检查及 15 项总入口 / 既有页面检查通过，包括录像播放、实时碎片与复原、PNG 下载、表格读取、所有工具路由和手机布局。详见[发布记录](../projects/009-sprite-destruction-lab/notes/publication-20261008.md)。

头像身体与动作预设，截图仅当前视口；旧 GitHub 视频由真实浏览器运行和脚本操作产生，测试临时放开截图权限，正式包的人工授权手势未在录像验证。翻译依赖外部服务且可能限流；本机和公开网站的浏览器存储互不迁移。App、联机、营销核销和整页采集后端仍未实现。


## InsightFace 与视觉检索完整理解发布

2026-10-08：[完整研究入口](https://yydshly.github.io/0930_codex_project/projects/013-insightface-retrieval/) · [原有全景图](https://yydshly.github.io/0930_codex_project/projects/013-insightface-retrieval/map.html) · [原理教学示意](https://yydshly.github.io/0930_codex_project/projects/013-insightface-retrieval/mechanisms.html)。总首页分项说明定位、能力、原理、展示、场景、价值、参考、扩展与边界，显著提供全文、图像、教学和全部来源入口。

完整发布五个页面：总览、全文理解、全景图、原理示意、来源与讨论 / 制作 / 发布记录。引导使用 2026-10-02 的原有 2400 × 3620 PNG / SVG，内容及 SHA-256 保持不变；不使用原站截图冒充自产效果。原理页使用人工设定向量解释余弦排序、阈值和库外目标拒识，没有运行实际人脸模型或上传照片。AVScan 为需求参考，其后台与 InsightFace 的关联未确认。

`scripts/insightface_publish.py` 发布九个正式运行文件并生成清单，全文由项目 `scripts/build_web.py` 从 README 与笔记生成；原站、六种产品 / 开源方案和全部十四组来源均有明确入口。首次内容提交 `95d0d3e458362b64d72f66b2589c6f1889ac10a4` 的 [Pages 检查、构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37768632806)成功。九个文件 HTTP 200、大小及哈希与本地构建一致，十三个总首页 / 既有项目 / 新入口可访问，63 项公网浏览器检查全部通过。

详情：[发布范围](../projects/013-insightface-retrieval/notes/publication.md)、[文件核对](../projects/013-insightface-retrieval/notes/deployment-checks.json)、[线上浏览器检查](../projects/013-insightface-retrieval/notes/publication-browser-online.json)和[发布摘要](../projects/013-insightface-retrieval/notes/deployment-summary.json)。检查的是资料完整性与页面交互，真实识别效果和商业收益仍未实测。


## 十项创意效果库完整发布

2026-10-08：第 015 项整理为完整入口与静态全文理解页，显著列出十项真实画面、原作对照、独立演示、十位作者原帖、原有总览 PNG / SVG、资料源码、配乐样片、Python / Blender 配方和额外 ARC 实验。摘要按定位、效果、原理、交付、展示、价值、扩展与边界展开。

沿用 2026-10-03 的 3600 × 6640 引导图，PNG 字节与此前生成结果一致。所有运行资源由 `scripts/creative_publish.py` 按项目 `publication-files.json` 的精确路径发布，生成 `publication-manifest.json` 中的大小与 SHA-256。研究笔记、历史截图、源代码和逐项验收一并保存到项目 Git 目录；公开站点只发布所登记的运行资源。

当前为十项独立前端原型，05 / 07 / 09 / 10 为 v16，其余六项为 v15。CSS / Canvas / Three.js 与 Web Audio 提供实际效果，无 Opus API 或模型生成服务。原作者媒体按点击联网加载；WebCodecs 音乐导出需要支持的浏览器与 HTTPS。Blender 新造型、完整物理与商业成效仍未验证。

[正式入口](https://yydshly.github.io/0930_codex_project/projects/015-ai-creative-products/)与[完整理解](https://yydshly.github.io/0930_codex_project/projects/015-ai-creative-products/research.html)已可访问。184 个运行文件、194 处站内链接和原图身份通过全量核对；十项独立演示已做浏览器挂载检查，正式站第 07 项实际场景与夜景控制可用。详见[发布说明](../projects/015-ai-creative-products/notes/publication-20261008.md)、[公网文件核对](../projects/015-ai-creative-products/notes/publication-online-checks.json)与[浏览器记录](../projects/015-ai-creative-products/notes/publication-browser-local.json)。


## Chippytea 完整理解与声画展示

2026-10-08：第016项新增[完整理解与全部演出入口](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/)，以此前生成的理解总览图为引导，保持图像 SHA-256 不变。目录摘要完整说明定位、能力、展示、原理、价值、六类产品方向和边界；总首页显著提供三个原创世界、原作对照、全文档案、引导图和相关研究入口。

[研究档案](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/research.html)保留源库研究、原创设计、日常工作分析、运行说明、音乐提示和分版本验收全文。公开站完整提供29个世界PNG、两首已生成MiniMax MP3、三支标注为离线渲染的预览及原作组件、来源和许可。原作歌曲仍由原官网远程播放；月亮与纸墨音乐待生成，没有新增生成调用。

使用 scripts/chippytea_publish.py 专项发布及 publication-manifest.json，含72个公共运行文件的大小和SHA-256；公网回执使用只读快照，不请求本机API。世界存档按浏览器来源隔离；真实业务、Mac原生引擎、人工听感及产品收益另行验证。本机60项真实浏览器检查通过，覆盖画面、声音、互动、存储、下载、桌面/手机和完整阅读路径。正式线上状态见016的部署与公网检查记录。


## 正式上线与公网验收

2026-10-08 内容提交 [665c0c68](https://github.com/yydshly/0930_codex_project/commit/665c0c687631c1087123743128b0303e9f5114c1) 的 [Pages 检查、构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37803483007)成功。2026-10-09 公网62项真实浏览器检查通过；72个公共文件大小及SHA-256匹配发布清单，原图字节不变，14个既有项目入口均HTTP200。验证包括原图下载、三视频解码、三世界实际Canvas与互动、两曲真实播放/频谱/画面时间、暂停、存档重载、桌面/手机、只读回执和全文档案。早期加载与下载等待超时保留在检查记录中，延长有界等待后通过；此前成功的资源校验仅在清单完全不变时复用。

[在线总览](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/) · [全部效果](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/#entries) · [完整档案](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/research.html) · [公网检查](../projects/016-chippytea-lab/notes/publication-online-checks.json) · [发布记录](../projects/016-chippytea-lab/notes/deployment-summary.json)。这是静态体验与软件浏览器验证，人工听感、Mac原生引擎、真实业务与收益另验。
