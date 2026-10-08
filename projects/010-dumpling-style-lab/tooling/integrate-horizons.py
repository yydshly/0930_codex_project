from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
('desktop-investigation','desktop','仿桌面侦探','雨港收件箱','故事','桌面窗口 / 文件与照片','开窗口 · 搜档案 · 阅读 · 结案','在虚构桌面中打开邮件、出库单与照片，连接证据寻找物资去向。','对比场景寻物：信息通过可打开、拖动和关闭的真实文件窗口组织，阅读证据后作出结案判断。','四类原生 HTML 窗口、五份虚构本地资料、档案全文过滤、窗口拖动置顶关闭、四项证据记录、三项结案判断、错误反馈、完整结案与独立保存；卡片为界面状态绘制预览，不是浏览器截图。','Hypnospace Outlaw / 仿界面探索','https://www.hypnospace.net/','可扩展网页导航、聊天记录、权限解锁、桌面工具与多窗口联动。'),
('parser-adventure','inkwell','输入文字冒险','给灯塔一行话','故事','场景插画 / 指令与文字记录','输入动词 · 探索 · 拿取 · 使用','用中文指令探索四处灯塔场景，道具和机关状态会改变每条指令的结果。','对比选项小说：玩家输入动作和对象；解析器依据地点、背包与机关响应，保留可撤回的文字记录。','四处原创场景、有限中文动词解析、容器与钥匙、提灯与燃料、镜片安装、未知指令与前置条件反馈、指令撤回、原生输入记录、点灯结局和独立保存；不接入语言模型，不承诺任意自然语言理解。','Hadean Lands / 指令式互动小说','https://hadeanlands.com/how/','可扩展同义词与复合指令、地图记忆、工具组合、动态世界和语音输入。'),
('voxel-sculpture','atelier','三维体素雕刻','雕出一盏灯','空间','真实三维雕塑 / 分层切片','点选凿刻 · 分层补土 · 撤销 · 旋转','直接改变 125 块三维陶土，雕出顶底完整、四角支撑的镂空陶灯。','对比建造世界：局部三维物体本身是作品，减去或补回材料会立即改变轮廓、遮挡与内部空间。','Three.js 三维网格、真实射线选块、125 块纹理陶土、目标三维灯雕、五层切片编辑、补土撤销、相机环绕、完成点灯和独立保存；无 WebGL 时投影同一套三维网格；不包含 Teardown 的动态破坏物理。','Teardown / 可改变体素空间','https://www.teardowngame.com/','可扩展不同材料、自由雕塑、表面涂装、工具半径、结构破碎与作品导出。'),
('vehicle-stations','submersible','多工位载具驾驶','深潜协奏','策略','水下侧面航行 / 工位仪表','切工位 · 控推进 · 调浮力 · 声呐回收','切换推进、浮力、声呐和检修工位，在持续航行中回收三项样本并返航。','对比直接控制飞行：操作对象是载具系统，档位与目标深度通过惯性、浮力和资源共同影响航行。','原创海底与透明潜艇、推进加速度与阻尼、浮力深度控制、传播声呐与有限探测范围、低速回收、船体压力损伤、密封维修与电能、三项样本、返航完成和独立保存；单人切换四工位，没有多人船员或全流体模拟。','Barotrauma / 多系统潜艇','https://barotraumagame.com/','可扩展电路布线、船舱故障、不同航区、多人分工、仪表座舱与航行任务。')]
sources={name:(W/name).read_text(encoding='utf-8') for name in ['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js']}
def edit(f,a,b):
 assert a in sources[f],(f,a)
 sources[f]=sources[f].replace(a,b)
forms=[];directions=[];ids=[e[1] for e in entries];quoted=','.join(json.dumps(v) for v in ids)
for form,id,name,title,family,view,action,desc,compare,scope,ref,url,next in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=ref,description=desc,compare=compare,next=next),ensure_ascii=False))
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,ref,url,'assets/game-forms/horizons/previews/'+id+'.webp',desc,scope,'下方原生控件 / 场景窗口 / 中文指令 / 点三维陶块 · P 暂停'])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+".includes(d.id))d.previewKind=d.id==='desktop'?'界面状态绘制预览':d.id==='atelier'?'同场景三维兼容渲染预览':'生产场景绘制预览';\nfor(const direction of newDirections)if(")
edit('showcase-catalog.js','"afterimage","weave"].includes','"afterimage","weave",'+quoted+'].includes')
edit('showcase.js','studioIds=new Set([','horizonsIds=new Set(['+quoted+']),studioIds=new Set([')
edit('showcase.js','"afterimage","weave"]),originalEdition','"afterimage","weave",'+quoted+']),originalEdition')
edit('showcase.js','if(studioIds.has(id)){',"if(horizonsIds.has(id)){factoryModules.horizons??=await import('./showcase-horizons.js?v=20261004-1');return factoryModules.horizons.createHorizons({...options,id})}if(studioIds.has(id)){")
edit('showcase.js','"weave",\'putt\'','"weave",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-11','showcase-catalog.js?v=20261004-12')
edit('forms.js','game-forms-catalog.js?v=20261004-8','game-forms-catalog.js?v=20261004-9')
edit('forms.html','75 种','79 种');edit('forms.html','075 FORM','079 FORM');edit('forms.html','forms.js?v=21','forms.js?v=22');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('desktop-investigation','parser-adventure','桌面侦探 × 输入文字冒险'),('voxel-sculpture','vehicle-stations','三维雕刻 × 多工位潜艇')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','七十五','七十九');edit('showcase.html','84 个','88 个');edit('showcase.html','<b>75</b>','<b>79</b>');edit('showcase.html','<b>6</b>本轮新增','<b>4</b>本轮新增');edit('showcase.html','showcase.js?v=35','showcase.js?v=36')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/horizons-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
print('Integrated: 79 forms / 88 entrances / 4 new')
