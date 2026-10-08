"""Append REEDLIGHT while retaining the first ten references and MISTBOUND."""
from pathlib import Path
import json

p = Path(__file__).resolve().parents[1]
web = p / 'web'
baseline = json.loads((p / 'notes/wildlife-preservation-before-20261005.json').read_text('utf-8'))
url = 'direction-wildlife.html?demo=1#play'
nav = f'<a href="{url}">芦湾观鸟 ↗</a>'

for name in baseline['mutable_navigation']:
    file = web / name
    with file.open(encoding='utf-8', newline='') as stream:
        text = stream.read()
    if nav not in text:
        assert '</nav>' in text, name
        text = text.replace('</nav>', nav + '</nav>', 1)

    if name == 'directions.html':
        text = text.replace('走入湿地，观察动物习性，再用真正的取景与拍摄留下记录。', '观察湿地现场与动物活动，再用真正的取景与拍摄留下记录。')
        text = text.replace('观察、靠近、取景，再按下快门。', '观察、取景、调焦，再按下快门。')
        text = text.replace('在有限二维湿地中徒步，留意三种动物的活动与警觉。控制相机方向和变焦，把真实移动的动物纳入画面，拍出清晰记录，完成 120 秒的观察航程。', '在有限二维湿地观察位，移动镜头、调整焦距、等待三种动物活动。把实际移动的动物纳入画面，拍出清晰的本人照片记录，完成 120 秒的观察时段。')
        text = text.replace('11 个原创方向试玩 · 首批 10 条参考已完成', '12 个原创方向试玩 · 首批 10 条参考已完成')
        text = text.replace('新体验：雾海牌航 · 构筑牌组与航路抉择', '雾海牌航 · 构筑牌组与航路抉择')
        if '新体验：芦湾观鸟' not in text:
            marker = '<p><a href="direction-deck.html?demo=1#play">雾海牌航'
            assert marker in text
            text = text.replace(marker, f'<p><a href="{url}">新体验：芦湾观鸟 · 自然摄影与野外观察 →</a></p>' + marker, 1)
        text = text.replace('首批十条参考均有原创试玩，继续保留。新增第十一种参与方式：雾海牌航，把牌组带过多场遭遇，让途中的选择改变下一战。', '首批十条参考均有原创试玩，继续保留。第十一方向雾海牌航研究牌组构筑；新增第十二方向芦湾观鸟，观察湿地现场与动物活动，再用真正的取景与拍摄留下记录。')
        if 'id="wildlife-direction"' not in text:
            marker = '    <details class="trend">'
            assert marker in text
            block = '''    <section class="genre-expansion" id="wildlife-direction" aria-label="自然摄影与野外观察的新方向"><div class="section-heading"><div><p class="eyebrow">GENRE EXPANSION / 12</p><h2>慢下来，把看见的生命留下。</h2></div><p>继续扩展首批十条参考之外的原创试玩。<br>第十一方向雾海牌航保留；第十二方向走向自然摄影与野外观察。</p></div><div class="direction-grid"><article class="direction-card featured"><span class="index">12 / 自然摄影 × 野外观察</span><h3>观察、取景、调焦，再按下快门。</h3><p>新增芦湾观鸟 REEDLIGHT：在有限二维湿地观察位，移动镜头、调整焦距、等待三种动物活动。把实际移动的动物纳入画面，拍出清晰的本人照片记录，完成 120 秒的观察时段。</p><div class="emotion">好奇 · 耐心 · 发现 · 记录</div><a href="direction-wildlife.html?demo=1#play">试玩「芦湾观鸟」 →</a><small><a href="https://www.albawildlife.com/" target="_blank" rel="noopener noreferrer">Alba: A Wildlife Adventure · 官方介绍 ↗</a><br>商业原作的自然观察类型参照；本站不移植原作代码、素材、角色或地图。它不属于原先十条开源参考。</small></article></div></section>
'''
            text = text.replace(marker, block + marker, 1)

    if name == 'references.html':
        text = text.replace('芦湾观鸟：湿地徒步、动物习性、相机取景与照片记录。', '芦湾观鸟：湿地观察、动物活动、相机取景与实际拍摄记录。')
        text = text.replace('芦湾观鸟：湿地观察、动物活动、相机取景与本人照片记录。', '芦湾观鸟：湿地观察、动物活动、相机取景与实际拍摄记录。')
        text = text.replace('三种动物真实活动，照片由实际取景条件产生。', '移动镜头、调整焦距、等待三种动物活动，照片由实际取景条件产生。')
        text = text.replace('11 个原创方向试玩', '12 个原创方向试玩')
        text = text.replace('NEW / ELEVEN REASONS TO PLAY', 'NEW / TWELVE REASONS TO PLAY')
        text = text.replace('十一种参与方式，继续探索游戏形式。', '十二种参与方式，继续探索游戏形式。')
        text = text.replace('十一个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。', '芦湾观鸟：湿地观察、动物活动、相机取景与实际拍摄记录。<br>十二个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。')
        text = text.replace('探索 11 个试玩与原作入口', '探索 12 个试玩与原作入口')
        text = text.replace('class="button primary" href="direction-deck', 'class="button" href="direction-deck').replace('新增：雾海牌航', '雾海牌航')
        if '新增：芦湾观鸟' not in text:
            marker = '<div class="launch-actions">'
            assert marker in text
            text = text.replace(marker, marker + f'<a class="button primary" href="{url}">新增：芦湾观鸟 · 自然摄影与野外观察 →</a>', 1)
        if 'id="wildlife-reference"' not in text:
            marker = '  <section class="ref-section" id="standards">'
            assert marker in text
            block = '''  <section class="ref-section" id="wildlife-reference"><div class="section-head"><div><p class="eyebrow">BEYOND THE FIRST TEN / 12</p><h2>用观察与照片，认识身边的世界。</h2></div><p>自然摄影与野外观察的商业类型参照。<br>与原先十条开源参考分开记录；雾海牌航的新增参照继续保留。</p></div><div class="candidate-grid"><article><span class="pill">自然摄影 / 野外观察</span><h3>Alba: A Wildlife Adventure</h3><p>ustwo games 的官方介绍以岛上的野生动物探索与助人为线索，鼓励玩家按自己的节奏认识环境。我们的研究重点是：走近动物、观察行为和用相机记录，怎样让安静的探索也产生明确反馈。</p><div class="source-links"><a href="https://www.albawildlife.com/" target="_blank" rel="noopener noreferrer">Alba 官方介绍 ↗</a><a href="direction-wildlife.html?demo=1#play">原创芦湾观鸟 →</a></div><p>本站运行原创有限 120 秒二维湿地样例，移动镜头、调整焦距、等待三种动物活动，照片由实际取景条件产生。不移植原作代码、素材、角色或地图；不宣称迁移完整原作或无限世界。商业游戏 Alba 不属于本页原先十条开源参考，107 种形态／116 个入口的旧目录统计保持不变。</p></article></div></section>
'''
            text = text.replace(marker, block + marker, 1)

    if name == 'forms.html':
        text = text.replace('class="reference-launch" href="direction-deck.html?demo=1#play">新试玩：牌组构筑 × 航路选择', f'class="reference-launch" href="{url}">新试玩：自然摄影 × 野外观察')
        text = text.replace('首批十条参考路线已完成；新增雾海牌航，探索牌组构筑与连续遭遇。方向试玩现在共十一种，旧形式目录仍为 107 种／116 个入口。', '首批十条参考路线已完成；第十一方向雾海牌航探索牌组构筑与连续遭遇，第十二方向芦湾观鸟探索自然摄影与野外观察。方向试玩现在共十二种，旧形式目录仍为 107 种／116 个入口。Alba 的商业类型参照在原作参考页单独说明，不加入旧开源目录。')
        if '芦湾观鸟 →' not in text:
            marker = '<br><a href="directions.html#directions">进入方向地图'
            assert marker in text
            text = text.replace(marker, f' · <a href="{url}">芦湾观鸟 →</a>' + marker, 1)

    with file.open('w', encoding='utf-8', newline='') as stream:
        stream.write(text)

print(f'Integrated REEDLIGHT across {len(baseline["mutable_navigation"])} old navigation pages; 12 original directions, first 10 references and the 107 / 116 catalog retained.')
