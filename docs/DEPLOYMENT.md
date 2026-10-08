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
