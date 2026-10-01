# 静态演示

当前 `index.html` 是音乐型声音研究摘要，标注初始目标、Gorden Sun 原网页效果来源、六条理解、版本沿革与未解决的问题。引导图为注明作者的参考截图；实验卡片为本项目实际运行画面。

原故事页完整保留为 `stories.html`；旧 `?story=…` 与 `?work=…` 链接会携带参数跳转。`garden/`、`garden/ecosystem/` 和冻结版本继续保留。`garden/drift/` 在 GitHub Pages 中只提供原创声景与文字演示，真实录音、漂流与回应需按项目 README 启动本机服务。静态预览可使用 `?mode=preview` 核对公开模式。

从仓库根目录运行 `python -m http.server 8940 --bind 127.0.0.1 --directory projects/004-rhythm-drop/web`，访问 http://127.0.0.1:8940/。

`app.js` 为固定依赖版本的自包含构建，无远程字体、CDN、图片或音频依赖。修改 `../src/` 后在 `../tooling/` 执行 `npm ci` 和 `npm run build`。保留 `THREE-LICENSE.txt` 与 `app.js.LEGAL.txt`。公共站点打包采用仓库 `scripts/build_site.py`，资源均使用相对路径。

故事剧场包含四个原始故事、声音身份与团队场景、四份可改写的场合示例和作品创作台。本机保存依赖此浏览器、此地址的 localStorage；导出 JSON 可迁移，作品文件不包含导入的试听音频。下载受限时可复制 JSON 文本保存。完整研究与快照说明见上一级 README。
