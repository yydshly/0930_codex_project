from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
 ('falling-blocks','cascade','落块消行','海窗落块台','解谜','固定竖井 / 持续下落','移动 · 旋转 · 落稳 · 消除横排','在海窗前移动和旋转七种四格方块，填满横排，让堆叠空间重新打开。','与旋转复原或拼图不同：场地持续接收新方块，玩家一边管理下落时间，一边安排空槽；落点预览不占格，落稳才写入棋盘。','原创海窗落块站与八色透明珐琅方块贴图，10×18 棋盘、七种四格形状、有限旋转让位、真实碰撞与落点预览、暂存交换、渐速下落、软降与硬降、消行闪光、顶出失败、引导开局两行和空板六行、暂停及独立保存。使用固定循环队列，是原创短段，不提供竞技随机袋、完整 SRS、无限模式或多人对战。','Tetris / 下落与横排消除','https://play.tetris.com/about','可扩展随机袋、不同棋盘、时间挑战、连消反馈、方块组合教程与双人协作。','左右 / A D 移动 · 上 / E 顺转 · Q 反转 · 下 / S 加速 · 空格落下 · Shift 暂存 · 拖动与下方控件'),
 ('solitaire','patience','纸牌接龙','蓝绒接龙桌','解谜','俯视牌桌 / 遮盖与揭牌','选牌 · 红黑递减 · 同花归位','在蓝绒牌桌上腾出空列，揭开压住的牌，把四种花色从 A 到 5 依次归位。','与棋盘战术或配对翻牌不同：同一张牌在列、翻牌区和归位区承担不同角色；一手移动会揭出新信息，合法牌序还可以整组移动。','原创绒面牌桌、透明正反牌面、运行时点数与花色、四列二十张 A–5 的固定原创短牌局、红黑交替递减叠牌、同花顺序归位、空列从 5 开始、翻牌区顶牌、循环重新发牌、揭牌动画、实际卡牌拖动、选牌点击、撤销、合法动作提示和独立保存。不是完整 52 张七列 Klondike，没有随机发牌、竞技计时或多人。','Klondike / 揭牌与顺序整理','https://mobilityware.helpshift.com/hc/en/10-solitaire/faq/1362-how-do-i-play-solitaire/?contact=1&p=all','可扩展完整牌局、随机但可解的发牌、不同接龙规则、每日布局和更丰富的揭牌反馈。','点选或拖动明牌 · 点列或同花归位区 · 空格翻牌 · E 归位所选单牌 · 原生按钮撤销与提示'),
 ('word-deduction','lexicon','字词位置推理','字印的回声','解谜','字母矩阵 / 逐格线索','输入 · 提交 · 比较位置与数量','把五字母单词压印在纸面上，用每一格的位置与数量反馈，在六次内找到谜词。','与数独、扫雷和猜密码不同：尝试的是有词义约束的单词；反馈同时回答字母是否存在、位置是否正确，并严格限制重复字母的匹配数量。','原创字印桌与透明陶瓷字母格、五列六行、24 个本地英文候选词与六个固定轮换谜词、逐格翻转揭示、重复字母精确计数、颜色与圆点菱形短横双重线索、原生输入与屏幕键盘、已试字母状态、中文词义提示、候选词填入、六次失败与新谜词、独立保存。不是在线每日谜题，不接入 NYT、不含完整词典或多人。','Wordle 形式 / 字母与位置反馈','https://arxiv.org/abs/2309.02110','可扩展中文字符线索、主题词库、不同字数、联立多谜词、可解释数量反馈和原创故事词义。','输入五字母词 · Enter 提交 · Backspace 删除 · 下方键盘、候选词与中文线索')]
files=['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'];sources={f:(W/f).read_text(encoding='utf-8') for f in files}
assert 'parlorIds' not in sources['showcase.js'],'Already integrated'
def edit(f,a,b):
 assert a in sources[f],(f,a);sources[f]=sources[f].replace(a,b)
ids=[e[1] for e in entries];quoted=','.join(json.dumps(v) for v in ids);forms=[];directions=[]
for form,id,name,title,family,view,action,desc,compare,scope,ref,url,next,controls in entries:
 forms.append(json.dumps(dict(id=form,play=id,name=name,view=view,action=action,rhythm=action,reference=ref,description=desc,compare=compare,next=next),ensure_ascii=False))
 directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in [id,title,name,family,view,ref,url,'assets/game-forms/parlor/previews/'+id+'.webp',desc,scope,controls])+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+'.includes(d.id))d.previewKind="生产场景绘制预览";\nfor(const direction of newDirections)if(')
edit('showcase-catalog.js','"automata","receiver"].includes','"automata","receiver",'+quoted+'].includes')
edit('showcase.js','circuitryIds=new Set([','parlorIds=new Set(['+quoted+']),circuitryIds=new Set([')
edit('showcase.js','"automata","receiver"]),originalEdition','"automata","receiver",'+quoted+']),originalEdition')
edit('showcase.js','if(circuitryIds.has(id)){',"if(parlorIds.has(id)){factoryModules.parlor??=await import('./showcase-parlor.js?v=20261004-1');return factoryModules.parlor.createParlor({...options,id})}if(circuitryIds.has(id)){")
edit('showcase.js','"receiver",\'putt\'','"receiver",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-16','showcase-catalog.js?v=20261004-17')
edit('forms.js','game-forms-catalog.js?v=20261004-13','game-forms-catalog.js?v=20261004-14')
edit('forms.html','95 种','98 种');edit('forms.html','095 FORM','098 FORM');edit('forms.html','forms.js?v=26','forms.js?v=27');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('falling-blocks','solitaire','落块消行 × 纸牌接龙'),('word-deduction','nonogram','字词位置推理 × 逻辑填图')])
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','九十五','九十八');edit('showcase.html','104 个','107 个');edit('showcase.html','<b>95</b>','<b>98</b>');edit('showcase.html','showcase.js?v=40','showcase.js?v=41')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/parlor-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
print('Integrated: 98 forms / 107 entrances / 3 new')
