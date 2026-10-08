from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
('gravity-inversion','inverter','重力翻转平台','倒悬温室','动作','侧面单屏 / 地面与天花板','移动 · 落地翻转 · 绕开上下危险','翻转重力，让天花板成为脚下的路，绕过上下荆棘并收集三枚星印。','与普通平台跳跃不同：没有自由跳跃；落在台面后反转重力，整条垂直运动与可站立表面随之改变。','上下表面支撑、实体障碍和危险区、落地翻转、动作图集、三枚星印、中段重试检查点与独立保存；是一段二维原创短场景，没有滚屏关卡或任意方向重力。','VVVVVV / 翻转重力平台','https://thelettervsixtim.es/','可扩展横竖重力区域、移动障碍、连续房间、上下路线分叉与引力机关。'),
('dual-world','phasewalk','双世界切换','昼夜之间','空间','同坐标双层舞台 / 即时切换','跳跃 · 切换实体层 · 拼接通路','在同一位置切换白昼和夜层，让两个世界独有的台面拼成一条通路。','与切换滤镜不同：两层有不同的实体支撑，切换会立即改变碰撞世界；预览另一层只显示幽影，不改变可行走规则。','昼夜原创场景、各自独有的平台、公共落脚区、四枚限定世界星印、切换重叠拒绝、幽影预览、检查点与独立保存；是一个双层单屏通路，没有战斗或完整双世界地图。','Guacamelee! / 双世界空间切换','https://store.steampowered.com/app/275390/Guacamelee_Super_Turbo_Championship_Edition/','可扩展双层机关、不同敌群、跨层投物、时间差、限定世界门锁和层间叙事。'),
('portal-momentum','transit','传送门惯性','折向的航程','空间','二维侧面 / 两端局部场景窗口','布置入口出口 · 下落 · 惯性转向','先选传送门位置，让下落的胶囊穿越到墙面出口，保留速率飞上远端高台。','与普通瞬移不同：门面法线决定速度的旋转，穿越瞬间保留速度大小和门内横向偏移，惯性影响能否越过缺口。','二维固定门位三选一、双向平面穿越、速度正交变换、实时另一端局部场景窗口、运动轨迹、瞬间速率读数、真实高台碰撞、三枚星印与独立保存；不是第一人称三维非欧空间，不支持任意墙面放门或无限递归渲染。','Portal / 门面与动量','https://www.thinkwithportals.com/about.php','可扩展可移动门、成对可搬表面、传送物件、重力井和多段惯性机关；三维第一人称需另建空间渲染与碰撞。'),
('voice-pitch','cantor','声音音高控制','以声音飞行','动作','空中单屏 / 连续音高输入','持续发声 · 调整音高 · 匹配音环','持续哼唱让灯船前行，声音音高决定高度；也可按住低中高音键盘直接试玩。','与节奏打击不同：输入是持续声音的音高，不是跟着拍点按键；无稳定音高就停下前进，保持匹配音高才能穿过音环。','显式启用的本地麦克风、PCM 音高识别、舒适最低音校准、音高与高度连续映射、信噪门槛、音环保持判定、明确标注的 Z/X/C 键盘替代与独立保存；音频不上传或存储，暂停和离开释放设备；没有语音文字识别、情绪识别或实际设备验收。','One Hand Clapping / 唱声参与','https://www.thqnordicmobile.com/en/games/one-hand-clapping/','可扩展音阶路径、和声音门、呼吸节奏、声强机关和合作唱声；需优先检查实际设备与不同音域可用性。')]
files=['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'];sources={f:(W/f).read_text(encoding='utf-8') for f in files}
assert 'thresholdsIds' not in sources['showcase.js'],'Already integrated'
def edit(f,a,b):
 assert a in sources[f],(f,a)
 sources[f]=sources[f].replace(a,b)
ids=[e[1] for e in entries];quoted=','.join(json.dumps(v) for v in ids);forms=[];directions=[]
for form,id,name,title,family,view,action,desc,compare,scope,ref,url,next in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=ref,description=desc,compare=compare,next=next),ensure_ascii=False))
 controls='方向键 / A D · 空格 · 下方按钮 · P 暂停' if id!='cantor' else '低/中/高音按钮或 Z/X/C · 空格飞行 · 显式启用麦克风 · 校准音域'
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,ref,url,'assets/game-forms/thresholds/previews/'+id+'.webp',desc,scope,controls])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+'.includes(d.id))d.previewKind="生产场景绘制预览";\nfor(const direction of newDirections)if(')
edit('showcase-catalog.js','"ribbon","rescue","rewind","nested"].includes','"ribbon","rescue","rewind","nested",'+quoted+'].includes')
edit('showcase.js','kineticsIds=new Set([','thresholdsIds=new Set(['+quoted+']),kineticsIds=new Set([')
edit('showcase.js','"ribbon","rescue","rewind","nested"]),originalEdition','"ribbon","rescue","rewind","nested",'+quoted+']),originalEdition')
edit('showcase.js','if(kineticsIds.has(id)){',"if(thresholdsIds.has(id)){factoryModules.thresholds??=await import('./showcase-thresholds.js?v=20261004-1');return factoryModules.thresholds.createThresholds({...options,id})}if(kineticsIds.has(id)){")
edit('showcase.js','"nested",\'putt\'','"nested",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-14','showcase-catalog.js?v=20261004-15')
edit('forms.js','game-forms-catalog.js?v=20261004-11','game-forms-catalog.js?v=20261004-12')
edit('forms.js',"embed.searchParams.set('present','1');side.frame.src=embed;","embed.searchParams.set('present','1');side.frame.allow=form.play==='cantor'?'autoplay; fullscreen; microphone':'autoplay; fullscreen';side.frame.src=embed;")
edit('forms.html','87 种','91 种');edit('forms.html','087 FORM','091 FORM');edit('forms.html','forms.js?v=24','forms.js?v=25');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('gravity-inversion','dual-world','重力翻转 × 双世界切换'),('portal-momentum','voice-pitch','传送门惯性 × 声音控制')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','八十七','九十一');edit('showcase.html','96 个','100 个');edit('showcase.html','<b>87</b>','<b>91</b>');edit('showcase.html','showcase.js?v=38','showcase.js?v=39')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/thresholds-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
print('Integrated: 91 forms / 100 entrances / 4 new')
