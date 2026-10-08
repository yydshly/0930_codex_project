"""Generate the research data and a standalone vector overview from one source."""
from pathlib import Path
import html
import json
import re
import shutil
import unicodedata

PROJECT = Path(__file__).resolve().parents[1]
WEB = PROJECT / 'web'
OUT = WEB / 'research'
OUT.mkdir(exist_ok=True)
data = json.loads((Path(__file__).with_name('research-summary.json')).read_text(encoding='utf-8'))
reports = [('效果模式', 'effects-checks.json'), ('产品原型', 'products-checks.json'), ('头像角色', 'avatar-checks.json'), ('跨站扩展', 'anywhere-checks.json'), ('网页工具', 'toolbox-checks.json'), ('工具箱扩展', 'extension-checks.json')]
data['evidence'] = []
for name, file in reports:
    report = json.loads((PROJECT / 'notes' / file).read_text(encoding='utf-8'))
    checks = report['checks']
    data['evidence'].append({'name': name, 'passed': sum(bool(c['passed']) for c in checks), 'total': len(checks), 'checkedAt': report.get('checkedAt'), 'file': file})
(WEB / 'research-data.js').write_text('export const research = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')

# Preserve actual evidence pixels; only resize them later for the overview site.
image_sources = {'effects': PROJECT/'assets/effects/glass.png', 'avatar': PROJECT/'assets/avatar/kick.png', 'anywhere': WEB/'avatar-anywhere/assets/github-kick.png', 'motion': PROJECT/'assets/products/motion.png', 'products': PROJECT/'assets/products/compare.png', 'toolbox': PROJECT/'assets/toolbox/overview.png'}
for name, source in image_sources.items():
    if not source.is_file():
        raise FileNotFoundError(source)
    shutil.copyfile(source, OUT / (name + '.png'))

parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1900" viewBox="0 0 1800 1900" role="img" aria-labelledby="title desc"><title id="title">网页破坏交互研究完整总览</title><desc id="desc">原作、本地引擎、独立工具；获取内容到动作反馈的原理；已验证扩展、产品能力和后续路线。</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="#81968c" stroke-width="1.5"/></marker></defs><rect width="1800" height="1900" fill="#f4f3ed"/>']

def rect(x, y, w, h, fill='#fffefa', stroke='#d7dfd6', radius=18):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>')

def text(x, y, value, size=21, color='#25493f', weight=400, max_width=None):
    maximum = f' data-max-width="{max_width}"' if max_width else ''
    parts.append(f'<text x="{x}" y="{y}" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="{size}" fill="{color}" font-weight="{weight}"{maximum}>{html.escape(value)}</text>')

def wrap(value, width, size):
    lines, line, used = [], '', 0
    for token in re.findall(r'[A-Za-z0-9_.]+|\n|[^\w\s]|[ \t]+|.', value):
        amount = sum(size * (1 if unicodedata.east_asian_width(char) in ('W', 'F') else .58) for char in token)
        if token == '\n':
            lines.append(line.rstrip());line='';used=0;continue
        if used + amount > width and line:
            lines.append(line.rstrip());line='';used=0;token=token.lstrip()
            amount = sum(size * (1 if unicodedata.east_asian_width(char) in ('W', 'F') else .58) for char in token)
        line += token;used += amount
    if line: lines.append(line)
    return lines

def paragraph(x, y, value, width, size=21, line_height=33, color='#5c6f65', weight=400):
    lines = wrap(value, width, size)
    for i, line in enumerate(lines): text(x, y+i*line_height, line, size, color, weight, width)
    return y+len(lines)*line_height

def bullet(x, y, value, width, size=21):
    parts.append(f'<circle cx="{x+3}" cy="{y-7}" r="3" fill="#80968b"/>')
    return paragraph(x+18, y, value, width-18, size)

text(60, 64, 'PROJECT 009 / RESEARCH SYNTHESIS', 18, '#658276', 600)
text(60, 128, '网页内容，怎样变成可参与的互动？', 46, '#183d33', 700)
text(60, 170, '原作能力 → 本地原理 → 已做扩展 → 产品用途 → 后续路线', 24, '#5c6f65')
text(1455, 63, data['date']+' · 研究总览', 18, '#658276')

cols = [60, 628, 1196]
themes = [('#edf3f8','#bcceda','#3e6e91'),('#edf5ed','#b7d2bb','#2e7755'),('#fcf1e4','#e2ccb2','#a57033')]
for index, item in enumerate(data['identity']):
    x=cols[index];fill,stroke,color=themes[index];rect(x,202,544,238,fill,stroke)
    text(x+26,238,item['label'],18,color,600);text(x+26,277,item['title'],28,'#25493f',700)
    paragraph(x+26,318,item['text'],488,21,32)

text(60,486,'01 / 原理：内容与宿主、运动、产品流程分开',26,'#183d33',700)
rect(60,510,1680,248)
for index, step in enumerate(data['pipeline']):
    x=82+index*334
    text(x,549,f'0{index+1}',18,'#72907d',600);text(x,584,step['title'],25,'#25493f',700)
    paragraph(x,619,step['text'],275,20,30)
    paragraph(x,687,step['api'],290,16,23,'#377653')
    if index<4: parts.append(f'<path d="M{x+295} 584H{x+319}" stroke="#81968c" stroke-width="2" marker-end="url(#arrow)"/>')
text(82,740,'原作：网址 → 服务采集 / DOM 布局 → 关卡；本地：DOM 重建或截图 → 纹理 → 刚体 / 粒子 / 遮罩。',18,'#64756b',max_width=1620)

text(60,804,'02 / 我们实际研究和实现了什么？',26,'#183d33',700)
for x in cols: rect(x,829,544,328)
text(86,870,'效果与场景',26,'#25493f',700)
paragraph(86,910,'玻璃裂解 · 纸片飘散 · 方块破坏\n像素消融 · 霓虹聚合 · 涟漪揭幕',492,22,34)
paragraph(86,1004,'研究集首页 / 旧价揭晓 / 碰撞课堂\n刚体、粒子与遮罩各有计算方式。\n任务阈值、参数、完成事件均可操作。',492,20,31)
text(86,1127,'效果 49/49 · 场景 21/21',18,'#377653',600)
text(654,870,'角色与跨网页',26,'#25493f',700)
paragraph(654,910,'头像出逃 → 踢碎卡片 → 召回 / 复原\n照片或网页头像只作为头部。\n身体与动作预设，碎片实时物理。',492,21,33)
paragraph(654,1019,'跨站：点选位置 + 当前视口截图。\nGitHub 实录：实际页面、脚本操作。\n测试权限与下载版授权流程有差异。',492,20,31)
text(654,1127,'头像 18/18 · 跨站 21/21',18,'#377653',600)
text(1222,870,'产品原型与独立工具',26,'#25493f',700)
paragraph(1222,910,'动效 / 对比 / 说明书 / 数据故事\n品牌展览 / 嵌入组件，共六工具。\n只有内容动效直接复用碎裂引擎。',492,21,33)
paragraph(1222,1019,'翻译 / 摘录 / 表格 / 文本小工具\n来自另建模块、浏览器 API 和服务。\n这些不是原作或物理引擎自带功能。',492,20,31)
text(1222,1127,'产品 50/50 · 工具 30/30',18,'#377653',600)

text(60,1203,'03 / 可以扩展成哪些产品能力？',26,'#183d33',700)
for index,(label,body,foot) in enumerate([
    ('直接复用视觉互动','内容动效制作 / 互动反馈组件\n品牌角色与创作者主页\n碰撞教学与可玩入口','现有演示可作为组件化基础。'),
    ('结合真实任务与业务','新品揭晓 / 领取预约 / 品牌展览\n提案对比 / 维护指南 / 数据故事\n接业务服务、数据和协作状态','后五类原型采用独立交互实现。'),
    ('另外开发网页效率工具','翻译阅读 / 来源摘录 / 表格提取\n文本处理 / 单位换算 / 批量整理\n可与角色 UI 共存、按需调用','工具能力需要自己的模块和服务。')]):
    x=cols[index];rect(x,1228,544,230,themes[index][0],themes[index][1]);text(x+26,1270,label,25,'#25493f',700);paragraph(x+26,1310,body,492,20,31);text(x+26,1430,foot,18,themes[index][2],max_width=492)

text(60,1504,'04 / 后续路线：先稳定与验证，再扩大宿主和投入',26,'#183d33',700)
for index, item in enumerate(data['roadmap']):
    x=cols[index];rect(x,1529,544,257,'#fff8ee','#dfd0ba');text(x+26,1568,item['phase'],19,'#9a713d',600)
    y=1604
    for value in item['items']: y=bullet(x+26,y,value,492,19)+7
    paragraph(x+26,1745,item['dependency'],492,17,24,'#906c3e')

text(60,1837,'采用边界：公开 SDK 未确认；不自动生成照片全身；不通用注入第三方原生 App；尚无商业收益数据。',19,'#8b643b',max_width=1680)
text(60,1874,'来源：Destroy Any Website 官方页面、公开客户端观察；本地代码与浏览器实测。Matter.js / html2canvas 为本地技术基础。',17,'#67776d',max_width=1680)
parts.append('</svg>')
(OUT/'overview.svg').write_text('\n'.join(parts),encoding='utf-8')
print('Generated research-data.js, overview.svg and six original evidence copies.')
