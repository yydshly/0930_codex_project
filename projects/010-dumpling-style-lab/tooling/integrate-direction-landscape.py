"""Append RIVERFOLD without replacing any prior game or independent reference."""
from pathlib import Path
import argparse, base64, hashlib, json, re

p = Path(__file__).resolve().parents[1]
web = p / 'web'
record = p / 'notes/landscape-preservation-before-20261006.json'
digest = lambda data: hashlib.sha256(data).hexdigest()
mutable = ['directions.html', *[f'direction-{n}.html' for n in ['park','coop','shift','freight','dungeon','stealth','space','survival','vehicle','deck','wildlife','investigation']], 'references.html', 'forms.html']
if not record.exists():
    old = json.loads((p/'notes/investigation-preservation-before-20261005.json').read_text('utf-8'))
    sections = old['preserved_expansion_sections'][:]
    for filename, section_id in [('directions.html','investigation-direction'),('references.html','investigation-reference')]:
        text = (web/filename).read_text('utf-8')
        match = re.search(r'<section\b[^>]*id="'+section_id+r'"[^>]*>.*?</section>', text, re.S)
        assert match, section_id
        data = match.group().encode('utf-8')
        sections.append({'file':filename,'direction':'investigation','sha256':digest(data),'base64':base64.b64encode(data).decode()})
    protected = {f.relative_to(web).as_posix():digest(f.read_bytes()) for f in web.rglob('*') if f.is_file() and f.relative_to(web).as_posix() not in mutable and not f.name.startswith('direction-landscape') and 'assets/directions/landscape/' not in f.relative_to(web).as_posix()}
    readme = (p/'README.md').read_bytes()
    reports = {f.name:digest(f.read_bytes()) for f in (p/'notes').glob('direction-*.json') if not f.name.startswith('direction-landscape-')}
    baseline = {'date':'2026-10-06','mutable_navigation':mutable,'protected':protected,'protected_count':len(protected),'preserved_expansion_sections':sections,'readme_suffix_bytes':len(readme),'readme_suffix_sha256':digest(readme),'readme_suffix_base64':base64.b64encode(readme).decode(),'historical_reports':reports}
    record.write_text(json.dumps(baseline,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
baseline = json.loads(record.read_text('utf-8'))
args = argparse.ArgumentParser()
args.add_argument('--capture-only',action='store_true')
if args.parse_args().capture_only:
    print(json.dumps({'protected':baseline['protected_count'],'readme_bytes':baseline['readme_suffix_bytes'],'old_sections':len(baseline['preserved_expansion_sections']),'reports':len(baseline['historical_reports'])}))
    raise SystemExit
url = 'direction-landscape.html?demo=1#play'
reference = 'https://www.toukana.com/dorfromantik'
nav = f'<a href="{url}">溪丘拼境 ↗</a>'
for name in mutable:
    file = web/name
    text = file.read_text('utf-8')
    if nav not in text:
        assert '</nav>' in text
        text = text.replace('</nav>',nav+'</nav>',1)
    if name == 'directions.html':
        text = text.replace('13 个原创方向试玩 · 首批 10 条参考已完成','14 个原创方向试玩 · 首批 10 条参考已完成')
        text = text.replace('新体验：夜港来信 · 环境调查与证据重构','夜港来信 · 环境调查与证据重构')
        if '新体验：溪丘拼境' not in text:
            marker = '<p><a href="direction-investigation.html?demo=1#play">夜港来信'
            assert marker in text
            text = text.replace(marker,f'<p><a href="{url}">新体验：溪丘拼境 · 地景拼片与邻接连缀 →</a></p>'+marker,1)
        text = text.replace('第十一方向雾海牌航与第十二方向芦湾观鸟保留；新增第十三方向夜港来信，在场景中寻找线索，用证据重构一段事件。','牌组构筑、自然摄影与环境调查继续保留；新增第十四方向溪丘拼境，旋转并放置六边形地块，以实际邻接连成一片景观。')
        if 'id="landscape-direction"' not in text:
            marker = '    <details class="trend">'
            assert marker in text
            section = f'''    <section class="genre-expansion" id="landscape-direction" aria-label="地景拼片与邻接连缀的新方向"><div class="section-heading"><div><p class="eyebrow">GENRE EXPANSION / 14</p><h2>一块一块，让景观接着生长。</h2></div><p>前十三个原创方向与首批十条参考继续保留。<br>这一程，把操作交给地块的朝向与邻接。</p></div><div class="direction-grid"><article class="direction-card featured"><span class="index">14 / 地景拼片 × 邻接连缀</span><h3>旋转、预览，再把它放下。</h3><p>新增溪丘拼境 RIVERFOLD：将十八块原创六边形地景放在实际相邻位置。森林、村落与河流按相接的边连接；河流不能接到陆地。观察连接预览与连续群落，撤回重排后完成属于自己的有限景观。</p><div class="emotion">安排 · 连缀 · 观赏 · 成形</div><a href="{url}">试玩「溪丘拼境」 →</a><small><a href="{reference}" target="_blank" rel="noopener noreferrer">Dorfromantik · Toukana 官方介绍 ↗</a><br>商业原作只作地块拼景的类型参照；本站地块、美术与规则独立创作。</small></article></div></section>
'''
            text = text.replace(marker,section+marker,1)
    if name == 'references.html':
        text = text.replace('13 个原创方向试玩','14 个原创方向试玩').replace('NEW / THIRTEEN REASONS TO PLAY','NEW / FOURTEEN REASONS TO PLAY').replace('十三种参与方式，继续探索游戏形式。','十四种参与方式，继续探索游戏形式。')
        text = text.replace('十三个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。','溪丘拼境：旋转地块、实际边缘连接、连续群落与有限景观。<br>十四个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。')
        text = text.replace('探索 13 个试玩与原作入口','探索 14 个试玩与原作入口')
        text = text.replace('class="button primary" href="direction-investigation','class="button" href="direction-investigation').replace('新增：夜港来信','夜港来信')
        if '新增：溪丘拼境' not in text:
            text = text.replace('<div class="launch-actions">',f'<div class="launch-actions"><a class="button primary" href="{url}">新增：溪丘拼境 · 地景拼片与邻接连缀 →</a>',1)
        if 'id="landscape-reference"' not in text:
            marker = '  <section class="ref-section" id="standards">'
            assert marker in text
            section = f'''  <section class="ref-section" id="landscape-reference"><div class="section-head"><div><p class="eyebrow">BEYOND THE FIRST TEN / 14</p><h2>让一块地景，成为下一块的起点。</h2></div><p>地块拼景与邻接连接的商业类型参照。<br>与首批十条开源参考分别记录，前三个扩展参照全文保留。</p></div><div class="candidate-grid"><article><span class="pill">地景拼片 / 邻接连缀</span><h3>Dorfromantik</h3><p>Toukana 的官方介绍把它描述为通过放置地块创造乡村景观的建设策略与益智游戏。我们的学习关注是：旋转与边缘匹配怎样把一次次局部选择连成一片可观赏的整体。</p><div class="source-links"><a href="{reference}" target="_blank" rel="noopener noreferrer">Toukana 官方介绍 ↗</a><a href="{url}">原创溪丘拼境 →</a></div><p>本站运行十八块加一块起始地的有限原创样例：实际旋转、邻接预览、河岸匹配、群落连接与撤回。不采用原作代码或美术，不宣称原作移植、生态模拟或无限生成世界；旧 107 种形态／116 个入口及原先十条开源参考分别保留。</p></article></div></section>
'''
            text = text.replace(marker,section+marker,1)
    if name == 'forms.html':
        text = text.replace('class="reference-launch" href="direction-investigation.html?demo=1#play">新试玩：环境调查 × 证据重构',f'class="reference-launch" href="{url}">新试玩：地景拼片 × 邻接连缀')
        text = text.replace('方向试玩现在共十三种，旧形式目录仍为 107 种／116 个入口。','新增第十四方向溪丘拼境，研究旋转地块与实际邻接连接。方向试玩现在共十四种，旧形式目录仍为 107 种／116 个入口。')
        if '溪丘拼境 →' not in text:
            marker = '<br><a href="directions.html#directions">进入方向地图'
            assert marker in text
            text = text.replace(marker,f' · <a href="{url}">溪丘拼境 →</a>'+marker,1)
    for old in baseline['preserved_expansion_sections']:
        if old['file']==name:
            assert base64.b64decode(old['base64']).decode('utf-8') in text, f'Changed previous section {name}/{old["direction"]}'
    file.write_text(text,encoding='utf-8',newline='')
print(json.dumps({'integrated_pages':len(mutable),'directions':14,'old_sections_preserved':len(baseline['preserved_expansion_sections'])}))
