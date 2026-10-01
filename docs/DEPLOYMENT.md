# Web 演示部署

本站采用 GitHub Pages，统一托管各子项目的静态演示。

## 已验证入口

- [研究集首页](https://yydshly.github.io/0930_codex_project/)
- [witr 研究与交互演示](https://yydshly.github.io/0930_codex_project/projects/001-witr/)

2026-09-29：witr 首页、子页面、全景引导图、脚本和样式均已验证 HTTP 200；GitHub Actions 的检查与部署成功。网页为模拟教学，不扫描访客电脑。

## Agent 工作流程课程研究

2026-10-01：[Learn Harness Engineering 阅读网页](https://yydshly.github.io/0930_codex_project/projects/003-learn-harness-engineering/)已发布，[能力引导图](https://yydshly.github.io/0930_codex_project/projects/003-learn-harness-engineering/#map)可在线查看和下载。内容定位为学习 AI Agent 工作流程的课程与实践资料，附 Skill、模板及辅助工具；网页说明何时使用、采用价值、能力边界和扩展方向。

本地阅读页面 52 项检查通过；公开网页、脚本、样式、索引、记录、PNG/SVG 共 8 个资源返回 HTTP 200 并与发布文件一致，研究集首页摘要与封面也已核对。详见 [线上验证记录](../projects/003-learn-harness-engineering/notes/deployment-checks.json)。

## 自动发布

工作流为 `.github/workflows/pages.yml`，推送 `main` 或手动运行时：

1. 检查项目清单与首页一致性。
2. 运行 Python 测试与 witr JavaScript 语法检查。
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
