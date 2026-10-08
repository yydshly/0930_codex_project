# 重力、双世界、传送门与声音控制

2026-10-04 新增四种参与形式，目录为 **91 种形态、100 个入口**。原有 87 种形态、96 个入口逐项保持一致；2429 个受保护旧 Web 文件哈希未变。新增内容使用各自的 ID 与现有独立保存路径，未读取、清空或迁移浏览器存档。

| 新增形态 | 可实际参与的差异 | 试玩 |
| --- | --- | --- |
| 重力翻转平台《倒悬温室》 | 地面和天花板都是支撑面；只有落地才能反转重力，绕开上下危险 | [打开](http://127.0.0.1:8962/showcase.html?play=inverter#play) |
| 双世界切换《昼夜之间》 | 同一位置有两套不同碰撞平台；跳起后切换实体层，把两层拼成通路 | [打开](http://127.0.0.1:8962/showcase.html?play=phasewalk#play) |
| 传送门惯性《折向的航程》 | 选择门位，让下落速度经门面旋转成为侧向冲量，飞到高台 | [打开](http://127.0.0.1:8962/showcase.html?play=transit#play) |
| 声音音高控制《以声音飞行》 | 稳定音高控制高度，停止发声就停下；麦克风和键盘模式明确区分 | [打开](http://127.0.0.1:8962/showcase.html?play=cantor#play) |

[重力 × 双世界并列试玩](http://127.0.0.1:8962/forms.html?left=gravity-inversion&right=dual-world#compare) · [传送门 × 声音并列试玩](http://127.0.0.1:8962/forms.html?left=portal-momentum&right=voice-pitch#compare)。在每段的「开始」后使用画面下方真实控件；方向键、空格、E 或 Z/X/C 的说明随玩法展示。

学习案例是设计参考，不使用其角色、素材或关卡。重力翻转参考 [VVVVVV 官方](https://thelettervsixtim.es/)；平行实体世界参考 [Guacamelee! 开发者商店页](https://store.steampowered.com/app/275390/Guacamelee_Super_Turbo_Championship_Edition/)；门面改变空间关系参考 [Portal 官方介绍](https://www.thinkwithportals.com/about.php)；持续唱声参与参考 [One Hand Clapping 发行方](https://www.thqnordicmobile.com/en/games/one-hand-clapping/)。这里学习的是参与形式与空间规则，四段均为原创有限演示。

## 实现与范围

重力玩法有独立上下支撑、实体挡墙、危险区、三枚拾取物和中段重试检查点。双世界有公共岸边、两套独有台面、限定世界拾取物、实际切换碰撞、幽影预览和重叠拒绝。昼夜场景平滑过渡，碰撞随操作立即切换。

传送门在二维侧面空间中选择三个入口位置与三个出口高度，按平面法线与切线变换位置和速度；穿越瞬间速度大小保持，之后继续受重力、输入和阻尼影响。另一端窗口来自同一生产场景实时取样，只做一层二维局部窗口。不是三维非欧房间，不支持任意墙面放门、递归空间或无限窗口。推荐初次选择第三个入口与第三个出口，发射后按右加速、离开台面再松开方向。

声音玩法使用本地 `getUserMedia` 和时域 PCM 分析器，以 YIN 归一化差分检测 65–1000 Hz 的稳定周期，再用相对最低音的对数比例映射高度。RMS 和置信度不足时不前进，匹配音环需保持约 0.7 秒。音符键盘可以立即试玩；开启声音时提供轻量试听，不把键盘模拟称作真实声音输入。可将舒适音设为最低音以校准不同音域。

麦克风只在明确点击启用后请求，启动、恢复存档与恢复暂停不自动请求设备。拒绝或不可用时保留键盘路径；暂停、失焦、切换模式、重试与离开释放音轨与音频节点；迟到的设备授权结果也会释放。原始 PCM 不上传、不保存，设备检测值不进入导出的存档。只有声音玩法的对照 iframe 获得 `microphone` 权限。API 约束参考 [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) 和 [MDN 时域采样](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData)。

## 美术与核验

五份场景、八帧角色图集、飞船、胶囊与石台共九份原创资产由**内置 ImageGen**制作。原始 PNG 保持不变，运行时只做 WebP 格式编码，透明素材按 alpha 元数据定位；碰撞、台面、荆棘、音环、传送门与轨迹由实际状态绘制。完整提示词、源文件、尺寸、透明度与 SHA256 见 [生成记录](../assets/game-forms/thresholds-generation.json)。

58 项规则检查、50 项生产控件与生命周期检查通过。包含四种正常通关、失败路径、穿越速率保持、双层碰撞、不同采样率及音域 PCM 检测、静音/噪声、授权拒绝与迟到、暂停/失焦/销毁清理。旧玩法回归、6 项站点测试、19 个演示构建通过；25 个打包目标哈希一致，31 个 HTTP 地址返回与工作区一致的内容。

十二张开局、过程、完成的生产 Canvas 绘图已查看，调整了标题层、人物轮廓、台面辨识和立柱纹理。预览来自这些实际生产绘图，不是浏览器截图。见 [画面来源](thresholds-preview-provenance-20261004.json)、[质量记录](thresholds-quality-review-20261004.json) 与 [完整核验](thresholds-package-check-20261004.json)。

**真实浏览器与设备验收未完成**：本轮 CUA 初始化因 Windows 沙箱 helper 启动错误退出；没有采用其他浏览器自动化绕过。窄屏、全屏、触摸、真实麦克风、实际听感和刷新存档尚未核验。因此以上是可玩首版与已验证范围，不宣称商业产品全部验收。

后续可扩展横向重力区域、多层互斥机关、可搬传送表面、投物惯性机关、声强与和声音门。真人影像、眨眼推进、现实 AR 与三维非欧空间仍需独立内容和设备流程，没有计入已实现数量。
