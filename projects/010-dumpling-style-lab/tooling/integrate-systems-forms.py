from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'web/showcase.js';t=p.read_text(encoding='utf-8')
branch="if(['party','district','balance','tandem'].includes(id)){const file={party:'./showcase-party.js',district:'./showcase-district.js',balance:'./showcase-balance.js',tandem:'./showcase-tandem.js'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{party:'createParty',district:'createDistrict',balance:'createBalance',tandem:'createTandem'}[id]](options)}"
if "['party','district','balance','tandem'].includes(id)" not in t:t=t.replace("if(['cargo','jewel','realm','novel'].includes(id))",branch+"if(['cargo','jewel','realm','novel'].includes(id))",1)
t=t.replace("'jewel','realm','novel'].includes(id)","'jewel','realm','novel','party','district','balance','tandem'].includes(id)")
p.write_text(t,encoding='utf-8')
p=ROOT/'web/showcase-catalog.js';t=p.read_text(encoding='utf-8')
items=""" item('party','余烬旅团','队伍与技能指令战斗','策略','队伍战斗','指令式 RPG / 队伍与目标','forms.html#forms','assets/game-forms/party/scene.webp','在天文台试炼中依次指挥近卫、术师与医师，选择技能和目标，再观察对方的真实行动。','两场队伍战斗、三个角色、单体与全体攻击、护盾、治疗、灵力恢复、敌方意图与逐次行动、战况记录。','选择当前队员技能 · 点击角色目标或目标按钮 · 三名队员行动后对方行动'),
 item('district','晨湾街区','三维城市与交通规划','策略','三维街区','城市建设 / 通勤网络','forms.html#forms','assets/showcase/previews/district.webp','补齐街区道路，建设住宅与诊所，看见车辆沿实际连通路线通勤，让海湾街区恢复运转。','三维建筑与车辆、建设预算、道路铺设与拆除、住宅与服务、真实寻路通勤和断路反馈、短场景完成。','选择道路 / 住宅 / 诊所 / 拆除工具 · 点击街区格子建设 · 观察可达性和通勤'),
 item('balance','重力工坊','真实三维刚体机关','空间','固定三维工坊','物理机关 / 抓取与支撑','forms.html#forms','assets/game-forms/balance/stone.webp','抓住并旋转桥板，把重物放到压力台，依靠真实支撑、重力与碰撞让检验车通过地沟和闸门。','真实刚体与抓取约束、旋转和放下、桥板支撑、重物压力台、实体检验车通行、失败重置与刷新恢复。','点击物件抓取 · 操作移动 / 升降 / 旋转控制 · 放下物件 · 检验通行'),
 item('tandem','同步灯桥','本地双人合作机关','动作','双人同屏','双人合作 / 同时输入','forms.html#forms','assets/game-forms/tandem/scene.webp','两个玩家同时操作工程师，配合持续压板与锁定装置，接通灯桥，并让两个人一起到达出口。','两间合作场景、两个独立输入角色、真实跳跃与平台碰撞、持续压板和双人充能、检查点恢复、独立多指触控。','P1 A/D 移动 · W / 空格跳跃；P2 左右键移动 · ↑ 跳跃；手机使用两套独立控制区'),
"""
if "item('party'" not in t:t=t.replace(" item('range'",items+" item('range'",1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/game-forms-catalog.js';t=p.read_text(encoding='utf-8')
forms=""" {id:'command-rpg',play:'party',name:'指令式 RPG 战斗',view:'队伍分列 / 技能菜单',action:'选技能 · 选目标 · 观察行动',rhythm:'判断战况 → 安排队员 → 交替行动',reference:'指令式队伍战斗',description:'队员和敌人分列在场，玩家通过技能与目标菜单安排战斗，画面突出当前行动者和受影响的对象。',compare:'对比战棋：这里不用走格，选择落在技能、队员状态与目标上。',next:'可扩展为侧面战斗、第一人称队伍、时间轴与多人指令。'},
 {id:'city-planning',play:'district',name:'城市交通规划',view:'三维街区 / 全局规划',action:'铺路 · 建设 · 拆除 · 看通勤',rhythm:'规划连通 → 安排服务 → 观察交通',reference:'城市与交通模拟',description:'玩家操作道路和建筑，车辆沿建成的网络活动，连接和拥堵让规划效果直接显示在街区里。',compare:'对比自动化工厂：关注住宅、服务与人的通勤，三维建筑和路网组成城市画面。',next:'可扩展为铁路调度、分区规划、俯视交通图与三维城市。'},
 {id:'physics-puzzle',play:'balance',name:'三维物理机关',view:'固定三维场景 / 可抓物体',action:'抓取 · 移动 · 旋转 · 放下',rhythm:'观察支撑 → 调整物体 → 实际检验',reference:'刚体与物体操作',description:'物件在三维空间有重力、接触和旋转，玩家直接调整它们的位置与姿态，以实际物理结果打开通路。',compare:'对比网格推箱：这里没有固定格子，桥板角度、重心与支撑决定机关是否成立。',next:'可扩展为自由物理沙盒、绳索装置、结构搭建与协作搬运。'},
 {id:'co-op',play:'tandem',name:'双人合作',dimension:'参与形式',view:'双人同屏 / 独立控制',action:'分别移动 · 跳跃 · 压板 · 配合',rhythm:'沟通分工 → 同时操作 → 一起通过',reference:'本地双人合作',description:'两个玩家同时控制不同角色，持续机关和相互依赖的通路要求配合，参与方式改变了整个场面。',compare:'双人合作属于参与形式，可以与平台、射击、解谜等类型结合；这里先演示同屏平台机关。',next:'可扩展为分屏合作、双人射击、角色互补与跨空间配合。'},
"""
if "id:'command-rpg'" not in t:t=t.replace(" {id:'top-action'",forms+" {id:'top-action'",1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/forms.html';t=p.read_text(encoding='utf-8').replace('32 种已接入形态','36 种已接入形态').replace('当前列出的 32 类','当前列出的 36 种形态').replace('032 FORM SAMPLES','036 FORM SAMPLES').replace('forms.js?v=7','forms.js?v=8')
t=t.replace('新增：推箱子机关','上一批：推箱子机关').replace('新增：宏观战略','上一批：宏观战略')
links='<a href="forms.html?left=command-rpg&amp;right=city-planning#compare">新增：指令式 RPG × 城市交通 ↗</a><a href="forms.html?left=physics-puzzle&amp;right=co-op#compare">新增：三维物理机关 × 双人合作 ↗</a>'
if '新增：指令式 RPG' not in t:t=t.replace('<div class="new-form-entry">','<div class="new-form-entry">'+links,1)
t=t.replace('可分别选择、真实试玩','类型、视角与参与形式')
p.write_text(t,encoding='utf-8')
p=ROOT/'web/forms.js';t=p.read_text(encoding='utf-8').replace('side.view.textContent=form.view','side.view.textContent=(form.dimension?form.dimension+\' · \':\'\')+form.view').replace("String(index+1).padStart(2,'0')+' / '+f.view","String(index+1).padStart(2,'0')+' / '+(f.dimension?f.dimension+' · ':'')+f.view")
p.write_text(t,encoding='utf-8')
p=ROOT/'web/showcase.html';t=p.read_text(encoding='utf-8').replace('三十二个扩展试玩','三十六个扩展试玩').replace('全部 41 个入口','全部 45 个入口').replace('<b>32</b>扩展方向','<b>36</b>扩展方向').replace('<b>25</b>视角与界面','<b>29</b>视角与界面').replace('41 个入口</span>','45 个入口</span>').replace('showcase.js?v=11','showcase.js?v=12')
p.write_text(t,encoding='utf-8')
print('Integrated four systems presentations:36 forms /45 entries;co-op explicitly marked participation form.')
