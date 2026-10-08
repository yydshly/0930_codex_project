# 完整理解与网页发布 · 2026-10-09

定位：可编辑自然场景与流体交互基座。Waterfalls Dream 是体验灵感，EA 二维 PB-MPM 与 Breakpoint 三维实现是技术参考，本项目是独立浏览器三维水景，不是原作官方版本。

## 公开入口与内容

- 工作室：`index.html`，真实 WebGPU 水景、地形与对象、多水源、历史、作品、镜头、PNG 和沉浸观看。
- 完整理解：`understanding.html`，先看真实 V9 效果，再读能力、原理、六类产品方向、价值、模块接入与边界；公开入口和原作/技术来源集中展示。
- 原版对照：`upstream/index.html`，EA 二维原版、全部 WGSL、场景 JSON、图像与源码模块。
- 来源与许可：`source-notice.html`、EA / Breakpoint / Three.js / bundle legal 和上游许可。
- 汇总图：沿用上轮 PNG / SVG；PNG SHA256 `c2537617473a3ae17ecd21d842285c7cefbbc57a26d58945ce8d86d4965fecf1`。原图、索引图与网页图一致，没有重绘。
- 示例：`downloads/river-confluence.waterfalls.json`、`downloads/river-cavern.waterfalls.json`，保存可编辑设计，导入后重新模拟。
- 冻结基础：`downloads/waterfalls-lab-studio09-foundation.zip` 与 `.sha256`；SHA256 `f7ce08ac9db02109493167be518a92244523f5c8de1b4072efb3fd5f68cd008d`，首次归档不修改。
- 源码、README、历史研究、业务方向和验证报告从网页 GitHub 项目入口阅读。

## 发布方式与验收

沿用统一 GitHub Pages workflow；以最新远端为基础，只新增 017 及必要的首页、摘要、打包与 CI 集成，其他线上项目继承远端版本。发布器 `scripts/waterfalls_publish.py` 使用固定白名单，并生成 `publication-manifest.json`（61 项文件大小与 SHA-256）。CI 安装锁定依赖，运行项目检查、重建程序并核对完整发布。依赖、缓存、私有 JSON 和配置不公开。

项目原有 77 项 Node 检查本轮串行全部通过。仓库 67 项 Python 回归无失败，其中 7 项符号链接测试因当前 Windows 环境无法创建符号链接而跳过。61 项资源及 107 处运行依赖检查通过。浏览器与线上验收由单独的报告记录，不以 HTTP 成功代替实际执行。

### 本地浏览器与真实 GPU 复核

[publication-local-browser.json](publication-local-browser.json) 记录 2026-10-09 的 37 / 37 检查通过、0 失败。范围包括理解页全部板块与六类产品详情、展开与收起、所有片段链接与公开资源、PNG / SVG 下载的原字节、无 JavaScript 阅读、1280 / 390 / 320 px 桌面视口、EA 原版资源闭包，以及工作室暂停 / 恢复、镜头收藏、沉浸退出、GPU PNG 输出与粒子诊断。

最终运行环境为系统 Edge `154.0.4258.62`，ANGLE D3D11，Intel `gen-12lp` 实际硬件适配器（`isFallbackAdapter: false`）。工作室真实执行 WebGPU，8,192 活跃粒子中有限值 8,192 / 8,192、范围内 8,192 / 8,192、明显在固体内 0。结果来自当前运行，不沿用 2026-10-03 的历史 GPU 数据。浏览器使用独立上下文，没有读取或修改原用户浏览器的作品存储。

报告同时保留早期环境尝试：软件后端没有适配器，另一 Chromium 配置遇到 `dxil.dll` 设备初始化错误；这些尝试没有计入最终通过结果。最终通过的系统 Edge 与硬件信息以报告末尾为准。这次验证不测统一 FPS、真实手机或跨设备性能，也没有实现新的 SDK。

### 已验证的正式发布

正式入口：[互动水景工作室](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/) · [完整理解与全部入口](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/understanding.html) · [EA 二维原版对照](https://yydshly.github.io/0930_codex_project/projects/017-waterfalls-lab/upstream/)。内容提交 [`760dd8ee`](https://github.com/yydshly/0930_codex_project/commit/760dd8ee653979cdcbc1ec767a7ff5de3bacddc7) 的 [Pages 构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37814158820)已成功。

独立[公网资源检查](deployment-checks.json)确认全部 61 项文件 HTTP 200、大小与 SHA-256 与公共清单及本地发布包一致，没有重建差异放行；PNG / SVG 和冻结 ZIP 另核对首次固定校验值。总首页的七项摘要、原图和工作室 / 理解页 / EA / 来源 / 源码入口齐全，其他 15 个既有演示入口均 HTTP 200。

[公网浏览器报告](publication-online-browser.json)记录 37 / 37 检查通过、0 页面错误、0 缺失本站资源，覆盖阅读、六类详情、无 JavaScript 使用、图像实际下载、EA 全部运行资源、工作室交互、PNG 输出和粒子诊断。公网工作室在同一 Edge / Intel 硬件适配器上实际执行，粒子状态检查通过；该结果不等于统一帧率或实体手机验收。[部署摘要](deployment-summary.json)记录版本、地址、资源与验证范围。报告截图位于项目 `assets/publication-online-*.png`，可从 GitHub 阅读，不增加公开运行包的文件范围。

### 完整本地复现

在仓库根目录构建完整静态包并启动本机预览：

```powershell
python scripts/build_site.py
python scripts/waterfalls_publish.py --check --site _site/projects/017-waterfalls-lab
python -m http.server 8992 --bind 127.0.0.1 --directory _site
```

打开 <http://127.0.0.1:8992/projects/017-waterfalls-lab/understanding.html>。端口可按本机占用情况调整。源 `projects/017-waterfalls-lab/web/` 可用于调试工作室，但没有发布时生成的 `downloads/`，完整阅读与示例作品 / 基础包下载必须从 `_site` 验收。

## 复用与数据范围

后续按业务选择自然场景创作、互动展示、水流玩法、定性教学、素材生产或作品平台，再补接入层与规则；公共 SDK、任意模型、动态刚体、录像和云协作仍需建设。视觉模拟不提供工程精度保证。

本机与公网属于不同浏览器存储来源，已保存作品不会自动迁移。请从本机“我的作品”导出 JSON，再到公网导入。作品保存设计、镜头与设置，不保存某时刻的全部水粒子。当前静态站没有云同步或多人协作。

V9 的 2026-10-03 实机粒子数据、91 项检查与截图属于历史基线，保留在 [validation.md](validation.md) 及原汇总图中。2026-10-09 的完整发布包、本地浏览器与公网检查独立记录。桌面窄屏视口不等同实体手机或统一 FPS 验收。
