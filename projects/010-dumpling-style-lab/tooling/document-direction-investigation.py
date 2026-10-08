"""Record the completed original investigation study from actual current evidence."""
from pathlib import Path
from PIL import Image
import json, hashlib

p = Path(__file__).resolve().parents[1]
baseline = json.loads((p/'notes/investigation-preservation-before-20261005.json').read_text('utf-8'))
reports = {name: json.loads((p/f'notes/direction-investigation-{name}-20261005.json').read_text('utf-8')) for name in ['rules','controller','regressions','browser']}
assert all(x.get('passed', x.get('overallpassed', False)) for x in reports.values())
assert all(x.get('passed') is True for x in reports['browser']['checks'])
for capture in reports['browser']['screenshots']:
    with Image.open(capture['file']) as im:
        capture['capture_size'] = list(im.size)
        capture['format'] = im.format
    capture['sha256'] = hashlib.sha256(Path(capture['file']).read_bytes()).hexdigest()
(p/'notes/direction-investigation-browser-20261005.json').write_text(json.dumps(reports['browser'], ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
counts = {'rules': len(reports['rules']['checks']), 'controller': len(reports['controller']['checks']), 'old_checks': reports['regressions']['total_checks'], 'browser': len(reports['browser']['checks'])}
counts['total'] = counts['rules'] + counts['controller'] + counts['old_checks']
quality = {'date':'2026-10-05', 'passed':True, 'status':'accepted_within_recorded_local_short_case_scope', 'direction':13,
    'scope':'Original single finite environmental investigation: the empty postal bag has returned but the rerouted delivery records have a gap; three illustrated locations, nine authored clues, three explicit hypotheses each supported by two discovered evidence records; choice of two original epilogues only after the actual case is supported. Native scene hotspots, readable casebook and same legal acts for demonstration and manual investigation.',
    'primary_reference':'https://store.steampowered.com/app/1677770/The_Case_of_the_Golden_Idol/',
    'art_provenance':'assets/directions/investigation-generation-20261005.json', 'verification':counts, 'screenshots':reports['browser']['screenshots'],
    'preservation':{'protected_web_files':baseline['protected_count'],'previous_readme_suffix_bytes':baseline['readme_suffix_bytes'],'old_forms':107,'old_entrances':116,'previous_original_directions':12,'initial_reference_batch':10},
    'limitations':['Original single finite three-location case, not an endless or procedurally generated mystery campaign', 'Scene objects are original illustrations with native inspection targets; no free movement, 3D world or character animation', 'Facts and supported deductions are authored fictional game logic, not AI-generated conclusions or real investigative/legal advice', 'No upstream code, artwork, characters, story or complete commercial game port', 'Responsive browser viewport does not establish physical mobile-device compatibility', 'No sustained-performance benchmark, broad platform compatibility, server accounts or multiplayer claims', 'Human continuing-play interest, emotional value and commercial maturity have not been measured']}
(p/'notes/direction-investigation-quality-20261005.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prefix = f'''2026-10-05 本轮新增 [夜港来信 · 环境调查与证据重构](http://127.0.0.1:8962/direction-investigation.html?demo=1#play)。方向试玩现在共 **13 个**：首批十条开源参考完成后的扩展为雾海牌航、芦湾观鸟、夜港来信；原有 107 种形态与 116 个入口分别保留。原创单案发生在雨后夜港：一只空邮袋送回了，临时改道的送信记录却缺了一段。玩家在车站、邮务室与栈桥检查九处线索，判断邮袋由谁安排改道、经哪条路线、到了哪里。三项推断各需实际找到两条支持证据，显式检验后才能完成；错误假设和不一致证据可以修正，修改已验证的推断会撤销验证。

场景是三张原创位图，地点、热点和调查册由原生 HTML 提供。线索正文、候选、证据、验证反馈和结局是实际可操作的游戏内容。完整示范使用与手动相同的合法检查、选择、引用证据与验证步骤，支持暂停、速度切换和途中接管；不会提前注入全部线索或成功状态。三项事实与原信成立后，选择正式归档或给来信人回信，两种收尾都有独立叙事。独立键 `world-play-direction-investigation-v1` 保存真实发现和推断；存档通过完整合法行动重放校验，恢复后暂停。

三份原创场景由内置 ImageGen 生成并原样复制：[车站](web/assets/directions/investigation/station.png)、[邮务室](web/assets/directions/investigation/office.png)、[栈桥](web/assets/directions/investigation/quay.png)；[完整提示词、生成模式与源路径](assets/directions/investigation-generation-20261005.json) 与 [实际图像尺寸及热点检查](notes/investigation-art-inspection-20261005.json) 保存。线索文字使用原生中文，不依赖图像里的文字辨认。

新增 {counts['rules']} 项实际规则与 {counts['controller']} 项生产控制器回调通过；旧 12 个方向的 24 个脚本重新运行，{counts['old_checks']} 项继续通过，合计 **{counts['total']} 项**。[规则](notes/direction-investigation-rules-20261005.json) · [控制器](notes/direction-investigation-controller-20261005.json) · [旧方向实际回归](notes/direction-investigation-regressions-20261005.json)。[真实浏览器记录](notes/direction-investigation-browser-20261005.json) 包含 {counts['browser']} 项验收与 {len(reports['browser']['screenshots'])} 张接受截图，截图像素与 CSS 视口分别记录。[质量与范围](notes/direction-investigation-quality-20261005.json) 与 [交付及保留检查](notes/direction-investigation-package-20261005.json) 保存证据。此前 {baseline['protected_count']} 个受保护网页文件与 README 全部 {baseline['readme_suffix_bytes']} 字节历史逐字保留。

类型参照 [The Case of the Golden Idol 正式产品介绍](https://store.steampowered.com/app/1677770/The_Case_of_the_Golden_Idol/) 的场景调查与事件重构参与方式；此商业参考与原先开源目录分开记录。本站的港口、人物、事件、场景和结局均为原创，不移植原作代码或资源。本轮是固定三地点的有限二维调查样例，没有完整长篇侦探战役、自由漫游或 AI 推理。真人继续意愿、商业产品成熟度、持续性能、广泛兼容未测量。

以下逐字保留此前实现与验收记录。

'''
readme = (p/'README.md').read_bytes()
suffix = readme[-baseline['readme_suffix_bytes']:]
assert hashlib.sha256(suffix).hexdigest() == baseline['readme_suffix_sha256']
(p/'README.md').write_bytes(prefix.encode('utf-8')+suffix)
print(json.dumps(counts, ensure_ascii=False))
