# 研究保存与恢复 · 2026-10-01

本机快照覆盖执行时工作区中 Git 已跟踪和未跟踪但未被忽略的研究文件，包含文档、源码、截图、测试、锁文件和静态演示；具体文件以 ZIP 中清单为准。ZIP 是本机文件快照，不包含 Git 仓库历史、依赖目录、浏览器存储或私有声音数据库。音乐研究的源码、文档与公共演示现已同步到远端 Git，ZIP 文件继续保留在本机。

## 研究归档与公开发布

2026-10-01：004 的初始音乐型声音目标、原网页效果来源、v0.1–v0.11 研究理解、用户对体验不足的反馈与待验证价值已汇总。原故事页与冻结版本逐字节保留；原网页效果截图注明 Gorden Sun 来源，用作研究引导。首次公开提交 `670efbc`，Pages 部署成功；[公开研究页](https://yydshly.github.io/0930_codex_project/projects/004-rhythm-drop/)与[在线校验记录](../projects/004-rhythm-drop/notes/deployment-checks.json)可查。

提交范围为 004 研究、必要发布工具与已有研究的索引更新；当前工作区的另一个未发布子项目没有并入。私有录音、SQLite 数据库、浏览器身份和依赖目录未提交。真人声音社区继续由本机服务保留，公开页提供静态视听演示。

## 保存的位置

- 改动前快照：`build/research-archives/research-20261001-133819-129524.zip`，243 个文件，17,783,275 字节，CRC 与逐文件 SHA-256 校验通过。
- 本轮完成后再运行一次快照脚本；最终快照仍保存在 `build/research-archives/`，文件名带上海时区时间。脚本会打印实际路径、文件数量和验证结果。
- 每个 ZIP 内的 `__research_manifest__.json` 记录文件路径、大小、SHA-256、保存时间和当时的 Git HEAD。
- `build/` 已被忽略，快照不会再打包自己，也不会进入静态网站发布。

```powershell
python scripts/snapshot_research.py
```

## 研究入口

| 子项目 | 保存内容入口 |
| --- | --- |
| 001 · witr | [研究说明](../projects/001-witr/README.md) |
| 002 · Huashu Design | [研究说明](../projects/002-huashu-design/README.md) |
| 003 · Learn Harness Engineering | [研究说明](../projects/003-learn-harness-engineering/README.md) |
| 004 · Rhythm Drop | [研究沿革与结论](../projects/004-rhythm-drop/notes/research-map.md)、[源码与观看说明](../projects/004-rhythm-drop/README.md) |

## 如何恢复

把 ZIP 解压到一个新的文件夹，先查看清单并核对内容，再按各项目 README 运行。不要直接覆盖正在修改的工作区。004 的 `web/` 已包含可运行产物；需要继续改源码时，在 `projects/004-rhythm-drop/tooling/` 执行 `npm ci`、`npm run build`、`npm test`。

创作台中的“保存为新版本”使用当前浏览器、当前地址下的 localStorage。清理浏览器数据、换端口或换浏览器后不会自动出现；作品 URL 中的 ID 也只在拥有那份本机档案的浏览器中有效。重要作品需要导出 JSON 并放入项目目录，再运行快照。四个内置示例已保存在 `projects/004-rhythm-drop/works/`。

这份索引整理了项目中已经落盘的研究和本轮关键决策；没有将聊天记录导出为逐字转录。

## 保留的 v0.5 与 v0.6 试验

v0.6 修改前再次保存 `research-20261001-141102-176171.zip`（257 文件，校验通过）。另将 v0.5 的完整可运行页面保存在 `projects/004-rhythm-drop/web/versions/v0.5/`；这些文件不会被当前构建脚本覆盖。v0.6 完成后继续新增 ZIP。两套版本的代码与创作说明都在项目中保留。

v0.7 修改前保存 `research-20261001-145644-297544.zip`（273 文件，校验通过）。完整 v0.6 页面另冻结在 `projects/004-rhythm-drop/web/versions/v0.6/`，新增欢迎片及产品化分镜保存在当前项目中。新版档案写入 v3，旧页的 v2/v1 数据继续保留。

v0.8 声音花园修改前保存 `research-20261001-152212-896233.zip`（300 文件，校验通过）；完整 v0.7 运行页面冻结在 `projects/004-rhythm-drop/web/versions/v0.7/`。花园使用独立档案 `rhythm-drop.garden.v1` 和追加的花园列表；导出的验证作品保存在 `works/garden-first.json`，随后续快照保存。浏览器中其他花园仍需自行导出，ZIP 不包含 localStorage。

v0.9 声音生态修改前保存 `research-20261001-154352-571028.zip`（323 文件，校验通过）。新增 `/garden/ecosystem/`，保留 `/garden/` 的原始代码与界面；独立档案保存成长、合成和撤回历史，旧种植档案只读取。研究与验证作品随完成后全仓快照保存，仍不包含浏览器存储。

v0.10 回声花园修改前保存 `research-20261001-161451-322682.zip`（339 文件，校验通过）。新产品入口在 8941 的 `/garden/drift/`，源码、服务端、测试、产品说明和截图随完成后快照保存。业务数据库在被忽略的 `projects/004-rhythm-drop/build/drift/`，不进入研究 ZIP，也没有把私人录音或身份凭据并入研究材料；其保存与恢复规则见 [回声花园说明](../projects/004-rhythm-drop/notes/echo-garden.md)。

v0.11 体验重做前保存 `research-20261001-171624-115497.zip`（363 文件，校验通过）。完整 v0.10 的三个运行文件冻结在 `projects/004-rhythm-drop/web/garden/drift/versions/v0.10/`，源码冻结在 `projects/004-rhythm-drop/versions/v0.10/`。本轮审视截图、原创音乐、湖岸素材及生成提示随研究保存；社区身份与私人音频仍留在原本机服务，没有并入研究 ZIP。
