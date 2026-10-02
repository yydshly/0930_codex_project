# GitHub 项目研究集

持续收录值得研究的开源项目，记录它们解决的问题、核心设计、运行过程和可复用的经验。每个子项目独立整理研究笔记、界面截图与演示，首页只保留摘要和入口。

这里的研究关注七个问题：**能做什么、底层怎么做、如何运行、支持什么系统、适合哪些场景、对我们有何价值、后续怎样扩展**。索引中的“源库”使用原仓库名称，研究文档与教学网页则由本项目整理。先看引导图建立整体理解，再用网页验证自己的理解；模拟演示不等于上游程序的实机测试。

首个研究项目 **witr** 用于追溯进程、端口、文件与容器的运行来源。它组合已有系统数据、原生接口和命令，自动关联父进程链与项目上下文，主要价值是减少手工排障。对于已经具备系统采集能力的工具链，它的新增底层能力有限，更适合作为便捷诊断工具和跨平台整合样本。下方项目介绍使用本次生成的全景理解图作为引导。

## 项目索引

按固定编号升序展示；编号一经分配即保留，暂停或归档的项目也不重新编号。

<!-- PROJECT_INDEX:START -->

| 编号 | 项目 / 研究文档 | 能力、原理与使用摘要 | 状态 | 来源 / 技术 | 演示 |
| --- | --- | --- | --- | --- | --- |
| 001 | [witr · 运行来源诊断](projects/001-witr/README.md) | **能力：** 追溯进程、端口、文件与容器来源<br>**原理：** 系统数据/API/命令采集，加父进程链与来源规则<br>**运行：** CLI、TUI、JSON<br>**平台：** Linux、Windows、macOS、FreeBSD<br>**场景：** 端口冲突、残留服务、文件占用<br>**价值：** 减少手工关联，新增底层能力有限<br>**扩展：** JSON 集成、本地 Web/MCP、定制规则与独立历史采集。 | 已完成 | [pranshuparmar/witr](https://github.com/pranshuparmar/witr) | [在线演示](https://yydshly.github.io/0930_codex_project/projects/001-witr/) |
| 002 | [Huashu Design · 设计能力研究](projects/002-huashu-design/README.md) | **能力：** 设计探索、原型、幻灯片、信息图、动画、声音与检查<br>**产物：** HTML、PDF、可编辑 PPTX、MP4 等<br>**原理：** Skill 与参考指导模型，浏览器渲染，组件/脚本执行<br>**场景：** 研究、评审、汇报、培训与传播<br>**价值：** 复用制作经验<br>**扩展：** 品牌、模板、数据、导出和验收。 | 已完成 | [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) | [在线演示](https://yydshly.github.io/0930_codex_project/projects/002-huashu-design/) |
| 003 | [Learn Harness Engineering · AI 工作流程研究](projects/003-learn-harness-engineering/README.md) | **定位：** 学习 AI Agent 工作流程的课程与实践资料<br>**内容：** 14 讲课程、8 项练习说明、规则/任务/进度/验收模板，附 1 个 Skill、生成与检查脚本和教学示例<br>**用途：** 理解 Agent、组织持续开发与跨会话任务<br>**价值：** 少重复解释、少返工、凭证据验收<br>**扩展：** 领域模板、真实测试、状态恢复及自动循环/多 Agent，需自行接入执行环境。 | 已完成 | [walkinglabs/learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering) | [在线演示](https://yydshly.github.io/0930_codex_project/projects/003-learn-harness-engineering/) |
| 004 | [Rhythm Drop · 音乐型声音与视听体验研究](projects/004-rhythm-drop/README.md) | **目标：** 研究音乐型声音如何驱动视觉、故事与互动<br>**来源：** Gorden Sun 的 X 音乐动画展示<br>**实验：** 场景叙事、声音身份、花园创造与漂流、儿童游戏、原创回声小队和复杂情绪<br>**结论：** 声音主导，角色驱动系列，故事与表演共同设计<br>**制作：** 参考图、程序化模型与声音时钟驱动实时动画<br>**状态：** 研究原型，产品价值尚未验证。 | 已归档 | [Gorden Sun · 原网页音乐效果](https://x.com/Gorden_Sun/status/2105302007896797351)<br>技术：[mrdoob/three.js](https://github.com/mrdoob/three.js) | [在线演示](https://yydshly.github.io/0930_codex_project/projects/004-rhythm-drop/) |

<!-- PROJECT_INDEX:END -->

## 项目预览

每项研究先说明能力与采用价值，再展示引导图，并提供源库、详细研究和已验证的网页入口。

<!-- PROJECT_PREVIEWS:START -->

### 001 · witr · 运行来源诊断

- **能力：** 追溯进程、端口、文件与容器来源
- **原理：** 系统数据/API/命令采集，加父进程链与来源规则
- **运行：** CLI、TUI、JSON
- **平台：** Linux、Windows、macOS、FreeBSD
- **场景：** 端口冲突、残留服务、文件占用
- **价值：** 减少手工关联，新增底层能力有限
- **扩展：** JSON 集成、本地 Web/MCP、定制规则与独立历史采集。

源库：[pranshuparmar/witr](https://github.com/pranshuparmar/witr)。先阅读下方引导图，再进入研究文档与交互演示。

![witr · 运行来源诊断 项目引导图](projects/001-witr/assets/witr-understanding-map.png)

[研究详情](projects/001-witr/README.md) · [在线演示](https://yydshly.github.io/0930_codex_project/projects/001-witr/)

### 002 · Huashu Design · 设计能力研究

- **能力：** 设计探索、原型、幻灯片、信息图、动画、声音与检查
- **产物：** HTML、PDF、可编辑 PPTX、MP4 等
- **原理：** Skill 与参考指导模型，浏览器渲染，组件/脚本执行
- **场景：** 研究、评审、汇报、培训与传播
- **价值：** 复用制作经验
- **扩展：** 品牌、模板、数据、导出和验收。

源库：[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design)。先阅读下方引导图，再进入研究文档与交互演示。

![Huashu Design · 设计能力研究 项目引导图](projects/002-huashu-design/assets/huashu-capability-map.png)

[研究详情](projects/002-huashu-design/README.md) · [在线演示](https://yydshly.github.io/0930_codex_project/projects/002-huashu-design/)

### 003 · Learn Harness Engineering · AI 工作流程研究

- **定位：** 学习 AI Agent 工作流程的课程与实践资料
- **内容：** 14 讲课程、8 项练习说明、规则/任务/进度/验收模板，附 1 个 Skill、生成与检查脚本和教学示例
- **用途：** 理解 Agent、组织持续开发与跨会话任务
- **价值：** 少重复解释、少返工、凭证据验收
- **扩展：** 领域模板、真实测试、状态恢复及自动循环/多 Agent，需自行接入执行环境。

源库：[walkinglabs/learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering)。先阅读下方引导图，再进入研究文档与交互演示。

![Learn Harness Engineering · AI 工作流程研究 项目引导图](projects/003-learn-harness-engineering/assets/harness-capability-map.png)

[研究详情](projects/003-learn-harness-engineering/README.md) · [在线演示](https://yydshly.github.io/0930_codex_project/projects/003-learn-harness-engineering/)

### 004 · Rhythm Drop · 音乐型声音与视听体验研究

- **目标：** 研究音乐型声音如何驱动视觉、故事与互动
- **来源：** Gorden Sun 的 X 音乐动画展示
- **实验：** 场景叙事、声音身份、花园创造与漂流、儿童游戏、原创回声小队和复杂情绪
- **结论：** 声音主导，角色驱动系列，故事与表演共同设计
- **制作：** 参考图、程序化模型与声音时钟驱动实时动画
- **状态：** 研究原型，产品价值尚未验证。

效果来源：[Gorden Sun · 原网页音乐效果](https://x.com/Gorden_Sun/status/2105302007896797351)。技术基础：[mrdoob/three.js](https://github.com/mrdoob/three.js)。先阅读下方引导图，再进入研究文档与交互演示。

![Rhythm Drop · 音乐型声音与视听体验研究 项目引导图](projects/004-rhythm-drop/assets/source-effect.jpg)

[研究详情](projects/004-rhythm-drop/README.md) · [在线演示](https://yydshly.github.io/0930_codex_project/projects/004-rhythm-drop/)

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
