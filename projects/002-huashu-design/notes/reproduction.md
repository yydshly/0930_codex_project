# 复现与验证记录

本文件保留 2026-09-29 的基础研究与教学实验记录。2026-09-30 新增指定上游组件与 PDF/PPTX/MP4 的实际运行成果，见 [真实场景实测报告](real-case.md)。下方“未运行”表仅描述此前阶段。

## 范围与环境

| 项目 | 记录 |
| --- | --- |
| 研究日期 | 2026-09-29 |
| 上游提交 | 0830494ecb1c117e25b313a8114fe55a6bf2b125 |
| 本地系统 | Windows，PowerShell |
| Python | 3.10.11 |
| Node.js | 22.15.0 |
| Python Playwright | 1.59.0 |
| 渲染浏览器 | Chrome/Chromium 153.0.8010.53 |
| 本站前端 | 原生 HTML、CSS、JavaScript，无构建和远程运行依赖 |
| 网络策略 | 截图和浏览器检查阻止 http/https 请求，确保本站使用本地资源 |
| 实测对象 | 本站研究展示、六个教学实验、三份上游预制封面 |

## 来源取得与版本固定

通过 GitHub 连接器读取固定提交及递归树。树包含 191 个文件，其中 references 33 份、scripts 20 个。部分关键源码/文档在本轮和前序分析中阅读；机器索引逐条记录已阅读文件/片段与仅建立目录索引的区别。

原终端直接访问 GitHub 未成功，随后改用 GitHub 连接器取得公开资料。没有安装 Skill，没有复制整个上游仓库，没有修改上游仓库，也没有改变用户全局 Git 配置。

三份封面 HTML 与 LICENSE 的原始 UTF-8 字节以 Git blob SHA 算法对照上游树核验，全部匹配。随附位置：web/upstream/。保留原文意味着直接打开 Build/Takram 样例时，它们仍含远程 Google Fonts 链接；本轮截图时阻止该请求，使用字体回退。

## 本站运行

在研究仓库根目录：

~~~powershell
python -m http.server 8766 --bind 127.0.0.1 --directory projects/002-huashu-design
~~~

访问 http://127.0.0.1:8766/web/。这是本机临时服务，不是已部署的公网网站；端口被占用时可换一个空闲端口。用 Ctrl+C 停止对应服务。

直接双击 web/index.html 也可以浏览。浏览器在 file:// 下对存储/剪贴板可能有差异，脚本包含存储失败和复制失败的降级；推荐本地 HTTP 服务。

## 浏览器复现步骤

~~~powershell
python projects/002-huashu-design/scripts/check_demo.py
~~~

需要 Python Playwright 和一个可执行 Chromium 浏览器。脚本优先使用 HUASHU_BROWSER 指定路径，再寻找常见 Windows Chrome/Edge 路径，最后尝试 Playwright 默认浏览器。没有对应工具时需由使用者准备环境；本站正常浏览不依赖这些测试工具。

脚本会生成三份封面截图、本站四张代表截图与 notes/demo-checks.json。它只对本站和随附原样例做检查，不调用模型、上游导出、TTS 或评审服务。

## 本轮检查结果

当前 [机器记录](demo-checks.json) 为 61/61 通过，未收集到本站页面 JavaScript 异常。检查覆盖：

- 三份上游预制封面的离线渲染。
- 九章节导航与桌面页面横向溢出。
- 16 能力索引、搜索命中/空态、对话框与 Esc 关闭。
- 原型详情、收藏与已收藏页面。
- 幻灯片按钮、键盘及首尾边界。
- 动画时间定位、播放推进、暂停与归零。
- Tweaks 刷新保存与恢复默认。
- 数据图形零值长度。
- 概念不足时的评审封顶与解除封顶。
- 60 风格及按媒介筛选，三份图片加载。
- 模板导出路线选择、20 个脚本筛选。
- 390px 手机视口下九章节和六实验的页面横向溢出。
- 修改基准字体时的概览页面溢出检查；这不是全面无障碍认证。

截图后进行了人工视觉查看，发现并修正案例画廊图片按原始高度裁切的问题。桌面、实验、画廊和手机截图随附供核对。页面溢出通过不代表所有元素、字号、对比度或全部设备均已审计。

## 检查产物

| 文件 | 含义 |
| --- | --- |
| assets/overview.png | 研究展示桌面概览 |
| assets/interactive-lab.png | 动画时间轴教学实验 |
| assets/gallery.png | 上游样例画廊与风格索引 |
| assets/mobile.png | 390px 手机视口完整概览 |
| web/images/cover-*.png | 1200×510 上游封面离线渲染 |
| notes/demo-checks.json | 实际逐项检查结果及浏览器版本 |
| notes/upstream-inventory.json | 固定版本目录、大小、blob SHA 与阅读范围 |

## 文档与索引一致性

~~~powershell
node projects/002-huashu-design/scripts/generate-reference.cjs
node --check projects/002-huashu-design/web/app.js
node --check projects/002-huashu-design/web/data.js
python scripts/projects.py render
python scripts/projects.py check
~~~

生成器从与页面相同的数据生成能力矩阵、风格案例、源码导航与任务示例。更新能力描述后需要重新生成这些参考文档。

## 尚未验证的上游能力

| 项目 | 状态 | 为什么不能声称已完成 |
| --- | --- | --- |
| 完整 Skill 生成任务 | 未运行 | 本次研究源码与机制，没有让该 Skill 执行真实设计项目 |
| PDF/PPTX 导出 | 未运行 | 有源码分析，没有最终文件与目标软件验证 |
| MP4/GIF/透明素材 | 未运行 | 没有端到端媒体产物验收 |
| HyperFrames/3D/shader | 未运行 | 属外部后端与适配能力 |
| TTS 与字幕对齐 | 未调用 | 未发送文本或使用用户凭据 |
| 云端 AI 看片 | 未调用 | 未上传视频，也不生成虚构评审结果 |
| 不同宿主/模型对照 | 未运行 | 不据作者分类判断不同宿主能力 |
| 性能、成本、质量提升 | 未测量 | 不把样例文字、作者经验或主观分数当作基准 |

## 更新与复测

上游提交改变时，重新取得文件树与相关源码，检查主文档和专项文档差异。要更换三个随附样例，先更新其许可和来源记录，再渲染截图。不要仅修改研究日期而保留旧版本证据。

[返回研究入口](../README.md)
