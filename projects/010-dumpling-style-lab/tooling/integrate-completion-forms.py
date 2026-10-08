from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'web/showcase.js';t=p.read_text(encoding='utf-8')
branch="if(['cargo','jewel','realm','novel'].includes(id)){const file={cargo:'./showcase-cargo.js',jewel:'./showcase-jewel.js',realm:'./showcase-realm.js',novel:'./showcase-novel.js'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{cargo:'createCargo',jewel:'createJewel',realm:'createRealm',novel:'createNovel'}[id]](options)}"
if "['cargo','jewel','realm','novel'].includes(id)" not in t:t=t.replace("if(['pilot','rail','archive'].includes(id))",branch+"if(['pilot','rail','archive'].includes(id))",1)
t=t.replace("'pinball','archive'].includes(id)","'pinball','archive','jewel','realm','novel'].includes(id)")
p.write_text(t,encoding='utf-8')
p=ROOT/'web/showcase-catalog.js';t=p.read_text(encoding='utf-8')
items=""" item('cargo','潮箱仓库','网格推箱与压力机关','策略','网格机关','推箱子 / 机关通路','forms.html#forms','assets/game-forms/cargo/room.webp','在仓库中推动真正挡路的货箱，压住机关，打开出口并走出三间仓库。','三间原创可解仓库、推箱阻挡、压力板与出口、路径行走、撤销、当前仓库重试与完成。','方向键 / WASD 或触屏方向移动 · 点击地面行走 / 近邻箱子推动 · C 撤销 · R 重试'),
 item('jewel','绮晶工坊','交换、掉落与三消连锁','策略','交换棋盘','三消 / 连锁整理','forms.html#forms','assets/game-forms/jewel/room.webp','在珠宝工坊交换相邻晶石，看见它们实际消除、掉落、补齐并继续形成连锁，完成双色订单。','八乘八棋盘、六种独立形状晶石、无效交换退回、重力掉落、补齐连锁、有限步数、订单与刷新续玩。','点选两个相邻晶石 / 拖动交换 · 完成琥珀与蓝晶订单 · 可重新整理棋盘'),
 item('realm','十二郡沿岸','地区与势力回合战略','策略','地区地图','宏观战略 / 地区调度','forms.html#forms','assets/game-forms/realm/map.webp','在沿岸地图管理地区收入、军力与相邻调度，观察势力归属随回合与行动真正变化。','十二个原创地区、实体邻接、收入、招募、发展、出征预览、实际占领、对方回合、回合重试与短局完成。','点击地区选择 · 招募 / 发展 · 选择出征目标并确认 · 结束回合'),
 item('novel','海岸末班信','人物对白与分支选择','故事','人物对白','互动小说 / 对话选择','forms.html#forms','assets/game-forms/novel/station.webp','末班列车前，陪工程师与调度员走过一个港口之夜。选择怎样回应，留下不同对白与结局。','两个原创成年人物、两处场景、逐字对白、对话记录、两条中段路线、三次选择、三个结局与已读记录。','点击对白 / 空格继续 · 点击选项回应 · E 查看对话记录 · 可切换即显文字'),
"""
if "item('cargo'" not in t:t=t.replace(" item('range'",items+" item('range'",1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/game-forms-catalog.js';t=p.read_text(encoding='utf-8')
forms=""" {id:'push-box',play:'cargo',name:'推箱子机关',view:'固定网格 / 实体通路',action:'走位 · 推箱 · 压板 · 出口',rhythm:'观察空间 → 推动货箱 → 打开通路',reference:'推箱子 / Sokoban',description:'玩家移动和物体位置共同改变通路，推入窄处的箱子不能随意拉回来，空间顺序决定解法。',compare:'对比几何益智：这里自己走进网格，物体实际阻挡路线，压板后还要走到出口。',next:'可扩展为俯视机关、等距推箱、双角色协作与连续房间。'},
 {id:'match-three',play:'jewel',name:'三消连锁',view:'固定交换棋盘 / 掉落补齐',action:'交换 · 消除 · 掉落 · 连锁',rhythm:'找相邻交换 → 实际消除 → 观察连锁',reference:'三消 / Match-three',description:'通过交换已有物件形成排列，掉落与新物件继续改变棋盘，连锁反馈占据画面中心。',compare:'对比方块下落：操作直接落在现有棋盘的两个物件上，补齐后可能再次自动消除。',next:'可扩展为六角棋盘、旋转交换、物理堆叠与合作整理。'},
 {id:'grand-strategy',play:'realm',name:'宏观战略',view:'地区地图 / 势力边界',action:'招募 · 发展 · 调度 · 占领',rhythm:'看整体势力 → 安排行动 → 结算回合',reference:'地区战略 / 势力调度',description:'玩家操作的是地区、资源与军力，地区归属和邻接关系把局势直接表达在地图上。',compare:'对比即时战略：单位不在场景里持续走位，玩家通过地区调度与回合结算改变局势。',next:'可扩展为世界地图、六角区域、时代变化与多势力外交。'},
 {id:'visual-novel',play:'novel',name:'互动小说',view:'场景 / 人物立绘 / 对话框',action:'阅读 · 回应 · 选择 · 回看',rhythm:'理解对白 → 选择回应 → 看到另一种后续',reference:'互动小说 / Visual novel',description:'人物、对白与选项构成主要画面，玩家的回应决定后续台词、关系表达和不同结局。',compare:'对比点击冒险：目光落在人物表达与对白选择上，推进主要来自回应而不是道具使用。',next:'可扩展为漫画分镜、全屏文字、电话聊天与舞台式叙事。'},
"""
if "id:'push-box'" not in t:t=t.replace(" {id:'top-action'",forms+" {id:'top-action'",1)
p.write_text(t,encoding='utf-8')
p=ROOT/'web/forms.html';t=p.read_text(encoding='utf-8').replace('28 种已接入形态','32 种已接入形态').replace('028 FORM SAMPLES','032 FORM SAMPLES').replace('forms.js?v=6','forms.js?v=7').replace('forms.css?v=1','forms.css?v=2')
t=t.replace('新增：三维飞行 × 轨道射击','上一批：三维飞行 × 轨道射击').replace('新增：点击解谜 × 横版探索','上一批：点击解谜 × 横版探索')
links='<a href="forms.html?left=push-box&amp;right=match-three#compare">新增：推箱子机关 × 三消连锁 ↗</a><a href="forms.html?left=grand-strategy&amp;right=visual-novel#compare">新增：宏观战略 × 互动小说 ↗</a>'
if '新增：推箱子机关' not in t:t=t.replace('<div class="new-form-entry">','<div class="new-form-entry">'+links,1)
variation='''<section class="pending-section"><div class="section-head"><div><p class="eyebrow">NEXT PRESENTATIONS</p><h2>同一种类型，还可以怎样呈现。</h2></div><p>当前列出的 32 类均有可玩入口。<br>也可以继续比较镜头、舞台与操作形式的变体。</p></div><div class="variation-forms"><article><h3>改变镜头</h3><p>固定单屏、横竖滚屏、越肩、座舱与自由环绕。</p></article><article><h3>改变空间</h3><p>二维舞台、等距棋盘、立体房间与可编辑世界。</p></article><article><h3>改变参与方式</h3><p>单角色、双角色协作、队伍调度与多方对抗。</p></article><article><h3>改变信息界面</h3><p>漫画分镜、电话聊天、档案工作台与全屏文字。</p></article></div></section>'''
t=re.sub(r'<section class="pending-section">[\s\S]*?</section>',variation,t,count=1);p.write_text(t,encoding='utf-8')
p=ROOT/'web/forms.css';t=p.read_text(encoding='utf-8').replace('.pending-forms','.variation-forms');p.write_text(t,encoding='utf-8')
p=ROOT/'web/showcase.html';t=p.read_text(encoding='utf-8').replace('二十八个扩展试玩','三十二个扩展试玩').replace('全部 37 个入口','全部 41 个入口').replace('<b>28</b>扩展方向','<b>32</b>扩展方向').replace('<b>21</b>视角与界面','<b>25</b>视角与界面').replace('37 个入口</span>','41 个入口</span>').replace('showcase.js?v=10','showcase.js?v=11');p.write_text(t,encoding='utf-8')
print('Integrated cargo, jewel, realm and novel;32 forms /41 entries;0 pending cards')
