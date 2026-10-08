"""Build an exact-text, self-contained research atlas for native browser export.

Source rasters are embedded unchanged; all arrangement is HTML/CSS.
"""
from pathlib import Path
import base64
import hashlib
import html
import json
import mimetypes

PROJECT = Path(__file__).resolve().parents[2]
WEB = PROJECT / 'web'
OUT = Path(__file__).resolve().parent
catalog = json.loads((OUT / 'catalog-20261006.json').read_text(encoding='utf-8'))
image_sources = []
material_tokens = ''.join(f'<span>{html.escape(s["name"])}</span>' for s in catalog['materialStudies'])
early_worlds = ''.join(f'<p><b>{html.escape(s["title"])}</b><span>{html.escape(s["art"])}</span></p>' for s in catalog['earlyWorlds'])

def esc(value):
    return html.escape(str(value), quote=True)

def img(relative, label, kind, cls=''):
    path = PROJECT / relative
    data = path.read_bytes()
    # Preserve the actual encoded format even when old screenshot suffixes differ.
    mime = 'image/jpeg' if data.startswith(b'\xff\xd8') else mimetypes.guess_type(path.name)[0]
    image_sources.append({'path': relative, 'label': label, 'kind': kind,
                          'sha256': hashlib.sha256(data).hexdigest()})
    uri = f'data:{mime};base64,' + base64.b64encode(data).decode('ascii')
    return f'<img class="{cls}" src="{uri}" alt="{esc(label)}" data-source-kind="{kind}">'

def heading(number, english, title, aside=''):
    return f'<div class="section-head"><div><span class="section-id">{number} / {english}</span><h2>{title}</h2></div><p>{aside}</p></div>'

legacy_copy = {
    'detective': '黑白悬疑 · 证据、证词与归还判断',
    'wuxia': '国风江湖 · 行旅救援与补给取舍',
    'ecology': '自然微缩 · 水文、植被与季节演替',
    'wasteland': '厚重废土 · 设备维修、资源与生存',
    'dream': '梦境幻想 · 记忆物件改变空间与归途',
    'arcade': '都市街机 · 跑跳、冲刺与计时路线',
    'inn': '暖色生活 · 布置、接待与回访记忆',
    'islands': '低多边形幻想 · 工具、通路与遗迹',
    'movers': '手绘生活 · 人物委托、搬运与交付',
}
legacy_cards = []
for d in catalog['legacy']:
    image = img('web/' + d['cover'], d['title'], '项目封面与预览')
    legacy_cards.append(f'<article class="legacy-card">{image}<div><h3>{esc(d["title"])}</h3><p>{esc(legacy_copy[d["game"]])}</p></div></article>')

families = [('动作', '#7d4f38'), ('空间', '#456579'), ('策略', '#5b7051'),
            ('故事', '#746080'), ('生活', '#8b7339'), ('解谜', '#596c77'),
            ('感知', '#8d6769'), ('模拟', '#496e6e')]
form_cards = []
for name, accent in families:
    forms = catalog['groups'][name]
    tokens = ''.join(f'<span data-form="{esc(f["id"])}">{esc(f["name"])}</span>' for f in forms)
    form_cards.append(f'<article class="form-card {"major" if len(forms)>4 else "minor"}" style="--accent:{accent}"><h3>{name}<b>{len(forms)}</b></h3><div class="form-names">{tokens}</div></article>')

directions = [
 ('铜谷防线', '产线、设施与弹药，让生产支撑防守。', '二维俯视', 'Mindustry'),
 ('风湾乐园', '布置设施、连路，观察游客选择与评价。', '二维等距', 'OpenRCT2 / IsoCoaster'),
 ('雾岭同行', '本地同屏、接应救援，编辑与分享关卡文件。', '二维横版', 'DDNet'),
 ('夜航值守', '单人切换工程、医护与调度，安排并行救援。', '二维俯视', 'Space Station 14'),
 ('湾岸货运', '连路建桥、组织车队，把加工与补给接起来。', '二维俯视', 'OpenTTD'),
 ('深岩堡垒', '挖掘、建房、防守，再附身进入同一地下城。', '2D 管理＋2.5D 附身', 'KeeperFX'),
 ('月影档案', '利用光照、声音与巡逻，找到取档与脱身路线。', '二维俯视', 'The Dark Mod'),
 ('星潮航路', '实际驾驶飞船，选择运输、贸易或扫描任务。', '真实 3D', 'Endless Sky'),
 ('雨后余生', '寻找补给，应对身体需求、天气与营地取舍。', '二维俯视', 'Cataclysm: DDA'),
 ('岚谷试车场', '驾驶工程车，比较四轮悬架、载重与地形。', '真实 3D', 'Rigs of Rods'),
 ('雾海牌航', '牌库循环、敌方意图、连续遭遇与航路选择。', 'HTML / CSS 卡牌', 'Slay the Spire'),
 ('芦湾观鸟', '移动取景、调焦、等待动物，保存实际成片。', '二维取景', 'Alba: A Wildlife Adventure'),
 ('夜港来信', '查找线索，选择支持证据，检验事实与结局。', 'HTML 场景热点', 'The Case of the Golden Idol'),
 ('溪丘拼境', '旋转、预览与放置地景，按真实邻接连接群落。', '二维六边地块', 'Dorfromantik'),
 ('灯市译语', '观察十二语境，验证六个词义，用理解交流。', '二维情境＋词典', 'Heaven’s Vault'),
]
direction_cards = []
for i, (name, action, renderer, reference) in enumerate(directions, 1):
    direction_cards.append(f'<article class="direction-card {"is-3d" if renderer=="真实 3D" else ""}"><div class="direction-top"><span>{i:02}</span><b>{renderer}</b></div><h3>{name}</h3><p>{action}</p><small>类型参照：{reference}</small></article>')

shot_specs = [
 ('notes/direction-vehicle-captures/02-fullscreen-loaded.jpg', '岚谷试车场', '真实三维 · 载重与悬挂'),
 ('notes/direction-deck-captures/dual-fullscreen.png', '雾海牌航', 'HTML/CSS · 卡牌与航路'),
 ('notes/direction-landscape-captures/fullscreen-complete.png', '溪丘拼境', '二维拼景 · 地块邻接'),
 ('notes/direction-language-captures/market-demo.jpg', '灯市译语', '二维情境 · 词义验证'),
]
shot_cards = []
for path, title, caption in shot_specs:
    shot_cards.append(f'<figure>{img(path,title,"本站浏览器截图")}<figcaption><b>{title}</b><span>{caption}</span><small>本站浏览器截图</small></figcaption></figure>')

capabilities = [
 ('二维实时呈现', 'Canvas2D · 图集裁切 · 动作帧 · 分层场景 · 原生 HTML/CSS'),
 ('三维与空间', 'Three.js / WebGL · glTF · 动作与相机 · 材质灯光 · 2.5D 射线投影'),
 ('真实规则反馈', '碰撞 · 寻路 · 视线与声音 · 物料运输 · 刚体与弹簧 · 时间状态'),
 ('声音与输入', 'Web Audio · 歌曲时钟同步 · 键盘与触屏 · 麦克风音高'),
 ('保存与作品', '独立存档 · 照片保存与下载 · 音乐导出 · 关卡文件 · 历史版本'),
 ('参与与协作', '本地同屏 · 角色切换 · 录制分身 · 部分真人房间 · 本机异步接力'),
]
capability_cards = ''.join(f'<article><span>0{i}</span><h3>{name}</h3><p>{text}</p></article>' for i,(name,text) in enumerate(capabilities,1))

findings = [
 ('玩家的情绪，是体验目标。', '真实玩家愿意进入、行动和继续玩，需要由世界的回应兑现。'),
 ('画风、规则与参与方式分别比较。', '像素或写实、平台或射击、第一人称或合作，可以交叉组合。'),
 ('相似感来自反复使用的制作路线。', '精绘背景、人物贴图、侧栏按钮与相近镜头，会让不同规则仍看起来相似。'),
 ('动态表现需要自己的素材与运行体系。', '连续动作、空间、碰撞、材质灯光、镜头和声音共同塑造品质。'),
]
finding_cards = ''.join(f'<article><span>0{i}</span><div><h3>{title}</h3><p>{body}</p></div></article>' for i,(title,body) in enumerate(findings,1))

future = [
 ('第一人称小型三维空间交互', '实际走入、靠近与搬动物件', True),
 ('连续横版动作', '完整跑跳、滚屏与动作过渡', True),
 ('第三人称三维角色动作', '人物、镜头与空间连续配合', False),
 ('可改造的体素与物理世界', '挖掘、建造与改造后果', False),
 ('抽象图形与音乐驱动的运动', '图形、拍点、声音共同构成场面', False),
 ('实时群体系统', '少量指令影响自主主体', False),
 ('信息不对称真人合作', '不同信息经真实沟通汇合', False),
 ('消息、通话与桌面叙事', '界面状态与时间推进事件', False),
 ('电影式互动短片', '演员动作、剪辑与视频分支', False),
 ('知识驱动的时间循环探索', '理解规律，改变下一次探索', False),
 ('玩家协商与共同治理', '真人利益、承诺与共同决定', False),
 ('教导同伴的自主行为', '示范、修正与持续自主执行', False),
]
future_cards = ''.join(f'<article class="future-card {"priority" if priority else ""}"><span>{i:02}</span><div><h3>{title}</h3><p>{description}</p></div><b>{"优先候选" if priority else "已记录"}<small>未启动</small></b></article>' for i,(title,description,priority) in enumerate(future,1))

css = '''
*{box-sizing:border-box}html,body{margin:0;background:#f4efe5;color:#26352e;font-family:"Microsoft YaHei","Segoe UI",sans-serif}body{width:2400px}main{width:2400px;padding:84px 108px 62px}h1,h2,h3,p,figure{margin:0}p{line-height:1.7}header{display:flex;justify-content:space-between;align-items:flex-start;gap:50px}.masthead{font-size:22px;letter-spacing:5px;color:#64775f;margin-bottom:20px}h1{font-size:104px;letter-spacing:-3px;line-height:1.18;font-weight:700}.subtitle{font-size:36px;line-height:1.55;color:#697166;margin-top:20px}.stamp{background:#e7ecdf;border:1px solid #becab3;border-radius:50px;padding:20px 30px;font-size:24px;white-space:nowrap;margin-top:14px}.purpose{font-size:31px;line-height:1.7;margin-top:33px;border-left:6px solid #b17655;padding-left:25px}.purpose b{font-weight:600}.metrics{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:20px;margin-top:35px}.metric{padding:28px 34px;border:1px solid #cdd0c1;border-radius:12px;background:#fbf9f2}.metric.primary{background:#304a3e;border-color:#304a3e;color:#f9f6e9}.metric b{display:block;font-size:63px;line-height:1.1;font-weight:600}.metric span{display:block;font-size:25px;margin-top:12px}.metric small{font-size:20px;line-height:1.55;display:block;opacity:.78;margin-top:10px}.path{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:27px;padding:22px 0;font-size:25px;border-bottom:1px solid #ced1c2;color:#596a52}.path i{font-style:normal;color:#a9b09a}.path em{font-size:21px;font-style:normal;background:#e6eadd;padding:10px 16px;border-radius:4px}.section{padding-top:40px;margin-top:12px}.section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-bottom:24px}.section-id{font-size:20px;letter-spacing:2px;color:#6c7a60;display:block;margin-bottom:10px}h2{font-size:46px;line-height:1.4;letter-spacing:-.5px}.section-head>p{font-size:22px;line-height:1.8;color:#71796c;text-align:right;max-width:900px}.original{display:grid;grid-template-columns:850px 1fr;gap:35px;border:1px solid #c9ccbb;border-radius:12px;overflow:hidden;background:#e9ecdf}.original figure{position:relative}.original img{display:block;width:850px;height:470px;object-fit:cover;image-rendering:pixelated}.original figcaption{position:absolute;left:20px;bottom:20px;padding:10px 18px;background:#fffdf4e6;font-size:20px;border-radius:5px}.original-copy{padding:30px 36px 25px 0}.original-copy h3{font-size:38px;margin-bottom:15px}.original-copy>p{font-size:27px;color:#5f6d59;max-width:1130px}.original-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:25px 0 19px}.original-stats div{border-top:1px solid #bac5af;padding-top:17px}.original-stats b{display:block;font-size:43px}.original-stats span{font-size:22px;line-height:1.7;color:#5f6d59}.note{font-size:21px;line-height:1.8;color:#737a6c}.original-copy .note{font-size:20px}.legacy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:23px}.legacy-card{border:1px solid #d0d0c3;border-radius:9px;overflow:hidden;background:#fcfaf2}.legacy-card img{display:block;width:100%;height:230px;object-fit:cover}.legacy-card>div{padding:19px 24px 20px}.legacy-card h3{font-size:32px;margin-bottom:8px}.legacy-card p{font-size:23px;color:#6e7468}.under-note{margin-top:17px;display:flex;justify-content:space-between;gap:30px;font-size:21px;line-height:1.7;color:#73796c}.form-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.form-card{padding:24px 28px 25px;background:#faf8ef;border:1px solid #ced0c3;border-radius:8px}.form-card.major{grid-column:span 2}.form-card h3{display:flex;justify-content:space-between;align-items:center;font-size:32px;line-height:1.6;color:var(--accent);margin-bottom:15px;padding-bottom:12px;border-bottom:1px solid #d8dbcd}.form-card h3 b{font-size:40px;line-height:1;font-weight:600}.form-names{display:flex;flex-wrap:wrap;column-gap:15px;row-gap:9px}.form-names span{font-size:22px;line-height:1.75;background:#eaece2;padding:3px 11px;border-radius:4px}.form-card.minor .form-names span{font-size:23px}.compare-axis{display:flex;justify-content:space-between;gap:35px;margin-top:20px;padding:24px 30px;background:#e8ecdf;border-radius:7px;font-size:26px}.compare-axis b{font-weight:600;color:#3e5945}.compare-axis span{font-size:24px;color:#707965}.direction-gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:23px}.direction-gallery figure{border:1px solid #cbd0c1;border-radius:8px;overflow:hidden;background:#fbfaf2}.direction-gallery img{width:100%;height:274px;display:block;object-fit:cover;object-position:center}.direction-gallery figcaption{padding:16px 21px 17px}.direction-gallery b{display:block;font-size:28px;margin-bottom:8px}.direction-gallery span{display:block;font-size:21px;line-height:1.5;color:#667460}.direction-gallery small{display:block;font-size:18px;color:#8c9385;margin-top:8px}.direction-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.direction-card{padding:22px 26px;border:1px solid #cdd3c3;border-radius:7px;background:#fcfaf2}.direction-card.is-3d{background:#e8eef0;border-color:#b9cbd0}.direction-top{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:10px;font-size:21px;color:#7d8a73}.direction-top>span{letter-spacing:2px}.direction-top b{font-size:20px;font-weight:500;padding:5px 11px;border-radius:3px;background:#e4e9da;color:#58704c}.is-3d .direction-top b{background:#dbe6eb;color:#426d80}.direction-card h3{font-size:32px;margin-bottom:9px}.direction-card p{font-size:23px;line-height:1.7;color:#63725b}.direction-card small{display:block;font-size:19px;line-height:1.6;color:#8a9183;margin-top:10px}.renderer-note{margin-top:19px;padding:23px 28px;background:#e8ebdf;border-radius:6px;font-size:23px;line-height:1.8;color:#5f7257}.renderer-note b{color:#385341}.capability-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.capability-grid article{position:relative;padding:23px 28px 24px;border:1px solid #ccd0c0;border-radius:7px;background:#e8ecdf}.capability-grid article>span{position:absolute;right:24px;top:24px;font-size:21px;color:#9aa18e}.capability-grid h3{font-size:29px;margin-bottom:12px}.capability-grid p{font-size:23px;color:#607154;line-height:1.9;max-width:580px}.knowledge-grid{display:grid;grid-template-columns:1fr 1fr;gap:25px}.reference-box{padding:28px 32px;border:1px solid #c3cbb7;background:#e6ebdb;border-radius:8px}.reference-box h3{font-size:29px;margin-bottom:15px}.reference-box p{font-size:23px;line-height:1.95;color:#607150;margin-bottom:15px}.reference-box p:last-child{margin:0}.reference-box strong{font-weight:600;color:#384f34}.findings{padding:26px 32px;border:1px solid #c6becb;background:#eee8ef;border-radius:8px}.findings article{display:flex;gap:24px;padding:16px 0;border-bottom:1px solid #d4cbd8}.findings article:first-child{padding-top:0}.findings article:last-child{border:0;padding-bottom:0}.findings article>span{font-size:26px;color:#947f9f;padding-top:2px}.findings h3{font-size:26px;margin-bottom:8px;color:#594964}.findings p{font-size:23px;line-height:1.8;color:#7a6b81}.boundary-strip{margin-top:20px;padding:24px 29px;border:1px solid #cebc9d;border-radius:6px;background:#f0e7d6;font-size:24px;line-height:1.8;color:#80623f}.boundary-strip strong{color:#654929;font-weight:600}.future-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}.future-card{display:flex;align-items:center;gap:20px;padding:19px 24px;border:1px solid #c9c5ce;border-radius:6px;background:#eeeaef}.future-card.priority{border-color:#b5c3a6;background:#e3ead9}.future-card>span{font-size:26px;color:#99899e;width:45px}.future-card>div{flex:1}.future-card h3{font-size:26px;line-height:1.6;margin-bottom:4px}.future-card p{font-size:21px;color:#86798b;line-height:1.6}.future-card>b{font-size:19px;font-weight:500;color:#8b7d94;white-space:nowrap;text-align:center;border-left:1px solid #d1c6d4;padding-left:20px}.future-card>b small{font-size:20px;display:block;font-weight:600;margin-top:6px}.future-card.priority h3{color:#4f6540}.future-card.priority p,.future-card.priority>b{color:#7b8c6b}.restart{display:flex;justify-content:space-between;align-items:center;padding:24px 30px;background:#2f473c;color:#eeeddf;border-radius:6px;font-size:24px;margin-top:20px}.restart strong{font-weight:600;font-size:25px}.restart span{font-size:23px}.entrances{border-top:1px solid #b7bda9;margin-top:40px;padding-top:27px}.entrances h3{font-size:28px;line-height:1.6;margin-bottom:20px}.entry-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.entry-grid div{padding:15px 18px;background:#e6e9dc;border:1px solid #c9cebe;border-radius:5px}.entry-grid b{display:block;font-size:24px;font-weight:600;margin-bottom:8px}.entry-grid span{font-size:21px;color:#7c8970}.footer{display:flex;justify-content:space-between;gap:45px;margin-top:22px;font-size:20px;line-height:1.8;color:#88917c}.footer p{max-width:1550px}.footer>span{white-space:nowrap}.divider{height:1px;background:#ccd0c0;margin-top:28px}
'''

css += '''
.early-branches{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;margin-top:20px}.early-branches>div{padding:22px 28px;background:#eeeadf;border:1px solid #cdc9ba;border-radius:7px}.early-branches h3{font-size:27px;line-height:1.6;margin-bottom:14px;color:#7a7159}.material-tokens{display:flex;flex-wrap:wrap;gap:8px 12px}.material-tokens span{font-size:21px;line-height:1.6;padding:4px 10px;background:#e3e2d3;border-radius:3px;color:#73705d}.early-branches p{margin:11px 0 0}.early-branches p>b{font-size:23px;line-height:1.6;margin-right:18px;font-weight:600;color:#626a54}.early-branches p>span{font-size:21px;line-height:1.6;color:#81836e}
'''

body = f'''
<main id="atlas">
<header><div><p class="masthead">DUMPLING STYLE LAB · 010 / WORLD &amp; PLAY</p><h1>游戏探索全景图</h1><p class="subtitle">从原作观察，到画风、参与方式与体验研究。</p></div><span class="stamp">阶段沉淀 · 2026.10.06</span></header>
<p class="purpose"><b>我们真正想探索的：</b>让现实玩家有感觉，愿意进入、行动与继续玩。</p>
<div class="metrics"><div class="metric primary"><b>116</b><span>个展厅入口</span><small>107 个形式样例 ＋ 原有 9 款</small></div><div class="metric"><b>15</b><span>个独立方向样例</span><small>另列；组合规则与参与方式</small></div><div class="metric"><b>20 ＋ 3</b><span>材质实验 / 早期短体验</span><small>各自统计，保留作对照</small></div><div class="metric"><b>12</b><span>项后续扩展记录</span><small>全部未启动 · 当前暂停新增试玩</small></div></div>
<div class="path"><span>观察原作</span><i>→</i><span>材质与画风</span><i>→</i><span>故事与情绪</span><i>→</i><span>参与形式</span><i>→</i><span>组合方向</span><i>→</i><em>暂停扩张 · 沉淀整理</em></div>

<section class="section" id="origin">{heading('01','THE ORIGIN','研究从一个让人愿意停留的世界开始。','原作是参考对象；本站样例与原作分别记录。')}
<div class="original"><figure>{img('web/assets/original-world.png','Dumpling Dell 地图与蒸笼','原作浏览器截图')}<figcaption>Dumpling Dell / 原作浏览器截图</figcaption></figure><div class="original-copy"><h3>治愈系像素收藏与生活</h3><p>探索与收集 → 伙伴照料 → 种植与生产 → 房间布置 → 自绘角色与本地保存。<br>吸引力来自世界、行动与回应的共同配合。</p><div class="original-stats"><div><b>168</b><span>收藏角色</span></div><div><b>43</b><span>场景，含室内</span></div><div><b>36</b><span>任务</span></div><div><b>7</b><span>小游戏</span></div></div><p class="note">原作运行数据记录于 2026.10.01；属于原作，并非本站原创成果。<br>玩家“有感觉”指愿意玩和继续玩的情绪价值，不只指角色运动的重量感。</p></div></div><div class="early-branches"><div><h3>保留的二十种视觉与材质实验</h3><div class="material-tokens">{material_tokens}</div></div><div><h3>保留的三段早期短体验</h3>{early_worlds}</div></div></section>

<section class="section" id="legacy">{heading('02','NINE EARLIER WORLDS','九款短篇：画风怎样兑现成亲历的过程。','原有九款、画风选择、三维微缩样板与原画历史版本均保留。')}
<div class="legacy-grid">{''.join(legacy_cards)}</div><div class="under-note"><span>图源：项目封面与预览；用于回忆故事和画风，品质与运行方式并不完全一致。</span><span>既有进度保留 · 2026-10-02 原画快照可回看</span></div></section>

<section class="section" id="forms">{heading('03','107 FORMS OF PARTICIPATION','从“看起来不同”，走向“参与起来不同”。','下列完整列出 107 个形式名称。八组为本站展厅分类，非行业统一分类。')}
<div class="form-grid">{''.join(form_cards)}</div><div class="compare-axis"><b>画面语言 × 规则 × 镜头 × 操作 × 参与方式</b><span>超级玛丽：跑跳落点　/　魂斗罗：移动与火力推进</span></div></section>

<section class="section" id="directions">{heading('04','FIFTEEN INDEPENDENT DIRECTIONS','十五个独立方向：把参与方式组合起来。','截图帮助回忆实际表现；下表记录玩家在做什么、如何呈现、参考谁。')}
<div class="direction-gallery">{''.join(shot_cards)}</div><div class="direction-grid">{''.join(direction_cards)}</div><p class="renderer-note"><b>表现体系：</b>星潮航路与岚谷试车场采用真实 Three.js 三维；深岩堡垒为二维管理＋2.5D 射线附身；雾海牌航、夜港来信以 HTML/CSS 界面或热点组织场面；其余主要采用 Canvas2D 与原生界面。<br><b>范围：</b>当前为本地有限样例；本地同屏与单人职业切换不等于线上多人。星潮航路在三维场景内按平面航行规则运行；六自由度在另一个旧形式中实现。</p></section>

<section class="section" id="capabilities">{heading('05','WHAT THE PROJECT CAN DO','可复用的积累：画面、规则、反馈与作品。','这些能力分布在不同样例中；不是每个试玩都拥有全部能力。')}
<div class="capability-grid">{capability_cards}</div><div class="under-note"><span>素材与呈现：原创场景、透明图集与道具；模型、动画及素材许可记录保留。</span><span>部分协作与异步服务为本机 HTTP / SQLite</span></div></section>

<section class="section" id="findings">{heading('06','REFERENCES &amp; WHAT WE LEARNED','参考游戏帮助发现方向，实际运行帮助形成判断。')}
<div class="knowledge-grid"><div class="reference-box"><h3>来源、价值与边界</h3><p><strong>研究起点：</strong>Dumpling Dell<br><strong>发现入口：</strong>bobeff/open-source-games<br>它按类型收录项目；可用于发现方向、对照体验与寻找源码能力。它是参考目录，不是直接使用的游戏引擎。</p><p><strong>七组精选参考：</strong>Hypersomnia、IsoCity、SuperTuxKart、DDNet、Mindustry、0 A.D.、micropolisJS。<br>首批十条方向及其参照见上表；有重叠，不重复相加。</p><p><strong>开源与商业参照分列：</strong>牌组、观鸟、调查、拼境与语言解读参考的是商业游戏的参与方式；本站短样例不是原作移植。</p><p><strong>真正积累的价值：</strong>形式覆盖、参与方式索引、可运行样例、素材与保存基础、真实效果对照，以及下一步如何选择的判断。</p></div><div class="findings">{finding_cards}</div></div><div class="boundary-strip"><strong>功能成立、画面有吸引力、玩家愿意继续玩，需要分别判断。</strong>当前已经有可运行的有限样例与检查记录；真人持续意愿、长期留存、广泛兼容和商业价值尚未完成验证。</div></section>

<section class="section" id="future">{heading('07','FUTURE NOTES — NOT STARTED','以后可扩展什么：先把十二个候选留下。','“未启动”指新的深化研究；相关旧样例基础仍可体验。三维与连续动作需要素材及运行体系共同支撑。')}
<div class="future-grid">{future_cards}</div><div class="restart"><strong>重新启动时的判断</strong><span>差异清楚　→　素材支持连续体验　→　实际运行与保存成立　→　真人愿意继续</span></div></section>

<section class="entrances" id="entrances"><h3>回到项目：从首页 index.html 进入六个主要页面。</h3><div class="entry-grid"><div><b>方向地图</b><span>directions.html</span></div><div><b>形式对照</b><span>forms.html</span></div><div><b>全部试玩</b><span>showcase.html</span></div><div><b>原有九款</b><span>games.html</span></div><div><b>参考汇总</b><span>references.html</span></div><div><b>沉淀记录</b><span>research.html</span></div></div><div class="footer"><p>图片分别标注原作浏览器截图、本站浏览器截图和项目封面／预览。依据项目目录、README 与阶段沉淀记录整理。原作及参考游戏归各自作者所有；这里用于回忆与研究导航。</p><span>010 · 游戏探索研究 / 2026.10.06</span></div></section>
</main>
'''

document = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>游戏探索全景图 · 精确排版稿</title><style>'+css+'</style></head><body>'+body+'</body></html>'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'atlas-source.html').write_text(document, encoding='utf-8')
(WEB / '_overview-render.html').write_text(document, encoding='utf-8')
manifest = {'method': 'Unmodified raster sources embedded in exact-text HTML/CSS, exported by native browser screenshot',
            'imagegen_attempt': 'Failed with network error; no generated raster was substituted',
            'counts': {'forms':107,'legacy':9,'showcase':116,'independent_directions':15,'future_notes':12},
            'source_images':image_sources,'poster_width':2400,'minimum_font_px':18,
            'sections':['原作与历程','原有九款','107形式全目录','十五独立方向','技术能力','参考与研究结论','十二未来记录','网页入口']}
(OUT / 'manifest-20261006.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Atlas built:', len(image_sources),'source images;',len(document.encode('utf-8')),'bytes;',sum(len(v) for v in catalog['groups'].values()),'form names')
