from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
('jigsaw-puzzle','mosaic','拼图旋转吸附','拼回海港','空间','桌面近景 / 不规则拼片','拖动 · 旋转 · 对照 · 吸附','把十二片带有互补榫口的原创海港画作旋转并拼合。','对比滑块拼图：拼片可自由拿起、旋转和拖动，图像与形状共同提供判断。','一幅原创海港画作、12 块互补榫口拼片、真实轮廓点击、旋转拖动、方向与位置吸附判定、可选参考图、完整画作结局与独立保存。','Super Jigsaw Puzzle: Generations','https://store.steampowered.com/app/1036950/Super_Jigsaw_Puzzle_Generations/','可扩展不同切片、自由拼片分组、多人共拼、立体表面和动态画作。'),
('bridge-building','span','物理造桥','峡谷承重桥','策略','侧面峡谷 / 杆件结构','连接 · 选材 · 承重 · 加固','连接上下节点搭建桁架，让邮车实际逐段驶过受力桥面。','对比轨道调度或机关摆放：玩家建造的承重结构必须在移动载荷下保持稳定。','原创峡谷和杆件、11 个节点、两种材料、预算与拆除、二维线性桁架刚度求解、逐段移动载荷、强度与变形反馈、失稳坠落和过桥结局；形变显示放大 8 倍，非完整刚体物理。','Poly Bridge 3','https://play.google.com/store/apps/details?id=com.drycactus.polybridge3','可扩展悬索桥、动态刚体、液压机构、多种载荷与自由节点建造。'),
('light-reflection','lumen','光线反射解谜','折光镜庭','空间','俯视光学桌 / 连续光路','选择镜面 · 旋转 · 绕障 · 稳定接通','旋转镜面改变连续光路，绕过遮光石点亮接收晶体。','对比旋转管线：光按几何反射传播，角度和遮挡直接决定实际路线。','两套镜庭、三面可旋转镜、真实线段求交与镜面反射、遮光石、连续稳定照射判定、行进光点和独立保存；参考光路解谜方向，自制二维镜面机制。','The Talos Principle / 光路解谜','https://www.croteam.com/talosprinciple/','可扩展彩色光、折射透镜、分光、可移动遮挡、三维光路与光影机关。'),
('music-composition','sonata','音乐作曲','灯下乐句','生活','录音桌 / 四轨乐谱','布置音符 · 调音高 · 试听 · 导出','直接创作旋律、低音、鼓和晶铃，听见自己写出的乐句并导出 WAV。','对比节奏点击：玩家编写实际声音内容与节奏，结果是一段可以播放的作品。','四轨 16 步作曲、八音高、80–160 BPM、原生控件、实际 PCM 合成与 Web Audio 试听、两轮创作练习、浏览器 WAV 导出、静音暂停释放声音和独立保存；参考音乐创作参与方式，非人物口技复刻。','Incredibox / 音乐创作','https://www.incredibox.com/','可扩展录音、采样、编排曲段、共享作品、多轨协作、音乐驱动的关卡空间。'),
('action-replay','afterimage','动作录制回放协作','昨日同行','动作','侧面时钟厅 / 过去的动作','录制路线 · 生成分身 · 同时协作','让过去的自己重复实际走过的路线，在另一枚机关上与你协作。','对比即时双人协作：同一位玩家先后创造不同时间的动作，并让它们同时发生。','30 Hz 实际位置记录、最多两个 12 秒动作分身、终点停留、同步回放、两机关持续协作、时间门与归岸结局、未完成录制和完整独立保存；二维位置回放，非完整世界回滚。','The Talos Principle / 时间录制','https://www.croteam.com/talosprinciple/','可扩展对象动作、世界状态回滚、循环同步、多条并行路线与录制解谜。'),
('nonogram','weave','图案交叉推理','交叉光晶','策略','玻璃工坊 / 行列数字','读线索 · 填色 · 划空 · 交叉验证','从行列连续长度推理每一格，逐步镶嵌出光晶图案。','对比排雷：数字表示一整行或列的连续图案，玩家交叉排除合法排布。','8×8 多段线索棋盘、填色划空擦除、拖涂与键盘、撤销、合法排布推导提示、矛盾反馈、无需猜测的一套光晶图案、完成实体显露和独立保存。','PICROSS S','https://www.nintendo.com/es-mx/store/products/picross-s-switch/','可扩展多色线索、立体方块、动态像素、合作推理和自制图案。')
]
def edit(f,a,b):
 p=W/f;s=p.read_text(encoding='utf-8');assert a in s,(f,a);p.write_text(s.replace(a,b),encoding='utf-8')
forms=[];directions=[]
for form,id,name,title,family,view,action,desc,compare,scope,ref,url,next in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=ref,description=desc,compare=compare,next=next),ensure_ascii=False))
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,ref,url,'assets/game-forms/studio/previews/'+id+'.webp',desc,scope,'场景操作 / 下方原生控件 · 方向键 · Q / E · 空格 · P 暂停'])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps([v[1] for v in entries])+'.includes(d.id))d.previewKind=\'生产场景绘制预览\';\nfor(const direction of newDirections)if(')
ids=','.join(json.dumps(v[1]) for v in entries)
edit('showcase-catalog.js','"script","echo","assembly"].includes','"script","echo","assembly",'+ids+'].includes')
edit('showcase.js','frontierIds=new Set([','studioIds=new Set(['+ids+']),frontierIds=new Set([')
edit('showcase.js','"script","echo","assembly"]),originalEdition','"script","echo","assembly",'+ids+']),originalEdition')
edit('showcase.js','if(frontierIds.has(id)){',"if(studioIds.has(id)){factoryModules.studio??=await import('./showcase-studio.js?v=20261004-1');return factoryModules.studio.createStudio({...options,id})}if(frontierIds.has(id)){")
edit('showcase.js','"assembly",\'putt\'','"assembly",'+ids+',\'putt\'')
edit('showcase.js',"['rhythm','echo'].includes(currentId)","['rhythm','echo','sonata'].includes(currentId)")
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-10','showcase-catalog.js?v=20261004-11')
edit('forms.js','game-forms-catalog.js?v=20261004-7','game-forms-catalog.js?v=20261004-8')
edit('forms.html','69 种','75 种');edit('forms.html','069 FORM','075 FORM');edit('forms.html','forms.js?v=20','forms.js?v=21');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('jigsaw-puzzle','bridge-building','旋转拼图 × 物理造桥'),('light-reflection','music-composition','光路反射 × 音乐作曲'),('action-replay','nonogram','动作回放 × 交叉推理')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','六十九','七十五');edit('showcase.html','78 个','84 个');edit('showcase.html','<b>69</b>','<b>75</b>');edit('showcase.html','<b>9</b>本轮新增','<b>6</b>本轮新增');edit('showcase.html','showcase.js?v=34','showcase.js?v=35')
(P/'notes/studio-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
print('Integrated 6 new forms: 75 forms / 84 entrances')
