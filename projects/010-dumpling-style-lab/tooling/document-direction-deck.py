"""Document actual completed deck evidence while retaining all previous notes."""
from pathlib import Path
import json, hashlib
from PIL import Image
p=Path(__file__).resolve().parents[1]
baseline=json.loads((p/'notes/deck-preservation-before-20261005.json').read_text('utf-8'))
reports={name:json.loads((p/f'notes/direction-deck-{name}-20261005.json').read_text('utf-8')) for name in ['rules','controller','regressions','browser']}
assert all(x['passed'] for x in reports.values())
for capture in reports['browser']['screenshots']:
    with Image.open(capture['file']) as im:
        capture['capture_size']=list(im.size)
        capture['format']=im.format
    capture['sha256']=hashlib.sha256(Path(capture['file']).read_bytes()).hexdigest()
(p/'notes/direction-deck-browser-20261005.json').write_text(json.dumps(reports['browser'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
counts={'rules':len(reports['rules']['checks']),'controller':len(reports['controller']['checks']),'old_checks':reports['regressions']['total_checks'],'browser':len(reports['browser']['checks'])}
counts['total']=counts['rules']+counts['controller']+counts['old_checks']
quality={'date':'2026-10-05','passed':True,'status':'accepted_in_recorded_local_sample_scope','scope':'Eleventh original direction; first of a new genre expansion after the completed initial ten-reference batch. Native HTML turn-based deckbuilding table, three finite encounters, seeded draws and reshuffle, actual intent/energy/damage/block/weakness/exhaust, persistent HP, repair-or-upgrade intermission and one real card reward. No original Slay the Spire code or art is adopted.','art_provenance':'assets/directions/deck-generation-20261005.json','primary_reference':'https://www.megacrit.com/games/','verification':counts,'screenshots':reports['browser']['screenshots'],'preservation':{'protected_web_files':baseline['protected_count'],'previous_readme_suffix_bytes':baseline['readme_suffix_bytes'],'old_forms':107,'old_entrances':116,'original_reference_batch':10},'limitations':['Finite original three-encounter study, not a full procedural roguelike campaign','Six original base card illustrations; two reward cards reuse the relevant illustration, with unique live text and effects','Native 2D illustrated card table, not a real 3D ship simulation','390px browser viewport is not physical mobile hardware','No online multiplayer, server account, upstream port, original game assets, long-run performance benchmark or broad compatibility claims','Human emotional value, continuing play and commercial product maturity not tested']}
(p/'notes/direction-deck-quality-20261005.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prefix=f'''2026-10-05 本轮新增 [雾海牌航 · 构筑牌组与航路抉择](http://127.0.0.1:8962/direction-deck.html?demo=1#play)。这是完成原先十条参考之后的新类型扩展，方向试玩共 **11 个**；原有 107 种形态、116 个入口与首批 10/10 方向继续分别保留。新样例是一段原创三场航程，观察对手下一回合的意图，把 3 点能量分配给攻击、格挡、抽牌、修补与虚弱。手牌实际移入弃牌或本场消耗区，抽牌堆用尽后重新洗入弃牌；牌堆可逐张查看，升级的是指定实例，奖励牌真实加入牌组，船体状态贯穿下一场。

第一场后可选择恢复船体或永久升级一张现有牌，第二场后选择雾幕或照明弹奖励，第三场实际突破暗潮风眼后完成并暂停。完整示范使用与玩家同样的合法行动与能量，不预置胜利帧；支持亲自出牌、途中接管、示范暂停与两档速度。独立键 `world-play-direction-deck-v1` 保存完整行动与牌堆；恢复通过确定性合法行动回放核对世界，载入后暂停。首批所有旧运行代码、美术与存档没有改写。

三份原创位图由内置 ImageGen 制作：[雾海场景](web/assets/directions/deck/landscape.png)、[六种卡面插画](web/assets/directions/deck/cards-atlas.png)、[船只与灯塔透明图集](web/assets/directions/deck/vessels-atlas.png)。[完整提示词、模式及原始生成路径](assets/directions/deck-generation-20261005.json) 已保存，PNG 原样复制到网页。原生 HTML 提供费用、效果、目标、护甲、意图与战况，卡面和船只从位图采样，实际行动触发反馈。两种奖励卡复用对应插画、各有独立规则与文字。全屏包含完整牌桌、手牌、结束回合、路线和牌堆检查；窄屏在手牌栏内部滚动，避免扩大页面。

实际新增 {counts['rules']} 项规则与 {counts['controller']} 项生产控制器回调通过；首批十个方向的 20 个脚本重新运行，440 项通过，合计 **{counts['total']} 项**。[规则](notes/direction-deck-rules-20261005.json) · [控制器](notes/direction-deck-controller-20261005.json) · [旧方向实际回归](notes/direction-deck-regressions-20261005.json)。真实浏览器记录 {counts['browser']} 项检查和 {len(reports['browser']['screenshots'])} 张接受截图，实际操作范围与视口分别记录；[浏览器报告](notes/direction-deck-browser-20261005.json)、[质量与范围](notes/direction-deck-quality-20261005.json) 及 [资源交付与保留检查](notes/direction-deck-package-20261005.json) 分别保存。既有 {baseline['protected_count']} 个受保护网页文件及此前 README 的 {baseline['readme_suffix_bytes']} 字节历史须逐字保留。

类型参考 [Mega Crit 官方 Slay the Spire 介绍](https://www.megacrit.com/games/)。这属于首批开源参考之外的商业原作类型研究；本站不采用原作代码、资产或故事。当前为本地二维有限三场短样例，没有完整程序生成战役、在线账号、多人或上游移植。窄屏是浏览器视口验收；真手机、持续性能、广泛兼容、真人继续意愿与商业成品质量未验证。

以下逐字保留此前实现和验收记录。

'''
readme=(p/'README.md').read_bytes(); suffix=readme[-baseline['readme_suffix_bytes']:]
assert hashlib.sha256(suffix).hexdigest()==baseline['readme_suffix_sha256']
(p/'README.md').write_bytes(prefix.encode('utf-8')+suffix)
print(json.dumps(counts,ensure_ascii=False))
