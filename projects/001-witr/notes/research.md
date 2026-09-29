# witr 研究笔记

研究范围：上游提交 `dc4fa1da82d3e266fcbd928641b4f30b3077c64f`，日期 2026-09-29。以下区分源码事实、使用建议与演示示例；未做四平台实机评测。

## 1. 项目定位和能力

witr 的问题是“为什么这个东西正在运行”。主要查询对象是操作系统进程、服务、网络端口、文件持有者和容器；不是项目待办、AI 任务语义或所有尚未触发的调度任务。

| 输入 / 输出 | 能力 | 说明 |
| --- | --- | --- |
| 名称、PID | 定位目标进程 | 默认名称包含匹配；多个匹配需要进一步指定 |
| `--port` | 端口到进程 | 部分场景有 systemd socket / 容器回退 |
| `--file` | 文件到相关进程 | 文件打开不等于排他锁；平台实现不同 |
| `--container` | 容器元数据 | 依赖运行时工具及访问权限 |
| 默认报告 | 命令、祖先、来源、上下文 | 尽力获取，信息可能缺失 |
| `--verbose` | 扩展资源与上下文 | 内存、I/O、线程、文件描述符等因平台不同 |
| `--tree` / `--short` | 关系树 / 简短链条 | 树可包含部分子进程 |
| `--json` | 结构化输出 | 外部集成应固定版本验证字段与错误输出 |
| 无参数 / `-i` | 交互式 TUI | 可查看进程、端口、容器、文件锁；平台能力有差异 |

来源：[README](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/README.md)、[命令路由](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/app/app.go)。

## 2. 公共架构

```text
用户查询
  → target：名称 / 端口 / 文件定位到 PID，或容器查询分支
  → proc：平台专用采集，构建统一 model.Process
  → ResolveAncestry：沿 PPID 向上读取并反转
  → source.Detect：按优先级选择主要来源
  → pipeline.AnalyzePID：资源、上下文、规则提示汇总
  → output / tui：文本、树、JSON、交互界面
```

平台文件使用 `//go:build linux`、`windows`、`darwin`、`freebsd` 等构建条件。构建对应系统版本时选用相应实现，而不是在 Windows 上仿真 Linux `/proc`。

父进程算法带重复 PID 防护；遇到根进程、父 PID 0 或读取失败终止。数据来自当前状态，不是持续记录的启动事件。因此进程退出、重新托管、PID 复用和权限边界都可能使解释不完整，不能把这条链当作取证级历史证明。

来源：[追溯算法](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/ancestry.go)、[分析流程](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/pipeline/analyze.go)、[来源识别](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/source/detect.go)。

## 3. 四平台运行机制

### Linux：直接读取内核公开状态

- `/proc/<pid>/stat`：父 PID、状态、CPU 累计时间、RSS 等。
- `cmdline`、`cwd`、`environ`：命令、工作目录、环境变量。
- `cgroup`：systemd 单元与容器归属线索。
- `/proc/net/tcp{,6}`、`udp{,6}`：网络表；通过 inode 与进程 `fd` 关联。
- systemd 详情：通过 D-Bus 查询描述、配置路径、重启次数、timer 信息。

核心采集不需要先调用 `ps`。容器详情等仍可能调用运行时 CLI；“Linux 直接读取”不等于整个工具完全没有子命令。

源码：[process_linux.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/process_linux.go)、[net_linux.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/net_linux.go)、[systemd_linux.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/source/systemd_linux.go)。

### Windows：原生接口与命令混合

| 信息 | 机制 |
| --- | --- |
| 进程快照、PPID、线程数 | ToolHelp32：CreateToolhelp32Snapshot / Process32FirstW / Process32NextW |
| 命令、目录、环境 | NtQueryInformationProcess、PEB、ReadProcessMemory；有限权限有降级路径 |
| CPU、内存、I/O、句柄 | GetProcessTimes、GetProcessMemoryInfo、GetProcessIoCounters、GetProcessHandleCount |
| 服务到 PID 映射 | SCM：OpenSCManagerW / EnumServicesStatusExW |
| 网络端口 | 调用并解析 `netstat -ano` |
| 指定文件到进程 | Restart Manager：RmRegisterResources / RmGetList |

不依赖 PowerShell/WMI 的核心进程查询，不代表完全不调用外部命令。受保护进程的信息可能不完整；某些资源读取失败会返回零值，不能一概解读为“没有资源占用”。

源码：[snapshot_windows.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/snapshot_windows.go)、[peb_windows.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/peb_windows.go)、[services_windows.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/services_windows.go)、[net_windows.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/net_windows.go)、[file_windows.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/target/file_windows.go)。

### macOS：命令采集与可选 libproc

`ps` 提供基本进程状态；`lsof` 提供目录、文件、套接字；`sysctl` 获取部分系统指标。来源检测关联 launchd 信息。启用 cgo 且满足构建条件时，部分扩展采集使用 `proc_pidinfo`、`proc_pid_rusage` 等 libproc 接口。SIP 和权限可能阻止读取详情，即使提高权限也不保证可读。

源码：[process_darwin.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/process_darwin.go)、[libproc_darwin_cgo.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/libproc_darwin_cgo.go)。

### FreeBSD：系统工具与 rc.d / jail 上下文

`ps` 提供基本状态；`procstat -f` / `-e` 提供文件和环境；`sockstat` 关联网络与 PID；`jls` 解析 jail。服务检测结合 PID 文件和 `/etc/rc.d`、`/usr/local/etc/rc.d` 脚本等线索，是尽力判断。

源码：[process_freebsd.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/process_freebsd.go)、[net_freebsd.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/net_freebsd.go)、[bsdrc_freebsd.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/source/bsdrc_freebsd.go)。

## 4. 资源与诊断边界

Linux / Windows 基础资源采集中的 CPU 百分比为累计 CPU 时间除以启动后的墙钟时间，是生命周期平均值。Windows 常驻内存使用 WorkingSetSize；部分详细资源上下文采用 PrivateUsage，不能把两个值当作同一口径。

Linux / Windows 的高 CPU 健康规则还涉及累计 CPU 时间阈值，不宜解释为“刚刚发生的 CPU 突增”。资源信息可以帮助缩小范围，但不能替代性能剖析或持续时序监控。

文件被打开不必然产生排他锁。Windows 支持指定文件查询相关进程，但当前不支持系统文件锁面板或在 TUI 内发送信号、调整优先级。Windows 上的工具不自动穿透 WSL 或 Docker 虚拟机的所有进程命名空间。

源码：[resource_windows.go](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/proc/resource_windows.go)、[规则提示](https://github.com/pranshuparmar/witr/blob/dc4fa1da82d3e266fcbd928641b4f30b3077c64f/internal/source/detect.go)。

## 5. 可扩展方式与采用建议

1. **低成本：外部调用。** 执行 witr，解析 JSON 和退出码。设置超时、固定版本、验证输出契约。退出码 0=成功无警告，1=找到但有警告，2=未找到，3=权限不足，4=输入无效或匹配不明确，5=内部错误。
2. **中等成本：包装 HTTP / MCP。** 将受限查询暴露给项目面板或助手。此为建议方案，未验证上游提供官方服务。使用参数数组和查询白名单；不把浏览器输入拼为 shell 命令。环境变量与命令行可能含敏感值，传给外部服务前需处理。
3. **深入扩展：新数据源和规则。** `internal/proc` 扩采集，`internal/source` 扩来源识别，`internal/pipeline` 扩聚合，`internal/output` / `tui` 扩展示。公共数据模型在 `pkg/model`；核心 `internal` 不可被其他 Go 模块随意导入，直接嵌入需重构或维护分支。
4. **历史与持续监控：额外系统。** 周期快照可建立趋势，但会漏掉采样间的短命进程。完整历史追踪需要额外事件采集与持久化，不能靠当前快照补回过去。

对本仓库使用者，建议先用于端口冲突和残留服务归属检查，再考虑自动化。它提供“事实线索”，不直接理解进程属于哪次 AI 对话、哪个待办或业务目标；这些语义需要另行记录并关联。

## 6. 演示与证据等级

网页是无依赖静态 HTML / CSS / JavaScript，用自编固定场景展示查询过程，不复制或执行上游运行引擎。

- **源码核实**：系统采集方式、父进程算法、来源规则、资源口径。
- **文档声明**：能力兼容矩阵、支持范围。
- **网页验证**：平台/场景切换、查询、错误状态、视图、响应式布局。
- **未验证**：四平台二进制端到端表现、准确率和性能。
- **公开部署**：已发布 GitHub Pages；首页、witr 页面、图片与资源验证通过，见部署说明。

示例中的 PID、目录、数值均不代表本机。JSON 采用教学结构，容器管理层级也不是内核进程树。源码链接固定到研究提交；升级时应同时核对 README、代码与演示文案。
