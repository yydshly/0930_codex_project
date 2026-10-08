"""Reproducible, code-native infographic; creates SVG and PNG from the same layout.

No existing image is modified. Chinese labels are rendered with Windows YaHei.
The source of truth is src/project-overview-data.js and the linked project notes.
"""
from pathlib import Path
from html import escape
import json
import math
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
W, H = 2560, 3050
P = {
    'bg': '#F6F4EE', 'paper': '#FFFFFF', 'ink': '#2E443D', 'muted': '#607269',
    'line': '#D6DDD1', 'green': '#47795A', 'green_bg': '#E9F1E5',
    'blue': '#5479A5', 'blue_bg': '#EDF3FC', 'amber': '#906A25',
    'amber_bg': '#FCF1DB', 'gray': '#727B79', 'gray_bg': '#EDEFEA',
}
canvas = Image.new('RGB', (W, H), P['bg'])
draw = ImageDraw.Draw(canvas)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
       '<title id="title">毛绒实验室：全程能力与实现原理</title>',
       '<desc id="desc">六类已有能力，程序毛丝与原作高斯两条路线，事件与数据流程，九组研究方法，六个扩展方向与当前边界。</desc>',
       f'<rect width="{W}" height="{H}" fill="{P["bg"]}"/>']
fonts = {}
checks = []

def font(size, bold=False):
    key = (size, bold)
    if key not in fonts:
        fonts[key] = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc', size)
    return fonts[key]

def rect(x, y, w, h, fill, radius=24, stroke=None, sw=2):
    draw.rounded_rectangle((x, y, x+w, y+h), radius=radius, fill=fill, outline=stroke, width=sw)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '') + '/>')

def text(x, y, value, size=30, color=None, bold=False, max_width=None):
    color = color or P['ink']
    f = font(size, bold)
    actual = draw.textlength(value, font=f)
    if max_width is not None:
        checks.append({'text': value, 'width': round(actual, 1), 'limit': max_width, 'fits': actual <= max_width})
        if actual > max_width:
            raise ValueError(f'Text exceeds its column: {value} ({actual} > {max_width})')
    draw.text((x, y), value, font=f, fill=color, anchor='lt')
    svg.append(f'<text x="{x}" y="{y}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" dominant-baseline="text-before-edge">{escape(value)}</text>')

def lines(x, y, values, size=30, line_height=44, color=None, max_width=None):
    for i, value in enumerate(values):
        text(x, y+i*line_height, value, size, color, max_width=max_width)

def line(x1, y1, x2, y2, color=None, width=2):
    color = color or P['line']
    draw.line((x1, y1, x2, y2), fill=color, width=width)
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')

def circle(x, y, radius, fill, stroke=None, sw=2):
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=fill, outline=stroke, width=sw)
    svg.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '') + '/>')

def arrow(x1, y, x2, color):
    line(x1, y, x2-7, y, color, 3)
    pts = [(x2, y), (x2-11, y-7), (x2-11, y+7)]
    draw.polygon(pts, fill=color)
    svg.append('<polygon points="' + ' '.join(f'{x},{yy}' for x, yy in pts) + f'" fill="{color}"/>')

def pill(x, y, label, kind='green', size=24):
    tw = draw.textlength(label, font=font(size, True))
    rect(x, y, tw+30, 42, P[kind+'_bg'], 21)
    text(x+15, y+8, label, size, P[kind], True)

def section(y, number, label, subtitle):
    pill(96, y, number, 'green', 24)
    text(174, y-2, label, 43, bold=True)
    text(174 + draw.textlength(label, font=font(43, True)) + 38, y+10, subtitle, 28, P['muted'], max_width=1400)

# Header: a diagram, rather than a likeness of the reference character.
text(96, 61, 'PLUSH LAB  /  PROJECT LIBRARY', 26, P['green'], True)
text(96, 116, '毛绒实验室', 86, bold=True)
text(710, 147, '全程能力与实现原理', 49, P['green'], True)
text(96, 228, '一套网页工作台、资产适配器与研究记录库：创作 → 场景互动 → 陪伴与任务展示', 30, P['muted'], max_width=2368)
pill(1540, 68, '已实现', 'green')
pill(1710, 68, '资产接入', 'blue')
pill(1890, 68, '实验验证', 'amber')
pill(2085, 68, '待接入 / 参考', 'gray')
rect(96, 297, 2368, 86, '#E9EDE2', 20)
text(126, 324, '10 个阶段', 30, P['green'], True)
text(390, 324, '9 组方法', 30, P['green'], True)
text(645, 324, '124 条内置记录 + 个人补充', 30, P['green'], True)
text(1320, 324, '四类记录：进展 / 修改 / 原理 / 扩展', 29, P['muted'])

# Six capability areas; the research entry appears in the dedicated method band.
section(419, '01', '现在能做什么', '已有能力按实际运行范围归纳')
capabilities = [
    ('绒毛创作', '程序角色 · 已实现', 'green', [
        '8 种造型 × 8 种材质与配饰', '毛长、密度、卷曲与梳理参数',
        '局部剪 / 染 / 卷 / 梳 / 恢复', '组合步骤 · 最近 24 步撤销重做']),
    ('目标毛绒效果', '作者资产 · 已接入', 'blue', [
        '蓝绒星仔：完整 3DGS + SH3', '6 块 SOG · 3,493,379 个高斯',
        '进入创作 / 小世界 / 展示台画布', '整体动作 + 毛长 / 卷曲 / 梳理近似']),
    ('小世界', '程序场景 · 已实现', 'green', [
        '种子随机搭配 · 锁定喜欢的选项', '程序角色换装 · 家具布置',
        '行走、坐下、丢球与追球捡回', '状态机 + 代理几何 + 运动学']),
    ('陪伴与成长', '本机记录 · 已实现', 'green', [
        '陪伴笔记 · 共同回忆与成长事件', '提醒在页面运行期间触发',
        '完成的互动累积成长里程碑', '外部 AI / 长期记忆 / 后台提醒待接入']),
    ('Agent 可视化', '固定本地任务 · 已实现', 'green', [
        '3 类任务：笔记整理 / 提醒 / 总览', '展示计划步骤、工具事件与结果',
        '逐步继续、停止、转为笔记草稿', '当前流程按规则执行，AI 尚未启用']),
    ('作品与项目记录', '独立保存 · 已实现', 'green', [
        '草稿、收藏、配方分享与 PNG', '完整历史搜索与个人补充',
        'Markdown 导出 · JSON 备份 / 合并', '当前浏览器本机数据 · 云同步待接入']),
]
cw, gap = 770, 29
for i, (title, status, kind, body) in enumerate(capabilities):
    x, y = 96 + (i % 3)*(cw+gap), 489 + (i // 3)*282
    rect(x, y, cw, 258, P['paper'], 26, P['line'])
    rect(x, y, 9, 258, P[kind], 4)
    text(x+30, y+24, title, 42, bold=True, max_width=710)
    text(x+30, y+79, status, 25, P[kind], True, max_width=710)
    lines(x+30, y+122, body, 28, 33, P['muted'], 710)

# Actual rendering/editing paths, not names of products standing in for algorithms.
section(1071, '02', '它是怎样实现的', '两条毛绒路线，各自解决不同输入与控制问题')
rx, rw, ry, rh = 96, 1170, 1141, 320

def pipeline(x, y, width, labels, kind):
    box_width = (width-66)/4
    for i, label in enumerate(labels):
        bx = x+i*(box_width+22)
        rect(bx, y, box_width, 64, P['paper'], 14)
        text(bx+13, y+20, label, 25, P[kind], True, max_width=box_width-24)
        if i < 3:
            arrow(bx+box_width+4, y+32, bx+box_width+18, P[kind])

rect(rx, ry, rw, rh, P['green_bg'], 26)
text(rx+30, ry+26, 'A  可自由编辑的程序毛丝', 37, P['green'], True)
pipeline(rx+30, ry+90, rw-60, ['毛根采样', '线段 / ribbon', '局部表面场', '检查点 / 撤销'], 'green')
lines(rx+30, ry+180, [
    '形体上采样毛根，稀疏导向控制渐细毛束与弯曲。',
    '128×64 表面场保存剪、染、卷、梳与恢复结果。',
    '检查点合并保留旧效果，组合步骤整理连续操作。',
], 29, 40, P['ink'], rw-60)
rx2 = rx+rw+28
rect(rx2, ry, rw, rh, P['blue_bg'], 26)
text(rx2+30, ry+26, 'B  保留目标质感的原作高斯', 37, P['blue'], True)
pipeline(rx2+30, ry+90, rw-60, ['本地 SOG', 'Spark 解码', 'SH 颜色 / 排序', 'GPU 绘制'], 'blue')
lines(rx2+30, ry+180, [
    '从作者既有资产显示外观，适配坐标、尺度与场景。',
    '整体运动；近似调整高斯位置、方向与大小。',
    '梳理以 12×14×8 空间场驱动，没有逐根毛丝结构。',
], 29, 40, P['ink'], rw-60)
rect(96, 1479, 2368, 70, '#DAE4D5', 17)
text(133, 1498, '统一绘制与交互底座', 29, P['green'], True)
text(590, 1498, 'Three.js / WebGL  ·  相机  ·  场景  ·  画布  ·  输入事件', 30, P['ink'])
rect(96, 1568, 1170, 202, P['paper'], 24, P['line'])
text(126, 1592, 'C  场景 → 行为 → 回忆与成长', 34, bold=True)
lines(126, 1650, [
    '种子 / 配置 → 场景与代理几何 → 状态机 / 路径 / 运动学',
    '实际完成的互动事件 → 回忆记录 → 成长里程碑',
    '成长来自已经发生的事件；自主故事与多角色仍待扩展。',
], 28, 35, P['muted'], 1110)
rect(rx2, 1568, 1170, 202, P['paper'], 24, P['line'])
text(rx2+30, 1592, 'D  数据 → 本地任务 → 可编辑结果', 34, bold=True)
lines(rx2+30, 1650, [
    '校验配置 → 浏览器本机存储 → 分享 / 导出 / 再导入',
    '任务读取快照 → 固定规则 → 执行事件 → 笔记草稿',
    '作品、世界、陪伴与项目记录各自保存，旧创作继续保留。',
], 28, 35, P['muted'], 1110)

# The nine source groups, with the exact extent of adoption made visible.
section(1811, '03', '论文、算法与成熟工具', '九组方法：使用到哪一步，也写到哪一步')
methods = [
    ('Three.js + 程序纤维', 'green', '已用：毛根、ribbon、导向与表面场'),
    ('Shells / Fins · 2001', 'amber', '实验：32 层 Shells；未实现 Fins'),
    ('动态 FTL · 2012', 'amber', '实验：32 根六段导向链，逐段保长'),
    ('液体与毛发 · 2017', 'amber', '外观启发：湿润聚束；未做液体耦合'),
    ('Chiang + Cycles · 2016', 'amber', '已渲染：纤维散射；自制质感未达参考'),
    ('3DGS · 2023 / Mip · 2024', 'amber', '前向高斯 / 受限 PLY；2D Mip 仅程序展台'),
    ('Blender Hair / Houdini Groom', 'amber', 'Blender 已运行；Houdini 仅方法参考'),
    ('LichtFeld / SuperSplat / Spark', 'blue', 'Spark 显示原作；本项目未运行训练'),
    ('GaussianHair / Volumetric Sheen', 'gray', '已整理理解；重建与光泽模型尚未集成'),
]
for i, (title, kind, body) in enumerate(methods):
    x, y = 96+(i%3)*(cw+gap), 1881+(i//3)*118
    rect(x, y, cw, 99, P[kind+'_bg'], 18)
    circle(x+28, y+28, 6, P[kind])
    text(x+48, y+15, title, 29, P[kind], True, max_width=695)
    text(x+27, y+57, body, 25, P['muted'], max_width=717)

# Six previously discussed roadmap directions, not new claims of implementation.
section(2253, '04', '接下来向哪里生长', '以下全部为待完成方向')
roadmaps = [
    ('先把编辑体验接顺', '笔刷命中 / 模式互斥 / 窄屏预览 / 导入容量'),
    ('质感与自由创作统一', '原作语义分区 / 局部剪染 / 换装 / 柔软形变'),
    ('AI 陪伴与生活用途', '真实对话 / 记忆选择 / 提醒草稿 / 后台提醒'),
    ('可检查的自主 Agent', '受限规划 / 工具执行 / 结果核验 / 失败停止'),
    ('随机创意与共同故事', '主题搭配 / 自定义场景 / 多角色 / 故事成长'),
    ('性能与作品延续', '分级加载 / GPU 与手机验证 / 版本 / 云同步'),
]
for i, (title, body) in enumerate(roadmaps):
    x, y = 96+(i%3)*(cw+gap), 2323+(i//3)*115
    rect(x, y, cw, 95, P['gray_bg'], 18)
    text(x+27, y+15, title, 31, P['ink'], True, max_width=716)
    text(x+27, y+56, body, 25, P['muted'], max_width=717)

rect(96, 2580, 2368, 161, P['paper'], 23, P['line'])
text(125, 2598, '十个阶段 · 历史继续保留', 29, P['green'], True)
history = ['短绒创作', '连续编辑', '项目记录', '小世界', '陪伴与任务', '程序研究', 'Cycles 实验', '在线原作', '本地接入', '页面审查']
for i, label in enumerate(history):
    hx, hy = 125+(i%5)*465, 2645+(i//5)*45
    text(hx, hy, f'{i+1:02d}  {label}', 27, P['muted'])
    if i%5 < 4:
        arrow(hx+300, hy+14, hx+422, P['line'])
rect(96, 2762, 2368, 175, '#E8EBE4', 23)
text(125, 2786, '当前边界', 32, P['green'], True)
text(385, 2789, '高斯编辑是近似；原作尚无局部剪染 / 换装；没有逐根毛丝物理。', 29, max_width=1990)
text(385, 2832, '原作保留烘焙外观，场景灯光不重算纤维散射；AI 接口未启用，任务按固定规则运行。', 29, max_width=1990)
text(125, 2888, '原作：ChatGPT dots - Felipe · abstrakt · CC BY 4.0  |  本项目：加载、场景适配与近似编辑；未训练或照片重建原作。', 25, P['muted'], max_width=2310)
text(96, 2980, '截至 2026-10-03  ·  汇总覆盖完整项目；资料齐全不代表全部能力已完成。', 28, P['muted'])
text(1960, 2980, '原始作品与记录全部保留', 24, P['green'], True)

svg.append('</svg>')
(OUT/'capabilities-principles-summary.svg').write_text('\n'.join(svg), encoding='utf-8')
canvas.save(OUT/'capabilities-principles-summary.png', optimize=True)
(OUT/'summary-image-validation.json').write_text(json.dumps({
    'createdAt': '2026-10-03', 'mode': 'code-native vector diagram with matched PNG rendering',
    'imagegenAttempts': {'count': 2, 'outcome': 'network error; no generated image used'},
    'dimensions': {'width': W, 'height': H}, 'capabilityAreas': len(capabilities),
    'methodGroups': len(methods), 'roadmapDirections': len(roadmaps),
    'historicalScope': {'stages': 10, 'builtInRecords': 124, 'personalNotes': 'preserved separately'},
    'referenceAssetCredit': 'ChatGPT dots - Felipe / abstrakt / CC BY 4.0',
    'textWidthChecks': checks,
    'noExistingRasterEdited': True,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'png': str(OUT/'capabilities-principles-summary.png'), 'svg': str(OUT/'capabilities-principles-summary.svg'), 'width': W, 'height': H, 'textChecks': len(checks)}, ensure_ascii=False))
