from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];r=json.loads((P/'notes/voyages-package-check-20261004.json').read_text(encoding='utf-8'));assert r['passed']
review={'date':'2026-10-04','forms':83,'entrances':92,'new_forms':4,'original_assets':10,'generation_mode':'builtin-imagegen','prompts_and_originals':'assets/game-forms/voyages-generation.json','checks':r['new_checks'],'render_review':{'frames':12,'phases':['initial','progress','complete'],'method':'Visually inspected production Skia contact sheets for all phases, then inspected revised panorama detail frames and unobstructed completion scenes. Panorama uses explicitly labelled compatibility projection; these are not browser screenshots.','refinements':['Degenerate IK chains still keep all segment lengths','Map artwork and overlays zoom and pan together','Three high-detail directional illustrations replace blurred telescope enlargement','Detail layers use the same camera bearing and projection','Completion panels moved below principal objects','Material uniform textures disposed explicitly','Implementation formulas removed from player instructions']},'preservation':r['preservation'],'catalogs':r['catalogs'],'packaged':r['packaged'],'browser_qa':r['browser_qa'],'automated_checks_passed':True,'acceptance_complete':False,'remaining':['Native HTML layout and real keyboard/touch focus','Narrow viewport and fullscreen','Actual WebGL shaders, texture seams, frame time and memory','Browser refresh and localStorage continuation']}
(P/'notes/voyages-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
readme=P/'README.md';old=readme.read_text(encoding='utf-8');old=old.replace('2026-10-04 本轮新增 **仿桌面','2026-10-04 上一批新增 **仿桌面',1)
head='''2026-10-04 本轮新增 **地图勘察旅行、柔性多肢操控、剪纸造路、360°环视勘察** 四种参与形式。当前共 **92 个入口、83 种可玩形态**，旧游戏、美术版本与存档标识继续保留。

[地图 × 柔性臂](http://127.0.0.1:8962/forms.html?left=map-expedition&right=soft-limb#compare) · [剪纸 × 全景](http://127.0.0.1:8962/forms.html?left=collage-world&right=panoramic-survey#compare)。各自的实际操作、能力边界和参考案例见 [本批说明](notes/voyages-forms-20261004.md)。十份原创素材由内置 ImageGen 制作，[完整提示词、原始 PNG、尺寸与哈希](assets/game-forms/voyages-generation.json) 保留。

113 项新增规则、投影和控件检查、旧玩法回归、6 项站点测试和 19 个演示构建通过。2389 个受保护旧文件未修改或丢失，原有 79 个形态和 88 个入口逐项一致；26 个打包目标哈希相同，本地 HTTP 已接入。12 张开始、进展、完成的生产绘制输出已检查，并补充全景近景细节、调整完成卡遮挡。[预览来源](notes/voyages-preview-provenance-20261004.json) 明确标注兼容投影与非浏览器截图。

**真实浏览器验收尚未完成**：新初始化的浏览器控制内核在连接前退出；窄屏、全屏、真实输入与刷新存档、WebGL 接缝和性能仍待检查。不宣称展示质量全部达标。见 [质量范围](notes/voyages-quality-review-20261004.json) 与 [完整检查](notes/voyages-package-check-20261004.json)。以下保留历史批次记录，其数量按各批完成时计。

'''
if not old.startswith('2026-10-04 本轮新增 **地图'):readme.write_text(head+old,encoding='utf-8')
coverage=P/'notes/game-form-coverage-next.md';old=coverage.read_text(encoding='utf-8');head='''# 游戏形态的后续补全

2026-10-04 当前：**83 种形态、92 个入口**。地图勘察、柔性多肢、剪纸造路、全景环视已接入，原有目录条目、效果版本和存档标识继续保留。[本批能力与边界](voyages-forms-20261004.md) · [质量检查范围](voyages-quality-review-20261004.json)。

这四种补足了路线组织、局部肢体协调、可变几何通路和环绕观察的差异。数量不表示穷举了所有游戏类型。后续先补真实浏览器的排版、触摸、全屏、刷新保存及 GPU 画面验收。

| 尚可探索的参与形式 | 实际差异与验证要求 |
| --- | --- |
| 绘制轨迹来驱动角色 | 玩家画路线或平台，再由角色沿作品行动；需要真实几何与可恢复编辑 |
| 跨时间的异步传递 | 一个玩家留下的物件或行动成为另一时刻的输入；需要持久状态与真实传递 |
| 语音或摄像头参与 | 输入来自声音或身体动作；需要用户实际设备授权与浏览器实机验证 |
| 整体世界状态回滚 | 同时回滚角色、物件与机关，比较跨时刻解法；应明确与位置回放的差别 |

已有方向还可扩展多节点全景、接触式柔性抓握、纸片折叠、不同交通方式、桌面网页联动、自由雕塑导出与多工位载具协作。这些未来能力没有计入当前数量。

以下保留历史覆盖记录，数量和待探索方向按记录时计。

'''
if '**83 种形态、92 个入口**' not in old:coverage.write_text(head+old.removeprefix('# 游戏形态的后续补全\n\n'),encoding='utf-8')
print('Recorded scope, rendering review and preserved history')
