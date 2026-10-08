from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'README.md'
t=p.read_text(encoding='utf-8')
t=t.replace('2026-10-03 最新补充 **体育竞技、潜行行动、物理弹球**：黄昏球场、夜庭潜行、星轨弹球。当前共 **34 个入口、25 种可玩形态**。','2026-10-03 上一批补充 **体育竞技、潜行行动、物理弹球**：黄昏球场、夜庭潜行、星轨弹球。该批完成时共 **34 个入口、25 种可玩形态**。').replace('另列七种尚未制作的候选方向。','当时另列七种尚未制作的候选方向。',1)
intro='''2026-10-03 最新补充 **三维飞行驾驶、轨道射击、点击解谜冒险**：星环试航、回廊巡航、潮灯档案。当前共 **37 个入口、28 种可玩形态**。新增真实三维飞船与自动巡航回廊、三处原创房间及六件透明道具；旧游戏、美术与正常存档保留。另列四种待制作方向。

[飞行驾驶 × 轨道射击](http://127.0.0.1:8962/forms.html?left=flight-sim&right=rail-shooter#compare) · [点击冒险 × 横版探索](http://127.0.0.1:8962/forms.html?left=point-click&right=side-story#compare) · [内容与范围](notes/navigation-forms-20261003.md) · [实际操作验证](notes/navigation-forms-check-20261003.json) · [构建验证](notes/navigation-package-20261003.json)

'''
if '最新补充 **三维飞行驾驶' not in t:t=intro+t
t=t.replace('也可切换十三种已接入形态；另列十二种待扩展形态','也可切换二十八种已接入形态；另列四种待扩展形态').replace('进入展厅：31 个试玩入口','进入展厅：37 个试玩入口')
p.write_text(t,encoding='utf-8')
p=ROOT/'web/README.md';t=p.read_text(encoding='utf-8').replace('# 34 个试玩入口','# 37 个试玩入口').replace('最新形态页接入 **25 种可玩类型**','上一批形态页接入 **25 种可玩类型**')
intro='''最新形态页接入 **28 种可玩类型**，新增三维飞行「星环试航」、自动镜头射击「回廊巡航」与固定房间点击冒险「潮灯档案」。[飞行 × 巡航射击](http://127.0.0.1:8962/forms.html?left=flight-sim&right=rail-shooter#compare) · [点击冒险](http://127.0.0.1:8962/showcase.html?play=archive#play)。三种分别保存，旧游戏与美术保留；范围、素材与验证见 `../notes/navigation-forms-20261003.md`。

'''
if '最新形态页接入 **28' not in t:t=t.replace('\n\n','\n\n'+intro,1)
t=t.replace('[新增十二款展厅]','[游戏展厅]').replace('使用「新十二款」或「全部」筛选查看扩展试玩','使用「扩展试玩」或「全部」筛选查看扩展试玩')
p.write_text(t,encoding='utf-8')
catalog=ROOT.parents[1]/'projects.json'
raw=catalog.read_text(encoding='utf-8')
entry=next(e for e in json.loads(raw) if e['slug']=='dumpling-style-lab')
summary='目标：比较游戏类型、视角、主要操作与呈现方式；实现：28种可玩形态与原有九款，共37个入口；新增：三维飞行驾驶、自动巡航射击与三房间点击冒险，已有平台、跑射、竞速、格斗、节奏、战略、体育、潜行和弹球；美术：保留旧画风，使用原创AI位图、CC0模型与骨骼动画；技术：Canvas 2D / Three.js、独立本地存档；证据：真实操作、实际截图、手机与旧存档回归；边界：可玩短关卡，四类尚待制作，长篇内容与真人情绪价值仍需验证。'
raw=raw.replace(json.dumps(entry['summary'],ensure_ascii=False),json.dumps(summary,ensure_ascii=False),1)
catalog.write_text(raw,encoding='utf-8')
print('Documented 28 / 37; prior delivery records retained as historical batches')
