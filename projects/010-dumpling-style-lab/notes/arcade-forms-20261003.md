# 游戏形态扩展：清版格斗、纵向飞行射击、三维竞速

本轮按确认的三个方向追加实际可操作的短试玩，围绕人物动作、镜头、场面组织和反馈制作。原有九款、十三个已有扩展试玩、旅店美术画风及独立原画快照保留。展厅现有 25 个入口，对照页接入 16 种形态，待制作区剩余 9 种。

## 新增试玩

| 名称 | 游戏形式 | 实际内容 |
| --- | --- | --- |
| 夜港清场 `brawler` | 带街道纵深的清版格斗 | 三段街道、七名对手；前后走位、直拳/勾拳/踢击三段连击、跳击、闪避、抓取投掷、敌人重拳预兆、击退、短暂停顿和当前街段重试 |
| 群岛航线 `skyline` | 竖向滚屏飞行射击 | 八轮编队、驾驶倾斜、机体中心受击点、双路/三路火力、补给、清除弹道的冲击波、大型守关机和当前航段重试 |
| 海岸疾驰 `coast` | 真实三维竞速 | 1.80 公里有弯道及缓坡的海岸赛段、四辆同行车、加速/刹车/转向、能量加速、实际车辆碰撞、超越记录、离路减速、赛段标记与车后/车头镜头 |

[格斗 × 飞行并列试玩](http://127.0.0.1:8962/forms.html?left=beat-em-up&right=vertical-shooter#compare) · [三维竞速 × 格斗](http://127.0.0.1:8962/forms.html?left=racing&right=beat-em-up#compare)

这三个方向使用不同的操作与空间表现。格斗以路面纵深、近身动作和清场推进呈现；飞行以竖向航路、编队和弹道呈现；竞速以立体道路、跟随镜头、车辆速度和超越呈现。

## 素材、源码及来源

- 四张原创源图通过内置 ImageGen 技能生成：夜港街道、十二个人物动作、群岛航路、八个飞机/补给/云层素材。透明图集保留原有 alpha，按完整连通轮廓裁切、缩放和压缩，没有重绘或替换既有素材。完整提示词及原始输出见 `assets/game-forms/arcade-generation-20261003.json`，项目内原图保存在 `assets/game-forms/arcade-sources/`。
- 竞速车辆、赛道设施来自 [Kenney Racing Kit](https://kenney.nl/assets/racing-kit)，许可证为 CC0；原始 ZIP、运行模型、许可证和资源清单保存在项目中。海岸棕榈、松树与岩石复用此前导入的 Kenney Nature Kit。道路采用真实三维曲面几何，具备透视、阴影、弯道、缓坡和实时追踪镜头。
- 参考 [Final Fight](https://us-store.captown.capcom.com/products/1340551-us)、[1942](https://news.capcomusa.com/2021/05/25/capcom-arcade-stadium-is-available-now-for-playstation-4-xbox-one-nintendo-switch-and-steam/) 和 [Out Run](https://segaages.sega.com/project/out-run/index.htm) 的游戏类型；运行素材为原创或 CC0 资源。
- 主要源码：`web/showcase-brawler.js`、`web/showcase-flight.js`、`web/showcase-racing.js`、`web/showcase-arcade.css`。展厅与形态目录追加三个独立入口，既有入口标识不变。
- 新增独立存档为 `dumpling-showcase-v1-brawler`、`dumpling-showcase-v1-skyline`、`dumpling-showcase-v1-coast`，沿用完成记录、暂停、重开、全屏和声音操作。三款完成后均可直接重玩，完成记录保留。手机方向键与动作按钮接入。引擎声根据速度合成，格斗/拾取/成功等复用原音效系统。

## 验证与当前范围

浏览器验证脚本 `tooling/check-arcade-forms.cjs` 使用真实 UI 与键盘，不注入完成状态；检查三款实际操作、过关、进度恢复、十六个形态入口、九个待制作条目、390 像素布局，以及 QA 隔离。结果写入 `notes/arcade-forms-check-20261003.json`，截图保存于 `assets/game-forms/arcade-qa/`。公共展示缩略图采用实际运行截图。

原有规则与路径检查使用 `tooling/check-world-rules.mjs`，既有资源按 `notes/style-preservation-20261003.json` 的 SHA256 校验。既有形态与并列暂停回归使用 `tooling/check-game-forms.cjs`。

当前交付是三款可玩的短试玩。格斗动作仍采用有限的关键姿态，街道以一张原画延展；飞行使用一条群岛航路；竞速采用风格化模型与街机驾驶规则。完整长篇、多人联机、更多场景和商业级动画制作尚未完成。
