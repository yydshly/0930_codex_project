from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,old,new):
    path=ROOT/'web'/name
    text=path.read_text(encoding='utf-8')
    assert old in text,(name,old)
    path.write_text(text.replace(old,new),encoding='utf-8')

edit('showcase.js',"if(['command','bastion','tactics'].includes(id))", "if(['sports','stealth','pinball'].includes(id)){const file={sports:'./showcase-sports.js',stealth:'./showcase-stealth.js',pinball:'./showcase-pinball.js'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{sports:'createSports',stealth:'createStealth',pinball:'createPinball'}[id]](options)}if(['command','bastion','tactics'].includes(id))")
edit('showcase.js',"['ledger','checkpoint','factory','garden','rhythm','bastion','tactics'].includes(id)","['ledger','checkpoint','factory','garden','rhythm','bastion','tactics','pinball'].includes(id)")
edit('showcase.js',"'duel','command','expedition','builder','order'","'duel','command','sports','stealth','expedition','builder','order'")
edit('showcase.js',"$('#touch-jump').textContent=id==='command'", "$('#touch-jump').textContent=id==='sports'?'射门':id==='stealth'?'读取':id==='command'")
edit('showcase.js',"'coast','duel','command'].includes(id)","'coast','duel','command','sports','stealth'].includes(id)")
edit('showcase.js',"$('#touch-interact').textContent=id==='command'", "$('#touch-interact').textContent=id==='sports'?'传球':id==='stealth'?'读取':id==='command'")
catalog=""" item('sports','黄昏球场','整场俯视体育竞技','动作','球场俯视','小场足球 / 球队竞技','forms.html#forms','assets/game-forms/sports/scene.webp','控制青队的三名场上队员，传球、跑位、瞄准球门空隙射门，与主动追球的红队进行短场比赛。','双方三名场上队员与门将、真实球体、传球接球、抢断、扑救、三球或九十秒比赛、刷新续赛。','方向键 / WASD 移动 · R 冲刺 · E 传球 · 空格射门 · C 切人 · 点队友传球 / 点球门瞄准'),
 item('stealth','夜庭潜行','俯视隐蔽行动','故事','视野与遮挡','巡逻潜行 / 隐蔽路线','forms.html#forms','assets/game-forms/stealth/scene.webp','穿过夜间庭院，绕开巡逻视野，读取三处终端，再从东侧出口安全离场。','四组实体建筑、三名巡逻者、被建筑截断的视野、蹲行与脚步声、路线规划、声响引诱、终端检查点与重试。','方向键 / WASD 移动 · 点通路绕行 · C 蹲行 / 快走 · E 读取 / 离场 · R 向鼠标处投掷声响'),
 item('pinball','星轨弹球','实体机台物理弹球','动作','固定机台','物理弹球 / Pinball','forms.html#forms','assets/game-forms/pinball/scene.webp','在星图机台上发射钢球，用左右挡板接住回落，撞击弹击器并点亮四颗星灯。','连续重力与反弹、转动挡板表面速度、弹击器、四星奖励、蓄力开球、有限推台、三颗球与最高分。','A/D 或左右键控制挡板 · 按住空格蓄力 / 松开发球 · E 推台 · 按住机台左右半区操作'),
"""
edit('showcase-catalog.js'," item('range',",catalog+" item('range',")
forms=""" {id:'sports',play:'sports',name:'体育竞技',view:'整场俯视 / 双方球队',action:'跑位 · 传球 · 射门 · 切换队员',rhythm:'看空当 → 传接跑位 → 瞄准射门',reference:'小场足球 / 球队竞技',description:'场地、球体和两支球队组织画面；玩家在不同队员之间切换，球的位置决定攻防变化。',compare:'看球和人物分别运动，队友接球与对手追球怎样改变比赛。',next:'可继续扩展篮球、网球、街头足球、侧面体育与跟球镜头。'},
 {id:'stealth',play:'stealth',name:'潜行行动',view:'俯视庭院 / 巡逻视野',action:'绕行 · 蹲行 · 引诱 · 读取',rhythm:'观察巡逻 → 利用遮挡 → 通过通路',reference:'巡逻潜行 / 隐蔽路线',description:'巡逻视野、建筑遮挡与声音构成局势；避开确认比正面战斗更重要。',compare:'看建筑截断视野、蹲行消除脚步声，以及声响如何改变守卫路线。',next:'可继续扩展侧面潜入、越肩潜行、固定机位、换装与阴影空间。'},
 {id:'pinball',play:'pinball',name:'物理弹球',view:'固定机台 / 独立球体',action:'蓄力 · 发球 · 接球 · 反弹',rhythm:'看回落轨迹 → 转挡板 → 连续弹击',reference:'物理弹球 / Pinball',description:'机台同屏可见，球的重力、碰撞与挡板转动构成操作反馈；无需操控人物。',compare:'看球如何自由运动，转动的挡板如何真正改变反弹力度与方向。',next:'可继续扩展多球、倾斜机台、坡道、弹射机关与不同机台。'},
"""
edit('game-forms-catalog.js'," {id:'top-action',",forms+" {id:'top-action',")
edit('forms.html','22 种已接入形态','25 种已接入形态')
edit('forms.html','022 FORM SAMPLES','025 FORM SAMPLES')
edit('forms.html','forms.js?v=4','forms.js?v=5')
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry"><a href="forms.html?left=sports&amp;right=stealth#compare">新增：体育竞技 × 潜行行动 ↗</a><a href="forms.html?left=pinball&amp;right=board#compare">新增：物理弹球 × 几何益智 ↗</a>')
edit('forms.html','新增：即时战略','上一批：即时战略')
edit('forms.html','新增：塔防','上一批：塔防')
edit('forms.html','<article><h3>体育</h3><p>运动场地、球体、阵形与比赛镜头。</p></article><article><h3>潜行</h3><p>视野范围、遮挡、角色姿态与隐蔽路线。</p></article>', '<article><h3>飞行驾驶</h3><p>驾驶舱、倾斜、升降与立体航线。</p></article><article><h3>轨道射击</h3><p>镜头自动推进，集中瞄准与射击。</p></article><article><h3>点击解谜</h3><p>调查场景、寻找、组合与使用物品。</p></article><article><h3>推箱子机关</h3><p>推拉物体、改变通路与机关状态。</p></article><article><h3>三消连锁</h3><p>交换、消除、掉落与连续连锁。</p></article><article><h3>宏观战略</h3><p>地区地图、势力边界与回合调度。</p></article>')
edit('showcase.html','二十二个扩展试玩','二十五个扩展试玩')
edit('showcase.html','<b>22</b>扩展方向','<b>25</b>扩展方向')
edit('showcase.html','<b>15</b>视角与界面','<b>18</b>视角与界面')
edit('showcase.html','31','34')
edit('showcase.html','showcase.js?v=8','showcase.js?v=9')
print('Integrated 25 presentation forms / 34 entries; preserved prior order and worlds')
