"""Append LANTERN LEXICON and retain every previous experience and reference."""
from pathlib import Path
import argparse, base64, hashlib, json, re

p=Path(__file__).resolve().parents[1]
web=p/'web'
record=p/'notes/language-preservation-before-20261006.json'
digest=lambda data:hashlib.sha256(data).hexdigest()
mutable=['directions.html',*[f'direction-{n}.html' for n in ['park','coop','shift','freight','dungeon','stealth','space','survival','vehicle','deck','wildlife','investigation','landscape']],'references.html','forms.html']
if not record.exists():
    prior=json.loads((p/'notes/landscape-preservation-before-20261006.json').read_text('utf-8'))
    sections=prior['preserved_expansion_sections'][:]
    for filename,section_id in [('directions.html','landscape-direction'),('references.html','landscape-reference')]:
        match=re.search(r'<section\b[^>]*id="'+section_id+r'"[^>]*>.*?</section>',(web/filename).read_text('utf-8'),re.S)
        assert match,section_id
        data=match.group().encode('utf-8')
        sections.append({'file':filename,'direction':'landscape','sha256':digest(data),'base64':base64.b64encode(data).decode()})
    protected={f.relative_to(web).as_posix():digest(f.read_bytes()) for f in web.rglob('*') if f.is_file() and f.relative_to(web).as_posix() not in mutable and not f.name.startswith('direction-language') and 'assets/directions/language/' not in f.relative_to(web).as_posix()}
    readme=(p/'README.md').read_bytes()
    reports={f.name:digest(f.read_bytes()) for f in (p/'notes').glob('direction-*.json') if not f.name.startswith('direction-language-')}
    baseline={'date':'2026-10-06','mutable_navigation':mutable,'protected':protected,'protected_count':len(protected),'preserved_expansion_sections':sections,'readme_suffix_bytes':len(readme),'readme_suffix_sha256':digest(readme),'readme_suffix_base64':base64.b64encode(readme).decode(),'historical_reports':reports}
    record.write_text(json.dumps(baseline,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
baseline=json.loads(record.read_text('utf-8'))
parser=argparse.ArgumentParser();parser.add_argument('--capture-only',action='store_true')
if parser.parse_args().capture_only:
    print(json.dumps({'protected':baseline['protected_count'],'readme_bytes':baseline['readme_suffix_bytes'],'old_sections':len(baseline['preserved_expansion_sections']),'reports':len(baseline['historical_reports'])}));raise SystemExit
url='direction-language.html?demo=1#play'
reference='https://www.inklestudios.com/heavensvault/'
nav=f'<a href="{url}">灯市译语 ↗</a>'
for name in mutable:
    file=web/name;text=file.read_text('utf-8')
    if nav not in text:
        assert '</nav>' in text
        text=text.replace('</nav>',nav+'</nav>',1)
    if name=='directions.html':
        text=text.replace('14 个原创方向试玩 · 首批 10 条参考已完成','15 个原创方向试玩 · 首批 10 条参考已完成')
        text=text.replace('新体验：溪丘拼境 · 地景拼片与邻接连缀','溪丘拼境 · 地景拼片与邻接连缀')
        if '新体验：灯市译语' not in text:
            marker='<p><a href="direction-landscape.html?demo=1#play">溪丘拼境'
            assert marker in text
            text=text.replace(marker,f'<p><a href="{url}">新体验：灯市译语 · 陌生语言解读 →</a></p>'+marker,1)
        text=text.replace('牌组构筑、自然摄影与环境调查继续保留；新增第十四方向溪丘拼境，旋转并放置六边形地块，以实际邻接连成一片景观。','此前十四个原创方向全部保留；新增第十五方向灯市译语，从场景与行为理解六个陌生符号，再用理解完成交流。')
        if 'id="language-direction"' not in text:
            marker='    <details class="trend">';assert marker in text
            section=f'''    <section class="genre-expansion" id="language-direction" aria-label="陌生语言解读的新方向"><div class="section-heading"><div><p class="eyebrow">GENRE EXPANSION / 15</p><h2>从看不懂，到终于听懂。</h2></div><p>此前十四个原创方向与首批十条参考继续保留。<br>这一程，用场景和行为建立自己的词义假设。</p></div><div class="direction-grid"><article class="direction-card featured"><span class="index">15 / 陌生语言解读 × 情境验证</span><h3>观察、猜测，再用理解交流。</h3><p>新增灯市译语 LANTERN LEXICON：在市集、水门与灯塔观察十二段情境记录。六个原创符号都有可修改的词义假设，至少两段不同记录支持后才能验证；读懂请求，选择物品或操作，打开下一段旅程。</p><div class="emotion">好奇 · 理解 · 交流 · 顿悟</div><a href="{url}">试玩「灯市译语」 →</a><small><a href="{reference}" target="_blank" rel="noopener noreferrer">Heaven’s Vault · inkle 官方介绍 ↗</a><br>商业原作只作语言解读的类型参照；本站符号、场景、美术与短局规则独立创作。</small></article></div></section>
'''
            text=text.replace(marker,section+marker,1)
    if name=='references.html':
        text=text.replace('14 个原创方向试玩','15 个原创方向试玩').replace('NEW / FOURTEEN REASONS TO PLAY','NEW / FIFTEEN REASONS TO PLAY').replace('十四种参与方式，继续探索游戏形式。','十五种参与方式，继续探索游戏形式。')
        text=text.replace('十四个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。','灯市译语：从情境猜测词义，用不同记录验证，再以理解完成交流。<br>十五个原创短样例可独立试玩、保存；首批十条参考的样例继续保留。')
        text=text.replace('探索 14 个试玩与原作入口','探索 15 个试玩与原作入口')
        text=text.replace('class="button primary" href="direction-landscape','class="button" href="direction-landscape').replace('新增：溪丘拼境','溪丘拼境')
        if '新增：灯市译语' not in text:
            text=text.replace('<div class="launch-actions">',f'<div class="launch-actions"><a class="button primary" href="{url}">新增：灯市译语 · 陌生语言解读 →</a>',1)
        if 'id="language-reference"' not in text:
            marker='  <section class="ref-section" id="standards">';assert marker in text
            section=f'''  <section class="ref-section" id="language-reference"><div class="section-head"><div><p class="eyebrow">BEYOND THE FIRST TEN / 15</p><h2>让陌生符号，成为彼此理解的起点。</h2></div><p>情境观察与语言解读的商业类型参照。<br>与首批十条开源参考分别记录，前四个扩展参照全文保留。</p></div><div class="candidate-grid"><article><span class="pill">陌生语言 / 情境解读</span><h3>Heaven’s Vault</h3><p>inkle 的官方介绍以考古冒险与解读古老文字为中心，翻译会影响故事的走向。我们的学习关注是：玩家怎样从场景建立词义假设，再让逐渐理解的语言改变自己的行动。</p><div class="source-links"><a href="{reference}" target="_blank" rel="noopener noreferrer">inkle 官方介绍 ↗</a><a href="{url}">原创灯市译语 →</a></div><p>本站运行三个地点、六个原创符号与十二段情境记录的有限短局。假设可以修改；验证需要至少两个实际不同记录，交流结果依照实际选择产生。不采用原作代码、文字系统、剧情或美术；旧 107 种形态／116 个入口及首批十条开源参考继续保留。</p></article></div></section>
'''
            text=text.replace(marker,section+marker,1)
    if name=='forms.html':
        text=text.replace('class="reference-launch" href="direction-landscape.html?demo=1#play">新试玩：地景拼片 × 邻接连缀',f'class="reference-launch" href="{url}">新试玩：陌生语言 × 情境解读')
        text=text.replace('方向试玩现在共十四种，旧形式目录仍为 107 种／116 个入口。','新增第十五方向灯市译语，从情境记录验证词义并完成交流。方向试玩现在共十五种，旧形式目录仍为 107 种／116 个入口。')
        if '灯市译语 →' not in text:
            marker='<br><a href="directions.html#directions">进入方向地图';assert marker in text
            text=text.replace(marker,f' · <a href="{url}">灯市译语 →</a>'+marker,1)
    for old in baseline['preserved_expansion_sections']:
        if old['file']==name:assert base64.b64decode(old['base64']).decode('utf-8') in text,f'Changed previous section {name}/{old["direction"]}'
    file.write_text(text,encoding='utf-8',newline='')
print(json.dumps({'integrated_pages':len(mutable),'directions':15,'old_sections_preserved':len(baseline['preserved_expansion_sections'])}))
