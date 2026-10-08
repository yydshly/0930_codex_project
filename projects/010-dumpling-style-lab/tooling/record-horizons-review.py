from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];r=json.loads((P/'notes/horizons-package-check-20261004.json').read_text(encoding='utf-8'));assert r['passed']
review={'date':'2026-10-04','forms':79,'entrances':88,'new_forms':4,'original_assets':7,'generation_mode':'builtin-imagegen','prompts_and_originals':'assets/game-forms/horizons-generation.json','checks':r['new_checks'],'render_review':{'frames':12,'phases':['initial','progress','complete'],'method':'Visually inspected Skia contact sheets for all phases. Desktop is an explicitly labelled interface-state illustration, not native DOM screenshots; sculpture uses actual Three.js meshes in software compatibility mode; text adventure and submarine use production draw functions.','refinements':['Window positions clamped and bodies height-limited','Unchanged native document text no longer rewritten each frame','Exact finite grammar prevents substring command matches','Submarine instruments move aside when the vessel approaches the right edge','Sculpture completion uses the same changed mesh volume and in-scene light']},'preservation':r['preservation'],'catalogs':r['catalogs'],'packaged':r['packaged'],'browser_qa':r['browser_qa'],'automated_checks_passed':True,'acceptance_complete':False,'remaining':['Real native HTML layout, focus and keyboard interactions','Narrow viewport and fullscreen','Touch drag and voxel picking','Actual WebGL lighting, frame time and memory','Browser refresh/save continuation']}
(P/'notes/horizons-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
readme=P/'README.md';old=readme.read_text(encoding='utf-8').replace('2026-10-04 本轮新增 **拼图','2026-10-04 上一批新增 **拼图',1)
head='''2026-10-04 本轮新增 **仿桌面侦探、输入文字冒险、真实三维体素雕刻、多工位潜艇驾驶** 四种参与形式。当前共 **88 个入口、79 种可玩形态**，旧游戏、画风、原版与独立存档标识继续保留。

[桌面 × 文字](http://127.0.0.1:8962/forms.html?left=desktop-investigation&right=parser-adventure#compare) · [三维雕刻 × 潜艇](http://127.0.0.1:8962/forms.html?left=voxel-sculpture&right=vehicle-stations#compare)。每种的实际能力、参考案例与边界见 [本批说明](notes/horizons-forms-20261004.md)。七份原创素材由内置 ImageGen 制作，[完整提示词、原始 PNG 和哈希](assets/game-forms/horizons-generation.json) 保留。

103 项新增规则与控件检查、旧游戏回归、6 项站点测试和 19 个演示构建通过。2373 个受保护旧文件没有修改或丢失，原有 75 个形态、84 个入口的条目保持一致；22 个打包目标哈希相同。本地服务已接入新入口。12 张开始、进展、结果的绘制输出已检查，[预览来源](notes/horizons-preview-provenance-20261004.json) 区分原生界面状态绘图、三维兼容投影和生产画布绘制。

**真实浏览器验收尚未完成**：控制内核新初始化时退出，未连接浏览器；窄屏、全屏、原生输入与刷新存档、WebGL 实际性能仍待检查。目前不宣称展示质量全部达标。见 [质量范围](notes/horizons-quality-review-20261004.json) 与 [完整检查](notes/horizons-package-check-20261004.json)。以下历史批次的数量按各批完成时计。

'''
if not old.startswith('2026-10-04 本轮新增 **仿桌面'):readme.write_text(head+old,encoding='utf-8')
coverage=P/'notes/game-form-coverage-next.md';old=coverage.read_text(encoding='utf-8')
head='''# 游戏形态的后续补全

2026-10-04 当前：**79 种形态、88 个入口**。仿桌面侦探、输入文字冒险、三维体素雕刻、多工位潜艇驾驶已经接入。它们比较不同的信息组织、输入方式、真实操作空间和载具系统。[四种能力与边界](horizons-forms-20261004.md) · [质量验证范围](horizons-quality-review-20261004.json)。原有入口和版本继续保留。

数量不表示已经穷举游戏类型。继续补充应优先选择参与方式显著不同的短场景，先补齐真实浏览器排版、操作、窄屏与全屏、性能和存档验收。

| 尚可探索的参与形式 | 主要差异 |
| --- | --- |
| 地图勘察与旅行组织 | 阅读地图、标记路线、观察环境证据、组织旅行行动 |
| 柔性多肢协调 | 直接协调触手或肢体，而非常规角色方向移动 |
| 拼贴造物 | 组合可变形的图形与物件，让作品反过来改变舞台 |
| 全景环境勘探 | 在完整环绕空间中定位、采集和测量，而非固定场景点击 |
| 语音或摄像头参与 | 输入来自声音或身体动作，需要真实设备授权与效果验证 |
| 世界状态回滚 / 异步合作 | 保存整个世界时刻，或让不同时间的玩家行动互相影响 |

本批内部还可扩展：桌面网页工具联动、文字复合语法、自由雕塑与导出、载具多人岗位与舱内系统。上述内容均未计入当前已实现数量。

以下保留历史覆盖记录，数量和待探索方向按记录时计。

'''
if '**79 种形态、88 个入口**' not in old:coverage.write_text(head+old.removeprefix('# 游戏形态的后续补全\n\n'),encoding='utf-8')
print('Saved current scope, quality and coverage documentation')
