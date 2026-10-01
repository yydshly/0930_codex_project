# 复现与验证记录

## 范围

本轮以固定版本 77e7a3e21469dcbece2558086c8d91657abeaa40 为研究对象。原始下载位于被 Git 忽略的 .cache/，文件级 Git blob SHA 与上游树清单逐一比对。跟踪内容只保留研究、索引、结果与复现脚本。

本轮不安装 Skill，不给模型发起评测任务，不启动 Electron GUI，不构建上游网站和 PDF，不发布任何站点。

## 环境

- Windows，PowerShell。
- Python 3.10.11。
- Node.js v22.15.0。
- Git Bash 位于本机 Git 安装目录。
- 浏览器检查使用本机 Chromium 系浏览器与 Python Playwright；仅检查原创阅读页。

机器可读的精确环境、每条观察的证据和退出码见 [verification-results.json](verification-results.json)。

## 核心验证结果

共 34 项研究观察，包含正向功能和已确认限制。这里的“观察确认”不等于“上游所有功能合格”。

| 验证组 | 操作 | 结果含义 |
| --- | --- | --- |
| 来源 | 2,478 个文件重新计算 Git blob SHA | 下载内容与固定树清单一致 |
| 最小生成 | 临时 Node 项目生成工作文件 | 五个预期文件存在 |
| 保留已有文件 | 对同一目录再次生成并比较哈希 | 默认不覆盖 |
| 结构评分 | 空目录、无业务模板、非法 status | 分别观察 20 分、100 分、仍 100 分 |
| 报告 | 生成 HTML 与 benchmark JSON/HTML | 报告文件和结构自检正常 |
| 技术栈 | 9 种栈分支、3 种非默认包管理器 | 生成命令与源码设计一致；没有实际安装各语言环境 |
| 可配置性 | CLAUDE.md、自定义验证命令 | 参数生效 |
| 失败停止 | 三条本地命令，第二条返回 7 | 后续标记文件未创建 |
| 独立审计 | Bash 审计 Node 满分样例 | 按不同规则报告关键项失败 |
| 架构检查 | 原 P06、注入违规、空目录 | 可抓示例违规，但缺源码目录仍通过 |
| 清理扫描 | 缺失正文、孤立正文样例 | 发现误汇总与退出码不能阻断的问题 |
| 能力边界 | P07/P08 路径、图占位、QA 模拟 | 目录/源码证据确认 |

缺失正文样例在 Windows Python/Bash 组合下输出 ID 后夹有换行，诊断仍显示 MISSING，而最终汇总为 CLEAN。为排除 python3 别名影响，实验临时提供调用已知 Python 的适配脚本；没有更改上游源码。

## 如何重跑

先将指定提交解压到：

~~~text
projects/003-learn-harness-engineering/.cache/
  learn-harness-engineering-77e7a3e21469dcbece2558086c8d91657abeaa40/
~~~

或者在命令中显式传入同版本源码目录：

~~~powershell
python projects/003-learn-harness-engineering/scripts/verify_upstream.py "F:/your-upstream-snapshot"
~~~

该脚本：

- 验证源文件哈希；
- 在子项目 .cache/ 创建独立样例目录；
- 使用子进程参数数组调用上游工具；
- 不对现有用户业务项目生成文件；
- 不运行生成的默认 npm install/test；
- 只执行本研究创建的无网络自定义验证命令；
- 保留本轮临时目录以便复查；
- 将结果写入 notes/verification-results.json。

结构 benchmark 自检会创建并清除自己的临时目录；本研究把 TEMP/TMP/TMPDIR 指向本轮样例根目录。P06 benchmark.sh 未执行。

## 阅读页与资料维护

~~~powershell
python projects/003-learn-harness-engineering/scripts/build_research.py
python projects/003-learn-harness-engineering/scripts/check_research.py
python scripts/projects.py check
~~~

build_research.py 由当前 capability JSON、课程/资源索引和研究笔记生成能力矩阵、源码导航及静态阅读页。生成网页需要 Python markdown；浏览器验证需要 playwright 和可启动的 Chromium/Chrome/Edge。

研究页检查包括：内部文件链接、固定源码路径、能力数量、搜索空态、筛选、键盘可操作性、桌面/手机宽度显示及 JavaScript 错误。具体结果见 [reading-page-checks.json](reading-page-checks.json)。

## 未覆盖内容

- 没有跑真实 Agent 的 10 条 eval，也没有比较模型成功率。
- 没有验证所有操作系统和宿主 Skill 安装。
- 没有安装 Electron、运行图形应用或做完整端到端业务测试。
- 没有执行上游性能模拟 benchmark、翻译改写或素材抓取脚本。
- 没有构建或发布上游课程网站、课程 PDF 或本研究公开站点。
- 没有逐句翻译校对；全量指文件索引与能力分类覆盖，不是每种语言语义审校。

本轮真实跑通的是脚手架/结构检查/报告与有限 Bash 行为；其余结论明确标为源码观察或扩展建议。
