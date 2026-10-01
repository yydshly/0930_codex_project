# 38 项能力矩阵

“已实测”仅表示列出的限定行为被运行验证；“教学实现/模拟/骨架”不是成品承诺。分类依据上游实际文件和本轮观察。

| ID | 能力 | 类型 | 交付程度 |
| --- | --- | --- | --- |
| C01 | [14 讲课程](#c01) | 课程 | 阅读资料 |
| C02 | [8 项练习说明与 6 套项目目录](#c02) | 课程 | 阅读资料 |
| C03 | [4 篇产品设计拆解](#c03) | 课程 | 阅读资料 |
| C04 | [基础模板与参考流程](#c04) | 模板 | 需配置 |
| C05 | [进阶仓库模板和 4 份 SOP](#c05) | 模板 | 需配置 |
| C06 | [harness-creator Skill](#c06) | Skill | 需宿主执行 |
| C07 | [一键生成最小 Harness](#c07) | 脚本 | 已实测 |
| C08 | [技术栈和包管理器探测](#c08) | 脚本 | 已实测 |
| C09 | [保留现有文件及入口选择](#c09) | 脚本 | 已实测 |
| C10 | [启动与工作规则](#c10) | 模板 | 需配置 |
| C11 | [任务清单与依赖](#c11) | 模板 | 需配置 |
| C12 | [进度与会话交接](#c12) | 模板 | 需配置 |
| C13 | [初始化与失败停止](#c13) | 脚本 | 已实测 |
| C14 | [五维结构评分](#c14) | 脚本 | 已实测 |
| C15 | [HTML 评分报告](#c15) | 脚本 | 已实测 |
| C16 | [结构 Benchmark](#c16) | 脚本 | 已实测 |
| C17 | [10 条 Skill 评估用例](#c17) | 资料 | 阅读资料 |
| C18 | [独立 Bash 仓库审计](#c18) | 脚本 | 已实测 |
| C19 | [记忆与上下文管理方法](#c19) | 参考模式 | 方法参考 |
| C20 | [可复用 Skill 组织方法](#c20) | 参考模式 | 方法参考 |
| C21 | [工具权限与安全方法](#c21) | 参考模式 | 方法参考 |
| C22 | [多 Agent 协作方法](#c22) | 参考模式 | 方法参考 |
| C23 | [生命周期与 Hook 设计](#c23) | 参考模式 | 方法参考 |
| C24 | [目标循环与定时循环](#c24) | 编排 | 方法参考 |
| C25 | [实现者与检查者分离](#c25) | 编排 | 需接入 |
| C26 | [图编排示例](#c26) | 编排 | 教学骨架 |
| C27 | [示例应用：文档导入与管理](#c27) | 示例应用 | 教学实现 |
| C28 | [示例应用：分块与增量索引](#c28) | 示例应用 | 教学实现 |
| C29 | [示例应用：带引用问答](#c29) | 示例应用 | 教学模拟 |
| C30 | [示例应用：历史、反馈和数据保存](#c30) | 示例应用 | 教学实现 |
| C31 | [示例应用：结构化日志](#c31) | 示例应用 | 教学实现 |
| C32 | [示例应用：架构边界检查](#c32) | 脚本 | 已实测 |
| C33 | [示例应用：数据清理扫描](#c33) | 脚本 | 已实测 |
| C34 | [示例应用：性能 Benchmark](#c34) | 脚本 | 教学模拟 |
| C35 | [课程网站构建与部署](#c35) | 维护工具 | 需依赖环境 |
| C36 | [课程 PDF 与截图导出](#c36) | 维护工具 | 需依赖环境 |
| C37 | [课程路径与项目产物校验](#c37) | 维护工具 | 需依赖环境 |
| C38 | [多语言与素材维护](#c38) | 维护工具 | 维护脚本 |

<a id="c01"></a>
## C01 · 14 讲课程

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 课程 / 阅读资料 |
| 输入或适用问题 | 理解可靠 AI 工作流程 |
| 输出 | 从模型能力、上下文到循环和图编排的学习路径 |
| 实现机制 | Markdown 教学，配有代码演示 |
| 边界 | 不是可安装执行的 Agent 引擎 |
| 本轮核查 | 目录核对、核心章节阅读 |
| 固定来源 | [docs/en/lectures/lecture-02-what-a-harness-actually-is/index.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-02-what-a-harness-actually-is/index.md) |

<a id="c02"></a>
## C02 · 8 项练习说明与 6 套项目目录

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 课程 / 阅读资料 |
| 输入或适用问题 | 学习并对比不同工作流程 |
| 输出 | P01–P06 starter/solution；P07/P08 任务说明 |
| 实现机制 | 同一 Electron 示例逐步演进；P05 有三种角色配置 |
| 边界 | P07/P08 的 projects 工程目录实际缺失 |
| 本轮核查 | 目录实测 |
| 固定来源 | [docs/en/projects/index.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/projects/index.md) |

<a id="c03"></a>
## C03 · 4 篇产品设计拆解

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 课程 / 阅读资料 |
| 输入或适用问题 | 借鉴外部 Agent 产品的工作环境设计 |
| 输出 | Pi、Claude Code、Codex、DeepSeek 的分析文章 |
| 实现机制 | 用课程框架解释外部实现 |
| 边界 | 属于作者的二次分析，不是四款产品的代码、插件或官方接口保证 |
| 本轮核查 | 目录与正文结构核对 |
| 固定来源 | [docs/en/harness-designs/index.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/harness-designs/index.md) |

<a id="c04"></a>
## C04 · 基础模板与参考流程

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 模板 / 需配置 |
| 输入或适用问题 | 把项目规则和交接标准写下来 |
| 输出 | 规则、功能、进度、初始化、交接、清理、评审和质量文档 |
| 实现机制 | 人工/Agent 按模板填写，再纳入项目版本管理 |
| 边界 | 课程模板和 Skill 模板字段不同，不能盲目混用 |
| 本轮核查 | 模板源码核对 |
| 固定来源 | [docs/en/resources/templates/index.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/templates/index.md) |

<a id="c05"></a>
## C05 · 进阶仓库模板和 4 份 SOP

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 模板 / 需配置 |
| 输入或适用问题 | 大型项目需要更多架构、计划和可靠性文档 |
| 输出 | repo-template 与知识沉淀、架构、可观测性、浏览器验证流程 |
| 实现机制 | 短入口链接分层文档和执行计划 |
| 边界 | 只有目录与流程模板；不会自动安装监控或浏览器工具 |
| 本轮核查 | 源码核对 |
| 固定来源 | [docs/en/resources/openai-advanced/index.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/resources/openai-advanced/index.md) |

<a id="c06"></a>
## C06 · harness-creator Skill

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | Skill / 需宿主执行 |
| 输入或适用问题 | 让 AI 帮项目建立或审计工作规则 |
| 输出 | 针对项目生成文件、解释评分、提出改进 |
| 实现机制 | SKILL.md 指导宿主模型按需读取 references、调用脚本 |
| 边界 | Skill 自身没有模型、常驻进程或调度器；安装不等于自动运行 |
| 本轮核查 | 全文阅读；本轮未安装 Skill |
| 固定来源 | [skills/harness-creator/SKILL.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/SKILL.md) |

<a id="c07"></a>
## C07 · 一键生成最小 Harness

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 目标项目目录 |
| 输出 | AGENTS.md、feature_list.json、progress.md、session-handoff.md、init.sh |
| 实现机制 | 检测项目、替换模板、写入文件 |
| 边界 | 生成的是占位任务与规则，不自动推导业务需求，不执行生成的验证命令 |
| 本轮核查 | 生成和幂等性实测 |
| 固定来源 | [skills/harness-creator/scripts/create-harness.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/create-harness.mjs) |

<a id="c08"></a>
## C08 · 技术栈和包管理器探测

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 项目清单、锁文件、显式选项 |
| 输出 | 适用的安装/测试/构建命令 |
| 实现机制 | 根据 manifest 和文件名分支判断，Node 读取已有 scripts |
| 边界 | 仅基础识别；混合项目和大型 monorepo 需配置；扫描上限 800 文件 |
| 本轮核查 | 9 种栈分支及 3 种非默认包管理器实测 |
| 固定来源 | [skills/harness-creator/scripts/lib/harness-utils.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/lib/harness-utils.mjs) |

<a id="c09"></a>
## C09 · 保留现有文件及入口选择

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 已有工作文件、--agent-file、--commands |
| 输出 | 默认跳过已有文件，可选 CLAUDE.md 和自定义命令 |
| 实现机制 | 存在性检测；--force 才覆盖 |
| 边界 | 不是智能合并；不自动迁移旧字段；--force 会替换目标文件 |
| 本轮核查 | 保留文件、入口、自定义命令实测；未对用户文件覆盖 |
| 固定来源 | [skills/harness-creator/scripts/create-harness.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/create-harness.mjs) |

<a id="c10"></a>
## C10 · 启动与工作规则

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 模板 / 需配置 |
| 输入或适用问题 | 项目约束、操作顺序和完成定义 |
| 输出 | 简短操作说明与文档导航 |
| 实现机制 | 通过宿主阅读指令影响模型决策 |
| 边界 | 文档要求不等于运行时强制；模板启动顺序未显式要求读 progress/handoff |
| 本轮核查 | 全文核对 |
| 固定来源 | [skills/harness-creator/templates/agents.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/templates/agents.md) |

<a id="c11"></a>
## C11 · 任务清单与依赖

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 模板 / 需配置 |
| 输入或适用问题 | 真实功能与验收标准 |
| 输出 | id/name/description/dependencies/status/evidence |
| 实现机制 | JSON 状态记录，加一项任务原则 |
| 边界 | 没有任务调度、依赖环检测、并发锁或证据真实性验证 |
| 本轮核查 | 生成实测与字段核对 |
| 固定来源 | [skills/harness-creator/templates/feature-list.json](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/templates/feature-list.json) |

<a id="c12"></a>
## C12 · 进度与会话交接

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 模板 / 需配置 |
| 输入或适用问题 | 做了什么、未完成什么、阻塞和下一步 |
| 输出 | progress.md 和 session-handoff.md |
| 实现机制 | 外部文件持久化，下一轮主动读取 |
| 边界 | 不会自动保存全部聊天；状态需要更新与检查 |
| 本轮核查 | 模板核对与生成实测 |
| 固定来源 | [skills/harness-creator/templates/session-handoff.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/templates/session-handoff.md) |

<a id="c13"></a>
## C13 · 初始化与失败停止

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 项目验证命令 |
| 输出 | 可运行的 init.sh 和命令输出 |
| 实现机制 | 顺序执行命令，set -e 遇到失败停止 |
| 边界 | 需 Bash 和依赖环境；无测试时不创造测试；生成版依赖当前工作目录 |
| 本轮核查 | 自定义三步命令在失败处停止实测 |
| 固定来源 | [skills/harness-creator/scripts/lib/harness-utils.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/lib/harness-utils.mjs) |

<a id="c14"></a>
## C14 · 五维结构评分

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 固定文件名的规则、任务、进度、交接与初始化文件 |
| 输出 | 各维度 1–5 分、总分、候选薄弱环节、退出码 |
| 实现机制 | 25 条存在性/字符串/Markdown 结构/JSON 字段检查 |
| 边界 | 不运行目标测试；不验证 evidence；空目录也是 20 分；模板可满分 |
| 本轮核查 | 空目录、模板、非法状态实测 |
| 固定来源 | [skills/harness-creator/scripts/validate-harness.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/validate-harness.mjs) |

<a id="c15"></a>
## C15 · HTML 评分报告

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 同一套结构评分结果 |
| 输出 | 可浏览的独立 HTML 报告 |
| 实现机制 | 把五维评分及检查项插入 HTML 模板 |
| 边界 | 静态报告，无历史数据库或实时监控 |
| 本轮核查 | HTML 文件生成实测 |
| 固定来源 | [skills/harness-creator/scripts/render-assessment-html.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/render-assessment-html.mjs) |

<a id="c16"></a>
## C16 · 结构 Benchmark

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 目标项目与 evals 定义 |
| 输出 | JSON/HTML 报告、自检与退出码 |
| 实现机制 | 临时生成模板并评分；检查 eval 条目覆盖；再评分目标项目 |
| 边界 | 不调用模型；不执行 10 条任务；自检未运行虚构项目里的 tsc/vitest |
| 本轮核查 | 完整本地运行 |
| 固定来源 | [skills/harness-creator/scripts/run-benchmark.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/run-benchmark.mjs) |

<a id="c17"></a>
## C17 · 10 条 Skill 评估用例

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 资料 / 阅读资料 |
| 输入或适用问题 | 需要评价 Skill 输出的测试任务 |
| 输出 | prompt、expected_output、expectations |
| 实现机制 | 预先定义创建、记忆、安全、上下文、协作等代表场景 |
| 边界 | 是用例说明，缺少自动执行宿主、采集回复和逐条判分的运行器 |
| 本轮核查 | JSON 与 benchmark 消费方式核对 |
| 固定来源 | [skills/harness-creator/evals/evals.json](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/evals/evals.json) |

<a id="c18"></a>
## C18 · 独立 Bash 仓库审计

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 已有代码仓库路径 |
| 输出 | CRITICAL/RECOMMENDED 检查结果与建议 |
| 实现机制 | 检查文档、环境、状态、反馈及课程 L03–L12 的文字/文件规则 |
| 边界 | 依赖 Bash/常用命令；评分口径与 Node 工具不同；不会执行测试 |
| 本轮核查 | 在生成样例上实测退出 1 |
| 固定来源 | [tools/audit-harness.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/tools/audit-harness.sh) |

<a id="c19"></a>
## C19 · 记忆与上下文管理方法

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 参考模式 / 方法参考 |
| 输入或适用问题 | 长会话、上下文预算与信息遗忘问题 |
| 输出 | 分层记忆、索引/主题文件、按需加载、压缩和隔离方案 |
| 实现机制 | 指导设计持久化和上下文选择 |
| 边界 | 没有附带自动摘要、向量检索或 Token 预算执行引擎 |
| 本轮核查 | 参考文档阅读 |
| 固定来源 | [skills/harness-creator/references/context-engineering-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/context-engineering-pattern.md) |

<a id="c20"></a>
## C20 · 可复用 Skill 组织方法

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 参考模式 / 方法参考 |
| 输入或适用问题 | 希望跨项目复用流程 |
| 输出 | 简短入口、深层 references、templates、evals 的组织规则 |
| 实现机制 | 按需加载和职责拆分 |
| 边界 | 不生成或运行新的 Skill 平台 |
| 本轮核查 | 参考文档阅读 |
| 固定来源 | [skills/harness-creator/references/skill-runtime-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/skill-runtime-pattern.md) |

<a id="c21"></a>
## C21 · 工具权限与安全方法

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 参考模式 / 方法参考 |
| 输入或适用问题 | 自定义 Agent 的工具调用策略 |
| 输出 | 权限、并发分类、拒绝处理、审计设计 |
| 实现机制 | 提出工具注册和调用策略，附示例代码 |
| 边界 | 没有可直接启用的沙箱、权限代理或 MCP Server |
| 本轮核查 | 参考文档核对 |
| 固定来源 | [skills/harness-creator/references/tool-registry-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/tool-registry-pattern.md) |

<a id="c22"></a>
## C22 · 多 Agent 协作方法

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 参考模式 / 方法参考 |
| 输入或适用问题 | 多角色分工与并行任务 |
| 输出 | 协调者/工作者/评审者的职责、工具范围和交接格式 |
| 实现机制 | 独立上下文、任务边界和集成验收 |
| 边界 | 不会创建实际 Agent、工作树或任务队列；示例协调器未实现 |
| 本轮核查 | 参考文档阅读 |
| 固定来源 | [skills/harness-creator/references/multi-agent-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/multi-agent-pattern.md) |

<a id="c23"></a>
## C23 · 生命周期与 Hook 设计

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 参考模式 / 方法参考 |
| 输入或适用问题 | 一致启动、后台任务、结束交接 |
| 输出 | 启动阶段、Hook 信任边界和长任务状态设计 |
| 实现机制 | 按依赖初始化、状态机、清理和恢复指导 |
| 边界 | 不是已经运行的 Hook 系统或后台服务 |
| 本轮核查 | 参考文档核对 |
| 固定来源 | [skills/harness-creator/references/lifecycle-bootstrap-pattern.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/references/lifecycle-bootstrap-pattern.md) |

<a id="c24"></a>
## C24 · 目标循环与定时循环

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 编排 / 方法参考 |
| 输入或适用问题 | 可重复任务和停止条件 |
| 输出 | goal、loop-state 等模板和实验步骤 |
| 实现机制 | 每轮读状态、执行、验证、继续或停止 |
| 边界 | 循环驱动与调度来自外部宿主；仓库本身不提供可直接用的通用守护进程 |
| 本轮核查 | 模板、课程和目录核对 |
| 固定来源 | [docs/en/lectures/lecture-13-loop-engineering/code/goal-template.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-13-loop-engineering/code/goal-template.md) |

<a id="c25"></a>
## C25 · 实现者与检查者分离

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 编排 / 需接入 |
| 输入或适用问题 | 任务、实现结果和独立评价标准 |
| 输出 | maker/checker 提示模板；P05 三种对照角色配置 |
| 实现机制 | 减少实现者自评偏差，检查失败则返工 |
| 边界 | 评价仍可能遗漏错误；预填评分不是本轮实测收益 |
| 本轮核查 | 模板与 P05 README 核对 |
| 固定来源 | [docs/en/lectures/lecture-13-loop-engineering/code/checker-prompt.md](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-13-loop-engineering/code/checker-prompt.md) |

<a id="c26"></a>
## C26 · 图编排示例

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 编排 / 教学骨架 |
| 输入或适用问题 | requirements、code、review 等共享状态 |
| 输出 | LangGraph 节点、边、条件路由与检查点示例 |
| 实现机制 | research→implement→verify，失败返回 implement |
| 边界 | 模型未实现；测试是字符串判断；merge 仅打印；内存检查点不支持进程退出后持久恢复 |
| 本轮核查 | 源码核对；未运行完整图 |
| 固定来源 | [docs/en/lectures/lecture-14-graph-engineering/code/maker_checker_graph.py](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-14-graph-engineering/code/maker_checker_graph.py) |

<a id="c27"></a>
## C27 · 示例应用：文档导入与管理

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 示例应用 / 教学实现 |
| 输入或适用问题 | 本地文本文件 |
| 输出 | 本地文件副本、正文、文档元数据和列表界面 |
| 实现机制 | Electron 主进程 + 服务层 + JSON 文件持久化 |
| 边界 | 主要按 UTF-8 文本读取；没有 PDF/OCR/Office 解析能力；不是独立上架成品 |
| 本轮核查 | 源码核对；未启动 GUI |
| 固定来源 | [projects/project-06/solution/src/services/document-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/document-service.ts) |

<a id="c28"></a>
## C28 · 示例应用：分块与增量索引

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 示例应用 / 教学实现 |
| 输入或适用问题 | 已导入文档正文 |
| 输出 | 段落分块、chunks 与 index-meta JSON |
| 实现机制 | 约 500 字符目标分块，批量跳过已索引文档 |
| 边界 | 无 embedding、向量库或内容变更哈希；单文档与批量索引一致性存在缺口 |
| 本轮核查 | 源码核对 |
| 固定来源 | [projects/project-06/solution/src/services/indexing-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/indexing-service.ts) |

<a id="c29"></a>
## C29 · 示例应用：带引用问答

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 示例应用 / 教学模拟 |
| 输入或适用问题 | 问题和文档分块 |
| 输出 | 预设答案或摘录、最多两条相关引用 |
| 实现机制 | 按空格分词与关键词重合排序，匹配预设 MOCK_PATTERNS |
| 边界 | 没有真实 LLM；固定置信度不是真实概率；中文检索与任意问答能力有限 |
| 本轮核查 | 源码核对 |
| 固定来源 | [projects/project-06/solution/src/services/qa-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/qa-service.ts) |

<a id="c30"></a>
## C30 · 示例应用：历史、反馈和数据保存

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 示例应用 / 教学实现 |
| 输入或适用问题 | 问答与用户反馈 |
| 输出 | qa-history.json、feedback.json 和界面状态 |
| 实现机制 | 同步本地 JSON 读写 |
| 边界 | 反馈不会自动训练模型；注释称原子写但实现为直接 writeFileSync；无并发事务 |
| 本轮核查 | 源码核对 |
| 固定来源 | [projects/project-06/solution/src/services/persistence-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/persistence-service.ts) |

<a id="c31"></a>
## C31 · 示例应用：结构化日志

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 示例应用 / 教学实现 |
| 输入或适用问题 | 服务名、级别、消息及数据 |
| 输出 | 带时间戳的 JSON 控制台输出 |
| 实现机制 | Logger/ServiceLogger 分层，按日志级别过滤 |
| 边界 | 未包含完整指标、追踪、日志平台和告警服务 |
| 本轮核查 | 源码核对 |
| 固定来源 | [projects/project-06/solution/src/services/logger.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/logger.ts) |

<a id="c32"></a>
## C32 · 示例应用：架构边界检查

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | renderer、services、main 中的 TS 源码 |
| 输出 | 跨层导入违规清单与退出码 |
| 实现机制 | find + grep 匹配 Node/Electron/React 导入 |
| 边界 | 文本匹配不是 AST 分析；源码目录缺失也可能通过 |
| 本轮核查 | 正常、注入违规、空目录三种实测 |
| 固定来源 | [projects/project-06/solution/scripts/check-architecture.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/check-architecture.sh) |

<a id="c33"></a>
## C33 · 示例应用：数据清理扫描

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 已实测 |
| 输入或适用问题 | 示例应用数据目录 |
| 输出 | 孤立正文、缺失分块、失效引用等诊断 |
| 实现机制 | Bash 调用 Python 读取 JSON 并对照文件 |
| 边界 | 只扫描不清理；问题不保证非零退出；缺失正文计数存在子 shell 丢失问题 |
| 本轮核查 | 孤立文件、缺失正文两种样例实测 |
| 固定来源 | [projects/project-06/solution/scripts/cleanup-scanner.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/cleanup-scanner.sh) |

<a id="c34"></a>
## C34 · 示例应用：性能 Benchmark

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 脚本 / 教学模拟 |
| 输入或适用问题 | 三个样本文本文件 |
| 输出 | 拷贝、估算分块、关键词查询和完整性统计 |
| 实现机制 | Shell 模拟操作并计时 |
| 边界 | 不是调用真实应用服务；浮点 time.time 与 Bash 整数运算有兼容风险；未实跑 |
| 本轮核查 | 源码核对 |
| 固定来源 | [projects/project-06/solution/scripts/benchmark.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/benchmark.sh) |

<a id="c35"></a>
## C35 · 课程网站构建与部署

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 维护工具 / 需依赖环境 |
| 输入或适用问题 | 多语言 Markdown、VitePress 配置 |
| 输出 | 本地课程网站与 GitHub Pages 构建结果 |
| 实现机制 | VitePress + GitHub Actions |
| 边界 | 服务课程内容，不是你的业务应用生成器；本轮未构建完整上游站点 |
| 本轮核查 | 配置与 workflow 核对 |
| 固定来源 | [package.json](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/package.json) |

<a id="c36"></a>
## C36 · 课程 PDF 与截图导出

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 维护工具 / 需依赖环境 |
| 输入或适用问题 | 构建后的课程网页、语言参数 |
| 输出 | artifacts/pdfs 中的合并 PDF、清单与 README 截图 |
| 实现机制 | Playwright 渲染页面，pdf-lib 合并；截图工具生成预览 |
| 边界 | PDF CLI 当前只接受 en/zh；不等于 15 种语言全部可导出；本轮未生成上游 PDF |
| 本轮核查 | 导出脚本、共享工具与 workflow 核对 |
| 固定来源 | [scripts/build-course-pdfs.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/build-course-pdfs.ts) |

<a id="c37"></a>
## C37 · 课程路径与项目产物校验

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 维护工具 / 需依赖环境 |
| 输入或适用问题 | 课程项目 Markdown 和 projects 目录 |
| 输出 | 不存在的路径或缺少文件的报告 |
| 实现机制 | 遍历项目文档路径字面量，核对 P01–P06 约定 |
| 边界 | 不是应用测试；P07/P08 目录引用不一定被该规则全面识别；未实跑该 TS 脚本 |
| 本轮核查 | 源码核对 |
| 固定来源 | [scripts/validate-project-docs.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/validate-project-docs.ts) |

<a id="c38"></a>
## C38 · 多语言与素材维护

| 项目 | 内容 |
| --- | --- |
| 类型 / 形态 | 维护工具 / 维护脚本 |
| 输入或适用问题 | 乌兹别克语课程文本和外部 logo URL |
| 输出 | 修正文案或获取 SVG 文本 |
| 实现机制 | Python 文本替换；简单 HTTPS 获取脚本 |
| 边界 | 不属于 Harness 运行能力；修正脚本会写文件，素材获取依赖网络 |
| 本轮核查 | 目录和脚本入口核对 |
| 固定来源 | [scripts/uz-orthography-fix.py](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/uz-orthography-fix.py) |
