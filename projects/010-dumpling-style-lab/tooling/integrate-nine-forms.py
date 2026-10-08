from pathlib import Path
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
 ('grappling','hook','抓钩跑酷','风隙航渡','空间','侧面峡谷 / 连续摆荡','挂点 · 收绳 · 摆荡 · 释放','借挂点摆过峡谷，松绳时保留真实速度，落到平台继续前行。','对比切绳送物：玩家持续控制自身通行，挂点、加速与释放组成路线。','一段峡谷、三挂点、重力和绳长约束、主动收绳、摆荡加速、惯性释放、中途平台和独立保存；首版采用侧面单屏。','A Story About My Uncle','https://store.steampowered.com/app/278360/'),
 ('perspective-illusion','fold','错视空间','折光回廊','空间','三维等距投影 / 可旋转镜头','旋转镜头 · 看重合 · 沿路前行','建筑桥端在不同视角下有不同的投影关系，对齐后才形成错视通路。','对比普通三维空间解谜：镜头本身改变通路连接，深度与屏幕重合共同组织判断。','四组建筑、八个三维节点、真实等距投影、镜头平滑旋转、端点距离判定、步行和独立保存；使用 Canvas 软件投影。','Monument Valley','https://monumentvalleygame.squarespace.com/blog/2014/5/9/how-we-made-monument-valley-what-do-you-want-to-know-1'),
 ('object-restoration','repair','物件拆装修复','时光修复铺','故事','近距离工作台 / 分层物件','拆盖 · 清洁 · 拖动 · 旋转 · 安装','在真实材质工作台拆开怀表，把机芯、表盘和后盖依次复位，最后测试运行。','对比文书调查：直接操作物件的部件、方向和装配次序，修复后的物件成为结果。','原创怀表四层素材、移盖清洁、零件拖放、方向和前置层检查、拆下顶层、辅助选件/移动/安装、运行测试和独立保存。','Assemble with Care','https://www.assemblegame.com/'),
 ('terrain-digging','delve','地形挖掘','深层回声','空间','侧面地层 / 纵向跟随','挖掘 · 开路 · 收矿 · 下潜','玩家挖出的地形持续变为洞道，深度变化带动镜头，矿脉逐步显露。','对比平台跳跃：可通行空间由玩家开凿，路径不是预先固定的台阶。','12×22 可挖地层、逐格开路、矿脉收集、纵向跟随、底层信标、键盘/邻格点按/原生按钮和独立保存。','SteamWorld Dig','https://store.steampowered.com/app/252410/SteamWorld_Dig/'),
 ('rolling-collection','cluster','滚动吸附成长','收藏物语','动作','俯视庭院 / 尺度变化','滚动 · 吸附 · 增长 · 改变镜头尺度','从小物件开始滚动收集，物件实际附着在球体上，体积逐渐增大。','对比惯性滚球：目标转向吸附和尺寸门槛，世界物件转移到球体，镜头随体积变化。','28 件原创收藏物、吸附尺寸门槛、物件真实附着、体积增长、镜头拉远、目标导航/连续移动和独立保存；首版采用俯视。','Katamari Damacy','https://www.bandainamcoent.com/games/katamari-damacy-reroll'),
 ('ink-territory','paint','涂地与形态切换','流彩工场','动作','俯视场地 / 可覆盖地表','喷涂 · 覆盖 · 潜行 · 恢复','颜色覆盖实际场地，角色在自己的颜色中快速潜行，对手不断重涂。','对比划线围地：不等待路径闭合，喷涂直接改变地表与移动条件。','24×12 实际地表、青色/珊瑚覆盖、移动对手、颜料消耗和恢复、自己的颜色内加速、75 秒短局、58% 目标和独立保存。','Splatoon','https://splatoon.nintendo.com/es/gameplay/'),
 ('squad-following','swarm','小队跟随搬运','苔庭小队','策略','庭院 / 主角与群体','带队 · 分组 · 派遣 · 搬物 · 修桥','一群队员跟随主角，根据实际人数搬运物件，送回材料后修复通路。','对比大地图即时战略：玩家置身群体中，队员围绕主角、货物与工作点活动。','12 名独立队员、3/6/12 分队规模、人数到位后搬运、三件材料、左岸修桥后右岸通行、召回归队和独立保存。','Pikmin 4','https://pikmin4.nintendo.com/'),
 ('service-workflow','kitchen','订单服务与连续工序','夜港晚餐','动作','厨房 / 多工位服务','取料 · 切配 · 烹调 · 交付','在多个工位间移动，连续加工食材，让同时等待的订单得到实际交付。','对比慢节奏生活经营：多个订单同时倒计时，取料和工序位置决定移动路线。','三份同时等待订单、四工位、手持食材状态、三次切配、四秒烹调、取汤交付、等待结束和独立保存；首版为单人厨房工序。','Overcooked! 2','https://store.steampowered.com/app/728880/Overcooked_2/'),
 ('asymmetric-coop','relay','信息不对称合作','雾海协作台','故事','操作端 / 说明端','描述信息 · 读规则 · 调整 · 核对','两人分别看到装置序号和说明规则，交流后操作线路、旋钮与脉冲。','对比双人同屏机关：双方掌握不同信息，沟通成为主要操作。','操作/说明端隔离、序号规则、两条线路、旋钮和脉冲核对、三步完成、错误反馈和独立保存；首版为同设备交接式双端，不含跨设备联机。','Keep Talking and Nobody Explodes','https://keeptalkinggame.com/')
]
def edit(name,old,new):
 f=W/name;s=f.read_text(encoding='utf-8');assert old in s,(name,old);f.write_text(s.replace(old,new),encoding='utf-8')
forms=[];directions=[]
for form,id,name,title,family,view,action,description,compare,scope,reference,url in entries:
 forms.append(repr(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=reference,description=description,compare=compare,next='可沿本方向扩展更多舞台、镜头、工具与参与方式。')).replace("'",'"'))
 controls='方向键 / WASD 或原生按钮操作 · 场景点按 / 下方操作区 · P 暂停'
 directions.append('item('+','.join(repr(x) for x in [id,title,name,family,view,reference,url,'assets/game-forms/nine/previews/'+id+'.webp',description,scope,controls])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const direction of newDirections)if(')
ids=','.join(repr(x[1]) for x in entries)
edit('showcase-catalog.js',"'bubble','sonar'].includes", "'bubble','sonar',"+ids+'].includes')
edit('showcase.js',"premiumIds=new Set([",'nineIds=new Set(['+ids+']),premiumIds=new Set([')
edit('showcase.js',"'bubble','sonar']),originalEdition", "'bubble','sonar',"+ids+']),originalEdition')
edit('showcase.js','if(premiumIds.has(id)){','if(nineIds.has(id)){factoryModules.nine??=await import(\'./showcase-nine.js?v=20261004-1\');return factoryModules.nine.createNine({...options,id})}if(premiumIds.has(id)){')
edit('showcase.js',"'bubble','sonar','putt'", "'bubble','sonar',"+ids+",'putt'")
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-8','showcase-catalog.js?v=20261004-9')
edit('forms.js','game-forms-catalog.js?v=20261004-5','game-forms-catalog.js?v=20261004-6')
edit('forms.html','51 种','60 种');edit('forms.html','051 FORM','060 FORM');edit('forms.html','forms.js?v=18','forms.js?v=19')
edit('forms.html','本轮新增：泡泡','上一批：泡泡')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('grappling','perspective-illusion','抓钩跑酷 × 错视空间'),('object-restoration','terrain-digging','拆装修复 × 地形挖掘'),('rolling-collection','ink-territory','吸附成长 × 涂地切换'),('squad-following','service-workflow','小队搬运 × 订单服务'),('asymmetric-coop','co-op','信息分工 × 同屏合作')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','五十一','六十');edit('showcase.html','60 个','69 个');edit('showcase.html','<b>51</b>','<b>60</b>');edit('showcase.html','<b>2</b>本轮新增','<b>9</b>本轮新增');edit('showcase.html','showcase.js?v=32','showcase.js?v=33')
print('9 forms integrated: 60 forms / 69 entrances.')
