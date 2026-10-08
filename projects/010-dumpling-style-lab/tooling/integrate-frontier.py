from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
('time-manipulation','tempo','时间操控','静时之庭','动作','俯视建筑空间 / 行动推进时间','移动 · 停下观察 · 规划轨迹','世界时间随你的移动推进，停下来能看清红色脉冲轨迹。','对比常规动作：行动节奏直接改变环境速度，时间规划成为核心操作。','原创红白建筑场景、三座信标、按移动幅度改变时间倍率、脉冲轨迹与碰撞、返回终点和独立保存。','SUPERHOT','https://store.steampowered.com/app/322500/SUPERHOT/'),
('material-simulation','flux','材料模拟','元素玻璃舱','空间','剖面实验舱 / 连续材料变化','投放 · 流动 · 燃烧 · 灭火','水、沙、木材、火和蒸汽在同一个实验舱里持续相互作用。','对比普通地形挖掘：操作材料及其反应，让变化自己形成路线和结果。','96×56 元胞材料场、沙水流动、木材引燃、清水灭火、上升蒸汽、拖动投放、水槽目标与独立保存；简化材料模型。','Noita','https://www.noitagame.com/'),
('body-control','coil','异形身体操控','盘鳞浮庭','动作','真实三维 / 分节身体','前行 · 转向 · 盘绕 · 爬高','分节的蛇形身体绕柱形成支撑，再抬高头部取回信环。','对比角色平移与跳跃：身体的长度、形状和盘绕支撑决定操作方式。','Three.js 三维浮庭、原创鳞片材质、28 节身体跟随与柱体避碰、盘绕支撑门槛、爬高和重力回落、两枚信环、独立保存及软件投影兼容模式；简化身体模型。','Snake Pass','https://store.steampowered.com/app/544330/Snake_Pass/'),
('rule-rewriting','axiom','规则改写','字石航灯','策略','规则文字 / 可推实体棋盘','移动词块 · 改写规则 · 推石通行','文字组成的规则会改变岩石的实际属性，新的规则打开新的通路。','对比普通推箱：移动的文字决定另一些物体如何移动和阻挡。','原创石板和实体素材、横纵规则解析、可移动词块、STOP/PUSH/WIN 实际条件、岩石推动、灯台结局与独立保存；按钮移动词块而非角色推词。','Baba Is You','https://www.hempuli.com/gamelist/index.php?rule=id&ruleid=3'),
('panel-puzzle','folio','绘本画框解谜','四页光旅','故事','四幅绘本 / 局部空间重组','交换画框 · 放大局部 · 连接通行','重排并放大四幅原创绘本，让光点穿过不同世界的圆门。','对比换场景或拼图：画框位置与局部视角共同控制跨画面通路。','四幅原创完整绘本、拖动或按钮交换、圆门局部放大、相邻画框条件、三段光点穿行、结果保留和独立保存。','Gorogoa','https://store.steampowered.com/app/557600/Gorogoa/'),
('photo-world','expose','摄影造景','取景造境','空间','第一人称三维 / 照片实体化','拍摄 · 放置照片 · 走过新桥','把手中的照片展开为真实桥面，走过原本不存在的通路。','对比镜头观察解谜：照片会改变场景实体与可行走区域。','第一人称 Three.js、原创天空与石材、两个取景台、两张预设建筑照片、实体桥面生成与通行判定、完整跨桥路线、独立保存；首版为限定建筑模板。','Viewfinder','https://store.steampowered.com/app/1382070/Viewfinder/'),
('programming-puzzle','script','编程式解谜','指令邮局','策略','指令编排 / 工人执行','编写指令 · 单步 · 绕行 · 循环','自己编排动作程序，让邮务机器人逐条执行并绕开障碍投递。','对比直接控制角色：玩家操纵指令、顺序与循环，角色按程序行动。','七类指令、24 条程序上限、选择重排删除、运行/单步/复位、碰撞和错误反馈、500 步循环上限、三封实际投递与独立保存。','Human Resource Machine','https://tomorrowcorporation.com/humanresourcemachine'),
('audio-exploration','echo','声音定位探索','听见雾港','故事','空间声音 / 有限可视场景','转身辨向 · 听距离 · 走近声标','戴耳机沿三座声音信标走进雾港，方向与距离由空间声音传达。','对比靠地图和画面导航：声音承担主要空间信息，转身听取方向。','Web Audio HRTF、动态监听位置与朝向、距离衰减声标、脚步与风声、左右耳校准、可选训练地图、静音/暂停/离开停止声音与独立保存；非完整无障碍叙事游戏。','A Blind Legend','https://store.steampowered.com/app/437530/A_Blind_Legend/'),
('social-deduction','assembly','社交推理与伪装','深蓝议会','故事','真实玩家房间 / 隐藏身份','任务 · 伪装 · 危机 · 讨论投票','真实玩家在同一个研究站同步行动，只知道自己的身份，交流判断潜伏者。','对比同设备信息分工：独立玩家身份、同步房间、讨论与投票决定结局。','本机房间服务、3–6 位真实玩家、建房加入与分享链接、私密身份、三工位旋钮任务、危机与现场修复、限时会议、真实发言投票和双阵营结局；需要本机 8963 服务，同浏览器不同窗口会分别保存会话。','Among Us','https://www.innersloth.com/games/among-us/')
]
def edit(f,old,new):
 p=W/f;s=p.read_text(encoding='utf-8');assert old in s,(f,old);p.write_text(s.replace(old,new),encoding='utf-8')
forms=[];directions=[]
for form,id,name,title,family,view,action,description,compare,scope,reference,url in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=reference,description=description,compare=compare,next='可继续扩展舞台、镜头、素材与参与方式，保持本方向的独特操作。'),ensure_ascii=False))
 controls='下方原生按钮 / 场景操作 · 方向键 / WASD · P 暂停'
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,reference,url,'assets/game-forms/frontier/previews/'+id+'.webp',description,scope,controls])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const direction of newDirections)if(')
ids=','.join(json.dumps(v[1]) for v in entries)
edit('showcase-catalog.js',"'kitchen','relay'].includes","'kitchen','relay',"+ids+'].includes')
edit('showcase.js','nineIds=new Set([','frontierIds=new Set(['+ids+']),nineIds=new Set([')
edit('showcase.js',"'kitchen','relay']),originalEdition","'kitchen','relay',"+ids+']),originalEdition')
edit('showcase.js','if(nineIds.has(id)){',"if(frontierIds.has(id)){factoryModules.frontier??=await import('./showcase-frontier.js?v=20261004-1');return factoryModules.frontier.createFrontier({...options,id})}if(nineIds.has(id)){")
edit('showcase.js',"'kitchen','relay','putt'","'kitchen','relay',"+ids+",'putt'")
edit('showcase.js',"if(currentId==='rhythm'&&!sound)","if(['rhythm','echo'].includes(currentId)&&!sound)")
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-9','showcase-catalog.js?v=20261004-10')
edit('forms.js','game-forms-catalog.js?v=20261004-6','game-forms-catalog.js?v=20261004-7')
edit('forms.html','60 种','69 种');edit('forms.html','060 FORM','069 FORM');edit('forms.html','forms.js?v=19','forms.js?v=20');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('time-manipulation','material-simulation','时间操控 × 材料模拟'),('body-control','photo-world','异形身体 × 摄影造景'),('rule-rewriting','panel-puzzle','规则改写 × 绘本画框'),('programming-puzzle','audio-exploration','指令编排 × 空间声音'),('social-deduction','asymmetric-coop','社交推理 × 信息分工')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','六十','六十九');edit('showcase.html','69 个','78 个');edit('showcase.html','<b>60</b>','<b>69</b>');edit('showcase.html','showcase.js?v=33','showcase.js?v=34')
rules=W/'showcase-frontier-rules.js';s=rules.read_text(encoding='utf-8');s=s.replace("export function executeScript(s){if(s.won)return;","export function executeScript(s){if(s.won)return;if(s.steps>=500){s.running=false;s.error='执行达到 500 步，请检查循环';return;}")
s=s.replace("if(id==='axiom'&&", "if(id==='tempo'&&(!Array.isArray(s.targets)||s.targets.length!==3||!Array.isArray(s.bullets)||!s.bullets.every(b=>['x','y','vx','vy'].every(k=>Number.isFinite(b[k])))))return fresh;\n+PLACEHOLDER+if(id==='axiom'&&".replace('+PLACEHOLDER+',''))
rules.write_text(s,encoding='utf-8')
room=W/'showcase-frontier-room.js';s=room.read_text(encoding='utf-8');needle=" const ui=frontierPanel(host,'assembly',()=>{},()=>{});"
assert needle in s;s=s.replace(needle," const sessionKey='dumpling-frontier-room-session-v1'+(query.has('qa')?'-qa':'');try{const session=JSON.parse(sessionStorage.getItem(sessionKey));if(session?.room&&session?.token){s.room=session.room;s.token=session.token;s.name=session.name||s.name;}else s.token='';}catch{s.token='';}\n"+needle)
s=s.replace("error='';sync();}\n function ownStation", "error='';sync();}\n function ownStation")
s=s.replace("error='';sync();}\n async function poll", "error='';try{if(s.token)sessionStorage.setItem(sessionKey,JSON.stringify({room:s.room,token:s.token,name:s.name}));else sessionStorage.removeItem(sessionKey);}catch{}sync();}\n async function poll")
s=s.replace("getState(){return {...s,view:null}}","getState(){return {...s,token:'',view:null}}")
room.write_text(s,encoding='utf-8')
print('Integrated 9 new forms: 69 forms / 78 entrances')
