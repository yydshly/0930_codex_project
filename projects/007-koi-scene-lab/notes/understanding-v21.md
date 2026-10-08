# v21 · 原作、底层技术与个人价值

用户要求暂不实施照片一致性或实物落地，把讨论整理进网页并生成一张图片。本轮交付是静态说明与总览图；互动场景继续使用 v20 构建 `fbd61419d326470cdd2a69f4f44bf06fad42c4faa8020e478b1f3f9fd0046b36`。

## 交付

- [原理与价值网页](../web/index.html#tech)：原作截图与体验入口 → 八项效果和算法对应 → 当前能力区别 → 用户价值 → 可扩展方向 → 单张照片与实物交付边界。
- [高清总览图](../web/assets/library-value-map-v21.png)：2560×3885 PNG；[可编辑图稿](../web/assets/library-value-map-v21.html)。页面可展开预览和下载。
- [生成脚本](../tooling/build-understanding-v21.py)共用网页与图稿文案；[渲染脚本](../tooling/render-understanding-v21.mjs)使用本地 HTML/CSS 生成 PNG 并记录尺寸和散列。

图中的原作图片来自 [原作运行截图](../assets/original.png)，当前扩展图片来自 [v20 实际场景截图](../assets/overview-courtyard-v20.png)。两张原图按字节复制到网页资源目录，仅在排版中裁切显示。总览图是排版合成图，不能当作新拍的运行截图或性能证据。

## 整理的理解

原作基于 Three.js r160、WebGL、GLSL、JavaScript 与 Web Audio。程序化庭院、GPU 波场、水的光学近似、锦鲤形体形变、Boids 群游、SDF 手网格、生态状态机、渲染后处理与声音合成共同产生实时体验；场景运行不依赖机器学习模型。

八项说明逐项列出“看到什么、怎样计算、可迁移什么”。原作的 256² 波场、鱼群实例化、SDF 手与四种天气预设，和当前 128² 波场、独立鱼绘制、WebXR 来源手网格及三种布光，分别注明。原作抚摸的驯服机制与当前“警觉 → 惊散 → 恢复”也分别注明。

可复用模型拆成形体、材质、动作、行为、环境约束、用户互动六层。换鱼的花纹可复用鱼群规则；换庭院需要重新校准并标记水域；换动物需要适配骨骼、步态和导航。导入 GLB 不会自动赋予任意模型行为。

对用户的价值包括保存老家记忆、预演改造、构造个性化体验、形成可检查的交付作品。未来方向包括照片到参数化老家、数字老家到纪念摆件、可拼装套件与真实庭院改造，以及照片、确认方案、实物之间的核验。差异化仍需真实用户和样品验证。

单张照片可作为近似外观参考，背面、遮挡和深度需要补充信息。多图扫描网格也不自动等于可编辑建筑组件。现有网页尚无照片自动重建、制造级 STL/3MF 输出或实物交付能力；一致性流程本轮只说明，没有接入。

## 来源与范围

原作固定于 [souranyp-stack/koi-pond-garden](https://github.com/souranyp-stack/koi-pond-garden/tree/18213ec590e987f605cce6564471e6c0f9451d37)，MIT © Sourany Phomhome；[锁定清单](upstream-lock.json)保留九个文件。页面技术内容按本地固定源码与当前 src/ 核对；运行副本只替换两个依赖地址。

扩展说明参考以下已核对的第一方资料；这些是行业参照，不表示本项目已接入其服务或能力。

- [COLMAP 教程](https://colmap.github.io/tutorial)：多视角输入与重建条件。
- [Formlabs 建筑模型说明](https://formlabs.com/blog/3d-printing-architectural-models/)：缩尺、细节、结构与制造处理。
- [Houzz Pro 可视化](https://pro.houzz.com/for-pros/visualization-tool)：空间设计与方案预览已有产品参照。
- [Clear Cut Custom Lab](https://clearcutcustomlab.com/)：照片与图纸定制房屋模型已有服务参照。

## 本轮验收

278项自动检查通过。10项原生网页检查覆盖技术页打开、内容、实际图片、桌面和390px手机布局、键盘展开、高清图展开、真实下载与错误监测。下载文件与发布 PNG 的 SHA-256 相同。

三张原生网页截图与最终总览图已人工查看。静态包校验覆盖九个上游锁定文件、运行副本、20个本地 HTML 引用与27个发布文件。原作和三维场景交互流程本轮未重跑；既有验收保留自己的版本归属。未测真实硬件性能或完成照片级外观验收。

完整记录：[v21汇总](v21-validation-summary.json)、[网页检查](understanding-native-v21.json)、[自动检查](numerical-v21-result.json)、[渲染记录](understanding-render-v21.json)、[静态包检查](algorithm-v21-package-validation.json)、[图片清单](v21-capture-manifest.json)。本轮没有提交、推送或归档。
