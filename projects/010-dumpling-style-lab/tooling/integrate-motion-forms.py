from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
for game,old in {'putt':'district','signal':'district','angler':'pilot','battery':'party'}.items():
    target=ROOT/'web/assets/showcase/previews'/f'{game}.webp'
    if not target.exists():shutil.copy2(ROOT/'web/assets/showcase/previews'/f'{old}.webp',target)
p=ROOT/'web/showcase.js';t=p.read_text(encoding='utf-8')
branch="if(['putt','signal','angler','battery'].includes(id)){const file={putt:'./showcase-putt.js',signal:'./showcase-signal.js',angler:'./showcase-angler.js',battery:'./showcase-battery.js'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{putt:'createPutt',signal:'createSignal',angler:'createAngler',battery:'createBattery'}[id]](options)}"
if "['putt','signal','angler','battery'].includes(id)" not in t:t=t.replace("if(['party','district','balance','tandem'].includes(id))",branch+"if(['party','district','balance','tandem'].includes(id))",1)
# Remove unreachable IDs left by older broad replacements; dedicated branches above handle those factories.
t=t.replace("if(['cargo','jewel','realm','novel','party','district','balance','tandem'].includes(id))","if(['cargo','jewel','realm','novel'].includes(id))")
t=t.replace("if(['ledger','checkpoint','factory','garden','rhythm','bastion','tactics','pinball','archive','jewel','realm','novel','party','district','balance','tandem'].includes(id))","if(['ledger','checkpoint','factory','garden'].includes(id))")
t=t.replace("$('#touch-bar').hidden=d.legacy||['ledger'","$('#touch-bar').hidden=d.legacy||['putt','signal','angler','battery','ledger'")
p.write_text(t,encoding='utf-8')
p=ROOT/'web/showcase-catalog.js';t=p.read_text(encoding='utf-8')
items=""" item('putt','海岬果岭','真实三维迷你高尔夫','空间','三维球道','挥杆与球道 / 迷你高尔夫','forms.html#forms','assets/showcase/previews/putt.webp','判断方向与力度，看球沿真实三维球道滚动、碰壁反弹并落入洞杯。','多洞短球场、方向与力度、实体滚动与球道碰撞、入洞判定、杆数与刷新恢复。','调整方向与力度 · 挥杆 · 等球停稳后继续下一杆'),
 item('signal','岔口信号','三维铁路信号调度','策略','三维轨道','铁路调度 / 道岔与信号','forms.html#forms','assets/showcase/previews/signal.webp','观察列车去向与共享区段，调整道岔和信号，让各班列车真正抵达正确车站。','实体列车和轨道、区段占用、道岔与红绿灯、正确与错误到站、冲突失败、短班次和刷新续程。','观察列车目的站 · 改道岔 · 信号停放 · 避免区段冲突'),
 item('angler','暮湾浮标','三维水面垂钓','生活','水面与鱼线','垂钓 / 咬钩与张力','forms.html#forms','assets/showcase/previews/angler.webp','在黄昏海湾选择落点，读浮标咬钩信号，用收线和松线控制鱼线张力。','三维岸边与水面、抛竿、咬钩时机、不同鱼的拉力、真实收线距离、断线与脱钩、短任务完成。','选择落点与力度 · 抛竿 · 及时扬竿 · 按住收线或松线'),
 item('battery','岬湾炮阵','回合弹道与可破坏山地','策略','固定山地侧面','回合炮战 / 风力与抛物线','forms.html#forms','assets/showcase/previews/battery.webp','调节炮口角度和力度，在风力与重力下发射炮弹，看实际落点改变地形和炮位装甲。','双方轮流发射、实际抛物线、风力、预估弧线、爆炸范围伤害、持续地形弹坑、胜败与刷新续战。','角度和力度滑杆 · 发射炮弹 · 左右调角 / 上下调力度 · 空格发射'),
"""
if "item('putt'" not in t:t=t.replace(" item('range'",items+" item('range'",1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/game-forms-catalog.js';t=p.read_text(encoding='utf-8')
forms=""" {id:'mini-golf',play:'putt',name:'三维迷你高尔夫',view:'三维球道 / 挥杆瞄准',action:'定方向 · 控力度 · 挥杆 · 入洞',rhythm:'观察球道 → 击球滚动 → 停稳再判断',reference:'迷你高尔夫 / 蓄力击球',description:'玩家操作的是球的方向与初始力度，球沿球道持续运动，墙壁、拐角和洞杯表达结果。',compare:'对比足球：这里没有跑位和球队，球停稳后才能安排下一杆。',next:'可扩展为坡道球场、俯视桌面、自由球场与多人轮流击球。'},
 {id:'train-dispatch',play:'signal',name:'铁路信号调度',view:'三维铁路 / 区段控制',action:'看去向 · 转道岔 · 停车 · 放行',rhythm:'判断区段 → 安排先后 → 抵达正确车站',reference:'铁路调度 / 道岔和信号',description:'轨道已铺好，玩家调整信号和岔口，列车以自己的速度沿当前线路运行，交汇区段要求安排先后。',compare:'对比城市规划：这次不建造路网，注意列车去向、区段占用和放行时机。',next:'可扩展为二维线路图、多枢纽、车内驾驶与多人调度。'},
 {id:'fishing',play:'angler',name:'垂钓与收线',view:'三维水面 / 浮标与鱼线',action:'抛竿 · 读咬钩 · 扬竿 · 收松线',rhythm:'等待信号 → 及时扬竿 → 控制拉扯',reference:'垂钓 / 拉力与张力',description:'浮标、水面和鱼线成为主要操作对象，等待、咬钩窗口与持续拉扯共同组织节奏。',compare:'对比生活经营：这里集中于一次抛竿后的时间判断和连续张力控制。',next:'可扩展为船钓、第一人称钓竿、俯视水域与合作垂钓。'},
 {id:'artillery',play:'battery',name:'回合弹道炮战',view:'固定侧面 / 完整山地',action:'调角 · 定力度 · 发射 · 看弹坑',rhythm:'判断风向 → 预估抛物线 → 双方轮流发射',reference:'回合炮战 / 地形与弹道',description:'双方炮位固定在完整山地里，角度、初速与风力共同决定实际落点，爆炸持续改变地形与支撑高度。',compare:'对比横版跑射：没有持续行走和连射，主要决定是一发炮弹的角度、力度与落点。',next:'可扩展为多人轮流、移动炮位、不同投射物与三维弹道。'},
"""
if "id:'mini-golf'" not in t:t=t.replace(" {id:'top-action'",forms+" {id:'top-action'",1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/forms.html';t=p.read_text(encoding='utf-8').replace('36 种已接入形态','40 种已接入形态').replace('当前列出的 36 种形态','当前列出的 40 种形态').replace('036 FORM SAMPLES','040 FORM SAMPLES').replace('forms.js?v=8','forms.js?v=9').replace('新增：指令式 RPG','上一批：指令式 RPG').replace('新增：三维物理机关','上一批：三维物理机关')
links='<a href="forms.html?left=mini-golf&amp;right=train-dispatch#compare">新增：迷你高尔夫 × 铁路调度 ↗</a><a href="forms.html?left=fishing&amp;right=artillery#compare">新增：垂钓 × 回合炮战 ↗</a>'
if '新增：迷你高尔夫' not in t:t=t.replace('<div class="new-form-entry">','<div class="new-form-entry">'+links,1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/showcase.html';t=p.read_text(encoding='utf-8').replace('三十六个扩展试玩','四十个扩展试玩').replace('全部 45 个入口','全部 49 个入口').replace('<b>36</b>扩展方向','<b>40</b>扩展方向').replace('<b>29</b>视角与界面','<b>33</b>视角与界面').replace('45 个入口</span>','49 个入口</span>').replace('showcase.js?v=12','showcase.js?v=13')
p.write_text(t,encoding='utf-8')
print('Integrated four new forms: 40 forms / 49 entries.')
