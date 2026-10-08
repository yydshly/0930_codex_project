"""Build the complete, dependency-free public research pages from our notes."""
from pathlib import Path
from html import escape
import re

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
REPO = 'https://github.com/yydshly/0930_codex_project/tree/main/projects/013-insightface-retrieval'
PUBLIC = 'https://yydshly.github.io/0930_codex_project/projects/013-insightface-retrieval/'
SUMMARY = '从 AVScan 的截图反查需求出发，区分找同一个人、找原始画面与语义相关检索；理解 InsightFace、ArcFace、特征向量、目标库与来源映射，判断实际价值、个人可行性和效果边界。'
NAV = [('index.html', '总览与入口'), ('understanding.html', '完整理解'), ('map.html', '全景图'), ('mechanisms.html', '原理示意'), ('sources.html', '来源与记录')]
LINKS = {
    'assets/understanding-map.png': 'assets/understanding-map.png',
    'assets/understanding-map.svg': 'assets/understanding-map.svg',
    'web/index.html': 'index.html',
    'web/map.html': 'map.html',
    'web/mechanisms.html': 'mechanisms.html',
    'web/sources.html': 'sources.html',
    'web/understanding.html': 'understanding.html',
    '../web/index.html': 'index.html',
    '../web/understanding.html': 'understanding.html',
    '../web/map.html': 'map.html',
    '../web/mechanisms.html': 'mechanisms.html',
    '../web/sources.html': 'sources.html',
    'notes/sources.md': 'sources.html#sources',
    'notes/production.md': 'sources.html#production',
    'notes/research.md': 'sources.html#discussion',
    'notes/publication.md': 'sources.html#publication',
    'publication.md': 'sources.html#publication',
    'publication-manifest.json': 'publication-manifest.json',
    'deployment-checks.json': REPO.replace('/tree/','/blob/')+'/notes/deployment-checks.json',
    'publication-browser-online.json': REPO.replace('/tree/','/blob/')+'/notes/publication-browser-online.json',
    'deployment-summary.json': REPO.replace('/tree/','/blob/')+'/notes/deployment-summary.json',
    'sources.md': 'sources.html#sources',
    'production.md': 'sources.html#production',
    '../README.md': 'understanding.html',
    '../assets/understanding-map.png': 'assets/understanding-map.png',
    '../../README.md#项目索引': '../../',
}

def inline(value):
    # The inputs are our small Markdown notes; no arbitrary HTML is executed.
    tokens = []
    def keep(html):
        tokens.append(html)
        return f'\x00{len(tokens)-1}\x00'
    value = re.sub(r'`([^`]+)`', lambda m: keep('<code>'+escape(m[1])+'</code>'), value)
    def anchor(match):
        label, target = match.group(1), match.group(2)
        target = LINKS.get(target, target)
        if target.startswith('http') or target.startswith('#') or target in LINKS.values() or target == '../../':
            return keep('<a href="'+escape(target, quote=True)+'">'+escape(label)+'</a>')
        return keep('<a href="'+REPO+'/'+escape(target, quote=True)+'">'+escape(label)+'</a>')
    value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', anchor, value)
    value = escape(value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)
    return re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m[1])], value)

def render_markdown(path, prefix):
    raw = path.read_text(encoding='utf-8').splitlines()
    result, toc, i = [], [], 0
    while i < len(raw):
        line = raw[i].strip()
        if not line or line == '---':
            i += 1; continue
        if line.startswith('```'):
            code = []; i += 1
            while i < len(raw) and not raw[i].startswith('```'):
                code.append(raw[i]); i += 1
            result.append('<pre><code>'+escape('\n'.join(code))+'</code></pre>'); i += 1; continue
        match = re.match(r'^(#{1,3})\s+(.+)', line)
        if match:
            level = max(2, len(match[1])); title = match[2]
            heading_id = f'{prefix}-{len(toc)+1}'
            toc.append((heading_id, title))
            result.append(f'<h{level} id="{heading_id}">{inline(title)}</h{level}>'); i += 1; continue
        if line.startswith('|'):
            table = []
            while i < len(raw) and raw[i].strip().startswith('|'):
                cells = [x.strip() for x in raw[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in cells): table.append(cells)
                i += 1
            head, *rows = table
            result.append('<div class="table-scroll"><table><thead><tr>'+''.join('<th scope="col">'+inline(c)+'</th>' for c in head)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table></div>'); continue
        if re.match(r'^(?:\d+\. |[-*] )', line):
            ordered = bool(re.match(r'^\d+\.', line)); tag = 'ol' if ordered else 'ul'; items = []
            while i < len(raw) and re.match(r'^(?:\d+\. |[-*] )', raw[i].strip()):
                items.append(re.sub(r'^(?:\d+\. |[-*] )', '', raw[i].strip())); i += 1
            result.append('<'+tag+'>'+''.join('<li>'+inline(x)+'</li>' for x in items)+'</'+tag+'>'); continue
        if line.startswith('!['):
            result.append('<p><a class="button secondary" href="map.html">放大全景图 · 下载原有 PNG / SVG</a></p>'); i += 1; continue
        if line.startswith('>'):
            result.append('<blockquote>'+inline(line.lstrip('> '))+'</blockquote>'); i += 1; continue
        result.append('<p>'+inline(line)+'</p>'); i += 1
    return '\n'.join(result), toc

def page(filename, title, body, description=SUMMARY):
    links = ''.join(f'<a href="{url}"'+(' aria-current="page"' if url == filename else '')+'>'+label+'</a>' for url,label in NAV)
    html = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{escape(title)} · InsightFace 检索理解</title><meta name="description" content="{escape(description,quote=True)}"><link rel="canonical" href="{PUBLIC+filename}"><meta property="og:title" content="{escape(title,quote=True)}"><meta property="og:description" content="{escape(description,quote=True)}"><meta property="og:image" content="{PUBLIC}assets/understanding-map.png"><link rel="stylesheet" href="styles.css"><script src="app.js" defer></script></head>
<body><a class="skip" href="#main">跳到正文</a><header class="site-header"><a class="brand" href="index.html"><span class="brand-id">013</span><span>InsightFace<span class="brand-sub">人脸与视频截图检索理解</span></span></a><nav aria-label="研究导航">{links}</nav></header>
<main id="main">{body}</main><footer class="site-footer"><div><strong>理解模型，也理解检索问题。</strong><p>研究快照 2026-10-02 · 网页整理 2026-10-08<br>原有总览图保持不变；数值与流程为教学示意，未运行真实识别。</p></div><div class="footer-links"><a href="../../">返回研究集首页</a><a href="{REPO}">完整研究源码</a><a href="sources.html">来源、授权与验证范围</a></div></footer></body></html>'''
    (WEB/filename).write_text(html+'\n', encoding='utf-8', newline='\n')

def cards(items):
    return '<div class="cards">'+''.join(f'<article class="card"><span class="eyebrow">{escape(k)}</span><h3>{escape(t)}</h3><p>{escape(p)}</p><a class="text-link" href="{escape(href,quote=True)}">{escape(label)} →</a></article>' for k,t,p,href,label in items)+'</div>'

WEB.mkdir(exist_ok=True)
hero = '''<section class="hero"><div class="hero-copy"><p class="eyebrow">从 AVScan 到 InsightFace · VISUAL RETRIEVAL</p><h1>从一张图片，<br>到正确的检索问题。</h1><p class="lead">找同一个人、找截图出处、找相似内容，分别需要什么能力？把模型、算法、特征库和实际价值连成一套完整理解。</p><div class="actions"><a class="button" href="understanding.html">阅读完整理解</a><a class="button secondary" href="map.html">放大全景图</a><a class="button secondary" href="mechanisms.html">看原理示意</a></div><div class="source-pills"><a href="https://avscan.cc/">AVScan · 需求参考 ↗</a><a href="https://github.com/deepinsight/insightface">InsightFace · 源库 ↗</a><a href="sources.html">14 组来源与研究记录 →</a></div><p class="small">模型提特征 → 目标库建索引 → 搜索返回候选 → 元数据回答来源。</p></div><figure class="hero-map"><a href="map.html" aria-label="放大原有全景理解图"><img src="assets/understanding-map.png" width="2400" height="3620" alt="原有全景理解图预览：三种任务、共同检索流程、InsightFace、特征学习和实际价值。"></a><figcaption><span class="badge">已有研究产物</span><strong>一张图，连接全部理解</strong><p>沿用 2026-10-02 原图 · 2400 × 3620</p><a href="map.html">完整查看 / 放大 / 下载 →</a></figcaption></figure></section>'''
entries = cards([
    ('01 / 完整归档','完整理解与讨论结论','保留全部研究说明：任务、原理、源库能力、技术成熟度、个人可行性和实际价值。','understanding.html','阅读全部内容'),
    ('02 / 原有产物','全景图与原图下载','原有 PNG 与可编辑 SVG；支持缩放、原尺寸阅读和图内滚动。','map.html','打开全景图'),
    ('03 / 教学示意','看看候选怎样被找出来','切换三种任务；用人工设定的向量观察排序、阈值与库外目标的拒绝匹配。','mechanisms.html','操作原理示意'),
    ('04 / 一手来源','参考方案与研究记录','14 组官方资料、论文与源库；同时保留讨论脉络、制作记录和事实边界。','sources.html','查看来源与记录')])
tasks = cards([
    ('身份检索','这个人出现在哪些照片？','保留稳定身份特征，比较参考照与图库中的脸；姓名需要另有登记映射。','mechanisms.html#tasks','看找人路线'),
    ('同源匹配','这张截图出自哪个视频？','保留具体画面的姿态、纹理、构图和局部细节；返回已收录视频与时间位置。','mechanisms.html#tasks','看找出处路线'),
    ('语义检索','有哪些内容相似的素材？','关注场景、物体、动作是否相关；找到相关片段，不保证原始截图出处。','mechanisms.html#tasks','看内容检索路线')])
capabilities = cards([
    ('检测与对齐','先找到可比较的人脸','SCRFD / RetinaFace 输出脸框与关键点；几何对齐减少位置与拍摄变化。检测到脸不等于识别身份。','understanding.html#research-6','查看源库能力'),
    ('网络与训练','从像素学到身份向量','ResNet 等识别网络生成特征；ArcFace 是角度间隔训练方法，权重记录训练学到的参数。','mechanisms.html#learning','查看特征学习'),
    ('运行与索引','模型和目标库分别负责什么','ONNX Runtime 执行模型；索引匹配向量；路径、登记信息和视频时间映射回答来源。','mechanisms.html#pipeline','查看建库与查询')])
value = cards([
    ('图库 / 相册','减少人工翻找','按参考照找人物照片，协助活动照片筛选与素材归组；多个不确定候选仍需要复核。','understanding.html#research-8','看实际价值与验收'),
    ('视频 / 素材','缩小出处查找范围','截图匹配可定位已收录视频，身份检索可提供人物出现线索；人物身份不能独立确定镜头出处。','understanding.html#research-4','看任务差异'),
    ('个人 / 原型','复用现成模型，小范围验证','建库通常不需要重新训练每个人。先用小图库验证误认、漏认与拒识，再考虑大规模索引。','understanding.html#research-10','看个人可行性')])
references = cards([
    ('产品起点','AVScan','截图反查作品与时间的低门槛入口。ViT、速度与精度属于网站宣称；后台及收入未验证。','https://avscan.cc/','打开原站'),
    ('身份特征','InsightFace','人脸检测、对齐、识别、训练和评测。代码与模型授权分别核对；不自带人物姓名或视频出处库。','https://github.com/deepinsight/insightface','打开源库'),
    ('同源图像','SSCD','参考图片副本与修改版本的特征路线。与人脸身份检索分工不同，视频时间映射需要另接。','https://github.com/facebookresearch/sscd-copy-detection','查看副本匹配'),
    ('向量索引','Faiss','大量向量的精确或近似相似度检索。负责搜索，不负责从图片提取人脸特征。','https://github.com/facebookresearch/faiss','查看索引技术'),
    ('截图查出处','trace.moe','动画截图查作品、集数和时间的现成系统。搜索受收录范围限制，效果不能直接外推到真人视频。','https://trace.moe/','打开动画查询'),
    ('视频内容检索','TwelveLabs','图片或文字查询指定视频索引并返回相关片段。语义相关不等于精确同源画面匹配。','https://docs.twelvelabs.io/api-reference/any-to-video-search/make-search-request','查看官方接口')])
body = hero + '<section id="entries"><div class="section-heading"><p class="eyebrow">全部入口</p><h2>理解、展示、来源，都在这里。</h2></div>'+entries+'</section>'
body += '<section id="tasks"><div class="section-heading"><p class="eyebrow">先明确目标</p><h2>同样是一张图片，问题有三种。</h2></div>'+tasks+'</section>'
body += '<section class="dark-panel"><p class="eyebrow">我们形成的核心理解</p><h2>模型决定能区分什么，<br>目标库决定能搜到什么。</h2><p>算法规定训练目标，网络与权重生成特征，特征数据库保存目标，索引提高检索效率。训练模型和日常建库是两件事；最像的候选还需要阈值、拒识与来源映射。</p><div class="boundary-grid"><span>识人 ≠ 找原画面</span><span>相似 ≠ 同一人</span><span>向量 ≠ 姓名</span><span>库外目标可无匹配</span></div><a class="button light" href="mechanisms.html">把流程连起来 →</a></section>'
body += '<section id="capabilities"><div class="section-heading"><p class="eyebrow">源库能力与底层</p><h2>InsightFace 能提供哪几块能力？</h2></div>'+capabilities+'</section>'
body += '<section id="value"><div class="section-heading"><p class="eyebrow">实际识别的价值</p><h2>把人工寻找变成可复核的候选。</h2><p>技术已有可用实现；自己的图库是否可靠，要分别测误认、漏认、排名、库外目标和运行成本。公开 LFW 成绩不能直接当作自己的 1:N 检索准确率。</p></div>'+value+'</section>'
body += '<section id="references"><div class="section-heading"><p class="eyebrow">相关产品与开源方案</p><h2>每种参考，各有分工。</h2><p>这些是可参考的技术与产品；未确认 AVScan 使用其中任何具体组合。</p></div>'+references+'<p><a class="text-link" href="sources.html#sources">全部 14 组来源、论文、代码与事实边界 →</a></p></section>'
body += '<section class="note-panel" id="scope"><h2>这次研究完成了什么？</h2><p>完成理解汇总、全景图、五个完整阅读与教学页面，以及相关资料入口。没有运行真实人脸识别、建立人物图库、上传 AVScan 样本或验证其速度与收益。源库事实、网站宣称、通用架构推断和教学示意分别标注。</p><p>代码 MIT 与官方预训练模型的非商业研究条件分开；本文是 2026-10-02 的研究快照，后续采用时应重新核对所选权重与版本。</p><a href="sources.html">查看来源与验证范围 →</a></section>'
page('index.html','图片如何找到人，截图如何找到视频',body)

article, toc = render_markdown(ROOT/'README.md','research')
toc_html = ''.join('<a href="#'+ident+'">'+escape(title)+'</a>' for ident,title in toc)
page('understanding.html','我们的完整理解', '<section class="page-title"><p class="eyebrow">完整研究说明 / FULL NOTES</p><h1>把所有理解，完整保留下来。</h1><p class="lead">从最初的产品问题，到特征学习、源库能力、实际用途与采用判断。研究依据保持为 2026-10-02 快照。</p><div class="actions"><a class="button secondary" href="map.html">配合全景图阅读</a><a class="button secondary" href="mechanisms.html">原理示意</a></div></section><div class="reading-layout"><aside class="toc"><strong>阅读目录</strong>'+toc_html+'</aside><article class="prose">'+article+'</article></div>')

map_body = '''<section class="page-title"><p class="eyebrow">原有全景理解图 / ORIGINAL MAP</p><h1>一张图，串起全部理解。</h1><p class="lead">沿用 2026-10-02 生成的 2400 × 3620 全景图。任务、流程、底层、能力、价值与边界都在同一张图中。</p><div class="actions"><button id="fit" type="button" class="button" aria-pressed="true">适应宽度</button><button id="actual" type="button" class="button secondary" aria-pressed="false">原尺寸阅读</button><label class="zoom-control">缩放 <input id="zoom" type="range" min="25" max="200" step="5" value="100"><output id="zoom-value" for="zoom">适应宽度</output></label></div><div class="actions"><a class="button secondary" href="assets/understanding-map.png" download="insightface-understanding-map.png">下载原有 PNG</a><a class="button secondary" href="assets/understanding-map.svg" download="insightface-understanding-map.svg">下载可编辑 SVG</a><a href="assets/understanding-map.png">在新页面查看 PNG</a><a href="understanding.html">配套完整说明 →</a></div></section><div id="pane" class="map-pane" tabindex="0" aria-label="可横向与纵向滚动的全景图"><img id="overview" src="assets/understanding-map.svg" width="2400" height="3620" alt="图片如何找到人、截图如何找到视频的完整理解图，覆盖三种检索任务、离线建库与在线查询、InsightFace 与 ArcFace、模型和特征库、参考项目、实际价值及验收边界。"></div><p class="small">手机上可先看整体，再选择原尺寸阅读并在图内滚动。A/B/C 特征空间是教学示意，非真实模型输出。PNG 与 SVG 原文件保持不变。</p>'''
page('map.html','放大全景理解图',map_body)

mechanisms = '''<section class="page-title"><p class="eyebrow">可操作的教学示意 / EXPLAIN THE MECHANISM</p><h1>特征怎样产生，候选怎样找到？</h1><p class="lead">切换任务看路线，再用人工设定的向量观察相似度、阈值与图库覆盖。这里演示检索逻辑，没有运行真实识别。</p></section>
<section id="tasks"><div class="section-heading"><h2>先选问题，再选特征。</h2></div><div class="task-tabs" role="group" aria-label="选择检索任务"><button type="button" class="task-button" data-task="identity" aria-pressed="true">找同一个人</button><button type="button" class="task-button" data-task="frame" aria-pressed="false">找截图出处</button><button type="button" class="task-button" data-task="semantic" aria-pressed="false">找相似内容</button></div><div class="task-result" aria-live="polite"><div><span class="eyebrow">目标</span><h3 id="task-target">找参考人物的其他照片</h3></div><div><span class="eyebrow">特征</span><p id="task-feature">尽量保留稳定身份，减少表情、光线与背景影响。</p></div><div><span class="eyebrow">输出</span><p id="task-output">疑似同人的图片与人物出现线索；姓名需登记映射。</p></div></div><p class="note-panel" id="task-warning">人脸身份相同，不能独立确定是哪一部作品或哪一个镜头。</p></section>
<section id="pipeline"><div class="section-heading"><p class="eyebrow">建库不是重新训练每个人</p><h2>离线建库，在线查询。</h2></div><div class="flow-row"><span>图库 / 视频库</span><b aria-hidden="true">→</b><span>检测脸 / 抽帧</span><b aria-hidden="true">→</b><span>模型提取向量</span><b aria-hidden="true">→</b><span>建立目标索引</span><b aria-hidden="true">→</b><span>保存来源映射</span></div><div class="flow-row green"><span>参考图 / 截图</span><b aria-hidden="true">→</b><span>兼容预处理</span><b aria-hidden="true">→</b><span>调用相同模型</span><b aria-hidden="true">→</b><span>排序与阈值</span><b aria-hidden="true">→</b><span>候选或无匹配</span></div><p>图库里的向量与参考图的向量需要处于兼容空间；不同模型的输出不能直接混用。图片路径、脸框、视频 ID、时间戳和模型版本需要业务系统记录。</p></section>
<section id="learning"><div class="section-heading"><p class="eyebrow">从像素到身份特征</p><h2>网络从训练反馈中学习区别。</h2></div><div class="two-col"><article class="note-panel"><h3>训练阶段</h3><p>像素经过卷积、非线性与残差层，形成向量；身份标签用于计算损失，反向传播更新参数。ArcFace 在归一化特征和类别方向的角度中加入间隔，促使不同身份更容易分开。</p><p>某一维不固定代表鼻子高度或眼睛宽度；特征不是人工逐项写好的五官清单。团簇是训练目标示意，不保证完全不重叠。</p></article><article class="note-panel"><h3>使用阶段</h3><p>加载训练好的结构和权重，处理新图片，得到特征。检测、关键点对齐、识别网络、ONNX Runtime 与相似度比较组成常见调用路线。</p><p>公开 IResNet 示例默认 512 维，输入示例为 112 × 112；这不是所有模型的固定规定。建目标库通常直接调用现成模型，不必为每个人重新训练。</p></article></div></section>
<section id="vectors"><div class="section-heading"><p class="eyebrow">数值教学 / SYNTHETIC VECTORS</p><h2>“最像”为什么还不够？</h2><p>人工设置的三维向量仅用于解释余弦排序。假定人物标签用于教学，不能据此理解真实识别准确率或选择实际阈值。</p></div><div class="vector-controls"><div><span class="eyebrow">参考向量 q</span><code>[1.00, 0.00, 0.00]</code></div><label>教学阈值 <output id="threshold-value" for="threshold">0.90</output><input id="threshold" type="range" min="0.50" max="1.00" step="0.01" value="0.90"></label><label class="checkbox-label"><input id="remove-target" type="checkbox">从目标库移除 A 的两个样本</label></div><p class="formula"><code>cos(q, x) = (q · x) / (||q|| ||x||)</code></p><div class="table-scroll"><table><thead><tr><th>排序</th><th>教学样本 / 假定身份</th><th>人工向量 x</th><th>余弦分数</th><th>当前结果</th></tr></thead><tbody id="vector-results"><tr><td colspan="5">启用 JavaScript 可操作排序示意；原理说明无需脚本即可阅读。</td></tr></tbody></table></div><div id="vector-status" class="note-panel" aria-live="polite"></div><p>移除 A 后，其他样本仍会排在前面；这时阈值可以让系统返回“没有可靠匹配”。降低阈值会接纳更多候选，也可能引入其他人。分数是相似度，不是同一个人的概率。</p></section>
<section id="evaluation"><div class="section-heading"><h2>真正验收时，分别回答这些问题。</h2></div><ul class="checklist"><li>同人照片漏掉多少？其他人混入多少？</li><li>正确结果是否排在前几名？目标不在库时能否拒识？</li><li>失败发生在人脸检测、预处理、特征匹配，还是来源映射？</li><li>图库规模、低清、侧脸、遮挡和运行成本怎样影响结果？</li><li>截图匹配是否受抽帧间隔、重复片段与编辑版本影响？</li></ul><div class="actions"><a class="button" href="understanding.html">回到完整理解</a><a class="button secondary" href="sources.html">查看模型、论文与评测来源</a></div></section>'''
page('mechanisms.html','特征学习与检索原理示意',mechanisms)

sources, _ = render_markdown(ROOT/'notes/sources.md','source')
discussion, _ = render_markdown(ROOT/'notes/research.md','discussion')
production, _ = render_markdown(ROOT/'notes/production.md','production')
publication, _ = render_markdown(ROOT/'notes/publication.md','publication')
source_body = '<section class="page-title"><p class="eyebrow">来源、记录与事实边界 / SOURCES</p><h1>每个结论，都能找到依据。</h1><p class="lead">保留全部 14 组一手来源、讨论脉络和原图制作记录。源库事实、AVScan 宣称、产品推断和教学示意分别说明。</p><div class="actions"><a class="button secondary" href="#sources">14 组来源</a><a class="button secondary" href="#discussion">讨论脉络</a><a class="button secondary" href="#production">制作与验证</a><a class="button secondary" href="'+REPO+'">完整研究源码</a></div></section><article class="prose source-prose"><section id="sources">'+sources+'</section><section id="discussion">'+discussion+'</section><section id="production">'+production+'</section></article>'
source_body += '<article class="prose source-prose" id="publication">'+publication+'</article>'
page('sources.html','参考方案、来源与研究记录',source_body)
print('Built 5 complete public pages from research notes and original overview map.')
