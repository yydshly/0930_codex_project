# 能力边界、文档差异与已观察缺口

以下结论绑定固定版本 77e7a3e，不把它们外推到未来版本。它们用于帮助采用和扩展，不是对整个项目的安全审计或穷尽式缺陷报告。

## 影响能力判断的重点

| 编号 | 观察 | 证据级别 | 采用影响 |
| --- | --- | --- | --- |
| F01 | 课程现有 14 讲、8 项说明，README 局部仍写 13/7 或六项 | 目录和正文核对 | 以固定目录为准，别用摘要数字推断范围 |
| F02 | P07/P08 说明引用项目目录，但 projects 中只有 P01–P06 | 目录实测 | 不能按文档路径直接打开完整循环方案 |
| F03 | 模板项目没有业务代码/测试文件，Node 结构分也可为 100 | 运行实测 | 满分不能作为交付验收 |
| F04 | 空目录评分为 20，因各维最低 1 分 | 运行实测 | 分数是工具自定义量表，不是完成百分比 |
| F05 | status 改为任意字符串仍满分；schema 枚举未接入评分器 | 运行实测 + 源码 | 需要独立 schema/状态迁移校验 |
| F06 | benchmark 不执行 10 条 Agent 任务，只检查案例结构 | 运行 + 源码 | eval coverage 100 不是成功率 100 |
| F07 | Node 与 Bash 使用不同文件约定和评分口径 | 运行实测 | 两种分数/结果不能直接比较 |
| F08 | --json 与 --html 一起使用时输出不是纯 JSON | 运行实测 | 管道消费者需拆分调用或过滤提示 |
| F09 | P06 QA 是关键词检索 + 预设答案；置信度固定 | 源码核对 | 不能直接作为真实 RAG/知识问答成品 |
| F10 | 图中 call_model 未实现、测试是字符串检查、merge 仅打印 | 源码核对 | 仅能借鉴图结构 |
| F11 | 图使用内存检查点；attempts 无更新节点 | 源码核对 | 不提供跨进程恢复或有效重试次数约束 |
| F12 | P06 架构检查在缺少源码目录时仍通过 | 运行实测 | 需先检查目标目录与扫描覆盖 |
| F13 | P06 清理扫描发现孤立文件仍返回 0 | 运行实测 | 不能直接作为失败阻断关卡 |
| F14 | P06 清理扫描输出 MISSING 后仍汇总 CLEAN | 运行实测 | 管道子 shell 中计数未回到父 shell |
| F15 | P06 性能脚本是模拟，不调用真实服务层 | 源码核对 | 不把数字当成应用吞吐或 Agent 效果 |
| F16 | 文档 PDF 构建器只接受 en/zh | 源码核对 | 15 种语言资料不等于 15 种导出 |
| F17 | 随附 npm test 命令，但 projects 未见 .test.* / .spec.* 文件 | 全量路径核对 | init.sh 或构建成功不代表完整测试通过 |
| F18 | Skill 模板启动列表没显式读取 progress/handoff | 模板核对 | 跨会话接续需要补完整读取约定 |

## 结构评分为何容易误解？

[scoreHarness](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/scripts/lib/harness-utils.mjs) 主要做关键词和文件检查。虽然它筛选 Markdown 的标题、列表、表格等结构，减少在普通散文里堆关键词的情况，但并未判断规则是否可执行、证据是否真实、业务行为是否正确。

更具体的限制包括：

- 使用英文标题/短语；等效中文工作规则可能得低分。
- 只读取预先列出的根文件；课程里常用的 claude-progress.md 不在 Node 读取候选中。
- JSON 验证没有使用随附 JSON Schema；status 枚举、依赖合法性和完成证据约束没有闭环。
- 任务清单为空时，基础数组 every 检查不会要求至少一条功能。
- 生成脚本和评分器共享相同模板约定，容易形成“自己生成的模板自己评满分”。

应该把分数用于“提醒缺少哪些组织结构”，不用于证明“这个 Agent 值得完全托管”。

## 示例应用中的实现缺口

### 问答与检索

[qa-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/qa-service.ts) 中预设多个答案模式；按空格分词、字符串包含计分，取前两条引用。confidence 由是否存在引用决定，值为 0.85 或 0.3。没有真实模型 API、embedding 或向量索引。

### 索引一致性

[indexing-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/indexing-service.ts) 的单文档索引分支写 chunks 和文档状态，但没有像批量分支一样更新 index-meta；批量路径依据已存在 ID 跳过，没有内容 hash 失效判断。这些是源码观察，本轮未启动 GUI 验证用户可见表现。

### 持久化

[persistence-service.ts](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/src/services/persistence-service.ts) 的“atomically”注释对应直接 writeFileSync，缺少临时文件替换、锁或事务；原文件备份也以 filename 为目标。进一步产品化前应处理崩溃中断、并发写入、同名文件及删除后的引用一致性。

### 验证工具本身

[cleanup-scanner.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/cleanup-scanner.sh) 的缺失正文计数在管道 while 子 shell 中增加，最终总数没有获得这一变化；发现问题的分支也没有以非零退出码终止。本轮使用专门样例复现了“输出缺失却 CLEAN”和“ISSUES FOUND 但 exit 0”。

[benchmark.sh](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/scripts/benchmark.sh) 使用 python3 time.time 产生浮点数，再交给 Bash 整数运算计算时间，存在运行失败风险；此问题仅做源码判断，未运行该脚本。

## 图式编排不是现成自动化平台

[L14 Python 文件](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/docs/en/lectures/lecture-14-graph-engineering/code/maker_checker_graph.py) 中：

- 模型适配器会直接抛出未实现异常。
- 测试通过依据是代码中存在 def test 字符串。
- 评审依据是文本中包含 approved；不是严格结构化结果。
- merge 节点仅打印，不执行提交或合并。
- 内存检查点不是磁盘数据库；文件注释中对进程死亡恢复的表述超出该选择的能力。
- attempts 声明为累加字段，但节点未返回增量。
- 失败回到 implement 时，实现节点只读取 requirements，没有使用 review 内容进行针对性修复。
- 路由遇到非 fail 字符串就进入 merge；生产实现应对未知状态显式处理。

这不妨碍它说明节点与路由概念，但需要重新设计真实工具执行、可恢复状态、错误分类和停止条件。

## 模板之间存在多种协议

课程功能表偏向 verification_steps、passes 等验收字段；Skill 表使用 status/evidence/dependencies。独立 Bash 审计偏向 PROGRESS.md、Makefile、锁文件和反馈文档；Node 评分偏向 progress.md、init.sh 与固定英文标题。

同样名为 init.sh 的文件也不完全一致：资源库版本会先切换到脚本目录并可选启动应用；生成器版本不切换目录，只执行选择的命令；P06 版本主要安装、类型检查、构建和文件存在检查。选择模板时应按行为评估，不能仅凭文件名互换。

## 证据范围与未验证内容

本轮没有做真实模型对照试验，没有运行长期自动循环，没有启用外部连接器或权限引擎，没有启动 Electron 界面，也没有构建整个上游网站/PDF。跨语言课程只做目录、字节与哈希核对及核心中英文抽样，不评价每种翻译质量。

对外部产品内部机制的四篇拆解属于该仓库作者分析，本研究没有重新验证全部外部产品当前实现；其中的性能百分比或角色评分不作为本研究结论。
