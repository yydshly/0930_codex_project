"""Prepend this delivery while keeping every byte of the earlier README history."""
import hashlib
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
baseline = json.loads((project / 'notes/vehicle-preservation-before-20261005.json').read_text('utf-8'))
path = project / 'README.md'
current = path.read_bytes()
size = baseline['readme_historical_suffix_bytes']
history = current[-size:]
assert hashlib.sha256(history).hexdigest() == baseline['readme_historical_suffix_sha256']
prefix = '''2026-10-05 本轮新增 [岚谷试车场 · 车辆物理与工程](http://127.0.0.1:8962/direction-vehicle.html?demo=1#play)。真正三维的货车在有限山谷试车场驾驶，四个车轮分别读取地面高度，弹簧与阻尼共同支撑车身的升降、俯仰与侧倾。装载四件建材后整车从 1250 kg 变为 1570 kg，悬挂下沉、加速响应改变；舒适和紧致调校采用不同的弹簧与阻尼参数。实际驶入车库、料站和工地并低速停车，才能领取、装载、交付和验收；回库前必须真正经过东侧桥面。

本批原先列出的 **10 条参考方向已各有一个原创可玩短样例**：铜谷防线、风湾乐园、雾岭同行、夜航值守、湾岸货运、深岩堡垒、月影档案、星潮航路、雨后余生、岚谷试车场。[方向地图](http://127.0.0.1:8962/directions.html#directions)、[开源参考汇总](http://127.0.0.1:8962/references.html) 和旧形式页接入新入口。十个方向样例、十条原作参考与原有 107 种形态／116 个入口分别统计；这表示本批完成，不表示所有游戏类型已穷尽。旧画面、版本、九个方向运行代码与存档继续保留，新样例独立使用 `world-play-direction-vehicle-v1`，恢复后暂停。

三维场景组合原创 ImageGen [山谷背景](web/assets/directions/vehicle/landscape.png) 与 [地面图集](web/assets/directions/vehicle/terrain-atlas.png)，并使用 Kenney Car Kit 的五份 CC0 GLB，以及 Nature Kit 的两份 CC0 GLB。[完整提示词及生成路径](assets/directions/vehicle-generation-20261005.json)、[素材来源和运行时改动说明](web/assets/directions/vehicle/SOURCE-NOTICE.json)、[车辆素材许可](web/assets/directions/vehicle/License-car-kit.txt)、[自然素材许可](web/assets/directions/vehicle/nature/License-nature-kit.txt) 单独保留。源 GLB 与 PNG 不被改写；运行时将车体与四轮分离，按实际姿态与接地更新，并追加车窗、标识和建筑细节。追尾、环绕检视和试车场总览来自同一份物理状态，地面与桥面匹配规则高度。路线使用可复用 GPU 缓冲区；粗精两层地形连接，避免总览露空。

新增 49 项车辆规则与 35 项实际控制器回调通过。旧九个方向的 18 个脚本已实际重跑，356 项继续通过；方向规则与回调合计 **440 项**。检查涵盖真实驾驶、四轮支撑力、载重下沉与加速、调校差异、有限地图与障碍碰撞、真实装卸和桥面回库、完成后驻车归零、严格暂停恢复、手动与示范调用、键盘和多指所有权、全屏内部目标和操作、加载失败与重试。[车辆规则报告](notes/direction-vehicle-rules-20261005.json) · [控制器报告](notes/direction-vehicle-controller-20261005.json) · [旧方向实际回归](notes/direction-vehicle-regressions-20261005.json)。21 项站点测试和 19 个演示构建通过；构建明确携带车辆模型、外置纹理、许可与来源说明。

[真实浏览器验收与截图](notes/direction-vehicle-browser-20261005.json)、[范围与画面复查](notes/direction-vehicle-quality-20261005.json) 和 [交付资源及保留检查](notes/direction-vehicle-package-20261005.json) 记录最终实际证据。验收由页面按钮、原生全屏输入与只读可见 DOM 完成；截图像素和 CSS 视口分别登记。未通过隐藏世界、时间注入或构造示范帧替代实际浏览器玩法。既有 2618 个受保护旧文件与此前 README 的 80349 字节历史须保持一致。

参考 [Rigs of Rods 官方说明](https://www.rigsofrods.org/) 的车辆模拟方向，制作原创本地简化样例。该版本采用 x/z 连续车辆运动与车身四角弹簧阻尼，不提供软体形变、破坏、联机或原作代码移植。物理手机、多指实机、持续性能、广泛兼容、专业工程精度、真人情绪价值与商业产品成熟度未验证。

以下逐字保留此前各轮的实现和验收记录。

'''
path.write_bytes(prefix.encode('utf-8') + history)
print('Vehicle README prepended; 80349-byte historical suffix retained exactly.')
