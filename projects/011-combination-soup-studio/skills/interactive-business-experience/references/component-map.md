# 本项目参考组件与事实边界

路径以 `projects/011-combination-soup-studio/` 为基准。五个研究效果是可运行的拆分实现，挂载 API 只接受 `reduced` 和 `onState`，尚未提供统一的品牌/内容/区域配置入口。移植到业务页面时先抽取这些配置，再改造所需组件；下文 ARC 产品渲染器采用独立接口。

| 研究项 | 文件与直接演示 | 实际实现 | 可借用的机制及迁移条件 |
| --- | --- | --- | --- |
| 01 热碗与蒸汽 | `web/effects/hero-atmosphere.js`；[热碗](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=hero#original-effects) | 原站预渲染视频直连，叠加本地 Canvas 蒸汽粒子与指针风力 | 活动/产品氛围层；换成自有视频或静态素材，保留明确行动入口和媒体错误状态 |
| 02 旋转菜单 | `web/effects/rotating-menu.js`；[菜单](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=menu#original-effects) | 三张原站照片、CSS 转盘、滚动进度同步套餐文案；套餐与素材在模块内固定 | 多方案聚焦和对比；抽取产品数据、图片和动作，选项数变化需要重新计算角度与区间 |
| 03 搅汤 | `web/effects/broth-engine.js`；[搅汤](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=broth#original-effects) | 原站 Canvas 2D 点云绘制核心：数学透视、汤面倾斜、粒子溢出；本地自动演示、8 圈挑战与可选设备方向控制 | 参数变化→即时可见反馈；需要真实产品关系时先建立并校准规则，不能把视觉近似当流体仿真或真实温度/RPM |
| 04 地图 | `web/effects/delivery-map.js`、`web/effects/map-data.js`；[地图](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=delivery#original-effects) | 原站澳大利亚二维 Canvas 点阵和城市坐标，包裹按时间插值飞行；本地目标/落地反馈 | 区域叙事或定位反馈；当前计数只是演示投送次数。区域查询需要替换真实坐标/范围规则，并增加搜索、结果列表与无法判定状态 |
| 05 饼干 | `web/effects/fortune-cookie.js`；[饼干](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=fortune#original-effects) | 原站静态照片分成两半，CSS 开裂与纸条展开；本地提示洗牌、打开次数 localStorage | 点击揭晓与小任务奖励；可换自有礼盒/卡片视觉。提示随机及本地次数不能作为真实中奖概率、奖励发放或兑换资格 |

## 生命周期与页面接入

五个模块均导出以下接口：

```js
const instance = effect.mount(host, {
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  onState(state) { /* 展示当前状态，业务移植时转换为自己的字段 */ }
});
// 切换、卸载或离开页面前：
instance.dispose();
host.replaceChildren();
```

`web/effects-lab.js` 负责选择、状态说明、暂停/播放和页面生命周期；`web/effects/runtime.js` 共享监听清理、视口检测、动画循环、超时清理与 Canvas 尺寸。模块另行清理 ResizeObserver、视频、逐字动画或设备方向监听。不要只移除 DOM 而保留旧循环。

模块样式依赖 `web/effects.css`、`web/native-effects.css`、`web/refined-effects.css`；原站图片、字体及声明在 `web/source-assets/`。移植时只带必要样式，并防止固定 DOM id 在多实例间冲突。路径需要按宿主页面调整。

## 已有原创业务原型

[业务场景入口](http://127.0.0.1:8951/projects/011-combination-soup-studio/#scenes) 的三个按钮在同一页面切换。`scene=brand/product/garden` 直接选择场景，`#scenes` 定位入口；页面按钮也可切换。

| 场景链接 | 现已实现 | 当前界限 |
| --- | --- | --- |
| [品牌活动 / 山野茶社](http://127.0.0.1:8951/projects/011-combination-soup-studio/?scene=brand&revision=20261002-6#scenes) | 原创生成的茶具摄影、HTML 包装文字；品牌名、活动标题、行动文案、配色和动效可编辑；`#brand-tea` 选择虚构春芽绿茶/焙香乌龙/蜜香红茶，与图文、事实 JSON、中文需求单和技能计划同步；需求单 Markdown 与当前参数 JSON 导出 | 虚构业务。本地生成，没有真实活动日期/地点校验、预约发送或转化数据 |
| [产品解释 / ARC 模块桌灯](http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=broth&scene=product&revision=20261002-6#scenes) | 原创概念模型的真实 WebGL 曲面与 PBR 材质；三色/两材质、室内全景/棚拍、日光/夜景、反射开关、原图查看、四视角、四部件热点、结构展开、旋转/缩放、亮度；配置与观察状态进入需求单、JSON、PNG 和技能计划 | 未做实物尺寸、工业标准或物理材质/照明标定，未采用实物照片；没有库存、支付或生产后端。二维兼容回退保留选配与导出，不支持自由旋转/缩放 |
| [空间方案 / 庭院评审](http://127.0.0.1:8951/projects/011-combination-soup-studio/?scene=garden&revision=20261002-6#scenes) | 参数化三维庭院、尺度、区域比例、优先级、日夜、实时水面、三维/正交平面/水景/植物近景视角、旋转/缩放、面积计算、保存方案 A 与当前方案比较；需求单、JSON、PNG 导出 | 未现场测量或施工校准，缺少预算、造价和施工方案 |

实现文件：`web/app.js` 管理业务状态与导出，`web/garden-renderer.js` 渲染庭院，`web/renderers.js` 提供面积计算与二维兼容画面；`web/scene-materials.js` 和 `web/scene-showcase.css` 提供选定材质与新版构图；`web/product-renderer.js`、`web/product-showcase.css` 负责 ARC 产品渲染与独立布局。三项是本项目自建的虚构业务示例。产品使用本地 MIT 渲染库 `web/vendor/three-r160.min.js`，许可见 `web/vendor/THREE-LICENSE.txt`；模型几何与交互为本项目原创概念实现，不来自原站汤碗或饼干。

产品接口：`createProductRenderer(canvas,getState)` 返回 `draw/setView/focus/reset/getViewState/dispose` 与 `rendererType`。`product-render-state` 同步观察视角、缩放和聚焦部件，`product-anchors` 同步热点坐标。宿主负责控制输入与事实记录，隐藏舞台停止持续渲染，离开时调用 `dispose()` 清理 GPU 资源、监听及 Observer。四个预设为 `hero/front/detail/structure`；四部件为 `shade/diffuser/stem/base`。自由操作和完整四视角属于 WebGL 模式，二维回退须按当前能力降级，不冒充三维交互。

## 技能工作台与新增本地示例

`web/skills-lab.js`、`web/skills-lab.css` 和 `web/index.html` 的 `#skills` 构成技能工作台。工作台展示任务路由与交付约定，可编辑项目名称和用户任务，预览或下载 Markdown 计划与 JSON 契约。选择 `prototype` 表示原型范围；`integration` 只追加业务接口约定、错误/成功状态与待接入清单，不能表示接口已经接通。

| 技能方向与入口 | 当前实际行为 | 范围 |
| --- | --- | --- |
| [品牌叙事与选型 / story](http://127.0.0.1:8951/projects/011-combination-soup-studio/?skill=story#skills) | 联动 `#tab-brand`；读取已选品牌场景的当前事实与参数，进入交付计划 | 已有品牌内容与主题编辑。三款真实产品的套餐比较还需按客户选项适配 |
| [操作式产品解释 / explain](http://127.0.0.1:8951/projects/011-combination-soup-studio/?skill=explain#skills) | 联动 `#tab-product`；读取 ARC 桌灯配置与观察状态，进入交付计划；可输出当前真实 WebGL PNG 和需求单 | 已有材质、展示环境、视角、配色、展开与亮度等参数；真实产品几何、校准数据和业务规则需替换 |
| [区域服务查询 / territory](http://127.0.0.1:8951/projects/011-combination-soup-studio/?skill=territory#skills) | 地区与服务下拉选择，实时展示覆盖反馈；`regionResult()` 同时提供显示和导出结果 | **虚构本地数据**：杭州有庭院改造和日常维护；宁波有改造、维护未覆盖；上海两项均未覆盖。尚未把原站澳大利亚地图改为这些地区的业务地图 |
| [内容揭晓与任务反馈 / reveal](http://127.0.0.1:8951/projects/011-combination-soup-studio/?skill=reveal#skills) | 三条普通知识提示按顺序循环，显示内容与下一步；内存计数与重置；结果进入导出 | 普通提示，不是真实券、抽奖、随机中奖或奖励核销。刷新页面不保留计数 |

品牌/产品桥接：`web/app.js` 的 `updateFacts()` 更新 `#facts-preview` 并派发 `business-scene-change`；工作台的 `rememberScene()` 按事件 detail 把各场景的最近快照保存到 `businessSnapshots` Map，`sceneSnapshot()` 还会读取当前节点补充缓存。导出按技能关联的 `brand/product` 取最近配置，切换到别的业务场景后也保留该结果；若该场景尚无快照，则显示进入关联场景的提示。缓存只在本次页面会话中存在，刷新后重建。修改项目名或用户任务只更新交付计划，不会自动替换旧场景的品牌文案或产品模型。

导出命名为 `skill-{方向}-delivery.md` 与 `skill-{方向}-contract.json`。工作台契约的 `schemaVersion` 为 `1.0`，`skill` 为 `interactive-business-experience`，`mode` 为上述方向 key。契约包含项目、用户任务、计划范围、交付物、当前业务示例结果、实现证据、功能验收与待测价值指标。它记录一次交付任务，不能直接作为五个效果模块的挂载配置，也不是自动生成新客户页面的组件 SDK。

## 来源、检查与扩展边界

来源为 [Combination Soup Studio](https://combinationsoupstudio.com.au/)，原资产与选定绘制组件权利保留给相应权利人。`web/source-assets/SOURCE-NOTICE.txt` 记录组件研究范围，字体另附 OFL 文本；未确认网站的开源仓库或可复用许可。

已有检查可按改动选择：`tooling/verify-effects.mjs`（效果行为）、`tooling/verify-layout.mjs`（布局）、`tooling/verify-refinements.mjs`（动态图与反馈）、`tooling/verify.mjs`（三项业务场景与导出）。产品本轮独立检查见 `notes/product-showcase-verification.json`，记录 50 项真实画面、操作、状态、导出与响应布局检查；视觉证据为 `assets/qa/product-final-{hero/detail/structure}-{390/768/1440}.png`。这些检查针对当前示例，不能当作新业务页面的通用验收器。历史通过记录不等于移植后通过，也不证明商业收益。

本项目已运行本地虚构区域查询和普通内容揭晓；没有业务后端、数据库、真实预约、奖励发放、支付或统计采集。手机方向事件目前只有模拟验证；需要真实设备测试才能说明实机效果。当前预览端口为 8951；技能包不会自动启动服务器、改变环境或自行发布。

第五版的三场景素材、视觉与空间核对见 `notes/scene-assets-v5.json`、`notes/scene-visual-review-v5.md` 和 `notes/business-scenes-v5-verification.json`。庭院接口为 `createGardenRenderer(canvas,getState)`，返回 `draw/setView/reset/getViewState/dispose` 与 `rendererType`；宿主保留编辑参数和查看对象，按查看中的方案导出画面与面积。选定 007 自有生成贴图只用于材质，没有复制它的整站或几何。新客户任务须以自身素材和规则适配，并重新验证。

第六版可见素材接入见 `notes/scene-visual-review-v6.md` 与 `notes/scene-refinements-v6-verification.json`。产品的 `setting/reflections` 和 `environmentReady/environmentFailed/backgroundSource` 进入业务快照及技能计划；全景为生成的 LDR 背景，不是可行走房间几何。庭院近景使用同一模型，复位返回默认观察状态。新客户任务应按实际素材和观察目标重新取景。
