from pathlib import Path
P=Path(__file__).resolve().parents[1]
head='''2026-10-04 本轮新增 **重力翻转平台、双世界切换、传送门惯性、声音音高控制**。当前共 **100 个入口、91 种可玩形态**，旧游戏、画风版本与存档标识继续保留。

[重力 × 双世界](http://127.0.0.1:8962/forms.html?left=gravity-inversion&right=dual-world#compare) · [传送门 × 声音](http://127.0.0.1:8962/forms.html?left=portal-momentum&right=voice-pitch#compare)。九份原创场景与透明素材使用内置 ImageGen 制作，[完整提示词、原始 PNG、尺寸与哈希](assets/game-forms/thresholds-generation.json) 保留。[本批能力与边界](notes/thresholds-forms-20261004.md) 明确区分二维门面惯性、真实麦克风和键盘替代输入。

108 项新增检查、旧游戏回归、6 项站点测试与 19 个演示构建通过。2429 个受保护旧文件未修改或丢失，原有 87 个形态、96 个入口逐项一致；25 个打包目标哈希相同，31 个 HTTP 地址与工作区内容相符。十二张生产绘图已查看，改善了标题对比度、角色轮廓与台面辨识。

**真实浏览器与麦克风设备验收尚未完成**：CUA 内核在初始化时退出，窄屏、全屏、触摸、真实设备输入和刷新存档仍待检查。当前不宣称产品质量全部验收。见 [质量范围](notes/thresholds-quality-review-20261004.json) 与 [完整检查](notes/thresholds-package-check-20261004.json)。以下历史批次的数量与状态按记录时计。

'''
readme=P/'README.md';text=readme.read_text(encoding='utf-8')
if not text.startswith(head):readme.write_text(head+text,encoding='utf-8')
coverage=P/'notes/game-form-coverage-next.md';text=coverage.read_text(encoding='utf-8');first,rest=text.split('\n',1)
addition='''

2026-10-04 当前：**91 种形态、100 个入口**。重力翻转、双世界切换、二维传送门惯性与声音音高控制已接入。[能力与边界](thresholds-forms-20261004.md) · [质量记录](thresholds-quality-review-20261004.json)。原有 87 种形态、96 个入口逐项保持一致。

声音包含显式启用的真实麦克风路径和明确标注的键盘试玩，不代表语音识别。传送门保留穿越瞬间速率，是二维定点双门，没有宣称三维非欧空间。九份原创资产和十二帧生产绘图已保存，108 项新增检查与旧游戏回归通过；真实浏览器、设备、触摸、全屏和刷新存档验收仍需补充。

尚可补充真人影像片段探索、眨眼推进、现实空间 AR、真正三维非欧房间和跨玩家异步传递；都需要独立内容、设备或状态传递，不计入当前已实现数量。已有方向可继续扩展不同重力区、层间机关、移动门面、声音强弱与和声音门。

以下是历史覆盖记录，数量和待探索方向按各批记录时计。
'''
if addition not in text:coverage.write_text(first+addition+rest,encoding='utf-8')
print('Documented new batch without rewriting history')
