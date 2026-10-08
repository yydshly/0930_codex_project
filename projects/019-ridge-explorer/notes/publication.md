# 山脊理解与完整网页发布 · 2026-10-09

本次将已经保存的 018 风景基础与 019 骑行探索整理成一套清晰的网页入口。019 的实时场景保留原路径，完整阅读页在 `understanding.html`；总首页摘要按定位、能力、原理、展示、价值、扩展与边界说明，引导图使用我们营地的真实效果截图。

页面内容包括两版关系、视觉反馈形成的判断标准、地形/云雾/植被/骑手/镜头构造、三个可抵达地点、真实路线导航、12 秒停留、地点卡、摄影、可选程序声音、浏览器骑行记录、基线恢复、源码入口、后续方向和来源许可。截图及历史验证注明 2026-10-03，2026-10-09 新检查另记。

公开包按 `scripts/ridge_publish.py` 明确白名单：当前客户端、模型/贴图/许可、HTML/CSS、十张选定实拍及对照、目录引导图别名，以及 018 的只读 ZIP/JSON。ZIP 固定 SHA 为 `b00777aab6da43248644f415f8f23eeca44750ad02fa4d91a82b9b66741a5c7d`。冻结源未写回；原 ZIP 中 105 个文件及 CRC 必须一致。

发布从当前远端独立分支开展，保留远端已有 16 个项目；仅追加 018、019 和必要发布检查，远端目录最终 18 项。主工作区其他未提交研究和本地 014 不并入。旧项目发布规则与 CI 检查保持原值。

正式入口：

- [完整理解与全部入口](https://yydshly.github.io/0930_codex_project/projects/019-ridge-explorer/understanding.html)
- [019 实时骑行](https://yydshly.github.io/0930_codex_project/projects/019-ridge-explorer/)
- [018 已保存的风景](https://yydshly.github.io/0930_codex_project/projects/018-ridge-atmosphere-lab/)

实际提交、构建部署状态、本机和在线校验结果见 `deployment-checks.json`、`publication-local-browser.json` 和 `publication-online-browser.json`；上线后填入确认记录。
