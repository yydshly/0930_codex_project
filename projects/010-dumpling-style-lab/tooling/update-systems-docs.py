import pathlib,json,re

root=pathlib.Path(__file__).resolve().parents[1]
verified=[]
for game,name in [('party','RPG'),('district','城市'),('balance','物理'),('tandem','合作')]:
 report=root/('notes/systems-'+game+'-check-20261003.json')
 if report.exists():
  data=json.loads(report.read_text(encoding='utf-8'))
  if data.get('passed') is True:verified.append(name+' '+str(len(data['checks']))+' 项')
evidence='、'.join(verified)+'实际操作检查'
readme=root/'README.md';text=readme.read_text(encoding='utf-8')
if not text.startswith('2026-10-03 最新补充 **指令式 RPG'):
 text=text.replace('2026-10-03 最新补充 **推箱机关','2026-10-03 上一批补充 **推箱机关',1).replace('当前共 **41 个游戏入口、32 种可玩形态，已列清单中 0 项待制作**','该批完成时共 **41 个游戏入口、32 种可玩形态，已列清单中 0 项待制作**',1)
 prefix='2026-10-03 最新补充 **指令式 RPG 战斗、城市交通规划、三维物理机关与双人合作**：余烬旅团、晨湾街区、重力工坊、同步灯桥。当前共 **45 个游戏入口、36 种可玩形态**。分别展示技能与目标选择、真实三维街区路网与车辆、连续刚体搭建、两个玩家独立操作的同屏机关。双人合作属于参与形式，可与其他玩法组合；清单不表示穷举全部游戏类型。已有游戏、画风与各入口独立存档保留。\n\n[指令式 RPG × 城市规划](http://127.0.0.1:8962/forms.html?left=command-rpg&right=city-planning#compare) · [三维物理 × 双人合作](http://127.0.0.1:8962/forms.html?left=physics-puzzle&right=co-op#compare) · [内容、素材与逐项验证范围](notes/systems-forms-20261003.md)。六个内置 ImageGen 任务、Kenney CC0 作者模型和本地 MIT 物理引擎共同构成本批画面。当前已确认城市 14 项、合作 18 项实际操作检查；其他检查以最新文档及报告为准。\n\n'
 text=prefix+text
text=text.replace('也可切换三十二种已接入形态','也可切换三十六种已接入形态').replace('[最新实现、素材与检查范围](notes/completion-forms-20261003.md)','[最新实现、素材与检查范围](notes/systems-forms-20261003.md)').replace('[进入展厅：41 个试玩入口]','[进入展厅：45 个试玩入口]')
text=re.sub(r'当前已确认[^；\n]*实际操作检查','当前已确认 '+evidence,text,count=1)
readme.write_text(text,encoding='utf-8')
readme=root/'web/README.md';text=readme.read_text(encoding='utf-8').replace('# 41 个试玩入口','# 45 个试玩入口',1)
if '最新形态页接入 **36 种可玩形态**' not in text:
 text=text.replace('最新形态页接入 **32 种可玩形态**','上一批完成时形态页接入 **32 种可玩形态**',1).replace('| 最新入口 |','| 上一批入口 |',1).replace('[本批 56 项实际操作汇总]','[上一批 56 项实际操作汇总]',1)
 prefix='最新形态页接入 **36 种可玩形态**，展厅共 **45 个入口**。新增指令式 RPG「余烬旅团」、城市规划「晨湾街区」、三维物理机关「重力工坊」与本地双人合作「同步灯桥」。双人合作标注为参与形式，可与平台、射击和解谜等类型结合。旧内容、画风与独立存档保留；详细能力、素材和已验证范围见 [本批说明](../notes/systems-forms-20261003.md)。\n\n[指令式 RPG × 城市规划](http://127.0.0.1:8962/forms.html?left=command-rpg&right=city-planning#compare) · [三维物理 × 双人合作](http://127.0.0.1:8962/forms.html?left=physics-puzzle&right=co-op#compare)\n\n| 最新入口 | 主要操作 | 当前短局 |\n| --- | --- | --- |\n| `showcase.html?play=party` 余烬旅团 | 选择技能与目标，敌我依次行动 | 三名队员、三类敌人、两场固定战斗 |\n| `?play=district` 晨湾街区 | 铺路、建住宅与诊所、拆除、看通勤 | 9×7 三维街区，四户生活线路与十六次抵达 |\n| `?play=balance` 重力工坊 | 抓取、升降、转动、放开与检验 | 桥板搭稳两岸，配重压台，车辆实际通过 |\n| `?play=tandem` 同步灯桥 | 两人独立移动跳跃、持续压板与同步充能 | 两间同屏合作机关，两组独立手机控制 |\n\n本批采用六个内置 ImageGen 任务、19 个 Kenney 官方 CC0 城市模型与本地 cannon-es 0.20.0 MIT 物理模块。城市 14 项及合作 18 项实际操作报告已通过；其余逐款检查、全形态回归与构建状态以本批说明及实际报告为准。\n\n'
 text=text.replace('\n\n','\n\n'+prefix,1)
text=re.sub(r'(?<=MIT 物理模块。)[^；\n]*已通过',evidence+'已通过',text,count=1)
readme.write_text(text,encoding='utf-8')
projects=root.parents[1]/'projects.json';text=projects.read_text(encoding='utf-8');data=json.loads(text);entry=next(p for p in data if p.get('slug')=='dumpling-style-lab');old=entry['summary'];new='目标：比较游戏类型、视角、主要操作与参与形式；实现：36种可玩形态与原有九款，共45个入口，已列清单0项待制作；新增：指令式队伍战斗、三维城市道路与通勤、连续刚体机关和本地同屏双人合作，保留原有32种形态；美术：六个内置ImageGen任务、19个Kenney官方CC0模型与原始贴图，保留旧画风；技术：Canvas 2D / Three.js / cannon-es 0.20.0 MIT物理、独立本地存档与QA隔离；证据：城市14项与合作18项真实操作已通过，其余逐款与整合检查以本批报告为准；边界：合作属于参与形式，清单不穷举行业类型，长期内容、云同步、联网合作和真人体验价值待扩展或验证。'
new=new.replace('城市14项与合作18项真实操作已通过',evidence.replace(' ','')+'已通过')
if old!=new:
 needle=json.dumps(old,ensure_ascii=False);assert text.count(needle)==1;text=text.replace(needle,json.dumps(new,ensure_ascii=False),1);projects.write_text(text,encoding='utf-8')
print('Updated project readmes and only dumpling-style-lab summary; historical batch figures retained.')
