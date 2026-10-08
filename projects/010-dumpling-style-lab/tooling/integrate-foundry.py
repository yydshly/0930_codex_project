from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
dict(form='machine-construction',id='rigworks',name='机械组装与试驾',title='铆钉工坊',family='空间',view='三维装配 / 机后与环绕镜头',action='装配 · 试驾 · 抓取与交付',description='选择车轴、轮胎、动力和抓取臂，驾驶自己组装的运输车，停稳搬货，穿过缓坡完成交付。',compare='与直接驾驶固定车辆不同：先改变机械配置，再亲自体验质量、轮胎、驱动力和载货对运动的影响。',scope='可切换两到三个车轴、公路与越野轮胎、两种动力和抓取臂；独立车轮转动与贴地、车体缓冲和倾斜、停稳抓取、实际载货质量、缓坡试驾、边界碰撞、环绕与机后镜头、装配撤销、暂停与独立保存。当前是固定路线的原创运输练习，车辆运动采用简化模型，后续可以增加更多零件与任务。',reference='Besiege / 拼装后检验机械的形式',url='https://store.steampowered.com/app/346010/Besiege/',next='可扩展模块化车架、机械传动、履带、可破坏部件与不同地形任务。',controls='先安装抓取臂并开始试驾 · W/S 前后 · A/D 转向 · 空格制动 · E 停稳抓取或交付 · 下方按钮也可操作',dimension='3D'),
dict(form='six-dof',id='drift',name='六自由度三维行动',title='失重航廊',family='空间',view='三维失重 / 机后与第一人称',action='六向平移 · 三轴旋转 · 制动',description='在失重设施间自由升降、横移、前后推进和翻滚，依次通过四座不同位置与高度的信标。',compare='与飞机持续向前飞、二维轨道滑行不同：移动方向与船体姿态分开控制，旋转后的推进沿真实船体方向作用，松开推进也可以继续滑行。',scope='真实三维空间和飞船模型、六向平移、三轴姿态旋转、姿态影响推进、惯性与辅助减速、主动制动、设施碰撞与船体耐久、四座空间信标、朝向目标辅助、机后与第一人称镜头、鼠标拖动转向、暂停与独立保存。当前是短程空间驾驶练习，可继续增加复杂空间路线与任务。',reference='Overload / Descent 六自由度形式',url='https://store.steampowered.com/app/448850/Overload/',next='可扩展立体迷宫、失重搬运、自由对接、空间战斗和更复杂的驾驶舱。',controls='W/S 前后 · A/D 横移 · R/F 升降 · 方向键转向俯仰 · Q/E 翻滚 · 空格制动 · 可朝向信标和切换镜头',dimension='3D'),
dict(form='level-authoring',id='levelsmith',name='关卡创作与即时试玩',title='风谷造关室',family='空间',view='编辑画布 / 横版平台舞台',action='绘制关卡 · 立即试玩 · 返回修改',description='亲手放置道路、晶石、尖刺和出口，一键切换到角色试玩，用实际跳跃和碰撞验证自己的设计。',compare='与雕刻展示和固定平台关卡不同：玩家改变的是下一次试玩实际使用的道路、目标与危险，设计和游玩可以反复切换。',scope='原创山谷背景与透明探索者、石台、尖刺、晶石和出口美术；六种绘制工具、点按与连续拖动、整笔撤销、两套可通关模板、空白画布、唯一出生点和出口、设计检查、即时试玩、跳跃缓冲、真实平台碰撞、晶石收集、失败重试、返回编辑、当前版本通过记录和独立保存。当前为本地短关卡创作，后续可增加分享与更多机关。',reference='Super Mario Maker 2 / 创作与试玩形式',url='https://www.nintendo.com/us/store/products/super-mario-maker-2-switch/',next='可扩展移动平台、开关、敌人、多个主题、关卡文件分享与多人创作。',controls='1–6 选择工具 · 点按或拖动设计 · 立即试玩 · A/D 移动 · 空格跳跃 · 返回设计、撤销或重试',dimension='2D / 创作')
]
files=['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'];sources={f:(W/f).read_text(encoding='utf-8') for f in files};assert 'foundryIds' not in sources['showcase.js']
def edit(f,a,b):
 assert a in sources[f],(f,a);sources[f]=sources[f].replace(a,b)
ids=[e['id'] for e in entries];quoted=','.join(json.dumps(x) for x in ids);forms=[];directions=[]
for e in entries:
 forms.append(json.dumps(dict(id=e['form'],play=e['id'],name=e['name'],dimension=e['dimension'],view=e['view'],action=e['action'],rhythm=e['action'],reference=e['reference'],description=e['description'],compare=e['compare'],next=e['next']),ensure_ascii=False))
 vals=[e[k] for k in ['id','title','name','family','view','reference','url']]+['assets/game-forms/foundry/previews/'+e['id']+'.webp']+[e[k] for k in ['description','scope','controls']]
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in vals)+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+'.includes(d.id))d.previewKind=d.id==="levelsmith"?"生产场景绘制预览":"同场景三维离线渲染预览";\nfor(const direction of newDirections)if(')
edit('showcase-catalog.js','"synchro","perigee"].includes','"synchro","perigee",'+quoted+'].includes')
edit('showcase.js','trajectoryIds=new Set([','foundryIds=new Set(['+quoted+']),trajectoryIds=new Set([')
edit('showcase.js','"synchro","perigee"]),originalEdition','"synchro","perigee",'+quoted+']),originalEdition')
edit('showcase.js','if(trajectoryIds.has(id)){',"if(foundryIds.has(id)){factoryModules.foundry??=await import('./showcase-foundry.js?v=20261004-1');return factoryModules.foundry.createFoundry({...options,id})}if(trajectoryIds.has(id)){")
edit('showcase.js','"perigee",\'putt\'','"perigee",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-18','showcase-catalog.js?v=20261004-19')
edit('forms.js','game-forms-catalog.js?v=20261004-15','game-forms-catalog.js?v=20261004-16')
edit('forms.html','101 种','104 种');edit('forms.html','101 FORM','104 FORM');edit('forms.html','forms.js?v=28','forms.js?v=29');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('machine-construction','six-dof','机械组装试驾 × 六自由度行动'),('level-authoring','platform','关卡创作试玩 × 既有平台跳跃')]);edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','一百零一','一百零四');edit('showcase.html','110 个','113 个');edit('showcase.html','<b>101</b>','<b>104</b>');edit('showcase.html','<b>4</b>本轮新增','<b>3</b>本轮新增');edit('showcase.html','showcase.js?v=42','showcase.js?v=43')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/foundry-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8');print('Integrated 104 forms / 113 entrances, retaining all previous entries')
