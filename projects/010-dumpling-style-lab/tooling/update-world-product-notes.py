from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
repo=root.parents[1]
def change(file,old,new):
    p=root/file;s=p.read_text(encoding='utf-8');assert old in s,file;p.write_text(s.replace(old,new,1),encoding='utf-8')
change('README.md','本次先把搬家方向重做为「搬家日」产品样板：手绘街区、成年人物、三份生活委托、真实搬运、补救与交付记录；其余八款保留为探索原型。','搬家日保留三份完整生活委托；本轮继续升级其余八款的原创场景、成人人物、场景物件、任务界面、旅程记录和结果展示。每种画风仍对应自己能实际操作的游戏规则。')
change('README.md','[打开搬家日产品样板]','[打开搬家日产品样板]')
change('README.md','[本次产品升级与检查](notes/moving-day-product.md)','[八款世界升级与检查](notes/worlds-product.md) · [搬家日升级记录](notes/moving-day-product.md)')
change('README.md','2026-10-02 · Moving Day V3 产品样板','2026-10-02 · 九款可玩短篇，美术与共用体验升级')
change('README.md','搬家日：三份委托可完成；其余八款保持各自原型范围','搬家日三份委托；另八款各自的短章 / 短关卡可完成，内容规模仍见下表')
change('README.md','其他八款也没有在本次同时达到这一标准。','其余八款本轮已升级美术与共用体验，但仍是固定内容的短篇样板，尚未扩展成长线作品。')
change('README.md','![九款新游戏实际运行画面](assets/extension-v2-overview.webp)','![八款升级后的实际运行画面](assets/worlds-product/overview.webp)')
change('README.md','本轮六款分别侧重','六款机制扩展分别侧重')
change('README.md','搬家有两单可完成的动作关卡','搬家有三份可完成的生活委托')
change('README.md','搬家日的位图美术通过内置 ImageGen 生成','搬家日及本轮八款二维世界的位图美术通过内置 ImageGen 生成')
change('README.md','| [旧城失物局](http://127.0.0.1:8962/games.html?game=detective) | 黑白侦探；','| [旧城失物局](http://127.0.0.1:8962/games.html?game=detective) | 雨夜黑色电影；')
change('web/README.md','# 搬家日产品样板与八个探索方向','# 九种可玩方向 · 世界美术与体验升级')
change('web/README.md','主试玩入口是 [搬家日](http://127.0.0.1:8962/games.html?game=movers)，本次重做手绘美术、三份委托、搬运反馈、失误补救与最佳记录。其他八款保留探索原型，未同时升级为产品样板。','[九款试玩入口](http://127.0.0.1:8962/games.html?game=detective#game-view)可切换不同画风与规则。搬家日保留三份委托；本轮继续升级其余八款的场景、成年角色、动态物件、任务、旅程记录和结局展示。它们是可完成的固定短章 / 短关卡，内容范围见下表。')
change('web/README.md','`inn.js`、`islands.js` 保留；','`inn.js`、`islands.js` 本轮升级美术；')
change('web/README.md','## 本次产品样板','## 搬家日产品样板')
p=root/'web/README.md';p.write_text(p.read_text(encoding='utf-8')+'\n## 八款世界的本轮升级\n\n详见 [世界升级记录](../notes/worlds-product.md)、[规则回归检查](../notes/worlds-rules-check.json)与[实际界面检查](../notes/worlds-ui-check.json)。公共界面在 `worlds-interface.js` / `worlds-product.css`，二维资源按当前游戏在 `games/worlds-art.js` 加载。53 个原创 WebP 约6.4 MB，原始素材在上级 `assets/worlds-product/sources`。`tooling/prepare-world-assets.py` 只切图与压缩，保留生成的透明通道。浮岛继续使用真实 Three.js 立体场景，材质、树木、人物比例、光照和镜头已更新。\n\n`qa=1` 为九款共用的独立检查存档，正常试玩地址不带这个参数。旧检查脚本及记录对应历史轮次，当前真实浏览器检查通过 CUA 完成；规则回归在 Node VM 中运行，并明确模拟绘图 / 3D 渲染器的边界。\n',encoding='utf-8')
change('web/index.html','本轮新增黑白侦探、国风江湖、自然微缩、厚重废土、梦境幻想与都市街机。先选一种体验，观察自己的行动怎样改变结果；搬家方向已升级为手绘生活短篇「搬家日」，其余八个方向保留为探索原型。','九种方向都有各自可完成的短篇。本轮继续升级搬家之外的八款：原创场景与成人人物、真实变化的物件、任务与旅程记录。选择一种画风，亲手调查、接待、救援或探险，观察自己的行动怎样改变结果。')
change('web/index.html','九段均为本项目原创可玩原型，各自保存进度。本轮六种新方向侧重推理、系统变化、资源取舍、空间解谜与动作练习；每段的实际范围见游戏中的说明。','九段为本项目原创可玩短篇，各自保存进度。画风配合各自的调查、接待、资源取舍、空间解谜和动作规则；故事与操作、旅程记录可在试玩界面查看。')
change('web/games.html','worlds-product.css?v=4','worlds-product.css?v=5')
change('web/game-catalog.js',"style:'黑白侦探'","style:'雨夜黑色电影'")
change('web/game-catalog.js',"style:'暖色绘本'","style:'暖色生活叙事'")
change('web/game-catalog.js',"style:'低多边形幻想'","style:'立体幻想冒险'")
change('web/games.js','game-catalog.js?v=3','game-catalog.js?v=4')
change('web/games.html','games.js?v=18','games.js?v=19')

generation=root/'assets/worlds-product/generation.json';d=json.loads(generation.read_text(encoding='utf-8'))
d['additionalAssets']=[
 {'name':'detective-props','promptSummary':'透明背景，精确2×2图集：成熟黑色电影手绘风格的金属胶片盒、打开的器材簿、雨湿半张交接单、三帧工作样片；微俯视桌面角度，无文字与人物。','source':'D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c/exec-f9767df9-9cda-4afe-914e-aabacbc56d90.png'},
 {'name':'wasteland-equipment','promptSummary':'透明背景，精确2×2图集：成熟废土手绘风格的水泵机柜、旧散热器、育苗台、零件废料箱；微俯视正面角度，无界面、文字和背景。','source':'D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c/exec-0d789ed2-9793-494f-be7b-db4a549f4663.png'},
 {'name':'dream-props','promptSummary':'透明背景，精确3×1图集：诗性月夜手绘风格的青色木渡船、正面档案亭、俯视石板材质；无人物、界面和文字。石板生成结果未适合当前可走地面，实际地面改由代码绘制。','source':'D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c/exec-42ad70dc-b62d-43b2-a82e-228383574189.png'}]
d['runtimeManifest']='web/assets/worlds/manifest.json';d['sourceDirectory']='assets/worlds-product/sources';d['note']='前13项保留完整生成提示词；最后3项为生成提示摘要。所有素材使用内置 ImageGen，无第三方角色素材。'
generation.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
catalog=repo/'projects.json';d=json.loads(catalog.read_text(encoding='utf-8'))
next(p for p in d if p['id']==10)['summary']='目标：参考 Dumpling Dell 的小世界结构，探索不同画风、故事与游玩动机；体验：九款可玩短篇，搬家日三份委托，其余八款升级原创场景、成人人物、任务、旅程记录与结果展示；原理：Canvas 2D / Three.js 立体场景、通路与资源规则、动作碰撞和本地存档；证据：实际界面截图、章节试玩和规则回归；边界：固定短篇样板，长线内容与真人情绪效果仍待迭代，早期研究保留。'
catalog.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Updated current documentation, catalogue and asset provenance; historical checks retained.')
