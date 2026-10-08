from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'README.md'
t=p.read_text(encoding='utf-8').replace('2026-10-03 最新补充 **即时战略','2026-10-03 上一批补充 **即时战略').replace('目前共 31 个入口、22 种','该批完成时共 31 个入口、22 种')
intro='''2026-10-03 最新补充 **体育竞技、潜行行动、物理弹球**：黄昏球场、夜庭潜行、星轨弹球。当前共 **34 个入口、25 种可玩形态**。三种分别展示球场队伍、巡逻遮挡与独立物理机台；旧游戏、美术和正常存档保留。另列七种尚未制作的候选方向。

[体育竞技 × 潜行行动](http://127.0.0.1:8962/forms.html?left=sports&right=stealth#compare) · [物理弹球 × 几何益智](http://127.0.0.1:8962/forms.html?left=pinball&right=board#compare) · [内容与范围](notes/action-forms-20261003.md) · [实际操作验证](notes/action-forms-check-20261003.json) · [构建验证](notes/action-package-20261003.json)

'''
if '最新补充 **体育竞技' not in t:t=intro+t
t=t.replace('浏览全部 31 个','浏览全部 34 个')
p.write_text(t,encoding='utf-8')
p=ROOT/'web/README.md'
t=p.read_text(encoding='utf-8').replace('# 31 个试玩入口','# 34 个试玩入口').replace('最新形态页接入二十二种类型','上一批形态页接入二十二种类型').replace('最新形态页接入十九种类型','上一批形态页接入十九种类型')
intro='''最新形态页接入 **25 种可玩类型**，新增整场体育「黄昏球场」、巡逻潜行「夜庭潜行」和物理机台「星轨弹球」。[体育 × 潜行](http://127.0.0.1:8962/forms.html?left=sports&right=stealth#compare) · [物理弹球](http://127.0.0.1:8962/showcase.html?play=pinball#play)。三种分别保存，旧内容与美术保留；范围、素材与验证见 `../notes/action-forms-20261003.md`。

'''
if '最新形态页接入 **25' not in t:t=t.replace('\n\n','\n\n'+intro,1)
p.write_text(t,encoding='utf-8')
print('Updated current documentation; retained historical deliveries')
