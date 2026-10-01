# Huashu Design 能力研究室

本研究项目的本地交互展示。浏览已交付页面无需安装依赖、API Key、后端或付费调用。真实场景的设备框和动画使用随附 React；重新构建和导出需要开发依赖，见 ../notes/real-case.md。

## 启动

从研究仓库根目录执行：

~~~powershell
python -m http.server 8766 --bind 127.0.0.1 --directory projects/002-huashu-design
~~~

打开 http://127.0.0.1:8766/web/。也可直接打开 index.html，推荐 HTTP 以减少浏览器本地文件限制。

## 功能

- capability-map.html：上面生成的能力全景图，支持缩放、章节定位、高清 PNG 与 SVG 下载。
- 首页新增六个问题的理解汇总，说明能力、产物、场景、原理、扩展与个人意义。

- cases/research-desk/：完整真实场景展厅、原型、手机框、幻灯片、PDF、PPTX、时间轴与 MP4。
- 展厅包含“我们的理解”、交付完成度对照、采用与扩展顺序，以及按用途选择成果的交互入口。
- cases/research-desk/reader.html：本地 PDF/PPT 只读翻页器，支持页码、缩略图、键盘与放大，保留原文件入口。PDF 预览来源是实际 PDF 逐页渲染；PPT 预览来源是 PPTX 独立导入渲染。
- 9 个可直接链接的 hash 章节。
- 16 项能力搜索/分组筛选与详情。
- 6 个教学实验，调参偏好在当前浏览器保存。
- 3 个固定版本上游封面、本地截图和作者公开案例入口。
- 60 个风格配方按媒介、气质、关键词筛选。
- 导出路线选择、格式表、扩展建议和任务说明复制。
- 191 个上游文件及已阅读范围索引，链接固定到版本。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| index.html | 页面章节与语义结构 |
| styles.css | 响应式布局、视觉与焦点样式 |
| app.js | 路由、筛选、对话框和六个实验 |
| data.js | 原创能力摘要、工作流、路线与建议 |
| inventory.js | 固定版本上游文件与风格索引 |
| reference.html | 从 Markdown 自动生成的完整可浏览研究手册，包含上游许可全文 |
| verification.json | 可携带的本地检查结果副本 |
| images/ | 三个原样例的本地渲染截图 |
| upstream/ | 三个封面原始 HTML 与 MIT 许可 |

修改 data.js 后运行 ../scripts/generate-reference.cjs，同步 Markdown 参考资料。inventory.js 和 notes/upstream-inventory.json 是同一份来源快照；更新上游版本时两者需一并更新。

## 证据边界

教学实验是本站原创简化解释，上游封面是预制样例复现。新增真实场景使用本次原创内容，实际运行指定上游组件与 PDF/PPTX/MP4 导出脚本，兼容修改见 vendor/adaptations.json，检查见 validation.json。完整 Skill 生成流程和云服务未实测。

首页无需网络。原样例 HTML 为保留上游原文仍含字体链接，外部仓库/公开案例也需网络。截图已包含在本地，不依赖远程加载。

## 验证

从仓库根运行 python projects/002-huashu-design/scripts/check_demo.py。环境要求及结果见 [复现记录](../notes/reproduction.md)。

## 在线部署

已发布至 [GitHub Pages](https://yydshly.github.io/0930_codex_project/projects/002-huashu-design/)，使用仓库统一的 Pages 工作流。2026-10-01 公网 40 项检查通过：主页面、全景图、全部 PDF/PPT 预览页、成果下载、手机布局和图像缩放；PDF/PPTX/MP4 与本地原件的 SHA-256 一致。

页面使用相对资源与 hash 章节，可适配子路径。部署保留 images/、upstream/、reference.html 和 cases/ 下的预览、下载文件、组件及许可证。检查与上游许可全文包含在 reference.html。

[返回研究入口](../README.md)
