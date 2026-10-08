"""Connect the reviewed reference directory to existing public summaries."""
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
root = project.parents[1]
web = project / 'web'

def replace_once(path, before, after):
    text = path.read_text(encoding='utf-8')
    assert text.count(before) == 1, (path.name, before[:60])
    path.write_text(text.replace(before, after, 1), encoding='utf-8')

replace_once(web / 'forms.html', '<a href="#forms">形态图谱</a>',
             '<a href="#forms">形态图谱</a><a href="references.html">开源游戏参考 ↗</a>')
replace_once(web / 'forms.html', '<link rel="stylesheet" href="forms.css?v=3">',
             '<link rel="stylesheet" href="forms.css?v=4">')
reference_section = '''
<section class="reference-summary" id="references"><div class="section-head"><div><p class="eyebrow">OPEN SOURCE GAME REFERENCES</p><h2>用真实游戏，建立效果参照。</h2></div><a class="reference-launch" href="references.html">进入参考汇总 · 7 组精选 →</a></div><div class="reference-summary-grid"><article><h3><a href="https://github.com/bobeff/open-source-games" target="_blank" rel="noopener noreferrer">bobeff / open-source-games ↗</a></h3><p>按类型收录开源游戏、引擎与商业游戏的重实现。对我们有三项价值：发现不同参与方式、用真实游戏校准效果、通过源码筛选可复用能力。</p><span>参考目录 · 具体游戏运行与许可逐项核查</span></article><article><h3>三条优先体验路线</h3><p><a href="references.html#hypersomnia">Hypersomnia · 动作掌控 →</a><br><a href="references.html#isocity">IsoCity · 空间建造 →</a><br><a href="references.html#supertuxkart">SuperTuxKart · 三维速度 →</a></p><span>官方体验入口 × 本站同类示例 × 观察重点</span></article></div></section>
'''
replace_once(web / 'forms.html', '<section id="forms" class="forms-section">',
             reference_section + '<section id="forms" class="forms-section">')
replace_once(web / 'showcase.html', '<a href="forms.html">游戏形态对照 ↗</a>',
             '<a href="forms.html">游戏形态对照 ↗</a><a href="references.html">开源游戏参考 ↗</a>')
replace_once(web / 'showcase.html', '<a href="#collection">浏览全部 116 个入口 ↓</a>',
             '<a href="#collection">浏览全部 116 个入口 ↓</a><a href="references.html">真实游戏参考与效果标准 ↗</a>')
replace_once(web / 'index.html', '<a href="#extension">04 更多气质</a>',
             '<a href="#extension">04 更多气质</a><a href="references.html">开源游戏参考 ↗</a>')
replace_once(web / 'index.html', '<h2>十六种游戏形态，亲手体验。</h2>',
             '<h2>107 种游戏形态，亲手体验。</h2>')
replace_once(web / 'index.html', '>进入 25 个试玩入口 ↗</a>', '>进入 116 个试玩入口 ↗</a>')
index_reference = '''
<section class="section" id="open-game-references" style="padding:32px 5%;margin-top:20px;border:1px solid #bdb6a6;border-radius:12px;background:#ece7dc"><div class="section-title"><div><p class="eyebrow">REFERENCE / 开源游戏参考</p><h2>从真实游戏，学习参与方式与效果。</h2><p class="intro"><a href="https://github.com/bobeff/open-source-games" target="_blank" rel="noopener noreferrer">bobeff/open-source-games ↗</a> 按类型收录开源游戏与引擎，帮助我们发现方向、校准展示质量、筛选源码能力。优先比较 Hypersomnia 的动作掌控、IsoCity 的空间建造与 SuperTuxKart 的三维速度。</p></div><a class="prototype-launch" href="references.html">打开参考说明与官方体验 ↗</a></div><p class="small-note">7 组精选参考各有来源、体验路径与本站同类入口。原有游戏保留；本批接入参考资料与外部体验入口。</p></section>
'''
replace_once(web / 'index.html', '<section id="original" class="section original-section">',
             index_reference + '<section id="original" class="section original-section">')

catalog_path = root / 'projects.json'
catalog_text = catalog_path.read_text(encoding='utf-8')
catalog = json.loads(catalog_text)
record = next(item for item in catalog if item['id'] == 10 and item['slug'] == 'dumpling-style-lab')
summary = ('目标：比较游戏类型、镜头、操作对象与参与形式；实现：107种原创可玩形态与原有九款，共116个入口，旧玩法、美术版本与存档保留；'
           '参考：bobeff/open-source-games开源游戏分类目录，汇总7组候选，优先比较Hypersomnia、IsoCity与SuperTuxKart；'
           '价值：通过官方体验建立效果标准，通过源码筛选编辑、物理、寻路与联机能力；'
           '技术：Canvas 2D / Three.js / 独立存档，官方游戏按各自运行方式与许可评估；'
           '边界：本站实现为可玩短关卡；本批接入参考说明、官方外部体验和本站同类对照，候选游戏本地部署、内嵌兼容性与实机质量待验证。')
replace_once(catalog_path, json.dumps(record['summary'], ensure_ascii=False), json.dumps(summary, ensure_ascii=False))

readme_block = '''开源游戏参考已接入网页汇总：[参考说明与官方体验](http://127.0.0.1:8962/references.html) · [形态页参考栏目](http://127.0.0.1:8962/forms.html#references)。来源是 [bobeff/open-source-games](https://github.com/bobeff/open-source-games)，用于发现类型、建立效果标准与筛选复用能力。精选 7 组，优先 Hypersomnia、IsoCity、SuperTuxKart，各有官方体验、本站同类入口与具体观察项。本批接入参考资料和外部入口，尚未完成候选游戏本地部署或实机验收。原有 107 种形态、116 个入口及其存档继续保留。

'''
path = project / 'README.md'
path.write_text(readme_block + path.read_text(encoding='utf-8'), encoding='utf-8')
web_readme = web / 'README.md'
text = web_readme.read_text(encoding='utf-8')
assert text.startswith('# 49 个试玩入口 · 世界与玩法')
text = text.replace('# 49 个试玩入口 · 世界与玩法', '# 116 个试玩入口 · 世界与玩法', 1)
text = text.replace('最新形态页接入 **40 种可玩形态**', '以下为较早一批记录：当时形态页接入 **40 种可玩形态**', 1)
heading, rest = text.split('\n', 1)
web_readme.write_text(heading + '\n\n' + readme_block + rest.lstrip('\n'), encoding='utf-8')
print('Reference routes connected; existing gameplay catalog is unchanged.')
