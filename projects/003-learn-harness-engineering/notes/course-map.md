# 课程、练习与资源地图

所有链接固定到研究版本。15 种语言主要是同一课程的翻译，不把翻译副本计算成新能力。

## 14 讲课程

| 编号 | 主题 | 学到什么 | 固定版本原文 |
| --- | --- | --- | --- |
| L01 | 强模型为什么仍会失败 | 区分能力与执行可靠性；观察漏步骤、范围漂移、错误完成 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-01-why-capable-agents-still-fail/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-01-why-capable-agents-still-fail/index.md) |
| L02 | Harness 到底是什么 | 识别工作环境、状态与反馈；理解模型之外的执行条件 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-02-what-a-harness-actually-is/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-02-what-a-harness-actually-is/index.md) |
| L03 | 仓库作为事实记录 | 把需求、决策和约束写进可读文件；减少会话外隐含知识 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/index.md) |
| L04 | 指令拆分与按需读取 | 短入口指向专题文档，避免把所有内容塞进一个文件 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-04-why-one-giant-instruction-file-fails/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-04-why-one-giant-instruction-file-fails/index.md) |
| L05 | 跨会话连续性 | 保存进度、未完成项和下一步，下一轮主动恢复 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-05-why-long-running-tasks-lose-continuity/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/index.md) |
| L06 | 独立初始化阶段 | 修改前确认环境和基线健康，明确启动与验证入口 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-06-why-initialization-needs-its-own-phase/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-06-why-initialization-needs-its-own-phase/index.md) |
| L07 | 控制任务范围 | 一个明确任务、完成定义、影响范围与后续任务 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-07-why-agents-overreach-and-under-finish/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-07-why-agents-overreach-and-under-finish/index.md) |
| L08 | 功能清单与完成证据 | 把验收要求结构化，避免只凭叙述修改完成状态 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-08-why-feature-lists-are-harness-primitives/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/index.md) |
| L09 | 避免过早宣布完成 | 核对可运行证据与清理状态，不以自信代替结果 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-09-why-agents-declare-victory-too-early/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-09-why-agents-declare-victory-too-early/index.md) |
| L10 | 完整链路与架构边界 | 贯穿真实用户路径验证，避免只测局部成功 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-10-why-end-to-end-testing-changes-results/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-10-why-end-to-end-testing-changes-results/index.md) |
| L11 | 可观测性与评审反馈 | 结构化日志、可重放场景、评审标准和任务契约 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-11-why-observability-belongs-inside-the-harness/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-11-why-observability-belongs-inside-the-harness/index.md) |
| L12 | 干净状态与持续维护 | 结束检查、可恢复交接、清理和对照评估 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-12-why-every-session-must-leave-a-clean-state/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/index.md) |
| L13 | 目标循环、定时循环和独立检查 | 把驱动步骤显式化，加入状态、停止条件和预算 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-13-loop-engineering/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-13-loop-engineering/index.md) |
| L14 | 从循环到图编排 | 节点、边、共享状态、条件路由、并行与恢复设计 | [中文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/zh/lectures/lecture-14-graph-engineering/index.md) · [英文](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-14-graph-engineering/index.md) |

## 8 项练习说明，6 个实际工程目录

| 编号 | 练习 | 任务 | 交付形态 | 原文 |
| --- | --- | --- | --- | --- |
| P01 | 提示驱动与最小规则对照 | 对同一任务比较纯提示和规则环境 | starter / solution 完整目录 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-01-baseline-vs-minimal-harness/index.md) |
| P02 | Agent 可读工作区 | 整理入口、架构/产品文档与状态文件 | starter / solution 完整目录 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-02-agent-readable-workspace/index.md) |
| P03 | 多会话接续 | 通过进度和交接恢复未完成任务 | starter / solution 完整目录 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-03-multi-session-continuity/index.md) |
| P04 | 增量索引与范围反馈 | 实现增量索引并检查架构边界 | starter / solution 完整目录 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-04-incremental-indexing/index.md) |
| P05 | 评审角色对照 | 同一 ConversationHistory 功能的单角色、生成+评审、规划+生成+评审对照 | starter + 三个独立 solution 变体 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-05-grounded-qa-verification/index.md) |
| P06 | 完整 Harness 综合练习 | 已有产品上对比弱/完整规则，观察日志和维护能力 | starter / solution 完整目录 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-06-runtime-observability-and-debugging/index.md) |
| P07 | 自动循环练习 | 目标循环、定时检查、实现者与检查者分离 | 只有课程说明；projects/project-07 不存在 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-07-loop-engineering-first-loop/index.md) |
| P08 | 工作流程图练习 | 显式图、并行汇合、回退与人工节点 | 只有课程说明与 L14 骨架；projects/project-08 不存在 | [说明](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/project-08-graph-engineering-first-graph/index.md) |

P05 三个解法是同一功能的角色配置对照，不是先后升级版本。文档中的质量分是上游预填材料，本轮没有复跑模型来证实这些分数。P06 starter 已含多数业务功能，主要弱化了周边规则与交接。

## 16 个课程代码文件

以下包含 TypeScript、Bash 和 Python。它们的存在不表示都已运行；大部分用于演示原理。

| 文件 | 性质 / 使用边界 |
| --- | --- |
| [failure-pattern-demo.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-01-why-capable-agents-still-fail/code/failure-pattern-demo.ts) | 预设失败轨迹的教学模拟，不调用真实模型 |
| [harness-vs-no-harness.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-02-what-a-harness-actually-is/code/harness-vs-no-harness.ts) | 预设任务和两种执行方式的对照模拟 |
| [minimal-harness-loop.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-02-what-a-harness-actually-is/code/minimal-harness-loop.ts) | 固定 read_file 行为与伪造工具输出；最小形状示例 |
| [repo-reader.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/code/repo-reader.ts) | 读取目录并按规则评价可读性；未在本轮运行 |
| [split-vs-monolithic.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-04-why-one-giant-instruction-file-fails/code/split-vs-monolithic.ts) | 检索成本的模拟比较，不是模型实测 |
| [session-simulator.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/code/session-simulator.ts) | 两次会话有/无交接的模拟 |
| [init-check.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-06-why-initialization-needs-its-own-phase/code/init-check.ts) | 目录检查与初始化对比模拟；未在本轮运行 |
| [init.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-06-why-initialization-needs-its-own-phase/code/init.sh) | 初始化命令示例，需针对项目配置 |
| [scope-tracker.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-07-why-agents-overreach-and-under-finish/code/scope-tracker.ts) | 范围记录与分类的教学程序 |
| [feature-list-validator.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/feature-list-validator.ts) | 课程特定 schema/证据规则示例，不是 Skill 主评分器 |
| [victory-detector.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-09-why-agents-declare-victory-too-early/code/victory-detector.ts) | 任务/证据的教学判定，不是通用结果判定器 |
| [e2e-runner.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-10-why-end-to-end-testing-changes-results/code/e2e-runner.ts) | 预设链路结果的模拟，不是完整应用 E2E 测试 |
| [runtime-logger.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-11-why-observability-belongs-inside-the-harness/code/runtime-logger.ts) | 结构化日志与故障定位的示例管线 |
| [benchmark-runner.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/code/benchmark-runner.ts) | 预设任务结果的教学 benchmark |
| [cleanup-scanner.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/code/cleanup-scanner.ts) | 文件模式扫描；部分检查是启发式/占位，不等同静态分析器 |
| [maker_checker_graph.py](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-14-graph-engineering/code/maker_checker_graph.py) | LangGraph 骨架；模型、测试和合并有占位，详见限制说明 |

## 基础资源模板

| 文件 | 用途 |
| --- | --- |
| [AGENTS.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/AGENTS.md) | 宿主可读的启动/工作规则 |
| [CLAUDE.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/CLAUDE.md) | 另一入口形式 |
| [claude-progress.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/claude-progress.md) | 历史命名的会话进度文件，不自动保存 |
| [clean-state-checklist.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/clean-state-checklist.md) | 结束前的状态检查 |
| [evaluator-rubric.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/evaluator-rubric.md) | 评审量表 |
| [feature_list.json](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/feature_list.json) | 课程版功能与验收记录 |
| [init.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/init.sh) | 安装/验证/可选启动入口 |
| [quality-document.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/quality-document.md) | 质量记录 |
| [session-handoff.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/session-handoff.md) | 接续说明 |

## 7 份 Skill 参考模式

| 文档 | 作用 |
| --- | --- |
| [context-engineering-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/context-engineering-pattern.md) | 选择/写入/压缩/隔离与预算 |
| [gotchas.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/gotchas.md) | 易忽略的限制与工程陷阱 |
| [lifecycle-bootstrap-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/lifecycle-bootstrap-pattern.md) | 启动阶段、Hook、长任务状态 |
| [memory-persistence-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/memory-persistence-pattern.md) | 分层记忆、索引与主题文件、会话保存 |
| [multi-agent-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/multi-agent-pattern.md) | 协调者、分工、继承、交接 |
| [skill-runtime-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/skill-runtime-pattern.md) | 可复用 Skill 的组织规则 |
| [tool-registry-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/tool-registry-pattern.md) | 工具注册、权限、并发和审计设计 |

这些是设计材料，不会自动提供记忆数据库、权限沙箱、调度器或多 Agent 运行器。

## 进阶资源与产品拆解

- OpenAI Advanced Pack：作者根据外部文章整理的仓库目录模板，包括架构、设计、产品、可靠性、安全、计划、质量记录和参考资料。它不是官方产品功能开关。
- 4 份 SOP：分层架构、仓库知识沉淀、可观测性反馈、浏览器验证；是操作流程，不是已部署的工具服务。
- 4 篇产品拆解：Pi、Claude Code、Codex、DeepSeek；阅读时把作者分析与产品当前官方事实区分开。
- 参考库：方法映射、初始化者职责、编程 Agent 启动流程、提示校准和外部文章链接。

## 建议阅读顺序

只想马上用：先看 Skill 和最小模板，再读 L03/L05/L08/L09。需要理解原理：读 L01–L12 并选择 P01/P03/P06 对照。确实需要自动化：完成真实验收后再读 L13/L14。仅学习管理 AI 工作，不需要先运行整个 Electron 教学项目。
