from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'web'
def update(name,old,new):
    path=WEB/name;text=path.read_text(encoding='utf-8');assert old in text,(name,old);path.write_text(text.replace(old,new),encoding='utf-8')
update('showcase.js',"if(['duel','maze','rhythm'].includes(id))","if(['command','bastion','tactics'].includes(id)){const file={command:'./showcase-command.js',bastion:'./showcase-bastion.js',tactics:'./showcase-tactics.js'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{command:'createCommand',bastion:'createBastion',tactics:'createTactics'}[id]](options)}if(['duel','maze','rhythm'].includes(id))")
update('showcase.js',"['ledger','checkpoint','factory','garden','rhythm'].includes(id)","['ledger','checkpoint','factory','garden','rhythm','bastion','tactics'].includes(id)")
update('showcase.js',"'coast','duel','expedition'","'coast','duel','command','expedition'")
update('showcase.js',"id==='hunter'?'闪避'","id==='command'?'全选':id==='hunter'?'闪避'")
update('showcase.js',"'brawler','coast','duel'].includes(id)","'brawler','coast','duel','command'].includes(id)")
update('showcase.js',"id==='duel'?'踢击'","id==='command'?'招募':id==='duel'?'踢击'")
items=""" item('command','铜沙指挥部','多单位即时战略','策略','俯视大地图','StarCraft / 星际争霸','https://starcraft2.blizzard.com/','assets/game-forms/command/scene.webp','框选多个单位，在可移动的大地图上调度编队、招募与战斗，接通三座信标。','原创战场、框选、编队移动、侦察车/飞行器、矿线收入、招募、守军与哨塔、占领和小地图。','框选 / 点击单位 · 点地面移动 / 点守军进攻 · WASD 移动地图 · 空格全选 · E 招募'),
 item('bastion','暮林守望','固定路线塔防','策略','固定通路','Kingdom Rush / 王国保卫战','https://www.kingdomrush.com/','assets/game-forms/bastion/scene.webp','在石路两侧部署连弩、霜塔和迫击，观察敌群沿通路行进，调整射程与火力组合。','五波敌群、八处部署点、三种塔、实体投射物、减速与范围伤害、升级回收、城门生命与波前重试。','先选择塔，再点部署点 · 点击已有塔查看范围 · R 升级 · 空格 / E 开始下一波'),
 item('tactics','星台棋阵','等距回合战棋','策略','等距棋盘','Final Fantasy Tactics / 最终幻想战略版','https://www.square-enix.com/','assets/game-forms/tactics/scene.webp','轮流操作近卫、弩手与医师，在等距棋盘上走格、选择攻击和治疗，预览敌方行动。','八乘八棋阵、三名队员、四名对手、阻挡与射线、移动范围、远近攻击、治疗、防守、敌方回合与回合重试。','点队员选择 · 点蓝格移动 / 点敌人攻击 · 医师可选治疗 · C 防守 · E / 空格结束回合'),
"""
update('showcase-catalog.js'," item('range'",items+" item('range'")
forms=""" {id:'rts',play:'command',name:'即时战略',view:'可移动大地图 / 多单位俯视',action:'框选 · 调度 · 招募 · 占领',rhythm:'看局势 → 选编队 → 实时调度',reference:'星际争霸 / StarCraft',description:'多个单位同时活动，玩家的主要角色是指挥者，地图、编队和目标共同组织画面。',compare:'看多个单位如何响应同一个指令，地图移动与小地图怎样表达全局。',next:'可继续扩展战争迷雾、建筑布局、采集单位、分组指令与阵营。'},
 {id:'tower-defense',play:'bastion',name:'塔防',view:'固定地图 / 连续通路',action:'部署 · 看射程 · 升级 · 拦截',rhythm:'安排防线 → 放行敌群 → 调整火力',reference:'王国保卫战 / Kingdom Rush',description:'敌人沿既定路线推进，部署位置与持续自动火力成为主要画面内容。',compare:'看通路、塔的位置、射程和敌群变化；玩家主要改变防线结构。',next:'可继续扩展可改道通路、多出口、自由布塔与侧面防线。'},
 {id:'turn-tactics',play:'tactics',name:'回合战棋',view:'等距格子战场 / 多角色',action:'选队员 · 走格 · 攻击 · 治疗',rhythm:'预览范围 → 选择行动 → 交替回合',reference:'最终幻想战略版 / Final Fantasy Tactics',description:'移动和行动分配给每一名队员，格子范围、站位和敌方回合清楚呈现决策。',compare:'对比即时战略：这里可以停下来判断，每个角色按回合消耗移动和行动。',next:'可继续扩展高度差、朝向、地形掩护、行动顺序与队伍配置。'},
"""
update('game-forms-catalog.js'," {id:'top-action'",forms+" {id:'top-action'")
update('forms.html','19 种已接入形态','22 种已接入形态');update('forms.html','019 FORM SAMPLES','022 FORM SAMPLES');update('forms.html','forms.js?v=3','forms.js?v=4')
for article in ['<article><h3>即时战略</h3><p>大地图、多个单位、框选与即时调度。</p></article>','<article><h3>塔防</h3><p>固定通路、部署位置与持续进场的敌人。</p></article>','<article><h3>回合战棋</h3><p>格子战场、多角色与轮流行动。</p></article>']:update('forms.html',article,'')
update('forms.html','<div class="new-form-entry">','<div class="new-form-entry"><a href="forms.html?left=rts&amp;right=turn-tactics#compare">新增：即时战略 × 回合战棋 ↗</a><a href="forms.html?left=tower-defense&amp;right=rts#compare">新增：塔防 × 即时战略 ↗</a>')
update('forms.html','新增：对战格斗 × 迷宫追逐','上一批：对战格斗 × 迷宫追逐');update('forms.html','新增：音乐节奏 × 几何益智','上一批：音乐节奏 × 几何益智')
update('showcase.html','十九个扩展试玩','二十二个扩展试玩');update('showcase.html','28 个入口','31 个入口');update('showcase.html','<b>19</b>','<b>22</b>');update('showcase.html','<b>12</b>视角与界面','<b>15</b>视角与界面');update('showcase.html','showcase.js?v=7','showcase.js?v=8')
print('Integrated RTS, tower defense, tactics: 22 forms, 31 entries, three pending.')
