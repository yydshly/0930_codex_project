# 九种游戏形态扩展 · 2026-10-04

本批按时间、材料、身体、规则、画框、照片、指令、声音和真实玩家九种操作对象扩展。当前 69 种形态、78 个入口。原有九款、既有六十种形态、美术版本和原存档路由保留。

| 形态 | 作品 / 路由 | 首版实际操作 | 当前范围 |
| --- | --- | --- | --- |
| 时间操控 | 静时之庭 / tempo | 移动幅度改变环境时间倍率，观察脉冲、激活三座信标、返回起点 | 原创俯视建筑短场景，停下为 3.5% 速度 |
| 材料模拟 | 元素玻璃舱 / flux | 拖动投放沙、水、木材、火；观察流动、燃烧、灭火与蒸汽 | 96×56 简化元胞场，不是科学流体模拟 |
| 异形身体 | 盘鳞浮庭 / coil | 转向前进、绕柱积累支撑、抬高头部取环、松开下落 | Three.js 三维、28 节身体与柱体避碰；简化约束而非完整软体动力学 |
| 规则改写 | 字石航灯 / axiom | 移动 STOP/PUSH 词块改变岩石属性，实际推动岩石抵达航灯 | 横纵三词规则；词块用按钮移动，人物单独移动 |
| 画框解谜 | 四页光旅 / folio | 拖动或按钮交换画框，放大圆门，连接后光点实际跨框移动 | 四幅原创画作、三段旅程，限定门连接条件 |
| 摄影造景 | 取景造境 / expose | 实际取景存入照片缩略图，放置后增加桥面，走过新通路 | 第一人称 Three.js；两张限定建筑模板，并非任意图像重建三维 |
| 指令编排 | 指令邮局 / script | 添加重排删除指令、单步、运行、复位、循环绕路送信 | 七种指令、24 条上限、500 步保护、三封邮件 |
| 声音探索 | 听见雾港 / echo | HRTF 声标、转身听方向、距离衰减、脚步、左右校准 | 三段声标路线、可选训练地图；声音需要用户开始或点击声音 |
| 社交推理 | 深蓝议会 / assembly | 建房加入、身份私密、旋钮任务、伪装任务、机房破坏修复、限时讨论投票 | 本机房间服务，3–6 个真实玩家客户端，无机器人冒充玩家 |

[时间 × 材料](http://127.0.0.1:8962/forms.html?left=time-manipulation&right=material-simulation#compare) · [身体 × 照片](http://127.0.0.1:8962/forms.html?left=body-control&right=photo-world#compare) · [规则 × 画框](http://127.0.0.1:8962/forms.html?left=rule-rewriting&right=panel-puzzle#compare) · [程序 × 声音](http://127.0.0.1:8962/forms.html?left=programming-puzzle&right=audio-exploration#compare) · [多人推理](http://127.0.0.1:8962/showcase.html?play=assembly#play)。

## 素材和绘制

十份新原创场景、四幅画框图集、人物物件图集与鳞片材质由内置 ImageGen 制作。完整提示词、原始 PNG、尺寸、透明信息和哈希在 `assets/game-forms/frontier-generation-20261004.json`，原始图在 `assets/game-forms/frontier-sources`。已有原创石灰石材质原样复用。

三维模式优先使用 Three.js WebGL、透视相机、动态身体、实体桥面、原创纹理、灯光与阴影。WebGL 无法创建时使用同一 THREE 场景的软件投影兼容模式，并明确提示。兼容模式按三角面绘制、UV 贴图及近似深度排序；阴影和局部遮挡与 WebGL 有差异。

卡片预览来自实际生产工厂 `draw()` 经 Skia 和 DOM 生命周期替身输出。三维预览来自生产兼容渲染，房间预览采用隔离 HTTP 测试返回的无令牌状态。不是浏览器截图，不能据此认证实际 WebGL 或浏览器布局。来源见 `frontier-preview-provenance-20261004.json`。

## 保存与运行

单人方向沿用原存档前缀、各自使用新 ID。多人会话令牌使用每窗口 sessionStorage，普通共享 localStorage 不保存令牌，避免其他窗口刷新串成同一玩家。房间保存在本机服务内存，服务重启或房间六小时过期后需新建。

静态页面继续由原来的 8962 服务运行；多人伴随服务仅监听本机 127.0.0.1:8963。启动命令：`python tooling/start-frontier-room.py`，它会复用已运行的同名服务，或后台隐藏启动。手动服务命令：`python tooling/frontier-room-server.py`。复制链接后由其他窗口的玩家加入；本机链接不能直接用于跨电脑联机。纯静态部署需要另行部署房间服务并配置来源和地址。

## 验收边界

八个单人方向用正常命令和移动完成；规则与存档检查、原生控件和生命周期检查、声音 API 图检查以及真实 HTTP 房间检查均另有报告。生产工厂输出开始、中途、结局 27 张画面，暂停状态和像素稳定性另行验证。

当前浏览器工具仍不可用：两次 rewriteDocumentation，以及 js_reset 后的 getState 均在初始化时报 `trusted Node process exited unexpectedly; kernel reset, rerun your request`。因此真实浏览器窄屏、全屏、焦点、刷新保存、WebGL 实际呈现和耳机 HRTF 听感尚未验收，当前不能声称展示质量全部达标。具体检查结果见 `frontier-package-check-20261004.json`。
