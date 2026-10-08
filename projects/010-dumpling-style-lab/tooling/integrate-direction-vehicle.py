"""Add the tenth original direction without touching prior runtime or save code."""
from pathlib import Path
import re

web = Path(__file__).resolve().parents[1] / 'web'
pages = ['directions.html', 'direction-park.html', 'direction-coop.html', 'direction-shift.html', 'direction-freight.html', 'direction-dungeon.html', 'direction-stealth.html', 'direction-space.html', 'direction-survival.html', 'references.html', 'forms.html']
nav = '<a href="direction-vehicle.html?demo=1#play">岚谷试车场 ↗</a>'
compare = '<a href="direction-vehicle.html?demo=1#play">岚谷试车场 · 车辆物理 →</a>'
for name in pages:
    path = web / name
    with path.open(encoding='utf-8', newline='') as file:
        text = file.read()
    if nav not in text:
        text = text.replace('</nav>', nav + '</nav>', 1)
    text = text.replace('NINE DIFFERENT REASONS TO PLAY', 'TEN DIFFERENT REASONS TO PLAY').replace('NEW / NINE REASONS TO PLAY', 'NEW / TEN REASONS TO PLAY')
    text = text.replace('9 个原创', '10 个原创').replace('九个原创', '十个原创').replace('九个已完成方向', '十个已完成方向').replace('同一份好奇，八种进入世界的方法。', '同一份好奇，十种进入世界的方法。')
    text = re.sub(r'(<section class="[a-z]+-compare">)(.*?)(</section>)', lambda m: m[1] + (m[2] if 'direction-vehicle.html' in m[2] else m[2].replace('</div>', compare + '</div>') if '</div>' in m[2] else m[2] + compare) + m[3], text, flags=re.S)
    if name == 'directions.html':
        text = text.replace('星潮航路与雨后余生九个方向', '星潮航路、雨后余生与岚谷试车场十个方向')
        text = text.replace('新体验：雨后余生 · 环境生存与营地 →', '雨后余生 · 环境生存与营地 →')
        text = text.replace('<span class="tag">本轮 10 个原创可玩样例 · 10 条参考方向</span>', '<span class="tag">本批 10 个原创可玩样例 · 10 条参考方向</span><p><a href="direction-vehicle.html?demo=1#play">新体验：岚谷试车场 · 三维车辆物理 →</a></p>')
        old = '<article class="direction-card"><span class="index">09 / 车辆物理与工程协作</span><h3>操作真正复杂的机器</h3><p>参考车辆形变与物理世界，可探索越野运输、工程作业和共同救援。</p><a href="https://www.rigsofrods.org/" target="_blank" rel="noopener noreferrer">Rigs of Rods 原作与下载 ↗</a></article>'
        new = '<article class="direction-card featured"><span class="index">09 / 车辆物理与工程</span><h3>感受机器怎样回应地形</h3><p>参考 Rigs of Rods 的车辆模拟方向。新增岚谷试车场：驾驶真正三维的货车，比较四角弹簧阻尼、320 kg 载重与搓板路，跨桥后返回车库。</p><div class="emotion">驾驶 · 重量 · 调校 · 完成</div><a href="direction-vehicle.html?demo=1#play">试玩本轮「岚谷试车场」 →</a><small><a href="https://www.rigsofrods.org/" target="_blank" rel="noopener noreferrer">Rigs of Rods 原作与下载 ↗</a><br>新增为原创本地简化车辆物理样例，四轮悬挂实时运行</small></article>'
        text = text.replace(old, new)
    if name == 'references.html':
        text = text.replace('8 个新增方向试玩', '10 个原创方向试玩')
        text = text.replace('建设、创造、并肩挑战、共同值守、连接、附身、潜行，以及星际远航。', '十种参与方式，从创造世界到驾驶机器。')
        text = text.replace('十个原创短样例可独立试玩', '岚谷试车场：真正三维货车、四轮弹簧阻尼、载重与地形反馈。<br>十个原创短样例可独立试玩')
        text = text.replace('<div class="launch-actions">', '<div class="launch-actions"><a class="button primary" href="direction-vehicle.html?demo=1#play">新增：岚谷试车场 · 车辆物理与工程 →</a>', 1)
        text = text.replace('class="button primary" href="direction-survival', 'class="button" href="direction-survival').replace('新增：雨后余生', '雨后余生')
        text = text.replace('本页未下载、重新分发或替换候选项目的游戏资源。', '本站原创样例另行标注采用素材与许可；本页原作入口继续连接各自官方项目。')
    if name == 'forms.html':
        text = text.replace('class="reference-launch" href="direction-survival.html?demo=1#play">新试玩：环境生存 × 雨后营地', 'class="reference-launch" href="direction-vehicle.html?demo=1#play">新试玩：三维驾驶 × 四轮悬挂')
        text = text.replace('星潮航路与雨后余生十个原创试玩', '星潮航路、雨后余生与岚谷试车场十个原创试玩')
        text = text.replace('<br><a href="directions.html#directions">进入十条方向地图', ' · <a href="direction-vehicle.html?demo=1#play">岚谷试车场 →</a><br><a href="directions.html#directions">进入十条方向地图')
    with path.open('w', encoding='utf-8', newline='') as file:
        file.write(text)
print('Integrated vehicle navigation into 11 existing pages; prior runtimes untouched.')
