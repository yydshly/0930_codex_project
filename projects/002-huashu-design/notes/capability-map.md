# 一图总览：能力、原理、场景与扩展

整理日期：2026-09-30。固定研究提交：0830494ecb1c117e25b313a8114fe55a6bf2b125。

- [网页放大阅读](../web/capability-map.html)：缩放、章节定位与下载。
- [高清 PNG](../web/images/huashu-capability-map.png)：3600 × 5550，可用于分享与插入材料。
- [矢量 SVG](../web/images/huashu-capability-map.svg)：2400 × 3700 画布，无损放大；直接打开 SVG 可选择文字。

图内按实现链路、四组十六项能力、六类交付、六类使用场景、七层扩展、验证边界排列。16 项与分组是本研究归纳，并非上游正式数量声明。未来场景与扩展建议不代表现成平台功能。实测标记限于本次具体组件和产物，不推及完整 Skill 工作流。

内容依据：[理解笔记](understanding.md)、[能力矩阵](capability-matrix.md)、[真实场景](real-case.md)、[导出指南](export-guide.md)、[扩展指南](extension-guide.md)、[源码索引](source-map.md)。

生成：在项目根目录运行 `node scripts/build-capability-map.cjs` 得到 SVG。PNG 使用已安装 Chrome 渲染同一 SVG，视口 2400 × 3700，设备缩放 1.5；等待字体就绪后截图。若更改内容，须同步重新渲染 PNG，并检查全部章节。

验证：逐区目视检查六部分；浏览器测量 SVG 文字边界无超宽、越界；网页桌面与手机尺寸、缩放、章节定位、入口与下载链接共 15 项检查通过，见 [检查记录](capability-map-checks.json)。本轮不改动已有 PDF、PPTX 或 MP4 文件。
