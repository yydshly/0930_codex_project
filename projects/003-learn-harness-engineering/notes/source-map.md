# 源码导航与全量覆盖

研究固定版本：77e7a3e21469dcbece2558086c8d91657abeaa40。原始树未截断，共 **2478 个文件**，合计 13433691 字节。全部文件的 Git blob SHA 已实测校验。

完整逐文件信息：[upstream-inventory.json](upstream-inventory.json)；可搜索网页：[文件索引](../web/sources.html)。

## 顶层目录

| 目录 | 文件数 | 内容 / 阅读口径 |
| --- | --- | --- |
| .github | 2 | 2 个构建发布工作流，配置核对 |
| .gitignore | 1 | 根配置、入口或许可，已登记并核对用途 |
| CLAUDE.md | 1 | 根配置、入口或许可，已登记并核对用途 |
| LICENSE | 1 | 根配置、入口或许可，已登记并核对用途 |
| README.md | 1 | 根配置、入口或许可，已登记并核对用途 |
| docs | 1913 | 15 种语言课程、代码例子、资源与站点配置；以英文结构和核心中英文正文核对，未逐句审校翻译 |
| docs-readme | 15 | 各语言 README 与说明 |
| get_anthropic_logo.js | 1 | 根配置、入口或许可，已登记并核对用途 |
| package-lock.json | 1 | 根配置、入口或许可，已登记并核对用途 |
| package.json | 1 | 根配置、入口或许可，已登记并核对用途 |
| projects | 495 | P01–P06 starter/solution 与 shared 应用；核对各项目任务契约和核心服务/辅助工具 |
| scripts | 6 | 6 个课程发布/维护脚本，源码结构核对 |
| skills | 39 | 1 个 Skill、4 个 CLI + 1 个共享库、6 个模板/schema、7 份参考与 eval；重点阅读并实测 CLI |
| tools | 1 | 独立 Bash 审计，源码核对并运行 |

## 语言覆盖

ar, de, en, es, fr, ja, ko, pt-BR, ru, tr, uk, uz, vi, zh, zh-TW

英文章节与资源 128 个文件。翻译副本不计作独立功能；课程正文数量、PDF 可导出语言数量与 Skill 元数据中的语言声明不是同一指标。

## 可执行和维护入口

| 固定来源 | 用途 / 层级 |
| --- | --- |
| [skills/harness-creator/scripts/create-harness.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/create-harness.mjs) | 生成器 CLI，实测 |
| [skills/harness-creator/scripts/validate-harness.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/validate-harness.mjs) | 结构评分 CLI，实测 |
| [skills/harness-creator/scripts/render-assessment-html.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/render-assessment-html.mjs) | HTML 报告 CLI，实测 |
| [skills/harness-creator/scripts/run-benchmark.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/run-benchmark.mjs) | 结构 benchmark CLI，实测 |
| [skills/harness-creator/scripts/lib/harness-utils.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/lib/harness-utils.mjs) | 共享实现：解析、探测、模板、评分、HTML |
| [tools/audit-harness.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/tools/audit-harness.sh) | 独立 Bash 仓库审计，实测 |
| [scripts/build-course-pdfs.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/build-course-pdfs.ts) | 课程 PDF 导出与合并，未运行 |
| [scripts/capture-readme-screenshots.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/capture-readme-screenshots.ts) | 课程预览截图，未运行 |
| [scripts/export-site-utils.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/export-site-utils.ts) | 静态预览服务、页面发现、语言/路径共享逻辑 |
| [scripts/validate-project-docs.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/validate-project-docs.ts) | 课程项目路径与预期文件检查，未运行 |
| [scripts/uz-orthography-cleanup.py](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/uz-orthography-cleanup.py) | 乌兹别克语文本修正，会改文件，未运行 |
| [scripts/uz-orthography-fix.py](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/uz-orthography-fix.py) | 乌兹别克语文本修正，会改文件，未运行 |
| [get_anthropic_logo.js](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/get_anthropic_logo.js) | 抓取外部 SVG 文本，非 Harness 能力，未运行 |
| [projects/project-06/solution/scripts/check-architecture.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/check-architecture.sh) | 教学应用架构检查，正反样例实测 |
| [projects/project-06/solution/scripts/cleanup-scanner.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/cleanup-scanner.sh) | 教学数据一致性扫描，坏样例实测 |
| [projects/project-06/solution/scripts/benchmark.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/benchmark.sh) | 模拟性能脚本，仅源码核对 |
| [projects/project-06/solution/scripts/dev.js](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/dev.js) | 构建主进程与 renderer 后启动 Electron，未运行 GUI |
| [projects/project-06/solution/init.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/init.sh) | 依赖/类型/构建与产物检查，未执行依赖安装 |
| [.github/workflows/deploy-pages.yml](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/.github/workflows/deploy-pages.yml) | 课程网站发布 |
| [.github/workflows/release-course-pdfs.yml](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/.github/workflows/release-course-pdfs.yml) | 课程 PDF 构建及 Release 资产发布 |

P01–P06 的开发脚本与服务代码存在大量阶段副本，全量文件索引全部保留；以各阶段任务契约解释差异，不把重复文件重复计为能力。课程代码文件逐项见 [课程地图](course-map.md)。

## Skill 的其他文件

| 类别 | 文件与含义 |
| --- | --- |
| 入口 | SKILL.md 是主工作流；SKILL.md.en / SKILL.md.uk 是变体，内容不保证同步 |
| 元数据 | metadata.json 记录版本、触发和兼容声明；agents/openai.yaml 是宿主展示配置 |
| 模板 | agents.md、feature-list.json、feature-list.schema.json、init.sh、progress.md、session-handoff.md |
| 评估 | evals/evals.json 含 10 条描述型案例；主 benchmark 只查结构覆盖 |
| 参考 | 7 份 reference 见课程地图；不会自动成为已安装运行服务 |

## 可复查的证据链

能力项 → 固定提交源码路径 → 本研究源码观察或实验 → 机器可读验证记录。

- 逐文件路径、大小、blob SHA：[upstream-inventory.json](upstream-inventory.json)。
- 38 项机器可读能力：[capabilities.json](capabilities.json)。
- 目录与课程统计：[source-structure.json](source-structure.json)。
- 实验结果与退出码：[verification-results.json](verification-results.json)。
- 已发现差异与缺口：[limitations.md](limitations.md)。

正文阅读、目录核对和运行实验分开标注；哈希校验能证明版本一致，不能证明每个文件都完成了语义审计。
