"""Render the source-grounded Waterfalls Lab understanding poster.

Run: python projects/017-waterfalls-lab/tooling/build-understanding-figure.py
Requires Pillow and a Chinese font. Original screenshot pixels are only resized.
Both PNG and editable, self-contained SVG are generated from the same layout.
"""

from __future__ import annotations

import base64
import html
import json
import math
import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1800, 3400
BG, INK, MUTED = "#f5f3e9", "#233f37", "#5c7065"
GREEN, TEAL, PALE, BORDER = "#365b47", "#2d7b78", "#e8ede0", "#d2dccc"
PAPER, DARK = "#fffdf6", "#24483d"
FONT_DIR = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
REGULAR = FONT_DIR / "msyh.ttc"
BOLD = FONT_DIR / "msyhbd.ttc"
if not REGULAR.exists():
    alternatives = [
        Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
        Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    ]
    REGULAR = next((p for p in alternatives if p.exists()), REGULAR)
    BOLD = REGULAR
if not REGULAR.exists():
    raise RuntimeError("A Chinese font is required (Microsoft YaHei / Noto Sans CJK).")

canvas = Image.new("RGB", (WIDTH, HEIGHT), BG)
draw = ImageDraw.Draw(canvas)
svg: list[str] = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">',
    '<title>Waterfalls Lab：从瀑布效果，到业务基座</title>',
    '<desc>真实 V9 画面、可复用能力、GPU 技术管线、六类产品方向、个人价值与验证边界。</desc>',
    f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{BG}"/>',
]
fonts: dict[tuple[int, bool], ImageFont.FreeTypeFont] = {}
text_checks: list[dict] = []


def font(size: int, bold: bool = False):
    key = (size, bold)
    if key not in fonts:
        fonts[key] = ImageFont.truetype(str(BOLD if bold else REGULAR), size)
    return fonts[key]


def rect(x, y, w, h, fill=PAPER, stroke=BORDER, radius=18, width=2):
    draw.rounded_rectangle((x, y, x + w, y + h), radius, fill, stroke, width)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')


def line(points, color=TEAL, width=3):
    draw.line(points, fill=color, width=width, joint="curve")
    svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')


def arrow(points, color=TEAL, width=4, tip=10):
    line(points, color, width)
    (x0, y0), (x, y) = points[-2:]
    angle = math.atan2(y - y0, x - x0)
    tri = [(x, y), (x - tip * math.cos(angle - .55), y - tip * math.sin(angle - .55)),
           (x - tip * math.cos(angle + .55), y - tip * math.sin(angle + .55))]
    draw.polygon(tri, fill=color)
    svg.append(f'<polygon points="{" ".join(f"{xx},{yy}" for xx,yy in tri)}" fill="{color}"/>')


def text(value, x, y, size=28, color=INK, bold=False, max_width=None):
    # Exact widths are checked before writing. No automatic font shrinking.
    f = font(size, bold)
    width = draw.textlength(value, font=f)
    if max_width is not None and width > max_width + 1:
        raise ValueError(f"Text too wide ({width:.1f} > {max_width}): {value}")
    box = draw.textbbox((x, y), value, font=f, anchor="lt")
    if box[2] > WIDTH - 35 or box[3] > HEIGHT - 15:
        raise ValueError(f"Text clipped at canvas edge: {value}")
    text_checks.append({"text": value, "size": size, "box": box})
    draw.text((x, y), value, font=f, fill=color, anchor="lt")
    svg.append(f'<text x="{x}" y="{y + size * .91:.1f}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(value)}</text>')


def wrap(value, max_width, size=28, bold=False):
    lines, current = [], ""
    for char in value:
        if char == "\n":
            lines.append(current)
            current = ""
        elif current and draw.textlength(current + char, font=font(size, bold)) > max_width:
            lines.append(current)
            current = char
        else:
            current += char
    if current:
        lines.append(current)
    return lines


def block(value, x, y, width, size=28, leading=40, color=INK, bold=False, max_lines=None):
    lines = wrap(value, width, size, bold)
    if max_lines is not None and len(lines) > max_lines:
        raise ValueError(f"Too many lines ({len(lines)} > {max_lines}): {value}")
    for i, row in enumerate(lines):
        text(row, x, y + i * leading, size, color, bold, width)
    return y + len(lines) * leading


def section(number, title, y, note=None):
    rect(70, y - 5, 54, 44, TEAL, TEAL, 12)
    text(number, 80, y + 2, 27, PAPER, True)
    text(title, 143, y, 37, INK, True)
    if note:
        text(note, 143, y + 53, 27, MUTED, max_width=1580)


def badge(value, x, y, width):
    rect(x, y, width, 44, PALE, PALE, 12)
    text(value, x + 16, y + 7, 26, GREEN, max_width=width - 32)


def image_from_file(path, x, y, w, h):
    original = Image.open(path).convert("RGB")
    if abs(original.width / original.height - w / h) > .003:
        raise ValueError("Screenshot must retain its original aspect ratio.")
    canvas.paste(original.resize((w, h), Image.Resampling.LANCZOS), (x, y))
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:{mime};base64,{encoded}"/>')


# Title and actual effect proof precede all explanatory material.
text("WATERFALLS LAB  /  STUDIO 09  /  理解与复用地图", 70, 52, 28, TEAL, True)
text("从瀑布效果，到业务基座", 70, 101, 65, INK, True)
text("定位：可编辑自然场景与流体交互基座。已有技术沉淀，后续扩展由具体业务驱动。", 72, 189, 30, MUTED)
section("01", "先看效果：可编辑、会反馈的小范围三维水景", 248)
image_from_file(ROOT / "assets/landscape-v9.png", 70, 307, 930, 523)
rect(1030, 307, 700, 523)
text("地形一改，水路就会变", 1060, 340, 39, GREEN, True)
block("程序生成的森林与岩壁中，水从多个源流出，受地形和障碍影响，绕行、分流、汇合。", 1060, 404, 635, 29, 41, MUTED, max_lines=3)
for y, title, description in [
    (550, "塑造地形", "堆筑、挖掘、平滑、削平；形成空腔"),
    (635, "布置水路", "摆放岩石，调整水源位置、方向和流量"),
    (720, "观察与保存", "即时看水流变化，收藏镜头、保存作品"),
]:
    text(title, 1060, y, 31, GREEN, True)
    text(description, 1060, y + 43, 27, MUTED, max_width=635)
text("本项目实机画面 · V9 · 真实 GPU PNG 导出（原图缩放，未重绘）", 70, 851, 27, MUTED)

# The existing reusable capabilities, not promises of product-level completion.
section("02", "已经沉淀的六项基础能力", 911)
capabilities = [
    ("地形与场景", "三维体素编辑、镜像笔刷\n程序化森林与三种风景预设"),
    ("障碍与水源", "岩石选择 / 分组 / 变换\n多水源、方向流量与轨迹辅助"),
    ("实时水流", "GPU 三维 PB-MPM\n粒子与网格传递、碰撞反馈"),
    ("水面与氛围", "折射、吸收、反射、泡沫\n方向光阴影、程序化水声"),
    ("创作与观看", "撤销重做、命名镜头收藏\n沉浸观看、PNG 截图"),
    ("作品持久化", "自动保存、本地命名作品\nJSON 导入导出与校验"),
]
for i, (title, body) in enumerate(capabilities):
    x, y = 70 + (i % 3) * 560, 968 + (i // 3) * 140
    rect(x, y, 540, 128)
    text(title, x + 22, y + 15, 31, GREEN, True)
    block(body, x + 22, y + 58, 494, 27, 33, MUTED, max_lines=2)

# Read left to right, then right to left. Collision field and display mesh fork.
section("03", "内部如何工作：操作 → 碰撞与求解 → 水面 → 反馈", 1280,
        "CPU 处理创作状态与体素；Worker 重建可见地形；WebGPU 计算并绘制流体。")
nodes = [
    (70, 1380, "1  创作输入 / CPU", "笔刷编辑、物体变换、水源参数\n更新场景状态、历史与缓存"),
    (635, 1380, "2  地形场与碰撞场", "地形 + 障碍 → 碰撞场上传 GPU\n地形 → Worker → 表面网格\n采用 marching tetrahedra 提取"),
    (1200, 1380, "3  GPU / PB-MPM", "P2G → 网格更新 → G2P\n碰撞、体积约束与 APIC 回传\n固定 1/120 秒；每步 3 次迭代"),
    (1200, 1610, "4  屏幕空间水面", "物理粒子生成深度与厚度\n双向双边滤波、重建水面法线\n场景深度处理前后遮挡"),
    (635, 1610, "5  光学合成", "折射 + 吸收 + Fresnel 反射\n高光、泡沫与色调映射\n泡沫来自速度 / 碰撞启发式"),
    (70, 1610, "6  输出 / 操作反馈", "实时三维画布，观察水路\nGPU 读回 → PNG 画面\n调整地形 / 水源，再次观察"),
]
for x, y, title, body in nodes:
    rect(x, y, 530, 192, PALE if title.startswith(("2", "3")) else PAPER)
    text(title, x + 20, y + 18, 30, GREEN, True, 490)
    block(body, x + 20, y + 72, 490, 26, 35, MUTED, max_lines=3)
arrow([(603, 1476), (630, 1476)])
arrow([(1168, 1476), (1195, 1476)])
arrow([(1465, 1577), (1465, 1605)])
arrow([(1195, 1706), (1170, 1706)])
arrow([(630, 1706), (606, 1706)])
arrow([(335, 1807), (335, 1834), (1730, 1834), (1760, 1834), (1760, 1368), (335, 1368), (335, 1375)], MUTED, 2, 8)
rect(394, 1813, 922, 43, BG, BG, 0)
text("观察结果 → 调整设计 → 更新碰撞场；画面变化来自实际模拟反馈", 416, 1820, 27, TEAL)
text("Three.js 仅用于相机、矩阵、射线与控制；求解和绘制由本项目的 WebGPU / WGSL 管线完成。", 70, 1880, 27, MUTED)

# Read the canonical direction index and render compact business-specific rows.
section("04", "可以长成哪些产品：复用基座，再补业务层", 1941,
        "以下是扩展方向，尚未作为完整业务产品交付；按用户、任务、设备和验收标准选择。")
directions = json.loads((ROOT / "notes/product-directions.json").read_text(encoding="utf-8"))["directions"]
presentation = {
    "natural-scene-authoring": ("自然场景创作", "微景观 · 场景原型 · 庭院水景概念配置", "待补：领域素材与模板、业务属性、方案版本、批注与对比"),
    "interactive-scene-presentation": ("实时互动展示", "品牌活动页 · 展厅风景 · 作品集 / 放松页面", "待补：展示内容、品牌界面、嵌入接口与事件、目标设备适配"),
    "water-routing-gameplay": ("水流互动玩法", "引水解谜 · 障碍布局挑战 · 自建水路关卡", "待补：目标与判定、关卡规则、进度计分、业务实体关联"),
    "interactive-learning": ("教学与实验", "地形水流实验课 · GPU 算法演示 · 课堂练习", "待补：教学步骤、参数解释、对照任务、反馈与实验记录"),
    "scene-media-production": ("场景素材生产", "风景截图 · 动态背景 · 镜头创作工作台", "待补：镜头动画、录像、批量输出、规格与素材管理"),
    "creation-library-platform": ("作品与创作平台", "造景作品库 · 作品征集活动 · UGC 分享平台", "待补：账号云存储、发布浏览、权限审核、版本管理"),
}
for i, direction in enumerate(directions):
    title, products, extra = presentation[direction["id"]]
    x, y = 70 + (i % 2) * 840, 2048 + (i // 2) * 202
    rect(x, y, 820, 184)
    text(f"0{i + 1}  {title}", x + 23, y + 19, 33, GREEN, True)
    text(products, x + 23, y + 69, 27, INK, max_width=774)
    block(extra, x + 23, y + 114, 774, 27, 35, MUTED, max_lines=2)

# Value is about reusable work and known interfaces, not financial forecasts.
section("05", "对我们的价值：把验证过的能力留在手里", 2700)
rect(70, 2757, 1660, 190, DARK, DARK)
text("有业务时，复用已验证的技术基础，把新增工作集中在业务任务与验收。", 100, 2780, 32, PAPER, True)
values = [
    ("技术资产", "求解 / 渲染 / 编辑模块\n不必从空白重新搭建"),
    ("可见因果", "地形与水流即时反馈\n便于解释、演示与试方案"),
    ("可复现沉淀", "源码、示例、检查与归档\n已知边界和复用入口"),
    ("按业务扩展", "需求 → 模块 → 接入层\n→ 目标设备与任务验收"),
]
for i, (title, body) in enumerate(values):
    x = 100 + i * 410
    text(title, x, 2840, 29, "#d8e6bf", True)
    block(body, x, 2880, 390, 26, 33, "#e8efdf", max_lines=2)

section("06", "可信范围：已有验证、当前边界和来源链", 3005)
rect(70, 3064, 820, 176, PALE)
text("已有 V9 记录（不是本图新增实测）", 94, 3086, 29, GREEN, True)
block("91 项检查：77 Node + 14 Python。\n本机 49,152 粒子：有限值、域内均通过；\n明显穿入固体 0。尚无跨设备 / FPS 承诺。", 94, 3132, 770, 26, 33, MUTED, max_lines=3)
rect(910, 3064, 820, 176)
text("现有应用基座；公共 SDK 尚需封装", 934, 3086, 29, GREEN, True)
block("固定网格 52 × 56 × 44，体素间距 0.24 m。\n需 WebGPU；视觉模拟，不提供工程结论。\n任意模型、动态刚体、云协作、录像尚需扩展。", 934, 3132, 770, 26, 33, MUTED, max_lines=3)
text("来源：Mogmek / Waterfalls Dream；原作演示仅作创意参考，本项目独立实现。", 70, 3265, 26, MUTED)
text("技术参考：EA PB-MPM（二维 WebGPU，BSD-3-Clause） → Breakpoint（三维 DirectX 12，MIT）。", 70, 3302, 26, MUTED)
text("本项目：独立浏览器三维实现；依据 notes/research.md、validation.md 与 product-directions.json。", 70, 3339, 26, MUTED)

svg.append("</svg>")
asset_dir = ROOT / "assets"
web_dir = ROOT / "web/research-assets"
web_dir.mkdir(parents=True, exist_ok=True)
png_path, svg_path = asset_dir / "understanding-map.png", asset_dir / "understanding-map.svg"
canvas.save(png_path, optimize=True)
svg_path.write_text("\n".join(svg), encoding="utf-8")
for output in [png_path, svg_path]:
    shutil.copy2(output, web_dir / output.name)
print(json.dumps({"dimensions": [WIDTH, HEIGHT], "minimumLabelFont": min(row["size"] for row in text_checks),
                  "checkedTextRuns": len(text_checks), "directions": len(directions),
                  "screenshot": "assets/landscape-v9.png (aspect retained)",
                  "outputs": [str(png_path), str(svg_path)]}, ensure_ascii=False))
