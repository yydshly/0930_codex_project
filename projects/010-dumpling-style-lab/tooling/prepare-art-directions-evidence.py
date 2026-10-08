"""Assemble comparison panels from actual CUA screenshots, without altering scenes."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT = Path(__file__).resolve().parents[1]
EVIDENCE = PROJECT / "assets" / "art-directions"
REPORT = json.loads((PROJECT / "notes" / "art-directions-check.json").read_text(encoding="utf-8"))
RECTS = {row["name"]: row for row in REPORT["screenshots"]}
FONT = "C:/Windows/Fonts/msyh.ttc"


def font(size):
    return ImageFont.truetype(FONT, size)


def scene(name):
    screenshot = Image.open(EVIDENCE / f"{name}.png").convert("RGB")
    rect = RECTS[name]
    # Native screenshots are scaled slightly relative to browser CSS pixels.
    sx, sy = screenshot.width / rect["viewWidth"], screenshot.height / rect["viewHeight"]
    bounds = (round(rect["x"] * sx), round(rect["y"] * sy),
              round((rect["x"] + rect["width"]) * sx),
              round((rect["y"] + rect["height"]) * sy))
    sampling = Image.Resampling.NEAREST if name.endswith("-pixel") else Image.Resampling.LANCZOS
    return screenshot.crop(bounds).resize((560, 350), sampling)


def panel(title, rows, filename):
    columns = 2
    height = 98 + ((len(rows) + 1) // 2) * 402 + 46
    canvas = Image.new("RGB", (1184, height), "#191c23")
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 20), title, font=font(26), fill="#f3ead9")
    draw.text((24, 60), "浏览器实际运行截图 · 同一游戏状态，仅切换绘制方式", font=font(15), fill="#b5b8c2")
    for i, (name, label) in enumerate(rows):
        x, y = 24 + (i % columns) * 576, 98 + (i // columns) * 402
        draw.text((x, y), label, font=font(20), fill="#e8c996")
        canvas.paste(scene(name), (x, y + 38))
    draw.text((24, height - 34), "原画版与完整页面截图另行保留；人物和物件仍使用实际游戏坐标。", font=font(14), fill="#b5b8c2")
    canvas.save(EVIDENCE / filename, quality=92)


panel("最后一座温室 · 四种新游戏画风", [
    ("wasteland-pixel", "像素世界 · 低分辨率场景与角色"),
    ("wasteland-cel", "动态赛璐璐 · 轮廓与块面光影"),
    ("wasteland-paper", "纸片剧场 · 分层与折面投影"),
    ("wasteland-neon", "霓虹线绘 · 发光轮廓与流动信号"),
], "overview.webp")
panel("浮岛探险社 · 真实 3D 材质切换", [
    ("islands-cel", "赛璐璐 · 卡通材质与几何轮廓"),
    ("islands-neon", "霓虹线绘 · 深色实体与发光边缘"),
], "islands-comparison.webp")
print("Prepared actual screenshot comparison panels.")
