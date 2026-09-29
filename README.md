# GitHub 项目研究集

持续收录值得研究的开源项目，记录它们解决的问题、核心设计、运行过程和可复用的经验。每个子项目独立整理研究笔记、界面截图与演示，首页只保留摘要和入口。

## 项目索引

按固定编号升序展示；编号一经分配即保留，暂停或归档的项目也不重新编号。

<!-- PROJECT_INDEX:START -->

暂无研究项目。添加第一个项目后，这里会自动生成有序索引。

<!-- PROJECT_INDEX:END -->

## 项目预览

项目配置封面后，这里会自动显示图片、摘要和研究入口。

<!-- PROJECT_PREVIEWS:START -->

暂无项目预览。

<!-- PROJECT_PREVIEWS:END -->

## 新增一项研究

需要 Python 3.10 或更高版本，无第三方依赖。在仓库根目录执行，替换示例中的仓库与描述：

```powershell
python scripts/projects.py add --slug example-repo --name "项目名称" --repo "https://github.com/owner/repo" --summary "一句话说明研究价值"
```

命令会分配下一个编号、创建子项目目录、登记清单并更新首页。例如第一个子项目位于 `projects/001-example-repo/`。

1. 在子项目 `README.md` 中补充研究结论、运行方法和图片说明。
2. 将截图放入子项目 `assets/`，在 `projects.json` 的 `cover` 中填入 `assets/overview.png`；未添加真实图片时保持空字符串。
3. 在 `projects.json` 中更新摘要、状态与 `demo` 演示地址。
4. 执行 `python scripts/projects.py render` 同步首页。
5. 执行 `python scripts/projects.py check` 检查清单、目录、图片和首页是否一致。

## 仓库布局

```text
projects.json                 # 子项目清单：索引与图片预览的数据来源
projects/                     # 001-xxx、002-xxx……独立研究目录
templates/project/            # 新建子项目时复制的标准模板
scripts/projects.py           # 新建项目、生成索引、检查一致性
docs/CONVENTIONS.md            # 编号、内容和图片管理约定
docs/DEPLOYMENT.md             # 多个 Web 演示的部署方案
.github/workflows/check.yml   # 提交与 PR 的自动检查
```

## 研究与演示约定

- 先记录来源与研究目标，再补充可复现步骤、结论和局限。
- 每个子项目保留上游仓库链接、研究版本及许可证信息；本仓库不批量复制上游源码。
- 主 README 中展示摘要、索引和代表性图片，详细内容进入对应子项目。
- 多个静态 Web 演示预留独立路径；需要服务端的项目单独部署，并在索引中记录实际地址。
- 具体规范见 [内容约定](docs/CONVENTIONS.md) 和 [部署说明](docs/DEPLOYMENT.md)。

## 许可与来源

各上游项目及其代码、截图、商标等素材遵循各自的许可与使用要求，并在对应研究文档中注明来源。本仓库尚未为原创内容选择统一开源许可证。
