from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
('draw-guidance','ribbon','绘线引导','把风画成路','空间','侧面单屏 / 自由绘制轨道','拖动绘线 · 沿线运动 · 缺口坠落','在空中画出经过三枚风印的线路，让玻璃风信使沿真实线路抵达右岸。','与剪纸拼桥不同：玩家直接画连续路径，绘线长度消耗墨水，信使沿折线运动，断开的末端会脱轨。','1500 像素墨水、自由连续绘线、32 笔上限、轨道吸附与重力坠落、短暂加速、三风印、线路撤销与独立保存；是单屏绘线引导短场景，没有完整刚体滚动物理、无限绘制或敌人系统。','Kirby and the Rainbow Paintbrush / 绘线引导','https://www.nintendo.com/en-gb/Games/Wii-U-games/Kirby-and-the-Rainbow-Paintbrush-893013.html','可扩展限时墨水、双向通路、分叉路线、多信使引导、阻挡危险物与滚屏关卡。'),
('autonomous-rescue','rescue','群体间接救援','矿井十二人','策略','侧面矿井 / 自动行走群体','选队员 · 给技能 · 改通路','十二位队员自动穿越矿井，你安排造梯、阻挡和开凿，护送至少十人抵达出口。','与小队跟随不同：没有被直接操控的领队；玩家给独立行走的个体分配技能，让技能改变地形与其他队员的方向。','十二名自动队员、分批入场、渐进造梯与真实支撑、开凿石墙、个体阻挡、技能数量、坠落损失、队伍暂停安排、救援结果与独立保存；是一座矿井的短场景，没有完整寻路、地形任意开挖或原作技能全集。','Lemmings / 地形指令与群体救援','https://exient.helpshift.com/hc/en/3-lemmings/faq/12-what-are-instructions/','可扩展多出口、伞降、爆破、桥梁预算、多层地形、分组救援与定时入场。'),
('world-rewind','rewind','世界时间回溯','钟楼的第二次','空间','横向钟楼 / 整个局部世界回退','移动取物 · 回退历史 · 改写后续','让钟楼桥下沉，到下层取晶石，再带它回到过去锁桥，走向原先到不了的出口。','与暂停或个人动作回放不同：人物、桥、配重、触发器和世界时钟恢复到真实历史状态；一枚明确不受时间影响的晶石让后续发生变化。','30 秒局部世界历史、两倍速回溯、时间分支、桥与配重同步恢复、唯一时间免疫晶石、控制台锁桥、实际下层与出口、跳跃和独立保存；只记录本场景定义的组件，不代表通用引擎任意对象的完整时间回退。','Braid, Anniversary Edition / 时间回退','https://www.playstation.com/en-us/games/braid-anniversary-edition/','可扩展不同物件的时间倍率、多个时间例外、因果机关、并行时间线与区域回溯。'),
('recursive-scale','nested','双尺度嵌套世界','掌心里的庭院','空间','真实三维 / 模型与庭院双视图','拖动模型 · 同步放大 · 走过庭院','小模型里的两座桥与大庭院中的桥联动；先在模型里搭路，再在八倍大的世界亲自走过。','与错视或相机变焦不同：同时存在两个实际三维模型，位置、旋转和尺寸按八倍关系对应，桥改变后会直接影响大庭院的可行走支撑。','Three.js 实时三维、生成石木材质、两个相连尺度、同场景实时模型视图、实际射线拖桥、几何通路、庭院行走、失足重试、镜头环绕与独立保存；无 WebGL 时明确标注同几何兼容投影；是两个有限尺度，没有无限递归世界。','Maquette / 递归尺度空间','https://www.annapurna.com/interactive/maquette','可扩展第三尺度、可搬运物品、尺寸变化门锁、递归建筑、上下层观察与尺度叙事。')]
files=['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'];sources={f:(W/f).read_text(encoding='utf-8') for f in files}
assert 'kineticsIds' not in sources['showcase.js'],'Already integrated'
def edit(f,a,b):
 assert a in sources[f],(f,a)
 sources[f]=sources[f].replace(a,b)
forms=[];directions=[];ids=[e[1] for e in entries];quoted=','.join(json.dumps(v) for v in ids)
for form,id,name,title,family,view,action,desc,compare,scope,ref,url,next in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=ref,description=desc,compare=compare,next=next),ensure_ascii=False))
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,ref,url,'assets/game-forms/kinetics/previews/'+id+'.webp',desc,scope,'画面拖动 / 下方按钮 · 方向键 · 空格 · E · R 回溯 · P 暂停'])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+".includes(d.id))d.previewKind=d.id==='nested'?'同场景三维兼容渲染预览':'生产场景绘制预览';\nfor(const direction of newDirections)if(")
edit('showcase-catalog.js','"cartographer","tendril","cutout","panorama"].includes','"cartographer","tendril","cutout","panorama",'+quoted+'].includes')
edit('showcase.js','voyagesIds=new Set([','kineticsIds=new Set(['+quoted+']),voyagesIds=new Set([')
edit('showcase.js','"cartographer","tendril","cutout","panorama"]),originalEdition','"cartographer","tendril","cutout","panorama",'+quoted+']),originalEdition')
edit('showcase.js','if(voyagesIds.has(id)){',"if(kineticsIds.has(id)){factoryModules.kinetics??=await import('./showcase-kinetics.js?v=20261004-1');return factoryModules.kinetics.createKinetics({...options,id})}if(voyagesIds.has(id)){")
edit('showcase.js','"panorama",\'putt\'','"panorama",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-13','showcase-catalog.js?v=20261004-14')
edit('forms.js','game-forms-catalog.js?v=20261004-10','game-forms-catalog.js?v=20261004-11')
edit('forms.html','83 种','87 种');edit('forms.html','083 FORM','087 FORM');edit('forms.html','forms.js?v=23','forms.js?v=24');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('draw-guidance','autonomous-rescue','绘线引导 × 群体救援'),('world-rewind','recursive-scale','世界回溯 × 双尺度庭院')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','八十三','八十七');edit('showcase.html','92 个','96 个');edit('showcase.html','<b>83</b>','<b>87</b>');edit('showcase.html','showcase.js?v=37','showcase.js?v=38')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/kinetics-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
print('Integrated: 87 forms / 96 entrances / 4 new')
