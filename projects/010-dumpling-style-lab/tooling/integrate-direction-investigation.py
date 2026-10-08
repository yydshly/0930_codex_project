"""Append NIGHT POST; preserve all completed references and prior expansion cards."""
from pathlib import Path
import base64
import hashlib
import json

p = Path(__file__).resolve().parents[1]
web = p / 'web'
baseline = json.loads((p / 'notes/investigation-preservation-before-20261005.json').read_text('utf-8'))
url = 'direction-investigation.html?demo=1#play'
reference = 'https://store.steampowered.com/app/1677770/The_Case_of_the_Golden_Idol/'
nav = f'<a href="{url}">夜港来信 ↗</a>'

for name in baseline['mutable_navigation']:
    file = web / name
    with file.open(encoding='utf-8', newline='') as stream:
        text = stream.read()
    if nav not in text:
        assert '</nav>' in text, name
        text = text.replace('</nav>', nav + '</nav>', 1)

    if name == 'directions.html':
        text = text.replace('12 个原创方向试玩 · 首批 10 条参考已完成', '13 个原创方向试玩 · 首批 10 条参考已完成')
        text = text.replace('新体验：芦湾观鸟 · 自然摄影与野外观察', '芦湾观鸟 · 自然摄影与野外观察')
        if '新体验：夜港来信' not in text:
            marker = '<p><a href="direction-wildlife.html?demo=1#play">芦湾观鸟'
            assert marker in text
            text = text.replace(marker, f'<p><a href="{url}">新体验：夜港来信 · 环境调查与证据重构 →</a></p>' + marker, 1)
        text = text.replace('首批十条参考均有原创试玩，继续保留。第十一方向雾海牌航研究牌组构筑；新增第十二方向芦湾观鸟，观察湿地现场与动物活动，再用真正的取景与拍摄留下记录。', '首批十条参考均有原创试玩，继续保留。第十一方向雾海牌航与第十二方向芦湾观鸟保留；新增第十三方向夜港来信，在场景中寻找线索，用证据重构一段事件。')
        if 'id="investigation-direction"' not in text:
            marker = '    <details class="trend">'
            assert marker in text
            block = f'''    <section class="genre-expansion" id="investigation-direction" aria-label="环境调查与证据重构的新方向"><div class="section-heading"><div><p class="eyebrow">GENRE EXPANSION / 13</p><h2>沿着一封信，把事件重新拼起。</h2></div><p>首批十条参考已完成，牌组构筑与自然摄影继续保留。<br>第十三方向以有限原创环境调查短案，研究线索如何成为证据。</p></div><div class="direction-grid"><article class="direction-card featured"><span class="index">13 / 环境调查 × 证据重构</span><h3>先找到，再连接，最后作出判断。</h3><p>新增夜港来信 NIGHT POST：在车站、邮务室与栈桥三个地点调查九条线索。三项推断都要选出两条实际找到的证据，再验证它们的联系；最后作出选择，进入两种不同结局中的一种。</p><div class="emotion">观察 · 关联 · 推断 · 抉择</div><a href="{url}">试玩「夜港来信」 →</a><small><a href="{reference}" target="_blank" rel="noopener noreferrer">The Case of the Golden Idol · 正式产品介绍 ↗</a><br>商业原作的调查与重构类型参照；本站不复制原作代码、角色、剧情或图片，不属于原先十条开源参考。</small></article></div></section>
'''
            text = text.replace(marker, block + marker, 1)

    if name == 'references.html':
        text = text.replace('12 个原创方向试玩', '13 个原创方向试玩')
        text = text.replace('NEW / TWELVE REASONS TO PLAY', 'NEW / THIRTEEN REASONS TO PLAY')
        text = text.replace('十二种参与方式，继续探索游戏形式。', '十三种参与方式，继续探索游戏形式。')
        text = text.replace('十二个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。', '夜港来信：场景线索、两证据验证、事件重构与结局选择。<br>十三个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。')
        text = text.replace('探索 12 个试玩与原作入口', '探索 13 个试玩与原作入口')
        text = text.replace('class="button primary" href="direction-wildlife', 'class="button" href="direction-wildlife').replace('新增：芦湾观鸟', '芦湾观鸟')
        if '新增：夜港来信' not in text:
            marker = '<div class="launch-actions">'
            assert marker in text
            text = text.replace(marker, marker + f'<a class="button primary" href="{url}">新增：夜港来信 · 环境调查与证据重构 →</a>', 1)
        if 'id="investigation-reference"' not in text:
            marker = '  <section class="ref-section" id="standards">'
            assert marker in text
            block = f'''  <section class="ref-section" id="investigation-reference"><div class="section-head"><div><p class="eyebrow">BEYOND THE FIRST TEN / 13</p><h2>让场景里的细节，成为可以验证的证据。</h2></div><p>环境调查与证据重构的商业类型参照。<br>与原先十条开源参考分别记录；牌组构筑和自然摄影的新增参照全文保留。</p></div><div class="candidate-grid"><article><span class="pill">环境调查 / 证据重构</span><h3>The Case of the Golden Idol</h3><p>正式产品介绍强调寻找场景线索，并依据线索重构人物和事件。我们的学习关注是：把环境细节变成可选择的证据，让推断由找到的线索支持，再用验证反馈检验理解。</p><div class="source-links"><a href="{reference}" target="_blank" rel="noopener noreferrer">正式产品介绍 · Playstack / Color Gray Games ↗</a><a href="{url}">原创夜港来信 →</a></div><p>本站运行有限原创环境调查短案：三个地点、九条线索、三项需要两条实际证据的推断，以及两种不同结局。不复制原作代码、角色、剧情或图片，不宣称完整原作移植、AI 侦探或无穷叙事。这个商业参照不加入原先十条开源参考；旧 107 种形态／116 个入口保持不变。</p></article></div></section>
'''
            text = text.replace(marker, block + marker, 1)

    if name == 'forms.html':
        text = text.replace('class="reference-launch" href="direction-wildlife.html?demo=1#play">新试玩：自然摄影 × 野外观察', f'class="reference-launch" href="{url}">新试玩：环境调查 × 证据重构')
        text = text.replace('方向试玩现在共十二种，旧形式目录仍为 107 种／116 个入口。', '新增第十三方向夜港来信，研究环境调查与证据重构。方向试玩现在共十三种，旧形式目录仍为 107 种／116 个入口。')
        text = text.replace('Alba 的商业类型参照在原作参考页单独说明，不加入旧开源目录。', 'Alba 与 The Case of the Golden Idol 的商业类型参照在原作参考页分别说明，不加入旧开源目录。')
        if '夜港来信 →' not in text:
            marker = '<br><a href="directions.html#directions">进入方向地图'
            assert marker in text
            text = text.replace(marker, f' · <a href="{url}">夜港来信 →</a>' + marker, 1)

    for section in baseline['preserved_expansion_sections']:
        if section['file'] != name:
            continue
        original = base64.b64decode(section['base64']).decode('utf-8')
        assert original in text and hashlib.sha256(original.encode('utf-8')).hexdigest() == section['sha256'], f'Previous expansion changed: {name} / {section["direction"]}'
    with file.open('w', encoding='utf-8', newline='') as stream:
        stream.write(text)

print(f'Integrated NIGHT POST across {len(baseline["mutable_navigation"])} old navigation pages; 13 original directions, all four deck/wildlife expansion sections, first 10 references and 107 / 116 catalog retained.')
