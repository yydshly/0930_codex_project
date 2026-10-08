# 研究总览与演示

仓库根目录执行 `python scripts/build_site.py`，然后 `python -m http.server 8949 --bind 127.0.0.1 --directory _site`。

公开入口：<https://yydshly.github.io/0930_codex_project/projects/009-sprite-destruction-lab/>。本机预览为同一路径的 `http://127.0.0.1:8949`。首页整理能力归属、完整总览图、原作、已做扩展、原理、产品方向、路线与证据。研究结论见子项目 `notes/research-summary.md`。

| 页面 | 内容 |
| --- | --- |
| `lab.html` | 原六种效果、三个实际场景、参数和事件；独立实现，使用本地 Matter.js 与 html2canvas |
| `avatar/` | 跳出、踢碎卡片、捣乱、召回；预设角色动作，真实网页纹理与碎片物理 |
| `avatar-anywhere/#proof` | 第三方 GitHub 实录、本页点选试用、Chrome / Edge 扩展安装包及权限验证说明 |
| `products/` | 六类可编辑、可导出的产品原型；内容动效复用引擎，后五类采用独立交互 |
| `toolbox/#tables` | 翻译、来源摘录、HTML 表格 CSV / JSON、文本与单位工具；独立网页工具及扩展 |
| `research/overview.svg` / `.png` | 可下载的完整研究图；PNG 为 3600 × 3800 像素 |

原作入口单独打开外部游戏，没有打包原作程序。原作公开网页破坏 SDK 未确认。本地依赖的完整许可见 `licenses.html`。

刷新依赖与真实项目清单：在子项目 `tooling/` 执行 `npm ci --ignore-scripts` 和 `npm run prepare`。

更新汇总数据后，依次在仓库根目录运行：

```powershell
python projects/009-sprite-destruction-lab/tooling/build-summary.py
python scripts/build_site.py
node projects/009-sprite-destruction-lab/tooling/summary-qa.mjs --render-only
python scripts/build_site.py
node projects/009-sprite-destruction-lab/tooling/summary-qa.mjs
```

汇总来源为 `tooling/research-summary.json`；SVG 和网页数据由脚本生成。图片验证与网页检查保存在 `notes/summary-image-checks.json`、`notes/summary-checks.json`。

跨站扩展修改后运行 `python projects/009-sprite-destruction-lab/tooling/package-avatar.py` 再构建。生产包只用 activeTab+scripting；录像使用临时增加截图权限的测试副本，未验证人工点击的授权手势。头像仅作为头部，未从照片生成完整人物。

工具箱扩展修改后运行 `python projects/009-sprite-destruction-lab/tooling/package-toolbox.py` 再构建。在线翻译使用 MyMemory，会发送所选文字，已实际遇到 HTTP 429；其余工具在本地处理。详细边界见相应 notes 文档。
