# 山脊理解与完整网页发布 · 2026-10-09

本次将已经保存的 018 风景基础与 019 骑行探索整理成一套清晰的网页入口。019 的实时场景保留原路径，完整阅读页在 `understanding.html`；总首页摘要按定位、能力、原理、展示、价值、扩展与边界说明，引导图使用我们营地的真实效果截图。

页面内容包括两版关系、视觉反馈形成的判断标准、地形/云雾/植被/骑手/镜头构造、三个可抵达地点、真实路线导航、12 秒停留、地点卡、摄影、可选程序声音、浏览器骑行记录、基线恢复、源码入口、后续方向和来源许可。截图及历史验证注明 2026-10-03，2026-10-09 新检查另记。

公开包按 `scripts/ridge_publish.py` 明确白名单：当前客户端、模型/贴图/许可、HTML/CSS、十张选定实拍及对照、目录引导图别名，以及 018 的只读 ZIP/JSON。ZIP 固定 SHA 为 `b00777aab6da43248644f415f8f23eeca44750ad02fa4d91a82b9b66741a5c7d`。冻结源未写回；原 ZIP 中 105 个文件及 CRC 必须一致。

发布从当前远端独立分支开展，保留远端已有 16 个项目；仅追加 018、019 和必要发布检查，远端目录最终 18 项。主工作区其他未提交研究和本地 014 不并入。旧项目发布规则与 CI 检查保持原值。

正式入口：

- [完整理解与全部入口](https://yydshly.github.io/0930_codex_project/projects/019-ridge-explorer/understanding.html)
- [019 实时骑行](https://yydshly.github.io/0930_codex_project/projects/019-ridge-explorer/)
- [018 已保存的风景](https://yydshly.github.io/0930_codex_project/projects/018-ridge-atmosphere-lab/)

内容提交 [`2df8e326`](https://github.com/yydshly/0930_codex_project/commit/2df8e32629d7c7a6b0a183c48496ca36c5e569f3) 已推送远端 main；[GitHub Pages 构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37819977961)成功。正式完整理解页、019 实时场景和 018 保存基线均已在浏览器打开核对。

公网 33 个 019 资源、14 个 018 运行资源以及全部 18 个演示入口均 HTTP 200。公开清单的大小与 SHA-256 完全匹配；019 中 32 项与 Git 提交字节精确一致，重新构建的 index.html 标签、属性和正文全部一致。总目录只存在 Windows 与 Linux 换行差异。营地引导图 SHA 与原实拍相同，冻结 ZIP 的固定哈希、105 成员和 CRC 均通过。

桌面 1280×820 与窄屏 390×844、320×780 阅读布局没有页面横向溢出；完整文章、场景往返、三地点地图、真实 PNG 预览、独立基线与总目录链接均核对。PNG 预览实际为 1280×820，当前记录不声称捕获了下载事件，也不等于实体手机 GPU、统一帧率或人工听感验收。原有 43 项场景测试本次再次通过；发布 worktree 的 Python 共 79 项，其中 72 项执行通过、7 项旧 Windows 符号链接权限测试跳过，新增六项发布测试全部执行。

详细实测见 [公网文件检查](deployment-checks.json)、[本机网页检查](publication-local-browser.json)、[公网网页检查](publication-online-browser.json)。可运行 `python projects/019-ridge-explorer/tooling/verify-publication-online.py` 复核该内容提交；脚本只读取公网与 Git 源码，不发布或修改冻结基线。
