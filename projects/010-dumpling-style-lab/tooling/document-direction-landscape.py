"""Document RIVERFOLD from the actual completed browser and engine evidence."""
from pathlib import Path
from PIL import Image
import json,hashlib
p=Path(__file__).resolve().parents[1]
baseline=json.loads((p/'notes/landscape-preservation-before-20261006.json').read_text('utf-8'))
manifest=json.loads((p/'assets/directions/landscape-generation-20261006.json').read_text('utf-8'))
art=[]
for asset in manifest['assets']:
    data=(p/asset['file']).read_bytes()
    assert data==Path(asset['source']).read_bytes()
    with Image.open(p/asset['file']) as im:
        assert im.format=='PNG' and im.mode=='RGB'
        art.append({'key':asset['key'],'file':asset['file'],'size':list(im.size),'mode':im.mode,'format':im.format,'sha256':hashlib.sha256(data).hexdigest(),'source_copy_identical':True})
(p/'notes/landscape-art-inspection-20261006.json').write_text(json.dumps({'passed':True,'assets':art,'frames':manifest['atlas_runtime_frames'],'method':'Actual original bitmap dimensions, mode and hashes read; visually inspected original four terrain cells and calm backdrop. Runtime centered-square atlas crops retain proportions; authored edge paths derive from engine data.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
reports={n:json.loads((p/f'notes/direction-landscape-{n}-20261006.json').read_text('utf-8')) for n in ['rules','controller','regressions','browser']}
assert all(r.get('passed',r.get('overallpassed',False)) for r in reports.values())
browser=reports['browser']
assert all(c.get('passed') is True for c in browser['checks'])
for capture in browser['screenshots']:
    with Image.open(capture['file']) as im:
        capture.update(capture_size=list(im.size),format=im.format)
    capture['sha256']=hashlib.sha256(Path(capture['file']).read_bytes()).hexdigest()
(p/'notes/direction-landscape-browser-20261006.json').write_text(json.dumps(browser,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
counts={'rules':reports['rules']['checkCount'],'controller':reports['controller']['count'],'old_checks':reports['regressions']['total_checks'],'browser':len(browser['checks'])}
assert counts['rules']==len(reports['rules']['checks']) and counts['controller']==len(reports['controller']['checks'])
quality={'date':'2026-10-06','passed':True,'direction':14,'scope':'Original finite eighteen-tile plus one seed hex landscape study. Rotation, legal neighboring placement, water/land rejection, actual matched-edge score, connected terrain groups, undo, independent paused restore and explicit final summary. Original raster art supplies terrain texture; paths and previews are actual engine geometry.','art':art,'verification':counts,'screenshots':browser['screenshots'],'limitations':['Finite authored eighteen-tile deck, not unlimited world generation or real ecology','Canvas2D landscape board, not a freely explorable 3D world','Desktop and responsive browser viewport checked, no physical mobile device test','Commercial maturity, sustained performance and human retention have not been measured']}
(p/'notes/direction-landscape-quality-20261006.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prefix=f'''2026-10-06 新增第十四方向 [溪丘拼境 · 地景拼片与邻接连缀](http://127.0.0.1:8962/direction-landscape.html?demo=1#play)。旋转并预览十八块原创六边形地形，将其放到真实相邻位置；水道只能与水道相接，其他陆地边的匹配影响得分。连续林地、村落和水道按实际接壤边计算，撤回会真正恢复上一块、得分和目标。十八块用尽后由玩家明确完成，结算反映实际景观。完整示范调用同样的合法旋转、选择与放置，不提前注入成品或成功。独立保存键 `world-play-direction-landscape-v1`，恢复后暂停。

原有十三个方向、首批十条开源参考与 107 种形态／116 个入口保留。新增研究参考 [Dorfromantik · Toukana 官方介绍](https://www.toukana.com/dorfromantik) 的地块拼景参与方式，商业参照与原先开源目录分别记录。本站原创短样例不移植原作代码、美术或完整游戏。

两份原创位图使用内置 ImageGen，原样保存：[地形图集](web/assets/directions/landscape/terrain-atlas.png)、[晨雾背景](web/assets/directions/landscape/backdrop.png)、[完整提示词与源路径](assets/directions/landscape-generation-20261006.json)。实际图集 1536×1024，四个矩形区取中央 512×512 源框，避免拉伸；地形边缘与水道由实际旋转数据绘制。新增规则 {counts['rules']} 项、生产控制器 {counts['controller']} 项通过，旧十三方向 26 脚本的 {counts['old_checks']} 项实际重跑通过。[浏览器验收](notes/direction-landscape-browser-20261006.json) 含 {counts['browser']} 项真实操作与 {len(browser['screenshots'])} 张原生截图；[质量范围](notes/direction-landscape-quality-20261006.json) 与 [构建和保留检查](notes/direction-landscape-package-20261006.json) 提供证据。

当前是固定十八块的二维景观拼接体验。真人留存、商业成熟度、长期性能和广泛兼容未测量。此前 README 全部 {baseline['readme_suffix_bytes']} 字节与 {baseline['protected_count']} 个受保护网页文件保留。

以下逐字保留此前实现与验收记录。

'''
old=(p/'README.md').read_bytes()[-baseline['readme_suffix_bytes']:]
assert hashlib.sha256(old).hexdigest()==baseline['readme_suffix_sha256']
(p/'README.md').write_bytes(prefix.encode('utf-8')+old)
print(json.dumps(counts))
