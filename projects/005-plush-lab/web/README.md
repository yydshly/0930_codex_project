# 毛绒实验室网页

毛绒实验室把形象创作、场景互动、陪伴记录与图形研究组织为一组网页工作台。[公开项目全景](https://yydshly.github.io/0930_codex_project/projects/005-plush-lab/web/project.html)提供总图、背景、使用步骤、原作实时预览、全部阶段与记录；详细能力、实现原理与边界见[项目文档](../README.md)和[完整理解](../notes/public-understanding.md)。当前说明复核于 2026-10-08，这个日期不表示新增了 AI 或毛发功能。

## 全部入口

| 页面 | 使用内容 | 源码 / 打包文件 |
| --- | --- | --- |
| [项目全景](project.html) | 引导图、目标效果、方法、已有能力、完整记录与方向 | `../src/project-overview.js` → `project.js` |
| [绒毛创作](index.html) | 程序纤维、八种形状与材质、局部剪染卷梳恢复、组合步骤、草稿、收藏与配方 | `../src/main.js` → `app.js` |
| [小世界](world.html) | 种子搭配与锁定、着装、家具布置、行走、坐下、球的衰减弹跳与拾回 | `../src/world-main.js` → `world.js` |
| [陪伴工作室](studio.html) | 本机笔记、页面提醒、回忆、成长、固定任务展示 | `../src/companion-studio.js` → `studio.js` |
| [高斯展示台](splat.html) | 程序高斯、受限 PLY 交换与完整原作 | `../src/splat-main.js` → `splat.js` |
| [原作毛绒展台](reference-plush.html) | 历史官方在线查看入口，保留署名和许可 | 官方 Embed，依赖网络与原站 |
| [工程材料说明](engineering.html) | 本机工程保留范围与公网参数、脚本、样片、日志 | 静态说明页面 |

另有四个保留资料页面：[Cycles 毛料与完整角色](../artifacts/cycles-material-study.html)、[参考效果对照](../artifacts/reference-comparison.html)、[小世界页面审查](../artifacts/world-page-audit-20261003/report.html)、[原作来源说明](../artifacts/source-viewer-public.html)。这些入口也汇总到项目全景，不用逐个猜地址。

## 目标毛绒与原有创作

绒毛创作、小世界和展示台均可选择「蓝绒星仔」；相应直达地址为 `index.html?plushView=reference`、`world.html?plushView=reference`、`splat.html?plushView=reference`。完整 Felipe 由 abstrakt 制作，以 CC BY 4.0 发布；本项目保留六块 SOG、3,493,379 个高斯与 SH3，并用 Spark 接入同一 Three.js 场景。来源与许可见[资产清单](assets/reference-plush/manifest.json)。

原作支持整体运动、色调、大小、PNG、相对毛长、附加卷曲和连续梳理，属于显示层近似编辑；暂不支持局部剪染、换装、真实毛根与逐根动力学。程序角色继续使用原来的完整创作工具。原作场景灯光不会重新计算纤维散射，完整资产约 66.9 MB，首次加载和显存成本仍需要设备评估。

局部创作把近期笔触合并进无损表面场检查点，512 是近期缓存阈值，合并后可继续；组合步骤可以将多个工具操作记为一步，最近 24 步支持撤销。此前作品、草稿、收藏、配方和历史实验继续保留。

## 陪伴和任务的真实范围

笔记可编辑、搜索及导出；提醒在页面运行期间检查，恢复到前台时补查，关页后没有后台推送。共同回忆和成长来自实际互动与记录事件，离开页面不会扣减成长。本机记录按浏览器来源独立保存，没有账号或云同步；陪伴 JSON / Markdown 可导出，恢复导入尚未实现。

Agent 面板运行「整理我的笔记」「检查提醒安排」「生成工作室概览」三个固定本地任务，展示实际步骤、工具事件与结果快照；可逐步继续、暂停停止和编辑草稿，结果不自动应用。执行器为 `../src/studio-agent.js`，面板为 `../src/studio-agent-panel.js`。**真实外部 AI 尚未启用**，本地接口明确返回待接入状态，没有模拟模型回复；见[接口说明](../server/README.md)。

## 运行、构建与部署结构

使用 HTTP 静态服务打开页面，不能用 `file://` 加载模块和资产。从仓库根目录运行：

```powershell
python -m http.server 8875 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8875/projects/005-plush-lab/web/project.html`。需要现代浏览器、WebGL 与硬件加速。本地打包文件和资源使用相对路径，公网保留 `/projects/005-plush-lab/web/` 原结构，支持仓库子路径部署。独立原作查看页及陪伴工作室的历史官方查看器仍需网络。Three.js、Spark 许可证与原作来源信息须随网页保留。

JavaScript 源码在 `../src/`，HTML 与 CSS 在本目录维护。修改 JavaScript 后，在 `../tooling/` 执行：

```powershell
npm ci
npm run build
```

54 个大型 `.blend` 工程约 3.6 GB 在本机完整保留，公网提供参数、脚本、样片与日志；真实工程文件不随静态站点发布。公开说明页不能当作 `.blend` 下载。历史文件位置与公开材料范围见[工程说明](engineering.html)。

**数据迁移：**localhost、127.0.0.1 与公网地址各有独立浏览器存储。发布不会删除本地数据，也不会自动把它们搬到公网；继续打开原来源可读取旧作品。用各模块已支持的配方、作品导入或项目记录合并导入迁移对应数据，陪伴记录现阶段只支持导出。

## 研究与下一步

程序高斯展台研究三维协方差投影、高斯透明合成与二维 Mip 过滤；支持未压缩标准 3DGS PLY，最多 12 万高斯、32 MiB，当前读取常数颜色，高阶球谐检查后不用于该分支。完整原作使用独立 Spark / SOG 管线，两者容量和表示不同，没有本项目的照片训练器。

层壳、FTL 与湿毛外观采用范围、Blender / Cycles 离线成果、自制外观仍未获认可的结论，见[研究理解](../notes/gaussian-splatting.md)、[方法选型](../notes/plush-method-selection.md)、[Cycles 记录](../notes/cycles-material-study.md)。页面审查问题、原作语义分区和柔软形变、真实 AI 草稿、长期故事、多角色与性能管理仍是后续方向。历史验证只证明对应轮次，不等于本次发布复核了全部历史功能。
