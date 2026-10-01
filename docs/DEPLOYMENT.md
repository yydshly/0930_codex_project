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

## 自动发布流程

工作流为 `.github/workflows/pages.yml`，推送 `main` 或手动运行时：

1. 检查项目清单与首页一致性。
2. 运行 Python 清单、打包与声音社区测试，witr / Rhythm Drop 的 JavaScript 语法及声音机制测试。
3. 执行 `python scripts/build_site.py`，汇总已登记项目中的静态演示。
4. 上传 `_site/` 并部署到 GitHub Pages。

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
