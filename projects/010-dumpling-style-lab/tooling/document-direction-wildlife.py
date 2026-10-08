"""Record the completed original wildlife study from actual current evidence."""
from pathlib import Path
from PIL import Image
import json, hashlib
p=Path(__file__).resolve().parents[1]
baseline=json.loads((p/'notes/wildlife-preservation-before-20261005.json').read_text('utf-8'))
reports={name:json.loads((p/f'notes/direction-wildlife-{name}-20261005.json').read_text('utf-8')) for name in ['rules','controller','regressions','browser']}
assert all(x.get('passed',x.get('overallpassed',False)) for x in reports.values())
for capture in reports['browser']['screenshots']:
    with Image.open(capture['file']) as im:
        capture['capture_size']=list(im.size); capture['format']=im.format
    capture['sha256']=hashlib.sha256(Path(capture['file']).read_bytes()).hexdigest()
(p/'notes/direction-wildlife-browser-20261005.json').write_text(json.dumps(reports['browser'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
counts={'rules':len(reports['rules']['checks']),'controller':len(reports['controller']['checks']),'old_checks':reports['regressions']['total_checks'],'browser':len(reports['browser']['checks'])}
counts['total']=counts['rules']+counts['controller']+counts['old_checks']
quality={'date':'2026-10-05','passed':True,'status':'accepted_within_recorded_local_sample_scope','direction':12,'scope':'Original finite wetland photography study: camera panning and magnification, three time-dependent animal subjects, shared scene projection and public photography score, actual canvas photograph pixels stored under corresponding legal shutter records, field journal. First ten-reference batch and eleventh deck study retained separately.','primary_reference':'https://www.albawildlife.com/','art_provenance':'assets/directions/wildlife-generation-20261005.json','verification':counts,'screenshots':reports['browser']['screenshots'],'preservation':{'protected_web_files':baseline['protected_count'],'previous_readme_suffix_bytes':baseline['readme_suffix_bytes'],'old_forms':107,'old_entrances':116,'previous_original_directions':11,'initial_reference_batch':10},'limitations':['Original finite single-wetland, three-species 2D sample; no full free-roaming island or 3D world','Animals are original bitmap sprites moved by local deterministic rules; no skeletal creature animation or real ecological simulation','Photography scores are game composition criteria, not scientific identification or wildlife behavior advice','No upstream code, artwork, story or complete commercial game port','390px browser viewport, if tested, does not establish physical mobile compatibility','No sustained-performance benchmark, broad platform compatibility, server accounts or multiplayer claims','Human continuing-play interest, emotional value and commercial maturity have not been measured']}
(p/'notes/direction-wildlife-quality-20261005.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prefix=f'''2026-10-05 本轮新增 [芦湾观鸟 · 自然摄影与野外观察](http://127.0.0.1:8962/direction-wildlife.html?demo=1#play)。方向试玩现在共 **12 个**：首批十条开源参考完成后的扩展分别为雾海牌航、芦湾观鸟；原有 107 种形态与 116 个入口继续分别保留。新样例在一片原创湿地里观察苍鹭、翠鸟和林鹿，移动取景、调整焦距，稳定镜头后拍照。动物活动与相机位置共同决定实际画面，入框、占比、构图与稳定性决定每次快门的评分，三种动物各有一幅合格照片后暂停并完成。

摄影画面为 Canvas2D，场景、动物与计分共用引擎投影。快门从当时实际渲染取得 PNG 画面，照片与合法快门记录的编号一一绑定，再进入图鉴；不是提前制作的成功照片。可以重拍、检查照片、下载实际成片，示范与手动调用相同摄影规则。独立键 `world-play-direction-wildlife-v1` 保存状态；照片档案使用独立 IndexedDB，恢复后暂停。储存失败时应明确说明照片是否仅在本轮保留，禁止制造丢失的旧照片。

两份原创位图由内置 ImageGen 生成并原样复制：[湿地场景](web/assets/directions/wildlife/landscape.png) 与 [四格动物透明图集](web/assets/directions/wildlife/animals-atlas.png)；[完整提示词、生成模式与源路径](assets/directions/wildlife-generation-20261005.json) 和 [实际图像尺寸、alpha 与运行时切片边界](notes/wildlife-art-inspection-20261005.json) 已保存。场景 1672×941，动物图集 1254×1254；画面不是几何动物或图片滤镜。

新增 {counts['rules']} 项实际规则与 {counts['controller']} 项生产控制器回调通过，旧 11 个方向的 22 个脚本重新运行，{counts['old_checks']} 项继续通过，合计 **{counts['total']} 项**。[规则](notes/direction-wildlife-rules-20261005.json) · [控制器](notes/direction-wildlife-controller-20261005.json) · [旧方向实际回归](notes/direction-wildlife-regressions-20261005.json)。[真实浏览器记录](notes/direction-wildlife-browser-20261005.json) 包含 {counts['browser']} 项验收与 {len(reports['browser']['screenshots'])} 张接受截图，截图像素与 CSS 视口分别记录。[质量与范围](notes/direction-wildlife-quality-20261005.json) 与 [交付及保留检查](notes/direction-wildlife-package-20261005.json) 保存最终证据。此前 {baseline['protected_count']} 个受保护网页文件与 README 全部 {baseline['readme_suffix_bytes']} 字节历史须逐字保留。

类型参照 [Alba: A Wildlife Adventure 官方介绍](https://www.albawildlife.com/) 的自然观察与摄影参与方式。商业原作与首批开源目录分别标注；本站不采用原作源码、美术、角色或故事。当前是本地有限、二维三种动物的观察样例；没有完整岛屿漫游、动物骨骼动画或真实生态模拟。实际真人继续意愿、商业产品成熟度、持续性能和广泛兼容未测量。

以下逐字保留此前实现与验收记录。

'''
readme=(p/'README.md').read_bytes(); suffix=readme[-baseline['readme_suffix_bytes']:]
assert hashlib.sha256(suffix).hexdigest()==baseline['readme_suffix_sha256']
(p/'README.md').write_bytes(prefix.encode('utf-8')+suffix)
print(json.dumps(counts,ensure_ascii=False))
