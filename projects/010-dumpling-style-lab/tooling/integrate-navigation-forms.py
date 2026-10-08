from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,old,new):
    p=ROOT/'web'/name;t=p.read_text(encoding='utf-8');assert old in t,(name,old);p.write_text(t.replace(old,new),encoding='utf-8')
edit('showcase.js',"if(['sports','stealth','pinball'].includes(id))", "if(['pilot','rail','archive'].includes(id)){const file={pilot:'./showcase-pilot.js',rail:'./showcase-rail.js',archive:'./showcase-archive.js'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{pilot:'createPilot',rail:'createRail',archive:'createArchive'}[id]](options)}if(['sports','stealth','pinball'].includes(id))")
edit('showcase.js',"'tactics','pinball'].includes(id)","'tactics','pinball','archive'].includes(id)")
edit('showcase.js',"'sports','stealth','expedition'","'sports','stealth','pilot','rail','expedition'")
edit('showcase.js',"$('#touch-jump').textContent=id==='sports'", "$('#touch-jump').textContent=id==='pilot'?'水平':id==='rail'?'躲避':id==='sports'")
edit('showcase.js',"'sports','stealth'].includes(id)","'sports','stealth','pilot'].includes(id)")
edit('showcase.js',"$('#touch-interact').textContent=id==='sports'", "$('#touch-interact').textContent=id==='pilot'?'镜头':id==='sports'")
edit('showcase.js',"'duel','maze'].includes(id)","'duel','maze','rail'].includes(id)")
edit('showcase.js',"$('#touch-attack').textContent=id==='maze'", "$('#touch-attack').textContent=id==='rail'?'开火':id==='maze'")
catalog=""" item('pilot','星环试航','自由三维飞行驾驶','空间','机后 / 座舱','三维飞行驾驶 / 自由航向','https://kenney.nl/assets/space-kit','assets/game-forms/pilot/sky.webp','驾驶立体飞船，改变航向、俯仰与速度，飞过八座信标，在机后与座舱镜头之间切换。','原创全景天空、八座三维光环、自由航向与升降、真实模型、碰撞、加速、减速、双镜头与信标重定位。','WASD / 方向键转向与升降 · 拖动转向 · C 加速 · R 减速 · 空格恢复水平 · E 切换镜头'),
 item('rail','回廊巡航','镜头驱动轨道射击','动作','自动巡航视角','轨道射击 / 自动镜头','forms.html#forms','assets/game-forms/pilot/sky.webp','沿三维回廊自动推进，瞄准陆续进入场面的无人机，换弹、躲避红色弹道，完成三段巡航。','三段三维回廊、十二台无人机、射线命中、九发弹匣、换弹、敌方实体弹道、压低镜头、阶段重试与完成。','移动鼠标 / 方向键瞄准 · 点击 / J 开火 · R 换弹 · 空格压低镜头避弹'),
 item('archive','潮灯档案','固定场景点击解谜','故事','房间切换 / 道具栏','点击冒险 / 调查与使用','forms.html#forms','assets/game-forms/archive/lobby.webp','调查三个海岸档案馆房间，取得线索，组合工具，修复能源与望远镜，让远处航标重新点亮。','三张原创房间、六件道具美术、场景热点、道具选择与组合、三象锁盒、正确与错误反馈、能源与镜片修复。','点房间对象调查 · 点道具选择，再点场景使用 · 组合木柄与铁撬头 · 星图提示锁盒顺序'),
"""
edit('showcase-catalog.js'," item('range',",catalog+" item('range',")
forms=""" {id:'flight-sim',play:'pilot',name:'三维飞行驾驶',view:'机后追踪 / 座舱',action:'转向 · 升降 · 加速 · 穿环',rhythm:'观察航向 → 调整姿态 → 通过信标',reference:'三维飞行驾驶 / 自由航向',description:'玩家控制航向和俯仰，飞机或飞船真正穿过三维空间；远处信标与姿态仪表达方向关系。',compare:'对比竖向飞行射击：这里驾驶的是三维空间里的飞船，镜头与飞行姿态一起改变。',next:'可继续扩展飞机、驾驶舱仪表、地面航线、着陆与自由飞行。'},
 {id:'rail-shooter',play:'rail',name:'轨道射击',view:'自动巡航 / 自由准星',action:'瞄准 · 射击 · 换弹 · 避弹',rhythm:'镜头进入场景 → 发现目标 → 瞄准命中',reference:'轨道射击 / 自动镜头',description:'镜头自动带玩家前进，玩家集中处理准星、目标与弹道，不需要同时控制角色行走。',compare:'对比第一人称射击：场景推进由镜头承担，玩家的注意力集中在目标与操作时机。',next:'可继续扩展双人光枪、分岔镜头、载具巡航与固定位置射击。'},
 {id:'point-click',play:'archive',name:'点击解谜冒险',view:'固定房间 / 场景切换',action:'调查 · 拾取 · 组合 · 使用',rhythm:'看场景线索 → 组合物品 → 打开下一处',reference:'点击冒险 / 调查与使用',description:'房间作为完整画面呈现，玩家直接调查场景对象，把道具带到其他位置使用。',compare:'没有人物移动，操作落在场景热点、道具栏与房间切换上；观察和使用形成推进。',next:'可继续扩展近景调查、证据组合、多人物视角与手绘逐帧演出。'},
"""
edit('game-forms-catalog.js'," {id:'top-action',",forms+" {id:'top-action',")
edit('forms.html','25 种已接入形态','28 种已接入形态');edit('forms.html','025 FORM SAMPLES','028 FORM SAMPLES');edit('forms.html','forms.js?v=5','forms.js?v=6')
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry"><a href="forms.html?left=flight-sim&amp;right=rail-shooter#compare">新增：三维飞行 × 轨道射击 ↗</a><a href="forms.html?left=point-click&amp;right=side-story#compare">新增：点击解谜 × 横版探索 ↗</a>')
edit('forms.html','新增：体育竞技','上一批：体育竞技');edit('forms.html','新增：物理弹球','上一批：物理弹球')
for text in ['<article><h3>飞行驾驶</h3><p>驾驶舱、倾斜、升降与立体航线。</p></article>','<article><h3>轨道射击</h3><p>镜头自动推进，集中瞄准与射击。</p></article>','<article><h3>点击解谜</h3><p>调查场景、寻找、组合与使用物品。</p></article>']:edit('forms.html',text,'')
edit('showcase.html','二十五个扩展试玩','二十八个扩展试玩');edit('showcase.html','<b>25</b>扩展方向','<b>28</b>扩展方向');edit('showcase.html','<b>18</b>视角与界面','<b>21</b>视角与界面');edit('showcase.html','34','37');edit('showcase.html','showcase.js?v=9','showcase.js?v=10')
edit('showcase.html','</head>','<link rel="stylesheet" href="showcase-navigation.css?v=1"></head>')
print('Integrated 28 forms / 37 gallery entries, four pending forms.')
