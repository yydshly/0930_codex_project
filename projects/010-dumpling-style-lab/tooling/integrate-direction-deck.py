"""Append a new genre study; retain the completed original ten-reference batch."""
from pathlib import Path
import json

p = Path(__file__).resolve().parents[1]
web = p / 'web'
baseline = json.loads((p / 'notes/deck-preservation-before-20261005.json').read_text('utf-8'))
nav = '<a href="direction-deck.html?demo=1#play">雾海牌航 ↗</a>'
url = 'direction-deck.html?demo=1#play'
for name in baseline['mutable_navigation']:
    path = web / name
    with path.open(encoding='utf-8', newline='') as file:
        text = file.read()
    if nav not in text:
        text = text.replace('</nav>', nav + '</nav>', 1)
    if name == 'directions.html':
        text = text.replace('本批 10 个原创可玩样例 · 10 条参考方向', '11 个原创方向试玩 · 首批 10 条参考已完成')
        if '新体验：雾海牌航' not in text:
            text = text.replace('<p><a href="direction-vehicle.html?demo=1#play">新体验：', '<p><a href="direction-deck.html?demo=1#play">新体验：雾海牌航 · 构筑牌组与航路抉择 →</a></p><p><a href="direction-vehicle.html?demo=1#play">')
        text = text.replace('本轮原创试玩有铜谷防线、风湾乐园、雾岭同行、夜航值守、湾岸货运、深岩堡垒、月影档案、星潮航路、雨后余生与岚谷试车场十个方向。', '首批十条参考均有原创试玩，继续保留。新增第十一种参与方式：雾海牌航，把牌组带过多场遭遇，让途中的选择改变下一战。')
        if '11 / 牌组构筑' not in text:
            marker = '    <details class="trend">'
            block = '''    <section class="genre-expansion" aria-label="首批之外的新类型探索"><div class="section-heading"><div><p class="eyebrow">GENRE EXPANSION / 11</p><h2>让同一副牌，走过不同的遭遇。</h2></div><p>首批十个方向之外，继续研究不同的游戏形式。<br>这里连接商业原作的官方介绍，本站运行原创短样例。</p></div><div class="direction-grid"><article class="direction-card featured"><span class="index">11 / 牌组构筑 × 路线抉择</span><h3>每次选牌，都在决定下一战。</h3><p>新增雾海牌航：观察对手意图，分配行动点，将出过的牌弃置并重新洗入牌库。船体状态贯穿三场遭遇，途中选择修补或升级，获得新牌后继续远航。</p><div class="emotion">判断 · 构筑 · 权衡 · 远航</div><a href="direction-deck.html?demo=1#play">试玩「雾海牌航」 →</a><small><a href="https://www.megacrit.com/games/" target="_blank" rel="noopener noreferrer">Slay the Spire · Mega Crit 官方介绍 ↗</a><br>商业原作的类型参照；本站没有采用原作源码、美术或世界设定。</small></article></div></section>
'''
            assert marker in text
            text = text.replace(marker, block + marker, 1)
    if name == 'references.html':
        text = text.replace('10 条方向地图', '首批 10 条参考已完成')
        text = text.replace('10 个原创方向试玩', '11 个原创方向试玩')
        text = text.replace('NEW / TEN REASONS TO PLAY', 'NEW / ELEVEN REASONS TO PLAY')
        text = text.replace('十种参与方式，从创造世界到驾驶机器。', '十一种参与方式，继续探索游戏形式。')
        text = text.replace('十个原创短样例可独立试玩、保存，比较设计带来的不同反馈。', '雾海牌航：牌库循环、对手意图、途中的升级与奖励。<br>十一个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。')
        if '新增：雾海牌航' not in text:
            text = text.replace('<div class="launch-actions">', '<div class="launch-actions"><a class="button primary" href="direction-deck.html?demo=1#play">新增：雾海牌航 · 牌组构筑与路线 →</a>', 1)
            text = text.replace('class="button primary" href="direction-vehicle', 'class="button" href="direction-vehicle').replace('新增：岚谷试车场', '岚谷试车场')
        text = text.replace('探索 10 条方向与原作入口', '探索 11 个试玩与原作入口')
        if 'id="deckbuilding-reference"' not in text:
            block = '''  <section class="ref-section" id="deckbuilding-reference"><div class="section-head"><div><p class="eyebrow">BEYOND THE FIRST TEN</p><h2>把类型研究，延伸到牌组的成长。</h2></div><p>首批十条参考之外的新增方向。<br>商业游戏的设计参照与开源目录分别标注。</p></div><div class="candidate-grid"><article><span class="pill">牌组构筑 / 连续遭遇</span><h3>Slay the Spire</h3><p>Mega Crit 官方把它描述为 roguelike 牌组构筑游戏。我们的学习重点是：牌库怎样循环、对手意图怎样帮助判断，以及跨场的升级和新增牌怎样改变后续行动。</p><div class="source-links"><a href="https://www.megacrit.com/games/" target="_blank" rel="noopener noreferrer">Mega Crit 官方介绍 ↗</a><a href="direction-deck.html?demo=1#play">原创雾海牌航 →</a></div><p>本站做有限三场的原创短航程，不移植原作。它不属于本页原先十条开源参考，也没有因此增加旧形式目录的历史统计。</p></article></div></section>
'''
            text = text.replace('  <section class="ref-section" id="standards">', block + '  <section class="ref-section" id="standards">', 1)
    if name == 'forms.html':
        text = text.replace('class="reference-launch" href="direction-vehicle.html?demo=1#play">新试玩：三维驾驶 × 四轮悬挂', 'class="reference-launch" href="direction-deck.html?demo=1#play">新试玩：牌组构筑 × 航路选择')
        text = text.replace('方向地图连接职业协作、乐园创造、交通经营与社区创作等十条参考路线。', '首批十条参考路线已完成；新增雾海牌航，探索牌组构筑与连续遭遇。方向试玩现在共十一种，旧形式目录仍为 107 种／116 个入口。')
        if '雾海牌航 →' not in text:
            text = text.replace('<br><a href="directions.html#directions">进入十条方向地图', ' · <a href="direction-deck.html?demo=1#play">雾海牌航 →</a><br><a href="directions.html#directions">进入方向地图')
    with path.open('w', encoding='utf-8', newline='') as file:
        file.write(text)
print('Added deck direction navigation to twelve existing HTML pages. Previous runtimes preserved.')
