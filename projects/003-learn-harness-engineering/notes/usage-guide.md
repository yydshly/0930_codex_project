# 使用路线与系统支持

## 先选择你要用哪一部分

| 目标 | 使用路线 | 不需要做的事 |
| --- | --- | --- |
| 学习概念 | 读课程和本研究的课程地图 | 不需要安装整个站点 |
| 给项目补工作规则 | 使用模板或运行生成器 | 不需要启动 Electron |
| 检查已有项目的规则结构 | Node 评分器或 Bash 审计 | 不需要模型密钥 |
| 让 AI 根据项目做判断 | 在兼容宿主中使用 harness-creator | 不能只安装后期待自动运行 |
| 练习编程 Agent 工作流程 | 跑 P01–P06 教学工程 | 不应把模拟问答当成真实模型能力 |
| 建造自动循环 | 按 L13/L14 设计并接入执行环境 | 没有现成完整通用调度服务 |

## 路线 A：直接运行脚本

这些命令是使用说明。请在单独下载的上游目录运行，并先替换目标路径；本研究只在自己的临时样例上做了写入验证。

~~~powershell
git clone https://github.com/walkinglabs/learn-harness-engineering.git
cd learn-harness-engineering
git checkout 77e7a3e21469dcbece2558086c8d91657abeaa40

node skills/harness-creator/scripts/create-harness.mjs --target "F:/your-project"
node skills/harness-creator/scripts/validate-harness.mjs --target "F:/your-project"
node skills/harness-creator/scripts/render-assessment-html.mjs --target "F:/your-project" --output "F:/your-project/harness-assessment.html"
node skills/harness-creator/scripts/run-benchmark.mjs --target "F:/your-project" --html "F:/your-project/harness-benchmark.html"
~~~

脚本只使用 Node 内置模块，不需要在上游根目录先 npm install。默认生成 AGENTS.md、feature_list.json、progress.md、session-handoff.md、init.sh。已有文件默认跳过；不会进行智能内容合并。

### 主要参数

| 工具 | 参数 | 用途 |
| --- | --- | --- |
| create-harness | --target DIR | 指定目标项目；也支持首个位置参数 |
| create-harness | --agent-file CLAUDE.md | 改入口文件名 |
| create-harness | --package-manager npm/pnpm/yarn/bun | 覆盖自动探测 |
| create-harness | --commands "cmd1,cmd2" | 以逗号拆分的自定义验证命令，替换默认列表 |
| create-harness | --force | 覆盖已有生成文件；采用前应检查差异和备份 |
| validate-harness | --json | 输出 JSON 评分 |
| validate-harness | --html FILE | 同时写 HTML |
| validate-harness | --min-score N | 默认通过线 70，低于阈值退出 1 |
| render-assessment-html | --output FILE | 默认写目标目录 harness-assessment.html |
| run-benchmark | --output FILE / --html FILE | JSON 默认写目标目录，可选 HTML |
| run-benchmark | --evals FILE | 使用指定评估用例定义 |
| run-benchmark | --no-self-check | 跳过临时生成自检 |
| run-benchmark | --min-score / --min-eval-score / --min-self-check-score | 默认分别 70、80、90 |

注意 --commands 按逗号分割，不适合直接传包含复杂逗号语法的命令；可把复杂验证封装为项目脚本。--json 与 --html 同时使用时 stdout 会先输出 HTML 保存提示，不是纯 JSON 流，本轮已复现。

## 路线 B：把 Skill 交给宿主使用

上游 README 给出的安装方式为：

~~~text
npx skills add walkinglabs/learn-harness-engineering --skill harness-creator
~~~

这是上游使用说明，本轮没有执行该安装命令，也没有验证所有宿主的兼容性。安装路径、发现和触发机制由你使用的宿主决定；目录中 metadata 的兼容声明不等于本轮逐平台验证。

装好后可以给宿主一个具体任务，例如：

> 检查当前项目已有规则和验证命令，保留现有内容，只补最小工作流程。把真实待办写入功能清单，明确如何验证完成，并解释每个新增文件的用途。

Skill 指导 AI 怎么工作；配套脚本只做它们实现的文件操作和结构检查。需要宿主已有读写文件、执行命令和模型推理能力。

来源：[Skill README](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/skills/harness-creator/README.md)。

## 生成之后必须做什么？

1. 将占位功能替换为真实、可验收的需求。
2. 确认 init.sh 中的每条命令都适合目标项目。
3. 在项目根目录执行初始化与验证；保留具体输出和失败信息。
4. 明确要求新会话读进度与交接；模板默认启动列表未显式列出这两项。
5. 功能完成时记录对应版本、验证方式和结果。
6. 用几项真实任务对照采用前后的返工和人工介入，而非只比较结构分。

## 技术栈探测的范围

| 输入特征 | 生成的基础行为 | 注意 |
| --- | --- | --- |
| package.json | 安装 + 已有 check/typecheck/type-check/lint/test/build | 无对应 script 时不会创造测试 |
| React/TypeScript 依赖 | 标记为对应 Node 技术栈 | 不分析实际架构和组件 |
| pyproject.toml / requirements.txt | python3 -m pytest；compileall | pytest 退出 5 被接受；不安装 Python 依赖 |
| go.mod | go test ./... | 需 Go 环境 |
| Cargo.toml | cargo test | 需 Rust 工具链 |
| pom.xml | mvn test | 需 Maven/Java |
| build.gradle / build.gradle.kts | ./gradlew test | 需 wrapper 和 Java |
| .csproj / .sln | dotnet test | 需 .NET |
| 没有可识别清单 | 提示替换占位命令 | 不构成实际验证 |

技术栈探测的文件遍历上限为 800；根 package.json 优先于其他语言。混合项目、子目录执行和自定义工具链应显式配置。

## 平台支持

| 部分 | Windows | Linux / macOS | 本轮情况 |
| --- | --- | --- | --- |
| Node 生成/评分/HTML 工具 | 可以使用 Node | 设计上可用 | Windows + Node v22.15.0 实测 |
| 生成的 init.sh | 需要 Git Bash/WSL 或改写入口 | 需要 Bash | Git Bash 下用自定义命令实测 |
| tools/audit-harness.sh | 需要 Bash 与 grep/find 等工具 | 需要同类命令 | Windows Git Bash 实测 |
| P06 cleanup-scanner.sh | 需 Bash + python3，显式传数据目录更稳妥 | 需 Bash + python3 | 临时 Python 适配器下实测 |
| Electron 示例 | 需要图形桌面和依赖 | 同样需要图形环境 | 仅源码分析，未启动 GUI |
| 课程网站/PDF | Node 依赖；PDF 另需 Chromium | 同理 | 未构建上游站点/PDF |
| LangGraph 骨架 | Python + LangGraph + 自建模型/测试适配 | 同理 | 只核对源码 |

“基础命令探测支持多语言”与“已经在这些操作系统跑通完整项目”是两件事，本轮不做后一种承诺。

## 教学工程和课程网站

从上游项目目录运行：

~~~powershell
cd projects/project-06/solution
npm install
npm run check
npm run build
npm run dev
~~~

这些是上游项目入口说明，本轮未安装 Electron 依赖或完成 GUI 验收。虽然 package.json 有 vitest 命令，但该固定版本 projects 目录没有检索到 .test.* / .spec.* 测试文件，不能假定有完整自动化测试集。

课程网站在上游根目录用 npm ci、npm run docs:dev / docs:build。PDF 使用 npm run pdf:build；构建器支持 en/zh，不能据多语言课程覆盖推断全部语言均可导出。

来源：[根命令](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/package.json)、[P06 命令](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/projects/project-06/solution/package.json)、[导出实现](https://github.com/walkinglabs/learn-harness-engineering/blob/77e7a3e21469dcbece2558086c8d91657abeaa40/scripts/build-course-pdfs.ts)。
