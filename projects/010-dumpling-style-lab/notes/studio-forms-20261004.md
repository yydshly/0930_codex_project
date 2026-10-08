# 六种新游戏形式 · 工坊与时间协作

本批继续扩展游戏的操作与呈现形式。六种都有自己的场景、原生控制、正常完成路线和独立存档。当前合计 75 种形态、84 个入口，原有九款、全部已有画面版本和存档标识继续保留。

| 形态 / 原创试玩 | 玩家实际做什么 | 已实现范围 |
| --- | --- | --- |
| 拼图旋转吸附 / 拼回海港 | 从托盘拿起画作碎片，辨认轮廓和图像，旋转后拼合 | 12 块互补榫口拼片；真实轮廓点击、拖动、旋转、位置与方向吸附；可选参考图；最终完整画作 |
| 物理造桥 / 峡谷承重桥 | 选材、连接节点、拆除和加固结构，再让邮车逐段通过 | 11 个固定节点，木材与钢材，预算；二维线性桁架刚度矩阵求解；自重及移动加载、强度与挠度反馈、失稳坠落；形变显示放大 8 倍 |
| 光线反射 / 折光镜庭 | 旋转真实反射面，让光避开遮挡并抵达晶体 | 两套镜庭、三镜方向选择；线段求交、连续几何反射、遮挡、传播光点、稳定照射计时 |
| 音乐作曲 / 灯下乐句 | 写入音符，调整音高与速度，听见自己创作的乐句 | 四轨 16 步、八音高、80–160 BPM；真实 PCM 音色、Web Audio 调度；WAV 导出；至少六音符、三轨、两轮试听练习 |
| 动作录制回放协作 / 昨日同行 | 录制自己走到机关上的动作，让过去的自己与你同时协作 | 30 Hz 位置记录，最多两个 12 秒分身；回放路线及终点停留；双机关持续 1.5 秒开启时间门；完整进度、未完成录制均保存 |
| 图案交叉推理 / 交叉光晶 | 根据行列连续长度填色和划空，交叉排除可能排布 | 8×8 多段数字图案，拖涂、键盘、擦除、撤销；基于合法行列排布的解释提示、矛盾反馈；正常通关无需猜测 |

## 并列入口

- [拼图 × 造桥](http://127.0.0.1:8962/forms.html?left=jigsaw-puzzle&right=bridge-building#compare)
- [光线 × 作曲](http://127.0.0.1:8962/forms.html?left=light-reflection&right=music-composition#compare)
- [回放 × 图案](http://127.0.0.1:8962/forms.html?left=action-replay&right=nonogram#compare)

拼图可以自由拿起并旋转碎片；造桥操作承重拓扑；光学操作角度与遮挡；作曲操作声音内容；回放操作过去的行为；图案推理操作隐藏信息。它们分别提供不同的参与方式。

## 案例来源与提取方式

- [Super Jigsaw Puzzle: Generations / 开发者 Steam 页面](https://store.steampowered.com/app/1036950/Super_Jigsaw_Puzzle_Generations/)：取拼片拖动、吸附、完整图像的参与方向；本批为原创十二片旋转画作。
- [Poly Bridge 3 / Dry Cactus 发布页](https://play.google.com/store/apps/details?id=com.drycactus.polybridge3)：取建造、承重测试、失败后加固的方向；本批为固定节点线性桁架的短场景，未实现悬索、液压或完整刚体世界。
- [The Talos Principle / Croteam](https://www.croteam.com/talosprinciple/)：参考空间机关解谜及时间复制方向。本批光学机制使用自制二维镜面反射，回放机制记录二维人物位置，未实现整个世界的时间回滚。
- [Incredibox 官方网站](https://www.incredibox.com/)：取玩家创作音乐、试听并保存作品的参与方向；本批为四轨音符编排和原创合成音色。
- [PICROSS S / Nintendo 官方页面](https://www.nintendo.com/es-mx/store/products/picross-s-switch/)：取行列数字推断隐藏图案的方式；本批有一套可由线索推导完成的原创光晶图案。

只提取形式与操作思想；场景、美术、音色、角色与图案由本项目原创实现。参考案例的完整内容、素材或效果质量不包含在本批范围内。

## 素材与验证

八份素材通过内置 ImageGen 的 generate 模式生成：六个环境、一幅完整海港画作、一份透明道具图集。原始 PNG 逐份保存到 assets/game-forms/studio-sources；完整提示词、工具返回路径、透明度、尺寸、转换与哈希记录在 [素材清单](../assets/game-forms/studio-generation-20261004.json)。运行时 WebP 位于 web/assets/game-forms/studio。只作 WebP 编码；图集透明边界元数据用于运行时裁取，没有重新绘制生成图片。

展厅预览取自实际 createStudio 工厂 draw() 的生产画面，使用 Skia 与 DOM 生命周期替身离屏绘制。六种各有开始、进行中和完成画面，共 18 张；这是生产绘制验证，无法确认浏览器 CSS、窄屏、焦点或真实声音设备表现。来源见 [预览记录](studio-preview-provenance-20261004.json)。

49 项规则与正常操作检查、50 项生产工厂及 Web Audio API 调度检查通过。真实 PCM 乐句导出样本保存在 assets/game-forms/studio-qa/sonata-composition.wav。已有游戏回归、站点测试、静态构建、HTTP 入口和文件保留检查见 [完整打包记录](studio-package-check-20261004.json)。

浏览器工具本次首次连接和重置后连接均在 Windows 沙箱启动阶段退出，错误为 helper_unknown_error / setup refresh had errors。因此本批的窄屏、全屏、实际浏览器输入、刷新存档和听感尚待实机验收，当前不宣称展示质量已经全部达标。没有用其他浏览器自动化方式替代。
