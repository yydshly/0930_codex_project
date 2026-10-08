# 2026-10-08 网页整理与静态发布

本次发布保留九个网页：研究总览、六效果实验、头像出逃、跨站实录页、无引擎样本页、六工具产品工作台、网页工具箱、安装说明与依赖许可。网页最前面增加六组真实预览，逐个列出六类产品、四项工具、两个扩展包、实录、原作和源码 / 研究目录。

摘要按定位、能力、产物、原理、场景、价值、扩展和边界整理。原作游戏、本地独立引擎、角色 / 宿主适配、独立交互原型和工具模块分别说明；未确认原作公开破坏 SDK。

研究集首页和项目页沿用 2026-10-02 已生成的 PNG。SHA-256：`ca0958efadbd064261d69dab1c4e46962a6b3f521ee681692711d91f4f9e3b30`。矢量原稿也保留；没有重新生成图或改写图内的研究日期。研究数量为当时快照，后续方向仍未开发。

`scripts/sprite_publish.py` 发布完整运行模块、真实截图、GitHub 录像和两个审阅过的扩展安装包，生成 `publication-manifest.json`。本地 62/62 文件大小和 SHA-256 一致；9 个 HTML 页面均在清单内。隐藏配置、依赖缓存和未选择的录屏 / 下载不作为公开网页文件。

本地验证：研究首页 22/22、原可玩实验 21/21、Node 34/34、截图后台 6/6。仓库 Python 43 项：38 通过，5 项因 Windows 无符号链接能力跳过；CI 将在 Linux 运行。两个 ZIP 与源代码一致，生产头像扩展仅申请 activeTab+scripting。公网 62/62 文件、22/22 研究页检查与 11/11 实际体验检查通过。

GitHub Pages 提供静态网页，工具状态保存在当前浏览器；本机预览与公开来源的存储互不迁移。翻译依赖 MyMemory 外部服务，可能限流；浏览器 Translator 的可用性取决于浏览器。旧 GitHub 实录是实际浏览器运行、脚本操作，使用临时增加截图权限的测试副本；正式包的人工授权手势未在这段录像验证。自有 App、照片全身动画、联机、营销核销和采集后端尚未实现。

## 已完成的公开发布

公开入口：[完整研究与演示](https://yydshly.github.io/0930_codex_project/projects/009-sprite-destruction-lab/#entries)。[原有总览图](https://yydshly.github.io/0930_codex_project/projects/009-sprite-destruction-lab/research/overview.png)的哈希与源图完全一致。

首个内容提交：`669af1faa320ed4b7f5dbf236c59206576cc423a`。GitHub Pages [构建与部署](https://github.com/yydshly/0930_codex_project/actions/runs/37744019247)均成功。

- `publication-files-online.json`：全部 62 个公开文件 HTTP 200，大小及 SHA-256 一致，包含九个页面、实际录像和两个 ZIP。
- `publication-browser-online.json`：22 项公开研究页检查；桌面 / 手机、全部内部入口与实际工具路由、分类、总览图放大 / 下载、证据与能力来源说明。
- `publication-experience-online.json`：11 项实际体验；15.48 秒录像播放、页面点选与碎片、头像踢击 / 复原、内容动效与实时 PNG 下载、表格读取和摘录路由。
- `publication-entry-checks.json`：总目录摘要 / 原图 / 完整入口 / 公开清单与十个既有项目，共 15 项检查。

这些检查验证当前静态发布与选定流程，不能据此声称所有第三方网站、所有浏览器、正式扩展人工授权或商业价值已验证。
