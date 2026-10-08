"""Connect the existing guide and ten actual effect frames to the public entry."""
from pathlib import Path
import hashlib
import html
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
DATA = json.loads((ROOT / 'notes/effect-capability-overview-v16.json').read_text(encoding='utf-8'))
GUIDE = 'creative-products-capability-overview-v16'
ASSETS = WEB / 'assets/library-overview'
ASSETS.mkdir(parents=True, exist_ok=True)
for extension in ['png', 'svg']:
    source = ROOT / 'assets/library-overview' / f'{GUIDE}.{extension}'
    shutil.copy2(source, ASSETS / source.name)
assert hashlib.sha256((ASSETS / f'{GUIDE}.png').read_bytes()).hexdigest() == DATA['sha256']
e = html.escape
cards = []
for c in DATA['cases']:
    number = f"{c['id']:02d}"
    cards.append(f'''<article class="entry-card" id="entry-{number}">
      <a class="entry-image" href="labs/?id={c['id']}" aria-label="操作第 {number} 项：{e(c['short'])}"><img src="media/demo-{number}.webp" width="640" height="360" alt="{e(c['effect'])}，当前原型实景" loading="lazy"><span>进入独立演示 ↗</span></a>
      <div class="entry-copy"><p class="entry-number">{number} / {e(c['product'])}</p><h3>{e(c['short'])}</h3><p>{e(c['effect'])}</p><p class="entry-controls">{e(c['interaction'])}</p>
      <div class="entry-actions"><a class="entry-primary" href="labs/?id={c['id']}">操作演示</a><a href="#demo-{number}">原作对照</a><a href="research.html#case-{number}">原理与范围</a><a href="{e(c['sourceUrl'], quote=True)}" target="_blank" rel="noreferrer">@{e(c['author'])} 原帖 ↗</a></div></div>
    </article>''')
portal = f'''<!-- PUBLICATION_OVERVIEW:START -->
    <section class="publication-overview" id="overview" aria-label="完整研究与所有入口">
      <div class="publication-summary"><p class="eyebrow">UNDERSTANDING / EFFECTS / PRODUCTS</p><h2>我们的理解与十项实际效果，<br>从这里一起看。</h2>
      <p>这是一组以十个 Opus 创作案例为参考的原创浏览器原型。作品集、任务街区、叙事片、发布动效、机房生存、钢琴角色、研究集市、软胶、营地与车球，分别保留自己的效果依据、实现机制和产品方向。</p>
      <p>用真实截图先看效果，再打开单项演示核对输入、动作与输出。完整理解页说明 1 个 CSS、2 个 Canvas、7 个 Three.js 原型的内部原理、交付范围、扩展路径和对你的价值。</p>
      <div class="publication-buttons"><a class="pub-primary" href="#entries">十项效果与试玩 ↓</a><a href="research.html">阅读完整理解 ↗</a><a href="#products">原作 / 当前画面对照</a><a href="#effects">十个原作视频</a></div>
      <p class="publication-snapshot">研究：2026.10.02 · 效果快照：2026.10.03 · 整理发布：2026.10.08<br>05 / 07 / 09 / 10 为 v16，其余六项为 v15。当前没有 Opus 调用或模型生成后台。</p></div>
      <figure class="publication-guide"><a href="assets/library-overview/{GUIDE}.png" target="_blank" aria-label="放大已生成的完整能力总览图"><img src="assets/library-overview/{GUIDE}.png" width="3600" height="6640" alt="已有的十项创意效果库总览图：十项实景、Opus 来源、原理、能力范围、扩展产品与个人价值"><span>放大完整总览图 ↗</span></a><figcaption>沿用上面生成的原图 · 3600 × 6640<br><a href="assets/library-overview/{GUIDE}.png" download>下载高清 PNG</a> · <a href="assets/library-overview/{GUIDE}.svg" download>下载可编辑 SVG</a> · <a href="research.html#overview-guide">图文一起阅读</a></figcaption></figure>
    </section>
    <section id="entries" class="publication-entries" aria-label="十项当前效果和独立入口"><div class="section-heading"><div><p class="eyebrow">10 ORIGINAL PROTOTYPES</p><h2>十个项目，各自看效果、操作和原理。</h2></div><span class="count">当前实际运行图</span></div><p class="effects-intro">每张图都对应正在发布的原型。原作对照、独立试玩与本例原理分开直达；视频、音频、图片、离线网页等输出按单项能力提供。</p><div class="publication-entry-grid">{''.join(cards)}</div></section>
    <aside class="publication-resources" aria-label="全部相关资料与额外实验"><div><h3>来源与研究资料</h3><p><a href="research.html#resources">十位作者与工具分工</a> · <a href="https://x.com/minchoi/status/2105685231298630009" target="_blank" rel="noreferrer">Min Choi 原串帖 ↗</a> · <a href="https://threadreaderapp.com/thread/2105685231298630009.html" target="_blank" rel="noreferrer">串帖镜像 ↗</a></p><p><a href="https://github.com/yydshly/0930_codex_project/tree/main/projects/015-ai-creative-products" target="_blank" rel="noreferrer">源码与完整研究档案 ↗</a> · <a href="research.html#architecture">共同接口与逐项机制</a> · <a href="research.html#scope">可扩展产品</a> · <a href="research.html#value">对你的价值</a></p></div><div><h3>实际产物与补充实验</h3><p><a href="labs/?id=6">角色钢琴与配乐 WebM</a> · <a href="media/field-duet-v15.webm">观看已输出音乐片</a> · <a href="labs/pipeline/music_blender.py" download>Python / Blender 配方</a></p><p><a href="demo/">额外 ARC 桌灯选型 ↗</a>：保留为单产品配置与交付实验，不计入十项。原作媒体点击后联网加载；核心演示资源随站提供。</p></div></aside>
<!-- PUBLICATION_OVERVIEW:END -->'''
index = WEB / 'index.html'
text = index.read_text(encoding='utf-8')
if '<!-- PUBLICATION_OVERVIEW:START -->' in text:
    text = re.sub(r'<!-- PUBLICATION_OVERVIEW:START -->.*?<!-- PUBLICATION_OVERVIEW:END -->', portal, text, flags=re.S)
else:
    text = text.replace('    <section id="view-effects"', portal + '\n\n    <section id="view-effects"', 1)
text = text.replace('  <link rel="stylesheet" href="demo-gallery.css">', '  <link rel="stylesheet" href="demo-gallery.css">\n  <link rel="stylesheet" href="publication.css">') if 'href="publication.css"' not in text else text
text = text.replace('<title>十个案例，下一件产品 · Creative Products</title>', '<title>十项创意效果库 · 全部演示、完整理解与产品方向</title>')
text = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="参考十个 Opus 创作案例的原创效果库：十项真实效果与独立演示、原作对照、逐项原理和导出范围、扩展产品与个人价值，附完整能力总览图、来源和源码。">', text, count=1)
index.write_text(text, encoding='utf-8', newline='\n')
print('Connected the unchanged guide and ten actual effects to the public entry.')
