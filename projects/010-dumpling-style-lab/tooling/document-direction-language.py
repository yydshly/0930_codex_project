"""Document LANTERN LEXICON using actual completed evidence."""
from pathlib import Path
from PIL import Image
import json,hashlib
p=Path(__file__).resolve().parents[1]
baseline=json.loads((p/'notes/language-preservation-before-20261006.json').read_text('utf-8'))
manifest=json.loads((p/'assets/directions/language-generation-20261006.json').read_text('utf-8'))
art=[]
for a in manifest['assets']:
    data=(p/a['file']).read_bytes();assert data==Path(a['source']).read_bytes()
    with Image.open(p/a['file']) as im:
        assert im.format=='PNG'
        art.append({'key':a['key'],'file':a['file'],'size':list(im.size),'mode':im.mode,'format':im.format,'alpha_extrema':list(im.getchannel('A').getextrema()) if im.mode=='RGBA' else None,'sha256':hashlib.sha256(data).hexdigest(),'source_copy_identical':True})
(p/'notes/language-art-inspection-20261006.json').write_text(json.dumps({'passed':True,'assets':art,'frames':manifest['props_runtime_frames'],'method':'Actual original bitmap dimensions, modes, alpha and hashes read. Original three harbor environments and eight-cell transparent props atlas visually inspected; runtime cell crops preserve proportions, precise glyphs are native authored game writing.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
reports={n:json.loads((p/f'notes/direction-language-{n}-20261006.json').read_text('utf-8')) for n in ['rules','controller','regressions','browser']}
assert all(r['passed'] for r in reports.values())
browser=reports['browser'];assert all(c['passed'] is True for c in browser['checks'])
for c in browser['screenshots']:
    with Image.open(c['file']) as im:c.update(capture_size=list(im.size),format=im.format)
    c['sha256']=hashlib.sha256(Path(c['file']).read_bytes()).hexdigest()
(p/'notes/direction-language-browser-20261006.json').write_text(json.dumps(browser,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
counts={n:reports[n].get('count',reports[n].get('checkCount',0)) for n in ['rules','controller']};counts.update(old_checks=reports['regressions']['total_checks'],browser=len(browser['checks']))
assert all(counts[n]==len(reports[n]['checks']) for n in ['rules','controller'])
quality={'date':'2026-10-06','passed':True,'direction':15,'scope':'Original finite three-location six-glyph language study. Actual distinct contextual observations support editable hypotheses. Confirmations need at least two observed contexts. Actual item/mechanism responses unlock locations, with explicit finish. Scene animation illustrates current engine evidence and completed interactions; ordinary demo calls the same legal actions.','art':art,'verification':counts,'screenshots':browser['screenshots'],'limitations':['Authored six-symbol mini-language and twelve contexts, not natural language understanding or automatic translation','Illustrated 2D browser experience, not a freely explorable 3D world','Responsive viewport evidence does not replace physical mobile device tests','Commercial retention, payment demand and long-term performance not measured']}
(p/'notes/direction-language-quality-20261006.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prefix=f'''2026-10-06 新增第十五方向 [灯市译语 · 陌生语言解读](http://127.0.0.1:8962/direction-language.html?demo=1#play)。在市集、水门与灯塔观察十二段实际情境，为六个原创符号建立可修改的词义假设。验证至少需要两个不同观察记录；错误验证保留原假设，反馈不直接给出答案。读懂请求后选择物品或操作，真实交流结果打开下一处地点；三段交流完成后由玩家明确结束。完整示范调用同样的观察、猜测、验证和交流动作，未预先注入已理解状态。独立保存键 `world-play-direction-language-v1`，返回恢复后暂停。

此前十四方向、首批十条开源参考与旧 107 种形态／116 个入口保留。[Heaven’s Vault · inkle 官方介绍](https://www.inklestudios.com/heavensvault/) 用作语言解读参与方式的商业类型参照，与开源参考目录分别标注。本站符号、剧情、场景及规则原创，未移植原作代码或美术。

三处港城背景及透明角色道具图集采用内置 ImageGen，原样复制到项目中：[市集](web/assets/directions/language/market.png)、[水门](web/assets/directions/language/harbor.png)、[灯塔](web/assets/directions/language/lighthouse.png)、[透明图集](web/assets/directions/language/props.png)、[完整提示词与源路径](assets/directions/language-generation-20261006.json)。图集按实际原始尺寸取八个等分框，运行时保持比例。新增规则 {counts['rules']} 项及生产控制器 {counts['controller']} 项通过；旧十四方向 28 个脚本的 {counts['old_checks']} 项实际重跑通过。[浏览器验收](notes/direction-language-browser-20261006.json) 含 {counts['browser']} 项真实操作和 {len(browser['screenshots'])} 张原生截图；[质量范围](notes/direction-language-quality-20261006.json) 与 [构建保留检查](notes/direction-language-package-20261006.json) 保存证据。

这是固定六个符号与三个地点的有限二维短局。真人留存、商业成熟度和广泛兼容尚未测量。此前 README 全部 {baseline['readme_suffix_bytes']} 字节及 {baseline['protected_count']} 个受保护网页文件保留。

以下逐字保留此前实现与验收记录。

'''
old=(p/'README.md').read_bytes()[-baseline['readme_suffix_bytes']:];assert hashlib.sha256(old).hexdigest()==baseline['readme_suffix_sha256']
(p/'README.md').write_bytes(prefix.encode('utf-8')+old)
print(json.dumps(counts))
