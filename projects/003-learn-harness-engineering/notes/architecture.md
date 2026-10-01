# 底层架构与机制

## 1. 实际软件边界

~~~text
你 / 编程 Agent
  ├─ 读取课程与 Skill → 决定工作方式
  ├─ 调用 create-harness.mjs → 向目标项目写五个文件
  ├─ 在目标项目实现功能 → 此过程由宿主 Agent 完成
  ├─ 调用项目检查入口 → 执行目标项目真正的验证命令
  └─ 更新状态、证据与交接 → 下一次继续

结构分析工具
  ├─ validate-harness.mjs → 读文件 → 规则匹配 → 分数与退出码
  ├─ render-assessment-html.mjs → 同一评分 → HTML
  ├─ run-benchmark.mjs → 自检 + 目标评分 + eval 结构检查
  └─ tools/audit-harness.sh → 独立 Bash 规则集 → PASS/FAIL/WARN
~~~

仓库没有统一服务端、独立 Agent 主循环或通用模型客户端。上图中的业务实现和真正验证属于宿主与目标项目，而非评分脚本。

## 2. 脚手架如何生成

[create-harness.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/create-harness.mjs) 调用 [harness-utils.mjs](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/lib/harness-utils.mjs)：

1. 解析参数；默认目标为当前目录，默认入口为 AGENTS.md。
2. 扫描文件并识别根 package.json 或其他技术栈标志。
3. 识别包管理器；读取现有 scripts 或采用语言级默认命令。
4. 通过字符串替换填充规则模板；复制固定功能、进度和交接模板。
5. 使用命令列表生成 Bash init.sh；已有文件默认跳过。
6. 打印生成情况。**这一步不安装目标依赖，不运行目标测试。**

Node 路径会选取 check、typecheck、type-check、lint、test、build 中存在的项。未知项目得到提示占位命令；Python 采用 pytest 与 compileall，但没有测试时退出码 5 被接受。

模板生成不是语义分析：不会读取产品需求后自动拆出正确功能，也没有适配复杂 monorepo 的工作图。

## 3. 五维评分的确切含义

五个维度为 Instructions、State、Verification、Scope、Lifecycle。每维 5 个检查，共 25 个；大部分是文件存在、关键短语、结构行、JSON 字段类型检查。

公式：

~~~text
单维分数 = max(1, round(通过条数 / 5 × 5))
总分 = round(五个维度分数之和 / 25 × 100)
默认通过线 = 70
~~~

因此空目录最低也是 20/100，而不是零。满分表示这些结构规则全部命中，不代表业务功能正确。

读取范围主要是根目录中的 AGENTS.md / CLAUDE.md、feature_list.json / feature-list.json、progress.md、session-handoff.md、init.sh。它不会遍历整个项目检查所有验收依据。

关键限制：

- JSON 仅检查 features 数组及 id/name/description/status 字符串等基础条件。
- 随附 schema 中的 status 枚举并未被评分函数执行。
- dependencies 的存在不代表依赖已满足。
- “有 Evidence 字样”不代表实际跑过验证。
- 英文关键短语与约定文件名影响分数；中文或等效自定义命名可能低估结构。

本轮实测见 [verification-results.json](verification-results.json)：无业务代码模板 100/100，改成任意状态字符串后仍为 100/100。

## 4. 结构 Benchmark 与业务 Benchmark 分开看

Skill 的 run-benchmark.mjs：

- 临时创建虚构 package.json；
- 调用生成器；
- 对生成文件进行结构评分；
- 检查 evals.json 是否有至少 10 个案例、名称是否覆盖某些类别、字段是否齐全；
- 对目标项目评分，生成 JSON 和可选 HTML。

它没有让模型执行 10 个案例，也没有运行虚构 package.json 里的 tsc/vitest/build。其自检证明生成器和结构检查链路工作，不证明生成的命令可运行。

P06 的 scripts/benchmark.sh 是另一套工具：拷贝样本、估算分块、搜索关键词；没有调用 TypeScript 服务类。不能把两种 benchmark 当成真实 Agent 效果评估。

## 5. 为什么文档约束与执行约束不同？

“完成前必须测试”写在规则里，是行为约定；进程返回失败、CI 拒绝进入下一步，是执行关卡。生成的 init.sh 能在命令失败时停下，但前提是：

1. 宿主确实执行它；
2. 命令能覆盖真实验收条件；
3. 命令的退出码正确；
4. 检查结果对应当前修改版本。

当前工具没有把这四点构成不可绕过的统一控制层。后续扩展应围绕这条链路，而不是增加更多同义规则。

## 6. 文件状态如何形成“记忆”

功能清单记录“当前任务是什么”；进度记录“最近发生了什么”；交接记录“下一步应做什么”；Git 记录“代码如何变化”。下一轮必须主动读取它们，才能获得连续性。

它们不自动等同于聊天记忆、语义检索或数据库事务。多个 Agent 同时改 JSON 或 Markdown 时，仍需归属、锁、冲突处理和恢复规则。仅把文件写到磁盘不足以保证并发一致性。

## 7. 教学应用的数据路径

~~~text
React 界面
  → preload 暴露的受控接口
  → Electron 主进程 IPC
  → Document / Indexing / QA / Persistence 服务
  → 本地文本与 JSON 文件
~~~

P06 导入文件正文，以段落为单位形成约 500 字符目标的分块；检索按问题词与分块的重合排序；答案来自预设模式或摘录，附引用。日志输出 JSON。界面包含文档列表、问答、历史、反馈与重置。

没有向量数据库、embedding 模型或生成模型。文件持久化也没有完整事务；writeJson 的注释声称原子写，实际为直接写目标文件。

证据：[服务目录](https://github.com/walkinglabs/learn-harness-engineering/tree/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services)。

## 8. 从循环到图：示例实际做到哪里？

L13 提供目标、状态、实现者和检查者提示模板。L14 使用 LangGraph 展示研究、实现、验证、合并节点与验证失败回边。

源码中的 call_model 抛出 NotImplementedError；tests_pass 判断代码是否含字符串；merge 只打印；attempts 没有节点更新；MemorySaver 保存于内存，不应理解为进程重启后仍有持久状态。图的连接方式可参考，但执行器和业务语义需要重建。

证据：[图骨架](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-14-graph-engineering/code/maker_checker_graph.py)。

## 9. 两套“五子系统”口径

README 主体与 Skill 采用“指令、状态、验证、范围、生命周期”；独立 Bash 审计和部分产品拆解采用“指令、工具、环境、状态、反馈”。这是不同分类角度，检查规则也不同，不能把两套得分直接对比。

Bash 审计额外检查锁文件、运行时版本、Makefile、PROGRESS.md、反馈与课程规则；本轮 Node 满分的模板，在 Bash 审计里仍未通过关键项。
