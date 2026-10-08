# 九种游戏形态补全

2026-10-04：新增九种可玩形态，当前 **60 种形态、69 个入口**。所有旧游戏和美术版本保留。新增内容改变动作、镜头和信息分工，不靠画面滤镜区分类型。

| 形态 / 试玩 | 已实现的核心差异 | 当前边界 |
| --- | --- | --- |
| [抓钩跑酷 · 风隙航渡](http://127.0.0.1:8962/showcase.html?play=hook#play) | 挂点、绳长约束、主动收绳、惯性释放、三个灯台、中途重试 | 侧面单屏峡谷，未做第三人称空间抓钩 |
| [错视空间 · 折光回廊](http://127.0.0.1:8962/showcase.html?play=fold#play) | 四组桥面、旋转镜头、实际投影重合判定、步行接路 | 三维坐标的 Canvas 等距软件投影，四个视角，一段路线 |
| [物件修复 · 时光修复铺](http://127.0.0.1:8962/showcase.html?play=repair#play) | 移盖清洁、拖放旋转、机芯与表盘分层安装、拆下顶层、测试后秒针走动 | 一枚怀表，近景二维材质与部件，没有多工具系统 |
| [地形挖掘 · 深层回声](http://127.0.0.1:8962/showcase.html?play=delve#play) | 玩家开凿实际洞道、晶矿收集、22 层深度、纵向镜头、底层信标 | 逐格移除地形，没有塌落、液体或连续重力角色 |
| [滚动吸附 · 收藏物语](http://127.0.0.1:8962/showcase.html?play=cluster#play) | 28 件物件、尺寸门槛、附着、体积增长、滚动和镜头拉远 | 俯视二维庭院，没有三维网格贴附和物件刚体碰撞 |
| [涂地切形 · 流彩工场](http://127.0.0.1:8962/showcase.html?play=paint#play) | 连续覆盖地面、对手重涂、颜料消耗、己方颜色潜行加速及恢复 | 75 秒、58% 目标，二维场地和一个巡游涂色对手 |
| [小队搬运 · 苔庭小队](http://127.0.0.1:8962/showcase.html?play=swarm#play) | 12 个独立队员、3/6/12 人分队、实际人数搬运、材料修桥、跨桥路线 | 三件材料、单队员类型，桥与河岸路线固定 |
| [订单服务 · 夜港晚餐](http://127.0.0.1:8962/showcase.html?play=kitchen#play) | 三份同时等待订单、四工位、三次切配、四秒烹调、手持和交付 | 单人、一道热汤配方，没有多人厨房或复杂组合菜式 |
| [信息合作 · 雾海协作台](http://127.0.0.1:8962/showcase.html?play=relay#play) | 操作端与说明端隔离、序号、线路、旋钮、脉冲、逐步核对 | 同设备交接或单人切换，固定装置序号，没有跨设备联机 |

## 并列比较

- [抓钩 × 错视空间](http://127.0.0.1:8962/forms.html?left=grappling&right=perspective-illusion#compare)
- [物件修复 × 地形挖掘](http://127.0.0.1:8962/forms.html?left=object-restoration&right=terrain-digging#compare)
- [滚动吸附 × 涂地切形](http://127.0.0.1:8962/forms.html?left=rolling-collection&right=ink-territory#compare)
- [小队搬运 × 订单服务](http://127.0.0.1:8962/forms.html?left=squad-following&right=service-workflow#compare)
- [信息合作 × 双人同屏机关](http://127.0.0.1:8962/forms.html?left=asymmetric-coop&right=co-op#compare)

## 美术与验证

九个专用场景和两套透明物件图集通过内置 ImageGen 原创生成，11 份原始 PNG、完整提示词及哈希保存在 `assets/game-forms/nine-generation-20261004.json`。错视桥面复用已有原创石灰石材质，源文件未修改。覆盖、吸附、部件、绳索、人物、货物和订单均由实际游戏状态驱动。

对新模块已做 74 项规则与工厂生命周期检查，包括九条正常操作完成路线、进度及完成存档恢复、失败锁定、三款原生按钮完整流程、指针的镜头坐标转换和单次挖掘键。27 张场景图调用实际生产工厂的 `draw()`，通过 Skia 离屏绘制，初始、进度、完成三组总览均已查看。修正了重复柱块、方格地形、涂色棋盘、完成大遮罩与河面穿行。

**展示验收尚未完成。** CUA 浏览器内核在初始化时因 Windows 沙箱 `setup refresh had errors` 退出。离屏绘图和 DOM 替身不能证明浏览器布局、窄屏、全屏、触控、键盘焦点和 localStorage 实机行为。素材、规则和构建检查通过后，也不能据此宣称产品验收全部达标。具体已验证与待验证项记录在 `nine-quality-review-20261004.json` 和 `nine-package-check-20261004.json`。

质量门槛保留：后续补做浏览器实玩、刷新续玩、390px 窄屏、桌面及窄屏全屏、按住/取消触控、键盘焦点与切换旧入口；有缺陷先修复，再认定展示验收通过。
