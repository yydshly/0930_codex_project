## 公开发布与完整入口

[研究首页](https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/) · [全景图](https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/understanding-map.html) · [理解汇总](https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/understanding.html)。首页目录连接五效果、四技能、三场景、马桶/耳机、两类模板和交付。

发布脚本 `scripts/soup_publish.py` 保留6个页面、运行资源、字体与许可、5支实际操作录屏，输出 `publication-manifest.json`。公开版不会连接访客本机模型服务；在线方案只在本机启用。相关研究按实际发布清单提供链接，尚未公开的记录标为本机研究。引导 PNG 沿用既有版本。

# 能力与价值实验室

[一图全景](understanding-map.html) 可以放大或下载 `assets/understanding-map.png`。图由已有实际截图和准确文字排版；可编辑内容源在 `../notes/understanding-map-source.html`，生成脚本为 `../tooling/build-understanding-map.mjs`，来源、裁切范围和布局检查记录在 `../notes/understanding-map-record.json`。

[理解与网页研究汇总](understanding.html) 整理产品化共识、当前能力、18 项研究入口与质量交付规划。内容源为 `../notes/understanding-summary.md`；修改后在仓库根运行 `node projects/011-combination-soup-studio/tooling/build-understanding-summary.mjs`，再执行静态站构建。生成脚本使用工作区内置 Node 依赖，也可通过 `SUMMARY_NODE_PACKAGE` 指定包含 marked 的依赖 package.json。

首页 `#product-cases` 和目标工作台均提供马桶、耳机的完整页与选型入口。`product-entry.css` 负责案例卡片及相关导航；完整页的回链只放在 `foundry/showroom.html`，不进入 iframe 原型与独立交付包。固定案例链接保留 `example=toilet/headphones`，需要直接构建预览时加 `step=preview`。

静态 HTML/CSS/ES modules，无需 npm 安装或打包。产品展示依赖项目本地提供的 MIT Three.js r160，使用浏览器 WebGL；无法使用 WebGL 时提供二维兼容预览。首屏为五个独立原站效果模块；后续为四类技能工作台、三个业务场景、官网能力、实现原理、价值对照与来源。

在仓库根目录执行 python scripts/build_site.py，然后 python -m http.server 8951 --bind 127.0.0.1 --directory _site，访问 http://127.0.0.1:8951/projects/011-combination-soup-studio/ 。

## 效果模块

汤碗视频直接从原站加载；四项效果采用选定原站图片、字体与绘制组件，分别适配为本地模块。详细理解、来源和划分见 [当前接入与验收](../notes/effect-correction.md)；[效果拆解](../notes/effects-breakdown.md) 保留第一版机制记录。

- effects-lab.js：模块选择、说明、直接入口、业务原型关联。
- effects/*.js：每项独立 mount/dispose；runtime.js 提供共同生命周期。
- effects.css：实验室布局；native-effects.css：选定原站组件的局部样式与响应适配。
- source-assets/：三张菜单照片、饼干贴图、地图标记、字体及来源 / 字体许可文本。
- index.html / style.css：研究页面与响应式。
- app.js：品牌、产品与庭院的业务状态、场景切换和本地文件导出；renderers.js：面积计算与庭院二维兼容画面。
- garden-renderer.js：参数化庭院三维几何、植物、水面反射、日夜灯光与观察状态；scene-materials.js：共享贴图、微纹理和环境；scene-showcase.css：三个场景的新版构图与响应布局。
- product-renderer.js / product-showcase.css：原创 ARC 桌灯的 WebGL 渲染、部件聚焦、相机操作与独立展示布局；vendor/three-r160.min.js 和 THREE-LICENSE.txt：本地第三方渲染库及 MIT 许可。
- ../tooling/verify-effects.mjs：效果模块浏览器验证。
- ../tooling/verify-layout.mjs：三档菜单、地图及饼干的实际布局验证。
- ../tooling/verify.mjs：已有场景回归验证。

直接入口参数为 ?effect=hero、menu、broth、delivery、fortune。切换模块释放动画与监听；减少动态偏好默认停用持续动画，保留即时操作。

共享站点路径支持跨项目入口；也可通过 HTTP 单独提供本目录。原站视频是唯一自动外部媒体依赖，加载失败有状态提示；其余渲染资源使用相对地址。

业务文件在本机生成；饼干只保存本机次数与提示索引。项目没有预约、支付、邮件、统计采集或数据库后端；空间图形和地图为概念演示。


## 20261002-2 体验修正

3/4/5 默认采用放大预览，说明可展开。refined-effects.css 负责完整局部构图；页面顶端可主动暂停/开启动效。系统减少动态偏好默认保留静态显示，用户可明确选择播放。

搅汤恢复时间归一化、三张配方卡、可接管的自动体验和本地8圈进度；可选手机倾斜由用户按钮触发。投送修正弧线裁切，按CSS像素限制包裹/标签的最小尺寸，手动目标立即反馈并优先追踪。饼干使用原照片贴图，开裂后保持打开以供观察。

verify-refinements.mjs 检查这些动作，record-refinements.mjs 录制当前真实浏览器效果。

## 20261002-3 技能与交付

`skills-lab.js` / `skills-lab.css` 实现 `#skills` 工作台，方向为 `story / explain / territory / reveal`，支持 `?skill=...#skills`。原效果的接入按钮会选择对应技能；技能中的机制按钮返回相应原效果。

工作台编辑的是交付计划，Markdown/JSON 下载记录当前任务、交付、结果、验收和待测收益。`app.js` 以 `business-scene-change` 发送事实快照，工作台按品牌/产品场景缓存最近结果。地区查询的显示与导出共用 `regionResult()`；普通提示采用内存中的三条顺序循环与计数。计划草稿、地区/内容状态和场景快照仅在当前页面保留。

品牌原型新增三款虚构茶选择 `#brand-tea`，`state.brand.tea` 与包装、页脚、事实 JSON、中文需求单同步。区域数据为明确标注的虚构示例；内容揭晓没有真实券或奖励接口。“业务接入计划”仍为计划范围。

项目内技能源在 `../skills/interactive-business-experience/`，不是浏览器代码生成器，也没有自动安装到全局。`../tooling/verify-skills.mjs` 验证实际输出、状态与响应布局，结果见 `../notes/skill-verification.json`。

## 20261002-4 产品解释与配置展示

[直接入口](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=broth&scene=product&revision=20261002-4#product-preview) 通过 `scene=product` 选择产品场景并定位舞台。ARC 桌灯为原创三维概念模型，采用真实 WebGL 曲面、PBR 材质、程序化环境与灯光阴影。可选择海湾蓝/日落橙/松石绿、细腻哑光/亮面涂层、棚拍/夜景，调整亮度与结构展开。四个观察视角和灯罩/扩散板/支柱/底座四个部件热点提供结构解释。

WebGL 模式支持指针拖动、方向键旋转，滚轮/双指及按钮缩放。`product-render-state` 和 `product-anchors` 分别同步观察状态与部件投影位置；`app.js` 把当前参数与观察状态写入事实 JSON，经 `business-scene-change` 进入技能计划。PNG 下载保留当前三维画面，中文需求单记录材质、环境和结构选择。切换到其他业务场景后，技能工作台保留最近产品快照。

`createProductRenderer()` 返回绘制、视角、聚焦、重置、观察状态和释放接口；隐藏舞台暂停持续渲染，释放时清理监听、Observer、几何、材质、纹理及渲染器。初始化无法使用 WebGL 时采用标明的二维兼容画面，保留选配、结构预览与导出，自由旋转/缩放及自动旋转不可用。

模型用于产品解释和配置记录，没有按真实产品尺寸、工业标准、实测材质或物理照明校准，也没有库存、报价或生产后端。理解与选配收益需真实用户测量。

本轮独立产品检查记录在 `../notes/product-showcase-verification.json`（50 项；当前为第六版回归记录），覆盖真实像素变化、操作、状态输出、文件下载与 390/768/1440 像素布局。视觉证据为 `../assets/qa/product-final-{hero/detail/structure}-{390/768/1440}.png`。这不替代最终独立视觉复查、全项目回归或真实手机性能测试。

## 20261002-5 三个场景的视觉与空间呈现

`scene=brand/product/garden` 均可直接进入对应场景，旧 `#product-preview` 等锚点会定位到当前可见场景。品牌的生成摄影在 `assets/tea-editorial-v5.webp`，文案、行动入口与包装文字保持 HTML 和业务状态同步。三种主题使用局部色调调整，持续动态默认遵循减少动态偏好。

产品的木纹、细腻涂层和金属细节由 WebGL 材质渲染；`studio-environment-v5.webp` 经 PMREM 提供 LDR 棚拍反射，初始化先用本地程序化环境。产品的视角、热点、展开、选配与 PNG/需求单/技能计划输出保持原契约。

`garden-renderer.js` 提供 `createGardenRenderer(canvas,getState)`，返回 `draw/setView/reset/getViewState/dispose` 及 `rendererType`。`garden-render-state` 同步三维或平面视角、缩放、旋转与水面状态。几何分区与 `gardenAreas()` 使用同一比例；方案 A 显示、面积、事实 JSON 与 PNG 指向同一查看对象。展示区保持固定高度，比较说明变化不会改变相机取景。WebGL 初始化失败时明确显示二维兼容平面，并停用不支持的三维和水面功能。

水面用顶点/法线动态和局部 CubeCamera 环境反射；反射只在结构、素材或灯光变化时重采样。停止水面后画面静止，隐藏或离开视口暂停持续绘制；释放时清理监听、Observer 和 GPU 资源。植物、木、石材质用于概念呈现，无现场施工或物理标定。

素材来源与最终提示词见 `../notes/scene-assets-v5.json`，实际画面见 `../assets/qa/v5/`。`../tooling/verify-business-scenes-v5.mjs` 检查真实像素、观察状态、面积、方案比较、下载、长文案、三种视口与无 WebGL 降级；原有产品、业务和技能检查继续回归。当前视觉复核见 `../notes/scene-visual-review-v5.md`，此前第四版结论属于历史记录。

## 20261002-6 可见室内与庭院近景

产品配置增加 `setting=interior/studio` 和 `reflections`。前者切换可见生成全景与棚拍，后者只控制环境材质反射，保留直接灯光。全景背景使用独立广角相机，和模型在同一 Canvas 中顺序渲染，PNG 因而包含当前背景。观察状态记录 `environmentReady/environmentFailed/backgroundSource`；加载失败明确回退棚拍，无 WebGL 时停用新增功能。

庭院 `setView()` 支持 `perspective/plan/water/plant`，近景仍可旋转、缩放、查看日夜并复位。叶片以带弯曲的透明贴图实例绘制。模型分区、面积与方案比较契约保持一致；原图展开不改变展示高度。`../tooling/verify-scene-refinements-v6.mjs` 核对新增功能，`verify-business-scenes-v6.mjs` 核对三场景回归；截图和录像分别在 `../assets/qa/v6/`、`../assets/business-scenes-v6.mp4`。

## 20261002-7 模型细节与视口外的交付

室内桌灯的展示台增加真实桌框和桌腿，主视角留出更多桌面。庭院改为渐细枝干和非对称叶簇，水池基础围绕盆体分区，池底下凹；细波纹使用可重复的法线纹理，叠加原有水面动态和反射。

`draw()` 在场景仍被选中时允许视口外的一次绘制，让手机用户滚到下方改参数或导出时得到当前画面。持续帧仍检查页面和舞台可见性，未选中的场景不绘制。视口外的产品插值直接到目标配置，避免导出旧展开状态。新检查为 `../tooling/verify-scene-refinements-v7.mjs`，包含真实离开视口后修改和 PNG 输出，另外重新跑产品与品牌/庭院回归。当前图片在 `../assets/qa/v7/`，录像为 `../assets/scene-polish-v7.mp4`。

## 20261002-8 场景质感与选择结果

当前水面由 `planar-water.js` 取代先前 CubeCamera 反射。镜像相机和斜裁剪平面支持透视与正交相机；反射坐标投射到真实水面几何，在物理材质最终输出前与扰动法线、Fresnel 和透明度组合。反射图只在相机、模型、灯光或素材变化时更新，波纹仍独立按可见性调度。公式适配 Three.js r160 MIT Reflector，文件中附来源与许可证依据。

`scene-decision.js` 根据当前业务参数计算结果。`facts().选择结果` 与可见结果区同源；庭院 `comparison` 独立记录 A、当前方案及当前相对 A 的面积差值。查看 A 不覆盖当前编辑参数。需求单同时写入查看对象与两套方案，以免交接时混淆。导出入口移动到结果区；保留原按钮 ID、点击、下载及兼容模式契约。

窄屏所有画面和结果固定到同一 Grid 列，分离视角与缩放按钮。验证实际按钮命中、画面使用完整容器宽度、当前 PNG、两套参数及面积差值；不只检查有无横向滚动。报告和画面在 `../notes/*v8-verification.json`、`../assets/qa/v8/`。
