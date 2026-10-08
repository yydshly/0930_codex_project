from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
 ('dice-combination','dicework','掷骰锁定组合','鎏光五骰桌','策略','实体骰桌 / 结果保留','掷骰 · 锁定 · 重掷 · 分类记录','选择保留五枚骰子中的哪些结果，把有限重掷机会用于三轮不同组合。','与纸牌整理和随机抽卡不同：玩家可以只重掷一部分已知结果，再选择承接这些点数的类别；点数总和、重复数量和连续数量有不同价值。','原创紫绒骰桌与透明象牙骰面、五枚真实点数、最多三次掷骰、单枚锁定和部分重掷、六类真实计分、选择后确认记录、每类一次、三轮完成、不同本地种子序列、滚动动画、原生键盘与独立保存。是六类三轮的原创短局，固定可复现伪随机序列，不是完整十三类 Yahtzee、三维刚体骰子或多人，没有金钱下注。','Yahtzee / 保留与重掷','https://instructions.hasbro.com/en-ca/instruction/yahtzee-classic','可扩展完整类别、概率解释、不同骰面、组合连携、轮间选择和多人同局比较。','点骰子或 1–5 锁定 · R / 空格重掷 · 点击类别 · 下方确认记录'),
 ('simultaneous-tactics','synchro','同步规划战术','零点同步行动','策略','俯视网格 / 规划与同步执行','安排路线 · 提交 · 双方共同执行','先安排两台侦察机的四步路径，让双方在同一时段移动和交战，清除探机并抵达信标。','与轮流战棋和自动布阵不同：路线可以预先安排，双方运动同时发生；箱体阻挡视线、争格等待和共同伤害会让计划的结果改变。','原创雨夜货场与四类透明实体素材、10×6 网格、两对两固定地图、公开探机意图、两台最多四步路线、原地等待、撤销与清空、同时移动与争格等待、箱体视线遮挡、三格攻击与伤害共同结算、路径与插值动画、正常与双倍速度、八轮限额、真实耐久、信标目标与半途保存。没有在线双方提交、战争迷雾或随机地图。','Frozen Synapse / 同步回合形式','https://blog.playstation.com/2014/09/11/frozen-synapse-prime-combat-basics-on-ps-vita/','可扩展隐藏意图、行动姿态、不同射程、时间轴预演、任务目标和异步双人计划提交。','点侦察机或 1 / 2 · 点相邻格或方向键规划 · 等待与撤销 · 空格同步执行'),
 ('orbital-navigation','perigee','轨道引力航行','近星交会','模拟','俯视轨道 / 惯性与引力','定向推力 · 滑行 · 预测 · 交会','通过有限推力改变飞船速度，在行星引力下滑行，达到距离与相对速度门槛后完成交会。','与飞机操纵和环轨射击不同：输入改变速度，随后轨迹由持续引力塑造；画面上的预测线由当前状态积分产生，近距离掠过不一定满足对接条件。','原创星空、透明行星与飞船交会站、二维单中心反平方引力、Velocity Verlet 积分、圆轨速度校准、真实 delta-v 与燃料、方向选择和持续推力、轨迹预测与实际历史、三个时间倍率和视野、圆轨目标站、距离与相对速度共同门槛、行星碰撞与边界失败、暂停与独立保存。使用无量纲单位和固定初始交会练习，不是完整三维轨道、多天体或实际飞行器训练。','引力轨道导航 / 中心引力','https://science.nasa.gov/learn/basics-of-space-flight/chapter3-3/','可扩展机动节点、变轨转移、多目标交会、三维倾角、不同中心质量和自由航行任务。','先校准圆轨速度再滑行 · 左右转向 · J 持续推力 · 空格脉冲 · 选择倍率和视野 · 接近后对接')]
files=['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'];sources={f:(W/f).read_text(encoding='utf-8') for f in files};assert 'trajectoryIds' not in sources['showcase.js']
def edit(f,a,b):
 assert a in sources[f],(f,a);sources[f]=sources[f].replace(a,b)
ids=[e[1] for e in entries];quoted=','.join(json.dumps(v) for v in ids);forms=[];directions=[]
for form,id,name,title,family,view,action,desc,compare,scope,ref,url,next,controls in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=ref,description=desc,compare=compare,next=next),ensure_ascii=False))
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,ref,url,'assets/game-forms/trajectories/previews/'+id+'.webp',desc,scope,controls])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+'.includes(d.id))d.previewKind="生产场景绘制预览";\nfor(const direction of newDirections)if(')
edit('showcase-catalog.js','"patience","lexicon"].includes','"patience","lexicon",'+quoted+'].includes')
edit('showcase.js','parlorIds=new Set([','trajectoryIds=new Set(['+quoted+']),parlorIds=new Set([')
edit('showcase.js','"patience","lexicon"]),originalEdition','"patience","lexicon",'+quoted+']),originalEdition')
edit('showcase.js','if(parlorIds.has(id)){',"if(trajectoryIds.has(id)){factoryModules.trajectories??=await import('./showcase-trajectories.js?v=20261004-1');return factoryModules.trajectories.createTrajectories({...options,id})}if(parlorIds.has(id)){")
edit('showcase.js','"lexicon",\'putt\'','"lexicon",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-17','showcase-catalog.js?v=20261004-18')
edit('forms.js','game-forms-catalog.js?v=20261004-14','game-forms-catalog.js?v=20261004-15')
edit('forms.html','98 种','101 种');edit('forms.html','098 FORM','101 FORM');edit('forms.html','forms.js?v=27','forms.js?v=28');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('dice-combination','simultaneous-tactics','锁骰组合 × 同步战术'),('orbital-navigation','flight-sim','轨道航行 × 既有飞行驾驶')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','九十八','一百零一');edit('showcase.html','107 个','110 个');edit('showcase.html','<b>98</b>','<b>101</b>');edit('showcase.html','showcase.js?v=41','showcase.js?v=42')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/trajectories-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8');print('Integrated: 101 forms / 110 entrances / 3 new')
